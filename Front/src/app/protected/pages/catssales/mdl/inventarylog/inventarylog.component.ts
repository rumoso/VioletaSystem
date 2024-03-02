import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'src/environments/environment';
import { ElectronicMoneyMDLComponent } from '../electronic-money-mdl/electronic-money-mdl.component';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ProductsService } from 'src/app/protected/services/products.service';
import { ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { HttpErrorResponse } from '@angular/common/http';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';

@Component({
  selector: 'app-inventarylog',
  templateUrl: './inventarylog.component.html',
  styleUrls: ['./inventarylog.component.css']
})
export class InventarylogComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

private _appMain: string = environment.appMain;

@ViewChild('tbxNoEntrada') tbxNoEntrada!: ElementRef;
@ViewChild('tbxDescription') tbxDescription!: ElementRef;
@ViewChild('tbxCantidad') tbxCantidad!: ElementRef;

title: string = 'Inventario';
bShowSpinner: boolean = false;

idUserLogON: number = 0;

inventaryLogForm: any = {

  idProduct: 0,
  cantidad: 0,
  description: '',
  noEntrada: '',
  idUserAutorizante: 0

};

//-------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

constructor(
  private dialogRef: MatDialogRef<ElectronicMoneyMDLComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any


  , private servicesGServ: ServicesGService

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private authServ: AuthService

  , private productsServ: ProductsService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.inventaryLogForm.idProduct = this.ODataP.idProduct;
    
    this.nextInputFocus( this.tbxNoEntrada, 500 );

  }

  public nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
}


//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

bInsertInventaryLog: boolean = false;
bShowActionAuthorization: boolean = false;
fn_insertInventaryLog() {

  if( this.inventaryLogForm.idProduct > 0 && this.inventaryLogForm.cantidad != 0 ){

    this.bInsertInventaryLog = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de modificar el inventario del producto'
    , '¿Desea continuar?'
    , 'Si', 'No')
      .afterClosed().subscribe({
      next: ( resp: any ) =>{

        this.bInsertInventaryLog = false;

        if(resp){

          if( this.inventaryLogForm.cantidad > 0 ){

            this.bShowSpinner = true;

            this.inventaryLogForm.idUserAutorizante = 0;

            this.productsServ.CInsertInventaryLog( this.inventaryLogForm )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {
  
                if( resp.status === 0 ){
                  this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                  this.fn_CerrarMDL();
                }
                else{
                  this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                }
  
                this.bShowSpinner = false;
  
                this.event_clear();
  
              },
              error: (ex) => {
                
                this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                this.bShowSpinner = false;
  
              }
            })

          }else{

            var paramsMDL: any = {
              actionName: 'prod_SalidaInventario'
              , bShowAlert: false
            }
          
            this.servicesGServ.showModalWithParams( ActionAuthorizationComponent, paramsMDL, '400px')
            .afterClosed().subscribe({
              next: ( resp ) =>{
          
                if( resp ){

                  this.bShowActionAuthorization = false;

                  this.bShowSpinner = true;

                  this.inventaryLogForm.idUserAutorizante = resp;

                  this.productsServ.CInsertInventaryLog( this.inventaryLogForm )
                    .subscribe({
                    next: (resp: ResponseDB_CRUD) => {
        
                      if( resp.status === 0 ){
                        this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
                        this.fn_CerrarMDL();
                      }
                      else{
                        this.servicesGServ.showAlert('W', 'Alerta!', resp.message, true);
                      }
        
                      this.bShowSpinner = false;
        
                      this.event_clear();
        
                    },
                    error: (ex) => {
                      
                      this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                      this.bShowSpinner = false;
        
                    }
                  })

                }
                else{
                  this.bShowActionAuthorization = false;
                }

              }
            });

          }

        }
      }
    });

  }

}


//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_CerrarMDL(){
  this.dialogRef.close( true );
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_clear(){
  this.inventaryLogForm.description = '';
  this.inventaryLogForm.cantidad = 0;
  this.nextInputFocus( this.tbxDescription, 500 );

}

ev_fn_noEntrada_keyup_enter(event: any){
  
  if(event.keyCode == 13) { // PRESS ENTER
    
    this.nextInputFocus( this.tbxDescription, 0 );

  }

}

ev_fn_description_keyup_enter(event: any){
  
  if(event.keyCode == 13) { // PRESS ENTER
    
    if( this.inventaryLogForm.description.length > 0 ){
      this.nextInputFocus( this.tbxCantidad, 0 );
    }

  }

}

ev_fn_amount_keyup_enter(event: any){
  
  if(event.keyCode == 13) { // PRESS ENTER
    
    if( this.inventaryLogForm.cantidad != 0 ){
      this.fn_insertInventaryLog();
    }

  }

}
//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////







//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////


}