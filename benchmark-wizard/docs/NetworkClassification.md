# Network Benchmark Classification

The benchmark’s network scenario (`network_download_gold`) classifies systems into NN readiness tiers based on sustained throughput while downloading a synthetic course payload.

## 1. Classification Table
| Tier | Throughput (Mbps) | Label | Guidance |
| --- | --- | --- | --- |
| Gold | ≥ 100 | `gold` | Recommended host for NN compute events and large synchronous downloads. |
| Silver | ≥ 50 and < 100 | `silver` | Suitable host for most shared sessions; may need buffer for concurrent tasks. |
| Moderate | ≥ 25 and < 50 | `moderate` | Good for playing; limit hosting roles to smaller groups. |
| Limited | < 25 | `limited` | Avoid heavy host duties; fine as participant. |

These defaults align with the suggestions in `Benchmarkwizazrd.md`. Thresholds should be configurable via `settings.json` so they can be tuned using real-world data.

## 2. Data Recorded
* `throughput_mbps` – average across the entire download window.
* `elapsed_seconds` – actual run time (≤ `max_duration_seconds`).
* `completed` – flag indicating full file download vs timeout.
* `first_byte_latency_ms` – optional measurement if the HTTP stack exposes it.
* `classification` – resolved tier string (gold/silver/moderate/limited).

Store these fields alongside hardware + scenario metrics in each run’s `network.json` artifact.

## 3. UX Recommendations
1. Surface an opt-in prompt immediately after hardware profiling.
2. Display a live progress bar with instantaneous Mbps to build trust.
3. Allow users to skip the test (metered connection, hotspot).
4. After completion, render a short summary:
   > “Measured 87.3 Mbps – Silver NN node. Ready for most hosted sessions.”

## 4. Telemetry & Privacy
* Only retain aggregate throughput metrics—delete the downloaded file immediately.
* If users opt into cloud uploads, include the classification + throughput without storing the raw URL.
* Respect OS metered-connection flags where possible to skip automatically.
