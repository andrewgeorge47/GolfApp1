namespace Benchmark.Core.Scenarios;

public sealed record ShotSequence(
    string Club,
    string? LaunchMonitorProfileId,
    int Count,
    double IntervalSeconds,
    ShotRandomization? Randomization);

public sealed record ShotRandomization(
    double? SpeedMph,
    double? LaunchAngleDeg,
    double? SpinRpm);
