-- ══════════════════════════════════════════════════════════════
-- PONER UNA BASE DE PRODUCCION A LA PAR DE DESARROLLO (datos)
--
-- Generado el 2026-10-08 comparando la base local
-- `db_violetasystem` contra la base restaurada del cliente (respaldo del 2026-10-07), ya con la
-- estructura aplicada.
--
-- Trae SOLO datos: catalogos, acciones, menus, permisos y rellenos. La
-- estructura (tablas y columnas) va por Workbench ANTES de esto, y los
-- procedimientos por sus propios scripts (ver docs/instalacion-datos.md).
--
-- Todo es idempotente: si algo ya esta, no se duplica. Se puede correr
-- otra vez sin miedo.
--
-- OJO con los ids: los de ACCIONES no significan lo mismo en las dos
-- bases (en produccion van corridos un lugar), asi que las acciones se
-- insertan por NOMBRE y sus permisos se asignan por NOMBRE. Los menus,
-- los puestos, los tipos de venta y los estatus de taller SI coinciden,
-- y esos si se insertan con su id.
-- ══════════════════════════════════════════════════════════════

-- Workbench abre con "safe updates": no deja correr un UPDATE o un
-- DELETE cuyo WHERE no use una columna llave. Abajo todas las
-- sentencias ya traen su llave, pero el modo seguro se apaga de todas
-- formas porque algunas filtran ademas por columnas sin indice. Al
-- final se vuelve a prender.
SET @safe_updates_previo = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

SET @ahora = NOW();



-- ── 1. Secciones de acciones (2) ──

INSERT INTO `actionsection` (`idActionSection`, `sectionName`, `iLugar`, `active`)
SELECT 8, 'General', '6.00', 1
WHERE NOT EXISTS ( SELECT 1 FROM `actionsection` WHERE `idActionSection` = 8 );

INSERT INTO `actionsection` (`idActionSection`, `sectionName`, `iLugar`, `active`)
SELECT 10, 'Personal', '10.00', 1
WHERE NOT EXISTS ( SELECT 1 FROM `actionsection` WHERE `idActionSection` = 10 );


