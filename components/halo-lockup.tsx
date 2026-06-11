/**
 * Lockup HALO + Prospector — marca única, espaçamento mínimo intencional.
 *
 * Reusa a estrutura do HaloLogo (2 anéis + linha + wordmark "HALO") mas
 * com viewBox justo (sem folga à direita do "O") e adiciona "Prospector"
 * dentro do mesmo SVG, alinhado à baseline do wordmark, em weight maior
 * pra criar contraste tipográfico (Light HALO + Semibold Prospector).
 */
export function HaloLockup({
  className,
  showProspector = true,
}: {
  className?: string;
  showProspector?: boolean;
}) {
  // Sem "Prospector": viewBox curto, só HALO + rings (igual ao antigo,
  // mas com cropping limpo).
  if (!showProspector) {
    return (
      <svg
        viewBox="0 0 158 38"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="HALO"
      >
        <circle cx="14" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
        <circle cx="40" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
        <line x1="47" y1="27" x2="54" y2="36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
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

  // Com "Prospector": viewBox estendido, "Prospector" colado logo após o "O"
  // do HALO, em weight 600 pra contrastar com o 300 do wordmark — lockup
  // único, sem hierarquia secundária.
  return (
    <svg
      viewBox="0 0 290 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="HALO Prospector"
    >
      <circle cx="14" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
      <circle cx="40" cy="19" r="11" stroke="currentColor" strokeWidth="4.5" fill="none" />
      <line x1="47" y1="27" x2="54" y2="36" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
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
      <text
        x="162"
        y="27"
        fontFamily="'Helvetica Neue',Helvetica,Arial,sans-serif"
        fontWeight="600"
        fontSize="16"
        letterSpacing="1.2"
        fill="currentColor"
      >
        Prospector
      </text>
    </svg>
  );
}
