import { Component, Input, AfterViewInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import Chart from 'chart.js/auto';

// Registrar todos los controladores necesarios

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements AfterViewInit {
  @Input() chartData: { label: string; value: number }[] = []; // Datos dinámicos

  @ViewChild('pieChart') pieChartRef!: ElementRef; // Referencia al canvas
  private chart!: Chart;

  ngAfterViewInit(): void {
    this.createChart(); // Crear la gráfica después de que la vista esté lista
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] && this.chart) {
      this.updateChart();  // Si los datos cambian, actualizar la gráfica
    }
  }

  createChart(): void {
    if (!this.pieChartRef) {
      console.error('El elemento canvas no está disponible');
      return;
    }

    // Descomponer los datos de entrada en etiquetas y valores
    const labels = this.chartData.map((item) => item.label);
    const data = this.chartData.map((item) => item.value);

    // Configuración de la gráfica
    const config: ChartConfiguration = {
      type: 'pie' as ChartType,  // Especificar el tipo 'pie'
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: ['#FF6384', '#5cb85c', '#FFCE56'], // Colores
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    };

    // Crear el gráfico
    const ctx = this.pieChartRef.nativeElement.getContext('2d'); // Obtener el contexto 2D
    if (ctx) {
      this.chart = new Chart(ctx, config);
    } else {
      console.error('No se pudo obtener el contexto del canvas');
    }
  }

  // Método para actualizar la gráfica con los nuevos datos
  updateChart(): void {
    // Actualizar los datos del gráfico con los nuevos valores
    this.chart.data.labels = this.chartData.map((item) => item.label);
    this.chart.data.datasets[0].data = this.chartData.map((item) => item.value);

    // Llamar a update para redibujar la gráfica con los nuevos datos
    this.chart.update();
  }
}
