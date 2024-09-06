import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FamiliesService } from 'src/app/protected/services/families.service';
import { GroupsService } from 'src/app/protected/services/groups.service';
import { OriginService } from 'src/app/protected/services/origin.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { QualityService } from 'src/app/protected/services/quality.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { InventarylogComponent } from '../mdl/inventarylog/inventarylog.component';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private familiesServ: FamiliesService
    , private groupsServ: GroupsService
    , private originServ: OriginService
    , private qualityServ: QualityService

    , private sucursalesServ: SucursalesService

    , private authServ: AuthService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getProductsListWithPage();
    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getProductsListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getProductsListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    fn_ShowInsertInventaryLog( idProduct: number ){

      var paramsMDL: any = {
        idProduct: idProduct
      }

      this.servicesGServ.showModalWithParams( InventarylogComponent, paramsMDL, '1500px')
      .afterClosed().subscribe({
        next: ( resp ) =>{

          this.fn_getProductsListWithPage();

        }
      });

    }

  title = 'Lista de Products';
  bShowSpinner: boolean = false;
  catlist: any[] = [];

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
    idUser: 0,
    idSucursal: 0,
    sucursalDesc: '',
    createDateStart: '',
    createDateEnd: '',
    barCode: '',
    name: '',
    idFamily: 0,
    familyDesc: '',
    idGroup: 0,
    groupDesc: '',
    idQuality: 0,
    qualityDesc: '',
    idOrigin: 0,
    originDesc: ''
  };

  fn_getProductsListWithPage() {

    this.parametersForm.idUser = this.idUserLogON;

    this.bShowSpinner = true;
    this.productsServ.CGetProductsListWithPage( this.pagination, this.parametersForm )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.catlist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  fn_disableProduct( idProduct: number ){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de deshabilitar el producto'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
          this.bShowSpinner = true;

          this.productsServ.CDisableProduct( idProduct )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.fn_getProductsListWithPage();
              }

              this.servicesGServ.showAlertIA( resp );
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              console.log( ex )
              this.servicesGServ.showSnakbar( ex.error.data );
              this.bShowSpinner = false;
            }

          })

        }
      }
    });
  }

  parametersForm_Clear(){
      this.parametersForm.createDateStart =  '';
      this.parametersForm.createDateEnd =  '';
      this.parametersForm.barCode =  '';
      this.parametersForm.name =  '';
      this.parametersForm.description =  '';
      this.parametersForm.idFamily =  0;
      this.parametersForm.familyDesc =  '';
      this.parametersForm.idGroup =  0;
      this.parametersForm.groupDesc =  '';
      this.parametersForm.idQuality =  0;
      this.parametersForm.qualityDesc =  '';
      this.parametersForm.idOrigin =  0;
      this.parametersForm.originDesc =  '';

      this.parametersForm.idSucursal =  0;
      this.parametersForm.sucursalDesc =  '';

    this.fn_getProductsListWithPage();
  }

  edit( id: number ){
    this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editProduct`, id)
  }

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE Familias

  cbxFamiliesList: any[] = [];

  cbxFamilies_Search() {
      this.familiesServ.CCbxGetFamiliesCombo( this.parametersForm.familyDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxFamiliesList = resp.data
           }
           else{
            this.cbxFamiliesList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxFamilies_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const rol: any = event.option.value;

    this.parametersForm.idFamily = rol.idFamily;
    this.parametersForm.familyDesc = rol.name;

  }

  cbxFamilies_Clear(){
    this.parametersForm.idFamily = 0;
    this.parametersForm.familyDesc = '';
  }
  //--------------------------------------------------------------------------

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
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxQualityList: any[] = [];

  cbxQuality_Search() {
      this.qualityServ.CCbxGetQualityCombo( this.parametersForm.qualityDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxQualityList = resp.data
           }
           else{
            this.cbxQualityList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxQuality_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const rol: any = event.option.value;

    this.parametersForm.idQuality = rol.idQuality;
    this.parametersForm.qualityDesc = rol.name;

  }

  cbxQuality_Clear(){
    this.parametersForm.idQuality = 0;
    this.parametersForm.qualityDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ORIGEN

  cbxOriginList: any[] = [];

  cbxOrigin_Search() {
      this.originServ.CCbxGetOriginCombo( this.parametersForm.originDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxOriginList = resp.data
           }
           else{
            this.cbxOriginList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxOrigin_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const rol: any = event.option.value;

    this.parametersForm.idOrigin = rol.idOrigin;
    this.parametersForm.originDesc = rol.name;

  }

  cbxOrigin_Clear(){
    this.parametersForm.idOrigin = 0;
    this.parametersForm.originDesc = '';
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

}
