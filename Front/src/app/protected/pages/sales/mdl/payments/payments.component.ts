import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.css']
})
export class PaymentsComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  bShowSpinner: boolean = false;
  bPago: boolean = false;

  @ViewChild('cbxFormasPagoC') cbxFormasPagoC!: ElementRef;
  @ViewChild('tbxPaga') tbxPaga!: ElementRef;
  @ViewChild('tbxPagaCon') tbxPagaCon!: ElementRef;
  @ViewChild('tbxReferencia') tbxReferencia!: ElementRef;
  @ViewChild('tbxCambio') tbxCambio!: ElementRef;
  @ViewChild('btnSaveSale') btnSaveSale!: ElementRef;

  pendingAmount: number = 0;
  saldoACubrir: number = 0;
  showPending: boolean = false;
  idSale: any = 0;

  paymentList: any = [];

  paymentForm: any = {

    idCaja: 0,
    idCustomer: 0,

    idFormaPago: 0,
    formaPagoDesc: '',
    needRef: 0,
    needFxRate: 0,
    idFxRate: 0,
    fxRate: 0,
    electronicMoneySum: 0,

    paga: 0,
    pagaF: 0,

    pagaCon: 0,
    cambio: 0,

    referencia: ''

  };

  interface: any = {
    showReferencia: false,
    showFxRate: false
  }

  selectCajas: any = {
    idSucursal: 0,
    idCaja: 0,
    cajaDesc: '',
    impresoraName: ''
  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

constructor(
  private dialogRef: MatDialogRef<PaymentsComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private salesServ: SalesService

  ,private formaPagoServ: FormapagoService
  , private printTicketServ: PrintTicketService
) { }

ngOnInit(): void {

  console.log( this.ODataP )

  this.paymentList = [];

  this.idSale = this.ODataP.idSale;

  this.paymentForm.idCaja = this.ODataP.idCaja;
  this.paymentForm.idCustomer = this.ODataP.idCustomer;

  if(this.ODataP.pendingAmount > 0){

    this.ODataP.pendingAmount = parseFloat( this.ODataP.pendingAmount.toFixed(2) );

    this.pendingAmount = this.ODataP.pendingAmount;
    this.saldoACubrir = this.ODataP.pendingAmount;
    this.showPending = true;
  }

  setTimeout (() => {
    this.cbxFormasPagoC.nativeElement.focus();
  }, 1000);

  this.selectCajas = this.ODataP.selectCajas;

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

async fn_savePayment() {

  if( this.ODataP.idSaleType != 2
    ||
    this.pendingAmount == 0 ){
      if(!this.bPago){
        this.bPago = true;

        this.servicesGServ.showDialog('¿Estás seguro?'
        , 'Está a punto de guardar el pago'
        , '¿Desea continuar?'
        , 'Si', 'No')
        .afterClosed().subscribe({
          next: async( resp ) =>{
            if(resp){

              this.bPago = false;

              this.bShowSpinner = true;

              this.salesServ.CInsertPayments( this.paymentList, this.paymentForm.idCaja, this.paymentForm.idCustomer )
                .subscribe({
                  next: async (resp: ResponseDB_CRUD) => {

                    if( resp.status === 0 ){
                      this.printTicketServ.printTicket("Payments", this.idSale, this.selectCajas.idPrinter, this.paymentList.length, '');
                      console.log(this.idSale)
                      this.dialogRef.close( this.idSale );
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
  //this.fn_saveSale();
}

close(){
  this.dialogRef.close();
}

public inputFocus(idInput: any) {
  if(idInput != null) { // PRESS ENTER
    idInput.focus();
  }
}

addPayment(){

  var Payment: any = {
    idRelation: this.ODataP.idSale,
    relationType: this.ODataP.relationType,
    idSeller_idUser: this.ODataP.idSeller_idUser,

    idFormaPago: this.paymentForm.idFormaPago,
    formaPagoDesc: this.paymentForm.formaPagoDesc,
    paga: this.paymentForm.paga,
    pagaF: this.paymentForm.pagaF,
    referencia: this.paymentForm.referencia,
    description: 'Pago',
    idFxRate: this.paymentForm.idFxRate,
    fxRate: this.paymentForm.fxRate
  }

  this.paymentList.push(Payment);

  this.ev_showInterface();

}


fn_CerrarMDL(){
  this.dialogRef.close( this.ODataP.idSale );
}

public nextInputFocus( idInput: any, milliseconds: number ) {
  setTimeout (() => {
    idInput.nativeElement.focus();
  }, milliseconds);
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE MÉTODOS CON EL FRONT
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

event_fn_Paga( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    if(
      this.paymentForm.paga > 0
      && this.pendingAmount > 0
      && this.paymentForm.paga <= this.pendingAmount ){


      /// SI ES PAGO EN EFECTIVO
      if( this.paymentForm.idFormaPago == 1 || this.paymentForm.idFormaPago == 3 ){
        this.tbxPagaCon.nativeElement.focus();

      }else if( this.paymentForm.needRef == 1 ){
        this.tbxReferencia.nativeElement.focus();

      }else if( this.paymentForm.idFormaPago == 5 ){

        if( this.ev_getSumElectronicCurrency() >= this.paymentForm.paga ){

          this.pendingAmount -= this.paymentForm.paga;
          this.pendingAmount = parseFloat( this.pendingAmount.toFixed(2) );

          this.addPayment();

          this.paymentForm.idFormaPago = 0;
          this.paymentForm.formaPagoDesc = '';
          this.paymentForm.needRef = 0;
          this.paymentForm.needFxRate = 0;
          this.paymentForm.idFxRate = 0;
          this.paymentForm.fxRate = 0;
          this.paymentForm.electronicMoneySum = 0;

          this.paymentForm.paga = 0;
          this.paymentForm.pagaF = 0;

          this.paymentForm.pagaCon = 0;
          this.paymentForm.cambio = 0;

          this.paymentForm.referencia = '';

          //this.cbxFormasPagoC.nativeElement.focus();

          this.fn_savePayment();

        }else{
          this.servicesGServ.showAlert('W', 'Alerta!', "Solo tienes " + ( this.ev_getSumElectronicCurrency() ) + " de dinero electrónico", true);
        }

      }


    }
    else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Saldas con " + this.pendingAmount, true);
    }

  }

}

event_fn_PagaCon_GetCambio( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    if( this.paymentForm.needFxRate && this.paymentForm.pagaCon > 0 && this.paymentForm.paga > 0){
      this.paymentForm.pagaF = this.paymentForm.pagaCon;
      this.paymentForm.pagaCon = this.paymentForm.pagaCon * this.paymentForm.fxRate;
    }

    if( this.paymentForm.paga > 0 && this.paymentForm.pagaCon >= this.paymentForm.paga && this.paymentForm.paga <= this.pendingAmount ){
      this.paymentForm.cambio = this.paymentForm.pagaCon - this.paymentForm.paga;

      this.pendingAmount -= this.paymentForm.paga;
      this.pendingAmount = parseFloat( this.pendingAmount.toFixed(2) );


      this.addPayment();

      this.paymentForm.paga = 0;
      this.paymentForm.pagaCon = 0;

      this.tbxCambio.nativeElement.focus();
    }else{
      this.servicesGServ.showAlert('W', 'Alerta!',
      !( this.paymentForm.pagaCon >= this.paymentForm.paga ) ? "No está cubriendo el monto a pagar: " + this.paymentForm.paga :
        this.paymentForm.paga == 0 ? "Debe indicar cuanto paga" :
        this.paymentForm.paga > this.pendingAmount ? "Saldas con " + this.pendingAmount : "", true);
    }

  }

}

event_fn_Referencia( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

    /// SI ES PAGO EN EFECTIVO
    if( this.paymentForm.referencia != '' ){

      if( this.paymentForm.idFormaPago > 0 && this.paymentForm.paga > 0 && this.paymentForm.paga <= this.pendingAmount ){

        this.pendingAmount -= this.paymentForm.paga;
        this.pendingAmount = parseFloat( this.pendingAmount.toFixed(2) );

        this.addPayment();

        this.paymentForm.idFormaPago = 0;
        this.paymentForm.formaPagoDesc = '';
        this.paymentForm.needRef = 0;
        this.paymentForm.needFxRate = 0;
        this.paymentForm.idFxRate = 0;
        this.paymentForm.fxRate = 0;
        this.paymentForm.electronicMoneySum = 0;

        this.paymentForm.paga = 0;
        this.paymentForm.pagaF = 0;

        this.paymentForm.pagaCon = 0;
        this.paymentForm.cambio = 0;

        this.paymentForm.referencia = '';

        // if(this.pendingAmount > 0){
        //   setTimeout (() => {
        //     this.cbxFormasPagoCBX.nativeElement.focus();
        //   }, 500);
        // }else{
        //     this.fn_savePayment()
        // }

        this.fn_savePayment();

      }
      else{
        this.servicesGServ.showAlert('W', 'Alerta!',
        this.paymentForm.idFormaPago == 0 ? "Selecciona forma de pago" :
        this.paymentForm.paga == 0 ? "Debe indicar cuanto paga" :
        this.paymentForm.paga > this.pendingAmount ? "Saldas con " + this.pendingAmount : "", true);
      }

    }

  }

}

event_fn_Cambio( event: any ){

  if(event.keyCode == 13) { // PRESS ENTER

      this.paymentForm.idFormaPago = 0;
      this.paymentForm.formaPagoDesc = '';
      this.paymentForm.needRef = 0;
      this.paymentForm.needFxRate = 0;
      this.paymentForm.idFxRate = 0;
      this.paymentForm.fxRate = 0;
      this.paymentForm.electronicMoneySum = 0;

      this.paymentForm.paga = 0;
      this.paymentForm.pagaF = 0;

      this.paymentForm.pagaCon = 0;
      this.paymentForm.cambio = 0;

      this.paymentForm.referencia = '';

      // if(this.pendingAmount > 0){
      //   setTimeout (() => {
      //     this.cbxFormasPagoCBX.nativeElement.focus();
      //   }, 500);
      // }else{
      //   this.fn_savePayment()
      // }

      this.fn_savePayment()



  }

}



event_fnClick_DeleteSalesPaymentFromList( index: number ){

  this.paymentList.splice( index, 1 );

  var acumulado = this.paymentList.reduce((sum: any, x: any) => sum + x.paga, 0);

  this.pendingAmount = this.saldoACubrir - acumulado;
  this.pendingAmount = parseFloat( this.pendingAmount.toFixed(2) );
}

ev_showInterface(){

  this.interface.showReferencia = this.paymentList.filter(function( item: any ) {
    return item.referencia.length > 0
  }).length > 0;

  this.interface.showFxRate = this.paymentList.filter(function( item: any ) {
    return item.idFxRate > 0
  }).length > 0;

}

ev_getSumElectronicCurrency(){
  var sumElectronicCurrency: number = 0;

  var electronicCurrencyList = this.paymentList.filter(function( item: any ) {
    return item.idFormaPago == 5
  });

  sumElectronicCurrency = electronicCurrencyList.reduce((sum: any, x: any) => sum + x.paga, 0);

  return this.paymentForm.electronicMoneySum - sumElectronicCurrency;
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
    this.formaPagoServ.CCbxGetFormaPagoCombo( this.paymentForm.formaPagoDesc, this.paymentForm.idCustomer )
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

  this.paymentForm.idFormaPago = ODataCbx.id;
  this.paymentForm.formaPagoDesc = ODataCbx.name;
  this.paymentForm.needRef = ODataCbx.needRef;
  this.paymentForm.needFxRate = ODataCbx.needFxRate;
  this.paymentForm.idFxRate = ODataCbx.idFxRate;
  this.paymentForm.fxRate = ODataCbx.fxRate;
  this.paymentForm.electronicMoneySum = ODataCbx.electronicMoneySum;

    setTimeout (() => {
      this.tbxPaga.nativeElement.focus();
    }, 500);

}

cbxFormasPago_Clear(){
  this.paymentForm.idFormaPago = 0;
  this.paymentForm.formaPagoDesc = '';
  this.paymentForm.needRef = 0;
  this.paymentForm.needFxRate = 0;
  this.paymentForm.idFxRate = 0;
  this.paymentForm.fxRate = 0;

  this.paymentForm.paga = 0;
  this.paymentForm.pagaF = 0;
  this.paymentForm.pagaCon = 0;
  this.paymentForm.cambio = 0;
  this.paymentForm.referencia = '';
}
//--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
}
