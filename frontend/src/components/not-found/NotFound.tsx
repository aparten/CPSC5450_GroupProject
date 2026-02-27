import { useState, useEffect, useRef } from "react";

// ── Matrix rain ───────────────────────────────────────────────────────────────
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const FONT_SIZE = 15;
    const CHARS = "ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ01";
    let cols = Math.floor(canvas.width / FONT_SIZE);
    let drops: number[] = Array(cols).fill(0).map(() => Math.floor(Math.random() * -50));

    const draw = () => {
      cols = Math.floor(canvas.width / FONT_SIZE);
      if (drops.length !== cols) drops = Array(cols).fill(0).map(() => Math.floor(Math.random() * -50));

      ctx.fillStyle = "rgba(0,0,0,0.055)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${FONT_SIZE}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_SIZE;
        if (y < 0) { drops[i]++; continue; }
        // Leading — white
        ctx.fillStyle = "#ffffff";
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FONT_SIZE, y);
        // Second — bright green
        if (drops[i] > 1) {
          ctx.fillStyle = "#00ff41";
          ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FONT_SIZE, y - FONT_SIZE);
        }
        // Trailing — dimming
        const trail = ["#00cc33", "#009926", "#006618", "#003309"];
        for (let t = 0; t < trail.length; t++) {
          if (drops[i] > t + 2) {
            ctx.fillStyle = trail[t];
            ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * FONT_SIZE, y - FONT_SIZE * (t + 2));
          }
        }
        if (y > canvas.height && Math.random() > 0.97) drops[i] = 0;
        drops[i]++;
      }
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0" style={{ zIndex: 0 }} />;
}

// ── Glitch 404 ────────────────────────────────────────────────────────────────
function Glitch404() {
  const style: React.CSSProperties = {
    fontFamily: "'Courier New', monospace",
    fontSize: "clamp(7rem, 22vw, 12rem)",
    fontWeight: 900,
    lineHeight: 1,
  };
  return (
    <div className="relative select-none" style={{ lineHeight: 1 }}>
      <span aria-hidden className="absolute inset-0" style={{ ...style, color: "#ff2244", animation: "g1 3s steps(1) infinite" }}>404</span>
      <span aria-hidden className="absolute inset-0" style={{ ...style, color: "#00ffcc", animation: "g2 2.5s steps(1) infinite", animationDelay: "0.35s" }}>404</span>
      <span style={{ ...style, color: "#ffffff", textShadow: "0 0 40px rgba(0,255,65,0.45)" }}>404</span>
    </div>
  );
}

// ── Typing hook ───────────────────────────────────────────────────────────────
function useTyped(text: string, speed = 38, startDelay = 0): string {
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setStarted(true), startDelay); return () => clearTimeout(t); }, [startDelay]);
  useEffect(() => {
    if (!started || idx >= text.length) return;
    const t = setTimeout(() => setIdx(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [idx, text, speed, started]);
  return text.slice(0, idx);
}

// ── Blinking cursor ───────────────────────────────────────────────────────────
function Cursor() {
  const [on, setOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setOn(v => !v), 530); return () => clearInterval(t); }, []);
  return (
    <span style={{ display: "inline-block", width: "0.55em", height: "1.1em", background: "#00ff41", verticalAlign: "text-bottom", opacity: on ? 1 : 0 }} />
  );
}

// ── Log lines ─────────────────────────────────────────────────────────────────
type LogType = "ok" | "err" | "warn";
const LOGS: { tag: string; msg: string; type: LogType }[] = [
  { tag: "ROUTE", msg: "Lookup initiated for requested path...", type: "ok"   },
  { tag: "DNS",   msg: "Forward resolution — no record found",   type: "err"  },
  { tag: "KERN",  msg: "Fallback handler invoked",               type: "warn" },
  { tag: "NET",   msg: "Packet dropped. Destination unreachable.", type: "err" },
  { tag: "SYS",   msg: "Error 0x404 written to audit log.",      type: "ok"   },
];

