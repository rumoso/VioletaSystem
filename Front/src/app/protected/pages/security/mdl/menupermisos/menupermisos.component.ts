import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-menupermisos',
  templateUrl: './menupermisos.component.html',
  styleUrls: ['./menupermisos.component.css']
})
export class MenupermisosComponent {
  
  // #region VARIABLES

  title: string = 'Rol';
  bShowSpinner: boolean = false;
  idRelation: number = 0;
  
  _menuList: any = [];

  checkedItems: any = [];

  // #endregion

  constructor(
    private dialogRef: MatDialogRef<MenupermisosComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private servicesGServ: ServicesGService
    , private actionsServ: ActionsService
    , private authServ: AuthService
    ) { }

    async ngOnInit() {

      this.authServ.checkSession();

      this.fn_getMenuForPermissions();
    }

    // #region MÉTODOS PARA EL FRONT

    fn_CerrarMDL(){
      this.dialogRef.close( false );
    }

    toggleCheckbox(id: string) {
      if (this.checkedItems.includes(id)) {
          this.checkedItems = this.checkedItems.filter( ( item: any ) => item !== id);
      } else {
          this.checkedItems.push(id);
      }
  }
  
  isChecked(id: string): boolean {
      return this.checkedItems.includes(id);
  }

    // #endregion

  // #region CONEXIONES CON EL BACK

  fn_getMenuForPermissions() {

    this.bShowSpinner = true;

    var oParam: any = {
      relationType: this.ODataP.relationType,
      idRelation: this.ODataP.idRelation
    }

    this.authServ.CGetMenuForPermissions( oParam )
      .subscribe({
      next: (resp: ResponseGet) => {
        
        if(resp.status == 0){
          this._menuList = resp.data;
        }

        this.bShowSpinner = false;

      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex.error.errors[0].msg )
        this.servicesGServ.showSnakbar( ex.error.errors[0].msg );
        this.bShowSpinner = false;
      }
    })
  }
  
  fn_insertMenusPermisionsByIdRelation() {

    this.servicesGServ.showDialog('¿Estás seguro?'
                                            , 'Está a punto de asignar estos permisos'
                                            , '¿Desea continuar?'
                                            , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{
          if(resp){
            
            this.bShowSpinner = true;

            var oParam: any = {
              relationType: this.ODataP.relationType,
              idRelation: this.ODataP.idRelation,
              _menuList: this._menuList
            }

            this.authServ.CInsertMenusPermisionsByIdRelation( oParam )
              .subscribe({
                next: (resp: ResponseDB_CRUD) => {
                  
                  this.servicesGServ.showAlertIA( resp );
                  this.bShowSpinner = false;

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

  // #endregion

}
