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
  "studyPlanWrap",
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
  "lessonPage",
  "lessonPageWrap",
  "drillLength",
  "drillLengthWrap",
  "nextLesson",
  "sceneRestart",
  "noticeTitle",
  "noticeDetail",
  "previewPace",
  "learningWrap",
  "moneyFormat",
  "moneyFormatWrap",
  "moneyQuestion",
  "moneyInstruction",
  "moneyPrompt",
  "moneyHint",
  "answerCurrency",
  "currencyKey",
  "bossChallenge",
  "bossAfterLesson",
  "bossHud",
  "bossHealth",
  "bossFill",
  "bossPhase",
  "answerPolicy",
  "answerPolicyWrap",
  "timeQuestion",
  "timeInstruction",
  "timeHint",
];
const elements = Object.fromEntries(ids.map((id) => [id, new Element(id)]));
elements.learning.options = [new Element(), new Element(), new Element()];
elements.learning.value = "reflex";
elements.mode.value = "practice";
elements.studyPlan.value = "random";
elements.difficulty.value = "medium";
elements.voice.value = "sonia";
elements.pace.value = "100";
elements.drillLength.value = "120";
elements.moneyFormat.value = "provided";
elements.answerPolicy.value = "flexible";
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
    bossAttack() {
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
for (const f of [
  "lessons.js",
  "content.js",
  "courses.js",
  "questions.js",
  "rhythm.js",
  "drills.js",
  "answers.js",
  "boss.js",
  "voices.js",
])
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c);
c.EchoRhythm.RhythmAudio = class {
  setVoice(key) {
    this.voice = key;
  }
  async ready() {}
  async prepare() {}
  cancel() {}
  narrate(text) {
    return new Promise((resolve) => {
      lastSpeech = { text, onend: resolve };
    });
  }
  async play(text, speed, lead, options = {}) {
    const p = c.EchoRhythm.pattern(text, speed, options);
    const wall = options.startAt?.wall ?? now + lead * 1000;
    return {
      events: p.events.map((e) => ({
        ...e,
        born: wall + e.offset * 1000,
        deadline: wall + (e.offset + p.window) * 1000,
        resolved: false,
      })),
      duration: p.duration * 1000,
      nextStart: {
        wall: wall + p.duration * 1000,
        audio: (wall + p.duration * 1000) / 1000,
      },
    };
  }
};
c.EchoVoiceCatalog.ensure = async () => {};
vm.runInContext(fs.readFileSync(path.join(root, "game.js"), "utf8"), c);
const e = (source) => vm.runInContext(source, c);
const flush = () => new Promise((r) => setImmediate(r));
(async () => {
  assert.equal(elements.subjectNav.children.length, 12);
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
  const answer = e("game.item.answer.replace('£','')");
  elements.answer.value = answer;
  e("type(" + JSON.stringify(answer) + ",false)");
  assert.equal(e("game.hits"), 0, "Whole answers need Enter or fire");
  e("type(" + JSON.stringify(answer) + ",true)");
  assert.equal(e("game.hits"), 1);
  assert.equal(e("game.score"), 50);
  e("setSubject('phone')");
  // Use an 11-digit series item so every health level has enough targets.
  elements.studyPlan.value = "series";
  elements.lessonPage.value = "1";
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
  await e("configureVoice()");
  assert.equal(e("audio.voice"), "ryan");
  elements.voice.value = "sonia";
  await e("configureVoice()");
  assert.equal(e("audio.voice"), "sonia");
  for (const course of Object.values(c.EchoCourses)) {
    if (course.stream || course.boss) continue;
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
          JSON.stringify(
            c.EchoCourses.money.items[index].answer.replace("£", ""),
          ) +
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
  e(
    "type(" +
      JSON.stringify(c.EchoCourses.money.items[2].answer.replace("£", "")) +
      ",true)",
  );
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
  assert.equal(e("answersMatch('15.50','£15.50','money')"), true);
  assert.equal(e("answersMatch('15.5','£15.50','money')"), false);
  assert.equal(e("answersMatch('15,50','£15.50','money')"), false);
  assert.equal(
    e("answersMatch('£15.5','£15.50','money')"),
    false,
    "Only the missing number is entered when £ is prefilled",
  );
  assert.equal(e("answersMatch('£15.50','£15.50','money','required')"), true);
  assert.equal(e("answersMatch('£15.5','£15.50','money','required')"), false);
  assert.equal(
    e("answersMatch('15.50 pounds','£15.50','money','required')"),
    true,
  );
  assert.equal(e("answersMatch('15.50','£15.50','money','required')"), false);
  assert.equal(e("answersMatch('$15.50','£15.50','money','required')"), false);
  assert.equal(e("answersMatch('££15.50','£15.50','money','required')"), false);
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
  e("setSubject('streets')");
  elements.studyPlan.value = "series";
  elements.mode.value = "practice";
  elements.lessonPage.value = "3";
  elements.lessonPage.handlers.change();
  await e("start()");
  assert.equal(e("game.text"), c.EchoCourses.streets.pages[3].items[0].answer);
  assert.equal(e("game.page"), 3);
  e("finish('Done','')");
  elements.nextLesson.handlers.click();
  await flush();
  assert.equal(e("game.page"), 4);
  assert.equal(e("game.text"), c.EchoCourses.streets.pages[4].items[0].answer);
  e("setSubject('letters')");
  assert.equal(elements.learning.value, "reflex");
  assert(elements.learning.disabled);
  assert.equal(elements.drillLengthWrap.hidden, false);
  elements.drillLength.value = "60";
  await e("start()");
  assert.equal(e("game.phase"), "playing");
  assert.equal(e("game.drill.total"), 60);
  assert.match(e("game.events.map(e=>e.char).join('')"), /^[A-Z]+$/);
  advance(e("game.events[0].born") - now + 1);
  e("type(game.events[0].char)");
  assert.equal(e("game.hits"), 1);
  const pending = e("game.events.find(e=>!e.resolved).char");
  e("pause()");
  advance(30000);
  e("tick(performance.now())");
  assert.equal(e("game.misses"), 0);
  e("pause()");
  await flush();
  assert.equal(e("game.events.find(e=>!e.resolved).char"), pending);
  e("speed(160)");
  await flush();
  assert.equal(e("game.drill.speed"), 160);
  assert.equal(e("game.hits"), 1);
  for (let i = 0; i < 80 && e("game.running"); i++) {
    const at = e("game.events.find(e=>!e.resolved)?.born");
    if (at === undefined) {
      e("tick(performance.now())");
      await flush();
      continue;
    }
    advance(Math.max(0, at - now + 1));
    e("type(game.events.find(e=>!e.resolved).char)");
    e("tick(performance.now())");
    await flush();
  }
  assert.equal(e("game.running"), false);
  assert.equal(e("game.hits"), 60);
  assert.equal(e("game.misses"), 0);
  assert.equal(elements.resultsScore.textContent, "100%");
  assert.equal(elements.retryMistakes.hidden, true);
  assert.equal(
    e("Object.values(game.drillStats).reduce((n,s)=>n+s.hits,0)"),
    60,
  );
  e("setSubject('digits')");
  elements.drillLength.value = "endless";
  await e("start()");
  assert.equal(e("game.drill.total"), null);
  assert.match(e("game.events.map(e=>e.char).join('')"), /^\d+$/);
  assert.equal(elements.missionProgress.hidden, true);
  for (let i = 0; i < 5; i++) {
    advance(20000);
    e("tick(performance.now())");
    await flush();
  }
  assert.equal(e("game.running"), true);
  assert.equal(e("game.phase"), "playing");
  e("finish('Done','')");
  assert.equal(elements.introNotice.states.has("hidden"), false);
  assert.equal(elements.introStart.textContent, "↻ Chơi lại");
  assert.equal(elements.sceneRestart.hidden, true);
  e("setSubject('money')");
  elements.mode.value = "practice";
  elements.moneyFormat.value = "required";
  elements.moneyFormat.handlers.change();
  await e("start()");
  assert.equal(elements.moneyQuestion.hidden, false);
  assert.equal(elements.answerCurrency.hidden, true);
  assert.equal(elements.currencyKey.hidden, false);
  lastSpeech.onend();
  await flush();
  const amountRequired = e("game.item.answer.replace('£','')");
  e("type(" + JSON.stringify(amountRequired) + ",true)");
  assert.equal(
    e("game.hits"),
    0,
    "Missing unit is rejected when it is not printed in the question",
  );
  elements.answer.value = amountRequired;
  elements.currencyKey.handlers.click();
  assert.equal(elements.answer.value, "£" + amountRequired);
  e("type(" + JSON.stringify(amountRequired + " pounds") + ",true)");
  assert.equal(
    e("game.hits"),
    1,
    "Keyboard-friendly currency word is accepted",
  );
  elements.sceneRestart.handlers.click();
  await flush();
  assert.equal(e("game.score"), 0);
  assert.equal(e("game.round"), 1);
  assert.equal(elements.sceneRestart.hidden, false);
  e("finish('Done','')");
  elements.moneyFormat.value = "provided";
  storage.echoFlightPreferences = JSON.stringify({
    difficulty: "impossible",
    pace: 999,
    voice: "missing",
  });
  elements.difficulty.value = "medium";
  e("restorePreferences()");
  assert.equal(elements.difficulty.value, "medium");
  assert.equal(elements.voice.value, "ryan");
  e("setSubject('boss')");
  elements.difficulty.value = "medium";
  elements.pace.value = "100";
  elements.answerPolicy.value = "flexible";
  await e("start()");
  assert.equal(e("game.boss.health"), 10);
  assert.equal(e("game.mode"), "mission");
  assert.equal(elements.bossHud.hidden, false);
  elements.answer.value = "unfinished";
  e("makeWholeTarget()");
  assert.equal(e("game.health"), 6, "A draft is not submitted before Enter");
  const bossDeadline = e("game.lastDeadline");
  e("pause()");
  advance(5000);
  e("tick(performance.now())");
  e("pause()");
  assert.equal(
    e("game.lastDeadline"),
    bossDeadline + 5000,
    "Pause preserves remaining boss response time",
  );
  e("type('definitely wrong',true)");
  assert.equal(e("game.health"), 5);
  assert.equal(e("game.misses"), 1);
  e("type('definitely wrong',true)");
  assert.equal(
    e("game.health"),
    5,
    "Repeated input cannot apply the boss attack twice",
  );
  advance(251);
  e("tick(performance.now())");
  advance(1801);
  await flush();
  for (let hp = 9; hp >= 0; hp--) {
    e("makeWholeTarget()");
    const reply = e(
      "game.itemCategory==='money'?game.text.replace('£',''):game.text",
    );
    e("type(" + JSON.stringify(reply) + ",true)");
    assert.equal(e("game.boss.health"), hp);
    assert.equal(e("game.health"), 5);
    advance(251);
    e("tick(performance.now())");
    advance(1801);
    await flush();
  }
  assert.equal(e("game.running"), false);
  assert.equal(elements.missionLabel.textContent, "BOSS ĐÃ BỊ HẠ!");
  assert.equal(e("game.hits"), 10);
  assert.equal(elements.resultsScore.textContent, "10 / 10");
  assert.equal(elements.retryMistakes.hidden, true);
  elements.difficulty.value = "hard";
  await e("start()");
  for (let i = 0; i < 3; i++) {
    e("makeWholeTarget()");
    e("type('wrong',true)");
    if (i < 2) {
      advance(251);
      e("tick(performance.now())");
      advance(1801);
      await flush();
    }
  }
  assert.equal(e("game.running"), false);
  assert.equal(e("game.health"), 0);
  assert.equal(elements.missionLabel.textContent, "BOSS ĐÃ THẮNG");
  e("setSubject('streets')");
  assert.equal(e("game.boss"), null);
  assert.equal(elements.bossHud.hidden, true);
  console.log(
    "Passed: audio rhythm scaling, whole word before spelling, all subjects, scoring/health, pause/resume, phrase answers, speed presets, voices, multi-page lessons, saved progress, mistake review and isolated finite/endless character sessions.",
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
