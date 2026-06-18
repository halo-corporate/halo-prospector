// ⚠️ TEMPORÁRIO (PASSO 5-B) — página descartável pra provar a ponte de leitura
// ALIEN no preview. Junto com lib/tarefas/alien-test.ts, deve ser REMOVIDA no
// fim do 5-B. Não linkada em nenhum nav — acesso só pela URL /halo/test-alien.
// Só funciona em preview/produção (a service-role do ALIEN não existe em dev).

import { testReadAlienTasks } from "@/lib/tarefas/alien-test";

export const dynamic = "force-dynamic";
export const metadata = { title: "TEST · ponte ALIEN (temporário)" };

export default async function TestAlienPage() {
  const res = await testReadAlienTasks();

  return (
    <main style={{ padding: 24, fontFamily: "monospace", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 18, marginBottom: 4 }}>
        TEST · ponte de leitura ALIEN
      </h1>
      <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
        Temporário (PASSO 5-B). tasks onde system=&apos;HALO&apos; via
        service-role.
      </p>

      {res.ok ? (
        <>
          <p style={{ marginBottom: 12 }}>
            ✅ OK · count = <strong>{res.count}</strong> tarefas HALO
          </p>
          <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
            amostra ({res.sample.length} linha
            {res.sample.length === 1 ? "" : "s"}):
          </p>
          <pre
            style={{
              background: "#111",
              color: "#0f0",
              padding: 16,
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(res.sample, null, 2)}
          </pre>
        </>
      ) : (
        <pre
          style={{
            background: "#300",
            color: "#f88",
            padding: 16,
            borderRadius: 8,
            overflow: "auto",
            fontSize: 13,
          }}
        >
          ❌ ERRO: {res.message}
        </pre>
      )}
    </main>
  );
}
