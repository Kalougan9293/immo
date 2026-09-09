import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["ffmpeg-static"],
  images: {
    localPatterns: [
      // Default: local images without query strings
      { pathname: "/**", search: "" },
      // Cache-busted template covers (/templates/foo.jpg?v=5)
      { pathname: "/templates/**" },
    ],
  },
};

export default nextConfig;
