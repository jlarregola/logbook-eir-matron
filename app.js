// ---------------------------------------------------------------------------
// Logbook EIR Matrona — registro de las actividades oficiales de la residencia
// Modelo basado en las hojas oficiales: cada actividad registra exactamente
// las columnas de su hoja (Nº, Día/Fecha, NHC, Centro, Matrona responsable...).
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'eir_logbook_records';
const RESIDENCY_START_KEY = 'eir_residency_start';

// Centros disponibles en el desplegable "Centro"
const CENTROS = [
  'Hospital Verge de la Cinta (HUTVC)',
  'CAP La Senia',
  'CAP Temple',
  'CAP Baix Ebre',
  'CAP Ulldecona',
  'CAP Aldea',
  'CAP Deltebre',
  'CAP Roquetes',
  'CAP Amposta',
  "CAP L'Almetlla"
];

// Definición de cada campo posible. Varias actividades reutilizan los mismos.
// 'name' es la clave con la que se guarda el dato.
const FIELD_DEFS = {
  dia:               { name: 'dia',               label: 'Día',                       type: 'date',   required: true },
  fecha:             { name: 'fecha',             label: 'Fecha',                     type: 'date',   required: true },
  fecha_inicio:      { name: 'fecha_inicio',      label: 'Fecha inicio',              type: 'date',   required: true },
  fecha_fin:         { name: 'fecha_fin',         label: 'Fecha finalización',        type: 'date' },
  nhc:               { name: 'nhc',               label: 'NHC',                       type: 'text',   placeholder: 'Nº de historia clínica', inputmode: 'numeric' },
  centro:            { name: 'centro',            label: 'Centro',                    type: 'centro' },
  centro_realiza:    { name: 'centro',            label: 'Centro en el que se realiza', type: 'centro' },
  tipo_muestra:      { name: 'tipo_muestra',      label: 'Tipo muestra',              type: 'text',   placeholder: 'ej. citología, frotis, analítica...' },
  num_participantes: { name: 'num_participantes', label: 'Nº de participantes',       type: 'number' },
  num_sesiones:      { name: 'num_sesiones',      label: 'Nº Sesiones',               type: 'number' },
  responsable:       { name: 'responsable',       label: 'Matrona responsable',       type: 'text',   placeholder: 'Nombre' },
  responsable_due:   { name: 'responsable',       label: 'Matrona/DUE responsable',   type: 'text',   placeholder: 'Nombre' }
};

