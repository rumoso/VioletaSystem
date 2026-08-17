import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { FaceReferenceService } from 'src/app/protected/services/face-reference.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';

@Component({
  selector: 'app-face-log',
  templateUrl: './face-log.component.html',
  styleUrls: ['./face-log.component.css']
})
export class FaceLogComponent implements OnInit, OnDestroy {

// #region VARIABLES

  title = 'Bitácora Facial';
  bShowSpinner: boolean = false;

  trackList: any[] = [];
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }

  parametersForm: any = {
    modo: '',
    resultado: '',
    startDate: '',
    endDate: ''
  };

// #endregion

  constructor(
    private servicesGServ: ServicesGService
    , private faceReferenceServ: FaceReferenceService
    , private authServ: AuthService
    , private pageTitleServ: PageTitleService
    ) { }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }

  ngOnInit() {
    this.authServ.checkSession();
    this.pageTitleServ.set('face', 'Bitácora Facial', 'Historial de verificaciones e identificaciones faciales');
    this.fn_getTrack();
  }

// #region MÉTODOS PARA EL FRONT

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getTrack();
  }

  parametersForm_Clear(){
    this.parametersForm = { modo: '', resultado: '', startDate: '', endDate: '' };
    this.pagination.pageIndex = 0;
    this.fn_getTrack();
  }

// #endregion

// #region CONEXIONES AL BACK

  fn_getTrack() {
    this.bShowSpinner = true;
    this.faceReferenceServ.CGetFaceVerificationLogTrack(this.pagination, this.parametersForm)
    .subscribe({
      next: (resp: ResponseGet) => {
        if (resp.status === 0) {
          this.trackList = resp.data.rows || [];
          this.pagination.length = resp.data.count || 0;
        }
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        this.servicesGServ.showSnakbar('Error al cargar la bitácora');
        this.bShowSpinner = false;
      }
    });
  }

// #endregion

}
