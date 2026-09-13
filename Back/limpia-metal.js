// Limpia el inventario de metal: hoy solo hay renglones de prueba (2
// entradas desde EXTERNO del 2026-08-25 y el saldo que produjeron).
// Antes de borrar deja un respaldo con INSERTs para poder devolverlo.
//
// Uso:  node limpia-metal.js <ruta-del-respaldo.sql>
require('dotenv').config();
const fs = require('fs');
const { dbConnection } = require('./database/config');
dbConnection.options.logging = false;
const q = (s, r) => dbConnection.query(s, { replacements: r || {}, type: dbConnection.QueryTypes.SELECT });

const RESPALDO = process.argv[2];

if (!RESPALDO) {
    console.log('Falta la ruta del respaldo: node limpia-metal.js <archivo.sql>');
    process.exit(1);
}

const val = (v) => v === null || v === undefined ? 'NULL'
    : ( typeof v === 'number' ? String(v)
    : ( v instanceof Date ? `'${ v.toISOString().slice(0, 19).replace('T', ' ') }'`
    : `'${ String(v).replace(/'/g, "''") }'` ));

(async () => {

    const inv = await q('SELECT * FROM metal_inventario');
    const trk = await q('SELECT * FROM metal_inventario_track');

    // ── Guarda de seguridad ──
    // Solo se limpia si NO hay nada operativo. Un movimiento ligado a un
    // folio de taller, o cualquier movimiento que no sea una ENTRADA
    // manual, significa que ya se está trabajando de verdad: eso no se
    // borra sin decisión explícita.
    const [d1] = await q("SELECT COUNT(*) n FROM metal_inventario_track WHERE idTaller IS NOT NULL");
    const [d2] = await q("SELECT COUNT(*) n FROM metal_inventario_track WHERE tipoMovimiento <> 'ENTRADA'");

    if (Number(d1.n) > 0 || Number(d2.n) > 0) {
        console.log(`ABORTA: hay ${ d1.n } movimiento(s) ligados a folios de taller y ${ d2.n } asignacion(es)/entrega(s).`);
        console.log('Esto ya no es data de prueba — no se toca.');
        process.exit(1);
    }

    // ── Respaldo ──
    const lineas = [
        '-- Respaldo del inventario de metal antes de limpiarlo.',
        `-- ${ trk.length } movimiento(s) de kardex + ${ inv.length } saldo(s).`,
        ''
    ];
    for (const r of trk) {
        lineas.push(`INSERT INTO metal_inventario_track (${ Object.keys(r).join(', ') }) VALUES (${ Object.values(r).map(val).join(', ') });`);
    }
    for (const r of inv) {
        lineas.push(`INSERT INTO metal_inventario (${ Object.keys(r).join(', ') }) VALUES (${ Object.values(r).map(val).join(', ') });`);
    }
    fs.writeFileSync(RESPALDO, lineas.join('\n') + '\n', 'utf8');
    console.log('>> respaldo escrito:', RESPALDO, `(${ trk.length } movimientos + ${ inv.length } saldo(s))`);

    // ── Limpieza ──
    const t = await dbConnection.transaction();
    try {
        await dbConnection.query('DELETE FROM metal_inventario_track', { type: dbConnection.QueryTypes.DELETE, transaction: t });
        await dbConnection.query('DELETE FROM metal_inventario',       { type: dbConnection.QueryTypes.DELETE, transaction: t });
        await t.commit();
    } catch (e) {
        await t.rollback();
        throw e;
    }

    const [a] = await q('SELECT COUNT(*) n FROM metal_inventario');
    const [b] = await q('SELECT COUNT(*) n FROM metal_inventario_track');
    console.log('>> metal_inventario:', a.n, 'renglones | metal_inventario_track:', b.n, 'movimientos');

    // Los triggers de integridad no se tocan al limpiar datos, pero se
    // confirma: sin ellos la sucursal podría volver a recibir joyas.
    const trg = await q("SELECT TRIGGER_NAME t FROM INFORMATION_SCHEMA.TRIGGERS WHERE EVENT_OBJECT_TABLE = 'metal_inventario' AND TRIGGER_SCHEMA = DATABASE()");
    console.log('>> triggers de integridad intactos:', trg.map(x => x.t).join(', ') || '(NINGUNO — revisar)');

    process.exit(0);

})().catch(e => { console.log('ERR:', e.message); process.exit(1); });
