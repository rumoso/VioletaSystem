import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-corte-caja',
  templateUrl: './corte-caja.component.html',
  styleUrls: ['./corte-caja.component.css'],
  providers: [DatePipe]
})
export class CorteCajaComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  @ViewChild('tbxPesosCaja') tbxPesosCaja!: ElementRef;
  @ViewChild('tbxDolaresCaja') tbxDolaresCaja!: ElementRef;
  @ViewChild('tbxVouchersCaja') tbxVouchersCaja!: ElementRef;
  @ViewChild('tbxTransferenciasCaja') tbxTransferenciasCaja!: ElementRef;
  @ViewChild('tbxTotalCaja') tbxTotalCaja!: ElementRef;
  @ViewChild('tbxDiferencia') tbxDiferencia!: ElementRef;
  @ViewChild('tbxComentarios') tbxComentarios!: ElementRef;



  idUserLogON: number = 0;
  bShowSpinner: boolean = false;
  idCaja: number = 0;

  selectedDate: any = '';

  preCorteCaja: any = {

    sales: 0,
    tallerSales: 0,
    egresos: 0,
    ingresoTotal: 0,
    ingresoReal: 0,
    pesos: 0,
    pesosCaja: 0,
    dolares: 0,
    dolaresF: 0,
    dolaresCaja: 0,
    fxRate: 0,
    dolaresMNX: 0,
    vouchers: 0,
    vouchersCaja: 0,
    transferencias: 0,
    transferenciasCaja: 0,
    dineroElectronico: 0,
    totalCaja: 0,
    diferencia: 0,
    observaciones: ''
  }

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
  private dialogRef: MatDialogRef<CorteCajaComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private datePipe: DatePipe

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private salesServ: SalesService

  , private printTicketServ: PrintTicketService
  , private printersServ: PrintersService
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.selectedDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd') + 'T00:00:00';

    console.log( this.ODataP )

    this.idCaja = this.ODataP.idCaja;

    if( this.ODataP.idCaja > 0 ){

       this.fn_getSelectPrintByIdUser( this.idUserLogON );
       this.fn_getPreCorteCaja( this.ODataP.idCaja );



    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_getPreCorteCaja( idCaja: number ) {

    this.bShowSpinner = true;

    var data: any = {
      idCaja: idCaja,
      selectedDate: this.selectedDate
    }

    this.salesServ.CGetPreCorteCaja( data )
    .subscribe( ( resp: any ) => {

      if(resp.status == 0){

        this.preCorteCaja = resp.data.rows;

        this.nextInputFocus( this.tbxPesosCaja, 500 );

      }

      this.bShowSpinner = false;

    } );

  }
  bContinueDialog = false;
  fn_InsertCorteCaja(){

    if(!this.bContinueDialog){
      this.bContinueDialog = true;


      this.fn_SUMAll();

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar el corte de caja'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{

          this.bContinueDialog = false;

          if(resp){

            this.bShowSpinner = true;

            const data: any = {
              idCaja: this.idCaja,
              selectedDate: this.selectedDate,
              preCorteCaja: this.preCorteCaja
            };

            this.salesServ.CInsertCorteCaja( data )
              .subscribe({
                next: (resp: ResponseDB_CRUD) => {

                  if( resp.status === 0 ){
                    //this.idSale = resp.insertID;
                    if(this.selectPrinter.idPrinter > 0){
                      this.printTicketServ.printTicket("CorteCaja", resp.insertID, this.selectPrinter.idPrinter, 1);
                    }

                    this.fn_CerrarMDL( resp.insertID );
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

      });
    }

  }

  fn_getSelectPrintByIdUser( idUser: number ) {

    this.printersServ.CGetSelectPrinterByIdUser( idUser )
    .subscribe({

      next: ( resp: ResponseGet ) => {

        if( resp.status == 0 ){

          this.selectPrinter.idSucursal = resp.data.idSucursal;
          this.selectPrinter.idPrinter = resp.data.idPrinter;
          this.selectPrinter.printerName = resp.data.printerName;

        }
        else{

          this.selectPrinter.idSucursal = 0;
          this.selectPrinter.idPrinter = 0;
          this.selectPrinter.printerName = '';

        }

        console.log( resp );
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar( ex.error.data );
      }

    })

  }

  // fn_InsertCorteCajaDetail( idCorteCaja: number ){

  //   this.bShowSpinner = true;

  //   this.salesServ.CInsertCorteCajaDetail( idCorteCaja, this.idCaja )
  //     .subscribe({
  //       next: (resp: ResponseDB_CRUD) => {

  //         if( resp.status === 0 ){
  //           //this.idSale = resp.insertID;
  //           this.fn_CerrarMDL( resp.insertID );
  //         }
  //         this.servicesGServ.showAlertIA( resp );
  //         this.bShowSpinner = false;

  //       },
  //       error: (ex) => {

  //         this.servicesGServ.showSnakbar( ex.error.message );
  //         this.bShowSpinner = false;

  //       }
  //     });

  // }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_SUMAll( ){

    this.preCorteCaja.totalCaja  =
      ( parseFloat( this.preCorteCaja.pesosCaja ?? 0 )
      + parseFloat( this.preCorteCaja.dolaresCaja ?? 0 )
      + parseFloat( this.preCorteCaja.vouchersCaja ?? 0 )
      + parseFloat( this.preCorteCaja.transferenciasCaja ?? 0 ) ).toFixed(2);

      this.preCorteCaja.diferencia = ( ( this.preCorteCaja.totalCaja ?? 0 ) - ( this.preCorteCaja.ingresoReal ?? 0 ) ).toFixed(2);

  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

  onDateChange(event: any): void {

    if(event.value){
      this.fn_getPreCorteCaja( this.ODataP.idCaja );
    }else{
      this.servicesGServ.showAlert('W', 'Alerta!', "Formato de fecha incorrecta.", false);
      this.preCorteCaja.selectedDate = '';
    }

  }

  public nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
  }

  ev_fn_tbxPesosCaja_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      if( this.preCorteCaja.pesosCaja > 0 ){
        this.nextInputFocus( this.tbxDolaresCaja, 0);
      }else if(this.preCorteCaja.pesos == 0){

        this.preCorteCaja.pesosCaja = 0;
        this.nextInputFocus( this.tbxDolaresCaja, 0);
      }

      this.fn_SUMAll();

    }
  }

  ev_fn_tbxDolaresCaja_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      if( this.preCorteCaja.dolaresCaja > 0 ){
        this.preCorteCaja.dolaresF = this.preCorteCaja.dolaresCaja;
        this.preCorteCaja.dolaresCaja = (this.preCorteCaja.dolaresCaja * this.preCorteCaja.fxRate).toFixed(2);
        this.nextInputFocus( this.tbxVouchersCaja, 0);
      }else if(this.preCorteCaja.dolares == 0){

        this.preCorteCaja.dolaresCaja = 0;
        this.nextInputFocus( this.tbxVouchersCaja, 0);
      }

      this.fn_SUMAll();

    }
  }

  ev_fn_tbxVouchersCaja_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      if( !(this.preCorteCaja.vouchersCaja) ){
        this.preCorteCaja.vouchersCaja = this.preCorteCaja.vouchers;
      }

      this.nextInputFocus( this.tbxTransferenciasCaja, 0);

      this.fn_SUMAll();

    }
  }

  ev_fn_tbxTransferenciasCaja_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      if( !(this.preCorteCaja.transferenciasCaja) ){
        this.preCorteCaja.transferenciasCaja = this.preCorteCaja.transferencias;
      }

      // this.preCorteCaja.totalCaja  =
      // ( parseFloat( this.preCorteCaja.pesosCaja )
      // + parseFloat( this.preCorteCaja.dolaresCaja )
      // + parseFloat( this.preCorteCaja.vouchersCaja )
      // + parseFloat( this.preCorteCaja.transferenciasCaja ) ).toFixed(2);

      // this.preCorteCaja.diferencia = ( this.preCorteCaja.totalCaja - this.preCorteCaja.ingresoReal ).toFixed(2);

      this.nextInputFocus( this.tbxTotalCaja, 0);

      this.fn_SUMAll();

    }
  }

  ev_fn_tbxTotalCaja_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      this.nextInputFocus( this.tbxDiferencia, 0);

      this.fn_SUMAll();

    }
  }

  ev_fn_tbxDiferencia_keyup_enter(event: any){
    if(event.keyCode == 13) { // PRESS ENTER

      this.nextInputFocus( this.tbxComentarios, 0);

      this.fn_SUMAll();

    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

}
