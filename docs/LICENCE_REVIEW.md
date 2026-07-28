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

The sole direct production dependency is Ajv 8.20.0 under MIT. Its locked
transitive packages use MIT or BSD-3-Clause. These permissive licences are
compatible with Apache-2.0. Preserve their notices when redistributing bundled
dependency source; normal source distribution can rely on package metadata and
the lockfile inventory. Details are recorded in `docs/DEPENDENCIES.md`.

Publication still assumes the repository owner has authority to license every
original contribution. This is an ownership confirmation, not evidence of a
known conflict. If ownership is uncertain for any future contribution, exclude
it until rights are confirmed.
