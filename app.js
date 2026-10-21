(function () {
  'use strict';

  var STORAGE_KEY = 'mf_config_v1';

  function getSavedConfig() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function saveConfig(cfg) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
  }
  function clearConfig() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  var cfg = getSavedConfig();

  function money(n) {
    n = Number(n) || 0;
    var sign = n < 0 ? '-' : '';
    return sign + '$' + Math.abs(n).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function showToast(msg) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // ---------- Tema ----------
  var THEME_KEY = 'mf_theme_v1';

  function applyTheme(valor) {
    if (valor === 'claro') document.documentElement.setAttribute('data-theme', 'light');
    else if (valor === 'oscuro') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');

    document.querySelectorAll('.theme-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.themeOpt === valor);
    });
  }

  function getSavedTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'sistema'; } catch (e) { return 'sistema'; }
  }

  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var valor = btn.dataset.themeOpt;
      try { localStorage.setItem(THEME_KEY, valor); } catch (e) {}
      applyTheme(valor);
    });
  });

  applyTheme(getSavedTheme());

  function apiGet(action, params) {
    if (!cfg) return Promise.reject(new Error('sin_configurar'));
    params = params || {};
    var url = cfg.apiUrl + '?action=' + encodeURIComponent(action) + '&key=' + encodeURIComponent(cfg.apiKey);
    Object.keys(params).forEach(function (k) {
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    });
    return fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.error) throw new Error(data.error);
      return data;
    });
  }

  function apiPost(payload) {
    if (!cfg) return Promise.reject(new Error('sin_configurar'));
    payload.key = cfg.apiKey;
    return fetch(cfg.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data && data.error) throw new Error(data.error);
      return data;
    });
  }

  // ---------- Navegacion ----------
  var views = ['setup', 'dashboard', 'ingresos', 'gastos', 'ajustes'];

  function showView(name) {
    views.forEach(function (v) {
      document.getElementById('view-' + v).classList.toggle('active', v === name);
    });
    document.querySelectorAll('.nav-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.view === name);
    });
    document.querySelector('.bottom-nav').style.display = (name === 'setup') ? 'none' : 'flex';
    if (name === 'dashboard') loadDashboard();
    if (name === 'ingresos') { loadLista('Ingresos'); ocultarSugerenciaFondo(); }
    if (name === 'gastos') loadLista('Gastos');
    if (name === 'ajustes') loadAjustes();
  }

  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { showView(btn.dataset.view); });
  });
  document.getElementById('btn-ajustes').addEventListener('click', function () { showView('ajustes'); });

  // ---------- Setup ----------
  document.getElementById('btn-guardar-setup').addEventListener('click', function () {
    var url = document.getElementById('input-url').value.trim();
    var key = document.getElementById('input-key').value.trim();
    var err = document.getElementById('setup-error');
    err.textContent = '';
    if (!url || !key) {
      err.textContent = 'Completa la URL y la clave.';
      return;
    }
    cfg = { apiUrl: url, apiKey: key };
    apiGet('config').then(function () {
      saveConfig(cfg);
      showView('dashboard');
      showToast('Conectado correctamente');
    }).catch(function (e) {
      cfg = null;
      err.textContent = 'No se pudo conectar. Revisa la URL y la clave. (' + e.message + ')';
    });
  });

  document.getElementById('btn-reconectar').addEventListener('click', function () {
    clearConfig();
    cfg = null;
    document.getElementById('input-url').value = '';
    document.getElementById('input-key').value = '';
    showView('setup');
  });

  // ---------- Dashboard ----------
  function renderChart(meses) {
    var max = 1;
    meses.forEach(function (m) { max = Math.max(max, m.ingresos, m.gastos); });
    var el = document.getElementById('chart');
    el.innerHTML = '';
    meses.forEach(function (m) {
      var col = document.createElement('div');
      col.className = 'chart-col';
      var bars = document.createElement('div');
      bars.className = 'chart-bars';
      var bi = document.createElement('div');
      bi.className = 'bar bar-ingreso';
      bi.style.height = Math.round((m.ingresos / max) * 100) + 'px';
      var bg = document.createElement('div');
      bg.className = 'bar bar-gasto';
      bg.style.height = Math.round((m.gastos / max) * 100) + 'px';
      bars.appendChild(bi);
      bars.appendChild(bg);
      var label = document.createElement('div');
      label.className = 'chart-label';
      label.textContent = m.mes.substring(0, 3);
      col.appendChild(bars);
      col.appendChild(label);
      el.appendChild(col);
    });
  }

  function loadDashboard() {
    apiGet('resumen').then(function (data) {
      var hoy = new Date().getMonth();
      var mesActual = data.meses[hoy];
      document.getElementById('stat-ingresos').textContent = money(mesActual.ingresos);
      document.getElementById('stat-gastos').textContent = money(mesActual.gastos);
      document.getElementById('stat-disponible').textContent = money(mesActual.disponible);
      document.getElementById('stat-reserva').textContent = money(mesActual.reserva);
      document.getElementById('stat-total-disponible-reserva').textContent = money(mesActual.disponible + mesActual.reserva);
      document.getElementById('stat-pendientes').textContent = money(data.facturasPendientes);
      document.getElementById('anio-actual').textContent = data.anio;
      renderChart(data.meses);

      var pct = Math.min(1, data.progresoFondo || 0);
      document.getElementById('fondo-fill').style.width = (pct * 100) + '%';
      document.getElementById('fondo-pct').textContent = Math.round(pct * 100) + '%';
    }).catch(function (e) { showToast('Error al cargar resumen: ' + e.message); });
  }

  // ---------- Listas (Ingresos / Gastos) ----------
  function loadLista(sheet) {
    apiGet('list', { sheet: sheet }).then(function (rows) {
      var contId = sheet === 'Ingresos' ? 'lista-ingresos' : 'lista-gastos';
      var cont = document.getElementById(contId);
      cont.innerHTML = '';
      if (!rows.length) {
        cont.innerHTML = '<p class="muted">Todavia no hay registros.</p>';
        return;
      }
      rows.forEach(function (r) {
        var item = document.createElement('div');
        item.className = 'list-item';
        var main = sheet === 'Ingresos' ? r.Cliente : r.Descripcion;
        var sub = sheet === 'Ingresos'
          ? (r.Fecha + ' - ' + (r.Categoria || ''))
          : (r.Fecha + ' - ' + (r.Categoria || '') + ' - Deducible: ' + (r.Deducible || ''));
        var estadoHtml = '';
        if (sheet === 'Ingresos') {
          var est = r.Estado || 'Pagado';
          estadoHtml =
            '<select class="li-estado" data-value="' + normalizeEstado(est) + '" data-row="' + r.rowIndex + '">' +
            '<option value="Pagado"' + (est === 'Pagado' ? ' selected' : '') + '>Pagado</option>' +
            '<option value="Pendiente"' + (est === 'Pendiente' ? ' selected' : '') + '>Pendiente</option>' +
            '</select>';
        }
        item.innerHTML =
          '<div class="li-info"><div class="li-main">' + escapeHtml(main || '') + '</div>' +
          '<div class="li-sub">' + escapeHtml(sub) + '</div></div>' +
          '<div class="li-actions">' +
          estadoHtml +
          '<span class="li-amount">' + money(r.Monto) + '</span>' +
          '<button class="li-delete" data-row="' + r.rowIndex + '" data-sheet="' + sheet + '">&times;</button>' +
          '</div>';
        cont.appendChild(item);
      });
      cont.querySelectorAll('.li-estado').forEach(function (sel) {
        sel.addEventListener('change', function () {
          var nuevoValor = sel.value;
          var rowIndex = Number(sel.dataset.row);
          apiPost({ action: 'update', sheet: 'Ingresos', rowIndex: rowIndex, data: { Estado: nuevoValor } })
            .then(function () {
              sel.dataset.value = nuevoValor;
              showToast('Estado actualizado');
            })
            .catch(function (e) { showToast('Error: ' + e.message); });
        });
      });
      cont.querySelectorAll('.li-delete').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!confirm('¿Eliminar este registro?')) return;
          apiPost({ action: 'delete', sheet: btn.dataset.sheet, rowIndex: Number(btn.dataset.row) })
            .then(function () { loadLista(btn.dataset.sheet); showToast('Eliminado'); })
            .catch(function (e) { showToast('Error: ' + e.message); });
        });
      });
    }).catch(function (e) { showToast('Error al cargar: ' + e.message); });
  }

  function normalizeEstado(v) { return v === 'Pendiente' ? 'Pendiente' : 'Pagado'; }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  document.getElementById('form-ingreso').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var data = {};
    fd.forEach(function (v, k) { data[k] = v; });
    apiPost({ action: 'add', sheet: 'Ingresos', data: data }).then(function () {
      e.target.reset();
      loadLista('Ingresos');
      showToast('Ingreso guardado');
      mostrarSugerenciaFondo(Number(data.Monto) || 0);
    }).catch(function (err) { showToast('Error: ' + err.message); });
  });

  // ---------- Sugerencia de fondo de emergencia ----------
  function ocultarSugerenciaFondo() {
    document.getElementById('fondo-sugerencia').style.display = 'none';
  }

  function mostrarSugerenciaFondo(montoIngreso) {
    apiGet('config').then(function (c) {
      var meta = Number(c.metaFondoEmergencia) || 0;
      var ahorrado = Number(c.ahorradoFondoEmergencia) || 0;
      var tasa = c.tasaAhorroFondo === undefined ? 0.10 : Number(c.tasaAhorroFondo);

      if (meta <= 0 || ahorrado >= meta || montoIngreso <= 0) {
        ocultarSugerenciaFondo();
        return;
      }

      var faltante = meta - ahorrado;
      var sugerido = Math.min(montoIngreso * tasa, faltante);
      if (sugerido <= 0) { ocultarSugerenciaFondo(); return; }

      var box = document.getElementById('fondo-sugerencia');
      var texto = document.getElementById('fondo-sugerencia-texto');
      texto.textContent = 'Sugerencia: aparta ' + money(sugerido) + ' de este ingreso para tu fondo de emergencia. Te faltan ' + money(faltante) + ' para tu meta.';
      box.style.display = 'block';

      var btn = document.getElementById('btn-marcar-ahorrado');
      btn.onclick = function () {
        var nuevoAhorrado = Math.min(meta, ahorrado + sugerido);
        apiPost({ action: 'setConfig', data: { ahorradoFondoEmergencia: nuevoAhorrado } }).then(function () {
          showToast('Fondo de emergencia actualizado');
          ocultarSugerenciaFondo();
        }).catch(function (e) { showToast('Error: ' + e.message); });
      };
    }).catch(function () { ocultarSugerenciaFondo(); });
  }

  document.getElementById('form-gasto').addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(e.target);
    var data = {};
    fd.forEach(function (v, k) { data[k] = v; });
    apiPost({ action: 'add', sheet: 'Gastos', data: data }).then(function () {
      e.target.reset();
      loadLista('Gastos');
      showToast('Gasto guardado');
    }).catch(function (err) { showToast('Error: ' + err.message); });
  });

  // ---------- Ajustes ----------
  function loadAjustes() {
    apiGet('config').then(function (c) {
      document.getElementById('ajuste-tasa').value = c.tasaImpuesto;
      document.getElementById('ajuste-meta').value = c.metaFondoEmergencia;
      document.getElementById('ajuste-ahorrado').value = c.ahorradoFondoEmergencia;
      document.getElementById('ajuste-tasa-ahorro').value = c.tasaAhorroFondo === undefined ? 0.10 : c.tasaAhorroFondo;
    }).catch(function (e) { showToast('Error al cargar ajustes: ' + e.message); });
  }

  document.getElementById('btn-guardar-ajustes').addEventListener('click', function () {
    var data = {
      tasaImpuesto: Number(document.getElementById('ajuste-tasa').value) || 0,
      metaFondoEmergencia: Number(document.getElementById('ajuste-meta').value) || 0,
      ahorradoFondoEmergencia: Number(document.getElementById('ajuste-ahorrado').value) || 0,
      tasaAhorroFondo: Number(document.getElementById('ajuste-tasa-ahorro').value) || 0
    };
    apiPost({ action: 'setConfig', data: data }).then(function () {
      document.getElementById('ajustes-msg').textContent = 'Ajustes guardados.';
      showToast('Ajustes guardados');
    }).catch(function (e) { showToast('Error: ' + e.message); });
  });

  // ---------- Arranque ----------
  if (cfg) {
    showView('dashboard');
  } else {
    showView('setup');
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
