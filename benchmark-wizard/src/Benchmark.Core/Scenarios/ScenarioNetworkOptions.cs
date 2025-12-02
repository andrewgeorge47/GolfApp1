namespace Benchmark.Core.Scenarios;

public sealed record ScenarioNetworkOptions(
    string TestFileUrl,
    long TestFileSizeBytes,
    int MaxDurationSeconds);

public sealed record MetricsTargets(
    int? AverageFps,
    int? OnePercentFps);
