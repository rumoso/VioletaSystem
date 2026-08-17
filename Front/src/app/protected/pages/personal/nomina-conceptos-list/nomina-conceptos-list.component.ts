import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { NominaConceptoComponent } from '../mdl/nomina-concepto/nomina-concepto.component';

// Catálogo de conceptos de nómina (analisis/006). Los conceptos de
// fábrica (bSistema) solo se pueden inactivar — sin editar ni eliminar.

@Component({
  selector: 'app-nomina-conceptos-list',
  templateUrl: './nomina-conceptos-list.component.html',
  styleUrls: ['../personal-catalogo-list/personal-catalogo-list.component.css']
})
export class NominaConceptosListComponent implements OnInit, OnDestroy {

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  searchControl: FormControl = new FormControl('');
  tipoControl: FormControl = new FormControl('');

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
    , private nominaConceptosServ: NominaConceptosService
    , private pageTitleServ: PageTitleService
    ) { }

  ngOnInit(): void {
    this.authServ.checkSession();
    this.pageTitleServ.set('receipt_long', 'Conceptos de Nómina', 'Catálogo de percepciones y deducciones');
    this.fn_getList();
  }

  ngOnDestroy(): void {
    this.pageTitleServ.clear();
  }

  get bPuedeAdministrar(): boolean {
    return this.authServ.hasPermissionAction('nominaConceptos_Administrar');
  }

  fn_buscar() {
    this.pagination.search = this.searchControl.value || '';
    this.pagination.pageIndex = 0;
    this.fn_getList();
  }

  fn_limpiar() {
    this.searchControl.setValue('');
    this.tipoControl.setValue('');
    this.fn_buscar();
  }

  changePagination(pag: Pagination) {
    this.pagination = pag;
    this.fn_getList();
  }

  fn_getList() {

    this.bShowSpinner = true;
    this.nominaConceptosServ.CGetList(this.pagination, this.tipoControl.value || '')
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

  fn_showModal( item: any ) {

    this.servicesGServ.showModalWithParams(NominaConceptoComponent, {
      id: item ? item.id : 0,
      name: item ? item.name : '',
      tipo: item ? item.tipo : 'PERCEPCION'
    }, '440px')
    .afterClosed().subscribe({
      next: (huboCambios: any) => {
        if (huboCambios) {
          this.fn_getList();
        }
      }
    });
  }

  fn_setActive( item: any ) {

    const bActivar = !item.active;

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de ${ bActivar ? 'activar' : 'inactivar' } el concepto "${ item.name }"`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaConceptosServ.CSetActive(item.id, bActivar)
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

  fn_delete( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de ELIMINAR el concepto "${ item.name }"`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.nominaConceptosServ.CDelete(item.id)
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
