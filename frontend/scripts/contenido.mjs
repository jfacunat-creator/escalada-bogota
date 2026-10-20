#!/usr/bin/env node
// ── Ida y vuelta del contenido de la landing con Excel / Google Sheets ──
//
//   npm run contenido:exportar
//       Crea contenido-editable/Contenido-landing-AAAA-MM-DD.xlsx a partir de src/contenido/sitio.json.
//       Se le entrega al diseñador/comunicador; se puede subir tal cual a Google Sheets.
//
//   npm run contenido:importar -- <hoja.xlsx> [--imagenes <carpeta>] [--aplicar]
//       Lee la hoja devuelta y muestra qué cambiaría. Solo escribe sitio.json (y copia las
//       imágenes nuevas a public/contenido/) si se pasa --aplicar.
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_SITIO = path.join(RAIZ, 'src/contenido/sitio.json');
const PUBLIC = path.join(RAIZ, 'public');
const SALIDA = path.join(RAIZ, 'contenido-editable');

// Campos que no son contenido (los usa el código) y no salen en la hoja.
const NO_EDITABLES = new Set(['modalidad', 'destacado']);

const PAGINAS = {
  marca: 'Marca', contacto: 'Datos de contacto', menu: 'Menú', pie: 'Pie de página',
  inicio: 'Inicio', servicios: 'Servicios', equipo: 'Equipo', alianzas: 'Alianzas', legal: 'Legal', contactoPagina: 'Contacto',
};

const ETIQUETAS = {
  // secciones
  colores: 'Colores', fuentes: 'Tipografías', portada: 'Portada', problema: 'El problema', llamado: 'Llamado final',
  encabezado: 'Encabezado', niveles: 'Niveles', planes: 'Planes', historia: 'Historia', entrenadores: 'Entrenadores',
  aliados: 'Aliados', invitacion: 'Invitación a aliados', normas: 'Normas', cuerpo: 'Cuerpo', canales: 'Canales',
  cifras: 'Cifras', pilares: 'Pilares', lista: '',
  // elementos
  nombre: 'Nombre', logoLinea1: 'Logo · línea 1 (blanca)', logoLinea2: 'Logo · línea 2 (color acento)',
  logoImagen: 'Logo (imagen). Vacío = ícono actual del muro',
  acento: 'Principal (dorado)', acentoHover: 'Principal al pasar el mouse', acentoOscuro: 'Principal oscuro',
  cafe: 'Café (fondos destacados)', fondo: 'Fondo general', fondoProfundo: 'Fondo del pie de página',
  superficie: 'Fondo de tarjetas', superficieAlt: 'Fondo de tarjetas alterno', borde: 'Bordes',
  texto: 'Texto', textoSecundario: 'Texto secundario', textoTenue: 'Texto tenue', textoSobreAcento: 'Texto sobre botones dorados',
  titulos: 'Fuente de títulos (Google Fonts)',
  whatsappNumero: 'WhatsApp (número para el enlace, sin + ni espacios)', whatsappVisible: 'WhatsApp (como se muestra)',
  email: 'Correo', instagram: 'Instagram (usuario, sin @)',
  inicio: 'Inicio', servicios: 'Servicios', equipo: 'Equipo', alianzas: 'Alianzas', legal: 'Legal', contacto: 'Contacto',
  ingresar: 'Botón Ingresar', ingresarMovil: 'Botón Ingresar (celular)',
  copyright: 'Derechos / copyright', terminos: 'Enlace Términos', privacidad: 'Enlace Privacidad',
  imagen: 'Imagen', imagenTitulo: 'Recuadro sobre la imagen · título', imagenSubtitulo: 'Recuadro sobre la imagen · subtítulo',
  etiqueta: 'Etiqueta pequeña (sobre el título)', titulo: 'Título', tituloDestacado: 'Título · segunda línea en dorado',
  subtitulo: 'Subtítulo', parrafo: 'Párrafo', parrafo1: 'Párrafo 1', parrafo2: 'Párrafo 2',
  boton: 'Botón', botonSecundario: 'Botón secundario', numero: 'Número', descubrir: 'Texto "Descubrir" al pie de la portada',
  rango: 'Rango (etiqueta)', color: 'Color', dolor: 'Frase del escalador', pitch: 'Frase de venta', incluye: 'Incluye',
  insigniaDestacado: 'Insignia del plan destacado', categoria: 'Categoría (etiqueta)', periodo: 'Periodo bajo el precio',
  descripcion: 'Descripción', pie: 'Texto al pie de la tarjeta',
  notaAntes: 'Nota final · antes del enlace', notaEnlace: 'Nota final · texto del enlace', notaDespues: 'Nota final · después del enlace',
  etiquetaGrupos: 'Etiqueta "Grupos que dirige"', iniciales: 'Iniciales (círculo)', rol: 'Rol', bio: 'Biografía', grupos: 'Grupo',
  tipo: 'Tipo (etiqueta)', ley: 'Ley (etiqueta)', colorWhatsapp: 'Color WhatsApp', colorEmail: 'Color correo', colorInstagram: 'Color Instagram',
};

