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
for (const f of ["voice-sonia.js", "voice-ryan.js", "lessons.js", "rhythm.js"])
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), c);
let clips = 0;
for (const [key, voice] of Object.entries(c.window.EchoVoices)) {
  assert.equal(
    voice.voice,
    key === "sonia" ? "en-GB-SoniaNeural" : "en-GB-RyanNeural",
  );
  assert.equal(Object.keys(voice.characters).length, 36);
  for (const [char, variants] of Object.entries(voice.characters)) {
    assert.deepEqual(
      Object.keys(variants).map(Number),
      [60, 80, 100, 130, 160, 200],
    );
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
  console.log(
    "Passed: " +
      clips +
      " non-silent neural spelling clips, 208 matching-voice phrases, complete subject coverage, voice-cache isolation and playback cancellation.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
