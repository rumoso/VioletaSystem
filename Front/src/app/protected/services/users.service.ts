import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  
  private baseURL: string = environment.baseUrl;

  _api: string = 'api/users';

  constructor(
    private http: HttpClient
  ) { }

  CGetUsersListWithPage( pagination: Pagination ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
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
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertUser`, data );
  }

  CUpdateUser( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateUser`, data );
  }

  CChangePassword( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/changePassword`, data );
  }

  CDeleteUser( idUser : any ): Observable<ResponseDB_CRUD> {
    var data = {
      idUser: idUser
    }
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteUser`, data );
  }
}