const MAYUS = { '': 'Normal', mayusculas: 'MAYÚSCULAS', minusculas: 'minúsculas', titulo: 'Tipo Título' };
const MAYUS_INV = Object.fromEntries(Object.entries(MAYUS).map(([k, v]) => [v.toLowerCase(), k]));
const VACIO = '(vacío)';
const esColor = (v) => /^#[0-9a-f]{6}$/i.test(v);

// ── Recorrido del JSON: una fila por cada texto/color/imagen ──
function filas(sitio) {
  const out = [];
  const reglas = sitio.mayusculas || {};
  const nombreItem = (o, i) => (o && typeof o === 'object' && (o.nombre || o.titulo || o.texto)) || `#${i + 1}`;

  function visitar(valor, ruta, seccion) {
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => {
        if (typeof v === 'string') visitar(v, [...ruta, i], seccion);
        else visitar(v, [...ruta, i], [...seccion, nombreItem(v, i)]);
      });
      return;
    }
    if (valor && typeof valor === 'object') {
      for (const [k, v] of Object.entries(valor)) {
        if (NO_EDITABLES.has(k)) continue;
        const etiqueta = ETIQUETAS[k] ?? k;
        const esHoja = typeof v !== 'object' || (Array.isArray(v) && v.every(x => typeof x === 'string'));
        visitar(v, [...ruta, k], esHoja || !etiqueta ? seccion : [...seccion, etiqueta]);
      }
      return;
    }
    if (typeof valor !== 'string') return;

    const id = ruta.join('.');
    const ultimo = ruta.at(-1);
    const elemento = ruta[1] === 'fuentes' && ultimo === 'texto' ? 'Fuente del texto corrido (Google Fonts)'
      : typeof ultimo === 'number' ? `${ETIQUETAS[ruta.at(-2)] ?? ruta.at(-2)} ${ultimo + 1}` : (ETIQUETAS[ultimo] ?? ultimo);
    const tipo = esColor(valor) || ruta.includes('colores') || /^color/.test(ultimo) ? 'Color'
      : /imagen$/i.test(ultimo) ? 'Imagen'
      : ruta.includes('fuentes') ? 'Fuente'
      : ruta[0] === 'contacto' ? 'Dato'
      : valor.length > 90 ? 'Párrafo' : 'Texto';
    out.push({
      id, tipo, valor, elemento,
      pagina: PAGINAS[ruta[0]] ?? ruta[0],
      seccion: seccion.join(' · ') || '—',
      mayus: tipo === 'Texto' || tipo === 'Párrafo' ? MAYUS[reglas[id] || ''] : '',
    });
  }

  const { mayusculas, ...resto } = sitio;
  for (const [k, v] of Object.entries(resto)) visitar(v, [k], []);
  return out;
}

