import{r as y,j as r}from"./vendor-react-C9ePv8QP.js";import{b5 as J,j as q}from"./app-api-8KN3Plj_.js";const e=(o,a)=>`https://a.espncdn.com/i/teamlogos/${o}/500/${a}.png`,L={"atlanta hawks":e("nba","atl"),"boston celtics":e("nba","bos"),"brooklyn nets":e("nba","bkn"),"charlotte hornets":e("nba","cha"),"chicago bulls":e("nba","chi"),"cleveland cavaliers":e("nba","cle"),"dallas mavericks":e("nba","dal"),"denver nuggets":e("nba","den"),"detroit pistons":e("nba","det"),"golden state warriors":e("nba","gs"),"houston rockets":e("nba","hou"),"indiana pacers":e("nba","ind"),"la clippers":e("nba","lac"),"los angeles clippers":e("nba","lac"),"los angeles lakers":e("nba","lal"),"memphis grizzlies":e("nba","mem"),"miami heat":e("nba","mia"),"milwaukee bucks":e("nba","mil"),"minnesota timberwolves":e("nba","min"),"new orleans pelicans":e("nba","no"),"new york knicks":e("nba","ny"),"oklahoma city thunder":e("nba","okc"),"orlando magic":e("nba","orl"),"philadelphia 76ers":e("nba","phi"),"phoenix suns":e("nba","phx"),"portland trail blazers":e("nba","por"),"sacramento kings":e("nba","sac"),"san antonio spurs":e("nba","sa"),"toronto raptors":e("nba","tor"),"utah jazz":e("nba","utah"),"washington wizards":e("nba","wsh"),"arizona diamondbacks":e("mlb","ari"),"atlanta braves":e("mlb","atl"),"baltimore orioles":e("mlb","bal"),"boston red sox":e("mlb","bos"),"chicago cubs":e("mlb","chc"),"chicago white sox":e("mlb","chw"),"cincinnati reds":e("mlb","cin"),"cleveland guardians":e("mlb","cle"),"colorado rockies":e("mlb","col"),"detroit tigers":e("mlb","det"),"houston astros":e("mlb","hou"),"kansas city royals":e("mlb","kc"),"los angeles angels":e("mlb","laa"),"los angeles dodgers":e("mlb","lad"),"miami marlins":e("mlb","mia"),"milwaukee brewers":e("mlb","mil"),"minnesota twins":e("mlb","min"),"new york mets":e("mlb","nym"),"new york yankees":e("mlb","nyy"),"oakland athletics":e("mlb","oak"),"philadelphia phillies":e("mlb","phi"),"pittsburgh pirates":e("mlb","pit"),"san diego padres":e("mlb","sd"),"san francisco giants":e("mlb","sf"),"seattle mariners":e("mlb","sea"),"st louis cardinals":e("mlb","stl"),"tampa bay rays":e("mlb","tb"),"texas rangers":e("mlb","tex"),"toronto blue jays":e("mlb","tor"),"washington nationals":e("mlb","wsh"),"arizona cardinals":e("nfl","ari"),"atlanta falcons":e("nfl","atl"),"baltimore ravens":e("nfl","bal"),"buffalo bills":e("nfl","buf"),"carolina panthers":e("nfl","car"),"chicago bears":e("nfl","chi"),"cincinnati bengals":e("nfl","cin"),"cleveland browns":e("nfl","cle"),"dallas cowboys":e("nfl","dal"),"denver broncos":e("nfl","den"),"detroit lions":e("nfl","det"),"green bay packers":e("nfl","gb"),"houston texans":e("nfl","hou"),"indianapolis colts":e("nfl","ind"),"jacksonville jaguars":e("nfl","jax"),"kansas city chiefs":e("nfl","kc"),"las vegas raiders":e("nfl","lv"),"los angeles chargers":e("nfl","lac"),"los angeles rams":e("nfl","lar"),"miami dolphins":e("nfl","mia"),"minnesota vikings":e("nfl","min"),"new england patriots":e("nfl","ne"),"new orleans saints":e("nfl","no"),"new york giants":e("nfl","nyg"),"new york jets":e("nfl","nyj"),"philadelphia eagles":e("nfl","phi"),"pittsburgh steelers":e("nfl","pit"),"san francisco 49ers":e("nfl","sf"),"seattle seahawks":e("nfl","sea"),"tampa bay buccaneers":e("nfl","tb"),"tennessee titans":e("nfl","ten"),"washington commanders":e("nfl","wsh"),"leeds united":"https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg","nottingham forest":"https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg","anaheim ducks":e("nhl","ana"),"arizona coyotes":e("nhl","ari"),"boston bruins":e("nhl","bos"),"buffalo sabres":e("nhl","buf"),"calgary flames":e("nhl","cgy"),"carolina hurricanes":e("nhl","car"),"chicago blackhawks":e("nhl","chi"),"colorado avalanche":e("nhl","col"),"columbus blue jackets":e("nhl","cbj"),"dallas stars":e("nhl","dal"),"detroit red wings":e("nhl","det"),"edmonton oilers":e("nhl","edm"),"florida panthers":e("nhl","fla"),"los angeles kings":e("nhl","la"),"minnesota wild":e("nhl","min"),"montreal canadiens":e("nhl","mtl"),"montréal canadiens":e("nhl","mtl"),"nashville predators":e("nhl","nsh"),"new jersey devils":e("nhl","nj"),"new york islanders":e("nhl","nyi"),"new york rangers":e("nhl","nyr"),"ottawa senators":e("nhl","ott"),"philadelphia flyers":e("nhl","phi"),"pittsburgh penguins":e("nhl","pit"),"san jose sharks":e("nhl","sj"),"seattle kraken":e("nhl","sea"),"st louis blues":e("nhl","stl"),"tampa bay lightning":e("nhl","tb"),"toronto maple leafs":e("nhl","tor"),"utah hockey club":e("nhl","uta"),"vancouver canucks":e("nhl","van"),"vegas golden knights":e("nhl","vgk"),"washington capitals":e("nhl","wsh"),"winnipeg jets":e("nhl","wpg"),"atlanta dream":e("wnba","atl"),"chicago sky":e("wnba","chi"),"connecticut sun":e("wnba","conn"),"dallas wings":e("wnba","dal"),"indiana fever":e("wnba","ind"),"las vegas aces":e("wnba","lv"),"los angeles sparks":e("wnba","la"),"minnesota lynx":e("wnba","min"),"new york liberty":e("wnba","ny"),"phoenix mercury":e("wnba","phx"),"seattle storm":e("wnba","sea"),"washington mystics":e("wnba","wsh"),"atlanta united fc":e("mls","atl"),"atlanta united":e("mls","atl"),"austin fc":e("mls","atx"),"cf montreal":e("mls","mtl"),"cf montréal":e("mls","mtl"),"charlotte fc":e("mls","clt"),"chicago fire fc":e("mls","chi"),"colorado rapids":e("mls","col"),"columbus crew":e("mls","clb"),"d.c. united":e("mls","dc"),"dc united":e("mls","dc"),"fc cincinnati":e("mls","cin"),"fc dallas":e("mls","dal"),"houston dynamo fc":e("mls","hou"),"inter miami cf":e("mls","mia"),"inter miami":e("mls","mia"),"la galaxy":e("mls","la"),"los angeles fc":e("mls","lafc"),lafc:e("mls","lafc"),"minnesota united fc":e("mls","min"),"nashville sc":e("mls","nsh"),"new england revolution":e("mls","ne"),"new york city fc":e("mls","nyc"),"new york red bulls":e("mls","rbny"),"orlando city sc":e("mls","orl"),"philadelphia union":e("mls","phi"),"portland timbers":e("mls","por"),"real salt lake":e("mls","rsl"),"san diego fc":e("mls","sd"),"san jose earthquakes":e("mls","sj"),"seattle sounders fc":e("mls","sea"),"sporting kansas city":e("mls","kc"),"st louis city sc":e("mls","stl"),"toronto fc":e("mls","tor"),"vancouver whitecaps fc":e("mls","van")},A=(o="")=>String(o||"").toLowerCase().replace(/[.'-]/g," ").replace(/\s+/g," ").trim(),X=o=>{let a=0;for(let t=0;t<o.length;t+=1)a=o.charCodeAt(t)+((a<<5)-a);return Math.abs(a)},Y=(o="")=>{const a=String(o).trim().split(/\s+/).filter(Boolean);return a.length===0?"?":a.length===1?a[0].slice(0,2).toUpperCase():`${a[0][0]||""}${a[1][0]||""}`.toUpperCase()},k=(o="")=>{const a=String(o||"Team"),b=X(a.toLowerCase())%360,d=(b+36)%360,p=Y(a),g=`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${b}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${d}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${p}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(g.trim())}`},re=(o="")=>{const a=A(o);if(!a)return null;if(L[a])return L[a];const t=P(a);return t&&t.url?t.url:null},I="betterdr:teamLogos:v2",Z=1440*60*1e3,Q="https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=",U=/^(?:\d+\.\s*|FC\s+|AC\s+|AS\s+|SC\s+|CF\s+|UD\s+|CD\s+|SL\s+|SV\s+|VfB\s+|VfL\s+|TSG\s+|TSV\s+|RB\s+|FK\s+|KS\s+|PSV\s+|SK\s+|OGC\s+|AJ\s+|FK\s+|NK\s+|HJK\s+)/i,W=/\s+(?:FC|AC|CF|FK|SC|F\.C\.|United|City|Town|Rovers|Athletic|Football\s+Club|\d+)$/i,ee=o=>{const a=String(o||"").trim();if(!a)return[];const t=new Set;t.add(a),t.add(a.replace(/-/g," ").replace(/\s+/g," ").trim()),t.add(a.replace(/\s+/g,"-")),/\bAl[- ]/i.test(a)&&(t.add(a.replace(/\bAl\s+/gi,"Al-")),t.add(a.replace(/\bAl-/gi,"Al "))),t.add(a.replace(/\bSaint\b/gi,"St")),t.add(a.replace(/\bSt\b\.?/gi,"Saint"));const b=a.replace(U,"").trim();b&&b!==a&&t.add(b);const d=a.replace(W,"").trim();d&&d!==a&&t.add(d);const p=d.replace(U,"").trim();p&&p!==a&&t.add(p);const g=a.split(/\s+/).filter(h=>h&&!/^\d+$/.test(h));return g.length>=2&&(t.add(g.slice(-2).join(" ")),t.add(g[g.length-1])),[...t].filter(h=>h&&h.length>=3)},_=new Map;let x=null;const D=()=>{if(x)return x;try{const o=typeof localStorage<"u"?localStorage.getItem(I):null;x=o?JSON.parse(o):{}}catch{x={}}return(typeof x!="object"||x===null)&&(x={}),x},ae=()=>{try{typeof localStorage<"u"&&localStorage.setItem(I,JSON.stringify(x||{}))}catch{}},P=o=>{const a=D(),t=a[o];return!t||typeof t.ts!="number"?null:Date.now()-t.ts>Z?(delete a[o],null):t},z=(o,a)=>{const t=D();t[o]={url:a||null,ts:Date.now()},ae()},se=async(o="")=>{const a=A(o);if(!a)return k(o);if(L[a])return L[a];const t=P(a);if(t)return t.url||k(o);if(_.has(a))return _.get(a);const b=(async()=>{try{const d=ee(o).slice(0,5);for(const p of d){const g=new AbortController,h=setTimeout(()=>g.abort(),5e3);let S=null;try{const w=await fetch(Q+encodeURIComponent(p),{signal:g.signal});if(clearTimeout(h),!w.ok)continue;S=await w.json()}catch{clearTimeout(h);continue}const C=Array.isArray(S?.teams)?S.teams:[];if(C.length===0)continue;const E=A(p),j=C.find(w=>{const v=A(w?.strTeam||"");return v===a||v===E})||C[0],T=j?.strBadge||j?.strTeamBadge||j?.strLogo||null;if(T)return z(a,T),T}return z(a,null),k(o)}catch{return z(a,null),k(o)}finally{_.delete(a)}})();return _.set(a,b),b},$="admin_scoreboard_matches_cache_v1",te=({onClose:o})=>{const[a,t]=y.useState([]),[b,d]=y.useState(!1),[p,g]=y.useState({}),[h,S]=y.useState({}),[C,E]=y.useState(!1),N=async(s,l,n)=>{let m;try{return await Promise.race([s,new Promise((i,c)=>{m=window.setTimeout(()=>c(new Error(`${n} timed out`)),l)})])}finally{m&&window.clearTimeout(m)}};y.useEffect(()=>{let s=!0,l=!1,n=!1;try{const u=localStorage.getItem($);if(u){const f=JSON.parse(u);Array.isArray(f)&&f.length>0&&(t(f),l=!0,n=!0)}}catch{}l||d(!0);const m=async()=>{const u=localStorage.getItem("token"),f=N(J(),5e3,"Loading matches"),K=u?N(q(u),5e3,"Loading admin matches"):Promise.resolve([]),[O,R]=await Promise.allSettled([f,K]),V=O.status==="fulfilled"&&Array.isArray(O.value)?O.value:[],F=R.status==="fulfilled"&&Array.isArray(R.value)?R.value:[];return F.length>0?F:V},i=async({silent:u=!1}={})=>{try{s&&!u&&!n&&d(!0);const f=await m();if(!s)return;if(f.length>0){t(f),n=!0,d(!1);try{localStorage.setItem($,JSON.stringify(f))}catch{}}else n||d(!1)}finally{s&&!n&&d(!1)}},c=window.setTimeout(()=>{s&&E(!0)},2e4);return i(),()=>{s=!1,window.clearTimeout(c)}},[]);const j=s=>{if(String(s?.status||"").toLowerCase()==="live")return!0;const n=String(s?.score?.event_status||"").toUpperCase();return n.includes("IN_PROGRESS")||n.includes("LIVE")},T=s=>{const l=String(s?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(l))return!0;if(s?.startTime){const n=new Date(s.startTime).getTime();if(!Number.isNaN(n))return n>Date.now()}return!1},w=y.useMemo(()=>{const s=Array.isArray(a)?a:[],l=s.filter(n=>j(n)||T(n));return l.length>0?l:s},[a]),v=y.useMemo(()=>{const s={};return w.forEach(l=>{const n=(l.sport||"Unknown").toUpperCase();s[n]||(s[n]=[]),s[n].push(l)}),s},[w]),B=w.length>0;y.useEffect(()=>{g(s=>{const l={...s};return Object.keys(v).forEach(n=>{typeof l[n]!="boolean"&&(l[n]=!1)}),l})},[v]),y.useEffect(()=>{let s=!0;return(async()=>{const n=new Set;w.forEach(c=>{c?.homeTeam&&n.add(String(c.homeTeam)),c?.awayTeam&&n.add(String(c.awayTeam))});const m=Array.from(n).filter(c=>!h[c]);if(m.length===0)return;const i={};await Promise.all(m.map(async c=>{try{const u=await se(c);u&&(i[c]=u)}catch{}})),s&&Object.keys(i).length>0&&S(c=>({...c,...i}))})(),()=>{s=!1}},[w,h]);const G=s=>s.status==="live"?r.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):s.startTime?new Date(s.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",M=(s,l)=>s.score?l==="home"?s.score.score_home??s.score.home_score??s.score.scoreHome??0:l==="away"?s.score.score_away??s.score.away_score??s.score.scoreAway??0:"":"",H=(s,l)=>r.jsxs("div",{className:"scoreboard-league",children:[r.jsxs("button",{type:"button",className:"league-header",onClick:()=>g(n=>({...n,[s]:!n[s]})),children:[r.jsx("span",{children:s}),r.jsx("i",{className:`fa-solid ${p[s]?"fa-chevron-down":"fa-chevron-up"}`})]}),!p[s]&&r.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(l.length/2)},(n,m)=>l.slice(m*2,m*2+2)).map((n,m)=>r.jsxs("div",{className:"scoreboard-game-row",children:[n.map((i,c)=>{const u=i?.broadcast||i?.tv||i?.score?.broadcast||"";return r.jsxs("div",{className:"scoreboard-game-cell",children:[r.jsxs("div",{className:"game-row",children:[r.jsx("span",{className:"game-time",children:G(i)}),r.jsx("span",{className:"game-network",children:u})]}),r.jsxs("div",{className:"game-team",children:[r.jsxs("div",{className:"game-team-main",children:[r.jsx("img",{src:h[i.homeTeam]||k(i.homeTeam),alt:i.homeTeam,className:"game-logo",onError:f=>{f.currentTarget.src=k(i.homeTeam)}}),r.jsx("span",{children:i.homeTeam})]}),r.jsx("span",{className:"game-score",children:M(i,"home")})]}),r.jsxs("div",{className:"game-team",children:[r.jsxs("div",{className:"game-team-main",children:[r.jsx("img",{src:h[i.awayTeam]||k(i.awayTeam),alt:i.awayTeam,className:"game-logo",onError:f=>{f.currentTarget.src=k(i.awayTeam)}}),r.jsx("span",{children:i.awayTeam})]}),r.jsx("span",{className:"game-score",children:M(i,"away")})]})]},i.id||`${m}-${c}`)}),n.length===1&&r.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${s}-${m}`))})]},s);return r.jsxs("div",{className:"scoreboard-overlay",children:[r.jsxs("div",{className:"scoreboard-header",children:[r.jsx("h2",{children:"Scoreboard"}),r.jsx("button",{type:"button",className:"close-btn",onClick:o,children:"Close"})]}),r.jsx("div",{className:"scoreboard-content",children:!B&&b?r.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(v).length===0?r.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(v).map(([s,l])=>H(s,l))}),r.jsx("style",{children:`
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
            `})]})},le=Object.freeze(Object.defineProperty({__proto__:null,default:te},Symbol.toStringTag,{value:"Module"}));export{te as S,le as a,k as c,se as f,re as l};
