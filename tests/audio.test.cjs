const path = require("node:path");
const root = path.resolve(__dirname, "..");
const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert");
const c = {
  window: {},
  performance: { now: () => 0 },
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  Audio: class {
    constructor(src) {
      this.src = src;
    }
    play() {
      return Promise.resolve();
    }
    pause() {}
  },
};
vm.createContext(c);
for (const f of [
  "voice-sonia.js",
  "voice-ryan.js",
  "voice-sonia-extra.js",
  "voice-ryan-extra.js",
  "voices/jenny.js",
  "voices/guy.js",
  "voices/natasha.js",
  "voices/william.js",
  "voices/molly.js",
  "voices.js",
  "lessons.js",
  "content.js",
  "courses.js",
  "rhythm.js",
])
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c);
let clips = 0;
for (const [key, voice] of Object.entries(c.window.EchoVoices)) {
  assert.equal(voice.voice, c.window.EchoVoiceCatalog.voices[key].voice);
  assert.equal(Object.keys(voice.characters).length, 36);
  assert.equal(voice.corrections.N.source, "N.");
  for (const pace of Object.values(c.window.EchoRhythm.DRILL_PACES))
    for (const [char, variants] of Object.entries(voice.characters)) {
      const bytes = Buffer.from(variants[pace.voiceSpeed], "base64"),
        at = bytes.indexOf("data");
      assert(
        bytes.readUInt32LE(at + 4) / 44100 <= pace.interval,
        key + " " + char + " must finish before the next drill sound",
      );
    }
  for (const [char, variants] of Object.entries(voice.characters)) {
    assert.deepEqual(Object.keys(variants), [
      "60",
      "80",
      "100",
      "130",
      "160",
      "200",
      "natural",
    ]);
    for (const [speed, value] of Object.entries(variants)) {
      const data = Buffer.from(value, "base64");
      assert.equal(data.toString("ascii", 0, 4), "RIFF");
      const at = data.indexOf("data");
      assert(at >= 0);
      const bytes = data.readUInt32LE(at + 4);
      assert(bytes > 2000, key + " " + char + " " + speed);
      let peak = 0;
      for (let i = at + 8; i + 1 < data.length; i += 2)
        peak = Math.max(peak, Math.abs(data.readInt16LE(i)));
      assert(peak > 200);
      clips++;
    }
  }
  for (const rows of Object.values(c.window.EchoLessons))
    for (const row of rows)
      assert(
        voice.narrations[row.spoken],
        key + " missing phrase " + row.spoken,
      );
  for (const course of Object.values(c.window.EchoCourses))
    for (const row of course.bank)
      if (course !== c.window.EchoCourses.phone || row.recorded)
        assert(
          voice.narrations[row.spoken],
          key + " missing course phrase " + row.spoken,
        );
  assert.equal(Object.keys(voice.narrations).length, 390);
}
(async () => {
  const audio = new c.window.EchoRhythm.RhythmAudio();
  audio.context = {
    state: "running",
    decodeAudioData: async (data) => ({ size: data.byteLength }),
  };
  audio.setVoice("sonia");
  await audio.prepare("OXFORD", 100);
  assert.equal(audio.cache.size, 5);
  audio.setVoice("ryan");
  assert.equal(
    audio.cache.size,
    0,
    "Switching voice must clear old letter cache",
  );
  await audio.prepare("OXFORD", 100);
  const p = audio.narrate("Oxford Avenue", 100);
  assert.equal(
    audio.player.src,
    "data:audio/mpeg;base64," +
      c.window.EchoVoices.ryan.narrations["Oxford Avenue"],
  );
  assert.equal(audio.player.preservesPitch, true);
  audio.player.onended();
  await p;
  const waiting = audio.narrate("Oxford Avenue", 100);
  audio.cancel();
  await waiting;
  assert.equal(audio.player, null);
  assert(
    !fs
      .readFileSync(path.join(root, "game.js"), "utf8")
      .includes("speechSynthesis"),
  );

  const pending = [];
  audio.context.decodeAudioData = () =>
    new Promise((resolve) => pending.push(resolve));
  audio.setVoice("sonia");
  const oldPrepare = audio.prepare("A", 100);
  await new Promise((resolve) => setImmediate(resolve));
  audio.setVoice("ryan");
  const newPrepare = audio.prepare("A", 100);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(pending.length, 2);
  pending[0]({ voice: "sonia" });
  await oldPrepare;
  assert.equal(
    audio.cache.size,
    0,
    "Late old-voice decoding must not populate the new cache",
  );
  pending[1]({ voice: "ryan" });
  await newPrepare;
  assert.equal(audio.cache.get("ryan:A:100").voice, "ryan");
  assert.equal(audio.cache.has("sonia:A:100"), false);
  const started = [];
  audio.context = {
    state: "running",
    currentTime: 10,
    destination: {},
    decodeAudioData: async () => ({}),
    createBufferSource: () => ({
      playbackRate: {},
      connect() {},
      start(at) {
        started.push(at);
      },
      stop() {},
    }),
  };
  audio.cache.clear();
  const batch1 = await audio.play("ABCD", 100, 1, { groupSize: 0 });
  const batch2 = await audio.play("EFGH", 100, 0, {
    groupSize: 0,
    startAt: batch1.nextStart,
  });
  assert.equal(
    started[4],
    batch1.nextStart.audio,
    "Chunks share the audio clock with no added lead",
  );
  assert.equal(batch2.events[0].born, batch1.nextStart.wall);
  assert.equal(audio.sources.length, 8);
  const source = audio.sources[0];
  source.onended();
  assert.equal(
    audio.sources.length,
    7,
    "Finished audio nodes are released during endless play",
  );
  audio.cancel();
  assert.equal(audio.sources.length, 0);
  const slowDrill = await audio.play("NMNL", 60, 0.3, { cadence: "drill" });
  assert(
    Math.abs(slowDrill.events[1].born - slowDrill.events[0].born - 2400) < 1e-8,
  );
  assert(
    audio.cache.has("ryan:N:natural"),
    "Slow drills retain natural speech articulation",
  );
  assert.equal(audio.cache.has("ryan:N:60"), false);
  audio.cancel();
  console.log(
    "Passed: " +
      clips +
      " non-silent neural spelling clips, 2730 matching-voice phrases across seven voices, complete subject coverage, voice-cache isolation and playback cancellation.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
