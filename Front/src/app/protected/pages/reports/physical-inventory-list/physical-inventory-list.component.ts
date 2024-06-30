import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FamiliesService } from 'src/app/protected/services/families.service';
import { GroupsService } from 'src/app/protected/services/groups.service';
import { OriginService } from 'src/app/protected/services/origin.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { QualityService } from 'src/app/protected/services/quality.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { PhysicalInventoryComponent } from '../physical-inventory/physical-inventory.component';

@Component({
  selector: 'app-physical-inventory-list',
  templateUrl: './physical-inventory-list.component.html',
  styleUrls: ['./physical-inventory-list.component.css']
})
export class PhysicalInventoryListComponent {

  private _appMain: string = environment.appMain;
  public _idSucursal: number = environment.idSucursal;

// #region VARIABLES

  idUserLogON: number = 0;

  title = 'Lista de Products';
  bShowSpinner: boolean = false;
  catlist: any[] = [];
  physicalInventoryHeaderBySucursal: any[] = [];

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
    idSucursal: 0,
    sucursalDesc: '',
    startDate: '',
    endDate: '',
    idFamily: 0,
    familyDesc: '',
    idGroup: 0,
    groupDesc: '',
  };

// #endregion

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private fb: FormBuilder

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private familiesServ: FamiliesService
    , private groupsServ: GroupsService

    , private sucursalesServ: SucursalesService

    , private authServ: AuthService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      //this.fn_getPhysicalInventoryListWithPage();
    }



// #region MÉTODOS PARA EL FRONT

  parametersForm_Clear(){

    this.parametersForm = {
      idSucursal: 0,
      sucursalDesc: '',
      startDate: '',
      endDate: '',
      idFamily: 0,
      familyDesc: '',
      idGroup: 0,
      groupDesc: '',
    };

    this.fn_getPhysicalInventoryListWithPage();
  }

////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getPhysicalInventoryListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getPhysicalInventoryListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    edit( id: number ){
      this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editInventarioFisico`, id)
    }

    fn_ShowPhysicalInventory( idPhysicalInventory: any ){

      var paramsMDL: any = {
        idPhysicalInventory: idPhysicalInventory
      }

      this.servicesGServ.showModalWithParams( PhysicalInventoryComponent, paramsMDL, '2500px')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          this.fn_getPhysicalInventoryListWithPage();
        }
      });


    }

// #endregion

// #region CONEXIONES AL BACK

fn_getPhysicalInventoryHeaderBySucursal() {

  this.productsServ.CGetPhysicalInventoryHeaderBySucursal( this.parametersForm )
  .subscribe({
    next: (resp: ResponseGet) => {

      if( resp.status === 0 ){
        console.log(resp)
        this.physicalInventoryHeaderBySucursal = resp.data.rows;
      }

    },
    error: (ex: HttpErrorResponse) => {
      console.log( ex )
      this.servicesGServ.showSnakbar( ex.error.data );
    }
  })
}

bShowActionAuthorization: boolean = false;
fn_startPhysicInventory(){

  if(!this.bShowActionAuthorization){

    this.bShowActionAuthorization = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de iniciar un inventario físico con estos filtros'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          var paramsMDL: any = {
            actionName: 'inv_CrearInventarioFisico'
            , bShowAlert: false
          }

          this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
          .afterClosed().subscribe({
            next: ( resp ) =>{

              if( resp ){

                this.bShowActionAuthorization = false;

                this.bShowSpinner = true;

                this.productsServ.CStartPhysicInventory( this.parametersForm )
                .subscribe({
                  next: (resp: any) => {

                    if( resp.status === 0 ){

                      this.parametersForm.idGroup = 0;
                      this.parametersForm.groupDesc = '';
                      this.parametersForm.idFamily = 0;
                      this.parametersForm.familyDesc = '';

                      this.fn_ShowPhysicalInventory( resp.insertID );
                      this.fn_getPhysicalInventoryListWithPage();

                    }
                    else{
                      this.servicesGServ.showAlertIA( resp );
                    }




                    this.bShowSpinner = false;

                  },
                  error: (ex) => {

                    this.servicesGServ.showSnakbar( ex.error.message );
                    this.bShowSpinner = false;

                  }
                });

              }
              else{
                this.bShowActionAuthorization = false;
              }

            }
          });

        }
        else{
          this.bShowActionAuthorization = false;
        }

      }
    });

  }

}

fn_getPhysicalInventoryListWithPage() {

  this.catlist = [];
  this.physicalInventoryHeaderBySucursal = [];

  this.bShowSpinner = true;
  this.productsServ.CGetPhysicalInventoryListWithPage( this.pagination, this.parametersForm )
  .subscribe({
    next: (resp: ResponseGet) => {
      console.log(resp)
      this.catlist = resp.data.rows;
      this.pagination.length = resp.data.count;
      this.bShowSpinner = false;

      this.fn_getPhysicalInventoryHeaderBySucursal();

    },
    error: (ex: HttpErrorResponse) => {
      console.log( ex )
      this.servicesGServ.showSnakbar( ex.error.data );
      this.bShowSpinner = false;
    }
  })
}

// #endregion

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
    this.parametersForm.familyDesc =  rol.name;

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
