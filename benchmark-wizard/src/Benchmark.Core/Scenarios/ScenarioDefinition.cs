using System.Text.Json.Serialization;

namespace Benchmark.Core.Scenarios;

public sealed record ScenarioDefinition(
    string Id,
    string Name,
    string Description,
    string Version,
    ScenarioType Type,
    IReadOnlyList<string>? Tags,
    int? DurationSeconds,
    int? WarmupSeconds,
    string? Resolution,
    string? GraphicsPreset,
    string? Course,
    string? Tee,
    string? TimeOfDay,
    string? Wind,
    string? CameraMode,
    IReadOnlyList<string>? Instructions,
    IReadOnlyList<ShotSequence>? Shots,
    ScenarioNetworkOptions? Network,
    MetricsTargets? MetricsTargets)
{
    [JsonIgnore]
    public bool IsGameplay => Type == ScenarioType.Gameplay;
}

public enum ScenarioType
{
    Gameplay,
    Network
}
