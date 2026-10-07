// Detecta automáticamente si estás en local o en producción
// En local: usa el proxy de Vite (localhost:3001)
// En producción: usa la URL del backend en Render

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default API_URL;

// Contacto oficial (el mismo de la landing). wa.me requiere el número sin "+".
export const WHATSAPP = '573002123034';
export const EMAIL_CONTACTO = 'info@escaladabogota.com';
export const whatsappUrl = (mensaje) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
