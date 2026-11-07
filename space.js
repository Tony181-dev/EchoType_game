"use strict";
class SpaceRenderer {
  constructor(canvas, state, tick) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.state = state;
    this.tick = tick;
    this.stars = Array.from({ length: 130 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      z: 1 + (i % 3),
      r: 0.4 + (i % 3) * 0.45,
    }));
    this.particles = [];
    this.rings = [];
    this.shots = [];
    this.enemyShots = [];
    this.recoil = 0;
    this.hitAt = -1000;
    this.last = performance.now();
    this.travel = 0;
    this.aim = 0.52;
    this.heroY = 0.52;
    this.bank = 0;
    this.trail = [];
    this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    requestAnimationFrame((t) => this.frame(t));
  }
  reset() {
    this.particles = [];
    this.shots = [];
    this.enemyShots = [];
    this.rings = [];
    this.hitAt = -1000;
    this.aim = 0.52;
    this.heroY = 0.52;
    this.bank = 0;
    this.trail = [];
    this.recoil = -1000;
  }
  updateShots(now) {
    for (const shot of this.enemyShots)
      if (now - shot.born >= shot.life && !shot.exploded) {
        shot.exploded = true;
        this.impact();
      }
    this.enemyShots = this.enemyShots.filter(
      (shot) => now - shot.born < shot.life + 60,
    );
    // Settle the hit before discarding its projectile. A slow frame must not
    // swallow the explosion just because the short laser animation elapsed.
    for (const shot of this.shots) {
      if (now - shot.born >= shot.life && !shot.exploded) {
        shot.exploded = true;
        this.burst(shot.x, shot.y, shot.color, now);
      }
    }
    this.shots = this.shots.filter((shot) => now - shot.born < shot.life + 60);
  }
  updateSteering(dt, paused) {
    if (paused) return;
    this.bank +=
      (Math.max(-0.2, Math.min(0.2, (this.aim - this.heroY) * 2)) - this.bank) *
      (1 - Math.exp(-5 * dt));
    this.heroY += (this.aim - this.heroY) * (1 - Math.exp(-3.4 * dt));
  }
  position(e, now) {
    const p = Math.max(0, Math.min(1, (now - e.born) / (e.deadline - e.born)));
    if (this.state().boss)
      return { ...window.EchoBoss.point(now, this.reduced.matches), p };
    const spawn = 0.28 + e.lane * 0.2;
    return {
      x: 1.04 - 0.85 * p,
      y: spawn + (this.heroY - spawn) * p * p * p,
      p,
    };
  }
  shoot(e, now) {
    const point = this.position(e, now);
    this.shots.push({
      born: now,
      life: 120,
      x: point.x,
      y: point.y,
      origin: this.heroY,
      color: e.kind === "ufo" ? "#b9a7ff" : "#ffd08a",
    });
    this.recoil = now;
    this.aim = 0.38 + e.lane * 0.14;
  }
  burst(x, y, color, now) {
    for (let i = 0; i < (this.reduced.matches ? 5 : 34); i++) {
      const a = Math.random() * Math.PI * 2,
        v = 0.04 + Math.random() * 0.15;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        born: now,
        life: 350 + Math.random() * 600,
        color,
        r: 1 + Math.random() * 3,
      });
    }
    this.rings.push({ x, y, born: now, color });
  }
  impact() {
    const now = performance.now();
    this.hitAt = now;
    this.aim = this.heroY < 0.5 ? 0.65 : 0.39;
    this.burst(0.19, this.heroY, "#ff8c91", now);
  }
  bossAttack(now) {
    this.enemyShots.push({
      born: now,
      life: 500,
      origin: window.EchoBoss.point(now, this.reduced.matches),
      target: this.heroY,
    });
    this.state().boss.attackAt = now;
  }
  wrong() {
    this.recoil = performance.now() - 100;
  }
  path(points, fill, stroke) {
    const c = this.ctx;
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1;
      c.stroke();
    }
  }
  ship(x, y, scale, now) {
    const c = this.ctx;
    const kick = !this.reduced.matches
      ? Math.max(0, 1 - (now - this.recoil) / 150) * 6
      : 0;
    c.save();
    c.translate(x - kick, y);
    c.scale(scale, scale);
    c.rotate(
      this.reduced.matches ? 0 : this.bank + Math.sin(now / 600) * 0.035,
    );
    const flare = this.reduced.matches ? 1 : 1 + Math.sin(now / 38) * 0.15;
    c.globalCompositeOperation = "lighter";
    let g = c.createLinearGradient(-92, 0, -25, 0);
    g.addColorStop(0, "#53b2ff00");
    g.addColorStop(0.55, "#4fc4ff80");
    g.addColorStop(1, "#d8fbff");
    this.path(
      [
        [-27, -10],
        [-95 * flare, 0],
        [-27, 10],
      ],
      g,
    );
    this.path(
      [
        [-29, -6],
        [-68 * flare, 0],
        [-29, 6],
      ],
      "#b7faff",
    );
    c.globalCompositeOperation = "source-over";
    c.shadowBlur = 16;
    c.shadowColor = "#7ac9db";
    this.path(
      [
        [57, 0],
        [9, -13],
        [-21, -34],
        [-38, -34],
        [-26, -8],
        [-37, 0],
        [-26, 8],
        [-38, 34],
        [-21, 34],
        [9, 13],
      ],
      "#294957",
      "#528c9a",
    );
    c.shadowBlur = 0;
    let metal = c.createLinearGradient(0, -35, 0, 35);
    metal.addColorStop(0, "#cbdcdb");
    metal.addColorStop(0.4, "#668c98");
    metal.addColorStop(0.5, "#d1e4df");
    metal.addColorStop(1, "#243d50");
    this.path(
      [
        [55, 0],
        [-12, -15],
        [-31, -29],
        [-19, -9],
        [-29, 0],
        [-19, 9],
        [-31, 29],
        [-12, 15],
      ],
      metal,
      "#7fa4b1",
    );
    this.path(
      [
        [49, 0],
        [-5, -8],
        [-20, 0],
        [-5, 8],
      ],
      "#e0ead5",
    );
    this.path(
      [
        [17, 0],
        [-5, -6],
        [-15, 0],
        [-5, 6],
      ],
      "#173951",
      "#8be9e8",
    );
    this.path(
      [
        [13, 0],
        [-6, -3],
        [-10, 0],
        [-6, 3],
      ],
      "#81cdd5",
    );
    this.path(
      [
        [-8, -15],
        [-26, -29],
        [-19, -10],
      ],
      "#6b8795",
    );
    this.path(
      [
        [-8, 15],
        [-26, 29],
        [-19, 10],
      ],
      "#455e73",
    );
    c.fillStyle = "#c6f78a";
    c.fillRect(-21, -24, 9, 2);
    c.fillRect(-21, 22, 9, 2);
    c.fillStyle = "#a8eafa";
    c.fillRect(-27, -9, 4, 5);
    c.fillRect(-27, 4, 4, 5);
    c.restore();
  }
  enemy(x, y, size, kind, now, seed) {
    const c = this.ctx;
    c.save();
    c.translate(x, y);
    c.scale(size, size);
    if (kind === "meteor") {
      const a = now / 2100 + seed;
      c.rotate(a);
      c.shadowColor = "#e79051";
      c.shadowBlur = 18;
      const g = c.createRadialGradient(-7, -10, 0, 0, 0, 30);
      g.addColorStop(0, "#d8b596");
      g.addColorStop(0.35, "#96644e");
      g.addColorStop(1, "#342d37");
      const points = [];
      for (let i = 0; i < 11; i++) {
        let angle = (i / 11) * Math.PI * 2,
          r = 23 + Math.sin(i * 3.6 + seed) * 5;
        points.push([Math.cos(angle) * r, Math.sin(angle) * r]);
      }
      this.path(points, g, "#c79a73");
      c.shadowBlur = 0;
      for (const [xx, yy, r] of [
        [-9, -8, 6],
        [9, 4, 8],
        [-7, 13, 4],
      ]) {
        c.fillStyle = "#4a3434";
        c.beginPath();
        c.ellipse(xx, yy, r, r * 0.72, 0.3, 0, 7);
        c.fill();
        c.strokeStyle = "#bc8d6d";
        c.stroke();
      }
      c.strokeStyle = "#efb46e77";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(3, -15);
      c.lineTo(-1, -5);
      c.lineTo(6, 1);
      c.stroke();
    } else {
      c.rotate(this.reduced.matches ? 0 : Math.sin(now / 450 + seed) * 0.12);
      c.shadowColor = "#e278a8";
      c.shadowBlur = 22;
      this.path(
        [
          [-34, 0],
          [-11, -11],
          [0, -25],
          [11, -11],
          [34, 0],
          [13, 8],
          [0, 18],
          [-13, 8],
        ],
        "#393c63",
        "#8587b2",
      );
      c.shadowBlur = 0;
      this.path(
        [
          [-26, 0],
          [0, -13],
          [26, 0],
          [0, 10],
        ],
        "#8c7ba6",
        "#c3a2c2",
      );
      this.path(
        [
          [-10, -3],
          [0, -18],
          [10, -3],
          [0, 3],
        ],
        "#2b3b60",
        "#8e91cf",
      );
      c.fillStyle = "#ffb3b8";
      c.shadowColor = "#ff5985";
      c.shadowBlur = 12;
      c.fillRect(-7, 0, 14, 3);
      c.shadowBlur = 0;
      c.fillStyle = "#f4bbce";
      c.fillRect(-24, -1, 4, 2);
      c.fillRect(20, -1, 4, 2);
    }
    c.restore();
  }
  frame(now) {
    const c = this.ctx,
      r = this.canvas.getBoundingClientRect(),
      w = r.width,
      h = r.height,
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w < 1 || h < 1) {
      requestAnimationFrame((t) => this.frame(t));
      return;
    }
    if (
      this.canvas.width !== Math.round(w * dpr) ||
      this.canvas.height !== Math.round(h * dpr)
    ) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const g = this.state();
    if (g.paused) {
      if (!this.pauseAt) this.pauseAt = now;
    } else this.pauseAt = 0;
    const time = this.pauseAt || now;
    const active = g.running && !g.paused;
    const speed = (Number(document.getElementById("pace").value) || 100) / 100;
    this.updateSteering(dt, g.paused);
    if (!this.reduced.matches && !g.paused)
      this.travel += dt * (active ? 25 + speed * 18 : 17);
    c.clearRect(0, 0, w, h);
    c.save();
    if (!this.reduced.matches && now - this.hitAt < 240) {
      const a = (1 - (now - this.hitAt) / 240) * 6;
      c.translate(Math.sin(now) * a, Math.cos(now * 0.7) * a);
    }
    const bg = c.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#071a2b");
    bg.addColorStop(0.6, "#10283b");
    bg.addColorStop(1, "#221d34");
    c.fillStyle = bg;
    c.fillRect(-10, -10, w + 20, h + 20);
    for (const [xx, yy, col, rad] of [
      [0.66, 0.3, "#5d74962f", 0.47],
      [0.92, 0.75, "#98618535", 0.46],
      [0.22, 0.7, "#24687b28", 0.3],
    ]) {
      const neb = c.createRadialGradient(
        xx * w,
        yy * h,
        0,
        xx * w,
        yy * h,
        w * rad,
      );
      neb.addColorStop(0, col);
      neb.addColorStop(1, "#10152c00");
      c.fillStyle = neb;
      c.fillRect(0, 0, w, h);
    }
    // Distant orbital planet, slowly drifting behind the starfield.
    c.save();
    const px = w * 0.78 - this.travel * 0.025,
      py = h * 0.21,
      pr = Math.min(w * 0.105, 65);
    c.translate(px, py);
    c.rotate(-0.35);
    c.strokeStyle = "#8fa8c033";
    c.lineWidth = 8;
    c.beginPath();
    c.ellipse(0, 0, pr * 1.8, pr * 0.38, 0, 0, Math.PI * 2);
    c.stroke();
    const planet = c.createRadialGradient(-pr * 0.5, -pr * 0.5, 0, 0, 0, pr);
    planet.addColorStop(0, "#95b1bc");
    planet.addColorStop(0.4, "#4f7286");
    planet.addColorStop(1, "#182f47");
    c.fillStyle = planet;
    c.beginPath();
    c.arc(0, 0, pr, 0, 7);
    c.fill();
    c.globalAlpha = 0.3;
    c.strokeStyle = "#aec8cc";
    for (let j = -2; j < 3; j++) {
      c.beginPath();
      c.ellipse(
        0,
        j * pr * 0.23,
        pr * Math.sqrt(1 - (j * 0.23) ** 2),
        pr * 0.1,
        0,
        0,
        Math.PI,
      );
      c.stroke();
    }
    c.restore();
    for (const s of this.stars) {
      const x =
        ((((s.x * w - this.travel * s.z) % (w + 20)) + w + 20) % (w + 20)) - 10;
      c.globalAlpha = 0.3 + s.z * 0.17;
      c.strokeStyle = "#b9e1ee";
      c.lineWidth = s.r;
      c.beginPath();
      c.moveTo(x, s.y * h);
      c.lineTo(
        x + (active && !this.reduced.matches ? s.z * speed * 2 : s.r),
        s.y * h,
      );
      c.stroke();
    }
    c.globalAlpha = 1;
    // A few distant rocks travel outside the player lane; they are scenery.
    for (let i = 0; i < 4; i++) {
      const x =
        ((((w * (0.4 + i * 0.23) - this.travel * (0.4 + i * 0.08)) %
          (w + 100)) +
          w +
          100) %
          (w + 100)) -
        50;
      c.globalAlpha = 0.16;
      this.enemy(
        x,
        h * (i % 2 ? 0.83 : 0.15),
        0.23 + i * 0.05,
        "meteor",
        time,
        i,
      );
      c.globalAlpha = 1;
    }
    const scale = Math.max(0.7, Math.min(1.22, w / 750));
    if (!this.reduced.matches) {
      this.trail.push({ y: this.heroY, born: now });
      this.trail = this.trail.filter((p) => now - p.born < 450);
      c.save();
      c.globalCompositeOperation = "lighter";
      for (const t of this.trail) {
        const age = (now - t.born) / 450;
        c.globalAlpha = (1 - age) * 0.14;
        c.strokeStyle = "#83eaff";
        c.lineWidth = 6 * (1 - age) + 1;
        c.beginPath();
        c.moveTo(w * 0.15 - age * 75, h * t.y);
        c.lineTo(w * 0.17 - age * 75, h * t.y);
        c.stroke();
      }
      c.restore();
    }
    this.ship(w * 0.19, h * this.heroY, scale, time);
    if (g.boss) {
      window.EchoBoss.draw(c, w, h, time, g.boss, this.reduced.matches);
      const event = (g.events || []).find(
        (ev) => !ev.resolved && ev.born <= time,
      );
      if (g.running && event) {
        const remaining = Math.max(
          0,
          (event.deadline - time) / (event.deadline - event.born),
        );
        c.strokeStyle = "#c8f580";
        c.lineWidth = 3;
        c.beginPath();
        c.arc(
          w * 0.74,
          h * 0.52,
          Math.min(h * 0.25, w * 0.14) * 1.15,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * remaining,
        );
        c.stroke();
      }
    } else if (g.running) {
      const currentTarget = (g.events || []).find(
        (ev) => !ev.resolved && ev.born <= time,
      );
      for (const ev of g.events || []) {
        if (ev.resolved || time < ev.born) continue;
        const p = this.position(ev, time);
        const sz =
          scale * (0.62 + p.p * 0.53) * (g.learning === "reflex" ? 1 : 1.65);
        c.strokeStyle = "#e4b18a22";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(p.x * w + 20, p.y * h);
        c.lineTo(p.x * w + 80, p.y * h - 10);
        c.stroke();
        this.enemy(p.x * w, p.y * h, sz, ev.kind, time, ev.index);
        const isCurrent = ev === currentTarget;
        c.strokeStyle = isCurrent ? "#c8f580" : "#d5e6d344";
        c.lineWidth = isCurrent ? 2 : 1;
        c.setLineDash([4, 7]);
        c.beginPath();
        c.arc(p.x * w, p.y * h, 35 * sz, 0, 7);
        c.stroke();
        c.setLineDash([]);
        if (isCurrent) {
          c.beginPath();
          c.arc(
            p.x * w,
            p.y * h,
            40 * sz,
            -Math.PI / 2,
            -Math.PI / 2 + Math.PI * 2 * (1 - p.p),
          );
          c.stroke();
        }
        c.fillStyle = "#e5f1eb";
        c.font = "9px monospace";
        c.textAlign = "center";
        c.fillText(
          String(ev.index + 1).padStart(2, "0"),
          p.x * w,
          p.y * h - 43 * sz,
        );
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const p = (time / 17000 + i * 0.43) % 1;
        this.enemy(
          w * (0.99 - 0.48 * p),
          h * (0.6 + i * 0.13),
          scale * (0.6 + i * 0.18),
          i ? "ufo" : "meteor",
          time,
          i,
        );
      }
    }
    this.updateShots(now);
    for (const shot of this.enemyShots) {
      const p = Math.min(1, (time - shot.born) / shot.life),
        x = (shot.origin.x + (0.19 - shot.origin.x) * p) * w,
        y = (shot.origin.y + (shot.target - shot.origin.y) * p) * h;
      c.save();
      c.globalCompositeOperation = "lighter";
      c.shadowBlur = 16;
      c.shadowColor = "#ff518b";
      c.fillStyle = "#ffb8ca";
      c.beginPath();
      c.arc(x, y, 7 + Math.sin(time / 35) * 1.3, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#ff5a88";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x + 25, y);
      c.lineTo(x - 7, y);
      c.stroke();
      c.restore();
    }
    for (const s of this.shots) {
      const p = Math.min(1, (now - s.born) / s.life);
      c.save();
      c.globalCompositeOperation = "lighter";
      c.strokeStyle = "#d6ff91";
      c.shadowColor = "#d5ff69";
      c.shadowBlur = 14;
      c.lineWidth = 2;
      for (const offset of [-4, 4]) {
        c.beginPath();
        const x = 0.22 + (s.x - 0.22) * p,
          y = s.origin + (s.y - s.origin) * p;
        c.moveTo(x * w - 19, y * h + offset);
        c.lineTo(x * w + 7, y * h + offset);
        c.stroke();
      }
      c.restore();
    }
    this.rings = this.rings.filter((r) => now - r.born < 650);
    for (const ring of this.rings) {
      const p = (now - ring.born) / 650;
      c.save();
      c.globalCompositeOperation = "lighter";
      const light = c.createRadialGradient(
        ring.x * w,
        ring.y * h,
        0,
        ring.x * w,
        ring.y * h,
        12 + 65 * p,
      );
      light.addColorStop(0, p < 0.2 ? "#fff6d4" : ring.color + "66");
      light.addColorStop(0.4, ring.color + "66");
      light.addColorStop(1, "#00000000");
      c.globalAlpha = 1 - p;
      c.fillStyle = light;
      c.beginPath();
      c.arc(ring.x * w, ring.y * h, 12 + 65 * p, 0, 7);
      c.fill();
      c.restore();
      c.globalAlpha = (1 - p) * 0.8;
      c.strokeStyle = ring.color;
      c.lineWidth = 2 * (1 - p) + 0.5;
      c.beginPath();
      c.arc(ring.x * w, ring.y * h, 8 + 62 * p, 0, 7);
      c.stroke();
      c.globalAlpha = (1 - p) * 0.45;
      c.beginPath();
      c.arc(ring.x * w, ring.y * h, 5 + 42 * p, 0, 7);
      c.stroke();
    }
    this.particles = this.particles.filter((p) => now - p.born < p.life);
    for (const p of this.particles) {
      const a = (now - p.born) / p.life;
      c.globalAlpha = 1 - a;
      c.strokeStyle = p.color;
      c.lineWidth = p.r * 0.55;
      c.beginPath();
      c.moveTo(
        (p.x + p.vx * Math.max(0, a - 0.09)) * w,
        (p.y + p.vy * Math.max(0, a - 0.09)) * h,
      );
      c.lineTo((p.x + p.vx * a) * w, (p.y + p.vy * a) * h);
      c.stroke();
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(
        (p.x + p.vx * a) * w,
        (p.y + p.vy * a) * h,
        p.r * (1 - a) + 0.4,
        0,
        7,
      );
      c.fill();
    }
    c.globalAlpha = 1;
    if (!this.reduced.matches && now - this.hitAt < 180) {
      c.fillStyle = "#ff586722";
      c.fillRect(0, 0, w, h);
    }
    c.restore();
    if (active) this.tick(now);
    requestAnimationFrame((t) => this.frame(t));
  }
}
