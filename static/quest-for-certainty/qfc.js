/* Engine for the narrated essay: builds the text from word timings, keeps the
 * highlight and scroll in step with the audio, and renders the stage scenes
 * as a pure function of the current time (so seeking and scrubbing just work). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const BASE = '/static/quest-for-certainty/';
  const DUR_FALLBACK = 2661.3;
  const SCENE_LEAD = 0.35;   // visuals arrive a touch before the words
  const CUE_LEAD = 0.12;
  const TITLE_SECS = 5.5;    // big movement title card
  const POS_KEY = 'qfc-ch1-pos';
  const Q = window.QFC;

  const audio = $('#audio');
  const stage = $('#stage');
  const reader = $('#reader');
  const essay = $('#essay');
  const narrow = matchMedia('(max-width: 980px)');

  // ─── data ───
  let words = [], nw = [], st, en, wordEls = [], sentOf, sentEls = [], sentFirst = [], sentLast = [];
  let movements = [], scenes = [], quotes = [];
  let dur = DUR_FALLBACK;

  const norm = (w) => w.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
  function find(phrase, from = 0) {
    const toks = phrase.split(/\s+/).map(norm).filter(Boolean);
    outer: for (let i = from; i <= nw.length - toks.length; i++) {
      for (let k = 0; k < toks.length; k++) if (nw[i + k] !== toks[k]) continue outer;
      return i;
    }
    console.warn('[qfc] phrase not found:', phrase);
    return -1;
  }
  const fmt = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; };
  // last index i with arr[i] <= t
  function bisect(arr, t, key = (x) => x) {
    let lo = 0, hi = arr.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (key(arr[mid]) <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }
  const storage = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  fetch(BASE + 'essay.json').then((r) => r.json()).then(init);

  function init(E) {
    E.paras.forEach((p) => p.forEach((s) => s.forEach((w) => words.push(w))));
    nw = words.map(norm);
    st = new Float64Array(words.length); en = new Float64Array(words.length);
    for (let i = 0; i < words.length; i++) { st[i] = E.t[2 * i] / 100; en[i] = E.t[2 * i + 1] / 100; }
    sentOf = new Int32Array(words.length);

    // movements → word index → paragraph
    movements = Q.movements.map((m, k) => { const wi = k === 0 ? 0 : find(m.at); return Object.assign({}, m, { wi, t: k === 0 ? 0 : st[wi] - SCENE_LEAD }); });

    buildText(E);
    buildGlossary();
    buildScenes();
    buildNav();
    buildOutro();
    wirePlayer();
    wireReader();
    restore();
    requestAnimationFrame(loop);
  }

  // ─── text ───
  function buildText(E) {
    const frag = document.createDocumentFragment();
    let wi = 0, si = 0, mi = 0;
    E.paras.forEach((para) => {
      if (mi < movements.length && movements[mi].wi <= wi) {
        const m = movements[mi];
        const h = document.createElement('section');
        h.className = 'mv'; h.id = 'mv-' + m.n;
        h.innerHTML = `<div class="mnum">${m.n}</div><h2>${m.title}</h2><div class="gloss"><span class="lab">What’s happening</span>${m.gloss}</div>`;
        frag.appendChild(h); m.el = h; mi++;
      }
      const p = document.createElement('p');
      p.className = 'para';
      para.forEach((sent) => {
        const s = document.createElement('span');
        s.className = 's';
        sentFirst.push(wi);
        sent.forEach((w, k) => {
          const el = document.createElement('span');
          el.className = 'w'; el.textContent = w; el.dataset.i = wi;
          wordEls[wi] = el; sentOf[wi] = si;
          s.appendChild(el);
          if (k < sent.length - 1) s.appendChild(document.createTextNode(' '));
          wi++;
        });
        sentLast.push(wi - 1);
        sentEls.push(s);
        p.appendChild(s); p.appendChild(document.createTextNode(' '));
        si++;
      });
      frag.appendChild(p);
    });
    essay.appendChild(frag);
  }

  const gloss = {};
  function buildGlossary() {
    Q.glossary.forEach(([term, phrase, def]) => {
      const n = phrase.split(/\s+/).length;
      let i = find(phrase);
      if (i < 0) return;
      gloss[term] = def;
      for (let k = 0; k < n; k++) { wordEls[i + k].classList.add('gl'); wordEls[i + k].dataset.g = term; }
    });
  }

  // ─── scenes ───
  const layers = [$('#layerA'), $('#layerB')];
  let front = 0;
  const overlaysEl = $('#overlays');
  const quoteBox = $('#stageQuotes');
  const mtag = $('#mtag');

  function timeOf(phrase, from, lead = CUE_LEAD) { const i = find(phrase, from); return i < 0 ? Infinity : st[i] - lead; }
  function sentenceEndOf(phrase, from) { const i = find(phrase, from); return i < 0 ? Infinity : en[sentLast[sentOf[i]]]; }

  function buildScenes() {
    let cur = 0;
    scenes = Q.scenes.map((s, k) => {
      const wi = s.at == null ? 0 : find(s.at, cur);
      if (wi >= 0) cur = wi;
      return Object.assign({}, s, { wi: Math.max(wi, 0), t: s.at == null ? 0 : st[Math.max(wi, 0)] - SCENE_LEAD, k });
    });
    scenes.forEach((s, k) => {
      s.end = k + 1 < scenes.length ? scenes[k + 1].t : Infinity;
      const div = document.createElement('div');
      div.className = 'ovl';
      div.innerHTML = s.html || '';
      overlaysEl.appendChild(div);
      s.el = div;
      s.cues = [];
      div.querySelectorAll('.c').forEach((el) => {
        let t = s.t + 0.3;
        if (el.dataset.at) t = timeOf(el.dataset.at, s.wi);
        else if (el.dataset.d) t = s.t + parseFloat(el.dataset.d);
        let u = Infinity;
        const un = el.dataset.until;
        if (un) u = un[0] === '+' ? t + parseFloat(un) : timeOf(un, s.wi);
        if (el.classList.contains('gone-on')) { s.cues.push({ el, t: -Infinity, u: Infinity, gone: t }); return; }
        s.cues.push({ el, t, u });
      });
      (s.q || []).forEach((q) => {
        const el = document.createElement('div');
        el.className = 'squote ' + (q.pos || 'bottom');
        el.innerHTML = q.text + (q.by ? `<span class="by">${q.by}</span>` : '');
        quoteBox.appendChild(el);
        const t = timeOf(q.at, s.wi, 0.2);
        const u = q.u ? timeOf(q.u, s.wi, 0.4) : sentenceEndOf(q.at, s.wi) + 1.6;
        quotes.push({ el, t, u, mid: q.pos === 'mid' });
      });
    });
    // image runs: consecutive scenes sharing an image share one slow camera move
    let run = null;
    scenes.forEach((s) => {
      if (!run || run.img !== s.img) { run = { img: s.img, t0: s.t, t1: s.end, kb: s.kb || defaultKB(s.k) }; }
      run.t1 = s.end;
      s.run = run;
    });
    // preload the first few images
    scenes.slice(0, 4).forEach((s) => s.img && preload(s.img));
  }
  function defaultKB(k) {
    const v = [[1.0, 1.08, -1, 0], [1.06, 1.0, 1, .5], [1.0, 1.1, .5, -1], [1.04, 1.12, -.5, 1]];
    return v[k % v.length];
  }
  const imgCache = {};
  const imgSrc = (name) => `${BASE}img/${name}${narrow.matches && devicePixelRatio < 2 ? '-s' : ''}.webp`;
  function preload(name) { if (!name || imgCache[name]) return; const im = new Image(); im.src = imgSrc(name); imgCache[name] = im; }

  let curScene = -1, curImg, curMv = -1;
  function renderStage(t, jumped) {
    if (jumped) { stage.classList.add('instant'); requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove('instant'))); }
    const k = Math.max(0, bisect(scenes, t, (s) => s.t));
    const s = scenes[k];
    if (k !== curScene) {
      if (curScene >= 0) scenes[curScene].el.classList.remove('act');
      s.el.classList.add('act');
      curScene = k;
      for (let j = k + 1; j < Math.min(k + 4, scenes.length); j++) preload(scenes[j].img);
    }
    // image layer
    if (s.img !== curImg) {
      const old = layers[front];
      const nxt = layers[1 - front];
      curImg = s.img;
      if (s.img) {
        const img = nxt.querySelector('img');
        nxt.classList.remove('bleed', 'show', 'dim', 'half');
        nxt.style.setProperty('--blot', `url(${BASE}img/blot${s.k % 3}.png)`);
        img.src = imgSrc(s.img);
        void nxt.offsetWidth;
        const reveal = () => { if (curImg !== s.img) return; if (!jumped) nxt.classList.add('bleed'); nxt.classList.add('show'); };
        if (img.complete) reveal(); else img.onload = reveal;
        nxt.style.zIndex = 2; old.style.zIndex = 1;
        front = 1 - front;
      }
      old.classList.remove('show');
    }
    const fl = layers[front];
    if (s.img) {
      fl.classList.toggle('dim', s.dim === 'dim');
      fl.classList.toggle('half', s.dim === 'half');
      const r = s.run, span = Math.min(r.t1, dur) - r.t0;
      const p = Math.min(1, Math.max(0, (t - r.t0) / (span || 1)));
      const e = p * p * (3 - 2 * p);
      const [s0, s1, x1, y1] = r.kb;
      fl.querySelector('img').style.transform = `scale(${(s0 + (s1 - s0) * e).toFixed(4)}) translate(${(x1 * e).toFixed(3)}%, ${(y1 * e).toFixed(3)}%)`;
    }
    // cues
    for (const c of s.cues) {
      if (c.gone !== undefined) { c.el.classList.add('on'); c.el.classList.toggle('off', t >= c.gone); continue; }
      c.el.classList.toggle('on', t >= c.t && t < c.u);
    }
    let midQuote = false;
    for (const q of quotes) { const on = t >= q.t && t < q.u; q.el.classList.toggle('on', on); if (on && q.mid) midQuote = true; }
    // movement tag
    const mi = Math.max(0, bisect(movements, t, (m) => m.t));
    if (mi !== curMv) {
      curMv = mi;
      mtag.querySelector('.num').textContent = movements[mi].n;
      mtag.querySelector('.ttl').textContent = movements[mi].title;
      document.querySelectorAll('.toc a, .drawer li').forEach((a, j) => a.classList.toggle('cur', j % movements.length === mi));
    }
    const big = started && t - movements[mi].t < TITLE_SECS && t > 0.2;
    mtag.classList.toggle('big', big);
    stage.classList.toggle('veil', big || midQuote);
  }

  // ─── word highlight ───
  let curW = -2, curS = -1;
  function renderWords(t) {
    const i = bisect(st, t + 0.02);
    if (i === curW) return false;
    if (curW >= 0 && wordEls[curW]) wordEls[curW].classList.remove('now');
    const si = i >= 0 ? sentOf[i] : -1;
    if (si !== curS) {
      if (curS >= 0) { sentEls[curS].classList.remove('cur'); for (let j = sentFirst[curS]; j <= sentLast[curS]; j++) wordEls[j].classList.remove('done'); }
      if (si >= 0) sentEls[si].classList.add('cur');
      curS = si;
    }
    if (si >= 0) {
      for (let j = sentFirst[si]; j <= sentLast[si]; j++) wordEls[j].classList.toggle('done', j <= i);
      wordEls[i].classList.add('now');
    }
    curW = i;
    return true;
  }

  // ─── auto-scroll ───
  let follow = true, suspended = false, lastUserScroll = 0, tween = null;
  const followBtn = $('#btnFollow'), backPill = $('#backPill');
  function viewBand() {
    const vh = innerHeight, pb = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pbar')) || 64;
    const top = narrow.matches ? stage.getBoundingClientRect().bottom : 0;
    const bottom = vh - pb;
    return { top, bottom, h: bottom - top };
  }
  function keepInView(force) {
    if (curW < 0 || !follow || suspended || !started) return;
    const el = wordEls[curW];
    const r = el.getBoundingClientRect();
    const b = viewBand();
    const lo = b.top + b.h * 0.18, hi = b.top + b.h * 0.62;
    if (!force && r.top >= lo && r.bottom <= hi) return;
    scrollToY(scrollY + r.top - (b.top + b.h * 0.32));
  }
  function scrollToY(y, ms = 900) {
    y = Math.max(0, Math.min(y, document.documentElement.scrollHeight - innerHeight));
    const y0 = scrollY, d = y - y0, t0 = performance.now();
    if (Math.abs(d) < 2) return;
    if (Math.abs(d) > innerHeight * 3) ms = 450;
    tween = { y0, d, t0, ms };
  }
  function stepTween(now) {
    if (!tween) return;
    const p = Math.min(1, (now - tween.t0) / tween.ms);
    const e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    scrollTo(0, tween.y0 + tween.d * e);
    if (p >= 1) tween = null;
  }
  function userScrolled() {
    tween = null;
    lastUserScroll = performance.now();
    if (playing && follow) { suspended = true; backPill.hidden = false; }
  }
  function resumeFollow() { suspended = false; backPill.hidden = true; keepInView(true); }
  addEventListener('wheel', userScrolled, { passive: true });
  addEventListener('touchmove', userScrolled, { passive: true });
  addEventListener('keydown', (e) => { if (['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'].includes(e.key)) userScrolled(); });
  backPill.addEventListener('click', resumeFollow);
  followBtn.addEventListener('click', () => { follow = !follow; followBtn.classList.toggle('on', follow); if (follow) resumeFollow(); });

  // while reading with the narration paused, the stage follows the reading position instead
  let readT = null;
  function readingTime() {
    const b = viewBand();
    const y = b.top + b.h * 0.35;
    // find the sentence under the reading line
    let lo = 0, hi = sentEls.length - 1, ans = 0;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (sentEls[mid].getBoundingClientRect().top <= y) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    if (sentEls[0].getBoundingClientRect().top > y + b.h * 0.3) return 0;
    return en[sentLast[ans]];
  }
  let scrollRaf = false;
  addEventListener('scroll', () => {
    if (playing || tween || scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(() => { scrollRaf = false; if (performance.now() - lastUserScroll < 1500) { readT = readingTime(); renderStage(readT, true); } });
  }, { passive: true });

  // ─── clock ───
  let playing = false, started = false;
  let anchorT = 0, anchorNow = 0, lastRendered = -1;
  function now() {
    if (!playing) return audio.currentTime;
    const t = anchorT + (performance.now() - anchorNow) / 1000 * audio.playbackRate;
    return Math.min(t, audio.currentTime + 0.35);
  }
  audio.addEventListener('timeupdate', () => { anchorT = audio.currentTime; anchorNow = performance.now(); });
  audio.addEventListener('playing', () => { anchorT = audio.currentTime; anchorNow = performance.now(); });

  function loop(ts) {
    stepTween(ts);
    const t = now();
    if (t !== lastRendered || playing) {
      const jumped = Math.abs(t - lastRendered) > 1.5;
      lastRendered = t;
      if (readT === null || playing) renderStage(t, jumped);
      if (renderWords(t) && playing) keepInView(jumped);
      if (suspended && performance.now() - lastUserScroll > 4000) {
        const r = wordEls[curW] && wordEls[curW].getBoundingClientRect(), b = viewBand();
        if (r && r.top > b.top && r.bottom < b.bottom) { suspended = false; backPill.hidden = true; }
      }
      renderScrub(t);
    }
    requestAnimationFrame(loop);
  }

  // ─── player ───
  const playBtn = $('#btnPlay'), rateBtn = $('#btnRate');
  const scrub = $('#scrub'), fill = $('#scrubFill'), knob = $('#knob'), tip = $('#scrubTip'), buf = $('#scrubBuf');
  const tCur = $('#tCur'), tDur = $('#tDur');
  const rates = [1, 1.25, 1.5, 1.75, 2, 0.75];
  let scrubbing = false;

  function play() {
    // If the reader scrolled somewhere else while paused, start from what they are reading.
    if (readT !== null && Math.abs(readT - audio.currentTime) > 20) {
      const si = sentOf[Math.max(0, bisect(st, readT - 0.01))];
      seek(st[sentFirst[si]] - 0.15);
    }
    readT = null;
    started = true; stage.classList.add('started');
    const p = audio.play();
    if (p && p.catch) p.catch((e) => console.warn('[qfc] play blocked', e));
  }
  function pause() { audio.pause(); }
  function toggle() { audio.paused ? play() : pause(); }
  function seek(t) {
    t = Math.max(0, Math.min(dur - 0.1, t));
    audio.currentTime = t; anchorT = t; anchorNow = performance.now();
    readT = null; lastRendered = -99;
    if (playing) { suspended = false; backPill.hidden = true; }
  }
  audio.addEventListener('play', () => { playing = true; document.body.classList.add('is-playing'); reader.classList.add('playing'); stage.classList.remove('paused'); playBtn.setAttribute('aria-label', 'Pause'); keepInView(true); });
  audio.addEventListener('pause', () => { playing = false; document.body.classList.remove('is-playing'); stage.classList.add('paused'); playBtn.setAttribute('aria-label', 'Play'); save(); });
  audio.addEventListener('ended', () => { playing = false; document.body.classList.remove('is-playing'); stage.classList.add('paused'); storage.set(POS_KEY, '0'); });
  audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) { dur = audio.duration; tDur.textContent = fmt(dur); buildTicks(); } });
  audio.addEventListener('progress', () => { try { const b = audio.buffered; if (b.length) buf.style.width = (b.end(b.length - 1) / dur * 100) + '%'; } catch (e) { /* ignore */ } });

  function renderScrub(t) {
    if (scrubbing) return;
    const p = Math.min(1, t / dur) * 100;
    fill.style.width = p + '%'; knob.style.left = p + '%';
    tCur.textContent = fmt(t);
    scrub.setAttribute('aria-valuenow', Math.round(t));
  }
  function buildTicks() {
    const ticks = $('#ticks'); ticks.innerHTML = '';
    movements.slice(1).forEach((m) => { const i = document.createElement('i'); i.style.left = (m.t / dur * 100) + '%'; ticks.appendChild(i); });
  }
  function scrubAt(e) {
    const r = scrub.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    return { p, t: p * dur, x: e.clientX - r.left };
  }
  function showTip(e) {
    const { t, x } = scrubAt(e);
    const m = movements[Math.max(0, bisect(movements, t, (m) => m.t))];
    tip.innerHTML = `<b>${m.n}</b>${m.title} · ${fmt(t)}`;
    tip.style.left = Math.max(80, Math.min(scrub.clientWidth - 80, x)) + 'px';
  }
  scrub.addEventListener('pointermove', (e) => { showTip(e); if (scrubbing) { const { p } = scrubAt(e); fill.style.width = knob.style.left = p * 100 + '%'; tCur.textContent = fmt(p * dur); } });
  scrub.addEventListener('pointerdown', (e) => { scrubbing = true; scrub.classList.add('drag'); scrub.setPointerCapture(e.pointerId); const { p } = scrubAt(e); fill.style.width = knob.style.left = p * 100 + '%'; showTip(e); });
  scrub.addEventListener('pointerup', (e) => { if (!scrubbing) return; scrubbing = false; scrub.classList.remove('drag'); const { t } = scrubAt(e); seek(t); if (!started) { hideCover(); } keepInView(true); });
  scrub.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); seek(now() + (e.key === 'ArrowLeft' ? -10 : 10)); } });

  function wirePlayer() {
    playBtn.addEventListener('click', () => { hideCover(); toggle(); });
    $('#stagePlay').addEventListener('click', play);
    $('#btnBack').addEventListener('click', () => seek(now() - 10));
    $('#btnFwd').addEventListener('click', () => seek(now() + 10));
    rateBtn.addEventListener('click', () => {
      const r = rates[(rates.indexOf(audio.playbackRate) + 1) % rates.length];
      anchorT = now(); anchorNow = performance.now();
      audio.playbackRate = r; rateBtn.textContent = r + '×';
    });
    document.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'k') { if (e.target.closest('button') && e.key === ' ') return; e.preventDefault(); hideCover(); toggle(); }
      else if (e.key === 'ArrowLeft' && !e.target.closest('.scrub')) { e.preventDefault(); seek(now() - 10); }
      else if (e.key === 'ArrowRight' && !e.target.closest('.scrub')) { e.preventDefault(); seek(now() + 10); }
      else if (e.key === 'f') followBtn.click();
      else if (e.key === 'Escape') closeDrawer();
    });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: 'Escape from Peril', artist: 'John Dewey', album: 'The Quest for Certainty', artwork: [{ src: BASE + 'img/hazard-s.webp', sizes: '800x600', type: 'image/webp' }] });
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', pause);
      navigator.mediaSession.setActionHandler('seekbackward', () => seek(now() - 10));
      navigator.mediaSession.setActionHandler('seekforward', () => seek(now() + 10));
    }
    setInterval(() => { if (playing) save(); }, 5000);
  }
  function save() { if (started) storage.set(POS_KEY, String(Math.floor(audio.currentTime))); }

  // ─── reader interactions ───
  const tipEl = $('#tip');
  function wireReader() {
    essay.addEventListener('click', (e) => {
      const w = e.target.closest('.w');
      if (!w || (getSelection && String(getSelection()).length > 1)) return;
      hideCover();
      seek(st[+w.dataset.i] - 0.05);
      w.classList.add('flash'); setTimeout(() => w.classList.remove('flash'), 1200);
      if (!playing) play();
      resumeFollow();
    });
    const showTipFor = (target, html, x, y) => {
      tipEl.innerHTML = html; tipEl.classList.add('on');
      const r = tipEl.getBoundingClientRect();
      tipEl.style.left = Math.max(8, Math.min(innerWidth - r.width - 8, x - r.width / 2)) + 'px';
      tipEl.style.top = (y - r.height - 14 < 8 ? y + 22 : y - r.height - 14) + 'px';
    };
    document.addEventListener('pointerover', (e) => {
      const g = e.target.closest && e.target.closest('.w.gl');
      if (g) { const r = g.getBoundingClientRect(); showTipFor(g, `<b>${g.dataset.g}</b>${gloss[g.dataset.g]}`, r.left + r.width / 2, r.top); return; }
      const d = e.target.closest && e.target.closest('[data-tip]');
      if (d && d.closest('.ovl.act')) { const r = d.getBoundingClientRect(); showTipFor(d, d.dataset.tip, r.left + r.width / 2, r.top); return; }
      tipEl.classList.remove('on');
    });
    document.addEventListener('scroll', () => tipEl.classList.remove('on'), { passive: true });
  }

  // ─── navigation ───
  const drawer = $('#drawer');
  function closeDrawer() { drawer.hidden = true; }
  function goMovement(m) {
    hideCover();
    seek(m.t + SCENE_LEAD - 0.1);
    renderWords(st[m.wi]);
    if (m.el) scrollToY(scrollY + m.el.getBoundingClientRect().top - viewBand().top - 20, 700);
    suspended = false; backPill.hidden = true;
  }
  function buildNav() {
    const toc = $('#toc'), list = $('#drawerList');
    movements.forEach((m) => {
      const a = document.createElement('a');
      a.href = '#mv-' + m.n;
      a.innerHTML = `<span class="n">${m.n}</span><span>${m.title}</span><span class="t">${fmt(m.t)}</span>`;
      a.addEventListener('click', (e) => { e.preventDefault(); goMovement(m); });
      toc.appendChild(a);
      const li = document.createElement('li');
      li.innerHTML = `<button><span class="n">${m.n}</span><span>${m.title}</span><span class="t">${fmt(m.t)}</span></button>`;
      li.firstChild.addEventListener('click', () => { closeDrawer(); goMovement(m); if (!playing) play(); });
      list.appendChild(li);
    });
    $('#btnToc').addEventListener('click', () => { drawer.hidden = !drawer.hidden; });
    $('#drawerClose').addEventListener('click', closeDrawer);
    buildTicks();
  }

  function buildOutro() {
    const terms = Q.glossary.map(([t, , d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('');
    $('#outro').innerHTML = `
      <h2>The argument in brief</h2>
      <ol class="chain">
        <li>Life is perilous; people seek security either by changing themselves (propitiation, devotion) or by changing the world (the arts).</li>
        <li>Practical action can never escape uncertainty, so it has been ranked below thought, which seemed to offer a safe and self-sufficient activity.</li>
        <li>The ranking began in early culture: a lower world of familiar, controllable things and a higher world of awe-inspiring, uncontrollable powers.</li>
        <li>Greek philosophy inherited religion’s higher realm and recast it in logical form as fixed, eternal Being, the only object of certain knowledge.</li>
        <li>Being, knowledge and activity each split along the same line: fixed or changing, science or opinion, contemplation or making and doing.</li>
        <li>The framework survives. Only what is fixed counts as real, and knowing is pictured as a spectator viewing an object that is already complete.</li>
        <li>Dewey’s thesis is that all of this comes from separating theory and practice in the hope of absolute certainty. The alternative is to seek <em>security</em> by practical means.</li>
      </ol>
      <h3>Glossary</h3>
      <dl>${terms}</dl>
      <p class="credits">Text: John Dewey, <em>The Quest for Certainty</em> (New York: Minton, Balch &amp; Co., 1929), chapter I, now in the public domain. Narration: synthetic voice by ElevenLabs. Illustrations: watercolours generated with Google Gemini for this page. Charts marked “schematic” or “illustrative” sketch the shape of Dewey’s claims and are not measured data. Commentary and design: <a href="/">Harry O’Brien</a>, 2026.</p>`;
  }

  // ─── cover / resume ───
  const cover = $('#cover');
  function hideCover() { if (!cover.classList.contains('gone')) { cover.classList.add('gone'); started = true; stage.classList.add('started'); } }
  function restore() {
    const saved = parseInt(storage.get(POS_KEY) || '0', 10);
    if (saved > 30) {
      const note = $('#resumeNote');
      const m = movements[Math.max(0, bisect(movements, saved, (m) => m.t))];
      note.innerHTML = `Pick up where you left off: <button id="btnResume">${fmt(saved)} · ${m.n}. ${m.title}</button>`;
      note.hidden = false;
      $('#btnResume').addEventListener('click', () => { hideCover(); seek(saved - 3); play(); });
    }
    $('#btnWatch').addEventListener('click', () => { hideCover(); seek(0); play(); scrollToY(0); });
    $('#btnRead').addEventListener('click', () => { hideCover(); readT = 0; stage.classList.add('paused'); });
    stage.classList.add('paused');
    // deep link: #t=123
    const m = location.hash.match(/t=(\d+)/);
    if (m) { hideCover(); seek(+m[1]); }
  }
})();
