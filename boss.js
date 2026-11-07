"use strict";
(function () {
  const categories = [
    "phone",
    "streets",
    "names",
    "money",
    "time",
    "addresses",
    "codes",
    "locations",
    "directions",
    "work",
  ];
  function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function create() {
    return {
      health: 10,
      maxHealth: 10,
      hitAt: -10000,
      attackAt: -10000,
      order: shuffle(categories),
      phase: 1,
    };
  }
  function question(boss, round, bag) {
    if (round && round % categories.length === 0) {
      const last = boss.order.at(-1);
      boss.order = shuffle(categories);
      if (boss.order[0] === last)
        [boss.order[0], boss.order[1]] = [boss.order[1], boss.order[0]];
    }
    const category = boss.order[round % categories.length];
    return {
      ...bag.pick(category, window.EchoCourses[category].bank),
      category,
    };
  }
  function point(time, reduced = false) {
    return { x: 0.74, y: 0.52 + (reduced ? 0 : Math.sin(time / 1000) * 0.025) };
  }
  function draw(c, w, h, time, boss, reduced = false) {
    const p = point(time, reduced),
      r = Math.min(h * 0.25, w * 0.14),
      t = reduced ? 0 : time / 1000;
    const hurt = Math.max(0, 1 - (time - boss.hitAt) / 220),
      dying = boss.health === 0,
      fade = dying ? Math.max(0, 1 - (time - boss.hitAt) / 1300) : 1;
    c.save();
    c.translate(w * p.x, h * p.y);
    c.globalAlpha = fade;
    const rage = boss.health <= 3,
      accent = rage ? "#ff617e" : "#c28bff";
    let glow = c.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.4);
    glow.addColorStop(0, accent + "55");
    glow.addColorStop(1, "#10082000");
    c.fillStyle = glow;
    c.fillRect(-r * 2.4, -r * 2.4, r * 4.8, r * 4.8);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + t * 0.08,
        wiggle = Math.sin(t * 2 + i) * 0.22;
      c.save();
      c.rotate(a);
      c.strokeStyle = hurt ? "#ffdfad" : i % 2 ? "#53316f" : "#76528f";
      c.lineWidth = r * (0.13 + Math.sin(t + i) * 0.02);
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(r * 0.6, 0);
      c.bezierCurveTo(
        r * 1.1,
        -r * 0.6,
        r * 1.7,
        r * wiggle,
        r * (1.35 + Math.sin(t + i) * 0.16),
        r * 0.6,
      );
      c.stroke();
      c.strokeStyle = accent + "99";
      c.lineWidth = 1.5;
      c.stroke();
      c.restore();
    }
    const body = c.createRadialGradient(-r * 0.25, -r * 0.35, 0, 0, 0, r);
    body.addColorStop(0, hurt ? "#ffe1ba" : "#846a9c");
    body.addColorStop(0.48, "#412e57");
    body.addColorStop(1, "#1c1931");
    c.fillStyle = body;
    c.strokeStyle = hurt ? "#fff1b0" : accent;
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(0, 0, r * 0.88, r, Math.sin(t) * 0.035, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    for (const side of [-1, 1]) {
      c.fillStyle = "#ada0b5";
      c.beginPath();
      c.moveTo(side * r * 0.5, -r * 0.65);
      c.quadraticCurveTo(side * r * 1.2, -r * 1.5, side * r * 0.6, -r * 1.25);
      c.quadraticCurveTo(side * r * 0.83, -r * 0.8, side * r * 0.22, -r * 0.85);
      c.fill();
      c.fillStyle = "#261c39";
      c.beginPath();
      c.moveTo(side * r * 0.85, -r * 0.2);
      c.lineTo(side * r * 0.25, -r * 0.65);
      c.lineTo(side * r * 0.32, r * 0.6);
      c.lineTo(side * r * 0.87, r * 0.34);
      c.fill();
    }
    c.save();
    c.globalCompositeOperation = "lighter";
    c.shadowColor = accent;
    c.shadowBlur = reduced ? 0 : 22;
    for (const [x, y, size] of [
      [-0.36, -0.2, 0.18],
      [0.36, -0.2, 0.18],
      [0, -0.47, 0.12],
    ]) {
      c.fillStyle = hurt ? "#fff8bf" : accent;
      c.beginPath();
      c.ellipse(r * x, r * y, r * size, r * size * 0.65, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#100e23";
      c.beginPath();
      c.ellipse(
        r * x - r * 0.025,
        r * y,
        r * 0.035,
        r * size * 0.7,
        0,
        0,
        Math.PI * 2,
      );
      c.fill();
    }
    c.restore();
    const attacking = Math.max(0, 1 - (time - boss.attackAt) / 600);
    c.fillStyle = "#100d1d";
    c.strokeStyle = "#a96c98";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(
      0,
      r * 0.35,
      r * 0.4,
      r * (0.2 + attacking * 0.1),
      0,
      0,
      Math.PI * 2,
    );
    c.fill();
    c.stroke();
    for (let i = 0; i < 6; i++) {
      const x = (i - 2.5) * r * 0.11;
      c.fillStyle = "#e5c9bd";
      c.beginPath();
      c.moveTo(x - r * 0.045, r * 0.18);
      c.lineTo(x + r * 0.045, r * 0.18);
      c.lineTo(x, r * (0.34 + (i % 2) * 0.06));
      c.fill();
    }
    c.restore();
  }
  window.EchoBoss = { categories, create, question, point, draw };
  window.EchoCourses.boss = {
    id: 13,
    title: "Boss cuối · Tổng hợp",
    boss: true,
    bank: [],
    pages: [],
    items: [],
  };
})();
