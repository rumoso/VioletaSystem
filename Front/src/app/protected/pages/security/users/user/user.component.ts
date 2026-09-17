import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { EmpleadoDatosComponent } from 'src/app/protected/pages/personal/mdl/empleado-datos/empleado-datos.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Pagination, ResponseDB_CRUD, ResponseGet } from 'src/app/protected/interfaces/global.interfaces';
import { RolesService } from 'src/app/protected/services/roles.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { ID_ROL_EMPLEADO, TIPO_ROL } from 'src/app/protected/utils/puestos.const';
import { ReglaPwd, fn_evaluarPwd, fn_pwdSegura } from 'src/app/protected/utils/pwd-segura.util';

// Validador reactivo con las mismas reglas que valida el Back.
const pwdSeguraValidator = ( control: AbstractControl ): ValidationErrors | null =>
  fn_pwdSegura( control.value ) ? null : { pwdInsegura: true };
import { ActionsComponent } from '../mdl/actions/actions.component';

// Modal de la pantalla Empleados (antes Usuarios) — analisis/018.
// La persona es el usuario. Sus pestañas dependen del TIPO de sus
// puestos: "Vendedor" (% comisión) con un puesto tipo 1, "Técnico"
// (% destajo) con uno tipo 2 y "Empleado" (datos laborales, conceptos
// base y horario) con el puesto de sistema "Empleado". El acceso al
// sistema es opcional.

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit, OnDestroy {

  @ViewChild(EmpleadoDatosComponent) empleadoDatos?: EmpleadoDatosComponent;
  @ViewChild('pwdCambioInput') pwdCambioInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('pwd2CambioInput') pwd2CambioInputRef?: ElementRef<HTMLInputElement>;

  hidePwd: boolean = true;
  hidePwd2: boolean = true;

  bShowSpinner: boolean = false;
  idUser: number = 0;
  huboCambios: boolean = false;

  rolesByUserList: any[] = [];
  sucursalesByUserList: any[] = [];

  // Pestañas condicionales, calculadas con los puestos activos.
  bTipoVendedor: boolean = false;
  bTipoTecnico: boolean = false;
  bEsEmpleado: boolean = false;

  // ¿Ya tiene contraseña guardada? Para darle acceso a alguien que nació
  // sin acceso hay que capturarle una.
  bTienePwd: boolean = false;

  // Disponibilidad del nombre de usuario, validada mientras se escribe.
  //   '' (sin revisar) | 'VERIFICANDO' | 'DISPONIBLE' | 'OCUPADO' | 'ESPACIOS' | 'ERROR'
  estadoUserName: string = '';
  private userNameCambio$ = new Subject<string>();
  private userNameSub: Subscription | null = null;

  public showPwd2: boolean = false;

  constructor(
    private dialogRef: MatDialogRef<UserComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private fb: FormBuilder

    , private servicesGServ: ServicesGService
    , private usersServ: UsersService
    , private rolesServ: RolesService
    , private sucursalesServ: SucursalesService
    , private empleadosServ: EmpleadosService

    , private authServ: AuthService
  ) { }

  userForm: any = {
    idUser: 0,
    nombre: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    userName: '',
    pwd: '',
    authorizationCode: '',
    comision: 0,
    destajo: 0,
    active: true,
    bAcceso: true,

    // Solo en el alta: nace con el puesto "Empleado" salvo que se apague.
    bEsEmpleado: true,
    fechaIngreso: this.fn_hoy()
  };

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
    pwd: ['', [ Validators.required, pwdSeguraValidator ]],
    pwd2: ['', [ Validators.required ]]
  });

  // ── Reglas de contraseña (se palomean mientras se escribe) ──

  get reglasPwdDatos(): ReglaPwd[] {
    return fn_evaluarPwd( this.userForm.pwd );
  }

  get reglasPwdCambio(): ReglaPwd[] {
    const pwd = this.changePwdForm.value.pwd || '';
    const pwd2 = this.changePwdForm.value.pwd2 || '';
    return [
      ...fn_evaluarPwd( pwd ),
      { texto: 'Las dos contraseñas coinciden', ok: pwd.length > 0 && pwd === pwd2 }
    ];
  }

  get bPwdCambioValida(): boolean {
    return this.reglasPwdCambio.every( r => r.ok );
  }

  ActionsByUserList: any[] = [];

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

  // Nombre completo previo de un usuario que aún no tiene el nombre
  // separado (usuarios anteriores al cambio): se muestra como referencia.
  sNombreAnterior: string = '';

  // Cómo se va a ver en combos, tickets y reportes. Mismo armado que
  // insertUser/updateUser: apellidos primero.
  get sNombreCompleto(): string {
    const nombre = ( this.userForm.nombre || '' ).trim();
    const apellidos = [ this.userForm.apellidoPaterno, this.userForm.apellidoMaterno ]
      .map( ( a: string ) => ( a || '' ).trim() )
      .filter( ( a: string ) => a.length > 0 )
      .join(' ');
    if( !nombre ){
      return '';
    }
    return apellidos ? `${ apellidos }, ${ nombre }` : nombre;
  }

  get titulo(): string {
    return this.idUser ? 'Editar empleado' : 'Nuevo empleado';
  }

  get bSoloLectura(): boolean {
    return !this.hasPermissionAction('users_CrearModificar');
  }

  private fn_hoy(): string {
    const hoy = new Date();
    return `${ hoy.getFullYear() }-${ String(hoy.getMonth() + 1).padStart(2, '0') }-${ String(hoy.getDate()).padStart(2, '0') }`;
  }

  // % de comisión / destajo: 0-100, redondeado a 2 decimales.
  private fn_porcentaje( v: any ): number {
    return Math.round( ( Number(v) || 0 ) * 100 ) / 100;
  }

  ngOnInit(): void {
    this.authServ.checkSession();

    this.idUser = this.ODataP?.idUser || 0;

    // Revisa la disponibilidad 400 ms después de la última tecla; si llega
    // otra tecla antes, la petición anterior se descarta (switchMap).
    this.userNameSub = this.userNameCambio$
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        switchMap( ( userName: string ) => {
          const sUserName = ( userName || '' ).trim();
          if( sUserName.length === 0 ){
            return of( null );
          }
          this.estadoUserName = 'VERIFICANDO';
          return this.usersServ.CCheckUserNameDisponible( sUserName, this.idUser );
        })
      )
      .subscribe({
        next: ( resp: any ) => {
          if( resp === null ){
            this.estadoUserName = '';
          }else if( resp.status !== 0 ){
            this.estadoUserName = 'ERROR';
          }else if( resp.data.bDisponible ){
            this.estadoUserName = 'DISPONIBLE';
          }else{
            this.estadoUserName = resp.data.sMotivo === 'ESPACIOS' ? 'ESPACIOS' : 'OCUPADO';
          }
        },
        error: () => { this.estadoUserName = 'ERROR'; }
      });

    if( this.idUser === 0 ){
      return;
    }

    this.bShowSpinner = true;

    this.usersServ.CGetUserByID( this.idUser )
      .subscribe( ( resp: any ) => {

         if(resp.status == 0){

            this.idUser = resp.data.idUser;

            this.userForm.idUser = resp.data.idUser;
            this.addRoleForm.get('idUser')?.setValue( resp.data.idUser );
            this.addSucursalForm.get('idUser')?.setValue( resp.data.idUser );
            this.changePwdForm.get('idUser')?.setValue( resp.data.idUser );

           this.userForm = {
             idUser: resp.data.idUser,
             nombre: resp.data.nombre || '',
             apellidoPaterno: resp.data.apellidoPaterno || '',
             apellidoMaterno: resp.data.apellidoMaterno || '',
             userName: resp.data.userName || '',
             pwd: '',
             authorizationCode: resp.data.authorizationCode,
             comision: this.fn_porcentaje(resp.data.comision),
             destajo: this.fn_porcentaje(resp.data.destajo),
             active: resp.data.active,
             bAcceso: Number(resp.data.bAcceso) === 1,
             bEsEmpleado: false,
             fechaIngreso: ''
           };

           this.bTienePwd = !!resp.data.pwd;
           this.sNombreAnterior = Number( resp.data.bNombrePendiente ) === 1 ? ( resp.data.name || '' ) : '';


           this.fn_getRolesByIdUser();
           this.fn_getSucursalesByIdUser();
         }else{
          this.servicesGServ.showSnakbar(resp.message);
         }
         this.bShowSpinner = false;
      } )

  }

  ngOnDestroy(): void {
    this.userNameSub?.unsubscribe();
  }

  fn_userNameCambio( valor: string ){
    this.estadoUserName = ( valor || '' ).trim().length > 0 ? 'VERIFICANDO' : '';
    this.userNameCambio$.next( valor );
  }

  // ¿Hay que capturar contraseña en la pestaña Datos? En el alta con
  // acceso, o al darle acceso a alguien que no tiene contraseña.
  get bPidePwd(): boolean {
    return this.userForm.bAcceso && ( this.idUser === 0 || !this.bTienePwd );
  }

  fn_validFormPrincipal(){

    if( !this.userForm.nombre || this.userForm.nombre.trim().length === 0 ){
      return false;
    }

    if( this.userForm.bAcceso ){
      if( !this.userForm.userName || this.userForm.userName.trim().length === 0 ){
        return false;
      }
      if( this.estadoUserName === 'OCUPADO' || this.estadoUserName === 'ESPACIOS' || this.estadoUserName === 'VERIFICANDO' ){
        return false;
      }
      if( this.bPidePwd && !fn_pwdSegura( this.userForm.pwd ) ){
        return false;
      }
    }

    if( this.idUser === 0 && this.userForm.bEsEmpleado && !this.userForm.fechaIngreso ){
      return false;
    }

    return true;
  }

  fn_close() {
    this.dialogRef.close( this.huboCambios );
  }

  hasPermissionAction( action: string ): boolean{
    return this.authServ.hasPermissionAction(action);
  }

  fn_saveUser() {

    this.userForm.comision = this.fn_porcentaje( this.userForm.comision );
    this.userForm.destajo = this.fn_porcentaje( this.userForm.destajo );

    if( this.userForm.comision < 0 || this.userForm.comision > 100
      || this.userForm.destajo < 0 || this.userForm.destajo > 100 ){
      this.servicesGServ.showSnakbar( "La comisión y el destajo deben estar entre 0 y 100%" );
      return;
    }

    this.bShowSpinner = true;

    const data: any = {
      ...this.userForm,
      userName: this.userForm.bAcceso ? this.userForm.userName : ( this.userForm.userName || '' ),
      pwd: this.bPidePwd ? this.userForm.pwd : ''
    };

    if(this.idUser > 0){
      this.usersServ.CUpdateUser( data )
        .subscribe({
          next: (resp: ResponseDB_CRUD) => {

            if( resp.status === 0 ){
              this.huboCambios = true;
              if( data.pwd ){
                this.bTienePwd = true;
                this.userForm.pwd = '';
              }
            }
            this.servicesGServ.showAlertIA( resp );
            this.bShowSpinner = false;

          },
          error: (ex) => {

            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
            this.bShowSpinner = false;

          }
        })
    }else{
    this.usersServ.CInsertUser( data )
      .subscribe({
        next: (resp: ResponseDB_CRUD) => {

          if( resp.status === 0 ){

            this.idUser = resp.insertID;
            this.huboCambios = true;

            this.userForm.idUser = resp.insertID;
            this.userForm.pwd = '';
            this.bTienePwd = !!data.pwd;
            this.addRoleForm.get('idUser')?.setValue( resp.insertID )
            this.addSucursalForm.get('idUser')?.setValue( resp.insertID )
            this.changePwdForm.get('idUser')?.setValue( resp.insertID )

            // El SP ya le asignó el puesto "Empleado". Con el switch
            // encendido se crean sus datos de empleado; apagado, se le
            // quita el puesto.
            this.fn_completarAlta( data );

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

  private fn_completarAlta( data: any ){

    const idUser = this.idUser;

    const peticion = data.bEsEmpleado
      ? this.empleadosServ.CInsertUpdate({
          idUser,
          fechaIngreso: data.fechaIngreso,
          periodicidadComisiones: 'SEMANA',
          horasSemana: 48
        })
      : this.rolesServ.CDeleteRolByIdUser( idUser, ID_ROL_EMPLEADO );

    peticion.subscribe({
      next: ( resp: any ) => {
        if( data.bEsEmpleado && resp.status !== 0 ){
          this.servicesGServ.showSnakbar( resp.message );
        }
        this.fn_getRolesByIdUser();
        this.fn_getSucursalesByIdUser();
      },
      error: () => {
        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
        this.fn_getRolesByIdUser();
      }
    });

  }

  // Recalcula qué pestañas condicionales se ven. Solo cuentan los puestos
  // activos (el SP ya no regresa los inactivos).
  private fn_calcularPestanas(){
    const tipos = this.rolesByUserList.map( ( r: any ) => Number(r.idTipoRol) );
    this.bTipoVendedor = tipos.includes( TIPO_ROL.VENDEDOR );
    this.bTipoTecnico = tipos.includes( TIPO_ROL.TECNICO );
    this.bEsEmpleado = this.rolesByUserList.some( ( r: any ) => Number(r.idRol) === ID_ROL_EMPLEADO );
  }

  fn_getRolesByIdUser(){

    this.rolesServ.CGetRolesByIdUser( this.idUser )
    .subscribe({
      next: ( resp: ResponseGet ) => {

        if(resp.status === 0){
          this.rolesByUserList = resp.data || [];
        }else{
          this.rolesByUserList = [];
        }

        this.fn_calcularPestanas();

      },
      error: ( ex ) => {
        this.servicesGServ.showSnakbar( "Problemas con el servicio" );
      }

    })

  }



  fn_insertRolByIdUser() {

    this.servicesGServ.showDialog('¿Estás seguro?'
                                            , 'Está a punto de asignar este puesto'
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
                      this.huboCambios = true;

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

      // Quitar "Empleado" lo saca de asistencia y nómina, pero conserva sus
      // datos de empleado y su historial.
      const sMensaje = idRol === ID_ROL_EMPLEADO
        ? 'Está a punto de quitar el puesto "Empleado": sale de asistencia, del checador y de las nóminas nuevas. Sus datos de empleado y su historial se conservan'
        : 'Está a punto de quitar este puesto';

      this.servicesGServ.showDialog('¿Estás seguro?'
                                        , sMensaje
                                        , '¿Desea continuar?'
                                        , 'Si', 'No')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{
          if(resp){

            this.bShowSpinner = true;
            this.rolesServ.CDeleteRolByIdUser( this.idUser, idRol)
            .subscribe({
              next: (resp: ResponseDB_CRUD) => {

                this.huboCambios = true;
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
              this.sucursalesByUserList = resp.data || [];
            }else{
              this.sucursalesByUserList = [];
            }

          },
          error: ( ex ) => {
            this.servicesGServ.showSnakbar( "Problemas con el servicio" );
          }

        })

      }

    // Al entrar a una pestaña, el foco va a su primer campo de captura.
    fn_tabCambio( evento: MatTabChangeEvent ){
      if( evento.tab.textLabel === 'Empleado' ){
        this.empleadoDatos?.fn_enfocar();
      }else if( evento.tab.textLabel === 'Contraseña' ){
        setTimeout( () => this.pwdCambioInputRef?.nativeElement?.focus(), 150 );
      }
    }

    // Enter en "Contraseña" pasa a "Verificar contraseña".
    fn_pwdCambioEnter( evento: Event ){
      evento.preventDefault();
      this.pwd2CambioInputRef?.nativeElement?.focus();
    }

    // Enter en "Verificar contraseña" guarda, solo si cumple todas las reglas.
    fn_pwd2CambioEnter( evento: Event ){
      evento.preventDefault();
      if( this.bPwdCambioValida ){
        this.fn_changePassword();
      }
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

    showActionsCat( id: number ){

      this.servicesGServ.showModalWithParams( ActionsComponent, null, '1500px')
      .afterClosed().subscribe({
        next: ( resp: any ) =>{

          //this.fn_getCustomersListWithPage();

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
             this.cbxRoles = resp.data || [];
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
             this.cbxSucursales = resp.data || [];
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

    this.addSucursalForm.get('idSucursal')?.setValue( ODataCbx.idSucursal )
    this.addSucursalForm.get('sucursalDesc')?.setValue( ODataCbx.name )

  }

  cbxSucursales_Clear(){
    this.addSucursalForm.get('idSucursal')?.setValue( 0 );
    this.addSucursalForm.get('sucursalDesc')?.setValue( '' );
  }
  //--------------------------------------------------------------------------



}
