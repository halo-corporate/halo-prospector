"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
  next: z.string().optional(),
});

export type LoginFormState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success" };

/**
 * Server Action — Login com email + senha.
 *
 * Em sucesso: revalida o cache da home e redireciona pra `next` (ou `/`).
 * Em erro: retorna { status: "error", message } pra UI exibir.
 */
export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Mapeia mensagens do Supabase pra PT-BR
    const msg =
      error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos"
        : error.message;
    return { status: "error", message: msg };
  }

  revalidatePath("/", "layout");

  const nextPath =
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : "/";

  redirect(nextPath);
}
