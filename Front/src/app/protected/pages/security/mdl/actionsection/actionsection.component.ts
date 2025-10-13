import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionComponent } from '../action/action.component';

@Component({
  selector: 'app-actionsection',
  templateUrl: './actionsection.component.html',
  styleUrls: ['./actionsection.component.css']
})
export class ActionsectionComponent {

// #region VARIABLES

  title: string = 'Catálogo de Secciones para las acciones';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  oCatForm: any = {

    idActionSection: 0,
    sectionName: '',
    iLugar: 0,
    active: true

  };

  oCatList: any[] = [];

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

  // #endregion

  constructor(
    private dialogRef: MatDialogRef<ActionsectionComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService

    , private authServ: AuthService

    , private actionsServ: ActionsService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    this.fn_getCatListWithPage();

  }

  // #region MÉTODOS DEL FRONT

  showActions( idActionSection: number ){

      var oData: any = {
        idActionSection
      }

      this.servicesGServ.showModalWithParams( ActionComponent, oData, '1500px')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{

          //this.fn_getUsersListWithPage();

        }
      });
    }

  fn_editData( item: any ){
    this.oCatForm = {

      idActionSection: item.idActionSection,
      sectionName: item.sectionName,
      iLugar: item.iLugar,
      active: item.active

    };
  }

  fn_clear(){
    this.oCatForm = {

      idActionSection: 0,
      sectionName: '',
      iLugar: 0,
      active: true

    };
  }

  fn_validForm(){
    var bOK = false

    if( this.oCatForm.sectionName.length > 0
      && this.oCatForm.iLugar > 0
    ){
      bOK = true;
    }

    return bOK;
  }

  fn_CerrarMDL( id: number ){
    this.dialogRef.close( id );
  }

  ////************************************************ */
  // MÉTODOS DE PAGINACIÓN
  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getCatListWithPage();
  }

  onChangeEvent(event: any){
    this.pagination.search = event.target.value;
    this.fn_getCatListWithPage();
  }
  ////************************************************ */

  // #endregion

  // #region CONEXIONES CON EL BACK

  fn_insertUpdateActionSection() {

    if( this.fn_validForm() ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{

          if(resp){

            this.bShowSpinner = true;

            this.actionsServ.CInsertUpdateActionSection( this.oCatForm )
              .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                this.servicesGServ.showAlertIA( resp );
                this.fn_getCatListWithPage();
                this.bShowSpinner = false;

                if( resp.status === 0 ){
                  this.fn_clear();
                }

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

  fn_getCatListWithPage() {

    this.bShowSpinner = true;

    this.actionsServ.CGetCatActionSectionListWithPage( this.pagination )
    .subscribe({
      next: (resp: ResponseGet) => {

        console.log(resp);

        this.oCatList = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {

        this.servicesGServ.showSnakbar( ex.error.data );
        this.bShowSpinner = false;

      }
    })
  }


  // #endregion

}
