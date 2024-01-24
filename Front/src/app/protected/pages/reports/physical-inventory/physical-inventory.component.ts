import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../security/users/mdl/action-authorization/action-authorization.component';

@Component({
  selector: 'app-physical-inventory',
  templateUrl: './physical-inventory.component.html',
  styleUrls: ['./physical-inventory.component.css']
})
export class PhysicalInventoryComponent {

// #region VARIABLES

  @ViewChild('barCode') barCode!: ElementRef;

  bShowSpinner: boolean = false;

  catlist: any = [];

  oPhysicalInventoryHeader: any = {
    idPhysicalInventory: 0,
    createDate: '',
    createDateDate: '',
    createDateHours: '',
    idSucursal: 0,
    idStatus: 0,
    statusName: '',
    idUser: 0,
    userName: '',
    bOK: 0,
    bOKNow: 0,
    active: 0,
    faltantePz: 0,
    faltanteCostMXN: 0,
    faltantePriceMXN: 0,
    sobrantePz: 0,
    sobranteCostMXN: 0,
    sobrantePriceMXN: 0,
  };



  productData: any = {

    idProduct: 0,
    barCode: '',
    description: ''

  }

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

// #endregion

  constructor(
  private dialogRef: MatDialogRef<PhysicalInventoryComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private productsServ: ProductsService

  ) { }

  ngOnInit(): void {

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( this.ODataP.idPhysicalInventory.length > 0 ){

      this.fn_getPhysicalInventoryHeader();

    }

  }

// #region MÉTODOS PARA FRONT

  hasPermissionAction( action: string ): boolean{
    return this.authServ.hasPermissionAction(action);
  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  ///************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getPhysicalInventoryDetailListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getPhysicalInventoryDetailListWithPage();
    }
    ////************************************************ */

// #endregion

// #region EVENTOS
bShowActionAuthorization: boolean = false;
ev_onMostradorChange(item: any, cantidad: number){

  if(!this.bShowActionAuthorization){

    this.bShowActionAuthorization = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está modificando el dato del mostrador'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        
        if(resp){
  
          var paramsMDL: any = {
            actionName: 'inv_ModifMostradorInventarioFisico'
            , bShowAlert: false
          }
        
          this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
          .afterClosed().subscribe({
            next: ( resp ) =>{
        
              if( resp ){

                this.bShowActionAuthorization = false;
  
                this.bShowSpinner = true;
  
                var oParams: any = {
                  idPhysicalInventory: item.idPhysicalInventory,
                  idPhysicalInventoryDetail: item.idPhysicalInventoryDetail,
                  cantidad: cantidad,
                }
  
                this.productsServ.CUpdateMostradorPhysicalInventoryDetail( oParams )
                .subscribe({
                  next: (resp: any) => {

                    if( resp.status === 0 ){
  
                        this.fn_getPhysicalInventoryHeader();
                        
                        
                    }
  
                    this.servicesGServ.showAlertIA( resp );
                    
                    this.bShowSpinner = false;
          
                  },
                  error: (ex) => {
          
                    this.servicesGServ.showSnakbar( ex.error.message );
                    this.bShowSpinner = false;

                    this.bShowActionAuthorization = false;
          
                  }
                });
  
              }else{
                this.bShowActionAuthorization = false;
                setTimeout (() => {
                  if(this.oPhysicalInventoryHeader.idStatus == 1){
                    this.barCode.nativeElement.focus();
                  }
                }, 1000);
              }
  
            }
          });
  
        }else{
          this.bShowActionAuthorization = false;
          setTimeout (() => {
            if(this.oPhysicalInventoryHeader.idStatus == 1){
              this.barCode.nativeElement.focus();
            }
          }, 1000);
        }
        
      }
    });

  }

}

ev_fn_barCode_keyup_enter(event: any){
  if(event.keyCode == 13) { // PRESS ENTER
    
    if( this.productData.barCode.length > 0){
      this.fn_verifyProductInPhysicalInventoryDetail();
    }

  }
}

// #endregion



// #region CONEXIONES AL BACK

  fn_getPhysicalInventoryHeader() {

    this.catlist = [];

    this.bShowSpinner = true;
    this.productsServ.CGetPhysicalInventoryHeader( this.ODataP.idPhysicalInventory )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)

        if( resp.status == 0 ){

          this.oPhysicalInventoryHeader = resp.data;
          this.fn_getPhysicalInventoryDetailListWithPage();

          setTimeout (() => {
            if(this.oPhysicalInventoryHeader.idStatus == 1){
              this.barCode.nativeElement.focus();
            }
          }, 1000);

        }

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex )
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }

  fn_changeStatusPhysicalInventory( idStatus: number ){

    if(!this.bShowActionAuthorization){

      this.bShowActionAuthorization = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de cambiar el Estatus del inventario físico'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          
          if(resp){

            if( idStatus == 3 || idStatus == 4 ){

              var paramsMDL: any = {
                actionName: ( idStatus == 3 ? 'inv_VerificarInventarioFisico' : 'inv_TerminarinventarioFisico' ) 
                , bShowAlert: false
              }
            
              this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
              .afterClosed().subscribe({
                next: ( resp ) =>{
            
                  if( resp ){

                    this.bShowActionAuthorization = false;
    
                    this.bShowSpinner = true;
  
                    var paramsAction: any = {
                      idPhysicalInventory: this.ODataP.idPhysicalInventory 
                      , idStatus: idStatus
                    }
          
                    this.productsServ.CChangeStatusPhysicalInventory( paramsAction )
                    .subscribe({
                      next: (resp: any) => {
              
                        if( resp.status === 0 ){
          
                            this.fn_getPhysicalInventoryHeader();
                            
                        }
                        
                        this.servicesGServ.showAlertIA( resp );
                        
                        this.bShowSpinner = false;
              
                      },
                      error: (ex) => {
              
                        this.servicesGServ.showSnakbar( ex.error.message );
                        this.bShowSpinner = false;
              
                      }
                    });
      
                  }else{
                    this.bShowActionAuthorization = false;
                  }
      
                }
              });

            }else{

              this.bShowActionAuthorization = false;

              this.bShowSpinner = true;
  
              var paramsAction: any = {
                idPhysicalInventory: this.ODataP.idPhysicalInventory 
                , idStatus: idStatus
              }
    
              this.productsServ.CChangeStatusPhysicalInventory( paramsAction )
              .subscribe({
                next: (resp: any) => {
        
                  if( resp.status === 0 ){
    
                      this.fn_getPhysicalInventoryHeader();
                      
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
  
          }
          
        }
      });
    }else{
      this.bShowActionAuthorization = false;
    }

  }

  fn_verifyProductInPhysicalInventoryDetail() {

    if(this.productData.barCode.length > 0){
      
      this.bShowSpinner = true;

      var OParams: any = {
        idPhysicalInventory: this.ODataP.idPhysicalInventory,
        barCode: this.productData.barCode
      }

      this.productsServ.CVerifyPhysicalInventoryDetail( OParams )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            console.log(resp)
            
            this.productData.description = resp.message

            this.productData.barCode = '';

            this.fn_getPhysicalInventoryDetailListWithPage();

            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })

    }

  }

  fn_getPhysicalInventoryDetailListWithPage() {

    this.catlist = [];

    this.bShowSpinner = true;
    this.productsServ.CGetPhysicalInventoryDetailListWithPage( this.pagination, this.ODataP.idPhysicalInventory )
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

  

}
