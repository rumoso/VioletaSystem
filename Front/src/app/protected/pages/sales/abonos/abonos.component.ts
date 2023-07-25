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
import { AbonoComponent } from '../mdl/abono/abono.component';
import { CustomerComponent } from '../../catssales/customer/customer.component';

@Component({
  selector: 'app-abonos',
  templateUrl: './abonos.component.html',
  styleUrls: ['./abonos.component.css']
})
export class AbonosComponent {

  private _appMain: string = environment.appMain;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  @ViewChild('cbxCustomerCBX') cbxCustomerCBX!: ElementRef;

  title: string = 'Abonos';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  abonoForm: any = {

    idCustomer: 0,
    customerDesc: '',
    customerResp: '',

    all: false

  };

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


      setTimeout (() => {
        this.cbxCustomerCBX.nativeElement.focus();
      }, 1000);

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getVentasACreditoListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getVentasACreditoListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_getVentasACreditoListWithPage() {

  if( this.abonoForm.idCustomer > 0 ){
    this.bShowSpinner = true;
    this.salesServ.CGetVentasACreditoListWithPage( this.pagination, this.abonoForm )
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
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_ShowAddAbono( item: any ){

  var paramsMDL: any = {
    idSale: item.idSale
    , pendingAmount: ( item.total - item.abonado )
    , idUserLogON: this.idUserLogON
    , idCustomer: item.idCustomer
    , idAbono: 0
  }

  this.servicesGServ.showModalWithParams( AbonoComponent, paramsMDL, '1500px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      if( resp?.idAbono > 0 ){
        this.fn_getVentasACreditoListWithPage();
      }
    }
  });

}

showCustomerCat( id: number ){

  var OParamsIN: any = {
    id: id
  }

  this.servicesGServ.showModalWithParams( CustomerComponent, OParamsIN, '1500px')
  .afterClosed().subscribe({
    next: ( resp: any ) =>{

      if( resp.bOK ){
        this.abonoForm.idCustomer =  resp.id;
        this.abonoForm.customerDesc = resp.name;
      }
      
    }
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// END SECCIÓN DE MÉTODOS CON EL FRONT
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
      this.customersServ.CCbxGetCustomersCombo( this.abonoForm.customerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxCustomers = resp.data;
             this.abonoForm.customerResp = '';
             
           }
           else{
            this.cbxCustomers = [];
            this.abonoForm.customerResp = resp.message;
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

    this.abonoForm.idCustomer =  ODataCbx.idCustomer;
    this.abonoForm.customerDesc = ODataCbx.name;

    this.fn_getVentasACreditoListWithPage();

    // setTimeout (() => {
    //   this.inputFocus(idInput);
    // }, 500);

  }

  cbxCustomers_Clear(){
    this.abonoForm.idCustomer = 0;
    this.abonoForm.customerDesc = '';
    this.abonoForm.customerResp = '';
  }
  //--------------------------------------------------------------------------

}
