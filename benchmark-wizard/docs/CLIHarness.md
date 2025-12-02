# MVP CLI Harness Specification

Before the full WinUI wizard is ready, build a headless harness that exercises profiler, scenario, LM, and metrics modules. This file outlines expected behavior.

## 1. Goals
* Validate scenario/LM configs and pipeline logic without UI dependencies.
* Provide automated regression tests (CI) that can run on dedicated GSPro lab machines.
* Allow developers to run targeted scenarios (`practice_range_mvp`, `network_download_gold`) via command line.

## 2. Command Layout
```
gspro-benchmark-cli.exe profile
gspro-benchmark-cli.exe run --scenario practice_range_mvp --gspro-path "C:\GSPro\GSPro.exe"
gspro-benchmark-cli.exe network --scenario network_download_gold
```

Global options:
* `--output <dir>` – override run artifact directory.
* `--lm-endpoint <host:port>` – specify GSPro OpenAPI target.
* `--presentmon-path <path>` – custom path for PresentMon binary.
* `--dry-run` – skip GSPro launch / LM shots; used for config validation.

## 3. Typical Flow (`run`)
1. Load scenario JSON and LM profiles (+ validation).
2. Capture hardware snapshot (WMI) and persist to `<output>/hardware.json`.
3. Launch or attach to GSPro if `--dry-run` not set; apply scenario settings.
4. Start PresentMon capture.
5. Play through shot sequence via LM emulator.
6. Stop capture, compute metrics, and emit `<output>/metrics_<scenario>.json`.
7. Compose simple console summary and optional HTML report.

On failure, the CLI should exit non-zero and write detailed logs to `<output>/logs/cli.log`.

## 4. Network Test Flow (`network`)
1. Load network scenario config.
2. Start download to a temp file, streaming progress to console.
3. Compute throughput/classification per `NetworkClassification.md` and write `<output>/network.json`.

## 5. Integration with CI
* Provide a `--noop-presentmon` flag to simulate capture on developer machines without GSPro.
* Run the CLI in dry-run mode on every CI build to validate configs.
* Use scheduled jobs on a physical GSPro testbed to run full scenarios nightly and archive artifacts for regression tracking.

## 6. Deliverables
* CLI project (console app) living alongside the WinUI wizard in the same solution.
* Shared libraries for configs, profiler, LM agent, metrics that both CLI and UI reference.
* Documentation on how to install and configure prerequisites (PresentMon, GSPro path) for the CLI users.
