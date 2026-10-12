/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Bitty Box - Cosmic Atmosphere & Neural Visual Effects Engine
 * Renders interactive starfields, dual-hemisphere nebula, neural synapse canvas,
 * 3D horizon grid, bokeh embers, and stardust cursor aura matching the reference style.
 */

import React, { useEffect, useRef } from 'react';

// Brand chromatic palette matching reference document
const CHROMA_PALETTE = [
  { r: 255, g: 209, b: 89, hex: '#ffd159' },  // Gold
  { r: 0,   g: 229, b: 255, hex: '#00e5ff' },  // Cyan
  { r: 236, g: 72,  b: 153, hex: '#ec4899' },  // Magenta
  { r: 168, g: 85,  b: 247, hex: '#a855f7' },  // Purple
  { r: 16,  g: 185, b: 129, hex: '#10b981' },  // Lime
  { r: 249, g: 115, b: 22,  hex: '#f97316' },  // Orange
];

export function spawnStardustBurst(x: number, y: number, count: number = 18) {
  for (let i = 0; i < count; i++) {
    const spark = document.createElement('div');
    spark.className = 'stardust-spark';
    const size = Math.random() * 4 + 2;
    const col = CHROMA_PALETTE[Math.floor(Math.random() * CHROMA_PALETTE.length)];
    spark.style.width = `${size}px`;
    spark.style.height = `${size}px`;
    spark.style.backgroundColor = col.hex;
    spark.style.boxShadow = `0 0 12px ${col.hex}`;
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;

    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 65 + 20;
    spark.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);

    document.body.appendChild(spark);
    setTimeout(() => spark.remove(), 750);
  }
}

// Web Audio API harmonic synth
let audioCtx: AudioContext | null = null;
let sfxEnabled = true;

export function setSfxEnabled(val: boolean) {
  sfxEnabled = val;
}

export function isSfxEnabled(): boolean {
  return sfxEnabled;
}

export function playHarmonicChime(freq: number = 520, duration: number = 0.15) {
  if (!sfxEnabled || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx && AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio context not allowed until user gesture
  }
}

