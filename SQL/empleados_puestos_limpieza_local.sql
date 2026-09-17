-- ============================================================
-- USUARIOS → EMPLEADOS Y ROLES → PUESTOS — limpieza de datos de prueba
-- (analisis/018-empleados-y-puestos.md, T3)
--
-- SOLO LOCAL. Producción no tiene estos datos.
-- Decisión de Rubén (2026-09-12): TimeCard y lo capturado en tecnicos /
-- vendedores son datos de prueba. Las tablas tecnicos / vendedores y las
-- columnas retiradas de `empleados` ya las quita empleados_puestos.sql;
-- aquí solo se vacía TimeCard y se verifica el resultado.
--
-- Se conservan: empleados, empleado_conceptos_base y nómina.
-- Correr después de empleados_puestos.sql, sp_empleados_puestos.sql e
-- insert_roles_tipo.sql.
-- ============================================================

START TRANSACTION;

DELETE FROM timecard_marcajes;
DELETE FROM timecard_jornadas;
DELETE FROM empleado_horarios;

COMMIT;

-- ── Verificación ──
SELECT
	( SELECT COUNT(*) FROM empleados )               AS empleados,
	( SELECT COUNT(*) FROM empleado_conceptos_base ) AS conceptosBase,
	( SELECT COUNT(*) FROM nomina_recibos )          AS recibos,
	( SELECT COUNT(*) FROM timecard_marcajes )       AS marcajes,
	( SELECT COUNT(*) FROM timecard_jornadas )       AS jornadas,
	( SELECT COUNT(*) FROM empleados AS E
	  WHERE NOT EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = E.idUser AND RC.idRol = 7 ) ) AS empleadosSinPuesto7,
	( SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
	  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('tecnicos', 'vendedores') ) AS tablasRetiradasRestantes;
