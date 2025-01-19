import { Component, Input, AfterViewInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { ChartConfiguration, ChartType } from 'chart.js';
import Chart from 'chart.js/auto'; // Importar Chart.js automáticamente

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css']
})
export class BarChartComponent implements AfterViewInit {
  @Input() chartData: { label: string; costo: number; precio: number; utilidad: number }[] = [];
  @ViewChild('barChart') barChartRef!: ElementRef; // Referencia al canvas
  private chart!: Chart;

  ngAfterViewInit(): void {
    this.createChart(); // Crear el gráfico después de que la vista esté lista
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartData'] && this.chart) {
      this.updateChart();  // Si los datos cambian, actualizar la gráfica
    }
  }

  createChart(): void {
    if (!this.barChartRef) {
      console.error('El elemento canvas no está disponible');
      return;
    }

    // Descomponer los datos de entrada en etiquetas y valores para los datasets
    const labels = this.chartData.map((item) => item.label);
    const costo = this.chartData.map((item) => item.costo);
    const precio = this.chartData.map((item) => item.precio);
    const utilidad = this.chartData.map((item) => item.utilidad);

    // Configuración del gráfico
    const config: ChartConfiguration = {
      type: 'bar' as ChartType,  // Especificar el tipo 'bar'
      data: {
        labels: labels,  // Etiquetas de cada barra (por ejemplo, Producto 1, Producto 2)
        datasets: [
          {
            label: 'Precio',
            data: precio,
            backgroundColor: '#36A2EB',  // Color para el precio
            borderColor: '#36A2EB',
            borderWidth: 1,
            barThickness: 40,  // Ajuste del grosor de las barras
          },
          {
            label: 'Costo',
            data: costo,
            backgroundColor: '#FF6384',  // Color para el costo
            borderColor: '#FF6384',
            borderWidth: 1,
            barThickness: 40,  // Ajuste del grosor de las barras
          },
          {
            label: 'Utilidad',
            data: utilidad,
            backgroundColor: '#5cb85c',  // Color para la utilidad
            borderColor: '#5cb85c',
            borderWidth: 1,
            barThickness: 40,  // Ajuste del grosor de las barras
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          x: {
            // Para controlar la agrupación de las barras
            stacked: false,  // No apilarlas
          },
          y: {
            beginAtZero: true,  // Asegurarse de que el eje Y comience en 0
          },
        },
        plugins: {
          legend: {
            position: 'top',
          },
        },
      },
    };

    // Obtener el contexto 2D del canvas
    const ctx = this.barChartRef.nativeElement.getContext('2d'); // Obtener el contexto 2D
    if (ctx) {
      this.chart = new Chart(ctx, config);  // Crear el gráfico usando el contexto
    } else {
      console.error('No se pudo obtener el contexto del canvas');
    }
  }

  // Método para actualizar el gráfico con nuevos datos
  updateChart(): void {
    // Actualizar los datos del gráfico con los nuevos valores
    this.chart.data.labels = this.chartData.map((item) => item.label);
    this.chart.data.datasets[0].data = this.chartData.map((item) => item.precio);
    this.chart.data.datasets[1].data = this.chartData.map((item) => item.costo);
    this.chart.data.datasets[2].data = this.chartData.map((item) => item.utilidad);

    // Llamar a update para redibujar la gráfica con los nuevos datos
    this.chart.update();
  }
}
