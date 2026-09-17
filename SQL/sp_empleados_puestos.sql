-- ============================================================
-- USUARIOS → EMPLEADOS Y ROLES → PUESTOS — stored procedures
-- (analisis/018-empleados-y-puestos.md, T4)
--
-- Redefine los SPs existentes que tocan usuarios y roles. Se partió de
-- SHOW CREATE PROCEDURE de la BD local (el dump de producción está
-- desfasado: p. ej. insertUser ya recibe p_destajo).
--
-- Reglas que imponen:
--  - Los combos filtran por roles.idTipoRol, NUNCA por el nombre del rol.
--  - Solo inicia sesión quien está activo y con bAcceso = 1.
--  - userName es obligatorio y único solo entre usuarios con acceso.
--  - Todo usuario nuevo nace con el puesto de sistema "Empleado" (idRol 7).
--  - users.name lo arman insertUser/updateUser: "Paterno Materno, Nombre"
--    (requiere users_nombre_apellidos.sql).
--  - El tipo 3 (EMPLEADO) es exclusivo del puesto de sistema; un puesto
--    con bSistema = 1 no cambia nombre, tipo ni estatus.
--
-- Aplica en LOCAL y PRODUCCIÓN, después de empleados_puestos.sql.
-- Idempotente (DROP + CREATE).
-- ============================================================

DROP PROCEDURE IF EXISTS `cbxGetSellersCombo`;
DROP PROCEDURE IF EXISTS `getUserByUserName`;
DROP PROCEDURE IF EXISTS `getUserByID`;
DROP PROCEDURE IF EXISTS `insertUser`;
DROP PROCEDURE IF EXISTS `updateUser`;
DROP PROCEDURE IF EXISTS `getUsersListWithPage`;
DROP PROCEDURE IF EXISTS `getRolesByIdUser`;
DROP PROCEDURE IF EXISTS `getRolesListWithPage`;
DROP PROCEDURE IF EXISTS `getRolByID`;
DROP PROCEDURE IF EXISTS `insertRol`;
DROP PROCEDURE IF EXISTS `updateRol`;

DELIMITER $$

