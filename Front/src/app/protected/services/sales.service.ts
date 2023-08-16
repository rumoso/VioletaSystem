import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/sales';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CInsertSale( params: any ): Observable<ResponseDB_CRUD> {
    
    const data: any = {
      idCaja: params.idCaja
      , idSeller_idUser: params.idSeller_idUser
      , idCustomer: params.idCustomer
      , idSaleType: params.idSaleType
      
      , saleDetail: params.saleDetail
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSale`, data);

  }

  CGetVentasListWithPage( pagination: Pagination, params: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data: any = {
      idUser: params.idUser
      ,createDateStart: params.createDateStart
      ,createDateEnd: params.createDateEnd
      ,idCustomer: params.idCustomer

      ,search: pagination.search
      ,start: start
      ,limiter: limiter

    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getVentasListWithPage`, data );

  }

  CGetSaleByID( idSale: number ): Observable<ResponseGet> {
    
    const data = {
      idSale: idSale
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSaleByID`, data);

  }

  async CGetSaleByIDPromise( idSale: number ): Promise<any> {
    const data = {
      idSale: idSale
    };

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSaleByID`, data)
      .subscribe({
        next: ( resp: ResponseGet ) => {
          resolve( resp );
        }
        , error: ( err: any ) => {
          reject( err );
        }
      });

    });

  }

  CInsertPayments( params: any, idCaja: number, idCustomer: number ): Observable<ResponseDB_CRUD> {
    
    const data: any = {
      idCaja: idCaja,
      idCustomer: idCustomer,
      paymentList: params
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertPayments`, data);

  }
  
  CGetPaymentsByIdSaleListWithPage( pagination: Pagination, idSale: number ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idSale: idSale

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPaymentsByIdSaleListWithPage`, data);

  }

  CInsertSaleByConsignation( data: any ): Observable<ResponseDB_CRUD> {
    
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSaleByConsignation`, data);

  }

  CRegresarProductoDeConsignacion( data: any ): Observable<ResponseDB_CRUD> {
    
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/regresarProductoDeConsignacion`, data);

  }

  CGetPreCorteCaja( idCaja: number ): Observable<ResponseGet> {
    
    const data: any = {
      idCaja: idCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPreCorteCaja`, data);

  }

  CInsertCorteCaja( idCaja: number ): Observable<ResponseDB_CRUD> {
    
    const data: any = {
      idCaja: idCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertCorteCaja`, data);

  }

  CGetPreEgresosCorteCaja( idCaja: number ): Observable<ResponseGet> {
    
    const data: any = {
      idCaja: idCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPreEgresosCorteCaja`, data);

  }

  CInsertEgresos( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertEgresos`, data);

  }

  CDisabledEgresos( idEgreso : any ): Observable<ResponseDB_CRUD> {
    var data = {
      idEgreso: idEgreso
    }
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledEgresos`, data );
  }

}