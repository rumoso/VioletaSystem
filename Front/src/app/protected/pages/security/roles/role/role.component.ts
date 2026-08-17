import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { RolesService } from 'src/app/protected/services/roles.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.css']
})
export class RoleComponent implements OnInit {

  bShowSpinner: boolean = false;
  idRol: number = 0;
  huboCambios: boolean = false;

  rolForm: any = {
    idRol: 0,
    name: '',
    description: '',
    active: true
  };

  constructor(
    private dialogRef: MatDialogRef<RoleComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private rolesServ: RolesService

    , private authService: AuthService
  ) { }

  get titulo(): string {
    return this.idRol ? 'Editar Rol' : 'Nuevo Rol';
  }

  ngOnInit(): void {
    this.authService.checkSession();

    this.idRol = this.ODataP?.idRol || 0;

    if( this.idRol > 0 ){

      this.bShowSpinner = true;

      this.rolesServ.CGetRolByID( this.idRol )
        .subscribe( ( resp: any ) => {

           if(resp.status == 0){

              this.rolForm = {
                idRol: resp.data.idRol,
                name: resp.data.name,
                description: resp.data.description,
                active: resp.data.active
              };

           }else{
            this.servicesGServ.showSnakbar(resp.message);
           }
           this.bShowSpinner = false;
        } )

    }

  }

  fn_close() {
    this.dialogRef.close( this.huboCambios );
  }

  fn_saveRol() {

    this.bShowSpinner = true;

    if(this.idRol > 0){
      this.rolesServ.CUpdateRol( this.rolForm )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            this.huboCambios = true;
            this.servicesGServ.showAlertIA( resp );
            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })
    }else{
    this.rolesServ.CInsertRol( this.rolForm )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          if( resp.status === 0 ){

            this.idRol = resp.insertID;
            this.rolForm.idRol = resp.insertID;
            this.huboCambios = true;

          }

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

}
