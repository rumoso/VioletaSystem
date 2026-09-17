import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, Inject, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { UsersService } from 'src/app/protected/services/users.service';
import { ReglaPwd, fn_evaluarPwd, fn_pwdSegura } from 'src/app/protected/utils/pwd-segura.util';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Mismas reglas que valida el Back (Back/helpers/pwdSegura.js).
const pwdSeguraValidator = ( control: AbstractControl ): ValidationErrors | null =>
  fn_pwdSegura( control.value ) ? null : { pwdInsegura: true };

// Modal "Mi contraseña y código de autorización" del usuario logueado
// (menú principal).
@Component({
  selector: 'app-changepwdsecretword',
  templateUrl: './changepwdsecretword.component.html',
  styleUrls: ['./changepwdsecretword.component.css']
})
export class ChangepwdsecretwordComponent implements AfterViewInit {

  // #region VARIABLES

  @ViewChild('pwdInput') pwdInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('pwd2Input') pwd2InputRef?: ElementRef<HTMLInputElement>;

  idUserLogON: number = 0;
  bShowSpinner: boolean = false;

  hidePwd: boolean = true;
  hidePwd2: boolean = true;

  userForm: any = {
    authorizationCode: ''
  }

  changePwdForm: FormGroup = this.fb.group({
    pwd: ['', [ Validators.required, pwdSeguraValidator ]],
    pwd2: ['', [ Validators.required ]]
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

  ngAfterViewInit(): void {
    // El foco arranca en la contraseña nueva.
    setTimeout( () => this.pwdInputRef?.nativeElement?.focus(), 150 );
  }

  // #region MÉTODOS PARA EL FRONT

  // Reglas que se palomean mientras se escribe.
  get reglasPwd(): ReglaPwd[] {
    const pwd = this.changePwdForm.value.pwd || '';
    const pwd2 = this.changePwdForm.value.pwd2 || '';
    return [
      ...fn_evaluarPwd( pwd ),
      { texto: 'Las dos contraseñas coinciden', ok: pwd.length > 0 && pwd === pwd2 }
    ];
  }

  fn_CerrarMDL(){
    this.dialogRef.close( false );
  }

  fn_ValidPWD(): boolean {
    return this.reglasPwd.every( r => r.ok );
  }

  fn_ValidCodigo(): boolean {
    return ( this.userForm.authorizationCode || '' ).trim().length > 0;
  }

  // Enter en "Contraseña nueva" pasa a "Verificar contraseña".
  fn_pwdEnter( evento: Event ){
    evento.preventDefault();
    this.pwd2InputRef?.nativeElement?.focus();
  }

  // Enter en "Verificar contraseña" guarda, solo si cumple todas las reglas.
  fn_pwd2Enter( evento: Event ){
    evento.preventDefault();
    if( this.fn_ValidPWD() ){
      this.fn_changePassword();
    }
  }

  fn_codigoEnter( evento: Event ){
    evento.preventDefault();
    if( this.fn_ValidCodigo() ){
      this.fn_updateAuthorizationCode();
    }
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
              authorizationCode: this.userForm.authorizationCode.trim()
          };

          this.bShowSpinner = true;
          this.usersServ.CUpdateAuthorizationCode( oParams )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {

              if( resp.status === 0 ){
                this.userForm.authorizationCode = '';
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
                this.changePwdForm.reset({ pwd: '', pwd2: '' });
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
