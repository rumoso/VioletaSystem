// Una rápida (tipo 7) y una garantía (8) vacías se deben poder eliminar,
// y una con datos se debe poder cancelar. Antes respondían "El taller no
// existe" porque solo se reconocía el tipo 5.

require('dotenv').config();

const { dbConnection } = require('./database/config');
const sales = require('./controllers/salesController');

const q = (s, r) => dbConnection.query(s, { replacements: r || {}, type: dbConnection.QueryTypes.SELECT, logging: false });
const x = (s, r) => dbConnection.query(s, { replacements: r || {}, logging: false });
const llamar = (fn, body) => new Promise((res) => fn({ body }, { json: (o) => res(o) }));

let ok = 0, fail = 0;
const check = (nombre, cond, detalle) => {
    if (cond) { ok++; } else { fail++; console.log(`  FALLA ${ nombre }: ${ detalle }`); }
};

(async () => {

    const limpieza = [];

    try {

        const [oUser] = await q(
            `SELECT RC.idUser FROM actions A
             INNER JOIN actionsconf AC ON A.idAction = AC.idAction AND AC.active = 1 AND AC.relationType = 'R'
             INNER JOIN rolesconfig RC ON RC.idRol = AC.idRelation
             WHERE A.name = 'tall_DeleteVacio' AND A.active = 1 LIMIT 1`);
        const idUserLogON = (oUser && oUser.idUser) || 1;
        const [oCliente] = await q(`SELECT idCustomer FROM customers WHERE active = 1 LIMIT 1`);
        const [oSucursal] = await q(`SELECT idSucursal FROM sucursales WHERE active = 1 LIMIT 1`);

        const fn_folio = async (idSaleType, sufijo) => {
            const idSale = `TESTBORR${ sufijo }-` + Date.now();
            await x(`INSERT INTO sales (idSale, createDate, idSucursal, idSeller_idUser, idCustomer, idSaleType, active)
                     VALUES (:idSale, NOW(), :idSucursal, :idUser, :idCustomer, :idSaleType, 1)`,
                { idSale, idSucursal: oSucursal.idSucursal, idUser: idUserLogON, idCustomer: oCliente.idCustomer, idSaleType });
            await x(`INSERT INTO taller (idSale, createDate, descripcion, fechaIngreso, idCustomer, idSucursal, idSeller_idUser, active, idTallerStatus, precioTotal, bRapida)
                     VALUES (:idSale, NOW(), 'PRUEBA BORRADO', CURDATE(), :idCustomer, :idSucursal, :idUser, 1, 1, 0, :bRapida)`,
                { idSale, idCustomer: oCliente.idCustomer, idSucursal: oSucursal.idSucursal, idUser: idUserLogON, bRapida: idSaleType === 7 ? 1 : 0 });
            limpieza.push(() => x(`DELETE FROM taller WHERE idSale = :idSale`, { idSale }));
            limpieza.push(() => x(`DELETE FROM sales WHERE idSale = :idSale`, { idSale }));
            return idSale;
        };

        for (const [tipo, nombre, sufijo] of [[7, 'rápida', 'R'], [8, 'garantía', 'G'], [5, 'taller', 'T']]) {

            const idSale = await fn_folio(tipo, sufijo);

            const oDatos = await llamar(sales.getTallerDatosCancelacion, { idSale });
            check(`${ nombre }: el servidor la reconoce`, oDatos.status === 0 && oDatos.data.bEsTaller === true, JSON.stringify(oDatos).substring(0, 120));
            check(`${ nombre }: vacía, sin datos capturados`, oDatos.status === 0 && oDatos.data.bTieneDatos === false, JSON.stringify(oDatos.data && oDatos.data.aDatos));

            const oDel = await llamar(sales.deleteTallerVacio, { idSale, idUserLogON });
            check(`${ nombre }: se elimina`, oDel.status === 0, oDel.message);

            const [oResto] = await q(
                `SELECT ( SELECT COUNT(*) FROM taller WHERE idSale = :idSale ) folio
                      , ( SELECT COUNT(*) FROM sales WHERE idSale = :idSale ) venta`, { idSale });
            check(`${ nombre }: no queda el folio`, Number(oResto.folio) === 0, `quedaron ${ oResto.folio }`);
            check(`${ nombre }: no queda la venta huérfana`, Number(oResto.venta) === 0, `quedaron ${ oResto.venta }`);

        }

    } catch (error) {
        fail++;
        console.log('ERROR:', error.message);
    } finally {
        for (const fn of limpieza.reverse()) {
            try { await fn(); } catch (e) { }
        }
        const [oR] = await q(`SELECT ( SELECT COUNT(*) FROM sales WHERE idSale LIKE 'TESTBORR%' ) ventas
                                   , ( SELECT COUNT(*) FROM taller WHERE idSale LIKE 'TESTBORR%' ) folios`);
        console.log('residuo:', JSON.stringify(oR));
        console.log(`\nRESULTADO: ${ ok } comprobaciones bien, ${ fail } fallas`);
        process.exit(fail > 0 ? 1 : 0);
    }

})();
