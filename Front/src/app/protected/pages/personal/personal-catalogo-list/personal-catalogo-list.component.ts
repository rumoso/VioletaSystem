import { BreakpointObserver } from '@angular/cdk/layout';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { CatalogosPersonalService } from 'src/app/protected/services/catalogos-personal.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { PersonalCatalogoComponent } from '../mdl/personal-catalogo/personal-catalogo.component';

// Lista de catálogo de personal (analisis/005). Un solo componente
// sirve técnicos y vendedores: la ruta define `data.catalogo` y de ahí
// sale toda la configuración (títulos, permisos, servicio).

interface CatalogoConfig {
  catalogo: string;
  titulo: string;
  desc: string;
  icono: string;
  entidad: string;
  permisoCrear: string;
  permisoInactivar: string;
  permisoEliminar: string;
}

const CONFIGS: { [key: string]: CatalogoConfig } = {
  tecnicos: {
    catalogo: 'tecnicos',
    titulo: 'Catálogo de Técnicos',
    desc: 'Personal de taller y su % de destajo',
    icono: 'engineering',
    entidad: 'técnico',
    permisoCrear: 'tecnicos_CrearModificar',
    permisoInactivar: 'tecnicos_Inactivar',
    permisoEliminar: 'tecnicos_Eliminar'
  },
  vendedores: {
    catalogo: 'vendedores',
    titulo: 'Catálogo de Vendedores',
    desc: 'Personal de piso y su % de comisión base',
    icono: 'sell',
    entidad: 'vendedor',
    permisoCrear: 'vendedores_CrearModificar',
    permisoInactivar: 'vendedores_Inactivar',
    permisoEliminar: 'vendedores_Eliminar'
  }
};

// Paleta para los avatares con inicial (se elige por hash del nombre,
// estable entre cargas).
const AVATAR_COLORS = ['#5C6BC0', '#26A69A', '#7E57C2', '#EF5350', '#42A5F5', '#8D6E63', '#EC407A', '#66BB6A'];

@Component({
  selector: 'app-personal-catalogo-list',
  templateUrl: './personal-catalogo-list.component.html',
  styleUrls: ['./personal-catalogo-list.component.css']
})
export class PersonalCatalogoListComponent implements OnInit, OnDestroy {

  config: CatalogoConfig = CONFIGS['vendedores'];

  bShowSpinner: boolean = false;
  catlist: any[] = [];

  searchControl: FormControl = new FormControl('');

  iRows: number = 0;
  pagination: Pagination = {
    search: '',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }

  // Vista tabla/cards: en pantalla angosta SIEMPRE cards; en escritorio
  // se puede alternar y la preferencia queda guardada por usuario y
  // tipo de dispositivo (user_preferences).
  bEsMovil: boolean = false;
  vistaEscritorio: 'tabla' | 'cards' = 'tabla';
  private breakpointSub: Subscription | null = null;

  private routeSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute
    , private breakpointObserver: BreakpointObserver
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private catalogosServ: CatalogosPersonalService
    , private pageTitleServ: PageTitleService
    ) { }

  ngOnInit(): void {

    this.authServ.checkSession();

    // La misma instancia del componente se reutiliza si se navega entre
    // tecnicosList y vendedoresList — por eso se escucha data, no snapshot.
    this.routeSub = this.route.data.subscribe(data => {
      this.config = CONFIGS[data['catalogo']] || CONFIGS['vendedores'];
      this.pageTitleServ.set(this.config.icono, this.config.titulo, this.config.desc);
      this.searchControl.setValue('');
      this.pagination.search = '';
      this.pagination.pageIndex = 0;
      this.fn_cargarPreferenciaVista();
      this.fn_getList();
    });

    this.breakpointSub = this.breakpointObserver.observe('(max-width: 767.98px)')
      .subscribe(result => {
        this.bEsMovil = result.matches;
      });

  }

  ngOnDestroy(): void {
    this.breakpointSub?.unsubscribe();
    this.routeSub?.unsubscribe();
    this.pageTitleServ.clear();
  }

  get vistaActual(): 'tabla' | 'cards' {
    return this.bEsMovil ? 'cards' : this.vistaEscritorio;
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

  fn_setVista( vista: 'tabla' | 'cards' ) {
    if (this.bEsMovil || this.vistaEscritorio === vista) {
      return;
    }
    this.vistaEscritorio = vista;
    this.catalogosServ.CSaveUserPreference(this.config.catalogo + 'List', 'viewModeDesktop', vista)
      .subscribe({ next: () => {}, error: () => {} });
  }

  private fn_cargarPreferenciaVista() {
    this.catalogosServ.CGetUserPreferences(this.config.catalogo + 'List')
      .subscribe({
        next: (resp: ResponseGet) => {
          if (resp.status === 0 && resp.data) {
            const pref = resp.data.find((p: any) => p.prefKey === 'viewModeDesktop');
            if (pref && (pref.prefValue === 'tabla' || pref.prefValue === 'cards')) {
              this.vistaEscritorio = pref.prefValue;
            }
          }
        },
        error: () => {}
      });
  }

  // Búsqueda con botón o Enter (no por tecla); resetea a la página 1.
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
    this.catalogosServ.CGetList(this.config.catalogo, this.pagination)
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

    this.servicesGServ.showModalWithParams(PersonalCatalogoComponent, {
      catalogo: this.config.catalogo,
      entidad: this.config.entidad,
      permisoCrear: this.config.permisoCrear,
      id
    }, '500px')
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
      , `Está a punto de ${ bActivar ? 'activar' : 'inactivar' } al ${ this.config.entidad } "${ item.nombre }"`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.catalogosServ.CSetActive(this.config.catalogo, item.id, bActivar)
            .subscribe({
              next: (resp2: ResponseDB_CRUD) => {
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
      , `Está a punto de ELIMINAR DEFINITIVAMENTE al ${ this.config.entidad } "${ item.nombre }". Esta acción no se puede deshacer.`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.bShowSpinner = true;
          this.catalogosServ.CDelete(this.config.catalogo, item.id)
            .subscribe({
              next: (resp2: ResponseDB_CRUD) => {
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
