import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // organizer-hosted contestant/nominee images + Dicebear
    ],
  },
}

export default nextConfig
