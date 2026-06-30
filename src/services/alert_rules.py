from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class WeatherReading:
    location: str
    temperature_c: float
    wind_kph: float
    rainfall_mm: float
    observed_at: str


@dataclass(frozen=True)
class AlertRule:
    name: str
    metric: str
    operator: str
    threshold: float
    severity: str


def matches_rule(reading: WeatherReading, rule: AlertRule) -> bool:
    value = getattr(reading, rule.metric, None)
    if value is None:
        raise ValueError(f"unsupported weather metric: {rule.metric}")

    if rule.operator == ">=":
        return value >= rule.threshold
    if rule.operator == ">":
        return value > rule.threshold
    if rule.operator == "<=":
        return value <= rule.threshold
    if rule.operator == "<":
        return value < rule.threshold
    if rule.operator == "==":
        return value == rule.threshold

    raise ValueError(f"unsupported operator: {rule.operator}")


def evaluate_alerts(reading: WeatherReading, rules: Iterable[AlertRule]) -> list[dict]:
    alerts = []
    for rule in rules:
        if matches_rule(reading, rule):
            alerts.append(
                {
                    "location": reading.location,
                    "observed_at": reading.observed_at,
                    "rule": rule.name,
                    "metric": rule.metric,
                    "threshold": rule.threshold,
                    "severity": rule.severity,
                    "actual": getattr(reading, rule.metric),
                }
            )

    severity_order = {"critical": 0, "warning": 1, "info": 2}
    return sorted(alerts, key=lambda alert: severity_order.get(alert["severity"], 99))
