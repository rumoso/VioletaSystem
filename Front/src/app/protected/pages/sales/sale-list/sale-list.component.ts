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

  selectCajas: any = {
    idSucursal: 0,
    idCaja: 0,
    cajaDesc: '',
    impresoraName: ''
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

    this.fn_getSelectCajaByIdUser( this.idUserLogON );

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

fn_getSelectCajaByIdUser( idUser: number ) {

  this.cajasServ.CGetSelectCajaByIdUser( idUser )
  .subscribe({
    
    next: ( resp: ResponseGet ) => {

      if( resp.status == 0 ){
        this.selectCajas.idSucursal = resp.data.idSucursal;
        this.selectCajas.idCaja = resp.data.idCaja;
        this.selectCajas.cajaDesc = resp.data.name;
        this.selectCajas.impresoraName = resp.data.impresoraName;
      }
      else{
        this.selectCajas.idSucursal = 0;
        this.selectCajas.idCaja = 0;
        this.selectCajas.cajaDesc = '';
        this.selectCajas.impresoraName = '';
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
      }

      this.servicesGServ.showSnakbar( resp.message );
      this.bShowSpinner = false;

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
    selectCajas: this.selectCajas
  }

  this.servicesGServ.showModalWithParams( NsaleComponent, paramsMDL, '2000px')
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

fn_ShowCorteCajaSale(){

  var paramsMDL: any = {
    idCaja: this.selectCajas.idCaja
  }

  this.servicesGServ.showModalWithParams( CorteCajaComponent, paramsMDL, '2000px')
  .afterClosed().subscribe({
    next: ( resp ) =>{

      if(resp > 0){
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