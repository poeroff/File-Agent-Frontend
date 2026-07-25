import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // In dev, Next only serves its internal dev resources (fonts, HMR, source
  // maps) to the host it was started on. Public traffic arrives through the
  // Tailscale Funnel hostname, so allow it explicitly — otherwise those
  // requests are blocked and the page loads without fonts or hot reload.
  // Ignored by production builds.
  allowedDevOrigins: ["dhbp.taile13eac.ts.net"],
};

export default nextConfig;
