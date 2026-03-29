"""
Permian Pulse — Bulk PDF Loader for D1 Water Chemistry Database
================================================================
Parses DownHole SAT PDF reports and inserts structured water chemistry
data into the Cloudflare D1 'permian-pulse-water' database.

Follows the 7-step insertion pattern from D1_DATABASE_PROMPT.md:
  1. Upsert operator
  2. Upsert well
  3. Insert sample
  4. Insert ion_readings (all ions in one wide row)
  5. Insert scale_potential (12 temperature sweep rows per sample)
  6. Run variance detection
  7. Update well_statistics

Usage:
  H:\Tools\PyManager\pythons\py311\python.exe bulk_load_pdfs.py
  H:\Tools\PyManager\pythons\py311\python.exe bulk_load_pdfs.py --pdf-dir "C:/path/to/pdfs"
  H:\Tools\PyManager\pythons\py311\python.exe bulk_load_pdfs.py --single "C:/path/to/file.pdf"

Tags: #permian-pulse #water-analysis #d1-loader #bulk-import
"""

import json
import math
import os
import subprocess
import sys
import time
from dataclasses import asdict
from datetime import datetime
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from typing import Optional

# ─── CONFIGURATION ──────────────────────────────────────────────────────

WRANGLER_CMD = "npx"
USE_SHELL = True  # Required on Windows so subprocess can resolve npx via PATH/fnm
D1_DATABASE_NAME = "permian-pulse-water"
D1_DATABASE_ID = "89274454-6dee-4d9f-b2cc-e09a335c42ee"
CF_ACCOUNT_ID = "b9af3a4bf161132bb7e5d3d365fb8bb0"

# Default PDF directories to scan (in order of preference)
DEFAULT_PDF_DIRS = [
    "C:/Users/bobmc/Downloads/jbfiles",
    "C:/Users/bobmc/Downloads",
]

# Parser script location
PARSER_PATH = "C:/Users/bobmc/Downloads/jbfiles/04_PARSER_DOWNHOLE_SAT.py"

# Equivalent weights for ion balance calculation (meq/L)
CATION_EQ_WEIGHTS = {
    "calcium": 20.04,
    "magnesium": 12.15,
    "sodium": 22.99,
    "potassium": 39.10,
    "barium": 68.67,
    "strontium": 43.81,
    "iron": 27.92,
    "manganese": 27.47,
}

ANION_EQ_WEIGHTS = {
    "chloride": 35.45,
    "sulfate": 48.03,
    "bicarbonate": 61.02,
    "dissolved_co2": 30.01,
    "h2s": 17.04,
}

# Variance detection rules from D1_DATABASE_PROMPT.md
VARIANCE_RULES = [
    {"id": "VAR-001", "ion": "barium", "low": 0, "high": 500, "critical_above": 200},
    {"id": "VAR-002", "ion": "iron", "low": 0, "high": 200, "warning_above": 50, "critical_above": 100},
    {"id": "VAR-003", "ion": "h2s", "low": 0, "high": 500, "critical_above": 100},
    {"id": "VAR-004", "ion": "calcium", "low": 500, "high": 50000, "warning_below": 1000},
    {"id": "VAR-005", "ion": "chloride", "low": 5000, "high": 200000},
    {"id": "VAR-006", "ion": "tds", "low": 10000, "high": 350000},
    {"id": "VAR-007", "ion": "sample_ph", "low": 4.0, "high": 9.0, "critical_outside": True},
    {"id": "VAR-008", "ion": "sulfate", "low": 0, "high": 5000, "warning_above": 2000},
    {"id": "VAR-009", "ion": "manganese", "low": 0, "high": 50, "warning_above": 20},
    {"id": "VAR-010", "ion": "strontium", "low": 0, "high": 5000, "info_only": True},
    {"id": "VAR-011", "ion": "sodium", "low": 5000, "high": 100000},
    {"id": "VAR-012", "ion": "magnesium", "low": 100, "high": 5000},
]


# ─── LOAD PARSER MODULE ────────────────────────────────────────────────

