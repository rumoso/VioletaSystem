import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subscription, debounceTime } from 'rxjs';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { CatalogosPersonalService } from 'src/app/protected/services/catalogos-personal.service';
import { UsersService } from 'src/app/protected/services/users.service';

// Modal de alta/modificación de técnico o vendedor (analisis/005).
// NO se cierra al guardar: muestra el resultado en un banner interno y
// tras un alta exitosa pasa a modo edición del registro recién creado.
// Al cerrar regresa si hubo cambios para que la lista recargue solo en
// ese caso.

@Component({
  selector: 'app-personal-catalogo',
  templateUrl: './personal-catalogo.component.html',
  styleUrls: ['./personal-catalogo.component.css']
})
export class PersonalCatalogoComponent implements OnInit, OnDestroy {

  catalogo: string = 'vendedores';
  entidad: string = 'vendedor';
  id: number = 0;

  bSoloLectura: boolean = false;
  bShowSpinner: boolean = false;
  bGuardando: boolean = false;
  huboCambios: boolean = false;

  // Banner interno de resultado (el modal no se cierra al guardar)
  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    active: [true]
  });

  // Autocompletado del usuario vinculado (obligatorio)
  usuarioSearchControl: FormControl = new FormControl('');
  usuariosEncontrados: any[] = [];
  usuarioSeleccionado: any = null;
  bBuscandoUsuarios: boolean = false;
  private usuarioSearchSub: Subscription | null = null;

  @ViewChild('usuarioInput') usuarioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('guardarBtn', { read: ElementRef }) guardarBtnRef!: ElementRef<HTMLElement>;

  // Captura sin mouse: Enter en nombre pasa al usuario (texto
  // seleccionado); al elegir usuario el foco cae en Guardar, donde
  // Enter ejecuta el guardado.
  fn_focusUsuario() {
    setTimeout(() => {
      const input = this.usuarioInputRef?.nativeElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  fn_focusGuardar() {
    setTimeout(() => this.guardarBtnRef?.nativeElement?.focus(), 0);
  }

  constructor(
    private dialogRef: MatDialogRef<PersonalCatalogoComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private fb: FormBuilder
    , private authServ: AuthService
    , private catalogosServ: CatalogosPersonalService
    , private usersServ: UsersService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {

    this.catalogo = this.ODataP.catalogo;
    this.entidad = this.ODataP.entidad;
    this.id = this.ODataP.id || 0;

    this.bSoloLectura = !this.authServ.hasPermissionAction(this.ODataP.permisoCrear);

    if (this.bSoloLectura) {
      this.myForm.disable();
      this.usuarioSearchControl.disable();
    }

    this.usuarioSearchSub = this.usuarioSearchControl.valueChanges
      .pipe(debounceTime(600))
      .subscribe((valor: any) => {
        // Si el valor es el objeto seleccionado (no texto), no se busca
        if (typeof valor === 'string') {
          this.usuarioSeleccionado = null;
          this.fn_buscarUsuarios(valor);
        }
      });

    if (this.id > 0) {
      this.fn_cargar();
    }

  }

  ngOnDestroy(): void {
    this.usuarioSearchSub?.unsubscribe();
  }

  get titulo(): string {
    if (this.bSoloLectura) {
      return `Ver ${ this.entidad }`;
    }
    return this.id > 0 ? `Modificar ${ this.entidad }` : `Nuevo ${ this.entidad }`;
  }

  private fn_cargar() {

    this.bShowSpinner = true;
    this.catalogosServ.CGetById(this.catalogo, this.id)
      .subscribe({
        next: (resp: ResponseGet) => {
          this.bShowSpinner = false;
          if (resp.status === 0 && resp.data) {
            this.myForm.patchValue({
              nombre: resp.data.nombre,
              active: !!resp.data.active
            });
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
    this.fn_focusGuardar();
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
      nombre: this.myForm.value.nombre,
      active: this.id > 0 ? this.myForm.value.active : true
    };

    this.catalogosServ.CInsertUpdate(this.catalogo, data)
      .subscribe({
        next: (resp: any) => {
          this.bGuardando = false;

          if (resp.status === 0) {
            this.huboCambios = true;
            this.banner = { tipo: 'ok', mensaje: resp.message };

            // Tras el alta, el modal pasa a modo edición del registro
            // recién creado (no se limpia el formulario ni se cierra).
            if (this.id === 0 && resp.data?.id) {
              this.id = resp.data.id;
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

  fn_close() {
    this.dialogRef.close(this.huboCambios);
  }

}
