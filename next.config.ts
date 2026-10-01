import type { NextConfig } from "next";

// Baseline response headers (L-5). HSTS is production-only: emitting it over
// local HTTP would poison the browser's cache for localhost. A full
// Content-Security-Policy is deliberately deferred — Next.js inline runtime
// scripts make a strict CSP a per-page tuning exercise, not a one-liner.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Verification tokens travel in URLs; never leak them via Referer.
  { key: "Referrer-Policy", value: "no-referrer" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
