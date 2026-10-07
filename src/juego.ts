export const CONFIG = {
  FILAS: 5, // filas del tablero
  COLUMNAS: 5, // columnas del tablero
  FAMILIAS_MINIMAS: 1, // familias por zona
  FAMILIAS_MAXIMAS: 3, // familias por zona
  AGUA_MINIMA_INICIAL: 0, // unidades de agua por zona
  AGUA_MAXIMA_INICIAL: 3, // unidades de agua por zona
  NIVEL_INUNDACION: 6, // unidades de agua por zona
  DRENAJE_ZONA: 3, // unidades de agua que baja en la zona elegida
  DRENAJE_VECINAS: 1, // unidades de agua que baja en cada zona vecina
  LLUVIA_NORMAL: 1, // unidades de agua que suma la lluvia en una zona normal
  LLUVIA_QUEBRADA: 2, // unidades de agua que suma la lluvia en la quebrada
  ACCIONES_POR_TURNO: 3, // acciones por turno
  COSTO_ACCION: 1, // acciones que consume cada acción válida
  TURNOS_MAXIMOS: 8, // turnos por partida
  PORCENTAJE_META: 70, // porcentaje de familias que hay que salvar
  UNIDADES_PORCENTUALES: 100, // unidades por cada porcentaje
  DISTANCIA_ZONA_PROPIA: 0, // unidades de distancia entre una zona y sí misma
  DISTANCIA_ZONA_VECINA: 1, // unidades de distancia ortogonal entre zonas
} as const

export type Zona = {
  id: number
  fila: number
  columna: number
  familias: number
  agua: number
  inundada: boolean
  evacuada: boolean
}

export type Estado = {
  zonas: Zona[]
  turno: number
  accionesRestantes: number
  familiasTotales: number
  familiasSalvas: number
  familiasPerdidas: number
  resultado: 'en curso' | 'ganada' | 'perdida'
}

export type Resumen = {
  turno: number
  accionesRestantes: number
  familiasSalvas: number
  familiasEnRiesgo: number
  familiasPerdidas: number
  porcentajeSalvado: number
  porcentajeMeta: number
}

export function crearGeneradorAzar(semilla: number): () => number {
  let estado = semilla >>> 0

  return () => {
    estado += 0x6d2b79f5
    let valor = estado
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1)
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61)
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296
  }
}

export function crearPartida(semilla: number): Estado {
  const azar = crearGeneradorAzar(semilla)
  const zonas: Zona[] = []

  for (let fila = 0; fila < CONFIG.FILAS; fila += 1) {
    for (let columna = 0; columna < CONFIG.COLUMNAS; columna += 1) {
      const id = fila * CONFIG.COLUMNAS + columna
      const familias = CONFIG.FAMILIAS_MINIMAS + Math.floor(
        azar() * (CONFIG.FAMILIAS_MAXIMAS - CONFIG.FAMILIAS_MINIMAS + 1),
      )
      const agua = CONFIG.AGUA_MINIMA_INICIAL + Math.floor(
        azar() * (CONFIG.AGUA_MAXIMA_INICIAL - CONFIG.AGUA_MINIMA_INICIAL + 1),
      )

      zonas.push({ id, fila, columna, familias, agua, inundada: false, evacuada: false })
    }
  }

  const familiasTotales = zonas.reduce((total, zona) => total + zona.familias, 0)

  return {
    zonas,
    turno: 1,
    accionesRestantes: CONFIG.ACCIONES_POR_TURNO,
    familiasTotales,
    familiasSalvas: 0,
    familiasPerdidas: 0,
    resultado: 'en curso',
  }
}

export function avisar(estado: Estado, idZona: number): boolean {
  const zona = estado.zonas.find((elemento) => elemento.id === idZona)
  if (!puedeActuar(estado) || !zona || zona.inundada || zona.evacuada) return false

  zona.evacuada = true
  estado.familiasSalvas += zona.familias
  estado.accionesRestantes -= CONFIG.COSTO_ACCION
  return true
}

export function drenar(estado: Estado, idZona: number): boolean {
  const zona = estado.zonas.find((elemento) => elemento.id === idZona)
  if (!puedeActuar(estado) || !zona || zona.inundada) return false

  for (const vecina of estado.zonas) {
    const distancia = Math.abs(vecina.fila - zona.fila) + Math.abs(vecina.columna - zona.columna)
    if (distancia === CONFIG.DISTANCIA_ZONA_PROPIA) {
      vecina.agua = Math.max(CONFIG.AGUA_MINIMA_INICIAL, vecina.agua - CONFIG.DRENAJE_ZONA)
    } else if (distancia === CONFIG.DISTANCIA_ZONA_VECINA) {
      vecina.agua = Math.max(CONFIG.AGUA_MINIMA_INICIAL, vecina.agua - CONFIG.DRENAJE_VECINAS)
    }
  }

  estado.accionesRestantes -= CONFIG.COSTO_ACCION
  return true
}

export function finalizarTurno(estado: Estado): boolean {
  const noQuedanAccionesLegales = estado.zonas.every((zona) => zona.inundada)
  if (
    estado.resultado !== 'en curso'
    || (estado.accionesRestantes !== 0 && !noQuedanAccionesLegales)
  ) return false

  for (const zona of estado.zonas) {
    zona.agua += zona.fila === CONFIG.FILAS - 1 ? CONFIG.LLUVIA_QUEBRADA : CONFIG.LLUVIA_NORMAL

    if (!zona.inundada && zona.agua >= CONFIG.NIVEL_INUNDACION) {
      zona.inundada = true
      if (!zona.evacuada) estado.familiasPerdidas += zona.familias
    }
  }

  const familiasQueAunPuedenSalvarse = estado.familiasSalvas + familiasEnRiesgo(estado)
  if (familiasQueAunPuedenSalvarse < familiasNecesarias(estado)) {
    estado.resultado = 'perdida'
    estado.accionesRestantes = 0
    return true
  }

  if (estado.turno === CONFIG.TURNOS_MAXIMOS) {
    estado.resultado = estado.familiasSalvas >= familiasNecesarias(estado) ? 'ganada' : 'perdida'
    estado.accionesRestantes = 0
    return true
  }

  estado.turno += 1
  estado.accionesRestantes = CONFIG.ACCIONES_POR_TURNO
  return true
}

export function obtenerResumen(estado: Estado): Resumen {
  return {
    turno: estado.turno,
    accionesRestantes: estado.accionesRestantes,
    familiasSalvas: estado.familiasSalvas,
    familiasEnRiesgo: familiasEnRiesgo(estado),
    familiasPerdidas: estado.familiasPerdidas,
    porcentajeSalvado: (estado.familiasSalvas / estado.familiasTotales) * CONFIG.UNIDADES_PORCENTUALES,
    porcentajeMeta: CONFIG.PORCENTAJE_META,
  }
}

function puedeActuar(estado: Estado): boolean {
  return estado.resultado === 'en curso' && estado.accionesRestantes > 0
}

function familiasEnRiesgo(estado: Estado): number {
  return estado.zonas.reduce(
    (total, zona) => total + (!zona.inundada && !zona.evacuada ? zona.familias : 0),
    0,
  )
}

function familiasNecesarias(estado: Estado): number {
  return Math.ceil(
    (estado.familiasTotales * CONFIG.PORCENTAJE_META) / CONFIG.UNIDADES_PORCENTUALES,
  )
}