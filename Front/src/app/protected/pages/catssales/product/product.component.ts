import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FamiliesService } from 'src/app/protected/services/families.service';
import { GroupsService } from 'src/app/protected/services/groups.service';
import { OriginService } from 'src/app/protected/services/origin.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { QualityService } from 'src/app/protected/services/quality.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProductComponent implements OnInit {

  private _appMain: string = environment.appMain;

  title: string = 'Producto';
  bShowSpinner: boolean = false;
  idProduct: number = 0;

  idUserLogON: number = 0;

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

    , private authServ: AuthService
    ) { }

    productForm: FormGroup = this.fb.group({
      idSucursal: 0,
      sucursalDesc: '',
      idProduct: 0,
      createDate: '',
      barCode: ['',[ Validators.required ]],
      name: ['',[ Validators.required ]],
      gramos: 0,
      cost: [0, [ Validators.required, Validators.pattern(/^[0-9]+(.[0-9]{0,2})?$/)  ]],
      price: [0, [ Validators.required, Validators.pattern(/^[0-9]+(.[0-9]{0,2})?$/) ]],
      idFamily: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
      familyDesc: [''],
      idGroup: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
      groupDesc: [''],
      idQuality: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
      qualityDesc: [''],
      idOrigin: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
      originDesc: [''],
      active: true,
      addInv: 1,
      idUser: 0
    });

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
  
             this.productForm.setValue({
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
              active: resp.data.active,
              addInv: 1,
              idUser: this.idUserLogON
             });
  
  
             //this.fn_getHitorialClinicoByIdPaciente(this.id);
             //this.fn_getRolesByIdUser();
           }else{
            this.servicesGServ.showSnakbar(resp.message);
           }
           this.bShowSpinner = false;
        } )
  
    }

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    fn_saveProduct() {

      this.productForm.get('idUser')?.setValue( this.idUserLogON );

      this.bShowSpinner = true;
  
      if(this.idProduct > 0){
        this.productsServ.CUpdateProduct( this.productForm.value )
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
      this.productsServ.CInsertProduct( this.productForm.value )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {
  
            if( resp.status === 0 ){
              this.idProduct = resp.insertID;
  
              this.productForm.get('idProduct')?.setValue( resp.insertID );

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
      }
    }

    //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE Familias

  cbxFamiliesList: any[] = [];

  cbxFamilies_Search() {
      this.familiesServ.CCbxGetFamiliesCombo( this.productForm.value.familyDesc )
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

    this.productForm.get('idFamily')?.setValue( rol.idFamily )
    this.productForm.get('familyDesc')?.setValue( rol.name )

  }

  cbxFamilies_Clear(){
    this.productForm.get('idFamily')?.setValue( 0 );
    this.productForm.get('familyDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE GRUPOS

  cbxGroupsList: any[] = [];

  cbxGroups_Search() {
      this.groupsServ.CCbxGetGroupsCombo( this.productForm.value.groupDesc )
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

    this.productForm.get('idGroup')?.setValue( rol.idGroup )
    this.productForm.get('groupDesc')?.setValue( rol.name )

  }

  cbxGroups_Clear(){
    this.productForm.get('idGroup')?.setValue( 0 );
    this.productForm.get('groupDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE CALIDAD

  cbxQualityList: any[] = [];

  cbxQuality_Search() {
      this.qualityServ.CCbxGetQualityCombo( this.productForm.value.qualityDesc )
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

    this.productForm.get('idQuality')?.setValue( rol.idQuality )
    this.productForm.get('qualityDesc')?.setValue( rol.name )

  }

  cbxQuality_Clear(){
    this.productForm.get('idQuality')?.setValue( 0 );
    this.productForm.get('qualityDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ORIGEN

  cbxOriginList: any[] = [];

  cbxOrigin_Search() {
      this.originServ.CCbxGetOriginCombo( this.productForm.value.originDesc )
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

    this.productForm.get('idOrigin')?.setValue( rol.idOrigin )
    this.productForm.get('originDesc')?.setValue( rol.name )

  }

  cbxOrigin_Clear(){
    this.productForm.get('idOrigin')?.setValue( 0 );
    this.productForm.get('originDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSucursales: any[] = [];

  cbxSucursales_Search() {
      this.sucursalesServ.CCbxGetSucursalesCombo( this.productForm.value.sucursalDesc, this.idUserLogON )
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

    this.productForm.get('idSucursal')?.setValue( ODataCbx.idSucursal )
    this.productForm.get('sucursalDesc')?.setValue( ODataCbx.name )

  }

  cbxSucursales_Clear(){
    this.productForm.get('idSucursal')?.setValue( 0 );
    this.productForm.get('sucursalDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

}