def load_parser():
    """Dynamically load the DownHole SAT parser module."""
    spec = spec_from_file_location("parser_downhole_sat", PARSER_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load parser from {PARSER_PATH}")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# ─── D1 EXECUTION ──────────────────────────────────────────────────────

def d1_execute(sql: str, retry: int = 2) -> Optional[list]:
    """Execute a single SQL statement against D1 via wrangler CLI.

    Returns the parsed JSON results list, or None on failure.
    """
    for attempt in range(retry + 1):
        try:
            cmd = [WRANGLER_CMD, "wrangler", "d1", "execute", D1_DATABASE_NAME,
                   "--remote", "--command", sql]
            result = subprocess.run(
                cmd if not USE_SHELL else " ".join(f'"{c}"' if " " in c else c for c in cmd),
                capture_output=True,
                text=True,
                timeout=30,
                shell=USE_SHELL,
            )
            if result.returncode != 0:
                stderr = result.stderr.strip()
                if "UNIQUE constraint failed" in stderr or "UNIQUE constraint failed" in result.stdout:
                    return []  # Expected for upserts
                if attempt < retry:
                    time.sleep(1)
                    continue
                print(f"  [ERROR] D1 execute failed: {stderr[:200]}")
                return None

            # Parse JSON output from wrangler
            stdout = result.stdout.strip()
            # wrangler outputs decorative lines before JSON — find the JSON array
            json_start = stdout.find("[")
            if json_start == -1:
                return []
            json_data = json.loads(stdout[json_start:])
            if json_data and isinstance(json_data, list) and json_data[0].get("success"):
                return json_data[0].get("results", [])
            return []

        except subprocess.TimeoutExpired:
            if attempt < retry:
                time.sleep(1)
                continue
            print("  [ERROR] D1 execute timed out")
            return None
        except json.JSONDecodeError:
            return []
        except Exception as e:
            print(f"  [ERROR] D1 execute exception: {e}")
            return None

    return None


def d1_execute_get_id(sql: str) -> Optional[int]:
    """Execute SQL and return the first 'id' from results."""
    results = d1_execute(sql)
    if results and len(results) > 0 and "id" in results[0]:
        return results[0]["id"]
    return None


# ─── SQL ESCAPING ──────────────────────────────────────────────────────

def sql_str(value) -> str:
    """Escape a value for SQL insertion. Returns 'NULL' for None."""
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value):
            return "NULL"
        return str(value)
    # Escape single quotes
    s = str(value).replace("'", "''")
    return f"'{s}'"


# ─── ION BALANCE CALCULATION ───────────────────────────────────────────

def calculate_ion_balance(chem: dict) -> tuple[Optional[float], Optional[float], Optional[float]]:
    """Calculate cation/anion meq totals and ion balance percentage.

    Uses the formula from D1_DATABASE_PROMPT.md:
      ion_balance_pct = abs(sum_cation_meq - sum_anion_meq) / (sum_cation_meq + sum_anion_meq) * 200

    Returns (cation_meq_total, anion_meq_total, ion_balance_pct)
    """
    # Map parser field names to DB column names for cation lookup
    cation_map = {
        "calcium_ca": "calcium",
        "magnesium_mg": "magnesium",
        "sodium_na": "sodium",
        "potassium_k": "potassium",
        "barium_ba": "barium",
        "strontium_sr": "strontium",
        "iron_fe": "iron",
        "manganese_mn": "manganese",
    }
    anion_map = {
        "chloride_cl": "chloride",
        "sulfate_so4": "sulfate",
        "bicarbonate_hco3": "bicarbonate",
        "dissolved_co2": "dissolved_co2",
        "h2s": "h2s",
    }

    cation_meq = 0.0
    for parser_key, db_key in cation_map.items():
        val = chem.get(parser_key)
        if val is not None and db_key in CATION_EQ_WEIGHTS:
            cation_meq += val / CATION_EQ_WEIGHTS[db_key]

    anion_meq = 0.0
    for parser_key, db_key in anion_map.items():
        val = chem.get(parser_key)
        if val is not None and db_key in ANION_EQ_WEIGHTS:
            anion_meq += val / ANION_EQ_WEIGHTS[db_key]

    if (cation_meq + anion_meq) == 0:
        return None, None, None

    balance = abs(cation_meq - anion_meq) / (cation_meq + anion_meq) * 200
    return round(cation_meq, 4), round(anion_meq, 4), round(balance, 3)


# ─── STEP 1: UPSERT OPERATOR ──────────────────────────────────────────

def upsert_operator(operator_name: str) -> Optional[int]:
    """Insert operator if not exists, return operator_id."""
    escaped = sql_str(operator_name)
    d1_execute(f"INSERT INTO operators (operator_name) VALUES ({escaped}) ON CONFLICT(operator_name) DO NOTHING")
    result = d1_execute(f"SELECT id FROM operators WHERE operator_name = {escaped}")
    if result and len(result) > 0:
        return result[0]["id"]
    return None


