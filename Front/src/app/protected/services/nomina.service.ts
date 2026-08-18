import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';

// Pago de nómina (analisis/007).

@Injectable({
  providedIn: 'root'
})
export class NominaService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/nomina';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  CGenerar( fechaInicio: string, fechaFin: string, idsEmpleados: number[] = [] ): Observable<any> {
    const data: any = { fechaInicio, fechaFin, idsEmpleados };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/generarNomina`, data );
  }

  CGetList( pagination: Pagination, estatus: string = '', idsEmpleados: number[] = [] ): Observable<ResponseGet> {
    const data = {
      pageSize: pagination.pageSize,
      pageIndex: pagination.pageIndex,
      estatus,
      idsEmpleados
    };
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getNominasList`, data );
  }

  CGetDetalle( id: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getNominaDetalle`, { id } );
  }

  CGetRecibo( idNominaRecibo: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getRecibo`, { idNominaRecibo } );
  }

  CInsertUpdateReciboDetalle( data: any ): Observable<any> {
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/insertUpdateReciboDetalle`, data );
  }

  CDeleteReciboDetalle( id: number, auth_idUser: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteReciboDetalle`, { id, auth_idUser } );
  }

  CExcluirRecibo( idNominaRecibo: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/excluirRecibo`, { idNominaRecibo } );
  }

  // Pago por empleado (analisis/013): paga solo ese recibo. El pago por
  // lote (CPagar) se conserva como atajo para pagar todos los pendientes.
  CPagarRecibo( idNominaRecibo: number ): Observable<any> {
    const data: any = { idNominaRecibo };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/pagarRecibo`, data );
  }

  CCancelarRecibo( idNominaRecibo: number, motivo: string ): Observable<any> {
    const data: any = { idNominaRecibo, motivo };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/cancelarRecibo`, data );
  }

  CPagar( id: number ): Observable<any> {
    const data: any = { id };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/pagarNomina`, data );
  }

  CCancelar( id: number, motivo: string ): Observable<any> {
    const data: any = { id, motivo };
    data.idUserLogON = this.authServ.getIdUserSession();
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/cancelarNomina`, data );
  }

  CDelete( id: number ): Observable<any> {
    return this.http.post<any>( `${ this.baseURL }/${ this._api }/deleteNomina`, { id } );
  }

  CGetNominasByEmpleado( idEmpleado: number ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getNominasByEmpleado`, { idEmpleado } );
  }

}
