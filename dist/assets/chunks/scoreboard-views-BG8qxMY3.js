import{b as c,j as s}from"./vendor-common-DIOJvOBD.js";import{b as U,c as I}from"./app-api-B9s2v2K1.js";import{f as P,c as h}from"./utils-shared-DWeYjT23.js";const N="admin_scoreboard_matches_cache_v1",F=({onClose:k})=>{const[p,w]=c.useState([]),[E,m]=c.useState(!1),[y,v]=c.useState({}),[u,L]=c.useState({}),[$,A]=c.useState(!1),j=async(e,r,t)=>{let n;try{return await Promise.race([e,new Promise((o,a)=>{n=window.setTimeout(()=>a(new Error(`${t} timed out`)),r)})])}finally{n&&window.clearTimeout(n)}};c.useEffect(()=>{let e=!0,r=!1,t=!1;try{const i=localStorage.getItem(N);if(i){const l=JSON.parse(i);Array.isArray(l)&&l.length>0&&(w(l),r=!0,t=!0)}}catch{}r||m(!0);const n=async()=>{const i=localStorage.getItem("token"),l=j(U("",{payload:"core",trigger:"scoreboard"}),5e3,"Loading matches"),O=i?j(I(i),5e3,"Loading admin matches"):Promise.resolve([]),[b,x]=await Promise.allSettled([l,O]),z=b.status==="fulfilled"&&Array.isArray(b.value)?b.value:[],S=x.status==="fulfilled"&&Array.isArray(x.value)?x.value:[];return S.length>0?S:z},o=async({silent:i=!1}={})=>{try{e&&!i&&!t&&m(!0);const l=await n();if(!e)return;if(l.length>0){w(l),t=!0,m(!1);try{localStorage.setItem(N,JSON.stringify(l))}catch{}}else t||m(!1)}finally{e&&!t&&m(!1)}},a=window.setTimeout(()=>{e&&A(!0)},2e4);o();const d=()=>{o({silent:!0})};return window.addEventListener("scoreboard:refresh",d),()=>{e=!1,window.clearTimeout(a),window.removeEventListener("scoreboard:refresh",d)}},[]);const M=e=>{if(String(e?.status||"").toLowerCase()==="live")return!0;const t=String(e?.score?.event_status||"").toUpperCase();return t.includes("IN_PROGRESS")||t.includes("LIVE")},_=e=>{const r=String(e?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(r))return!0;if(e?.startTime){const t=new Date(e.startTime).getTime();if(!Number.isNaN(t))return t>Date.now()}return!1},f=c.useMemo(()=>{const e=Array.isArray(p)?p:[],r=e.filter(t=>M(t)||_(t));return r.length>0?r:e},[p]),g=c.useMemo(()=>{const e={};return f.forEach(r=>{const t=(r.sport||"Unknown").toUpperCase();e[t]||(e[t]=[]),e[t].push(r)}),e},[f]),C=f.length>0;c.useEffect(()=>{v(e=>{const r={...e};return Object.keys(g).forEach(t=>{typeof r[t]!="boolean"&&(r[t]=!1)}),r})},[g]),c.useEffect(()=>{let e=!0;return(async()=>{const t=new Set;f.forEach(a=>{a?.homeTeam&&t.add(String(a.homeTeam)),a?.awayTeam&&t.add(String(a.awayTeam))});const n=Array.from(t).filter(a=>!u[a]);if(n.length===0)return;const o={};await Promise.all(n.map(async a=>{try{const d=await P(a);d&&(o[a]=d)}catch{}})),e&&Object.keys(o).length>0&&L(a=>({...a,...o}))})(),()=>{e=!1}},[f,u]);const R=e=>e.status==="live"?s.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):e.startTime?new Date(e.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",T=(e,r)=>e.score?r==="home"?e.score.score_home??e.score.home_score??e.score.scoreHome??0:r==="away"?e.score.score_away??e.score.away_score??e.score.scoreAway??0:"":"",D=(e,r)=>s.jsxs("div",{className:"scoreboard-league",children:[s.jsxs("button",{type:"button",className:"league-header",onClick:()=>v(t=>({...t,[e]:!t[e]})),children:[s.jsx("span",{children:e}),s.jsx("i",{className:`fa-solid ${y[e]?"fa-chevron-down":"fa-chevron-up"}`})]}),!y[e]&&s.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(r.length/2)},(t,n)=>r.slice(n*2,n*2+2)).map((t,n)=>s.jsxs("div",{className:"scoreboard-game-row",children:[t.map((o,a)=>{const d=o?.broadcast||o?.tv||o?.score?.broadcast||"";return s.jsxs("div",{className:"scoreboard-game-cell",children:[s.jsxs("div",{className:"game-row",children:[s.jsx("span",{className:"game-time",children:R(o)}),s.jsx("span",{className:"game-network",children:d})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:u[o.homeTeam]||h(o.homeTeam),alt:o.homeTeam,className:"game-logo",onError:i=>{i.currentTarget.src=h(o.homeTeam)}}),s.jsx("span",{children:o.homeTeam})]}),s.jsx("span",{className:"game-score",children:T(o,"home")})]}),s.jsxs("div",{className:"game-team",children:[s.jsxs("div",{className:"game-team-main",children:[s.jsx("img",{src:u[o.awayTeam]||h(o.awayTeam),alt:o.awayTeam,className:"game-logo",onError:i=>{i.currentTarget.src=h(o.awayTeam)}}),s.jsx("span",{children:o.awayTeam})]}),s.jsx("span",{className:"game-score",children:T(o,"away")})]})]},o.id||`${n}-${a}`)}),t.length===1&&s.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${e}-${n}`))})]},e);return s.jsxs("div",{className:"scoreboard-overlay",children:[s.jsxs("div",{className:"scoreboard-header",children:[s.jsx("h2",{children:"Scoreboard"}),s.jsx("button",{type:"button",className:"close-btn",onClick:k,children:"Close"})]}),s.jsx("div",{className:"scoreboard-content",children:!C&&E?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(g).length===0?s.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(g).map(([e,r])=>D(e,r))}),s.jsx("style",{children:`
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
            `})]})};export{F as default};
