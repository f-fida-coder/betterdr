import{r as a,R as Os,j as e,a as Or}from"./vendor-react-C9ePv8QP.js";import{g as la,a as Za,b as Ur,c as Wr,d as es,e as zr,f as Vr,h as Hr,r as Yr,i as Gr,m as qr,j as ts,k as Fn,u as $n,l as Qr,n as Jr,o as Kr,p as Zr,q as Pa,s as Qt,t as ra,v as $t,w as Bt,x as Rt,y as gs,z as Xr,A as ei,B as fs,C as pa,D as ti,E as La,F as _n,G as ai,H as si,I as Ls,J as Ds,K as ni,L as ri,M as ii,N as li,O as oi,P as ci,Q as di,R as ui,S as mi,T as pi,U as hi,V as Rn,W as xi,X as xn,Y as gi,Z as On,_ as fi,$ as bi,a0 as ji,a1 as yi,a2 as vi,a3 as Ni,a4 as wi,a5 as Si,a6 as ki,a7 as ha,a8 as Un,a9 as Wn,aa as zn,ab as Ci,ac as Ai,ad as Pi,ae as Li,af as Di,ag as Ti,ah as Mi,ai as Bi,aj as Ii,ak as Ei,al as Fi,am as $i,an as _i,ao as Ri,ap as Oi,aq as Ui,ar as Wi,as as zi,at as Vi,au as Hi,av as Yi,aw as Gi,ax as qi,ay as Qi,az as Ji,aA as Vn,aB as Ki,aC as bs,aD as Zi,aE as Xi,aF as el,aG as tl,aH as Ya,aI as al}from"./app-api-D1TbZbXI.js";const Hn={dashboard:"dashboard","weekly-figures":"weeklyFigures",pending:"pending",messaging:"messaging","game-admin":"gameAdmin","casino-bets":"gameAdmin","customer-admin":"customerAdmin","agent-manager":"agentManager",cashier:"cashier","add-customer":"addCustomer","third-party-limits":"thirdPartyLimits",props:"props","agent-performance":"agentPerformance",analysis:"analysis","ip-tracker":"ipTracker","transaction-history":"transactionsHistory","transactions-history":"transactionsHistory","deleted-wagers":"deletedWagers","games-events":"gamesEvents","sportsbook-links":"sportsbookLinks","bet-ticker":"betTicker",ticketwriter:"ticketwriter",scores:"scores","master-agent-admin":"masterAgentAdmin",billing:"billing",settings:"settings",monitor:"monitor",rules:"rules",feedback:"feedback",faq:"faq","user-manual":"userManual",profile:"profile"},Yn=t=>t==="admin"||t==="master_agent"||t==="super_agent",_o=(t,r,o)=>{if(Yn(t))return!0;const m=Hn[o];if(!m)return!0;const p=r?.views?.[m];return p===!1?!1:p===!0?!0:!(m==="transactionsHistory"&&r?.views?.collections===!1)},Ro=(t,r)=>Yn(t)?!0:r?.ipTracker?.manage!==!1;function Oo({onClose:t,onGo:r,initialQuery:o="",onRestoreBaseContext:m,canRestoreBaseContext:p=!1,baseContextLabel:x="Admin"}){const S=new Set(["admin","agent","master_agent","super_agent"]),L=M=>String(M||"").trim().toLowerCase(),j=M=>{const Z=L(M?.role);return Z==="master_agent"?"M":Z==="super_agent"?"S":Z==="agent"?"A":Z==="admin"?"ADMIN":String(M?.role||"").replace(/_/g," ").toUpperCase()||"ACCOUNT"},U=M=>L(M?.role).replace(/_/g,"-")||"account",g=M=>{const Z=L(M?.role);return Z==="admin"||Z==="master_agent"||Z==="super_agent"},w=M=>{const Z=String(M?.username||"").toLowerCase(),ae=L(M?.role).replace(/_/g," "),re=ae.replace(/\s+/g,""),Re=String(M?.nodeType||"").toLowerCase();return`${Z} ${ae} ${re} ${Re}`.trim()},u=(M,Z)=>{const he=String(Z||"").trim().toLowerCase();return he?w(M).includes(he):!0},d=M=>{const Z=String(M?.nodeType||"").toLowerCase();return Z==="agent"?!0:Z==="player"?!1:S.has(String(M?.role||"").toLowerCase())},k=M=>String(M||"").trim(),Q=(M,Z)=>{const he=k(Z);if(!he||!M)return[];const ae=k(M.id);if(ae===he)return[ae];const re=Array.isArray(M.children)?M.children:[];for(const Re of re){const C=Q(Re,he);if(C.length>0)return[ae,...C]}return[]},[B,$]=a.useState(!0),[v,b]=a.useState(null),[R,n]=a.useState(""),[I,D]=a.useState(new Set),[l,Y]=a.useState(null),[pe,G]=a.useState(null);a.useEffect(()=>{(async()=>{try{$(!0);const Z=localStorage.getItem("token");if(!Z){Y("Please login to load tree"),b(null),G(null);return}const he=sessionStorage.getItem("impersonationBaseToken"),ae=!!(p&&he&&he!==Z),re=await la(Z);G(re||null);let Re;try{Re=await Za(ae?he:Z)}catch(C){if(!ae)throw C;Re=await Za(Z)}if(b(Re),Re?.root){const C=new Set([Re.root.id]),ne={...Re.root,children:Re.tree||[]};Q(ne,re?.id).forEach(W=>C.add(W)),D(C)}else D(new Set);Y(null)}catch(Z){console.error("Failed to fetch agent tree:",Z),Y("Failed to load tree")}finally{$(!1)}})()},[]),a.useEffect(()=>{n(o||"")},[o]),a.useEffect(()=>{const M=Z=>{Z.key==="Escape"&&t?.()};return window.addEventListener("keydown",M),()=>window.removeEventListener("keydown",M)},[t]);const N=M=>{const Z=new Set(I);Z.has(M)?Z.delete(M):Z.add(M),D(Z)},ee=(M,Z)=>{const he=String(Z||"").trim().toLowerCase();return!he||d(M)&&u(M,he)?!0:(M.children||[]).some(re=>ee(re,he))},f=k(pe?.id),O=k(v?.root?.id),H=!!(p&&f&&O&&f!==O),E=(v?.tree||[]).filter(M=>d(M)).length>0;Os.useMemo(()=>{const M=[],Z=he=>{(he||[]).forEach(ae=>{M.push(ae),Z(ae.children)})};return Z(v?.tree||[]),M},[v]);const ie=!!v?.root&&g(v.root),Pe=I.has(v?.root?.id),z=(M,Z=0)=>{if(!d(M))return null;const ae=k(M.id),re=I.has(ae),Re=(M.children||[]).filter(ke=>d(ke)),ne=Re.length>0&&g(M),i=M.isDead||M.username?.toUpperCase()==="DEAD",W=R.trim().toLowerCase(),oe=j(M),ge=U(M);return W&&!ee(M,W)?null:e.jsxs("div",{className:`tree-node-wrapper depth-${Z}`,children:[e.jsxs("div",{className:`tree-node ${i?"dead-node":""}`,children:[e.jsxs("div",{className:"node-content",onClick:()=>ne&&N(ae),children:[ne?e.jsx("span",{className:"node-toggle",children:re?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:(M.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${ge}`,children:oe}),M.agentPercent!=null&&e.jsxs("span",{className:"node-pct-badge",children:[M.agentPercent,"%"]}),i&&e.jsx("span",{className:"dead-tag",children:"DEAD"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>r(ae,M.role),children:"Go"})]}),ne&&(re||R)&&e.jsx("div",{className:"node-children",children:Re.map(ke=>z(ke,Z+1))})]},ae)};return e.jsx("div",{className:"agent-tree-sidebar-wrap",children:e.jsxs("aside",{className:"agent-tree-container agent-tree-sidebar glass-effect",children:[e.jsxs("div",{className:"tree-header",children:[e.jsx("h3",{children:"Account Tree"}),e.jsx("button",{className:"close-x",onClick:t,children:"✕"})]}),e.jsx("div",{className:"tree-search",children:e.jsxs("div",{className:"search-pill",children:[e.jsx("span",{className:"pill-label",children:"Accounts"}),e.jsx("input",{type:"text",placeholder:"Search admin, master, or agent...",value:R,style:{textTransform:"uppercase"},onChange:M=>n(M.target.value.toUpperCase())})]})}),e.jsx("div",{className:"tree-scroll-area",children:B?e.jsx("div",{className:"tree-loading",children:"Loading Tree..."}):l?e.jsx("div",{className:"tree-error",children:l}):v?e.jsxs("div",{className:"tree-root",children:[(v.readonlyAdmins||[]).map(M=>e.jsxs("div",{className:"tree-node depth-0 root-node",style:{opacity:.7,marginBottom:2},children:[e.jsxs("div",{className:"node-content",children:[e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:(M.username||"").toUpperCase()}),e.jsx("span",{className:"node-role-badge role-admin",children:"ADMIN"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>r(M.id,"admin"),children:"Go"})]},M.id)),e.jsxs("div",{className:"tree-node depth-0 root-node",children:[e.jsxs("div",{className:"node-content",onClick:()=>ie&&N(v.root.id),children:[ie?e.jsx("span",{className:"node-toggle",children:Pe?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:v.root.username.toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${U(v.root)}`,children:j(v.root)})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>{if(H&&m){m();return}r(v.root.id,v.root.role)},children:"Go"})]}),E&&(Pe||R)&&e.jsx("div",{className:"node-children",children:v.tree.map(M=>z(M,1))})]}):null})]})})}const sl=t=>String(t||"").replace(/\s+/g," ").trim(),Ts=t=>sl(t).toLowerCase(),nl=t=>{const r=String(t||"").replace(/\D+/g,"");return r?r.length>10?r.slice(-10):r:""},rl=t=>Ts(t),il=t=>{const r=Ts(t?.fullName||t?.name||"");return r||Ts(`${t?.firstName||""} ${t?.lastName||""}`)},ka=(t,r,o)=>{r&&(t.has(r)||t.set(r,new Set),t.get(r).add(o))},Us=t=>{if(!Array.isArray(t)||t.length===0)return[];const r=t.map((x,S)=>{const L=String(x?.id||x?.username||`row-${S}`),j=il(x),U=nl(x?.phoneNumber),g=rl(x?.email);return{player:x,id:L,name:j,phone:U,email:g}}),o=new Map;r.forEach(({id:x,name:S,phone:L,email:j})=>{L&&ka(o,`phone:${L}`,x),j&&ka(o,`email:${j}`,x),S&&L&&ka(o,`name_phone:${S}|${L}`,x),S&&j&&ka(o,`name_email:${S}|${j}`,x),S&&!L&&!j&&S.length>=8&&S.includes(" ")&&ka(o,`name_only:${S}`,x)});const m=new Map,p=x=>(m.has(x)||m.set(x,{reasons:new Set,groups:new Set,matchCount:0}),m.get(x));return o.forEach((x,S)=>{if(x.size<2)return;const L=S.startsWith("email:")?"email":S.startsWith("phone:")?"phone":"name";x.forEach(j=>{const U=p(j);U.reasons.add(L),U.groups.add(S),U.matchCount+=x.size-1})}),r.map(({player:x,id:S})=>{const L=m.get(S);return L?{...x,isDuplicatePlayer:!0,duplicateMatchCount:L.matchCount,duplicateReasons:Array.from(L.reasons),duplicateGroupKeys:Array.from(L.groups)}:{...x,isDuplicatePlayer:!1,duplicateMatchCount:0,duplicateReasons:[],duplicateGroupKeys:[]}})},ll={casino_baccarat:"Baccarat",casino_blackjack:"Blackjack",casino_craps:"Craps",casino_arabian:"Arabian Game",casino_jurassic_run:"Jurassic Run",casino_3card_poker:"3-Card Poker",casino_roulette:"Roulette",casino_stud_poker:"Stud Poker"},ol=new Set(["withdrawal","bet_placed","bet_lost","fee","debit","casino_bet_debit"]),cl=new Set(["deposit","bet_won","bet_refund","credit","credit_adj","casino_bet_credit","fp_deposit"]),Da=t=>String(t||"").trim().toLowerCase(),Gn=t=>String(t||"").trim().toUpperCase(),dl=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),ul=t=>{const r=Da(t?.sourceType);return ll[r]||""},ml=t=>{const r=Da(t?.type),o=Gn(t?.reason);return r==="fp_deposit"||dl.has(o)},pl=t=>{const r=String(t?.entrySide||"").trim().toUpperCase();if(r==="DEBIT")return!0;if(r==="CREDIT")return!1;const o=Number(t?.balanceBefore),m=Number(t?.balanceAfter);return Number.isFinite(o)&&Number.isFinite(m)?m<o:Number(t?.amount||0)<0},qn=t=>{const r=Da(t?.type),o=ul(t),m=Gn(t?.reason);if(ml(t))return m==="NEW_PLAYER_FREEPLAY_BONUS"?"$200 new player freeplay bonus":m==="DEPOSIT_FREEPLAY_BONUS"?"Deposit Freeplay Bonus":m==="REFERRAL_FREEPLAY_BONUS"?"Referral Freeplay Bonus":pl(t)?"Freeplay Withdrawal":"Freeplay Deposit";switch(r){case"deposit":return"Deposit";case"withdrawal":return"Withdrawal";case"bet_placed":return"Sportsbook Wager";case"bet_won":return"Sportsbook Payout";case"bet_refund":return"Sportsbook Refund";case"casino_bet_debit":return o?`${o} Wager`:"Casino Wager";case"casino_bet_credit":return o?`${o} Payout`:"Casino Payout";case"credit_adj":return"Credit Adjustment";case"adjustment":return m==="ADMIN_CREDIT_ADJUSTMENT"?"Credit Adj":m==="ADMIN_DEBIT_ADJUSTMENT"?"Debit Adj":m==="ADMIN_PROMOTIONAL_CREDIT"?"Promotional Credit":m==="ADMIN_PROMOTIONAL_DEBIT"?"Promotional Debit":"Adjustment";default:return String(t?.type||"Transaction")}},Qn=t=>{const r=String(t?.entrySide||"").trim().toUpperCase();if(r==="DEBIT")return!0;if(r==="CREDIT")return!1;const o=Da(t?.type);if(o==="adjustment"){const m=String(t?.reason||"").trim().toUpperCase();if(m==="ADMIN_DEBIT_ADJUSTMENT"||m==="ADMIN_PROMOTIONAL_DEBIT")return!0;if(m==="ADMIN_CREDIT_ADJUSTMENT"||m==="ADMIN_PROMOTIONAL_CREDIT")return!1;const p=Number(t?.balanceBefore),x=Number(t?.balanceAfter);if(Number.isFinite(p)&&Number.isFinite(x))return x<p}return ol.has(o)?!0:cl.has(o)?!1:Number(t?.amount||0)<0},Uo=t=>{const r=Da(t?.type);return r==="bet_placed"||r==="casino_bet_debit"},Ga=[{value:"this-week",label:"This Week"},{value:"last-week",label:"Last Week"},...Array.from({length:16},(t,r)=>{const o=r+2;return{value:`weeks-ago-${o}`,label:`${o} Week's ago`}})],gn="this-week",fn="active-week",hl=null,qa=[{value:"all-players",label:"All Players",description:"Shows all players in the selected week scope."},{value:"active-week",label:"Active For The Week",description:"Shows only active players for the selected week."},{value:"with-balance",label:"With A Balance",description:"Shows only players with a balance."},{value:"big-figures",label:"Big Figures",description:"Shows players with absolute balance greater than $1,000 (winners and losers)."},{value:"over-settle-winners",label:"Over Settle Winners",description:"Shows over-settle winners."},{value:"over-settle-losers",label:"Over Settle Losers",description:"Shows over-settle losers."},{value:"inactive-losers-14d",label:"Inactive Losers 14 Days",description:"Shows only inactive losers from the last 14 days."}],ma=t=>{const r=Number(t);if(Number.isFinite(r))return r;if(typeof t=="string"){const o=t.replace(/[^0-9.-]/g,""),m=Number(o);if(Number.isFinite(m))return m}return 0},js=t=>{const r=t?.lifetimePerformance??t?.lifetimePlusMinus??t?.lifetime??0;return ma(r)},bn=(t,r,o)=>{if(!Array.isArray(t)||t.length===0)return r;const m=t.findIndex(S=>S.value===r),x=((m>=0?m:0)+o+t.length)%t.length;return t[x]?.value??r},jn=t=>{const r=String(t||"").trim().toLowerCase();return r==="period"||r==="filter"?r:hl};function xl({onViewChange:t=null,viewContext:r=null}){const[o,m]=a.useState(()=>String(r?.timePeriod||gn)),[p,x]=a.useState(()=>String(r?.playerFilter||fn)),[S,L]=a.useState(()=>jn(r?.openDropdown)),[j,U]=a.useState(null),[g,w]=a.useState(null),[u,d]=a.useState(null),[k,Q]=a.useState([]),[B,$]=a.useState(0),[v,b]=a.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[R,n]=a.useState(!0),[I,D]=a.useState(""),l=a.useRef(null),Y=a.useMemo(()=>new Intl.Collator(void 0,{numeric:!0,sensitivity:"base"}),[]),pe=String(r?.summaryFocus||"").trim().toLowerCase(),G=String(r?.actorLabel||"").trim().toUpperCase(),N=pe==="agent-collections",ee=pe==="house-collections",f=N||ee,O=c=>{if(c==null)return null;const F=Number(c);if(Number.isNaN(F))return null;const J=Math.round(F);return Object.is(J,-0)?0:J},H=c=>{const F=O(c);return F===null?"—":F.toLocaleString("en-US")},_=c=>{const F=O(c);return F===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(F)},E=c=>{const F=O(c);return F===null||F===0?"is-neutral":F>0?"is-positive":"is-negative"},ie=c=>{const F=O(c);return F===null||F===0?"neutral":F>0?"positive":"negative"},Pe=c=>{if(typeof c?.inactive14Days=="boolean")return c.inactive14Days;const F=c?.lastActive||c?.lastBetAt||c?.updatedAt||"",J=Date.parse(String(F||""));if(Number.isNaN(J))return!1;const de=336*60*60*1e3;return Date.now()-J>=de},z=c=>{if(typeof c?.activeForWeek=="boolean")return c.activeForWeek;const F=Number(c?.week||0);return Array.isArray(c?.daily)?c.daily.some(J=>Math.abs(Number(J||0))>.01):Math.abs(F)>.01},M=c=>N?ma(c?.agentCollections??0):ee?ma(c?.houseCollections??0):0;a.useEffect(()=>{(async()=>{const F=localStorage.getItem("token");if(!F){D("Please login to view weekly figures."),n(!1);return}try{n(!0);const J=await Ur(o,F);U(J.summary),w(J.settlement||null),d(J.startDate&&J.endDate?{start:J.startDate,end:J.endDate}:null),Q(J.customers||[]),D("")}catch(J){console.error("Failed to fetch weekly figures:",J),D(J.message||"Failed to load weekly figures")}finally{n(!1)}})()},[o]),a.useEffect(()=>{!r||typeof r!="object"||(m(String(r?.timePeriod||gn)),x(String(r?.playerFilter||fn)),$(0),L(jn(r?.openDropdown)))},[r]),a.useEffect(()=>{const c=()=>{b(window.innerWidth<=768)};return window.addEventListener("resize",c),()=>window.removeEventListener("resize",c)},[]),a.useEffect(()=>{const c=F=>{l.current&&(l.current.contains(F.target)||L(null))};return document.addEventListener("mousedown",c),document.addEventListener("touchstart",c),()=>{document.removeEventListener("mousedown",c),document.removeEventListener("touchstart",c)}},[]);const Z=a.useMemo(()=>Us(k),[k]),he=p==="all-players",ae=c=>{const F=Number(c.balance||0),J=Math.abs(Number(c.settleLimit??c.balanceOwed??0)),de=z(c);return p==="all-players"?!0:p==="with-balance"?Math.abs(F)>.01:p==="active-week"?de:p==="big-figures"?Math.abs(F)>1e3:p==="over-settle-winners"?J<=.01?!1:F>=J:p==="over-settle-losers"?J<=.01?!1:F<=-J:p==="inactive-losers-14d"?Pe(c)&&F<-.01:!0},re=a.useMemo(()=>Z.map(c=>({...c,matchesSelectedFilter:ae(c)})),[Z,p]),Re=a.useMemo(()=>{const c=he?re:re.filter(F=>F.matchesSelectedFilter);return f?c.filter(F=>Math.abs(M(F))>.01):c},[re,M,he,f]),C=a.useMemo(()=>(c,F)=>{const J=String(c?.username||""),de=String(F?.username||""),Ne=Y.compare(J,de);if(f){const xe=Math.abs(M(F))-Math.abs(M(c));return xe!==0?xe:Ne}if(he)return Ne;if(p==="over-settle-winners"){const xe=Number(F?.balance||0)-Number(c?.balance||0);return xe!==0?xe:Ne}if(p==="over-settle-losers"||p==="inactive-losers-14d"){const xe=Math.abs(Number(F?.balance||0))-Math.abs(Number(c?.balance||0));return xe!==0?xe:Ne}if(p==="big-figures"){const xe=Math.abs(Number(F?.balance||0))-Math.abs(Number(c?.balance||0));return xe!==0?xe:Ne}return Ne},[Y,M,he,f,p]),ne=a.useMemo(()=>[...Re].sort(C),[C,Re]),i=c=>{!c||typeof t!="function"||t("user-details",c)},W=qa.find(c=>c.value===p)||qa[0],oe=Ga.find(c=>c.value===o)||Ga[0],ge=Array.isArray(j?.days)?j.days:[];a.useEffect(()=>{if(!Array.isArray(ge)||ge.length===0){$(0);return}$(c=>c<0?0:c>ge.length-1?ge.length-1:c)},[ge]);const ke=a.useMemo(()=>ne.map(c=>{const F=Array.isArray(c?.agentHierarchy)?c.agentHierarchy.map(Ne=>String(Ne||"").trim().toUpperCase()).filter(Boolean):[],J=String(c?.agentUsername||"").trim().toUpperCase()||(F.length>0?F[F.length-1]:""),de=String(c?.agentHierarchyPath||"").trim().toUpperCase()||(F.length>0?F.join(" / "):J||"UNASSIGNED");return{...c,hierarchy:{path:de,directAgent:J}}}),[ne]),ye=a.useMemo(()=>{const c=new Map;ke.forEach(J=>{const de=J.hierarchy||{},Ne=String(de.path||"UNASSIGNED"),xe=Ne;c.has(xe)||c.set(xe,{key:xe,hierarchyLabel:Ne,customers:[]}),c.get(xe).customers.push(J)});let F=Array.from(c.values());return F.forEach(J=>{J.customers=[...J.customers].sort(C)}),F=F.sort((J,de)=>Y.compare(J.hierarchyLabel,de.hierarchyLabel)),F=F.map(J=>{const de=J.customers.reduce((ve,Le)=>{const He=Number(Le?.daily?.[B]??0);return ve+(Number.isNaN(He)?0:He)},0),Ne=J.customers.reduce((ve,Le)=>{const He=ma(Le?.balance??0);return ve+(Number.isNaN(He)?0:He)},0),xe=J.customers.reduce((ve,Le)=>{const He=js(Le);return ve+(Number.isNaN(He)?0:He)},0);return{...J,totals:{players:J.customers.length,day:de,balance:Ne,lifetime:xe}}}),F},[Y,C,ke,B]),Ge=ge[B]?.day||"Day",Oe=ge.length>0?Ge:"Selected Metric",Ve=c=>{!Array.isArray(ge)||ge.length===0||$(F=>{const J=F+c;return J<0?ge.length-1:J>=ge.length?0:J})},it=c=>{m(F=>bn(Ga,F,c)),L(null)},qe=c=>{x(F=>bn(qa,F,c)),L(null)},Qe=c=>{L(F=>F===c?null:c)},Fe=c=>{m(c),L(null)},dt=c=>{x(c),L(null)},ht=c=>{if(!Array.isArray(c?.daily)||c.daily.length===0)return 0;const F=Number(c.daily[B]??0);return Number.isNaN(F)?0:F},nt=c=>H(c),Ue=a.useMemo(()=>ne,[ne]),Je=a.useMemo(()=>{const c=G||"THIS AGENT";return pe==="agent-collections"?`Opened from Agent Collections for ${c}. Showing This Week collections automatically.`:pe==="house-collections"?`Opened from House Collection for ${c}. Showing This Week collections automatically.`:""},[G,pe]),lt=a.useMemo(()=>{if(!f)return null;const c=Ue.reduce((F,J)=>F+M(J),0);return{label:N?"Agent Collections":"House Collection",count:Ue.length,total:c}},[M,N,f,Ue]),Ke=a.useMemo(()=>{const c=Ue.length,F=Ue.reduce((Ne,xe)=>Ne+ht(xe),0),J=Ue.reduce((Ne,xe)=>Ne+ma(xe?.balance??0),0),de=Ue.reduce((Ne,xe)=>Ne+js(xe),0);return{playerCount:c,selectedMetricTotal:F,balanceTotal:J,lifetimeTotal:de}},[Ue,B]),St=()=>e.jsxs("div",{className:"weekly-mobile-inline-day",children:[e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>Ve(-1),"aria-label":"Previous day",children:e.jsx("i",{className:"fa-solid fa-caret-left","aria-hidden":"true"})}),e.jsx("span",{children:Ge}),e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>Ve(1),"aria-label":"Next day",children:e.jsx("i",{className:"fa-solid fa-caret-right","aria-hidden":"true"})})]});return e.jsxs("div",{className:"admin-view weekly-figures-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Weekly Figures - Customer Tracking"}),e.jsxs("div",{className:"period-filter",ref:l,children:[e.jsxs("div",{className:`period-filter-control weekly-period-select${S==="period"?" is-open":""}`,role:"group","aria-label":"Week period control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Qe("period"),"aria-label":"Open week period options","aria-haspopup":"listbox","aria-expanded":S==="period",children:e.jsx("span",{className:"period-filter-value",children:oe.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>it(-1),"aria-label":"Previous week period",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>it(1),"aria-label":"Next week period",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),S==="period"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Week period options",children:Ga.map(c=>e.jsx("button",{type:"button",className:`period-filter-menu-item${c.value===o?" is-selected":""}`,onClick:()=>Fe(c.value),children:c.label},c.value))})]}),e.jsxs("div",{className:`period-filter-control weekly-filter-select${S==="filter"?" is-open":""}`,role:"group","aria-label":"Player filter control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Qe("filter"),"aria-label":"Open player filter options","aria-haspopup":"listbox","aria-expanded":S==="filter",children:e.jsx("span",{className:"period-filter-value",children:W.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>qe(-1),"aria-label":"Previous player filter",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>qe(1),"aria-label":"Next player filter",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),S==="filter"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Player filter options",children:qa.map(c=>e.jsx("button",{type:"button",className:`period-filter-menu-item${c.value===p?" is-selected":""}`,onClick:()=>dt(c.value),children:c.label},c.value))})]})]})]}),e.jsxs("div",{className:"view-content",children:[Je&&e.jsx("div",{className:"weekly-focus-banner",children:Je}),lt&&e.jsxs("div",{className:"weekly-focus-banner",children:[lt.label,": ",lt.count," player",lt.count===1?"":"s"," matched, total ",H(lt.total)]}),R&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading weekly figures..."}),I&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:I}),!R&&!I&&j&&e.jsxs(e.Fragment,{children:[g&&u&&e.jsxs("div",{className:"summary-section weekly-settlement-section",children:[e.jsx("div",{className:"summary-header",children:e.jsxs("h3",{children:[new Date(u.start).toLocaleDateString("en-US",{month:"numeric",day:"numeric"})," – ",(()=>{const c=new Date(u.end);return c.setDate(c.getDate()-1),c.toLocaleDateString("en-US",{month:"numeric",day:"numeric"})})()," Report"]})}),e.jsxs("div",{className:"weekly-settlement-grid",children:[e.jsxs("div",{className:"stat-group stat-group-green",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Agent Collections"}),e.jsx("span",{className:`stat-value ${ie(g.agentCollections)}`,children:_(g.agentCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${ie(g.houseCollections)}`,children:_(g.houseCollections)})]}),Number(g.previousMakeup||0)>0&&Number(g.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Makeup"}),e.jsx("span",{className:"stat-value negative",children:_(-g.previousMakeup)})]})]}),e.jsxs("div",{className:"stat-group stat-group-yellow",children:[Number(g.makeupReduction||0)>0?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Gross Collections"}),e.jsx("span",{className:`stat-value ${ie(g.netCollections)}`,children:_(g.netCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Makeup Cleared"}),e.jsx("span",{className:"stat-value negative",children:_(-g.makeupReduction)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${ie(g.commissionableProfit)}`,children:_(g.commissionableProfit)})]})]}):e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${ie(g.netCollections)}`,children:_(g.netCollections)})]}),Number(g.agentSplit||0)>0&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Agent Split",g.agentPercent!=null?` ${g.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${ie(g.agentSplit)}`,children:_(g.agentSplit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Kick to House",g.agentPercent!=null?` ${100-g.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${ie(g.kickToHouse)}`,children:_(g.kickToHouse)})]})]})]}),e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:g.activePlayers})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Player Fees"}),e.jsx("span",{className:"stat-value",children:_(g.totalPlayerFees)})]})]}),e.jsxs("div",{className:"stat-group stat-group-salmon",children:[Number(g.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Remaining Makeup"}),e.jsx("span",{className:"stat-value negative",children:_(-g.cumulativeMakeup)})]}),Number(g.previousBalanceOwed||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Balance"}),e.jsx("span",{className:`stat-value ${ie(g.previousBalanceOwed)}`,children:_(g.previousBalanceOwed)})]}),Number(g.houseProfit||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Profit"}),e.jsx("span",{className:`stat-value ${ie(g.houseProfit)}`,children:_(g.houseProfit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${ie(-g.houseCollections)}`,children:_(-g.houseCollections)})]}),Number(g.fundingAdjustment||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Payments"}),e.jsx("span",{className:`stat-value ${ie(-g.fundingAdjustment)}`,children:_(-g.fundingAdjustment)})]}),e.jsxs("div",{className:"stat-row stat-row-total",children:[e.jsx("span",{className:"stat-label",children:"Balance Owed / House Money"}),e.jsx("span",{className:`stat-value ${ie(g.balanceOwed)}`,children:_(g.balanceOwed)})]})]})]})]}),e.jsxs("div",{className:"summary-section",children:[e.jsx("div",{className:"summary-header",children:e.jsx("h3",{children:"Summary"})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table customer-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Summary"}),e.jsx("th",{children:Oe}),e.jsx("th",{children:"Balance"})]})}),e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsxs("td",{children:[Ke.playerCount," ",p==="active-week"?"Active Players":"Players"]}),e.jsx("td",{className:`weekly-amount ${E(Ke.selectedMetricTotal)}`,children:H(Ke.selectedMetricTotal)}),e.jsx("td",{className:`weekly-amount ${E(Ke.balanceTotal)}`,children:H(Ke.balanceTotal)})]})})]})})]}),e.jsxs("div",{className:"customer-section",children:[e.jsx("div",{className:"section-header",children:e.jsx("h3",{children:W.label})}),e.jsx("div",{className:"weekly-mobile-customer-shell",children:e.jsx("div",{className:"weekly-mobile-groups",children:ye.length>0?ye.map(c=>{const F=p==="over-settle-winners"||p==="over-settle-losers";return e.jsxs("section",{className:`weekly-mobile-group weekly-mobile-table-block${F?" weekly-mobile-has-lifetime":""}`,children:[e.jsx("div",{className:"weekly-mobile-hierarchy",children:c.hierarchyLabel}),e.jsxs("div",{className:"weekly-mobile-table-head",children:[e.jsx("span",{children:"Customer"}),e.jsx("div",{className:"weekly-mobile-table-day-head",children:St()}),e.jsx("span",{children:"Balance"}),F&&e.jsx("span",{className:"weekly-mobile-lifetime-head",children:"Lifetime"})]}),e.jsxs("div",{className:"weekly-mobile-rows",children:[c.customers.map((J,de)=>{const Ne=ht(J),xe=ma(J?.balance??0),ve=Ne,Le=xe,He=js(J);return e.jsxs("div",{className:`weekly-mobile-table-row ${J.isDuplicatePlayer?"weekly-duplicate-row":""}`,children:[e.jsxs("div",{className:"weekly-mobile-customer-cell weekly-mobile-user",children:[J.id&&typeof t=="function"?e.jsx("button",{type:"button",className:"customer-username customer-username-button",onClick:()=>i(J.id),children:J.username}):e.jsx("strong",{className:"customer-username",children:J.username}),e.jsx("span",{className:"weekly-mobile-fullname",children:J.name||"—"}),J.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"})]}),e.jsx("div",{className:`weekly-mobile-day-cell ${E(ve)}`,children:nt(ve)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${E(Le)}`,children:e.jsx("span",{className:"weekly-mobile-balance-value",children:nt(Le)})}),F&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${E(He)}`,children:nt(He)})]},`${c.key}-${String(J.id||J.username||de)}`)}),e.jsxs("div",{className:"weekly-mobile-table-row weekly-mobile-group-total-row",children:[e.jsx("div",{className:"weekly-mobile-customer-cell",children:e.jsxs("strong",{children:[c.totals.players," Players"]})}),e.jsx("div",{className:`weekly-mobile-day-cell ${E(c.totals.day)}`,children:nt(c.totals.day)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${E(c.totals.balance)}`,children:nt(c.totals.balance)}),F&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${E(c.totals.lifetime)}`,children:nt(c.totals.lifetime)})]})]})]},c.key)}):e.jsx("div",{className:"weekly-empty-state",children:"No players matched this filter."})})})]})]})]})]})}const Wo=Object.freeze(Object.defineProperty({__proto__:null,default:xl},Symbol.toStringTag,{value:"Module"}));function gl(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(null),[j,U]=a.useState("all");a.useEffect(()=>{(async()=>{const $=localStorage.getItem("token");if(!$){x("Please login to view pending items."),m(!1);return}try{m(!0);const[v,b]=await Promise.all([Wr($),es({status:"pending",limit:300},$)]),R=Array.isArray(v)?v.map(D=>({id:`transaction-${D.id}`,entityId:D.id,source:"transaction",type:D.type||"transaction",details:"Pending wallet/payment transaction",amount:Number(D.amount||0),user:D.user||"Unknown",date:D.date||null,status:D.status||"pending"})):[],I=[...Array.isArray(b?.bets)?b.bets.map(D=>({id:`bet-${D.id}`,entityId:D.id,source:"sportsbook",type:D.type||"bet",details:D.match?.homeTeam&&D.match?.awayTeam?`${D.match.homeTeam} vs ${D.match.awayTeam}`:D.description||"Pending sportsbook bet",amount:Number(D.risk||D.amount||0),user:D.customer||D.username||"Unknown",date:D.createdAt||null,status:D.status||"pending"})):[],...R].sort((D,l)=>{const Y=D.date?new Date(D.date).getTime():0;return(l.date?new Date(l.date).getTime():0)-Y});r(I),x("")}catch(v){console.error("Failed to load pending items:",v),x(v.message||"Failed to load pending items")}finally{m(!1)}})()},[]);const g=async B=>{const $=localStorage.getItem("token");if(!$){x("Please login to approve items.");return}try{L(B),await zr(B,$),r(v=>v.filter(b=>b.entityId!==B))}catch(v){x(v.message||"Failed to approve item")}finally{L(null)}},w=async B=>{const $=localStorage.getItem("token");if(!$){x("Please login to decline items.");return}try{L(B),await Vr(B,$),r(v=>v.filter(b=>b.entityId!==B))}catch(v){x(v.message||"Failed to decline item")}finally{L(null)}},u=B=>{if(B==null)return"—";const $=Number(B);return Number.isNaN($)?"—":`$${Math.round($)}`},d=B=>{if(!B)return"—";const $=new Date(B);return Number.isNaN($.getTime())?"—":$.toLocaleString()},k=j==="all"?t:t.filter(B=>B.source===j),Q=t.reduce((B,$)=>(B[$.source]=(B[$.source]||0)+1,$.source==="sportsbook"&&(B.betExposure+=Number($.amount||0)),B),{sportsbook:0,transaction:0,betExposure:0});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Pending Items"}),e.jsxs("p",{className:"count",children:[t.length," pending items"]})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading pending items..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Pending"}),e.jsx("div",{className:"amount",children:t.length}),e.jsx("p",{className:"change",children:"Transactions + sportsbook bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Bets"}),e.jsx("div",{className:"amount",children:Q.sportsbook}),e.jsx("p",{className:"change",children:"Sportsbook tickets awaiting settlement"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("div",{className:"amount",children:Q.transaction}),e.jsx("p",{className:"change",children:"Wallet/payment approvals"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bet Exposure"}),e.jsx("div",{className:"amount",children:u(Q.betExposure)}),e.jsx("p",{className:"change",children:"Risk currently locked in pending bets"})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Source"}),e.jsxs("select",{value:j,onChange:B=>U(B.target.value),children:[e.jsx("option",{value:"all",children:"All Pending Items"}),e.jsx("option",{value:"sportsbook",children:"Sportsbook Bets"}),e.jsx("option",{value:"transaction",children:"Transactions"})]})]})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Details"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:k.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No pending items found."})}):k.map(B=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`badge ${B.source}`,children:B.source})}),e.jsx("td",{children:B.type}),e.jsx("td",{children:B.details}),e.jsx("td",{children:u(B.amount)}),e.jsx("td",{children:B.user}),e.jsx("td",{children:d(B.date)}),e.jsx("td",{children:e.jsx("span",{className:"badge pending",children:B.status})}),e.jsx("td",{children:B.source==="transaction"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-approve",onClick:()=>g(B.entityId),disabled:S===B.entityId,children:S===B.entityId?"Working...":"Approve"}),e.jsx("button",{className:"btn-small btn-decline",onClick:()=>w(B.entityId),disabled:S===B.entityId,children:S===B.entityId?"Working...":"Decline"})]}):e.jsx("span",{style:{color:"#6b7280",fontSize:"12px"},children:"Settles from sportsbook results"})})]},B.id))})]})})]})]})]})}const zo=Object.freeze(Object.defineProperty({__proto__:null,default:gl},Symbol.toStringTag,{value:"Module"}));function fl(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(null);a.useEffect(()=>{(async()=>{const u=localStorage.getItem("token")||sessionStorage.getItem("token");if(!u){x("Please login to view messages."),m(!1);return}try{m(!0);const d=await Hr(u);r(d||[]),x("")}catch(d){console.error("Failed to fetch messages:",d),x(d.message||"Failed to load messages")}finally{m(!1)}})()},[]);const j=async w=>{const u=localStorage.getItem("token")||sessionStorage.getItem("token");if(!u){x("Please login to reply.");return}const d=window.prompt("Enter your reply:");if(d)try{L(w),await Yr(w,d,u),r(k=>k.map(Q=>Q.id===w?{...Q,read:!0,replies:[...Q.replies||[],{message:d,createdAt:new Date}]}:Q))}catch(k){x(k.message||"Failed to send reply")}finally{L(null)}},U=async w=>{const u=localStorage.getItem("token")||sessionStorage.getItem("token");if(!u){x("Please login to delete messages.");return}try{L(w),await Gr(w,u),r(d=>d.filter(k=>k.id!==w))}catch(d){x(d.message||"Failed to delete message")}finally{L(null)}},g=async w=>{const u=localStorage.getItem("token")||sessionStorage.getItem("token");if(u)try{await qr(w,u),r(d=>d.map(k=>k.id===w?{...k,read:!0}:k))}catch(d){console.error("Failed to mark read:",d)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Messaging Center"}),e.jsxs("p",{className:"count",children:["Unread: ",t.filter(w=>!w.read).length]})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading messages..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"messaging-container",children:e.jsx("div",{className:"message-list",children:t.map(w=>e.jsxs("div",{className:`message-item ${w.read?"":"unread"}`,onClick:()=>g(w.id),children:[e.jsxs("div",{className:"message-header",children:[e.jsx("h4",{children:w.fromName}),e.jsx("span",{className:"date",children:new Date(w.createdAt).toLocaleString()})]}),e.jsx("p",{className:"subject",children:w.subject}),e.jsx("p",{className:"subject",style:{opacity:.8},children:w.body}),e.jsxs("div",{className:"message-actions",children:[e.jsx("button",{className:"btn-small",onClick:u=>{u.stopPropagation(),j(w.id)},disabled:S===w.id,children:S===w.id?"Working...":"Reply"}),e.jsx("button",{className:"btn-small",onClick:u=>{u.stopPropagation(),U(w.id)},disabled:S===w.id,children:S===w.id?"Working...":"Delete"})]})]},w.id))})})]})]})}const Vo=Object.freeze(Object.defineProperty({__proto__:null,default:fl},Symbol.toStringTag,{value:"Module"}));function bl(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1),[j,U]=a.useState(!1),[g,w]=a.useState(!1),[u,d]=a.useState(null),[k,Q]=a.useState({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),B=l=>{if(l==null)return"—";const Y=Number(l);return Number.isNaN(Y)?"—":`$${Math.round(Y)}`},$=async()=>{const l=localStorage.getItem("token")||sessionStorage.getItem("token");if(!l){x("Please login to manage games."),m(!1);return}try{m(!0);const Y=await ts(l);r(Y||[]),x("")}catch(Y){console.error("Failed to load games:",Y),x(Y.message||"Failed to load games")}finally{m(!1)}};a.useEffect(()=>{$()},[]);const v=()=>{Q({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),L(!0)},b=l=>{d(l),Q({homeTeam:l.homeTeam,awayTeam:l.awayTeam,sport:l.sport,startTime:new Date(l.startTime).toISOString().slice(0,16),status:l.status}),U(!0)},R=l=>{d(l),w(!0)},n=l=>{const{name:Y,value:pe}=l.target;Q(G=>({...G,[Y]:pe}))},I=async l=>{l.preventDefault();const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!Y){x("Please login to add games.");return}try{const pe={...k,startTime:new Date(k.startTime).toISOString()},G=await Fn(pe,Y);r(N=>[...N,{id:G.id,homeTeam:G.homeTeam,awayTeam:G.awayTeam,sport:G.sport,startTime:G.startTime,status:G.status,activeBets:0,revenue:0}]),L(!1)}catch(pe){x(pe.message||"Failed to create match")}},D=async l=>{l.preventDefault();const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!Y){x("Please login to update games.");return}try{const pe={...k,startTime:new Date(k.startTime).toISOString()},G=await $n(u.id,pe,Y);r(N=>N.map(ee=>ee.id===u.id?{...ee,homeTeam:G.homeTeam,awayTeam:G.awayTeam,sport:G.sport,startTime:G.startTime,status:G.status}:ee)),U(!1)}catch(pe){x(pe.message||"Failed to update match")}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Game Administration"}),e.jsx("button",{className:"btn-primary",onClick:v,children:"Add New Game"})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Start Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Active Bets"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(l=>e.jsxs("tr",{children:[e.jsxs("td",{children:[l.homeTeam," vs ",l.awayTeam]}),e.jsx("td",{children:l.sport}),e.jsx("td",{children:new Date(l.startTime).toLocaleString()}),e.jsx("td",{children:e.jsx("span",{className:`badge ${l.status}`,children:l.status})}),e.jsx("td",{children:l.activeBets}),e.jsx("td",{children:B(l.revenue)}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>b(l),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>R(l),children:"View"})]})]},l.id))})]})})]}),S&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:l=>l.stopPropagation(),children:[e.jsx("h3",{children:"Add New Game"}),e.jsxs("form",{onSubmit:I,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:k.homeTeam,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:k.awayTeam,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:k.sport,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:k.startTime,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:k.status,onChange:n,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"})]})]})]})}),j&&u&&e.jsx("div",{className:"modal-overlay",onClick:()=>U(!1),children:e.jsxs("div",{className:"modal-content",onClick:l=>l.stopPropagation(),children:[e.jsx("h3",{children:"Edit Game"}),e.jsxs("form",{onSubmit:D,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:k.homeTeam,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:k.awayTeam,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:k.sport,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:k.startTime,onChange:n,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:k.status,onChange:n,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>U(!1),children:"Cancel"})]})]})]})}),g&&u&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:l=>l.stopPropagation(),children:[e.jsx("h3",{children:"Game Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Match:"})," ",u.homeTeam," vs ",u.awayTeam]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",u.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Start Time:"})," ",new Date(u.startTime).toLocaleString()]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",u.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Active Bets:"})," ",u.activeBets]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Revenue:"})," ",B(u.revenue)]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Close"})})]})})]})}const Ho=Object.freeze(Object.defineProperty({__proto__:null,default:bl},Symbol.toStringTag,{value:"Module"})),yn={game:"",username:"",userId:"",result:"",from:"",to:"",minWager:"",maxWager:""};function jl(){const[t,r]=a.useState(yn),[o,m]=a.useState([]),[p,x]=a.useState(null),[S,L]=a.useState([]),[j,U]=a.useState([]),[g,w]=a.useState({count:0,sample:[]}),[u,d]=a.useState(!0),[k,Q]=a.useState(""),[B,$]=a.useState(1),[v,b]=a.useState({page:1,pages:1,total:0,limit:50}),[R,n]=a.useState(!1),[I,D]=a.useState(""),[l,Y]=a.useState(null),pe=localStorage.getItem("token"),G=a.useCallback(async()=>{if(!pe){Q("Please login to view casino bets."),d(!1);return}try{d(!0),Q("");const[i,W]=await Promise.all([Qr({...t,page:B,limit:50},pe),Jr({game:t.game,from:t.from,to:t.to,result:t.result,username:t.username,userId:t.userId},pe)]);m(Array.isArray(i?.bets)?i.bets:[]),b(i?.pagination||{page:B,pages:1,total:0,limit:50}),x(W?.summary||null),L(Array.isArray(W?.byGame)?W.byGame:[]),U(Array.isArray(W?.byUser)?W.byUser:[]),w(W?.anomalies||{count:0,sample:[]})}catch(i){console.error("Failed to load admin casino data:",i),Q(i.message||"Failed to load casino bets")}finally{d(!1)}},[pe,t,B]);a.useEffect(()=>{G()},[G]);const N=(i,W)=>{$(1),r(oe=>({...oe,[i]:W}))},ee=async i=>{if(!(!i||!pe))try{n(!0),D("");const W=await Zr(i,pe);Y(W?.bet||null)}catch(W){D(W.message||"Failed to load round detail")}finally{n(!1)}},f=()=>{Y(null),D("")},O=()=>{$(1),r(yn)},H=i=>{const W=Number(i||0);return Number.isNaN(W)?"$0":`$${Math.round(W)}`},_=i=>i?new Date(i).toLocaleString():"—",E=i=>{switch(String(i||"").toLowerCase()){case"stud-poker":return"Stud Poker";case"roulette":return"Roulette";case"blackjack":return"Blackjack";case"baccarat":return"Baccarat";case"craps":return"Craps";case"arabian":return"Arabian Game";case"jurassic-run":return"Jurassic Run";case"arabian-treasure":return"Arabian Game";case"3card-poker":return"3-Card Poker";default:return i||"—"}},ie=i=>{const W=String(i?.playerOutcome||"").trim();if(W)return W;const oe=String(i?.roundStatus||"").toLowerCase();if(oe&&oe!=="settled")return"Pending";const ge=Number(i?.netResult||0);return ge>0?"Win":ge<0?"Lose":"Push"},Pe=i=>String(i||"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"unknown",z=i=>{if(!i)return"—";if(String(i.game||"").toLowerCase()==="roulette"&&i.rouletteOutcome){const W=i.rouletteOutcome.number??i.result,oe=String(i.rouletteOutcome.color||"").trim();return oe?`${W} ${oe}`:`${W}`}if(String(i.game||"").toLowerCase()==="craps"){const W=i?.roundData?.dice,oe=Number(W?.die1),ge=Number(W?.die2),ke=Number(W?.sum);if(Number.isFinite(oe)&&Number.isFinite(ge)&&Number.isFinite(ke))return`${oe}+${ge}=${ke}`}if(String(i.game||"").toLowerCase()==="arabian"){const W=Number(i?.roundData?.totalWin??i?.totalReturn??0),oe=Number(i?.roundData?.bonusWin??0),ge=Number(i?.roundData?.freeSpinsAwarded??0),ke=[];if(W>0&&ke.push(`Win ${H(W)}`),oe>0&&ke.push(`Bonus ${H(oe)}`),ge>0&&ke.push(`+${ge} FS`),ke.length>0)return ke.join(" | ")}if(String(i.game||"").toLowerCase()==="jurassic-run"){const W=Number(i?.roundData?.totalWin??i?.totalReturn??0),oe=Number(i?.roundData?.jackpotPayout??0),ge=Number(i?.roundData?.freeSpinsAwarded??0),ke=!!i?.roundData?.isFreeSpinRound,ye=[];if(oe>0?ye.push(`Jackpot ${H(oe)}`):W>0&&ye.push(`Win ${H(W)}`),ge>0&&ye.push(`+${ge} FS`),ye.length>0)return ye.join(" | ");if(ke)return"Free Spin"}if(String(i.game||"").toLowerCase()==="3card-poker"){const W=String(i?.roundData?.mainResultLabel||i?.result||"").trim(),oe=String(i?.playerHand||i?.roundData?.playerHand||"").trim(),ge=String(i?.dealerHand||i?.roundData?.dealerHand||"").trim(),ke=[];return W&&ke.push(W),oe&&ke.push(`P ${oe}`),ge&&ke.push(`D ${ge}`),ke.length>0?ke.join(" | "):"—"}return i.result||"—"},M=i=>{switch(String(i||"").toLowerCase()){case"server_rng":return"Server RNG";case"server_simulated_actions":return"Server Simulation";case"native_client_round":return"Client Native";case"client_actions_server_rules":return"Server Rules";case"":return"—";default:return i||"—"}},Z=i=>{const W=String(i?.label||"").trim();if(W)return W;const oe=String(i?.type||"").trim(),ge=String(i?.value||"").trim();return oe&&ge?`${oe}:${ge}`:oe||"Bet"},he=i=>Array.isArray(i?.bets)?i.bets.filter(W=>W&&typeof W=="object"):[],ae=i=>{const W=new Set(Array.isArray(i?.winningBetKeys)?i.winningBetKeys.map(oe=>String(oe)):[]);return he(i).filter(oe=>W.has(String(oe?.key||"")))},re=i=>{const W=i?.bets&&typeof i.bets=="object"?i.bets:{};return Object.keys(W).filter(oe=>Number(W[oe])>0).sort().map(oe=>({key:oe,amount:Number(W[oe])}))},Re=i=>{const W=Number(i||0);return W>0?"casino-net-pill is-positive":W<0?"casino-net-pill is-negative":"casino-net-pill is-neutral"},C=i=>{const W=String(i||"");return W?`${W.slice(0,10)}…`:"—"},ne=a.useMemo(()=>[{label:"Rounds",value:Number(p?.rounds||0).toLocaleString(),tone:"navy"},{label:"Total Wager",value:H(p?.totalWager),tone:"blue"},{label:"Total Return",value:H(p?.totalReturn),tone:"teal"},{label:"GGR",value:H(p?.grossGamingRevenue),tone:"slate"},{label:"Average Bet",value:H(p?.averageBet),tone:"navy"},{label:"RTP Estimate",value:`${Number(p?.rtpEstimate||0).toFixed(2)}%`,tone:"indigo"},{label:"Payout Ratio",value:`${Number(p?.payoutRatio||0).toFixed(2)}%`,tone:"indigo"},{label:"Anomalies",value:Number(p?.anomalyCount||0).toLocaleString(),tone:"rose"},{label:"Error Rate",value:`${Number(p?.errorRate||0).toFixed(4)}%`,tone:"rose"}],[p]);return e.jsxs("div",{className:"admin-view casino-bets-view",children:[e.jsxs("div",{className:"view-header casino-bets-header",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Casino Bets"}),e.jsx("p",{className:"subtitle",children:"Server-settled casino reporting, settlement ledger, and round-level audit details."})]}),e.jsxs("div",{className:"casino-bets-header-actions",children:[e.jsx("button",{type:"button",className:"btn-small",onClick:G,disabled:u,children:u?"Refreshing…":"Refresh"}),e.jsx("button",{type:"button",className:"btn-small btn-accent",onClick:()=>Kr(t,pe),children:"Export CSV"})]})]}),e.jsxs("div",{className:"view-content casino-bets-content",children:[u&&e.jsx("div",{className:"casino-bets-loading",children:"Loading casino bets…"}),k&&e.jsx("div",{className:"casino-bets-error",children:k}),!u&&!k&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"casino-bets-kpi-grid",children:ne.map(i=>e.jsxs("div",{className:`casino-kpi-card tone-${i.tone}`,children:[e.jsx("span",{className:"casino-kpi-label",children:i.label}),e.jsx("strong",{className:"casino-kpi-value",children:i.value})]},i.label))}),e.jsxs("div",{className:"casino-bets-filters casino-bets-highlights",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Win"}),e.jsx("div",{children:p?.biggestWin?`${p.biggestWin.username||"—"} ${H(p.biggestWin.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Loss"}),e.jsx("div",{children:p?.biggestLoss?`${p.biggestLoss.username||"—"} ${H(p.biggestLoss.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Anomaly Sample"}),e.jsxs("div",{children:[Number(g?.count||0)," flagged rounds"]})]})]}),S.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"GGR"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"RTP"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:S.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:E(i.game)}),e.jsx("td",{children:Number(i.rounds||0).toLocaleString()}),e.jsx("td",{children:H(i.totalWager)}),e.jsx("td",{children:H(i.totalReturn)}),e.jsx("td",{children:H(i.grossGamingRevenue)}),e.jsx("td",{children:H(i.averageBet)}),e.jsxs("td",{children:[Number(i.payoutRatio||0).toFixed(2),"%"]}),e.jsx("td",{children:i.biggestWin!==null&&i.biggestWin!==void 0?H(i.biggestWin):"—"}),e.jsx("td",{children:i.biggestLoss!==null&&i.biggestLoss!==void 0?H(i.biggestLoss):"—"})]},i.game))})]})}),j.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"User ID"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:j.map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:i.username||"—"}),e.jsx("td",{className:"round-id",title:i.userId||"",children:C(i.userId||"")}),e.jsx("td",{children:Number(i.rounds||0).toLocaleString()}),e.jsx("td",{children:H(i.totalWager)}),e.jsx("td",{children:H(i.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Re(i.netResult),children:H(i.netResult)})}),e.jsx("td",{children:H(i.averageBet)}),e.jsx("td",{children:i.biggestWin!==null&&i.biggestWin!==void 0?H(i.biggestWin):"—"}),e.jsx("td",{children:i.biggestLoss!==null&&i.biggestLoss!==void 0?H(i.biggestLoss):"—"})]},`${i.userId||""}:${i.username||""}`))})]})}),Array.isArray(g?.sample)&&g.sample.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Reasons"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsx("tbody",{children:g.sample.map((i,W)=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:i.roundId||"",children:C(i.roundId||"")}),e.jsx("td",{children:i.username||"—"}),e.jsx("td",{children:E(i.game)}),e.jsx("td",{children:Array.isArray(i.reasons)?i.reasons.join(", "):"—"}),e.jsx("td",{children:H(i.totalWager)}),e.jsx("td",{children:H(i.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Re(i.netResult),children:H(i.netResult)})}),e.jsx("td",{children:H(i.balanceBefore)}),e.jsx("td",{children:H(i.balanceAfter)}),e.jsx("td",{children:_(i.createdAt)})]},`${i.roundId||"anomaly"}:${W}`))})]})}),e.jsxs("div",{className:"casino-bets-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Game"}),e.jsxs("select",{value:t.game,onChange:i=>N("game",i.target.value),children:[e.jsx("option",{value:"",children:"All"}),e.jsx("option",{value:"baccarat",children:"Baccarat"}),e.jsx("option",{value:"blackjack",children:"Blackjack"}),e.jsx("option",{value:"craps",children:"Craps"}),e.jsx("option",{value:"arabian",children:"Arabian Game"}),e.jsx("option",{value:"jurassic-run",children:"Jurassic Run"}),e.jsx("option",{value:"3card-poker",children:"3-Card Poker"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Player"}),e.jsx("input",{type:"text",value:t.username,onChange:i=>N("username",i.target.value),placeholder:"username"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User ID"}),e.jsx("input",{type:"text",value:t.userId,onChange:i=>N("userId",i.target.value),placeholder:"user id"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Outcome / Result"}),e.jsx("input",{type:"text",value:t.result,onChange:i=>N("result",i.target.value),placeholder:"Win / Lose / Push / Pending / Player / Banker / 17"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"From"}),e.jsx("input",{type:"date",value:t.from,onChange:i=>N("from",i.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"To"}),e.jsx("input",{type:"date",value:t.to,onChange:i=>N("to",i.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Min Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:t.minWager,onChange:i=>N("minWager",i.target.value),placeholder:"0.00"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Max Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:t.maxWager,onChange:i=>N("maxWager",i.target.value),placeholder:"500.00"})]}),e.jsx("div",{className:"casino-filter-actions",children:e.jsx("button",{type:"button",className:"btn-small",onClick:O,children:"Clear"})})]}),e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Outcome"}),e.jsx("th",{children:"Result"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsxs("tbody",{children:[o.map(i=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:i.roundId||i.id||"",children:C(i.roundId||i.id)}),e.jsx("td",{children:i.username||"—"}),e.jsx("td",{children:E(i.game)}),e.jsx("td",{children:i.roundStatus||"—"}),e.jsx("td",{children:M(i.outcomeSource)}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${Pe(ie(i))}`,children:ie(i)})}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${Pe(z(i))}`,children:z(i)})}),e.jsx("td",{children:H(i.totalWager)}),e.jsx("td",{children:H(i.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Re(i.netResult),children:H(i.netResult)})}),e.jsx("td",{children:H(i.balanceAfter)}),e.jsx("td",{children:_(i.createdAt)}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>ee(i.roundId||i.id),type:"button",children:"View"})})]},i.roundId||i.id)),o.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:13,className:"casino-bets-empty-row",children:"No casino bet rows found."})})]})]})}),e.jsxs("div",{className:"casino-bets-pagination",children:[e.jsxs("span",{className:"casino-page-meta",children:[Number(v?.total||0).toLocaleString()," rows"]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>$(i=>Math.max(1,i-1)),disabled:B<=1,children:"Previous"}),e.jsxs("span",{className:"casino-page-index",children:["Page ",v?.page||B," of ",v?.pages||1]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>$(i=>Math.min(Number(v?.pages||1),i+1)),disabled:(v?.page||B)>=(v?.pages||1),children:"Next"})]})]})]}),(l||R||I)&&e.jsx("div",{className:"modal-overlay",onClick:f,children:e.jsxs("div",{className:"modal-content casino-bets-modal",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{className:"casino-bets-modal-head",children:[e.jsx("h3",{children:"Casino Round Detail"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:f,children:"Close"})]}),R&&e.jsx("div",{className:"casino-bets-loading",children:"Loading round detail…"}),I&&e.jsx("div",{className:"casino-bets-error",children:I}),!R&&l&&e.jsxs("div",{className:"casino-bets-detail",children:[e.jsxs("div",{className:"casino-bets-detail-grid",children:[e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Round"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Round ID"}),e.jsx("code",{children:l.roundId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Request ID"}),e.jsx("code",{children:l.requestId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Game"}),e.jsx("span",{children:E(l.game)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:l.roundStatus||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:M(l.outcomeSource||l?.audit?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Outcome"}),e.jsx("span",{className:`casino-result-badge result-${Pe(ie(l))}`,children:ie(l)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Result"}),e.jsx("span",{className:`casino-result-badge result-${Pe(z(l))}`,children:z(l)})]}),l.playerAction&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Action"}),e.jsx("span",{children:l.playerAction})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Decision"}),e.jsx("span",{children:_(l.serverDecisionAt)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Player"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Username"}),e.jsx("strong",{children:l.username||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"User ID"}),e.jsx("code",{children:l.userId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance Before"}),e.jsx("strong",{children:H(l.balanceBefore)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance After"}),e.jsx("strong",{children:H(l.balanceAfter)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:l.game==="roulette"?"Outcome":l.game==="craps"?"Dice":l.game==="arabian"||l.game==="jurassic-run"?"Spin":l.game==="3card-poker"?"Bet Breakdown":"Cards"}),l.game==="roulette"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Number"}),e.jsx("strong",{children:l.rouletteOutcome?.number??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Color"}),e.jsx("span",{children:l.rouletteOutcome?.color||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Parity"}),e.jsx("span",{children:l.rouletteOutcome?.parity||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Range"}),e.jsx("span",{children:l.rouletteOutcome?.range||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dozen"}),e.jsx("span",{children:l.rouletteOutcome?.dozen||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Column"}),e.jsx("span",{children:l.rouletteOutcome?.column||"—"})]})]}):l.game==="craps"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 1"}),e.jsx("strong",{children:l?.roundData?.dice?.die1??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 2"}),e.jsx("strong",{children:l?.roundData?.dice?.die2??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total"}),e.jsx("strong",{children:l?.roundData?.dice?.sum??l?.result??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State Before"}),e.jsx("span",{children:l?.roundData?.stateBefore||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State After"}),e.jsx("span",{children:l?.roundData?.stateAfter||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point Before"}),e.jsx("span",{children:l?.roundData?.pointNumberBefore??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point After"}),e.jsx("span",{children:l?.roundData?.pointNumberAfter??"—"})]})]}):l.game==="arabian"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Lines"}),e.jsx("strong",{children:l?.roundData?.lineCount??l?.bets?.lines??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Coin Bet"}),e.jsx("strong",{children:H(l?.roundData?.coinBet??l?.bets?.coinBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Spin Bet"}),e.jsx("strong",{children:H(l?.roundData?.totalBet??l?.bets?.totalBet??l?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:H(l?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Win"}),e.jsx("strong",{children:H(l?.roundData?.bonusWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:l?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:l?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:l?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Triggered"}),e.jsx("span",{children:l?.roundData?.bonusTriggered?"Yes":"No"})]})]}):l.game==="jurassic-run"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bet Level"}),e.jsx("strong",{children:Number(l?.roundData?.betId??l?.bets?.betId??0)+1})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Spin Bet"}),e.jsx("strong",{children:H(l?.roundData?.bet??l?.bets?.bet??l?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Paylines"}),e.jsx("strong",{children:l?.roundData?.activePaylines??l?.bets?.paylines??"10"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Bet"}),e.jsx("strong",{children:H(l?.roundData?.lineBet??l?.bets?.lineBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:H(l?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Payout"}),e.jsx("strong",{children:H(l?.roundData?.jackpotPayout??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Before"}),e.jsx("strong",{children:H(l?.roundData?.jackpotBefore??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot After"}),e.jsx("strong",{children:H(l?.roundData?.jackpotAfter??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:l?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:l?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:l?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spin Round"}),e.jsx("span",{children:l?.roundData?.isFreeSpinRound?"Yes":"No"})]})]}):l.game==="3card-poker"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Ante Bet"}),e.jsx("strong",{children:H(l?.bets?.Ante??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Play Bet"}),e.jsx("strong",{children:H(l?.bets?.Play??(Number(l?.bets?.folded)===1?0:l?.bets?.Ante??0))})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Pair Plus Bet"}),e.jsx("strong",{children:H(l?.bets?.PairPlus??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Action"}),e.jsx("span",{children:Number(l?.bets?.folded)===1?"Folded":"Played"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Main Result"}),e.jsx("span",{children:l?.roundData?.mainResultLabel||l?.result||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:l?.playerHand||l?.roundData?.playerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:l?.dealerHand||l?.roundData?.dealerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:l?.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:M(l?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Player Cards"}),e.jsx("div",{className:"casino-card-list",children:(l.playerCards||[]).length>0?(l.playerCards||[]).map(i=>e.jsx("span",{className:"casino-card-chip",children:i},`3cp-p-${i}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer Cards"}),e.jsx("div",{className:"casino-card-list",children:(l.dealerCards||[]).length>0?(l.dealerCards||[]).map(i=>e.jsx("span",{className:"casino-card-chip",children:i},`3cp-d-${i}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Payout Breakdown"}),e.jsxs("div",{className:"casino-card-list",children:[e.jsxs("span",{className:"casino-card-chip",children:["Ante ",H(l?.roundData?.payoutBreakdown?.ante?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Play ",H(l?.roundData?.payoutBreakdown?.play?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Pair+ ",H(l?.roundData?.payoutBreakdown?.pairPlus?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Ante Bonus ",H(l?.roundData?.payoutBreakdown?.anteBonus?.returnAmount??0)]})]})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:l.game==="baccarat"?`Player (${l.playerTotal})`:"Player"}),e.jsx("div",{className:"casino-card-list",children:(l.playerCards||[]).length>0?(l.playerCards||[]).map(i=>e.jsx("span",{className:"casino-card-chip",children:i},`p-${i}`)):e.jsx("span",{children:"—"})})]}),l.game==="baccarat"?e.jsxs("div",{className:"casino-detail-stack",children:[e.jsxs("span",{children:["Banker (",l.bankerTotal,")"]}),e.jsx("div",{className:"casino-card-list",children:(l.bankerCards||[]).length>0?(l.bankerCards||[]).map(i=>e.jsx("span",{className:"casino-card-chip",children:i},`b-${i}`)):e.jsx("span",{children:"—"})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Up Card"}),e.jsx("strong",{children:l.dealerUpCard||"—"})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer"}),e.jsx("div",{className:"casino-card-list",children:(l.dealerCards||[]).length>0?(l.dealerCards||[]).map(i=>e.jsx("span",{className:"casino-card-chip",children:i},`d-${i}`)):e.jsx("span",{children:"—"})})]})]})]})]}),l.game==="roulette"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Roulette Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Placed Bets"}),e.jsx("div",{className:"casino-card-list",children:he(l).length>0?he(l).map(i=>e.jsxs("span",{className:"casino-card-chip",children:[Z(i)," ",H(i.amount)]},String(i.key||`${i.type}-${i.value}`))):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Bets"}),e.jsx("div",{className:"casino-card-list",children:ae(l).length>0?ae(l).map(i=>e.jsxs("span",{className:"casino-card-chip",children:[Z(i)," ",H(i.amount)]},`win-${String(i.key||`${i.type}-${i.value}`)}`)):e.jsx("span",{children:"No winning bets"})})]})]}),l.game==="craps"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Craps Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Active Bets Before Roll"}),e.jsx("div",{className:"casino-card-list",children:re(l).length>0?re(l).map(i=>e.jsxs("span",{className:"casino-card-chip",children:[i.key," ",H(i.amount)]},`craps-bet-${i.key}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Resolved Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.betDetails)&&l.betDetails.length>0?l.betDetails.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(i?.bet||"bet")," ",String(i?.outcome||"—")," ",H(i?.return)]},`craps-res-${W}`)):e.jsx("span",{children:"No resolved bets"})})]})]}),l.game==="arabian"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Arabian Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.roundData?.winningLines)&&l.roundData.winningLines.length>0?l.roundData.winningLines.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:["L",i?.line??"?"," x",i?.num_win??"?"," ",H(i?.amount??0)]},`arabian-line-${W}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Pattern"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.roundData?.pattern)&&l.roundData.pattern.length>0?l.roundData.pattern.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:["R",W+1,": ",Array.isArray(i)?i.join("-"):"—"]},`arabian-pattern-${W}`)):e.jsx("span",{children:"—"})})]})]}),l.game==="jurassic-run"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Jurassic Run Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.roundData?.winningLines)&&l.roundData.winningLines.length>0?l.roundData.winningLines.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:["L",Number(i?.line??0)+1," x",i?.count??"?"," ",i?.symbol||"—"," ",i?.win?H(i.win):""]},`jurassic-line-${W}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Symbols"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.roundData?.symbols)&&l.roundData.symbols.length>0?l.roundData.symbols.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:["C",W+1,": ",Array.isArray(i)?i.join("-"):"—"]},`jurassic-col-${W}`)):e.jsx("span",{children:"—"})})]})]}),l.game==="blackjack"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Blackjack Replay"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Hands"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.betDetails?.hands)&&l.betDetails.hands.length>0?l.betDetails.hands.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(i?.zone||"hand")," ",String(i?.resultType||"—")," ",H(i?.bet)," → ",H(i?.return)]},`bj-hand-${W}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Actions"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.betDetails?.actions)&&l.betDetails.actions.length>0?l.betDetails.actions.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(i?.action||"action")," ",i?.zone?`(${String(i.zone)})`:""]},`bj-action-${W}`)):e.jsx("span",{children:"No action log"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Side Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(l?.betDetails?.sideBets)&&l.betDetails.sideBets.length>0?l.betDetails.sideBets.map((i,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(i?.zone||"zone")," ",String(i?.type||"side")," ",H(i?.stake)," → ",H(i?.return)]},`bj-side-${W}`)):e.jsx("span",{children:"No side bets"})})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Settlement"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Wager"}),e.jsx("strong",{children:H(l.totalWager)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Return"}),e.jsx("strong",{children:H(l.totalReturn)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Net"}),e.jsx("strong",{children:H(l.netResult)})]}),l.playerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:l.playerHand})]}),l.dealerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:l.dealerHand})]}),l.dealerQualifies!==null&&l.dealerQualifies!==void 0&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:l.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Integrity Hash"}),e.jsx("code",{children:l.integrityHash||"—"})]})]})]}),e.jsx("h4",{className:"casino-ledger-title",children:"Ledger Entries"}),e.jsx("div",{className:"casino-ledger-wrap",children:e.jsxs("table",{className:"casino-ledger-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Side"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsxs("tbody",{children:[(l.ledgerEntries||[]).map(i=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`casino-ledger-side ${String(i.entrySide||"").toUpperCase()==="DEBIT"?"side-debit":"side-credit"}`,children:i.entrySide||"—"})}),e.jsx("td",{children:i.type||"—"}),e.jsx("td",{children:H(i.amount)}),e.jsx("td",{children:H(i.balanceBefore)}),e.jsx("td",{children:H(i.balanceAfter)}),e.jsx("td",{children:_(i.createdAt)})]},i.id)),(l.ledgerEntries||[]).length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"casino-ledger-empty",children:"No ledger entries found."})})]})]})})]})]})})]})}const Yo=Object.freeze(Object.defineProperty({__proto__:null,default:jl},Symbol.toStringTag,{value:"Module"})),ua=t=>{const r=Number(t);return Number.isFinite(r)?r:0},we=(t,r=0)=>{if(typeof t=="number")return Number.isFinite(t)?t:ua(r);if(typeof t=="string"){const m=t.trim();if(!m)return ua(r);const p=/^\(.*\)$/.test(m),x=m.replace(/^\((.*)\)$/,"$1").replace(/[^\d.+-]/g,"");if(!x||["+","-",".","+.","-."].includes(x))return ua(r);const S=Number(x);return Number.isFinite(S)?p&&S>0?-S:S:ua(r)}if(t==null||typeof t=="boolean")return ua(r);const o=Number(t);return Number.isFinite(o)?o:ua(r)},wt=t=>{const r=we(t,0),o=Math.round(r);return Math.abs(o)<.5?"neutral":o<0?"neg":"pos"},ys=(t,r)=>String(t||"").localeCompare(String(r||""),void 0,{sensitivity:"base",numeric:!0}),yl=new Set(["admin","agent","master_agent","super_agent"]),vs=t=>{const r=String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!r)return"";const o=r.match(/^[A-Z]+/);return o&&o[0]?o[0]:r.replace(/\d+$/,"")||r},vn=t=>!yl.has(String(t?.role||"").trim().toLowerCase());function vl({onViewChange:t}){const[r,o]=a.useState([]),[m,p]=a.useState([]),[x,S]=a.useState(!0),[L,j]=a.useState(""),[U,g]=a.useState(null),[w,u]=a.useState(null),[d,k]=a.useState(!1),[Q,B]=a.useState(!1),[$,v]=a.useState(null),[b,R]=a.useState(""),[n,I]=a.useState(""),[D,l]=a.useState([]),[Y,pe]=a.useState(!1),[G,N]=a.useState(!0),[ee,f]=a.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:""}),[O,H]=a.useState("player"),[_,E]=a.useState("admin"),[ie,Pe]=a.useState(!1),[z,M]=a.useState(!1),[Z,he]=a.useState(null),[ae,re]=a.useState({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"0",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),[Re,C]=a.useState(!1),[ne,i]=a.useState({customerId:null,username:"",currentBalance:0,nextBalance:""}),[W,oe]=a.useState(""),[ge,ke]=a.useState(""),[ye,Ge]=a.useState(!1),[Oe,Ve]=a.useState({}),[it,qe]=a.useState(null),[Qe,Fe]=a.useState(null),[dt,ht]=a.useState({}),[nt,Ue]=a.useState(""),[Je,lt]=a.useState(!1),[Ke,St]=a.useState(""),[c,F]=a.useState(""),[J,de]=a.useState(!1),[Ne,xe]=a.useState(""),[ve,Le]=a.useState({open:!1,type:"",customerId:null,username:"",value:""}),[He,yt]=a.useState(""),[Dt,kt]=a.useState("");a.useEffect(()=>{(async()=>{try{S(!0);const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!q){o([]),j("Please login to load users.");return}const A=String(localStorage.getItem("userRole")||"").toLowerCase();let te=null;try{te=await la(q,{timeoutMs:3e4})}catch(ce){console.warn("CustomerAdminView: getMe failed, falling back to stored role.",ce)}const X=String(te?.role||A||"admin").toLowerCase();if(E(X),yt(te?.username||""),kt(te?.id||""),Pe(!!te?.viewOnly),X==="agent"){const[ce,ue]=await Promise.all([Pa(q),Qt(q).catch(()=>[])]);o(ce||[]),p(ue||[])}else{const[ce,ue]=await Promise.all([ra(q),Qt(q)]);o(ce||[]),p(ue||[])}if(j(""),te?.username)try{const ce=vs(te.username);if(!ce)return;const{nextUsername:ue}=await $t(ce,q,{type:"player"});f(Ee=>({...Ee,username:ue}))}catch(ce){console.error("Failed to prefetch next username:",ce)}}catch(q){console.error("Error fetching users:",q),j("Failed to load users: "+q.message)}finally{S(!1)}})()},[]);const Xe=async y=>{const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!q)return;f(X=>({...X,agentId:y,referredByUserId:""}));const A=O==="player"?"player":"agent",te=O==="super_agent"?"MA":"";if(y){const X=m.find(ce=>ce.id===y);if(X){F(X.username||"");try{const ce=vs(X.username);if(!ce){f(tt=>({...tt,username:""}));return}const ue=A==="player"?{suffix:te,type:A,agentId:y}:{suffix:te,type:A,...O==="agent"?{agentId:y}:{}},{nextUsername:Ee}=await $t(ce,q,ue);f(tt=>({...tt,username:Ee,agentPrefix:ce}))}catch(ce){console.error("Failed to get next username:",ce)}}}else if(F(""),He)try{const X=vs(He);if(!X){f(Ee=>({...Ee,username:""}));return}const ce={suffix:te,type:A};A==="agent"&&O==="agent"&&(_==="master_agent"||_==="super_agent")&&Dt&&(ce.agentId=Dt);const{nextUsername:ue}=await $t(X,q,ce);f(Ee=>({...Ee,username:ue,agentPrefix:X}))}catch(X){console.error("Failed to fetch username for admin:",X),f(ce=>({...ce,username:""}))}else f(X=>({...X,username:""}))},vt=y=>{if(y==null||y==="")return"—";const q=we(y,NaN);return Number.isNaN(q)?"—":`$${Math.round(q).toLocaleString("en-US")}`};!ie&&!d&&String(ee.username||"").trim()&&String(ee.firstName||"").trim()&&String(ee.lastName||"").trim()&&String(ee.phoneNumber||"").trim()&&String(ee.password||"").trim()&&(O!=="player"||String(ee.minBet??"").trim()!==""&&String(ee.maxBet??"").trim()!==""&&String(ee.creditLimit??"").trim()!==""&&String(ee.balanceOwed??"").trim());const _t=y=>{const q=we(y.balance,0);i({customerId:y.id,username:y.username,currentBalance:q,nextBalance:`${q}`}),C(!0),j("")},Pt=async y=>{y.preventDefault();const{customerId:q,nextBalance:A}=ne,te=Number(A);if(Number.isNaN(te)||te<0){j("Balance must be a non-negative number.");return}try{const X=localStorage.getItem("token")||sessionStorage.getItem("token");if(!X){j("Please login to update balance.");return}u(q),_==="agent"?await fs(q,te,X):await pa(q,{balance:te},X),o(ce=>ce.map(ue=>ue.id===q?{...ue,balance:te,availableBalance:Math.max(0,te-we(ue.pendingBalance,0))}:ue)),C(!1),j("")}catch(X){console.error("Balance update failed:",X),j(X.message||"Failed to update balance")}finally{u(null)}},Nt=y=>{const q=y.id,A={sports:y.settings?.sports??!0,casino:y.settings?.casino??!0,racebook:y.settings?.racebook??!0};return Oe[q]||A},Tt=(y,q)=>{const A=y.id,te=Nt(y);Ve(X=>({...X,[A]:{...te,[q]:!te[q]}}))},Kt=async y=>{const q=y.id,A=Oe[q];if(A)try{const te=localStorage.getItem("token")||sessionStorage.getItem("token");if(!te)return;u(q);const X={settings:{...y.settings||{},sports:!!A.sports,casino:!!A.casino,racebook:!!A.racebook}};_==="agent"?await Bt(q,X,te):await Rt(q,X,te),o(ce=>ce.map(ue=>ue.id===q?{...ue,settings:X.settings}:ue)),Ve(ce=>{const ue={...ce};return delete ue[q],ue}),j("")}catch(te){console.error("Addon save failed:",te),j(te.message||"Failed to save add-ons")}finally{u(null)}},Zt=async y=>{const q=y.id,A=window.prompt(`Enter new password for ${y.username}:`,"");if(A===null)return;const te=A.toUpperCase();if(te.length<6){alert("Password must be at least 6 characters long");return}try{const X=localStorage.getItem("token")||sessionStorage.getItem("token");if(!X){j("Please login to reset password.");return}u(q),await gs(q,te,X),o(ce=>ce.map(ue=>ue.id===q?{...ue,displayPassword:te}:ue)),alert(`Password for ${y.username} has been reset successfully.`),j("")}catch(X){console.error("Password reset failed:",X),j(X.message||"Failed to reset password")}finally{u(null)}},It=y=>{he(y),re({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),M(!0)},At=async y=>{y.preventDefault();const q=Z.id;try{const A=localStorage.getItem("token")||sessionStorage.getItem("token"),te={};ae.phoneNumber.trim()&&(te.phoneNumber=ae.phoneNumber.trim()),ae.firstName.trim()&&(te.firstName=ae.firstName.trim()),ae.lastName.trim()&&(te.lastName=ae.lastName.trim()),ae.fullName.trim()&&(te.fullName=ae.fullName.trim()),ae.password.trim()&&(te.password=ae.password.trim()),ae.minBet!==""&&(te.minBet=Number(ae.minBet)),ae.maxBet!==""&&(te.maxBet=Number(ae.maxBet)),ae.creditLimit!==""&&(te.creditLimit=Number(ae.creditLimit)),ae.balanceOwed!==""&&(te.balanceOwed=Number(ae.balanceOwed));const X=Object.entries(ae.apps||{}).filter(([,ce])=>(ce||"").trim()!=="");if(X.length>0&&(te.apps=Object.fromEntries(X.map(([ce,ue])=>[ce,ue.trim()]))),Object.keys(te).length===0){j("Enter at least one value before saving.");return}_==="agent"?await Bt(q,te,A):await Rt(q,te,A),o(ce=>ce.map(ue=>ue.id===q?{...ue,...te}:ue)),M(!1),j("")}catch(A){console.error("Update customer failed:",A),j(A.message||"Failed to update customer")}},xt=a.useMemo(()=>m.filter(y=>_==="admin"||_==="super_agent"||_==="master_agent"),[m,_]);a.useEffect(()=>{if(O!=="player")return;const y=String(c||"").trim().toLowerCase();if(!y)return;const q=xt.find(te=>String(te.username||"").trim().toLowerCase()===y);if(!q)return;const A=String(q.id||"");A&&String(ee.agentId||"")!==A&&Xe(A)},[c,xt,O,ee.agentId]);const ut=y=>{if(!y)return"";if(typeof y=="string")return y;if(typeof y=="object"){if(typeof y.id=="string")return y.id;if(typeof y.$oid=="string")return y.$oid}return""};a.useMemo(()=>xt.filter(y=>c.trim()?(y.username||"").toLowerCase().includes(c.trim().toLowerCase()):!0),[xt,c]);const Xt=a.useMemo(()=>xt.filter(y=>nt.trim()?(y.username||"").toLowerCase().includes(nt.trim().toLowerCase()):!0),[xt,nt]),ea=a.useMemo(()=>r.filter(vn),[r]),Et=a.useMemo(()=>Us(ea),[ea]),P=xt.find(y=>ut(y.id)===ut(Ke)),T=!!P&&(P.role==="master_agent"||P.role==="super_agent"),be=ut(Ke),V=a.useMemo(()=>!T||!be?[]:xt.filter(y=>{if((y.role||"").toLowerCase()!=="agent")return!1;const q=ut(y.createdBy),A=ut(y.parentAgentId),te=be;return q===te||A===te}),[T,xt,be]),De=a.useMemo(()=>{let y=Et;if(Ke)if(!T)y=Et.filter(te=>ut(te.agentId)===be);else{const te=new Set(V.map(X=>ut(X.id)).filter(Boolean));y=Et.filter(X=>te.has(ut(X.agentId)))}const q=new Set(D.map(te=>String(te).toUpperCase()));return[...!Y||D.length===0?y:y.filter(te=>q.has(String(te.username||"").toUpperCase()))].sort((te,X)=>ys(String(te?.username||""),String(X?.username||"")))},[Ke,T,Et,V,be,Y,D]),Me=a.useMemo(()=>{const y=String(He||"").trim().toUpperCase();return _==="admin"?"ADMIN":_==="master_agent"||_==="super_agent"?y||"MASTER":_==="agent"?y||"AGENT":""},[He,_]),We=a.useMemo(()=>{const y=new Map;xt.forEach(ce=>{const ue=ut(ce.id);ue&&y.set(ue,ce)});const q=ce=>{const ue=ut(ce?.agentId);if(!ue)return"UNASSIGNED";const Ee=[];let tt=ue;const bt=new Set;for(;tt&&!bt.has(tt);){bt.add(tt);const ga=y.get(tt);if(!ga)break;const Ma=String(ga.username||"").trim().toUpperCase();Ma&&Ee.push(Ma);const zs=String(ga.createdByModel||""),Ba=ut(ga.createdBy);if(zs!=="Agent"||!Ba)break;tt=Ba}const zt=Ee.reverse().filter(Boolean);return zt.length===0?Me?`${Me} / UNASSIGNED`:"UNASSIGNED":Me&&zt[0]!==Me?`${Me} / ${zt.join(" / ")}`:zt.join(" / ")},A=new Map;De.forEach(ce=>{const ue=q(ce);A.has(ue)||A.set(ue,[]),A.get(ue).push(ce)});const te=Array.from(A.entries()).sort(([ce],[ue])=>ys(ce,ue)),X=[];return te.forEach(([ce,ue])=>{X.push({type:"group",label:ce}),[...ue].sort((Ee,tt)=>ys(String(Ee?.username||""),String(tt?.username||""))).forEach(Ee=>X.push({type:"player",player:Ee,hierarchyPath:ce}))}),X},[xt,De,Me]),Ce=De,$e=y=>{oe(y),ke(""),Ge(!0)},Ie=()=>{switch(W){case"minBet":return"Min Bet";case"maxBet":return"Max Bet";case"creditLimit":return"Credit Limit";case"settleLimit":return"Settle Limit";case"balanceAdjust":return"Balance Adjustment";case"status":return"Status";default:return""}},ot=y=>{const q=(y||"").toString().toLowerCase();return q==="active"?"Active":q==="read_only"||q==="readonly"?"Read Only":"Disabled"},Ct=async y=>{y.preventDefault();const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!q){j("Please login to update players.");return}if(Ce.length===0){j("No players available for bulk update.");return}let A=null;const te=new Set(Ce.map(X=>X.id));if(W==="status")A={status:ge||"active"};else if(W==="balanceAdjust"){const X=Number(ge);if(Number.isNaN(X)){j("Please enter a valid number for balance adjustment.");return}u("bulk-update"),await Promise.all(Ce.map(ce=>{const ue=ce.id,Ee=we(ce.balance,0)+X;return _==="agent"?fs(ue,Ee,q):pa(ue,{balance:Ee},q)})),o(ce=>ce.map(ue=>{const Ee=ue.id;return te.has(Ee)?{...ue,balance:we(ue.balance,0)+X}:ue})),Ge(!1),j(""),u(null);return}else{const X=Number(ge);if(Number.isNaN(X)||X<0){j("Please enter a valid non-negative number.");return}W==="minBet"&&(A={minBet:X}),W==="maxBet"&&(A={maxBet:X,wagerLimit:X}),W==="creditLimit"&&(A={creditLimit:X}),W==="settleLimit"&&(A={balanceOwed:X})}try{u("bulk-update"),await Promise.all(Ce.map(X=>{const ce=X.id;return _==="agent"?Bt(ce,A,q):Rt(ce,A,q)})),o(X=>X.map(ce=>{const ue=ce.id;return te.has(ue)?{...ce,...A}:ce})),Ge(!1),j("")}catch(X){console.error("Bulk update failed:",X),j(X.message||"Failed to update players")}finally{u(null)}},et=(()=>{const y=r.filter(vn);return O!=="player"&&O!=="agent"&&O!=="super_agent"?[]:_==="agent"?y:ee.agentId?y.filter(q=>String(q.agentId?.id||q.agentId||"")===String(ee.agentId)):y})(),gt=a.useMemo(()=>et.map(y=>{const q=String(y.id||"").trim(),A=String(y.username||"").trim(),te=String(y.fullName||"").trim();if(!q||!A)return null;const X=`${A.toUpperCase()}${te?` - ${te}`:""}`;return{id:q,label:X,labelLower:X.toLowerCase(),usernameLower:A.toLowerCase()}}).filter(Boolean),[et]),mt=a.useMemo(()=>{const y=String(ee.referredByUserId||"").trim();return y&&gt.find(q=>q.id===y)||null},[ee.referredByUserId,gt]);a.useEffect(()=>{if(mt){xe(mt.label);return}String(ee.referredByUserId||"").trim()||xe("")},[mt,ee.referredByUserId]);const pt=y=>{t&&t("user-details",y.id)},ft=async y=>{const q=y.role==="agent"||y.role==="master_agent",A=q?"Agent":"Player",te=window.prompt(`🚨 DELETE ${A.toUpperCase()} WARNING 🚨

You are about to delete ${A} "${y.username}".

This will remove them from all active lists.

To confirm, type the username exactly: ${y.username}`);if(te!==null){if(te.trim().toUpperCase()!==String(y.username).trim().toUpperCase()){alert("Username did not match. Deletion cancelled.");return}try{const X=localStorage.getItem("token")||sessionStorage.getItem("token");if(!X){j("Please login to delete.");return}u(y.id),q?await Xr(y.id,X):await ei(y.id,X),o(ce=>ce.filter(ue=>ue.id!==y.id)),q&&p(ce=>ce.filter(ue=>ue.id!==y.id)),alert(`${A} "${y.username}" deleted successfully.`),j("")}catch(X){console.error("Delete failed:",X),alert(`Failed to delete: ${X.message}`)}finally{u(null)}}},ct=y=>{const q=y.id;return dt[q]||{firstName:y.firstName||"",lastName:y.lastName||"",password:"",minBet:String(y.minBet??0),maxBet:String(y.maxBet??y.wagerLimit??0),creditLimit:String(y.creditLimit??0),settleLimit:String(y.balanceOwed??0),status:(y.status||"active").toLowerCase(),sports:y.settings?.sports??!0,casino:y.settings?.casino??!0,racebook:y.settings?.racebook??!0}},ta=y=>{const q=y.id;qe(A=>A===q?null:q),Fe(A=>A===q?null:A)},at=y=>{const q=y.id;qe(q),Fe(q),ht(A=>({...A,[q]:ct(y)}))},Lt=(y,q,A)=>{const te=y.id,X=ct(y);ht(ce=>({...ce,[te]:{...X,...ce[te]||{},[q]:A}}))},oa=async y=>{const q=y.id,A=ct(y),te=localStorage.getItem("token")||sessionStorage.getItem("token");if(!te)return;const X={firstName:A.firstName.trim(),lastName:A.lastName.trim(),fullName:`${A.firstName.trim()} ${A.lastName.trim()}`.trim(),minBet:Number(A.minBet||0),maxBet:Number(A.maxBet||0),wagerLimit:Number(A.maxBet||0),creditLimit:Number(A.creditLimit||0),balanceOwed:Number(A.settleLimit||0),status:A.status,settings:{...y.settings||{},sports:!!A.sports,casino:!!A.casino,racebook:!!A.racebook}};try{if(u(q),_==="agent"?await Bt(q,X,te):await Rt(q,X,te),(A.password||"").trim()!==""){const ce=A.password.trim().toUpperCase();_==="admin"?await gs(q,ce,te):await Bt(q,{password:ce},te)}o(ce=>ce.map(ue=>ue.id===q?{...ue,...X,...A.password.trim()!==""?{displayPassword:A.password.trim().toUpperCase()}:{}}:ue)),Fe(null),ht(ce=>{const ue={...ce};return delete ue[q],ue}),j("")}catch(ce){console.error("Inline save failed:",ce),j(ce.message||"Failed to save user details")}finally{u(null)}},xa=(y,q)=>{const A=y.id;let te="";q==="name"&&(te=`${y.firstName||""} ${y.lastName||""}`.trim()),q==="password"&&(te=y.displayPassword||""),q==="balance"&&(te=String(y.balance??0)),Le({open:!0,type:q,customerId:A,username:y.username,value:te})},Ta=async y=>{y.preventDefault();const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!(!q||!ve.customerId))try{if(u(ve.customerId),ve.type==="name"){const A=ve.value.trim().split(/\s+/).filter(Boolean),te=A[0]||"",X=A.slice(1).join(" "),ce={firstName:te,lastName:X,fullName:ve.value.trim()};_==="agent"?await Bt(ve.customerId,ce,q):await Rt(ve.customerId,ce,q),o(ue=>ue.map(Ee=>Ee.id===ve.customerId?{...Ee,...ce}:Ee))}if(ve.type==="password"){const A=ve.value.trim().toUpperCase();if(A.length<6){j("Password must be at least 6 characters.");return}_==="admin"?await gs(ve.customerId,A,q):await Bt(ve.customerId,{password:A},q),o(te=>te.map(X=>X.id===ve.customerId?{...X,displayPassword:A}:X))}if(ve.type==="balance"){const A=Number(ve.value);if(Number.isNaN(A)){j("Balance must be numeric.");return}_==="agent"?await fs(ve.customerId,A,q):await pa(ve.customerId,{balance:A},q),o(te=>te.map(X=>X.id===ve.customerId?{...X,balance:A}:X))}Le({open:!1,type:"",customerId:null,username:"",value:""}),j("")}catch(A){console.error("Quick edit failed:",A),j(A.message||"Failed to update value")}finally{u(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Administration Console"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"},children:e.jsxs("div",{className:"agent-search-picker header-agent-picker",onFocus:()=>lt(!0),onBlur:()=>setTimeout(()=>lt(!1),120),tabIndex:0,children:[e.jsxs("div",{className:"agent-search-head",children:[e.jsx("span",{className:"agent-search-label",children:"Agents"}),e.jsx("input",{type:"text",value:nt,onChange:y=>{Ue(y.target.value),lt(!0)},placeholder:"Search agent..."})]}),Je&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${Ke?"":"selected"}`,onClick:()=>{St(""),Ue(""),lt(!1)},children:e.jsx("span",{children:"All Agents"})}),Xt.map(y=>{const q=y.id,A=y.role==="master_agent"||y.role==="super_agent";return e.jsxs("button",{type:"button",className:`agent-search-item ${String(Ke||"")===String(q)?"selected":""}`,onClick:()=>{St(q),Ue(y.username||""),lt(!1)},children:[e.jsx("span",{children:y.username}),e.jsx("span",{className:`agent-type-badge ${A?"master":"agent"}`,children:A?"M":"A"})]},q)}),Xt.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching agents"})]})]})})]}),e.jsxs("div",{className:"view-content",children:[x&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading Entries..."})]}),L&&e.jsx("div",{className:"error-state",children:L}),U&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:U.message}),U.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:U.matches.map((y,q)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(y.username||"UNKNOWN")}),e.jsx("span",{children:String(y.fullName||"No name")}),e.jsx("span",{children:String(y.phoneNumber||"No phone")})]},`${y.id||y.username||"duplicate"}-${q}`))})]}),n&&e.jsx("div",{className:"success-state",children:n}),D.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",D.slice(0,20).join(", "),D.length>20?` (+${D.length-20} more)`:"",e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"12px",padding:"6px 10px"},onClick:()=>pe(y=>!y),children:Y?"Show All Players":"Show Imported Only"})]}),!x&&e.jsxs(e.Fragment,{children:[!1,e.jsx("div",{className:"table-container",children:e.jsx("div",{className:"scroll-wrapper",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Password"}),e.jsx("th",{children:"Name"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("minBet"),children:"Min Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("maxBet"),children:"Max Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("creditLimit"),children:"Credit Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("settleLimit"),children:"Settle Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("balanceAdjust"),children:"Balance"}),e.jsx("th",{children:"Lifetime"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>$e("status"),children:"Status"}),e.jsx("th",{children:"Sportsbook"}),e.jsx("th",{children:"Casino"}),e.jsx("th",{children:"Horses"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:We.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:14,className:"empty-msg",children:"No records found."})}):We.map((y,q)=>{if(y.type==="group")return e.jsx("tr",{className:"agent-group-row",children:e.jsx("td",{colSpan:14,children:y.label})},`group-${y.label}-${q}`);const A=y.player,te=A.id,X=Nt(A),ce=!!Oe[te],ue=it===te,Ee=Qe===te,tt=ct(A);return e.jsxs(Os.Fragment,{children:[e.jsxs("tr",{className:`customer-row role-${A.role} ${A.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("td",{className:"user-cell",children:[e.jsxs("div",{className:"user-cell-main",children:[e.jsx("button",{className:"user-link-btn",onClick:()=>pt(A),children:e.jsx("span",{className:"customer-username",children:A.username.toUpperCase()})}),A.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"}),e.jsx("span",{className:"customer-tree-path",children:String(y.hierarchyPath||"UNASSIGNED").toUpperCase()})]}),A.role==="user"&&e.jsx("button",{className:"row-expand-btn",type:"button",onClick:()=>ta(A),children:ue?"⌄":"›"})]}),e.jsx("td",{className:"pass-cell",children:e.jsx("span",{children:A.displayPassword||"—"})}),e.jsx("td",{children:`${A.firstName||""} ${A.lastName||""}`.trim()||"—"}),e.jsx("td",{children:we(A.minBet,0).toLocaleString("en-US")}),e.jsx("td",{children:we(A.maxBet??A.wagerLimit,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:we(A.creditLimit??1e3,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:we(A.balanceOwed,0).toLocaleString("en-US")}),e.jsx("td",{className:`balance-cell ${wt(A.balance)}`,children:vt(A.balance)}),e.jsx("td",{children:we(A.lifetime,0).toLocaleString("en-US")}),e.jsx("td",{children:ot(A.status)}),e.jsx("td",{children:A.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!X.sports,onChange:()=>Tt(A,"sports")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:A.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!X.casino,onChange:()=>Tt(A,"casino")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:A.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!X.racebook,onChange:()=>Tt(A,"racebook")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:e.jsxs("div",{className:"action-buttons-cell",style:{display:"flex",gap:"8px"},children:[A.role==="user"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:`btn-secondary ${ce?"btn-save-dirty":"btn-save-clean"}`,type:"button",onClick:()=>Kt(A),disabled:!ce||w===te,children:"Save"}),e.jsx("button",{className:"btn-secondary",type:"button",onClick:()=>Ee?oa(A):at(A),disabled:w===te,children:Ee?"SAVE":"EDIT"})]}):e.jsx("button",{className:"btn-icon",title:"Edit Customer",onClick:()=>It(A),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),_==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>ft(A),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]})})]}),A.role==="user"&&ue&&e.jsx("tr",{className:"expanded-detail-row",children:e.jsx("td",{colSpan:14,children:e.jsxs("div",{className:`expanded-detail-grid ${Ee?"is-editing":""}`,children:[e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Password"}),e.jsx("span",{children:A.displayPassword||"—"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Name"}),e.jsxs("span",{children:[`${A.firstName||""} ${A.lastName||""}`.trim()||"—"," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>xa(A,"name"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Min Bet"}),e.jsx("span",{children:Ee?e.jsx("input",{type:"number",value:tt.minBet,onChange:bt=>Lt(A,"minBet",bt.target.value)}):`$${we(A.minBet,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Bet"}),e.jsx("span",{children:Ee?e.jsx("input",{type:"number",value:tt.maxBet,onChange:bt=>Lt(A,"maxBet",bt.target.value)}):`$${we(A.maxBet??A.wagerLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Credit Limit"}),e.jsx("span",{children:Ee?e.jsx("input",{type:"number",value:tt.creditLimit,onChange:bt=>Lt(A,"creditLimit",bt.target.value)}):`$${we(A.creditLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Settle Limit"}),e.jsx("span",{children:Ee?e.jsx("input",{type:"number",value:tt.settleLimit,onChange:bt=>Lt(A,"settleLimit",bt.target.value)}):`$${we(A.balanceOwed,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Balance"}),e.jsxs("span",{className:wt(A.balance),children:[vt(A.balance)," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>xa(A,"balance"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Lifetime"}),e.jsx("span",{children:we(A.lifetime,0).toLocaleString("en-US")})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Pending"}),e.jsx("span",{children:vt(A.pendingBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Available"}),e.jsx("span",{children:vt(A.availableBalance??A.balance??0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"FP Balance"}),e.jsx("span",{children:vt(A.freeplayBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Payout"}),e.jsx("span",{children:"$6,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:Ee?e.jsxs("select",{value:tt.status,onChange:bt=>Lt(A,"status",bt.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):ot(A.status)})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Payout"}),e.jsx("span",{children:"$5,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Soccer Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Sportsbook"}),e.jsx("span",{children:Ee?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!tt.sports,onChange:()=>Lt(A,"sports",!tt.sports)}),e.jsx("span",{className:"slider-mini"})]}):A.settings?.sports??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Casino"}),e.jsx("span",{children:Ee?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!tt.casino,onChange:()=>Lt(A,"casino",!tt.casino)}),e.jsx("span",{className:"slider-mini"})]}):A.settings?.casino??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Horses"}),e.jsx("span",{children:Ee?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!tt.racebook,onChange:()=>Lt(A,"racebook",!tt.racebook)}),e.jsx("span",{className:"slider-mini"})]}):A.settings?.racebook??!0?"On":"Off"})]})]})]})})})]},te)})})]})})}),z&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit ",Z?.role==="user"?"Player":Z?.role==="agent"?"Agent":"Master Agent",": ",Z?.username]}),e.jsxs("form",{onSubmit:At,children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:ae.firstName,onChange:y=>re({...ae,firstName:y.target.value}),placeholder:Z?.firstName||"First name"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:ae.lastName,onChange:y=>re({...ae,lastName:y.target.value}),placeholder:Z?.lastName||"Last name"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:ae.phoneNumber,onChange:y=>re({...ae,phoneNumber:y.target.value}),placeholder:Z?.phoneNumber||"Phone number"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:ae.minBet,onChange:y=>re({...ae,minBet:y.target.value}),placeholder:`${Z?.minBet??25}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:ae.maxBet,onChange:y=>re({...ae,maxBet:y.target.value}),placeholder:`${Z?.maxBet??200}`})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:ae.creditLimit,onChange:y=>re({...ae,creditLimit:y.target.value}),placeholder:`${Z?.creditLimit??1e3}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Settle Limit:"}),e.jsx("input",{type:"number",value:ae.balanceOwed,onChange:y=>re({...ae,balanceOwed:y.target.value}),placeholder:`${Z?.balanceOwed??0}`})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:ae.password,onChange:y=>re({...ae,password:y.target.value.toUpperCase()})})]}),e.jsxs("div",{className:"action-buttons",children:[e.jsx("button",{className:"btn-icon",title:"View Details",onClick:()=>pt(Z),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]})}),e.jsx("button",{className:"btn-icon",title:"Detailed View (Edit)",onClick:()=>It(Z),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),e.jsx("button",{className:"btn-icon",title:"Adjust Balance / Settle",onClick:()=>_t(Z),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"23"}),e.jsx("path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"})]})}),e.jsx("button",{className:"btn-icon",title:"Reset Password",onClick:()=>Zt(Z),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})}),_==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>ft(Z),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]}),e.jsxs("div",{className:"payment-apps-section",children:[e.jsx("h4",{className:"section-title",style:{color:"#0d3b5c",marginBottom:"15px"},children:"Payment Apps"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Venmo"}),e.jsx("input",{type:"text",value:ae.apps.venmo,onChange:y=>re({...ae,apps:{...ae.apps,venmo:y.target.value}}),placeholder:"@username"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cashapp"}),e.jsx("input",{type:"text",value:ae.apps.cashapp,onChange:y=>re({...ae,apps:{...ae.apps,cashapp:y.target.value}}),placeholder:"$cashtag"})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Apple Pay"}),e.jsx("input",{type:"text",value:ae.apps.applePay,onChange:y=>re({...ae,apps:{...ae.apps,applePay:y.target.value}}),placeholder:"Phone/Email"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Zelle"}),e.jsx("input",{type:"text",value:ae.apps.zelle,onChange:y=>re({...ae,apps:{...ae.apps,zelle:y.target.value}}),placeholder:"Phone/Email"})]})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>M(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"auto",backgroundColor:"#17a2b8",color:"white"},onClick:()=>{const y=ae.password||"N/A",q=`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${ae.username||Z.username}
Password: ${y}
Min bet: $${ae.minBet}
Max bet: $${ae.maxBet}
Credit: $${ae.creditLimit}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click “Use your freeplay balance $” (If you don’t you’re using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count. 

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;navigator.clipboard.writeText(q).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]})]})]})}),ye&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Ie()]}),e.jsxs("form",{onSubmit:Ct,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Ie()}),W==="status"?e.jsxs("select",{value:ge,onChange:y=>ke(y.target.value),required:!0,children:[e.jsx("option",{value:"",children:"Select status"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):e.jsx("input",{type:"number",step:"1",min:W==="balanceAdjust"?void 0:"0",value:ge,onChange:y=>ke(y.target.value),placeholder:W==="balanceAdjust"?"Enter + / - amount":"Enter amount",required:!0})]}),e.jsx("p",{className:"bulk-edit-hint",children:W==="balanceAdjust"?"This adds or subtracts from balance for all players shown in the current list.":"This updates all players shown in the current list."}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:w==="bulk-update",children:w==="bulk-update"?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Ge(!1),children:"Cancel"})]})]})]})}),ve.open&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",ve.type==="name"?"Name":ve.type==="password"?"Password":"Balance",": ",ve.username]}),e.jsxs("form",{onSubmit:Ta,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:ve.type==="name"?"Name":ve.type==="password"?"Password":"Balance"}),e.jsx("input",{type:ve.type==="balance"?"number":"text",value:ve.value,onChange:y=>Le(q=>({...q,value:ve.type==="password"?y.target.value.toUpperCase():y.target.value})),autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:w===ve.customerId,children:w===ve.customerId?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Le({open:!1,type:"",customerId:null,username:"",value:""}),children:"Cancel"})]})]})]})}),Re&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-glass-content",children:[e.jsxs("h3",{children:["Adjust Balance: ",ne.username]}),e.jsxs("form",{onSubmit:Pt,children:[e.jsxs("div",{className:"premium-field-info",children:[e.jsx("label",{children:"Current Net Balance"}),e.jsx("div",{className:`large-val ${wt(ne.currentBalance)}`,children:vt(ne.currentBalance)})]}),e.jsxs("div",{className:"p-field",children:[e.jsx("label",{children:"New Net Balance"}),e.jsxs("div",{className:"input-with-symbol",children:[e.jsx("span",{className:"sym",children:"$"}),e.jsx("input",{type:"number",step:"0.01",value:ne.nextBalance,onChange:y=>i({...ne,nextBalance:y.target.value}),autoFocus:!0,required:!0})]}),e.jsx("small",{className:"field-hint",children:"Setting a new net balance will adjust the credit/owed amount accordingly."})]}),e.jsxs("div",{className:"modal-premium-actions",children:[e.jsx("button",{type:"submit",className:"btn-save-premium",disabled:w!==null,children:w!==null?"Updating...":"Confirm Adjustment"}),e.jsx("button",{type:"button",className:"btn-cancel-premium",onClick:()=>C(!1),children:"Cancel"})]})]})]})}),e.jsx("style",{children:`
        .premium-admin-theme { 
          background: #0f172a; 
          min-height: 100vh; color: #f8fafc; 
          font-family: 'Inter', sans-serif;
          padding: 24px;
        }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; border: none; padding: 0; }
        .header-icon-title { display: flex; align-items: center; gap: 16px; }
        .glow-accent { width: 8px; height: 32px; background: #3b82f6; border-radius: 4px; box-shadow: 0 0 15px #3b82f6; }
        .view-header h2 { font-size: 28px; font-weight: 800; margin: 0; color: #0f172a; }
        
        .btn-create-premium {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white; border: none; padding: 12px 24px; border-radius: 12px;
          font-weight: 700; display: flex; align-items: center; gap: 10px;
          cursor: pointer; box-shadow: 0 10px 20px rgba(37,99,235,0.2);
          transition: all 0.2s;
        }
        .btn-create-premium:hover { transform: translateY(-2px); box-shadow: 0 15px 30px rgba(37,99,235,0.3); }

        .premium-toolbar {
          background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 20px;
          margin-bottom: 32px; backdrop-filter: blur(10px);
        }
        .toolbar-section { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
        .t-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
        .t-group.small { flex: 0 1 100px; min-width: 80px; }
        .t-group label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .t-group input, .t-group select {
          background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white;
          padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none; transition: all 0.2s;
        }
        .t-group input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .readonly-input { background: rgba(0,0,0,0.2) !important; color: #64748b !important; }

        .btn-submit-premium {
          background: #f8fafc; color: #0f172a; border: none; padding: 12px 24px;
          border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-submit-premium:hover { background: #fff; transform: scale(1.02); }

        .agent-search-picker {
          position: relative;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #f8fafc;
        }
        .header-agent-picker {
          min-width: 320px;
          max-width: 420px;
        }
        .agent-search-head {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
        }
        .agent-search-label {
          padding: 8px 10px;
          border-right: 1px solid #cbd5e1;
          color: #334155;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .agent-search-head input {
          border: none !important;
          background: transparent !important;
          padding: 8px 10px !important;
          outline: none;
        }
        .agent-search-list {
          position: absolute;
          z-index: 30;
          left: 0;
          right: 0;
          top: calc(100% + 4px);
          max-height: 220px;
          overflow-y: auto;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 12px 22px rgba(15, 23, 42, 0.15);
        }
        .agent-search-item {
          width: 100%;
          border: none;
          background: #fff;
          padding: 8px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          font-size: 13px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
        }
        .agent-search-item:hover,
        .agent-search-item.selected {
          background: #e2f2ff;
        }
        .agent-type-badge {
          font-weight: 800;
          font-size: 13px;
          line-height: 1;
        }
        .agent-type-badge.master { color: #0f8a0f; }
        .agent-type-badge.agent { color: #dc2626; }
        .agent-search-empty {
          padding: 10px;
          color: #64748b;
          font-size: 12px;
        }
        .duplicate-warning-state {
          border: 1px solid #f1d178;
          border-radius: 10px;
          background: #fff8dd;
          color: #6b4e00;
          padding: 12px;
          margin-bottom: 10px;
        }
        .duplicate-warning-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .duplicate-warning-message {
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .duplicate-warning-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .duplicate-warning-item {
          display: grid;
          grid-template-columns: minmax(78px, auto) 1fr;
          gap: 2px 10px;
          border: 1px solid #ecd28b;
          border-radius: 8px;
          background: #fffdf2;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.25;
        }
        .duplicate-warning-item strong {
          color: #4f3200;
        }
        .duplicate-warning-item span:last-child {
          color: #6f5400;
        }

        .table-glass-container {
          background: rgba(30, 41, 59, 0.3); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px; padding: 20px;
        }
        .table-actions { margin-bottom: 20px; display: flex; justify-content: space-between; }
        .clickable-col-head { cursor: pointer; text-decoration: underline; text-decoration-style: dotted; }
        .clickable-col-head:hover { color: #3b82f6; }

        .scroll-wrapper { overflow-x: auto; }
        .row-expand-btn {
          border: none;
          background: transparent;
          color: #475569;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          margin-left: 8px;
        }
        .user-cell {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }
        .user-cell-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
        }
        .duplicate-player-badge {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.25px;
          text-transform: uppercase;
          color: #5f4200;
          background: #ffe58a;
          border: 1px solid #e3c14f;
        }
        .expanded-detail-row td {
          background: #f0f6b3;
          padding: 12px 16px;
        }
        .expanded-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .detail-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
        }
        .detail-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 15px;
          color: #1e293b;
        }
        .detail-line:last-child {
          border-bottom: none;
        }
        .detail-line span.pos { color: #10b981; }
        .detail-line span.neg { color: #ef4444; }
        .detail-line span.neutral { color: #000000; }
        .detail-line input,
        .detail-line select {
          width: 140px;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 14px;
          color: #0f172a;
          background: #fff;
        }
        .link-edit-btn {
          border: none;
          background: transparent;
          color: #2563eb;
          text-decoration: underline;
          cursor: pointer;
          margin-left: 8px;
          font-size: 12px;
          text-transform: uppercase;
        }
        .premium-table { width: 100%; border-collapse: separate; border-spacing: 0 8px; }
        .premium-table th { text-align: left; padding: 12px 16px; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 800; }
        .customer-row { background: rgba(255,255,255,0.02); transition: all 0.2s; }
        .customer-row:hover { background: rgba(255,255,255,0.05); transform: translateY(-1px); }
        .customer-row.is-duplicate-player td {
          background: #fff9c9;
          border-top-color: #ecd48a;
          border-bottom-color: #ecd48a;
        }
        .customer-row.is-duplicate-player:hover td {
          background: #fff3aa;
        }
        .customer-row td { padding: 16px; border-top: 1px solid rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.02); }
        .customer-row td:first-child { border-left: 1px solid rgba(255,255,255,0.02); border-radius: 12px 0 0 12px; }
        .customer-row td:last-child { border-right: 1px solid rgba(255,255,255,0.02); border-radius: 0 12px 12px 0; }
        .agent-group-row td {
          background: #073b53;
          color: #e8f5ff;
          font-weight: 700;
          letter-spacing: 0.3px;
          padding: 9px 12px;
          text-transform: uppercase;
          font-size: 12px;
        }
        .customer-tree-path {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.25px;
          text-transform: uppercase;
          line-height: 1.2;
          word-break: break-word;
          max-width: 260px;
        }

        .user-link-btn {
          background: none; border: none; display: flex; align-items: center; gap: 12px;
          color: #3b82f6; font-weight: 700; cursor: pointer; padding: 0;
        }
        .user-link-btn > .customer-username {
          color: #1f6fd1;
          text-decoration: underline;
          text-underline-offset: 2px;
          text-decoration-thickness: 1.5px;
        }
        .btn-save-clean {
          background: #94a3b8 !important;
          color: #fff !important;
          opacity: 0.7;
        }
        .btn-save-dirty {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
          color: #fff !important;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
        }
        .btn-save-dirty:hover {
          filter: brightness(1.05);
        }
        .avatar-small {
          width: 32px; height: 32px; background: #334155; color: white;
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 800; border: 2px solid rgba(59,130,246,0.3);
        }
        
        .highlight-cell { color: #10b981; font-weight: 700; }
        .balance-cell button {
          background: none; border: none; font-weight: 800; cursor: pointer;
          color: inherit; text-decoration: underline; text-decoration-style: dotted;
        }
        .balance-cell.pos { color: #10b981; }
        .balance-cell.neg { color: #ef4444; }
        .balance-cell.neutral { color: #000000; }

        .status-select {
          background: none; border: none; color: white; font-weight: 700;
          text-transform: uppercase; font-size: 10px; cursor: pointer; padding: 4px 8px;
          border-radius: 6px; min-width: 90px;
        }
        .status-select.active { background: rgba(16,185,129,0.1); color: #10b981; }
        .status-select.disabled, .status-select.suspended { background: rgba(239,68,68,0.1); color: #ef4444; }

        .switch-mini {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 28px;
        }
        .switch-mini input { opacity: 0; width: 0; height: 0; }
        .slider-mini {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #94a3b8;
          transition: .2s;
          border-radius: 999px;
        }
        .slider-mini:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 4px;
          top: 4px;
          background-color: white;
          transition: .2s;
          border-radius: 50%;
        }
        .switch-mini input:checked + .slider-mini { background-color: #10b981; }
        .switch-mini input:checked + .slider-mini:before { transform: translateX(24px); }

        .bulk-edit-modal { max-width: 560px; }
        .bulk-edit-hint { margin-top: 8px; color: #64748b; font-size: 13px; }

        @media (max-width: 1200px) {
          .expanded-detail-grid { grid-template-columns: 1fr; }
        }

        .capability-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
        .cap-tag {
          border: none; border-radius: 4px; padding: 2px 4px; font-size: 9px;
          font-weight: 800; cursor: pointer; transition: all 0.2s;
        }
        .cap-tag.on { background: #10b981; color: white; }
        .cap-tag.off { background: rgba(255,255,255,0.05); color: #64748b; }

        .loading-state { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .spinner { width: 40px; height: 40px; border: 4px solid rgba(59,130,246,0.1); border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal Enhancements */
        .modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .modal-glass-content { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; width: 100%; max-width: 650px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        .modal-glass-content h3 { margin: 0 0 24px 0; font-size: 20px; font-weight: 800; color: #fff; }
        
        .p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .p-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
        .p-field label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #64748b; letter-spacing: 0.5px; }
        .p-field input { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); color: white; padding: 12px 16px; border-radius: 12px; font-size: 14px; outline: none; }
        .p-field input:focus { border-color: #3b82f6; }
        
        .modal-premium-actions { display: flex; gap: 12px; margin-top: 32px; }
        .btn-save-premium { flex: 2; background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .btn-save-premium:hover { background: #2563eb; transform: translateY(-1px); }
        .btn-cancel-premium { flex: 1; background: rgba(255,255,255,0.05); color: #94a3b8; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; }
        
        .premium-field-info { background: rgba(0,0,0,0.2); border-radius: 16px; padding: 20px; margin-bottom: 24px; text-align: center; }
        .premium-field-info label { display: block; font-size: 11px; text-transform: uppercase; color: #64748b; margin-bottom: 8px; font-weight: 800; }
        .large-val { font-size: 32px; font-weight: 900; }
        .large-val.pos { color: #10b981; }
        .large-val.neg { color: #ef4444; }
        .large-val.neutral { color: #000000; }
        .input-with-symbol { position: relative; }
        .input-with-symbol .sym { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; font-weight: 700; }
        .input-with-symbol input { padding-left: 32px; width: 100%; font-size: 18px; font-weight: 800; }
        .field-hint { font-size: 12px; color: #64748b; margin-top: 4px; }

        /* Role Colors & Badges */
        .role-user { border-left: 3px solid #3b82f6; }
        .role-agent { border-left: 3px solid #10b981; }
        .role-super_agent { border-left: 3px solid #eab308; }

        .avatar-small.role-agent { border-color: #10b981; background: rgba(16,185,129,0.1); }
        .avatar-small.role-super_agent { border-color: #eab308; background: rgba(234,179,8,0.1); }

        .role-badge {
          display: inline-block; padding: 2px 8px; border-radius: 6px;
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          margin-bottom: 4px;
        }
        .role-badge.user { background: rgba(59,130,246,0.1); color: #3b82f6; }
        .role-badge.agent { background: rgba(16,185,129,0.1); color: #10b981; }
        .role-badge.super_agent { background: rgba(234,179,8,0.1); color: #eab308; }

        .hierarchy-info { display: flex; flex-direction: column; gap: 4px; }
        .capability-mini-grid { display: flex; gap: 4px; }
        .cap-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

        @media (max-width: 768px) {
          .duplicate-warning-item {
            grid-template-columns: 1fr;
            gap: 3px;
          }
          .premium-admin-theme {
            padding: 12px;
          }
          .premium-toolbar {
            padding: 14px;
            border-radius: 14px;
            margin-bottom: 18px;
          }
          .toolbar-section {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .t-group,
          .t-group.small {
            width: 100%;
            min-width: 0;
          }
          .header-agent-picker {
            width: 100%;
            min-width: 0;
            max-width: none;
          }
          .table-glass-container {
            padding: 12px;
            border-radius: 14px;
          }
          .table-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          .premium-table th,
          .premium-table td,
          .customer-row td {
            padding: 10px 8px;
          }
          .user-link-btn {
            align-items: flex-start;
          }
          .modal-glass-content {
            max-height: calc(100vh - 24px);
            overflow-y: auto;
            padding: 18px;
            border-radius: 14px;
          }
          .p-grid {
            grid-template-columns: 1fr;
          }
          .modal-premium-actions {
            flex-direction: column;
            margin-top: 20px;
          }
          .btn-save-premium,
          .btn-cancel-premium {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .view-header h2 {
            font-size: 22px;
          }
          .premium-toolbar {
            padding: 12px;
          }
          .large-val {
            font-size: 26px;
          }
        }

      `})]})]})]})}const Go=Object.freeze(Object.defineProperty({__proto__:null,default:vl},Symbol.toStringTag,{value:"Module"})),Qa=t=>{const r=Number(t);return Number.isFinite(r)?Math.round(r*100)/100:0},Nl=t=>{const r=Number(t);return Number.isFinite(r)?Math.round(r*1e4)/1e4:0},Ns=(t,r)=>{const o=Number(t);return Number.isFinite(o)?o:r},Jn=(t,r)=>{const o=t&&typeof t=="object"&&t.settings&&typeof t.settings=="object"?t.settings:{},m=o.freePlayPercent??t?.freePlayPercent??20,p=Nl(Math.max(0,Ns(m,20))),x=Qa(Math.max(0,Ns(r,0))),S=o.maxFpCredit??t?.maxFpCredit??null,L=S===null?0:Ns(S,0),j=S===null||L<=0,U=Qa(Math.max(0,L)),g=Qa(x*(p/100));let w=0;return p>0&&g>0&&(j?w=g:U>0&&(w=Math.min(g,U))),{bonusAmount:Qa(Math.max(0,w)),percent:p,cap:U,depositAmount:x,unlimited:j}},wl=[{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdraw"},{value:"credit_adj",label:"Credit Adj"},{value:"debit_adj",label:"Debit Adj"},{value:"fp_deposit",label:"FP Deposit"}],Sl=10,kl=(t=new Date)=>{const r=new Date(t);if(Number.isNaN(r.getTime()))return"";const o=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,"0"),p=String(r.getDate()).padStart(2,"0");return`${o}-${m}-${p}`},Ja={deposit:"Customer Deposit",withdrawal:"Customer Withdrawal",credit_adj:"Customer Credit Adjustment",debit_adj:"Customer Debit Adjustment",fp_deposit:"Customer Freeplay Deposit"},ws=(t,r="")=>({id:t,agentId:r,searchQuery:"",selectedUserId:"",type:"deposit",applyDepositFreeplayBonus:!0,amount:"",figureDate:kl(),description:Ja.deposit,searchOpen:!1,busy:!1,error:""});function Cl(){const[t,r]=a.useState("admin"),[o,m]=a.useState([]),[p,x]=a.useState([]),[S,L]=a.useState("manual"),[j,U]=a.useState(""),[g,w]=a.useState({}),[u,d]=a.useState(()=>Array.from({length:Sl},(C,ne)=>ws(`manual-${ne+1}`))),[k,Q]=a.useState({}),[B,$]=a.useState({totalDeposits:0,totalWithdrawals:0,pendingCount:0}),[v,b]=a.useState([]),[R,n]=a.useState([]),[I,D]=a.useState(!0),[l,Y]=a.useState(!1),[pe,G]=a.useState(""),[N,ee]=a.useState(""),f=a.useMemo(()=>{const C=new Map;for(const ne of o){const i=String(ne.id||"");i&&C.set(i,ne)}return C},[o]),O=a.useMemo(()=>{const C=j.trim().toLowerCase();return C?p.filter(ne=>{const i=String(ne.username||"").toLowerCase(),W=String(ne.phoneNumber||"").toLowerCase();return i.includes(C)||W.includes(C)}):p},[p,j]),H=async(C,ne)=>{if(ne==="admin")try{const i=await ti(C);$({totalDeposits:Number(i?.totalDeposits||0),totalWithdrawals:Number(i?.totalWithdrawals||0),pendingCount:Number(i?.pendingCount||0)})}catch{}},_=async(C,ne)=>{if(ne!=="admin"){b(R);return}try{const i=await La({user:"",type:"all",status:"all",time:"30d",limit:30},C);b(Array.isArray(i?.transactions)?i.transactions:[])}catch{b(R)}},E=async()=>{const C=localStorage.getItem("token");if(!C){G("Please login to view cashier data."),D(!1);return}try{D(!0),G("");const ne=await la(C),i=String(ne?.role||"admin");r(i);let W=[];if(i==="admin"?W=await ra(C):W=await Pa(C),m(Array.isArray(W)?W:[]),i==="admin"||i==="master_agent"||i==="super_agent")try{const oe=await Qt(C),ge=Array.isArray(oe)?oe:[];x(ge),w(ke=>{const ye={...ke};for(const Ge of ge){const Oe=String(Ge.id||"");Oe&&typeof ye[Oe]!="boolean"&&(ye[Oe]=!1)}return ye}),Q(ke=>{const ye={...ke};for(const Ge of ge){const Oe=String(Ge.id||"");Oe&&!ye[Oe]&&(ye[Oe]=ws(Oe,Oe))}return ye})}catch{x([])}else x([]);await Promise.all([H(C,i),_(C,i)])}catch(ne){G(ne.message||"Failed to load cashier data")}finally{D(!1)}};a.useEffect(()=>{E()},[]),a.useEffect(()=>{t!=="admin"&&b(R)},[R,t]);const ie=C=>{if(C==null)return"—";const ne=Number(C);return Number.isNaN(ne)?"—":`$${ne.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`},Pe=C=>{const ne=String(C.searchQuery||"").trim().toLowerCase();return o.filter(oe=>C.agentId?String(oe?.agentId?.id||oe?.agentId||"")===String(C.agentId):!0).filter(oe=>{if(!ne)return!0;const ge=String(oe.username||"").toLowerCase(),ke=String(oe.fullName||`${oe.firstName||""} ${oe.lastName||""}`).toLowerCase(),ye=String(oe.phoneNumber||"").toLowerCase();return ge.includes(ne)||ke.includes(ne)||ye.includes(ne)}).slice(0,12)},z=C=>{const ne=String(C?.reason||"").toUpperCase(),i=String(C?.type||"").toLowerCase();return ne==="FREEPLAY_ADJUSTMENT"||ne==="DEPOSIT_FREEPLAY_BONUS"||ne==="REFERRAL_FREEPLAY_BONUS"||ne==="NEW_PLAYER_FREEPLAY_BONUS"?"FP Deposit":ne==="CASHIER_DEPOSIT"||i==="deposit"?"Deposit":ne==="CASHIER_WITHDRAWAL"||i==="withdrawal"?"Withdraw":ne==="CASHIER_CREDIT_ADJUSTMENT"?"Credit Adj":ne==="CASHIER_DEBIT_ADJUSTMENT"?"Debit Adj":"Adjustment"},M=C=>C==="deposit"||C==="credit_adj",Z=C=>{const ne=Number(C);return Number.isFinite(ne)?Math.round(ne*100)/100:0},he=(C,ne,i=!1)=>{if(i){Q(W=>{const oe=W[C];return oe?{...W,[C]:ne(oe)}:W});return}d(W=>W.map(oe=>oe.id===C?ne(oe):oe))},ae=async(C,ne=!1)=>{const i=localStorage.getItem("token");if(!i){G("Please login to continue.");return}const W=Number(C.amount||0),oe=String(C.selectedUserId||""),ge=f.get(oe);if(!ge){he(C.id,Ve=>({...Ve,error:"Select a customer first."}),ne);return}if(!Number.isFinite(W)||W<=0){he(C.id,Ve=>({...Ve,error:"Enter a valid amount."}),ne);return}const ke=Number(ge.balance||0),ye=Number(ge.freeplayBalance||0),Ge=(C.description||"").trim()||Ja[C.type],Oe=C.figureDate?`${Ge} (Figure Date: ${C.figureDate})`:Ge;he(C.id,Ve=>({...Ve,busy:!0,error:""}),ne),Y(!0),G(""),ee("");try{let Ve=ke,it=ye,qe="CASHIER_CREDIT_ADJUSTMENT",Qe="adjustment",Fe=0,dt=0;if(C.type==="fp_deposit"){const Ue=await _n(oe,{operationMode:"transaction",amount:W,direction:"credit",description:Oe},i),Je=Number(Ue?.user?.freeplayBalance);Number.isFinite(Je)?it=Je:it=Z(ye+W)}else{const Ue=M(C.type);Ve=Z(ke+(Ue?W:-W)),C.type==="deposit"?(qe="CASHIER_DEPOSIT",Qe="deposit"):C.type==="withdrawal"?(qe="CASHIER_WITHDRAWAL",Qe="withdrawal"):C.type==="credit_adj"?(qe="CASHIER_CREDIT_ADJUSTMENT",Qe="adjustment"):(qe="CASHIER_DEBIT_ADJUSTMENT",Qe="adjustment");const Je=await pa(oe,{operationMode:"transaction",amount:W,direction:Ue?"credit":"debit",type:Qe,reason:qe,description:Oe,applyDepositFreeplayBonus:C.type==="deposit"&&!ne?C.applyDepositFreeplayBonus!==!1:!1},i),lt=Number(Je?.user?.balance);Number.isFinite(lt)&&(Ve=lt);const Ke=Number(Je?.user?.freeplayBalance);Number.isFinite(Ke)&&(it=Ke),Fe=Number(Je?.freeplayBonus?.amount||0),dt=Number(Je?.referralBonus?.amount||0)}m(Ue=>Ue.map(Je=>String(Je.id||"")!==oe?Je:{...Je,balance:Ve,freeplayBalance:it}));const ht=[{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:C.type==="deposit"?"deposit":C.type==="withdrawal"?"withdrawal":"adjustment",user:ge.username,userId:oe,amount:W,date:new Date().toISOString(),status:"completed",reason:C.type==="fp_deposit"?"FREEPLAY_ADJUSTMENT":qe,description:Oe}];Fe>0&&ht.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}-fp`,type:"adjustment",user:ge.username,userId:oe,amount:Fe,date:new Date().toISOString(),status:"completed",reason:"DEPOSIT_FREEPLAY_BONUS",description:"Auto free play bonus from deposit"}),n(Ue=>[...ht,...Ue].slice(0,30)),await Promise.all([H(i,t),_(i,t)]),he(C.id,Ue=>({...Ue,amount:"",applyDepositFreeplayBonus:!0,description:Ja[Ue.type],busy:!1,error:""}),ne);const nt=[`Transaction applied for ${ge.username}.`];Fe>0&&nt.push(`Auto free play bonus added: ${ie(Fe)}.`),dt>0&&nt.push(`Referral bonus granted: ${ie(dt)}.`),ee(nt.join(" "))}catch(Ve){he(C.id,it=>({...it,busy:!1,error:Ve.message||"Failed to apply transaction."}),ne)}finally{Y(!1)}},re=(C,ne,i)=>{const W=Pe(C);return e.jsxs("div",{className:"cashier-customer-cell",children:[e.jsx("button",{type:"button",className:"cashier-find-btn",children:"Find"}),e.jsxs("div",{className:"cashier-customer-search",children:[e.jsx("input",{type:"text",placeholder:"Search ...",value:C.searchQuery,onFocus:()=>ne({...C,searchOpen:!0}),onBlur:()=>setTimeout(()=>ne({...C,searchOpen:!1}),120),onChange:oe=>ne({...C,searchQuery:oe.target.value,searchOpen:!0,selectedUserId:""})}),C.searchOpen&&e.jsx("div",{className:"cashier-search-dropdown",children:W.length===0?e.jsx("div",{className:"cashier-search-empty",children:"No matching users"}):W.map(oe=>{const ge=String(oe.id||"");return e.jsxs("button",{type:"button",className:"cashier-search-item",onMouseDown:()=>i(oe),children:[e.jsx("span",{children:String(oe.username||"").toUpperCase()}),e.jsx("small",{children:oe.fullName||`${oe.firstName||""} ${oe.lastName||""}`})]},ge)})})]})]})},Re=(C,ne=!1)=>{const i=f.get(String(C.selectedUserId||"")),W=Number(i?.balanceOwed||0),oe=Number(i?.balance||0),ge=ne?null:Jn(i,Number(C.amount||0)),ke=ye=>{he(C.id,()=>ye,ne)};return e.jsxs("tr",{children:[e.jsx("td",{children:re(C,ke,ye=>{const Ge=String(ye.id||"");ke({...C,selectedUserId:Ge,searchQuery:ye.username||"",searchOpen:!1,error:""})})}),e.jsx("td",{className:"cashier-num",children:i?ie(W):"--"}),e.jsx("td",{className:"cashier-num",children:i?ie(oe):"--"}),e.jsx("td",{children:e.jsx("select",{value:C.type,onChange:ye=>ke({...C,type:ye.target.value,description:Ja[ye.target.value]||C.description}),children:wl.filter(ye=>!ne||ye.value!=="fp_deposit").map(ye=>e.jsx("option",{value:ye.value,children:ye.label},ye.value))})}),e.jsx("td",{children:e.jsxs("div",{className:"cashier-amount-wrap",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"Amount",value:C.amount,onChange:ye=>ke({...C,amount:ye.target.value})}),e.jsx("button",{type:"button",className:"cashier-zero-btn",onClick:()=>ke({...C,amount:"0"}),children:"Zero"})]})}),e.jsx("td",{children:e.jsx("input",{type:"date",value:C.figureDate,onChange:ye=>ke({...C,figureDate:ye.target.value})})}),e.jsxs("td",{children:[e.jsx("input",{type:"text",placeholder:"Description",value:C.description,onChange:ye=>ke({...C,description:ye.target.value})}),C.type==="deposit"&&!ne&&ge&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"8px",fontSize:"12px",color:"#111827",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:C.applyDepositFreeplayBonus!==!1,onChange:ye=>ke({...C,applyDepositFreeplayBonus:ye.target.checked})}),e.jsx("span",{children:`${ge.percent}% Freeplay (${ie(ge.bonusAmount)})`})]})]}),e.jsxs("td",{children:[e.jsx("button",{type:"button",className:"cashier-continue-btn",disabled:C.busy||l,onClick:()=>ae(C,ne),children:C.busy?"Saving...":"Continue"}),C.error&&e.jsx("div",{className:"cashier-row-error",children:C.error})]})]},C.id)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Cashier"})}),e.jsxs("div",{className:"view-content cashier-v2",children:[I&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading cashier data..."}),!I&&e.jsxs(e.Fragment,{children:[pe&&e.jsx("div",{className:"alert error",children:pe}),N&&e.jsx("div",{className:"alert success",children:N}),e.jsxs("div",{className:"cashier-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Deposits (Today)"}),e.jsx("p",{className:"amount",children:ie(B.totalDeposits)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Withdrawals (Today)"}),e.jsx("p",{className:"amount",children:ie(B.totalWithdrawals)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("p",{className:"amount",children:Number(B.pendingCount||0)})]})]}),e.jsxs("div",{className:"cashier-top-filters",children:[e.jsxs("div",{className:"cashier-agent-filter",children:[e.jsx("span",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search ...",value:j,onChange:C=>U(C.target.value)})]}),e.jsxs("select",{value:S,onChange:C=>L(C.target.value),children:[e.jsx("option",{value:"manual",children:"Manual Mode"}),e.jsx("option",{value:"agent",children:"Agent Mode"})]})]}),S==="manual"?e.jsx("div",{className:"cashier-grid-wrap",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:u.map(C=>Re(C,!1))})]})}):e.jsx("div",{className:"cashier-agent-mode",children:O.length===0?e.jsx("div",{className:"cashier-empty",children:"No agents found."}):O.map(C=>{const ne=String(C.id||""),i=k[ne]||ws(ne,ne),W=!!g[ne];return e.jsxs("div",{className:"cashier-agent-card",children:[e.jsxs("button",{type:"button",className:"cashier-agent-head",onClick:()=>w(oe=>({...oe,[ne]:!oe[ne]})),children:[e.jsx("span",{children:W?"−":"+"}),e.jsx("span",{children:String(C.username||"").toUpperCase()})]}),W&&e.jsx("div",{className:"cashier-agent-body",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:Re(i,!0)})]})})]},ne)})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Transactions"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Type"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Description"})]})}),e.jsx("tbody",{children:v.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"empty-msg",children:"No recent transactions."})}):v.map(C=>{const ne=z(C),i=ne==="Deposit"||ne==="Credit Adj"||ne==="FP Deposit";return e.jsxs("tr",{children:[e.jsx("td",{children:ne}),e.jsx("td",{children:C.user||"Unknown"}),e.jsx("td",{className:i?"positive":"negative",children:ie(C.amount)}),e.jsx("td",{children:C.date?new Date(C.date).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${C.status||"completed"}`,children:C.status||"completed"})}),e.jsx("td",{children:C.description||"—"})]},C.id)})})]})]})]})]})]})}const qo=Object.freeze(Object.defineProperty({__proto__:null,default:Cl},Symbol.toStringTag,{value:"Module"})),Ot=t=>String(t||"").toUpperCase(),Ms=t=>{const r=String(t||"").replace(/\D/g,"");return r.length===0?"":r.length<=3?r:r.length<=6?`${r.slice(0,3)}-${r.slice(3)}`:`${r.slice(0,3)}-${r.slice(3,6)}-${r.slice(6,10)}`},Ss=t=>String(t||"").replace(/[^A-Z0-9]/g,""),Al=t=>{const r=String(t||"").replace(/\D/g,"");return r?r.slice(-4):""},Bs=(t,r,o,m="")=>{const p=Ss(Ot(t)),x=Ss(Ot(r)),S=Al(o);if(S==="")return"";if(p!==""&&x!=="")return`${p.slice(0,3)}${x.slice(0,3)}${S}`.toUpperCase();const L=Ss(Ot(m));return L!==""?`${L.slice(0,6)}${S}`.toUpperCase():""},ks=t=>{const r=String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!r)return"";const o=r.match(/^[A-Z]+/);return o&&o[0]?o[0]:r.replace(/\d+$/,"")||r},Pl=t=>t?`FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`:`FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`,Ll=new Set(["admin","agent","master_agent","super_agent"]),Dl=t=>!Ll.has(String(t?.role||"").trim().toLowerCase()),Jt=t=>String(t||"").trim().toLowerCase(),Wt=t=>String(t||"").trim(),Tl=new Set(["admin","agent","master_agent","super_agent"]),Ka=t=>String(t?.nodeType||"").trim().toLowerCase()==="player"?!1:Tl.has(Jt(t?.role)),qt=t=>{const r=Jt(t?.role);return r==="master_agent"||r==="super_agent"},Xa=t=>Jt(t?.role)==="agent",Kn=t=>{if(!Ka(t))return null;const r=Array.isArray(t.children)?t.children.map(o=>Kn(o)).filter(Boolean):[];return{...t,id:Wt(t.id),children:r}},Aa=(t,r)=>{const o=Wt(r);if(!o||!t)return null;if(Wt(t.id)===o)return t;const m=Array.isArray(t.children)?t.children:[];for(const p of m){const x=Aa(p,o);if(x)return x}return null},Is=(t,r)=>{const o=Wt(r);if(!o||!t)return[];const m=Wt(t.id);if(m===o)return[m];const p=Array.isArray(t.children)?t.children:[];for(const x of p){const S=Is(x,o);if(S.length>0)return[m,...S]}return[]},Es=(t,r,o=!0,m=0,p=[])=>(t&&((o||m>0)&&r(t,m)&&p.push(t),(Array.isArray(t.children)?t.children:[]).forEach(S=>Es(S,r,!0,m+1,p))),p),Ml=t=>{const r=Jt(t?.role);return r==="master_agent"?"MASTER":r==="super_agent"?"SUPER":r==="agent"?"AGENT":r==="admin"?"ADMIN":r?r.replace(/_/g," ").toUpperCase():"ACCOUNT"},Bl=t=>Jt(t?.role).replace(/_/g,"-")||"account",Il=t=>{const r=String(t?.username||"").toLowerCase(),m=Jt(t?.role).replace(/_/g," ");return`${r} ${m}`.trim()},Fs=(t,r)=>{const o=String(r||"").trim().toLowerCase();return!o||Il(t).includes(o)?!0:(Array.isArray(t?.children)?t.children:[]).some(m=>Fs(m,o))};function El({rootNode:t,loading:r=!1,error:o="",searchQuery:m="",onSearchQueryChange:p,expandedNodes:x,onToggleNode:S,onSelectNode:L,onSelectDirect:j,selectedNodeId:U="",directSelected:g=!1,selectionMode:w="player",searchPlaceholder:u="Search accounts...",emptyLabel:d="No matching accounts"}){const k=String(m||"").trim().toLowerCase(),Q=k!==""||r||o,B=(v,b=0,R=!1)=>{if(!v||!Ka(v)||w==="master"&&!R&&!qt(v)||k&&!Fs(v,k))return null;if(w==="player"&&!Xa(v)){const N=(Array.isArray(v.children)?v.children:[]).filter(Ka).map(ee=>B(ee,b,!1));return N.some(Boolean)?e.jsx(e.Fragment,{children:N}):null}const n=Wt(v.id),I=(Array.isArray(v.children)?v.children:[]).filter(G=>Ka(G)&&(w!=="master"||qt(G))),D=I.length>0&&(R||qt(v)),l=k?!0:x.has(n),Y=w==="player"?Xa(v):R?typeof j=="function":qt(v),pe=R?g:U!==""&&U===n;return e.jsxs("div",{className:"assignment-tree-branch",children:[e.jsxs("div",{className:`tree-node ${R?"root-node":""} assignment-tree-row ${pe?"selected":""} ${Y?"selectable":""}`,style:R?void 0:{paddingLeft:`${16+b*20}px`},children:[e.jsx("button",{type:"button",className:`assignment-tree-toggle-btn ${D?"":"is-spacer"}`,onClick:()=>{D&&S?.(n)},"aria-label":D?l?"Collapse branch":"Expand branch":"No child accounts",disabled:!D,children:D?l?"−":"+":""}),e.jsxs("button",{type:"button",className:"assignment-tree-node-btn",onClick:()=>{if(Y){if(R&&typeof j=="function"){j(v);return}L?.(v);return}D&&S?.(n)},children:[e.jsx("span",{className:"node-name",children:String(v.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${Bl(v)}`,children:Ml(v)})]})]}),D&&l&&I.length>0&&e.jsx("div",{className:"node-children assignment-tree-children",children:I.map(G=>B(G,b+1,!1))})]},`${n||"root"}-${b}`)},$=!!t&&Fs(t,k);return e.jsxs("div",{className:"assignment-tree-picker",children:[e.jsxs("div",{className:"search-pill assignment-tree-search-pill",children:[e.jsx("span",{className:"pill-label",children:"Tree"}),e.jsx("input",{type:"text",placeholder:u,value:m,onChange:v=>p?.(v.target.value)})]}),Q&&e.jsx("div",{className:"assignment-tree-results-dropdown",children:e.jsx("div",{className:"tree-scroll-area assignment-tree-scroll-area",children:r?e.jsx("div",{className:"tree-loading",children:"Loading hierarchy..."}):o?e.jsx("div",{className:"tree-error",children:o}):$?B(t,0,!0):e.jsx("div",{className:"tree-loading",children:d})})}),e.jsx("style",{children:`
        .assignment-tree-picker {
          position: relative;
          min-width: 0;
          z-index: 20;
        }

        .assignment-tree-picker:focus-within {
          z-index: 160;
        }

        .assignment-tree-search-pill {
          min-height: 48px;
          border-radius: 12px;
          background: #ffffff;
          border-color: #d7dee8;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        .assignment-tree-search-pill .pill-label {
          display: inline-flex;
          align-items: center;
          padding: 0 16px;
          background: #f3f6fb;
          font-size: 14px;
        }

        .assignment-tree-search-pill input {
          min-height: 46px;
          padding: 0 14px;
          font-size: 14px;
        }

        .assignment-tree-results-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          border: 1px solid #dbe4ee;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 18px 34px rgba(15, 23, 42, 0.16);
          overflow: hidden;
        }

        .assignment-tree-scroll-area {
          max-height: 300px;
          min-height: 0;
          padding: 8px 0 10px;
          background: transparent;
          border-top: none;
        }

        .assignment-tree-row {
          gap: 8px;
          min-height: 42px;
          transition: background 0.2s ease;
        }

        .assignment-tree-row:hover {
          background: #f8fbff;
        }

        .assignment-tree-row.selected {
          background: linear-gradient(90deg, rgba(191, 219, 254, 0.78), rgba(239, 246, 255, 0.9));
        }

        .assignment-tree-row.selectable .assignment-tree-node-btn {
          cursor: pointer;
        }

        .assignment-tree-toggle-btn {
          width: 22px;
          height: 22px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 24px;
          line-height: 1;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex: 0 0 22px;
        }

        .assignment-tree-toggle-btn:disabled {
          cursor: default;
        }

        .assignment-tree-toggle-btn.is-spacer {
          visibility: hidden;
        }

        .assignment-tree-node-btn {
          flex: 1;
          min-width: 0;
          border: none;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0;
          text-align: left;
        }

        .assignment-tree-node-btn .node-name {
          flex: 1;
          min-width: 0;
          font-weight: 600;
        }

        .assignment-tree-children {
          margin-left: 18px;
        }
      `})]})}const Fl=(t,r)=>{const o=r.password||"N/A";if(t==="player")return`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${r.username}
Password: ${o}
Min bet: $${r.minBet||25}
Max bet: $${r.maxBet||200}
Credit: $${r.creditLimit||1e3}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${Pl(!!r.grantStartingFreeplay)}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;const m=t==="agent"?"Agent":"Master Agent",p=t==="agent"?`
Standard Min bet: $${r.defaultMinBet||25}
Standard Max bet: $${r.defaultMaxBet||200}
Standard Credit: $${r.defaultCreditLimit||1e3}
`:"";return`Welcome to the team! Here’s your ${m} administrative account info.

Login: ${r.username}
Password: ${o}
${p}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`};function $l({initialType:t="player"}){const r=(P,T,be)=>{let V;const De=new Promise((Me,We)=>{V=setTimeout(()=>We(new Error(be)),Math.max(1e3,T))});return Promise.race([P,De]).finally(()=>clearTimeout(V))},[o,m]=a.useState([]),[p,x]=a.useState([]),[S,L]=a.useState(!0),[j,U]=a.useState(""),[g,w]=a.useState(null),[u,d]=a.useState(!1),[k,Q]=a.useState(!1),[B,$]=a.useState(null),[v,b]=a.useState(""),[R,n]=a.useState(""),[I,D]=a.useState([]),[l,Y]=a.useState(!0),[pe,G]=a.useState(""),[N,ee]=a.useState([]),[f,O]=a.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),[H,_]=a.useState({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),[E,ie]=a.useState(""),[Pe,z]=a.useState(""),[M,Z]=a.useState([]),[he,ae]=a.useState(""),[re,Re]=a.useState(t||"player"),[C,ne]=a.useState("admin"),[i,W]=a.useState(!1),[oe,ge]=a.useState(""),[ke,ye]=a.useState(""),[Ge,Oe]=a.useState(!1),[Ve,it]=a.useState(""),[qe,Qe]=a.useState(""),[Fe,dt]=a.useState(null),[ht,nt]=a.useState(!1),[Ue,Je]=a.useState(""),[lt,Ke]=a.useState(()=>new Set),St=async(P,T)=>{if(Jt(T)==="agent")return dt(null),Je(""),Ke(new Set),nt(!1),null;try{nt(!0);const V=await Za(P),De=V?.root?Kn({...V.root,children:Array.isArray(V.tree)?V.tree:[]}):null;return dt(De),Je(""),Ke(new Set),De}catch(V){return console.error("Failed to load assignment hierarchy:",V),dt(null),Je(V?.message||"Failed to load hierarchy"),Ke(new Set),null}finally{nt(!1)}};a.useEffect(()=>{(async()=>{try{L(!0);const T=localStorage.getItem("token")||sessionStorage.getItem("token");if(!T){m([]),x([]),dt(null),Je(""),Ke(new Set),U("Please login to load users.");return}const be=String(localStorage.getItem("userRole")||"").toLowerCase();let V=null;try{V=await la(T,{timeoutMs:3e4})}catch(Me){console.warn("CustomerCreationWorkspace: getMe failed, falling back to stored role.",Me)}const De=String(V?.role||be||"admin").toLowerCase();if(ne(De),it(V?.username||""),Qe(V?.id||""),W(!!V?.viewOnly),De==="agent"){const Me=await Pa(T);m(Me||[]),x([]),await St(T,De)}else{const[Me,We]=await Promise.all([ra(T),Qt(T)]);m(Me||[]),x(We||[]),await St(T,De)}if(U(""),V?.username)try{const Me=ks(V.username);if(!Me)return;const{nextUsername:We}=await $t(Me,T,{type:"player"});O(Ce=>({...Ce,username:We}))}catch(Me){console.error("Failed to prefetch next username:",Me)}}catch(T){console.error("Error fetching add-customer context:",T),U("Failed to load users: "+T.message)}finally{L(!1)}})()},[]),a.useEffect(()=>{if(!t||t===re)return;(async()=>await Ne(t))()},[t]);const c=async({overrideDuplicate:P=!1}={})=>{try{d(!0),P||w(null),U("");const T=localStorage.getItem("token")||sessionStorage.getItem("token");if(!T){U("Please login to create users.");return}if(!String(f.username||"").trim()||!String(f.firstName||"").trim()||!String(f.lastName||"").trim()||!String(f.phoneNumber||"").trim()||!String(f.password||"").trim()){U("Username, first name, last name, phone number, and password are required.");return}if(re==="player"){if(String(f.minBet??"").trim()===""||String(f.maxBet??"").trim()===""||String(f.creditLimit??"").trim()===""||String(f.balanceOwed??"").trim()===""){U("Min bet, max bet, credit limit, and settle limit are required for players.");return}if(C!=="agent"&&!String(f.agentId||"").trim()){U("Please assign this player to a regular Agent.");return}}const V={...f,apps:H};P&&(V.allowDuplicateSave=!0),V.balance===""&&delete V.balance,re!=="player"?(delete V.referredByUserId,delete V.grantStartingFreeplay,delete V.minBet,delete V.maxBet,delete V.creditLimit,delete V.balanceOwed,re==="super_agent"&&(delete V.defaultMinBet,delete V.defaultMaxBet,delete V.defaultCreditLimit,delete V.defaultSettleLimit)):V.referredByUserId||delete V.referredByUserId,(re==="agent"||re==="super_agent")&&V.agentId&&(V.parentAgentId=V.agentId),re==="agent"||re==="super_agent"?(V.agentPercent!==""?V.agentPercent=parseFloat(V.agentPercent):delete V.agentPercent,V.playerRate!==""?V.playerRate=parseFloat(V.playerRate):delete V.playerRate,E!==""&&(V.hiringAgentPercent=parseFloat(E)),Pe!==""&&(V.subAgentPercent=parseFloat(Pe)),M.length>0&&(V.extraSubAgents=M.filter($e=>$e.name.trim()!==""||$e.percent!=="").map($e=>({name:$e.name.trim(),percent:parseFloat($e.percent)||0})))):(delete V.agentPercent,delete V.playerRate);let De=null;re==="player"?C==="agent"||C==="super_agent"||C==="master_agent"?De=await ai(V,T):De=await si(V,T):re==="agent"?C==="admin"?De=await Ls({...V,role:"agent"},T):De=await Ds({...V,role:"agent"},T):re==="super_agent"&&(C==="admin"?De=await Ls({...V,role:"master_agent"},T):De=await Ds({...V,role:"master_agent"},T));const Me=re;U(""),w(null),n(""),D([]),_({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),O({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",defaultMinBet:"",defaultMaxBet:"",defaultCreditLimit:"",defaultSettleLimit:"",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),Re(Me),ge(""),ie(""),z(""),Z([]),Oe(!1),$(null),b(""),G(""),ee([]),Y(!0);const Ce=Me==="player"?"Player":Me==="agent"?"Agent":"Master Agent";if(n(De?.assigned?`${Ce} assigned successfully.`:`${Ce} created successfully.`),C==="agent"){const $e=await Pa(T);m($e||[])}else{const[$e,Ie]=await Promise.all([ra(T),Qt(T)]);m($e||[]),x(Ie||[]),await St(T,C)}}catch(T){console.error("Create user failed:",T);const be=Array.isArray(T?.duplicateMatches)?T.duplicateMatches:Array.isArray(T?.details?.matches)?T.details.matches:[],V=T?.isDuplicate===!0||T?.duplicate===!0||T?.code==="DUPLICATE_PLAYER"||T?.details?.duplicate===!0;w(V?{message:T?.message||"Likely duplicate player detected.",matches:be}:null),U(T.message||"Failed to create user")}finally{d(!1)}},F=async()=>{try{Q(!0),U(""),n(""),D([]),ee([]);const P=localStorage.getItem("token")||sessionStorage.getItem("token");if(!P){U("Please login to import users.");return}if(!B){U("Please choose an Excel/CSV file first.");return}if(l&&(C==="admin"||C==="master_agent"||C==="super_agent")&&!pe){U("Select an agent to assign imported players to, or uncheck the assignment option.");return}const T=await r(ni(B,P,{defaultAgentId:pe||"",timeoutMs:45e3,forceAgentAssignment:l}),5e4,"Import request timed out. Please try again."),be=Array.isArray(T?.createdRows)?T.createdRows.length:0,V=Number(T?.created),De=Number(T?.failed),Me=Number.isFinite(V)?V:be,We=Number.isFinite(De)?De:0,Ce=String(T?.message||"").trim();!Number.isFinite(V)&&!Number.isFinite(De)?n(Ce||`Import complete: ${Me} created, ${We} failed.`):n(`Import complete: ${Me} created, ${We} failed.${Ce?` ${Ce}`:""}`);const $e=Array.isArray(T?.createdRows)?T.createdRows.map(Ie=>String(Ie?.username||"").toUpperCase()).filter(Boolean):[];D($e),ee(Array.isArray(T?.errors)?T.errors:[]),$(null),b(""),G("");try{if(C==="agent"){const Ie=await r(Pa(P),15e3,"Players refresh timed out");m(Ie||[])}else{const[Ie,ot]=await Promise.all([r(ra(P),15e3,"Users refresh timed out"),r(Qt(P),15e3,"Agents refresh timed out")]);m(Ie||[]),x(ot||[])}}catch(Ie){console.warn("Post-import refresh failed:",Ie),n(ot=>`${ot} Imported, but refresh failed: ${Ie.message||"please reload page."}`)}}catch(P){console.error("Import users failed:",P),U(P.message||"Failed to import users")}finally{Q(!1)}},J=async P=>{const T=P.toUpperCase().replace(/[^A-Z0-9]/g,"");if(O(be=>({...be,agentPrefix:T})),ae(""),T.length>=2){const be=re==="super_agent";if(p.some(Ce=>{const $e=String(Ce.role||"").toLowerCase();return be!==($e==="master_agent"||$e==="super_agent")?!1:String(Ce.username||"").toUpperCase().replace(/MA$/,"").replace(/\d+$/,"")===T})){ae(`Prefix "${T}" is already taken`);return}const De=localStorage.getItem("token")||sessionStorage.getItem("token"),Me=re==="super_agent"?"MA":"",We=re==="agent"?f.agentId||(C==="master_agent"||C==="super_agent"?qe:""):"";try{const Ce={suffix:Me,type:"agent"};We&&(Ce.agentId=We);const{nextUsername:$e}=await $t(T,De,Ce);O(Ie=>({...Ie,username:$e}))}catch(Ce){console.error("Failed to get next username from prefix:",Ce)}}else O(be=>({...be,username:""}))},de=async(P,T=null)=>{const be=localStorage.getItem("token")||sessionStorage.getItem("token");if(!be)return;O(We=>({...We,agentId:P,referredByUserId:""})),ge("");const V=re==="player"?"player":"agent",De=re==="super_agent"?"MA":"",Me=re==="agent"||re==="super_agent";if(P){const We=T||p.find(Ce=>Ce.id===P);if(We)try{const Ce=Me&&f.agentPrefix?f.agentPrefix:ks(We.username);if(!Ce){O(ot=>({...ot,username:""}));return}const $e=V==="player"?{suffix:De,type:V,agentId:P}:{suffix:De,type:V,...re==="agent"?{agentId:P}:{}},{nextUsername:Ie}=await $t(Ce,be,$e);O(ot=>({...ot,username:Ie,agentPrefix:Me&&ot.agentPrefix?ot.agentPrefix:Ce}))}catch(Ce){console.error("Failed to get next username:",Ce)}}else{if(re==="player"&&(C==="admin"||Dt)){O(Ce=>({...Ce,username:""}));return}const We=Me&&f.agentPrefix?f.agentPrefix:Ve?ks(Ve):"";if(We)try{const Ce={suffix:De,type:V};V==="agent"&&re==="agent"&&(C==="master_agent"||C==="super_agent")&&qe&&(Ce.agentId=qe);const{nextUsername:$e}=await $t(We,be,Ce);O(Ie=>({...Ie,username:$e,agentPrefix:Me&&Ie.agentPrefix?Ie.agentPrefix:We}))}catch(Ce){console.error("Failed to fetch username for admin:",Ce),O($e=>({...$e,username:""}))}else O(Ce=>({...Ce,username:""}))}},Ne=async P=>{Re(P),ae(""),ge(""),ie(""),z(""),Z([]),O(be=>({...be,agentPercent:"",playerRate:""}));const T=localStorage.getItem("token")||sessionStorage.getItem("token");if(T)if(P==="super_agent"||P==="agent"){const be=String(f.agentId||"").trim(),V=be?Aa(Fe,be):null,De=!!(V&&qt(V)),Me=De?be:"";De||O(Ie=>({...Ie,agentId:"",parentAgentId:""})),ye(""),Oe(!1),O(Ie=>({...Ie,referredByUserId:""}));const We=P==="super_agent"?"MA":"",Ce=f.agentPrefix,$e="agent";if(Ce)try{const Ie={suffix:We,type:$e};P==="agent"&&Me?Ie.agentId=Me:P==="agent"&&(C==="master_agent"||C==="super_agent")&&qe&&(Ie.agentId=qe);const{nextUsername:ot}=await $t(Ce,T,Ie);O(Ct=>({...Ct,username:ot,agentPrefix:Ce}))}catch(Ie){console.error("Failed to re-fetch username on type change",Ie)}else O(Ie=>({...Ie,username:""}))}else await de(""),Oe(!1),O(be=>({...be,referredByUserId:""}))},xe=(P,T,be)=>{const V=Bs(P,T,be,f.username);O(De=>({...De,password:V}))},ve=P=>{const T=Ot(P);O(be=>{const V={...be,firstName:T};return xe(T,V.lastName,V.phoneNumber),V})},Le=P=>{const T=Ot(P);O(be=>{const V={...be,lastName:T};return xe(V.firstName,T,V.phoneNumber),V})},He=P=>{const T=Ms(P);O(be=>{const V={...be,phoneNumber:T};return xe(V.firstName,V.lastName,T),V})},yt=!i&&!u&&!!String(f.username||"").trim()&&!!String(f.firstName||"").trim()&&!!String(f.lastName||"").trim()&&!!String(f.phoneNumber||"").trim()&&!!String(f.password||"").trim()&&(re!=="player"||C==="agent"||!!String(f.agentId||"").trim())&&(re!=="player"||String(f.minBet??"").trim()!==""&&String(f.maxBet??"").trim()!==""&&String(f.creditLimit??"").trim()!==""&&String(f.balanceOwed??"").trim()!=="")&&!he,Dt=C==="master_agent"||C==="super_agent",kt=re==="agent"||re==="super_agent";a.useMemo(()=>Fe?re==="player"?Es(Fe,(P,T)=>T>0&&Xa(P),!1):Es(Fe,(P,T)=>T>0&&qt(P),!1):[],[Fe,re]);const Xe=a.useMemo(()=>{if(!Fe)return null;const P=String(f.agentId||"").trim();return P?Aa(Fe,P):kt?Fe:null},[Fe,f.agentId,kt]),vt=a.useMemo(()=>{if(re==="player")return Xe?String(Xe.username||"").toUpperCase():"Select an agent";if(!String(f.agentId||"").trim()){const P=String(Fe?.username||Ve||"").trim().toUpperCase();return P?`${P} (ME)`:"DIRECT (CREATED BY ME)"}return Xe?String(Xe.username||"").toUpperCase():"Select a master agent"},[re,Xe,f.agentId,Fe,Ve]),_t=kt?"Search master agents or agents...":"Search agents...",Pt=kt?"No matching master-agent branches":"No matching agents",Nt=P=>{const T=Wt(P);T&&Ke(be=>{const V=new Set(be);return V.has(T)?V.delete(T):V.add(T),V})},Tt=P=>{const T=Wt(P);!T||!Fe||Ke(be=>{const V=new Set(be);return Is(Fe,T).forEach(Me=>V.add(Me)),V})},Kt=async P=>{const T=Wt(P?.id);T&&(Tt(T),await de(T,P))},Zt=async P=>{await de("",P)};a.useEffect(()=>{const P=String(f.agentId||"").trim();if(!P)return;const T=Aa(Fe,P);(re==="player"?T&&Xa(T):T&&qt(T))||(O(V=>String(V.agentId||"").trim()?{...V,agentId:"",parentAgentId:""}:V),ge(""))},[Fe,re,f.agentId]);const It=(()=>{const P=Us(o.filter(Dl));return re!=="player"&&re!=="agent"&&re!=="super_agent"?[]:C==="agent"?P:f.agentId?P.filter(T=>String(T.agentId?.id||T.agentId||"")===String(f.agentId)):P})(),At=a.useMemo(()=>It.map(P=>{const T=String(P.id||"").trim(),be=String(P.username||"").trim(),V=String(P.fullName||"").trim();if(!T||!be)return null;const De=`${be.toUpperCase()}${V?` - ${V}`:""}`;return{id:T,label:De,labelLower:De.toLowerCase(),usernameLower:be.toLowerCase(),isDuplicatePlayer:!!P.isDuplicatePlayer}}).filter(Boolean),[It]),xt=a.useMemo(()=>{const P=String(ke||"").trim().toLowerCase();return P?At.filter(T=>T.labelLower.includes(P)||T.usernameLower.includes(P)).slice(0,20):At.slice(0,20)},[At,ke]),ut=a.useMemo(()=>{const P=String(f.referredByUserId||"").trim();return P&&At.find(T=>T.id===P)||null},[f.referredByUserId,At]);a.useEffect(()=>{if(ut){ye(ut.label);return}String(f.referredByUserId||"").trim()||ye("")},[ut,f.referredByUserId]);const Xt=P=>{ye(P);const T=String(P||"").trim().toLowerCase();if(!T){O(V=>({...V,referredByUserId:""}));return}const be=At.find(V=>V.labelLower===T||V.usernameLower===T);O(V=>({...V,referredByUserId:be?be.id:""}))},ea=()=>{const P=String(ke||"").trim().toLowerCase();if(!P){O(V=>({...V,referredByUserId:""}));return}const T=At.find(V=>V.labelLower===P||V.usernameLower===P);if(T){ye(T.label),O(V=>({...V,referredByUserId:T.id}));return}const be=At.filter(V=>V.labelLower.includes(P)||V.usernameLower.includes(P));if(be.length===1){ye(be[0].label),O(V=>({...V,referredByUserId:be[0].id}));return}O(V=>({...V,referredByUserId:""}))},Et=P=>{if(!P){ye(""),O(T=>({...T,referredByUserId:""})),Oe(!1);return}ye(P.label),O(T=>({...T,referredByUserId:P.id})),Oe(!1)};return e.jsxs(e.Fragment,{children:[S&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading setup..."})]}),!S&&e.jsxs(e.Fragment,{children:[j&&e.jsx("div",{className:"error-state",children:j}),g&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:g.message}),g.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:g.matches.map((P,T)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(P.username||"UNKNOWN")}),e.jsx("span",{children:String(P.fullName||"No name")}),e.jsx("span",{children:String(P.phoneNumber||"No phone")})]},`${P.id||P.username||"duplicate"}-${T}`))}),e.jsxs("div",{className:"duplicate-warning-actions",children:[e.jsx("button",{type:"button",className:"duplicate-warning-cancel",onClick:()=>{w(null),U("")},disabled:u,children:"Cancel"}),e.jsx("button",{type:"button",className:"duplicate-warning-confirm",onClick:()=>c({overrideDuplicate:!0}),disabled:u,children:u?"Creating…":"Create Anyway"})]})]}),R&&e.jsx("div",{className:"success-state",children:R}),I.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",I.slice(0,20).join(", "),I.length>20?` (+${I.length-20} more)`:""]}),N.length>0&&e.jsxs("div",{style:{marginTop:"8px",background:"#fff5f5",border:"1px solid #feb2b2",borderRadius:"6px",padding:"10px 14px"},children:[e.jsxs("strong",{style:{color:"#c53030",fontSize:"13px"},children:["Failed rows (",N.length,") — re-importing will retry these safely:"]}),e.jsx("ul",{style:{margin:"6px 0 0 0",padding:"0 0 0 16px",fontSize:"12px",color:"#742a2a",maxHeight:"160px",overflowY:"auto"},children:N.map((P,T)=>e.jsxs("li",{children:["Row ",P.row,P.username?` (${String(P.username).toUpperCase()})`:"",": ",P.error||P.reason||"Unknown error"]},T))})]}),e.jsxs("div",{className:"customer-create-shell",children:[e.jsxs("div",{className:"customer-create-main",children:[e.jsxs("div",{className:"customer-create-top-row",children:[e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-type",children:[e.jsx("label",{children:"Type"}),e.jsx("div",{className:"s-wrapper",children:e.jsxs("select",{value:re,onChange:P=>Ne(P.target.value),children:[e.jsx("option",{value:"player",children:"Player"}),(C==="admin"||C==="super_agent"||C==="master_agent")&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"super_agent",children:"Master Agent"})]})]})})]}),(re==="agent"||re==="super_agent")&&e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-prefix",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:f.agentPrefix,onChange:P=>J(P.target.value),placeholder:"Enter prefix",maxLength:5,style:he?{borderColor:"#ef4444",boxShadow:"0 0 0 2px rgba(239,68,68,0.15)"}:void 0}),he&&e.jsx("span",{style:{color:"#ef4444",fontSize:12,fontWeight:600,marginTop:4},children:he})]}),(re==="player"||re==="agent"||re==="super_agent")&&(C==="admin"||C==="super_agent"||C==="master_agent")&&e.jsxs("div",{className:"filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment",children:[e.jsxs("label",{className:"assignment-field-label",children:[e.jsx("span",{children:re==="player"?"Assign to Agent":"Assign to Master Agent"}),e.jsx("span",{className:"assignment-selected-chip",children:vt})]}),e.jsx(El,{rootNode:Fe,loading:ht,error:Ue,searchQuery:oe,onSearchQueryChange:ge,expandedNodes:lt,onToggleNode:Nt,onSelectNode:Kt,onSelectDirect:kt?Zt:null,selectedNodeId:String(f.agentId||""),directSelected:kt&&!String(f.agentId||"").trim(),selectionMode:kt?"master":"player",searchPlaceholder:_t,emptyLabel:Pt})]}),e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-username",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:f.username,placeholder:"Auto-generated",readOnly:!0,className:"readonly-input"})]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:f.firstName,onChange:P=>ve(P.target.value),placeholder:"Enter first name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:f.lastName,onChange:P=>Le(P.target.value),placeholder:"Enter last name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:f.phoneNumber,onChange:P=>He(P.target.value),placeholder:"User contact"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Password ",e.jsx("span",{className:"locked-chip",children:"Locked"})]}),e.jsx("input",{type:"text",value:f.password.toUpperCase(),readOnly:!0,className:"readonly-input",placeholder:"Auto-generated from name + phone"})]})]}),re==="player"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:f.minBet,onChange:P=>O(T=>({...T,minBet:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:f.maxBet,onChange:P=>O(T=>({...T,maxBet:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:f.creditLimit,onChange:P=>O(T=>({...T,creditLimit:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit:"}),e.jsx("input",{type:"number",value:f.balanceOwed,onChange:P=>O(T=>({...T,balanceOwed:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-12",children:[e.jsx("label",{children:"Referred By Player"}),e.jsxs("div",{className:"agent-search-picker referral-search-picker",onFocus:()=>Oe(!0),onBlur:()=>{setTimeout(()=>{ea(),Oe(!1)},120)},tabIndex:0,children:[e.jsx("div",{className:"referral-search-head",children:e.jsx("input",{type:"text",value:ke,onChange:P=>{Xt(P.target.value),Oe(!0)},onFocus:()=>Oe(!0),placeholder:"Search player (leave blank for no referral)",autoComplete:"off"})}),Ge&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${f.referredByUserId?"":"selected"}`,onMouseDown:P=>{P.preventDefault(),Et(null)},children:e.jsx("span",{children:"No referral"})}),xt.map(P=>e.jsxs("button",{type:"button",className:`agent-search-item ${String(f.referredByUserId||"")===String(P.id)?"selected":""} ${P.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:T=>{T.preventDefault(),Et(P)},children:[e.jsx("span",{children:P.label}),P.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-badge",children:"Duplicate"})]},P.id)),xt.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching players"})]})]}),e.jsx("div",{className:"player-referral-settings",children:e.jsx("div",{className:`player-freeplay-toggle ${f.grantStartingFreeplay?"is-selected":"is-unselected"}`,children:e.jsxs("label",{className:"player-freeplay-toggle-row",children:[e.jsx("input",{type:"checkbox",checked:!!f.grantStartingFreeplay,onChange:P=>O(T=>({...T,grantStartingFreeplay:P.target.checked}))}),e.jsx("span",{className:"player-freeplay-toggle-copy",children:e.jsx("span",{className:"player-freeplay-toggle-title",children:"$200 new player freeplay bonus"})})]})})})]})]}),re==="agent"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet: (Standard)"}),e.jsx("input",{type:"number",value:f.defaultMinBet,onChange:P=>O(T=>({...T,defaultMinBet:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet: (Standard)"}),e.jsx("input",{type:"number",value:f.defaultMaxBet,onChange:P=>O(T=>({...T,defaultMaxBet:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit: (Standard)"}),e.jsx("input",{type:"number",value:f.defaultCreditLimit,onChange:P=>O(T=>({...T,defaultCreditLimit:P.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit: (Standard)"}),e.jsx("input",{type:"number",value:f.defaultSettleLimit,onChange:P=>O(T=>({...T,defaultSettleLimit:P.target.value}))})]})]}),(re==="agent"||re==="super_agent")&&(()=>{const P=parseFloat(f.agentPercent)||0,T=parseFloat(E)||0,be=P+T,V=(()=>{const et=String(f.agentId||"").trim();if(!Fe||!et)return!1;const gt=Is(Fe,et);if(gt.length<2)return!1;const mt=Jt(Fe?.role);if(mt==="master_agent"||mt==="super_agent")return!0;for(let pt=1;pt<gt.length-1;pt++){const ft=Aa(Fe,gt[pt]);if(ft&&qt(ft))return!0}return!1})(),De=be!==100&&V,Me=De&&parseFloat(Pe)||0,We=M.reduce((et,gt)=>et+(parseFloat(gt.percent)||0),0),Ce=P+T+Me+We,$e=100-Ce,Ie=Ce===100?"#16a34a":Ce>100?"#ef4444":"#f59e0b",ot=String(f.agentId||"").trim()&&Xe?String(Xe.username||"").toUpperCase():String(Ve||"").toUpperCase()||"HIRING AGENT",Ct=Fe&&String(Fe.username||"").toUpperCase()||"ADMIN";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"commission-split-header",children:[e.jsx("span",{className:"commission-split-title",children:"Commission Split"}),e.jsxs("span",{className:"commission-split-total",style:{color:Ie},children:[Ce.toFixed(2),"%",Ce===100?" ✓":Ce>100?" over":" / 100%"]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Agent % ",e.jsx("span",{className:"commission-name-tag",children:String(f.username||"").toUpperCase()||"NEW AGENT"})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 90",value:f.agentPercent,onChange:et=>O(gt=>({...gt,agentPercent:et.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Hiring Agent % ",e.jsx("span",{className:"commission-name-tag",children:ot})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:E,onChange:et=>ie(et.target.value)})]}),De&&e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent % ",e.jsx("span",{className:"commission-name-tag",children:Ct})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:Pe,onChange:et=>z(et.target.value)})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Player Rate ($)"}),e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"e.g. 25",value:f.playerRate,onChange:et=>O(gt=>({...gt,playerRate:et.target.value}))})]})]}),De&&(Ce<100&&M.every(mt=>mt.percent!=="")?[...M,{id:`new-${Date.now()}`,name:"",percent:"",isNew:!0}]:M).map((mt,pt)=>e.jsxs("div",{className:"customer-create-row commission-extra-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-4",children:[e.jsxs("label",{children:["Sub Agent ",pt+1," Name"]}),e.jsx("input",{type:"text",placeholder:"Username",value:mt.name,onChange:ft=>{if(mt.isNew)Z(ct=>[...ct,{id:Date.now(),name:ft.target.value,percent:""}]);else{const ct=[...M];ct[pt]={...ct[pt],name:ft.target.value},Z(ct)}}})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent ",pt+1," %"]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"%",value:mt.percent,onChange:ft=>{if(mt.isNew)Z(ct=>[...ct,{id:Date.now(),name:"",percent:ft.target.value}]);else{const ct=[...M];ct[pt]={...ct[pt],percent:ft.target.value},Z(ct)}}})]}),e.jsx("div",{className:"filter-group customer-field-span-2 commission-remove-cell",children:!mt.isNew&&e.jsx("button",{type:"button",className:"commission-remove-btn",onClick:()=>Z(ft=>ft.filter((ct,ta)=>ta!==pt)),children:"Remove"})})]},mt.id)),De&&Ce<100&&e.jsx("div",{className:"commission-add-row",children:e.jsxs("span",{className:"commission-remaining",style:{color:Ie},children:[$e.toFixed(2),"% remaining"]})})]})})()]}),e.jsxs("aside",{className:"customer-create-sidebar",children:[e.jsxs("div",{className:"customer-create-side-card customer-create-actions",children:[e.jsx("button",{className:"btn-primary",onClick:c,disabled:!yt,children:u?"Deploying...":`Create ${re==="player"?"Player":re==="agent"?"Agent":"Master Agent"}`}),e.jsx("button",{type:"button",className:"btn-secondary customer-copy-button",onClick:()=>{navigator.clipboard.writeText(Fl(re,f)).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]}),(C==="admin"||C==="master_agent"||C==="super_agent"||C==="agent")&&e.jsxs("div",{className:"customer-create-side-card customer-create-import-panel",children:[e.jsx("label",{children:"Import Players (.xlsx / .csv)"}),e.jsx("input",{type:"file",accept:".xlsx,.csv",onChange:P=>{const T=P.target.files?.[0]||null;$(T),b(T?.name||"")}}),v&&e.jsxs("small",{className:"customer-import-file-name",children:["Selected file: ",v]}),e.jsxs("label",{className:"customer-import-toggle",children:[e.jsx("input",{type:"checkbox",checked:l,onChange:P=>Y(P.target.checked)}),e.jsx("span",{children:C==="agent"?"Assign all imported players to me":"Assign all imported players to selected agent"})]}),l&&C!=="agent"&&e.jsxs("select",{value:pe,onChange:P=>G(P.target.value),style:{width:"100%",padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:"4px",fontSize:"13px",marginTop:"4px"},children:[e.jsx("option",{value:"",children:"— Select agent —"}),p.filter(P=>{const T=String(P.role||"").toLowerCase();return T==="agent"||T==="master_agent"||T==="super_agent"}).sort((P,T)=>String(P.username||"").localeCompare(String(T.username||""))).map(P=>{const T=String(P.id||""),be=String(P.role||"").toLowerCase()==="agent"?"Agent":"Master Agent";return e.jsxs("option",{value:T,children:[String(P.username||T).toUpperCase()," (",be,")"]},T)})]}),e.jsx("button",{type:"button",className:"btn-primary",onClick:F,disabled:!B||k,children:k?"Importing...":"Import File"})]})]})]}),e.jsx("style",{children:`
            .apps-card { background:#fff; border:1px solid #d1d5db; padding:16px; border-radius:4px; }
            .apps-title { font-size:15px; font-weight:700; color:#1e3a5f; margin:0 0 12px 0; }
            .apps-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
            .apps-field { display:flex; flex-direction:column; }
            .apps-field label { color:#4b5563; font-size:11px; margin-bottom:3px; font-weight:600; }
            .apps-field input { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
            .apps-field input:focus { border-bottom-color:#1e40af; }
            .apps-field-full { grid-column:1/-1; }
            .customer-create-shell {
              display: grid;
              grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
              gap: 24px;
              align-items: start;
            }
            .customer-create-main {
              display: flex;
              flex-direction: column;
              gap: 18px;
              min-width: 0;
            }
            .customer-create-top-row {
              display: flex;
              flex-wrap: wrap;
              gap: 18px 20px;
              align-items: flex-start;
            }
            .customer-top-field {
              min-width: 0;
            }
            .customer-top-field-type {
              flex: 0 0 180px;
            }
            .customer-top-field-prefix {
              flex: 0 0 180px;
            }
            .customer-top-field-assignment {
              flex: 1.4 1 320px;
            }
            .customer-top-field-username {
              flex: 1 1 240px;
            }
            .customer-create-row {
              display: grid;
              grid-template-columns: repeat(12, minmax(0, 1fr));
              gap: 18px 20px;
              align-items: start;
            }
            .customer-field-span-2 {
              grid-column: span 2;
            }
            .customer-field-span-3 {
              grid-column: span 3;
            }
            .customer-field-span-4 {
              grid-column: span 4;
            }
            .customer-field-span-12 {
              grid-column: 1 / -1;
            }

            /* ── Commission Split ─────────────────── */
            .commission-split-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 10px 0 4px;
              border-top: 1px solid #e2e8f0;
              margin-top: 6px;
            }
            .commission-split-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
            }
            .commission-split-total {
              font-size: 13px;
              font-weight: 700;
            }
            .commission-name-tag {
              display: inline-block;
              font-weight: 500;
              font-size: 10px;
              color: #64748b;
              background: #f1f5f9;
              border-radius: 4px;
              padding: 1px 5px;
              margin-left: 4px;
              vertical-align: middle;
            }
            .commission-extra-row {
              margin-top: -8px;
            }
            .commission-remove-cell {
              display: flex;
              align-items: flex-end;
              padding-bottom: 2px;
            }
            .commission-remove-btn {
              padding: 7px 16px;
              font-size: 12px;
              font-weight: 600;
              background: #fee2e2;
              color: #dc2626;
              border: 1px solid #fca5a5;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.15s;
            }
            .commission-remove-btn:hover {
              background: #fecaca;
            }
            .commission-add-row {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 2px 0 4px;
            }
            .commission-add-btn {
              padding: 7px 18px;
              font-size: 12px;
              font-weight: 600;
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #bfdbfe;
              border-radius: 8px;
              cursor: pointer;
              transition: background 0.15s;
            }
            .commission-add-btn:hover {
              background: #dbeafe;
            }
            .commission-remaining {
              font-size: 12px;
              font-weight: 600;
            }

            .assignment-tree-filter-group {
              min-width: 0;
            }
            .assignment-field-label {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              flex-wrap: wrap;
            }
            .assignment-selected-chip {
              display: inline-flex;
              align-items: center;
              padding: 4px 10px;
              border-radius: 999px;
              background: #eff6ff;
              color: #1d4ed8;
              border: 1px solid #bfdbfe;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .customer-create-sidebar {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .customer-create-side-card {
              display: flex;
              flex-direction: column;
              gap: 12px;
              padding: 18px;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
              box-shadow: 0 10px 26px rgba(15, 23, 42, 0.06);
            }
            .customer-create-actions .btn-primary,
            .customer-create-actions .btn-secondary,
            .customer-create-import-panel .btn-primary {
              width: 100%;
              min-height: 48px;
            }
            .customer-copy-button {
              background: #17a2b8 !important;
              color: #ffffff !important;
            }
            .customer-create-import-panel label {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
            }
            .customer-create-import-panel input[type="file"] {
              width: 100%;
            }
            .customer-import-file-name {
              display: block;
              color: #64748b;
              line-height: 1.35;
            }
            .customer-import-toggle {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              color: #64748b !important;
              font-size: 12px !important;
              font-weight: 600 !important;
              line-height: 1.4;
            }
            .customer-import-toggle input {
              margin-top: 2px;
            }
            .customer-import-warning {
              display: block;
              color: #ef4444;
              line-height: 1.4;
            }
            .agent-search-picker {
              position: relative;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #f8fafc;
              z-index: 20;
            }
            .agent-search-picker:focus-within {
              z-index: 120;
            }
            .referral-search-picker {
              z-index: 24;
            }
            .referral-search-picker:focus-within {
              z-index: 160;
            }
            .agent-search-head {
              display: grid;
              grid-template-columns: auto 1fr;
              align-items: center;
            }
            .referral-search-head {
              display: block;
            }
            .agent-search-label {
              padding: 10px 12px;
              border-right: 1px solid #cbd5e1;
              color: #334155;
              font-size: 13px;
              font-weight: 600;
              white-space: nowrap;
            }
            .agent-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .referral-search-head input {
              border: none !important;
              background: transparent !important;
              padding: 10px 12px !important;
              outline: none;
              width: 100%;
              min-height: 42px;
            }
            .agent-search-list {
              position: absolute;
              z-index: 180;
              left: 0;
              right: 0;
              top: calc(100% + 6px);
              max-height: 240px;
              overflow-y: auto;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              background: #ffffff;
              box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
            }
            .agent-search-item {
              width: 100%;
              border: none;
              background: #fff;
              padding: 10px 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              cursor: pointer;
              font-size: 13px;
              color: #1e293b;
              border-bottom: 1px solid #e2e8f0;
              text-align: left;
            }
            .agent-search-item:last-child {
              border-bottom: none;
            }
            .agent-search-item:hover,
            .agent-search-item.selected {
              background: #e2f2ff;
            }
            .agent-type-badge {
              font-weight: 800;
              font-size: 12px;
              line-height: 1;
              letter-spacing: 0.03em;
            }
            .agent-type-badge.master { color: #0f8a0f; }
            .agent-type-badge.agent { color: #dc2626; }
            .agent-type-badge.super { color: #5b21b6; }
            .agent-type-badge.admin { color: #1d4ed8; }
            .agent-search-empty {
              padding: 10px 12px;
              color: #64748b;
              font-size: 12px;
            }
            .locked-chip {
              display: inline-flex;
              align-items: center;
              margin-left: 6px;
              padding: 1px 6px;
              border-radius: 999px;
              border: 1px solid #d1d5db;
              background: #f8fafc;
              color: #334155;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .duplicate-warning-state {
              border: 1px solid #f1d178;
              border-radius: 10px;
              background: #fff8dd;
              color: #6b4e00;
              padding: 12px;
              margin-top: 10px;
            }
            .duplicate-warning-title {
              font-size: 13px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-bottom: 4px;
            }
            .duplicate-warning-message {
              font-size: 13px;
              line-height: 1.4;
              margin-bottom: 8px;
            }
            .duplicate-warning-list {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .duplicate-warning-item {
              display: grid;
              grid-template-columns: minmax(78px, auto) 1fr;
              gap: 2px 10px;
              border: 1px solid #ecd28b;
              border-radius: 8px;
              background: #fffdf2;
              padding: 8px 10px;
              font-size: 12px;
              line-height: 1.25;
            }
            .duplicate-warning-item strong {
              color: #4f3200;
            }
            .duplicate-warning-actions {
              display: flex;
              gap: 8px;
              justify-content: flex-end;
              margin-top: 10px;
            }
            .duplicate-warning-cancel,
            .duplicate-warning-confirm {
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              cursor: pointer;
              transition: background 0.15s ease, transform 0.15s ease;
            }
            .duplicate-warning-cancel {
              border: 1px solid #d1d5db;
              background: #ffffff;
              color: #475569;
            }
            .duplicate-warning-cancel:hover {
              background: #f1f5f9;
            }
            .duplicate-warning-confirm {
              border: 1px solid #b45309;
              background: #d97706;
              color: #ffffff;
            }
            .duplicate-warning-confirm:hover {
              background: #b45309;
            }
            .duplicate-warning-confirm:disabled,
            .duplicate-warning-cancel:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            .duplicate-warning-item span:last-child {
              color: #6f5400;
            }
            @media (max-width: 600px) {
              .duplicate-warning-item {
                grid-template-columns: 1fr;
                gap: 3px;
              }
            }
            @media (max-width: 1280px) {
              .customer-create-shell {
                grid-template-columns: minmax(0, 1fr);
              }
              .customer-create-sidebar {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
              }
            }
            @media (max-width: 900px) {
              .customer-create-top-row {
                gap: 14px;
              }
              .customer-top-field-type,
              .customer-top-field-prefix {
                flex-basis: 160px;
              }
              .customer-top-field-assignment,
              .customer-top-field-username {
                flex-basis: 220px;
              }
              .customer-create-row {
                grid-template-columns: repeat(6, minmax(0, 1fr));
              }
              .customer-field-span-2,
              .customer-field-span-3,
              .customer-field-span-4 {
                grid-column: span 3;
              }
              .customer-field-span-12 {
                grid-column: 1 / -1;
              }
              .assignment-tree-filter-group {
                grid-column: span 6;
              }
            }
            @media (max-width: 720px) {
              .customer-create-sidebar {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 640px) {
              .customer-create-top-row {
                display: grid;
                grid-template-columns: 1fr;
                gap: 14px;
              }
              .customer-top-field-type,
              .customer-top-field-prefix,
              .customer-top-field-assignment,
              .customer-top-field-username {
                flex: none;
              }
              .customer-create-row {
                grid-template-columns: 1fr;
                gap: 14px;
              }
              .customer-field-span-2,
              .customer-field-span-3,
              .customer-field-span-4,
              .customer-field-span-12,
              .assignment-tree-filter-group {
                grid-column: 1 / -1;
              }
              .assignment-field-label {
                align-items: flex-start;
                flex-direction: column;
                gap: 6px;
              }
              .customer-create-side-card {
                padding: 16px;
              }
              .commission-remove-cell {
                grid-column: 1 / -1;
              }
              .commission-extra-row {
                margin-top: 0;
              }
            }
          `})]})]})}function _l({onBack:t}){const[r,o]=a.useState(!0),[m,p]=a.useState("player"),[x,S]=a.useState(()=>String(localStorage.getItem("userRole")||"admin").toLowerCase());a.useEffect(()=>{(async()=>{const w=localStorage.getItem("token")||sessionStorage.getItem("token");if(w)try{const u=await la(w);u?.role&&S(String(u.role).toLowerCase())}catch(u){console.error("Failed to load add-customer role context:",u)}})()},[]);const L=["admin","super_agent","master_agent"].includes(x),j=g=>{p(g),o(!1)},U=()=>e.jsx("div",{className:"picker-overlay",onClick:()=>o(!1),children:e.jsxs("div",{className:"picker-modal",onClick:g=>g.stopPropagation(),children:[e.jsxs("div",{className:"picker-header",children:[e.jsx("span",{children:"Add Customer"}),e.jsx("button",{type:"button",onClick:()=>o(!1),children:"×"})]}),e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>j("player"),children:[e.jsx("i",{className:"fa-solid fa-user-plus"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Player"}),e.jsx("p",{children:"Create or import player accounts."})]})]}),L&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>j("agent"),children:[e.jsx("i",{className:"fa-solid fa-user-gear"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Agent"}),e.jsx("p",{children:"Create a new agent account."})]})]}),L&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>j("super_agent"),children:[e.jsx("i",{className:"fa-solid fa-user-tie"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Master"}),e.jsx("p",{children:"Create a master agent account."})]})]})]})});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Add Customer"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:t&&e.jsx("button",{type:"button",className:"btn-secondary",onClick:t,children:"Back"})})]}),e.jsx("div",{className:"view-content",children:e.jsx($l,{initialType:m})}),r&&U(),e.jsx("style",{children:`
        .picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 16px 16px;
          z-index: 1200;
        }

        .picker-modal {
          width: min(480px, 100%);
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
          overflow: hidden;
        }

        .picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .picker-header button {
          border: none;
          background: transparent;
          font-size: 28px;
          line-height: 1;
          color: #64748b;
          cursor: pointer;
        }

        .picker-option {
          width: 100%;
          border: none;
          border-top: 1px solid #e2e8f0;
          background: #fff;
          padding: 18px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          text-align: left;
          cursor: pointer;
        }

        .picker-option:hover {
          background: #f8fafc;
        }

        .picker-option i {
          color: #0d3b5c;
          font-size: 20px;
          margin-top: 2px;
        }

        .picker-option strong {
          display: block;
          color: #0f172a;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .picker-option p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }
      `})]})}const Qo=Object.freeze(Object.defineProperty({__proto__:null,default:_l},Symbol.toStringTag,{value:"Module"}));function Rl(){const[t,r]=a.useState(""),[o,m]=a.useState("all"),[p,x]=a.useState("all"),[S,L]=a.useState([]),[j,U]=a.useState(!0),[g,w]=a.useState(""),[u,d]=a.useState(null),[k,Q]=a.useState({dailyLimit:"",monthlyLimit:"",used:"",status:"active"}),[B,$]=a.useState({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),[v,b]=a.useState(!1),R=f=>`$${Number(f||0).toLocaleString()}`,n=f=>{const O=f.monthlyLimit||1;return Math.min(f.used/O*100,100)},I=f=>f>=85?"critical":f>=65?"warning":"normal",D=a.useMemo(()=>S.reduce((f,O)=>(f.daily+=O.dailyLimit,f.monthly+=O.monthlyLimit,f.used+=O.used,f),{daily:0,monthly:0,used:0}),[S]),l=async()=>{try{U(!0);const f=localStorage.getItem("token");if(!f){L([]),w("Please login to load limits.");return}const O=await ri(f);L(O),w("")}catch(f){console.error("Error loading third party limits:",f),w(f.message||"Failed to load limits")}finally{U(!1)}};a.useEffect(()=>{l();const f=setInterval(()=>{document.hidden||l()},12e4),O=()=>{document.hidden||l()};return document.addEventListener("visibilitychange",O),()=>{clearInterval(f),document.removeEventListener("visibilitychange",O)}},[]);const Y=S.filter(f=>{const O=f.provider.toLowerCase().includes(t.toLowerCase()),H=o==="all"||f.status===o,_=n(f),E=p==="all"||p==="over-80"&&_>=80||p==="60-80"&&_>=60&&_<80||p==="under-60"&&_<60;return O&&H&&E}),pe=f=>{d(f.id),Q({dailyLimit:f.dailyLimit,monthlyLimit:f.monthlyLimit,used:f.used,status:f.status})},G=()=>{d(null),Q({dailyLimit:"",monthlyLimit:"",used:"",status:"active"})},N=async f=>{try{const O=localStorage.getItem("token");if(!O){w("Please login to update limits.");return}const H={dailyLimit:Number(k.dailyLimit)||0,monthlyLimit:Number(k.monthlyLimit)||0,used:Number(k.used)||0,status:k.status},_=await li(f,H,O);L(E=>E.map(ie=>ie.id===f?{...ie,..._.limit}:ie)),G(),w("")}catch(O){console.error("Error updating limit:",O),w(O.message||"Failed to update limit")}},ee=async()=>{try{b(!0);const f=localStorage.getItem("token");if(!f){w("Please login to create limits.");return}const O={provider:B.provider.trim(),dailyLimit:Number(B.dailyLimit)||0,monthlyLimit:Number(B.monthlyLimit)||0,used:Number(B.used)||0,status:B.status},H=await ii(O,f);L(_=>[..._,H.limit]),$({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),w("")}catch(f){console.error("Error creating limit:",f),w(f.message||"Failed to create limit")}finally{b(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"3rd Party Limits"}),e.jsxs("span",{className:"count",children:[Y.length," providers"]})]}),e.jsxs("div",{className:"view-content",children:[j&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading limits..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!j&&!g&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Provider name",value:B.provider,onChange:f=>$(O=>({...O,provider:f.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Daily Limit"}),e.jsx("input",{type:"number",value:B.dailyLimit,onChange:f=>$(O=>({...O,dailyLimit:f.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Monthly Limit"}),e.jsx("input",{type:"number",value:B.monthlyLimit,onChange:f=>$(O=>({...O,monthlyLimit:f.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Used"}),e.jsx("input",{type:"number",value:B.used,onChange:f=>$(O=>({...O,used:f.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:B.status,onChange:f=>$(O=>({...O,status:f.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsx("button",{className:"btn-primary",onClick:ee,disabled:v||!B.provider.trim(),children:v?"Saving...":"Add Provider"})]}),e.jsxs("div",{className:"stats-container limits-summary",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Providers"}),e.jsx("div",{className:"amount",children:S.length}),e.jsxs("p",{className:"change",children:["Active: ",S.filter(f=>f.status==="active").length]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Daily Limit Total"}),e.jsx("div",{className:"amount",children:R(D.daily)}),e.jsx("p",{className:"change",children:"Across all providers"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Monthly Limit Total"}),e.jsx("div",{className:"amount",children:R(D.monthly)}),e.jsx("p",{className:"change",children:"Capacity for the month"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Used This Month"}),e.jsx("div",{className:"amount",children:R(D.used)}),e.jsxs("p",{className:"change",children:["Utilization: ",(D.used/(D.monthly||1)*100).toFixed(1),"%"]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Search provider",value:t,onChange:f=>r(f.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:o,onChange:f=>m(f.target.value),children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Utilization"}),e.jsxs("select",{value:p,onChange:f=>x(f.target.value),children:[e.jsx("option",{value:"all",children:"All Levels"}),e.jsx("option",{value:"over-80",children:"Over 80%"}),e.jsx("option",{value:"60-80",children:"60% - 80%"}),e.jsx("option",{value:"under-60",children:"Under 60%"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider"}),e.jsx("th",{children:"Daily Limit"}),e.jsx("th",{children:"Monthly Limit"}),e.jsx("th",{children:"Used"}),e.jsx("th",{children:"Utilization"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:Y.map(f=>{const O=n(f);return e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:f.provider})}),e.jsx("td",{children:u===f.id?e.jsx("input",{type:"number",value:k.dailyLimit,onChange:H=>Q(_=>({..._,dailyLimit:H.target.value})),className:"inline-input"}):R(f.dailyLimit)}),e.jsx("td",{children:u===f.id?e.jsx("input",{type:"number",value:k.monthlyLimit,onChange:H=>Q(_=>({..._,monthlyLimit:H.target.value})),className:"inline-input"}):R(f.monthlyLimit)}),e.jsx("td",{children:u===f.id?e.jsx("input",{type:"number",value:k.used,onChange:H=>Q(_=>({..._,used:H.target.value})),className:"inline-input"}):R(f.used)}),e.jsx("td",{children:e.jsxs("div",{className:"usage-meter",children:[e.jsx("div",{className:"usage-bar",children:e.jsx("div",{className:`usage-fill ${I(O)}`,style:{width:`${O}%`}})}),e.jsxs("span",{className:"usage-text",children:[O.toFixed(1),"%"]})]})}),e.jsx("td",{children:u===f.id?e.jsxs("select",{value:k.status,onChange:H=>Q(_=>({..._,status:H.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]}):e.jsx("span",{className:`badge ${f.status}`,children:f.status})}),e.jsx("td",{children:f.lastSync?new Date(f.lastSync).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:u===f.id?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>N(f.id),children:"Save"}),e.jsx("button",{className:"btn-small",onClick:G,children:"Cancel"})]}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>pe(f),children:"Edit"}),e.jsx("button",{className:"btn-small",children:"View"})]})})})]},f.id)})})]})})]})]})]})}const Jo=Object.freeze(Object.defineProperty({__proto__:null,default:Rl},Symbol.toStringTag,{value:"Module"}));function Ol(){const[t,r]=a.useState("agents"),[o,m]=a.useState(""),[p,x]=a.useState(""),[S,L]=a.useState("any"),[j,U]=a.useState("today"),[g,w]=a.useState("all-types"),[u,d]=a.useState("all-statuses"),[k,Q]=a.useState([]),[B,$]=a.useState(!0),[v,b]=a.useState(""),[R,n]=a.useState(""),[I,D]=a.useState(null),l=E=>Number(String(E).replace(/[^0-9.-]+/g,""))||0,Y=E=>`$${Number(E||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,pe=(E,ie)=>ie==="any"?!0:ie==="under-100"?E<100:ie==="100-500"?E>=100&&E<=500:ie==="500-1000"?E>500&&E<=1e3:ie==="over-1000"?E>1e3:!0,G=E=>{if(E?.type)return E.type;const ie=(E?.description||"").toLowerCase();return ie.includes("parlay")?"parlay":ie.includes("teaser")?"teaser":"straight"},N=a.useMemo(()=>k.filter(E=>{const ie=String(E.agent||"").toLowerCase().includes(o.toLowerCase()),Pe=String(E.customer||"").toLowerCase().includes(p.toLowerCase()),z=l(E.risk),M=g==="all-types"||G(E)===g,Z=u==="all-statuses"||String(E.status||"").toLowerCase()===u;return ie&&Pe&&M&&Z&&pe(z,S)}).sort((E,ie)=>t==="agents"?String(E.agent||"").localeCompare(String(ie.agent||"")):String(E.customer||"").localeCompare(String(ie.customer||""))),[k,o,p,S,g,u,t]),ee=N.reduce((E,ie)=>{E.risk+=l(ie.risk),E.toWin+=l(ie.toWin);const Pe=String(ie.status||"pending").toLowerCase();return E.byStatus[Pe]=(E.byStatus[Pe]||0)+1,E},{risk:0,toWin:0,byStatus:{}}),f=()=>{m(""),x(""),L("any"),U("today"),w("all-types"),d("all-statuses")},O=async E=>{try{$(!0);const ie=localStorage.getItem("token");if(!ie){Q([]),b("Please login to load bets.");return}const z=((await es(E,ie))?.bets||[]).map(M=>({...M,agent:String(M.agent||"direct"),customer:String(M.customer||M.username||""),description:String(M.description||M.selection||""),risk:Number(M.risk||0),toWin:Number(M.toWin||0),event:M?.match?.homeTeam&&M?.match?.awayTeam?`${M.match.homeTeam} vs ${M.match.awayTeam}`:"—",markets:Array.isArray(M.markets)?M.markets:[],accepted:M.accepted?new Date(M.accepted).toLocaleString():"—"}));Q(z),b("")}catch(ie){console.error("Error loading bets:",ie),b(ie.message||"Failed to load bets")}finally{$(!1)}};a.useEffect(()=>{O({time:j,type:g,status:u});const E=setInterval(()=>{document.hidden||O({agent:o,customer:p,amount:S,time:j,type:g,status:u})},9e4),ie=()=>{document.hidden||O({agent:o,customer:p,amount:S,time:j,type:g,status:u})};return document.addEventListener("visibilitychange",ie),()=>{clearInterval(E),document.removeEventListener("visibilitychange",ie)}},[o,p,S,j,g,u]);const H=async E=>{const ie=localStorage.getItem("token");if(!ie){b("Please login to delete bets.");return}if(window.confirm("Delete this bet? This cannot be undone."))try{n(""),D(E),await oi(E,ie),b(""),n("Bet deleted successfully."),await O({agent:o,customer:p,amount:S,time:j,type:g,status:u})}catch(Pe){b(Pe.message||"Failed to delete bet")}finally{D(null)}},_=()=>{n(""),O({agent:o,customer:p,amount:S,time:j,type:g,status:u})};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Props / Betting Management"})}),e.jsxs("div",{className:"view-content",children:[B&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading bets..."}),v&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:v}),R&&e.jsx("div",{style:{padding:"12px 20px",color:"#15803d",textAlign:"center",fontWeight:600},children:R}),!B&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{padding:"16px 20px",border:"1px solid #dbe4f0",borderRadius:"10px",marginBottom:"18px",background:"#f8fbff"},children:[e.jsx("strong",{style:{display:"block",marginBottom:"6px"},children:"Live Sportsbook Tickets"}),e.jsx("span",{style:{color:"#556274",fontSize:"14px"},children:"This screen now shows real sportsbook tickets from the `bets` collection only. Manual dummy bet entry has been removed."})]}),e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Tickets"}),e.jsx("div",{className:"amount",children:N.length}),e.jsx("p",{className:"change",children:"Filtered by current criteria"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Risk"}),e.jsx("div",{className:"amount",children:Y(ee.risk)}),e.jsx("p",{className:"change",children:"Across all tickets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Potential Payout"}),e.jsx("div",{className:"amount",children:Y(ee.toWin)}),e.jsx("p",{className:"change",children:"Current ticket payout value"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending / Won / Lost"}),e.jsxs("div",{className:"amount",children:[ee.byStatus.pending||0," / ",ee.byStatus.won||0," / ",ee.byStatus.lost||0]}),e.jsxs("p",{className:"change",children:["Void: ",ee.byStatus.void||0]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search",value:o,onChange:E=>m(E.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Players"}),e.jsx("input",{type:"text",placeholder:"Search",value:p,onChange:E=>x(E.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsxs("select",{value:S,onChange:E=>L(E.target.value),children:[e.jsx("option",{value:"any",children:"Any Amount"}),e.jsx("option",{value:"under-100",children:"Under $100"}),e.jsx("option",{value:"100-500",children:"$100 - $500"}),e.jsx("option",{value:"500-1000",children:"$500 - $1000"}),e.jsx("option",{value:"over-1000",children:"Over $1000"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:u,onChange:E=>d(E.target.value),children:[e.jsx("option",{value:"all-statuses",children:"All Statuses"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"won",children:"Won"}),e.jsx("option",{value:"lost",children:"Lost"}),e.jsx("option",{value:"void",children:"Void"})]})]}),e.jsx("button",{className:"btn-primary",onClick:_,children:"Search"}),e.jsx("button",{className:"btn-secondary",onClick:f,children:"Reset Filters"})]}),e.jsxs("div",{className:"tabs-container",children:[e.jsx("button",{className:`tab ${t==="agents"?"active":""}`,onClick:()=>r("agents"),children:"Agents"}),e.jsx("button",{className:`tab ${t==="players"?"active":""}`,onClick:()=>r("players"),children:"Players"})]}),e.jsxs("div",{className:"additional-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:j,onChange:E=>U(E.target.value),children:[e.jsx("option",{value:"today",children:"Today"}),e.jsx("option",{value:"this-week",children:"This Week"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Type"}),e.jsxs("select",{value:g,onChange:E=>w(E.target.value),children:[e.jsx("option",{value:"all-types",children:"All Types"}),e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]})]}),e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table betting-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Accepted (EST)"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:N.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No sportsbook bets found for the current filters."})}):N.map(E=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:E.agent})}),e.jsx("td",{children:e.jsx("strong",{children:E.customer})}),e.jsxs("td",{children:[e.jsx("div",{children:E.accepted}),e.jsx("div",{style:{color:"#6b7280",fontSize:"12px"},children:E.event})]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${G(E)}`,children:G(E)})}),e.jsxs("td",{className:"description-cell",children:[String(E.description||"").split(`
`).filter(Boolean).map((ie,Pe)=>e.jsx("div",{children:ie},Pe)),E.markets.length>0?e.jsxs("div",{style:{color:"#6b7280",fontSize:"12px",marginTop:"6px"},children:["Markets: ",E.markets.join(", ")]}):null]}),e.jsx("td",{children:e.jsx("span",{className:"amount-risk",children:Y(E.risk)})}),e.jsx("td",{children:e.jsx("span",{className:"amount-towin",children:Y(E.toWin)})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${E.status}`,children:E.status})}),e.jsx("td",{children:e.jsx("button",{className:"btn-delete",onClick:()=>H(E.id),disabled:I===E.id||E.status!=="pending",title:E.status==="pending"?"Delete bet":"Only pending bets can be deleted",children:I===E.id?"...":"×"})})]},E.id))})]})}),e.jsxs("div",{className:"summary-footer",children:[e.jsxs("span",{children:["Total Records: ",N.length]}),e.jsxs("span",{className:"risk-summary",children:["Risking: ",e.jsx("span",{className:"amount-risk",children:Y(ee.risk)}),"Potential Payout: ",e.jsx("span",{className:"amount-towin",children:Y(ee.toWin)})]})]})]})]})]})}const Ko=Object.freeze(Object.defineProperty({__proto__:null,default:Ol},Symbol.toStringTag,{value:"Module"}));function Ul(){const[t,r]=a.useState(""),[o,m]=a.useState("all"),[p,x]=a.useState("revenue"),[S,L]=a.useState("30d"),[j,U]=a.useState([]),[g,w]=a.useState({revenue:0,customers:0,avgWinRate:0,upAgents:0}),[u,d]=a.useState(!0),[k,Q]=a.useState(""),[B,$]=a.useState(!1),[v,b]=a.useState(!1),[R,n]=a.useState(""),[I,D]=a.useState(null),l=N=>`$${Number(N||0).toLocaleString(void 0,{maximumFractionDigits:0})}`,Y=j.filter(N=>{const ee=N.name.toLowerCase().includes(t.toLowerCase()),f=o==="all"||N.trend===o;return ee&&f}).sort((N,ee)=>p==="customers"?ee.customers-N.customers:p==="winRate"?ee.winRate-N.winRate:ee.revenue-N.revenue),pe=async()=>{try{d(!0);const N=localStorage.getItem("token");if(!N){U([]),Q("Please login to load performance.");return}const ee=await ci({period:S},N),f=(ee.agents||[]).map(O=>({...O,lastActive:O.lastActive?new Date(O.lastActive).toLocaleString():"—"}));U(f),w(ee.summary||{revenue:0,customers:0,avgWinRate:0,upAgents:0}),Q("")}catch(N){console.error("Error loading agent performance:",N),Q(N.message||"Failed to load agent performance")}finally{d(!1)}};a.useEffect(()=>{pe();const N=setInterval(()=>{document.hidden||pe()},12e4),ee=()=>{document.hidden||pe()};return document.addEventListener("visibilitychange",ee),()=>{clearInterval(N),document.removeEventListener("visibilitychange",ee)}},[S]);const G=async N=>{try{$(!0),b(!0),n(""),D(null);const ee=localStorage.getItem("token");if(!ee)throw new Error("Please login to view details.");const f=await di(N.id,{period:S},ee);D(f)}catch(ee){n(ee.message||"Failed to load details")}finally{b(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Performance"}),e.jsxs("span",{className:"count",children:[Y.length," agents"]})]}),e.jsxs("div",{className:"view-content",children:[u&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading performance..."}),k&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:k}),!u&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Revenue"}),e.jsx("div",{className:"amount",children:l(g.revenue)}),e.jsx("p",{className:"change",children:"Across filtered agents"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsx("div",{className:"amount",children:g.customers}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Avg. Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(g.avgWinRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Active-customer settled bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Trending Up"}),e.jsx("div",{className:"amount",children:g.upAgents}),e.jsx("p",{className:"change",children:"Agents improving"})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agent"}),e.jsx("input",{type:"text",placeholder:"Search agent",value:t,onChange:N=>r(N.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Trend"}),e.jsxs("select",{value:o,onChange:N=>m(N.target.value),children:[e.jsx("option",{value:"all",children:"All Trends"}),e.jsx("option",{value:"up",children:"Trending Up"}),e.jsx("option",{value:"stable",children:"Stable"}),e.jsx("option",{value:"down",children:"Trending Down"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sort By"}),e.jsxs("select",{value:p,onChange:N=>x(N.target.value),children:[e.jsx("option",{value:"revenue",children:"Revenue"}),e.jsx("option",{value:"customers",children:"Active Customers"}),e.jsx("option",{value:"winRate",children:"Win Rate"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Period"}),e.jsxs("select",{value:S,onChange:N=>L(N.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tier"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Active / Total Customers"}),e.jsx("th",{children:"Win Rate"}),e.jsx("th",{children:"Trend"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:Y.map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:N.name})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${N.tier}`,children:N.tier})}),e.jsx("td",{children:l(N.revenue)}),e.jsxs("td",{children:[N.customers," / ",N.totalCustomers||0]}),e.jsx("td",{children:e.jsxs("div",{className:"win-rate",children:[e.jsx("div",{className:"win-rate-bar",children:e.jsx("div",{className:"win-rate-fill",style:{width:`${Math.min(N.winRate,100)}%`}})}),e.jsxs("span",{className:"win-rate-value",children:[Number(N.winRate||0).toFixed(1),"%"]})]})}),e.jsx("td",{children:e.jsx("span",{className:`trend ${N.trend}`,children:N.trend==="up"?"📈":N.trend==="down"?"📉":"➡️"})}),e.jsx("td",{children:N.lastActive}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:e.jsx("button",{className:"btn-small",onClick:()=>G(N),children:"View Details"})})})]},N.id))})]})})]})]}),B&&e.jsx("div",{className:"modal-overlay",onClick:()=>$(!1),children:e.jsxs("div",{className:"modal-content",style:{width:"min(980px, 95vw)",maxHeight:"86vh",overflowY:"auto"},onClick:N=>N.stopPropagation(),children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},children:[e.jsx("h3",{style:{margin:0},children:"Agent Details"}),e.jsx("button",{className:"btn-secondary",onClick:()=>$(!1),children:"Close"})]}),v&&e.jsx("div",{style:{padding:"12px"},children:"Loading details..."}),R&&e.jsx("div",{style:{padding:"12px",color:"red"},children:R}),I&&!v&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{marginBottom:"14px",fontWeight:700},children:[I.agent?.name," | Period: ",I.summary?.period?.toUpperCase()]}),e.jsxs("div",{className:"stats-container",style:{marginBottom:"16px"},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsxs("div",{className:"amount",children:[I.summary.activeCustomers," / ",I.summary.totalCustomers]}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(I.summary.winRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Settled bets only"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Handle / GGR"}),e.jsxs("div",{className:"amount",children:[l(I.summary.totalRisk)," / ",l(I.summary.ggr)]}),e.jsxs("p",{className:"change",children:["Hold: ",Number(I.summary.holdPct||0).toFixed(1),"%"]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bets"}),e.jsx("div",{className:"amount",children:I.summary.betsPlaced}),e.jsxs("p",{className:"change",children:["Settled: ",I.summary.settledBets," | Pending: ",I.summary.pendingBets]})]})]}),e.jsxs("div",{className:"table-container",style:{marginBottom:"14px"},children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Top Customers"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Bets"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"Win Rate"})]})}),e.jsxs("tbody",{children:[(I.topCustomers||[]).map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:N.username}),e.jsx("td",{children:N.bets}),e.jsx("td",{children:l(N.risk)}),e.jsxs("td",{children:[Number(N.winRate||0).toFixed(1),"%"]})]},N.userId)),(!I.topCustomers||I.topCustomers.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"4",children:"No customer performance data for this period."})})]})]})]}),e.jsxs("div",{className:"table-container",children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Recent Bets"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Accepted"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Selection"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"})]})}),e.jsxs("tbody",{children:[(I.recentBets||[]).map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:new Date(N.accepted).toLocaleString()}),e.jsx("td",{children:N.customer}),e.jsx("td",{children:N.type}),e.jsx("td",{children:N.selection}),e.jsx("td",{children:l(N.risk)}),e.jsx("td",{children:l(N.toWin)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${N.status}`,children:N.status})})]},N.id)),(!I.recentBets||I.recentBets.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No bets in this period."})})]})]})]})]})]})})]})}const Zo=Object.freeze(Object.defineProperty({__proto__:null,default:Ul},Symbol.toStringTag,{value:"Module"}));function Wl(){return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Analysis"})}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"analysis-container",children:[e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Betting Trends"}),e.jsx("p",{children:"Track and analyze betting patterns across all sports and markets."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Customer Analytics"}),e.jsx("p",{children:"Analyze customer behavior, retention rates, and spending patterns."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Revenue Analysis"}),e.jsx("p",{children:"Comprehensive revenue breakdown by sport, market, and time period."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Risk Analysis"}),e.jsx("p",{children:"Identify and assess potential risk factors in betting operations."}),e.jsx("button",{className:"btn-small",children:"View Details"})]})]})})]})}const Xo=Object.freeze(Object.defineProperty({__proto__:null,default:Wl},Symbol.toStringTag,{value:"Module"}));function zl({canManage:t=!0}){const[r,o]=a.useState([]),[m,p]=a.useState(!0),[x,S]=a.useState(""),[L,j]=a.useState(""),[U,g]=a.useState("all"),[w,u]=a.useState(null),[d,k]=a.useState(null),[Q,B]=a.useState(!1),$=async()=>{const I=localStorage.getItem("token");if(!I){S("Please login to view IP tracker."),p(!1);return}try{p(!0);const D=await ui({search:L,status:U},I);o(D.logs||[]),S("")}catch(D){console.error("Failed to load IP tracker:",D),S(D.message||"Failed to load IP tracker")}finally{p(!1)}};a.useEffect(()=>{$()},[L,U]);const v=async I=>{const D=localStorage.getItem("token");if(!D){S("Please login to block IPs.");return}if(!t){S("You do not have permission to manage IP actions.");return}try{u(I),await pi(I,D),o(l=>l.map(Y=>Y.id===I?{...Y,status:"blocked"}:Y))}catch(l){S(l.message||"Failed to block IP")}finally{u(null)}},b=async I=>{const D=localStorage.getItem("token");if(!D){S("Please login to unblock IPs.");return}if(!t){S("You do not have permission to manage IP actions.");return}try{u(I),await mi(I,D),o(l=>l.map(Y=>Y.id===I?{...Y,status:"active"}:Y))}catch(l){S(l.message||"Failed to unblock IP")}finally{u(null)}},R=async I=>{const D=localStorage.getItem("token");if(!D){S("Please login to whitelist IPs.");return}if(!t){S("You do not have permission to manage IP actions.");return}try{u(I),await hi(I,D),o(l=>l.map(Y=>Y.id===I?{...Y,status:"whitelisted"}:Y))}catch(l){S(l.message||"Failed to whitelist IP")}finally{u(null)}},n=I=>{k(I),B(!0)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"IP Tracker"})}),e.jsxs("div",{className:"view-content",children:[m&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading IP logs..."}),x&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:x}),!m&&!x&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Search"}),e.jsx("input",{type:"text",value:L,onChange:I=>j(I.target.value),placeholder:"User or IP"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:U,onChange:I=>g(I.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"blocked",children:"Blocked"})]})]})]}),!t&&e.jsx("div",{style:{marginBottom:"12px",color:"#f59e0b",fontWeight:600},children:"View-only mode: IP actions are disabled by your permissions."}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"IP Address"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Country"}),e.jsx("th",{children:"City"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:r.map(I=>e.jsxs("tr",{children:[e.jsx("td",{className:"monospace",children:I.ip}),e.jsx("td",{children:I.user}),e.jsx("td",{children:I.country||"Unknown"}),e.jsx("td",{children:I.city||"Unknown"}),e.jsx("td",{children:I.lastActive?new Date(I.lastActive).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${I.status}`,children:I.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>n(I),children:"View"}),I.status==="blocked"?e.jsx("button",{className:"btn-small",onClick:()=>b(I.id),disabled:w===I.id||!t,children:w===I.id?"Working...":"Unblock"}):I.status==="whitelisted"?e.jsx("button",{className:"btn-small",onClick:()=>b(I.id),disabled:w===I.id||!t,children:w===I.id?"Working...":"Un-whitelist"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-danger",onClick:()=>v(I.id),disabled:w===I.id||!t,children:w===I.id?"Working...":"Block"}),e.jsx("button",{className:"btn-small btn-primary",onClick:()=>R(I.id),disabled:w===I.id||!t,style:{marginLeft:"4px",backgroundColor:"#3b82f6"},children:w===I.id?"...":"Whitelist"})]})]})]},I.id))})]})})]})]}),Q&&d&&e.jsx("div",{className:"modal-overlay",onClick:()=>B(!1),children:e.jsxs("div",{className:"modal-content",onClick:I=>I.stopPropagation(),children:[e.jsx("h3",{children:"IP Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"IP:"})," ",d.ip]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",d.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Country:"})," ",d.country||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"City:"})," ",d.city||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",d.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Active:"})," ",d.lastActive?new Date(d.lastActive).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User Agent:"})," ",d.userAgent||"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>B(!1),children:"Close"})})]})})]})}const ec=Object.freeze(Object.defineProperty({__proto__:null,default:zl},Symbol.toStringTag,{value:"Module"})),Nn=[{value:"player-transactions",label:"Player Transactions"},{value:"agent-transactions",label:"Agent Transactions"},{value:"deleted-transactions",label:"Deleted Transactions"},{value:"free-play-transactions",label:"Free Play Transactions"},{value:"free-play-analysis",label:"Free Play Analysis"},{value:"player-summary",label:"Player Summary"}],wn=[{value:"all-types",label:"Transactions Type"},{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdrawal"},{value:"adjustment",label:"Adjustment"},{value:"wager",label:"Wager"},{value:"payout",label:"Payout"},{value:"casino",label:"Casino"},{value:"fp_deposit",label:"Free Play"}],Ut=t=>String(t||"").trim().toLowerCase(),Vl=new Set(["bet_placed","bet_placed_admin","bet_lost","casino_bet_debit"]),Hl=new Set(["bet_won","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Yl=new Set(["adjustment","credit_adj","debit_adj"]),Gl=new Set(["withdrawal","bet_placed","bet_placed_admin","bet_lost","fee","debit","casino_bet_debit"]),ql=new Set(["freeplay_adjustment","deposit_freeplay_bonus","referral_freeplay_bonus","new_player_freeplay_bonus"]),Ql=(t,r)=>{const o=Ut(r);if(!o||o==="all-types")return!0;const m=Ut(t?.type),p=Ut(t?.reason);return m===o?!0:o==="adjustment"?Yl.has(m):o==="wager"?Vl.has(m):o==="payout"?Hl.has(m):o==="casino"?m.startsWith("casino_"):o==="fp_deposit"?m==="fp_deposit"||ql.has(p):!1},Jl=(t,r)=>{if(!Array.isArray(t))return[];const o=Array.isArray(r)?r.map(m=>Ut(m)).filter(Boolean):[];return o.length===0||o.includes("all-types")?t:t.filter(m=>o.some(p=>Ql(m,p)))},$s=t=>{const r=Number(t?.signedAmount);if(Number.isFinite(r)&&r!==0)return r;const o=Number(t?.amount||0);if(!Number.isFinite(o))return 0;if(o<0)return o;const m=String(t?.entrySide||"").trim().toUpperCase();if(m==="DEBIT")return-Math.abs(o);if(m==="CREDIT")return Math.abs(o);const p=Number(t?.balanceBefore),x=Number(t?.balanceAfter);if(Number.isFinite(p)&&Number.isFinite(x)&&p!==x)return x<p?-Math.abs(o):Math.abs(o);const S=Ut(t?.type);return Gl.has(S)||Qn(t)?-Math.abs(o):Math.abs(o)},Sn=t=>t.reduce((r,o)=>{const m=$s(o),p=Math.abs(m);return r.count+=1,r.grossAmount+=p,r.netAmount+=m,m>=0?r.creditAmount+=m:r.debitAmount+=p,r},{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),kn=t=>{const r=new Date(t),o=r.getFullYear(),m=String(r.getMonth()+1).padStart(2,"0"),p=String(r.getDate()).padStart(2,"0");return`${o}-${m}-${p}`},rt=t=>{const r=Number(t||0);return Number.isNaN(r)?"0":Math.round(r).toLocaleString("en-US")},Cs=t=>{if(!t)return"—";const r=new Date(t);return Number.isNaN(r.getTime())?"—":r.toLocaleString()},Kl=new Set(["admin","agent","master_agent","super_agent"]),Zl=t=>{const r=new Set,o=[],m=p=>{if(!p||typeof p!="object")return;const x=String(p.id||"").trim(),S=String(p.username||"").trim(),L=String(p.role||"").trim().toLowerCase();x&&S&&Kl.has(L)&&!r.has(x)&&(r.add(x),o.push({id:x,username:S,role:L})),(Array.isArray(p.children)?p.children:[]).forEach(m)};return t?.root?m({...t.root,children:Array.isArray(t?.tree)?t.tree:[]}):Array.isArray(t?.tree)&&t.tree.forEach(m),o},Xl=t=>{if(!Array.isArray(t))return[];const r=new Set,o=[];return t.forEach(m=>{const p=String(m?.id||"").trim(),x=String(m?.username||"").trim();if(!p||!x||r.has(p))return;r.add(p);const S=String(m?.fullName||`${String(m?.firstName||"").trim()} ${String(m?.lastName||"").trim()}`).trim();o.push({id:p,username:x,fullName:S})}),o};function eo({viewContext:t}){const r=a.useMemo(()=>kn(new Date),[]),o=a.useMemo(()=>{const c=new Date;return c.setDate(c.getDate()-7),kn(c)},[]),[m,p]=a.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[x,S]=a.useState(""),[L,j]=a.useState(""),[U,g]=a.useState(t?.enteredBy||""),[w,u]=a.useState(["deposit","withdrawal"]),[d,k]=a.useState(!1),[Q,B]=a.useState("player-transactions"),[$,v]=a.useState(o),[b,R]=a.useState(r),[n,I]=a.useState([]),[D,l]=a.useState({count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),[Y,pe]=a.useState("transactions"),[G,N]=a.useState(wn),[ee,f]=a.useState(!0),[O,H]=a.useState(""),[_,E]=a.useState(!1),[ie,Pe]=a.useState(!1),[z,M]=a.useState(!1),[Z,he]=a.useState(!1),[ae,re]=a.useState([]),[Re,C]=a.useState([]),[ne,i]=a.useState([]),[W,oe]=a.useState(!1),ge=a.useRef(new Map);a.useEffect(()=>{const c=()=>p(window.innerWidth<=768);return window.addEventListener("resize",c),()=>window.removeEventListener("resize",c)},[]),a.useEffect(()=>{let c=!0;const F=localStorage.getItem("token");return F?((async()=>{try{const de=await Za(F);if(!c)return;re(Zl(de))}catch(de){console.error("Failed to fetch agent suggestions:",de),c&&re([])}})(),()=>{c=!1}):void 0},[]);const ke=a.useMemo(()=>{const c=x.trim().toLowerCase();return(c===""?ae:ae.filter(J=>String(J.username||"").toLowerCase().includes(c)||String(J.role||"").replace(/_/g," ").includes(c))).slice(0,12)},[ae,x]),ye=a.useMemo(()=>{const c=U.trim().toLowerCase(),F=new Set,J=[],de=(xe,ve=null)=>{const Le=String(xe||"").trim();if(!Le)return;const He=Le.toLowerCase();F.has(He)||(F.add(He),J.push({id:He,username:Le,role:ve}))};return Re.forEach(xe=>{de(xe?.value||xe?.username,xe?.role||null)}),n.forEach(xe=>{de(xe?.actorUsername||xe?.enteredBy,xe?.actorRole||null)}),ae.forEach(xe=>{de(xe?.username,xe?.role||null)}),de("HOUSE","admin"),(c===""?J:J.filter(xe=>xe.username.toLowerCase().includes(c))).slice(0,12)},[Re,U,n,ae]),Ge=a.useMemo(()=>{const c=new Set,F=[];return n.forEach(J=>{const de=String(J?.playerUsername||"").trim();if(!de)return;const Ne=de.toLowerCase();c.has(Ne)||(c.add(Ne),F.push({id:Ne,username:de,fullName:String(J?.playerName||"").trim()}))}),F.slice(0,12)},[n]);a.useEffect(()=>{if(!z)return;const c=localStorage.getItem("token");if(!c){i([]),oe(!1);return}const F=L.trim();if(F===""){i([]),oe(!1);return}const J=F.toLowerCase(),de=ge.current.get(J);if(de){i(de),oe(!1);return}let Ne=!1;oe(!0);const xe=window.setTimeout(async()=>{try{const ve=await ra(c,{q:F});if(Ne)return;const Le=Xl(ve).slice(0,12);ge.current.set(J,Le),i(Le)}catch(ve){console.error("Failed to fetch player suggestions:",ve),Ne||i([])}finally{Ne||oe(!1)}},220);return()=>{Ne=!0,window.clearTimeout(xe)}},[L,z]);const Oe=a.useMemo(()=>L.trim()===""?Ge:ne,[L,Ge,ne]),Ve=a.useMemo(()=>G.map(c=>({value:Ut(c?.value),label:String(c?.label||c?.value||"").trim()})).filter(c=>c.value&&c.label),[G]),it=a.useMemo(()=>Ve.filter(c=>c.value!=="all-types"),[Ve]),qe=a.useMemo(()=>it.map(c=>c.value),[it]),Qe=a.useMemo(()=>{if(w.includes("all-types"))return["all-types"];const c=new Set(qe),F=w.map(J=>Ut(J)).filter(J=>c.has(J));return F.length>0?F:["all-types"]},[w,qe]),Fe=c=>{const F=String(c||"").toLowerCase();return F==="master_agent"?"MASTER":F==="super_agent"?"SUPER":F==="admin"?"ADMIN":"AGENT"},dt=async(c={})=>{const F=localStorage.getItem("token");if(!F){H("Please login to view transaction history."),f(!1);return}const J=c.mode!==void 0?c.mode:Q,de=c.startDate!==void 0?c.startDate:$,Ne=c.endDate!==void 0?c.endDate:b,xe=c.selectedTypeValues!==void 0?c.selectedTypeValues:Qe,ve=c.agentsSearch!==void 0?c.agentsSearch:x,Le=c.playersSearch!==void 0?c.playersSearch:L,He=c.enteredBySearch!==void 0?c.enteredBySearch:U;if(de&&Ne&&de>Ne){H("Start date cannot be after end date.");return}try{f(!0),H("");const yt=xe.length===1?xe[0]:"all-types",Dt=ve.trim()!==""||Le.trim()!==""||He.trim()!=="",kt={mode:J,agents:ve,players:Le,transactionType:yt,startDate:de,endDate:Ne,limit:Dt?1e3:700};He.trim()!==""&&(kt.enteredBy=He.trim());const Xe=await La(kt,F),vt=Array.isArray(Xe?.rows)?Xe.rows:Array.isArray(Xe?.transactions)?Xe.transactions:[],_t=String(Xe?.resultType||"transactions"),Pt=_t==="transactions"&&xe.length>1&&!xe.includes("all-types"),Nt=Pt?Jl(vt,xe):vt;I(Nt),pe(_t),l(_t==="transactions"?Pt?Sn(Nt):Xe?.summary||Sn(Nt):Xe?.summary||{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0});const Tt=Array.isArray(Xe?.meta?.transactionTypes)?Xe.meta.transactionTypes:[];N(Tt.length>0?Tt:wn),C(Array.isArray(Xe?.meta?.enteredByOptions)?Xe.meta.enteredByOptions:[]),E(!0)}catch(yt){console.error("Failed to load transaction history:",yt),H(yt.message||"Failed to load transaction history")}finally{f(!1)}};a.useEffect(()=>{t?.enteredBy?(g(t.enteredBy),dt({enteredBySearch:t.enteredBy})):dt()},[]);const ht=c=>{c.preventDefault(),k(!1),dt()},nt=c=>{const F=Ut(c);if(F){if(F==="all-types"||qe.length===0){u(["all-types"]),dt({selectedTypeValues:["all-types"]});return}u(J=>{const de=J.includes("all-types")?[...qe]:J.map(ve=>Ut(ve)).filter(ve=>qe.includes(ve)),Ne=de.includes(F)?de.filter(ve=>ve!==F):[...de,F],xe=Ne.length===0||Ne.length===qe.length?["all-types"]:Ne;return dt({selectedTypeValues:xe}),xe})}},Ue=Nn.find(c=>c.value===Q)?.label||"Transaction History",Je=(c,F)=>{const J=c!==0?c:Number(F||0),de=rt(Math.abs(J));return J>=0?`+$${de}`:`-$${de}`},lt=()=>{const c=n.reduce((F,J)=>F+$s(J),0);return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Total: ",e.jsxs("span",{className:c<0?"negative":"txh-total-green",children:["$",rt(Math.abs(c))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-transactions",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Entered By"})]})}),e.jsxs("tbody",{children:[n.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,className:"txh-empty-cell",children:"No transactions matched these filters."})}):n.map((F,J)=>{const de=$s(F),Ne=de>=0;return e.jsxs("tr",{className:J%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-date",children:Cs(F.date)}),e.jsx("td",{className:"txh-col-user",children:String(F.agentUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(F.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-type",children:qn(F)}),e.jsx("td",{className:"txh-col-desc",children:F.description||F.reason||"—"}),e.jsx("td",{className:`txh-col-amount ${Ne?"txh-credit":"txh-debit"}`,children:Je(de,F.amount)}),e.jsx("td",{className:"txh-col-user",children:String(F.actorUsername||F.enteredBy||"HOUSE").toUpperCase()})]},`${String(F.id||F.transactionId||"tx")}-${J}`)}),n.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:5,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:`txh-col-amount ${c>=0?"txh-credit":"txh-debit"}`,children:e.jsxs("strong",{children:[c>=0?"+":"-","$",rt(Math.abs(c))]})}),e.jsx("td",{})]})]})]})})]})},Ke=()=>{const c=n.reduce((de,Ne)=>de+Number(Ne.creditAmount||0),0),F=n.reduce((de,Ne)=>de+Number(Ne.debitAmount||0),0),J=c-F;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net Free Play: ",e.jsxs("span",{className:J<0?"negative":"txh-total-green",children:["$",rt(Math.abs(J))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-analysis",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Free Play Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[n.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"txh-empty-cell",children:"No free play analysis data found."})}):n.map((de,Ne)=>{const xe=Number(de.netAmount||0);return e.jsxs("tr",{className:Ne%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(de.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(de.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(de.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",rt(de.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",rt(de.debitAmount)]}),e.jsxs("td",{className:xe<0?"txh-debit":"txh-credit",children:[xe>=0?"+":"-","$",rt(Math.abs(xe))]}),e.jsxs("td",{children:["$",rt(de.currentFreeplayBalance)]}),e.jsx("td",{className:"txh-col-date",children:Cs(de.lastTransactionAt)})]},`${String(de.playerId||de.playerUsername||"fp")}-${Ne}`)}),n.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",rt(c)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",rt(F)]})}),e.jsx("td",{className:J<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[J>=0?"+":"-","$",rt(Math.abs(J))]})}),e.jsx("td",{colSpan:2})]})]})]})})]})},St=()=>{const c=n.reduce((de,Ne)=>de+Number(Ne.creditAmount||0),0),F=n.reduce((de,Ne)=>de+Number(Ne.debitAmount||0),0),J=c-F;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net: ",e.jsxs("span",{className:J<0?"negative":"txh-total-green",children:["$",rt(Math.abs(J))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-summary",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Wagered"}),e.jsx("th",{children:"Payout"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[n.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:10,className:"txh-empty-cell",children:"No player summary data found."})}):n.map((de,Ne)=>{const xe=Number(de.netAmount||0);return e.jsxs("tr",{className:Ne%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(de.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(de.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(de.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",rt(de.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",rt(de.debitAmount)]}),e.jsxs("td",{className:xe<0?"txh-debit":"txh-credit",children:[xe>=0?"+":"-","$",rt(Math.abs(xe))]}),e.jsxs("td",{children:["$",rt(de.wagerAmount)]}),e.jsxs("td",{children:["$",rt(de.payoutAmount)]}),e.jsxs("td",{children:["$",rt(de.currentBalance)]}),e.jsx("td",{className:"txh-col-date",children:Cs(de.lastTransactionAt)})]},`${String(de.playerId||de.playerUsername||"summary")}-${Ne}`)}),n.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",rt(c)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",rt(F)]})}),e.jsx("td",{className:J<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[J>=0?"+":"-","$",rt(Math.abs(J))]})}),e.jsx("td",{colSpan:4})]})]})]})})]})};return e.jsxs("div",{className:"admin-view txh-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Transaction History"})}),e.jsxs("div",{className:"view-content txh-content",children:[e.jsxs("form",{className:"txh-filter-panel",onSubmit:ht,children:[e.jsxs("div",{className:`txh-search-row${ie?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Agents"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:x,onChange:c=>{S(c.target.value),Pe(!0)},onFocus:()=>{Pe(!0),M(!1),he(!1)},onBlur:()=>setTimeout(()=>Pe(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),ie&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Agent suggestions",children:ke.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching agents"}):ke.map(c=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:F=>{F.preventDefault(),S(String(c.username||"")),Pe(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(c.username||"").toUpperCase()}),e.jsx("span",{className:`txh-agent-badge role-${String(c.role||"agent").replace(/_/g,"-")}`,children:Fe(c.role)})]},c.id))})]})]}),e.jsxs("div",{className:`txh-search-row${z?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Players"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:L,onChange:c=>{j(c.target.value),M(!0)},onFocus:()=>{M(!0),Pe(!1),he(!1)},onBlur:()=>setTimeout(()=>M(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),z&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Player suggestions",children:W?e.jsx("div",{className:"txh-suggest-empty",children:"Loading players..."}):Oe.length===0?e.jsx("div",{className:"txh-suggest-empty",children:L.trim()===""?"Type to search players":"No matching players"}):Oe.map(c=>e.jsxs("button",{type:"button",className:"txh-suggest-item txh-suggest-item-player",onMouseDown:F=>{F.preventDefault(),j(String(c.username||"")),M(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(c.username||"").toUpperCase()}),e.jsx("span",{className:"txh-suggest-meta",children:c.fullName||"Player account"})]},c.id))})]})]}),e.jsxs("div",{className:`txh-search-row${Z?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Entered By"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:U,onChange:c=>{g(c.target.value),he(!0)},onFocus:()=>{he(!0),Pe(!1),M(!1)},onBlur:()=>setTimeout(()=>he(!1),120),placeholder:"Search who entered the transaction...",className:"txh-search-input",autoComplete:"off"}),Z&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Entered by suggestions",children:ye.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching users"}):ye.map(c=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:F=>{F.preventDefault(),g(String(c.username||"")),he(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(c.username||"").toUpperCase()}),c.role&&e.jsx("span",{className:`txh-agent-badge role-${String(c.role||"agent").replace(/_/g,"-")}`,children:c.role==="master_agent"?"MASTER":c.role==="super_agent"?"SUPER":c.role==="admin"?"ADMIN":"AGENT"})]},c.id))})]})]}),e.jsx("div",{className:"txh-filter-help",children:'Use "Entered By" to filter the person or house account that posted the transaction.'}),e.jsxs("div",{className:"txh-select-row",children:[e.jsxs("div",{className:"txh-type-filter-wrap",children:[e.jsxs("button",{type:"button",className:`txh-type-select txh-type-trigger${d?" open":""}`,onClick:()=>k(c=>!c),"aria-expanded":d,"aria-haspopup":"menu","aria-label":"Transactions type",children:[e.jsx("span",{children:Qe.includes("all-types")?"All Types":`${Qe.length} Type${Qe.length!==1?"s":""}`}),e.jsx("i",{className:`fa-solid fa-chevron-${d?"up":"down"}`,"aria-hidden":"true"})]}),d&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"txh-type-backdrop",onClick:()=>k(!1),"aria-label":"Close transaction type filters"}),e.jsx("div",{className:"txh-type-menu",role:"menu","aria-label":"Transaction type filters",children:it.length===0?e.jsx("div",{className:"txh-type-empty",children:"No transaction types available."}):it.map(c=>{const F=Qe.includes("all-types")||Qe.includes(c.value);return e.jsxs("label",{className:"txh-type-toggle-row",children:[e.jsx("span",{children:c.label}),e.jsxs("span",{className:"txh-switch",children:[e.jsx("input",{type:"checkbox",checked:F,onChange:()=>nt(c.value)}),e.jsx("span",{className:"txh-switch-slider"})]})]},c.value)})})]})]}),e.jsx("select",{value:Q,onChange:c=>{const F=c.target.value;B(F),k(!1),dt({mode:F})},className:"txh-mode-select","aria-label":"Report mode",children:Nn.map(c=>e.jsx("option",{value:c.value,children:c.label},c.value))})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:$,onChange:c=>v(c.target.value),className:"txh-date-input","aria-label":"Start date"})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:b,onChange:c=>R(c.target.value),className:"txh-date-input","aria-label":"End date"})]}),e.jsx("button",{type:"submit",className:"txh-search-btn","aria-label":"Search",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})})]}),e.jsxs("div",{className:"txh-result-head",children:[e.jsx("h3",{children:Ue}),e.jsxs("div",{className:"txh-summary-inline",children:[e.jsxs("span",{children:[Number(D.count||0)," Rows"]}),e.jsxs("span",{className:Number(D.netAmount||0)<0?"negative":"positive",children:["Net: ",rt(D.netAmount)]}),e.jsxs("span",{children:["Gross: ",rt(D.grossAmount)]})]})]}),ee&&e.jsx("div",{className:"txh-empty",children:"Loading transaction history..."}),!ee&&O&&e.jsx("div",{className:"txh-empty txh-error",children:O}),!ee&&!O&&_&&(Y==="analysis"?Ke():Y==="summary"?St():lt())]}),e.jsx("style",{children:`
        .txh-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .txh-filter-panel {
          background: #f7f7f8;
          border: 1px solid #d9d9dc;
          border-radius: 6px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 760px;
          position: relative;
          isolation: isolate;
        }
        .txh-search-row,
        .txh-date-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          align-items: stretch;
          border: 1px solid #d2d6db;
          border-radius: 4px;
          background: #fff;
          min-height: 48px;
        }
        .txh-search-row {
          position: relative;
          overflow: visible;
          z-index: 10;
        }
        .txh-search-row-open {
          z-index: 140;
        }
        .txh-date-row {
          grid-template-columns: 68px 1fr;
          overflow: hidden;
          position: relative;
          z-index: 1;
        }
        .txh-search-label,
        .txh-date-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-right: 1px solid #d2d6db;
          font-size: 16px;
          color: #404246;
          background: #f2f3f5;
          font-weight: 500;
        }
        .txh-search-input,
        .txh-date-input {
          border: none;
          padding: 0 16px;
          font-size: 16px;
          outline: none;
          background: #fff;
          color: #1f2937;
          min-height: 48px;
        }
        .txh-search-input-wrap {
          position: relative;
          display: flex;
          min-height: 48px;
          align-items: center;
        }
        .txh-search-input {
          width: 100%;
        }
        .txh-suggest-list {
          position: absolute;
          top: calc(100% + 2px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #d2d6db;
          border-radius: 8px;
          box-shadow: 0 14px 26px rgba(15, 23, 42, 0.16);
          max-height: 260px;
          overflow-y: auto;
          z-index: 160;
        }
        .txh-suggest-item {
          width: 100%;
          border: 0;
          border-bottom: 1px solid #edf1f5;
          background: #fff;
          padding: 10px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          text-align: left;
        }
        .txh-suggest-item:last-child {
          border-bottom: 0;
        }
        .txh-suggest-item:hover {
          background: #f7fafc;
        }
        .txh-suggest-item-player {
          display: grid;
          justify-content: initial;
          gap: 2px;
        }
        .txh-suggest-main {
          color: #0f172a;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.02em;
        }
        .txh-suggest-meta {
          color: #475569;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .txh-suggest-empty {
          padding: 11px 12px;
          color: #64748b;
          font-size: 13px;
        }
        .txh-agent-badge {
          border-radius: 999px;
          background: #e2e8f0;
          color: #0f172a;
          padding: 4px 8px;
          font-size: 10px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .txh-agent-badge.role-admin {
          background: #dbeafe;
          color: #1e3a8a;
        }
        .txh-agent-badge.role-master-agent {
          background: #dcfce7;
          color: #166534;
        }
        .txh-agent-badge.role-super-agent {
          background: #ede9fe;
          color: #5b21b6;
        }
        .txh-agent-badge.role-agent {
          background: #ffe4e6;
          color: #9f1239;
        }
        .txh-search-input::placeholder {
          color: #a0a7b0;
        }
        .txh-filter-help {
          margin-top: -2px;
          font-size: 12px;
          color: #5b6472;
          line-height: 1.4;
        }
        .txh-select-row {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 10px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        .txh-type-select,
        .txh-mode-select {
          border: 1px solid #ccd2d9;
          min-height: 52px;
          border-radius: 12px;
          font-size: 19px;
          padding: 0 14px;
          outline: none;
          background-color: #fff;
          color: #222831;
        }
        .txh-type-select {
          background: linear-gradient(180deg, #3ec1f1 0%, #2baddf 100%);
          color: #fff;
          border-color: #24a1d3;
          border-radius: 6px;
          font-size: 18px;
        }
        .txh-type-filter-wrap {
          position: relative;
        }
        .txh-type-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          cursor: pointer;
          text-align: left;
        }
        .txh-type-trigger span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .txh-type-trigger i {
          font-size: 14px;
          line-height: 1;
        }
        .txh-type-trigger.open {
          filter: brightness(0.95);
        }
        .txh-type-backdrop {
          position: fixed;
          inset: 0;
          border: 0;
          background: transparent;
          z-index: 180;
        }
        .txh-type-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: min(460px, calc(100vw - 56px));
          border: 1px solid #d2d6db;
          border-radius: 6px;
          background: #fff;
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.2);
          padding: 8px 12px 10px;
          z-index: 190;
          max-height: min(520px, calc(100dvh - 120px));
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .txh-type-empty {
          padding: 8px 0;
          color: #64748b;
          font-size: 14px;
        }
        .txh-type-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid #eef1f5;
          font-size: 15px;
          line-height: 1.2;
          color: #111827;
        }
        .txh-type-toggle-row:last-child {
          border-bottom: 0;
        }
        .txh-switch {
          position: relative;
          width: 48px;
          height: 26px;
          display: inline-block;
          flex-shrink: 0;
        }
        .txh-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .txh-switch-slider {
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: #b6bcc7;
          transition: 0.2s ease;
        }
        .txh-switch-slider:before {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          left: 3px;
          top: 3px;
          background: #fff;
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.35);
          transition: 0.2s ease;
        }
        .txh-switch input:checked + .txh-switch-slider {
          background: #22c55e;
        }
        .txh-switch input:checked + .txh-switch-slider:before {
          transform: translateX(22px);
        }
        .txh-search-btn {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: none;
          background: #f4c233;
          color: #fff;
          font-size: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-top: 2px;
        }
        .txh-search-btn:hover {
          filter: brightness(1.04);
        }
        .txh-result-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .txh-result-head h3 {
          margin: 0;
          font-size: 20px;
          color: #163047;
        }
        .txh-summary-inline {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }
        /* ── Table wrapper ── */
        .txh-table-wrap {
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0,0,0,0.10);
        }
        .txh-total-bar {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-bottom: none;
          padding: 10px 18px;
          font-size: 15px;
          font-weight: 600;
          color: #374151;
          text-align: right;
        }
        .txh-total-green { color: #16a34a; }
        .txh-scroll {
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          max-height: min(70vh, 720px);
          background: #fff;
        }
        /* ── Professional table ── */
        .txh-pro-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .txh-pro-table-transactions {
          min-width: 980px;
        }
        .txh-pro-table-analysis {
          min-width: 980px;
        }
        .txh-pro-table-summary {
          min-width: 1160px;
        }
        .txh-pro-table thead tr {
          background: #1a2535;
        }
        .txh-pro-table thead th {
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 13px 14px;
          text-align: left;
          white-space: nowrap;
          border: none;
          border-right: 1px solid #314157;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .txh-pro-table thead th:last-child {
          border-right: none;
        }
        .txh-pro-table tbody tr {
          border-bottom: 1px solid #edf2f7;
          transition: background 0.12s;
        }
        .txh-pro-table tbody tr:hover {
          background: #f0f7ff !important;
        }
        .txh-row-even { background: #ffffff; }
        .txh-row-odd  { background: #f8fafc; }
        .txh-pro-table td {
          padding: 11px 14px;
          color: #1e293b;
          vertical-align: middle;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #edf2f7;
        }
        .txh-pro-table td:last-child {
          border-right: none;
        }
        .txh-col-date {
          white-space: nowrap;
          font-size: 12px;
          color: #475569;
          min-width: 170px;
        }
        .txh-col-user {
          font-weight: 700;
          letter-spacing: 0.02em;
          font-size: 12px;
          min-width: 100px;
        }
        .txh-col-type {
          font-weight: 600;
          min-width: 150px;
        }
        .txh-col-desc {
          color: #64748b;
          font-size: 12px;
          min-width: 220px;
          max-width: 320px;
          line-height: 1.35;
          word-break: break-word;
        }
        .txh-col-amount {
          font-weight: 700;
          font-size: 14px;
          white-space: nowrap;
          text-align: right;
          min-width: 130px;
        }
        .txh-credit { color: #16a34a; }
        .txh-debit  { color: #dc2626; }
        .txh-pro-table td.txh-credit,
        .txh-pro-table td.txh-credit strong {
          color: #16a34a;
        }
        .txh-pro-table td.txh-debit,
        .txh-pro-table td.txh-debit strong {
          color: #dc2626;
        }
        /* ── Total row ── */
        .txh-total-row {
          background: #1a2535 !important;
          border-top: 2px solid #334155;
        }
        .txh-total-row td {
          color: #fff;
          font-size: 13px;
          padding: 12px 14px;
          border-right-color: #314157;
          border-bottom: none;
        }
        .txh-total-row td.txh-credit,
        .txh-total-row td.txh-credit strong { color: #4ade80; }
        .txh-total-row td.txh-debit,
        .txh-total-row td.txh-debit strong { color: #f87171; }
        /* ── Empty / error ── */
        .txh-empty-cell {
          padding: 32px 18px;
          text-align: center;
          color: #64748b;
          font-size: 14px;
        }
        .txh-empty {
          padding: 18px;
          border: 1px dashed #cdd5de;
          border-radius: 8px;
          color: #546172;
          background: #fff;
          text-align: center;
        }
        .txh-error {
          border-color: #fecaca;
          color: #b91c1c;
          background: #fff7f7;
        }
        @media (max-width: 768px) {
          .txh-filter-panel {
            padding: 10px;
            max-width: 100%;
          }
          .txh-search-row {
            grid-template-columns: 96px 1fr;
            min-height: 46px;
          }
          .txh-date-row {
            grid-template-columns: 58px 1fr;
            min-height: 46px;
          }
          .txh-search-input,
          .txh-date-input {
            min-height: 46px;
            font-size: 15px;
            padding: 0 12px;
          }
          .txh-search-label,
          .txh-date-icon {
            font-size: 14px;
          }
          .txh-select-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .txh-filter-help {
            font-size: 11px;
          }
          .txh-type-select,
          .txh-mode-select {
            min-height: 46px;
            font-size: 14px;
            padding: 0 10px;
          }
          .txh-type-menu {
            width: min(332px, calc(100vw - 24px));
            max-height: min(56dvh, 360px);
            padding: 6px 10px 10px;
          }
          .txh-type-toggle-row {
            gap: 8px;
            padding: 6px 0;
            font-size: 13px;
            line-height: 1.15;
          }
          .txh-switch {
            width: 42px;
            height: 22px;
          }
          .txh-switch-slider:before {
            width: 16px;
            height: 16px;
          }
          .txh-switch input:checked + .txh-switch-slider:before {
            transform: translateX(20px);
          }
          .txh-search-btn {
            width: 64px;
            height: 64px;
            font-size: 24px;
          }
          .txh-result-head h3 {
            font-size: 18px;
          }
          .txh-summary-inline {
            font-size: 12px;
            gap: 8px;
          }
          .txh-total-bar {
            padding: 10px 12px;
            font-size: 14px;
          }
          .txh-scroll {
            max-height: min(58vh, 560px);
          }
          .txh-pro-table {
            font-size: 12px;
          }
          .txh-pro-table-transactions {
            min-width: 860px;
          }
          .txh-pro-table-analysis {
            min-width: 900px;
          }
          .txh-pro-table-summary {
            min-width: 1040px;
          }
          .txh-pro-table thead th {
            padding: 11px 10px;
            font-size: 11px;
          }
          .txh-pro-table td {
            padding: 10px;
            font-size: 12px;
          }
          .txh-col-date {
            min-width: 150px;
          }
          .txh-col-user {
            min-width: 92px;
          }
          .txh-col-type {
            min-width: 140px;
          }
          .txh-col-desc {
            min-width: 190px;
            max-width: 240px;
          }
          .txh-col-amount {
            min-width: 120px;
          }
        }
      `})]})}const tc=Object.freeze(Object.defineProperty({__proto__:null,default:eo},Symbol.toStringTag,{value:"Module"}));function to(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState({user:"",sport:"all",status:"all",time:"30d"}),[j,U]=a.useState(null),[g,w]=a.useState(null),[u,d]=a.useState(!1),k=async()=>{const v=localStorage.getItem("token");if(!v){x("Please login to view deleted wagers."),m(!1);return}try{m(!0);const b=await Rn(S,v);r(b.wagers||[]),x("")}catch(b){console.error("Failed to load deleted wagers:",b),x(b.message||"Failed to load deleted wagers")}finally{m(!1)}};a.useEffect(()=>{k()},[S]);const Q=async v=>{const b=localStorage.getItem("token");if(!b){x("Please login to restore wagers.");return}try{U(v),await xi(v,b),r(R=>R.map(n=>n.id===v?{...n,status:"restored",restoredAt:new Date().toISOString()}:n))}catch(R){x(R.message||"Failed to restore wager")}finally{U(null)}},B=v=>{w(v),d(!0)},$=v=>{if(v==null)return"—";const b=Number(v);return Number.isNaN(b)?"—":`$${Math.round(b)}`};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Deleted Wagers"})}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading deleted wagers..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User"}),e.jsx("input",{type:"text",value:S.user,onChange:v=>L(b=>({...b,user:v.target.value})),placeholder:"Search user"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:S.sport,onChange:v=>L(b=>({...b,sport:v.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"NBA",children:"NBA"}),e.jsx("option",{value:"NFL",children:"NFL"}),e.jsx("option",{value:"MLB",children:"MLB"}),e.jsx("option",{value:"NHL",children:"NHL"}),e.jsx("option",{value:"Soccer",children:"Soccer"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:S.status,onChange:v=>L(b=>({...b,status:v.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"deleted",children:"Deleted"}),e.jsx("option",{value:"restored",children:"Restored"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:S.time,onChange:v=>L(b=>({...b,time:v.target.value})),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Reason"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(v=>e.jsxs("tr",{children:[e.jsx("td",{children:v.user}),e.jsx("td",{children:$(v.amount)}),e.jsx("td",{children:v.sport}),e.jsx("td",{children:v.deletedAt?new Date(v.deletedAt).toLocaleDateString():"—"}),e.jsx("td",{children:v.reason}),e.jsx("td",{children:e.jsx("span",{className:`badge ${v.status}`,children:v.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>B(v),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>Q(v.id),disabled:v.status==="restored"||j===v.id,children:j===v.id?"Working...":"Restore"})]})]},v.id))})]})})]})]}),u&&g&&e.jsx("div",{className:"modal-overlay",onClick:()=>d(!1),children:e.jsxs("div",{className:"modal-content",onClick:v=>v.stopPropagation(),children:[e.jsx("h3",{children:"Deleted Wager Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",g.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",$(g.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",g.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Reason:"})," ",g.reason]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",g.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Deleted At:"})," ",g.deletedAt?new Date(g.deletedAt).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Restored At:"})," ",g.restoredAt?new Date(g.restoredAt).toLocaleString():"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>d(!1),children:"Close"})})]})})]})}const ac=Object.freeze(Object.defineProperty({__proto__:null,default:to},Symbol.toStringTag,{value:"Module"}));function ao(){const[t,r]=a.useState("game"),[o,m]=a.useState("all"),[p,x]=a.useState([]),[S,L]=a.useState(!1),[j,U]=a.useState([]),[g,w]=a.useState(!0),[u,d]=a.useState(""),[k,Q]=a.useState(""),[B,$]=a.useState(!1),[v,b]=a.useState({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),R=600,n=[{id:"nfl",label:"NFL",icon:"🏈"},{id:"nba",label:"NBA",icon:"🏀"},{id:"mlb",label:"MLB",icon:"⚾"},{id:"nhl",label:"NHL",icon:"🏒"},{id:"soccer",label:"Soccer",icon:"⚽"},{id:"tennis",label:"Tennis",icon:"🎾"},{id:"golf",label:"Golf",icon:"⛳"},{id:"boxing",label:"Boxing",icon:"🥊"},{id:"esports",label:"Esports",icon:"🎮"},{id:"props",label:"Props",icon:"📊"},{id:"futures",label:"Futures",icon:"📈"},{id:"contests",label:"Contests",icon:"🏆"}],I=_=>{x(E=>E.includes(_)?E.filter(ie=>ie!==_):[...E,_])},D=[{header:"Period",key:"period"},{header:"Game",key:"game"},{header:"Time",key:"time"},{header:"Event",key:"event"},{header:"Spread",key:"spread"},{header:"Moneyline",key:"moneyline"},{header:"Total",key:"total"},{header:"Team Total",key:"teamTotal"},{header:"OS",key:"os"},{header:"US",key:"us"}],l=async()=>{const _=localStorage.getItem("token");if(!_){d("Please login to load games."),w(!1);return}try{w(!0);const E=await ts(_);U(E||[]),d("")}catch(E){console.error("Failed to load matches:",E),d(E.message||"Failed to load matches")}finally{w(!1)}};a.useEffect(()=>{l()},[]);const Y=_=>{if(!_?.startTime)return o==="all";if(o==="all")return!0;const E=new Date(_.startTime),ie=new Date,Pe=new Date(ie.getFullYear(),ie.getMonth(),ie.getDate()),z=new Date(Pe.getTime()+1440*60*1e3),M=new Date(z.getTime()+1440*60*1e3),Z=new Date(Pe.getTime()+10080*60*1e3);return o==="today"?E>=Pe&&E<z:o==="tomorrow"?E>=z&&E<M:o==="this-week"?E>=Pe&&E<Z:!0},pe=_=>t==="game"?!0:_?.status===t,G=_=>{if(!p.length)return!0;const E=String(_?.sport||"").toLowerCase();return p.includes(E)},N=j.filter(Y).filter(pe).filter(G);a.useEffect(()=>{!g&&N.length===0&&L(!0)},[g,N.length]);const ee=async()=>{const _=localStorage.getItem("token");if(!_){d("Please login to add games.");return}try{Q("add"),await Fn({homeTeam:v.homeTeam.trim(),awayTeam:v.awayTeam.trim(),startTime:v.startTime,sport:v.sport,status:v.status},_),b({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),$(!1),l()}catch(E){d(E.message||"Failed to add game")}finally{Q("")}},f=async()=>{const _=localStorage.getItem("token");if(!_){d("Please login to update odds.");return}try{const E=Date.now();Q("odds"),await On(_),l()}catch(E){d(E.message||"Failed to update odds")}finally{const E=Date.now()-startedAt;E<R&&await new Promise(ie=>setTimeout(ie,R-E)),Q("")}},O=async()=>{const _=localStorage.getItem("token");if(!_){d("Please login to clear cache.");return}try{Q("cache"),await fi(_)}catch(E){d(E.message||"Failed to clear cache")}finally{Q("")}},H=async _=>{const E=localStorage.getItem("token");if(!E){d("Please login to settle matches.");return}try{Q(`settle-${_.id}`);const ie=_.id,Pe=window.prompt(`Settlement mode for ${_.homeTeam} vs ${_.awayTeam}:
- Type "auto" to grade from score (recommended)
- Type "home" or "away" for manual H2H winner`,"auto");if(!Pe){Q("");return}const z=Pe.trim().toLowerCase();if(!["auto","home","away"].includes(z)){d("Invalid option. Use auto, home, or away.");return}if(z==="auto")await xn({matchId:ie},E);else{const M=await gi(ie,E);if(M?.manualWinnerAllowed!==!0){d(M?.reason||"Manual winner mode is blocked for this match.");return}const Z=z==="home"?_.homeTeam:_.awayTeam;await xn({matchId:ie,winner:Z},E)}await l(),d(""),alert("Match settled successfully.")}catch(ie){d(ie.message||"Failed to settle match")}finally{Q("")}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Games & Events Management"})}),k==="odds"&&Or.createPortal(e.jsx("div",{className:"admin-loading-overlay",children:e.jsxs("div",{className:"admin-loading-card",children:[e.jsx("div",{className:"admin-spinner"}),e.jsx("div",{children:"Refreshing odds & scores..."})]})}),document.body),e.jsxs("div",{className:"view-content",children:[g&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),u&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:u}),!g&&!u&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"games-controls",children:[e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Period:"}),e.jsxs("select",{value:t,onChange:_=>r(_.target.value),children:[e.jsx("option",{value:"game",children:"Game"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"scheduled",children:"Scheduled"})]})]}),e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Games to show:"}),e.jsxs("select",{value:o,onChange:_=>m(_.target.value),children:[e.jsx("option",{value:"all",children:"All Games"}),e.jsx("option",{value:"today",children:"Today Only"}),e.jsx("option",{value:"tomorrow",children:"Tomorrow"}),e.jsx("option",{value:"this-week",children:"This Week"})]})]})]}),e.jsx("div",{className:"sports-icons-container",children:n.map(_=>e.jsxs("button",{className:`sport-icon-btn ${p.includes(_.id)?"active":""}`,onClick:()=>I(_.id),title:_.label,children:[e.jsx("span",{className:"icon",children:_.icon}),e.jsx("span",{className:"dropdown-arrow",children:"▼"})]},_.id))}),!S&&e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table events-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[D.map(_=>e.jsx("th",{children:_.header},_.key)),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:N.map(_=>e.jsxs("tr",{children:[e.jsx("td",{children:_.status||"scheduled"}),e.jsxs("td",{children:[_.homeTeam," vs ",_.awayTeam]}),e.jsx("td",{children:_.startTime?new Date(_.startTime).toLocaleString():"—"}),e.jsx("td",{children:_.sport||"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>H(_),disabled:k===`settle-${_.id}`,children:k===`settle-${_.id}`?"Settling...":"Settle"})})]},_.id))})]})}),S&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content no-events-modal",children:[e.jsx("button",{className:"modal-close",onClick:()=>L(!1),children:"×"}),e.jsx("h3",{children:"Today there aren't any event's"}),e.jsx("p",{children:"There are no games for today, would you like to view the Full Board?"}),e.jsxs("div",{className:"modal-buttons",children:[e.jsx("button",{className:"btn-success",onClick:()=>{L(!1),m("all")},children:"Yes"}),e.jsx("button",{className:"btn-danger",onClick:()=>L(!1),children:"No"})]})]})}),e.jsxs("div",{className:"game-status-legend",children:[e.jsx("h4",{children:"Status Legend:"}),e.jsxs("div",{className:"legend-items",children:[e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge live",children:"Live"}),e.jsx("span",{children:"Game is currently in progress"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge scheduled",children:"Scheduled"}),e.jsx("span",{children:"Game is scheduled for future date"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge finished",children:"Finished"}),e.jsx("span",{children:"Game has ended"})]})]})]}),e.jsxs("div",{className:"quick-actions",children:[e.jsx("h4",{children:"Quick Actions:"}),e.jsx("button",{className:"btn-primary",onClick:()=>$(!0),children:"Add Game"}),e.jsx("button",{className:"btn-secondary",onClick:f,disabled:k==="odds",children:k==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Import Games"}),e.jsx("button",{className:"btn-secondary",onClick:f,disabled:k==="odds",children:k==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Update Odds"}),e.jsx("button",{className:"btn-danger",onClick:O,disabled:k==="cache",children:k==="cache"?"Working...":"Clear Cache"})]})]})]}),B&&e.jsx("div",{className:"modal-overlay",onClick:()=>$(!1),children:e.jsxs("div",{className:"modal-content",onClick:_=>_.stopPropagation(),children:[e.jsx("h3",{children:"Add Game"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{type:"text",value:v.homeTeam,onChange:_=>b(E=>({...E,homeTeam:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{type:"text",value:v.awayTeam,onChange:_=>b(E=>({...E,awayTeam:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",value:v.startTime,onChange:_=>b(E=>({...E,startTime:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:v.sport,onChange:_=>b(E=>({...E,sport:_.target.value})),children:[e.jsx("option",{value:"basketball",children:"Basketball"}),e.jsx("option",{value:"football",children:"Football"}),e.jsx("option",{value:"baseball",children:"Baseball"}),e.jsx("option",{value:"hockey",children:"Hockey"}),e.jsx("option",{value:"soccer",children:"Soccer"}),e.jsx("option",{value:"tennis",children:"Tennis"}),e.jsx("option",{value:"golf",children:"Golf"}),e.jsx("option",{value:"boxing",children:"Boxing"}),e.jsx("option",{value:"esports",children:"Esports"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:v.status,onChange:_=>b(E=>({...E,status:_.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>$(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:ee,disabled:k==="add"||!v.homeTeam.trim()||!v.awayTeam.trim()||!v.startTime,children:k==="add"?"Saving...":"Add Game"})]})]})})]})}const sc=Object.freeze(Object.defineProperty({__proto__:null,default:ao},Symbol.toStringTag,{value:"Module"}));function so(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1),[j,U]=a.useState(null),[g,w]=a.useState(null),[u,d]=a.useState({name:"",url:"",status:"active",notes:""}),[k,Q]=a.useState(!1),B=async()=>{const D=localStorage.getItem("token");if(!D){x("Please login to view sportsbook links."),m(!1);return}try{m(!0);const l=await bi(D);r(l.links||[]),x("")}catch(l){console.error("Failed to load sportsbook links:",l),x(l.message||"Failed to load sportsbook links")}finally{m(!1)}};a.useEffect(()=>{B()},[]);const $=()=>{U(null),d({name:"",url:"",status:"active",notes:""}),L(!0)},v=D=>{U(D),d({name:D.name,url:D.url,status:D.status,notes:D.notes||""}),L(!0)},b=D=>{U(D),Q(!0)},R=async()=>{const D=localStorage.getItem("token");if(!D){x("Please login to save links.");return}try{w(j?.id||"new"),j?await vi(j.id,u,D):await Ni(u,D),L(!1),B()}catch(l){x(l.message||"Failed to save link")}finally{w(null)}},n=async D=>{const l=localStorage.getItem("token");if(!l){x("Please login to test links.");return}try{w(D);const Y=await ji(D,l);r(pe=>pe.map(G=>G.id===D?{...G,lastSync:Y.lastSync}:G))}catch(Y){x(Y.message||"Failed to test link")}finally{w(null)}},I=async D=>{const l=localStorage.getItem("token");if(!l){x("Please login to delete links.");return}if(window.confirm(`Delete sportsbook link "${D.name}"?`))try{w(D.id),await yi(D.id,l),r(pe=>pe.filter(G=>G.id!==D.id))}catch(pe){x(pe.message||"Failed to delete link")}finally{w(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Sportsbook Links"}),e.jsx("button",{className:"btn-primary",onClick:$,children:"Add New Link"})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading links..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider Name"}),e.jsx("th",{children:"API URL"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",style:{textAlign:"center",padding:"20px"},children:"No sportsbook links found."})}):t.map(D=>e.jsxs("tr",{children:[e.jsx("td",{children:D.name}),e.jsx("td",{className:"monospace",children:D.url}),e.jsx("td",{children:e.jsx("span",{className:`badge ${D.status}`,children:D.status})}),e.jsx("td",{children:D.lastSync?new Date(D.lastSync).toLocaleString():"—"}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>v(D),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>n(D.id),disabled:g===D.id,children:g===D.id?"Working...":"Test"}),e.jsx("button",{className:"btn-small",onClick:()=>b(D),children:"View"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>I(D),disabled:g===D.id,children:g===D.id?"Working...":"Delete"})]})]},D.id))})]})})]}),S&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:D=>D.stopPropagation(),children:[e.jsx("h3",{children:j?"Edit Link":"Add Link"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Name"}),e.jsx("input",{type:"text",value:u.name,onChange:D=>d(l=>({...l,name:D.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"URL"}),e.jsx("input",{type:"text",value:u.url,onChange:D=>d(l=>({...l,url:D.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:u.status,onChange:D=>d(l=>({...l,status:D.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:u.notes,onChange:D=>d(l=>({...l,notes:D.target.value})),placeholder:"Optional"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:R,disabled:g||!u.name.trim()||!u.url.trim(),children:g?"Saving...":"Save"})]})]})}),k&&j&&e.jsx("div",{className:"modal-overlay",onClick:()=>Q(!1),children:e.jsxs("div",{className:"modal-content",onClick:D=>D.stopPropagation(),children:[e.jsx("h3",{children:"Link Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Name:"})," ",j.name]}),e.jsxs("p",{children:[e.jsx("strong",{children:"URL:"})," ",j.url]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",j.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Sync:"})," ",j.lastSync?new Date(j.lastSync).toLocaleString():"—"]}),j.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",j.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Q(!1),children:"Close"})})]})})]})}const nc=Object.freeze(Object.defineProperty({__proto__:null,default:so},Symbol.toStringTag,{value:"Module"}));function no(){const[t,r]=a.useState([]),[o,m]=a.useState("all"),[p,x]=a.useState(!0),S=async()=>{try{const j=localStorage.getItem("token");if(!j)return;const U=await es({},j);if(U&&Array.isArray(U.bets)){const g=U.bets.map(w=>({id:w.id,user:w.userId?.username||"Unknown",type:w.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",match:w.description||(w.matchSnapshot?`${w.matchSnapshot.homeTeam} vs ${w.matchSnapshot.awayTeam}`:"Unknown Match"),bet:`${w.selection} @ ${parseFloat(w.odds).toFixed(2)}`,amount:`$${Math.round(parseFloat(w.amount))}`,odds:parseFloat(w.odds).toFixed(2),time:new Date(w.createdAt).toLocaleTimeString(),status:w.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",originalStatus:w.status}));r(g)}}catch(j){console.error("Failed to fetch admin bets:",j)}finally{x(!1)}};a.useEffect(()=>{S();const j=setInterval(()=>{document.hidden||S()},45e3),U=()=>{document.hidden||S()};return document.addEventListener("visibilitychange",U),()=>{clearInterval(j),document.removeEventListener("visibilitychange",U)}},[]);const L=o==="all"?t:t.filter(j=>j.type.toLowerCase()===o.toLowerCase());return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Live Bet Ticker"}),e.jsxs("div",{className:"ticker-filter",children:[e.jsx("button",{className:o==="all"?"active":"",onClick:()=>m("all"),children:"All Bets"}),e.jsx("button",{className:o==="live"?"active":"",onClick:()=>m("live"),children:"🔴 Live"}),e.jsx("button",{className:o==="upcoming"?"active":"",onClick:()=>m("upcoming"),children:"⏰ Upcoming"})]})]}),e.jsxs("div",{className:"view-content",children:[e.jsx("div",{className:"ticker-container",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"ticker-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Status"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Bet Details"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:p?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"Loading bets..."})}):L.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No bets found"})}):L.map(j=>e.jsxs("tr",{className:`ticker-row ${j.status.toLowerCase()}`,children:[e.jsx("td",{children:e.jsx("span",{className:`status-badge ${j.status.toLowerCase()}`,children:j.status==="LIVE"?"🔴 LIVE":"⏰ UPCOMING"})}),e.jsx("td",{children:e.jsx("strong",{children:j.user})}),e.jsx("td",{className:"match-cell",children:j.match}),e.jsx("td",{className:"bet-cell",children:j.bet}),e.jsx("td",{className:"odds-cell",children:e.jsx("span",{className:"odds-highlight",children:j.odds})}),e.jsx("td",{className:"amount-cell",children:e.jsx("strong",{children:j.amount})}),e.jsx("td",{children:j.time}),e.jsx("td",{children:e.jsx("button",{className:"btn-tiny",children:"Details"})})]},j.id))})]})})}),e.jsxs("div",{className:"ticker-summary",children:[e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Live Bets"}),e.jsx("span",{className:"value",children:t.filter(j=>j.status==="LIVE").length})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Total Wagered"}),e.jsxs("span",{className:"value",children:["$",t.reduce((j,U)=>j+parseFloat(U.amount.replace("$","")),0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})]})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Avg Odds"}),e.jsx("span",{className:"value",children:t.length>0?(t.reduce((j,U)=>j+parseFloat(U.odds),0)/t.length).toFixed(2):"0.00"})]})]})]})]})}const rc=Object.freeze(Object.defineProperty({__proto__:null,default:no},Symbol.toStringTag,{value:"Module"}));function ro(){const[t,r]=a.useState({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),[o,m]=a.useState([]),[p,x]=a.useState([]),[S,L]=a.useState(!0),[j,U]=a.useState(""),[g,w]=a.useState(!1),u=k=>{const{name:Q,value:B}=k.target;r($=>({...$,[Q]:B}))},d=async k=>{k.preventDefault();const Q=localStorage.getItem("token");if(!Q){U("Please login to create tickets.");return}try{w(!0),await wi({userId:t.userId,matchId:t.matchId,amount:Number(t.amount)||0,odds:Number(t.odds)||0,type:t.betType,selection:t.selection.trim(),status:"pending"},Q),r({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),U("")}catch(B){console.error("Ticket creation failed:",B),U(B.message||"Failed to create ticket")}finally{w(!1)}};return a.useEffect(()=>{(async()=>{const Q=localStorage.getItem("token");if(!Q){U("Please login to load ticket data."),L(!1);return}try{L(!0);const[B,$]=await Promise.all([ts(Q),ra(Q)]);m(Array.isArray(B)?B:[]),x(Array.isArray($)?$:[]),U("")}catch(B){console.error("Failed to load ticket data:",B),U(B.message||"Failed to load ticket data")}finally{L(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Ticket Writer"}),e.jsx("p",{className:"subtitle",children:"Create custom betting tickets"})]}),e.jsxs("div",{className:"view-content",children:[S&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading ticket data..."}),j&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:j}),!S&&!j&&e.jsx("div",{className:"form-container",children:e.jsxs("form",{onSubmit:d,className:"admin-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Ticket Details"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Customer:"}),e.jsxs("select",{name:"userId",value:t.userId,onChange:u,required:!0,children:[e.jsx("option",{value:"",children:"Select customer"}),p.map(k=>e.jsx("option",{value:k.id,children:k.username},k.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Type:"}),e.jsxs("select",{name:"betType",value:t.betType,onChange:u,children:[e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Match:"}),e.jsxs("select",{name:"matchId",value:t.matchId,onChange:u,required:!0,children:[e.jsx("option",{value:"",children:"Select match"}),o.map(k=>e.jsxs("option",{value:k.id,children:[k.homeTeam," vs ",k.awayTeam]},k.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Selection:"}),e.jsx("input",{type:"text",name:"selection",value:t.selection,onChange:u,placeholder:"e.g., Lakers to win",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Odds:"}),e.jsx("input",{type:"number",name:"odds",value:t.odds,onChange:u,placeholder:"e.g., 1.95",step:"0.01",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Amount:"}),e.jsx("input",{type:"number",name:"amount",value:t.amount,onChange:u,placeholder:"e.g., 100",step:"0.01",required:!0})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:g,children:g?"Saving...":"Create Ticket"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>r({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),children:"Clear"})]})]})})]})]})}const ic=Object.freeze(Object.defineProperty({__proto__:null,default:ro},Symbol.toStringTag,{value:"Module"}));function io(){const[t,r]=a.useState("all"),[o,m]=a.useState([]),[p,x]=a.useState(!0),[S,L]=a.useState(""),[j,U]=a.useState(null),[g,w]=a.useState(!1),[u,d]=a.useState({scoreHome:"",scoreAway:"",status:"scheduled"}),[k,Q]=a.useState(!1),B=async()=>{const n=localStorage.getItem("token");if(!n){L("Please login to view scores."),x(!1);return}try{x(!0);const I=await ts(n);m(I||[]),L("")}catch(I){console.error("Failed to load matches:",I),L(I.message||"Failed to load matches")}finally{x(!1)}};a.useEffect(()=>{B()},[]);const $=t==="all"?o:o.filter(n=>String(n.sport||"").toLowerCase()===t.toLowerCase()),v=n=>{const I=n.score?.score_home??n.score?.scoreHome??"",D=n.score?.score_away??n.score?.scoreAway??"";U(n),d({scoreHome:I===0?0:I,scoreAway:D===0?0:D,status:n.status||"scheduled"}),w(!0)},b=async()=>{const n=localStorage.getItem("token");if(!n){L("Please login to update scores.");return}try{Q(!0),await $n(j.id,{status:u.status,score:{scoreHome:Number(u.scoreHome)||0,scoreAway:Number(u.scoreAway)||0},lastUpdated:new Date},n),w(!1),B()}catch(I){L(I.message||"Failed to update score")}finally{Q(!1)}},R=n=>n.status||"scheduled";return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Featured Matches & Scores"}),e.jsxs("div",{className:"sport-filter",children:[e.jsx("button",{className:t==="all"?"active":"",onClick:()=>r("all"),children:"All Sports"}),e.jsx("button",{className:t==="soccer"?"active":"",onClick:()=>r("soccer"),children:"⚽ Soccer"}),e.jsx("button",{className:t==="basketball"?"active":"",onClick:()=>r("basketball"),children:"🏀 NBA"}),e.jsx("button",{className:t==="tennis"?"active":"",onClick:()=>r("tennis"),children:"🎾 Tennis"}),e.jsx("button",{className:t==="football"?"active":"",onClick:()=>r("football"),children:"🏈 Football"})]})]}),e.jsxs("div",{className:"view-content",children:[p&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading scores..."}),S&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:S}),!p&&!S&&e.jsx("div",{className:"filtered-matches-section",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table live-matches-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Score"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:$.map(n=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{children:[n.homeTeam," vs ",n.awayTeam]})}),e.jsx("td",{children:n.startTime?new Date(n.startTime).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${R(n)}`,children:R(n)})}),e.jsxs("td",{children:[n.score?.score_home??n.score?.scoreHome??0," - ",n.score?.score_away??n.score?.scoreAway??0]}),e.jsx("td",{children:n.odds?JSON.stringify(n.odds):"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>v(n),children:"Update"})})]},n.id))})]})})})]}),g&&j&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:n=>n.stopPropagation(),children:[e.jsx("h3",{children:"Update Score"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Score"}),e.jsx("input",{type:"number",value:u.scoreHome,onChange:n=>d(I=>({...I,scoreHome:n.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Score"}),e.jsx("input",{type:"number",value:u.scoreAway,onChange:n=>d(I=>({...I,scoreAway:n.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:u.status,onChange:n=>d(I=>({...I,status:n.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"cancelled",children:"Cancelled"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:b,disabled:k,children:k?"Saving...":"Save"})]})]})})]})}const lc=Object.freeze(Object.defineProperty({__proto__:null,default:io},Symbol.toStringTag,{value:"Module"})),Cn={updateInfo:!0,suspendWagering:!0,enterDepositsWithdrawals:!0,deleteTransactions:!0,enterBettingAdjustments:!0,moveAccounts:!0,addAccounts:!0,changeCreditLimit:!0,setMinBet:!0,changeWagerLimit:!0,adjustParlayTeaser:!0,setGlobalTeamLimit:!0,maxWagerSetup:!0,allowDeny:!0,juiceSetup:!0,changeTempCredit:!0,changeSettleFigure:!0,views:Object.values(Hn).reduce((t,r)=>(t[r]=!0,t),{}),ipTracker:{manage:!0}},An={dashboard:"Dashboard",weeklyFigures:"Weekly Figures",pending:"Pending",messaging:"Messaging",gameAdmin:"Game Admin",customerAdmin:"Customer Admin",agentManager:"Agent Management",cashier:"Cashier",addCustomer:"Add Customer",thirdPartyLimits:"3rd Party Limits",props:"Props / Betting",agentPerformance:"Agent Performance",analysis:"Analysis",ipTracker:"IP Tracker",transactionsHistory:"Transaction History",deletedWagers:"Deleted Wagers",gamesEvents:"Games & Events",sportsbookLinks:"Sportsbook Links",betTicker:"Bet Ticker",ticketwriter:"TicketWriter",scores:"Scores",masterAgentAdmin:"Master Agent Admin",billing:"Billing",settings:"Settings",monitor:"System Monitor",rules:"Rules",feedback:"Feedback",faq:"FAQ",userManual:"User Manual",profile:"Profile"},Zn=(t,r)=>{if(!r||typeof r!="object")return t;const o={...t};return Object.keys(r).forEach(m=>{const p=r[m];p&&typeof p=="object"&&!Array.isArray(p)?o[m]=Zn(t[m]||{},p):o[m]=p}),o};function Xn({agent:t,onClose:r,onUpdate:o}){const[m,p]=a.useState(Cn),[x,S]=a.useState(!1);a.useEffect(()=>{t&&p(Zn(Cn,t.permissions||{}))},[t]);const L=u=>{p(d=>({...d,[u]:!d[u]}))},j=(u,d)=>{p(k=>({...k,[u]:{...k[u]||{},[d]:!k?.[u]?.[d]}}))},U=async()=>{S(!0);try{const u=localStorage.getItem("token");await Si(t.id,m,u),alert("Permissions updated successfully"),o&&o(),r()}catch(u){console.error("Error updating permissions:",u),alert("Failed to update permissions: "+u.message)}finally{S(!1)}},g=(u,d)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:m[u],onChange:()=>L(u)}),e.jsx("span",{className:"checkmark"}),d]})},u),w=(u,d,k)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:!!m?.[u]?.[d],onChange:()=>j(u,d)}),e.jsx("span",{className:"checkmark"}),k]})},`${u}.${d}`);return e.jsxs("div",{className:"modal-overlay",children:[e.jsxs("div",{className:"modal-content permission-modal",children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h3",{children:["Permissions: ",t.username]}),e.jsx("button",{className:"close-btn",onClick:r,children:"×"})]}),e.jsxs("div",{className:"scrollable-content",children:[e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"General Account Setup"}),g("updateInfo","Update Info"),g("suspendWagering","Suspend Wagering"),g("enterDepositsWithdrawals","Enter Deposits / Withdrawals"),g("deleteTransactions","Delete Transactions"),g("enterBettingAdjustments","Enter Betting Adjustments"),g("moveAccounts","Move Accounts"),g("addAccounts","Add Accounts")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Limit And Sport Setup"}),g("changeCreditLimit","Change Credit Limit"),g("setMinBet","Set Minimum Bet Amount"),g("changeWagerLimit","Change Wager Limit"),g("adjustParlayTeaser","Adjust Parlay/Teaser Setup"),g("setGlobalTeamLimit","Set Global Team Limit"),g("maxWagerSetup","Max Wager Setup"),g("allowDeny","Allow / Deny"),g("juiceSetup","Juice Setup"),g("changeTempCredit","Change Temp Credit"),g("changeSettleFigure","Change Settle Figure")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Dashboard Access"}),Object.keys(An).map(u=>w("views",u,An[u]))]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"IP Tracker Actions"}),w("ipTracker","manage","Allow Block / Unblock / Whitelist")]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn-secondary",onClick:r,disabled:x,children:"Cancel"}),e.jsx("button",{className:"btn-primary",onClick:U,disabled:x,children:x?"Saving...":"Save"})]})]}),e.jsx("style",{children:`
        .permission-modal {
            width: 500px;
            max-width: 90vw;
            display: flex;
            flex-direction: column;
            max-height: 80vh;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            padding-bottom: 1rem;
            margin-bottom: 1rem;
        }
        .close-btn {
            background: none;
            border: none;
            color: #fff;
            font-size: 1.5rem;
            cursor: pointer;
        }
        .scrollable-content {
            overflow-y: auto;
            flex: 1;
            padding-right: 0.5rem;
        }
        .section {
            margin-bottom: 1.5rem;
        }
        .section h4 {
            color: #ccc;
            border-bottom: 1px solid #444;
            padding-bottom: 0.5rem;
            margin-bottom: 0.5rem;
            font-size: 1rem;
        }
        .permission-item {
            margin-bottom: 0.5rem;
        }
        .checkbox-container {
            display: block;
            position: relative;
            padding-left: 30px;
            margin-bottom: 5px;
            cursor: pointer;
            font-size: 0.9rem;
            user-select: none;
            color: #eee;
        }
        .checkbox-container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
        }
        .checkmark {
            position: absolute;
            top: 2px;
            left: 0;
            height: 18px;
            width: 18px;
            background-color: #eee;
            border-radius: 3px;
        }
        .checkbox-container:hover input ~ .checkmark {
            background-color: #ccc;
        }
        .checkbox-container input:checked ~ .checkmark {
            background-color: #e67e22; /* Warning/Orange color often used in betting apps */
        }
        .checkmark:after {
            content: "";
            position: absolute;
            display: none;
        }
        .checkbox-container input:checked ~ .checkmark:after {
            display: block;
        }
        .checkbox-container .checkmark:after {
            left: 6px;
            top: 2px;
            width: 4px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }
        .modal-footer {
            border-top: 1px solid #333;
            padding-top: 1rem;
            margin-top: 1rem;
            display: flex;
            justify-content: flex-end;
            gap: 1rem;
        }
      `})]})}function lo(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(!1),[S,L]=a.useState(!1),[j,U]=a.useState(!1),[g,w]=a.useState(!1),[u,d]=a.useState(null),[k,Q]=a.useState({username:"",phoneNumber:"",password:"",agentPrefix:""}),[B,$]=a.useState({id:"",phoneNumber:"",password:"",agentBillingRate:"",agentBillingStatus:"paid"}),[v,b]=a.useState(null),[R,n]=a.useState("all"),[I,D]=a.useState(!1),l=String(localStorage.getItem("userRole")||"").toLowerCase(),Y=t.filter(z=>R==="all"?!0:R==="admin"?z.createdByModel==="Admin":R==="master_agent"?z.createdByModel==="Agent":!0),pe=z=>{if(z==null||z==="")return"—";const M=Number(z);return Number.isNaN(M)?"—":`$${Math.round(M)}`};Os.useEffect(()=>{G()},[]);const G=async()=>{try{const z=localStorage.getItem("token");if(!z)return;const M=await Qt(z);r(M||[]),b(null)}catch(z){console.error("Failed to fetch agents:",z),b(z.message||"Failed to fetch agents")}finally{m(!1)}},N=async z=>{const M=z.toUpperCase();if(Q(Z=>({...Z,agentPrefix:M})),M.length>=2){const Z=localStorage.getItem("token");try{const{nextUsername:he}=await $t(M,Z,{suffix:"MA",type:"agent"});Q(ae=>({...ae,username:he}))}catch(he){console.error("Failed to get next username from prefix:",he)}}else Q(Z=>({...Z,username:""}))},ee=async z=>{z.preventDefault();try{const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const Z=await Ls(k,M);alert(Z?.assigned?"Master Agent assigned successfully":"Master Agent created successfully"),x(!1),Q({username:"",phoneNumber:"",password:"",agentPrefix:""}),G()}catch(M){console.error("Agent creation error:",M),alert("Failed to create agent: "+M.message)}},f=async z=>{const M=z.status==="suspended",Z=M?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${Z} ${z.username}?`))try{const he=localStorage.getItem("token");M?await Un(z.id,he):await Wn(z.id,he),G()}catch(he){alert(`Failed to ${Z} agent: `+he.message)}},O=z=>{$({id:z.id,phoneNumber:z.phoneNumber||"",password:"",agentBillingRate:z.agentBillingRate??"",agentBillingStatus:z.agentBillingStatus||"paid",unlimitedBalance:z.unlimitedBalance||!1}),d(z),L(!0)},H=async z=>{z.preventDefault();try{const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const Z={phoneNumber:B.phoneNumber,agentBillingRate:B.agentBillingRate,agentBillingStatus:B.agentBillingStatus,unlimitedBalance:B.unlimitedBalance};B.password&&(Z.password=B.password),await ha(B.id,Z,M),alert("Agent updated successfully"),L(!1),G()}catch(M){console.error("Update Error:",M),alert("Failed to update agent: "+M.message)}},_=z=>{d(z),U(!0)},E=async z=>{const M=z.id,Z=z.balance??0,he=window.prompt("Enter new agent balance:",`${Z}`);if(he===null)return;const ae=Number(he);if(Number.isNaN(ae)){alert("Balance must be a valid number.");return}try{const re=localStorage.getItem("token");if(!re)throw new Error("No token found");await ha(M,{balance:ae},re),G()}catch(re){alert("Failed to update agent balance: "+(re.message||"Unknown error"))}},ie=async z=>{const M=z.id,Z=window.prompt(`Enter new password for agent ${z.username}:`,"");if(Z!==null){if(Z.length<6){alert("Password must be at least 6 characters long");return}try{const he=localStorage.getItem("token");if(!he)throw new Error("No token found");await zn(M,Z,he),alert(`Password for agent ${z.username} has been reset successfully.`)}catch(he){console.error("Agent password reset failed:",he),alert(he.message||"Failed to reset agent password")}}},Pe=async()=>{if(window.confirm(`Delete all seeded workflow demo users and agents now?

This removes demo hierarchy records created for workflow testing.`))try{D(!0);const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const he=(await ki(M))?.summary||{};alert(`Seeded demo data deleted.
Users: ${he.usersDeleted||0}
Agents: ${he.agentsDeleted||0}
Master links: ${he.masterAgentLinksDeleted||0}`),await G()}catch(M){alert("Failed to delete demo workflow data: "+(M.message||"Unknown error"))}finally{D(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Master Agent Administration"}),e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},children:[e.jsxs("select",{value:R,onChange:z=>n(z.target.value),style:{padding:"0.5rem",borderRadius:"4px",border:"1px solid #444",backgroundColor:"#333",color:"white"},children:[e.jsx("option",{value:"all",children:"Show All Creators"}),e.jsx("option",{value:"admin",children:"Created by Admin"}),e.jsx("option",{value:"master_agent",children:"Created by Master Agent"})]}),l==="admin"&&e.jsx("button",{className:"btn-secondary",onClick:Pe,disabled:I,title:"Delete workflow demo accounts",children:I?"Deleting Demo Data...":"Delete Demo Data"}),e.jsx("button",{className:"btn-primary",onClick:()=>x(!0),children:"Add Master Agent"})]})]}),p&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Master Agent"}),e.jsxs("form",{onSubmit:ee,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:k.agentPrefix,onChange:z=>N(z.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:k.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:k.phoneNumber,onChange:z=>Q({...k,phoneNumber:z.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:k.password,onChange:z=>Q({...k,password:z.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>x(!1),children:"Cancel"})]})]})]})}),S&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Agent: ",u?.username]}),e.jsxs("form",{onSubmit:H,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:B.phoneNumber,onChange:z=>$({...B,phoneNumber:z.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:B.password,onChange:z=>$({...B,password:z.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Rate per Customer (Weekly)"}),e.jsx("input",{type:"number",min:"0",value:B.agentBillingRate,onChange:z=>$({...B,agentBillingRate:z.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Billing Status"}),e.jsxs("select",{value:B.agentBillingStatus,onChange:z=>$({...B,agentBillingStatus:z.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",border:"1px solid #444",color:"#fff",borderRadius:"4px"},children:[e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"unpaid",children:"Unpaid"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:B.unlimitedBalance,onChange:z=>$({...B,unlimitedBalance:z.target.checked}),style:{width:"auto"}}),"Unlimited Balance"]}),e.jsx("small",{style:{color:"#aaa",fontSize:"11px"},children:"When enabled, this agent can credit players without balance restrictions"})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"})]})]})]})}),j&&u&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"Agent Details"}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Username:"})," ",e.jsx("span",{children:u.username})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Phone Number:"})," ",e.jsx("span",{children:u.phoneNumber})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Status:"})," ",e.jsx("span",{className:`badge ${u.status}`,children:u.status})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created By:"})," ",e.jsx("span",{children:u.createdBy?.username||"System"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created At:"})," ",e.jsx("span",{children:new Date(u.createdAt).toLocaleString()})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Customers:"})," ",e.jsx("span",{children:u.userCount})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Active Customers:"})," ",e.jsx("span",{children:u.activeCustomerCount||0})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Balance:"})," ",e.jsx("span",{children:pe(u.balance)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Outstanding Balance:"})," ",e.jsx("span",{children:pe(u.balanceOwed)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Rate per Customer:"})," ",e.jsxs("span",{children:["$",Math.round(Number(u.agentBillingRate||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Weekly Charge:"})," ",e.jsxs("span",{children:["$",Math.round(Number(u.weeklyCharge||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Billing Status:"})," ",e.jsx("span",{children:u.agentBillingStatus||"paid"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"View Only:"})," ",e.jsx("span",{children:u.viewOnly?"Yes":"No"})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>U(!1),children:"Close"})})]})}),g&&u&&e.jsx(Xn,{agent:u,onClose:()=>w(!1),onUpdate:G}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent Name"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Created By"}),e.jsx("th",{children:"Sub-Agents"}),e.jsx("th",{children:"Total Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Outstanding"}),e.jsx("th",{children:"Rate/Customer"}),e.jsx("th",{children:"Weekly Charge"}),e.jsx("th",{children:"Billing"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:o?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"Loading agents..."})}):v?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:v})}):Y.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"No agents found matching filter."})}):Y.map(z=>e.jsxs("tr",{children:[e.jsx("td",{children:z.username}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.role==="master_agent"?"btn-primary":"btn-secondary"}`,style:{fontSize:"0.75rem",textTransform:"capitalize"},children:z.role?.replace("_"," ")||"agent"})}),e.jsx("td",{children:z.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.status||""}`,children:z.status||"unknown"})}),e.jsx("td",{style:{fontWeight:"bold",color:z.createdBy?"#e67e22":"#999"},children:z.createdBy?e.jsxs(e.Fragment,{children:[e.jsxs("span",{style:{fontSize:"0.8em",color:"#888",marginRight:"4px"},children:["[",z.createdByModel==="Admin"?"Admin":"MA","]"]}),z.createdBy.username]}):"System"}),e.jsx("td",{children:z.role==="master_agent"?z.subAgentCount||0:"—"}),e.jsx("td",{children:z.role==="master_agent"?z.totalUsersInHierarchy||0:z.userCount||0}),e.jsx("td",{children:pe(z.balance)}),e.jsx("td",{children:pe(z.balanceOwed)}),e.jsxs("td",{children:["$",Math.round(Number(z.agentBillingRate||0))]}),e.jsxs("td",{children:["$",Math.round(Number(z.weeklyCharge||0))]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.agentBillingStatus==="unpaid"?"warning":"active"}`,children:z.agentBillingStatus||"paid"})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>O(z),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>_(z),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>{d(z),w(!0)},children:"Permissions"}),e.jsx("button",{className:"btn-small",onClick:()=>E(z),children:"Adjust Balance"}),e.jsx("button",{className:`btn-small ${z.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>f(z),children:z.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>ie(z),children:"Reset Pass"})]})]},z.id))})]})})}),e.jsx("style",{children:`
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .modal-content {
            background: #1e1e1e; padding: 2rem; border-radius: 8px; width: min(400px, calc(100vw - 24px)); border: 1px solid #333; color: #fff; max-height: calc(100vh - 32px); overflow-y: auto;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #aaa; }
        .form-group input { width: 100%; padding: 0.5rem; background: #333; border: 1px solid #444; color: #fff; border-radius: 4px; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
        .detail-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #333; }
        .detail-row label { color: #888; }
        .btn-success { background-color: #27ae60 !important; }
        @media (max-width: 768px) {
          .modal-content {
            padding: 1rem;
            border-radius: 10px;
          }
          .modal-actions {
            flex-direction: column;
          }
          .modal-actions button {
            width: 100%;
          }
          .table-container .btn-small {
            width: 100%;
            margin-bottom: 6px;
          }
        }
      `})]})}const oc=Object.freeze(Object.defineProperty({__proto__:null,default:lo},Symbol.toStringTag,{value:"Module"}));function oo(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(!1),[S,L]=a.useState(!1),[j,U]=a.useState(!1),[g,w]=a.useState(null),[u,d]=a.useState({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),[k,Q]=a.useState({id:"",phoneNumber:"",password:""}),[B,$]=a.useState(null),[v,b]=a.useState("");a.useEffect(()=>{n(),R()},[]);const R=async()=>{try{const N=localStorage.getItem("token");if(N){const ee=await la(N);b(ee?.username||"")}}catch(N){console.error("Failed to fetch profile:",N)}},n=async()=>{try{const N=localStorage.getItem("token");if(!N)return;const ee=await Ci(N);r(ee||[]),$(null)}catch(N){console.error("Failed to fetch agents:",N),$(N.message||"Failed to fetch agents")}finally{m(!1)}},I=async N=>{const ee=N.toUpperCase();if(d(f=>({...f,agentPrefix:ee})),ee.length>=2){const f=localStorage.getItem("token");try{const{nextUsername:O}=await $t(ee,f,{type:"agent"});d(H=>({...H,username:O}))}catch(O){console.error("Failed to get next username from prefix:",O)}}else d(f=>({...f,username:""}))},D=async N=>{N.preventDefault();try{const ee=localStorage.getItem("token");if(!ee)throw new Error("No token found");const f=await Ds(u,ee);alert(f?.assigned?"Agent assigned successfully":"Agent created successfully"),x(!1),d({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),n()}catch(ee){alert("Failed to create agent: "+ee.message)}},l=N=>{Q({id:N.id,phoneNumber:N.phoneNumber||"",password:""}),w(N),L(!0)},Y=async N=>{N.preventDefault();try{const ee=localStorage.getItem("token"),f={phoneNumber:k.phoneNumber};k.password&&(f.password=k.password),await ha(k.id,f,ee),alert("Agent updated successfully"),L(!1),n()}catch(ee){alert("Failed to update agent: "+ee.message)}},pe=async N=>{const ee=N.status==="suspended",f=ee?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${f} ${N.username}?`))try{const O=localStorage.getItem("token");ee?await Un(N.id,O):await Wn(N.id,O),n()}catch(O){alert(`Failed to ${f} agent: `+O.message)}},G=async N=>{const ee=window.prompt(`Enter new password for agent ${N.username}:`);if(ee)try{const f=localStorage.getItem("token");await zn(N.id,ee,f),alert("Password reset successful")}catch(f){alert("Reset failed: "+f.message)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Management"}),localStorage.getItem("userRole")!=="admin"&&e.jsx("button",{className:"btn-primary",onClick:()=>{x(!0),v&&I(v)},children:"Add Agent"})]}),p&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Agent"}),e.jsxs("form",{onSubmit:D,children:[!v&&e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:u.agentPrefix,onChange:N=>I(N.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role"}),e.jsxs("select",{value:u.role,onChange:N=>d({...u,role:N.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",color:"white",marginBottom:"1rem",border:"1px solid #444"},children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"master_agent",children:"Master Agent"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:u.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:u.phoneNumber,onChange:N=>d({...u,phoneNumber:N.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:u.password,onChange:N=>d({...u,password:N.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>x(!1),children:"Cancel"})]})]})]})}),S&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Sub-Agent: ",g?.username]}),e.jsxs("form",{onSubmit:Y,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:k.phoneNumber,onChange:N=>Q({...k,phoneNumber:N.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:k.password,onChange:N=>Q({...k,password:N.target.value})})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"})]})]})]})}),j&&g&&e.jsx(Xn,{agent:g,onClose:()=>U(!1),onUpdate:n}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Username"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:o?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"Loading agents..."})}):B?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",className:"error",children:B})}):t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No agents found."})}):t.map(N=>e.jsxs("tr",{children:[e.jsx("td",{children:N.username}),e.jsx("td",{children:N.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:"badge",children:N.role==="master_agent"?"Master Agent":"Agent"})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${N.status}`,children:N.status})}),e.jsx("td",{children:N.userCount||0}),e.jsxs("td",{children:["$",Math.round(Number(N.balance||0))]}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>l(N),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>{w(N),U(!0)},children:"Perms"}),e.jsx("button",{className:`btn-small ${N.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>pe(N),children:N.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>G(N),children:"Reset Pass"})]})]},N.id))})]})})}),e.jsx("style",{children:`
        .modal-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .modal-content {
            background: #1e1e1e; padding: 2rem; border-radius: 8px; width: min(400px, calc(100vw - 24px)); border: 1px solid #333; color: #fff; max-height: calc(100vh - 32px); overflow-y: auto;
        }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; color: #aaa; }
        .form-group input { width: 100%; padding: 0.5rem; background: #333; border: 1px solid #444; color: #fff; border-radius: 4px; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 1.5rem; flex-wrap: wrap; }
        @media (max-width: 768px) {
          .modal-content {
            padding: 1rem;
            border-radius: 10px;
          }
          .modal-actions {
            flex-direction: column;
          }
          .modal-actions button {
            width: 100%;
          }
          .table-container .btn-small {
            width: 100%;
            margin-bottom: 6px;
          }
        }
      `})]})}const cc=Object.freeze(Object.defineProperty({__proto__:null,default:oo},Symbol.toStringTag,{value:"Module"}));function co(){const[t,r]=a.useState([]),[o,m]=a.useState({paid:0,outstanding:0,total:0}),[p,x]=a.useState(!0),[S,L]=a.useState(""),[j,U]=a.useState(!1),[g,w]=a.useState(!1),[u,d]=a.useState(null),[k,Q]=a.useState(null),[B,$]=a.useState("all"),[v,b]=a.useState({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),R=async()=>{const G=localStorage.getItem("token");if(!G){L("Please login to view billing."),x(!1);return}try{x(!0);const[N,ee]=await Promise.all([Ai(G),Pi({status:B,limit:200},G)]);m(N||{paid:0,outstanding:0,total:0}),r(ee.invoices||[]),L("")}catch(N){console.error("Failed to load billing:",N),L(N.message||"Failed to load billing")}finally{x(!1)}};a.useEffect(()=>{R()},[B]);const n=G=>{if(G==null)return"—";const N=Number(G);return Number.isNaN(N)?"—":`$${Math.round(N)}`},I=()=>{b({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),U(!0)},D=G=>{d(G),w(!0)},l=async()=>{const G=localStorage.getItem("token");if(!G){L("Please login to save invoices.");return}try{Q("new"),await Di({invoiceNumber:v.invoiceNumber.trim(),amount:Number(v.amount)||0,status:v.status,dueDate:v.dueDate||null,notes:v.notes.trim()||null},G),U(!1),R()}catch(N){L(N.message||"Failed to create invoice")}finally{Q(null)}},Y=async G=>{const N=localStorage.getItem("token");if(!N){L("Please login to update invoices.");return}try{Q(G.id),await Li(G.id,{status:"paid"},N),R()}catch(ee){L(ee.message||"Failed to update invoice")}finally{Q(null)}},pe=G=>{const N=JSON.stringify(G,null,2),ee=new Blob([N],{type:"application/json"}),f=URL.createObjectURL(ee),O=document.createElement("a");O.href=f,O.download=`${G.invoice||"invoice"}.json`,O.click(),URL.revokeObjectURL(f)};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Billing Management"}),e.jsx("button",{className:"btn-primary",onClick:I,children:"Create Invoice"})]}),e.jsxs("div",{className:"view-content",children:[p&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading billing..."}),S&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:S}),!p&&!S&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"billing-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Paid"}),e.jsx("p",{className:"amount",children:n(o.paid)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Outstanding"}),e.jsx("p",{className:"amount",children:n(o.outstanding)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total All Time"}),e.jsx("p",{className:"amount",children:n(o.total)})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:B,onChange:G=>$(G.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Invoices"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Invoice #"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(G=>e.jsxs("tr",{children:[e.jsx("td",{children:G.invoice}),e.jsx("td",{children:G.date?new Date(G.date).toLocaleDateString():"—"}),e.jsx("td",{children:n(G.amount)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${G.status}`,children:G.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>pe(G),children:"Download"}),e.jsx("button",{className:"btn-small",onClick:()=>D(G),children:"View"}),G.status!=="paid"&&e.jsx("button",{className:"btn-small",onClick:()=>Y(G),disabled:k===G.id,children:k===G.id?"Working...":"Mark Paid"})]})]},G.id))})]})]})]})]}),j&&e.jsx("div",{className:"modal-overlay",onClick:()=>U(!1),children:e.jsxs("div",{className:"modal-content",onClick:G=>G.stopPropagation(),children:[e.jsx("h3",{children:"Create Invoice"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Invoice #"}),e.jsx("input",{type:"text",value:v.invoiceNumber,onChange:G=>b(N=>({...N,invoiceNumber:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",value:v.amount,onChange:G=>b(N=>({...N,amount:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:v.status,onChange:G=>b(N=>({...N,status:G.target.value})),children:[e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Due Date"}),e.jsx("input",{type:"date",value:v.dueDate,onChange:G=>b(N=>({...N,dueDate:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:v.notes,onChange:G=>b(N=>({...N,notes:G.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>U(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:l,disabled:k||!v.invoiceNumber.trim()||!v.amount,children:k?"Saving...":"Save"})]})]})}),g&&u&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:G=>G.stopPropagation(),children:[e.jsx("h3",{children:"Invoice Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Invoice:"})," ",u.invoice]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",n(u.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",u.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Date:"})," ",u.date?new Date(u.date).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Due Date:"})," ",u.dueDate?new Date(u.dueDate).toLocaleDateString():"—"]}),u.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",u.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Close"})})]})})]})}const dc=Object.freeze(Object.defineProperty({__proto__:null,default:co},Symbol.toStringTag,{value:"Module"}));function uo(){const[t,r]=a.useState({platformName:"Sports Betting Platform",dailyBetLimit:"10000",weeklyBetLimit:"50000",maxOdds:"100",minBet:"1",maxBet:"5000",maintenanceMode:!1,smsNotifications:!0,twoFactor:!0}),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1);a.useEffect(()=>{(async()=>{const w=localStorage.getItem("token");if(!w){x("Please login to load settings."),m(!1);return}try{m(!0);const u=await Ti(w);r({platformName:u.platformName,dailyBetLimit:u.dailyBetLimit,weeklyBetLimit:u.weeklyBetLimit,maxOdds:u.maxOdds,minBet:u.minBet,maxBet:u.maxBet,maintenanceMode:u.maintenanceMode,smsNotifications:u.smsNotifications,twoFactor:u.twoFactor}),x("")}catch(u){console.error("Failed to load settings:",u),x(u.message||"Failed to load settings")}finally{m(!1)}})()},[]);const j=g=>{const{name:w,value:u,type:d,checked:k}=g.target;r(Q=>({...Q,[w]:d==="checkbox"?k:u}))},U=async()=>{const g=localStorage.getItem("token");if(!g){x("Please login to save settings.");return}try{L(!0),await Mi(t,g),x("")}catch(w){x(w.message||"Failed to save settings")}finally{L(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Platform Settings"})}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading settings..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"settings-container",children:e.jsxs("form",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"General Settings"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Platform Name:"}),e.jsx("input",{type:"text",name:"platformName",value:t.platformName,onChange:j})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Bet Limits"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Daily Bet Limit ($):"}),e.jsx("input",{type:"number",name:"dailyBetLimit",value:t.dailyBetLimit,onChange:j})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Weekly Bet Limit ($):"}),e.jsx("input",{type:"number",name:"weeklyBetLimit",value:t.weeklyBetLimit,onChange:j})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max Odds:"}),e.jsx("input",{type:"number",name:"maxOdds",value:t.maxOdds,onChange:j,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Minimum Bet ($):"}),e.jsx("input",{type:"number",name:"minBet",value:t.minBet,onChange:j,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Maximum Bet ($):"}),e.jsx("input",{type:"number",name:"maxBet",value:t.maxBet,onChange:j})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Security Settings"}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"twoFactor",checked:t.twoFactor,onChange:j,id:"twoFactor"}),e.jsx("label",{htmlFor:"twoFactor",children:"Require Two-Factor Authentication"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"maintenanceMode",checked:t.maintenanceMode,onChange:j,id:"maintenanceMode"}),e.jsx("label",{htmlFor:"maintenanceMode",children:"Maintenance Mode"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"smsNotifications",checked:t.smsNotifications,onChange:j,id:"smsNotifications"}),e.jsx("label",{htmlFor:"smsNotifications",children:"Enable SMS Notifications"})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"button",onClick:U,className:"btn-primary",disabled:S,children:S?"Saving...":"Save Settings"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>window.location.reload(),children:"Reset"})]})]})})]})]})}const uc=Object.freeze(Object.defineProperty({__proto__:null,default:uo},Symbol.toStringTag,{value:"Module"}));function mo(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1),[j,U]=a.useState(null),[g,w]=a.useState({title:"",items:"",status:"active"}),[u,d]=a.useState(null),k=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to view rules."),m(!1);return}try{m(!0);const R=await Bi(b);r(R.rules||[]),x("")}catch(R){console.error("Failed to load rules:",R),x(R.message||"Failed to load rules")}finally{m(!1)}};a.useEffect(()=>{k()},[]);const Q=()=>{U(null),w({title:"",items:"",status:"active"}),L(!0)},B=b=>{U(b),w({title:b.title,items:(b.items||[]).join(`
`),status:b.status||"active"}),L(!0)},$=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to save rules.");return}try{d(j?.id||"new");const R={title:g.title.trim(),items:g.items.split(`
`).map(n=>n.trim()).filter(Boolean),status:g.status};j?await Ei(j.id,R,b):await Fi(R,b),L(!1),k()}catch(R){x(R.message||"Failed to save rule")}finally{d(null)}},v=async b=>{const R=localStorage.getItem("token");if(!R){x("Please login to delete rules.");return}try{d(b),await Ii(b,R),r(n=>n.filter(I=>I.id!==b))}catch(n){x(n.message||"Failed to delete rule")}finally{d(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Rules & Regulations"}),e.jsx("button",{className:"btn-primary",onClick:Q,children:"Add New Rule"})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading rules..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"rules-container",children:t.map(b=>e.jsxs("div",{className:"rule-card",children:[e.jsx("h3",{children:b.title}),e.jsx("ul",{children:(b.items||[]).map((R,n)=>e.jsx("li",{children:R},n))}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>B(b),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>v(b.id),disabled:u===b.id,children:u===b.id?"Working...":"Delete"})]})]},b.id))})]}),S&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:b=>b.stopPropagation(),children:[e.jsx("h3",{children:j?"Edit Rule":"Add Rule"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:g.title,onChange:b=>w(R=>({...R,title:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Items (one per line)"}),e.jsx("textarea",{rows:"6",value:g.items,onChange:b=>w(R=>({...R,items:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:g.status,onChange:b=>w(R=>({...R,status:b.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:$,disabled:u||!g.title.trim(),children:u?"Saving...":"Save"})]})]})})]})}const mc=Object.freeze(Object.defineProperty({__proto__:null,default:mo},Symbol.toStringTag,{value:"Module"}));function po(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState("all"),[j,U]=a.useState(null),[g,w]=a.useState(""),[u,d]=a.useState(!1),[k,Q]=a.useState(null),B=async()=>{const n=localStorage.getItem("token");if(!n){x("Please login to view feedback."),m(!1);return}try{m(!0);const I=await $i({status:S},n);r(I.feedbacks||[]),x("")}catch(I){console.error("Failed to load feedback:",I),x(I.message||"Failed to load feedback")}finally{m(!1)}};a.useEffect(()=>{B()},[S]);const $=n=>{U(n),w(n.adminReply||""),d(!0)},v=async()=>{const n=localStorage.getItem("token");if(!n){x("Please login to reply.");return}try{Q(j.id),await Oi(j.id,{reply:g},n),d(!1),B()}catch(I){x(I.message||"Failed to reply")}finally{Q(null)}},b=async n=>{const I=localStorage.getItem("token");if(!I){x("Please login to mark reviewed.");return}try{Q(n),await _i(n,I),B()}catch(D){x(D.message||"Failed to mark reviewed")}finally{Q(null)}},R=async n=>{const I=localStorage.getItem("token");if(!I){x("Please login to delete feedback.");return}try{Q(n),await Ri(n,I),r(D=>D.filter(l=>l.id!==n))}catch(D){x(D.message||"Failed to delete feedback")}finally{Q(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Customer Feedback"})}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading feedback..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:S,onChange:n=>L(n.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"new",children:"New"}),e.jsx("option",{value:"reviewed",children:"Reviewed"})]})]})}),e.jsx("div",{className:"feedback-container",children:t.map(n=>e.jsxs("div",{className:"feedback-card",children:[e.jsxs("div",{className:"feedback-header",children:[e.jsx("h4",{children:n.user}),e.jsx("div",{className:"rating",children:"⭐".repeat(n.rating||0)}),e.jsx("span",{className:"date",children:n.date?new Date(n.date).toLocaleDateString():"—"})]}),e.jsx("p",{className:"feedback-message",children:n.message}),n.adminReply&&e.jsxs("p",{className:"feedback-message",children:[e.jsx("strong",{children:"Reply:"})," ",n.adminReply]}),e.jsxs("div",{className:"feedback-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>$(n),children:"Reply"}),e.jsx("button",{className:"btn-small",onClick:()=>b(n.id),disabled:k===n.id,children:k===n.id?"Working...":"Mark as Reviewed"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>R(n.id),disabled:k===n.id,children:k===n.id?"Working...":"Delete"})]})]},n.id))})]})]}),u&&j&&e.jsx("div",{className:"modal-overlay",onClick:()=>d(!1),children:e.jsxs("div",{className:"modal-content",onClick:n=>n.stopPropagation(),children:[e.jsx("h3",{children:"Reply to Feedback"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",j.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Message:"})," ",j.message]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Reply"}),e.jsx("textarea",{rows:"4",value:g,onChange:n=>w(n.target.value)})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>d(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:v,disabled:k===j.id||!g.trim(),children:k===j.id?"Saving...":"Save Reply"})]})]})})]})}const pc=Object.freeze(Object.defineProperty({__proto__:null,default:po},Symbol.toStringTag,{value:"Module"}));function ho(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1),[j,U]=a.useState(null),[g,w]=a.useState({question:"",answer:"",status:"active",order:0}),[u,d]=a.useState(null),k=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to view FAQs."),m(!1);return}try{m(!0);const R=await Ui(b);r(R.faqs||[]),x("")}catch(R){console.error("Failed to load FAQs:",R),x(R.message||"Failed to load FAQs")}finally{m(!1)}};a.useEffect(()=>{k()},[]);const Q=()=>{U(null),w({question:"",answer:"",status:"active",order:0}),L(!0)},B=b=>{U(b),w({question:b.question,answer:b.answer,status:b.status||"active",order:b.order||0}),L(!0)},$=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to save FAQs.");return}try{d(j?.id||"new");const R={question:g.question.trim(),answer:g.answer.trim(),status:g.status,order:Number(g.order)||0};j?await zi(j.id,R,b):await Vi(R,b),L(!1),k()}catch(R){x(R.message||"Failed to save FAQ")}finally{d(null)}},v=async b=>{const R=localStorage.getItem("token");if(!R){x("Please login to delete FAQs.");return}try{d(b),await Wi(b,R),r(n=>n.filter(I=>I.id!==b))}catch(n){x(n.message||"Failed to delete FAQ")}finally{d(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"FAQ Management"}),e.jsx("button",{className:"btn-primary",onClick:Q,children:"Add New FAQ"})]}),e.jsxs("div",{className:"view-content",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading FAQs..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&e.jsx("div",{className:"faq-container",children:t.map(b=>e.jsxs("div",{className:"faq-item",children:[e.jsxs("div",{className:"faq-question",children:[e.jsxs("h4",{children:["Q: ",b.question]}),e.jsx("button",{className:"btn-small",onClick:()=>B(b),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>v(b.id),disabled:u===b.id,children:u===b.id?"Working...":"Delete"})]}),e.jsx("div",{className:"faq-answer",children:e.jsxs("p",{children:["A: ",b.answer]})})]},b.id))})]}),S&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:b=>b.stopPropagation(),children:[e.jsx("h3",{children:j?"Edit FAQ":"Add FAQ"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Question"}),e.jsx("input",{type:"text",value:g.question,onChange:b=>w(R=>({...R,question:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Answer"}),e.jsx("textarea",{rows:"4",value:g.answer,onChange:b=>w(R=>({...R,answer:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:g.status,onChange:b=>w(R=>({...R,status:b.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:g.order,onChange:b=>w(R=>({...R,order:b.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:$,disabled:u||!g.question.trim()||!g.answer.trim(),children:u?"Saving...":"Save"})]})]})})]})}const hc=Object.freeze(Object.defineProperty({__proto__:null,default:ho},Symbol.toStringTag,{value:"Module"}));function xo(){const[t,r]=a.useState([]),[o,m]=a.useState(!0),[p,x]=a.useState(""),[S,L]=a.useState(!1),[j,U]=a.useState(null),[g,w]=a.useState({title:"",content:"",order:0,status:"active"}),[u,d]=a.useState(null),k=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to view manual."),m(!1);return}try{m(!0);const R=await Hi(b);r(R.sections||[]),x("")}catch(R){console.error("Failed to load manual:",R),x(R.message||"Failed to load manual")}finally{m(!1)}};a.useEffect(()=>{k()},[]);const Q=()=>{U(null),w({title:"",content:"",order:0,status:"active"}),L(!0)},B=b=>{U(b),w({title:b.title,content:b.content,order:b.order||0,status:b.status||"active"}),L(!0)},$=async()=>{const b=localStorage.getItem("token");if(!b){x("Please login to save manual sections.");return}try{d(j?.id||"new");const R={title:g.title.trim(),content:g.content.trim(),order:Number(g.order)||0,status:g.status};j?await Gi(j.id,R,b):await qi(R,b),L(!1),k()}catch(R){x(R.message||"Failed to save section")}finally{d(null)}},v=async b=>{const R=localStorage.getItem("token");if(!R){x("Please login to delete sections.");return}try{d(b),await Yi(b,R),r(n=>n.filter(I=>I.id!==b))}catch(n){x(n.message||"Failed to delete section")}finally{d(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"User Manual"}),e.jsx("button",{className:"btn-primary",onClick:Q,children:"Add Section"})]}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"manual-container",children:[o&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading manual..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!o&&!p&&t.map(b=>e.jsxs("section",{className:"manual-section",children:[e.jsx("h3",{children:b.title}),e.jsx("p",{children:b.content}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>B(b),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>v(b.id),disabled:u===b.id,children:u===b.id?"Working...":"Delete"})]})]},b.id))]})}),S&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:b=>b.stopPropagation(),children:[e.jsx("h3",{children:j?"Edit Section":"Add Section"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:g.title,onChange:b=>w(R=>({...R,title:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Content"}),e.jsx("textarea",{rows:"6",value:g.content,onChange:b=>w(R=>({...R,content:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:g.order,onChange:b=>w(R=>({...R,order:b.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:g.status,onChange:b=>w(R=>({...R,status:b.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:$,disabled:u||!g.title.trim()||!g.content.trim(),children:u?"Saving...":"Save"})]})]})})]})}const xc=Object.freeze(Object.defineProperty({__proto__:null,default:xo},Symbol.toStringTag,{value:"Module"})),go=()=>{const[t,r]=a.useState(null),[o,m]=a.useState(null),[p,x]=a.useState(!0),[S,L]=a.useState(null),j=async()=>{try{const $=localStorage.getItem("token");if(!$)throw new Error("Please login to view system monitor");const[v,b]=await Promise.all([Qi($),Ji($)]);r(v),m(b),L(new Date),x(!1)}catch($){console.error("Monitor Error:",$),x(!1)}};if(a.useEffect(()=>{j();const $=setInterval(()=>{document.hidden||j()},6e4),v=()=>{document.hidden||j()};return document.addEventListener("visibilitychange",v),()=>{clearInterval($),document.removeEventListener("visibilitychange",v)}},[]),p&&!t)return e.jsx("div",{className:"admin-content-card",children:"Loading System Monitor..."});const U=t?.counts||{users:0,bets:0,matches:0},g=t?.liveMatches||[],w=o?.items||[],u=o?.summary||{links:0,collections:0,rows:0},d=t?.sportsbookHealth||{},k=d?.oddsSync||{},Q=d?.settlement||{},B=async()=>{try{const $=localStorage.getItem("token");if(!$)throw new Error("Please login first");const v=await On($);alert(`Odds Refreshed! Created: ${v.results?.created||0}, Updated: ${v.results?.updated||0}, Score-only updates: ${v.results?.scoreOnlyUpdates||0}, Settled: ${v.results?.settled||0}`),j()}catch($){console.error("Refresh error:",$),alert($.message||"Error refreshing odds")}};return e.jsxs("div",{className:"admin-view-container",children:[e.jsxs("div",{className:"monitor-header",style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("h2",{style:{color:"#fff",margin:0},children:"System Monitor"}),e.jsxs("div",{style:{color:"#aaa",fontSize:"0.9rem"},children:["Last updated: ",S?S.toLocaleTimeString():"Never"]}),e.jsx("button",{onClick:B,style:{background:"#e67e22",color:"white",border:"none",padding:"8px 16px",borderRadius:"4px",cursor:"pointer",fontWeight:"bold"},children:"🔄 Refresh Live Odds"})]}),e.jsxs("div",{className:"stats-grid",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-users"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Users"}),e.jsx("p",{children:U.users})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-ticket"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Bets"}),e.jsx("p",{children:U.bets})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-futbol"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Tracked Matches"}),e.jsx("p",{children:U.matches})]})]})]}),e.jsxs("div",{className:"admin-content-card",style:{marginBottom:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-heart-pulse"})," Sportsbook Feed Health"]})}),e.jsxs("div",{className:"stats-grid",style:{marginBottom:0},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-signal"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Odds Feed"}),e.jsx("p",{children:k?.bettingSuspended?"STALE / CLOSED":"OK"}),e.jsxs("small",{children:["Last odds sync: ",k?.lastOddsSuccessAt?new Date(k.lastOddsSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Age: ",k?.syncAgeSeconds??"—","s"]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-flag-checkered"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Results Feed"}),e.jsx("p",{children:k?.lastScoresSuccessAt?"SYNCING":"UNKNOWN"}),e.jsxs("small",{children:["Last score sync: ",k?.lastScoresSuccessAt?new Date(k.lastScoresSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Failures: ",k?.consecutiveFailures??0]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-scale-balanced"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Settlement"}),e.jsx("p",{children:Q?.lastRunStatus||"unknown"}),e.jsxs("small",{children:["Last success: ",Q?.lastSuccessAt?new Date(Q.lastSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Last match: ",Q?.lastMatchId||"—"]})]})]})]}),(k?.lastError||Q?.lastError)&&e.jsxs("div",{style:{marginTop:"16px",padding:"12px",borderRadius:"8px",background:"rgba(255, 80, 80, 0.12)",color:"#ffb3b3"},children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Last sync error:"})," ",k?.lastError||"—"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Last settlement error:"})," ",Q?.lastError||"—"]})]})]}),e.jsxs("div",{className:"admin-content-card",children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-satellite-dish"})," Live & Scored Matches (DB View)"]})}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Scores"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Updated"})]})}),e.jsx("tbody",{children:g.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"text-center",children:"No live or scored matches found."})}):g.map($=>e.jsxs("tr",{children:[e.jsx("td",{children:$.sport?.replace("_"," ").toUpperCase()}),e.jsxs("td",{children:[$.homeTeam," ",e.jsx("span",{className:"vs",children:"vs"})," ",$.awayTeam]}),e.jsxs("td",{className:"score-cell",children:[e.jsx("span",{className:"score-badge home",children:$.score?.score_home??$.score?.scoreHome??0}),"-",e.jsx("span",{className:"score-badge away",children:$.score?.score_away??$.score?.scoreAway??0})]}),e.jsx("td",{children:e.jsx("span",{className:`status-badge ${$.status}`,children:$.status})}),e.jsx("td",{children:new Date($.lastUpdated).toLocaleTimeString()})]},$.id))})]})})]}),e.jsxs("div",{className:"admin-content-card",style:{marginTop:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-diagram-project"})," Dashboard Link to Entity/Table Map"]})}),e.jsxs("div",{style:{color:"#666",marginBottom:"10px",fontSize:"0.9rem"},children:["Links: ",u.links," | Collections: ",u.collections," | Total Rows: ",u.rows]}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Dashboard Link"}),e.jsx("th",{children:"Collections"}),e.jsx("th",{children:"Tables / Views"}),e.jsx("th",{children:"API Routes"})]})}),e.jsx("tbody",{children:w.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center",children:"No entity catalog data found."})}):w.map($=>e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("strong",{children:$.label}),e.jsx("div",{style:{fontSize:"0.8rem",color:"#666"},children:$.id})]}),e.jsx("td",{children:($.collections||[]).map(v=>e.jsxs("div",{style:{marginBottom:"4px"},children:[e.jsx("code",{children:v.collection})," (",v.rows,")"]},`${$.id}-${v.collection}`))}),e.jsx("td",{children:($.collections||[]).map(v=>e.jsxs("div",{style:{marginBottom:"4px",fontSize:"0.85rem"},children:[e.jsxs("div",{children:[e.jsx("code",{children:v.table})," ",v.exists?"":"(missing)"]}),e.jsxs("div",{children:[e.jsx("code",{children:v.entityView})," | ",e.jsx("code",{children:v.flatTable})]})]},`${$.id}-${v.collection}-table`))}),e.jsx("td",{children:($.routes||[]).map(v=>e.jsx("div",{style:{marginBottom:"2px",fontSize:"0.85rem"},children:e.jsx("code",{children:v})},`${$.id}-${v}`))})]},$.id))})]})})]}),e.jsx("style",{children:`
                .monitor-header {
                    background: linear-gradient(135deg, #0d3b5c 0%, #1a5f7a 100%);
                    border-radius: 12px;
                    padding: 12px;
                    gap: 10px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }
                .view-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                .last-updated {
                    font-size: 0.9rem;
                    color: #888;
                    font-family: monospace;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                .stat-card {
                    background: #1e1e1e;
                    border-radius: 12px;
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    border: 1px solid #333;
                }
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }
                .stat-icon.users { background: rgba(52, 152, 219, 0.2); color: #3498db; }
                .stat-icon.bets { background: rgba(46, 204, 113, 0.2); color: #2ecc71; }
                .stat-icon.matches { background: rgba(231, 76, 60, 0.2); color: #e74c3c; }
                .stat-info h3 { margin: 0; font-size: 0.9rem; color: #888; }
                .stat-info p { margin: 0; font-size: 1.8rem; font-weight: bold; color: #fff; }
                
                .admin-table th {
                    background-color: #333;
                    color: white;
                    padding: 12px;
                    text-align: left;
                }
                .admin-table td {
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    color: #333; /* Dark text for readability */
                    background-color: #fff; /* Ensure white background */
                }
                .admin-table tr:hover td {
                    background-color: #f5f5f5;
                }
                .score-cell { font-weight: bold; color: #000; }
                .score-badge { 
                    display: inline-block; 
                    padding: 2px 6px; 
                    background: #eee; 
                    color: #333;
                    border: 1px solid #ccc;
                    border-radius: 4px; 
                    margin: 0 4px;
                }
                .vs { color: #555; font-size: 0.8rem; }
                .table-responsive {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .admin-table {
                    min-width: 640px;
                    width: 100%;
                    border-collapse: collapse;
                }
                @media (max-width: 768px) {
                    .monitor-header {
                        align-items: flex-start !important;
                    }
                    .monitor-header button {
                        width: 100%;
                        min-height: 42px;
                    }
                    .stat-card {
                        padding: 1rem;
                        gap: 0.8rem;
                    }
                    .stat-info p {
                        font-size: 1.4rem;
                    }
                }
            `})]})},gc=Object.freeze(Object.defineProperty({__proto__:null,default:go},Symbol.toStringTag,{value:"Module"})),Ca=t=>{const r=Number(t);return Number.isNaN(r)?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(r)};function fo(){const[t,r]=a.useState(null),[o,m]=a.useState(null),[p,x]=a.useState(!0),[S,L]=a.useState(""),[j,U]=a.useState(!1),g=async w=>{const u=w.target.value;U(!0);try{const d=localStorage.getItem("token");await Ki({dashboardLayout:u},d),r(k=>({...k,dashboardLayout:u})),alert("Layout updated. The page will reload to apply changes."),window.location.reload()}catch(d){alert("Failed to update layout: "+d.message)}finally{U(!1)}};return a.useEffect(()=>{(async()=>{const u=localStorage.getItem("token");if(!u){L("Please login to view profile."),x(!1);return}try{x(!0);const d=await la(u);if(r(d),String(d?.role||"").toLowerCase()==="agent")try{const Q=await Vn(u);m(Number(Q?.balanceOwed??0))}catch(Q){console.error("Failed to load settlement balance:",Q),m(null)}else m(null);L("")}catch(d){L(d.message||"Failed to load profile")}finally{x(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"My Profile"})}),e.jsxs("div",{className:"view-content",children:[p&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading profile..."}),S&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:S}),!p&&!S&&t&&e.jsx("div",{className:"settings-container",children:e.jsxs("div",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Account"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username:"}),e.jsx("input",{type:"text",value:t.username||"",readOnly:!0})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Preferences"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Dashboard Layout:"}),e.jsxs("select",{value:t.dashboardLayout||"tiles",onChange:g,disabled:j,style:{padding:"8px",borderRadius:"4px",border:"1px solid #ccc"},children:[e.jsx("option",{value:"tiles",children:"Tiles (Default)"}),e.jsx("option",{value:"sidebar",children:"Sidebar Navigation"})]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number:"}),e.jsx("input",{type:"text",value:t.phoneNumber||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role:"}),e.jsx("input",{type:"text",value:t.role||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Super Admin:"}),e.jsx("input",{type:"text",value:t.isSuperAdmin?"Yes":"No",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Unlimited Balance:"}),e.jsx("input",{type:"text",value:t.unlimitedBalance?"Enabled":"Disabled",readOnly:!0})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Balances"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Balance:"}),e.jsx("input",{type:"text",value:Ca(t.balance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Pending Balance:"}),e.jsx("input",{type:"text",value:Ca(t.pendingBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Available Balance:"}),e.jsx("input",{type:"text",value:Ca(t.availableBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:String(t.role||"").toLowerCase()==="agent"?"Settlement Balance:":"Outstanding (Settle Limit):"}),e.jsx("input",{type:"text",value:Ca(String(t.role||"").toLowerCase()==="agent"&&o!==null?o:t.balanceOwed),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit Limit:"}),e.jsx("input",{type:"text",value:Ca(t.creditLimit),readOnly:!0})]})]})]})})]})]})}const fc=Object.freeze(Object.defineProperty({__proto__:null,default:fo},Symbol.toStringTag,{value:"Module"})),Pn={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},Ln=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Dn=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],bo=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],ia=t=>String(t||"").trim().toLowerCase(),Ws=t=>String(t||"").trim().toUpperCase(),er=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),jo=new Set([...er,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),yo=new Set(["bet_void","bet_void_admin","deleted_wager"]),vo=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),No=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),wo=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),_s=t=>{const r=ia(t?.type),o=Ws(t?.reason),m=String(t?.description||"").toLowerCase();return r==="fp_deposit"||wo.has(o)||(r==="adjustment"||r==="fp_deposit")&&(m.includes("freeplay")||m.includes("free play"))},So=t=>{const r=ia(t?.type),o=Ws(t?.reason);return r==="credit_adj"||r==="debit_adj"||vo.has(o)},ko=t=>{const r=Ws(t?.reason);return No.has(r)},Co=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,As=t=>!t||typeof t!="object"?t:{...t,minBet:we(t.minBet??t.defaultMinBet,0),maxBet:we(t.maxBet??t.wagerLimit??t.defaultMaxBet,0),wagerLimit:we(t.wagerLimit??t.maxBet??t.defaultMaxBet,0),creditLimit:we(t.creditLimit??t.defaultCreditLimit,0),balanceOwed:we(t.balanceOwed??t.defaultSettleLimit,0),balance:we(t.balance,0),pendingBalance:we(t.pendingBalance,0),freeplayBalance:we(t.freeplayBalance,0),lifetime:we(t.lifetime,0),lifetimePlusMinus:we(t.lifetimePlusMinus??t.lifetime,0)},Tn=(t,r=0)=>we(t===""||t===null||t===void 0?r:t,0),Mn=t=>String(t||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Rs=t=>ia(t?.type)==="deleted_wager"?String(t?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":qn(t),Bn=t=>{const r=String(t?.description||"").trim();if(!r)return"—";const o=Mn(r),m=Mn(Rs(t));return!o||m&&(o===m||o===`${m}s`||`${o}s`===m)?"—":r},In=t=>String(t?.actorUsername??t?.deletedByUsername??"").trim()||"—",En=t=>{if(!t)return 0;const r=t?.$date||t,m=new Date(r).getTime();return Number.isNaN(m)?0:m},Ao=t=>{const r=Math.abs(Number(t?.amount||0)),o=String(t?.sport||"").trim(),m=String(t?.reason||"").trim(),p=String(t?.status||"deleted").trim().toLowerCase()||"deleted",S=[p==="restored"?"Changed Wager":"Deleted Wager"];return o&&S.push(`(${o})`),m&&S.push(`- ${m}`),{id:`deleted-wager-${String(t?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:t?.id||null,user:t?.user||"Unknown",userId:t?.userId||null,amount:r,date:t?.deletedAt||t?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:p,reason:m?m.toUpperCase().replace(/\s+/g,"_"):null,description:S.join(" ")}},Po=t=>{const r=ia(t);return r==="betting_adjustments"||r==="credit_debit_adjustments"||r==="promotional_adjustments"?"adjustment":"all"},Lo=(t,r)=>{const o=ia(r);if(o===""||o==="all"||o==="all_transactions")return!0;const m=ia(t?.type);return o==="non_wager"?!jo.has(m):o==="deposit_withdrawal"?m==="deposit"||m==="withdrawal":o==="betting_adjustments"||o==="credit_debit_adjustments"?So(t):o==="promotional_adjustments"?ko(t):o==="freeplay_transactions"?_s(t):o==="wagers_only"?er.has(m):o==="deleted_changed"||o==="deleted_transactions"?yo.has(m):!0},Do=t=>!t||typeof t!="object"?"":String(t.userId??t.playerId??t.user?.id??t.user?.id??"").trim(),To=t=>!t||typeof t!="object"?"":String(t.user??t.username??t.playerUsername??t.playerName??"").trim().toLowerCase(),Ps=(t,r,o,m)=>{const p=Do(t);if(p!=="")return!!(p===String(r)||m?.id&&p===String(m.id));const x=To(t),S=String(o||"").trim().toLowerCase();return x!==""&&S!==""?!!(x===S||m?.username&&x===String(m.username).trim().toLowerCase()):!0};function Mo({userId:t,onBack:r,onNavigateToUser:o,role:m="admin",viewContext:p=null}){const[x,S]=a.useState(!0),[L,j]=a.useState(!1),[U,g]=a.useState(""),[w,u]=a.useState(""),[d,k]=a.useState(null),[Q,B]=a.useState({}),[$,v]=a.useState(null),[b,R]=a.useState([]),[n,I]=a.useState(Pn),[D,l]=a.useState(!1),[Y,pe]=a.useState("basics"),[G,N]=a.useState([]),[ee,f]=a.useState(!1),[O,H]=a.useState(""),[_,E]=a.useState(""),[ie,Pe]=a.useState("7d"),[z,M]=a.useState("deposit_withdrawal"),[Z,he]=a.useState("all"),[ae,re]=a.useState([]),[Re,C]=a.useState(!1),[ne,i]=a.useState("deposit"),[W,oe]=a.useState(""),[ge,ke]=a.useState(""),[ye,Ge]=a.useState(!0),[Oe,Ve]=a.useState(!1),[it,qe]=a.useState(!1),[Qe,Fe]=a.useState("daily"),[dt,ht]=a.useState(!1),[nt,Ue]=a.useState(""),[Je,lt]=a.useState([]),[Ke,St]=a.useState(""),[c,F]=a.useState([]),[J,de]=a.useState([]),[Ne,xe]=a.useState(!1),[ve,Le]=a.useState(""),[He,yt]=a.useState(""),[Dt,kt]=a.useState("7d"),[Xe,vt]=a.useState([]),[_t,Pt]=a.useState(!1),[Nt,Tt]=a.useState("deposit"),[Kt,Zt]=a.useState(""),[It,At]=a.useState(""),[xt,ut]=a.useState(!1),[Xt,ea]=a.useState(!1),[Et,P]=a.useState(""),[T,be]=a.useState(""),[V,De]=a.useState(!1),[Me,We]=a.useState(""),[Ce,$e]=a.useState(""),[Ie,ot]=a.useState(""),[Ct,et]=a.useState(null),[gt,mt]=a.useState(!1),[pt,ft]=a.useState(""),[ct,ta]=a.useState(null),[at,Lt]=a.useState(null),[oa,xa]=a.useState(!1),[Ta,y]=a.useState(""),[q,A]=a.useState(!1),[te,X]=a.useState(""),[ce,ue]=a.useState(""),[Ee,tt]=a.useState(null),[bt,zt]=a.useState(""),[ga,Ma]=a.useState(""),[zs,Ba]=a.useState(""),[Bo,tr]=a.useState(""),[Ia,Vs]=a.useState(""),[Io,ar]=a.useState(""),[Eo,sr]=a.useState([]),[Hs,nr]=a.useState(""),[fa,as]=a.useState(null),[Ys,Gs]=a.useState(!1),[qs,Ea]=a.useState(""),[Fa,Qs]=a.useState(null),rr=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],Js=async(s,h)=>{const K=String(h||"").trim();if(!K)return null;try{const le=await Vn(s,{agentId:K}),se=Number(le?.balanceOwed);return Number.isFinite(se)?se:null}catch(le){return console.warn("Failed to load live agent settlement balance:",le),null}};a.useEffect(()=>{t&&(async()=>{try{S(!0),g(""),u(""),E(""),H(""),et(null),k(null),ta(null),Lt(null),I(Pn),pe("basics");const h=localStorage.getItem("token");if(!h){g("Please login to view details.");return}const[K,le]=await Promise.all([bs(t,h),["admin","super_agent","master_agent","agent"].includes(m)?Qt(h):Promise.resolve([])]),se=K?.user,me=se?.settings||{},je=me.dynamicLiveLimits||{},fe=me.dynamicLiveFlags||{},Se=me.liveCasinoLimits||{},Te=Se.default||{},ze=Se.agent||{},_e=Se.player||{};if(!se){g("User not found.");return}const Ze=String(se?.role||"").toLowerCase(),Ft=Ze==="agent"||Ze==="master_agent"||Ze==="super_agent",st=As(se),ca=Ft?await Js(h,se.id||t):null;k(st),ta(ca),B(K?.stats||{}),v(K?.referredBy||null),R(Array.isArray(le)?le:[]),Ft&&(Ma(se?.agentPercent!=null?String(se.agentPercent):""),Ba(se?.playerRate!=null?String(se.playerRate):""),tr(se?.hiringAgentPercent!=null?String(se.hiringAgentPercent):""),Vs(st.parentAgentId||st.masterAgentId||st.createdBy?.id||st.createdBy||""),ar(se?.subAgentPercent!=null?String(se.subAgentPercent):""),sr(Array.isArray(se?.extraSubAgents)?se.extraSubAgents.map((Yt,Gt)=>({id:Gt,name:Yt.name||"",percent:Yt.percent!=null?String(Yt.percent):""})):[])),I({password:"",firstName:st.firstName||"",lastName:st.lastName||"",phoneNumber:st.phoneNumber||"",minBet:st.minBet,agentId:Ft?st.parentAgentId||st.masterAgentId||"":m==="admin"?st.masterAgentId||st.agentId?.id||st.agentId||"":st.agentId?.id||st.agentId||"",status:(st.status||"active").toLowerCase(),creditLimit:st.creditLimit,wagerLimit:st.wagerLimit,settleLimit:st.balanceOwed,accountType:me.accountType||"credit",zeroBalanceWeekly:me.zeroBalanceWeekly||"standard",tempCredit:Number(me.tempCredit||0),expiresOn:me.expiresOn||"",enableCaptcha:!!me.enableCaptcha,cryptoPromoPct:Number(me.cryptoPromoPct||0),promoType:me.promoType||"promo_credit",playerNotes:me.playerNotes||"",sportsbook:me.sports??!0,casino:me.casino??!0,horses:me.racebook??!0,messaging:me.messaging??!1,dynamicLive:me.live??!0,propPlus:me.props??!0,liveCasino:me.liveCasino??!1,freePlayPercent:Number(me.freePlayPercent??20),maxFpCredit:Number(me.maxFpCredit??0),dlMinStraightBet:Number(je.minStraightBet??25),dlMaxStraightBet:Number(je.maxStraightBet??250),dlMaxPerOffering:Number(je.maxPerOffering??500),dlMaxBetPerEvent:Number(je.maxBetPerEvent??500),dlMaxWinSingleBet:Number(je.maxWinSingleBet??1e3),dlMaxWinEvent:Number(je.maxWinEvent??3e3),dlDelaySec:Number(je.delaySec??7),dlMaxFavoriteLine:Number(je.maxFavoriteLine??-1e4),dlMaxDogLine:Number(je.maxDogLine??1e4),dlMinParlayBet:Number(je.minParlayBet??10),dlMaxParlayBet:Number(je.maxParlayBet??100),dlMaxWinEventParlay:Number(je.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(je.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(je.wagerCoolOffSec??30),dlLiveParlays:!!fe.liveParlays,dlBlockPriorStart:fe.blockPriorStart??!0,dlBlockHalftime:fe.blockHalftime??!0,dlIncludeGradedInLimits:!!fe.includeGradedInLimits,dlUseRiskLimits:!!fe.useRiskLimits,casinoDefaultMaxWinDay:Number(Te.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(Te.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(Te.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(Te.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(ze.maxWinDay??1e3),casinoAgentMaxLossDay:Number(ze.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(ze.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(ze.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(_e.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(_e.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(_e.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(_e.maxLossWeek??5e3),appsVenmo:se.apps?.venmo||"",appsCashapp:se.apps?.cashapp||"",appsApplePay:se.apps?.applePay||"",appsZelle:se.apps?.zelle||"",appsPaypal:se.apps?.paypal||"",appsBtc:se.apps?.btc||"",appsOther:se.apps?.other||""})}catch(h){console.error("Failed to load player details:",h),g(h.message||"Failed to load details")}finally{S(!1)}})()},[m,t]);const ss=async()=>{if(!t)return;const s=localStorage.getItem("token");if(s)try{xa(!0),y("");const h=await Xi(t,s);Lt(h)}catch(h){y(h.message||"Failed to load commission chain")}finally{xa(!1)}},ir=async s=>{if(Vs(s),!s)return;const h=localStorage.getItem("token");if(h)try{A(!0),X(""),ue(""),await ha(t,{parentAgentId:s},h),ue("Master agent updated"),await ss()}catch(K){X(K.message||"Failed to update master agent")}finally{A(!1)}},lr=async()=>{const s=localStorage.getItem("token"),h=parseFloat(Hs);if(!s||isNaN(h)||h<=0){Ea("Enter a valid positive amount");return}try{Gs(!0),Ea(""),as(null);const K=await tl(t,h,s);as(K)}catch(K){Ea(K.message||"Calculation failed")}finally{Gs(!1)}},or=async()=>{if(!at?.upline)return;const s=localStorage.getItem("token");if(s)try{const h=at.upline.map(le=>({id:le.id,username:le.username,agentPercent:le.agentPercent})),K=await el(h,s);Qs(K)}catch(h){Qs({isValid:!1,errors:[h.message]})}},Ks=async s=>{if(!d?.username)return[];const h=s||localStorage.getItem("token");if(!h)throw new Error("Please login to view transactions.");const K={user:d.username||"",type:Po(z),status:Z,time:ie,limit:300};t&&(K.userId=t);const le=await La(K,h);let je=[...(Array.isArray(le?.transactions)?le.transactions:[]).filter(fe=>Ps(fe,t,d.username,rs))];if(["deleted_changed","deleted_transactions"].includes(ia(z)))try{const fe=await Rn({user:d.username||"",status:"all",sport:"all",time:ie,limit:300},h),Se=(Array.isArray(fe?.wagers)?fe.wagers:[]).filter(Te=>String(Te?.userId||"")===String(t)).map(Ao);je=[...je,...Se]}catch(fe){console.warn("Deleted/Changed wagers could not be loaded:",fe)}return je.filter(fe=>Lo(fe,z)).sort((fe,Se)=>En(Se?.date)-En(fe?.date))};a.useEffect(()=>{(async()=>{if(!(Y!=="transactions"||!d))try{f(!0),H("");const h=await Ks();N(h)}catch(h){H(h.message||"Failed to load transactions")}finally{f(!1)}})()},[Y,d,z,Z,ie,t]),a.useEffect(()=>{(async()=>{if(!(Y!=="performance"||!d?.username))try{ht(!0),Ue("");const h=localStorage.getItem("token");if(!h){Ue("Please login to view performance.");return}const K=await es({customer:d.username,time:Qe==="weekly"?"90d":Qe==="yearly"?"all":"30d",type:"all-types",limit:500},h),le=Array.isArray(K?.bets)?K.bets:[],se=new Map,me=Se=>{const Te=new Date(Date.UTC(Se.getFullYear(),Se.getMonth(),Se.getDate())),ze=Te.getUTCDay()||7;Te.setUTCDate(Te.getUTCDate()+4-ze);const _e=new Date(Date.UTC(Te.getUTCFullYear(),0,1));return Math.ceil(((Te-_e)/864e5+1)/7)};for(const Se of le){const Te=Se?.createdAt,ze=new Date(Te);if(Number.isNaN(ze.getTime()))continue;let _e="",Ze="";if(Qe==="daily"){const Mt=ze.getFullYear(),Sa=String(ze.getMonth()+1).padStart(2,"0"),da=String(ze.getDate()).padStart(2,"0");_e=`${Mt}-${Sa}-${da}`,Ze=ze.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(Qe==="weekly"){const Mt=ze.getFullYear(),Sa=String(me(ze)).padStart(2,"0");_e=`${Mt}-W${Sa}`;const da=new Date(ze),hn=da.getDay(),Rr=da.getDate()-hn+(hn===0?-6:1);da.setDate(Rr),Ze=`Week of ${da.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(Qe==="monthly"){const Mt=ze.getFullYear(),Sa=String(ze.getMonth()+1).padStart(2,"0");_e=`${Mt}-${Sa}`,Ze=ze.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const Mt=ze.getFullYear();_e=`${Mt}`,Ze=`${Mt}`}const Ft=Number(Se?.amount||0),st=Number(Se?.potentialPayout||0),ca=String(Se?.status||"").toLowerCase(),Yt=ca==="won"?Math.max(0,st-Ft):ca==="lost"?-Ft:0;se.has(_e)||se.set(_e,{date:ze,net:0,wagers:[],periodLabel:Ze});const Gt=se.get(_e);Gt.net+=Yt,Gt.wagers.push({id:Se.id||`${_e}-${Gt.wagers.length+1}`,label:`${Se?.match?.awayTeam||""} vs ${Se?.match?.homeTeam||""}`.trim()||Se.selection||"Wager",amount:Yt})}const je=Array.from(se.entries()).map(([Se,Te])=>({key:Se,date:Te.date,periodLabel:Te.periodLabel,net:Te.net,wagers:Te.wagers})).sort((Se,Te)=>Te.key.localeCompare(Se.key));if(Qe==="yearly"){const Se=we(d?.lifetimePlusMinus??d?.lifetime,0);if(Number.isFinite(Se)){const Te=je.reduce((_e,Ze)=>_e+Number(Ze.net||0),0),ze=Se-Te;if(Math.abs(ze)>=.01){const _e=String(new Date().getFullYear());let Ze=je.findIndex(Ft=>Ft.key===_e);Ze<0&&(je.unshift({key:_e,date:new Date,periodLabel:_e,net:0,wagers:[]}),Ze=0),je[Ze]={...je[Ze],net:Number(je[Ze].net||0)+ze,wagers:[...Array.isArray(je[Ze].wagers)?je[Ze].wagers:[],{id:`lifetime-carry-${je[Ze].key}`,label:"Lifetime +/- Carry",amount:ze,synthetic:!0}]}}}}lt(je);const fe=je[0]?.key||"";St(fe),F(je[0]?.wagers||[])}catch(h){Ue(h.message||"Failed to load performance"),lt([]),St(""),F([])}finally{ht(!1)}})()},[Y,d?.username,d?.lifetimePlusMinus,d?.lifetime,Qe]),a.useEffect(()=>{(async()=>{if(!(Y!=="freeplays"||!d?.username))try{xe(!0),Le("");const h=localStorage.getItem("token");if(!h){Le("Please login to view free play.");return}const K=await La({user:d.username,type:"all",status:"all",time:Dt,limit:300},h),se=(Array.isArray(K?.transactions)?K.transactions:[]).filter(me=>Ps(me,t,d.username,rs)&&_s(me));de(se)}catch(h){Le(h.message||"Failed to load free play")}finally{xe(!1)}})()},[Y,d?.username,Dt,t]);const Ae=(s,h)=>{I(K=>({...K,[s]:h}))},cr=s=>{et(null),I(h=>({...h,firstName:Ot(s)}))},dr=s=>{et(null),I(h=>({...h,lastName:Ot(s)}))},ur=s=>{et(null),I(h=>({...h,phoneNumber:Ms(s)}))},Zs=a.useMemo(()=>{const s=`${n.firstName||""} ${n.lastName||""}`.trim();return s||(d?.fullName?d.fullName:"")},[n.firstName,n.lastName,d?.fullName]);a.useMemo(()=>Zs||d?.username||"Player",[Zs,d?.username]);const Xs=a.useMemo(()=>Bs(n.firstName,n.lastName,n.phoneNumber,d?.username||""),[n.firstName,n.lastName,n.phoneNumber,d?.username]),ns=a.useMemo(()=>d?Xs||d.displayPassword||"Not set":"",[d,Xs]),en=a.useMemo(()=>{const s=new Set;return(Array.isArray(Ct?.matches)?Ct.matches:[]).forEach(K=>{(Array.isArray(K?.matchReasons)?K.matchReasons:[]).forEach(se=>{const me=String(se||"").trim().toLowerCase();me&&s.add(me)})}),s},[Ct]),mr=en.has("phone"),pr=en.has("password"),hr=a.useMemo(()=>{const s=String(d?.role||"player").toLowerCase();return s==="user"||s==="player"?"PLAYER":s.replace(/_/g," ").toUpperCase()},[d?.role]),Be=a.useMemo(()=>{const s=String(d?.role||"player").toLowerCase();return s==="agent"||s==="master_agent"||s==="master agent"||s==="super_agent"||s==="super agent"},[d?.role]),rs=a.useMemo(()=>{if(!Be||!d?.username||!b?.length)return null;const s=String(d.username).toUpperCase();if(s.endsWith("MA")){const h=s.slice(0,-2),K=b.find(le=>String(le.username||"").toUpperCase()===h);return K?{id:K.id,username:h}:null}else{const h=s+"MA",K=b.find(le=>String(le.username||"").toUpperCase()===h);return K?{id:K.id,username:h}:null}},[Be,d?.username,b]);a.useMemo(()=>{if(!Ia)return"";const s=b.find(h=>h.id===Ia);return s?String(s.username||"").toUpperCase():String(d?.createdByUsername||d?.createdBy?.username||"").toUpperCase()},[Ia,b,d]);const Vt=we(d?.balance,0),ba=we(d?.pendingBalance,0),tn=we(d?.freeplayBalance,0),an=we(d?.lifetimePlusMinus??d?.lifetime,0),ja=Tn(n.creditLimit,d?.creditLimit??d?.defaultCreditLimit),is=Tn(n.settleLimit,d?.balanceOwed??d?.defaultSettleLimit),ls=we(d?.minBet??d?.defaultMinBet??n.minBet,0),os=we(d?.maxBet??d?.defaultMaxBet??d?.wagerLimit??n.wagerLimit,0),aa=Be&&ct!==null?we(ct,0):Vt,cs="Balance Owed / House Money",ds=a.useMemo(()=>ja+Vt-ba,[ja,Vt,ba]),Ht=a.useMemo(()=>{let s=0;for(const h of G)h?.status==="pending"&&String(h?.type||"").toLowerCase().includes("casino")&&(s+=Number(h.amount||0));return{pending:ba,available:Be?Vt:Number(ds||0),carry:Be&&ct!==null?aa:Vt,nonPostedCasino:s}},[G,ba,Vt,ds,Be,ct,aa]),sn=s=>Math.round(we(s,0)),us=s=>String(Math.abs(sn(s))),Ye=s=>"$"+sn(s).toLocaleString("en-US"),jt=s=>{const h=we(s,0);return`$${Math.round(h).toLocaleString("en-US")}`},xr=async()=>{ft(""),mt(!0);try{const s=localStorage.getItem("token");if(!s)throw new Error("No admin token found. Please log in again.");const h=await Zi(t,s);if(!h?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",s);const se=localStorage.getItem("userRole")||"";se&&sessionStorage.setItem("impersonationBaseRole",se)}localStorage.setItem("token",h.token),localStorage.setItem("userRole",String(h?.role||"user")),localStorage.removeItem("user");const K=String(h?.role||"").toLowerCase();let le="/";K==="admin"?le="/admin/dashboard":K==="agent"?le="/agent/dashboard":(K==="master_agent"||K==="super_agent")&&(le="/super_agent/dashboard"),window.location.href=le}catch(s){ft(s.message||"Failed to login as user. Please try again."),mt(!1)}},ms=String($?.id||"").trim(),gr=a.useMemo(()=>{if(!$)return"—";const s=$.firstName||"",h=$.lastName||"";return[s,h].filter(Boolean).join(" ").trim()||$.username||$.id||"—"},[$]),$a=ms!==""&&ms!==String(t||"").trim()&&typeof o=="function",fr=()=>{$a&&o(ms)},br=async()=>{const s=ls,h=os,K=ja,le=is,se=String(ns??""),me=String(d?.role||"").toLowerCase(),je=me==="user"||me==="player"||me==="",fe="https://bettorplays247.com",Se=je?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${d?.username||""}`,`Password: ${se}`,`Min bet: ${jt(s)}`,`Max bet: ${jt(h)}`,`Credit: ${jt(K)}`,`Settle: +/- ${jt(le)}`,"",`Site: ${fe}`,"",Co]:[`Login: ${d?.username||""}`,`Password: ${se}`,`Min bet: ${jt(s)}`,`Max bet: ${jt(h)}`,`Credit: ${jt(K)}`,`Settle: +/- ${jt(le)}`,"",`Site: ${fe}`],Te=Se.join(`
`),_e=`<div style="font-family:sans-serif;white-space:pre-wrap;">${Se.map(Ze=>Ze===""?"<br>":Ze).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([Te],{type:"text/plain"}),"text/html":new Blob([_e],{type:"text/html"})})]):await navigator.clipboard.writeText(Te),ot("All details copied"),window.setTimeout(()=>ot(""),1400)}catch{ot("Copy failed"),window.setTimeout(()=>ot(""),1400)}},jr=async()=>{try{j(!0),g(""),u(""),et(null);const s=localStorage.getItem("token");if(!s){g("Please login again.");return}const h=Ot(n.firstName).trim(),K=Ot(n.lastName).trim(),le=Ms(n.phoneNumber).trim(),se=Be?"":Bs(h,K,le,d?.username||"");if(!Be&&(!h||!K||!le||!se)){g("First name, last name, and phone number are required to generate password.");return}const me={firstName:h,lastName:K,phoneNumber:le,fullName:`${h} ${K}`.trim(),password:se,allowDuplicateSave:!0,status:n.status,minBet:Number(n.minBet||0),creditLimit:Number(n.creditLimit||0),maxBet:Number(n.wagerLimit||0),wagerLimit:Number(n.wagerLimit||0),balanceOwed:Number(n.settleLimit||0),settings:{accountType:n.accountType,zeroBalanceWeekly:n.zeroBalanceWeekly,tempCredit:Number(n.tempCredit||0),expiresOn:n.expiresOn||"",enableCaptcha:!!n.enableCaptcha,cryptoPromoPct:Number(n.cryptoPromoPct||0),promoType:n.promoType,playerNotes:n.playerNotes,sports:!!n.sportsbook,casino:!!n.casino,racebook:!!n.horses,messaging:!!n.messaging,live:!!n.dynamicLive,props:!!n.propPlus,liveCasino:!!n.liveCasino}};me.apps={venmo:n.appsVenmo||"",cashapp:n.appsCashapp||"",applePay:n.appsApplePay||"",zelle:n.appsZelle||"",paypal:n.appsPaypal||"",btc:n.appsBtc||"",other:n.appsOther||""},["admin","super_agent","master_agent"].includes(m)&&n.agentId&&(me.agentId=n.agentId);let je=null;if(Be){const Te={firstName:h,lastName:K,fullName:`${h} ${K}`.trim(),phoneNumber:le,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0)};n.agentId&&(Te.parentAgentId=n.agentId),await ha(t,Te,s),je={}}else m==="agent"?je=await Bt(t,me,s):je=await Rt(t,me,s);const fe={...me};delete fe.allowDuplicateSave,k(Be?Te=>({...Te,firstName:fe.firstName,lastName:fe.lastName,fullName:fe.fullName,phoneNumber:fe.phoneNumber,status:fe.status,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0),minBet:Number(n.minBet||0),maxBet:Number(n.wagerLimit||0),creditLimit:Number(n.creditLimit||0),balanceOwed:Number(n.settleLimit||0),displayPassword:Te?.displayPassword||""}):Te=>({...Te,...fe,displayPassword:se||Te?.displayPassword||"",settings:{...Te?.settings||{},...fe.settings}}));const Se=je?.duplicateWarning;Se&&typeof Se=="object"?(et({message:Se.message||"Likely duplicate player detected.",matches:Array.isArray(Se.matches)?Se.matches:[]}),u("Changes saved with duplicate warning.")):u("Changes saved successfully.")}catch(s){console.error("Failed to save player details:",s);const h=Array.isArray(s?.duplicateMatches)?s.duplicateMatches:Array.isArray(s?.details?.matches)?s.details.matches:[];if(s?.isDuplicate===!0||s?.duplicate===!0||s?.code==="DUPLICATE_PLAYER"||s?.details?.duplicate===!0){et({message:s?.message||"Likely duplicate player detected.",matches:h}),g("");return}g(s.message||"Failed to save details")}finally{j(!1)}},yr=async()=>{try{const s=localStorage.getItem("token");if(!s||!d)return;await pa(t,{balance:we(d.balance,0)},s),u("Balance updated."),g("")}catch(s){g(s.message||"Failed to update balance")}},nn=s=>{if(!s)return"—";const h=s?.$date||s,K=new Date(h);return Number.isNaN(K.getTime())?"—":K.toLocaleString()},sa=s=>{s==="transactions"?(pe("transactions"),Pe("7d"),M("deposit_withdrawal"),he("all")):s==="pending"?(pe("transactions"),Pe("7d"),M("deposit_withdrawal"),he("pending")):s==="performance"?pe("performance"):s==="freeplays"?pe("freeplays"):s==="dynamic-live"?pe("dynamic-live"):s==="live-casino"?pe("live-casino"):s==="commission"?(pe("commission"),at||ss()):pe("basics"),l(!1),u(""),E(""),g(""),et(null),H(""),Ue(""),Le(""),yt(""),P(""),be(""),We(""),$e("")},_a=()=>{sa("transactions");const s=Be?aa:we(d?.balance,0),h=Be?s>0?"deposit":"withdrawal":s>0?"withdrawal":"deposit";i(h),oe(""),ke(""),Ge(!0),H(""),C(!0)},rn=!!p?.autoOpenDeposit,[ln,vr]=a.useState(!1);a.useEffect(()=>{!rn||ln||d?.id&&Be&&(_a(),vr(!0))},[rn,ln,d?.id,Be]);const Ra=a.useMemo(()=>Je.find(s=>s.key===Ke)||null,[Je,Ke]);a.useEffect(()=>{if(!Ra){F([]);return}F(Ra.wagers||[])},[Ra]);const Nr=a.useMemo(()=>c.reduce((s,h)=>s+Number(h.amount||0),0),[c]),wr=a.useMemo(()=>c.filter(s=>!s?.synthetic).length,[c]),ya=a.useMemo(()=>Be?aa:we(d?.balance,0),[Be,aa,d?.balance]),Oa=a.useMemo(()=>we(Be?d?.balance:Ht?.carry,0),[Be,d?.balance,Ht?.carry]),Sr=a.useMemo(()=>J.filter(s=>String(s.status||"").toLowerCase()==="pending").reduce((s,h)=>s+we(h.amount,0),0),[J]),na=tn,Ua=s=>{const h=we(s,0);return Number.isFinite(h)?Math.round(h*100)/100:0},on=s=>{const h=wt(s);return h==="neg"?"#dc2626":h==="pos"?"#16a34a":"#000000"},Wa=s=>{const h=wt(s);return h==="pos"?"neg":h==="neg"?"pos":"neutral"},kr=s=>Be?Wa(s):wt(s),ps=(s,h=Be)=>{const K=h?Wa(s):wt(s);return K==="neg"?"#dc2626":K==="pos"?"#16a34a":"#000000"},hs=Be?Dn:Ln,cn=hs.find(s=>s.value===ne)||hs[0],va=Number(W||0),dn=Number.isFinite(va)&&va>0,un=dn,za=a.useMemo(()=>Jn(d,va),[d,va]),Cr=Nt==="withdraw",xs=Number(Kt||0),mn=Number.isFinite(xs)&&xs>0,pn=mn,Na=async()=>{if(d?.username)try{xe(!0);const s=localStorage.getItem("token");if(!s)return;const h=await La({user:d.username,type:"all",status:"all",time:Dt,limit:300},s),K=Array.isArray(h?.transactions)?h.transactions:[];de(K.filter(le=>Ps(le,t,d.username,rs)&&_s(le)))}catch(s){Le(s.message||"Failed to refresh free play")}finally{xe(!1)}},Ar=(s,h="transaction")=>{const K=Number(s?.deleted||0),le=Number(s?.skipped||0),se=Number(s?.cascadeDeleted||0),je=(Array.isArray(s?.warnings)?s.warnings:[]).find(Se=>typeof Se?.message=="string"&&Se.message.trim()!=="");let fe=K>0?`Deleted ${K} ${h}(s).`:`No ${h}(s) were deleted.`;return se>0&&(fe+=` Linked free play deleted: ${se}.`),le>0&&(fe+=` Skipped ${le}.`),je&&(fe+=` ${je.message}`),K>0||se>0?fe+=" Balances and totals were updated.":fe+=" Balances and totals were not changed.",fe},Va=(s,h,K,le)=>{const se=Number(s?.deleted||0),me=Number(s?.cascadeDeleted||0),je=Ar(s,h);if(se>0||me>0){K(je),le("");return}K(""),le(je)},Pr=async()=>{try{const s=Number(Kt||0);if(s<=0||Number.isNaN(s)){Le("Enter a valid free play amount greater than 0.");return}const h=localStorage.getItem("token");if(!h||!d){Le("Please login again.");return}const K=we(d.freeplayBalance,0),le=Nt==="withdraw",se=await _n(t,{operationMode:"transaction",amount:s,direction:le?"debit":"credit",description:It.trim()},h),me=we(se?.user?.freeplayBalance,NaN),je=se?.user?.freeplayExpiresAt??null;k(Se=>Se&&{...Se,freeplayBalance:Number.isFinite(me)?me:Ua(K+(le?-s:s)),freeplayExpiresAt:je});const fe=le?"withdrawn":"added";It.trim()?yt(`Free play ${fe}. Note: "${It.trim()}"`):yt(`Free play ${fe} successfully.`),Le(""),Pt(!1),ut(!1),Zt(""),At(""),await Na()}catch(s){Le(s.message||"Failed to update free play")}},Lr=s=>{vt(h=>h.includes(s)?h.filter(K=>K!==s):[...h,s])},Dr=async()=>{try{if(Xe.length===0||!window.confirm(`Delete ${Xe.length} selected free play transaction(s)?`))return;const s=localStorage.getItem("token");if(!s){Le("Please login again.");return}const h=await Ya(Xe,s);vt([]),Va(h,"free play transaction",yt,Le),await Na(),await wa(),await Ha()}catch(s){Le(s.message||"Failed to delete free play transactions")}},Tr=async s=>{try{if(!s||!window.confirm("Delete this free play transaction?"))return;const h=localStorage.getItem("token");if(!h){Le("Please login again.");return}const K=await Ya([s],h);vt(le=>le.filter(se=>se!==s)),Va(K,"free play transaction",yt,Le),await Na(),await wa(),await Ha()}catch(h){Le(h.message||"Failed to delete free play transaction")}},Mr=async()=>{try{const s=localStorage.getItem("token");if(!s){Le("Please login again.");return}const h={settings:{freePlayPercent:Number(n.freePlayPercent||0),maxFpCredit:Number(n.maxFpCredit||0)}};m==="agent"?await Bt(t,h,s):await Rt(t,h,s),yt("Free play settings saved."),Le("")}catch(s){Le(s.message||"Failed to save free play settings")}},Br=async()=>{try{ea(!0);const s=localStorage.getItem("token");if(!s){P("Please login again.");return}const h={settings:{dynamicLiveLimits:{minStraightBet:Number(n.dlMinStraightBet||0),maxStraightBet:Number(n.dlMaxStraightBet||0),maxPerOffering:Number(n.dlMaxPerOffering||0),maxBetPerEvent:Number(n.dlMaxBetPerEvent||0),maxWinSingleBet:Number(n.dlMaxWinSingleBet||0),maxWinEvent:Number(n.dlMaxWinEvent||0),delaySec:Number(n.dlDelaySec||0),maxFavoriteLine:Number(n.dlMaxFavoriteLine||0),maxDogLine:Number(n.dlMaxDogLine||0),minParlayBet:Number(n.dlMinParlayBet||0),maxParlayBet:Number(n.dlMaxParlayBet||0),maxWinEventParlay:Number(n.dlMaxWinEventParlay||0),maxDogLineParlays:Number(n.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(n.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!n.dlLiveParlays,blockPriorStart:!!n.dlBlockPriorStart,blockHalftime:!!n.dlBlockHalftime,includeGradedInLimits:!!n.dlIncludeGradedInLimits,useRiskLimits:!!n.dlUseRiskLimits}}};m==="agent"?await Bt(t,h,s):await Rt(t,h,s),be("Dynamic Live settings saved."),P("")}catch(s){P(s.message||"Failed to save Dynamic Live settings")}finally{ea(!1)}},Ir=async()=>{try{De(!0);const s=localStorage.getItem("token");if(!s){We("Please login again.");return}const h={settings:{liveCasinoLimits:{default:{maxWinDay:Number(n.casinoDefaultMaxWinDay||0),maxLossDay:Number(n.casinoDefaultMaxLossDay||0),maxWinWeek:Number(n.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(n.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(n.casinoAgentMaxWinDay||0),maxLossDay:Number(n.casinoAgentMaxLossDay||0),maxWinWeek:Number(n.casinoAgentMaxWinWeek||0),maxLossWeek:Number(n.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(n.casinoPlayerMaxWinDay||0),maxLossDay:Number(n.casinoPlayerMaxLossDay||0),maxWinWeek:Number(n.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(n.casinoPlayerMaxLossWeek||0)}}}};m==="agent"?await Bt(t,h,s):await Rt(t,h,s),$e("Live Casino limits saved."),We("")}catch(s){We(s.message||"Failed to save Live Casino limits")}finally{De(!1)}},wa=async()=>{if(d){f(!0);try{const s=localStorage.getItem("token");if(!s){H("Please login to view transactions.");return}const h=await Ks(s);N(h)}catch(s){H(s.message||"Failed to refresh transactions")}finally{f(!1)}}},Ha=async()=>{try{const s=localStorage.getItem("token");if(!s)return;const h=await bs(t,s),K=h?.user;if(!K||typeof K!="object")return;const le=As(K),se=String(K?.role||"").toLowerCase(),je=se==="agent"||se==="master_agent"||se==="super_agent"?await Js(s,K.id||t):null;k(fe=>fe&&{...fe,balance:le.balance,pendingBalance:le.pendingBalance,freeplayBalance:le.freeplayBalance,lifetime:le.lifetime,lifetimePlusMinus:le.lifetimePlusMinus,balanceOwed:le.balanceOwed,creditLimit:le.creditLimit,updatedAt:le.updatedAt}),ta(je),h?.stats&&typeof h.stats=="object"&&B(h.stats),h?.referredBy!==void 0&&v(h.referredBy||null)}catch(s){console.warn("Failed to refresh customer financials after transaction update:",s)}},Er=async()=>{if(!it){qe(!0);try{const s=Number(W||0);if(s<=0||Number.isNaN(s)){H("Enter a valid amount greater than 0.");return}const h=localStorage.getItem("token");if(!h||!d){H("Please login again.");return}const K=Be?Dn:Ln,le=K.find(_e=>_e.value===ne)||K[0],se=we(d.balance,0),me=Ua(se+(le.balanceDirection==="credit"?s:-s)),je=ge.trim();let fe;Be?fe=await al(t,{amount:s,direction:le.balanceDirection,type:le.apiType,description:je||le.defaultDescription},h):fe=await pa(t,{operationMode:"transaction",amount:s,direction:le.balanceDirection,type:le.apiType,reason:le.reason,description:je||le.defaultDescription,applyDepositFreeplayBonus:ye},h);const Se=Be?0:we(fe?.freeplayBonus?.amount,0),Te=Be?0:we(fe?.referralBonus?.amount,0);k(_e=>{if(!_e)return _e;const Ze=Be?we(fe?.agent?.balance,NaN):we(fe?.user?.balance,NaN),Ft=Number.isFinite(Ze)?Ze:me,st=we(fe?.user?.freeplayBalance,NaN),ca=Number.isFinite(st)?st:we(_e.freeplayBalance,0),Yt=fe?.user?.lifetimePlusMinus??fe?.user?.lifetime??_e.lifetimePlusMinus??_e.lifetime??0,Gt=we(Yt,NaN),Mt=Number.isFinite(Gt)?Gt:we(_e.lifetimePlusMinus??_e.lifetime,0);return{..._e,balance:Ft,freeplayBalance:ca,lifetime:Mt,lifetimePlusMinus:Mt}});const ze=["Transaction saved and balance updated."];Se>0&&ze.push(`Auto free play bonus added: ${Ye(Se)}.`),Te>0&&ze.push(`Referral bonus granted: ${Ye(Te)}.`),E(ze.join(" ")),H(""),C(!1),Ve(!1),i("deposit"),oe(""),ke(""),Ge(!0),await wa()}catch(s){H(s.message||"Failed to save transaction")}finally{qe(!1)}}},Fr=s=>{re(h=>h.includes(s)?h.filter(K=>K!==s):[...h,s])},$r=async()=>{try{if(ae.length===0||!window.confirm(`Delete ${ae.length} selected transaction(s)?`))return;const s=localStorage.getItem("token");if(!s){H("Please login again.");return}const h=await Ya(ae,s);re([]),await wa(),await Na(),await Ha(),Va(h,"transaction",E,H)}catch(s){H(s.message||"Failed to delete selected transactions")}},_r=async s=>{try{if(!s||!window.confirm("Delete this transaction?"))return;const h=localStorage.getItem("token");if(!h){H("Please login again.");return}const K=await Ya([s],h);re(le=>le.filter(se=>se!==s)),await wa(),await Na(),await Ha(),Va(K,"transaction",E,H)}catch(h){H(h.message||"Failed to delete transaction")}};return x?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):d?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:Be?(()=>{const s=String(d.username||"").toUpperCase(),h=s+"MA";return b?.find(le=>String(le.username||"").toUpperCase()===h)?`${s} (${h})`:s})():d.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:hr})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:d.username||""})]}),Be?e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="commission"?" detail-metric-active":""}`,onClick:()=>sa("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(d?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:d?.agentPercent!=null?`${d.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="transactions"?" detail-metric-active":""}`,onClick:_a,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${wt(Vt)}`,children:Ye(Vt)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:ns})]}),Be?(()=>{const s=d?.agentPercent!=null?parseFloat(d.agentPercent):null,h=d?.hiringAgentPercent!=null?parseFloat(d.hiringAgentPercent):null,K=5,le=h!=null&&s!=null?h-s:null,se=h==null||le===0,me=!se&&h!=null?100-K-h:null,je=me!=null&&me>0,fe=!se&&le>0,Se=[];return fe&&Se.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[le,"%"]})]},"hiring")),je&&Se.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[me,"%"]})]},"upline")),Se.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),Se.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="commission"?" detail-metric-active":""}`,onClick:()=>sa("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:d?.playerRate!=null?`$${d.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[Se[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:jt(ls)})]}),Se[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:jt(os)})]}),Se[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:jt(ja)})]}),Se[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",jt(is)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="transactions"&&Z==="pending"?" detail-metric-active":""}`,onClick:()=>sa("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(ba)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:jt(ls)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(ds)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:jt(os)})]}),!Be&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="freeplays"?" detail-metric-active":""}`,onClick:()=>sa("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(tn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:jt(ja)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="performance"?" detail-metric-active":""}`,onClick:()=>sa("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${wt(an)}`,children:Ye(an)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",jt(is)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${$a?"detail-link-item":""}`,onClick:fr,disabled:!$a,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${$a?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:gr})]})]}),Be?e.jsxs("button",{type:"button",className:`detail-item detail-metric${Y==="transactions"?" detail-metric-active":""}`,onClick:_a,children:[e.jsx("span",{className:"detail-label",children:cs}),e.jsx("strong",{className:`detail-value ${kr(aa)}`,children:Ye(aa)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:br,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:xr,disabled:gt,children:gt?"Logging in...":"Login User"})]})]})]}),pt&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:pt}),Ie&&e.jsx("div",{className:"copy-notice",children:Ie})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>l(s=>!s),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:Y==="transactions"?"Transactions":Y==="performance"?"Performance":Y==="freeplays"?"Free Play":Y==="dynamic-live"?"Dynamic Live":Y==="live-casino"?"Live Casino":Y==="commission"?"Commission Tree":"The Basics"})]}),Y==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:_a,children:"New transaction"}):Y==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{Tt("withdraw"),Le(""),Pt(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{Tt("deposit"),Le(""),Pt(!0)},children:"Add Free Play"})]}):Y==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:Br,disabled:Xt,children:Xt?"Saving...":"Save"}):Y==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:Ir,disabled:V,children:V?"Saving...":"Save"}):Y==="commission"?e.jsx("button",{className:"btn btn-back",onClick:ss,disabled:oa,children:oa?"Loading...":"Refresh"}):Y==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:jr,disabled:L,children:L?"Saving...":"Save"})]}),D&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>l(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>l(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:rr.map(s=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>sa(s.id),children:[e.jsx("span",{className:"menu-icon",children:s.icon}),e.jsx("span",{className:"menu-label",children:s.label})]},s.id))})]})]}),Y==="transactions"?O&&e.jsx("div",{className:"alert error",children:O}):Y==="performance"?nt&&e.jsx("div",{className:"alert error",children:nt}):Y==="freeplays"?ve&&e.jsx("div",{className:"alert error",children:ve}):Y==="dynamic-live"?Et&&e.jsx("div",{className:"alert error",children:Et}):Y==="live-casino"?Me&&e.jsx("div",{className:"alert error",children:Me}):U&&e.jsx("div",{className:"alert error",children:U}),Y==="transactions"?_&&e.jsx("div",{className:"alert success",children:_}):Y==="freeplays"?He&&e.jsx("div",{className:"alert success",children:He}):Y==="dynamic-live"?T&&e.jsx("div",{className:"alert success",children:T}):Y==="live-casino"?Ce&&e.jsx("div",{className:"alert success",children:Ce}):w&&e.jsx("div",{className:"alert success",children:w}),Y==="basics"&&Ct&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:Ct.message}),Array.isArray(Ct.matches)&&Ct.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:Ct.matches.map((s,h)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(s.username||"UNKNOWN")}),e.jsx("span",{children:String(s.fullName||"No name")}),e.jsx("span",{children:String(s.phoneNumber||"No phone")})]},`${s.id||s.username||"duplicate"}-${h}`))})]}),Y==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const s=(se,me)=>{tt(se),zt(me!=null?String(me):"")},h=()=>{tt(null),zt("")},K=async()=>{const se=localStorage.getItem("token");if(!(!se||!Ee))try{A(!0);const me={};if(Ee==="agentPercent"){const fe=parseFloat(bt);if(isNaN(fe)||fe<0||fe>100){X("Must be 0-100");return}me.agentPercent=fe}else if(Ee==="playerRate"){const fe=parseFloat(bt);if(isNaN(fe)||fe<0){X("Must be a positive number");return}me.playerRate=fe}await ha(t,me,se),X(""),ue("Saved"),h();const je=await bs(t,se);je?.user&&k(As(je.user)),Lt(null),setTimeout(()=>ue(""),2e3)}catch(me){X(me.message||"Save failed")}finally{A(!1)}},le=[{key:"agentPercent",label:"Agent %",value:d?.agentPercent,display:d?.agentPercent!=null?`${d.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:d?.playerRate,display:d?.playerRate!=null?`$${d.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[le.map(se=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:se.label}),Ee===se.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:se.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:bt,onChange:me=>zt(me.target.value),autoFocus:!0,onKeyDown:me=>{me.key==="Enter"&&K(),me.key==="Escape"&&h()}}),e.jsx("button",{className:"commission-inline-save",onClick:K,disabled:q,children:q?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:h,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>se.editable&&s(se.key,se.value),children:[se.display,se.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},se.key)),te&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:te}),ce&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:ce})]})})()]}),oa&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),Ta&&e.jsx("div",{className:"alert error",children:Ta}),at&&!oa&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${at.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:at.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[at.chainTotal,"%"]}),at.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:or,style:{marginLeft:12},children:"Re-validate"})]}),Fa&&e.jsx("div",{className:`commission-validity-banner ${Fa.isValid?"valid":"invalid"}`,style:{marginTop:4},children:Fa.isValid?"Validation passed":Fa.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[at.upline.find(s=>s.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",at.upline.find(s=>s.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...at.upline].filter((s,h)=>h>0&&s.role!=="admin").reverse().map((s,h,K)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:h===K.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",s.isSharedNode&&s.linkedUsername?`${s.username}/${s.linkedUsername}`:s.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${s.effectivePercent==null&&s.agentPercent==null?"unset":""}`,children:s.effectivePercent!=null?`(${s.effectivePercent}%)`:s.agentPercent!=null?`(${s.agentPercent}%)`:"(not set)"}),h===K.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:Ia,onChange:le=>ir(le.target.value),disabled:q,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),b.filter(le=>{const se=String(le.role||"").toLowerCase();return se==="master_agent"||se==="super_agent"}).map(le=>{const se=le.id;return e.jsx("option",{value:se,children:String(le.username||"").toUpperCase()},se)})]})]},s.id||h)),at.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",at.upline[0].isSharedNode&&at.upline[0].linkedUsername?`${at.upline[0].username}/${at.upline[0].linkedUsername}`:at.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${at.upline[0].agentPercent==null?"unset":""}`,children:at.upline[0].agentPercent!=null?`(${at.upline[0].agentPercent}%)`:"(not set)"})]}),at.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),at.downlines.map((s,h)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",h+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",s.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${s.agentPercent==null?"unset":""}`,children:s.agentPercent!=null?`(${s.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${s.status==="active"?"active":"inactive"}`,children:s.status||""})]},s.id||h)),at.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:Hs,onChange:s=>{nr(s.target.value),as(null),Ea("")}}),e.jsx("button",{className:"btn btn-back",onClick:lr,disabled:Ys,children:Ys?"Calculating...":"Calculate"})]}),qs&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:qs}),fa&&e.jsxs("div",{className:"calc-result",children:[!fa.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",fa.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[fa.distributions.map((s,h)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:s.isSharedNode&&s.linkedUsername?`${s.username}/${s.linkedUsername}`:s.username||"—"}),e.jsx("td",{children:s.role?s.role.replace(/_/g," "):"—"}),e.jsx("td",{children:s.effectivePercent!=null?`${s.effectivePercent}%`:s.agentPercent!=null?`${s.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Number(s.amount||0).toFixed(2)]})]},s.id||h)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",fa.distributions.reduce((s,h)=>s+Number(h.amount||0),0).toFixed(2)]})})]})]})]})]})]})]})]}),Y==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:ie,onChange:s=>Pe(s.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:z,onChange:s=>M(s.target.value),children:bo.map(s=>e.jsx("option",{value:s.value,children:s.label},s.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Ye(Ht.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Be?"Funding Wallet":"Available"}),e.jsx("b",{children:Ye(Ht.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Be?"House Money":"Carry"}),e.jsx("b",{className:Be?Wa(Ht.carry):Ht.carry<0?"neg":"",children:Ye(Ht.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:Ye(Ht.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:ee?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):G.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):G.map(s=>{const h=Qn(s),K=we(s.amount,0),le=h?0:K,se=h?K:0,me=s.balanceAfter,je=Rs(s),fe=Bn(s),Se=In(s),Te=ae.includes(s.id);return e.jsxs("tr",{className:Te?"selected":"",onClick:()=>Fr(s.id),children:[e.jsx("td",{children:nn(s.date)}),e.jsx("td",{children:je}),e.jsx("td",{children:fe}),e.jsx("td",{children:le>0?Ye(le):"—"}),e.jsx("td",{children:se>0?Ye(se):"—"}),e.jsx("td",{className:wt(me),children:me!=null?Ye(me):"—"}),e.jsx("td",{children:Se}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:ze=>{ze.stopPropagation(),_r(s.id)},children:"Delete"})})]},s.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:$r,disabled:ae.length===0,children:"Delete Selected"})]}):Y==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:Qe,onChange:s=>Fe(s.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:dt?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):Je.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):Je.map(s=>e.jsxs("tr",{className:Ke===s.key?"selected":"",onClick:()=>St(s.key),children:[e.jsx("td",{children:s.periodLabel}),e.jsx("td",{children:Math.round(Number(s.net||0))})]},s.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:wr})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:Ye(Nr)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:Ra?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:c.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):c.map(s=>e.jsxs("tr",{className:s?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:s.label||"Wager"}),e.jsx("td",{children:Math.round(Number(s.amount||0))})]},s.id))})]})]})]})]}):Y==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Dt,onChange:s=>kt(s.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.round(Number(na))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.round(Number(Sr))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Ne?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):J.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):J.map(s=>{const h=we(s.amount,0),K=we(s.balanceBefore,0),se=we(s.balanceAfter??na,0)>=K,me=se?h:0,je=se?0:h,fe=we(s?.balanceAfter??na,0),Se=Rs(s),Te=Bn(s),ze=In(s),_e=Xe.includes(s.id);return e.jsxs("tr",{className:_e?"selected":"",onClick:()=>Lr(s.id),children:[e.jsx("td",{children:d.username}),e.jsx("td",{children:nn(s.date)}),e.jsx("td",{children:Se}),e.jsx("td",{children:Te}),e.jsx("td",{children:me>0?Math.round(me):"—"}),e.jsx("td",{children:je>0?Math.round(je):"—"}),e.jsx("td",{children:Math.round(fe)}),e.jsx("td",{children:ze}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:Ze=>{Ze.stopPropagation(),Tr(s.id)},children:"Delete"})})]},s.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:Dr,disabled:Xe.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:Mr,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:n.freePlayPercent,onChange:s=>Ae("freePlayPercent",s.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:n.maxFpCredit,onChange:s=>Ae("maxFpCredit",s.target.value)})]})]})]})]}):Y==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMinStraightBet,onChange:s=>Ae("dlMinStraightBet",s.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxStraightBet,onChange:s=>Ae("dlMaxStraightBet",s.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:n.dlMaxPerOffering,onChange:s=>Ae("dlMaxPerOffering",s.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:n.dlMaxBetPerEvent,onChange:s=>Ae("dlMaxBetPerEvent",s.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxWinSingleBet,onChange:s=>Ae("dlMaxWinSingleBet",s.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEvent,onChange:s=>Ae("dlMaxWinEvent",s.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:n.dlDelaySec,onChange:s=>Ae("dlDelaySec",s.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:n.dlMaxFavoriteLine,onChange:s=>Ae("dlMaxFavoriteLine",s.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLine,onChange:s=>Ae("dlMaxDogLine",s.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMinParlayBet,onChange:s=>Ae("dlMinParlayBet",s.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxParlayBet,onChange:s=>Ae("dlMaxParlayBet",s.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEventParlay,onChange:s=>Ae("dlMaxWinEventParlay",s.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLineParlays,onChange:s=>Ae("dlMaxDogLineParlays",s.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:n.dlWagerCoolOffSec,onChange:s=>Ae("dlWagerCoolOffSec",s.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([s,h])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[s," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[h],onChange:K=>Ae(h,K.target.checked)}),e.jsx("span",{className:"slider"})]})]},h))})]})]}):Y==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinDay,onChange:s=>Ae("casinoDefaultMaxWinDay",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinDay,onChange:s=>Ae("casinoAgentMaxWinDay",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinDay,onChange:s=>Ae("casinoPlayerMaxWinDay",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossDay,onChange:s=>Ae("casinoDefaultMaxLossDay",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossDay,onChange:s=>Ae("casinoAgentMaxLossDay",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossDay,onChange:s=>Ae("casinoPlayerMaxLossDay",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinWeek,onChange:s=>Ae("casinoDefaultMaxWinWeek",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinWeek,onChange:s=>Ae("casinoAgentMaxWinWeek",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinWeek,onChange:s=>Ae("casinoPlayerMaxWinWeek",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossWeek,onChange:s=>Ae("casinoDefaultMaxLossWeek",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossWeek,onChange:s=>Ae("casinoAgentMaxLossWeek",s.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossWeek,onChange:s=>Ae("casinoPlayerMaxLossWeek",s.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:n.firstName,placeholder:"Enter first name",onChange:s=>cr(s.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:n.lastName,placeholder:"Enter last name",onChange:s=>dr(s.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:n.phoneNumber,placeholder:"Enter phone number",onChange:s=>ur(s.target.value),className:mr?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:ns,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${pr?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(m)?e.jsxs("select",{value:n.agentId,onChange:s=>Ae("agentId",s.target.value),children:[e.jsx("option",{value:"",children:"None"}),b.filter(s=>{const h=String(s.role||"").toLowerCase();return h==="master_agent"||h==="super_agent"}).map(s=>{const h=s.id;return e.jsx("option",{value:h,children:s.username},h)})]}):e.jsx("input",{value:d.masterAgentUsername||d.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:n.status,onChange:s=>Ae("status",s.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([s,h])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:s}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[h],onChange:K=>Ae(h,K.target.checked)}),e.jsx("span",{className:"slider"})]})]},h))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:n.accountType,onChange:s=>Ae("accountType",s.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:n.minBet,onChange:s=>Ae("minBet",s.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:n.wagerLimit,onChange:s=>Ae("wagerLimit",s.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:n.creditLimit,onChange:s=>Ae("creditLimit",s.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:n.settleLimit,onChange:s=>Ae("settleLimit",s.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:n.zeroBalanceWeekly,onChange:s=>Ae("zeroBalanceWeekly",s.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:n.tempCredit,onChange:s=>Ae("tempCredit",s.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:n.enableCaptcha,onChange:s=>Ae("enableCaptcha",s.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:n.cryptoPromoPct,onChange:s=>Ae("cryptoPromoPct",s.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:n.promoType,onChange:s=>Ae("promoType",s.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:n.expiresOn,onChange:s=>Ae("expiresOn",s.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:n.playerNotes,onChange:s=>Ae("playerNotes",s.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:d.balance??0,onChange:s=>k(h=>({...h,balance:Number(s.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:yr,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:n.appsVenmo,onChange:s=>Ae("appsVenmo",s.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:n.appsCashapp,onChange:s=>Ae("appsCashapp",s.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:n.appsApplePay,onChange:s=>Ae("appsApplePay",s.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:n.appsZelle,onChange:s=>Ae("appsZelle",s.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:n.appsPaypal,onChange:s=>Ae("appsPaypal",s.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:n.appsBtc,onChange:s=>Ae("appsBtc",s.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:n.appsOther,onChange:s=>Ae("appsOther",s.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",Ye(Q.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:wt(Q.netProfit||0),children:Ye(Q.netProfit||0)})]})]})]}),Re&&e.jsx("div",{className:"modal-overlay",onClick:()=>{C(!1),Ve(!1),Ge(!0)},children:e.jsx("div",{className:"modal-card",onClick:s=>s.stopPropagation(),children:Oe?(()=>{const s=va,h=cn,K=ya,le=Ua(K+(h.balanceDirection==="credit"?s:-s)),se=h.balanceDirection==="debit",me=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),je=Be?cs:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:me})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",je]}),e.jsx("span",{style:{color:ps(K)},children:Ye(K)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[h.label," :"]}),e.jsxs("span",{style:{color:ps(le)},children:[se?"-":"",Ye(s)]})]}),h.value==="deposit"&&!Be&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:ye?"#166534":"#6b7280"},children:ye?`${za.percent}% (${Ye(za.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",je]}),e.jsx("span",{style:{color:ps(le)},children:Ye(le)})]})]}),O&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:O}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Ve(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!un||it,onClick:Er,children:it?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:ne,onChange:s=>{i(s.target.value),s.target.value==="deposit"&&Ge(!0),H("")},children:hs.map(s=>e.jsx("option",{value:s.value,children:s.label},s.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:W,onChange:s=>{oe(s.target.value===""?"":String(Math.round(Number(s.target.value)))),H("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Be?cs:"Current Balance"}),e.jsx("b",{className:Be?Wa(ya):wt(ya),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>oe(us(ya)),children:Ye(ya)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Be?"Funding Wallet":"Carry"}),e.jsx("b",{className:wt(Oa),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>oe(us(Oa)),children:Ye(Oa)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:ge,onChange:s=>ke(s.target.value),placeholder:"Optional note"}),cn.value==="deposit"&&!Be&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:ye,onChange:s=>Ge(s.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${za.percent}% Freeplay (${Ye(za.bonusAmount)})`})]}),O&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:O}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{C(!1),Ge(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!un,onClick:()=>{if(!dn){H("Enter a valid amount greater than 0.");return}H(""),Ve(!0)},children:"Next"})]})]})})}),_t&&e.jsx("div",{className:"modal-overlay",onClick:()=>{Pt(!1),ut(!1)},children:e.jsx("div",{className:"modal-card",onClick:s=>s.stopPropagation(),children:xt?(()=>{const s=xs,h=Cr,K=na,le=Ua(K+(h?-s:s)),se=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:se})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:on(K)},children:Ye(K)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[h?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:h?"#dc2626":"#1f2937"},children:[h?"-":"",Ye(s)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:on(le)},children:Ye(le)})]})]}),ve&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ve}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>ut(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!pn,onClick:Pr,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:Nt==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:Nt==="withdraw"?"#fee2e2":void 0,color:Nt==="withdraw"?"#dc2626":void 0},children:Nt==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:Kt,onChange:s=>{Zt(s.target.value===""?"":String(Math.round(Number(s.target.value)))),Le("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:wt(na),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>Zt(us(na)),children:Ye(na)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:It,onChange:s=>At(s.target.value),placeholder:"Optional note"}),ve&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ve}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Pt(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!pn,onClick:()=>{if(!mn){Le("Enter a valid free play amount greater than 0.");return}Le(""),ut(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
        .customer-details-v2 { background:#f3f4f6; min-height:100vh; padding:10px; color:#1f2937; }
        .top-panel {
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
        }
        .top-left h2 { margin:0; font-size:22px; line-height:1.05; font-weight: 700; letter-spacing: 0.15px; }
        .agent-line { margin-top:3px; color:#4b5563; font-size:12px; }
        .top-actions { display:flex; gap:8px; flex-wrap: wrap; justify-content: flex-end; }

        .btn { border:none; border-radius:3px; cursor:pointer; font-weight:600; }
        .btn-back { background:#3db3d7; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-user { background:#2f7fb6; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-copy-all { background:#139cc9; color:#fff; padding:7px 12px; font-size:13px; }
        .btn-save { background:#35b49f; color:#fff; padding:8px 16px; min-width:108px; font-size:13px; }

        .player-card {
          border: 1px solid #d6e2f3;
          border-radius: 10px;
          padding: 10px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          max-width: 100%;
          box-shadow: inset 0 0 0 1px rgba(225, 236, 247, 0.7);
        }
        .player-card-head {
          margin-bottom: 9px;
        }
        .player-title-wrap {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .player-title-main {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .player-kicker {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: #5e7a95;
          text-transform: uppercase;
        }
        .player-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          white-space: nowrap;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid #8cb4df;
          background: #edf5ff;
          color: #245d98;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 7px;
        }
        .paired-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }
        .detail-metric {
          align-items: flex-end;
          text-align: right;
        }
        button.detail-item {
          cursor: pointer;
          font-family: inherit;
          text-align: right;
          border: 1px solid #dde7f2;
        }
        button.detail-item:disabled {
          cursor: default;
        }
        button.detail-item:hover {
          background: #eef5ff;
          border-color: #a8c9e8;
        }
        button.detail-item:disabled:hover {
          background: #f8fbff;
          border-color: #dde7f2;
        }
        .detail-metric-active {
          background: #deeeff !important;
          border-color: #4f9bce !important;
        }
        .detail-link-item {
          align-items: flex-start;
          text-align: left;
        }
        .detail-link-value {
          color: #1d4ed8;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .detail-empty {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          pointer-events: none;
        }
        .detail-value.pos { color: #16a34a; }
        .detail-value.neg { color: #dc2626; }
        .detail-value.neutral { color: #000000; }
        .detail-item {
          border: 1px solid #dde7f2;
          background: #f8fbff;
          border-radius: 8px;
          padding: 8px 9px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .detail-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: #607992;
        }
        .detail-value {
          margin: 0;
          font-size: 14px;
          line-height: 1.2;
          color: #1f2937;
          font-weight: 600;
        }
        .detail-secret {
          letter-spacing: 0.35px;
          font-weight: 600;
        }
        .player-card-foot {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e3ecf5;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
        }
        .details-domain {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .domain-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.65px;
          color: #607992;
          text-transform: uppercase;
        }
        .details-domain strong {
          font-size: 14px;
          line-height: 1.1;
          font-weight: 600;
          color: #1f2937;
        }
        .creds-box {
          border: 1px solid #d6e2f3;
          border-radius: 4px;
          padding: 10px;
          background: #fff;
        }
        .creds-row {
          display: grid;
          grid-template-columns: 120px 160px 32px;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .creds-row:last-child { margin-bottom: 0; }
        .creds-row span {
          font-size: 14px;
          font-weight: 700;
          color: #64748b;
        }
        .creds-pill {
          border: none;
          background: transparent;
          border-radius: 0;
          padding: 0;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          line-height: 1.1;
        }
        .creds-pill-password {
          color: #020617;
          font-weight: 300;
        }
        .copy-mini {
          border: none;
          background: transparent;
          color: #5b93ed;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
        }
        .limits-box {
          margin-top: 12px;
          border: 1px solid #d6e2f3;
          border-radius: 4px;
          padding: 12px;
          background: #fff;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px 28px;
        }
        .limit-item label {
          display: block;
          margin: 0 0 4px;
          text-transform: uppercase;
          color: #8aa0bc;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .limit-item strong {
          color: #1e293b;
          font-size: 16px;
          line-height: 1;
        }
        .limit-item .money-green {
          color: #08916a;
        }
        .copy-notice {
          margin-top: 8px;
          color: #1f5fb9;
          font-size: 12px;
          font-weight: 700;
        }
        .mobile-only { display: none; }

        .top-right {
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid #d6e2ec;
          border-radius: 10px;
          padding: 8px;
          background: linear-gradient(180deg, #f8fbff 0%, #f4f8fc 100%);
        }
        .summary-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.7px;
          color: #5e7690;
          text-transform: uppercase;
          padding: 0 2px 2px;
        }
        .metric {
          border: 1px solid #d6e3ef;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          padding: 7px 9px;
          border-radius: 8px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 48px;
        }
        .metric:hover { border-color: #9ec0df; box-shadow: 0 2px 10px rgba(14, 75, 128, 0.12); }
        .metric.metric-active {
          border-color: #4f86bc;
          box-shadow: 0 0 0 2px rgba(79, 134, 188, 0.18);
          transform: translateY(-1px);
        }
        .metric.metric-static {
          cursor: default;
        }
        .metric span {
          display:block;
          font-size:10px;
          color:#4a6279;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .metric b {
          font-size:18px;
          line-height:1;
          font-weight:700;
          font-variant-numeric: tabular-nums;
        }
        .metric .neg { color:#dc2626; }
        .metric .pos { color:#15803d; }
        .metric .neutral { color:#000000; }
        .metric-circle { background: transparent; border: none; border-radius: 0; padding: 0; margin-top: 0; }

        .basics-header { margin-top:8px; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; }
        .basics-left { display:flex; align-items:center; gap:10px; }
        .basics-left h3 { margin:0; font-size:16px; line-height:1.1; font-weight:700; }
        .dot-grid { width:20px; display:grid; grid-template-columns:repeat(3, 4px); gap:3px; }
        .dot-grid span { width:4px; height:4px; background:#4b5563; border-radius:50%; display:block; }
        .dot-grid-btn {
          border: none;
          background: transparent;
          padding: 2px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .dot-grid-btn:hover { background: #e5e7eb; }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          border: none;
          background: rgba(15, 23, 42, 0.15);
        }
        .basics-quick-menu {
          position: absolute;
          z-index: 50;
          left: 24px;
          top: 245px;
          width: 280px;
          height: 280px;
          max-width: calc(100vw - 48px);
          background: #ffffff;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.2);
          padding: 8px 7px 8px;
          overflow: hidden;
        }
        .menu-close {
          border: none;
          background: #374151;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          cursor: pointer;
          margin-left: auto;
          display: block;
          font-weight: 700;
        }
        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px 8px;
          padding: 8px 2px 2px;
          height: 232px;
          overflow-y: auto;
        }
        .menu-item {
          border: none;
          background: transparent;
          text-align: center;
          cursor: pointer;
          padding: 4px;
          color: #1f2937;
        }
        .menu-item:hover .menu-icon {
          transform: translateY(-1px);
        }
        .menu-icon {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          margin: 0 auto 6px;
          display: grid;
          place-items: center;
          font-size: 20px;
          line-height: 1;
          color: #1f2937;
          background: #f3f4f6;
          transition: transform 0.15s ease;
        }
        .menu-item:nth-child(1) .menu-icon { color:#ef4444; }
        .menu-item:nth-child(2) .menu-icon { color:#65a30d; }
        .menu-item:nth-child(3) .menu-icon { color:#3b82f6; }
        .menu-item:nth-child(4) .menu-icon { color:#a16207; }
        .menu-item:nth-child(5) .menu-icon { color:#0d9488; }
        .menu-item:nth-child(6) .menu-icon { color:#f97316; }
        .menu-item:nth-child(7) .menu-icon { color:#111827; }
        .menu-item:nth-child(8) .menu-icon { color:#1d4ed8; }
        .menu-item:nth-child(9) .menu-icon { color:#4b5563; }
        .menu-item:nth-child(10) .menu-icon { color:#0ea5e9; }
        .menu-item:nth-child(11) .menu-icon { color:#4f46e5; }
        .menu-item:nth-child(12) .menu-icon { color:#b91c1c; }
        .menu-item:nth-child(13) .menu-icon { color:#60a5fa; }
        .menu-item:nth-child(14) .menu-icon { color:#6b7280; }
        .menu-item:nth-child(15) .menu-icon { color:#84a34a; }
        .menu-item:nth-child(16) .menu-icon { color:#c084fc; }
        .menu-item:nth-child(17) .menu-icon { color:#d97706; }
        .menu-item:nth-child(18) .menu-icon { color:#16a34a; }
        .menu-label {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .alert { margin-top:8px; padding:8px 10px; border-radius:3px; font-size: 12px; }
        .alert.error { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
        .alert.success { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }
        .duplicate-warning-state {
          border: 1px solid #f1d178;
          border-radius: 10px;
          background: #fff8dd;
          color: #6b4e00;
          padding: 12px;
          margin-top: 8px;
        }
        .duplicate-warning-title {
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 4px;
        }
        .duplicate-warning-message {
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 8px;
        }
        .duplicate-warning-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .duplicate-warning-item {
          display: grid;
          grid-template-columns: minmax(78px, auto) 1fr;
          gap: 2px 10px;
          border: 1px solid #ecd28b;
          border-radius: 8px;
          background: #fffdf2;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.25;
        }
        .duplicate-warning-item strong {
          color: #4f3200;
        }
        .duplicate-warning-item span:last-child {
          color: #6f5400;
        }

        .transactions-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
        }
        .tx-controls {
          display: grid;
          grid-template-columns: 1.2fr 1.2fr repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 9px;
        }
        .tx-field label, .tx-stat label {
          display: block;
          color: #4b5563;
          font-size: 11px;
          margin-bottom: 2px;
        }
        .tx-field select {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          padding: 3px 0;
          color: #111827;
          outline: none;
        }
        .tx-field input {
          width: 100%;
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          padding: 3px 0;
          color: #111827;
          outline: none;
        }
        .tx-stat b {
          display: block;
          font-size: 15px;
          line-height: 1.05;
          font-weight: 600;
          color: #111827;
        }
        .tx-stat .neg { color: #dc2626; }
        .tx-table-wrap {
          border: 1px solid #cbd5e1;
          min-height: 250px;
          overflow: auto;
          background: #fff;
        }
        .tx-table {
          width: 100%;
          border-collapse: collapse;
        }
        .tx-table th {
          background: #1f3345;
          color: #fff;
          text-align: left;
          font-size: 13px;
          padding: 8px 10px;
          position: sticky;
          top: 0;
        }
        .tx-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px 10px;
          font-size: 12px;
          color: #1f2937;
        }
        .tx-actions-col {
          width: 96px;
          min-width: 96px;
          text-align: center;
          white-space: nowrap;
        }
        .tx-table th.tx-actions-col,
        .tx-table td.tx-actions-col {
          text-align: center;
          padding-left: 6px;
          padding-right: 6px;
        }
        .tx-row-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 26px;
          padding: 6px 10px;
          border: 1px solid #f5c2ca;
          border-radius: 999px;
          background: #fff5f6;
          color: #b42333;
          font-size: 11px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }
        .tx-row-delete:hover {
          background: #ffe9ed;
          border-color: #ed9daa;
          color: #9f1f2f;
        }
        .tx-row-delete:focus-visible {
          outline: 2px solid #d9465a;
          outline-offset: 1px;
        }
        .tx-row-delete:active {
          transform: translateY(1px);
        }
        .tx-row-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .tx-table tr.selected td { background: #eff6ff; }
        .tx-table tr { cursor: pointer; }
        .tx-empty {
          text-align: center;
          padding: 24px !important;
          color: #6b7280 !important;
        }
        .btn-danger {
          margin-top: 10px;
          background: #dc3f51;
          color: #fff;
          padding: 8px 18px;
          font-size: 13px;
        }
        .btn-danger:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }
        .freeplay-controls {
          grid-template-columns: 1.2fr 1fr 1fr;
        }
        .freeplay-bottom-row {
          margin-top: 10px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: end;
          gap: 12px;
        }
        .freeplay-settings-btn {
          justify-self: center;
          min-width: 320px;
          text-align: center;
        }
        .freeplay-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          min-width: 360px;
        }

        .performance-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
        }
        .perf-controls {
          display: grid;
          grid-template-columns: 220px;
          gap: 10px;
          margin-bottom: 8px;
        }
        .performance-grid {
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 12px;
          min-height: 320px;
        }
        .perf-left {
          border: 1px solid #cbd5e1;
          max-height: 320px;
          overflow-y: auto;
        }
        .perf-right {
          border: 1px solid #cbd5e1;
          padding: 0;
        }
        .perf-title-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          line-height: 1;
          padding: 8px 0 8px 0;
        }
        .perf-title-row b { font-size: 18px; font-weight: 700; }
        .perf-table {
          width: 100%;
          border-collapse: collapse;
        }
        .perf-table th {
          background: #1f3345;
          color: #fff;
          text-align: left;
          font-size: 12px;
          padding: 8px 10px;
          position: sticky;
          top: 0;
        }
        .perf-table td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px 9px;
          font-size: 12px;
          color: #1f2937;
        }
        .perf-table tr.selected td { background: #f1f5f9; }
        .perf-table tr.perf-synthetic td {
          background: #fff7ed;
          color: #7c2d12;
          font-weight: 600;
        }

        .dynamic-live-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px;
        }
        .dl-top-select {
          width: 190px;
          margin-bottom: 8px;
        }
        .dynamic-live-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
        }
        .dl-col, .dl-col-toggles {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .dl-col label {
          font-size: 12px;
          color: #4b5563;
        }
        .dl-col input {
          border: none;
          border-bottom: 1px solid #6b7280;
          background: transparent;
          font-size: 13px;
          line-height: 1;
          color: #111827;
          padding: 2px 0 4px;
          outline: none;
        }
        .dl-col-toggles .switch-row {
          justify-content: space-between;
          font-size: 12px;
          line-height: 1.15;
          padding: 7px 0;
        }

        .live-casino-wrap {
          margin-top: 8px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 10px 14px 16px;
        }
        .live-casino-grid {
          display: grid;
          grid-template-columns: 200px 120px 120px 120px;
          gap: 8px 14px;
          align-items: center;
          max-width: 760px;
        }
        .lc-col-head {
          font-size: 14px;
          color: #374151;
          font-weight: 700;
        }
        .lc-label {
          font-size: 12px;
          color: #374151;
          font-weight: 600;
        }
        .live-casino-grid input {
          width: 100%;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 4px;
          font-size: 12px;
          line-height: 1;
          padding: 4px 8px;
          color: #111827;
        }
        .lc-note {
          margin-top: 10px;
          max-width: 1200px;
          font-size: 11px;
          line-height: 1.35;
          color: #374151;
        }

        .basics-grid { margin-top:8px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
        .col-card { background:#fff; border:1px solid #d1d5db; padding:10px; display:flex; flex-direction:column; min-height:500px; }
        .col-card label { color:#4b5563; font-size:11px; margin-top:7px; margin-bottom:3px; }
        .lock-badge {
          display: inline-flex;
          align-items: center;
          margin-left: 6px;
          padding: 1px 6px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #f8fafc;
          color: #334155;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .col-card input, .col-card select, .col-card textarea { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
        .col-card .duplicate-input {
          border-bottom-color: #b45309 !important;
          background: #fff7ed !important;
          box-shadow: inset 0 -1px 0 #b45309;
        }
        .col-card .password-input-dark {
          background: transparent;
          color: #020617;
          border: none;
          border-bottom: 1px solid #6b7280;
          border-radius: 0;
          padding: 3px 0;
          font-weight: 300;
        }
        .col-card .password-input-dark::placeholder {
          color: #0f172a;
          opacity: 1;
          font-weight: 300;
        }
        .col-card .password-input-dark:focus {
          border-bottom-color: #111827;
          box-shadow: none;
        }
        .col-card textarea { border:1px solid #6b7280; min-height:120px; font-size:13px; padding:5px; }

        .switch-list { margin-top:6px; }
        .switch-row { display:flex; align-items:center; justify-content:space-between; padding:5px 0; font-size:13px; }
        .switch-row.inline-top { margin-top:8px; }
        .switch {
          position:relative;
          display:inline-block;
          width:46px;
          height:24px;
          flex-shrink:0;
        }
        .switch input { opacity:0; width:0; height:0; }
        .slider {
          position:absolute;
          cursor:pointer;
          top:0;
          left:0;
          right:0;
          bottom:0;
          background-color:#b0b7c3;
          transition:.2s;
          border-radius:999px;
        }
        .slider:before {
          position:absolute;
          content:'';
          height:18px;
          width:18px;
          left:3px;
          top:3px;
          background:white;
          transition:.2s;
          border-radius:50%;
        }
        .switch input:checked + .slider { background:#16a34a; }
        .switch input:checked + .slider:before { transform:translateX(22px); }

        .bottom-line { margin-top:10px; font-size:12px; color:#374151; display:flex; gap:14px; flex-wrap: wrap; }
        .bottom-line .neg { color:#dc2626; }
        .bottom-line .pos { color:#15803d; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-card {
          width: 340px;
          max-width: calc(100vw - 32px);
          border-radius: 6px;
          background: #fff;
          padding: 12px;
          border: 1px solid #d1d5db;
          box-shadow: 0 12px 30px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .modal-card h4 { margin: 0 0 6px; font-size: 15px; }
        .modal-card label { font-size: 12px; color: #4b5563; }
        .modal-card input, .modal-card select {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 7px 9px;
          font-size: 13px;
          color: #111827;
        }
        .fp-modal-type-badge {
          display: inline-flex;
          align-items: center;
          padding: 5px 14px;
          border-radius: 6px;
          background: #e8f5ee;
          border: 1px solid #a7d7b8;
          color: #1a7a42;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .fp-modal-balance-strip {
          grid-template-columns: 1fr;
        }
        .tx-modal-balance-strip {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin: 2px 0 8px;
        }
        .tx-modal-balance-item {
          border: 1px solid #dbe7f3;
          border-radius: 8px;
          background: #f8fbff;
          padding: 7px 8px;
        }
        .tx-modal-balance-item span {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.45px;
          text-transform: uppercase;
          color: #607992;
          margin-bottom: 4px;
        }
        .tx-modal-balance-item b {
          display: block;
          font-size: 16px;
          line-height: 1;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          color: #111827;
        }
        .tx-modal-balance-item b.neg { color: #dc2626; }
        .tx-modal-balance-item b.pos { color: #15803d; }
        .tx-modal-balance-item b.neutral { color: #000000; }
        .apps-card { background:#fff; border:1px solid #d1d5db; padding:16px; margin-top:10px; border-radius:4px; }
        .apps-title { font-size:15px; font-weight:700; color:#1e3a5f; margin:0 0 12px 0; }
        .apps-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px 20px; }
        .apps-field { display:flex; flex-direction:column; }
        .apps-field label { color:#4b5563; font-size:11px; margin-bottom:3px; font-weight:600; }
        .apps-field input { width:100%; border:none; border-bottom:1px solid #6b7280; background:transparent; font-size:14px; padding:3px 0; color:#111827; outline:none; }
        .apps-field input:focus { border-bottom-color:#1e40af; }
        .apps-field-full { grid-column:1/-1; }
        .tx-confirm-table {
          width: 100%;
          border-top: 1px solid #e5e7eb;
          margin-bottom: 20px;
        }
        .tx-confirm-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #374151;
        }
        .tx-confirm-row span:first-child { font-weight: 500; }
        .tx-confirm-row span:last-child { font-weight: 600; }
        .tx-confirm-total span:first-child { font-weight: 700; font-size: 15px; }
        .tx-confirm-total span:last-child { font-weight: 700; font-size: 15px; }
        .modal-actions {
          margin-top: 8px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        @media (max-width: 1300px) {
          .basics-grid { grid-template-columns:1fr; }
          .player-card { max-width: 100%; }
          .player-card-foot { flex-direction: column; align-items: flex-start; }
          .creds-row { grid-template-columns: 90px 1fr 32px; }
          .limits-box { grid-template-columns: 1fr; }
          .top-actions { justify-content: flex-start; width: 100%; }
          .tx-controls { grid-template-columns: 1fr 1fr; }
          .tx-stat b { font-size: 14px; }
          .freeplay-controls { grid-template-columns: 1fr 1fr; }
          .freeplay-bottom-row { grid-template-columns: 1fr; }
          .freeplay-inputs { min-width: 0; grid-template-columns: 1fr; }
          .performance-grid { grid-template-columns: 1fr; }
          .perf-left { max-height: 300px; }
          .perf-title-row { font-size: 14px; }
          .perf-title-row b { font-size: 18px; }
          .dynamic-live-grid { grid-template-columns: 1fr; }
          .dl-col input { font-size: 13px; }
          .dl-col-toggles .switch-row { font-size: 12px; }
          .live-casino-grid { grid-template-columns: 1fr 1fr; max-width: none; }
          .lc-col-head, .lc-label, .live-casino-grid input { font-size: 13px; }
          .lc-note { font-size: 11px; }
        }

        @media (max-width: 768px) {
          .top-panel,
          .tx-panel,
          .performance-panel,
          .dynamic-live-card,
          .live-casino-card {
            padding: 8px;
          }

          .top-actions {
            width: 100%;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .paired-grid {
            grid-template-columns: 1fr 1fr;
            gap: 5px;
          }

          .detail-item {
            padding: 5px 7px;
            gap: 2px;
          }

          .detail-label {
            font-size: 9px;
            letter-spacing: 0.4px;
          }

          .detail-value {
            font-size: 12px;
          }

          .player-card {
            width: 100%;
            max-width: 100%;
            padding: 8px;
          }

          .player-card-head {
            margin-bottom: 6px;
          }

          .top-left h2 {
            font-size: 17px;
          }

          .player-badge {
            font-size: 9px;
            padding: 3px 7px;
          }

          .player-card-foot {
            align-items: stretch;
            margin-top: 7px;
            padding-top: 7px;
          }

          .details-domain strong {
            font-size: 12px;
          }

          .domain-label {
            font-size: 9px;
          }

          .top-actions .btn {
            flex: 1 1 calc(50% - 4px);
            text-align: center;
          }

          /* Compact financial summary — tight rows like bettorjuice */
          .top-right {
            padding: 6px;
            gap: 4px;
          }

          .summary-title {
            font-size: 9px;
            padding: 0 2px 1px;
          }

          .metric {
            min-height: 34px;
            padding: 5px 8px;
            border-radius: 6px;
          }

          .metric span {
            font-size: 9px;
          }

          .metric b {
            font-size: 14px;
          }

          .tx-controls,
          .freeplay-controls {
            grid-template-columns: 1fr;
          }

          .tx-summary {
            grid-template-columns: 1fr 1fr;
          }
          .tx-actions-col {
            width: 70px;
            min-width: 70px;
          }
          .tx-row-delete {
            min-height: 24px;
            padding: 4px 6px;
            font-size: 10px;
          }

          .perf-title-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }

          .modal-actions {
            flex-direction: column;
            justify-content: stretch;
          }

          .modal-actions button {
            width: 100%;
          }

          .tx-modal-balance-strip {
            grid-template-columns: 1fr;
          }

          .live-casino-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .customer-details-v2 {
            padding: 5px;
          }

          .top-panel,
          .transactions-wrap,
          .performance-wrap,
          .dynamic-live-wrap,
          .live-casino-wrap,
          .col-card {
            padding: 7px;
          }

          .tx-summary {
            grid-template-columns: 1fr 1fr;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .detail-item {
            padding: 4px 6px;
          }

          .detail-label {
            font-size: 8px;
          }

          .detail-value {
            font-size: 11px;
          }

          .top-left h2 {
            font-size: 15px;
          }

          .metric {
            min-height: 30px;
            padding: 4px 7px;
          }

          .metric span {
            font-size: 8px;
          }

          .metric b {
            font-size: 13px;
          }

          .basics-left h3 {
            font-size: 14px;
          }

          .btn-save,
          .btn-back,
          .btn-user,
          .btn-copy-all {
            font-size: 11px;
            padding: 5px 8px;
          }

          .basics-header {
            padding: 6px 8px;
          }
        }
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}const bc=Object.freeze(Object.defineProperty({__proto__:null,default:Mo},Symbol.toStringTag,{value:"Module"}));export{Oo as A,rc as B,Yo as C,ac as D,pc as F,Ho as G,ec as I,Vo as M,zo as P,mc as R,nc as S,Jo as T,xc as U,Wo as W,Us as a,Go as b,Ro as c,qo as d,Qo as e,Ko as f,Zo as g,_o as h,Uo as i,Xo as j,tc as k,sc as l,ic as m,lc as n,oc as o,cc as p,dc as q,uc as r,hc as s,gc as t,fc as u,bc as v};
