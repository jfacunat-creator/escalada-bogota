// Detecta automáticamente si estás en local o en producción
// En local: usa el proxy de Vite (localhost:3001)
// En producción: usa la URL del backend en Render

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default API_URL;
