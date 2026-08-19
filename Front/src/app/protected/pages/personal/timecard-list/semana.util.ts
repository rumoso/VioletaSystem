// Semanas sábado-viernes del reporte de asistencia (analisis/012). El
// calendario vive aquí, en el Front — el Back solo recibe rangos de
// fechas ya calculados, igual que getAsistenciaList tampoco sabe de
// periodos de nómina.

import { fn_restar, fn_cantidadDesc } from 'src/app/protected/utils/numero.util';

export interface RangoSemana {
  inicio: Date; // sábado
  fin: Date;    // viernes
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export function fn_toISODate( fecha: Date ): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${ y }-${ m }-${ d }`;
}

function fn_sinHora( fecha: Date ): Date {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
}

// La semana sábado-viernes a la que pertenece una fecha cualquiera.
export function fn_semanaDeFecha( fecha: Date ): RangoSemana {

  const d = fn_sinHora(fecha);
  const dow = d.getDay(); // 0=domingo ... 6=sábado
  const diasDesdeSabado = (dow + 1) % 7;

  const inicio = new Date(d);
  inicio.setDate(d.getDate() - diasDesdeSabado);

  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  return { inicio, fin, startDate: fn_toISODate(inicio), endDate: fn_toISODate(fin) };
}

// Todas las semanas que TOCAN el mes (año 1-9999, mes 1-12) — la
// primera y la última pueden salirse del mes; se devuelven con su
// rango real completo, sin recortar (analisis/012: recortarlo daría
// totales falsos).
export function fn_semanasDelMes( anio: number, mes: number ): RangoSemana[] {

  const primerDia = new Date(anio, mes - 1, 1);
  const ultimoDia = new Date(anio, mes, 0);

  const semanas: RangoSemana[] = [];
  let cursor = fn_semanaDeFecha(primerDia).inicio;

  while (cursor <= ultimoDia) {
    const semana = fn_semanaDeFecha(cursor);
    semanas.push(semana);
    cursor = new Date(semana.fin);
    cursor.setDate(cursor.getDate() + 1);
  }

  return semanas;
}

export function fn_esFuturo( semana: RangoSemana, hoy: Date = new Date() ): boolean {
  return semana.inicio > fn_sinHora(hoy);
}

export function fn_esActual( semana: RangoSemana, hoy: Date = new Date() ): boolean {
  const hoy0 = fn_sinHora(hoy);
  return semana.inicio <= hoy0 && hoy0 <= semana.fin;
}

export function fn_esPasado( semana: RangoSemana, hoy: Date = new Date() ): boolean {
  return semana.fin < fn_sinHora(hoy);
}

// Rango a consultar para una semana: si es la semana en curso, el
// corte llega solo hasta el último día ya cerrado (ayer) — aplicado a
// esperadas y trabajadas por igual, para no pintar en rojo/azul días
// que todavía no llegan. Si hoy es sábado no hay ningún día cerrado
// todavía: la semana se marca como recién iniciada y no se consulta.
export function fn_rangoConsulta( semana: RangoSemana, hoy: Date = new Date() ): { startDate: string, endDate: string } | null {

  if (fn_esFuturo(semana, hoy)) {
    return null;
  }

  if (!fn_esActual(semana, hoy)) {
    return { startDate: semana.startDate, endDate: semana.endDate };
  }

  const hoy0 = fn_sinHora(hoy);
  const ayer = new Date(hoy0);
  ayer.setDate(ayer.getDate() - 1);

  if (ayer < semana.inicio) {
    return null; // recién iniciada (hoy es sábado), sin días cerrados
  }

  const finEfectivo = ayer < semana.fin ? ayer : semana.fin;

  return { startDate: semana.startDate, endDate: fn_toISODate(finEfectivo) };
}

const DIAS_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "Lunes 17 de agosto" a partir de una fecha 'YYYY-MM-DD' — se parsea
// a mano (no `new Date('YYYY-MM-DD')`) para no caer en interpretación
// UTC y correr el día en zonas horarias negativas.
export function fn_diaLargoDesc( fechaISO: string ): string {
  const [anio, mes, dia] = fechaISO.split('-').map(n => parseInt(n, 10));
  const d = new Date(anio, mes - 1, dia);
  const diaSemana = DIAS_LARGO[d.getDay()];
  return `${ diaSemana.charAt(0).toUpperCase() }${ diaSemana.slice(1) } ${ dia } de ${ MESES_LARGO[mes - 1] }`;
}

export function fn_rangoCorto( semana: RangoSemana ): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const ini = semana.inicio.toLocaleDateString('es-MX', opts);
  const fin = semana.fin.toLocaleDateString('es-MX', opts);
  return `${ ini } – ${ fin }`;
}

// ── Formato/color de la columna de horas y chips de estatus ──
// Reglas de analisis/012: usadas tanto en el listado como en el
// encabezado del detalle, para que nunca puedan mostrar cosas
// distintas de un mismo renglón.

export interface ResumenSemanalItem {
  idEmpleado: number;
  nombre: string;
  puesto: string | null;
  horasEsperadas: number;
  horasTrabajadas: number;
  diferencia: number;
  iRetardos: number;
  iFaltas: number;
  iIncompletas: number;
  bSinHorario: boolean;
  bPagada: boolean;
  idNomina: number | null;
  pagadaDate?: string | null;
  bEnNominaBorrador: boolean;
  idNominaBorrador: number | null;
}

export function fn_horasFmt( n: number ): string {
  return fn_cantidadDesc(n);
}

// "48-48" o "48-52:+4" — la diferencia solo aparece si la hubo.
// La diferencia se recalcula desde esperadas/trabajadas en vez de
// confiar en el campo `diferencia`: así el formato no depende de que
// quien lo mandó lo haya redondeado.
export function fn_horasColumna( item: { horasEsperadas: number, horasTrabajadas: number } ): string {
  const esp = fn_horasFmt(item.horasEsperadas);
  const trab = fn_horasFmt(item.horasTrabajadas);
  const dif = fn_restar(item.horasTrabajadas, item.horasEsperadas);
  if (dif === 0) {
    return `${ esp }-${ trab }`;
  }
  const signo = dif > 0 ? '+' : '';
  return `${ esp }-${ trab }:${ signo }${ fn_horasFmt(dif) }`;
}

// Sin horario → neutro (no hay contra qué comparar). Exacto → verde.
// De más → azul. De menos bajo 8h → naranja. De menos 8h o más → rojo.
// El redondeo NO es cosmético aquí: sin él, una diferencia de
// 0.0000000001 fallaría el `=== 0` y pintaría azul en vez de verde.
export function fn_horasColor( item: { bSinHorario: boolean, horasEsperadas: number, horasTrabajadas: number } ): 'verde' | 'azul' | 'naranja' | 'rojo' | 'neutro' {
  if (item.bSinHorario) {
    return 'neutro';
  }
  const dif = fn_restar(item.horasTrabajadas, item.horasEsperadas);
  if (dif === 0) return 'verde';
  if (dif > 0) return 'azul';
  if (dif > -8) return 'naranja';
  return 'rojo';
}

export interface ChipEstatus { texto: string; clase: string; }

// El chip de incompletos va primero (dato mal capturado, no conducta
// del empleado); si no hay nada que reportar, un único chip "Completa".
export function fn_chipsEstatus( item: { iIncompletas: number, iFaltas: number, iRetardos: number, bSinHorario: boolean } ): ChipEstatus[] {

  const chips: ChipEstatus[] = [];

  if (item.iIncompletas > 0) {
    chips.push({ texto: `${ item.iIncompletas } incompleto${ item.iIncompletas === 1 ? '' : 's' }`, clase: 'incompleto' });
  }
  if (item.iFaltas > 0) {
    chips.push({ texto: `${ item.iFaltas } falta${ item.iFaltas === 1 ? '' : 's' }`, clase: 'falta' });
  }
  if (item.iRetardos > 0) {
    chips.push({ texto: `${ item.iRetardos } retardo${ item.iRetardos === 1 ? '' : 's' }`, clase: 'retardo' });
  }
  if (item.bSinHorario) {
    chips.push({ texto: 'Sin horario', clase: 'sinhorario' });
  }
  if (chips.length === 0) {
    chips.push({ texto: 'Completa', clase: 'completa' });
  }

  return chips;
}
