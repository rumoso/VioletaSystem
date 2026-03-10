import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FxrateService } from 'src/app/protected/services/fxrate.service';

@Component({
  selector: 'app-add-fxrate-type-dialog',
  template: `
    <h2 mat-dialog-title>{{ data?.isEdit ? 'Modificar Referencia' : 'Agregar Nueva Referencia' }}</h2>
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

      <mat-form-field class="full-width">
        <mat-label>Base</mat-label>
        <input matInput
        type="number"
        step="0.01"
        [(ngModel)]="data.base"
        placeholder="0.00"
        matTooltip="Divisor de conversión del Metal Fino (Referencia Origen). Fórmula: Costo = (Costo Metal Fino / Base) × Medición"
        matTooltipPosition="above">
        <mat-icon matSuffix
          matTooltip="Divisor de conversión del Metal Fino (Referencia Origen). Fórmula: Costo = (Costo Metal Fino / Base) × Medición"
          matTooltipPosition="above"
          style="cursor:help; color: #888; font-size: 18px;">info_outline</mat-icon>
      </mat-form-field>

      <mat-form-field class="full-width">
        <mat-label>Medición</mat-label>
        <input matInput
        type="number"
        step="0.01"
        [(ngModel)]="data.medicion"
        placeholder="Ej: 8, 14, 18, 24"
        matTooltip="Kilates u otra unidad de medida del metal. Usado en la fórmula: Costo = (Costo Metal Fino / Base) × Medición"
        matTooltipPosition="above">
        <mat-icon matSuffix
          matTooltip="Kilates u otra unidad de medida del metal. Usado en la fórmula: Costo = (Costo Metal Fino / Base) × Medición"
          matTooltipPosition="above"
          style="cursor:help; color: #888; font-size: 18px;">info_outline</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Referencia Origen</mat-label>
        <input matInput
          [(ngModel)]="originSearchText"
          [matAutocomplete]="cbxOriginAuto"
          (keyup)="fn_comboBoxKeyUp(originSearchText, $event)"
          placeholder="Buscar referencia origen...">
        <button *ngIf="originSearchText" matSuffix mat-icon-button aria-label="Limpiar" (click)="fn_clearOrigin()">
          <mat-icon>close</mat-icon>
        </button>
        <mat-autocomplete autoActiveFirstOption #cbxOriginAuto="matAutocomplete" (optionSelected)="fn_originSelected($event)">
          <mat-option [value]="null">Sin referencia origen</mat-option>
          <mat-option *ngFor="let item of originReferenceOptions" [value]="item">
            {{ item.nombre }}
          </mat-option>
          <mat-option disabled *ngIf="originReferenceOptions.length === 0 && originSearchText">
            No se encontró nada...
          </mat-option>
        </mat-autocomplete>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onNoClick()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="fn_submit()">{{ data?.isEdit ? 'Actualizar' : 'Crear' }}</button>
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
export class AddFxRateTypeDialogComponent implements OnInit, OnDestroy {

  originSearchText: string = '';
  originReferenceOptions: any[] = [];
  private timeCBXskeyup: Subject<string> = new Subject<string>();

  constructor(
    public dialogRef: MatDialogRef<AddFxRateTypeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fxRateServ: FxrateService
  ) {
    this.originSearchText = this.data?.originName || '';
  }

  ngOnInit(): void {
    this.timeCBXskeyup
      .pipe(debounceTime(300))
      .subscribe((search) => {
        this.fn_searchOriginReferences(search);
      });
    this.fn_searchOriginReferences('', true);
  }

  ngOnDestroy(): void {
    this.timeCBXskeyup.complete();
  }

  fn_comboBoxKeyUp(text: string, event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      this.timeCBXskeyup.next(text || '');
    }
  }

  fn_originSelected(event: MatAutocompleteSelectedEvent): void {
    const selected = event.option.value;
    if (selected && selected.idFxRateType) {
      this.data.idFxRateTypeOrigin = selected.idFxRateType;
      this.originSearchText = selected.nombre;
    } else {
      this.data.idFxRateTypeOrigin = null;
      this.originSearchText = '';
    }
  }

  fn_clearOrigin(): void {
    this.originSearchText = '';
    this.data.idFxRateTypeOrigin = null;
    this.originReferenceOptions = [];
    this.fn_searchOriginReferences('');
  }

  fn_searchOriginReferences(search: string, loadSelected: boolean = false): void {
    const excludeId = this.data?.idFxRateType || 0;
    this.fxRateServ.CSearchFxRateTypes(search, excludeId)
      .subscribe({
        next: (resp: any) => {
          if (resp?.status === 0 && Array.isArray(resp.data)) {
            this.originReferenceOptions = resp.data;
            if (loadSelected && this.data?.idFxRateTypeOrigin) {
              const found = this.originReferenceOptions.find((x: any) => x.idFxRateType === this.data.idFxRateTypeOrigin);
              if (!found) {
                this.fxRateServ.CSearchFxRateTypes('', 0).subscribe({
                  next: (allResp: any) => {
                    if (allResp?.status === 0 && Array.isArray(allResp.data)) {
                      const selected = allResp.data.find((x: any) => x.idFxRateType === this.data.idFxRateTypeOrigin);
                      if (selected) {
                        this.originReferenceOptions = [selected, ...this.originReferenceOptions];
                      }
                    }
                  }
                });
              }
            }
          }
        }
      });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  fn_submit(): void {
    if (this.data.nombre && this.data.nombre.trim().length > 0) {
      this.dialogRef.close(this.data);
    }
  }
}
