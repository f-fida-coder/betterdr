import{b as i,j as e}from"./vendor-common-DIOJvOBD.js";import{x as Re,v as Ie,au as Ve}from"./app-api-cBMp4bNH.js";import{M as Ye,N as He}from"./utils-shared-BBo0af7e.js";const fe=[{value:"player-transactions",label:"Player Transactions"},{value:"agent-transactions",label:"Agent Transactions"},{value:"deleted-transactions",label:"Deleted Transactions"},{value:"free-play-transactions",label:"Free Play Transactions"},{value:"free-play-analysis",label:"Free Play Analysis"},{value:"player-summary",label:"Player Summary"}],be=[{value:"all-types",label:"Transactions Type"},{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdrawal"},{value:"adjustment",label:"Adjustment"},{value:"wager",label:"Wager"},{value:"payout",label:"Payout"},{value:"casino",label:"Casino"},{value:"fp_deposit",label:"Free Play"}],w=r=>String(r||"").trim().toLowerCase(),We=new Set(["bet_placed","bet_placed_admin","bet_lost","casino_bet_debit"]),Ge=new Set(["bet_won","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),qe=new Set(["adjustment","credit_adj","debit_adj"]),Xe=new Set(["withdrawal","bet_placed","bet_placed_admin","bet_lost","fee","debit","casino_bet_debit"]),Je=new Set(["freeplay_adjustment","deposit_freeplay_bonus","referral_freeplay_bonus","new_player_freeplay_bonus"]),Ke=(r,o)=>{const l=w(o);if(!l||l==="all-types")return!0;const h=w(r?.type),x=w(r?.reason);return h===l?!0:l==="adjustment"?qe.has(h):l==="wager"?We.has(h):l==="payout"?Ge.has(h):l==="casino"?h.startsWith("casino_"):l==="fp_deposit"?h==="fp_deposit"||Je.has(x):!1},Qe=(r,o)=>{if(!Array.isArray(r))return[];const l=Array.isArray(o)?o.map(h=>w(h)).filter(Boolean):[];return l.length===0||l.includes("all-types")?r:r.filter(h=>l.some(x=>Ke(h,x)))},J=r=>{const o=Number(r?.signedAmount);if(Number.isFinite(o)&&o!==0)return o;const l=Number(r?.amount||0);if(!Number.isFinite(l))return 0;if(l<0)return l;const h=String(r?.entrySide||"").trim().toUpperCase();if(h==="DEBIT")return-Math.abs(l);if(h==="CREDIT")return Math.abs(l);const x=Number(r?.balanceBefore),m=Number(r?.balanceAfter);if(Number.isFinite(x)&&Number.isFinite(m)&&x!==m)return m<x?-Math.abs(l):Math.abs(l);const y=w(r?.type);return Xe.has(y)||He(r)?-Math.abs(l):Math.abs(l)},ye=r=>r.reduce((o,l)=>{const h=J(l),x=Math.abs(h);return o.count+=1,o.grossAmount+=x,o.netAmount+=h,h>=0?o.creditAmount+=h:o.debitAmount+=x,o},{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),je=r=>{const o=new Date(r),l=o.getFullYear(),h=String(o.getMonth()+1).padStart(2,"0"),x=String(o.getDate()).padStart(2,"0");return`${l}-${h}-${x}`},p=r=>{const o=Number(r||0);return Number.isNaN(o)?"0":Math.round(o).toLocaleString("en-US")},X=r=>{if(!r)return"—";const o=new Date(r);return Number.isNaN(o.getTime())?"—":o.toLocaleString()},Ze=new Set(["admin","agent","master_agent","super_agent"]),et=r=>{const o=new Set,l=[],h=x=>{if(!x||typeof x!="object")return;const m=String(x.id||"").trim(),y=String(x.username||"").trim(),b=String(x.role||"").trim().toLowerCase();m&&y&&Ze.has(b)&&!o.has(m)&&(o.add(m),l.push({id:m,username:y,role:b})),(Array.isArray(x.children)?x.children:[]).forEach(h)};return r?.root?h({...r.root,children:Array.isArray(r?.tree)?r.tree:[]}):Array.isArray(r?.tree)&&r.tree.forEach(h),l},tt=r=>{if(!Array.isArray(r))return[];const o=new Set,l=[];return r.forEach(h=>{const x=String(h?.id||"").trim(),m=String(h?.username||"").trim();if(!x||!m||o.has(x))return;o.add(x);const y=String(h?.fullName||`${String(h?.firstName||"").trim()} ${String(h?.lastName||"").trim()}`).trim();l.push({id:x,username:m,fullName:y})}),l};function rt({viewContext:r}){const o=i.useMemo(()=>je(new Date),[]),l=i.useMemo(()=>{const t=new Date;return t.setDate(t.getDate()-7),je(t)},[]),[h,x]=i.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[m,y]=i.useState(""),[b,F]=i.useState(""),[$,R]=i.useState(r?.enteredBy||""),[I,K]=i.useState(["deposit","withdrawal"]),[C,D]=i.useState(!1),[V,we]=i.useState("player-transactions"),[Q,Ne]=i.useState(l),[Z,Se]=i.useState(o),[u,ve]=i.useState([]),[B,Te]=i.useState({count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),[ee,Ae]=i.useState("transactions"),[te,ze]=i.useState(be),[Y,H]=i.useState(!0),[W,P]=i.useState(""),[ke,Ee]=i.useState(!1),[se,S]=i.useState(!1),[O,v]=i.useState(!1),[ae,T]=i.useState(!1),[E,ne]=i.useState([]),[re,_e]=i.useState([]),[ie,_]=i.useState([]),[Me,M]=i.useState(!1),le=i.useRef(new Map);i.useEffect(()=>{const t=()=>x(window.innerWidth<=768);return window.addEventListener("resize",t),()=>window.removeEventListener("resize",t)},[]),i.useEffect(()=>{let t=!0;const s=localStorage.getItem("token");return s?((async()=>{try{const a=await Ie(s);if(!t)return;ne(et(a))}catch(a){console.error("Failed to fetch agent suggestions:",a),t&&ne([])}})(),()=>{t=!1}):void 0},[]);const oe=i.useMemo(()=>{const t=m.trim().toLowerCase();return(t===""?E:E.filter(n=>String(n.username||"").toLowerCase().includes(t)||String(n.role||"").replace(/_/g," ").includes(t))).slice(0,12)},[E,m]),ce=i.useMemo(()=>{const t=$.trim().toLowerCase(),s=new Set,n=[],a=(d,g=null)=>{const j=String(d||"").trim();if(!j)return;const N=j.toLowerCase();s.has(N)||(s.add(N),n.push({id:N,username:j,role:g}))};return re.forEach(d=>{a(d?.value||d?.username,d?.role||null)}),u.forEach(d=>{a(d?.actorUsername||d?.enteredBy,d?.actorRole||null)}),E.forEach(d=>{a(d?.username,d?.role||null)}),a("HOUSE","admin"),(t===""?n:n.filter(d=>d.username.toLowerCase().includes(t))).slice(0,12)},[re,$,u,E]),de=i.useMemo(()=>{const t=new Set,s=[];return u.forEach(n=>{const a=String(n?.playerUsername||"").trim();if(!a)return;const c=a.toLowerCase();t.has(c)||(t.add(c),s.push({id:c,username:a,fullName:String(n?.playerName||"").trim()}))}),s.slice(0,12)},[u]);i.useEffect(()=>{if(!O)return;const t=localStorage.getItem("token");if(!t){_([]),M(!1);return}const s=b.trim();if(s===""){_([]),M(!1);return}const n=s.toLowerCase(),a=le.current.get(n);if(a){_(a),M(!1);return}let c=!1;M(!0);const d=window.setTimeout(async()=>{try{const g=await Re(t,{q:s});if(c)return;const j=tt(g).slice(0,12);le.current.set(n,j),_(j)}catch(g){console.error("Failed to fetch player suggestions:",g),c||_([])}finally{c||M(!1)}},220);return()=>{c=!0,window.clearTimeout(d)}},[b,O]);const he=i.useMemo(()=>b.trim()===""?de:ie,[b,de,ie]),xe=i.useMemo(()=>te.map(t=>({value:w(t?.value),label:String(t?.label||t?.value||"").trim()})).filter(t=>t.value&&t.label),[te]),U=i.useMemo(()=>xe.filter(t=>t.value!=="all-types"),[xe]),A=i.useMemo(()=>U.map(t=>t.value),[U]),z=i.useMemo(()=>{if(I.includes("all-types"))return["all-types"];const t=new Set(A),s=I.map(n=>w(n)).filter(n=>t.has(n));return s.length>0?s:["all-types"]},[I,A]),$e=t=>{const s=String(t||"").toLowerCase();return s==="master_agent"?"MASTER":s==="super_agent"?"SUPER":s==="admin"?"ADMIN":"AGENT"},k=async(t={})=>{const s=localStorage.getItem("token");if(!s){P("Please login to view transaction history."),H(!1);return}const n=t.mode!==void 0?t.mode:V,a=t.startDate!==void 0?t.startDate:Q,c=t.endDate!==void 0?t.endDate:Z,d=t.selectedTypeValues!==void 0?t.selectedTypeValues:z,g=t.agentsSearch!==void 0?t.agentsSearch:m,j=t.playersSearch!==void 0?t.playersSearch:b,N=t.enteredBySearch!==void 0?t.enteredBySearch:$;if(a&&c&&a>c){P("Start date cannot be after end date.");return}try{H(!0),P("");const L=d.length===1?d[0]:"all-types",Fe=g.trim()!==""||j.trim()!==""||N.trim()!=="",pe={mode:n,agents:g,players:j,transactionType:L,startDate:a,endDate:c,limit:Fe?1e3:700};N.trim()!==""&&(pe.enteredBy=N.trim());const f=await Ve(pe,s),ue=Array.isArray(f?.rows)?f.rows:Array.isArray(f?.transactions)?f.transactions:[],G=String(f?.resultType||"transactions"),me=G==="transactions"&&d.length>1&&!d.includes("all-types"),q=me?Qe(ue,d):ue;ve(q),Ae(G),Te(G==="transactions"?me?ye(q):f?.summary||ye(q):f?.summary||{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0});const ge=Array.isArray(f?.meta?.transactionTypes)?f.meta.transactionTypes:[];ze(ge.length>0?ge:be),_e(Array.isArray(f?.meta?.enteredByOptions)?f.meta.enteredByOptions:[]),Ee(!0)}catch(L){console.error("Failed to load transaction history:",L),P(L.message||"Failed to load transaction history")}finally{H(!1)}};i.useEffect(()=>{r?.enteredBy?(R(r.enteredBy),k({enteredBySearch:r.enteredBy})):k()},[]);const Ce=t=>{t.preventDefault(),D(!1),k()},De=t=>{const s=w(t);if(s){if(s==="all-types"||A.length===0){K(["all-types"]),k({selectedTypeValues:["all-types"]});return}K(n=>{const a=n.includes("all-types")?[...A]:n.map(g=>w(g)).filter(g=>A.includes(g)),c=a.includes(s)?a.filter(g=>g!==s):[...a,s],d=c.length===0||c.length===A.length?["all-types"]:c;return k({selectedTypeValues:d}),d})}},Be=fe.find(t=>t.value===V)?.label||"Transaction History",Pe=(t,s)=>{const n=t!==0?t:Number(s||0),a=p(Math.abs(n));return n>=0?`+$${a}`:`-$${a}`},Oe=()=>{const t=u.reduce((s,n)=>s+J(n),0);return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Total: ",e.jsxs("span",{className:t<0?"negative":"txh-total-green",children:["$",p(Math.abs(t))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-transactions",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Entered By"})]})}),e.jsxs("tbody",{children:[u.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,className:"txh-empty-cell",children:"No transactions matched these filters."})}):u.map((s,n)=>{const a=J(s),c=a>=0;return e.jsxs("tr",{className:n%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-date",children:X(s.date)}),e.jsx("td",{className:"txh-col-user",children:String(s.agentUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(s.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-type",children:Ye(s)}),e.jsx("td",{className:"txh-col-desc",children:s.description||s.reason||"—"}),e.jsx("td",{className:`txh-col-amount ${c?"txh-credit":"txh-debit"}`,children:Pe(a,s.amount)}),e.jsx("td",{className:"txh-col-user",children:String(s.actorUsername||s.enteredBy||"HOUSE").toUpperCase()})]},`${String(s.id||s.transactionId||"tx")}-${n}`)}),u.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:5,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:`txh-col-amount ${t>=0?"txh-credit":"txh-debit"}`,children:e.jsxs("strong",{children:[t>=0?"+":"-","$",p(Math.abs(t))]})}),e.jsx("td",{})]})]})]})})]})},Ue=()=>{const t=u.reduce((a,c)=>a+Number(c.creditAmount||0),0),s=u.reduce((a,c)=>a+Number(c.debitAmount||0),0),n=t-s;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net Free Play: ",e.jsxs("span",{className:n<0?"negative":"txh-total-green",children:["$",p(Math.abs(n))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-analysis",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Free Play Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[u.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"txh-empty-cell",children:"No free play analysis data found."})}):u.map((a,c)=>{const d=Number(a.netAmount||0);return e.jsxs("tr",{className:c%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(a.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(a.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(a.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",p(a.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",p(a.debitAmount)]}),e.jsxs("td",{className:d<0?"txh-debit":"txh-credit",children:[d>=0?"+":"-","$",p(Math.abs(d))]}),e.jsxs("td",{children:["$",p(a.currentFreeplayBalance)]}),e.jsx("td",{className:"txh-col-date",children:X(a.lastTransactionAt)})]},`${String(a.playerId||a.playerUsername||"fp")}-${c}`)}),u.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",p(t)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",p(s)]})}),e.jsx("td",{className:n<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[n>=0?"+":"-","$",p(Math.abs(n))]})}),e.jsx("td",{colSpan:2})]})]})]})})]})},Le=()=>{const t=u.reduce((a,c)=>a+Number(c.creditAmount||0),0),s=u.reduce((a,c)=>a+Number(c.debitAmount||0),0),n=t-s;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net: ",e.jsxs("span",{className:n<0?"negative":"txh-total-green",children:["$",p(Math.abs(n))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-summary",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Wagered"}),e.jsx("th",{children:"Payout"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[u.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:10,className:"txh-empty-cell",children:"No player summary data found."})}):u.map((a,c)=>{const d=Number(a.netAmount||0);return e.jsxs("tr",{className:c%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(a.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(a.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(a.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",p(a.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",p(a.debitAmount)]}),e.jsxs("td",{className:d<0?"txh-debit":"txh-credit",children:[d>=0?"+":"-","$",p(Math.abs(d))]}),e.jsxs("td",{children:["$",p(a.wagerAmount)]}),e.jsxs("td",{children:["$",p(a.payoutAmount)]}),e.jsxs("td",{children:["$",p(a.currentBalance)]}),e.jsx("td",{className:"txh-col-date",children:X(a.lastTransactionAt)})]},`${String(a.playerId||a.playerUsername||"summary")}-${c}`)}),u.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",p(t)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",p(s)]})}),e.jsx("td",{className:n<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[n>=0?"+":"-","$",p(Math.abs(n))]})}),e.jsx("td",{colSpan:4})]})]})]})})]})};return e.jsxs("div",{className:"admin-view txh-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Transaction History"})}),e.jsxs("div",{className:"view-content txh-content",children:[e.jsxs("form",{className:"txh-filter-panel",onSubmit:Ce,children:[e.jsxs("div",{className:`txh-search-row${se?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Agents"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:m,onChange:t=>{y(t.target.value),S(!0)},onFocus:()=>{S(!0),v(!1),T(!1)},onBlur:()=>setTimeout(()=>S(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),se&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Agent suggestions",children:oe.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching agents"}):oe.map(t=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:s=>{s.preventDefault(),y(String(t.username||"")),S(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(t.username||"").toUpperCase()}),e.jsx("span",{className:`txh-agent-badge role-${String(t.role||"agent").replace(/_/g,"-")}`,children:$e(t.role)})]},t.id))})]})]}),e.jsxs("div",{className:`txh-search-row${O?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Players"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:b,onChange:t=>{F(t.target.value),v(!0)},onFocus:()=>{v(!0),S(!1),T(!1)},onBlur:()=>setTimeout(()=>v(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),O&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Player suggestions",children:Me?e.jsx("div",{className:"txh-suggest-empty",children:"Loading players..."}):he.length===0?e.jsx("div",{className:"txh-suggest-empty",children:b.trim()===""?"Type to search players":"No matching players"}):he.map(t=>e.jsxs("button",{type:"button",className:"txh-suggest-item txh-suggest-item-player",onMouseDown:s=>{s.preventDefault(),F(String(t.username||"")),v(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(t.username||"").toUpperCase()}),e.jsx("span",{className:"txh-suggest-meta",children:t.fullName||"Player account"})]},t.id))})]})]}),e.jsxs("div",{className:`txh-search-row${ae?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Entered By"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:$,onChange:t=>{R(t.target.value),T(!0)},onFocus:()=>{T(!0),S(!1),v(!1)},onBlur:()=>setTimeout(()=>T(!1),120),placeholder:"Search who entered the transaction...",className:"txh-search-input",autoComplete:"off"}),ae&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Entered by suggestions",children:ce.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching users"}):ce.map(t=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:s=>{s.preventDefault(),R(String(t.username||"")),T(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(t.username||"").toUpperCase()}),t.role&&e.jsx("span",{className:`txh-agent-badge role-${String(t.role||"agent").replace(/_/g,"-")}`,children:t.role==="master_agent"?"MASTER":t.role==="super_agent"?"SUPER":t.role==="admin"?"ADMIN":"AGENT"})]},t.id))})]})]}),e.jsx("div",{className:"txh-filter-help",children:'Use "Entered By" to filter the person or house account that posted the transaction.'}),e.jsxs("div",{className:"txh-select-row",children:[e.jsxs("div",{className:"txh-type-filter-wrap",children:[e.jsxs("button",{type:"button",className:`txh-type-select txh-type-trigger${C?" open":""}`,onClick:()=>D(t=>!t),"aria-expanded":C,"aria-haspopup":"menu","aria-label":"Transactions type",children:[e.jsx("span",{children:z.includes("all-types")?"All Types":`${z.length} Type${z.length!==1?"s":""}`}),e.jsx("i",{className:`fa-solid fa-chevron-${C?"up":"down"}`,"aria-hidden":"true"})]}),C&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"txh-type-backdrop",onClick:()=>D(!1),"aria-label":"Close transaction type filters"}),e.jsx("div",{className:"txh-type-menu",role:"menu","aria-label":"Transaction type filters",children:U.length===0?e.jsx("div",{className:"txh-type-empty",children:"No transaction types available."}):U.map(t=>{const s=z.includes("all-types")||z.includes(t.value);return e.jsxs("label",{className:"txh-type-toggle-row",children:[e.jsx("span",{children:t.label}),e.jsxs("span",{className:"txh-switch",children:[e.jsx("input",{type:"checkbox",checked:s,onChange:()=>De(t.value)}),e.jsx("span",{className:"txh-switch-slider"})]})]},t.value)})})]})]}),e.jsx("select",{value:V,onChange:t=>{const s=t.target.value;we(s),D(!1),k({mode:s})},className:"txh-mode-select","aria-label":"Report mode",children:fe.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:Q,onChange:t=>Ne(t.target.value),className:"txh-date-input","aria-label":"Start date"})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:Z,onChange:t=>Se(t.target.value),className:"txh-date-input","aria-label":"End date"})]}),e.jsx("button",{type:"submit",className:"txh-search-btn","aria-label":"Search",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})})]}),e.jsxs("div",{className:"txh-result-head",children:[e.jsx("h3",{children:Be}),e.jsxs("div",{className:"txh-summary-inline",children:[e.jsxs("span",{children:[Number(B.count||0)," Rows"]}),e.jsxs("span",{className:Number(B.netAmount||0)<0?"negative":"positive",children:["Net: ",p(B.netAmount)]}),e.jsxs("span",{children:["Gross: ",p(B.grossAmount)]})]})]}),Y&&e.jsx("div",{className:"txh-empty",children:"Loading transaction history..."}),!Y&&W&&e.jsx("div",{className:"txh-empty txh-error",children:W}),!Y&&!W&&ke&&(ee==="analysis"?Ue():ee==="summary"?Le():Oe())]}),e.jsx("style",{children:`
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
      `})]})}export{rt as default};
