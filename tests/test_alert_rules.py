from src.services.alert_rules import AlertRule, WeatherReading, evaluate_alerts


def test_evaluate_alerts_returns_matching_rules_by_severity():
    reading = WeatherReading(
        location="Harare",
        temperature_c=33.5,
        wind_kph=42,
        rainfall_mm=0,
        observed_at="2026-06-28T10:00:00Z",
    )
    rules = [
        AlertRule("Heat watch", "temperature_c", ">=", 32, "warning"),
        AlertRule("High wind", "wind_kph", ">=", 40, "critical"),
        AlertRule("Rain delay", "rainfall_mm", ">", 5, "info"),
    ]

    alerts = evaluate_alerts(reading, rules)

    assert [alert["rule"] for alert in alerts] == ["High wind", "Heat watch"]
    assert alerts[0]["actual"] == 42
