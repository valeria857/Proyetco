import "./style.css";
import {
  avisar,
  CONFIG,
  crearPartida,
  drenar,
  finalizarTurno,
  obtenerResumen,
  type Estado,
  type Zona,
} from "./juego";

function obtenerContenedor(): HTMLDivElement {
  const elemento = document.querySelector<HTMLDivElement>("#app");
  if (!elemento) throw new Error("No se encontró el contenedor principal de Tormenta.");
  return elemento;
}

const app = obtenerContenedor();

let estado: Estado | null = null;
let semillaActual = 0;
let mensajes: string[] = [];

const marca = `
  <span class="brand-mark" aria-hidden="true">
    <svg viewBox="0 0 40 40" fill="none">
      <path d="M10.5 23.5a8 8 0 0 1 1.8-15.8 11 11 0 0 1 20.8 4.1 6 6 0 0 1-1.1 11.7H10.5Z" />
      <path class="brand-bolt" d="m21 16-4 7h5l-2 7 7-10h-5l2-4h-3Z" />
    </svg>
  </span>`;

function iniciarPartida(semilla: number) {
  semillaActual = semilla;
  estado = crearPartida(semilla);
  mensajes = [
    `Comienza la operación con la semilla ${semilla}.`,
    `Hay ${estado.familiasTotales} familias distribuidas en ${estado.zonas.length} zonas.`,
    `Meta: salvar al menos el ${CONFIG.PORCENTAJE_META}% antes de que termine el turno ${CONFIG.TURNOS_MAXIMOS}.`,
  ];
  renderizar();
}

function agregarMensaje(mensaje: string) {
  mensajes = [...mensajes, mensaje].slice(-30);
}

function renderizarInicio(error = "") {
  app.innerHTML = `
    <main class="welcome-screen">
      <header class="site-header welcome-header">
        <a class="brand" href="#" aria-label="Tormenta, inicio">
          ${marca}
          <span>tormenta<span class="brand-period">.</span></span>
        </a>
        <span class="header-note"><span class="live-dot"></span> Centro de respuesta climática</span>
      </header>

      <section class="welcome-content" aria-labelledby="welcome-title">
        <div class="welcome-copy">
          <p class="eyebrow"><span class="eyebrow-line"></span> Simulación de emergencia</p>
          <h1 id="welcome-title">Cada decisión<br />puede <em>salvar vidas.</em></h1>
          <p class="welcome-description">
            La tormenta avanza y el agua sube. Organiza la evacuación, drena las zonas críticas
            y protege a la mayor cantidad de familias posible.
          </p>

          <form id="start-form" class="start-form">
            <label for="seed">Semilla de la partida <span>(opcional)</span></label>
            <div class="seed-row">
              <input
                id="seed"
                name="seed"
                type="number"
                step="1"
                placeholder="Dejar vacío para generar una"
                autocomplete="off"
              />
              <button class="button button-primary start-button" type="submit">
                Iniciar partida <span aria-hidden="true">↗</span>
              </button>
            </div>
            <p class="form-hint">Usa una semilla para volver a jugar el mismo escenario.</p>
            <p class="form-error" role="alert">${error}</p>
          </form>

          <div class="welcome-facts" aria-label="Datos de la misión">
            <div><strong>${CONFIG.FILAS * CONFIG.COLUMNAS}</strong><span>zonas</span></div>
            <div><strong>${CONFIG.ACCIONES_POR_TURNO}</strong><span>acciones por turno</span></div>
            <div><strong>${CONFIG.PORCENTAJE_META}%</strong><span>meta de rescate</span></div>
          </div>
        </div>

        <div class="welcome-visual" aria-hidden="true">
          <div class="visual-sun"></div>
          <div class="visual-cloud cloud-one"></div>
          <div class="visual-cloud cloud-two"></div>
          <div class="visual-rain rain-one"></div>
          <div class="visual-rain rain-two"></div>
          <div class="visual-rain rain-three"></div>
          <div class="visual-grid">
            ${Array.from({ length: 25 }, (_, index) => {
              const level = (index * 7 + Math.floor(index / 5) * 3) % 5;
              return `<span class="visual-cell level-${level}"></span>`;
            }).join("")}
          </div>
          <div class="visual-caption">
            <span class="caption-icon">⌁</span>
            <span><strong>Alerta de inundación</strong><small>La quebrada está creciendo</small></span>
            <span class="caption-arrow">↗</span>
          </div>
          <span class="visual-coordinate">40° 42' 46.8" N</span>
        </div>
      </section>

      <footer class="welcome-footer">
        <span>Una decisión a la vez.</span>
        <span>Tormenta <span class="footer-divider">/</span> Simulación estratégica</span>
      </footer>
    </main>`;
}

