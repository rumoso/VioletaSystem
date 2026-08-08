import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MetalInventarioService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/metalInventario';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetMetalInventarioSaldos( tipoPropietario: string = '', idPropietario: number = 0 ): Observable<ResponseGet> {

    const data = {
      tipoPropietario: tipoPropietario,
      idPropietario: idPropietario,
      idUserLogON: this.authServ.getIdUserSession(),
      idSucursalLogON: this.idSucursal
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getMetalInventarioSaldos`, data);

  }

  CGetMetalInventarioTrack( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      tipoPropietario: parametersForm.tipoPropietario || '',
      idPropietario: parametersForm.idPropietario || 0,
      startDate: parametersForm.startDate || '',
      endDate: parametersForm.endDate || '',
      start: start,
      limiter: limiter,
      idUserLogON: this.authServ.getIdUserSession(),
      idSucursalLogON: this.idSucursal
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getMetalInventarioTrack`, data);

  }

  CAddMetalInventarioMovimiento( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/addMetalInventarioMovimiento`, data );

  }

  CCbxGetProductosMetal(): Observable<ResponseGet> {

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetProductosMetal`, {});

  }

}
