const fs = require('fs');
const fp = 'c:/GitHub/1.- VioletaSystem/Back/controllers/productsController.js';
let c = fs.readFileSync(fp, 'utf8');

// ---- 1. getProductsListWithPage ----
const old1 = "        var OSQL = await dbConnection.query(`call getProductsListWithPage(\r\n        ${idUser}\r\n        ,${idSucursal}\r\n        ,'${ createDateStart.substring(0, 10) }'\r\n        ,'${ createDateEnd.substring(0, 10) }'\r\n        ,'${ barCode }'\r\n        ,'${ name }'\r\n        ,${ idFamily }\r\n        ,${ idGroup }\r\n        ,${ idQuality }\r\n        ,${ idOrigin }\r\n\r\n        ,'${ search }'\r\n        ,${ start }\r\n        ,${ limiter }\r\n        )`)";
const new1 = "        var OSQL = await dbConnection.query(\r\n            `call getProductsListWithPage(\r\n            :idUser, :idSucursal,\r\n            :createDateStart, :createDateEnd,\r\n            :barCode, :name,\r\n            :idFamily, :idGroup, :idQuality, :idOrigin,\r\n            :search, :start, :limiter\r\n            )`,\r\n            { replacements: { idUser, idSucursal, createDateStart: createDateStart.substring(0,10), createDateEnd: createDateEnd.substring(0,10), barCode, name, idFamily, idGroup, idQuality, idOrigin, search, start, limiter }, type: dbConnection.QueryTypes.RAW }\r\n        )";
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('getProductsListWithPage: OK'); }
else console.log('getProductsListWithPage: NOT FOUND');

// ---- 2. getInventaryListWithPage ----
const old2 = "        var OSQL = await dbConnection.query(`call getInventaryListWithPage(\r\n            ${idUser}\r\n            ,${idSucursal}\r\n            ,'${ barCode }'\r\n            ,'${ name }'\r\n            ,${ idFamily }\r\n            ,${ idGroup }\r\n            ,${ idQuality }\r\n            ,${ idOrigin }\r\n            ,${ iConInventario }\r\n\r\n            ,'${ search }'\r\n            ,${ start }\r\n            ,${ limiter }\r\n            )`)";
const new2 = "        var OSQL = await dbConnection.query(\r\n            `call getInventaryListWithPage(\r\n            :idUser, :idSucursal,\r\n            :barCode, :name,\r\n            :idFamily, :idGroup, :idQuality, :idOrigin, :iConInventario,\r\n            :search, :start, :limiter\r\n            )`,\r\n            { replacements: { idUser, idSucursal, barCode, name, idFamily, idGroup, idQuality, idOrigin, iConInventario, search, start, limiter }, type: dbConnection.QueryTypes.RAW }\r\n        )";
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('getInventaryListWithPage: OK'); }
else console.log('getInventaryListWithPage: NOT FOUND');

// ---- 3. getInventaryBySucursal ----
const old3 = "        var OSQL = await dbConnection.query(`call getInventaryBySucursal(\r\n            ${idUser}\r\n            ,${idSucursal}\r\n            ,'${ barCode }'\r\n            ,'${ name }'\r\n            ,${ idFamily }\r\n            ,${ idGroup }\r\n            ,${ idQuality }\r\n            ,${ idOrigin }\r\n            ,${ iConInventario }\r\n\r\n            )`)";
const new3 = "        var OSQL = await dbConnection.query(\r\n            `call getInventaryBySucursal(\r\n            :idUser, :idSucursal,\r\n            :barCode, :name,\r\n            :idFamily, :idGroup, :idQuality, :idOrigin, :iConInventario\r\n            )`,\r\n            { replacements: { idUser, idSucursal, barCode, name, idFamily, idGroup, idQuality, idOrigin, iConInventario }, type: dbConnection.QueryTypes.RAW }\r\n        )";
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('getInventaryBySucursal: OK'); }
else console.log('getInventaryBySucursal: NOT FOUND');

// ---- 4. verifyPhysicalInventoryDetail ----
const old4 = "        var OSQL = await dbConnection.query(`call verifyPhysicalInventoryDetail(\r\n        '${ idPhysicalInventory }'\r\n        , '${ barCode }'\r\n        , '${ cantidad }'\r\n\r\n        , ${ idUserLogON }\r\n        )`)";
const new4 = "        var OSQL = await dbConnection.query(\r\n            `call verifyPhysicalInventoryDetail(:idPhysicalInventory, :barCode, :cantidad, :idUserLogON)`,\r\n            { replacements: { idPhysicalInventory, barCode, cantidad, idUserLogON }, type: dbConnection.QueryTypes.RAW }\r\n        )";
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('verifyPhysicalInventoryDetail: OK'); }
else console.log('verifyPhysicalInventoryDetail: NOT FOUND');

fs.writeFileSync(fp, c, 'utf8');
console.log('Done.');
