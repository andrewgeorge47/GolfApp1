# PresentMon Integration Notes

PresentMon (Intel’s frame-time capture tool) is the primary metrics provider for the benchmark wizard. This document summarizes how we bundle, invoke, and troubleshoot it.

## 1. Packaging Strategy
* Ship a vetted PresentMon release inside the wizard installer under `Tools/PresentMon`.
* Expose a settings panel allowing advanced users to override the path.
* Monitor upstream releases quarterly and update after regression testing.

## 2. Invocation Pattern
```
presentmon.exe ^
  --process_name GSPro.exe ^
  --output_file "<runDir>\captures\presentmon_<scenario>.csv" ^
  --no_console ^
  --hotkeys none ^
  --terminate_on_proc_exit
```

Steps per scenario:
1. Start PresentMon using `ProcessStartInfo` with redirected stdout/stderr.
2. Wait for scenario warmup; once ready, instruct LM agent to start shots.
3. After scenario duration completes, send CTRL+C or kill PresentMon gracefully.
4. Verify CSV presence; parse into `MetricsSummary`.

## 3. CSV Parsing
* Use `CsvHelper` or lightweight parser to read `Application`, `AvgFPS`, `P1`, `P0.1`, `VarFPS` columns (depends on CLI flags).
* Fallback: compute metrics manually from frame times if aggregated stats missing.
* Store raw CSV path in `MetricsSummary.RawCapturePath`.

## 4. Error Handling
| Symptom | Action |
| --- | --- |
| PresentMon exits immediately | Likely GSPro not running or wrong process name; prompt user to retry. |
| CSV empty | Check permissions on run directory and antivirus logs; rerun. |
| CLI fails to spawn | Ensure VC++ runtime installed; ship redistributable with installer. |

## 5. Development Convenience
* Provide a `--noop-presentmon` flag (`IMetricsCollector` stub) for developers without GSPro hardware.
* Implement a synthetic CSV generator for unit tests to avoid bundling real captures.

## 6. Future Enhancements
* Consider CapFrameX CLI integration as secondary provider (user choice).
* Telemetry hooks: log PresentMon version and runtime in run artifacts for debugging.
