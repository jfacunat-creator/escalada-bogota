/**
 * Iconografía Escalada Bogotá
 * Iconos SVG propios, inspirados en el mundo de la escalada.
 * Cada ícono tiene identidad de marca, no es genérico.
 */

export function IconoPresa({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M7 17c-2-1-4-4-3-8 1-3 4-5 7-5s6 2 7 5c1 4-1 7-3 8" />
      <path d="M9 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      <path d="M15 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
      <path d="M11 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M8 20l2-3M16 20l-2-3" />
    </svg>
  );
}

export function IconoMuro({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
      <path d="M4 21h16" />
      {/* Presas en el muro */}
      <circle cx="8" cy="7" r="1.2" />
      <circle cx="14" cy="6" r="1" />
      <circle cx="11" cy="10" r="1.3" />
      <circle cx="16" cy="11" r="1" />
      <circle cx="7" cy="14" r="1.1" />
      <circle cx="13" cy="15" r="1.2" />
      <circle cx="9" cy="18" r="1" />
      <circle cx="15" cy="18" r="0.8" />
    </svg>
  );
}

export function IconoMosqueton({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M8 4a4 4 0 0 1 4-1 4 4 0 0 1 4 4v8a5 5 0 0 1-5 5 5 5 0 0 1-5-5V7" />
      <path d="M16 8V7" />
      <line x1="16" y1="7" x2="16" y2="12" strokeWidth="2.5" />
    </svg>
  );
}

export function IconoCuerda({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M4 4c3 0 3 4 6 4s3-4 6-4" />
      <path d="M4 10c3 0 3 4 6 4s3-4 6-4" />
      <path d="M4 16c3 0 3 4 6 4s3-4 6-4" />
    </svg>
  );
}

export function IconoEscalador({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="4" r="2" />
      <path d="M8 10l4-2 4 2" />
      <path d="M12 8v5" />
      <path d="M9 21l3-8 3 8" />
      <path d="M7 14l5-1" />
      <path d="M17 12l-5 1" />
    </svg>
  );
}

export function IconoRoca({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M3 20L8 4l5 8 5-6 3 14H3z" />
      <path d="M8 4l3 5" />
      <path d="M18 6l-2 6" />
    </svg>
  );
}

export function IconoMagnesia({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M7 6h10l1 14H6L7 6z" />
      <path d="M9 6V4a3 3 0 0 1 6 0v2" />
      <path d="M9 10c1 1 2 1.5 3 1.5s2-.5 3-1.5" />
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
      <circle cx="14" cy="13" r="0.5" fill="currentColor" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconoCronometro({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M10 2h4" />
      <path d="M12 2v3" />
      <path d="M19 5l1 1" />
    </svg>
  );
}

export function IconoSemaforo({ color = "verde", className = "w-5 h-5", ...props }) {
  const colors = { verde: "#16a34a", amarillo: "#f59e0b", rojo: "#dc2626" };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} {...props}>
      <rect x="7" y="2" width="10" height="20" rx="3" />
      <circle cx="12" cy="7" r="2" fill={color === "rojo" ? colors.rojo : "none"} stroke={colors.rojo} />
      <circle cx="12" cy="12" r="2" fill={color === "amarillo" ? colors.amarillo : "none"} stroke={colors.amarillo} />
      <circle cx="12" cy="17" r="2" fill={color === "verde" ? colors.verde : "none"} stroke={colors.verde} />
    </svg>
  );
}

export function IconoCohorte({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      {/* Grupo de escaladores estilizados */}
      <circle cx="8" cy="5" r="1.5" />
      <circle cx="16" cy="5" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <path d="M6 12c0-2 1-3.5 2-4" />
      <path d="M18 12c0-2-1-3.5-2-4" />
      <path d="M10 11c0-2 1-3.5 2-4.5 1 1 2 2.5 2 4.5" />
      <path d="M5 20l3-8M19 20l-3-8M10 20l2-9 2 9" />
    </svg>
  );
}

export function IconoPlanEntreno({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h5" />
      <path d="M8 15h3" />
      {/* Curva de progreso */}
      <path d="M14 18l2-4 2-1" strokeWidth="2" />
    </svg>
  );
}

export function IconoVideo({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M17 9l4-2v10l-4-2" />
      {/* Presa pequeña como marca */}
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconoCandado({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function IconoCheck({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function IconoFalta({ className = "w-5 h-5", ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}