-- ── 2. Acciones (26) ──

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'Roles_Crear', 'Crear roles', 'Con este permiso es para crear Roles', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Roles'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'Roles_Crear' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'inv_Delete', 'inv_Delete', 'Eliminar inventario físico', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Inventario'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'inv_Delete' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_MetalInvTransferir', 'Transferir inventario de metal', 'Permite registrar entradas, traspasos y ajustes manuales del inventario de metal (sucursal/técnico)', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_MetalInvTransferir' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_MetalInvVer', 'Ver inventario de metal', 'Permite consultar los saldos y el kardex del inventario de metal', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_MetalInvVer' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'gral_FacialAutorizarManual', 'Autorizar manualmente verificacion facial', 'Permite continuar sin coincidencia de rostro o sin cámara disponible, autorizando manualmente', 1, 1
FROM actionsection S
WHERE S.sectionName = 'General'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'gral_FacialAutorizarManual' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'empleados_Eliminar', 'Eliminar empleados definitivamente', 'Permite la eliminación física de un empleado sin ningún historial (permiso restringido)', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'empleados_Eliminar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nominaConceptos_Administrar', 'Administrar conceptos de nómina', 'Permite crear, modificar, inactivar y eliminar conceptos de nómina', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nominaConceptos_Administrar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'comisiones_Capturar', 'Capturar comisiones', 'Permite capturar renglones manuales en la bitácora de comisiones (incluye ajustes en negativo) y generar comisiones de venta del periodo', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'comisiones_Capturar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'comisiones_Cancelar', 'Cancelar comisiones', 'Permite cancelar un renglon pendiente de la bitacora de comisiones, con motivo', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'comisiones_Cancelar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nomina_Generar', 'Generar y editar nómina', 'Permite generar corridas de nómina en borrador y editar sus recibos antes de pagar', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nomina_Generar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nomina_Pagar', 'Pagar nómina', 'Permite pagar una nómina en borrador, volviéndola inmutable', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nomina_Pagar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nomina_Cancelar', 'Cancelar nómina pagada', 'Permite cancelar una nómina ya pagada, con motivo (permiso restringido)', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nomina_Cancelar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nomina_Eliminar', 'Eliminar nómina completa', 'Permite borrar por completo una nómina en borrador (permiso restringido); no aplica a nóminas ya pagadas o canceladas', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nomina_Eliminar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'nomina_EditarConceptos', 'Editar percepciones/deducciones de nómina', 'Autoriza agregar, editar o quitar una percepción o deducción del recibo de un empleado en una nómina en borrador — pide código/rostro cada vez', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'nomina_EditarConceptos' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'ventas_EntregarApartado', 'Entregar apartado', 'Autoriza marcar un apartado como entregado — pide código/rostro cada vez', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Ventas'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'ventas_EntregarApartado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'timecard_CapturarManual', 'Capturar/corregir marcaje manual', 'Autoriza capturar o corregir a mano un marcaje de asistencia — pide código/rostro cada vez', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'timecard_CapturarManual' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'timecard_Consultar', 'Consultar asistencia', 'Permite ver la consulta de asistencia (marcajes y horas por empleado)', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'timecard_Consultar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'timecard_AdministrarHorarios', 'Administrar horarios', 'Permite capturar el horario semanal de una sucursal o de un empleado', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Personal'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'timecard_AdministrarHorarios' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'dashboard_VerPanel', 'Ver panel del director', 'Permite abrir el panel del director y ver la situación del negocio: cartera, inventario, venta y cobranza del día, del mes y operación', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Ventas'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'dashboard_VerPanel' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'dashboard_VerCostos', 'Ver costos y utilidad en el panel', 'Permite ver costo de lo vendido, utilidad y margen dentro del panel del director (permiso restringido) — sin él esos datos no se envían al navegador', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Ventas'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'dashboard_VerCostos' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'sucursales_CrearModificar', 'Crear y modificar sucursales', 'Permite dar de alta, editar, activar y desactivar sucursales desde el catálogo de sucursales', 1, 0
FROM actionsection S
WHERE S.sectionName = 'General'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'sucursales_CrearModificar' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_DeleteVacio', 'Eliminar taller sin datos', 'Permite eliminar definitivamente un taller que solo tiene encabezado (sin fotos, firmas, secciones, metal, abonos ni comisiones)', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_DeleteVacio' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_PasarAEncargado', 'Pasar taller a encargado', 'Permite mandar el folio del técnico a revisión del encargado de taller', 1, 0
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_PasarAEncargado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_AceptarComoEncargado', 'Aceptar taller como encargado', 'Autorización especial para revisar, editar y aceptar un folio en lugar del encargado de la sucursal', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_AceptarComoEncargado' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_DesbloquearTaller', 'Desbloquear taller (regresar estatus)', 'Autorización especial para regresar un folio bloqueado hasta Pedido de taller; reversa metal final y destajo', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_DesbloquearTaller' )
LIMIT 1;

INSERT INTO actions (createDate, idActionSection, name, nameHtml, description, active, nSpecial)
SELECT @ahora, S.idActionSection, 'tall_EditEncabezadoBloqueado', 'Editar cliente/vendedor/fecha de un taller', 'Autorización especial para corregir el cliente, el vendedor o la fecha de ingreso de un folio que ya no es cotización', 1, 1
FROM actionsection S
WHERE S.sectionName = 'Taller'
  AND NOT EXISTS ( SELECT 1 FROM actions A WHERE A.name = 'tall_EditEncabezadoBloqueado' )
LIMIT 1;


-- ── 3. Menus (13) ──

