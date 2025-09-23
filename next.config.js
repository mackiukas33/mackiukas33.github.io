/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['ttphotos.online'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('@napi-rs/canvas');
    }
    return config;
  },
  serverExternalPackages: ['@napi-rs/canvas'],
};

module.exports = nextConfig;
