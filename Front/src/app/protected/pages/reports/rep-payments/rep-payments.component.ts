import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { debounceTime, Subject, Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { environment } from 'src/environments/environment';
import { CortecajadetailComponent } from '../../sales/mdl/cortecajadetail/cortecajadetail.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardService } from 'src/app/protected/services/dashboard.service';
import {
  fn_limpiarQueryParamsURL,
  ConsultaPanel,
  fn_leerConsultaPanel,
  fn_etiquetasConsultaPanel,
  fn_avisosConsultaPanel
} from 'src/app/protected/utils/query-filtros.util';

@Component({
  selector: 'app-rep-payments',
  templateUrl: './rep-payments.component.html',
  styleUrls: ['./rep-payments.component.css']
})
export class RepPaymentsComponent implements OnInit, OnDestroy {

//#region VARIABLES

private _appMain: string = environment.appMain;
public _idSucursal: number = environment.idSucursal;

private timeCBXskeyup: Subject<any> = new Subject<any>();

title: string = 'Reporte de Pagos cancelados';
bShowSpinner: boolean = false;

panelOpenState: boolean = false;

idUserLogON: number = 0;
_actionsPermisionList: any;

repList: any[] = [];
sumPagos: number = 0;

//-------------------------------
// VARIABLES PARA LA PAGINACIÓN
iRows: number = 0;
// length arranca en 0: la pantalla no consulta al abrir, y con 10 el
// contador diría "10 registros" antes de buscar nada.
pagination: Pagination = {
  search:'',
  length: 0,
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

  idSale: '',
  idPayment: '',
  idCorteCaja: ''

};

// ── Modo panel (analisis/015) ──
// Se llega desde un clic en "Cobrado" del panel del director: la pantalla
// muestra EXACTAMENTE los pagos que el panel sumó, con los filtros
// deshabilitados. La consulta vive en la URL (panel, fecha, n).
oConsultaPanel: ConsultaPanel | null = null;
oMetaPanel: any = null;
sErrorPanel: string = '';

private subQueryParams?: Subscription;

get bModoPanel(): boolean {
  return this.oConsultaPanel !== null;
}

get aEtiquetasPanel(): string[] {
  if( !this.bModoPanel ){
    return [];
  }
  return this.sErrorPanel ? [ 'No se pudo cargar' ] : fn_etiquetasConsultaPanel( this.oMetaPanel, 'pagos' );
}

get aAvisosPanel(): string[] {
  if( !this.bModoPanel ){
    return [];
  }
  if( this.sErrorPanel ){
    return [ this.sErrorPanel ];
  }
  return fn_avisosConsultaPanel( this.oMetaPanel, this.oConsultaPanel );
}

//#end region

constructor(
  private servicesGServ: ServicesGService

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private authServ: AuthService
  , private customersServ: CustomersService
  , private salesServ: SalesService
  , private pageTitleServ: PageTitleService
  , private activatedRoute: ActivatedRoute
  , private router: Router
  , private dashboardServ: DashboardService

  ) { }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
    this.subQueryParams?.unsubscribe();
  }

  async ngOnInit() {

    this.authServ.checkSession();
    this.pageTitleServ.set('payments', 'Reporte de Pagos', 'Detalle de pagos recibidos por periodo');
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

    // La URL manda: se escucha el cambio de query params (y no solo la
    // foto inicial) porque Angular reutiliza el componente al salir del
    // modo panel o volver a él con el botón de atrás.
    this.subQueryParams = this.activatedRoute.queryParams
    .subscribe( ( queryParams ) => this.fn_aplicarQueryParams( queryParams ) );

  }

  // Modo panel si la URL trae `panel`: se consulta el conjunto de una vez.
  // Sin `panel`, la pantalla queda como siempre — vacía, esperando a que
  // el usuario busque.
  private fn_aplicarQueryParams( queryParams: any ): void {

    const bVeniaDelPanel = this.bModoPanel;

    this.oConsultaPanel = fn_leerConsultaPanel( queryParams );
    this.oMetaPanel = null;
    this.sErrorPanel = '';
    this.pagination.pageIndex = 0;

    if( this.oConsultaPanel ){
      this.fn_getRepVentasDetailWithPage();
    }else if( bVeniaDelPanel ){
      this.fn_ClearFilters();
    }

  }

  // La "×" de la leyenda: sale del modo panel. La suscripción a los query
  // params deja la pantalla como al entrar normal.
  fn_quitarFiltro(): void {
    fn_limpiarQueryParamsURL( this.router, this.activatedRoute );
  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getRepVentasDetailWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getRepVentasDetailWithPage();
  }
  ////************************************************ */

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
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

      idSale: '',
      idPayment: '',
      idCorteCaja: ''

    };

    this.repList = [];
    this.sumPagos = 0;
    this.pagination.length = 0;

  }

  // Buscar desde el botón o con ENTER: siempre desde la primera página.
  fn_buscar(): void {
    this.pagination.pageIndex = 0;
    this.fn_getRepVentasDetailWithPage();
  }

  fn_ShowCorteCajaDetail( idCorteCaja: any ){

    var paramsMDL: any = {
      idCorteCaja: idCorteCaja
    }

    this.servicesGServ.showModalWithParams( CortecajadetailComponent, paramsMDL, '2000px')
    .afterClosed().subscribe({
      next: ( resp ) =>{

      }
    });


  }


//#region CONEXIONES AL BACK

fn_getRepVentasDetailWithPage() {

  // En modo panel toda recarga vuelve a pedir el conjunto.
  if( this.bModoPanel ){
    this.fn_getPagosConjunto();
    return;
  }

  this.repList = [];
  this.sumPagos = 0;
  this.pagination.length = 0;

  this.bShowSpinner = true;
  this.salesServ.CGetRepPagosWithPage( this.pagination, this.parametersForm )
  .subscribe({
    next: (resp: ResponseGet) => {

      if( resp.status === 0 ){

        this.repList = resp.data.rows;
        this.sumPagos = resp.data.OSQL_Sum ? resp.data.OSQL_Sum[0].sumPagos : 0;
        this.pagination.length = resp.data.count;

      }

      this.bShowSpinner = false;
    },
    error: (ex: HttpErrorResponse) => {
      this.servicesGServ.showSnakbar( ex.error.data );
      this.bShowSpinner = false;
    }
  })

}

// Los pagos que el panel sumó (analisis/015).
fn_getPagosConjunto() {

  if( !this.oConsultaPanel ){
    return;
  }

  this.repList = [];
  this.sumPagos = 0;
  this.pagination.length = 0;

  this.bShowSpinner = true;
  this.dashboardServ.CGetPagosConjunto( this.oConsultaPanel, this.pagination )
  .subscribe({
    next: (resp: ResponseGet) => {

      if( resp.status === 0 ){
        this.sErrorPanel = '';
        this.oMetaPanel = resp.data.meta;
        this.repList = resp.data.rows;
        this.sumPagos = resp.data.OSQL_Sum ? resp.data.OSQL_Sum[0].sumPagos : 0;
        this.pagination.length = resp.data.count;
      }else{
        this.sErrorPanel = resp.message;
        this.oMetaPanel = null;
      }

      this.bShowSpinner = false;
    },
    error: (ex: HttpErrorResponse) => {
      this.sErrorPanel = 'No se pudo cargar la consulta del panel.';
      this.servicesGServ.showSnakbar( ex.error?.data || this.sErrorPanel );
      this.bShowSpinner = false;
    }
  })

}

//#end region


  //#region ComboBox

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

//#end region


}
