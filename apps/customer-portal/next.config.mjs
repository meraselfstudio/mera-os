/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@mera/ui', '@mera/supabase'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '*.supabase.co' },
        ],
    },
    output: 'standalone',
    experimental: {
        optimizePackageImports: ['@mera/ui'],
    },
}

export default nextConfig
