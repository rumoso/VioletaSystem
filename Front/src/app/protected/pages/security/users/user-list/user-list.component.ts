import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Pagination, ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  
  private _appMain: string = environment.appMain;

  constructor(
    private servicesGServ: ServicesGService
    , private usersServ: UsersService
    ) { }

    ngOnInit(): void {
      //localStorage.setItem('pidPaciente', '');
      this.fn_getUsersListWithPage();
    }

    edit( id: number ){
      this.servicesGServ.changeRouteWithParameter(`/${ this._appMain }/editUser`, id)
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

  title = 'Lista de usuarios';
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

  fn_getUsersListWithPage() {

    this.bShowSpinner = true;
    this.usersServ.CGetUsersListWithPage( this.pagination )
    .subscribe({
      next: (resp: ResponseGet) => {
        console.log(resp)
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

  fn_deleteUser( idUser: number ){

    this.servicesGServ.showDialog('¿Estás seguro?'
                                      , 'Está a punto de borrar al usuario'
                                      , '¿Desea continuar?'
                                      , 'Si', 'No')
    .afterClosed().subscribe({
      next: ( resp ) =>{
        if(resp){
          this.bShowSpinner = true;
          this.usersServ.CDeleteUser( idUser )
          .subscribe({
            next: (resp: ResponseDB_CRUD) => {
              if( resp.status === 0 ){
                this.fn_getUsersListWithPage();
              }
              this.servicesGServ.showSnakbar(resp.message);
              this.bShowSpinner = false;
            },
            error: (ex: HttpErrorResponse) => {
              console.log( ex )
              this.servicesGServ.showSnakbar( ex.error.data );
              this.bShowSpinner = false;
            }
      
          })
        }
      }
    });
  }
  
}
