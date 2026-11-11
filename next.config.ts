import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      // Default 1 MB terlalu kecil untuk unggah foto galeri (maks 5 foto x 5 MB) dan bukti 10 MB.
      bodySizeLimit: "26mb",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Alamat lama halaman login pengelola.
  redirects: async () => [
    { source: "/masuk", destination: "/admin-login", permanent: true },
  ],
  headers: async () => {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