-- El padre se respeta por id; si en produccion el menu padre tiene
-- otro id, revisar `idMenuPadre` antes de correr.

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 35, '2026-08-07 12:08:16', 1, 7, 'Inventario Metal', 'Saldos y kardex del inventario de metal', NULL, NULL, 'inventarioMetal', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 35 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 36, '2026-08-08 00:23:03', 1, 8, 'Bitácora Facial', 'Historial de verificaciones e identificaciones faciales', NULL, NULL, 'facialLog', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 36 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 37, '2026-08-09 13:46:57', 0, 25, 'Personal', 'Catálogos de personal (técnicos, vendedores, empleados)', NULL, NULL, NULL, NULL, NULL, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 37 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 38, '2026-08-09 13:46:57', 37, 1, 'Técnicos', 'Catálogo de técnicos del taller', NULL, NULL, 'tecnicosList', 'assets/img/icons/invFisico.png', 80, 1, 0
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 38 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 39, '2026-08-09 13:46:57', 37, 2, 'Vendedores', 'Catálogo de vendedores', NULL, NULL, 'vendedoresList', 'assets/img/icons/invFisico.png', 80, 1, 0
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 39 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 40, '2026-08-09 13:56:41', 37, 3, 'Empleados', 'Catálogo de empleados con datos laborales', NULL, NULL, 'empleadosList', 'assets/img/icons/invFisico.png', 80, 1, 0
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 40 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 41, '2026-08-09 13:56:41', 37, 4, 'Conceptos de Nómina', 'Catálogo de conceptos de nómina (percepciones y deducciones)', NULL, NULL, 'nominaConceptosList', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 41 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 42, '2026-08-09 19:08:08', 37, 5, 'Comisiones', 'Bitácora de comisiones por empleado (destajo, venta, ajustes manuales)', NULL, NULL, 'comisionesTrackList', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 42 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 43, '2026-08-09 19:22:19', 37, 6, 'Nómina', 'Generación y pago de nómina de empleados', NULL, NULL, 'nominaList', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 43 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 44, '2026-08-17 06:48:29', 37, 15, 'Asistencia', 'Consulta de asistencia y horas trabajadas (TimeCard)', NULL, NULL, 'timecardList', 'assets/img/icons/invFisico.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 44 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 45, '2026-08-22 19:27:11', 0, 0, 'Dirección', 'Información directiva del negocio', NULL, NULL, NULL, NULL, NULL, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 45 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 46, '2026-08-22 19:27:11', 45, 1, 'Panel del director', 'La situación del negocio en una pantalla', NULL, NULL, 'dashboardDirector', 'assets/img/icons/inffinanciera.png', 80, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 46 );

INSERT INTO `menus` (`idMenu`, `createDate`, `idMenuPadre`, `lugar`, `name`, `description`, `icon`, `linkCat`, `linkList`, `imgDash`, `imgDashSize`, `idAplication`, `active`)
SELECT 47, '2026-09-16 20:03:22', 11, 2, 'Sucursales', 'Datos y horario de cada sucursal', NULL, NULL, 'sucursalList', NULL, NULL, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `menus` WHERE `idMenu` = 47 );


-- ── 4. Tipos de puesto (4) ──

INSERT INTO `roles_tipo` (`idTipoRol`, `clave`, `nombre`, `active`)
SELECT 1, 'VENDEDOR', 'Vendedores', 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles_tipo` WHERE `idTipoRol` = 1 );

INSERT INTO `roles_tipo` (`idTipoRol`, `clave`, `nombre`, `active`)
SELECT 2, 'TECNICO', 'Técnicos', 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles_tipo` WHERE `idTipoRol` = 2 );

INSERT INTO `roles_tipo` (`idTipoRol`, `clave`, `nombre`, `active`)
SELECT 3, 'EMPLEADO', 'Empleados', 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles_tipo` WHERE `idTipoRol` = 3 );

INSERT INTO `roles_tipo` (`idTipoRol`, `clave`, `nombre`, `active`)
SELECT 4, 'ENCARGADO_TALLER', 'Encargados de taller', 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles_tipo` WHERE `idTipoRol` = 4 );


-- Puestos que faltan (3), incluido el de sistema "Empleado"

INSERT INTO `roles` (`idRol`, `createDate`, `name`, `description`, `idTipoRol`, `bSistema`, `active`)
SELECT 7, '2026-09-13 14:09:08', 'Empleado', 'Puesto del sistema: tiene datos de empleado y participa en asistencia y nómina.', 3, 1, 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles` WHERE `idRol` = 7 );

INSERT INTO `roles` (`idRol`, `createDate`, `name`, `description`, `idTipoRol`, `bSistema`, `active`)
SELECT 16148, '2026-09-21 14:14:17', 'Encargado de taller', 'Revisa el trabajo del técnico y acepta el folio antes de que pase a mostrador.', 4, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles` WHERE `idRol` = 16148 );

INSERT INTO `roles` (`idRol`, `createDate`, `name`, `description`, `idTipoRol`, `bSistema`, `active`)
SELECT 31190, '2026-02-23 19:15:13', 'Técnico', 'Es de taller', 2, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `roles` WHERE `idRol` = 31190 );


-- Tipo de los puestos que ya existen (2)

UPDATE roles SET idTipoRol = 1, bSistema = 0 WHERE idRol = 4; -- Vendedor Master

UPDATE roles SET idTipoRol = 1, bSistema = 0 WHERE idRol = 5; -- Vendedor


-- ── Tipos de venta (1) ──

