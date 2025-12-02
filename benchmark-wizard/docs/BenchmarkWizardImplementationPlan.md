# GSPro Benchmark Wizard – Implementation Plan

This document translates `Benchmarkwizazrd.md` into an actionable plan for building the standalone GSPro Benchmark Wizard.

## 1. Objectives & Success Criteria
* Ship a Windows desktop wizard that profiles a user’s sim PC, runs scripted GSPro scenarios, gathers FPS/frame-time metrics, and presents a shareable report.
* Ensure every benchmark run is reproducible via config-driven scenarios, LM profiles, and deterministic telemetry capture.
* Provide an optional network readiness test to classify hosts for Neighborhood National (NN) compute tiers.

Success indicators:
1. Users can run an end-to-end benchmark (profile → run scenarios → review report) without manual data entry beyond GSPro path selection on first run.
2. Results are exportable as JSON + HTML with hardware specs, per-scenario metrics, and NN network classification.
3. Automation and measurements are deterministic enough to compare rigs and aggregate anonymized stats in the future.

## 2. Architecture Overview
### 2.1 Tech Stack
* **Primary framework:** .NET 8, WinUI 3 (or WPF if WinUI constraints arise) for UI and orchestration.
* **Process automation & telemetry:** C# services with optional native helpers (PowerShell/C++/AutoHotkey) for WMI data, PresentMon integration, and GSPro UI control.
* **Packaging:** MSIX or WiX installer with code signing.
* **Data interchange:** JSON files persisted under `%ProgramData%/GSProBenchmark` plus per-run folders containing metrics and logs.

### 2.2 Module Breakdown
| Module | Responsibilities | Key Interfaces |
| --- | --- | --- |
| `ProfilerService` | Collect CPU/GPU/RAM/storage/OS info via WMI/dxdiag; detect GSPro install path. | `IProfilerService.GetSnapshot() -> HardwareProfile` |
| `ScenarioEngine` | Parse scenario JSON configs, orchestrate scenario execution, manage timers. | `IScenarioRunner.RunAsync(ScenarioDefinition)` |
| `GSProController` | Launch GSPro, apply settings, drive UI automation or user prompts. | `IGSProController.EnsureReadyAsync(Settings)` |
| `LMAgent` | Emulate launch monitor shots through GSPro OpenAPI using LM profiles. | `ILMAgent.SendShotAsync(ShotDefinition)` |
| `MetricsCollector` | Start/stop PresentMon/OCAT/CapFrameX, parse CSV to summarize FPS stats. | `IMetricsCollector.Start(processId)`, `StopAsync()` |
| `ReportBuilder` | Combine profile, scenarios, metrics, and network results into JSON/HTML. | `IReportBuilder.Build(runContext)` |
| `NetworkTester` | Execute configurable download benchmark, compute throughput, classify tiers. | `NetworkResult = INetworkTester.RunAsync(options)` |

Shared utilities: logging/telemetry, configuration schema validation, per-run artifact storage, UI messaging bus.

### 2.3 Data Flow
1. Wizard bootstraps, loads `scenarios/*.json` and `lm_profiles/*.json`.
2. User selects GSPro path (first run) and optional network test.
3. `ProfilerService` retrieves hardware info; results stored in run context.
4. For each scenario:
   * `GSProController` ensures GSPro is running with desired settings.
   * `MetricsCollector` starts capture (PresentMon -> CSV).
   * `LMAgent` feeds scripted shots; `ScenarioEngine` tracks duration and handles prompts.
   * `MetricsCollector` stops and returns derived metrics (avg FPS, 1% low, etc.).
5. `ReportBuilder` composes JSON + HTML, injecting reference rig comparisons and network classification.
6. Artifacts persisted and optionally uploaded (Phase v3+).

## 3. Repository Strategy
* **New repo (`gspro-benchmark-wizard`)** hosts the wizard code to keep production app isolated.
* Existing repo stores shared documentation, scenario drafts, and integration scripts.
* Define an internal package format (`.gsbenchmark`) that bundles scenario configs, LM profiles, and assets so content updates can ship independently of binaries.

