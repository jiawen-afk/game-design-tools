# Design

## Foundation

The product is a focused browser workbench for game asset preparation. The visual register is product UI, with a quiet chrome, high information density, and clear working zones.

## Color

- `--color-bg`: `oklch(0.97 0.01 250)`
- `--color-panel`: `oklch(0.995 0.004 250)`
- `--color-panel-strong`: `oklch(0.94 0.018 250)`
- `--color-ink`: `oklch(0.21 0.025 255)`
- `--color-muted`: `oklch(0.43 0.03 255)`
- `--color-line`: `oklch(0.82 0.02 250)`
- `--color-brand`: `oklch(0.49 0.16 245)`
- `--color-accent`: `oklch(0.64 0.14 165)`

Use the brand blue for selected states and primary actions. Use green only for success or active output states.

## Typography

Use system UI fonts for fast loading and predictable Chinese rendering. Headings are compact, with moderate weight contrast. Body copy is short and functional.

## Layout

The homepage uses an app shell with a left tool list and a right preview area on desktop. The active tool uses full-width work sections, compact controls, and restrained borders.

## Components

- Tool list item: one concise name, one line of utility text, direct launch button.
- Work cards: 8px radius, thin border, no decorative shadows.
- Parameter groups: inline controls with stable widths.
- Footer: muted placeholder contact and filing text.

## Motion

Use small hover transitions for buttons and tool rows. Avoid motion that delays tool use. Respect `prefers-reduced-motion`.
