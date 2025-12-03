# Telemetry & Logging Plan

Consistent logging helps debug automation issues and produce support bundles. This plan covers local telemetry collection (no external upload unless user opts in).

## 1. Logging Stack
* Use `Serilog` (or NLog) with sinks:
  * Rolling file per day under `%ProgramData%/GSProBenchmark/logs/wizard.log`.
  * Scenario-specific logs under each run folder.
* Log levels: `Information` default, `Debug` via developer mode toggle, `Error` for failures surfaced to UI.

## 2. Events to Capture
* Wizard lifecycle: startup, settings loaded, consent changes.
* Profiler results summary (no PII).
* Scenario steps: GSPro launch → settings applied → PresentMon start/stop → LM shots executed count.
* Errors/exceptions with stack traces.
* Network test metrics.

## 3. Telemetry Schema (Local)
```json
{
  "timestamp": "2024-05-12T04:12:20.123Z",
  "level": "Information",
  "event": "ScenarioStarted",
  "scenario_id": "practice_range_mvp",
  "gspro_version": "1.0.15"
}
```

## 4. Support Bundles
* “Copy Support Bundle” button zips:
  * Latest run folder (hardware/metrics/network/report/logs).
  * `wizard.log` slice covering the run window.
  * Optional PresentMon CSVs.
* Zip stored in `%TEMP%` and user can attach to support tickets.

## 5. Retention & Cleanup
* Keep wizard log files for 30 days (configurable). Older logs auto-delete.
* Run folders optionally pruned via UI (“Delete runs older than 90 days”).

## 6. Opt-In Telemetry
* If cloud telemetry added later, reuse the same event schema but gate with explicit consent.
* Provide “View telemetry” panel so users can inspect exactly what would be sent.

## 7. Developer Instrumentation
* Add structured events around automation (e.g., `AutomationStepCompleted`, `PresentMonExited`).
* Use `ActivitySource` for distributed tracing if multiple services introduced.