# ─── STEP 2: UPSERT WELL ──────────────────────────────────────────────

def upsert_well(well_name: str, operator_id: int) -> Optional[int]:
    """Insert well if not exists (keyed on well_name + operator_id), return well_id."""
    escaped_name = sql_str(well_name)
    # Check if exists first
    result = d1_execute(
        f"SELECT id FROM wells WHERE well_name = {escaped_name} AND operator_id = {operator_id}"
    )
    if result and len(result) > 0:
        return result[0]["id"]

    # Insert new well
    d1_execute(
        f"INSERT INTO wells (well_name, operator_id, state) VALUES ({escaped_name}, {operator_id}, 'TX')"
    )
    result = d1_execute(
        f"SELECT id FROM wells WHERE well_name = {escaped_name} AND operator_id = {operator_id}"
    )
    if result and len(result) > 0:
        return result[0]["id"]
    return None


# ─── STEP 3: INSERT SAMPLE ────────────────────────────────────────────

def insert_sample(
    well_id: int,
    lab_id: int,
    sample_date: str,
    report_date: Optional[str],
    lab_id_number: str,
    sample_point: str,
    pdf_filename: str,
    ion_balance_pct: Optional[float],
    tds_measured: Optional[float],
) -> Optional[int]:
    """Insert a sample record. Returns sample_id or None if duplicate."""
    # Convert date format from MM-DD-YYYY to YYYY-MM-DD for proper sorting
    iso_sample_date = convert_date(sample_date) if sample_date else None
    iso_report_date = convert_date(report_date) if report_date else None

    sql = (
        f"INSERT INTO samples "
        f"(well_id, lab_id, sample_date, report_date, lab_id_number, sample_point, "
        f"pdf_filename, validation_status, ion_balance_pct, tds_measured) "
        f"VALUES ({well_id}, {lab_id}, {sql_str(iso_sample_date)}, {sql_str(iso_report_date)}, "
        f"{sql_str(lab_id_number)}, {sql_str(sample_point)}, {sql_str(pdf_filename)}, "
        f"'validated', {sql_str(ion_balance_pct)}, {sql_str(tds_measured)})"
    )
    d1_execute(sql)

    # Retrieve the inserted sample ID
    result = d1_execute(
        f"SELECT id FROM samples WHERE well_id = {well_id} "
        f"AND sample_date = {sql_str(iso_sample_date)} "
        f"AND lab_id_number = {sql_str(lab_id_number)}"
    )
    if result and len(result) > 0:
        return result[0]["id"]

    # Fallback: get most recent sample for this well
    result = d1_execute(
        f"SELECT id FROM samples WHERE well_id = {well_id} ORDER BY id DESC LIMIT 1"
    )
    if result and len(result) > 0:
        return result[0]["id"]
    return None


# ─── STEP 4: INSERT ION READINGS ──────────────────────────────────────

def insert_ion_readings(sample_id: int, chem: dict, cation_meq: float, anion_meq: float, ion_balance: float) -> bool:
    """Insert all ion readings as a single wide row."""
    sql = (
        f"INSERT INTO ion_readings ("
        f"sample_id, calcium, magnesium, barium, strontium, sodium, potassium, iron, manganese, "
        f"chloride, sulfate, dissolved_co2, bicarbonate, h2s, "
        f"temperature_f, sample_ph, conductivity, tds, resistivity, specific_gravity, "
        f"cation_meq_total, anion_meq_total, ion_balance_pct"
        f") VALUES ("
        f"{sample_id}, "
        f"{sql_str(chem.get('calcium_ca'))}, "
        f"{sql_str(chem.get('magnesium_mg'))}, "
        f"{sql_str(chem.get('barium_ba'))}, "
        f"{sql_str(chem.get('strontium_sr'))}, "
        f"{sql_str(chem.get('sodium_na'))}, "
        f"{sql_str(chem.get('potassium_k'))}, "
        f"{sql_str(chem.get('iron_fe'))}, "
        f"{sql_str(chem.get('manganese_mn'))}, "
        f"{sql_str(chem.get('chloride_cl'))}, "
        f"{sql_str(chem.get('sulfate_so4'))}, "
        f"{sql_str(chem.get('dissolved_co2'))}, "
        f"{sql_str(chem.get('bicarbonate_hco3'))}, "
        f"{sql_str(chem.get('h2s'))}, "
        f"{sql_str(chem.get('temperature_f'))}, "
        f"{sql_str(chem.get('sample_ph'))}, "
        f"{sql_str(chem.get('conductivity'))}, "
        f"{sql_str(chem.get('tds'))}, "
        f"{sql_str(chem.get('resistivity'))}, "
        f"{sql_str(chem.get('specific_gravity'))}, "
        f"{sql_str(cation_meq)}, "
        f"{sql_str(anion_meq)}, "
        f"{sql_str(ion_balance)}"
        f")"
    )
    result = d1_execute(sql)
    return result is not None


