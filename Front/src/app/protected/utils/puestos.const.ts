// Constantes de puestos (analisis/018-empleados-y-puestos.md). Mismos
// valores que Back/helpers/constantes.js.

// Puesto de sistema "Empleado": id FIJO. Tenerlo es lo que hace a una
// persona empleado (datos laborales, asistencia, checador, nómina).
export const ID_ROL_EMPLEADO = 7;

// Tipos de puesto (tabla roles_tipo). Definen en qué combos aparece la
// persona y qué datos complementarios tiene; NO dan permisos.
export const TIPO_ROL = {
  VENDEDOR: 1,
  TECNICO: 2,
  EMPLEADO: 3
};
