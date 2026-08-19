// Aritmética segura para cantidades (horas, dinero, porcentajes).
//
// En JavaScript los decimales son binarios, así que restas y sumas que
// "deberían" dar un número limpio no lo dan:
//
//   180.02 - 180        →  0.020000000000010232
//   0.1 + 0.2           →  0.30000000000000004
//
// Eso llegó a pantalla en el recibo de nómina (la diferencia de horas
// se calculaba cruda en el template). La regla del proyecto es: **toda
// operación aritmética sobre cantidades se redondea antes de mostrarse
// o de compararse**, y se hace con estos helpers, no a mano en cada
// lugar.

// Redondea a `decimales` (2 por default: horas y dinero).
// El +Number.EPSILON corrige el caso en que el propio valor binario
// queda un pelo por debajo del .5 y Math.round redondearía hacia abajo
// (ej. 1.005 → 1.00 en vez de 1.01).
export function fn_redondear( valor: any, decimales: number = 2 ): number {
  const n = Number(valor);
  if (!isFinite(n)) {
    return 0;
  }
  const factor = Math.pow(10, decimales);
  return Math.round((n + Number.EPSILON) * factor) / factor;
}

// Resta redondeada. Es la que evita el 0.020000000000010232: siempre
// que se reste una cantidad de otra para mostrar o comparar, va por
// aquí.
export function fn_restar( a: any, b: any, decimales: number = 2 ): number {
  return fn_redondear(Number(a) - Number(b), decimales);
}

// Suma redondeada, por simetría con fn_restar.
export function fn_sumar( a: any, b: any, decimales: number = 2 ): number {
  return fn_redondear(Number(a) + Number(b), decimales);
}

// Suma redondeada de una lista (acumular y redondear UNA vez al final
// arrastra menos error que redondear en cada paso).
export function fn_sumarLista( valores: any[], decimales: number = 2 ): number {
  const total = (valores || []).reduce((acc: number, v: any) => acc + (Number(v) || 0), 0);
  return fn_redondear(total, decimales);
}

// Texto de una cantidad ya redondeada, sin ceros de relleno:
// 180 → "180", 180.5 → "180.5", 180.02 → "180.02".
export function fn_cantidadDesc( valor: any, decimales: number = 2 ): string {
  return String(fn_redondear(valor, decimales));
}

// Diferencia con signo explícito para el "+4" / "-4" de las horas.
export function fn_diferenciaDesc( a: any, b: any, decimales: number = 2 ): string {
  const dif = fn_restar(a, b, decimales);
  return `${ dif > 0 ? '+' : '' }${ dif }`;
}

// ── Importe con letra ──
// Un recibo de nómina que se entrega en mano lleva el neto escrito con
// letra: es lo que impide que alguien le agregue un dígito al número.

const _UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE',
  'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];

const _DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];

const _CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function _fn_hasta999( n: number ): string {

  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const resto = n % 100;

  const partes: string[] = [];
  if (c > 0) partes.push(_CENTENAS[c]);

  if (resto > 0) {
    if (resto < 30) {
      partes.push(_UNIDADES[resto]);
    } else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      partes.push(u > 0 ? `${ _DECENAS[d] } Y ${ _UNIDADES[u] }` : _DECENAS[d]);
    }
  }

  return partes.join(' ');
}

// Entero a letras (hasta cientos de millones, de sobra para nómina).
export function fn_numeroALetras( entero: number ): string {

  const n = Math.floor(Math.abs(Number(entero) || 0));
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1000000);
  const miles = Math.floor((n % 1000000) / 1000);
  const resto = n % 1000;

  const partes: string[] = [];

  if (millones > 0) {
    partes.push(millones === 1 ? 'UN MILLÓN' : `${ _fn_hasta999(millones) } MILLONES`);
  }
  if (miles > 0) {
    partes.push(miles === 1 ? 'MIL' : `${ _fn_hasta999(miles) } MIL`);
  }
  if (resto > 0) {
    partes.push(_fn_hasta999(resto));
  }

  return partes.join(' ');
}

// "(SON: MIL OCHOCIENTOS PESOS 00/100 M.N.)"
// Los centavos van en cifra sobre 100, como se acostumbra — escribirlos
// con letra los haría más difíciles de leer, no menos falsificables.
export function fn_importeConLetra( monto: any ): string {

  const valor = fn_redondear(monto);
  const abs = Math.abs(valor);
  const entero = Math.floor(abs);
  const centavos = Math.round((abs - entero) * 100);

  const letras = fn_numeroALetras(entero);
  const moneda = entero === 1 ? 'PESO' : 'PESOS';

  // En moneda el "UNO" final se apocopa: UN PESO, VEINTIÚN PESOS.
  let texto = letras;
  if (texto.endsWith('VEINTIUNO')) {
    texto = `${ texto.slice(0, -9) }VEINTIÚN`;
  } else if (texto.endsWith('UNO')) {
    texto = `${ texto.slice(0, -3) }UN`;
  }

  const signo = valor < 0 ? 'MENOS ' : '';

  return `${ signo }${ texto } ${ moneda } ${ String(centavos).padStart(2, '0') }/100 M.N.`;
}