function claseRiesgo(zona: Zona): string {
  if (zona.inundada) return "zone-flooded";
  if (zona.evacuada) return "zone-safe";
  if (zona.agua >= CONFIG.NIVEL_INUNDACION - 1) return "zone-critical";
  if (zona.agua >= 3) return "zone-warning";
  return "zone-calm";
}

function etiquetaRiesgo(zona: Zona): string {
  if (zona.inundada) return "Inundada";
  if (zona.evacuada) return "Evacuada";
  if (zona.agua >= CONFIG.NIVEL_INUNDACION - 1) return "Crítica";
  if (zona.agua >= 3) return "En riesgo";
  return "Estable";
}

function renderizarZona(zona: Zona): string {
  const deshabilitadas = estado?.resultado !== "en curso" || estado.accionesRestantes <= 0;
  const bloqueadaPorAgua = zona.inundada;
  const yaEvacuada = zona.evacuada;
  const porcentajeAgua = Math.min((zona.agua / CONFIG.NIVEL_INUNDACION) * 100, 100);

  return `
    <article class="zone-card ${claseRiesgo(zona)}" aria-label="Zona ${zona.id + 1}, ${etiquetaRiesgo(zona)}">
      <div class="zone-card-top">
        <span class="zone-name">ZONA ${String(zona.id + 1).padStart(2, "0")}</span>
        <span class="zone-status"><span class="status-dot"></span>${etiquetaRiesgo(zona)}</span>
      </div>
      <div class="water-readout">
        <strong>${zona.agua}</strong>
        <span>unid. de agua</span>
      </div>
      <div
        class="water-meter"
        role="meter"
        aria-label="Nivel de agua"
        aria-valuemin="0"
        aria-valuemax="${CONFIG.NIVEL_INUNDACION}"
        aria-valuenow="${zona.agua}"
      ><span style="width: ${porcentajeAgua}%"></span></div>
      <div class="family-readout">
        <span class="family-icon" aria-hidden="true">♧</span>
        <span><strong>${zona.familias}</strong> ${zona.familias === 1 ? "familia" : "familias"}</span>
      </div>
      <div class="zone-actions">
        <button
          class="zone-action action-drain"
          type="button"
          data-action="drain"
          data-zone-id="${zona.id}"
          aria-label="Drenar zona ${zona.id + 1}"
          ${deshabilitadas || bloqueadaPorAgua ? "disabled" : ""}
        >Drenar</button>
        <button
          class="zone-action action-evacuate"
          type="button"
          data-action="evacuate"
          data-zone-id="${zona.id}"
          aria-label="Evacuar zona ${zona.id + 1}"
          ${deshabilitadas || bloqueadaPorAgua || yaEvacuada ? "disabled" : ""}
        >Evacuar</button>
      </div>
    </article>`;
}

function renderizarRegistro(): string {
  return `
    <section class="panel log-panel" aria-labelledby="log-title">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Comunicación</p>
          <h2 id="log-title">Registro de misión</h2>
        </div>
        <span class="log-live"><span class="live-dot"></span> En vivo</span>
      </div>
      <ol class="log-list" aria-live="polite" aria-relevant="additions">
        ${mensajes.map((mensaje, index) => `
          <li class="log-entry ${index === mensajes.length - 1 ? "log-entry-latest" : ""}">
            <span class="log-marker" aria-hidden="true"></span>
            <p>${mensaje}</p>
          </li>`).join("")}
      </ol>
      <div class="log-footer"><span>SEMILLA</span><strong>${semillaActual}</strong></div>
    </section>`;
}

