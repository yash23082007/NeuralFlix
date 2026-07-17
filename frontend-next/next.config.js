/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org",      pathname: "/t/p/**" },
      { protocol: "https", hostname: "m.media-amazon.com",  pathname: "/**" },
      { protocol: "https", hostname: "images.justwatch.com",pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "secure.gravatar.com", pathname: "/**" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  
  // Performance
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "three"],
  },
  
  
  // Allow the backend API URL at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  
  // Rewrites so /api/* doesn't conflict with Next.js API routes
  async rewrites() {
    return process.env.NEXT_PUBLIC_API_URL
      ? [
          {
            source: "/api/backend/:path*",
            destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
          },
        ]
      : [];
  },
};

module.exports = nextConfig;
