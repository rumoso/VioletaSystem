import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ColumnFormat } from 'src/app/protected/interfaces/global.interfaces';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-devolu-inventario',
  templateUrl: './devolu-inventario.component.html',
  styleUrls: ['./devolu-inventario.component.css']
})
export class DevoluInventarioComponent {

// #region VARIABLES

private _appMain: string = environment.appMain;

@ViewChild('tbxJustify') tbxJustify!: ElementRef;

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

  barCode: '',
  idProduct: 0,
  productDesc: '',
  catInventary: 0,

  justify: ''

};

parametersFilters: any = {

  bPending: true

};

bShowActionAuthorization = false;

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

    this.fn_getInventarylog_devolution();
  }

// #region MÉTODOS PARA EL FRONT

public nextInputFocus( idInput: any, milliseconds: number ) {
  setTimeout (() => {
    idInput.nativeElement.focus();
  }, milliseconds);
}

ev_fn_barCode_keyup_enter(event: any){
  if(event.keyCode == 13) { // PRESS ENTER

    if( this.parametersForm.barCode.length > 0){
      this.fn_getProductByBarCode();
    }
    // else if(this.salesHeaderForm.saleDetail.length > 0 && this.salesDetailForm.barCode.length == 0){
    //   this.fn_ShowPaymentCreateSale( this.salesHeaderForm.idSaleType != 3 && this.salesHeaderForm.idSaleType != 4 && this.selectCajas.idCaja > 0);
    // }

  }
}

