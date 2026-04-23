import{r as f,j as t}from"./vendor-react-C9ePv8QP.js";import{b5 as R,j as D}from"./app-api-8KN3Plj_.js";const e=(i,n)=>`https://a.espncdn.com/i/teamlogos/${i}/500/${n}.png`,P={"atlanta hawks":e("nba","atl"),"boston celtics":e("nba","bos"),"brooklyn nets":e("nba","bkn"),"charlotte hornets":e("nba","cha"),"chicago bulls":e("nba","chi"),"cleveland cavaliers":e("nba","cle"),"dallas mavericks":e("nba","dal"),"denver nuggets":e("nba","den"),"detroit pistons":e("nba","det"),"golden state warriors":e("nba","gs"),"houston rockets":e("nba","hou"),"indiana pacers":e("nba","ind"),"la clippers":e("nba","lac"),"los angeles clippers":e("nba","lac"),"los angeles lakers":e("nba","lal"),"memphis grizzlies":e("nba","mem"),"miami heat":e("nba","mia"),"milwaukee bucks":e("nba","mil"),"minnesota timberwolves":e("nba","min"),"new orleans pelicans":e("nba","no"),"new york knicks":e("nba","ny"),"oklahoma city thunder":e("nba","okc"),"orlando magic":e("nba","orl"),"philadelphia 76ers":e("nba","phi"),"phoenix suns":e("nba","phx"),"portland trail blazers":e("nba","por"),"sacramento kings":e("nba","sac"),"san antonio spurs":e("nba","sa"),"toronto raptors":e("nba","tor"),"utah jazz":e("nba","utah"),"washington wizards":e("nba","wsh"),"arizona diamondbacks":e("mlb","ari"),"atlanta braves":e("mlb","atl"),"baltimore orioles":e("mlb","bal"),"boston red sox":e("mlb","bos"),"chicago cubs":e("mlb","chc"),"chicago white sox":e("mlb","chw"),"cincinnati reds":e("mlb","cin"),"cleveland guardians":e("mlb","cle"),"colorado rockies":e("mlb","col"),"detroit tigers":e("mlb","det"),"houston astros":e("mlb","hou"),"kansas city royals":e("mlb","kc"),"los angeles angels":e("mlb","laa"),"los angeles dodgers":e("mlb","lad"),"miami marlins":e("mlb","mia"),"milwaukee brewers":e("mlb","mil"),"minnesota twins":e("mlb","min"),"new york mets":e("mlb","nym"),"new york yankees":e("mlb","nyy"),"oakland athletics":e("mlb","oak"),"philadelphia phillies":e("mlb","phi"),"pittsburgh pirates":e("mlb","pit"),"san diego padres":e("mlb","sd"),"san francisco giants":e("mlb","sf"),"seattle mariners":e("mlb","sea"),"st louis cardinals":e("mlb","stl"),"tampa bay rays":e("mlb","tb"),"texas rangers":e("mlb","tex"),"toronto blue jays":e("mlb","tor"),"washington nationals":e("mlb","wsh"),"arizona cardinals":e("nfl","ari"),"atlanta falcons":e("nfl","atl"),"baltimore ravens":e("nfl","bal"),"buffalo bills":e("nfl","buf"),"carolina panthers":e("nfl","car"),"chicago bears":e("nfl","chi"),"cincinnati bengals":e("nfl","cin"),"cleveland browns":e("nfl","cle"),"dallas cowboys":e("nfl","dal"),"denver broncos":e("nfl","den"),"detroit lions":e("nfl","det"),"green bay packers":e("nfl","gb"),"houston texans":e("nfl","hou"),"indianapolis colts":e("nfl","ind"),"jacksonville jaguars":e("nfl","jax"),"kansas city chiefs":e("nfl","kc"),"las vegas raiders":e("nfl","lv"),"los angeles chargers":e("nfl","lac"),"los angeles rams":e("nfl","lar"),"miami dolphins":e("nfl","mia"),"minnesota vikings":e("nfl","min"),"new england patriots":e("nfl","ne"),"new orleans saints":e("nfl","no"),"new york giants":e("nfl","nyg"),"new york jets":e("nfl","nyj"),"philadelphia eagles":e("nfl","phi"),"pittsburgh steelers":e("nfl","pit"),"san francisco 49ers":e("nfl","sf"),"seattle seahawks":e("nfl","sea"),"tampa bay buccaneers":e("nfl","tb"),"tennessee titans":e("nfl","ten"),"washington commanders":e("nfl","wsh"),"leeds united":"https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg","nottingham forest":"https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg"},I=(i="")=>String(i||"").toLowerCase().replace(/[.'-]/g," ").replace(/\s+/g," ").trim(),F=i=>{let n=0;for(let h=0;h<i.length;h+=1)n=i.charCodeAt(h)+((n<<5)-n);return Math.abs(n)},G=(i="")=>{const n=String(i).trim().split(/\s+/).filter(Boolean);return n.length===0?"?":n.length===1?n[0].slice(0,2).toUpperCase():`${n[0][0]||""}${n[1][0]||""}`.toUpperCase()},u=(i="")=>{const n=String(i||"Team"),p=F(n.toLowerCase())%360,g=(p+36)%360,w=G(n),x=`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${p}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${g}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${w}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(x.trim())}`},B=(i="")=>{const n=I(i);return n&&P[n]||null},H=async(i="")=>{const n=B(i);return n||u(i)},_="admin_scoreboard_matches_cache_v1",q=({onClose:i})=>{const[n,h]=f.useState([]),[p,g]=f.useState(!1),[w,x]=f.useState({}),[y,L]=f.useState({}),[V,A]=f.useState(!1),T=async(a,o,s)=>{let c;try{return await Promise.race([a,new Promise((r,l)=>{c=window.setTimeout(()=>l(new Error(`${s} timed out`)),o)})])}finally{c&&window.clearTimeout(c)}};f.useEffect(()=>{let a=!0,o=!1,s=!1;try{const m=localStorage.getItem(_);if(m){const d=JSON.parse(m);Array.isArray(d)&&d.length>0&&(h(d),o=!0,s=!0)}}catch{}o||g(!0);const c=async()=>{const m=localStorage.getItem("token"),d=T(R(),5e3,"Loading matches"),$=m?T(D(m),5e3,"Loading admin matches"):Promise.resolve([]),[k,j]=await Promise.allSettled([d,$]),U=k.status==="fulfilled"&&Array.isArray(k.value)?k.value:[],N=j.status==="fulfilled"&&Array.isArray(j.value)?j.value:[];return N.length>0?N:U},r=async({silent:m=!1}={})=>{try{a&&!m&&!s&&g(!0);const d=await c();if(!a)return;if(d.length>0){h(d),s=!0,g(!1);try{localStorage.setItem(_,JSON.stringify(d))}catch{}}else s||g(!1)}finally{a&&!s&&g(!1)}},l=window.setTimeout(()=>{a&&A(!0)},2e4);return r(),()=>{a=!1,window.clearTimeout(l)}},[]);const C=a=>{if(String(a?.status||"").toLowerCase()==="live")return!0;const s=String(a?.score?.event_status||"").toUpperCase();return s.includes("IN_PROGRESS")||s.includes("LIVE")},E=a=>{const o=String(a?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(o))return!0;if(a?.startTime){const s=new Date(a.startTime).getTime();if(!Number.isNaN(s))return s>Date.now()}return!1},b=f.useMemo(()=>{const a=Array.isArray(n)?n:[],o=a.filter(s=>C(s)||E(s));return o.length>0?o:a},[n]),v=f.useMemo(()=>{const a={};return b.forEach(o=>{const s=(o.sport||"Unknown").toUpperCase();a[s]||(a[s]=[]),a[s].push(o)}),a},[b]),z=b.length>0;f.useEffect(()=>{x(a=>{const o={...a};return Object.keys(v).forEach(s=>{typeof o[s]!="boolean"&&(o[s]=!1)}),o})},[v]),f.useEffect(()=>{let a=!0;return(async()=>{const s=new Set;b.forEach(l=>{l?.homeTeam&&s.add(String(l.homeTeam)),l?.awayTeam&&s.add(String(l.awayTeam))});const c=Array.from(s).filter(l=>!y[l]);if(c.length===0)return;const r={};await Promise.all(c.map(async l=>{try{const m=await H(l);m&&(r[l]=m)}catch{}})),a&&Object.keys(r).length>0&&L(l=>({...l,...r}))})(),()=>{a=!1}},[b,y]);const M=a=>a.status==="live"?t.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):a.startTime?new Date(a.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",S=(a,o)=>a.score?o==="home"?a.score.score_home??a.score.home_score??a.score.scoreHome??0:o==="away"?a.score.score_away??a.score.away_score??a.score.scoreAway??0:"":"",O=(a,o)=>t.jsxs("div",{className:"scoreboard-league",children:[t.jsxs("button",{type:"button",className:"league-header",onClick:()=>x(s=>({...s,[a]:!s[a]})),children:[t.jsx("span",{children:a}),t.jsx("i",{className:`fa-solid ${w[a]?"fa-chevron-down":"fa-chevron-up"}`})]}),!w[a]&&t.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(o.length/2)},(s,c)=>o.slice(c*2,c*2+2)).map((s,c)=>t.jsxs("div",{className:"scoreboard-game-row",children:[s.map((r,l)=>{const m=r?.broadcast||r?.tv||r?.score?.broadcast||"";return t.jsxs("div",{className:"scoreboard-game-cell",children:[t.jsxs("div",{className:"game-row",children:[t.jsx("span",{className:"game-time",children:M(r)}),t.jsx("span",{className:"game-network",children:m})]}),t.jsxs("div",{className:"game-team",children:[t.jsxs("div",{className:"game-team-main",children:[t.jsx("img",{src:y[r.homeTeam]||u(r.homeTeam),alt:r.homeTeam,className:"game-logo",onError:d=>{d.currentTarget.src=u(r.homeTeam)}}),t.jsx("span",{children:r.homeTeam})]}),t.jsx("span",{className:"game-score",children:S(r,"home")})]}),t.jsxs("div",{className:"game-team",children:[t.jsxs("div",{className:"game-team-main",children:[t.jsx("img",{src:y[r.awayTeam]||u(r.awayTeam),alt:r.awayTeam,className:"game-logo",onError:d=>{d.currentTarget.src=u(r.awayTeam)}}),t.jsx("span",{children:r.awayTeam})]}),t.jsx("span",{className:"game-score",children:S(r,"away")})]})]},r.id||`${c}-${l}`)}),s.length===1&&t.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${a}-${c}`))})]},a);return t.jsxs("div",{className:"scoreboard-overlay",children:[t.jsxs("div",{className:"scoreboard-header",children:[t.jsx("h2",{children:"Scoreboard"}),t.jsx("button",{type:"button",className:"close-btn",onClick:i,children:"Close"})]}),t.jsx("div",{className:"scoreboard-content",children:!z&&p?t.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(v).length===0?t.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(v).map(([a,o])=>O(a,o))}),t.jsx("style",{children:`
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
            `})]})},Y=Object.freeze(Object.defineProperty({__proto__:null,default:q},Symbol.toStringTag,{value:"Module"}));export{q as S,Y as a,u as c,H as f,B as l};