function renderizarPartida() {
  if (!estado) return renderizarInicio();
  const resumen = obtenerResumen(estado);
  const progreso = Math.min(resumen.porcentajeSalvado, 100);
  const turnosRestantes = CONFIG.TURNOS_MAXIMOS - estado.turno + 1;
  const habilitarFin = estado.resultado === "en curso"
    && (estado.accionesRestantes === 0 || estado.zonas.every((zona) => zona.inundada));

  app.innerHTML = `
    <div class="game-shell">
      <header class="site-header game-header">
        <a class="brand" href="#" aria-label="Tormenta">
          ${marca}
          <span>tormenta<span class="brand-period">.</span></span>
        </a>
        <div class="mission-label"><span class="live-dot"></span> Operación activa <span class="mission-separator">/</span> Semilla ${semillaActual}</div>
        <button class="text-button" type="button" data-action="exit">Salir de la partida <span aria-hidden="true">↗</span></button>
      </header>

      <main class="game-main">
        <section class="mission-heading">
          <div>
            <p class="eyebrow"><span class="eyebrow-line"></span> Centro de operaciones</p>
            <h1>Protege a la comunidad<span class="heading-period">.</span></h1>
            <p class="mission-subtitle">Gestiona tus recursos antes de que la crecida avance.</p>
          </div>
          <div class="turn-pill"><span class="turn-pulse"></span> Turno ${estado.turno} <span>/ ${CONFIG.TURNOS_MAXIMOS}</span></div>
        </section>

        <section class="status-strip" aria-label="Estado general">
          <article class="status-card turn-stat">
            <span class="stat-icon icon-turn" aria-hidden="true">↻</span>
            <div class="stat-copy"><span class="stat-label">TURNO ACTUAL</span><strong>${String(estado.turno).padStart(2, "0")} <small>/ ${String(CONFIG.TURNOS_MAXIMOS).padStart(2, "0")}</small></strong></div>
            <span class="stat-note">${turnosRestantes} ${turnosRestantes === 1 ? "turno" : "turnos"} restantes</span>
          </article>
          <article class="status-card action-stat">
            <span class="stat-icon icon-action" aria-hidden="true">✳</span>
            <div class="stat-copy"><span class="stat-label">ACCIONES</span><strong>${estado.accionesRestantes} <small>/ ${CONFIG.ACCIONES_POR_TURNO}</small></strong></div>
            <span class="stat-note">${estado.accionesRestantes === 1 ? "acción disponible" : "acciones disponibles"}</span>
          </article>
          <article class="status-card rescue-stat">
            <span class="stat-icon icon-rescue" aria-hidden="true">♥</span>
            <div class="stat-copy"><span class="stat-label">FAMILIAS A SALVO</span><strong>${Math.round(resumen.porcentajeSalvado)}<small>% <span class="stat-goal">/ ${resumen.porcentajeMeta}% meta</span></small></strong></div>
            <div class="progress-track" role="progressbar" aria-label="Porcentaje de familias a salvo" aria-valuemin="0" aria-valuemax="${resumen.porcentajeMeta}" aria-valuenow="${Math.min(Math.round(resumen.porcentajeSalvado), resumen.porcentajeMeta)}"><span style="width: ${progreso}%"></span><i style="left: ${resumen.porcentajeMeta}%"></i></div>
          </article>
          <button
            class="button button-finish-turn"
            type="button"
            data-action="finish-turn"
            ${habilitarFin ? "" : "disabled"}
            title="${habilitarFin ? "Avanzar la tormenta al siguiente turno" : "Usa todas tus acciones para finalizar el turno"}"
          >
            <span class="finish-icon" aria-hidden="true">↗</span>
            <span>Finalizar turno</span>
          </button>
        </section>

        <div class="game-columns">
          <section class="panel board-panel" aria-labelledby="board-title">
            <div class="panel-heading board-heading">
              <div>
                <p class="eyebrow">Mapa de la zona</p>
                <h2 id="board-title">Tablero de evacuación</h2>
              </div>
              <div class="board-key" aria-label="Leyenda de riesgo">
                <span><i class="key-calm"></i>Estable</span>
                <span><i class="key-warning"></i>En riesgo</span>
                <span><i class="key-critical"></i>Crítica</span>
              </div>
            </div>
            <div class="board-coordinates"><span>N ↑</span><span>QUEBRADA AL SUR <i aria-hidden="true">⌄</i></span></div>
            <div class="game-board" role="grid" aria-label="Tablero de 5 por 5 zonas">
              ${estado.zonas.map((zona) => renderizarZona(zona)).join("")}
            </div>
            <div class="board-footnote"><span class="footnote-icon">i</span> Drenar reduce el agua de la zona y sus vecinas. Evacuar pone a salvo a todas las familias de una zona.</div>
          </section>

          <aside class="game-sidebar">
            ${renderizarRegistro()}
            <section class="weather-card" aria-label="Alerta meteorológica">
              <div class="weather-head"><span class="weather-symbol" aria-hidden="true">☂</span><span>ALERTA METEOROLÓGICA</span><span class="alert-level">ACTIVA</span></div>
              <h2>La lluvia no espera.</h2>
              <p>Cada turno aumenta el nivel del agua. Las zonas del sur reciben una crecida más intensa.</p>
              <div class="weather-footer"><span>PRÓXIMO CAMBIO</span><strong>Fin de turno <span aria-hidden="true">→</span></strong></div>
            </section>
          </aside>
        </div>
      </main>
      <footer class="game-footer"><span>Tormenta <span class="footer-divider">/</span> Centro de respuesta</span><span>Cuida cada acción. Protege cada vida.</span></footer>
    </div>`;
}

