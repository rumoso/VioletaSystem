import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/sales';

  constructor(
    private http: HttpClient
  ) { }

  CInsertSale( params: any ): Observable<ResponseDB_CRUD> {
    
    const data = {
      idSeller_idUser: params.idSeller_idUser
      , idCustomer: params.idCustomer
      , idSaleType: params.idSaleType
      , bCredito: params.bCredito
      , total: params.total
      
      , saleDetail: params.saleDetail
      , salesPayment: params.salesPayment
    };

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSale`, data);

  }

  CGetVentasListWithPage( pagination: Pagination, params: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idUser: params.idUser
      ,createDateStart: params.createDateStart
      ,createDateEnd: params.createDateEnd
      ,idCustomer: params.idCustomer

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getVentasListWithPage`, data);

  }

  CGetVentasACreditoListWithPage( pagination: Pagination, params: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idCustomer: params.idCustomer
      ,all: params.all

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getVentasACreditoListWithPage`, data);

  }

  CInsertAbono( params: any ): Observable<ResponseDB_CRUD> {
    
    const data = {
      idSeller_idUser: params.idSeller_idUser
      , idSale: params.idSale
      , idCustomer: params.idCustomer
      , idFormaPago: params.idFormaPago
      , paga: params.paga
      , referencia: params.referencia
    };

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertAbono`, data);

  }

  CGetAbonosBySaleListWithPage( pagination: Pagination, idSale: number ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idSale: idSale

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getAbonosBySaleListWithPage`, data);

  }

}
