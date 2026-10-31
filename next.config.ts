import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/userinterface/home",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
