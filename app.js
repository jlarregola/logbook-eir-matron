// ---------------------------------------------------------------------------
// Logbook EIR Matrona — Sesión 1: estructura, formulario, localStorage, dashboard BOE
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'eir_logbook_records';
const RESIDENCY_START_KEY = 'eir_residency_start';

const BOE_MINIMUMS = {
  entrevistas_historia_og: 100,
  historias_clinicas: 100,
  controles_prenatales: 100,
  gestantes_alto_riesgo: 40,
  educacion_maternal: 2,
  parturientas_asistidas: 100,
  partos_eutocicos: 80,
  partos_alto_riesgo: 40,
  partos_instrumental_cesarea: 20,
  puerperaas: 100,
  recien_nacidos: 100
};

// Cómo se cuenta cada ítem del BOE a partir del tipo de registro guardado
const BOE_ITEMS = [
  { key: 'entrevistas_historia_og', label: 'Entrevistas y confección de historia O-G', match: r => r.tipo === 'historia_og' },
  { key: 'historias_clinicas', label: 'Historias clínicas reproductivas', match: r => r.tipo === 'historia_clinica' },
  { key: 'controles_prenatales', label: 'Reconocimientos prenatales', match: r => r.tipo === 'control_prenatal' || r.tipo === 'gestante_alto_riesgo' },
  { key: 'gestantes_alto_riesgo', label: 'Gestantes de alto riesgo vigiladas', match: r => r.tipo === 'gestante_alto_riesgo' },
  { key: 'educacion_maternal', label: 'Grupos de educación maternal', match: r => r.tipo === 'educacion_maternal' },
  { key: 'parturientas_asistidas', label: 'Parturientas asistidas', match: r => ['parto_eutocico', 'parto_alto_riesgo', 'parto_instrumental'].includes(r.tipo) },
  { key: 'partos_eutocicos', label: 'Partos eutócicos asistidos', match: r => r.tipo === 'parto_eutocico' },
  { key: 'partos_alto_riesgo', label: 'Partos con factores de alto riesgo', match: r => r.tipo === 'parto_alto_riesgo' },
  { key: 'partos_instrumental_cesarea', label: 'Partos instrumentales o cesáreas', match: r => r.tipo === 'parto_instrumental' },
  { key: 'puerperaas', label: 'Supervisión de puérperas', match: r => r.tipo === 'puerpera' },
  { key: 'recien_nacidos', label: 'Supervisión de recién nacidos sanos', match: r => r.tipo === 'recien_nacido' }
];

const TYPE_LABELS = {
  parto_eutocico: 'Parto eutócico',
  parto_alto_riesgo: 'Parto de alto riesgo',
  parto_instrumental: 'Parto instrumental / cesárea',
  control_prenatal: 'Control prenatal',
  gestante_alto_riesgo: 'Gestante de alto riesgo',
  puerpera: 'Puérpera',
  recien_nacido: 'Recién nacido',
  educacion_maternal: 'Educación maternal',
  historia_clinica: 'Historia clínica reproductiva',
  historia_og: 'Entrevista historia O-G',
  actividad_cualitativa: 'Actividad cualitativa'
};

// ---------------------------------------------------------------------------
// Almacenamiento
// ---------------------------------------------------------------------------

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateId() {
  return 'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function getResidencyStart() {
  return localStorage.getItem(RESIDENCY_START_KEY) || '';
}

function setResidencyStart(dateStr) {
  localStorage.setItem(RESIDENCY_START_KEY, dateStr);
}

function recordYear(record) {
  const start = getResidencyStart();
  if (!start || !record.fecha_hora) return null;
  const startDate = new Date(start);
  const recordDate = new Date(record.fecha_hora);
  if (isNaN(startDate.getTime()) || isNaN(recordDate.getTime())) return null;
  const months = (recordDate.getFullYear() - startDate.getFullYear()) * 12 + (recordDate.getMonth() - startDate.getMonth());
  if (months < 0) return null;
  return months < 12 ? 1 : 2;
}

// ---------------------------------------------------------------------------
// Notificaciones tipo "toast" (no bloquean la pantalla — mejor para móvil que alert())
// ---------------------------------------------------------------------------

let toastTimer = null;

