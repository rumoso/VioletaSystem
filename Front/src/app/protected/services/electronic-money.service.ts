import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElectronicMoneyService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/electronicMoney';
  
  constructor(
    private http: HttpClient
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
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertElectronicMoney`, data );
  }

  CDeleteElectronicMoney( idElectronicMoney : number ): Observable<ResponseDB_CRUD> {

    let data: any = {
      idElectronicMoney: idElectronicMoney
    }

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteElectronicMoney`, data );
  }

}