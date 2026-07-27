import { useEffect, useRef } from "react";

const R = 11;
const G = R * Math.sqrt(3);

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const x = cx + r * Math.sin((i * Math.PI) / 3);
    const y = cy - r * Math.cos((i * Math.PI) / 3);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
}

type MolKind = 0 | 1 | 2 | 3;

function drawMol(ctx: CanvasRenderingContext2D, kind: MolKind, alpha: number) {
  const s = `rgba(251,146,60,${alpha})`;
  ctx.strokeStyle = s;
  ctx.lineWidth = 1.1;
  ctx.shadowColor = `rgba(251,146,60,${alpha * 2.5})`;
  ctx.shadowBlur = 6;

  if (kind === 0 || kind === 2) {
    // morphine / naloxone — 3-ring tricyclic
    hexPath(ctx, -G, 0, R); ctx.stroke();
    hexPath(ctx,  0, 0, R); ctx.stroke();
    hexPath(ctx,  G, 0, R); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-G * 0.5, R * 0.87);
    ctx.lineTo(-G * 0.5, R * 0.87 + 8);
    ctx.lineTo( G * 0.5, R * 0.87 + 8);
    ctx.lineTo( G * 0.5, R * 0.87);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-G - R * 0.87, -R * 0.5);
    ctx.lineTo(-G - R * 1.6,  -R * 0.9);
    ctx.stroke();
    if (kind === 2) {
      ctx.beginPath();
      ctx.moveTo(G + R * 1.2,  -R * 0.5);
      ctx.lineTo(G + R * 1.8,  -R * 1.4);
      ctx.lineTo(G + R * 2.6,  -R * 1.0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(G + R * 1.8, -R * 1.4);
      ctx.lineTo(G + R * 1.8, -R * 2.4);
      ctx.stroke();
    }
  } else if (kind === 1) {
    // fentanyl
    hexPath(ctx, -G * 2.3, 0, R); ctx.stroke();
    hexPath(ctx,  0,       0, R); ctx.stroke();
    hexPath(ctx,  G * 2.3, -7, R); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-G * 1.8, 0); ctx.lineTo(-G * 0.9, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(G * 0.9, 0); ctx.lineTo(G * 1.8, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(G * 0.9, 4); ctx.lineTo(G * 0.9 + 7, 14);
    ctx.stroke();
  } else {
    // oxycodone
    hexPath(ctx, -G, 0, R); ctx.stroke();
    hexPath(ctx,  0, 0, R); ctx.stroke();
    hexPath(ctx,  G, 0, R); ctx.stroke();
    ctx.beginPath();
    ctx.arc(-G * 0.5, 0, R * 1.4, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-G * 0.5, R * 0.87);
    ctx.lineTo(-G * 0.5, R * 0.87 + 10);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
}

type MolInst = {
  x: number; baseY: number;
  vx: number;
  phase: number; bobAmp: number; bobSpeed: number;
  rot: number;
  kind: MolKind;
  alpha: number;
  scale: number;
};

const KINDS: MolKind[] = [0, 1, 2, 3];

export function MoleculeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = 14;
    const mols: MolInst[] = Array.from({ length: COUNT }, (_, i) => ({
      x:        Math.random() * canvas.width,
      baseY:    Math.random() * canvas.height,
      vx:       (Math.random() < 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.15),
      phase:    Math.random() * Math.PI * 2,
      bobAmp:   16 + Math.random() * 20,
      bobSpeed: 0.0003 + Math.random() * 0.0003,
      rot:      Math.random() * Math.PI * 2,
      kind:     KINDS[i % 4],
      alpha:    0.05 + Math.random() * 0.07,
      scale:    0.7 + Math.random() * 0.6,
    }));

    let raf: number;
    let t = 0;
    const tick = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of mols) {
        m.x += m.vx;
        const pad = 80;
        if (m.x < -pad)               m.x = canvas.width + pad;
        if (m.x > canvas.width + pad) m.x = -pad;

        const y = m.baseY + Math.sin(t * m.bobSpeed + m.phase) * m.bobAmp;

        ctx.save();
        ctx.translate(m.x, y);
        ctx.rotate(m.rot);
        ctx.scale(m.scale, m.scale);
        drawMol(ctx, m.kind, m.alpha);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}
