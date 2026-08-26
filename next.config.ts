import type { NextConfig } from "next"

/**
 * next.config.ts
 *
 * Wasn't present in the project as handed over — this file didn't exist
 * yet, so this is a fresh file rather than an edit. If your real repo
 * already has a next.config.(js|ts|mjs) with other settings in it
 * (redirects, headers, etc.), merge the `images` block below into that
 * file instead of dropping this one in as-is.
 *
 * Why this is needed: NomineeCard/ContestantCard build avatar URLs via
 * lib/dicebear.ts, which points at NEXT_PUBLIC_BACKEND_URL (the
 * spotix-backend dicebear route, v1/dicebear/:seed). next/image refuses
 * to optimise an image from any host that isn't explicitly allowlisted
 * here — hence "hostname \"localhost\" is not configured under images".
 * This resolves the backend URL from env at build/start time and
 * allowlists whatever host it actually points at (localhost in dev,
 * your real backend domain in production), instead of hardcoding one
 * environment's hostname.
 */

function backendRemotePattern() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
  if (!backendUrl) return null

  try {
    const url = new URL(backendUrl)
    return {
      protocol: url.protocol.replace(":", "") as "http" | "https",
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/v1/dicebear/**",
    }
  } catch {
    // Malformed NEXT_PUBLIC_BACKEND_URL — fall through to the localhost
    // dev fallback below instead of crashing the build over it.
    return null
  }
}

const resolvedBackendPattern = backendRemotePattern()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Always allow localhost on any port — covers local dev even if
      // NEXT_PUBLIC_BACKEND_URL isn't set or points somewhere else
      // temporarily.
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/v1/dicebear/**",
      },
      // The actual configured backend (dev or prod), when it's not
      // localhost — e.g. your production spotix-backend domain.
      ...(resolvedBackendPattern && resolvedBackendPattern.hostname !== "localhost"
        ? [resolvedBackendPattern]
        : []),
      // Poll/event/nomination images are uploaded to Cloudinary
      // elsewhere in Spotix (booker's upload flow) and referenced here
      // by their full res.cloudinary.com URL — pollImage, contestant
      // image, etc. all come through this host.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
