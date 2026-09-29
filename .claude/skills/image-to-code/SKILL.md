---
name: image-to-code
description: Converts a design reference image into frontend code. Use when the user shares a screenshot, mockup, or design reference and wants it built.
---

# Image to Code

Turn a design reference image into clean, usable frontend code.

## Process

1. **Look carefully** at the attached image. Identify:
   - Layout structure (header, hero, sections, footer - or app shell regions)
   - Color palette (extract 3-5 dominant colors with approximate hex)
   - Typography (serif/sans, weights, approximate sizes, hierarchy)
   - Components (buttons, cards, inputs, nav, badges - note variants)
   - Spacing rhythm (tight/airy, section gaps, card padding)
   - Signature details (the 2-3 things that give it character)

2. **Plan** before coding: write a 5-10 line structure outline (sections + components), note the palette and font choices.

3. **Build** with semantic HTML and modern CSS (or the project's framework):
   - Match layout and hierarchy first, then colors/type, then details
   - Use CSS variables for the extracted palette
   - Make it responsive (stack on mobile, preserve hierarchy)
   - Preserve the important details that make the reference distinctive - don't flatten everything into generic cards

4. **Verify**: compare your output against the reference mentally:
   - Does the hierarchy match?
   - Are the signature details present?
   - Would someone recognize it as the same design?

## Notes

- If the image is low quality, say what you inferred vs. what was unclear, and pick sensible defaults.
- Don't copy copyrighted assets (logos, photos, brand art) - recreate layout and style with placeholders.
- Ask which framework the project uses if it's not obvious; default to clean HTML/CSS if unsure.