# ─── STEP 5: INSERT SCALE POTENTIAL ────────────────────────────────────

def insert_scale_potential(sample_id: int, scale_rows: list) -> int:
    """Insert scale/corrosion temperature sweep rows. Returns count of rows inserted."""
    count = 0
    for row in scale_rows:
        sql = (
            f"INSERT INTO scale_potential ("
            f"sample_id, temperature_f, "
            f"calcite_xsat, gypsum_xsat, anhydrite_xsat, barite_xsat, celestite_xsat, siderite_xsat, "
            f"calcite_lbs, gypsum_lbs, anhydrite_lbs, barite_lbs, celestite_lbs, siderite_lbs, "
            f"co2_corrosion_mpy, pco2"
            f") VALUES ("
            f"{sample_id}, {sql_str(row.get('temperature_f'))}, "
            f"{sql_str(row.get('calcite_xsat'))}, "
            f"{sql_str(row.get('gypsum_xsat'))}, "
            f"{sql_str(row.get('anhydrite_xsat'))}, "
            f"{sql_str(row.get('barite_xsat'))}, "
            f"{sql_str(row.get('celestite_xsat'))}, "
            f"{sql_str(row.get('siderite_xsat'))}, "
            f"{sql_str(row.get('calcite_lbs1000'))}, "
            f"{sql_str(row.get('gypsum_lbs1000'))}, "
            f"{sql_str(row.get('anhydrite_lbs1000'))}, "
            f"{sql_str(row.get('barite_lbs1000'))}, "
            f"{sql_str(row.get('celestite_lbs1000'))}, "
            f"{sql_str(row.get('siderite_lbs1000'))}, "
            f"{sql_str(row.get('co2_mpy'))}, "
            f"{sql_str(row.get('pco2_atm'))}"
            f") ON CONFLICT(sample_id, temperature_f) DO NOTHING"
        )
        result = d1_execute(sql)
        if result is not None:
            count += 1
    return count


# ─── STEP 6: VARIANCE DETECTION ───────────────────────────────────────

