import { createSessionClient } from "@/lib/supabase/session";
import type { Embalagem } from "@/lib/database.types";

/**
 * Lista embalagens ativas do user, ordenadas por nome.
 * Inclui inativas se `includeInativas=true` (útil em telas admin).
 */
export async function listEmbalagens(
  includeInativas = false,
): Promise<Embalagem[]> {
  const supabase = createSessionClient();
  let q = supabase.from("embalagens").select("*");
  if (!includeInativas) q = q.eq("ativo", true);
  const { data, error } = await q.order("nome", { ascending: true });

  if (error) {
    console.error("[listEmbalagens]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getEmbalagem(id: string): Promise<Embalagem | null> {
  const supabase = createSessionClient();
  const { data, error } = await supabase
    .from("embalagens")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[getEmbalagem]", error);
    return null;
  }
  return data;
}
