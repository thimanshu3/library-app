import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingExcludes: {
    '/*': ['./.data/**/*', './.local/**/*', './.env*'],
  },
};

export default nextConfig;
