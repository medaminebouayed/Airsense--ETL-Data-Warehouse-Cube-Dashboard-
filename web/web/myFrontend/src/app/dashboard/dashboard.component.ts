import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import Chart from 'chart.js/auto';
import {
  DataService,
  FinancialImpactRow,
  FlightsByDimension,
  FlightsDimension,
  IncidentsByType,
  PerformanceOverTime,
  TopPerformerRow,
  WeatherCorrelationRow,
  CancellationsBySeasonRow,
  IncidentsSeverityRow,
  DelaysByCauseRow,
  DistanceByAirlineRow,
  ImmobilizationByTypeRow,
  FlightsByWeatherRow,
  FlightsByDayRow
} from '../services/data.service';

interface DashboardKpis {
  totalFlights: number | null;
  topFlights: FlightsByDimension | null;
  totalIncidents: number | null;
  topIncidents: IncidentsByType | null;
  latestPunctuality: { month: string; value: number } | null;
  punctualityDelta: number | null;
  totalCostUsd: number | null;
  totalPassengersAffected: number | null;
  avgDelayMin: number | null;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  dimension: FlightsDimension = 'aeroport';
  loading = false;
  error: string | null = null;

  private refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;

  kpis: DashboardKpis = {
    totalFlights: null,
    topFlights: null,
    totalIncidents: null,
    topIncidents: null,
    latestPunctuality: null,
    punctualityDelta: null,
    totalCostUsd: null,
    totalPassengersAffected: null,
    avgDelayMin: null
  };

  private flightsChart: Chart | null = null;
  private incidentsChart: Chart | null = null;
  private performanceChart: Chart | null = null;
  private financialImpactChart: Chart | null = null;
  private weatherChart: Chart | null = null;
  private topPerformersChart: Chart | null = null;
  private cancellationsChart: Chart | null = null;
  private severityChart: Chart | null = null;
  private delaysChart: Chart | null = null;
  private distanceChart: Chart | null = null;
  private immobilizationChart: Chart | null = null;
  private weatherFlightsChart: Chart | null = null;
  private flightsByDayChart: Chart | null = null;

  constructor(private dataService: DataService) {
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.scale.grid.color = '#334155';
  }

  ngOnDestroy(): void {
    if (this.refreshTimeoutId !== null) {
      clearTimeout(this.refreshTimeoutId);
      this.refreshTimeoutId = null;
    }
    this.destroyCharts();
  }

  ngAfterViewInit(): void {
    // Defer initial load to next macrotask to avoid NG0100 in dev mode.
    this.refreshTimeoutId = setTimeout(() => {
      this.refreshTimeoutId = null;
      void this.refreshDashboard();
    }, 0);
  }

  async onDimensionChange(event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement | null;
    const next = (select?.value ?? 'aeroport') as FlightsDimension;
    this.dimension = next;

    try {
      const flights = await this.dataService.getFlights(this.dimension);
      this.updateFlightsKpi(flights);
      this.renderFlightsChart(flights);
    } catch {
      this.error = 'Impossible de charger les vols (API indisponible).';
    }
  }

