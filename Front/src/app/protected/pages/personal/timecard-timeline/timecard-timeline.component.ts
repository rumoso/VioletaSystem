import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import {
  RangoSemana,
  fn_semanasDelMes,
  fn_esFuturo as util_esFuturo,
  fn_esActual as util_esActual,
  fn_esPasado as util_esPasado,
  fn_rangoCorto
} from '../timecard-list/semana.util';

// Línea del tiempo del mes (analisis/012): las semanas sábado-viernes
// que tocan el mes mostrado, distinguiendo pasada/actual/futura, con
// navegación entre meses. Solo avisa al padre qué semana se eligió —
// no sabe nada de horas ni de empleados.

const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

@Component({
  selector: 'app-timecard-timeline',
  templateUrl: './timecard-timeline.component.html',
  styleUrls: ['./timecard-timeline.component.css']
})
export class TimecardTimelineComponent implements OnInit, OnChanges {

  @Input() semanaSeleccionada: RangoSemana | null = null;
  @Output() seleccionarSemana = new EventEmitter<RangoSemana>();

  hoy: Date = new Date();
  anioMostrado: number = this.hoy.getFullYear();
  mesMostrado: number = this.hoy.getMonth() + 1;

  semanas: RangoSemana[] = [];

  private bYaCentroInicial: boolean = false;

  ngOnInit(): void {
    this.fn_centrarEnSemanaSeleccionada();
    this.fn_recalcular();
  }

  ngOnChanges( changes: SimpleChanges ): void {
    // Solo centra el mes mostrado en la semana seleccionada la PRIMERA
    // vez que llega — si el usuario ya está navegando el timeline, un
    // cambio externo de semana no debe "jalarlo" de vuelta a otro mes.
    if (changes['semanaSeleccionada'] && !this.bYaCentroInicial) {
      this.fn_centrarEnSemanaSeleccionada();
      this.fn_recalcular();
    }
  }

  private fn_centrarEnSemanaSeleccionada() {
    if (this.semanaSeleccionada) {
      this.anioMostrado = this.semanaSeleccionada.inicio.getFullYear();
      this.mesMostrado = this.semanaSeleccionada.inicio.getMonth() + 1;
      this.bYaCentroInicial = true;
    }
  }

  private fn_recalcular() {
    this.semanas = fn_semanasDelMes(this.anioMostrado, this.mesMostrado);
  }

  get nombreMes(): string {
    return `${ MESES_LARGO[this.mesMostrado - 1] } ${ this.anioMostrado }`;
  }

  fn_mesAnterior() {
    this.mesMostrado--;
    if (this.mesMostrado < 1) { this.mesMostrado = 12; this.anioMostrado--; }
    this.fn_recalcular();
  }

  fn_mesSiguiente() {
    this.mesMostrado++;
    if (this.mesMostrado > 12) { this.mesMostrado = 1; this.anioMostrado++; }
    this.fn_recalcular();
  }

  fn_elegir( semana: RangoSemana ) {
    if (util_esFuturo(semana, this.hoy)) {
      return;
    }
    this.seleccionarSemana.emit(semana);
  }

  fn_esSeleccionada( semana: RangoSemana ): boolean {
    return !!this.semanaSeleccionada && semana.startDate === this.semanaSeleccionada.startDate;
  }

  fn_esActual( semana: RangoSemana ): boolean {
    return util_esActual(semana, this.hoy);
  }

  fn_esFuturo( semana: RangoSemana ): boolean {
    return util_esFuturo(semana, this.hoy);
  }

  fn_esPasado( semana: RangoSemana ): boolean {
    return util_esPasado(semana, this.hoy);
  }

  fn_rangoCorto( semana: RangoSemana ): string {
    return fn_rangoCorto(semana);
  }

}
