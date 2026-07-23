import { PageSkeletonShell } from "@/components/skeletons/page-skeleton-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <PageSkeletonShell className="max-w-3xl">
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="mb-3 h-5 w-28" />
        <Skeleton className="h-10 w-full" />
      </div>
    </PageSkeletonShell>
  );
}
