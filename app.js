'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const VERSION = "v5.1 (UI simple + FABs + modal usable)";
  const versionEl = document.getElementById('versionLabel');
  if (versionEl) versionEl.textContent = VERSION;

  /* ===== Refs ===== */
  const btnComenzar   = document.getElementById('btnComenzar');
  const btnReiniciar  = document.getElementById('btnReiniciar');

  const themeBtn      = document.getElementById('themeToggle');   // FAB 🌙/🌞
  const aboutBtn      = document.getElementById('aboutBtn');      // FAB ?
  const soundBtn      = document.getElementById('soundToggle');   // FAB 🔊/🔇

  const selVel        = document.getElementById('velocidad');

  const aboutModal    = document.getElementById('aboutModal');
  const aboutClose    = document.getElementById('aboutClose');
  const aboutCloseX   = document.getElementById('aboutCloseX');

  const tablero       = document.querySelector('.tablero');
  const botones       = document.querySelectorAll('.color');

  const nivelEl       = document.getElementById('nivel');
  const pasoEl        = document.getElementById('paso');
  const pasosTotalEl  = document.getElementById('pasosTotal');
  const mejorEl       = document.getElementById('mejor');
  const pbFill        = document.getElementById('pbFill');
  const mensajeEl     = document.getElementById('mensaje');

  const sndOk  = document.getElementById('sndOk');
  const sndBad = document.getElementById('sndBad');
  if (sndOk)  sndOk.volume  = 0.5;
  if (sndBad) sndBad.volume = 0.45;

  /* ===== Estado ===== */
  const COLORES = ['rojo','verde','azul','amarillo'];
  let secuencia = [];
  let idxJugador = 0;
  let nivel = 0;
  let mejor = 0;
  let puedeJugar = false;
  let tiempos = { on: 550, off: 250 }; // "medio"
  let audioDesbloqueado = false;

  // Sonido global
  let soundOn = true;
  try { soundOn = (localStorage.getItem('soundOn') !== '0'); } catch {}

  function updateSoundButton(){
    if (!soundBtn) return;
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', soundOn ? 'Sonido activado' : 'Sonido desactivado');
  }
  function playSound(audio){
    if (!audio || !soundOn) return;
    try { audio.currentTime = 0; const p = audio.play(); if (p?.then) p.catch(()=>{}); } catch {}
  }
  function stopAllSounds(){ [sndOk, sndBad].forEach(a=>{ try{ a?.pause(); }catch{} }); }

  /* ===== Utils ===== */
  const el = (s) => document.querySelector(s);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const setTexto = (n, t) => { if (n) n.textContent = String(t); };

  function rngInt(max) {
    if (crypto?.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % max; }
    return Math.floor(Math.random() * max);
  }
  function pickNextColor(prev = null) {
    if (prev == null) return COLORES[rngInt(COLORES.length)];
    let idx = rngInt(COLORES.length - 1), prevIdx = COLORES.indexOf(prev);
    if (idx >= prevIdx) idx++;
    return COLORES[idx];
  }

  /* ===== Velocidad ===== */
  function setVelocidad(v){
    if (v==='lento')  tiempos = { on: 700, off: 350 };
    if (v==='medio')  tiempos = { on: 550, off: 250 };
    if (v==='rapido') tiempos = { on: 400, off: 200 };
    try{ localStorage.setItem('seq_vel', v); }catch{}
  }

  /* ===== Tema ===== */
  function applyTheme(mode){
    const m = (mode==='dark') ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', m);
    if (themeBtn){
      themeBtn.setAttribute('aria-pressed', String(m==='dark'));
      themeBtn.setAttribute('aria-label', m==='dark' ? 'Usar modo claro' : 'Usar modo oscuro');
      themeBtn.textContent = (m==='dark') ? '🌞' : '🌙';
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    metaTheme?.setAttribute('content', m==='dark' ? '#0e0e0e' : '#f8fbf4');
  }

  function cargarPreferencias(){
    try{
      const v=localStorage.getItem('seq_vel');
      if (['lento','medio','rapido'].includes(v) && selVel) selVel.value=v || 'medio';
      setVelocidad(selVel ? selVel.value : 'medio');

      const m=Number(localStorage.getItem('seq_mejor')||0);
      mejor = isNaN(m)?0:m;
      setTexto(mejorEl, mejor);

      const themeStored = localStorage.getItem('theme');
      applyTheme(themeStored==='dark' ? 'dark' : 'light');
    }catch{}
    updateSoundButton();
  }

  /* ===== Modal ===== */
  function openAbout(){
    if (!aboutModal) return;
    aboutModal.setAttribute('aria-hidden','false');
    document.body.classList.add('no-scroll');  // bloquea fondo
    aboutClose?.focus();
  }
  function closeAbout(){
    if (!aboutModal) return;
    aboutModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('no-scroll'); // restaura fondo
  }
  aboutBtn?.addEventListener('click', openAbout);
  aboutClose?.addEventListener('click', closeAbout);
  aboutCloseX?.addEventListener('click', closeAbout);
  aboutModal?.addEventListener('click', (e)=>{ if(e.target===aboutModal) closeAbout(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAbout(); });

  /* ===== Desbloqueo de audio (iOS/Safari) ===== */
  function tryUnlockAudio(){
    if (audioDesbloqueado) return;
    [sndOk, sndBad].filter(Boolean).forEach(a=>{
      try{
        const p=a.play();
        if (p?.then){ p.then(()=>{ a.pause(); a.currentTime=0; }).catch(()=>{}); }
        else { a.pause(); a.currentTime=0; }
      }catch{}
    });
    audioDesbloqueado = true;
    document.removeEventListener('touchstart', tryUnlockAudio);
    document.removeEventListener('click', tryUnlockAudio);
    document.removeEventListener('keydown', tryUnlockAudio);
  }
  document.addEventListener('touchstart', tryUnlockAudio, { once:true });
  document.addEventListener('click', tryUnlockAudio, { once:true });
  document.addEventListener('keydown', tryUnlockAudio, { once:true });

  /* ===== Reproducción ===== */
  async function iluminar(color){
    const btn = el(`.color.${color}`); if (!btn) return;
    btn.classList.add('activo','is-play');
    await delay(tiempos.on);
    btn.classList.remove('activo','is-play');
    await delay(tiempos.off);
  }
  async function reproducirSecuencia(){
    puedeJugar = false;
    tablero?.setAttribute('aria-busy','true');
    setTexto(mensajeEl, 'Observá la secuencia…');
    for (const c of secuencia){ await iluminar(c); }
    tablero?.removeAttribute('aria-busy');
    puedeJugar = true;
    setTexto(mensajeEl, 'Tu turno. Repetí la secuencia.');
  }
  function actualizarUI(){
    setTexto(nivelEl, nivel);
    setTexto(pasoEl, idxJugador);
    setTexto(pasosTotalEl, secuencia.length);
    if (pbFill){
      const pct = secuencia.length ? Math.round((idxJugador / secuencia.length) * 100) : 0;
      pbFill.style.width = pct + '%';
    }
  }
  async function nuevoNivel(){
    idxJugador = 0; nivel++;
    const previo = secuencia.length ? secuencia[secuencia.length - 1] : null;
    secuencia.push(pickNextColor(previo));
    actualizarUI();
    await delay(600); await reproducirSecuencia();
  }
  function finDePartida(){
    puedeJugar = false;
    setTexto(mensajeEl, `❌ Error. Alcanzaste el nivel ${nivel}.`);
    playSound(sndBad);
    if (navigator.vibrate) navigator.vibrate([120,60,120]);
    btnReiniciar && (btnReiniciar.hidden = false);
    btnComenzar  && (btnComenzar.hidden  = true);
  }
  function victoriaParcial(){
    if (nivel > mejor){
      mejor = nivel; setTexto(mejorEl, mejor);
      try{ localStorage.setItem('seq_mejor', String(mejor)); }catch{}
    }
    setTexto(mensajeEl, '✅ ¡Bien! Nueva ronda…');
    if (navigator.vibrate) navigator.vibrate(40);

    let avanzado = false;
    const avanzar = ()=>{ if (avanzado) return; avanzado = true; nuevoNivel(); };

    if (soundOn && sndOk){
      try{
        sndOk.currentTime = 0; const p = sndOk.play(); if (p?.then) p.catch(()=>{});
        sndOk.addEventListener('ended', avanzar, { once:true });
        setTimeout(avanzar, Math.max(800, (sndOk.duration || 0.8) * 1000));
        return;
      }catch{}
    }
    setTimeout(avanzar, 800);
  }

  /* ===== Interacción jugador ===== */
  function pulsar(color){
    if (!puedeJugar) return;
    const btn = el(`.color.${color}`);
    if (btn){ btn.classList.add('activo'); setTimeout(()=>btn.classList.remove('activo'), 120); }
    idxJugador++; actualizarUI();

    const esperado = secuencia[idxJugador - 1];
    if (color !== esperado){ finDePartida(); return; }

    if (idxJugador === secuencia.length){
      puedeJugar = false; setTimeout(victoriaParcial, 150);
    }
  }
  botones.forEach(b=> b.addEventListener('click', ()=> pulsar(b.dataset.color)));
  document.addEventListener('keydown', (e)=>{
    const map = { '1':'rojo','2':'verde','3':'azul','4':'amarillo',
      'ArrowLeft':'rojo','ArrowUp':'verde','ArrowRight':'azul','ArrowDown':'amarillo' };
    const c = map[e.key]; if (c) pulsar(c);
  });

  /* ===== Botones ===== */
  async function comenzar(){
    secuencia = []; idxJugador = 0; nivel = 0;
    setTexto(mensajeEl,''); pbFill && (pbFill.style.width = '0%');
    btnComenzar && (btnComenzar.hidden = true);
    btnReiniciar && (btnReiniciar.hidden = true);
    await delay(300); await nuevoNivel();
  }
  btnComenzar?.addEventListener('click', comenzar);
  btnReiniciar?.addEventListener('click', comenzar);

  soundBtn?.addEventListener('click', ()=>{
    soundOn = !soundOn;
    try { localStorage.setItem('soundOn', soundOn ? '1' : '0'); } catch {}
    updateSoundButton();
    if (!soundOn) stopAllSounds();
  });

  /* ===== Preferencias ===== */
  selVel?.addEventListener('change', ()=> setVelocidad(selVel.value));
  cargarPreferencias();

  themeBtn?.addEventListener('click', ()=>{
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch {}
    applyTheme(next);
  });

  actualizarUI();
});

/* ===== Modo daltónico (toggle + persistencia) ===== */
const cbBtn = document.getElementById('cbToggle');
function applyColorblind(on){
  document.documentElement.setAttribute('data-colorblind', on ? 'on' : 'off');
  if (cbBtn){
    cbBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    cbBtn.textContent = on ? 'Modo daltónico: ON' : 'Modo daltónico';
  }
  try { localStorage.setItem('seq_cb', on ? '1' : '0'); } catch {}
}
let cbPref = false; try { cbPref = localStorage.getItem('seq_cb') === '1'; } catch {}
applyColorblind(cbPref);
cbBtn?.addEventListener('click', ()=>{
  const now = document.documentElement.getAttribute('data-colorblind') !== 'on';
  applyColorblind(now);
});
