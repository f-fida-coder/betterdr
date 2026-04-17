import{r as m,j as s,o as U,Q as D}from"./index-BtNnkiHm.js";const k={"leeds united":"https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg","nottingham forest":"https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg"},I=(l="")=>String(l||"").toLowerCase().replace(/[.'-]/g," ").replace(/\s+/g," ").trim(),P=l=>{let a=0;for(let f=0;f<l.length;f+=1)a=l.charCodeAt(f)+((a<<5)-a);return Math.abs(a)},F=(l="")=>{const a=String(l).trim().split(/\s+/).filter(Boolean);return a.length===0?"?":a.length===1?a[0].slice(0,2).toUpperCase():`${a[0][0]||""}${a[1][0]||""}`.toUpperCase()},y=(l="")=>{const a=String(l||"Team"),u=P(a.toLowerCase())%360,g=(u+36)%360,p=F(a),x=`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${u}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${g}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${p}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(x.trim())}`},B=async(l="")=>{const a=I(l);return a&&k[a]?k[a]:""},_="admin_scoreboard_matches_cache_v1",G=({onClose:l})=>{const[a,f]=m.useState([]),[u,g]=m.useState(!1),[p,x]=m.useState({}),[b,L]=m.useState({}),[H,A]=m.useState(!1),T=async(e,o,t)=>{let i;try{return await Promise.race([e,new Promise((r,n)=>{i=window.setTimeout(()=>n(new Error(`${t} timed out`)),o)})])}finally{i&&window.clearTimeout(i)}};m.useEffect(()=>{let e=!0,o=!1,t=!1;try{const d=localStorage.getItem(_);if(d){const c=JSON.parse(d);Array.isArray(c)&&c.length>0&&(f(c),o=!0,t=!0)}}catch{}o||g(!0);const i=async()=>{const d=localStorage.getItem("token"),c=T(U(),5e3,"Loading matches"),z=d?T(D(d),5e3,"Loading admin matches"):Promise.resolve([]),[v,j]=await Promise.allSettled([c,z]),R=v.status==="fulfilled"&&Array.isArray(v.value)?v.value:[],N=j.status==="fulfilled"&&Array.isArray(j.value)?j.value:[];return N.length>0?N:R},r=async({silent:d=!1}={})=>{try{e&&!d&&!t&&g(!0);const c=await i();if(!e)return;if(c.length>0){f(c),t=!0,g(!1);try{localStorage.setItem(_,JSON.stringify(c))}catch{}}else t||g(!1)}finally{e&&!t&&g(!1)}},n=window.setTimeout(()=>{e&&A(!0)},2e4);return r(),()=>{e=!1,window.clearTimeout(n)}},[]);const C=e=>{if(String(e?.status||"").toLowerCase()==="live")return!0;const t=String(e?.score?.event_status||"").toUpperCase();return t.includes("IN_PROGRESS")||t.includes("LIVE")},E=e=>{const o=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(o))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},h=m.useMemo(()=>{const e=Array.isArray(a)?a:[],o=e.filter(t=>C(t)||E(t));return o.length>0?o:e},[a]),w=m.useMemo(()=>{const e={};return h.forEach(o=>{const t=(o.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(o)}),e},[h]),M=h.length>0;m.useEffect(()=>{x(e=>{const o={...e};return Object.keys(w).forEach(t=>{typeof o[t]!="boolean"&&(o[t]=!1)}),o})},[w]),m.useEffect(()=>{let e=!0;return(async()=>{const t=new Set;h.forEach(n=>{n?.homeTeam&&t.add(String(n.homeTeam)),n?.awayTeam&&t.add(String(n.awayTeam))});const i=Array.from(t).filter(n=>!b[n]);if(i.length===0)return;const r={};await Promise.all(i.map(async n=>{try{const d=await B(n);d&&(r[n]=d)}catch{}})),e&&Object.keys(r).length>0&&L(n=>({...n,...r}))})(),()=>{e=!1}},[h,b]);const O=e=>e.status==="live"?s.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):e.startTime?new Date(e.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",S=(e,o)=>e.score?o==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:o==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",$=(e,o)=>s.jsxs("div",{className:"scoreboard-league",children:[s.jsxs("button",{type:"button",className:"league-header",onClick:()=>x(t=>({...t,[e]:!t[e]})),children:[s.jsx("span",{children:e}),s.jsx("i",{className:`fa-solid ${p[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!p[e]&&s.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(o.length/2)},(t,i)=>o.slice(i*2,i*2+2)).map((t,i)=>s.jsxs("div",{className:"scoreboard-game-row",children:[t.map((r,n)=>{const d=r?.broadcast||r?.tv||r?.score?.broadcast||"";return s.jsxs("div",{className:"scoreboard-game-cell",children:[s.jsxs("div",{className:"game-row",children:[s.jsx("span",{className:"game-time",children:O(r)}),s.jsx("span",{className:"game-network",children:d})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:b[r.homeTeam]||y(r.homeTeam),alt:r.homeTeam,className:"game-logo",onError:c=>{c.currentTarget.src=y(r.homeTeam)}}),s.jsx("span",{children:r.homeTeam})]}),s.jsx("span",{className:"game-score",children:S(r,"home")})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:b[r.awayTeam]||y(r.awayTeam),alt:r.awayTeam,className:"game-logo",onError:c=>{c.currentTarget.src=y(r.awayTeam)}}),s.jsx("span",{children:r.awayTeam})]}),s.jsx("span",{className:"game-score",children:S(r,"away")})]})]},r.id||`${i}-${n}`)}),t.length===1&&s.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${i}`))})]},e);return s.jsxs("div",{className:"scoreboard-overlay",children:[s.jsxs("div",{className:"scoreboard-header",children:[s.jsx("h2",{children:"Scoreboard"}),s.jsx("button",{type:"button",className:"close-btn",onClick:l,children:"Close"})]}),s.jsx("div",{className:"scoreboard-content",children:!M&&u?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(w).length===0?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(w).map(([e,o])=>$(e,o))}),s.jsx("style",{children:`
                .scoreboard-overlay {
                    position: fixed;
                    top: 0;
                    right: 0;
                    width: min(350px, 100vw);
                    height: 100vh;
                    background: #f5f5f5;
                    box-shadow: -5px 0 15px rgba(0,0,0,0.3);
                    z-index: 3000;
                    display: flex;
                    flex-direction: column;
                    font-family: 'Roboto', sans-serif;
                }
                .scoreboard-header {
                    background: #fff;
                    padding: 15px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-bottom: 1px solid #ddd;
                    position: relative;
                }
                .scoreboard-header h2 {
                    margin: 0;
                    font-size: 18px;
                    color: #333;
                    font-weight: bold;
                    text-transform: uppercase;
                }
                .close-btn {
                    position: absolute;
                    right: 15px;
                    color: #d9534f;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: underline;
                    font-weight: bold;
                    border: none;
                    background: transparent;
                }
                .scoreboard-content {
                    flex: 1;
                    overflow-y: auto;
                }
                .scoreboard-status-row {
                    padding: 6px 12px;
                    background: #fff;
                    border-bottom: 1px solid #ddd;
                }
                .scoreboard-status {
                    font-size: 12px;
                    font-weight: 600;
                }
                .scoreboard-status.syncing {
                    color: #0b7285;
                }
                .scoreboard-status.error {
                    color: #b02a37;
                }
                .league-header {
                    background: #333;
                    color: white;
                    padding: 8px 15px;
                    font-size: 14px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #444;
                    width: 100%;
                    border-left: none;
                    border-right: none;
                    cursor: pointer;
                }
                .league-games {
                    background: #e5e7eb;
                    border-left: 1px solid #c6c8cc;
                }
                .scoreboard-game-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                }
                .scoreboard-game-cell {
                    background: #f3f4f6;
                    border-right: 1px solid #c6c8cc;
                    border-bottom: 1px solid #c6c8cc;
                    min-height: 84px;
                }
                .scoreboard-game-cell.ghost-cell {
                    background: #f3f4f6;
                }
                .game-row {
                    display: flex;
                    justify-content: space-between;
                    color: #4b5563;
                    background: #e5e7eb;
                    padding: 4px 8px;
                    font-size: 11px;
                    border-bottom: 1px solid #d1d5db;
                }
                .game-network {
                    font-weight: 700;
                    color: #15803d;
                    min-width: 28px;
                    text-align: right;
                }
                .game-team {
                    display: flex;
                    align-items: center;
                    margin: 5px 0;
                    color: #3f3f46;
                    font-weight: 500;
                    justify-content: space-between;
                    padding: 0 8px;
                }
                .game-team-main {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                    min-width: 0;
                }
                .game-team-main span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 120px;
                    font-size: 12px;
                }
                .game-logo {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                }
                .game-score {
                    font-weight: 700;
                    color: #111827;
                    font-size: 12px;
                    min-width: 14px;
                    text-align: right;
                }
                .text-danger { color: #dc3545; }
                .fw-bold { font-weight: bold; }
                @media (max-width: 380px) {
                    .scoreboard-overlay {
                        width: 100vw;
                    }
                    .scoreboard-game-row {
                        grid-template-columns: 1fr;
                    }
                    .scoreboard-game-cell {
                        border-right: none;
                    }
                }
            `})]})},V=Object.freeze(Object.defineProperty({__proto__:null,default:G},Symbol.toStringTag,{value:"Module"}));export{G as S,V as a,y as c,B as f};
