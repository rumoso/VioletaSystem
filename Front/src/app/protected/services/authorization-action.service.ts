import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuthorizationActionService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/authorizationActions';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CAuthorizationActionAPI( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/authorizationActionAPI`, data );
  }

  CGetAutorizacionesByRelation( data : any ): Observable<ResponseGet> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getAutorizacionesByRelation`, data );
  }

}
