# Licence review

Recommendation: **Apache License 2.0**.

Apache-2.0 is appropriate for this public research simulator because it is
permissive and includes an explicit patent grant. The complete licence text is
present in `LICENSE`, and package metadata declares `Apache-2.0`. The licence
does not require a personal name in the licence text; GitHub identity and
copyright authorship are separate questions.

The retained implementation contains no copied third-party dataset,
proprietary notice, incompatible file-level licence, or proprietary source
material identified by review.

Direct runtime dependencies Ajv 8.20.0 and @noble/hashes 2.2.0 use MIT. Build
and test tooling uses MIT, Apache-2.0, or MPL-2.0 terms.
Locally bundled Inter, Space Grotesk, and JetBrains Mono font assets use
OFL-1.1. These terms are compatible with this repository’s Apache-2.0 source
licence when their file-scoped and notice requirements are preserved. Axe Core
is test-only and is not shipped in the browser bundle. Details and attribution
requirements are recorded in `docs/DEPENDENCIES.md`.

Publication still assumes the repository owner has authority to license every
original contribution. This is an ownership confirmation, not evidence of a
known conflict. If ownership is uncertain for any future contribution, exclude
it until rights are confirmed.
