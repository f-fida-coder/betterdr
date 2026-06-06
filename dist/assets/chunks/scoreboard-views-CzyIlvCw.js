import{r as c,j as o}from"./vendor-react-Bd2HVIcR.js";import{b as $,e as U}from"./app-api-CWKB9xSF.js";import{f as I,c as u,g as P,a as B}from"./utils-shared-RcsBL_wl.js";import"./vendor-common-_eGvg4ul.js";const N="admin_scoreboard_matches_cache_v1",H=({onClose:L})=>{const[p,w]=c.useState([]),[k,h]=c.useState(!1),[y,T]=c.useState({}),[m,E]=c.useState({}),[K,A]=c.useState(!1),v=async(e,s,t)=>{let n;try{return await Promise.race([e,new Promise((a,r)=>{n=window.setTimeout(()=>r(new Error(`${t} timed out`)),s)})])}finally{n&&window.clearTimeout(n)}};c.useEffect(()=>{let e=!0,s=!1,t=!1;try{const i=localStorage.getItem(N);if(i){const d=JSON.parse(i);Array.isArray(d)&&d.length>0&&(w(d),s=!0,t=!0)}}catch{}s||h(!0);const n=async()=>{const i=localStorage.getItem("token"),d=v($("",{payload:"core",trigger:"scoreboard"}),5e3,"Loading matches"),D=i?v(U(i),5e3,"Loading admin matches"):Promise.resolve([]),[b,x]=await Promise.allSettled([d,D]),O=b.status==="fulfilled"&&Array.isArray(b.value)?b.value:[],S=x.status==="fulfilled"&&Array.isArray(x.value)?x.value:[];return S.length>0?S:O},a=async({silent:i=!1}={})=>{try{e&&!i&&!t&&h(!0);const d=await n();if(!e)return;if(d.length>0){w(d),t=!0,h(!1);try{localStorage.setItem(N,JSON.stringify(d))}catch{}}else t||h(!1)}finally{e&&!t&&h(!1)}},r=window.setTimeout(()=>{e&&A(!0)},2e4);a();const l=()=>{a({silent:!0})};return window.addEventListener("scoreboard:refresh",l),()=>{e=!1,window.clearTimeout(r),window.removeEventListener("scoreboard:refresh",l)}},[]);const M=e=>{if(String(e?.status||"").toLowerCase()==="live")return!0;const t=String(e?.score?.event_status||"").toUpperCase();return t.includes("IN_PROGRESS")||t.includes("LIVE")},_=e=>{const s=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(s))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},f=c.useMemo(()=>{const e=Array.isArray(p)?p:[],s=e.filter(t=>M(t)||_(t));return s.length>0?s:e},[p]),g=c.useMemo(()=>{const e={};return f.forEach(s=>{const t=(s.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(s)}),e},[f]),z=f.length>0;c.useEffect(()=>{T(e=>{const s={...e};return Object.keys(g).forEach(t=>{typeof s[t]!="boolean"&&(s[t]=!1)}),s})},[g]),c.useEffect(()=>{let e=!0;return(async()=>{const t=new Map;f.forEach(r=>{const l={sportKey:r?.sportKey||"",sport:r?.sport||r?.sportTitle||""};r?.homeTeam&&!m[r.homeTeam]&&!t.has(r.homeTeam)&&t.set(String(r.homeTeam),{...l,abbr:r.homeTeamShort||""}),r?.awayTeam&&!m[r.awayTeam]&&!t.has(r.awayTeam)&&t.set(String(r.awayTeam),{...l,abbr:r.awayTeamShort||""})});const n=Array.from(t.entries()).filter(([r])=>!m[r]);if(n.length===0)return;const a={};await Promise.all(n.map(async([r,l])=>{try{const i=await I(r,l);i&&(a[r]=i)}catch{}})),e&&Object.keys(a).length>0&&E(r=>({...r,...a}))})(),()=>{e=!1}},[f,m]);const C=e=>{if(e.status==="live")return o.jsx("span",{className:"text-danger fw-bold",children:"LIVE"});if(!e.startTime)return"TBD";const s=new Date(e.startTime),t=P();return`${s.toLocaleTimeString("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!0})} ${B(t)}`},j=(e,s)=>e.score?s==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:s==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",R=(e,s)=>o.jsxs("div",{className:"scoreboard-league",children:[o.jsxs("button",{type:"button",className:"league-header",onClick:()=>T(t=>({...t,[e]:!t[e]})),children:[o.jsx("span",{children:e}),o.jsx("i",{className:`fa-solid ${y[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!y[e]&&o.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(s.length/2)},(t,n)=>s.slice(n*2,n*2+2)).map((t,n)=>o.jsxs("div",{className:"scoreboard-game-row",children:[t.map((a,r)=>{const l=a?.broadcast||a?.tv||a?.score?.broadcast||"";return o.jsxs("div",{className:"scoreboard-game-cell",children:[o.jsxs("div",{className:"game-row",children:[o.jsx("span",{className:"game-time",children:C(a)}),o.jsx("span",{className:"game-network",children:l})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:m[a.homeTeam]||u(a.homeTeam),alt:a.homeTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=u(a.homeTeam)}}),o.jsx("span",{children:a.homeTeamShort||a.homeTeam})]}),o.jsx("span",{className:"game-score",children:j(a,"home")})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:m[a.awayTeam]||u(a.awayTeam),alt:a.awayTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=u(a.awayTeam)}}),o.jsx("span",{children:a.awayTeamShort||a.awayTeam})]}),o.jsx("span",{className:"game-score",children:j(a,"away")})]})]},a.id||`${n}-${r}`)}),t.length===1&&o.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${n}`))})]},e);return o.jsxs("div",{className:"scoreboard-overlay",children:[o.jsxs("div",{className:"scoreboard-header",children:[o.jsx("h2",{children:"Scoreboard"}),o.jsx("button",{type:"button",className:"close-btn",onClick:L,children:"Close"})]}),o.jsx("div",{className:"scoreboard-content",children:!z&&k?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(g).length===0?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(g).map(([e,s])=>R(e,s))}),o.jsx("style",{children:`
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
            `})]})};export{H as default};
