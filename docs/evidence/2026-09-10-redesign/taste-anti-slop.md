# Taste MCP — anti-slop guardrails (2026-09-10 · get_anti_slop_guardrails 원문)

> 출처: https://mcp.buildwithtaste.com/mcp · 도구 get_anti_slop_guardrails · OAuth(taste.read)로 읽음.
> 같은 계정의 taste profile·samples·collections·portfolio 는 전부 0건이었다 (get_taste_profile: "You haven't generated a taste profile yet").

The following patterns are statistically overused in AI-generated design. Do not hard-avoid them, but never use them as unexamined defaults. Every visual choice should be intentional, not a fallback. If the user's taste profile or saved samples explicitly favor any of these patterns, respect that preference over these guardrails.

### Color
- Do not default to blue-500/indigo-600 as the primary color. Over 60% of AI-generated interfaces use this range. Derive primaries from the user's palette or brand instead.
- Avoid blue-to-purple gradient hero backgrounds unless the user's samples show a preference for them.
- Do not use gray-50 (#F9FAFB) as the default background. Use warm off-whites, tinted neutrals, or colors that relate to the primary palette.
- Build palettes with depth: at minimum include primary, secondary, accent, background, surface, text, muted, and semantic (success/warning/error) colors. A 3-4 color palette reads as unconfigured.

### Typography
- Do not default to Inter. If using Inter, pair it with a display typeface that adds personality.
- Vary font weight across heading levels instead of using bold (700) for all headings.
- Adjust letter-spacing by size: tighter tracking on large display text, looser on small text.
- Set different line-heights per context: tighter for headings (~1.1-1.2), standard for body (~1.5-1.6).

### Layout
- Do not default to a 3-column equal grid for every section. Use asymmetric grids, varied column widths, or single-column layouts where appropriate.
- Vary section padding rather than applying uniform vertical padding to every section.
- Do not center-align all content. Left-align body content by default and reserve centering for intentional moments.
- Break rigid alternating patterns (image-left/text-right, then image-right/text-left).

### Animation
- Do not apply fade-up-on-scroll to every element. Reserve animation for key moments. Stillness is a craft signal.
- Do not use the same duration (300ms) and easing (ease-in-out) on every transition. Vary timing by element size and importance.
- Avoid infinite pulse/bounce animations on badges or indicators.
- Avoid typewriter effects on hero headings and counting-number animations on stats.

### Components
- Do not default to the icon-in-circle + heading + paragraph card for feature sections. Consider numbered lists, definition lists, or prose with inline emphasis.
- Avoid the standard hero template of badge-pill + large heading + subtitle + two buttons (primary + ghost) unless the content structure genuinely calls for it.
- Do not use three identical testimonial cards with circular avatars as the default social proof pattern.
- Avoid glassmorphism (backdrop-blur cards) as decoration. Use it only when layering serves a functional purpose.

### Spacing
- Do not use a strict 4px/8px grid for every value. Introduce intentional variation.
- Vary padding by content type: text-heavy areas may need more breathing room, dense UI less.
- Adjust spacing relationships between elements based on their semantic relationship, not a uniform margin between all siblings.

### Craft Signals
When building from scratch, consider adding these details that signal intentional design:
- Custom text selection colors (::selection) using the brand palette
- Balanced text wrapping on headings (text-wrap: balance)
- Proper focus-visible styles using brand colors instead of browser defaults
- Tabular figures (font-variant-numeric: tabular-nums) in data displays
- prefers-reduced-motion support wrapping all animations
- Custom underline styling (text-underline-offset, text-decoration-thickness) on links

When in doubt, check the user's reference samples above. Their saved screenshots are the ground truth for what they consider good design.
