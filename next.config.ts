import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Receipt uploads go through server actions; default limit is 1 MB.
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
