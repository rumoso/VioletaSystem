import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-cortecajadetail',
  templateUrl: './cortecajadetail.component.html',
  styleUrls: ['./cortecajadetail.component.css']
})
export class CortecajadetailComponent {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  idUserLogON: number = 0;
  bShowSpinner: boolean = false;
  idCorteCaja: any = 0;


  selectedDate: any = '';

  egresosList: any = [];
  ingresosList: any = [];
  pagosCanList: any = [];

  preCorteCaja: any = {

    sales: 0,
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
  private dialogRef: MatDialogRef<CortecajadetailComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private _adapter: DateAdapter<any>
  , @Inject(MAT_DATE_LOCALE) private _locale: string

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private salesServ: SalesService

  , private printTicketServ: PrintTicketService

  , private printersServ: PrintersService
  ) { }

  async ngOnInit() {

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this.idCorteCaja = this.ODataP.idCorteCaja;

    if( this.ODataP.idCorteCaja.length > 0 ){

      this.fn_getSelectPrintByIdUser( this.idUserLogON );
      this.fn_getCorteCajaDetailByID( this.ODataP.idCorteCaja );

      this.fn_getDatosRelacionadosByIDCorteCaja( this.ODataP.idCorteCaja );

    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

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

  fn_getCorteCajaDetailByID( idCorteCaja: any ) {

    this.bShowSpinner = true;

    this.salesServ.CGetCorteCajaByID( idCorteCaja )
    .subscribe( ( resp: any ) => {

      if(resp.status == 0){

        this.preCorteCaja = resp.data;

        this.selectedDate = resp.data.createDate;

      }

      this.bShowSpinner = false;

    } );

  }

  fn_getDatosRelacionadosByIDCorteCaja( idCorteCaja: any ) {

    var oParams: any = {
      idCorteCaja: idCorteCaja
    }

    this.salesServ.CGetDatosRelacionadosByIDCorteCaja( oParams )
    .subscribe( ( resp: any ) => {

      if(resp.status == 0){

        this.egresosList = resp.egresosList;
        this.ingresosList = resp.ingresosList;
        this.pagosCanList = resp.pagosCanList;

      }

    } );

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_btnRePrinter( idRelation: any, relationType: string ){

    if( this.selectPrinter.idPrinter > 0 ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Estás apunto de reimprimir'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{

          if(resp){

            if(relationType != "RePayment")
              this.printTicketServ.printTicket(relationType, idRelation, this.selectPrinter.idPrinter, 1);
            else
              this.printTicketServ.printTicket("RePayment", idRelation.idRelation, this.selectPrinter.idPrinter, 1, idRelation.idPayment);

          }

        }

      });

    }

  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

}
