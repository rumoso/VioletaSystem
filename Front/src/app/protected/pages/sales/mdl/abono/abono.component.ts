import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-abono',
  templateUrl: './abono.component.html',
  styleUrls: ['./abono.component.css']
})
export class AbonoComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  bShowSpinner: boolean = false;
  bAbono: boolean = false;

  @ViewChild('cbxFormasPagoCBX') cbxFormasPagoCBX!: ElementRef;
  @ViewChild('tbxPaga') tbxPaga!: ElementRef;
  @ViewChild('tbxPagaCon') tbxPagaCon!: ElementRef;
  @ViewChild('tbxReferencia') tbxReferencia!: ElementRef;
  @ViewChild('tbxCambio') tbxCambio!: ElementRef;
  @ViewChild('btnSaveAbono') btnSaveAbono!: ElementRef;

  abonoForm: any = {

    idSeller_idUser: 0,
    idSale: 0,
    idCustomer: 0,

    idFormaPago: 0,
    formaPagoDesc: '',
    needRef: 0,
    needFxRate: 0,
    idFxRate: 0,
    fxRate: 0,

    paga: 0,

    pagaCon: 0,
    cambio: 0,

    referencia: '',

    pendingAmount: 0

  };

  abonoslist: any[] = [];

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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private dialogRef: MatDialogRef<AbonoComponent>
    ,@Inject(MAT_DIALOG_DATA) public data: any

    , private servicesGServ: ServicesGService
    , private authServ: AuthService

    , private salesServ: SalesService

    ,private formaPagoServ: FormapagoService
  ) { }

  ngOnInit(): void {

    this.abonoForm.idSale = this.data.idSale;
    this.abonoForm.idCustomer = this.data.idCustomer;
    this.abonoForm.idSeller_idUser = this.data.idUserLogON;
    this.abonoForm.pendingAmount = this.data.pendingAmount;

    this.fn_getAbonosBySaleListWithPage();
    
  }

  ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getAbonosBySaleListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getAbonosBySaleListWithPage();
    }
    ////************************************************ */

  //////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

fn_saveAbono() {

  if( !this.bAbono ){
    
    this.bAbono = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de guardar el abono'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
        
          this.bShowSpinner = true;

          this.salesServ.CInsertAbono( this.abonoForm )
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {
      
                if( resp.status === 0 ){
                  this.data.idAbono = resp.insertID;
                  this.dialogRef.close( this.data );
                }
      
                this.servicesGServ.showSnakbar(resp.message);
                this.bShowSpinner = false;
      
              },
              error: (ex) => {
      
                this.servicesGServ.showSnakbar( ex.error.message );
                this.bShowSpinner = false;
      
              }
            });

        }else{
          this.bAbono = false;
        }
      }
    });
  }

}

fn_getAbonosBySaleListWithPage() {

  if( this.abonoForm.idCustomer > 0 ){
    this.bShowSpinner = true;
    this.salesServ.CGetAbonosBySaleListWithPage( this.pagination, this.abonoForm.idSale )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.abonoslist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;
      }
    })
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

saveAndPrint(){
  this.fn_saveAbono();
}

close(){
  this.dialogRef.close();
}

public inputFocus(idInput: any) {
  if(idInput != null) { // PRESS ENTER
    idInput.focus();
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_fn_Paga( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    if( this.abonoForm.paga > 0 && this.abonoForm.paga <= this.abonoForm.pendingAmount ){

      /// SI ES PAGO EN EFECTIVO
      if( this.abonoForm.idFormaPago == 1 || this.abonoForm.idFormaPago == 3 ){
        this.tbxPagaCon.nativeElement.focus();

        }else if( this.abonoForm.needRef == 1 ){
          this.tbxReferencia.nativeElement.focus();
          
        }

    }
    else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Saldas con " + this.abonoForm.pendingAmount, true);
    }
  }
  
}

