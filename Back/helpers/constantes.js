// Constantes de negocio compartidas por los controllers
// (analisis/018-empleados-y-puestos.md).

// Puesto de sistema "Empleado": id FIJO. Tenerlo es lo que hace a un
// usuario empleado (datos en `empleados`, asistencia, checador, nómina).
// No se renombra, no cambia de tipo, no se inactiva ni se elimina.
const ID_ROL_EMPLEADO = 7;

// Tipos de rol (tabla `roles_tipo`, catálogo fijo). Definen en qué combos
// aparece la persona; NO dan permisos.
const TIPO_ROL = {
    VENDEDOR: 1,
    TECNICO: 2,
    EMPLEADO: 3,
    // Encargado de taller (analisis/029): revisa el trabajo del técnico y
    // acepta el folio antes de que pase a mostrador. El encargado de un
    // folio es quien tiene este tipo de puesto Y la sucursal del folio.
    ENCARGADO_TALLER: 4
};

module.exports = {
    ID_ROL_EMPLEADO
    , TIPO_ROL
};
