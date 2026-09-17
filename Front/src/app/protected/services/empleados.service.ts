import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Datos de empleado como complemento del usuario y su listado base de
// conceptos de nómina (analisis/006 y analisis/018). La persona es el
// usuario: baja, reactivación y eliminación van por idUser.

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

  CGetByIdUser( idUser: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/getEmpleadoByIdUser`, { idUser } );
  }

  CInsertUpdate( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertUpdateEmpleado`, data );
  }

  CGetBajaImpacto( idUser: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getBajaImpacto`, { idUser } );
  }

  CBaja( idUser: number, fechaBaja: string | null ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/bajaEmpleado`, { idUser, fechaBaja } );
  }

  CReactivar( idUser: number, fechaIngreso: string | null ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/reactivarEmpleado`, { idUser, fechaIngreso } );
  }

  CDelete( idUser: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteEmpleado`, { idUser } );
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
