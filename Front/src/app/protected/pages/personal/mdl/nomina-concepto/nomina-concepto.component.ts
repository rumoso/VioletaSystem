import { HttpErrorResponse } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NominaConceptosService } from 'src/app/protected/services/nomina-conceptos.service';

// Modal de alta/modificación de concepto de nómina (analisis/006).
// Solo conceptos propios (los de sistema no llegan aquí). No se cierra
// al guardar: banner interno y pasa a edición tras el alta.

@Component({
  selector: 'app-nomina-concepto',
  templateUrl: './nomina-concepto.component.html',
  styleUrls: ['../../estilos/personal-modal.css']
})
export class NominaConceptoComponent implements OnInit {

  id: number = 0;
  bGuardando: boolean = false;
  huboCambios: boolean = false;

  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    tipo: ['PERCEPCION', [Validators.required]]
  });

  constructor(
    private dialogRef: MatDialogRef<NominaConceptoComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any

    , private fb: FormBuilder
    , private nominaConceptosServ: NominaConceptosService
    ) {
      this.dialogRef.disableClose = true;
    }

  ngOnInit(): void {

    this.id = this.ODataP.id || 0;

    if (this.id > 0) {
      this.myForm.patchValue({
        name: this.ODataP.name,
        tipo: this.ODataP.tipo
      });
    }

  }

  get titulo(): string {
    return this.id > 0 ? 'Modificar concepto' : 'Nuevo concepto';
  }

  fn_guardar() {

    this.banner = null;

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    this.bGuardando = true;

    const data: any = {
      id: this.id,
      ...this.myForm.value
    };

    this.nominaConceptosServ.CInsertUpdate(data)
      .subscribe({
        next: (resp: any) => {
          this.bGuardando = false;

          if (resp.status === 0) {
            this.huboCambios = true;
            this.banner = { tipo: 'ok', mensaje: resp.message };

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
