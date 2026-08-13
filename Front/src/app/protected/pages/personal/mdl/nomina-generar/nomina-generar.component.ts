import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { debounceTime } from 'rxjs';
import { ResponseGet } from 'src/app/interfaces/general.interfaces';
import { EmpleadosService } from 'src/app/protected/services/empleados.service';
import { NominaService } from 'src/app/protected/services/nomina.service';

// Modal de generación de nómina (analisis/007): opcionalmente un
// rango de fechas (solo para acotar qué comisiones pendientes se
// suman — sin fechas se toman todas) y opcionalmente qué empleados
// incluir. Sin empleados elegidos, se genera para todos los activos
// (avisado explícitamente en pantalla). Genera el borrador y cierra
// devolviendo el id creado para abrir su detalle de inmediato.

@Component({
  selector: 'app-nomina-generar',
  templateUrl: './nomina-generar.component.html',
  styleUrls: ['../personal-catalogo/personal-catalogo.component.css', './nomina-generar.component.css']
})
export class NominaGenerarComponent {

  bGenerando: boolean = false;
  banner: { tipo: 'ok' | 'error'; mensaje: string } | null = null;

  myForm: FormGroup = this.fb.group({
    fechaInicio: [''],
    fechaFin: ['']
  });

  empleadoSearchControl: FormControl = new FormControl('');
  empleadosEncontrados: any[] = [];
  bBuscandoEmpleados: boolean = false;
  empleadosElegidos: any[] = [];

  constructor(
    private dialogRef: MatDialogRef<NominaGenerarComponent>
    , private fb: FormBuilder
    , private nominaServ: NominaService
    , private empleadosServ: EmpleadosService
    ) {
      this.dialogRef.disableClose = true;

      this.empleadoSearchControl.valueChanges
        .pipe(debounceTime(500))
        .subscribe((valor: any) => {
          if (typeof valor === 'string' && valor.trim().length > 0) {
            this.fn_buscarEmpleados(valor);
          } else {
            this.empleadosEncontrados = [];
          }
        });
    }

  private fn_buscarEmpleados( search: string ) {

    this.bBuscandoEmpleados = true;
    this.empleadosServ.CGetList({ search, length: 0, pageSize: 10, pageIndex: 0, pageSizeOptions: [] })
      .subscribe({
        next: (resp: ResponseGet) => {
          const rows = resp.status === 0 ? (resp.data.rows || []) : [];
          const idsYaElegidos = new Set(this.empleadosElegidos.map(e => e.id));
          this.empleadosEncontrados = rows.filter((e: any) => e.active && !idsYaElegidos.has(e.id));
          this.bBuscandoEmpleados = false;
        },
        error: () => {
          this.empleadosEncontrados = [];
          this.bBuscandoEmpleados = false;
        }
      });
  }

  fn_agregarEmpleado( empleado: any ) {
    this.empleadosElegidos.push(empleado);
    this.empleadosEncontrados = this.empleadosEncontrados.filter(e => e.id !== empleado.id);
    this.empleadoSearchControl.setValue('', { emitEvent: false });
  }

  fn_quitarEmpleado( empleado: any ) {
    this.empleadosElegidos = this.empleadosElegidos.filter(e => e.id !== empleado.id);
  }

  fn_generar() {

    this.banner = null;

    const fechaInicio = this.myForm.value.fechaInicio;
    const fechaFin = this.myForm.value.fechaFin;

    if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
      this.banner = { tipo: 'error', mensaje: 'La fecha final no puede ser anterior a la inicial.' };
      return;
    }

    this.bGenerando = true;

    const idsEmpleados = this.empleadosElegidos.map(e => e.id);

    this.nominaServ.CGenerar(fechaInicio, fechaFin, idsEmpleados)
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
