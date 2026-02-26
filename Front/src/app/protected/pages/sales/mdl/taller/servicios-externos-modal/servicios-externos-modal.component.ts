import { Component, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { SalesService } from 'src/app/protected/services/sales.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';
import { Pagination } from 'src/app/protected/interfaces/global.interfaces';
import { ServicioExternoFormModalComponent } from '../servicio-externo-form-modal/servicio-externo-form-modal.component';

@Component({
  selector: 'app-servicios-externos-modal',
  templateUrl: './servicios-externos-modal.component.html',
  styleUrls: ['./servicios-externos-modal.component.scss']
})
export class ServiciosExternosModalComponent implements OnInit {

  serviciosExternos: any[] = [];

  searchTerm: string = '';
  totalServicios: number = 0;
  pageSize: number = 10;
  pageIndex: number = 0;

  constructor(
    public dialogRef: MatDialogRef<ServiciosExternosModalComponent>,
    private dialog: MatDialog,
    private salesServ: SalesService,
    private servicesGServ: ServicesGService
  ) {}

  ngOnInit(): void {
    this.loadServiciosExternos();
  }

  loadServiciosExternos(): void {
    const pagination: Pagination = {
      search: this.searchTerm,
      length: this.totalServicios,
      pageSize: this.pageSize,
      pageIndex: this.pageIndex,
      pageSizeOptions: [5, 10, 25, 50]
    };

    this.salesServ.CGetServiciosExternosListWithPage(pagination, this.searchTerm)
      .subscribe({
        next: (resp) => {
          if (resp.status === 0) {
            this.serviciosExternos = resp.data.rows || [];
            this.totalServicios = resp.data.count || 0;
          } else {
            this.servicesGServ.showSnakbar('Error al cargar servicios externos');
          }
        },
        error: (err) => {
          this.servicesGServ.showSnakbar('Error al cargar servicios externos');
        }
      });
  }

  onSearch(): void {
    this.pageIndex = 0;
    this.loadServiciosExternos();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadServiciosExternos();
  }

  openFormModal(servicio?: any): void {
    const dialogRef = this.dialog.open(ServicioExternoFormModalComponent, {
      width: '500px',
      disableClose: false,
      data: { servicio: servicio || null }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.saved) {
        this.loadServiciosExternos();
      }
    });
  }

  agregarServicio(): void {
    this.openFormModal();
  }

  editServicio(servicio: any): void {
    this.openFormModal(servicio);
  }

  deleteServicio(servicio: any): void {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${servicio.name}"?`)) {
      return;
    }

    this.salesServ.CDeleteServicioExterno(servicio.idServicioExterno)
      .subscribe({
        next: (resp) => {
          if (resp.status === 0) {
            this.servicesGServ.showSnakbar('Servicio externo eliminado correctamente');
            this.loadServiciosExternos();
          } else {
            this.servicesGServ.showSnakbar('Error al eliminar servicio externo');
          }
        },
        error: (err) => {
          this.servicesGServ.showSnakbar('Error al eliminar servicio externo');
        }
      });
  }
}
