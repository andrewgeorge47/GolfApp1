# Repo Bootstrap Checklist

Steps to create the new `gspro-benchmark-wizard` repository and ensure every developer machine is ready.

## 1. Prerequisites
* Windows 11, VS 2022 17.8+ with .NET desktop workload and WinUI 3 templates.
* .NET 8 SDK.
* Node.js 18+ (for schema validation tooling).
* PresentMon binaries (latest release) downloaded to a known path.
* AutoHotkey or WinAppDriver installed for UI automation experiments.

## 2. Repository Initialization
1. `dotnet new winui3 -n WizardApp` (or WPF if WinUI blocked).
2. Add solution folder `src/` with projects:
   * `WizardApp` (UI)
   * `Benchmark.Core` (shared services/interfaces)
   * `Benchmark.Cli` (console harness)
3. Reference `Benchmark.Core` from both UI and CLI.
4. Copy docs/configs from this repo into `/docs` and `/configs` folders.
5. Add `Directory.Build.props` setting LangVersion `preview` if needed and enabling nullable annotations.

## 3. Dependencies & Packages
* `CommunityToolkit.WinUI` for MVVM helpers.
* `Microsoft.WindowsAppSDK` for WinUI.
* `System.Management` for WMI calls.
* `System.Text.Json` and `Json.Schema` for config parsing.
* `Serilog` (or similar) for logging.
* `CommandLineParser` or `Spectre.Console.Cli` for CLI commands.

## 4. Configuration Files
* `appsettings.json` – global settings (PresentMon path, LM endpoint defaults, network tiers).
* `configs/scenarios/*.json` – copy from docs.
* `configs/lm_profiles/*.json`.
* `schemas/` – embed JSON schemas for runtime validation.

## 5. Developer Tooling
* `scripts/validate-configs.ps1` – runs schema validation via `ajv`.
* `scripts/setup-dev.ps1` – installs Node dependencies and downloads PresentMon if not present.
* Git hooks (`.husky` or `githooks/`) to ensure configs validated pre-commit.

## 6. CI Setup
* GitHub Actions workflow running:
  * `dotnet build` + tests.
  * Config validation script.
  * CLI dry-run tests.
* Nightly job placeholder for hardware lab regression (manual trigger until infra ready).

## 7. Documentation
* Include README with overview and link back to `docs/benchmark-wizard` in this repo.
* CONTRIBUTING guide describing automation prerequisites and code style.

Following this checklist should result in a ready-to-code baseline where developers can immediately implement the MVP profiler and CLI harness.
