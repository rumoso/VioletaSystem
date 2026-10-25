// Exige una sesión iniciada (analisis/020).
//
// Lee el token de sesión del header `x-token` (el que entrega el login),
// verifica su firma y que el usuario exista y siga activo, y deja su id
// en `req.idUserSesion`. Quien necesite saber "quién hizo esto" lo toma
// de ahí, no de lo que mande el navegador en el body.
//
// Existe `validar-jwt.js`, pero importa `../models/user`, que no existe
// en este proyecto: no se puede cargar sin tronar, y por eso ninguna ruta
// lo usaba. Este middleware no depende de modelos de Sequelize.

const jwt = require('jsonwebtoken');

const { dbConnection } = require('../database/config');

const validarSesion = async (req, res, next) => {

    let sToken = req.header('x-token') || '';

    // El Front guarda el token con JSON.stringify: puede llegar entre comillas.
    sToken = String(sToken).replace(/^"+|"+$/g, '');

    if (!sToken) {
        return res.status(401).json({ status: 1, message: 'Tu sesión no es válida. Vuelve a iniciar sesión.', data: null });
    }

    let uid;

    try {
        const datos = jwt.verify(sToken, process.env.SECRETPRIVATEKEY);
        uid = datos && datos.uid;
    } catch (error) {
        return res.status(401).json({ status: 1, message: 'Tu sesión venció. Vuelve a iniciar sesión.', data: null });
    }

    // Un comprobante facial también está firmado con la misma llave, pero
    // no trae `uid`: aquí no pasa como sesión.
    if (!uid) {
        return res.status(401).json({ status: 1, message: 'Tu sesión no es válida. Vuelve a iniciar sesión.', data: null });
    }

    try {

        const [oUser] = await dbConnection.query(
            `SELECT idUser, active FROM users WHERE idUser = :uid LIMIT 1`,
            { replacements: { uid }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!oUser || !Number(oUser.active)) {
            return res.status(401).json({ status: 1, message: 'Tu sesión no es válida. Vuelve a iniciar sesión.', data: null });
        }

        req.idUserSesion = Number(oUser.idUser);
        next();

    } catch (error) {
        return res.status(500).json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }

};

module.exports = {
    validarSesion
};
