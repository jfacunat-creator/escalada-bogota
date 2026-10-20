// ── Contenido editable de la landing: textos, marca, colores, imágenes ──
// La fuente es sitio.json. El diseñador lo edita en Excel/Google Sheets
// (npm run contenido:exportar / contenido:importar, ver scripts/contenido.mjs).
// Aquí solo se aplica la mayúscula/minúscula elegida para cada texto.
import sitio from './sitio.json';

const TRANSFORMAR = {
  mayusculas: (t) => t.toLocaleUpperCase('es-CO'),
  minusculas: (t) => t.toLocaleLowerCase('es-CO'),
  titulo: (t) => t.toLocaleLowerCase('es-CO').replace(/(^|[\s(¿¡"'—-])(\p{L})/gu, (_, a, l) => a + l.toLocaleUpperCase('es-CO')),
};

function aplicar(valor, ruta, reglas) {
  if (Array.isArray(valor)) return valor.map((v, i) => aplicar(v, `${ruta}.${i}`, reglas));
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, aplicar(v, ruta ? `${ruta}.${k}` : k, reglas)]));
  }
  const fn = TRANSFORMAR[reglas[ruta]];
  return typeof valor === 'string' && fn ? fn(valor) : valor;
}

const { mayusculas = {}, ...resto } = sitio;
export const S = aplicar(resto, '', mayusculas);

export const whatsappLink = `https://wa.me/${S.contacto.whatsappNumero}`;

// Fuentes de Google que no vienen precargadas en index.html (Antonio y Poppins sí).
const PRECARGADAS = ['Antonio', 'Poppins'];
const faltantes = Object.values(S.marca.fuentes).filter(f => f && !PRECARGADAS.includes(f));
if (faltantes.length && typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${[...new Set(faltantes)].map(f => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join('&')}&display=swap`;
  document.head.appendChild(link);
}
