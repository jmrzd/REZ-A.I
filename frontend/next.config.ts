import type { NextConfig } from 'next';

// Keep native ONNX/Sharp bindings out of the browser bundle.
// All text generation runs on the visitor's device, never in a Next.js API route.
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
