import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { ResponseGet } from '../interfaces/global.interfaces';

@Injectable({
  providedIn: 'root'
})
export class RepUtilidadesService {

  private baseURL: string = environment.baseUrl;
  private idSucursal: number = environment.idSucursal;

  _api: string = 'api/rep_utilidades';
  
  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  CGet_rep_getUtilidades( data: any ): Observable<ResponseGet> {
    
    data.idUserLogON = this.authServ.getIdUserSession();
    data.idSucursalLogON = this.idSucursal;

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/get_rep_getUtilidades`, data);

  }
}
