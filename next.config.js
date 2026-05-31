/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongoose', 'nodemailer', 'bcryptjs'],
  },
};

module.exports = nextConfig;
