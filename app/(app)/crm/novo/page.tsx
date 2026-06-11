import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listVerticais } from "@/lib/verticais/queries";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Novo lead — HALO Prospector" };
export const dynamic = "force-dynamic";

export default async function NovoLeadPage() {
  const verticais = await listVerticais();

  return (
    <div className="container py-6 space-y-6 max-w-3xl">
      <div className="space-y-1">
        <Link
          href="/crm"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3 w-3" /> Voltar para lista
        </Link>
        <h1 className="title-display text-2xl">Novo lead</h1>
        <p className="text-sm text-muted-foreground">
          Campos marcados com <span className="text-destructive">*</span> são obrigatórios.
        </p>
      </div>

      <LeadForm
        mode="create"
        verticais={verticais.map((v) => ({ slug: v.slug, label: v.label }))}
      />
    </div>
  );
}
