import API_URL_BASE from '../config';

const API_URL = API_URL_BASE;

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        this.setToken(null);
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      throw { status: res.status, ...data };
    }
    return data;
  }

  // Auth
  login(email, password) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  register(data) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  getMe() { return this.request('/auth/me'); }

  // Catálogos
  getProgramas(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/programas${q}`); }
  getCiclos(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/ciclos${q}`); }
  getCicloActual() { return this.request('/catalogos/ciclos/actual'); }
  getMuros() { return this.request('/catalogos/muros'); }

  // Cohortes
  getCohortes(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/cohortes${q}`); }
  getCohorte(id) { return this.request(`/cohortes/${id}`); }

  // Escaladores
  getEscaladores(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/escaladores${q}`); }
  getEscalador(id) { return this.request(`/escaladores/${id}`); }
  updateEscalador(id, data) { return this.request(`/escaladores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

  // Entrenadores
  getEntrenadores() { return this.request('/entrenadores'); }
  getEntrenador(id) { return this.request(`/entrenadores/${id}`); }
  getEscaladoresEntrenador(id) { return this.request(`/entrenadores/${id}/escaladores`); }

  // Sesiones
  getSesiones(cohorteId) { return this.request(`/sesiones?cohorteId=${cohorteId}`); }
  getSesion(id) { return this.request(`/sesiones/${id}`); }
  generarSesiones(cohorteId) { return this.request('/sesiones/generar', { method: 'POST', body: JSON.stringify({ cohorteId }) }); }
  updateNotasSesion(id, notas) { return this.request(`/sesiones/${id}/notas`, { method: 'PUT', body: JSON.stringify({ notas }) }); }

  // Asistencia
  registrarAsistencia(sesionId, registros) { return this.request('/asistencia', { method: 'POST', body: JSON.stringify({ sesionId, registros }) }); }
  getAsistenciaSesion(sesionId) { return this.request(`/asistencia/sesion/${sesionId}`); }
  getAsistenciaEscalador(escaladorId, cohorteId) { const q = cohorteId ? `?cohorteId=${cohorteId}` : ''; return this.request(`/asistencia/escalador/${escaladorId}${q}`); }
  getResumenAsistencia(cohorteId) { return this.request(`/asistencia/cohorte/${cohorteId}/resumen`); }

  // Contenido
  getContenido(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/contenido${q}`); }
  crearContenido(data) { return this.request('/contenido', { method: 'POST', body: JSON.stringify(data) }); }
  updateProgreso(contenidoId, progresoPct) { return this.request(`/contenido/${contenidoId}/progreso`, { method: 'PUT', body: JSON.stringify({ progresoPct }) }); }
  getStatsContenido(cicloId) { return this.request(`/contenido/stats/${cicloId}`); }

  // Evaluaciones
  getEvaluaciones(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/evaluaciones${q}`); }
  getEvaluacion(id) { return this.request(`/evaluaciones/${id}`); }
  crearEvaluacion(data) { return this.request('/evaluaciones', { method: 'POST', body: JSON.stringify(data) }); }
  registrarResultados(evalId, resultados) { return this.request(`/evaluaciones/${evalId}/resultados`, { method: 'POST', body: JSON.stringify({ resultados }) }); }
  getProgreso(escaladorId) { return this.request(`/evaluaciones/progreso/${escaladorId}`); }
  getComparacionCohorte(cohorteId) { return this.request(`/evaluaciones/comparar/${cohorteId}`); }

  // Inscripciones
  getInscripciones(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/inscripciones${q}`); }
  crearInscripcion(data) { return this.request('/inscripciones', { method: 'POST', body: JSON.stringify(data) }); }
  cambiarEstadoInscripcion(id, estado) { return this.request(`/inscripciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); }

  // Pagos
  getPagos(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/pagos${q}`); }
  registrarPago(data) { return this.request('/pagos', { method: 'POST', body: JSON.stringify(data) }); }
  cambiarEstadoPago(id, estado) { return this.request(`/pagos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); }
  getResumenPagos(cicloId) { const q = cicloId ? `?cicloId=${cicloId}` : ''; return this.request(`/pagos/resumen/general${q}`); }
}

const api = new ApiService();
export default api;