function showToast(message, type) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = 'toast show' + (type === 'warning' ? ' warning' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ---------------------------------------------------------------------------
// Navegación entre pantallas
// ---------------------------------------------------------------------------

const screens = {
  registro: document.getElementById('screen-registro'),
  dashboard: document.getElementById('screen-dashboard'),
  logbook: document.getElementById('screen-logbook'),
  exportar: document.getElementById('screen-exportar')
};

const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    navButtons.forEach(b => b.classList.toggle('active', b === btn));
    Object.keys(screens).forEach(name => {
      screens[name].classList.toggle('hidden', name !== target);
    });
    if (target === 'dashboard') renderDashboard();
    if (target === 'logbook') renderLogbook();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// ---------------------------------------------------------------------------
// Formulario de registro
// ---------------------------------------------------------------------------

const formInicio = document.getElementById('registro-inicio');
const form = document.getElementById('form-registro');
const btnNuevoRegistro = document.getElementById('btn-nuevo-registro');
const btnCancelar = document.getElementById('btn-cancelar');
const tipoSelect = document.getElementById('tipo');
const reviewBanner = document.getElementById('review-banner');

const dynamicFieldsets = form.querySelectorAll('fieldset[data-types]');

let editingRecordId = null;

function clearDetectedHighlights() {
  form.querySelectorAll('.field-detected').forEach(el => el.classList.remove('field-detected'));
}

function openManualForm() {
  editingRecordId = null;
  form.reset();
  updateFieldVisibility('');
  clearDetectedHighlights();
  reviewBanner.classList.add('hidden');
  formInicio.classList.add('hidden');
  form.classList.remove('hidden');
  setDefaultDateTime();
}

function closeForm() {
  editingRecordId = null;
  form.reset();
  updateFieldVisibility('');
  clearDetectedHighlights();
  reviewBanner.classList.add('hidden');
  form.classList.add('hidden');
  formInicio.classList.remove('hidden');
}

btnNuevoRegistro.addEventListener('click', openManualForm);
btnCancelar.addEventListener('click', closeForm);

// Mostrar/ocultar campo de texto "Otro centro" en historia O-G
const centroHogSelect = document.getElementById('centro_hog');
const centroHogOtro = document.getElementById('centro_hog_otro');
centroHogSelect.addEventListener('change', () => {
  const esOtro = centroHogSelect.value === 'Otro';
  centroHogOtro.classList.toggle('hidden', !esOtro);
  if (!esOtro) centroHogOtro.value = '';
});

tipoSelect.addEventListener('change', () => {
  const tipo = tipoSelect.value;
  updateFieldVisibility(tipo);
  // Auto-sugerir número de orden para historia O-G
  if (tipo === 'historia_og' && !editingRecordId) {
    const numField = document.getElementById('num_secuencial_hog');
    if (numField && !numField.value) {
      numField.value = getRecords().filter(r => r.tipo === 'historia_og').length + 1;
    }
  }
});

function setDefaultDateTime() {
  const field = document.getElementById('fecha_hora');
  if (!field.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    field.value = now.toISOString().slice(0, 16);
  }
}

function updateFieldVisibility(selectedType) {
  dynamicFieldsets.forEach(fieldset => {
    const types = fieldset.dataset.types.split(',');
    const shouldShow = selectedType !== '' && types.includes(selectedType);
    fieldset.classList.toggle('hidden', !shouldShow);
    if (!shouldShow) {
      fieldset.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.type === 'checkbox') field.checked = false;
        else field.value = '';
      });
    }
  });
}

form.addEventListener('submit', event => {
  event.preventDefault();

  if (!tipoSelect.value) {
    showToast('Selecciona un tipo de procedimiento.', 'warning');
    return;
  }

  const formData = new FormData(form);
  const record = {
    id: editingRecordId || generateId(),
    created_at: editingRecordId ? recordCreatedAt(editingRecordId) : new Date().toISOString()
  };

  for (const [name, value] of formData.entries()) {
    record[name] = value;
  }
  record.caso_portfolio = form.elements['caso_portfolio'].checked;

  const records = getRecords();
  if (editingRecordId) {
    const idx = records.findIndex(r => r.id === editingRecordId);
    if (idx !== -1) records[idx] = record;
  } else {
    records.push(record);
  }
  saveRecords(records);

  const wasEditing = !!editingRecordId;
  closeForm();

  showToast(wasEditing ? 'Registro actualizado correctamente ✓' : 'Registro guardado correctamente ✓');
  renderDashboard();
  renderLogbook();
});

// ---------------------------------------------------------------------------
// Entrada por voz (Web Speech API) + parsing automático
// ---------------------------------------------------------------------------

const btnDictar = document.getElementById('btn-dictar');
const voiceStatus = document.getElementById('voice-status');

const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognitionAPI) {
  recognition = new SpeechRecognitionAPI();
  recognition.lang = 'es-ES';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
}

function detectGrade(text) {
  if (/cuarto grado|grado\s*(4|iv)\b/.test(text)) return 'IV';
  if (/tercer grado|grado\s*(3|iii)\b/.test(text)) return 'III';
  if (/segundo grado|grado\s*(2|ii)\b/.test(text)) return 'II';
  if (/primer grado|grado\s*(1|i)\b/.test(text)) return 'I';
  return null;
}

