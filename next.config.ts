// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supprime ou commente la ligne output: 'export'
  images: { unoptimized: true }, 
};

export default nextConfig;