event_fn_PagaCon_GetCambio( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    if( this.abonoForm.needFxRate && this.abonoForm.pagaCon > 0 && this.abonoForm.paga > 0){
      this.abonoForm.pagaCon = this.abonoForm.pagaCon * this.abonoForm.fxRate;
    }

    if( this.abonoForm.paga > 0 && this.abonoForm.paga <= this.abonoForm.pendingAmount ){
    
      if(this.abonoForm.pagaCon >= this.abonoForm.paga){
        this.abonoForm.cambio = this.abonoForm.pagaCon - this.abonoForm.paga;

        this.tbxCambio.nativeElement.focus();
      }else{
        this.servicesGServ.showAlert('W', 'Alerta!', "No está cubriendo el monto a pagar: " + this.abonoForm.paga, true);
      }

    }
    else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Saldas con " + this.abonoForm.pendingAmount, true);
    }

  }
  
}

event_fn_Referencia( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    /// SI ES PAGO EN EFECTIVO
    if( this.abonoForm.referencia != '' ){

      if( this.abonoForm.idFormaPago > 0 && this.abonoForm.paga > 0
        && this.abonoForm.pendingAmount > 0){
          this.fn_saveAbono()
      }
      else{
        this.servicesGServ.showAlert('W', 'Alerta!', 
        this.abonoForm.idFormaPago == 0 ? "Selecciona forma de pago" :
        this.abonoForm.paga == 0 ? "Debe indicar cuanto paga" :
        this.abonoForm.pendingAmount < 1 ? "Ya no hay saldo pendiente" : "", true);
      }

      }

    }
  
}

event_fn_Cambio( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

      if( this.abonoForm.idFormaPago > 0 && this.abonoForm.paga > 0
        && this.abonoForm.pendingAmount > 0){
          this.fn_saveAbono()
      }
      else{
        this.servicesGServ.showAlert('W', 'Alerta!', 
        this.abonoForm.idFormaPago == 0 ? "Selecciona forma de pago" :
        this.abonoForm.paga == 0 ? "Debe indicar cuanto paga" :
        this.abonoForm.pendingAmount < 1 ? "Ya no hay saldo pendiente" : "", true);
      }
  
  }
  
}

// event_fnAllOKToSave(): boolean {
//   let bOK = false;

//   if( this.data.idCustomer > 0 // QUE TENGA CLIENTE
//     && this.data.idSaleType > 0 // QUE TENGA CONDICION DE PAGO
//     && this.data.saleDetail.length > 0 // QUE SE HAYA AGREGADO UN PRODUCTO
//     && this.data.total > 0 // QUE EL TOTAL SEA MAYOR
//     &&
//     (
//       (
//         this.salesPayment.saldoACubrir == 0
//         && this.salesPayment.anticipo == 0
//       )
//       ||
//       (
//         this.salesPayment.saldoACubrir == 0
//         && this.data.salesPayment.length > 0
//       )
//     )
//     )
//     {
//       bOK = true;
//     }

//   return bOK;
// }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////


  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxFormasPago: any[] = [];

  cbxFormasPago_Search() {
      this.formaPagoServ.CCbxGetFormaPagoCombo( this.abonoForm.formaPagoDesc )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxFormasPago = resp.data
           }
           else{
            this.cbxFormasPago = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxFormasPago_SelectedOption( event: MatAutocompleteSelectedEvent, idInput: any ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.abonoForm.idFormaPago = ODataCbx.id;
    this.abonoForm.formaPagoDesc = ODataCbx.name;
    this.abonoForm.needRef = ODataCbx.needRef;
    this.abonoForm.needFxRate = ODataCbx.needFxRate;
    this.abonoForm.idFxRate = ODataCbx.idFxRate;
    this.abonoForm.fxRate = ODataCbx.fxRate;

    setTimeout (() => {
      this.inputFocus(idInput);
    }, 500);

  }

  cbxFormasPago_Clear(){
    this.abonoForm.idFormaPago = 0;
    this.abonoForm.formaPagoDesc = '';
    this.abonoForm.needRef = 0;

    this.abonoForm.needFxRate = 0;
    this.abonoForm.idFxRate = 0;
    this.abonoForm.fxRate = 0;

    this.abonoForm.paga = 0;
    this.abonoForm.pagaCon = 0;
    this.abonoForm.cambio = 0;
    this.abonoForm.referencia = '';

  }
  //--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////

}
