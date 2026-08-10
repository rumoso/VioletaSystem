import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ComisionesTrackService } from 'src/app/protected/services/comisiones-track.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ComisionManualComponent } from '../mdl/comision-manual/comision-manual.component';

// Bitácora de comisiones por empleado (analisis/008). Reemplaza la
// pantalla del módulo `comisiones` viejo (solo ventas).

@Component({
  selector: 'app-comisiones-track-list',
  templateUrl: './comisiones-track-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './comisiones-track-list.component.css']
})
export class ComisionesTrackListComponent implements OnInit {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  searchControl: FormControl = new FormControl(''); // no se usa en el back (sin campo texto libre en la bitácora), reservado para futuro
  tipoControl: FormControl = new FormControl('');
  estatusControl: FormControl = new FormControl('');
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
    this.fn_getList();
  }

  get bPuedeCapturar(): boolean {
    return this.authServ.hasPermissionAction('comisiones_Capturar');
  }

  get bPuedeCancelar(): boolean {
    return this.authServ.hasPermissionAction('comisiones_Cancelar');
  }

  fn_buscar() {
    this.pagination.pageIndex = 0;
    this.fn_getList();
  }

  fn_limpiar() {
    this.tipoControl.setValue('');
    this.estatusControl.setValue('');
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
    this.comisionesServ.CGetList(this.pagination, {
      tipo: this.tipoControl.value || '',
      estatus: this.estatusControl.value || '',
      startDate: this.startDateControl.value || '',
      endDate: this.endDateControl.value || ''
    }).subscribe({
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

  fn_capturarManual() {

    this.servicesGServ.showModalWithParams(ComisionManualComponent, {}, '440px')
    .afterClosed().subscribe({
      next: (huboCambios: any) => {
        if (huboCambios) {
          this.fn_getList();
        }
      }
    });
  }

  // No hay un dialog de texto genérico en el sistema (solo confirm
  // sí/no); se usa el prompt nativo del navegador para capturar el
  // motivo, igual de válido para un texto corto y obligatorio.
  fn_cancelar( item: any ) {

    const motivo = window.prompt(`Motivo para cancelar "${ item.concepto }":`);

    if (motivo === null) {
      return; // canceló el prompt
    }
    if (!motivo.trim()) {
      this.servicesGServ.showSnakbar('El motivo es obligatorio.');
      return;
    }

    this.bShowSpinner = true;
    this.comisionesServ.CCancelar(item.id, motivo.trim())
      .subscribe({
        next: (resp: any) => {
          this.servicesGServ.showSnakbar(resp.message);
          this.bShowSpinner = false;
          if (resp.status === 0) {
            this.fn_getList();
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

}
