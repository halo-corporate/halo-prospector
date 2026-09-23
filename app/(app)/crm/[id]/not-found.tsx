import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container py-8">
      <div className="halo-glow" aria-hidden />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[50vh] space-y-6 text-center">
        <div>
          <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
            404
          </p>
          <h1 className="text-3xl font-bold mb-2">Lead não encontrado</h1>
          <p className="text-muted-foreground">
            Este lead pode ter sido excluído ou o link está incorreto.
          </p>
        </div>
        <Button asChild>
          <Link href="/crm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao CRM
          </Link>
        </Button>
      </div>
    </div>
  );
}
