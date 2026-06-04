import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // No output: 'export' or output: 'standalone'.
  // @opennextjs/cloudflare handles bundling.
};

export default nextConfig;
