import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductsService
{

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/products';
  
  constructor(
    private http: HttpClient
  ) { }

  CGetProductsListWithPage( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idUser: parametersForm.idUser
      , idSucursal: parametersForm.idSucursal
      , createDateStart: parametersForm.createDateStart
      , createDateEnd: parametersForm.createDateEnd
      , barCode: parametersForm.barCode
      , name: parametersForm.name
      , description: parametersForm.description
      , idFamily: parametersForm.idFamily
      , idGroup: parametersForm.idGroup
      , idQuality: parametersForm.idQuality
      , idOrigin: parametersForm.idOrigin

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getProductsListWithPage`, data);

  }

  CGetProductByID( id: number ): Observable<ResponseGet> {
    var data = {
      idProduct: id
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getProductByID`, data);
  }

  CInsertProduct( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertProduct`, data );
  }

  CUpdateProduct( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateProduct`, data );
  }

  CCbxGetProductsCombo( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetProductsCombo`, data);
  }

  CGetProductByBarCode( barCode: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      barCode: barCode
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getProductByBarCode`, data);
  }

  CGetInventaryListWithPage( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {
    
    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idUser: parametersForm.idUser
      , idSucursal: parametersForm.idSucursal
      , barCode: parametersForm.barCode
      , name: parametersForm.name
      , description: parametersForm.description
      , idFamily: parametersForm.idFamily
      , idGroup: parametersForm.idGroup
      , idQuality: parametersForm.idQuality
      , idOrigin: parametersForm.idOrigin

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventaryListWithPage`, data);

  }

  CGetInventaryBySucursal( parametersForm: any ): Observable<ResponseGet> {
    
    const data = {
      idUser: parametersForm.idUser
      , idSucursal: parametersForm.idSucursal
      , barCode: parametersForm.barCode
      , name: parametersForm.name
      , description: parametersForm.description
      , idFamily: parametersForm.idFamily
      , idGroup: parametersForm.idGroup
      , idQuality: parametersForm.idQuality
      , idOrigin: parametersForm.idOrigin

    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventaryBySucursal`, data);

  }


}
