"use client";

/**
 * Error boundary global — captura erros que escapam até o root layout
 * (raros). Precisa repetir <html>/<body> porque substitui o layout root.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
          fontFamily:
            "Inter, Helvetica, system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 560,
            width: "100%",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: 12,
            padding: 28,
            background: "rgba(255, 255, 255, 0.02)",
          }}
        >
          <p
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1,
              color: "#a3a3a3",
              margin: 0,
            }}
          >
            Erro crítico
          </p>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              marginTop: 4,
              marginBottom: 8,
            }}
          >
            Algo quebrou no carregamento global do app
          </h1>
          {error.digest ? (
            <p style={{ fontSize: 12, color: "#a3a3a3", margin: "0 0 16px" }}>
              Digest:{" "}
              <span style={{ fontFamily: "ui-monospace, monospace" }}>
                {error.digest}
              </span>
            </p>
          ) : null}
          {error.message ? (
            <pre
              style={{
                fontSize: 12,
                background: "rgba(255,255,255,0.05)",
                padding: 12,
                borderRadius: 6,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                marginBottom: 16,
              }}
            >
              {error.message}
            </pre>
          ) : null}
          <button
            onClick={() => reset()}
            style={{
              background: "#0071E3",
              color: "#fff",
              border: 0,
              padding: "8px 14px",
              borderRadius: 6,
              fontSize: 14,
              cursor: "pointer",
              marginRight: 8,
            }}
          >
            Tentar de novo
          </button>
          <a
            href="/"
            style={{
              color: "#fff",
              padding: "8px 14px",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 6,
              fontSize: 14,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Início
          </a>
        </div>
      </body>
    </html>
  );
}
