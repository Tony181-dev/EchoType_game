"use strict";
(function () {
  class QuestionBag {
    constructor(storage, random = Math.random) {
      this.storage = storage;
      this.random = random;
      try {
        this.recent =
          JSON.parse(storage.getItem("echoFlightRecentQuestions")) || {};
      } catch (_) {
        this.recent = {};
      }
      if (typeof this.recent !== "object" || Array.isArray(this.recent))
        this.recent = {};
    }
    pick(category, items) {
      if (!items.length) throw new Error("Question pool is empty");
      const pool = [
        ...new Map(
          items.map((item) => [item.answer.toLowerCase(), item]),
        ).values(),
      ];
      const valid = new Set(pool.map((item) => item.answer));
      let history = [
        ...new Set(
          (Array.isArray(this.recent[category])
            ? this.recent[category]
            : []
          ).filter((answer) => valid.has(answer)),
        ),
      ];
      let available = pool.filter((item) => !history.includes(item.answer));
      if (!available.length) {
        const last = history.at(-1);
        history = [];
        available =
          pool.length > 1 ? pool.filter((item) => item.answer !== last) : pool;
      }
      const item = available[Math.floor(this.random() * available.length)];
      history.push(item.answer);
      this.recent[category] = history.slice(-pool.length);
      try {
        this.storage.setItem(
          "echoFlightRecentQuestions",
          JSON.stringify(this.recent),
        );
      } catch (_) {}
      return { ...item };
    }
  }
  window.EchoQuestions = { QuestionBag };
})();
