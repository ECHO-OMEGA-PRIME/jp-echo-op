# PERMIAN PULSE — D1 Water Analysis Database Build Prompt

## FOR: CCC Worker reorganizing jp.echo-op.com
## TASK: Create Cloudflare D1 database to house water chemistry analysis reports

---

## CONTEXT

The Permian Pulse platform (jp.echo-op.com) needs a dedicated Cloudflare D1 database to store water chemistry analysis data parsed from DownHole SAT PDF lab reports. There are ~50 Discovery CWA well PDF reports in `C:\Users\bobmc\Downloads\jbfiles\` that will be the initial dataset. The frontend pages (wells.html, well-detail.html, upload.html, query.html, map.html, alerts.html, analytics.html) already have UI code that calls API endpoints — this database backs those endpoints.

**Reference files** (all in `C:\Users\bobmc\Downloads\jbfiles\`):
- `02_DATABASE_SCHEMA.sql` — PostgreSQL schema (must be adapted to D1/SQLite)
- `06_SAMPLE_PARSED_OUTPUT.json` — Example parsed PDF output (the data shape for inserts)
- `01_PDF_FORMAT_ANALYSIS.md` — PDF layout and extraction patterns
- `03_ION_REFERENCE_GUIDE.md` — Ion reference, equivalent weights, variance rules
- `04_PARSER_DOWNHOLE_SAT.py` — Python parser (pdfplumber + regex)
- `05_PROJECT_INSTRUCTIONS.md` — Project context and revenue model

---

## D1 DATABASE NAME

```
permian-pulse-water
```

Create with:
```bash
npx wrangler d1 create permian-pulse-water
```

Add to the bgat-api-gateway Worker's `wrangler.toml`:
```toml
[[d1_databases]]
binding = "WATER_DB"
database_name = "permian-pulse-water"
database_id = "<UUID_FROM_CREATE>"
```

---

## SCHEMA (D1/SQLite ADAPTED)

The original schema is PostgreSQL+PostGIS. D1 is SQLite. Key adaptations:
- `UUID` → `TEXT` with generated IDs (use `hex(randomblob(16))` or generate in app code)
- `SERIAL` → `INTEGER PRIMARY KEY AUTOINCREMENT`
- `DECIMAL(12,4)` → `REAL`
- `JSONB` → `TEXT` (store JSON as string, parse in app)
- `TIMESTAMPTZ` → `TEXT` (ISO 8601 strings)
- `PostGIS geometry` → separate `latitude REAL, longitude REAL` columns
- No `CREATE EXTENSION`, no materialized views, no PL/pgSQL functions
- No `ON CONFLICT` with complex expressions — use simpler UNIQUE constraints
- `BOOLEAN` → `INTEGER` (0/1)

Execute all SQL below via:
```bash
npx wrangler d1 execute permian-pulse-water --remote --command="<SQL>"
```

Or batch via file:
```bash
npx wrangler d1 execute permian-pulse-water --remote --file=schema.sql
```

### Table 1: operators

```sql
CREATE TABLE IF NOT EXISTS operators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operator_name TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT DEFAULT 'TX',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_operators_name ON operators(operator_name);
```

### Table 2: formations

```sql
CREATE TABLE IF NOT EXISTS formations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_name TEXT NOT NULL UNIQUE,
  geological_age TEXT,
  typical_depth_range_ft TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_formations_name ON formations(formation_name);
```

### Table 3: wells

```sql
CREATE TABLE IF NOT EXISTS wells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  well_name TEXT NOT NULL,
  api_number TEXT UNIQUE,
  operator_id INTEGER REFERENCES operators(id),
  target_formation TEXT,
  field_name TEXT,
  county TEXT,
  state TEXT DEFAULT 'TX',
  latitude REAL,
  longitude REAL,
  total_depth_ft REAL,
  well_status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_wells_name ON wells(well_name);
CREATE INDEX idx_wells_api ON wells(api_number);
CREATE INDEX idx_wells_operator ON wells(operator_id);
CREATE INDEX idx_wells_formation ON wells(target_formation);
CREATE INDEX idx_wells_county ON wells(county);
CREATE INDEX idx_wells_status ON wells(well_status);
CREATE INDEX idx_wells_latlon ON wells(latitude, longitude);
```

### Table 4: labs

```sql
CREATE TABLE IF NOT EXISTS labs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_name TEXT NOT NULL UNIQUE,
  lab_code TEXT UNIQUE,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  accreditation TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Table 5: samples (one row per PDF report)

