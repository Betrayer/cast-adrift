import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/app/color";
import { THEMES } from "@/data/themes";
import { SCHOOL_IDS, tintedSchools } from "@/data/schools";

const AA_BODY = 4.5;
const AA_LARGE = 3;

describe("theme contrast (WCAG AA)", () => {
  for (const theme of THEMES) {
    const surfaces = [
      theme.palette.bg,
      theme.palette.surface1,
      theme.palette.surface2,
    ];

    it(`${theme.id}: body text clears ${String(AA_BODY)}:1 on every surface`, () => {
      for (const surface of surfaces) {
        expect(contrastRatio(theme.palette.text, surface)).toBeGreaterThanOrEqual(
          AA_BODY,
        );
        expect(contrastRatio(theme.palette.dim, surface)).toBeGreaterThanOrEqual(
          AA_BODY,
        );
      }
    });

    it(`${theme.id}: faint and accents clear ${String(AA_LARGE)}:1 on every surface`, () => {
      for (const surface of surfaces) {
        for (const token of [
          theme.palette.faint,
          theme.palette.accent,
          theme.palette.danger,
          theme.palette.amber,
        ]) {
          expect(contrastRatio(token, surface)).toBeGreaterThanOrEqual(AA_LARGE);
        }
      }
    });

    it(`${theme.id}: school strokes stay legible on their own die fill`, () => {
      const palette = tintedSchools(theme.schoolTint);
      for (const id of SCHOOL_IDS) {
        const colors = palette[id];
        expect(contrastRatio(colors.stroke, colors.fill)).toBeGreaterThanOrEqual(
          AA_LARGE,
        );
        expect(contrastRatio(colors.text, colors.fill)).toBeGreaterThanOrEqual(
          AA_BODY,
        );
      }
    });

    // Only a single-hue theme has to carry school identity in luminance; the
    // others separate by hue, and every theme separates by glyph shape.
    it(`${theme.id}: school strokes are separable by luminance alone`, () => {
      if (theme.schoolTint?.monochrome !== true) return;
      const palette = tintedSchools(theme.schoolTint);
      const ratios = SCHOOL_IDS.map((id) =>
        contrastRatio(palette[id].stroke, theme.palette.bg),
      ).sort((a, b) => a - b);
      for (let i = 1; i < ratios.length; i += 1) {
        const prev = ratios[i - 1] ?? 0;
        const next = ratios[i] ?? 0;
        expect(next / prev).toBeGreaterThan(1.1);
      }
    });
  }
});
