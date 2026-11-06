const path = require("node:path");
const root = path.resolve(__dirname, "..");
const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert");
class Element {
  constructor(id = "") {
    this.id = id;
    this.value = "";
    this.disabled = false;
    this.textContent = "";
    this.children = [];
    this.options = [];
    this.dataset = {};
    this.handlers = {};
    this.states = new Set();
    this.classList = {
      add: (x) => this.states.add(x),
      remove: (...x) => x.forEach((v) => this.states.delete(v)),
      toggle: (x, yes) => (yes ? this.states.add(x) : this.states.delete(x)),
    };
    this.parts = {};
    this.style = {};
    this.attributes = {};
  }
  addEventListener(k, f) {
    this.handlers[k] = f;
  }
  append(...nodes) {
    this.children.push(...nodes);
    this.options = this.children;
  }
  replaceChildren() {
    this.children = [];
    this.options = this.children;
  }
  focus() {}
  setAttribute(name, value) {
    this.attributes[name] = value;
  }
  showModal() {
    this.open = true;
  }
  querySelector(k) {
    return (this.parts[k] ??= new Element());
  }
  getContext() {
    return {};
  }
}
const ids = [
  "best",
  "missionLabel",
  "waveLabel",
  "score",
  "combo",
  "health",
  "canvas",
  "space",
  "introNotice",
  "signal",
  "targetKind",
  "spaceState",
  "prompt",
  "modeBadge",
  "slots",
  "slotCount",
  "answer",
  "fire",
  "pause",
  "stop",
  "replay",
  "feedback",
  "mode",
  "modeDescription",
  "studyPlan",
  "lessonNote",
  "lessonResults",
  "resultsTitle",
  "resultsScore",
  "resultsSummary",
  "resultsList",
  "retryMistakes",
  "replayLesson",
  "difficulty",
  "difficultyDescription",
  "voice",
  "previewVoice",
  "category",
  "learning",
  "studyDescription",
  "subjectNav",
  "topicInfo",
  "pace",
  "paceDescription",
  "start",
  "fullscreen",
  "introStart",
  "help",
  "helpDialog",
  "missionProgress",
  "progressFill",
];
const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
elements.learning.options = [new Element(), new Element(), new Element()];
elements.learning.value = "reflex";
elements.mode.value = "practice";
elements.studyPlan.value = "random";
elements.difficulty.value = "medium";
elements.voice.value = "sonia";
elements.pace.value = "100";
let now = 0,
  jobs = [],
  jobId = 0,
  lastSpeech,
  shots = 0,
  damages = 0;
