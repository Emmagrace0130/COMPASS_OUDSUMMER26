import { useEffect, useRef } from "react";

const R = 11;
const G = R * Math.sqrt(3); // center-to-center for adjacent hexagons

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
  const s = `rgba(140,90,255,${alpha})`;
  const a = `rgba(190,150,255,${(alpha * 1.3).toFixed(3)})`;
  ctx.strokeStyle = s;
  ctx.lineWidth = 0.9;

  if (kind === 0 || kind === 2) {
    // morphine / naloxone — 3-ring tricyclic
    hexPath(ctx, -G, 0, R); ctx.stroke();
    hexPath(ctx,  0, 0, R); ctx.stroke();
    hexPath(ctx,  G, 0, R); ctx.stroke();
    // lower bridge
    ctx.beginPath();
    ctx.moveTo(-G * 0.5, R * 0.87);
    ctx.lineTo(-G * 0.5, R * 0.87 + 8);
    ctx.lineTo( G * 0.5, R * 0.87 + 8);
    ctx.lineTo( G * 0.5, R * 0.87);
    ctx.stroke();
    // OH stub left
    ctx.beginPath();
    ctx.moveTo(-G - R * 0.87, -R * 0.5);
    ctx.lineTo(-G - R * 1.6,  -R * 0.9);
    ctx.stroke();
    // N label right
    ctx.fillStyle = a;
    ctx.font = `${R * 0.85}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("O", -G - R * 1.9, -R * 0.9);
    ctx.fillText("N",  G + R * 1.7,  0);
    if (kind === 2) {
      // allyl branch for naloxone
      ctx.strokeStyle = s;
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
    // fentanyl — left phenyl — chain — piperidine — chain — right phenyl
    hexPath(ctx, -G * 2.3, 0, R); ctx.stroke();
    hexPath(ctx,  0,       0, R); ctx.stroke();
    hexPath(ctx,  G * 2.3, -7, R); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-G * 1.8, 0); ctx.lineTo(-G * 0.9, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(G * 0.9, 0); ctx.lineTo(G * 1.8, -4);
    ctx.stroke();
    // C=O pendant
    ctx.beginPath();
    ctx.moveTo(G * 0.9, 4); ctx.lineTo(G * 0.9 + 7, 14);
    ctx.stroke();
    ctx.fillStyle = a;
    ctx.font = `${R * 0.85}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("O", G * 0.9 + 7, 22);
    ctx.fillText("N", 0, R + 9);
    ctx.fillText("N", G * 2.3 + R * 1.3, -7);
  } else {
    // oxycodone — 3 rings + epoxide arc
    hexPath(ctx, -G, 0, R); ctx.stroke();
    hexPath(ctx,  0, 0, R); ctx.stroke();
    hexPath(ctx,  G, 0, R); ctx.stroke();
    ctx.beginPath();
    ctx.arc(-G * 0.5, 0, R * 1.4, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.fillStyle = a;
    ctx.font = `${R * 0.85}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("O", -G * 0.5, -R * 1.6);
    // ketone stub
    ctx.strokeStyle = s;
    ctx.beginPath();
    ctx.moveTo(-G * 0.5, R * 0.87);
    ctx.lineTo(-G * 0.5, R * 0.87 + 10);
    ctx.stroke();
    ctx.fillText("O", -G * 0.5, R * 0.87 + 19);
    ctx.fillText("N",  G + R * 1.7, 0);
  }
}

type MolInst = {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotV: number;
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
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    (Math.random() - 0.5) * 0.18,
      rot:   Math.random() * Math.PI * 2,
      rotV:  (Math.random() - 0.5) * 0.003,
      kind:  KINDS[i % 4],
      alpha: 0.04 + Math.random() * 0.06,
      scale: 0.7 + Math.random() * 0.6,
    }));

    let raf: number;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of mols) {
        m.x   += m.vx;
        m.y   += m.vy;
        m.rot += m.rotV;
        // wrap at screen edges with padding
        const pad = 80;
        if (m.x < -pad)  m.x = canvas.width  + pad;
        if (m.x >  canvas.width  + pad) m.x = -pad;
        if (m.y < -pad)  m.y = canvas.height + pad;
        if (m.y >  canvas.height + pad) m.y = -pad;

        ctx.save();
        ctx.translate(m.x, m.y);
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
