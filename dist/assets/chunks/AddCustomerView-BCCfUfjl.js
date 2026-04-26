import{b as d,j as e}from"./vendor-common-DIOJvOBD.js";import{k as Qe,t as Te,o as Ee,u as Re,z as me,as as Ct,at as kt,K as He,au as Ge,av as It,l as Pt}from"./app-api-oLKgNwi-.js";import{n as Lt,G as Ve,H as Mt,I as Ut}from"./utils-shared-CC164WKi.js";const Be=s=>{const l=String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!l)return"";const f=l.match(/^[A-Z]+/);return f&&f[0]?f[0]:l.replace(/\d+$/,"")||l},Tt=s=>s?`FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`:`FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`,Et=new Set(["admin","agent","master_agent","super_agent"]),Rt=s=>!Et.has(String(s?.role||"").trim().toLowerCase()),K=s=>String(s||"").trim().toLowerCase(),D=s=>String(s||"").trim(),Bt=new Set(["admin","agent","master_agent","super_agent"]),Ne=s=>String(s?.nodeType||"").trim().toLowerCase()==="player"?!1:Bt.has(K(s?.role)),Z=s=>{const l=K(s?.role);return l==="master_agent"||l==="super_agent"},je=s=>K(s?.role)==="agent",Ze=s=>{if(!Ne(s))return null;const l=Array.isArray(s.children)?s.children.map(f=>Ze(f)).filter(Boolean):[];return{...s,id:D(s.id),children:l}},ue=(s,l)=>{const f=D(l);if(!f||!s)return null;if(D(s.id)===f)return s;const x=Array.isArray(s.children)?s.children:[];for(const j of x){const v=ue(j,f);if(v)return v}return null},$e=(s,l)=>{const f=D(l);if(!f||!s)return[];const x=D(s.id);if(x===f)return[x];const j=Array.isArray(s.children)?s.children:[];for(const v of j){const I=$e(v,f);if(I.length>0)return[x,...I]}return[]},_e=(s,l,f=!0,x=0,j=[])=>(s&&((f||x>0)&&l(s,x)&&j.push(s),(Array.isArray(s.children)?s.children:[]).forEach(I=>_e(I,l,!0,x+1,j))),j),$t=s=>{const l=K(s?.role);return l==="master_agent"?"MASTER":l==="super_agent"?"SUPER":l==="agent"?"AGENT":l==="admin"?"ADMIN":l?l.replace(/_/g," ").toUpperCase():"ACCOUNT"},_t=s=>K(s?.role).replace(/_/g,"-")||"account",Ft=s=>{const l=String(s?.username||"").toLowerCase(),x=K(s?.role).replace(/_/g," ");return`${l} ${x}`.trim()},Fe=(s,l)=>{const f=String(l||"").trim().toLowerCase();return!f||Ft(s).includes(f)?!0:(Array.isArray(s?.children)?s.children:[]).some(x=>Fe(x,f))};function zt({rootNode:s,loading:l=!1,error:f="",searchQuery:x="",onSearchQueryChange:j,expandedNodes:v,onToggleNode:I,onSelectNode:J,onSelectDirect:B,selectedNodeId:N="",directSelected:U=!1,selectionMode:k="player",searchPlaceholder:P="Search accounts...",emptyLabel:ge="No matching accounts"}){const q=String(x||"").trim().toLowerCase(),fe=q!==""||l||f,X=(w,W=0,$=!1)=>{if(!w||!Ne(w)||k==="master"&&!$&&!Z(w)||q&&!Fe(w,q))return null;if(k==="player"&&!je(w)){const ae=(Array.isArray(w.children)?w.children:[]).filter(Ne).map(oe=>X(oe,W,!1));return ae.some(Boolean)?e.jsx(e.Fragment,{children:ae}):null}const L=D(w.id),Y=(Array.isArray(w.children)?w.children:[]).filter(z=>Ne(z)&&(k!=="master"||Z(z))),T=Y.length>0&&($||Z(w)),H=q?!0:v.has(L),ie=k==="player"?je(w):$?typeof B=="function":Z(w),le=$?U:N!==""&&N===L;return e.jsxs("div",{className:"assignment-tree-branch",children:[e.jsxs("div",{className:`tree-node ${$?"root-node":""} assignment-tree-row ${le?"selected":""} ${ie?"selectable":""}`,style:$?void 0:{paddingLeft:`${16+W*20}px`},children:[e.jsx("button",{type:"button",className:`assignment-tree-toggle-btn ${T?"":"is-spacer"}`,onClick:()=>{T&&I?.(L)},"aria-label":T?H?"Collapse branch":"Expand branch":"No child accounts",disabled:!T,children:T?H?"−":"+":""}),e.jsxs("button",{type:"button",className:"assignment-tree-node-btn",onClick:()=>{if(ie){if($&&typeof B=="function"){B(w);return}J?.(w);return}T&&I?.(L)},children:[e.jsx("span",{className:"node-name",children:String(w.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${_t(w)}`,children:$t(w)})]})]}),T&&H&&Y.length>0&&e.jsx("div",{className:"node-children assignment-tree-children",children:Y.map(z=>X(z,W+1,!1))})]},`${L||"root"}-${W}`)},se=!!s&&Fe(s,q);return e.jsxs("div",{className:"assignment-tree-picker",children:[e.jsxs("div",{className:"search-pill assignment-tree-search-pill",children:[e.jsx("span",{className:"pill-label",children:"Tree"}),e.jsx("input",{type:"text",placeholder:P,value:x,onChange:w=>j?.(w.target.value)})]}),fe&&e.jsx("div",{className:"assignment-tree-results-dropdown",children:e.jsx("div",{className:"tree-scroll-area assignment-tree-scroll-area",children:l?e.jsx("div",{className:"tree-loading",children:"Loading hierarchy..."}):f?e.jsx("div",{className:"tree-error",children:f}):se?X(s,0,!0):e.jsx("div",{className:"tree-loading",children:ge})})}),e.jsx("style",{children:`
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
      `})]})}const Ot=(s,l)=>{const f=l.password||"N/A";if(s==="player")return`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${l.username}
Password: ${f}
Min bet: $${l.minBet||25}
Max bet: $${l.maxBet||200}
Credit: $${l.creditLimit||1e3}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${Tt(!!l.grantStartingFreeplay)}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;const x=s==="agent"?"Agent":"Master Agent",j=s==="agent"?`
Standard Min bet: $${l.defaultMinBet||25}
Standard Max bet: $${l.defaultMaxBet||200}
Standard Credit: $${l.defaultCreditLimit||1e3}
`:"";return`Welcome to the team! Here’s your ${x} administrative account info.

Login: ${l.username}
Password: ${f}
${j}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`};function Dt({initialType:s="player"}){const l=(t,r,i)=>{let a;const m=new Promise((h,b)=>{a=setTimeout(()=>b(new Error(i)),Math.max(1e3,r))});return Promise.race([t,m]).finally(()=>clearTimeout(a))},[f,x]=d.useState([]),[j,v]=d.useState([]),[I,J]=d.useState(!0),[B,N]=d.useState(""),[U,k]=d.useState(null),[P,ge]=d.useState(!1),[q,fe]=d.useState(!1),[X,se]=d.useState(null),[w,W]=d.useState(""),[$,L]=d.useState(""),[Y,T]=d.useState([]),[H,ie]=d.useState(!0),[le,z]=d.useState(""),[ae,oe]=d.useState([]),[n,p]=d.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),[Ke,Je]=d.useState({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),[he,ve]=d.useState(""),[xe,Ae]=d.useState(""),[G,ee]=d.useState([]),[ye,Ce]=d.useState(""),[o,ze]=d.useState(s||"player"),[u,Xe]=d.useState("admin"),[et,tt]=d.useState(!1),[rt,ce]=d.useState(""),[be,V]=d.useState(""),[at,O]=d.useState(!1),[de,nt]=d.useState(""),[pe,st]=d.useState(""),[S,we]=d.useState(null),[it,ke]=d.useState(!1),[lt,Se]=d.useState(""),[ot,ne]=d.useState(()=>new Set),Ie=async(t,r)=>{if(K(r)==="agent")return we(null),Se(""),ne(new Set),ke(!1),null;try{ke(!0);const a=await Pt(t),m=a?.root?Ze({...a.root,children:Array.isArray(a.tree)?a.tree:[]}):null;return we(m),Se(""),ne(new Set),m}catch(a){return console.error("Failed to load assignment hierarchy:",a),we(null),Se(a?.message||"Failed to load hierarchy"),ne(new Set),null}finally{ke(!1)}};d.useEffect(()=>{(async()=>{try{J(!0);const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(!r){x([]),v([]),we(null),Se(""),ne(new Set),N("Please login to load users.");return}const i=String(localStorage.getItem("userRole")||"").toLowerCase();let a=null;try{a=await Qe(r,{timeoutMs:3e4})}catch(h){console.warn("CustomerCreationWorkspace: getMe failed, falling back to stored role.",h)}const m=String(a?.role||i||"admin").toLowerCase();if(Xe(m),nt(a?.username||""),st(a?.id||""),tt(!!a?.viewOnly),m==="agent"){const h=await Te(r);x(h||[]),v([]),await Ie(r,m)}else{const[h,b]=await Promise.all([Ee(r),Re(r)]);x(h||[]),v(b||[]),await Ie(r,m)}if(N(""),a?.username)try{const h=Be(a.username);if(!h)return;const{nextUsername:b}=await me(h,r,{type:"player"});p(c=>({...c,username:b}))}catch(h){console.error("Failed to prefetch next username:",h)}}catch(r){console.error("Error fetching add-customer context:",r),N("Failed to load users: "+r.message)}finally{J(!1)}})()},[]),d.useEffect(()=>{if(!s||s===o)return;(async()=>await De(s))()},[s]);const Oe=async({overrideDuplicate:t=!1}={})=>{try{ge(!0),t||k(null),N("");const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(!r){N("Please login to create users.");return}if(!String(n.username||"").trim()||!String(n.firstName||"").trim()||!String(n.lastName||"").trim()||!String(n.phoneNumber||"").trim()||!String(n.password||"").trim()){N("Username, first name, last name, phone number, and password are required.");return}if(o==="player"){if(String(n.minBet??"").trim()===""||String(n.maxBet??"").trim()===""||String(n.creditLimit??"").trim()===""||String(n.balanceOwed??"").trim()===""){N("Min bet, max bet, credit limit, and settle limit are required for players.");return}if(u!=="agent"&&!String(n.agentId||"").trim()){N("Please assign this player to a regular Agent.");return}}const a={...n,apps:Ke};t&&(a.allowDuplicateSave=!0),a.balance===""&&delete a.balance,o!=="player"?(delete a.referredByUserId,delete a.grantStartingFreeplay,delete a.minBet,delete a.maxBet,delete a.creditLimit,delete a.balanceOwed,o==="super_agent"&&(delete a.defaultMinBet,delete a.defaultMaxBet,delete a.defaultCreditLimit,delete a.defaultSettleLimit)):a.referredByUserId||delete a.referredByUserId,(o==="agent"||o==="super_agent")&&a.agentId&&(a.parentAgentId=a.agentId),o==="agent"||o==="super_agent"?(a.agentPercent!==""?a.agentPercent=parseFloat(a.agentPercent):delete a.agentPercent,a.playerRate!==""?a.playerRate=parseFloat(a.playerRate):delete a.playerRate,he!==""&&(a.hiringAgentPercent=parseFloat(he)),xe!==""&&(a.subAgentPercent=parseFloat(xe)),G.length>0&&(a.extraSubAgents=G.filter(y=>y.name.trim()!==""||y.percent!=="").map(y=>({name:y.name.trim(),percent:parseFloat(y.percent)||0})))):(delete a.agentPercent,delete a.playerRate);let m=null;o==="player"?u==="agent"||u==="super_agent"||u==="master_agent"?m=await Ct(a,r):m=await kt(a,r):o==="agent"?u==="admin"?m=await He({...a,role:"agent"},r):m=await Ge({...a,role:"agent"},r):o==="super_agent"&&(u==="admin"?m=await He({...a,role:"master_agent"},r):m=await Ge({...a,role:"master_agent"},r));const h=o;N(""),k(null),L(""),T([]),Je({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),p({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",defaultMinBet:"",defaultMaxBet:"",defaultCreditLimit:"",defaultSettleLimit:"",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),ze(h),ce(""),ve(""),Ae(""),ee([]),O(!1),se(null),W(""),z(""),oe([]),ie(!0);const c=h==="player"?"Player":h==="agent"?"Agent":"Master Agent";if(L(m?.assigned?`${c} assigned successfully.`:`${c} created successfully.`),u==="agent"){const y=await Te(r);x(y||[])}else{const[y,g]=await Promise.all([Ee(r),Re(r)]);x(y||[]),v(g||[]),await Ie(r,u)}}catch(r){console.error("Create user failed:",r);const i=Array.isArray(r?.duplicateMatches)?r.duplicateMatches:Array.isArray(r?.details?.matches)?r.details.matches:[],a=r?.isDuplicate===!0||r?.duplicate===!0||r?.code==="DUPLICATE_PLAYER"||r?.details?.duplicate===!0;k(a?{message:r?.message||"Likely duplicate player detected.",matches:i}:null),N(r.message||"Failed to create user")}finally{ge(!1)}},ct=async()=>{try{fe(!0),N(""),L(""),T([]),oe([]);const t=localStorage.getItem("token")||sessionStorage.getItem("token");if(!t){N("Please login to import users.");return}if(!X){N("Please choose an Excel/CSV file first.");return}if(H&&(u==="admin"||u==="master_agent"||u==="super_agent")&&!le){N("Select an agent to assign imported players to, or uncheck the assignment option.");return}const r=await l(It(X,t,{defaultAgentId:le||"",timeoutMs:45e3,forceAgentAssignment:H}),5e4,"Import request timed out. Please try again."),i=Array.isArray(r?.createdRows)?r.createdRows.length:0,a=Number(r?.created),m=Number(r?.failed),h=Number.isFinite(a)?a:i,b=Number.isFinite(m)?m:0,c=String(r?.message||"").trim();!Number.isFinite(a)&&!Number.isFinite(m)?L(c||`Import complete: ${h} created, ${b} failed.`):L(`Import complete: ${h} created, ${b} failed.${c?` ${c}`:""}`);const y=Array.isArray(r?.createdRows)?r.createdRows.map(g=>String(g?.username||"").toUpperCase()).filter(Boolean):[];T(y),oe(Array.isArray(r?.errors)?r.errors:[]),se(null),W(""),z("");try{if(u==="agent"){const g=await l(Te(t),15e3,"Players refresh timed out");x(g||[])}else{const[g,A]=await Promise.all([l(Ee(t),15e3,"Users refresh timed out"),l(Re(t),15e3,"Agents refresh timed out")]);x(g||[]),v(A||[])}}catch(g){console.warn("Post-import refresh failed:",g),L(A=>`${A} Imported, but refresh failed: ${g.message||"please reload page."}`)}}catch(t){console.error("Import users failed:",t),N(t.message||"Failed to import users")}finally{fe(!1)}},dt=async t=>{const r=t.toUpperCase().replace(/[^A-Z0-9]/g,"");if(p(i=>({...i,agentPrefix:r})),Ce(""),r.length>=2){const i=o==="super_agent";if(j.some(c=>{const y=String(c.role||"").toLowerCase();return i!==(y==="master_agent"||y==="super_agent")?!1:String(c.username||"").toUpperCase().replace(/MA$/,"").replace(/\d+$/,"")===r})){Ce(`Prefix "${r}" is already taken`);return}const m=localStorage.getItem("token")||sessionStorage.getItem("token"),h=o==="super_agent"?"MA":"",b=o==="agent"?n.agentId||(u==="master_agent"||u==="super_agent"?pe:""):"";try{const c={suffix:h,type:"agent"};b&&(c.agentId=b);const{nextUsername:y}=await me(r,m,c);p(g=>({...g,username:y}))}catch(c){console.error("Failed to get next username from prefix:",c)}}else p(i=>({...i,username:""}))},Pe=async(t,r=null)=>{const i=localStorage.getItem("token")||sessionStorage.getItem("token");if(!i)return;p(b=>({...b,agentId:t,referredByUserId:""})),ce("");const a=o==="player"?"player":"agent",m=o==="super_agent"?"MA":"",h=o==="agent"||o==="super_agent";if(t){const b=r||j.find(c=>c.id===t);if(b)try{const c=h&&n.agentPrefix?n.agentPrefix:Be(b.username);if(!c){p(A=>({...A,username:""}));return}const y=a==="player"?{suffix:m,type:a,agentId:t}:{suffix:m,type:a,...o==="agent"?{agentId:t}:{}},{nextUsername:g}=await me(c,i,y);p(A=>({...A,username:g,agentPrefix:h&&A.agentPrefix?A.agentPrefix:c}))}catch(c){console.error("Failed to get next username:",c)}}else{if(o==="player"&&(u==="admin"||ft)){p(c=>({...c,username:""}));return}const b=h&&n.agentPrefix?n.agentPrefix:de?Be(de):"";if(b)try{const c={suffix:m,type:a};a==="agent"&&o==="agent"&&(u==="master_agent"||u==="super_agent")&&pe&&(c.agentId=pe);const{nextUsername:y}=await me(b,i,c);p(g=>({...g,username:y,agentPrefix:h&&g.agentPrefix?g.agentPrefix:b}))}catch(c){console.error("Failed to fetch username for admin:",c),p(y=>({...y,username:""}))}else p(c=>({...c,username:""}))}},De=async t=>{ze(t),Ce(""),ce(""),ve(""),Ae(""),ee([]),p(i=>({...i,agentPercent:"",playerRate:""}));const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(r)if(t==="super_agent"||t==="agent"){const i=String(n.agentId||"").trim(),a=i?ue(S,i):null,m=!!(a&&Z(a)),h=m?i:"";m||p(g=>({...g,agentId:"",parentAgentId:""})),V(""),O(!1),p(g=>({...g,referredByUserId:""}));const b=t==="super_agent"?"MA":"",c=n.agentPrefix,y="agent";if(c)try{const g={suffix:b,type:y};t==="agent"&&h?g.agentId=h:t==="agent"&&(u==="master_agent"||u==="super_agent")&&pe&&(g.agentId=pe);const{nextUsername:A}=await me(c,r,g);p(Ue=>({...Ue,username:A,agentPrefix:c}))}catch(g){console.error("Failed to re-fetch username on type change",g)}else p(g=>({...g,username:""}))}else await Pe(""),O(!1),p(i=>({...i,referredByUserId:""}))},Le=(t,r,i)=>{const a=Ut(t,r,i,n.username);p(m=>({...m,password:a}))},pt=t=>{const r=Ve(t);p(i=>{const a={...i,firstName:r};return Le(r,a.lastName,a.phoneNumber),a})},mt=t=>{const r=Ve(t);p(i=>{const a={...i,lastName:r};return Le(a.firstName,r,a.phoneNumber),a})},ut=t=>{const r=Mt(t);p(i=>{const a={...i,phoneNumber:r};return Le(a.firstName,a.lastName,r),a})},gt=!et&&!P&&!!String(n.username||"").trim()&&!!String(n.firstName||"").trim()&&!!String(n.lastName||"").trim()&&!!String(n.phoneNumber||"").trim()&&!!String(n.password||"").trim()&&(o!=="player"||u==="agent"||!!String(n.agentId||"").trim())&&(o!=="player"||String(n.minBet??"").trim()!==""&&String(n.maxBet??"").trim()!==""&&String(n.creditLimit??"").trim()!==""&&String(n.balanceOwed??"").trim()!=="")&&!ye,ft=u==="master_agent"||u==="super_agent",te=o==="agent"||o==="super_agent";d.useMemo(()=>S?o==="player"?_e(S,(t,r)=>r>0&&je(t),!1):_e(S,(t,r)=>r>0&&Z(t),!1):[],[S,o]);const re=d.useMemo(()=>{if(!S)return null;const t=String(n.agentId||"").trim();return t?ue(S,t):te?S:null},[S,n.agentId,te]),ht=d.useMemo(()=>{if(o==="player")return re?String(re.username||"").toUpperCase():"Select an agent";if(!String(n.agentId||"").trim()){const t=String(S?.username||de||"").trim().toUpperCase();return t?`${t} (ME)`:"DIRECT (CREATED BY ME)"}return re?String(re.username||"").toUpperCase():"Select a master agent"},[o,re,n.agentId,S,de]),xt=te?"Search master agents or agents...":"Search agents...",yt=te?"No matching master-agent branches":"No matching agents",bt=t=>{const r=D(t);r&&ne(i=>{const a=new Set(i);return a.has(r)?a.delete(r):a.add(r),a})},wt=t=>{const r=D(t);!r||!S||ne(i=>{const a=new Set(i);return $e(S,r).forEach(h=>a.add(h)),a})},St=async t=>{const r=D(t?.id);r&&(wt(r),await Pe(r,t))},Nt=async t=>{await Pe("",t)};d.useEffect(()=>{const t=String(n.agentId||"").trim();if(!t)return;const r=ue(S,t);(o==="player"?r&&je(r):r&&Z(r))||(p(a=>String(a.agentId||"").trim()?{...a,agentId:"",parentAgentId:""}:a),ce(""))},[S,o,n.agentId]);const qe=(()=>{const t=Lt(f.filter(Rt));return o!=="player"&&o!=="agent"&&o!=="super_agent"?[]:u==="agent"?t:n.agentId?t.filter(r=>String(r.agentId?.id||r.agentId||"")===String(n.agentId)):t})(),Q=d.useMemo(()=>qe.map(t=>{const r=String(t.id||"").trim(),i=String(t.username||"").trim(),a=String(t.fullName||"").trim();if(!r||!i)return null;const m=`${i.toUpperCase()}${a?` - ${a}`:""}`;return{id:r,label:m,labelLower:m.toLowerCase(),usernameLower:i.toLowerCase(),isDuplicatePlayer:!!t.isDuplicatePlayer}}).filter(Boolean),[qe]),We=d.useMemo(()=>{const t=String(be||"").trim().toLowerCase();return t?Q.filter(r=>r.labelLower.includes(t)||r.usernameLower.includes(t)).slice(0,20):Q.slice(0,20)},[Q,be]),Me=d.useMemo(()=>{const t=String(n.referredByUserId||"").trim();return t&&Q.find(r=>r.id===t)||null},[n.referredByUserId,Q]);d.useEffect(()=>{if(Me){V(Me.label);return}String(n.referredByUserId||"").trim()||V("")},[Me,n.referredByUserId]);const jt=t=>{V(t);const r=String(t||"").trim().toLowerCase();if(!r){p(a=>({...a,referredByUserId:""}));return}const i=Q.find(a=>a.labelLower===r||a.usernameLower===r);p(a=>({...a,referredByUserId:i?i.id:""}))},vt=()=>{const t=String(be||"").trim().toLowerCase();if(!t){p(a=>({...a,referredByUserId:""}));return}const r=Q.find(a=>a.labelLower===t||a.usernameLower===t);if(r){V(r.label),p(a=>({...a,referredByUserId:r.id}));return}const i=Q.filter(a=>a.labelLower.includes(t)||a.usernameLower.includes(t));if(i.length===1){V(i[0].label),p(a=>({...a,referredByUserId:i[0].id}));return}p(a=>({...a,referredByUserId:""}))},Ye=t=>{if(!t){V(""),p(r=>({...r,referredByUserId:""})),O(!1);return}V(t.label),p(r=>({...r,referredByUserId:t.id})),O(!1)};return e.jsxs(e.Fragment,{children:[I&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading setup..."})]}),!I&&e.jsxs(e.Fragment,{children:[B&&e.jsx("div",{className:"error-state",children:B}),U&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:U.message}),U.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:U.matches.map((t,r)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(t.username||"UNKNOWN")}),e.jsx("span",{children:String(t.fullName||"No name")}),e.jsx("span",{children:String(t.phoneNumber||"No phone")})]},`${t.id||t.username||"duplicate"}-${r}`))}),e.jsxs("div",{className:"duplicate-warning-actions",children:[e.jsx("button",{type:"button",className:"duplicate-warning-cancel",onClick:()=>{k(null),N("")},disabled:P,children:"Cancel"}),e.jsx("button",{type:"button",className:"duplicate-warning-confirm",onClick:()=>Oe({overrideDuplicate:!0}),disabled:P,children:P?"Creating…":"Create Anyway"})]})]}),$&&e.jsx("div",{className:"success-state",children:$}),Y.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",Y.slice(0,20).join(", "),Y.length>20?` (+${Y.length-20} more)`:""]}),ae.length>0&&e.jsxs("div",{style:{marginTop:"8px",background:"#fff5f5",border:"1px solid #feb2b2",borderRadius:"6px",padding:"10px 14px"},children:[e.jsxs("strong",{style:{color:"#c53030",fontSize:"13px"},children:["Failed rows (",ae.length,") — re-importing will retry these safely:"]}),e.jsx("ul",{style:{margin:"6px 0 0 0",padding:"0 0 0 16px",fontSize:"12px",color:"#742a2a",maxHeight:"160px",overflowY:"auto"},children:ae.map((t,r)=>e.jsxs("li",{children:["Row ",t.row,t.username?` (${String(t.username).toUpperCase()})`:"",": ",t.error||t.reason||"Unknown error"]},r))})]}),e.jsxs("div",{className:"customer-create-shell",children:[e.jsxs("div",{className:"customer-create-main",children:[e.jsxs("div",{className:"customer-create-top-row",children:[e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-type",children:[e.jsx("label",{children:"Type"}),e.jsx("div",{className:"s-wrapper",children:e.jsxs("select",{value:o,onChange:t=>De(t.target.value),children:[e.jsx("option",{value:"player",children:"Player"}),(u==="admin"||u==="super_agent"||u==="master_agent")&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"super_agent",children:"Master Agent"})]})]})})]}),(o==="agent"||o==="super_agent")&&e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-prefix",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:n.agentPrefix,onChange:t=>dt(t.target.value),placeholder:"Enter prefix",maxLength:5,style:ye?{borderColor:"#ef4444",boxShadow:"0 0 0 2px rgba(239,68,68,0.15)"}:void 0}),ye&&e.jsx("span",{style:{color:"#ef4444",fontSize:12,fontWeight:600,marginTop:4},children:ye})]}),(o==="player"||o==="agent"||o==="super_agent")&&(u==="admin"||u==="super_agent"||u==="master_agent")&&e.jsxs("div",{className:"filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment",children:[e.jsxs("label",{className:"assignment-field-label",children:[e.jsx("span",{children:o==="player"?"Assign to Agent":"Assign to Master Agent"}),e.jsx("span",{className:"assignment-selected-chip",children:ht})]}),e.jsx(zt,{rootNode:S,loading:it,error:lt,searchQuery:rt,onSearchQueryChange:ce,expandedNodes:ot,onToggleNode:bt,onSelectNode:St,onSelectDirect:te?Nt:null,selectedNodeId:String(n.agentId||""),directSelected:te&&!String(n.agentId||"").trim(),selectionMode:te?"master":"player",searchPlaceholder:xt,emptyLabel:yt})]}),e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-username",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:n.username,placeholder:"Auto-generated",readOnly:!0,className:"readonly-input"})]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:n.firstName,onChange:t=>pt(t.target.value),placeholder:"Enter first name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:n.lastName,onChange:t=>mt(t.target.value),placeholder:"Enter last name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:n.phoneNumber,onChange:t=>ut(t.target.value),placeholder:"User contact"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Password ",e.jsx("span",{className:"locked-chip",children:"Locked"})]}),e.jsx("input",{type:"text",value:n.password.toUpperCase(),readOnly:!0,className:"readonly-input",placeholder:"Auto-generated from name + phone"})]})]}),o==="player"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:n.minBet,onChange:t=>p(r=>({...r,minBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:n.maxBet,onChange:t=>p(r=>({...r,maxBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:n.creditLimit,onChange:t=>p(r=>({...r,creditLimit:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit:"}),e.jsx("input",{type:"number",value:n.balanceOwed,onChange:t=>p(r=>({...r,balanceOwed:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-12",children:[e.jsx("label",{children:"Referred By Player"}),e.jsxs("div",{className:"agent-search-picker referral-search-picker",onFocus:()=>O(!0),onBlur:()=>{setTimeout(()=>{vt(),O(!1)},120)},tabIndex:0,children:[e.jsx("div",{className:"referral-search-head",children:e.jsx("input",{type:"text",value:be,onChange:t=>{jt(t.target.value),O(!0)},onFocus:()=>O(!0),placeholder:"Search player (leave blank for no referral)",autoComplete:"off"})}),at&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${n.referredByUserId?"":"selected"}`,onMouseDown:t=>{t.preventDefault(),Ye(null)},children:e.jsx("span",{children:"No referral"})}),We.map(t=>e.jsxs("button",{type:"button",className:`agent-search-item ${String(n.referredByUserId||"")===String(t.id)?"selected":""} ${t.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:r=>{r.preventDefault(),Ye(t)},children:[e.jsx("span",{children:t.label}),t.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-badge",children:"Duplicate"})]},t.id)),We.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching players"})]})]}),e.jsx("div",{className:"player-referral-settings",children:e.jsx("div",{className:`player-freeplay-toggle ${n.grantStartingFreeplay?"is-selected":"is-unselected"}`,children:e.jsxs("label",{className:"player-freeplay-toggle-row",children:[e.jsx("input",{type:"checkbox",checked:!!n.grantStartingFreeplay,onChange:t=>p(r=>({...r,grantStartingFreeplay:t.target.checked}))}),e.jsx("span",{className:"player-freeplay-toggle-copy",children:e.jsx("span",{className:"player-freeplay-toggle-title",children:"$200 new player freeplay bonus"})})]})})})]})]}),o==="agent"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet: (Standard)"}),e.jsx("input",{type:"number",value:n.defaultMinBet,onChange:t=>p(r=>({...r,defaultMinBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet: (Standard)"}),e.jsx("input",{type:"number",value:n.defaultMaxBet,onChange:t=>p(r=>({...r,defaultMaxBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit: (Standard)"}),e.jsx("input",{type:"number",value:n.defaultCreditLimit,onChange:t=>p(r=>({...r,defaultCreditLimit:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit: (Standard)"}),e.jsx("input",{type:"number",value:n.defaultSettleLimit,onChange:t=>p(r=>({...r,defaultSettleLimit:t.target.value}))})]})]}),(o==="agent"||o==="super_agent")&&(()=>{const t=parseFloat(n.agentPercent)||0,r=parseFloat(he)||0,i=t+r,a=(()=>{const C=String(n.agentId||"").trim();if(!S||!C)return!1;const _=$e(S,C);if(_.length<2)return!1;const E=K(S?.role);if(E==="master_agent"||E==="super_agent")return!0;for(let R=1;R<_.length-1;R++){const F=ue(S,_[R]);if(F&&Z(F))return!0}return!1})(),m=i!==100&&a,h=m&&parseFloat(xe)||0,b=G.reduce((C,_)=>C+(parseFloat(_.percent)||0),0),c=t+r+h+b,y=100-c,g=c===100?"#16a34a":c>100?"#ef4444":"#f59e0b",A=String(n.agentId||"").trim()&&re?String(re.username||"").toUpperCase():String(de||"").toUpperCase()||"HIRING AGENT",Ue=S&&String(S.username||"").toUpperCase()||"ADMIN";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"commission-split-header",children:[e.jsx("span",{className:"commission-split-title",children:"Commission Split"}),e.jsxs("span",{className:"commission-split-total",style:{color:g},children:[c.toFixed(2),"%",c===100?" ✓":c>100?" over":" / 100%"]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Agent % ",e.jsx("span",{className:"commission-name-tag",children:String(n.username||"").toUpperCase()||"NEW AGENT"})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 90",value:n.agentPercent,onChange:C=>p(_=>({..._,agentPercent:C.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Hiring Agent % ",e.jsx("span",{className:"commission-name-tag",children:A})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:he,onChange:C=>ve(C.target.value)})]}),m&&e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent % ",e.jsx("span",{className:"commission-name-tag",children:Ue})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:xe,onChange:C=>Ae(C.target.value)})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Player Rate ($)"}),e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"e.g. 25",value:n.playerRate,onChange:C=>p(_=>({..._,playerRate:C.target.value}))})]})]}),m&&(c<100&&G.every(E=>E.percent!=="")?[...G,{id:`new-${Date.now()}`,name:"",percent:"",isNew:!0}]:G).map((E,R)=>e.jsxs("div",{className:"customer-create-row commission-extra-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-4",children:[e.jsxs("label",{children:["Sub Agent ",R+1," Name"]}),e.jsx("input",{type:"text",placeholder:"Username",value:E.name,onChange:F=>{if(E.isNew)ee(M=>[...M,{id:Date.now(),name:F.target.value,percent:""}]);else{const M=[...G];M[R]={...M[R],name:F.target.value},ee(M)}}})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent ",R+1," %"]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"%",value:E.percent,onChange:F=>{if(E.isNew)ee(M=>[...M,{id:Date.now(),name:"",percent:F.target.value}]);else{const M=[...G];M[R]={...M[R],percent:F.target.value},ee(M)}}})]}),e.jsx("div",{className:"filter-group customer-field-span-2 commission-remove-cell",children:!E.isNew&&e.jsx("button",{type:"button",className:"commission-remove-btn",onClick:()=>ee(F=>F.filter((M,At)=>At!==R)),children:"Remove"})})]},E.id)),m&&c<100&&e.jsx("div",{className:"commission-add-row",children:e.jsxs("span",{className:"commission-remaining",style:{color:g},children:[y.toFixed(2),"% remaining"]})})]})})()]}),e.jsxs("aside",{className:"customer-create-sidebar",children:[e.jsxs("div",{className:"customer-create-side-card customer-create-actions",children:[e.jsx("button",{className:"btn-primary",onClick:Oe,disabled:!gt,children:P?"Deploying...":`Create ${o==="player"?"Player":o==="agent"?"Agent":"Master Agent"}`}),e.jsx("button",{type:"button",className:"btn-secondary customer-copy-button",onClick:()=>{navigator.clipboard.writeText(Ot(o,n)).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]}),(u==="admin"||u==="master_agent"||u==="super_agent"||u==="agent")&&e.jsxs("div",{className:"customer-create-side-card customer-create-import-panel",children:[e.jsx("label",{children:"Import Players (.xlsx / .csv)"}),e.jsx("input",{type:"file",accept:".xlsx,.csv",onChange:t=>{const r=t.target.files?.[0]||null;se(r),W(r?.name||"")}}),w&&e.jsxs("small",{className:"customer-import-file-name",children:["Selected file: ",w]}),e.jsxs("label",{className:"customer-import-toggle",children:[e.jsx("input",{type:"checkbox",checked:H,onChange:t=>ie(t.target.checked)}),e.jsx("span",{children:u==="agent"?"Assign all imported players to me":"Assign all imported players to selected agent"})]}),H&&u!=="agent"&&e.jsxs("select",{value:le,onChange:t=>z(t.target.value),style:{width:"100%",padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:"4px",fontSize:"13px",marginTop:"4px"},children:[e.jsx("option",{value:"",children:"— Select agent —"}),j.filter(t=>{const r=String(t.role||"").toLowerCase();return r==="agent"||r==="master_agent"||r==="super_agent"}).sort((t,r)=>String(t.username||"").localeCompare(String(r.username||""))).map(t=>{const r=String(t.id||""),i=String(t.role||"").toLowerCase()==="agent"?"Agent":"Master Agent";return e.jsxs("option",{value:r,children:[String(t.username||r).toUpperCase()," (",i,")"]},r)})]}),e.jsx("button",{type:"button",className:"btn-primary",onClick:ct,disabled:!X||q,children:q?"Importing...":"Import File"})]})]})]}),e.jsx("style",{children:`
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
          `})]})]})}function Ht({onBack:s}){const[l,f]=d.useState(!0),[x,j]=d.useState("player"),[v,I]=d.useState(()=>String(localStorage.getItem("userRole")||"admin").toLowerCase());d.useEffect(()=>{(async()=>{const k=localStorage.getItem("token")||sessionStorage.getItem("token");if(k)try{const P=await Qe(k);P?.role&&I(String(P.role).toLowerCase())}catch(P){console.error("Failed to load add-customer role context:",P)}})()},[]);const J=["admin","super_agent","master_agent"].includes(v),B=U=>{j(U),f(!1)},N=()=>e.jsx("div",{className:"picker-overlay",onClick:()=>f(!1),children:e.jsxs("div",{className:"picker-modal",onClick:U=>U.stopPropagation(),children:[e.jsxs("div",{className:"picker-header",children:[e.jsx("span",{children:"Add Customer"}),e.jsx("button",{type:"button",onClick:()=>f(!1),children:"×"})]}),e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>B("player"),children:[e.jsx("i",{className:"fa-solid fa-user-plus"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Player"}),e.jsx("p",{children:"Create or import player accounts."})]})]}),J&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>B("agent"),children:[e.jsx("i",{className:"fa-solid fa-user-gear"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Agent"}),e.jsx("p",{children:"Create a new agent account."})]})]}),J&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>B("super_agent"),children:[e.jsx("i",{className:"fa-solid fa-user-tie"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Master"}),e.jsx("p",{children:"Create a master agent account."})]})]})]})});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Add Customer"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:s&&e.jsx("button",{type:"button",className:"btn-secondary",onClick:s,children:"Back"})})]}),e.jsx("div",{className:"view-content",children:e.jsx(Dt,{initialType:x})}),l&&N(),e.jsx("style",{children:`
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
      `})]})}export{Ht as default};
