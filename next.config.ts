import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" }, // organizer-hosted contestant/nominee images + Dicebear
    ],
    // Dicebear avatars (spotix-backend's v1/dicebear.js) are served as
    // real `image/svg+xml`. Next's built-in image optimizer refuses to
    // process ANY svg source unless this is explicitly turned on — that
    // refusal is exactly where "Bad request / INVALID_IMAGE_OPTIMIZE_REQUEST"
    // was coming from. contentDispositionType + a strict
    // contentSecurityPolicy are Next's own recommended pairing for this
    // (forces the browser to treat the response as a plain image
    // download rather than something it could execute) — see
    // https://nextjs.org/docs/app/api-reference/components/image#dangerouslyallowsvg
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

export default nextConfig
