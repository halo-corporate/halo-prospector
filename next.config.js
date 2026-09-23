// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// O `basePath: '/halo'` é a espinha do multi-zone (HALO servido sob o domínio
// do ALIEN em /halo). Remover/alterar quebra o login único e os assets.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Multi-zone (ALIEN Fase 2): o HALO é servido sob o domínio do ALIEN em
  // /halo. O basePath faz rotas E assets viverem sob /halo/* (inclusive
  // /halo/_next), sem colidir com o /_next do ALIEN. NÃO somar assetPrefix:
  // com path-based basePath ele duplicaria o prefixo e quebraria os assets.
  // Efeito colateral: TODAS as rotas movem pra /halo/* — cron e callback OAuth
  // inclusos (ver vercel.json e MELHOR_ENVIO_REDIRECT_URI).
  basePath: "/halo",
  async redirects() {
    return [
      // Legado V3: /leads foi renomeado pra /crm em V4 PR 2a.
      { source: "/leads", destination: "/crm", permanent: false },
      { source: "/leads/:path*", destination: "/crm/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
