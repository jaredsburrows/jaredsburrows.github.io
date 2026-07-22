import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  // Pin the workspace root so stray lockfiles in parent directories don't
  // change what gets traced into the build.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
