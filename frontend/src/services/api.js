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
      throw { status: res.status, data, ...data };
    }
    return data;
  }

  // Auth
  login(email, password) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  register(data)          { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  getMe()                 { return this.request('/auth/me'); }

  // Plan de entrenamiento
  getMyPlan() { return this.request('/plan/my'); }

  // Catálogos
  getProgramas(params)  { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/programas${q}`); }
  getCiclos(params)     { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/ciclos${q}`); }
  getCicloActual()      { return this.request('/catalogos/ciclos/actual'); }
  crearCiclo(data)      { return this.request('/catalogos/ciclos', { method: 'POST', body: JSON.stringify(data) }); }
  getMuros()            { return this.request('/catalogos/muros'); }

  // Grupos (antes: Cohortes)
  getGrupos(params)             { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/grupos${q}`); }
  getGrupo(id)                  { return this.request(`/grupos/${id}`); }
  getGruposDisponibles()        { return this.request('/grupos/disponibles'); }
  crearGrupo(data)              { return this.request('/grupos', { method: 'POST', body: JSON.stringify(data) }); }
  cambiarEstadoGrupo(id, estado){ return this.request(`/grupos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); }

  // Escaladores
  getEscaladores(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/escaladores${q}`); }
  getEscalador(id)       { return this.request(`/escaladores/${id}`); }
  updateEscalador(id, data) { return this.request(`/escaladores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

  // Entrenadores
  getEntrenadores()              { return this.request('/entrenadores'); }
  getEntrenador(id)              { return this.request(`/entrenadores/${id}`); }
  getEscaladoresEntrenador(id)   { return this.request(`/entrenadores/${id}/escaladores`); }

  // Sesiones
  getSesiones(grupoId)          { return this.request(`/sesiones?grupoId=${grupoId}`); }
  getSesion(id)                 { return this.request(`/sesiones/${id}`); }
  generarSesiones(grupoId)      { return this.request('/sesiones/generar', { method: 'POST', body: JSON.stringify({ grupoId }) }); }
  updateNotasSesion(id, notas)  { return this.request(`/sesiones/${id}/notas`, { method: 'PUT', body: JSON.stringify({ notas }) }); }

  // Asistencia
  registrarAsistencia(sesionId, registros)          { return this.request('/asistencia', { method: 'POST', body: JSON.stringify({ sesionId, registros }) }); }
  getAsistenciaSesion(sesionId)                     { return this.request(`/asistencia/sesion/${sesionId}`); }
  getAsistenciaEscalador(escaladorId, grupoId)      { const q = grupoId ? `?grupoId=${grupoId}` : ''; return this.request(`/asistencia/escalador/${escaladorId}${q}`); }
  getResumenAsistencia(grupoId)                     { return this.request(`/asistencia/grupo/${grupoId}/resumen`); }

  // Contenido
  getContenido(params)              { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/contenido${q}`); }
  crearContenido(data)              { return this.request('/contenido', { method: 'POST', body: JSON.stringify(data) }); }
  updateProgreso(contenidoId, pct)  { return this.request(`/contenido/${contenidoId}/progreso`, { method: 'PUT', body: JSON.stringify({ progresoPct: pct }) }); }
  getStatsContenido(cicloId)        { return this.request(`/contenido/stats/${cicloId}`); }

  // Evaluaciones
  getEvaluaciones(params)           { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/evaluaciones${q}`); }
  crearEvaluacion(data)             { return this.request('/evaluaciones', { method: 'POST', body: JSON.stringify(data) }); }
  getEvaluacion(id)                 { return this.request(`/evaluaciones/${id}`); }
  updateEvaluacion(id, data)        { return this.request(`/evaluaciones/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

  // Inscripciones
  getInscripciones(params)          { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/inscripciones${q}`); }
  crearInscripcion(data)            { return this.request('/inscripciones', { method: 'POST', body: JSON.stringify(data) }); }
  getInscripcion(id)                { return this.request(`/inscripciones/${id}`); }
  updateInscripcion(id, data)       { return this.request(`/inscripciones/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }

  // Pagos
  getPagos(params)                  { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/pagos${q}`); }
  getPago(id)                       { return this.request(`/pagos/${id}`); }
  getResumenPagos()                 { return this.request('/pagos/resumen'); }
  crearPago(data)                   { return this.request('/pagos', { method: 'POST', body: JSON.stringify(data) }); }
  registrarPago(data)               { return this.request('/pagos', { method: 'POST', body: JSON.stringify(data) }); }
  updatePago(id, data)              { return this.request(`/pagos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  getLinkPago(id)                   { return this.request(`/pagos/${id}/link-pago`); }
  cambiarEstadoInscripcion(id, est) { return this.request(`/inscripciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: est }) }); }

  // RRHH
  getRRHH(params)                   { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/rrhh${q}`); }

  // Dashboard
  getDashboard()                    { return this.request('/dashboard'); }

  // Contabilidad
  getContabilidad(params)           { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/contabilidad${q}`); }
  crearEntradaPyG(data)             { return this.request('/contabilidad', { method: 'POST', body: JSON.stringify(data) }); }
}

export default new ApiService();
