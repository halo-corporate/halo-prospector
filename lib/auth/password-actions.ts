"use server";

import { createClient } from "@/lib/supabase/server";

export type TrocarSenhaResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Troca a senha do usuário logado. Exige a senha atual e re-autentica antes de
 * gravar a nova (defesa contra sessão sequestrada — `updateUser` por si só não
 * pede a senha atual). Mínimo de 6 caracteres (padrão do Supabase).
 */
export async function trocarSenhaAction(
  senhaAtual: string,
  novaSenha: string,
): Promise<TrocarSenhaResult> {
  const atual = senhaAtual ?? "";
  const nova = novaSenha ?? "";

  if (!atual) return { ok: false, message: "Informe a senha atual." };
  if (nova.length < 6) {
    return { ok: false, message: "A nova senha precisa ter ao menos 6 caracteres." };
  }
  if (nova === atual) {
    return { ok: false, message: "A nova senha é igual à atual." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, message: "Não autenticado." };

  // Re-autentica com a senha atual antes de trocar.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: atual,
  });
  if (reauthErr) {
    const msg =
      reauthErr.message === "Invalid login credentials"
        ? "Senha atual incorreta."
        : reauthErr.message;
    return { ok: false, message: msg };
  }

  const { error: updErr } = await supabase.auth.updateUser({ password: nova });
  if (updErr) {
    console.error("[trocarSenhaAction]", updErr);
    return { ok: false, message: updErr.message };
  }

  return { ok: true };
}
