# AirSense - Airline Business Intelligence System

A comprehensive Business Intelligence solution for airline performance analysis, featuring ETL pipelines, OLAP cubes, and an interactive web dashboard.

---

## Project Overview

**AirSense** is a full-stack Business Intelligence system designed to analyze airline performance metrics. It processes data from multiple sources, transforms it into a star schema data warehouse, and provides interactive analytics through a web dashboard.

### Key Features

- **ETL Pipelines** (SSIS) - Extract, transform, and load airline data
- **OLAP Cube** (SSAS) - Multi-dimensional analysis with complex metrics
- **REST API** (Node.js/Express) - Query the cube via MDX
- **Business Metrics** - Punctuality rates, delays, incidents, revenue, weather correlation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AirSense Architecture                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│   │ RAW_DATA │    │   SSIS   │    │  SQL DW  │    │   SSAS   │    │
│   │   CSV    │───▶│   ETL    │───▶│   (SA)   │───▶│  Cube    │    │
│   └──────────┘    └──────────┘    └──────────┘    └────┬─────┘    │
│                                                        │           │
│   ┌────────────────────────────────────────────────────┴────┐      │
│   │                   Node.js REST API                       │      │
│   │                   (Express + ADODB)                      │      │
│   └──────────────────────────┬───────────────────────────────┘      │
│                              │                                      │
│   ┌──────────────────────────┴───────────────────────────────┐      │
│   │                   Web Dashboard                          │      │
│   │                   (Any Frontend)                         │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
ProjetBI/
│
├── AirSense/                    # SSIS Project (ETL)
│   ├── AirSense.sln
│   └── AirSense/
│       ├── Master.dtsx          # Master orchestration package
│       ├── Dimension.dtsx      # Dimension table loads
│       ├── Fact_Performance.dtsx
│       ├── Fact_Incident.dtsx
│       ├── Fact_Vol.dtsx
│       └── bin/Development/
│
├── AirSenseCube/                # SSAS Project (OLAP)
│   ├── AirSenseCube.sln
│   └── AirSenseCube/
│       ├── AirSense.cube        # Multi-dimensional cube
│       ├── AirSense.ds          # Data source
│       ├── Aeromet.dim          # Airport dimension
│       ├── Compagnie.dim        # Airline dimension
│       ├── Temps.dim            # Time dimension
│       ├── Type Incident.dim    # Incident type dimension
│       ├── Meteo.dim            # Weather dimension
│       └── Cause Retard.dim     # Delay cause dimension
│
├── data/                        # Raw CSV Data
│   ├── RAW_DIM_Temps.csv
│   ├── RAW_DIM_Aeroport.csv
│   ├── RAW_DIM_Compagnie.csv
│   ├── RAW_DIM_Meteo.csv
│   ├── RAW_DIM_Type_Incident.csv
│   ├── RAW_DIM_Cause_Retard.csv
│   ├── RAW_FACT_Performance.csv
│   ├── RAW_FACT_Incident.csv
│   └── RAW_FACT_Vol.csv
│
├── web/                         # Node.js Backend
│   └── nodeBackend/
│       ├── server.js            # Express API server
│       └── package.json
│
└── CubeDeployed.png            # Cube deployment screenshot
```

---

## Data Model

### Star Schema

```
                    ┌─────────────────┐
                    │    DIM_TEMPS    │
                    │   (Date Key)    │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ FACT_PERFORMANCE│ │  FACT_INCIDENT  │ │    FACT_VOL     │
│                 │ │                 │ │                 │
│ - punctuality   │ │ - severity      │ │ - departure     │
│ - cancellation  │ │ - cost (USD)    │ │ - arrival       │
│ - revenue       │ │ - passengers    │ │ - distance      │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┴───────────────────┘
              ┌──────────────┬──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │DIM_AEROPORT  │ │DIM_COMPAGNIE │ │  DIM_METEO   │
    └──────────────┘ └──────────────┘ └──────────────┘
              │              │
              └──────────────┘
              ┌──────────────┐
              │DIM_TYPE_INC  │
              └──────────────┘
```

### Dimension Tables

| Dimension | Description | Key Fields |
|-----------|-------------|-------------|
| `DIM_TEMPS` | Time/Date | date_id, jour, mois, trimestre, annee, saison, jour_semaine |
| `DIM_AEROPORT` | Airports | aeroport_id, nom, code_IATA, ville, pays, latitude, longitude |
| `DIM_COMPAGNIE` | Airlines | compagnie_id, nom, code_IATA, pays, alliance, taille |
| `DIM_METEO` | Weather | meteo_id, condition, temperature, vent_kmh, precipitation_mm |
| `DIM_TYPE_INCIDENT` | Incident Types | type_id, libelle, categorie, gravite_max |
| `DIM_CAUSE_RETARD` | Delay Causes | cause_id, categorie, code |

### Fact Tables

| Fact Table | Records | Description |
|------------|---------|-------------|
| `FACT_Performance` | ~368 | Daily airline performance metrics per route |
| `FACT_Incident` | ~3020 | Security, technical, weather incidents |
| `FACT_Vol` | ~50,436 | Individual flight records with delays |

---

## Cube Structure

### Measures

| Measure | Type | Description |
|---------|------|-------------|
| `FACT Vol Count` | COUNT | Total number of flights |
| `FACT Incident Count` | COUNT | Total incidents |
| `Taux Ponctualite` | DECIMAL | On-time performance percentage |
| `Taux Annulation` | DECIMAL | Cancellation rate |
| `Retard Depart Min` | INTEGER | Average departure delay (minutes) |
| `Retard Arrivee Min` | INTEGER | Average arrival delay (minutes) |
| `Cout Incident Usd` | CURRENCY | Incident cost in USD |
| `Nb Passagers Affectes` | INTEGER | Affected passengers count |
| `Revenus Estimes Usd` | CURRENCY | Estimated revenue |
| `Satisfaction Score` | DECIMAL | Customer satisfaction (0-5) |
| `Distance Miles` | INTEGER | Flight distance |
| `Duree Immobilisation H` | DECIMAL | Aircraft immobilization hours |
| `Severite Score` | INTEGER | Incident severity |

### Dimensions

- **Aeroport** - Hierarchy: Nom → Ville → Pays
- **Compagnie** - Hierarchy: Nom → Alliance → Pays
- **Temps** - Hierarchy: Annee → Trimestre → Mois → Jour
- **Type Incident** - Hierarchy: Categorie → Libelle
- **Meteo** - Hierarchy: Condition
- **Cause Retard** - Hierarchy: Categorie

---

## REST API Endpoints

The Node.js server provides the following analytics endpoints:

### Basic Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/flights` | GET | Flight counts by airport or airline |
| `/api/incidents_by_type` | GET | Incident distribution by type |
| `/api/performance_over_time` | GET | Punctuality trends by year/month |

