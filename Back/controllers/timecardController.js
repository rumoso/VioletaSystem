const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// TimeCard: control de horas trabajadas (analisis/011-timecard.md).
// Cinco capas, cada una se corrige distinto:
//   - Horario esperado (sucursal_horarios/empleado_horarios): config,
//     no se deduce de nada.
//   - Marcaje (timecard_marcajes): el hecho crudo, append-only, nunca
//     se edita ni se borra (mismo patrón que comisiones_track).
//   - Jornada (timecard_jornadas): lo que se DEDUCE de los marcajes de
//     un día — se recalcula sola mientras siga PENDIENTE.
//   - Periodo: la suma de jornadas del rango que la nómina va a pagar.
//   - Cierre: al pagar la nómina, las jornadas quedan INCLUIDA_EN_NOMINA
//     y ya no se recalculan (copia congelada, igual que 007/008).
// Queries directas sobre `dbConnection` compartida — nunca
// createConexion(); todo lo multi-statement con
// `dbConnection.transaction()` y COMMIT/ROLLBACK estricto.

const TIPOS_MARCAJE = [
    'ENTRADA_JORNADA', 'SALIDA_COMIDA', 'ENTRADA_COMIDA',
    'SALIDA_PERMISO', 'ENTRADA_PERMISO', 'SALIDA_JORNADA'
];

// Minutos dentro de los cuales un segundo marcaje del mismo tipo se
// considera un doble-chequeo accidental, no un evento nuevo.
const MINUTOS_VENTANA_DUPLICADO = 5;

// --------------------------------------------------------------
// Máquina de estados: dado el último marcaje NO anulado del día,
// qué tipos son válidos ahora. Vive en el Back para que el Front (y
// la captura manual) nunca puedan producir un orden ilógico por una
// regla duplicada que se desincronice.
// --------------------------------------------------------------
const _fn_tiposValidos = (ultimoTipo) => {

    switch (ultimoTipo) {
        case undefined:
        case null:
            return ['ENTRADA_JORNADA'];
        case 'ENTRADA_JORNADA':
        case 'ENTRADA_COMIDA':
        case 'ENTRADA_PERMISO':
            return ['SALIDA_COMIDA', 'SALIDA_PERMISO', 'SALIDA_JORNADA'];
        case 'SALIDA_COMIDA':
            return ['ENTRADA_COMIDA'];
        case 'SALIDA_PERMISO':
            return ['ENTRADA_PERMISO'];
        case 'SALIDA_JORNADA':
            return [];
        default:
            return [];
    }
};

const _fn_diaSemanaISO = (fecha) => moment(fecha, 'YYYY-MM-DD').isoWeekday(); // 1=lunes ... 7=domingo

// Horas entre dos TIME de MySQL ('HH:mm:ss'). Si la salida es antes
// que la entrada se asume que cruza medianoche (caso excepcional,
// ver analisis/011).
const _fn_horasEntreHoras = (horaEntrada, horaSalida) => {
    const inicio = moment(horaEntrada, 'HH:mm:ss');
    let fin = moment(horaSalida, 'HH:mm:ss');
    if (fin.isBefore(inicio)) {
        fin = fin.clone().add(1, 'day');
    }
    return fin.diff(inicio, 'minutes') / 60;
};

