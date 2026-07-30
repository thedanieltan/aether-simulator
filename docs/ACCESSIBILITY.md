# Accessibility

The browser studio targets WCAG 2.1 AA for its implemented workflow.

- Semantic headings, landmarks, forms, buttons, status output, and a skip link
  support keyboard and assistive-technology navigation.
- The command navigator uses the browser's native modal focus behavior and
  supports Escape, Enter, and arrow keys.
- Local project creation, import, export, recovery, and error states expose
  labelled controls and live status text.
- All controls remain keyboard operable; visible focus indicators are retained.
- Text and control colors use the Cobalt token palette with AA contrast.
- Motion is limited and collapses under `prefers-reduced-motion`.
- Graph content has an accessible name; timeline and inspector views expose the
  same facts as text.
- Layout acceptance covers 320, 375, 414, and 768 CSS-pixel widths without
  horizontal overflow.

Automated Playwright acceptance runs Axe against the completed studio workflow
and rejects WCAG A or AA violations. Automated checks do not replace review
with screen readers, zoom, high-contrast modes, and users with disabilities.
Those remain recommended manual review items for a broader release.