INSERT INTO `sales_type` (`idSaleType`, `createDate`, `name`, `sig`, `description`, `active`)
SELECT 8, '2026-08-27 01:00:20', 'Garantía', 'GAR', 'Garantía sobre un taller ya entregado — no genera comisión', 1
WHERE NOT EXISTS ( SELECT 1 FROM `sales_type` WHERE `idSaleType` = 8 );


-- ── Estatus de taller (2) ──

INSERT INTO `taller_status_cat` (`idTallerStatus`, `createDate`, `nombre`, `orden`, `description`, `active`)
SELECT 7, '2026-09-17 05:55:39', 'Cancelado', 8, NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `taller_status_cat` WHERE `idTallerStatus` = 7 );

INSERT INTO `taller_status_cat` (`idTallerStatus`, `createDate`, `nombre`, `orden`, `description`, `active`)
SELECT 8, '2026-09-21 14:14:17', 'Encargado de taller', 4, 'El técnico terminó y el encargado de la sucursal revisa antes de pasar a mostrador', 1
WHERE NOT EXISTS ( SELECT 1 FROM `taller_status_cat` WHERE `idTallerStatus` = 8 );


-- ── Conceptos de nomina (12) ──

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 1, 'Sueldo base', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 1 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 2, 'Bono', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 2 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 3, 'Bono especial', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 3 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 4, 'Comisiones', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 4 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 5, 'Horas extra', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 5 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 6, 'Pago de préstamo', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 6 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 7, 'Vacaciones', 'PERCEPCION', 1, 0, '2026-08-09 13:56:41', '2026-08-09 14:12:14', 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 7 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 8, 'Prima vacacional', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 8 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 9, 'Aguinaldo', 'PERCEPCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 9 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 10, 'Descuento', 'DEDUCCION', 1, 0, '2026-08-09 13:56:41', '2026-08-09 14:12:07', 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 10 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 11, 'Descuento por falta/retardo', 'DEDUCCION', 1, 1, '2026-08-09 13:56:41', NULL, 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 11 );

INSERT INTO `nomina_conceptos` (`idNominaConcepto`, `name`, `tipo`, `bSistema`, `active`, `createDate`, `updateDate`, `idCreateUser`)
SELECT 12, 'Abono de préstamo', 'DEDUCCION', 1, 1, '2026-08-09 13:56:41', '2026-08-09 14:12:17', 1
WHERE NOT EXISTS ( SELECT 1 FROM `nomina_conceptos` WHERE `idNominaConcepto` = 12 );


-- ── Familias de producto (6) ──

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 93, '2026-04-27 16:19:55', 'HUBLOT', '', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 93 );

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 94, '2026-04-27 16:26:55', 'COACH', '', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 94 );

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 95, '2026-04-27 16:35:09', 'MICHAEL KORS', '', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 95 );

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 96, '2026-04-27 16:53:45', 'CARTIER', '', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 96 );

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 97, '2026-07-06 12:18:48', 'TOALLA PULIDORA', '', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 97 );

INSERT INTO `families` (`idFamily`, `createDate`, `name`, `description`, `active`)
SELECT 98, '2026-08-25 06:41:41', 'METAL', 'Metal para inventario de taller (fino y kilatajes/leyes)', 1
WHERE NOT EXISTS ( SELECT 1 FROM `families` WHERE `idFamily` = 98 );


-- Orden de los estatus de taller (6)

UPDATE taller_status_cat SET orden = 1 WHERE idTallerStatus = 1; -- Cotización

UPDATE taller_status_cat SET orden = 2 WHERE idTallerStatus = 2; -- Pedido de taller

UPDATE taller_status_cat SET orden = 3 WHERE idTallerStatus = 3; -- Asignado

UPDATE taller_status_cat SET orden = 5 WHERE idTallerStatus = 4; -- Finalizado/Mostrador

UPDATE taller_status_cat SET orden = 6 WHERE idTallerStatus = 5; -- Entregado

UPDATE taller_status_cat SET orden = 7 WHERE idTallerStatus = 6; -- Devolución


