export default function LoginPageSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading login page"
      className="fixed inset-0 z-[var(--z-overlay)] overflow-y-auto bg-[#f7f8f5] text-[#19231f]"
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
              <div className="skeleton-shimmer size-11 rounded-xl" />
              <div className="skeleton-shimmer h-8 w-[126px] rounded-lg" />
            </div>
            <div className="mt-24 max-w-xl">
              <div className="skeleton-shimmer h-3 w-40 rounded-full" />
              <div className="skeleton-shimmer mt-6 h-14 w-full max-w-md rounded-xl xl:h-16" />
              <div className="skeleton-shimmer mt-3 h-14 w-4/5 max-w-sm rounded-xl xl:h-16" />
              <div className="skeleton-shimmer mt-7 h-4 w-full max-w-lg rounded-full" />
              <div className="skeleton-shimmer mt-3 h-4 w-5/6 max-w-md rounded-full" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-[#dfe7df] bg-white/65 p-4"
              >
                <div className="skeleton-shimmer size-4 rounded" />
                <div className="skeleton-shimmer mt-3 h-4 w-3/4 rounded-full" />
                <div className="skeleton-shimmer mt-3 h-3 w-full rounded-full" />
                <div className="skeleton-shimmer mt-2 h-3 w-4/5 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center lg:hidden" aria-hidden="true">
              <div className="flex items-center gap-2.5">
                <div className="skeleton-shimmer size-10 rounded-xl" />
                <div className="skeleton-shimmer h-7 w-[112px] rounded-lg" />
              </div>
            </div>

            <div className="rounded-3xl border border-[#dfe7df] bg-white/85 shadow-[0_24px_70px_rgba(38,59,43,0.10)] backdrop-blur-xl">
              <div className="space-y-3 p-6 pb-4 sm:p-8 sm:pb-5">
                <div className="skeleton-shimmer h-6 w-28 rounded-full" />
                <div className="skeleton-shimmer mt-5 h-8 w-4/5 rounded-lg" />
                <div className="skeleton-shimmer mt-4 h-4 w-full rounded-full" />
                <div className="skeleton-shimmer h-4 w-5/6 rounded-full" />
              </div>
              <div className="p-6 pt-3 sm:p-8 sm:pt-3">
                <div className="skeleton-shimmer h-12 w-full rounded-xl" />
                <div className="skeleton-shimmer mx-auto mt-3 h-3 w-3/4 rounded-full" />
                <div className="my-7 flex items-center gap-3">
                  <div className="skeleton-shimmer h-px flex-1 rounded-full" />
                  <div className="skeleton-shimmer h-3 w-28 rounded-full" />
                  <div className="skeleton-shimmer h-px flex-1 rounded-full" />
                </div>
                <div className="rounded-2xl border border-[#e3eae3] bg-[#fbfcfa] p-4">
                  <div className="skeleton-shimmer h-4 w-4/5 rounded-full" />
                  <div className="skeleton-shimmer mt-3 h-3 w-full rounded-full" />
                  <div className="skeleton-shimmer mt-2 h-3 w-5/6 rounded-full" />
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="skeleton-shimmer h-7 w-20 rounded-full" />
                  <div className="skeleton-shimmer h-7 w-20 rounded-full" />
                  <div className="skeleton-shimmer h-7 w-24 rounded-full" />
                </div>
              </div>
            </div>
            <div className="skeleton-shimmer mx-auto mt-6 h-3 w-56 max-w-full rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
