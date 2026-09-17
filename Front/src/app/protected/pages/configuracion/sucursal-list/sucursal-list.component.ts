import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { SucursalComponent } from '../mdl/sucursal/sucursal.component';

// Catálogo de sucursales (analisis/021-catalogo-sucursales.md).
//
// Lista con el horario resumido de cada sucursal (el que heredan los
// empleados sin horario propio), cuántos empleados tiene y su estatus.
// Alta, edición y activación exigen `sucursales_CrearModificar`; el
// servidor lo vuelve a revisar, esto solo decide qué botones se ven.

const DIAS_CORTOS = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

@Component({
  selector: 'app-sucursal-list',
  templateUrl: './sucursal-list.component.html',
  styleUrls: ['./sucursal-list.component.css']
})
export class SucursalListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;

  sucursales: any[] = [];
  sBusqueda: string = '';
  bIncluirInactivas: boolean = false;

  // La sucursal de esta terminal: no se puede desactivar desde aquí.
  readonly idSucursalTerminal: number = environment.idSucursal;

  private timeBusqueda: Subject<string> = new Subject<string>();
  private subBusqueda?: Subscription;

  constructor(
    private authServ: AuthService
    , private sucursalesServ: SucursalesService
    , private servicesGServ: ServicesGService
    , private pageTitleServ: PageTitleService
  ) { }

  get bPuedeEditar(): boolean {
    return this.authServ.hasPermissionAction('sucursales_CrearModificar');
  }

  ngOnInit(): void {

    this.authServ.checkSession();
    this.pageTitleServ.set('store', 'Sucursales', 'Datos y horario de cada sucursal');

    this.subBusqueda = this.timeBusqueda
      .pipe( debounceTime(400) )
      .subscribe(() => this.fn_cargar());

    this.fn_cargar();

  }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
    this.subBusqueda?.unsubscribe();
  }

  ev_fn_busqueda(): void {
    this.timeBusqueda.next( this.sBusqueda );
  }

  fn_cargar(): void {

    this.bShowSpinner = true;

    this.sucursalesServ.CGetSucursalesList( this.sBusqueda, this.bIncluirInactivas )
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.bShowSpinner = false;
          if( resp.status === 0 ){
            this.sucursales = resp.data.rows || [];
          }else{
            this.sucursales = [];
            this.servicesGServ.showSnakbar( resp.message );
          }
        },
        error: ( ex: HttpErrorResponse ) => {
          this.bShowSpinner = false;
          this.sucursales = [];
          this.servicesGServ.showSnakbar( ex.status === 401
            ? ( ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.' )
            : 'Problemas con el servicio' );
        }
      });

  }

  // "Lun a Vie 09:00–18:00 · Sáb 10:00–14:00". Junta los días seguidos
  // que tienen las mismas horas. Los días que no aparecen son descanso.
  fn_resumenHorario( horario: any[] ): string {

    if( !horario || horario.length === 0 ){
      return '';
    }

    const aDias = [ ...horario ]
      .map( ( h ) => ({ dia: Number(h.diaSemana), horas: `${ String(h.horaEntrada).substring(0, 5) }–${ String(h.horaSalida).substring(0, 5) }` }) )
      .sort( ( a, b ) => a.dia - b.dia );

    const aGrupos: Array<{ desde: number; hasta: number; horas: string }> = [];

    for( const d of aDias ){
      const ultimo = aGrupos[ aGrupos.length - 1 ];
      if( ultimo && ultimo.horas === d.horas && ultimo.hasta === d.dia - 1 ){
        ultimo.hasta = d.dia;
      }else{
        aGrupos.push({ desde: d.dia, hasta: d.dia, horas: d.horas });
      }
    }

    return aGrupos
      .map( ( g ) => {
        const sDias = g.desde === g.hasta
          ? DIAS_CORTOS[ g.desde ]
          : g.hasta === g.desde + 1
            ? `${ DIAS_CORTOS[ g.desde ]} y ${ DIAS_CORTOS[ g.hasta ] }`
            : `${ DIAS_CORTOS[ g.desde ] } a ${ DIAS_CORTOS[ g.hasta ] }`;
        return `${ sDias } ${ g.horas }`;
      })
      .join(' · ');

  }

  fn_abrir( idSucursal: number = 0 ): void {

    this.servicesGServ.showModalWithParams( SucursalComponent, { idSucursal }, '680px' )
      .afterClosed().subscribe({
        next: ( resp: any ) => {
          if( resp?.bGuardado ){
            this.fn_cargar();
          }
        }
      });

  }

  // Desactivar pide confirmación con lo que queda afectado. Activar no.
  fn_cambiarEstatus( s: any ): void {

    if( Number(s.active) === 1 ){

      const aAfecta: string[] = [];
      if( s.empleados > 0 ){ aAfecta.push( `${ s.empleados } ${ s.empleados === 1 ? 'empleado asignado' : 'empleados asignados' }` ); }
      if( s.usuariosConAcceso > 0 ){ aAfecta.push( `${ s.usuariosConAcceso } ${ s.usuariosConAcceso === 1 ? 'usuario con acceso' : 'usuarios con acceso' }` ); }

      const sMensaje = aAfecta.length > 0
        ? `"${ s.name }" tiene ${ aAfecta.join(' y ') }. Dejará de aparecer para elegirla, pero no se borra nada.`
        : `"${ s.name }" dejará de aparecer para elegirla, pero no se borra nada.`;

      this.servicesGServ.showDialog( 'Desactivar sucursal', sMensaje, '¿Desea continuar?', 'Sí, desactivar', 'No' )
        .afterClosed().subscribe({
          next: ( bSi: any ) => {
            if( bSi ){
              this.fn_setActiva( s, 0 );
            }
          }
        });

    }else{
      this.fn_setActiva( s, 1 );
    }

  }

  private fn_setActiva( s: any, active: number ): void {

    this.bShowSpinner = true;

    this.sucursalesServ.CSetSucursalActiva( s.idSucursal, active, this.idSucursalTerminal )
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.bShowSpinner = false;
          if( resp.status === 0 ){
            this.servicesGServ.showSnakbar( resp.message );
            this.fn_cargar();
          }else{
            this.servicesGServ.showAlert( 'W', 'Sucursales', resp.message, false );
          }
        },
        error: ( ex: HttpErrorResponse ) => {
          this.bShowSpinner = false;
          this.servicesGServ.showSnakbar( ex.status === 401
            ? ( ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.' )
            : 'Problemas con el servicio' );
        }
      });

  }

}
