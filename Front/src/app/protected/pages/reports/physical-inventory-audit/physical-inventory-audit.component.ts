import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ProductsService } from 'src/app/protected/services/products.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { PhysicalInventoryComponent } from '../physical-inventory/physical-inventory.component';

@Component({
  selector: 'app-physical-inventory-audit',
  templateUrl: './physical-inventory-audit.component.html',
  styleUrls: ['./physical-inventory-audit.component.css']
})
export class PhysicalInventoryAuditComponent {

// #region VARIABLES

  idUserLogON: number = 0;

  bShowSpinner: boolean = false;

  parametersForm: any = {
    idSucursal: environment.idSucursal,
    sucursalDesc: '',
    startDate: '',
    endDate: ''
  };

  sPreset: string = 'M1';       // M1 = mes pasado, M2 = últimos 2 meses, M3 = últimos 3 meses, '' = rango manual
  sFilterInv: string = 'T';     // T = todos, C = con inventario, S = sin inventario
  searchText: string = '';
  iTabIndex: number = 0;

  bShowDateRange: boolean = false;

  groupsList: any[] = [];
  familiesList: any[] = [];

  bGenerated: boolean = false;

// #endregion

  constructor(
    private dialogRef: MatDialogRef<PhysicalInventoryAuditComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private servicesGServ: ServicesGService
    , private productsServ: ProductsService
    , private sucursalesServ: SucursalesService
    , private authServ: AuthService
    ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this.fn_setSucursalDefault();
    this.fn_setPreset('M1');

  }

// #region MÉTODOS PARA EL FRONT

  fn_close(){
    this.dialogRef.close( this.bGenerated );
  }

  fn_setPreset( preset: string ){

    this.sPreset = preset;
    this.bShowDateRange = false;

    const iMeses = preset === 'M3' ? 3 : ( preset === 'M2' ? 2 : 1 );

    const now = new Date();
    const startDate = new Date( now.getFullYear(), now.getMonth() - iMeses, 1 );
    const endDate = new Date( now.getFullYear(), now.getMonth(), 0 );

    this.parametersForm.startDate = this.fn_formatDate( startDate );
    this.parametersForm.endDate = this.fn_formatDate( endDate );

    this.fn_getAuditList();

  }

  fn_manualRangeChange(){

    if( this.parametersForm.startDate && this.parametersForm.endDate ){

      this.sPreset = '';

      this.fn_getAuditList();

    }

  }

  fn_formatDate( oDate: Date ): string {
    const sMonth = ( '0' + ( oDate.getMonth() + 1 ) ).slice( -2 );
    const sDay = ( '0' + oDate.getDate() ).slice( -2 );
    return `${ oDate.getFullYear() }-${ sMonth }-${ sDay }`;
  }

  fn_filterList( list: any[] ): any[] {

    var oList = list;

    if( this.sFilterInv === 'C' ){
      oList = oList.filter( item => item.bConInventario == 1 );
    }
    else if( this.sFilterInv === 'S' ){
      oList = oList.filter( item => item.bConInventario == 0 );
    }

    if( this.searchText ){
      const sSearch = this.searchText.toLowerCase();
      oList = oList.filter( item => ( item.name || '' ).toLowerCase().includes( sSearch ) );
    }

    return oList;

  }

  get filteredGroups(): any[] {
    return this.fn_filterList( this.groupsList );
  }

  get filteredFamilies(): any[] {
    return this.fn_filterList( this.familiesList );
  }

// #endregion

// #region CONEXIONES AL BACK

  fn_getAuditList(){

    this.groupsList = [];
    this.familiesList = [];

    this.bShowSpinner = true;

    this.productsServ.CGetAuditPhysicalInventory({
      sOption: 'G',
      idSucursal: this.parametersForm.idSucursal,
      startDate: this.parametersForm.startDate,
      endDate: this.parametersForm.endDate
    })
    .subscribe({
      next: (resp: ResponseGet) => {

        if( resp.status === 0 ){
          this.groupsList = resp.data.rows;
        }

        this.productsServ.CGetAuditPhysicalInventory({
          sOption: 'F',
          idSucursal: this.parametersForm.idSucursal,
          startDate: this.parametersForm.startDate,
          endDate: this.parametersForm.endDate
        })
        .subscribe({
          next: (respF: ResponseGet) => {

            if( respF.status === 0 ){
              this.familiesList = respF.data.rows;
            }

            this.bShowSpinner = false;

          },
          error: (ex: HttpErrorResponse) => {
            console.log( ex )
            this.servicesGServ.showSnakbar( ex.error.data );
            this.bShowSpinner = false;
          }
        });

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    });

  }

  bShowActionAuthorization: boolean = false;
  fn_startPhysicInventory( item: any, sOption: string ){

    if(!this.bShowActionAuthorization){

      this.bShowActionAuthorization = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de iniciar un inventario físico de: ${ item.name }`
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

                  this.productsServ.CStartPhysicInventory({
                    idSucursal: this.parametersForm.idSucursal,
                    idGroup: ( sOption === 'G' ? item.id : 0 ),
                    idFamily: ( sOption === 'F' ? item.id : 0 )
                  })
                  .subscribe({
                    next: (resp: any) => {

                      if( resp.status === 0 ){

                        this.bGenerated = true;

                        this.servicesGServ.showModalWithParams( PhysicalInventoryComponent, { idPhysicalInventory: resp.insertID }, '2500px')
                        .afterClosed().subscribe({
                          next: () =>{
                            this.fn_getAuditList();
                          }
                        });

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

// #endregion

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE SUCURSALES

  cbxSucursales: any[] = [];

  fn_setSucursalDefault(){
    this.sucursalesServ.CCbxGetSucursalesCombo( '', this.idUserLogON )
     .subscribe( {
       next: (resp: ResponseGet) =>{
         if(resp.status === 0){
           const oSucursal = resp.data.find( ( s: any ) => s.idSucursal == this.parametersForm.idSucursal );
           if( oSucursal ){
             this.parametersForm.sucursalDesc = oSucursal.name;
           }
         }
       },
       error: (ex) => {
         this.servicesGServ.showSnakbar( "Problemas con el servicio" );
       }
     });
  }

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

    this.parametersForm.idSucursal = ODataCbx.idSucursal;
    this.parametersForm.sucursalDesc = ODataCbx.name;

    this.fn_getAuditList();

  }

  cbxSucursales_Clear(){
    this.parametersForm.idSucursal = 0;
    this.parametersForm.sucursalDesc = '';
  }
  //--------------------------------------------------------------------------

}
