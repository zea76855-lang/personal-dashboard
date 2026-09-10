/* 个人工作台 · 移动端
   分层：数据层(Store) → 计算层(Computed，纯函数) → 视图层(Views) → 调度(Switch)
   铁律：视图函数之间不互调；数据变更统一走 commit()；Tab 切换不销毁 DOM、保留滚动位置。
   与桌面版 dashboard.js 共用同一套 localStorage KEY，数据互通。 */
(function () {
  'use strict';

  /* ==========================================================
     0. 工具
     ========================================================== */
  var KEYS = {
    tasks: 'wb_pwd_task',
    objectives: 'wb_pwd_obj',
    krs: 'wb_pwd_kr',
    highlights: 'wb_pwd_hi',
    init: 'wb_pwd_init'
  };
  var state = { tasks: [], objectives: [], krs: [], highlights: [] };

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function today() { return fmt(new Date()); }
  function addDays(s, n) { var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + n); return fmt(d); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ==========================================================
     1. 数据层：只负责读写与持久化，不碰 DOM
     ========================================================== */
  var Store = {
    load: function () {
      Object.keys(KEYS).forEach(function (k) {
        if (k === 'init') return;
        try {
          var raw = localStorage.getItem(KEYS[k]);
          state[k] = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(state[k])) state[k] = [];
        } catch (e) { state[k] = []; }
      });
      if (!localStorage.getItem(KEYS.init)) { Store.seed(); }
    },
    save: function () {
      Object.keys(KEYS).forEach(function (k) {
        if (k !== 'init') localStorage.setItem(KEYS[k], JSON.stringify(state[k]));
      });
    },
    /* 示例数据：覆盖「今日 / 本周 / 本月 / 本季度」四个时间尺度，保证每个页面都有内容 */
    seed: function () {
      var t = today(), y = addDays(t, -1), y2 = addDays(t, -2);
      state.objectives = [
        { id: uid(), title: 'AI 增长中心', quarter: '2026 Q3' },
        { id: uid(), title: '会员运营', quarter: '2026 Q3' },
        { id: uid(), title: '客户增长', quarter: '2026 Q3' }
      ];
      var o1 = state.objectives[0].id, o2 = state.objectives[1].id, o3 = state.objectives[2].id;
      state.krs = [
        [70, o1, '提升 AI 产品用户增长'], [60, o1, '完成市场运营驾驶舱'], [50, o1, '优化广告投放 ROI'],
        [80, o2, '会员数增长'], [70, o2, '会员活跃度提升'], [60, o2, '会员权益优化'],
        [50, o3, '新客户数增长'], [40, o3, '客户留存率提升'], [60, o3, '客户满意度提升']
      ].map(function (a) { return { id: uid(), oid: a[1], title: a[2], current: a[0], target: 100, unit: '%' }; });
      /* 取第 oi 个目标下的第 ki 条 KR 的 id（PAD 关联 KR，不直接关联 O） */
      var krOf = function (oi, ki) {
        var oid = [o1, o2, o3][oi];
        var ks = state.krs.filter(function (k) { return k.oid === oid; });
        return ks[ki] ? ks[ki].id : '';
      };

      state.tasks = [
        { id: uid(), title: 'AI 市场运营驾驶舱三期规划', priority: 'P0', date: t, status: 'doing', oid: o1, krid: krOf(0, 1), progress: 70 },
        { id: uid(), title: '完成会员运营周报', priority: 'P1', date: t, status: 'todo', oid: o2, krid: krOf(1, 0), progress: 0 },
        { id: uid(), title: '回复供应商邮件并确认交期', priority: 'P2', date: t, status: 'todo', oid: '', krid: '', progress: 0 },
        { id: uid(), title: 'CRM 数据梳理', priority: 'P1', date: t, status: 'done', oid: o1, krid: krOf(0, 0), progress: 100 },
        { id: uid(), title: '市场运营驾驶舱方案评审', priority: 'P0', date: t, status: 'done', oid: o2, krid: krOf(1, 1), progress: 100 },
        { id: uid(), title: 'VOJH 模型优化', priority: 'P1', date: y, status: 'doing', oid: o3, krid: krOf(2, 0), progress: 40 },
        { id: uid(), title: '会员运营方案', priority: 'P1', date: y2, status: 'doing', oid: o2, krid: krOf(1, 2), progress: 60 }
      ].concat(Store._monthDone(o1, o2, o3)).concat(Store._quarterDone(o1, o2, o3));

      state.highlights = ['AI 市场运营驾驶舱三期方案顺利推进', 'CRM 客户数据模型优化完成', '会员运营活动效果超预期'];
      localStorage.setItem(KEYS.init, '1');
      Store.save();
    },
    _monthDone: function (o1, o2, o3) {
      var titles = ['AI 驾驶舱 V2 上线', '会员体系梳理', '客户标签体系搭建', '财务月结', '增长实验 A 复盘',
        '客服 SOP 升级', '数据看板优化', '渠道合作沟通', '活动复盘报告', '运营月报输出', '客户访谈 (10 位)',
        '产品需求评审', '支付链路优化', '自动化脚本上线', '积分商城改版', '短信触达策略', '邮件模板升级', '客户回访'];
      var now = new Date(), list = [];
      for (var i = 0; i < titles.length; i++) {
        var day = Math.max(1, now.getDate() - Math.floor(Math.random() * now.getDate()));
        list.push({
          id: uid(), title: titles[i], priority: 'P1',
          date: fmt(new Date(now.getFullYear(), now.getMonth(), day)), status: 'done',
          oid: [o1, o2, o3][i % 3], progress: 100
        });
      }
      return list;
    },
    /* 本季度已过去的整月，供季度趋势图使用（不影响今日待办 / PAD / 月度统计） */
    _quarterDone: function (o1, o2, o3) {
      var titles = ['季度目标拆解会', '官网改版上线', '渠道投放复盘', '新客引流方案', '客户分层模型', '季度预算盘点',
        '产品需求池梳理', '增长实验设计', '客服话术优化', '数据埋点补齐', '销售线索清洗', '行业报告输出',
        '会员权益调研', '落地页 A/B 测试', '线索转化分析', '季度 OKR 中期检查', '竞品功能对标', '客户成功案例',
        '渠道成本优化', '自动化报表上线', '老客召回活动', '产品培训直播', '季度风险排查', '跨部门对齐会'];
      var now = new Date(), q = Math.floor(now.getMonth() / 3), list = [], k = 0;
      for (var i = 0; i < 3; i++) {
        var m = q * 3 + i;
        if (m >= now.getMonth()) break;
        var n = 6 + Math.floor(Math.random() * 4);
        for (var j = 0; j < n; j++) {
          var o = [o1, o2, o3][k % 3]; k++;
          list.push({
            id: uid(), title: titles[k % titles.length], priority: 'P1',
            date: fmt(new Date(now.getFullYear(), m, 1 + Math.floor(Math.random() * 27))),
            status: 'done', oid: o, progress: 100
          });
        }
      }
      return list;
    },
    /* 清空业务数据但保留 init 标记，避免刷新后又被 seed 填回 */
    clear: function () {
      ['tasks', 'objectives', 'krs', 'highlights'].forEach(function (k) { state[k] = []; });
      Store.save();
    },
    snapshot: function () { return JSON.stringify(state, null, 2); },
    restore: function (obj) {
      if (!obj || typeof obj !== 'object') throw new Error('格式不正确');
      ['tasks', 'objectives', 'krs', 'highlights'].forEach(function (k) {
        if (!Array.isArray(obj[k])) throw new Error('缺少字段：' + k);
      });
      state.tasks = obj.tasks; state.objectives = obj.objectives;
      state.krs = obj.krs; state.highlights = obj.highlights;
      localStorage.setItem(KEYS.init, '1');
      Store.save();
    }
  };

  /* ==========================================================
     2. 计算层：纯函数，只读 state，不碰 DOM
     ========================================================== */
  var Computed = {
    oidToTag: function (oid) {
      if (!oid) return '';
      var i = state.objectives.findIndex(function (o) { return o.id === oid; });
      return i >= 0 ? 'O' + (i + 1) : '';
    },
    /* KR 标签：返回 {oTag:'O1', text:'O1·KR2'}。
       oTag 用于沿用 O 的配色，text 用于展示——PAD 关联的是 KR 而不是 O。 */
    krInfo: function (krid) {
      if (!krid) return null;
      var found = null;
      state.objectives.forEach(function (o, i) {
        if (found) return;
        var ks = state.krs.filter(function (k) { return k.oid === o.id; });
        var j = ks.findIndex(function (k) { return k.id === krid; });
        if (j >= 0) found = { oTag: 'O' + (i + 1), text: 'O' + (i + 1) + '·KR' + (j + 1), oid: o.id };
      });
      return found;
    },
    /* 兼容老数据：有 krid 用 krid，没有则退回 oid */
    taskTag: function (x) {
      var info = Computed.krInfo(x.krid);
      if (info) return info;
      var t = Computed.oidToTag(x.oid);
      return t ? { oTag: t, text: t, oid: x.oid } : null;
    },
    objProgress: function (o) {
      var list = state.krs.filter(function (k) { return k.oid === o.id; });
      if (!list.length) return 0;
      var s = 0;
      list.forEach(function (k) { s += k.target > 0 ? clamp(k.current / k.target, 0, 1) : 0; });
      return s / list.length;
    },
    overallOkr: function () {
      if (!state.objectives.length) return 0;
      var s = 0;
      state.objectives.forEach(function (o) { s += Computed.objProgress(o); });
      return s / state.objectives.length;
    },
    /* 今日未完成：今天该做 + 之前遗留（逾期自动顺延到今天，不会凭空消失） */
    todayPending: function () {
      var t = today();
      return state.tasks.filter(function (x) { return x.date <= t && x.status !== 'done'; })
        .sort(function (a, b) {
          var oa = a.date < t ? 0 : 1, ob = b.date < t ? 0 : 1;
          if (oa !== ob) return oa - ob;
          var pa = { P0: 0, P1: 1, P2: 2 }[a.priority] || 2, pb = { P0: 0, P1: 1, P2: 2 }[b.priority] || 2;
          return pa - pb;
        });
    },
    todayDone: function () {
      var t = today();
      return state.tasks.filter(function (x) { return x.date === t && x.status === 'done'; });
    },
    /* 今日统计口径 = 今日任务（含逾期顺延过来的）里的完成情况，
       不把本季度历史完成量算进来，否则完成率会被历史数据稀释成无意义的数字 */
    todayStats: function () {
      var t = today();
      var pend = Computed.todayPending();                       /* 今日该做 + 逾期顺延 */
      var done = Computed.todayDone();                          /* 今天完成的 */
      var total = pend.length + done.length;
      return {
        total: total,
        done: done.length,
        late: pend.filter(function (x) { return x.date < t; }).length,
        pct: total ? done.length / total : 0
      };
    },
    weekRange: function () {
      var d = new Date(), off = (d.getDay() + 6) % 7;          /* 周一为一周起点 */
      var s = new Date(d); s.setDate(d.getDate() - off);
      var e = new Date(s); e.setDate(s.getDate() + 6);
      return { s: fmt(s), e: fmt(e) };
    },
    /* 本周 PAD：必须关联 KR（KR 归属某个 O）且未完成（今日待办不强关联，PAD 必须关联） */
    weekPAD: function () {
      var r = Computed.weekRange();
      return state.tasks.filter(function (x) {
        return (x.krid || x.oid) && x.status !== 'done' && x.date <= r.e;
      }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    },
    monthReview: function () {
      var d = new Date(), ms = d.getFullYear() + '-' + pad(d.getMonth() + 1);
      var mt = state.tasks.filter(function (x) { return (x.date || '').indexOf(ms) === 0; });
      var done = mt.filter(function (x) { return x.status === 'done'; });
      return {
        label: d.getFullYear() + '年' + (d.getMonth() + 1) + '月',
        month: d.getMonth() + 1,
        done: done.length,
        key: done.filter(function (x) { return x.oid; }).length,
        okr: Computed.overallOkr(),
        highlights: state.highlights.slice()
      };
    },
    curQuarter: function () {
      var d = new Date(), y = d.getFullYear(), q = Math.floor(d.getMonth() / 3) + 1;
      return {
        y: y, q: q,
        s: y + '-' + pad((q - 1) * 3 + 1) + '-01',
        e: fmt(new Date(y, q * 3, 0)),
        start: new Date(y, (q - 1) * 3, 1),
        end: new Date(y, q * 3, 0)
      };
    },
    quarterReview: function () {
      var c = Computed.curQuarter();
      var qt = state.tasks.filter(function (x) { var d = x.date || ''; return d >= c.s && d <= c.e; });
      var done = qt.filter(function (x) { return x.status === 'done'; });
      var months = [0, 1, 2].map(function (i) {
        var m = (c.q - 1) * 3 + 1 + i, ms = c.y + '-' + pad(m);
        return {
          label: m + '月', cur: m === (new Date().getMonth() + 1),
          done: qt.filter(function (x) { return (x.date || '').indexOf(ms) === 0 && x.status === 'done'; }).length
        };
      });
      var objs = state.objectives.map(function (o, i) {
        return {
          tag: 'O' + (i + 1), title: o.title, quarter: o.quarter || '',
          p: Computed.objProgress(o),
          count: done.filter(function (x) { return x.oid === o.id; }).length,
          krs: state.krs.filter(function (k) { return k.oid === o.id; }).map(function (k, j) {
            return {
              no: 'KR' + (j + 1), title: k.title,
              p: k.target > 0 ? clamp(k.current / k.target, 0, 1) : 0,
              cur: k.current, tgt: k.target, unit: k.unit || ''
            };
          })
        };
      });
      var day = 86400000;
      var remain = Math.max(0, Math.round((c.end - new Date()) / day));
      var total = Math.round((c.end - c.start) / day) + 1;
      return {
        label: c.y + '年 Q' + c.q,
        done: done.length, key: done.filter(function (x) { return x.oid; }).length,
        okr: Computed.overallOkr(),
        months: months, objs: objs,
        pending: qt.filter(function (x) { return x.status !== 'done' && x.date <= today(); }),
        highlights: state.highlights.slice(),
        remain: remain, total: total, passed: Math.min(total, total - remain)
      };
    },
    counts: function () {
      return {
        tasks: state.tasks.length, obj: state.objectives.length,
        krs: state.krs.length, hl: state.highlights.length
      };
    }
  };

  /* ==========================================================
     3. 视图层：每个渲染函数只负责自己那一页，互不调用
     ========================================================== */
  var ICON = {
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6.1L12 16.8 6.7 19.7l1.1-6.1L3.4 9.4l6-.8z"/></svg>',
    alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.6M12 16.2v.01"/></svg>'
  };

  function barColor(tag) {
    if (tag === 'O1') return 'linear-gradient(90deg,#3B82F6,#60A5FA)';
    if (tag === 'O2') return 'linear-gradient(90deg,#10B981,#34D399)';
    return 'linear-gradient(90deg,#F97316,#FB923C)';
  }

  /* ---- 首页 ---- */
  function renderHome() {
    var st = Computed.todayStats();

    /* 完成率进度环（内联 SVG 手写） */
    var R = 52, C = 2 * Math.PI * R, off = C * (1 - st.pct);
    $('homeRing').innerHTML =
      '<defs><linearGradient id="rg2" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="rgba(60,40,20,.12)" stroke-width="11"/>' +
      '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="url(#rg2)" stroke-width="11" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>';

    $('homePct').textContent = Math.round(st.pct * 100) + '%';
    $('homeDone').textContent = st.done;
    $('homeTotal').textContent = st.total;
    $('homeLate').textContent = st.late;
    $('tbPct').textContent = '今日 ' + Math.round(st.pct * 100) + '%';

    /* 今日待办 */
    var pend = Computed.todayPending();
    $('todoCnt').textContent = pend.length;
    $('todoList').innerHTML = pend.length ? pend.map(function (x) {
      var late = x.date < today();
      var tag = Computed.oidToTag(x.oid);
      return '<div class="todo" data-id="' + x.id + '">' +
        '<button class="chk" data-act="toggle" aria-label="切换完成"></button>' +
        '<div class="t-body">' +
          '<div class="t-title">' + esc(x.title) + '</div>' +
          '<div class="t-meta">' +
            '<span class="tag ' + (x.priority || 'P1') + '">' + (x.priority || 'P1') + '</span>' +
            (tag ? '<span class="tag ' + tag + '">' + tag + '</span>' : '') +
            (late ? '<span class="t-date late">逾期 ' + x.date.slice(5) + '</span>' : '<span class="t-date">今天</span>') +
          '</div>' +
        '</div>' +
        '<button class="del" data-act="del" aria-label="删除">' + ICON.trash + '</button>' +
      '</div>';
    }).join('') : '<div class="hint">今天没有待办，点上方输入框添加一条 ✍️</div>';

    /* 今日已完成 */
    var dn = Computed.todayDone();
    $('doneCnt').textContent = dn.length;
    $('doneList').innerHTML = dn.length ? dn.map(function (x) {
      var tag = Computed.oidToTag(x.oid);
      return '<div class="todo done" data-id="' + x.id + '">' +
        '<button class="chk on" data-act="toggle" aria-label="取消完成">' + ICON.check + '</button>' +
        '<div class="t-body"><div class="t-title">' + esc(x.title) + '</div>' +
        (tag ? '<div class="t-meta"><span class="tag ' + tag + '">' + tag + '</span></div>' : '') +
        '</div>' +
        '<button class="del" data-act="del" aria-label="删除">' + ICON.trash + '</button>' +
      '</div>';
    }).join('') : '<div class="hint">还没有完成的事项</div>';
  }

  /* ---- 第二页：本周 PAD + 月度复盘 ---- */
  function renderPad() {
    var list = Computed.weekPAD();
    $('padList').innerHTML = list.length ? list.map(function (x) {
      var info = Computed.taskTag(x);
      var cls = info ? info.oTag : '';
      var tag = info ? info.text : '';
      return '<div class="pad" data-id="' + x.id + '">' +
        '<div class="pad-t">' +
          (tag ? '<span class="tag ' + cls + '">' + tag + '</span>' : '') +
          '<span class="pad-title">' + esc(x.title) + '</span>' +
          '<span class="pad-pct">' + (x.progress || 0) + '%</span>' +
        '</div>' +
        '<div class="bar"><i style="width:' + clamp(x.progress || 0, 0, 100) + '%;background:' + barColor(cls) + '"></i></div>' +
        '<div class="pad-m">' +
          '<span>' + x.date.slice(5) + '</span><span>·</span><span>' + (x.status === 'doing' ? '进行中' : '待开始') + '</span>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="hint">本周还没有关联 KR 的重点事项，点右上角 ＋ 新增</div>';

    var m = Computed.monthReview();
    $('monthStats').innerHTML =
      '<div class="gs"><b>' + m.done + '</b><span>本月完成</span></div>' +
      '<div class="gs"><b>' + m.key + '</b><span>重点成果</span></div>' +
      '<div class="gs"><b>' + Math.round(m.okr * 100) + '%</b><span>OKR 进度</span></div>';
    $('monthHl').innerHTML = m.highlights.length
      ? m.highlights.map(function (h) { return '<div class="li">' + ICON.star + '<span>' + esc(h) + '</span></div>'; }).join('')
      : '<div class="hint">本月还没有记录亮点</div>';
  }

  /* ---- 第三页：季度复盘 ---- */
  function quarterChart(months) {
    var W = 340, H = 132, padX = 12, baseY = 96, topY = 22, max = 1;
    months.forEach(function (m) { if (m.done > max) max = m.done; });
    var slot = (W - padX * 2) / months.length, bw = Math.min(48, slot * 0.44);
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="q-chart" role="img" aria-label="本季度月度完成趋势">' +
      '<defs><linearGradient id="qb" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#FB923C"/><stop offset="1" stop-color="#F97316"/></linearGradient></defs>' +
      '<line x1="' + padX + '" y1="' + baseY + '" x2="' + (W - padX) + '" y2="' + baseY + '" stroke="rgba(60,40,20,.16)" stroke-width="1"/>';
    months.forEach(function (m, i) {
      var cx = padX + slot * i + slot / 2;
      var h = Math.round((m.done / max) * (baseY - topY));
      var y = baseY - h;
      s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + y + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(h, 3) + '" rx="6" fill="' + (m.cur ? 'url(#qb)' : 'rgba(249,115,22,.40)') + '"/>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (y - 7) + '" text-anchor="middle" font-size="12.5" font-weight="700" fill="#2B2B2B">' + m.done + '</text>' +
        '<text x="' + cx.toFixed(1) + '" y="' + (baseY + 21) + '" text-anchor="middle" font-size="12" fill="#7A746C">' + m.label + (m.cur ? '（本月）' : '') + '</text>';
    });
    return s + '</svg>';
  }

  function renderOkr() {
    var r = Computed.quarterReview();
    $('okrTitle').textContent = r.label + ' 复盘';
    $('qStats').style.gridTemplateColumns = 'repeat(2,1fr)';
    $('qStats').innerHTML =
      '<div class="gs"><b>' + r.done + '</b><span>本季完成</span></div>' +
      '<div class="gs"><b>' + r.key + '</b><span>重点成果</span></div>' +
      '<div class="gs"><b>' + Math.round(r.okr * 100) + '%</b><span>OKR 进度</span></div>' +
      '<div class="gs"><b>' + r.remain + '</b><span>剩余天数</span></div>';

    $('qChart').innerHTML = quarterChart(r.months);
    var peak = 0, peakL = '';
    r.months.forEach(function (m) { if (m.done > peak) { peak = m.done; peakL = m.label; } });
    $('qNote').textContent = peak > 0
      ? '产出最高的是 ' + peakL + '（' + peak + ' 项）。季度共 ' + r.total + ' 天，已过 ' + r.passed + ' 天，剩 ' + r.remain + ' 天。'
      : '本季度还没有完成记录。季度共 ' + r.total + ' 天，已过 ' + r.passed + ' 天。';

    $('qObjs').innerHTML = r.objs.length ? r.objs.map(function (o) {
      var kr = o.krs.length ? o.krs.map(function (k) {
        return '<div class="q-kr"><span class="q-kr-no">' + k.no + '</span>' +
          '<span class="q-kr-title">' + esc(k.title) + '</span>' +
          '<span class="q-kr-bar"><i style="width:' + (k.p * 100).toFixed(0) + '%;background:' + barColor(o.tag) + '"></i></span>' +
          '<span class="q-kr-n">' + k.cur + '/' + k.tgt + (k.unit ? ' ' + esc(k.unit) : '') + '</span></div>';
      }).join('') : '<div class="hint">该目标下还没有 KR</div>';
      return '<div class="q-obj">' +
        '<div class="q-obj-h"><span class="tag ' + o.tag + '">' + o.tag + '</span>' +
        '<span class="q-obj-name">' + esc(o.title) + '</span>' +
        '<span class="q-obj-pct">' + Math.round(o.p * 100) + '%</span></div>' +
        '<div class="bar" style="margin-bottom:7px"><i style="width:' + (o.p * 100).toFixed(0) + '%;background:' + barColor(o.tag) + '"></i></div>' +
        kr +
        '<div class="note">本季完成 ' + o.count + ' 项关联任务' + (o.quarter ? ' · ' + esc(o.quarter) : '') + '</div>' +
      '</div>';
    }).join('') : '<div class="hint">还没有季度目标</div>';

    $('qHl').innerHTML = r.highlights.length
      ? r.highlights.map(function (h) { return '<div class="li">' + ICON.star + '<span>' + esc(h) + '</span></div>'; }).join('')
      : '<div class="hint">本季度还没有记录亮点</div>';

    $('qPending').innerHTML = r.pending.length ? r.pending.slice(0, 10).map(function (x) {
      var late = x.date < today();
      return '<div class="li' + (late ? ' warn' : '') + '">' + ICON.alert +
        '<span>' + esc(x.title) + (late ? ' <span class="li-late">· 逾期 ' + x.date.slice(5) + '</span>' : ' · ' + x.date.slice(5)) + '</span></div>';
    }).join('') : '<div class="hint">本季度没有遗留未完成的事项</div>';
  }

  /* ---- 第四页：我的 ---- */
  function renderMe() {
    var c = Computed.counts();
    var box = $('meStats');
    box.style.gridTemplateColumns = 'repeat(2,1fr)';
    box.innerHTML =
      '<div class="gs"><b>' + c.tasks + '</b><span>任务</span></div>' +
      '<div class="gs"><b>' + c.obj + '</b><span>目标 O</span></div>' +
      '<div class="gs"><b>' + c.krs + '</b><span>关键结果 KR</span></div>' +
      '<div class="gs"><b>' + c.hl + '</b><span>亮点</span></div>';
  }

  /* ==========================================================
     4. 调度：页渲染 + Tab 切换（保留滚动位置）
     ========================================================== */
  var PAGES = ['home', 'pad', 'okr', 'me'];
  var VIEW = { home: renderHome, pad: renderPad, okr: renderOkr, me: renderMe };
  var PAGE_EL = { home: 'pageHome', pad: 'pagePad', okr: 'pageOkr', me: 'pageMe' };
  var dirty = { home: true, pad: true, okr: true, me: true };
  var scrollPos = { home: 0, pad: 0, okr: 0, me: 0 };
  var cur = 'home';

  function pageOf(name) { return $(PAGE_EL[name]); }

  /* 渲染指定页：渲染前后保存/恢复 scrollTop，保证重渲染也不跳位 */
  function renderPage(name) {
    var el = pageOf(name);
    var top = el.scrollTop;
    VIEW[name]();
    el.scrollTop = top;
    dirty[name] = false;
  }

  /* 数据变更统一入口：持久化 → 标记全部失效 → 只重渲染当前可见页 */
  function commit() {
    Store.save();
    PAGES.forEach(function (n) { dirty[n] = true; });
    renderPage(cur);
  }

  function switchTab(name) {
    if (!PAGE_EL[name] || name === cur) return;
    scrollPos[cur] = pageOf(cur).scrollTop;      /* 离开前记住滚动位置 */

    pageOf(cur).classList.remove('is-active');
    cur = name;
    var el = pageOf(cur);
    el.classList.add('is-active');

    if (dirty[cur]) renderPage(cur);             /* 数据变过才重渲染，否则原样呈现 */
    el.scrollTop = scrollPos[cur] || 0;          /* 回到上次位置 */

    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      b.classList.toggle('is-active', b.dataset.tab === name);
    });
  }

  /* ==========================================================
     5. 通用 UI：Toast + 二次确认 Sheet
     ========================================================== */
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  var pendingFn = null;
  function confirmSheet(opt, fn) {
    $('cfTitle').textContent = opt.title || '确认操作';
    $('cfDesc').textContent = opt.desc || '';
    var ok = $('cfOk');
    ok.textContent = opt.okText || '确认';
    ok.className = 'sbtn ' + (opt.danger === false ? 'primary' : 'danger');
    pendingFn = fn || null;
    $('confirmMask').classList.remove('hidden');
  }
  function closeSheet() {
    $('confirmMask').classList.add('hidden');
    pendingFn = null;
  }

  /* ==========================================================
     6. 业务动作
     ========================================================== */
  function addTask(title) {
    state.tasks.push({
      id: uid(), title: title, priority: 'P1', date: today(),
      status: 'todo', oid: '', progress: 0
    });
    commit();
    toast('已添加待办');
  }
  function toggleTask(id) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    if (t.status === 'done') { t.status = 'todo'; t.progress = Math.min(t.progress || 0, 99); }
    else { t.status = 'done'; t.progress = 100; }
    commit();
    toast(t.status === 'done' ? '已完成 ✓' : '已重新打开');
  }
  function delTask(id) {
    var t = state.tasks.find(function (x) { return x.id === id; });
    if (!t) return;
    confirmSheet({
      title: '删除这条待办？', desc: '「' + t.title + '」将被移除，此操作不可撤销。', okText: '删除'
    }, function () {
      state.tasks = state.tasks.filter(function (x) { return x.id !== id; });
      commit();
      toast('已删除');
    });
  }
  function addPad(title, krid) {
    var info = Computed.krInfo(krid);
    state.tasks.push({
      id: uid(), title: title, priority: 'P1', date: today(),
      status: 'doing', krid: krid || '', oid: info ? info.oid : '', progress: 0
    });
    commit();
    toast(info ? '已新增 PAD，关联 ' + info.text : '已新增 PAD（未关联 KR）');
  }
  /* 把 KR 列表填进下拉：按 O 分组，展示 O1·KR1 标题 */
  function fillKrSelect(sel) {
    if (!sel) return;
    var html = state.objectives.map(function (o, i) {
      var ks = state.krs.filter(function (k) { return k.oid === o.id; });
      return ks.map(function (k, j) {
        return '<option value="' + k.id + '">O' + (i + 1) + '·KR' + (j + 1) + ' ' + esc(k.title) + '</option>';
      }).join('');
    }).join('');
    sel.innerHTML = html || '<option value="">（暂无 KR，请先在 OKR 页添加）</option>';
  }

  function doExport() {
    var text = Store.snapshot();
    var blob = new Blob([text], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'workbench-backup-' + today() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    toast('已导出备份文件');
  }
  function doBackup() {
    var text = Store.snapshot();
    /* 优先用异步剪贴板；file:// 等非安全上下文降级到 execCommand */
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast('备份已复制到剪贴板');
      }, function () { fallbackCopy(text); });
    } else { fallbackCopy(text); }
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? '备份已复制到剪贴板' : '复制失败，请改用「数据导出」');
  }
  function doClear() {
    confirmSheet({
      title: '清空所有数据？',
      desc: '任务 / OKR / 亮点将被全部删除，且无法恢复。清空后不会自动填充示例数据。',
      okText: '确认清空'
    }, function () {
      Store.clear();
      commit();
      toast('数据已清空');
    });
  }
  function doRestore() {
    confirmSheet({
      title: '载入示例数据？',
      desc: '当前所有内容会被示例数据覆盖，建议先「数据导出」备份。',
      okText: '覆盖并载入', danger: false
    }, function () {
      Store.seed();
      commit();
      toast('已载入示例数据');
    });
  }
  function doImport(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        Store.restore(JSON.parse(String(fr.result)));
        commit();
        toast('已从备份恢复');
      } catch (e) {
        toast('恢复失败：文件格式不正确');
      }
    };
    fr.onerror = function () { toast('读取文件失败'); };
    fr.readAsText(file);
  }

  /* ==========================================================
     7. 事件绑定（全部事件委托，无内联 handler）
     ========================================================== */
  function bind() {
    /* 底部 Tab 导航 */
    $('tabbar').addEventListener('click', function (e) {
      var b = e.target.closest('.tab');
      if (b) switchTab(b.dataset.tab);
    });

    /* 头像 → 进入「我的」（修复：原实现会触发导出下载） */
    $('avatar').addEventListener('click', function () { switchTab('me'); });

    /* 顶栏问候 / 日期 */
    var d = new Date(), hh = d.getHours();
    $('tbHi').textContent = hh < 6 ? '夜深了' : hh < 11 ? '早上好' : hh < 14 ? '中午好' : hh < 18 ? '下午好' : '晚上好';
    var wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    $('tbDate').textContent = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + wd[d.getDay()];

    /* 新增待办 */
    $('addForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('addInput').value.trim();
      if (!v) { toast('先写点什么吧'); return; }
      addTask(v);
      $('addInput').value = '';
      $('addInput').blur();
    });

    /* 待办列表：勾选 / 删除（事件委托） */
    function listClick(e) {
      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var row = btn.closest('.todo');
      if (!row) return;
      if (btn.dataset.act === 'toggle') toggleTask(row.dataset.id);
      else if (btn.dataset.act === 'del') delTask(row.dataset.id);
    }
    $('todoList').addEventListener('click', listClick);
    $('doneList').addEventListener('click', listClick);

    /* 新增 PAD */
    $('padAddBtn').addEventListener('click', function () {
      var f = $('padForm');
      f.classList.toggle('hidden');
      if (!f.classList.contains('hidden')) { fillKrSelect($('padKr')); $('padInput').focus(); }
    });
    $('padForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('padInput').value.trim();
      if (!v) { toast('先写点什么吧'); return; }
      addPad(v, $('padKr') ? $('padKr').value : '');
      $('padInput').value = '';
      $('padForm').classList.add('hidden');
    });

    /* 月度复盘 → 查看复盘（跳到季度页的锚点式提示，桌面版为弹窗；移动端整页展示） */
    $('monthMore').addEventListener('click', function () {
      switchTab('okr');
      toast('已切换到季度复盘，月度数据在上方「月度复盘」卡片');
    });

    /* 设置中心 */
    $('meExport').addEventListener('click', doExport);
    $('meBackup').addEventListener('click', doBackup);
    $('meClear').addEventListener('click', doClear);
    $('meRestore').addEventListener('click', doRestore);
    $('meImport').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) doImport(f);
      e.target.value = '';
    });

    /* 确认弹层 */
    $('cfCancel').addEventListener('click', closeSheet);
    $('confirmMask').addEventListener('click', function (e) { if (e.target === this) closeSheet(); });
    $('cfOk').addEventListener('click', function () {
      var fn = pendingFn;
      closeSheet();
      if (fn) fn();
    });

    /* 系统返回键：优先关闭弹层 */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!$('confirmMask').classList.contains('hidden')) closeSheet();
    });
  }

  /* ==========================================================
     8. 启动
     ========================================================== */
  function boot() {
    Store.load();
    bind();
    /* 首屏只渲染首页，其余页标记为 dirty，等切过去时再渲染（避免启动阻塞） */
    renderPage('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