-- ── 6. Productos de metal (12) ──
-- Sin ellos el inventario de metal no puede mover nada.

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822809, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-22', 'METAL ORO 22K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-22' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822810, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-20', 'METAL ORO 20K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-20' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822811, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-14', 'METAL ORO 14K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-14' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822812, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-18', 'METAL ORO 18K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-18' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822813, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-12', 'METAL ORO 12K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-12' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822814, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-8', 'METAL ORO 8K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-8' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822815, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-24', 'ORO FINO (24K)', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-24' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822816, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-10', 'METAL ORO 10K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-10' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822817, '2026-08-25 06:41:41', 1, 98, 1, 1, 1, NULL, 'METAL-ORO-16', 'METAL ORO 16K', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-ORO-16' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822824, '2026-08-25 06:41:42', 1, 98, 2, 1, 1, NULL, 'METAL-PLATA-925', 'METAL PLATA LEY 925', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-PLATA-925' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822825, '2026-08-25 06:41:42', 1, 98, 2, 1, 1, NULL, 'METAL-PLATA-1000', 'PLATA FINA (LEY 1000)', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-PLATA-1000' );

INSERT INTO `products` (`idProduct`, `createDate`, `idSucursal`, `idFamily`, `idGroup`, `idQuality`, `idOrigin`, `idSupplier`, `barCode`, `name`, `gramos`, `cost`, `price`, `active`)
SELECT 113822826, '2026-08-25 06:41:42', 1, 98, 2, 1, 1, NULL, 'METAL-PLATA-720', 'METAL PLATA LEY 720', 0, 0, 0, 1
WHERE NOT EXISTS ( SELECT 1 FROM `products` WHERE `barCode` = 'METAL-PLATA-720' );


-- ── 7. Permisos para Admin y CEO (26 acciones) ──
-- Solo Admin y CEO: lo que vaya para otros puestos se reparte desde la
-- pantalla de permisos, para no pisar lo que el cliente ya tiene.

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'Roles_Crear'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'inv_Delete'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_MetalInvTransferir'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_MetalInvVer'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'gral_FacialAutorizarManual'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'empleados_Eliminar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nominaConceptos_Administrar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'comisiones_Capturar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'comisiones_Cancelar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nomina_Generar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nomina_Pagar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nomina_Cancelar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nomina_Eliminar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'nomina_EditarConceptos'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'ventas_EntregarApartado'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'timecard_CapturarManual'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'timecard_Consultar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'timecard_AdministrarHorarios'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'dashboard_VerPanel'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'dashboard_VerCostos'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'sucursales_CrearModificar'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_DeleteVacio'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_PasarAEncargado'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_AceptarComoEncargado'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_DesbloquearTaller'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );

INSERT INTO actionsconf (createDate, relationType, idRelation, idAction, active)
SELECT @ahora, 'R', R.idRol, A.idAction, 1
FROM roles R CROSS JOIN actions A
WHERE R.name IN ('Admin', 'CEO') AND A.name = 'tall_EditEncabezadoBloqueado'
  AND NOT EXISTS ( SELECT 1 FROM actionsconf AC WHERE AC.relationType = 'R' AND AC.idRelation = R.idRol AND AC.idAction = A.idAction );


-- Menus nuevos para Admin y CEO (11)
-- El id del permiso sigue el esquema del sistema (usuario + consecutivo,
-- el de getIDKeyByUserWithOUT): se toma el consecutivo del usuario 1 y se
-- avanza, para no chocar con los que genere el sistema despues.
SET @seq = IFNULL(( SELECT idRelation FROM ids_by_user WHERE idUser = 1 ), 0);

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 35, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 35 ); -- Inventario Metal

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 36, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 36 ); -- Bitácora Facial

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 38, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 38 ); -- Técnicos

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 39, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 39 ); -- Vendedores

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 40, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 40 ); -- Empleados

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 41, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 41 ); -- Conceptos de Nómina

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 42, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 42 ); -- Comisiones

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 43, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 43 ); -- Nómina

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 44, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 44 ); -- Asistencia

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 46, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 46 ); -- Panel del director

INSERT INTO menupermisos (idMenuPermiso, createDate, typeRelation, idRelation, idMenu, active)
SELECT CONCAT( 1, @seq := @seq + 1 ), @ahora, 'R', R.idRol, 47, 1 FROM roles R
WHERE R.name IN ('Admin', 'CEO')
  AND NOT EXISTS ( SELECT 1 FROM menupermisos MP WHERE MP.typeRelation = 'R' AND MP.idRelation = R.idRol AND MP.idMenu = 47 ); -- Sucursales

-- Deja el consecutivo del usuario 1 donde quedo.
INSERT INTO ids_by_user (createDate, idRelation, idUser)
SELECT @ahora, @seq, 1
WHERE NOT EXISTS ( SELECT 1 FROM ids_by_user WHERE idUser = 1 );

UPDATE ids_by_user SET idRelation = @seq WHERE keyx > 0 AND idUser = 1 AND idRelation < @seq;


