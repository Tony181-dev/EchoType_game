"use strict";
const $ = (id) => document.getElementById(id),
  ui = {};
[
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
].forEach((id) => (ui[id] = $(id)));
const subjects = [
  {
    key: "phone",
    name: "Số điện thoại",
    hint: "Nghe từng chữ số, nhận biết nhóm số.",
    spell: true,
  },
  {
    key: "streets",
    name: "Tên đường",
    hint: "Nghe cả tên đường rồi nghe đánh vần.",
    spell: true,
  },
  {
    key: "names",
    name: "Tên riêng",
    hint: "Nghe tên người rồi nghe đánh vần.",
    spell: true,
  },
  {
    key: "money",
    name: "Giá tiền",
    hint: "Nghe và nhập số tiền, ví dụ 15.50.",
    spell: false,
  },
  {
    key: "time",
    name: "Ngày & giờ",
    hint: "Nhập ngày như 13 March hoặc giờ như 8:15.",
    spell: false,
  },
  {
    key: "addresses",
    name: "Địa chỉ",
    hint: "Nghe số nhà, tên đường, căn hộ.",
    spell: false,
  },
  {
    key: "codes",
    name: "Mã & số chuyến",
    hint: "Nghe mã, số phòng và thông tin chuyến đi.",
    spell: false,
  },
  {
    key: "locations",
    name: "Địa điểm",
    hint: "Nghe tên ga tàu, sân bay và khách sạn.",
    spell: true,
  },
  {
    key: "directions",
    name: "Chỉ đường",
    hint: "Nghe và nhập cụm từ chỉ vị trí.",
    spell: false,
  },
  {
    key: "work",
    name: "Công ty & sản phẩm",
    hint: "Nghe tên công nghệ rồi nghe đánh vần.",
    spell: true,
  },
];
const labels = {
  practice: "LUYỆN TẬP",
  mission: "NHIỆM VỤ",
  survival: "SINH TỒN",
};
const difficulties = {
  easy: { name: "Dễ", health: 10 },
  medium: { name: "Trung bình", health: 6 },
  hard: { name: "Khó", health: 3 },
};
const speedLevels = {
  60: {
    name: "Rất chậm",
    description: "Nghe chậm, có nhiều thời gian nhận diện từng chữ.",
  },
  80: {
    name: "Chậm",
    description: "Nhịp thư thả để làm quen giọng và cách đánh vần.",
  },
  100: {
    name: "Bình thường",
    description: "Nhịp mẫu · khoảng 0,36 giây giữa các chữ.",
  },
  130: {
    name: "Nhanh",
    description: "Các âm nối tiếp nhanh hơn, cần gõ ngay khi nghe.",
  },
  160: {
    name: "Rất nhanh",
    description: "Ít thời gian phản xạ, phù hợp khi đã quen bài.",
  },
  200: {
    name: "Siêu tốc",
    description: "Thử thách phản xạ cao, nên luyện sau các mức trước.",
  },
};
function updateLessonNote() {
  const lesson = EchoCourses[ui.category.value];
  if (!lesson) return;
  const key = ui.category.value + ":" + ui.learning.value;
  const progress = courseProgress[key];
  const length = ui.studyPlan.value === "series" ? 10 : 5;
  ui.lessonNote.textContent =
    ui.mode.value === "survival"
      ? "Sinh tồn: các câu được chọn ngẫu nhiên, không giới hạn."
      : ui.studyPlan.value === "series"
        ? "Bài " +
          String(lesson.id).padStart(2, "0") +
          " · " +
          lesson.title +
          " · " +
          length +
          " câu theo thứ tự." +
          (progress
            ? " Kết quả tốt nhất: " +
              progress.bestCorrect +
              "/" +
              progress.total +
              "."
            : "")
        : "Luyện ngẫu nhiên " + length + " câu từ chủ đề đã chọn.";
  for (const button of ui.subjectNav.children) {
    const completed = Object.keys(courseProgress).some((k) =>
      k.startsWith(button.dataset.key + ":"),
    );
    button.classList.toggle("completed", completed);
    button.title = completed ? "Đã hoàn thành một bài của chủ đề này" : "";
  }
}
function describeMode() {
  const health = difficulties[ui.difficulty.value].health;
  const count = ui.studyPlan.value === "series" ? 10 : 5;
  ui.modeDescription.textContent =
    ui.mode.value === "practice"
      ? count + " câu · không mất máu khi va chạm."
      : ui.mode.value === "mission"
        ? "Vượt qua " + count + " câu với " + health + " máu."
        : "Bay liên tục đến khi hết " + health + " máu.";
  ui.studyPlan.disabled = game.running || ui.mode.value === "survival";
  ui.difficulty.disabled = game.running || ui.mode.value === "practice";
  ui.difficultyDescription.textContent =
    ui.mode.value === "practice"
      ? "Chế độ luyện tập không mất máu."
      : "Mỗi va chạm mất 1 máu. Độ khó không đổi tốc độ đọc.";
  if (!game.running)
    ui.health.textContent =
      ui.mode.value === "practice" ? "∞" : health + " / " + health;
  updateLessonNote();
}
let voicePreviewGeneration = 0;
function configureVoice() {
  voicePreviewGeneration++;
  audio.cancel();
  audio.setVoice(ui.voice.value);
  ui.previewVoice.disabled = game.running;
  ui.previewVoice.textContent = "▷ Nghe thử giọng";
}
async function previewVoice() {
  if (game.running) return;
  configureVoice();
  const generation = voicePreviewGeneration;
  ui.previewVoice.disabled = true;
  ui.previewVoice.textContent = "Đang đọc thử…";
  try {
    await audio.ready();
    await audio.narrate("Oxford Avenue", 100);
    if (generation !== voicePreviewGeneration) return;
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (generation !== voicePreviewGeneration) return;
    const plan = await audio.play("OXFORD", 100, 0.1);
    if (plan)
      await new Promise((resolve) => setTimeout(resolve, plan.duration + 150));
  } catch (_) {
    status("Không phát được giọng thử. Hãy thử lại.", "bad");
  } finally {
    if (generation === voicePreviewGeneration) {
      ui.previewVoice.disabled = false;
      ui.previewVoice.textContent = "▷ Nghe thử giọng";
    }
  }
}
const audio = new EchoRhythm.RhythmAudio();
let preferencesReady = false;
function savePreferences() {
  if (!preferencesReady) return;
  const settings = {};
  for (const id of [
    "mode",
    "studyPlan",
    "difficulty",
    "category",
    "learning",
    "pace",
    "voice",
  ])
    settings[id] = ui[id].value;
  try {
    localStorage.setItem("echoFlightPreferences", JSON.stringify(settings));
  } catch (_) {}
}
function restorePreferences() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem("echoFlightPreferences")) || {};
  } catch (_) {}
  const allowed = {
    mode: Object.keys(labels),
    studyPlan: ["series", "random"],
    difficulty: Object.keys(difficulties),
    category: subjects.map((s) => s.key),
    learning: ["reflex", "phrase", "memory"],
    pace: Object.keys(speedLevels),
    voice: ["sonia", "ryan"],
  };
  for (const [id, options] of Object.entries(allowed))
    if (options.includes(String(saved[id]))) ui[id].value = String(saved[id]);
}
let courseProgress = {};
try {
  courseProgress =
    JSON.parse(localStorage.getItem("echoFlightCourseProgress")) || {};
} catch (_) {}
let lastMistakes = [];
let record = 0;
try {
  record = Number(localStorage.getItem("echoFlightBest")) || 0;
} catch (_) {}
ui.best.textContent = String(record).padStart(4, "0");
let game = {
  running: false,
  paused: false,
  gen: 0,
  phase: "idle",
  score: 0,
  combo: 0,
  health: 6,
  maxHealth: 6,
  round: 0,
  events: [],
  results: [],
  roundLimit: 10,
  timer: null,
  mode: "mission",
  category: "streets",
  learning: "reflex",
  speed: 100,
  hits: 0,
  misses: 0,
};
const renderer = new SpaceRenderer(ui.canvas, () => game, tick);
function status(text, kind = "") {
  ui.feedback.textContent = text;
  ui.feedback.className = kind;
}
function cancel() {
  game.gen++;
  clearTimeout(game.timer);
  game.timer = null;
  audio.cancel();
}
function normal(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/£/g, "")
    .replace(/[.,:\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function answersMatch(value, expected, category = game.category) {
  if (category === "phone")
    return (
      /^[+\d\s().-]+$/.test(value.trim()) &&
      value.replace(/\D/g, "") === expected.replace(/\D/g, "")
    );
  if (category === "money") {
    const amount = (s) =>
      s
        .toLowerCase()
        .replace(/£|\bgbp\b|\bpounds?\b/g, "")
        .trim();
    const a = amount(value),
      b = amount(expected);
    if (/^\d+(?:[.,]\d{1,2})?$/.test(a) && /^\d+(?:[.,]\d{1,2})?$/.test(b))
      return (
        Math.round(Number(a.replace(",", ".")) * 100) ===
        Math.round(Number(b.replace(",", ".")) * 100)
      );
  }
  if (category === "codes" || category === "work") {
    const code = (s) =>
      normal(s)
        .replace(/\s/g, "")
        .replace(
          category === "codes"
            ? /^(?:room|flight|platform|bus(?:number)?)/
            : /^$/,
          "",
        );
    return code(value) === code(expected);
  }
  return normal(value) === normal(expected);
}
function currentSubject() {
  return subjects.find((s) => s.key === ui.category.value);
}
function setSubject(key) {
  if (game.running) finish("ĐÃ ĐỔI PHẦN HỌC", "Chọn cách luyện và xuất phát.");
  ui.lessonResults.hidden = true;
  ui.category.value = key;
  const meta = currentSubject();
  for (const b of ui.subjectNav.children)
    b.classList.toggle("active", b.dataset.key === key);
  const [reflex, , memory] = ui.learning.options;
  reflex.disabled = !meta.spell;
  memory.disabled = !meta.spell;
  if (!meta.spell) ui.learning.value = "phrase";
  ui.topicInfo.querySelector("strong").textContent = meta.name;
  ui.topicInfo.querySelector("small").textContent = meta.hint;
  studyChanged();
  describeMode();
  savePreferences();
}
function studyChanged() {
  ui.studyDescription.textContent = {
    reflex: "Đọc cả từ trước, rồi đánh vần. Gõ ngay theo từng âm.",
    phrase: "Nghe thông tin, nhập cả đáp án và nhấn Enter.",
    memory: "Nghe cả từ và phần đánh vần, rồi nhập lại khi đọc xong.",
  }[ui.learning.value];
  ui.prompt.textContent = currentSubject().hint;
  ui.answer.placeholder =
    ui.learning.value === "reflex"
      ? "Gõ ngay ký tự vừa nghe…"
      : "Nhập cả đáp án rồi nhấn Enter…";
  ui.fire.textContent = ui.learning.value === "reflex" ? "GỬI ↗" : "BẮN ↗";
  updateLessonNote();
}
function lock(playing) {
  ui.mode.disabled = playing;
  ui.studyPlan.disabled = playing || ui.mode.value === "survival";
  ui.category.disabled = playing;
  ui.learning.disabled = playing;
  ui.difficulty.disabled = playing || ui.mode.value === "practice";
  ui.voice.disabled = playing;
  ui.previewVoice.disabled = playing;
  ui.answer.disabled = !playing;
  ui.fire.disabled = !playing;
  ui.pause.disabled = !playing;
  ui.stop.disabled = !playing;
  ui.replay.disabled = !playing;
}
function slots() {
  ui.slots.replaceChildren();
  const next = game.events.find((e) => !e.resolved);
  for (const ev of game.events) {
    const cell = document.createElement("span");
    cell.className =
      "slot" +
      (ev.resolved
        ? ev.correct
          ? " hit"
          : " miss"
        : ev === next
          ? " current"
          : "");
    cell.textContent = ev.resolved
      ? ev.correct
        ? game.learning === "reflex"
          ? ev.char
          : "✓"
        : "×"
      : "·";
    ui.slots.append(cell);
  }
  ui.slotCount.textContent =
    game.events.filter((e) => e.resolved).length +
    " / " +
    game.events.length +
    (game.learning === "reflex" ? " ký tự" : " mục tiêu");
}
function hud() {
  ui.score.textContent = String(game.score).padStart(4, "0");
  ui.combo.textContent = "×" + game.combo;
  ui.health.textContent =
    game.mode === "practice" ? "∞" : game.health + " / " + game.maxHealth;
  ui.missionLabel.textContent = labels[game.mode];
  ui.modeBadge.textContent = {
    reflex: "PHẢN XẠ",
    phrase: "NGHE CẢ CỤM",
    memory: "GHI NHỚ",
  }[game.learning];
  ui.waveLabel.textContent =
    "CÂU " +
    game.round +
    (game.mode === "survival" ? " / ∞" : " / " + game.roundLimit);
  slots();
  updateProgress();
}
function updateProgress() {
  const count = (game.results || []).length;
  const total = game.roundLimit || 10;
  ui.missionProgress.hidden = game.mode === "survival";
  ui.missionProgress.setAttribute("aria-valuemax", String(total));
  ui.missionProgress.setAttribute("aria-valuenow", String(count));
  ui.missionProgress.setAttribute(
    "aria-valuetext",
    `${count}/${total} câu hoàn thành`,
  );
  ui.progressFill.style.transform = `scaleX(${Math.min(1, count / total)})`;
}
function selection() {
  if (game.deck && game.deck.length) return game.deck[game.round];
  if (game.category === "phone") {
    let answer = "07";
    for (let i = 0; i < 9; i++) answer += Math.floor(Math.random() * 10);
    const words = [
      "zero",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
    ];
    return {
      answer,
      spoken: answer
        .split("")
        .map((d) => words[+d])
        .join(" "),
      spell: false,
    };
  }
  const key = game.category === "addresses" ? "numbers" : game.category;
  const bank = EchoLessons[key];
  return bank[Math.floor(Math.random() * bank.length)];
}
async function start(reviewDeck = null) {
  cancel();
  voicePreviewGeneration++;
  audio.setVoice(ui.voice.value);
  const maxHealth = difficulties[ui.difficulty.value].health;
  const reviewing = Array.isArray(reviewDeck);
  const course = reviewing
    ? "review"
    : ui.mode.value !== "survival" && ui.studyPlan.value === "series"
      ? "series"
      : "random";
  const deck = reviewing
    ? reviewDeck.map((item) => ({ ...item }))
    : course === "series"
      ? EchoCourses[ui.category.value].items.map((item) => ({ ...item }))
      : [];
  game = {
    running: true,
    paused: false,
    gen: game.gen,
    phase: "loading",
    score: 0,
    combo: 0,
    health: maxHealth,
    maxHealth,
    round: 0,
    events: [],
    results: [],
    course,
    deck,
    roundLimit: deck.length || 5,
    timer: null,
    mode: ui.mode.value,
    category: ui.category.value,
    learning: ui.learning.value,
    speed: Number(ui.pace.value),
    hits: 0,
    misses: 0,
  };
  lock(true);
  ui.lessonResults.hidden = true;
  ui.introNotice.classList.add("hidden");
  ui.start.textContent = "BẮT ĐẦU LẠI ↻";
  ui.pause.textContent = "Ⅱ Tạm dừng";
  renderer.reset();
  const gen = game.gen;
  try {
    await audio.ready();
    if (gen === game.gen && game.running) nextRound();
  } catch (_) {
    audioFailure();
  }
}
function later(fn, delay) {
  const gen = game.gen;
  game.timer = setTimeout(() => {
    if (gen === game.gen && game.running && !game.paused) fn();
  }, delay);
}
async function narrate(text, done) {
  const gen = game.gen;
  try {
    if (game.category === "phone" && !game.item.recorded) {
      const plan = await audio.play(game.text, game.speed, 0.2);
      if (plan && gen === game.gen) later(done, plan.duration + 200);
    } else {
      await audio.narrate(text, game.speed);
      if (gen === game.gen && game.running && !game.paused) done();
    }
  } catch (_) {
    if (gen === game.gen) audioFailure();
  }
}
function nextRound() {
  if (!game.running || game.paused) return;
  if (game.mode !== "survival" && game.round >= game.roundLimit) {
    finish(
      "HOÀN THÀNH BÀI HỌC",
      "Bạn đã hoàn thành " + game.roundLimit + " câu.",
    );
    return;
  }
  cancel();
  game.item = selection();
  game.text = game.item.answer;
  game.round++;
  game.events = [];
  game.speed = Number(ui.pace.value);
  ui.answer.value = "";
  ui.answer.inputMode = game.category === "phone" ? "numeric" : "text";
  ui.targetKind.textContent = subjects
    .find((s) => s.key === game.category)
    .name.toUpperCase();
  ui.prompt.textContent = subjects.find((s) => s.key === game.category).hint;
  hud();
  ui.answer.focus();
  playRound();
}
function playRound() {
  game.phase = "intro";
  ui.signal.textContent = "♪ Nghe cả cụm trước";
  status("Lắng nghe. Chưa có mục tiêu gây sát thương.");
  if (game.learning === "reflex") {
    if (game.category === "phone" && !game.item.recorded) {
      launchPattern(0);
      return;
    }
    narrate(game.item.spoken, () =>
      later(() => launchPattern(0), 1100 / (game.speed / 100)),
    );
    return;
  }
  if (game.learning === "memory" && game.category === "phone") {
    narrate(game.item.spoken, makeWholeTarget);
    return;
  }
  if (game.learning === "memory") {
    narrate(game.item.spoken, () =>
      later(
        async () => {
          const gen = game.gen;
          try {
            const plan = await audio.play(game.text, game.speed, 0.2);
            if (!plan || gen !== game.gen) return;
            ui.signal.textContent = "♪ Nghe và ghi nhớ";
            later(makeWholeTarget, plan.duration + 400 / (game.speed / 100));
          } catch (_) {
            audioFailure();
          }
        },
        1100 / (game.speed / 100),
      ),
    );
    return;
  }
  narrate(game.item.spoken, () => {
    if (game.item.spell) {
      later(
        async () => {
          const gen = game.gen;
          try {
            const plan = await audio.play(game.text, game.speed, 0.2);
            if (!plan || gen !== game.gen) return;
            ui.signal.textContent = "♪ Phần đánh vần";
            later(
              () => narrate(game.item.spoken, makeWholeTarget),
              plan.duration + 700 / (game.speed / 100),
            );
          } catch (_) {
            audioFailure();
          }
        },
        1100 / (game.speed / 100),
      );
    } else makeWholeTarget();
  });
}
function makeWholeTarget() {
  if (!game.running || game.paused) return;
  const now = performance.now();
  game.events = [
    {
      char: game.text,
      index: 0,
      born: now,
      deadline: now + Math.max(2200, (7000 * 100) / game.speed),
      resolved: false,
      kind: "ufo",
      lane: 1,
    },
  ];
  game.lastDeadline = game.events[0].deadline;
  game.phase = "playing";
  ui.signal.textContent = "Nhập cả đáp án rồi nhấn Enter";
  ui.spaceState.textContent = "HEAVY TARGET / LOCKED";
  slots();
  if (ui.answer.value.trim()) type(ui.answer.value, true);
}
async function launchPattern(from) {
  if (!game.running || game.paused) return;
  game.phase = "loading";
  const gen = game.gen,
    full = game.text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const text = from ? full.slice(from) : game.text;
  ui.signal.textContent = "Chuẩn bị nghe đánh vần…";
  try {
    const plan = await audio.play(text, game.speed, from ? 0.4 : 1);
    if (!plan || gen !== game.gen || !game.running || game.paused) return;
    const previous = game.events.slice(0, from);
    game.events = [
      ...previous,
      ...plan.events.map((e, i) => ({
        ...e,
        index: from + i,
        kind: (from + i) % 3 === 1 ? "ufo" : "meteor",
        lane: (from + i) % 3,
      })),
    ];
    game.phase = "playing";
    game.lastDeadline = Math.max(...game.events.map((e) => e.deadline));
    ui.signal.textContent = "♪ Gõ theo từng âm";
    ui.spaceState.textContent = "AUTO TARGETING / LIVE";
    status(
      speedLevels[game.speed].name + " · đọc liên tiếp, nghỉ theo nhóm chữ.",
    );
    slots();
  } catch (_) {
    if (gen === game.gen) audioFailure();
  }
}
function audioFailure() {
  game.resumePhase = game.phase;
  game.resumeIndex = game.events.findIndex((e) => !e.resolved);
  if (game.resumeIndex < 0) game.resumeIndex = game.events.length;
  cancel();
  game.paused = true;
  game.phase = "paused";
  ui.pause.textContent = "▶ Tiếp tục";
  ui.answer.disabled = true;
  ui.fire.disabled = true;
  ui.signal.textContent = "Âm thanh chưa sẵn sàng";
  status("Nhấn Tiếp tục để thử lại âm thanh.", "bad");
}
function tick(now) {
  if (!game.running || game.paused || game.phase !== "playing") return;
  let changed = false;
  for (const ev of game.events) {
    if (!ev.resolved && now >= ev.deadline) {
      ev.resolved = true;
      ev.correct = false;
      game.misses++;
      game.combo = 0;
      if (game.mode !== "practice") game.health = Math.max(0, game.health - 1);
      renderer.impact();
      status(
        game.mode === "practice"
          ? "Lỡ mục tiêu — luyện tiếp nhé."
          : "Va chạm! Mất một lớp khiên.",
        "bad",
      );
      ui.signal.textContent =
        game.mode === "practice" ? "LỠ MỤC TIÊU" : "SHIELD IMPACT";
      changed = true;
      if (game.health === 0) {
        hud();
        finish("NHIỆM VỤ KẾT THÚC", "Đáp án: " + game.text);
        return;
      }
    }
  }
  if (changed) hud();
  if (now >= game.lastDeadline + 250) roundComplete();
}
function type(raw, commit = false) {
  if (!game.running || game.paused) return;
  const reflex = game.learning === "reflex";
  if (!reflex && !commit) return;
  let value = reflex ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : raw.trim();
  if (reflex) ui.answer.value = "";
  if (!value) return;
  const now = performance.now();
  tick(now);
  if (!game.running) return;
  const ev = game.events.find((e) => !e.resolved && e.born <= now);
  if (!ev) {
    status("Lắng nghe trước khi khai hỏa.");
    return;
  }
  const correct = reflex
    ? value[0] === ev.char
    : [game.item.answer, ...(game.item.alternatives || [])].some((a) =>
        answersMatch(value, a),
      );
  if (!correct) {
    status("Chưa đúng — thử lại trước khi mục tiêu chạm tàu.", "bad");
    renderer.wrong();
    return;
  }
  ev.resolved = true;
  ev.correct = true;
  game.hits++;
  game.combo++;
  game.score +=
    (reflex ? 10 : 50) + Math.min(20, Math.floor((game.combo - 1) / 4) * 2);
  renderer.shoot(ev, now);
  ui.signal.textContent =
    game.combo >= 5 ? "COMBO ×" + game.combo : "TARGET DESTROYED";
  status("Bắn trúng! Combo ×" + game.combo, "good");
  hud();
  if (!reflex) {
    game.lastDeadline = now;
    later(() => roundComplete(), 700);
  }
}
function recordRound() {
  if (
    !game.results ||
    !game.item ||
    !game.events.length ||
    !game.events.some((e) => e.resolved) ||
    game.results.some((r) => r.round === game.round)
  )
    return;
  game.results.push({
    round: game.round,
    item: { ...game.item },
    answer: game.text,
    correct: game.events.every((e) => e.resolved && e.correct),
    hits: game.events.filter((e) => e.correct).length,
    total: game.events.length,
  });
  updateProgress();
}
function roundComplete() {
  if (game.phase !== "playing") return;
  recordRound();
  game.phase = "between";
  audio.cancel();
  ui.signal.textContent = "Đáp án: " + game.text;
  status("Câu hoàn tất · " + game.text);
  const proceed = () => later(nextRound, 1800 / Math.max(1, game.speed / 100));
  if (game.item.spell && game.learning === "reflex")
    narrate(game.item.spoken, proceed);
  else proceed();
}
function showResults() {
  const results = game.results || [],
    correct = results.filter((r) => r.correct).length;
  lastMistakes = results.filter((r) => !r.correct).map((r) => ({ ...r.item }));
  ui.resultsTitle.textContent =
    (game.course === "review"
      ? "Ôn lại câu sai"
      : EchoCourses[game.category].title) + " · Kết quả";
  ui.resultsScore.textContent =
    correct +
    " / " +
    (game.mode === "survival" ? results.length : game.roundLimit);
  ui.resultsSummary.textContent =
    "Đã làm " +
    results.length +
    " câu · " +
    correct +
    " câu đúng toàn bộ · " +
    lastMistakes.length +
    " câu cần ôn. Giọng " +
    ui.voice.value.charAt(0).toUpperCase() +
    ui.voice.value.slice(1) +
    ", nhịp " +
    speedLevels[game.speed].name.toLowerCase() +
    ".";
  ui.resultsList.replaceChildren();
  for (const row of results) {
    const li = document.createElement("li");
    li.className = row.correct ? "correct" : "incorrect";
    li.textContent =
      String(row.round).padStart(2, "0") +
      " " +
      (row.correct ? "✓ " : "✗ ") +
      row.answer +
      (game.learning === "reflex"
        ? " · " + row.hits + "/" + row.total + " ký tự"
        : "");
    ui.resultsList.append(li);
  }
  ui.retryMistakes.disabled = !lastMistakes.length;
  ui.lessonResults.hidden = !results.length;
  if (
    game.course === "series" &&
    game.round >= game.roundLimit &&
    results.length === game.roundLimit
  ) {
    const key = game.category + ":" + game.learning;
    const previous = courseProgress[key];
    courseProgress[key] = {
      bestCorrect: Math.max(previous ? previous.bestCorrect : 0, correct),
      total: game.roundLimit,
    };
    try {
      localStorage.setItem(
        "echoFlightCourseProgress",
        JSON.stringify(courseProgress),
      );
    } catch (_) {}
  }
  updateLessonNote();
}
function finish(title, detail) {
  recordRound();
  cancel();
  game.running = false;
  game.paused = false;
  game.phase = "idle";
  lock(false);
  if (game.score > record) {
    record = game.score;
    try {
      localStorage.setItem("echoFlightBest", game.score);
    } catch (_) {}
    ui.best.textContent = String(record).padStart(4, "0");
  }
  ui.missionLabel.textContent = title;
  ui.signal.textContent = title;
  ui.prompt.textContent = detail;
  ui.spaceState.textContent = "AUTO TARGETING / STANDBY";
  ui.start.textContent = "CHƠI LẠI ↻";
  status(
    "Trúng " +
      game.hits +
      " · Lỡ " +
      game.misses +
      " · Tổng " +
      game.score +
      " điểm.",
  );
  slots();
  showResults();
}
function pause() {
  if (!game.running) return;
  if (!game.paused) {
    game.resumePhase = game.phase;
    game.resumeIndex = game.events.findIndex((e) => !e.resolved);
    if (game.resumeIndex < 0) game.resumeIndex = game.events.length;
    cancel();
    game.paused = true;
    ui.pause.textContent = "▶ Tiếp tục";
    ui.answer.disabled = true;
    ui.fire.disabled = true;
    ui.signal.textContent = "FLIGHT PAUSED";
    status("Nhịp nghe sẽ tiếp tục từ âm chưa gõ.");
  } else {
    game.paused = false;
    ui.pause.textContent = "Ⅱ Tạm dừng";
    ui.answer.disabled = false;
    ui.fire.disabled = false;
    ui.answer.focus();
    if (game.resumePhase === "between") nextRound();
    else if (game.events.length && game.resumeIndex >= game.events.length) {
      game.phase = "playing";
      roundComplete();
    } else if (game.learning === "reflex" && game.events.length) {
      if (game.resumeIndex >= game.events.length) {
        game.phase = "playing";
        roundComplete();
      } else launchPattern(game.resumeIndex);
    } else playRound();
  }
}
function replay() {
  if (!game.running || game.paused || game.phase === "between") return;
  const from = game.events.findIndex((e) => !e.resolved);
  cancel();
  if (game.learning === "reflex" && game.events.length && from >= 0)
    launchPattern(from);
  else if (game.events.length && from < 0) {
    game.phase = "playing";
    roundComplete();
  } else playRound();
}
function speed(value) {
  const requested = Number(value);
  const selected = Object.hasOwn(speedLevels, requested) ? requested : 100;
  ui.pace.value = String(selected);
  ui.paceDescription.textContent = speedLevels[selected].description;
  if (game.running)
    status(
      "Nhịp " +
        speedLevels[selected].name.toLowerCase() +
        " áp dụng từ câu tiếp theo.",
    );
}
subjects.forEach((subject, i) => {
  const option = document.createElement("option");
  option.value = subject.key;
  option.textContent = subject.name;
  ui.category.append(option);
  const button = document.createElement("button");
  button.className = "subject-button";
  button.dataset.key = subject.key;
  const num = document.createElement("span");
  num.textContent = String(i + 1).padStart(2, "0");
  button.append(num, document.createTextNode(subject.name));
  button.addEventListener("click", () => setSubject(subject.key));
  ui.subjectNav.append(button);
});
ui.start.addEventListener("click", () => start());
ui.introStart.addEventListener("click", () => start());
ui.help.addEventListener("click", () => {
  if (game.running && !game.paused) pause();
  ui.helpDialog.showModal();
});
ui.studyPlan.addEventListener("change", describeMode);
ui.retryMistakes.addEventListener("click", () => {
  if (!lastMistakes.length) return;
  ui.mode.value = "practice";
  describeMode();
  start(lastMistakes);
});
ui.replayLesson.addEventListener("click", () => start());
ui.pause.addEventListener("click", pause);
ui.stop.addEventListener("click", () =>
  finish("ĐÃ KẾT THÚC", "Chọn nhiệm vụ mới và xuất phát."),
);
ui.replay.addEventListener("click", replay);
ui.answer.addEventListener("input", () => type(ui.answer.value));
ui.answer.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    type(ui.answer.value, true);
  }
});
ui.fire.addEventListener("click", () => {
  type(ui.answer.value, true);
  ui.answer.focus();
});
ui.mode.addEventListener("change", describeMode);
ui.difficulty.addEventListener("change", describeMode);
ui.voice.addEventListener("change", configureVoice);
ui.previewVoice.addEventListener("click", previewVoice);
ui.category.addEventListener("change", () => setSubject(ui.category.value));
ui.learning.addEventListener("change", studyChanged);
ui.pace.addEventListener("change", () => speed(ui.pace.value));
ui.fullscreen.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".flight-panel").requestFullscreen();
  } catch (_) {
    status("Trình duyệt hiện tại không hỗ trợ toàn màn hình.");
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game.running && !game.paused) pause();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && game.running && !ui.helpDialog.open) {
    event.preventDefault();
    pause();
  }
});
document.addEventListener("change", savePreferences);
window.addEventListener("pagehide", cancel);
ui.category.value = "streets";
restorePreferences();
setSubject(ui.category.value || "streets");
speed(ui.pace.value);
describeMode();
configureVoice();
preferencesReady = true;
