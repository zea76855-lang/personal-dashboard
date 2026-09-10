/* 个人工作台 Chrome 扩展 — 逻辑层
   架构：数据层(load/save) → 计算层(过滤/聚合) → 渲染层(renderX)
   严格单向：事件 → 改数据 → refreshAll() → 各 render 独立读最新数据。
   渲染函数之间互不调用，杜绝递归。 */
(function () {
  'use strict';

  var KEYS = {
    mustdo: 'wb_pws_mustdo',
    logs: 'wb_pws_mustdo_log',
    tasks: 'wb_pws_tasks',
    objectives: 'wb_pws_objectives',
    krs: 'wb_pws_krs',
    init: 'wb_pws_init'
  };

  var BLUE = '#2F6BFF';
  var state = { mustdo: [], logs: [], tasks: [], objectives: [], krs: [] };
  var editingTaskId = null;

  var ICONS = {
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.8 1.3-3.8C8.5 8 9 9 9 9s.5-3 3-7z"/></svg>'
  };

  /* ---------- 工具 ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function addDays(dateStr, n) {
    var p = dateStr.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function $(id) { return document.getElementById(id); }

  /* ---------- 存储层 ---------- */
  function load() {
    Object.keys(KEYS).forEach(function (k) {
      if (k === 'init') return;
      try {
        var raw = localStorage.getItem(KEYS[k]);
        state[k] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(state[k])) state[k] = [];
      } catch (e) { state[k] = []; }
    });
    if (!localStorage.getItem(KEYS.init)) seed();
  }
  function save() {
    Object.keys(KEYS).forEach(function (k) {
      if (k === 'init') return;
      localStorage.setItem(KEYS[k], JSON.stringify(state[k]));
    });
  }
  function seed() {
    var t = today(), y = addDays(t, -1);
    state.mustdo = [
      { id: uid(), title: '晨间复盘 10 分钟', time: '09:00', active: true },
      { id: uid(), title: '运动 30 分钟', time: '19:00', active: true },
      { id: uid(), title: '阅读 20 页', time: '21:00', active: true }
    ];
    state.logs = [];
    state.tasks = [
      { id: uid(), title: '整理本周周报', note: '汇总完成项与阻塞点', priority: 'P1', date: t, status: 'doing' },
      { id: uid(), title: '回复海外客户邮件', note: '', priority: 'P0', date: t, status: 'todo' },
      { id: uid(), title: '提交差旅报销单', note: '', priority: 'P2', date: y, status: 'todo' }
    ];
    state.objectives = [{ id: uid(), title: '提升交付效率', quarter: '2026 Q3', weight: 1 }];
    var o1 = state.objectives[0].id;
    state.krs = [
      { id: uid(), oid: o1, title: '自动化报表上线', start: 0, current: 60, target: 100, unit: '%', weight: 1 },
      { id: uid(), oid: o1, title: '需求交付周期', start: 10, current: 6, target: 4, unit: '天', weight: 1 }
    ];
    localStorage.setItem(KEYS.init, '1');
    save();
  }

  /* ---------- 计算层 ---------- */
  function doneToday(mid) {
    return state.logs.some(function (l) { return l.mustDoId === mid && l.date === today() && l.done; });
  }
  function getStreak(mid) {
    var d = new Date(); var s = 0;
    if (!doneToday(mid)) d = new Date(d.getTime() - 864e5);
    while (state.logs.some(function (l) { return l.mustDoId === mid && l.date === fmt(d) && l.done; })) {
      s++; d = new Date(d.getTime() - 864e5);
      if (s > 9999) break;
    }
    return s;
  }
  function krProgress(kr) {
    if (kr.target === kr.start) return 0;
    return clamp((kr.current - kr.start) / (kr.target - kr.start), 0, 1);
  }
  function objProgress(o) {
    var list = state.krs.filter(function (k) { return k.oid === o.id; });
    if (!list.length) return 0;
    var wsum = 0, acc = 0;
    list.forEach(function (k) { var w = k.weight || 1; wsum += w; acc += krProgress(k) * w; });
    return wsum ? acc / wsum : 0;
  }

  /* ---------- 渲染层（互不调用） ---------- */
  function renderToday() {
    var t = today(), box = $('todayList'), items = [];
    state.tasks.forEach(function (x) {
      if (x.status === 'done') return;
      if (x.date < t) items.push({ cls: 'over', text: x.title, tag: '逾期', act: 'complete-task', id: x.id });
      else if (x.date === t) items.push({ cls: '', text: x.title, tag: x.priority, act: 'complete-task', id: x.id });
    });
    state.mustdo.forEach(function (m) {
      if (m.active && !doneToday(m.id)) items.push({ cls: '', text: m.title, tag: '必做', act: 'checkin-must', id: m.id });
    });
    if (!items.length) { box.innerHTML = '<div class="empty">今天都处理完啦，继续保持 🎉</div>'; return; }
    box.innerHTML = items.map(function (it) {
      return '<div class="titem ' + it.cls + '"><span class="tt">' + esc(it.text) + '</span>' +
        '<span class="tag">' + esc(it.tag) + '</span>' +
        '<button class="mini" data-action="' + it.act + '" data-id="' + it.id + '">' +
        (it.act === 'checkin-must' ? '打卡' : '完成') + '</button></div>';
    }).join('');
  }

  function renderMust() {
    var box = $('mustList');
    if (!state.mustdo.length) { box.innerHTML = '<div class="hint">还没有常规任务，添加一个开始固化习惯。</div>'; return; }
    box.innerHTML = state.mustdo.map(function (m) {
      var done = doneToday(m.id), st = getStreak(m.id);
      return '<div class="mitem ' + (done ? 'done' : '') + '">' +
        '<span class="check" data-action="toggle-must" data-id="' + m.id + '">' + ICONS.check + '</span>' +
        '<span class="mt">' + esc(m.title) + (m.time ? ' <span style="color:var(--muted);font-size:11px">· ' + esc(m.time) + '</span>' : '') + '</span>' +
        (st > 0 ? '<span class="streak">' + ICONS.flame + '连续 ' + st + ' 天</span>' : '') +
        '<button class="icon-btn" data-action="del-must" data-id="' + m.id + '" title="删除"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
        '</div>';
    }).join('');
  }

  function renderWork() {
    var t = today(), box = $('taskList');
    var list = state.tasks.filter(function (x) { return x.date <= t || x.status !== 'done'; })
      .sort(function (a, b) { return (a.date < b.date ? -1 : a.date > b.date ? 1 : 0); });
    if (!list.length) { box.innerHTML = '<div class="hint">暂无任务，在上方添加今天的工作吧。</div>'; return; }
    box.innerHTML = list.map(function (x) {
      var over = x.date < t && x.status !== 'done';
      return '<div class="tbitem ' + (over ? 'over' : '') + '">' +
        '<span class="pri ' + x.priority + '">' + x.priority + '</span>' +
        '<div class="tbmain"><div class="tbt">' + esc(x.title) + '</div>' +
        (x.note ? '<div class="tbn">' + esc(x.note) + '</div>' : '') +
        '<div class="tbd">' + x.date + ' · ' + statusText(x.status) + '</div></div>' +
        '<div class="tbact">' +
        '<button class="btn sm ' + (x.status === 'done' ? 'ghost' : 'green') + '" data-action="complete-task" data-id="' + x.id + '">' + (x.status === 'done' ? '重开' : '完成') + '</button>' +
        '<button class="btn sm ghost" data-action="edit-task" data-id="' + x.id + '">编辑</button>' +
        '<button class="btn sm ghost" data-action="del-task" data-id="' + x.id + '">删</button>' +
        '</div></div>';
    }).join('');
  }

  function statusText(s) { return s === 'done' ? '已完成' : s === 'doing' ? '进行中' : '待办'; }

  function renderProgress() {
    var t = today();
    var due = state.tasks.filter(function (x) { return x.date <= t; });
    var done = due.filter(function (x) { return x.status === 'done'; }).length;
    var p = due.length ? done / due.length : 0;
    $('ring').innerHTML = ringSVG(p) + '<span class="pct">' + Math.round(p * 100) + '%</span>';
    $('ringLegend').innerHTML = '累计任务 <b>' + due.length + '</b> 项<br>已完成 <b style="color:var(--green)">' + done + '</b> 项<br>待处理 <b style="color:var(--red)">' + (due.length - done) + '</b> 项';

    var cols = { todo: [], doing: [], done: [] };
    state.tasks.forEach(function (x) { (cols[x.status] || cols.todo).push(x); });
    var names = { todo: '待办', doing: '进行中', done: '已完成' };
    $('kanban').innerHTML = Object.keys(cols).map(function (k) {
      var chips = cols[k].map(function (x) {
        return '<div class="kchip"><span class="kpri pri ' + x.priority + '">' + x.priority + '</span>' + esc(x.title) +
          '<div class="kcol-actions">' +
          (k !== 'doing' ? '<button data-action="status" data-id="' + x.id + '" data-to="doing">进行中</button>' : '') +
          (k !== 'done' ? '<button data-action="status" data-id="' + x.id + '" data-to="done">完成</button>' : '') +
          (k !== 'todo' ? '<button data-action="status" data-id="' + x.id + '" data-to="todo">退回</button>' : '') +
          '</div></div>';
      }).join('') || '<div style="font-size:11px;color:var(--muted);text-align:center;padding:8px 0">空</div>';
      return '<div class="col"><h5><span>' + names[k] + '</span><span>' + cols[k].length + '</span></h5>' + chips + '</div>';
    }).join('');
  }

  function ringSVG(p) {
    var r = 32, c = 2 * Math.PI * r, off = c * (1 - p);
    return '<svg width="74" height="74" viewBox="0 0 74 74">' +
      '<circle class="ring-track" cx="37" cy="37" r="32" fill="none" stroke-width="7"/>' +
      '<circle class="ring-val" cx="37" cy="37" r="32" fill="none" stroke-width="7" stroke-linecap="round" ' +
      'stroke-dasharray="' + c + '" stroke-dashoffset="' + off + '" transform="rotate(-90 37 37)"/></svg>';
  }

  function renderOKR() {
    var sel = document.querySelector('#formKr [name=oid]');
    if (sel) sel.innerHTML = state.objectives.map(function (o) { return '<option value="' + o.id + '">' + esc(o.title) + '</option>'; }).join('');
    var box = $('okrList');
    if (!state.objectives.length) { box.innerHTML = '<div class="hint">先添加一个目标 O。</div>'; return; }
    box.innerHTML = state.objectives.map(function (o) {
      var krs = state.krs.filter(function (k) { return k.oid === o.id; });
      var op = objProgress(o);
      var krHtml = krs.length ? krs.map(function (k) {
        var p = krProgress(k);
        var lo = Math.min(k.start, k.target), hi = Math.max(k.start, k.target);
        return '<div class="kr" data-kr-row="' + k.id + '">' +
          '<div class="krmain"><div class="krt">' + esc(k.title) + '</div>' +
          '<div class="krv">' + k.current + k.unit + ' / 目标 ' + k.target + k.unit + '</div>' +
          '<div class="krbar"><i style="width:' + (p * 100) + '%"></i></div></div>' +
          '<input type="range" min="' + lo + '" max="' + hi + '" step="0.1" value="' + k.current + '" data-action="kr-range" data-id="' + k.id + '" />' +
          '<span class="krpct">' + Math.round(p * 100) + '%</span>' +
          '<button class="icon-btn" data-action="del-kr" data-id="' + k.id + '" title="删除"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>' +
          '</div>';
      }).join('') : '<div class="hint">该目标暂无关键结果，在上方添加。</div>';
      return '<div class="obj" data-obj-row="' + o.id + '">' +
        '<div class="ot">' + esc(o.title) + ' <button class="icon-btn" data-action="del-obj" data-id="' + o.id + '" title="删除目标"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>' +
        '<div class="om">' + esc(o.quarter || '') + '</div>' +
        '<div class="obar"><i style="width:' + (op * 100) + '%"></i></div>' +
        '<div class="opct">对齐进度 ' + Math.round(op * 100) + '%</div>' + krHtml + '</div>';
    }).join('');
  }

  function refreshAll() {
    renderToday();
    renderMust();
    renderWork();
    renderProgress();
    renderOKR();
  }

  /* ---------- 事件处理 ---------- */
  function toggleMust(id) {
    var has = state.logs.filter(function (l) { return l.mustDoId === id && l.date === today(); })[0];
    if (has) has.done = !has.done;
    else state.logs.push({ id: uid(), mustDoId: id, date: today(), done: true });
    save(); refreshAll();
  }
  function completeTask(id) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    t.status = t.status === 'done' ? 'todo' : 'done';
    save(); refreshAll(); toast(t.status === 'done' ? '已标记完成' : '已重新打开');
  }
  function setStatus(id, to) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return; t.status = to; save(); refreshAll();
  }
  function delMust(id) { state.mustdo = state.mustdo.filter(function (m) { return m.id !== id; }); save(); refreshAll(); }
  function delTask(id) { state.tasks = state.tasks.filter(function (x) { return x.id !== id; }); save(); refreshAll(); }
  function delObj(id) { state.objectives = state.objectives.filter(function (o) { return o.id !== id; }); state.krs = state.krs.filter(function (k) { return k.oid !== id; }); save(); refreshAll(); }
  function delKr(id) { state.krs = state.krs.filter(function (k) { return k.id !== id; }); save(); refreshAll(); }

  function editTask(id) {
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    editingTaskId = id;
    var f = $('formTask');
    f.title.value = t.title; f.note.value = t.note || '';
    f.priority.value = t.priority; f.date.value = t.date;
    f.querySelector('button[type=submit]').textContent = '更新任务';
    window.scrollTo(0, 0); toast('编辑中：修改后点更新');
  }

  function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('active', p.id === 'panel-' + tab); });
  }

  function doExport() {
    var data = { mustdo: state.mustdo, logs: state.logs, tasks: state.tasks, objectives: state.objectives, krs: state.krs };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pws-backup-' + today() + '.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('已导出备份');
  }
  function doImport(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || typeof d !== 'object') throw 0;
        ['mustdo', 'logs', 'tasks', 'objectives', 'krs'].forEach(function (k) { if (Array.isArray(d[k])) state[k] = d[k]; });
        save(); refreshAll(); toast('导入成功，数据已恢复');
      } catch (e) { toast('导入失败：文件格式不正确'); }
    };
    r.readAsText(file);
  }
  function doClear() {
    if (!window.confirm('确定清空全部数据？此操作不可撤销。')) return;
    Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    state = { mustdo: [], logs: [], tasks: [], objectives: [], krs: [] };
    refreshAll(); toast('已清空，可重新添加');
  }

  var toastTimer;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  /* ---------- 绑定（事件委托，避免内联与重复绑定） ---------- */
  function bind() {
    $('logo').innerHTML = ICONS.logo;
    $('dateLabel').textContent = today() + ' ' + weekday();
    var greet = document.getElementById('greeting');
    if (greet) greet.textContent = greetingText();

    var tabsEl = document.getElementById('tabs');
    if (tabsEl) tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return; switchTab(b.dataset.tab);
    });

    var sf = document.getElementById('searchForm');
    if (sf) sf.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = this.q.value.trim();
      if (q) window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    });

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]'); if (!el) return;
      var a = el.dataset.action, id = el.dataset.id;
      if (a === 'export') return doExport();
      if (a === 'import') return $('importFile').click();
      if (a === 'clear') return doClear();
      if (a === 'toggle-must' || a === 'checkin-must') return toggleMust(id);
      if (a === 'complete-task') return completeTask(id);
      if (a === 'status') return setStatus(id, el.dataset.to);
      if (a === 'del-must') return delMust(id);
      if (a === 'edit-task') return editTask(id);
      if (a === 'del-task') return delTask(id);
      if (a === 'del-obj') return delObj(id);
      if (a === 'del-kr') return delKr(id);
    });

    document.addEventListener('input', function (e) {
      var el = e.target.closest('[data-action="kr-range"]'); if (!el) return;
      var kr = state.krs.filter(function (k) { return k.id === el.dataset.id; })[0];
      if (!kr) return;
      kr.current = parseFloat(el.value) || 0; save(); updateOkrProgressDOM(kr);
    });

    $('formMust').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      state.mustdo.push({ id: uid(), title: v, time: '', active: true });
      this.reset(); save(); refreshAll(); toast('已添加常规任务');
    });

    $('formTask').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      if (editingTaskId) {
        var t = state.tasks.filter(function (x) { return x.id === editingTaskId; })[0];
        if (t) { t.title = v; t.note = this.note.value.trim(); t.priority = this.priority.value; t.date = this.date.value; }
        editingTaskId = null; this.querySelector('button[type=submit]').textContent = '保存任务';
      } else {
        state.tasks.push({ id: uid(), title: v, note: this.note.value.trim(), priority: this.priority.value, date: this.date.value || today(), status: 'todo' });
      }
      this.reset(); this.date.value = today(); save(); refreshAll(); toast('已保存');
    });

    $('formObj').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      state.objectives.push({ id: uid(), title: v, quarter: this.quarter.value.trim(), weight: 1 });
      this.reset(); save(); refreshAll(); toast('已添加目标');
    });

    $('formKr').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      if (!this.oid.value) { toast('请先添加目标'); return; }
      state.krs.push({
        id: uid(), oid: this.oid.value, title: v,
        start: parseFloat(this.start.value) || 0, current: parseFloat(this.current.value) || 0,
        target: parseFloat(this.target.value) || 0, unit: this.unit.value.trim() || '', weight: 1
      });
      this.reset(); save(); refreshAll(); toast('已添加关键结果');
    });

    $('importFile').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) doImport(e.target.files[0]);
      e.target.value = '';
    });
  }

  function updateOkrProgressDOM(kr) {
    var p = krProgress(kr);
    var row = document.querySelector('[data-kr-row="' + kr.id + '"]');
    if (row) {
      row.querySelector('.krbar > i').style.width = (p * 100) + '%';
      row.querySelector('.krpct').textContent = Math.round(p * 100) + '%';
      row.querySelector('.krv').textContent = kr.current + kr.unit + ' / 目标 ' + kr.target + kr.unit;
    }
    var o = state.objectives.filter(function (x) { return x.id === kr.oid; })[0];
    if (!o) return;
    var op = objProgress(o);
    var orow = document.querySelector('[data-obj-row="' + o.id + '"]');
    if (orow) {
      orow.querySelector('.obar > i').style.width = (op * 100) + '%';
      orow.querySelector('.opct').textContent = '对齐进度 ' + Math.round(op * 100) + '%';
    }
  }

  function weekday() {
    var w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return w[new Date().getDay()];
  }
  function greetingText() {
    var h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 12) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  function init() {
    load();
    var di = document.querySelector('#formTask [name=date]');
    if (di) di.value = today();
    bind();
    refreshAll();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