-- ── 8. Menus que solo cambiaron de nombre (2) ──

UPDATE menus SET name = 'Empleados' WHERE idMenu = 9 AND name = 'Usuarios';

UPDATE menus SET name = 'Puestos' WHERE idMenu = 17 AND name = 'Roles';

-- ══════════════════════════════════════════════════════════════
-- 8. RELLENOS (UPDATE): dejan al dia lo que ya existe
--
-- Van al final, cuando las columnas y los catalogos de arriba ya estan.
-- Todos se pueden repetir.
-- ══════════════════════════════════════════════════════════════

-- ── 8.1 Acceso al sistema: todos los usuarios nacen con acceso ──
UPDATE users SET bAcceso = 1 WHERE idUser > 0 AND bAcceso IS NULL;

-- ── 8.2 Talleres cuya venta ya estaba cancelada pasan a estatus 7 ──
UPDATE taller AS T
INNER JOIN sales AS S ON S.idSale = T.idSale
SET T.idTallerStatus = 7, T.active = 0
WHERE T.idTaller > 0 AND S.active = 0 AND T.idTallerStatus <> 7;

-- ── 8.3 Comisiones viejas: quien autorizo, % y base ──
UPDATE comisiones_track
SET auth_idUser = CAST(REPLACE(REGEXP_SUBSTR(referencia, 'idUser [0-9]+'), 'idUser ', '') AS UNSIGNED)
WHERE idComisionTrack > 0
  AND auth_idUser IS NULL
  AND referencia REGEXP 'idUser [0-9]+';

UPDATE comisiones_track AS CT
INNER JOIN users AS U ON U.idUser = CT.auth_idUser
SET CT.referencia = CONCAT(
      'Captura manual — autorizó: ', U.name,
      IF(U.userName IS NULL OR U.userName = '', '', CONCAT(' (', U.userName, ')'))
    )
WHERE CT.idComisionTrack > 0 AND CT.referencia LIKE '%idUser %';

UPDATE comisiones_track
SET montoBase = CAST(REPLACE(REGEXP_SUBSTR(referencia, '\\$[0-9]+([.][0-9]+)?'), '$', '') AS DECIMAL(12,2)),
    porcentajeAplicado = CAST(REPLACE(REGEXP_SUBSTR(referencia, '[0-9]+([.][0-9]+)? ?%'), '%', '') AS DECIMAL(5,2))
WHERE idComisionTrack > 0
  AND montoBase IS NULL
  AND porcentajeAplicado IS NULL
  AND referencia REGEXP '\\$[0-9]'
  AND referencia REGEXP '[0-9] ?%';

-- ── 8.4 Recibos de nomina: heredan el estado de su corrida ──
-- OJO: al terminar, revisar que ninguna nomina PAGADA haya quedado con
-- recibos en BORRADOR.
UPDATE nomina_recibos AS R
INNER JOIN nomina AS N ON N.idNomina = R.idNomina
SET R.estatus           = N.estatus,
    R.pagadaDate        = N.pagadaDate,
    R.idPagoUser        = N.idPagoUser,
    R.canceladaDate     = N.canceladaDate,
    R.idCancelUser      = N.idCancelUser,
    R.motivoCancelacion = N.motivoCancelacion
WHERE R.idNominaRecibo > 0
  AND R.estatus = 'BORRADOR'
  AND N.estatus <> 'BORRADOR';

-- ── 8.5 Taller: congelar el % de los destajos ya pagados ──
UPDATE taller_mano_obra AS TMO
INNER JOIN comisiones_track AS CT
        ON CT.idTaller = TMO.idTaller
       AND CT.idUser   = TMO.idUserTecnico
       AND CT.tipo     = 'DESTAJO'
       AND CT.estatus <> 'CANCELADA'
SET TMO.porcentajeDestajo = CT.porcentajeAplicado
WHERE TMO.idManoObra > 0
  AND TMO.porcentajeDestajo IS NULL
  AND CT.porcentajeAplicado IS NOT NULL;

