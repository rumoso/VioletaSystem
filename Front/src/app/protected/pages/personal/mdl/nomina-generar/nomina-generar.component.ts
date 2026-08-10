import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { NominaService } from 'src/app/protected/services/nomina.service';

// Modal de generación de nómina (analisis/007): captura tipo de
// periodo + rango de fechas, genera el borrador y cierra devolviendo
// el id creado para abrir su detalle de inmediato.

@Component({
  selector: 'app-nomina-generar',
  templateUrl: './nomina-generar.component.html',
  styleUrls: ['../personal-catalogo/personal-catalogo.component.css']
})
export class NominaGenerarComponent {

  bGenerando: boolean = false;
  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    tipoPeriodo: ['SEMANA', [Validators.required]],
    fechaInicio: ['', [Validators.required]],
    fechaFin: ['', [Validators.required]]
  });

  constructor(
    private dialogRef: MatDialogRef<NominaGenerarComponent>
    , private fb: FormBuilder
    , private nominaServ: NominaService
    ) {
      this.dialogRef.disableClose = true;
    }

  fn_generar() {

    this.banner = null;

    if (this.myForm.invalid) {
      this.myForm.markAllAsTouched();
      return;
    }

    if (this.myForm.value.fechaFin < this.myForm.value.fechaInicio) {
      this.banner = { tipo: 'error', mensaje: 'La fecha final no puede ser anterior a la inicial.' };
      return;
    }

    this.bGenerando = true;

    this.nominaServ.CGenerar(this.myForm.value.tipoPeriodo, this.myForm.value.fechaInicio, this.myForm.value.fechaFin)
      .subscribe({
        next: (resp: any) => {
          this.bGenerando = false;
          if (resp.status === 0) {
            this.dialogRef.close(resp.data.id);
          } else {
            this.banner = { tipo: 'error', mensaje: resp.message };
          }
        },
        error: (ex: HttpErrorResponse) => {
          console.log(ex)
          this.bGenerando = false;
          this.banner = { tipo: 'error', mensaje: 'Problemas con el servicio.' };
        }
      });
  }

  fn_close() {
    this.dialogRef.close(null);
  }

}
