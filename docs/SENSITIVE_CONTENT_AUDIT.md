# Sensitive-content audit

Audit date: 2026-07-30.

Scope: every public source, schema, scenario, fixture, JSON, YAML, Markdown,
test, script, package manifest, and workflow file in the release candidate.

Automated rules check for:

- private keys, GitHub tokens, cloud access keys, provider secret keys, Slack
  tokens, bearer tokens, assigned API keys, OAuth client secrets, passwords,
  access tokens, and cookies;
- database connection strings and webhook addresses;
- email and IP addresses;
- absolute Windows and Unix paths;
- internal hostnames;
- environment, credential, key, certificate, database, dump, and log filenames;
- unexpected top-level files, symbolic links, and unapproved GitHub
  configuration;
- prohibited private product references.

Manual review covered generated JSON fixtures, YAML workflow configuration,
Markdown claims, fictional identifiers, URLs, schemas, and the dependency
lockfile. The committed people, organizations, systems, accounts, and lineage
records are synthetic scenario facts; no copied real identifier was identified.
No owner name or local absolute path occurs in public file content.

The Enterprise Depth review additionally covered all nine configurations,
three full exports, the acceptance summary, intervention checkpoint and branch,
causal records, journal entries, record-lineage observations, and benchmark
documentation. All names remain generic fictional labels and all output remains
synthetic and non-authoritative.

The Ecosystem Depth review covers all seven configurations, multiparty
contracts, shared-citizen contexts, three full exports, intervention artifacts,
cross-organization lineage, and benchmark documentation. All counterparties,
identifiers, transactions, and cascade effects are fictional.

The Economy Depth review covers all seven configurations, synthetic citizens,
households, organizations, institutions, three full exports, intervention
artifacts, transactions, bank and tax records, shocks, and benchmarks. Labels
and identifiers remain fictional and generated; no real economic or personal
records are included.

The browser-product review covers application source, generated production
HTML, CSS, JavaScript and font assets, Web Worker messages, static-host headers,
downloads, package metadata, browser tests, and deployment configuration. The
runtime has no credential, analytics, telemetry, provider, private URL, or
server-storage surface. Its local project-file import is bounded, versioned,
allowlisted, and never transmitted. Browser exports retain synthetic and
non-authoritative labels.

Gitleaks and TruffleHog executables were not installed in the local environment,
so they were not represented as completed checks. The repository's explicit
scanner and public-tree policy both passed with zero findings. `npm audit
--omit=dev` reported zero known vulnerabilities.

Run:

```bash
npm run verify:public
npm run scan:sensitive
```

This record covers the repository tree, not account settings or Git commit
author metadata. Repository owners should review those separately before
changing visibility.