```sql
CREATE TABLE IF NOT EXISTS samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  well_id INTEGER NOT NULL REFERENCES wells(id),
  lab_id INTEGER REFERENCES labs(id),
  sample_date TEXT NOT NULL,
  received_date TEXT,
  report_date TEXT,
  lab_id_number TEXT,
  sample_point TEXT,
  sample_type TEXT DEFAULT 'produced_water',
  pdf_filename TEXT,
  pdf_r2_key TEXT,
  validation_status TEXT DEFAULT 'pending',
  ion_balance_pct REAL,
  tds_calculated REAL,
  tds_measured REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(well_id, sample_date, lab_id_number)
);
CREATE INDEX idx_samples_well ON samples(well_id);
CREATE INDEX idx_samples_date ON samples(sample_date);
CREATE INDEX idx_samples_lab ON samples(lab_id);
CREATE INDEX idx_samples_validation ON samples(validation_status);
CREATE INDEX idx_samples_well_date ON samples(well_id, sample_date DESC);
```

### Table 6: ion_readings (one row per sample — all ions in one wide row)

```sql
CREATE TABLE IF NOT EXISTS ion_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL UNIQUE REFERENCES samples(id),

  -- Cations (mg/L)
  calcium REAL,
  magnesium REAL,
  barium REAL,
  strontium REAL,
  sodium REAL,
  potassium REAL,
  iron REAL,
  manganese REAL,
  lithium REAL,
  zinc REAL,
  lead REAL,
  boron REAL,
  silica REAL,

  -- Anions (mg/L)
  chloride REAL,
  sulfate REAL,
  dissolved_co2 REAL,
  bicarbonate REAL,
  h2s REAL,
  bromide REAL,
  fluoride REAL,
  nitrate REAL,

  -- Parameters
  temperature_f REAL,
  sample_ph REAL,
  conductivity REAL,
  tds REAL,
  resistivity REAL,
  specific_gravity REAL,
  total_hardness REAL,
  total_alkalinity REAL,

  -- Bacteria (per mL)
  srb_bacteria REAL,
  apb_bacteria REAL,
  gab_bacteria REAL,
  irb_bacteria REAL,

  -- Oil & Gas
  oil_content REAL,
  dissolved_gas REAL,
  co2_gas_pct REAL,
  h2s_gas_pct REAL,

  -- Calculated
  cation_meq_total REAL,
  anion_meq_total REAL,
  ion_balance_pct REAL,

  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_ions_sample ON ion_readings(sample_id);
```

### Table 7: scale_potential (12-row temperature sweep per sample)

```sql
CREATE TABLE IF NOT EXISTS scale_potential (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id),
  temperature_f REAL NOT NULL,

  -- Saturation indices (xSAT)
  calcite_xsat REAL,
  aragonite_xsat REAL,
  gypsum_xsat REAL,
  anhydrite_xsat REAL,
  barite_xsat REAL,
  celestite_xsat REAL,
  siderite_xsat REAL,

  -- Scale amounts (lbs per 1000 bbl)
  calcite_lbs REAL,
  aragonite_lbs REAL,
  gypsum_lbs REAL,
  anhydrite_lbs REAL,
  barite_lbs REAL,
  celestite_lbs REAL,
  siderite_lbs REAL,

  -- Corrosion
  co2_corrosion_mpy REAL,
  pco2 REAL,

  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(sample_id, temperature_f)
);
CREATE INDEX idx_scale_sample ON scale_potential(sample_id);
CREATE INDEX idx_scale_temp ON scale_potential(temperature_f);
```

### Table 8: well_statistics (rolling stats per ion per well)

```sql
CREATE TABLE IF NOT EXISTS well_statistics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  well_id INTEGER NOT NULL REFERENCES wells(id),
  ion_name TEXT NOT NULL,
  sample_count INTEGER DEFAULT 0,
  mean_value REAL,
  stddev_value REAL,
  min_value REAL,
  max_value REAL,
  trend TEXT DEFAULT 'stable',
  last_calculated TEXT DEFAULT (datetime('now')),
  UNIQUE(well_id, ion_name)
);
CREATE INDEX idx_wellstats_well ON well_statistics(well_id);
CREATE INDEX idx_wellstats_ion ON well_statistics(ion_name);
```

