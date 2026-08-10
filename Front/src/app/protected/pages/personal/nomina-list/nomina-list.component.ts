import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { NominaGenerarComponent } from '../mdl/nomina-generar/nomina-generar.component';
import { NominaDetalleComponent } from '../mdl/nomina-detalle/nomina-detalle.component';

// Lista de corridas de nómina (analisis/007) — patrón maestro-detalle:
// esta pantalla es el maestro, el detalle de cada corrida se abre en
// modal (NominaDetalleComponent).

@Component({
  selector: 'app-nomina-list',
  templateUrl: './nomina-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './nomina-list.component.css']
})
export class NominaListComponent implements OnInit {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  estatusControl: FormControl = new FormControl('');

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
    , private nominaServ: NominaService
    ) { }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.fn_getList();
  }

  get bPuedeGenerar(): boolean {
    return this.authServ.hasPermissionAction('nomina_Generar');
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
    this.nominaServ.CGetList(this.pagination, this.estatusControl.value || '')
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

  fn_generar() {

    this.servicesGServ.showModalWithParams(NominaGenerarComponent, {}, '440px')
    .afterClosed().subscribe({
      next: (idNueva: any) => {
        if (idNueva) {
          this.fn_getList();
          this.fn_abrirDetalle({ id: idNueva });
        }
      }
    });
  }

  fn_abrirDetalle( item: any ) {

    this.servicesGServ.showModalWithParams(NominaDetalleComponent, { id: item.id }, '900px')
    .afterClosed().subscribe({
      next: (huboCambios: any) => {
        if (huboCambios) {
          this.fn_getList();
        }
      }
    });
  }

}
