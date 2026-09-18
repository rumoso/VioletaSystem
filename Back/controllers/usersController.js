const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { TIPO_ROL } = require('../helpers/constantes');
const { fn_reglasIncumplidas } = require('../helpers/pwdSegura');
const { fn_recalcularUtilidadTalleresAbiertosByTecnico } = require('../helpers/tallerUtilidad');

const _fn_respuestaPwdInsegura = (pwd) => {
    const faltan = fn_reglasIncumplidas(pwd);
    return faltan.length > 0
        ? { status: 1, message: `La contraseña no es segura: ${ faltan.join(', ').toLowerCase() }.` }
        : null;
};

// % de comisión / destajo: 0-100 redondeado a 2 decimales.
const _fn_porcentaje = (v) => {
    const n = Math.round( ( Number(v) || 0 ) * 100 ) / 100;
    return Math.min( Math.max( n, 0 ), 100 );
};

const getUsersListWithPage = async(req, res = response) => {

    const idUserLogON = req.header('idUserLogON')

    const {
        search = '', limiter = 10, start = 0, filterFaceID = ''
        , idRol = 0, idTipoRol = 0, filterAcceso = '', filterActive = ''
    } = req.body;

    // Listas blancas: el SP solo entiende estos valores.
    const sFilterFaceID = ['CON', 'SIN'].includes(filterFaceID) ? filterFaceID : '';
    const sFilterAcceso = ['CON', 'SIN'].includes(filterAcceso) ? filterAcceso : '';
    const sFilterActive = ['ACTIVOS', 'INACTIVOS'].includes(filterActive) ? filterActive : '';

    try{

        var OSQL = await dbConnection.query(
            `call getUsersListWithPage(:search, :start, :limiter, :filterFaceID, :idRol, :idTipoRol, :filterAcceso, :filterActive)`,
            {
                replacements: {
                    search, start: Number(start) || 0, limiter: Number(limiter) || 10, filterFaceID: sFilterFaceID
                    , idRol: Number(idRol) || 0, idTipoRol: Number(idTipoRol) || 0
                    , filterAcceso: sFilterAcceso, filterActive: sFilterActive
                },
                type: dbConnection.QueryTypes.RAW
            }
        )

        if(OSQL.length == 0){

            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
                count: 0,
                rows: null
                }
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );
            
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            });
            
        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getUserByID = async(req, res = response) => {

    const {
        idUser
    } = req.body;

    //console.log(req.body)

    try{
        
        var OSQL = await dbConnection.query(`call getUserByID(:idUser)`, { replacements: { idUser }, type: dbConnection.QueryTypes.RAW })

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró el usuario.",
                data: null
            });

        }
        else{

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: OSQL[0]
            });

        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertUser = async(req, res) => {
    
    const {
        nombre = '',
        apellidoPaterno = '',
        apellidoMaterno = '',
        userName,
        pwd = '',
        authorizationCode = '',
        comision = 0,
        destajo = 0,
        active,
        bAcceso = 1,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    try{

        if (pwd) {
            const oInsegura = _fn_respuestaPwdInsegura(pwd);
            if (oInsegura) {
                return res.json(oInsegura);
            }
        }

        // Sin acceso al sistema no hay contraseña: no se guarda el hash de
        // una cadena vacía.
        const pwdEncrypt = pwd ? bcryptjs.hashSync( pwd, bcryptjs.genSaltSync() ) : '';

        // El SP le asigna el puesto de sistema "Empleado" (idRol 7) y arma
        // users.name con los apellidos primero.
        var OSQL = await dbConnection.query(
            `call insertUser(:nombre, :apellidoPaterno, :apellidoMaterno, :userName, :pwd, :authorizationCode, :comision, :destajo, :active, :bAcceso, :idUserLogON)`,
            {
                replacements: {
                    nombre, apellidoPaterno, apellidoMaterno, userName: userName || '',pwd: pwdEncrypt, authorizationCode
                    , comision: _fn_porcentaje(comision), destajo: _fn_porcentaje(destajo)
                    , active: active ? 1 : 0, bAcceso: bAcceso ? 1 : 0, idUserLogON
                },
                type: dbConnection.QueryTypes.RAW
            }
        )

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message,
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const updateUser = async(req, res) => {
   
    const {
        idUser,
        nombre = '',
        apellidoPaterno = '',
        apellidoMaterno = '',
        userName,
        pwd = '',
        authorizationCode = '',
        comision = 0,
        destajo = 0,
        active,
        bAcceso = 1
    } = req.body;

    try{

        if (pwd) {
            const oInsegura = _fn_respuestaPwdInsegura(pwd);
            if (oInsegura) {
                return res.json(oInsegura);
            }
        }

        // pwd opcional: solo viaja cuando se le da acceso a alguien que no
        // tenía contraseña; '' = el SP conserva la actual.
        const pwdEncrypt = pwd ? bcryptjs.hashSync( pwd, bcryptjs.genSaltSync() ) : '';

        var OSQL = await dbConnection.query(
            `call updateUser(:idUser, :nombre, :apellidoPaterno, :apellidoMaterno, :userName, :authorizationCode, :comision, :destajo, :active, :bAcceso, :pwd)`,
            {
                replacements: {
                    idUser, nombre, apellidoPaterno, apellidoMaterno, userName: userName || '',authorizationCode
                    , comision: _fn_porcentaje(comision), destajo: _fn_porcentaje(destajo)
                    , active: active ? 1 : 0, bAcceso: bAcceso ? 1 : 0, pwd: pwdEncrypt
                },
                type: dbConnection.QueryTypes.RAW
            }
        )

        // Cambiarle el % de destajo mueve la utilidad de sus folios
        // abiertos (analisis/023): los que ya le pagaron destajo traen el
        // % congelado y no se tocan. No debe tumbar el guardado.
        if (OSQL[0].out_id > 0) {
            try {
                await fn_recalcularUtilidadTalleresAbiertosByTecnico( idUser );
            } catch (utilidadError) {
                console.log('No se pudo recalcular la utilidad de los talleres del técnico:', utilidadError.message);
            }
        }

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const changePassword = async(req, res) => {

    const {
        idUser,
        pwd = '',
        pwd2 = ''
    } = req.body;

    //console.log(req.body)

    try{

        const oInsegura = _fn_respuestaPwdInsegura(pwd);
        if (oInsegura) {
            return res.json(oInsegura);
        }

        if(pwd == pwd2){

            //encript pwd
            const salt = bcryptjs.genSaltSync();
            const pwdEncrypt = bcryptjs.hashSync( pwd, salt);

            var OSQL = await dbConnection.query(
                `call updatePWD(:idUser, :pwd)`,
                { replacements: { idUser, pwd: pwdEncrypt }, type: dbConnection.QueryTypes.RAW }
            )

            //var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

            res.json({
                status: 0,
                message: "Contraseña actualizada con éxito.",
                insertID: OSQL[0].out_id
            });

        }else{

            res.json({
            status: 1,
            message: "Las contraseñas no coinciden",
            });

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const disabledUser = async(req, res) => {
   
    const {
        idUser
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disabledUser(
        ${ idUser }
        )`)

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

        res.json({
            status:0,
            message:"Usuario deshabilitado con éxito.",
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.json({
        status:2,
        message: "Sucedió un error inesperado",
        data: error.message
        });

    }
}

// ¿El nombre de usuario está libre? Mismo criterio que insertUser /
// updateUser: único solo entre quienes tienen acceso, sin contar a la
// persona que se está editando.
const checkUserNameDisponible = async(req, res = response) => {

    const {
        idUser = 0,
        userName = ''
    } = req.body;

    try {

        const sUserName = String(userName || '').trim();

        if (sUserName.length === 0) {
            return res.json({ status: 0, message: 'Ejecutado correctamente.', data: { bDisponible: false, sMotivo: 'VACIO' } });
        }

        if (/\s/.test(sUserName)) {
            return res.json({ status: 0, message: 'Ejecutado correctamente.', data: { bDisponible: false, sMotivo: 'ESPACIOS' } });
        }

        const rows = await dbConnection.query(
            `SELECT idUser, name FROM users
             WHERE userName = :userName AND bAcceso = 1 AND idUser <> :idUser
             LIMIT 1`,
            { replacements: { userName: sUserName, idUser: Number(idUser) || 0 }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: 'Ejecutado correctamente.',
            data: {
                bDisponible: rows.length === 0,
                sMotivo: rows.length === 0 ? '' : 'OCUPADO'
            }
        });

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }
};

const cbxGetSellersCombo = async(req, res = response) => {

    const {
        idUser,
        search = ''
    } = req.body;

    //console.log(req.body)

    try{

        // Puestos de tipo 1 (VENDEDOR); el SP ya no depende del nombre del rol.
        var OSQL = await dbConnection.query(
            `call cbxGetSellersCombo(:idUser, :search)`,
            { replacements: { idUser: Number(idUser) || 0, search }, type: dbConnection.QueryTypes.RAW }
        )

        if(OSQL.length == 0){

            res.json({
                status: 3,
                message: "No se encontró información.",
                data: null
            });

        }
        else{

            res.json({
                status:  0,
                message:"Ejecutado correctamente.",
                data: OSQL
            });

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

const cbxGetTecnicosCombo = async(req, res = response) => {

    const {
        search = ''
    } = req.body;

    try{

        // Usuarios activos con un puesto activo de tipo 2 (TECNICO). Ya no
        // filtra por el nombre 'Técnico': renombrar el puesto no lo vacía.
        const OSQL = await dbConnection.query(`
            SELECT
                u.idUser as id,
                u.name as nombre,
                u.userName
            FROM users u
            WHERE u.active = 1
            AND EXISTS (
                SELECT 1
                FROM rolesconfig rc
                INNER JOIN roles r ON rc.idRol = r.idRol
                WHERE rc.idUser = u.idUser
                AND r.active = 1
                AND r.idTipoRol = :idTipoRol
            )
            AND (u.name LIKE :search OR u.userName LIKE :search)
            ORDER BY u.name ASC
        `, {
            replacements: { search: `%${search}%`, idTipoRol: TIPO_ROL.TECNICO },
            type: dbConnection.QueryTypes.SELECT
        });

        if(OSQL.length == 0){

            res.json({
                status: 3,
                message: "No se encontró información.",
                data: null
            });

        }
        else{

            res.json({
                status:  0,
                message:"Ejecutado correctamente.",
                data: OSQL
            });

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

const updateAuthorizationCode = async(req, res) => {

    const {
        idUser,
        authorizationCode
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(
            `call updateAuthorizationCode(:idUser, :authorizationCode)`,
            { replacements: { idUser, authorizationCode: String(authorizationCode || '').trim() }, type: dbConnection.QueryTypes.RAW }
        )

        //var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Users', ${ idUser } )`);

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const cbxGetAllUsersCombo = async(req, res = response) => {

    const { search = '', aTiposRol = [] } = req.body;

    // aTiposRol opcional: si viene, solo usuarios con un puesto activo de
    // alguno de esos tipos (p. ej. [1, 2] en la comisión manual).
    const aTipos = ( Array.isArray(aTiposRol) ? aTiposRol : [] ).map(Number).filter((n) => n > 0);

    try {
        const OSQL = await dbConnection.query(`
            SELECT
                u.idUser  AS id,
                u.name    AS nombre,
                u.userName
            FROM users u
            WHERE u.active = 1
              AND (u.name LIKE :search OR u.userName LIKE :search)
              ${ aTipos.length > 0 ? `AND EXISTS (
                    SELECT 1
                    FROM rolesconfig rc
                    INNER JOIN roles r ON rc.idRol = r.idRol
                    WHERE rc.idUser = u.idUser
                    AND r.active = 1
                    AND r.idTipoRol IN (:aTipos)
              )` : '' }
            ORDER BY u.name ASC
            LIMIT 50
        `, {
            replacements: { search: `%${search}%`, aTipos },
            type: dbConnection.QueryTypes.SELECT
        });

        if (OSQL.length === 0) {
            res.json({ status: 3, message: 'No se encontró información.', data: [] });
        } else {
            res.json({ status: 0, message: 'Ejecutado correctamente.', data: OSQL });
        }

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }
};

// Preferencias genéricas por usuario y pantalla (scope) — primer uso:
// vista tabla/cards de los catálogos de personal. Queries directas
// sobre dbConnection (sin SPs).
const getUserPreferences = async(req, res = response) => {

    const {
        idUser
        , scope
    } = req.body;

    try {

        const rows = await dbConnection.query(
            `SELECT prefKey, prefValue FROM user_preferences
             WHERE idUser = :idUser AND scope = :scope`,
            { replacements: { idUser, scope }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: 'Ejecutado correctamente.', data: rows });

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }
};

const insertUpdateUserPreferences = async(req, res = response) => {

    const {
        idUser
        , scope
        , prefKey
        , prefValue
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try {

        await dbConnection.query(
            `INSERT INTO user_preferences (idUser, scope, prefKey, prefValue, updateDate)
             VALUES (:idUser, :scope, :prefKey, :prefValue, :updateDate)
             ON DUPLICATE KEY UPDATE prefValue = :prefValue, updateDate = :updateDate`,
            { replacements: { idUser, scope, prefKey, prefValue, updateDate: oGetDateNow }, type: dbConnection.QueryTypes.INSERT }
        );

        res.json({ status: 0, message: 'Preferencia guardada.' });

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }
};

module.exports = {
    getUsersListWithPage
    , getUserByID
    , insertUser
    , updateUser
    , changePassword
    , disabledUser
    , checkUserNameDisponible
    , cbxGetSellersCombo
    , cbxGetTecnicosCombo
    , updateAuthorizationCode
    , cbxGetAllUsersCombo
    , getUserPreferences
    , insertUpdateUserPreferences
}