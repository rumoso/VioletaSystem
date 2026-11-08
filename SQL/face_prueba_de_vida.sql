-- ============================================================
-- PRUEBA DE VIDA EN EL RECONOCIMIENTO FACIAL
-- (analisis/037-prueba-de-vida-y-encuadre-adaptable.md)
--
-- La bitácora agrega el resultado SIN_VIDA: la cara pudo coincidir, pero
-- la captura no demostró que hubiera una persona viva (sin parpadeo, o
-- sin seguir los puntos del reto). La columna ya es VARCHAR(20); solo se
-- actualiza su comentario. Mismo tipo y nulabilidad: se puede correr las
-- veces que sea.
-- ============================================================

ALTER TABLE `face_verification_log`
  MODIFY COLUMN `resultado` VARCHAR(20) NOT NULL
  COMMENT 'EXITO | FALLO | NO_DISPONIBLE | AUTORIZACION_MANUAL | SIN_VIDA';