function renderizarFinal() {
  if (!estado) return renderizarInicio();
  const resumen = obtenerResumen(estado);
  const victoria = estado.resultado === "ganada";

  app.innerHTML = `
    <main class="finish-screen ${victoria ? "finish-victory" : "finish-defeat"}">
      <header class="site-header finish-header">
        <a class="brand" href="#" aria-label="Tormenta">
          ${marca}
          <span>tormenta<span class="brand-period">.</span></span>
        </a>
        <span class="header-note"><span class="live-dot"></span> Informe de misión</span>
      </header>
      <section class="finish-content">
        <div class="finish-emblem" aria-hidden="true">${victoria ? "✓" : "!"}</div>
        <p class="eyebrow"><span class="eyebrow-line"></span> Operación finalizada</p>
        <h1>${victoria ? "La comunidad está a salvo." : "La crecida nos ganó."}</h1>
        <p class="finish-description">${victoria
          ? `Gracias a tu respuesta, salvaste a ${estado.familiasSalvas} de ${estado.familiasTotales} familias.`
          : `Se salvaron ${estado.familiasSalvas} de ${estado.familiasTotales} familias. La misión terminó antes de alcanzar la meta.`
        }</p>
        <div class="finish-summary">
          <div><span>FAMILIAS A SALVO</span><strong>${estado.familiasSalvas}<small> / ${estado.familiasTotales}</small></strong></div>
          <div><span>PORCENTAJE RESCATADO</span><strong>${Math.round(resumen.porcentajeSalvado)}<small>%</small></strong></div>
          <div><span>FAMILIAS PERDIDAS</span><strong>${estado.familiasPerdidas}</strong></div>
          <div><span>TURNO FINAL</span><strong>${estado.turno}<small> / ${CONFIG.TURNOS_MAXIMOS}</small></strong></div>
        </div>
        <div class="finish-actions">
          <button class="button button-primary" type="button" data-action="restart">Reiniciar partida <span aria-hidden="true">↻</span></button>
          <button class="button button-secondary" type="button" data-action="home">Cambiar escenario</button>
        </div>
        <p class="finish-seed">Escenario <span>#${semillaActual}</span></p>
      </section>
    </main>`;
}

