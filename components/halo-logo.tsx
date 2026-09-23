/**
 * Logo HALO do brandbook — 2 anéis sobrepostos + traço (forma de busca/lupa,
 * remete à prospecção) + wordmark "HALO". Usa currentColor pra herdar a cor do
 * contexto (texto do nav) e funcionar com hover/opacity.
 */
export function HaloLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="HALO"
    >
      <circle cx="14" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
      <circle cx="40" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
      <line
        x1="47"
        y1="27"
        x2="54"
        y2="36"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <text
        x="64"
        y="27"
        fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
        fontWeight="300"
        fontSize="20"
        letterSpacing="4"
        fill="currentColor"
      >
        HALO
      </text>
    </svg>
  );
}
