namespace Benchmark.Core.Scenarios;

public sealed record LaunchMonitorProfile(
    string Id,
    string Name,
    string Description,
    string Club,
    double BallSpeedMph,
    double ClubSpeedMph,
    double LaunchAngleDeg,
    double? SideAngleDeg,
    double? SpinRpm,
    double? AxisTiltDeg,
    double? CarryDistanceYds);