### Table 9: variance_alerts

```sql
CREATE TABLE IF NOT EXISTS variance_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id),
  well_id INTEGER NOT NULL REFERENCES wells(id),
  rule_id TEXT NOT NULL,
  ion_name TEXT,
  severity TEXT NOT NULL DEFAULT 'warning',
  current_value REAL,
  expected_value REAL,
  sigma_deviation REAL,
  message TEXT NOT NULL,
  acknowledged INTEGER DEFAULT 0,
  acknowledged_by TEXT,
  acknowledged_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_alerts_sample ON variance_alerts(sample_id);
CREATE INDEX idx_alerts_well ON variance_alerts(well_id);
CREATE INDEX idx_alerts_severity ON variance_alerts(severity);
CREATE INDEX idx_alerts_ack ON variance_alerts(acknowledged);
CREATE INDEX idx_alerts_rule ON variance_alerts(rule_id);
```

### Table 10: chemical_companies

```sql
CREATE TABLE IF NOT EXISTS chemical_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  phone TEXT,
  service_area TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Table 11: query_log (audit trail)

```sql
CREATE TABLE IF NOT EXISTS query_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  query_type TEXT NOT NULL,
  parameters TEXT,
  result_count INTEGER,
  execution_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_querylog_user ON query_log(user_id);
CREATE INDEX idx_querylog_type ON query_log(query_type);
CREATE INDEX idx_querylog_date ON query_log(created_at);
```

### Table 12: users (RBAC)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  firebase_uid TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT DEFAULT 'viewer',
  operator_id INTEGER REFERENCES operators(id),
  company_id INTEGER REFERENCES chemical_companies(id),
  last_login TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_firebase ON users(firebase_uid);
```

Roles: `admin`, `operator`, `chemical_company`, `lab_tech`, `viewer`

---

## SEED DATA

### 20 Permian Basin Formations

```sql
INSERT INTO formations (formation_name, geological_age, typical_depth_range_ft) VALUES
  ('Spraberry', 'Permian', '6500-8000'),
  ('Dean', 'Permian', '7500-8500'),
  ('Wolfcamp A', 'Permian', '8000-9500'),
  ('Wolfcamp B', 'Permian', '9000-10500'),
  ('Wolfcamp C', 'Permian', '10000-11000'),
  ('Wolfcamp D', 'Permian', '10500-12000'),
  ('Bone Spring 1', 'Permian', '8500-10000'),
  ('Bone Spring 2', 'Permian', '9500-11000'),
  ('Bone Spring 3', 'Permian', '10500-12000'),
  ('Delaware', 'Permian', '4000-5500'),
  ('San Andres', 'Permian', '4000-5000'),
  ('Clearfork', 'Permian', '5500-7000'),
  ('Glorieta', 'Permian', '4500-5500'),
  ('Yeso', 'Permian', '5000-6000'),
  ('Strawn', 'Pennsylvanian', '10000-12000'),
  ('Ellenburger', 'Ordovician', '12000-15000'),
  ('Canyon', 'Pennsylvanian', '8500-10000'),
  ('Cisco', 'Pennsylvanian', '7500-9000'),
  ('Avalon', 'Permian', '7000-8500'),
  ('Bell Canyon', 'Permian', '3500-5000');
```

### 2 Labs

```sql
INSERT INTO labs (lab_name, lab_code, city, state) VALUES
  ('DownHole SAT', 'DHSAT', 'Midland', 'TX'),
  ('Stim-Lab', 'STIMLAB', 'Duncan', 'OK');
```

### Admin User (JP)

```sql
INSERT INTO users (email, display_name, role) VALUES
  ('admin@jp.echo-op.com', 'JP Admin', 'admin');
```

---

## DATA INSERTION PATTERN

When a PDF is uploaded and parsed (by `04_PARSER_DOWNHOLE_SAT.py`), the resulting JSON (shaped like `06_SAMPLE_PARSED_OUTPUT.json`) gets inserted in this order:

### Step 1: Upsert operator
```sql
INSERT INTO operators (operator_name) VALUES (?)
  ON CONFLICT(operator_name) DO NOTHING;
SELECT id FROM operators WHERE operator_name = ?;
```

### Step 2: Upsert well
```sql
INSERT INTO wells (well_name, operator_id, field_name, county, state)
  VALUES (?, ?, ?, ?, 'TX')
  ON CONFLICT(api_number) DO UPDATE SET updated_at = datetime('now');
SELECT id FROM wells WHERE well_name = ? AND operator_id = ?;
```

