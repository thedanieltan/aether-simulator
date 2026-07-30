# Security policy

This repository accepts synthetic data only. Do not submit credentials, real
personal data, private infrastructure identifiers, provider account data,
production logs, database files, or confidential evidence.

Report a suspected vulnerability through the repository host's private
vulnerability-reporting feature. Do not include live secrets in a report.
Revoke or rotate an exposed credential before sharing a redacted description.

The maintainers will acknowledge supported reports on a best-effort research
basis. There is no production service or operational service-level commitment.

The static browser product has no upload, authentication, analytics, telemetry,
provider, or server-side storage path. It uses same-origin content-security
headers on compatible hosts. See `docs/THREAT_MODEL.md` for the implemented
boundary and residual risks.
