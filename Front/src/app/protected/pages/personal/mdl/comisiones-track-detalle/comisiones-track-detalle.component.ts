import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ComisionesTrackService } from 'src/app/protected/services/comisiones-track.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { ActionAuthorizationComponent } from '../../../security/users/mdl/action-authorization/action-authorization.component';
import { ComisionManualComponent } from '../comision-manual/comision-manual.component';

// Tracking de comisiones (analisis/008): detalle renglón por renglón,
// filtrable — de un empleado específico o de todos. Desde aquí se
// captura manual y se cancela, AMBAS gateadas con autorización especial
// al momento (ActionAuthorizationComponent: código de un usuario con el
// permiso, o rostro) — mismo patrón que cancelar ventas/comisiones del
// módulo viejo.

@Component({
  selector: 'app-comisiones-track-detalle',
  templateUrl: './comisiones-track-detalle.component.html',
  styleUrls: ['../../personal-catalogo-list/personal-catalogo-list.component.css', '../../comisiones-track-list/comisiones-track-list.component.css', './comisiones-track-detalle.component.css']
})
export class ComisionesTrackDetalleComponent implements OnInit {

  idUser: number = 0;
  nombreEmpleado: string = '';

  bShowSpinner: boolean = false;
  catlist: any[] = [];
  huboCambios: boolean = false;

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
    private dialogRef: MatDialogRef<ComisionesTrackDetalleComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private servicesGServ: ServicesGService
    , private comisionesServ: ComisionesTrackService
    ) { }

  ngOnInit(): void {

    this.idUser = this.ODataP.idUser || 0;
    this.nombreEmpleado = this.ODataP.nombreEmpleado || '';
    this.startDateControl.setValue(this.ODataP.startDate || '');
    this.endDateControl.setValue(this.ODataP.endDate || '');

    this.fn_getList();
  }

  get titulo(): string {
    return this.idUser > 0 ? `Tracking de comisiones — ${ this.nombreEmpleado }` : 'Tracking de comisiones (todos)';
  }

  fn_buscar() {
    this.pagination.pageIndex = 0;
    this.fn_getList();
  }

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getList();
  }

  fn_getList() {

    this.bShowSpinner = true;
    this.comisionesServ.CGetList(this.pagination, {
      idUser: this.idUser,
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

  // Captura manual: primero la autorización especial (código/rostro de
  // un usuario con comisiones_Capturar), luego el modal de captura con
  // el auth_idUser obtenido.
  fn_capturarManual() {

    this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, {
      actionName: 'comisiones_Capturar'
      , bShowAlert: false
    }, '400px')
    .afterClosed().subscribe({
      next: (auth_idUser: any) => {
        if (auth_idUser) {

          this.servicesGServ.showModalWithParams(ComisionManualComponent, {
            auth_idUser,
            idUser: this.idUser,
            nombreEmpleado: this.nombreEmpleado
          }, '440px')
          .afterClosed().subscribe({
            next: (huboCambios: any) => {
              if (huboCambios) {
                this.huboCambios = true;
                this.fn_getList();
              }
            }
          });

        }
      }
    });
  }

  // Cancelación: autorización especial primero, luego el motivo.
  fn_cancelar( item: any ) {

    this.servicesGServ.showModalWithParams(ActionAuthorizationComponent, {
      actionName: 'comisiones_Cancelar'
      , bShowAlert: false
    }, '400px')
    .afterClosed().subscribe({
      next: (auth_idUser: any) => {
        if (auth_idUser) {

          const motivo = window.prompt(`Motivo para cancelar "${ item.concepto }":`);

          if (motivo === null) {
            return;
          }
          if (!motivo.trim()) {
            this.servicesGServ.showSnakbar('El motivo es obligatorio.');
            return;
          }

          this.bShowSpinner = true;
          this.comisionesServ.CCancelar(item.id, motivo.trim(), auth_idUser)
            .subscribe({
              next: (resp: any) => {
                this.servicesGServ.showSnakbar(resp.message);
                this.bShowSpinner = false;
                if (resp.status === 0) {
                  this.huboCambios = true;
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
    });
  }

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

}
