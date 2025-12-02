# Benchmark Wizard Documentation Index

Artifacts that guide the GSPro Benchmark Wizard effort live in this folder. Key entry points:

1. `../BenchmarkWizardImplementationPlan.md` – high-level architecture, phases, and risks.
2. `scenario.schema.json` / `lm_profile.schema.json` – JSON schemas for scenario and launch monitor definitions.
3. `scenarios/` – sample scenarios (`practice_range_mvp.json`, `network_download_gold.json`) aligned with the plan’s MVP + network add-on.
4. `lm_profiles/` – reusable LM payload templates (e.g., `driver_high_spin.json`, `seven_iron_stock.json`).
5. `ModuleInterfaces.md` – proposed .NET interfaces and artifact layout for services (Profiler, ScenarioEngine, GSPro controller, etc.).
6. `NetworkClassification.md` – NN throughput tiers and UX considerations for the network benchmark step.

Future additions:
* Validation tooling docs (JSON schema validation CLI + CI hooks).
* Automation scripts and PresentMon integration notes.
