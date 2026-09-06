"use client";

import { useEffect, useRef } from "react";

/**
 * Fond anime plein ecran, derriere tout le contenu : nappes rouges qui derivent, lignes de
 * relief comme une carte qui ondulent a peine, trainees de phares (blanc) et de feux arriere
 * (rouge) qui traversent la nuit, halo qui suit le pointeur. Discret, lisible, un seul canvas ;
 * pause hors ecran ; version fixe si l'utilisateur prefere moins d'animations.
 */
export function AnimatedBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    type Trail = {
      y: number;
      x: number;
      speed: number;
      length: number;
      thickness: number;
      alpha: number;
      dir: 1 | -1;
      red: boolean;
    };
    let trails: Trail[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let visible = true;

    const newTrail = (spawnInside = false): Trail => {
      const red = Math.random() < 0.45;
      const dir: 1 | -1 = red ? -1 : 1;
      const length = 140 + Math.random() * 320;
      return {
        y: height * (0.12 + Math.random() * 0.82),
        x: spawnInside ? Math.random() * width : dir === 1 ? -length : width + length,
        speed: (0.18 + Math.random() * 0.35) * (coarse ? 0.7 : 1),
        length,
        thickness: 1 + Math.random() * 1.6,
        alpha: 0.14 + Math.random() * 0.26,
        dir,
        red,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = coarse ? 5 : Math.min(11, Math.max(7, Math.round(width / 150)));
      trails = Array.from({ length: count }, () => newTrail(true));
    };

    const drawBlobs = () => {
      const blobs = [
        {
          x: 0.18 + Math.sin(t / 9000) * 0.08,
          y: -0.05 + Math.cos(t / 11000) * 0.06,
          r: 0.75,
          c: "227,36,59",
          a: 0.2,
        },
        {
          x: 0.9 + Math.cos(t / 13000) * 0.06,
          y: 0.15 + Math.sin(t / 9500) * 0.08,
          r: 0.55,
          c: "255,92,109",
          a: 0.09,
        },
        { x: 0.55 + Math.sin(t / 15000) * 0.1, y: 0.95, r: 0.6, c: "120,20,40", a: 0.14 },
      ];
      for (const b of blobs) {
        const g = ctx.createRadialGradient(
          b.x * width,
          b.y * height,
          0,
          b.x * width,
          b.y * height,
          b.r * width,
        );
        g.addColorStop(0, `rgba(${b.c},${b.a})`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }
    };

    /** Lignes de relief : quelques courbes douces, comme les isolignes d'une carte, qui respirent. */
    const drawContours = () => {
      const lines = coarse ? 5 : 8;
      const step = 14;
      ctx.lineWidth = 1;
      for (let i = 0; i < lines; i += 1) {
        const base = height * (0.08 + (i / (lines - 1)) * 0.84);
        const phase = i * 1.7;
        ctx.strokeStyle = `rgba(244,242,238,${0.028 + (i % 3) * 0.008})`;
        ctx.beginPath();
        for (let x = -step; x <= width + step; x += step) {
          const y =
            base +
            Math.sin(x / 260 + phase + t / 7000) * 18 +
            Math.sin(x / 90 - phase + t / 11000) * 6 +
            Math.cos(x / 520 + t / 9000) * 12;
          if (x === -step) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    };

    /** Trainees lumineuses : phares en blanc chaud d'un cote, feux arriere en rouge de l'autre. */
    const drawTrails = (dt: number) => {
      for (let i = 0; i < trails.length; i += 1) {
        const tr = trails[i]!;
        tr.x += tr.dir * tr.speed * dt;
        const head = tr.x;
        const tail = tr.x - tr.dir * tr.length;
        const off = tr.dir === 1 ? head > width + tr.length : head < -tr.length;
        if (off) {
          trails[i] = newTrail(false);
          continue;
        }
        const color = tr.red ? "255,92,109" : "244,242,238";
        const g = ctx.createLinearGradient(tail, tr.y, head, tr.y);
        g.addColorStop(0, `rgba(${color},0)`);
        g.addColorStop(0.75, `rgba(${color},${tr.alpha * 0.55})`);
        g.addColorStop(1, `rgba(${color},${tr.alpha})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = tr.thickness;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(tail, tr.y);
        ctx.lineTo(head, tr.y);
        ctx.stroke();
        // Point lumineux en tete, avec un leger halo.
        const glow = ctx.createRadialGradient(head, tr.y, 0, head, tr.y, 14);
        glow.addColorStop(0, `rgba(${color},${tr.alpha * 0.9})`);
        glow.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(head - 14, tr.y - 14, 28, 28);
      }
    };

    const drawPointer = () => {
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      if (!pointer.active) return;
      const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 280);
      g.addColorStop(0, "rgba(227,36,59,0.16)");
      g.addColorStop(0.5, "rgba(227,36,59,0.05)");
      g.addColorStop(1, "rgba(227,36,59,0)");
      ctx.fillStyle = g;
      ctx.fillRect(pointer.x - 280, pointer.y - 280, 560, 560);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      drawBlobs();
      drawContours();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(48, now - last);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, width, height);
      drawBlobs();
      drawContours();
      drawPointer();
      drawTrails(dt);
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX;
      pointer.ty = e.clientY;
      if (!pointer.active) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
      }
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.tx = -9999;
      pointer.ty = -9999;
    };
    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      last = performance.now();
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    if (reduced) {
      drawStatic();
    } else {
      if (!coarse) {
        window.addEventListener("pointermove", onMove, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
      }
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-dvh w-screen"
    />
  );
}
