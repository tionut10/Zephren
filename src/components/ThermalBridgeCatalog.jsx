import { useState } from "react";
import THERMAL_BRIDGES_DB from "../data/thermal-bridges.json";
import { sanitizeSvg } from "../lib/sanitize-html.js";

export default function ThermalBridgeCatalog({ onSelect, onClose }) {
  const [selectedCat, setSelectedCat] = useState("Joncțiuni pereți");
  const [selectedBridge, setSelectedBridge] = useState(null);
  const categories = [...new Set(THERMAL_BRIDGES_DB.map(b => b.cat))];
  const filtered = THERMAL_BRIDGES_DB.filter(b => b.cat === selectedCat);

  // Simple SVG cross-section illustrations per category
  const drawIllustration = (bridge) => {
    const cat = bridge.cat;
    const name = bridge.name;
    const w = 280, h = 200;
    // Colors: wall=gray, concrete=dark, insulation=yellow, thermal bridge=red zone
    const wallC = "#b0b0b0", concreteC = "#808080", insulC = "#fdd835", bridgeC = "#ef4444", intC = "#e8f5e9", extC = "#e3f2fd";

    let svgContent = "";

    if (cat === "Joncțiuni pereți") {
      if (name.includes("Planșeu intermediar")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <text x="${w/2}" y="15" text-anchor="middle" font-size="9" fill="#666">EXTERIOR</text>
          <text x="${w-10}" y="${h/2}" text-anchor="end" font-size="9" fill="#4caf50">INTERIOR</text>
          <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="90" y="${h/2-8}" width="${w-100}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="${h/2-12}" width="50" height="24" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <line x1="65" y1="${h/2-15}" x2="65" y2="${h/2+15}" stroke="${bridgeC}" stroke-width="2" stroke-dasharray="3 2"/>
          <text x="30" y="${h-10}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
        `;
      } else if (name.includes("Planșeu terasă") || name.includes("Planșeu pod")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <rect x="0" y="${h/2}" width="${w}" height="${h/2}" fill="${intC}" rx="4"/>
          <rect x="60" y="40" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="40" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="60" y="${h/2-8}" width="${w-70}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="10" width="${w-50}" height="18" fill="${insulC}" rx="1"/>
          <rect x="40" y="${h/2-14}" width="50" height="28" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="10" y="30" font-size="9" fill="#2196f3">EXT (pod)</text>
          <text x="10" y="${h-10}" font-size="9" fill="#4caf50">INTERIOR</text>
          <text x="${w-10}" y="${h-10}" text-anchor="end" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else if (name.includes("subsol") || name.includes("Soclu") || name.includes("sol")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h/2}" fill="${intC}" rx="4"/>
          <rect x="0" y="${h/2}" width="${w}" height="${h/2}" fill="#d7ccc8" rx="4"/>
          <rect x="60" y="10" width="30" height="${h-20}" fill="${wallC}" rx="2"/>
          <rect x="40" y="10" width="20" height="${h/2-10}" fill="${insulC}" rx="1"/>
          <rect x="90" y="${h/2-8}" width="${w-100}" height="16" fill="${concreteC}" rx="1"/>
          <rect x="40" y="${h/2-14}" width="50" height="28" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="10" y="25" font-size="9" fill="#4caf50">INTERIOR</text>
          <text x="10" y="${h-10}" font-size="9" fill="#795548">SOL</text>
          <text x="${w-10}" y="${h-10}" text-anchor="end" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else if (name.includes("Colț ext")) {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <polygon points="90,20 90,${h-20} ${w-20},${h-20} ${w-20},${h/2} ${w/2},${h/2} ${w/2},20" fill="${intC}"/>
          <rect x="80" y="20" width="12" height="${h-40}" fill="${wallC}"/>
          <rect x="${w/2}" y="${h/2-6}" width="${w/2-20}" height="12" fill="${wallC}"/>
          <rect x="66" y="20" width="14" height="${h-40}" fill="${insulC}"/>
          <rect x="${w/2}" y="${h/2-14}" width="${w/2-20}" height="14" fill="${insulC}"/>
          <circle cx="92" cy="${h/2}" r="14" fill="${bridgeC}" opacity="0.25"/>
          <text x="30" y="${h-10}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi}</text>
        `;
      } else {
        svgContent = `
          <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
          <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
          <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
          <rect x="50" y="${h/2-10}" width="30" height="20" fill="${bridgeC}" opacity="0.3" rx="2"/>
          <text x="${w/2}" y="${h-10}" text-anchor="middle" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
        `;
      }
    } else if (cat === "Ferestre") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${intC}" rx="4"/>
        <rect x="40" y="20" width="20" height="${h-40}" fill="${insulC}" rx="1"/>
        <rect x="60" y="20" width="30" height="${h-40}" fill="${wallC}" rx="2"/>
        <rect x="${name.includes("izolați")?"45":"65"}" y="${h/2-30}" width="14" height="60" fill="#1565c0" rx="1"/>
        <rect x="${name.includes("izolați")?"44":"64"}" y="${h/2-32}" width="16" height="64" fill="none" stroke="#333" stroke-width="1.5" rx="2"/>
        <rect x="${name.includes("izolați")?"38":"58"}" y="${h/2-35}" width="28" height="70" fill="${bridgeC}" opacity="0.2" rx="3"/>
        <text x="10" y="18" font-size="9" fill="#666">${name.includes("izolați") ? "Montaj în izolație" : "Montaj standard"}</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)${bridge.psi_izolat ? " → " + bridge.psi_izolat + " (izolat)" : ""}</text>
      `;
    } else if (cat === "Balcoane") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w/2}" y="20" width="${w/2-10}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w/2-5}" y="20" width="15" height="${h-40}" fill="${wallC}"/>
        <rect x="${w/2-20}" y="20" width="15" height="${h-40}" fill="${insulC}"/>
        <rect x="20" y="${h/2-8}" width="${w/2-15}" height="16" fill="${concreteC}" rx="1"/>
        <rect x="${w/2-5}" y="${h/2-8}" width="${w/2-5}" height="16" fill="${concreteC}" rx="1"/>
        <rect x="${w/2-25}" y="${h/2-14}" width="40" height="28" fill="${bridgeC}" opacity="0.3" rx="3"/>
        ${name.includes("ruptoare") ? '<line x1="' + (w/2-5) + '" y1="' + (h/2-8) + '" x2="' + (w/2-5) + '" y2="' + (h/2+8) + '" stroke="#ff9800" stroke-width="3"/>' : ""}
        <text x="10" y="18" font-size="9" fill="#666">EXT (balcon)</text>
        <text x="${w-10}" y="18" text-anchor="end" font-size="9" fill="#4caf50">INT</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Acoperiș") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="0" y="${h*0.6}" width="${w}" height="${h*0.4}" fill="${intC}" rx="4"/>
        <polygon points="${w/2},15 20,${h*0.45} ${w-20},${h*0.45}" fill="#a1887f" stroke="#795548" stroke-width="1"/>
        <polygon points="${w/2},30 35,${h*0.43} ${w-35},${h*0.43}" fill="${insulC}"/>
        <rect x="60" y="${h*0.45}" width="25" height="${h*0.5}" fill="${wallC}" rx="1"/>
        <rect x="42" y="${h*0.45}" width="18" height="${h*0.5}" fill="${insulC}" rx="1"/>
        <rect x="42" y="${h*0.4}" width="43" height="20" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Stâlpi/grinzi") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w*0.6}" y="20" width="${w*0.35}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w*0.55}" y="20" width="14" height="${h-40}" fill="${wallC}"/>
        <rect x="${w*0.4}" y="20" width="16" height="${h-40}" fill="${insulC}"/>
        <rect x="${w*0.55}" y="${h/2-25}" width="14" height="50" fill="${concreteC}" rx="1"/>
        <rect x="${w*0.4}" y="${h/2-28}" width="30" height="56" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="18" font-size="9" fill="#666">EXTERIOR</text>
        <text x="${w-10}" y="18" text-anchor="end" font-size="9" fill="#4caf50">INTERIOR</text>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    } else if (cat === "Instalații") {
      svgContent = `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${extC}" rx="4"/>
        <rect x="${w*0.6}" y="20" width="${w*0.35}" height="${h-40}" fill="${intC}" rx="2"/>
        <rect x="${w*0.55}" y="20" width="14" height="${h-40}" fill="${wallC}"/>
        <rect x="${w*0.4}" y="20" width="16" height="${h-40}" fill="${insulC}"/>
        <circle cx="${w*0.55+7}" cy="${h/2}" r="8" fill="#555" stroke="#333" stroke-width="1"/>
        <line x1="20" y1="${h/2}" x2="${w-20}" y2="${h/2}" stroke="#555" stroke-width="4" stroke-linecap="round"/>
        <rect x="${w*0.4}" y="${h/2-14}" width="30" height="28" fill="${bridgeC}" opacity="0.25" rx="3"/>
        <text x="10" y="${h-8}" font-size="8" fill="${bridgeC}">Ψ = ${bridge.psi} W/(m·K)</text>
      `;
    }

    return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:${w}px;height:auto">${svgContent}</svg>`;
  };

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:9999,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px"}} onClick={onClose}>
      <div style={{background:"#12141f",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"16px",width:"100%",maxWidth:"900px",height:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.1)",flexShrink:0}}>
          <div>
            <div style={{fontSize:"16px",fontWeight:"bold"}}>Catalog Punți Termice</div>
            <div style={{fontSize:"11px",opacity:0.4}}>Secțiuni ilustrative conform C107, SR EN ISO 14683 — {THERMAL_BRIDGES_DB.length} tipuri</div>
          </div>
          <button onClick={onClose} style={{width:"32px",height:"32px",borderRadius:"8px",border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"white",cursor:"pointer",fontSize:"14px",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Category tabs */}
        <div style={{display:"flex",gap:"4px",padding:"12px 20px",borderBottom:"1px solid rgba(255,255,255,0.1)",flexShrink:0,overflowX:"auto"}}>
          {categories.map(cat => (
            <button key={cat} onClick={() => { setSelectedCat(cat); setSelectedBridge(null); }}
              style={{padding:"6px 12px",borderRadius:"8px",fontSize:"12px",whiteSpace:"nowrap",border:selectedCat===cat?"1px solid rgba(245,158,11,0.3)":"1px solid transparent",background:selectedCat===cat?"rgba(245,158,11,0.15)":"transparent",color:selectedCat===cat?"#fbbf24":"rgba(255,255,255,0.6)",cursor:"pointer"}}>
              {cat === "Joncțiuni pereți" ? "🧱" : cat === "Ferestre" ? "🪟" : cat === "Balcoane" ? "🏗️" : cat === "Acoperiș" ? "🏠" : cat === "Stâlpi/grinzi" ? "🔩" : "⚙️"} {cat}
            </button>
          ))}
        </div>

        {/* Content — scrollable */}
        <div style={{flex:1,overflowY:"scroll",padding:"20px",WebkitOverflowScrolling:"touch"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 320px), 1fr))",gap:"16px"}}>
            {filtered.map((bridge, i) => (
              <div key={i} onClick={() => setSelectedBridge(selectedBridge === i ? null : i)}
                style={{borderRadius:"12px",border:selectedBridge===i?"1px solid rgba(245,158,11,0.4)":"1px solid rgba(255,255,255,0.06)",padding:"16px",cursor:"pointer",background:selectedBridge===i?"rgba(245,158,11,0.05)":"rgba(255,255,255,0.02)"}}>
                <div style={{borderRadius:"8px",overflow:"hidden",marginBottom:"12px",background:"rgba(255,255,255,0.03)",padding:"8px"}}
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(drawIllustration(bridge)) }} />
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:"12px"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"13px",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bridge.name}</div>
                    <div style={{fontSize:"11px",opacity:0.4,marginTop:"2px"}}>{bridge.desc}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:"13px",fontWeight:"bold",color:"#f87171"}}>Ψ = {bridge.psi}</div>
                    <div style={{fontSize:"10px",opacity:0.3}}>W/(m·K)</div>
                  </div>
                </div>
                {selectedBridge === i && (
                  <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{fontSize:"11px",opacity:0.6,lineHeight:1.6}}>{bridge.detail}</div>
                    {bridge.psi_izolat !== undefined && (
                      <div style={{display:"flex",alignItems:"center",gap:"10px",fontSize:"11px",marginTop:"8px"}}>
                        <span style={{opacity:0.4}}>Neizolat:</span>
                        <span style={{fontWeight:"bold",color:"#f87171"}}>{bridge.psi}</span>
                        <span style={{opacity:0.2}}>→</span>
                        <span style={{opacity:0.4}}>Izolat:</span>
                        <span style={{fontWeight:"bold",color:"#4ade80"}}>{bridge.psi_izolat}</span>
                        <span style={{opacity:0.2}}>W/(m·K)</span>
                        <span style={{color:"#4ade80",fontSize:"10px"}}>(-{Math.round((1 - bridge.psi_izolat / bridge.psi) * 100)}%)</span>
                      </div>
                    )}
                    {onSelect && (
                      <button onClick={(e) => { e.stopPropagation(); onSelect(bridge); onClose(); }}
                        style={{marginTop:"10px",width:"100%",padding:"8px",borderRadius:"8px",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",color:"#fbbf24",fontSize:"11px",cursor:"pointer"}}>
                        Adaugă această punte termică
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{padding:"12px 20px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",justifyContent:"space-between",fontSize:"11px",opacity:0.4,flexShrink:0}}>
          <span>{filtered.length} punți în „{selectedCat}"</span>
          <span>Total: {THERMAL_BRIDGES_DB.length} tipuri</span>
        </div>
      </div>
    </div>
  );
}