function advance(ms) {
  const end = now + ms;
  while (true) {
    jobs.sort((a, b) => a.at - b.at);
    const item = jobs.find((j) => !j.cancelled);
    if (!item || item.at > end) break;
    jobs.splice(jobs.indexOf(item), 1);
    now = item.at;
    item.fn();
  }
  now = end;
}
const doc = {
  hidden: false,
  getElementById: (id) => elements[id],
  createElement: () => new Element(),
  createTextNode: (text) => ({ textContent: text }),
  addEventListener(k, f) {
    this[k] = f;
  },
  querySelector: () => new Element(),
};
const storage = {};
const c = {
  document: doc,
  performance: { now: () => now },
  localStorage: {
    getItem(key) {
      return storage[key] || null;
    },
    setItem(key, value) {
      storage[key] = value;
    },
  },
  speechSynthesis: {
    cancel() {},
    getVoices() {
      return [{ lang: "en-GB" }];
    },
    speak(u) {
      lastSpeech = u;
    },
  },
  SpeechSynthesisUtterance: class {
    constructor(text) {
      this.text = text;
    }
  },
  SpaceRenderer: class {
    reset() {}
    shoot() {
      shots++;
    }
    impact() {
      damages++;
    }
    wrong() {}
  },
  setTimeout(fn, delay) {
    const j = { id: ++jobId, at: now + delay, fn };
    jobs.push(j);
    return j.id;
  },
  clearTimeout(id) {
    const j = jobs.find((j) => j.id === id);
    if (j) j.cancelled = true;
  },
  addEventListener() {},
  Math,
  console,
};
c.window = c;
vm.createContext(c);
for (const f of ["lessons.js", "courses.js", "rhythm.js"])
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c);
c.EchoRhythm.RhythmAudio = class {
  setVoice(key) {
    this.voice = key;
  }
  async ready() {}
  cancel() {}
  narrate(text) {
    return new Promise((resolve) => {
      lastSpeech = { text, onend: resolve };
    });
  }
  async play(text, speed, lead) {
    const p = c.EchoRhythm.pattern(text, speed);
    return {
      events: p.events.map((e) => ({
        ...e,
        born: now + (lead + e.offset) * 1000,
        deadline: now + (lead + e.offset + p.window) * 1000,
        resolved: false,
      })),
      duration: p.duration * 1000,
    };
  }
};
vm.runInContext(fs.readFileSync(path.join(root, "game.js"), "utf8"), c);
const e = (source) => vm.runInContext(source, c);
const flush = () => new Promise((r) => setImmediate(r));
(async () => {
  assert.equal(elements.subjectNav.children.length, 10);
  const p100 = c.EchoRhythm.pattern("OXFORD AVENUE", 100),
    p300 = c.EchoRhythm.pattern("OXFORD AVENUE", 300);
  assert(Math.abs(p100.duration / 3 - p300.duration) < 0.001);
  assert.equal(p100.events.map((x) => x.char).join(""), "OXFORDAVENUE");
  assert(p100.events[4].offset - p100.events[3].offset > 0.7);
  await e("start()");
  assert.equal(lastSpeech.text, e("game.item.spoken"));
  assert.equal(e("game.events.length"), 0, "Whole word must precede spelling");
  lastSpeech.onend();
  await flush();
  advance(1100);
  await flush();
  assert(e("game.events.length") > 0);
  const born = e("game.events[0].born");
  advance(born - now + 20);
  const ch = e("game.events[0].char");
  e("type(" + JSON.stringify(ch) + ")");
  assert.equal(shots, 1);
  assert.equal(e("game.hits"), 1);
  e("type(" + JSON.stringify(ch) + ")");
  assert.equal(shots, 1, "Do not fire twice for same token");
  advance(e("game.events[1].deadline") - now + 1);
  e("tick(performance.now())");
  assert.equal(e("game.health"), 6, "Practice must not lose shield");
  assert(e("game.misses") >= 1);
  e("pause()");
  const misses = e("game.misses");
  advance(20000);
  e("tick(performance.now())");
  assert.equal(e("game.misses"), misses, "Paused time must not cause damage");
  e("pause()");
  await flush();
  assert.equal(
    e("game.hits"),
    1,
    "Resume must preserve hits without granting duplicates",
  );
  e("setSubject('money')");
  assert.equal(elements.learning.value, "phrase");
  assert(elements.learning.options[0].disabled);
  await e("start()");
  assert.equal(e("game.learning"), "phrase");
  lastSpeech.onend();
  await flush();
  assert.equal(e("game.events.length"), 1);
  const answer = e("game.item.answer");
  elements.answer.value = answer;
  e("type(" + JSON.stringify(answer) + ",false)");
  assert.equal(e("game.hits"), 0, "Whole answers need Enter or fire");
  e("type(" + JSON.stringify(answer) + ",true)");
  assert.equal(e("game.hits"), 1);
  assert.equal(e("game.score"), 50);
  e("setSubject('phone')");
  elements.learning.value = "reflex";
  elements.mode.value = "mission";
  await e("start()");
  await flush();
  advance(12000);
  e("tick(performance.now())");
  assert.equal(e("game.running"), false);
  assert.equal(e("game.health"), 0);
  assert.equal(elements.category.disabled, false);
  for (const preset of [60, 80, 100, 130, 160, 200]) {
    e("speed(" + preset + ")");
    assert.equal(elements.pace.value, String(preset));
  }
  e("speed(300)");
  assert.equal(elements.pace.value, "100");
  for (const [difficulty, hp] of [
    ["easy", 10],
    ["medium", 6],
    ["hard", 3],
  ]) {
    elements.difficulty.value = difficulty;
    await e("start()");
    await flush();
    assert.equal(e("game.maxHealth"), hp);
    assert.equal(e("game.health"), hp);
    assert.equal(elements.health.textContent, hp + " / " + hp);
    for (let i = 0; i < hp; i++) {
      const deadline = e("game.events[" + i + "].deadline");
      advance(deadline - now + 1);
      e("tick(performance.now())");
      assert.equal(e("game.health"), hp - i - 1);
      assert.equal(e("game.running"), i < hp - 1);
    }
  }
  elements.voice.value = "ryan";
  e("configureVoice()");
  assert.equal(e("audio.voice"), "ryan");
  elements.voice.value = "sonia";
  e("configureVoice()");
  assert.equal(e("audio.voice"), "sonia");
  for (const course of Object.values(c.EchoCourses)) {
    assert.equal(course.items.length, 10);
    assert.equal(
      new Set(course.items.map((i) => i.answer)).size,
      10,
      "Each lesson needs distinct questions",
    );
  }
  e("setSubject('money')");
  elements.studyPlan.value = "series";
  elements.mode.value = "practice";
  elements.learning.value = "phrase";
  await e("start()");
  assert.equal(e("game.roundLimit"), 10);
  assert.equal(e("game.text"), c.EchoCourses.money.items[0].answer);
  for (let index = 0; index < 10; index++) {
    assert.equal(e("game.round"), index + 1);
    assert.equal(e("game.text"), c.EchoCourses.money.items[index].answer);
    lastSpeech.onend();
    await flush();
    if (index === 2) {
      advance(e("game.lastDeadline") - now + 1);
      e("tick(performance.now())");
      advance(251);
      e("tick(performance.now())");
    } else {
      e(
        "type(" +
          JSON.stringify(c.EchoCourses.money.items[index].answer) +
          ",true)",
      );
      advance(701);
    }
    advance(1801);
    await flush();
  }
  assert.equal(e("game.running"), false);
  assert.equal(e("game.results.length"), 10);
  assert.equal(e("game.results.filter(r=>r.correct).length"), 9);
  assert.equal(elements.resultsScore.textContent, "9 / 10");
  assert.equal(e("courseProgress['money:phrase'].bestCorrect"), 9);
  assert.equal(e("lastMistakes.length"), 1);
  assert.equal(elements.retryMistakes.disabled, false);
  elements.retryMistakes.handlers.click();
  await flush();
  assert.equal(e("game.mode"), "practice");
  assert.equal(e("game.course"), "review");
  assert.equal(e("game.roundLimit"), 1);
  assert.equal(e("game.text"), c.EchoCourses.money.items[2].answer);
  lastSpeech.onend();
  await flush();
  e("type(" + JSON.stringify(c.EchoCourses.money.items[2].answer) + ",true)");
  advance(701);
  advance(1801);
  await flush();
  assert.equal(e("game.running"), false);
  assert.equal(elements.resultsScore.textContent, "1 / 1");
  assert.equal(
    e("courseProgress['money:phrase'].bestCorrect"),
    9,
    "Review must not overwrite the full-lesson record",
  );
  assert.equal(elements.retryMistakes.disabled, true);

  assert.equal(e("answersMatch('0793 3555','07933555','phone')"), true);
  assert.equal(e("answersMatch('07935555','07933555','phone')"), false);
  assert.equal(e("answersMatch('£15.5','£15.50','money')"), true);
  assert.equal(e("answersMatch('£50','£15.50','money')"), false);
  assert.equal(e("answersMatch('BA-256','Flight BA256','codes')"), true);
  assert.equal(e("answersMatch('BA265','Flight BA256','codes')"), false);
  assert.equal(e("answersMatch('nextjs','Next.js','work')"), true);
  assert.equal(e("answersMatch('Steven','Stephen','names')"), false);
  assert.equal(elements.missionProgress.attributes["aria-valuenow"], "1");
  elements.studyPlan.value = "random";
  elements.mode.value = "practice";
  await e("start()");
  await flush();
  elements.help.handlers.click();
  assert.equal(e("game.paused"), true);
  assert.equal(elements.helpDialog.open, true);
  doc.keydown({ key: "Escape", preventDefault() {} });
  assert.equal(
    e("game.paused"),
    true,
    "Closing help must not resume flight accidentally",
  );
  elements.helpDialog.open = false;
  doc.keydown({ key: "Escape", preventDefault() {} });
  await flush();
  assert.equal(e("game.paused"), false);
  elements.voice.value = "ryan";
  doc.change();
  assert.equal(JSON.parse(storage.echoFlightPreferences).voice, "ryan");
  elements.voice.value = "sonia";
  e("restorePreferences()");
  assert.equal(elements.voice.value, "ryan");
  storage.echoFlightPreferences = JSON.stringify({
    difficulty: "impossible",
    pace: 999,
    voice: "missing",
  });
  elements.difficulty.value = "medium";
  e("restorePreferences()");
  assert.equal(elements.difficulty.value, "medium");
  assert.equal(elements.voice.value, "ryan");
  console.log(
    "Passed: audio rhythm scaling, grouped spelling, natural word before letters, all subjects, hits, pause/resume, phrase answers, six speed presets, three health difficulties voice selection, ten-question ordered lessons, saved progress and mistake review.",
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
