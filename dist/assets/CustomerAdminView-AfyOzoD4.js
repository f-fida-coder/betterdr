import{r as o,j as e,R as Nt,g as kt,e as St,f as qe,c as Ct,Y as ge,Z as E,$ as W,a0 as he,a1 as It,a2 as Bt,a3 as xe,a4 as fe}from"./index-vZr0KL47.js";import{a as Lt}from"./AdminPanel-BIVOuVjA.js";import{t as y,g as be}from"./money-xNUUPuCg.js";const ye=(I,S)=>String(I||"").localeCompare(String(S||""),void 0,{sensitivity:"base",numeric:!0}),At=new Set(["admin","agent","master_agent","super_agent"]),we=I=>{const S=String(I||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!S)return"";const h=S.match(/^[A-Z]+/);return h&&h[0]?h[0]:S.replace(/\d+$/,"")||S},Qe=I=>!At.has(String(I?.role||"").trim().toLowerCase());function Zt({onViewChange:I}){const[S,h]=o.useState([]),[_,te]=o.useState([]),[je,ve]=o.useState(!0),[Ne,p]=o.useState(""),[H,Pt]=o.useState(null),[B,b]=o.useState(null),[Ge,Et]=o.useState(!1),[$t,Ut]=o.useState(!1),[Mt,Ot]=o.useState(null),[Dt,Rt]=o.useState(""),[ke,Tt]=o.useState(""),[P,zt]=o.useState([]),[ae,Ze]=o.useState(!1),[Ft,Wt]=o.useState(!0),[x,L]=o.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:""}),[C,_t]=o.useState("player"),[m,Xe]=o.useState("admin"),[Je,Ke]=o.useState(!1),[et,ne]=o.useState(!1),[f,tt]=o.useState(null),[d,w]=o.useState({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"0",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),[at,re]=o.useState(!1),[$,Se]=o.useState({customerId:null,username:"",currentBalance:0,nextBalance:""}),[v,nt]=o.useState(""),[R,se]=o.useState(""),[rt,V]=o.useState(!1),[ie,Ce]=o.useState({}),[st,Ie]=o.useState(null),[it,le]=o.useState(null),[lt,oe]=o.useState({}),[Y,de]=o.useState(""),[ot,T]=o.useState(!1),[U,Be]=o.useState(""),[z,Le]=o.useState(""),[Ht,Vt]=o.useState(!1),[Yt,Ae]=o.useState(""),[u,q]=o.useState({open:!1,type:"",customerId:null,username:"",value:""}),[Q,dt]=o.useState(""),[Pe,ct]=o.useState("");o.useEffect(()=>{(async()=>{try{ve(!0);const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!n){h([]),p("Please login to load users.");return}const a=String(localStorage.getItem("userRole")||"").toLowerCase();let r=null;try{r=await kt(n,{timeoutMs:3e4})}catch(i){console.warn("CustomerAdminView: getMe failed, falling back to stored role.",i)}const s=String(r?.role||a||"admin").toLowerCase();if(Xe(s),dt(r?.username||""),ct(r?.id||""),Ke(!!r?.viewOnly),s==="agent"){const[i,l]=await Promise.all([St(n),qe(n).catch(()=>[])]);h(i||[]),te(l||[])}else{const[i,l]=await Promise.all([Ct(n),qe(n)]);h(i||[]),te(l||[])}if(p(""),r?.username)try{const i=we(r.username);if(!i)return;const{nextUsername:l}=await ge(i,n,{type:"player"});L(c=>({...c,username:l}))}catch(i){console.error("Failed to prefetch next username:",i)}}catch(n){console.error("Error fetching users:",n),p("Failed to load users: "+n.message)}finally{ve(!1)}})()},[]);const pt=async t=>{const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!n)return;L(s=>({...s,agentId:t,referredByUserId:""}));const a=C==="player"?"player":"agent",r=C==="super_agent"?"MA":"";if(t){const s=_.find(i=>i.id===t);if(s){Le(s.username||"");try{const i=we(s.username);if(!i){L(g=>({...g,username:""}));return}const l=a==="player"?{suffix:r,type:a,agentId:t}:{suffix:r,type:a,...C==="agent"?{agentId:t}:{}},{nextUsername:c}=await ge(i,n,l);L(g=>({...g,username:c,agentPrefix:i}))}catch(i){console.error("Failed to get next username:",i)}}}else if(Le(""),Q)try{const s=we(Q);if(!s){L(c=>({...c,username:""}));return}const i={suffix:r,type:a};a==="agent"&&C==="agent"&&(m==="master_agent"||m==="super_agent")&&Pe&&(i.agentId=Pe);const{nextUsername:l}=await ge(s,n,i);L(c=>({...c,username:l,agentPrefix:s}))}catch(s){console.error("Failed to fetch username for admin:",s),L(i=>({...i,username:""}))}else L(s=>({...s,username:""}))},M=t=>{if(t==null||t==="")return"—";const n=y(t,NaN);return Number.isNaN(n)?"—":`$${Math.round(n).toLocaleString("en-US")}`};!Je&&!Ge&&String(x.username||"").trim()&&String(x.firstName||"").trim()&&String(x.lastName||"").trim()&&String(x.phoneNumber||"").trim()&&String(x.password||"").trim()&&(C!=="player"||String(x.minBet??"").trim()!==""&&String(x.maxBet??"").trim()!==""&&String(x.creditLimit??"").trim()!==""&&String(x.balanceOwed??"").trim());const ut=t=>{const n=y(t.balance,0);Se({customerId:t.id,username:t.username,currentBalance:n,nextBalance:`${n}`}),re(!0),p("")},mt=async t=>{t.preventDefault();const{customerId:n,nextBalance:a}=$,r=Number(a);if(Number.isNaN(r)||r<0){p("Balance must be a non-negative number.");return}try{const s=localStorage.getItem("token")||sessionStorage.getItem("token");if(!s){p("Please login to update balance.");return}b(n),m==="agent"?await xe(n,r,s):await fe(n,{balance:r},s),h(i=>i.map(l=>l.id===n?{...l,balance:r,availableBalance:Math.max(0,r-y(l.pendingBalance,0))}:l)),re(!1),p("")}catch(s){console.error("Balance update failed:",s),p(s.message||"Failed to update balance")}finally{b(null)}},Ee=t=>{const n=t.id,a={sports:t.settings?.sports??!0,casino:t.settings?.casino??!0,racebook:t.settings?.racebook??!0};return ie[n]||a},ce=(t,n)=>{const a=t.id,r=Ee(t);Ce(s=>({...s,[a]:{...r,[n]:!r[n]}}))},gt=async t=>{const n=t.id,a=ie[n];if(a)try{const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(!r)return;b(n);const s={settings:{...t.settings||{},sports:!!a.sports,casino:!!a.casino,racebook:!!a.racebook}};m==="agent"?await E(n,s,r):await W(n,s,r),h(i=>i.map(l=>l.id===n?{...l,settings:s.settings}:l)),Ce(i=>{const l={...i};return delete l[n],l}),p("")}catch(r){console.error("Addon save failed:",r),p(r.message||"Failed to save add-ons")}finally{b(null)}},ht=async t=>{const n=t.id,a=window.prompt(`Enter new password for ${t.username}:`,"");if(a===null)return;const r=a.toUpperCase();if(r.length<6){alert("Password must be at least 6 characters long");return}try{const s=localStorage.getItem("token")||sessionStorage.getItem("token");if(!s){p("Please login to reset password.");return}b(n),await he(n,r,s),h(i=>i.map(l=>l.id===n?{...l,displayPassword:r}:l)),alert(`Password for ${t.username} has been reset successfully.`),p("")}catch(s){console.error("Password reset failed:",s),p(s.message||"Failed to reset password")}finally{b(null)}},$e=t=>{tt(t),w({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),ne(!0)},xt=async t=>{t.preventDefault();const n=f.id;try{const a=localStorage.getItem("token")||sessionStorage.getItem("token"),r={};d.phoneNumber.trim()&&(r.phoneNumber=d.phoneNumber.trim()),d.firstName.trim()&&(r.firstName=d.firstName.trim()),d.lastName.trim()&&(r.lastName=d.lastName.trim()),d.fullName.trim()&&(r.fullName=d.fullName.trim()),d.password.trim()&&(r.password=d.password.trim()),d.minBet!==""&&(r.minBet=Number(d.minBet)),d.maxBet!==""&&(r.maxBet=Number(d.maxBet)),d.creditLimit!==""&&(r.creditLimit=Number(d.creditLimit)),d.balanceOwed!==""&&(r.balanceOwed=Number(d.balanceOwed));const s=Object.entries(d.apps||{}).filter(([,i])=>(i||"").trim()!=="");if(s.length>0&&(r.apps=Object.fromEntries(s.map(([i,l])=>[i,l.trim()]))),Object.keys(r).length===0){p("Enter at least one value before saving.");return}m==="agent"?await E(n,r,a):await W(n,r,a),h(i=>i.map(l=>l.id===n?{...l,...r}:l)),ne(!1),p("")}catch(a){console.error("Update customer failed:",a),p(a.message||"Failed to update customer")}},N=o.useMemo(()=>_.filter(t=>m==="admin"||m==="super_agent"||m==="master_agent"),[_,m]);o.useEffect(()=>{if(C!=="player")return;const t=String(z||"").trim().toLowerCase();if(!t)return;const n=N.find(r=>String(r.username||"").trim().toLowerCase()===t);if(!n)return;const a=String(n.id||"");a&&String(x.agentId||"")!==a&&pt(a)},[z,N,C,x.agentId]);const k=t=>{if(!t)return"";if(typeof t=="string")return t;if(typeof t=="object"){if(typeof t.id=="string")return t.id;if(typeof t.$oid=="string")return t.$oid}return""};o.useMemo(()=>N.filter(t=>z.trim()?(t.username||"").toLowerCase().includes(z.trim().toLowerCase()):!0),[N,z]);const Ue=o.useMemo(()=>N.filter(t=>Y.trim()?(t.username||"").toLowerCase().includes(Y.trim().toLowerCase()):!0),[N,Y]),Me=o.useMemo(()=>S.filter(Qe),[S]),G=o.useMemo(()=>Lt(Me),[Me]),pe=N.find(t=>k(t.id)===k(U)),Z=!!pe&&(pe.role==="master_agent"||pe.role==="super_agent"),F=k(U),Oe=o.useMemo(()=>!Z||!F?[]:N.filter(t=>{if((t.role||"").toLowerCase()!=="agent")return!1;const n=k(t.createdBy),a=k(t.parentAgentId),r=F;return n===r||a===r}),[Z,N,F]),ue=o.useMemo(()=>{let t=G;if(U)if(!Z)t=G.filter(r=>k(r.agentId)===F);else{const r=new Set(Oe.map(s=>k(s.id)).filter(Boolean));t=G.filter(s=>r.has(k(s.agentId)))}const n=new Set(P.map(r=>String(r).toUpperCase()));return[...!ae||P.length===0?t:t.filter(r=>n.has(String(r.username||"").toUpperCase()))].sort((r,s)=>ye(String(r?.username||""),String(s?.username||"")))},[U,Z,G,Oe,F,ae,P]),O=o.useMemo(()=>{const t=String(Q||"").trim().toUpperCase();return m==="admin"?"ADMIN":m==="master_agent"||m==="super_agent"?t||"MASTER":m==="agent"?t||"AGENT":""},[Q,m]),De=o.useMemo(()=>{const t=new Map;N.forEach(i=>{const l=k(i.id);l&&t.set(l,i)});const n=i=>{const l=k(i?.agentId);if(!l)return"UNASSIGNED";const c=[];let g=l;const j=new Set;for(;g&&!j.has(g);){j.add(g);const ee=t.get(g);if(!ee)break;const Ve=String(ee.username||"").trim().toUpperCase();Ve&&c.push(Ve);const vt=String(ee.createdByModel||""),Ye=k(ee.createdBy);if(vt!=="Agent"||!Ye)break;g=Ye}const K=c.reverse().filter(Boolean);return K.length===0?O?`${O} / UNASSIGNED`:"UNASSIGNED":O&&K[0]!==O?`${O} / ${K.join(" / ")}`:K.join(" / ")},a=new Map;ue.forEach(i=>{const l=n(i);a.has(l)||a.set(l,[]),a.get(l).push(i)});const r=Array.from(a.entries()).sort(([i],[l])=>ye(i,l)),s=[];return r.forEach(([i,l])=>{s.push({type:"group",label:i}),[...l].sort((c,g)=>ye(String(c?.username||""),String(g?.username||""))).forEach(c=>s.push({type:"player",player:c,hierarchyPath:i}))}),s},[N,ue,O]),X=ue,D=t=>{nt(t),se(""),V(!0)},Re=()=>{switch(v){case"minBet":return"Min Bet";case"maxBet":return"Max Bet";case"creditLimit":return"Credit Limit";case"settleLimit":return"Settle Limit";case"balanceAdjust":return"Balance Adjustment";case"status":return"Status";default:return""}},Te=t=>{const n=(t||"").toString().toLowerCase();return n==="active"?"Active":n==="read_only"||n==="readonly"?"Read Only":"Disabled"},ft=async t=>{t.preventDefault();const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!n){p("Please login to update players.");return}if(X.length===0){p("No players available for bulk update.");return}let a=null;const r=new Set(X.map(s=>s.id));if(v==="status")a={status:R||"active"};else if(v==="balanceAdjust"){const s=Number(R);if(Number.isNaN(s)){p("Please enter a valid number for balance adjustment.");return}b("bulk-update"),await Promise.all(X.map(i=>{const l=i.id,c=y(i.balance,0)+s;return m==="agent"?xe(l,c,n):fe(l,{balance:c},n)})),h(i=>i.map(l=>{const c=l.id;return r.has(c)?{...l,balance:y(l.balance,0)+s}:l})),V(!1),p(""),b(null);return}else{const s=Number(R);if(Number.isNaN(s)||s<0){p("Please enter a valid non-negative number.");return}v==="minBet"&&(a={minBet:s}),v==="maxBet"&&(a={maxBet:s,wagerLimit:s}),v==="creditLimit"&&(a={creditLimit:s}),v==="settleLimit"&&(a={balanceOwed:s})}try{b("bulk-update"),await Promise.all(X.map(s=>{const i=s.id;return m==="agent"?E(i,a,n):W(i,a,n)})),h(s=>s.map(i=>{const l=i.id;return r.has(l)?{...i,...a}:i})),V(!1),p("")}catch(s){console.error("Bulk update failed:",s),p(s.message||"Failed to update players")}finally{b(null)}},ze=(()=>{const t=S.filter(Qe);return C!=="player"&&C!=="agent"&&C!=="super_agent"?[]:m==="agent"?t:x.agentId?t.filter(n=>String(n.agentId?.id||n.agentId||"")===String(x.agentId)):t})(),Fe=o.useMemo(()=>ze.map(t=>{const n=String(t.id||"").trim(),a=String(t.username||"").trim(),r=String(t.fullName||"").trim();if(!n||!a)return null;const s=`${a.toUpperCase()}${r?` - ${r}`:""}`;return{id:n,label:s,labelLower:s.toLowerCase(),usernameLower:a.toLowerCase()}}).filter(Boolean),[ze]),me=o.useMemo(()=>{const t=String(x.referredByUserId||"").trim();return t&&Fe.find(n=>n.id===t)||null},[x.referredByUserId,Fe]);o.useEffect(()=>{if(me){Ae(me.label);return}String(x.referredByUserId||"").trim()||Ae("")},[me,x.referredByUserId]);const We=t=>{I&&I("user-details",t.id)},_e=async t=>{const n=t.role==="agent"||t.role==="master_agent",a=n?"Agent":"Player",r=window.prompt(`🚨 DELETE ${a.toUpperCase()} WARNING 🚨

You are about to delete ${a} "${t.username}".

This will remove them from all active lists.

To confirm, type the username exactly: ${t.username}`);if(r!==null){if(r.trim().toUpperCase()!==String(t.username).trim().toUpperCase()){alert("Username did not match. Deletion cancelled.");return}try{const s=localStorage.getItem("token")||sessionStorage.getItem("token");if(!s){p("Please login to delete.");return}b(t.id),n?await It(t.id,s):await Bt(t.id,s),h(i=>i.filter(l=>l.id!==t.id)),n&&te(i=>i.filter(l=>l.id!==t.id)),alert(`${a} "${t.username}" deleted successfully.`),p("")}catch(s){console.error("Delete failed:",s),alert(`Failed to delete: ${s.message}`)}finally{b(null)}}},J=t=>{const n=t.id;return lt[n]||{firstName:t.firstName||"",lastName:t.lastName||"",password:"",minBet:String(t.minBet??0),maxBet:String(t.maxBet??t.wagerLimit??0),creditLimit:String(t.creditLimit??0),settleLimit:String(t.balanceOwed??0),status:(t.status||"active").toLowerCase(),sports:t.settings?.sports??!0,casino:t.settings?.casino??!0,racebook:t.settings?.racebook??!0}},bt=t=>{const n=t.id;Ie(a=>a===n?null:n),le(a=>a===n?null:a)},yt=t=>{const n=t.id;Ie(n),le(n),oe(a=>({...a,[n]:J(t)}))},A=(t,n,a)=>{const r=t.id,s=J(t);oe(i=>({...i,[r]:{...s,...i[r]||{},[n]:a}}))},wt=async t=>{const n=t.id,a=J(t),r=localStorage.getItem("token")||sessionStorage.getItem("token");if(!r)return;const s={firstName:a.firstName.trim(),lastName:a.lastName.trim(),fullName:`${a.firstName.trim()} ${a.lastName.trim()}`.trim(),minBet:Number(a.minBet||0),maxBet:Number(a.maxBet||0),wagerLimit:Number(a.maxBet||0),creditLimit:Number(a.creditLimit||0),balanceOwed:Number(a.settleLimit||0),status:a.status,settings:{...t.settings||{},sports:!!a.sports,casino:!!a.casino,racebook:!!a.racebook}};try{if(b(n),m==="agent"?await E(n,s,r):await W(n,s,r),(a.password||"").trim()!==""){const i=a.password.trim().toUpperCase();m==="admin"?await he(n,i,r):await E(n,{password:i},r)}h(i=>i.map(l=>l.id===n?{...l,...s,...a.password.trim()!==""?{displayPassword:a.password.trim().toUpperCase()}:{}}:l)),le(null),oe(i=>{const l={...i};return delete l[n],l}),p("")}catch(i){console.error("Inline save failed:",i),p(i.message||"Failed to save user details")}finally{b(null)}},He=(t,n)=>{const a=t.id;let r="";n==="name"&&(r=`${t.firstName||""} ${t.lastName||""}`.trim()),n==="password"&&(r=t.displayPassword||""),n==="balance"&&(r=String(t.balance??0)),q({open:!0,type:n,customerId:a,username:t.username,value:r})},jt=async t=>{t.preventDefault();const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!(!n||!u.customerId))try{if(b(u.customerId),u.type==="name"){const a=u.value.trim().split(/\s+/).filter(Boolean),r=a[0]||"",s=a.slice(1).join(" "),i={firstName:r,lastName:s,fullName:u.value.trim()};m==="agent"?await E(u.customerId,i,n):await W(u.customerId,i,n),h(l=>l.map(c=>c.id===u.customerId?{...c,...i}:c))}if(u.type==="password"){const a=u.value.trim().toUpperCase();if(a.length<6){p("Password must be at least 6 characters.");return}m==="admin"?await he(u.customerId,a,n):await E(u.customerId,{password:a},n),h(r=>r.map(s=>s.id===u.customerId?{...s,displayPassword:a}:s))}if(u.type==="balance"){const a=Number(u.value);if(Number.isNaN(a)){p("Balance must be numeric.");return}m==="agent"?await xe(u.customerId,a,n):await fe(u.customerId,{balance:a},n),h(r=>r.map(s=>s.id===u.customerId?{...s,balance:a}:s))}q({open:!1,type:"",customerId:null,username:"",value:""}),p("")}catch(a){console.error("Quick edit failed:",a),p(a.message||"Failed to update value")}finally{b(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Administration Console"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"},children:e.jsxs("div",{className:"agent-search-picker header-agent-picker",onFocus:()=>T(!0),onBlur:()=>setTimeout(()=>T(!1),120),tabIndex:0,children:[e.jsxs("div",{className:"agent-search-head",children:[e.jsx("span",{className:"agent-search-label",children:"Agents"}),e.jsx("input",{type:"text",value:Y,onChange:t=>{de(t.target.value),T(!0)},placeholder:"Search agent..."})]}),ot&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${U?"":"selected"}`,onClick:()=>{Be(""),de(""),T(!1)},children:e.jsx("span",{children:"All Agents"})}),Ue.map(t=>{const n=t.id,a=t.role==="master_agent"||t.role==="super_agent";return e.jsxs("button",{type:"button",className:`agent-search-item ${String(U||"")===String(n)?"selected":""}`,onClick:()=>{Be(n),de(t.username||""),T(!1)},children:[e.jsx("span",{children:t.username}),e.jsx("span",{className:`agent-type-badge ${a?"master":"agent"}`,children:a?"M":"A"})]},n)}),Ue.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching agents"})]})]})})]}),e.jsxs("div",{className:"view-content",children:[je&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading Entries..."})]}),Ne&&e.jsx("div",{className:"error-state",children:Ne}),H&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:H.message}),H.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:H.matches.map((t,n)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(t.username||"UNKNOWN")}),e.jsx("span",{children:String(t.fullName||"No name")}),e.jsx("span",{children:String(t.phoneNumber||"No phone")})]},`${t.id||t.username||"duplicate"}-${n}`))})]}),ke&&e.jsx("div",{className:"success-state",children:ke}),P.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",P.slice(0,20).join(", "),P.length>20?` (+${P.length-20} more)`:"",e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"12px",padding:"6px 10px"},onClick:()=>Ze(t=>!t),children:ae?"Show All Players":"Show Imported Only"})]}),!je&&e.jsxs(e.Fragment,{children:[!1,e.jsx("div",{className:"table-container",children:e.jsx("div",{className:"scroll-wrapper",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Password"}),e.jsx("th",{children:"Name"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("minBet"),children:"Min Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("maxBet"),children:"Max Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("creditLimit"),children:"Credit Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("settleLimit"),children:"Settle Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("balanceAdjust"),children:"Balance"}),e.jsx("th",{children:"Lifetime"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>D("status"),children:"Status"}),e.jsx("th",{children:"Sportsbook"}),e.jsx("th",{children:"Casino"}),e.jsx("th",{children:"Horses"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:De.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:14,className:"empty-msg",children:"No records found."})}):De.map((t,n)=>{if(t.type==="group")return e.jsx("tr",{className:"agent-group-row",children:e.jsx("td",{colSpan:14,children:t.label})},`group-${t.label}-${n}`);const a=t.player,r=a.id,s=Ee(a),i=!!ie[r],l=st===r,c=it===r,g=J(a);return e.jsxs(Nt.Fragment,{children:[e.jsxs("tr",{className:`customer-row role-${a.role} ${a.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("td",{className:"user-cell",children:[e.jsxs("div",{className:"user-cell-main",children:[e.jsx("button",{className:"user-link-btn",onClick:()=>We(a),children:e.jsx("span",{className:"customer-username",children:a.username.toUpperCase()})}),a.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"}),e.jsx("span",{className:"customer-tree-path",children:String(t.hierarchyPath||"UNASSIGNED").toUpperCase()})]}),a.role==="user"&&e.jsx("button",{className:"row-expand-btn",type:"button",onClick:()=>bt(a),children:l?"⌄":"›"})]}),e.jsx("td",{className:"pass-cell",children:e.jsx("span",{children:a.displayPassword||"—"})}),e.jsx("td",{children:`${a.firstName||""} ${a.lastName||""}`.trim()||"—"}),e.jsx("td",{children:y(a.minBet,0).toLocaleString("en-US")}),e.jsx("td",{children:y(a.maxBet??a.wagerLimit,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:y(a.creditLimit??1e3,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:y(a.balanceOwed,0).toLocaleString("en-US")}),e.jsx("td",{className:`balance-cell ${be(a.balance)}`,children:M(a.balance)}),e.jsx("td",{children:y(a.lifetime,0).toLocaleString("en-US")}),e.jsx("td",{children:Te(a.status)}),e.jsx("td",{children:a.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!s.sports,onChange:()=>ce(a,"sports")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:a.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!s.casino,onChange:()=>ce(a,"casino")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:a.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!s.racebook,onChange:()=>ce(a,"racebook")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:e.jsxs("div",{className:"action-buttons-cell",style:{display:"flex",gap:"8px"},children:[a.role==="user"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:`btn-secondary ${i?"btn-save-dirty":"btn-save-clean"}`,type:"button",onClick:()=>gt(a),disabled:!i||B===r,children:"Save"}),e.jsx("button",{className:"btn-secondary",type:"button",onClick:()=>c?wt(a):yt(a),disabled:B===r,children:c?"SAVE":"EDIT"})]}):e.jsx("button",{className:"btn-icon",title:"Edit Customer",onClick:()=>$e(a),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),m==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>_e(a),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]})})]}),a.role==="user"&&l&&e.jsx("tr",{className:"expanded-detail-row",children:e.jsx("td",{colSpan:14,children:e.jsxs("div",{className:`expanded-detail-grid ${c?"is-editing":""}`,children:[e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Password"}),e.jsx("span",{children:a.displayPassword||"—"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Name"}),e.jsxs("span",{children:[`${a.firstName||""} ${a.lastName||""}`.trim()||"—"," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>He(a,"name"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Min Bet"}),e.jsx("span",{children:c?e.jsx("input",{type:"number",value:g.minBet,onChange:j=>A(a,"minBet",j.target.value)}):`$${y(a.minBet,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Bet"}),e.jsx("span",{children:c?e.jsx("input",{type:"number",value:g.maxBet,onChange:j=>A(a,"maxBet",j.target.value)}):`$${y(a.maxBet??a.wagerLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Credit Limit"}),e.jsx("span",{children:c?e.jsx("input",{type:"number",value:g.creditLimit,onChange:j=>A(a,"creditLimit",j.target.value)}):`$${y(a.creditLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Settle Limit"}),e.jsx("span",{children:c?e.jsx("input",{type:"number",value:g.settleLimit,onChange:j=>A(a,"settleLimit",j.target.value)}):`$${y(a.balanceOwed,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Balance"}),e.jsxs("span",{className:be(a.balance),children:[M(a.balance)," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>He(a,"balance"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Lifetime"}),e.jsx("span",{children:y(a.lifetime,0).toLocaleString("en-US")})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Pending"}),e.jsx("span",{children:M(a.pendingBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Available"}),e.jsx("span",{children:M(a.availableBalance??a.balance??0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"FP Balance"}),e.jsx("span",{children:M(a.freeplayBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Payout"}),e.jsx("span",{children:"$6,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:c?e.jsxs("select",{value:g.status,onChange:j=>A(a,"status",j.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):Te(a.status)})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Payout"}),e.jsx("span",{children:"$5,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Soccer Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Sportsbook"}),e.jsx("span",{children:c?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!g.sports,onChange:()=>A(a,"sports",!g.sports)}),e.jsx("span",{className:"slider-mini"})]}):a.settings?.sports??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Casino"}),e.jsx("span",{children:c?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!g.casino,onChange:()=>A(a,"casino",!g.casino)}),e.jsx("span",{className:"slider-mini"})]}):a.settings?.casino??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Horses"}),e.jsx("span",{children:c?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!g.racebook,onChange:()=>A(a,"racebook",!g.racebook)}),e.jsx("span",{className:"slider-mini"})]}):a.settings?.racebook??!0?"On":"Off"})]})]})]})})})]},r)})})]})})}),et&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit ",f?.role==="user"?"Player":f?.role==="agent"?"Agent":"Master Agent",": ",f?.username]}),e.jsxs("form",{onSubmit:xt,children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:d.firstName,onChange:t=>w({...d,firstName:t.target.value}),placeholder:f?.firstName||"First name"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:d.lastName,onChange:t=>w({...d,lastName:t.target.value}),placeholder:f?.lastName||"Last name"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:d.phoneNumber,onChange:t=>w({...d,phoneNumber:t.target.value}),placeholder:f?.phoneNumber||"Phone number"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:d.minBet,onChange:t=>w({...d,minBet:t.target.value}),placeholder:`${f?.minBet??25}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:d.maxBet,onChange:t=>w({...d,maxBet:t.target.value}),placeholder:`${f?.maxBet??200}`})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:d.creditLimit,onChange:t=>w({...d,creditLimit:t.target.value}),placeholder:`${f?.creditLimit??1e3}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Settle Limit:"}),e.jsx("input",{type:"number",value:d.balanceOwed,onChange:t=>w({...d,balanceOwed:t.target.value}),placeholder:`${f?.balanceOwed??0}`})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:d.password,onChange:t=>w({...d,password:t.target.value.toUpperCase()})})]}),e.jsxs("div",{className:"action-buttons",children:[e.jsx("button",{className:"btn-icon",title:"View Details",onClick:()=>We(f),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]})}),e.jsx("button",{className:"btn-icon",title:"Detailed View (Edit)",onClick:()=>$e(f),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),e.jsx("button",{className:"btn-icon",title:"Adjust Balance / Settle",onClick:()=>ut(f),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"23"}),e.jsx("path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"})]})}),e.jsx("button",{className:"btn-icon",title:"Reset Password",onClick:()=>ht(f),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})}),m==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>_e(f),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]}),e.jsxs("div",{className:"payment-apps-section",children:[e.jsx("h4",{className:"section-title",style:{color:"#0d3b5c",marginBottom:"15px"},children:"Payment Apps"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Venmo"}),e.jsx("input",{type:"text",value:d.apps.venmo,onChange:t=>w({...d,apps:{...d.apps,venmo:t.target.value}}),placeholder:"@username"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cashapp"}),e.jsx("input",{type:"text",value:d.apps.cashapp,onChange:t=>w({...d,apps:{...d.apps,cashapp:t.target.value}}),placeholder:"$cashtag"})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Apple Pay"}),e.jsx("input",{type:"text",value:d.apps.applePay,onChange:t=>w({...d,apps:{...d.apps,applePay:t.target.value}}),placeholder:"Phone/Email"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Zelle"}),e.jsx("input",{type:"text",value:d.apps.zelle,onChange:t=>w({...d,apps:{...d.apps,zelle:t.target.value}}),placeholder:"Phone/Email"})]})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>ne(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"auto",backgroundColor:"#17a2b8",color:"white"},onClick:()=>{const t=d.password||"N/A",n=`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${d.username||f.username}
Password: ${t}
Min bet: $${d.minBet}
Max bet: $${d.maxBet}
Credit: $${d.creditLimit}


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
`;navigator.clipboard.writeText(n).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]})]})]})}),rt&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Re()]}),e.jsxs("form",{onSubmit:ft,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Re()}),v==="status"?e.jsxs("select",{value:R,onChange:t=>se(t.target.value),required:!0,children:[e.jsx("option",{value:"",children:"Select status"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):e.jsx("input",{type:"number",step:"1",min:v==="balanceAdjust"?void 0:"0",value:R,onChange:t=>se(t.target.value),placeholder:v==="balanceAdjust"?"Enter + / - amount":"Enter amount",required:!0})]}),e.jsx("p",{className:"bulk-edit-hint",children:v==="balanceAdjust"?"This adds or subtracts from balance for all players shown in the current list.":"This updates all players shown in the current list."}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:B==="bulk-update",children:B==="bulk-update"?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>V(!1),children:"Cancel"})]})]})]})}),u.open&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",u.type==="name"?"Name":u.type==="password"?"Password":"Balance",": ",u.username]}),e.jsxs("form",{onSubmit:jt,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:u.type==="name"?"Name":u.type==="password"?"Password":"Balance"}),e.jsx("input",{type:u.type==="balance"?"number":"text",value:u.value,onChange:t=>q(n=>({...n,value:u.type==="password"?t.target.value.toUpperCase():t.target.value})),autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:B===u.customerId,children:B===u.customerId?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>q({open:!1,type:"",customerId:null,username:"",value:""}),children:"Cancel"})]})]})]})}),at&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-glass-content",children:[e.jsxs("h3",{children:["Adjust Balance: ",$.username]}),e.jsxs("form",{onSubmit:mt,children:[e.jsxs("div",{className:"premium-field-info",children:[e.jsx("label",{children:"Current Net Balance"}),e.jsx("div",{className:`large-val ${be($.currentBalance)}`,children:M($.currentBalance)})]}),e.jsxs("div",{className:"p-field",children:[e.jsx("label",{children:"New Net Balance"}),e.jsxs("div",{className:"input-with-symbol",children:[e.jsx("span",{className:"sym",children:"$"}),e.jsx("input",{type:"number",step:"0.01",value:$.nextBalance,onChange:t=>Se({...$,nextBalance:t.target.value}),autoFocus:!0,required:!0})]}),e.jsx("small",{className:"field-hint",children:"Setting a new net balance will adjust the credit/owed amount accordingly."})]}),e.jsxs("div",{className:"modal-premium-actions",children:[e.jsx("button",{type:"submit",className:"btn-save-premium",disabled:B!==null,children:B!==null?"Updating...":"Confirm Adjustment"}),e.jsx("button",{type:"button",className:"btn-cancel-premium",onClick:()=>re(!1),children:"Cancel"})]})]})]})}),e.jsx("style",{children:`
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

      `})]})]})]})}export{Zt as default};