-- ── 8.6 Taller: utilidad BRUTA de cada folio ──
-- Mano de obra + refacciones + metal de la empresa, menos sus costos.
-- Servicios externos, metal del cliente y metal final NO entran.
-- Garantias y cancelados quedan en 0. Las comisiones se restan en 8.8.
UPDATE taller AS T
SET T.utilidad = IF(
        T.idTallerOrigen IS NOT NULL OR T.idTallerStatus = 7,
        0,
        ROUND(
            IFNULL(( SELECT SUM( TMO.precio ) FROM taller_mano_obra AS TMO WHERE TMO.idTaller = T.idTaller ),
                   IFNULL( T.manoObraPrecio, 0))
          + IFNULL(( SELECT SUM( ( R.precio - R.costo ) * R.cantidad ) FROM taller_refacciones AS R WHERE R.idTaller = T.idTaller ), 0)
          + IFNULL(( SELECT SUM( MA.valorMetal - MA.costoMetal ) FROM taller_metal_agranel AS MA WHERE MA.idTaller = T.idTaller ), 0)
        , 2)
    )
  , T.comisiones = 0
WHERE T.idTaller > 0;

-- ── 8.7 Taller: renglones de comisiones del folio ──
-- Se rehacen solo los que no se le han cargado a nadie.
DELETE FROM taller_comisiones WHERE idTallerComision > 0 AND idComisionTrack IS NULL;

-- Destajo: por tecnico, sobre SU mano de obra.
INSERT INTO taller_comisiones (createDate, idTaller, idUser, tipo, porcentaje, montoBase, monto, active)
SELECT
  NOW()
, T.idTaller
, TMO.idUserTecnico
, 'DESTAJO'
, IFNULL( MAX( TMO.porcentajeDestajo ), IFNULL( MAX( U.destajo ), 0) )
, ROUND( SUM( TMO.precio ), 2)
, ROUND( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 2)
, 1
FROM taller AS T
INNER JOIN taller_mano_obra AS TMO ON TMO.idTaller = T.idTaller
LEFT JOIN users AS U ON U.idUser = TMO.idUserTecnico
WHERE T.idTallerOrigen IS NULL
  AND T.idTallerStatus <> 7
  AND NOT EXISTS (
      SELECT 1 FROM taller_comisiones AS TC
      WHERE TC.idTaller = T.idTaller AND TC.idUser = TMO.idUserTecnico AND TC.tipo = 'DESTAJO'
  )
GROUP BY T.idTaller, TMO.idUserTecnico
HAVING ROUND( SUM( ROUND( TMO.precio * IFNULL( TMO.porcentajeDestajo, IFNULL( U.destajo, 0) ) / 100, 2) ), 2) > 0;

-- Comision del vendedor: sobre (utilidad bruta - destajo).
INSERT INTO taller_comisiones (createDate, idTaller, idUser, tipo, porcentaje, montoBase, monto, active)
SELECT * FROM (
    SELECT
      NOW() AS createDate
    , T.idTaller
    , T.idSeller_idUser AS idUser
    , 'COMISION' AS tipo
    , IFNULL( U.comision, 0) AS porcentaje
    , ROUND( T.utilidad - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                   WHERE TC.idTaller = T.idTaller AND TC.tipo = 'DESTAJO' ), 0), 2) AS montoBase
    , ROUND(
        GREATEST(
            T.utilidad - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                  WHERE TC.idTaller = T.idTaller AND TC.tipo = 'DESTAJO' ), 0)
        , 0) * IFNULL( U.comision, 0) / 100
      , 2) AS monto
    , 1 AS active
    FROM taller AS T
    LEFT JOIN users AS U
           ON U.idUser = T.idSeller_idUser AND U.active = 1
          AND EXISTS ( SELECT 1 FROM rolesconfig AS RC
                       INNER JOIN roles AS R ON R.idRol = RC.idRol
                       WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1 )
    WHERE T.idTallerOrigen IS NULL
      AND T.idTallerStatus <> 7
      AND NOT EXISTS (
          SELECT 1 FROM taller_comisiones AS TC
          WHERE TC.idTaller = T.idTaller AND TC.tipo = 'COMISION'
      )
) AS X
WHERE X.monto > 0;

-- ── 8.8 Taller: utilidad NETA, comisiones y utilidad cobrada ──
UPDATE taller AS T
SET T.comisiones = ROUND( IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                   WHERE TC.idTaller = T.idTaller AND TC.active = 1 ), 0), 2)
  , T.utilidad   = ROUND( T.utilidad - IFNULL(( SELECT SUM( TC.monto ) FROM taller_comisiones AS TC
                                                WHERE TC.idTaller = T.idTaller AND TC.active = 1 ), 0), 2)
WHERE T.idTaller > 0;

