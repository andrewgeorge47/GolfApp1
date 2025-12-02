# Scenario & LM Profile Validation Workflow

To keep scenario and launch monitor definitions consistent across contributors, adopt the following validation checkpoints.

## 1. Tooling
* **Schema validator:** Use `ajv-cli` (Node) or `dotnet System.Text.Json.Schema` once the wizard repo is live.
* **Pre-commit hook:** Add a script (`npm run validate-scenarios`) that runs during CI and developer commits.
* **Unit tests:** In the wizard solution, include tests that deserialize every bundled scenario/LM profile and assert `ScenarioDefinition.Validate()` passes.

## 2. Sample CLI Script
```bash
#!/usr/bin/env bash
set -euo pipefail

SCHEMA_DIR="docs/benchmark-wizard"

for file in docs/benchmark-wizard/scenarios/*.json; do
  ajv validate -s "$SCHEMA_DIR/scenario.schema.json" -d "$file"
done

for file in docs/benchmark-wizard/lm_profiles/*.json; do
  ajv validate -s "$SCHEMA_DIR/lm_profile.schema.json" -d "$file"
done
```

This script should run in CI and prevent merges when configs drift.

## 3. Integration in Wizard Repo
1. Generate strongly typed models via `dotnet new jsonschema` or `quicktype`.
2. Register configuration providers that:
   * Load JSON files.
   * Validate against embedded schemas.
   * Emit meaningful error messages (line/column) in the wizard UI.
3. Monitor file hashes so the wizard can detect updated scenarios and prompt users to reload without restarting.

## 4. Release Checklist Additions
Before releasing a new wizard build:
* Rerun schema validation on all checked-in scenarios/profiles.
* Smoke-test each scenario using the CLI harness with GSPro stubbed out, ensuring LM sequences and durations line up.
* Bump `version` fields in scenario JSONs when behavior changes; include change summary in release notes.
