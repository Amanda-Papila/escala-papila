import type { NextConfig } from "next";

// Configuração mantida simples de propósito: sem cache de componentes,
// para que páginas e rotas de API sejam sempre dinâmicas e previsíveis.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
