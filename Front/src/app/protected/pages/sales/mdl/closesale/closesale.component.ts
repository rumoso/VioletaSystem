import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-closesale',
  templateUrl: './closesale.component.html',
  styleUrls: ['./closesale.component.css']
})
export class ClosesaleComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////
  
  bShowSpinner: boolean = false;
  bPago: boolean = false;

  @ViewChild('tbxAnticipo') tbxAnticipo!: ElementRef;
  @ViewChild('cbxFormasPagoCBX') cbxFormasPagoCBX!: ElementRef;
  @ViewChild('tbxPaga') tbxPaga!: ElementRef;
  @ViewChild('tbxPagaCon') tbxPagaCon!: ElementRef;
  @ViewChild('tbxReferencia') tbxReferencia!: ElementRef;
  @ViewChild('tbxCambio') tbxCambio!: ElementRef;
  @ViewChild('btnSaveSale') btnSaveSale!: ElementRef;

  salesPayment: any = {

    anticipo: 0,

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

    saldoACubrir: 0,
    pendingAmount: 0

  };

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////


  constructor(
    private dialogRef: MatDialogRef<ClosesaleComponent>
    ,@Inject(MAT_DIALOG_DATA) public data: any

    , private servicesGServ: ServicesGService
    , private authServ: AuthService

    , private salesServ: SalesService

    ,private formaPagoServ: FormapagoService
  ) { }

  ngOnInit(): void {

    this.data.salesPayment = [];


    if(this.data.bCredito){
      this.salesPayment.saldoACubrir = this.salesPayment.anticipo;
      this.salesPayment.pendingAmount = this.salesPayment.anticipo;
    }else{
      this.salesPayment.saldoACubrir = this.data.total;
      this.salesPayment.pendingAmount = this.data.total;
    }

  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

  fn_saveSale() {

    if(this.event_fnAllOKToSave()){

      if(!this.bPago){
        this.bPago = true;

        this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de guardar la venta'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: ( resp ) =>{
            if(resp){
            
              this.bShowSpinner = true;

              this.salesServ.CInsertSale( this.data )
                .subscribe({
                  next: (resp: ResponseDB_CRUD) => {
          
                    if( resp.status === 0 ){
                      this.data.idSale = resp.insertID;
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

            }
            else{
              this.bPago = false;
            }
          }
        });
      }
      
    } 
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

  saveAndPrint(){
    this.fn_saveSale();
  }

  close(){
    this.dialogRef.close();
  }

  public inputFocus(idInput: any) {
    if(idInput != null) { // PRESS ENTER
      idInput.focus();
    }
  }

  addSalesPayment(){

    var salePayment: any = {
      idFormaPago: this.salesPayment.idFormaPago,
      formaPagoDesc: this.salesPayment.formaPagoDesc,
      paga: this.salesPayment.paga,
      referencia: this.salesPayment.referencia,
      anticipo: this.salesPayment.anticipo,
    }

    this.data.salesPayment.push(salePayment);
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

  event_fn_anticipo_keyup_enter(event: any, idInput: any){
    if(event.keyCode == 13) { // PRESS ENTER

      if( this.salesPayment.anticipo < this.data.total ){
        this.salesPayment.saldoACubrir = this.salesPayment.anticipo;
        this.salesPayment.pendingAmount = this.salesPayment.anticipo;
      
        if(this.data.bCredito && this.salesPayment.anticipo > 0){
          this.cbxFormasPagoCBX.nativeElement.focus();
        }
        else{
          this.tbxPaga.nativeElement.focus();
        }
  
      }else{
        this.servicesGServ.showSnakbar( "El anticipo debe ser menor al total" );
      }

        
    }
  }

  event_fn_Paga( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER

      if(
        (
          (
            this.salesPayment.paga > 0
            && this.salesPayment.saldoACubrir > 0
          )
          ||
          (
            this.salesPayment.paga == 0
            && this.salesPayment.saldoACubrir == 0
          )
        )
        && this.salesPayment.paga <= this.salesPayment.saldoACubrir ){


        /// SI ES PAGO EN EFECTIVO
        if( this.salesPayment.idFormaPago == 1 || this.salesPayment.idFormaPago == 3 ){
          this.tbxPagaCon.nativeElement.focus();

          }else if( this.salesPayment.needRef == 1 ){
            this.tbxReferencia.nativeElement.focus();
            
          }else if(this.salesPayment.saldoACubrir == 0){
            this.fn_saveSale()
          }


      }
      else{
        this.servicesGServ.showAlert('W', 'Alerta!', "Saldas con " + this.salesPayment.saldoACubrir, true);
      }

    }
    
  }

  event_fn_PagaCon_GetCambio( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER

      if( this.salesPayment.needFxRate && this.salesPayment.pagaCon > 0 && this.salesPayment.paga > 0){
        this.salesPayment.pagaCon = this.salesPayment.pagaCon * this.salesPayment.fxRate;
      }
      
      if( this.salesPayment.paga > 0 && this.salesPayment.pagaCon >= this.salesPayment.paga){
        this.salesPayment.cambio = this.salesPayment.pagaCon - this.salesPayment.paga;
  
        this.salesPayment.saldoACubrir -= this.salesPayment.paga;
        

        this.addSalesPayment();

        this.tbxCambio.nativeElement.focus();
      }else{
        this.servicesGServ.showAlert('W', 'Alerta!', "No está cubriendo el monto a pagar: " + this.salesPayment.paga, true);
      }

    }
    
  }

  event_fn_Referencia( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER
  
      /// SI ES PAGO EN EFECTIVO
      if( this.salesPayment.referencia != '' ){

        if( this.salesPayment.idFormaPago > 0 && this.salesPayment.paga > 0 ){

          this.salesPayment.saldoACubrir -= this.salesPayment.paga;

          this.addSalesPayment();

          this.salesPayment.idFormaPago = 0;
          this.salesPayment.formaPagoDesc = '';
          this.salesPayment.needRef = 0;
          this.salesPayment.needFxRate = 0;
          this.salesPayment.idFxRate = 0;
          this.salesPayment.fxRate = 0;
      
          this.salesPayment.paga = 0;
      
          this.salesPayment.pagaCon = 0;
          this.salesPayment.cambio = 0;
      
          this.salesPayment.referencia = '';

          if(this.salesPayment.saldoACubrir > 0){
            setTimeout (() => {
              this.cbxFormasPagoCBX.nativeElement.focus();
            }, 500);
          }else{
            setTimeout (() => {
              this.fn_saveSale()
            }, 500);
          }

        }
        else{
          this.servicesGServ.showAlert('W', 'Alerta!', 
          this.salesPayment.idFormaPago == 0 ? "Selecciona forma de pago" :
          this.salesPayment.paga == 0 ? "Debe indicar cuanto paga" : "", true);
        }

      }
  
    }
    
  }

  event_fn_Cambio( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER
  
        this.salesPayment.idFormaPago = 0;
        this.salesPayment.formaPagoDesc = '';
        this.salesPayment.needRef = 0;
        this.salesPayment.needFxRate = 0;
        this.salesPayment.idFxRate = 0;
        this.salesPayment.fxRate = 0;
    
        this.salesPayment.paga = 0;
    
        this.salesPayment.pagaCon = 0;
        this.salesPayment.cambio = 0;
    
        this.salesPayment.referencia = '';

        if(this.salesPayment.saldoACubrir > 0){
          setTimeout (() => {
            this.cbxFormasPagoCBX.nativeElement.focus();
          }, 500);
        }else{
          this.fn_saveSale()
        }

        
    
    }
    
  }

  event_fnAllOKToSave(): boolean {
    let bOK = false;
  
    if( this.data.idCustomer > 0 // QUE TENGA CLIENTE
      && this.data.idSaleType > 0 // QUE TENGA CONDICION DE PAGO
      && this.data.saleDetail.length > 0 // QUE SE HAYA AGREGADO UN PRODUCTO
      && this.data.total > 0 // QUE EL TOTAL SEA MAYOR
      &&
      (
        (
          this.salesPayment.saldoACubrir == 0
          && this.salesPayment.anticipo == 0
        )
        ||
        (
          this.salesPayment.saldoACubrir == 0
          && this.data.salesPayment.length > 0
        )
      )
      )
      {
        bOK = true;
      }
  
    return bOK;
  }

  event_fnClick_DeleteSalesPaymentFromList( index: number ){

    this.data.salesPayment.splice( index, 1 );

    var acumulado = this.data.salesPayment.reduce((sum: any, x: any) => sum + x.paga, 0);

    this.salesPayment.saldoACubrir = this.salesPayment.pendingAmount - acumulado;
  }

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
      this.formaPagoServ.CCbxGetFormaPagoCombo( this.salesPayment.formaPagoDesc )
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

  cbxFormasPago_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.salesPayment.idFormaPago = ODataCbx.id;
    this.salesPayment.formaPagoDesc = ODataCbx.name;
    this.salesPayment.needRef = ODataCbx.needRef;
    this.salesPayment.needFxRate = ODataCbx.needFxRate;
    this.salesPayment.idFxRate = ODataCbx.idFxRate;
    this.salesPayment.fxRate = ODataCbx.fxRate;

      setTimeout (() => {
        this.tbxPaga.nativeElement.focus();
      }, 500);

  }

  cbxFormasPago_Clear(){
    this.salesPayment.idFormaPago = 0;
    this.salesPayment.formaPagoDesc = '';
    this.salesPayment.needRef = 0;
    this.salesPayment.needFxRate = 0;
    this.salesPayment.idFxRate = 0;
    this.salesPayment.fxRate = 0;

    this.salesPayment.paga = 0;
    this.salesPayment.pagaCon = 0;
    this.salesPayment.cambio = 0;
    this.salesPayment.referencia = '';
  }
  //--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
}
