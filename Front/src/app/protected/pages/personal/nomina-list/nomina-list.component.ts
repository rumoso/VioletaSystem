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
import { PrinterPDFService } from 'src/app/protected/services/printer-pdf.service';
import { NominaGenerarComponent } from '../mdl/nomina-generar/nomina-generar.component';
import { NominaReciboComponent } from '../mdl/nomina-recibo/nomina-recibo.component';

// Lista de nómina (analisis/007): un renglón por CORRIDA (lote), con
// el detalle de sus empleados desplegable en línea — sin modal
// intermedio, pero sin ensuciar la pantalla con cientos de recibos
// sueltos. Los recibos se cargan bajo demanda al expandir y se cachean.

@Component({
  selector: 'app-nomina-list',
  templateUrl: './nomina-list.component.html',
  styleUrls: ['../estilos/personal-lista.css', './nomina-list.component.css']
})
export class NominaListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  // Expansión en línea: qué corridas están abiertas, sus recibos ya
  // cargados, y cuáles están cargando en este momento.
  expandidas: Set<number> = new Set<number>();
  recibosPorNomina: { [idNomina: number]: any[] } = {};
  cargandoRecibos: Set<number> = new Set<number>();

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
    , private printerServ: PrinterPDFService
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

  get bPuedeEliminar(): boolean {
    return this.authServ.hasPermissionAction('nomina_Eliminar');
  }

  get bPuedePagar(): boolean {
    return this.authServ.hasPermissionAction('nomina_Pagar');
  }

  get bPuedeCancelar(): boolean {
    return this.authServ.hasPermissionAction('nomina_Cancelar');
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
          // Sin modal: la corrida nueva queda ya expandida en el
          // listado, así se ven sus empleados de inmediato.
          this.expandidas.add(idNueva);
          this.fn_cargarRecibos(idNueva);
          this.fn_getList();
        }
      }
    });
  }

  // El rango de fechas es opcional (analisis/007): sin fechas, la
  // corrida tomó todo lo pendiente al generarse.
  fn_periodoDesc( item: any ): string {
    if (item.fechaInicioDesc && item.fechaFinDesc) { return `${ item.fechaInicioDesc } — ${ item.fechaFinDesc }`; }
    if (item.fechaInicioDesc) { return `Desde ${ item.fechaInicioDesc }`; }
    if (item.fechaFinDesc) { return `Hasta ${ item.fechaFinDesc }`; }
    return `Todo lo pendiente — generada el ${ item.createDateDesc }`;
  }

  // ---- Expansión en línea del detalle por empleado ----

  // Los recibos de una corrida ya cargada; [] mientras no lo esté (el
  // template distingue "cargando" de "vacío" con cargandoRecibos).
  fn_recibos( idNomina: number ): any[] {
    return this.recibosPorNomina[idNomina] || [];
  }

  fn_toggle( item: any ) {

    if (this.expandidas.has(item.id)) {
      this.expandidas.delete(item.id);
      return;
    }

    this.expandidas.add(item.id);

    if (!this.recibosPorNomina[item.id]) {
      this.fn_cargarRecibos(item.id);
    }
  }

  private fn_cargarRecibos( idNomina: number ) {

    this.cargandoRecibos.add(idNomina);

    this.nominaServ.CGetDetalle(idNomina)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.recibosPorNomina[idNomina] = resp.status === 0 ? (resp.data.recibos || []) : [];
          this.cargandoRecibos.delete(idNomina);
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.recibosPorNomina[idNomina] = [];
          this.cargandoRecibos.delete(idNomina);
        }
      });
  }

  // Tras cualquier cambio dentro de una corrida hay que refrescar sus
  // recibos Y el renglón maestro (los totales del lote cambiaron).
  private fn_refrescarCorrida( idNomina: number ) {
    delete this.recibosPorNomina[idNomina];
    if (this.expandidas.has(idNomina)) {
      this.fn_cargarRecibos(idNomina);
    }
    this.fn_getList();
  }

  fn_abrirRecibo( item: any, recibo: any ) {

    this.servicesGServ.showModalWithParams(NominaReciboComponent, { idNominaRecibo: recibo.id }, '620px')
    .afterClosed().subscribe({
      next: () => { this.fn_refrescarCorrida(item.id); }
    });

  }

  // Excluye solo a este empleado de la corrida (permiso nomina_Generar,
  // solo BORRADOR); la corrida sigue viva con los demás.
  fn_excluir( item: any, recibo: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de excluir a "${ recibo.nombreEmpleado }" de esta nómina`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CExcluirRecibo(recibo.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.fn_refrescarCorrida(item.id);
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

  // PDF del recibo de un empleado sin abrir el modal: se trae su
  // detalle y se manda al mismo generador que usa el modal (el
  // servicio decide qué renglón va de cada lado).
  fn_pdfRecibo( recibo: any ) {

    this.bShowSpinner = true;

    this.nominaServ.CGetRecibo(recibo.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0) {
            this.printerServ.generarPDFReciboNomina(resp.data.recibo, resp.data.detalle);
          } else {
            this.servicesGServ.showSnakbar(resp.message);
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

  // ---- Acciones sobre UN empleado (analisis/013) ----

  fn_pagarRecibo( item: any, recibo: any ) {

    this.servicesGServ.showDialog('¿Confirmar pago?'
      , `Está a punto de pagar a "${ recibo.nombreEmpleado }" por ${ recibo.neto }. Solo se paga a esta persona; los demás del lote quedan igual.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CPagarRecibo(recibo.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.fn_refrescarCorrida(item.id);
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

  fn_cancelarRecibo( item: any, recibo: any ) {

    const motivo = window.prompt(`Motivo para cancelar el pago de "${ recibo.nombreEmpleado }":`);

    if (motivo === null) {
      return;
    }
    if (!motivo.trim()) {
      this.servicesGServ.showSnakbar('El motivo es obligatorio.');
      return;
    }

    this.bShowSpinner = true;
    this.nominaServ.CCancelarRecibo(recibo.id, motivo.trim())
      .subscribe({
        next: (resp2: any) => {
          this.servicesGServ.showSnakbar(resp2.message);
          this.bShowSpinner = false;
          if (resp2.status === 0) {
            this.fn_refrescarCorrida(item.id);
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.servicesGServ.showSnakbar('Problemas con el servicio');
          this.bShowSpinner = false;
        }
      });
  }

  // ---- Acciones sobre la corrida completa (el lote) ----

  fn_pagar( item: any ) {

    this.servicesGServ.showDialog('¿Confirmar pago?'
      , `Está a punto de pagar los ${ item.iPendientes } recibo(s) que siguen pendientes en esta nómina. Después de pagar no se pueden editar.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CPagar(item.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.fn_refrescarCorrida(item.id);
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

  // Eliminación física (permiso especial nomina_Eliminar, solo
  // BORRADOR) de la corrida completa.
  fn_eliminar( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de ELIMINAR POR COMPLETO la nómina "${ this.fn_periodoDesc(item) }" (${ item.iEmpleados } empleado(s)). Esta acción no se puede deshacer.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaServ.CDelete(item.id)
            .subscribe({
              next: (resp2: any) => {
                this.servicesGServ.showSnakbar(resp2.message);
                this.bShowSpinner = false;
                if (resp2.status === 0) {
                  this.expandidas.delete(item.id);
                  delete this.recibosPorNomina[item.id];
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
