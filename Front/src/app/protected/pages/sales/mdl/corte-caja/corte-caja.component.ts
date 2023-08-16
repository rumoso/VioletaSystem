import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-corte-caja',
  templateUrl: './corte-caja.component.html',
  styleUrls: ['./corte-caja.component.css']
})
export class CorteCajaComponent {

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////
  
  bShowSpinner: boolean = false;
  idCaja: number = 0;

  paymentList: any [] = [];

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
  private dialogRef: MatDialogRef<CorteCajaComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private salesServ: SalesService

  , private printTicketServ: PrintTicketService
  ) { }

  ngOnInit(): void {

    console.log( this.ODataP )

    this.idCaja = this.ODataP.idCaja;

    if( this.ODataP.idCaja > 0 ){

      this.fn_getPreCorteCaja( this.ODataP.idCaja );

    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_getPreCorteCaja( idCaja: number ) {

    this.paymentList = [];

    this.bShowSpinner = true;

    this.salesServ.CGetPreCorteCaja( idCaja )
    .subscribe( ( resp: any ) => {

      if(resp.status == 0){

        this.paymentList = resp.data.rows;

      }

      this.bShowSpinner = false;

    } );

  }

  fn_InsertCorteCaja(){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de guardar el corte de caja'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        
        if(resp){
        
          this.bShowSpinner = true;

          this.salesServ.CInsertCorteCaja( this.idCaja )
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {
      
                if( resp.status === 0 ){
                  //this.idSale = resp.insertID;
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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

  event_checkCorte(){

    var acumulado = this.paymentList.reduce((sum: any, x: any) => sum + ( ( x.saldo - x.egresos ) - x.saldoCaja), 0);
  
    console.log( acumulado );

    return acumulado == 0;
  }

  public nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

}
