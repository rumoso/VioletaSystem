-- ============================================================
-- ACCIONES DE PERMISO DEL MODULO TALLER (seccion 'Taller')
-- Generado desde la BD local el 2026-08-07. Idempotente: no
-- duplica acciones existentes. Requiere que la seccion 'Taller'
-- exista en actionsection (si no, crearla primero):
-- ============================================================

INSERT INTO actionsection (createDate, sectionName, iLugar, active)
SELECT NOW(), 'Taller', 1.00, 1
WHERE NOT EXISTS ( SELECT 1 FROM actionsection WHERE sectionName = 'Taller' );

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_CreateOrder', 'Aplicar estatus de Crear Orden', 'Con este permiso puedes cambiar el Taller de Cotización a una órden', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_CreateOrder' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AssignOrder', 'Asignar Orden de Taller', 'Permite cambiar el estatus de la orden a Asignado (status 3)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AssignOrder' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_FinalizeOrder', 'Finalizar Orden de Taller', 'Permite cambiar el estatus de la orden a Finalizado/Mostrador (status 4)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_FinalizeOrder' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeliverOrder', 'Entregar Orden de Taller', 'Permite cambiar el estatus de la orden a Entregado (status 5)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeliverOrder' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_FirmaAsignado', 'Firmar - Asignado', 'Permite aprobar o rechazar la firma cuando la orden está en status Asignado', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_FirmaAsignado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_FirmaFinalizado', 'Firmar - Finalizado', 'Permite aprobar o rechazar la firma cuando la orden está en status Finalizado', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_FirmaFinalizado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_FirmaEntregado', 'Firmar - Entregado', 'Permite aprobar o rechazar la firma cuando la orden está en status Entregado', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_FirmaEntregado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_ViewFirmaHistorial', 'Ver Historial de Firmas', 'Permite consultar el historial completo de firmas de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_ViewFirmaHistorial' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AddRefaccion', 'Agregar / Editar Refacción', 'Permite agregar y editar refacciones en una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AddRefaccion' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteRefaccion', 'Eliminar Refacción', 'Permite eliminar refacciones de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteRefaccion' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AddServicioExterno', 'Agregar / Editar Servicio Externo', 'Permite agregar y editar servicios externos en una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AddServicioExterno' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteServicioExterno', 'Eliminar Servicio Externo', 'Permite eliminar servicios externos de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteServicioExterno' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_ManageServiciosExternos', 'Administrar Catálogo de SE', 'Permite abrir y modificar el catálogo de servicios externos', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_ManageServiciosExternos' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AddMetalAgranel', 'Agregar / Editar Metal a Granel', 'Permite agregar y editar metal a granel en una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AddMetalAgranel' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteMetalAgranel', 'Eliminar Metal a Granel', 'Permite eliminar metal a granel de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteMetalAgranel' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AddMetalCliente', 'Agregar / Editar Activo del Cliente', 'Permite agregar y editar activos (metales) del cliente en una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AddMetalCliente' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteMetalCliente', 'Eliminar Activo del Cliente', 'Permite eliminar activos del cliente de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteMetalCliente' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_ViewMetalClienteImages', 'Ver / Subir Imágenes del Activo', 'Permite ver y cargar imágenes vinculadas al activo del cliente', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_ViewMetalClienteImages' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_AddManoObra', 'Agregar / Editar Mano de Obra', 'Permite agregar y editar registros de mano de obra en una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_AddManoObra' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteManoObra', 'Eliminar Mano de Obra', 'Permite eliminar registros de mano de obra de una orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteManoObra' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_EditManoObraPrecio', 'Editar Precio General de Mano de Obra', 'Permite modificar el precio general de mano de obra del encabezado del taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_EditManoObraPrecio' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_ViewHeaderImages', 'Ver / Cargar Imágenes del Encabezado', 'Permite ver y cargar imágenes asociadas al encabezado de la orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_ViewHeaderImages' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_MakePayment', 'Realizar Pago de Taller', 'Permite acceder al módulo de pagos desde la orden de taller', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_MakePayment' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_CreateEditHeader', 'Crear Editar Encabezado de Taller', 'Permite Crear folio de Taller y modifcar el encabezado', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_CreateEditHeader' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_EditAfterEntregado', 'Editar Taller despues de entregado', 'Permite modificar el taler despues de entregado', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_EditAfterEntregado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_verCostos', 'Ver Costos del Taller', 'Permite ver los costos internos (costo de compra) en la orden de taller', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_verCostos' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DevolutionClient', 'Devolución', 'Permite generar una devolución de taller', 1, 1
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DevolutionClient' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT NOW(), S.idActionSection, 'tall_DeleteVacio', 'Eliminar taller sin datos', 'Permite eliminar definitivamente un taller que solo tiene encabezado (sin fotos, firmas, secciones, metal, abonos ni comisiones)', 1, 0
FROM actionsection AS S
WHERE S.sectionName = 'Taller'
AND NOT EXISTS ( SELECT 1 FROM actions WHERE name = 'tall_DeleteVacio' )
LIMIT 1;
