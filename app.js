'use strict';

document.addEventListener('DOMContentLoaded', () => {
  /* ===== Versión ===== */
  const VERSION = "v1.1";
  const versionEl = document.getElementById('versionLabel');
  if (versionEl) versionEl.textContent = VERSION;

  /* ===== Refs ===== */
  const btnComenzar  = document.getElementById('btnComenzar');
  const btnReiniciar = document.getElementById('btnReiniciar');
  const themeBtn     = document.getElementById('themeToggle');
  const selTam       = document.getElementById('tamano');
  const selVel       = document.getElementById('velocidad');

  const aboutBtn   = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const aboutClose = document.getElementById('aboutClose');

  const tablero    = document.querySelector('.tablero');
  const botones    = document.querySelectorAll('.color');

  const nivelEl    = document.getElementById('nivel');
  const pasoEl     = document.getElementById('paso');
  const pasosTotalEl = document.getElementById('pasosTotal');
  const mejorEl    = document.getElementById('mejor');
  const pbFill     = document.getElementById('pbFill');
  const mensajeEl  = document.getElementById('mensaje');

  /* ===== Estado ===== */
  const COLORES = ['rojo','verde','azul','amarillo'];
  let secuencia = [];
  let idxJugador = 0;
  let nivel = 0;
  let mejor = 0;
  let puedeJugar = false;  // bloquea input durante reproducción
  let tiempos = { on: 550, off: 250 }; // default "medio"

  /* ===== Util ===== */
  const el = (s) => document.querySelector(s);
  const delay = (ms) => new Promise(r => setTimeout(r, ms));
  const randomColor = () => COLORES[Math.floor(Math.random()*COLORES.length)];
  const setTexto = (n, t) => n && (n.textContent = String(t));

  function setVelocidad(v){
    if (v==='lento')  tiempos = { on: 700, off: 350 };
    if (v==='medio')  tiempos = { on: 550, off: 250 };
    if (v==='rapido') tiempos = { on: 400, off: 200 };
    try{ localStorage.setItem('seq_vel', v); }catch{}
  }

  function aplicarTam(){
    const muy = selTam?.value === 'muy-grande';
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
  }

  /* ===== Ayuda (modal) ===== */
  function openAbout(){ aboutModal?.setAttribute('aria-hidden','false'); aboutClose?.focus(); }
  function closeAbout(){ aboutModal?.setAttribute('aria-hidden','true'); }
  aboutBtn?.addEventListener('click', openAbout);
  aboutClose?.addEventListener('click', closeAbout);
  aboutModal?.addEventListener('click', (e)=>{ if(e.target===aboutModal) closeAbout(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeAbout(); });

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
    setTexto(mensajeEl, 'Observá la secuencia…');
    secuencia.push(randomColor());
    actualizarUI();
    await delay(600);
    await reproducirSecuencia();
  }

  function finDePartida(){
    puedeJugar = false;
    setTexto(mensajeEl, `❌ Error. Alcanzaste el nivel ${nivel}.`);
    btnReiniciar.hidden = false;
    btnComenzar.hidden = true;
  }

  function victoriaParcial(){
    // Completó correctamente el nivel actual
    if (nivel > mejor){
      mejor = nivel;
      setTexto(mejorEl, mejor);
      try{ localStorage.setItem('seq_mejor', String(mejor)); }catch{}
    }
    setTexto(mensajeEl, '✅ ¡Bien! Nueva ronda…');
    nuevoNivel();
  }

  /* ===== Interacción jugador ===== */
  function pulsar(color){
    if (!puedeJugar) return;
    const btn = el(`.color.${color}`);
    btn?.classList.add('activo');
    setTimeout(()=>btn?.classList.remove('activo'), 120);

    // registrar
    idxJugador++;
    actualizarUI();

    const esperado = secuencia[idxJugador - 1];
    if (color !== esperado){ finDePartida(); return; }

    // ¿completó el nivel?
    if (idxJugador === secuencia.length){
      puedeJugar = false;
      setTimeout(victoriaParcial, 600);
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
    pbFill && (pbFill.style.width = '0%');

    btnComenzar.hidden = true;
    btnReiniciar.hidden = true;

    await delay(300);
    await nuevoNivel();
  }

  btnComenzar?.addEventListener('click', comenzar);
  btnReiniciar?.addEventListener('click', comenzar);

  /* ===== Preferencias / tema ===== */
  selTam?.addEventListener('change', aplicarTam);
  selVel?.addEventListener('change', ()=> setVelocidad(selVel.value));

  (function initTheme(){
    let mode='dark';
    try{
      const stored=localStorage.getItem('theme');
      if(stored==='light'||stored==='dark') mode=stored;
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) mode='light';
    }catch{}
    applyTheme(mode);
  })();

  themeBtn?.addEventListener('click', ()=>{
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', next); } catch {}
    applyTheme(next);
  });

  /* ===== Init ===== */
  cargarPreferencias();
  actualizarUI();
});
