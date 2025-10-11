/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Next.js dev overlay and assets when accessed via Cloudflare Tunnel domain
  allowedDevOrigins: [
    'https://elephant-stainless-bedford-owen.trycloudflare.com',
    'https://michel-marathon-spears-stream.trycloudflare.com',
    'https://jobs-assumed-cancer-proof.trycloudflare.com',
    'https://sims-accessing-bags-finish.trycloudflare.com',
    'https://bra-parameter-acrobat-prime.trycloudflare.com',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // Use 127.0.0.1 to avoid potential ::1 (IPv6) connection issues
        destination: 'http://127.0.0.1:4000/api/:path*', // proxy to backend
      },
      {
        source: '/s/:slug',
        destination: 'http://127.0.0.1:4000/:slug', // shortlink resolver
      },
    ];
  },
};

module.exports = nextConfig;