def run_variance_detection(sample_id: int, well_id: int, chem: dict) -> int:
    """Run variance detection rules against the sample's ion readings.

    Returns count of alerts generated.
    """
    alert_count = 0

    # Map parser field names to ion names used in variance rules
    parser_to_ion = {
        "barium": "barium_ba",
        "iron": "iron_fe",
        "h2s": "h2s",
        "calcium": "calcium_ca",
        "chloride": "chloride_cl",
        "tds": "tds",
        "sample_ph": "sample_ph",
        "sulfate": "sulfate_so4",
        "manganese": "manganese_mn",
        "strontium": "strontium_sr",
        "sodium": "sodium_na",
        "magnesium": "magnesium_mg",
    }

    for rule in VARIANCE_RULES:
        ion_name = rule["ion"]
        parser_key = parser_to_ion.get(ion_name, ion_name)
        value = chem.get(parser_key)
        if value is None:
            continue

        severity = None
        message = None

        # Critical above threshold
        if rule.get("critical_above") and value > rule["critical_above"]:
            severity = "critical"
            message = f"{ion_name} = {value} mg/L exceeds critical threshold of {rule['critical_above']}"
        # Warning above threshold
        elif rule.get("warning_above") and value > rule["warning_above"]:
            severity = "warning"
            message = f"{ion_name} = {value} mg/L exceeds warning threshold of {rule['warning_above']}"
        # Warning below threshold
        elif rule.get("warning_below") and value < rule["warning_below"]:
            severity = "warning"
            message = f"{ion_name} = {value} mg/L below warning threshold of {rule['warning_below']}"
        # Critical outside range
        elif rule.get("critical_outside"):
            if value < rule["low"] or value > rule["high"]:
                severity = "critical"
                message = f"{ion_name} = {value} outside critical range [{rule['low']}, {rule['high']}]"
        # General range check
        elif not rule.get("info_only"):
            if value < rule["low"] or value > rule["high"]:
                severity = "warning"
                message = f"{ion_name} = {value} mg/L outside expected range [{rule['low']}, {rule['high']}]"

        if severity and message:
            sql = (
                f"INSERT INTO variance_alerts "
                f"(sample_id, well_id, rule_id, ion_name, severity, current_value, message) "
                f"VALUES ({sample_id}, {well_id}, {sql_str(rule['id'])}, {sql_str(ion_name)}, "
                f"{sql_str(severity)}, {sql_str(value)}, {sql_str(message)})"
            )
            d1_execute(sql)
            alert_count += 1

    # Composite rules
    barium_val = chem.get("barium_ba")
    sulfate_val = chem.get("sulfate_so4")
    if barium_val and sulfate_val and barium_val > 50 and sulfate_val > 100:
        d1_execute(
            f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
            f"current_value, expected_value, message) VALUES ({sample_id}, {well_id}, "
            f"'COMP-001', 'barium+sulfate', 'critical', {barium_val}, NULL, "
            f"'BaSO4 barite scale risk: Ba={barium_val} SO4={sulfate_val}')"
        )
        alert_count += 1

    calcium_val = chem.get("calcium_ca")
    bicarb_val = chem.get("bicarbonate_hco3")
    if calcium_val and bicarb_val and calcium_val > 5000 and bicarb_val > 500:
        d1_execute(
            f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
            f"current_value, expected_value, message) VALUES ({sample_id}, {well_id}, "
            f"'COMP-002', 'calcium+bicarbonate', 'warning', {calcium_val}, NULL, "
            f"'CaCO3 calcite scale risk: Ca={calcium_val} HCO3={bicarb_val}')"
        )
        alert_count += 1

    ion_balance = chem.get("_ion_balance_pct")
    if ion_balance is not None:
        if abs(ion_balance) > 10:
            d1_execute(
                f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
                f"current_value, message) VALUES ({sample_id}, {well_id}, "
                f"'COMP-003', 'ion_balance', 'critical', {ion_balance}, "
                f"'Ion balance {ion_balance}% exceeds 10% critical threshold')"
            )
            alert_count += 1
        elif abs(ion_balance) > 5:
            d1_execute(
                f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
                f"current_value, message) VALUES ({sample_id}, {well_id}, "
                f"'COMP-003', 'ion_balance', 'warning', {ion_balance}, "
                f"'Ion balance {ion_balance}% exceeds 5% warning threshold')"
            )
            alert_count += 1

    tds_val = chem.get("tds")
    cond_val = chem.get("conductivity")
    if tds_val and cond_val and cond_val > 0:
        ratio = tds_val / cond_val
        if ratio < 0.55 or ratio > 0.75:
            d1_execute(
                f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
                f"current_value, expected_value, message) VALUES ({sample_id}, {well_id}, "
                f"'COMP-004', 'tds_conductivity_ratio', 'warning', {round(ratio, 4)}, 0.65, "
                f"'TDS/Conductivity ratio {round(ratio, 4)} outside normal range [0.55, 0.75]')"
            )
            alert_count += 1

    sg_val = chem.get("specific_gravity")
    if sg_val and tds_val:
        expected_sg = 1.0 + (tds_val * 0.7e-6)
        if sg_val < expected_sg:
            d1_execute(
                f"INSERT INTO variance_alerts (sample_id, well_id, rule_id, ion_name, severity, "
                f"current_value, expected_value, message) VALUES ({sample_id}, {well_id}, "
                f"'COMP-005', 'specific_gravity', 'warning', {sg_val}, {round(expected_sg, 4)}, "
                f"'SpGr {sg_val} lower than expected {round(expected_sg, 4)} based on TDS {tds_val}')"
            )
            alert_count += 1

    return alert_count


# ─── STEP 7: UPDATE WELL STATISTICS ───────────────────────────────────

