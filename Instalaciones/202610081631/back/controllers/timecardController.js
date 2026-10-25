const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { fn_validarComprobante, fn_gastarComprobante } = require('../helpers/faceTicket');
const { fn_logExitoComprobante } = require('../helpers/faceBitacora');
const { ID_ROL_EMPLEADO } = require('../helpers/constantes');
const { SQL_EMPLEADO_VIGENTE } = require('../helpers/empleadoVigente');

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
    let iIncompletas = 0;

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
            if (jornada.bIncompleta) iIncompletas++;

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
            iFaltas,
            iIncompletas
        }
    };
};

// --------------------------------------------------------------
// Resumen de TODAS las jornadas PENDIENTE de un empleado, sin acotar
// fecha — mismo criterio que usa pagarNomina para ligar timecard_jornadas
// cuando la nómina no tiene fechaInicio/fechaFin (barre todo lo
// pendiente, sin importar la fecha). generarNomina lo usa en ese mismo
// caso para que el bloque informativo del recibo refleje exactamente
// lo que se va a congelar al pagar, en vez de quedar en cero.
// A diferencia de fn_getResumenPeriodo, NO sintetiza faltas de días sin
// fila (no hay rango del que partir para saber qué días "deberían"
// tener jornada) — solo suma jornadas que ya existen.
// --------------------------------------------------------------
const fn_getResumenPendiente = async(idEmpleado, transaction) => {

    const [row] = await dbConnection.query(
        `SELECT
            COALESCE(SUM(horasTrabajadas), 0) AS horasTrabajadas,
            COALESCE(SUM(horasEsperadas), 0) AS horasEsperadas,
            COALESCE(SUM(bRetardo), 0) AS iRetardos,
            COALESCE(SUM(bFalta), 0) AS iFaltas,
            COALESCE(SUM(bIncompleta), 0) AS iIncompletas
         FROM timecard_jornadas
         WHERE idEmpleado = :idEmpleado AND estatus = 'PENDIENTE'`,
        { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    return {
        horasTrabajadas: Math.round(parseFloat(row.horasTrabajadas) * 100) / 100,
        horasEsperadas: Math.round(parseFloat(row.horasEsperadas) * 100) / 100,
        iRetardos: Number(row.iRetardos),
        iFaltas: Number(row.iFaltas),
        iIncompletas: Number(row.iIncompletas)
    };
};

// --------------------------------------------------------------
// ¿Este empleado tiene ALGÚN horario configurado (propio o de su
// sucursal)? A diferencia de fn_getHorarioEsperado (que resuelve un
// día puntual), esto contesta "existe con qué comparar" en general —
// lo usa el reporte semanal para no pintar de rojo/verde a alguien
// contra quien no hay nada que comparar (analisis/012).
// --------------------------------------------------------------
const fn_tieneHorarioConfigurado = async(idEmpleado, transaction) => {

    const propios = await dbConnection.query(
        `SELECT 1 FROM empleado_horarios WHERE idEmpleado = :idEmpleado LIMIT 1`,
        { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (propios.length > 0) {
        return true;
    }

    const [empleado] = await dbConnection.query(
        `SELECT idSucursal FROM empleados WHERE idEmpleado = :idEmpleado LIMIT 1`,
        { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (!empleado || !empleado.idSucursal) {
        return false;
    }

    const sucursal = await dbConnection.query(
        `SELECT 1 FROM sucursal_horarios WHERE idSucursal = :idSucursal LIMIT 1`,
        { replacements: { idSucursal: empleado.idSucursal }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    return sucursal.length > 0;
};

// --------------------------------------------------------------
// Estado de pago de un rango (semana) para un empleado (analisis/012).
// "Pagada" es una señal directa sobre timecard_jornadas.idNomina, NUNCA
// se infiere por traslape de fechas contra nomina (una nómina con
// fechaInicio/fechaFin NULL barre TODAS las jornadas pendientes sin
// importar la fecha, así que el traslape solo sirve para detectar
// nóminas en BORRADOR que todavía no marcaron nada).
// --------------------------------------------------------------
const fn_getEstadoPagoSemana = async(idEmpleado, fechaInicio, fechaFin, transaction) => {

    const [pagada] = await dbConnection.query(
        `SELECT J.idNomina, N.fechaInicio, N.fechaFin, N.pagadaDate, COUNT(*) AS c
         FROM timecard_jornadas AS J
         INNER JOIN nomina AS N ON N.idNomina = J.idNomina
         WHERE J.idEmpleado = :idEmpleado AND J.fecha BETWEEN :fechaInicio AND :fechaFin
           AND J.estatus = 'INCLUIDA_EN_NOMINA' AND J.idNomina IS NOT NULL
         GROUP BY J.idNomina, N.fechaInicio, N.fechaFin, N.pagadaDate
         ORDER BY c DESC LIMIT 1`,
        { replacements: { idEmpleado, fechaInicio, fechaFin }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    // Solo cuenta una nómina BORRADOR con fechaInicio/fechaFin CAPTURADAS
    // que traslapen la semana. Una nómina con fechas NULL barre TODAS las
    // jornadas pendientes del empleado sin importar la fecha (ver nota en
    // fn_getEstadoPagoSemana) — tratarla como traslape aquí marcaría CADA
    // semana como "en borrador" para siempre mientras esa nómina exista,
    // un falso positivo mucho peor que el falso negativo de no avisar.
    const [enBorrador] = await dbConnection.query(
        `SELECT N.idNomina
         FROM nomina_recibos AS R
         INNER JOIN nomina AS N ON N.idNomina = R.idNomina
         WHERE R.idEmpleado = :idEmpleado AND N.estatus = 'BORRADOR'
           AND N.fechaInicio IS NOT NULL AND N.fechaFin IS NOT NULL
           AND N.fechaInicio <= :fechaFin AND N.fechaFin >= :fechaInicio
         LIMIT 1`,
        { replacements: { idEmpleado, fechaInicio, fechaFin }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    return {
        bPagada: !!pagada,
        idNomina: pagada ? pagada.idNomina : null,
        pagadaDate: pagada ? pagada.pagadaDate : null,
        bEnNominaBorrador: !!enBorrador,
        idNominaBorrador: enBorrador ? enBorrador.idNomina : null
    };
};

// --------------------------------------------------------------
// Resumen semanal (analisis/012): un renglón por empleado con sus
// horas/chips del rango. Reusa fn_getResumenPeriodo POR EMPLEADO en
// vez de una query agrupada nueva — cuesta una consulta extra por
// empleado (aceptable en un padrón de decenas de personas), pero
// GARANTIZA que el total del listado y el del detalle de un mismo
// empleado nunca puedan divergir, porque salen del mismo código.
// --------------------------------------------------------------
const fn_getResumenSemanal = async(fechaInicio, fechaFin, idEmpleado, transaction) => {

    const filtroEmpleado = idEmpleado ? 'AND E.idEmpleado = :idEmpleado' : '';

    // Nombre y puestos salen de users/roles (analisis/018). Solo quien
    // tiene el puesto de sistema "Empleado"; la baja la acotan las fechas
    // para que las semanas pasadas sigan mostrando a quien ya se fue.
    const empleados = await dbConnection.query(
        `SELECT E.idEmpleado, U.name AS nombre,
                IFNULL( ( SELECT GROUP_CONCAT( R.name ORDER BY R.name SEPARATOR ', ' )
                   FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
                   WHERE RC.idUser = U.idUser AND R.active = 1 AND R.bSistema = 0 ), '' ) AS puesto
         FROM empleados AS E
         INNER JOIN users AS U ON U.idUser = E.idUser
         WHERE E.fechaIngreso <= :fechaFin
           AND (E.fechaBaja IS NULL OR E.fechaBaja >= :fechaInicio)
           AND EXISTS ( SELECT 1 FROM rolesconfig AS RC7 WHERE RC7.idUser = U.idUser AND RC7.idRol = ${ ID_ROL_EMPLEADO } )
           ${filtroEmpleado}
         ORDER BY U.name ASC`,
        { replacements: { idEmpleado, fechaInicio, fechaFin }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    const resultado = [];

    for (const emp of empleados) {

        const resumen = await fn_getResumenPeriodo(emp.idEmpleado, fechaInicio, fechaFin, transaction);
        const bSinHorario = !(await fn_tieneHorarioConfigurado(emp.idEmpleado, transaction));
        const estadoPago = await fn_getEstadoPagoSemana(emp.idEmpleado, fechaInicio, fechaFin, transaction);

        resultado.push({
            idEmpleado: emp.idEmpleado,
            nombre: emp.nombre,
            puesto: emp.puesto,
            horasEsperadas: resumen.totales.horasEsperadas,
            horasTrabajadas: resumen.totales.horasTrabajadas,
            diferencia: Math.round((resumen.totales.horasTrabajadas - resumen.totales.horasEsperadas) * 100) / 100,
            iRetardos: resumen.totales.iRetardos,
            iFaltas: resumen.totales.iFaltas,
            iIncompletas: resumen.totales.iIncompletas,
            bSinHorario,
            ...estadoPago
        });

    }

    return resultado;
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
// Estado del empleado en el checador (analisis/020). Exige el
// comprobante facial del checador y lo valida SIN gastarlo: el mismo
// comprobante se gasta al registrar el marcaje. Quién es sale del
// comprobante, no del navegador.
const getEstadoTimecard = async(req, res = response) => {

    const { ticket } = req.body;

    const oComprobante = fn_validarComprobante(ticket, { proposito: 'TIMECARD', tipoPersona: 'USUARIO', bGastar: false });

    if (!oComprobante.ok) {
        return res.json({ status: 1, message: oComprobante.message, data: { bComprobanteInvalido: true } });
    }

    const idUser = oComprobante.datos.idPersona;

    try {

        const [empleado] = await dbConnection.query(
            `SELECT E.idEmpleado, U.name AS nombre
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE E.idUser = :idUser AND ${ SQL_EMPLEADO_VIGENTE }
             LIMIT 1`,
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
//
// analisis/020: exige el comprobante facial del checador. Quién marca y
// con qué similitud salen del comprobante; antes venían del navegador y
// cualquiera podía checar por cualquier empleado sin mostrar un rostro.
const insertMarcaje = async(req, res = response) => {

    const {
        ticket
        , tipo
        , idSucursal = null
    } = req.body;

    const oComprobante = fn_validarComprobante(ticket, { proposito: 'TIMECARD', tipoPersona: 'USUARIO', bGastar: false });

    if (!oComprobante.ok) {
        return res.json({ status: 1, message: oComprobante.message, data: { bComprobanteInvalido: true } });
    }

    const idUser = oComprobante.datos.idPersona;
    const similitud = oComprobante.datos.similitud;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const hoy = moment().format('YYYY-MM-DD');

    try {

        if (!TIPOS_MARCAJE.includes(tipo)) {
            return res.json({ status: 1, message: "Tipo de marcaje inválido." });
        }

        const [empleado] = await dbConnection.query(
            `SELECT E.idEmpleado, U.name AS nombre
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE E.idUser = :idUser AND ${ SQL_EMPLEADO_VIGENTE }
             LIMIT 1`,
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

        // El comprobante se gasta aquí: el marcaje ya es válido. Si otra
        // petición lo gastó primero (doble clic, reenvío), esta no marca.
        if (!fn_gastarComprobante(oComprobante.datos)) {
            return res.json({
                status: 1,
                message: 'Esta identificación facial ya se usó. Vuelve a escanear tu rostro.',
                data: { bComprobanteInvalido: true }
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

        await fn_logExitoComprobante(oComprobante.datos, `TimeCard: ${ tipo }`);

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
            `SELECT E.idEmpleado, E.idUser, U.name AS nombre
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE E.idEmpleado = :idEmpleado LIMIT 1`,
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

// Qué grupo de operación forma cada tipo de marcaje, y si lo abre
// (inicio) o lo cierra (fin). Vive en el Back porque es la misma
// máquina de estados de _fn_tiposValidos vista del otro lado — quién
// abre con quién no debe poder desincronizarse en dos lugares.
const _TIPO_A_OPERACION = {
    'ENTRADA_JORNADA': { grupo: 'JORNADA', rol: 'inicio' },
    'SALIDA_JORNADA': { grupo: 'JORNADA', rol: 'fin' },
    'SALIDA_COMIDA': { grupo: 'COMIDA', rol: 'inicio' },
    'ENTRADA_COMIDA': { grupo: 'COMIDA', rol: 'fin' },
    'SALIDA_PERMISO': { grupo: 'PERMISO', rol: 'inicio' },
    'ENTRADA_PERMISO': { grupo: 'PERMISO', rol: 'fin' }
};

// Empareja los marcajes VIGENTES (no anulados) de un día en
// operaciones (Jornada laboral / Comida / Permiso especial), cada una
// con inicio, fin y duración — para que el detalle de la semana
// (analisis/012) no obligue a leer una lista de eventos sueltos. Un
// día puede tener más de una comida o permiso: se emparejan en orden
// cronológico (cola por grupo). Una operación sin su pareja se
// devuelve igual, con el extremo faltante en null — es la señal de
// por qué el día quedó incompleto.
const _fn_construirOperacionesDia = (marcajesDelDia) => {

    const pendientesPorGrupo = { JORNADA: [], COMIDA: [], PERMISO: [] };
    const operaciones = [];

    for (const m of marcajesDelDia) {

        const info = _TIPO_A_OPERACION[m.tipo];
        if (!info) continue;

        if (info.rol === 'inicio') {
            pendientesPorGrupo[info.grupo].push({
                grupo: info.grupo, inicio: m.fechaHora, idMarcajeInicio: m.id, fin: null, idMarcajeFin: null
            });
        } else {
            const pendiente = pendientesPorGrupo[info.grupo].shift();
            if (pendiente) {
                pendiente.fin = m.fechaHora;
                pendiente.idMarcajeFin = m.id;
                operaciones.push(pendiente);
            } else {
                // Un "fin" sin "inicio" previo no debería pasar por la
                // máquina de estados normal, pero una captura manual
                // podría producirlo — se muestra igual, con el inicio vacío.
                operaciones.push({ grupo: info.grupo, inicio: null, idMarcajeInicio: null, fin: m.fechaHora, idMarcajeFin: m.id });
            }
        }
    }

    // Lo que quedó sin cerrar también se muestra — es la causa de la
    // jornada incompleta.
    for (const grupo of Object.keys(pendientesPorGrupo)) {
        operaciones.push(...pendientesPorGrupo[grupo]);
    }

    return operaciones
        .map(op => ({
            ...op,
            duracionMinutos: (op.inicio && op.fin) ? moment(op.fin).diff(moment(op.inicio), 'minutes') : null
        }))
        .sort((a, b) => moment(a.inicio || a.fin).diff(moment(b.inicio || b.fin)));
};

const getAsistenciaList = async(req, res = response) => {

    const {
        idEmpleado
        , startDate
        , endDate
    } = req.body;

    try {

        const [empleado] = await dbConnection.query(
            `SELECT E.idEmpleado, U.name AS nombre
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE E.idEmpleado = :idEmpleado LIMIT 1`,
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

        const marcajesPorDia = {};
        for (const m of marcajes) {
            if (m.bAnulado) continue; // los anulados no forman operaciones, la corrección los reemplaza
            const fechaStr = moment(m.fecha).format('YYYY-MM-DD');
            if (!marcajesPorDia[fechaStr]) marcajesPorDia[fechaStr] = [];
            marcajesPorDia[fechaStr].push(m);
        }

        for (const dia of resumen.dias) {
            dia.operaciones = _fn_construirOperacionesDia(marcajesPorDia[dia.fecha] || []);
        }

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

// Reporte semanal (analisis/012): el Back solo recibe un rango de
// fechas ya calculado por el Front — no sabe de "semanas", eso vive
// del lado del calendario sábado-viernes del Front, igual que
// getAsistenciaList tampoco sabe de periodos de nómina.
const getAsistenciaSemanal = async(req, res = response) => {

    const {
        startDate
        , endDate
        , idEmpleado = null
    } = req.body;

    try {

        const resultado = await fn_getResumenSemanal(
            startDate.substring(0, 10),
            endDate.substring(0, 10),
            idEmpleado || null
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: resultado
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

// Valida la semana que se va a guardar (analisis/021): cada día de 1
// (lunes) a 7 (domingo) una sola vez, horas HH:MM y salida posterior a la
// entrada. Regresa el mensaje de error o null.
const _fn_validarDiasHorario = (dias) => {

    if (!Array.isArray(dias)) {
        return 'Los días del horario no son válidos.';
    }

    const reHora = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
    const aVistos = new Set();

    for (const dia of dias) {

        const nDia = Number(dia && dia.diaSemana);

        if (!Number.isInteger(nDia) || nDia < 1 || nDia > 7 || aVistos.has(nDia)) {
            return 'Los días del horario no son válidos.';
        }
        aVistos.add(nDia);

        const sEntrada = String(dia.horaEntrada || '');
        const sSalida = String(dia.horaSalida || '');

        if (!reHora.test(sEntrada) || !reHora.test(sSalida)) {
            return 'Las horas del horario deben tener el formato HH:MM.';
        }

        // Comparación como texto: HH:MM(:SS) con ceros a la izquierda ordena bien.
        if (sSalida.substring(0, 5) <= sEntrada.substring(0, 5)) {
            return 'En cada día, la hora de salida debe ser posterior a la de entrada.';
        }
    }

    return null;

};

const guardarHorarioSucursal = async(req, res = response) => {

    const {
        idSucursal
        , dias = [] // [{ diaSemana, horaEntrada, horaSalida }] -- solo los dias que SI trabajan

        , idUserLogON
    } = req.body;

    // analisis/021: el catálogo de sucursales también guarda por aquí.
    // Antes no se validaba nada: días fuera de 1..7, repetidos, o salida
    // antes de la entrada rompían el cálculo de horas esperadas.
    const sErrorHorario = _fn_validarDiasHorario(dias);
    if (sErrorHorario) {
        return res.json({ status: 1, message: sErrorHorario });
    }

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
    , getAsistenciaSemanal
    , getHorarioSucursal
    , guardarHorarioSucursal
    , getHorarioEmpleado
    , guardarHorarioEmpleado

    // Helpers reutilizados por nominaController.js (analisis/011 T10)
    , fn_getResumenPeriodo
    , fn_getResumenPendiente
}
