import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/customers';
  
  constructor(
    private http: HttpClient
  ) { }

  CGetCustomersListWithPage( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      createDateStart: parametersForm.createDateStart
      , createDateEnd: parametersForm.createDateEnd
      , name: parametersForm.name
      , lastName: parametersForm.lastName

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCustomersListWithPage`, data);

  }

  CCbxGetCustomersCombo( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetCustomersCombo`, data);
  }

  CGetCustomerByID( id: number ): Observable<ResponseGet> {
    var data = {
      idCustomer: id
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCustomerByID`, data);
  }

  CInsertCustomer( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertCustomer`, data );
  }

  CUpdateCustomer( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateCustomer`, data );
  }

  CDeleteCustomer( id: number ): Observable<ResponseDB_CRUD> {
    var data = {
      idCustomer: id
    }
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteCustomer`, data);
  }
}
