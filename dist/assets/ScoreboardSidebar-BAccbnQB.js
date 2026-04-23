import{r as b,j as n}from"./vendor-react-C9ePv8QP.js";import{b5 as W,j as J}from"./app-api-8KN3Plj_.js";const e=(s,a)=>`https://a.espncdn.com/i/teamlogos/${s}/500/${a}.png`,F={"atlanta hawks":e("nba","atl"),"boston celtics":e("nba","bos"),"brooklyn nets":e("nba","bkn"),"charlotte hornets":e("nba","cha"),"chicago bulls":e("nba","chi"),"cleveland cavaliers":e("nba","cle"),"dallas mavericks":e("nba","dal"),"denver nuggets":e("nba","den"),"detroit pistons":e("nba","det"),"golden state warriors":e("nba","gs"),"houston rockets":e("nba","hou"),"indiana pacers":e("nba","ind"),"la clippers":e("nba","lac"),"los angeles clippers":e("nba","lac"),"los angeles lakers":e("nba","lal"),"memphis grizzlies":e("nba","mem"),"miami heat":e("nba","mia"),"milwaukee bucks":e("nba","mil"),"minnesota timberwolves":e("nba","min"),"new orleans pelicans":e("nba","no"),"new york knicks":e("nba","ny"),"oklahoma city thunder":e("nba","okc"),"orlando magic":e("nba","orl"),"philadelphia 76ers":e("nba","phi"),"phoenix suns":e("nba","phx"),"portland trail blazers":e("nba","por"),"sacramento kings":e("nba","sac"),"san antonio spurs":e("nba","sa"),"toronto raptors":e("nba","tor"),"utah jazz":e("nba","utah"),"washington wizards":e("nba","wsh"),"arizona diamondbacks":e("mlb","ari"),"atlanta braves":e("mlb","atl"),"baltimore orioles":e("mlb","bal"),"boston red sox":e("mlb","bos"),"chicago cubs":e("mlb","chc"),"chicago white sox":e("mlb","chw"),"cincinnati reds":e("mlb","cin"),"cleveland guardians":e("mlb","cle"),"colorado rockies":e("mlb","col"),"detroit tigers":e("mlb","det"),"houston astros":e("mlb","hou"),"kansas city royals":e("mlb","kc"),"los angeles angels":e("mlb","laa"),"los angeles dodgers":e("mlb","lad"),"miami marlins":e("mlb","mia"),"milwaukee brewers":e("mlb","mil"),"minnesota twins":e("mlb","min"),"new york mets":e("mlb","nym"),"new york yankees":e("mlb","nyy"),"oakland athletics":e("mlb","oak"),"philadelphia phillies":e("mlb","phi"),"pittsburgh pirates":e("mlb","pit"),"san diego padres":e("mlb","sd"),"san francisco giants":e("mlb","sf"),"seattle mariners":e("mlb","sea"),"st louis cardinals":e("mlb","stl"),"tampa bay rays":e("mlb","tb"),"texas rangers":e("mlb","tex"),"toronto blue jays":e("mlb","tor"),"washington nationals":e("mlb","wsh"),"arizona cardinals":e("nfl","ari"),"atlanta falcons":e("nfl","atl"),"baltimore ravens":e("nfl","bal"),"buffalo bills":e("nfl","buf"),"carolina panthers":e("nfl","car"),"chicago bears":e("nfl","chi"),"cincinnati bengals":e("nfl","cin"),"cleveland browns":e("nfl","cle"),"dallas cowboys":e("nfl","dal"),"denver broncos":e("nfl","den"),"detroit lions":e("nfl","det"),"green bay packers":e("nfl","gb"),"houston texans":e("nfl","hou"),"indianapolis colts":e("nfl","ind"),"jacksonville jaguars":e("nfl","jax"),"kansas city chiefs":e("nfl","kc"),"las vegas raiders":e("nfl","lv"),"los angeles chargers":e("nfl","lac"),"los angeles rams":e("nfl","lar"),"miami dolphins":e("nfl","mia"),"minnesota vikings":e("nfl","min"),"new england patriots":e("nfl","ne"),"new orleans saints":e("nfl","no"),"new york giants":e("nfl","nyg"),"new york jets":e("nfl","nyj"),"philadelphia eagles":e("nfl","phi"),"pittsburgh steelers":e("nfl","pit"),"san francisco 49ers":e("nfl","sf"),"seattle seahawks":e("nfl","sea"),"tampa bay buccaneers":e("nfl","tb"),"tennessee titans":e("nfl","ten"),"washington commanders":e("nfl","wsh"),arsenal:"https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg","aston villa":"https://upload.wikimedia.org/wikipedia/en/f/f9/Aston_Villa_FC_crest_%282016%29.svg","afc bournemouth":"https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg",bournemouth:"https://upload.wikimedia.org/wikipedia/en/e/e5/AFC_Bournemouth_%282013%29.svg",brentford:"https://upload.wikimedia.org/wikipedia/en/2/2a/Brentford_FC_crest.svg","brighton and hove albion":"https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg",brighton:"https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg",chelsea:"https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg","crystal palace":"https://upload.wikimedia.org/wikipedia/en/0/0c/Crystal_Palace_FC_logo_%282022%29.svg",everton:"https://upload.wikimedia.org/wikipedia/en/7/7c/Everton_FC_logo.svg",fulham:"https://upload.wikimedia.org/wikipedia/en/e/eb/Fulham_FC_%28shield%29.svg","ipswich town":"https://upload.wikimedia.org/wikipedia/en/4/43/Ipswich_Town.svg","leeds united":"https://upload.wikimedia.org/wikipedia/en/5/54/Leeds_United_F.C._logo.svg","leicester city":"https://upload.wikimedia.org/wikipedia/en/2/2d/Leicester_City_crest.svg",liverpool:"https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg","manchester city":"https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg","manchester united":"https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg","newcastle united":"https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg","nottingham forest":"https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg",southampton:"https://upload.wikimedia.org/wikipedia/en/c/c9/FC_Southampton.svg","tottenham hotspur":"https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg",tottenham:"https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg","west ham united":"https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg","west ham":"https://upload.wikimedia.org/wikipedia/en/c/c2/West_Ham_United_FC_logo.svg","wolverhampton wanderers":"https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg",wolves:"https://upload.wikimedia.org/wikipedia/en/f/fc/Wolverhampton_Wanderers.svg","real madrid":"https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg","fc barcelona":"https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg",barcelona:"https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg","atletico madrid":"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg","atlético madrid":"https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg","athletic bilbao":"https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_Bilbao_logo.svg","real sociedad":"https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg",villarreal:"https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg","real betis":"https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg",sevilla:"https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg",valencia:"https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg",juventus:"https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg","ac milan":"https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg","inter milan":"https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",internazionale:"https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg",napoli:"https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Neapel.svg",roma:"https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg","as roma":"https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg",lazio:"https://upload.wikimedia.org/wikipedia/en/c/ce/S.S._Lazio_badge.svg",atalanta:"https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC.svg",fiorentina:"https://upload.wikimedia.org/wikipedia/en/f/fe/Logo_of_ACF_Fiorentina.svg",bologna:"https://upload.wikimedia.org/wikipedia/en/5/54/Bologna_F.C._1909_logo.svg","bayern munich":"https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg","fc bayern munich":"https://upload.wikimedia.org/wikipedia/commons/1/1b/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg","borussia dortmund":"https://upload.wikimedia.org/wikipedia/commons/6/67/Borussia_Dortmund_logo.svg","rb leipzig":"https://upload.wikimedia.org/wikipedia/en/0/04/RB_Leipzig_2014_logo.svg","bayer leverkusen":"https://upload.wikimedia.org/wikipedia/en/5/59/Bayer_04_Leverkusen_logo.svg","vfb stuttgart":"https://upload.wikimedia.org/wikipedia/commons/e/eb/VfB_Stuttgart_1893_Logo.svg","eintracht frankfurt":"https://upload.wikimedia.org/wikipedia/commons/0/04/Eintracht_Frankfurt_Logo.svg","vfl wolfsburg":"https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg",wolfsburg:"https://upload.wikimedia.org/wikipedia/commons/f/f3/Logo-VfL-Wolfsburg.svg","union berlin":"https://upload.wikimedia.org/wikipedia/commons/4/44/1._FC_Union_Berlin_Logo.svg","sc freiburg":"https://upload.wikimedia.org/wikipedia/commons/f/ff/SC_Freiburg_logo.svg",freiburg:"https://upload.wikimedia.org/wikipedia/commons/f/ff/SC_Freiburg_logo.svg","werder bremen":"https://upload.wikimedia.org/wikipedia/commons/b/be/SV-Werder-Bremen-Logo.svg","fc heidenheim":"https://upload.wikimedia.org/wikipedia/commons/8/82/1._FC_Heidenheim_1846.svg","1. fc heidenheim":"https://upload.wikimedia.org/wikipedia/commons/8/82/1._FC_Heidenheim_1846.svg","paris saint-germain":"https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg",psg:"https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg","as monaco":"https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg",monaco:"https://upload.wikimedia.org/wikipedia/en/b/ba/AS_Monaco_FC.svg","olympique de marseille":"https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg",marseille:"https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg","olympique lyonnais":"https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg",lyon:"https://upload.wikimedia.org/wikipedia/en/c/c6/Olympique_Lyonnais.svg",lille:"https://upload.wikimedia.org/wikipedia/en/3/3f/LOSC_Lille_%28logo%29.svg","stade rennais":"https://upload.wikimedia.org/wikipedia/en/9/95/Stade_Rennais_FC.svg",rennes:"https://upload.wikimedia.org/wikipedia/en/9/95/Stade_Rennais_FC.svg","ogc nice":"https://upload.wikimedia.org/wikipedia/en/d/da/OGCNice.svg",nice:"https://upload.wikimedia.org/wikipedia/en/d/da/OGCNice.svg","rc strasbourg":"https://upload.wikimedia.org/wikipedia/en/f/f6/Racing_Club_de_Strasbourg_logo.svg",strasbourg:"https://upload.wikimedia.org/wikipedia/en/f/f6/Racing_Club_de_Strasbourg_logo.svg","rc lens":"https://upload.wikimedia.org/wikipedia/en/4/40/Racing_Club_de_Lens_logo.svg",lens:"https://upload.wikimedia.org/wikipedia/en/4/40/Racing_Club_de_Lens_logo.svg","stade brestois":"https://upload.wikimedia.org/wikipedia/en/d/d4/Stade_Brestois_29.svg",brest:"https://upload.wikimedia.org/wikipedia/en/d/d4/Stade_Brestois_29.svg","anaheim ducks":e("nhl","ana"),"arizona coyotes":e("nhl","ari"),"boston bruins":e("nhl","bos"),"buffalo sabres":e("nhl","buf"),"calgary flames":e("nhl","cgy"),"carolina hurricanes":e("nhl","car"),"chicago blackhawks":e("nhl","chi"),"colorado avalanche":e("nhl","col"),"columbus blue jackets":e("nhl","cbj"),"dallas stars":e("nhl","dal"),"detroit red wings":e("nhl","det"),"edmonton oilers":e("nhl","edm"),"florida panthers":e("nhl","fla"),"los angeles kings":e("nhl","la"),"minnesota wild":e("nhl","min"),"montreal canadiens":e("nhl","mtl"),"montréal canadiens":e("nhl","mtl"),"nashville predators":e("nhl","nsh"),"new jersey devils":e("nhl","nj"),"new york islanders":e("nhl","nyi"),"new york rangers":e("nhl","nyr"),"ottawa senators":e("nhl","ott"),"philadelphia flyers":e("nhl","phi"),"pittsburgh penguins":e("nhl","pit"),"san jose sharks":e("nhl","sj"),"seattle kraken":e("nhl","sea"),"st louis blues":e("nhl","stl"),"tampa bay lightning":e("nhl","tb"),"toronto maple leafs":e("nhl","tor"),"utah hockey club":e("nhl","uta"),"vancouver canucks":e("nhl","van"),"vegas golden knights":e("nhl","vgk"),"washington capitals":e("nhl","wsh"),"winnipeg jets":e("nhl","wpg"),"atlanta dream":e("wnba","atl"),"chicago sky":e("wnba","chi"),"connecticut sun":e("wnba","conn"),"dallas wings":e("wnba","dal"),"indiana fever":e("wnba","ind"),"las vegas aces":e("wnba","lv"),"los angeles sparks":e("wnba","la"),"minnesota lynx":e("wnba","min"),"new york liberty":e("wnba","ny"),"phoenix mercury":e("wnba","phx"),"seattle storm":e("wnba","sea"),"washington mystics":e("wnba","wsh"),"atlanta united fc":e("mls","atl"),"atlanta united":e("mls","atl"),"austin fc":e("mls","atx"),"cf montreal":e("mls","mtl"),"cf montréal":e("mls","mtl"),"charlotte fc":e("mls","clt"),"chicago fire fc":e("mls","chi"),"colorado rapids":e("mls","col"),"columbus crew":e("mls","clb"),"d.c. united":e("mls","dc"),"dc united":e("mls","dc"),"fc cincinnati":e("mls","cin"),"fc dallas":e("mls","dal"),"houston dynamo fc":e("mls","hou"),"inter miami cf":e("mls","mia"),"inter miami":e("mls","mia"),"la galaxy":e("mls","la"),"los angeles fc":e("mls","lafc"),lafc:e("mls","lafc"),"minnesota united fc":e("mls","min"),"nashville sc":e("mls","nsh"),"new england revolution":e("mls","ne"),"new york city fc":e("mls","nyc"),"new york red bulls":e("mls","rbny"),"orlando city sc":e("mls","orl"),"philadelphia union":e("mls","phi"),"portland timbers":e("mls","por"),"real salt lake":e("mls","rsl"),"san diego fc":e("mls","sd"),"san jose earthquakes":e("mls","sj"),"seattle sounders fc":e("mls","sea"),"sporting kansas city":e("mls","kc"),"st louis city sc":e("mls","stl"),"toronto fc":e("mls","tor"),"vancouver whitecaps fc":e("mls","van")},T=(s="")=>String(s||"").toLowerCase().replace(/[.'-]/g," ").replace(/\s+/g," ").trim(),Y=s=>{let a=0;for(let t=0;t<s.length;t+=1)a=s.charCodeAt(t)+((a<<5)-a);return Math.abs(a)},X=(s="")=>{const a=String(s).trim().split(/\s+/).filter(Boolean);return a.length===0?"?":a.length===1?a[0].slice(0,2).toUpperCase():`${a[0][0]||""}${a[1][0]||""}`.toUpperCase()},x=(s="")=>{const a=String(s||"Team"),u=Y(a.toLowerCase())%360,p=(u+36)%360,g=X(a),d=`
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${u}, 78%, 46%)" />
      <stop offset="100%" stop-color="hsl(${p}, 78%, 36%)" />
    </linearGradient>
  </defs>
  <circle cx="40" cy="40" r="38" fill="url(#g)" />
  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,.32)" stroke-width="2" />
  <text x="40" y="48" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#fff">${g}</text>
</svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(d.trim())}`},re=(s="")=>{const a=T(s);if(!a)return null;if(F[a])return F[a];const t=N(a);return t&&t.url?t.url:null},H="betterdr:teamLogos:v3",Z=1440*60*1e3,Q="https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=",ee="https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=",P=/^(?:\d+\.\s*|FC\s+|AC\s+|AS\s+|SC\s+|CF\s+|UD\s+|CD\s+|SL\s+|SV\s+|VfB\s+|VfL\s+|TSG\s+|TSV\s+|RB\s+|FK\s+|KS\s+|PSV\s+|SK\s+|OGC\s+|AJ\s+|FK\s+|NK\s+|HJK\s+)/i,ae=/\s+(?:FC|AC|CF|FK|SC|F\.C\.|United|City|Town|Rovers|Athletic|Football\s+Club|\d+)$/i,ie=s=>{const a=String(s||"").trim();if(!a)return[];const t=new Set;t.add(a),t.add(a.replace(/-/g," ").replace(/\s+/g," ").trim()),t.add(a.replace(/\s+/g,"-")),/\bAl[- ]/i.test(a)&&(t.add(a.replace(/\bAl\s+/gi,"Al-")),t.add(a.replace(/\bAl-/gi,"Al "))),t.add(a.replace(/\bSaint\b/gi,"St")),t.add(a.replace(/\bSt\b\.?/gi,"Saint"));const u=a.replace(P,"").trim();u&&u!==a&&t.add(u);const p=a.replace(ae,"").trim();p&&p!==a&&t.add(p);const g=p.replace(P,"").trim();g&&g!==a&&t.add(g);const d=a.split(/\s+/).filter(c=>c&&!/^\d+$/.test(c));return d.length>=2&&(t.add(d.slice(-2).join(" ")),t.add(d[d.length-1])),[...t].filter(c=>c&&c.length>=3)},R=new Map;let v=null;const D=()=>{if(v)return v;try{const s=typeof localStorage<"u"?localStorage.getItem(H):null;v=s?JSON.parse(s):{}}catch{v={}}return(typeof v!="object"||v===null)&&(v={}),v},te=()=>{try{typeof localStorage<"u"&&localStorage.setItem(H,JSON.stringify(v||{}))}catch{}},N=s=>{const a=D(),t=a[s];return!t||typeof t.ts!="number"?null:Date.now()-t.ts>Z?(delete a[s],null):t},M=(s,a)=>{const t=D();t[s]={url:a||null,ts:Date.now()},te()},le=(s=[])=>{if(!Array.isArray(s)||s.length===0)return;const a=[],t=new Set;for(const d of s){const c=T(d||"");!c||t.has(c)||(t.add(c),!F[c]&&(N(c)||a.push(d)))}if(a.length===0)return;const u=6;let p=0;const g=async()=>{for(;p<a.length;){const d=p++;try{await $(a[d])}catch{}}};for(let d=0;d<Math.min(u,a.length);d++)g()},$=async(s="")=>{const a=T(s);if(!a)return x(s);if(F[a])return F[a];const t=N(a);if(t)return t.url||x(s);if(R.has(a))return R.get(a);const u=async g=>{const d=new AbortController,c=setTimeout(()=>d.abort(),5e3);try{const y=await fetch(g,{signal:d.signal});return clearTimeout(c),y.ok?await y.json():null}catch{return clearTimeout(c),null}},p=(async()=>{try{const g=ie(s).slice(0,5);for(const y of g){const C=await u(Q+encodeURIComponent(y)),k=Array.isArray(C?.teams)?C.teams:[];if(k.length===0)continue;const S=T(y),A=k.find(j=>{const L=T(j?.strTeam||"");return L===a||L===S})||k[0],_=A?.strBadge||A?.strTeamBadge||A?.strLogo||null;if(_)return M(a,_),_}const d=await u(ee+encodeURIComponent(s)),c=Array.isArray(d?.player)?d.player:[];if(c.length>0){const C=c.find(S=>T(S?.strPlayer||"")===a)||c[0],k=C?.strCutout||C?.strThumb||C?.strRender||null;if(k)return M(a,k),k}return M(a,null),x(s)}catch{return M(a,null),x(s)}finally{R.delete(a)}})();return R.set(a,p),p},I="admin_scoreboard_matches_cache_v1",se=({onClose:s})=>{const[a,t]=b.useState([]),[u,p]=b.useState(!1),[g,d]=b.useState({}),[c,y]=b.useState({}),[C,k]=b.useState(!1),S=async(i,r,o)=>{let h;try{return await Promise.race([i,new Promise((l,m)=>{h=window.setTimeout(()=>m(new Error(`${o} timed out`)),r)})])}finally{h&&window.clearTimeout(h)}};b.useEffect(()=>{let i=!0,r=!1,o=!1;try{const f=localStorage.getItem(I);if(f){const w=JSON.parse(f);Array.isArray(w)&&w.length>0&&(t(w),r=!0,o=!0)}}catch{}r||p(!0);const h=async()=>{const f=localStorage.getItem("token"),w=S(W(),5e3,"Loading matches"),q=f?S(J(f),5e3,"Loading admin matches"):Promise.resolve([]),[E,B]=await Promise.allSettled([w,q]),K=E.status==="fulfilled"&&Array.isArray(E.value)?E.value:[],U=B.status==="fulfilled"&&Array.isArray(B.value)?B.value:[];return U.length>0?U:K},l=async({silent:f=!1}={})=>{try{i&&!f&&!o&&p(!0);const w=await h();if(!i)return;if(w.length>0){t(w),o=!0,p(!1);try{localStorage.setItem(I,JSON.stringify(w))}catch{}}else o||p(!1)}finally{i&&!o&&p(!1)}},m=window.setTimeout(()=>{i&&k(!0)},2e4);return l(),()=>{i=!1,window.clearTimeout(m)}},[]);const O=i=>{if(String(i?.status||"").toLowerCase()==="live")return!0;const o=String(i?.score?.event_status||"").toUpperCase();return o.includes("IN_PROGRESS")||o.includes("LIVE")},A=i=>{const r=String(i?.status||"").toLowerCase();if(["scheduled","pre-game","pregame","upcoming","pending"].includes(r))return!0;if(i?.startTime){const o=new Date(i.startTime).getTime();if(!Number.isNaN(o))return o>Date.now()}return!1},_=b.useMemo(()=>{const i=Array.isArray(a)?a:[],r=i.filter(o=>O(o)||A(o));return r.length>0?r:i},[a]),j=b.useMemo(()=>{const i={};return _.forEach(r=>{const o=(r.sport||"Unknown").toUpperCase();i[o]||(i[o]=[]),i[o].push(r)}),i},[_]),L=_.length>0;b.useEffect(()=>{d(i=>{const r={...i};return Object.keys(j).forEach(o=>{typeof r[o]!="boolean"&&(r[o]=!1)}),r})},[j]),b.useEffect(()=>{let i=!0;return(async()=>{const o=new Set;_.forEach(m=>{m?.homeTeam&&o.add(String(m.homeTeam)),m?.awayTeam&&o.add(String(m.awayTeam))});const h=Array.from(o).filter(m=>!c[m]);if(h.length===0)return;const l={};await Promise.all(h.map(async m=>{try{const f=await $(m);f&&(l[m]=f)}catch{}})),i&&Object.keys(l).length>0&&y(m=>({...m,...l}))})(),()=>{i=!1}},[_,c]);const V=i=>i.status==="live"?n.jsx("span",{className:"text-danger fw-bold",children:"LIVE"}):i.startTime?new Date(i.startTime).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZoneName:"short"}):"TBD",z=(i,r)=>i.score?r==="home"?i.score.score_home??i.score.home_score??i.score.scoreHome??0:r==="away"?i.score.score_away??i.score.away_score??i.score.scoreAway??0:"":"",G=(i,r)=>n.jsxs("div",{className:"scoreboard-league",children:[n.jsxs("button",{type:"button",className:"league-header",onClick:()=>d(o=>({...o,[i]:!o[i]})),children:[n.jsx("span",{children:i}),n.jsx("i",{className:`fa-solid ${g[i]?"fa-chevron-down":"fa-chevron-up"}`})]}),!g[i]&&n.jsx("div",{className:"league-games",children:Array.from({length:Math.ceil(r.length/2)},(o,h)=>r.slice(h*2,h*2+2)).map((o,h)=>n.jsxs("div",{className:"scoreboard-game-row",children:[o.map((l,m)=>{const f=l?.broadcast||l?.tv||l?.score?.broadcast||"";return n.jsxs("div",{className:"scoreboard-game-cell",children:[n.jsxs("div",{className:"game-row",children:[n.jsx("span",{className:"game-time",children:V(l)}),n.jsx("span",{className:"game-network",children:f})]}),n.jsxs("div",{className:"game-team",children:[n.jsxs("div",{className:"game-team-main",children:[n.jsx("img",{src:c[l.homeTeam]||x(l.homeTeam),alt:l.homeTeam,className:"game-logo",onError:w=>{w.currentTarget.src=x(l.homeTeam)}}),n.jsx("span",{children:l.homeTeam})]}),n.jsx("span",{className:"game-score",children:z(l,"home")})]}),n.jsxs("div",{className:"game-team",children:[n.jsxs("div",{className:"game-team-main",children:[n.jsx("img",{src:c[l.awayTeam]||x(l.awayTeam),alt:l.awayTeam,className:"game-logo",onError:w=>{w.currentTarget.src=x(l.awayTeam)}}),n.jsx("span",{children:l.awayTeam})]}),n.jsx("span",{className:"game-score",children:z(l,"away")})]})]},l.id||`${h}-${m}`)}),o.length===1&&n.jsx("div",{className:"scoreboard-game-cell ghost-cell"})]},`${i}-${h}`))})]},i);return n.jsxs("div",{className:"scoreboard-overlay",children:[n.jsxs("div",{className:"scoreboard-header",children:[n.jsx("h2",{children:"Scoreboard"}),n.jsx("button",{type:"button",className:"close-btn",onClick:s,children:"Close"})]}),n.jsx("div",{className:"scoreboard-content",children:!L&&u?n.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"Loading scoreboard..."}):Object.keys(j).length===0?n.jsx("div",{style:{padding:"20px",textAlign:"center",color:"#666"},children:"No games found right now."}):Object.entries(j).map(([i,r])=>G(i,r))}),n.jsx("style",{children:`
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
            `})]})},de=Object.freeze(Object.defineProperty({__proto__:null,default:se},Symbol.toStringTag,{value:"Module"}));export{se as S,de as a,x as c,$ as f,re as l,le as p};
