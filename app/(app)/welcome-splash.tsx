"use client";

import { useEffect, useState } from "react";

const FRASES = ["DE MENOR", "PREPARANDO SEU GRIND", "BEM VINDO ÁGUIA"];
const FRAME_MS = 1100;
const FADE_MS = 280;
const SESSION_KEY = "halo:welcome-shown";

/**
 * Splash de entrada — aparece 1x por sessão (sessionStorage) ao montar
 * o layout autenticado. Sequência cinematográfica: 3 frases em caixa alta,
 * azul HALO com glow, transições rápidas. Pulável por clique/tecla.
 */
export function WelcomeSplash() {
  const [show, setShow] = useState(false);
  const [idx, setIdx] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show || leaving) return;
    if (idx >= FRASES.length) {
      // Última frase já mostrada — fade out final
      setLeaving(true);
      const t = setTimeout(() => setShow(false), FADE_MS);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setIdx((i) => i + 1), FRAME_MS);
    return () => clearTimeout(t);
  }, [idx, show, leaving]);

  useEffect(() => {
    if (!show) return;
    function skip() {
      setLeaving(true);
      setTimeout(() => setShow(false), FADE_MS);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") skip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  if (!show) return null;

  const fraseAtual = FRASES[Math.min(idx, FRASES.length - 1)];

  return (
    <div
      role="dialog"
      aria-label="Boas-vindas"
      onClick={() => {
        setLeaving(true);
        setTimeout(() => setShow(false), FADE_MS);
      }}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black cursor-pointer select-none transition-opacity duration-300 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* glow radial de fundo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 50%, rgba(0,113,227,0.25) 0%, rgba(0,0,0,0) 70%)",
        }}
      />
      <h1
        key={idx}
        className="halo-splash-text relative px-6 text-center font-bold uppercase tracking-tight text-[clamp(2.5rem,11vw,8rem)] leading-[0.95]"
        style={{
          color: "#0071E3",
          textShadow:
            "0 0 18px rgba(0,113,227,0.85), 0 0 48px rgba(0,113,227,0.55), 0 0 90px rgba(0,113,227,0.35)",
          fontFamily:
            "'Helvetica Neue', Helvetica, Arial, system-ui, sans-serif",
          animation: "halo-splash-in 0.45s ease-out both",
        }}
      >
        {fraseAtual}
      </h1>

      <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-white/40">
        Clique pra pular
      </span>
    </div>
  );
}
