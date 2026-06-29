import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googlesyndication.com https://*.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net https://*.google.com https://*.adtrafficquality.google https://ep2.adtrafficquality.google",
              "frame-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.adtrafficquality.google",
              "img-src 'self' data: blob: https: http:",
              "style-src 'self' 'unsafe-inline' https://*.googlesyndication.com",
              "font-src 'self' data: https://*.gstatic.com",
              "connect-src 'self' https://*.googlesyndication.com https://*.doubleclick.net https://*.google.com https://*.adtrafficquality.google https://*.googleadservices.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
