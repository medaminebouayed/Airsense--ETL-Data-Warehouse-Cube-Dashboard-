const express = require('express');
const cors = require('cors');
const ADODB = require('node-adodb');

const app = express();
app.use(cors());
app.use(express.json());

// Connection to SSAS using MSOLAP
const connection = ADODB.open('Provider=MSOLAP;Data Source=AMINE\\MSSQLSERVER1;Initial Catalog=AirSenseCube;');

const runMDX = async (mdx, res) => {
  try {
    const data = await connection.query(mdx);
    res.json(data);
  } catch (err) {
    console.error('MDX Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// 1. Flights per dimension (aeroport or compagnie)
app.get('/api/flights', (req, res) => {
  const dimension = req.query.dimension || 'aeroport';
  let mdx = '';
  
  if (dimension === 'compagnie') {
    mdx = `SELECT NON EMPTY { [Measures].[FACT Vol Count] } ON COLUMNS, NON EMPTY { ([Compagnie].[Nom].Children ) } ON ROWS FROM [AirSense]`;
  } else {
    mdx = `SELECT NON EMPTY { [Measures].[FACT Vol Count] } ON COLUMNS, NON EMPTY { ([Aeroport].[Nom].Children ) } ON ROWS FROM [AirSense]`;
  }
  
  runMDX(mdx, res);
});

// 2. Incidents by type
app.get('/api/incidents_by_type', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[FACT Incident Count] } ON COLUMNS, NON EMPTY { ([Type Incident].[Libelle].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 3. Performance over time (Punctuality by Year/Month)
app.get('/api/performance_over_time', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Taux Ponctualite] } ON COLUMNS, NON EMPTY { ([Temps].[Annee].Children * [Temps].[Mois].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 4. Financial impact of incidents (Cost and Affected Passengers by Incident Type)
app.get('/api/analytics/financial_impact', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Cout Incident Usd], [Measures].[Nb Passagers Affectes] } ON COLUMNS, NON EMPTY { ([Type Incident].[Categorie].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 5. Weather correlation 
app.get('/api/analytics/weather_correlation', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Retard Depart Min], [Measures].[FACT Vol Count] } ON COLUMNS, NON EMPTY { ([Meteo].[Condition].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 6. Top performers (Top 10 airlines by Revenue)
app.get('/api/analytics/top_performers', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Revenus Estimes Usd], [Measures].[Satisfaction Score] } ON COLUMNS, NON EMPTY { TopCount([Compagnie].[Nom].Children, 10, [Measures].[Revenus Estimes Usd]) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// --- NEW ENDPOINTS FOR MAX QUERIES ---

// 7. Cancellations by season
app.get('/api/analytics/cancellations_by_season', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Taux Annulation] } ON COLUMNS, NON EMPTY { ([Temps].[Saison].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 8. Incidents Severity by Category
app.get('/api/analytics/incidents_severity', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Severite Score] } ON COLUMNS, NON EMPTY { ([Type Incident].[Categorie].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 9. Delays by Cause
app.get('/api/analytics/delays_by_cause', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Retard Depart Min], [Measures].[Retard Arrivee Min] } ON COLUMNS, NON EMPTY { ([Cause Retard].[Categorie].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 10. Distance & Passengers by Airline
app.get('/api/analytics/distance_by_airline', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Distance Miles], [Measures].[Nb Passagers] } ON COLUMNS, NON EMPTY { ([Compagnie].[Nom].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 11. Immobilization by Incident Type
app.get('/api/analytics/immobilization_by_type', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[Duree Immobilisation H] } ON COLUMNS, NON EMPTY { ([Type Incident].[Libelle].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 12. Flights by Weather
app.get('/api/analytics/flights_by_weather', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[FACT Vol Count] } ON COLUMNS, NON EMPTY { ([Meteo].[Condition].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

// 13. Flights by Day of Week
app.get('/api/analytics/flights_by_day', (req, res) => {
  const mdx = `SELECT NON EMPTY { [Measures].[FACT Vol Count] } ON COLUMNS, NON EMPTY { ([Temps].[Jour Semaine].Children ) } ON ROWS FROM [AirSense]`;
  runMDX(mdx, res);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
