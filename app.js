'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ===== Versión ===== */
  const VERSION = "v1.6.3";
  const versionEl = document.getElementById('versionLabel');
  if (versionEl) versionEl.textContent = VERSION;

  /* ===== Refs ===== */
  const btnComenzar   = document.getElementById('btnComenzar');
  const btnReiniciar  = document.getElementById('btnReiniciar');
  const themeBtn      = document.getElementById('themeToggle');
  const selTam        = document.getElementById('tamano');
  const selVel        = document.getElementById('velocidad');

  const aboutBtn      = document.getElementById('aboutBtn');
  const aboutModal    = document.getElementById('aboutModal');
  const aboutClose    = document.getElementById('aboutClose');

  const tablero       = document.querySelector('.tablero');
  const botones       = document.querySelectorAll('.color');

  const nivelEl       = document.getElementById('nivel');
  const pasoEl        = document.getElementById('paso');
  const pasosTotalEl  = document.getElementById('pasosTotal');
  const mejorEl       = document.getElementById('mejor');
  const pbFill        = document.getElementById('pbFill');
  const mensajeEl     = document.getElementById('mensaje');

  // Botón flotante de sonido (🔊/🔇)
  const soundBtn      = document.getElementById('soundToggle');

  // Sonidos
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
  let puedeJugar = false;   // bloquea input durante reproducción
  let tiempos = { on: 550, off: 250 }; // default "medio"
  let audioDesbloqueado = false;

  // Sonido: estado global y helpers
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
    try {
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.then === 'function') p.catch(()=>{});
    } catch {}
  }

  function stopAllSounds(){
    [sndOk, sndBad].forEach(a=>{
      if (!a) return;
      try { a.pause(); } catch {}
    });
  }

  /* ===== Utils ===== */
  const el = (s) => document.querySelector(s);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const setTexto = (n, t) => { if (n) n.textContent = String(t); };

  // RNG robusto + anti-repetición consecutiva
  function rngInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
      const arr = new Uint32Array(1);
      window.crypto.getRandomValues(arr);
      return arr[0] % max;
    }
    return Math.floor(Math.random() * max);
  }
  function pickNextColor(prev = null) {
    if (prev == null) return COLORES[rngInt(COLORES.length)];
    let idx = rngInt(COLORES.length - 1);
    const prevIdx = COLORES.indexOf(prev);
    if (idx >= prevIdx) idx++;
    return COLORES[idx];
  }

  function setVelocidad(v){
    if (v==='lento')  tiempos = { on: 700, off: 350 };
    if (v==='medio')  tiempos = { on: 550, off: 250 };
    if (v==='rapido') tiempos = { on: 400, off: 200 };
    try{ localStorage.setItem('seq_vel', v); }catch{}
  }

  function aplicarTam(){
    const muy = selTam && selTam.value === 'muy-grande';
    document.documentElement.classList.toggle('muy-grande', !!muy);
    try{ localStorage.setItem('seq_tamano', muy ? 'muy-grande' : 'grande'); }catch{}
  }

  function applyTheme(mode){
    const m=(mode==='light'||mode==='dark')?mode:'dark';
    document.documentElement.setAttribute('data-theme', m);
    if (themeBtn){
      const isDark=(m==='dark');
      themeBtn.textContent = isDark ? '🌞 Cambiar a claro' : '🌙 Cambiar a oscuro';
      themeBtn.setAttribute('aria-pressed', String(isDark));
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', m==='dark' ? '#0b0b0b' : '#ffffff');
  }

  function cargarPreferencias(){
    try{
      const t=localStorage.getItem('seq_tamano');
      if (t==='muy-grande') selTam.value='muy-grande';
      aplicarTam();

      const v=localStorage.getItem('seq_vel');
      if (['lento','medio','rapido'].includes(v)) selVel.value=v;
      setVelocidad(selVel.value);

      const m=Number(localStorage.getItem('seq_mejor')||0);
      mejor = isNaN(m)?0:m;
      setTexto(mejorEl, mejor);
    }catch{}
    updateSoundButton();
  }

  /* ===== Ayuda (modal) ===== */
  function openAbout(){ if (aboutModal) { aboutModal.setAttribute('aria-hidden','false'); if (aboutClose) aboutClose.focus(); } }
  function closeAbout(){ if (aboutModal) aboutModal.setAttribute('aria-hidden','true'); }
  if (aboutBtn)   aboutBtn.addEventListener('click', openAbout);
  if (aboutClose) aboutClose.addEventListener('click', closeAbout);
  if (aboutModal) aboutModal.addEventListener('click', (e)=>{ if(e.target===aboutModal) closeAbout(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAbout(); });

  /* ===== Desbloqueo de audio (iOS/Safari) ===== */
  function tryUnlockAudio(){
    if (audioDesbloqueado) return;
    const a = [sndOk, sndBad].filter(Boolean);
    a.forEach(elm=>{
      try{
        const p = elm.play();
        if (p && typeof p.then === 'function') {
          p.then(()=>{ elm.pause(); elm.currentTime = 0; }).catch(()=>{});
        } else {
          elm.pause(); elm.currentTime = 0;
        }
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
    const btn = el(`.color.${color}`);
    if (!btn) return;
    btn.classList.add('activo');
    await delay(tiempos.on);
    btn.classList.remove('activo');
    await delay(tiempos.off);
  }

  async function reproducirSecuencia(){
    puedeJugar = false;
    tablero.setAttribute('aria-busy','true');
    setTexto(mensajeEl, 'Observá la secuencia…');
    for (const c of secuencia){ await iluminar(c); }
    tablero.removeAttribute('aria-busy');
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
    idxJugador = 0;
    nivel++;
    // agregar color evitando repetición consecutiva
    const previo = secuencia.length ? secuencia[secuencia.length - 1] : null;
    secuencia.push(pickNextColor(previo));
    actualizarUI();
    await delay(600);
    await reproducirSecuencia();
  }

  function finDePartida(){
    puedeJugar = false;
    setTexto(mensajeEl, `❌ Error. Alcanzaste el nivel ${nivel}.`);
    playSound(sndBad);
    if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    btnReiniciar.hidden = false;
    btnComenzar.hidden = true;
  }

  function victoriaParcial(){
    // récord
    if (nivel > mejor){
      mejor = nivel;
      setTexto(mejorEl, mejor);
      try{ localStorage.setItem('seq_mejor', String(mejor)); }catch{}
    }

    setTexto(mensajeEl, '✅ ¡Bien! Nueva ronda…');
    if (navigator.vibrate) navigator.vibrate(40);

    let avanzado = false;
    const avanzarUnaVez = ()=>{ if (avanzado) return; avanzado = true; nuevoNivel(); };

    // Respeta el toggle de sonido: si hay sonido, sincroniza con el audio
    if (soundOn && sndOk){
      try{
        sndOk.currentTime = 0;
        const p = sndOk.play();
        if (p && typeof p.then === 'function') p.catch(()=>{});
        sndOk.addEventListener('ended', avanzarUnaVez, { once:true });

        // Respaldo por si 'ended' no dispara
        const espera = Math.max(800, (sndOk.duration || 0.8) * 1000);
        setTimeout(avanzarUnaVez, espera);
        return;
      }catch{}
    }

    // Silenciado o sin audio: avanzar con pequeño delay
    setTimeout(avanzarUnaVez, 800);
  }

  /* ===== Interacción jugador ===== */
  function pulsar(color){
    if (!puedeJugar) return;
    const btn = el(`.color.${color}`);
    if (btn){
      btn.classList.add('activo');
      setTimeout(()=>btn.classList.remove('activo'), 120);
    }

    // registrar
    idxJugador++;
    actualizarUI();

    const esperado = secuencia[idxJugador - 1];
    if (color !== esperado){ finDePartida(); return; }

    // ¿completó el nivel?
    if (idxJugador === secuencia.length){
      puedeJugar = false;
      // pequeño margen para que termine la última iluminación
      setTimeout(victoriaParcial, 150);
    }
  }

  botones.forEach(b=>{
    b.addEventListener('click', ()=> pulsar(b.dataset.color));
  });

  // Teclado: 1–4
  document.addEventListener('keydown', (e)=>{
    const map = { '1':'rojo', '2':'verde', '3':'azul', '4':'amarillo' };
    if (map[e.key]) pulsar(map[e.key]);
  });

  /* ===== Botones ===== */
  async function comenzar(){
    secuencia = [];
    idxJugador = 0;
    nivel = 0;
    setTexto(mensajeEl, '');
    if (pbFill) pbFill.style.width = '0%';

    btnComenzar.hidden = true;
    btnReiniciar.hidden = true;

    await delay(300);
    await nuevoNivel();
  }

  if (btnComenzar) btnComenzar.addEventListener('click', comenzar);
  if (btnReiniciar) btnReiniciar.addEventListener('click', comenzar);

  // Toggle sonido (ícono + aria-label) y cortar al instante si se silencia
  if (soundBtn){
    soundBtn.addEventListener('click', ()=>{
      soundOn = !soundOn;
      try { localStorage.setItem('soundOn', soundOn ? '1' : '0'); } catch {}
      updateSoundButton();
      if (!soundOn) stopAllSounds();
    });
  }

  /* ===== Preferencias / tema ===== */
  if (selTam) selTam.addEventListener('change', aplicarTam);
  if (selVel) selVel.addEventListener('change', ()=> setVelocidad(selVel.value));

  (function initTheme(){
    let mode='dark';
    try{
      const stored=localStorage.getItem('theme');
      if(stored==='light'||stored==='dark') mode=stored;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) mode='light';
    }catch{}
    applyTheme(mode);
  })();

  if (themeBtn){
    themeBtn.addEventListener('click', ()=>{
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch {}
      applyTheme(next);
    });
  }

  /* ===== Init ===== */
  cargarPreferencias();
  actualizarUI();
});

// ----- Modo daltónico (toggle + persistencia) -----
const cbBtn = document.getElementById('cbToggle');

function applyColorblind(on){
  document.documentElement.setAttribute('data-colorblind', on ? 'on' : 'off');
  if (cbBtn){
    cbBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    cbBtn.textContent = on ? 'Modo daltónico: ON' : 'Modo daltónico';
  }
  try { localStorage.setItem('seq_cb', on ? '1' : '0'); } catch {}
}

// Restaurar al cargar
let cbPref = false;
try { cbPref = localStorage.getItem('seq_cb') === '1'; } catch {}
applyColorblind(cbPref);

// Click
cbBtn?.addEventListener('click', ()=>{
  const now = document.documentElement.getAttribute('data-colorblind') !== 'on';
  applyColorblind(now);
});
