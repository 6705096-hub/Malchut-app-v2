import withSerwistInit from "@serwist/next";
import path from "path";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['@hebcal/noaa'] = path.resolve(process.cwd(), 'src/lib/hebcal-noaa-mock.js');
    }
    return config;
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default withSerwist(nextConfig);
