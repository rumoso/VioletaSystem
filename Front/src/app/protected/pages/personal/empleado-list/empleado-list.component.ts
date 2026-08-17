import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { EmpleadoComponent } from '../mdl/empleado/empleado.component';
import { EmpleadoBajaComponent } from '../mdl/empleado-baja/empleado-baja.component';

// Lista del catálogo de empleados (analisis/006). Mismo formato visual
// que sale-list/taller-list (analisis/011, migración 2026-08-17);
// agrega los flujos de baja laboral (en cascada) y reactivación.

const AVATAR_COLORS = ['#5C6BC0', '#26A69A', '#7E57C2', '#EF5350', '#42A5F5', '#8D6E63', '#EC407A', '#66BB6A'];

@Component({
  selector: 'app-empleado-list',
  templateUrl: './empleado-list.component.html',
  styleUrls: ['./empleado-list.component.css']
})
export class EmpleadoListComponent implements OnInit {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  searchControl: FormControl = new FormControl('');

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
    , private empleadosServ: EmpleadosService
    ) { }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.fn_getList();
  }

  fn_hasPermission( name: string ): boolean {
    return this.authServ.hasPermissionAction(name);
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
    this.pagination.search = this.searchControl.value || '';
    this.pagination.pageIndex = 0;
    this.fn_getList();
  }

  fn_limpiar() {
    this.searchControl.setValue('');
    this.fn_buscar();
  }

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getList();
  }

  fn_getList() {

    this.bShowSpinner = true;
    this.empleadosServ.CGetList(this.pagination)
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

  fn_showModal( id: number ) {

    this.servicesGServ.showModalWithParams(EmpleadoComponent, { id }, '700px')
    .afterClosed().subscribe({
      next: (huboCambios: any) => {
        if (huboCambios) {
          this.fn_getList();
        }
      }
    });
  }

  // Baja laboral (cascada) o reactivación — el mismo modal maneja los
  // dos modos: muestra el impacto y captura la fecha correspondiente.
  fn_bajaReactivar( item: any ) {

    this.servicesGServ.showModalWithParams(EmpleadoBajaComponent, {
      id: item.id,
      nombre: item.nombre,
      modo: item.active ? 'BAJA' : 'REACTIVAR'
    }, '460px')
    .afterClosed().subscribe({
      next: (resp: any) => {
        if (resp) {
          this.fn_getList();
        }
      }
    });
  }

  fn_delete( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de ELIMINAR DEFINITIVAMENTE al empleado "${ item.nombre }". Esta acción no se puede deshacer.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.empleadosServ.CDelete(item.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
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

}
