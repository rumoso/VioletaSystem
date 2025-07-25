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
      idSeller_idUser: params.idSeller_idUser
      , idCustomer: params.idCustomer
      , idSaleType: params.idSaleType
      , fechaEntrega: params.fechaEntrega

      , saleDetail: params.saleDetail
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSale`, data);

  }

  CGetVentasListWithPage( pagination: Pagination, params: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    var bPending = params.bPending;
    var bPagada = params.bPagada;

    // Validar si los filtros están vacíos
    const isEmpty = (
      (!params.search || params.search.trim() === '') &&
      (!params.idCustomer || params.idCustomer === '' || params.idCustomer == 0) &&
      (!params.idSaleType || params.idSaleType === '' || params.idSaleType == 0) &&
      (!params.bCancel && !params.bPending && !params.bPagada) &&
      (!params.createDateStart || params.createDateStart === '') &&
      (!params.createDateEnd || params.createDateEnd === '')
    );

    // Si están vacíos, asignar fecha de hoy en formato ddMMyyyy
    if (isEmpty) {
      const today = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const fechaFin = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(today.getDate() - 3);
      const fechaInicio = `${threeDaysAgo.getFullYear()}-${pad(threeDaysAgo.getMonth() + 1)}-${pad(threeDaysAgo.getDate())}`;

      params.createDateStart = fechaInicio;
      params.createDateEnd = fechaFin;
    }

    const data: any = {
      createDateStart: params.createDateStart
      , createDateEnd: params.createDateEnd
      , idCustomer: params.idCustomer
      , idSaleType: params.idSaleType

      , bCancel: params.bCancel
      , bPending: params.bPending
      , bPagada: params.bPagada

      ,search: params.search
      ,start: start
      ,limiter: limiter

    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getVentasListWithPage`, data );

  }

  CGetSaleByID( idSale: any ): Observable<ResponseGet> {

    var data: any = {
      idSale: idSale
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSaleByID`, data);

  }

  async CGetSaleByIDPromise( idSale: any ): Promise<any> {
    var data: any = {
      idSale: idSale
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

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

  CGetPaymentsByIdSaleListWithPage( pagination: Pagination, idSale: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    var data: any = {
      idSale: idSale

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPaymentsByIdSaleListWithPage`, data);

  }

  CInsertSaleByConsignation( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSaleByConsignation`, data);

  }

  CRegresarProductoDeConsignacion( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/regresarProductoDeConsignacion`, data);

  }

  CGetPreCorteCaja( data: any ): Observable<ResponseGet> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPreCorteCaja`, data);

  }

  CInsertCorteCaja( data: any ): Observable<ResponseDB_CRUD> {

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
    var data: any = {
      idEgreso: idEgreso
    }

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledEgresos`, data );
  }

  async CGetCorteCajaByIDPromise( idCorteCaja: any ): Promise<any> {
    var data: any = {
      idCorteCaja: idCorteCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCorteCajaByID`, data)
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

  async CGetCorteCajaDetailByIDPromise( idCorteCaja: number ): Promise<any> {
    var data: any = {
      idCorteCaja: idCorteCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCorteCajaDetailByID`, data)
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

  async CGetEgresosByIDCorteCaja( idCorteCaja: number ): Promise<any> {
    var data: any = {
      idCorteCaja: idCorteCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEgresosByIDCorteCaja`, data)
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

  CGetCorteCajaListWithPage( pagination: Pagination, params: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data: any = {
      createDateStart: params.createDateStart
      ,createDateEnd: params.createDateEnd
      ,idSucursal: params.idSucursal
      ,idCaja: params.idCaja

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCorteCajaListWithPage`, data);

  }

  CDisabledSale( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledSale`, data);

  }

  CGetCorteCajaByID( idCorteCaja: any ): Observable<ResponseGet> {
    var data: any = {
      idCorteCaja: idCorteCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCorteCajaByID`, data);

  }

  CGetConsHistory( idSale: any ): Observable<ResponseGet> {
    var data: any = {
      idSale: idSale
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getConsHistory`, data);

  }

  async CGetConsHistoryPromise( idSale: any ): Promise<any> {
    var data: any = {
      idSale: idSale
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getConsHistory`, data)
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

  async CGetEgresoByIDPromise( idEgreso: any ): Promise<any> {
    var data: any = {
      idEgreso: idEgreso
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEgresoByID`, data)
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

  CDisabledPayment( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledPayment`, data );
  }

  CGetEgresosListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEgresosListWithPage`, data);

  }

  CDisableSaleDetail( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disableSaleDetail`, data );
  }

  CEditSobreTaller( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/editSobreTaller`, data );
  }

  CGetRepVentasDetailWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRepVentasDetailWithPage`, data );

  }

  CCbxGetSobreTellerStatusCombo( data : any ): Observable<ResponseGet> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetSobreTellerStatusCombo`, data );
  }

  CInsertIngresos( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertIngresos`, data);

  }

  CGetPreIngresosCorteCaja( idCaja: number ): Observable<ResponseGet> {

    const data: any = {
      idCaja: idCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPreIngresosCorteCaja`, data);

  }

  CDisabledIngresos( idIngreso : any ): Observable<ResponseDB_CRUD> {
    var data: any = {
      idIngreso: idIngreso
    }

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disabledIngresos`, data );
  }

  async CGetIngresoByIDPromise( idIngreso: any ): Promise<any> {
    var data: any = {
      idIngreso: idIngreso
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getIngresoByID`, data)
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

  async CGetIngresosByIDCorteCaja( idCorteCaja: number ): Promise<any> {
    var data: any = {
      idCorteCaja: idCorteCaja
    };

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getIngresosByIDCorteCaja`, data)
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

  CGetIngresosListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getIngresosListWithPage`, data);

  }

  CGetDatosRelacionadosByIDCorteCaja( data: any ): Observable<ResponseGet> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getDatosRelacionadosByIDCorteCaja`, data);

  }

  CGetRepPagosCanceladosWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRepPagosCanceladosWithPage`, data );

  }

  CGetRepPagosWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRepPagosWithPage`, data );

  }

}
