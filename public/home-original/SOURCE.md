# Homepage reference assets

Source: https://ponpon-mania.com/ — artwork credited by the reference to Justine Soulié, development to Patrick Heng.

These PNG/WebP files were copied from the locally archived public frontend at `ponpon-public-source/site/textures/home/`. They are the reference's original artwork, not newly generated portfolio images. The original authors retain their rights.

The active `HomeAiScene` uses `ponpon-mask.webp`, the original portal GLSL and the original procedural cloud GLSL. `HomeForegroundClouds.ts` adapts the archived cloud spring/repulsion logic to Three.js. `HomeReferenceParticles.ts` also uses `night-star.webp` and `night-firefly.webp`, the original YJ/FJ shaders and the original JJ fireworks shaders and motion formulas. Their world coordinates and point-size units are adapted to the portfolio's larger coordinate system. The three current portfolio characters are drawn from the user's approved illustration using their own curve data and joint parts. The other reference textures remain available for the historical, inactive `HomeScene` implementation. Selected original shaders and their public bundle hash are recorded in `src/gl/HomeOriginalShaders.ts` and `docs/reference-home-mechanism.md`.

The earlier cinema illustration in `public/home/` is historical and is no longer used by the current homepage.

The v8 adapter expands the foreground cloud bank from the reference's 40 instances to 64 in two staggered rows. It enlarges the portal, increases the portfolio camera orbit/depth separation, and animates the three existing portfolio balloon images with staggered rising loops and trailing ropes. These counts, camera settings and balloon animation are portfolio adaptations; they are not claimed to be the reference's exact parameters.
