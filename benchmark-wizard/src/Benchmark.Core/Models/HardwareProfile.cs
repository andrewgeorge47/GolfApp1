namespace Benchmark.Core.Models;

public sealed record HardwareProfile(
    CpuInfo Cpu,
    GpuInfo Gpu,
    double RamGb,
    string OsVersion,
    StorageInfo Storage,
    IReadOnlyDictionary<string, string> RawProperties);

public sealed record CpuInfo(
    string Model,
    int PhysicalCores,
    int LogicalProcessors,
    double BaseClockGhz,
    double? BoostClockGhz);

public sealed record GpuInfo(
    string Model,
    double VramGb,
    string DriverVersion);

public sealed record StorageInfo(
    string PrimaryDriveType,
    double TotalGb,
    double FreeGb);
