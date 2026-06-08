// ---------------------------------------------------------------------------
// Sincronización con la nube (Supabase)
// - Copia de seguridad automática y acceso desde cualquier dispositivo
// - Funciona offline-first: la app sigue usando el almacenamiento local del
//   móvil; cuando hay internet y sesión iniciada, sube/baja los cambios.
// ---------------------------------------------------------------------------

(function () {
  const SUPABASE_URL = 'https://rvmiwlmsymxlzhtkxjrq.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_BmEttYo-0ESxEtuPLmXV2g_uOXGj6se';
  const OUTBOX_KEY = 'eir_sync_outbox';
  const RESIDENCY_TS_KEY = 'eir_residency_start_ts';

  let sb = null;
  let currentUser = null;
  let syncing = false;

  function nowISO() { return new Date().toISOString(); }
  function recTime(r) { return (r && (r.updated_at || r.created_at)) || ''; }
  function tnum(s) { const t = Date.parse(s); return isNaN(t) ? 0 : t; }
  function online() { return navigator.onLine !== false; }
  function ready() { return !!(sb && currentUser); }

  function getOutbox() {
    try { return JSON.parse(localStorage.getItem(OUTBOX_KEY)) || { deletes: {} }; }
    catch (e) { return { deletes: {} }; }
  }
  function setOutbox(o) { localStorage.setItem(OUTBOX_KEY, JSON.stringify(o)); }

  function setStatus(text) {
    const el = document.getElementById('cuenta-estado');
    if (el) el.textContent = text;
    const dot = document.getElementById('sync-indicator');
    if (dot) dot.classList.toggle('hidden', !currentUser);
  }

  function renderAccountUI() {
    const loggedOut = document.getElementById('cuenta-logged-out');
    const loggedIn = document.getElementById('cuenta-logged-in');
    if (loggedOut && loggedIn) {
      loggedOut.classList.toggle('hidden', !!currentUser);
      loggedIn.classList.toggle('hidden', !currentUser);
    }
    const email = document.getElementById('cuenta-email');
    if (email && currentUser) email.textContent = currentUser.email || '';
    const dot = document.getElementById('sync-indicator');
    if (dot) dot.classList.toggle('hidden', !currentUser);
  }

  function traducirError(msg) {
    if (/not confirmed|confirm your email/i.test(msg)) return 'aún no has confirmado tu correo: abre el email de Supabase y pulsa el enlace, luego inicia sesión';
    if (/Invalid login/i.test(msg)) return 'correo o contraseña incorrectos';
    if (/already registered|already exists/i.test(msg)) return 'ese correo ya tiene cuenta: usa "Iniciar sesión"';
    if (/at least 6|password should be/i.test(msg)) return 'la contraseña debe tener al menos 6 caracteres';
    if (/valid email|invalid format/i.test(msg)) return 'el correo no parece válido';
    if (/signups are disabled|logins are disabled/i.test(msg)) return 'el método de correo está desactivado en Supabase';
    return msg;
  }

  // --- inicialización ---
  function initSync() {
    if (!window.supabase || !window.supabase.createClient) {
      console.warn('Librería Supabase no disponible.');
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'eir_sb_auth' }
    });

    sb.auth.getSession().then(({ data }) => {
      currentUser = (data && data.session) ? data.session.user : null;
      renderAccountUI();
      if (currentUser) cloudSyncNow();
    });

    sb.auth.onAuthStateChange((_event, session) => {
      currentUser = session ? session.user : null;
      renderAccountUI();
      if (currentUser) cloudSyncNow();
    });

    window.addEventListener('online', () => { if (ready()) cloudSyncNow(); });

    wireAuthButtons();
  }

  // --- autenticación ---
  function creds() {
    const e = document.getElementById('cuenta-input-email');
    const p = document.getElementById('cuenta-input-password');
    return { email: (e && e.value || '').trim(), password: (p && p.value) || '' };
  }
  function validate(c) {
    if (!c.email || !c.password) { showToast('Escribe tu correo y contraseña.', 'warning'); return false; }
    return true;
  }

  async function doSignUp() {
    const c = creds();
    if (!validate(c)) return;
    setStatus('Creando cuenta…');
    const { data, error } = await sb.auth.signUp({ email: c.email, password: c.password });
    if (error) { setStatus(''); showToast('No se pudo crear la cuenta: ' + traducirError(error.message), 'warning'); return; }
    if (data.session) showToast('Cuenta creada ✓ Sincronizando…');
    else showToast('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.', 'warning');
  }

  async function doSignIn() {
    const c = creds();
    if (!validate(c)) return;
    setStatus('Entrando…');
    const { error } = await sb.auth.signInWithPassword({ email: c.email, password: c.password });
    if (error) { setStatus(''); showToast('No se pudo entrar: ' + traducirError(error.message), 'warning'); return; }
    showToast('Sesión iniciada ✓');
  }

  async function doSignOut() {
    await sb.auth.signOut();
    currentUser = null;
    renderAccountUI();
    setStatus('');
    showToast('Sesión cerrada.');
  }

  function wireAuthButtons() {
    const f = document.getElementById('cuenta-form');
    if (f) f.addEventListener('submit', e => { e.preventDefault(); doSignIn(); });
    const btnRegister = document.getElementById('btn-register');
    if (btnRegister) btnRegister.addEventListener('click', doSignUp);
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', doSignOut);
    const btnSyncNow = document.getElementById('btn-sync-now');
    if (btnSyncNow) btnSyncNow.addEventListener('click', () => cloudSyncNow(true));
  }

  // --- sincronización ---
  function rowFromRecord(r) {
    return { id: r.id, user_id: currentUser.id, data: r, deleted: false, updated_at: recTime(r) || nowISO() };
  }

  async function cloudSyncNow(manual) {
    if (!ready()) { if (manual) showToast('Inicia sesión para sincronizar.', 'warning'); return; }
    if (!online()) { setStatus('Sin conexión — se sincronizará al volver internet.'); if (manual) showToast('Sin conexión ahora mismo.', 'warning'); return; }
    if (syncing) return;
    syncing = true;
    setStatus('Sincronizando…');
    try {
      // 1) Enviar borrados pendientes (marcadores "deleted")
      const outbox = getOutbox();
      const delIds = Object.keys(outbox.deletes || {});
      if (delIds.length) {
        const delRows = delIds.map(id => ({ id, user_id: currentUser.id, data: {}, deleted: true, updated_at: outbox.deletes[id] || nowISO() }));
        const { error } = await sb.from('registros').upsert(delRows, { onConflict: 'id' });
        if (!error) { outbox.deletes = {}; setOutbox(outbox); }
      }

      // 2) Traer todo lo remoto
      const { data: remoteRows, error: pullErr } = await sb.from('registros').select('*');
      if (pullErr) throw pullErr;

      const localById = {};
      getRecords().forEach(r => { localById[r.id] = r; });
      const remoteById = {};
      (remoteRows || []).forEach(row => { remoteById[row.id] = row; });

      // 3) Aplicar remoto -> local (gana la versión más reciente)
      (remoteRows || []).forEach(row => {
        const local = localById[row.id];
        if (row.deleted) {
          if (local && tnum(recTime(local)) <= tnum(row.updated_at)) delete localById[row.id];
        } else if (!local || tnum(recTime(local)) < tnum(row.updated_at)) {
          const rec = row.data || {};
          rec.id = row.id;
          if (!rec.updated_at) rec.updated_at = row.updated_at;
          localById[row.id] = rec;
        }
      });

      // 4) Enviar a la nube lo local que falta o es más nuevo
      const toPush = [];
      Object.keys(localById).forEach(id => {
        const l = localById[id];
        const rem = remoteById[id];
        if (!rem || rem.deleted || tnum(recTime(l)) > tnum(rem.updated_at)) toPush.push(rowFromRecord(l));
      });
      if (toPush.length) {
        const { error } = await sb.from('registros').upsert(toPush, { onConflict: 'id' });
        if (error) throw error;
      }

      // 5) Guardar el resultado fusionado en el móvil
      saveRecords(Object.keys(localById).map(k => localById[k]));

      // 6) Ajustes (fecha de inicio de residencia)
      await syncAjustes();

      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderLogbook === 'function') renderLogbook();
      setStatus('✓ Sincronizado · ' + new Date().toLocaleTimeString('es-ES'));
      if (manual) showToast('Sincronizado ✓');
    } catch (e) {
      console.error('Error de sincronización:', e);
      setStatus('No se pudo sincronizar (se reintentará automáticamente).');
      if (manual) showToast('No se pudo sincronizar ahora. Revisa tu conexión.', 'warning');
    } finally {
      syncing = false;
    }
  }

  async function syncAjustes() {
    const localVal = getResidencyStart();
    const localTs = localStorage.getItem(RESIDENCY_TS_KEY) || '';
    const { data: remote, error } = await sb.from('ajustes').select('*').eq('user_id', currentUser.id).maybeSingle();
    if (error) return;
    if (remote && remote.updated_at && (!localTs || tnum(localTs) < tnum(remote.updated_at))) {
      const rv = (remote.data && remote.data.residency_start) || '';
      if (rv) { setResidencyStart(rv); localStorage.setItem(RESIDENCY_TS_KEY, remote.updated_at); }
    } else if (localVal && (!remote || tnum(localTs) > tnum(remote.updated_at))) {
      await sb.from('ajustes').upsert({ user_id: currentUser.id, data: { residency_start: localVal }, updated_at: localTs || nowISO() }, { onConflict: 'user_id' });
    }
  }

  // --- ganchos llamados desde app.js ---
  function cloudUpsert(record) {
    if (!ready() || !online()) return;
    sb.from('registros').upsert([rowFromRecord(record)], { onConflict: 'id' }).then(({ error }) => {
      if (error) console.error(error);
      else setStatus('✓ Sincronizado · ' + new Date().toLocaleTimeString('es-ES'));
    });
  }

  function cloudDelete(id) {
    const outbox = getOutbox();
    outbox.deletes[id] = nowISO();
    setOutbox(outbox);
    if (!ready() || !online()) return;
    const ts = outbox.deletes[id];
    sb.from('registros').upsert([{ id, user_id: currentUser.id, data: {}, deleted: true, updated_at: ts }], { onConflict: 'id' }).then(({ error }) => {
      if (!error) { const o = getOutbox(); delete o.deletes[id]; setOutbox(o); }
    });
  }

  function cloudPushAjustes() {
    localStorage.setItem(RESIDENCY_TS_KEY, nowISO());
    if (!ready() || !online()) return;
    sb.from('ajustes').upsert({ user_id: currentUser.id, data: { residency_start: getResidencyStart() }, updated_at: localStorage.getItem(RESIDENCY_TS_KEY) }, { onConflict: 'user_id' });
  }

  function cloudAfterImport() { if (ready()) cloudSyncNow(); }

  window.cloudUpsert = cloudUpsert;
  window.cloudDelete = cloudDelete;
  window.cloudPushAjustes = cloudPushAjustes;
  window.cloudAfterImport = cloudAfterImport;
  window.cloudSyncNow = cloudSyncNow;
  window.cloudLoggedIn = function () { return !!currentUser; };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSync);
  else initSync();
})();
