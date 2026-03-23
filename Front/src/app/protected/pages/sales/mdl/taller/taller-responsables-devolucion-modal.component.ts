import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, debounceTime } from 'rxjs';
import { SalesService } from 'src/app/protected/services/sales.service';
import { UsersService } from 'src/app/protected/services/users.service';
import { ServicesGService } from 'src/app/servicesG/servicesG.service';

interface Responsable {
  idResponsablesDevolucion: number;
  idTaller: number;
  idUser: number;
  userName: string;
  monto: number;
  // estado edición inline
  _editing?: boolean;
  _editIdUser?: number;
  _editUserName?: string;
  _editMonto?: number | null;
  _editSearch?: string;
  _editUserOptions?: any[];
}

@Component({
  selector: 'app-taller-responsables-devolucion-modal',
  templateUrl: './taller-responsables-devolucion-modal.component.html'
})
export class TallerResponsablesDevolucionModalComponent implements OnInit {

  responsables: Responsable[] = [];
  bLoading: boolean = false;

  // Nueva fila
  newIdUser: number = 0;
  newUserName: string = '';
  newMonto: number | null = null;
  newSearch: string = '';
  newUserOptions: any[] = [];
  private newSearch$ = new Subject<string>();

  get totalAsignado(): number {
    return this.responsables.reduce((s, r) => s + (Number(r.monto) || 0), 0);
  }

  constructor(
    private dialogRef: MatDialogRef<TallerResponsablesDevolucionModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { idTaller: number; totalTaller: number },
    private salesServ: SalesService,
    private usersServ: UsersService,
    private servicesGServ: ServicesGService
  ) {}

  ngOnInit(): void {
    this.fn_cargarLista();

    this.newSearch$.pipe(debounceTime(300)).subscribe(search => {
      if (search.length < 1) { this.newUserOptions = []; return; }
      this.usersServ.CCbxGetAllUsersCombo(search).subscribe({
        next: (r: any) => { this.newUserOptions = r.status === 0 ? r.data : []; },
        error: () => {}
      });
    });
  }

  fn_cargarLista(): void {
    this.bLoading = true;
    this.salesServ.CGetTallerResponsablesDevolucion(this.data.idTaller).subscribe({
      next: (r: any) => {
        this.responsables = r.status === 0 ? r.data : [];
        this.bLoading = false;
      },
      error: () => { this.bLoading = false; }
    });
  }

  // ── Búsqueda nueva fila ──────────────────────────────────────────
  onNewSearchChange(val: string): void {
    this.newIdUser = 0;
    this.newUserName = '';
    this.newSearch$.next(val);
  }

  selectNewUser(u: any): void {
    this.newIdUser = u.id;
    this.newUserName = u.nombre;
    this.newSearch = u.nombre;
    this.newUserOptions = [];
  }

  // ── Agregar ──────────────────────────────────────────────────────
  fn_agregar(): void {
    if (!this.newIdUser) {
      this.servicesGServ.showSnakbar('Seleccione un usuario');
      return;
    }
    if (!this.newMonto || this.newMonto <= 0) {
      this.servicesGServ.showSnakbar('Ingrese un monto válido');
      return;
    }

    // Validar que no se exceda el total del taller
    const existing = this.responsables.find(r => r.idUser === this.newIdUser);
    const montoYaAsignado = existing ? Number(existing.monto) : 0;
    const otrosAsignados = this.totalAsignado - montoYaAsignado;
    const nuevoTotal = otrosAsignados + montoYaAsignado + Number(this.newMonto);
    if (nuevoTotal > Number(this.data.totalTaller)) {
      const disponible = Number(this.data.totalTaller) - otrosAsignados - montoYaAsignado;
      this.servicesGServ.showSnakbar(`El monto excede el total del taller. Máximo disponible: $${disponible.toFixed(2)}`);
      return;
    }

    // Si el usuario ya existe en la lista, actualizar sumando el monto
    if (existing) {
      const nuevoMonto = montoYaAsignado + Number(this.newMonto);
      const params = { idResponsablesDevolucion: existing.idResponsablesDevolucion, idUser: existing.idUser, monto: nuevoMonto };
      this.salesServ.CUpdateResponsableDevolucion(params).subscribe({
        next: (r: any) => {
          if (r.status === 0) {
            this.fn_resetNueva();
            this.fn_cargarLista();
          } else {
            this.servicesGServ.showSnakbar(r.message || 'Error al actualizar');
          }
        },
        error: () => this.servicesGServ.showSnakbar('Error al actualizar responsable')
      });
      return;
    }

    const params = { idTaller: this.data.idTaller, idUser: this.newIdUser, monto: this.newMonto };
    this.salesServ.CInsertResponsableDevolucion(params).subscribe({
      next: (r: any) => {
        if (r.status === 0) {
          this.fn_resetNueva();
          this.fn_cargarLista();
        } else {
          this.servicesGServ.showSnakbar(r.message || 'Error al agregar');
        }
      },
      error: () => this.servicesGServ.showSnakbar('Error al agregar responsable')
    });
  }

