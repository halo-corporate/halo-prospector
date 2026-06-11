/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Legado V3: /leads foi renomeado pra /crm em V4 PR 2a.
      { source: "/leads", destination: "/crm", permanent: false },
      { source: "/leads/:path*", destination: "/crm/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