exportDataToExcel( bCostos: boolean ): void {

this.bShowSpinner = true;

var Newpagination: Pagination = {
  search:'',
  length: 10000000,
  pageSize: 10000000,
  pageIndex: 0,
  pageSizeOptions: [5, 10, 25, 100]
}

this.productsServ.CGetInventarylog_devolution( this.pagination, this.parametersFilters )
.subscribe({
  next: (resp: ResponseGet) => {
    console.log(resp)

    if(resp.status == 0){

        const columnFormats: ColumnFormat[] = [
          { col: 0, currencyFormat: false, textAlignment: 'left' },
          { col: 1, currencyFormat: false, textAlignment: 'left' },
          { col: 2, numberFormat: '#,##0', textAlignment: 'right' },
        ];

        var NewObj = resp.data.rows.map((originalItem: any) => {
          return {
            'Código de barras': originalItem.barCode,
            'Nombre': originalItem.productName,
            'Cantidad': originalItem.cantidad,
          };
        });

        const currentDateTime = new Date();
        const formattedDateTime = currentDateTime.toISOString().replace(/[:.]/g, '-');

        this.servicesGServ.exportToExcel(NewObj, `RepInventarioConCostos_${formattedDateTime}.xlsx`, columnFormats);

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

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getInventarylog_devolution();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getInventarylog_devolution();
  }
  ////************************************************ */

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  parametersForm_Clear(){
    this.parametersForm.barCode = '';
    this.parametersForm.idProduct = 0;
    this.parametersForm.productDesc = '';
    this.parametersForm.catInventary = 0;
    this.parametersForm.justify = '';

    this.fn_getInventarylog_devolution();
  }

// #endregion

// #region CONEXIONES CON LE BACK

  
  fn_cancelDevolution( idHtml: string ){

    let invSelectList = this.catlist.filter(function( item: any ) {
      return ( item.select == true
        &&
        (
          item.firmaVer == 0
          || item.firmaMost == 0
        )
      )
    });

    if( invSelectList.length > 0 ){

      if(!this.bShowActionAuthorization){

        this.bShowActionAuthorization = true;
        this.servicesGServ.disableEnableButton( idHtml, true );
  
        this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de cancelar la devolución'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: ( resp ) =>{
  
            if(resp){
  
              var paramsMDL: any = {
                actionName: 'prod_VeryDevolutionInventario'
                , bShowAlert: false
              }
  
              this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
              .afterClosed().subscribe({
                next: ( auth_idUser ) =>{
  
                  if( auth_idUser ){
  
                    this.bShowActionAuthorization = false;
                    this.servicesGServ.disableEnableButton( idHtml, false );
  
                    this.bShowSpinner = true;
  
                    let oParams: any = {
                      auth_idUser: auth_idUser
                      , invSelectList: invSelectList
                    } 
  
                    this.productsServ.CCancelDevolution( oParams )
                    .subscribe({
                      next: (resp: any) => {
  
                        if( resp.status === 0 ){
  
                          this.fn_getInventarylog_devolution();
  
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

    }else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Debe seleccionar las devoluciones que quiere cancelar.", false);
    }

  }

bShowActionAuthorization2 = false;
fn_saveDevoluInventario( idHtml: string ){

  if(!this.bShowActionAuthorization2){

    this.bShowActionAuthorization2 = true;
    this.servicesGServ.disableEnableButton( idHtml, true );

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de hacer una devolución'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          var paramsMDL: any = {
            actionName: 'prod_DevolutionInventario'
            , bShowAlert: false
          }

          this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
          .afterClosed().subscribe({
            next: ( auth_idUser ) =>{

              if( auth_idUser ){

                this.bShowActionAuthorization2 = false;
                this.servicesGServ.disableEnableButton( idHtml, false );

                this.bShowSpinner = true;

                this.parametersForm.auth_idUser = auth_idUser;

                this.productsServ.CSaveDevoluInventario( this.parametersForm )
                .subscribe({
                  next: (resp: any) => {

                    if( resp.status === 0 ){

                      this.fn_getInventarylog_devolution();
                      this.parametersForm.justify = '';

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
                this.bShowActionAuthorization2 = false;
                this.servicesGServ.disableEnableButton( idHtml, false );
              }

            }
          });

        }
        else{
          this.bShowActionAuthorization2 = false;
          this.servicesGServ.disableEnableButton( idHtml, false );
        }

      }
    });

  }

}

fn_getProductByBarCode() {

  if(this.parametersForm.barCode.length > 0){

    this.bShowSpinner = true;


    this.productsServ.CGetProductByBarCode( this.parametersForm.barCode, this.idUserLogON )
      .subscribe({
        next: (resp: ResponseGet) => {

          if( resp.status === 0 ){

            this.parametersForm.idProduct = resp.data.idProduct ;
            this.parametersForm.productDesc = resp.data.name;

            this.parametersForm.catInventary = resp.data.catInventary;

            this.nextInputFocus( this.tbxJustify, 500);

          }else{

            this.parametersForm.barCode = '';
            this.parametersForm.idProduct = 0;
            this.parametersForm.productDesc = '';

            this.parametersForm.catInventary = 0;

          }

          this.servicesGServ.showAlertIA(resp, false);
          this.bShowSpinner = false;

        },
        error: (ex) => {

          this.servicesGServ.showSnakbar( "Problemas con el servicio" );
          this.bShowSpinner = false;

        }
      })

  }

}


fn_updateFirmaEntradaInventario( iOption: any, idHtml: string ){

  let invSelectList = this.catlist.filter(function( item: any ) {
    return ( item.select == true
      &&
      (
        item.firmaVer == 0
        || item.firmaMost == 0
      )
    )
  });

  console.log( invSelectList )

  if(!this.bShowActionAuthorization){

    this.bShowActionAuthorization = true;
    this.servicesGServ.disableEnableButton( idHtml, true );

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de verificar la devolución'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          var paramsMDL: any = {
            actionName: 'prod_VeryDevolutionInventario'
            , bShowAlert: false
          }

          this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
          .afterClosed().subscribe({
            next: ( auth_idUser ) =>{

              if( auth_idUser ){

                this.bShowActionAuthorization = false;
                this.servicesGServ.disableEnableButton( idHtml, false );

                this.bShowSpinner = true;

                this.parametersForm.iOption = iOption;
                this.parametersForm.auth_idUser = auth_idUser;
                this.parametersForm.invSelectList = invSelectList;

                this.productsServ.CUpdateFirmaDevoluInventario( this.parametersForm )
                .subscribe({
                  next: (resp: any) => {

                    if( resp.status === 0 ){

                      this.fn_getInventarylog_devolution();

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

fn_getInventarylog_devolution() {

  this.bShowSpinner = true;

  this.productsServ.CGetInventarylog_devolution( this.pagination, this.parametersFilters )
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

    this.nextInputFocus( this.tbxJustify, 500);

  }, 1);

}

cbxProducts_Clear(){
  this.parametersForm.idProduct = 0;
  this.parametersForm.productDesc = '';
}
//--------------------------------------------------------------------------

}
