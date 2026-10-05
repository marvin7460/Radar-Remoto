"use client";

/**
 * A plain, followed link to the original posting (sources' terms ask for
 * it) that also counts the click with a fire-and-forget beacon: no cookies,
 * no redirect, and navigation never waits for it.
 * rel="noopener" without "noreferrer"/"nofollow" so sources see our traffic.
 */
export function JobLink({
  jobId,
  href,
  className,
  children,
}: {
  jobId: number;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={className}
      onClick={() => navigator.sendBeacon?.("/api/click", String(jobId))}
    >
      {children}
    </a>
  );
}
