# GSPro Automation Strategy

Reliable automation is critical for deterministic benchmarks. This document outlines options, trade-offs, and the phased approach for controlling GSPro.

## 1. Objectives
* Launch GSPro with consistent settings (resolution, graphics preset, camera mode).
* Navigate to required course/practice range and tee positions without manual clicks.
* Detect state so the wizard knows when GSPro is ready for LM shot injection.

## 2. Control Layers
1. **Configuration Editing**
   * Inspect GSPro config files (if accessible) to pre-set resolution, graphics, and camera preferences before launch.
   * Pros: Fast, no UI automation. Cons: Limited coverage if settings stored encrypted or per-user.
2. **UI Automation**
   * Tools: WinAppDriver, UIAutomationClient, or AutoHotkey scripts.
   * Use automation IDs for buttons/menus where possible; fall back to image coordinates only as last resort.
   * Maintain scripts per GSPro version; store in `/tools/automation`.
3. **User Prompts**
   * For MVP, when automation not yet built, show clear prompts (“Click Start Round now”) and wait for user confirmation.

## 3. State Detection
* Monitor GSPro process window titles or log files to confirm the correct screen is active.
* Optionally instrument pixel sampling (e.g., verifying the Practice Range HUD color) as a fallback.
* Log automation progress to aid debugging.

## 4. Phased Plan
| Phase | Automation Level |
| --- | --- |
| MVP v0 | Manual instructions only; wizard pauses until user confirms scenario ready. |
| v1 | Automate GSPro launch + apply settings; manual prompt for course start. |
| v2 | Full automation: navigate menus, start round/range, ensure camera mode. |

## 5. Risk Mitigation
* Provide a “Retry automation” button if GSPro layout changes or user intervenes.
* Maintain compatibility matrix: GSPro versions tested vs automation scripts.
* Allow wizard to detect automation failure quickly and fall back to manual instructions rather than blocking run.

## 6. Security & Trust
* Sign automation scripts, and notify users when automation is about to control the mouse/keyboard.
* Offer opt-out for users uncomfortable with automation (benchmark still runs manually).

## 7. Next Steps
1. Reverse-engineer GSPro config paths/settings and document editable fields.
2. Prototype WinAppDriver script for launching Practice Range scenario.
3. Build diagnostics overlay showing automation state and how long each step takes.
