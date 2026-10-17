import { useId } from "react";
import "./LndArt.css";

// =================================================================
// L&D 3D illustrations — pure SVG (no extra downloads, sharp on every
// screen, ~2 KB each). Soft gradients + highlights + floor shadow give
// the "glass / clay 3D" look of the reference designs. Each scene
// floats gently (disabled automatically for prefers-reduced-motion).
//
//   <LndArt kind="learning" />     cap + books + play button
//   <LndArt kind="shield" />       access control
//   <LndArt kind="certificate" />  certificate + medal
//   <LndArt kind="assessment" />   clipboard + target
//   <LndArt kind="module" />       play card
//   <LndArt kind="lock" />         locked module
// =================================================================

const Defs = ({ id }) => (
  <defs>
    <linearGradient id={`${id}-violet`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#9b87ff" />
      <stop offset="1" stopColor="#4f2fe6" />
    </linearGradient>
    <linearGradient id={`${id}-violet-dark`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#5b3df5" />
      <stop offset="1" stopColor="#2d1a9e" />
    </linearGradient>
    <linearGradient id={`${id}-paper`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffffff" />
      <stop offset="1" stopColor="#e9e4ff" />
    </linearGradient>
    <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ffe08a" />
      <stop offset="1" stopColor="#f2a516" />
    </linearGradient>
    <linearGradient id={`${id}-mint`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#7cf0c0" />
      <stop offset="1" stopColor="#12a874" />
    </linearGradient>
    <linearGradient id={`${id}-rose`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#ff9db0" />
      <stop offset="1" stopColor="#ee3d63" />
    </linearGradient>
    <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#8fc2ff" />
      <stop offset="1" stopColor="#3b6cf0" />
    </linearGradient>
    <radialGradient id={`${id}-floor`} cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stopColor="#5b3df5" stopOpacity=".28" />
      <stop offset="1" stopColor="#5b3df5" stopOpacity="0" />
    </radialGradient>
  </defs>
);

const Sparkle = ({ x, y, s = 1, fill = "#ffc94d", delay = 0 }) => (
  <path
    className="lnd-art__spark"
    style={{ animationDelay: `${delay}s` }}
    transform={`translate(${x} ${y}) scale(${s})`}
    d="M0 -10 C1.5 -3 3 -1.5 10 0 C3 1.5 1.5 3 0 10 C-1.5 3 -3 1.5 -10 0 C-3 -1.5 -1.5 -3 0 -10Z"
    fill={fill}
  />
);

const Floor = ({ id, cx = 120, cy = 196, rx = 92 }) => (
  <ellipse cx={cx} cy={cy} rx={rx} ry="14" fill={`url(#${id}-floor)`} />
);

const Books = ({ id, x = 0, y = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="40" y="150" width="128" height="26" rx="7" fill={`url(#${id}-blue)`} />
    <rect x="46" y="154" width="112" height="6" rx="3" fill="#fff" opacity=".55" />
    <rect x="52" y="124" width="116" height="26" rx="7" fill={`url(#${id}-violet)`} />
    <rect x="58" y="128" width="100" height="6" rx="3" fill="#fff" opacity=".5" />
    <rect x="46" y="100" width="112" height="24" rx="7" fill={`url(#${id}-rose)`} />
    <rect x="52" y="104" width="96" height="5" rx="2.5" fill="#fff" opacity=".5" />
  </g>
);

const Cap = ({ id, x = 0, y = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M70 92 L70 110 C70 122 140 122 140 110 L140 92Z" fill={`url(#${id}-violet-dark)`} />
    <path d="M105 56 L168 82 L105 108 L42 82Z" fill={`url(#${id}-violet)`} />
    <path d="M105 60 L156 81 L105 102 L54 81Z" fill="#fff" opacity=".18" />
    <path d="M150 88 L150 116" stroke={`url(#${id}-gold)`} strokeWidth="3" strokeLinecap="round" />
    <circle cx="150" cy="120" r="6" fill={`url(#${id}-gold)`} />
  </g>
);

const scenes = {
  learning: (id) => (
    <>
      <Floor id={id} />
      <g className="lnd-art__float">
        <Books id={id} />
        <Cap id={id} x={0} y={4} />
      </g>
      <g className="lnd-art__float lnd-art__float--late">
        <rect x="160" y="40" width="58" height="46" rx="12" fill={`url(#${id}-paper)`} stroke="#d9d0ff" />
        <circle cx="189" cy="63" r="14" fill={`url(#${id}-violet)`} />
        <path d="M185 56 L196 63 L185 70Z" fill="#fff" />
      </g>
      <Sparkle x={30} y={52} s={0.9} />
      <Sparkle x={214} y={124} s={0.7} fill="#9b87ff" delay={0.6} />
      <Sparkle x={150} y={26} s={0.6} delay={1.1} />
    </>
  ),
  shield: (id) => (
    <>
      <Floor id={id} />
      <g className="lnd-art__float">
        <rect x="64" y="38" width="128" height="122" rx="16" fill={`url(#${id}-paper)`} stroke="#ddd5ff" />
        <rect x="78" y="56" width="70" height="10" rx="5" fill="#d8cfff" />
        <rect x="78" y="78" width="100" height="16" rx="8" fill={`url(#${id}-violet)`} />
        <rect x="86" y="83" width="60" height="6" rx="3" fill="#fff" opacity=".8" />
        <rect x="78" y="104" width="84" height="10" rx="5" fill="#e6e0ff" />
        <rect x="78" y="124" width="64" height="10" rx="5" fill="#e6e0ff" />
      </g>
      <g className="lnd-art__float lnd-art__float--late">
        <path d="M60 70 L98 56 L136 70 L136 104 C136 132 116 150 98 158 C80 150 60 132 60 104Z" fill={`url(#${id}-violet-dark)`} transform="translate(-22 22)" />
        <path d="M60 70 L98 56 L136 70 L136 104 C136 132 116 150 98 158 C80 150 60 132 60 104Z" fill={`url(#${id}-violet)`} transform="translate(-26 16)" />
        <rect x="60" y="106" width="24" height="20" rx="4" fill="#fff" />
        <path d="M64 106 V99 a8 8 0 0 1 16 0 V106" stroke="#fff" strokeWidth="4" fill="none" />
        <circle cx="72" cy="115" r="3" fill="#5b3df5" />
      </g>
      <Sparkle x={206} y={46} s={0.8} />
      <Sparkle x={26} y={60} s={0.6} fill="#9b87ff" delay={0.8} />
    </>
  ),
  certificate: (id) => (
    <>
      <Floor id={id} />
      <g className="lnd-art__float">
        <rect x="46" y="40" width="148" height="116" rx="12" fill={`url(#${id}-paper)`} stroke="#dcd3ff" />
        <rect x="54" y="48" width="132" height="100" rx="8" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="2" />
        <rect x="76" y="66" width="88" height="9" rx="4.5" fill={`url(#${id}-violet)`} />
        <rect x="70" y="86" width="100" height="6" rx="3" fill="#d8cfff" />
        <rect x="80" y="100" width="80" height="6" rx="3" fill="#d8cfff" />
        <path d="M72 128 q8 -10 16 0 t16 0" stroke="#7a68d8" strokeWidth="2" fill="none" />
      </g>
      <g className="lnd-art__float lnd-art__float--late">
        <path d="M168 140 L160 176 L172 168 L180 180 L186 142Z" fill={`url(#${id}-violet)`} />
        <path d="M184 140 L192 176 L180 168 L172 180 L166 142Z" fill={`url(#${id}-violet-dark)`} />
        <circle cx="176" cy="132" r="20" fill={`url(#${id}-gold)`} />
        <circle cx="176" cy="132" r="13" fill="#ffd257" stroke="#fff3c4" strokeWidth="2" />
        <path d="M176 123 l3 6 6.5 1 -4.7 4.6 1.1 6.4 -5.9 -3.1 -5.9 3.1 1.1 -6.4 -4.7 -4.6 6.5 -1z" fill="#fff" />
      </g>
      <Sparkle x={36} y={36} s={0.8} />
      <Sparkle x={214} y={64} s={0.6} fill="#9b87ff" delay={0.5} />
    </>
  ),
  assessment: (id) => (
    <>
      <Floor id={id} />
      <g className="lnd-art__float">
        <rect x="74" y="34" width="112" height="140" rx="14" fill={`url(#${id}-violet)`} />
        <rect x="84" y="46" width="92" height="120" rx="10" fill={`url(#${id}-paper)`} />
        <rect x="106" y="26" width="48" height="18" rx="8" fill={`url(#${id}-violet-dark)`} />
        {[70, 100, 130].map((y) => (
          <g key={y}>
            <rect x="94" y={y - 8} width="16" height="16" rx="4" fill={`url(#${id}-mint)`} />
            <path d={`M97 ${y} l4 4 7 -8`} stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <rect x="118" y={y - 4} width="48" height="8" rx="4" fill="#d8cfff" />
          </g>
        ))}
      </g>
      <g className="lnd-art__float lnd-art__float--late">
        <circle cx="56" cy="140" r="30" fill={`url(#${id}-rose)`} />
        <circle cx="56" cy="140" r="20" fill="#fff" />
        <circle cx="56" cy="140" r="11" fill={`url(#${id}-rose)`} />
        <circle cx="56" cy="140" r="4" fill="#fff" />
      </g>
      <Sparkle x={206} y={50} s={0.9} />
      <Sparkle x={200} y={150} s={0.6} fill="#9b87ff" delay={0.7} />
    </>
  ),
  module: (id) => (
    <>
      <Floor id={id} />
      <g className="lnd-art__float">
        <rect x="44" y="50" width="152" height="104" rx="16" fill={`url(#${id}-violet)`} />
        <rect x="52" y="58" width="136" height="88" rx="11" fill="#fff" opacity=".16" />
        <circle cx="120" cy="102" r="26" fill="#fff" />
        <path d="M112 88 L136 102 L112 116Z" fill="#5b3df5" />
        <rect x="60" y="134" width="120" height="5" rx="2.5" fill="#fff" opacity=".45" />
        <rect x="60" y="134" width="52" height="5" rx="2.5" fill="#fff" />
      </g>
      <Sparkle x={210} y={48} s={0.8} />
      <Sparkle x={30} y={140} s={0.6} fill="#9b87ff" delay={0.5} />
    </>
  ),
  lock: (id) => (
    <>
      <Floor id={id} rx={60} />
      <g className="lnd-art__float">
        <path d="M92 92 V74 a28 28 0 0 1 56 0 V92" stroke={`url(#${id}-violet-dark)`} strokeWidth="12" fill="none" />
        <rect x="78" y="88" width="84" height="76" rx="16" fill={`url(#${id}-violet)`} />
        <circle cx="120" cy="120" r="9" fill="#fff" />
        <rect x="116" y="124" width="8" height="18" rx="4" fill="#fff" />
      </g>
    </>
  ),
};

export default function LndArt({ kind = "learning", className = "", label }) {
  // Unique, stable gradient ids per instance (several arts can share a
  // page). useId() output contains ":" / "«»", which break url(#…).
  const id = `lart${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const scene = scenes[kind] || scenes.learning;
  return (
    <svg
      className={`lnd-art lnd-art--${kind} ${className}`}
      viewBox="0 0 240 210"
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Defs id={id} />
      {scene(id)}
    </svg>
  );
}
