import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WagerRail } from "@/components/wager/wager-rail";
import { isCurrentUserAdmin } from "@/lib/admin/current-user";
import { isLocale, type Locale, localePath } from "@/lib/i18n";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { MatchdayPredictionBoard } from "./prediction-board";

export default async function RoundSheetPage({
  params,
}: {
  params: Promise<{
    locale: string;
    league: string;
    groupId: string;
    roundId: string;
  }>;
}) {
  const { locale: raw, league, groupId, roundId } = await params;
  const locale: Locale = isLocale(raw) ? raw : "en";
  const t = await getTranslations({ locale, namespace: "matchdaySheet" });
  const common = await getTranslations({ locale, namespace: "common" });

  const supabase = await createServerSupabaseClient(league);

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user ? await isCurrentUserAdmin(supabase) : false;

  // Pool membership
  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from("groups").select("id, name, competition_id").eq("id", groupId).maybeSingle(),
    user
      ? supabase
          .from("group_members")
          .select("role")
          .eq("group_id", groupId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!group) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl">{t("poolNotFound")}</h1>
      </main>
    );
  }

  const isMember = !!membership;

  // Round data
  const { data: round } = await supabase
    .from("competition_rounds")
    .select("id, round_key, round_number, labels, status, opens_at, admin_closes_at")
    .eq("id", roundId)
    .eq("competition_id", group.competition_id)
    .maybeSingle();

  if (!round) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-heading text-2xl">{t("roundNotFound")}</h1>
      </main>
    );
  }

  // Fixtures
  const { data: fixtures } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff_at, status, stage, group_code, venue")
    .eq("round_id", roundId)
    .neq("status", "cancelled")
    .order("kickoff_at", { ascending: true });

  // User's existing predictions
  const predictionsMap = new Map<string, { home: number; away: number }>();
  if (user && fixtures?.length) {
    const { data: preds } = await supabase
      .from("predictions")
      .select("match_id, home_goals, away_goals")
      .eq("user_id", user.id)
      .in(
        "match_id",
        fixtures.map((f) => f.id),
      );

    for (const p of preds ?? []) {
      predictionsMap.set(p.match_id, {
        home: p.home_goals,
        away: p.away_goals,
      });
    }
  }

  const roundLabel =
    round.labels && typeof round.labels === "object"
      ? ((round.labels as Record<string, string>)[locale] ?? round.round_key)
      : round.round_key;

  const completePicks = predictionsMap.size === (fixtures?.length ?? 0);

  // Wallet and wager data
  let walletLinked = false;
  let walletAddress: string | undefined;
  let walletLinkId: string | undefined;
  let intentId: string | null = null;
  let intentState: string | null = null;
  let wagerAvailable = false;
  let stakeDisplay: string | undefined;
  let potDisplay: string | undefined;
  let participantCount: number | undefined;
  let wagerClosesAt: string | undefined;

  if (user && isMember && !isAdmin) {
    // Wagering is available only when this round has an initialized, open wager round.
    const { data: wagerRound } = await supabase
      .from("wager_rounds")
      .select(
        "state, closes_at, stake_base_units, verified_decimals, pot_total_base_units, participant_count",
      )
      .eq("group_id", groupId)
      .eq("round_id", roundId)
      .maybeSingle();

    if (
      wagerRound &&
      wagerRound.state === "initialized" &&
      new Date(wagerRound.closes_at) > new Date()
    ) {
      wagerAvailable = true;
      const decimals = wagerRound.verified_decimals ?? 0;
      const toDisplay = (base: number | string | null) =>
        (Number(base ?? 0) / 10 ** decimals).toLocaleString(undefined, {
          maximumFractionDigits: decimals,
        });
      stakeDisplay = toDisplay(wagerRound.stake_base_units);
      potDisplay = toDisplay(wagerRound.pot_total_base_units);
      participantCount = wagerRound.participant_count ?? 0;
      wagerClosesAt = wagerRound.closes_at ?? undefined;
    }

    const { data: link } = await supabase
      .from("wallet_links")
      .select("id, wallet_address")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (link) {
      walletLinked = true;
      walletLinkId = link.id;
      const hex =
        typeof link.wallet_address === "string"
          ? (link.wallet_address as string).replace(/^\\x/, "")
          : "";
      if (hex) {
        const bytes = Buffer.from(hex, "hex");
        const { base58 } = await import("@scure/base");
        walletAddress = base58.encode(bytes);
      }

      // Only create an intent once wagering is actually available; the RPC
      // re-validates and would otherwise raise.
      if (wagerAvailable && completePicks && fixtures?.length) {
        const { createWagerIntent } = await import("./create-wager-intent");
        const picks = Array.from(predictionsMap.entries()).map(([matchId, goals]) => ({
          matchId,
          homeGoals: goals.home,
          awayGoals: goals.away,
        }));
        const result = await createWagerIntent({
          groupId,
          roundId,
          userId: user.id,
          walletLinkId,
          picks,
        });
        intentId = result.intentId;
        intentState = result.state;
      }
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href={localePath(locale, `/${league}/groups/${groupId}`)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← {group.name}
        </Link>
        <h1 className="font-heading text-2xl font-bold">{roundLabel}</h1>
        <p className="text-sm text-muted-foreground">
          {fixtures?.length ?? 0} {t("fixtures")} ·{" "}
          {round.status === "pending"
            ? t("statusPending")
            : round.status === "closed"
              ? t("statusClosed")
              : t("statusActive")}
        </p>
      </div>

      {!user && (
        <Card className="border-flag/30 bg-flag/5">
          <CardContent className="py-4 text-center">
            <p className="text-sm">{t("signInToPick")}</p>
            <Link
              href={localePath(
                locale,
                `/sign-in?next=/${league}/groups/${groupId}/rounds/${roundId}`,
              )}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground mt-2"
            >
              {common("signIn")}
            </Link>
          </CardContent>
        </Card>
      )}

      {user && isAdmin && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3">
            <p className="text-sm text-muted-foreground">{t("adminBlocked")}</p>
          </CardContent>
        </Card>
      )}

      {user && !isMember && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-4 text-center">
            <p className="text-sm">{t("notMember")}</p>
          </CardContent>
        </Card>
      )}

      {/* Prediction Board */}
      {user && isMember && !isAdmin && (
        <>
          <MatchdayPredictionBoard
            fixtures={
              fixtures?.map((f) => ({
                id: f.id,
                home_team: f.home_team,
                away_team: f.away_team,
                kickoff_at: f.kickoff_at,
                status: f.status,
                stage: f.stage,
                group_code: f.group_code,
                venue: f.venue,
              })) ?? []
            }
            initialPredictions={predictionsMap}
            poolId={groupId}
            roundId={roundId}
            league={league}
            locale={locale}
          />

          <p className="text-center text-xs text-muted-foreground">
            {completePicks
              ? t("allPicksComplete")
              : t("picksRemaining", {
                  remaining: (fixtures?.length ?? 0) - predictionsMap.size,
                })}
          </p>
        </>
      )}

      {/* Wager rail — wallet connection + wager entry */}
      {user && isMember && !isAdmin && (
        <>
          <Separator />
          <WagerRail
            poolId={groupId}
            roundId={roundId}
            intentId={intentId}
            wagerAvailable={wagerAvailable}
            walletLinked={walletLinked}
            walletAddress={walletAddress}
            stakeDisplay={stakeDisplay}
            potDisplay={potDisplay}
            participantCount={participantCount}
            closesAt={wagerClosesAt}
            hasCompletePicks={completePicks}
            eligibilityOk
          />
        </>
      )}
    </main>
  );
}
