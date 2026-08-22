import { Component, OnDestroy } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { DashboardService } from 'src/app/protected/services/dashboard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { fn_redondear } from '../../utils/numero.util';

// Estado de un bloque del panel. Cada uno vive por su cuenta: es lo que
// permite que un bloque lento o caído no tumbe a los otros cuatro.
interface BloqueEstado {
  bCargando: boolean;
  bError: boolean;
  data: any;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnDestroy {

  private _appMain: string = environment.appMain;

  // Lanzador de menús: se conserva tal cual estaba. Es el único acceso
  // a los módulos, así que el panel se agrega ARRIBA de él, nunca en su
  // lugar.
  _menuList: any = [];
  idUserLogON: number = 0;

  // Permiso para ver el panel con datos. Sin él la pantalla queda
  // exactamente como era: solo el lanzador.
  bVerPanel: boolean = false;

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
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = this.authServ.getIdUserSession();

    this.bVerPanel = this.authServ.hasPermissionAction('dashboard_VerPanel');

    this.fechaCorte = this.fn_hoy();

    this.getMenuByPermissions( this.idUserLogON );

    if( this.bVerPanel ){

      this.fn_cargarTodo();

      // Refresco automático. 60 s es suficiente para que el panel se
      // sienta vivo sin castigar la BD: el negocio no cambia de minuto
      // a minuto.
      this._idRefresco = setInterval(() => {
        // No se refresca con la pestaña oculta: sería gastar consultas
        // para nadie, y al volver se recarga de todos modos.
        if( !document.hidden ){
          this.fn_cargarTodo();
        }
      }, 60000);

      // Reloj del "actualizado hace X". Va aparte del refresco porque
      // el texto tiene que avanzar cada segundo aunque los datos solo
      // se pidan cada minuto.
      this._idReloj = setInterval(() => this.fn_actualizarSello(), 1000);

    }

  }

  // Sin esto el panel sigue consultando en segundo plano después de
  // salir de la pantalla, una vez por minuto, para siempre.
  ngOnDestroy(): void {
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

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  // Un listado que no se puede accionar no sirve: de la cartera se va a
  // la consulta de ventas, y del inventario al catálogo de productos.
  fn_irAVentas(): void {
    this.changeRoute( 'saleList' );
  }

  fn_irAProductos(): void {
    this.changeRoute( 'productList' );
  }

  fn_irATaller(): void {
    this.changeRoute( 'tallerList' );
  }

  getMenuByPermissions(idUser: any){

    this.authServ.getMenuByPermissions( idUser )
    .subscribe( data =>{
      if(data.status == 0){
        this._menuList = data.data;
      }
    })

  }

}