function LogLines() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= LOGS.length) return;
    const t = setTimeout(() => setCount(c => c + 1), 560);
    return () => clearTimeout(t);
  }, [count]);

  const tagCol  = (t: LogType) => t === "err" ? "#ff6666" : t === "warn" ? "#fbbf24" : "#00ff41";
  const tagBg   = (t: LogType) => t === "err" ? "rgba(255,50,50,0.15)" : t === "warn" ? "rgba(251,191,36,0.12)" : "rgba(0,255,65,0.1)";
  const msgCol  = (t: LogType) => t === "err" ? "#ffaaaa" : t === "warn" ? "#fde68a" : "#b9f5cc";

  return (
    <div className="space-y-2.5">
      {LOGS.slice(0, count).map((l, i) => (
        <div key={i} className="flex items-start gap-3" style={{ fontFamily: "'Courier New', monospace", fontSize: "0.8rem" }}>
          <span
            className="shrink-0 inline-block w-14 text-center py-0.5 rounded-sm"
            style={{ background: tagBg(l.type), border: `1px solid ${tagCol(l.type)}`, color: tagCol(l.type), fontSize: "0.62rem", letterSpacing: "0.1em" }}
          >
            {l.tag}
          </span>
          <span style={{ color: msgCol(l.type), lineHeight: 1.6 }}>{l.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function NotFound() {
  const subtitle = useTyped("NODE UNREACHABLE · ACCESS DENIED · PATH NOT FOUND", 44, 300);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-hidden px-4 py-16">
      <style>{`
        @keyframes g1 {
          0%,100%{ clip-path:inset(0 0 88% 0);   transform:translate(-5px, 2px); }
          25%    { clip-path:inset(35% 0 45% 0);  transform:translate(5px,-2px);  }
          50%    { clip-path:inset(72% 0 8% 0);   transform:translate(-3px,1px);  }
          75%    { clip-path:inset(15% 0 75% 0);  transform:translate(4px, 0);    }
        }
        @keyframes g2 {
          0%,100%{ clip-path:inset(62% 0 18% 0);  transform:translate(4px,-1px);  }
          33%    { clip-path:inset(8% 0 82% 0);   transform:translate(-5px,2px);  }
          66%    { clip-path:inset(42% 0 38% 0);  transform:translate(3px,-2px);  }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        @keyframes sweepLine {
          from { transform:translateY(-80px); }
          to   { transform:translateY(110vh); }
        }
        @keyframes redpulse {
          0%,100%{ box-shadow:0 0 6px #ff4444; }
          50%    { box-shadow:0 0 14px #ff4444, 0 0 28px #ff444466; }
        }
        .fu0{ animation:fadeUp .55s .00s both; }
        .fu1{ animation:fadeUp .55s .18s both; }
        .fu2{ animation:fadeUp .55s .34s both; }
        .fu3{ animation:fadeUp .55s .50s both; }
        .fu4{ animation:fadeUp .55s .68s both; }
        .sweep-anim::after{
          content:''; position:fixed; inset-x:0; top:0; height:80px;
          background:linear-gradient(transparent,rgba(0,255,65,0.04),transparent);
          animation:sweepLine 8s linear infinite;
          pointer-events:none; z-index:4;
        }
        .card{
          border:1px solid rgba(0,255,65,0.4);
          box-shadow:0 0 0 1px rgba(0,255,65,0.07), 0 0 60px rgba(0,255,65,0.06), inset 0 0 40px rgba(0,0,0,0.5);
        }
        .term{
          border:1px solid rgba(0,255,65,0.25);
        }
        .btn-solid{
          background:#00ff41; color:#000000; font-weight:800;
          transition:background .15s, box-shadow .15s;
        }
        .btn-solid:hover{ background:#39ff6e; box-shadow:0 0 24px rgba(0,255,65,0.55); }
        .btn-outline{
          background:transparent;
          border:1px solid rgba(0,255,65,0.45);
          color:#00ff41;
          transition:background .15s, border-color .15s;
        }
        .btn-outline:hover{ background:rgba(0,255,65,0.1); border-color:#00ff41; }
      `}</style>

      {/* Layers */}
      <MatrixRain />
      <div className="sweep-anim fixed inset-0 pointer-events-none" style={{ zIndex: 2 }} />
      {/* Radial dark vignette — ensures card area stays readable over rain */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 3,
          background: "radial-gradient(ellipse 65% 65% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* ── Card ── */}
      <div
        className="card fu0 relative w-full max-w-lg rounded-sm flex flex-col items-center gap-6 px-8 py-10"
        style={{ background: "rgba(0,5,0,0.93)", zIndex: 10 }}
      >

        {/* Red alert badge */}
        <div
          className="fu0 flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,80,80,0.55)" }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: "#ff4444", animation: "redpulse 1.8s ease-in-out infinite" }} />
          <span style={{ color: "#ff9999", fontFamily: "'Courier New', monospace", fontSize: "0.68rem", letterSpacing: "0.22em" }}>
            SYSTEM FAILURE
          </span>
        </div>

        {/* 404 */}
        <div className="fu1">
          <Glitch404 />
        </div>

        {/* Typed subtitle — bright green, fully readable */}
        <p
          className="fu2 text-center text-xs"
          style={{ fontFamily: "'Courier New', monospace", color: "#00ff41", letterSpacing: "0.18em", minHeight: "1.2em" }}
        >
          {subtitle}<Cursor />
        </p>

        {/* Divider */}
        <div className="fu2 w-full" style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(0,255,65,0.45), transparent)" }} />

        {/* Terminal */}
        <div className="fu3 term w-full rounded-sm overflow-hidden" style={{ background: "rgba(0,0,0,0.75)" }}>
          {/* Chrome bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: "rgba(0,255,65,0.05)", borderBottom: "1px solid rgba(0,255,65,0.18)" }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5555" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fbbf24" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#00ff41" }} />
            <span
              className="ml-auto"
              style={{ fontFamily: "'Courier New', monospace", fontSize: "0.63rem", color: "rgba(0,255,65,0.5)", letterSpacing: "0.1em" }}
            >
              /var/log/router — bash
            </span>
          </div>
          {/* Logs */}
          <div className="px-5 py-4 space-y-1">
            <LogLines />
            <div className="pt-2 flex items-center gap-2" style={{ fontFamily: "'Courier New', monospace", fontSize: "0.8rem" }}>
              <span style={{ color: "#00ff41" }}>root@matrix:~$</span>
              <Cursor />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="fu4 flex gap-3 w-full">
          <a
            href="/"
            className="btn-solid flex-1 text-center py-3 text-sm rounded-sm"
            style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", textDecoration: "none" }}
          >
            ↩ RETURN HOME
          </a>
          <button
            onClick={() => window.history.back()}
            className="btn-outline flex-1 py-3 text-sm rounded-sm"
            style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.1em", cursor: "pointer" }}
          >
            ← GO BACK
          </button>
        </div>

        {/* Footer code */}
        <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.68rem", color: "rgba(0,255,65,0.38)", letterSpacing: "0.14em" }}>
          ERR · 0x00000404 · NODE_NOT_FOUND
        </p>
      </div>
    </div>
  );
}
