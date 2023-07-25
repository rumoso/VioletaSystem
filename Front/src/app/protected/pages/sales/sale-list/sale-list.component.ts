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

@Component({
  selector: 'app-sale-list',
  templateUrl: './sale-list.component.html',
  styleUrls: ['./sale-list.component.css']
})
export class SaleListComponent {
//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

private _appMain: string = environment.appMain;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;

  title: string = 'Ventas';
  bShowSpinner: boolean = false;

  panelOpenState: boolean = false;

  idUserLogON: number = 0;

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
    customerResp: ''

  };



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

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

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


//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_getVentasListWithPage() {

  let OServParams: any = {
    idUser: this.idUserLogON
    ,createDateStart: this.parametersForm.createDateStart
    ,createDateEnd: this.parametersForm.createDateEnd
    ,idCustomer: this.parametersForm.idCustomer
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

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

// fn_ShowAddSale(){

//   var paramsMDL: any = {
//     idSale: item.idSale
//     , pendingAmount: ( item.total - item.abonado )
//     , idUserLogON: this.idUserLogON
//     , idCustomer: item.idCustomer
//     , idAbono: 0
//   }

//   this.servicesGServ.showModalWithParams( AbonoComponent, paramsMDL, '1500px')
//   .afterClosed().subscribe({
//     next: ( resp ) =>{

//       if( resp?.idAbono > 0 ){
//         this.fn_getVentasACreditoListWithPage();
//       }
//     }
//   });

// }






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

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.parametersForm.idCustomer =  ODataCbx.idCustomer;
    this.parametersForm.customerDesc = ODataCbx.name;

    // setTimeout (() => {
    //   this.inputFocus(idInput);
    // }, 500);

  }

  cbxCustomers_Clear(){
    this.parametersForm.idCustomer = 0;
    this.parametersForm.customerDesc = '';
    this.parametersForm.customerResp = '';
  }
  //--------------------------------------------------------------------------





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
  
}