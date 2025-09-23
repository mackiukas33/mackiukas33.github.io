/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ttphotos.online'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('canvas');
    }
    return config;
  },
  serverExternalPackages: ['canvas'],
};

module.exports = nextConfig;
