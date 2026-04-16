import{j as e,r as t,R as Hs,g as zt,a as as,b as Qr,c as qt,d as ss,e as pa,f as Yt,h as Kr,i as Jr,k as Zr,l as rs,m as Xr,n as ei,o as ti,p as ai,q as si,s as ni,t as is,u as Hn,v as Gn,w as ri,x as ii,y as li,z as oi,A as Ot,B as _t,C as Vt,D as vs,E as ci,F as di,G as Ns,H as ha,I as ui,J as Da,K as qn,L as mi,M as pi,N as Bs,O as Fs,P as hi,Q as xi,S as gi,T as fi,U as bi,V as ji,W as yi,X as vi,Y as Ni,Z as wi,_ as Si,$ as Yn,a0 as ki,a1 as Ci,a2 as jn,a3 as Ai,a4 as Qn,a5 as Pi,a6 as Li,a7 as Di,a8 as Ti,a9 as Ii,aa as Mi,ab as Bi,ac as Fi,ad as Ei,ae as xa,af as Kn,ag as Jn,ah as Zn,ai as $i,aj as Ri,ak as Ui,al as _i,am as Wi,an as Oi,ao as zi,ap as Vi,aq as Hi,ar as Gi,as as qi,at as Yi,au as Qi,av as Ki,aw as Ji,ax as Zi,ay as Xi,az as el,aA as tl,aB as al,aC as sl,aD as nl,aE as rl,aF as il,aG as ll,aH as ol,aI as ws,aJ as Xn,aK as cl,aL as dl,aM as ul,aN as Ya,aO as ml,aP as pl,aQ as hl}from"./index-BQ-wQui8.js";import{f as er,i as tr}from"./transactionPresentation-CyZ1GSrg.js";const ar={dashboard:"dashboard","weekly-figures":"weeklyFigures",pending:"pending",messaging:"messaging","game-admin":"gameAdmin","casino-bets":"gameAdmin","customer-admin":"customerAdmin","agent-manager":"agentManager",cashier:"cashier","add-customer":"addCustomer","third-party-limits":"thirdPartyLimits",props:"props","agent-performance":"agentPerformance",analysis:"analysis","ip-tracker":"ipTracker","transaction-history":"transactionsHistory","transactions-history":"transactionsHistory","deleted-wagers":"deletedWagers","games-events":"gamesEvents","sportsbook-links":"sportsbookLinks","bet-ticker":"betTicker",ticketwriter:"ticketwriter",scores:"scores","master-agent-admin":"masterAgentAdmin",billing:"billing",settings:"settings",monitor:"monitor",rules:"rules",feedback:"feedback",faq:"faq","user-manual":"userManual",profile:"profile"},sr=a=>a==="admin"||a==="master_agent"||a==="super_agent",Ta=(a,n,i)=>{if(sr(a))return!0;const p=ar[i];if(!p)return!0;const g=n?.views?.[p];return g===!1?!1:g===!0?!0:!(p==="transactionsHistory"&&n?.views?.collections===!1)},xl=(a,n)=>sr(a)?!0:n?.ipTracker?.manage!==!1,nr=[{id:"dashboard",label:"Dashboard",sidebarIcon:"🏠",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!1},{id:"weekly-figures",label:"Weekly Figures",sidebarIcon:"📊",dashboardIcon:"fa-solid fa-chart-line",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"pending",label:"Pending",sidebarIcon:"📋",dashboardIcon:"fa-solid fa-calendar-check",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"messaging",label:"Messaging",sidebarIcon:"✉️",dashboardIcon:"fa-solid fa-envelope",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"game-admin",label:"Game Admin",sidebarIcon:"🎮",dashboardIcon:"fa-solid fa-gamepad",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"casino-bets",label:"Casino Bets",sidebarIcon:"🎰",dashboardIcon:"fa-solid fa-dice",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"customer-admin",label:"Customer Admin",sidebarIcon:"👤",dashboardIcon:"fa-solid fa-user-shield",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"agent-manager",label:"Agent Management",sidebarIcon:"👨‍👩‍👧‍👦",dashboardIcon:"fa-solid fa-users-gear",dashboardColor:"teal",roles:["admin","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"cashier",label:"Cashier",sidebarIcon:"💰",dashboardIcon:"fa-solid fa-money-bill-wave",dashboardColor:"teal",roles:["admin","agent","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"add-customer",label:"Add Customer",sidebarIcon:"➕",dashboardIcon:"fa-solid fa-user-plus",dashboardColor:"light-gray",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"third-party-limits",label:"3rd Party Limits",sidebarIcon:"🔒",dashboardIcon:"fa-solid fa-lock",dashboardColor:"light-gray",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"props",label:"Props / Betting",sidebarIcon:"🎯",dashboardIcon:"fa-solid fa-bullseye",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"agent-performance",label:"Agent Performance",sidebarIcon:"📈",dashboardIcon:"fa-solid fa-list-check",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"analysis",label:"Analysis",sidebarIcon:"📉",dashboardIcon:"fa-solid fa-arrow-trend-up",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"ip-tracker",label:"IP Tracker",sidebarIcon:"🌐",dashboardIcon:"fa-solid fa-globe",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"transaction-history",label:"Transaction History",sidebarIcon:"📑",dashboardIcon:"fa-solid fa-receipt",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"deleted-wagers",label:"Deleted Wagers",sidebarIcon:"🗑️",dashboardIcon:"fa-solid fa-trash",dashboardColor:"light-blue",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"games-events",label:"Games & Events",sidebarIcon:"🏟️",dashboardIcon:"fa-solid fa-calendar-days",dashboardColor:"orange",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"sportsbook-links",label:"Sportsbook Links",sidebarIcon:"🔗",dashboardIcon:"fa-solid fa-lines-leaning",dashboardColor:"orange",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"bet-ticker",label:"Bet Ticker",sidebarIcon:"⏱️",dashboardIcon:"fa-solid fa-clock",dashboardColor:"orange",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"ticketwriter",label:"TicketWriter",sidebarIcon:"✏️",dashboardIcon:"fa-solid fa-pen-to-square",dashboardColor:"orange",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"scores",label:"Scores",sidebarIcon:"🏆",dashboardIcon:"fa-solid fa-trophy",dashboardColor:"orange",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"master-agent-admin",label:"Master Agent Admin",sidebarIcon:"👨‍💼",dashboardIcon:"fa-solid fa-user-tie",dashboardColor:"green",roles:["admin","master_agent","super_agent"],showInSidebar:!0,showInDashboard:!0},{id:"billing",label:"Billing",sidebarIcon:"💳",dashboardIcon:"fa-solid fa-sack-dollar",dashboardColor:"green",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"settings",label:"Settings",sidebarIcon:"⚙️",dashboardIcon:"fa-solid fa-gear",dashboardColor:"green",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"monitor",label:"System Monitor",sidebarIcon:"🖥️",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!1},{id:"rules",label:"Rules",sidebarIcon:"📋",dashboardIcon:"fa-solid fa-list-check",dashboardColor:"green",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"feedback",label:"Feedback",sidebarIcon:"💬",dashboardIcon:"fa-solid fa-wrench",dashboardColor:"light-gray",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"faq",label:"FAQ",sidebarIcon:"❓",dashboardIcon:"fa-solid fa-circle-question",dashboardColor:"black",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0},{id:"user-manual",label:"User Manual",sidebarIcon:"📖",dashboardIcon:"fa-solid fa-book",dashboardColor:"black",roles:["admin","agent","super_agent","master_agent"],showInSidebar:!0,showInDashboard:!0}];function yn({onMenuClick:a,onOpenScoreboard:n,onSwitchContext:i,role:p="admin",layoutPref:g="tiles",isMobile:x=!1,permissions:v=null}){const w=p||"admin",f=nr.filter(h=>h.showInDashboard&&h.roles&&h.roles.includes(w)&&Ta(w,v,h.id)),B=["teal","light-blue","orange"];return x&&g==="sidebar"?e.jsx("div",{className:"admin-dashboard",children:e.jsxs("div",{style:{textAlign:"center",padding:"50px",color:"#666"},children:[e.jsx("h2",{children:"Welcome"}),e.jsx("p",{children:"Select an option from the sidebar to get started."})]})}):e.jsx("div",{className:"admin-dashboard",children:e.jsx("div",{className:"dashboard-grid",children:f.map((h,N)=>{const m=B[Math.min(Math.floor(N/8),B.length-1)];return e.jsxs("button",{type:"button",className:`grid-card ${m}`,onClick:()=>{if(h.id==="scores"&&typeof n=="function"){n();return}a(h.id)},children:[e.jsx("div",{className:"card-icon",children:e.jsx("i",{className:h.dashboardIcon})}),e.jsx("div",{className:"card-label",children:h.label})]},h.id)})})})}function gl({onClose:a,onGo:n,initialQuery:i="",onRestoreBaseContext:p,canRestoreBaseContext:g=!1,baseContextLabel:x="Admin"}){const v=new Set(["admin","agent","master_agent","super_agent"]),w=$=>String($||"").trim().toLowerCase(),f=$=>{const ee=w($?.role);return ee==="master_agent"?"M":ee==="super_agent"?"S":ee==="agent"?"A":ee==="admin"?"ADMIN":String($?.role||"").replace(/_/g," ").toUpperCase()||"ACCOUNT"},B=$=>w($?.role).replace(/_/g,"-")||"account",h=$=>{const ee=w($?.role);return ee==="admin"||ee==="master_agent"||ee==="super_agent"},N=$=>{const ee=String($?.username||"").toLowerCase(),Z=w($?.role).replace(/_/g," "),te=Z.replace(/\s+/g,""),Oe=String($?.nodeType||"").toLowerCase();return`${ee} ${Z} ${te} ${Oe}`.trim()},m=($,ee)=>{const fe=String(ee||"").trim().toLowerCase();return fe?N($).includes(fe):!0},u=$=>{const ee=String($?.nodeType||"").toLowerCase();return ee==="agent"?!0:ee==="player"?!1:v.has(String($?.role||"").toLowerCase())},k=$=>String($||"").trim(),G=($,ee)=>{const fe=k(ee);if(!fe||!$)return[];const Z=k($.id);if(Z===fe)return[Z];const te=Array.isArray($.children)?$.children:[];for(const Oe of te){const P=G(Oe,fe);if(P.length>0)return[Z,...P]}return[]},[D,F]=t.useState(!0),[C,j]=t.useState(null),[W,r]=t.useState(""),[M,T]=t.useState(new Set),[o,U]=t.useState(null),[ae,z]=t.useState(null);t.useEffect(()=>{(async()=>{try{F(!0);const ee=localStorage.getItem("token");if(!ee){U("Please login to load tree"),j(null),z(null);return}const fe=sessionStorage.getItem("impersonationBaseToken"),Z=!!(g&&fe&&fe!==ee),te=await zt(ee);z(te||null);let Oe;try{Oe=await as(Z?fe:ee)}catch(P){if(!Z)throw P;Oe=await as(ee)}if(j(Oe),Oe?.root){const P=new Set([Oe.root.id]),le={...Oe.root,children:Oe.tree||[]};G(le,te?.id).forEach(q=>P.add(q)),T(P)}else T(new Set);U(null)}catch(ee){console.error("Failed to fetch agent tree:",ee),U("Failed to load tree")}finally{F(!1)}})()},[]),t.useEffect(()=>{r(i||"")},[i]),t.useEffect(()=>{const $=ee=>{ee.key==="Escape"&&a?.()};return window.addEventListener("keydown",$),()=>window.removeEventListener("keydown",$)},[a]);const y=$=>{const ee=new Set(M);ee.has($)?ee.delete($):ee.add($),T(ee)},K=($,ee)=>{const fe=String(ee||"").trim().toLowerCase();return!fe||u($)&&m($,fe)?!0:($.children||[]).some(te=>K(te,fe))},c=k(ae?.id),E=k(C?.root?.id),O=!!(g&&c&&E&&c!==E),H=(C?.tree||[]).filter($=>u($)).length>0;Hs.useMemo(()=>{const $=[],ee=fe=>{(fe||[]).forEach(Z=>{$.push(Z),ee(Z.children)})};return ee(C?.tree||[]),$},[C]);const de=!!C?.root&&h(C.root),De=M.has(C?.root?.id),Y=($,ee=0)=>{if(!u($))return null;const Z=k($.id),te=M.has(Z),Oe=($.children||[]).filter(we=>u(we)),le=Oe.length>0&&h($),l=$.isDead||$.username?.toUpperCase()==="DEAD",q=W.trim().toLowerCase(),re=f($),he=B($);return q&&!K($,q)?null:e.jsxs("div",{className:`tree-node-wrapper depth-${ee}`,children:[e.jsxs("div",{className:`tree-node ${l?"dead-node":""}`,children:[e.jsxs("div",{className:"node-content",onClick:()=>le&&y(Z),children:[le?e.jsx("span",{className:"node-toggle",children:te?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:($.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${he}`,children:re}),$.agentPercent!=null&&e.jsxs("span",{className:"node-pct-badge",children:[$.agentPercent,"%"]}),l&&e.jsx("span",{className:"dead-tag",children:"DEAD"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>n(Z,$.role),children:"Go"})]}),le&&(te||W)&&e.jsx("div",{className:"node-children",children:Oe.map(we=>Y(we,ee+1))})]},Z)};return e.jsx("div",{className:"agent-tree-sidebar-wrap",children:e.jsxs("aside",{className:"agent-tree-container agent-tree-sidebar glass-effect",children:[e.jsxs("div",{className:"tree-header",children:[e.jsx("h3",{children:"Account Tree"}),e.jsx("button",{className:"close-x",onClick:a,children:"✕"})]}),e.jsx("div",{className:"tree-search",children:e.jsxs("div",{className:"search-pill",children:[e.jsx("span",{className:"pill-label",children:"Accounts"}),e.jsx("input",{type:"text",placeholder:"Search admin, master, or agent...",value:W,style:{textTransform:"uppercase"},onChange:$=>r($.target.value.toUpperCase())})]})}),e.jsx("div",{className:"tree-scroll-area",children:D?e.jsx("div",{className:"tree-loading",children:"Loading Tree..."}):o?e.jsx("div",{className:"tree-error",children:o}):C?e.jsxs("div",{className:"tree-root",children:[(C.readonlyAdmins||[]).map($=>e.jsxs("div",{className:"tree-node depth-0 root-node",style:{opacity:.7,marginBottom:2},children:[e.jsxs("div",{className:"node-content",children:[e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:($.username||"").toUpperCase()}),e.jsx("span",{className:"node-role-badge role-admin",children:"ADMIN"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>n($.id,"admin"),children:"Go"})]},$.id)),e.jsxs("div",{className:"tree-node depth-0 root-node",children:[e.jsxs("div",{className:"node-content",onClick:()=>de&&y(C.root.id),children:[de?e.jsx("span",{className:"node-toggle",children:De?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:C.root.username.toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${B(C.root)}`,children:f(C.root)})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>{if(O&&p){p();return}n(C.root.id,C.root.role)},children:"Go"})]}),H&&(De||W)&&e.jsx("div",{className:"node-children",children:C.tree.map($=>Y($,1))})]}):null})]})})}const Ca=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],Qa=a=>{const n=Number(a);if(!Number.isFinite(n))return"$0";const i=Math.round(n);return`${i<0?"-":""}$${Math.abs(i).toLocaleString("en-US")}`},Ka=a=>{const n=Number(a);return!Number.isFinite(n)||Math.abs(Math.round(n))<.5?"neutral":n>0?"positive":"negative"},vn=a=>{const n=Number(a);return!Number.isFinite(n)||Math.abs(Math.round(n))<.5?"neutral":n>0?"negative":"positive"},Nn=a=>{const n=Number(a);if(!Number.isFinite(n))return"$0";const i=Math.round(n);return i===0?"$0":`${i>0?"-":""}$${Math.abs(i).toLocaleString("en-US")}`},fl=a=>{const n=a.getFullYear(),i=String(a.getMonth()+1).padStart(2,"0"),p=String(a.getDate()).padStart(2,"0");return`${n}-${i}-${p}`},bl=()=>{const a=[],n=new Date,i=new Date(n.getFullYear(),n.getMonth(),n.getDate()),g=(i.getDay()+5)%7,x=new Date(i);x.setDate(i.getDate()-g);for(let v=0;v<12;v++){const w=new Date(x);w.setDate(x.getDate()-v*7);const f=new Date(w);f.setDate(w.getDate()+6);const B=`${Ca[w.getMonth()]} ${w.getDate()} - ${Ca[f.getMonth()]} ${f.getDate()}`,h=w.getMonth()===f.getMonth()?`${Ca[w.getMonth()]} ${w.getDate()}-${f.getDate()}`:`${Ca[w.getMonth()]} ${w.getDate()}-${Ca[f.getMonth()]} ${f.getDate()}`;a.push({iso:fl(w),label:B,shortLabel:h,start:w,end:f})}return a},wn=()=>Math.floor(new Date().getMonth()/3)+1;function jl({onSelectAgent:a,onWeekChange:n}){const[i,p]=t.useState("week"),g=t.useMemo(()=>bl(),[]),x=g[0]?.iso||"",[v,w]=t.useState(x),f=t.useMemo(()=>new Date().getFullYear(),[]),[B,h]=t.useState(`q${wn()}`),[N,m]=t.useState(!1),[u,k]=t.useState(!1),[G,D]=t.useState(null),[F,C]=t.useState({period:{type:"week",label:""},ytdLabel:String(f),agents:[],totals:{owedAmount:0,periodAmount:0,ytdAmount:0,lifetimeAmount:0,makeupAmount:0}});t.useEffect(()=>{typeof n=="function"&&(i==="week"?n(v,v===x):n(x,!0))},[i,v,x,n]),t.useEffect(()=>{let c=!1;const E=localStorage.getItem("token");if(!E)return;const O={};if(i==="week"){if(!v)return;O.periodType="week",O.weekStart=v}else if(i==="quarter")if(B==="year")O.periodType="yearly",O.year=f;else{const _=Number(String(B).replace(/^q/,""))||wn();O.periodType="quarter",O.quarter=_,O.year=f}return k(!0),D(null),Qr(E,O).then(_=>{c||C(_||{period:{type:i,label:""},ytdLabel:String(f),agents:[],totals:{owedAmount:0,periodAmount:0,ytdAmount:0,lifetimeAmount:0,makeupAmount:0}})}).catch(_=>{c||D(_?.message||"Failed to load agent cuts")}).finally(()=>{c||k(!1)}),()=>{c=!0}},[i,v,B,f]);const j=Number(F?.totals?.owedAmount??0),W=Number(F?.totals?.periodAmount??0),r=Number(F?.totals?.ytdAmount??0),M=Number(F?.totals?.lifetimeAmount??0),T=Number(F?.totals?.makeupAmount??0),o=g.find(c=>c.iso===v),U=i==="quarter"&&B!=="year",ae=t.useMemo(()=>i==="quarter"?B==="year"?String(f):String(B).toUpperCase():"Period",[i,B,f]),z=t.useMemo(()=>{if(i==="week")return[{key:"owed",label:"Owed",className:"acut-owed",totalValue:j,getValue:E=>Number(E?.owedAmount??0),formatter:Nn,getToneClass:vn},{key:"profit",label:"Profit",className:"acut-period",totalValue:W,getValue:E=>Number(E?.periodAmount??0),formatter:Qa,getToneClass:Ka},{key:"makeup",label:"Makeup",className:"acut-secondary",totalValue:T,getValue:E=>Number(E?.makeupAmount??0),formatter:Nn,getToneClass:vn}];const c=[{key:"period",label:ae,className:"acut-period",totalValue:W,getValue:E=>Number(E?.periodAmount??0),formatter:Qa,getToneClass:Ka}];return U&&c.push({key:"ytd",label:String(F?.ytdLabel??f),className:"acut-secondary",totalValue:r,getValue:E=>Number(E?.ytdAmount??0),formatter:Qa,getToneClass:Ka}),c.push({key:"lifetime",label:"Lifetime",className:U?"acut-lifetime":"acut-secondary",totalValue:M,getValue:E=>Number(E?.lifetimeAmount??0),formatter:Qa,getToneClass:Ka}),c},[i,ae,j,W,T,U,F?.ytdLabel,f,r,M]),y=t.useMemo(()=>{const c=Array.isArray(F?.agents)?F.agents:[];return N?c.filter(E=>z.some(O=>Math.abs(Math.round(O.getValue(E)))>0)):c},[F,N,z]),K=i==="week"?F?.period?.label||o?.label||"Total":"PROFIT";return e.jsxs("div",{className:"agent-cuts-panel",children:[e.jsxs("div",{className:"agent-cuts-tabs",children:[e.jsx("button",{type:"button",className:`agent-cuts-tab ${i==="week"?"is-active":""}`,onClick:()=>p("week"),children:"Weekly"}),e.jsx("button",{type:"button",className:`agent-cuts-tab ${i==="quarter"?"is-active":""}`,onClick:()=>p("quarter"),children:"Quarterly"})]}),e.jsxs("div",{className:"agent-cuts-controls",children:[i==="week"&&e.jsx("select",{className:"agent-cuts-week-select",value:v,onChange:c=>w(c.target.value),children:g.map(c=>e.jsx("option",{value:c.iso,children:c.label},c.iso))}),i==="quarter"&&e.jsxs("div",{className:"agent-cuts-quarter-buttons",children:[["q1","q2","q3","q4"].map(c=>e.jsx("button",{type:"button",className:`agent-cuts-quarter-btn ${B===c?"is-active":""}`,onClick:()=>h(c),children:c.toUpperCase()},c)),e.jsx("button",{type:"button",className:`agent-cuts-quarter-btn ${B==="year"?"is-active":""}`,onClick:()=>h("year"),children:f})]}),e.jsxs("label",{className:"agent-cuts-hide-zero",children:[e.jsx("input",{type:"checkbox",checked:N,onChange:c=>m(c.target.checked)}),"Hide $0 agents"]})]}),G&&e.jsx("div",{className:"agent-cuts-error",children:G}),e.jsxs("div",{className:"agent-cuts-table",children:[e.jsxs("div",{className:"agent-cuts-header",children:[e.jsx("span",{className:"acut-name",children:"Agent"}),e.jsx("span",{className:"acut-cut",children:"Cut%"}),z.map(c=>e.jsx("span",{className:c.className,children:c.label},c.key))]}),u&&e.jsx("div",{className:"agent-cuts-empty",children:"Loading…"}),!u&&y.length===0&&e.jsx("div",{className:"agent-cuts-empty",children:"No agents with activity for this period."}),!u&&y.map(c=>e.jsxs("button",{type:"button",className:"agent-cuts-row",onClick:()=>{typeof a=="function"&&c.id&&a(c.id)},children:[e.jsx("span",{className:"acut-name",children:c.username}),e.jsx("span",{className:"acut-cut",children:c.myCut!=null?`${c.myCut}%`:"—"}),z.map(E=>{const O=E.getValue(c);return e.jsx("span",{className:`${E.className} ${E.getToneClass(O)}`,children:E.formatter(O)},E.key)})]},c.id)),!u&&y.length>0&&e.jsxs("div",{className:"agent-cuts-total",children:[e.jsx("span",{className:"acut-name",children:K}),e.jsx("span",{className:"acut-cut"}),z.map(c=>e.jsx("span",{className:`${c.className} ${c.getToneClass(c.totalValue)}`,children:c.formatter(c.totalValue)},c.key))]})]})]})}const yl=a=>String(a||"").replace(/\s+/g," ").trim(),Es=a=>yl(a).toLowerCase(),vl=a=>{const n=String(a||"").replace(/\D+/g,"");return n?n.length>10?n.slice(-10):n:""},Nl=a=>Es(a),wl=a=>{const n=Es(a?.fullName||a?.name||"");return n||Es(`${a?.firstName||""} ${a?.lastName||""}`)},Aa=(a,n,i)=>{n&&(a.has(n)||a.set(n,new Set),a.get(n).add(i))},Ia=a=>{if(!Array.isArray(a)||a.length===0)return[];const n=a.map((x,v)=>{const w=String(x?.id||x?.username||`row-${v}`),f=wl(x),B=vl(x?.phoneNumber),h=Nl(x?.email);return{player:x,id:w,name:f,phone:B,email:h}}),i=new Map;n.forEach(({id:x,name:v,phone:w,email:f})=>{w&&Aa(i,`phone:${w}`,x),f&&Aa(i,`email:${f}`,x),v&&w&&Aa(i,`name_phone:${v}|${w}`,x),v&&f&&Aa(i,`name_email:${v}|${f}`,x),v&&!w&&!f&&v.length>=8&&v.includes(" ")&&Aa(i,`name_only:${v}`,x)});const p=new Map,g=x=>(p.has(x)||p.set(x,{reasons:new Set,groups:new Set,matchCount:0}),p.get(x));return i.forEach((x,v)=>{if(x.size<2)return;const w=v.startsWith("email:")?"email":v.startsWith("phone:")?"phone":"name";x.forEach(f=>{const B=g(f);B.reasons.add(w),B.groups.add(v),B.matchCount+=x.size-1})}),n.map(({player:x,id:v})=>{const w=p.get(v);return w?{...x,isDuplicatePlayer:!0,duplicateMatchCount:w.matchCount,duplicateReasons:Array.from(w.reasons),duplicateGroupKeys:Array.from(w.groups)}:{...x,isDuplicatePlayer:!1,duplicateMatchCount:0,duplicateReasons:[],duplicateGroupKeys:[]}})},Sl=()=>({totalBalance:0,totalOutstanding:0,totalPlayerFees:0,paidPlayerFees:0,unpaidPlayerFees:0,weekNet:0,todayNet:0,activeAccounts:0,agentDeposits:0,agentWithdrawals:0,houseDeposits:0,houseWithdrawals:0,agentPercent:null,agentCollections:0,houseCollections:0,netCollections:0,commissionableProfit:0,agentSplit:0,kickToHouse:0,houseProfit:0,previousMakeup:0,makeupReduction:0,weeklyMakeupAddition:0,cumulativeMakeup:0,previousBalanceOwed:0,fundingAdjustment:0,balanceOwed:0,sportsbookHealth:null}),kl=(a=null)=>({totalBalance:a?.totalBalance??0,totalOutstanding:a?.totalOutstanding??0,totalPlayerFees:a?.totalPlayerFees??0,paidPlayerFees:a?.paidPlayerFees??0,unpaidPlayerFees:a?.unpaidPlayerFees??0,weekNet:a?.weekNet??0,todayNet:a?.todayNet??0,activeAccounts:a?.activeAccounts??0,agentDeposits:a?.agentDeposits??0,agentWithdrawals:a?.agentWithdrawals??0,houseDeposits:a?.houseDeposits??0,houseWithdrawals:a?.houseWithdrawals??0,agentPercent:a?.agentPercent??null,agentCollections:a?.agentCollections??0,houseCollections:a?.houseCollections??0,netCollections:a?.netCollections??0,commissionableProfit:a?.commissionableProfit??0,agentSplit:a?.agentSplit??0,kickToHouse:a?.kickToHouse??0,houseProfit:a?.houseProfit??0,previousMakeup:a?.previousMakeup??0,makeupReduction:a?.makeupReduction??0,weeklyMakeupAddition:a?.weeklyMakeupAddition??0,cumulativeMakeup:a?.cumulativeMakeup??0,previousBalanceOwed:a?.previousBalanceOwed??0,fundingAdjustment:a?.fundingAdjustment??0,balanceOwed:a?.balanceOwed??0,sportsbookHealth:a?.sportsbookHealth??null});function Cl({onMenuToggle:a,onLogout:n,onViewChange:i,onSwitchContext:p,onRestoreBaseContext:g,canRestoreBaseContext:x=!1,baseContextLabel:v="Admin",role:w="admin",showStats:f=!0}){const B=typeof a=="function",[h,N]=t.useState(!1),[m,u]=t.useState(!1),[k,G]=t.useState(!1),[D,F]=t.useState(""),[C,j]=t.useState(""),[W,r]=t.useState(!1),[M,T]=t.useState([]),[o,U]=t.useState([]),[ae,z]=t.useState([]),[y,K]=t.useState(null),[c,E]=t.useState(Sl),[O,_]=t.useState(null),[H,de]=t.useState([]),[De,Y]=t.useState(null),$=V=>(Array.isArray(V)?V:[]).filter(ce=>{const ve=String(ce?.role||"").toLowerCase();return ve===""||ve==="user"||ve==="player"}),ee=V=>{E(kl(V))};t.useEffect(()=>{let V=!1;const ce=localStorage.getItem("token");if(!ce)return;const ve=De?{weekStart:De}:null,Ie=async()=>{if(!document.hidden)try{const A=await ss(ce,ve);if(V)return;ee(A)}catch(A){V||console.error("Failed to refresh admin header summary:",A)}},rt=async()=>{try{const[A,I]=await Promise.all([ss(ce,ve),zt(ce)]);if(V)return;ee(A),_(I||null);const je=String(I?.role||w||"").toLowerCase(),Q=je==="agent",Be=je==="master_agent"||je==="super_agent",[Fe,Ge,Ae]=await Promise.all([Q?pa(ce):qt(ce),Yt(ce).catch(()=>[]),Be||je==="admin"?Kr(ce).catch(()=>({agents:[]})):Promise.resolve({agents:[]})]);if(V)return;const Re=$(Fe);T(Re),U(Re),z(Array.isArray(Ge)?Ge:[]),de(Array.isArray(Ae?.agents)?Ae.agents:[])}catch(A){V||console.error("Failed to load admin header summary:",A)}};rt();const ut=window.setInterval(Ie,15e3),et=()=>{document.hidden||rt()};return document.addEventListener("visibilitychange",et),()=>{V=!0,window.clearInterval(ut),document.removeEventListener("visibilitychange",et)}},[w,De]);const fe=V=>{if(V==null)return null;const ce=Number(V);if(Number.isNaN(ce))return null;const ve=Math.round(ce);return Object.is(ve,-0)?0:ve},Z=V=>{const ce=fe(V);return ce===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(ce)},te=V=>{const ce=fe(V);return ce===null||ce===0?"neutral":ce>0?"positive":"negative"},Oe=V=>{if(V==null)return"—";const ce=Number(V);return Number.isNaN(ce)?"—":ce.toLocaleString("en-US")},P=()=>{n&&n()},le=V=>{G(!1),i&&i(V)},l=(V="")=>{N(!1),G(!1),r(!1),j(String(V||"").trim()),u(ce=>!ce)},q=()=>{N(!1),u(!1),G(V=>!V)};t.useEffect(()=>{r(k)},[k]);const re=V=>String(V||"").trim().toLowerCase(),he=V=>String(V?.id||""),we=V=>V?.fullName||`${V?.firstName||""} ${V?.lastName||""}`.trim(),Se=t.useMemo(()=>Ia(M),[M]),Je=t.useMemo(()=>{const V=new Map;return Se.forEach(ce=>{const ve=he(ce);ve&&V.set(ve,{isDuplicatePlayer:ce?.isDuplicatePlayer===!0,duplicateMatchCount:Number(ce?.duplicateMatchCount||0),duplicateReasons:Array.isArray(ce?.duplicateReasons)?ce.duplicateReasons:[],duplicateGroupKeys:Array.isArray(ce?.duplicateGroupKeys)?ce.duplicateGroupKeys:[]})}),V},[Se]),ze=t.useMemo(()=>Ia(o).map(ce=>{const ve=he(ce),Ie=ve?Je.get(ve):null;return Ie?{...ce,isDuplicatePlayer:Ie.isDuplicatePlayer,duplicateMatchCount:Ie.duplicateMatchCount,duplicateReasons:Ie.duplicateReasons,duplicateGroupKeys:Ie.duplicateGroupKeys}:ce}),[o,Je]),Ye=V=>{const ce=Array.isArray(V?.duplicateReasons)?V.duplicateReasons:[];return ce.length===0?"":Array.from(new Set(ce)).sort((Ie,rt)=>Ie.localeCompare(rt)).map(Ie=>Ie==="phone"?"Phone":Ie==="email"?"Email":Ie==="name"?"Name":String(Ie||"").trim()).filter(Boolean).join(", ")},dt=(V,ce)=>{const ve=re(ce);if(!ve)return!0;if(ve==="duplicate"||ve==="duplicates"||ve==="dup")return V?.isDuplicatePlayer===!0;const Ie=re(he(V)),rt=re(V?.username),ut=re(we(V)),et=re(V?.displayPassword),A=re(V?.phoneNumber),I=String(ce||"").replace(/\D/g,""),je=String(V?.phoneNumber||"").replace(/\D/g,"");return Ie.includes(ve)||rt.includes(ve)||ut.includes(ve)||et.includes(ve)||A.includes(ve)||I!==""&&je.includes(I)},tt=(V,ce)=>{const ve=re(ce);if(!ve)return!0;const Ie=re(V?.username),rt=re(we(V)),ut=re(V?.displayPassword),et=re(V?.phoneNumber),A=String(ce||"").replace(/\D/g,""),I=String(V?.phoneNumber||"").replace(/\D/g,"");return Ie.includes(ve)||rt.includes(ve)||ut.includes(ve)||et.includes(ve)||A!==""&&I.includes(A)},Ze=V=>{const ce=String(V?.role||"").toLowerCase();return ce==="master_agent"||ce==="super_agent"?"Master":"Agent"};t.useEffect(()=>{const V=localStorage.getItem("token");if(!V)return;const ce=D.trim();let ve=!1;const Ie=window.setTimeout(async()=>{if(ve)return;if(ce===""){U(M);return}const rt=ce.toLowerCase();if(rt==="duplicate"||rt==="duplicates"||rt==="dup"){U(M);return}try{const ut=await qt(V,{q:ce});if(ve)return;const et=$(ut);U(et)}catch(ut){if(ve)return;console.warn("Backend player search failed, using local fallback:",ut),U(M.filter(et=>dt(et,ce)))}},220);return()=>{ve=!0,window.clearTimeout(Ie)}},[M,D]);const $e=V=>{V.preventDefault(),D.trim()&&r(!0)},ht=V=>{V.preventDefault(),D.trim()&&r(!0)},bt=(V,ce=!1)=>{if(!V)return;const ve=he(V);ve&&i&&i("user-details",ve),F(V.username||""),K(V),r(!1),ce&&G(!1)},lt=(V,ce=!1)=>{if(!V)return;const ve=he(V);ve&&i&&i("user-details",ve),F(V.username||""),K(null),r(!1),ce&&G(!1)},Ve=(V,ce)=>{const ve=String(V?.username||"").toUpperCase(),Ie=String(ce?.username||"").toUpperCase();return ve.localeCompare(Ie,void 0,{numeric:!0,sensitivity:"base"})},He=t.useMemo(()=>{const V=D.trim();return V?[...ze].filter(ce=>dt(ce,V)).sort(Ve):[]},[ze,D]),at=t.useMemo(()=>{const V=D.trim();return V?[...ae].filter(ce=>tt(ce,V)).sort(Ve):[]},[ae,D]),Xe=D.trim()!=="",St=He.length>0||at.length>0,d=O?.username?O.username.toUpperCase():(sessionStorage.getItem(`${w}Username`)||sessionStorage.getItem("super_agentUsername")||sessionStorage.getItem("agentUsername")||sessionStorage.getItem("adminUsername")||localStorage.getItem("userRole")||"USER").toUpperCase(),R=(O?.role||w||"admin").toLowerCase(),X=R==="master_agent"||R==="super_agent"?"MASTER":R==="agent"?"AGENT":"ADMIN",me=d;Number(c.activeAccounts),c.totalBalance;const ke=Number(c.agentCollections??0),ge=Number(c.houseCollections??0),Ne=Number(c.netCollections??0),Te=Number(c.cumulativeMakeup??0),Ke=Number(c.previousMakeup??0),yt=Number(c.makeupReduction??0),It=Number(c.commissionableProfit??0),vt=Number(c.agentSplit??0),st=Number(c.kickToHouse??0),jt=Number(c.previousBalanceOwed??0),Mt=Number(c.balanceOwed??0),kt=c.agentPercent,Nt=kt!=null?100-kt:null,Ft=Number(c.totalPlayerFees??0),$t=Number(c.houseProfit??0),Rt=Number(c.fundingAdjustment??0);return e.jsxs("div",{className:"admin-header",children:[e.jsxs("div",{className:"admin-header-top",children:[e.jsxs("div",{className:"admin-header-left",children:[e.jsxs("button",{type:"button",className:"home-nav-btn",onClick:()=>le("dashboard"),"aria-label":"Go to admin home",children:[e.jsx("i",{className:"fa-solid fa-house","aria-hidden":"true"}),e.jsx("span",{children:"Home"})]}),e.jsx("button",{type:"button",className:"mobile-search-toggle",onClick:q,"aria-label":"Search players",title:"Search players",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass","aria-hidden":"true"})}),B&&e.jsx("button",{type:"button",className:"mobile-menu-toggle",onClick:a,"aria-label":"Toggle menu",children:"☰"}),e.jsxs("form",{className:"admin-header-search",onSubmit:$e,children:[e.jsxs("div",{className:"admin-header-player-search",onFocus:()=>r(!0),onBlur:()=>setTimeout(()=>r(!1),120),children:[e.jsx("span",{className:"search-icon","aria-hidden":"true",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})}),e.jsx("input",{type:"text",placeholder:"Search players & agents...",value:D,style:{textTransform:"uppercase"},onChange:V=>{const ce=V.target.value.toUpperCase();F(ce),r(!0),ce.trim()===""&&K(null)}}),W&&Xe&&e.jsx("div",{className:"admin-header-search-list",children:St?e.jsxs(e.Fragment,{children:[He.length>0&&at.length>0&&e.jsx("div",{className:"search-section-label",children:"Players"}),He.map((V,ce)=>{const ve=he(V),Ie=we(V),rt=String(V.displayPassword||"").trim().toUpperCase()||"—",ut=String(V.phoneNumber||"").trim()||"—",et=Ye(V);return e.jsxs("button",{type:"button",className:`admin-header-search-item ${V.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:A=>A.preventDefault(),onClick:()=>bt(V),children:[e.jsxs("span",{className:"search-item-user-wrap",children:[e.jsx("span",{className:"search-item-user",children:String(V.username||"").toUpperCase()}),V.isDuplicatePlayer&&e.jsx("span",{className:"search-item-dup-badge",children:"Duplicate Player"})]}),e.jsx("span",{className:"search-item-pass",children:rt}),e.jsxs("span",{className:"search-item-name-wrap",children:[e.jsx("span",{className:"search-item-name",children:Ie||"—"}),e.jsx("span",{className:"search-item-phone",children:ut}),V.isDuplicatePlayer&&et&&e.jsx("span",{className:"search-item-dup-reason",children:et})]})]},`player-${String(ve||V.username||ce)}`)}),He.length>0&&at.length>0&&e.jsx("div",{className:"search-section-label",children:"Agents"}),at.map((V,ce)=>{const ve=he(V),Ie=we(V),rt=String(V.displayPassword||"").trim().toUpperCase()||"—",ut=String(V.phoneNumber||"").trim()||"—",et=Ze(V);return e.jsxs("button",{type:"button",className:"admin-header-search-item search-item-agent",onMouseDown:A=>A.preventDefault(),onClick:()=>lt(V),children:[e.jsxs("span",{className:"search-item-user-wrap",children:[e.jsx("span",{className:"search-item-user",children:String(V.username||"").toUpperCase()}),e.jsx("span",{className:"search-item-role-badge",children:et})]}),e.jsx("span",{className:"search-item-pass",children:rt}),e.jsxs("span",{className:"search-item-name-wrap",children:[e.jsx("span",{className:"search-item-name",children:Ie||"—"}),e.jsx("span",{className:"search-item-phone",children:ut})]})]},`agent-${String(ve||V.username||ce)}`)})]}):e.jsx("div",{className:"admin-header-search-empty",children:"No matching results"})})]}),y&&e.jsxs("div",{className:`admin-header-selected-player ${y.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("div",{className:"selected-player-main",children:[e.jsx("span",{className:"selected-player-user",children:String(y.username||"").toUpperCase()}),y.isDuplicatePlayer&&e.jsx("span",{className:"search-item-dup-badge",children:"Duplicate Player"})]}),e.jsx("span",{className:"selected-player-name",children:we(y)||"—"})]})]})]}),e.jsx("div",{className:"admin-header-right",children:e.jsxs("div",{className:"header-actions",children:[e.jsxs("button",{type:"button",className:"user-chip",onClick:()=>l(),title:"Open agent tree","aria-expanded":m,children:[e.jsxs("span",{className:"user-chip-desktop",children:[X,": ",d]}),e.jsx("span",{className:"user-chip-mobile",children:me}),e.jsx("span",{className:`user-chip-caret ${m?"open":""}`,"aria-hidden":"true",children:"▼"})]}),e.jsxs("div",{className:"power-menu-wrap",children:[e.jsx("button",{type:"button",className:"power-logout-btn",onClick:()=>N(V=>!V),"aria-label":"Open account menu","aria-expanded":h,title:"Account menu",children:"⏻"}),h&&e.jsxs("div",{className:"dropdown-menu user-chip-menu",children:[e.jsxs("button",{type:"button",onClick:()=>{N(!1),le("profile")},children:[e.jsx("i",{className:"fa-solid fa-user","aria-hidden":"true"}),"Profile"]}),e.jsxs("button",{type:"button",onClick:()=>{N(!1),le("settings")},children:[e.jsx("i",{className:"fa-solid fa-gear","aria-hidden":"true"}),"Settings"]}),x&&e.jsxs("button",{type:"button",onClick:()=>{N(!1),g?.()},children:[e.jsx("i",{className:"fa-solid fa-arrow-rotate-left","aria-hidden":"true"}),"Back to ",v]}),e.jsxs("button",{type:"button",className:"power-menu-logout",onClick:()=>{N(!1),P()},children:[e.jsx("i",{className:"fa-solid fa-right-from-bracket","aria-hidden":"true"}),"Log out"]})]})]})]})})]}),k&&e.jsxs("div",{className:"mobile-player-search-sheet",role:"dialog","aria-label":"Player search",children:[e.jsxs("form",{className:"mobile-player-search-form",onSubmit:ht,children:[e.jsx("span",{className:"search-icon","aria-hidden":"true",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})}),e.jsx("input",{type:"text",autoFocus:!0,placeholder:"Search players & agents...",value:D,style:{textTransform:"uppercase"},onChange:V=>{const ce=V.target.value.toUpperCase();F(ce),ce.trim()===""&&K(null)}}),e.jsx("button",{type:"button",className:"mobile-player-search-close",onClick:()=>G(!1),"aria-label":"Close player search",children:"✕"})]}),y&&e.jsxs("div",{className:`mobile-player-selected-card ${y.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("div",{className:"selected-player-main",children:[e.jsx("span",{className:"selected-player-user",children:String(y.username||"").toUpperCase()}),y.isDuplicatePlayer&&e.jsx("span",{className:"search-item-dup-badge",children:"Duplicate Player"})]}),e.jsx("span",{className:"selected-player-name",children:we(y)||"—"})]}),e.jsx("div",{className:"mobile-player-search-results",children:Xe?St?e.jsxs(e.Fragment,{children:[He.length>0&&at.length>0&&e.jsx("div",{className:"search-section-label",children:"Players"}),He.map((V,ce)=>{const ve=he(V),Ie=we(V),rt=String(V.displayPassword||"").trim().toUpperCase()||"—",ut=String(V.phoneNumber||"").trim()||"—",et=Ye(V);return e.jsxs("button",{type:"button",className:`mobile-player-search-item ${V.isDuplicatePlayer?"is-duplicate-player":""}`,onClick:()=>bt(V,!0),children:[e.jsxs("span",{className:"search-item-user-wrap",children:[e.jsx("span",{className:"search-item-user",children:String(V.username||"").toUpperCase()}),V.isDuplicatePlayer&&e.jsx("span",{className:"search-item-dup-badge",children:"Duplicate Player"})]}),e.jsx("span",{className:"search-item-pass",children:rt}),e.jsxs("span",{className:"search-item-name-wrap",children:[e.jsx("span",{className:"search-item-name",children:Ie||"—"}),e.jsx("span",{className:"search-item-phone",children:ut}),V.isDuplicatePlayer&&et&&e.jsx("span",{className:"search-item-dup-reason",children:et})]})]},`player-${String(ve||V.username||ce)}`)}),He.length>0&&at.length>0&&e.jsx("div",{className:"search-section-label",children:"Agents"}),at.map((V,ce)=>{const ve=he(V),Ie=we(V),rt=String(V.displayPassword||"").trim().toUpperCase()||"—",ut=String(V.phoneNumber||"").trim()||"—",et=Ze(V);return e.jsxs("button",{type:"button",className:"mobile-player-search-item search-item-agent",onClick:()=>lt(V,!0),children:[e.jsxs("span",{className:"search-item-user-wrap",children:[e.jsx("span",{className:"search-item-user",children:String(V.username||"").toUpperCase()}),e.jsx("span",{className:"search-item-role-badge",children:et})]}),e.jsx("span",{className:"search-item-pass",children:rt}),e.jsxs("span",{className:"search-item-name-wrap",children:[e.jsx("span",{className:"search-item-name",children:Ie||"—"}),e.jsx("span",{className:"search-item-phone",children:ut})]})]},`agent-${String(ve||V.username||ce)}`)})]}):e.jsx("div",{className:"admin-header-search-empty",children:"No matching results"}):null})]}),f&&e.jsxs("div",{className:"admin-header-bottom",children:[e.jsxs("div",{className:"admin-stats-grid",children:[e.jsxs("div",{className:"stat-group stat-group-green",children:[e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>i?.("weekly-figures",{timePeriod:"this-week",playerFilter:"active-week",openDropdown:"period",actorLabel:d}),"aria-label":`Open weekly reports week selector for ${d}`,children:[e.jsx("span",{className:"stat-label",children:"Week"}),e.jsx("span",{className:`stat-value ${te(c.weekNet)}`,children:Z(c.weekNet)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Today"}),e.jsx("span",{className:`stat-value ${te(c.todayNet)}`,children:Z(c.todayNet)})]})]}),R!=="agent"&&R!=="master_agent"&&R!=="super_agent"&&e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>i?.("weekly-figures",{timePeriod:"this-week",playerFilter:"active-week",actorLabel:d}),"aria-label":`Open weekly figures for ${d} active players this week`,children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:Oe(c.activeAccounts)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Player Fees"}),e.jsx("span",{className:"stat-value",children:Z(Ft)})]})]}),(R==="master_agent"||R==="super_agent")&&e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>i?.("weekly-figures",{timePeriod:"this-week",playerFilter:"active-week",actorLabel:d}),"aria-label":`Open weekly figures for ${d} active players this week`,children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:Oe(c.activeAccounts)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"My Settlement to House"}),e.jsx("span",{className:`stat-value ${te(Mt)}`,children:Z(Mt)})]})]}),R==="agent"&&e.jsx("div",{className:"summary-section weekly-settlement-section dashboard-settlement",children:e.jsxs("div",{className:"weekly-settlement-grid",children:[e.jsxs("div",{className:"stat-group stat-group-green",children:[e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>{typeof i=="function"&&i("transaction-history",{enteredBy:d,collectionType:"agent"})},"aria-label":"View agent collection transactions",children:[e.jsx("span",{className:"stat-label",children:"Agent Collections"}),e.jsx("span",{className:`stat-value ${te(ke)}`,children:Z(ke)})]}),e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>{typeof i=="function"&&i("transaction-history",{enteredBy:"HOUSE",collectionType:"house"})},"aria-label":"View house collection transactions",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${te(ge)}`,children:Z(ge)})]}),Ke>0&&Te>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Makeup"}),e.jsx("span",{className:"stat-value negative",children:Z(-Ke)})]})]}),e.jsxs("div",{className:"stat-group stat-group-yellow",children:[yt>0?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Gross Collections"}),e.jsx("span",{className:`stat-value ${te(Ne)}`,children:Z(Ne)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Makeup"}),e.jsx("span",{className:"stat-value negative",children:Z(-yt)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${te(It)}`,children:Z(It)})]})]}):e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${te(Ne)}`,children:Z(Ne)})]}),vt>0&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Agent Split",kt!=null?` ${kt}%`:""]}),e.jsx("span",{className:`stat-value ${te(vt)}`,children:Z(vt)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Kick to House",Nt!=null?` ${Nt}%`:""]}),e.jsx("span",{className:`stat-value ${te(st)}`,children:Z(st)})]})]})]}),e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>i?.("weekly-figures",{timePeriod:"this-week",playerFilter:"active-week",actorLabel:d}),"aria-label":`Open weekly figures for ${d} active players this week`,children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:Oe(c.activeAccounts)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Player Fees"}),e.jsx("span",{className:"stat-value",children:Z(c.totalPlayerFees??0)})]})]}),e.jsxs("div",{className:"stat-group stat-group-salmon",children:[Te>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Remaining Makeup"}),e.jsx("span",{className:"stat-value negative",children:Z(-Te)})]}),jt!==0&&e.jsxs("button",{type:"button",className:"stat-row stat-row-button",onClick:()=>{typeof i=="function"&&i("weekly-figures",{timePeriod:"last-week",playerFilter:"all-players",actorLabel:d})},"aria-label":"View last week figures",children:[e.jsx("span",{className:"stat-label",children:"Previous Balance"}),e.jsx("span",{className:`stat-value ${te(jt)}`,children:Z(jt)})]}),$t>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Profit"}),e.jsx("span",{className:`stat-value ${te($t)}`,children:Z($t)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${te(-ge)}`,children:Z(-ge)})]}),Rt!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Payments"}),e.jsx("span",{className:`stat-value ${te(-Rt)}`,children:Z(-Rt)})]}),e.jsxs("button",{type:"button",className:"stat-row stat-row-button stat-row-total",onClick:()=>{if(typeof i!="function")return;const V=O?.id?String(O.id):"";V&&i("user-details",V,{autoOpenDeposit:!0})},"aria-label":"Open my agent profile and start a new deposit",children:[e.jsx("span",{className:"stat-label",children:"Balance Owed / House Money"}),e.jsx("span",{className:`stat-value ${te(Mt)}`,children:Z(Mt)})]})]})]})})]}),!1,(R==="admin"||R==="master_agent"||R==="super_agent")&&e.jsx(jl,{onSelectAgent:V=>{p&&p(V)},onWeekChange:(V,ce)=>{Y(ce?null:V)}})]}),m&&e.jsx(gl,{onClose:()=>u(!1),initialQuery:C,onRestoreBaseContext:g,canRestoreBaseContext:x,baseContextLabel:v,onGo:(V,ce)=>{u(!1),p&&p(V,ce)}})]})}function Al({activeView:a,onViewChange:n,onOpenScoreboard:i,isOpen:p,onRequestClose:g,role:x="admin",permissions:v=null}){const w=x||"admin",f=nr.filter(B=>B.showInSidebar&&B.roles&&B.roles.includes(w)&&Ta(w,v,B.id));return e.jsxs("aside",{className:`admin-sidebar ${p?"open":""}`,"aria-hidden":!p,children:[e.jsxs("div",{className:"sidebar-mobile-header",children:[e.jsx("span",{children:"Navigation"}),e.jsx("button",{type:"button",className:"sidebar-close-btn",onClick:g,"aria-label":"Close menu",children:"×"})]}),e.jsx("nav",{className:"sidebar-nav",children:f.map(B=>e.jsxs("button",{className:`nav-item ${a===B.id?"active":""}`,"aria-current":a===B.id?"page":void 0,onClick:()=>{if(B.id==="scores"&&typeof i=="function"){i();return}n(B.id)},title:B.label,children:[e.jsx("span",{className:"nav-icon",children:B.sidebarIcon}),e.jsx("span",{className:"nav-label",children:B.label})]},B.id))})]})}const Ja=[{value:"this-week",label:"This Week"},{value:"last-week",label:"Last Week"},...Array.from({length:16},(a,n)=>{const i=n+2;return{value:`weeks-ago-${i}`,label:`${i} Week's ago`}})],Sn="this-week",kn="active-week",Pl=null,Za=[{value:"all-players",label:"All Players",description:"Shows all players in the selected week scope."},{value:"active-week",label:"Active For The Week",description:"Shows only active players for the selected week."},{value:"with-balance",label:"With A Balance",description:"Shows only players with a balance."},{value:"big-figures",label:"Big Figures",description:"Shows players with absolute balance greater than $1,000 (winners and losers)."},{value:"over-settle-winners",label:"Over Settle Winners",description:"Shows over-settle winners."},{value:"over-settle-losers",label:"Over Settle Losers",description:"Shows over-settle losers."},{value:"inactive-losers-14d",label:"Inactive Losers 14 Days",description:"Shows only inactive losers from the last 14 days."}],ma=a=>{const n=Number(a);if(Number.isFinite(n))return n;if(typeof a=="string"){const i=a.replace(/[^0-9.-]/g,""),p=Number(i);if(Number.isFinite(p))return p}return 0},Ss=a=>{const n=a?.lifetimePerformance??a?.lifetimePlusMinus??a?.lifetime??0;return ma(n)},Cn=(a,n,i)=>{if(!Array.isArray(a)||a.length===0)return n;const p=a.findIndex(v=>v.value===n),x=((p>=0?p:0)+i+a.length)%a.length;return a[x]?.value??n},An=a=>{const n=String(a||"").trim().toLowerCase();return n==="period"||n==="filter"?n:Pl};function Ll({onViewChange:a=null,viewContext:n=null}){const[i,p]=t.useState(()=>String(n?.timePeriod||Sn)),[g,x]=t.useState(()=>String(n?.playerFilter||kn)),[v,w]=t.useState(()=>An(n?.openDropdown)),[f,B]=t.useState(null),[h,N]=t.useState(null),[m,u]=t.useState(null),[k,G]=t.useState([]),[D,F]=t.useState(0),[C,j]=t.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[W,r]=t.useState(!0),[M,T]=t.useState(""),o=t.useRef(null),U=t.useMemo(()=>new Intl.Collator(void 0,{numeric:!0,sensitivity:"base"}),[]),ae=String(n?.summaryFocus||"").trim().toLowerCase(),z=String(n?.actorLabel||"").trim().toUpperCase(),y=ae==="agent-collections",K=ae==="house-collections",c=y||K,E=d=>{if(d==null)return null;const R=Number(d);if(Number.isNaN(R))return null;const X=Math.round(R);return Object.is(X,-0)?0:X},O=d=>{const R=E(d);return R===null?"—":R.toLocaleString("en-US")},_=d=>{const R=E(d);return R===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format(R)},H=d=>{const R=E(d);return R===null||R===0?"is-neutral":R>0?"is-positive":"is-negative"},de=d=>{const R=E(d);return R===null||R===0?"neutral":R>0?"positive":"negative"},De=d=>{if(typeof d?.inactive14Days=="boolean")return d.inactive14Days;const R=d?.lastActive||d?.lastBetAt||d?.updatedAt||"",X=Date.parse(String(R||""));if(Number.isNaN(X))return!1;const me=336*60*60*1e3;return Date.now()-X>=me},Y=d=>{if(typeof d?.activeForWeek=="boolean")return d.activeForWeek;const R=Number(d?.week||0);return Array.isArray(d?.daily)?d.daily.some(X=>Math.abs(Number(X||0))>.01):Math.abs(R)>.01},$=d=>y?ma(d?.agentCollections??0):K?ma(d?.houseCollections??0):0;t.useEffect(()=>{(async()=>{const R=localStorage.getItem("token");if(!R){T("Please login to view weekly figures."),r(!1);return}try{r(!0);const X=await Jr(i,R);B(X.summary),N(X.settlement||null),u(X.startDate&&X.endDate?{start:X.startDate,end:X.endDate}:null),G(X.customers||[]),T("")}catch(X){console.error("Failed to fetch weekly figures:",X),T(X.message||"Failed to load weekly figures")}finally{r(!1)}})()},[i]),t.useEffect(()=>{!n||typeof n!="object"||(p(String(n?.timePeriod||Sn)),x(String(n?.playerFilter||kn)),F(0),w(An(n?.openDropdown)))},[n]),t.useEffect(()=>{const d=()=>{j(window.innerWidth<=768)};return window.addEventListener("resize",d),()=>window.removeEventListener("resize",d)},[]),t.useEffect(()=>{const d=R=>{o.current&&(o.current.contains(R.target)||w(null))};return document.addEventListener("mousedown",d),document.addEventListener("touchstart",d),()=>{document.removeEventListener("mousedown",d),document.removeEventListener("touchstart",d)}},[]);const ee=t.useMemo(()=>Ia(k),[k]),fe=g==="all-players",Z=d=>{const R=Number(d.balance||0),X=Math.abs(Number(d.settleLimit??d.balanceOwed??0)),me=Y(d);return g==="all-players"?!0:g==="with-balance"?Math.abs(R)>.01:g==="active-week"?me:g==="big-figures"?Math.abs(R)>1e3:g==="over-settle-winners"?X<=.01?!1:R>=X:g==="over-settle-losers"?X<=.01?!1:R<=-X:g==="inactive-losers-14d"?De(d)&&R<-.01:!0},te=t.useMemo(()=>ee.map(d=>({...d,matchesSelectedFilter:Z(d)})),[ee,g]),Oe=t.useMemo(()=>{const d=fe?te:te.filter(R=>R.matchesSelectedFilter);return c?d.filter(R=>Math.abs($(R))>.01):d},[te,$,fe,c]),P=t.useMemo(()=>(d,R)=>{const X=String(d?.username||""),me=String(R?.username||""),ke=U.compare(X,me);if(c){const ge=Math.abs($(R))-Math.abs($(d));return ge!==0?ge:ke}if(fe)return ke;if(g==="over-settle-winners"){const ge=Number(R?.balance||0)-Number(d?.balance||0);return ge!==0?ge:ke}if(g==="over-settle-losers"||g==="inactive-losers-14d"){const ge=Math.abs(Number(R?.balance||0))-Math.abs(Number(d?.balance||0));return ge!==0?ge:ke}if(g==="big-figures"){const ge=Math.abs(Number(R?.balance||0))-Math.abs(Number(d?.balance||0));return ge!==0?ge:ke}return ke},[U,$,fe,c,g]),le=t.useMemo(()=>[...Oe].sort(P),[P,Oe]),l=d=>{!d||typeof a!="function"||a("user-details",d)},q=Za.find(d=>d.value===g)||Za[0],re=Ja.find(d=>d.value===i)||Ja[0],he=Array.isArray(f?.days)?f.days:[];t.useEffect(()=>{if(!Array.isArray(he)||he.length===0){F(0);return}F(d=>d<0?0:d>he.length-1?he.length-1:d)},[he]);const we=t.useMemo(()=>le.map(d=>{const R=Array.isArray(d?.agentHierarchy)?d.agentHierarchy.map(ke=>String(ke||"").trim().toUpperCase()).filter(Boolean):[],X=String(d?.agentUsername||"").trim().toUpperCase()||(R.length>0?R[R.length-1]:""),me=String(d?.agentHierarchyPath||"").trim().toUpperCase()||(R.length>0?R.join(" / "):X||"UNASSIGNED");return{...d,hierarchy:{path:me,directAgent:X}}}),[le]),Se=t.useMemo(()=>{const d=new Map;we.forEach(X=>{const me=X.hierarchy||{},ke=String(me.path||"UNASSIGNED"),ge=ke;d.has(ge)||d.set(ge,{key:ge,hierarchyLabel:ke,customers:[]}),d.get(ge).customers.push(X)});let R=Array.from(d.values());return R.forEach(X=>{X.customers=[...X.customers].sort(P)}),R=R.sort((X,me)=>U.compare(X.hierarchyLabel,me.hierarchyLabel)),R=R.map(X=>{const me=X.customers.reduce((Ne,Te)=>{const Ke=Number(Te?.daily?.[D]??0);return Ne+(Number.isNaN(Ke)?0:Ke)},0),ke=X.customers.reduce((Ne,Te)=>{const Ke=ma(Te?.balance??0);return Ne+(Number.isNaN(Ke)?0:Ke)},0),ge=X.customers.reduce((Ne,Te)=>{const Ke=Ss(Te);return Ne+(Number.isNaN(Ke)?0:Ke)},0);return{...X,totals:{players:X.customers.length,day:me,balance:ke,lifetime:ge}}}),R},[U,P,we,D]),Je=he[D]?.day||"Day",ze=he.length>0?Je:"Selected Metric",Ye=d=>{!Array.isArray(he)||he.length===0||F(R=>{const X=R+d;return X<0?he.length-1:X>=he.length?0:X})},dt=d=>{p(R=>Cn(Ja,R,d)),w(null)},tt=d=>{x(R=>Cn(Za,R,d)),w(null)},Ze=d=>{w(R=>R===d?null:d)},$e=d=>{p(d),w(null)},ht=d=>{x(d),w(null)},bt=d=>{if(!Array.isArray(d?.daily)||d.daily.length===0)return 0;const R=Number(d.daily[D]??0);return Number.isNaN(R)?0:R},lt=d=>O(d),Ve=t.useMemo(()=>le,[le]),He=t.useMemo(()=>{const d=z||"THIS AGENT";return ae==="agent-collections"?`Opened from Agent Collections for ${d}. Showing This Week collections automatically.`:ae==="house-collections"?`Opened from House Collection for ${d}. Showing This Week collections automatically.`:""},[z,ae]),at=t.useMemo(()=>{if(!c)return null;const d=Ve.reduce((R,X)=>R+$(X),0);return{label:y?"Agent Collections":"House Collection",count:Ve.length,total:d}},[$,y,c,Ve]),Xe=t.useMemo(()=>{const d=Ve.length,R=Ve.reduce((ke,ge)=>ke+bt(ge),0),X=Ve.reduce((ke,ge)=>ke+ma(ge?.balance??0),0),me=Ve.reduce((ke,ge)=>ke+Ss(ge),0);return{playerCount:d,selectedMetricTotal:R,balanceTotal:X,lifetimeTotal:me}},[Ve,D]),St=()=>e.jsxs("div",{className:"weekly-mobile-inline-day",children:[e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>Ye(-1),"aria-label":"Previous day",children:e.jsx("i",{className:"fa-solid fa-caret-left","aria-hidden":"true"})}),e.jsx("span",{children:Je}),e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>Ye(1),"aria-label":"Next day",children:e.jsx("i",{className:"fa-solid fa-caret-right","aria-hidden":"true"})})]});return e.jsxs("div",{className:"admin-view weekly-figures-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Weekly Figures - Customer Tracking"}),e.jsxs("div",{className:"period-filter",ref:o,children:[e.jsxs("div",{className:`period-filter-control weekly-period-select${v==="period"?" is-open":""}`,role:"group","aria-label":"Week period control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Ze("period"),"aria-label":"Open week period options","aria-haspopup":"listbox","aria-expanded":v==="period",children:e.jsx("span",{className:"period-filter-value",children:re.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>dt(-1),"aria-label":"Previous week period",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>dt(1),"aria-label":"Next week period",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),v==="period"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Week period options",children:Ja.map(d=>e.jsx("button",{type:"button",className:`period-filter-menu-item${d.value===i?" is-selected":""}`,onClick:()=>$e(d.value),children:d.label},d.value))})]}),e.jsxs("div",{className:`period-filter-control weekly-filter-select${v==="filter"?" is-open":""}`,role:"group","aria-label":"Player filter control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Ze("filter"),"aria-label":"Open player filter options","aria-haspopup":"listbox","aria-expanded":v==="filter",children:e.jsx("span",{className:"period-filter-value",children:q.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>tt(-1),"aria-label":"Previous player filter",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>tt(1),"aria-label":"Next player filter",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),v==="filter"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Player filter options",children:Za.map(d=>e.jsx("button",{type:"button",className:`period-filter-menu-item${d.value===g?" is-selected":""}`,onClick:()=>ht(d.value),children:d.label},d.value))})]})]})]}),e.jsxs("div",{className:"view-content",children:[He&&e.jsx("div",{className:"weekly-focus-banner",children:He}),at&&e.jsxs("div",{className:"weekly-focus-banner",children:[at.label,": ",at.count," player",at.count===1?"":"s"," matched, total ",O(at.total)]}),W&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading weekly figures..."}),M&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:M}),!W&&!M&&f&&e.jsxs(e.Fragment,{children:[h&&m&&e.jsxs("div",{className:"summary-section weekly-settlement-section",children:[e.jsx("div",{className:"summary-header",children:e.jsxs("h3",{children:[new Date(m.start).toLocaleDateString("en-US",{month:"numeric",day:"numeric"})," – ",(()=>{const d=new Date(m.end);return d.setDate(d.getDate()-1),d.toLocaleDateString("en-US",{month:"numeric",day:"numeric"})})()," Report"]})}),e.jsxs("div",{className:"weekly-settlement-grid",children:[e.jsxs("div",{className:"stat-group stat-group-green",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Agent Collections"}),e.jsx("span",{className:`stat-value ${de(h.agentCollections)}`,children:_(h.agentCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${de(h.houseCollections)}`,children:_(h.houseCollections)})]}),Number(h.previousMakeup||0)>0&&Number(h.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Makeup"}),e.jsx("span",{className:"stat-value negative",children:_(-h.previousMakeup)})]})]}),e.jsxs("div",{className:"stat-group stat-group-yellow",children:[Number(h.makeupReduction||0)>0?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Gross Collections"}),e.jsx("span",{className:`stat-value ${de(h.netCollections)}`,children:_(h.netCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Makeup Cleared"}),e.jsx("span",{className:"stat-value negative",children:_(-h.makeupReduction)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${de(h.commissionableProfit)}`,children:_(h.commissionableProfit)})]})]}):e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${de(h.netCollections)}`,children:_(h.netCollections)})]}),Number(h.agentSplit||0)>0&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Agent Split",h.agentPercent!=null?` ${h.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${de(h.agentSplit)}`,children:_(h.agentSplit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Kick to House",h.agentPercent!=null?` ${100-h.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${de(h.kickToHouse)}`,children:_(h.kickToHouse)})]})]})]}),e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:h.activePlayers})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Player Fees"}),e.jsx("span",{className:"stat-value",children:_(h.totalPlayerFees)})]})]}),e.jsxs("div",{className:"stat-group stat-group-salmon",children:[Number(h.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Remaining Makeup"}),e.jsx("span",{className:"stat-value negative",children:_(-h.cumulativeMakeup)})]}),Number(h.previousBalanceOwed||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Balance"}),e.jsx("span",{className:`stat-value ${de(h.previousBalanceOwed)}`,children:_(h.previousBalanceOwed)})]}),Number(h.houseProfit||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Profit"}),e.jsx("span",{className:`stat-value ${de(h.houseProfit)}`,children:_(h.houseProfit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${de(-h.houseCollections)}`,children:_(-h.houseCollections)})]}),Number(h.fundingAdjustment||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Payments"}),e.jsx("span",{className:`stat-value ${de(-h.fundingAdjustment)}`,children:_(-h.fundingAdjustment)})]}),e.jsxs("div",{className:"stat-row stat-row-total",children:[e.jsx("span",{className:"stat-label",children:"Balance Owed / House Money"}),e.jsx("span",{className:`stat-value ${de(h.balanceOwed)}`,children:_(h.balanceOwed)})]})]})]})]}),e.jsxs("div",{className:"summary-section",children:[e.jsx("div",{className:"summary-header",children:e.jsx("h3",{children:"Summary"})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table customer-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Summary"}),e.jsx("th",{children:ze}),e.jsx("th",{children:"Balance"})]})}),e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsxs("td",{children:[Xe.playerCount," ",g==="active-week"?"Active Players":"Players"]}),e.jsx("td",{className:`weekly-amount ${H(Xe.selectedMetricTotal)}`,children:O(Xe.selectedMetricTotal)}),e.jsx("td",{className:`weekly-amount ${H(Xe.balanceTotal)}`,children:O(Xe.balanceTotal)})]})})]})})]}),e.jsxs("div",{className:"customer-section",children:[e.jsx("div",{className:"section-header",children:e.jsx("h3",{children:q.label})}),e.jsx("div",{className:"weekly-mobile-customer-shell",children:e.jsx("div",{className:"weekly-mobile-groups",children:Se.length>0?Se.map(d=>{const R=g==="over-settle-winners"||g==="over-settle-losers";return e.jsxs("section",{className:`weekly-mobile-group weekly-mobile-table-block${R?" weekly-mobile-has-lifetime":""}`,children:[e.jsx("div",{className:"weekly-mobile-hierarchy",children:d.hierarchyLabel}),e.jsxs("div",{className:"weekly-mobile-table-head",children:[e.jsx("span",{children:"Customer"}),e.jsx("div",{className:"weekly-mobile-table-day-head",children:St()}),e.jsx("span",{children:"Balance"}),R&&e.jsx("span",{className:"weekly-mobile-lifetime-head",children:"Lifetime"})]}),e.jsxs("div",{className:"weekly-mobile-rows",children:[d.customers.map((X,me)=>{const ke=bt(X),ge=ma(X?.balance??0),Ne=ke,Te=ge,Ke=Ss(X);return e.jsxs("div",{className:`weekly-mobile-table-row ${X.isDuplicatePlayer?"weekly-duplicate-row":""}`,children:[e.jsxs("div",{className:"weekly-mobile-customer-cell weekly-mobile-user",children:[X.id&&typeof a=="function"?e.jsx("button",{type:"button",className:"customer-username customer-username-button",onClick:()=>l(X.id),children:X.username}):e.jsx("strong",{className:"customer-username",children:X.username}),e.jsx("span",{className:"weekly-mobile-fullname",children:X.name||"—"}),X.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"})]}),e.jsx("div",{className:`weekly-mobile-day-cell ${H(Ne)}`,children:lt(Ne)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${H(Te)}`,children:e.jsx("span",{className:"weekly-mobile-balance-value",children:lt(Te)})}),R&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${H(Ke)}`,children:lt(Ke)})]},`${d.key}-${String(X.id||X.username||me)}`)}),e.jsxs("div",{className:"weekly-mobile-table-row weekly-mobile-group-total-row",children:[e.jsx("div",{className:"weekly-mobile-customer-cell",children:e.jsxs("strong",{children:[d.totals.players," Players"]})}),e.jsx("div",{className:`weekly-mobile-day-cell ${H(d.totals.day)}`,children:lt(d.totals.day)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${H(d.totals.balance)}`,children:lt(d.totals.balance)}),R&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${H(d.totals.lifetime)}`,children:lt(d.totals.lifetime)})]})]})]},d.key)}):e.jsx("div",{className:"weekly-empty-state",children:"No players matched this filter."})})})]})]})]})]})}function Dl(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(null),[f,B]=t.useState("all");t.useEffect(()=>{(async()=>{const F=localStorage.getItem("token");if(!F){x("Please login to view pending items."),p(!1);return}try{p(!0);const[C,j]=await Promise.all([Zr(F),rs({status:"pending",limit:300},F)]),W=Array.isArray(C)?C.map(T=>({id:`transaction-${T.id}`,entityId:T.id,source:"transaction",type:T.type||"transaction",details:"Pending wallet/payment transaction",amount:Number(T.amount||0),user:T.user||"Unknown",date:T.date||null,status:T.status||"pending"})):[],M=[...Array.isArray(j?.bets)?j.bets.map(T=>({id:`bet-${T.id}`,entityId:T.id,source:"sportsbook",type:T.type||"bet",details:T.match?.homeTeam&&T.match?.awayTeam?`${T.match.homeTeam} vs ${T.match.awayTeam}`:T.description||"Pending sportsbook bet",amount:Number(T.risk||T.amount||0),user:T.customer||T.username||"Unknown",date:T.createdAt||null,status:T.status||"pending"})):[],...W].sort((T,o)=>{const U=T.date?new Date(T.date).getTime():0;return(o.date?new Date(o.date).getTime():0)-U});n(M),x("")}catch(C){console.error("Failed to load pending items:",C),x(C.message||"Failed to load pending items")}finally{p(!1)}})()},[]);const h=async D=>{const F=localStorage.getItem("token");if(!F){x("Please login to approve items.");return}try{w(D),await Xr(D,F),n(C=>C.filter(j=>j.entityId!==D))}catch(C){x(C.message||"Failed to approve item")}finally{w(null)}},N=async D=>{const F=localStorage.getItem("token");if(!F){x("Please login to decline items.");return}try{w(D),await ei(D,F),n(C=>C.filter(j=>j.entityId!==D))}catch(C){x(C.message||"Failed to decline item")}finally{w(null)}},m=D=>{if(D==null)return"—";const F=Number(D);return Number.isNaN(F)?"—":`$${Math.round(F)}`},u=D=>{if(!D)return"—";const F=new Date(D);return Number.isNaN(F.getTime())?"—":F.toLocaleString()},k=f==="all"?a:a.filter(D=>D.source===f),G=a.reduce((D,F)=>(D[F.source]=(D[F.source]||0)+1,F.source==="sportsbook"&&(D.betExposure+=Number(F.amount||0)),D),{sportsbook:0,transaction:0,betExposure:0});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Pending Items"}),e.jsxs("p",{className:"count",children:[a.length," pending items"]})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading pending items..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Pending"}),e.jsx("div",{className:"amount",children:a.length}),e.jsx("p",{className:"change",children:"Transactions + sportsbook bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Bets"}),e.jsx("div",{className:"amount",children:G.sportsbook}),e.jsx("p",{className:"change",children:"Sportsbook tickets awaiting settlement"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("div",{className:"amount",children:G.transaction}),e.jsx("p",{className:"change",children:"Wallet/payment approvals"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bet Exposure"}),e.jsx("div",{className:"amount",children:m(G.betExposure)}),e.jsx("p",{className:"change",children:"Risk currently locked in pending bets"})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Source"}),e.jsxs("select",{value:f,onChange:D=>B(D.target.value),children:[e.jsx("option",{value:"all",children:"All Pending Items"}),e.jsx("option",{value:"sportsbook",children:"Sportsbook Bets"}),e.jsx("option",{value:"transaction",children:"Transactions"})]})]})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Details"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:k.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No pending items found."})}):k.map(D=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`badge ${D.source}`,children:D.source})}),e.jsx("td",{children:D.type}),e.jsx("td",{children:D.details}),e.jsx("td",{children:m(D.amount)}),e.jsx("td",{children:D.user}),e.jsx("td",{children:u(D.date)}),e.jsx("td",{children:e.jsx("span",{className:"badge pending",children:D.status})}),e.jsx("td",{children:D.source==="transaction"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-approve",onClick:()=>h(D.entityId),disabled:v===D.entityId,children:v===D.entityId?"Working...":"Approve"}),e.jsx("button",{className:"btn-small btn-decline",onClick:()=>N(D.entityId),disabled:v===D.entityId,children:v===D.entityId?"Working...":"Decline"})]}):e.jsx("span",{style:{color:"#6b7280",fontSize:"12px"},children:"Settles from sportsbook results"})})]},D.id))})]})})]})]})]})}function Tl(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(null);t.useEffect(()=>{(async()=>{const m=localStorage.getItem("token")||sessionStorage.getItem("token");if(!m){x("Please login to view messages."),p(!1);return}try{p(!0);const u=await ti(m);n(u||[]),x("")}catch(u){console.error("Failed to fetch messages:",u),x(u.message||"Failed to load messages")}finally{p(!1)}})()},[]);const f=async N=>{const m=localStorage.getItem("token")||sessionStorage.getItem("token");if(!m){x("Please login to reply.");return}const u=window.prompt("Enter your reply:");if(u)try{w(N),await ai(N,u,m),n(k=>k.map(G=>G.id===N?{...G,read:!0,replies:[...G.replies||[],{message:u,createdAt:new Date}]}:G))}catch(k){x(k.message||"Failed to send reply")}finally{w(null)}},B=async N=>{const m=localStorage.getItem("token")||sessionStorage.getItem("token");if(!m){x("Please login to delete messages.");return}try{w(N),await si(N,m),n(u=>u.filter(k=>k.id!==N))}catch(u){x(u.message||"Failed to delete message")}finally{w(null)}},h=async N=>{const m=localStorage.getItem("token")||sessionStorage.getItem("token");if(m)try{await ni(N,m),n(u=>u.map(k=>k.id===N?{...k,read:!0}:k))}catch(u){console.error("Failed to mark read:",u)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Messaging Center"}),e.jsxs("p",{className:"count",children:["Unread: ",a.filter(N=>!N.read).length]})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading messages..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"messaging-container",children:e.jsx("div",{className:"message-list",children:a.map(N=>e.jsxs("div",{className:`message-item ${N.read?"":"unread"}`,onClick:()=>h(N.id),children:[e.jsxs("div",{className:"message-header",children:[e.jsx("h4",{children:N.fromName}),e.jsx("span",{className:"date",children:new Date(N.createdAt).toLocaleString()})]}),e.jsx("p",{className:"subject",children:N.subject}),e.jsx("p",{className:"subject",style:{opacity:.8},children:N.body}),e.jsxs("div",{className:"message-actions",children:[e.jsx("button",{className:"btn-small",onClick:m=>{m.stopPropagation(),f(N.id)},disabled:v===N.id,children:v===N.id?"Working...":"Reply"}),e.jsx("button",{className:"btn-small",onClick:m=>{m.stopPropagation(),B(N.id)},disabled:v===N.id,children:v===N.id?"Working...":"Delete"})]})]},N.id))})})]})]})}function Il(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1),[f,B]=t.useState(!1),[h,N]=t.useState(!1),[m,u]=t.useState(null),[k,G]=t.useState({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),D=o=>{if(o==null)return"—";const U=Number(o);return Number.isNaN(U)?"—":`$${Math.round(U)}`},F=async()=>{const o=localStorage.getItem("token")||sessionStorage.getItem("token");if(!o){x("Please login to manage games."),p(!1);return}try{p(!0);const U=await is(o);n(U||[]),x("")}catch(U){console.error("Failed to load games:",U),x(U.message||"Failed to load games")}finally{p(!1)}};t.useEffect(()=>{F()},[]);const C=()=>{G({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),w(!0)},j=o=>{u(o),G({homeTeam:o.homeTeam,awayTeam:o.awayTeam,sport:o.sport,startTime:new Date(o.startTime).toISOString().slice(0,16),status:o.status}),B(!0)},W=o=>{u(o),N(!0)},r=o=>{const{name:U,value:ae}=o.target;G(z=>({...z,[U]:ae}))},M=async o=>{o.preventDefault();const U=localStorage.getItem("token")||sessionStorage.getItem("token");if(!U){x("Please login to add games.");return}try{const ae={...k,startTime:new Date(k.startTime).toISOString()},z=await Hn(ae,U);n(y=>[...y,{id:z.id,homeTeam:z.homeTeam,awayTeam:z.awayTeam,sport:z.sport,startTime:z.startTime,status:z.status,activeBets:0,revenue:0}]),w(!1)}catch(ae){x(ae.message||"Failed to create match")}},T=async o=>{o.preventDefault();const U=localStorage.getItem("token")||sessionStorage.getItem("token");if(!U){x("Please login to update games.");return}try{const ae={...k,startTime:new Date(k.startTime).toISOString()},z=await Gn(m.id,ae,U);n(y=>y.map(K=>K.id===m.id?{...K,homeTeam:z.homeTeam,awayTeam:z.awayTeam,sport:z.sport,startTime:z.startTime,status:z.status}:K)),B(!1)}catch(ae){x(ae.message||"Failed to update match")}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Game Administration"}),e.jsx("button",{className:"btn-primary",onClick:C,children:"Add New Game"})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Start Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Active Bets"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:a.map(o=>e.jsxs("tr",{children:[e.jsxs("td",{children:[o.homeTeam," vs ",o.awayTeam]}),e.jsx("td",{children:o.sport}),e.jsx("td",{children:new Date(o.startTime).toLocaleString()}),e.jsx("td",{children:e.jsx("span",{className:`badge ${o.status}`,children:o.status})}),e.jsx("td",{children:o.activeBets}),e.jsx("td",{children:D(o.revenue)}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>j(o),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>W(o),children:"View"})]})]},o.id))})]})})]}),v&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{children:"Add New Game"}),e.jsxs("form",{onSubmit:M,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:k.homeTeam,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:k.awayTeam,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:k.sport,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:k.startTime,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:k.status,onChange:r,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"})]})]})]})}),f&&m&&e.jsx("div",{className:"modal-overlay",onClick:()=>B(!1),children:e.jsxs("div",{className:"modal-content",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{children:"Edit Game"}),e.jsxs("form",{onSubmit:T,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:k.homeTeam,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:k.awayTeam,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:k.sport,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:k.startTime,onChange:r,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:k.status,onChange:r,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>B(!1),children:"Cancel"})]})]})]})}),h&&m&&e.jsx("div",{className:"modal-overlay",onClick:()=>N(!1),children:e.jsxs("div",{className:"modal-content",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{children:"Game Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Match:"})," ",m.homeTeam," vs ",m.awayTeam]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",m.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Start Time:"})," ",new Date(m.startTime).toLocaleString()]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",m.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Active Bets:"})," ",m.activeBets]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Revenue:"})," ",D(m.revenue)]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>N(!1),children:"Close"})})]})})]})}const Pn={game:"",username:"",userId:"",result:"",from:"",to:"",minWager:"",maxWager:""};function Ml(){const[a,n]=t.useState(Pn),[i,p]=t.useState([]),[g,x]=t.useState(null),[v,w]=t.useState([]),[f,B]=t.useState([]),[h,N]=t.useState({count:0,sample:[]}),[m,u]=t.useState(!0),[k,G]=t.useState(""),[D,F]=t.useState(1),[C,j]=t.useState({page:1,pages:1,total:0,limit:50}),[W,r]=t.useState(!1),[M,T]=t.useState(""),[o,U]=t.useState(null),ae=localStorage.getItem("token"),z=t.useCallback(async()=>{if(!ae){G("Please login to view casino bets."),u(!1);return}try{u(!0),G("");const[l,q]=await Promise.all([ri({...a,page:D,limit:50},ae),ii({game:a.game,from:a.from,to:a.to,result:a.result,username:a.username,userId:a.userId},ae)]);p(Array.isArray(l?.bets)?l.bets:[]),j(l?.pagination||{page:D,pages:1,total:0,limit:50}),x(q?.summary||null),w(Array.isArray(q?.byGame)?q.byGame:[]),B(Array.isArray(q?.byUser)?q.byUser:[]),N(q?.anomalies||{count:0,sample:[]})}catch(l){console.error("Failed to load admin casino data:",l),G(l.message||"Failed to load casino bets")}finally{u(!1)}},[ae,a,D]);t.useEffect(()=>{z()},[z]);const y=(l,q)=>{F(1),n(re=>({...re,[l]:q}))},K=async l=>{if(!(!l||!ae))try{r(!0),T("");const q=await oi(l,ae);U(q?.bet||null)}catch(q){T(q.message||"Failed to load round detail")}finally{r(!1)}},c=()=>{U(null),T("")},E=()=>{F(1),n(Pn)},O=l=>{const q=Number(l||0);return Number.isNaN(q)?"$0":`$${Math.round(q)}`},_=l=>l?new Date(l).toLocaleString():"—",H=l=>{switch(String(l||"").toLowerCase()){case"stud-poker":return"Stud Poker";case"roulette":return"Roulette";case"blackjack":return"Blackjack";case"baccarat":return"Baccarat";case"craps":return"Craps";case"arabian":return"Arabian Game";case"jurassic-run":return"Jurassic Run";case"arabian-treasure":return"Arabian Game";case"3card-poker":return"3-Card Poker";default:return l||"—"}},de=l=>{const q=String(l?.playerOutcome||"").trim();if(q)return q;const re=String(l?.roundStatus||"").toLowerCase();if(re&&re!=="settled")return"Pending";const he=Number(l?.netResult||0);return he>0?"Win":he<0?"Lose":"Push"},De=l=>String(l||"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"unknown",Y=l=>{if(!l)return"—";if(String(l.game||"").toLowerCase()==="roulette"&&l.rouletteOutcome){const q=l.rouletteOutcome.number??l.result,re=String(l.rouletteOutcome.color||"").trim();return re?`${q} ${re}`:`${q}`}if(String(l.game||"").toLowerCase()==="craps"){const q=l?.roundData?.dice,re=Number(q?.die1),he=Number(q?.die2),we=Number(q?.sum);if(Number.isFinite(re)&&Number.isFinite(he)&&Number.isFinite(we))return`${re}+${he}=${we}`}if(String(l.game||"").toLowerCase()==="arabian"){const q=Number(l?.roundData?.totalWin??l?.totalReturn??0),re=Number(l?.roundData?.bonusWin??0),he=Number(l?.roundData?.freeSpinsAwarded??0),we=[];if(q>0&&we.push(`Win ${O(q)}`),re>0&&we.push(`Bonus ${O(re)}`),he>0&&we.push(`+${he} FS`),we.length>0)return we.join(" | ")}if(String(l.game||"").toLowerCase()==="jurassic-run"){const q=Number(l?.roundData?.totalWin??l?.totalReturn??0),re=Number(l?.roundData?.jackpotPayout??0),he=Number(l?.roundData?.freeSpinsAwarded??0),we=!!l?.roundData?.isFreeSpinRound,Se=[];if(re>0?Se.push(`Jackpot ${O(re)}`):q>0&&Se.push(`Win ${O(q)}`),he>0&&Se.push(`+${he} FS`),Se.length>0)return Se.join(" | ");if(we)return"Free Spin"}if(String(l.game||"").toLowerCase()==="3card-poker"){const q=String(l?.roundData?.mainResultLabel||l?.result||"").trim(),re=String(l?.playerHand||l?.roundData?.playerHand||"").trim(),he=String(l?.dealerHand||l?.roundData?.dealerHand||"").trim(),we=[];return q&&we.push(q),re&&we.push(`P ${re}`),he&&we.push(`D ${he}`),we.length>0?we.join(" | "):"—"}return l.result||"—"},$=l=>{switch(String(l||"").toLowerCase()){case"server_rng":return"Server RNG";case"server_simulated_actions":return"Server Simulation";case"native_client_round":return"Client Native";case"client_actions_server_rules":return"Server Rules";case"":return"—";default:return l||"—"}},ee=l=>{const q=String(l?.label||"").trim();if(q)return q;const re=String(l?.type||"").trim(),he=String(l?.value||"").trim();return re&&he?`${re}:${he}`:re||"Bet"},fe=l=>Array.isArray(l?.bets)?l.bets.filter(q=>q&&typeof q=="object"):[],Z=l=>{const q=new Set(Array.isArray(l?.winningBetKeys)?l.winningBetKeys.map(re=>String(re)):[]);return fe(l).filter(re=>q.has(String(re?.key||"")))},te=l=>{const q=l?.bets&&typeof l.bets=="object"?l.bets:{};return Object.keys(q).filter(re=>Number(q[re])>0).sort().map(re=>({key:re,amount:Number(q[re])}))},Oe=l=>{const q=Number(l||0);return q>0?"casino-net-pill is-positive":q<0?"casino-net-pill is-negative":"casino-net-pill is-neutral"},P=l=>{const q=String(l||"");return q?`${q.slice(0,10)}…`:"—"},le=t.useMemo(()=>[{label:"Rounds",value:Number(g?.rounds||0).toLocaleString(),tone:"navy"},{label:"Total Wager",value:O(g?.totalWager),tone:"blue"},{label:"Total Return",value:O(g?.totalReturn),tone:"teal"},{label:"GGR",value:O(g?.grossGamingRevenue),tone:"slate"},{label:"Average Bet",value:O(g?.averageBet),tone:"navy"},{label:"RTP Estimate",value:`${Number(g?.rtpEstimate||0).toFixed(2)}%`,tone:"indigo"},{label:"Payout Ratio",value:`${Number(g?.payoutRatio||0).toFixed(2)}%`,tone:"indigo"},{label:"Anomalies",value:Number(g?.anomalyCount||0).toLocaleString(),tone:"rose"},{label:"Error Rate",value:`${Number(g?.errorRate||0).toFixed(4)}%`,tone:"rose"}],[g]);return e.jsxs("div",{className:"admin-view casino-bets-view",children:[e.jsxs("div",{className:"view-header casino-bets-header",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Casino Bets"}),e.jsx("p",{className:"subtitle",children:"Server-settled casino reporting, settlement ledger, and round-level audit details."})]}),e.jsxs("div",{className:"casino-bets-header-actions",children:[e.jsx("button",{type:"button",className:"btn-small",onClick:z,disabled:m,children:m?"Refreshing…":"Refresh"}),e.jsx("button",{type:"button",className:"btn-small btn-accent",onClick:()=>li(a,ae),children:"Export CSV"})]})]}),e.jsxs("div",{className:"view-content casino-bets-content",children:[m&&e.jsx("div",{className:"casino-bets-loading",children:"Loading casino bets…"}),k&&e.jsx("div",{className:"casino-bets-error",children:k}),!m&&!k&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"casino-bets-kpi-grid",children:le.map(l=>e.jsxs("div",{className:`casino-kpi-card tone-${l.tone}`,children:[e.jsx("span",{className:"casino-kpi-label",children:l.label}),e.jsx("strong",{className:"casino-kpi-value",children:l.value})]},l.label))}),e.jsxs("div",{className:"casino-bets-filters casino-bets-highlights",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Win"}),e.jsx("div",{children:g?.biggestWin?`${g.biggestWin.username||"—"} ${O(g.biggestWin.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Loss"}),e.jsx("div",{children:g?.biggestLoss?`${g.biggestLoss.username||"—"} ${O(g.biggestLoss.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Anomaly Sample"}),e.jsxs("div",{children:[Number(h?.count||0)," flagged rounds"]})]})]}),v.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"GGR"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"RTP"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:v.map(l=>e.jsxs("tr",{children:[e.jsx("td",{children:H(l.game)}),e.jsx("td",{children:Number(l.rounds||0).toLocaleString()}),e.jsx("td",{children:O(l.totalWager)}),e.jsx("td",{children:O(l.totalReturn)}),e.jsx("td",{children:O(l.grossGamingRevenue)}),e.jsx("td",{children:O(l.averageBet)}),e.jsxs("td",{children:[Number(l.payoutRatio||0).toFixed(2),"%"]}),e.jsx("td",{children:l.biggestWin!==null&&l.biggestWin!==void 0?O(l.biggestWin):"—"}),e.jsx("td",{children:l.biggestLoss!==null&&l.biggestLoss!==void 0?O(l.biggestLoss):"—"})]},l.game))})]})}),f.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"User ID"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:f.map(l=>e.jsxs("tr",{children:[e.jsx("td",{children:l.username||"—"}),e.jsx("td",{className:"round-id",title:l.userId||"",children:P(l.userId||"")}),e.jsx("td",{children:Number(l.rounds||0).toLocaleString()}),e.jsx("td",{children:O(l.totalWager)}),e.jsx("td",{children:O(l.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Oe(l.netResult),children:O(l.netResult)})}),e.jsx("td",{children:O(l.averageBet)}),e.jsx("td",{children:l.biggestWin!==null&&l.biggestWin!==void 0?O(l.biggestWin):"—"}),e.jsx("td",{children:l.biggestLoss!==null&&l.biggestLoss!==void 0?O(l.biggestLoss):"—"})]},`${l.userId||""}:${l.username||""}`))})]})}),Array.isArray(h?.sample)&&h.sample.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Reasons"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsx("tbody",{children:h.sample.map((l,q)=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:l.roundId||"",children:P(l.roundId||"")}),e.jsx("td",{children:l.username||"—"}),e.jsx("td",{children:H(l.game)}),e.jsx("td",{children:Array.isArray(l.reasons)?l.reasons.join(", "):"—"}),e.jsx("td",{children:O(l.totalWager)}),e.jsx("td",{children:O(l.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Oe(l.netResult),children:O(l.netResult)})}),e.jsx("td",{children:O(l.balanceBefore)}),e.jsx("td",{children:O(l.balanceAfter)}),e.jsx("td",{children:_(l.createdAt)})]},`${l.roundId||"anomaly"}:${q}`))})]})}),e.jsxs("div",{className:"casino-bets-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Game"}),e.jsxs("select",{value:a.game,onChange:l=>y("game",l.target.value),children:[e.jsx("option",{value:"",children:"All"}),e.jsx("option",{value:"baccarat",children:"Baccarat"}),e.jsx("option",{value:"blackjack",children:"Blackjack"}),e.jsx("option",{value:"craps",children:"Craps"}),e.jsx("option",{value:"arabian",children:"Arabian Game"}),e.jsx("option",{value:"jurassic-run",children:"Jurassic Run"}),e.jsx("option",{value:"3card-poker",children:"3-Card Poker"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Player"}),e.jsx("input",{type:"text",value:a.username,onChange:l=>y("username",l.target.value),placeholder:"username"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User ID"}),e.jsx("input",{type:"text",value:a.userId,onChange:l=>y("userId",l.target.value),placeholder:"user id"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Outcome / Result"}),e.jsx("input",{type:"text",value:a.result,onChange:l=>y("result",l.target.value),placeholder:"Win / Lose / Push / Pending / Player / Banker / 17"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"From"}),e.jsx("input",{type:"date",value:a.from,onChange:l=>y("from",l.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"To"}),e.jsx("input",{type:"date",value:a.to,onChange:l=>y("to",l.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Min Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:a.minWager,onChange:l=>y("minWager",l.target.value),placeholder:"0.00"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Max Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:a.maxWager,onChange:l=>y("maxWager",l.target.value),placeholder:"500.00"})]}),e.jsx("div",{className:"casino-filter-actions",children:e.jsx("button",{type:"button",className:"btn-small",onClick:E,children:"Clear"})})]}),e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Outcome"}),e.jsx("th",{children:"Result"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsxs("tbody",{children:[i.map(l=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:l.roundId||l.id||"",children:P(l.roundId||l.id)}),e.jsx("td",{children:l.username||"—"}),e.jsx("td",{children:H(l.game)}),e.jsx("td",{children:l.roundStatus||"—"}),e.jsx("td",{children:$(l.outcomeSource)}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${De(de(l))}`,children:de(l)})}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${De(Y(l))}`,children:Y(l)})}),e.jsx("td",{children:O(l.totalWager)}),e.jsx("td",{children:O(l.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Oe(l.netResult),children:O(l.netResult)})}),e.jsx("td",{children:O(l.balanceAfter)}),e.jsx("td",{children:_(l.createdAt)}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>K(l.roundId||l.id),type:"button",children:"View"})})]},l.roundId||l.id)),i.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:13,className:"casino-bets-empty-row",children:"No casino bet rows found."})})]})]})}),e.jsxs("div",{className:"casino-bets-pagination",children:[e.jsxs("span",{className:"casino-page-meta",children:[Number(C?.total||0).toLocaleString()," rows"]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>F(l=>Math.max(1,l-1)),disabled:D<=1,children:"Previous"}),e.jsxs("span",{className:"casino-page-index",children:["Page ",C?.page||D," of ",C?.pages||1]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>F(l=>Math.min(Number(C?.pages||1),l+1)),disabled:(C?.page||D)>=(C?.pages||1),children:"Next"})]})]})]}),(o||W||M)&&e.jsx("div",{className:"modal-overlay",onClick:c,children:e.jsxs("div",{className:"modal-content casino-bets-modal",onClick:l=>l.stopPropagation(),children:[e.jsxs("div",{className:"casino-bets-modal-head",children:[e.jsx("h3",{children:"Casino Round Detail"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:c,children:"Close"})]}),W&&e.jsx("div",{className:"casino-bets-loading",children:"Loading round detail…"}),M&&e.jsx("div",{className:"casino-bets-error",children:M}),!W&&o&&e.jsxs("div",{className:"casino-bets-detail",children:[e.jsxs("div",{className:"casino-bets-detail-grid",children:[e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Round"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Round ID"}),e.jsx("code",{children:o.roundId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Request ID"}),e.jsx("code",{children:o.requestId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Game"}),e.jsx("span",{children:H(o.game)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:o.roundStatus||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:$(o.outcomeSource||o?.audit?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Outcome"}),e.jsx("span",{className:`casino-result-badge result-${De(de(o))}`,children:de(o)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Result"}),e.jsx("span",{className:`casino-result-badge result-${De(Y(o))}`,children:Y(o)})]}),o.playerAction&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Action"}),e.jsx("span",{children:o.playerAction})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Decision"}),e.jsx("span",{children:_(o.serverDecisionAt)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Player"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Username"}),e.jsx("strong",{children:o.username||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"User ID"}),e.jsx("code",{children:o.userId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance Before"}),e.jsx("strong",{children:O(o.balanceBefore)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance After"}),e.jsx("strong",{children:O(o.balanceAfter)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:o.game==="roulette"?"Outcome":o.game==="craps"?"Dice":o.game==="arabian"||o.game==="jurassic-run"?"Spin":o.game==="3card-poker"?"Bet Breakdown":"Cards"}),o.game==="roulette"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Number"}),e.jsx("strong",{children:o.rouletteOutcome?.number??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Color"}),e.jsx("span",{children:o.rouletteOutcome?.color||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Parity"}),e.jsx("span",{children:o.rouletteOutcome?.parity||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Range"}),e.jsx("span",{children:o.rouletteOutcome?.range||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dozen"}),e.jsx("span",{children:o.rouletteOutcome?.dozen||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Column"}),e.jsx("span",{children:o.rouletteOutcome?.column||"—"})]})]}):o.game==="craps"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 1"}),e.jsx("strong",{children:o?.roundData?.dice?.die1??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 2"}),e.jsx("strong",{children:o?.roundData?.dice?.die2??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total"}),e.jsx("strong",{children:o?.roundData?.dice?.sum??o?.result??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State Before"}),e.jsx("span",{children:o?.roundData?.stateBefore||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State After"}),e.jsx("span",{children:o?.roundData?.stateAfter||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point Before"}),e.jsx("span",{children:o?.roundData?.pointNumberBefore??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point After"}),e.jsx("span",{children:o?.roundData?.pointNumberAfter??"—"})]})]}):o.game==="arabian"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Lines"}),e.jsx("strong",{children:o?.roundData?.lineCount??o?.bets?.lines??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Coin Bet"}),e.jsx("strong",{children:O(o?.roundData?.coinBet??o?.bets?.coinBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Spin Bet"}),e.jsx("strong",{children:O(o?.roundData?.totalBet??o?.bets?.totalBet??o?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:O(o?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Win"}),e.jsx("strong",{children:O(o?.roundData?.bonusWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:o?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:o?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:o?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Triggered"}),e.jsx("span",{children:o?.roundData?.bonusTriggered?"Yes":"No"})]})]}):o.game==="jurassic-run"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bet Level"}),e.jsx("strong",{children:Number(o?.roundData?.betId??o?.bets?.betId??0)+1})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Spin Bet"}),e.jsx("strong",{children:O(o?.roundData?.bet??o?.bets?.bet??o?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Paylines"}),e.jsx("strong",{children:o?.roundData?.activePaylines??o?.bets?.paylines??"10"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Bet"}),e.jsx("strong",{children:O(o?.roundData?.lineBet??o?.bets?.lineBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:O(o?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Payout"}),e.jsx("strong",{children:O(o?.roundData?.jackpotPayout??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Before"}),e.jsx("strong",{children:O(o?.roundData?.jackpotBefore??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot After"}),e.jsx("strong",{children:O(o?.roundData?.jackpotAfter??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:o?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:o?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:o?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spin Round"}),e.jsx("span",{children:o?.roundData?.isFreeSpinRound?"Yes":"No"})]})]}):o.game==="3card-poker"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Ante Bet"}),e.jsx("strong",{children:O(o?.bets?.Ante??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Play Bet"}),e.jsx("strong",{children:O(o?.bets?.Play??(Number(o?.bets?.folded)===1?0:o?.bets?.Ante??0))})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Pair Plus Bet"}),e.jsx("strong",{children:O(o?.bets?.PairPlus??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Action"}),e.jsx("span",{children:Number(o?.bets?.folded)===1?"Folded":"Played"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Main Result"}),e.jsx("span",{children:o?.roundData?.mainResultLabel||o?.result||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:o?.playerHand||o?.roundData?.playerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:o?.dealerHand||o?.roundData?.dealerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:o?.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:$(o?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Player Cards"}),e.jsx("div",{className:"casino-card-list",children:(o.playerCards||[]).length>0?(o.playerCards||[]).map(l=>e.jsx("span",{className:"casino-card-chip",children:l},`3cp-p-${l}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer Cards"}),e.jsx("div",{className:"casino-card-list",children:(o.dealerCards||[]).length>0?(o.dealerCards||[]).map(l=>e.jsx("span",{className:"casino-card-chip",children:l},`3cp-d-${l}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Payout Breakdown"}),e.jsxs("div",{className:"casino-card-list",children:[e.jsxs("span",{className:"casino-card-chip",children:["Ante ",O(o?.roundData?.payoutBreakdown?.ante?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Play ",O(o?.roundData?.payoutBreakdown?.play?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Pair+ ",O(o?.roundData?.payoutBreakdown?.pairPlus?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Ante Bonus ",O(o?.roundData?.payoutBreakdown?.anteBonus?.returnAmount??0)]})]})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:o.game==="baccarat"?`Player (${o.playerTotal})`:"Player"}),e.jsx("div",{className:"casino-card-list",children:(o.playerCards||[]).length>0?(o.playerCards||[]).map(l=>e.jsx("span",{className:"casino-card-chip",children:l},`p-${l}`)):e.jsx("span",{children:"—"})})]}),o.game==="baccarat"?e.jsxs("div",{className:"casino-detail-stack",children:[e.jsxs("span",{children:["Banker (",o.bankerTotal,")"]}),e.jsx("div",{className:"casino-card-list",children:(o.bankerCards||[]).length>0?(o.bankerCards||[]).map(l=>e.jsx("span",{className:"casino-card-chip",children:l},`b-${l}`)):e.jsx("span",{children:"—"})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Up Card"}),e.jsx("strong",{children:o.dealerUpCard||"—"})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer"}),e.jsx("div",{className:"casino-card-list",children:(o.dealerCards||[]).length>0?(o.dealerCards||[]).map(l=>e.jsx("span",{className:"casino-card-chip",children:l},`d-${l}`)):e.jsx("span",{children:"—"})})]})]})]})]}),o.game==="roulette"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Roulette Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Placed Bets"}),e.jsx("div",{className:"casino-card-list",children:fe(o).length>0?fe(o).map(l=>e.jsxs("span",{className:"casino-card-chip",children:[ee(l)," ",O(l.amount)]},String(l.key||`${l.type}-${l.value}`))):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Bets"}),e.jsx("div",{className:"casino-card-list",children:Z(o).length>0?Z(o).map(l=>e.jsxs("span",{className:"casino-card-chip",children:[ee(l)," ",O(l.amount)]},`win-${String(l.key||`${l.type}-${l.value}`)}`)):e.jsx("span",{children:"No winning bets"})})]})]}),o.game==="craps"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Craps Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Active Bets Before Roll"}),e.jsx("div",{className:"casino-card-list",children:te(o).length>0?te(o).map(l=>e.jsxs("span",{className:"casino-card-chip",children:[l.key," ",O(l.amount)]},`craps-bet-${l.key}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Resolved Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.betDetails)&&o.betDetails.length>0?o.betDetails.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:[String(l?.bet||"bet")," ",String(l?.outcome||"—")," ",O(l?.return)]},`craps-res-${q}`)):e.jsx("span",{children:"No resolved bets"})})]})]}),o.game==="arabian"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Arabian Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.roundData?.winningLines)&&o.roundData.winningLines.length>0?o.roundData.winningLines.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:["L",l?.line??"?"," x",l?.num_win??"?"," ",O(l?.amount??0)]},`arabian-line-${q}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Pattern"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.roundData?.pattern)&&o.roundData.pattern.length>0?o.roundData.pattern.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:["R",q+1,": ",Array.isArray(l)?l.join("-"):"—"]},`arabian-pattern-${q}`)):e.jsx("span",{children:"—"})})]})]}),o.game==="jurassic-run"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Jurassic Run Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.roundData?.winningLines)&&o.roundData.winningLines.length>0?o.roundData.winningLines.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:["L",Number(l?.line??0)+1," x",l?.count??"?"," ",l?.symbol||"—"," ",l?.win?O(l.win):""]},`jurassic-line-${q}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Symbols"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.roundData?.symbols)&&o.roundData.symbols.length>0?o.roundData.symbols.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:["C",q+1,": ",Array.isArray(l)?l.join("-"):"—"]},`jurassic-col-${q}`)):e.jsx("span",{children:"—"})})]})]}),o.game==="blackjack"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Blackjack Replay"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Hands"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.betDetails?.hands)&&o.betDetails.hands.length>0?o.betDetails.hands.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:[String(l?.zone||"hand")," ",String(l?.resultType||"—")," ",O(l?.bet)," → ",O(l?.return)]},`bj-hand-${q}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Actions"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.betDetails?.actions)&&o.betDetails.actions.length>0?o.betDetails.actions.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:[String(l?.action||"action")," ",l?.zone?`(${String(l.zone)})`:""]},`bj-action-${q}`)):e.jsx("span",{children:"No action log"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Side Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(o?.betDetails?.sideBets)&&o.betDetails.sideBets.length>0?o.betDetails.sideBets.map((l,q)=>e.jsxs("span",{className:"casino-card-chip",children:[String(l?.zone||"zone")," ",String(l?.type||"side")," ",O(l?.stake)," → ",O(l?.return)]},`bj-side-${q}`)):e.jsx("span",{children:"No side bets"})})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Settlement"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Wager"}),e.jsx("strong",{children:O(o.totalWager)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Return"}),e.jsx("strong",{children:O(o.totalReturn)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Net"}),e.jsx("strong",{children:O(o.netResult)})]}),o.playerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:o.playerHand})]}),o.dealerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:o.dealerHand})]}),o.dealerQualifies!==null&&o.dealerQualifies!==void 0&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:o.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Integrity Hash"}),e.jsx("code",{children:o.integrityHash||"—"})]})]})]}),e.jsx("h4",{className:"casino-ledger-title",children:"Ledger Entries"}),e.jsx("div",{className:"casino-ledger-wrap",children:e.jsxs("table",{className:"casino-ledger-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Side"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsxs("tbody",{children:[(o.ledgerEntries||[]).map(l=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`casino-ledger-side ${String(l.entrySide||"").toUpperCase()==="DEBIT"?"side-debit":"side-credit"}`,children:l.entrySide||"—"})}),e.jsx("td",{children:l.type||"—"}),e.jsx("td",{children:O(l.amount)}),e.jsx("td",{children:O(l.balanceBefore)}),e.jsx("td",{children:O(l.balanceAfter)}),e.jsx("td",{children:_(l.createdAt)})]},l.id)),(o.ledgerEntries||[]).length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"casino-ledger-empty",children:"No ledger entries found."})})]})]})})]})]})})]})}const ua=a=>{const n=Number(a);return Number.isFinite(n)?n:0},Ce=(a,n=0)=>{if(typeof a=="number")return Number.isFinite(a)?a:ua(n);if(typeof a=="string"){const p=a.trim();if(!p)return ua(n);const g=/^\(.*\)$/.test(p),x=p.replace(/^\((.*)\)$/,"$1").replace(/[^\d.+-]/g,"");if(!x||["+","-",".","+.","-."].includes(x))return ua(n);const v=Number(x);return Number.isFinite(v)?g&&v>0?-v:v:ua(n)}if(a==null||typeof a=="boolean")return ua(n);const i=Number(a);return Number.isFinite(i)?i:ua(n)},Tt=a=>{const n=Ce(a,0),i=Math.round(n);return Math.abs(i)<.5?"neutral":i<0?"neg":"pos"},ks=(a,n)=>String(a||"").localeCompare(String(n||""),void 0,{sensitivity:"base",numeric:!0}),Bl=new Set(["admin","agent","master_agent","super_agent"]),Cs=a=>{const n=String(a||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!n)return"";const i=n.match(/^[A-Z]+/);return i&&i[0]?i[0]:n.replace(/\d+$/,"")||n},Ln=a=>!Bl.has(String(a?.role||"").trim().toLowerCase());function Fl({onViewChange:a}){const[n,i]=t.useState([]),[p,g]=t.useState([]),[x,v]=t.useState(!0),[w,f]=t.useState(""),[B,h]=t.useState(null),[N,m]=t.useState(null),[u,k]=t.useState(!1),[G,D]=t.useState(!1),[F,C]=t.useState(null),[j,W]=t.useState(""),[r,M]=t.useState(""),[T,o]=t.useState([]),[U,ae]=t.useState(!1),[z,y]=t.useState(!0),[K,c]=t.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:""}),[E,O]=t.useState("player"),[_,H]=t.useState("admin"),[de,De]=t.useState(!1),[Y,$]=t.useState(!1),[ee,fe]=t.useState(null),[Z,te]=t.useState({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"0",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),[Oe,P]=t.useState(!1),[le,l]=t.useState({customerId:null,username:"",currentBalance:0,nextBalance:""}),[q,re]=t.useState(""),[he,we]=t.useState(""),[Se,Je]=t.useState(!1),[ze,Ye]=t.useState({}),[dt,tt]=t.useState(null),[Ze,$e]=t.useState(null),[ht,bt]=t.useState({}),[lt,Ve]=t.useState(""),[He,at]=t.useState(!1),[Xe,St]=t.useState(""),[d,R]=t.useState(""),[X,me]=t.useState(!1),[ke,ge]=t.useState(""),[Ne,Te]=t.useState({open:!1,type:"",customerId:null,username:"",value:""}),[Ke,yt]=t.useState(""),[It,vt]=t.useState("");t.useEffect(()=>{(async()=>{try{v(!0);const J=localStorage.getItem("token")||sessionStorage.getItem("token");if(!J){i([]),f("Please login to load users.");return}const L=String(localStorage.getItem("userRole")||"").toLowerCase();let ie=null;try{ie=await zt(J,{timeoutMs:3e4})}catch(pe){console.warn("CustomerAdminView: getMe failed, falling back to stored role.",pe)}const ne=String(ie?.role||L||"admin").toLowerCase();if(H(ne),yt(ie?.username||""),vt(ie?.id||""),De(!!ie?.viewOnly),ne==="agent"){const[pe,be]=await Promise.all([pa(J),Yt(J).catch(()=>[])]);i(pe||[]),g(be||[])}else{const[pe,be]=await Promise.all([qt(J),Yt(J)]);i(pe||[]),g(be||[])}if(f(""),ie?.username)try{const pe=Cs(ie.username);if(!pe)return;const{nextUsername:be}=await Ot(pe,J,{type:"player"});c(_e=>({..._e,username:be}))}catch(pe){console.error("Failed to prefetch next username:",pe)}}catch(J){console.error("Error fetching users:",J),f("Failed to load users: "+J.message)}finally{v(!1)}})()},[]);const st=async S=>{const J=localStorage.getItem("token")||sessionStorage.getItem("token");if(!J)return;c(ne=>({...ne,agentId:S,referredByUserId:""}));const L=E==="player"?"player":"agent",ie=E==="super_agent"?"MA":"";if(S){const ne=p.find(pe=>pe.id===S);if(ne){R(ne.username||"");try{const pe=Cs(ne.username);if(!pe){c(ct=>({...ct,username:""}));return}const be=L==="player"?{suffix:ie,type:L,agentId:S}:{suffix:ie,type:L,...E==="agent"?{agentId:S}:{}},{nextUsername:_e}=await Ot(pe,J,be);c(ct=>({...ct,username:_e,agentPrefix:pe}))}catch(pe){console.error("Failed to get next username:",pe)}}}else if(R(""),Ke)try{const ne=Cs(Ke);if(!ne){c(_e=>({..._e,username:""}));return}const pe={suffix:ie,type:L};L==="agent"&&E==="agent"&&(_==="master_agent"||_==="super_agent")&&It&&(pe.agentId=It);const{nextUsername:be}=await Ot(ne,J,pe);c(_e=>({..._e,username:be,agentPrefix:ne}))}catch(ne){console.error("Failed to fetch username for admin:",ne),c(pe=>({...pe,username:""}))}else c(ne=>({...ne,username:""}))},jt=S=>{if(S==null||S==="")return"—";const J=Ce(S,NaN);return Number.isNaN(J)?"—":`$${Math.round(J).toLocaleString("en-US")}`};!de&&!u&&String(K.username||"").trim()&&String(K.firstName||"").trim()&&String(K.lastName||"").trim()&&String(K.phoneNumber||"").trim()&&String(K.password||"").trim()&&(E!=="player"||String(K.minBet??"").trim()!==""&&String(K.maxBet??"").trim()!==""&&String(K.creditLimit??"").trim()!==""&&String(K.balanceOwed??"").trim());const Mt=S=>{const J=Ce(S.balance,0);l({customerId:S.id,username:S.username,currentBalance:J,nextBalance:`${J}`}),P(!0),f("")},kt=async S=>{S.preventDefault();const{customerId:J,nextBalance:L}=le,ie=Number(L);if(Number.isNaN(ie)||ie<0){f("Balance must be a non-negative number.");return}try{const ne=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ne){f("Please login to update balance.");return}m(J),_==="agent"?await Ns(J,ie,ne):await ha(J,{balance:ie},ne),i(pe=>pe.map(be=>be.id===J?{...be,balance:ie,availableBalance:Math.max(0,ie-Ce(be.pendingBalance,0))}:be)),P(!1),f("")}catch(ne){console.error("Balance update failed:",ne),f(ne.message||"Failed to update balance")}finally{m(null)}},Nt=S=>{const J=S.id,L={sports:S.settings?.sports??!0,casino:S.settings?.casino??!0,racebook:S.settings?.racebook??!0};return ze[J]||L},Ft=(S,J)=>{const L=S.id,ie=Nt(S);Ye(ne=>({...ne,[L]:{...ie,[J]:!ie[J]}}))},$t=async S=>{const J=S.id,L=ze[J];if(L)try{const ie=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ie)return;m(J);const ne={settings:{...S.settings||{},sports:!!L.sports,casino:!!L.casino,racebook:!!L.racebook}};_==="agent"?await _t(J,ne,ie):await Vt(J,ne,ie),i(pe=>pe.map(be=>be.id===J?{...be,settings:ne.settings}:be)),Ye(pe=>{const be={...pe};return delete be[J],be}),f("")}catch(ie){console.error("Addon save failed:",ie),f(ie.message||"Failed to save add-ons")}finally{m(null)}},Rt=async S=>{const J=S.id,L=window.prompt(`Enter new password for ${S.username}:`,"");if(L===null)return;const ie=L.toUpperCase();if(ie.length<6){alert("Password must be at least 6 characters long");return}try{const ne=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ne){f("Please login to reset password.");return}m(J),await vs(J,ie,ne),i(pe=>pe.map(be=>be.id===J?{...be,displayPassword:ie}:be)),alert(`Password for ${S.username} has been reset successfully.`),f("")}catch(ne){console.error("Password reset failed:",ne),f(ne.message||"Failed to reset password")}finally{m(null)}},V=S=>{fe(S),te({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),$(!0)},ce=async S=>{S.preventDefault();const J=ee.id;try{const L=localStorage.getItem("token")||sessionStorage.getItem("token"),ie={};Z.phoneNumber.trim()&&(ie.phoneNumber=Z.phoneNumber.trim()),Z.firstName.trim()&&(ie.firstName=Z.firstName.trim()),Z.lastName.trim()&&(ie.lastName=Z.lastName.trim()),Z.fullName.trim()&&(ie.fullName=Z.fullName.trim()),Z.password.trim()&&(ie.password=Z.password.trim()),Z.minBet!==""&&(ie.minBet=Number(Z.minBet)),Z.maxBet!==""&&(ie.maxBet=Number(Z.maxBet)),Z.creditLimit!==""&&(ie.creditLimit=Number(Z.creditLimit)),Z.balanceOwed!==""&&(ie.balanceOwed=Number(Z.balanceOwed));const ne=Object.entries(Z.apps||{}).filter(([,pe])=>(pe||"").trim()!=="");if(ne.length>0&&(ie.apps=Object.fromEntries(ne.map(([pe,be])=>[pe,be.trim()]))),Object.keys(ie).length===0){f("Enter at least one value before saving.");return}_==="agent"?await _t(J,ie,L):await Vt(J,ie,L),i(pe=>pe.map(be=>be.id===J?{...be,...ie}:be)),$(!1),f("")}catch(L){console.error("Update customer failed:",L),f(L.message||"Failed to update customer")}},ve=t.useMemo(()=>p.filter(S=>_==="admin"||_==="super_agent"||_==="master_agent"),[p,_]);t.useEffect(()=>{if(E!=="player")return;const S=String(d||"").trim().toLowerCase();if(!S)return;const J=ve.find(ie=>String(ie.username||"").trim().toLowerCase()===S);if(!J)return;const L=String(J.id||"");L&&String(K.agentId||"")!==L&&st(L)},[d,ve,E,K.agentId]);const Ie=S=>{if(!S)return"";if(typeof S=="string")return S;if(typeof S=="object"){if(typeof S.id=="string")return S.id;if(typeof S.$oid=="string")return S.$oid}return""};t.useMemo(()=>ve.filter(S=>d.trim()?(S.username||"").toLowerCase().includes(d.trim().toLowerCase()):!0),[ve,d]);const rt=t.useMemo(()=>ve.filter(S=>lt.trim()?(S.username||"").toLowerCase().includes(lt.trim().toLowerCase()):!0),[ve,lt]),ut=t.useMemo(()=>n.filter(Ln),[n]),et=t.useMemo(()=>Ia(ut),[ut]),A=ve.find(S=>Ie(S.id)===Ie(Xe)),I=!!A&&(A.role==="master_agent"||A.role==="super_agent"),je=Ie(Xe),Q=t.useMemo(()=>!I||!je?[]:ve.filter(S=>{if((S.role||"").toLowerCase()!=="agent")return!1;const J=Ie(S.createdBy),L=Ie(S.parentAgentId),ie=je;return J===ie||L===ie}),[I,ve,je]),Be=t.useMemo(()=>{let S=et;if(Xe)if(!I)S=et.filter(ie=>Ie(ie.agentId)===je);else{const ie=new Set(Q.map(ne=>Ie(ne.id)).filter(Boolean));S=et.filter(ne=>ie.has(Ie(ne.agentId)))}const J=new Set(T.map(ie=>String(ie).toUpperCase()));return[...!U||T.length===0?S:S.filter(ie=>J.has(String(ie.username||"").toUpperCase()))].sort((ie,ne)=>ks(String(ie?.username||""),String(ne?.username||"")))},[Xe,I,et,Q,je,U,T]),Fe=t.useMemo(()=>{const S=String(Ke||"").trim().toUpperCase();return _==="admin"?"ADMIN":_==="master_agent"||_==="super_agent"?S||"MASTER":_==="agent"?S||"AGENT":""},[Ke,_]),Ge=t.useMemo(()=>{const S=new Map;ve.forEach(pe=>{const be=Ie(pe.id);be&&S.set(be,pe)});const J=pe=>{const be=Ie(pe?.agentId);if(!be)return"UNASSIGNED";const _e=[];let ct=be;const Lt=new Set;for(;ct&&!Lt.has(ct);){Lt.add(ct);const fa=S.get(ct);if(!fa)break;const Ba=String(fa.username||"").trim().toUpperCase();Ba&&_e.push(Ba);const qs=String(fa.createdByModel||""),Fa=Ie(fa.createdBy);if(qs!=="Agent"||!Fa)break;ct=Fa}const Kt=_e.reverse().filter(Boolean);return Kt.length===0?Fe?`${Fe} / UNASSIGNED`:"UNASSIGNED":Fe&&Kt[0]!==Fe?`${Fe} / ${Kt.join(" / ")}`:Kt.join(" / ")},L=new Map;Be.forEach(pe=>{const be=J(pe);L.has(be)||L.set(be,[]),L.get(be).push(pe)});const ie=Array.from(L.entries()).sort(([pe],[be])=>ks(pe,be)),ne=[];return ie.forEach(([pe,be])=>{ne.push({type:"group",label:pe}),[...be].sort((_e,ct)=>ks(String(_e?.username||""),String(ct?.username||""))).forEach(_e=>ne.push({type:"player",player:_e,hierarchyPath:pe}))}),ne},[ve,Be,Fe]),Ae=Be,Re=S=>{re(S),we(""),Je(!0)},Ue=()=>{switch(q){case"minBet":return"Min Bet";case"maxBet":return"Max Bet";case"creditLimit":return"Credit Limit";case"settleLimit":return"Settle Limit";case"balanceAdjust":return"Balance Adjustment";case"status":return"Status";default:return""}},gt=S=>{const J=(S||"").toString().toLowerCase();return J==="active"?"Active":J==="read_only"||J==="readonly"?"Read Only":"Disabled"},Bt=async S=>{S.preventDefault();const J=localStorage.getItem("token")||sessionStorage.getItem("token");if(!J){f("Please login to update players.");return}if(Ae.length===0){f("No players available for bulk update.");return}let L=null;const ie=new Set(Ae.map(ne=>ne.id));if(q==="status")L={status:he||"active"};else if(q==="balanceAdjust"){const ne=Number(he);if(Number.isNaN(ne)){f("Please enter a valid number for balance adjustment.");return}m("bulk-update"),await Promise.all(Ae.map(pe=>{const be=pe.id,_e=Ce(pe.balance,0)+ne;return _==="agent"?Ns(be,_e,J):ha(be,{balance:_e},J)})),i(pe=>pe.map(be=>{const _e=be.id;return ie.has(_e)?{...be,balance:Ce(be.balance,0)+ne}:be})),Je(!1),f(""),m(null);return}else{const ne=Number(he);if(Number.isNaN(ne)||ne<0){f("Please enter a valid non-negative number.");return}q==="minBet"&&(L={minBet:ne}),q==="maxBet"&&(L={maxBet:ne,wagerLimit:ne}),q==="creditLimit"&&(L={creditLimit:ne}),q==="settleLimit"&&(L={balanceOwed:ne})}try{m("bulk-update"),await Promise.all(Ae.map(ne=>{const pe=ne.id;return _==="agent"?_t(pe,L,J):Vt(pe,L,J)})),i(ne=>ne.map(pe=>{const be=pe.id;return ie.has(be)?{...pe,...L}:pe})),Je(!1),f("")}catch(ne){console.error("Bulk update failed:",ne),f(ne.message||"Failed to update players")}finally{m(null)}},ot=(()=>{const S=n.filter(Ln);return E!=="player"&&E!=="agent"&&E!=="super_agent"?[]:_==="agent"?S:K.agentId?S.filter(J=>String(J.agentId?.id||J.agentId||"")===String(K.agentId)):S})(),At=t.useMemo(()=>ot.map(S=>{const J=String(S.id||"").trim(),L=String(S.username||"").trim(),ie=String(S.fullName||"").trim();if(!J||!L)return null;const ne=`${L.toUpperCase()}${ie?` - ${ie}`:""}`;return{id:J,label:ne,labelLower:ne.toLowerCase(),usernameLower:L.toLowerCase()}}).filter(Boolean),[ot]),wt=t.useMemo(()=>{const S=String(K.referredByUserId||"").trim();return S&&At.find(J=>J.id===S)||null},[K.referredByUserId,At]);t.useEffect(()=>{if(wt){ge(wt.label);return}String(K.referredByUserId||"").trim()||ge("")},[wt,K.referredByUserId]);const Ct=S=>{a&&a("user-details",S.id)},Pt=async S=>{const J=S.role==="agent"||S.role==="master_agent",L=J?"Agent":"Player",ie=window.prompt(`🚨 DELETE ${L.toUpperCase()} WARNING 🚨

You are about to delete ${L} "${S.username}".

This will remove them from all active lists.

To confirm, type the username exactly: ${S.username}`);if(ie!==null){if(ie.trim().toUpperCase()!==String(S.username).trim().toUpperCase()){alert("Username did not match. Deletion cancelled.");return}try{const ne=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ne){f("Please login to delete.");return}m(S.id),J?await ci(S.id,ne):await di(S.id,ne),i(pe=>pe.filter(be=>be.id!==S.id)),J&&g(pe=>pe.filter(be=>be.id!==S.id)),alert(`${L} "${S.username}" deleted successfully.`),f("")}catch(ne){console.error("Delete failed:",ne),alert(`Failed to delete: ${ne.message}`)}finally{m(null)}}},ft=S=>{const J=S.id;return ht[J]||{firstName:S.firstName||"",lastName:S.lastName||"",password:"",minBet:String(S.minBet??0),maxBet:String(S.maxBet??S.wagerLimit??0),creditLimit:String(S.creditLimit??0),settleLimit:String(S.balanceOwed??0),status:(S.status||"active").toLowerCase(),sports:S.settings?.sports??!0,casino:S.settings?.casino??!0,racebook:S.settings?.racebook??!0}},sa=S=>{const J=S.id;tt(L=>L===J?null:J),$e(L=>L===J?null:L)},mt=S=>{const J=S.id;tt(J),$e(J),bt(L=>({...L,[J]:ft(S)}))},Et=(S,J,L)=>{const ie=S.id,ne=ft(S);bt(pe=>({...pe,[ie]:{...ne,...pe[ie]||{},[J]:L}}))},oa=async S=>{const J=S.id,L=ft(S),ie=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ie)return;const ne={firstName:L.firstName.trim(),lastName:L.lastName.trim(),fullName:`${L.firstName.trim()} ${L.lastName.trim()}`.trim(),minBet:Number(L.minBet||0),maxBet:Number(L.maxBet||0),wagerLimit:Number(L.maxBet||0),creditLimit:Number(L.creditLimit||0),balanceOwed:Number(L.settleLimit||0),status:L.status,settings:{...S.settings||{},sports:!!L.sports,casino:!!L.casino,racebook:!!L.racebook}};try{if(m(J),_==="agent"?await _t(J,ne,ie):await Vt(J,ne,ie),(L.password||"").trim()!==""){const pe=L.password.trim().toUpperCase();_==="admin"?await vs(J,pe,ie):await _t(J,{password:pe},ie)}i(pe=>pe.map(be=>be.id===J?{...be,...ne,...L.password.trim()!==""?{displayPassword:L.password.trim().toUpperCase()}:{}}:be)),$e(null),bt(pe=>{const be={...pe};return delete be[J],be}),f("")}catch(pe){console.error("Inline save failed:",pe),f(pe.message||"Failed to save user details")}finally{m(null)}},ga=(S,J)=>{const L=S.id;let ie="";J==="name"&&(ie=`${S.firstName||""} ${S.lastName||""}`.trim()),J==="password"&&(ie=S.displayPassword||""),J==="balance"&&(ie=String(S.balance??0)),Te({open:!0,type:J,customerId:L,username:S.username,value:ie})},Ma=async S=>{S.preventDefault();const J=localStorage.getItem("token")||sessionStorage.getItem("token");if(!(!J||!Ne.customerId))try{if(m(Ne.customerId),Ne.type==="name"){const L=Ne.value.trim().split(/\s+/).filter(Boolean),ie=L[0]||"",ne=L.slice(1).join(" "),pe={firstName:ie,lastName:ne,fullName:Ne.value.trim()};_==="agent"?await _t(Ne.customerId,pe,J):await Vt(Ne.customerId,pe,J),i(be=>be.map(_e=>_e.id===Ne.customerId?{..._e,...pe}:_e))}if(Ne.type==="password"){const L=Ne.value.trim().toUpperCase();if(L.length<6){f("Password must be at least 6 characters.");return}_==="admin"?await vs(Ne.customerId,L,J):await _t(Ne.customerId,{password:L},J),i(ie=>ie.map(ne=>ne.id===Ne.customerId?{...ne,displayPassword:L}:ne))}if(Ne.type==="balance"){const L=Number(Ne.value);if(Number.isNaN(L)){f("Balance must be numeric.");return}_==="agent"?await Ns(Ne.customerId,L,J):await ha(Ne.customerId,{balance:L},J),i(ie=>ie.map(ne=>ne.id===Ne.customerId?{...ne,balance:L}:ne))}Te({open:!1,type:"",customerId:null,username:"",value:""}),f("")}catch(L){console.error("Quick edit failed:",L),f(L.message||"Failed to update value")}finally{m(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Administration Console"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"},children:e.jsxs("div",{className:"agent-search-picker header-agent-picker",onFocus:()=>at(!0),onBlur:()=>setTimeout(()=>at(!1),120),tabIndex:0,children:[e.jsxs("div",{className:"agent-search-head",children:[e.jsx("span",{className:"agent-search-label",children:"Agents"}),e.jsx("input",{type:"text",value:lt,onChange:S=>{Ve(S.target.value),at(!0)},placeholder:"Search agent..."})]}),He&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${Xe?"":"selected"}`,onClick:()=>{St(""),Ve(""),at(!1)},children:e.jsx("span",{children:"All Agents"})}),rt.map(S=>{const J=S.id,L=S.role==="master_agent"||S.role==="super_agent";return e.jsxs("button",{type:"button",className:`agent-search-item ${String(Xe||"")===String(J)?"selected":""}`,onClick:()=>{St(J),Ve(S.username||""),at(!1)},children:[e.jsx("span",{children:S.username}),e.jsx("span",{className:`agent-type-badge ${L?"master":"agent"}`,children:L?"M":"A"})]},J)}),rt.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching agents"})]})]})})]}),e.jsxs("div",{className:"view-content",children:[x&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading Entries..."})]}),w&&e.jsx("div",{className:"error-state",children:w}),B&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:B.message}),B.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:B.matches.map((S,J)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(S.username||"UNKNOWN")}),e.jsx("span",{children:String(S.fullName||"No name")}),e.jsx("span",{children:String(S.phoneNumber||"No phone")})]},`${S.id||S.username||"duplicate"}-${J}`))})]}),r&&e.jsx("div",{className:"success-state",children:r}),T.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",T.slice(0,20).join(", "),T.length>20?` (+${T.length-20} more)`:"",e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"12px",padding:"6px 10px"},onClick:()=>ae(S=>!S),children:U?"Show All Players":"Show Imported Only"})]}),!x&&e.jsxs(e.Fragment,{children:[!1,e.jsx("div",{className:"table-container",children:e.jsx("div",{className:"scroll-wrapper",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Password"}),e.jsx("th",{children:"Name"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("minBet"),children:"Min Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("maxBet"),children:"Max Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("creditLimit"),children:"Credit Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("settleLimit"),children:"Settle Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("balanceAdjust"),children:"Balance"}),e.jsx("th",{children:"Lifetime"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Re("status"),children:"Status"}),e.jsx("th",{children:"Sportsbook"}),e.jsx("th",{children:"Casino"}),e.jsx("th",{children:"Horses"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:Ge.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:14,className:"empty-msg",children:"No records found."})}):Ge.map((S,J)=>{if(S.type==="group")return e.jsx("tr",{className:"agent-group-row",children:e.jsx("td",{colSpan:14,children:S.label})},`group-${S.label}-${J}`);const L=S.player,ie=L.id,ne=Nt(L),pe=!!ze[ie],be=dt===ie,_e=Ze===ie,ct=ft(L);return e.jsxs(Hs.Fragment,{children:[e.jsxs("tr",{className:`customer-row role-${L.role} ${L.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("td",{className:"user-cell",children:[e.jsxs("div",{className:"user-cell-main",children:[e.jsx("button",{className:"user-link-btn",onClick:()=>Ct(L),children:e.jsx("span",{className:"customer-username",children:L.username.toUpperCase()})}),L.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"}),e.jsx("span",{className:"customer-tree-path",children:String(S.hierarchyPath||"UNASSIGNED").toUpperCase()})]}),L.role==="user"&&e.jsx("button",{className:"row-expand-btn",type:"button",onClick:()=>sa(L),children:be?"⌄":"›"})]}),e.jsx("td",{className:"pass-cell",children:e.jsx("span",{children:L.displayPassword||"—"})}),e.jsx("td",{children:`${L.firstName||""} ${L.lastName||""}`.trim()||"—"}),e.jsx("td",{children:Ce(L.minBet,0).toLocaleString("en-US")}),e.jsx("td",{children:Ce(L.maxBet??L.wagerLimit,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:Ce(L.creditLimit??1e3,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:Ce(L.balanceOwed,0).toLocaleString("en-US")}),e.jsx("td",{className:`balance-cell ${Tt(L.balance)}`,children:jt(L.balance)}),e.jsx("td",{children:Ce(L.lifetime,0).toLocaleString("en-US")}),e.jsx("td",{children:gt(L.status)}),e.jsx("td",{children:L.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ne.sports,onChange:()=>Ft(L,"sports")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:L.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ne.casino,onChange:()=>Ft(L,"casino")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:L.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ne.racebook,onChange:()=>Ft(L,"racebook")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:e.jsxs("div",{className:"action-buttons-cell",style:{display:"flex",gap:"8px"},children:[L.role==="user"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:`btn-secondary ${pe?"btn-save-dirty":"btn-save-clean"}`,type:"button",onClick:()=>$t(L),disabled:!pe||N===ie,children:"Save"}),e.jsx("button",{className:"btn-secondary",type:"button",onClick:()=>_e?oa(L):mt(L),disabled:N===ie,children:_e?"SAVE":"EDIT"})]}):e.jsx("button",{className:"btn-icon",title:"Edit Customer",onClick:()=>V(L),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),_==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>Pt(L),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]})})]}),L.role==="user"&&be&&e.jsx("tr",{className:"expanded-detail-row",children:e.jsx("td",{colSpan:14,children:e.jsxs("div",{className:`expanded-detail-grid ${_e?"is-editing":""}`,children:[e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Password"}),e.jsx("span",{children:L.displayPassword||"—"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Name"}),e.jsxs("span",{children:[`${L.firstName||""} ${L.lastName||""}`.trim()||"—"," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>ga(L,"name"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Min Bet"}),e.jsx("span",{children:_e?e.jsx("input",{type:"number",value:ct.minBet,onChange:Lt=>Et(L,"minBet",Lt.target.value)}):`$${Ce(L.minBet,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Bet"}),e.jsx("span",{children:_e?e.jsx("input",{type:"number",value:ct.maxBet,onChange:Lt=>Et(L,"maxBet",Lt.target.value)}):`$${Ce(L.maxBet??L.wagerLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Credit Limit"}),e.jsx("span",{children:_e?e.jsx("input",{type:"number",value:ct.creditLimit,onChange:Lt=>Et(L,"creditLimit",Lt.target.value)}):`$${Ce(L.creditLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Settle Limit"}),e.jsx("span",{children:_e?e.jsx("input",{type:"number",value:ct.settleLimit,onChange:Lt=>Et(L,"settleLimit",Lt.target.value)}):`$${Ce(L.balanceOwed,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Balance"}),e.jsxs("span",{className:Tt(L.balance),children:[jt(L.balance)," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>ga(L,"balance"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Lifetime"}),e.jsx("span",{children:Ce(L.lifetime,0).toLocaleString("en-US")})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Pending"}),e.jsx("span",{children:jt(L.pendingBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Available"}),e.jsx("span",{children:jt(L.availableBalance??L.balance??0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"FP Balance"}),e.jsx("span",{children:jt(L.freeplayBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Payout"}),e.jsx("span",{children:"$6,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:_e?e.jsxs("select",{value:ct.status,onChange:Lt=>Et(L,"status",Lt.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):gt(L.status)})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Payout"}),e.jsx("span",{children:"$5,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Soccer Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Sportsbook"}),e.jsx("span",{children:_e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ct.sports,onChange:()=>Et(L,"sports",!ct.sports)}),e.jsx("span",{className:"slider-mini"})]}):L.settings?.sports??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Casino"}),e.jsx("span",{children:_e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ct.casino,onChange:()=>Et(L,"casino",!ct.casino)}),e.jsx("span",{className:"slider-mini"})]}):L.settings?.casino??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Horses"}),e.jsx("span",{children:_e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!ct.racebook,onChange:()=>Et(L,"racebook",!ct.racebook)}),e.jsx("span",{className:"slider-mini"})]}):L.settings?.racebook??!0?"On":"Off"})]})]})]})})})]},ie)})})]})})}),Y&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit ",ee?.role==="user"?"Player":ee?.role==="agent"?"Agent":"Master Agent",": ",ee?.username]}),e.jsxs("form",{onSubmit:ce,children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:Z.firstName,onChange:S=>te({...Z,firstName:S.target.value}),placeholder:ee?.firstName||"First name"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:Z.lastName,onChange:S=>te({...Z,lastName:S.target.value}),placeholder:ee?.lastName||"Last name"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:Z.phoneNumber,onChange:S=>te({...Z,phoneNumber:S.target.value}),placeholder:ee?.phoneNumber||"Phone number"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:Z.minBet,onChange:S=>te({...Z,minBet:S.target.value}),placeholder:`${ee?.minBet??25}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:Z.maxBet,onChange:S=>te({...Z,maxBet:S.target.value}),placeholder:`${ee?.maxBet??200}`})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:Z.creditLimit,onChange:S=>te({...Z,creditLimit:S.target.value}),placeholder:`${ee?.creditLimit??1e3}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Settle Limit:"}),e.jsx("input",{type:"number",value:Z.balanceOwed,onChange:S=>te({...Z,balanceOwed:S.target.value}),placeholder:`${ee?.balanceOwed??0}`})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:Z.password,onChange:S=>te({...Z,password:S.target.value.toUpperCase()})})]}),e.jsxs("div",{className:"action-buttons",children:[e.jsx("button",{className:"btn-icon",title:"View Details",onClick:()=>Ct(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]})}),e.jsx("button",{className:"btn-icon",title:"Detailed View (Edit)",onClick:()=>V(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),e.jsx("button",{className:"btn-icon",title:"Adjust Balance / Settle",onClick:()=>Mt(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"23"}),e.jsx("path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"})]})}),e.jsx("button",{className:"btn-icon",title:"Reset Password",onClick:()=>Rt(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})}),_==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>Pt(ee),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]}),e.jsxs("div",{className:"payment-apps-section",children:[e.jsx("h4",{className:"section-title",style:{color:"#0d3b5c",marginBottom:"15px"},children:"Payment Apps"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Venmo"}),e.jsx("input",{type:"text",value:Z.apps.venmo,onChange:S=>te({...Z,apps:{...Z.apps,venmo:S.target.value}}),placeholder:"@username"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cashapp"}),e.jsx("input",{type:"text",value:Z.apps.cashapp,onChange:S=>te({...Z,apps:{...Z.apps,cashapp:S.target.value}}),placeholder:"$cashtag"})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Apple Pay"}),e.jsx("input",{type:"text",value:Z.apps.applePay,onChange:S=>te({...Z,apps:{...Z.apps,applePay:S.target.value}}),placeholder:"Phone/Email"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Zelle"}),e.jsx("input",{type:"text",value:Z.apps.zelle,onChange:S=>te({...Z,apps:{...Z.apps,zelle:S.target.value}}),placeholder:"Phone/Email"})]})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>$(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"auto",backgroundColor:"#17a2b8",color:"white"},onClick:()=>{const S=Z.password||"N/A",J=`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${Z.username||ee.username}
Password: ${S}
Min bet: $${Z.minBet}
Max bet: $${Z.maxBet}
Credit: $${Z.creditLimit}


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
`;navigator.clipboard.writeText(J).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]})]})]})}),Se&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Ue()]}),e.jsxs("form",{onSubmit:Bt,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Ue()}),q==="status"?e.jsxs("select",{value:he,onChange:S=>we(S.target.value),required:!0,children:[e.jsx("option",{value:"",children:"Select status"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):e.jsx("input",{type:"number",step:"1",min:q==="balanceAdjust"?void 0:"0",value:he,onChange:S=>we(S.target.value),placeholder:q==="balanceAdjust"?"Enter + / - amount":"Enter amount",required:!0})]}),e.jsx("p",{className:"bulk-edit-hint",children:q==="balanceAdjust"?"This adds or subtracts from balance for all players shown in the current list.":"This updates all players shown in the current list."}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:N==="bulk-update",children:N==="bulk-update"?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Je(!1),children:"Cancel"})]})]})]})}),Ne.open&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Ne.type==="name"?"Name":Ne.type==="password"?"Password":"Balance",": ",Ne.username]}),e.jsxs("form",{onSubmit:Ma,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Ne.type==="name"?"Name":Ne.type==="password"?"Password":"Balance"}),e.jsx("input",{type:Ne.type==="balance"?"number":"text",value:Ne.value,onChange:S=>Te(J=>({...J,value:Ne.type==="password"?S.target.value.toUpperCase():S.target.value})),autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:N===Ne.customerId,children:N===Ne.customerId?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Te({open:!1,type:"",customerId:null,username:"",value:""}),children:"Cancel"})]})]})]})}),Oe&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-glass-content",children:[e.jsxs("h3",{children:["Adjust Balance: ",le.username]}),e.jsxs("form",{onSubmit:kt,children:[e.jsxs("div",{className:"premium-field-info",children:[e.jsx("label",{children:"Current Net Balance"}),e.jsx("div",{className:`large-val ${Tt(le.currentBalance)}`,children:jt(le.currentBalance)})]}),e.jsxs("div",{className:"p-field",children:[e.jsx("label",{children:"New Net Balance"}),e.jsxs("div",{className:"input-with-symbol",children:[e.jsx("span",{className:"sym",children:"$"}),e.jsx("input",{type:"number",step:"0.01",value:le.nextBalance,onChange:S=>l({...le,nextBalance:S.target.value}),autoFocus:!0,required:!0})]}),e.jsx("small",{className:"field-hint",children:"Setting a new net balance will adjust the credit/owed amount accordingly."})]}),e.jsxs("div",{className:"modal-premium-actions",children:[e.jsx("button",{type:"submit",className:"btn-save-premium",disabled:N!==null,children:N!==null?"Updating...":"Confirm Adjustment"}),e.jsx("button",{type:"button",className:"btn-cancel-premium",onClick:()=>P(!1),children:"Cancel"})]})]})]})}),e.jsx("style",{children:`
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

      `})]})]})]})}const Xa=a=>{const n=Number(a);return Number.isFinite(n)?Math.round(n*100)/100:0},El=a=>{const n=Number(a);return Number.isFinite(n)?Math.round(n*1e4)/1e4:0},As=(a,n)=>{const i=Number(a);return Number.isFinite(i)?i:n},rr=(a,n)=>{const i=a&&typeof a=="object"&&a.settings&&typeof a.settings=="object"?a.settings:{},p=i.freePlayPercent??a?.freePlayPercent??20,g=El(Math.max(0,As(p,20))),x=Xa(Math.max(0,As(n,0))),v=i.maxFpCredit??a?.maxFpCredit??null,w=v===null?0:As(v,0),f=v===null||w<=0,B=Xa(Math.max(0,w)),h=Xa(x*(g/100));let N=0;return g>0&&h>0&&(f?N=h:B>0&&(N=Math.min(h,B))),{bonusAmount:Xa(Math.max(0,N)),percent:g,cap:B,depositAmount:x,unlimited:f}},$l=[{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdraw"},{value:"credit_adj",label:"Credit Adj"},{value:"debit_adj",label:"Debit Adj"},{value:"fp_deposit",label:"FP Deposit"}],Rl=10,Ul=(a=new Date)=>{const n=new Date(a);if(Number.isNaN(n.getTime()))return"";const i=n.getFullYear(),p=String(n.getMonth()+1).padStart(2,"0"),g=String(n.getDate()).padStart(2,"0");return`${i}-${p}-${g}`},es={deposit:"Customer Deposit",withdrawal:"Customer Withdrawal",credit_adj:"Customer Credit Adjustment",debit_adj:"Customer Debit Adjustment",fp_deposit:"Customer Freeplay Deposit"},Ps=(a,n="")=>({id:a,agentId:n,searchQuery:"",selectedUserId:"",type:"deposit",applyDepositFreeplayBonus:!0,amount:"",figureDate:Ul(),description:es.deposit,searchOpen:!1,busy:!1,error:""});function _l(){const[a,n]=t.useState("admin"),[i,p]=t.useState([]),[g,x]=t.useState([]),[v,w]=t.useState("manual"),[f,B]=t.useState(""),[h,N]=t.useState({}),[m,u]=t.useState(()=>Array.from({length:Rl},(P,le)=>Ps(`manual-${le+1}`))),[k,G]=t.useState({}),[D,F]=t.useState({totalDeposits:0,totalWithdrawals:0,pendingCount:0}),[C,j]=t.useState([]),[W,r]=t.useState([]),[M,T]=t.useState(!0),[o,U]=t.useState(!1),[ae,z]=t.useState(""),[y,K]=t.useState(""),c=t.useMemo(()=>{const P=new Map;for(const le of i){const l=String(le.id||"");l&&P.set(l,le)}return P},[i]),E=t.useMemo(()=>{const P=f.trim().toLowerCase();return P?g.filter(le=>{const l=String(le.username||"").toLowerCase(),q=String(le.phoneNumber||"").toLowerCase();return l.includes(P)||q.includes(P)}):g},[g,f]),O=async(P,le)=>{if(le==="admin")try{const l=await ui(P);F({totalDeposits:Number(l?.totalDeposits||0),totalWithdrawals:Number(l?.totalWithdrawals||0),pendingCount:Number(l?.pendingCount||0)})}catch{}},_=async(P,le)=>{if(le!=="admin"){j(W);return}try{const l=await Da({user:"",type:"all",status:"all",time:"30d",limit:30},P);j(Array.isArray(l?.transactions)?l.transactions:[])}catch{j(W)}},H=async()=>{const P=localStorage.getItem("token");if(!P){z("Please login to view cashier data."),T(!1);return}try{T(!0),z("");const le=await zt(P),l=String(le?.role||"admin");n(l);let q=[];if(l==="admin"?q=await qt(P):q=await pa(P),p(Array.isArray(q)?q:[]),l==="admin"||l==="master_agent"||l==="super_agent")try{const re=await Yt(P),he=Array.isArray(re)?re:[];x(he),N(we=>{const Se={...we};for(const Je of he){const ze=String(Je.id||"");ze&&typeof Se[ze]!="boolean"&&(Se[ze]=!1)}return Se}),G(we=>{const Se={...we};for(const Je of he){const ze=String(Je.id||"");ze&&!Se[ze]&&(Se[ze]=Ps(ze,ze))}return Se})}catch{x([])}else x([]);await Promise.all([O(P,l),_(P,l)])}catch(le){z(le.message||"Failed to load cashier data")}finally{T(!1)}};t.useEffect(()=>{H()},[]),t.useEffect(()=>{a!=="admin"&&j(W)},[W,a]);const de=P=>{if(P==null)return"—";const le=Number(P);return Number.isNaN(le)?"—":`$${le.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`},De=P=>{const le=String(P.searchQuery||"").trim().toLowerCase();return i.filter(re=>P.agentId?String(re?.agentId?.id||re?.agentId||"")===String(P.agentId):!0).filter(re=>{if(!le)return!0;const he=String(re.username||"").toLowerCase(),we=String(re.fullName||`${re.firstName||""} ${re.lastName||""}`).toLowerCase(),Se=String(re.phoneNumber||"").toLowerCase();return he.includes(le)||we.includes(le)||Se.includes(le)}).slice(0,12)},Y=P=>{const le=String(P?.reason||"").toUpperCase(),l=String(P?.type||"").toLowerCase();return le==="FREEPLAY_ADJUSTMENT"||le==="DEPOSIT_FREEPLAY_BONUS"||le==="REFERRAL_FREEPLAY_BONUS"||le==="NEW_PLAYER_FREEPLAY_BONUS"?"FP Deposit":le==="CASHIER_DEPOSIT"||l==="deposit"?"Deposit":le==="CASHIER_WITHDRAWAL"||l==="withdrawal"?"Withdraw":le==="CASHIER_CREDIT_ADJUSTMENT"?"Credit Adj":le==="CASHIER_DEBIT_ADJUSTMENT"?"Debit Adj":"Adjustment"},$=P=>P==="deposit"||P==="credit_adj",ee=P=>{const le=Number(P);return Number.isFinite(le)?Math.round(le*100)/100:0},fe=(P,le,l=!1)=>{if(l){G(q=>{const re=q[P];return re?{...q,[P]:le(re)}:q});return}u(q=>q.map(re=>re.id===P?le(re):re))},Z=async(P,le=!1)=>{const l=localStorage.getItem("token");if(!l){z("Please login to continue.");return}const q=Number(P.amount||0),re=String(P.selectedUserId||""),he=c.get(re);if(!he){fe(P.id,Ye=>({...Ye,error:"Select a customer first."}),le);return}if(!Number.isFinite(q)||q<=0){fe(P.id,Ye=>({...Ye,error:"Enter a valid amount."}),le);return}const we=Number(he.balance||0),Se=Number(he.freeplayBalance||0),Je=(P.description||"").trim()||es[P.type],ze=P.figureDate?`${Je} (Figure Date: ${P.figureDate})`:Je;fe(P.id,Ye=>({...Ye,busy:!0,error:""}),le),U(!0),z(""),K("");try{let Ye=we,dt=Se,tt="CASHIER_CREDIT_ADJUSTMENT",Ze="adjustment",$e=0,ht=0;if(P.type==="fp_deposit"){const Ve=await qn(re,{operationMode:"transaction",amount:q,direction:"credit",description:ze},l),He=Number(Ve?.user?.freeplayBalance);Number.isFinite(He)?dt=He:dt=ee(Se+q)}else{const Ve=$(P.type);Ye=ee(we+(Ve?q:-q)),P.type==="deposit"?(tt="CASHIER_DEPOSIT",Ze="deposit"):P.type==="withdrawal"?(tt="CASHIER_WITHDRAWAL",Ze="withdrawal"):P.type==="credit_adj"?(tt="CASHIER_CREDIT_ADJUSTMENT",Ze="adjustment"):(tt="CASHIER_DEBIT_ADJUSTMENT",Ze="adjustment");const He=await ha(re,{operationMode:"transaction",amount:q,direction:Ve?"credit":"debit",type:Ze,reason:tt,description:ze,applyDepositFreeplayBonus:P.type==="deposit"&&!le?P.applyDepositFreeplayBonus!==!1:!1},l),at=Number(He?.user?.balance);Number.isFinite(at)&&(Ye=at);const Xe=Number(He?.user?.freeplayBalance);Number.isFinite(Xe)&&(dt=Xe),$e=Number(He?.freeplayBonus?.amount||0),ht=Number(He?.referralBonus?.amount||0)}p(Ve=>Ve.map(He=>String(He.id||"")!==re?He:{...He,balance:Ye,freeplayBalance:dt}));const bt=[{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:P.type==="deposit"?"deposit":P.type==="withdrawal"?"withdrawal":"adjustment",user:he.username,userId:re,amount:q,date:new Date().toISOString(),status:"completed",reason:P.type==="fp_deposit"?"FREEPLAY_ADJUSTMENT":tt,description:ze}];$e>0&&bt.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}-fp`,type:"adjustment",user:he.username,userId:re,amount:$e,date:new Date().toISOString(),status:"completed",reason:"DEPOSIT_FREEPLAY_BONUS",description:"Auto free play bonus from deposit"}),r(Ve=>[...bt,...Ve].slice(0,30)),await Promise.all([O(l,a),_(l,a)]),fe(P.id,Ve=>({...Ve,amount:"",applyDepositFreeplayBonus:!0,description:es[Ve.type],busy:!1,error:""}),le);const lt=[`Transaction applied for ${he.username}.`];$e>0&&lt.push(`Auto free play bonus added: ${de($e)}.`),ht>0&&lt.push(`Referral bonus granted: ${de(ht)}.`),K(lt.join(" "))}catch(Ye){fe(P.id,dt=>({...dt,busy:!1,error:Ye.message||"Failed to apply transaction."}),le)}finally{U(!1)}},te=(P,le,l)=>{const q=De(P);return e.jsxs("div",{className:"cashier-customer-cell",children:[e.jsx("button",{type:"button",className:"cashier-find-btn",children:"Find"}),e.jsxs("div",{className:"cashier-customer-search",children:[e.jsx("input",{type:"text",placeholder:"Search ...",value:P.searchQuery,onFocus:()=>le({...P,searchOpen:!0}),onBlur:()=>setTimeout(()=>le({...P,searchOpen:!1}),120),onChange:re=>le({...P,searchQuery:re.target.value,searchOpen:!0,selectedUserId:""})}),P.searchOpen&&e.jsx("div",{className:"cashier-search-dropdown",children:q.length===0?e.jsx("div",{className:"cashier-search-empty",children:"No matching users"}):q.map(re=>{const he=String(re.id||"");return e.jsxs("button",{type:"button",className:"cashier-search-item",onMouseDown:()=>l(re),children:[e.jsx("span",{children:String(re.username||"").toUpperCase()}),e.jsx("small",{children:re.fullName||`${re.firstName||""} ${re.lastName||""}`})]},he)})})]})]})},Oe=(P,le=!1)=>{const l=c.get(String(P.selectedUserId||"")),q=Number(l?.balanceOwed||0),re=Number(l?.balance||0),he=le?null:rr(l,Number(P.amount||0)),we=Se=>{fe(P.id,()=>Se,le)};return e.jsxs("tr",{children:[e.jsx("td",{children:te(P,we,Se=>{const Je=String(Se.id||"");we({...P,selectedUserId:Je,searchQuery:Se.username||"",searchOpen:!1,error:""})})}),e.jsx("td",{className:"cashier-num",children:l?de(q):"--"}),e.jsx("td",{className:"cashier-num",children:l?de(re):"--"}),e.jsx("td",{children:e.jsx("select",{value:P.type,onChange:Se=>we({...P,type:Se.target.value,description:es[Se.target.value]||P.description}),children:$l.filter(Se=>!le||Se.value!=="fp_deposit").map(Se=>e.jsx("option",{value:Se.value,children:Se.label},Se.value))})}),e.jsx("td",{children:e.jsxs("div",{className:"cashier-amount-wrap",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"Amount",value:P.amount,onChange:Se=>we({...P,amount:Se.target.value})}),e.jsx("button",{type:"button",className:"cashier-zero-btn",onClick:()=>we({...P,amount:"0"}),children:"Zero"})]})}),e.jsx("td",{children:e.jsx("input",{type:"date",value:P.figureDate,onChange:Se=>we({...P,figureDate:Se.target.value})})}),e.jsxs("td",{children:[e.jsx("input",{type:"text",placeholder:"Description",value:P.description,onChange:Se=>we({...P,description:Se.target.value})}),P.type==="deposit"&&!le&&he&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"8px",fontSize:"12px",color:"#111827",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:P.applyDepositFreeplayBonus!==!1,onChange:Se=>we({...P,applyDepositFreeplayBonus:Se.target.checked})}),e.jsx("span",{children:`${he.percent}% Freeplay (${de(he.bonusAmount)})`})]})]}),e.jsxs("td",{children:[e.jsx("button",{type:"button",className:"cashier-continue-btn",disabled:P.busy||o,onClick:()=>Z(P,le),children:P.busy?"Saving...":"Continue"}),P.error&&e.jsx("div",{className:"cashier-row-error",children:P.error})]})]},P.id)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Cashier"})}),e.jsxs("div",{className:"view-content cashier-v2",children:[M&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading cashier data..."}),!M&&e.jsxs(e.Fragment,{children:[ae&&e.jsx("div",{className:"alert error",children:ae}),y&&e.jsx("div",{className:"alert success",children:y}),e.jsxs("div",{className:"cashier-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Deposits (Today)"}),e.jsx("p",{className:"amount",children:de(D.totalDeposits)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Withdrawals (Today)"}),e.jsx("p",{className:"amount",children:de(D.totalWithdrawals)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("p",{className:"amount",children:Number(D.pendingCount||0)})]})]}),e.jsxs("div",{className:"cashier-top-filters",children:[e.jsxs("div",{className:"cashier-agent-filter",children:[e.jsx("span",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search ...",value:f,onChange:P=>B(P.target.value)})]}),e.jsxs("select",{value:v,onChange:P=>w(P.target.value),children:[e.jsx("option",{value:"manual",children:"Manual Mode"}),e.jsx("option",{value:"agent",children:"Agent Mode"})]})]}),v==="manual"?e.jsx("div",{className:"cashier-grid-wrap",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:m.map(P=>Oe(P,!1))})]})}):e.jsx("div",{className:"cashier-agent-mode",children:E.length===0?e.jsx("div",{className:"cashier-empty",children:"No agents found."}):E.map(P=>{const le=String(P.id||""),l=k[le]||Ps(le,le),q=!!h[le];return e.jsxs("div",{className:"cashier-agent-card",children:[e.jsxs("button",{type:"button",className:"cashier-agent-head",onClick:()=>N(re=>({...re,[le]:!re[le]})),children:[e.jsx("span",{children:q?"−":"+"}),e.jsx("span",{children:String(P.username||"").toUpperCase()})]}),q&&e.jsx("div",{className:"cashier-agent-body",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:Oe(l,!0)})]})})]},le)})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Transactions"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Type"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Description"})]})}),e.jsx("tbody",{children:C.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"empty-msg",children:"No recent transactions."})}):C.map(P=>{const le=Y(P),l=le==="Deposit"||le==="Credit Adj"||le==="FP Deposit";return e.jsxs("tr",{children:[e.jsx("td",{children:le}),e.jsx("td",{children:P.user||"Unknown"}),e.jsx("td",{className:l?"positive":"negative",children:de(P.amount)}),e.jsx("td",{children:P.date?new Date(P.date).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${P.status||"completed"}`,children:P.status||"completed"})}),e.jsx("td",{children:P.description||"—"})]},P.id)})})]})]})]})]})]})}const Ht=a=>String(a||"").toUpperCase(),$s=a=>{const n=String(a||"").replace(/\D/g,"");return n.length===0?"":n.length<=3?n:n.length<=6?`${n.slice(0,3)}-${n.slice(3)}`:`${n.slice(0,3)}-${n.slice(3,6)}-${n.slice(6,10)}`},Ls=a=>String(a||"").replace(/[^A-Z0-9]/g,""),Wl=a=>{const n=String(a||"").replace(/\D/g,"");return n?n.slice(-4):""},Rs=(a,n,i,p="")=>{const g=Ls(Ht(a)),x=Ls(Ht(n)),v=Wl(i);if(v==="")return"";if(g!==""&&x!=="")return`${g.slice(0,3)}${x.slice(0,3)}${v}`.toUpperCase();const w=Ls(Ht(p));return w!==""?`${w.slice(0,6)}${v}`.toUpperCase():""},Ds=a=>{const n=String(a||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!n)return"";const i=n.match(/^[A-Z]+/);return i&&i[0]?i[0]:n.replace(/\d+$/,"")||n},Ol=a=>a?`FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`:`FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`,zl=new Set(["admin","agent","master_agent","super_agent"]),Vl=a=>!zl.has(String(a?.role||"").trim().toLowerCase()),aa=a=>String(a||"").trim().toLowerCase(),Qt=a=>String(a||"").trim(),Hl=new Set(["admin","agent","master_agent","super_agent"]),ts=a=>String(a?.nodeType||"").trim().toLowerCase()==="player"?!1:Hl.has(aa(a?.role)),ta=a=>{const n=aa(a?.role);return n==="master_agent"||n==="super_agent"},ns=a=>aa(a?.role)==="agent",ir=a=>{if(!ts(a))return null;const n=Array.isArray(a.children)?a.children.map(i=>ir(i)).filter(Boolean):[];return{...a,id:Qt(a.id),children:n}},La=(a,n)=>{const i=Qt(n);if(!i||!a)return null;if(Qt(a.id)===i)return a;const p=Array.isArray(a.children)?a.children:[];for(const g of p){const x=La(g,i);if(x)return x}return null},Us=(a,n)=>{const i=Qt(n);if(!i||!a)return[];const p=Qt(a.id);if(p===i)return[p];const g=Array.isArray(a.children)?a.children:[];for(const x of g){const v=Us(x,i);if(v.length>0)return[p,...v]}return[]},_s=(a,n,i=!0,p=0,g=[])=>(a&&((i||p>0)&&n(a,p)&&g.push(a),(Array.isArray(a.children)?a.children:[]).forEach(v=>_s(v,n,!0,p+1,g))),g),Gl=a=>{const n=aa(a?.role);return n==="master_agent"?"MASTER":n==="super_agent"?"SUPER":n==="agent"?"AGENT":n==="admin"?"ADMIN":n?n.replace(/_/g," ").toUpperCase():"ACCOUNT"},ql=a=>aa(a?.role).replace(/_/g,"-")||"account",Yl=a=>{const n=String(a?.username||"").toLowerCase(),p=aa(a?.role).replace(/_/g," ");return`${n} ${p}`.trim()},Ws=(a,n)=>{const i=String(n||"").trim().toLowerCase();return!i||Yl(a).includes(i)?!0:(Array.isArray(a?.children)?a.children:[]).some(p=>Ws(p,i))};function Ql({rootNode:a,loading:n=!1,error:i="",searchQuery:p="",onSearchQueryChange:g,expandedNodes:x,onToggleNode:v,onSelectNode:w,onSelectDirect:f,selectedNodeId:B="",directSelected:h=!1,selectionMode:N="player",searchPlaceholder:m="Search accounts...",emptyLabel:u="No matching accounts"}){const k=String(p||"").trim().toLowerCase(),G=k!==""||n||i,D=(C,j=0,W=!1)=>{if(!C||!ts(C)||N==="master"&&!W&&!ta(C)||k&&!Ws(C,k))return null;if(N==="player"&&!ns(C)){const y=(Array.isArray(C.children)?C.children:[]).filter(ts).map(K=>D(K,j,!1));return y.some(Boolean)?e.jsx(e.Fragment,{children:y}):null}const r=Qt(C.id),M=(Array.isArray(C.children)?C.children:[]).filter(z=>ts(z)&&(N!=="master"||ta(z))),T=M.length>0&&(W||ta(C)),o=k?!0:x.has(r),U=N==="player"?ns(C):W?typeof f=="function":ta(C),ae=W?h:B!==""&&B===r;return e.jsxs("div",{className:"assignment-tree-branch",children:[e.jsxs("div",{className:`tree-node ${W?"root-node":""} assignment-tree-row ${ae?"selected":""} ${U?"selectable":""}`,style:W?void 0:{paddingLeft:`${16+j*20}px`},children:[e.jsx("button",{type:"button",className:`assignment-tree-toggle-btn ${T?"":"is-spacer"}`,onClick:()=>{T&&v?.(r)},"aria-label":T?o?"Collapse branch":"Expand branch":"No child accounts",disabled:!T,children:T?o?"−":"+":""}),e.jsxs("button",{type:"button",className:"assignment-tree-node-btn",onClick:()=>{if(U){if(W&&typeof f=="function"){f(C);return}w?.(C);return}T&&v?.(r)},children:[e.jsx("span",{className:"node-name",children:String(C.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${ql(C)}`,children:Gl(C)})]})]}),T&&o&&M.length>0&&e.jsx("div",{className:"node-children assignment-tree-children",children:M.map(z=>D(z,j+1,!1))})]},`${r||"root"}-${j}`)},F=!!a&&Ws(a,k);return e.jsxs("div",{className:"assignment-tree-picker",children:[e.jsxs("div",{className:"search-pill assignment-tree-search-pill",children:[e.jsx("span",{className:"pill-label",children:"Tree"}),e.jsx("input",{type:"text",placeholder:m,value:p,onChange:C=>g?.(C.target.value)})]}),G&&e.jsx("div",{className:"assignment-tree-results-dropdown",children:e.jsx("div",{className:"tree-scroll-area assignment-tree-scroll-area",children:n?e.jsx("div",{className:"tree-loading",children:"Loading hierarchy..."}):i?e.jsx("div",{className:"tree-error",children:i}):F?D(a,0,!0):e.jsx("div",{className:"tree-loading",children:u})})}),e.jsx("style",{children:`
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
      `})]})}const Kl=(a,n)=>{const i=n.password||"N/A";if(a==="player")return`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${n.username}
Password: ${i}
Min bet: $${n.minBet||25}
Max bet: $${n.maxBet||200}
Credit: $${n.creditLimit||1e3}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${Ol(!!n.grantStartingFreeplay)}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;const p=a==="agent"?"Agent":"Master Agent",g=a==="agent"?`
Standard Min bet: $${n.defaultMinBet||25}
Standard Max bet: $${n.defaultMaxBet||200}
Standard Credit: $${n.defaultCreditLimit||1e3}
`:"";return`Welcome to the team! Here’s your ${p} administrative account info.

Login: ${n.username}
Password: ${i}
${g}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`};function Jl({initialType:a="player"}){const n=(A,I,je)=>{let Q;const Be=new Promise((Fe,Ge)=>{Q=setTimeout(()=>Ge(new Error(je)),Math.max(1e3,I))});return Promise.race([A,Be]).finally(()=>clearTimeout(Q))},[i,p]=t.useState([]),[g,x]=t.useState([]),[v,w]=t.useState(!0),[f,B]=t.useState(""),[h,N]=t.useState(null),[m,u]=t.useState(!1),[k,G]=t.useState(!1),[D,F]=t.useState(null),[C,j]=t.useState(""),[W,r]=t.useState(""),[M,T]=t.useState([]),[o,U]=t.useState(!0),[ae,z]=t.useState(""),[y,K]=t.useState([]),[c,E]=t.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),[O,_]=t.useState({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),[H,de]=t.useState(""),[De,Y]=t.useState(""),[$,ee]=t.useState([]),[fe,Z]=t.useState(""),[te,Oe]=t.useState(a||"player"),[P,le]=t.useState("admin"),[l,q]=t.useState(!1),[re,he]=t.useState(""),[we,Se]=t.useState(""),[Je,ze]=t.useState(!1),[Ye,dt]=t.useState(""),[tt,Ze]=t.useState(""),[$e,ht]=t.useState(null),[bt,lt]=t.useState(!1),[Ve,He]=t.useState(""),[at,Xe]=t.useState(()=>new Set),St=async(A,I)=>{if(aa(I)==="agent")return ht(null),He(""),Xe(new Set),lt(!1),null;try{lt(!0);const Q=await as(A),Be=Q?.root?ir({...Q.root,children:Array.isArray(Q.tree)?Q.tree:[]}):null;return ht(Be),He(""),Xe(new Set),Be}catch(Q){return console.error("Failed to load assignment hierarchy:",Q),ht(null),He(Q?.message||"Failed to load hierarchy"),Xe(new Set),null}finally{lt(!1)}};t.useEffect(()=>{(async()=>{try{w(!0);const I=localStorage.getItem("token")||sessionStorage.getItem("token");if(!I){p([]),x([]),ht(null),He(""),Xe(new Set),B("Please login to load users.");return}const je=String(localStorage.getItem("userRole")||"").toLowerCase();let Q=null;try{Q=await zt(I,{timeoutMs:3e4})}catch(Fe){console.warn("CustomerCreationWorkspace: getMe failed, falling back to stored role.",Fe)}const Be=String(Q?.role||je||"admin").toLowerCase();if(le(Be),dt(Q?.username||""),Ze(Q?.id||""),q(!!Q?.viewOnly),Be==="agent"){const Fe=await pa(I);p(Fe||[]),x([]),await St(I,Be)}else{const[Fe,Ge]=await Promise.all([qt(I),Yt(I)]);p(Fe||[]),x(Ge||[]),await St(I,Be)}if(B(""),Q?.username)try{const Fe=Ds(Q.username);if(!Fe)return;const{nextUsername:Ge}=await Ot(Fe,I,{type:"player"});E(Ae=>({...Ae,username:Ge}))}catch(Fe){console.error("Failed to prefetch next username:",Fe)}}catch(I){console.error("Error fetching add-customer context:",I),B("Failed to load users: "+I.message)}finally{w(!1)}})()},[]),t.useEffect(()=>{if(!a||a===te)return;(async()=>await ke(a))()},[a]);const d=async({overrideDuplicate:A=!1}={})=>{try{u(!0),A||N(null),B("");const I=localStorage.getItem("token")||sessionStorage.getItem("token");if(!I){B("Please login to create users.");return}if(!String(c.username||"").trim()||!String(c.firstName||"").trim()||!String(c.lastName||"").trim()||!String(c.phoneNumber||"").trim()||!String(c.password||"").trim()){B("Username, first name, last name, phone number, and password are required.");return}if(te==="player"){if(String(c.minBet??"").trim()===""||String(c.maxBet??"").trim()===""||String(c.creditLimit??"").trim()===""||String(c.balanceOwed??"").trim()===""){B("Min bet, max bet, credit limit, and settle limit are required for players.");return}if(P!=="agent"&&!String(c.agentId||"").trim()){B("Please assign this player to a regular Agent.");return}}const Q={...c,apps:O};A&&(Q.allowDuplicateSave=!0),Q.balance===""&&delete Q.balance,te!=="player"?(delete Q.referredByUserId,delete Q.grantStartingFreeplay,delete Q.minBet,delete Q.maxBet,delete Q.creditLimit,delete Q.balanceOwed,te==="super_agent"&&(delete Q.defaultMinBet,delete Q.defaultMaxBet,delete Q.defaultCreditLimit,delete Q.defaultSettleLimit)):Q.referredByUserId||delete Q.referredByUserId,(te==="agent"||te==="super_agent")&&Q.agentId&&(Q.parentAgentId=Q.agentId),te==="agent"||te==="super_agent"?(Q.agentPercent!==""?Q.agentPercent=parseFloat(Q.agentPercent):delete Q.agentPercent,Q.playerRate!==""?Q.playerRate=parseFloat(Q.playerRate):delete Q.playerRate,H!==""&&(Q.hiringAgentPercent=parseFloat(H)),De!==""&&(Q.subAgentPercent=parseFloat(De)),$.length>0&&(Q.extraSubAgents=$.filter(Re=>Re.name.trim()!==""||Re.percent!=="").map(Re=>({name:Re.name.trim(),percent:parseFloat(Re.percent)||0})))):(delete Q.agentPercent,delete Q.playerRate);let Be=null;te==="player"?P==="agent"||P==="super_agent"||P==="master_agent"?Be=await mi(Q,I):Be=await pi(Q,I):te==="agent"?P==="admin"?Be=await Bs({...Q,role:"agent"},I):Be=await Fs({...Q,role:"agent"},I):te==="super_agent"&&(P==="admin"?Be=await Bs({...Q,role:"master_agent"},I):Be=await Fs({...Q,role:"master_agent"},I));const Fe=te;B(""),N(null),r(""),T([]),_({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),E({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",defaultMinBet:"",defaultMaxBet:"",defaultCreditLimit:"",defaultSettleLimit:"",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),Oe(Fe),he(""),de(""),Y(""),ee([]),ze(!1),F(null),j(""),z(""),K([]),U(!0);const Ae=Fe==="player"?"Player":Fe==="agent"?"Agent":"Master Agent";if(r(Be?.assigned?`${Ae} assigned successfully.`:`${Ae} created successfully.`),P==="agent"){const Re=await pa(I);p(Re||[])}else{const[Re,Ue]=await Promise.all([qt(I),Yt(I)]);p(Re||[]),x(Ue||[]),await St(I,P)}}catch(I){console.error("Create user failed:",I);const je=Array.isArray(I?.duplicateMatches)?I.duplicateMatches:Array.isArray(I?.details?.matches)?I.details.matches:[],Q=I?.isDuplicate===!0||I?.duplicate===!0||I?.code==="DUPLICATE_PLAYER"||I?.details?.duplicate===!0;N(Q?{message:I?.message||"Likely duplicate player detected.",matches:je}:null),B(I.message||"Failed to create user")}finally{u(!1)}},R=async()=>{try{G(!0),B(""),r(""),T([]),K([]);const A=localStorage.getItem("token")||sessionStorage.getItem("token");if(!A){B("Please login to import users.");return}if(!D){B("Please choose an Excel/CSV file first.");return}if(o&&(P==="admin"||P==="master_agent"||P==="super_agent")&&!ae){B("Select an agent to assign imported players to, or uncheck the assignment option.");return}const I=await n(hi(D,A,{defaultAgentId:ae||"",timeoutMs:45e3,forceAgentAssignment:o}),5e4,"Import request timed out. Please try again."),je=Array.isArray(I?.createdRows)?I.createdRows.length:0,Q=Number(I?.created),Be=Number(I?.failed),Fe=Number.isFinite(Q)?Q:je,Ge=Number.isFinite(Be)?Be:0,Ae=String(I?.message||"").trim();!Number.isFinite(Q)&&!Number.isFinite(Be)?r(Ae||`Import complete: ${Fe} created, ${Ge} failed.`):r(`Import complete: ${Fe} created, ${Ge} failed.${Ae?` ${Ae}`:""}`);const Re=Array.isArray(I?.createdRows)?I.createdRows.map(Ue=>String(Ue?.username||"").toUpperCase()).filter(Boolean):[];T(Re),K(Array.isArray(I?.errors)?I.errors:[]),F(null),j(""),z("");try{if(P==="agent"){const Ue=await n(pa(A),15e3,"Players refresh timed out");p(Ue||[])}else{const[Ue,gt]=await Promise.all([n(qt(A),15e3,"Users refresh timed out"),n(Yt(A),15e3,"Agents refresh timed out")]);p(Ue||[]),x(gt||[])}}catch(Ue){console.warn("Post-import refresh failed:",Ue),r(gt=>`${gt} Imported, but refresh failed: ${Ue.message||"please reload page."}`)}}catch(A){console.error("Import users failed:",A),B(A.message||"Failed to import users")}finally{G(!1)}},X=async A=>{const I=A.toUpperCase().replace(/[^A-Z0-9]/g,"");if(E(je=>({...je,agentPrefix:I})),Z(""),I.length>=2){const je=te==="super_agent";if(g.some(Ae=>{const Re=String(Ae.role||"").toLowerCase();return je!==(Re==="master_agent"||Re==="super_agent")?!1:String(Ae.username||"").toUpperCase().replace(/MA$/,"").replace(/\d+$/,"")===I})){Z(`Prefix "${I}" is already taken`);return}const Be=localStorage.getItem("token")||sessionStorage.getItem("token"),Fe=te==="super_agent"?"MA":"",Ge=te==="agent"?c.agentId||(P==="master_agent"||P==="super_agent"?tt:""):"";try{const Ae={suffix:Fe,type:"agent"};Ge&&(Ae.agentId=Ge);const{nextUsername:Re}=await Ot(I,Be,Ae);E(Ue=>({...Ue,username:Re}))}catch(Ae){console.error("Failed to get next username from prefix:",Ae)}}else E(je=>({...je,username:""}))},me=async(A,I=null)=>{const je=localStorage.getItem("token")||sessionStorage.getItem("token");if(!je)return;E(Ge=>({...Ge,agentId:A,referredByUserId:""})),he("");const Q=te==="player"?"player":"agent",Be=te==="super_agent"?"MA":"",Fe=te==="agent"||te==="super_agent";if(A){const Ge=I||g.find(Ae=>Ae.id===A);if(Ge)try{const Ae=Fe&&c.agentPrefix?c.agentPrefix:Ds(Ge.username);if(!Ae){E(gt=>({...gt,username:""}));return}const Re=Q==="player"?{suffix:Be,type:Q,agentId:A}:{suffix:Be,type:Q,...te==="agent"?{agentId:A}:{}},{nextUsername:Ue}=await Ot(Ae,je,Re);E(gt=>({...gt,username:Ue,agentPrefix:Fe&&gt.agentPrefix?gt.agentPrefix:Ae}))}catch(Ae){console.error("Failed to get next username:",Ae)}}else{if(te==="player"&&(P==="admin"||It)){E(Ae=>({...Ae,username:""}));return}const Ge=Fe&&c.agentPrefix?c.agentPrefix:Ye?Ds(Ye):"";if(Ge)try{const Ae={suffix:Be,type:Q};Q==="agent"&&te==="agent"&&(P==="master_agent"||P==="super_agent")&&tt&&(Ae.agentId=tt);const{nextUsername:Re}=await Ot(Ge,je,Ae);E(Ue=>({...Ue,username:Re,agentPrefix:Fe&&Ue.agentPrefix?Ue.agentPrefix:Ge}))}catch(Ae){console.error("Failed to fetch username for admin:",Ae),E(Re=>({...Re,username:""}))}else E(Ae=>({...Ae,username:""}))}},ke=async A=>{Oe(A),Z(""),he(""),de(""),Y(""),ee([]),E(je=>({...je,agentPercent:"",playerRate:""}));const I=localStorage.getItem("token")||sessionStorage.getItem("token");if(I)if(A==="super_agent"||A==="agent"){const je=String(c.agentId||"").trim(),Q=je?La($e,je):null,Be=!!(Q&&ta(Q)),Fe=Be?je:"";Be||E(Ue=>({...Ue,agentId:"",parentAgentId:""})),Se(""),ze(!1),E(Ue=>({...Ue,referredByUserId:""}));const Ge=A==="super_agent"?"MA":"",Ae=c.agentPrefix,Re="agent";if(Ae)try{const Ue={suffix:Ge,type:Re};A==="agent"&&Fe?Ue.agentId=Fe:A==="agent"&&(P==="master_agent"||P==="super_agent")&&tt&&(Ue.agentId=tt);const{nextUsername:gt}=await Ot(Ae,I,Ue);E(Bt=>({...Bt,username:gt,agentPrefix:Ae}))}catch(Ue){console.error("Failed to re-fetch username on type change",Ue)}else E(Ue=>({...Ue,username:""}))}else await me(""),ze(!1),E(je=>({...je,referredByUserId:""}))},ge=(A,I,je)=>{const Q=Rs(A,I,je,c.username);E(Be=>({...Be,password:Q}))},Ne=A=>{const I=Ht(A);E(je=>{const Q={...je,firstName:I};return ge(I,Q.lastName,Q.phoneNumber),Q})},Te=A=>{const I=Ht(A);E(je=>{const Q={...je,lastName:I};return ge(Q.firstName,I,Q.phoneNumber),Q})},Ke=A=>{const I=$s(A);E(je=>{const Q={...je,phoneNumber:I};return ge(Q.firstName,Q.lastName,I),Q})},yt=!l&&!m&&!!String(c.username||"").trim()&&!!String(c.firstName||"").trim()&&!!String(c.lastName||"").trim()&&!!String(c.phoneNumber||"").trim()&&!!String(c.password||"").trim()&&(te!=="player"||P==="agent"||!!String(c.agentId||"").trim())&&(te!=="player"||String(c.minBet??"").trim()!==""&&String(c.maxBet??"").trim()!==""&&String(c.creditLimit??"").trim()!==""&&String(c.balanceOwed??"").trim()!=="")&&!fe,It=P==="master_agent"||P==="super_agent",vt=te==="agent"||te==="super_agent";t.useMemo(()=>$e?te==="player"?_s($e,(A,I)=>I>0&&ns(A),!1):_s($e,(A,I)=>I>0&&ta(A),!1):[],[$e,te]);const st=t.useMemo(()=>{if(!$e)return null;const A=String(c.agentId||"").trim();return A?La($e,A):vt?$e:null},[$e,c.agentId,vt]),jt=t.useMemo(()=>{if(te==="player")return st?String(st.username||"").toUpperCase():"Select an agent";if(!String(c.agentId||"").trim()){const A=String($e?.username||Ye||"").trim().toUpperCase();return A?`${A} (ME)`:"DIRECT (CREATED BY ME)"}return st?String(st.username||"").toUpperCase():"Select a master agent"},[te,st,c.agentId,$e,Ye]),Mt=vt?"Search master agents or agents...":"Search agents...",kt=vt?"No matching master-agent branches":"No matching agents",Nt=A=>{const I=Qt(A);I&&Xe(je=>{const Q=new Set(je);return Q.has(I)?Q.delete(I):Q.add(I),Q})},Ft=A=>{const I=Qt(A);!I||!$e||Xe(je=>{const Q=new Set(je);return Us($e,I).forEach(Fe=>Q.add(Fe)),Q})},$t=async A=>{const I=Qt(A?.id);I&&(Ft(I),await me(I,A))},Rt=async A=>{await me("",A)};t.useEffect(()=>{const A=String(c.agentId||"").trim();if(!A)return;const I=La($e,A);(te==="player"?I&&ns(I):I&&ta(I))||(E(Q=>String(Q.agentId||"").trim()?{...Q,agentId:"",parentAgentId:""}:Q),he(""))},[$e,te,c.agentId]);const V=(()=>{const A=Ia(i.filter(Vl));return te!=="player"&&te!=="agent"&&te!=="super_agent"?[]:P==="agent"?A:c.agentId?A.filter(I=>String(I.agentId?.id||I.agentId||"")===String(c.agentId)):A})(),ce=t.useMemo(()=>V.map(A=>{const I=String(A.id||"").trim(),je=String(A.username||"").trim(),Q=String(A.fullName||"").trim();if(!I||!je)return null;const Be=`${je.toUpperCase()}${Q?` - ${Q}`:""}`;return{id:I,label:Be,labelLower:Be.toLowerCase(),usernameLower:je.toLowerCase(),isDuplicatePlayer:!!A.isDuplicatePlayer}}).filter(Boolean),[V]),ve=t.useMemo(()=>{const A=String(we||"").trim().toLowerCase();return A?ce.filter(I=>I.labelLower.includes(A)||I.usernameLower.includes(A)).slice(0,20):ce.slice(0,20)},[ce,we]),Ie=t.useMemo(()=>{const A=String(c.referredByUserId||"").trim();return A&&ce.find(I=>I.id===A)||null},[c.referredByUserId,ce]);t.useEffect(()=>{if(Ie){Se(Ie.label);return}String(c.referredByUserId||"").trim()||Se("")},[Ie,c.referredByUserId]);const rt=A=>{Se(A);const I=String(A||"").trim().toLowerCase();if(!I){E(Q=>({...Q,referredByUserId:""}));return}const je=ce.find(Q=>Q.labelLower===I||Q.usernameLower===I);E(Q=>({...Q,referredByUserId:je?je.id:""}))},ut=()=>{const A=String(we||"").trim().toLowerCase();if(!A){E(Q=>({...Q,referredByUserId:""}));return}const I=ce.find(Q=>Q.labelLower===A||Q.usernameLower===A);if(I){Se(I.label),E(Q=>({...Q,referredByUserId:I.id}));return}const je=ce.filter(Q=>Q.labelLower.includes(A)||Q.usernameLower.includes(A));if(je.length===1){Se(je[0].label),E(Q=>({...Q,referredByUserId:je[0].id}));return}E(Q=>({...Q,referredByUserId:""}))},et=A=>{if(!A){Se(""),E(I=>({...I,referredByUserId:""})),ze(!1);return}Se(A.label),E(I=>({...I,referredByUserId:A.id})),ze(!1)};return e.jsxs(e.Fragment,{children:[v&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading setup..."})]}),!v&&e.jsxs(e.Fragment,{children:[f&&e.jsx("div",{className:"error-state",children:f}),h&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:h.message}),h.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:h.matches.map((A,I)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(A.username||"UNKNOWN")}),e.jsx("span",{children:String(A.fullName||"No name")}),e.jsx("span",{children:String(A.phoneNumber||"No phone")})]},`${A.id||A.username||"duplicate"}-${I}`))}),e.jsxs("div",{className:"duplicate-warning-actions",children:[e.jsx("button",{type:"button",className:"duplicate-warning-cancel",onClick:()=>{N(null),B("")},disabled:m,children:"Cancel"}),e.jsx("button",{type:"button",className:"duplicate-warning-confirm",onClick:()=>d({overrideDuplicate:!0}),disabled:m,children:m?"Creating…":"Create Anyway"})]})]}),W&&e.jsx("div",{className:"success-state",children:W}),M.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",M.slice(0,20).join(", "),M.length>20?` (+${M.length-20} more)`:""]}),y.length>0&&e.jsxs("div",{style:{marginTop:"8px",background:"#fff5f5",border:"1px solid #feb2b2",borderRadius:"6px",padding:"10px 14px"},children:[e.jsxs("strong",{style:{color:"#c53030",fontSize:"13px"},children:["Failed rows (",y.length,") — re-importing will retry these safely:"]}),e.jsx("ul",{style:{margin:"6px 0 0 0",padding:"0 0 0 16px",fontSize:"12px",color:"#742a2a",maxHeight:"160px",overflowY:"auto"},children:y.map((A,I)=>e.jsxs("li",{children:["Row ",A.row,A.username?` (${String(A.username).toUpperCase()})`:"",": ",A.error||A.reason||"Unknown error"]},I))})]}),e.jsxs("div",{className:"customer-create-shell",children:[e.jsxs("div",{className:"customer-create-main",children:[e.jsxs("div",{className:"customer-create-top-row",children:[e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-type",children:[e.jsx("label",{children:"Type"}),e.jsx("div",{className:"s-wrapper",children:e.jsxs("select",{value:te,onChange:A=>ke(A.target.value),children:[e.jsx("option",{value:"player",children:"Player"}),(P==="admin"||P==="super_agent"||P==="master_agent")&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"super_agent",children:"Master Agent"})]})]})})]}),(te==="agent"||te==="super_agent")&&e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-prefix",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:c.agentPrefix,onChange:A=>X(A.target.value),placeholder:"Enter prefix",maxLength:5,style:fe?{borderColor:"#ef4444",boxShadow:"0 0 0 2px rgba(239,68,68,0.15)"}:void 0}),fe&&e.jsx("span",{style:{color:"#ef4444",fontSize:12,fontWeight:600,marginTop:4},children:fe})]}),(te==="player"||te==="agent"||te==="super_agent")&&(P==="admin"||P==="super_agent"||P==="master_agent")&&e.jsxs("div",{className:"filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment",children:[e.jsxs("label",{className:"assignment-field-label",children:[e.jsx("span",{children:te==="player"?"Assign to Agent":"Assign to Master Agent"}),e.jsx("span",{className:"assignment-selected-chip",children:jt})]}),e.jsx(Ql,{rootNode:$e,loading:bt,error:Ve,searchQuery:re,onSearchQueryChange:he,expandedNodes:at,onToggleNode:Nt,onSelectNode:$t,onSelectDirect:vt?Rt:null,selectedNodeId:String(c.agentId||""),directSelected:vt&&!String(c.agentId||"").trim(),selectionMode:vt?"master":"player",searchPlaceholder:Mt,emptyLabel:kt})]}),e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-username",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:c.username,placeholder:"Auto-generated",readOnly:!0,className:"readonly-input"})]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:c.firstName,onChange:A=>Ne(A.target.value),placeholder:"Enter first name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:c.lastName,onChange:A=>Te(A.target.value),placeholder:"Enter last name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:c.phoneNumber,onChange:A=>Ke(A.target.value),placeholder:"User contact"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Password ",e.jsx("span",{className:"locked-chip",children:"Locked"})]}),e.jsx("input",{type:"text",value:c.password.toUpperCase(),readOnly:!0,className:"readonly-input",placeholder:"Auto-generated from name + phone"})]})]}),te==="player"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:c.minBet,onChange:A=>E(I=>({...I,minBet:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:c.maxBet,onChange:A=>E(I=>({...I,maxBet:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:c.creditLimit,onChange:A=>E(I=>({...I,creditLimit:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit:"}),e.jsx("input",{type:"number",value:c.balanceOwed,onChange:A=>E(I=>({...I,balanceOwed:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-12",children:[e.jsx("label",{children:"Referred By Player"}),e.jsxs("div",{className:"agent-search-picker referral-search-picker",onFocus:()=>ze(!0),onBlur:()=>{setTimeout(()=>{ut(),ze(!1)},120)},tabIndex:0,children:[e.jsx("div",{className:"referral-search-head",children:e.jsx("input",{type:"text",value:we,onChange:A=>{rt(A.target.value),ze(!0)},onFocus:()=>ze(!0),placeholder:"Search player (leave blank for no referral)",autoComplete:"off"})}),Je&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${c.referredByUserId?"":"selected"}`,onMouseDown:A=>{A.preventDefault(),et(null)},children:e.jsx("span",{children:"No referral"})}),ve.map(A=>e.jsxs("button",{type:"button",className:`agent-search-item ${String(c.referredByUserId||"")===String(A.id)?"selected":""} ${A.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:I=>{I.preventDefault(),et(A)},children:[e.jsx("span",{children:A.label}),A.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-badge",children:"Duplicate"})]},A.id)),ve.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching players"})]})]}),e.jsx("div",{className:"player-referral-settings",children:e.jsx("div",{className:`player-freeplay-toggle ${c.grantStartingFreeplay?"is-selected":"is-unselected"}`,children:e.jsxs("label",{className:"player-freeplay-toggle-row",children:[e.jsx("input",{type:"checkbox",checked:!!c.grantStartingFreeplay,onChange:A=>E(I=>({...I,grantStartingFreeplay:A.target.checked}))}),e.jsx("span",{className:"player-freeplay-toggle-copy",children:e.jsx("span",{className:"player-freeplay-toggle-title",children:"$200 new player freeplay bonus"})})]})})})]})]}),te==="agent"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet: (Standard)"}),e.jsx("input",{type:"number",value:c.defaultMinBet,onChange:A=>E(I=>({...I,defaultMinBet:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet: (Standard)"}),e.jsx("input",{type:"number",value:c.defaultMaxBet,onChange:A=>E(I=>({...I,defaultMaxBet:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit: (Standard)"}),e.jsx("input",{type:"number",value:c.defaultCreditLimit,onChange:A=>E(I=>({...I,defaultCreditLimit:A.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit: (Standard)"}),e.jsx("input",{type:"number",value:c.defaultSettleLimit,onChange:A=>E(I=>({...I,defaultSettleLimit:A.target.value}))})]})]}),(te==="agent"||te==="super_agent")&&(()=>{const A=parseFloat(c.agentPercent)||0,I=parseFloat(H)||0,je=A+I,Q=(()=>{const ot=String(c.agentId||"").trim();if(!$e||!ot)return!1;const At=Us($e,ot);if(At.length<2)return!1;const wt=aa($e?.role);if(wt==="master_agent"||wt==="super_agent")return!0;for(let Ct=1;Ct<At.length-1;Ct++){const Pt=La($e,At[Ct]);if(Pt&&ta(Pt))return!0}return!1})(),Be=je!==100&&Q,Fe=Be&&parseFloat(De)||0,Ge=$.reduce((ot,At)=>ot+(parseFloat(At.percent)||0),0),Ae=A+I+Fe+Ge,Re=100-Ae,Ue=Ae===100?"#16a34a":Ae>100?"#ef4444":"#f59e0b",gt=String(c.agentId||"").trim()&&st?String(st.username||"").toUpperCase():String(Ye||"").toUpperCase()||"HIRING AGENT",Bt=$e&&String($e.username||"").toUpperCase()||"ADMIN";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"commission-split-header",children:[e.jsx("span",{className:"commission-split-title",children:"Commission Split"}),e.jsxs("span",{className:"commission-split-total",style:{color:Ue},children:[Ae.toFixed(2),"%",Ae===100?" ✓":Ae>100?" over":" / 100%"]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Agent % ",e.jsx("span",{className:"commission-name-tag",children:String(c.username||"").toUpperCase()||"NEW AGENT"})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 90",value:c.agentPercent,onChange:ot=>E(At=>({...At,agentPercent:ot.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Hiring Agent % ",e.jsx("span",{className:"commission-name-tag",children:gt})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:H,onChange:ot=>de(ot.target.value)})]}),Be&&e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent % ",e.jsx("span",{className:"commission-name-tag",children:Bt})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:De,onChange:ot=>Y(ot.target.value)})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Player Rate ($)"}),e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"e.g. 25",value:c.playerRate,onChange:ot=>E(At=>({...At,playerRate:ot.target.value}))})]})]}),Be&&(Ae<100&&$.every(wt=>wt.percent!=="")?[...$,{id:`new-${Date.now()}`,name:"",percent:"",isNew:!0}]:$).map((wt,Ct)=>e.jsxs("div",{className:"customer-create-row commission-extra-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-4",children:[e.jsxs("label",{children:["Sub Agent ",Ct+1," Name"]}),e.jsx("input",{type:"text",placeholder:"Username",value:wt.name,onChange:Pt=>{if(wt.isNew)ee(ft=>[...ft,{id:Date.now(),name:Pt.target.value,percent:""}]);else{const ft=[...$];ft[Ct]={...ft[Ct],name:Pt.target.value},ee(ft)}}})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent ",Ct+1," %"]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"%",value:wt.percent,onChange:Pt=>{if(wt.isNew)ee(ft=>[...ft,{id:Date.now(),name:"",percent:Pt.target.value}]);else{const ft=[...$];ft[Ct]={...ft[Ct],percent:Pt.target.value},ee(ft)}}})]}),e.jsx("div",{className:"filter-group customer-field-span-2 commission-remove-cell",children:!wt.isNew&&e.jsx("button",{type:"button",className:"commission-remove-btn",onClick:()=>ee(Pt=>Pt.filter((ft,sa)=>sa!==Ct)),children:"Remove"})})]},wt.id)),Be&&Ae<100&&e.jsx("div",{className:"commission-add-row",children:e.jsxs("span",{className:"commission-remaining",style:{color:Ue},children:[Re.toFixed(2),"% remaining"]})})]})})()]}),e.jsxs("aside",{className:"customer-create-sidebar",children:[e.jsxs("div",{className:"customer-create-side-card customer-create-actions",children:[e.jsx("button",{className:"btn-primary",onClick:d,disabled:!yt,children:m?"Deploying...":`Create ${te==="player"?"Player":te==="agent"?"Agent":"Master Agent"}`}),e.jsx("button",{type:"button",className:"btn-secondary customer-copy-button",onClick:()=>{navigator.clipboard.writeText(Kl(te,c)).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]}),(P==="admin"||P==="master_agent"||P==="super_agent"||P==="agent")&&e.jsxs("div",{className:"customer-create-side-card customer-create-import-panel",children:[e.jsx("label",{children:"Import Players (.xlsx / .csv)"}),e.jsx("input",{type:"file",accept:".xlsx,.csv",onChange:A=>{const I=A.target.files?.[0]||null;F(I),j(I?.name||"")}}),C&&e.jsxs("small",{className:"customer-import-file-name",children:["Selected file: ",C]}),e.jsxs("label",{className:"customer-import-toggle",children:[e.jsx("input",{type:"checkbox",checked:o,onChange:A=>U(A.target.checked)}),e.jsx("span",{children:P==="agent"?"Assign all imported players to me":"Assign all imported players to selected agent"})]}),o&&P!=="agent"&&e.jsxs("select",{value:ae,onChange:A=>z(A.target.value),style:{width:"100%",padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:"4px",fontSize:"13px",marginTop:"4px"},children:[e.jsx("option",{value:"",children:"— Select agent —"}),g.filter(A=>{const I=String(A.role||"").toLowerCase();return I==="agent"||I==="master_agent"||I==="super_agent"}).sort((A,I)=>String(A.username||"").localeCompare(String(I.username||""))).map(A=>{const I=String(A.id||""),je=String(A.role||"").toLowerCase()==="agent"?"Agent":"Master Agent";return e.jsxs("option",{value:I,children:[String(A.username||I).toUpperCase()," (",je,")"]},I)})]}),e.jsx("button",{type:"button",className:"btn-primary",onClick:R,disabled:!D||k,children:k?"Importing...":"Import File"})]})]})]}),e.jsx("style",{children:`
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
          `})]})]})}function Zl({onBack:a}){const[n,i]=t.useState(!0),[p,g]=t.useState("player"),[x,v]=t.useState(()=>String(localStorage.getItem("userRole")||"admin").toLowerCase());t.useEffect(()=>{(async()=>{const N=localStorage.getItem("token")||sessionStorage.getItem("token");if(N)try{const m=await zt(N);m?.role&&v(String(m.role).toLowerCase())}catch(m){console.error("Failed to load add-customer role context:",m)}})()},[]);const w=["admin","super_agent","master_agent"].includes(x),f=h=>{g(h),i(!1)},B=()=>e.jsx("div",{className:"picker-overlay",onClick:()=>i(!1),children:e.jsxs("div",{className:"picker-modal",onClick:h=>h.stopPropagation(),children:[e.jsxs("div",{className:"picker-header",children:[e.jsx("span",{children:"Add Customer"}),e.jsx("button",{type:"button",onClick:()=>i(!1),children:"×"})]}),e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("player"),children:[e.jsx("i",{className:"fa-solid fa-user-plus"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Player"}),e.jsx("p",{children:"Create or import player accounts."})]})]}),w&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("agent"),children:[e.jsx("i",{className:"fa-solid fa-user-gear"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Agent"}),e.jsx("p",{children:"Create a new agent account."})]})]}),w&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("super_agent"),children:[e.jsx("i",{className:"fa-solid fa-user-tie"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Master"}),e.jsx("p",{children:"Create a master agent account."})]})]})]})});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Add Customer"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:a&&e.jsx("button",{type:"button",className:"btn-secondary",onClick:a,children:"Back"})})]}),e.jsx("div",{className:"view-content",children:e.jsx(Jl,{initialType:p})}),n&&B(),e.jsx("style",{children:`
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
      `})]})}function Xl(){const[a,n]=t.useState(""),[i,p]=t.useState("all"),[g,x]=t.useState("all"),[v,w]=t.useState([]),[f,B]=t.useState(!0),[h,N]=t.useState(""),[m,u]=t.useState(null),[k,G]=t.useState({dailyLimit:"",monthlyLimit:"",used:"",status:"active"}),[D,F]=t.useState({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),[C,j]=t.useState(!1),W=c=>`$${Number(c||0).toLocaleString()}`,r=c=>{const E=c.monthlyLimit||1;return Math.min(c.used/E*100,100)},M=c=>c>=85?"critical":c>=65?"warning":"normal",T=t.useMemo(()=>v.reduce((c,E)=>(c.daily+=E.dailyLimit,c.monthly+=E.monthlyLimit,c.used+=E.used,c),{daily:0,monthly:0,used:0}),[v]),o=async()=>{try{B(!0);const c=localStorage.getItem("token");if(!c){w([]),N("Please login to load limits.");return}const E=await xi(c);w(E),N("")}catch(c){console.error("Error loading third party limits:",c),N(c.message||"Failed to load limits")}finally{B(!1)}};t.useEffect(()=>{o();const c=setInterval(()=>{document.hidden||o()},12e4);return()=>clearInterval(c)},[]);const U=v.filter(c=>{const E=c.provider.toLowerCase().includes(a.toLowerCase()),O=i==="all"||c.status===i,_=r(c),H=g==="all"||g==="over-80"&&_>=80||g==="60-80"&&_>=60&&_<80||g==="under-60"&&_<60;return E&&O&&H}),ae=c=>{u(c.id),G({dailyLimit:c.dailyLimit,monthlyLimit:c.monthlyLimit,used:c.used,status:c.status})},z=()=>{u(null),G({dailyLimit:"",monthlyLimit:"",used:"",status:"active"})},y=async c=>{try{const E=localStorage.getItem("token");if(!E){N("Please login to update limits.");return}const O={dailyLimit:Number(k.dailyLimit)||0,monthlyLimit:Number(k.monthlyLimit)||0,used:Number(k.used)||0,status:k.status},_=await fi(c,O,E);w(H=>H.map(de=>de.id===c?{...de,..._.limit}:de)),z(),N("")}catch(E){console.error("Error updating limit:",E),N(E.message||"Failed to update limit")}},K=async()=>{try{j(!0);const c=localStorage.getItem("token");if(!c){N("Please login to create limits.");return}const E={provider:D.provider.trim(),dailyLimit:Number(D.dailyLimit)||0,monthlyLimit:Number(D.monthlyLimit)||0,used:Number(D.used)||0,status:D.status},O=await gi(E,c);w(_=>[..._,O.limit]),F({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),N("")}catch(c){console.error("Error creating limit:",c),N(c.message||"Failed to create limit")}finally{j(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"3rd Party Limits"}),e.jsxs("span",{className:"count",children:[U.length," providers"]})]}),e.jsxs("div",{className:"view-content",children:[f&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading limits..."}),h&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:h}),!f&&!h&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Provider name",value:D.provider,onChange:c=>F(E=>({...E,provider:c.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Daily Limit"}),e.jsx("input",{type:"number",value:D.dailyLimit,onChange:c=>F(E=>({...E,dailyLimit:c.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Monthly Limit"}),e.jsx("input",{type:"number",value:D.monthlyLimit,onChange:c=>F(E=>({...E,monthlyLimit:c.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Used"}),e.jsx("input",{type:"number",value:D.used,onChange:c=>F(E=>({...E,used:c.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:D.status,onChange:c=>F(E=>({...E,status:c.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsx("button",{className:"btn-primary",onClick:K,disabled:C||!D.provider.trim(),children:C?"Saving...":"Add Provider"})]}),e.jsxs("div",{className:"stats-container limits-summary",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Providers"}),e.jsx("div",{className:"amount",children:v.length}),e.jsxs("p",{className:"change",children:["Active: ",v.filter(c=>c.status==="active").length]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Daily Limit Total"}),e.jsx("div",{className:"amount",children:W(T.daily)}),e.jsx("p",{className:"change",children:"Across all providers"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Monthly Limit Total"}),e.jsx("div",{className:"amount",children:W(T.monthly)}),e.jsx("p",{className:"change",children:"Capacity for the month"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Used This Month"}),e.jsx("div",{className:"amount",children:W(T.used)}),e.jsxs("p",{className:"change",children:["Utilization: ",(T.used/(T.monthly||1)*100).toFixed(1),"%"]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Search provider",value:a,onChange:c=>n(c.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:i,onChange:c=>p(c.target.value),children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Utilization"}),e.jsxs("select",{value:g,onChange:c=>x(c.target.value),children:[e.jsx("option",{value:"all",children:"All Levels"}),e.jsx("option",{value:"over-80",children:"Over 80%"}),e.jsx("option",{value:"60-80",children:"60% - 80%"}),e.jsx("option",{value:"under-60",children:"Under 60%"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider"}),e.jsx("th",{children:"Daily Limit"}),e.jsx("th",{children:"Monthly Limit"}),e.jsx("th",{children:"Used"}),e.jsx("th",{children:"Utilization"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:U.map(c=>{const E=r(c);return e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:c.provider})}),e.jsx("td",{children:m===c.id?e.jsx("input",{type:"number",value:k.dailyLimit,onChange:O=>G(_=>({..._,dailyLimit:O.target.value})),className:"inline-input"}):W(c.dailyLimit)}),e.jsx("td",{children:m===c.id?e.jsx("input",{type:"number",value:k.monthlyLimit,onChange:O=>G(_=>({..._,monthlyLimit:O.target.value})),className:"inline-input"}):W(c.monthlyLimit)}),e.jsx("td",{children:m===c.id?e.jsx("input",{type:"number",value:k.used,onChange:O=>G(_=>({..._,used:O.target.value})),className:"inline-input"}):W(c.used)}),e.jsx("td",{children:e.jsxs("div",{className:"usage-meter",children:[e.jsx("div",{className:"usage-bar",children:e.jsx("div",{className:`usage-fill ${M(E)}`,style:{width:`${E}%`}})}),e.jsxs("span",{className:"usage-text",children:[E.toFixed(1),"%"]})]})}),e.jsx("td",{children:m===c.id?e.jsxs("select",{value:k.status,onChange:O=>G(_=>({..._,status:O.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]}):e.jsx("span",{className:`badge ${c.status}`,children:c.status})}),e.jsx("td",{children:c.lastSync?new Date(c.lastSync).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:m===c.id?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>y(c.id),children:"Save"}),e.jsx("button",{className:"btn-small",onClick:z,children:"Cancel"})]}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>ae(c),children:"Edit"}),e.jsx("button",{className:"btn-small",children:"View"})]})})})]},c.id)})})]})})]})]})]})}function eo(){const[a,n]=t.useState("agents"),[i,p]=t.useState(""),[g,x]=t.useState(""),[v,w]=t.useState("any"),[f,B]=t.useState("today"),[h,N]=t.useState("all-types"),[m,u]=t.useState("all-statuses"),[k,G]=t.useState([]),[D,F]=t.useState(!0),[C,j]=t.useState(""),[W,r]=t.useState(""),[M,T]=t.useState(null),o=H=>Number(String(H).replace(/[^0-9.-]+/g,""))||0,U=H=>`$${Number(H||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,ae=(H,de)=>de==="any"?!0:de==="under-100"?H<100:de==="100-500"?H>=100&&H<=500:de==="500-1000"?H>500&&H<=1e3:de==="over-1000"?H>1e3:!0,z=H=>{if(H?.type)return H.type;const de=(H?.description||"").toLowerCase();return de.includes("parlay")?"parlay":de.includes("teaser")?"teaser":"straight"},y=t.useMemo(()=>k.filter(H=>{const de=String(H.agent||"").toLowerCase().includes(i.toLowerCase()),De=String(H.customer||"").toLowerCase().includes(g.toLowerCase()),Y=o(H.risk),$=h==="all-types"||z(H)===h,ee=m==="all-statuses"||String(H.status||"").toLowerCase()===m;return de&&De&&$&&ee&&ae(Y,v)}).sort((H,de)=>a==="agents"?String(H.agent||"").localeCompare(String(de.agent||"")):String(H.customer||"").localeCompare(String(de.customer||""))),[k,i,g,v,h,m,a]),K=y.reduce((H,de)=>{H.risk+=o(de.risk),H.toWin+=o(de.toWin);const De=String(de.status||"pending").toLowerCase();return H.byStatus[De]=(H.byStatus[De]||0)+1,H},{risk:0,toWin:0,byStatus:{}}),c=()=>{p(""),x(""),w("any"),B("today"),N("all-types"),u("all-statuses")},E=async H=>{try{F(!0);const de=localStorage.getItem("token");if(!de){G([]),j("Please login to load bets.");return}const Y=((await rs(H,de))?.bets||[]).map($=>({...$,agent:String($.agent||"direct"),customer:String($.customer||$.username||""),description:String($.description||$.selection||""),risk:Number($.risk||0),toWin:Number($.toWin||0),event:$?.match?.homeTeam&&$?.match?.awayTeam?`${$.match.homeTeam} vs ${$.match.awayTeam}`:"—",markets:Array.isArray($.markets)?$.markets:[],accepted:$.accepted?new Date($.accepted).toLocaleString():"—"}));G(Y),j("")}catch(de){console.error("Error loading bets:",de),j(de.message||"Failed to load bets")}finally{F(!1)}};t.useEffect(()=>{E({time:f,type:h,status:m});const H=setInterval(()=>{document.hidden||E({agent:i,customer:g,amount:v,time:f,type:h,status:m})},9e4);return()=>clearInterval(H)},[i,g,v,f,h,m]);const O=async H=>{const de=localStorage.getItem("token");if(!de){j("Please login to delete bets.");return}if(window.confirm("Delete this bet? This cannot be undone."))try{r(""),T(H),await bi(H,de),j(""),r("Bet deleted successfully."),await E({agent:i,customer:g,amount:v,time:f,type:h,status:m})}catch(De){j(De.message||"Failed to delete bet")}finally{T(null)}},_=()=>{r(""),E({agent:i,customer:g,amount:v,time:f,type:h,status:m})};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Props / Betting Management"})}),e.jsxs("div",{className:"view-content",children:[D&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading bets..."}),C&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:C}),W&&e.jsx("div",{style:{padding:"12px 20px",color:"#15803d",textAlign:"center",fontWeight:600},children:W}),!D&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{padding:"16px 20px",border:"1px solid #dbe4f0",borderRadius:"10px",marginBottom:"18px",background:"#f8fbff"},children:[e.jsx("strong",{style:{display:"block",marginBottom:"6px"},children:"Live Sportsbook Tickets"}),e.jsx("span",{style:{color:"#556274",fontSize:"14px"},children:"This screen now shows real sportsbook tickets from the `bets` collection only. Manual dummy bet entry has been removed."})]}),e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Tickets"}),e.jsx("div",{className:"amount",children:y.length}),e.jsx("p",{className:"change",children:"Filtered by current criteria"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Risk"}),e.jsx("div",{className:"amount",children:U(K.risk)}),e.jsx("p",{className:"change",children:"Across all tickets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Potential Payout"}),e.jsx("div",{className:"amount",children:U(K.toWin)}),e.jsx("p",{className:"change",children:"Current ticket payout value"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending / Won / Lost"}),e.jsxs("div",{className:"amount",children:[K.byStatus.pending||0," / ",K.byStatus.won||0," / ",K.byStatus.lost||0]}),e.jsxs("p",{className:"change",children:["Void: ",K.byStatus.void||0]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search",value:i,onChange:H=>p(H.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Players"}),e.jsx("input",{type:"text",placeholder:"Search",value:g,onChange:H=>x(H.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsxs("select",{value:v,onChange:H=>w(H.target.value),children:[e.jsx("option",{value:"any",children:"Any Amount"}),e.jsx("option",{value:"under-100",children:"Under $100"}),e.jsx("option",{value:"100-500",children:"$100 - $500"}),e.jsx("option",{value:"500-1000",children:"$500 - $1000"}),e.jsx("option",{value:"over-1000",children:"Over $1000"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:m,onChange:H=>u(H.target.value),children:[e.jsx("option",{value:"all-statuses",children:"All Statuses"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"won",children:"Won"}),e.jsx("option",{value:"lost",children:"Lost"}),e.jsx("option",{value:"void",children:"Void"})]})]}),e.jsx("button",{className:"btn-primary",onClick:_,children:"Search"}),e.jsx("button",{className:"btn-secondary",onClick:c,children:"Reset Filters"})]}),e.jsxs("div",{className:"tabs-container",children:[e.jsx("button",{className:`tab ${a==="agents"?"active":""}`,onClick:()=>n("agents"),children:"Agents"}),e.jsx("button",{className:`tab ${a==="players"?"active":""}`,onClick:()=>n("players"),children:"Players"})]}),e.jsxs("div",{className:"additional-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:f,onChange:H=>B(H.target.value),children:[e.jsx("option",{value:"today",children:"Today"}),e.jsx("option",{value:"this-week",children:"This Week"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Type"}),e.jsxs("select",{value:h,onChange:H=>N(H.target.value),children:[e.jsx("option",{value:"all-types",children:"All Types"}),e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]})]}),e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table betting-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Accepted (EST)"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:y.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No sportsbook bets found for the current filters."})}):y.map(H=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:H.agent})}),e.jsx("td",{children:e.jsx("strong",{children:H.customer})}),e.jsxs("td",{children:[e.jsx("div",{children:H.accepted}),e.jsx("div",{style:{color:"#6b7280",fontSize:"12px"},children:H.event})]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z(H)}`,children:z(H)})}),e.jsxs("td",{className:"description-cell",children:[String(H.description||"").split(`
`).filter(Boolean).map((de,De)=>e.jsx("div",{children:de},De)),H.markets.length>0?e.jsxs("div",{style:{color:"#6b7280",fontSize:"12px",marginTop:"6px"},children:["Markets: ",H.markets.join(", ")]}):null]}),e.jsx("td",{children:e.jsx("span",{className:"amount-risk",children:U(H.risk)})}),e.jsx("td",{children:e.jsx("span",{className:"amount-towin",children:U(H.toWin)})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${H.status}`,children:H.status})}),e.jsx("td",{children:e.jsx("button",{className:"btn-delete",onClick:()=>O(H.id),disabled:M===H.id||H.status!=="pending",title:H.status==="pending"?"Delete bet":"Only pending bets can be deleted",children:M===H.id?"...":"×"})})]},H.id))})]})}),e.jsxs("div",{className:"summary-footer",children:[e.jsxs("span",{children:["Total Records: ",y.length]}),e.jsxs("span",{className:"risk-summary",children:["Risking: ",e.jsx("span",{className:"amount-risk",children:U(K.risk)}),"Potential Payout: ",e.jsx("span",{className:"amount-towin",children:U(K.toWin)})]})]})]})]})]})}function to(){const[a,n]=t.useState(""),[i,p]=t.useState("all"),[g,x]=t.useState("revenue"),[v,w]=t.useState("30d"),[f,B]=t.useState([]),[h,N]=t.useState({revenue:0,customers:0,avgWinRate:0,upAgents:0}),[m,u]=t.useState(!0),[k,G]=t.useState(""),[D,F]=t.useState(!1),[C,j]=t.useState(!1),[W,r]=t.useState(""),[M,T]=t.useState(null),o=y=>`$${Number(y||0).toLocaleString(void 0,{maximumFractionDigits:0})}`,U=f.filter(y=>{const K=y.name.toLowerCase().includes(a.toLowerCase()),c=i==="all"||y.trend===i;return K&&c}).sort((y,K)=>g==="customers"?K.customers-y.customers:g==="winRate"?K.winRate-y.winRate:K.revenue-y.revenue),ae=async()=>{try{u(!0);const y=localStorage.getItem("token");if(!y){B([]),G("Please login to load performance.");return}const K=await ji({period:v},y),c=(K.agents||[]).map(E=>({...E,lastActive:E.lastActive?new Date(E.lastActive).toLocaleString():"—"}));B(c),N(K.summary||{revenue:0,customers:0,avgWinRate:0,upAgents:0}),G("")}catch(y){console.error("Error loading agent performance:",y),G(y.message||"Failed to load agent performance")}finally{u(!1)}};t.useEffect(()=>{ae();const y=setInterval(()=>{document.hidden||ae()},12e4);return()=>clearInterval(y)},[v]);const z=async y=>{try{F(!0),j(!0),r(""),T(null);const K=localStorage.getItem("token");if(!K)throw new Error("Please login to view details.");const c=await yi(y.id,{period:v},K);T(c)}catch(K){r(K.message||"Failed to load details")}finally{j(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Performance"}),e.jsxs("span",{className:"count",children:[U.length," agents"]})]}),e.jsxs("div",{className:"view-content",children:[m&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading performance..."}),k&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:k}),!m&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Revenue"}),e.jsx("div",{className:"amount",children:o(h.revenue)}),e.jsx("p",{className:"change",children:"Across filtered agents"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsx("div",{className:"amount",children:h.customers}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Avg. Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(h.avgWinRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Active-customer settled bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Trending Up"}),e.jsx("div",{className:"amount",children:h.upAgents}),e.jsx("p",{className:"change",children:"Agents improving"})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agent"}),e.jsx("input",{type:"text",placeholder:"Search agent",value:a,onChange:y=>n(y.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Trend"}),e.jsxs("select",{value:i,onChange:y=>p(y.target.value),children:[e.jsx("option",{value:"all",children:"All Trends"}),e.jsx("option",{value:"up",children:"Trending Up"}),e.jsx("option",{value:"stable",children:"Stable"}),e.jsx("option",{value:"down",children:"Trending Down"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sort By"}),e.jsxs("select",{value:g,onChange:y=>x(y.target.value),children:[e.jsx("option",{value:"revenue",children:"Revenue"}),e.jsx("option",{value:"customers",children:"Active Customers"}),e.jsx("option",{value:"winRate",children:"Win Rate"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Period"}),e.jsxs("select",{value:v,onChange:y=>w(y.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tier"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Active / Total Customers"}),e.jsx("th",{children:"Win Rate"}),e.jsx("th",{children:"Trend"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:U.map(y=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:y.name})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${y.tier}`,children:y.tier})}),e.jsx("td",{children:o(y.revenue)}),e.jsxs("td",{children:[y.customers," / ",y.totalCustomers||0]}),e.jsx("td",{children:e.jsxs("div",{className:"win-rate",children:[e.jsx("div",{className:"win-rate-bar",children:e.jsx("div",{className:"win-rate-fill",style:{width:`${Math.min(y.winRate,100)}%`}})}),e.jsxs("span",{className:"win-rate-value",children:[Number(y.winRate||0).toFixed(1),"%"]})]})}),e.jsx("td",{children:e.jsx("span",{className:`trend ${y.trend}`,children:y.trend==="up"?"📈":y.trend==="down"?"📉":"➡️"})}),e.jsx("td",{children:y.lastActive}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:e.jsx("button",{className:"btn-small",onClick:()=>z(y),children:"View Details"})})})]},y.id))})]})})]})]}),D&&e.jsx("div",{className:"modal-overlay",onClick:()=>F(!1),children:e.jsxs("div",{className:"modal-content",style:{width:"min(980px, 95vw)",maxHeight:"86vh",overflowY:"auto"},onClick:y=>y.stopPropagation(),children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},children:[e.jsx("h3",{style:{margin:0},children:"Agent Details"}),e.jsx("button",{className:"btn-secondary",onClick:()=>F(!1),children:"Close"})]}),C&&e.jsx("div",{style:{padding:"12px"},children:"Loading details..."}),W&&e.jsx("div",{style:{padding:"12px",color:"red"},children:W}),M&&!C&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{marginBottom:"14px",fontWeight:700},children:[M.agent?.name," | Period: ",M.summary?.period?.toUpperCase()]}),e.jsxs("div",{className:"stats-container",style:{marginBottom:"16px"},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsxs("div",{className:"amount",children:[M.summary.activeCustomers," / ",M.summary.totalCustomers]}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(M.summary.winRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Settled bets only"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Handle / GGR"}),e.jsxs("div",{className:"amount",children:[o(M.summary.totalRisk)," / ",o(M.summary.ggr)]}),e.jsxs("p",{className:"change",children:["Hold: ",Number(M.summary.holdPct||0).toFixed(1),"%"]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bets"}),e.jsx("div",{className:"amount",children:M.summary.betsPlaced}),e.jsxs("p",{className:"change",children:["Settled: ",M.summary.settledBets," | Pending: ",M.summary.pendingBets]})]})]}),e.jsxs("div",{className:"table-container",style:{marginBottom:"14px"},children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Top Customers"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Bets"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"Win Rate"})]})}),e.jsxs("tbody",{children:[(M.topCustomers||[]).map(y=>e.jsxs("tr",{children:[e.jsx("td",{children:y.username}),e.jsx("td",{children:y.bets}),e.jsx("td",{children:o(y.risk)}),e.jsxs("td",{children:[Number(y.winRate||0).toFixed(1),"%"]})]},y.userId)),(!M.topCustomers||M.topCustomers.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"4",children:"No customer performance data for this period."})})]})]})]}),e.jsxs("div",{className:"table-container",children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Recent Bets"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Accepted"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Selection"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"})]})}),e.jsxs("tbody",{children:[(M.recentBets||[]).map(y=>e.jsxs("tr",{children:[e.jsx("td",{children:new Date(y.accepted).toLocaleString()}),e.jsx("td",{children:y.customer}),e.jsx("td",{children:y.type}),e.jsx("td",{children:y.selection}),e.jsx("td",{children:o(y.risk)}),e.jsx("td",{children:o(y.toWin)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${y.status}`,children:y.status})})]},y.id)),(!M.recentBets||M.recentBets.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No bets in this period."})})]})]})]})]})]})})]})}function ao(){return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Analysis"})}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"analysis-container",children:[e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Betting Trends"}),e.jsx("p",{children:"Track and analyze betting patterns across all sports and markets."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Customer Analytics"}),e.jsx("p",{children:"Analyze customer behavior, retention rates, and spending patterns."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Revenue Analysis"}),e.jsx("p",{children:"Comprehensive revenue breakdown by sport, market, and time period."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Risk Analysis"}),e.jsx("p",{children:"Identify and assess potential risk factors in betting operations."}),e.jsx("button",{className:"btn-small",children:"View Details"})]})]})})]})}function so({canManage:a=!0}){const[n,i]=t.useState([]),[p,g]=t.useState(!0),[x,v]=t.useState(""),[w,f]=t.useState(""),[B,h]=t.useState("all"),[N,m]=t.useState(null),[u,k]=t.useState(null),[G,D]=t.useState(!1),F=async()=>{const M=localStorage.getItem("token");if(!M){v("Please login to view IP tracker."),g(!1);return}try{g(!0);const T=await vi({search:w,status:B},M);i(T.logs||[]),v("")}catch(T){console.error("Failed to load IP tracker:",T),v(T.message||"Failed to load IP tracker")}finally{g(!1)}};t.useEffect(()=>{F()},[w,B]);const C=async M=>{const T=localStorage.getItem("token");if(!T){v("Please login to block IPs.");return}if(!a){v("You do not have permission to manage IP actions.");return}try{m(M),await wi(M,T),i(o=>o.map(U=>U.id===M?{...U,status:"blocked"}:U))}catch(o){v(o.message||"Failed to block IP")}finally{m(null)}},j=async M=>{const T=localStorage.getItem("token");if(!T){v("Please login to unblock IPs.");return}if(!a){v("You do not have permission to manage IP actions.");return}try{m(M),await Ni(M,T),i(o=>o.map(U=>U.id===M?{...U,status:"active"}:U))}catch(o){v(o.message||"Failed to unblock IP")}finally{m(null)}},W=async M=>{const T=localStorage.getItem("token");if(!T){v("Please login to whitelist IPs.");return}if(!a){v("You do not have permission to manage IP actions.");return}try{m(M),await Si(M,T),i(o=>o.map(U=>U.id===M?{...U,status:"whitelisted"}:U))}catch(o){v(o.message||"Failed to whitelist IP")}finally{m(null)}},r=M=>{k(M),D(!0)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"IP Tracker"})}),e.jsxs("div",{className:"view-content",children:[p&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading IP logs..."}),x&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:x}),!p&&!x&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Search"}),e.jsx("input",{type:"text",value:w,onChange:M=>f(M.target.value),placeholder:"User or IP"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:B,onChange:M=>h(M.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"blocked",children:"Blocked"})]})]})]}),!a&&e.jsx("div",{style:{marginBottom:"12px",color:"#f59e0b",fontWeight:600},children:"View-only mode: IP actions are disabled by your permissions."}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"IP Address"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Country"}),e.jsx("th",{children:"City"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:n.map(M=>e.jsxs("tr",{children:[e.jsx("td",{className:"monospace",children:M.ip}),e.jsx("td",{children:M.user}),e.jsx("td",{children:M.country||"Unknown"}),e.jsx("td",{children:M.city||"Unknown"}),e.jsx("td",{children:M.lastActive?new Date(M.lastActive).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${M.status}`,children:M.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>r(M),children:"View"}),M.status==="blocked"?e.jsx("button",{className:"btn-small",onClick:()=>j(M.id),disabled:N===M.id||!a,children:N===M.id?"Working...":"Unblock"}):M.status==="whitelisted"?e.jsx("button",{className:"btn-small",onClick:()=>j(M.id),disabled:N===M.id||!a,children:N===M.id?"Working...":"Un-whitelist"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-danger",onClick:()=>C(M.id),disabled:N===M.id||!a,children:N===M.id?"Working...":"Block"}),e.jsx("button",{className:"btn-small btn-primary",onClick:()=>W(M.id),disabled:N===M.id||!a,style:{marginLeft:"4px",backgroundColor:"#3b82f6"},children:N===M.id?"...":"Whitelist"})]})]})]},M.id))})]})})]})]}),G&&u&&e.jsx("div",{className:"modal-overlay",onClick:()=>D(!1),children:e.jsxs("div",{className:"modal-content",onClick:M=>M.stopPropagation(),children:[e.jsx("h3",{children:"IP Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"IP:"})," ",u.ip]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",u.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Country:"})," ",u.country||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"City:"})," ",u.city||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",u.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Active:"})," ",u.lastActive?new Date(u.lastActive).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User Agent:"})," ",u.userAgent||"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>D(!1),children:"Close"})})]})})]})}const Dn=[{value:"player-transactions",label:"Player Transactions"},{value:"agent-transactions",label:"Agent Transactions"},{value:"deleted-transactions",label:"Deleted Transactions"},{value:"free-play-transactions",label:"Free Play Transactions"},{value:"free-play-analysis",label:"Free Play Analysis"},{value:"player-summary",label:"Player Summary"}],Tn=[{value:"all-types",label:"Transactions Type"},{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdrawal"},{value:"adjustment",label:"Adjustment"},{value:"wager",label:"Wager"},{value:"payout",label:"Payout"},{value:"casino",label:"Casino"},{value:"fp_deposit",label:"Free Play"}],Gt=a=>String(a||"").trim().toLowerCase(),no=new Set(["bet_placed","bet_placed_admin","bet_lost","casino_bet_debit"]),ro=new Set(["bet_won","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),io=new Set(["adjustment","credit_adj","debit_adj"]),lo=new Set(["withdrawal","bet_placed","bet_placed_admin","bet_lost","fee","debit","casino_bet_debit"]),oo=new Set(["freeplay_adjustment","deposit_freeplay_bonus","referral_freeplay_bonus","new_player_freeplay_bonus"]),co=(a,n)=>{const i=Gt(n);if(!i||i==="all-types")return!0;const p=Gt(a?.type),g=Gt(a?.reason);return p===i?!0:i==="adjustment"?io.has(p):i==="wager"?no.has(p):i==="payout"?ro.has(p):i==="casino"?p.startsWith("casino_"):i==="fp_deposit"?p==="fp_deposit"||oo.has(g):!1},uo=(a,n)=>{if(!Array.isArray(a))return[];const i=Array.isArray(n)?n.map(p=>Gt(p)).filter(Boolean):[];return i.length===0||i.includes("all-types")?a:a.filter(p=>i.some(g=>co(p,g)))},Os=a=>{const n=Number(a?.signedAmount);if(Number.isFinite(n)&&n!==0)return n;const i=Number(a?.amount||0);if(!Number.isFinite(i))return 0;if(i<0)return i;const p=String(a?.entrySide||"").trim().toUpperCase();if(p==="DEBIT")return-Math.abs(i);if(p==="CREDIT")return Math.abs(i);const g=Number(a?.balanceBefore),x=Number(a?.balanceAfter);if(Number.isFinite(g)&&Number.isFinite(x)&&g!==x)return x<g?-Math.abs(i):Math.abs(i);const v=Gt(a?.type);return lo.has(v)||tr(a)?-Math.abs(i):Math.abs(i)},In=a=>a.reduce((n,i)=>{const p=Os(i),g=Math.abs(p);return n.count+=1,n.grossAmount+=g,n.netAmount+=p,p>=0?n.creditAmount+=p:n.debitAmount+=g,n},{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),Mn=a=>{const n=new Date(a),i=n.getFullYear(),p=String(n.getMonth()+1).padStart(2,"0"),g=String(n.getDate()).padStart(2,"0");return`${i}-${p}-${g}`},xt=a=>{const n=Number(a||0);return Number.isNaN(n)?"0":Math.round(n).toLocaleString("en-US")},Ts=a=>{if(!a)return"—";const n=new Date(a);return Number.isNaN(n.getTime())?"—":n.toLocaleString()},mo=new Set(["admin","agent","master_agent","super_agent"]),po=a=>{const n=new Set,i=[],p=g=>{if(!g||typeof g!="object")return;const x=String(g.id||"").trim(),v=String(g.username||"").trim(),w=String(g.role||"").trim().toLowerCase();x&&v&&mo.has(w)&&!n.has(x)&&(n.add(x),i.push({id:x,username:v,role:w})),(Array.isArray(g.children)?g.children:[]).forEach(p)};return a?.root?p({...a.root,children:Array.isArray(a?.tree)?a.tree:[]}):Array.isArray(a?.tree)&&a.tree.forEach(p),i},ho=a=>{if(!Array.isArray(a))return[];const n=new Set,i=[];return a.forEach(p=>{const g=String(p?.id||"").trim(),x=String(p?.username||"").trim();if(!g||!x||n.has(g))return;n.add(g);const v=String(p?.fullName||`${String(p?.firstName||"").trim()} ${String(p?.lastName||"").trim()}`).trim();i.push({id:g,username:x,fullName:v})}),i};function xo({viewContext:a}){const n=t.useMemo(()=>Mn(new Date),[]),i=t.useMemo(()=>{const d=new Date;return d.setDate(d.getDate()-7),Mn(d)},[]),[p,g]=t.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[x,v]=t.useState(""),[w,f]=t.useState(""),[B,h]=t.useState(a?.enteredBy||""),[N,m]=t.useState(["deposit","withdrawal"]),[u,k]=t.useState(!1),[G,D]=t.useState("player-transactions"),[F,C]=t.useState(i),[j,W]=t.useState(n),[r,M]=t.useState([]),[T,o]=t.useState({count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),[U,ae]=t.useState("transactions"),[z,y]=t.useState(Tn),[K,c]=t.useState(!0),[E,O]=t.useState(""),[_,H]=t.useState(!1),[de,De]=t.useState(!1),[Y,$]=t.useState(!1),[ee,fe]=t.useState(!1),[Z,te]=t.useState([]),[Oe,P]=t.useState([]),[le,l]=t.useState([]),[q,re]=t.useState(!1),he=t.useRef(new Map);t.useEffect(()=>{const d=()=>g(window.innerWidth<=768);return window.addEventListener("resize",d),()=>window.removeEventListener("resize",d)},[]),t.useEffect(()=>{let d=!0;const R=localStorage.getItem("token");return R?((async()=>{try{const me=await as(R);if(!d)return;te(po(me))}catch(me){console.error("Failed to fetch agent suggestions:",me),d&&te([])}})(),()=>{d=!1}):void 0},[]);const we=t.useMemo(()=>{const d=x.trim().toLowerCase();return(d===""?Z:Z.filter(X=>String(X.username||"").toLowerCase().includes(d)||String(X.role||"").replace(/_/g," ").includes(d))).slice(0,12)},[Z,x]),Se=t.useMemo(()=>{const d=B.trim().toLowerCase(),R=new Set,X=[],me=(ge,Ne=null)=>{const Te=String(ge||"").trim();if(!Te)return;const Ke=Te.toLowerCase();R.has(Ke)||(R.add(Ke),X.push({id:Ke,username:Te,role:Ne}))};return Oe.forEach(ge=>{me(ge?.value||ge?.username,ge?.role||null)}),r.forEach(ge=>{me(ge?.actorUsername||ge?.enteredBy,ge?.actorRole||null)}),Z.forEach(ge=>{me(ge?.username,ge?.role||null)}),me("HOUSE","admin"),(d===""?X:X.filter(ge=>ge.username.toLowerCase().includes(d))).slice(0,12)},[Oe,B,r,Z]),Je=t.useMemo(()=>{const d=new Set,R=[];return r.forEach(X=>{const me=String(X?.playerUsername||"").trim();if(!me)return;const ke=me.toLowerCase();d.has(ke)||(d.add(ke),R.push({id:ke,username:me,fullName:String(X?.playerName||"").trim()}))}),R.slice(0,12)},[r]);t.useEffect(()=>{if(!Y)return;const d=localStorage.getItem("token");if(!d){l([]),re(!1);return}const R=w.trim();if(R===""){l([]),re(!1);return}const X=R.toLowerCase(),me=he.current.get(X);if(me){l(me),re(!1);return}let ke=!1;re(!0);const ge=window.setTimeout(async()=>{try{const Ne=await qt(d,{q:R});if(ke)return;const Te=ho(Ne).slice(0,12);he.current.set(X,Te),l(Te)}catch(Ne){console.error("Failed to fetch player suggestions:",Ne),ke||l([])}finally{ke||re(!1)}},220);return()=>{ke=!0,window.clearTimeout(ge)}},[w,Y]);const ze=t.useMemo(()=>w.trim()===""?Je:le,[w,Je,le]),Ye=t.useMemo(()=>z.map(d=>({value:Gt(d?.value),label:String(d?.label||d?.value||"").trim()})).filter(d=>d.value&&d.label),[z]),dt=t.useMemo(()=>Ye.filter(d=>d.value!=="all-types"),[Ye]),tt=t.useMemo(()=>dt.map(d=>d.value),[dt]),Ze=t.useMemo(()=>{if(N.includes("all-types"))return["all-types"];const d=new Set(tt),R=N.map(X=>Gt(X)).filter(X=>d.has(X));return R.length>0?R:["all-types"]},[N,tt]),$e=d=>{const R=String(d||"").toLowerCase();return R==="master_agent"?"MASTER":R==="super_agent"?"SUPER":R==="admin"?"ADMIN":"AGENT"},ht=async(d={})=>{const R=localStorage.getItem("token");if(!R){O("Please login to view transaction history."),c(!1);return}const X=d.mode!==void 0?d.mode:G,me=d.startDate!==void 0?d.startDate:F,ke=d.endDate!==void 0?d.endDate:j,ge=d.selectedTypeValues!==void 0?d.selectedTypeValues:Ze,Ne=d.agentsSearch!==void 0?d.agentsSearch:x,Te=d.playersSearch!==void 0?d.playersSearch:w,Ke=d.enteredBySearch!==void 0?d.enteredBySearch:B;if(me&&ke&&me>ke){O("Start date cannot be after end date.");return}try{c(!0),O("");const yt=ge.length===1?ge[0]:"all-types",It=Ne.trim()!==""||Te.trim()!==""||Ke.trim()!=="",vt={mode:X,agents:Ne,players:Te,transactionType:yt,startDate:me,endDate:ke,limit:It?1e3:700};Ke.trim()!==""&&(vt.enteredBy=Ke.trim());const st=await Da(vt,R),jt=Array.isArray(st?.rows)?st.rows:Array.isArray(st?.transactions)?st.transactions:[],Mt=String(st?.resultType||"transactions"),kt=Mt==="transactions"&&ge.length>1&&!ge.includes("all-types"),Nt=kt?uo(jt,ge):jt;M(Nt),ae(Mt),o(Mt==="transactions"?kt?In(Nt):st?.summary||In(Nt):st?.summary||{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0});const Ft=Array.isArray(st?.meta?.transactionTypes)?st.meta.transactionTypes:[];y(Ft.length>0?Ft:Tn),P(Array.isArray(st?.meta?.enteredByOptions)?st.meta.enteredByOptions:[]),H(!0)}catch(yt){console.error("Failed to load transaction history:",yt),O(yt.message||"Failed to load transaction history")}finally{c(!1)}};t.useEffect(()=>{a?.enteredBy?(h(a.enteredBy),ht({enteredBySearch:a.enteredBy})):ht()},[]);const bt=d=>{d.preventDefault(),k(!1),ht()},lt=d=>{const R=Gt(d);if(R){if(R==="all-types"||tt.length===0){m(["all-types"]),ht({selectedTypeValues:["all-types"]});return}m(X=>{const me=X.includes("all-types")?[...tt]:X.map(Ne=>Gt(Ne)).filter(Ne=>tt.includes(Ne)),ke=me.includes(R)?me.filter(Ne=>Ne!==R):[...me,R],ge=ke.length===0||ke.length===tt.length?["all-types"]:ke;return ht({selectedTypeValues:ge}),ge})}},Ve=Dn.find(d=>d.value===G)?.label||"Transaction History",He=(d,R)=>{const X=d!==0?d:Number(R||0),me=xt(Math.abs(X));return X>=0?`+$${me}`:`-$${me}`},at=()=>{const d=r.reduce((R,X)=>R+Os(X),0);return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Total: ",e.jsxs("span",{className:d<0?"negative":"txh-total-green",children:["$",xt(Math.abs(d))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-transactions",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Entered By"})]})}),e.jsxs("tbody",{children:[r.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,className:"txh-empty-cell",children:"No transactions matched these filters."})}):r.map((R,X)=>{const me=Os(R),ke=me>=0;return e.jsxs("tr",{className:X%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-date",children:Ts(R.date)}),e.jsx("td",{className:"txh-col-user",children:String(R.agentUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(R.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-type",children:er(R)}),e.jsx("td",{className:"txh-col-desc",children:R.description||R.reason||"—"}),e.jsx("td",{className:`txh-col-amount ${ke?"txh-credit":"txh-debit"}`,children:He(me,R.amount)}),e.jsx("td",{className:"txh-col-user",children:String(R.actorUsername||R.enteredBy||"HOUSE").toUpperCase()})]},`${String(R.id||R.transactionId||"tx")}-${X}`)}),r.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:5,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:`txh-col-amount ${d>=0?"txh-credit":"txh-debit"}`,children:e.jsxs("strong",{children:[d>=0?"+":"-","$",xt(Math.abs(d))]})}),e.jsx("td",{})]})]})]})})]})},Xe=()=>{const d=r.reduce((me,ke)=>me+Number(ke.creditAmount||0),0),R=r.reduce((me,ke)=>me+Number(ke.debitAmount||0),0),X=d-R;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net Free Play: ",e.jsxs("span",{className:X<0?"negative":"txh-total-green",children:["$",xt(Math.abs(X))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-analysis",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Free Play Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[r.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"txh-empty-cell",children:"No free play analysis data found."})}):r.map((me,ke)=>{const ge=Number(me.netAmount||0);return e.jsxs("tr",{className:ke%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(me.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(me.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(me.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",xt(me.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",xt(me.debitAmount)]}),e.jsxs("td",{className:ge<0?"txh-debit":"txh-credit",children:[ge>=0?"+":"-","$",xt(Math.abs(ge))]}),e.jsxs("td",{children:["$",xt(me.currentFreeplayBalance)]}),e.jsx("td",{className:"txh-col-date",children:Ts(me.lastTransactionAt)})]},`${String(me.playerId||me.playerUsername||"fp")}-${ke}`)}),r.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",xt(d)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",xt(R)]})}),e.jsx("td",{className:X<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[X>=0?"+":"-","$",xt(Math.abs(X))]})}),e.jsx("td",{colSpan:2})]})]})]})})]})},St=()=>{const d=r.reduce((me,ke)=>me+Number(ke.creditAmount||0),0),R=r.reduce((me,ke)=>me+Number(ke.debitAmount||0),0),X=d-R;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net: ",e.jsxs("span",{className:X<0?"negative":"txh-total-green",children:["$",xt(Math.abs(X))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-summary",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Wagered"}),e.jsx("th",{children:"Payout"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[r.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:10,className:"txh-empty-cell",children:"No player summary data found."})}):r.map((me,ke)=>{const ge=Number(me.netAmount||0);return e.jsxs("tr",{className:ke%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(me.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(me.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(me.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",xt(me.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",xt(me.debitAmount)]}),e.jsxs("td",{className:ge<0?"txh-debit":"txh-credit",children:[ge>=0?"+":"-","$",xt(Math.abs(ge))]}),e.jsxs("td",{children:["$",xt(me.wagerAmount)]}),e.jsxs("td",{children:["$",xt(me.payoutAmount)]}),e.jsxs("td",{children:["$",xt(me.currentBalance)]}),e.jsx("td",{className:"txh-col-date",children:Ts(me.lastTransactionAt)})]},`${String(me.playerId||me.playerUsername||"summary")}-${ke}`)}),r.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",xt(d)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",xt(R)]})}),e.jsx("td",{className:X<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[X>=0?"+":"-","$",xt(Math.abs(X))]})}),e.jsx("td",{colSpan:4})]})]})]})})]})};return e.jsxs("div",{className:"admin-view txh-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Transaction History"})}),e.jsxs("div",{className:"view-content txh-content",children:[e.jsxs("form",{className:"txh-filter-panel",onSubmit:bt,children:[e.jsxs("div",{className:`txh-search-row${de?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Agents"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:x,onChange:d=>{v(d.target.value),De(!0)},onFocus:()=>{De(!0),$(!1),fe(!1)},onBlur:()=>setTimeout(()=>De(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),de&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Agent suggestions",children:we.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching agents"}):we.map(d=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:R=>{R.preventDefault(),v(String(d.username||"")),De(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(d.username||"").toUpperCase()}),e.jsx("span",{className:`txh-agent-badge role-${String(d.role||"agent").replace(/_/g,"-")}`,children:$e(d.role)})]},d.id))})]})]}),e.jsxs("div",{className:`txh-search-row${Y?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Players"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:w,onChange:d=>{f(d.target.value),$(!0)},onFocus:()=>{$(!0),De(!1),fe(!1)},onBlur:()=>setTimeout(()=>$(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),Y&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Player suggestions",children:q?e.jsx("div",{className:"txh-suggest-empty",children:"Loading players..."}):ze.length===0?e.jsx("div",{className:"txh-suggest-empty",children:w.trim()===""?"Type to search players":"No matching players"}):ze.map(d=>e.jsxs("button",{type:"button",className:"txh-suggest-item txh-suggest-item-player",onMouseDown:R=>{R.preventDefault(),f(String(d.username||"")),$(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(d.username||"").toUpperCase()}),e.jsx("span",{className:"txh-suggest-meta",children:d.fullName||"Player account"})]},d.id))})]})]}),e.jsxs("div",{className:`txh-search-row${ee?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Entered By"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:B,onChange:d=>{h(d.target.value),fe(!0)},onFocus:()=>{fe(!0),De(!1),$(!1)},onBlur:()=>setTimeout(()=>fe(!1),120),placeholder:"Search who entered the transaction...",className:"txh-search-input",autoComplete:"off"}),ee&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Entered by suggestions",children:Se.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching users"}):Se.map(d=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:R=>{R.preventDefault(),h(String(d.username||"")),fe(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(d.username||"").toUpperCase()}),d.role&&e.jsx("span",{className:`txh-agent-badge role-${String(d.role||"agent").replace(/_/g,"-")}`,children:d.role==="master_agent"?"MASTER":d.role==="super_agent"?"SUPER":d.role==="admin"?"ADMIN":"AGENT"})]},d.id))})]})]}),e.jsx("div",{className:"txh-filter-help",children:'Use "Entered By" to filter the person or house account that posted the transaction.'}),e.jsxs("div",{className:"txh-select-row",children:[e.jsxs("div",{className:"txh-type-filter-wrap",children:[e.jsxs("button",{type:"button",className:`txh-type-select txh-type-trigger${u?" open":""}`,onClick:()=>k(d=>!d),"aria-expanded":u,"aria-haspopup":"menu","aria-label":"Transactions type",children:[e.jsx("span",{children:Ze.includes("all-types")?"All Types":`${Ze.length} Type${Ze.length!==1?"s":""}`}),e.jsx("i",{className:`fa-solid fa-chevron-${u?"up":"down"}`,"aria-hidden":"true"})]}),u&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"txh-type-backdrop",onClick:()=>k(!1),"aria-label":"Close transaction type filters"}),e.jsx("div",{className:"txh-type-menu",role:"menu","aria-label":"Transaction type filters",children:dt.length===0?e.jsx("div",{className:"txh-type-empty",children:"No transaction types available."}):dt.map(d=>{const R=Ze.includes("all-types")||Ze.includes(d.value);return e.jsxs("label",{className:"txh-type-toggle-row",children:[e.jsx("span",{children:d.label}),e.jsxs("span",{className:"txh-switch",children:[e.jsx("input",{type:"checkbox",checked:R,onChange:()=>lt(d.value)}),e.jsx("span",{className:"txh-switch-slider"})]})]},d.value)})})]})]}),e.jsx("select",{value:G,onChange:d=>{const R=d.target.value;D(R),k(!1),ht({mode:R})},className:"txh-mode-select","aria-label":"Report mode",children:Dn.map(d=>e.jsx("option",{value:d.value,children:d.label},d.value))})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:F,onChange:d=>C(d.target.value),className:"txh-date-input","aria-label":"Start date"})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:j,onChange:d=>W(d.target.value),className:"txh-date-input","aria-label":"End date"})]}),e.jsx("button",{type:"submit",className:"txh-search-btn","aria-label":"Search",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})})]}),e.jsxs("div",{className:"txh-result-head",children:[e.jsx("h3",{children:Ve}),e.jsxs("div",{className:"txh-summary-inline",children:[e.jsxs("span",{children:[Number(T.count||0)," Rows"]}),e.jsxs("span",{className:Number(T.netAmount||0)<0?"negative":"positive",children:["Net: ",xt(T.netAmount)]}),e.jsxs("span",{children:["Gross: ",xt(T.grossAmount)]})]})]}),K&&e.jsx("div",{className:"txh-empty",children:"Loading transaction history..."}),!K&&E&&e.jsx("div",{className:"txh-empty txh-error",children:E}),!K&&!E&&_&&(U==="analysis"?Xe():U==="summary"?St():at())]}),e.jsx("style",{children:`
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
      `})]})}function go(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState({user:"",sport:"all",status:"all",time:"30d"}),[f,B]=t.useState(null),[h,N]=t.useState(null),[m,u]=t.useState(!1),k=async()=>{const C=localStorage.getItem("token");if(!C){x("Please login to view deleted wagers."),p(!1);return}try{p(!0);const j=await Yn(v,C);n(j.wagers||[]),x("")}catch(j){console.error("Failed to load deleted wagers:",j),x(j.message||"Failed to load deleted wagers")}finally{p(!1)}};t.useEffect(()=>{k()},[v]);const G=async C=>{const j=localStorage.getItem("token");if(!j){x("Please login to restore wagers.");return}try{B(C),await ki(C,j),n(W=>W.map(r=>r.id===C?{...r,status:"restored",restoredAt:new Date().toISOString()}:r))}catch(W){x(W.message||"Failed to restore wager")}finally{B(null)}},D=C=>{N(C),u(!0)},F=C=>{if(C==null)return"—";const j=Number(C);return Number.isNaN(j)?"—":`$${Math.round(j)}`};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Deleted Wagers"})}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading deleted wagers..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User"}),e.jsx("input",{type:"text",value:v.user,onChange:C=>w(j=>({...j,user:C.target.value})),placeholder:"Search user"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:v.sport,onChange:C=>w(j=>({...j,sport:C.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"NBA",children:"NBA"}),e.jsx("option",{value:"NFL",children:"NFL"}),e.jsx("option",{value:"MLB",children:"MLB"}),e.jsx("option",{value:"NHL",children:"NHL"}),e.jsx("option",{value:"Soccer",children:"Soccer"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:v.status,onChange:C=>w(j=>({...j,status:C.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"deleted",children:"Deleted"}),e.jsx("option",{value:"restored",children:"Restored"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:v.time,onChange:C=>w(j=>({...j,time:C.target.value})),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Reason"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:a.map(C=>e.jsxs("tr",{children:[e.jsx("td",{children:C.user}),e.jsx("td",{children:F(C.amount)}),e.jsx("td",{children:C.sport}),e.jsx("td",{children:C.deletedAt?new Date(C.deletedAt).toLocaleDateString():"—"}),e.jsx("td",{children:C.reason}),e.jsx("td",{children:e.jsx("span",{className:`badge ${C.status}`,children:C.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>D(C),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>G(C.id),disabled:C.status==="restored"||f===C.id,children:f===C.id?"Working...":"Restore"})]})]},C.id))})]})})]})]}),m&&h&&e.jsx("div",{className:"modal-overlay",onClick:()=>u(!1),children:e.jsxs("div",{className:"modal-content",onClick:C=>C.stopPropagation(),children:[e.jsx("h3",{children:"Deleted Wager Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",h.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",F(h.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",h.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Reason:"})," ",h.reason]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",h.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Deleted At:"})," ",h.deletedAt?new Date(h.deletedAt).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Restored At:"})," ",h.restoredAt?new Date(h.restoredAt).toLocaleString():"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>u(!1),children:"Close"})})]})})]})}function fo(){const[a,n]=t.useState("game"),[i,p]=t.useState("all"),[g,x]=t.useState([]),[v,w]=t.useState(!1),[f,B]=t.useState([]),[h,N]=t.useState(!0),[m,u]=t.useState(""),[k,G]=t.useState(""),[D,F]=t.useState(!1),[C,j]=t.useState({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),W=600,r=[{id:"nfl",label:"NFL",icon:"🏈"},{id:"nba",label:"NBA",icon:"🏀"},{id:"mlb",label:"MLB",icon:"⚾"},{id:"nhl",label:"NHL",icon:"🏒"},{id:"soccer",label:"Soccer",icon:"⚽"},{id:"tennis",label:"Tennis",icon:"🎾"},{id:"golf",label:"Golf",icon:"⛳"},{id:"boxing",label:"Boxing",icon:"🥊"},{id:"esports",label:"Esports",icon:"🎮"},{id:"props",label:"Props",icon:"📊"},{id:"futures",label:"Futures",icon:"📈"},{id:"contests",label:"Contests",icon:"🏆"}],M=_=>{x(H=>H.includes(_)?H.filter(de=>de!==_):[...H,_])},T=[{header:"Period",key:"period"},{header:"Game",key:"game"},{header:"Time",key:"time"},{header:"Event",key:"event"},{header:"Spread",key:"spread"},{header:"Moneyline",key:"moneyline"},{header:"Total",key:"total"},{header:"Team Total",key:"teamTotal"},{header:"OS",key:"os"},{header:"US",key:"us"}],o=async()=>{const _=localStorage.getItem("token");if(!_){u("Please login to load games."),N(!1);return}try{N(!0);const H=await is(_);B(H||[]),u("")}catch(H){console.error("Failed to load matches:",H),u(H.message||"Failed to load matches")}finally{N(!1)}};t.useEffect(()=>{o()},[]);const U=_=>{if(!_?.startTime)return i==="all";if(i==="all")return!0;const H=new Date(_.startTime),de=new Date,De=new Date(de.getFullYear(),de.getMonth(),de.getDate()),Y=new Date(De.getTime()+1440*60*1e3),$=new Date(Y.getTime()+1440*60*1e3),ee=new Date(De.getTime()+10080*60*1e3);return i==="today"?H>=De&&H<Y:i==="tomorrow"?H>=Y&&H<$:i==="this-week"?H>=De&&H<ee:!0},ae=_=>a==="game"?!0:_?.status===a,z=_=>{if(!g.length)return!0;const H=String(_?.sport||"").toLowerCase();return g.includes(H)},y=f.filter(U).filter(ae).filter(z);t.useEffect(()=>{!h&&y.length===0&&w(!0)},[h,y.length]);const K=async()=>{const _=localStorage.getItem("token");if(!_){u("Please login to add games.");return}try{G("add"),await Hn({homeTeam:C.homeTeam.trim(),awayTeam:C.awayTeam.trim(),startTime:C.startTime,sport:C.sport,status:C.status},_),j({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),F(!1),o()}catch(H){u(H.message||"Failed to add game")}finally{G("")}},c=async()=>{const _=localStorage.getItem("token");if(!_){u("Please login to update odds.");return}try{const H=Date.now();G("odds"),await Qn(_),o()}catch(H){u(H.message||"Failed to update odds")}finally{const H=Date.now()-startedAt;H<W&&await new Promise(de=>setTimeout(de,W-H)),G("")}},E=async()=>{const _=localStorage.getItem("token");if(!_){u("Please login to clear cache.");return}try{G("cache"),await Pi(_)}catch(H){u(H.message||"Failed to clear cache")}finally{G("")}},O=async _=>{const H=localStorage.getItem("token");if(!H){u("Please login to settle matches.");return}try{G(`settle-${_.id}`);const de=_.id,De=window.prompt(`Settlement mode for ${_.homeTeam} vs ${_.awayTeam}:
- Type "auto" to grade from score (recommended)
- Type "home" or "away" for manual H2H winner`,"auto");if(!De){G("");return}const Y=De.trim().toLowerCase();if(!["auto","home","away"].includes(Y)){u("Invalid option. Use auto, home, or away.");return}if(Y==="auto")await jn({matchId:de},H);else{const $=await Ai(de,H);if($?.manualWinnerAllowed!==!0){u($?.reason||"Manual winner mode is blocked for this match.");return}const ee=Y==="home"?_.homeTeam:_.awayTeam;await jn({matchId:de,winner:ee},H)}await o(),u(""),alert("Match settled successfully.")}catch(de){u(de.message||"Failed to settle match")}finally{G("")}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Games & Events Management"})}),k==="odds"&&Ci.createPortal(e.jsx("div",{className:"admin-loading-overlay",children:e.jsxs("div",{className:"admin-loading-card",children:[e.jsx("div",{className:"admin-spinner"}),e.jsx("div",{children:"Refreshing odds & scores..."})]})}),document.body),e.jsxs("div",{className:"view-content",children:[h&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),m&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:m}),!h&&!m&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"games-controls",children:[e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Period:"}),e.jsxs("select",{value:a,onChange:_=>n(_.target.value),children:[e.jsx("option",{value:"game",children:"Game"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"scheduled",children:"Scheduled"})]})]}),e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Games to show:"}),e.jsxs("select",{value:i,onChange:_=>p(_.target.value),children:[e.jsx("option",{value:"all",children:"All Games"}),e.jsx("option",{value:"today",children:"Today Only"}),e.jsx("option",{value:"tomorrow",children:"Tomorrow"}),e.jsx("option",{value:"this-week",children:"This Week"})]})]})]}),e.jsx("div",{className:"sports-icons-container",children:r.map(_=>e.jsxs("button",{className:`sport-icon-btn ${g.includes(_.id)?"active":""}`,onClick:()=>M(_.id),title:_.label,children:[e.jsx("span",{className:"icon",children:_.icon}),e.jsx("span",{className:"dropdown-arrow",children:"▼"})]},_.id))}),!v&&e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table events-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[T.map(_=>e.jsx("th",{children:_.header},_.key)),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:y.map(_=>e.jsxs("tr",{children:[e.jsx("td",{children:_.status||"scheduled"}),e.jsxs("td",{children:[_.homeTeam," vs ",_.awayTeam]}),e.jsx("td",{children:_.startTime?new Date(_.startTime).toLocaleString():"—"}),e.jsx("td",{children:_.sport||"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>O(_),disabled:k===`settle-${_.id}`,children:k===`settle-${_.id}`?"Settling...":"Settle"})})]},_.id))})]})}),v&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content no-events-modal",children:[e.jsx("button",{className:"modal-close",onClick:()=>w(!1),children:"×"}),e.jsx("h3",{children:"Today there aren't any event's"}),e.jsx("p",{children:"There are no games for today, would you like to view the Full Board?"}),e.jsxs("div",{className:"modal-buttons",children:[e.jsx("button",{className:"btn-success",onClick:()=>{w(!1),p("all")},children:"Yes"}),e.jsx("button",{className:"btn-danger",onClick:()=>w(!1),children:"No"})]})]})}),e.jsxs("div",{className:"game-status-legend",children:[e.jsx("h4",{children:"Status Legend:"}),e.jsxs("div",{className:"legend-items",children:[e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge live",children:"Live"}),e.jsx("span",{children:"Game is currently in progress"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge scheduled",children:"Scheduled"}),e.jsx("span",{children:"Game is scheduled for future date"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge finished",children:"Finished"}),e.jsx("span",{children:"Game has ended"})]})]})]}),e.jsxs("div",{className:"quick-actions",children:[e.jsx("h4",{children:"Quick Actions:"}),e.jsx("button",{className:"btn-primary",onClick:()=>F(!0),children:"Add Game"}),e.jsx("button",{className:"btn-secondary",onClick:c,disabled:k==="odds",children:k==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Import Games"}),e.jsx("button",{className:"btn-secondary",onClick:c,disabled:k==="odds",children:k==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Update Odds"}),e.jsx("button",{className:"btn-danger",onClick:E,disabled:k==="cache",children:k==="cache"?"Working...":"Clear Cache"})]})]})]}),D&&e.jsx("div",{className:"modal-overlay",onClick:()=>F(!1),children:e.jsxs("div",{className:"modal-content",onClick:_=>_.stopPropagation(),children:[e.jsx("h3",{children:"Add Game"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{type:"text",value:C.homeTeam,onChange:_=>j(H=>({...H,homeTeam:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{type:"text",value:C.awayTeam,onChange:_=>j(H=>({...H,awayTeam:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",value:C.startTime,onChange:_=>j(H=>({...H,startTime:_.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:C.sport,onChange:_=>j(H=>({...H,sport:_.target.value})),children:[e.jsx("option",{value:"basketball",children:"Basketball"}),e.jsx("option",{value:"football",children:"Football"}),e.jsx("option",{value:"baseball",children:"Baseball"}),e.jsx("option",{value:"hockey",children:"Hockey"}),e.jsx("option",{value:"soccer",children:"Soccer"}),e.jsx("option",{value:"tennis",children:"Tennis"}),e.jsx("option",{value:"golf",children:"Golf"}),e.jsx("option",{value:"boxing",children:"Boxing"}),e.jsx("option",{value:"esports",children:"Esports"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:C.status,onChange:_=>j(H=>({...H,status:_.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>F(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:K,disabled:k==="add"||!C.homeTeam.trim()||!C.awayTeam.trim()||!C.startTime,children:k==="add"?"Saving...":"Add Game"})]})]})})]})}function bo(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1),[f,B]=t.useState(null),[h,N]=t.useState(null),[m,u]=t.useState({name:"",url:"",status:"active",notes:""}),[k,G]=t.useState(!1),D=async()=>{const T=localStorage.getItem("token");if(!T){x("Please login to view sportsbook links."),p(!1);return}try{p(!0);const o=await Li(T);n(o.links||[]),x("")}catch(o){console.error("Failed to load sportsbook links:",o),x(o.message||"Failed to load sportsbook links")}finally{p(!1)}};t.useEffect(()=>{D()},[]);const F=()=>{B(null),u({name:"",url:"",status:"active",notes:""}),w(!0)},C=T=>{B(T),u({name:T.name,url:T.url,status:T.status,notes:T.notes||""}),w(!0)},j=T=>{B(T),G(!0)},W=async()=>{const T=localStorage.getItem("token");if(!T){x("Please login to save links.");return}try{N(f?.id||"new"),f?await Ii(f.id,m,T):await Mi(m,T),w(!1),D()}catch(o){x(o.message||"Failed to save link")}finally{N(null)}},r=async T=>{const o=localStorage.getItem("token");if(!o){x("Please login to test links.");return}try{N(T);const U=await Di(T,o);n(ae=>ae.map(z=>z.id===T?{...z,lastSync:U.lastSync}:z))}catch(U){x(U.message||"Failed to test link")}finally{N(null)}},M=async T=>{const o=localStorage.getItem("token");if(!o){x("Please login to delete links.");return}if(window.confirm(`Delete sportsbook link "${T.name}"?`))try{N(T.id),await Ti(T.id,o),n(ae=>ae.filter(z=>z.id!==T.id))}catch(ae){x(ae.message||"Failed to delete link")}finally{N(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Sportsbook Links"}),e.jsx("button",{className:"btn-primary",onClick:F,children:"Add New Link"})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading links..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider Name"}),e.jsx("th",{children:"API URL"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:a.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",style:{textAlign:"center",padding:"20px"},children:"No sportsbook links found."})}):a.map(T=>e.jsxs("tr",{children:[e.jsx("td",{children:T.name}),e.jsx("td",{className:"monospace",children:T.url}),e.jsx("td",{children:e.jsx("span",{className:`badge ${T.status}`,children:T.status})}),e.jsx("td",{children:T.lastSync?new Date(T.lastSync).toLocaleString():"—"}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>C(T),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>r(T.id),disabled:h===T.id,children:h===T.id?"Working...":"Test"}),e.jsx("button",{className:"btn-small",onClick:()=>j(T),children:"View"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>M(T),disabled:h===T.id,children:h===T.id?"Working...":"Delete"})]})]},T.id))})]})})]}),v&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:T=>T.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Link":"Add Link"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Name"}),e.jsx("input",{type:"text",value:m.name,onChange:T=>u(o=>({...o,name:T.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"URL"}),e.jsx("input",{type:"text",value:m.url,onChange:T=>u(o=>({...o,url:T.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:m.status,onChange:T=>u(o=>({...o,status:T.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:m.notes,onChange:T=>u(o=>({...o,notes:T.target.value})),placeholder:"Optional"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:W,disabled:h||!m.name.trim()||!m.url.trim(),children:h?"Saving...":"Save"})]})]})}),k&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>G(!1),children:e.jsxs("div",{className:"modal-content",onClick:T=>T.stopPropagation(),children:[e.jsx("h3",{children:"Link Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Name:"})," ",f.name]}),e.jsxs("p",{children:[e.jsx("strong",{children:"URL:"})," ",f.url]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",f.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Sync:"})," ",f.lastSync?new Date(f.lastSync).toLocaleString():"—"]}),f.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",f.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>G(!1),children:"Close"})})]})})]})}function jo(){const[a,n]=t.useState([]),[i,p]=t.useState("all"),[g,x]=t.useState(!0),v=async()=>{try{const f=localStorage.getItem("token");if(!f)return;const B=await rs({},f);if(B&&Array.isArray(B.bets)){const h=B.bets.map(N=>({id:N.id,user:N.userId?.username||"Unknown",type:N.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",match:N.description||(N.matchSnapshot?`${N.matchSnapshot.homeTeam} vs ${N.matchSnapshot.awayTeam}`:"Unknown Match"),bet:`${N.selection} @ ${parseFloat(N.odds).toFixed(2)}`,amount:`$${Math.round(parseFloat(N.amount))}`,odds:parseFloat(N.odds).toFixed(2),time:new Date(N.createdAt).toLocaleTimeString(),status:N.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",originalStatus:N.status}));n(h)}}catch(f){console.error("Failed to fetch admin bets:",f)}finally{x(!1)}};t.useEffect(()=>{v();const f=setInterval(()=>{document.hidden||v()},45e3);return()=>clearInterval(f)},[]);const w=i==="all"?a:a.filter(f=>f.type.toLowerCase()===i.toLowerCase());return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Live Bet Ticker"}),e.jsxs("div",{className:"ticker-filter",children:[e.jsx("button",{className:i==="all"?"active":"",onClick:()=>p("all"),children:"All Bets"}),e.jsx("button",{className:i==="live"?"active":"",onClick:()=>p("live"),children:"🔴 Live"}),e.jsx("button",{className:i==="upcoming"?"active":"",onClick:()=>p("upcoming"),children:"⏰ Upcoming"})]})]}),e.jsxs("div",{className:"view-content",children:[e.jsx("div",{className:"ticker-container",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"ticker-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Status"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Bet Details"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:g?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"Loading bets..."})}):w.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No bets found"})}):w.map(f=>e.jsxs("tr",{className:`ticker-row ${f.status.toLowerCase()}`,children:[e.jsx("td",{children:e.jsx("span",{className:`status-badge ${f.status.toLowerCase()}`,children:f.status==="LIVE"?"🔴 LIVE":"⏰ UPCOMING"})}),e.jsx("td",{children:e.jsx("strong",{children:f.user})}),e.jsx("td",{className:"match-cell",children:f.match}),e.jsx("td",{className:"bet-cell",children:f.bet}),e.jsx("td",{className:"odds-cell",children:e.jsx("span",{className:"odds-highlight",children:f.odds})}),e.jsx("td",{className:"amount-cell",children:e.jsx("strong",{children:f.amount})}),e.jsx("td",{children:f.time}),e.jsx("td",{children:e.jsx("button",{className:"btn-tiny",children:"Details"})})]},f.id))})]})})}),e.jsxs("div",{className:"ticker-summary",children:[e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Live Bets"}),e.jsx("span",{className:"value",children:a.filter(f=>f.status==="LIVE").length})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Total Wagered"}),e.jsxs("span",{className:"value",children:["$",a.reduce((f,B)=>f+parseFloat(B.amount.replace("$","")),0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})]})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Avg Odds"}),e.jsx("span",{className:"value",children:a.length>0?(a.reduce((f,B)=>f+parseFloat(B.odds),0)/a.length).toFixed(2):"0.00"})]})]})]})]})}function yo(){const[a,n]=t.useState({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),[i,p]=t.useState([]),[g,x]=t.useState([]),[v,w]=t.useState(!0),[f,B]=t.useState(""),[h,N]=t.useState(!1),m=k=>{const{name:G,value:D}=k.target;n(F=>({...F,[G]:D}))},u=async k=>{k.preventDefault();const G=localStorage.getItem("token");if(!G){B("Please login to create tickets.");return}try{N(!0),await Bi({userId:a.userId,matchId:a.matchId,amount:Number(a.amount)||0,odds:Number(a.odds)||0,type:a.betType,selection:a.selection.trim(),status:"pending"},G),n({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),B("")}catch(D){console.error("Ticket creation failed:",D),B(D.message||"Failed to create ticket")}finally{N(!1)}};return t.useEffect(()=>{(async()=>{const G=localStorage.getItem("token");if(!G){B("Please login to load ticket data."),w(!1);return}try{w(!0);const[D,F]=await Promise.all([is(G),qt(G)]);p(Array.isArray(D)?D:[]),x(Array.isArray(F)?F:[]),B("")}catch(D){console.error("Failed to load ticket data:",D),B(D.message||"Failed to load ticket data")}finally{w(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Ticket Writer"}),e.jsx("p",{className:"subtitle",children:"Create custom betting tickets"})]}),e.jsxs("div",{className:"view-content",children:[v&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading ticket data..."}),f&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:f}),!v&&!f&&e.jsx("div",{className:"form-container",children:e.jsxs("form",{onSubmit:u,className:"admin-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Ticket Details"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Customer:"}),e.jsxs("select",{name:"userId",value:a.userId,onChange:m,required:!0,children:[e.jsx("option",{value:"",children:"Select customer"}),g.map(k=>e.jsx("option",{value:k.id,children:k.username},k.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Type:"}),e.jsxs("select",{name:"betType",value:a.betType,onChange:m,children:[e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Match:"}),e.jsxs("select",{name:"matchId",value:a.matchId,onChange:m,required:!0,children:[e.jsx("option",{value:"",children:"Select match"}),i.map(k=>e.jsxs("option",{value:k.id,children:[k.homeTeam," vs ",k.awayTeam]},k.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Selection:"}),e.jsx("input",{type:"text",name:"selection",value:a.selection,onChange:m,placeholder:"e.g., Lakers to win",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Odds:"}),e.jsx("input",{type:"number",name:"odds",value:a.odds,onChange:m,placeholder:"e.g., 1.95",step:"0.01",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Amount:"}),e.jsx("input",{type:"number",name:"amount",value:a.amount,onChange:m,placeholder:"e.g., 100",step:"0.01",required:!0})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:h,children:h?"Saving...":"Create Ticket"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>n({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),children:"Clear"})]})]})})]})]})}function vo(){const[a,n]=t.useState("all"),[i,p]=t.useState([]),[g,x]=t.useState(!0),[v,w]=t.useState(""),[f,B]=t.useState(null),[h,N]=t.useState(!1),[m,u]=t.useState({scoreHome:"",scoreAway:"",status:"scheduled"}),[k,G]=t.useState(!1),D=async()=>{const r=localStorage.getItem("token");if(!r){w("Please login to view scores."),x(!1);return}try{x(!0);const M=await is(r);p(M||[]),w("")}catch(M){console.error("Failed to load matches:",M),w(M.message||"Failed to load matches")}finally{x(!1)}};t.useEffect(()=>{D()},[]);const F=a==="all"?i:i.filter(r=>String(r.sport||"").toLowerCase()===a.toLowerCase()),C=r=>{const M=r.score?.score_home??r.score?.scoreHome??"",T=r.score?.score_away??r.score?.scoreAway??"";B(r),u({scoreHome:M===0?0:M,scoreAway:T===0?0:T,status:r.status||"scheduled"}),N(!0)},j=async()=>{const r=localStorage.getItem("token");if(!r){w("Please login to update scores.");return}try{G(!0),await Gn(f.id,{status:m.status,score:{scoreHome:Number(m.scoreHome)||0,scoreAway:Number(m.scoreAway)||0},lastUpdated:new Date},r),N(!1),D()}catch(M){w(M.message||"Failed to update score")}finally{G(!1)}},W=r=>r.status||"scheduled";return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Featured Matches & Scores"}),e.jsxs("div",{className:"sport-filter",children:[e.jsx("button",{className:a==="all"?"active":"",onClick:()=>n("all"),children:"All Sports"}),e.jsx("button",{className:a==="soccer"?"active":"",onClick:()=>n("soccer"),children:"⚽ Soccer"}),e.jsx("button",{className:a==="basketball"?"active":"",onClick:()=>n("basketball"),children:"🏀 NBA"}),e.jsx("button",{className:a==="tennis"?"active":"",onClick:()=>n("tennis"),children:"🎾 Tennis"}),e.jsx("button",{className:a==="football"?"active":"",onClick:()=>n("football"),children:"🏈 Football"})]})]}),e.jsxs("div",{className:"view-content",children:[g&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading scores..."}),v&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:v}),!g&&!v&&e.jsx("div",{className:"filtered-matches-section",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table live-matches-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Score"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:F.map(r=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{children:[r.homeTeam," vs ",r.awayTeam]})}),e.jsx("td",{children:r.startTime?new Date(r.startTime).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${W(r)}`,children:W(r)})}),e.jsxs("td",{children:[r.score?.score_home??r.score?.scoreHome??0," - ",r.score?.score_away??r.score?.scoreAway??0]}),e.jsx("td",{children:r.odds?JSON.stringify(r.odds):"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>C(r),children:"Update"})})]},r.id))})]})})})]}),h&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>N(!1),children:e.jsxs("div",{className:"modal-content",onClick:r=>r.stopPropagation(),children:[e.jsx("h3",{children:"Update Score"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Score"}),e.jsx("input",{type:"number",value:m.scoreHome,onChange:r=>u(M=>({...M,scoreHome:r.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Score"}),e.jsx("input",{type:"number",value:m.scoreAway,onChange:r=>u(M=>({...M,scoreAway:r.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:m.status,onChange:r=>u(M=>({...M,status:r.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"cancelled",children:"Cancelled"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>N(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:j,disabled:k,children:k?"Saving...":"Save"})]})]})})]})}const Bn={updateInfo:!0,suspendWagering:!0,enterDepositsWithdrawals:!0,deleteTransactions:!0,enterBettingAdjustments:!0,moveAccounts:!0,addAccounts:!0,changeCreditLimit:!0,setMinBet:!0,changeWagerLimit:!0,adjustParlayTeaser:!0,setGlobalTeamLimit:!0,maxWagerSetup:!0,allowDeny:!0,juiceSetup:!0,changeTempCredit:!0,changeSettleFigure:!0,views:Object.values(ar).reduce((a,n)=>(a[n]=!0,a),{}),ipTracker:{manage:!0}},Fn={dashboard:"Dashboard",weeklyFigures:"Weekly Figures",pending:"Pending",messaging:"Messaging",gameAdmin:"Game Admin",customerAdmin:"Customer Admin",agentManager:"Agent Management",cashier:"Cashier",addCustomer:"Add Customer",thirdPartyLimits:"3rd Party Limits",props:"Props / Betting",agentPerformance:"Agent Performance",analysis:"Analysis",ipTracker:"IP Tracker",transactionsHistory:"Transaction History",deletedWagers:"Deleted Wagers",gamesEvents:"Games & Events",sportsbookLinks:"Sportsbook Links",betTicker:"Bet Ticker",ticketwriter:"TicketWriter",scores:"Scores",masterAgentAdmin:"Master Agent Admin",billing:"Billing",settings:"Settings",monitor:"System Monitor",rules:"Rules",feedback:"Feedback",faq:"FAQ",userManual:"User Manual",profile:"Profile"},lr=(a,n)=>{if(!n||typeof n!="object")return a;const i={...a};return Object.keys(n).forEach(p=>{const g=n[p];g&&typeof g=="object"&&!Array.isArray(g)?i[p]=lr(a[p]||{},g):i[p]=g}),i};function or({agent:a,onClose:n,onUpdate:i}){const[p,g]=t.useState(Bn),[x,v]=t.useState(!1);t.useEffect(()=>{a&&g(lr(Bn,a.permissions||{}))},[a]);const w=m=>{g(u=>({...u,[m]:!u[m]}))},f=(m,u)=>{g(k=>({...k,[m]:{...k[m]||{},[u]:!k?.[m]?.[u]}}))},B=async()=>{v(!0);try{const m=localStorage.getItem("token");await Fi(a.id,p,m),alert("Permissions updated successfully"),i&&i(),n()}catch(m){console.error("Error updating permissions:",m),alert("Failed to update permissions: "+m.message)}finally{v(!1)}},h=(m,u)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:p[m],onChange:()=>w(m)}),e.jsx("span",{className:"checkmark"}),u]})},m),N=(m,u,k)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:!!p?.[m]?.[u],onChange:()=>f(m,u)}),e.jsx("span",{className:"checkmark"}),k]})},`${m}.${u}`);return e.jsxs("div",{className:"modal-overlay",children:[e.jsxs("div",{className:"modal-content permission-modal",children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h3",{children:["Permissions: ",a.username]}),e.jsx("button",{className:"close-btn",onClick:n,children:"×"})]}),e.jsxs("div",{className:"scrollable-content",children:[e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"General Account Setup"}),h("updateInfo","Update Info"),h("suspendWagering","Suspend Wagering"),h("enterDepositsWithdrawals","Enter Deposits / Withdrawals"),h("deleteTransactions","Delete Transactions"),h("enterBettingAdjustments","Enter Betting Adjustments"),h("moveAccounts","Move Accounts"),h("addAccounts","Add Accounts")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Limit And Sport Setup"}),h("changeCreditLimit","Change Credit Limit"),h("setMinBet","Set Minimum Bet Amount"),h("changeWagerLimit","Change Wager Limit"),h("adjustParlayTeaser","Adjust Parlay/Teaser Setup"),h("setGlobalTeamLimit","Set Global Team Limit"),h("maxWagerSetup","Max Wager Setup"),h("allowDeny","Allow / Deny"),h("juiceSetup","Juice Setup"),h("changeTempCredit","Change Temp Credit"),h("changeSettleFigure","Change Settle Figure")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Dashboard Access"}),Object.keys(Fn).map(m=>N("views",m,Fn[m]))]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"IP Tracker Actions"}),N("ipTracker","manage","Allow Block / Unblock / Whitelist")]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn-secondary",onClick:n,disabled:x,children:"Cancel"}),e.jsx("button",{className:"btn-primary",onClick:B,disabled:x,children:x?"Saving...":"Save"})]})]}),e.jsx("style",{children:`
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
      `})]})}function En(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(!1),[v,w]=t.useState(!1),[f,B]=t.useState(!1),[h,N]=t.useState(!1),[m,u]=t.useState(null),[k,G]=t.useState({username:"",phoneNumber:"",password:"",agentPrefix:""}),[D,F]=t.useState({id:"",phoneNumber:"",password:"",agentBillingRate:"",agentBillingStatus:"paid"}),[C,j]=t.useState(null),[W,r]=t.useState("all"),[M,T]=t.useState(!1),o=String(localStorage.getItem("userRole")||"").toLowerCase(),U=a.filter(Y=>W==="all"?!0:W==="admin"?Y.createdByModel==="Admin":W==="master_agent"?Y.createdByModel==="Agent":!0),ae=Y=>{if(Y==null||Y==="")return"—";const $=Number(Y);return Number.isNaN($)?"—":`$${Math.round($)}`};Hs.useEffect(()=>{z()},[]);const z=async()=>{try{const Y=localStorage.getItem("token");if(!Y)return;const $=await Yt(Y);n($||[]),j(null)}catch(Y){console.error("Failed to fetch agents:",Y),j(Y.message||"Failed to fetch agents")}finally{p(!1)}},y=async Y=>{const $=Y.toUpperCase();if(G(ee=>({...ee,agentPrefix:$})),$.length>=2){const ee=localStorage.getItem("token");try{const{nextUsername:fe}=await Ot($,ee,{suffix:"MA",type:"agent"});G(Z=>({...Z,username:fe}))}catch(fe){console.error("Failed to get next username from prefix:",fe)}}else G(ee=>({...ee,username:""}))},K=async Y=>{Y.preventDefault();try{const $=localStorage.getItem("token");if(!$)throw new Error("No token found");const ee=await Bs(k,$);alert(ee?.assigned?"Master Agent assigned successfully":"Master Agent created successfully"),x(!1),G({username:"",phoneNumber:"",password:"",agentPrefix:""}),z()}catch($){console.error("Agent creation error:",$),alert("Failed to create agent: "+$.message)}},c=async Y=>{const $=Y.status==="suspended",ee=$?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${ee} ${Y.username}?`))try{const fe=localStorage.getItem("token");$?await Kn(Y.id,fe):await Jn(Y.id,fe),z()}catch(fe){alert(`Failed to ${ee} agent: `+fe.message)}},E=Y=>{F({id:Y.id,phoneNumber:Y.phoneNumber||"",password:"",agentBillingRate:Y.agentBillingRate??"",agentBillingStatus:Y.agentBillingStatus||"paid",unlimitedBalance:Y.unlimitedBalance||!1}),u(Y),w(!0)},O=async Y=>{Y.preventDefault();try{const $=localStorage.getItem("token");if(!$)throw new Error("No token found");const ee={phoneNumber:D.phoneNumber,agentBillingRate:D.agentBillingRate,agentBillingStatus:D.agentBillingStatus,unlimitedBalance:D.unlimitedBalance};D.password&&(ee.password=D.password),await xa(D.id,ee,$),alert("Agent updated successfully"),w(!1),z()}catch($){console.error("Update Error:",$),alert("Failed to update agent: "+$.message)}},_=Y=>{u(Y),B(!0)},H=async Y=>{const $=Y.id,ee=Y.balance??0,fe=window.prompt("Enter new agent balance:",`${ee}`);if(fe===null)return;const Z=Number(fe);if(Number.isNaN(Z)){alert("Balance must be a valid number.");return}try{const te=localStorage.getItem("token");if(!te)throw new Error("No token found");await xa($,{balance:Z},te),z()}catch(te){alert("Failed to update agent balance: "+(te.message||"Unknown error"))}},de=async Y=>{const $=Y.id,ee=window.prompt(`Enter new password for agent ${Y.username}:`,"");if(ee!==null){if(ee.length<6){alert("Password must be at least 6 characters long");return}try{const fe=localStorage.getItem("token");if(!fe)throw new Error("No token found");await Zn($,ee,fe),alert(`Password for agent ${Y.username} has been reset successfully.`)}catch(fe){console.error("Agent password reset failed:",fe),alert(fe.message||"Failed to reset agent password")}}},De=async()=>{if(window.confirm(`Delete all seeded workflow demo users and agents now?

This removes demo hierarchy records created for workflow testing.`))try{T(!0);const $=localStorage.getItem("token");if(!$)throw new Error("No token found");const fe=(await Ei($))?.summary||{};alert(`Seeded demo data deleted.
Users: ${fe.usersDeleted||0}
Agents: ${fe.agentsDeleted||0}
Master links: ${fe.masterAgentLinksDeleted||0}`),await z()}catch($){alert("Failed to delete demo workflow data: "+($.message||"Unknown error"))}finally{T(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Master Agent Administration"}),e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},children:[e.jsxs("select",{value:W,onChange:Y=>r(Y.target.value),style:{padding:"0.5rem",borderRadius:"4px",border:"1px solid #444",backgroundColor:"#333",color:"white"},children:[e.jsx("option",{value:"all",children:"Show All Creators"}),e.jsx("option",{value:"admin",children:"Created by Admin"}),e.jsx("option",{value:"master_agent",children:"Created by Master Agent"})]}),o==="admin"&&e.jsx("button",{className:"btn-secondary",onClick:De,disabled:M,title:"Delete workflow demo accounts",children:M?"Deleting Demo Data...":"Delete Demo Data"}),e.jsx("button",{className:"btn-primary",onClick:()=>x(!0),children:"Add Master Agent"})]})]}),g&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Master Agent"}),e.jsxs("form",{onSubmit:K,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:k.agentPrefix,onChange:Y=>y(Y.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:k.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:k.phoneNumber,onChange:Y=>G({...k,phoneNumber:Y.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:k.password,onChange:Y=>G({...k,password:Y.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>x(!1),children:"Cancel"})]})]})]})}),v&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Agent: ",m?.username]}),e.jsxs("form",{onSubmit:O,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:D.phoneNumber,onChange:Y=>F({...D,phoneNumber:Y.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:D.password,onChange:Y=>F({...D,password:Y.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Rate per Customer (Weekly)"}),e.jsx("input",{type:"number",min:"0",value:D.agentBillingRate,onChange:Y=>F({...D,agentBillingRate:Y.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Billing Status"}),e.jsxs("select",{value:D.agentBillingStatus,onChange:Y=>F({...D,agentBillingStatus:Y.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",border:"1px solid #444",color:"#fff",borderRadius:"4px"},children:[e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"unpaid",children:"Unpaid"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:D.unlimitedBalance,onChange:Y=>F({...D,unlimitedBalance:Y.target.checked}),style:{width:"auto"}}),"Unlimited Balance"]}),e.jsx("small",{style:{color:"#aaa",fontSize:"11px"},children:"When enabled, this agent can credit players without balance restrictions"})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"})]})]})]})}),f&&m&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"Agent Details"}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Username:"})," ",e.jsx("span",{children:m.username})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Phone Number:"})," ",e.jsx("span",{children:m.phoneNumber})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Status:"})," ",e.jsx("span",{className:`badge ${m.status}`,children:m.status})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created By:"})," ",e.jsx("span",{children:m.createdBy?.username||"System"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created At:"})," ",e.jsx("span",{children:new Date(m.createdAt).toLocaleString()})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Customers:"})," ",e.jsx("span",{children:m.userCount})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Active Customers:"})," ",e.jsx("span",{children:m.activeCustomerCount||0})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Balance:"})," ",e.jsx("span",{children:ae(m.balance)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Outstanding Balance:"})," ",e.jsx("span",{children:ae(m.balanceOwed)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Rate per Customer:"})," ",e.jsxs("span",{children:["$",Math.round(Number(m.agentBillingRate||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Weekly Charge:"})," ",e.jsxs("span",{children:["$",Math.round(Number(m.weeklyCharge||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Billing Status:"})," ",e.jsx("span",{children:m.agentBillingStatus||"paid"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"View Only:"})," ",e.jsx("span",{children:m.viewOnly?"Yes":"No"})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>B(!1),children:"Close"})})]})}),h&&m&&e.jsx(or,{agent:m,onClose:()=>N(!1),onUpdate:z}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent Name"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Created By"}),e.jsx("th",{children:"Sub-Agents"}),e.jsx("th",{children:"Total Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Outstanding"}),e.jsx("th",{children:"Rate/Customer"}),e.jsx("th",{children:"Weekly Charge"}),e.jsx("th",{children:"Billing"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:i?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"Loading agents..."})}):C?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:C})}):U.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"No agents found matching filter."})}):U.map(Y=>e.jsxs("tr",{children:[e.jsx("td",{children:Y.username}),e.jsx("td",{children:e.jsx("span",{className:`badge ${Y.role==="master_agent"?"btn-primary":"btn-secondary"}`,style:{fontSize:"0.75rem",textTransform:"capitalize"},children:Y.role?.replace("_"," ")||"agent"})}),e.jsx("td",{children:Y.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:`badge ${Y.status||""}`,children:Y.status||"unknown"})}),e.jsx("td",{style:{fontWeight:"bold",color:Y.createdBy?"#e67e22":"#999"},children:Y.createdBy?e.jsxs(e.Fragment,{children:[e.jsxs("span",{style:{fontSize:"0.8em",color:"#888",marginRight:"4px"},children:["[",Y.createdByModel==="Admin"?"Admin":"MA","]"]}),Y.createdBy.username]}):"System"}),e.jsx("td",{children:Y.role==="master_agent"?Y.subAgentCount||0:"—"}),e.jsx("td",{children:Y.role==="master_agent"?Y.totalUsersInHierarchy||0:Y.userCount||0}),e.jsx("td",{children:ae(Y.balance)}),e.jsx("td",{children:ae(Y.balanceOwed)}),e.jsxs("td",{children:["$",Math.round(Number(Y.agentBillingRate||0))]}),e.jsxs("td",{children:["$",Math.round(Number(Y.weeklyCharge||0))]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${Y.agentBillingStatus==="unpaid"?"warning":"active"}`,children:Y.agentBillingStatus||"paid"})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>E(Y),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>_(Y),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>{u(Y),N(!0)},children:"Permissions"}),e.jsx("button",{className:"btn-small",onClick:()=>H(Y),children:"Adjust Balance"}),e.jsx("button",{className:`btn-small ${Y.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>c(Y),children:Y.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>de(Y),children:"Reset Pass"})]})]},Y.id))})]})})}),e.jsx("style",{children:`
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
      `})]})}function No(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(!1),[v,w]=t.useState(!1),[f,B]=t.useState(!1),[h,N]=t.useState(null),[m,u]=t.useState({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),[k,G]=t.useState({id:"",phoneNumber:"",password:""}),[D,F]=t.useState(null),[C,j]=t.useState("");t.useEffect(()=>{r(),W()},[]);const W=async()=>{try{const y=localStorage.getItem("token");if(y){const K=await zt(y);j(K?.username||"")}}catch(y){console.error("Failed to fetch profile:",y)}},r=async()=>{try{const y=localStorage.getItem("token");if(!y)return;const K=await $i(y);n(K||[]),F(null)}catch(y){console.error("Failed to fetch agents:",y),F(y.message||"Failed to fetch agents")}finally{p(!1)}},M=async y=>{const K=y.toUpperCase();if(u(c=>({...c,agentPrefix:K})),K.length>=2){const c=localStorage.getItem("token");try{const{nextUsername:E}=await Ot(K,c,{type:"agent"});u(O=>({...O,username:E}))}catch(E){console.error("Failed to get next username from prefix:",E)}}else u(c=>({...c,username:""}))},T=async y=>{y.preventDefault();try{const K=localStorage.getItem("token");if(!K)throw new Error("No token found");const c=await Fs(m,K);alert(c?.assigned?"Agent assigned successfully":"Agent created successfully"),x(!1),u({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),r()}catch(K){alert("Failed to create agent: "+K.message)}},o=y=>{G({id:y.id,phoneNumber:y.phoneNumber||"",password:""}),N(y),w(!0)},U=async y=>{y.preventDefault();try{const K=localStorage.getItem("token"),c={phoneNumber:k.phoneNumber};k.password&&(c.password=k.password),await xa(k.id,c,K),alert("Agent updated successfully"),w(!1),r()}catch(K){alert("Failed to update agent: "+K.message)}},ae=async y=>{const K=y.status==="suspended",c=K?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${c} ${y.username}?`))try{const E=localStorage.getItem("token");K?await Kn(y.id,E):await Jn(y.id,E),r()}catch(E){alert(`Failed to ${c} agent: `+E.message)}},z=async y=>{const K=window.prompt(`Enter new password for agent ${y.username}:`);if(K)try{const c=localStorage.getItem("token");await Zn(y.id,K,c),alert("Password reset successful")}catch(c){alert("Reset failed: "+c.message)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Management"}),localStorage.getItem("userRole")!=="admin"&&e.jsx("button",{className:"btn-primary",onClick:()=>{x(!0),C&&M(C)},children:"Add Agent"})]}),g&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Agent"}),e.jsxs("form",{onSubmit:T,children:[!C&&e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:m.agentPrefix,onChange:y=>M(y.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role"}),e.jsxs("select",{value:m.role,onChange:y=>u({...m,role:y.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",color:"white",marginBottom:"1rem",border:"1px solid #444"},children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"master_agent",children:"Master Agent"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:m.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:m.phoneNumber,onChange:y=>u({...m,phoneNumber:y.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:m.password,onChange:y=>u({...m,password:y.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>x(!1),children:"Cancel"})]})]})]})}),v&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Sub-Agent: ",h?.username]}),e.jsxs("form",{onSubmit:U,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:k.phoneNumber,onChange:y=>G({...k,phoneNumber:y.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:k.password,onChange:y=>G({...k,password:y.target.value})})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"})]})]})]})}),f&&h&&e.jsx(or,{agent:h,onClose:()=>B(!1),onUpdate:r}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Username"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:i?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"Loading agents..."})}):D?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",className:"error",children:D})}):a.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No agents found."})}):a.map(y=>e.jsxs("tr",{children:[e.jsx("td",{children:y.username}),e.jsx("td",{children:y.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:"badge",children:y.role==="master_agent"?"Master Agent":"Agent"})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${y.status}`,children:y.status})}),e.jsx("td",{children:y.userCount||0}),e.jsxs("td",{children:["$",Math.round(Number(y.balance||0))]}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>o(y),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>{N(y),B(!0)},children:"Perms"}),e.jsx("button",{className:`btn-small ${y.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>ae(y),children:y.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>z(y),children:"Reset Pass"})]})]},y.id))})]})})}),e.jsx("style",{children:`
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
      `})]})}function wo(){const[a,n]=t.useState([]),[i,p]=t.useState({paid:0,outstanding:0,total:0}),[g,x]=t.useState(!0),[v,w]=t.useState(""),[f,B]=t.useState(!1),[h,N]=t.useState(!1),[m,u]=t.useState(null),[k,G]=t.useState(null),[D,F]=t.useState("all"),[C,j]=t.useState({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),W=async()=>{const z=localStorage.getItem("token");if(!z){w("Please login to view billing."),x(!1);return}try{x(!0);const[y,K]=await Promise.all([Ri(z),Ui({status:D,limit:200},z)]);p(y||{paid:0,outstanding:0,total:0}),n(K.invoices||[]),w("")}catch(y){console.error("Failed to load billing:",y),w(y.message||"Failed to load billing")}finally{x(!1)}};t.useEffect(()=>{W()},[D]);const r=z=>{if(z==null)return"—";const y=Number(z);return Number.isNaN(y)?"—":`$${Math.round(y)}`},M=()=>{j({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),B(!0)},T=z=>{u(z),N(!0)},o=async()=>{const z=localStorage.getItem("token");if(!z){w("Please login to save invoices.");return}try{G("new"),await Wi({invoiceNumber:C.invoiceNumber.trim(),amount:Number(C.amount)||0,status:C.status,dueDate:C.dueDate||null,notes:C.notes.trim()||null},z),B(!1),W()}catch(y){w(y.message||"Failed to create invoice")}finally{G(null)}},U=async z=>{const y=localStorage.getItem("token");if(!y){w("Please login to update invoices.");return}try{G(z.id),await _i(z.id,{status:"paid"},y),W()}catch(K){w(K.message||"Failed to update invoice")}finally{G(null)}},ae=z=>{const y=JSON.stringify(z,null,2),K=new Blob([y],{type:"application/json"}),c=URL.createObjectURL(K),E=document.createElement("a");E.href=c,E.download=`${z.invoice||"invoice"}.json`,E.click(),URL.revokeObjectURL(c)};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Billing Management"}),e.jsx("button",{className:"btn-primary",onClick:M,children:"Create Invoice"})]}),e.jsxs("div",{className:"view-content",children:[g&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading billing..."}),v&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:v}),!g&&!v&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"billing-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Paid"}),e.jsx("p",{className:"amount",children:r(i.paid)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Outstanding"}),e.jsx("p",{className:"amount",children:r(i.outstanding)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total All Time"}),e.jsx("p",{className:"amount",children:r(i.total)})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:D,onChange:z=>F(z.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Invoices"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Invoice #"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:a.map(z=>e.jsxs("tr",{children:[e.jsx("td",{children:z.invoice}),e.jsx("td",{children:z.date?new Date(z.date).toLocaleDateString():"—"}),e.jsx("td",{children:r(z.amount)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.status}`,children:z.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>ae(z),children:"Download"}),e.jsx("button",{className:"btn-small",onClick:()=>T(z),children:"View"}),z.status!=="paid"&&e.jsx("button",{className:"btn-small",onClick:()=>U(z),disabled:k===z.id,children:k===z.id?"Working...":"Mark Paid"})]})]},z.id))})]})]})]})]}),f&&e.jsx("div",{className:"modal-overlay",onClick:()=>B(!1),children:e.jsxs("div",{className:"modal-content",onClick:z=>z.stopPropagation(),children:[e.jsx("h3",{children:"Create Invoice"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Invoice #"}),e.jsx("input",{type:"text",value:C.invoiceNumber,onChange:z=>j(y=>({...y,invoiceNumber:z.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",value:C.amount,onChange:z=>j(y=>({...y,amount:z.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:C.status,onChange:z=>j(y=>({...y,status:z.target.value})),children:[e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Due Date"}),e.jsx("input",{type:"date",value:C.dueDate,onChange:z=>j(y=>({...y,dueDate:z.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:C.notes,onChange:z=>j(y=>({...y,notes:z.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>B(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:o,disabled:k||!C.invoiceNumber.trim()||!C.amount,children:k?"Saving...":"Save"})]})]})}),h&&m&&e.jsx("div",{className:"modal-overlay",onClick:()=>N(!1),children:e.jsxs("div",{className:"modal-content",onClick:z=>z.stopPropagation(),children:[e.jsx("h3",{children:"Invoice Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Invoice:"})," ",m.invoice]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",r(m.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",m.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Date:"})," ",m.date?new Date(m.date).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Due Date:"})," ",m.dueDate?new Date(m.dueDate).toLocaleDateString():"—"]}),m.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",m.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>N(!1),children:"Close"})})]})})]})}function So(){const[a,n]=t.useState({platformName:"Sports Betting Platform",dailyBetLimit:"10000",weeklyBetLimit:"50000",maxOdds:"100",minBet:"1",maxBet:"5000",maintenanceMode:!1,smsNotifications:!0,twoFactor:!0}),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1);t.useEffect(()=>{(async()=>{const N=localStorage.getItem("token");if(!N){x("Please login to load settings."),p(!1);return}try{p(!0);const m=await Oi(N);n({platformName:m.platformName,dailyBetLimit:m.dailyBetLimit,weeklyBetLimit:m.weeklyBetLimit,maxOdds:m.maxOdds,minBet:m.minBet,maxBet:m.maxBet,maintenanceMode:m.maintenanceMode,smsNotifications:m.smsNotifications,twoFactor:m.twoFactor}),x("")}catch(m){console.error("Failed to load settings:",m),x(m.message||"Failed to load settings")}finally{p(!1)}})()},[]);const f=h=>{const{name:N,value:m,type:u,checked:k}=h.target;n(G=>({...G,[N]:u==="checkbox"?k:m}))},B=async()=>{const h=localStorage.getItem("token");if(!h){x("Please login to save settings.");return}try{w(!0),await zi(a,h),x("")}catch(N){x(N.message||"Failed to save settings")}finally{w(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Platform Settings"})}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading settings..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"settings-container",children:e.jsxs("form",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"General Settings"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Platform Name:"}),e.jsx("input",{type:"text",name:"platformName",value:a.platformName,onChange:f})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Bet Limits"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Daily Bet Limit ($):"}),e.jsx("input",{type:"number",name:"dailyBetLimit",value:a.dailyBetLimit,onChange:f})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Weekly Bet Limit ($):"}),e.jsx("input",{type:"number",name:"weeklyBetLimit",value:a.weeklyBetLimit,onChange:f})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max Odds:"}),e.jsx("input",{type:"number",name:"maxOdds",value:a.maxOdds,onChange:f,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Minimum Bet ($):"}),e.jsx("input",{type:"number",name:"minBet",value:a.minBet,onChange:f,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Maximum Bet ($):"}),e.jsx("input",{type:"number",name:"maxBet",value:a.maxBet,onChange:f})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Security Settings"}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"twoFactor",checked:a.twoFactor,onChange:f,id:"twoFactor"}),e.jsx("label",{htmlFor:"twoFactor",children:"Require Two-Factor Authentication"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"maintenanceMode",checked:a.maintenanceMode,onChange:f,id:"maintenanceMode"}),e.jsx("label",{htmlFor:"maintenanceMode",children:"Maintenance Mode"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"smsNotifications",checked:a.smsNotifications,onChange:f,id:"smsNotifications"}),e.jsx("label",{htmlFor:"smsNotifications",children:"Enable SMS Notifications"})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"button",onClick:B,className:"btn-primary",disabled:v,children:v?"Saving...":"Save Settings"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>window.location.reload(),children:"Reset"})]})]})})]})]})}function ko(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1),[f,B]=t.useState(null),[h,N]=t.useState({title:"",items:"",status:"active"}),[m,u]=t.useState(null),k=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to view rules."),p(!1);return}try{p(!0);const W=await Vi(j);n(W.rules||[]),x("")}catch(W){console.error("Failed to load rules:",W),x(W.message||"Failed to load rules")}finally{p(!1)}};t.useEffect(()=>{k()},[]);const G=()=>{B(null),N({title:"",items:"",status:"active"}),w(!0)},D=j=>{B(j),N({title:j.title,items:(j.items||[]).join(`
`),status:j.status||"active"}),w(!0)},F=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to save rules.");return}try{u(f?.id||"new");const W={title:h.title.trim(),items:h.items.split(`
`).map(r=>r.trim()).filter(Boolean),status:h.status};f?await Gi(f.id,W,j):await qi(W,j),w(!1),k()}catch(W){x(W.message||"Failed to save rule")}finally{u(null)}},C=async j=>{const W=localStorage.getItem("token");if(!W){x("Please login to delete rules.");return}try{u(j),await Hi(j,W),n(r=>r.filter(M=>M.id!==j))}catch(r){x(r.message||"Failed to delete rule")}finally{u(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Rules & Regulations"}),e.jsx("button",{className:"btn-primary",onClick:G,children:"Add New Rule"})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading rules..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"rules-container",children:a.map(j=>e.jsxs("div",{className:"rule-card",children:[e.jsx("h3",{children:j.title}),e.jsx("ul",{children:(j.items||[]).map((W,r)=>e.jsx("li",{children:W},r))}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>D(j),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>C(j.id),disabled:m===j.id,children:m===j.id?"Working...":"Delete"})]})]},j.id))})]}),v&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:j=>j.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Rule":"Add Rule"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:h.title,onChange:j=>N(W=>({...W,title:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Items (one per line)"}),e.jsx("textarea",{rows:"6",value:h.items,onChange:j=>N(W=>({...W,items:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:h.status,onChange:j=>N(W=>({...W,status:j.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:F,disabled:m||!h.title.trim(),children:m?"Saving...":"Save"})]})]})})]})}function Co(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState("all"),[f,B]=t.useState(null),[h,N]=t.useState(""),[m,u]=t.useState(!1),[k,G]=t.useState(null),D=async()=>{const r=localStorage.getItem("token");if(!r){x("Please login to view feedback."),p(!1);return}try{p(!0);const M=await Yi({status:v},r);n(M.feedbacks||[]),x("")}catch(M){console.error("Failed to load feedback:",M),x(M.message||"Failed to load feedback")}finally{p(!1)}};t.useEffect(()=>{D()},[v]);const F=r=>{B(r),N(r.adminReply||""),u(!0)},C=async()=>{const r=localStorage.getItem("token");if(!r){x("Please login to reply.");return}try{G(f.id),await Ji(f.id,{reply:h},r),u(!1),D()}catch(M){x(M.message||"Failed to reply")}finally{G(null)}},j=async r=>{const M=localStorage.getItem("token");if(!M){x("Please login to mark reviewed.");return}try{G(r),await Qi(r,M),D()}catch(T){x(T.message||"Failed to mark reviewed")}finally{G(null)}},W=async r=>{const M=localStorage.getItem("token");if(!M){x("Please login to delete feedback.");return}try{G(r),await Ki(r,M),n(T=>T.filter(o=>o.id!==r))}catch(T){x(T.message||"Failed to delete feedback")}finally{G(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Customer Feedback"})}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading feedback..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:v,onChange:r=>w(r.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"new",children:"New"}),e.jsx("option",{value:"reviewed",children:"Reviewed"})]})]})}),e.jsx("div",{className:"feedback-container",children:a.map(r=>e.jsxs("div",{className:"feedback-card",children:[e.jsxs("div",{className:"feedback-header",children:[e.jsx("h4",{children:r.user}),e.jsx("div",{className:"rating",children:"⭐".repeat(r.rating||0)}),e.jsx("span",{className:"date",children:r.date?new Date(r.date).toLocaleDateString():"—"})]}),e.jsx("p",{className:"feedback-message",children:r.message}),r.adminReply&&e.jsxs("p",{className:"feedback-message",children:[e.jsx("strong",{children:"Reply:"})," ",r.adminReply]}),e.jsxs("div",{className:"feedback-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>F(r),children:"Reply"}),e.jsx("button",{className:"btn-small",onClick:()=>j(r.id),disabled:k===r.id,children:k===r.id?"Working...":"Mark as Reviewed"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>W(r.id),disabled:k===r.id,children:k===r.id?"Working...":"Delete"})]})]},r.id))})]})]}),m&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>u(!1),children:e.jsxs("div",{className:"modal-content",onClick:r=>r.stopPropagation(),children:[e.jsx("h3",{children:"Reply to Feedback"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",f.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Message:"})," ",f.message]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Reply"}),e.jsx("textarea",{rows:"4",value:h,onChange:r=>N(r.target.value)})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>u(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:C,disabled:k===f.id||!h.trim(),children:k===f.id?"Saving...":"Save Reply"})]})]})})]})}function Ao(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1),[f,B]=t.useState(null),[h,N]=t.useState({question:"",answer:"",status:"active",order:0}),[m,u]=t.useState(null),k=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to view FAQs."),p(!1);return}try{p(!0);const W=await Zi(j);n(W.faqs||[]),x("")}catch(W){console.error("Failed to load FAQs:",W),x(W.message||"Failed to load FAQs")}finally{p(!1)}};t.useEffect(()=>{k()},[]);const G=()=>{B(null),N({question:"",answer:"",status:"active",order:0}),w(!0)},D=j=>{B(j),N({question:j.question,answer:j.answer,status:j.status||"active",order:j.order||0}),w(!0)},F=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to save FAQs.");return}try{u(f?.id||"new");const W={question:h.question.trim(),answer:h.answer.trim(),status:h.status,order:Number(h.order)||0};f?await el(f.id,W,j):await tl(W,j),w(!1),k()}catch(W){x(W.message||"Failed to save FAQ")}finally{u(null)}},C=async j=>{const W=localStorage.getItem("token");if(!W){x("Please login to delete FAQs.");return}try{u(j),await Xi(j,W),n(r=>r.filter(M=>M.id!==j))}catch(r){x(r.message||"Failed to delete FAQ")}finally{u(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"FAQ Management"}),e.jsx("button",{className:"btn-primary",onClick:G,children:"Add New FAQ"})]}),e.jsxs("div",{className:"view-content",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading FAQs..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&e.jsx("div",{className:"faq-container",children:a.map(j=>e.jsxs("div",{className:"faq-item",children:[e.jsxs("div",{className:"faq-question",children:[e.jsxs("h4",{children:["Q: ",j.question]}),e.jsx("button",{className:"btn-small",onClick:()=>D(j),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>C(j.id),disabled:m===j.id,children:m===j.id?"Working...":"Delete"})]}),e.jsx("div",{className:"faq-answer",children:e.jsxs("p",{children:["A: ",j.answer]})})]},j.id))})]}),v&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:j=>j.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit FAQ":"Add FAQ"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Question"}),e.jsx("input",{type:"text",value:h.question,onChange:j=>N(W=>({...W,question:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Answer"}),e.jsx("textarea",{rows:"4",value:h.answer,onChange:j=>N(W=>({...W,answer:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:h.status,onChange:j=>N(W=>({...W,status:j.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:h.order,onChange:j=>N(W=>({...W,order:j.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:F,disabled:m||!h.question.trim()||!h.answer.trim(),children:m?"Saving...":"Save"})]})]})})]})}function Po(){const[a,n]=t.useState([]),[i,p]=t.useState(!0),[g,x]=t.useState(""),[v,w]=t.useState(!1),[f,B]=t.useState(null),[h,N]=t.useState({title:"",content:"",order:0,status:"active"}),[m,u]=t.useState(null),k=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to view manual."),p(!1);return}try{p(!0);const W=await al(j);n(W.sections||[]),x("")}catch(W){console.error("Failed to load manual:",W),x(W.message||"Failed to load manual")}finally{p(!1)}};t.useEffect(()=>{k()},[]);const G=()=>{B(null),N({title:"",content:"",order:0,status:"active"}),w(!0)},D=j=>{B(j),N({title:j.title,content:j.content,order:j.order||0,status:j.status||"active"}),w(!0)},F=async()=>{const j=localStorage.getItem("token");if(!j){x("Please login to save manual sections.");return}try{u(f?.id||"new");const W={title:h.title.trim(),content:h.content.trim(),order:Number(h.order)||0,status:h.status};f?await nl(f.id,W,j):await rl(W,j),w(!1),k()}catch(W){x(W.message||"Failed to save section")}finally{u(null)}},C=async j=>{const W=localStorage.getItem("token");if(!W){x("Please login to delete sections.");return}try{u(j),await sl(j,W),n(r=>r.filter(M=>M.id!==j))}catch(r){x(r.message||"Failed to delete section")}finally{u(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"User Manual"}),e.jsx("button",{className:"btn-primary",onClick:G,children:"Add Section"})]}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"manual-container",children:[i&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading manual..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!i&&!g&&a.map(j=>e.jsxs("section",{className:"manual-section",children:[e.jsx("h3",{children:j.title}),e.jsx("p",{children:j.content}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>D(j),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>C(j.id),disabled:m===j.id,children:m===j.id?"Working...":"Delete"})]})]},j.id))]})}),v&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:j=>j.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Section":"Add Section"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:h.title,onChange:j=>N(W=>({...W,title:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Content"}),e.jsx("textarea",{rows:"6",value:h.content,onChange:j=>N(W=>({...W,content:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:h.order,onChange:j=>N(W=>({...W,order:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:h.status,onChange:j=>N(W=>({...W,status:j.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:F,disabled:m||!h.title.trim()||!h.content.trim(),children:m?"Saving...":"Save"})]})]})})]})}const Lo=()=>{const[a,n]=t.useState(null),[i,p]=t.useState(null),[g,x]=t.useState(!0),[v,w]=t.useState(null),f=async()=>{try{const F=localStorage.getItem("token");if(!F)throw new Error("Please login to view system monitor");const[C,j]=await Promise.all([il(F),ll(F)]);n(C),p(j),w(new Date),x(!1)}catch(F){console.error("Monitor Error:",F),x(!1)}};if(t.useEffect(()=>{f();const F=setInterval(()=>{document.hidden||f()},6e4);return()=>clearInterval(F)},[]),g&&!a)return e.jsx("div",{className:"admin-content-card",children:"Loading System Monitor..."});const B=a?.counts||{users:0,bets:0,matches:0},h=a?.liveMatches||[],N=i?.items||[],m=i?.summary||{links:0,collections:0,rows:0},u=a?.sportsbookHealth||{},k=u?.oddsSync||{},G=u?.settlement||{},D=async()=>{try{const F=localStorage.getItem("token");if(!F)throw new Error("Please login first");const C=await Qn(F);alert(`Odds Refreshed! Created: ${C.results?.created||0}, Updated: ${C.results?.updated||0}, Score-only updates: ${C.results?.scoreOnlyUpdates||0}, Settled: ${C.results?.settled||0}`),f()}catch(F){console.error("Refresh error:",F),alert(F.message||"Error refreshing odds")}};return e.jsxs("div",{className:"admin-view-container",children:[e.jsxs("div",{className:"monitor-header",style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("h2",{style:{color:"#fff",margin:0},children:"System Monitor"}),e.jsxs("div",{style:{color:"#aaa",fontSize:"0.9rem"},children:["Last updated: ",v?v.toLocaleTimeString():"Never"]}),e.jsx("button",{onClick:D,style:{background:"#e67e22",color:"white",border:"none",padding:"8px 16px",borderRadius:"4px",cursor:"pointer",fontWeight:"bold"},children:"🔄 Refresh Live Odds"})]}),e.jsxs("div",{className:"stats-grid",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-users"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Users"}),e.jsx("p",{children:B.users})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-ticket"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Bets"}),e.jsx("p",{children:B.bets})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-futbol"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Tracked Matches"}),e.jsx("p",{children:B.matches})]})]})]}),e.jsxs("div",{className:"admin-content-card",style:{marginBottom:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-heart-pulse"})," Sportsbook Feed Health"]})}),e.jsxs("div",{className:"stats-grid",style:{marginBottom:0},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-signal"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Odds Feed"}),e.jsx("p",{children:k?.bettingSuspended?"STALE / CLOSED":"OK"}),e.jsxs("small",{children:["Last odds sync: ",k?.lastOddsSuccessAt?new Date(k.lastOddsSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Age: ",k?.syncAgeSeconds??"—","s"]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-flag-checkered"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Results Feed"}),e.jsx("p",{children:k?.lastScoresSuccessAt?"SYNCING":"UNKNOWN"}),e.jsxs("small",{children:["Last score sync: ",k?.lastScoresSuccessAt?new Date(k.lastScoresSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Failures: ",k?.consecutiveFailures??0]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-scale-balanced"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Settlement"}),e.jsx("p",{children:G?.lastRunStatus||"unknown"}),e.jsxs("small",{children:["Last success: ",G?.lastSuccessAt?new Date(G.lastSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Last match: ",G?.lastMatchId||"—"]})]})]})]}),(k?.lastError||G?.lastError)&&e.jsxs("div",{style:{marginTop:"16px",padding:"12px",borderRadius:"8px",background:"rgba(255, 80, 80, 0.12)",color:"#ffb3b3"},children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Last sync error:"})," ",k?.lastError||"—"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Last settlement error:"})," ",G?.lastError||"—"]})]})]}),e.jsxs("div",{className:"admin-content-card",children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-satellite-dish"})," Live & Scored Matches (DB View)"]})}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Scores"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Updated"})]})}),e.jsx("tbody",{children:h.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"text-center",children:"No live or scored matches found."})}):h.map(F=>e.jsxs("tr",{children:[e.jsx("td",{children:F.sport?.replace("_"," ").toUpperCase()}),e.jsxs("td",{children:[F.homeTeam," ",e.jsx("span",{className:"vs",children:"vs"})," ",F.awayTeam]}),e.jsxs("td",{className:"score-cell",children:[e.jsx("span",{className:"score-badge home",children:F.score?.score_home??F.score?.scoreHome??0}),"-",e.jsx("span",{className:"score-badge away",children:F.score?.score_away??F.score?.scoreAway??0})]}),e.jsx("td",{children:e.jsx("span",{className:`status-badge ${F.status}`,children:F.status})}),e.jsx("td",{children:new Date(F.lastUpdated).toLocaleTimeString()})]},F.id))})]})})]}),e.jsxs("div",{className:"admin-content-card",style:{marginTop:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-diagram-project"})," Dashboard Link to Entity/Table Map"]})}),e.jsxs("div",{style:{color:"#666",marginBottom:"10px",fontSize:"0.9rem"},children:["Links: ",m.links," | Collections: ",m.collections," | Total Rows: ",m.rows]}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Dashboard Link"}),e.jsx("th",{children:"Collections"}),e.jsx("th",{children:"Tables / Views"}),e.jsx("th",{children:"API Routes"})]})}),e.jsx("tbody",{children:N.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center",children:"No entity catalog data found."})}):N.map(F=>e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("strong",{children:F.label}),e.jsx("div",{style:{fontSize:"0.8rem",color:"#666"},children:F.id})]}),e.jsx("td",{children:(F.collections||[]).map(C=>e.jsxs("div",{style:{marginBottom:"4px"},children:[e.jsx("code",{children:C.collection})," (",C.rows,")"]},`${F.id}-${C.collection}`))}),e.jsx("td",{children:(F.collections||[]).map(C=>e.jsxs("div",{style:{marginBottom:"4px",fontSize:"0.85rem"},children:[e.jsxs("div",{children:[e.jsx("code",{children:C.table})," ",C.exists?"":"(missing)"]}),e.jsxs("div",{children:[e.jsx("code",{children:C.entityView})," | ",e.jsx("code",{children:C.flatTable})]})]},`${F.id}-${C.collection}-table`))}),e.jsx("td",{children:(F.routes||[]).map(C=>e.jsx("div",{style:{marginBottom:"2px",fontSize:"0.85rem"},children:e.jsx("code",{children:C})},`${F.id}-${C}`))})]},F.id))})]})})]}),e.jsx("style",{children:`
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
            `})]})},Pa=a=>{const n=Number(a);return Number.isNaN(n)?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n)};function Do(){const[a,n]=t.useState(null),[i,p]=t.useState(null),[g,x]=t.useState(!0),[v,w]=t.useState(""),[f,B]=t.useState(!1),h=async N=>{const m=N.target.value;B(!0);try{const u=localStorage.getItem("token");await ol({dashboardLayout:m},u),n(k=>({...k,dashboardLayout:m})),alert("Layout updated. The page will reload to apply changes."),window.location.reload()}catch(u){alert("Failed to update layout: "+u.message)}finally{B(!1)}};return t.useEffect(()=>{(async()=>{const m=localStorage.getItem("token");if(!m){w("Please login to view profile."),x(!1);return}try{x(!0);const u=await zt(m);if(n(u),String(u?.role||"").toLowerCase()==="agent")try{const G=await ss(m);p(Number(G?.balanceOwed??0))}catch(G){console.error("Failed to load settlement balance:",G),p(null)}else p(null);w("")}catch(u){w(u.message||"Failed to load profile")}finally{x(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"My Profile"})}),e.jsxs("div",{className:"view-content",children:[g&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading profile..."}),v&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:v}),!g&&!v&&a&&e.jsx("div",{className:"settings-container",children:e.jsxs("div",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Account"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username:"}),e.jsx("input",{type:"text",value:a.username||"",readOnly:!0})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Preferences"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Dashboard Layout:"}),e.jsxs("select",{value:a.dashboardLayout||"tiles",onChange:h,disabled:f,style:{padding:"8px",borderRadius:"4px",border:"1px solid #ccc"},children:[e.jsx("option",{value:"tiles",children:"Tiles (Default)"}),e.jsx("option",{value:"sidebar",children:"Sidebar Navigation"})]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number:"}),e.jsx("input",{type:"text",value:a.phoneNumber||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role:"}),e.jsx("input",{type:"text",value:a.role||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Super Admin:"}),e.jsx("input",{type:"text",value:a.isSuperAdmin?"Yes":"No",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Unlimited Balance:"}),e.jsx("input",{type:"text",value:a.unlimitedBalance?"Enabled":"Disabled",readOnly:!0})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Balances"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Balance:"}),e.jsx("input",{type:"text",value:Pa(a.balance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Pending Balance:"}),e.jsx("input",{type:"text",value:Pa(a.pendingBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Available Balance:"}),e.jsx("input",{type:"text",value:Pa(a.availableBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:String(a.role||"").toLowerCase()==="agent"?"Settlement Balance:":"Outstanding (Settle Limit):"}),e.jsx("input",{type:"text",value:Pa(String(a.role||"").toLowerCase()==="agent"&&i!==null?i:a.balanceOwed),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit Limit:"}),e.jsx("input",{type:"text",value:Pa(a.creditLimit),readOnly:!0})]})]})]})})]})]})}const $n={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},Rn=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Un=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],To=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],la=a=>String(a||"").trim().toLowerCase(),Gs=a=>String(a||"").trim().toUpperCase(),cr=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),Io=new Set([...cr,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Mo=new Set(["bet_void","bet_void_admin","deleted_wager"]),Bo=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),Fo=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),Eo=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),zs=a=>{const n=la(a?.type),i=Gs(a?.reason),p=String(a?.description||"").toLowerCase();return n==="fp_deposit"||Eo.has(i)||(n==="adjustment"||n==="fp_deposit")&&(p.includes("freeplay")||p.includes("free play"))},$o=a=>{const n=la(a?.type),i=Gs(a?.reason);return n==="credit_adj"||n==="debit_adj"||Bo.has(i)},Ro=a=>{const n=Gs(a?.reason);return Fo.has(n)},Uo=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,Is=a=>!a||typeof a!="object"?a:{...a,minBet:Ce(a.minBet??a.defaultMinBet,0),maxBet:Ce(a.maxBet??a.wagerLimit??a.defaultMaxBet,0),wagerLimit:Ce(a.wagerLimit??a.maxBet??a.defaultMaxBet,0),creditLimit:Ce(a.creditLimit??a.defaultCreditLimit,0),balanceOwed:Ce(a.balanceOwed??a.defaultSettleLimit,0),balance:Ce(a.balance,0),pendingBalance:Ce(a.pendingBalance,0),freeplayBalance:Ce(a.freeplayBalance,0),lifetime:Ce(a.lifetime,0),lifetimePlusMinus:Ce(a.lifetimePlusMinus??a.lifetime,0)},_n=(a,n=0)=>Ce(a===""||a===null||a===void 0?n:a,0),Wn=a=>String(a||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Vs=a=>la(a?.type)==="deleted_wager"?String(a?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":er(a),On=a=>{const n=String(a?.description||"").trim();if(!n)return"—";const i=Wn(n),p=Wn(Vs(a));return!i||p&&(i===p||i===`${p}s`||`${i}s`===p)?"—":n},zn=a=>String(a?.actorUsername??a?.deletedByUsername??"").trim()||"—",Vn=a=>{if(!a)return 0;const n=a?.$date||a,p=new Date(n).getTime();return Number.isNaN(p)?0:p},_o=a=>{const n=Math.abs(Number(a?.amount||0)),i=String(a?.sport||"").trim(),p=String(a?.reason||"").trim(),g=String(a?.status||"deleted").trim().toLowerCase()||"deleted",v=[g==="restored"?"Changed Wager":"Deleted Wager"];return i&&v.push(`(${i})`),p&&v.push(`- ${p}`),{id:`deleted-wager-${String(a?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:a?.id||null,user:a?.user||"Unknown",userId:a?.userId||null,amount:n,date:a?.deletedAt||a?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:g,reason:p?p.toUpperCase().replace(/\s+/g,"_"):null,description:v.join(" ")}},Wo=a=>{const n=la(a);return n==="betting_adjustments"||n==="credit_debit_adjustments"||n==="promotional_adjustments"?"adjustment":"all"},Oo=(a,n)=>{const i=la(n);if(i===""||i==="all"||i==="all_transactions")return!0;const p=la(a?.type);return i==="non_wager"?!Io.has(p):i==="deposit_withdrawal"?p==="deposit"||p==="withdrawal":i==="betting_adjustments"||i==="credit_debit_adjustments"?$o(a):i==="promotional_adjustments"?Ro(a):i==="freeplay_transactions"?zs(a):i==="wagers_only"?cr.has(p):i==="deleted_changed"||i==="deleted_transactions"?Mo.has(p):!0},zo=a=>!a||typeof a!="object"?"":String(a.userId??a.playerId??a.user?.id??a.user?.id??"").trim(),Vo=a=>!a||typeof a!="object"?"":String(a.user??a.username??a.playerUsername??a.playerName??"").trim().toLowerCase(),Ms=(a,n,i,p)=>{const g=zo(a);if(g!=="")return!!(g===String(n)||p?.id&&g===String(p.id));const x=Vo(a),v=String(i||"").trim().toLowerCase();return x!==""&&v!==""?!!(x===v||p?.username&&x===String(p.username).trim().toLowerCase()):!0};function Ho({userId:a,onBack:n,onNavigateToUser:i,role:p="admin",viewContext:g=null}){const[x,v]=t.useState(!0),[w,f]=t.useState(!1),[B,h]=t.useState(""),[N,m]=t.useState(""),[u,k]=t.useState(null),[G,D]=t.useState({}),[F,C]=t.useState(null),[j,W]=t.useState([]),[r,M]=t.useState($n),[T,o]=t.useState(!1),[U,ae]=t.useState("basics"),[z,y]=t.useState([]),[K,c]=t.useState(!1),[E,O]=t.useState(""),[_,H]=t.useState(""),[de,De]=t.useState("7d"),[Y,$]=t.useState("deposit_withdrawal"),[ee,fe]=t.useState("all"),[Z,te]=t.useState([]),[Oe,P]=t.useState(!1),[le,l]=t.useState("deposit"),[q,re]=t.useState(""),[he,we]=t.useState(""),[Se,Je]=t.useState(!0),[ze,Ye]=t.useState(!1),[dt,tt]=t.useState(!1),[Ze,$e]=t.useState("daily"),[ht,bt]=t.useState(!1),[lt,Ve]=t.useState(""),[He,at]=t.useState([]),[Xe,St]=t.useState(""),[d,R]=t.useState([]),[X,me]=t.useState([]),[ke,ge]=t.useState(!1),[Ne,Te]=t.useState(""),[Ke,yt]=t.useState(""),[It,vt]=t.useState("7d"),[st,jt]=t.useState([]),[Mt,kt]=t.useState(!1),[Nt,Ft]=t.useState("deposit"),[$t,Rt]=t.useState(""),[V,ce]=t.useState(""),[ve,Ie]=t.useState(!1),[rt,ut]=t.useState(!1),[et,A]=t.useState(""),[I,je]=t.useState(""),[Q,Be]=t.useState(!1),[Fe,Ge]=t.useState(""),[Ae,Re]=t.useState(""),[Ue,gt]=t.useState(""),[Bt,ot]=t.useState(null),[At,wt]=t.useState(!1),[Ct,Pt]=t.useState(""),[ft,sa]=t.useState(null),[mt,Et]=t.useState(null),[oa,ga]=t.useState(!1),[Ma,S]=t.useState(""),[J,L]=t.useState(!1),[ie,ne]=t.useState(""),[pe,be]=t.useState(""),[_e,ct]=t.useState(null),[Lt,Kt]=t.useState(""),[fa,Ba]=t.useState(""),[qs,Fa]=t.useState(""),[qo,dr]=t.useState(""),[Ea,Ys]=t.useState(""),[Yo,ur]=t.useState(""),[Qo,mr]=t.useState([]),[Qs,pr]=t.useState(""),[ba,ls]=t.useState(null),[Ks,Js]=t.useState(!1),[Zs,$a]=t.useState(""),[Ra,Xs]=t.useState(null),hr=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],en=async(s,b)=>{const se=String(b||"").trim();if(!se)return null;try{const ue=await ss(s,{agentId:se}),oe=Number(ue?.balanceOwed);return Number.isFinite(oe)?oe:null}catch(ue){return console.warn("Failed to load live agent settlement balance:",ue),null}};t.useEffect(()=>{a&&(async()=>{try{v(!0),h(""),m(""),H(""),O(""),ot(null),k(null),sa(null),Et(null),M($n),ae("basics");const b=localStorage.getItem("token");if(!b){h("Please login to view details.");return}const[se,ue]=await Promise.all([ws(a,b),["admin","super_agent","master_agent","agent"].includes(p)?Yt(b):Promise.resolve([])]),oe=se?.user,xe=oe?.settings||{},ye=xe.dynamicLiveLimits||{},Pe=xe.dynamicLiveFlags||{},Le=xe.liveCasinoLimits||{},We=Le.default||{},Qe=Le.agent||{},qe=Le.player||{};if(!oe){h("User not found.");return}const it=String(oe?.role||"").toLowerCase(),Wt=it==="agent"||it==="master_agent"||it==="super_agent",pt=Is(oe),ca=Wt?await en(b,oe.id||a):null;k(pt),sa(ca),D(se?.stats||{}),C(se?.referredBy||null),W(Array.isArray(ue)?ue:[]),Wt&&(Ba(oe?.agentPercent!=null?String(oe.agentPercent):""),Fa(oe?.playerRate!=null?String(oe.playerRate):""),dr(oe?.hiringAgentPercent!=null?String(oe.hiringAgentPercent):""),Ys(pt.parentAgentId||pt.masterAgentId||pt.createdBy?.id||pt.createdBy||""),ur(oe?.subAgentPercent!=null?String(oe.subAgentPercent):""),mr(Array.isArray(oe?.extraSubAgents)?oe.extraSubAgents.map((Xt,ea)=>({id:ea,name:Xt.name||"",percent:Xt.percent!=null?String(Xt.percent):""})):[])),M({password:"",firstName:pt.firstName||"",lastName:pt.lastName||"",phoneNumber:pt.phoneNumber||"",minBet:pt.minBet,agentId:Wt?pt.parentAgentId||pt.masterAgentId||"":p==="admin"?pt.masterAgentId||pt.agentId?.id||pt.agentId||"":pt.agentId?.id||pt.agentId||"",status:(pt.status||"active").toLowerCase(),creditLimit:pt.creditLimit,wagerLimit:pt.wagerLimit,settleLimit:pt.balanceOwed,accountType:xe.accountType||"credit",zeroBalanceWeekly:xe.zeroBalanceWeekly||"standard",tempCredit:Number(xe.tempCredit||0),expiresOn:xe.expiresOn||"",enableCaptcha:!!xe.enableCaptcha,cryptoPromoPct:Number(xe.cryptoPromoPct||0),promoType:xe.promoType||"promo_credit",playerNotes:xe.playerNotes||"",sportsbook:xe.sports??!0,casino:xe.casino??!0,horses:xe.racebook??!0,messaging:xe.messaging??!1,dynamicLive:xe.live??!0,propPlus:xe.props??!0,liveCasino:xe.liveCasino??!1,freePlayPercent:Number(xe.freePlayPercent??20),maxFpCredit:Number(xe.maxFpCredit??0),dlMinStraightBet:Number(ye.minStraightBet??25),dlMaxStraightBet:Number(ye.maxStraightBet??250),dlMaxPerOffering:Number(ye.maxPerOffering??500),dlMaxBetPerEvent:Number(ye.maxBetPerEvent??500),dlMaxWinSingleBet:Number(ye.maxWinSingleBet??1e3),dlMaxWinEvent:Number(ye.maxWinEvent??3e3),dlDelaySec:Number(ye.delaySec??7),dlMaxFavoriteLine:Number(ye.maxFavoriteLine??-1e4),dlMaxDogLine:Number(ye.maxDogLine??1e4),dlMinParlayBet:Number(ye.minParlayBet??10),dlMaxParlayBet:Number(ye.maxParlayBet??100),dlMaxWinEventParlay:Number(ye.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(ye.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(ye.wagerCoolOffSec??30),dlLiveParlays:!!Pe.liveParlays,dlBlockPriorStart:Pe.blockPriorStart??!0,dlBlockHalftime:Pe.blockHalftime??!0,dlIncludeGradedInLimits:!!Pe.includeGradedInLimits,dlUseRiskLimits:!!Pe.useRiskLimits,casinoDefaultMaxWinDay:Number(We.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(We.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(We.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(We.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(Qe.maxWinDay??1e3),casinoAgentMaxLossDay:Number(Qe.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(Qe.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(Qe.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(qe.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(qe.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(qe.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(qe.maxLossWeek??5e3),appsVenmo:oe.apps?.venmo||"",appsCashapp:oe.apps?.cashapp||"",appsApplePay:oe.apps?.applePay||"",appsZelle:oe.apps?.zelle||"",appsPaypal:oe.apps?.paypal||"",appsBtc:oe.apps?.btc||"",appsOther:oe.apps?.other||""})}catch(b){console.error("Failed to load player details:",b),h(b.message||"Failed to load details")}finally{v(!1)}})()},[p,a]);const os=async()=>{if(!a)return;const s=localStorage.getItem("token");if(s)try{ga(!0),S("");const b=await cl(a,s);Et(b)}catch(b){S(b.message||"Failed to load commission chain")}finally{ga(!1)}},xr=async s=>{if(Ys(s),!s)return;const b=localStorage.getItem("token");if(b)try{L(!0),ne(""),be(""),await xa(a,{parentAgentId:s},b),be("Master agent updated"),await os()}catch(se){ne(se.message||"Failed to update master agent")}finally{L(!1)}},gr=async()=>{const s=localStorage.getItem("token"),b=parseFloat(Qs);if(!s||isNaN(b)||b<=0){$a("Enter a valid positive amount");return}try{Js(!0),$a(""),ls(null);const se=await ul(a,b,s);ls(se)}catch(se){$a(se.message||"Calculation failed")}finally{Js(!1)}},fr=async()=>{if(!mt?.upline)return;const s=localStorage.getItem("token");if(s)try{const b=mt.upline.map(ue=>({id:ue.id,username:ue.username,agentPercent:ue.agentPercent})),se=await dl(b,s);Xs(se)}catch(b){Xs({isValid:!1,errors:[b.message]})}},tn=async s=>{if(!u?.username)return[];const b=s||localStorage.getItem("token");if(!b)throw new Error("Please login to view transactions.");const se=await Da({user:u.username||"",type:Wo(Y),status:ee,time:de,limit:300},b);let xe=[...(Array.isArray(se?.transactions)?se.transactions:[]).filter(ye=>Ms(ye,a,u.username,ds))];if(["deleted_changed","deleted_transactions"].includes(la(Y)))try{const ye=await Yn({user:u.username||"",status:"all",sport:"all",time:de,limit:300},b),Pe=(Array.isArray(ye?.wagers)?ye.wagers:[]).filter(Le=>String(Le?.userId||"")===String(a)).map(_o);xe=[...xe,...Pe]}catch(ye){console.warn("Deleted/Changed wagers could not be loaded:",ye)}return xe.filter(ye=>Oo(ye,Y)).sort((ye,Pe)=>Vn(Pe?.date)-Vn(ye?.date))};t.useEffect(()=>{(async()=>{if(!(U!=="transactions"||!u))try{c(!0),O("");const b=await tn();y(b)}catch(b){O(b.message||"Failed to load transactions")}finally{c(!1)}})()},[U,u,Y,ee,de,a]),t.useEffect(()=>{(async()=>{if(!(U!=="performance"||!u?.username))try{bt(!0),Ve("");const b=localStorage.getItem("token");if(!b){Ve("Please login to view performance.");return}const se=await rs({customer:u.username,time:Ze==="weekly"?"90d":Ze==="yearly"?"all":"30d",type:"all-types",limit:500},b),ue=Array.isArray(se?.bets)?se.bets:[],oe=new Map,xe=Le=>{const We=new Date(Date.UTC(Le.getFullYear(),Le.getMonth(),Le.getDate())),Qe=We.getUTCDay()||7;We.setUTCDate(We.getUTCDate()+4-Qe);const qe=new Date(Date.UTC(We.getUTCFullYear(),0,1));return Math.ceil(((We-qe)/864e5+1)/7)};for(const Le of ue){const We=Le?.createdAt,Qe=new Date(We);if(Number.isNaN(Qe.getTime()))continue;let qe="",it="";if(Ze==="daily"){const Ut=Qe.getFullYear(),ka=String(Qe.getMonth()+1).padStart(2,"0"),da=String(Qe.getDate()).padStart(2,"0");qe=`${Ut}-${ka}-${da}`,it=Qe.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(Ze==="weekly"){const Ut=Qe.getFullYear(),ka=String(xe(Qe)).padStart(2,"0");qe=`${Ut}-W${ka}`;const da=new Date(Qe),bn=da.getDay(),Yr=da.getDate()-bn+(bn===0?-6:1);da.setDate(Yr),it=`Week of ${da.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(Ze==="monthly"){const Ut=Qe.getFullYear(),ka=String(Qe.getMonth()+1).padStart(2,"0");qe=`${Ut}-${ka}`,it=Qe.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const Ut=Qe.getFullYear();qe=`${Ut}`,it=`${Ut}`}const Wt=Number(Le?.amount||0),pt=Number(Le?.potentialPayout||0),ca=String(Le?.status||"").toLowerCase(),Xt=ca==="won"?Math.max(0,pt-Wt):ca==="lost"?-Wt:0;oe.has(qe)||oe.set(qe,{date:Qe,net:0,wagers:[],periodLabel:it});const ea=oe.get(qe);ea.net+=Xt,ea.wagers.push({id:Le.id||`${qe}-${ea.wagers.length+1}`,label:`${Le?.match?.awayTeam||""} vs ${Le?.match?.homeTeam||""}`.trim()||Le.selection||"Wager",amount:Xt})}const ye=Array.from(oe.entries()).map(([Le,We])=>({key:Le,date:We.date,periodLabel:We.periodLabel,net:We.net,wagers:We.wagers})).sort((Le,We)=>We.key.localeCompare(Le.key));if(Ze==="yearly"){const Le=Ce(u?.lifetimePlusMinus??u?.lifetime,0);if(Number.isFinite(Le)){const We=ye.reduce((qe,it)=>qe+Number(it.net||0),0),Qe=Le-We;if(Math.abs(Qe)>=.01){const qe=String(new Date().getFullYear());let it=ye.findIndex(Wt=>Wt.key===qe);it<0&&(ye.unshift({key:qe,date:new Date,periodLabel:qe,net:0,wagers:[]}),it=0),ye[it]={...ye[it],net:Number(ye[it].net||0)+Qe,wagers:[...Array.isArray(ye[it].wagers)?ye[it].wagers:[],{id:`lifetime-carry-${ye[it].key}`,label:"Lifetime +/- Carry",amount:Qe,synthetic:!0}]}}}}at(ye);const Pe=ye[0]?.key||"";St(Pe),R(ye[0]?.wagers||[])}catch(b){Ve(b.message||"Failed to load performance"),at([]),St(""),R([])}finally{bt(!1)}})()},[U,u?.username,u?.lifetimePlusMinus,u?.lifetime,Ze]),t.useEffect(()=>{(async()=>{if(!(U!=="freeplays"||!u?.username))try{ge(!0),Te("");const b=localStorage.getItem("token");if(!b){Te("Please login to view free play.");return}const se=await Da({user:u.username,type:"all",status:"all",time:It,limit:300},b),oe=(Array.isArray(se?.transactions)?se.transactions:[]).filter(xe=>Ms(xe,a,u.username,ds)&&zs(xe));me(oe)}catch(b){Te(b.message||"Failed to load free play")}finally{ge(!1)}})()},[U,u?.username,It,a]);const Me=(s,b)=>{M(se=>({...se,[s]:b}))},br=s=>{ot(null),M(b=>({...b,firstName:Ht(s)}))},jr=s=>{ot(null),M(b=>({...b,lastName:Ht(s)}))},yr=s=>{ot(null),M(b=>({...b,phoneNumber:$s(s)}))},an=t.useMemo(()=>{const s=`${r.firstName||""} ${r.lastName||""}`.trim();return s||(u?.fullName?u.fullName:"")},[r.firstName,r.lastName,u?.fullName]);t.useMemo(()=>an||u?.username||"Player",[an,u?.username]);const sn=t.useMemo(()=>Rs(r.firstName,r.lastName,r.phoneNumber,u?.username||""),[r.firstName,r.lastName,r.phoneNumber,u?.username]),cs=t.useMemo(()=>u?sn||u.displayPassword||"Not set":"",[u,sn]),nn=t.useMemo(()=>{const s=new Set;return(Array.isArray(Bt?.matches)?Bt.matches:[]).forEach(se=>{(Array.isArray(se?.matchReasons)?se.matchReasons:[]).forEach(oe=>{const xe=String(oe||"").trim().toLowerCase();xe&&s.add(xe)})}),s},[Bt]),vr=nn.has("phone"),Nr=nn.has("password"),wr=t.useMemo(()=>{const s=String(u?.role||"player").toLowerCase();return s==="user"||s==="player"?"PLAYER":s.replace(/_/g," ").toUpperCase()},[u?.role]),Ee=t.useMemo(()=>{const s=String(u?.role||"player").toLowerCase();return s==="agent"||s==="master_agent"||s==="master agent"||s==="super_agent"||s==="super agent"},[u?.role]),ds=t.useMemo(()=>{if(!Ee||!u?.username||!j?.length)return null;const s=String(u.username).toUpperCase();if(s.endsWith("MA")){const b=s.slice(0,-2),se=j.find(ue=>String(ue.username||"").toUpperCase()===b);return se?{id:se.id,username:b}:null}else{const b=s+"MA",se=j.find(ue=>String(ue.username||"").toUpperCase()===b);return se?{id:se.id,username:b}:null}},[Ee,u?.username,j]);t.useMemo(()=>{if(!Ea)return"";const s=j.find(b=>b.id===Ea);return s?String(s.username||"").toUpperCase():String(u?.createdByUsername||u?.createdBy?.username||"").toUpperCase()},[Ea,j,u]);const Jt=Ce(u?.balance,0),ja=Ce(u?.pendingBalance,0),rn=Ce(u?.freeplayBalance,0),ln=Ce(u?.lifetimePlusMinus??u?.lifetime,0),ya=_n(r.creditLimit,u?.creditLimit),us=_n(r.settleLimit,u?.balanceOwed),ms=Ce(u?.minBet??r.minBet,0),ps=Ce(u?.maxBet??u?.wagerLimit??r.wagerLimit,0),na=Ee&&ft!==null?Ce(ft,0):Jt,hs="Balance Owed / House Money",xs=t.useMemo(()=>ya+Jt-ja,[ya,Jt,ja]),Zt=t.useMemo(()=>{let s=0;for(const b of z)b?.status==="pending"&&String(b?.type||"").toLowerCase().includes("casino")&&(s+=Number(b.amount||0));return{pending:ja,available:Ee?Jt:Number(xs||0),carry:Ee&&ft!==null?na:Jt,nonPostedCasino:s}},[z,ja,Jt,xs,Ee,ft,na]),on=s=>Math.round(Ce(s,0)),gs=s=>String(Math.abs(on(s))),nt=s=>"$"+on(s).toLocaleString("en-US"),Dt=s=>{const b=Ce(s,0);return`$${Math.round(b).toLocaleString("en-US")}`},Sr=async()=>{Pt(""),wt(!0);try{const s=localStorage.getItem("token");if(!s)throw new Error("No admin token found. Please log in again.");const b=await Xn(a,s);if(!b?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",s);const oe=localStorage.getItem("userRole")||"";oe&&sessionStorage.setItem("impersonationBaseRole",oe)}localStorage.setItem("token",b.token),localStorage.setItem("userRole",String(b?.role||"user")),localStorage.removeItem("user");const se=String(b?.role||"").toLowerCase();let ue="/";se==="admin"?ue="/admin/dashboard":se==="agent"?ue="/agent/dashboard":(se==="master_agent"||se==="super_agent")&&(ue="/super_agent/dashboard"),window.location.href=ue}catch(s){Pt(s.message||"Failed to login as user. Please try again."),wt(!1)}},fs=String(F?.id||"").trim(),kr=t.useMemo(()=>{if(!F)return"—";const s=F.firstName||"",b=F.lastName||"";return[s,b].filter(Boolean).join(" ").trim()||F.username||F.id||"—"},[F]),Ua=fs!==""&&fs!==String(a||"").trim()&&typeof i=="function",Cr=()=>{Ua&&i(fs)},Ar=async()=>{const s=ms,b=ps,se=ya,ue=us,oe=String(cs??""),xe=String(u?.role||"").toLowerCase(),ye=xe==="user"||xe==="player"||xe==="",Pe="https://bettorplays247.com",Le=ye?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${u?.username||""}`,`Password: ${oe}`,`Min bet: ${Dt(s)}`,`Max bet: ${Dt(b)}`,`Credit: ${Dt(se)}`,`Settle: +/- ${Dt(ue)}`,"",`Site: ${Pe}`,"",Uo]:[`Login: ${u?.username||""}`,`Password: ${oe}`,`Min bet: ${Dt(s)}`,`Max bet: ${Dt(b)}`,`Credit: ${Dt(se)}`,`Settle: +/- ${Dt(ue)}`,"",`Site: ${Pe}`],We=Le.join(`
`),qe=`<div style="font-family:sans-serif;white-space:pre-wrap;">${Le.map(it=>it===""?"<br>":it).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([We],{type:"text/plain"}),"text/html":new Blob([qe],{type:"text/html"})})]):await navigator.clipboard.writeText(We),gt("All details copied"),window.setTimeout(()=>gt(""),1400)}catch{gt("Copy failed"),window.setTimeout(()=>gt(""),1400)}},Pr=async()=>{try{f(!0),h(""),m(""),ot(null);const s=localStorage.getItem("token");if(!s){h("Please login again.");return}const b=Ht(r.firstName).trim(),se=Ht(r.lastName).trim(),ue=$s(r.phoneNumber).trim(),oe=Ee?"":Rs(b,se,ue,u?.username||"");if(!Ee&&(!b||!se||!ue||!oe)){h("First name, last name, and phone number are required to generate password.");return}const xe={firstName:b,lastName:se,phoneNumber:ue,fullName:`${b} ${se}`.trim(),password:oe,allowDuplicateSave:!0,status:r.status,minBet:Number(r.minBet||0),creditLimit:Number(r.creditLimit||0),maxBet:Number(r.wagerLimit||0),wagerLimit:Number(r.wagerLimit||0),balanceOwed:Number(r.settleLimit||0),settings:{accountType:r.accountType,zeroBalanceWeekly:r.zeroBalanceWeekly,tempCredit:Number(r.tempCredit||0),expiresOn:r.expiresOn||"",enableCaptcha:!!r.enableCaptcha,cryptoPromoPct:Number(r.cryptoPromoPct||0),promoType:r.promoType,playerNotes:r.playerNotes,sports:!!r.sportsbook,casino:!!r.casino,racebook:!!r.horses,messaging:!!r.messaging,live:!!r.dynamicLive,props:!!r.propPlus,liveCasino:!!r.liveCasino}};xe.apps={venmo:r.appsVenmo||"",cashapp:r.appsCashapp||"",applePay:r.appsApplePay||"",zelle:r.appsZelle||"",paypal:r.appsPaypal||"",btc:r.appsBtc||"",other:r.appsOther||""},["admin","super_agent","master_agent"].includes(p)&&r.agentId&&(xe.agentId=r.agentId);let ye=null;if(Ee){const We={firstName:b,lastName:se,fullName:`${b} ${se}`.trim(),phoneNumber:ue,defaultMinBet:Number(r.minBet||0),defaultMaxBet:Number(r.wagerLimit||0),defaultCreditLimit:Number(r.creditLimit||0),defaultSettleLimit:Number(r.settleLimit||0)};r.agentId&&(We.parentAgentId=r.agentId),await xa(a,We,s),ye={}}else p==="agent"?ye=await _t(a,xe,s):ye=await Vt(a,xe,s);const Pe={...xe};delete Pe.allowDuplicateSave,k(We=>({...We,...Pe,displayPassword:Ee?We?.displayPassword||"":oe||We?.displayPassword||"",settings:{...We?.settings||{},...Pe.settings}}));const Le=ye?.duplicateWarning;Le&&typeof Le=="object"?(ot({message:Le.message||"Likely duplicate player detected.",matches:Array.isArray(Le.matches)?Le.matches:[]}),m("Changes saved with duplicate warning.")):m("Changes saved successfully.")}catch(s){console.error("Failed to save player details:",s);const b=Array.isArray(s?.duplicateMatches)?s.duplicateMatches:Array.isArray(s?.details?.matches)?s.details.matches:[];if(s?.isDuplicate===!0||s?.duplicate===!0||s?.code==="DUPLICATE_PLAYER"||s?.details?.duplicate===!0){ot({message:s?.message||"Likely duplicate player detected.",matches:b}),h("");return}h(s.message||"Failed to save details")}finally{f(!1)}},Lr=async()=>{try{const s=localStorage.getItem("token");if(!s||!u)return;await ha(a,{balance:Ce(u.balance,0)},s),m("Balance updated."),h("")}catch(s){h(s.message||"Failed to update balance")}},cn=s=>{if(!s)return"—";const b=s?.$date||s,se=new Date(b);return Number.isNaN(se.getTime())?"—":se.toLocaleString()},ra=s=>{s==="transactions"?(ae("transactions"),De("7d"),$("deposit_withdrawal"),fe("all")):s==="pending"?(ae("transactions"),De("7d"),$("deposit_withdrawal"),fe("pending")):s==="performance"?ae("performance"):s==="freeplays"?ae("freeplays"):s==="dynamic-live"?ae("dynamic-live"):s==="live-casino"?ae("live-casino"):s==="commission"?(ae("commission"),mt||os()):ae("basics"),o(!1),m(""),H(""),h(""),ot(null),O(""),Ve(""),Te(""),yt(""),A(""),je(""),Ge(""),Re("")},_a=()=>{ra("transactions");const s=Ee?na:Ce(u?.balance,0),b=Ee?s>0?"deposit":"withdrawal":s>0?"withdrawal":"deposit";l(b),re(""),we(""),Je(!0),O(""),P(!0)},dn=!!g?.autoOpenDeposit,[un,Dr]=t.useState(!1);t.useEffect(()=>{!dn||un||u?.id&&Ee&&(_a(),Dr(!0))},[dn,un,u?.id,Ee]);const Wa=t.useMemo(()=>He.find(s=>s.key===Xe)||null,[He,Xe]);t.useEffect(()=>{if(!Wa){R([]);return}R(Wa.wagers||[])},[Wa]);const Tr=t.useMemo(()=>d.reduce((s,b)=>s+Number(b.amount||0),0),[d]),Ir=t.useMemo(()=>d.filter(s=>!s?.synthetic).length,[d]),va=t.useMemo(()=>Ee?na:Ce(u?.balance,0),[Ee,na,u?.balance]),Oa=t.useMemo(()=>Ce(Ee?u?.balance:Zt?.carry,0),[Ee,u?.balance,Zt?.carry]),Mr=t.useMemo(()=>X.filter(s=>String(s.status||"").toLowerCase()==="pending").reduce((s,b)=>s+Ce(b.amount,0),0),[X]),ia=rn,za=s=>{const b=Ce(s,0);return Number.isFinite(b)?Math.round(b*100)/100:0},mn=s=>{const b=Tt(s);return b==="neg"?"#dc2626":b==="pos"?"#16a34a":"#000000"},Va=s=>{const b=Tt(s);return b==="pos"?"neg":b==="neg"?"pos":"neutral"},Br=s=>Ee?Va(s):Tt(s),bs=(s,b=Ee)=>{const se=b?Va(s):Tt(s);return se==="neg"?"#dc2626":se==="pos"?"#16a34a":"#000000"},js=Ee?Un:Rn,pn=js.find(s=>s.value===le)||js[0],Na=Number(q||0),hn=Number.isFinite(Na)&&Na>0,xn=hn,Ha=t.useMemo(()=>rr(u,Na),[u,Na]),Fr=Nt==="withdraw",ys=Number($t||0),gn=Number.isFinite(ys)&&ys>0,fn=gn,wa=async()=>{if(u?.username)try{ge(!0);const s=localStorage.getItem("token");if(!s)return;const b=await Da({user:u.username,type:"all",status:"all",time:It,limit:300},s),se=Array.isArray(b?.transactions)?b.transactions:[];me(se.filter(ue=>Ms(ue,a,u.username,ds)&&zs(ue)))}catch(s){Te(s.message||"Failed to refresh free play")}finally{ge(!1)}},Er=(s,b="transaction")=>{const se=Number(s?.deleted||0),ue=Number(s?.skipped||0),oe=Number(s?.cascadeDeleted||0),ye=(Array.isArray(s?.warnings)?s.warnings:[]).find(Le=>typeof Le?.message=="string"&&Le.message.trim()!=="");let Pe=se>0?`Deleted ${se} ${b}(s).`:`No ${b}(s) were deleted.`;return oe>0&&(Pe+=` Linked free play deleted: ${oe}.`),ue>0&&(Pe+=` Skipped ${ue}.`),ye&&(Pe+=` ${ye.message}`),se>0||oe>0?Pe+=" Balances and totals were updated.":Pe+=" Balances and totals were not changed.",Pe},Ga=(s,b,se,ue)=>{const oe=Number(s?.deleted||0),xe=Number(s?.cascadeDeleted||0),ye=Er(s,b);if(oe>0||xe>0){se(ye),ue("");return}se(""),ue(ye)},$r=async()=>{try{const s=Number($t||0);if(s<=0||Number.isNaN(s)){Te("Enter a valid free play amount greater than 0.");return}const b=localStorage.getItem("token");if(!b||!u){Te("Please login again.");return}const se=Ce(u.freeplayBalance,0),ue=Nt==="withdraw",oe=await qn(a,{operationMode:"transaction",amount:s,direction:ue?"debit":"credit",description:V.trim()},b),xe=Ce(oe?.user?.freeplayBalance,NaN),ye=oe?.user?.freeplayExpiresAt??null;k(Le=>Le&&{...Le,freeplayBalance:Number.isFinite(xe)?xe:za(se+(ue?-s:s)),freeplayExpiresAt:ye});const Pe=ue?"withdrawn":"added";V.trim()?yt(`Free play ${Pe}. Note: "${V.trim()}"`):yt(`Free play ${Pe} successfully.`),Te(""),kt(!1),Ie(!1),Rt(""),ce(""),await wa()}catch(s){Te(s.message||"Failed to update free play")}},Rr=s=>{jt(b=>b.includes(s)?b.filter(se=>se!==s):[...b,s])},Ur=async()=>{try{if(st.length===0||!window.confirm(`Delete ${st.length} selected free play transaction(s)?`))return;const s=localStorage.getItem("token");if(!s){Te("Please login again.");return}const b=await Ya(st,s);jt([]),Ga(b,"free play transaction",yt,Te),await wa(),await Sa(),await qa()}catch(s){Te(s.message||"Failed to delete free play transactions")}},_r=async s=>{try{if(!s||!window.confirm("Delete this free play transaction?"))return;const b=localStorage.getItem("token");if(!b){Te("Please login again.");return}const se=await Ya([s],b);jt(ue=>ue.filter(oe=>oe!==s)),Ga(se,"free play transaction",yt,Te),await wa(),await Sa(),await qa()}catch(b){Te(b.message||"Failed to delete free play transaction")}},Wr=async()=>{try{const s=localStorage.getItem("token");if(!s){Te("Please login again.");return}const b={settings:{freePlayPercent:Number(r.freePlayPercent||0),maxFpCredit:Number(r.maxFpCredit||0)}};p==="agent"?await _t(a,b,s):await Vt(a,b,s),yt("Free play settings saved."),Te("")}catch(s){Te(s.message||"Failed to save free play settings")}},Or=async()=>{try{ut(!0);const s=localStorage.getItem("token");if(!s){A("Please login again.");return}const b={settings:{dynamicLiveLimits:{minStraightBet:Number(r.dlMinStraightBet||0),maxStraightBet:Number(r.dlMaxStraightBet||0),maxPerOffering:Number(r.dlMaxPerOffering||0),maxBetPerEvent:Number(r.dlMaxBetPerEvent||0),maxWinSingleBet:Number(r.dlMaxWinSingleBet||0),maxWinEvent:Number(r.dlMaxWinEvent||0),delaySec:Number(r.dlDelaySec||0),maxFavoriteLine:Number(r.dlMaxFavoriteLine||0),maxDogLine:Number(r.dlMaxDogLine||0),minParlayBet:Number(r.dlMinParlayBet||0),maxParlayBet:Number(r.dlMaxParlayBet||0),maxWinEventParlay:Number(r.dlMaxWinEventParlay||0),maxDogLineParlays:Number(r.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(r.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!r.dlLiveParlays,blockPriorStart:!!r.dlBlockPriorStart,blockHalftime:!!r.dlBlockHalftime,includeGradedInLimits:!!r.dlIncludeGradedInLimits,useRiskLimits:!!r.dlUseRiskLimits}}};p==="agent"?await _t(a,b,s):await Vt(a,b,s),je("Dynamic Live settings saved."),A("")}catch(s){A(s.message||"Failed to save Dynamic Live settings")}finally{ut(!1)}},zr=async()=>{try{Be(!0);const s=localStorage.getItem("token");if(!s){Ge("Please login again.");return}const b={settings:{liveCasinoLimits:{default:{maxWinDay:Number(r.casinoDefaultMaxWinDay||0),maxLossDay:Number(r.casinoDefaultMaxLossDay||0),maxWinWeek:Number(r.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(r.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(r.casinoAgentMaxWinDay||0),maxLossDay:Number(r.casinoAgentMaxLossDay||0),maxWinWeek:Number(r.casinoAgentMaxWinWeek||0),maxLossWeek:Number(r.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(r.casinoPlayerMaxWinDay||0),maxLossDay:Number(r.casinoPlayerMaxLossDay||0),maxWinWeek:Number(r.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(r.casinoPlayerMaxLossWeek||0)}}}};p==="agent"?await _t(a,b,s):await Vt(a,b,s),Re("Live Casino limits saved."),Ge("")}catch(s){Ge(s.message||"Failed to save Live Casino limits")}finally{Be(!1)}},Sa=async()=>{if(u){c(!0);try{const s=localStorage.getItem("token");if(!s){O("Please login to view transactions.");return}const b=await tn(s);y(b)}catch(s){O(s.message||"Failed to refresh transactions")}finally{c(!1)}}},qa=async()=>{try{const s=localStorage.getItem("token");if(!s)return;const b=await ws(a,s),se=b?.user;if(!se||typeof se!="object")return;const ue=Is(se),oe=String(se?.role||"").toLowerCase(),ye=oe==="agent"||oe==="master_agent"||oe==="super_agent"?await en(s,se.id||a):null;k(Pe=>Pe&&{...Pe,balance:ue.balance,pendingBalance:ue.pendingBalance,freeplayBalance:ue.freeplayBalance,lifetime:ue.lifetime,lifetimePlusMinus:ue.lifetimePlusMinus,balanceOwed:ue.balanceOwed,creditLimit:ue.creditLimit,updatedAt:ue.updatedAt}),sa(ye),b?.stats&&typeof b.stats=="object"&&D(b.stats),b?.referredBy!==void 0&&C(b.referredBy||null)}catch(s){console.warn("Failed to refresh customer financials after transaction update:",s)}},Vr=async()=>{if(!dt){tt(!0);try{const s=Number(q||0);if(s<=0||Number.isNaN(s)){O("Enter a valid amount greater than 0.");return}const b=localStorage.getItem("token");if(!b||!u){O("Please login again.");return}const se=Ee?Un:Rn,ue=se.find(qe=>qe.value===le)||se[0],oe=Ce(u.balance,0),xe=za(oe+(ue.balanceDirection==="credit"?s:-s)),ye=he.trim();let Pe;Ee?Pe=await ml(a,{amount:s,direction:ue.balanceDirection,type:ue.apiType,description:ye||ue.defaultDescription},b):Pe=await ha(a,{operationMode:"transaction",amount:s,direction:ue.balanceDirection,type:ue.apiType,reason:ue.reason,description:ye||ue.defaultDescription,applyDepositFreeplayBonus:Se},b);const Le=Ee?0:Ce(Pe?.freeplayBonus?.amount,0),We=Ee?0:Ce(Pe?.referralBonus?.amount,0);k(qe=>{if(!qe)return qe;const it=Ee?Ce(Pe?.agent?.balance,NaN):Ce(Pe?.user?.balance,NaN),Wt=Number.isFinite(it)?it:xe,pt=Ce(Pe?.user?.freeplayBalance,NaN),ca=Number.isFinite(pt)?pt:Ce(qe.freeplayBalance,0),Xt=Pe?.user?.lifetimePlusMinus??Pe?.user?.lifetime??qe.lifetimePlusMinus??qe.lifetime??0,ea=Ce(Xt,NaN),Ut=Number.isFinite(ea)?ea:Ce(qe.lifetimePlusMinus??qe.lifetime,0);return{...qe,balance:Wt,freeplayBalance:ca,lifetime:Ut,lifetimePlusMinus:Ut}});const Qe=["Transaction saved and balance updated."];Le>0&&Qe.push(`Auto free play bonus added: ${nt(Le)}.`),We>0&&Qe.push(`Referral bonus granted: ${nt(We)}.`),H(Qe.join(" ")),O(""),P(!1),Ye(!1),l("deposit"),re(""),we(""),Je(!0),await Sa()}catch(s){O(s.message||"Failed to save transaction")}finally{tt(!1)}}},Hr=s=>{te(b=>b.includes(s)?b.filter(se=>se!==s):[...b,s])},Gr=async()=>{try{if(Z.length===0||!window.confirm(`Delete ${Z.length} selected transaction(s)?`))return;const s=localStorage.getItem("token");if(!s){O("Please login again.");return}const b=await Ya(Z,s);te([]),await Sa(),await wa(),await qa(),Ga(b,"transaction",H,O)}catch(s){O(s.message||"Failed to delete selected transactions")}},qr=async s=>{try{if(!s||!window.confirm("Delete this transaction?"))return;const b=localStorage.getItem("token");if(!b){O("Please login again.");return}const se=await Ya([s],b);te(ue=>ue.filter(oe=>oe!==s)),await Sa(),await wa(),await qa(),Ga(se,"transaction",H,O)}catch(b){O(b.message||"Failed to delete transaction")}};return x?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):u?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:Ee?(()=>{const s=String(u.username||"").toUpperCase(),b=s+"MA";return j?.find(ue=>String(ue.username||"").toUpperCase()===b)?`${s} (${b})`:s})():u.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:wr})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:u.username||""})]}),Ee?e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="commission"?" detail-metric-active":""}`,onClick:()=>ra("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(u?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:u?.agentPercent!=null?`${u.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="transactions"?" detail-metric-active":""}`,onClick:_a,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${Tt(Jt)}`,children:nt(Jt)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:cs})]}),Ee?(()=>{const s=u?.agentPercent!=null?parseFloat(u.agentPercent):null,b=u?.hiringAgentPercent!=null?parseFloat(u.hiringAgentPercent):null,se=5,ue=b!=null&&s!=null?b-s:null,oe=b==null||ue===0,xe=!oe&&b!=null?100-se-b:null,ye=xe!=null&&xe>0,Pe=!oe&&ue>0,Le=[];return Pe&&Le.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[ue,"%"]})]},"hiring")),ye&&Le.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[xe,"%"]})]},"upline")),Le.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),Le.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="commission"?" detail-metric-active":""}`,onClick:()=>ra("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:u?.playerRate!=null?`$${u.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[Le[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:Dt(ms)})]}),Le[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:Dt(ps)})]}),Le[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:Dt(ya)})]}),Le[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",Dt(us)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="transactions"&&ee==="pending"?" detail-metric-active":""}`,onClick:()=>ra("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:nt(ja)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:Dt(ms)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:nt(xs)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:Dt(ps)})]}),!Ee&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="freeplays"?" detail-metric-active":""}`,onClick:()=>ra("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:nt(rn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:Dt(ya)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="performance"?" detail-metric-active":""}`,onClick:()=>ra("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${Tt(ln)}`,children:nt(ln)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",Dt(us)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${Ua?"detail-link-item":""}`,onClick:Cr,disabled:!Ua,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${Ua?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:kr})]})]}),Ee?e.jsxs("button",{type:"button",className:`detail-item detail-metric${U==="transactions"?" detail-metric-active":""}`,onClick:_a,children:[e.jsx("span",{className:"detail-label",children:hs}),e.jsx("strong",{className:`detail-value ${Br(na)}`,children:nt(na)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:Ar,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:Sr,disabled:At,children:At?"Logging in...":"Login User"})]})]})]}),Ct&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:Ct}),Ue&&e.jsx("div",{className:"copy-notice",children:Ue})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>o(s=>!s),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:U==="transactions"?"Transactions":U==="performance"?"Performance":U==="freeplays"?"Free Play":U==="dynamic-live"?"Dynamic Live":U==="live-casino"?"Live Casino":U==="commission"?"Commission Tree":"The Basics"})]}),U==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:_a,children:"New transaction"}):U==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{Ft("withdraw"),Te(""),kt(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{Ft("deposit"),Te(""),kt(!0)},children:"Add Free Play"})]}):U==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:Or,disabled:rt,children:rt?"Saving...":"Save"}):U==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:zr,disabled:Q,children:Q?"Saving...":"Save"}):U==="commission"?e.jsx("button",{className:"btn btn-back",onClick:os,disabled:oa,children:oa?"Loading...":"Refresh"}):U==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:Pr,disabled:w,children:w?"Saving...":"Save"})]}),T&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>o(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>o(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:hr.map(s=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>ra(s.id),children:[e.jsx("span",{className:"menu-icon",children:s.icon}),e.jsx("span",{className:"menu-label",children:s.label})]},s.id))})]})]}),U==="transactions"?E&&e.jsx("div",{className:"alert error",children:E}):U==="performance"?lt&&e.jsx("div",{className:"alert error",children:lt}):U==="freeplays"?Ne&&e.jsx("div",{className:"alert error",children:Ne}):U==="dynamic-live"?et&&e.jsx("div",{className:"alert error",children:et}):U==="live-casino"?Fe&&e.jsx("div",{className:"alert error",children:Fe}):B&&e.jsx("div",{className:"alert error",children:B}),U==="transactions"?_&&e.jsx("div",{className:"alert success",children:_}):U==="freeplays"?Ke&&e.jsx("div",{className:"alert success",children:Ke}):U==="dynamic-live"?I&&e.jsx("div",{className:"alert success",children:I}):U==="live-casino"?Ae&&e.jsx("div",{className:"alert success",children:Ae}):N&&e.jsx("div",{className:"alert success",children:N}),U==="basics"&&Bt&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:Bt.message}),Array.isArray(Bt.matches)&&Bt.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:Bt.matches.map((s,b)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(s.username||"UNKNOWN")}),e.jsx("span",{children:String(s.fullName||"No name")}),e.jsx("span",{children:String(s.phoneNumber||"No phone")})]},`${s.id||s.username||"duplicate"}-${b}`))})]}),U==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const s=(oe,xe)=>{ct(oe),Kt(xe!=null?String(xe):"")},b=()=>{ct(null),Kt("")},se=async()=>{const oe=localStorage.getItem("token");if(!(!oe||!_e))try{L(!0);const xe={};if(_e==="agentPercent"){const Pe=parseFloat(Lt);if(isNaN(Pe)||Pe<0||Pe>100){ne("Must be 0-100");return}xe.agentPercent=Pe}else if(_e==="playerRate"){const Pe=parseFloat(Lt);if(isNaN(Pe)||Pe<0){ne("Must be a positive number");return}xe.playerRate=Pe}await xa(a,xe,oe),ne(""),be("Saved"),b();const ye=await ws(a,oe);ye?.user&&k(Is(ye.user)),Et(null),setTimeout(()=>be(""),2e3)}catch(xe){ne(xe.message||"Save failed")}finally{L(!1)}},ue=[{key:"agentPercent",label:"Agent %",value:u?.agentPercent,display:u?.agentPercent!=null?`${u.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:u?.playerRate,display:u?.playerRate!=null?`$${u.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[ue.map(oe=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:oe.label}),_e===oe.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:oe.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:Lt,onChange:xe=>Kt(xe.target.value),autoFocus:!0,onKeyDown:xe=>{xe.key==="Enter"&&se(),xe.key==="Escape"&&b()}}),e.jsx("button",{className:"commission-inline-save",onClick:se,disabled:J,children:J?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:b,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>oe.editable&&s(oe.key,oe.value),children:[oe.display,oe.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},oe.key)),ie&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:ie}),pe&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:pe})]})})()]}),oa&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),Ma&&e.jsx("div",{className:"alert error",children:Ma}),mt&&!oa&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${mt.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:mt.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[mt.chainTotal,"%"]}),mt.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:fr,style:{marginLeft:12},children:"Re-validate"})]}),Ra&&e.jsx("div",{className:`commission-validity-banner ${Ra.isValid?"valid":"invalid"}`,style:{marginTop:4},children:Ra.isValid?"Validation passed":Ra.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[mt.upline.find(s=>s.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",mt.upline.find(s=>s.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...mt.upline].filter((s,b)=>b>0&&s.role!=="admin").reverse().map((s,b,se)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:b===se.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",s.isSharedNode&&s.linkedUsername?`${s.username}/${s.linkedUsername}`:s.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${s.effectivePercent==null&&s.agentPercent==null?"unset":""}`,children:s.effectivePercent!=null?`(${s.effectivePercent}%)`:s.agentPercent!=null?`(${s.agentPercent}%)`:"(not set)"}),b===se.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:Ea,onChange:ue=>xr(ue.target.value),disabled:J,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),j.filter(ue=>{const oe=String(ue.role||"").toLowerCase();return oe==="master_agent"||oe==="super_agent"}).map(ue=>{const oe=ue.id;return e.jsx("option",{value:oe,children:String(ue.username||"").toUpperCase()},oe)})]})]},s.id||b)),mt.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",mt.upline[0].isSharedNode&&mt.upline[0].linkedUsername?`${mt.upline[0].username}/${mt.upline[0].linkedUsername}`:mt.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${mt.upline[0].agentPercent==null?"unset":""}`,children:mt.upline[0].agentPercent!=null?`(${mt.upline[0].agentPercent}%)`:"(not set)"})]}),mt.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),mt.downlines.map((s,b)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",b+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",s.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${s.agentPercent==null?"unset":""}`,children:s.agentPercent!=null?`(${s.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${s.status==="active"?"active":"inactive"}`,children:s.status||""})]},s.id||b)),mt.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:Qs,onChange:s=>{pr(s.target.value),ls(null),$a("")}}),e.jsx("button",{className:"btn btn-back",onClick:gr,disabled:Ks,children:Ks?"Calculating...":"Calculate"})]}),Zs&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:Zs}),ba&&e.jsxs("div",{className:"calc-result",children:[!ba.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",ba.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[ba.distributions.map((s,b)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:s.isSharedNode&&s.linkedUsername?`${s.username}/${s.linkedUsername}`:s.username||"—"}),e.jsx("td",{children:s.role?s.role.replace(/_/g," "):"—"}),e.jsx("td",{children:s.effectivePercent!=null?`${s.effectivePercent}%`:s.agentPercent!=null?`${s.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Number(s.amount||0).toFixed(2)]})]},s.id||b)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",ba.distributions.reduce((s,b)=>s+Number(b.amount||0),0).toFixed(2)]})})]})]})]})]})]})]})]}),U==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:de,onChange:s=>De(s.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:Y,onChange:s=>$(s.target.value),children:To.map(s=>e.jsx("option",{value:s.value,children:s.label},s.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:nt(Zt.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Ee?"Funding Wallet":"Available"}),e.jsx("b",{children:nt(Zt.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Ee?"House Money":"Carry"}),e.jsx("b",{className:Ee?Va(Zt.carry):Zt.carry<0?"neg":"",children:nt(Zt.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:nt(Zt.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:K?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):z.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):z.map(s=>{const b=tr(s),se=Ce(s.amount,0),ue=b?0:se,oe=b?se:0,xe=s.balanceAfter,ye=Vs(s),Pe=On(s),Le=zn(s),We=Z.includes(s.id);return e.jsxs("tr",{className:We?"selected":"",onClick:()=>Hr(s.id),children:[e.jsx("td",{children:cn(s.date)}),e.jsx("td",{children:ye}),e.jsx("td",{children:Pe}),e.jsx("td",{children:ue>0?nt(ue):"—"}),e.jsx("td",{children:oe>0?nt(oe):"—"}),e.jsx("td",{className:Tt(xe),children:xe!=null?nt(xe):"—"}),e.jsx("td",{children:Le}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:Qe=>{Qe.stopPropagation(),qr(s.id)},children:"Delete"})})]},s.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:Gr,disabled:Z.length===0,children:"Delete Selected"})]}):U==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:Ze,onChange:s=>$e(s.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:ht?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):He.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):He.map(s=>e.jsxs("tr",{className:Xe===s.key?"selected":"",onClick:()=>St(s.key),children:[e.jsx("td",{children:s.periodLabel}),e.jsx("td",{children:Math.round(Number(s.net||0))})]},s.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:Ir})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:nt(Tr)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:Wa?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:d.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):d.map(s=>e.jsxs("tr",{className:s?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:s.label||"Wager"}),e.jsx("td",{children:Math.round(Number(s.amount||0))})]},s.id))})]})]})]})]}):U==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:It,onChange:s=>vt(s.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.round(Number(ia))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.round(Number(Mr))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:ke?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):X.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):X.map(s=>{const b=Ce(s.amount,0),se=Ce(s.balanceBefore,0),oe=Ce(s.balanceAfter??ia,0)>=se,xe=oe?b:0,ye=oe?0:b,Pe=Ce(s?.balanceAfter??ia,0),Le=Vs(s),We=On(s),Qe=zn(s),qe=st.includes(s.id);return e.jsxs("tr",{className:qe?"selected":"",onClick:()=>Rr(s.id),children:[e.jsx("td",{children:u.username}),e.jsx("td",{children:cn(s.date)}),e.jsx("td",{children:Le}),e.jsx("td",{children:We}),e.jsx("td",{children:xe>0?Math.round(xe):"—"}),e.jsx("td",{children:ye>0?Math.round(ye):"—"}),e.jsx("td",{children:Math.round(Pe)}),e.jsx("td",{children:Qe}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:it=>{it.stopPropagation(),_r(s.id)},children:"Delete"})})]},s.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:Ur,disabled:st.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:Wr,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:r.freePlayPercent,onChange:s=>Me("freePlayPercent",s.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:r.maxFpCredit,onChange:s=>Me("maxFpCredit",s.target.value)})]})]})]})]}):U==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:r.dlMinStraightBet,onChange:s=>Me("dlMinStraightBet",s.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:r.dlMaxStraightBet,onChange:s=>Me("dlMaxStraightBet",s.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:r.dlMaxPerOffering,onChange:s=>Me("dlMaxPerOffering",s.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:r.dlMaxBetPerEvent,onChange:s=>Me("dlMaxBetPerEvent",s.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:r.dlMaxWinSingleBet,onChange:s=>Me("dlMaxWinSingleBet",s.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:r.dlMaxWinEvent,onChange:s=>Me("dlMaxWinEvent",s.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:r.dlDelaySec,onChange:s=>Me("dlDelaySec",s.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:r.dlMaxFavoriteLine,onChange:s=>Me("dlMaxFavoriteLine",s.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:r.dlMaxDogLine,onChange:s=>Me("dlMaxDogLine",s.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:r.dlMinParlayBet,onChange:s=>Me("dlMinParlayBet",s.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:r.dlMaxParlayBet,onChange:s=>Me("dlMaxParlayBet",s.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:r.dlMaxWinEventParlay,onChange:s=>Me("dlMaxWinEventParlay",s.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:r.dlMaxDogLineParlays,onChange:s=>Me("dlMaxDogLineParlays",s.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:r.dlWagerCoolOffSec,onChange:s=>Me("dlWagerCoolOffSec",s.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([s,b])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[s," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!r[b],onChange:se=>Me(b,se.target.checked)}),e.jsx("span",{className:"slider"})]})]},b))})]})]}):U==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:r.casinoDefaultMaxWinDay,onChange:s=>Me("casinoDefaultMaxWinDay",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoAgentMaxWinDay,onChange:s=>Me("casinoAgentMaxWinDay",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoPlayerMaxWinDay,onChange:s=>Me("casinoPlayerMaxWinDay",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:r.casinoDefaultMaxLossDay,onChange:s=>Me("casinoDefaultMaxLossDay",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoAgentMaxLossDay,onChange:s=>Me("casinoAgentMaxLossDay",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoPlayerMaxLossDay,onChange:s=>Me("casinoPlayerMaxLossDay",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:r.casinoDefaultMaxWinWeek,onChange:s=>Me("casinoDefaultMaxWinWeek",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoAgentMaxWinWeek,onChange:s=>Me("casinoAgentMaxWinWeek",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoPlayerMaxWinWeek,onChange:s=>Me("casinoPlayerMaxWinWeek",s.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:r.casinoDefaultMaxLossWeek,onChange:s=>Me("casinoDefaultMaxLossWeek",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoAgentMaxLossWeek,onChange:s=>Me("casinoAgentMaxLossWeek",s.target.value)}),e.jsx("input",{type:"number",value:r.casinoPlayerMaxLossWeek,onChange:s=>Me("casinoPlayerMaxLossWeek",s.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:r.firstName,placeholder:"Enter first name",onChange:s=>br(s.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:r.lastName,placeholder:"Enter last name",onChange:s=>jr(s.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:r.phoneNumber,placeholder:"Enter phone number",onChange:s=>yr(s.target.value),className:vr?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:cs,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${Nr?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(p)?e.jsxs("select",{value:r.agentId,onChange:s=>Me("agentId",s.target.value),children:[e.jsx("option",{value:"",children:"None"}),j.filter(s=>{const b=String(s.role||"").toLowerCase();return b==="master_agent"||b==="super_agent"}).map(s=>{const b=s.id;return e.jsx("option",{value:b,children:s.username},b)})]}):e.jsx("input",{value:u.masterAgentUsername||u.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:r.status,onChange:s=>Me("status",s.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([s,b])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:s}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!r[b],onChange:se=>Me(b,se.target.checked)}),e.jsx("span",{className:"slider"})]})]},b))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:r.accountType,onChange:s=>Me("accountType",s.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:r.minBet,onChange:s=>Me("minBet",s.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:r.wagerLimit,onChange:s=>Me("wagerLimit",s.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:r.creditLimit,onChange:s=>Me("creditLimit",s.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:r.settleLimit,onChange:s=>Me("settleLimit",s.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:r.zeroBalanceWeekly,onChange:s=>Me("zeroBalanceWeekly",s.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:r.tempCredit,onChange:s=>Me("tempCredit",s.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:r.enableCaptcha,onChange:s=>Me("enableCaptcha",s.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:r.cryptoPromoPct,onChange:s=>Me("cryptoPromoPct",s.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:r.promoType,onChange:s=>Me("promoType",s.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:r.expiresOn,onChange:s=>Me("expiresOn",s.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:r.playerNotes,onChange:s=>Me("playerNotes",s.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:u.balance??0,onChange:s=>k(b=>({...b,balance:Number(s.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:Lr,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:r.appsVenmo,onChange:s=>Me("appsVenmo",s.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:r.appsCashapp,onChange:s=>Me("appsCashapp",s.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:r.appsApplePay,onChange:s=>Me("appsApplePay",s.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:r.appsZelle,onChange:s=>Me("appsZelle",s.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:r.appsPaypal,onChange:s=>Me("appsPaypal",s.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:r.appsBtc,onChange:s=>Me("appsBtc",s.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:r.appsOther,onChange:s=>Me("appsOther",s.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",nt(G.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:Tt(G.netProfit||0),children:nt(G.netProfit||0)})]})]})]}),Oe&&e.jsx("div",{className:"modal-overlay",onClick:()=>{P(!1),Ye(!1),Je(!0)},children:e.jsx("div",{className:"modal-card",onClick:s=>s.stopPropagation(),children:ze?(()=>{const s=Na,b=pn,se=va,ue=za(se+(b.balanceDirection==="credit"?s:-s)),oe=b.balanceDirection==="debit",xe=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),ye=Ee?hs:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:xe})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",ye]}),e.jsx("span",{style:{color:bs(se)},children:nt(se)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[b.label," :"]}),e.jsxs("span",{style:{color:bs(ue)},children:[oe?"-":"",nt(s)]})]}),b.value==="deposit"&&!Ee&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:Se?"#166534":"#6b7280"},children:Se?`${Ha.percent}% (${nt(Ha.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",ye]}),e.jsx("span",{style:{color:bs(ue)},children:nt(ue)})]})]}),E&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:E}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Ye(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!xn||dt,onClick:Vr,children:dt?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:le,onChange:s=>{l(s.target.value),s.target.value==="deposit"&&Je(!0),O("")},children:js.map(s=>e.jsx("option",{value:s.value,children:s.label},s.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:q,onChange:s=>{re(s.target.value===""?"":String(Math.round(Number(s.target.value)))),O("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Ee?hs:"Current Balance"}),e.jsx("b",{className:Ee?Va(va):Tt(va),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>re(gs(va)),children:nt(va)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Ee?"Funding Wallet":"Carry"}),e.jsx("b",{className:Tt(Oa),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>re(gs(Oa)),children:nt(Oa)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:he,onChange:s=>we(s.target.value),placeholder:"Optional note"}),pn.value==="deposit"&&!Ee&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:Se,onChange:s=>Je(s.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${Ha.percent}% Freeplay (${nt(Ha.bonusAmount)})`})]}),E&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:E}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{P(!1),Je(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!xn,onClick:()=>{if(!hn){O("Enter a valid amount greater than 0.");return}O(""),Ye(!0)},children:"Next"})]})]})})}),Mt&&e.jsx("div",{className:"modal-overlay",onClick:()=>{kt(!1),Ie(!1)},children:e.jsx("div",{className:"modal-card",onClick:s=>s.stopPropagation(),children:ve?(()=>{const s=ys,b=Fr,se=ia,ue=za(se+(b?-s:s)),oe=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:oe})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:mn(se)},children:nt(se)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[b?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:b?"#dc2626":"#1f2937"},children:[b?"-":"",nt(s)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:mn(ue)},children:nt(ue)})]})]}),Ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:Ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Ie(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!fn,onClick:$r,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:Nt==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:Nt==="withdraw"?"#fee2e2":void 0,color:Nt==="withdraw"?"#dc2626":void 0},children:Nt==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:$t,onChange:s=>{Rt(s.target.value===""?"":String(Math.round(Number(s.target.value)))),Te("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:Tt(ia),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>Rt(gs(ia)),children:nt(ia)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:V,onChange:s=>ce(s.target.value),placeholder:"Optional note"}),Ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:Ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>kt(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!fn,onClick:()=>{if(!gn){Te("Enter a valid free play amount greater than 0.");return}Te(""),Ie(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
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
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}const Go=["dashboard","weekly-figures","customer-admin","add-customer","cashier","settings","profile"];function Zo({onExit:a,role:n="admin"}){const[i,p]=t.useState("dashboard"),[g,x]=t.useState(null),[v,w]=t.useState(null),[f,B]=t.useState("tiles"),[h,N]=t.useState(window.innerWidth<=768),[m,u]=t.useState(null),[k,G]=t.useState(n),[D,F]=t.useState(!1),[C,j]=t.useState("Admin");t.useEffect(()=>{(async()=>{try{const ae=localStorage.getItem("token");if(ae){const z=await zt(ae);z&&(z.dashboardLayout&&B(z.dashboardLayout),u(z.permissions||null),z.role&&G(z.role))}}catch(ae){console.error("Failed to fetch layout pref",ae)}})()},[]),t.useEffect(()=>{const U=()=>{N(window.innerWidth<=768)};return window.addEventListener("resize",U),()=>window.removeEventListener("resize",U)},[]);const W=(U,ae=null,z=null)=>{const y=U==="transactions-history"?"transaction-history":U;if(!Ta(k,m,y))return;const K=typeof ae=="string"||typeof ae=="number"?String(ae):null,c=z&&typeof z=="object"?z:ae&&typeof ae=="object"&&!Array.isArray(ae)?ae:null;p(y),w(c),K?x(K):y!=="user-details"&&x(null)};t.useEffect(()=>{if(!Ta(k,m,i)){const U=Go.find(ae=>Ta(k,m,ae))||"dashboard";p(U)}},[i,m,k]);const r=()=>{a()},M=async U=>{try{const ae=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ae||!U)return;const z=sessionStorage.getItem("impersonationBaseToken"),y=z||ae;if(!z){const E=await zt(ae),O=String(E?.role||n||"admin").toLowerCase(),_=O==="master_agent"?"Master Agent":O==="super_agent"?"Super Agent":O==="agent"?"Agent":"Admin";sessionStorage.setItem("impersonationBaseToken",ae),sessionStorage.setItem("impersonationBaseRole",O),sessionStorage.setItem("impersonationBaseUsername",String(E?.username||_)),sessionStorage.setItem("impersonationBaseId",String(E?.id||""))}const K=await Xn(U,y);if(!K?.token)return;if(localStorage.setItem("token",K.token),sessionStorage.setItem("token",K.token),K.role&&localStorage.setItem("userRole",K.role),K.username&&K.role){const E=K.role==="admin"?"admin":K.role==="super_agent"||K.role==="master_agent"?"super_agent":"agent";sessionStorage.setItem(`${E}Username`,K.username)}sessionStorage.removeItem("postSwitchAdminView");const c=K.role==="admin"?"admin":K.role==="super_agent"||K.role==="master_agent"?"super_agent":"agent";window.location.href=`/${c}/dashboard`}catch(ae){console.error("Context switch failed:",ae),alert(ae.message||"Failed to switch context")}},T=()=>{const U=sessionStorage.getItem("impersonationBaseToken");if(!U)return;localStorage.setItem("token",U),sessionStorage.setItem("token",U);const ae=sessionStorage.getItem("impersonationBaseRole");ae&&localStorage.setItem("userRole",ae),sessionStorage.removeItem("impersonationBaseToken"),sessionStorage.removeItem("impersonationBaseRole"),sessionStorage.removeItem("impersonationBaseUsername"),sessionStorage.removeItem("impersonationBaseId"),sessionStorage.removeItem("postSwitchAdminView");const z=ae==="admin"?"admin":ae==="super_agent"||ae==="master_agent"?"super_agent":"agent";window.location.href=`/${z}/dashboard`};t.useEffect(()=>{const U=sessionStorage.getItem("impersonationBaseRole"),ae=sessionStorage.getItem("impersonationBaseUsername");if(!U){j("Admin");return}const z=U==="master_agent"?"Master Agent":U==="super_agent"?"Super Agent":U==="agent"?"Agent":"Admin";j(ae?`${z} (${String(ae).toUpperCase()})`:z)},[]);const o=()=>{switch(i){case"dashboard":return e.jsx(yn,{onMenuClick:W,onOpenScoreboard:()=>F(!0),onSwitchContext:M,role:k,layoutPref:f,isMobile:h,permissions:m});case"user-details":return e.jsx(Ho,{userId:g,onBack:()=>p("customer-admin"),onNavigateToUser:U=>W("user-details",U),role:k,viewContext:v});case"weekly-figures":return e.jsx(Ll,{onViewChange:W,viewContext:v});case"pending":return e.jsx(Dl,{});case"messaging":return e.jsx(Tl,{});case"game-admin":return e.jsx(Il,{});case"casino-bets":return e.jsx(Ml,{});case"customer-admin":return e.jsx(Fl,{onViewChange:W});case"cashier":return e.jsx(_l,{});case"add-customer":return e.jsx(Zl,{onBack:()=>p("customer-admin")});case"third-party-limits":return e.jsx(Xl,{});case"props":return e.jsx(eo,{});case"agent-performance":return e.jsx(to,{});case"analysis":return e.jsx(ao,{});case"ip-tracker":return e.jsx(so,{canManage:xl(k,m)});case"transaction-history":case"transactions-history":return e.jsx(xo,{viewContext:v});case"deleted-wagers":return e.jsx(go,{});case"games-events":return e.jsx(fo,{});case"sportsbook-links":return e.jsx(bo,{});case"bet-ticker":return e.jsx(jo,{});case"ticketwriter":return e.jsx(yo,{});case"scores":return e.jsx(vo,{});case"agent-admin":return e.jsx(En,{});case"agent-manager":return e.jsx(No,{});case"master-agent-admin":return e.jsx(En,{});case"billing":return e.jsx(wo,{});case"settings":return e.jsx(So,{});case"profile":return e.jsx(Do,{});case"rules":return e.jsx(ko,{});case"feedback":return e.jsx(Co,{});case"faq":return e.jsx(Ao,{});case"user-manual":return e.jsx(Po,{});case"monitor":return e.jsx(Lo,{});default:return e.jsx(yn,{onMenuClick:W,onOpenScoreboard:()=>F(!0),onSwitchContext:M,role:k,permissions:m})}};return e.jsxs("div",{className:`admin-panel ${i==="dashboard"?"dashboard-home-active":""}`,children:[e.jsx(Cl,{onLogout:r,onViewChange:W,onSwitchContext:M,onRestoreBaseContext:T,canRestoreBaseContext:!!sessionStorage.getItem("impersonationBaseToken"),baseContextLabel:C,role:k,showStats:i==="dashboard"}),e.jsxs("div",{className:"admin-container",children:[!h&&e.jsx(Al,{activeView:i,onViewChange:W,onOpenScoreboard:()=>F(!0),isOpen:!1,onRequestClose:()=>{},role:k,permissions:m}),e.jsx("div",{className:`admin-content ${i==="dashboard"?"dashboard-view":""}`,children:e.jsx(pl,{children:o()})})]}),D&&e.jsx(hl,{onClose:()=>F(!1)})]})}export{Zo as default};
