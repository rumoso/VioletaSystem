import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';
import { SucursalesService } from 'src/app/protected/services/sucursales.service';
import { TimecardService } from 'src/app/protected/services/timecard.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { NominaHistorialEmpleadoComponent } from '../nomina-historial-empleado/nomina-historial-empleado.component';

const DIAS_SEMANA = [
  { diaSemana: 1, nombre: 'Lunes' },
  { diaSemana: 2, nombre: 'Martes' },
  { diaSemana: 3, nombre: 'Miércoles' },
  { diaSemana: 4, nombre: 'Jueves' },
  { diaSemana: 5, nombre: 'Viernes' },
  { diaSemana: 6, nombre: 'Sábado' },
  { diaSemana: 7, nombre: 'Domingo' }
];

// Datos de empleado de una persona (analisis/018). Se embebe en la
// pestaña "Empleado" del modal de Empleados (antes Usuarios) y solo se
// muestra cuando la persona tiene el puesto de sistema "Empleado".
//
// Tres bloques: datos laborales, conceptos base de nómina y horario.
// Mientras no existe el registro complementario solo se muestra el de
// datos laborales (con fecha de ingreso obligatoria); al guardarlo se
// habilitan los otros dos.

@Component({
  selector: 'app-empleado-datos',
  templateUrl: './empleado-datos.component.html',
  styleUrls: ['./empleado-datos.component.css']
})
export class EmpleadoDatosComponent implements OnInit, OnChanges {

  @Input() idUser: number = 0;
  @Input() nombre: string = '';
  @Input() bSoloLectura: boolean = false;

  // Sucursales asignadas al usuario (pestaña Sucursales del modal): la
  // sucursal base se propone a partir de ellas.
  @Input() sucursalesAsignadas: any[] = [];

  // Avisa al modal que hubo cambios (para recargar la lista al cerrar).
  @Output() cambios = new EventEmitter<void>();

  // idEmpleado del registro complementario; 0 = todavía no tiene.
  id: number = 0;

