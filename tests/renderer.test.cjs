const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const context = {
  window: { matchMedia: () => ({ matches: false }) },
  performance: { now: () => 0 },
  requestAnimationFrame() {},
  Math,
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, "..", "space.js"), "utf8") +
    "\nthis.Renderer=SpaceRenderer;",
  context,
);
const make = () =>
  new context.Renderer(
    { getContext: () => ({}) },
    () => ({}),
    () => {},
  );
const renderer = make();
const target = { born: 0, deadline: 1000, lane: 0, kind: "meteor" };
assert.equal(renderer.position(target, -100).p, 0);
assert.equal(renderer.position(target, 2000).p, 1);
assert(Math.abs(renderer.position(target, 1000).x - 0.19) < 1e-10);
renderer.shoot(target, 0);
renderer.updateShots(500);
assert.equal(
  renderer.rings.length,
  1,
  "A delayed frame must still create the impact",
);
assert(renderer.particles.length > 0);
assert.equal(renderer.shots.length, 0);
renderer.updateShots(800);
assert.equal(renderer.rings.length, 1, "Impact must resolve once");
renderer.reset();
renderer.shoot(target, 0);
renderer.updateShots(60);
assert.equal(renderer.rings.length, 0);
renderer.updateShots(120);
renderer.updateShots(150);
assert.equal(renderer.rings.length, 1);
const sixty = make(),
  thirty = make();
sixty.aim = thirty.aim = 0.68;
for (let i = 0; i < 60; i++) sixty.updateSteering(1 / 60, false);
for (let i = 0; i < 30; i++) thirty.updateSteering(1 / 30, false);
assert(
  Math.abs(sixty.heroY - thirty.heroY) < 1e-10,
  "Steering must cover the same distance at different frame rates",
);
const before = sixty.heroY;
sixty.updateSteering(1, true);
assert.equal(sixty.heroY, before);
renderer.reset();
renderer.reduced.matches = true;
renderer.burst(0.5, 0.5, "#ffffff", 100);
assert.equal(renderer.particles.length, 5);
console.log(
  "Passed: delayed-frame explosions, single hit resolution, frame-independent steering, pause and reduced effects.",
);