// Las 20 actividades oficiales. min = actividad mínima exigida (null = sin mínimo).
const ACTIVITIES = [
  // — Partos y cesáreas —
  { key: 'partos_normales',            grupo: 'Partos y cesáreas',                  label: 'Asistencia a partos normales',                                  min: 80,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'parturientas_bajo_riesgo',   grupo: 'Partos y cesáreas',                  label: 'Asistencia a parturientas de bajo riesgo',                      min: 100,  fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'parturientas_alto_riesgo',   grupo: 'Partos y cesáreas',                  label: 'Asistencia a parturientas de alto riesgo',                      min: 40,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'instrumentacion_cesareas',   grupo: 'Partos y cesáreas',                  label: 'Instrumentación de cesáreas',                                   min: 20,   fields: ['dia', 'nhc', 'centro', 'responsable_due'] },

  // — Embarazo, puerperio y domicilio —
  { key: 'reconocimientos_prenatales', grupo: 'Embarazo, puerperio y domicilio',    label: 'Reconocimientos prenatales',                                    min: 100,  fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'gestantes_riesgo',           grupo: 'Embarazo, puerperio y domicilio',    label: 'Vigilancia y asistencia a gestantes de riesgo',                 min: 40,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'supervision_puerperas',      grupo: 'Embarazo, puerperio y domicilio',    label: 'Supervisión y cuidado de puérperas',                            min: 100,  fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'visitas_domiciliarias',      grupo: 'Embarazo, puerperio y domicilio',    label: 'Visitas domiciliarias a puérperas y RN',                        min: null, fields: ['dia', 'nhc', 'centro', 'responsable'] },

  // — Recién nacido —
  { key: 'rn_sanos',                   grupo: 'Recién nacido',                      label: 'Supervisión, cuidados y reconocimiento de RN sanos',            min: 100,  fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'rn_especiales',              grupo: 'Recién nacido',                      label: 'Observación y cuidado de RN que necesitan cuidados especiales', min: 20,   fields: ['dia', 'nhc', 'centro', 'responsable_due'] },

  // — Consulta, asesoramiento y muestras —
  { key: 'historia_og',                grupo: 'Consulta, asesoramiento y muestras', label: 'Entrevista y confección de Historia Clínica Obstétrico-ginecológica', min: 100, fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'asesoramiento_contraceptivo',grupo: 'Consulta, asesoramiento y muestras', label: 'Asesoramiento y cuidado contraceptivo y sexual',                min: 60,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'asesoramiento_ginecologia',  grupo: 'Consulta, asesoramiento y muestras', label: 'Asesoramiento y cuidados en materia de ginecología',            min: 40,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'asesoramiento_its',          grupo: 'Consulta, asesoramiento y muestras', label: 'Asesoramiento y cuidados en materia de ITS',                    min: 30,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'asesoramiento_climaterio',   grupo: 'Consulta, asesoramiento y muestras', label: 'Asesoramiento y cuidados en materia de climaterio',             min: 20,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'asesoramiento_jovenes',      grupo: 'Consulta, asesoramiento y muestras', label: 'Asistencia y asesoramiento individual a jóvenes',               min: 25,   fields: ['dia', 'nhc', 'centro', 'responsable'] },
  { key: 'toma_muestras',              grupo: 'Consulta, asesoramiento y muestras', label: 'Toma de muestras',                                              min: 150,  fields: ['dia', 'nhc', 'tipo_muestra', 'responsable'] },

  // — Actividades grupales —
  { key: 'preparacion_nacimiento',     grupo: 'Actividades grupales',               label: 'Programa de Preparación al Nacimiento',                         min: 2,    fields: ['fecha_inicio', 'fecha_fin', 'num_sesiones', 'num_participantes', 'centro_realiza', 'responsable'] },
  { key: 'intervenciones_grupales',    grupo: 'Actividades grupales',               label: 'Intervenciones grupales en Educación Sexual y Reproductiva en la comunidad', min: 2, fields: ['fecha', 'num_participantes', 'centro_realiza', 'responsable'] },
  { key: 'grupos_menopausia',          grupo: 'Actividades grupales',               label: 'Participación en Grupos de Menopausia/Climaterio',              min: 2,    fields: ['fecha', 'num_participantes', 'centro_realiza', 'responsable'] }
];

function getActivity(key) {
  return ACTIVITIES.find(a => a.key === key) || null;
}

function activityLabel(key) {
  const a = getActivity(key);
  return a ? a.label : key;
}

// Fecha principal de un registro (para ordenar, filtrar por mes y separar años)
function primaryDate(record) {
  return record.dia || record.fecha || record.fecha_inicio || '';
}

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
  const fecha = primaryDate(record);
  if (!start || !fecha) return null;
  const startDate = new Date(start);
  const recordDate = new Date(fecha);
  if (isNaN(startDate.getTime()) || isNaN(recordDate.getTime())) return null;
  const months = (recordDate.getFullYear() - startDate.getFullYear()) * 12 + (recordDate.getMonth() - startDate.getMonth());
  if (months < 0) return null;
  return months < 12 ? 1 : 2;
}

// Asigna el "Nº" de cada registro: orden cronológico dentro de su actividad (1, 2, 3...)
function sequenceMap() {
  const map = {};
  const byActivity = {};
  getRecords().forEach(r => {
    (byActivity[r.actividad] = byActivity[r.actividad] || []).push(r);
  });
  Object.keys(byActivity).forEach(key => {
    byActivity[key]
      .slice()
      .sort((a, b) => (primaryDate(a) + a.created_at).localeCompare(primaryDate(b) + b.created_at))
      .forEach((r, i) => { map[r.id] = i + 1; });
  });
  return map;
}

// ---------------------------------------------------------------------------
// Notificaciones tipo "toast"
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
// Formulario de registro (campos dinámicos según la actividad)
// ---------------------------------------------------------------------------

