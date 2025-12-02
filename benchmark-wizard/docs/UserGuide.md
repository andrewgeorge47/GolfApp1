# GSPro Benchmark Wizard – User Guide (Draft)

This guide walks operators through preparing their system, running benchmarks, and reading the results once the wizard ships.

## 1. Prerequisites
* Windows 11 PC with GSPro installed and licensed.
* Latest NVIDIA/AMD GPU drivers.
* PresentMon bundle installed (the wizard checks and can download if missing).
* Stable internet connection for the optional NN network test (skip if metered).

## 2. First Run Setup
1. Launch the wizard (signed installer places shortcut on desktop).
2. Accept the privacy notice (data stays local unless you opt into uploads).
3. When prompted, browse to your `GSPro.exe`. The wizard stores the path for future runs.
4. (Optional) Specify LM endpoint if you use a non-default GSPro OpenAPI port.

## 3. Running a Benchmark
1. **Profile Step**
   * Click “Capture Hardware Snapshot.” Review detected CPU/GPU/RAM/OS info.
   * Fix any missing fields (e.g., if GPU not detected, ensure drivers installed and retry).
2. **Scenario Selection**
   * Choose from predefined scenarios (1080p Practice Range, 1440p Balanced, 4K Ultra, Stress Test).
   * Each scenario card shows duration, LM clubs used, and expected target FPS.
3. **Network Test (optional)**
   * Toggle “Run NN Network Readiness” to measure download throughput per `NetworkClassification.md`.
4. **Run**
   * Ensure GSPro is not already running; click “Start Benchmark.”
   * The wizard will launch GSPro, apply settings, and display status (PresentMon running, LM shots queued).
   * Do not interact with GSPro while the wizard controls it; progress updates appear in the wizard.
5. **Report**
   * After completion, the report view shows hardware summary, per-scenario metrics, charts, and NN classification.
   * Use “Export Report” to save HTML + JSON artifacts for sharing or support.

## 4. Interpreting Results
* **Average FPS / 1% / 0.1%** – Higher is better; 1% low indicates consistency.
* **Traffic-light badges** – Green: above target, Yellow: near limit, Red: below spec.
* **Reference rigs** – The wizard compares your system to curated tiers (e.g., RTX 3060 baseline).
* **Network classification** – Gold/Silver/Moderate/Limited describes NN hosting readiness.

## 5. Troubleshooting
| Issue | Resolution |
| --- | --- |
| Wizard cannot find GSPro | Manually browse to the install folder (default `C:\GSPro`). Ensure antivirus didn’t quarantine the exe. |
| PresentMon failed to start | Confirm antivirus exclusions, check `Settings → PresentMon Path`, or reinstall from wizard prompt. |
| LM connection refused | Verify GSPro Connect is running, port not blocked by firewall, and no real LM is active simultaneously. |
| Report missing metrics | See log viewer for scenario errors; rerun once GSPro automation issues resolved. |
| Network test stuck | Pause other downloads, ensure HTTPS not blocked, or skip test on metered connections. |

## 6. Data Privacy
* All run artifacts (hardware, metrics, network) stay in `%ProgramData%/GSProBenchmark`.
* Uploading results to Neighborhood National services is opt-in and anonymized.
* Delete historical runs via “Manage Runs” to free disk space.

## 7. Support
* Use the “Copy Support Bundle” button to zip the latest run’s logs for tech support.
* File issues in the internal tracker with run timestamp and scenario IDs.
