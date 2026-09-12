import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { AuthService } from 'src/app/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { Pagination } from 'src/app/interfaces/general.interfaces';
import { ConsultaPanel } from '../utils/query-filtros.util';

// Panel del director (analisis/014). Un método por bloque, igual que en
// el Back: cada bloque se pide y falla por separado, para que uno lento
// o caído no deje la pantalla en blanco.

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/dashboard';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
    ) { }

  private fn_body( fecha: string, extra: any = {} ): any {
    return {
      idUserLogON: this.authServ.getIdUserSession(),
      fecha,
      ...extra
    };
  }

  CGetCartera( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCartera`, this.fn_body(fecha) );
  }

  CGetCarteraTop( fecha: string, iTop: number = 10 ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCarteraTop`, this.fn_body(fecha, { iTop }) );
  }

  CGetInventario( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getInventario`, this.fn_body(fecha) );
  }

  CGetResumenDia( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenDia`, this.fn_body(fecha) );
  }

  CGetResumenPorVendedor( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenPorVendedor`, this.fn_body(fecha) );
  }

  CGetResumenMes( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getResumenMes`, this.fn_body(fecha) );
  }

  CGetOperacion( fecha: string ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getOperacion`, this.fn_body(fecha) );
  }

  // ── Conjuntos (analisis/015) ──
  // Los registros que hay detrás de una cifra del panel, para la pantalla
  // a la que lleva su clic. La paginación se arma igual que en las listas
  // normales (pageIndex * pageSize), y ventas y pagos mandan la sucursal
  // de la terminal porque la lista normal también la aplica.

  private fn_bodyConjunto( oConsulta: ConsultaPanel, pagination: Pagination, bSucursal: boolean ): any {

    const body: any = {
      idUserLogON: this.authServ.getIdUserSession(),
      panel: oConsulta.panel,
      fecha: oConsulta.fecha,
      start: pagination.pageIndex * pagination.pageSize,
      limiter: pagination.pageSize
    };

    if( oConsulta.idVendedor > 0 ){
      body.idVendedor = oConsulta.idVendedor;
    }

    if( oConsulta.idSale ){
      body.idSale = oConsulta.idSale;
    }

    if( bSucursal ){
      body.idSucursalLogON = environment.idSucursal;
    }

    return body;

  }

  CGetVentasConjunto( oConsulta: ConsultaPanel, pagination: Pagination ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getVentasConjunto`, this.fn_bodyConjunto( oConsulta, pagination, true ) );
  }

  CGetPagosConjunto( oConsulta: ConsultaPanel, pagination: Pagination ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getPagosConjunto`, this.fn_bodyConjunto( oConsulta, pagination, true ) );
  }

  CGetProductosConjunto( oConsulta: ConsultaPanel, pagination: Pagination ): Observable<ResponseGet> {
    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getProductosConjunto`, this.fn_bodyConjunto( oConsulta, pagination, false ) );
  }

}
