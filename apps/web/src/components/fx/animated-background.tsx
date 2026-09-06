"use client";

import { useEffect, useRef } from "react";

/**
 * Fond anime plein ecran, derriere tout le contenu : nappes rouges qui derivent,
 * champ de particules relie pres du pointeur, halo qui suit la souris, grille en
 * perspective qui avance. Canvas unique, budget < 3 ms par image, pause hors ecran,
 * version fixe si l'utilisateur prefere moins d'animations.
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
    type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
    let particles: P[] = [];
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let visible = true;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = coarse ? 45 : Math.min(140, Math.round((width * height) / 14000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.08 - Math.random() * 0.18,
        r: 0.6 + Math.random() * 1.6,
        a: 0.25 + Math.random() * 0.5,
      }));
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      const g = ctx.createRadialGradient(width * 0.2, -100, 0, width * 0.2, -100, width * 0.7);
      g.addColorStop(0, "rgba(227,36,59,0.22)");
      g.addColorStop(1, "rgba(227,36,59,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      const dt = Math.min(48, now - last);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, width, height);

      // Nappes lumineuses qui derivent lentement.
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
        { x: 0.55 + Math.sin(t / 15000) * 0.1, y: 0.9, r: 0.6, c: "120,20,40", a: 0.14 },
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

      // Grille en perspective, bas de page, qui avance vers le lecteur.
      const horizon = height * 0.62;
      const speed = (t / 40) % 60;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizon, width, height - horizon);
      ctx.clip();
      ctx.lineWidth = 1;
      for (let i = 0; i < 18; i += 1) {
        const p = ((i * 60 + speed) % 1080) / 1080;
        const y = horizon + Math.pow(p, 2.2) * (height - horizon);
        const alpha = 0.02 + p * 0.09;
        ctx.strokeStyle = `rgba(255,92,109,${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      const vanish = { x: width / 2, y: horizon - 40 };
      for (let i = -12; i <= 12; i += 1) {
        const xBottom = width / 2 + i * (width / 9);
        ctx.strokeStyle = `rgba(255,92,109,${0.035 + (1 - Math.abs(i) / 12) * 0.04})`;
        ctx.beginPath();
        ctx.moveTo(vanish.x, vanish.y);
        ctx.lineTo(xBottom, height);
        ctx.stroke();
      }
      ctx.restore();
      // Fondu au-dessus de l'horizon pour que la grille naisse en douceur.
      const fade = ctx.createLinearGradient(0, horizon, 0, horizon + 160);
      fade.addColorStop(0, "rgba(14,14,17,1)");
      fade.addColorStop(1, "rgba(14,14,17,0)");
      ctx.fillStyle = fade;
      ctx.fillRect(0, horizon, width, 160);

      // Pointeur : suivi amorti, halo, attraction douce des particules.
      pointer.x += (pointer.tx - pointer.x) * 0.08;
      pointer.y += (pointer.ty - pointer.y) * 0.08;
      if (pointer.active) {
        const g = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 260);
        g.addColorStop(0, "rgba(227,36,59,0.16)");
        g.addColorStop(0.5, "rgba(227,36,59,0.05)");
        g.addColorStop(1, "rgba(227,36,59,0)");
        ctx.fillStyle = g;
        ctx.fillRect(pointer.x - 260, pointer.y - 260, 520, 520);
      }

      // Particules : derive ascendante, rebouclage, liens de proximite pres du pointeur.
      const linkRadius = 120;
      for (const p of particles) {
        p.x += p.vx * dt * 0.06;
        p.y += p.vy * dt * 0.06;
        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 220 * 220 && d2 > 1) {
            const f = (1 - Math.sqrt(d2) / 220) * 0.004 * dt;
            p.x += dx * f;
            p.y += dy * f;
          }
        }
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        ctx.beginPath();
        ctx.fillStyle = `rgba(244,242,238,${p.a})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (pointer.active) {
        ctx.lineWidth = 0.8;
        for (let i = 0; i < particles.length; i += 1) {
          const a = particles[i]!;
          const da = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (da > 200) continue;
          for (let j = i + 1; j < particles.length; j += 1) {
            const b = particles[j]!;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < linkRadius) {
              ctx.strokeStyle = `rgba(255,92,109,${(1 - d / linkRadius) * 0.35 * (1 - da / 200)})`;
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
      }
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
