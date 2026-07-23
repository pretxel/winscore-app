-- ===========================================================================
-- Daily Call quiz — scope by competition
-- ---------------------------------------------------------------------------
-- The quiz was global: one question per UTC day (quiz_questions.active_on was
-- globally unique) and one worldwide leaderboard/streak. Winscore is multi-
-- league, so the quiz now belongs to a competition.
--
--   * quiz_questions gains competition_id; the daily uniqueness moves from
--     active_on to (competition_id, active_on) — one question per competition
--     per day.
--   * quiz_answers is DENORMALIZED with competition_id (set by answer_quiz on
--     insert). The public page computes streak/points client-side from the
--     owner's answers, but quiz_questions' base SELECT is revoked from
--     anon/authenticated (secret-answer protection), so the app cannot join
--     answers -> questions to read the competition. The denormalized column
--     lets the owner-readable answer queries and the public views scope by
--     competition without granting base-table reads.
--   * v_quiz_questions_public / v_quiz_leaderboard / v_quiz_standing are
--     recreated with competition_id; leaderboard rank and streak are per
--     competition. Secret-answer handling, admin RLS, translations, and the
--     one-shot grading contract are unchanged.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns (nullable first, so the backfill can populate them).
-- ---------------------------------------------------------------------------
alter table public.quiz_questions add column competition_id uuid;
alter table public.quiz_answers   add column competition_id uuid;

-- ---------------------------------------------------------------------------
-- 2. Backfill.
-- ---------------------------------------------------------------------------
-- Questions -> the single active competition (the seed has exactly one). Fail
-- loudly if that assumption does not hold, rather than silently mis-scoping.
do $$
declare
  v_cid uuid;
  v_n   int;
begin
  select count(*) into v_n from public.competitions where is_active;
  if v_n <> 1 then
    raise exception
      'quiz_by_competition backfill expects exactly one active competition, found %',
      v_n;
  end if;
  select id into v_cid from public.competitions where is_active;
  update public.quiz_questions
     set competition_id = v_cid
   where competition_id is null;
end $$;

-- Answers inherit their question's competition.
update public.quiz_answers a
   set competition_id = q.competition_id
  from public.quiz_questions q
 where q.id = a.question_id
   and a.competition_id is null;

-- ---------------------------------------------------------------------------
-- 3. Constraints + indexes.
-- ---------------------------------------------------------------------------
alter table public.quiz_questions
  alter column competition_id set not null,
  add constraint quiz_questions_competition_fk
    foreign key (competition_id) references public.competitions(id);

alter table public.quiz_answers
  alter column competition_id set not null,
  add constraint quiz_answers_competition_fk
    foreign key (competition_id) references public.competitions(id);

-- Move daily uniqueness from active_on (global) to (competition_id, active_on).
-- The old constraint was created inline as `active_on date not null unique`,
-- which Postgres names quiz_questions_active_on_key.
alter table public.quiz_questions
  drop constraint quiz_questions_active_on_key;
alter table public.quiz_questions
  add constraint quiz_questions_competition_active_on_key
    unique (competition_id, active_on);

create index quiz_answers_competition_user_idx
  on public.quiz_answers (competition_id, user_id);

-- ---------------------------------------------------------------------------
-- 4. answer_quiz — stamp the answer with the question's competition.
-- Grading contract (is_correct, correct_index) is unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.answer_quiz(p_question_id uuid, p_choice smallint)
returns table (is_correct boolean, correct_index smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  v_uid uuid := auth.uid();
  v_correct boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select qq.id, qq.correct_index, qq.options, qq.active_on, qq.competition_id
    into q
  from public.quiz_questions qq
  where qq.id = p_question_id;

  if not found then
    raise exception 'question not found';
  end if;
  if q.active_on <> (now() at time zone 'utc')::date then
    raise exception 'question is not active today';
  end if;
  if p_choice < 0 or p_choice >= array_length(q.options, 1) then
    raise exception 'choice out of range';
  end if;

  v_correct := (p_choice = q.correct_index);

  -- Duplicate (user_id, question_id) raises unique_violation → one shot only.
  insert into public.quiz_answers
    (user_id, question_id, choice_index, is_correct, competition_id)
  values (v_uid, p_question_id, p_choice, v_correct, q.competition_id);

  return query select v_correct, q.correct_index;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Public answer-omitting view — expose competition_id.
-- ---------------------------------------------------------------------------
create or replace view public.v_quiz_questions_public
  with (security_invoker = off) as
select id, prompt, options, active_on, translations, competition_id
from public.quiz_questions;

grant select on public.v_quiz_questions_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Quiz leaderboard — per competition. Admins stay excluded inside agg so
-- ranks remain contiguous; rank() is partitioned by competition_id so each
-- league is ranked independently.
-- ---------------------------------------------------------------------------
create or replace view public.v_quiz_leaderboard as
with agg as (
  select
    a.user_id,
    a.competition_id,
    (count(*) filter (where a.is_correct) * 10)::int as total_points,
    count(*)::int as total_answered,
    min(a.answered_at) as first_answer
  from public.quiz_answers a
  join public.profiles pr_f
    on pr_f.id = a.user_id and pr_f.is_admin = false
  group by a.user_id, a.competition_id
)
select
  ag.user_id,
  ag.competition_id,
  pr.display_name,
  ag.total_points,
  ag.total_answered,
  ag.first_answer,
  rank() over (
    partition by ag.competition_id
    order by ag.total_points desc, ag.first_answer asc
  ) as rank
from agg ag
join public.profiles pr on pr.id = ag.user_id;

grant select on public.v_quiz_leaderboard to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Quiz standing — per competition streak + reused leaderboard row.
-- Gaps-and-islands, now partitioned by (user_id, competition_id).
-- ---------------------------------------------------------------------------
create or replace view public.v_quiz_standing
  with (security_invoker = off) as
with days as (
  select distinct
    a.user_id,
    a.competition_id,
    ((a.answered_at at time zone 'utc')::date) as d
  from public.quiz_answers a
),
grp as (
  select
    user_id,
    competition_id,
    d,
    (d - (row_number() over (
      partition by user_id, competition_id order by d
    ))::int) as g
  from days
),
islands as (
  select user_id, competition_id, max(d) as last_day, count(*)::int as len
  from grp
  group by user_id, competition_id, g
),
streaks as (
  select user_id, competition_id, len as streak
  from islands
  where last_day >= (((now() at time zone 'utc')::date) - 1)
)
select
  ql.user_id,
  ql.competition_id,
  ql.display_name,
  ql.total_points,
  ql.total_answered,
  ql.rank,
  coalesce(s.streak, 0)::int as streak
from public.v_quiz_leaderboard ql
left join streaks s
  on s.user_id = ql.user_id and s.competition_id = ql.competition_id;

grant select on public.v_quiz_standing to anon, authenticated;
