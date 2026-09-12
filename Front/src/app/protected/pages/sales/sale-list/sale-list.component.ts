import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { NsaleComponent } from '../mdl/nsale/nsale.component';
import { CajasService } from 'src/app/protected/services/cajas.service';
import { SelectCajaComponent } from '../mdl/select-caja/select-caja.component';
import { CorteCajaComponent } from '../mdl/corte-caja/corte-caja.component';
import { EgresosComponent } from '../mdl/egresos/egresos.component';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { SelectPrintComponent } from '../mdl/select-print/select-print.component';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { SalestypeService } from 'src/app/protected/services/salestype.service';
import { EditTallerComponent } from '../mdl/edit-taller/edit-taller.component';
import { IngresosComponent } from '../mdl/ingresos/ingresos.component';
import { QuestionCancelSalePaymentsComponent } from '../mdl/question-cancel-sale-payments/question-cancel-sale-payments.component';
import { ActivatedRoute, Router } from '@angular/router';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import {
  fn_precargarDesdeQueryParams,
  fn_limpiarQueryParamsURL,
  ConsultaPanel,
  fn_leerConsultaPanel,
  fn_etiquetasConsultaPanel,
  fn_avisosConsultaPanel
} from 'src/app/protected/utils/query-filtros.util';
import { DashboardService } from 'src/app/protected/services/dashboard.service';

@Component({
  selector: 'app-sale-list',
  templateUrl: './sale-list.component.html',
  styleUrls: ['./sale-list.component.css']
})
export class SaleListComponent implements OnInit, OnDestroy {
//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;

  title: string = 'Ventas';
  bShowSpinner: boolean = false;

  panelOpenState: boolean = false;

  idUserLogON: number = 0;
  _actionsPermisionList: any;

  saleslist: any[] = [];

  //-------------------------------
  // VARIABLES PARA LA PAGINACIÓN
  iRows: number = 0;
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }
  //-------------------------------

  parametersForm: any = {
    idSucursal: 0,
    sucursalDesc: '',

    createDateStart: '',
    createDateEnd: '',

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    idSaleType: 0,
    saleTypeDesc: '',

    idSale: '',

    bCancel: false,
    bPending: false,
    bPagada: false

  };

  // Copia congelada de los defaults de arriba, para poder RESETEAR el
  // formulario cuando se quita un filtro que llegó por query param (ver
  // fn_quitarFiltro). JSON.parse/stringify porque parametersForm es un
  // objeto plano de literales — no hay nada dentro que un clonado
  // superficial no resuelva bien, pero así queda a prueba de que
  // alguien le agregue un campo anidado después.
  private readonly _parametersFormDefault: any = JSON.parse( JSON.stringify( this.parametersForm ) );

  // ── Modo panel (analisis/015) ──
  // Se llega desde un clic en una cifra del panel del director: la
  // pantalla muestra EXACTAMENTE las notas que el panel contó, con los
  // filtros deshabilitados. La consulta vive en la URL (panel, fecha, n).
  oConsultaPanel: ConsultaPanel | null = null;
  oMetaPanel: any = null;
  sErrorPanel: string = '';

  private subQueryParams?: Subscription;

  get bModoPanel(): boolean {
    return this.oConsultaPanel !== null;
  }

  // Fecha del corte de la consulta del panel, como la lee el usuario.
  // Pagado y pendiente de la cartera están calculados a esa fecha.
  get sFechaCortePanel(): string {
    const sFecha = String( this.oMetaPanel?.sumario?.fechaCorte || '' );
    const [a, m, d] = sFecha.split('-');
    return ( a && m && d ) ? `${ d }-${ m }-${ a }` : '';
  }

  get bSaldoAlCorte(): boolean {
    return this.bModoPanel && !!this.oMetaPanel?.sumario?.bAlCorte;
  }

  get sTituloFiltro(): string {
    return this.bModoPanel ? 'Consulta del panel del director:' : 'Filtro activo:';
  }

  get aAvisosFiltro(): string[] {
    if( !this.bModoPanel ){
      return [];
    }
    if( this.sErrorPanel ){
      return [ this.sErrorPanel ];
    }
    return fn_avisosConsultaPanel( this.oMetaPanel, this.oConsultaPanel );
  }

  // Etiquetas del aviso de "filtro activo" (analisis/015). Se calculan
  // sobre lo que YA quedó en parametersForm después de precargar los
  // query params — no sobre los query params crudos — así que también
  // sirven si el usuario edita los filtros a mano en pantalla.
  get aEtiquetasFiltro(): string[] {

    if( this.bModoPanel ){
      return this.sErrorPanel ? [ 'No se pudo cargar' ] : fn_etiquetasConsultaPanel( this.oMetaPanel, 'notas' );
    }

    const f = this.parametersForm;
    const etiquetas: string[] = [];

    if( f.bPending )  etiquetas.push( 'Solo notas con saldo' );
    if( f.bPagada )   etiquetas.push( 'Solo notas pagadas' );
    if( f.bCancel )   etiquetas.push( 'Solo canceladas' );

    if( f.idSaleType > 0 )  etiquetas.push( f.saleTypeDesc || `Tipo #${ f.idSaleType }` );
    if( f.idCustomer > 0 )  etiquetas.push( f.customerDesc || `Cliente #${ f.idCustomer }` );

    if( f.createDateStart && f.createDateEnd ){
      etiquetas.push( `Del ${ f.createDateStart } al ${ f.createDateEnd }` );
    }else if( f.createDateStart ){
      etiquetas.push( `Desde el ${ f.createDateStart }` );
    }else if( f.createDateEnd ){
      etiquetas.push( `Hasta el ${ f.createDateEnd }` );
    }

    if( f.idSale ) etiquetas.push( `Folio ${ f.idSale }` );

    return etiquetas;

  }

  selectCajas: any = {
    idSucursal: 0,
    idCaja: 0,
    cajaDesc: '',
    idPrinter: 0
  }

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }



