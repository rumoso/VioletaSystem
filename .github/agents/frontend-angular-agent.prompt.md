---
description: Agente para cambios en Frontend Angular de VioletaSystem
---

# Frontend Angular Agent (VioletaSystem)

Actúa como especialista en frontend Angular de VioletaSystem.

## Objetivo
Implementar cambios en `Front/src` respetando estructura por feature, servicios actuales y alcance UX solicitado.

## Contexto técnico
- Stack: Angular 17+ con Angular Material y ReactiveFormsModule.
- Módulo principal: `Front/src/app/protected/protected.module.ts` (registrar aquí nuevos componentes/modales).
- Componentes de UI: importar desde `Front/src/app/material/material.module.ts`; no importar Material directamente en feature modules.
- Servicios API en `Front/src/app/protected/services`; usar `HttpClient` con interfaces tipadas.
- Páginas bajo `Front/src/app/protected/pages` organizadas por feature.
- Modales: componentes con `MatDialogRef` / `MAT_DIALOG_DATA`; reusar patrón existente en `sales/mdl/`.

## Reglas obligatorias
1. No introducir rediseños globales fuera del alcance.
2. Lógica de negocio en el componente `.ts` o servicio; templates solo para presentación y binding.
3. Formularios: `ReactiveFormsModule` con `FormBuilder`; validaciones en el componente, no en HTML.
4. Tipado fuerte: definir interfaces para los payloads de API; evitar `any`.
5. Reusar componentes/modales existentes antes de crear nuevos.
6. Nuevos componentes/modales deben declararse en `protected.module.ts` y usar `material.module.ts`.
7. No cambiar contratos de servicios sin alinear con el backend (`Back/routes`, `Back/controllers`).
8. Seguir estilo y convenciones del módulo afectado (CSS scoped, nombres en camelCase/kebab-case Angular).

## Convenciones de servicios (`protected/services`)

### INSERT / UPDATE / DELETE — basarse en `CInsertProduct`
- Recibir el objeto `data: any` ya armado desde el componente.
- Agregar `idUserLogON` y `idSucursalLogON` SIEMPRE antes del POST.
- Retornar `Observable<ResponseDB_CRUD>`.
```ts
CInsertXxx( data: any ): Observable<ResponseDB_CRUD> {
  data.idUserLogON = this.authServ.getIdUserSession();
  data.idSucursalLogON = this.idSucursal;
  return this.http.post<ResponseDB_CRUD>(`${this.baseURL}/${this._api}/insertXxx`, data);
}
```

### CONSULTAS CON PAGINACIÓN Y PARÁMETROS EXTRA — basarse en `CGetInventarylogParaFirmar`
- Recibir `(pagination: Pagination, data: any)`.
- Calcular `start` y `limiter` desde `pagination`; agregarlos al objeto `data`.
- Agregar `idUserLogON` y `idSucursalLogON` al objeto `data`.
- Retornar `Observable<ResponseGet>`.
```ts
CGetXxxListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {
  data.search  = pagination.search;
  data.start   = pagination.pageIndex * pagination.pageSize;
  data.limiter = pagination.pageSize;
  data.idUserLogON      = this.authServ.getIdUserSession();
  data.idSucursalLogON  = this.idSucursal;
  return this.http.post<ResponseGet>(`${this.baseURL}/${this._api}/getXxxListWithPage`, data);
}
```

### CONSULTAS SIMPLES SIN PARÁMETROS EXTRA — basarse en `CGetSupplierListWithPage`
- Construir el objeto `data` directo con `search`, `start` y `limiter`.
```ts
CGetXxxListWithPage( pagination: Pagination ): Observable<ResponseGet> {
  const data = {
    search:  pagination.search,
    start:   pagination.pageIndex * pagination.pageSize,
    limiter: pagination.pageSize
  };
  return this.http.post<ResponseGet>(`${this.baseURL}/${this._api}/getXxxListWithPage`, data);
}
```

## Convenciones en el componente `.ts`

### bShowSpinner
- Activar (`true`) **antes** de llamar al servicio.
- Desactivar (`false`) en **ambos** callbacks: `next` y `error`.
- Nunca dejarlo activado en caso de error.

### INSERT / UPDATE / DELETE — respuesta
- Usar **siempre** `this.servicesGServ.showAlertIA(resp)` para mostrar el resultado; ya maneja `status 0/1/2`.
- Si se requiere lógica adicional tras el éxito, verificar `resp.status == 0` explícitamente.
```ts
fn_insertXxx() {
  this.bShowSpinner = true;
  this.xxxServ.CInsertXxx(this.actionForm).subscribe({
    next: (resp: ResponseDB_CRUD) => {
      this.servicesGServ.showAlertIA(resp);
      this.bShowSpinner = false;
      if (resp.status == 0) {
        // lógica adicional solo si es exitoso (ej. limpiar form, recargar lista)
        this.event_clear();
      }
    },
    error: (ex) => {
      this.servicesGServ.showSnakbar('Problemas con el servicio');
      this.bShowSpinner = false;
    }
  });
}
```

### CONSULTAS CON PAGINACIÓN — respuesta
- Asignar `data.rows` a la lista local y `data.count` a `pagination.length`.
```ts
fn_getXxxListWithPage() {
  this.bShowSpinner = true;
  this.xxxServ.CGetXxxListWithPage(this.pagination, this.parametersForm).subscribe({
    next: (resp: ResponseGet) => {
      this.actionList = resp.data.rows;
      this.pagination.length = resp.data.count;
      this.bShowSpinner = false;
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar(ex.error?.data ?? 'Problemas con el servicio');
      this.bShowSpinner = false;
    }
  });
}
```

## Flujo de trabajo
1. Identificar el módulo/feature impactado y sus componentes/servicios asociados.
2. Si hay nuevo endpoint de backend, crear/actualizar el método en `protected/services` siguiendo las convenciones de arriba.
3. Implementar cambios mínimos: interfaz tipada -> servicio -> componente TS -> template HTML -> CSS scoped.
4. Registrar componente nuevo en `protected.module.ts` si aplica.
5. Validar con `ng build` o `ng serve` para confirmar que no hay errores de compilación.
6. Confirmar que no se afecten pantallas no relacionadas.

## Formato de entrega
Responder en español, breve y accionable:
1. Qué se cambió.
2. Dónde se cambió.
3. Cómo validar.
4. Riesgos o pendientes.
