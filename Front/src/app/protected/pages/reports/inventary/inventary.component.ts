import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ColumnFormat } from 'src/app/protected/interfaces/global.interfaces';
import { FamiliesService } from 'src/app/protected/services/families.service';
import { GroupsService } from 'src/app/protected/services/groups.service';
import { OriginService } from 'src/app/protected/services/origin.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { QualityService } from 'src/app/protected/services/quality.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';



@Component({
  selector: 'app-inventary',
  templateUrl: './inventary.component.html',
  styleUrls: ['./inventary.component.css']
})
export class InventaryComponent {

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;
  rep_costosProductos: boolean = false;


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

      this.rep_costosProductos = this.authServ.hasPermissionAction( 'rep_costosProductos' );
      //console.log(this.rep_costosProductos)

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getInventaryListWithPage();
    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getInventaryListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getInventaryListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

  title = 'Lista de Products';
  bShowSpinner: boolean = false;
  catlist: any[] = [];
  inventaryBySucursalList: any[] = [];

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

  parametersForm: FormGroup = this.fb.group({
    idUser: 0,
    idSucursal: 0,
    sucursalDesc: '',
    createDateStart: '',
    createDateEnd: '',
    barCode: '',
    name: '',
    idFamily: 0,
    familyDesc: [''],
    idGroup: 0,
    groupDesc: [''],
    idQuality: 0,
    qualityDesc: [''],
    idOrigin: 0,
    originDesc: [''],
    iConInventario: true
  });

  // fn_gerReport()
  // {
  //   this.fn_getInventaryListWithPage();
  //   this.fn_getInventaryBySucursal();
  // }

