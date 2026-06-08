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
  fecha_fin:         { name: 'fecha_fin',         label: 'Fecha finalización (opcional)', type: 'date' },
  nhc:               { name: 'nhc',               label: 'NHC',                       type: 'text',   placeholder: 'Nº de historia clínica', inputmode: 'numeric' },
  centro:            { name: 'centro',            label: 'Centro',                    type: 'centro', required: true },
  centro_realiza:    { name: 'centro',            label: 'Centro en el que se realiza', type: 'centro', required: true },
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

// Color de fondo por categoría, para localizar la actividad de un vistazo
const GROUP_COLORS = {
  'Partos y cesáreas':                  { head: '#e3a78f', opt: '#f6e4db' },
  'Embarazo, puerperio y domicilio':    { head: '#a9b98a', opt: '#e6ecd9' },
  'Recién nacido':                      { head: '#e6c87e', opt: '#f7eccf' },
  'Consulta, asesoramiento y muestras': { head: '#b3a7cc', opt: '#e7e1f0' },
  'Actividades grupales':               { head: '#d8b48a', opt: '#f0e4d2' }
};

// Rellena un <select> con las actividades agrupadas por categoría y coloreadas
function buildActivityOptgroups(selectEl) {
  const grupos = {};
  ACTIVITIES.forEach(a => { (grupos[a.grupo] = grupos[a.grupo] || []).push(a); });
  Object.keys(grupos).forEach(grupoName => {
    const og = document.createElement('optgroup');
    og.label = grupoName;
    const colors = GROUP_COLORS[grupoName];
    if (colors) {
      og.style.background = colors.head;
      og.style.color = '#463a30';
      og.style.fontWeight = '700';
    }
    grupos[grupoName].forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.key;
      opt.textContent = a.label;
      if (colors) {
        opt.style.background = colors.opt;
        opt.style.color = '#463a30';
        opt.style.fontWeight = '400';
      }
      og.appendChild(opt);
    });
    selectEl.appendChild(og);
  });
}

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
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    // Datos dañados: NO los pisamos (podrían recuperarse). Guardamos una copia y avisamos.
    if (!window.__corruptHandled) {
      window.__corruptHandled = true;
      try { localStorage.setItem(STORAGE_KEY + '__corrupto', raw); } catch (_) {}
      setTimeout(() => showToast('Aviso: los datos guardados parecen dañados. Se ha conservado una copia interna. Restaura tu última copia de seguridad desde Exportar.', 'warning'), 600);
    }
    return [];
  }
}

// Devuelve true si se guardó correctamente; false si el almacenamiento está lleno o falla.
function saveRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (e) {
    return false;
  }
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
  if (recordDate < startDate) return null;
  // Año 1 = primeros 12 meses exactos desde el inicio (comparando la fecha completa, no solo el mes)
  const anniversary = new Date(startDate);
  anniversary.setFullYear(anniversary.getFullYear() + 1);
  return recordDate < anniversary ? 1 : 2;
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
      .sort((a, b) => {
        const ka = (primaryDate(a) || '') + '|' + (a.created_at || '') + '|' + a.id;
        const kb = (primaryDate(b) || '') + '|' + (b.created_at || '') + '|' + b.id;
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      })
      .forEach((r, i) => { map[r.id] = i + 1; });
  });
  return map;
}

// ---------------------------------------------------------------------------
// Notificaciones tipo "toast"
// ---------------------------------------------------------------------------

let toastTimer = null;

function showToast(message, type, action) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = message;
  toast.appendChild(span);
  if (action && action.label && typeof action.fn === 'function') {
    const btn = document.createElement('button');
    btn.className = 'toast-action';
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      toast.classList.remove('show');
      action.fn();
    });
    toast.appendChild(btn);
  }
  toast.className = 'toast show' + (type === 'warning' ? ' warning' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), action ? 6500 : 3200);
}

// ---------------------------------------------------------------------------
// Navegación entre pantallas
// ---------------------------------------------------------------------------

const screens = {
  registro: document.getElementById('screen-registro'),
  dashboard: document.getElementById('screen-dashboard'),
  logbook: document.getElementById('screen-logbook'),
  exportar: document.getElementById('screen-exportar'),
  cuenta: document.getElementById('screen-cuenta')
};

