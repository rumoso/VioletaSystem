import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UsersService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/users';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  // filtros: filterFaceID ('' | 'CON' | 'SIN'), idRol, idTipoRol,
  // filterAcceso ('' | 'CON' | 'SIN'), filterActive ('' | 'ACTIVOS' | 'INACTIVOS')
  CGetUsersListWithPage( pagination: Pagination, filtros: any = {} ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
      ,filterFaceID: filtros.filterFaceID || ''
      ,idRol: filtros.idRol || 0
      ,idTipoRol: filtros.idTipoRol || 0
      ,filterAcceso: filtros.filterAcceso || ''
      ,filterActive: filtros.filterActive || ''
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getUsersListWithPage`, data);

  }

  CGetUserByID( id: number ): Observable<ResponseGet> {
    var data = {
      idUser: id
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getUserByID`, data);
  }

  CInsertUser( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertUser`, data );
  }

  CUpdateUser( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateUser`, data );
  }

  CChangePassword( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/changePassword`, data );
  }

  CDisabledUser( idUser : any ): Observable<ResponseDB_CRUD> {
    var data = {
      idUser: idUser
    }
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledUser`, data );
  }

  // ¿El nombre de usuario está libre? (único entre quienes tienen acceso)
  CCheckUserNameDisponible( userName: string, idUser: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/checkUserNameDisponible`, { userName, idUser } );
  }

  CCbxGetSellersCombo( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetSellersCombo`, data);
  }

  CCbxGetTecnicosCombo( search: string ): Observable<ResponseGet> {
    var data = {
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetTecnicosCombo`, data);
  }

  CUpdateAuthorizationCode( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateAuthorizationCode`, data );
  }

  // aTiposRol opcional: solo personas con un puesto activo de esos tipos.
  CCbxGetAllUsersCombo( search: string = '', aTiposRol: number[] = [] ): Observable<ResponseGet> {
    const data: any = { search, aTiposRol };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetAllUsersCombo`, data );
  }

}
