// Permisos revisados en el SERVIDOR (analisis/039 y 040).
//
// El menú y los botones del Front solo deciden qué se ve; los endpoints
// que escriben o muestran datos sensibles lo vuelven a revisar aquí.
// Mismo criterio que `_fn_tieneAccion` de sucursalesController: por puesto
// ('R', vía rolesconfig) o directo al usuario ('U'), con las banderas
// `active` vigentes.

const { dbConnection } = require('../database/config');

const fn_tieneAccion = async (idUser, actionName) => {

    const filas = await dbConnection.query(
        `SELECT 1 AS ok
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON AC.idAction = A.idAction AND AC.relationType = 'R' AND AC.active = 1
         INNER JOIN rolesconfig AS RC ON RC.idRol = AC.idRelation
         WHERE A.name = :actionName AND A.active = 1 AND RC.idUser = :idUser
         UNION
         SELECT 1 AS ok
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON AC.idAction = A.idAction AND AC.relationType = 'U' AND AC.active = 1
         WHERE A.name = :actionName AND A.active = 1 AND AC.idRelation = :idUser
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas.length > 0;

};

// ¿El usuario tiene el menú (por su `linkList`)? Por puesto o directo.
const fn_tieneMenu = async (idUser, linkList) => {

    const filas = await dbConnection.query(
        `SELECT 1 AS ok
         FROM menus AS M
         INNER JOIN menupermisos AS MP ON MP.idMenu = M.idMenu AND MP.typeRelation = 'R' AND MP.active = 1
         INNER JOIN rolesconfig AS RC ON RC.idRol = MP.idRelation
         WHERE M.linkList = :linkList AND M.active = 1 AND RC.idUser = :idUser
         UNION
         SELECT 1 AS ok
         FROM menus AS M
         INNER JOIN menupermisos AS MP ON MP.idMenu = M.idMenu AND MP.typeRelation = 'U' AND MP.active = 1
         WHERE M.linkList = :linkList AND M.active = 1 AND MP.idRelation = :idUser
         LIMIT 1`,
        { replacements: { idUser, linkList }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas.length > 0;

};

module.exports = {
    fn_tieneAccion,
    fn_tieneMenu
};
