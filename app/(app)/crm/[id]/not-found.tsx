import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LeadNotFound() {
  return (
    <div className="container py-16 text-center space-y-4">
      <h1 className="title-display text-2xl">Lead não encontrado</h1>
      <p className="text-sm text-muted-foreground">
        Ele pode ter sido excluído, ou o link está errado.
      </p>
      <Button asChild>
        <Link href="/crm">Voltar para lista</Link>
      </Button>
    </div>
  );
}
