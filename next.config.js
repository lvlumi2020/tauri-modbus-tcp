/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    distDir: process.env.NODE_ENV === 'production' ? './out' : '.next',
    trailingSlash: true,
    images: {
        unoptimized: true,
    },
    webpack: (config, { isServer }) => {
        config.externals = [...(config.externals || []), 'scripts/**/*'];
        return config;
    },
}

module.exports = nextConfig
