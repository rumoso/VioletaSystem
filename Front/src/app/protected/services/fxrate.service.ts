import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class FxrateService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/fxRate';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetFxRateListWithPage( pagination: Pagination ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFxRateListWithPage`, data);

  }

  CInsertFxRate( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertFxRate`, data );
  }

  CGetFxRateTypesWithLatestRates(): Observable<any> {
    return this.http.get<any>( `${ this.baseURL }/${ this._api }/getFxRateTypesWithLatestRates` );
  }

  CSaveFxRateChanges( changes: any[] ): Observable<any> {
    const data = {
      changes: changes,
      idUserLogON: this.authServ.getIdUserSession()
    };
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/saveFxRateChanges`, data );
  }

  CCreateFxRateType( data: any ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/createFxRateType`, data );
  }

  CDeleteFxRateType( idFxRateType: number ): Observable<any> {
    return this.http.delete<any>( `${ this.baseURL }/${ this._api }/deleteFxRateType/${idFxRateType}` );
  }

  CUpdateFxRateType( idFxRateType: number, data: any ): Observable<any> {
    return this.http.put<any>( `${ this.baseURL }/${ this._api }/updateFxRateType/${idFxRateType}`, data );
  }

  CGetPriceByKilataje( kilates: number ): Observable<any> {
    return this.http.get<any>( `${ this.baseURL }/${ this._api }/getPriceByKilataje/${kilates}` );
  }
}
