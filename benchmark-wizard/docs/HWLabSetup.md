# Hardware Lab Setup for Regression Testing

To ensure deterministic results, dedicate lab machines that run automated benchmarks on a schedule.

## 1. Lab Fleet
| Name | Specs | Purpose |
| --- | --- | --- |
| `NN-BENCH-1080` | i5-12400F, RTX 3060, 16 GB RAM, SATA SSD | Baseline 1080p machine for MVP validation. |
| `NN-BENCH-1440` | Ryzen 7 5800X3D, RTX 3070 Ti, 32 GB RAM, NVMe SSD | Mid-tier 1440p testing. |
| `NN-BENCH-4K` | i9-13900K, RTX 4090, 64 GB RAM | High-end stress and 4K automation testing. |

Each machine should have:
* Clean Windows 11 install with latest updates.
* GSPro licensed and configured.
* VS runtimes, PresentMon, AutoHotkey/WinAppDriver.
* Remote access (RDP) for maintenance.

## 2. Scheduling
* **Nightly (2 AM local):** Run CLI harness `practice_range_mvp` and network benchmark.
* **Weekly (Sunday):** Run full wizard UI end-to-end manually or via scripted automation to ensure UX intact.
* **On-demand:** When GSPro releases new version, trigger immediate runs on all machines.

Use Windows Task Scheduler or Azure DevTest Labs schedules to trigger scripts.

## 3. Artifact Collection
* Store run outputs on a shared network share (`\\nn-lab\benchmarks\<machine>\<date>`).
* Mirror to cloud storage (Azure Blob) for historical analysis.
* Retain at least 30 days of artifacts for comparison.

## 4. Monitoring
* Implement simple dashboard (PowerBI or Grafana) showing avg FPS trends per scenario/machine.
* Set alerts if metrics deviate >5% from rolling average, indicating regressions.

## 5. Maintenance
* Update GPU drivers quarterly, logging version used.
* Snapshot machines before major changes so you can revert if automation breaks.
* Document physical hardware (LM dongles, sensors) to ensure LM emulator connections are consistent.
