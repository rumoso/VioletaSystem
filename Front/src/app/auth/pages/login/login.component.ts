import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  bShowSpinner: boolean = false;

  myLogin: FormGroup = this.fb.group({
    username: ['UserAdmin',[ Validators.required ]],
    pwd: ['123456', [ Validators.required ]]
  });

  constructor( private fb: FormBuilder
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    ) {
      var idUserLogOn = localStorage.getItem('idUser');

      if(idUserLogOn?.length! > 0){
        this.servicesGServ.changeRoute( '/VioletaSistem/dashboard' );
      }else{
        localStorage.setItem('user', '');
        localStorage.setItem('token', '');
        localStorage.setItem('idUser', '');
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
              }
              this.servicesGServ.showSnakbar(resp.message);
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

}
