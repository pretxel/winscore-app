import { TrophyIcon } from "lucide-react";
import type { GroupMemberView } from "@/lib/groups";
import type { Phase, PhaseWinner } from "@/lib/phases";
import { cn } from "@/lib/utils";

export type PhaseSeasonSummaryLabels = {
  title: string;
  player: string;
  won: (count: number) => string;
  noName: string;
  you: string;
};

// One row per member, one column per closed phase, a trophy where that member
// was recorded as the phase's winner (joint winners each get one). Reads only
// the frozen winners, so it is stable and cheap. Callers hide it until the
// first phase has closed.
export function PhaseSeasonSummary({
  members,
  closedPhases,
  winners,
  currentUserId,
  labels,
}: {
  members: GroupMemberView[];
  closedPhases: Phase[];
  winners: PhaseWinner[];
  currentUserId: string | null;
  labels: PhaseSeasonSummaryLabels;
}) {
  const won = new Map<string, Set<string>>();
  for (const w of winners) {
    const set = won.get(w.userId) ?? new Set<string>();
    set.add(w.phaseId);
    won.set(w.userId, set);
  }
  const ranked = [...members].sort(
    (a, b) => (won.get(b.userId)?.size ?? 0) - (won.get(a.userId)?.size ?? 0),
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <caption className="sr-only">{labels.title}</caption>
        <thead>
          <tr className="bg-muted/40">
            <th
              scope="col"
              className="px-4 py-2 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            >
              {labels.player}
            </th>
            {closedPhases.map((p) => (
              <th
                key={p.id}
                scope="col"
                className="px-2 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                {p.label}
              </th>
            ))}
            <th
              scope="col"
              className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ranked.map((m) => {
            const mine = won.get(m.userId) ?? new Set<string>();
            const isMe = m.userId === currentUserId;
            return (
              <tr key={m.userId} className={cn(isMe && "bg-flag/10")}>
                <td className="px-4 py-2 font-medium">
                  {m.displayName ?? (
                    <span className="text-muted-foreground italic">{labels.noName}</span>
                  )}
                  {isMe ? (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {labels.you}
                    </span>
                  ) : null}
                </td>
                {closedPhases.map((p) => (
                  <td key={p.id} className="px-2 py-2 text-center">
                    {mine.has(p.id) ? (
                      <TrophyIcon
                        className="inline size-4 text-flag"
                        aria-label={`${m.displayName ?? labels.noName}: ${p.label}`}
                      />
                    ) : (
                      <span className="text-muted-foreground/40" aria-hidden>
                        ·
                      </span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {labels.won(mine.size)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
