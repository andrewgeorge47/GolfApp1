using Benchmark.Core.Scenarios;
using System.Text.Json;

var command = args.FirstOrDefault()?.ToLowerInvariant();
if (string.IsNullOrWhiteSpace(command))
{
    PrintUsage();
    return 1;
}

return command switch
{
    "profile" => RunProfile(),
    "run" => RunScenario(args.Skip(1).ToArray()),
    "network" => RunNetwork(args.Skip(1).ToArray()),
    _ => UnknownCommand(command)
};

static int RunProfile()
{
    Console.WriteLine("TODO: Invoke ProfilerService and output hardware.json");
    return 0;
}

static int RunScenario(string[] args)
{
    var scenarioId = GetOptionValue(args, "--scenario");
    if (scenarioId is null)
    {
        Console.Error.WriteLine("Missing required option --scenario <id>");
        return 1;
    }

    Console.WriteLine($"Loading scenario '{scenarioId}' (implementation pending).");
    return 0;
}

static int RunNetwork(string[] args)
{
    var scenarioId = GetOptionValue(args, "--scenario") ?? "network_download_gold";
    Console.WriteLine($"Running network scenario '{scenarioId}' (implementation pending).");
    return 0;
}

static void PrintUsage()
{
    Console.WriteLine("""
        GSPro Benchmark CLI (bootstrap)
        Commands:
          profile                         Capture hardware snapshot (not yet implemented)
          run --scenario <id>             Execute gameplay scenario (stub)
          network [--scenario <id>]       Execute network throughput scenario (stub)
        """);
}

static int UnknownCommand(string command)
{
    Console.Error.WriteLine($"Unknown command '{command}'.");
    PrintUsage();
    return 1;
}

static string? GetOptionValue(IReadOnlyList<string> args, string optionName)
{
    for (var i = 0; i < args.Count; i++)
    {
        if (args[i].Equals(optionName, StringComparison.OrdinalIgnoreCase))
        {
            if (i + 1 < args.Count)
            {
                return args[i + 1];
            }
            return null;
        }
    }

    return null;
}
