# CrewMate — Parallel Image Generation

Project-scoped wrapper over the global `parallel-imagegen` skill. Inherits all core mechanics (codex spawn pattern, collision recovery, postprocess, no-throttle rule) and locks in CrewMate-specific output dirs, dimensions, style, and prompt source.

> Core mechanics reference: `~/.claude/skills/parallel-imagegen/SKILL.md`
> All codex spawn templates, collision-recovery sweep, and postprocess rules apply verbatim.

---

## The one rule still applies

**Spawn the entire batch at once.** No waves, no serialization. All concurrent, single message.

---

## CrewMate Output Directories

```
apps/web/public/images/avatars/     worker headshots
apps/web/public/images/jobs/        job before/after photos
apps/web/public/images/ui/          login hero images
```

All paths are absolute from repo root. Never save to `/tmp/`, `~/Downloads/`, or any other location.

---

## Dimensions by Category

| Category | Dimensions | Format |
|---|---|---|
| Avatars | 256×256 | JPG |
| Job photos (before/after) | 800×600 | JPG |
| Login hero (desktop) | 1920×1080 | JPG |
| Login hero (mobile) | 430×200 | JPG |

---

## Style Anchor (lock into every prompt verbatim)

```
Style: photorealistic field service and professional photography.
No artificial HDR, no watermarks, no studio glamour feel.
Before photos: available light only, slightly imperfect framing, realistic
  field documentation — as if taken quickly on a phone.
After photos: same angle as the paired before photo, slightly warmer and
  cleaner feel, work is complete and tidy, still realistic (not glossy).
Avatars: natural light, shallow depth of field, neutral or soft blurred
  background — consistent crop: face fills ~60% of the square,
  chin to top of head, shoulders visible.
```

---

## Prompt Source

All prompts are defined in `docs/PRD/PHOTO-ASSETS.md`. Each entry has:
- Exact filename
- Output path convention
- Dimensions
- Full natural-language generation prompt

**Always read `docs/PRD/PHOTO-ASSETS.md` before generating.** Use the exact prompt from that file for each filename. Do not invent prompts.

---

## Batch Structure (fan out all at once)

Check existing files first:
```bash
find apps/web/public/images -type f -name "*.jpg" | sort
```

Then spawn missing assets in 4 parallel batches — all in a single message:

| Batch | Files | Count |
|---|---|---|
| Avatars | `avatar-*.jpg` | 10 |
| Job before | `*-before-*.jpg` | 16 |
| Job after | `*-after-*.jpg` | 16 |
| UI | `login-milan-hero*.jpg` | 2 |

**Total: 44 images.** Skip any that already exist.

---

## Codex Spawn Template (CrewMate variant)

```bash
REPO="/Users/macbookpro/Documents/RITARODEV/ritarodev-context/Projects/01-Job Hunt/portfolio-projects/crewmate"

codex exec --dangerously-bypass-approvals-and-sandbox \
  "Use your imagegen skill to generate a photorealistic image.
   <PROMPT FROM PHOTO-ASSETS.md>
   Style: <STYLE ANCHOR ABOVE>.
   Output: save as JPG to $REPO/apps/web/public/images/<category>/<filename>.jpg, dimensions <W>x<H>.
   When done, print only the absolute path to the saved file as the last line." \
  2>&1 | tee /tmp/parallel-imagegen/crewmate/<slug>.log
```

All spawns go out in a **single message** with `run_in_background: true`.

---

## After All Spawns Complete

1. **Collision-recovery sweep** — check for missing or duplicate files:
   ```bash
   for f in apps/web/public/images/**/*.jpg; do [ -s "$f" ] || echo "MISSING: $f"; done
   md5 -r apps/web/public/images/**/*.jpg | sort | uniq -d
   ```
   Re-spawn any missing or duplicate slots (in parallel) with a "slightly different composition" nudge.

2. **Report** — list generated files, dimensions, any slots that needed recovery, and total count vs expected (44).

---

## What NOT to Do

- Do not ask for cost approval before spawning — one cost note in the final report is fine
- Do not process in waves — fire everything at once
- Do not save to `/tmp/` — images go to `apps/web/public/images/` only
- Do not invent prompts — use `docs/PRD/PHOTO-ASSETS.md` verbatim
- Do not regenerate files that already exist
