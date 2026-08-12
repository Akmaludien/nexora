import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: false,
  outputFileTracingRoot: path.resolve(process.cwd()),
  distDir: ".next-build",
  async headers() {
    // React's dev-mode debugging requires eval() (e.g. reconstructing callstacks),
    // so allow 'unsafe-eval' only during development. Production keeps it locked down.
    const isDev = process.env.NODE_ENV === "development";
    const scriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'";
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` },
      ],
    }];
  },
};

export default nextConfig;
