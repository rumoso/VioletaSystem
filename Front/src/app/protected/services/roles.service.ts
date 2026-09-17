import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  
  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/roles';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
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

  CGetRolesListWithPage( pagination: Pagination ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRolesListWithPage`, data);

  }

  CInsertRol( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertRol`, data );
  }

  CUpdateRol( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateRol`, data );
  }

  // Tipos de puesto asignables (sin el tipo 3, exclusivo del puesto de
  // sistema "Empleado").
  CCbxGetTiposRol(): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetTiposRol`, {} );
  }

  CGetRolByID( id: number ): Observable<ResponseGet> {
    var data = {
      idRol: id
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRolByID`, data);
  }
  
}
