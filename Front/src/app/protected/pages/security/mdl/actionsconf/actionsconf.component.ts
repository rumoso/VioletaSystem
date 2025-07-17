import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-actionsconf',
  templateUrl: './actionsconf.component.html',
  styleUrls: ['./actionsconf.component.css']
})
export class ActionsconfComponent {

// #region VARIABLES

  title: string = 'Rol';
  bShowSpinner: boolean = false;
  idRelation: number = 0;

  seccionesYPermisos: any = [];

  bAdminOrCeo: boolean = false; // Variable para determinar si es admin o CEO

// #endregion



  constructor(
    private dialogRef: MatDialogRef<ActionsconfComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private servicesGServ: ServicesGService
    , private actionsServ: ActionsService
    , private authService: AuthService
    ) { }

    async ngOnInit() {
      this.authService.checkSession();
      var oUser = await this.authService.getUserSession();
      this.bAdminOrCeo = (oUser.roles.includes('1') || oUser.roles.includes('2')); // Verifica si es admin o CEO

      this.fn_getAllActionsByPermission();
    }


// #region CONEXIONES AL BACK

  fn_getAllActionsByPermission() {

    this.bShowSpinner = true;

    var oParam: any = {
      relationType: this.ODataP.relationType,
      idRelation: this.ODataP.idRelation
    }

    this.actionsServ.CGetAllActionsByPermission( oParam )
      .subscribe({
      next: (resp: ResponseGet) => {
        this.seccionesYPermisos = resp.data;

        console.log(this.seccionesYPermisos)
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex.error.errors[0].msg )
        this.servicesGServ.showSnakbar( ex.error.errors[0].msg );
        this.bShowSpinner = false;
      }
    })
  }

  fn_insertActionsPermisionsByIdRelation() {

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
              seccionesYPermisos: this.seccionesYPermisos
            }

            this.actionsServ.CInsertActionsPermisionsByIdRelation( oParam )
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

// #region MÉTODOS DEL FRONT

  getSelectedPermission() {


    // Puedes usar permisosSeleccionados según tus necesidades
    console.log('Permisos seleccionados:', this.seccionesYPermisos);

    // Aquí puedes enviar permisosSeleccionados al servidor u realizar otras acciones
  }

  fn_CerrarMDL(){
    this.dialogRef.close( false );
  }

// #endregion



}
