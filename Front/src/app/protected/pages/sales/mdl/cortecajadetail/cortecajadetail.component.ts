import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { PrintTicketService } from 'src/app/protected/services/print-ticket.service';
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
  
  bShowSpinner: boolean = false;
  idCorteCaja: any = 0;

  preCorteCaja: any = {
    sales: 0,
    egresos: 0,
    ingresoTotal: 0,
    pesos: 0,
    dolares: 0,
    fxRate: 0,
    dolaresMNX: 0,
    vouchers: 0,
    transferencias: 0,
    dineroElectronico: 0,
    bCuadro: 0,
    falto: '',
    sobro: '',
    observaciones: ''
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
  private dialogRef: MatDialogRef<CortecajadetailComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private salesServ: SalesService

  , private printTicketServ: PrintTicketService
  ) { }

  ngOnInit(): void {

    console.log( this.ODataP )

    this.idCorteCaja = this.ODataP.idCorteCaja;

    if( this.ODataP.idCorteCaja.length > 0 ){

      this.fn_getCorteCajaDetailByID( this.ODataP.idCorteCaja );

    }

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_getCorteCajaDetailByID( idCorteCaja: any ) {

    this.bShowSpinner = true;

    this.salesServ.CGetCorteCajaByID( idCorteCaja )
    .subscribe( ( resp: any ) => {

      if(resp.status == 0){

        this.preCorteCaja = resp.data;

      }

      this.bShowSpinner = false;

    } );

  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

}
