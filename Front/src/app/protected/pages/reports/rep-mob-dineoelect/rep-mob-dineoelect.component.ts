import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ElectronicMoneyMDLComponent } from '../../catssales/mdl/electronic-money-mdl/electronic-money-mdl.component';
import { ElectronicMoneyService } from 'src/app/protected/services/electronic-money.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, debounceTime } from 'rxjs';

@Component({
  selector: 'app-rep-mob-dineoelect',
  templateUrl: './rep-mob-dineoelect.component.html',
  styleUrls: ['./rep-mob-dineoelect.component.css']
})
export class RepMobDineoelectComponent {

// #region VARIABLES
  private _appMain: string = environment.appMain;


  bShowSpinner: boolean = false;
  catlist: any[] = [];

  idUserLogON: number = 0;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  panelOpenState: boolean = false;

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
    startDate: '',
    endDate: '',
    idCustomer: 0,
    customerDesc: '',
    customerResp: '',
  };

  oCustomerHeader: any = {
    sumDineroElectronico: 0,
    electronicMoneyOtorgado: 0,
    electronicMoneyGastado: 0
  }

// endregion

  constructor(
    private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private customersServ: CustomersService
    , private electronicMoneyServ: ElectronicMoneyService
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

    this.fn_getRepElectronicMoneyListWithPage();
  }

  // #region VARIABLES

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getRepElectronicMoneyListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getRepElectronicMoneyListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    parametersForm_Clear(){
      this.parametersForm.startDate = '';
      this.parametersForm.endDate = '';
      this.parametersForm.idCustomer = 0;
      this.parametersForm.customerDesc = '';
      this.parametersForm.customerResp = '';
  
      this.fn_getRepElectronicMoneyListWithPage();
    }

  // #endregion

  // #region CONEXIONES AL BACK

  fn_getRepElectronicMoneyListWithPage() {

    this.bShowSpinner = true;
    this.electronicMoneyServ.CGetRepElectronicMoneyListWithPage( this.pagination, this.parametersForm )
    .subscribe({
      next: (resp: ResponseGet) => {
        
        this.catlist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
        
        this.oCustomerHeader.sumDineroElectronico = resp.data.count > 0 ? this.catlist[0].electronicMoneySum : 0;
        this.oCustomerHeader.electronicMoneyOtorgado = resp.data.count > 0 ? this.catlist[0].electronicMoneyOtorgado : 0;
        this.oCustomerHeader.electronicMoneyGastado = resp.data.count > 0 ? this.catlist[0].electronicMoneyGastado : 0;

      },
      error: (ex: HttpErrorResponse) => {
        
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
    
      }
    })
    }

  // #endregion

  

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

  

  

}