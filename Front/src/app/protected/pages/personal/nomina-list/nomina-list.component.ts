import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { NominaService } from 'src/app/protected/services/nomina.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { NominaGenerarComponent } from '../mdl/nomina-generar/nomina-generar.component';
import { NominaReciboComponent } from '../mdl/nomina-recibo/nomina-recibo.component';

// Lista de nómina (analisis/007): un renglón por recibo de empleado,
// SIN agrupar por corrida — cada renglón abre su recibo directo
// (NominaReciboComponent), que ya trae Pagar/Cancelar/Eliminar de la
// corrida completa a la que pertenece.

@Component({
  selector: 'app-nomina-list',
  templateUrl: './nomina-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css', './nomina-list.component.css']
})
export class NominaListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  estatusControl: FormControl = new FormControl('');

  empleadoSearchControl: FormControl = new FormControl('');
  empleadosEncontrados: any[] = [];
  bBuscandoEmpleados: boolean = false;
  empleadosFiltro: any[] = [];

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
    , private empleadosServ: EmpleadosService
    , private pageTitleServ: PageTitleService
    ) {
      this.empleadoSearchControl.valueChanges
        .pipe(debounceTime(500))
        .subscribe((valor: any) => {
          if (typeof valor === 'string' && valor.trim().length > 0) {
            this.fn_buscarEmpleados(valor);
          } else {
            this.empleadosEncontrados = [];
          }
        });
    }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.pageTitleServ.set('payments', 'Nómina', 'Corridas de pago y recibos por empleado');
    this.fn_getList();
  }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }

  get bPuedeGenerar(): boolean {
    return this.authServ.hasPermissionAction('nomina_Generar');
  }

  get bPuedeExcluir(): boolean {
    return this.authServ.hasPermissionAction('nomina_Generar');
  }

  private fn_buscarEmpleados( search: string ) {

    this.bBuscandoEmpleados = true;
    this.empleadosServ.CGetList({ search, length: 0, pageSize: 10, pageIndex: 0, pageSizeOptions: [] })
      .subscribe({
        next: (resp: ResponseGet) => {
          const rows = resp.status === 0 ? (resp.data.rows || []) : [];
          const idsYaElegidos = new Set(this.empleadosFiltro.map(e => e.id));
          this.empleadosEncontrados = rows.filter((e: any) => !idsYaElegidos.has(e.id));
          this.bBuscandoEmpleados = false;
        },
        error: () => {
          this.empleadosEncontrados = [];
          this.bBuscandoEmpleados = false;
        }
      });
  }

  fn_agregarEmpleadoFiltro( empleado: any ) {
    this.empleadosFiltro.push(empleado);
    this.empleadosEncontrados = this.empleadosEncontrados.filter(e => e.id !== empleado.id);
    this.empleadoSearchControl.setValue('', { emitEvent: false });
    this.fn_buscar();
  }

  fn_quitarEmpleadoFiltro( empleado: any ) {
    this.empleadosFiltro = this.empleadosFiltro.filter(e => e.id !== empleado.id);
    this.fn_buscar();
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
    this.nominaServ.CGetList(this.pagination, this.estatusControl.value || '', this.empleadosFiltro.map(e => e.id))
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
          // Sin abrir ningún modal: los recibos de la corrida nueva ya
          // aparecen directo en el listado (renglón por empleado, sin
          // agrupar) al refrescar.
          this.fn_getList();
        }
      }
    });
  }

  // El rango de fechas es opcional (analisis/007): sin fechas, la
  // corrida tomó todas las comisiones pendientes al generarse.
  fn_periodoDesc( item: any ): string {
    if (item.fechaInicioDesc && item.fechaFinDesc) { return `${ item.fechaInicioDesc } — ${ item.fechaFinDesc }`; }
    if (item.fechaInicioDesc) { return `Desde ${ item.fechaInicioDesc }`; }
    if (item.fechaFinDesc) { return `Hasta ${ item.fechaFinDesc }`; }
    return 'Todas las comisiones pendientes';
  }

  // Cada renglón ya ES un recibo — se abre directo. Ese modal trae sus
  // propias acciones de Pagar/Cancelar/Eliminar de la corrida completa
  // (nomina-recibo.component), así que aplanar la lista no le quita
  // nada al flujo por lote.
  fn_abrirRecibo( item: any ) {

    this.servicesGServ.showModalWithParams(NominaReciboComponent, { idNominaRecibo: item.id }, '620px')
    .afterClosed().subscribe({
      next: () => { this.fn_getList(); }
    });

  }

  // Excluye solo a este empleado de su corrida (permiso nomina_Generar,
  // solo BORRADOR) — para borrar la corrida completa, esa acción vive
  // en el recibo (fn_abrirRecibo), donde el contexto de "a quiénes
  // afecta" es claro.
  fn_excluir( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de excluir a "${ item.nombreEmpleado }" de esta nómina`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CExcluirRecibo(item.id)
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
