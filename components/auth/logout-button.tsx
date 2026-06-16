// ⚠️ ALTERADO PARA SSO COM ALIEN — não reverter sem entender o impacto.
// Sob login único, sair do HALO = sair do ALIEN (a PORTA). Por isso este botão
// faz um POST nativo pra `/auth/signout` do ALIEN — caminho ABSOLUTO, fora de
// /halo. O basePath '/halo' NÃO prefixa `action` de form HTML cru, então a
// requisição bate na zona do ALIEN (apex), encerra a sessão única e corta o
// acesso ao HALO junto. Não trocar pro logout antigo do HALO (que não existe
// mais como login próprio).
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <form action="/auth/signout" method="post">
      <Button
        variant="ghost"
        size="icon"
        type="submit"
        aria-label="Sair"
        title="Sair"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </form>
  );
}
