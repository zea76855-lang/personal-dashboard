/* 个人工作台 Dashboard — 按设计截图版式（六大区块 + 毛玻璃）
   数据 → 计算 → 渲染 单向；事件 → 改数据 → refreshAll()。 */
(function () {
  'use strict';

  var KEYS = {
    tasks: 'wb_pwd_task',
    objectives: 'wb_pwd_obj',
    krs: 'wb_pwd_kr',
    highlights: 'wb_pwd_hi',
    init: 'wb_pwd_init'
  };
  var state = { tasks: [], objectives: [], krs: [], highlights: [] };
  var reviewMode = 'month';   /* 复盘弹窗当前模式：month | quarter */

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function addDays(s, n) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return fmt(d); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function $(id) { return document.getElementById(id); }

  /* ===== 状态形状图标：○ 待开始 / ◐ 进行中 / ✓ 已完成 ===== */
  function statusIcon(status) {
    if (status === 'done') {
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="currentColor"/>' +
        '<path d="M7 12.5l3 3 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (status === 'doing') {
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
        '<path d="M12 3.5 A8.5 8.5 0 0 0 12 20.5 Z" fill="currentColor"/></svg>';
    }
    return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  }

  /* ===== 存储层 ===== */
  function load() {
    Object.keys(KEYS).forEach(function (k) {
      if (k === 'init') return;
      try { var raw = localStorage.getItem(KEYS[k]); state[k] = raw ? JSON.parse(raw) : []; if (!Array.isArray(state[k])) state[k] = []; }
      catch (e) { state[k] = []; }
    });
    // 字段兜底：旧数据 / 外部导入 / 损坏恢复都能用
    state.tasks = state.tasks.map(function (t) { return Object.assign({ id: uid(), title: '', status: 'todo', tags: [], date: '', priority: 1, oid: '', createdAt: Date.now() }, t || {}); });
    state.objectives = state.objectives.map(function (o) { return Object.assign({ id: uid(), title: '', quarter: '' }, o || {}); });
    state.krs = state.krs.map(function (k) { return Object.assign({ id: uid(), oid: '', title: '', progress: 0 }, k || {}); });
    state.highlights = state.highlights.map(function (h) { return Object.assign({ id: uid(), text: '', date: today() }, h || {}); });
    if (!localStorage.getItem(KEYS.init)) seed();
  }
  function save() { Object.keys(KEYS).forEach(function (k) { if (k !== 'init') localStorage.setItem(KEYS[k], JSON.stringify(state[k])); }); }

  function seed() {
    var t = today(), y = addDays(t, -1), y2 = addDays(t, -2);
    state.objectives = [
      { id: uid(), title: 'AI 增长中心', quarter: '2026 Q3' },
      { id: uid(), title: '会员运营', quarter: '2026 Q3' },
      { id: uid(), title: '客户增长', quarter: '2026 Q3' }
    ];
    var o1 = state.objectives[0].id, o2 = state.objectives[1].id, o3 = state.objectives[2].id;
    state.krs = [
      { id: uid(), oid: o1, title: '提升 AI 产品用户增长', current: 70, target: 100, unit: '%' },
      { id: uid(), oid: o1, title: '完成市场运营驾驶舱', current: 60, target: 100, unit: '%' },
      { id: uid(), oid: o1, title: '优化广告投放 ROI', current: 50, target: 100, unit: '%' },
      { id: uid(), oid: o2, title: '会员数增长', current: 80, target: 100, unit: '%' },
      { id: uid(), oid: o2, title: '会员活跃度提升', current: 70, target: 100, unit: '%' },
      { id: uid(), oid: o2, title: '会员权益优化', current: 60, target: 100, unit: '%' },
      { id: uid(), oid: o3, title: '新客户数增长', current: 50, target: 100, unit: '%' },
      { id: uid(), oid: o3, title: '客户留存率提升', current: 40, target: 100, unit: '%' },
      { id: uid(), oid: o3, title: '客户满意度提升', current: 60, target: 100, unit: '%' }
    ];
    /* PAD 关联 KR：取第 oi 个目标下第 ki 条 KR 的 id */
    var krOf = function (oi, ki) {
      var oid = [o1, o2, o3][oi];
      var ks = state.krs.filter(function (k) { return k.oid === oid; });
      return ks[ki] ? ks[ki].id : '';
    };
    state.tasks = [
      { id: uid(), title: 'AI市场运营驾驶舱三期规划', priority: 'P0', date: t, status: 'doing', oid: o1, krid: krOf(0, 1), progress: 70 },
      { id: uid(), title: '完成会员运营周报', priority: 'P1', date: t, status: 'todo', oid: o2, krid: krOf(1, 0), progress: 0 },
      { id: uid(), title: '回复供应商邮件并确认交期', priority: 'P2', date: t, status: 'todo', oid: '', krid: '', progress: 0 },
      { id: uid(), title: 'CRM 数据梳理', priority: 'P1', date: t, status: 'done', oid: o1, krid: krOf(0, 0), progress: 100 },
      { id: uid(), title: '市场运营驾驶舱方案评审', priority: 'P0', date: t, status: 'done', oid: o2, krid: krOf(1, 1), progress: 100 },
      { id: uid(), title: 'VOJH 模型优化', priority: 'P1', date: y, status: 'doing', oid: o3, krid: krOf(2, 0), progress: 40 },
      { id: uid(), title: '会员运营方案', priority: 'P1', date: y2, status: 'doing', oid: o2, krid: krOf(1, 2), progress: 60 }
    ].concat(generateMonthDone(o1, o2, o3)).concat(generateQuarterDone(o1, o2, o3));
    state.highlights = [
      'AI 市场运营驾驶舱三期方案顺利推进',
      'CRM 客户数据模型优化完成',
      '会员运营活动效果超预期'
    ];
    localStorage.setItem(KEYS.init, '1');
    save();
  }

  function restoreSample() {
    ['tasks', 'objectives', 'krs', 'highlights'].forEach(function (k) { localStorage.removeItem(KEYS[k]); state[k] = []; });
    seed();
    refreshAll(); toast('已载入示例数据');
  }

  function generateMonthDone(o1, o2, o3) {
    var titles = ['AI 驾驶舱 V2 上线', '会员体系梳理', '客户标签体系搭建', '财务月结', '增长实验 A 复盘', '客服 SOP 升级', '数据看板优化', '渠道合作沟通', '活动复盘报告', '运营月报输出', '客户访谈 (10 位)', '产品需求评审', '支付链路优化', '自动化脚本上线', '积分商城改版', '短信触达策略', '会员日活动策划', 'PUSH 触达实验', '新用户引导优化', '退订流程梳理', '邮件模板升级', '客户回访', '差旅合规检查', '周会主持', 'OKR 季度对齐', '竞品分析', '内容日历排期', '数据口径统一'];
    var now = new Date(), list = [];
    for (var i = 0; i < titles.length; i++) {
      var day = Math.max(1, now.getDate() - Math.floor(Math.random() * now.getDate()));
      var o = [o1, o2, o3][i % 3];
      list.push({ id: uid(), title: titles[i], priority: 'P1', date: fmt(new Date(now.getFullYear(), now.getMonth(), day)), status: 'done', oid: o, progress: 100 });
    }
    return list;
  }

  /* 本季度已过去月份的完成记录（供「季度复盘」的月度趋势使用） */
  function generateQuarterDone(o1, o2, o3) {
    var titles = ['季度目标拆解会', '官网改版上线', '渠道投放复盘', '新客引流方案', '客户分层模型', '季度预算盘点',
      '产品需求池梳理', '增长实验设计', '客服话术优化', '数据埋点补齐', '销售线索清洗', '行业报告输出',
      '会员权益调研', '落地页 A/B 测试', '线索转化分析', '季度 OKR 中期检查', '竞品功能对标', '客户成功案例',
      '渠道成本优化', '自动化报表上线', '老客召回活动', '产品培训直播', '季度风险排查', '跨部门对齐会'];
    var now = new Date(), q = Math.floor(now.getMonth() / 3), list = [], k = 0;
    for (var i = 0; i < 3; i++) {
      var m = q * 3 + i;
      if (m >= now.getMonth()) break;                 /* 只补本季度已过去的整月 */
      var n = 6 + Math.floor(Math.random() * 4);      /* 每月 6–9 项 */
      for (var j = 0; j < n; j++) {
        var day = 1 + Math.floor(Math.random() * 27);
        var o = [o1, o2, o3][k % 3]; k++;
        list.push({
          id: uid(), title: titles[k % titles.length], priority: 'P1',
          date: fmt(new Date(now.getFullYear(), m, day)), status: 'done', oid: o, progress: 100
        });
      }
    }
    return list;
  }

  /* ===== 计算层 ===== */
  function oidToTag(oid) { if (!oid) return ''; var i = state.objectives.findIndex(function (o) { return o.id === oid; }); return i >= 0 ? 'O' + (i + 1) : ''; }
  /* PAD 关联的是 KR：返回 {oTag:'O1', text:'O1·KR2', oid} —— oTag 沿用 O 配色，text 用于展示 */
  function krInfo(krid) {
    if (!krid) return null;
    var found = null;
    state.objectives.forEach(function (o, i) {
      if (found) return;
      var ks = state.krs.filter(function (k) { return k.oid === o.id; });
      var j = ks.findIndex(function (k) { return k.id === krid; });
      if (j >= 0) found = { oTag: 'O' + (i + 1), text: 'O' + (i + 1) + '·KR' + (j + 1), oid: o.id };
    });
    return found;
  }
  /* 兼容老数据：优先 krid，退回 oid */
  function taskTag(x) {
    var info = krInfo(x.krid);
    if (info) return info;
    var t = oidToTag(x.oid);
    return t ? { oTag: t, text: t, oid: x.oid } : null;
  }
  function krSelectHtml() {
    return state.objectives.map(function (o, i) {
      return state.krs.filter(function (k) { return k.oid === o.id; }).map(function (k, j) {
        return '<option value="' + k.id + '">O' + (i + 1) + '·KR' + (j + 1) + ' ' + esc(k.title) + '</option>';
      }).join('');
    }).join('');
  }
  function objProgress(o) { var list = state.krs.filter(function (k) { return k.oid === o.id; }); if (!list.length) return 0; var s = 0; list.forEach(function (k) { s += k.target > 0 ? clamp(k.current / k.target, 0, 1) : 0; }); return s / list.length; }
  function overallOkrProgress() { if (!state.objectives.length) return 0; var s = 0; state.objectives.forEach(function (o) { s += objProgress(o); }); return s / state.objectives.length; }

  /* ===== 渲染：今日待办 ===== */
  function renderTodo() {
    var t = today(), box = $('todoList');
    var list = state.tasks.filter(function (x) { return x.date <= t && x.status !== 'done'; })
      .sort(function (a, b) {
        var oa = a.date < t ? 0 : 1, ob = b.date < t ? 0 : 1; if (oa !== ob) return oa - ob;
        var pa = { P0: 0, P1: 1, P2: 2 }[a.priority] || 2, pb = { P0: 0, P1: 1, P2: 2 }[b.priority] || 2; return pa - pb;
      });
    if (!state.tasks.length) { box.innerHTML = '<div class="hint">还没有任务，点上方「＋ 新增待办」开始 ✍️</div>'; return; }
    if (!list.length) { box.innerHTML = '<div class="hint">今天都处理完啦，继续保持 ✨</div>'; return; }
    box.innerHTML = list.map(function (x) {
      var tag = oidToTag(x.oid);
      var pct = x.status === 'done' ? 100 : (typeof x.progress === 'number' ? x.progress : 0);
      return '<div class="todo-row' + (x.status === 'done' ? ' done' : '') + '" data-id="' + x.id + '">' +
        '<span class="status s-' + x.status + '" data-act="toggle">' + statusIcon(x.status) + '</span>' +
        '<span class="t-title" data-act="edit">' + esc(x.title) + '</span>' +
        '<span class="bar-wrap' + (x.status === 'done' ? ' green' : '') + '" data-act="progress"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + '%</span></span>' +
        (tag ? '<span class="tag ' + tag + '" data-act="okr">' + tag + '</span>' : '<span class="tag-none">—</span>') +
        '<span class="chev" data-act="tdetail" aria-label="查看详情">›</span></div>';
    }).join('');
  }

  /* ===== 渲染：今日完成（环图 + 图例） ===== */
  function renderTodayDone() {
    var t = today();
    var todayTasks = state.tasks.filter(function (x) { return x.date === t; });
    var done = todayTasks.filter(function (x) { return x.status === 'done'; }).length;
    var total = todayTasks.length;
    var p = total ? done / total : 0;
    var r = 50, c = 2 * Math.PI * r, off = c * (1 - p);
    $('ringSvg').innerHTML =
      '<circle cx="59" cy="59" r="' + r + '" fill="none" stroke="rgba(60,40,20,.12)" stroke-width="11"/>' +
      '<circle cx="59" cy="59" r="' + r + '" fill="none" stroke="#F97316" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 59 59)"/>';
    $('ringNum').textContent = done + '/' + total;

    var c2 = { doing: 0, todo: 0, done: 0 };
    todayTasks.forEach(function (x) { c2[x.status] = (c2[x.status] || 0) + 1; });
    $('legendBox').innerHTML =
      '<div class="legend-row"><span class="legend-dot" style="background:#10B981"></span>已完成<b>' + c2.done + '</b></div>' +
      '<div class="legend-row"><span class="legend-dot" style="background:#F97316"></span>进行中<b>' + c2.doing + '</b></div>' +
      '<div class="legend-row"><span class="legend-dot" style="background:#ADA79D"></span>待开始<b>' + c2.todo + '</b></div>';
  }

  /* ===== 渲染：本周 PAD ===== */
  function renderPAD() {
    var box = $('padList');
    // 本周 PAD：只取「关联了 KR」且「本周内、尚未完成」的重点任务（今日待办不强关联，不进入 PAD）
    var list = state.tasks.filter(function (x) { return (x.krid || x.oid) && x.status !== 'done' && x.date >= addDays(today(), -7); })
      .filter(function (v, i, a) { return a.findIndex(function (t) { return t.title === v.title; }) === i; })
      .sort(function (a, b) { return (b.progress || 0) - (a.progress || 0); }).slice(0, 5);
    if (!list.length) { box.innerHTML = '<div class="hint">本周还没有 PAD 项目</div>'; return; }
    box.innerHTML = list.map(function (x) {
      var pct = x.status === 'done' ? 100 : (x.progress || 0);
      var info = taskTag(x);
      return '<div class="pad-row" data-id="' + x.id + '">' +
        '<span class="pad-title">' + esc(x.title) + '</span>' +
        (info ? '<span class="tag ' + info.oTag + '" style="flex:0 0 auto">' + info.text + '</span>' : '') +
        '<span class="bar-wrap' + (x.status === 'done' ? ' green' : '') + '" data-act="progress"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + '%</span></span>' +
        '<span class="chev" data-act="open" aria-label="展开详情">›</span></div>';
    }).join('');
  }

  /* ===== 渲染：季度 OKR ===== */
  function renderOKR() {
    var opts = state.objectives.map(function (o, i) { return '<option value="' + o.id + '">O' + (i + 1) + ' ' + esc(o.title) + '</option>'; }).join('');
    var fk = document.querySelector('#formKr [name=oid]'); if (fk) fk.innerHTML = opts;
    var ft = document.querySelector('#formTask [name=oid]'); if (ft) ft.innerHTML = '<option value="">不关联 OKR</option>' + opts;
    var fp = document.querySelector('#formPad [name=krid]'); if (fp) fp.innerHTML = krSelectHtml() || '<option value="">（暂无 KR）</option>';

    var box = $('okrCols');
    if (!state.objectives.length) { box.innerHTML = '<div class="hint">先添加一个季度目标 O</div>'; }
    else {
      box.innerHTML = state.objectives.map(function (o, i) {
        var tag = 'O' + (i + 1), p = objProgress(o);
        var krs = state.krs.filter(function (k) { return k.oid === o.id; });
        var krHtml = krs.map(function (k, idx) {
          var kp = k.target > 0 ? clamp(k.current / k.target, 0, 1) : 0;
          return '<div class="kr-row"><span class="kr-no">KR' + (idx + 1) + '</span><span class="kr-title">' + esc(k.title) + '</span><span class="kr-pct">' + Math.round(kp * 100) + '%</span></div>';
        }).join('');
        return '<div class="okr-col ' + tag + '" data-oid="' + o.id + '">' +
          '<div class="oh"><span class="tag ' + tag + '">' + tag + '</span><span class="otitle">' + esc(o.title) + '</span><span class="obp">' + Math.round(p * 100) + '%</span></div>' +
          '<div class="obar2"><i style="width:' + (p * 100).toFixed(0) + '%"></i></div>' +
          (krHtml ? '<div class="kr-list">' + krHtml + '</div>' : '<div class="kr-list"><div class="hl-empty">暂无 KR</div></div>') +
          '</div>';
      }).join('');
    }
    var op = overallOkrProgress();
    $('okrTotalPct').textContent = Math.round(op * 100) + '%';
    $('okrTotalBar').style.width = (op * 100).toFixed(0) + '%';
  }

  /* ===== 渲染：月度复盘 ===== */
  function renderMonthly() {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
    $('monthLbl').textContent = m + '月';
    var ms = y + '-' + pad(m);
    var monthTasks = state.tasks.filter(function (x) { return x.date.indexOf(ms) === 0 && x.status === 'done'; });
    var key = monthTasks.filter(function (x) { return x.oid; }).length;
    $('monthDone').textContent = monthTasks.length;
    $('monthKey').textContent = key;
    $('monthOkr').textContent = Math.round(overallOkrProgress() * 100) + '%';

    var hl = $('hlList');
    if (!state.highlights.length) { hl.innerHTML = '<div class="hl-empty">还没有记录本月亮点，点「新增亮点」添加 ✨</div>'; return; }
    hl.innerHTML = state.highlights.map(function (h) {
      return '<div class="hl-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>' + esc(h) + '</span></div>';
    }).join('');
  }

  /* ===== 计算：月度复盘（供弹窗使用，纯计算不碰 DOM） ===== */
  function monthReview() {
    var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
    var ms = y + '-' + pad(m);
    var monthTasks = state.tasks.filter(function (x) { return (x.date || '').indexOf(ms) === 0; });
    var done = monthTasks.filter(function (x) { return x.status === 'done'; });
    var key = done.filter(function (x) { return x.oid; });
    var pending = monthTasks.filter(function (x) { return x.status !== 'done' && x.date <= today(); });
    var days = {}; done.forEach(function (x) { days[x.date] = 1; });
    var contrib = state.objectives.map(function (o, i) {
      return {
        tag: 'O' + (i + 1), title: o.title,
        count: done.filter(function (x) { return x.oid === o.id; }).length,
        p: objProgress(o)
      };
    });
    return {
      label: y + '年' + m + '月',
      done: done.length, key: key.length,
      okr: overallOkrProgress(),
      activeDays: Object.keys(days).length,
      contrib: contrib,
      pending: pending,
      highlights: state.highlights.slice()
    };
  }

  /* ===== 计算：季度复盘（供弹窗使用，纯计算不碰 DOM） ===== */
  function curQuarter() {
    var d = new Date(), y = d.getFullYear(), q = Math.floor(d.getMonth() / 3) + 1;
    return {
      y: y, q: q,
      s: y + '-' + pad((q - 1) * 3 + 1) + '-01',
      e: fmt(new Date(y, q * 3, 0)),
      start: new Date(y, (q - 1) * 3, 1),
      end: new Date(y, q * 3, 0)
    };
  }

  /* ===== 计算：周复盘（ISO 周：周一 ~ 周日） ===== */
  function curWeek() {
    var d = new Date();
    var dow = d.getDay() || 7;            /* Mon=1 ... Sun=7 */
    var mon = new Date(d);
    mon.setDate(d.getDate() - (dow - 1)); /* 回退到本周一 */
    var sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);        /* 推到本周日 */
    return {
      s: fmt(mon),
      e: fmt(sun),
      start: mon,
      end: sun,
      label: (mon.getMonth() + 1) + '/' + mon.getDate() + ' - ' + (sun.getMonth() + 1) + '/' + sun.getDate()
    };
  }

  function weekReview() {
    var w = curWeek();
    var wTasks = state.tasks.filter(function (x) { var d = x.date || ''; return d >= w.s && d <= w.e; });
    var done = wTasks.filter(function (x) { return x.status === 'done'; });
    var key = done.filter(function (x) { return x.krid || x.oid; });
    var pending = wTasks.filter(function (x) { return x.status !== 'done' && x.date <= today(); });
    var days = {}; done.forEach(function (x) { days[x.date] = 1; });

    /* PAD 完成度：本周内存在的 PAD 任务状态分布 */
    var padAll = wTasks.filter(function (x) { return x.krid || (x.priority === 'P0' && x.oid); });
    var padDone = padAll.filter(function (x) { return x.status === 'done'; }).length;
    var padTotal = padAll.length;

    var contrib = state.objectives.map(function (o, i) {
      return {
        tag: 'O' + (i + 1), title: o.title,
        count: done.filter(function (x) { return x.oid === o.id; }).length,
        p: objProgress(o)
      };
    });

    var dayMs = 86400000;
    var total = 7;
    var passed = Math.min(total, Math.floor((new Date() - w.start) / dayMs) + 1);

    return {
      label: w.label,
      done: done.length, key: key.length,
      okr: overallOkrProgress(),
      activeDays: Object.keys(days).length,
      contrib: contrib,
      pending: pending,
      padDone: padDone, padTotal: padTotal,
      passed: passed, total: total,
      remain: Math.max(0, total - passed),
      highlights: state.highlights.slice()
    };
  }
  function quarterReview() {
    var c = curQuarter();
    var qTasks = state.tasks.filter(function (x) { var d = x.date || ''; return d >= c.s && d <= c.e; });
    var done = qTasks.filter(function (x) { return x.status === 'done'; });
    var key = done.filter(function (x) { return x.oid; });
    var pending = qTasks.filter(function (x) { return x.status !== 'done' && x.date <= today(); });

    var months = [0, 1, 2].map(function (i) {
      var m = (c.q - 1) * 3 + 1 + i, ms = c.y + '-' + pad(m);
      return {
        label: m + '月',
        done: qTasks.filter(function (x) { return (x.date || '').indexOf(ms) === 0 && x.status === 'done'; }).length,
        cur: m === (new Date().getMonth() + 1)
      };
    });

    var objs = state.objectives.map(function (o, i) {
      var krs = state.krs.filter(function (k) { return k.oid === o.id; }).map(function (k, j) {
        return {
          no: 'KR' + (j + 1), title: k.title,
          p: k.target > 0 ? clamp(k.current / k.target, 0, 1) : 0,
          cur: k.current, tgt: k.target, unit: k.unit || ''
        };
      });
      return {
        tag: 'O' + (i + 1), title: o.title, quarter: o.quarter || '',
        p: objProgress(o),
        count: done.filter(function (x) { return x.oid === o.id; }).length,
        krs: krs
      };
    });

    var day = 86400000;
    var remain = Math.max(0, Math.round((c.end - new Date()) / day));
    var total = Math.round((c.end - c.start) / day) + 1;
    return {
      label: c.y + '年 Q' + c.q, quarter: 'Q' + c.q,
      done: done.length, key: key.length,
      okr: overallOkrProgress(),
      months: months, objs: objs, pending: pending,
      highlights: state.highlights.slice(),
      remain: remain, total: total,
      passed: Math.min(total, total - remain)
    };
  }

  /* ===== 图表：本季度月度完成趋势（内联 SVG 手写，零依赖） ===== */
  function quarterChart(months) {
    var W = 320, H = 128, padX = 10, baseY = 94, topY = 20;
    var max = 1;
    months.forEach(function (m) { if (m.done > max) max = m.done; });
    var slot = (W - padX * 2) / months.length, bw = Math.min(46, slot * 0.44);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rv-chart" role="img" aria-label="本季度月度完成趋势">' +
      '<defs><linearGradient id="qbar" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs>' +
      '<line x1="' + padX + '" y1="' + baseY + '" x2="' + (W - padX) + '" y2="' + baseY + '" stroke="rgba(60,40,20,.16)" stroke-width="1"/>';
    months.forEach(function (m, i) {
      var cx = padX + slot * i + slot / 2;
      var h = Math.round((m.done / max) * (baseY - topY));
      var y = baseY - h;
      s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) + '" height="' + Math.max(h, 3) + '" rx="6" fill="' + (m.cur ? 'url(#qbar)' : 'rgba(249,115,22,.42)') + '"/>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (y - 7) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="#2B2B2B">' + m.done + '</text>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (baseY + 21) + '" text-anchor="middle" font-size="12" fill="#7A746C">' + m.label + (m.cur ? '（本月）' : '') + '</text>';
    });
    return s + '</svg>';
  }

  /* ===== 渲染：复盘弹窗（月度 / 季度 共用） ===== */
  function barGradient(tag) {
    if (tag === 'O1') return 'linear-gradient(90deg,#3B82F6,#60A5FA)';
    if (tag === 'O2') return 'linear-gradient(90deg,#10B981,#34D399)';
    return 'linear-gradient(90deg,#F97316,#FB923C)';
  }
  function renderMonthReview() {
    var r = monthReview();
    $('reviewTitle').textContent = r.label + ' 复盘';

    var stats = '<div class="rv-stats">' +
      '<div class="rv-stat"><b>' + r.done + '</b><span>本月完成</span></div>' +
      '<div class="rv-stat"><b>' + r.key + '</b><span>重点成果</span></div>' +
      '<div class="rv-stat"><b>' + Math.round(r.okr * 100) + '%</b><span>OKR 进度</span></div>' +
      '<div class="rv-stat"><b>' + r.activeDays + '</b><span>有效产出天数</span></div>' +
      '</div>';

    var okrHtml = r.contrib.length ? r.contrib.map(function (c) {
      return '<div class="rv-okr">' +
        '<span class="tag ' + c.tag + '">' + c.tag + '</span>' +
        '<span class="rv-okr-name">' + esc(c.title) + '</span>' +
        '<span class="rv-okr-bar"><i style="width:' + (c.p * 100).toFixed(0) + '%;background:' + barGradient(c.tag) + '"></i></span>' +
        '<span class="rv-okr-n">' + c.count + ' 项 / ' + Math.round(c.p * 100) + '%</span>' +
        '</div>';
    }).join('') : '<div class="rv-empty">还没有季度目标</div>';

    var hlHtml = r.highlights.length ? r.highlights.map(function (h) {
      return '<div class="rv-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>' + esc(h) + '</span></div>';
    }).join('') : '<div class="rv-empty">本月还没有记录亮点</div>';

    var pdHtml = r.pending.length ? r.pending.slice(0, 8).map(function (x) {
      var late = x.date < today();
      return '<div class="rv-item' + (late ? ' warn' : '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.6M12 16.2v.01"/></svg>' +
        '<span>' + esc(x.title) + (late ? ' <span class="rv-late">· 逾期 ' + x.date.slice(5) + '</span>' : ' · ' + x.date.slice(5)) + '</span></div>';
    }).join('') : '<div class="rv-empty">本月没有遗留未完成的事项</div>';

    $('reviewBody').innerHTML = stats +
      '<div class="rv-sec"><div class="rv-sec-t">OKR 贡献分布</div>' + okrHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">本月亮点</div>' + hlHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">待改进 / 未完成（' + r.pending.length + '）</div>' + pdHtml + '</div>';
  }

  /* ---- 季度复盘 ---- */
  function renderQuarterReview() {
    var r = quarterReview();
    $('reviewTitle').textContent = r.label + ' 复盘';

    var stats = '<div class="rv-stats">' +
      '<div class="rv-stat"><b>' + r.done + '</b><span>本季完成</span></div>' +
      '<div class="rv-stat"><b>' + r.key + '</b><span>重点成果</span></div>' +
      '<div class="rv-stat"><b>' + Math.round(r.okr * 100) + '%</b><span>OKR 进度</span></div>' +
      '<div class="rv-stat"><b>' + r.remain + '</b><span>季度剩余天数</span></div>' +
      '</div>';

    /* ① 月度节奏 */
    var chart = quarterChart(r.months);
    var peak = 0, peakLabel = '';
    r.months.forEach(function (m) { if (m.done > peak) { peak = m.done; peakLabel = m.label; } });
    var trendNote = peak > 0
      ? '产出最高的是 <b>' + peakLabel + '</b>（' + peak + ' 项），季度共 ' + r.total + ' 天，已过 ' + r.passed + ' 天。'
      : '本季度还没有完成记录，季度共 ' + r.total + ' 天，已过 ' + r.passed + ' 天。';

    /* ② OKR + KR 达成明细 */
    var objHtml = r.objs.length ? r.objs.map(function (o) {
      var krHtml = o.krs.length ? o.krs.map(function (k) {
        return '<div class="rv-kr">' +
          '<span class="rv-kr-no">' + k.no + '</span>' +
          '<span class="rv-kr-title">' + esc(k.title) + '</span>' +
          '<span class="rv-kr-bar"><i style="width:' + (k.p * 100).toFixed(0) + '%;background:' + barGradient(o.tag) + '"></i></span>' +
          '<span class="rv-kr-n">' + k.cur + '/' + k.tgt + (k.unit ? ' ' + esc(k.unit) : '') + '</span>' +
          '</div>';
      }).join('') : '<div class="rv-empty">该目标下还没有 KR</div>';
      return '<div class="rv-obj">' +
        '<div class="rv-obj-h">' +
          '<span class="tag ' + o.tag + '">' + o.tag + '</span>' +
          '<span class="rv-obj-name">' + esc(o.title) + '</span>' +
          '<span class="rv-obj-pct">' + Math.round(o.p * 100) + '%</span>' +
        '</div>' +
        '<div class="rv-obj-bar"><i style="width:' + (o.p * 100).toFixed(0) + '%;background:' + barGradient(o.tag) + '"></i></div>' +
        krHtml +
        '<div class="rv-note">本季完成 ' + o.count + ' 项关联任务' + (o.quarter ? ' · ' + esc(o.quarter) : '') + '</div>' +
        '</div>';
    }).join('') : '<div class="rv-empty">还没有季度目标</div>';

    /* ③ 季度亮点 */
    var hlHtml = r.highlights.length ? r.highlights.map(function (h) {
      return '<div class="rv-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>' + esc(h) + '</span></div>';
    }).join('') : '<div class="rv-empty">本季度还没有记录亮点</div>';

    /* ④ 待改进 / 未完成 */
    var pdHtml = r.pending.length ? r.pending.slice(0, 10).map(function (x) {
      var late = x.date < today();
      return '<div class="rv-item' + (late ? ' warn' : '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.6M12 16.2v.01"/></svg>' +
        '<span>' + esc(x.title) + (late ? ' <span class="rv-late">· 逾期 ' + x.date.slice(5) + '</span>' : ' · ' + x.date.slice(5)) + '</span></div>';
    }).join('') : '<div class="rv-empty">本季度没有遗留未完成的事项</div>';

    $('reviewBody').innerHTML = stats +
      '<div class="rv-sec"><div class="rv-sec-t">月度节奏</div>' + chart + '<div class="rv-note">' + trendNote + '</div></div>' +
      '<div class="rv-sec"><div class="rv-sec-t">OKR 达成明细</div>' + objHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">本季亮点</div>' + hlHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">待改进 / 未完成（' + r.pending.length + '）</div>' + pdHtml + '</div>';
  }

  /* ---- 周复盘 ---- */
  function renderWeekReview() {
    var r = weekReview();
    $('reviewTitle').textContent = '本周 (' + r.label + ') 复盘';

    var stats = '<div class="rv-stats">' +
      '<div class="rv-stat"><b>' + r.done + '</b><span>本周完成</span></div>' +
      '<div class="rv-stat"><b>' + r.key + '</b><span>重点成果</span></div>' +
      '<div class="rv-stat"><b>' + r.padDone + '/' + r.padTotal + '</b><span>PAD 已完成</span></div>' +
      '<div class="rv-stat"><b>' + r.activeDays + '/7</b><span>活跃天数</span></div>' +
      '</div>';

    /* ② OKR 贡献分布 */
    var okrHtml = r.contrib.length ? r.contrib.map(function (c) {
      return '<div class="rv-okr">' +
        '<span class="tag ' + c.tag + '">' + c.tag + '</span>' +
        '<span class="rv-okr-name">' + esc(c.title) + '</span>' +
        '<span class="rv-okr-bar"><i style="width:' + (c.p * 100).toFixed(0) + '%;background:' + barGradient(c.tag) + '"></i></span>' +
        '<span class="rv-okr-n">' + c.count + ' 项 / ' + Math.round(c.p * 100) + '%</span>' +
        '</div>';
    }).join('') : '<div class="rv-empty">还没有季度目标</div>';

    /* ③ 本周亮点 */
    var hlHtml = r.highlights.length ? r.highlights.slice(0, 6).map(function (h) {
      return '<div class="rv-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg><span>' + esc(h) + '</span></div>';
    }).join('') : '<div class="rv-empty">本周还没有记录亮点</div>';

    /* ④ 待改进 / 未完成 */
    var pdHtml = r.pending.length ? r.pending.slice(0, 8).map(function (x) {
      var late = x.date < today();
      return '<div class="rv-item' + (late ? ' warn' : '') + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.6M12 16.2v.01"/></svg>' +
        '<span>' + esc(x.title) + (late ? ' <span class="rv-late">· 逾期 ' + x.date.slice(5) + '</span>' : ' · ' + x.date.slice(5)) + '</span></div>';
    }).join('') : '<div class="rv-empty">本周没有遗留未完成的事项</div>';

    /* ① 顶部进度条：本周已过天数 / 共 7 天 */
    var weekProgress = Math.round((r.passed / r.total) * 100);
    var progBar =
      '<div class="rv-obj" style="display:flex;align-items:center;gap:14px;padding:14px 16px;">' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:var(--muted);margin-bottom:7px;">' +
            '<span style="font-weight:800;color:var(--text);">本周已过 ' + r.passed + ' / 7 天</span>' +
            '<span>剩余 ' + r.remain + ' 天</span>' +
          '</div>' +
          '<div class="rv-obj-bar"><i style="width:' + weekProgress + '%;background:linear-gradient(90deg,#F97316,#FB923C);"></i></div>' +
        '</div>' +
      '</div>';

    $('reviewBody').innerHTML = stats + progBar +
      '<div class="rv-sec"><div class="rv-sec-t">OKR 贡献分布</div>' + okrHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">本周亮点</div>' + hlHtml + '</div>' +
      '<div class="rv-sec"><div class="rv-sec-t">待改进 / 未完成（' + r.pending.length + '）</div>' + pdHtml + '</div>';
  }

  /* 统一调度：按 mode 分发到对应渲染函数（渲染层内部单向，无回环） */
  function renderReview(mode) {
    if (mode === 'quarter') renderQuarterReview();
    else if (mode === 'week') renderWeekReview();
    else renderMonthReview();
  }

  function openReview(mode) {
    reviewMode = (mode === 'quarter') ? 'quarter' : (mode === 'week' ? 'week' : 'month');
    /* 三种 review 三种图标：周 = 奖章 badge、月 = 清单打钩、季度 = 趋势线 */
    if (reviewMode === 'week') {
      $('reviewIcon').innerHTML =
        '<path d="M12 2l2.4 4.6L19.6 7l-3.8 3.7.9 5.2L12 13.4 7.3 15.9l.9-5.2L4.4 7l5.2-.4L12 2z"/>' +
        '<circle cx="12" cy="9" r="2"/>';
    } else if (reviewMode === 'quarter') {
      $('reviewIcon').innerHTML =
        '<path d="M3 3v18h18"/>' +
        '<path d="M7 15l4-5 3 3 5-7"/>';
    } else {
      $('reviewIcon').innerHTML =
        '<path d="M9 11l3 3L22 4"/>' +
        '<path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>';
    }
    renderReview(reviewMode);
    $('reviewMask').classList.remove('hidden');
  }
  function closeReview() { $('reviewMask').classList.add('hidden'); }

  /* ===== 任务详情弹窗（PAD / 今日待办 共用） ===== */
  var pdCurId = null;
  function openPadDetail(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    pdCurId = id;
    $('pdTitleText').textContent = 'PAD 详情';
    renderPadDetail(t);
    $('pdMask').classList.remove('hidden');
  }
  /* 今日待办 chev 点击：复用同一个弹窗，只换标题 */
  function openTaskDetail(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    pdCurId = id;
    $('pdTitleText').textContent = '任务详情';
    renderPadDetail(t);
    $('pdMask').classList.remove('hidden');
  }
  function closePadDetail() { $('pdMask').classList.add('hidden'); pdCurId = null; }

  /* ===== 个人中心弹窗 ===== */
  function todayCount() { return state.tasks.filter(function (x) { return x.date === today(); }).length; }
  function overdueCount() { var t = today(); return state.tasks.filter(function (x) { return x.status !== 'done' && (x.date || '') < t; }).length; }
  function renderUserStats() {
    var done = state.tasks.filter(function (x) { return x.status === 'done'; }).length;
    var todo = state.tasks.filter(function (x) { return x.status !== 'done'; }).length;
    var lag = overdueCount();
    $('userStats').innerHTML =
      '<div class="user-stat"><b>' + done + '</b><span>已完成</span></div>' +
      '<div class="user-stat"><b>' + todo + '</b><span>进行中</span></div>' +
      '<div class="user-stat"><b style="' + (lag ? 'color:#DC2626' : '') + '">' + lag + '</b><span>逾期</span></div>';
  }
  function openUserModal() {
    renderUserStats();
    $('userMask').classList.remove('hidden');
  }
  function closeUserModal() { $('userMask').classList.add('hidden'); }

  function renderPadDetail(t) {
    var info = taskTag(t);
    var statusMap = [
      { v: 'todo',  lbl: '待办' },
      { v: 'doing', lbl: '进行中' },
      { v: 'done',  lbl: '已完成' }
    ];
    var stHtml = statusMap.map(function (s) {
      var cls = 'pd-st' + (t.status === s.v ? ' on is-' + s.v : '');
      return '<button class="' + cls + '" data-pd-st="' + s.v + '" type="button">' + s.lbl + '</button>';
    }).join('');

    var oid = (info && info.oid) || t.oid || '';
    var kr = null;
    if (t.krid) kr = state.krs.find(function (k) { return k.id === t.krid; });
    if (!kr && oid) {
      var ownedKrs = state.krs.filter(function (k) { return k.oid === oid; });
      if (ownedKrs.length) { kr = ownedKrs[0]; }
    }
    var krText = kr ? esc(kr.title || '') : '未关联 KR';
    var krJumpable = !!oid;

    $('pdBody').innerHTML =
      '<p class="pd-title">' + esc(t.title) + (info ? '<span class="tag ' + info.oTag + '">' + info.text + '</span>' : '') + '</p>' +
      '<div class="pd-row"><label>KR</label>' +
        '<span class="pd-val" style="color:' + (krJumpable ? 'var(--blue)' : 'var(--light)') + (krJumpable ? ';cursor:pointer;text-decoration:underline;' : '') + '" ' + (krJumpable ? 'data-pd-kr=""' : '') + '>' + krText + '</span></div>' +
      '<div class="pd-row"><label>日期</label><span class="pd-val">' + (t.date || '未设置') + '</span></div>' +
      '<div class="pd-row"><label>优先级</label><span class="pd-val">' + (t.priority || '—') + '</span></div>' +
      '<div class="pd-row"><label>进度</label><span class="pd-val">' + (t.progress || 0) + '%</span></div>' +
      '<div class="pd-row" style="flex-direction:column;align-items:stretch;gap:8px;"><label style="margin-bottom:4px;">状态</label>' +
        '<div class="pd-status-grp">' + stHtml + '</div></div>' +
      '<div class="pd-actions">' +
        '<button class="btn-save" data-pd-edit="1" type="button">编辑标题/进度</button>' +
        '<button class="pd-del" data-pd-del="1" type="button" title="删除此 PAD">删除</button>' +
      '</div>';
  }

  function applyPadStatus(id, newStatus) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    t.status = newStatus;
    if (newStatus === 'done') t.progress = 100;
    else if (newStatus === 'todo') t.progress = 0;
    save(); refreshAll();
    var tt = state.tasks.find(function (x) { return x.id === id; });
    if (tt) renderPadDetail(tt);
  }
  function deletePad(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    if (!window.confirm('删除此 PAD：「' + t.title + '」？\n\n此操作不可撤销。')) return;
    state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
    save(); refreshAll(); closePadDetail();
    toast('已删除 PAD');
  }

  function renderHeader() {
    var d = new Date(), wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    $('dateLabel').textContent = d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wd[d.getDay()];
  }

  function refreshAll() {
    renderHeader(); renderTodo(); renderTodayDone(); renderPAD(); renderOKR(); renderMonthly();
  }

  /* ===== 交互 ===== */
  function toast(msg) { var el = $('toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 1600); }

  function toggleDone(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    if (t.status === 'done') { t.status = 'todo'; t.progress = Math.min(t.progress || 0, 99); }
    else { t.status = 'done'; t.progress = 100; }
    save(); refreshAll(); toast(t.status === 'done' ? '已标记完成 ✓' : '已重新打开');
  }
  function editProgress(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    var v = prompt('设置进度（0–100）：', t.progress || 0); if (v === null) return;
    var n = clamp(parseInt(v, 10) || 0, 0, 100);
    t.progress = n; t.status = n >= 100 ? 'done' : (n > 0 ? 'doing' : 'todo');
    save(); refreshAll(); toast('进度已更新为 ' + n + '%');
  }
  function editTitle(id) {
    var t = state.tasks.find(function (x) { return x.id === id; }); if (!t) return;
    var v = prompt('编辑任务标题：', t.title); if (v === null) return; v = v.trim(); if (!v) return;
    t.title = v; save(); refreshAll(); toast('已保存');
  }
  function jumpToOKR(oid) {
    if (!oid) return;
    var col = document.querySelector('.okr-col[data-oid="' + oid + '"]');
    if (col) { col.scrollIntoView({ behavior: 'smooth', block: 'center' }); col.style.boxShadow = '0 0 0 2px var(--orange)'; setTimeout(function () { col.style.boxShadow = ''; }, 1200); toast('已定位关联 OKR'); }
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('.todo-row .status');
      if (toggle) { toggleDone(toggle.closest('.todo-row').dataset.id); return; }
      var prog = e.target.closest('[data-act="progress"]');
      if (prog) { var pr = prog.closest('[data-id]'); if (pr) editProgress(pr.dataset.id); return; }
      var openBtn = e.target.closest('[data-act="open"]');
      if (openBtn) { var rowEl = openBtn.closest('[data-id]'); if (rowEl) openPadDetail(rowEl.dataset.id); return; }
      var tdBtn = e.target.closest('[data-act="tdetail"]');
      if (tdBtn) { var tRow = tdBtn.closest('.todo-row'); if (tRow) openTaskDetail(tRow.dataset.id); return; }
      var edit = e.target.closest('[data-act="edit"]');
      if (edit) { editTitle(edit.closest('.todo-row').dataset.id); return; }
      var okrTag = e.target.closest('[data-act="okr"]');
      if (okrTag) { var row = okrTag.closest('.todo-row'); jumpToOKR(state.tasks.find(function (x) { return x.id === row.dataset.id; }).oid); return; }
      var more = e.target.closest('[data-action]');
      if (more) {
        var act = more.dataset.action;
        if (act === 'review') openReview('month');
        else if (act === 'qreview') openReview('quarter');
        else if (act === 'wreview') openReview('week');
        else toast('查看完整 PAD');
        return;
      }
    });

    // 新增按钮 → 切换表单
    $('addTaskBtn').addEventListener('click', function () { $('formTask').classList.toggle('hidden'); });
    $('addOkrBtn').addEventListener('click', function () {
      var fo = $('formObj'), fk = $('formKr'), open = fo.classList.contains('hidden');
      fo.classList.toggle('hidden'); fk.classList.toggle('hidden');
      if (open) fo.querySelector('input').focus();
    });
    $('addHlBtn').addEventListener('click', function () { $('formHl').classList.toggle('hidden'); });
    $('addPadBtn').addEventListener('click', function () { $('formPad').classList.toggle('hidden'); });
    $('formPad').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      if (!this.krid.value) { toast('PAD 必须关联一条 KR'); return; }
      var pr = clamp(parseInt(this.progress.value, 10) || 0, 0, 100);
      var info = krInfo(this.krid.value);
      state.tasks.push({ id: uid(), title: v, priority: 'P1', krid: this.krid.value, oid: info ? info.oid : '', date: this.date.value || today(), status: pr >= 100 ? 'done' : (pr > 0 ? 'doing' : 'todo'), progress: pr, pad: true });
      this.reset(); if (this.date) this.date.value = today(); save(); refreshAll(); this.classList.add('hidden'); toast('已添加 PAD');
    });

    // 任务表单
    $('formTask').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      var pr = clamp(parseInt(this.progress.value, 10) || 0, 0, 100);
      state.tasks.push({ id: uid(), title: v, priority: this.priority.value, oid: this.oid.value || '', date: this.date.value || today(), status: pr >= 100 ? 'done' : (pr > 0 ? 'doing' : 'todo'), progress: pr });
      this.reset(); this.date.value = today(); save(); refreshAll(); this.classList.add('hidden'); toast('已添加任务');
    });
    // 目标表单
    $('formObj').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      state.objectives.push({ id: uid(), title: v, quarter: this.quarter.value.trim() });
      this.reset(); save(); refreshAll(); this.classList.add('hidden'); toast('目标已添加');
    });
    // KR 表单
    $('formKr').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.title.value.trim(); if (!v) return;
      if (!this.oid.value) { toast('请先添加目标'); return; }
      state.krs.push({ id: uid(), oid: this.oid.value, title: v, current: parseFloat(this.current.value) || 0, target: parseFloat(this.target.value) || 0, unit: this.unit.value.trim() || '%' });
      this.reset(); save(); refreshAll(); this.classList.add('hidden'); toast('KR 已添加');
    });
    // 亮点表单
    $('formHl').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = this.text.value.trim(); if (!v) return;
      state.highlights.push(v); this.reset(); save(); refreshAll(); this.classList.add('hidden'); toast('亮点已添加');
    });

    // 备份 / 清除 / 头像
    $('exportBtn').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'workbench-backup-' + today() + '.json'; a.click(); toast('已导出备份');
    });
    $('clearBtn').addEventListener('click', function () {
      if (!confirm('确定清除所有数据（任务 / OKR / 亮点）吗？清除后不会自动恢复示例数据。')) return;
      ['tasks', 'objectives', 'krs', 'highlights'].forEach(function (k) { localStorage.removeItem(KEYS[k]); state[k] = []; });
      refreshAll(); toast('已清空所有数据');
    });
    $('restoreBtn').addEventListener('click', function () {
      if (!confirm('载入示例数据会覆盖当前内容，确定继续吗？')) return;
      restoreSample();
    });
    /* 头像：打开「个人中心」弹窗，整合原底部 foot 的数据管理功能 */
    $('avatar').addEventListener('click', openUserModal);

    // 月度复盘弹窗：三种关闭方式（关闭按钮 / 点遮罩空白处 / ESC）
    $('reviewClose').addEventListener('click', closeReview);
    $('reviewMask').addEventListener('click', function (e) { if (e.target === this) closeReview(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeReview(); closePadDetail(); closeUserModal(); } });

    // PAD 详情弹窗：关闭按钮 / 点遮罩空白处 / ESC（在 keydown 里已统一处理）
    $('pdClose').addEventListener('click', closePadDetail);
    $('pdMask').addEventListener('click', function (e) { if (e.target === this) closePadDetail(); });

    // 个人中心弹窗：关闭按钮 / 点遮罩空白处
    $('userClose').addEventListener('click', closeUserModal);
    $('userMask').addEventListener('click', function (e) { if (e.target === this) closeUserModal(); });
    /* 用户弹窗内的数据管理按钮 */
    $('userBody').addEventListener('click', function (e) {
      var act = e.target.closest('[data-ua]');
      if (!act) return;
      var ua = act.dataset.ua;
      if (ua === 'export') { closeUserModal(); $('exportBtn').click(); }
      else if (ua === 'clear') {
        if (!confirm('确定清除所有数据（任务 / OKR / 亮点）吗？清除后不会自动恢复示例数据。')) return;
        ['tasks', 'objectives', 'krs', 'highlights'].forEach(function (k) { localStorage.removeItem(KEYS[k]); state[k] = []; });
        refreshAll(); closeUserModal(); toast('已清空所有数据');
      }
      else if (ua === 'restore') {
        if (!confirm('载入示例数据会覆盖当前内容，确定继续吗？')) return;
        closeUserModal(); restoreSample();
      }
    });

    // PAD 详情内部交互（事件代理：状态切换 / 编辑 / 删除 / 跳 OKR）
    $('pdBody').addEventListener('click', function (e) {
      var st = e.target.closest('[data-pd-st]');
      if (st && pdCurId) { applyPadStatus(pdCurId, st.dataset.pdSt); return; }
      var edit = e.target.closest('[data-pd-edit]');
      if (edit && pdCurId) {
        var id = pdCurId;
        closePadDetail();
        editTitle(id);
        setTimeout(function () { editProgress(id); }, 80);
        return;
      }
      var del = e.target.closest('[data-pd-del]');
      if (del && pdCurId) { deletePad(pdCurId); return; }
      if (e.target.closest('[data-pd-kr]') && pdCurId) {
        var tt = state.tasks.find(function (x) { return x.id === pdCurId; });
        if (tt && tt.oid) { closePadDetail(); jumpToOKR(tt.oid); }
      }
    });
  }

  function init() {
    load();
    var di = document.querySelector('#formTask [name=date]'); if (di && !di.value) di.value = today();
    var pd = document.querySelector('#formPad [name=date]'); if (pd && !pd.value) pd.value = today();
    bind(); refreshAll();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
