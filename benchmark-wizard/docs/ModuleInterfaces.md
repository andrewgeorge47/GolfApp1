# Benchmark Wizard Module Interfaces

This note captures proposed contracts between core services so multiple developers can work in parallel while the WinUI shell is bootstrapped.

## 1. Run Context
```csharp
record BenchmarkRunContext(
    HardwareProfile Hardware,
    ScenarioDefinition Scenario,
    IReadOnlyList<ShotEvent> ExecutedShots,
    MetricsSummary Metrics,
    NetworkResult? Network);
```

The context is passed to `ReportBuilder` and persisted on disk as JSON/HTML.

## 2. Profiler Service
```csharp
public interface IProfilerService
{
    Task<HardwareProfile> CaptureAsync(CancellationToken token = default);
}

public sealed record HardwareProfile(
    CpuInfo Cpu,
    GpuInfo Gpu,
    double RamGb,
    string OsVersion,
    StorageInfo Storage,
    IReadOnlyDictionary<string, string> RawProperties);
```

Implementation detail: leverage WMI classes `Win32_Processor`, `Win32_VideoController`, `Win32_ComputerSystem`, `Win32_OperatingSystem`, and `Get-PhysicalDisk`.

## 3. Scenario Engine
```csharp
public interface IScenarioRunner
{
    Task<ScenarioResult> RunAsync(
        ScenarioDefinition scenario,
        ScenarioRuntimeOptions options,
        CancellationToken token = default);
}

public sealed record ScenarioResult(
    ScenarioDefinition Scenario,
    IReadOnlyList<ShotEvent> Shots,
    MetricsSummary Metrics,
    TimeSpan Duration,
    IReadOnlyList<ScenarioLogEntry> Logs);
```

The engine coordinates GSPro readiness, LM playback, and metrics capture.

## 4. GSPro Controller
```csharp
public interface IGSProController
{
    Task EnsureLaunchedAsync(GSProLaunchOptions options, CancellationToken token = default);
    Task ApplySettingsAsync(GSProSettings settings, CancellationToken token = default);
}
```

Responsibilities:
1. Resolve GSPro executable path (user selection stored securely).
2. Launch or attach to GSPro, handling updates.
3. Apply resolution/graphics/course settings either through config file edits or UI automation scripts (AutoHotkey/WinAppDriver).

## 5. Launch Monitor Agent
```csharp
public interface ILMAgent : IAsyncDisposable
{
    Task ConnectAsync(LaunchMonitorOptions options, CancellationToken token = default);
    Task SendShotAsync(ShotDefinition shot, CancellationToken token = default);
}
```

ShotDefinition derives from LM profile templates plus per-shot overrides. Payloads mirror GSPro OpenAPI JSON.

## 6. Metrics Collector
```csharp
public interface IMetricsCollector : IAsyncDisposable
{
    Task StartAsync(Process process, string captureLabel, CancellationToken token = default);
    Task<MetricsSummary> StopAsync(CancellationToken token = default);
}

public sealed record MetricsSummary(
    double AverageFps,
    double OnePercentLow,
    double PointOnePercentLow,
    double FrameTimeStdDev,
    string RawCapturePath);
```

Default implementation wraps PresentMon CLI (with CapFrameX as alternate). Each capture is stored under `%ProgramData%/GSProBenchmark/runs/<timestamp>/captures/`.

## 7. Network Tester
```csharp
public interface INetworkTester
{
    Task<NetworkResult> RunAsync(NetworkScenario scenario, CancellationToken token = default);
}

public sealed record NetworkResult(
    Uri TestFile,
    double ThroughputMbps,
    double ElapsedSeconds,
    bool Completed,
    double? FirstByteLatencyMs,
    string Classification);
```

Classification uses tier cutoffs defined in configuration (Gold ≥100 Mbps, Silver 50–100 Mbps, Moderate 25–50 Mbps, Limited <25 Mbps).

## 8. Artifact Layout
```
%ProgramData%/GSProBenchmark/
  settings.json
  runs/
    2024-05-01T15-20-11Z/
      hardware.json
      scenario_practice_range_mvp.json
      metrics_practice_range_mvp.json
      network.json
      report.html
      report.json
      captures/
        presentmon_practice_range_mvp.csv
      logs/
        wizard.log
```

Conventions:
* Each artifact references `scenario.version` for reproducibility.
* Reports embed scenario + LM profile metadata for portability.
* Raw capture CSVs are retained for at least 30 days (user configurable).

## 9. Next Implementation Targets
1. Generate strongly typed models from the JSON schemas (`scenario.schema.json`, `lm_profile.schema.json`).
2. Stand up `ProfilerService` with diagnostics view.
3. Build MVP CLI harness to exercise scenario + metrics logic before wiring to UI.
