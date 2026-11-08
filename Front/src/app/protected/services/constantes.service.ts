import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ResponseGet } from '../interfaces/global.interfaces';

// Catálogo de constantes del sistema (analisis/040). Todas las rutas
// exigen sesión: el token va en `x-token`.

export interface Constante {
  idConstante: number;
  sKey: string;
  sValue: string;
  sValue2: string | null;
  sValue3: string | null;
  sValue4: string | null;
  active: number;
  createDateDesc?: string;
  createUserDesc?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConstantesService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/constantes';

  constructor(
    private http: HttpClient
  ) { }

  private fn_headersSesion(): HttpHeaders {
    return new HttpHeaders({ 'x-token': localStorage.getItem('token') || '' });
  }

  CGetConstantesList( search: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getConstantesList`, { search }, { headers: this.fn_headersSesion() } );
  }

  CSaveConstante( data: { idConstante: number; sKey: string; sValue: string; sValue2: string | null; sValue3: string | null; sValue4: string | null; active: number } ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/saveConstante`, data, { headers: this.fn_headersSesion() } );
  }

  CSetConstanteActiva( idConstante: number, active: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/setConstanteActiva`, { idConstante, active }, { headers: this.fn_headersSesion() } );
  }

  CDeleteConstante( idConstante: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/deleteConstante`, { idConstante }, { headers: this.fn_headersSesion() } );
  }

}