  fn_resetNueva(): void {
    this.newIdUser = 0;
    this.newUserName = '';
    this.newMonto = null;
    this.newSearch = '';
    this.newUserOptions = [];
  }

  // ── Edición inline ───────────────────────────────────────────────
  fn_iniciarEdicion(r: Responsable): void {
    r._editing = true;
    r._editIdUser = r.idUser;
    r._editUserName = r.userName;
    r._editMonto = r.monto;
    r._editSearch = r.userName;
    r._editUserOptions = [];
  }

  fn_cancelarEdicion(r: Responsable): void {
    r._editing = false;
  }

  onEditSearchChange(r: Responsable, val: string): void {
    r._editIdUser = 0;
    r._editUserName = '';
    if (val.length < 1) { r._editUserOptions = []; return; }
    this.usersServ.CCbxGetAllUsersCombo(val).subscribe({
      next: (resp: any) => { r._editUserOptions = resp.status === 0 ? resp.data : []; },
      error: () => {}
    });
  }

  selectEditUser(r: Responsable, u: any): void {
    r._editIdUser = u.id;
    r._editUserName = u.nombre;
    r._editSearch = u.nombre;
    r._editUserOptions = [];
  }

  fn_guardarEdicion(r: Responsable): void {
    if (!r._editIdUser) {
      this.servicesGServ.showSnakbar('Seleccione un usuario');
      return;
    }
    if (!r._editMonto || r._editMonto <= 0) {
      this.servicesGServ.showSnakbar('Ingrese un monto válido');
      return;
    }
    // Validar que no se exceda el total: descontar el monto actual de esta fila y sumar el nuevo
    const otrosAsignados = this.totalAsignado - Number(r.monto);
    if (otrosAsignados + Number(r._editMonto) > Number(this.data.totalTaller)) {
      const disponible = Number(this.data.totalTaller) - otrosAsignados;
      this.servicesGServ.showSnakbar(`El monto excede el total del taller. Máximo disponible: $${disponible.toFixed(2)}`);
      return;
    }
    const params = { idResponsablesDevolucion: r.idResponsablesDevolucion, idUser: r._editIdUser, monto: r._editMonto };
    this.salesServ.CUpdateResponsableDevolucion(params).subscribe({
      next: (resp: any) => {
        if (resp.status === 0) {
          this.fn_cargarLista();
        } else {
          this.servicesGServ.showSnakbar(resp.message || 'Error al actualizar');
        }
      },
      error: () => this.servicesGServ.showSnakbar('Error al actualizar')
    });
  }

  // ── Eliminar ────────────────────────────────────────────────────
  fn_eliminar(r: Responsable): void {
    this.salesServ.CDeleteResponsableDevolucion(r.idResponsablesDevolucion).subscribe({
      next: (resp: any) => {
        if (resp.status === 0) {
          this.fn_cargarLista();
        } else {
          this.servicesGServ.showSnakbar(resp.message || 'Error al eliminar');
        }
      },
      error: () => this.servicesGServ.showSnakbar('Error al eliminar')
    });
  }

  fn_cerrar(): void {
    this.dialogRef.close();
  }
}
