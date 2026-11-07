"use strict";
(function () {
  const courses = window.EchoCourses;
  function add(category, items) {
    const seen = new Set(
      courses[category].bank.map((item) => item.answer.toLowerCase()),
    );
    for (const item of items) {
      if (seen.has(item.answer.toLowerCase())) continue;
      seen.add(item.answer.toLowerCase());
      courses[category].bank.push(item);
    }
  }
  const surnames = [
    "Bradley",
    "Parker",
    "Bennett",
    "Clarke",
    "Miller",
    "Taylor",
    "Gordon",
    "Morgan",
    "Russell",
  ];
  add(
    "names",
    courses.names.bank
      .filter((item) => !surnames.includes(item.answer))
      .flatMap((first) =>
        surnames.map((last) => ({
          answer: `${first.answer} ${last}`,
          spoken: `${first.answer} ${last}`,
          spell: true,
          spokenParts: [{ text: first.spoken }, { text: last }],
        })),
      ),
  );
  const numbers = [
    "12",
    "15",
    "17B",
    "24",
    "30",
    "42A",
    "50",
    "61",
    "73",
    "85",
    "104",
    "116",
    "130",
    "150",
    "208",
    "219",
    "307",
    "415",
    "502",
    "608",
  ];
  add(
    "addresses",
    numbers.flatMap((number) =>
      courses.streets.bank.map((street) => ({
        answer: `${number} ${street.answer}`,
        spoken: `${number} ${street.answer}`,
        spokenParts: [{ characters: number }, { text: street.spoken }],
      })),
    ),
  );
  let seed = 984173;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const digits = (length) =>
    Array.from({ length }, () => Math.floor(random() * 10)).join("");
  const letters = (length) =>
    Array.from(
      { length },
      () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(random() * 26)],
    ).join("");
  add(
    "phone",
    Array.from({ length: 300 }, () => {
      const answer =
        "0" + ["1", "2", "7"][Math.floor(random() * 3)] + digits(9);
      return {
        answer,
        spoken: answer,
        spell: false,
        spokenParts: [{ characters: answer }],
      };
    }),
  );
  add(
    "codes",
    Array.from({ length: 300 }, (_, index) => {
      const answer =
        index % 2
          ? `${letters(2)}-${digits(4)}`
          : `${letters(2)}${digits(1)} ${digits(1)}${letters(2)}`;
      return { answer, spoken: answer, spokenParts: [{ characters: answer }] };
    }),
  );
  const places = courses.locations.bank.filter((item) =>
    /Station|Airport|Hotel|Library|Museum|Inn|Guesthouse|University|Observatory|Pier|Cathedral/.test(
      item.answer,
    ),
  );
  add(
    "directions",
    ["opposite", "next to"].flatMap((position) =>
      places.map((place) => ({
        answer: `${position} ${place.answer}`,
        spoken: `${position} ${place.answer}`,
        spokenParts: [{ text: position }, { text: place.spoken }],
      })),
    ),
  );
})();
