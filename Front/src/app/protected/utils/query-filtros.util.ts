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


//////////////////////////////////////////////////////////////////////////////////////////////////
// CONSULTA DEL PANEL (analisis/015)
//
// Un clic en una cifra del panel del director no manda filtros: manda
// QUÉ cifra se pidió (`panel`), a qué fecha de corte (`fecha`) y cuánto
// mostraba el panel en ese momento (`n`). La pantalla destino le pide al
// servidor los registros de esa cifra y entra en "modo panel": filtros
// deshabilitados y una leyenda que dice de dónde viene la consulta.
//
// Todo va en la URL por la misma regla que los filtros: recargar o usar
// el botón de atrás tiene que dejar al usuario viendo lo mismo.
//////////////////////////////////////////////////////////////////////////////////////////////////

export interface ConsultaPanel {
  panel: string;
  fecha: string;
  // Lo que el panel mostraba al hacer clic; null si no vino.
  n: number | null;
  idVendedor: number;
  idSale: string;
}

// Lee la consulta del panel de los query params. Devuelve null si la
// pantalla NO viene del panel — y entonces se comporta como siempre.
export function fn_leerConsultaPanel( queryParams: any ): ConsultaPanel | null {

  const sPanel = String( ( queryParams && queryParams.panel ) || '' ).trim();

  if( !sPanel ){
    return null;
  }

  const nMostrado = Number( queryParams.n );

  return {
    panel: sPanel,
    fecha: String( queryParams.fecha || '' ),
    n: ( queryParams.n !== undefined && queryParams.n !== '' && !isNaN( nMostrado ) ) ? nMostrado : null,
    idVendedor: Number( queryParams.idVendedor ) || 0,
    idSale: String( queryParams.idSale || '' )
  };

}

// Etiqueta de la leyenda: el bloque con su fecha, y cuántos registros.
// `sSustantivo` en plural ("notas", "pagos", "productos").
export function fn_etiquetasConsultaPanel( meta: any, sSustantivo: string ): string[] {

  if( !meta ){
    return [ 'Cargando…' ];
  }

  const iConjunto = Number( meta.iConjunto ) || 0;

  return [ meta.etiqueta, `${ iConjunto } ${ iConjunto === 1 ? fn_singular( sSustantivo ) : sSustantivo }` ];

}

// Avisos de la leyenda. Ninguno se esconde: si el listado no muestra lo
// mismo que el panel, el usuario tiene que saber por qué.
export function fn_avisosConsultaPanel( meta: any, oConsulta: ConsultaPanel | null ): string[] {

  const aAvisos: string[] = [];

  if( !meta ){
    return aAvisos;
  }

  const iConjunto = Number( meta.iConjunto ) || 0;
  const iVisibles = Number( meta.iVisibles ) || 0;

  // El corte de hoy se mueve durante el día: entre el clic y la carga
  // alguien pudo abonar o vender.
  if( oConsulta && oConsulta.n !== null && oConsulta.n !== iConjunto ){
    aAvisos.push( `El panel mostraba ${ oConsulta.n }; ahora son ${ iConjunto } porque cambió desde el clic.` );
  }

  if( iVisibles < iConjunto ){
    const iOcultos = iConjunto - iVisibles;
    aAvisos.push( `Se muestran ${ iVisibles } de ${ iConjunto }: ${ iOcultos } ${ iOcultos === 1 ? 'es de una sucursal' : 'son de sucursales' } que no puedes ver desde aquí.` );
  }

  return aAvisos;

}

function fn_singular( sPlural: string ): string {
  const mapa: any = { notas: 'nota', pagos: 'pago', productos: 'producto' };
  return mapa[ sPlural ] || sPlural;
}