### Advanced Analytics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/financial_impact` | GET | Cost & affected passengers by incident category |
| `/api/analytics/weather_correlation` | GET | Delay & flights by weather condition |
| `/api/analytics/top_performers` | GET | Top 10 airlines by revenue |
| `/api/analytics/cancellations_by_season` | GET | Cancellation rates by season |
| `/api/analytics/incidents_severity` | GET | Severity scores by incident category |
| `/api/analytics/delays_by_cause` | GET | Delays breakdown by cause |
| `/api/analytics/distance_by_airline` | GET | Distance & passengers by airline |
| `/api/analytics/immobilization_by_type` | GET | Aircraft downtime by incident type |
| `/api/analytics/flights_by_weather` | GET | Flight distribution by weather |
| `/api/analytics/flights_by_day` | GET | Flights by day of week |

### Query Parameters

```
GET /api/flights?dimension=aeroport   # "aeroport" or "compagnie"
GET /api/performance_over_time?year=2024
```

---

## Setup Instructions

### Prerequisites

- **SQL Server 2019+** with SSIS and SSAS
- **Node.js 18+**
- **Windows** (required for SSIS/SSAS)

### 1. Database Setup

```sql
-- Create target database
CREATE DATABASE AirSense;
GO

-- Deploy SSIS packages to SQL Server
-- Use SQL Server Management Studio or SSDT
```

### 2. Deploy SSIS Packages

1. Open `AirSense/AirSense.sln` in Visual Studio (SSDT)
2. Configure connection strings to your SQL Server instance
3. Build and deploy all packages
4. Execute `Master.dtsx` to load all dimension and fact tables

### 3. Deploy SSAS Cube

1. Open `AirSenseCube/AirSenseCube.sln` in Visual Studio
2. Configure data source to `AirSense` database
3. Build the solution
4. Deploy to SSAS instance (`AMINE\MSSQLSERVER1`)

### 4. Start REST API

```bash
cd web/nodeBackend
npm install
npm start

# Server runs on http://localhost:3000
```

---

## Data Statistics

| Dataset | Records | Size |
|---------|---------|------|
| DIM_Temps | 1,097 days (2022-2025) | ~11 KB |
| DIM_Aeroport | 12 airports | ~1 KB |
| DIM_Compagnie | 14 airlines | ~1 KB |
| DIM_Meteo | 10 conditions | ~1 KB |
| DIM_Type_Incident | 10 types | ~1 KB |
| DIM_Cause_Retard | 8 causes | <1 KB |
| FACT_Performance | 368 records | ~15 KB |
| FACT_Incident | 3,020 incidents | ~120 KB |
| FACT_Vol | 50,436 flights | ~3 MB |

---

## Technologies Used

| Layer | Technology | Purpose |
|-------|------------|---------|
| ETL | SSIS 2019 | Data extraction, transformation, loading |
| Database | SQL Server 2019 | Data warehouse storage |
| OLAP | SSAS 2019 | Multi-dimensional analysis |
| API | Node.js + Express | REST API server |
| MDX | MSOLAP Provider | Cube queries via ADODB |

---

## Sample MDX Queries

### Punctuality by Airline (Top 10)
```mdx
SELECT NON EMPTY { [Measures].[Taux Ponctualite] } ON COLUMNS,
NON EMPTY { TopCount([Compagnie].[Nom].Children, 10, [Measures].[Taux Ponctualite]) } ON ROWS
FROM [AirSense]
```

### Delay Analysis by Weather
```mdx
SELECT NON EMPTY { [Measures].[Retard Depart Min], [Measures].[FACT Vol Count] } ON COLUMNS,
NON EMPTY { ([Meteo].[Condition].Children ) } ON ROWS
FROM [AirSense]
```

### Incident Cost by Category
```mdx
SELECT NON EMPTY { [Measures].[Cout Incident Usd] } ON COLUMNS,
NON EMPTY { ([Type Incident].[Categorie].Children ) } ON ROWS
FROM [AirSense]
```

---

## Project Timeline

- **March 2026** - Initial ETL development
- **March 2026** - SSAS cube deployment
- **March 2026** - REST API implementation
- **May 2026** - Documentation and README

---

## Authors

Academic Project - Business Intelligence Course

* [Mohamed Amine Bouayed](https://github.com/medaminebouayed/)
* [Yassine Daoud](https://github.com/dyassine123)


---

## License

This project is for educational purposes.