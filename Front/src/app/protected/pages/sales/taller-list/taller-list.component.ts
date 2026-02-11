import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
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
import { TallerComponent } from '../mdl/taller/taller.component';

@Component({
  selector: 'app-taller-list',
  templateUrl: './taller-list.component.html',
  styleUrls: ['./taller-list.component.css']
})
export class TallerListComponent {
//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;

  title: string = 'Taller';
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

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
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

    this.fn_getVentasListWithPage();

    this.fn_getSelectCajaByIdUser( this.idUserLogON );
    this.fn_getSelectPrintByIdUser( this.idUserLogON );

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
  this.salesServ.getTallerPaginado( this.pagination, OServParams )
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

fn_ShowSale( idTaller: number ){

  var paramsMDL: any = {
    idTaller: idTaller,
    selectCajas: this.selectCajas,
    selectPrinter: this.selectPrinter
  }

  this.servicesGServ.showModalWithParamsv2( TallerComponent, paramsMDL, { width: '100vw', height: '100vh', maxWidth: '100vw', panelClass: 'full-screen-modal' })
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
      this.salesTypeServ.CCbxGetSalesTypeCombo( this.parametersForm.saleTypeDesc )
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




//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
