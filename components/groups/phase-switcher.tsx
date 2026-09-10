import Link from "next/link";
import type { Phase } from "@/lib/phases";
import { cn } from "@/lib/utils";

export type PhaseSwitcherLabels = {
  group: string;
  allTime: string;
  closed: string;
  active: string;
  pending: string;
};

// URL-driven switcher between the all-time board and one phase. Each chip is
// a link setting `?phase=`, so the page stays server-rendered and shareable.
// A phase's status shows as a small suffix so a closed phase reads as a
// result and an upcoming one as not yet playable.
export function PhaseSwitcher({
  basePath,
  phases,
  activePhaseId,
  labels,
}: {
  basePath: string;
  phases: Phase[];
  activePhaseId: string | null;
  labels: PhaseSwitcherLabels;
}) {
  const statusLabel: Record<Phase["status"], string> = {
    closed: labels.closed,
    active: labels.active,
    pending: labels.pending,
  };
  return (
    <div role="group" aria-label={labels.group} className="flex flex-wrap gap-1.5">
      <Chip href={basePath} active={activePhaseId === null}>
        {labels.allTime}
      </Chip>
      {phases.map((p) => (
        <Chip key={p.id} href={`${basePath}?phase=${p.id}`} active={activePhaseId === p.id}>
          {p.label}
          <span
            className={cn(
              "font-mono text-[9px] tracking-[0.16em] uppercase",
              p.status === "active" ? "text-live" : "opacity-60",
            )}
          >
            {statusLabel[p.status]}
          </span>
        </Chip>
      ))}
    </div>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-heading text-xs font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-pitch/50 bg-pitch/10 text-pitch"
          : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
