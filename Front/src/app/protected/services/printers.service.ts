import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class PrintersService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/printers';
  
  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGetPrintersBySec( search: string, idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser,
      search: search
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPrintersBySec`, data);
  }

  CGetSelectPrinterByIdUser( idUser: number ): Observable<ResponseGet> {
    var data = {
      idUser: idUser
    }
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getSelectPrinterByIdUser`, data);
  }

  CInsertSelectPrinter( data: any ): Observable<ResponseDB_CRUD> {
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/insertSelectPrinter`, data );
  }

  CDeleteSelectPrinter( data: any ): Observable<ResponseDB_CRUD> {
    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteSelectPrinter`, data);
  }

  CGetPrinterByID( id: number ): Observable<ResponseGet> {
    var data: any = {
      idCaja: id
    }

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPrinterByID`, data);
  }

  async CGetPrinterByIDPromise( id: number ): Promise<any> {
    var data: any = {
      idPrinter: id
    }

    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return new Promise((resolve, reject) => {

      this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPrinterByID`, data)
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

}