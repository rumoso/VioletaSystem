import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ComisionesTrackService } from 'src/app/protected/services/comisiones-track.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
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
export class ComisionesTrackListComponent implements OnInit {

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
    ) { }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.fn_rangoInicial();
    this.fn_getList();
  }

  // Rango default: la semana en curso (lunes a hoy)
  private fn_rangoInicial() {
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    this.startDateControl.setValue(this.fn_fmt(lunes));
    this.endDateControl.setValue(this.fn_fmt(hoy));
  }

  private fn_fmt(d: Date): string {
    return `${ d.getFullYear() }-${ String(d.getMonth() + 1).padStart(2, '0') }-${ String(d.getDate()).padStart(2, '0') }`;
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
    this.fn_rangoInicial();
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
