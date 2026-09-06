import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
