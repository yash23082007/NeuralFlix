/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  
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
    minimumCacheTTL: 86400,
  },
  
  // Performance
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "three"],
  },
  
  
  // API_INTERNAL_URL is supplied as a Docker build argument so rewrites resolve
  // from the Next.js server container. Browser requests stay same-origin.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || "http://localhost:8000";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiUrl}/api/v1/:path*`,
      },
      {
        source: "/api/backend/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
