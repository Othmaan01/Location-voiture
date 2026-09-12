import type { NextConfig } from "next";

/** En-tetes de securite servis sur toutes les pages (Netlify applique ceux de Next, pas ceux du netlify.toml pour le SSR). */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? "https://location-voiture-api-staging.fly.dev"}`,
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  headers: async () => [{ source: "/(.*)", headers: securityHeaders }],
  images: {
    // Photos et logos servis par Supabase Storage (bucket public), via l'API.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  // Les contrats partages sont ecrits en TypeScript avec des imports ".js" (ESM) :
  // on laisse webpack resoudre ".js" vers ".ts" (Turbopack ne le fait pas encore).
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
