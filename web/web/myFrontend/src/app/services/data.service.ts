import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type FlightsDimension = 'aeroport' | 'compagnie';

export interface FlightsByDimension {
  label: string;
  value: number;
}

export interface IncidentsByType {
  libelle: string;
  count_incidents: number;
}

export interface PerformanceOverTime {
  mois_annee: string;
  avg_ponctualite: number;
}

export interface FinancialImpactRow {
  categorie: string;
  cout_incident_usd: number;
  nb_passagers_affectes: number;
}

export interface WeatherCorrelationRow {
  condition: string;
  retard_moyen_min: number;
  taux_ponctualite: number;
}

export interface TopPerformerRow {
  compagnie: string;
  revenus_estimes_usd: number;
  satisfaction_score: number;
}

export interface CancellationsBySeasonRow {
  saison: string;
  taux_annulation: number;
}

export interface IncidentsSeverityRow {
  categorie: string;
  severite_score: number;
}

export interface DelaysByCauseRow {
  categorie: string;
  retard_depart_min: number;
  retard_arrivee_min: number;
}

export interface DistanceByAirlineRow {
  compagnie: string;
  distance_miles: number;
  nb_passagers: number;
}

export interface ImmobilizationByTypeRow {
  libelle: string;
  duree_immobilisation_h: number;
}

export interface FlightsByWeatherRow {
  condition: string;
  fact_vol_count: number;
}

export interface FlightsByDayRow {
  jour_semaine: string;
  fact_vol_count: number;
}

