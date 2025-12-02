# Cloud Upload Strategy (Phase v3)

Future wizard versions may let users upload benchmark results to Neighborhood National services. This document outlines the architecture and privacy model.

## 1. Goals
* Build an anonymized dataset of hardware + performance metrics to inform recommendations.
* Enable opt-in sharing of reports for support or community leaderboards.
* Preserve user trust with transparent consent and minimal PII.

## 2. Data Model
Payload (JSON):
```json
{
  "schema_version": "1.0",
  "run_id": "2024-05-12T04-11-20Z",
  "hardware": {
    "cpu": "Intel Core i7-12700KF",
    "gpu": "NVIDIA RTX 3080",
    "ram_gb": 32
  },
  "scenarios": [
    {
      "id": "practice_range_mvp",
      "avg_fps": 138.2,
      "p1_fps": 112.5,
      "duration_sec": 180
    }
  ],
  "network": {
    "throughput_mbps": 87.3,
    "classification": "silver"
  },
  "wizard_version": "1.2.0",
  "gspro_version": "1.0.15",
  "consent": {
    "upload_metrics": true,
    "share_report_url": false
  }
}
```

Exclude user names, Windows account info, or raw logs unless explicitly requested for support.

## 3. Consent Flow
1. Provide an “Opt into data sharing” toggle during onboarding with link to privacy policy.
2. Allow changing consent at any time under Settings.
3. Before each upload, show summary of what will be sent and let user cancel.

## 4. Transport & Security
* Use HTTPS with mutual TLS or signed tokens (Azure AD B2C / API keys).
* Sign payloads with wizard private key if offline verification desired.
* Queue uploads locally when offline; show status history.

## 5. Backend Expectations
* Provide API endpoint `/api/benchmark-runs` accepting POSTed JSON.
* Validate schema version, store in database, and return run ID.
* Optional: respond with percentile comparisons to display in UI.

## 6. Privacy Safeguards
* Hash hardware IDs if needed; never transmit serial numbers or Windows SIDs.
* Provide “Delete my uploads” option that sends DELETE request with run IDs.
* Keep retention policy (e.g., 24 months) and surface it to users.

## 7. Implementation Steps
1. Define data contract shared between wizard and backend.
2. Build uploader service with retry logic and exponential backoff.
3. Integrate with UI: show upload status per run; allow manual retry.
4. Implement backend storage + analytics pipeline (separate project).
