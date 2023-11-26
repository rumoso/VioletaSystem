import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { FxrateService } from 'src/app/protected/services/fxrate.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.css']
})
export class ActionsComponent {

//////////////////////////////////////////////////////////////////////////////////////////////////
// SECCIÓN DE VARIABLES
//////////////////////////////////////////////////////////////////////////////////////////////////

  private _appMain: string = environment.appMain;

  @ViewChild('cbxName') cbxName!: ElementRef;
  @ViewChild('tbxDesc') tbxDesc!: ElementRef;

  title: string = 'Tipos de cambio';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  actionForm: any = {

    name: '',
    description: ''

  };

  actionList: any[] = [];

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

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE VARIABLES
  //////////////////////////////////////////////////////////////////////////////////////////////////

  constructor(
    private dialogRef: MatDialogRef<ActionsComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService

    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string

    , private authServ: AuthService

    , private actionsServ: ActionsService

    ) { }

    async ngOnInit() {

      this.authServ.checkSession();
      this.idUserLogON = await this.authServ.getIdUserSession();

      this._locale = 'mx';
      this._adapter.setLocale(this._locale);

      this.fn_getActionListWithPage();

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      
      this.pagination = pag;
      this.fn_getActionListWithPage();

    }

    onChangeEvent(event: any){
      
      this.pagination.search = event.target.value;
      this.fn_getActionListWithPage();

    }
    ////************************************************ */


  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  fn_insertAction() {

  if( this.actionForm.name.length > 0 && this.actionForm.description.length > 0 ){

    this.servicesGServ.showDialog('¿Estás seguro?'
    , 'Está a punto de agregar una acción'
    , '¿Desea continuar?'
    , 'Si', 'No')
      .afterClosed().subscribe({
      next: ( resp: any ) =>{

        if(resp){

          this.bShowSpinner = true;

          this.actionsServ.CInsertAction( this.actionForm )
            .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              this.servicesGServ.showAlertIA( resp );

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

  fn_getActionListWithPage() {

    this.bShowSpinner = true;
    this.actionsServ.CGetActionListWithPage( this.pagination )
    .subscribe({
      next: (resp: ResponseGet) => {
        
        this.actionList = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {
        
        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;

      }
    })
  }


  fn_disabledAction( idAction: number ) {

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de deshabilitar la acción'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{
  
          if(resp){
  
            this.bShowSpinner = true;
  
            this.actionsServ.CDisabledActions( idAction )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {
  
                this.servicesGServ.showAlertIA( resp );

                this.bShowSpinner = false;

                this.fn_getActionListWithPage();
  
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





  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE CONEXIONES AL BACK
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////








  //////////////////////////////////////////////////////////////////////////////////////////////////
  // FIN SECCIÓN DE MÉTODOS CON EL FRONT
  //////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // SECCIÓN DE EVENTOS
  //////////////////////////////////////////////////////////////////////////////////////////////////

  event_clear(){
    this.actionForm.name = '';
    this.actionForm.description = '';
    this.fn_getActionListWithPage();
  }

  nextInputFocus( idInput: any, milliseconds: number ) {
    setTimeout (() => {
      idInput.nativeElement.focus();
    }, milliseconds);
  }

  fn_CerrarMDL(){
    this.dialogRef.close( false );
  }
  
  ev_fn_name_keyup_enter(event: any){
  
    if(event.keyCode == 13) { // PRESS ENTER
      
        this.nextInputFocus( this.tbxDesc, 0 );
  
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