const formInicio = document.getElementById('registro-inicio');
const form = document.getElementById('form-registro');
const btnNuevoRegistro = document.getElementById('btn-nuevo-registro');
const btnCancelar = document.getElementById('btn-cancelar');
const actividadSelect = document.getElementById('actividad');
const formFields = document.getElementById('form-fields');

let editingRecordId = null;

// Rellena el desplegable de actividades, agrupadas por categoría
function populateActivitySelect() {
  if (actividadSelect.querySelectorAll('optgroup').length > 0) return;
  const grupos = {};
  ACTIVITIES.forEach(a => {
    (grupos[a.grupo] = grupos[a.grupo] || []).push(a);
  });
  Object.keys(grupos).forEach(grupoName => {
    const og = document.createElement('optgroup');
    og.label = grupoName;
    grupos[grupoName].forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.key;
      opt.textContent = a.label;
      og.appendChild(opt);
    });
    actividadSelect.appendChild(og);
  });
}

function todayISO() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function renderFieldHtml(token) {
  const f = FIELD_DEFS[token];
  const id = 'fld_' + token;
  const reqMark = f.required ? ' <span class="req">*</span>' : '';
  const reqAttr = f.required ? ' required' : '';

  if (f.type === 'centro') {
    const opts = CENTROS.map(c => `<option value="${c}">${c}</option>`).join('');
    return `
      <label for="${id}">${f.label}${reqMark}</label>
      <select id="${id}" name="${f.name}" class="centro-select">
        <option value="">— Selecciona —</option>
        ${opts}
        <option value="__otro__">Otro...</option>
      </select>
      <input type="text" name="${f.name}_otro" placeholder="Escribe el nombre del centro" class="centro-otro hidden" style="margin-top:8px;">`;
  }

  const type = f.type === 'number' ? 'number' : (f.type === 'date' ? 'date' : 'text');
  let attrs = '';
  if (f.type === 'number') attrs += ' min="0" inputmode="numeric"';
  if (f.inputmode) attrs += ` inputmode="${f.inputmode}"`;
  if (f.placeholder) attrs += ` placeholder="${f.placeholder}"`;
  return `
    <label for="${id}">${f.label}${reqMark}</label>
    <input type="${type}" id="${id}" name="${f.name}"${attrs}${reqAttr}>`;
}

function buildFormForActivity(key) {
  const act = getActivity(key);
  if (!act) {
    formFields.innerHTML = '';
    return;
  }
  let html = `<fieldset class="block"><legend>${act.label}</legend>`;
  act.fields.forEach(token => { html += renderFieldHtml(token); });
  html += `</fieldset>`;
  formFields.innerHTML = html;

  // Lógica del "Otro" en los desplegables de centro
  formFields.querySelectorAll('.centro-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const otro = sel.parentElement.querySelector('.centro-otro') || sel.nextElementSibling;
      const esOtro = sel.value === '__otro__';
      if (otro) {
        otro.classList.toggle('hidden', !esOtro);
        if (!esOtro) otro.value = '';
      }
    });
  });

  // Fecha por defecto = hoy (en el primer campo de fecha)
  const firstDate = formFields.querySelector('input[type="date"]');
  if (firstDate && !firstDate.value) firstDate.value = todayISO();
}

function openManualForm() {
  editingRecordId = null;
  form.reset();
  actividadSelect.value = '';
  formFields.innerHTML = '';
  formInicio.classList.add('hidden');
  form.classList.remove('hidden');
}

function closeForm() {
  editingRecordId = null;
  form.reset();
  formFields.innerHTML = '';
  form.classList.add('hidden');
  formInicio.classList.remove('hidden');
}

btnNuevoRegistro.addEventListener('click', openManualForm);
btnCancelar.addEventListener('click', closeForm);

actividadSelect.addEventListener('change', () => {
  if (!editingRecordId) buildFormForActivity(actividadSelect.value);
});

