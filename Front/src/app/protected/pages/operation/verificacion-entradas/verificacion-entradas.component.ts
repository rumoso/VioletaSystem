import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';

@Component({
  selector: 'app-verificacion-entradas',
  templateUrl: './verificacion-entradas.component.html',
  styleUrls: ['./verificacion-entradas.component.css']
})
export class VerificacionEntradasComponent {

// #region VARIABLES

  private _appMain: string = environment.appMain;

  idUserLogON: number = 0;

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
    idProduct: 0,
    productDesc: '',
    
    startDate: '',
    endDate: '',

    noEntrada: ''
    
  };

// #endregion

  constructor(
    private servicesGServ: ServicesGService
    , private productsServ: ProductsService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getInventarylogParaFirmar();
    }

// #region MÉTODOS PARA EL FRONT

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getInventarylogParaFirmar();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getInventarylogParaFirmar();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    parametersForm_Clear(){
      this.parametersForm.idProduct = 0;
      this.parametersForm.productDesc = '';
      this.parametersForm.startDate = '';
      this.parametersForm.endDate = '';
      this.parametersForm.noEntrada = '';
  
      this.fn_getInventarylogParaFirmar();
    }

// #endregion

// #region CONEXIONES CON LE BACK
  bShowActionAuthorization = false;
  fn_updateFirmaEntradaInventario( iOption: any, idHtml: string ){

    if(!this.bShowActionAuthorization){
      
      this.bShowActionAuthorization = true;
      this.servicesGServ.disableEnableButton( idHtml, true );

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de ' + ( iOption == 1 ? 'verificar' : 'recibir' ) + ' el inventario con estos filtros'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            var paramsMDL: any = {
              actionName: ( iOption == 1 ? 'opera_VeriEnt_Verification' : 'opera_VeriEnt_Mostrador' )
              , bShowAlert: false
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){

                  this.bShowActionAuthorization = false;
                  this.servicesGServ.disableEnableButton( idHtml, false );

                  this.bShowSpinner = true;

                  this.parametersForm.iOption = iOption;

                  this.productsServ.CUpdateFirmaEntradaInventario( this.parametersForm )
                  .subscribe({
                    next: (resp: any) => {
            
                      if( resp.status === 0 ){

                        this.fn_getInventarylogParaFirmar();
                          
                      }

                      this.servicesGServ.showAlertIA( resp );
            
                      
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
                  this.servicesGServ.disableEnableButton( idHtml, false );
                }

              }
            });

          }
          else{
            this.bShowActionAuthorization = false;
            this.servicesGServ.disableEnableButton( idHtml, false );
          }
          
        }
      });

    }
          
  }

  fn_getInventarylogParaFirmar() {

    this.bShowSpinner = true;
    this.productsServ.CGetInventarylogParaFirmar( this.pagination, this.parametersForm )
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

// #endregion

//--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxProducts: any[] = [];

  cbxProducts_Search() {

    var oParams: any = {
      iOption: 2,
      search: this.parametersForm.productDesc
    }

    this.productsServ.CCbxGetProductsCombo( oParams )
      .subscribe( {
        next: (resp: ResponseGet) =>{
          if(resp.status === 0){
            this.cbxProducts = resp.data
          }
          else{
          this.cbxProducts = [];
          }
        },
        error: (ex) => {
          this.servicesGServ.showSnakbar( "Problemas con el servicio" );
          this.bShowSpinner = false;
        }
      });
  }

  cbxProducts_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    this.cbxProducts_Clear();

    setTimeout (() => {
      
      const ODataCbx: any = event.option.value;

      this.parametersForm.idProduct = ODataCbx.idProduct;
      this.parametersForm.productDesc = ODataCbx.barCode + ' - ' + ODataCbx.name;
  
    }, 1);
    
  }

  cbxProducts_Clear(){
    this.parametersForm.idProduct = 0;
    this.parametersForm.productDesc = '';
  }
  //--------------------------------------------------------------------------

}