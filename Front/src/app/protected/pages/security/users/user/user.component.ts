import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { RolesService } from 'src/app/protected/services/roles.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { environment } from 'src/environments/environment';



@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  
  private _appMain: string = environment.appMain;

  hidePwd: boolean = true;
  hidePwd2: boolean = true;

  title: string = 'Usuario';
  bShowSpinner: boolean = false;
  idUser: number = 0;

  rolesByUserList: any[] = [];
  sucursalesByUserList: any[] = [];

  public showPwd2: boolean = false;

  constructor(
    private fb: FormBuilder
    , private router: Router
    , private activatedRoute: ActivatedRoute

    , private servicesGServ: ServicesGService
    , private _adapter: DateAdapter<any>
    , @Inject(MAT_DATE_LOCALE) private _locale: string
    , private usersServ: UsersService
    , private rolesServ: RolesService
    , private sucursalesServ: SucursalesService

    , private authService: AuthService
  ) { }

  userForm: FormGroup = this.fb.group({
    idUser: 0,
    name: ['',[ Validators.required ]],
    userName: ['',[ Validators.required ]],
    pwd: ['', Validators.compose([
      Validators.minLength(6),
      Validators.pattern(/(?=.*[0-9])/),
      Validators.pattern(/(?=.*[A-Z])/),
      Validators.pattern(/(?=.*[a-z])/),
      Validators.pattern(/(?=.*[-_.,$@^!%*?&])/)
    ])],
    active: [true]
  });

  addRoleForm: FormGroup = this.fb.group({
    idUser: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
    idRol: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
    roleDesc: ['']
  });

  addSucursalForm: FormGroup = this.fb.group({
    idUser: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
    idSucursal: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
    sucursalDesc: ['']
  });

  changePwdForm: FormGroup = this.fb.group({
    idUser: [0, [ Validators.required, Validators.pattern(/^[1-9]\d*$/) ]],
    pwd: ['', Validators.compose([
      Validators.required,
      Validators.minLength(6),
      Validators.pattern(/(?=.*[0-9])/),
      Validators.pattern(/(?=.*[A-Z])/),
      Validators.pattern(/(?=.*[a-z])/),
      Validators.pattern(/(?=.*[-_.,$@^!%*?&])/)
    ])],
    pwd2: ['', Validators.compose([
      Validators.required,
      Validators.minLength(6),
      Validators.pattern(/(?=.*[0-9])/),
      Validators.pattern(/(?=.*[A-Z])/),
      Validators.pattern(/(?=.*[a-z])/),
      Validators.pattern(/(?=.*[-_.,$@^!%*?&])/)
    ])]
  });

  ngOnInit(): void {
    this.authService.checkSession();

    this._locale = 'mx';
    this._adapter.setLocale(this._locale);

    if( !this.router.url.includes('editUser') ){
      return;
    }

    this.bShowSpinner = true;

    this.activatedRoute.params
      .pipe(
        switchMap( ({ id }) => this.usersServ.CGetUserByID( id ) )
      )
      .subscribe( ( resp: any ) => {
        console.log(resp)
         if(resp.status == 0){
            
            this.idUser = resp.data.idUser;

            this.userForm.get('idUser')?.setValue( resp.data.idUser )
            this.addRoleForm.get('idUser')?.setValue( resp.data.idUser )
            this.addSucursalForm.get('idUser')?.setValue( resp.data.idUser )
            this.changePwdForm.get('idUser')?.setValue( resp.data.idUser )

           this.userForm.setValue({
             idUser: resp.data.idUser,
             name: resp.data.name,
             userName: resp.data.userName,
             pwd: '',
             active: resp.data.active
           });


           //this.fn_getHitorialClinicoByIdPaciente(this.id);
           this.fn_getRolesByIdUser();
           this.fn_getSucursalesByIdUser();
         }else{
          this.servicesGServ.showSnakbar(resp.message);
         }
         this.bShowSpinner = false;
      } )

  }

  changeRoute( route: string ): void {
    this.servicesGServ.changeRoute( `/${ this._appMain }/${ route }` );
  }

  fn_saveUser() {

    this.bShowSpinner = true;

    if(this.idUser > 0){
      this.usersServ.CUpdateUser( this.userForm.value )
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
    this.usersServ.CInsertUser( this.userForm.value )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          if( resp.status === 0 ){
            
            this.idUser = resp.insertID;

            this.userForm.get('idUser')?.setValue( resp.insertID )
            this.addRoleForm.get('idUser')?.setValue( resp.insertID )
            this.addSucursalForm.get('idUser')?.setValue( resp.insertID )
            this.changePwdForm.get('idUser')?.setValue( resp.insertID )

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

  fn_getRolesByIdUser(){

    this.rolesServ.CGetRolesByIdUser( this.idUser )
    .subscribe({
      next: ( resp: ResponseGet ) => {
        
        if(resp.status === 0){
          this.rolesByUserList = resp.data;
        }else{
          this.rolesByUserList = [];
        }

      },
      error: ( ex ) => {
        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
      }

    })

  }



  fn_insertRolByIdUser() {

    this.servicesGServ.showDialog('¿Estás seguro?'
                                            , 'Está a punto de asignar este rol'
                                            , '¿Desea continuar?'
                                            , 'Si', 'No')
          .afterClosed().subscribe({
            next: ( resp: any ) =>{
              if(resp){
                
                this.bShowSpinner = true;

                this.rolesServ.CInsertRolByIdUser( this.addRoleForm.value )
                  .subscribe({
                    next: (resp: ResponseDB_CRUD) => {
                      
                      this.servicesGServ.showAlertIA( resp );
                      this.bShowSpinner = false;

                      this.addRoleForm.get('idRol')?.setValue( 0 );
                      this.addRoleForm.get('roleDesc')?.setValue( '' );

                      this.fn_getRolesByIdUser();

                    },
                    error: (ex) => {
                      this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                      this.bShowSpinner = false;
                    }
                  })

              }
            }
          });

    }

    fn_deleteRolByIdUser( idRol: number ){
      
      this.servicesGServ.showDialog('¿Estás seguro?'
                                        , 'Está a punto de borrar la asignación del rol'
                                        , '¿Desea continuar?'
                                        , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{
          if(resp){

            this.bShowSpinner = true;
            this.rolesServ.CDeleteRolByIdUser( this.idUser, idRol)
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                this.fn_getRolesByIdUser();

                this.servicesGServ.showAlertIA( resp );
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

    fn_insertSucursalByIdUser() {

      this.servicesGServ.showDialog('¿Estás seguro?'
                                              , 'Está a punto de asignar esta sucursal'
                                              , '¿Desea continuar?'
                                              , 'Si', 'No')
            .afterClosed().subscribe({
              next: ( resp: any ) =>{
                if(resp){
                  
                  this.bShowSpinner = true;
  
                  this.sucursalesServ.CInsertSucursalByIdUser( this.addSucursalForm.value )
                    .subscribe({
                      next: (resp: ResponseDB_CRUD) => {
                        
                        this.bShowSpinner = false;
  
                        this.addSucursalForm.get('idSucursal')?.setValue( 0 );
                        this.addSucursalForm.get('sucursalDesc')?.setValue( '' );
  
                        this.fn_getSucursalesByIdUser();

                        this.servicesGServ.showAlertIA( resp );
  
                      },
                      error: (ex) => {
                        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
                        this.bShowSpinner = false;
                      }
                    })
  
                }
              }
            });
  
      }
  
      fn_deleteSucursalByIdUser( idSucursal: number ){
        
        this.servicesGServ.showDialog('¿Estás seguro?'
                                          , 'Está a punto de borrar la asignación de la sucursal'
                                          , '¿Desea continuar?'
                                          , 'Si', 'No')
        .afterClosed().subscribe({
          next: ( resp: any ) =>{
            if(resp){
  
              this.bShowSpinner = true;
              this.sucursalesServ.CDeleteSucursalByIdUser( this.idUser, idSucursal)
              .subscribe({
                next: (resp: ResponseDB_CRUD) => {
  
                  if( resp.status === 0 ){
                    this.fn_getSucursalesByIdUser();
                  }
  
                  this.servicesGServ.showAlertIA( resp );
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

      fn_getSucursalesByIdUser(){

        this.sucursalesServ.CGetSucursalesByIdUser( this.idUser )
        .subscribe({
          next: ( resp: ResponseGet ) => {
            
            if(resp.status === 0){
              this.sucursalesByUserList = resp.data;
            }else{
              this.sucursalesByUserList = [];
            }
    
          },
          error: ( ex ) => {
            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
          }
    
        })
    
      }

    fn_changePassword(){
      
      this.servicesGServ.showDialog('¿Estás seguro?'
                                        , 'Está a punto de cambiar la contraseña'
                                        , '¿Desea continuar?'
                                        , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp ) =>{
          if(resp){

            this.bShowSpinner = true;
            this.usersServ.CChangePassword( this.changePwdForm.value )
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                if( resp.status === 0 ){
                  this.changePwdForm.get('pwd')?.setValue( '' );
                  this.changePwdForm.get('pwd2')?.setValue( '' );
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

  
  

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxRoles: any[] = [];

  cbxSearchRol() {
      this.rolesServ.CGetRolesForAddUser( this.addRoleForm.value.roleDesc, this.idUser )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxRoles = resp.data
           }
           else{
            this.cbxRoles = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSelectedOptionRol( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    this.addRoleForm.get('idRol')?.setValue( ODataCbx.idRol )
    this.addRoleForm.get('roleDesc')?.setValue( ODataCbx.name )

  }

  cbxRolClear(){
    this.addRoleForm.get('idRol')?.setValue( 0 );
    this.addRoleForm.get('roleDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------

  //--------------------------------------------------------------------------
  // MÉTODOS PARA COMBO DE ÁREAS

  cbxSucursales: any[] = [];

  cbxSucursales_Search() {
      this.sucursalesServ.CGetSucursalesForAddUser( this.addSucursalForm.value.sucursalDesc, this.idUser )
       .subscribe( {
         next: (resp: ResponseGet) =>{
           if(resp.status === 0){
             this.cbxSucursales = resp.data
           }
           else{
            this.cbxSucursales = [];
           }
         },
         error: (ex) => {
           this.servicesGServ.showSnakbar( "Problemas con el servicio" );
           this.bShowSpinner = false;
         }
       });
  }

  cbxSucursales_SelectedOption( event: MatAutocompleteSelectedEvent ) {

    if(!event.option.value){
      return;
    }

    const ODataCbx: any = event.option.value;

    console.log(ODataCbx)

    this.addSucursalForm.get('idSucursal')?.setValue( ODataCbx.idSucursal )
    this.addSucursalForm.get('sucursalDesc')?.setValue( ODataCbx.name )

  }

  cbxSucursales_Clear(){
    this.addSucursalForm.get('idSucursal')?.setValue( 0 );
    this.addSucursalForm.get('sucursalDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------
  
}
