"""
Extended tests for src/services/alert_rules.py

Covers:
- All six comparison operators
- Boundary (exact-threshold) behaviour
- Multiple rules with no matches
- Rules whose metric is absent on the reading (ValueError)
- Unsupported operator (ValueError)
- Severity sort order correctness
- evaluate_alerts with an empty rules list
"""
import pytest
from src.services.alert_rules import AlertRule, WeatherReading, evaluate_alerts, matches_rule


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _reading(temperature_c=20.0, wind_kph=20.0, rainfall_mm=0.0):
    return WeatherReading(
        location="Test City",
        temperature_c=temperature_c,
        wind_kph=wind_kph,
        rainfall_mm=rainfall_mm,
        observed_at="2026-11-09T12:00:00Z",
    )


# ---------------------------------------------------------------------------
# matches_rule — operator coverage
# ---------------------------------------------------------------------------

class TestMatchesRule:
    def test_gte_true_above(self):
        assert matches_rule(_reading(temperature_c=35), AlertRule("Hot", "temperature_c", ">=", 35, "warning")) is True

    def test_gte_true_equal(self):
        assert matches_rule(_reading(temperature_c=35), AlertRule("Hot", "temperature_c", ">=", 35, "warning")) is True

    def test_gte_false_below(self):
        assert matches_rule(_reading(temperature_c=34.9), AlertRule("Hot", "temperature_c", ">=", 35, "warning")) is False

    def test_gt_true(self):
        assert matches_rule(_reading(rainfall_mm=5.1), AlertRule("Rain", "rainfall_mm", ">", 5, "info")) is True

    def test_gt_false_equal(self):
        # Strictly greater-than: equal value must NOT match.
        assert matches_rule(_reading(rainfall_mm=5.0), AlertRule("Rain", "rainfall_mm", ">", 5, "info")) is False

    def test_lte_true_equal(self):
        assert matches_rule(_reading(temperature_c=0), AlertRule("Freeze", "temperature_c", "<=", 0, "critical")) is True

    def test_lte_true_below(self):
        assert matches_rule(_reading(temperature_c=-5), AlertRule("Freeze", "temperature_c", "<=", 0, "critical")) is True

    def test_lte_false_above(self):
        assert matches_rule(_reading(temperature_c=1), AlertRule("Freeze", "temperature_c", "<=", 0, "critical")) is False

    def test_lt_true(self):
        assert matches_rule(_reading(temperature_c=-0.1), AlertRule("NearFreeze", "temperature_c", "<", 0, "warning")) is True

    def test_lt_false_equal(self):
        assert matches_rule(_reading(temperature_c=0), AlertRule("NearFreeze", "temperature_c", "<", 0, "warning")) is False

    def test_eq_true(self):
        assert matches_rule(_reading(wind_kph=100), AlertRule("ExactWind", "wind_kph", "==", 100, "critical")) is True

    def test_eq_false(self):
        assert matches_rule(_reading(wind_kph=99), AlertRule("ExactWind", "wind_kph", "==", 100, "critical")) is False

    def test_unknown_metric_raises(self):
        with pytest.raises(ValueError, match="unsupported weather metric"):
            matches_rule(_reading(), AlertRule("Bad", "uv_index", ">=", 5, "info"))

    def test_unknown_operator_raises(self):
        with pytest.raises(ValueError, match="unsupported operator"):
            matches_rule(_reading(), AlertRule("Bad", "temperature_c", "!=", 30, "info"))


# ---------------------------------------------------------------------------
# evaluate_alerts — integration behaviour
# ---------------------------------------------------------------------------

class TestEvaluateAlerts:
    def test_no_rules_returns_empty_list(self):
        result = evaluate_alerts(_reading(), [])
        assert result == []

    def test_no_matching_rules_returns_empty_list(self):
        rules = [
            AlertRule("Cold", "temperature_c", "<=", -10, "critical"),
            AlertRule("Calm", "wind_kph", "<=", 5, "info"),
        ]
        result = evaluate_alerts(_reading(temperature_c=20, wind_kph=20), rules)
        assert result == []

    def test_all_rules_match(self):
        rules = [
            AlertRule("Warm", "temperature_c", ">=", 15, "info"),
            AlertRule("Windy", "wind_kph", ">=", 10, "warning"),
        ]
        result = evaluate_alerts(_reading(temperature_c=25, wind_kph=30), rules)
        assert len(result) == 2

    def test_severity_sort_critical_first(self):
        rules = [
            AlertRule("Rain", "rainfall_mm", ">", 0, "info"),
            AlertRule("Hot", "temperature_c", ">=", 20, "warning"),
            AlertRule("Storm", "wind_kph", ">=", 10, "critical"),
        ]
        result = evaluate_alerts(_reading(temperature_c=25, wind_kph=30, rainfall_mm=1), rules)
        severities = [r["severity"] for r in result]
        assert severities == ["critical", "warning", "info"]

    def test_result_contains_actual_value(self):
        rules = [AlertRule("HeatWatch", "temperature_c", ">=", 30, "warning")]
        result = evaluate_alerts(_reading(temperature_c=38.5), rules)
        assert result[0]["actual"] == 38.5

    def test_result_contains_location_and_timestamp(self):
        rules = [AlertRule("Rain", "rainfall_mm", ">", 0, "info")]
        result = evaluate_alerts(_reading(rainfall_mm=2), rules)
        assert result[0]["location"] == "Test City"
        assert result[0]["observed_at"] == "2026-11-09T12:00:00Z"

    def test_exact_threshold_boundary_gte(self):
        """A reading exactly at the GTE threshold must trigger the alert."""
        rules = [AlertRule("ExactBoundary", "wind_kph", ">=", 50, "critical")]
        result = evaluate_alerts(_reading(wind_kph=50.0), rules)
        assert len(result) == 1

    def test_one_below_threshold_does_not_trigger(self):
        rules = [AlertRule("ExactBoundary", "wind_kph", ">=", 50, "critical")]
        result = evaluate_alerts(_reading(wind_kph=49.99), rules)
        assert result == []