//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

constructor(
  private servicesGServ: ServicesGService

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private authServ: AuthService
  , private customersServ: CustomersService
  , private salesServ: SalesService
  , private cajasServ: CajasService
  , private printersServ: PrintersService
  , private printTicketServ: PrintTicketService
  , private salesTypeServ: SalestypeService
  , private router: Router
  , private activatedRoute: ActivatedRoute
  , private pageTitleServ: PageTitleService
  , private dashboardServ: DashboardService

  ) { }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
    this.subQueryParams?.unsubscribe();
  }

  async ngOnInit() {

    this.authServ.checkSession();
    this.pageTitleServ.set('point_of_sale', 'Ventas', 'Órdenes de venta, pagos y facturación');
    this.idUserLogON = await this.authServ.getIdUserSession();
    // this._actionsPermisionList = await this.authServ.CGetActionsPermissionPromise(this.idUserLogON);
    // console.log(this._actionsPermisionList)


    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.timeCBXskeyup
    .pipe(
      debounceTime(500)
    )
    .subscribe( value => {
      if(value.iOption == 1){
        this.cbxCustomers_Search();
      }
    })


    // setTimeout (() => {
    //   this.cbxCustomerCBX.nativeElement.focus();
    // }, 1000);

    // La URL manda. Se escucha el cambio de query params, no solo la foto
    // inicial: Angular reutiliza este componente al navegar a la misma
    // ruta con otros parámetros (salir del modo panel, o volver a él con
    // el botón de atrás), y ngOnInit no vuelve a correr.
    //
    // La primera emisión llega de inmediato y hace la carga inicial, ya
    // con el filtro puesto — si se consultara antes, el usuario vería el
    // listado completo un instante y luego "saltaría" al filtrado.
    this.subQueryParams = this.activatedRoute.queryParams
    .subscribe( ( queryParams ) => this.fn_aplicarQueryParams( queryParams ) );

    this.fn_getSelectCajaByIdUser( this.idUserLogON );
    this.fn_getSelectPrintByIdUser( this.idUserLogON );

  }

  // Reinicia la pantalla según lo que diga la URL: modo panel si trae
  // `panel`, o la consulta normal con los filtros que traiga.
  private fn_aplicarQueryParams( queryParams: any ): void {

    this.oConsultaPanel = fn_leerConsultaPanel( queryParams );
    this.oMetaPanel = null;
    this.sErrorPanel = '';

    Object.assign( this.parametersForm, JSON.parse( JSON.stringify( this._parametersFormDefault ) ) );

    // En modo panel no se precarga ningún filtro: el conjunto no se
    // arma con filtros.
    if( !this.oConsultaPanel ){
      fn_precargarDesdeQueryParams( queryParams, this.parametersForm );
    }

    this.pagination.pageIndex = 0;
    this.fn_getVentasListWithPage();

  }

  // La "×" de la leyenda: quita el filtro o sale del modo panel.
  //
  // Si el filtro vino en la URL, basta con limpiarla: la suscripción a
  // los query params reinicia el formulario y consulta. Si el usuario lo
  // puso a mano (la URL está limpia), navegar a la misma URL no emite
  // nada, así que se reinicia aquí.
  fn_quitarFiltro(): void {

    if( Object.keys( this.activatedRoute.snapshot.queryParams || {} ).length > 0 ){
      fn_limpiarQueryParamsURL( this.router, this.activatedRoute );
      return;
    }

    Object.assign( this.parametersForm, JSON.parse( JSON.stringify( this._parametersFormDefault ) ) );

    this.pagination.pageIndex = 0;
    this.fn_getVentasListWithPage();

  }

  fn_ShowEditTaller( idSale: any ){

      let OParams: any = {
        idSale: idSale
      }

        this.servicesGServ.showModalWithParams( EditTallerComponent, OParams, '1500px')
        .afterClosed().subscribe({
          next: ( resp ) =>{
            this.fn_getVentasListWithPage();
          }
      });

  }

  ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getVentasListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getVentasListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    hasPermissionAction( action: string ): boolean{
      return this.authServ.hasPermissionAction(action);
    }

    ev_fn_search_keyup_enter(event: any){
      if(event.keyCode == 13) { // PRESS ENTER

        this.fn_getVentasListWithPage()

      }
    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_getVentasListWithPage() {

  // En modo panel toda recarga (paginar, cancelar una nota, entregar un
  // apartado) vuelve a pedir el conjunto, nunca la lista normal.
  if( this.bModoPanel ){
    this.fn_getVentasConjunto();
    return;
  }

  let OServParams: any = {
    createDateStart: this.parametersForm.createDateStart
    , createDateEnd: this.parametersForm.createDateEnd
    , idCustomer: this.parametersForm.idCustomer
    , idSaleType: this.parametersForm.idSaleType
    , search: this.parametersForm.idSale

    , bCancel: this.parametersForm.bCancel
    , bPending: this.parametersForm.bPending
    , bPagada: this.parametersForm.bPagada
  }

  this.bShowSpinner = true;
  this.salesServ.CGetVentasListWithPage( this.pagination, OServParams )
  .subscribe({
    next: (resp: ResponseGet) => {
      this.saleslist = resp.data.rows;
      this.pagination.length = resp.data.count;
      this.bShowSpinner = false;
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar( ex.error.data );
      this.bShowSpinner = false;
    }
  })

}

// Las notas que el panel contó (analisis/015).
fn_getVentasConjunto() {

  if( !this.oConsultaPanel ){
    return;
  }

  this.bShowSpinner = true;
  this.dashboardServ.CGetVentasConjunto( this.oConsultaPanel, this.pagination )
  .subscribe({
    next: (resp: ResponseGet) => {

      if( resp.status === 0 ){
        this.sErrorPanel = '';
        this.oMetaPanel = resp.data.meta;
        this.saleslist = resp.data.rows;
        this.pagination.length = resp.data.count;
      }else{
        // Sin permiso, clave desconocida, fecha inválida: se dice en la
        // leyenda y no se muestra nada — nunca la lista completa.
        this.sErrorPanel = resp.message;
        this.oMetaPanel = null;
        this.saleslist = [];
        this.pagination.length = 0;
      }

      this.bShowSpinner = false;
    },
    error: (ex: HttpErrorResponse) => {
      this.sErrorPanel = 'No se pudo cargar la consulta del panel.';
      this.saleslist = [];
      this.pagination.length = 0;
      this.servicesGServ.showSnakbar( ex.error?.data || this.sErrorPanel );
      this.bShowSpinner = false;
    }
  })

}

fn_getSelectCajaByIdUser( idUser: number ) {

  this.cajasServ.CGetSelectCajaByIdUser( idUser )
  .subscribe({

    next: ( resp: ResponseGet ) => {

      if( resp.status == 0 ){

        this.selectCajas.idSucursal = resp.data.idSucursal;
        this.selectCajas.idCaja = resp.data.idCaja;
        this.selectCajas.cajaDesc = resp.data.name;
        this.selectCajas.idPrinter = resp.data.idPrinter;

        this.selectPrinter.idSucursal = resp.data.idSucursal;
        this.selectPrinter.idPrinter = resp.data.idPrinter;
        this.selectPrinter.printerName = resp.data.printerName;

      }
      else{

        this.selectCajas.idSucursal = 0;
        this.selectCajas.idCaja = 0;
        this.selectCajas.cajaDesc = '';
        this.selectCajas.idPrinter = 0;

      }

      console.log( resp );
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar( ex.error.data );
    }

  })

}

fn_getSelectPrintByIdUser( idUser: number ) {

  this.printersServ.CGetSelectPrinterByIdUser( idUser )
  .subscribe({

    next: ( resp: ResponseGet ) => {

      if( resp.status == 0 ){

        this.selectPrinter.idSucursal = resp.data.idSucursal;
        this.selectPrinter.idPrinter = resp.data.idPrinter;
        this.selectPrinter.printerName = resp.data.printerName;

      }
      else{

        this.selectPrinter.idSucursal = 0;
        this.selectPrinter.idPrinter = 0;
        this.selectPrinter.printerName = '';

      }

      console.log( resp );
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar( ex.error.data );
    }

  })

}

fn_cerrarCaja(){

  this.selectCajas.idUser = this.idUserLogON;

  this.cajasServ.CDeleteSelectCaja( this.selectCajas )
  .subscribe({
    next: async (resp: ResponseDB_CRUD) => {

      if( resp.status === 0 ){
        this.fn_getSelectCajaByIdUser( this.idUserLogON );
        this.fn_getSelectPrintByIdUser( this.idUserLogON );
      }

      this.servicesGServ.showAlertIA( resp );
      this.bShowSpinner = false;

    },
    error: (ex) => {

      this.servicesGServ.showSnakbar( ex.error.message );
      this.bShowSpinner = false;

    }
  });

}

fn_btnCerrarCaja(){

  if( this.selectCajas.idCaja > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de salir de la caja'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.fn_cerrarCaja();

        }

      }

    });

  }

}

