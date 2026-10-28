(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const modes = { focus: 'Focus', short: 'Short break', long: 'Long break' };
  const defaults = { focus: 25, short: 5, long: 15 };
  const limits = { focus: 180, short: 60, long: 90 };
  const key = 'still-timer-v1';
  const today = () => new Date().toLocaleDateString('en-CA');
  let state = { mode: 'focus', durations: { ...defaults }, remaining: 1500000, running: false, end: null, count: 0, day: today(), sound: true };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved && modes[saved.mode] && Object.keys(defaults).every(m => Number.isInteger(saved.durations?.[m]) && saved.durations[m] >= 1 && saved.durations[m] <= limits[m]) && Number.isFinite(saved.remaining) && saved.remaining >= 0 && saved.remaining <= saved.durations[saved.mode] * 60000 && typeof saved.running === 'boolean' && (!saved.running || Number.isFinite(saved.end)) && Number.isInteger(saved.count) && saved.count >= 0) state = saved;
  } catch { /* Storage may be unavailable in private browsing. */ }
  let lock = null, requesting = false, audio = null;
  function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }
  function rollover() { if (state.day !== today()) { state.day = today(); state.count = 0; save(); } }
  function remaining() { return state.running ? Math.max(0, state.end - Date.now()) : state.remaining; }
  function wakeStatus(text, active = false) { $('wake').textContent = text; $('wake').classList.toggle('active', active); }
  async function acquire() {
    if (!state.running || document.visibilityState !== 'visible' || lock || requesting) return;
    if (!('wakeLock' in navigator)) { wakeStatus('○ Screen-awake mode unavailable in this browser'); return; }
    requesting = true;
    try {
      const candidate = await navigator.wakeLock.request('screen');
      if (!state.running || document.visibilityState !== 'visible') { await candidate.release(); return; }
      lock = candidate;
      candidate.addEventListener('release', () => { if (lock === candidate) { lock = null; if (state.running) wakeStatus('○ Screen lock released · tap here to retry'); } });
      wakeStatus('● Screen is staying awake', true);
    } catch { wakeStatus('○ Screen-awake unavailable · tap here to retry'); }
    finally { requesting = false; }
  }
  function release() {
    const previous = lock; lock = null;
    if (previous) previous.release().catch(() => {});
    wakeStatus('○ Screen stays awake while your timer runs');
  }
  function prepareAudio() {
    if (!state.sound) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(() => {}); } catch {}
  }
  function chime() {
    if (!state.sound || !audio || audio.state !== 'running') return;
    [0, .35, .7].forEach((delay, index) => {
      const oscillator = audio.createOscillator(), gain = audio.createGain(), start = audio.currentTime + delay;
      oscillator.frequency.value = [523.25, 659.25, 783.99][index];
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.18, start + .02); gain.gain.exponentialRampToValueAtTime(.001, start + .65);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + .7);
    });
  }
  function render() {
    rollover();
    const ms = remaining(), seconds = Math.ceil(ms / 1000), display = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    $('time').textContent = display;
    $('time').setAttribute('aria-label', `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`);
    document.title = state.running ? `${display} · ${modes[state.mode]} — Still` : 'Still — Focus timer';
    $('phase').textContent = state.mode === 'focus' ? 'TIME TO FOCUS' : 'ROOM TO BREATHE';
    $('hint').textContent = state.running ? (state.mode === 'focus' ? 'Just you and the next small step.' : 'Step back. Come back refreshed.') : (ms === 0 ? 'Nicely done. Take a breath.' : 'Your next small beginning.');
    $('start').innerHTML = `${state.running ? 'Pause' : ms === 0 ? 'Start again' : ms < state.durations[state.mode] * 60000 ? 'Resume' : state.mode === 'focus' ? 'Start focus' : 'Start break'} <span aria-hidden="true">${state.running ? 'Ⅱ' : '↗'}</span>`;
    $('progress').style.strokeDashoffset = String(100 * (1 - Math.min(1, ms / (state.durations[state.mode] * 60000))));
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === state.mode)));
    $('sound').setAttribute('aria-pressed', String(state.sound)); $('sound').setAttribute('aria-label', state.sound ? 'Sound on' : 'Sound off');
    $('count').textContent = state.count;
    document.querySelectorAll('.dots i').forEach((dot, i) => dot.classList.toggle('filled', i < (state.count === 0 ? 0 : ((state.count - 1) % 4) + 1)));
  }
  function complete() {
    state.running = false; state.remaining = 0; state.end = null; rollover();
    if (state.mode === 'focus') state.count++;
    save(); release(); chime();
    $('announcement').textContent = state.mode === 'focus' ? `Focus complete. Time for a ${state.count % 4 === 0 ? 'long' : 'short'} break.` : 'Break complete. Ready for a fresh focus session?';
    render();
  }
  function tick() { if (state.running && remaining() <= 0) complete(); else render(); }
  function reset(mode = state.mode) { state.mode = mode; state.running = false; state.end = null; state.remaining = state.durations[mode] * 60000; release(); $('announcement').textContent = ''; save(); render(); }
  $('start').addEventListener('click', () => {
    if (state.running && remaining() <= 0) { complete(); return; }
    if (state.running) { state.remaining = remaining(); state.running = false; state.end = null; release(); }
    else { prepareAudio(); if (state.remaining <= 0) state.remaining = state.durations[state.mode] * 60000; state.end = Date.now() + state.remaining; state.running = true; $('announcement').textContent = ''; acquire(); }
    save(); render();
  });
  $('reset').addEventListener('click', () => reset());
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => reset(button.dataset.mode)));
  $('sound').addEventListener('click', () => { state.sound = !state.sound; prepareAudio(); save(); render(); });
  $('wake').addEventListener('click', acquire);
  $('settings').addEventListener('submit', event => {
    event.preventDefault();
    for (const mode of Object.keys(defaults)) { const value = Number($(mode + '-min').value); if (!Number.isInteger(value) || value < 1 || value > limits[mode]) return; }
    for (const mode of Object.keys(defaults)) state.durations[mode] = Number($(mode + '-min').value);
    reset(); $('announcement').textContent = 'Your durations are saved.';
  });
  document.addEventListener('visibilitychange', () => { tick(); if (document.visibilityState === 'visible') acquire(); });
  window.addEventListener('pageshow', () => { tick(); acquire(); });
  window.addEventListener('pagehide', () => { save(); release(); });
  function device() {
    const ua = navigator.userAgent;
    const tablet = /iPad|Tablet/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    const phone = /iPhone|iPod|Android.*Mobile/i.test(ua);
    $('device').textContent = tablet ? 'Ready for your tablet' : phone ? 'Ready for your phone' : 'Ready for your desktop';
  }
  Object.keys(defaults).forEach(mode => { $(mode + '-min').value = state.durations[mode]; });
  device(); tick(); acquire(); setInterval(tick, 250);
})();
