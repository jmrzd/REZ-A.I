import type { NextConfig } from 'next';

// Keep native ONNX/Sharp bindings out of the browser bundle.
// Local mode uses browser WebLLM/ONNX; Cloud mode streams from our server-side
// /api/brain proxy to Cloudflare Workers AI. No ONNX native binaries in Next.js.
const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node$': false,
      'sharp$': false,
    };
    return config;
  },
};
export default nextConfig;
