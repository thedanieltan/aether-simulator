# Sensitive-content audit

Audit date: 2026-07-28.

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
