import { HttpErrorResponse } from '@angular/common/http';
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
  selector: 'app-egresos',
  templateUrl: './egresos.component.html',
  styleUrls: ['./egresos.component.css']
})
export class EgresosComponent {
  
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////
    
  bShowSpinner: boolean = false;
  bPago: boolean = false;

  @ViewChild('cbxFormasPagoC') cbxFormasPagoC!: ElementRef;
  @ViewChild('tbxDesc') tbxDesc!: ElementRef;
  @ViewChild('tbxMonto') tbxMonto!: ElementRef;

  egresosList: any = [];

  egresoForm: any = {

    idCaja: 0,

    idFormaPago: 0,
    formaPagoDesc: '',

    amount: 0,
    
    description: ''

  };

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
  ) { }
  
  ngOnInit(): void {
  
    console.log( this.ODataP )
  
    this.egresosList = [];
  
    this.egresoForm.idCaja = this.ODataP.idCaja;
  
    if( this.ODataP.idCaja > 0 ){

      this.fn_getPreEgresosCorteCaja( this.ODataP.idCaja );

    }
  
    setTimeout (() => {
      this.cbxFormasPagoC.nativeElement.focus();
    }, 1000);
  
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

    if(!this.bInsertEgreso){

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

                      this.egresoForm.idFormaPago = 0;
                      this.egresoForm.formaPagoDesc = '';
                      this.egresoForm.amount = 0;
                      this.egresoForm.description = '';

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

  }

  fn_disabledEgresos( idEgreso: number ){

    console.log( idEgreso )

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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

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

    if(this.egresoForm.idFormaPago > 0
      && this.egresoForm.amount > 0){
        return true;
      }

      return false;

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
      this.formaPagoServ.CCbxGetFormaPagoCorteCombo( this.egresoForm.formaPagoDesc )
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

    this.egresoForm.idFormaPago = ODataCbx.id;
    this.egresoForm.formaPagoDesc = ODataCbx.name;

      setTimeout (() => {
        this.tbxDesc.nativeElement.focus();
      }, 500);

  }

  cbxFormasPago_Clear(){
    this.egresoForm.idFormaPago = 0;
    this.egresoForm.formaPagoDesc = '';
  }
  //--------------------------------------------------------------------------

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE COMBOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

}
