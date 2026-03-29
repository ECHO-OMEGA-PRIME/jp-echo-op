-- Permian Pulse Water Chemistry D1 Schema
-- Database: permian-pulse-water (89274454-6dee-4d9f-b2cc-e09a335c42ee)

-- Table 1: operators
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
CREATE INDEX IF NOT EXISTS idx_operators_name ON operators(operator_name);

-- Table 2: formations
CREATE TABLE IF NOT EXISTS formations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_name TEXT NOT NULL UNIQUE,
  geological_age TEXT,
  typical_depth_range_ft TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_formations_name ON formations(formation_name);

-- Table 3: wells
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
CREATE INDEX IF NOT EXISTS idx_wells_name ON wells(well_name);
CREATE INDEX IF NOT EXISTS idx_wells_api ON wells(api_number);
CREATE INDEX IF NOT EXISTS idx_wells_operator ON wells(operator_id);
CREATE INDEX IF NOT EXISTS idx_wells_formation ON wells(target_formation);
CREATE INDEX IF NOT EXISTS idx_wells_county ON wells(county);
CREATE INDEX IF NOT EXISTS idx_wells_status ON wells(well_status);
CREATE INDEX IF NOT EXISTS idx_wells_latlon ON wells(latitude, longitude);

-- Table 4: labs
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

-- Table 5: samples
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
CREATE INDEX IF NOT EXISTS idx_samples_well ON samples(well_id);
CREATE INDEX IF NOT EXISTS idx_samples_date ON samples(sample_date);
CREATE INDEX IF NOT EXISTS idx_samples_lab ON samples(lab_id);
CREATE INDEX IF NOT EXISTS idx_samples_validation ON samples(validation_status);
CREATE INDEX IF NOT EXISTS idx_samples_well_date ON samples(well_id, sample_date DESC);

-- Table 6: ion_readings
CREATE TABLE IF NOT EXISTS ion_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL UNIQUE REFERENCES samples(id),
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
  chloride REAL,
  sulfate REAL,
  dissolved_co2 REAL,
  bicarbonate REAL,
  h2s REAL,
  bromide REAL,
  fluoride REAL,
  nitrate REAL,
  temperature_f REAL,
  sample_ph REAL,
  conductivity REAL,
  tds REAL,
  resistivity REAL,
  specific_gravity REAL,
  total_hardness REAL,
  total_alkalinity REAL,
  srb_bacteria REAL,
  apb_bacteria REAL,
  gab_bacteria REAL,
  irb_bacteria REAL,
  oil_content REAL,
  dissolved_gas REAL,
  co2_gas_pct REAL,
  h2s_gas_pct REAL,
  cation_meq_total REAL,
  anion_meq_total REAL,
  ion_balance_pct REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ions_sample ON ion_readings(sample_id);

-- Table 7: scale_potential
CREATE TABLE IF NOT EXISTS scale_potential (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sample_id INTEGER NOT NULL REFERENCES samples(id),
  temperature_f REAL NOT NULL,
  calcite_xsat REAL,
  aragonite_xsat REAL,
  gypsum_xsat REAL,
  anhydrite_xsat REAL,
  barite_xsat REAL,
  celestite_xsat REAL,
  siderite_xsat REAL,
  calcite_lbs REAL,
  aragonite_lbs REAL,
  gypsum_lbs REAL,
  anhydrite_lbs REAL,
  barite_lbs REAL,
  celestite_lbs REAL,
  siderite_lbs REAL,
  co2_corrosion_mpy REAL,
  pco2 REAL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(sample_id, temperature_f)
);
CREATE INDEX IF NOT EXISTS idx_scale_sample ON scale_potential(sample_id);
CREATE INDEX IF NOT EXISTS idx_scale_temp ON scale_potential(temperature_f);

-- Table 8: well_statistics
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
CREATE INDEX IF NOT EXISTS idx_wellstats_well ON well_statistics(well_id);
CREATE INDEX IF NOT EXISTS idx_wellstats_ion ON well_statistics(ion_name);

-- Table 9: variance_alerts
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
CREATE INDEX IF NOT EXISTS idx_alerts_sample ON variance_alerts(sample_id);
CREATE INDEX IF NOT EXISTS idx_alerts_well ON variance_alerts(well_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON variance_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_ack ON variance_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_rule ON variance_alerts(rule_id);

-- Table 10: chemical_companies
CREATE TABLE IF NOT EXISTS chemical_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL UNIQUE,
  contact_email TEXT,
  phone TEXT,
  service_area TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Table 11: query_log
CREATE TABLE IF NOT EXISTS query_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  query_type TEXT NOT NULL,
  parameters TEXT,
  result_count INTEGER,
  execution_ms INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_querylog_user ON query_log(user_id);
CREATE INDEX IF NOT EXISTS idx_querylog_type ON query_log(query_type);
CREATE INDEX IF NOT EXISTS idx_querylog_date ON query_log(created_at);

-- Table 12: users
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
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_firebase ON users(firebase_uid);