  bCargando: boolean = false;
  bGuardando: boolean = false;
  fechaBajaDesc: string = '';

  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    fechaIngreso: [this.fn_hoy(), [Validators.required]],
    idSucursal: [null],
    telefono: ['', [Validators.maxLength(20)]],
    contactoEmergencia: ['', [Validators.maxLength(200)]],
    rfc: ['', [Validators.maxLength(13)]],
    curp: ['', [Validators.maxLength(18)]],
    nss: ['', [Validators.maxLength(11)]],
    periodicidadComisiones: ['SEMANA', [Validators.required]],
    horasSemana: [48, [Validators.required, Validators.min(1)]]
  });

  sucursales: any[] = [];

  // Conceptos base. El mismo formulario combo+monto sirve para agregar
  // y para editar: el lapicito de un renglón lo llena y pasa a modo
  // edición (conceptoEditando).
  conceptosBase: any[] = [];
  conceptosDisponibles: any[] = [];
  nuevoConceptoControl: FormControl = new FormControl(null);
  nuevoMontoControl: FormControl = new FormControl('');
  conceptoEditando: any = null;

  // Horario propio opcional (analisis/011); sin días capturados se usa
  // el de la sucursal.
  horarioDias: any[] = DIAS_SEMANA.map(d => ({ ...d, bTrabaja: false, horaEntrada: '09:00', horaSalida: '18:00' }));
  bGuardandoHorario: boolean = false;
  bannerHorario: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  @ViewChild('montoInput') montoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('telefonoInput') telefonoInputRef!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder
    , private authServ: AuthService
    , private servicesGServ: ServicesGService
    , private empleadosServ: EmpleadosService
    , private nominaConceptosServ: NominaConceptosService
    , private sucursalesServ: SucursalesService
    , private timecardServ: TimecardService
    ) { }

  ngOnInit(): void {

    this.sucursalesServ.CCbxGetSucursalesCombo('', this.authServ.getIdUserSession())
      .subscribe({
        next: (resp: ResponseGet) => {
          this.sucursales = resp.status === 0 ? (resp.data || []) : [];
          this.fn_sucursalBaseDefault();
        },
        error: () => { this.sucursales = []; }
      });

  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes['bSoloLectura']) {
      if (this.bSoloLectura) {
        this.myForm.disable();
      } else {
        this.myForm.enable();
      }
    }

    if (changes['idUser'] && this.idUser > 0) {
      this.fn_cargar();
    }

    if (changes['sucursalesAsignadas']) {
      this.fn_sucursalBaseDefault();
    }

  }

  private fn_hoy(): string {
    const hoy = new Date();
    return `${ hoy.getFullYear() }-${ String(hoy.getMonth() + 1).padStart(2, '0') }-${ String(hoy.getDate()).padStart(2, '0') }`;
  }

  // Si el empleado no tiene sucursal base, se propone: la primera sucursal
  // asignada al usuario; si no tiene ninguna asignada y el catálogo solo
  // tiene una, esa. No pisa una sucursal ya capturada; se guarda hasta
  // que se presione "Guardar datos de empleado".
  fn_sucursalBaseDefault() {

    if (this.bCargando || this.bSoloLectura) {
      return;
    }

    const control = this.myForm.get('idSucursal');
    if (!control || control.value) {
      return;
    }

    const asignada = (this.sucursalesAsignadas || [])[0];
    if (asignada && asignada.idSucursal) {
      control.setValue(asignada.idSucursal);
    } else if ((this.sucursales || []).length === 1) {
      control.setValue(this.sucursales[0].idSucursal);
    }

  }

  // Lo llama el modal del empleado al entrar a la pestaña.
  fn_enfocar() {
    setTimeout(() => this.telefonoInputRef?.nativeElement?.focus(), 150);
  }

  // Enter en un campo pasa al siguiente (orden de captura de la pestaña).
  fn_siguiente(evento: Event, siguiente: HTMLElement) {
    evento.preventDefault();
    siguiente.focus();
  }

  private fn_cargar() {

    this.bCargando = true;
    this.empleadosServ.CGetByIdUser(this.idUser)
      .subscribe({
        next: (resp: any) => {
          this.bCargando = false;
          if (resp.status === 0 && resp.data) {
            this.id = resp.data.id;
            this.myForm.patchValue({
              fechaIngreso: resp.data.fechaIngreso,
              idSucursal: resp.data.idSucursal,
              telefono: resp.data.telefono || '',
              contactoEmergencia: resp.data.contactoEmergencia || '',
              rfc: resp.data.rfc || '',
              curp: resp.data.curp || '',
              nss: resp.data.nss || '',
              periodicidadComisiones: resp.data.periodicidadComisiones,
              horasSemana: resp.data.horasSemana
            });
            this.fechaBajaDesc = resp.data.fechaBaja || '';
            this.fn_sucursalBaseDefault();
            this.fn_cargarConceptosBase();
            this.fn_cargarHorarioPropio();
          } else {
            this.id = 0;
            this.fn_sucursalBaseDefault();
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.bCargando = false;
          this.banner = { tipo: 'error', mensaje: 'No se pudieron cargar los datos de empleado.' };
        }
      });
  }

  fn_guardar() {

    this.banner = null;

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    this.bGuardando = true;

    this.empleadosServ.CInsertUpdate({ idUser: this.idUser, ...this.myForm.value })
      .subscribe({
        next: (resp: any) => {
          this.bGuardando = false;

          if (resp.status === 0) {
            this.cambios.emit();
            this.banner = { tipo: 'ok', mensaje: resp.message };

            if (this.id === 0 && resp.data?.id) {
              // Ya existe el registro: se habilitan conceptos y horario.
              this.id = resp.data.id;
              this.fn_cargarConceptosBase();
              this.fn_cargarHorarioPropio();
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

  // Enfoca el monto con el texto seleccionado: se sobreescribe
  // tecleando directo, sin mouse ni borrar.
  fn_focusMonto() {
    setTimeout(() => {
      const input = this.montoInputRef?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

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
    const monto = Math.round( ( Number(this.nuevoMontoControl.value) || 0 ) * 100 ) / 100;

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
          this.cambios.emit();
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
                  this.cambios.emit();
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

  // ---- Horario propio ----

  fn_cargarHorarioPropio() {

    this.timecardServ.CGetHorarioEmpleado(this.id)
      .subscribe({
        next: (resp: ResponseGet) => {

          const filas = resp.status === 0 ? (resp.data || []) : [];
          const porDia: { [key: number]: any } = {};
          filas.forEach((f: any) => { porDia[f.diaSemana] = f; });

          this.horarioDias = DIAS_SEMANA.map(d => {
            const fila = porDia[d.diaSemana];
            return {
              ...d,
              bTrabaja: !!fila,
              horaEntrada: fila ? fila.horaEntrada.substring(0, 5) : '09:00',
              horaSalida: fila ? fila.horaSalida.substring(0, 5) : '18:00'
            };
          });

        }
      });

  }

  fn_guardarHorarioPropio() {

    const diasAGuardar = this.horarioDias
      .filter(d => d.bTrabaja)
      .map(d => ({ diaSemana: d.diaSemana, horaEntrada: d.horaEntrada, horaSalida: d.horaSalida }));

    this.bGuardandoHorario = true;
    this.bannerHorario = null;

    this.timecardServ.CGuardarHorarioEmpleado(this.id, diasAGuardar)
      .subscribe({
        next: (resp: any) => {

          this.bGuardandoHorario = false;

          if (resp.status === 0) {
            this.bannerHorario = { tipo: 'ok', mensaje: 'Horario guardado.' };
          } else {
            this.bannerHorario = { tipo: 'error', mensaje: resp.message };
          }

        },
        error: () => {
          this.bGuardandoHorario = false;
          this.bannerHorario = { tipo: 'error', mensaje: 'Problemas con el servicio.' };
        }
      });

  }

  fn_verHistorialNomina() {
    this.servicesGServ.showModalWithParams(NominaHistorialEmpleadoComponent, {
      idEmpleado: this.id,
      nombreEmpleado: this.nombre
    }, '700px');
  }

}
