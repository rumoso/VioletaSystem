import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { Constante, ConstantesService } from 'src/app/protected/services/constantes.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ConstanteComponent } from '../mdl/constante/constante.component';

// Catálogo de constantes del sistema (analisis/040-catalogo-de-constantes.md).
//
// Mismas funciones que en AgroEnvases, con el diseño de Violeta (el del
// catálogo de sucursales). Crear, editar, activar/desactivar y eliminar
// exigen `config_ConstantesModificar`; el servidor lo vuelve a revisar,
// esto solo decide qué botones se ven.

const LS_VISTA = 'constantes_vista';

@Component({
  selector: 'app-constante-list',
  templateUrl: './constante-list.component.html',
  styleUrls: ['./constante-list.component.css']
})
export class ConstanteListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;

  constantes: Constante[] = [];
  sBusqueda: string = '';
  sVista: 'lista' | 'tarjetas' = 'lista';

  private timeBusqueda: Subject<string> = new Subject<string>();
  private subBusqueda?: Subscription;

  constructor(
    private authServ: AuthService
    , private constantesServ: ConstantesService
    , private servicesGServ: ServicesGService
    , private pageTitleServ: PageTitleService
  ) { }

  get bPuedeEditar(): boolean {
    return this.authServ.hasPermissionAction('config_ConstantesModificar');
  }

  ngOnInit(): void {

    this.authServ.checkSession();
    this.pageTitleServ.set('tune', 'Constantes', 'Catálogo de constantes configurables del sistema');

    try {
      const sVista = localStorage.getItem(LS_VISTA);
      if (sVista === 'lista' || sVista === 'tarjetas') {
        this.sVista = sVista;
      }
    } catch (e) { }

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

  fn_limpiar(): void {
    this.sBusqueda = '';
    this.fn_cargar();
  }

  fn_setVista( sVista: 'lista' | 'tarjetas' ): void {
    this.sVista = sVista;
    try { localStorage.setItem(LS_VISTA, sVista); } catch (e) { }
  }

  fn_cargar(): void {

    this.bShowSpinner = true;

    this.constantesServ.CGetConstantesList( this.sBusqueda )
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.bShowSpinner = false;
          if( resp.status === 0 ){
            this.constantes = resp.data.rows || [];
          }else{
            this.constantes = [];
            this.servicesGServ.showSnakbar( resp.message );
          }
        },
        error: ( ex: HttpErrorResponse ) => this.fn_errorServicio( ex )
      });

  }

  // Valores 2 a 4 que tienen algo, para mostrarlos debajo del valor.
  fn_extras( c: Constante ): string[] {
    return [ c.sValue2, c.sValue3, c.sValue4 ].filter( ( v ): v is string => !!v );
  }

  fn_abrir( c: Constante | null = null ): void {

    this.servicesGServ.showModalWithParams( ConstanteComponent, { constante: c }, '560px' )
      .afterClosed().subscribe({
        next: ( resp: any ) => {
          if( resp?.bGuardado ){
            this.fn_cargar();
          }
        }
      });

  }

  fn_cambiarEstatus( c: Constante ): void {

    const active = Number(c.active) === 1 ? 0 : 1;

    this.bShowSpinner = true;

    this.constantesServ.CSetConstanteActiva( c.idConstante, active )
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.bShowSpinner = false;
          if( resp.status === 0 ){
            this.servicesGServ.showSnakbar( resp.message );
            this.fn_cargar();
          }else{
            this.servicesGServ.showAlert( 'W', 'Constantes', resp.message, false );
          }
        },
        error: ( ex: HttpErrorResponse ) => this.fn_errorServicio( ex )
      });

  }

  fn_eliminar( c: Constante ): void {

    this.servicesGServ.showDialog(
      'Eliminar constante',
      `Se eliminará ${ c.sKey }. Si el sistema la usa, volverá a su valor por default.`,
      '¿Desea continuar?',
      'Sí, eliminar',
      'No'
    ).afterClosed().subscribe({
      next: ( bSi: any ) => {
        if( !bSi ){
          return;
        }

        this.bShowSpinner = true;

        this.constantesServ.CDeleteConstante( c.idConstante )
          .subscribe({
            next: ( resp: ResponseGet ) => {
              this.bShowSpinner = false;
              if( resp.status === 0 ){
                this.servicesGServ.showSnakbar( resp.message );
                this.fn_cargar();
              }else{
                this.servicesGServ.showAlert( 'W', 'Constantes', resp.message, false );
              }
            },
            error: ( ex: HttpErrorResponse ) => this.fn_errorServicio( ex )
          });
      }
    });

  }

  private fn_errorServicio( ex: HttpErrorResponse ): void {
    this.bShowSpinner = false;
    this.servicesGServ.showSnakbar( ex.status === 401
      ? ( ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.' )
      : 'Problemas con el servicio' );
  }

}