// Analiza el texto transcrito y devuelve un objeto { nombre_campo: valor } con
// todo lo que se ha podido reconocer. Lo que no se detecta queda fuera y el
// usuario lo rellena a mano al revisar el formulario.
function parseTranscript(text) {
  const t = text.toLowerCase();
  const result = {};

  // Tipo de procedimiento (de más a menos específico)
  if (/instrumental|f[oó]rceps|esp[aá]tulas|ventosa|ces[aá]rea/.test(t)) {
    result.tipo = 'parto_instrumental';
  } else if (/parto.*alto riesgo|alto riesgo.*parto/.test(t)) {
    result.tipo = 'parto_alto_riesgo';
  } else if (/parto eut[oó]cico|parto normal|parto vaginal/.test(t)) {
    result.tipo = 'parto_eutocico';
  } else if (/gestante.*alto riesgo|alto riesgo.*gestante/.test(t)) {
    result.tipo = 'gestante_alto_riesgo';
  } else if (/control prenatal|reconocimiento prenatal|visita prenatal/.test(t)) {
    result.tipo = 'control_prenatal';
  } else if (/pu[eé]rpera|puerperio/.test(t)) {
    result.tipo = 'puerpera';
  } else if (/reci[eé]n nacido|neonato/.test(t)) {
    result.tipo = 'recien_nacido';
  } else if (/educaci[oó]n maternal/.test(t)) {
    result.tipo = 'educacion_maternal';
  } else if (/historia cl[ií]nica/.test(t)) {
    result.tipo = 'historia_clinica';
  } else if (/actividad/.test(t)) {
    result.tipo = 'actividad_cualitativa';
  }

  // Semanas de gestación — se rellena tanto el campo de parto como el de
  // control prenatal; el formulario solo guarda el que quede visible según el tipo
  const semanas = t.match(/(\d{1,2})\s*semanas/);
  if (semanas) {
    result.semanas_gestacion_parto = semanas[1];
    result.semanas_gestacion_prenatal = semanas[1];
  }

  // Paridad G/P/A — ej. "g2p1a0" o "g 2 p 1 a 0"
  const gpa = t.match(/g\s*(\d+)\s*p\s*(\d+)\s*a\s*(\d+)/);
  if (gpa) {
    result.gestaciones = gpa[1];
    result.partos_previos = gpa[2];
    result.abortos = gpa[3];
  }

  // Presentación fetal
  if (/cef[aá]lica/.test(t)) result.presentacion_fetal = 'Cefálica';
  else if (/pod[aá]lica/.test(t)) result.presentacion_fetal = 'Podálica';
  else if (/transversa/.test(t)) result.presentacion_fetal = 'Transversa';

  // Inicio del parto
  if (/ces[aá]rea programada/.test(t)) result.inicio_parto = 'Cesárea programada';
  else if (/inducido|inducci[oó]n/.test(t)) result.inicio_parto = 'Inducido';
  else if (/inicio espont[aá]neo|parto espont[aá]neo|espont[aá]neo/.test(t)) result.inicio_parto = 'Espontáneo';

  // Analgesia epidural
  if (/sin epidural|epidural no/.test(t)) result.analgesia_epidural = 'No';
  else if (/epidural/.test(t)) result.analgesia_epidural = 'Sí';

  // Rotura de membranas
  if (/rotura espont[aá]nea/.test(t)) result.rotura_membranas = 'Espontánea';
  else if (/rotura artificial|amniorrexis artificial/.test(t)) result.rotura_membranas = 'Artificial';
  else if (/membranas [ií]ntegras/.test(t)) result.rotura_membranas = 'Íntegras';

  // Episiotomía
  if (/sin episiotom[ií]a|episiotom[ií]a no/.test(t)) result.episiotomia = 'No';
  else if (/episiotom[ií]a/.test(t)) result.episiotomia = 'Sí';

  // Desgarro perineal
  if (/sin desgarro/.test(t)) result.desgarro_perineal = 'Ninguno';
  else if (/desgarro/.test(t)) {
    const grade = detectGrade(t);
    if (grade) result.desgarro_perineal = grade;
  }

  // Alumbramiento
  if (/alumbramiento espont[aá]neo/.test(t)) result.alumbramiento = 'Espontáneo';
  else if (/alumbramiento dirigido/.test(t)) result.alumbramiento = 'Dirigido';
  else if (/alumbramiento manual/.test(t)) result.alumbramiento = 'Manual';

  // Pérdida hemática (ml)
  const perdida = t.match(/(\d{2,4})\s*(?:ml|mililitros)/);
  if (perdida) result.perdida_hematica_ml = perdida[1];

  // Apgar 1' y 5' — ej. "apgar 9 10", "apgar 9 y 10", "apgar 9-10"
  const apgar = t.match(/apgar\D{0,6}(\d{1,2})\D{1,6}(\d{1,2})/);
  if (apgar) {
    result.apgar_1min = apgar[1];
    result.apgar_5min = apgar[2];
  }

  // Peso (gramos) — válido tanto para RN tras parto como para registro de RN
  const peso = t.match(/(\d{3,4})\s*gramos/);
  if (peso) {
    result.peso_rn_gramos = peso[1];
    result.peso_gramos = peso[1];
  }

  // Contacto piel con piel
  if (/sin (contacto )?piel con piel|piel con piel no/.test(t)) result.contacto_piel_con_piel = 'No';
  else if (/piel con piel/.test(t)) result.contacto_piel_con_piel = 'Sí';

  // Tipo de parto instrumental / cesárea
  if (/f[oó]rceps/.test(t)) result.tipo_instrumental = 'Fórceps';
  else if (/esp[aá]tulas/.test(t)) result.tipo_instrumental = 'Espátulas';
  else if (/ventosa/.test(t)) result.tipo_instrumental = 'Ventosa';
  else if (/ces[aá]rea urgente/.test(t)) result.tipo_instrumental = 'Cesárea urgente';
  else if (/ces[aá]rea electiva/.test(t)) result.tipo_instrumental = 'Cesárea electiva';

  // Rol del residente
  if (/instrumentista/.test(t)) result.rol_residente = 'Instrumentista';
  else if (/ayudante/.test(t)) result.rol_residente = 'Ayudante';
  else if (/observador/.test(t)) result.rol_residente = 'Observador';

  // Nivel de autonomía
  const nivel = t.match(/nivel\s*(\d)/);
  if (nivel && ['1', '2', '3'].includes(nivel[1])) result.nivel_autonomia = nivel[1];

  // Supervisor — capturamos el nombre que sigue a "supervisor/a"
  const supervisorMatch = text.match(/supervisor[a]?\s+([a-záéíóúñA-ZÁÉÍÓÚÑ\s]+?)(?:[,.]|$)/i);
  if (supervisorMatch) {
    result.supervisor_nombre = supervisorMatch[1]
      .trim()
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Categoría del supervisor
  if (/matrona/.test(t)) result.supervisor_categoria = 'Matrona';
  else if (/tutor(a)? principal/.test(t)) result.supervisor_categoria = 'Tutor principal';
  else if (/adjunto/.test(t)) result.supervisor_categoria = 'Adjunto';

  // Rotación / unidad
  if (/paritorio/.test(t)) result.rotacion = 'Paritorio';
  else if (/urgencias/.test(t)) result.rotacion = 'Urgencias OG';
  else if (/pu[eé]rperas/.test(t)) result.rotacion = 'Puérperas';
  else if (/neonatolog[ií]a/.test(t)) result.rotacion = 'Neonatología';
  else if (/riesgo obst[eé]trico/.test(t)) result.rotacion = 'Riesgo Obstétrico';
  else if (/ginecolog[ií]a/.test(t)) result.rotacion = 'Ginecología';
  else if (/atenci[oó]n primaria/.test(t)) result.rotacion = 'Atención Primaria';

  // Guardamos el texto dictado completo como punto de partida de la reflexión
  result.reflexion = text;

  return result;
}

function applyParsedDataToForm(parsed) {
  if (parsed.tipo) {
    tipoSelect.value = parsed.tipo;
    updateFieldVisibility(parsed.tipo);
    tipoSelect.classList.add('field-detected');
  }
  Object.keys(parsed).forEach(key => {
    if (key === 'tipo') return;
    const field = form.elements[key];
    if (!field) return;
    // No rellenamos campos que pertenecen a un bloque oculto para el tipo
    // detectado: si no, su valor viajaría "de polizón" en el FormData al guardar
    const fieldset = field.closest ? field.closest('fieldset') : null;
    if (fieldset && fieldset.classList.contains('hidden')) return;
    field.value = parsed[key];
    field.classList.add('field-detected');
  });
}

if (recognition) {
  btnDictar.addEventListener('click', () => {
    btnDictar.classList.add('listening');
    voiceStatus.textContent = '🎙️ Escuchando... habla ahora';
    try {
      recognition.start();
    } catch (e) {
      // recognition ya estaba activo; lo reiniciamos
      recognition.stop();
    }
  });

  recognition.addEventListener('result', event => {
    const transcript = event.results[0][0].transcript;
    voiceStatus.textContent = `Reconocido: "${transcript}"`;

    const parsed = parseTranscript(transcript);

    editingRecordId = null;
    form.reset();
    updateFieldVisibility('');
    clearDetectedHighlights();
    applyParsedDataToForm(parsed);
    setDefaultDateTime();

    reviewBanner.classList.remove('hidden');
    formInicio.classList.add('hidden');
    form.classList.remove('hidden');
    window.scrollTo(0, 0);
  });

  recognition.addEventListener('error', () => {
    voiceStatus.textContent = 'No se ha podido reconocer el audio. Inténtalo de nuevo o usa el formulario manual.';
    showToast('No se ha podido reconocer el audio.', 'warning');
  });

  recognition.addEventListener('end', () => {
    btnDictar.classList.remove('listening');
  });
} else {
  btnDictar.addEventListener('click', () => {
    showToast('El reconocimiento de voz no está disponible en este navegador. Prueba con Chrome o Safari, o usa el formulario manual.', 'warning');
  });
}

function recordCreatedAt(id) {
  const existing = getRecords().find(r => r.id === id);
  return existing ? existing.created_at : new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Dashboard BOE
// ---------------------------------------------------------------------------

const dashboardLista = document.getElementById('dashboard-lista');
const dashboardFiltroAnio = document.getElementById('dashboard-filtro-anio');

dashboardFiltroAnio.addEventListener('change', renderDashboard);

// Calcula cuántas semanas han pasado desde el inicio de la residencia (null si no está configurado)
function weeksSinceResidencyStart() {
  const start = getResidencyStart();
  if (!start) return null;
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;
  const diffDays = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 ? diffDays / 7 : null;
}

// Proyecta, al ritmo medio actual (registros/semana desde el inicio de la residencia),
// la fecha estimada en la que se alcanzará el mínimo de un ítem del BOE
function projectionMessage(count, min, weeks) {
  if (count >= min) return { text: '✓ Mínimo alcanzado', complete: true };
  if (!weeks || weeks < 2 || count === 0) {
    return { text: 'Ritmo: aún no hay datos suficientes para proyectar una fecha.', complete: false };
  }
  const ratePerWeek = count / weeks;
  if (ratePerWeek <= 0) {
    return { text: 'Ritmo: aún no hay datos suficientes para proyectar una fecha.', complete: false };
  }
  const weeksNeeded = (min - count) / ratePerWeek;
  const estimated = new Date();
  estimated.setDate(estimated.getDate() + Math.ceil(weeksNeeded * 7));
  const dateLabel = estimated.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  return { text: `Ritmo actual: ~${ratePerWeek.toFixed(1)} / semana · lo completarías hacia el ${dateLabel}`, complete: false };
}

function renderDashboard() {
  const allRecords = getRecords();
  const filterValue = dashboardFiltroAnio.value;
  const weeksElapsed = weeksSinceResidencyStart();

  const records = filterValue === 'total'
    ? allRecords
    : allRecords.filter(r => recordYear(r) === parseInt(filterValue, 10));

  dashboardLista.innerHTML = '';

  // Configuración de la fecha de inicio: necesaria para el filtro Año 1/Año 2
  // y para calcular la proyección de ritmo de cada ítem
  const configCard = document.createElement('div');
  configCard.className = 'progress-item';
  configCard.innerHTML = `
    <div class="label-row"><span class="name">📅 Fecha de inicio de la residencia</span></div>
    <p class="projection" style="margin-top:0;">Se usa para separar Año 1 / Año 2 y para calcular la proyección de ritmo de cada ítem.</p>
    <input type="date" id="residency-start-input" value="${getResidencyStart()}">
  `;
  dashboardLista.appendChild(configCard);
  configCard.querySelector('#residency-start-input').addEventListener('change', e => {
    setResidencyStart(e.target.value);
    showToast('Fecha de inicio guardada ✓');
    renderDashboard();
  });

  BOE_ITEMS.forEach(item => {
    const count = records.filter(item.match).length;
    const min = BOE_MINIMUMS[item.key];
    const percent = Math.min(100, Math.round((count / min) * 100));

    // La proyección de ritmo siempre se calcula sobre el total acumulado de la
    // residencia (no sobre el filtro de año), ya que el mínimo del BOE es global
    const totalCount = allRecords.filter(item.match).length;
    const projection = projectionMessage(totalCount, min, weeksElapsed);

    const el = document.createElement('div');
    el.className = 'progress-item';
    el.innerHTML = `
      <div class="label-row">
        <span class="name">${item.label}</span>
        <span class="count">${count} / ${min}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill ${percent >= 100 ? 'complete' : ''}" style="width: ${percent}%;"></div>
      </div>
      <p class="projection ${projection.complete ? 'complete-text' : ''}">${projection.text}</p>
    `;
    dashboardLista.appendChild(el);
  });
}

// ---------------------------------------------------------------------------
// Logbook (listado, edición, eliminación)
// ---------------------------------------------------------------------------

const logbookLista = document.getElementById('logbook-lista');
const filtroTipo = document.getElementById('filtro-tipo');
const filtroRotacion = document.getElementById('filtro-rotacion');
const filtroMes = document.getElementById('filtro-mes');
const filtroNivel = document.getElementById('filtro-nivel');
const filtroPortfolio = document.getElementById('filtro-portfolio');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

const ROTATIONS = ['Paritorio', 'Urgencias OG', 'Puérperas', 'Neonatología', 'Riesgo Obstétrico', 'Ginecología', 'Atención Primaria', 'Otro'];

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function populateLogbookFilters() {
  if (filtroTipo.options.length === 1) {
    Object.keys(TYPE_LABELS).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = TYPE_LABELS[key];
      filtroTipo.appendChild(opt);
    });
  }

  if (filtroRotacion.options.length === 1) {
    ROTATIONS.forEach(rot => {
      const opt = document.createElement('option');
      opt.value = rot;
      opt.textContent = rot;
      filtroRotacion.appendChild(opt);
    });
  }

  const months = new Set();
  getRecords().forEach(r => {
    if (r.fecha_hora) months.add(r.fecha_hora.slice(0, 7));
  });
  const sortedMonths = Array.from(months).sort().reverse();
  const currentValue = filtroMes.value;
  filtroMes.innerHTML = '<option value="">Todos los meses</option>';
  sortedMonths.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = formatMonthLabel(m);
    filtroMes.appendChild(opt);
  });
  filtroMes.value = sortedMonths.includes(currentValue) ? currentValue : '';
}

