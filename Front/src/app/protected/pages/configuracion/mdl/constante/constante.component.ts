import { Component, Inject, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { Constante, ConstantesService } from 'src/app/protected/services/constantes.service';

// Alta y edición de una constante (analisis/040-catalogo-de-constantes.md).
//
// Clave y valor obligatorios; valores 2 a 4 opcionales. El servidor
// normaliza la clave (mayúsculas, guion bajo) y revisa que no se repita
// y que el usuario tenga `config_ConstantesModificar`. Sin esa acción el
// modal solo consulta.

@Component({
  selector: 'app-constante',
  templateUrl: './constante.component.html',
  styleUrls: ['./constante.component.css']
})
export class ConstanteComponent implements OnInit {

  bGuardando: boolean = false;
  sError: string = '';

  idConstante: number = 0;
  sClaveOriginal: string = '';

  form = {
    sKey: '',
    sValue: '',
    sValue2: '',
    sValue3: '',
    sValue4: '',
    bActiva: true
  };

  constructor(
    private dialogRef: MatDialogRef<ConstanteComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: { constante: Constante | null }
    , private authServ: AuthService
    , private constantesServ: ConstantesService
  ) { }

  get bEsNueva(): boolean {
    return this.idConstante === 0;
  }

  get bPuedeEditar(): boolean {
    return this.authServ.hasPermissionAction('config_ConstantesModificar');
  }

  // Así quedará la clave al guardar (la misma regla que el servidor).
  get sClaveNormalizada(): string {
    return String(this.form.sKey || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^A-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  // Renombrar una constante existente: el sistema la busca por su clave.
  get bClaveCambiada(): boolean {
    return !this.bEsNueva && this.sClaveNormalizada !== this.sClaveOriginal;
  }

  ngOnInit(): void {

    const c = this.ODataP?.constante;

    if (c) {
      this.idConstante = c.idConstante;
      this.sClaveOriginal = c.sKey;
      this.form = {
        sKey: c.sKey,
        sValue: c.sValue || '',
        sValue2: c.sValue2 || '',
        sValue3: c.sValue3 || '',
        sValue4: c.sValue4 || '',
        bActiva: Number(c.active) === 1
      };
    }

  }

  fn_cerrar(): void {
    this.dialogRef.close(null);
  }

  fn_guardar(): void {

    this.sError = '';

    if (!this.sClaveNormalizada) {
      this.sError = 'La clave es obligatoria (letras, números y guion bajo).';
      return;
    }

    if (!String(this.form.sValue || '').trim()) {
      this.sError = 'El valor es obligatorio.';
      return;
    }

    this.bGuardando = true;

    this.constantesServ.CSaveConstante({
      idConstante: this.idConstante,
      sKey: this.sClaveNormalizada,
      sValue: this.form.sValue,
      sValue2: this.form.sValue2 || null,
      sValue3: this.form.sValue3 || null,
      sValue4: this.form.sValue4 || null,
      active: this.form.bActiva ? 1 : 0
    }).subscribe({
      next: (resp: ResponseGet) => {
        this.bGuardando = false;
        if (resp.status === 0) {
          this.dialogRef.close({ bGuardado: true });
        } else {
          this.sError = resp.message;
        }
      },
      error: (ex: HttpErrorResponse) => {
        this.bGuardando = false;
        this.sError = ex.status === 401
          ? (ex.error?.message || 'Tu sesión venció. Vuelve a iniciar sesión.')
          : 'Problemas con el servicio';
      }
    });

  }

}
