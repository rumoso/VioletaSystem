import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { debounceTime, Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { CortecajadetailComponent } from '../../sales/mdl/cortecajadetail/cortecajadetail.component';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-rep-payments',
  templateUrl: './rep-payments.component.html',
  styleUrls: ['./rep-payments.component.css']
})
export class RepPaymentsComponent {

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

  idSale: '',
  idPayment: '',
  idCorteCaja: ''

};

//#end region

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

    };

    this.repList = [];
    this.sumPagos = 0;
    this.pagination.length = 0;

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
