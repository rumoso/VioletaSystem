import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-fxrate-type-dialog',
  template: `
    <h2 mat-dialog-title>Agregar Nueva Referencia</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Nombre de la Referencia *</mat-label>
        <input matInput
        [(ngModel)]="data.nombre"
        placeholder="Ingresa el nombre"
        (keydown.enter)="fn_submit()">
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Descripción</mat-label>
        <textarea matInput
        [(ngModel)]="data.descripcion"
        placeholder="Descripción (opcional)"
        rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="fn_submit()">Crear</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    mat-dialog-content {
      padding: 20px;
      min-width: 350px;
    }
  `]
})
export class AddFxRateTypeDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<AddFxRateTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  fn_submit(): void {
    if (this.data.nombre && this.data.nombre.trim().length > 0) {
      this.dialogRef.close(this.data);
    }
  }
}
