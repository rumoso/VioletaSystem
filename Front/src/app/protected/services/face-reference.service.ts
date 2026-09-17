import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Pagination, ResponseDB_CRUD, ResponseGet } from '../interfaces/global.interfaces';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class FaceReferenceService {

  private baseURL: string = environment.baseUrl;

  _api: string = 'api/faceRecognition';

  constructor(
    private http: HttpClient
    , private authServ: AuthService
  ) { }

  // Token de sesión para las rutas que lo exigen (analisis/020):
  // registrar, consultar y borrar un rostro de referencia. El servidor
  // toma de aquí quién hizo el cambio.
  private fn_headersSesion(): HttpHeaders {
    return new HttpHeaders({ 'x-token': localStorage.getItem('token') || '' });
  }

  CSaveFaceReference( data: any ): Observable<ResponseDB_CRUD> {

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  // Solo dice si la persona tiene rostro registrado (y su miniatura): el
  // descriptor ya no sale del servidor.
  CGetFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseGet> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  CDeleteFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseDB_CRUD> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteFaceReference`, data, { headers: this.fn_headersSesion() } );

  }

  // ── Comparación en el servidor (analisis/020) ──
  // El navegador manda el descriptor de la captura; el servidor decide si
  // coincide y, si sí, entrega un comprobante de un solo uso para
  // `proposito` (LOGIN | TIMECARD | AUTORIZACION).

  CIdentificarRostro( tipoPersona: string, descriptor: number[], proposito: string, referencia: string ): Observable<ResponseGet> {

    const data = { tipoPersona, descriptor, proposito, referencia, idUserLogON: this.authServ.getIdUserSession() };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/identificarRostro`, data );

  }

  CVerificarRostro( tipoPersona: string, idPersona: number, descriptor: number[], proposito: string, referencia: string ): Observable<ResponseGet> {

    const data = { tipoPersona, idPersona, descriptor, proposito, referencia, idUserLogON: this.authServ.getIdUserSession() };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/verificarRostro`, data );

  }

  CLogFaceVerification( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/logFaceVerification`, data );

  }

  CGetCameraPreference( idUser: number ): Observable<ResponseGet> {

    const data = { idUser };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getCameraPreference`, data );

  }

  CSaveCameraPreference( data: any ): Observable<ResponseDB_CRUD> {

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveCameraPreference`, data );

  }

  CGetFaceVerificationLogTrack( pagination: Pagination, parametersForm: any ): Observable<ResponseGet> {

    const data = {
      modo: parametersForm.modo || '',
      resultado: parametersForm.resultado || '',
      startDate: parametersForm.startDate || '',
      endDate: parametersForm.endDate || '',
      start: pagination.pageIndex * pagination.pageSize,
      limiter: pagination.pageSize
    };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceVerificationLogTrack`, data );

  }

}