### Step 3: Insert sample
```sql
INSERT INTO samples (well_id, lab_id, sample_date, lab_id_number, sample_point, pdf_filename, validation_status, ion_balance_pct)
  VALUES (?, ?, ?, ?, ?, ?, 'validated', ?);
```

### Step 4: Insert ion_readings (all ions in one wide row)
```sql
INSERT INTO ion_readings (
  sample_id,
  calcium, magnesium, barium, strontium, sodium, potassium, iron, manganese,
  lithium, zinc, lead, boron, silica,
  chloride, sulfate, dissolved_co2, bicarbonate, h2s, bromide, fluoride, nitrate,
  temperature_f, sample_ph, conductivity, tds, resistivity, specific_gravity,
  total_hardness, total_alkalinity,
  cation_meq_total, anion_meq_total, ion_balance_pct
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
```

### Step 5: Insert scale_potential (12 rows — one per temperature)
```sql
INSERT INTO scale_potential (
  sample_id, temperature_f,
  calcite_xsat, aragonite_xsat, gypsum_xsat, anhydrite_xsat, barite_xsat, celestite_xsat, siderite_xsat,
  calcite_lbs, aragonite_lbs, gypsum_lbs, anhydrite_lbs, barite_lbs, celestite_lbs, siderite_lbs,
  co2_corrosion_mpy, pco2
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
```

Temperature sweep rows: 70, 80, 90, 100, 120, 140, 150, 160, 180, 200, 210, 220°F

### Step 6: Run variance detection (after insert)

For each ion, compare to `well_statistics` for that well:
```sql
SELECT mean_value, stddev_value FROM well_statistics
  WHERE well_id = ? AND ion_name = ?;
```

If `|current - mean| > 2 * stddev`, insert a variance_alert:
```sql
INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, current_value, expected_value, sigma_deviation, message)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

### Step 7: Update well_statistics (rolling recalculation)
```sql
-- For each ion, recalculate stats from all samples for that well
UPDATE well_statistics SET
  sample_count = (SELECT COUNT(*) FROM ion_readings ir JOIN samples s ON ir.sample_id = s.id WHERE s.well_id = ?),
  mean_value = (SELECT AVG(ir.COLUMN) FROM ion_readings ir JOIN samples s ON ir.sample_id = s.id WHERE s.well_id = ?),
  stddev_value = (SELECT ... ),
  min_value = (SELECT MIN(ir.COLUMN) ... ),
  max_value = (SELECT MAX(ir.COLUMN) ... ),
  last_calculated = datetime('now')
