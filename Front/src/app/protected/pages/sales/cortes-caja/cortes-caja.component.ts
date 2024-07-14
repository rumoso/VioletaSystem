import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CajasService } from 'src/app/protected/services/cajas.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { SelectPrintComponent } from '../mdl/select-print/select-print.component';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { CortecajadetailComponent } from '../mdl/cortecajadetail/cortecajadetail.component';

@Component({
  selector: 'app-cortes-caja',
  templateUrl: './cortes-caja.component.html',
  styleUrls: ['./cortes-caja.component.css']
})
export class CortesCajaComponent {
  //////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

private _appMain: string = environment.appMain;

title: string = 'Cortes de caja';
bShowSpinner: boolean = false;

panelOpenState: boolean = false;

idUserLogON: number = 0;

cortesCajaList: any[] = [];

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

  idCaja: 0,
  cajaDesc: '',

  createDateStart: '',
  createDateEnd: '',

};

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
, private salesServ: SalesService
, private cajasServ: CajasService
, private printTicketServ: PrintTicketService
, private printersServ: PrintersService

) { }

async ngOnInit() {

  this.authServ.checkSession();
  this.idUserLogON = await this.authServ.getIdUserSession();

  this._locale = 'mx';
  this._adapter.setLocale(this._locale);

  this.fn_getCorteCajaListWithPage();
  this.fn_getSelectPrintByIdUser( this.idUserLogON );

}

////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getCorteCajaListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getCorteCajaListWithPage();
  }
  ////************************************************ */

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }


//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

  fn_getCorteCajaListWithPage() {

    let OServParams: any = {
      createDateStart: this.parametersForm.createDateStart
      , createDateEnd: this.parametersForm.createDateEnd
      , idSucursal: this.parametersForm.idSucursal
      , idCaja: this.parametersForm.idCaja
    }

    this.bShowSpinner = true;
    this.salesServ.CGetCorteCajaListWithPage( this.pagination, OServParams )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.cortesCajaList = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
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

  fn_btnCerrarPrinter(){

    if( this.selectPrinter.idPrinter > 0 ){

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

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////


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

fn_btnRePrinter( idCorteCaja: any ){

  if( this.selectPrinter.idPrinter > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Estás apunto de reimprimir este corte de caja'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.printTicketServ.printTicket("CorteCaja", idCorteCaja, this.selectPrinter.idPrinter, 1);

        }

      }

    });

  }

}


//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

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





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

// //--------------------------------------------------------------------------
// // MÉTODOS PARA COMBO DE ÁREAS

// cbxCustomers: any[] = [];

// CBXskeyup( iOption: number, txt: string ){

//   let cbxKeyUp: any = {
//     iOption: iOption,
//     txt: txt
//   }

//   this.timeCBXskeyup.next( cbxKeyUp );
// }

// cbxCustomers_Search() {
//     this.customersServ.CCbxGetCustomersCombo( this.parametersForm.customerDesc, this.idUserLogON )
//      .subscribe( {
//        next: (resp: ResponseGet) =>{
//          if(resp.status === 0){
//            this.cbxCustomers = resp.data;
//            this.parametersForm.customerResp = '';

//          }
//          else{
//           this.cbxCustomers = [];
//           this.parametersForm.customerResp = resp.message;
//          }
//        },
//        error: (ex) => {
//          this.servicesGServ.showSnakbar( "Problemas con el servicio" );
//          this.bShowSpinner = false;
//        }
//      });
// }

// cbxCustomers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

//   if(!event.option.value){
//     return;
//   }

//   const ODataCbx: any = event.option.value;

//   this.parametersForm.idCustomer =  ODataCbx.idCustomer;
//   this.parametersForm.customerDesc = ODataCbx.name;

//   // setTimeout (() => {
//   //   this.inputFocus(idInput);
//   // }, 500);

// }

// cbxCustomers_Clear(){
//   this.parametersForm.idCustomer = 0;
//   this.parametersForm.customerDesc = '';
//   this.parametersForm.customerResp = '';
// }
// //--------------------------------------------------------------------------





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
