const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const c = { window: {}, Math };
c.window = c;
vm.createContext(c);
for (const file of [
  "lessons.js",
  "content.js",
  "courses.js",
  "questions.js",
  "boss.js",
])
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), c);
const bag = new c.EchoQuestions.QuestionBag({
    getItem: () => null,
    setItem() {},
  }),
  boss = c.EchoBoss.create();
assert.equal(boss.health, 10);
let previous = null;
for (let cycle = 0; cycle < 10; cycle++) {
  const categories = [];
  for (let i = 0; i < 10; i++) {
    const question = c.EchoBoss.question(boss, cycle * 10 + i, bag);
    assert(question.answer);
    categories.push(question.category);
  }
  assert.equal(new Set(categories).size, 10);
  assert.notEqual(categories[0], previous);
  previous = categories.at(-1);
}
const point = c.EchoBoss.point(1000, true);
assert.equal(point.x, 0.74);
assert.equal(point.y, 0.52);
console.log(
  "Passed: ten-topic mixed boss decks, complete coverage each cycle, stable reduced-motion targeting and non-repeating cycle boundaries.",
);