// --------------------------------------------------------------
// Horario esperado de un empleado en una fecha. El horario propio
// (si tiene AUNQUE SEA un renglón) gana COMPLETO sobre el de su
// sucursal — un día suyo sin renglón es su descanso, no cae al de la
// sucursal. Solo si no tiene NINGÚN renglón propio se usa el de la
// sucursal. Regresa null si no hay horario para ese día (descanso o
// sin configurar).
// --------------------------------------------------------------
const fn_getHorarioEsperado = async(idEmpleado, fecha, transaction) => {

    const diaSemana = _fn_diaSemanaISO(fecha);

    const horariosEmpleado = await dbConnection.query(
        `SELECT diaSemana, horaEntrada, horaSalida FROM empleado_horarios WHERE idEmpleado = :idEmpleado`,
        { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (horariosEmpleado.length > 0) {
        const dia = horariosEmpleado.find(h => h.diaSemana === diaSemana);
        return dia ? { horaEntrada: dia.horaEntrada, horaSalida: dia.horaSalida } : null;
    }

    const [empleado] = await dbConnection.query(
        `SELECT idSucursal FROM empleados WHERE idEmpleado = :idEmpleado LIMIT 1`,
        { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (!empleado || !empleado.idSucursal) {
        return null;
    }

    const [horarioSucursal] = await dbConnection.query(
        `SELECT horaEntrada, horaSalida FROM sucursal_horarios WHERE idSucursal = :idSucursal AND diaSemana = :diaSemana LIMIT 1`,
        { replacements: { idSucursal: empleado.idSucursal, diaSemana }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    return horarioSucursal || null;
};

// --------------------------------------------------------------
// Recalcula timecard_jornadas para un empleado+día a partir de sus
// marcajes NO anulados. No toca la jornada si ya quedó congelada
// (INCLUIDA_EN_NOMINA/CANCELADA) — copia congelada, igual que nómina.
// --------------------------------------------------------------
const fn_recalcularJornada = async(idEmpleado, fecha, idUserLogON, transaction) => {

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    const [existente] = await dbConnection.query(
        `SELECT idJornada, estatus FROM timecard_jornadas WHERE idEmpleado = :idEmpleado AND fecha = :fecha LIMIT 1`,
        { replacements: { idEmpleado, fecha }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (existente && existente.estatus !== 'PENDIENTE') {
        return;
    }

    const marcajes = await dbConnection.query(
        `SELECT tipo, fechaHora FROM timecard_marcajes
         WHERE idEmpleado = :idEmpleado AND fecha = :fecha AND bAnulado = 0
         ORDER BY fechaHora ASC`,
        { replacements: { idEmpleado, fecha }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    const porTipo = {};
    for (const m of marcajes) {
        if (!porTipo[m.tipo]) {
            porTipo[m.tipo] = m.fechaHora;
        }
    }

    const entrada = porTipo['ENTRADA_JORNADA'];
    const salida = porTipo['SALIDA_JORNADA'];
    const salidaComida = porTipo['SALIDA_COMIDA'];
    const entradaComida = porTipo['ENTRADA_COMIDA'];
    const salidaPermiso = porTipo['SALIDA_PERMISO'];
    const entradaPermiso = porTipo['ENTRADA_PERMISO'];

    const bComidaIncompleta = (!!salidaComida) !== (!!entradaComida);
    const bPermisoIncompleta = (!!salidaPermiso) !== (!!entradaPermiso);
    const bJornadaAbierta = !!entrada && !salida;

    let horasTrabajadas = 0;
    let bIncompleta = false;

    if (entrada && salida && !bComidaIncompleta && !bPermisoIncompleta) {

        let minutosJornada = moment(salida).diff(moment(entrada), 'minutes');

        if (salidaComida && entradaComida) {
            minutosJornada -= moment(entradaComida).diff(moment(salidaComida), 'minutes');
        }
        if (salidaPermiso && entradaPermiso) {
            minutosJornada -= moment(entradaPermiso).diff(moment(salidaPermiso), 'minutes');
        }

        horasTrabajadas = Math.max(0, minutosJornada / 60);

    } else if (entrada && (bComidaIncompleta || bPermisoIncompleta || bJornadaAbierta)) {
        bIncompleta = true;
    }

    const horario = await fn_getHorarioEsperado(idEmpleado, fecha, transaction);

    let horasEsperadas = 0;
    let bFalta = false;
    let bRetardo = false;
    let minutosRetardo = 0;

    if (horario) {
        horasEsperadas = _fn_horasEntreHoras(horario.horaEntrada, horario.horaSalida);

        if (!entrada) {
            bFalta = true;
        } else {
            // Comparar solo hora-del-dia. MySQL2 devuelve las columnas
            // DATETIME como Date cuya representacion UTC coincide con la
            // hora de pared guardada (no hay conversion de huso real) —
            // por eso se lee con moment.utc(), nunca con moment() a secas.
            const horaEntradaReal = moment.utc(entrada);
            const horaEntradaEsperada = moment(horario.horaEntrada, 'HH:mm:ss');
            const minutosReal = horaEntradaReal.hours() * 60 + horaEntradaReal.minutes();
            const minutosEsperados = horaEntradaEsperada.hours() * 60 + horaEntradaEsperada.minutes();
            if (minutosReal > minutosEsperados) {
                bRetardo = true;
                minutosRetardo = minutosReal - minutosEsperados;
            }
        }
    }

    horasTrabajadas = Math.round(horasTrabajadas * 100) / 100;
    horasEsperadas = Math.round(horasEsperadas * 100) / 100;

    if (existente) {
        await dbConnection.query(
            `UPDATE timecard_jornadas
             SET horasTrabajadas = :horasTrabajadas, horasEsperadas = :horasEsperadas,
                 bIncompleta = :bIncompleta, bFalta = :bFalta, bRetardo = :bRetardo,
                 minutosRetardo = :minutosRetardo, updateDate = :updateDate
             WHERE idJornada = :idJornada`,
            {
                replacements: {
                    horasTrabajadas, horasEsperadas,
                    bIncompleta: bIncompleta ? 1 : 0, bFalta: bFalta ? 1 : 0,
                    bRetardo: bRetardo ? 1 : 0, minutosRetardo,
                    updateDate: oGetDateNow, idJornada: existente.idJornada
                },
                type: dbConnection.QueryTypes.UPDATE, transaction
            }
        );
    } else {
        // INSERT ... ON DUPLICATE KEY UPDATE (no un INSERT plano): dos
        // marcajes casi simultaneos del mismo dia (doble-tap, reintento
        // de red) pueden competir por crear la PRIMERA fila de
        // timecard_jornadas para ese idEmpleado+fecha — con un INSERT
        // plano el perdedor de la carrera truena contra el UNIQUE KEY en
        // vez de simplemente actualizar.
        await dbConnection.query(
            `INSERT INTO timecard_jornadas
                (idEmpleado, fecha, horasTrabajadas, horasEsperadas, bIncompleta, bFalta, bRetardo, minutosRetardo, estatus, createDate, idCreateUser)
             VALUES
                (:idEmpleado, :fecha, :horasTrabajadas, :horasEsperadas, :bIncompleta, :bFalta, :bRetardo, :minutosRetardo, 'PENDIENTE', :createDate, :idCreateUser)
             ON DUPLICATE KEY UPDATE
                horasTrabajadas = VALUES(horasTrabajadas), horasEsperadas = VALUES(horasEsperadas),
                bIncompleta = VALUES(bIncompleta), bFalta = VALUES(bFalta), bRetardo = VALUES(bRetardo),
                minutosRetardo = VALUES(minutosRetardo), updateDate = VALUES(createDate)`,
            {
                replacements: {
                    idEmpleado, fecha, horasTrabajadas, horasEsperadas,
                    bIncompleta: bIncompleta ? 1 : 0, bFalta: bFalta ? 1 : 0,
                    bRetardo: bRetardo ? 1 : 0, minutosRetardo,
                    createDate: oGetDateNow, idCreateUser: idUserLogON
                },
                type: dbConnection.QueryTypes.INSERT, transaction
            }
        );
    }
};

// --------------------------------------------------------------
// Resumen de un periodo para un empleado: recorre día por día entre
// fechaInicio y fechaFin. Un día sin jornada registrada pero CON
// horario esperado es una falta que nunca se marcó (nadie checó) — se
// sintetiza aquí porque no existe fila que la represente; un día sin
// horario es descanso y no suma nada. Se usa en la consulta de
// asistencia y al generar la nómina.
// --------------------------------------------------------------
const fn_getResumenPeriodo = async(idEmpleado, fechaInicio, fechaFin, transaction) => {

    const jornadas = await dbConnection.query(
        `SELECT * FROM timecard_jornadas
         WHERE idEmpleado = :idEmpleado AND fecha BETWEEN :fechaInicio AND :fechaFin
         ORDER BY fecha ASC`,
        { replacements: { idEmpleado, fechaInicio, fechaFin }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    const porFecha = {};
    for (const j of jornadas) {
        porFecha[moment(j.fecha).format('YYYY-MM-DD')] = j;
    }

    const dias = [];
    let horasTrabajadas = 0;
    let horasEsperadas = 0;
    let iRetardos = 0;
    let iFaltas = 0;

    const cursor = moment(fechaInicio, 'YYYY-MM-DD');
    const fin = moment(fechaFin, 'YYYY-MM-DD');

    while (cursor.isSameOrBefore(fin, 'day')) {

        const fechaStr = cursor.format('YYYY-MM-DD');
        const jornada = porFecha[fechaStr];

        if (jornada) {

            horasTrabajadas += parseFloat(jornada.horasTrabajadas) || 0;
            horasEsperadas += parseFloat(jornada.horasEsperadas) || 0;
            if (jornada.bRetardo) iRetardos++;
            if (jornada.bFalta) iFaltas++;

            dias.push({
                fecha: fechaStr,
                horasTrabajadas: jornada.horasTrabajadas,
                horasEsperadas: jornada.horasEsperadas,
                bIncompleta: !!jornada.bIncompleta,
                bFalta: !!jornada.bFalta,
                bRetardo: !!jornada.bRetardo,
                minutosRetardo: jornada.minutosRetardo,
                estatus: jornada.estatus,
                idNomina: jornada.idNomina,
                bSinMarcar: false
            });

        } else {

            const horario = await fn_getHorarioEsperado(idEmpleado, fechaStr, transaction);

            if (horario) {
                const horasDia = Math.round(_fn_horasEntreHoras(horario.horaEntrada, horario.horaSalida) * 100) / 100;
                horasEsperadas += horasDia;
                iFaltas++;
                dias.push({
                    fecha: fechaStr, horasTrabajadas: 0, horasEsperadas: horasDia,
                    bIncompleta: false, bFalta: true, bRetardo: false, minutosRetardo: 0,
                    estatus: null, idNomina: null, bSinMarcar: true
                });
            } else {
                dias.push({
                    fecha: fechaStr, horasTrabajadas: 0, horasEsperadas: 0,
                    bIncompleta: false, bFalta: false, bRetardo: false, minutosRetardo: 0,
                    estatus: null, idNomina: null, bSinMarcar: true, bDescanso: true
                });
            }
        }

        cursor.add(1, 'day');
    }

    return {
        dias,
        totales: {
            horasTrabajadas: Math.round(horasTrabajadas * 100) / 100,
            horasEsperadas: Math.round(horasEsperadas * 100) / 100,
            iRetardos,
            iFaltas
        }
    };
};

// ================================================================
// Endpoints del checador — se usan desde el login (sin sesión) y
// desde el header (con sesión); ninguno depende del JWT (igual que
// /api/auth/loginByFace, del que heredan el modelo de confianza: el
// reconocimiento corre en el navegador, el Back recibe a quién
// identificó).
// ================================================================

// Dado el idUser que el facial identificó (IDENTIFICAR, tipoPersona
// USUARIO), regresa si es empleado y qué puede marcar ahora.
const getEstadoTimecard = async(req, res = response) => {

    const { idUser } = req.body;

    try {

        const [empleado] = await dbConnection.query(
            `SELECT idEmpleado, nombre FROM empleados WHERE idUser = :idUser AND active = 1 LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!empleado) {
            return res.json({
                status: 1,
                message: "No estás dado de alta como empleado.",
                data: { bEsEmpleado: false }
            });
        }

        const hoy = moment().format('YYYY-MM-DD');

        const marcajesHoy = await dbConnection.query(
            `SELECT idMarcaje, tipo, fechaHora FROM timecard_marcajes
             WHERE idEmpleado = :idEmpleado AND fecha = :hoy AND bAnulado = 0
             ORDER BY fechaHora ASC`,
            { replacements: { idEmpleado: empleado.idEmpleado, hoy }, type: dbConnection.QueryTypes.SELECT }
        );

        const porTipo = {};
        for (const m of marcajesHoy) {
            porTipo[m.tipo] = m; // se queda el ultimo (ya vienen ordenados asc)
        }

        const ultimoMarcaje = marcajesHoy.length > 0 ? marcajesHoy[marcajesHoy.length - 1] : null;
        const tiposValidos = _fn_tiposValidos(ultimoMarcaje?.tipo);

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                bEsEmpleado: true,
                idEmpleado: empleado.idEmpleado,
                nombre: empleado.nombre,
                marcajesHoy: porTipo,
                ultimoTipo: ultimoMarcaje?.tipo || null,
                tiposValidos,
                bJornadaCerrada: tiposValidos.length === 0
            }
        });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Registra un marcaje desde el checador (facial). Revalida en el Back
// que el tipo sea válido para el estado actual (aunque la pantalla
// solo ofrezca los válidos) e ignora un duplicado del mismo tipo
// dentro de la ventana de minutos definida arriba.
const insertMarcaje = async(req, res = response) => {

    const {
        idUser
        , tipo
        , idSucursal = null
        , similitud = null
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const hoy = moment().format('YYYY-MM-DD');

    try {

        if (!TIPOS_MARCAJE.includes(tipo)) {
            return res.json({ status: 1, message: "Tipo de marcaje inválido." });
        }

        const [empleado] = await dbConnection.query(
            `SELECT idEmpleado, nombre FROM empleados WHERE idUser = :idUser AND active = 1 LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!empleado) {
            return res.json({ status: 1, message: "No estás dado de alta como empleado.", data: { bEsEmpleado: false } });
        }

        const ultimo = await dbConnection.query(
            `SELECT tipo, fechaHora FROM timecard_marcajes
             WHERE idEmpleado = :idEmpleado AND fecha = :hoy AND bAnulado = 0
             ORDER BY fechaHora DESC LIMIT 1`,
            { replacements: { idEmpleado: empleado.idEmpleado, hoy }, type: dbConnection.QueryTypes.SELECT }
        );

        const ultimoTipo = ultimo.length > 0 ? ultimo[0].tipo : null;
        const tiposValidos = _fn_tiposValidos(ultimoTipo);

        if (!tiposValidos.includes(tipo)) {
            return res.json({
                status: 1,
                message: tiposValidos.length === 0
                    ? "Ya cerraste tu jornada de hoy."
                    : "Ese marcaje no es válido en este momento."
            });
        }

        // Doble chequeo accidental: mismo tipo, mismo empleado, hace pocos minutos
        const [ultimoMismoTipo] = await dbConnection.query(
            `SELECT fechaHora FROM timecard_marcajes
             WHERE idEmpleado = :idEmpleado AND tipo = :tipo AND bAnulado = 0
             ORDER BY fechaHora DESC LIMIT 1`,
            { replacements: { idEmpleado: empleado.idEmpleado, tipo }, type: dbConnection.QueryTypes.SELECT }
        );

        if (ultimoMismoTipo && moment().diff(moment(ultimoMismoTipo.fechaHora), 'minutes') < MINUTOS_VENTANA_DUPLICADO) {
            return res.json({
                status: 0,
                message: "Ya habías registrado ese marcaje hace un momento.",
                data: { bDuplicado: true, nombre: empleado.nombre }
            });
        }

        const transaction = await dbConnection.transaction();

        try {

            await dbConnection.query(
                `INSERT INTO timecard_marcajes
                    (idEmpleado, idUser, fecha, fechaHora, tipo, idSucursal, origen, similitud, createDate, idCreateUser)
                 VALUES
                    (:idEmpleado, :idUser, :hoy, :fechaHora, :tipo, :idSucursal, 'FACIAL', :similitud, :createDate, :idCreateUser)`,
                {
                    replacements: {
                        idEmpleado: empleado.idEmpleado, idUser, hoy, fechaHora: oGetDateNow, tipo,
                        idSucursal, similitud, createDate: oGetDateNow, idCreateUser: idUser
                    },
                    type: dbConnection.QueryTypes.INSERT, transaction
                }
            );

            await fn_recalcularJornada(empleado.idEmpleado, hoy, idUser, transaction);

            await transaction.commit();

        } catch (errorTx) {
            await transaction.rollback();
            throw errorTx;
        }

        res.json({
            status: 0,
            message: "Marcaje registrado con éxito.",
            data: { nombre: empleado.nombre, tipo, fechaHora: oGetDateNow }
        });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Captura/corrección manual — SIEMPRE con autorización especial
// (auth_idUser, validado en la ruta). No revalida la secuencia: es
// precisamente el camino para el caso que la secuencia normal no
// permite (olvido de checar, reabrir una jornada cerrada).
const insertMarcajeManual = async(req, res = response) => {

    const {
        idEmpleado
        , tipo
        , fechaHora
        , idSucursal = null
        , motivo
        , idMarcajeCorrige = null
        , auth_idUser = 0

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    if (auth_idUser == 0) {
        return res.json({ status: 1, message: "No se pudo capturar el marcaje porque no fue autorizada la acción." });
    }
    if (!TIPOS_MARCAJE.includes(tipo)) {
        return res.json({ status: 1, message: "Tipo de marcaje inválido." });
    }
    if (!motivo || !motivo.trim()) {
        return res.json({ status: 1, message: "El motivo es obligatorio." });
    }

    const transaction = await dbConnection.transaction();

    try {

        const [empleado] = await dbConnection.query(
            `SELECT idEmpleado, idUser, nombre FROM empleados WHERE idEmpleado = :idEmpleado LIMIT 1`,
            { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!empleado) {
            await transaction.rollback();
            return res.json({ status: 1, message: "El empleado no existe." });
        }

        const sFecha = fechaHora.substring(0, 10);

        if (idMarcajeCorrige) {

            const [original] = await dbConnection.query(
                `SELECT idMarcaje, idEmpleado, fecha FROM timecard_marcajes WHERE idMarcaje = :idMarcajeCorrige LIMIT 1`,
                { replacements: { idMarcajeCorrige }, type: dbConnection.QueryTypes.SELECT, transaction }
            );

            if (!original || original.idEmpleado !== empleado.idEmpleado) {
                await transaction.rollback();
                return res.json({ status: 1, message: "El marcaje a corregir no existe o no es de este empleado." });
            }

            await dbConnection.query(
                `UPDATE timecard_marcajes SET bAnulado = 1 WHERE idMarcaje = :idMarcajeCorrige`,
                { replacements: { idMarcajeCorrige }, type: dbConnection.QueryTypes.UPDATE, transaction }
            );
        }

        await dbConnection.query(
            `INSERT INTO timecard_marcajes
                (idEmpleado, idUser, fecha, fechaHora, tipo, idSucursal, origen, idMarcajeCorrige, motivo, auth_idUser, createDate, idCreateUser)
             VALUES
                (:idEmpleado, :idUser, :fecha, :fechaHora, :tipo, :idSucursal, 'MANUAL', :idMarcajeCorrige, :motivo, :auth_idUser, :createDate, :idCreateUser)`,
            {
                replacements: {
                    idEmpleado: empleado.idEmpleado, idUser: empleado.idUser, fecha: sFecha, fechaHora, tipo,
                    idSucursal, idMarcajeCorrige, motivo, auth_idUser,
                    createDate: oGetDateNow, idCreateUser: idUserLogON
                },
                type: dbConnection.QueryTypes.INSERT, transaction
            }
        );

        await fn_recalcularJornada(empleado.idEmpleado, sFecha, idUserLogON, transaction);

        if (idMarcajeCorrige) {
            const [original2] = await dbConnection.query(
                `SELECT fecha FROM timecard_marcajes WHERE idMarcaje = :idMarcajeCorrige LIMIT 1`,
                { replacements: { idMarcajeCorrige }, type: dbConnection.QueryTypes.SELECT, transaction }
            );
            if (original2 && original2.fecha !== sFecha) {
                // El marcaje corregido pertenecia a otro dia: recalcular tambien ese dia
                await fn_recalcularJornada(empleado.idEmpleado, moment(original2.fecha).format('YYYY-MM-DD'), idUserLogON, transaction);
            }
        }

        await transaction.commit();

        res.json({
            status: 0,
            message: "Marcaje capturado con éxito."
        });

    } catch (error) {

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ================================================================
// Consulta de asistencia
// ================================================================

const getAsistenciaList = async(req, res = response) => {

    const {
        idEmpleado
        , startDate
        , endDate
    } = req.body;

    try {

        const [empleado] = await dbConnection.query(
            `SELECT idEmpleado, nombre FROM empleados WHERE idEmpleado = :idEmpleado LIMIT 1`,
            { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!empleado) {
            return res.json({ status: 1, message: "El empleado no existe." });
        }

        const resumen = await fn_getResumenPeriodo(idEmpleado, startDate.substring(0, 10), endDate.substring(0, 10));

        const marcajes = await dbConnection.query(
            `SELECT idMarcaje AS id, tipo, fecha, fechaHora, origen, similitud, motivo, bAnulado, idMarcajeCorrige
             FROM timecard_marcajes
             WHERE idEmpleado = :idEmpleado AND fecha BETWEEN :startDate AND :endDate
             ORDER BY fechaHora ASC`,
            { replacements: { idEmpleado, startDate: startDate.substring(0, 10), endDate: endDate.substring(0, 10) }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                nombreEmpleado: empleado.nombre,
                dias: resumen.dias,
                totales: resumen.totales,
                marcajes
            }
        });

    } catch (error) {

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ================================================================
// Horarios (sucursal / empleado) — guardado completo de los 7 días
// de una vez; el día que no viene en la lista queda como descanso.
// ================================================================

const getHorarioSucursal = async(req, res = response) => {

    const { idSucursal } = req.body;

    try {

        const dias = await dbConnection.query(
            `SELECT diaSemana, horaEntrada, horaSalida FROM sucursal_horarios WHERE idSucursal = :idSucursal ORDER BY diaSemana ASC`,
            { replacements: { idSucursal }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: "Ejecutado correctamente.", data: dias });

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

const guardarHorarioSucursal = async(req, res = response) => {

    const {
        idSucursal
        , dias = [] // [{ diaSemana, horaEntrada, horaSalida }] -- solo los dias que SI trabajan

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try {

        await dbConnection.query(
            `DELETE FROM sucursal_horarios WHERE idSucursal = :idSucursal`,
            { replacements: { idSucursal }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        for (const dia of dias) {
            await dbConnection.query(
                `INSERT INTO sucursal_horarios (idSucursal, diaSemana, horaEntrada, horaSalida, createDate, idCreateUser)
                 VALUES (:idSucursal, :diaSemana, :horaEntrada, :horaSalida, :createDate, :idCreateUser)`,
                {
                    replacements: { idSucursal, diaSemana: dia.diaSemana, horaEntrada: dia.horaEntrada, horaSalida: dia.horaSalida, createDate: oGetDateNow, idCreateUser: idUserLogON },
                    type: dbConnection.QueryTypes.INSERT, transaction
                }
            );
        }

        await transaction.commit();

        res.json({ status: 0, message: "Horario guardado con éxito." });

    } catch (error) {

        await transaction.rollback();

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

const getHorarioEmpleado = async(req, res = response) => {

    const { idEmpleado } = req.body;

    try {

        const dias = await dbConnection.query(
            `SELECT diaSemana, horaEntrada, horaSalida FROM empleado_horarios WHERE idEmpleado = :idEmpleado ORDER BY diaSemana ASC`,
            { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: "Ejecutado correctamente.", data: dias });

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

const guardarHorarioEmpleado = async(req, res = response) => {

    const {
        idEmpleado
        , dias = []

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try {

        await dbConnection.query(
            `DELETE FROM empleado_horarios WHERE idEmpleado = :idEmpleado`,
            { replacements: { idEmpleado }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        for (const dia of dias) {
            await dbConnection.query(
                `INSERT INTO empleado_horarios (idEmpleado, diaSemana, horaEntrada, horaSalida, createDate, idCreateUser)
                 VALUES (:idEmpleado, :diaSemana, :horaEntrada, :horaSalida, :createDate, :idCreateUser)`,
                {
                    replacements: { idEmpleado, diaSemana: dia.diaSemana, horaEntrada: dia.horaEntrada, horaSalida: dia.horaSalida, createDate: oGetDateNow, idCreateUser: idUserLogON },
                    type: dbConnection.QueryTypes.INSERT, transaction
                }
            );
        }

        await transaction.commit();

        res.json({ status: 0, message: "Horario guardado con éxito." });

    } catch (error) {

        await transaction.rollback();

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

module.exports = {
    getEstadoTimecard
    , insertMarcaje
    , insertMarcajeManual
    , getAsistenciaList
    , getHorarioSucursal
    , guardarHorarioSucursal
    , getHorarioEmpleado
    , guardarHorarioEmpleado

    // Helpers reutilizados por nominaController.js (analisis/011 T10)
    , fn_getResumenPeriodo
}
