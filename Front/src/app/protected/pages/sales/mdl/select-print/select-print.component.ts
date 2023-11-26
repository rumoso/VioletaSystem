import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SelectCajaComponent } from '../select-caja/select-caja.component';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PrintersService } from 'src/app/protected/services/printers.service';

@Component({
  selector: 'app-select-print',
  templateUrl: './select-print.component.html',
  styleUrls: ['./select-print.component.css']
})
export class SelectPrintComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////
  
bShowSpinner: boolean = false;

@ViewChild('cbxPrintersCBX') cbxPrintersCBX!: ElementRef;

selectPrinterForm: any = {

  idUser: 0,
  idPrinter: 0,
  printerName: ''

};

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

constructor(
private dialogRef: MatDialogRef<SelectCajaComponent>
,@Inject(MAT_DIALOG_DATA) public ODataP: any

, private servicesGServ: ServicesGService
, private authServ: AuthService

, private printersServ: PrintersService
) { }

ngOnInit(): void {

  this.selectPrinterForm.idUser = this.ODataP.idUser;

  setTimeout (() => {
    this.cbxPrintersCBX.nativeElement.focus();
  }, 1000);

}

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

bQuestion: boolean = false;

async fn_insertSelectPrint() {

  if(!this.bQuestion){
    this.bQuestion = true;

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de seleccionar una impresora'
    , '¿Desea continuar?'
    , 'Si', 'No')
    .afterClosed().subscribe({
      next: async( resp ) =>{
        if(resp){
        
          this.bShowSpinner = true;

          this.printersServ.CInsertSelectPrinter( this.selectPrinterForm )
            .subscribe({
              next: async (resp: ResponseDB_CRUD) => {
      
                if( resp.status === 0 ){
                  this.fn_CerrarMDL( resp.insertID )
                }
      
                this.servicesGServ.showSnakbar(resp.message);
                this.bShowSpinner = false;

                this.bQuestion = false;
              },
              error: (ex) => {
      
                this.servicesGServ.showSnakbar( ex.error.message );
                this.bShowSpinner = false;
      
              }
            });

        }
        else{
          this.bQuestion = false;
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

fn_CerrarMDL( id: number ){
  this.dialogRef.close( id );
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





//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE EVENTOS
//////////////////////////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////


//--------------------------------------------------------------------------
// MÉTODOS PARA COMBO DE ÁREAS

cbxPrinters: any[] = [];

cbxPrinters_Search() {
  this.printersServ.CGetPrintersBySec( this.selectPrinterForm.printName, this.selectPrinterForm.idUser )
  .subscribe( {
    next: (resp: ResponseGet) =>{
      if(resp.status === 0){
        this.cbxPrinters = resp.data
      }
      else{
        this.cbxPrinters = [];
      }
    },
    error: (ex) => {
      this.servicesGServ.showSnakbar( "Problemas con el servicio" );
      this.bShowSpinner = false;
    }
  });
}

cbxPrinters_SelectedOption( event: MatAutocompleteSelectedEvent ) {

  if(!event.option.value){
    return;
  }

  const ODataCbx: any = event.option.value;

  this.selectPrinterForm.idPrinter = ODataCbx.idPrinter;
  this.selectPrinterForm.printerName = ODataCbx.printerName;

}

cbxPrinters_Clear(){
  this.selectPrinterForm.idPrinter = 0;
  this.selectPrinterForm.printerName = '';
}
//--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
}