export const CosmicAtmosphere: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorGlowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 1. Generate dynamic multi-box-shadow stars
    const s1 = document.getElementById('stars');
    const s2 = document.getElementById('stars2');
    const s3 = document.getElementById('stars3');

    function generateBoxShadow(count: number, colors: string[]) {
      const shadows: string[] = [];
      for (let i = 0; i < count; i++) {
        const x = Math.floor(Math.random() * 2000);
        const y = Math.floor(Math.random() * 2000);
        const col = colors[Math.floor(Math.random() * colors.length)];
        shadows.push(`${x}px ${y}px ${col}`);
      }
      return shadows.join(', ');
    }

    if (s1 && s2 && s3) {
      const smallStars = generateBoxShadow(500, ['#ffffff', '#fff9c4', '#ffd54f']);
      const medStars = generateBoxShadow(150, ['#ffffff', '#ffd159', '#00e5ff', '#ec4899', '#10b981']);
      const bigStars = generateBoxShadow(60, ['#ffd159', '#f5b82e', '#9333ea', '#ec4899', '#00e5ff', '#10b981']);

      s1.style.boxShadow = smallStars;
      s2.style.boxShadow = medStars;
      s3.style.boxShadow = bigStars;
    }

    // 2. Cursor follower & particle sparks
    let cursorTarget = { x: -300, y: -300 };
    let cursorCurrent = { x: -300, y: -300 };
    let lastSpark = 0;

    const handleMouseMove = (e: MouseEvent) => {
      cursorTarget.x = e.clientX;
      cursorTarget.y = e.clientY;

      const now = performance.now();
      if (now - lastSpark > 90) {
        lastSpark = now;
        if (Math.random() < 0.35) {
          spawnStardustBurst(e.clientX, e.clientY, 1);
        }
      }
    };

    const handleClick = (e: MouseEvent) => {
      spawnStardustBurst(e.clientX, e.clientY, 14);
      playHarmonicChime(740, 0.12);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    let animId: number;
    const updateCursorGlow = () => {
      cursorCurrent.x += (cursorTarget.x - cursorCurrent.x) * 0.14;
      cursorCurrent.y += (cursorTarget.y - cursorCurrent.y) * 0.14;
      if (cursorGlowRef.current) {
        cursorGlowRef.current.style.transform = `translate3d(${cursorCurrent.x}px, ${cursorCurrent.y}px, 0)`;
      }
      animId = requestAnimationFrame(updateCursorGlow);
    };
    animId = requestAnimationFrame(updateCursorGlow);

    // 3. Neural Synapse Canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let width = (canvas.width = window.innerWidth);
        let height = (canvas.height = window.innerHeight);

        const handleResize = () => {
          if (!canvas) return;
          width = canvas.width = window.innerWidth;
          height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        const nodeCount = Math.min(65, Math.floor((width * height) / 22000));
        const nodes: any[] = [];
        for (let i = 0; i < nodeCount; i++) {
          nodes.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.65,
            vy: (Math.random() - 0.5) * 0.65,
            radius: Math.random() * 2 + 1.2,
            color: CHROMA_PALETTE[Math.floor(Math.random() * CHROMA_PALETTE.length)],
            phase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.02 + Math.random() * 0.03,
          });
        }

        const actionPotentials: any[] = [];

        let canvasAnimId: number;
        const render = () => {
          ctx.clearRect(0, 0, width, height);

          const connectDist = 130;
          const mouseConnectDist = 160;

          for (let i = 0; i < nodes.length; i++) {
            const p = nodes[i];
            p.x += p.vx;
            p.y += p.vy;
            p.phase += p.pulseSpeed;

            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            else if (p.x > width) { p.x = width; p.vx *= -1; }
            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            else if (p.y > height) { p.y = height; p.vy *= -1; }

            // Mouse interaction
            const mdx = cursorTarget.x - p.x;
            const mdy = cursorTarget.y - p.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < mouseConnectDist && mDist > 0) {
              p.x += (mdx / mDist) * 0.35;
              p.y += (mdy / mDist) * 0.35;

              const alpha = (1 - mDist / mouseConnectDist) * 0.7;
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(cursorTarget.x, cursorTarget.y);
              ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
              ctx.lineWidth = 1;
              ctx.shadowColor = p.color.hex;
              ctx.shadowBlur = 8;
              ctx.stroke();
              ctx.restore();
            }

            // Node connections
            for (let j = i + 1; j < nodes.length; j++) {
              const p2 = nodes[j];
              const dx = p2.x - p.x;
              const dy = p2.y - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < connectDist) {
                const alpha = (1 - dist / connectDist) * 0.3;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
                ctx.lineWidth = 0.7;
                ctx.stroke();

                if (Math.random() < 0.003 && actionPotentials.length < 12) {
                  actionPotentials.push({
                    from: p,
                    to: p2,
                    progress: 0,
                    speed: 0.03 + Math.random() * 0.02,
                    color: p.color,
                  });
                }
              }
            }

            // Draw node
            const pulse = 1 + Math.sin(p.phase) * 0.25;
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
            ctx.fillStyle = p.color.hex;
            ctx.shadowColor = p.color.hex;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.restore();
          }

          // Render action potentials
          for (let a = actionPotentials.length - 1; a >= 0; a--) {
            const ap = actionPotentials[a];
            ap.progress += ap.speed;
            if (ap.progress >= 1) {
              actionPotentials.splice(a, 1);
              continue;
            }
            const curX = ap.from.x + (ap.to.x - ap.from.x) * ap.progress;
            const curY = ap.from.y + (ap.to.y - ap.from.y) * ap.progress;

            ctx.save();
            ctx.beginPath();
            ctx.arc(curX, curY, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = ap.color.hex;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();
          }

          canvasAnimId = requestAnimationFrame(render);
        };
        canvasAnimId = requestAnimationFrame(render);

        return () => {
          cancelAnimationFrame(animId);
          cancelAnimationFrame(canvasAnimId);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('click', handleClick);
          window.removeEventListener('resize', handleResize);
        };
      }
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <>
      {/* Interactive Stardust Cursor Aura */}
      <div
        ref={cursorGlowRef}
        id="cursorGlow"
        className="pointer-events-none fixed -top-40 -left-40 w-80 h-80 rounded-full opacity-60 mix-blend-screen transition-transform duration-75 ease-out z-40 hidden sm:block"
        style={{
          background:
            'radial-gradient(circle, rgba(245, 184, 46, 0.28) 0%, rgba(236, 72, 153, 0.18) 35%, rgba(0, 229, 255, 0.1) 65%, transparent 80%)',
          filter: 'blur(30px)',
        }}
      />

      {/* Atmospheric Starfields & Grids */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1]" />
        <div id="stars" />
        <div id="stars2" />
        <div id="stars3" />
        <div className="nebula-glow" />
        <div className="perspective-grid" />
        <div className="horizon-light-beam" />

        {/* Floating Bokeh Embers */}
        <div className="bokeh-dot w-3 h-3 bg-[#ffd159]" style={{ left: '10%', top: '35%', boxShadow: '0 0 14px #ffd159' }} />
        <div className="bokeh-dot w-2.5 h-2.5 bg-[#00e5ff]" style={{ left: '30%', top: '65%', animationDelay: '2s', boxShadow: '0 0 12px #00e5ff' }} />
        <div className="bokeh-dot w-3.5 h-3.5 bg-[#ec4899]" style={{ left: '80%', top: '25%', animationDelay: '1.5s', boxShadow: '0 0 16px #ec4899' }} />
        <div className="bokeh-dot w-2.5 h-2.5 bg-[#9333ea]" style={{ left: '88%', top: '60%', animationDelay: '3s', boxShadow: '0 0 14px #9333ea' }} />
        <div className="bokeh-dot w-2 h-2 bg-[#10b981]" style={{ left: '65%', top: '75%', animationDelay: '4.5s', boxShadow: '0 0 10px #10b981' }} />
        <div className="bokeh-dot w-3 h-3 bg-[#f97316]" style={{ left: '55%', top: '38%', animationDelay: '2.2s', boxShadow: '0 0 15px #f97316' }} />
      </div>
    </>
  );
};
