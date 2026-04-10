/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cache optimized images for 30 days. The default (60s) causes the same
    // image to be re-optimized on nearly every visit, burning through the
    // Vercel image-optimization quota very quickly.
    minimumCacheTTL: 2592000,
    // Drop the 4K breakpoint — nobody needs a 3840px hero image, and
    // generating one counts as an extra optimization per source image.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
