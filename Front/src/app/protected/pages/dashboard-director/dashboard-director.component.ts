import { Component, OnDestroy } from '@angular/core';
import { LocationStrategy } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { DashboardService } from 'src/app/protected/services/dashboard.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { fn_redondear } from '../../utils/numero.util';

// Panel del director (analisis/014): la situación del negocio en una
// pantalla, sin capturar filtros.
//
// Vive en su propia pantalla y no en el dashboard de inicio, para que
// el acceso lo controle el permiso de menú (se le da al CEO y al Admin)
// en vez de aparecerle a todo el que entra al sistema.

// Estado de un bloque del panel. Cada uno vive por su cuenta: es lo que
// permite que un bloque lento o caído no tumbe a los otros cuatro.
interface BloqueEstado {
  bCargando: boolean;
  bError: boolean;
  data: any;
}

@Component({
  selector: 'app-dashboard-director',
  templateUrl: './dashboard-director.component.html',
  styleUrls: ['./dashboard-director.component.css']
})
export class DashboardDirectorComponent implements OnDestroy {

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

  // Fecha del corte. Se puede mover con el selector — es también la
  // precondición de la demo, porque el respaldo local solo tiene datos
  // densos hasta enero 2025.
  fechaCorte: string = '';

  cartera: BloqueEstado = this.fn_bloqueVacio();
  carteraTop: BloqueEstado = this.fn_bloqueVacio();
  inventario: BloqueEstado = this.fn_bloqueVacio();
  dia: BloqueEstado = this.fn_bloqueVacio();
  vendedores: BloqueEstado = this.fn_bloqueVacio();
  mes: BloqueEstado = this.fn_bloqueVacio();
  operacion: BloqueEstado = this.fn_bloqueVacio();

  // Sello de frescura. El panel se refresca solo cada 60 s y lo dice,
  // para que nadie tome una decisión con un número de hace media hora
  // creyendo que es de ahorita.
  ultimaActualizacion: Date | null = null;
  sDesdeActualizacion: string = '';

  private _idRefresco: any = null;
  private _idReloj: any = null;

  constructor(
    private servicesGServ: ServicesGService
    , private authServ: AuthService
    , private dashboardServ: DashboardService
    , private pageTitleServ: PageTitleService
    , private router: Router
    , private locationStrategy: LocationStrategy
  ) { }

  ngOnInit(): void {

    this.authServ.checkSession();
    this.idUserLogON = this.authServ.getIdUserSession();

    this.pageTitleServ.set('dashboard', 'Panel del director', 'La situación del negocio en una pantalla');

    this.fechaCorte = this.fn_hoy();

    this.fn_cargarTodo();

    // Refresco automático. 60 s es suficiente para que el panel se
    // sienta vivo sin castigar la BD: el negocio no cambia de minuto a
    // minuto.
    this._idRefresco = setInterval(() => {
      // No se refresca con la pestaña oculta: sería gastar consultas
      // para nadie, y al volver se recarga de todos modos.
      if( !document.hidden ){
        this.fn_cargarTodo();
      }
    }, 60000);

    // Reloj del "actualizado hace X". Va aparte del refresco porque el
    // texto tiene que avanzar cada segundo aunque los datos solo se
    // pidan cada minuto.
    this._idReloj = setInterval(() => this.fn_actualizarSello(), 1000);

  }

