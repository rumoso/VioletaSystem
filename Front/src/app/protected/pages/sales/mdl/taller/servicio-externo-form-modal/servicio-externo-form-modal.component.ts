import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

@Component({
  selector: 'app-servicio-externo-form-modal',
  templateUrl: './servicio-externo-form-modal.component.html',
  styleUrls: ['./servicio-externo-form-modal.component.scss']
})
export class ServicioExternoFormModalComponent implements OnInit {

  servicioForm!: FormGroup;
  isEditing: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ServicioExternoFormModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private salesServ: SalesService,
    private servicesGServ: ServicesGService
  ) {
    this.servicioForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });

    // Si hay datos de edición
    if (data && data.servicio) {
      this.isEditing = true;
      this.servicioForm.patchValue({
        name: data.servicio.name,
        description: data.servicio.description
      });
    }
  }

  ngOnInit(): void {
  }

  saveServicio(): void {
    if (!this.servicioForm.valid) {
      return;
    }

    const serviciosData = {
      idServicioExterno: this.data?.servicio?.idServicioExterno || 0,
      name: this.servicioForm.get('name')?.value,
      description: this.servicioForm.get('description')?.value || ''
    };

    this.salesServ.CInsertUpdateServicioExterno(serviciosData)
      .subscribe({
        next: (resp) => {
          if (resp.status === 0) {
            this.servicesGServ.showSnakbar(resp.message || 'Servicio externo guardado correctamente');
            this.dialogRef.close({ saved: true });
          } else {
            this.servicesGServ.showSnakbar(resp.message || 'Error al guardar servicio externo');
          }
        },
        error: (err) => {
          this.servicesGServ.showSnakbar('Error al guardar servicio externo');
        }
      });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