def update_well_statistics(well_id: int, chem: dict):
    """Recalculate rolling statistics for each ion for this well.

    For the initial load with 1 sample per well, stddev will be 0.
    """
    ion_columns = {
        "calcium": "calcium",
        "magnesium": "magnesium",
        "barium": "barium",
        "strontium": "strontium",
        "sodium": "sodium",
        "potassium": "potassium",
        "iron": "iron",
        "manganese": "manganese",
        "chloride": "chloride",
        "sulfate": "sulfate",
        "bicarbonate": "bicarbonate",
        "dissolved_co2": "dissolved_co2",
        "h2s": "h2s",
        "tds": "tds",
        "sample_ph": "sample_ph",
    }

    for ion_name, col_name in ion_columns.items():
        # Calculate stats from all samples for this well
        stats_sql = (
            f"SELECT COUNT(*) as cnt, AVG(ir.{col_name}) as mean_val, "
            f"MIN(ir.{col_name}) as min_val, MAX(ir.{col_name}) as max_val "
            f"FROM ion_readings ir JOIN samples s ON ir.sample_id = s.id "
            f"WHERE s.well_id = {well_id} AND ir.{col_name} IS NOT NULL"
        )
        stats = d1_execute(stats_sql)
        if not stats or len(stats) == 0 or stats[0].get("cnt", 0) == 0:
            continue

        cnt = stats[0]["cnt"]
        mean_val = stats[0]["mean_val"]
        min_val = stats[0]["min_val"]
        max_val = stats[0]["max_val"]

        # Calculate stddev (SQLite doesn't have STDDEV built in)
        stddev = 0.0
        if cnt > 1:
            var_sql = (
                f"SELECT AVG((ir.{col_name} - {mean_val}) * (ir.{col_name} - {mean_val})) as variance "
                f"FROM ion_readings ir JOIN samples s ON ir.sample_id = s.id "
                f"WHERE s.well_id = {well_id} AND ir.{col_name} IS NOT NULL"
            )
            var_result = d1_execute(var_sql)
            if var_result and len(var_result) > 0 and var_result[0].get("variance") is not None:
                stddev = math.sqrt(var_result[0]["variance"])

        # Upsert into well_statistics
        d1_execute(
            f"INSERT INTO well_statistics (well_id, ion_name, sample_count, mean_value, stddev_value, min_value, max_value, last_calculated) "
            f"VALUES ({well_id}, {sql_str(ion_name)}, {cnt}, {round(mean_val, 4)}, {round(stddev, 4)}, "
            f"{sql_str(min_val)}, {sql_str(max_val)}, datetime('now')) "
            f"ON CONFLICT(well_id, ion_name) DO UPDATE SET "
            f"sample_count = {cnt}, mean_value = {round(mean_val, 4)}, stddev_value = {round(stddev, 4)}, "
            f"min_value = {sql_str(min_val)}, max_value = {sql_str(max_val)}, last_calculated = datetime('now')"
        )


# ─── HELPER: DATE CONVERSION ──────────────────────────────────────────

