import { Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseDB_CRUD } from 'src/app/protected/interfaces/global.interfaces';
import { ActionsService } from 'src/app/protected/services/actions.service';
import { RolesService } from 'src/app/protected/services/roles.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-role',
  templateUrl: './role.component.html',
  styleUrls: ['./role.component.css']
})
export class RoleComponent {
  
  private _appMain: string = environment.appMain;

  title: string = 'Rol';
  bShowSpinner: boolean = false;
  idRol: number = 0;

  rolForm: any = {
    idRol: 0,
    name: '',
    description: '',
    active: true
  };

  constructor(
    private router: Router
    , private activatedRoute: ActivatedRoute

    , private servicesGServ: ServicesGService
    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string
    , private rolesServ: RolesService
    , private actionsServ: ActionsService

    , private authService: AuthService
  ) { }


  ngOnInit(): void {
    this.authService.checkSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( !this.router.url.includes('editRol') ){
      return;
    }

    this.bShowSpinner = true;

    this.activatedRoute.params
      .pipe(
        switchMap( ({ id }) => this.rolesServ.CGetRolByID( id ) )
      )
      .subscribe( ( resp: any ) => {
        
         if(resp.status == 0){
            
            this.idRol = resp.data.idRol;

            this.rolForm = {
              idRol: resp.data.idRol,
              name: resp.data.name,
              description: resp.data.description,
              active: resp.data.active
            };

           //this.fn_getActionListWithPage();
         }else{
          this.servicesGServ.showSnakbar(resp.message);
         }
         this.bShowSpinner = false;
      } )

  }

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  fn_saveRol() {

    this.bShowSpinner = true;

    if(this.idRol > 0){
      this.rolesServ.CUpdateRol( this.rolForm )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {
            
            this.servicesGServ.showAlertIA( resp );
            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })
    }else{
    this.rolesServ.CInsertRol( this.rolForm )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          if( resp.status === 0 ){
            
            this.idRol = resp.insertID;

            this.rolForm.idRol = resp.insertID;

          }

          this.servicesGServ.showAlertIA( resp );

          this.bShowSpinner = false;

        },
        error: (ex) => {

          this.servicesGServ.showSnakbar( "Problemas con el servicio" );
          this.bShowSpinner = false;

        }
      })
    }
  }

}
