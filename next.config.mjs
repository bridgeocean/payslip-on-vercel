/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // keep native binaries external so Vercel Lambda can use them as-is
    serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
  },
  webpack: (config) => {
    if (!config.externals) config.externals = [];
    // extra safety to avoid bundling chromium
    config.externals.push('@sparticuz/chromium');
    return config;
  },
};
export default nextConfig;
