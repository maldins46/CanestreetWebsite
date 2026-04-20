/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/chi-siamo',            destination: '/about',              permanent: true },
      { source: '/regolamento',          destination: '/rules',              permanent: true },
      { source: '/torneo',               destination: '/tournament',         permanent: true },
      { source: '/torneo/:path*',        destination: '/tournament/:path*',  permanent: true },
      { source: '/admin/torneo',         destination: '/admin/tournament',   permanent: true },
      { source: '/admin/torneo/:path*',  destination: '/admin/tournament/:path*', permanent: true },
    ]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Local Supabase dev instance
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54321',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

module.exports = nextConfig
