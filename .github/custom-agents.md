# Custom Agents sugeridos (VioletaSystem)

Este repositorio define agentes reutilizables en `.github/agents/` para Copilot.

## Agentes disponibles
- `backend-api-agent.prompt.md`: cambios en API Node/Express/Sequelize.
- `frontend-angular-agent.prompt.md`: cambios en Angular (`Front/src`).
- `sql-migration-agent.prompt.md`: scripts SQL/migraciones y su impacto.

## Uso recomendado
1. Abrir Copilot Chat.
2. Invocar el prompt file según el tipo de tarea.
3. Escribir el requerimiento funcional y restricciones del cambio.
4. Pedir salida en formato: qué cambió, dónde, validación y riesgos.

## Nota
Estos agentes están alineados con las reglas de `.github/copilot-instructions.md`.