fn_btnCerrarPrinter(){

  if( this.selectCajas.idCaja == 0 && this.selectPrinter.idPrinter > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de deseleccionar la impresora'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.selectPrinter.idUser = this.idUserLogON;

          this.printersServ.CDeleteSelectPrinter( this.selectPrinter )
          .subscribe({
            next: async (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.fn_getSelectCajaByIdUser( this.idUserLogON );
                this.fn_getSelectPrintByIdUser( this.idUserLogON );
              }

              this.servicesGServ.showAlertIA( resp );
              this.bShowSpinner = false;

            },
            error: (ex) => {

              this.servicesGServ.showSnakbar( ex.error.message );
              this.bShowSpinner = false;

            }
          });

        }

      }

    });

  }

}

fn_CDisabledSale( idSale: number, auth_idUser: number ){

  var oParams: any = {
    idSale: idSale,
    auth_idUser: auth_idUser
  }

  this.salesServ.CDisabledSale( oParams )
  .subscribe({
    next: async (resp: ResponseDB_CRUD) => {

      this.servicesGServ.showAlertIA( resp );
      this.bShowSpinner = false;

      this.fn_getVentasListWithPage();

    },
    error: (ex) => {

      this.servicesGServ.showSnakbar( ex.error.message );
      this.bShowSpinner = false;

    }
  });

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_ShowSale( idSale: number ){

  var paramsMDL: any = {
    idSale: idSale,
    selectCajas: this.selectCajas,
    selectPrinter: this.selectPrinter
  }

  this.servicesGServ.showModalWithParamsv2( NsaleComponent, paramsMDL, { width: '100vw', height: '100vh', maxWidth: '100vw', panelClass: 'full-screen-modal' })
  .afterClosed().subscribe({
    next: ( resp ) =>{

      this.fn_getVentasListWithPage();
    }
  });

}

fn_ShowSelectCaja(){

  var paramsMDL: any = {
    idUser: this.idUserLogON
  }

  this.servicesGServ.showModalWithParams( SelectCajaComponent, paramsMDL, '2000px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      this.fn_getSelectCajaByIdUser( this.idUserLogON );

    }
  });

}

