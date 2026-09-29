import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading login page"
      className="fixed inset-0 z-(--z-overlay) overflow-y-auto bg-background text-foreground"
    >
      <span className="sr-only">Loading login page</span>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(189,220,198,0.42),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(214,229,216,0.46),transparent_30%)]"
      />

      <div className="relative mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.08fr_0.92fr]">
        <section
          aria-hidden="true"
          className="relative hidden overflow-hidden px-10 py-10 lg:flex lg:flex-col lg:justify-between lg:px-12 xl:px-16"
        >
          <div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-11 rounded-xl" />
              <Skeleton className="h-8 w-31.5 rounded-lg" />
            </div>
            <div className="mt-24 max-w-xl">
              <Skeleton className="h-3 w-40 rounded-full" />
              <Skeleton className="mt-6 h-14 w-full max-w-md rounded-xl xl:h-16" />
              <Skeleton className="mt-3 h-14 w-4/5 max-w-sm rounded-xl xl:h-16" />
              <Skeleton className="mt-7 h-4 w-full max-w-lg rounded-full" />
              <Skeleton className="mt-3 h-4 w-5/6 max-w-md rounded-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border bg-white/65 p-4"
              >
                <Skeleton className="size-4 rounded" />
                <Skeleton className="mt-3 h-4 w-3/4 rounded-full" />
                <Skeleton className="mt-3 h-3 w-full rounded-full" />
                <Skeleton className="mt-2 h-3 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden" aria-hidden="true">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-10 rounded-xl" />
                <Skeleton className="h-7 w-28 rounded-lg" />
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white/85 shadow-[0_24px_70px_rgba(38,59,43,0.10)] backdrop-blur-xl">
              <div className="space-y-3 p-6 pb-4 sm:p-8 sm:pb-5">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="mt-5 h-8 w-4/5 rounded-lg" />
                <Skeleton className="mt-4 h-4 w-full rounded-full" />
                <Skeleton className="h-4 w-5/6 rounded-full" />
              </div>
              <div className="p-6 pt-3 sm:p-8 sm:pt-3">
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="mx-auto mt-3 h-3 w-3/4 rounded-full" />
                <div className="my-7 flex items-center gap-3">
                  <Skeleton className="h-px flex-1 rounded-full" />
                  <Skeleton className="h-3 w-28 rounded-full" />
                  <Skeleton className="h-px flex-1 rounded-full" />
                </div>
                <div className="rounded-2xl border border-border bg-card p-4">
                  <Skeleton className="h-4 w-4/5 rounded-full" />
                  <Skeleton className="mt-3 h-3 w-full rounded-full" />
                  <Skeleton className="mt-2 h-3 w-5/6 rounded-full" />
                </div>
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-full" />
                  <Skeleton className="h-7 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <Skeleton className="mx-auto mt-6 h-3 w-56 max-w-full rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
