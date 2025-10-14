/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Libera domínios para <Image src="..."/>
  // Ajuste/adicione os que você usa de fato
  images: {
    // Caso sua versão do Next suporte remotePatterns, prefira usar remotePatterns
    domains: [
      'api.premiosprime.site',
      'images.unsplash.com',
      'i.imgur.com',
      'picsum.photos',
    ],
  },

  async rewrites() {
    // Em DEV, pode proxiar /api e /s para seu backend local
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:4000/api/:path*',
        },
        {
          source: '/s/:slug',
          destination: 'http://127.0.0.1:4000/:slug',
        },
      ];
    }
    // Em PRODUÇÃO, nada de rewrites para 127.0.0.1
    return [];
  },
};

module.exports = nextConfig;