fn_ShowSelectPrint(){

  var paramsMDL: any = {
    idUser: this.idUserLogON
  }

  this.servicesGServ.showModalWithParams( SelectPrintComponent, paramsMDL, '2000px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      this.fn_getSelectPrintByIdUser( this.idUserLogON );

    }
  });

}

fn_ShowCorteCajaSale(){

  var paramsMDL: any = {
    idCaja: this.selectCajas.idCaja
  }

  this.servicesGServ.showModalWithParams( CorteCajaComponent, paramsMDL, '800px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      if(resp > 0){
        this.printTicketServ.printTicket("CorteCaja", resp, this.selectPrinter.idPrinter, 1);
        this.fn_cerrarCaja();
      }

      this.fn_getVentasListWithPage();
    }
  });


}

fn_ShowEgresos(){

  var paramsMDL: any = {
    idCaja: this.selectCajas.idCaja
  }

  this.servicesGServ.showModalWithParams( EgresosComponent, paramsMDL, '2000px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      this.fn_getVentasListWithPage();
    }
  });

}

fn_ShowIngresos(){

  var paramsMDL: any = {
    idCaja: this.selectCajas.idCaja
  }

  this.servicesGServ.showModalWithParams( IngresosComponent, paramsMDL, '2000px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      this.fn_getVentasListWithPage();
    }
  });

}

