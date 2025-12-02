# GSPro Compatibility & Testing Strategy

Automation reliability depends on testing against multiple GSPro versions and configurations. This document tracks compatibility targets and regression plans.

## 1. Supported Versions
| GSPro Version | Status | Notes |
| --- | --- | --- |
| 1.0.15 | Primary | MVP development target; automation scripts validated here. |
| 1.0.14 | Supported | Smoke tests required; ensure config formats unchanged. |
| 1.0.13 | Best-effort | Manual validation only; automation may fall back to prompts. |

Update this table as new GSPro builds release. Automation scripts should detect version via executable metadata or API response and adapt accordingly.

## 2. Configurations to Test
* **Display modes:** Fullscreen vs windowed.
* **Resolutions:** 1080p, 1440p, 4K.
* **Graphics presets:** Medium, High, Ultra.
* **Practice vs Course modes:** Validate automation flows for both.
* **Input language/localization:** Ensure UI automation handles non-English OS languages (consider UIA IDs instead of text).

## 3. Regression Suite
Weekly/biweekly runs on a dedicated GSPro lab machine should cover:
1. CLI harness `practice_range_mvp` scenario.
2. CLI harness stress scenario (once available).
3. Network benchmark (if connection stable).
4. WinUI wizard end-to-end run (manual trigger) to verify UX layers.

Record metrics and compare to historical baselines; flag regressions exceeding ±5% FPS.

## 4. Automation Script Maintenance
* Store scripts in `/tools/automation/` with versioned folders (e.g., `v1.0.15/`).
* Include change logs describing UI changes handled.
* Provide fallback manual instructions if version mismatch detected.

## 5. Issue Reporting
When GSPro updates break automation:
1. Log via `SupportWorkflow` template.
2. Capture screen recordings of new UI flow.
3. Prioritize fixes before releasing wizard update; optionally block automation until patch ready.
