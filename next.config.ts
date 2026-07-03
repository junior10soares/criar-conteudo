import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pacotes com binários nativos ou que não devem ser processados pelo bundler,
  // só rodam em servidor (worker/pipeline local), nunca no client/edge.
  serverExternalPackages: [
    "better-sqlite3",
    "@resvg/resvg-js",
    "ffmpeg-static",
    "node-edge-tts",
    "playwright",
  ],
};

export default nextConfig;
