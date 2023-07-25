import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FxrateService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/fxRate';
  
  constructor(
    private http: HttpClient
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
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertFxRate`, data );
  }
}
