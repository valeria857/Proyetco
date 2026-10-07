import { describe, expect, it } from "vitest";
import {
  avisar,
  CONFIG,
  crearPartida,
  drenar,
  finalizarTurno,
  obtenerResumen,
  type Estado,
  type Zona,
} from "../src/juego";

function buscarZona(estado: Estado, fila: number, columna: number): Zona {
  const zona = estado.zonas.find(
    (elemento) => elemento.fila === fila && elemento.columna === columna,
  );
  if (!zona) throw new Error(`No se encontró la zona en fila ${fila}, columna ${columna}.`);
  return zona;
}

function comprobarFamiliasConstantes(estado: Estado) {
  expect(estado.zonas.reduce((total, zona) => total + zona.familias, 0)).toBe(
    estado.familiasTotales,
  );
}

function jugarEstrategiaDeEvacuacion(semilla: number): Estado {
  const estado = crearPartida(semilla);

  while (estado.resultado === "en curso") {
    while (estado.accionesRestantes > 0 && estado.resultado === "en curso") {
      const zona = estado.zonas
        .filter((candidata) => !candidata.inundada && !candidata.evacuada)
        .sort((a, b) => {
          const urgenciaA = a.agua + (a.fila === CONFIG.FILAS - 1
            ? CONFIG.LLUVIA_QUEBRADA
            : CONFIG.LLUVIA_NORMAL);
          const urgenciaB = b.agua + (b.fila === CONFIG.FILAS - 1
            ? CONFIG.LLUVIA_QUEBRADA
            : CONFIG.LLUVIA_NORMAL);
          return urgenciaB - urgenciaA || b.familias - a.familias;
        })[0];

      if (!zona) break;
      expect(avisar(estado, zona.id)).toBe(true);
      comprobarFamiliasConstantes(estado);
    }

    if (estado.resultado === "en curso") {
      expect(finalizarTurno(estado)).toBe(true);
      comprobarFamiliasConstantes(estado);
    }
  }

  return estado;
}

describe("crearPartida", () => {
  it("arma un tablero con la cantidad correcta de zonas", () => {
    const estado = crearPartida(1);

    expect(estado.zonas).toHaveLength(CONFIG.FILAS * CONFIG.COLUMNAS);
    expect(estado.zonas.map((zona) => zona.id)).toEqual(
      Array.from({ length: CONFIG.FILAS * CONFIG.COLUMNAS }, (_, id) => id),
    );
    expect(estado.zonas.every((zona) =>
      zona.fila >= 0
      && zona.fila < CONFIG.FILAS
      && zona.columna >= 0
      && zona.columna < CONFIG.COLUMNAS,
    )).toBe(true);
  });

  it("genera el mismo tablero con la misma semilla y tableros distintos con semillas distintas", () => {
    const primero = crearPartida(42);
    const repetido = crearPartida(42);
    const distinto = crearPartida(43);

    expect(primero.zonas).toEqual(repetido.zonas);
    expect(primero.zonas).not.toEqual(distinto.zonas);
  });
});

describe("avisar", () => {
  it("evacúa una zona válida, salva a sus familias y consume una acción", () => {
    const estado = crearPartida(2);
    const zona = estado.zonas[0];
    const familiasSalvasAntes = estado.familiasSalvas;
    const accionesAntes = estado.accionesRestantes;

    expect(avisar(estado, zona.id)).toBe(true);

    expect(zona.evacuada).toBe(true);
    expect(estado.familiasSalvas).toBe(familiasSalvasAntes + zona.familias);
    expect(estado.accionesRestantes).toBe(accionesAntes - CONFIG.COSTO_ACCION);
  });

  it("no evacúa una zona inexistente, inundada o ya evacuada", () => {
    const estado = crearPartida(3);
    const inundada = estado.zonas[0];
    const evacuada = estado.zonas[1];
    inundada.inundada = true;
    evacuada.evacuada = true;

    expect(avisar(estado, -1)).toBe(false);
    expect(avisar(estado, inundada.id)).toBe(false);
    expect(avisar(estado, evacuada.id)).toBe(false);
    expect(estado.accionesRestantes).toBe(CONFIG.ACCIONES_POR_TURNO);
  });
});

describe("drenar", () => {
  it("reduce el agua de la zona y sus vecinas y consume una acción", () => {
    const estado = crearPartida(4);
    const centro = buscarZona(estado, 2, 2);
    const vecina = buscarZona(estado, 2, 3);
    const lejana = buscarZona(estado, 0, 0);
    centro.agua = 3;
    vecina.agua = 2;
    lejana.agua = 2;

    expect(drenar(estado, centro.id)).toBe(true);

    expect(centro.agua).toBe(0);
    expect(vecina.agua).toBe(1);
    expect(lejana.agua).toBe(2);
    expect(estado.accionesRestantes).toBe(CONFIG.ACCIONES_POR_TURNO - CONFIG.COSTO_ACCION);
  });

  it("no drena una zona inexistente o inundada", () => {
    const estado = crearPartida(5);
    const zona = estado.zonas[0];
    zona.inundada = true;

    expect(drenar(estado, -1)).toBe(false);
    expect(drenar(estado, zona.id)).toBe(false);
    expect(estado.accionesRestantes).toBe(CONFIG.ACCIONES_POR_TURNO);
  });
});

describe("acciones disponibles", () => {
  it("no permite avisar ni drenar cuando no quedan acciones", () => {
    const estado = crearPartida(6);
    estado.accionesRestantes = 0;
    const aguaInicial = estado.zonas.map((zona) => zona.agua);

    expect(avisar(estado, estado.zonas[0].id)).toBe(false);
    expect(drenar(estado, estado.zonas[1].id)).toBe(false);
    expect(estado.zonas.map((zona) => zona.agua)).toEqual(aguaInicial);
    expect(estado.familiasSalvas).toBe(0);
  });
});