UPDATE taller AS T
SET T.utilidadCobrada = IF(
        IFNULL( T.precioTotal, 0) <= 0 OR T.utilidad = 0,
        0,
        ROUND( T.utilidad * LEAST(
            IFNULL(( SELECT SUM( P.pago ) FROM payments AS P
                     WHERE P.idRelation = T.idSale AND P.relationType = 'V' AND P.active = 1 ), 0) / T.precioTotal
        , 1), 2)
    )
WHERE T.idTaller > 0;

-- ── 8.9 Ventas: comision, utilidad y utilidad cobrada ──
-- Comision REAL si la venta ya la genero; si no, la estimada con el %
-- vigente del vendedor (activo y con puesto de tipo Vendedor).
UPDATE sales AS S
SET S.comisionMonto = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        IFNULL(
            ( SELECT ROUND( SUM( CT.monto ), 2) FROM comisiones_track AS CT
              WHERE CT.idSale = S.idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA' )
            ,
            GREATEST( ROUND(
                (
                    IFNULL(( SELECT SUM( SD.importe )            FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
                  - IFNULL(( SELECT SUM( SD.cost * SD.cantidad ) FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
                )
                * IFNULL(
                    ( SELECT U.comision FROM users AS U
                      WHERE U.idUser = S.idSeller_idUser AND U.active = 1
                        AND EXISTS ( SELECT 1 FROM rolesconfig AS RC
                                     INNER JOIN roles AS R ON R.idRol = RC.idRol
                                     WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1 )
                      LIMIT 1 )
                , 0) / 100
            , 2), 0)
        )
    )
  , S.comisionPorcentaje = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        IFNULL(
            ( SELECT CT.porcentajeAplicado FROM comisiones_track AS CT
              WHERE CT.idSale = S.idSale AND CT.tipo = 'VENTA' AND CT.estatus <> 'CANCELADA'
                AND CT.porcentajeAplicado IS NOT NULL
              ORDER BY CT.idComisionTrack LIMIT 1 )
            ,
            IFNULL(( SELECT U.comision FROM users AS U
                     WHERE U.idUser = S.idSeller_idUser AND U.active = 1
                       AND EXISTS ( SELECT 1 FROM rolesconfig AS RC
                                    INNER JOIN roles AS R ON R.idRol = RC.idRol
                                    WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = 1 )
                     LIMIT 1 ), 0)
        )
    )
WHERE S.keyx > 0;

UPDATE sales AS S
SET S.utilidad = IF(
        S.active = 0 OR S.idSaleType NOT IN (1, 2, 3),
        0,
        ROUND(
            IFNULL(( SELECT SUM( SD.importe )            FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
          - IFNULL(( SELECT SUM( SD.cost * SD.cantidad ) FROM salesdetail AS SD WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0)
          - S.comisionMonto
        , 2)
    )
WHERE S.keyx > 0;

UPDATE sales AS S
SET S.utilidadCobrada = IF(
        S.utilidad = 0,
        0,
        ROUND( S.utilidad * LEAST(
            IFNULL(( SELECT SUM( P.pago ) FROM payments AS P
                     WHERE P.idRelation = S.idSale AND P.relationType = 'V' AND P.active = 1 ), 0)
            / NULLIF( IFNULL(( SELECT SUM( SD.importe ) FROM salesdetail AS SD
                               WHERE SD.idSale = S.idSale AND SD.active = 1 ), 0), 0)
        , 1), 2)
    )
WHERE S.keyx > 0;

UPDATE sales SET utilidadCobrada = 0 WHERE keyx > 0 AND utilidadCobrada IS NULL;

-- ── 9. Se vuelve a dejar el modo seguro como estaba ──
SET SQL_SAFE_UPDATES = @safe_updates_previo;

-- ── 10. Resumen de como quedo ──
SELECT 'acciones'            AS que, COUNT(*) AS cuantas FROM actions WHERE active = 1
UNION ALL SELECT 'menus',               COUNT(*) FROM menus WHERE active = 1
UNION ALL SELECT 'conceptos de nomina', COUNT(*) FROM nomina_conceptos
UNION ALL SELECT 'productos de metal',  COUNT(*) FROM products P INNER JOIN families F ON F.idFamily = P.idFamily AND UPPER(F.name) LIKE '%METAL%'
UNION ALL SELECT 'folios con utilidad', COUNT(*) FROM taller WHERE utilidad <> 0
UNION ALL SELECT 'ventas con utilidad', COUNT(*) FROM sales WHERE utilidad <> 0
UNION ALL SELECT 'renglones de comision de taller', COUNT(*) FROM taller_comisiones;
