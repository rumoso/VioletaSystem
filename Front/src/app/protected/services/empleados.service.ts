import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Catálogo de empleados y su listado base de conceptos de nómina
// (analisis/006).

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/empleados';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  CGetList( pagination: Pagination ): Observable<ResponseGet> {
    const data = {
      search: pagination.search,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEmpleadosList`, data );
  }

  CGetById( id: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEmpleadoById`, { id } );
  }

  CInsertUpdate( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertUpdateEmpleado`, data );
  }

  CGetBajaImpacto( id: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getBajaImpacto`, { id } );
  }

  CBaja( id: number, fechaBaja: string ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/bajaEmpleado`, { id, fechaBaja } );
  }

  CReactivar( id: number, fechaIngreso: string ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/reactivarEmpleado`, { id, fechaIngreso } );
  }

  CDelete( id: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteEmpleado`, { id } );
  }

  CGetConceptosBase( idEmpleado: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getConceptosBase`, { idEmpleado } );
  }

  CInsertUpdateConceptoBase( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertUpdateConceptoBase`, data );
  }

  CDeleteConceptoBase( id: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteConceptoBase`, { id } );
  }

}