bShowActionAuthorization: boolean = false;
fn_disabledSale( data: any ){

  if(this.bShowActionAuthorization){
    return;
  }

  this.bShowActionAuthorization = true;

  this.servicesGServ.showDialog('¿Estás seguro?'
  , 'Está apunto de cancelar la venta #' + data.idSale
  , '¿Desea continuar?'
  , 'Si', 'No' )
  .afterClosed().subscribe({
    next: ( resp ) =>{

      if(resp){

        this.bShowActionAuthorization = false;

        if( data.pagosYaEnCorte > 0 ){

          var paramsQuestionMDL: any = {
            pagosYaEnCorte: data.pagosYaEnCorte
          }

          this.servicesGServ.showModalWithParams( QuestionCancelSalePaymentsComponent, paramsQuestionMDL, '600px')
            .afterClosed().subscribe({
              next: ( sOption ) =>{

                if(sOption){

                  var paramsMDL: any = {
                    actionName: ( data.idSaleType == 5 ? 'ventas_CancelarTaller' : 'ventas_Cancelar' )
                    , bShowAlert: false
                  }

                  this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
                  .afterClosed().subscribe({
                    next: ( auth_idUser ) =>{

                      if( auth_idUser ){

                        this.bShowActionAuthorization = false;

                        this.bShowSpinner = true;

                        var oParams: any = {
                          sOption: sOption,
                          idSale: data.idSale,
                          auth_idUser: auth_idUser
                        }

                        this.salesServ.CDisabledSale( oParams )
                        .subscribe({
                          next: async (resp: ResponseDB_CRUD) => {

                            this.servicesGServ.showAlertIA( resp );
                            this.bShowSpinner = false;

                            this.fn_getVentasListWithPage();

                          },
                          error: (ex) => {

                            this.servicesGServ.showSnakbar( ex.error.message );
                            this.bShowSpinner = false;

                          }

                        });

                      }
                      else{
                        this.bShowActionAuthorization = false;
                      }

                    }
                  });

                }
              }
            });

        }else{

          var paramsMDL: any = {
            actionName: ( data.idSaleType == 5 ? 'ventas_CancelarTaller' : 'ventas_Cancelar' )
            , bShowAlert: false
          }

          this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
          .afterClosed().subscribe({
            next: ( auth_idUser ) =>{

              if( auth_idUser ){

                this.bShowActionAuthorization = false;

                this.bShowSpinner = true;

                var oParams: any = {
                  idSale: data.idSale,
                  auth_idUser: auth_idUser
                }

                this.salesServ.CDisabledSale( oParams )
                .subscribe({
                  next: async (resp: ResponseDB_CRUD) => {

                    this.servicesGServ.showAlertIA( resp );
                    this.bShowSpinner = false;

                    this.fn_getVentasListWithPage();

                  },
                  error: (ex) => {

                    this.servicesGServ.showSnakbar( ex.error.message );
                    this.bShowSpinner = false;

                  }

                });

              }
              else{
                this.bShowActionAuthorization = false;
              }

            }
          });

        }

      }else{
        this.bShowActionAuthorization = false;
      }
    }

  });

}