  // Sin esto el panel sigue consultando en segundo plano después de
  // salir de la pantalla, una vez por minuto, para siempre.
  ngOnDestroy(): void {

    this.pageTitleServ.clear();

    if( this._idRefresco ){
      clearInterval( this._idRefresco );
      this._idRefresco = null;
    }
    if( this._idReloj ){
      clearInterval( this._idReloj );
      this._idReloj = null;
    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // CARGA DE BLOQUES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  private fn_bloqueVacio(): BloqueEstado {
    return { bCargando: true, bError: false, data: null };
  }

  private fn_hoy(): string {
    const d = new Date();
    return `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;
  }

  // Carga un bloque aislando su error: si este truena, los demás ni se
  // enteran.
  private fn_cargarBloque( bloque: BloqueEstado, obs: any ): void {

    bloque.bCargando = true;
    bloque.bError = false;

    obs.subscribe({
      next: ( resp: any ) => {
        bloque.bCargando = false;
        if( resp && resp.status === 0 ){
          bloque.data = resp.data;
        }else{
          bloque.bError = true;
        }
      },
      error: () => {
        bloque.bCargando = false;
        bloque.bError = true;
      }
    });

  }

  fn_cargarTodo(): void {

    const f = this.fechaCorte;

    this.fn_cargarBloque( this.cartera, this.dashboardServ.CGetCartera(f) );
    this.fn_cargarBloque( this.carteraTop, this.dashboardServ.CGetCarteraTop(f) );
    this.fn_cargarBloque( this.inventario, this.dashboardServ.CGetInventario(f) );
    this.fn_cargarBloque( this.dia, this.dashboardServ.CGetResumenDia(f) );
    this.fn_cargarBloque( this.vendedores, this.dashboardServ.CGetResumenPorVendedor(f) );
    this.fn_cargarBloque( this.mes, this.dashboardServ.CGetResumenMes(f) );
    this.fn_cargarBloque( this.operacion, this.dashboardServ.CGetOperacion(f) );

    this.ultimaActualizacion = new Date();
    this.fn_actualizarSello();

  }

  // Reintento de un solo bloque, sin tocar los demás.
  fn_reintentar( sBloque: string ): void {

    const f = this.fechaCorte;

    switch( sBloque ){
      case 'cartera': this.fn_cargarBloque( this.cartera, this.dashboardServ.CGetCartera(f) ); break;
      case 'carteraTop': this.fn_cargarBloque( this.carteraTop, this.dashboardServ.CGetCarteraTop(f) ); break;
      case 'inventario': this.fn_cargarBloque( this.inventario, this.dashboardServ.CGetInventario(f) ); break;
      case 'dia': this.fn_cargarBloque( this.dia, this.dashboardServ.CGetResumenDia(f) ); break;
      case 'vendedores': this.fn_cargarBloque( this.vendedores, this.dashboardServ.CGetResumenPorVendedor(f) ); break;
      case 'mes': this.fn_cargarBloque( this.mes, this.dashboardServ.CGetResumenMes(f) ); break;
      case 'operacion': this.fn_cargarBloque( this.operacion, this.dashboardServ.CGetOperacion(f) ); break;
    }

  }

  ev_fn_cambiarFecha(): void {
    if( this.fechaCorte ){
      this.fn_cargarTodo();
    }
  }

  private fn_actualizarSello(): void {

    if( !this.ultimaActualizacion ){
      this.sDesdeActualizacion = '';
      return;
    }

    const iSeg = Math.floor( ( Date.now() - this.ultimaActualizacion.getTime() ) / 1000 );

    if( iSeg < 60 ){
      this.sDesdeActualizacion = `hace ${ iSeg } s`;
    }else{
      const iMin = Math.floor( iSeg / 60 );
      this.sDesdeActualizacion = `hace ${ iMin } min`;
    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // HELPERS DE PRESENTACIÓN
  //////////////////////////////////////////////////////////////////////////////////////////////////

  // Ancho de barra relativo al mayor de una lista. Se calcula aquí y no
  // en el template para no meter aritmética en el HTML.
  fn_ancho( valor: any, valores: any[] ): number {

    const max = Math.max( ...(valores || []).map( (v: any) => Math.abs(Number(v) || 0) ), 0 );

    if( max <= 0 ){
      return 0;
    }

    return fn_redondear( Math.abs(Number(valor) || 0) / max * 100, 1 );

  }

  fn_anchoAntiguedad( saldo: any ): number {
    const d = this.cartera.data;
    return this.fn_ancho( saldo, d ? d.antiguedad.map( (c: any) => c.saldo ) : [] );
  }

  fn_anchoFormaPago( monto: any ): number {
    const d = this.dia.data;
    return this.fn_ancho( monto, d ? d.formasPago.map( (f: any) => f.monto ) : [] );
  }

  fn_anchoDiaria( vendido: any ): number {
    const d = this.mes.data;
    return this.fn_ancho( vendido, d ? d.diaria.map( (x: any) => x.vendido ) : [] );
  }

  // Color de una variación. El cero es su propio caso: "igual que la
  // semana pasada" no es ni bueno ni malo.
  fn_claseVariacion( v: any ): string {
    if( v === null || v === undefined ){
      return 'dbp-var--neutro';
    }
    const n = Number(v);
    if( n > 0 ) return 'dbp-var--sube';
    if( n < 0 ) return 'dbp-var--baja';
    return 'dbp-var--neutro';
  }

  fn_variacionDesc( v: any ): string {
    if( v === null || v === undefined ){
      return 'sin base para comparar';
    }
    const n = fn_redondear( v, 1 );
    return `${ n > 0 ? '+' : '' }${ n }%`;
  }

  fn_puntosDesc( v: any ): string {
    const n = fn_redondear( v, 1 );
    return `${ n > 0 ? '+' : '' }${ n } pp`;
  }

  // Día de la semana + día del mes para el eje de la gráfica.
  fn_diaCorto( sFecha: any ): string {

    if( !sFecha ){
      return '';
    }

    const d = new Date( `${ String(sFecha).substring(0, 10) }T12:00:00` );
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

    return `${ dias[ d.getDay() ] } ${ d.getDate() }`;

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // NAVEGACIÓN
  //////////////////////////////////////////////////////////////////////////////////////////////////

  private changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  // Cada cifra clicable lleva a la pantalla que muestra EXACTAMENTE sus
  // registros (analisis/015). Viajan en la URL: la clave de la cifra, la
  // fecha de corte con la que se calculó y la cifra que el usuario estaba
  // viendo (`n`), para que la pantalla destino avise si cambió entre el
  // clic y la carga.
  //
  // La fecha es la que devolvió el bloque (`data.fecha`), no la del
  // selector: si el usuario acaba de mover el selector y el bloque todavía
  // no se recarga, el clic tiene que llevar a lo que está viendo.
  //
  // Una cifra en cero no navega: no hay nada que mostrar, y llegar a un
  // listado vacío se leería como "falló".
  //
  // Se abre en OTRA pestaña: el panel se queda donde estaba (con su
  // fecha y su refresco) y el usuario puede revisar varias cifras sin
  // perderlo. La sesión vive en localStorage, que comparten las pestañas
  // del mismo sistema, así que la pestaña nueva ya entra con sesión.
  //
  // La URL se arma con el Router y la LocationStrategy, no pegando texto:
  // el sistema usa rutas con "#" (useHash) y así sale bien aunque eso
  // cambie algún día.
  private fn_irConjunto( sRuta: string, sPanel: string, sFecha: string, n: any, extra: any = {} ): void {

    if( !( Number( n ) > 0 ) ){
      return;
    }

    const queryParams: any = {
      panel: sPanel,
      fecha: sFecha,
      n: Number( n )
    };

    Object.keys( extra || {} ).forEach( ( clave ) => {
      const valor = extra[ clave ];
      if( valor !== null && valor !== undefined && valor !== '' ){
        queryParams[ clave ] = valor;
      }
    });

    const sRutaInterna = this.router.serializeUrl(
      this.router.createUrlTree( [ `/${ this._appMain }/${ sRuta }` ], { queryParams } )
    );

    const sUrl = `${ window.location.origin }${ window.location.pathname }${ this.locationStrategy.prepareExternalUrl( sRutaInterna ) }`;

    window.open( sUrl, '_blank' );

  }

  fn_irVentas( sPanel: string, sFecha: string, n: any, extra: any = {} ): void {
    this.fn_irConjunto( 'saleList', sPanel, sFecha, n, extra );
  }

  fn_irPagos( sPanel: string, sFecha: string, n: any ): void {
    this.fn_irConjunto( 'rep_pagos', sPanel, sFecha, n );
  }

  fn_irProductos( sPanel: string, sFecha: string, n: any ): void {
    this.fn_irConjunto( 'productList', sPanel, sFecha, n );
  }

  // Clave de cubeta del Back ('0-30', '+90'...) -> clave de su conjunto.
  fn_claveCubetaCartera( sClave: string ): string {
    const mapa: any = { '0-30': 'cartera-0-30', '31-60': 'cartera-31-60', '61-90': 'cartera-61-90', '+90': 'cartera-90' };
    return mapa[ sClave ] || '';
  }

  // Las cubetas de inventario llegan en orden fijo: nunca, 12+, 6 a 12.
  fn_claveCubetaInventario( i: number ): string {
    return [ 'inv-nunca', 'inv-12', 'inv-6' ][ i ] || '';
  }

  // (El bloque de taller no tiene clic: hay dos flujos de taller
  // conviviendo y falta decidir cuál le interesa al director —
  // analisis/015.)

}
