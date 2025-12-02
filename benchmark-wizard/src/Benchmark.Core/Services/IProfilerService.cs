using Benchmark.Core.Models;

namespace Benchmark.Core.Services;

public interface IProfilerService
{
    Task<HardwareProfile> CaptureAsync(CancellationToken cancellationToken = default);
}
