import{r as c,j as o}from"./vendor-react-Bd2HVIcR.js";import{b as $,e as U}from"./app-api-BxannenG.js";import{i as P,f as I,c as p,g as B,a as K}from"./utils-shared-a_duALCJ.js";import"./vendor-common-_eGvg4ul.js";import"./dashboard-views-BMDkgNxy.js";import"./scoreboard-views-DRlZHfDa.js";import"./contexts-shared-CC5AGxHR.js";const k="admin_scoreboard_matches_cache_v1",Q=({onClose:L})=>{const[u,w]=c.useState([]),[E,h]=c.useState(!1),[y,T]=c.useState({}),[m,A]=c.useState({}),[q,M]=c.useState(!1),j=async(e,a,t)=>{let n;try{return await Promise.race([e,new Promise((r,s)=>{n=window.setTimeout(()=>s(new Error(`${t} timed out`)),a)})])}finally{n&&window.clearTimeout(n)}};c.useEffect(()=>{let e=!0,a=!1,t=!1;try{const i=localStorage.getItem(k);if(i){const d=JSON.parse(i);Array.isArray(d)&&d.length>0&&(w(d),a=!0,t=!0)}}catch{}a||h(!0);const n=async()=>{const i=localStorage.getItem("token"),d=j($("",{payload:"light",trigger:"scoreboard"}),5e3,"Loading matches"),D=i?j(U(i),5e3,"Loading admin matches"):Promise.resolve([]),[b,x]=await Promise.allSettled([d,D]),O=b.status==="fulfilled"&&Array.isArray(b.value)?b.value:[],N=x.status==="fulfilled"&&Array.isArray(x.value)?x.value:[];return N.length>0?N:O},r=async({silent:i=!1}={})=>{try{e&&!i&&!t&&h(!0);const d=await n();if(!e)return;if(d.length>0){w(d),t=!0,h(!1);try{localStorage.setItem(k,JSON.stringify(d))}catch{}}else t||h(!1)}finally{e&&!t&&h(!1)}},s=window.setTimeout(()=>{e&&M(!0)},2e4);r();const l=()=>{r({silent:!0})};return window.addEventListener("scoreboard:refresh",l),()=>{e=!1,window.clearTimeout(s),window.removeEventListener("scoreboard:refresh",l)}},[]);const v=P,z=e=>{const a=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(a))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},f=c.useMemo(()=>{const e=Array.isArray(u)?u:[],a=e.filter(t=>v(t)||z(t));return a.length>0?a:e},[u]),g=c.useMemo(()=>{const e={};return f.forEach(a=>{const t=(a.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(a)}),e},[f]),_=f.length>0;c.useEffect(()=>{T(e=>{const a={...e};return Object.keys(g).forEach(t=>{typeof a[t]!="boolean"&&(a[t]=!1)}),a})},[g]),c.useEffect(()=>{let e=!0;return(async()=>{const t=new Map;f.forEach(s=>{const l={sportKey:s?.sportKey||"",sport:s?.sport||s?.sportTitle||""};s?.homeTeam&&!m[s.homeTeam]&&!t.has(s.homeTeam)&&t.set(String(s.homeTeam),{...l,abbr:s.homeTeamShort||""}),s?.awayTeam&&!m[s.awayTeam]&&!t.has(s.awayTeam)&&t.set(String(s.awayTeam),{...l,abbr:s.awayTeamShort||""})});const n=Array.from(t.entries()).filter(([s])=>!m[s]);if(n.length===0)return;const r={};await Promise.all(n.map(async([s,l])=>{try{const i=await I(s,l);i&&(r[s]=i)}catch{}})),e&&Object.keys(r).length>0&&A(s=>({...s,...r}))})(),()=>{e=!1}},[f,m]);const C=e=>{if(v(e))return o.jsx("span",{className:"text-danger fw-bold",children:"LIVE"});if(!e.startTime)return"TBD";const a=new Date(e.startTime),t=B();return`${a.toLocaleTimeString("en-US",{timeZone:t,hour:"numeric",minute:"2-digit",hour12:!0})} ${K(t)}`},S=(e,a)=>e.score?a==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:a==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",R=(e,a)=>o.jsxs("div",{className:"scoreboard-league",children:[o.jsxs("button",{type:"button",className:"league-header",onClick:()=>T(t=>({...t,[e]:!t[e]})),children:[o.jsx("span",{children:e}),o.jsx("i",{className:`fa-solid ${y[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!y[e]&&o.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(a.length/2)},(t,n)=>a.slice(n*2,n*2+2)).map((t,n)=>o.jsxs("div",{className:"scoreboard-game-row",children:[t.map((r,s)=>{const l=r?.broadcast||r?.tv||r?.score?.broadcast||"";return o.jsxs("div",{className:"scoreboard-game-cell",children:[o.jsxs("div",{className:"game-row",children:[o.jsx("span",{className:"game-time",children:C(r)}),o.jsx("span",{className:"game-network",children:l})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:m[r.homeTeam]||p(r.homeTeam),alt:r.homeTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=p(r.homeTeam)}}),o.jsx("span",{children:r.homeTeamShort||r.homeTeam})]}),o.jsx("span",{className:"game-score",children:S(r,"home")})]}),o.jsxs("div",{className:"game-team",children:[o.jsxs("div",{className:"game-team-main",children:[o.jsx("img",{src:m[r.awayTeam]||p(r.awayTeam),alt:r.awayTeam,className:"game-logo",width:"24",height:"24",loading:"lazy",decoding:"async",onError:i=>{i.currentTarget.src=p(r.awayTeam)}}),o.jsx("span",{children:r.awayTeamShort||r.awayTeam})]}),o.jsx("span",{className:"game-score",children:S(r,"away")})]})]},r.id||`${n}-${s}`)}),t.length===1&&o.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${n}`))})]},e);return o.jsxs("div",{className:"scoreboard-overlay",children:[o.jsxs("div",{className:"scoreboard-header",children:[o.jsx("h2",{children:"Scoreboard"}),o.jsx("button",{type:"button",className:"close-btn",onClick:L,children:"Close"})]}),o.jsx("div",{className:"scoreboard-content",children:!_&&E?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(g).length===0?o.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(g).map(([e,a])=>R(e,a))}),o.jsx("style",{children:`
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
            `})]})};export{Q as default};
