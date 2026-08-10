import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription, debounceTime } from 'rxjs';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { ComisionesTrackService } from 'src/app/protected/services/comisiones-track.service';
import { UsersService } from 'src/app/protected/services/users.service';

// Captura manual de un renglón en la bitácora de comisiones
// (analisis/008): empleado, tipo, concepto, monto (puede ser negativo
// — un ajuste), fecha. Mecánica de foco automático + Enter, igual que
// el resto de la captura rápida del sistema. Requiere `auth_idUser`
// (autorización especial ya obtenida por quien lo abre) — el Back lo
// exige, sin él no registra.

@Component({
  selector: 'app-comision-manual',
  templateUrl: './comision-manual.component.html',
  styleUrls: ['../personal-catalogo/personal-catalogo.component.css']
})
export class ComisionManualComponent implements OnInit, OnDestroy {

  bGuardando: boolean = false;
  huboCambios: boolean = false;
  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    tipo: ['MANUAL', [Validators.required]],
    concepto: ['', [Validators.required, Validators.maxLength(200)]],
    monto: [null, [Validators.required]],
    fecha: [this.fn_hoy(), [Validators.required]]
  });

  empleadoSearchControl: FormControl = new FormControl('');
  empleadosEncontrados: any[] = [];
  empleadoSeleccionado: any = null;
  bBuscandoEmpleados: boolean = false;
  private empleadoSearchSub: Subscription | null = null;

  @ViewChild('conceptoInput') conceptoInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('montoInput') montoInputRef!: ElementRef<HTMLInputElement>;

  auth_idUser: number = 0;

  constructor(
    private dialogRef: MatDialogRef<ComisionManualComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private fb: FormBuilder
    , private comisionesServ: ComisionesTrackService
    , private usersServ: UsersService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {

    this.auth_idUser = this.ODataP?.auth_idUser || 0;

    // Si se abre desde el tracking de un empleado específico, viene
    // preseleccionado.
    if (this.ODataP?.idUser > 0) {
      this.empleadoSeleccionado = {
        id: this.ODataP.idUser,
        nombre: this.ODataP.nombreEmpleado,
        userName: ''
      };
      this.empleadoSearchControl.setValue(this.empleadoSeleccionado, { emitEvent: false });
    }

    this.empleadoSearchSub = this.empleadoSearchControl.valueChanges
      .pipe(debounceTime(600))
      .subscribe((valor: any) => {
        if (typeof valor === 'string') {
          this.empleadoSeleccionado = null;
          this.fn_buscarEmpleados(valor);
        }
      });

  }

  ngOnDestroy(): void {
    this.empleadoSearchSub?.unsubscribe();
  }

  private fn_hoy(): string {
    const hoy = new Date();
    return `${ hoy.getFullYear() }-${ String(hoy.getMonth() + 1).padStart(2, '0') }-${ String(hoy.getDate()).padStart(2, '0') }`;
  }

  private fn_buscarEmpleados( search: string ) {

    this.bBuscandoEmpleados = true;
    this.usersServ.CCbxGetAllUsersCombo(search)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.empleadosEncontrados = resp.status === 0 ? (resp.data || []) : [];
          this.bBuscandoEmpleados = false;
        },
        error: () => {
          this.empleadosEncontrados = [];
          this.bBuscandoEmpleados = false;
        }
      });
  }

  fn_displayEmpleado( empleado: any ): string {
    if (!empleado) {
      return '';
    }
    return empleado.userName ? `${ empleado.userName } — ${ empleado.nombre }` : empleado.nombre;
  }

  fn_empleadoSeleccionado( empleado: any ) {
    this.empleadoSeleccionado = empleado;
    this.fn_focusConcepto();
  }

  fn_focusConcepto() {
    setTimeout(() => {
      const input = this.conceptoInputRef?.nativeElement;
      if (input) { input.focus(); input.select(); }
    }, 0);
  }

  fn_focusMonto() {
    setTimeout(() => {
      const input = this.montoInputRef?.nativeElement;
      if (input) { input.focus(); input.select(); }
    }, 0);
  }

  fn_guardar() {

    this.banner = null;

    if (!this.empleadoSeleccionado) {
      this.banner = { tipo: 'error', mensaje: 'Selecciona el empleado.' };
      return;
    }
    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }
    if (Number(this.myForm.value.monto) === 0) {
      this.banner = { tipo: 'error', mensaje: 'El monto no puede ser cero.' };
      return;
    }

    this.bGuardando = true;

    const data: any = {
      idUser: this.empleadoSeleccionado.id,
      auth_idUser: this.auth_idUser,
      ...this.myForm.value
    };

    this.comisionesServ.CInsertManual(data)
      .subscribe({
        next: (resp: any) => {
          this.bGuardando = false;
          if (resp.status === 0) {
            this.huboCambios = true;
            this.dialogRef.close(true);
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

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

}