[filtroTipo, filtroRotacion, filtroMes, filtroNivel, filtroPortfolio].forEach(input => {
  input.addEventListener('change', renderLogbook);
});

btnLimpiarFiltros.addEventListener('click', () => {
  filtroTipo.value = '';
  filtroRotacion.value = '';
  filtroMes.value = '';
  filtroNivel.value = '';
  filtroPortfolio.checked = false;
  renderLogbook();
});

function renderLogbook() {
  populateLogbookFilters();

  let records = getRecords().slice().sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));

  if (filtroTipo.value) records = records.filter(r => r.tipo === filtroTipo.value);
  if (filtroRotacion.value) records = records.filter(r => r.rotacion === filtroRotacion.value);
  if (filtroMes.value) records = records.filter(r => r.fecha_hora && r.fecha_hora.slice(0, 7) === filtroMes.value);
  if (filtroNivel.value) records = records.filter(r => r.nivel_autonomia === filtroNivel.value);
  if (filtroPortfolio.checked) records = records.filter(r => r.caso_portfolio);

  logbookLista.innerHTML = '';

  if (records.length === 0) {
    logbookLista.innerHTML = '<p class="empty-state">No hay registros que coincidan con los filtros seleccionados.</p>';
    return;
  }

  records.forEach(record => {
    const card = document.createElement('div');
    card.className = 'record-card';
    const fecha = record.fecha_hora ? new Date(record.fecha_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '—';
    const badge = record.caso_portfolio ? '<span class="badge-portfolio">Portfolio</span>' : '';
    let meta2;
    if (record.tipo === 'historia_og') {
      const centro = record.centro_hog === 'Otro' ? (record.centro_hog_otro || 'Otro') : (record.centro_hog || '—');
      meta2 = `Nº ${record.num_secuencial_hog || '—'} · ${centro} · Matrona: ${record.matrona_responsable || '—'}`;
    } else {
      meta2 = `Hª ${record.num_historia || '—'} · ${record.supervisor_nombre || 'Sin supervisor'}`;
    }
    card.innerHTML = `
      <div class="record-title">${TYPE_LABELS[record.tipo] || record.tipo}${badge}</div>
      <div class="record-meta">${fecha} · ${record.rotacion || 'Sin rotación'} · Nivel ${record.nivel_autonomia || '—'}</div>
      <div class="record-meta">${meta2}</div>
      <div class="record-actions">
        <button class="btn-edit" data-id="${record.id}">Editar</button>
        <button class="btn-delete" data-id="${record.id}">Eliminar</button>
      </div>
    `;
    logbookLista.appendChild(card);
  });

  logbookLista.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => editRecord(btn.dataset.id));
  });
  logbookLista.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteRecord(btn.dataset.id));
  });
}

