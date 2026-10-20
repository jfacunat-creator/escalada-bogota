# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Contenido editable de la landing

Textos, marca, colores, tipografías, imágenes y logo de la página pública (Inicio, Servicios, Equipo,
Alianzas, Legal, Contacto, menú y pie) viven en `src/contenido/sitio.json`. Las páginas no tienen
texto escrito adentro: lo leen de ese archivo.

1. `npm run contenido:exportar` → crea `contenido-editable/Contenido-landing-AAAA-MM-DD.xlsx`
   (se puede subir a Google Sheets). Se entrega al diseñador/comunicador; la pestaña
   "Instrucciones" explica cómo llenarla.
2. Cuando la devuelvan (si la editaron en Google Sheets: Archivo › Descargar › .xlsx):
   `npm run contenido:importar -- <hoja.xlsx> --imagenes <carpeta-de-imagenes>`
   muestra los cambios, los errores (colores mal escritos, imágenes que faltan) y los comentarios.
3. Si todo está bien, se repite con `--aplicar`: actualiza `sitio.json` y copia las imágenes a
   `public/contenido/`. Se revisa en local y se publica como cualquier cambio.

Lo que piden en "Comentarios" (agregar o quitar ítems de una lista, etc.) se hace a mano en `sitio.json`.
