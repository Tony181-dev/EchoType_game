const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const c = { window: {} };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, "..", "answers.js"), "utf8"),
  c,
);
const { matches } = c.window.EchoAnswers;
for (const value of [
  "half past six",
  "6:30",
  "06:30",
  "6.30",
  "six thirty",
  "HALF-PAST SIX",
])
  assert(matches(value, "6:30"), value);
for (const value of [
  "a quarter past eight",
  "quarter past eight",
  "8.15",
  "08:15",
  "eight fifteen",
])
  assert(matches(value, "8:15"), value);
for (const value of ["twenty to nine", "8:40", "eight forty"])
  assert(matches(value, "8:40"), value);
assert(matches("quarter to twelve pm", "11:45"));
assert(matches("6:30 p.m.", "18:30"));
assert(matches("noon", "12:00"));
assert(matches("midnight", "0:00"));
for (const value of [
  "6:13",
  "6:60",
  "24:30",
  "half past seven",
  "six thirteen",
])
  assert(!matches(value, "6:30"), value);
for (const value of [
  "13 March",
  "March 13",
  "March 13th",
  "13th of March",
  "the thirteenth of March",
  "13 Mar.",
  "13/03",
  "03/13",
  "13-03",
])
  assert(matches(value, "13 March"), value);
for (const value of [
  "30 March",
  "March the thirtieth",
  "March 30th",
  "30th March",
])
  assert(matches(value, "30 March"), value);
for (const value of [
  "13 March",
  "30 May",
  "March 13rd",
  "30 February",
  "03/04",
  "13 March 2026",
])
  assert(!matches(value, "30 March"), value);
assert(!matches("13rd March", "13 March"));
assert(
  !matches("03/04", "3 April"),
  "Ambiguous numeric dates must not silently swap day/month",
);
assert(matches("6.30", "6:30", { strict: true }));
assert(!matches("half past six", "6:30", { strict: true }));
assert(matches("thirty-first of March", "31 March", { strict: true }));
assert(!matches("the thirteenth of March", "13 March", { strict: true }));
assert(matches("March 13th", "13 March", { strict: true }));
console.log(
  "Passed: semantic time/date variants, ordinal spelling, invalid and ambiguous dates, AM/PM, 12/24-hour equivalence and explicit question limits.",
);
