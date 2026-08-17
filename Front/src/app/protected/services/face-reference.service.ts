import { HttpClient } from '@angular/common/http';
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

  CSaveFaceReference( data: any ): Observable<ResponseDB_CRUD> {

    data.idUserLogON = this.authServ.getIdUserSession();

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/saveFaceReference`, data );

  }

  CGetFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseGet> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceReference`, data );

  }

  CDeleteFaceReference( tipoPersona: string, idPersona: number ): Observable<ResponseDB_CRUD> {

    const data = { tipoPersona, idPersona };

    return this.http.post<ResponseDB_CRUD>( `${ this.baseURL }/${ this._api }/deleteFaceReference`, data );

  }

  CGetFaceReferences( tipoPersona: string = '' ): Observable<ResponseGet> {

    const data = { tipoPersona };

    return this.http.post<ResponseGet>( `${ this.baseURL }/${ this._api }/getFaceReferences`, data );

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
