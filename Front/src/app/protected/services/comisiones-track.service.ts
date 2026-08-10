import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Bitácora de comisiones por empleado (analisis/008).

@Injectable({
  providedIn: 'root'
})
export class ComisionesTrackService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/comisionesTrack';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  CGetList( pagination: Pagination, filtros: { idUser?: number; tipo?: string; estatus?: string; startDate?: string; endDate?: string } = {} ): Observable<ResponseGet> {
    const data = {
      search: pagination.search,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      idUser: filtros.idUser || 0,
      tipo: filtros.tipo || '',
      estatus: filtros.estatus || '',
      startDate: filtros.startDate || '',
      endDate: filtros.endDate || ''
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getComisionesTrackList`, data );
  }

  CInsertManual( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertComisionManual`, data );
  }

  CCancelar( id: number, motivo: string ): Observable<any> {
    const data: any = { id, motivo };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/cancelarComisionTrack`, data );
  }

  CGenerarComisionesVenta( startDate: string, endDate: string, idSeller_idUser: number ): Observable<any> {
    const data: any = { startDate, endDate, idSeller_idUser };
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/generarComisionesVenta`, data );
  }

}
