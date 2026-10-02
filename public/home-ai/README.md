# AI-generated homepage concept

`hero-v1.png` is a newly generated, flattened homepage hero illustration. Generated on 2026-09-30 with the built-in image generation tool. The exact prompt is in `hero-v1.prompt.txt`.

Visual reference: the broad palette, ink outlines, grain and cartoon-stage feeling of https://ponpon-mania.com/. The cloud camera robot, octopus director, bird sound operator and film-set composition were newly generated. No reference-site textures are composited into this image.

Version 1 was initially saved as a concept. **The active homepage now uses code-drawn characters** in `src/gl/HomeCodeCharacters.ts`. The approved drawing's contours were converted into editable quadratic Bezier paths in `src/data/home-character-paths.json`, retaining the half-open eyes, hats and props. Flat semantic colors and consistent ink replace the grain and gradients. The reference-style construction uses transparent body/head/arm/prop pieces, overlapping joint patches, head open/closed-eye atlas cells, camera shutter cells and gentle local UV breathing. Only the foreground clouds and balloons still load version 5 cutouts. The orange portal is 13% wider and 6% taller. The earlier revision notes below describe the illustration history, not the current runtime status.

## Revision 2

`hero-v2.png` was produced with the built-in image generation tool using `hero-v1.png` as the edit target and the exact instructions in `hero-v2.prompt.txt`. The user requested more distinctive characters and composition. Version 2 replaces the clean arch with an asymmetric orange liquid screen, enlarges the crew into eccentric expressive silhouettes, lets limbs and equipment cross the screen boundary, and sends film ribbon through the foreground. Version 1 is preserved alongside it. No website code was changed for this image revision.

## Revision 3: blue mask

`hero-v3.png` follows the user's correction that the characters must be inside the blue mask. The built-in image generation tool edited `hero-v2.png`, preserving its eccentric character identities while changing the interior backdrop to periwinkle blue and fitting all characters and equipment within an organic blue silhouette. The exact prompt is `hero-v3.prompt.txt`. The surrounding area is warm cream. Previous versions remain available; the live homepage has not been replaced by this image edit.

## Revision 4: original-style clouds

`hero-v4.png` adds the user's requested cloud treatment, using `hero-v3.png` as the edit target and the original-style homepage screenshot solely as a reference for cloud staging. The built-in image generation tool produced two passes: broad pink foreground clouds and sky ribbons, then a targeted lowering of excessive side clouds. The complete prompt set is in `hero-v4.prompt.txt`. The selected result has a connected pink foreground cloud sea, higher side banks and a lower central opening, receding clouds and horizontal sky ribbons. The new characters remain in the blue scene mask. This is a newly generated single raster illustration saved for review, not a replacement of the live homepage or an animated sprite atlas.

## Revision 5: user's full-screen screenshot

`hero-v5.png` follows the user's latest screenshot and explicit color choice: blue-purple exterior and orange interior. This supersedes the earlier request for a blue interior. The built-in image generation tool used `hero-v4.png` for the new character identities and the provided screenshot for color and full-screen stage composition. The central character is smaller and stands on a podium, the lower supporting characters are larger, the stage is cropped at the top, and broad pink foreground clouds enter from the sides with a low central opening. The exact prompt is in `hero-v5.prompt.txt`. No reference-site character art or typography was pasted into this raster image. Earlier versions are retained.

## Live dynamic homepage — 2026-10-01

The user approved v5 and requested code animation. `scripts/prepare_home_ai_layers.py` extracts visible source pixels with registered palette/contour masks and creates seven transparent WebP layers: three characters, three balloons and the foreground clouds. No further image generation was used for this implementation. Hidden anatomy is not recovered from a flat image.

`HomeAiScene.ts` renders those layers into the existing shared Three.js canvas. `HomeAiShaders.ts` adds weighted vertex articulation, blinks, projector shutter movement, cloud waves and GPU-fluid composition. `HomeAiStage.ts` paints new scenery and the podium. A segmented curved film ribbon and balloon strings are code geometry. The existing `HomeFluid.ts` solver and homepage/works render-target transition are reused.

The repaired `layers/background.*`, contact sheet and rebuild are diagnostic approximations only; the live homepage does not load that repaired background. `hero-v5.png` is the accessible static fallback when WebGL is unavailable. Mobile layouts reposition and resize layers independently. Reduced-motion support stops the fluid, pose and entry movement through the existing environment preference.

## Silhouette repair — 2026-10-01

The first palette masks clipped shaded limbs and dark props. The extraction now selects enclosed source regions bounded by ink outlines, preserves registered arm/foot/prop interiors, and removes unrelated disconnected fragments. The octopus's rectangular tentacle clip was removed. The bird's actual neck, headphone shadows, boom and case are restored from source pixels; the duplicate code neck/boom underlay was removed. Eyelid/shutter coordinates and deformation regions were corrected so the face stays intact. Balloon body masks and string anchors use the measured source locations.

Run `python scripts/verify_home_layers.py` to check the actual runtime WebP sprites for opaque joints/props and clear scenic gaps. Before/after evidence is in `docs/home-art-repair/`.