function editRecord(id) {
  const record = getRecords().find(r => r.id === id);
  if (!record) return;

  editingRecordId = id;
  form.reset();
  clearDetectedHighlights();
  reviewBanner.classList.add('hidden');
  tipoSelect.value = record.tipo || '';
  updateFieldVisibility(record.tipo || '');

  Object.keys(record).forEach(key => {
    const field = form.elements[key];
    if (!field) return;
    if (field.type === 'checkbox') field.checked = !!record[key];
    else field.value = record[key];
  });

  // Restaurar visibilidad del campo "Otro centro" si aplica
  if (record.tipo === 'historia_og') {
    centroHogOtro.classList.toggle('hidden', centroHogSelect.value !== 'Otro');
  }

  formInicio.classList.add('hidden');
  form.classList.remove('hidden');

  // Navegar a la pantalla de registro
  document.querySelector('.nav-btn[data-screen="registro"]').click();
  window.scrollTo(0, 0);
}

function deleteRecord(id) {
  if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
  const records = getRecords().filter(r => r.id !== id);
  saveRecords(records);
  renderLogbook();
  renderDashboard();
  showToast('Registro eliminado.');
}

// ---------------------------------------------------------------------------
// Exportación: CSV (JS puro con Blob) y PDF (jsPDF vía CDN)
// ---------------------------------------------------------------------------

