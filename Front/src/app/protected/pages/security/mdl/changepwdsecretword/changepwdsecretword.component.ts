import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-changepwdsecretword',
  templateUrl: './changepwdsecretword.component.html',
  styleUrls: ['./changepwdsecretword.component.css']
})
export class ChangepwdsecretwordComponent {

  // #region VARIABLES

idUserLogON: number = 0;
title: string = 'Configuración de usuario';
bShowSpinner: boolean = false;

hidePwd: boolean = true;
hidePwd2: boolean = true;

public showPwd2: boolean = false;

userForm: any = {
  authorizationCode: ''
}

changePwdForm: FormGroup = this.fb.group({
  pwd: ['', Validators.compose([
    Validators.required,
    Validators.minLength(6),
    Validators.pattern(/(?=.*[0-9])/),
    Validators.pattern(/(?=.*[A-Z])/),
    Validators.pattern(/(?=.*[a-z])/),
    Validators.pattern(/(?=.*[-_.,$@^!%*?&])/)
  ])],
  pwd2: ['', Validators.compose([
    Validators.required,
    Validators.minLength(6),
    Validators.pattern(/(?=.*[0-9])/),
    Validators.pattern(/(?=.*[A-Z])/),
    Validators.pattern(/(?=.*[a-z])/),
    Validators.pattern(/(?=.*[-_.,$@^!%*?&])/)
  ])]
});

// #endregion

constructor(
  private dialogRef: MatDialogRef<ChangepwdsecretwordComponent>
  , @Inject(MAT_DIALOG_DATA) public ODataP: any
  , private fb: FormBuilder
  , private servicesGServ: ServicesGService
  , private usersServ: UsersService
  , private authServ: AuthService
  ) { }

  async ngOnInit() {

    this.authServ.checkSession();
    this.idUserLogON = await this.authServ.getIdUserSession();

  }

// #region MÉTODOS PARA EL FRONT

fn_CerrarMDL(){
  this.dialogRef.close( false );
}

fn_ValidPWD(){
  return !this.changePwdForm.invalid && this.changePwdForm.value.pwd == this.changePwdForm.value.pwd2;
}

// #endregion

// #region CONEXIONES AL BACK

  fn_updateAuthorizationCode(){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de actualizar el código de autorización'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){

          var oParams: any = {
              idUser: this.idUserLogON,
              authorizationCode: this.userForm.authorizationCode
          };

          this.bShowSpinner = true;
          this.usersServ.CUpdateAuthorizationCode( oParams )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

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

  fn_changePassword(){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de cambiar la contraseña'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){

          var oParams: any = {
              idUser: this.idUserLogON,
              pwd: this.changePwdForm.value.pwd,
              pwd2: this.changePwdForm.value.pwd2
          };

          this.bShowSpinner = true;
          this.usersServ.CChangePassword( oParams )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.changePwdForm.get('pwd')?.setValue( '' );
                this.changePwdForm.get('pwd2')?.setValue( '' );
              }

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

  // #endregion

}
