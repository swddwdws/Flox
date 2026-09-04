/* dev harness for mc_hud.js — the module author owns this file.
   Render it with:  NODE_PATH=/opt/node22/lib/node_modules node tools/render.js \
     --html dev_hud.html --out out/dev_hud --times 0,1,2,3
   It is NOT part of the film. */
SCENES.__demo = { draw(ctx, lt, t) { MC.hudMode = 0; } };
