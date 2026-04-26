"""
Sprint 25 P0.2 — verifică cele 14 chei REC_* nou-declanșate în compute_checkbox_keys:
REC_SARPANTA, REC_SHADING, REC_HEAT_PIPES, REC_DHW_PIPES, REC_HEAT_INSULATE,
REC_DHW_INSULATE, REC_BAL_VALVES, REC_AIR_QUALITY, REC_FLOW_METERS,
REC_HEAT_METERS, REC_LOW_FLOW, REC_DHW_RECIRC, REC_HEAT_EQUIP, REC_VENT_EQUIP.

Rulare:
  python -m pytest api/_tests/test_compute_checkbox_keys_s25.py -v
"""
import importlib.util
import sys
import unittest
from pathlib import Path

API_DIR = Path(__file__).resolve().parent.parent
MODULE_PATH = API_DIR / "generate-document.py"
_spec = importlib.util.spec_from_file_location("generate_document_s25", MODULE_PATH)
gd = importlib.util.module_from_spec(_spec)
sys.modules["generate_document_s25"] = gd
_spec.loader.exec_module(gd)


def base_data():
    return {
        "opaque_u_values": "[]",
        "glazing_max_u": "0",
        "ventilation_type": "natural_org",
        "heating_source": "gaz_conv",
        "heating_control": "auto",
        "lighting_type": "led",
        "lighting_control": "sensor_presence",
        "solar_thermal_enabled": "true",
        "pv_enabled": "true",
        "year_built": "1985",
        "acm_source": "ct_prop",
        "cooling_has": "false",
        "heat_pump_enabled": "false",
        "biomass_enabled": "false",
        "wind_enabled": "false",
    }


class TestRECSarpanta(unittest.TestCase):
    def test_mansardă_în_structure_marks_REC_SARPANTA(self):
        d = base_data()
        d["structure"] = "Cadre beton armat cu acoperis tip mansarda"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_SARPANTA", keys)

    def test_attic_heated_flag_marks_REC_SARPANTA(self):
        d = base_data()
        d["attic_heated"] = "true"
        keys = gd.compute_checkbox_keys(d, "RI")
        self.assertIn("REC_SARPANTA", keys)

    def test_no_attic_does_not_mark(self):
        keys = gd.compute_checkbox_keys(base_data(), "RC")
        self.assertNotIn("REC_SARPANTA", keys)


class TestRECShading(unittest.TestCase):
    def test_high_shading_factor_marks(self):
        d = base_data()
        d["shading_factor"] = "0.95"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_SHADING", keys)

    def test_low_shading_factor_skips(self):
        d = base_data()
        d["shading_factor"] = "0.50"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_SHADING", keys)

    def test_default_shading_1_0_marks(self):
        # Fără date → fallback 1.0 → > 0.85 → declanșat
        keys = gd.compute_checkbox_keys(base_data(), "RC")
        self.assertIn("REC_SHADING", keys)


class TestRECHeatPipes(unittest.TestCase):
    def test_old_heating_pipes_marks(self):
        d = base_data()
        d["heating_year_installed"] = "1985"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_PIPES", keys)

    def test_modern_heating_skips(self):
        d = base_data()
        d["heating_year_installed"] = "2015"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_HEAT_PIPES", keys)

    def test_electric_heating_no_pipes(self):
        d = base_data()
        d["heating_year_installed"] = "1985"
        d["heating_source"] = "electric_direct"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_HEAT_PIPES", keys)


class TestRECDhwPipes(unittest.TestCase):
    def test_old_acm_pipes_marks(self):
        d = base_data()
        d["acm_year_installed"] = "1985"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_DHW_PIPES", keys)

    def test_no_acm_source_skips(self):
        d = base_data()
        d["acm_source"] = ""
        d["acm_year_installed"] = "1985"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_DHW_PIPES", keys)


class TestRECHeatDhwInsulate(unittest.TestCase):
    def test_uninsulated_heating_pipes_marks(self):
        d = base_data()
        d["heating_pipe_insulated"] = "no"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_INSULATE", keys)

    def test_partial_insulation_marks(self):
        d = base_data()
        d["heating_pipe_insulated"] = "partial"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_INSULATE", keys)

    def test_uninsulated_acm_pipes_marks(self):
        d = base_data()
        d["acm_pipe_insulated"] = "no"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_DHW_INSULATE", keys)


class TestRECBalValves(unittest.TestCase):
    def test_block_without_balancing_marks(self):
        d = base_data()
        d["heating_has_balancing_valves"] = "false"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_BAL_VALVES", keys)

    def test_block_with_balancing_skips(self):
        d = base_data()
        d["heating_has_balancing_valves"] = "true"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_BAL_VALVES", keys)

    def test_individual_house_skips(self):
        d = base_data()
        d["heating_has_balancing_valves"] = "false"
        keys = gd.compute_checkbox_keys(d, "RI")  # nu e bloc
        self.assertNotIn("REC_BAL_VALVES", keys)


