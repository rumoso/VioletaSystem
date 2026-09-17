import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// TimeCard: control de horas trabajadas (analisis/011). Los métodos del
// checador (getEstadoTimecard/insertMarcaje) NO dependen de la sesión —
// se usan también desde el login, sin usuario logueado.

@Injectable({
  providedIn: 'root'
})
export class TimecardService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/timecard';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  // ---- Checador (público) ----

  // Checador (analisis/020): se manda el comprobante que entregó el
  // servidor al identificar el rostro. Quién es y con qué similitud los
  // toma el servidor del comprobante. Consultar el estado no lo gasta;
  // registrar el marcaje sí.
  CGetEstado( ticket: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getEstadoTimecard`, { ticket } );
  }

  CInsertMarcaje( ticket: string, tipo: string, idSucursal: number | null = null ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/insertMarcaje`, { ticket, tipo, idSucursal } );
  }

  // ---- Captura / corrección manual ----

  CInsertMarcajeManual( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertMarcajeManual`, data );
  }

  // ---- Consulta de asistencia ----

  CGetAsistenciaList( idEmpleado: number, startDate: string, endDate: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getAsistenciaList`, { idEmpleado, startDate, endDate } );
  }

  // ---- Reporte semanal (analisis/012) ----

  CGetAsistenciaSemanal( startDate: string, endDate: string, idEmpleado: number | null = null ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getAsistenciaSemanal`, { startDate, endDate, idEmpleado } );
  }

  // ---- Horarios ----

  CGetHorarioSucursal( idSucursal: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getHorarioSucursal`, { idSucursal } );
  }

  CGuardarHorarioSucursal( idSucursal: number, dias: any[] ): Observable<any> {
    const data: any = { idSucursal, dias };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/guardarHorarioSucursal`, data );
  }

  CGetHorarioEmpleado( idEmpleado: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getHorarioEmpleado`, { idEmpleado } );
  }

  CGuardarHorarioEmpleado( idEmpleado: number, dias: any[] ): Observable<any> {
    const data: any = { idEmpleado, dias };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/guardarHorarioEmpleado`, data );
  }

}
