# Support & Debug Workflow

This guide explains how internal support teams should triage benchmark wizard issues and what information to request from users.

## 1. Intake Checklist
When a user reports a problem, ask for:
1. Wizard version (`Help → About`).
2. Scenario ID(s) attempted.
3. GSPro version.
4. Whether network test was run.
5. Support bundle (see below).

## 2. Support Bundle Creation
Users can click “Copy Support Bundle” which generates `<Desktop>/GSProBenchmarkSupport_<timestamp>.zip` containing:
* Latest run folder (hardware.json, metrics, network, report HTML/JSON, PresentMon CSVs).
* `wizard.log` entries around the run.
* Automation script logs (if enabled).
* `settings.json` sans sensitive fields.

Instruct users NOT to share GSPro license keys or personal documents.

## 3. Triaging Common Issues
| Symptom | Steps |
| --- | --- |
| GSPro fails to launch | Verify path in `settings.json`, check wizard log for access denied, ensure antivirus not blocking. |
| PresentMon capture missing | Inspect `wizard.log` for `PresentMonExited` events; confirm CSV exists; rerun with admin privileges if required. |
| LM shots ignored | Confirm GSPro Connect running on expected port; port conflicts in logs; advise user to disable actual LM temporarily. |
| Network test timeout | Check network.json for bytes downloaded; ask user to whitelist URL; confirm no corporate proxy interference. |

## 4. Escalation
* If automation script fails consistently, capture screen recording + automation logs and pass to dev team.
* For crashes, collect Windows Event Viewer entries and crash dumps if available.

## 5. Issue Templates
Create GitHub issue template with fields:
```
## Summary

## Wizard Version

## Scenario(s)

## Attachments
(support bundle link)
```

## 6. Feedback Loop
* Track recurring issues and update `UserGuide.md` troubleshooting table.
* Share weekly summaries with dev team to prioritize fixes.