  exportDataToExcel( bCostos: boolean ): void {

    this.bShowSpinner = true;

    var Newpagination: Pagination = {
      search:'',
      length: 10000000,
      pageSize: 10000000,
      pageIndex: 0,
      pageSizeOptions: [5, 10, 25, 100]
    }

    this.productsServ.CGetInventaryListWithPage( Newpagination, this.parametersForm.value )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if(resp.status == 0){

          if( bCostos ){

            if(this.rep_costosProductos){

              const columnFormats: ColumnFormat[] = [
                { col: 0, currencyFormat: false, textAlignment: 'left' },
                { col: 1, currencyFormat: false, textAlignment: 'left' },
                { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 3, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 4, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 5, currencyFormat: true, textAlignment: 'right' },
                { col: 6, currencyFormat: true, textAlignment: 'right' },
              ];

              var NewObj = resp.data.rows.map((originalItem: any) => {
                return {
                  'Código de barras	': originalItem.barCode,
                  'Nombre': originalItem.name,
                  'Apartado': originalItem.catInventaryApart,
                  'Consignación': originalItem.catInventaryCons,
                  'Mostrador': originalItem.catInventary,
                  'cost': originalItem.cost,
                  'price': originalItem.price
                };
              });

              const currentDateTime = new Date();
              const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');

              this.servicesGServ.exportToExcel(NewObj, `RepInventarioConCostos_${formattedDateTime}.xlsx`, columnFormats);

            }else{

              const columnFormats: ColumnFormat[] = [
                { col: 0, currencyFormat: false, textAlignment: 'left' },
                { col: 1, currencyFormat: false, textAlignment: 'left' },
                { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 3, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 4, numberFormat: '#,##0', textAlignment: 'right' },
                { col: 5, currencyFormat: true, textAlignment: 'right' },
              ];

              var NewObj = resp.data.rows.map((originalItem: any) => {
                return {
                  'Código de barras	': originalItem.barCode,
                  'Nombre': originalItem.name,
                  'Apartado': originalItem.catInventaryApart,
                  'Consignación': originalItem.catInventaryCons,
                  'Mostrador': originalItem.catInventary,
                  'price': originalItem.price
                };
              });

              const currentDateTime = new Date();
              const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');

              this.servicesGServ.exportToExcel(NewObj, `RepInventarioConCostos_${formattedDateTime}.xlsx`, columnFormats);

            }

          }else{

            const columnFormats: ColumnFormat[] = [
              { col: 0, currencyFormat: false, textAlignment: 'left' },
              { col: 1, currencyFormat: false, textAlignment: 'left' },
              { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 3, numberFormat: '#,##0', textAlignment: 'right' },
              { col: 4, numberFormat: '#,##0', textAlignment: 'right' },
            ];

            var NewObj = resp.data.rows.map((originalItem: any) => {
              return {
                'Código de barras	': originalItem.barCode,
                'Nombre': originalItem.name,
                'Apartado': originalItem.catInventaryApart,
                'Consignación': originalItem.catInventaryCons,
                'Mostrador': originalItem.catInventary,
              };
            });

            const currentDateTime = new Date();
            const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');

            this.servicesGServ.exportToExcel(NewObj, `RepInventario_${formattedDateTime}.xlsx`, columnFormats);

          }

        }

        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })


  }

  fn_getInventaryListWithPage() {

    this.catlist = [];
    this.inventaryBySucursalList = [];

    this.parametersForm.get('idUser')?.setValue( this.idUserLogON );

    this.bShowSpinner = true;
    this.productsServ.CGetInventaryListWithPage( this.pagination, this.parametersForm.value )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.catlist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;

        this.fn_getInventaryBySucursal();
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  fn_getInventaryBySucursal() {

    this.parametersForm.get('idUser')?.setValue( this.idUserLogON );

    this.productsServ.CGetInventaryBySucursal( this.parametersForm.value )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
        this.inventaryBySucursalList = resp.data.rows;
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
      }
    })
  }

  parametersForm_Clear(){
    this.parametersForm.get('createDateStart')?.setValue( '' );
    this.parametersForm.get('createDateEnd')?.setValue( '' );
    this.parametersForm.get('barCode')?.setValue( '' );
    this.parametersForm.get('name')?.setValue( '' );
    this.parametersForm.get('description')?.setValue( '' );
    this.parametersForm.get('idFamily')?.setValue( 0 );
    this.parametersForm.get('familyDesc')?.setValue( '' );
    this.parametersForm.get('idGroup')?.setValue( 0 );
    this.parametersForm.get('groupDesc')?.setValue( '' );
    this.parametersForm.get('idQuality')?.setValue( 0 );
    this.parametersForm.get('qualityDesc')?.setValue( '' );
    this.parametersForm.get('idOrigin')?.setValue( 0 );
    this.parametersForm.get('originDesc')?.setValue( '' );

    this.parametersForm.get('idSucursal')?.setValue( 0 );
    this.parametersForm.get('sucursalDesc')?.setValue( '' );
    this.parametersForm.get('iConInventario')?.setValue( true );

    this.fn_getInventaryListWithPage();
  }

  edit( id: number ){
    this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editProduct`, id)
  }

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE Familias

  cbxFamiliesList: any[] = [];

  cbxFamilies_Search() {
      this.familiesServ.CCbxGetFamiliesCombo( this.parametersForm.value.familyDesc )
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

    this.parametersForm.get('idFamily')?.setValue( rol.idFamily )
    this.parametersForm.get('familyDesc')?.setValue( rol.name )

  }

  cbxFamilies_Clear(){
    this.parametersForm.get('idFamily')?.setValue( 0 );
    this.parametersForm.get('familyDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE GRUPOS

  cbxGroupsList: any[] = [];

  cbxGroups_Search() {
      this.groupsServ.CCbxGetGroupsCombo( this.parametersForm.value.groupDesc )
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

    this.parametersForm.get('idGroup')?.setValue( rol.idGroup )
    this.parametersForm.get('groupDesc')?.setValue( rol.name )

  }

  cbxGroups_Clear(){
    this.parametersForm.get('idGroup')?.setValue( 0 );
    this.parametersForm.get('groupDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxQualityList: any[] = [];

  cbxQuality_Search() {
      this.qualityServ.CCbxGetQualityCombo( this.parametersForm.value.qualityDesc )
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

    this.parametersForm.get('idQuality')?.setValue( rol.idQuality )
    this.parametersForm.get('qualityDesc')?.setValue( rol.name )

  }

  cbxQuality_Clear(){
    this.parametersForm.get('idQuality')?.setValue( 0 );
    this.parametersForm.get('qualityDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ORIGEN

  cbxOriginList: any[] = [];

  cbxOrigin_Search() {
      this.originServ.CCbxGetOriginCombo( this.parametersForm.value.originDesc )
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

    this.parametersForm.get('idOrigin')?.setValue( rol.idOrigin )
    this.parametersForm.get('originDesc')?.setValue( rol.name )

  }

  cbxOrigin_Clear(){
    this.parametersForm.get('idOrigin')?.setValue( 0 );
    this.parametersForm.get('originDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSucursales: any[] = [];

  cbxSucursales_Search() {
      this.sucursalesServ.CCbxGetSucursalesCombo( this.parametersForm.value.sucursalDesc, this.idUserLogON )
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

    this.parametersForm.get('idSucursal')?.setValue( ODataCbx.idSucursal )
    this.parametersForm.get('sucursalDesc')?.setValue( ODataCbx.name )

  }

  cbxSucursales_Clear(){
    this.parametersForm.get('idSucursal')?.setValue( 0 );
    this.parametersForm.get('sucursalDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

}
