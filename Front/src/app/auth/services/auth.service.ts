import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Login, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/auth';

  private _userLogin: any | undefined;

  constructor(
    private http: HttpClient
    , private servicesGServ: ServicesGService
    ) { }

    CLogin( login: Login ): Observable<ResponseGet> {

      return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/login`, login )
        .pipe(
          tap( userLogin => {
            if(userLogin.status == 0){
              this._userLogin = userLogin.data!.user;
              localStorage.setItem('idUser', JSON.stringify( userLogin.data.user.idUser ));
              localStorage.setItem('user', JSON.stringify( userLogin.data.user ));
              localStorage.setItem('token', JSON.stringify( userLogin.data.token ));
            }
          })
        );
    }

    get userLogin(): any | undefined{

      if( localStorage.getItem('user') ) {
        let u: any = JSON.parse(localStorage.getItem('user')!.toString());
        return u;
      }
  
      return undefined;    
    }

    

  logout( bRedirect: boolean ) {
    localStorage.removeItem('user');
    localStorage.removeItem('idUser');
    localStorage.removeItem('token');

    if(bRedirect)
      this.servicesGServ.changeRoute( '/login' );
  }

  validaAuth(): Observable<boolean> {
    if( !localStorage.getItem('user') ){
      return of(false);
    }

    return of(true);
  }

  getMenuByPermissions( idUser : number ): Observable<ResponseGet> {
    const data = {
      idUser: idUser
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getMenuByPermissions`, data );
  }

  async checkSession() {

    let idUser = this.getIdUserSession();

    console.log(idUser)

    if( idUser == 0 ){
      this.logout(false);
      this.servicesGServ.changeRoute( '/' );
    }
  }

  getIdUserSession(): number{
    if( localStorage.getItem('idUser') ) {
      let idUser: number = + localStorage.getItem('idUser')!.toString();
      return idUser;
    }

    return 0;
  }
}
