const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  context = { window: {}, Math };
vm.createContext(context);
for (const file of [
  "rhythm.js",
  "drills.js",
  "questions.js",
  "lessons.js",
  "content.js",
  "courses.js",
])
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context);
const { CharacterDrill, randomSequence } = context.window.EchoDrills;
const flush = () => new Promise((resolve) => setImmediate(resolve));
function makeAudio() {
  return {
    now: 0,
    calls: [],
    async prepare() {},
    cancel() {},
    async play(text, speed, lead, options = {}) {
      const plan = context.window.EchoRhythm.pattern(text, speed, options),
        start = options.startAt?.wall ?? this.now + lead * 1000;
      this.calls.push({ text, speed, start });
      return {
        events: plan.events.map((event) => ({
          ...event,
          born: start + event.offset * 1000,
          deadline: start + (event.offset + plan.window) * 1000,
          resolved: false,
        })),
        nextStart: {
          wall: start + plan.duration * 1000,
          audio: start / 1000 + plan.duration,
        },
      };
    },
  };
}
(async () => {
  const expectedIntervals = [2.4, 1.8, 1.2, 0.85, 0.6, 0.4];
  for (const [index, speed] of [60, 80, 100, 130, 160, 200].entries()) {
    const plan = context.window.EchoRhythm.pattern("NMNL159W", speed, {
      cadence: "drill",
    });
    assert.equal(plan.window, expectedIntervals[index]);
    for (let i = 1; i < plan.events.length; i++)
      assert(
        Math.abs(
          plan.events[i].offset -
            plan.events[i - 1].offset -
            expectedIntervals[index],
        ) < 1e-9,
        "Each sound has the same intentional typing interval",
      );
    assert(Math.abs(plan.duration - expectedIntervals[index] * 8) < 1e-9);
  }
  assert.match(randomSequence("letters", 10000), /^[A-Z]{10000}$/);
  assert.match(randomSequence("digits", 10000), /^\d{10000}$/);
  assert.throws(() => randomSequence("mixed", 10));
  for (const kind of ["letters", "digits"]) {
    const audio = makeAudio(),
      drill = new CharacterDrill(audio, { kind, total: 120 });
    assert(await drill.start());
    assert.equal(drill.scheduled, 48);
    assert.equal(
      audio.calls[1].start,
      drill.events[24].born,
      "Second batch starts on exact shared clock",
    );
    for (let i = 0; i < 30 && !drill.complete; i++) {
      const active = drill.events.filter((event) => !event.resolved);
      active.forEach((event) => (event.resolved = true));
      audio.now = active.at(-1)?.deadline ?? audio.now;
      drill.maintain(audio.now);
      await flush();
    }
    assert(drill.complete);
    assert.equal(drill.scheduled, 120);
    assert.equal(audio.calls.map((call) => call.text).join("").length, 120);
    assert.match(
      audio.calls.map((call) => call.text).join(""),
      kind === "letters" ? /^[A-Z]+$/ : /^\d+$/,
    );
  }
  const audio = makeAudio(),
    endless = new CharacterDrill(audio, { kind: "letters" });
  await endless.start();
  const completed = endless.events.slice(0, 7);
  completed.forEach((event) => {
    event.resolved = true;
    event.correct = true;
  });
  const pending = endless.events
      .filter((event) => !event.resolved)
      .map((event) => event.char)
      .join(""),
    indices = endless.events.map((event) => event.index);
  endless.pause();
  endless.speed = 200;
  assert(await endless.resume());
  assert.equal(
    endless.events
      .filter((event) => !event.resolved)
      .slice(0, pending.length)
      .map((event) => event.char)
      .join(""),
    pending,
  );
  assert.deepEqual(
    Array.from(endless.events.slice(0, indices.length), (event) => event.index),
    Array.from(indices),
  );
  assert.equal(endless.events.filter((event) => event.correct).length, 7);
  assert.equal(audio.calls.at(-1).speed, 200);
  const pendingCount = endless.events.filter((event) => !event.resolved).length;
  for (let i = 0; i < 20; i++) await endless.resume();
  assert.equal(
    endless.events.filter((event) => !event.resolved).length,
    pendingCount,
    "Repeated replay does not grow the pending queue",
  );
  for (let i = 0; i < 1000; i++) {
    const batch = endless.events.filter((event) => !event.resolved);
    batch.forEach((event) => (event.resolved = true));
    audio.now = batch.at(-1).deadline;
    endless.maintain(audio.now);
    await flush();
    assert(endless.events.length <= 64, "Endless event history stays bounded");
  }
  assert(endless.scheduled > 24000);
  assert.equal(endless.complete, false);
  let resolvePrepare;
  const slow = makeAudio();
  slow.prepare = () => new Promise((resolve) => (resolvePrepare = resolve));
  const cancelled = new CharacterDrill(slow, { kind: "digits" }),
    starting = cancelled.start();
  cancelled.pause();
  resolvePrepare();
  assert.equal(await starting, false);
  assert.equal(
    slow.calls.length,
    0,
    "Cancelled decoding cannot schedule ghost audio",
  );
  const saved = {},
    storage = {
      getItem: (key) => saved[key],
      setItem: (key, value) => (saved[key] = value),
    };
  const { QuestionBag } = context.window.EchoQuestions,
    pool = Array.from({ length: 50 }, (_, i) => ({ answer: "Name " + i }));
  let bag = new QuestionBag(storage),
    first = [];
  for (let i = 0; i < 50; i++) first.push(bag.pick("names", pool).answer);
  assert.equal(new Set(first).size, 50);
  bag = new QuestionBag(storage);
  assert.notEqual(bag.pick("names", pool).answer, first.at(-1));
  const next = [];
  for (let i = 0; i < 49; i++) next.push(bag.pick("names", pool).answer);
  assert.equal(new Set(next).size, 49);
  assert.equal(bag.pick("names", [{ answer: "new" }]).answer, "new");
  assert.equal(bag.pick("names", [{ answer: "new" }]).answer, "new");
  const courses = Object.values(context.window.EchoCourses).filter(
    (course) => !course.stream,
  );
  assert.equal(
    courses.reduce((sum, course) => sum + course.bank.length, 0),
    420,
  );
  assert.equal(
    courses.reduce((sum, course) => sum + course.pages.length, 0),
    42,
  );
  for (const course of courses) {
    assert.equal(
      new Set(course.bank.map((item) => item.answer.toLowerCase())).size,
      course.bank.length,
    );
    for (const page of course.pages) assert.equal(page.items.length, 10);
  }
  console.log(
    "Passed: isolated character sets, finite goals, 24,000+ endless characters with bounded memory, continuous timing, pause/speed/cancellation, persistent no-repeat bags and 420 questions across 42 lessons.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