WHERE well_id = ? AND ion_name = ?;
```

---

## VARIANCE DETECTION RULES

Implement these 12 single-ion rules in the API gateway:

| Rule ID | Ion | Low | High | Severity |
|---------|-----|-----|------|----------|
| VAR-001 | Barium | 0 | 500 | critical if >200 |
| VAR-002 | Iron | 0 | 200 | warning if >50, critical if >100 |
| VAR-003 | H2S | 0 | 500 | critical if >100 |
| VAR-004 | Calcium | 500 | 50000 | warning if <1000 |
| VAR-005 | Chloride | 5000 | 200000 | warning outside range |
| VAR-006 | TDS | 10000 | 350000 | warning outside range |
| VAR-007 | pH | 4.0 | 9.0 | critical outside range |
| VAR-008 | Sulfate | 0 | 5000 | warning if >2000 |
| VAR-009 | Manganese | 0 | 50 | warning if >20 |
| VAR-010 | Strontium | 0 | 5000 | info only |
| VAR-011 | Sodium | 5000 | 100000 | warning outside range |
| VAR-012 | Magnesium | 100 | 5000 | warning outside range |

Plus 5 composite rules:

| Rule ID | Name | Logic |
|---------|------|-------|
| COMP-001 | BaSO4 Risk | barium > 50 AND sulfate > 100 → critical (barite scale) |
| COMP-002 | CaCO3 Risk | calcium > 5000 AND bicarbonate > 500 → warning (calcite scale) |
| COMP-003 | Ion Balance | abs(ion_balance_pct) > 5% → warning, > 10% → critical |
| COMP-004 | TDS vs Conductivity | TDS / conductivity ratio outside 0.55-0.75 → warning |
| COMP-005 | SpGr vs TDS | SpGr < 1.0 + (TDS * 0.7e-6) → warning (measurement error) |

---

## ION BALANCE CALCULATION

Ion balance validates data quality. Target: < 5%.

**Formula:**
```
ion_balance_pct = abs(sum_cation_meq - sum_anion_meq) / (sum_cation_meq + sum_anion_meq) * 200
```

**Cation equivalent weights (mg/L → meq/L = mg/L ÷ eq_weight):**
| Ion | Eq Weight |
|-----|-----------|
| Calcium | 20.04 |
| Magnesium | 12.15 |
| Sodium | 22.99 |
| Potassium | 39.10 |
| Barium | 68.67 |
| Strontium | 43.81 |
| Iron | 27.92 |
| Manganese | 27.47 |
| Lithium | 6.94 |

**Anion equivalent weights:**
| Ion | Eq Weight |
|-----|-----------|
| Chloride | 35.45 |
| Sulfate | 48.03 |
| Bicarbonate | 61.02 |
| Dissolved CO2 | 30.01 |
| H2S | 17.04 |
| Bromide | 79.90 |

---

## API ENDPOINTS (for bgat-api-gateway Worker)

These endpoints are already called by the frontend HTML pages. The D1 queries back them:

| Endpoint | Method | Frontend Page | D1 Query |
|----------|--------|---------------|----------|
| `/api/v1/wells` | GET | wells.html | `SELECT * FROM wells ORDER BY well_name LIMIT ? OFFSET ?` |
| `/api/v1/wells/:id` | GET | well-detail.html | `SELECT w.*, o.operator_name FROM wells w LEFT JOIN operators o ON w.operator_id = o.id WHERE w.id = ?` |
| `/api/v1/wells/:id/samples` | GET | well-detail.html | `SELECT s.*, ir.* FROM samples s LEFT JOIN ion_readings ir ON ir.sample_id = s.id WHERE s.well_id = ? ORDER BY s.sample_date DESC` |
| `/api/v1/wells/:id/trends` | GET | well-detail.html | `SELECT s.sample_date, ir.COLUMN as value FROM samples s JOIN ion_readings ir ON ir.sample_id = s.id WHERE s.well_id = ? ORDER BY s.sample_date` |
| `/api/v1/samples/upload` | POST | upload.html | Parse PDF → INSERT into samples + ion_readings + scale_potential |
| `/api/v1/query/formation/:name` | GET | query.html | `SELECT AVG(ir.tds), AVG(ir.chloride), ... FROM ion_readings ir JOIN samples s ON ir.sample_id = s.id JOIN wells w ON s.well_id = w.id WHERE w.target_formation = ?` |
| `/api/v1/map/radius` | GET | query.html | `SELECT * FROM wells WHERE ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?` (haversine in JS) |
| `/api/v1/map/wells` | GET | map.html | `SELECT w.id, w.well_name, w.latitude, w.longitude, w.operator_id, o.operator_name, w.target_formation as formation, ... FROM wells w LEFT JOIN operators o ON w.operator_id = o.id WHERE w.latitude IS NOT NULL` |
| `/api/v1/map/heatmap/:ion` | GET | map.html | `SELECT w.latitude as lat, w.longitude as lon, ir.COLUMN as value FROM wells w JOIN samples s ON s.well_id = w.id JOIN ion_readings ir ON ir.sample_id = s.id WHERE w.latitude IS NOT NULL` |
| `/api/v1/alerts` | GET | alerts.html | `SELECT va.*, w.well_name, s.sample_date FROM variance_alerts va JOIN wells w ON va.well_id = w.id JOIN samples s ON va.sample_id = s.id ORDER BY va.created_at DESC` |
| `/api/v1/dashboard/stats` | GET | dashboard.html | Aggregate counts from wells, samples, alerts |
| `/api/v1/analytics/overview` | GET | analytics.html | Monthly sample counts, top formations, ion trends |

---

## INITIAL DATA LOAD

~50 Discovery CWA well PDF reports exist in `C:\Users\bobmc\Downloads\jbfiles\`. The parser at `04_PARSER_DOWNHOLE_SAT.py` can extract structured data from each PDF.

**Batch load script pattern:**
```python
import os, json, sys
sys.path.insert(0, "C:/Users/bobmc/Downloads/jbfiles")
from PARSER_DOWNHOLE_SAT import parse_downhole_sat_pdf

