/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ptapp/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = nextConfig;
