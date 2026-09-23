"use client";

import { TrocarSenhaCard } from "@/components/configuracoes/trocar-senha-card";

export default function ConfiguracoesPage() {
  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 space-y-6">
        <div>
          <p className="halo-eyebrow">Configurações</p>
          <h1 className="title-display text-3xl sm:text-4xl">
            Configurações
          </h1>
        </div>

        <div className="max-w-md space-y-6">
          <TrocarSenhaCard />
        </div>
      </div>
    </div>
  );
}