class TestRECAirQuality(unittest.TestCase):
    def test_high_co2_marks(self):
        d = base_data()
        d["co2_max_ppm"] = "1500"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_AIR_QUALITY", keys)

    def test_natural_neorganic_vent_marks(self):
        d = base_data()
        d["ventilation_type"] = "natural_neorg"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_AIR_QUALITY", keys)

    def test_low_co2_organic_vent_skips(self):
        keys = gd.compute_checkbox_keys(base_data(), "RC")
        self.assertNotIn("REC_AIR_QUALITY", keys)


class TestRECMeters(unittest.TestCase):
    def test_no_acm_meter_marks_FLOW_METERS(self):
        d = base_data()
        d["acm_has_meter"] = "no"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_FLOW_METERS", keys)

    def test_no_heating_meter_marks_HEAT_METERS(self):
        d = base_data()
        d["heating_has_meter"] = "no"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_METERS", keys)


class TestRECLowFlow(unittest.TestCase):
    def test_no_low_flow_fixtures_marks(self):
        d = base_data()
        d["acm_fixtures_low_flow"] = "false"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_LOW_FLOW", keys)

    def test_with_low_flow_skips(self):
        d = base_data()
        d["acm_fixtures_low_flow"] = "true"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_LOW_FLOW", keys)


class TestRECDhwRecirc(unittest.TestCase):
    def test_block_acm_no_recirc_marks(self):
        d = base_data()
        d["acm_recirculation"] = "absentă"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_DHW_RECIRC", keys)

    def test_block_acm_functional_recirc_skips(self):
        d = base_data()
        d["acm_recirculation"] = "functioneaza"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_DHW_RECIRC", keys)

    def test_individual_house_skips(self):
        d = base_data()
        d["acm_recirculation"] = "absentă"
        keys = gd.compute_checkbox_keys(d, "RI")
        self.assertNotIn("REC_DHW_RECIRC", keys)


class TestRECHeatEquip(unittest.TestCase):
    def test_low_efficiency_marks(self):
        d = base_data()
        d["heating_eta_gen"] = "0.75"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_EQUIP", keys)

    def test_old_heating_marks(self):
        d = base_data()
        d["heating_eta_gen"] = "0.92"
        d["heating_year_installed"] = "1995"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_HEAT_EQUIP", keys)

    def test_modern_efficient_skips(self):
        d = base_data()
        d["heating_eta_gen"] = "0.95"
        d["heating_year_installed"] = "2018"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_HEAT_EQUIP", keys)


class TestRECVentEquip(unittest.TestCase):
    def test_old_vent_marks(self):
        d = base_data()
        d["ventilation_type"] = "mechanical"
        d["ventilation_year_installed"] = "2005"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertIn("REC_VENT_EQUIP", keys)

    def test_modern_vent_skips(self):
        d = base_data()
        d["ventilation_type"] = "mechanical_hr"
        d["ventilation_year_installed"] = "2020"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_VENT_EQUIP", keys)

    def test_no_mechanical_vent_skips(self):
        d = base_data()
        d["ventilation_type"] = "natural_org"
        d["ventilation_year_installed"] = "2005"
        keys = gd.compute_checkbox_keys(d, "RC")
        self.assertNotIn("REC_VENT_EQUIP", keys)


class TestAllSPRINT25KeysCount(unittest.TestCase):
    """Verifică că toate 14 chei pot fi declanșate în condiții extreme."""

    def test_worst_case_block_triggers_most_REC_keys(self):
        """Bloc rezidențial cu condiții pesimiste → max recomandări."""
        d = {
            **base_data(),
            "structure": "bloc cu mansardă peste ultim nivel",
            "shading_factor": "1.0",
            "heating_year_installed": "1980",
            "acm_year_installed": "1980",
            "heating_pipe_insulated": "no",
            "acm_pipe_insulated": "no",
            "heating_has_balancing_valves": "false",
            "co2_max_ppm": "1500",
            "acm_has_meter": "no",
            "heating_has_meter": "no",
            "acm_fixtures_low_flow": "false",
            "acm_recirculation": "absentă",
            "heating_eta_gen": "0.70",
            "ventilation_type": "natural_neorg",
            "ventilation_year_installed": "2005",
        }
        keys = gd.compute_checkbox_keys(d, "RC")
        s25_keys = {
            "REC_SARPANTA", "REC_SHADING", "REC_HEAT_PIPES", "REC_DHW_PIPES",
            "REC_HEAT_INSULATE", "REC_DHW_INSULATE", "REC_BAL_VALVES",
            "REC_AIR_QUALITY", "REC_FLOW_METERS", "REC_HEAT_METERS",
            "REC_LOW_FLOW", "REC_DHW_RECIRC", "REC_HEAT_EQUIP",
            # REC_VENT_EQUIP nu se declanșează aici (vent natural_neorg → has_vent=False)
        }
        for k in s25_keys:
            self.assertIn(k, keys, f"{k} ar trebui declanșată în worst-case bloc")


if __name__ == "__main__":
    unittest.main()
