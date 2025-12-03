# Benchmark Wizard Backlog

Track near-term engineering tasks as we spin up the new repo.

## Phase MVP v0
1. **Repo bootstrap**
   * Follow `RepoBootstrapChecklist.md`, push initial solution with `WizardApp`, `Benchmark.Core`, `Benchmark.Cli`.
2. **Config ingestion**
   * Import schemas + sample scenarios/LM profiles into `/configs`.
   * Implement schema validation + strongly typed models.
3. **ProfilerService**
   * Write WMI-powered hardware snapshot (+ unit tests using mocked WMI data).
   * Build CLI command `profile` to dump JSON.
4. **PresentMon integration**
   * Wrap CLI invocation; support `--noop` mode for dev use.
   * Parse CSV into `MetricsSummary`.
5. **ScenarioRunner (manual)**
   * Implement minimal runner that waits for user confirmation before starting capture (no GSPro automation yet).
   * Execute `practice_range_mvp` scenario via CLI and log artifacts.
6. **Reporting**
   * Compose JSON + simple HTML summary; embed links to raw CSV.

## Phase v1 Prep
1. GSPro path discovery UI + persistence.
2. UI automation spike (AutoHotkey vs WinAppDriver) for course selection.
3. Implement `LMAgent` to send OpenAPI shots.
4. Expand CLI to simulate LM shots (with dry-run stubs when GSPro unavailable).

## Tooling / Ops
1. Add schema validation script to CI.
2. Create nightly scheduled pipeline placeholder for hardware lab runs.
3. Research code signing + installer approach (MSIX vs WiX).

## Documentation
1. Write user-facing guide for running the wizard + interpreting reports.
2. Draft troubleshooting section for PresentMon/GSPro automation.
