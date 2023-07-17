import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class SucursalesService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/sucursales';

  constructor(
    private http: HttpClient
  ) { }

  CGetSucursalesForAddUser( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      search: search
      , idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSucursalesForAddUser`, data);
  }

  CGetSucursalesByIdUser( idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSucursalesByIdUser`, data);
  }

  CCbxGetSucursalesCombo( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetSucursalesCombo`, data);
  }

  CInsertSucursalByIdUser( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSucursalByIdUser`, data );
  }

  CDeleteSucursalByIdUser( idUser : number, idSucursal: number ): Observable<ResponseDB_CRUD> {

    var data = {
      idUser: idUser
      ,idSucursal: idSucursal
    }

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteSucursalByIdUser`, data );
  }
}
