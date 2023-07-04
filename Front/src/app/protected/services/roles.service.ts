import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  
  private baseURL: string = environment.baseUrl;

  _api: string = 'api/roles';

  constructor(
    private http: HttpClient
  ) { }

  CGetRolesForAddUser( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      search: search
      , idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRolesForAddUser`, data);
  }

  CGetRolesByIdUser( idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRolesByIdUser`, data);
  }

  CInsertRolByIdUser( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertRolByIdUser`, data );
  }

  CDeleteRolByIdUser( idUser : number, idRol: number ): Observable<ResponseDB_CRUD> {

    var data = {
      idUser: idUser
      ,idRol: idRol
    }

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteRolByIdUser`, data );
  }
  
}
