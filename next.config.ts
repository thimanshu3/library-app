import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: { remotePatterns: ['books.google.com', 'books.googleusercontent.com', 'covers.openlibrary.org', 'images-na.ssl-images-amazon.com', 'm.media-amazon.com'].map(hostname => ({ protocol: 'https' as const, hostname })) },
  outputFileTracingExcludes: {
    '/*': ['./.data/**/*', './.local/**/*', './.env*'],
  },
};

export default nextConfig;