// ── Exportar ──
async function exportar() {
  const sitio = JSON.parse(fs.readFileSync(JSON_SITIO, 'utf8'));
  const wb = new ExcelJS.Workbook();
  wb.creator = sitio.marca.nombre;

  const ins = wb.addWorksheet('Instrucciones');
  ins.getColumn(1).width = 110;
  [
    [`Contenido editable · ${sitio.marca.nombre} · página pública`, { bold: true, size: 16 }],
    [''],
    ['Cómo editar', { bold: true, size: 12 }],
    ['1. Ve a la pestaña "Contenido". Cada fila es una frase, color, imagen o dato de la página.'],
    ['2. Escribe SOLO en la columna amarilla "NUEVO VALOR". Si una fila no cambia, déjala vacía.'],
    ['3. Mayúsculas: elige en la lista desplegable (Normal, MAYÚSCULAS, minúsculas, Tipo Título). Escribe el texto normal; la página lo convierte.'],
    [`4. Para dejar un texto en blanco (por ejemplo quitar la segunda línea dorada de un título), escribe ${VACIO}.`],
    ['5. Colores: código hexadecimal de 6 dígitos, por ejemplo #D4AF37. La celda "Valor actual" muestra el color de hoy.'],
    ['6. Imágenes y logo: escribe el nombre del archivo nuevo (por ejemplo portada-nueva.jpg) y entrega el archivo en la carpeta "imagenes".'],
    ['   Recomendado: JPG/PNG/WebP de máximo 500 KB; portada horizontal de al menos 1920 px de ancho; logo en PNG o SVG con fondo transparente.'],
    ['7. Tipografías: nombre exacto de una fuente de Google Fonts (fonts.google.com), por ejemplo "Montserrat".'],
    ['8. Si quieres agregar o quitar elementos de una lista (un ítem de "Incluye", un aliado, un entrenador), o cambiar algo que no está en la hoja, escríbelo en "Comentarios".'],
    ['9. No cambies la columna ID ni borres filas: es la que usamos para ubicar cada texto en la página.'],
    [''],
    ['Qué NO está aquí', { bold: true, size: 12 }],
    ['• Los precios de los planes: salen del sistema de pagos y se cambian desde el panel de administración.'],
    ['• Las páginas internas de la plataforma (escaladores, entrenadores, admin).'],
    [''],
    ['La columna "Caracteres" sirve de guía: textos mucho más largos que el actual pueden desacomodar el diseño.'],
  ].forEach(([t, font]) => { const r = ins.addRow([t]); r.getCell(1).alignment = { wrapText: true }; if (font) r.font = font; });

  const ws = wb.addWorksheet('Contenido', { views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }] });
  ws.columns = [
    { header: 'ID (no editar)', key: 'id', width: 22 },
    { header: 'Página', key: 'pagina', width: 16 },
    { header: 'Sección', key: 'seccion', width: 28 },
    { header: 'Elemento', key: 'elemento', width: 32 },
    { header: 'Tipo', key: 'tipo', width: 10 },
    { header: 'Valor actual', key: 'valor', width: 60 },
    { header: 'NUEVO VALOR', key: 'nuevo', width: 60 },
    { header: 'Mayúsculas', key: 'mayus', width: 14 },
    { header: 'Caracteres', key: 'largo', width: 11 },
    { header: 'Comentarios', key: 'comentarios', width: 40 },
  ];
  const cab = ws.getRow(1);
  cab.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cab.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4A2F0F' } };
  cab.getCell('nuevo').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4AF37' } };
  cab.getCell('nuevo').font = { bold: true, color: { argb: 'FF121212' } };

  for (const f of filas(sitio)) {
    const r = ws.addRow({ ...f, nuevo: '', largo: f.tipo === 'Texto' || f.tipo === 'Párrafo' ? f.valor.length : '' });
    r.alignment = { vertical: 'top', wrapText: true };
    r.getCell('id').font = { color: { argb: 'FF999999' }, size: 9 };
    r.getCell('nuevo').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF6CC' } };
    if (f.tipo === 'Color') {
      const hex = f.valor.replace('#', '').toUpperCase();
      const oscuro = parseInt(hex.slice(0, 2), 16) * 0.299 + parseInt(hex.slice(2, 4), 16) * 0.587 + parseInt(hex.slice(4, 6), 16) * 0.114 < 140;
      r.getCell('valor').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${hex}` } };
      r.getCell('valor').font = { color: { argb: oscuro ? 'FFFFFFFF' : 'FF000000' } };
    }
    if (f.mayus) {
      r.getCell('mayus').dataValidation = { type: 'list', allowBlank: true, formulae: [`"${Object.values(MAYUS).join(',')}"`] };
    }
  }
  ws.autoFilter = { from: 'A1', to: 'J1' };

  fs.mkdirSync(SALIDA, { recursive: true });
  const archivo = path.join(SALIDA, `Contenido-landing-${new Date().toISOString().slice(0, 10)}.xlsx`);
  await wb.xlsx.writeFile(archivo);
  console.log(`Hoja creada: ${path.relative(process.cwd(), archivo)} (${ws.rowCount - 1} elementos)`);
}

// ── Importar ──
const leerRuta = (obj, ruta) => ruta.reduce((o, k) => o?.[k], obj);
function escribirRuta(obj, ruta, valor) {
  const padre = leerRuta(obj, ruta.slice(0, -1));
  padre[ruta.at(-1)] = valor;
}
const partes = (id) => id.split('.').map(p => (/^\d+$/.test(p) ? Number(p) : p));

async function importar(archivo, { imagenes, aplicar }) {
  if (!archivo || !fs.existsSync(archivo)) throw new Error(`No encuentro la hoja: ${archivo ?? '(falta la ruta)'}`);
  const sitio = JSON.parse(fs.readFileSync(JSON_SITIO, 'utf8'));
  const actuales = new Map(filas(sitio).map(f => [f.id, f]));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(archivo);
  const ws = wb.getWorksheet('Contenido') ?? wb.worksheets.find(w => w.name !== 'Instrucciones');
  if (!ws) throw new Error('La hoja no tiene la pestaña "Contenido".');

  const col = {};
  ws.getRow(1).eachCell((c, i) => { col[c.text.trim().toLowerCase()] = i; });
  const idx = (nombre) => Object.entries(col).find(([k]) => k.startsWith(nombre))?.[1];
  const [cId, cNuevo, cMayus, cCom] = [idx('id'), idx('nuevo valor'), idx('mayúsculas'), idx('comentarios')];
  if (!cId || !cNuevo) throw new Error('No encuentro las columnas "ID" y "NUEVO VALOR" en la fila 1.');

  const cambios = [], errores = [], comentarios = [], copias = [];
  const reglas = { ...(sitio.mayusculas || {}) };

  ws.eachRow((row, n) => {
    if (n === 1) return;
    const id = row.getCell(cId).text.trim();
    if (!id) return;
    const actual = actuales.get(id);
    const com = cCom ? row.getCell(cCom).text.trim() : '';
    if (com) comentarios.push(`${id}: ${com}`);
    if (!actual) { errores.push(`Fila ${n}: el ID "${id}" no existe en la página (¿se editó la columna ID?)`); return; }

    let nuevo = row.getCell(cNuevo).text.trim();
    if (nuevo) {
      if (nuevo === VACIO) nuevo = '';
      if (actual.tipo === 'Color') {
        const hex = nuevo.startsWith('#') ? nuevo : `#${nuevo}`;
        if (!esColor(hex)) { errores.push(`Fila ${n} (${actual.elemento}): "${nuevo}" no es un color #RRGGBB`); return; }
        nuevo = hex.toUpperCase();
      }
      if (actual.tipo === 'Imagen' && nuevo) {
        const nombre = path.basename(nuevo);
        const enCarpeta = imagenes && path.join(imagenes, nombre);
        if (enCarpeta && fs.existsSync(enCarpeta)) {
          copias.push([enCarpeta, path.join(PUBLIC, 'contenido', nombre)]);
          nuevo = `/contenido/${nombre}`;
        } else if (fs.existsSync(path.join(PUBLIC, nuevo.replace(/^\//, '')))) {
          nuevo = `/${nuevo.replace(/^\//, '')}`;
        } else {
          errores.push(`Fila ${n} (${actual.elemento}): no encuentro la imagen "${nombre}"${imagenes ? ` en ${imagenes}` : ' (pasa --imagenes <carpeta>)'}`);
          return;
        }
      }
      if (nuevo !== actual.valor) {
        cambios.push({ id, que: `${actual.pagina} › ${actual.seccion} › ${actual.elemento}`, antes: actual.valor, despues: nuevo });
        escribirRuta(sitio, partes(id), nuevo);
      }
    }

    if (cMayus && actual.mayus) {
      const elegido = row.getCell(cMayus).text.trim().toLowerCase();
      const regla = elegido ? MAYUS_INV[elegido] : '';
      if (regla === undefined) { errores.push(`Fila ${n} (${actual.elemento}): mayúsculas "${elegido}" no es una opción válida`); return; }
      if (MAYUS[regla] !== actual.mayus) {
        cambios.push({ id, que: `${actual.pagina} › ${actual.seccion} › ${actual.elemento} (mayúsculas)`, antes: actual.mayus, despues: MAYUS[regla] });
        if (regla) reglas[id] = regla; else delete reglas[id];
      }
    }
  });

  console.log(`\n${cambios.length} cambio(s) en ${path.basename(archivo)}\n`);
  for (const c of cambios) console.log(`• ${c.que}\n    antes:  ${c.antes || VACIO}\n    ahora:  ${c.despues || VACIO}\n`);
  if (copias.length) console.log(`Imágenes a copiar en public/contenido/: ${copias.map(([, d]) => path.basename(d)).join(', ')}\n`);
  if (comentarios.length) console.log(`Comentarios del diseñador (requieren cambio manual):\n${comentarios.map(c => `  - ${c}`).join('\n')}\n`);
  if (errores.length) console.log(`Problemas (no se aplican):\n${errores.map(e => `  ✗ ${e}`).join('\n')}\n`);

  if (!aplicar) { console.log('Vista previa: no se cambió nada. Para aplicar, repite el comando con --aplicar.'); return; }
  if (!cambios.length) { console.log('Nada que aplicar.'); return; }
  for (const [de, a] of copias) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.copyFileSync(de, a); }
  sitio.mayusculas = reglas;
  fs.writeFileSync(JSON_SITIO, `${JSON.stringify(sitio, null, 2)}\n`);
  console.log(`Aplicado en ${path.relative(process.cwd(), JSON_SITIO)}.`);
}

const [accion, ...args] = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
try {
  if (accion === 'exportar') await exportar();
  else if (accion === 'importar') await importar(args.find(a => !a.startsWith('--') && a !== opcion('--imagenes')), { imagenes: opcion('--imagenes'), aplicar: args.includes('--aplicar') });
  else console.log('Uso: node scripts/contenido.mjs exportar | importar <hoja.xlsx> [--imagenes <carpeta>] [--aplicar]');
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exit(1);
}