const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.screen;
    // Si hay un registro a medio rellenar y se va a otra pantalla, avisar antes de descartarlo
    if (target !== 'registro' && formHasInput()) {
      if (!confirm('¿Salir sin guardar el registro que estás rellenando?')) return;
      closeForm(true);
    }
    navButtons.forEach(b => {
      const isActive = b === btn;
      b.classList.toggle('active', isActive);
      if (isActive) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    Object.keys(screens).forEach(name => {
      screens[name].classList.toggle('hidden', name !== target);
    });
    if (target === 'dashboard') renderDashboard();
    if (target === 'logbook') renderLogbook();
    if (target === 'exportar') populateExportSelect();
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
const btnGuardar = document.getElementById('btn-guardar');
const btnGuardarOtro = document.getElementById('btn-guardar-otro');
const actividadSelect = document.getElementById('actividad');
const formFields = document.getElementById('form-fields');
const editBanner = document.getElementById('edit-banner');
const activityPicker = document.getElementById('activity-picker');

// Color de categoría de una actividad (para acentos en otras pantallas)
function groupColorOf(key) {
  const a = getActivity(key);
  const c = a && GROUP_COLORS[a.grupo];
  return c ? c.head : 'var(--color-border)';
}

// Construye el selector visual por categorías (acordeón coloreado)
function buildActivityPicker() {
  if (!activityPicker || activityPicker.childElementCount) return;
  const grupos = {};
  ACTIVITIES.forEach(a => { (grupos[a.grupo] = grupos[a.grupo] || []).push(a); });

  Object.keys(grupos).forEach(grupoName => {
    const colors = GROUP_COLORS[grupoName] || { head: '#cccccc', opt: '#eeeeee' };

    const group = document.createElement('div');
    group.className = 'cat-group';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'cat-header';
    header.style.background = colors.head;
    header.innerHTML = `<span>${grupoName}</span><span class="cat-chevron">▾</span>`;
    header.addEventListener('click', () => {
      const isOpen = group.classList.contains('open');
      activityPicker.querySelectorAll('.cat-group.open').forEach(g => g.classList.remove('open'));
      if (!isOpen) group.classList.add('open');
    });

    const items = document.createElement('div');
    items.className = 'cat-items';
    grupos[grupoName].forEach(a => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'cat-item';
      item.dataset.key = a.key;
      item.style.borderLeftColor = colors.head;
      item.style.background = colors.opt;
      item.textContent = a.label;
      item.addEventListener('click', () => selectActivity(a.key));
      items.appendChild(item);
    });

    group.appendChild(header);
    group.appendChild(items);
    activityPicker.appendChild(group);
  });
}

// Resalta la actividad elegida en el picker y abre su categoría (sin reconstruir el formulario)
function syncPickerSelection(key) {
  if (!activityPicker) return;
  activityPicker.querySelectorAll('.cat-item').forEach(el => {
    el.classList.toggle('selected', el.dataset.key === key);
  });
  activityPicker.querySelectorAll('.cat-group').forEach(g => {
    g.classList.toggle('open', key && !!g.querySelector(`.cat-item[data-key="${key}"]`));
  });
}

// Elige una actividad desde el picker: fija el valor y genera los campos
function selectActivity(key) {
  actividadSelect.value = key;
  syncPickerSelection(key);
  buildFormForActivity(key);
}

let editingRecordId = null;

// Rellena el desplegable de actividades, agrupadas por categoría
function populateActivitySelect() {
  if (actividadSelect.querySelectorAll('optgroup').length > 0) return;
  buildActivityOptgroups(actividadSelect);
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
      <select id="${id}" name="${f.name}" class="centro-select"${reqAttr}>
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

// ¿Hay algo escrito en el formulario? (para avisar antes de descartar)
function formHasInput() {
  if (form.classList.contains('hidden')) return false;
  if (actividadSelect.value) return true;
  return Array.from(formFields.querySelectorAll('input, select, textarea')).some(el => el.value && el.value.trim() !== '');
}

function setEditingUI(isEditing) {
  actividadSelect.disabled = isEditing;
  if (activityPicker) activityPicker.classList.toggle('disabled', isEditing);
  if (editBanner) editBanner.classList.toggle('hidden', !isEditing);
  if (btnGuardar) btnGuardar.textContent = isEditing ? 'Guardar cambios' : 'Guardar registro';
  if (btnGuardarOtro) btnGuardarOtro.classList.toggle('hidden', isEditing);
}

function openManualForm() {
  editingRecordId = null;
  form.reset();
  actividadSelect.value = '';
  formFields.innerHTML = '';
  syncPickerSelection('');
  setEditingUI(false);
  formInicio.classList.add('hidden');
  form.classList.remove('hidden');
}

function closeForm(skipConfirm) {
  if (!skipConfirm && formHasInput() && !confirm('¿Descartar este registro sin guardar?')) return false;
  editingRecordId = null;
  form.reset();
  formFields.innerHTML = '';
  syncPickerSelection('');
  setEditingUI(false);
  form.classList.add('hidden');
  formInicio.classList.remove('hidden');
  return true;
}

btnNuevoRegistro.addEventListener('click', openManualForm);
btnCancelar.addEventListener('click', () => closeForm());

actividadSelect.addEventListener('change', () => {
  if (!editingRecordId) buildFormForActivity(actividadSelect.value);
});

// Guarda el formulario. keepOpen=true ("Guardar y añadir otro") deja el formulario
// abierto con la misma actividad para registrar varios seguidos sin volver a elegirla.
function submitForm(keepOpen) {
  if (!actividadSelect.value) {
    showToast('Selecciona una actividad.', 'warning');
    actividadSelect.focus();
    actividadSelect.scrollIntoView({ block: 'center', behavior: 'smooth' });
    return;
  }

  // Validación nativa de los campos obligatorios (muestra el aviso junto al campo)
  if (!form.reportValidity()) return;

  const act = getActivity(actividadSelect.value);

  // Si eligió "Otro..." en un centro, comprobamos que escribió el nombre
  for (const token of act.fields) {
    const f = FIELD_DEFS[token];
    if (f.type === 'centro') {
      const sel = formFields.querySelector(`[name="${f.name}"]`);
      if (sel && sel.value === '__otro__') {
        const otro = formFields.querySelector(`[name="${f.name}_otro"]`);
        if (!otro || !otro.value.trim()) {
          showToast('Escribe el nombre del centro.', 'warning');
          if (otro) { otro.focus(); otro.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
          return;
        }
      }
    }
  }

  const formData = new FormData(form);
  const record = {
    id: editingRecordId || generateId(),
    created_at: editingRecordId ? recordCreatedAt(editingRecordId) : new Date().toISOString(),
    actividad: act.key
  };

  act.fields.forEach(token => {
    const f = FIELD_DEFS[token];
    let value = formData.get(f.name);
    if (f.type === 'centro' && value === '__otro__') {
      value = (formData.get(f.name + '_otro') || '').trim();
    }
    record[f.name] = value != null ? String(value).trim() : '';
  });

  record.updated_at = new Date().toISOString(); // sello de tiempo para la sincronización

  const records = getRecords();
  if (editingRecordId) {
    const idx = records.findIndex(r => r.id === editingRecordId);
    if (idx !== -1) records[idx] = record;
  } else {
    records.push(record);
  }

  if (!saveRecords(records)) {
    showToast('No se pudo guardar: el almacenamiento del teléfono está lleno. Guarda una copia de seguridad y libera espacio.', 'warning');
    return; // no cerramos el formulario: los datos siguen en pantalla
  }

  if (window.cloudUpsert) window.cloudUpsert(record); // sube la copia a la nube si hay sesión

  const wasEditing = !!editingRecordId;
  renderDashboard();
  renderLogbook();

  if (keepOpen && !wasEditing) {
    const sameActivity = act.key;
    editingRecordId = null;
    buildFormForActivity(sameActivity); // limpia los campos y vuelve a poner la fecha de hoy
    syncPickerSelection(sameActivity);
    setEditingUI(false);
    showToast('Guardado ✓ Añade el siguiente');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    closeForm(true);
    showToast(wasEditing ? 'Registro actualizado correctamente ✓' : 'Registro guardado correctamente ✓');
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  submitForm(false);
});

if (btnGuardarOtro) {
  btnGuardarOtro.addEventListener('click', () => submitForm(true));
}

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
  const startSet = !!getResidencyStart();
  const configCard = document.createElement('div');
  configCard.className = 'progress-item' + (startSet ? '' : ' config-empty');
  configCard.innerHTML = `
    <div class="label-row"><span class="name">📅 Fecha de inicio de la residencia</span></div>
    <p class="projection" style="margin-top:0;">${startSet
      ? 'Se usa para separar Año 1 / Año 2 y para calcular la proyección de ritmo.'
      : '👇 Añade aquí tu fecha de inicio para ver el progreso por año y la proyección de ritmo.'}</p>
    <input type="date" id="residency-start-input" value="${getResidencyStart()}">
  `;
  dashboardLista.appendChild(configCard);
  configCard.querySelector('#residency-start-input').addEventListener('change', e => {
    setResidencyStart(e.target.value);
    if (window.cloudPushAjustes) window.cloudPushAjustes();
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
    el.style.borderLeft = '5px solid ' + groupColorOf(act.key);
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
    buildActivityOptgroups(filtroActividad);
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
    card.style.borderLeft = '5px solid ' + groupColorOf(record.actividad);
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

  syncPickerSelection(record.actividad);
  setEditingUI(true);
  formInicio.classList.add('hidden');
  form.classList.remove('hidden');
  document.querySelector('.nav-btn[data-screen="registro"]').click();
  window.scrollTo(0, 0);
}

function deleteRecord(id) {
  const records = getRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return;
  if (!confirm('¿Eliminar este registro? Podrás deshacerlo durante unos segundos.')) return;

  const removed = records[idx];
  records.splice(idx, 1);
  if (!saveRecords(records)) {
    showToast('No se pudo eliminar (error de almacenamiento).', 'warning');
    return;
  }
  if (window.cloudDelete) window.cloudDelete(removed.id); // propaga el borrado a la nube
  renderLogbook();
  renderDashboard();

  showToast('Registro eliminado.', undefined, {
    label: 'Deshacer',
    fn: () => {
      const recs = getRecords();
      removed.updated_at = new Date().toISOString(); // gana sobre el borrado en la nube
      if (!recs.some(r => r.id === removed.id)) recs.push(removed);
      if (saveRecords(recs)) {
        if (window.cloudUpsert) window.cloudUpsert(removed);
        renderLogbook();
        renderDashboard();
        showToast('Registro restaurado ✓');
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Exportación: CSV (JS puro con Blob) y PDF (jsPDF vía CDN)
// ---------------------------------------------------------------------------

const exportActividadSelect = document.getElementById('export-actividad');

function populateExportSelect() {
  if (exportActividadSelect.querySelectorAll('optgroup').length > 0) return;
  buildActivityOptgroups(exportActividadSelect);
}

// Columnas de una actividad para texto/CSV: Nº + los campos de su hoja
function activityColumns(act) {
  const cols = [{ header: 'Nº', kind: 'num' }];
  act.fields.forEach(token => {
    const f = FIELD_DEFS[token];
    cols.push({ header: f.label, name: f.name, type: f.type });
  });
  return cols;
}

function cellValue(col, record, num) {
  if (col.kind === 'num') return String(num);
  const v = record[col.name];
  if (v == null || v === '') return '';
  if (col.type === 'date') return formatDate(v);
  return String(v);
}

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

// Convierte un texto a un nombre de archivo seguro
function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
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

// Devuelve las actividades a exportar según el selector (vacío = todas con registros)
function activitiesToExport(filterKey) {
  if (filterKey) return [getActivity(filterKey)].filter(Boolean);
  const records = getRecords();
  return ACTIVITIES.filter(act => records.some(r => r.actividad === act.key));
}

// ---- Hoja de texto (.txt) ----

function buildTxtForActivity(act, records, seqMap) {
  const cols = activityColumns(act);
  const recs = records
    .filter(r => r.actividad === act.key)
    .sort((a, b) => (seqMap[a.id] || 0) - (seqMap[b.id] || 0));
  const rows = recs.map(r => cols.map(c => cellValue(c, r, seqMap[r.id])));

  const widths = cols.map((c, i) => {
    const cellLens = rows.map(r => r[i].length);
    return Math.max(c.header.length, 3, ...cellLens);
  });

  const sep = ' | ';
  const lines = [];
  lines.push(act.label);
  lines.push(act.min != null ? `Actividad mínima: ${act.min}` : 'Sin mínimo establecido');
  lines.push('');
  lines.push(cols.map((c, i) => c.header.padEnd(widths[i])).join(sep));
  lines.push(cols.map((c, i) => '-'.repeat(widths[i])).join('-+-'));
  rows.forEach(r => lines.push(r.map((cell, i) => cell.padEnd(widths[i])).join(sep)));
  lines.push('');
  lines.push(`Total: ${recs.length}${act.min != null ? ' / ' + act.min : ''}`);
  return lines.join('\n');
}

function exportTXT(filterKey) {
  const records = getRecords();
  const relevant = filterKey ? records.filter(r => r.actividad === filterKey) : records;
  if (relevant.length === 0) {
    showToast('No hay registros para exportar en esa selección.', 'warning');
    return;
  }
  const seqMap = sequenceMap();
  const acts = activitiesToExport(filterKey);

  const blocks = [];
  blocks.push('LOGBOOK EIR MATRONA · HUTVC');
  blocks.push(`Generado: ${new Date().toLocaleString('es-ES')}`);
  blocks.push('='.repeat(64));
  acts.forEach(act => {
    blocks.push('');
    blocks.push(buildTxtForActivity(act, records, seqMap));
    blocks.push('');
    blocks.push('='.repeat(64));
  });

  const blob = new Blob([blocks.join('\n')], { type: 'text/plain;charset=utf-8;' });
  const name = filterKey ? slug(getActivity(filterKey).label) : 'logbook_completo';
  downloadBlob(blob, `${name}_${todayStamp()}.txt`);
}

// ---- Hoja de cálculo (.csv) ----

function exportCSV(filterKey) {
  const records = getRecords();
  const relevant = filterKey ? records.filter(r => r.actividad === filterKey) : records;
  if (relevant.length === 0) {
    showToast('No hay registros para exportar en esa selección.', 'warning');
    return;
  }
  const seqMap = sequenceMap();

  let header, rows, filename;

  if (filterKey) {
    const act = getActivity(filterKey);
    const cols = activityColumns(act);
    const recs = relevant.slice().sort((a, b) => (seqMap[a.id] || 0) - (seqMap[b.id] || 0));
    header = cols.map(c => csvEscape(c.header)).join(',');
    rows = recs.map(r => cols.map(c => csvEscape(cellValue(c, r, seqMap[r.id]))).join(','));
    filename = `${slug(act.label)}_${todayStamp()}.csv`;
  } else {
    // Todas las actividades: tabla unificada con una columna "Actividad"
    const COLS = [
      ['actividad', 'Actividad'], ['num', 'Nº'], ['fecha', 'Fecha'],
      ['fecha_fin', 'Fecha finalización'], ['nhc', 'NHC'], ['centro', 'Centro'],
      ['tipo_muestra', 'Tipo muestra'], ['num_sesiones', 'Nº Sesiones'],
      ['num_participantes', 'Nº participantes'], ['responsable', 'Responsable']
    ];
    header = COLS.map(c => csvEscape(c[1])).join(',');
    rows = records
      .slice()
      .sort((a, b) => activityLabel(a.actividad).localeCompare(activityLabel(b.actividad)) || ((seqMap[a.id] || 0) - (seqMap[b.id] || 0)))
      .map(record => COLS.map(([key]) => {
        let value;
        if (key === 'actividad') value = activityLabel(record.actividad);
        else if (key === 'num') value = seqMap[record.id] || '';
        else if (key === 'fecha') value = formatDate(primaryDate(record));
        else if (key === 'fecha_fin') value = record.fecha_fin ? formatDate(record.fecha_fin) : '';
        else value = record[key];
        return csvEscape(value);
      }).join(','));
    filename = `logbook_completo_${todayStamp()}.csv`;
  }

  const csvContent = '﻿' + [header, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

// ---- PDF ----

function exportPDF(filterKey) {
  if (!window.jspdf) {
    showToast('La librería de PDF no está disponible sin conexión. Conéctate a internet la primera vez.', 'warning');
    return;
  }
  const records = getRecords();
  const relevant = filterKey ? records.filter(r => r.actividad === filterKey) : records;
  if (relevant.length === 0) {
    showToast('No hay registros para exportar en esa selección.', 'warning');
    return;
  }
  const seqMap = sequenceMap();
  const acts = activitiesToExport(filterKey);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(179, 99, 63);
  doc.text(filterKey ? 'Hoja de registro' : 'Logbook completo', 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(70, 58, 48);
  doc.text(`Logbook EIR Matrona · HUTVC · Generado: ${new Date().toLocaleString('es-ES')}`, 14, 25);

  let y = 38;

  acts.forEach(act => {
    const group = relevant
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

  const name = filterKey ? slug(getActivity(filterKey).label) : 'logbook_completo';
  doc.save(`${name}_${todayStamp()}.pdf`);
}

const btnExportTXT = document.getElementById('btn-export-txt');
const btnExportCSV = document.getElementById('btn-export-csv');
const btnExportPDF = document.getElementById('btn-export-pdf');

btnExportTXT.addEventListener('click', () => {
  try { exportTXT(exportActividadSelect.value); showToast('Hoja de texto descargada ✓'); }
  catch (e) { console.error(e); showToast('No se ha podido generar el archivo de texto.', 'warning'); }
});

btnExportCSV.addEventListener('click', () => {
  try { exportCSV(exportActividadSelect.value); showToast('Hoja de cálculo descargada ✓'); }
  catch (e) { console.error(e); showToast('No se ha podido generar el CSV.', 'warning'); }
});

btnExportPDF.addEventListener('click', () => {
  try { exportPDF(exportActividadSelect.value); showToast('PDF descargado ✓'); }
  catch (e) { console.error(e); showToast('No se ha podido generar el PDF.', 'warning'); }
});

// ---------------------------------------------------------------------------
// Copia de seguridad (.json): la ÚNICA forma de recuperar los datos si se
// pierde, formatea o cambia de teléfono. Se puede volver a importar en la app.
// ---------------------------------------------------------------------------

function exportBackup() {
  const data = {
    app: 'logbook-eir-matrona',
    version: 1,
    exported_at: new Date().toISOString(),
    residency_start: getResidencyStart(),
    records: getRecords()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `copia_seguridad_logbook_${todayStamp()}.json`);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      console.error(e);
      showToast('El archivo no es una copia de seguridad válida.', 'warning');
      return;
    }
    const incoming = Array.isArray(data) ? data : (data && data.records);
    if (!Array.isArray(incoming)) {
      showToast('El archivo no contiene registros reconocibles.', 'warning');
      return;
    }
    const valid = incoming.filter(r => r && typeof r === 'object' && r.id && r.actividad);
    if (valid.length === 0) {
      showToast('La copia no contiene registros válidos.', 'warning');
      return;
    }

    // Fusión por id (no se duplican ni se pierden los registros que ya tienes)
    const byId = {};
    getRecords().forEach(r => { byId[r.id] = r; });
    valid.forEach(r => { byId[r.id] = r; });
    const merged = Object.keys(byId).map(k => byId[k]);

    if (!saveRecords(merged)) {
      showToast('No se pudo guardar la copia: almacenamiento lleno.', 'warning');
      return;
    }
    if (data && data.residency_start && !getResidencyStart()) {
      setResidencyStart(data.residency_start);
    }
    if (window.cloudAfterImport) window.cloudAfterImport(); // sube lo importado a la nube
    renderDashboard();
    renderLogbook();
    showToast(`Copia restaurada ✓ (${valid.length} registros)`);
  };
  reader.onerror = () => showToast('No se pudo leer el archivo.', 'warning');
  reader.readAsText(file);
}

const btnExportBackup = document.getElementById('btn-export-backup');
const btnImportBackup = document.getElementById('btn-import-backup');
const importFileInput = document.getElementById('import-file');

if (btnExportBackup) {
  btnExportBackup.addEventListener('click', () => {
    try { exportBackup(); showToast('Copia de seguridad guardada ✓'); }
    catch (e) { console.error(e); showToast('No se ha podido crear la copia.', 'warning'); }
  });
}

if (btnImportBackup && importFileInput) {
  btnImportBackup.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files && importFileInput.files[0];
    if (file) importBackup(file);
    importFileInput.value = ''; // permite volver a elegir el mismo archivo
  });
}

// ---------------------------------------------------------------------------
// Inicialización
// ---------------------------------------------------------------------------

populateActivitySelect();
buildActivityPicker();
populateExportSelect();
renderDashboard();
renderLogbook();
