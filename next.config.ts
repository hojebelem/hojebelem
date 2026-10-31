import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // build enxuto só no Docker (o Dockerfile liga NEXT_STANDALONE);
  // localmente o `npm start` continua normal
  output: process.env.NEXT_STANDALONE ? "standalone" : undefined,
  // mesma lista de src/lib/images.ts: mudou aqui, mude lá
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "images.sympla.com.br" }] },
};

export default nextConfig;
