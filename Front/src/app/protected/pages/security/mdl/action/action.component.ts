import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-action',
  templateUrl: './action.component.html',
  styleUrls: ['./action.component.css']
})
export class ActionComponent {
// #region VARIABLES

  title: string = 'Catálogo de Acciones por Seccion';
  bShowSpinner: boolean = false;

  idUserLogON: number = 0;

  oCatForm: any = {

    idActionSection: 0,
    idAction: 0,
    name: '',
    nameHtml: '',
    description: '',
    active: true,
    nSpecial: false

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
    private dialogRef: MatDialogRef<ActionComponent>
    ,@Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService

    , private authServ: AuthService

    , private actionsServ: ActionsService

  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

    console.log(this.ODataP)

    if(this.ODataP.idActionSection > 0){
      this.oCatForm.idActionSection = this.ODataP.idActionSection;
      console.log(this.oCatForm)
      this.fn_getCatListWithPage();
    }


  }

  // #region MÉTODOS DEL FRONT

  showActions( sectionName: string ){

      var oData: any = {
        sectionName
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
      idAction: item.idAction,
      name: item.name,
      nameHtml: item.nameHtml,
      description: item.description,
      active: item.active,
      nSpecial: item.nSpecial

    };

  }

  fn_clear(){
    this.oCatForm = {

      idActionSection: 0,
      idAction: 0,
      name: '',
      nameHtml: '',
      description: '',
      active: true,
      nSpecial: false

    };
  }

  fn_validForm(){
    var bOK = false

    if(
      this.oCatForm.idActionSection > 0
      && this.oCatForm.name.length > 0
      && this.oCatForm.nameHtml.length > 0
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

  fn_insertUpdateAction() {

    if( this.fn_validForm() ){

      this.servicesGServ.showDialog('¿Estás seguro?'
      , 'Está a punto de guardar'
      , '¿Desea continuar?'
      , 'Si', 'No')
        .afterClosed().subscribe({
        next: ( resp: any ) =>{

          if(resp){

            this.bShowSpinner = true;

            this.actionsServ.CInsertUpdateAction( this.oCatForm )
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

    console.log(this.oCatForm)

    var oParams: any = {
      idActionSection: this.oCatForm.idActionSection
    }

    this.actionsServ.CGetActionsBySectionPagindo( this.pagination, oParams )
    .subscribe({
      next: (resp: ResponseGet) => {

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
