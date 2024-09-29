import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/products';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
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

  async CGetProductByIDPromise( id: number ): Promise<any> {
    var data = {
      idProduct: id
    }

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getProductByID`, data)
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

  CInsertProduct( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertProduct`, data );
  }

  CUpdateProduct( data : any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateProduct`, data );
  }

  CCbxGetProductsCombo( data:any ): Observable<ResponseGet> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

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
      , iConInventario: parametersForm.iConInventario

      , search: pagination.search
      , start: start
      , limiter: limiter
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

  CDisableProduct( id: number ): Observable<ResponseDB_CRUD> {
    var data = {
      idProduct: id
    }
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/disableProduct`, data);
  }

  CGetInventarylogByIdProductWithPage( pagination: Pagination, idProduct: number ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      idProduct: idProduct

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventarylogByIdProductWithPage`, data);

  }

  CInsertInventaryLog( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertInventaryLog`, data );
  }

  CStartPhysicInventory( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/startPhysicInventory`, data );
  }

  CGetPhysicalInventoryListWithPage( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      startDate: parametersForm.startDate
      , endDate: parametersForm.endDate
      , idSucursal: parametersForm.idSucursal
      , idFamily: parametersForm.idFamily
      , idGroup: parametersForm.idGroup

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPhysicalInventoryListWithPage`, data);

  }

  CGetPhysicalInventoryDetailListWithPage( pagination: Pagination, idPhysicalInventory: any, iOption: number ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    const data = {
      iOption: iOption
      ,idPhysicalInventory: idPhysicalInventory

      ,search: pagination.search
      ,start: start
      ,limiter: limiter
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPhysicalInventoryDetailListWithPage`, data);

  }

  CVerifyPhysicalInventoryDetail( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/verifyPhysicalInventoryDetail`, data );
  }

  CChangeStatusPhysicalInventory( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/changeStatusPhysicalInventory`, data );
  }

  CGetPhysicalInventoryHeader( id: number ): Observable<ResponseGet> {
    var data = {
      idPhysicalInventory: id
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPhysicalInventoryHeader`, data);
  }

  CUpdateMostradorPhysicalInventoryDetail( data : any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateMostradorPhysicalInventoryDetail`, data );
  }

  CGetPhysicalInventoryHeaderBySucursal( data: any ): Observable<ResponseGet> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPhysicalInventoryHeaderBySucursal`, data);
  }

  CGetCatListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCatListWithPage`, data);

  }

  CInsertUpdateCat( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertUpdateCat`, data );
  }

  CGetRepComprasProveedorListWithPage( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRepComprasProveedorListWithPage`, data);

  }

  CGetInventarylogParaFirmar( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventarylogParaFirmar`, data);

  }

  CUpdateFirmaEntradaInventario( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateFirmaEntradaInventario`, data );
  }

  CSaveDevoluInventario( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveDevoluInventario`, data );
  }

  CGetInventarylog_devolution( pagination: Pagination, data: any ): Observable<ResponseGet> {

    let start = pagination.pageIndex * pagination.pageSize;
    let limiter = pagination.pageSize;

    data.search = pagination.search;
    data.start = start;
    data.limiter = limiter;

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventarylog_devolution`, data);

  }

  CUpdateFirmaDevoluInventario( data : any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/updateFirmaDevoluInventario`, data );
  }

}
