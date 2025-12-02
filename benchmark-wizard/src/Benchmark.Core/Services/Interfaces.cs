using Benchmark.Core.Models;
using Benchmark.Core.Scenarios;

namespace Benchmark.Core.Services;

public interface IScenarioRunner
{
    Task<ScenarioResult> RunAsync(
        ScenarioDefinition scenario,
        ScenarioRuntimeOptions options,
        CancellationToken cancellationToken = default);
}

public sealed record ScenarioRuntimeOptions(
    bool DryRun,
    string OutputDirectory,
    string? GsProPath,
    Uri? LaunchMonitorEndpoint);

public sealed record ScenarioResult(
    ScenarioDefinition Scenario,
    IReadOnlyList<ShotEvent> Shots,
    MetricsSummary Metrics,
    TimeSpan Duration,
    IReadOnlyList<string> Logs);

public sealed record ShotEvent(
    DateTimeOffset Timestamp,
    string Club,
    string LaunchMonitorProfileId,
    IReadOnlyDictionary<string, double> Payload);

public sealed record MetricsSummary(
    double AverageFps,
    double OnePercentLow,
    double PointOnePercentLow,
    double FrameTimeStdDev,
    string RawCapturePath);

public interface IMetricsCollector : IAsyncDisposable
{
    Task StartAsync(string processName, string captureLabel, string outputPath, CancellationToken cancellationToken = default);
    Task<MetricsSummary> StopAsync(CancellationToken cancellationToken = default);
}

public interface INetworkTester
{
    Task<NetworkResult> RunAsync(ScenarioNetworkOptions scenarioNetworkOptions, CancellationToken cancellationToken = default);
}

public sealed record NetworkResult(
    Uri TestFile,
    double ThroughputMbps,
    double ElapsedSeconds,
    bool Completed,
    double? FirstByteLatencyMs,
    string Classification);
