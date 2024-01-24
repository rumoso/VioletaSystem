import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { CajasService } from 'src/app/protected/services/cajas.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-select-caja',
  templateUrl: './select-caja.component.html',
  styleUrls: ['./select-caja.component.css']
})
export class SelectCajaComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////
  
  bShowSpinner: boolean = false;

  @ViewChild('cbxCajasCBX') cbxCajasCBX!: ElementRef;

  selectCajaForm: any = {

    idUser: 0,
    idCaja: 0,
    cajaDesc: ''

  };

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
  private dialogRef: MatDialogRef<SelectCajaComponent>
  ,@Inject(MAT_DIALOG_DATA) public ODataP: any

  , private servicesGServ: ServicesGService
  , private authServ: AuthService

  , private cajasServ: CajasService
  ) { }

  ngOnInit(): void {

    this.selectCajaForm.idUser = this.ODataP.idUser;

    setTimeout (() => {
      this.cbxCajasCBX.nativeElement.focus();
    }, 1000);

  }

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE CONEXIONES AL BACK
//////////////////////////////////////////////////////////////////////////////////////////////////

  bQuestion: boolean = false;

  async fn_insertSelectCaja() {

    if(!this.bQuestion){
      this.bQuestion = true;

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de seleccionar una caja'
      , '¿Desea continuar?'
      , 'Si', 'No')
      .afterClosed().subscribe({
        next: async( resp ) =>{
          if(resp){
          
            this.bShowSpinner = true;

            this.cajasServ.CInsertSelectCaja( this.selectCajaForm )
              .subscribe({
                next: async (resp: ResponseDB_CRUD) => {
        
                  if( resp.status === 0 ){
                    this.fn_CerrarMDL( resp.insertID )
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

  cbxCajas: any[] = [];

  cbxCajas_Search() {
    this.cajasServ.CGetCajasBySec( this.selectCajaForm.cajaDesc, this.selectCajaForm.idUser )
    .subscribe( {
      next: (resp: ResponseGet) =>{
        if(resp.status === 0){
          this.cbxCajas = resp.data
        }
        else{
          this.cbxCajas = [];
        }
      },
      error: (ex) => {
        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
        this.bShowSpinner = false;
      }
    });
  }

  cbxCajas_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.selectCajaForm.idCaja = ODataCbx.idCaja;
    this.selectCajaForm.cajaDesc = ODataCbx.name;

  }

  cbxCajas_Clear(){
    this.selectCajaForm.idCaja = 0;
    this.selectCajaForm.cajaDesc = '';
  }
//--------------------------------------------------------------------------

//////////////////////////////////////////////////////////////////////////////////////////////////
// FIN SECCIÓN DE COMBOS
//////////////////////////////////////////////////////////////////////////////////////////////////
}