-- ------------------------------------------------------------
-- Combo de vendedores: usuarios activos con al menos un puesto ACTIVO
-- de tipo 1 (VENDEDOR). DISTINCT: quien tiene dos puestos de vendedor
-- sale una sola vez. Mismo formato de salida que antes.
-- ------------------------------------------------------------
CREATE PROCEDURE `cbxGetSellersCombo`(
IN p_idUser BIGINT
, IN p_search VARCHAR(500)
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	U.idUser
	, CONCAT( '#', U.idUser, ' - ' , U.name) AS name
	, ROUND( IFNULL( U.comision ,0) ,2) AS comision
	FROM users as U
	WHERE U.active = 1
	AND EXISTS (
		SELECT 1
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
		AND R.active = 1
		AND R.idTipoRol = 1
	)
	AND
	(
		p_search = ''
		OR CONCAT( '#', U.idUser, ' - ' , U.name) LIKE CONCAT('%', p_search ,'%')
	)
    ORDER BY U.idUser DESC
	LIMIT 0, 5;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

-- ------------------------------------------------------------
-- Login por usuario/contraseña: un usuario sin acceso no se encuentra
-- (el controller responde lo mismo que usuario o contraseña incorrectos).
-- ------------------------------------------------------------
CREATE PROCEDURE `getUserByUserName`(IN p_userName VARCHAR(45) )
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	idUser
	,createDate
	,name
	,username
	,pwd
	,active
    ,IFNULL(
    (
        SELECT GROUP_CONCAT(r.idRol)
        FROM rolesconfig r
        WHERE r.idUser = u.idUser
    )
    ,'') AS roles
	FROM users AS u
	WHERE active = 1
	AND bAcceso = 1
	AND username = p_userName;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

CREATE PROCEDURE `getUserByID`(IN p_idUser BIGINT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	U.idUser
	, U.createDate
	, U.name
	, U.userName
	, U.pwd
	, IFNULL( U.authorizationCode ,'') AS authorizationCode
	, U.comision
	, U.active
    , IFNULL( U.destajo, 0) AS destajo
	, U.bAcceso
	, IFNULL( U.nombre, '' ) AS nombre
	, IFNULL( U.apellidoPaterno, '' ) AS apellidoPaterno
	, IFNULL( U.apellidoMaterno, '' ) AS apellidoMaterno
	, IF( IFNULL(U.nombre, '') = '', 1, 0 ) AS bNombrePendiente
	FROM users as U
	WHERE U.idUser = p_idUser;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

-- ------------------------------------------------------------
-- Alta de usuario. Nace con el puesto de sistema "Empleado" (idRol 7):
-- el 99% de los usuarios que se crean son empleados; se le quita a
-- quien no lo sea.
-- ------------------------------------------------------------
CREATE PROCEDURE `insertUser`(
IN p_nombre VARCHAR(150)
, IN p_apellidoPaterno VARCHAR(100)
, IN p_apellidoMaterno VARCHAR(100)
, IN p_userName VARCHAR(500)
, IN p_pwd TEXT
, IN p_authorizationCode VARCHAR(45)
, IN p_comision FLOAT
, IN p_destajo DECIMAL( 18,2 )
, IN p_active SMALLINT
, IN p_bAcceso TINYINT

, IN p_idUserC BIGINT
)
BEGIN

	SET @idUserAuthorizationCode = 0;
	SET @idUserUserName = 0;
	SET @out_id = 0;
	SET @message = '';

	-- Nombre completo que lee el resto del sistema: apellidos primero.
	SET @nombre = TRIM( IFNULL(p_nombre, '') );
	SET @apellidos = TRIM( CONCAT_WS( ' ', NULLIF(TRIM(p_apellidoPaterno), ''), NULLIF(TRIM(p_apellidoMaterno), '') ) );
	SET @nameCompleto = IF( @apellidos = '', @nombre, CONCAT( @apellidos, ', ', @nombre ) );

	SET @idUserAuthorizationCode = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE authorizationCode = p_authorizationCode
		AND LENGTH( p_authorizationCode ) > 0
		LIMIT 1
	)
	,0);

	SET @idUserUserName = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE userName = p_userName
		AND bAcceso = 1
		AND p_bAcceso = 1
		AND LENGTH( p_userName ) > 0
		LIMIT 1
	)
	,0);

	IF LENGTH( @nombre ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre es obligatorio.';

	ELSEIF p_bAcceso = 1 AND ( LENGTH( IFNULL(p_userName, '') ) = 0 OR LENGTH( IFNULL(p_pwd, '') ) = 0 ) THEN
		SET @out_id = 0;
		SET @message = 'Con acceso al sistema, el usuario y la contraseña son obligatorios.';

	ELSEIF @idUserAuthorizationCode > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese código de autorización ya se está utilizando.';

	ELSEIF @idUserUserName > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese usuario ya se está utilizando.';

	ELSE

		CALL getIDKeyByUserWithOUT( p_idUserC, @idNew );

		INSERT INTO users(
		idUser
		, createDate
		, name
		, nombre
		, apellidoPaterno
		, apellidoMaterno
		, userName
		, pwd
		, authorizationCode
		, comision
		, active
        , destajo
		, bAcceso
		)
		SELECT
		@idNew
		, NOW()
		, @nameCompleto
		, @nombre
		, NULLIF( TRIM(p_apellidoPaterno), '' )
		, NULLIF( TRIM(p_apellidoMaterno), '' )
		, p_userName
		, p_pwd
		, p_authorizationCode
		, p_comision
		, p_active
        , p_destajo
		, p_bAcceso;

		IF EXISTS ( SELECT 1 FROM roles WHERE idRol = 7 ) THEN
			INSERT INTO rolesconfig ( createDate, idUser, idRol )
			VALUES ( NOW(), @idNew, 7 );
		END IF;

		SET @out_id = @idNew;
		SET @message = 'Empleado guardado con éxito.';

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

CREATE PROCEDURE `updateUser`(
IN p_idUser BIGINT
, IN p_nombre VARCHAR(150)
, IN p_apellidoPaterno VARCHAR(100)
, IN p_apellidoMaterno VARCHAR(100)
, IN p_userName VARCHAR(500)
, IN p_authorizationCode VARCHAR(45)
, IN p_comision FLOAT
, IN p_destajo DECIMAL( 18,2 )
, IN p_active SMALLINT
, IN p_bAcceso TINYINT
, IN p_pwd TEXT
)
BEGIN

	-- p_pwd: hash ya calculado por el controller; '' = no cambia la
	-- contraseña actual.
	SET @idUserAuthorizationCode = 0;
	SET @idUserUserName = 0;
	SET @out_id = 0;
	SET @message = '';

	-- Nombre completo que lee el resto del sistema: apellidos primero.
	SET @nombre = TRIM( IFNULL(p_nombre, '') );
	SET @apellidos = TRIM( CONCAT_WS( ' ', NULLIF(TRIM(p_apellidoPaterno), ''), NULLIF(TRIM(p_apellidoMaterno), '') ) );
	SET @nameCompleto = IF( @apellidos = '', @nombre, CONCAT( @apellidos, ', ', @nombre ) );

	SET @idUserAuthorizationCode = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE authorizationCode = p_authorizationCode
		AND idUser <> p_idUser
		AND LENGTH( p_authorizationCode ) > 0
		LIMIT 1
	)
	,0);

	SET @idUserUserName = IFNULL(
	(
		SELECT
		idUser
		FROM users
		WHERE userName = p_userName
		AND idUser <> p_idUser
		AND bAcceso = 1
		AND p_bAcceso = 1
		AND LENGTH( p_userName ) > 0
		LIMIT 1
	)
	,0);

	IF LENGTH( @nombre ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre es obligatorio.';

	ELSEIF p_bAcceso = 1 AND LENGTH( IFNULL(p_userName, '') ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'Con acceso al sistema, el usuario es obligatorio.';

	ELSEIF p_bAcceso = 1 AND LENGTH( IFNULL(p_pwd, '') ) = 0
		AND LENGTH( IFNULL( ( SELECT pwd FROM users WHERE idUser = p_idUser ), '' ) ) = 0 THEN
		SET @out_id = 0;
		SET @message = 'Para darle acceso al sistema captura una contraseña.';

	ELSEIF @idUserAuthorizationCode > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese código de autorización ya se está utilizando.';

	ELSEIF @idUserUserName > 0 THEN
		SET @out_id = 0;
		SET @message = 'Ese usuario ya se está utilizando.';

	ELSE

		UPDATE
			users
		SET
			name = @nameCompleto
			, nombre = @nombre
			, apellidoPaterno = NULLIF( TRIM(p_apellidoPaterno), '' )
			, apellidoMaterno = NULLIF( TRIM(p_apellidoMaterno), '' )
			, userName = p_userName
			, authorizationCode = p_authorizationCode
			, comision = p_comision
			, active = p_active
            , destajo = p_destajo
			, bAcceso = p_bAcceso
			, pwd = IF( LENGTH( IFNULL(p_pwd, '') ) > 0, p_pwd, pwd )
		WHERE
			idUser = p_idUser;

		SET @out_id = p_idUser;

		SET @message = 'Empleado actualizado con éxito.';

		DELETE FROM sync_up WHERE tabla = 'Users' AND idRelation = p_idUser;

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

-- ------------------------------------------------------------
-- Lista de empleados (pantalla antes "Usuarios").
--   p_idRol         0 = todos
--   p_idTipoRol     0 = todos
--   p_filterAcceso  '' | 'CON' | 'SIN'
--   p_filterActive  '' | 'ACTIVOS' | 'INACTIVOS'
-- `roles` se conserva por compatibilidad; `puestosDesc` solo cuenta
-- puestos activos.
-- ------------------------------------------------------------
CREATE PROCEDURE `getUsersListWithPage`(
    IN p_search VARCHAR(500)
    , IN p_start INT
    , IN p_limiter INT
    , IN p_filterFaceID VARCHAR(10)
    , IN p_idRol BIGINT
    , IN p_idTipoRol INT
    , IN p_filterAcceso VARCHAR(10)
    , IN p_filterActive VARCHAR(10)
)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;

	SET @iRows = ( SELECT
					COUNT(*)
					FROM users as U
					LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = U.idUser
					WHERE
					(
						p_search = ''
						OR U.name LIKE CONCAT('%', p_search ,'%')
						OR U.userName LIKE CONCAT('%', p_search ,'%')
					)
					AND
					(
						p_filterFaceID = ''
						OR ( p_filterFaceID = 'CON' AND FR.idFaceReference IS NOT NULL )
						OR ( p_filterFaceID = 'SIN' AND FR.idFaceReference IS NULL )
					)
					AND
					(
						p_idRol = 0
						OR EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = U.idUser AND RC.idRol = p_idRol )
					)
					AND
					(
						p_idTipoRol = 0
						OR EXISTS ( SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
									WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = p_idTipoRol )
					)
					AND
					(
						p_filterAcceso = ''
						OR ( p_filterAcceso = 'CON' AND U.bAcceso = 1 )
						OR ( p_filterAcceso = 'SIN' AND U.bAcceso = 0 )
					)
					AND
					(
						p_filterActive = ''
						OR ( p_filterActive = 'ACTIVOS' AND U.active = 1 )
						OR ( p_filterActive = 'INACTIVOS' AND IFNULL(U.active, 0) = 0 )
					)
	);

	SELECT
	@iRows AS iRows
	, U.idUser
	, U.createDate
	, U.name
	, U.userName
	,IFNULL(
	(
		SELECT GROUP_CONCAT( R.name )
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
	), 0) AS roles
	,IFNULL(
	(
		SELECT GROUP_CONCAT( R.name ORDER BY R.bSistema DESC, R.name SEPARATOR '|' )
		FROM rolesconfig AS RC
		INNER JOIN roles AS R ON RC.idRol = R.idRol
		WHERE RC.idUser = U.idUser
		AND R.active = 1
	), '') AS puestosDesc
	, U.active
	, U.bAcceso
	, IF(FR.idFaceReference IS NULL, 0, 1) AS bTieneFaceID
	, E.idEmpleado
	, IFNULL( E.idSucursal, 0 ) AS idSucursalBase
	, IFNULL( S.name, '' ) AS sucursalBaseDesc
	, E.fechaBaja
	, IF( IFNULL(U.nombre, '') = '', 1, 0 ) AS bNombrePendiente
	FROM users as U
	LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = U.idUser
	LEFT JOIN empleados AS E ON E.idUser = U.idUser
	LEFT JOIN sucursales AS S ON S.idSucursal = E.idSucursal
	WHERE
	(
		p_search = ''
		OR U.name LIKE CONCAT('%', p_search ,'%')
		OR U.userName LIKE CONCAT('%', p_search ,'%')
	)
	AND
	(
		p_filterFaceID = ''
		OR ( p_filterFaceID = 'CON' AND FR.idFaceReference IS NOT NULL )
		OR ( p_filterFaceID = 'SIN' AND FR.idFaceReference IS NULL )
	)
	AND
	(
		p_idRol = 0
		OR EXISTS ( SELECT 1 FROM rolesconfig AS RC WHERE RC.idUser = U.idUser AND RC.idRol = p_idRol )
	)
	AND
	(
		p_idTipoRol = 0
		OR EXISTS ( SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
					WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = p_idTipoRol )
	)
	AND
	(
		p_filterAcceso = ''
		OR ( p_filterAcceso = 'CON' AND U.bAcceso = 1 )
		OR ( p_filterAcceso = 'SIN' AND U.bAcceso = 0 )
	)
	AND
	(
		p_filterActive = ''
		OR ( p_filterActive = 'ACTIVOS' AND U.active = 1 )
		OR ( p_filterActive = 'INACTIVOS' AND IFNULL(U.active, 0) = 0 )
	)
    ORDER BY U.idUser DESC
	LIMIT p_start, p_limiter;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

-- ------------------------------------------------------------
-- Puestos de un usuario, con su tipo: el modal del empleado decide con
-- esto qué pestañas mostrar (Vendedor / Técnico / Empleado).
-- ------------------------------------------------------------
CREATE PROCEDURE `getRolesByIdUser`(IN p_idUser BIGINT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	RC.createDate
	, R.idRol
	, R.name
	, R.idTipoRol
	, R.bSistema
	FROM roles as R
	LEFT JOIN rolesconfig AS RC ON R.idRol = RC.idRol
	WHERE R.active = 1
	AND RC.idUser = p_idUser
    ORDER BY RC.idRolConfig DESC;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

CREATE PROCEDURE `getRolesListWithPage`(IN p_search VARCHAR(500),IN p_start INT, IN p_limiter INT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SET @iRows = 0;

	SET @iRows = ( SELECT
					COUNT(*)
					FROM roles as R
					WHERE
					(
						p_search = ''
						OR R.name LIKE CONCAT('%', p_search ,'%')
						OR R.description LIKE CONCAT('%', p_search ,'%')
					)
	);

	SELECT
	@iRows AS iRows
	, R.idRol
	, R.createDate
	, R.name
	, R.description
	, R.active
	, R.idTipoRol
	, IFNULL( RT.nombre, '' ) AS tipoRolDesc
	, R.bSistema
	FROM roles as R
	LEFT JOIN roles_tipo AS RT ON RT.idTipoRol = R.idTipoRol
	WHERE
	(
		p_search = ''
		OR R.name LIKE CONCAT('%', p_search ,'%')
		OR R.description LIKE CONCAT('%', p_search ,'%')
	)
    ORDER BY R.bSistema DESC, R.idRol DESC
	LIMIT p_start, p_limiter;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

CREATE PROCEDURE `getRolByID`(IN p_idRol INT)
BEGIN

SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;

	SELECT
	R.idRol
	, R.createDate
	, R.name
	, R.description
	, R.active
	, R.idTipoRol
	, IFNULL( RT.nombre, '' ) AS tipoRolDesc
	, R.bSistema
	FROM roles as R
	LEFT JOIN roles_tipo AS RT ON RT.idTipoRol = R.idTipoRol
	WHERE R.idRol = p_idRol;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

CREATE PROCEDURE `insertRol`(
IN p_oGetDateNow DATETIME
, IN p_name VARCHAR(500)
, IN p_description VARCHAR(500)
, IN p_idTipoRol INT

, IN p_idUserC BIGINT
)
BEGIN

	SET @idRol = 0;
	SET @out_id = 0;
	SET @message = '';

	SET @idRol = IFNULL(
	(
		SELECT
		idRol
		FROM roles
		WHERE name = p_name
		LIMIT 1
	)
	,0);

	IF IFNULL( p_idTipoRol, 0 ) = 3 THEN
		SET @out_id = 0;
		SET @message = 'El tipo Empleados es exclusivo del puesto del sistema "Empleado".';

	ELSEIF p_idTipoRol IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM roles_tipo WHERE idTipoRol = p_idTipoRol ) THEN
		SET @out_id = 0;
		SET @message = 'El tipo de puesto no existe.';

	ELSEIF @idRol = 0 THEN

		CALL getIDKeyByUserWithOUT( p_idUserC, @idNew );

		INSERT INTO roles(
		idRol
		, createDate
		, name
		, description
		, idTipoRol
		, bSistema
		, active
		)
		SELECT
		@idNew
		, p_oGetDateNow
		, p_name
		, p_description
		, p_idTipoRol
		, 0
		, 1;

		SET @out_id = @idNew;
		SET @message = 'Puesto guardado con éxito.';

	ELSE
		SET @out_id = 0;
		SET @message = 'El nombre del puesto ya se está utilizando.';
	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

CREATE PROCEDURE `updateRol`(
IN p_idRol INT
, IN p_name VARCHAR(500)
, IN p_description VARCHAR(500)
, IN p_active SMALLINT
, IN p_idTipoRol INT
)
BEGIN

	SET @idRol = 0;
	SET @out_id = 0;
	SET @message = '';
	SET @bSistema = IFNULL( ( SELECT bSistema FROM roles WHERE idRol = p_idRol ), 0 );

	SET @idRol = IFNULL(
	(
		SELECT
		idRol
		FROM roles
		WHERE name = p_name
		AND idRol <> p_idRol
		LIMIT 1
	)
	,0);

	IF @bSistema = 1 AND EXISTS (
		SELECT 1 FROM roles
		WHERE idRol = p_idRol
		AND (
			name <> p_name
			OR NOT ( idTipoRol <=> p_idTipoRol )
			OR IFNULL(active, 0) <> IFNULL(p_active, 0)
		)
	) THEN
		SET @out_id = 0;
		SET @message = 'Es un puesto del sistema: no se puede cambiar el nombre, el tipo ni el estatus.';

	ELSEIF @bSistema = 0 AND IFNULL( p_idTipoRol, 0 ) = 3 THEN
		SET @out_id = 0;
		SET @message = 'El tipo Empleados es exclusivo del puesto del sistema "Empleado".';

	ELSEIF p_idTipoRol IS NOT NULL AND NOT EXISTS ( SELECT 1 FROM roles_tipo WHERE idTipoRol = p_idTipoRol ) THEN
		SET @out_id = 0;
		SET @message = 'El tipo de puesto no existe.';

	ELSEIF @idRol > 0 THEN
		SET @out_id = 0;
		SET @message = 'El nombre del puesto ya se está utilizando.';

	ELSE

		UPDATE
			roles
		SET
			name = p_name
			, description = p_description
			, active = p_active
			, idTipoRol = p_idTipoRol
		WHERE
			idRol = p_idRol;

		SET @out_id = p_idRol;

		SET @message = 'Puesto actualizado con éxito.';

		DELETE FROM sync_up WHERE tabla = 'Roles' AND idRelation = p_idRol;

	END IF;

	SELECT @out_id AS out_id, @message AS message;

END$$

DELIMITER ;
