import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ComisionesTrackService } from 'src/app/protected/services/comisiones-track.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { ComisionesTrackDetalleComponent } from '../mdl/comisiones-track-detalle/comisiones-track-detalle.component';

// Comisiones (analisis/008) — pantalla principal: RESUMEN por empleado
// del total pendiente (sin cobrar) dentro del rango de fechas. El
// tracking detallado (con captura manual y cancelación, ambas bajo
// autorización especial) se abre por empleado en
// ComisionesTrackDetalleComponent.

const AVATAR_COLORS = ['#5C6BC0', '#26A69A', '#7E57C2', '#EF5350', '#42A5F5', '#8D6E63', '#EC407A', '#66BB6A'];

@Component({
  selector: 'app-comisiones-track-list',
  templateUrl: './comisiones-track-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './comisiones-track-list.component.css']
})
export class ComisionesTrackListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  startDateControl: FormControl = new FormControl('');
  endDateControl: FormControl = new FormControl('');

  pagination: Pagination = {
    search: '',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }

  constructor(
    private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private comisionesServ: ComisionesTrackService
    , private pageTitleServ: PageTitleService
    ) { }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.pageTitleServ.set('paid', 'Comisiones', 'Bitácora de comisiones por empleado');
    // Rango default VACÍO: se muestra TODO lo pendiente sin acotar por
    // fechas; el rango es solo un filtro opcional.
    this.fn_getList();
  }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }

  fn_avatarColor( nombre: string ): string {
    let hash = 0;
    for (let i = 0; i < (nombre || '').length; i++) {
      hash = (hash * 31 + nombre.charCodeAt(i)) | 0;
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  fn_inicial( nombre: string ): string {
    return (nombre || '?').trim().charAt(0).toUpperCase();
  }

  fn_buscar() {
    this.pagination.pageIndex = 0;
    this.fn_getList();
  }

  fn_limpiar() {
    this.startDateControl.setValue('');
    this.endDateControl.setValue('');
    this.fn_buscar();
  }

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getList();
  }

  fn_getList() {

    this.bShowSpinner = true;
    this.comisionesServ.CGetResumen(this.pagination, this.startDateControl.value || '', this.endDateControl.value || '')
      .subscribe({
        next: (resp: ResponseGet) => {
          this.catlist = resp.data.rows;
          this.pagination.length = resp.data.count;
          this.bShowSpinner = false;
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

  fn_abrirTracking( item: any ) {

    this.servicesGServ.showModalWithParams(ComisionesTrackDetalleComponent, {
      idUser: item ? item.idUser : 0,
      nombreEmpleado: item ? item.nombreEmpleado : '',
      startDate: this.startDateControl.value || '',
      endDate: this.endDateControl.value || ''
    }, '950px')
    .afterClosed().subscribe({
      next: () => {
        this.fn_getList();
      }
    });
  }

}