// Entregar un apartado (idSaleType=3): pide autorización especial
// por código/rostro cada vez, mismo patrón que cancelar una venta.
fn_entregarApartado( data: any ){

  if(this.bShowActionAuthorization){
    return;
  }

  this.bShowActionAuthorization = true;

  this.servicesGServ.showDialog('¿Estás seguro?'
  , 'Está a punto de marcar como entregado el apartado #' + data.idSale
  , '¿Desea continuar?'
  , 'Si', 'No' )
  .afterClosed().subscribe({
    next: ( resp ) =>{

      if(resp){

        var paramsMDL: any = {
          actionName: 'ventas_EntregarApartado'
          , bShowAlert: false
        }

        this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
        .afterClosed().subscribe({
          next: ( auth_idUser ) =>{

            this.bShowActionAuthorization = false;

            if( auth_idUser ){

              this.bShowSpinner = true;

              this.salesServ.CEntregarApartado( data.idSale, auth_idUser )
              .subscribe({
                next: async (resp2: ResponseDB_CRUD) => {

                  this.servicesGServ.showAlertIA( resp2 );
                  this.bShowSpinner = false;

                  this.fn_getVentasListWithPage();

                },
                error: (ex) => {

                  this.servicesGServ.showSnakbar( ex.error.message );
                  this.bShowSpinner = false;

                }
              });

            }

          }
        });

      }else{
        this.bShowActionAuthorization = false;
      }
    }

  });

}


fn_ClearFilters(){

  this.parametersForm = {
    idSucursal: 0,
    sucursalDesc: '',

    createDateStart: '',
    createDateEnd: '',

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    idSaleType: 0,
    saleTypeDesc: '',

    idSale: '',

    bCancel: false,
    bPending: false,
    bPagada: false

  };

}



//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////







//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxCustomers: any[] = [];

  CBXskeyup( iOption: number, txt: string ){

    let cbxKeyUp: any = {
      iOption: iOption,
      txt: txt
    }

    this.timeCBXskeyup.next( cbxKeyUp );
  }

  cbxCustomers_Search() {
      this.customersServ.CCbxGetCustomersCombo( this.parametersForm.customerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxCustomers = resp.data;
             this.parametersForm.customerResp = '';

           }
           else{
            this.cbxCustomers = [];
            this.parametersForm.customerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxCustomers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxCustomers_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.parametersForm.idCustomer =  ODataCbx.idCustomer;
      this.parametersForm.customerDesc = ODataCbx.name;

    }, 1);

  }

  cbxCustomers_Clear(){
    this.parametersForm.idCustomer = 0;
    this.parametersForm.customerDesc = '';
    this.parametersForm.customerResp = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSalesType: any[] = [];

  cbxSalesType_Search() {
      this.salesTypeServ.cbxGetSalesTypeComboSales( this.parametersForm.saleTypeDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSalesType = resp.data
           }
           else{
            this.cbxSalesType = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSalesType_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxSalesType_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.parametersForm.idSaleType = ODataCbx.id;
      this.parametersForm.saleTypeDesc = ODataCbx.name;

    }, 1);

  }

  cbxSalesType_Clear(){
    this.parametersForm.idSaleType = 0;
    this.parametersForm.saleTypeDesc = '';

  }
  //--------------------------------------------------------------------------


goToSaleList(){
  this.router.navigate(['/VioletaSistem/tallerList']);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
