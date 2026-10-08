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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);
    let res;
    try {
      res = await fetch(`${API_URL}${endpoint}`, { ...options, headers, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Sesión vencida: solo si se mandó token (un login fallido también es 401 y debe mostrar su error).
      if (res.status === 401 && token) {
        this.setToken(null);
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
      // Siempre un `error` legible, también para errores de validación ({ errors: [...] }).
      const error = data.error || data.errors?.[0]?.msg || `Error ${res.status}`;
      throw { status: res.status, data, ...data, error };
    }
    return data;
  }

  // Auth
  login(email, password) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); }
  register(data)          { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  getMe()                 { return this.request('/auth/me'); }

  // Plan de entrenamiento
  getMyPlan() { return this.request('/plan/my'); }
  getPlanAI(escaladorId, trimestre = 'T1') { return this.request(`/plan/ai/${escaladorId}?trimestre=${encodeURIComponent(trimestre)}`); }
  // Registros de sesión y perfil de entrenamiento (BD)
  sincronizarRegistros(datos) { return this.request('/registros/sincronizar', { method: 'POST', body: JSON.stringify(datos) }); }
  guardarRegistro(trimestre, semana, sesionNum, datos) { return this.request(`/registros/${semana}/${sesionNum}`, { method: 'PUT', body: JSON.stringify({ trimestre, datos }) }); }
  guardarPerfilEntrenamiento(datos) { return this.request('/registros/perfil', { method: 'PUT', body: JSON.stringify({ datos }) }); }
  getRegistrosEscalador(escaladorId, trimestre = 'T1') { return this.request(`/registros/escalador/${escaladorId}?trimestre=${encodeURIComponent(trimestre)}`); }
  // Ajustes AI (revisión entrenador/admin)
  getAjustesAI(estado = 'pendiente') { return this.request(`/ajustes-ai?estado=${encodeURIComponent(estado)}`); }
  aprobarAjusteAI(id, nota) { return this.request(`/ajustes-ai/${id}/aprobar`, { method: 'POST', body: JSON.stringify({ nota }) }); }
  rechazarAjusteAI(id, nota) { return this.request(`/ajustes-ai/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ nota }) }); }
  getActualizacionSemanal() { return this.request('/ajustes-ai/semanal'); }
  aprobarAjustesAI(ids) { return this.request('/ajustes-ai/aprobar', { method: 'POST', body: JSON.stringify({ ids }) }); }
  getPlanContenido(nivel) { return this.request(`/plan/contenido?nivel=${encodeURIComponent(nivel)}`); }

  // Catálogos
  getProgramas(params)  { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/programas${q}`); }
  updatePrograma(id, data) { return this.request(`/catalogos/programas/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getNiveles()          { return this.request('/catalogos/niveles'); }
  getCiclos(params)     { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/catalogos/ciclos${q}`); }
  crearCiclo(data)      { return this.request('/catalogos/ciclos', { method: 'POST', body: JSON.stringify(data) }); }
  updateCiclo(id, data) { return this.request(`/catalogos/ciclos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteCiclo(id)       { return this.request(`/catalogos/ciclos/${id}`, { method: 'DELETE' }); }
  getMuros(todos)       { return this.request(`/catalogos/muros${todos ? '?todos=1' : ''}`); }
  crearMuro(data)       { return this.request('/catalogos/muros', { method: 'POST', body: JSON.stringify(data) }); }
  updateMuro(id, data)  { return this.request(`/catalogos/muros/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getAliadosSalud(todos) { return this.request(`/catalogos/aliados-salud${todos ? '?todos=1' : ''}`); }
  crearAliadoSalud(data) { return this.request('/catalogos/aliados-salud', { method: 'POST', body: JSON.stringify(data) }); }
  updateAliadoSalud(id, data) { return this.request(`/catalogos/aliados-salud/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  getTarifas()          { return this.request('/catalogos/tarifas'); }
  updateTarifa(modalidad, precioMensual) { return this.request(`/catalogos/tarifas/${modalidad}`, { method: 'PUT', body: JSON.stringify({ precioMensual }) }); }

  // Grupos
  getGrupos(params)             { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/grupos${q}`); }
  getGrupo(id)                  { return this.request(`/grupos/${id}`); }
  getGruposDisponibles()        { return this.request('/grupos/disponibles'); }
  crearGrupo(data)              { return this.request('/grupos', { method: 'POST', body: JSON.stringify(data) }); }
  updateGrupo(id, data)         { return this.request(`/grupos/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteGrupo(id)               { return this.request(`/grupos/${id}`, { method: 'DELETE' }); }
  cambiarEstadoGrupo(id, estado){ return this.request(`/grupos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); }

  // Escaladores
  getEscaladores(params) { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/escaladores${q}`); }
  getEscalador(id)       { return this.request(`/escaladores/${id}`); }
  updateEscalador(id, data) { return this.request(`/escaladores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteEscalador(id)    { return this.request(`/escaladores/${id}`, { method: 'DELETE' }); }
  asignarNivel(id, nivel) { return this.request(`/escaladores/${id}/nivel`, { method: 'PATCH', body: JSON.stringify({ nivel }) }); }
  cambiarEstadoEscalador(id, estado) { return this.request(`/escaladores/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) }); }

  // Entrenadores
  getEntrenadores()              { return this.request('/entrenadores'); }
  getEntrenador(id)              { return this.request(`/entrenadores/${id}`); }
  crearEntrenador(data)          { return this.request('/entrenadores', { method: 'POST', body: JSON.stringify(data) }); }
  updateEntrenador(id, data)     { return this.request(`/entrenadores/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
  deleteEntrenador(id)           { return this.request(`/entrenadores/${id}`, { method: 'DELETE' }); }

  // Sesiones
  getSesiones(grupoId)          { return this.request(`/sesiones?grupoId=${grupoId}`); }
  generarSesiones(grupoId)      { return this.request('/sesiones/generar', { method: 'POST', body: JSON.stringify({ grupoId }) }); }
  deleteSesiones(grupoId)       { return this.request(`/sesiones?grupoId=${grupoId}`, { method: 'DELETE' }); }

  // Asistencia
  registrarAsistencia(sesionId, registros)          { return this.request('/asistencia', { method: 'POST', body: JSON.stringify({ sesionId, registros }) }); }
  getAsistenciaSesion(sesionId)                     { return this.request(`/asistencia/sesion/${sesionId}`); }
  getAsistenciaEscalador(escaladorId, grupoId)      { const q = grupoId ? `?grupoId=${grupoId}` : ''; return this.request(`/asistencia/escalador/${escaladorId}${q}`); }
  getResumenAsistencia(grupoId)                     { return this.request(`/asistencia/grupo/${grupoId}/resumen`); }

  // Contenido
  getContenido(params)              { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/contenido${q}`); }
  crearContenido(data)              { return this.request('/contenido', { method: 'POST', body: JSON.stringify(data) }); }
  setContenidoVisible(id, visible)  { return this.request(`/contenido/${id}/visible`, { method: 'PATCH', body: JSON.stringify({ visible }) }); }
  deleteContenido(id)               { return this.request(`/contenido/${id}`, { method: 'DELETE' }); }
  updateProgreso(contenidoId, pct)  { return this.request(`/contenido/${contenidoId}/progreso`, { method: 'PUT', body: JSON.stringify({ progresoPct: pct }) }); }

  // Evaluaciones
  getEvaluaciones(params)           { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/evaluaciones${q}`); }
  getEvaluacion(id)                 { return this.request(`/evaluaciones/${id}`); }
  compararGrupo(grupoId)            { return this.request(`/evaluaciones/comparar/${grupoId}`); }
  getProgreso(escaladorId)          { return this.request(`/evaluaciones/progreso/${escaladorId}`); }
  registrarMiTest(sesionId, resultados) { return this.request('/evaluaciones/mi-test', { method: 'POST', body: JSON.stringify({ sesionId, resultados }) }); }

  // Remisiones a aliados de salud
  getRemisiones(params)             { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/remisiones${q}`); }
  crearRemision(data)               { return this.request('/remisiones', { method: 'POST', body: JSON.stringify(data) }); }
  updateRemision(id, data)          { return this.request(`/remisiones/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }

  // Inscripciones
  getInscripciones(params)          { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/inscripciones${q}`); }
  crearInscripcion(data)            { return this.request('/inscripciones', { method: 'POST', body: JSON.stringify(data) }); }
  deleteInscripcion(id)             { return this.request(`/inscripciones/${id}`, { method: 'DELETE' }); }
  autoInscribirse(grupoId)          { return this.request('/inscripciones/autoservicio', { method: 'POST', body: JSON.stringify({ grupoId }) }); }
  cambiarEstadoInscripcion(id, est) { return this.request(`/inscripciones/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: est }) }); }

  // Pagos (mensualidades)
  getPagosConfig()                  { return this.request('/pagos/config'); }
  getPagos(params)                  { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/pagos${q}`); }
  getResumenPagos(periodo)          { return this.request(`/pagos/resumen${periodo ? `?periodo=${periodo}` : ''}`); }
  registrarPago(data)               { return this.request('/pagos', { method: 'POST', body: JSON.stringify(data) }); }
  generarMensualidades(periodo)     { return this.request('/pagos/generar', { method: 'POST', body: JSON.stringify({ periodo }) }); }
  updatePago(id, data)              { return this.request(`/pagos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
  deletePago(id)                    { return this.request(`/pagos/${id}`, { method: 'DELETE' }); }
  generarLinkPago(id)               { return this.request(`/pagos/${id}/link-pago`, { method: 'POST' }); }

  // Dashboard
  getDashboard(params)              { const q = params ? '?' + new URLSearchParams(params) : ''; return this.request(`/dashboard${q}`); }
}

export default new ApiService();
