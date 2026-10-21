import React from "react";

export const CampusIllustrationBanner: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden pointer-events-none select-none flex justify-center items-end ${className}`}
    >
      <svg
        viewBox="0 0 1440 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-7xl h-auto opacity-95 transition-opacity duration-300"
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Subtle ground line */}
        <line x1="40" y1="214" x2="1400" y2="214" stroke="#e2e8f0" strokeWidth="2" strokeDasharray="6 6" />

        {/* ========================================================
            LEFT SCENE: Park bench, trees, laptop, grandmother & student
            (Reference Image 3)
           ======================================================== */}
        <g id="left-scene" transform="translate(60, 0)">
          {/* Background Trees */}
          <circle cx="120" cy="120" r="48" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" fill="#f8fafc" />
          <path d="M120 168 V214" stroke="#94a3b8" strokeWidth="2" />
          <path d="M100 185 L120 175 L135 188" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

          <circle cx="60" cy="140" r="36" stroke="#cbd5e1" strokeWidth="1.5" fill="#f1f5f9" />
          <path d="M60 176 V214" stroke="#94a3b8" strokeWidth="2" />

          {/* Park Bench */}
          <path
            d="M170 195 H290 M180 180 H280 M190 180 V214 M270 180 V214 M180 160 H280 M180 160 V195 M280 160 V195"
            stroke="#cbd5e1"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Student in Yellow Top with Laptop */}
          {/* Hair & Head */}
          <ellipse cx="218" cy="138" rx="8" ry="10" fill="#3b2d20" />
          <circle cx="219" cy="142" r="7" fill="#fbcfe8" />
          {/* Yellow Sweater */}
          <path
            d="M208 152 C208 148, 228 148, 230 152 L234 180 H204 Z"
            fill="#facc15"
          />
          {/* Arms holding laptop */}
          <path d="M214 162 L228 174 H246" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
          {/* White Pants */}
          <path d="M206 180 H232 L234 206 H222 L220 188 L212 206 H202 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          {/* Red Shoes */}
          <ellipse cx="206" cy="209" rx="5" ry="3" fill="#e03a3e" />
          <ellipse cx="228" cy="209" rx="5" ry="3" fill="#e03a3e" />
          {/* Laptop */}
          <path d="M228 174 L244 174 L250 160 L234 160 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="226" y1="174" x2="252" y2="174" stroke="#64748b" strokeWidth="2" />

          {/* Senior / Mentor in Blue Dress with Cane */}
          {/* Gray Hair & Head */}
          <ellipse cx="265" cy="134" rx="9" ry="10" fill="#cbd5e1" />
          <circle cx="263" cy="140" r="7" fill="#fed7aa" />
          {/* Blue Dress */}
          <path
            d="M250 152 C252 148, 276 148, 278 152 L284 195 H244 Z"
            fill="#60a5fa"
          />
          {/* Lower dress & feet */}
          <path d="M244 195 H284 L282 208 H246 Z" fill="#3b82f6" />
          <ellipse cx="254" cy="210" rx="5" ry="2.5" fill="#fcd34d" />
          <ellipse cx="272" cy="210" rx="5" ry="2.5" fill="#fcd34d" />
          {/* Cane */}
          <path d="M294 166 C294 158, 286 158, 286 166 V214" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" />

          {/* Streetlamp */}
          <path d="M340 90 C340 70, 370 70, 370 90" stroke="#cbd5e1" strokeWidth="2" fill="none" />
          <path d="M355 85 L355 75 C355 70, 350 70, 350 65" stroke="#cbd5e1" strokeWidth="2" fill="none" />
          <path d="M342 90 H368 L360 100 H350 Z" stroke="#cbd5e1" strokeWidth="1.5" fill="#fef9c3" />
          <line x1="355" y1="75" x2="355" y2="214" stroke="#94a3b8" strokeWidth="2" />

          {/* Woman in Green climbing Ladder */}
          {/* Ladder */}
          <line x1="420" y1="214" x2="520" y2="35" stroke="#94a3b8" strokeWidth="3" />
          <line x1="440" y1="214" x2="540" y2="35" stroke="#94a3b8" strokeWidth="3" />
          {[0.2, 0.35, 0.5, 0.65, 0.8].map((ratio, i) => (
            <line
              key={i}
              x1={420 + (520 - 420) * ratio}
              y1={214 + (35 - 214) * ratio}
              x2={440 + (540 - 440) * ratio}
              y2={214 + (35 - 214) * ratio}
              stroke="#94a3b8"
              strokeWidth="2.5"
            />
          ))}

          {/* Climber (Green pants, mint top) */}
          <circle cx="458" cy="118" r="8" fill="#522e1b" />
          <path d="M450 128 L466 128 L460 152 L446 152 Z" fill="#86efac" />
          <path d="M452 128 L475 118" stroke="#86efac" strokeWidth="4" strokeLinecap="round" />
          <path d="M448 140 L430 135" stroke="#86efac" strokeWidth="4" strokeLinecap="round" />
          {/* Green active pants */}
          <path d="M446 152 L430 185 L440 188 L454 165 L462 178 L470 174 L460 152 Z" fill="#16a34a" />
          <ellipse cx="430" cy="187" rx="5" ry="3" fill="#dc2626" />
          <ellipse cx="472" cy="174" rx="5" ry="3" fill="#dc2626" />

          {/* Person holding ladder (Red/Orange top, white pants) */}
          <circle cx="538" cy="115" r="8" fill="#33241b" />
          <path d="M528 126 C532 122, 548 122, 552 126 L556 165 H524 Z" fill="#ea580c" />
          {/* Upstretched arms holding the ladder */}
          <path d="M532 128 L516 90" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" />
          <path d="M546 128 L532 90" stroke="#ea580c" strokeWidth="4" strokeLinecap="round" />
          {/* White pants in wide support stance */}
          <path d="M525 165 L508 210 H520 L538 178 L556 210 H568 L555 165 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          {/* Blue shoes */}
          <ellipse cx="510" cy="212" rx="6" ry="3" fill="#2563eb" />
          <ellipse cx="566" cy="212" rx="6" ry="3" fill="#2563eb" />
        </g>

        {/* ========================================================
            RIGHT SCENE: Steps, collaboration, wheelchair student
            (Reference Image 4)
           ======================================================== */}
        <g id="right-scene" transform="translate(740, 0)">
          {/* Campus Decorative Trees */}
          <circle cx="210" cy="130" r="44" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" fill="#f8fafc" />
          <path d="M210 174 V214" stroke="#94a3b8" strokeWidth="2" />
          <path d="M195 190 L210 182 L225 192" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />

          <circle cx="340" cy="145" r="32" stroke="#cbd5e1" strokeWidth="1.5" fill="#f1f5f9" />
          <path d="M340 177 V214" stroke="#94a3b8" strokeWidth="2" />

          {/* Stepped platform / stairs */}
          <path
            d="M30 214 V195 H70 V175 H110 V155 H150 V135 H190 V214"
            stroke="#cbd5e1"
            strokeWidth="2"
            fill="#ffffff"
          />

          {/* Student seated thinking on step */}
          <circle cx="15" cy="172" r="7" fill="#78350f" />
          <path d="M10 182 H22 L18 206 H6 Z" fill="#16a34a" />
          {/* Arm resting on chin */}
          <path d="M12 186 L4 176 L12 174" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" />
          {/* Yellow pants stretched out */}
          <path d="M8 206 H18 L-10 214 H-22 Z" fill="#facc15" />

          {/* Student on top of steps reaching down to help */}
          <circle cx="95" cy="85" r="8" fill="#582f1b" />
          {/* Red sweater */}
          <path d="M85 96 C88 92, 106 92, 110 96 L112 130 H82 Z" fill="#dc2626" />
          {/* Left leg on step, right leg back */}
          <path d="M84 130 H108 L104 155 H92 L90 142 L78 155 H68 Z" fill="#2563eb" />
          <ellipse cx="98" cy="157" rx="5" ry="3" fill="#dc2626" />
          <ellipse cx="72" cy="157" rx="5" ry="3" fill="#dc2626" />
          {/* Left arm stretching forward, Right arm reaching back holding friend */}
          <path d="M88 102 L60 85" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />
          <path d="M108 102 L142 124" stroke="#dc2626" strokeWidth="4" strokeLinecap="round" />

          {/* Student climbing up, holding hand, yellow skirt */}
          <circle cx="154" cy="115" r="7.5" fill="#312e81" />
          {/* White top */}
          <path d="M144 125 C146 122, 162 122, 166 125 L164 150 H142 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
          {/* Arm reaching up to clasp hand */}
          <path d="M145 128 L142 124" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
          {/* Yellow swirling skirt */}
          <path d="M142 150 H164 L180 178 H140 Z" fill="#facc15" />
          {/* Legs stepping up */}
          <path d="M148 178 L152 205" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M165 178 L185 195" stroke="#fed7aa" strokeWidth="3.5" strokeLinecap="round" />
          <ellipse cx="152" cy="207" rx="4" ry="2" fill="#e03a3e" />
          <ellipse cx="187" cy="196" rx="4" ry="2" fill="#e03a3e" />

          {/* Streetlamp */}
          <path d="M375 90 C375 70, 405 70, 405 90" stroke="#cbd5e1" strokeWidth="2" fill="none" />
          <path d="M390 85 L390 75 C390 70, 385 70, 385 65" stroke="#cbd5e1" strokeWidth="2" fill="none" />
          <path d="M377 90 H403 L395 100 H385 Z" stroke="#cbd5e1" strokeWidth="1.5" fill="#fef9c3" />
          <line x1="390" y1="75" x2="390" y2="214" stroke="#94a3b8" strokeWidth="2" />

          {/* Assistant / Friend walking with Wheelchair Student */}
          {/* Assistant (Mint dress, brown hair) */}
          <circle cx="270" cy="122" r="8" fill="#b45309" />
          <path d="M260 132 C262 128, 280 128, 282 132 L288 185 H254 Z" fill="#86efac" />
          {/* Arm resting supportively towards wheelchair */}
          <path d="M276 142 L298 148" stroke="#86efac" strokeWidth="4" strokeLinecap="round" />
          {/* Legs */}
          <line x1="264" y1="185" x2="264" y2="210" stroke="#fed7aa" strokeWidth="3" />
          <line x1="278" y1="185" x2="280" y2="210" stroke="#fed7aa" strokeWidth="3" />
          <ellipse cx="264" cy="212" rx="4" ry="2" fill="#475569" />
          <ellipse cx="282" cy="212" rx="4" ry="2" fill="#475569" />

          {/* Student in Wheelchair */}
          {/* Head & Hair */}
          <circle cx="318" cy="132" r="7.5" fill="#1e293b" />
          {/* Light blue shirt */}
          <path d="M308 142 C310 138, 324 138, 326 142 L324 172 H306 Z" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1" />
          {/* Hand holding device */}
          <path d="M320 152 L334 145" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
          <rect x="332" y="138" width="5" height="10" rx="1" fill="#0f172a" />
          {/* Dark trousers seated */}
          <path d="M308 172 H328 L342 196 H330 L320 180 H308 Z" fill="#334155" />
          {/* Wheelchair Wheel */}
          <circle cx="304" cy="190" r="22" stroke="#60a5fa" strokeWidth="3" fill="#ffffff" />
          <circle cx="304" cy="190" r="4" fill="#2563eb" />
          {/* Spokes */}
          <line x1="304" y1="168" x2="304" y2="212" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="282" y1="190" x2="326" y2="190" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="288" y1="174" x2="320" y2="206" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="288" y1="206" x2="320" y2="174" stroke="#93c5fd" strokeWidth="1.5" />
          {/* Front caster wheel */}
          <circle cx="338" cy="208" r="5" stroke="#60a5fa" strokeWidth="2" fill="#ffffff" />
          <line x1="334" y1="196" x2="338" y2="208" stroke="#94a3b8" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
};
