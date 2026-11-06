"use strict";
(function () {
  const alphabets = {
    letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    digits: "0123456789",
  };
  function randomSequence(kind, length, random = Math.random) {
    const alphabet = alphabets[kind];
    if (!alphabet) throw new Error("Unknown character set");
    return Array.from(
      { length },
      () => alphabet[Math.floor(random() * alphabet.length)],
    ).join("");
  }
  class CharacterDrill {
    constructor(
      audio,
      {
        kind,
        total = null,
        speed = 100,
        onChange = () => {},
        onError = () => {},
        random = Math.random,
      } = {},
    ) {
      if (!alphabets[kind]) throw new Error("Choose letters or digits");
      this.audio = audio;
      this.kind = kind;
      this.total = total;
      this.speed = speed;
      this.onChange = onChange;
      this.onError = onError;
      this.random = random;
      this.events = [];
      this.scheduled = 0;
      this.clock = null;
      this.loading = false;
      this.paused = true;
      this.epoch = 0;
      this.batchSize = 24;
    }
    async start() {
      this.paused = false;
      const epoch = ++this.epoch;
      await this.audio.prepare(
        alphabets[this.kind],
        window.EchoRhythm.DRILL_PACES[this.speed].voiceSpeed,
      );
      if (this.paused || epoch !== this.epoch) return false;
      await this.append(1);
      await this.append();
      return !this.paused && epoch === this.epoch;
    }
    async append(lead = 0) {
      if (
        this.paused ||
        this.loading ||
        (this.total !== null && this.scheduled >= this.total)
      )
        return;
      const epoch = this.epoch;
      this.loading = true;
      try {
        const length = Math.min(
          this.batchSize,
          this.total === null ? this.batchSize : this.total - this.scheduled,
        );
        const text = randomSequence(this.kind, length, this.random);
        // Adjacent batches share an audio clock, so the rolling queue never
        // introduces a synthetic pause between groups of random characters.
        const plan = await this.audio.play(text, this.speed, lead, {
          groupSize: 0,
          cadence: "drill",
          startAt: this.clock,
        });
        if (!plan || this.paused || epoch !== this.epoch) return;
        const first = this.scheduled;
        this.events.push(
          ...plan.events.map((event, index) => ({
            ...event,
            index: first + index,
            kind: (first + index) % 3 === 1 ? "ufo" : "meteor",
            lane: (first + index) % 3,
          })),
        );
        this.scheduled += length;
        this.clock = plan.nextStart;
        this.onChange();
      } catch (error) {
        if (epoch === this.epoch && !this.paused) this.onError(error);
      } finally {
        if (epoch === this.epoch) this.loading = false;
      }
    }
    maintain(now) {
      if (this.paused) return;
      const firstPending = this.events.findIndex((event) => !event.resolved);
      const drop = Math.max(
        0,
        (firstPending < 0 ? this.events.length : firstPending) - 16,
      );
      if (drop) this.events.splice(0, drop);
      if (!this.clock || this.clock.wall - now < 4000)
        this.append(this.clock ? 0 : 0.4);
    }
    get complete() {
      return (
        this.total !== null &&
        this.scheduled >= this.total &&
        this.events.every((event) => event.resolved)
      );
    }
    pause() {
      this.paused = true;
      this.epoch++;
      this.loading = false;
      this.clock = null;
      this.audio.cancel();
    }
    async resume() {
      this.pause();
      this.paused = false;
      const epoch = this.epoch;
      const pending = this.events.filter((event) => !event.resolved),
        past = this.events.filter((event) => event.resolved).slice(-16);
      try {
        if (pending.length) {
          const plan = await this.audio.play(
            pending.map((event) => event.char).join(""),
            this.speed,
            0.65,
            { groupSize: 0, cadence: "drill" },
          );
          if (!plan || this.paused || epoch !== this.epoch) return false;
          this.events.splice(
            0,
            this.events.length,
            ...past,
            ...plan.events.map((event, index) => ({
              ...event,
              index: pending[index].index,
              kind: pending[index].kind,
              lane: pending[index].lane,
            })),
          );
          this.clock = plan.nextStart;
        } else this.events.splice(0, this.events.length, ...past);
        this.onChange();
        // Replaying a long pending queue must not grow it with every restart.
        if (
          pending.length * window.EchoRhythm.DRILL_PACES[this.speed].interval <
          4
        )
          await this.append(pending.length ? 0 : 0.65);
        return !this.paused && epoch === this.epoch;
      } catch (error) {
        if (epoch === this.epoch && !this.paused) this.onError(error);
        return false;
      }
    }
  }
  window.EchoDrills = { CharacterDrill, randomSequence, alphabets };
})();
