import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { FormapagoService } from 'src/app/protected/services/formapago.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-egresos',
  templateUrl: './egresos.component.html',
  styleUrls: ['./egresos.component.css']
})
export class EgresosComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  idUserLogON: number = 0;
  bShowSpinner: boolean = false;
  bPago: boolean = false;

  @ViewChild('tbxDesc') tbxDesc!: ElementRef;
  @ViewChild('tbxMonto') tbxMonto!: ElementRef;

  egresosList: any = [];

  egresoForm: any = {
    idCaja: 0,
    idFormaPago: 1,
    amount: 0,
    description: ''
  };

  selectPrinter: any = {
    idSucursal: 0,
    idPrinter: 0,
    printerName: ''
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private dialogRef: MatDialogRef<EgresosComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private authServ: AuthService

    , private salesServ: SalesService

    , private printTicketServ: PrintTicketService
    , private formaPagoServ: FormapagoService
    , private printersServ: PrintersService
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    console.log( this.ODataP )

    this.egresosList = [];

    this.egresoForm.idCaja = this.ODataP.idCaja;

    if( this.ODataP.idCaja > 0 ){

      this.fn_getSelectPrintByIdUser( this.idUserLogON );
      this.fn_getPreEgresosCorteCaja( this.ODataP.idCaja );

    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_getPreEgresosCorteCaja( idCaja: number ) {

    this.egresosList = [];

    this.bShowSpinner = true;

    this.salesServ.CGetPreEgresosCorteCaja( idCaja )
    .subscribe({
      next: ( resp: any ) => {

        if(resp.status == 0){

          this.egresosList = resp.data.rows;

        }

        this.bShowSpinner = false;

      },
      error: (err: any) => {
        this.bShowSpinner = false;
      }
    }  );

  }

  bInsertEgreso: boolean = false;
  fn_InsertEgreso(){
    if(this.bInsertEgreso){
      return;
    }
    this.bInsertEgreso = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de guardar el Egreso'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{

        if(resp){

          this.bShowSpinner = true;

          this.salesServ.CInsertEgresos( this.egresoForm )
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                if( resp.status === 0 ){
                  //this.idSale = resp.insertID;

                  this.egresoForm.amount = 0;
                  this.egresoForm.description = '';

                  if(this.selectPrinter.idPrinter > 0){
                    this.printTicketServ.printTicket("Egreso", resp.insertID, this.selectPrinter.idPrinter, 1);
                  }

                  this.fn_CerrarMDL();

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
          this.bInsertEgreso = false;
        }

      }

    });

  }

  fn_disabledEgresos( idEgreso: any ){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de deshabilitar el Egreso'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
          this.bShowSpinner = true;
          this.salesServ.CDisabledEgresos( idEgreso )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {
              this.fn_getPreEgresosCorteCaja(this.ODataP.idCaja);
              this.servicesGServ.showAlertIA( resp );
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              console.log( ex )
              this.servicesGServ.showSnakbar( ex.error.data );
              this.bShowSpinner = false;
            }

          })
        }
      }
    });
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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_btnRePrinter( idEgreso: any ){

    if( this.selectPrinter.idPrinter > 0 ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Estás apunto de reimprimir'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{

          if(resp){

            this.printTicketServ.printTicket("Egreso", idEgreso, this.selectPrinter.idPrinter, 1);

          }

        }

      });

    }

  }

  nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
  }

  fn_CerrarMDL(){
    this.dialogRef.close( false );
  }

  ev_fn_description_keyup_enter(event: any){

    if(event.keyCode == 13) { // PRESS ENTER

        this.nextInputFocus( this.tbxMonto, 0 );

    }

  }

  event_fn_Amount( event: any ){

    if(event.keyCode == 13) { // PRESS ENTER

      if(this.egresoForm.amount > 0){

        this.fn_InsertEgreso();

      }

    }

  }

  ev_fn_enableBtnSave(){

    if(this.egresoForm.amount > 0){
        return true;
      }

      return false;

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

}
