import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CustomersService } from 'src/app/protected/services/customers.service';
import { FamiliesService } from 'src/app/protected/services/families.service';
import { GroupsService } from 'src/app/protected/services/groups.service';
import { OriginService } from 'src/app/protected/services/origin.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { QualityService } from 'src/app/protected/services/quality.service';
import { RepUtilidadesService } from 'src/app/protected/services/rep-utilidades.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-utilidad',
  templateUrl: './utilidad.component.html',
  styleUrls: ['./utilidad.component.css']
})
export class UtilidadComponent {
  
  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

  private timeCBXskeyup: Subject<any> = new Subject<any>();

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private groupsServ: GroupsService
    , private sucursalesServ: SucursalesService
    , private authServ: AuthService
    , private userServ: UsersService
    , private repUtilidadesServ: RepUtilidadesService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      //this.fn_getInventaryListWithPage();

      this.timeCBXskeyup
      .pipe(
        debounceTime(500)
      )
      .subscribe( value => {
        if(value.iOption == 1){
          this.cbxSellers_Search();
        }
      })
    }

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

  title = 'Lista de Products';
  bShowSpinner: boolean = false;
  oData: any[] = [];

  panelOpenState: boolean = false;

  sumUtilidad: number = 0;
  
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
    idUser: 0,
    idSucursal: 0,
    sucursalDesc: '',
    startDate: '',
    endDate: '',

    idSeller_idUser: 0,
    sellerDesc: '',
    sellerResp: '',
    comision: 0,

    idGroup: 0,
    groupDesc: '',
  };

  fn_CGet_rep_getUtilidades() {
    
    this.oData = [];
    this.sumUtilidad = 0;

    this.bShowSpinner = true;
    this.repUtilidadesServ.CGet_rep_getUtilidades( this.parametersForm )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.oData = resp.data.rows;
        this.bShowSpinner = false;

        if( resp?.data?.rows?.length > 0 ){
          this.sumUtilidad = resp.data.rows[0].sumUtilidad;
        }

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  parametersForm_Clear(){
    
    this.parametersForm = {
      idUser: 0,
      idSucursal: 0,
      sucursalDesc: '',
      createDateStart: '',
      createDateEnd: '',
  
      idCustomer: 0,
      customerDesc: '',
      customerResp: '',
  
      idGroup: 0,
      groupDesc: [''],
    };

    this.fn_CGet_rep_getUtilidades();
  }

  edit( id: number ){
    this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editProduct`, id)
  }

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE GRUPOS

  cbxGroupsList: any[] = [];

  cbxGroups_Search() {
      this.groupsServ.CCbxGetGroupsCombo( this.parametersForm.groupDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxGroupsList = resp.data
           }
           else{
            this.cbxGroupsList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxGroups_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const rol: any = event.option.value;

    this.parametersForm.idGroup = rol.idGroup;
    this.parametersForm.groupDesc = rol.name;

  }

  cbxGroups_Clear(){
    this.parametersForm.idGroup = 0;
    this.parametersForm.groupDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSucursales: any[] = [];

  cbxSucursales_Search() {
      this.sucursalesServ.CCbxGetSucursalesCombo( this.parametersForm.sucursalDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSucursales = resp.data
           }
           else{
            this.cbxSucursales = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSucursales_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.parametersForm.idSucursal = ODataCbx.idSucursal;
    this.parametersForm.sucursalDesc = ODataCbx.name;

  }

  cbxSucursales_Clear(){
    this.parametersForm.idSucursal = 0;
    this.parametersForm.sucursalDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSellers: any[] = [];

  CBXskeyup( iOption: number, txt: string ){

    let cbxKeyUp: any = {
      iOption: iOption,
      txt: txt
    }

    this.timeCBXskeyup.next( cbxKeyUp );
  }

  cbxSellers_Search() {
      this.userServ.CCbxGetSellersCombo( this.parametersForm.sellerDesc, this.idUserLogON )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSellers = resp.data;
             this.parametersForm.sellerResp = '';
             
           }
           else{
            this.cbxSellers = [];
            this.parametersForm.sellerResp = resp.message;
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSellers_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.parametersForm.idSeller_idUser =  ODataCbx.idUser;
    this.parametersForm.sellerDesc = ODataCbx.name;
    this.parametersForm.sellerResp = '';
    this.parametersForm.comision = ODataCbx.comision;

  }

  cbxSellers_Clear(){
    this.cbxSellers = [];
    this.parametersForm.idSeller_idUser = 0;
    this.parametersForm.sellerDesc = '';
    this.parametersForm.sellerResp = '';
    this.parametersForm.comision = 0;
  }
  //--------------------------------------------------------------------------

}
