import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Receipt uploads go through server actions; default limit is 1 MB. Up to
  // 3 files, 8 MB each client-side (see receipt-field.tsx) — real phone
  // camera photos routinely exceed 10 MB, which is the likely cause of a
  // claim-submission crash seen in production. 30 MB gives headroom above
  // the 24 MB worst case (3 x 8 MB) for multipart overhead.
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
