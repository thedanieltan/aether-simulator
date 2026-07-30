# WP-AES-16 acceptance

## Objective

Establish a complete, machine-checked product-level acceptance record for the
standalone local research product.

## Implemented

- `1.0.0-rc.1` release-candidate identity.
- Product acceptance matrix across every public product area.
- Machine check for ten stable routes, sixteen committed scenarios, WP-AES-06
  through WP-AES-16 records, and required README boundaries.
- Consolidated deterministic, portability, browser, package, privacy, security,
  deployment, and live-acceptance evidence.
- Residual-risk register and publish recommendation.

## Excluded from acceptance

- Production readiness and service-level objectives.
- Connected providers or universally validated provider performance.
- Real personal data or operational decision automation.
- Statistical calibration, prediction, or real-world causal effects.
- Browser engines beyond the pinned Chromium journey.

## Verification contract

- `npm run verify:product` must pass inside `npm run verify:ci`.
- All existing deterministic, schema, fixture, drift, package, dependency,
  public-tree, sensitive-content, and browser gates remain mandatory.
- Hosted acceptance must exercise the exact immutable candidate deployment.

## Disposition

Implemented locally on the work-package branch. Protected integration,
candidate deployment, hosted acceptance, and the final release tag remain
pending.

