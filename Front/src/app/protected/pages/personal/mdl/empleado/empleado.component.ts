import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

// Modal de alta/modificación de empleado (analisis/006). Dos pestañas:
// Datos laborales y Conceptos base de nómina. NO se cierra al guardar
// (banner interno); tras el alta pasa a modo edición y habilita la
// pestaña de conceptos.

@Component({
  selector: 'app-empleado',
  templateUrl: './empleado.component.html',
  styleUrls: ['./empleado.component.css']
})
export class EmpleadoComponent implements OnInit, OnDestroy {

  id: number = 0;

  bSoloLectura: boolean = false;
  bShowSpinner: boolean = false;
  bGuardando: boolean = false;
  huboCambios: boolean = false;
  bActivo: boolean = true;
  fechaBajaDesc: string = '';

  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    fechaIngreso: ['', [Validators.required]],
    puesto: ['', [Validators.maxLength(100)]],
    idSucursal: [null],
    telefono: ['', [Validators.maxLength(20)]],
    contactoEmergencia: ['', [Validators.maxLength(200)]],
    rfc: ['', [Validators.maxLength(13)]],
    curp: ['', [Validators.maxLength(18)]],
    nss: ['', [Validators.maxLength(11)]],
    periodicidadComisiones: ['SEMANA', [Validators.required]],
    horasSemana: [48, [Validators.required, Validators.min(1)]]
  });

  usuarioSearchControl: FormControl = new FormControl('');
  usuariosEncontrados: any[] = [];
  usuarioSeleccionado: any = null;
  bBuscandoUsuarios: boolean = false;
  private usuarioSearchSub: Subscription | null = null;

  sucursales: any[] = [];

  // Conceptos base. El mismo formulario combo+monto sirve para agregar
  // y para editar: el lapicito de un renglón lo llena y pasa a modo
  // edición (conceptoEditando).
  conceptosBase: any[] = [];
  conceptosDisponibles: any[] = [];
  nuevoConceptoControl: FormControl = new FormControl(null);
  nuevoMontoControl: FormControl = new FormControl('');
  conceptoEditando: any = null;

  @ViewChild('montoInput') montoInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private dialogRef: MatDialogRef<EmpleadoComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private fb: FormBuilder
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private empleadosServ: EmpleadosService
    , private nominaConceptosServ: NominaConceptosService
    , private sucursalesServ: SucursalesService
    , private usersServ: UsersService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {

    this.id = this.ODataP.id || 0;

    this.bSoloLectura = !this.authServ.hasPermissionAction('empleados_CrearModificar');

    if (this.bSoloLectura) {
      this.myForm.disable();
      this.usuarioSearchControl.disable();
    }

    this.usuarioSearchSub = this.usuarioSearchControl.valueChanges
      .pipe(debounceTime(600))
      .subscribe((valor: any) => {
        if (typeof valor === 'string') {
          this.usuarioSeleccionado = null;
          this.fn_buscarUsuarios(valor);
        }
      });

    this.sucursalesServ.CCbxGetSucursalesCombo('', this.authServ.getIdUserSession())
      .subscribe({
        next: (resp: ResponseGet) => {
          this.sucursales = resp.status === 0 ? (resp.data || []) : [];
        },
        error: () => { this.sucursales = []; }
      });

    if (this.id > 0) {
      this.fn_cargar();
      this.fn_cargarConceptosBase();
    }

  }

  ngOnDestroy(): void {
    this.usuarioSearchSub?.unsubscribe();
  }

  get titulo(): string {
    if (this.bSoloLectura) {
      return 'Ver empleado';
    }
    return this.id > 0 ? 'Modificar empleado' : 'Nuevo empleado';
  }

  private fn_cargar() {

    this.bShowSpinner = true;
    this.empleadosServ.CGetById(this.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0 && resp.data) {
            this.myForm.patchValue({
              nombre: resp.data.nombre,
              fechaIngreso: resp.data.fechaIngreso,
              puesto: resp.data.puesto || '',
              idSucursal: resp.data.idSucursal,
              telefono: resp.data.telefono || '',
              contactoEmergencia: resp.data.contactoEmergencia || '',
              rfc: resp.data.rfc || '',
              curp: resp.data.curp || '',
              nss: resp.data.nss || '',
              periodicidadComisiones: resp.data.periodicidadComisiones,
              horasSemana: resp.data.horasSemana
            });
            this.bActivo = !!resp.data.active;
            this.fechaBajaDesc = resp.data.fechaBaja || '';
            this.usuarioSeleccionado = {
              id: resp.data.idUser,
              nombre: resp.data.userNombre,
              userName: resp.data.userName
            };
            this.usuarioSearchControl.setValue(this.usuarioSeleccionado, { emitEvent: false });
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.bShowSpinner = false;
          this.banner = { tipo: 'error', mensaje: 'No se pudo cargar el registro.' };
        }
      });
  }

  private fn_buscarUsuarios( search: string ) {

    this.bBuscandoUsuarios = true;
    this.usersServ.CCbxGetAllUsersCombo(search)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.usuariosEncontrados = resp.status === 0 ? (resp.data || []) : [];
          this.bBuscandoUsuarios = false;
        },
        error: () => {
          this.usuariosEncontrados = [];
          this.bBuscandoUsuarios = false;
        }
      });
  }

  fn_displayUsuario( usuario: any ): string {
    return usuario ? `${ usuario.userName } — ${ usuario.nombre }` : '';
  }

  fn_usuarioSeleccionado( usuario: any ) {
    this.usuarioSeleccionado = usuario;
  }

  fn_guardar() {

    this.banner = null;

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    if (!this.usuarioSeleccionado) {
      this.banner = { tipo: 'error', mensaje: 'Selecciona el usuario del sistema ligado (obligatorio).' };
      return;
    }

    this.bGuardando = true;

    const data: any = {
      id: this.id,
      idUser: this.usuarioSeleccionado.id,
      ...this.myForm.value
    };

    this.empleadosServ.CInsertUpdate(data)
      .subscribe({
        next: (resp: any) => {
          this.bGuardando = false;

          if (resp.status === 0) {
            this.huboCambios = true;
            this.banner = { tipo: 'ok', mensaje: resp.message };

            if (this.id === 0 && resp.data?.id) {
              // Pasa a modo edición: habilita la pestaña de conceptos
              // base para capturar de inmediato.
              this.id = resp.data.id;
              this.fn_cargarConceptosBase();
            }
          } else {
            this.banner = { tipo: 'error', mensaje: resp.message };
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.bGuardando = false;
          this.banner = { tipo: 'error', mensaje: 'Problemas con el servicio.' };
        }
      });
  }

  // ---- Conceptos base ----

  fn_cargarConceptosBase() {

    this.empleadosServ.CGetConceptosBase(this.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.conceptosBase = resp.status === 0 ? (resp.data || []) : [];
        },
        error: () => { this.conceptosBase = []; }
      });

    this.nominaConceptosServ.CCbxGetConceptosActivos(this.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.conceptosDisponibles = resp.status === 0 ? (resp.data || []) : [];
        },
        error: () => { this.conceptosDisponibles = []; }
      });
  }

  // El combo excluye los conceptos que el empleado ya tiene; al editar
  // se agrega el del renglón editado para poder mostrarlo/cambiarlo.
  get conceptosParaCombo(): any[] {
    if (!this.conceptoEditando) {
      return this.conceptosDisponibles;
    }
    const actual = {
      id: this.conceptoEditando.idNominaConcepto,
      name: this.conceptoEditando.conceptoDesc,
      tipo: this.conceptoEditando.tipo
    };
    return [actual, ...this.conceptosDisponibles];
  }

  fn_focusMonto() {
    setTimeout(() => this.montoInputRef?.nativeElement?.focus(), 0);
  }

  // Lapicito de un renglón: llena el combo y el monto con sus valores,
  // pasa el formulario a modo edición y manda el foco al monto.
  fn_editarConcepto( item: any ) {

    this.banner = null;
    this.conceptoEditando = item;
    this.nuevoConceptoControl.setValue(this.conceptosParaCombo.find(c => c.id === item.idNominaConcepto) || null);
    this.nuevoMontoControl.setValue(item.monto);
    this.fn_focusMonto();
  }

  fn_cancelarEdicion() {
    this.conceptoEditando = null;
    this.nuevoConceptoControl.setValue(null);
    this.nuevoMontoControl.setValue('');
  }

  fn_guardarConcepto() {

    this.banner = null;

    const concepto = this.nuevoConceptoControl.value;
    const monto = Number(this.nuevoMontoControl.value);

    if (!concepto) {
      this.banner = { tipo: 'error', mensaje: 'Selecciona el concepto.' };
      return;
    }
    if (!(monto > 0)) {
      this.banner = { tipo: 'error', mensaje: 'Captura un monto mayor a cero.' };
      return;
    }

    this.empleadosServ.CInsertUpdateConceptoBase({
      id: this.conceptoEditando ? this.conceptoEditando.id : 0,
      idEmpleado: this.id,
      idNominaConcepto: concepto.id,
      monto
    }).subscribe({
      next: (resp: any) => {
        if (resp.status === 0) {
          this.huboCambios = true;
          this.fn_cancelarEdicion();
          this.fn_cargarConceptosBase();
        } else {
          this.banner = { tipo: 'error', mensaje: resp.message };
        }
      },
      error: () => {
        this.banner = { tipo: 'error', mensaje: 'Problemas con el servicio.' };
      }
    });
  }

  fn_quitarConcepto( item: any ) {

    this.servicesGServ.showDialog('¿Estás seguro?'
      , `Está a punto de quitar "${ item.conceptoDesc }" del listado base`
      , '¿Desea continuar?'
      , 'Si', 'No')
    .afterClosed().subscribe({
      next: (resp) => {
        if (resp) {
          this.empleadosServ.CDeleteConceptoBase(item.id)
            .subscribe({
              next: (resp2: any) => {
                if (resp2.status === 0) {
                  this.huboCambios = true;
                  if (this.conceptoEditando?.id === item.id) {
                    this.fn_cancelarEdicion();
                  }
                  this.fn_cargarConceptosBase();
                }
                this.servicesGServ.showSnakbar(resp2.message);
              },
              error: () => {
                this.servicesGServ.showSnakbar('Problemas con el servicio');
              }
            });
        }
      }
    });
  }

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

}
