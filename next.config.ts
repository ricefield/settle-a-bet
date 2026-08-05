import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const privateHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/invite/:path*", headers: privateHeaders },
      { source: "/organize/:path*", headers: privateHeaders },
    ];
  },
};

export default withWorkflow(nextConfig);
