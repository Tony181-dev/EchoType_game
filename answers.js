"use strict";
(function () {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const monthMap = new Map(
    months.flatMap((name, i) => [
      [name, i + 1],
      [name.slice(0, 3), i + 1],
      ...(i === 8 ? [["sept", 9]] : []),
    ]),
  );
  const ones = [
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
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const ordinals = [
    "zeroth",
    "first",
    "second",
    "third",
    "fourth",
    "fifth",
    "sixth",
    "seventh",
    "eighth",
    "ninth",
    "tenth",
    "eleventh",
    "twelfth",
    "thirteenth",
    "fourteenth",
    "fifteenth",
    "sixteenth",
    "seventeenth",
    "eighteenth",
    "nineteenth",
  ];
  const tens = {
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    twentieth: 20,
    thirtieth: 30,
  };
  const clean = (s) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[’']/g, "")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ");
  function number(text) {
    const ordinal = clean(text).match(/^(\d+)(st|nd|rd|th)$/);
    if (ordinal) {
      const n = +ordinal[1],
        suffix =
          n % 100 >= 11 && n % 100 <= 13
            ? "th"
            : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
      if (ordinal[2] !== suffix) return null;
    }
    const s = clean(text)
      .replace(/^(?:oh|zero) /, "")
      .replace(/(\d)(st|nd|rd|th)\b/g, "$1");
    if (/^\d+$/.test(s)) return +s;
    if (ones.includes(s)) return ones.indexOf(s);
    if (ordinals.includes(s)) return ordinals.indexOf(s);
    if (s in tens) return tens[s];
    const [first, second, ...extra] = s.split(" "),
      tail =
        ones.indexOf(second) >= 0
          ? ones.indexOf(second)
          : ordinals.indexOf(second);
    return !extra.length && first in tens && tail > 0 && tail < 10
      ? tens[first] + tail
      : null;
  }
  function time(text) {
    let s = clean(text)
      .replace(/^(?:around|about|approximately) /, "")
      .replace(/([ap])\.?\s*m\.?$/, "$1m");
    let period = null;
    const periodMatch = s.match(/\s*(am|pm)$/);
    if (periodMatch) {
      period = periodMatch[1];
      s = s.slice(0, periodMatch.index).trim();
    }
    let hour,
      minute,
      subtractHour = false;
    if (s === "noon") {
      hour = 12;
      minute = 0;
    } else if (s === "midnight") {
      hour = 0;
      minute = 0;
    } else if (/^\d{1,2}[:.]\d{2}$/.test(s)) {
      [hour, minute] = s.split(/[:.]/).map(Number);
    } else {
      s = s.replace(/^(?:a|one) quarter /, "quarter ").replace(/ oclock$/, "");
      const relative = s.match(/^(half|quarter|[a-z ]+|\d+) (past|to) (.+)$/);
      if (relative) {
        const amount =
          relative[1] === "half"
            ? 30
            : relative[1] === "quarter"
              ? 15
              : number(relative[1]);
        hour = number(relative[3]);
        if (hour === null || amount === null || amount < 1 || amount > 59)
          return null;
        minute = relative[2] === "past" ? amount : 60 - amount;
        subtractHour = relative[2] === "to";
      } else if (s.startsWith("half ")) {
        hour = number(s.slice(5));
        minute = 30;
      } else {
        const tokens = s.split(" ");
        hour = number(tokens[0]);
        minute = tokens.length === 1 ? 0 : number(tokens.slice(1).join(" "));
      }
    }
    if (
      hour === null ||
      minute === null ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    )
      return null;
    if (period) {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (period === "pm" ? 12 : 0);
    }
    if (subtractHour) hour = (hour + 23) % 24;
    return { minutes: hour * 60 + minute, period };
  }
  function date(text) {
    let s = clean(text.replace(/(\d)-(?=\d)/g, "$1/"))
      .replace(/\./g, "")
      .replace(/\b(?:the|of)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    let year = null;
    const yearMatch = s.match(/\b(\d{4})\b/);
    if (yearMatch) {
      year = +yearMatch[1];
      s = s.replace(yearMatch[0], "").trim();
    }
    const valid = (day, month) =>
      day >= 1 &&
      month >= 1 &&
      month <= 12 &&
      day <=
        [
          31,
          year && year % 4 !== 0 ? 28 : 29,
          31,
          30,
          31,
          30,
          31,
          31,
          30,
          31,
          30,
          31,
        ][month - 1];
    const numeric = s.match(/^(\d{1,2})[\/-](\d{1,2})$/);
    if (numeric) {
      const a = +numeric[1],
        b = +numeric[2],
        possibilities = [];
      if (valid(a, b)) possibilities.push([a, b]);
      if (valid(b, a) && a !== b) possibilities.push([b, a]);
      if (possibilities.length !== 1) return null;
      return { day: possibilities[0][0], month: possibilities[0][1], year };
    }
    const tokens = s.split(" "),
      at = tokens.findIndex((t) => monthMap.has(t));
    if (at < 0) return null;
    const month = monthMap.get(tokens[at]);
    tokens.splice(at, 1);
    const day = number(tokens.join(" "));
    return day !== null && valid(day, month) ? { day, month, year } : null;
  }
  function matches(value, expected, { strict = false } = {}) {
    const expectedDate = date(expected);
    if (expectedDate) {
      const actual = date(value);
      if (!actual || JSON.stringify(actual) !== JSON.stringify(expectedDate))
        return false;
      if (strict) {
        const words = value
          .trim()
          .toLowerCase()
          .split(/\s+/)
          .filter((token) => !/^\d+(?:st|nd|rd|th)?$/.test(token));
        if (words.length > 3) return false;
      }
      return true;
    }
    const reference = time(expected),
      actual = time(value);
    if (!reference || !actual || reference.minutes !== actual.minutes)
      return false;
    return !strict || /^\d{1,2}[:.]\d{2}$/.test(value.trim());
  }
  window.EchoAnswers = { matches, time, date };
})();
