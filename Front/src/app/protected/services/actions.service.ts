import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ActionsService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/actions';
  
  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetActionListWithPage( pagination: Pagination ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getActionListWithPage`, data);

  }

  CInsertAction( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertAction`, data );
  }

  CDisabledActions( idAction : number ): Observable<ResponseDB_CRUD> {

    const data: any = {
      idAction: idAction
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledActions`, data );
  }

  CGetActionsForAddUser( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      search: search
      , idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getActionsForAddUser`, data);
  }

  CGetActionByUserListWithPage( idUser: number, pagination: Pagination ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idUser: idUser
      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getActionByUserListWithPage`, data);

  }

  CInsertActionByIdUser( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertActionByIdUser`, data );
  }

  
  
}