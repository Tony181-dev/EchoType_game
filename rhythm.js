"use strict";
(function () {
  const BASE = {
    letter: 0.36,
    digit: 0.4,
    group: 0.45,
    word: 1.1,
    flight: 0.95,
  };
  // Character drills allow time to recognise a sound and press its key.
  // Speech articulation stays natural; difficulty changes the silence after it.
  const DRILL_PACES = {
    60: { interval: 2.4, voiceSpeed: "natural" },
    80: { interval: 1.8, voiceSpeed: "natural" },
    100: { interval: 1.2, voiceSpeed: "natural" },
    130: { interval: 0.85, voiceSpeed: "natural" },
    160: { interval: 0.6, voiceSpeed: 100 },
    200: { interval: 0.4, voiceSpeed: 130 },
  };
  function pattern(text, speed = 100, options = {}) {
    const rate = speed / 100;
    const drill =
      options.cadence === "drill"
        ? DRILL_PACES[speed] || DRILL_PACES[100]
        : null;
    const events = [];
    let at = 0,
      count = 0;
    const tokens = text.toUpperCase().split("");
    for (let i = 0; i < tokens.length; i++) {
      const ch = tokens[i];
      if (!/[A-Z0-9]/.test(ch)) {
        if (ch === " ") {
          at += BASE.word / rate;
          count = 0;
        }
        continue;
      }
      events.push({ char: ch, offset: at, index: events.length });
      count++;
      at += drill
        ? drill.interval
        : (ch === "W" ? 0.56 : /\d/.test(ch) ? BASE.digit : BASE.letter) / rate;
      const next = tokens[i + 1];
      const groupSize = drill ? 0 : (options.groupSize ?? 4);
      if (
        groupSize > 0 &&
        count === groupSize &&
        next &&
        /[A-Z0-9]/.test(next)
      ) {
        at += (options.groupPause ?? BASE.group) / rate;
        count = 0;
      }
    }
    return {
      events,
      duration: at,
      window: drill ? drill.interval : BASE.flight / rate,
    };
  }
  class RhythmAudio {
    constructor() {
      this.voice = "sonia";
      this.context = null;
      this.cache = new Map();
      this.sources = [];
      this.epoch = 0;
      this.player = null;
      this.stopNarration = null;
    }
    setVoice(key) {
      if (!window.EchoVoices || !window.EchoVoices[key])
        throw new Error("Voice unavailable: " + key);
      this.cancel();
      if (this.voice !== key) this.cache.clear();
      this.voice = key;
    }
    get bank() {
      return window.EchoVoices[this.voice];
    }
    async ready() {
      if (!this.context)
        this.context = new (window.AudioContext || window.webkitAudioContext)();
      if (this.context.state === "suspended") await this.context.resume();
    }
    async prepare(text, speed) {
      // A voice can change while decoding is in flight. Keep every decoded
      // buffer tied to the bank that supplied it, rather than the current UI.
      const voice = this.voice;
      const bank = this.bank;
      await this.ready();
      const bucket = Object.hasOwn(bank.characters.A, speed) ? speed : 100;
      const chars = [...new Set(text.toUpperCase().replace(/[^A-Z0-9]/g, ""))];
      await Promise.all(
        chars.map(async (ch) => {
          const key = `${voice}:${ch}:${bucket}`;
          if (this.cache.has(key)) return;
          const encoded = bank.characters[ch][bucket];
          const bytes = Uint8Array.from(atob(encoded), (x) => x.charCodeAt(0));
          const buffer = await this.context.decodeAudioData(bytes.buffer);
          if (this.voice === voice) this.cache.set(key, buffer);
        }),
      );
      return bucket;
    }
    async play(text, speed = 100, lead = 0.2, options = {}) {
      const generation = ++this.epoch;
      const voice = this.voice;
      const voiceSpeed =
        options.cadence === "drill"
          ? (DRILL_PACES[speed] || DRILL_PACES[100]).voiceSpeed
          : speed;
      const bucket = await this.prepare(text, voiceSpeed);
      if (generation !== this.epoch) return null;
      const p = pattern(text, speed, options);
      const scheduled =
        options.startAt &&
        options.startAt.audio >= this.context.currentTime + 0.03;
      const delay = Math.max(0.15, lead);
      const audioStart = scheduled
        ? options.startAt.audio
        : this.context.currentTime + delay;
      const wallStart = scheduled
        ? options.startAt.wall
        : performance.now() + delay * 1000;
      for (const ev of p.events) {
        const source = this.context.createBufferSource();
        source.buffer = this.cache.get(`${voice}:${ev.char}:${bucket}`);
        source.playbackRate.value = 1;
        source.connect(this.context.destination);
        source.onended = () => {
          const index = this.sources.indexOf(source);
          if (index >= 0) this.sources.splice(index, 1);
        };
        source.start(audioStart + ev.offset);
        this.sources.push(source);
      }
      return {
        events: p.events.map((ev) => ({
          ...ev,
          born: wallStart + ev.offset * 1000,
          deadline: wallStart + (ev.offset + p.window) * 1000,
          resolved: false,
        })),
        duration: p.duration * 1000,
        wallStart,
        nextStart: {
          audio: audioStart + p.duration,
          wall: wallStart + p.duration * 1000,
        },
      };
    }
    narrate(text, speed = 100) {
      if (!this.bank.narrations[text])
        return Promise.reject(new Error("Missing narration: " + text));
      return new Promise((resolve, reject) => {
        const player = new Audio(
          "data:audio/mpeg;base64," + this.bank.narrations[text],
        );
        this.player = player;
        this.stopNarration = resolve;
        player.playbackRate = speed / 100;
        player.preservesPitch = true;
        player.onended = () => {
          this.player = null;
          this.stopNarration = null;
          resolve();
        };
        player.onerror = () => {
          this.player = null;
          this.stopNarration = null;
          reject(new Error("Audio playback failed"));
        };
        player.play().catch(reject);
      });
    }
    cancel() {
      if (this.player) {
        this.player.pause();
        this.player.onended = null;
        this.player.onerror = null;
        this.player = null;
        if (this.stopNarration) this.stopNarration();
        this.stopNarration = null;
      }
      this.epoch++;
      for (const s of this.sources) {
        try {
          s.stop();
        } catch (_) {}
      }
      this.sources = [];
    }
  }
  window.EchoRhythm = { RhythmAudio, pattern, BASE, DRILL_PACES };
})();
