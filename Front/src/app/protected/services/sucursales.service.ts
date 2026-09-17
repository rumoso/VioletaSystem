import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  async CGetPrintTicketSuc( idSucursal: number, type: string ): Promise<any> {
    var data = {
      idSucursal: idSucursal,
      type: type
    }

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPrintTicketSuc`, data)
      .subscribe({
        next: ( resp: ResponseGet ) => {
          resolve( resp.data );
        }
        , error: ( err: any ) => {
          reject( err );
        }
      });

    });

  }

  // ── Catálogo de sucursales (analisis/021) ──
  // Estas rutas exigen sesión: el servidor toma de aquí quién hace el
  // cambio y revisa su permiso `sucursales_CrearModificar`.

  private fn_headersSesion(): HttpHeaders {
    return new HttpHeaders({ 'x-token': localStorage.getItem('token') || '' });
  }

  CGetSucursalesList( search: string, bIncluirInactivas: boolean ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSucursalesList`, { search, bIncluirInactivas }, { headers: this.fn_headersSesion() } );
  }

  CGetSucursalByID( idSucursal: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSucursalByID`, { idSucursal }, { headers: this.fn_headersSesion() } );
  }

  // idSucursal = 0 es alta. Regresa el idSucursal en data.
  CSaveSucursal( data: { idSucursal: number; name: string; description: string; address: string } ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/saveSucursal`, data, { headers: this.fn_headersSesion() } );
  }

  // idSucursalTerminal: la sucursal de esta terminal, que no se puede desactivar.
  CSetSucursalActiva( idSucursal: number, active: number, idSucursalTerminal: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/setSucursalActiva`, { idSucursal, active, idSucursalTerminal }, { headers: this.fn_headersSesion() } );
  }

}