function renderizar() {
  if (!estado) {
    renderizarInicio();
  } else if (estado.resultado !== "en curso") {
    renderizarFinal();
  } else {
    renderizarPartida();
  }
}

function procesarAccion(action: string, zoneId?: number) {
  if (action === "exit" || action === "home") {
    estado = null;
    renderizarInicio();
    return;
  }

  if (action === "restart") {
    iniciarPartida(semillaActual);
    return;
  }

  if (!estado) return;

  if (action === "drain" && zoneId !== undefined) {
    const zona = estado.zonas.find((elemento) => elemento.id === zoneId);
    const valido = drenar(estado, zoneId);
    agregarMensaje(valido
      ? `Drenaje completado en la zona ${zoneId + 1}. El nivel también baja en las zonas vecinas.`
      : `No fue posible drenar la zona ${zoneId + 1}.`);
    if (valido && zona) agregarMensaje(`Quedan ${estado.accionesRestantes} ${estado.accionesRestantes === 1 ? "acción" : "acciones"} este turno.`);
    renderizarPartida();
    return;
  }

  if (action === "evacuate" && zoneId !== undefined) {
    const zona = estado.zonas.find((elemento) => elemento.id === zoneId);
    const cantidadFamilias = zona?.familias ?? 0;
    const valido = avisar(estado, zoneId);
    agregarMensaje(valido
      ? `Evacuación completada en la zona ${zoneId + 1}: ${cantidadFamilias} ${cantidadFamilias === 1 ? "familia está" : "familias están"} a salvo.`
      : `No fue posible evacuar la zona ${zoneId + 1}.`);
    if (valido) agregarMensaje(`Quedan ${estado.accionesRestantes} ${estado.accionesRestantes === 1 ? "acción" : "acciones"} este turno.`);
    renderizarPartida();
    return;
  }

  if (action === "finish-turn") {
    const zonasQueSeInundaran = estado.zonas
      .filter((zona) => !zona.inundada && zona.agua + (zona.fila === CONFIG.FILAS - 1
        ? CONFIG.LLUVIA_QUEBRADA
        : CONFIG.LLUVIA_NORMAL) >= CONFIG.NIVEL_INUNDACION)
      .map((zona) => zona.id + 1);
    const turnoFinalizado = finalizarTurno(estado);

    if (!turnoFinalizado) {
      agregarMensaje("No se pudo finalizar el turno. Revisa las acciones disponibles.");
    } else {
      agregarMensaje(`Turno ${estado.turno === CONFIG.TURNOS_MAXIMOS || estado.resultado !== "en curso"
        ? estado.turno
        : estado.turno - 1} finalizado. La lluvia hizo crecer el agua en todas las zonas.`);
      if (zonasQueSeInundaran.length > 0) {
        agregarMensaje(`Zonas inundadas: ${zonasQueSeInundaran.map((id) => `#${id}`).join(", ")}.`);
      }
      if (estado.resultado === "ganada") agregarMensaje("Meta alcanzada: la operación fue un éxito.");
      if (estado.resultado === "perdida") agregarMensaje("Ya no es posible alcanzar la meta de rescate.");
      if (estado.resultado === "en curso") agregarMensaje(`Comienza el turno ${estado.turno} con ${estado.accionesRestantes} acciones.`);
    }
    renderizar();
  }
}

app.addEventListener("submit", (event) => {
  if (!(event.target instanceof HTMLFormElement) || event.target.id !== "start-form") return;
  event.preventDefault();
  const input = event.target.elements.namedItem("seed");
  const valor = input instanceof HTMLInputElement ? input.value.trim() : "";
  const semilla = valor === "" ? Math.floor(Date.now() / 1000) : Number(valor);

  if (!Number.isSafeInteger(semilla)) {
    renderizarInicio("Ingresa una semilla entera válida.");
    return;
  }

  iniciarPartida(semilla);
});

app.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button || button.disabled) return;
  const zoneId = button.dataset.zoneId === undefined ? undefined : Number(button.dataset.zoneId);
  procesarAccion(button.dataset.action ?? "", zoneId);
});

renderizarInicio();
