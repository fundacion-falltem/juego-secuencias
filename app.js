'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const btnComenzar = document.getElementById('btnComenzar');
  const btnReiniciar = document.getElementById('btnReiniciar');
  const estadoEl = document.getElementById('estado');
  const botones = document.querySelectorAll('.color');

  let secuencia = [];
  let jugador = [];
  let nivel = 0;

  function actualizarEstado() {
    estadoEl.textContent = `Nivel: ${nivel}`;
  }

  function iluminar(btn) {
    btn.classList.add('activo');
    setTimeout(() => btn.classList.remove('activo'), 500);
  }

  function reproducirSecuencia() {
    let i = 0;
    const intervalo = setInterval(() => {
      iluminar(document.querySelector(`[data-color="${secuencia[i]}"]`));
      i++;
      if (i >= secuencia.length) clearInterval(intervalo);
    }, 800);
  }

  function nuevoNivel() {
    jugador = [];
    nivel++;
    actualizarEstado();
    const colores = ['rojo', 'verde', 'azul', 'amarillo'];
    secuencia.push(colores[Math.floor(Math.random() * colores.length)]);
    setTimeout(reproducirSecuencia, 500);
  }

  function verificar() {
    const i = jugador.length - 1;
    if (jugador[i] !== secuencia[i]) {
      estadoEl.textContent = `❌ Error. Alcanzaste el nivel ${nivel}.`;
      btnComenzar.hidden = true;
      btnReiniciar.hidden = false;
      return;
    }
    if (jugador.length === secuencia.length) {
      setTimeout(nuevoNivel, 1000);
    }
  }

  botones.forEach(b => {
    b.addEventListener('click', () => {
      const color = b.dataset.color;
      jugador.push(color);
      iluminar(b);
      verificar();
    });
  });

  btnComenzar.addEventListener('click', () => {
    nivel = 0;
    secuencia = [];
    btnComenzar.hidden = true;
    btnReiniciar.hidden = true;
    nuevoNivel();
  });

  btnReiniciar.addEventListener('click', () => {
    nivel = 0;
    secuencia = [];
    btnComenzar.hidden = true;
    btnReiniciar.hidden = true;
    nuevoNivel();
  });

  actualizarEstado();
});