Repo layout (new project):
```
/src
  /WizardApp (WinUI UI)
  /Services (Profiler, ScenarioEngine, etc.)
  /Integrations (PresentMon wrapper, GSPro automation)
/configs
  /scenarios/*.json
  /lm_profiles/*.json
/tools
  /automation-scripts
```

## 4. Detailed Phases
### Phase MVP v0 (Baseline, no automation)
* Build WinUI shell with steps: Profile → Instructions → Run → Report.
* Implement `ProfilerService` via WMI (`Win32_Processor`, `Win32_VideoController`, etc.) and persist hardware JSON.
* Provide manual instructions (user sets GSPro to specific course/range) and track a single scenario with fixed duration.
* Integrate PresentMon CLI with process filtering on GSPro; parse CSV to compute avg/1%/0.1% FPS and frame-time SD.
* Generate simple HTML/text report summarizing hardware + metrics; allow saving run folder.

### Phase v1 (Config + LM automation)
* Introduce JSON schema for scenarios and LM profiles; add validation and hot reload.
* Implement `GSProController` launcher and minimal UI automation (AutoHotkey or Windows UI Automation) for settings/course selection.
* Build `LMAgent` to emulate shots via GSPro OpenAPI with deterministic LM profiles.
* Automate PresentMon lifecycle per scenario, storing raw CSV per run.
* Expand report to include per-scenario cards and deterministic naming.

### Phase v2 (Wizard polish + multi-scenario support)
* Flesh out wizard UX with progress indicators, scenario selection, and error surfaces.
* Support 4–5 predefined scenarios (1080p League, 1440p Balanced, 4K Ultra, Tree-heavy Stress, Practice Range Quick Test).
* Render charts/traffic-light ratings comparing results to reference rigs.
* Persist run history and allow exporting/sharing reports directly.

### Phase v3 (Cloud & reliability)
* Optional secure upload of anonymized run data to NN backend; implement opt-in telemetry.
* Build simple leaderboard/compare site fed by uploaded results.
* Harden automation scripts, add retry logic, diagnostics viewer, auto-updater, and code-signed installer.

## 5. Network Readiness Add-On
* Implement dedicated `course_download_speed` scenario per `Benchmarkwizazrd.md`: configurable URL/size/duration, streamed download with byte tracking, throughput calculation, and latency capture.
* UI: prompt user post-profiler to run the network test, show live progress/throughput, classify (Gold ≥100 Mbps, Silver 50–100, Moderate 25–50, Limited <25).
* Report: include `network` block in JSON/HTML plus narrative summary.
* Handle opt-out, temp file cleanup, HTTPS-only downloads, and persistence of best run per machine.

## 6. External Integrations & Dependencies
* **PresentMon / OCAT / CapFrameX:** ship vetted binaries or instruct users to install; wrap via CLI and capture logs.
* **GSPro OpenAPI access:** confirm licensing and local port usage; provide configuration UI for LM emulator host/port.
* **Automation scripts:** AutoHotkey/PowerShell/WinAppDriver scripts signed and versioned; ensure user transparency when automation is running.

## 7. Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| GSPro updates breaking automation | Abstract UI automation per version; provide manual fallback prompts. |
| Antivirus false positives | Code signing, MSIX packaging, minimal external scripts. |
| PresentMon incompatibility | Provide fallback metrics collector (CapFrameX API). |
| User privacy concerns | Explicit opt-in for data uploads; local storage encrypted where necessary. |

## 8. Immediate Next Steps
1. Bootstrap new repo with WinUI project, service interfaces, and configuration folders.
2. Implement Phase MVP v0 profiler + manual scenario flow.
3. Draft initial scenario and LM profile JSONs, along with validation schema.
4. Integrate PresentMon wrapper and verify instrumentation on a test rig.

This roadmap can be refined as we validate dependencies (GSPro automation APIs, LM OpenAPI access) and gather feedback from early internal users.

