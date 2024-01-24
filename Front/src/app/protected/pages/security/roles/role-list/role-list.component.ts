import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { RolesService } from 'src/app/protected/services/roles.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';
import { ActionsconfComponent } from '../../mdl/actionsconf/actionsconf.component';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css']
})
export class RoleListComponent {
  
  private _appMain: string = environment.appMain;

  title = 'Lista de roles';
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

  constructor(
    private servicesGServ: ServicesGService
    , private rolesServ: RolesService
    , private authService: AuthService
    ) { }

    ngOnInit(): void {
      this.authService.checkSession();
      
      this.fn_getRolesListWithPage();
    }

    edit( id: number ){
      this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editRol`, id)
    }

    ////************************************************ */
    // MÉTODOS DE PAGINACIÓN
    changePagination(pag: Pagination) {
      this.pagination = pag;
      this.fn_getRolesListWithPage();
    }

    onChangeEvent(event: any){
      this.pagination.search = event.target.value;
      this.fn_getRolesListWithPage();
    }
    ////************************************************ */

    changeRoute( route: string ): void {
      this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
    }

  

  fn_getRolesListWithPage() {

    this.bShowSpinner = true;
    this.rolesServ.CGetRolesListWithPage( this.pagination )
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

  // fn_deleteUser( idUser: number ){

  //   this.servicesGServ.showDialog('¿Estás seguro?'
  //                                     , 'Está a punto de deshabilitar el rol'
  //                                     , '¿Desea continuar?'
  //                                     , 'Si', 'No')
  //   .afterClosed().subscribe({
  //     next: ( resp ) =>{
  //       if(resp){
  //         this.bShowSpinner = true;
  //         this.usersServ.CDisabledUser( idUser )
  //         .subscribe({
  //           next: (resp: ResponseDB_CRUD) => {
  //             this.fn_getUsersListWithPage();
  //             this.servicesGServ.showAlertIA( resp );
  //             this.bShowSpinner = false;
  //           },
  //           error: (ex: HttpErrorResponse) => {
  //             console.log( ex )
  //             this.servicesGServ.showSnakbar( ex.error.data );
  //             this.bShowSpinner = false;
  //           }
      
  //         })
  //       }
  //     }
  //   });
  // }

  showActionsConf( id: number, name: string ){

    var oData: any = {
      relationType: 'R',
      idRelation: id,
      description: 'Permisos del Rol: ' + name
    }

    this.servicesGServ.showModalWithParams( ActionsconfComponent, oData, '1500px')
    .afterClosed().subscribe({
      next: ( resp: any ) =>{

        //this.fn_getCustomersListWithPage();
        
      }
    });
  }

}