  private async refreshDashboard(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const [
        flights,
        incidents,
        performance,
        financialImpact,
        weatherCorrelation,
        topPerformers,
        cancellations,
        severities,
        delays,
        distance,
        immobilization,
        weatherFlights,
        flightsByDay
      ] = await Promise.all([
        this.dataService.getFlights(this.dimension),
        this.dataService.getIncidentsByType(),
        this.dataService.getPerformanceOverTime(),
        this.dataService.getFinancialImpact(),
        this.dataService.getWeatherCorrelation(),
        this.dataService.getTopPerformers(),
        this.dataService.getCancellationsBySeason(),
        this.dataService.getIncidentsSeverity(),
        this.dataService.getDelaysByCause(),
        this.dataService.getDistanceByAirline(),
        this.dataService.getImmobilizationByType(),
        this.dataService.getFlightsByWeather(),
        this.dataService.getFlightsByDay()
      ]);

      this.computeKpis(flights, incidents, performance, financialImpact, weatherCorrelation, topPerformers);

      this.renderFlightsChart(flights);
      this.renderIncidentsChart(incidents);
      this.renderPerformanceChart(performance);
      this.renderFinancialImpactChart(financialImpact);
      this.renderWeatherCorrelationChart(weatherCorrelation);
      this.renderTopPerformersChart(topPerformers);
      this.renderCancellationsChart(cancellations);
      this.renderSeverityChart(severities);
      this.renderDelaysByCauseChart(delays);
      this.renderDistanceByAirlineChart(distance);
      this.renderImmobilizationChart(immobilization);
      this.renderFlightsByWeatherChart(weatherFlights);
      this.renderFlightsByDayChart(flightsByDay);
    } catch (e) {
      this.error = this.formatApiError(e);
      this.destroyCharts();
    } finally {
      this.loading = false;
    }
  }

  private formatApiError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = typeof error.error === 'string' ? error.error : (error.error as { message?: unknown } | null)?.message;
      const details = backendMessage ? String(backendMessage) : error.message;
      return `Erreur API (${error.status}): ${details}`;
    }

    if (error instanceof Error) {
      return `Erreur API: ${error.message}`;
    }

    return `Erreur API: ${String(error)}`;
  }

  private computeKpis(
    flights: FlightsByDimension[],
    incidents: IncidentsByType[],
    performance: PerformanceOverTime[],
    financialImpact: FinancialImpactRow[],
    weatherCorrelation: WeatherCorrelationRow[],
    _topPerformers: TopPerformerRow[]
  ): void {
    this.updateFlightsKpi(flights);

    const totalIncidents = this.sum(incidents.map((r) => r.count_incidents));
    const topIncidents = this.maxBy(incidents, (r) => r.count_incidents);

    // Keep the backend order (SSAS member order is often already chronological via key ordering).
    const latest = performance.at(-1) ?? null;
    const previous = performance.at(-2) ?? null;
    const latestRate = latest ? this.normalizeRate(latest.avg_ponctualite) : null;
    const previousRate = previous ? this.normalizeRate(previous.avg_ponctualite) : null;
    const punctualityDelta = latestRate !== null && previousRate !== null ? latestRate - previousRate : null;

    const totalCostUsd = this.sum(financialImpact.map((r) => r.cout_incident_usd));
    const totalPassengersAffected = this.sum(financialImpact.map((r) => r.nb_passagers_affectes));
    const avgDelayMin =
      weatherCorrelation.length > 0 ? this.sum(weatherCorrelation.map((r) => r.retard_moyen_min)) / weatherCorrelation.length : null;

    this.kpis = {
      totalFlights: this.kpis.totalFlights,
      topFlights: this.kpis.topFlights,
      totalIncidents,
      topIncidents,
      latestPunctuality: latest && latestRate !== null ? { month: latest.mois_annee, value: latestRate } : null,
      punctualityDelta,
      totalCostUsd,
      totalPassengersAffected,
      avgDelayMin
    };
  }

  private updateFlightsKpi(flights: FlightsByDimension[]): void {
    const totalFlights = this.sum(flights.map((r) => r.value));
    const topFlights = this.maxBy(flights, (r) => r.value);

    this.kpis = {
      ...this.kpis,
      totalFlights,
      topFlights
    };
  }

  private renderFlightsChart(data: FlightsByDimension[]): void {
    const display = [...data].sort((a, b) => b.value - a.value).slice(0, 15);
    const labels = display.map((d) => d.label);
    const values = display.map((d) => d.value);

    this.flightsChart?.destroy();
    const ctx = document.getElementById('flightsChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    const gradient = ctx.getContext('2d')?.createLinearGradient(0, 0, 0, 400);
    if (gradient) {
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)');
      gradient.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
    }

    this.flightsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Nombre de vols (Top 15)',
            data: values,
            backgroundColor: gradient || 'rgba(56, 189, 248, 0.6)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, border: { dash: [4, 4] } }
        }
      }
    });
  }

  private renderIncidentsChart(data: IncidentsByType[]): void {
    const labels = data.map((d) => d.libelle);
    const values = data.map((d) => d.count_incidents);

    this.incidentsChart?.destroy();

    this.incidentsChart = new Chart('incidentsChart', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#f43f5e',
              '#f59e0b',
              '#10b981',
              '#3b82f6',
              '#8b5cf6',
              '#ec4899',
              '#14b8a6',
              '#eab308',
              '#6366f1',
              '#f97316',
              '#0ea5e9',
              '#d946ef',
              '#84cc16',
              '#06b6d4',
              '#ef4444'
            ],
            borderColor: '#1e293b',
            borderWidth: 3,
            hoverOffset: 10
          }
        ]
      },
      options: {
        responsive: true,
        cutout: '70%',
        plugins: {
          legend: { position: 'right' }
        }
      }
    });
  }

  private renderPerformanceChart(data: PerformanceOverTime[]): void {
    const labels = data.map((d) => d.mois_annee);
    const values = data.map((d) => this.normalizeRate(d.avg_ponctualite) * 100);

    this.performanceChart?.destroy();

    const ctx = document.getElementById('performanceChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    const gradient = ctx.getContext('2d')?.createLinearGradient(0, 0, 0, 400);
    if (gradient) {
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
      gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');
    }

    this.performanceChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Ponctualité (%)',
            data: values,
            fill: true,
            backgroundColor: gradient || 'rgba(139, 92, 246, 0.2)',
            borderColor: '#8b5cf6',
            borderWidth: 3,
            tension: 0.4,
            pointBackgroundColor: '#1e293b',
            pointBorderColor: '#8b5cf6',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false, border: { dash: [4, 4] } }
        }
      }
    });
  }

  private renderFinancialImpactChart(data: FinancialImpactRow[]): void {
    const sorted = [...data].sort((a, b) => b.cout_incident_usd - a.cout_incident_usd);
    const labels = sorted.map((d) => d.categorie);
    const costs = sorted.map((d) => d.cout_incident_usd);
    const passengers = sorted.map((d) => d.nb_passagers_affectes);

    this.financialImpactChart?.destroy();

    const ctx = document.getElementById('financialImpactChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.financialImpactChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Coût des incidents (USD)',
            data: costs,
            backgroundColor: 'rgba(244, 63, 94, 0.35)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'yCost'
          },
          {
            type: 'line',
            label: 'Passagers affectés',
            data: passengers,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.2)',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            yAxisID: 'yPassengers'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          x: { grid: { display: false } },
          yCost: { beginAtZero: true, position: 'left', border: { dash: [4, 4] } },
          yPassengers: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, border: { dash: [4, 4] } }
        }
      }
    });
  }

  private renderWeatherCorrelationChart(data: WeatherCorrelationRow[]): void {
    const labels = data.map((d) => d.condition);
    // Remember: We repurposed these fields in DataService to Retard Depart Min & Vol Count!
    const delays = data.map((d) => d.retard_moyen_min);
    const flightsCount = data.map((d) => d.taux_ponctualite);

    this.weatherChart?.destroy();

    const ctx = document.getElementById('weatherChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.weatherChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Retard Départ (min)',
            data: delays,
            backgroundColor: 'rgba(245, 158, 11, 0.35)',
            borderColor: '#f59e0b',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'yDelay'
          },
          {
            type: 'line',
            label: 'Nombre de vols',
            data: flightsCount,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            yAxisID: 'yFlights'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          x: { grid: { display: false } },
          yDelay: { beginAtZero: true, position: 'left', border: { dash: [4, 4] } },
          yFlights: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, border: { dash: [4, 4] } }
        }
      }
    });
  }

  private renderCancellationsChart(data: CancellationsBySeasonRow[]): void {
    const labels = data.map((d) => d.saison);
    const values = data.map((d) => this.normalizeRate(d.taux_annulation) * 100);

    this.cancellationsChart?.destroy();

    const ctx = document.getElementById('cancellationsChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.cancellationsChart = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [
          {
            label: 'Annulations (%)',
            data: values,
            backgroundColor: [
              'rgba(239, 68, 68, 0.6)',
              'rgba(249, 115, 22, 0.6)',
              'rgba(234, 179, 8, 0.6)',
              'rgba(59, 130, 246, 0.6)'
            ],
            borderColor: '#1e293b',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'right' }
        },
        scales: {
          r: { ticks: { display: false }, grid: { color: '#334155' } }
        }
      }
    });
  }

  private renderSeverityChart(data: IncidentsSeverityRow[]): void {
    const labels = data.map((d) => d.categorie);
    const values = data.map((d) => d.severite_score);

    this.severityChart?.destroy();

    const ctx = document.getElementById('severityChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.severityChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Score de Sévérité',
            data: values,
            backgroundColor: 'rgba(217, 70, 239, 0.3)',
            borderColor: '#d946ef',
            pointBackgroundColor: '#d946ef',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#d946ef',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          r: { grid: { color: '#334155' }, angleLines: { color: '#334155' }, pointLabels: { color: '#94a3b8' } }
        }
      }
    });
  }

  private renderTopPerformersChart(data: TopPerformerRow[]): void {
    const labels = data.map((d) => d.compagnie);
    const revenus = data.map((d) => d.revenus_estimes_usd);
    const satisfaction = data.map((d) => d.satisfaction_score);

    this.topPerformersChart?.destroy();

    const ctx = document.getElementById('topPerformersChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.topPerformersChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Revenus estimés (USD)',
            data: revenus,
            backgroundColor: 'rgba(99, 102, 241, 0.35)',
            borderColor: '#6366f1',
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'yRevenue'
          },
          {
            type: 'line',
            label: 'Satisfaction',
            data: satisfaction,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.15)',
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 3,
            yAxisID: 'ySatisfaction'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
          yRevenue: { beginAtZero: true, position: 'left', border: { dash: [4, 4] } },
          ySatisfaction: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, border: { dash: [4, 4] } }
        }
      }
    });
  }

  private renderDelaysByCauseChart(data: DelaysByCauseRow[]): void {
    const labels = data.map(d => d.categorie);
    const depart = data.map(d => d.retard_depart_min);
    const arrivee = data.map(d => d.retard_arrivee_min);

    this.delaysChart?.destroy();
    const ctx = document.getElementById('delaysChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.delaysChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Retard Départ',
            data: depart,
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1
          },
          {
            label: 'Retard Arrivée',
            data: arrivee,
            backgroundColor: 'rgba(245, 158, 11, 0.7)',
            borderColor: '#f59e0b',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  }

  private renderDistanceByAirlineChart(data: DistanceByAirlineRow[]): void {
    const sorted = [...data].sort((a, b) => b.distance_miles - a.distance_miles).slice(0, 10);
    const labels = sorted.map(d => d.compagnie);
    const distance = sorted.map(d => d.distance_miles);
    
    this.distanceChart?.destroy();
    const ctx = document.getElementById('distanceChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.distanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Distance Totale (Miles)',
          data: distance,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: { responsive: true }
    });
  }

  private renderImmobilizationChart(data: ImmobilizationByTypeRow[]): void {
    const labels = data.map(d => d.libelle);
    const values = data.map(d => d.duree_immobilisation_h);

    this.immobilizationChart?.destroy();
    const ctx = document.getElementById('immobilizationChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.immobilizationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Immobilisation (Heures)',
          data: values,
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderColor: '#8b5cf6',
          borderWidth: 1
        }]
      },
      options: { indexAxis: 'y', responsive: true }
    });
  }

  private renderFlightsByWeatherChart(data: FlightsByWeatherRow[]): void {
    const labels = data.map(d => d.condition);
    const values = data.map(d => d.fact_vol_count);

    this.weatherFlightsChart?.destroy();
    const ctx = document.getElementById('weatherFlightsChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.weatherFlightsChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: ['#38bdf8', '#f43f5e', '#a855f7', '#fbbf24', '#2dd4bf', '#fb923c']
        }]
      },
      options: { responsive: true, cutout: '60%' }
    });
  }

  private renderFlightsByDayChart(data: FlightsByDayRow[]): void {
    // Standardize the order of days if SSAS returns them in alphabetical order instead of chronological
    const order: Record<string, number> = { 'LUNDI': 1, 'MARDI': 2, 'MERCREDI': 3, 'JEUDI': 4, 'VENDREDI': 5, 'SAMEDI': 6, 'DIMANCHE': 7 };
    const sorted = [...data].sort((a, b) => (order[a.jour_semaine.toUpperCase()] || 0) - (order[b.jour_semaine.toUpperCase()] || 0));
    
    const labels = sorted.map(d => d.jour_semaine);
    const values = sorted.map(d => d.fact_vol_count);

    this.flightsByDayChart?.destroy();
    const ctx = document.getElementById('flightsByDayChart') as HTMLCanvasElement | null;
    if (!ctx) return;

    this.flightsByDayChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Vols par Jour',
          data: values,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 3
        }]
      },
      options: { responsive: true, scales: { x: { grid: { display: false } } } }
    });
  }

  private destroyCharts(): void {
    this.flightsChart?.destroy();
    this.flightsChart = null;
    this.incidentsChart?.destroy();
    this.incidentsChart = null;
    this.performanceChart?.destroy();
    this.performanceChart = null;
    this.financialImpactChart?.destroy();
    this.financialImpactChart = null;
    this.weatherChart?.destroy();
    this.weatherChart = null;
    this.topPerformersChart?.destroy();
    this.topPerformersChart = null;
    this.cancellationsChart?.destroy();
    this.cancellationsChart = null;
    this.severityChart?.destroy();
    this.severityChart = null;
    this.delaysChart?.destroy();
    this.delaysChart = null;
    this.distanceChart?.destroy();
    this.distanceChart = null;
    this.immobilizationChart?.destroy();
    this.immobilizationChart = null;
    this.weatherFlightsChart?.destroy();
    this.weatherFlightsChart = null;
    this.flightsByDayChart?.destroy();
    this.flightsByDayChart = null;
  }

  private sum(values: number[]): number {
    return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
  }

  private maxBy<T>(values: T[], score: (v: T) => number): T | null {
    let best: T | null = null;
    let bestScore = -Infinity;
    for (const v of values) {
      const s = score(v);
      if (s > bestScore) {
        best = v;
        bestScore = s;
      }
    }
    return best;
  }

  private normalizeRate(value: number): number {
    // Some cubes expose rates already as fractions (0..1), others as percentages (0..100).
    if (!Number.isFinite(value)) return 0;
    if (value > 1 && value <= 100) return value / 100;
    return value;
  }
}
