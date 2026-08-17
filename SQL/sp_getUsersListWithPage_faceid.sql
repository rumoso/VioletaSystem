-- ============================================================
-- Redefine getUsersListWithPage para exponer si el usuario ya tiene
-- Face ID registrado (LEFT JOIN face_reference) y para poder filtrar
-- por "Con Face ID" / "Sin Face ID" desde el catalogo de usuarios.
-- No es SP nuevo — es el mismo que ya existia, solo se le agrega el
-- parametro p_filterFaceID ('' | 'CON' | 'SIN') y la columna
-- bTieneFaceID. Reemplaza por completo la version anterior.
-- ============================================================

DROP PROCEDURE IF EXISTS `getUsersListWithPage`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `getUsersListWithPage`(
    IN p_search VARCHAR(500)
    , IN p_start INT
    , IN p_limiter INT
    , IN p_filterFaceID VARCHAR(10)
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
	, U.active
	, IF(FR.idFaceReference IS NULL, 0, 1) AS bTieneFaceID
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
    ORDER BY U.idUser DESC
	LIMIT p_start, p_limiter;

 SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;

END$$

DELIMITER ;
