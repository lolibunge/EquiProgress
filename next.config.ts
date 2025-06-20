import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedDevOrigins: [
      'https://6000-idx-studio-1744984665826.cluster-ve345ymguzcd6qqzuko2qbxtfe.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
