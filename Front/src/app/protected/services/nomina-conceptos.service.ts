import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Catálogo de conceptos de nómina (analisis/006).

@Injectable({
  providedIn: 'root'
})
export class NominaConceptosService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/nominaConceptos';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  CGetList( pagination: Pagination, tipo: string = '' ): Observable<ResponseGet> {
    const data = {
      search: pagination.search,
      tipo,
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getNominaConceptosList`, data );
  }

  CCbxGetConceptosActivos( idEmpleado: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/cbxGetConceptosActivos`, { idEmpleado } );
  }

  CInsertUpdate( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertUpdateNominaConcepto`, data );
  }

  CSetActive( id: number, active: boolean ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/setActiveNominaConcepto`, { id, active } );
  }

  CDelete( id: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteNominaConcepto`, { id } );
  }

}
