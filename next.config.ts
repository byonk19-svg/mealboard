import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      [
        "connect-src 'self'",
        "http://127.0.0.1:*",
        "http://localhost:*",
        "ws://127.0.0.1:*",
        "ws://localhost:*",
        "https://*.supabase.co",
        "wss://*.supabase.co"
      ].join(" "),
      "font-src 'self' data:",
      "manifest-src 'self'",
      "object-src 'none'"
    ].join("; ")
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=()"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/:path*"
      }
    ];
  },
  poweredByHeader: false
};

export default nextConfig;