describe("finalizarTurno", () => {
  it("rechaza terminar el turno mientras quedan acciones y no cambia el estado", () => {
    const estado = crearPartida(7);
    const aguaInicial = estado.zonas.map((zona) => zona.agua);

    expect(finalizarTurno(estado)).toBe(false);

    expect(estado.turno).toBe(1);
    expect(estado.accionesRestantes).toBe(CONFIG.ACCIONES_POR_TURNO);
    expect(estado.zonas.map((zona) => zona.agua)).toEqual(aguaInicial);
  });

  it("aplica la lluvia, registra las pérdidas y prepara el turno siguiente", () => {
    const estado = crearPartida(8);
    estado.accionesRestantes = 0;
    const zonaNormal = buscarZona(estado, 0, 0);
    const zonaQuebrada = buscarZona(estado, CONFIG.FILAS - 1, 0);
    zonaNormal.agua = 0;
    zonaQuebrada.agua = 0;

    expect(finalizarTurno(estado)).toBe(true);

    expect(zonaNormal.agua).toBe(CONFIG.LLUVIA_NORMAL);
    expect(zonaQuebrada.agua).toBe(CONFIG.LLUVIA_QUEBRADA);
    expect(estado.turno).toBe(2);
    expect(estado.accionesRestantes).toBe(CONFIG.ACCIONES_POR_TURNO);
    expect(estado.resultado).toBe("en curso");
  });
});

describe("resultado de la partida", () => {
  it("gana al alcanzar la meta de familias salvadas en el último turno", () => {
    const estado = crearPartida(9);
    const objetivo = Math.ceil(
      (estado.familiasTotales * CONFIG.PORCENTAJE_META) / CONFIG.UNIDADES_PORCENTUALES,
    );

    for (const zona of estado.zonas) {
      if (estado.familiasSalvas >= objetivo) break;
      if (estado.accionesRestantes === 0) {
        estado.accionesRestantes = CONFIG.ACCIONES_POR_TURNO;
      }
      expect(avisar(estado, zona.id)).toBe(true);
    }
    estado.turno = CONFIG.TURNOS_MAXIMOS;
    estado.accionesRestantes = 0;

    expect(finalizarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("ganada");
    expect(estado.familiasSalvas).toBeGreaterThanOrEqual(objetivo);
  });

  it("pierde cuando ya no es posible alcanzar la meta", () => {
    const estado = crearPartida(10);
    estado.accionesRestantes = 0;
    for (const zona of estado.zonas) {
      zona.inundada = true;
    }
    estado.familiasPerdidas = estado.familiasTotales;

    expect(finalizarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("perdida");
    expect(estado.accionesRestantes).toBe(0);
  });

  it("pierde al llegar al último turno sin alcanzar la meta", () => {
    const estado = crearPartida(14);
    estado.turno = CONFIG.TURNOS_MAXIMOS;
    estado.accionesRestantes = 0;

    expect(finalizarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("perdida");
  });

  it("permite finalizar con acciones restantes cuando todas las zonas están inundadas", () => {
    const estado = crearPartida(15);
    estado.accionesRestantes = 1;
    estado.zonas.forEach((zona) => {
      zona.inundada = true;
    });
    estado.familiasPerdidas = estado.familiasTotales;

    expect(finalizarTurno(estado)).toBe(true);
    expect(estado.resultado).toBe("perdida");
  });

  it("muestra el resumen con las familias en riesgo y el porcentaje salvado", () => {
    const estado = crearPartida(11);
    const zona = estado.zonas[0];
    avisar(estado, zona.id);

    expect(obtenerResumen(estado)).toEqual({
      turno: estado.turno,
      accionesRestantes: estado.accionesRestantes,
      familiasSalvas: zona.familias,
      familiasEnRiesgo: estado.familiasTotales - zona.familias,
      familiasPerdidas: 0,
      porcentajeSalvado: (zona.familias / estado.familiasTotales) * CONFIG.UNIDADES_PORCENTUALES,
      porcentajeMeta: CONFIG.PORCENTAJE_META,
    });
  });
});

describe("invariantes y partidas completas", () => {
  it("mantiene constante el total de familias a lo largo de una partida", () => {
    const estado = crearPartida(12);
    comprobarFamiliasConstantes(estado);

    for (const zona of estado.zonas.slice(0, CONFIG.ACCIONES_POR_TURNO)) {
      expect(avisar(estado, zona.id)).toBe(true);
      comprobarFamiliasConstantes(estado);
    }

    expect(finalizarTurno(estado)).toBe(true);
    comprobarFamiliasConstantes(estado);
    expect(estado.familiasSalvas + estado.familiasPerdidas + obtenerResumen(estado).familiasEnRiesgo)
      .toBe(estado.familiasTotales);
  });

  it("puede ganar una partida completa evacuando primero las zonas más urgentes", () => {
    const estado = jugarEstrategiaDeEvacuacion(12345);

    expect(estado.resultado).toBe("ganada");
    expect(estado.familiasSalvas / estado.familiasTotales * CONFIG.UNIDADES_PORCENTUALES)
      .toBeGreaterThanOrEqual(CONFIG.PORCENTAJE_META);
  });

  it("termina en derrota si no se hace nada durante toda la partida", () => {
    const estado = crearPartida(13);

    while (estado.resultado === "en curso") {
      estado.accionesRestantes = 0;
      expect(finalizarTurno(estado)).toBe(true);
    }

    expect(estado.resultado).toBe("perdida");
    expect(estado.familiasSalvas).toBe(0);
  });
});
