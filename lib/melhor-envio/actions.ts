"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MelhorEnvioActionResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Desconecta a conta do Melhor Envio: apaga os tokens guardados. (Não revoga no
 * lado do Melhor Envio — só descarta localmente; reconectar pede novo consentimento.)
 */
export async function disconnectMelhorEnvioAction(): Promise<MelhorEnvioActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado." };

  const { error } = await supabase
    .from("melhor_envio_conexao")
    .delete()
    .eq("user_id", user.id);
  if (error) {
    console.error("[disconnectMelhorEnvioAction]", error);
    return { ok: false, message: error.message };
  }
  revalidatePath("/envios");
  return { ok: true };
}
