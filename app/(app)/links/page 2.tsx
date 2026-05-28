import { LinkIcon } from "lucide-react";
import { LinkCard } from "@/components/links/link-card";
import { LinkFormDialog } from "@/components/links/link-form-dialog";
import { Button } from "@/components/ui/button";
import { listLinks } from "@/lib/links/queries";

export const metadata = { title: "Central de Links — HALO Prospector" };
export const dynamic = "force-dynamic";

export default async function LinksPage() {
  const links = await listLinks();

  return (
    <div className="container py-6 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="title-display text-2xl">Central de Links</h1>
          <p className="text-sm text-muted-foreground">
            {links.length === 0
              ? "Atalhos rápidos pra seus recursos externos."
              : `${links.length} ${links.length === 1 ? "link salvo" : "links salvos"}`}
          </p>
        </div>
        <LinkFormDialog mode="create" />
      </div>

      {links.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-white/10 p-12 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <LinkIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="font-display font-bold uppercase tracking-[0.04em] text-base">
              Nenhum link salvo ainda
            </h2>
            <p className="text-sm text-muted-foreground">
              Adicione URLs de Notion, Drive, Calendar, planilhas — qualquer
              ferramenta que você acessa toda hora. Vão ficar aqui à mão.
            </p>
          </div>
          <LinkFormDialog
            mode="create"
            trigger={
              <Button size="sm">
                <LinkIcon className="h-3.5 w-3.5" />
                Adicionar primeiro link
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {links.map((l) => (
            <LinkCard key={l.id} link={l} />
          ))}
        </div>
      )}
    </div>
  );
}
