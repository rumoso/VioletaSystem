import { ActivatedRoute, Router } from '@angular/router';

// Lectura/limpieza de filtros que viajan en la URL (analisis/015-clics-
// con-filtro-panel.md). Es el primer uso de query params en el
// proyecto — hasta ahora `product`/`customer` solo leían parámetros de
// RUTA (`activatedRoute.params`, un id) con `switchMap`, que no aplica
// aquí: un filtro es un conjunto de campos opcionales, no un único
// identificador obligatorio.
//
// Regla que esto existe para cumplir: si el usuario recarga la página o
// usa el botón de atrás sobre un listado filtrado, tiene que seguir
// viendo el mismo filtro — así que el filtro vive en la URL, nunca solo
// en memoria del componente.

// Precarga en `form` los campos que también vengan en `queryParams`,
// SOLO si esa llave ya existe en `form` (nunca inyecta una propiedad
// nueva) y coercionando el string de la URL al mismo tipo que ya tenía
// el valor por default del form — un query param siempre llega como
// string, así que sin esto un checkbox (`bPending`) o un id numérico
// (`idSaleType`) quedarían mal tipados y las comparaciones estrictas
// del propio formulario (o del payload que se manda al SP) fallarían.
//
// Devuelve cuántos campos se aplicaron, para que quien llama sepa si el
// componente entró con un filtro puesto (y deba, por ejemplo, mostrar
// el aviso de "filtro activo") o entró limpio como siempre.
export function fn_precargarDesdeQueryParams( queryParams: any, form: any ): number {

  let iAplicados = 0;

  if( !queryParams || !form ){
    return iAplicados;
  }

  Object.keys( queryParams ).forEach( ( clave ) => {

    if( !( clave in form ) ){
      return;
    }

    const sValor = queryParams[ clave ];

    if( sValor === null || sValor === undefined || sValor === '' ){
      return;
    }

    const valorActual = form[ clave ];

    if( typeof valorActual === 'number' ){
      const n = Number( sValor );
      if( isNaN( n ) ){
        return;
      }
      form[ clave ] = n;
    }else if( typeof valorActual === 'boolean' ){
      form[ clave ] = ( sValor === 'true' || sValor === '1' );
    }else{
      form[ clave ] = sValor;
    }

    iAplicados++;

  });

  return iAplicados;

}

// Quita el filtro de la URL (el botón "×" del aviso de filtro activo).
// Navega a la MISMA ruta sin query params — no basta con limpiar el
// `parametersForm` en memoria, porque una recarga posterior volvería a
// leer el filtro viejo de la URL si esta no se actualiza también.
export function fn_limpiarQueryParamsURL( router: Router, activatedRoute: ActivatedRoute ): void {
  router.navigate( [], { relativeTo: activatedRoute, queryParams: {} } );
}
