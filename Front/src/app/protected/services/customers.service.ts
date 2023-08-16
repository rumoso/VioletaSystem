import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class CustomersService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/customers';
  
  constructor(
    private http: HttpClient
    , private authServ: AuthService
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

  async CGetCustomerByIDPromise( id: number ): Promise<any> {
    var data = {
      idCustomer: id
    }

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCustomerByID`, data)
      .subscribe({
        next: ( resp: ResponseGet ) => {
          resolve( resp.data );
        }
        , error: ( err: any ) => {
          reject( err );
        }
      });

    });

  }

  CInsertCustomer( data : any ): Observable<ResponseDB_CRUD> {
    
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

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
