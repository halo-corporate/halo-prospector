// ⚠️ TEMPORÁRIO (PASSO 5-B) — script standalone pra provar a ponte de leitura
// ao banco do ALIEN SEM passar pelo app (sem middleware/SSO/navegador).
// Node puro + @supabase/supabase-js (já em node_modules). Descartável — remover
// no fim do 5-B.
//
// Credenciais vêm SÓ do ambiente (process.env). NÃO hardcoda, NÃO lê .env.
// Rodar injetando inline (com espaço antes pra não ir pro histórico):
//
//    ALIEN_SUPABASE_URL='...' ALIEN_SUPABASE_SERVICE_ROLE_KEY='...' node scripts/test-ponte-alien.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.ALIEN_SUPABASE_URL;
const key = process.env.ALIEN_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "❌ Faltou env. Defina ALIEN_SUPABASE_URL e ALIEN_SUPABASE_SERVICE_ROLE_KEY inline no comando.",
  );
  process.exit(1);
}

// Mesma config do lib/supabase/alien-server.ts.
const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1) count(*) das tarefas HALO (head: true = não traz linhas).
  const { count, error: countErr } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("system", "HALO");

  if (countErr) {
    console.error("❌ count falhou:", countErr.message);
    process.exit(1);
  }
  console.log(`✅ count(tasks where system='HALO') = ${count}`);

  // 2) amostra de 3 — nomeia semana/stand_by/category_id de propósito: se essas
  //    colunas não existirem, o select retorna erro (e isso já é a prova).
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, system, semana, stand_by, category_id")
    .eq("system", "HALO")
    .limit(3);

  if (error) {
    console.error("❌ select da amostra falhou:", error.message);
    console.error(
      "   (se for 'column ... does not exist', uma das colunas semana/stand_by/category_id NÃO existe na tasks do ALIEN)",
    );
    process.exit(1);
  }

  console.log("✅ amostra (3 linhas):");
  console.log(JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error("❌ erro inesperado:", e?.message ?? e);
  process.exit(1);
});
