import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ElectronicMoneyService } from 'src/app/protected/services/electronic-money.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { PrintersService } from 'src/app/protected/services/printers.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-electronic-money-mdl',
  templateUrl: './electronic-money-mdl.component.html',
  styleUrls: ['./electronic-money-mdl.component.css']
})
export class ElectronicMoneyMDLComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

private _appMain: string = environment.appMain;

@ViewChild('tbxDescription') tbxDescription!: ElementRef;
@ViewChild('tbxMonto') tbxMonto!: ElementRef;

title: string = 'Dinero electrónico';
bShowSpinner: boolean = false;

idUserLogON: number = 0;

electronicMoneyForm: any = {

  idCustomer: 0,
  amount: 0,
  description: ''

};

electronicMoneyList: any[] = [];
electronicMoneySum: number = 0;

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

selectPrinter: any = {
  idSucursal: 0,
  idPrinter: 0,
  printerName: ''
}

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

  , private electronicMoneyServ: ElectronicMoneyService

  , private printTicketServ: PrintTicketService
  , private printersServ: PrintersService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);


    this.electronicMoneyForm.idCustomer = this.ODataP.idCustomer;

    this.fn_getElectronicMoneyListWithPage();

    this.nextInputFocus( this.tbxDescription, 500 );

    this.fn_getSelectPrintByIdUser( this.idUserLogON );

  }

  async ev_PrintTicket(){
    this.printTicketServ.printTicket("DineroElectronico", this.electronicMoneyForm.idCustomer, this.selectPrinter.idPrinter, this.electronicMoneySum);
  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {

    this.pagination = pag;
    this.fn_getElectronicMoneyListWithPage();

  }

  onChangeEvent(event: any){

    this.pagination.search = event.target.value;
    this.fn_getElectronicMoneyListWithPage();

  }
  ////************************************************ */

  public nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
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

bInsertElectronicMoney: boolean = false;

fn_insertElectronicMoney() {

if( this.electronicMoneyForm.idCustomer > 0 && this.electronicMoneyForm.amount > 0 && !this.bInsertElectronicMoney ){

  this.bInsertElectronicMoney = true;

  this.servicesGServ.showDialog('¿Estás seguro?'
  , 'Está a punto de agregar dinero electrónico al cliente'
  , '¿Desea continuar?'
  , 'Si', 'No')
    .afterClosed().subscribe({
    next: ( resp: any ) =>{

      this.bInsertElectronicMoney = false;

      if(resp){

        this.bShowSpinner = true;

        this.electronicMoneyServ.CInsertElectronicMoney( this.electronicMoneyForm )
          .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            if( resp.status === 0 ){
              this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
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
    }
  });

}

}

fn_getElectronicMoneyListWithPage() {

console.log( 'Before' );
console.log( this.electronicMoneyForm );
console.log( 'After' );

this.bShowSpinner = true;
this.electronicMoneyServ.CGetElectronicMoneyListWithPage( this.pagination, this.electronicMoneyForm.idCustomer )
.subscribe({
  next: (resp: ResponseGet) => {

    this.electronicMoneyList = resp.data.rows;
    this.pagination.length = resp.data.count;
    this.bShowSpinner = false;

    this.electronicMoneySum = resp.data.count > 0 ? this.electronicMoneyList[0].electronicMoneySum : 0;

  },
  error: (ex: HttpErrorResponse) => {

    this.servicesGServ.showSnakbar( ex.error.data );
    this.bShowSpinner = false;

  }
})
}

bDeleteElectronicMoney: boolean = false;

fn_deleteElectronicMoney( keyx: number ) {

  if( !this.bDeleteElectronicMoney ){

    this.bDeleteElectronicMoney = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de Eliminar dinero electrónico al cliente'
    , '¿Desea continuar?'
    , 'Si', 'No')
      .afterClosed().subscribe({
      next: ( resp: any ) =>{

        this.bDeleteElectronicMoney = false;

        if(resp){

          this.bShowSpinner = true;

          this.electronicMoneyServ.CDeleteElectronicMoney( keyx )
            .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.servicesGServ.showAlert('S', 'OK!', resp.message, true);
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
  this.electronicMoneyForm.description = '';
  this.electronicMoneyForm.amount = 0;
  this.fn_getElectronicMoneyListWithPage();
  this.nextInputFocus( this.tbxDescription, 500 );

}

ev_fn_description_keyup_enter(event: any){

  if(event.keyCode == 13) { // PRESS ENTER

    if( this.electronicMoneyForm.description.length > 0 ){
      this.nextInputFocus( this.tbxMonto, 0 );
    }

  }

}

ev_fn_amount_keyup_enter(event: any){

  if(event.keyCode == 13) { // PRESS ENTER

    if( this.electronicMoneyForm.amount > 0 ){
      this.fn_insertElectronicMoney();
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
