// Logout do HALO: Server Action que limpa a sessão HALO (createSessionClient
// + signOut) e redireciona pra /login. Antes apontava pro /auth/signout do
// ALIEN (era SSO); agora o portão é o HALO (fatia 3a.5).
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
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