pdf_dir = "C:/Users/bobmc/Downloads/jbfiles"
for f in os.listdir(pdf_dir):
    if f.lower().endswith('.pdf'):
        result = parse_downhole_sat_pdf(os.path.join(pdf_dir, f))
        if result.success:
            # POST to /api/v1/samples/upload or insert directly via D1 REST API
            print(f"Parsed: {f} -> {result.system_id.well_name}")
```

The Worker's upload endpoint should accept either:
1. Raw PDF (parse server-side via Worker or via a companion Python service)
2. Pre-parsed JSON matching the `06_SAMPLE_PARSED_OUTPUT.json` structure

---

## RADIUS SEARCH (without PostGIS)

D1 has no PostGIS. Use the haversine approximation:

```sql
-- Approximate: 1 degree latitude ≈ 69 miles, 1 degree longitude ≈ 69 * cos(lat) miles
-- For a 10-mile radius at lat 31.95:
SELECT *,
  (69.0 * (latitude - :lat)) * (69.0 * (latitude - :lat)) +
  (69.0 * cos(:lat * 3.14159 / 180) * (longitude - :lng)) * (69.0 * cos(:lat * 3.14159 / 180) * (longitude - :lng))
  AS dist_sq
FROM wells
WHERE latitude BETWEEN :lat - (:radius / 69.0) AND :lat + (:radius / 69.0)
  AND longitude BETWEEN :lng - (:radius / (69.0 * cos(:lat * 3.14159 / 180))) AND :lng + (:radius / (69.0 * cos(:lat * 3.14159 / 180)))
HAVING dist_sq < (:radius * :radius)
ORDER BY dist_sq;
```

Compute actual `distance_miles = sqrt(dist_sq)` in the Worker code after query.

---

## FORMATION AVERAGES (replaces materialized view)

The PostgreSQL schema had a materialized view `mv_formation_averages`. In D1, compute on-the-fly or cache in KV:

```sql
SELECT
  w.target_formation,
  COUNT(DISTINCT s.id) as sample_count,
  AVG(ir.tds) as avg_tds,
  AVG(ir.chloride) as avg_chloride,
  AVG(ir.calcium) as avg_calcium,
  AVG(ir.magnesium) as avg_magnesium,
  AVG(ir.sodium) as avg_sodium,
  AVG(ir.barium) as avg_barium,
  AVG(ir.strontium) as avg_strontium,
  AVG(ir.iron) as avg_iron,
  AVG(ir.manganese) as avg_manganese,
  AVG(ir.sulfate) as avg_sulfate,
  AVG(ir.bicarbonate) as avg_bicarbonate,
  AVG(ir.h2s) as avg_h2s,
  AVG(ir.sample_ph) as avg_ph,
  AVG(ir.specific_gravity) as avg_sg
FROM wells w
JOIN samples s ON s.well_id = w.id
JOIN ion_readings ir ON ir.sample_id = s.id
WHERE w.target_formation = ?
GROUP BY w.target_formation;
```

Cache result in KV with 1-hour TTL per formation. Invalidate on new sample insert.

---

## EXECUTION CHECKLIST

1. [ ] Create D1 database: `npx wrangler d1 create permian-pulse-water`
2. [ ] Execute all 12 CREATE TABLE statements (in order — operators, formations, wells, labs, samples, ion_readings, scale_potential, well_statistics, variance_alerts, chemical_companies, query_log, users)
3. [ ] Execute all CREATE INDEX statements
4. [ ] Insert seed data (20 formations, 2 labs, admin user)
5. [ ] Add `[[d1_databases]]` binding to bgat-api-gateway wrangler.toml
6. [ ] Implement API endpoints in the Worker (or add routes to existing gateway)
7. [ ] Parse and load ~50 Discovery CWA PDFs
8. [ ] Verify: dashboard.html, wells.html, well-detail.html, map.html all render data
9. [ ] Run variance detection on loaded data
10. [ ] Compute initial well_statistics for all wells

---

## D1 SIZE LIMITS

- Max DB size: 10GB (free), 50GB (paid)
- Max row size: ~1MB
- Max rows per table: unlimited (practically)
- 50 PDF reports ≈ ~600 rows across samples + ion_readings + scale_potential (50 samples × 12 temp rows = 600 scale rows)
- This is tiny for D1. Can scale to 100K+ samples easily.
