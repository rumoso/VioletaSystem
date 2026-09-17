import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { PageTitleService } from 'src/app/protected/services/page-title.service';
import { environment } from 'src/environments/environment';
import { ActionsComponent } from '../mdl/actions/actions.component';
import { ActionsconfComponent } from '../../mdl/actionsconf/actionsconf.component';
import { MenupermisosComponent } from '../../mdl/menupermisos/menupermisos.component';
import { FaceVerificationComponent } from '../../mdl/face-verification/face-verification.component';
import { FaceIdManagerComponent } from '../../mdl/face-id-manager/face-id-manager.component';
import { UserComponent } from '../user/user.component';
import { EmpleadoBajaComponent } from '../../../personal/mdl/empleado-baja/empleado-baja.component';
import { RolesService } from 'src/app/protected/services/roles.service';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { TIPO_ROL } from 'src/app/protected/utils/puestos.const';

// Pantalla Empleados (antes Usuarios) — analisis/018. Una sola pantalla
// para la persona: sus puestos, acceso, Face ID, baja, reactivación y
// eliminación física.

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit, OnDestroy {

  private _appMain: string = environment.appMain;

  constructor(
    private servicesGServ: ServicesGService
    , private usersServ: UsersService
    , private rolesServ: RolesService
    , private empleadosServ: EmpleadosService
    , private authServ: AuthService
    , private pageTitleServ: PageTitleService
    ) { }

    ngOnInit(): void {
      this.authServ.checkSession();
      this.pageTitleServ.set('manage_accounts', this.title, 'Personas del sistema: puestos, acceso y Face ID');

      this.fn_cargarCombosFiltros();
      this.fn_getUsersListWithPage();
    }

    ngOnDestroy(): void {
      this.pageTitleServ.clear();
    }

    edit( id: number ){

      this.servicesGServ.showModalWithParams( UserComponent, { idUser: id }, '760px')
      .afterClosed().subscribe({
        next: ( huboCambios: any ) =>{
          if( huboCambios ){
            this.fn_getUsersListWithPage();
          }
        }
      });

    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getUsersListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getUsersListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

    hasPermissionAction( action: string ): boolean{
      return this.authServ.hasPermissionAction(action);
    }

  title = 'Empleados';
  bShowSpinner: boolean = false;
  catlist: any[] = [];
  
  //-------------------------------
  // VARIABLES PARA LA PAGINACIÓN
  iRows: number = 0;
  pagination: Pagination = {
    search:'',
    length: 10,
    pageSize: 10,
    pageIndex: 0,
    pageSizeOptions: [5, 10, 25, 100]
  }
  //-------------------------------

  // Filtros
  filterFaceID: string = '';     // '' | 'CON' | 'SIN'
  filterIdRol: number = 0;       // 0 = todos los puestos
  filterIdTipoRol: number = 0;   // 0 = todos los tipos
  filterAcceso: string = '';     // '' | 'CON' | 'SIN'
  filterActive: string = 'ACTIVOS'; // '' | 'ACTIVOS' | 'INACTIVOS'

  cbxPuestos: any[] = [];
  cbxTiposRol: any[] = [];

  private fn_cargarCombosFiltros() {

    this.rolesServ.CGetRolesListWithPage({ search: '', length: 0, pageSize: 200, pageIndex: 0, pageSizeOptions: [] })
      .subscribe({
        next: ( resp: ResponseGet ) => {
          this.cbxPuestos = resp.status === 0 ? ( resp.data.rows || [] ) : [];
        }
      });

    // El tipo Empleados no es asignable a un puesto, pero sí sirve como filtro.
    this.rolesServ.CCbxGetTiposRol()
      .subscribe({
        next: ( resp: any ) => {
          const tipos = resp.status === 0 ? ( resp.data || [] ) : [];
          this.cbxTiposRol = [ ...tipos, { idTipoRol: TIPO_ROL.EMPLEADO, nombre: 'Empleados' } ];
        }
      });

  }

  fn_filtrarFaceID() {
    this.pagination.pageIndex = 0;
    this.fn_getUsersListWithPage();
  }

  fn_filtrar() {
    this.pagination.pageIndex = 0;
    this.fn_getUsersListWithPage();
  }

  fn_puestos( item: any ): string[] {
    return item.puestosDesc ? String(item.puestosDesc).split('|') : [];
  }

  fn_getUsersListWithPage() {

    this.bShowSpinner = true;
    this.usersServ.CGetUsersListWithPage( this.pagination, {
      filterFaceID: this.filterFaceID,
      idRol: this.filterIdRol,
      idTipoRol: this.filterIdTipoRol,
      filterAcceso: this.filterAcceso,
      filterActive: this.filterActive
    } )
    .subscribe({
      next: (resp: ResponseGet) => {
        this.catlist = resp.data.rows;
        this.pagination.length = resp.data.count;
        this.bShowSpinner = false;
      },
      error: (ex: HttpErrorResponse) => {
        console.log( ex.error.errors[0].msg )
        this.servicesGServ.showSnakbar( ex.error.errors[0].msg );
        this.bShowSpinner = false;
      }
    })
  }

  // Acceso directo al Face ID desde el listado — mismo comportamiento
  // que el botón inteligente (FaceIdButtonComponent): sin Face ID abre
  // el enrolamiento directo; con Face ID abre el modal de administrar.
  fn_clickFaceId( item: any ) {

    if ( item.bTieneFaceID ) {

      this.servicesGServ.showModalWithParams( FaceIdManagerComponent, {
        tipoPersona: 'USUARIO',
        idPersona: item.idUser,
        nombrePersona: item.name
      }, '420px')
      .afterClosed().subscribe({
        next: () => this.fn_getUsersListWithPage()
      });

    } else {

      this.servicesGServ.showModalWithParams( FaceVerificationComponent, {
        modo: 'ENROLAR',
        tipoPersona: 'USUARIO',
        idPersona: item.idUser,
        nombrePersona: item.name
      }, '480px')
      .afterClosed().subscribe({
        next: ( resp: any ) => {
          if ( resp?.ok ) {
            item.bTieneFaceID = 1;
          }
        }
      });

    }

  }

  // Baja laboral / reactivación: un solo modal que avisa qué pasa (y el
  // metal a cargo) y pide fecha si es empleado.
  fn_baja( item: any, modo: 'BAJA' | 'REACTIVAR' ){

    this.servicesGServ.showModalWithParams( EmpleadoBajaComponent, {
      idUser: item.idUser,
      nombre: item.name,
      modo,
      bEsEmpleado: !!item.idEmpleado
    }, '480px')
    .afterClosed().subscribe({
      next: ( huboCambios: any ) => {
        if( huboCambios ){
          this.fn_getUsersListWithPage();
        }
      }
    });

  }

  // Eliminación física: solo sin ningún historial (el Back lo valida).
  fn_eliminar( item: any ){

    this.servicesGServ.showDialog('¿Eliminar definitivamente?'
                                      , `Se borrará a "${ item.name }" con sus puestos, permisos, Face ID y datos de empleado. Si tiene historial no se podrá; en ese caso dalo de baja`
                                      , 'Esta acción no se puede deshacer'
                                      , 'Eliminar', 'Cancelar')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
          this.bShowSpinner = true;
          this.empleadosServ.CDelete( item.idUser )
          .subscribe({
            next: (resp2: any) => {
              this.servicesGServ.showSnakbar( resp2.message );
              this.bShowSpinner = false;
              if( resp2.status === 0 ){
                this.fn_getUsersListWithPage();
              }
            },
            error: (ex: HttpErrorResponse) => {
              console.log( ex )
              this.servicesGServ.showSnakbar( 'Problemas con el servicio' );
              this.bShowSpinner = false;
            }
          })
        }
      }
    });
  }

  showActionsConf( id: number, name: string ){

    var oData: any = {
      relationType: 'U',
      idRelation: id,
      description: 'Permisos directos de: ' + name
    }

    this.servicesGServ.showModalWithParams( ActionsconfComponent, oData, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        //this.fn_getCustomersListWithPage();
        
      }
    });
  }

  showMenusPermisos( id: number, name: string ){

    var oData: any = {
      relationType: 'U',
      idRelation: id,
      description: 'Menús directos de: ' + name
    }

    this.servicesGServ.showModalWithParams( MenupermisosComponent, oData, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        //this.fn_getCustomersListWithPage();
        
      }
    });
  }
  
  
}