form.addEventListener('submit', event => {
  event.preventDefault();

  if (!actividadSelect.value) {
    showToast('Selecciona una actividad.', 'warning');
    return;
  }

  const act = getActivity(actividadSelect.value);
  const formData = new FormData(form);
  const record = {
    id: editingRecordId || generateId(),
    created_at: editingRecordId ? recordCreatedAt(editingRecordId) : new Date().toISOString(),
    actividad: act.key
  };

  // Solo guardamos los campos que pertenecen a esta actividad
  act.fields.forEach(token => {
    const f = FIELD_DEFS[token];
    let value = formData.get(f.name);
    if (f.type === 'centro' && value === '__otro__') {
      value = (formData.get(f.name + '_otro') || '').trim();
    }
    record[f.name] = value != null ? String(value).trim() : '';
  });

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

function recordCreatedAt(id) {
  const existing = getRecords().find(r => r.id === id);
  return existing ? existing.created_at : new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Dashboard de progreso
// ---------------------------------------------------------------------------

const dashboardLista = document.getElementById('dashboard-lista');
const dashboardFiltroAnio = document.getElementById('dashboard-filtro-anio');

dashboardFiltroAnio.addEventListener('change', renderDashboard);

function weeksSinceResidencyStart() {
  const start = getResidencyStart();
  if (!start) return null;
  const startDate = new Date(start);
  if (isNaN(startDate.getTime())) return null;
  const diffDays = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 ? diffDays / 7 : null;
}

function projectionMessage(count, min, weeks) {
  if (min == null) return { text: 'Sin mínimo establecido — solo se cuenta.', complete: false, neutral: true };
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

  // Tarjeta de configuración: fecha de inicio de la residencia
  const configCard = document.createElement('div');
  configCard.className = 'progress-item';
  configCard.innerHTML = `
    <div class="label-row"><span class="name">📅 Fecha de inicio de la residencia</span></div>
    <p class="projection" style="margin-top:0;">Se usa para separar Año 1 / Año 2 y para calcular la proyección de ritmo.</p>
    <input type="date" id="residency-start-input" value="${getResidencyStart()}">
  `;
  dashboardLista.appendChild(configCard);
  configCard.querySelector('#residency-start-input').addEventListener('change', e => {
    setResidencyStart(e.target.value);
    showToast('Fecha de inicio guardada ✓');
    renderDashboard();
  });

  ACTIVITIES.forEach(act => {
    const count = records.filter(r => r.actividad === act.key).length;
    const min = act.min;
    const hasMin = min != null;
    const percent = hasMin ? Math.min(100, Math.round((count / min) * 100)) : 100;

    const totalCount = allRecords.filter(r => r.actividad === act.key).length;
    const projection = projectionMessage(totalCount, min, weeksElapsed);

    const el = document.createElement('div');
    el.className = 'progress-item';
    el.innerHTML = `
      <div class="label-row">
        <span class="name">${act.label}</span>
        <span class="count">${count}${hasMin ? ' / ' + min : ''}</span>
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
const filtroActividad = document.getElementById('filtro-actividad');
const filtroMes = document.getElementById('filtro-mes');
const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');

function formatDate(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthLabel(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number);
  const label = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function populateLogbookFilters() {
  if (filtroActividad.options.length === 1) {
    const grupos = {};
    ACTIVITIES.forEach(a => { (grupos[a.grupo] = grupos[a.grupo] || []).push(a); });
    Object.keys(grupos).forEach(grupoName => {
      const og = document.createElement('optgroup');
      og.label = grupoName;
      grupos[grupoName].forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.key;
        opt.textContent = a.label;
        og.appendChild(opt);
      });
      filtroActividad.appendChild(og);
    });
  }

  const months = new Set();
  getRecords().forEach(r => {
    const d = primaryDate(r);
    if (d) months.add(d.slice(0, 7));
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

[filtroActividad, filtroMes].forEach(input => {
  input.addEventListener('change', renderLogbook);
});

btnLimpiarFiltros.addEventListener('click', () => {
  filtroActividad.value = '';
  filtroMes.value = '';
  renderLogbook();
});

// Genera las líneas de detalle de un registro según los campos de su actividad
function recordDetailParts(record) {
  const parts = [];
  if (record.fecha_fin) parts.push('Fin: ' + formatDate(record.fecha_fin));
  if (record.nhc) parts.push('NHC ' + record.nhc);
  if (record.tipo_muestra) parts.push(record.tipo_muestra);
  if (record.num_sesiones) parts.push(record.num_sesiones + ' sesiones');
  if (record.num_participantes) parts.push(record.num_participantes + ' participantes');
  if (record.centro) parts.push(record.centro);
  if (record.responsable) parts.push(record.responsable);
  return parts;
}

function renderLogbook() {
  populateLogbookFilters();
  const seqMap = sequenceMap();

  let records = getRecords().slice().sort((a, b) => {
    const da = primaryDate(a), db = primaryDate(b);
    return new Date(db) - new Date(da) || b.created_at.localeCompare(a.created_at);
  });

  if (filtroActividad.value) records = records.filter(r => r.actividad === filtroActividad.value);
  if (filtroMes.value) records = records.filter(r => primaryDate(r).slice(0, 7) === filtroMes.value);

  logbookLista.innerHTML = '';

  if (records.length === 0) {
    logbookLista.innerHTML = '<p class="empty-state">No hay registros que coincidan con los filtros seleccionados.</p>';
    return;
  }

  records.forEach(record => {
    const card = document.createElement('div');
    card.className = 'record-card';
    const num = seqMap[record.id] || '?';
    const fecha = formatDate(primaryDate(record));
    const detalle = recordDetailParts(record).join(' · ') || '—';
    card.innerHTML = `
      <div class="record-title">${activityLabel(record.actividad)}</div>
      <div class="record-meta">Nº ${num} · ${fecha}</div>
      <div class="record-meta">${detalle}</div>
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
  const act = getActivity(record.actividad);
  if (!act) return;

  editingRecordId = id;
  form.reset();
  populateActivitySelect();
  actividadSelect.value = record.actividad;
  buildFormForActivity(record.actividad);

  // Rellenar cada campo con el valor guardado
  act.fields.forEach(token => {
    const f = FIELD_DEFS[token];
    const field = formFields.querySelector(`[name="${f.name}"]`);
    if (!field) return;
    const value = record[f.name] || '';
    if (f.type === 'centro') {
      if (value && !CENTROS.includes(value)) {
        field.value = '__otro__';
        const otro = formFields.querySelector(`[name="${f.name}_otro"]`);
        if (otro) { otro.classList.remove('hidden'); otro.value = value; }
      } else {
        field.value = value;
      }
    } else {
      field.value = value;
    }
  });

  formInicio.classList.add('hidden');
  form.classList.remove('hidden');
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

// Columnas unificadas que cubren todas las actividades
const CSV_COLUMNS = [
  ['actividad', 'Actividad'],
  ['num', 'Nº'],
  ['fecha', 'Fecha'],
  ['fecha_fin', 'Fecha finalización'],
  ['nhc', 'NHC'],
  ['centro', 'Centro'],
  ['tipo_muestra', 'Tipo muestra'],
  ['num_sesiones', 'Nº Sesiones'],
  ['num_participantes', 'Nº participantes'],
  ['responsable', 'Responsable']
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
    showToast('Todavía no hay registros para exportar.', 'warning');
    return;
  }
  const seqMap = sequenceMap();

  const header = CSV_COLUMNS.map(c => csvEscape(c[1])).join(',');
  const rows = records
    .slice()
    .sort((a, b) => activityLabel(a.actividad).localeCompare(activityLabel(b.actividad)) || (seqMap[a.id] - seqMap[b.id]))
    .map(record => CSV_COLUMNS.map(([key]) => {
      let value;
      if (key === 'actividad') value = activityLabel(record.actividad);
      else if (key === 'num') value = seqMap[record.id] || '';
      else if (key === 'fecha') value = primaryDate(record);
      else value = record[key];
      return csvEscape(value);
    }).join(','));

  const csvContent = '﻿' + [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `logbook_eir_${todayStamp()}.csv`);
}

function exportPDFResumen() {
  if (!window.jspdf) {
    showToast('La librería de PDF no está disponible sin conexión. Conéctate a internet la primera vez.', 'warning');
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const records = getRecords();

  doc.setFontSize(16);
  doc.setTextColor(179, 99, 63);
  doc.text('Resumen de progreso', 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(70, 58, 48);
  doc.text('Logbook EIR Matrona · HUTVC', 14, 25);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}  ·  Total de registros: ${records.length}`, 14, 30);

  let y = 44;
  doc.setFontSize(11);
  doc.text('Actividad', 14, y);
  doc.text('Hecho', 150, y);
  doc.text('Mínimo', 168, y);
  doc.text('%', 188, y);
  y += 3;
  doc.setDrawColor(226, 210, 191);
  doc.line(14, y, 196, y);
  y += 7;

  doc.setFontSize(9);
  ACTIVITIES.forEach(act => {
    const count = records.filter(r => r.actividad === act.key).length;
    const hasMin = act.min != null;
    const percent = hasMin ? Math.min(100, Math.round((count / act.min) * 100)) : null;

    if (y > 275) { doc.addPage(); y = 20; }

    const lines = doc.splitTextToSize(act.label, 130);
    doc.text(lines, 14, y);
    doc.text(String(count), 152, y);
    doc.text(hasMin ? String(act.min) : '—', 168, y);
    doc.text(hasMin ? `${percent}%${percent >= 100 ? ' ✓' : ''}` : '—', 186, y);
    y += Math.max(lines.length * 5, 8);
  });

  doc.save(`resumen_progreso_${todayStamp()}.pdf`);
}

function exportPDFCompleto() {
  if (!window.jspdf) {
    showToast('La librería de PDF no está disponible sin conexión. Conéctate a internet la primera vez.', 'warning');
    return;
  }
  const records = getRecords();
  if (records.length === 0) {
    showToast('Todavía no hay registros para exportar.', 'warning');
    return;
  }
  const seqMap = sequenceMap();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(179, 99, 63);
  doc.text('Logbook completo', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(70, 58, 48);
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}  ·  Total: ${records.length} registros`, 14, 25);

  let y = 38;

  ACTIVITIES.forEach(act => {
    const group = records
      .filter(r => r.actividad === act.key)
      .sort((a, b) => (seqMap[a.id] || 0) - (seqMap[b.id] || 0));
    if (group.length === 0) return;

    if (y > 262) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setTextColor(124, 140, 94);
    const titleLines = doc.splitTextToSize(`${act.label} (${group.length}${act.min != null ? '/' + act.min : ''})`, 182);
    doc.text(titleLines, 14, y);
    y += titleLines.length * 5;
    doc.setDrawColor(226, 210, 191);
    doc.line(14, y, 196, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(70, 58, 48);
    group.forEach(record => {
      if (y > 285) { doc.addPage(); y = 20; }
      const num = seqMap[record.id] || '?';
      const fecha = formatDate(primaryDate(record));
      const detalle = recordDetailParts(record).join(' · ');
      const linea = `#${num} · ${fecha}${detalle ? ' · ' + detalle : ''}`;
      const lineas = doc.splitTextToSize(linea, 182);
      doc.text(lineas, 14, y);
      y += lineas.length * 4.5 + 1.5;
    });
    y += 4;
  });

  doc.save(`logbook_completo_${todayStamp()}.pdf`);
}

const btnExportCSV = document.getElementById('btn-export-csv');
const btnExportPDFResumen = document.getElementById('btn-export-pdf-resumen');
const btnExportPDFCompleto = document.getElementById('btn-export-pdf-completo');

btnExportCSV.addEventListener('click', () => {
  try { exportCSV(); showToast('CSV descargado correctamente ✓'); }
  catch (e) { showToast('No se ha podido generar el CSV.', 'warning'); }
});

btnExportPDFResumen.addEventListener('click', () => {
  try { exportPDFResumen(); showToast('PDF de resumen descargado correctamente ✓'); }
  catch (e) { showToast('No se ha podido generar el PDF.', 'warning'); }
});

btnExportPDFCompleto.addEventListener('click', () => {
  try { exportPDFCompleto(); showToast('PDF del logbook completo descargado correctamente ✓'); }
  catch (e) { showToast('No se ha podido generar el PDF.', 'warning'); }
});

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

populateActivitySelect();
renderDashboard();
renderLogbook();
