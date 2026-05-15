import{r as c,j as s}from"./vendor-react-Bd2HVIcR.js";import{b as $,d as U}from"./app-api-CYbsefbj.js";import{f as I,c as h,g as P,a as q}from"./utils-shared-DLvoEu5d.js";import"./vendor-common-_eGvg4ul.js";const N="admin_scoreboard_matches_cache_v1",J=({onClose:L})=>{const[p,w]=c.useState([]),[k,m]=c.useState(!1),[y,v]=c.useState({}),[g,E]=c.useState({}),[B,A]=c.useState(!1),j=async(e,o,t)=>{let n;try{return await Promise.race([e,new Promise((r,a)=>{n=window.setTimeout(()=>a(new Error(`${t} timed out`)),o)})])}finally{n&&window.clearTimeout(n)}};c.useEffect(()=>{let e=!0,o=!1,t=!1;try{const i=localStorage.getItem(N);if(i){const l=JSON.parse(i);Array.isArray(l)&&l.length>0&&(w(l),o=!0,t=!0)}}catch{}o||m(!0);const n=async()=>{const i=localStorage.getItem("token"),l=j($("",{payload:"core",trigger:"scoreboard"}),5e3,"Loading matches"),D=i?j(U(i),5e3,"Loading admin matches"):Promise.resolve([]),[b,x]=await Promise.allSettled([l,D]),O=b.status==="fulfilled"&&Array.isArray(b.value)?b.value:[],S=x.status==="fulfilled"&&Array.isArray(x.value)?x.value:[];return S.length>0?S:O},r=async({silent:i=!1}={})=>{try{e&&!i&&!t&&m(!0);const l=await n();if(!e)return;if(l.length>0){w(l),t=!0,m(!1);try{localStorage.setItem(N,JSON.stringify(l))}catch{}}else t||m(!1)}finally{e&&!t&&m(!1)}},a=window.setTimeout(()=>{e&&A(!0)},2e4);r();const d=()=>{r({silent:!0})};return window.addEventListener("scoreboard:refresh",d),()=>{e=!1,window.clearTimeout(a),window.removeEventListener("scoreboard:refresh",d)}},[]);const M=e=>{if(String(e?.status||"").toLowerCase()==="live")return!0;const t=String(e?.score?.event_status||"").toUpperCase();return t.includes("IN_PROGRESS")||t.includes("LIVE")},_=e=>{const o=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(o))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},f=c.useMemo(()=>{const e=Array.isArray(p)?p:[],o=e.filter(t=>M(t)||_(t));return o.length>0?o:e},[p]),u=c.useMemo(()=>{const e={};return f.forEach(o=>{const t=(o.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(o)}),e},[f]),z=f.length>0;c.useEffect(()=>{v(e=>{const o={...e};return Object.keys(u).forEach(t=>{typeof o[t]!="boolean"&&(o[t]=!1)}),o})},[u]),c.useEffect(()=>{let e=!0;return(async()=>{const t=new Set;f.forEach(a=>{a?.homeTeam&&t.add(String(a.homeTeam)),a?.awayTeam&&t.add(String(a.awayTeam))});const n=Array.from(t).filter(a=>!g[a]);if(n.length===0)return;const r={};await Promise.all(n.map(async a=>{try{const d=await I(a);d&&(r[a]=d)}catch{}})),e&&Object.keys(r).length>0&&E(a=>({...a,...r}))})(),()=>{e=!1}},[f,g]);const C=e=>{if(e.status==="live")return s.jsx("span",{className:"text-danger fw-bold",children:"LIVE"});if(!e.startTime)return"TBD";const o=new Date(e.startTime),t=P();return`${o.toLocaleTimeString("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!0})} ${q(t)}`},T=(e,o)=>e.score?o==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:o==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",R=(e,o)=>s.jsxs("div",{className:"scoreboard-league",children:[s.jsxs("button",{type:"button",className:"league-header",onClick:()=>v(t=>({...t,[e]:!t[e]})),children:[s.jsx("span",{children:e}),s.jsx("i",{className:`fa-solid ${y[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!y[e]&&s.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(o.length/2)},(t,n)=>o.slice(n*2,n*2+2)).map((t,n)=>s.jsxs("div",{className:"scoreboard-game-row",children:[t.map((r,a)=>{const d=r?.broadcast||r?.tv||r?.score?.broadcast||"";return s.jsxs("div",{className:"scoreboard-game-cell",children:[s.jsxs("div",{className:"game-row",children:[s.jsx("span",{className:"game-time",children:C(r)}),s.jsx("span",{className:"game-network",children:d})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:g[r.homeTeam]||h(r.homeTeam),alt:r.homeTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=h(r.homeTeam)}}),s.jsx("span",{children:r.homeTeam})]}),s.jsx("span",{className:"game-score",children:T(r,"home")})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:g[r.awayTeam]||h(r.awayTeam),alt:r.awayTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=h(r.awayTeam)}}),s.jsx("span",{children:r.awayTeam})]}),s.jsx("span",{className:"game-score",children:T(r,"away")})]})]},r.id||`${n}-${a}`)}),t.length===1&&s.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${n}`))})]},e);return s.jsxs("div",{className:"scoreboard-overlay",children:[s.jsxs("div",{className:"scoreboard-header",children:[s.jsx("h2",{children:"Scoreboard"}),s.jsx("button",{type:"button",className:"close-btn",onClick:L,children:"Close"})]}),s.jsx("div",{className:"scoreboard-content",children:!z&&k?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(u).length===0?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(u).map(([e,o])=>R(e,o))}),s.jsx("style",{children:`
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
            `})]})};export{J as default};