const CSV_COLUMNS = [
  ['tipo', 'Tipo de procedimiento'],
  ['fecha_hora', 'Fecha y hora'],
  ['num_historia', 'Nº historia clínica'],
  ['rotacion', 'Rotación/Unidad'],
  ['turno', 'Turno'],
  ['semanas_gestacion_parto', 'Semanas de gestación (parto)'],
  ['semanas_gestacion_prenatal', 'Semanas de gestación (control prenatal)'],
  ['gestaciones', 'Gestaciones (G)'],
  ['partos_previos', 'Partos previos (P)'],
  ['abortos', 'Abortos (A)'],
  ['presentacion_fetal', 'Presentación fetal'],
  ['inicio_parto', 'Inicio del parto'],
  ['analgesia_epidural', 'Analgesia epidural'],
  ['rotura_membranas', 'Rotura de membranas'],
  ['factor_riesgo', 'Factor de riesgo'],
  ['episiotomia', 'Episiotomía'],
  ['desgarro_perineal', 'Desgarro perineal'],
  ['alumbramiento', 'Alumbramiento'],
  ['perdida_hematica_ml', 'Pérdida hemática (ml)'],
  ['apgar_1min', "Apgar 1'"],
  ['apgar_5min', "Apgar 5'"],
  ['peso_rn_gramos', 'Peso RN (g)'],
  ['contacto_piel_con_piel', 'Contacto piel con piel'],
  ['tipo_instrumental', 'Tipo instrumental/cesárea'],
  ['indicacion', 'Indicación'],
  ['rol_residente', 'Rol del residente'],
  ['tipo_anestesia', 'Tipo de anestesia'],
  ['tipo_control', 'Tipo de control'],
  ['patologia', 'Patología'],
  ['horas_postparto', 'Horas postparto'],
  ['tipo_lactancia', 'Tipo de lactancia (puérpera)'],
  ['horas_vida', 'Horas de vida (RN)'],
  ['peso_gramos', 'Peso RN (g) [reg. RN]'],
  ['tipo_lactancia_rn', 'Tipo de lactancia (RN)'],
  ['exploracion_normal', 'Exploración normal'],
  ['observaciones_rn', 'Observaciones RN'],
  ['grupo', 'Grupo (educación maternal)'],
  ['num_participantes', 'Nº participantes'],
  ['tema', 'Tema (educación maternal)'],
  ['num_secuencial_hog', 'Nº de orden (historia O-G)'],
  ['centro_hog', 'Centro (historia O-G)'],
  ['centro_hog_otro', 'Centro personalizado (historia O-G)'],
  ['matrona_responsable', 'Matrona responsable'],
  ['area_cualitativa', 'Área (cualitativa)'],
  ['descripcion_actividad', 'Descripción actividad'],
  ['nivel_autonomia', 'Nivel de autonomía'],
  ['supervisor_nombre', 'Supervisor'],
  ['supervisor_categoria', 'Categoría supervisor'],
  ['reflexion', 'Reflexión'],
  ['caso_portfolio', 'Caso para portfolio']
];

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (/[",;\t\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

function todayStamp() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportCSV() {
  const records = getRecords();
  if (records.length === 0) {
    alert('Todavía no hay registros para exportar.');
    return;
  }

  const header = CSV_COLUMNS.map(c => csvEscape(c[1])).join(',');
  const rows = records.map(record => CSV_COLUMNS.map(([key]) => {
    let value = record[key];
    if (key === 'tipo') value = TYPE_LABELS[value] || value;
    if (key === 'caso_portfolio') value = value ? 'Sí' : 'No';
    return csvEscape(value);
  }).join(','));

  // BOM UTF-8 para que Excel reconozca acentos correctamente
  const csvContent = '﻿' + [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `logbook_eir_${todayStamp()}.csv`);
}

function exportPDFResumenBOE() {
  if (!window.jspdf) {
    alert('La librería de PDF no está disponible sin conexión. Conéctate a internet la primera vez para que se descargue y quede en caché.');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const records = getRecords();

  doc.setFontSize(16);
  doc.setTextColor(179, 99, 63);
  doc.text('Resumen de progreso BOE', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(70, 58, 48);
  doc.text('Logbook EIR Matrona · Orden SAS/1349/2009 · HUTVC', 14, 25);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}  ·  Total de registros: ${records.length}`, 14, 30);

  let y = 44;
  doc.setFontSize(11);
  doc.setTextColor(70, 58, 48);
  doc.text('Ítem del BOE', 14, y);
  doc.text('Conseguido', 132, y);
  doc.text('Mínimo', 158, y);
  doc.text('% completado', 178, y);
  y += 3;
  doc.setDrawColor(226, 210, 191);
  doc.line(14, y, 196, y);
  y += 7;

  doc.setFontSize(10);
  BOE_ITEMS.forEach(item => {
    const count = records.filter(item.match).length;
    const min = BOE_MINIMUMS[item.key];
    const percent = Math.min(100, Math.round((count / min) * 100));

    if (y > 275) { doc.addPage(); y = 20; }

    const lines = doc.splitTextToSize(item.label, 112);
    doc.text(lines, 14, y);
    doc.text(String(count), 134, y);
    doc.text(String(min), 160, y);
    doc.text(`${percent}%${percent >= 100 ? ' ✓' : ''}`, 178, y);
    y += Math.max(lines.length * 5, 8);
  });

  doc.save(`resumen_BOE_${todayStamp()}.pdf`);
}

function exportPDFLogbookCompleto() {
  if (!window.jspdf) {
    alert('La librería de PDF no está disponible sin conexión. Conéctate a internet la primera vez para que se descargue y quede en caché.');
    return;
  }
  const records = getRecords();
  if (records.length === 0) {
    alert('Todavía no hay registros para exportar.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(179, 99, 63);
  doc.text('Logbook completo', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(70, 58, 48);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}  ·  Total: ${records.length} registros`, 14, 25);

  let y = 38;

  Object.keys(TYPE_LABELS).forEach(typeKey => {
    const group = records
      .filter(r => r.tipo === typeKey)
      .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
    if (group.length === 0) return;

    if (y > 265) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setTextColor(124, 140, 94);
    doc.text(`${TYPE_LABELS[typeKey]} (${group.length})`, 14, y);
    y += 5;
    doc.setDrawColor(226, 210, 191);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(70, 58, 48);
    group.forEach(record => {
      if (y > 280) { doc.addPage(); y = 20; }
      const fecha = record.fecha_hora
        ? new Date(record.fecha_hora).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
        : '—';
      const linea1 = `${fecha} · Hª ${record.num_historia || '—'} · ${record.rotacion || 'Sin rotación'} · Turno ${record.turno || '—'}`;
      const linea2 = `Nivel ${record.nivel_autonomia || '—'} · Supervisor: ${record.supervisor_nombre || '—'} (${record.supervisor_categoria || '—'})${record.caso_portfolio ? '  ·  ★ Portfolio' : ''}`;

      doc.text(linea1, 14, y);
      y += 4.5;
      doc.text(linea2, 14, y);
      y += 4.5;

      if (record.reflexion) {
        const refLines = doc.splitTextToSize(`Reflexión: ${record.reflexion}`, 180);
        if (y + refLines.length * 4.5 > 285) { doc.addPage(); y = 20; }
        doc.text(refLines, 14, y);
        y += refLines.length * 4.5;
      }
      y += 3;
    });
    y += 4;
  });

  doc.save(`logbook_completo_${todayStamp()}.pdf`);
}

const btnExportCSV = document.getElementById('btn-export-csv');
const btnExportPDFResumen = document.getElementById('btn-export-pdf-resumen');
const btnExportPDFCompleto = document.getElementById('btn-export-pdf-completo');

btnExportCSV.addEventListener('click', () => {
  try {
    exportCSV();
    showToast('CSV descargado correctamente ✓');
  } catch (e) {
    showToast('No se ha podido generar el CSV.', 'warning');
  }
});

btnExportPDFResumen.addEventListener('click', () => {
  try {
    exportPDFResumenBOE();
    showToast('PDF de resumen BOE descargado correctamente ✓');
  } catch (e) {
    showToast('No se ha podido generar el PDF.', 'warning');
  }
});

btnExportPDFCompleto.addEventListener('click', () => {
  try {
    exportPDFLogbookCompleto();
    showToast('PDF del logbook completo descargado correctamente ✓');
  } catch (e) {
    showToast('No se ha podido generar el PDF.', 'warning');
  }
});

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

renderDashboard();
renderLogbook();