def convert_date(date_str: str) -> Optional[str]:
    """Convert MM-DD-YYYY to YYYY-MM-DD for proper ISO sorting in D1."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%m-%d-%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return date_str  # Return as-is if format doesn't match


# ─── HELPER: FIND DOWNHOLE SAT PDFs ───────────────────────────────────

def find_pdf_files(pdf_dirs: list[str]) -> list[Path]:
    """Find all PDF files across the specified directories.

    Looks in jbfiles first, then falls back to Downloads for
    any files with 'Discovery', 'CWA', 'DownHole', 'SAT',
    'Wellhead', 'Separator', 'Flowline' in the name.
    """
    pdfs = []
    seen = set()

    for dir_path in pdf_dirs:
        p = Path(dir_path)
        if not p.exists():
            continue

        for f in p.iterdir():
            if not f.suffix.lower() == ".pdf":
                continue
            if f.name in seen:
                continue

            # In jbfiles dir, take ALL PDFs (they should all be water analysis)
            if "jbfiles" in str(dir_path).lower():
                pdfs.append(f)
                seen.add(f.name)
                continue

            # In other dirs, filter by keywords
            name_lower = f.name.lower()
            keywords = ["discovery", "cwa", "downhole", "sat", "wellhead",
                        "separator", "flowline", "tank battery", "water analysis",
                        "performance chemical"]
            if any(kw in name_lower for kw in keywords):
                pdfs.append(f)
                seen.add(f.name)

    return sorted(pdfs)


# ─── GET LAB ID ────────────────────────────────────────────────────────

def get_lab_id(source_format: str) -> int:
    """Return the lab ID based on the detected source format."""
    result = d1_execute("SELECT id FROM labs WHERE lab_code = 'DHSAT'")
    if result and len(result) > 0:
        return result[0]["id"]
    # Fallback: lab 1
    return 1


# ─── MAIN PROCESS ─────────────────────────────────────────────────────

def process_single_pdf(pdf_path: Path, parser_module, lab_id: int) -> dict:
    """Process a single PDF through the full 7-step insertion pipeline.

    Returns a dict with processing results.
    """
    result = {
        "file": pdf_path.name,
        "success": False,
        "operator": None,
        "well_name": None,
        "sample_date": None,
        "sample_id": None,
        "ion_readings_ok": False,
        "scale_rows": 0,
        "alerts": 0,
        "errors": [],
        "warnings": [],
    }

    # Parse PDF
    try:
        parsed = parser_module.parse_downhole_sat_pdf(str(pdf_path))
        parsed_dict = parser_module.result_to_dict(parsed)
    except Exception as e:
        result["errors"].append(f"Parser failed: {e}")
        return result

    sys_id = parsed_dict["system_identification"]
    chem = parsed_dict["water_chemistry"]
    scale_data = parsed_dict["scale_corrosion_data"]
    validation = parsed_dict["validation"]

    result["operator"] = sys_id.get("operator", "Unknown")
    result["well_name"] = sys_id.get("well_name", "Unknown")
    result["sample_date"] = sys_id.get("sample_date")
    result["warnings"] = validation.get("warnings", [])

    if not result["operator"] or result["operator"] == "Unknown":
        result["errors"].append("Could not extract operator name from PDF")
        return result

    if not result["well_name"] or result["well_name"] == "Unknown":
        result["errors"].append("Could not extract well name from PDF")
        return result

    # Calculate ion balance
    cation_meq, anion_meq, ion_balance = calculate_ion_balance(chem)
    # Store for variance detection
    chem["_ion_balance_pct"] = ion_balance

    # ── STEP 1: Upsert operator ──
    print(f"  [1/7] Upserting operator: {result['operator']}")
    operator_id = upsert_operator(result["operator"])
    if operator_id is None:
        result["errors"].append("Failed to upsert operator")
        return result

    # ── STEP 2: Upsert well ──
    print(f"  [2/7] Upserting well: {result['well_name']}")
    well_id = upsert_well(result["well_name"], operator_id)
    if well_id is None:
        result["errors"].append("Failed to upsert well")
        return result

    # ── STEP 3: Insert sample ──
    print(f"  [3/7] Inserting sample (date: {result['sample_date']})")
    sample_id = insert_sample(
        well_id=well_id,
        lab_id=lab_id,
        sample_date=sys_id.get("sample_date", ""),
        report_date=sys_id.get("report_date"),
        lab_id_number=sys_id.get("sample_id", ""),
        sample_point=sys_id.get("sample_point", ""),
        pdf_filename=pdf_path.name,
        ion_balance_pct=ion_balance,
        tds_measured=chem.get("tds"),
    )
    if sample_id is None:
        result["errors"].append("Failed to insert sample (may be duplicate)")
        return result
    result["sample_id"] = sample_id

    # ── STEP 4: Insert ion readings ──
    print(f"  [4/7] Inserting ion readings (sample_id={sample_id})")
    ions_ok = insert_ion_readings(sample_id, chem, cation_meq or 0, anion_meq or 0, ion_balance or 0)
    result["ion_readings_ok"] = ions_ok

    # ── STEP 5: Insert scale potential ──
    print(f"  [5/7] Inserting {len(scale_data)} scale potential rows")
    scale_count = insert_scale_potential(sample_id, scale_data)
    result["scale_rows"] = scale_count

    # ── STEP 6: Run variance detection ──
    print(f"  [6/7] Running variance detection")
    alert_count = run_variance_detection(sample_id, well_id, chem)
    result["alerts"] = alert_count

    # ── STEP 7: Update well statistics ──
    print(f"  [7/7] Updating well statistics")
    update_well_statistics(well_id, chem)

    result["success"] = True
    return result


def main():
    """Main entry point: find PDFs, parse them, load into D1."""
    import argparse

    arg_parser = argparse.ArgumentParser(description="Bulk load water analysis PDFs into D1")
    arg_parser.add_argument("--pdf-dir", type=str, help="Directory containing PDF files")
    arg_parser.add_argument("--single", type=str, help="Process a single PDF file")
    arg_parser.add_argument("--dry-run", action="store_true", help="Parse only, don't insert into D1")
    args = arg_parser.parse_args()

    print("=" * 70)
    print("PERMIAN PULSE — Bulk PDF Loader for D1")
    print(f"Database: {D1_DATABASE_NAME} ({D1_DATABASE_ID})")
    print(f"Started:  {datetime.now().isoformat()}")
    print("=" * 70)

    # Load parser
    print("\nLoading DownHole SAT parser...")
    parser_module = load_parser()
    print("  Parser loaded successfully.")

    # Get lab ID for DownHole SAT
    lab_id = get_lab_id("downhole_sat")
    print(f"  Lab ID (DownHole SAT): {lab_id}")

    # Find PDFs
    if args.single:
        pdf_files = [Path(args.single)]
        if not pdf_files[0].exists():
            print(f"\nERROR: File not found: {args.single}")
            sys.exit(1)
    else:
        pdf_dirs = [args.pdf_dir] if args.pdf_dir else DEFAULT_PDF_DIRS
        print(f"\nSearching for PDFs in: {pdf_dirs}")
        pdf_files = find_pdf_files(pdf_dirs)

    if not pdf_files:
        print("\nNo PDF files found. Nothing to load.")
        sys.exit(0)

    print(f"\nFound {len(pdf_files)} PDF file(s) to process:")
    for i, f in enumerate(pdf_files, 1):
        print(f"  {i:3d}. {f.name}")

    # Process each PDF
    results = []
    success_count = 0
    fail_count = 0
    total_scale_rows = 0
    total_alerts = 0

    for i, pdf_path in enumerate(pdf_files, 1):
        print(f"\n{'─' * 60}")
        print(f"[{i}/{len(pdf_files)}] Processing: {pdf_path.name}")
        print(f"{'─' * 60}")

        if args.dry_run:
            try:
                parsed = parser_module.parse_downhole_sat_pdf(str(pdf_path))
                d = parser_module.result_to_dict(parsed)
                print(f"  Operator:     {d['system_identification']['operator']}")
                print(f"  Well:         {d['system_identification']['well_name']}")
                print(f"  Sample Date:  {d['system_identification']['sample_date']}")
                print(f"  Scale Rows:   {d['validation']['scale_rows_extracted']}")
                print(f"  Ion Balance:  {d['validation']['ion_balance_pct']}%")
                print(f"  Warnings:     {len(d['validation']['warnings'])}")
                results.append({"file": pdf_path.name, "success": True})
                success_count += 1
            except Exception as e:
                print(f"  PARSE ERROR: {e}")
                results.append({"file": pdf_path.name, "success": False, "errors": [str(e)]})
                fail_count += 1
            continue

        result = process_single_pdf(pdf_path, parser_module, lab_id)
        results.append(result)

        if result["success"]:
            success_count += 1
            total_scale_rows += result["scale_rows"]
            total_alerts += result["alerts"]
            print(f"\n  SUCCESS: {result['well_name']} | sample_id={result['sample_id']} | "
                  f"{result['scale_rows']} scale rows | {result['alerts']} alerts")
        else:
            fail_count += 1
            print(f"\n  FAILED: {', '.join(result['errors'])}")

        if result["warnings"]:
            for w in result["warnings"]:
                print(f"  WARNING: {w}")

    # ─── SUMMARY ──────────────────────────────────────────────────────
    print(f"\n{'=' * 70}")
    print("LOAD COMPLETE — SUMMARY")
    print(f"{'=' * 70}")
    print(f"  PDFs processed:   {len(pdf_files)}")
    print(f"  Successful:       {success_count}")
    print(f"  Failed:           {fail_count}")
    print(f"  Scale rows:       {total_scale_rows}")
    print(f"  Variance alerts:  {total_alerts}")
    print(f"  Completed:        {datetime.now().isoformat()}")

    if fail_count > 0:
        print(f"\n  FAILURES:")
        for r in results:
            if not r.get("success"):
                print(f"    - {r['file']}: {', '.join(r.get('errors', ['unknown']))}")

    # ─── VERIFY COUNTS ────────────────────────────────────────────────
    if not args.dry_run:
        print(f"\n{'─' * 40}")
        print("VERIFICATION — D1 Table Counts:")
        for table in ["operators", "wells", "samples", "ion_readings", "scale_potential", "well_statistics", "variance_alerts"]:
            count_result = d1_execute(f"SELECT COUNT(*) as cnt FROM {table}")
            cnt = count_result[0]["cnt"] if count_result and len(count_result) > 0 else "?"
            print(f"  {table:20s} : {cnt}")

    print(f"\nDone.")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
