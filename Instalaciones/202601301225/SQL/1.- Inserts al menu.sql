

SELECT * FROM menus WHERE idMenuPadre = 1;

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
VALUES (NULL, NOW(), '1', '7', 'Taller', 'Listado de taller', NULL, NULL, 'tallerList', 'assets/img/icons/tallerIco.gif', '80', '1', '1');

INSERTAR UN ROL QUE SE LLAME TÉCNICO PARA LOS TECNICOS DE TALLER

INSERT INTO `db_violetasystem`.`actionsection` (`idActionSection`, `sectionName`, `iLugar`, `active`) VALUES ('9', 'Taller', '1.1', '1');

-- ============================================================
-- TALLER - INSERT de permisos en tabla actions
-- idActionSection = 9 (Taller)
-- OMITIDOS (ya existen): tall_CreateEditHeader, tall_CreateOrder
-- ============================================================

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_CreateEditHeader',       'Crear Editar Encabezado de Taller',    'Permite Crear folio de Taller y modifcar el encabezado',                          1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AssignOrder',            'Asignar Orden de Taller',              'Permite cambiar el estatus de la orden a Asignado (status 3)',                          1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_FinalizeOrder',          'Finalizar Orden de Taller',            'Permite cambiar el estatus de la orden a Finalizado/Mostrador (status 4)',              1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeliverOrder',           'Entregar Orden de Taller',             'Permite cambiar el estatus de la orden a Entregado (status 5)',                        1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_FirmaAsignado',          'Firmar - Asignado',                    'Permite aprobar o rechazar la firma cuando la orden está en status Asignado',          1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_FirmaFinalizado',        'Firmar - Finalizado',                  'Permite aprobar o rechazar la firma cuando la orden está en status Finalizado',        1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_FirmaEntregado',         'Firmar - Entregado',                   'Permite aprobar o rechazar la firma cuando la orden está en status Entregado',         1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_ViewFirmaHistorial',     'Ver Historial de Firmas',              'Permite consultar el historial completo de firmas de una orden de taller',            1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AddRefaccion',           'Agregar / Editar Refacción',           'Permite agregar y editar refacciones en una orden de taller',                         1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeleteRefaccion',        'Eliminar Refacción',                   'Permite eliminar refacciones de una orden de taller',                                  1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AddServicioExterno',     'Agregar / Editar Servicio Externo',    'Permite agregar y editar servicios externos en una orden de taller',                  1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeleteServicioExterno',  'Eliminar Servicio Externo',            'Permite eliminar servicios externos de una orden de taller',                          1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_ManageServiciosExternos','Administrar Catálogo de SE',           'Permite abrir y modificar el catálogo de servicios externos',                         1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AddMetalAgranel',        'Agregar / Editar Metal a Granel',      'Permite agregar y editar metal a granel en una orden de taller',                      1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeleteMetalAgranel',     'Eliminar Metal a Granel',              'Permite eliminar metal a granel de una orden de taller',                              1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AddMetalCliente',        'Agregar / Editar Activo del Cliente',  'Permite agregar y editar activos (metales) del cliente en una orden de taller',       1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeleteMetalCliente',     'Eliminar Activo del Cliente',          'Permite eliminar activos del cliente de una orden de taller',                         1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_ViewMetalClienteImages', 'Ver / Subir Imágenes del Activo',      'Permite ver y cargar imágenes vinculadas al activo del cliente',                      1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_AddManoObra',            'Agregar / Editar Mano de Obra',        'Permite agregar y editar registros de mano de obra en una orden de taller',           1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_DeleteManoObra',         'Eliminar Mano de Obra',                'Permite eliminar registros de mano de obra de una orden de taller',                   1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_EditManoObraPrecio',     'Editar Precio General de Mano de Obra','Permite modificar el precio general de mano de obra del encabezado del taller',       1);

INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_ViewHeaderImages',       'Ver / Cargar Imágenes del Encabezado', 'Permite ver y cargar imágenes asociadas al encabezado de la orden de taller',         1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active) VALUES (9, 'tall_MakePayment',            'Realizar Pago de Taller',              'Permite acceder al módulo de pagos desde la orden de taller',                        1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active, nSpecial) VALUES (9, 'tall_EditAfterEntregado',     'Editar Taller despues de entregado',   'Permite modificar el taler despues de entregado',                        1, 1);
INSERT INTO actions (idActionSection, name, nameHtml, description, active, nSpecial) VALUES (9, 'tall_verCostos',    'Ver Costos del Taller',   						'Permite ver los costos internos (costo de compra) en la orden de taller',                        1, 1);


