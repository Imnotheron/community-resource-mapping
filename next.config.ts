import type { NextConfig } from "next";

const nonPublicRoutes = [
  "api",
  "admin",
  "worker",
  "vulnerable",
  "profile",
  "login",
  "register",
  "role-selection",
  "intro",
];

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async headers() {
    // An explicit noindex response header protects account and API URLs
    // independently of crawler rules. Authentication remains mandatory.
    return nonPublicRoutes.map((route) => ({
      source: `/${route}/:path*`,
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    }));
  },
};

export default nextConfig;
