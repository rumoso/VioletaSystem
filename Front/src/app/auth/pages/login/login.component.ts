import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FaceVerificationComponent } from 'src/app/protected/pages/security/mdl/face-verification/face-verification.component';
import { TimecardChecadorComponent } from 'src/app/protected/pages/personal/timecard-checador/timecard-checador.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  hidePwd: boolean = true;

  bShowSpinner: boolean = false;

  myLogin: FormGroup = this.fb.group({
    username: ['',[ Validators.required ]],
    pwd: ['', [ Validators.required ]]
  });

  constructor( private fb: FormBuilder
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    ) {
      var idUserLogOn = this.authServ.getIdUserSession();

      if(idUserLogOn > 0){
        this.servicesGServ.changeRoute( '/VioletaSistem/dashboard' );
      }else{
        this.authServ.logout(false);
      }
      
    }

    fn_login() {
    
      if( this.myLogin.valid ){
        this.bShowSpinner = true;
  
        //console.log(this.myLogin.value)
        //this.servicesGService.showSnakbar( this.myLogin.value.username + ", " + this.myLogin.value.pwd);
  
        this.authServ.CLogin( this.myLogin.value )
          .subscribe({
            next: (resp) => {
              if( resp.status === 0 ){
                this.servicesGServ.changeRoute( '/VioletaSistem/dashboard' );
              }else{
                this.servicesGServ.showSnakbar(resp.message);
              }
              this.bShowSpinner = false;
            },
            error: (ex) => {
              console.log(ex)
              this.servicesGServ.showSnakbar( "Problemas con el servicio" );
              this.bShowSpinner = false;
            }
          })
      }
    }

    fn_loginByFace() {

      this.servicesGServ.showModalWithParams( FaceVerificationComponent, {
        modo: 'IDENTIFICAR',
        tipoPersona: 'USUARIO', // el login solo busca entre usuarios del sistema, nunca clientes
        referencia: 'Login',
        proposito: 'LOGIN', // el servidor entrega un comprobante que solo sirve para iniciar sesión
        ocultarAutorizacionManual: true // sin sesión todavía no aplica el respaldo de código de autorización
      }, '480px')
      .afterClosed().subscribe({
        next: ( resp: any ) => {

          if( !resp?.ok || resp.autorizacionManual ){
            return; // canceló, no identificó a nadie, o pidió respaldo manual (no aplica aquí)
          }

          this.bShowSpinner = true;

          this.authServ.CLoginByFace( resp.ticket )
            .subscribe({
              next: (resp2) => {
                if( resp2.status === 0 ){
                  this.servicesGServ.changeRoute( '/VioletaSistem/dashboard' );
                }else{
                  this.servicesGServ.showSnakbar(resp2.message);
                }
                this.bShowSpinner = false;
              },
              error: (ex) => {
                console.log(ex)
                this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                this.bShowSpinner = false;
              }
            });

        }
      });

    }

    fn_abrirTimecard() {
      this.servicesGServ.showModalWithParamsv2( TimecardChecadorComponent, {}, { width: '100vw', height: '100vh', maxWidth: '100vw', panelClass: 'full-screen-modal' } );
    }

}
