# GSPro Benchmark Wizard (Bootstrap)

This directory hosts the initial .NET solution for the standalone benchmark wizard described in `docs/BenchmarkWizardImplementationPlan.md` (copied here for convenience). The WinUI project must be created on Windows, but we can begin implementing shared services and the CLI harness cross-platform.

## Structure
```
benchmark-wizard/
  BenchmarkWizard.sln
  src/
    Benchmark.Core/        Shared models + interfaces
    Benchmark.Cli/         MVP CLI harness (stub)
  configs/
    scenarios/             JSON scenarios copied from docs
    lm_profiles/           Launch monitor profiles
  schemas/                 Scenario / LM JSON schemas
  docs/                    Project docs migrated from main repo
  tools/, scripts/         Reserved for automation
```

## Next Steps
1. On a Windows machine, add a WinUI 3 project (`WizardApp`) to this solution using the checklist in `docs/RepoBootstrapChecklist.md`.
2. Flesh out `Benchmark.Core` with configuration loaders, profiler implementation, and metrics collectors.
3. Expand `Benchmark.Cli` to wire the profiler, scenario runner, and network tester according to `docs/CLIHarness.md`.
4. Add validation scripts under `scripts/` that run `ajv` against the schemas.
