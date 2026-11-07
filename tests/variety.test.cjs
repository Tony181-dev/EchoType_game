const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const c = { window: {} };
vm.createContext(c);
for (const file of [
  "lessons.js",
  "content.js",
  "courses.js",
  "variety.js",
  "questions.js",
])
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), c);
const courses = c.window.EchoCourses;
assert.equal(
  Object.values(courses).reduce((sum, course) => sum + course.bank.length, 0),
  2426,
);
for (const course of Object.values(courses))
  assert.equal(
    new Set(course.bank.map((item) => item.answer.toLowerCase())).size,
    course.bank.length,
  );
const saved = {},
  storage = {
    getItem: (key) => saved[key],
    setItem: (key, value) => (saved[key] = value),
  };
let seed = 1781;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
let bag = new c.window.EchoQuestions.QuestionBag(storage, random);
const small = Array.from({ length: 7 }, (_, index) => ({
  answer: String(index),
}));
let last;
for (let i = 0; i < 100; i++) {
  const draw = bag.draw("test", small, 5).map((item) => item.answer);
  assert.equal(
    new Set(draw).size,
    5,
    "A round spanning a cycle boundary cannot repeat a question",
  );
  assert.notEqual(draw[0], last);
  last = draw.at(-1);
  bag = new c.window.EchoQuestions.QuestionBag(storage, random);
}
const first = bag
  .draw("names", courses.names.bank, 10)
  .map((item) => item.answer);
const second = bag
  .draw("names", courses.names.bank, 10)
  .map((item) => item.answer);
assert(second.every((answer) => !first.includes(answer)));
console.log(
  "Passed: 2,426 unique questions/variants, persistent random draws, no repeats within a round or before pool exhaustion.",
);
