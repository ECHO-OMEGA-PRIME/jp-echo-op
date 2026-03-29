-- Permian Pulse Competitor Intelligence D1 Schema
-- Database: permian-pulse-intel
-- Purpose: Store competitive intelligence data discovered by Prometheus OSINT
-- Frontend: competitor-intel.html on jp.echo-op.com

-- Table 1: ci_competitors (master competitor list)
CREATE TABLE IF NOT EXISTS ci_competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  website_url TEXT,
  location TEXT,
  description TEXT,
  employee_count INTEGER,
  annual_revenue TEXT,
  market_segment TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_comp_name ON ci_competitors(name);
CREATE INDEX IF NOT EXISTS idx_ci_comp_status ON ci_competitors(status);

-- Table 2: ci_formulations (chemical product formulations)
CREATE TABLE IF NOT EXISTS ci_formulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL REFERENCES ci_competitors(id),
  product_name TEXT NOT NULL,
  chemical_type TEXT,
  application TEXT,
  key_ingredients TEXT,
  concentration_range TEXT,
  sds_url TEXT,
  notes TEXT,
  source TEXT,
  discovered_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_form_comp ON ci_formulations(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ci_form_type ON ci_formulations(chemical_type);
CREATE INDEX IF NOT EXISTS idx_ci_form_app ON ci_formulations(application);

-- Table 3: ci_patents (patent filings and grants)
CREATE TABLE IF NOT EXISTS ci_patents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL REFERENCES ci_competitors(id),
  patent_number TEXT NOT NULL,
  title TEXT NOT NULL,
  filing_date TEXT,
  grant_date TEXT,
  abstract TEXT,
  claims_summary TEXT,
  status TEXT DEFAULT 'filed',
  inventors TEXT,
  assignee TEXT,
  source TEXT,
  discovered_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(patent_number)
);
CREATE INDEX IF NOT EXISTS idx_ci_pat_comp ON ci_patents(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ci_pat_number ON ci_patents(patent_number);
CREATE INDEX IF NOT EXISTS idx_ci_pat_status ON ci_patents(status);
CREATE INDEX IF NOT EXISTS idx_ci_pat_filing ON ci_patents(filing_date);

-- Table 4: ci_market_intel (market intelligence reports)
CREATE TABLE IF NOT EXISTS ci_market_intel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL REFERENCES ci_competitors(id),
  intel_type TEXT NOT NULL,
  description TEXT NOT NULL,
  source TEXT,
  confidence TEXT DEFAULT 'medium',
  date_collected TEXT DEFAULT (datetime('now')),
  verified INTEGER DEFAULT 0,
  verified_by TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_mi_comp ON ci_market_intel(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ci_mi_type ON ci_market_intel(intel_type);
CREATE INDEX IF NOT EXISTS idx_ci_mi_confidence ON ci_market_intel(confidence);
CREATE INDEX IF NOT EXISTS idx_ci_mi_date ON ci_market_intel(date_collected);

-- Table 5: ci_osint (OSINT findings from Prometheus)
CREATE TABLE IF NOT EXISTS ci_osint (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER REFERENCES ci_competitors(id),
  competitor_name TEXT,
  finding_type TEXT NOT NULL,
  finding_value TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  details TEXT,
  source_tool TEXT,
  scan_type TEXT,
  domain TEXT,
  discovered_at TEXT DEFAULT (datetime('now')),
  verified INTEGER DEFAULT 0,
  false_positive INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_osint_comp ON ci_osint(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ci_osint_type ON ci_osint(finding_type);
CREATE INDEX IF NOT EXISTS idx_ci_osint_severity ON ci_osint(severity);
CREATE INDEX IF NOT EXISTS idx_ci_osint_domain ON ci_osint(domain);
CREATE INDEX IF NOT EXISTS idx_ci_osint_scan ON ci_osint(scan_type);
CREATE INDEX IF NOT EXISTS idx_ci_osint_discovered ON ci_osint(discovered_at);

-- Table 6: ci_financials (financial data and estimates)
CREATE TABLE IF NOT EXISTS ci_financials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL REFERENCES ci_competitors(id),
  fiscal_year TEXT NOT NULL,
  segment TEXT,
  revenue REAL,
  gross_margin REAL,
  operating_income REAL,
  key_metrics TEXT,
  source TEXT,
  extracted_at TEXT DEFAULT (datetime('now')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(competitor_id, fiscal_year, segment)
);
CREATE INDEX IF NOT EXISTS idx_ci_fin_comp ON ci_financials(competitor_id);
CREATE INDEX IF NOT EXISTS idx_ci_fin_year ON ci_financials(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_ci_fin_segment ON ci_financials(segment);

-- Table 7: ci_ingestion_log (track Prometheus data imports)
CREATE TABLE IF NOT EXISTS ci_ingestion_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  table_name TEXT NOT NULL,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  errors TEXT,
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  status TEXT DEFAULT 'running'
);
CREATE INDEX IF NOT EXISTS idx_ci_ingest_source ON ci_ingestion_log(source);
CREATE INDEX IF NOT EXISTS idx_ci_ingest_status ON ci_ingestion_log(status);
CREATE INDEX IF NOT EXISTS idx_ci_ingest_date ON ci_ingestion_log(started_at);
