import{r as f,j as o,o as B,Q as P}from"./index-vZr0KL47.js";const E={"leeds united":"https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg","nottingham forest":"https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg"},k=new Map,N=(n="")=>String(n||"").toLowerCase().replace(/[.'-]/g," ").replace(/\s+/g," ").trim(),F=(n="")=>{const s=N(n);if(!s)return[];const d=[s,s.replace(/\b(fc|cf|sc|afc|b c|bk|basketball club|football club)\b/g," ").replace(/\s+/g," ").trim(),s.replace(/\b(the)\b/g," ").replace(/\s+/g," ").trim()].filter(Boolean);return Array.from(new Set(d))},G=n=>n?.strBadge||n?.strTeamBadge||n?.strLogo||n?.strTeamLogo||n?.strJersey||n?.strTeamJersey||"",H=n=>{let s=0;for(let d=0;d<n.length;d+=1)s=n.charCodeAt(d)+((s<<5)-s);return Math.abs(s)},J=(n="")=>{const s=String(n).trim().split(/\s+/).filter(Boolean);return s.length===0?"?":s.length===1?s[0].slice(0,2).toUpperCase():`${s[0][0]||""}${s[1][0]||""}`.toUpperCase()},T=(n="")=>{const s=String(n||"Team"),b=H(s.toLowerCase())%360,g=(b+36)%360,u=J(s),p=`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${b}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${g}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${u}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(p.trim())}`},q=async(n="")=>{const s=N(n);if(!s)return"";if(E[s])return E[s];if(k.has(s))return k.get(s);const d=(async()=>{const b=F(n);for(const g of b)try{const u=await fetch(`https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(g)}`);if(!u.ok)continue;const p=await u.json(),h=Array.isArray(p?.teams)?p.teams:[];if(h.length===0)continue;const L=h.find(y=>N(y?.strTeam)===s)||h[0],w=G(L);if(w)return w}catch{}return""})();return k.set(s,d),d},M="admin_scoreboard_matches_cache_v1",V=({onClose:n})=>{const[s,d]=f.useState([]),[b,g]=f.useState(!1),[u,p]=f.useState({}),[h,_]=f.useState({}),[L,w]=f.useState(!1),y=async(e,r,t)=>{let c;try{return await Promise.race([e,new Promise((a,i)=>{c=window.setTimeout(()=>i(new Error(`${t} timed out`)),r)})])}finally{c&&window.clearTimeout(c)}};f.useEffect(()=>{let e=!0,r=!1,t=!1;try{const m=localStorage.getItem(M);if(m){const l=JSON.parse(m);Array.isArray(l)&&l.length>0&&(d(l),r=!0,t=!0)}}catch{}r||g(!0);const c=async()=>{const m=localStorage.getItem("token"),l=y(B(),5e3,"Loading matches"),D=m?y(P(m),5e3,"Loading admin matches"):Promise.resolve([]),[j,S]=await Promise.allSettled([l,D]),I=j.status==="fulfilled"&&Array.isArray(j.value)?j.value:[],C=S.status==="fulfilled"&&Array.isArray(S.value)?S.value:[];return C.length>0?C:I},a=async({silent:m=!1}={})=>{try{e&&!m&&!t&&g(!0);const l=await c();if(!e)return;if(l.length>0){d(l),t=!0,g(!1);try{localStorage.setItem(M,JSON.stringify(l))}catch{}}else t||g(!1)}finally{e&&!t&&g(!1)}},i=window.setTimeout(()=>{e&&w(!0)},2e4);return a(),()=>{e=!1,window.clearTimeout(i)}},[]);const O=e=>{if(String(e?.status||"").toLowerCase()==="live")return!0;const t=String(e?.score?.event_status||"").toUpperCase();return t.includes("IN_PROGRESS")||t.includes("LIVE")},$=e=>{const r=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(r))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},x=f.useMemo(()=>{const e=Array.isArray(s)?s:[],r=e.filter(t=>O(t)||$(t));return r.length>0?r:e},[s]),v=f.useMemo(()=>{const e={};return x.forEach(r=>{const t=(r.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(r)}),e},[x]),R=x.length>0;f.useEffect(()=>{p(e=>{const r={...e};return Object.keys(v).forEach(t=>{typeof r[t]!="boolean"&&(r[t]=!1)}),r})},[v]),f.useEffect(()=>{let e=!0;return(async()=>{const t=new Set;x.forEach(i=>{i?.homeTeam&&t.add(String(i.homeTeam)),i?.awayTeam&&t.add(String(i.awayTeam))});const c=Array.from(t).filter(i=>!h[i]);if(c.length===0)return;const a={};await Promise.all(c.map(async i=>{try{const m=await q(i);m&&(a[i]=m)}catch{}})),e&&Object.keys(a).length>0&&_(i=>({...i,...a}))})(),()=>{e=!1}},[x,h]);const U=e=>e.status==="live"?o.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):e.startTime?new Date(e.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",A=(e,r)=>e.score?r==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:r==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",z=(e,r)=>o.jsxs("div",{className:"scoreboard-league",children:[o.jsxs("button",{type:"button",className:"league-header",onClick:()=>p(t=>({...t,[e]:!t[e]})),children:[o.jsx("span",{children:e}),o.jsx("i",{className:`fa-solid ${u[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!u[e]&&o.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(r.length/2)},(t,c)=>r.slice(c*2,c*2+2)).map((t,c)=>o.jsxs("div",{className:"scoreboard-game-row",children:[t.map((a,i)=>{const m=a?.broadcast||a?.tv||a?.score?.broadcast||"";return o.jsxs("div",{className:"scoreboard-game-cell",children:[o.jsxs("div",{className:"game-row",children:[o.jsx("span",{className:"game-time",children:U(a)}),o.jsx("span",{className:"game-network",children:m})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:h[a.homeTeam]||T(a.homeTeam),alt:a.homeTeam,className:"game-logo",onError:l=>{l.currentTarget.src=T(a.homeTeam)}}),o.jsx("span",{children:a.homeTeam})]}),o.jsx("span",{className:"game-score",children:A(a,"home")})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:h[a.awayTeam]||T(a.awayTeam),alt:a.awayTeam,className:"game-logo",onError:l=>{l.currentTarget.src=T(a.awayTeam)}}),o.jsx("span",{children:a.awayTeam})]}),o.jsx("span",{className:"game-score",children:A(a,"away")})]})]},a.id||`${c}-${i}`)}),t.length===1&&o.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${c}`))})]},e);return o.jsxs("div",{className:"scoreboard-overlay",children:[o.jsxs("div",{className:"scoreboard-header",children:[o.jsx("h2",{children:"Scoreboard"}),o.jsx("button",{type:"button",className:"close-btn",onClick:n,children:"Close"})]}),o.jsx("div",{className:"scoreboard-content",children:!R&&b?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(v).length===0?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(v).map(([e,r])=>z(e,r))}),o.jsx("style",{children:`
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
            `})]})},Q=Object.freeze(Object.defineProperty({__proto__:null,default:V},Symbol.toStringTag,{value:"Module"}));export{V as S,Q as a,T as c,q as f};
