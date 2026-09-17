// ══════════════════════════════════════════════════════════════
// QUIÉN ES "EMPLEADO VIGENTE" (analisis/018-empleados-y-puestos.md)
//
// Una sola definición para asistencia, checador y nómina, para que no
// diverjan. Empleado vigente =
//   - usuario activo (users.active = 1; la baja laboral es esto),
//   - con registro complementario en `empleados`,
//   - y con el puesto de sistema "Empleado" (idRol 7).
//
// Quitarle el puesto 7 a alguien lo saca de asistencia y nómina SIN
// borrar sus datos de empleado ni su historial.
//
// Uso: la consulta debe tener `users` con alias U y `empleados` con alias
// E unidos (INNER JOIN users AS U ON U.idUser = E.idUser).
// ══════════════════════════════════════════════════════════════

const { ID_ROL_EMPLEADO } = require('./constantes');

const SQL_EMPLEADO_VIGENTE = `(
    U.active = 1
    AND EXISTS (
        SELECT 1 FROM rolesconfig AS RC_EV
        WHERE RC_EV.idUser = U.idUser AND RC_EV.idRol = ${ ID_ROL_EMPLEADO }
    )
)`;

module.exports = {
    SQL_EMPLEADO_VIGENTE
};