type RecordRow = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private readonly apiUrl = 'http://127.0.0.1:3000/api';

  constructor(private http: HttpClient) {}

  async getFlights(dimension: FlightsDimension = 'aeroport'): Promise<FlightsByDimension[]> {
    const params = new HttpParams().set('dimension', dimension);
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/flights`, { params }));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ label, value }));
  }

  async getIncidentsByType(): Promise<IncidentsByType[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/incidents_by_type`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ libelle: label, count_incidents: value }));
  }

  async getPerformanceOverTime(): Promise<PerformanceOverTime[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/performance_over_time`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ mois_annee: label, avg_ponctualite: value }));
  }

  async getFinancialImpact(): Promise<FinancialImpactRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/financial_impact`));
    return this.normalizeTwoMeasureRows(raw, ({ label, measure1, measure2 }) => ({
      categorie: label,
      cout_incident_usd: measure1,
      nb_passagers_affectes: measure2
    }));
  }

  async getWeatherCorrelation(): Promise<WeatherCorrelationRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/weather_correlation`));
    return this.normalizeTwoMeasureRows(raw, ({ label, measure1, measure2 }) => ({
      condition: label,
      retard_moyen_min: measure1, // This is actually Retard Depart Min now!
      taux_ponctualite: measure2 // This is actually FACT Vol Count now!
    }));
  }

  async getTopPerformers(): Promise<TopPerformerRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/top_performers`));
    return this.normalizeTwoMeasureRows(raw, ({ label, measure1, measure2 }) => ({
      compagnie: label,
      revenus_estimes_usd: measure1,
      satisfaction_score: measure2
    }));
  }

  async getCancellationsBySeason(): Promise<CancellationsBySeasonRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/cancellations_by_season`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ saison: label, taux_annulation: value }));
  }

  async getIncidentsSeverity(): Promise<IncidentsSeverityRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/incidents_severity`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ categorie: label, severite_score: value }));
  }

  async getDelaysByCause(): Promise<DelaysByCauseRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/delays_by_cause`));
    return this.normalizeTwoMeasureRows(raw, ({ label, measure1, measure2 }) => ({
      categorie: label,
      retard_depart_min: measure1,
      retard_arrivee_min: measure2
    }));
  }

  async getDistanceByAirline(): Promise<DistanceByAirlineRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/distance_by_airline`));
    return this.normalizeTwoMeasureRows(raw, ({ label, measure1, measure2 }) => ({
      compagnie: label,
      distance_miles: measure1,
      nb_passagers: measure2
    }));
  }

  async getImmobilizationByType(): Promise<ImmobilizationByTypeRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/immobilization_by_type`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ libelle: label, duree_immobilisation_h: value }));
  }

  async getFlightsByWeather(): Promise<FlightsByWeatherRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/flights_by_weather`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ condition: label, fact_vol_count: value }));
  }

  async getFlightsByDay(): Promise<FlightsByDayRow[]> {
    const raw = await firstValueFrom(this.http.get<RecordRow[]>(`${this.apiUrl}/analytics/flights_by_day`));
    return this.normalizeOneMeasureRows(raw, ({ label, value }) => ({ jour_semaine: label, fact_vol_count: value }));
  }

  private normalizeOneMeasureRows<T>(
    raw: RecordRow[] | null | undefined,
    mapper: (row: { label: string; value: number }) => T
  ): T[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((row) => {
        if (this.isObjectRow(row) && typeof row['label'] === 'string' && row['value'] !== undefined) {
          const value = this.coerceNumber(row['value']);
          if (value === null) return null;
          return mapper({ label: row['label'], value });
        }

        const { label, measures } = this.extractDimensionAndMeasures(row, 1);
        const value = this.coerceNumber(measures[0]);
        if (!label || value === null) return null;
        return mapper({ label, value });
      })
      .filter((v): v is T => v !== null);
  }

  private normalizeTwoMeasureRows<T>(
    raw: RecordRow[] | null | undefined,
    mapper: (row: { label: string; measure1: number; measure2: number }) => T
  ): T[] {
    if (!Array.isArray(raw)) return [];

    return raw
      .map((row) => {
        const { label, measures } = this.extractDimensionAndMeasures(row, 2);
        const measure1 = this.coerceNumber(measures[0]);
        const measure2 = this.coerceNumber(measures[1]);
        if (!label || measure1 === null || measure2 === null) return null;
        return mapper({ label, measure1, measure2 });
      })
      .filter((v): v is T => v !== null);
  }

  private extractDimensionAndMeasures(row: RecordRow, measureCount: number): { label: string; measures: unknown[] } {
    if (!this.isObjectRow(row)) return { label: '', measures: [] };

    const entries = Object.entries(row);
    if (entries.length === 0) return { label: '', measures: [] };

    const captionEntry = entries.find(
      ([key, value]) => /member_caption/i.test(key) && typeof value === 'string' && value.trim().length > 0
    );

    const readableStringEntry = entries.find(([key, value]) => {
      if (typeof value !== 'string') return false;
      const trimmed = value.trim();
      if (!trimmed) return false;
      if (/measures/i.test(key)) return false;
      if (/member_unique_name|uniquename/i.test(key)) return false;
      // Prefer captions over unique names like "[Dim].[Attr].&[Key]"
      if (trimmed.startsWith('[')) return false;
      return true;
    });

    const labelKey = captionEntry?.[0] ?? readableStringEntry?.[0] ?? entries[0][0];
    const labelValue = (captionEntry?.[1] ?? readableStringEntry?.[1] ?? entries[0][1]) as unknown;
    const label = (typeof labelValue === 'string' ? labelValue : String(labelValue ?? '')).trim();

    const measures: unknown[] = [];

    const collectNumeric = (candidates: Array<[string, unknown]>) => {
      for (const [, value] of candidates) {
        if (measures.length >= measureCount) break;
        if (this.coerceNumber(value) !== null) measures.push(value);
      }
    };

    // Prefer measure columns first when coming from OPENQUERY (usually contain "[Measures]" in the column name).
    collectNumeric(entries.filter(([key]) => /measures/i.test(key)));

    // Fallback to remaining columns in SQL order, excluding the chosen label column.
    if (measures.length < measureCount) {
      collectNumeric(entries.filter(([key]) => key !== labelKey));
    }

    return { label, measures };
  }

  private coerceNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'bigint') return Number.isFinite(Number(value)) ? Number(value) : null;

    if (typeof value === 'string') {
      let text = value.trim();
      if (!text) return null;
      text = text.replace(/\s+/g, '');

      if (text.includes('.') && text.includes(',')) {
        text = text.replace(/,/g, '');
      } else if (text.includes(',') && !text.includes('.')) {
        text = text.replace(/,/g, '.');
      }

      const parsed = Number(text);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private isObjectRow(value: unknown): value is RecordRow {
    return typeof value === 'object' && value !== null;
  }
}
