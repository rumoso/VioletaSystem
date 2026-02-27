# Copilot Instructions - VioletaSystem

## Objetivo
Estas instrucciones definen cómo debe colaborar GitHub Copilot en este repositorio para mantener consistencia técnica y funcional entre `Back/`, `Front/` y `SQL/`.

## Contexto del proyecto
- Backend: Node.js + Express + Sequelize ORM. Entry point: `Back/app.js` y `Back/models/server.js`.
  - Capas: `Back/routes` -> `Back/controllers` -> `Back/models`.
  - Middlewares en `Back/middlewares`; logs en `Back/logs/`.
- Frontend: Angular 17+ con Angular Material. Módulo principal: `Front/src/app/protected/protected.module.ts`.
  - Servicios API bajo `Front/src/app/protected/services`.
  - Páginas bajo `Front/src/app/protected/pages`.
- Base de datos: MySQL. Motor de diseño: MySQL Workbench (`.mwb`). Scripts en `SQL/`.
  - El proyecto usa Stored Procedures para reportes y listados complejos.
- Entorno local adicional: `BackProdLocal/` (no modificar sin requerimiento explícito).

## Reglas generales
1. Aplicar cambios mínimos y enfocados al requerimiento solicitado.
2. No renombrar archivos, rutas o símbolos públicos salvo que sea estrictamente necesario.
3. No modificar código no relacionado con la tarea.
4. Respetar patrones ya existentes del módulo afectado.
5. Evitar dependencias nuevas si ya existe solución equivalente en el proyecto.
6. No incluir secretos, credenciales ni datos sensibles en código, logs o commits.
7. No versionar binarios ni archivos generados: `Back/uploads/`, `*.log`, `~$*`, `*.bak` deben estar en `.gitignore`.

## Backend (`Back/`)
- Mantener la separación por capas existente: `routes` -> `controllers` -> `models`.
- Reusar middlewares existentes antes de crear nuevos (`validar-jwt.js`, `validar-roles.js`, `validar-campos.js`).
- Validar entradas con `express-validator` siguiendo el patrón actual del módulo.
- Mantener respuestas consistentes: `{ status: 0, message, data? }` éxito, `{ status: 1, message }` no exitoso, `{ status: 2, message: 'Sucedió un error inesperado', data: error }` en catch.
- Manejo de errores: usar `try/catch` con respuesta `500` y log en `Back/logs/`.
- Uploads de archivos: usar `Back/middlewares/multer-config.js`.
- Al agregar endpoints:
  - Crear/actualizar ruta en `Back/routes`.
  - Registrar el router en `Back/models/server.js`.
  - Mantener nombres descriptivos en español/inglés según el módulo existente.

## Frontend (`Front/`)
- Seguir estructura Angular existente (módulos, servicios, componentes por feature).
- Módulo principal: `protected.module.ts`; registrar aquí cualquier componente/modal nuevo.
- Importar componentes de Angular Material desde `material.module.ts`; no importar directamente en módulos de feature.
- Mantener consistencia con servicios de API actuales (`protected/services`): usar `HttpClient` con tipado fuerte.
- Evitar lógica de negocio compleja en templates; moverla a componentes/servicios.
- Formularios: usar `ReactiveFormsModule` con validaciones en el componente, no en template.
- Reusar componentes y modales existentes cuando sea posible.
- No introducir cambios visuales globales fuera del alcance pedido.

## SQL (`SQL/`)
- Motor: MySQL. Herramienta de diseño: MySQL Workbench.
- Scripts nuevos deben ser idempotentes: usar `IF NOT EXISTS`, `IF EXISTS`, `INSERT IGNORE` o `ON DUPLICATE KEY UPDATE` según aplique.
- Stored Procedures: el proyecto los usa para listados y reportes complejos; seguir el patrón existente en `SQL/StoreProcedures_*.sql`.
- Mantener nombres de archivos descriptivos y orientados al cambio funcional.
- Si un cambio requiere migración + ajuste en backend, mantener ambos en la misma entrega.
- Incluir script de rollback cuando se eliminen o alteren objetos críticos.

## Calidad y validación
- Si se modifica backend, ejecutar validaciones/lint/tests disponibles de `Back/`.
- Si se modifica frontend, ejecutar validaciones/lint/tests disponibles de `Front/`.
- Priorizar pruebas cercanas al cambio antes de pruebas globales.
- Si no hay tests, validar al menos compilación o ejecución mínima del módulo modificado.

## Git y commits
- Usar mensajes de commit claros y orientados a negocio/técnica.
- Formato sugerido:
  - `feat: ...` para funcionalidad nueva
  - `fix: ...` para correcciones
  - `refactor: ...` para reorganización sin cambio funcional
  - `chore: ...` para tareas operativas
- Incluir en la descripción del commit qué se versiona y en qué capas impacta (Back/Front/SQL).

## Qué evitar
- No crear features “extra” no solicitadas.
- No cambiar estilos globales o arquitectura completa sin requerimiento explícito.
- No agregar comentarios innecesarios en el código.
- No romper compatibilidad de endpoints o contratos de servicio existentes.

## Convención de respuesta de Copilot
- Responder de forma breve, accionable y en español.
- Indicar claramente:
  1. Qué se cambió.
  2. Dónde se cambió.
  3. Cómo validar.
  4. Riesgos o pendientes.

## Prioridad en caso de conflicto
1. Requerimiento del usuario actual.
2. Estas instrucciones de repositorio.
3. Convenciones implícitas del código existente.
