import { createClient } from "@/lib/supabase/server";
import type { Vertical } from "@/lib/database.types";

/**
 * Lista todas as verticais do usuário, ordenadas por `ordem` então `label`.
 */
export async function listVerticais(): Promise<Vertical[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("verticais")
    .select("*")
    .order("ordem", { ascending: true })
    .order("label", { ascending: true });
  if (error) {
    console.error("[listVerticais]", error);
    throw new Error(error.message);
  }
  return data ?? [];
}
