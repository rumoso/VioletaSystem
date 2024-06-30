import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
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
import { SuppliersService } from 'src/app/protected/services/suppliers.service';
import { SuppliersComponent } from '../suppliers/suppliers.component';
import { CatComponent } from '../mdl/cat/cat.component';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {

  private _appMain: string = environment.appMain;

  @ViewChild('cbxSucursalCBX') cbxSucursalCBX!: ElementRef;

  title: string = 'Producto';
  bShowSpinner: boolean = false;
  idProduct: number = 0;

  idUserLogON: number = 0;

  inventaryLoglist: any[] = [];

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

  ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getInventarylogByIdProductWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getInventarylogByIdProductWithPage();
    }
    ////************************************************ */

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private fb: FormBuilder
    , private router: Router
    , private activatedRoute: ActivatedRoute

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private familiesServ: FamiliesService
    , private groupsServ: GroupsService
    , private originServ: OriginService
    , private qualityServ: QualityService
    , private sucursalesServ: SucursalesService
    , private suppliersServ: SuppliersService

    , private authServ: AuthService
    , private printTicketServ: PrintTicketService
    ) { }

    productForm: any = {
      idSucursal: 0,
      sucursalDesc: '',
      idProduct: 0,
      createDate: '',
      barCode: '',
      name: '',
      gramos: 0,
      cost: 0,
      price: 0,
      idFamily: 0,
      familyDesc: '',
      idGroup: 0,
      groupDesc: '',
      idQuality: 0,
      qualityDesc: '',
      idOrigin: 0,
      originDesc: '',
      idSupplier: 0,
      supplierDesc: '',
      noEntrada: '',
      active: true,
      addInv: 1,
      idUser: 0
    };

    async ngOnInit() {
      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      if( !this.router.url.includes('editProduct') ){
        return;
      }

      this.bShowSpinner = true;

      this.activatedRoute.params
        .pipe(
          switchMap( ({ id }) => this.productsServ.CGetProductByID( id ) )
        )
        .subscribe( ( resp: any ) => {
          console.log(resp)
           if(resp.status == 0){

            this.idProduct = resp.data.idProduct;

            this.productForm = {
              idProduct: resp.data.idProduct,
              idSucursal: resp.data.idSucursal,
              sucursalDesc: resp.data.sucursalDesc,
              createDate: resp.data.createDate,
              barCode: resp.data.barCode,
              name: resp.data.name,
              gramos: resp.data.gramos,
              cost: resp.data.cost,
              price: resp.data.price,
              idFamily: resp.data.idFamily,
              familyDesc: resp.data.familyDesc,
              idGroup: resp.data.idGroup,
              groupDesc: resp.data.groupDesc,
              idQuality: resp.data.idQuality,
              qualityDesc: resp.data.qualityDesc,
              idOrigin: resp.data.idOrigin,
              originDesc: resp.data.originDesc,
              idSupplier: resp.data.idSupplier,
              supplierDesc: resp.data.supplierDesc,
              active: resp.data.active,
              addInv: 1,
              idUser: this.idUserLogON
             };


             this.fn_getInventarylogByIdProductWithPage();
           }else{
            this.servicesGServ.showSnakbar(resp.message);
           }
           this.bShowSpinner = false;
        } )
    }

    fn_ClearForm(){
      this.idProduct = 0;
      this.productForm.idProduct = 0;
      this.productForm.createDate = '';
      this.productForm.barCode = '';
      this.productForm.name = '';
      this.productForm.gramos = 0;
      this.productForm.cost = 0;
      this.productForm.price = 0;
      this.productForm.idFamily = 0;
      this.productForm.familyDesc = '';
      this.productForm.idGroup = 0;
      this.productForm.groupDesc = '';
      this.productForm.idQuality = 0;
      this.productForm.qualityDesc = '';
      this.productForm.idOrigin = 0;
      this.productForm.originDesc = '';
      this.productForm.active = true;
      this.productForm.addInv = 1;

      setTimeout (() => {

        this.ev_fn_nextInput_keyup_enter( 'barCode' );

      }, 3000);

    }

    ev_fn_nextInput_keyup_enter( idInput: any ){
      //console.log(150)
      setTimeout (() => {
        // idInput.nativeElement.focus();
        var miElemento = document.getElementById( idInput )!.focus();
      }, 100);

    }

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    showCat( sOption: string ){

      var OParams: any = {
        sOption: sOption
      }

      this.servicesGServ.showModalWithParams( CatComponent, OParams, '1500px')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{

        }
      });
    }

    fn_validForm(){
      var bOK = false

      if( this.productForm.idSucursal > 0
      && this.productForm.idFamily > 0
      && this.productForm.idGroup > 0
      && this.productForm.idQuality > 0
      && this.productForm.idOrigin > 0
      && this.productForm.barCode.length > 0
      && this.productForm.name.length > 0
      && this.productForm.cost >= 0
      && this.productForm.price > 0){
        bOK = true;
      }

      return bOK;
    }

    fn_saveProduct() {

      this.productForm.idUser = this.idUserLogON ;

      this.bShowSpinner = true;

      if(this.idProduct > 0){
        this.productsServ.CUpdateProduct( this.productForm )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
              }
              else{
                this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
              }
              this.bShowSpinner = false;

            },
            error: (ex) => {

              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;

            }
          })
      }else{
      this.productsServ.CInsertProduct( this.productForm )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            if( resp.status === 0 ){
              this.idProduct = resp.insertID;

              this.productForm.idProduct = resp.insertID;

              this.servicesGServ.showAlert('S', 'OK!', resp.message, true);

              this.fn_ClearForm();

            }
            else{
              this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
            }

            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })
      }
    }

    fn_getInventarylogByIdProductWithPage() {

      this.bShowSpinner = true;
      this.productsServ.CGetInventarylogByIdProductWithPage( this.pagination, this.idProduct )
      .subscribe({
        next: (resp: ResponseGet) => {
          console.log(resp)
          this.inventaryLoglist = resp.data.rows;
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

  fn_getProductByBarCode() {

    if( this.productForm.idProduct == 0 && this.productForm.barCode.length > 0){

      this.bShowSpinner = true;

      this.productsServ.CGetProductByBarCode( this.productForm.barCode, this.idUserLogON )
        .subscribe({
          next: (resp: ResponseGet) => {

            if( resp.status === 0 ){

              this.servicesGServ.showAlert('W', 'Alerta!', 'Ese código de barras ya existe.', false);

            }

            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })

    }
  }


    //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE Familias

  cbxFamiliesList: any[] = [];

  cbxFamilies_Search() {

    //this.cbxFamilies_Clear();

      this.familiesServ.CCbxGetFamiliesCombo( this.productForm.familyDesc )
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

  cbxFamilies_SelectedOption( event: any ) {

    this.cbxFamilies_Clear();

    setTimeout (() => {

      const rol: any = event.option.value;

      this.productForm.idFamily = rol.idFamily;
      this.productForm.familyDesc = rol.name;

      this.ev_fn_nextInput_keyup_enter( 'cbxQuality' );

    }, 1);

  }

  cbxFamilies_Clear(){
    this.productForm.idFamily = 0;
    this.productForm.familyDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE GRUPOS

  cbxGroupsList: any[] = [];

  cbxGroups_Search() {

      this.groupsServ.CCbxGetGroupsCombo( this.productForm.groupDesc )
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

    this.cbxGroups_Clear();

    setTimeout (() => {

      const rol: any = event.option.value;

      this.productForm.idGroup = rol.idGroup;
      this.productForm.groupDesc = rol.name;

      this.ev_fn_nextInput_keyup_enter( 'cbxFamilies' );

    }, 1);

  }

  cbxGroups_Clear(){
    this.productForm.idGroup = 0;
    this.productForm.groupDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxQualityList: any[] = [];

  cbxQuality_Search() {

      this.qualityServ.CCbxGetQualityCombo( this.productForm.qualityDesc )
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

    this.cbxQuality_Clear();

    setTimeout (() => {

      const rol: any = event.option.value;

      this.productForm.idQuality = rol.idQuality;
      this.productForm.qualityDesc = rol.name;

      this.ev_fn_nextInput_keyup_enter( 'cbxOrigin' );

    }, 1);

  }

  cbxQuality_Clear(){
    this.productForm.idQuality = 0;
    this.productForm.qualityDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ORIGEN

  cbxOriginList: any[] = [];

  cbxOrigin_Search() {

      this.originServ.CCbxGetOriginCombo( this.productForm.originDesc )
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

    this.cbxOrigin_Clear();

    setTimeout (() => {

      const rol: any = event.option.value;

      this.productForm.idOrigin = rol.idOrigin;
      this.productForm.originDesc = rol.name;

      this.ev_fn_nextInput_keyup_enter( 'tbxAddInv' );

    }, 1);

  }

  cbxOrigin_Clear(){
    this.productForm.idOrigin = 0;
    this.productForm.originDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSucursales: any[] = [];

  cbxSucursales_Search() {

      this.sucursalesServ.CCbxGetSucursalesCombo( this.productForm.sucursalDesc, this.idUserLogON )
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

    this.cbxSucursales_Clear();

    setTimeout (() => {

      const ODataCbx: any = event.option.value;

      this.productForm.idSucursal = ODataCbx.idSucursal;
      this.productForm.sucursalDesc = ODataCbx.name;

      this.ev_fn_nextInput_keyup_enter( 'cbxSupplier' );

    }, 1);

  }

  cbxSucursales_Clear(){
    this.productForm.idSucursal = 0;
    this.productForm.sucursalDesc = '';
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxSupplierList: any[] = [];

  cbxSupplier_Search() {

      this.suppliersServ.CCbxGetSuppliersCombo( this.productForm.supplierDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSupplierList = resp.data
           }
           else{
            this.cbxSupplierList = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSupplier_SelectedOption( event: any ) {

    this.cbxSupplier_Clear();

    setTimeout (() => {

      const rol: any = event.option.value;

      if(this.productForm.idSupplier != rol.idSupplier){
        this.productForm.idSupplier = rol.idSupplier;
        this.productForm.supplierDesc = rol.name;
      }

      //this.ev_fn_nextInput_keyup_enter( 'barCode' );
      this.ev_fn_nextInput_keyup_enter( 'tbxNoEntrada' );

    }, 1);

  }

  cbxSupplier_Clear(){
    this.productForm.idSupplier = 0;
    this.productForm.supplierDesc = '';
  }
  //--------------------------------------------------------------------------

  fn_ShowInsertInventaryLog(){

    var paramsMDL: any = {
      idProduct: this.idProduct
    }

    this.servicesGServ.showModalWithParams( InventarylogComponent, paramsMDL, '1500px')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        this.fn_getInventarylogByIdProductWithPage();

      }
    });

  }

  showSuppliersCat(  ){

    this.servicesGServ.showModalWithParams( SuppliersComponent, null, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        //this.fn_getCustomersListWithPage();

      }
    });
  }

  async ev_PrintTicket(){
    //async printTicket( type: string, idRelation: any, idPrinter: number, iPayments: number = 0, idPayment: any = '', sumCambio: number = 0 ): Promise<any> {
    this.printTicketServ.printTicket("codigoBarras", this.productForm.idProduct, 2, this.productForm.addInv);
  }

}
