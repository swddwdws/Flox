/* dev harness for mc_world.js — the module author owns this file.
   Render it with:  NODE_PATH=/opt/node22/lib/node_modules node tools/render.js \
     --html dev_world.html --out out/dev_world --times 0,1,2,3
   It is NOT part of the film. */
SCENES.__demo = { draw(ctx, lt, t) { MC.hudMode = 0; } };
