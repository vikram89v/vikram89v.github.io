// Hero background — two variants:
//   default          : animated particle network (drifting nodes + connecting lines)
//   ?bg=lattice      : perovskite lattice (corner-sharing octahedra, pink halide nodes,
//                      pulsing vacancy circles, travelling edge highlights)
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const mode = new URLSearchParams(window.location.search).get('bg') || 'particles';
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TEAL = '14, 124, 123';    // site accent
  const DEEP = '29, 90, 122';     // octahedra fill (from slide, softened)
  const PINK = '214, 116, 158';   // halide nodes (from slide)

  let W = 0, H = 0, dpr = 1;

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { resize(); if (reduced) drawStatic(); });
  resize();

  /* ---------------- Variant A: particle network ---------------- */
  let nodes = [];
  function initParticles() {
    const count = Math.max(30, Math.min(75, Math.floor((W * H) / 16000)));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: 2.4 + Math.random() * 3.4
    }));
  }

  function drawParticles() {
    ctx.clearRect(0, 0, W, H);
    const LINK = 130;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK * LINK) {
          const alpha = 0.14 * (1 - Math.sqrt(d2) / LINK);
          ctx.strokeStyle = 'rgba(' + TEAL + ',' + alpha.toFixed(3) + ')';
          ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const n of nodes) {
      ctx.fillStyle = 'rgba(' + TEAL + ',0.22)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function stepParticles() {
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -10) n.x = W + 10; if (n.x > W + 10) n.x = -10;
      if (n.y < -10) n.y = H + 10; if (n.y > H + 10) n.y = -10;
    }
    drawParticles();
    requestAnimationFrame(stepParticles);
  }

  /* ---------------- Variant B: perovskite lattice ---------------- */
  let lattice = null;
  function buildLattice() {
    const s = 96;                       // lattice constant (px)
    const cols = Math.ceil(W / s) + 2;
    const rows = Math.ceil(H / s) + 2;
    const diamonds = [], edges = [], nodesSet = new Map(), aSites = [];

    for (let i = -1; i < cols; i++) {
      for (let j = -1; j < rows; j++) {
        const cx = i * s, cy = j * s;
        if (((i + j) % 2 + 2) % 2 === 0) {
          const v = [
            [cx, cy - s / 2], [cx + s / 2, cy], [cx, cy + s / 2], [cx - s / 2, cy]
          ];
          diamonds.push(v);
          for (let k = 0; k < 4; k++) {
            edges.push([v[k], v[(k + 1) % 4]]);
            nodesSet.set(v[k][0].toFixed(1) + ',' + v[k][1].toFixed(1), v[k]);
          }
        } else {
          aSites.push([cx, cy]);        // A-site cation between octahedra
        }
      }
    }
    // deterministic-ish vacancy picks spread across the area
    const nodeList = [...nodesSet.values()];
    const vacancies = [];
    const picks = [0.18, 0.47, 0.76];
    for (const p of picks) {
      const idx = Math.floor(p * nodeList.length);
      if (nodeList[idx]) vacancies.push({ pos: nodeList[idx], kind: 'halide' });
    }
    const aIdx = Math.floor(0.36 * aSites.length);
    if (aSites[aIdx]) vacancies.push({ pos: aSites[aIdx], kind: 'A-site' });

    const vacKeys = new Set(vacancies.filter(v => v.kind === 'halide')
      .map(v => v.pos[0].toFixed(1) + ',' + v.pos[1].toFixed(1)));

    lattice = { diamonds, edges, nodes: nodeList, aSites, vacancies, vacKeys };
  }

  const highlights = [];               // travelling edge glints
  function drawLattice(t) {
    ctx.clearRect(0, 0, W, H);
    const L = lattice;

    // octahedra
    for (const v of L.diamonds) {
      ctx.beginPath();
      ctx.moveTo(v[0][0], v[0][1]);
      for (let k = 1; k < 4; k++) ctx.lineTo(v[k][0], v[k][1]);
      ctx.closePath();
      ctx.fillStyle = 'rgba(' + DEEP + ',0.07)';
      ctx.strokeStyle = 'rgba(' + DEEP + ',0.14)';
      ctx.lineWidth = 1;
      ctx.fill(); ctx.stroke();
    }
    // A-site cations (faint)
    for (const a of L.aSites) {
      ctx.fillStyle = 'rgba(' + DEEP + ',0.10)';
      ctx.beginPath(); ctx.arc(a[0], a[1], 3.2, 0, Math.PI * 2); ctx.fill();
    }
    // halide nodes (pink), skipping vacancies
    for (const n of L.nodes) {
      if (L.vacKeys.has(n[0].toFixed(1) + ',' + n[1].toFixed(1))) continue;
      ctx.fillStyle = 'rgba(' + PINK + ',0.28)';
      ctx.beginPath(); ctx.arc(n[0], n[1], 3.4, 0, Math.PI * 2); ctx.fill();
    }
    // vacancies: dotted pulsing circles
    for (let i = 0; i < L.vacancies.length; i++) {
      const v = L.vacancies[i];
      const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t / 900 + i * 1.7);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(' + DEEP + ',' + (0.18 + 0.22 * pulse).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(v.pos[0], v.pos[1], 7 + 1.5 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // travelling edge highlights
    if (!reduced) {
      if (highlights.length < 4 && Math.random() < 0.03) {
        highlights.push({ edge: L.edges[Math.floor(Math.random() * L.edges.length)], t: 0 });
      }
      for (let i = highlights.length - 1; i >= 0; i--) {
        const h = highlights[i];
        h.t += 0.012;
        if (h.t >= 1) { highlights.splice(i, 1); continue; }
        const alpha = Math.sin(Math.PI * h.t) * 0.45;
        ctx.strokeStyle = 'rgba(' + TEAL + ',' + alpha.toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.edge[0][0], h.edge[0][1]);
        ctx.lineTo(h.edge[1][0], h.edge[1][1]);
        ctx.stroke();
      }
    }
  }

  function stepLattice(ts) {
    drawLattice(ts || 0);
    requestAnimationFrame(stepLattice);
  }

  /* ---------------- boot ---------------- */
  function drawStatic() {
    if (mode === 'lattice') { buildLattice(); drawLattice(0); }
    else { initParticles(); drawParticles(); }
  }

  if (reduced) {
    drawStatic();
  } else if (mode === 'lattice') {
    buildLattice();
    drawLattice(0);
    requestAnimationFrame(stepLattice);
  } else {
    initParticles();
    drawParticles();
    requestAnimationFrame(stepParticles);
  }
})();
