import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ElectronicMoneyService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/electronicMoney';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetElectronicMoneyListWithPage( pagination: Pagination, idCustomer: number ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idCustomer: idCustomer
      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    // console.log( 'Serv Before' );
    // console.log( data )
    // console.log( 'After Before' );

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getElectronicMoneyListWithPage`, data);

  }

  CInsertElectronicMoney( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertElectronicMoney`, data );
  }

  CDeleteElectronicMoney( keyx : number ): Observable<ResponseDB_CRUD> {

    let data: any = {
      keyx: keyx
    }

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteElectronicMoney`, data );
  }

  CGetRepElectronicMoneyListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRepElectronicMoneyListWithPage`, data);

  }

}
