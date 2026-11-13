import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // App này hoàn toàn dynamic (dữ liệu thế giới realtime) → tắt cacheComponents
  // drei <Html> tạo React root riêng, xung đột với StrictMode double-mount ở dev
  reactStrictMode: false,
  async redirects() {
    return [{ source: "/contribute", destination: "/sabotage", permanent: false }];
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
