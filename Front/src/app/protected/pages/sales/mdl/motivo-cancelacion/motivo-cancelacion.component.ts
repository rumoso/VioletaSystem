import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Confirmación de cancelación con motivo obligatorio (analisis/022).
// Parámetros: titulo, mensaje, aDatos ([{ desc, n }] opcional: lo que
// tiene capturado el registro) y sBotonConfirmar. Cierra con el motivo
// ya recortado, o sin valor si el usuario no confirma.
@Component({
  selector: 'app-motivo-cancelacion',
  templateUrl: './motivo-cancelacion.component.html',
  styleUrls: ['./motivo-cancelacion.component.css']
})
export class MotivoCancelacionComponent {

  readonly iMaxMotivo: number = 500;

  motivoForm: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<MotivoCancelacionComponent>
    , @Inject(MAT_DIALOG_DATA) public ODataP: any
    , private fb: FormBuilder
  ) {
    this.motivoForm = this.fb.group({
      motivo: [ '', [ Validators.required, Validators.maxLength( this.iMaxMotivo ), this.fn_noSoloEspacios ] ]
    });
  }

  get aDatos(): any[] {
    return this.ODataP?.aDatos || [];
  }

  get iCaracteres(): number {
    return String( this.motivoForm.get('motivo')?.value || '' ).length;
  }

  fn_noSoloEspacios( control: any ): any {
    return String( control.value || '' ).trim().length === 0 ? { soloEspacios: true } : null;
  }

  fn_confirmar(): void {
    if( this.motivoForm.invalid ){
      this.motivoForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close( String( this.motivoForm.value.motivo ).trim() );
  }

  fn_cerrar(): void {
    this.dialogRef.close();
  }

}
