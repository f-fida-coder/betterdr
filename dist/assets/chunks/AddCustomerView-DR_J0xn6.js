import{r as d,j as e}from"./vendor-react-Bd2HVIcR.js";import{y as Ze,F as Ee,C as Re,G as Be,L as ue,aK as Ct,aL as It,Y as Ge,aM as Ve,aN as Pt,z as Lt}from"./app-api-CI6rA5Ra.js";import{av as Mt,aO as Qe,aP as Ut,aQ as Tt}from"./utils-shared-uibEzEgX.js";import{a as Et}from"./contexts-shared-DHk73sOk.js";import"./vendor-common-_eGvg4ul.js";import"./dashboard-views-BUQaf6A_.js";import"./scoreboard-views-D7bHjW-6.js";const $e=o=>{const c=String(o||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!c)return"";const u=c.match(/^[A-Z]+/);return u&&u[0]?u[0]:c.replace(/\d+$/,"")||c},Rt=o=>o?`FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`:`FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`,Bt=new Set(["admin","agent","master_agent","super_agent"]),$t=o=>!Bt.has(String(o?.role||"").trim().toLowerCase()),V=o=>String(o||"").trim().toLowerCase(),O=o=>String(o||"").trim(),Ft=new Set(["admin","agent","master_agent","super_agent"]),je=o=>String(o?.nodeType||"").trim().toLowerCase()==="player"?!1:Ft.has(V(o?.role)),G=o=>{const c=V(o?.role);return c==="master_agent"||c==="super_agent"},ve=o=>V(o?.role)==="agent",Ke=o=>{if(!je(o))return null;const c=Array.isArray(o.children)?o.children.map(u=>Ke(u)).filter(Boolean):[];return{...o,id:O(o.id),children:c}},ge=(o,c)=>{const u=O(c);if(!u||!o)return null;if(O(o.id)===u)return o;const w=Array.isArray(o.children)?o.children:[];for(const S of w){const C=ge(S,u);if(C)return C}return null},Fe=(o,c)=>{const u=O(c);if(!u||!o)return[];const w=O(o.id);if(w===u)return[w];const S=Array.isArray(o.children)?o.children:[];for(const C of S){const A=Fe(C,u);if(A.length>0)return[w,...A]}return[]},_e=(o,c,u=!0,w=0,S=[])=>(o&&((u||w>0)&&c(o,w)&&S.push(o),(Array.isArray(o.children)?o.children:[]).forEach(A=>_e(A,c,!0,w+1,S))),S),_t=o=>{const c=V(o?.role);return c==="master_agent"?"MASTER":c==="super_agent"?"SUPER":c==="agent"?"AGENT":c==="admin"?"ADMIN":c?c.replace(/_/g," ").toUpperCase():"ACCOUNT"},zt=o=>V(o?.role).replace(/_/g,"-")||"account",Ot=o=>{const c=String(o?.username||"").toLowerCase(),w=V(o?.role).replace(/_/g," ");return`${c} ${w}`.trim()},ze=(o,c)=>{const u=String(c||"").trim().toLowerCase();return!u||Ot(o).includes(u)?!0:(Array.isArray(o?.children)?o.children:[]).some(w=>ze(w,u))};function Dt({rootNode:o,loading:c=!1,error:u="",searchQuery:w="",onSearchQueryChange:S,expandedNodes:C,onToggleNode:A,onSelectNode:Q,onSelectDirect:R,selectedNodeId:Z="",directSelected:j=!1,selectionMode:I="player",searchPlaceholder:P="Search accounts...",emptyLabel:K="No matching accounts"}){const D=String(w||"").trim().toLowerCase(),fe=D!==""||c||u,ne=(b,J=0,U=!1)=>{if(!b||!je(b)||I==="master"&&!U&&!G(b)||D&&!ze(b,D))return null;if(I==="player"&&!ve(b)){const se=(Array.isArray(b.children)?b.children:[]).filter(je).map(le=>ne(le,J,!1));return se.some(Boolean)?e.jsx(e.Fragment,{children:se}):null}const q=O(b.id),B=(Array.isArray(b.children)?b.children:[]).filter(_=>je(_)&&(I!=="master"||G(_))),L=B.length>0&&(U||G(b)),X=D?!0:C.has(q),ee=I==="player"?ve(b):U?typeof R=="function":G(b),xe=U?j:Z!==""&&Z===q;return e.jsxs("div",{className:"assignment-tree-branch",children:[e.jsxs("div",{className:`tree-node ${U?"root-node":""} assignment-tree-row ${xe?"selected":""} ${ee?"selectable":""}`,style:U?void 0:{paddingLeft:`${16+J*20}px`},children:[e.jsx("button",{type:"button",className:`assignment-tree-toggle-btn ${L?"":"is-spacer"}`,onClick:()=>{L&&A?.(q)},"aria-label":L?X?"Collapse branch":"Expand branch":"No child accounts",disabled:!L,children:L?X?"−":"+":""}),e.jsxs("button",{type:"button",className:"assignment-tree-node-btn",onClick:()=>{if(ee){if(U&&typeof R=="function"){R(b);return}Q?.(b);return}L&&A?.(q)},children:[e.jsx("span",{className:"node-name",children:String(b.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${zt(b)}`,children:_t(b)})]})]}),L&&X&&B.length>0&&e.jsx("div",{className:"node-children assignment-tree-children",children:B.map(_=>ne(_,J+1,!1))})]},`${q||"root"}-${J}`)},oe=!!o&&ze(o,D);return e.jsxs("div",{className:"assignment-tree-picker",children:[e.jsxs("div",{className:"search-pill assignment-tree-search-pill",children:[e.jsx("span",{className:"pill-label",children:"Tree"}),e.jsx("input",{type:"text",placeholder:P,value:w,onChange:b=>S?.(b.target.value)})]}),fe&&e.jsx("div",{className:"assignment-tree-results-dropdown",children:e.jsx("div",{className:"tree-scroll-area assignment-tree-scroll-area",children:c?e.jsx("div",{className:"tree-loading",children:"Loading hierarchy..."}):u?e.jsx("div",{className:"tree-error",children:u}):oe?ne(o,0,!0):e.jsx("div",{className:"tree-loading",children:K})})}),e.jsx("style",{children:`
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
      `})]})}const qt=(o,c)=>{const u=c.password||"N/A";if(o==="player")return`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${c.username}
Password: ${u}
Min bet: $${c.minBet||25}
Max bet: $${c.maxBet||200}
Credit: $${c.creditLimit||1e3}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${Rt(!!c.grantStartingFreeplay)}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;const w=o==="agent"?"Agent":"Master Agent",S=o==="agent"?`
Standard Min bet: $${c.defaultMinBet||25}
Standard Max bet: $${c.defaultMaxBet||200}
Standard Credit: $${c.defaultCreditLimit||1e3}
`:"";return`Welcome to the team! Here’s your ${w} administrative account info.

Login: ${c.username}
Password: ${u}
${S}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`};function Wt({initialType:o="player"}){const{showToast:c}=Et(),u=(t,r,n)=>{let a;const s=new Promise((g,h)=>{a=setTimeout(()=>h(new Error(n)),Math.max(1e3,r))});return Promise.race([t,s]).finally(()=>clearTimeout(a))},[w,S]=d.useState([]),[C,A]=d.useState([]),[Q,R]=d.useState(!0),[Z,j]=d.useState(""),[I,P]=d.useState(null),[K,D]=d.useState(!1),[fe,ne]=d.useState(!1),[oe,b]=d.useState(null),[J,U]=d.useState(""),[q,B]=d.useState(""),[L,X]=d.useState([]),[ee,xe]=d.useState(!0),[_,se]=d.useState(""),[le,Ae]=d.useState([]),[i,m]=d.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),[Je,Xe]=d.useState({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),[he,ke]=d.useState(""),[ye,Ce]=d.useState(""),[W,te]=d.useState([]),[be,Ie]=d.useState(""),[l,Oe]=d.useState(o||"player"),[f,et]=d.useState("admin"),[tt,rt]=d.useState(!1),[at,ce]=d.useState(""),[we,Y]=d.useState(""),[nt,z]=d.useState(!1),[de,st]=d.useState(""),[pe,it]=d.useState(""),[N,Se]=d.useState(null),[ot,Pe]=d.useState(!1),[lt,Ne]=d.useState(""),[ct,ie]=d.useState(()=>new Set),Le=async(t,r)=>{if(V(r)==="agent")return Se(null),Ne(""),ie(new Set),Pe(!1),null;try{Pe(!0);const a=await Lt(t),s=a?.root?Ke({...a.root,children:Array.isArray(a.tree)?a.tree:[]}):null;return Se(s),Ne(""),ie(new Set),s}catch(a){return console.error("Failed to load assignment hierarchy:",a),Se(null),Ne(a?.message||"Failed to load hierarchy"),ie(new Set),null}finally{Pe(!1)}};d.useEffect(()=>{(async()=>{try{R(!0);const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(!r){S([]),A([]),Se(null),Ne(""),ie(new Set),j("Please login to load users.");return}const n=String(localStorage.getItem("userRole")||"").toLowerCase();let a=null;try{a=await Ze(r,{timeoutMs:3e4})}catch(g){console.warn("CustomerCreationWorkspace: getMe failed, falling back to stored role.",g)}const s=String(a?.role||n||"admin").toLowerCase();if(et(s),st(a?.username||""),it(a?.id||""),rt(!!a?.viewOnly),s==="agent"){const g=await Ee(r);S(g||[]),A([]),await Le(r,s)}else{const[g,h]=await Promise.all([Re(r),Be(r)]);S(g||[]),A(h||[]),await Le(r,s)}if(j(""),a?.username)try{const g=$e(a.username);if(!g)return;const{nextUsername:h}=await ue(g,r,{type:"player"});m(p=>({...p,username:h}))}catch(g){console.error("Failed to prefetch next username:",g)}}catch(r){console.error("Error fetching add-customer context:",r),j("Failed to load users: "+r.message)}finally{R(!1)}})()},[]),d.useEffect(()=>{if(!o||o===l)return;(async()=>await qe(o))()},[o]);const De=async({overrideDuplicate:t=!1}={})=>{const r=n=>{j(n),c(n,"error",{position:"bottom"})};try{D(!0),t||P(null),j("");const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!n){r("Please login to create users.");return}if(!String(i.username||"").trim()||!String(i.firstName||"").trim()||!String(i.lastName||"").trim()||!String(i.phoneNumber||"").trim()||!String(i.password||"").trim()){r("Username, first name, last name, phone number, and password are required.");return}if(l==="player"){if(String(i.minBet??"").trim()===""||String(i.maxBet??"").trim()===""||String(i.creditLimit??"").trim()===""||String(i.balanceOwed??"").trim()===""){r("Min bet, max bet, credit limit, and settle limit are required for players.");return}if(f!=="agent"&&!String(i.agentId||"").trim()){r("Please assign this player to a regular Agent.");return}}const s={...i,apps:Je};t&&(s.allowDuplicateSave=!0),s.balance===""&&delete s.balance,l!=="player"?(delete s.referredByUserId,delete s.grantStartingFreeplay,delete s.minBet,delete s.maxBet,delete s.creditLimit,delete s.balanceOwed,l==="super_agent"&&(delete s.defaultMinBet,delete s.defaultMaxBet,delete s.defaultCreditLimit,delete s.defaultSettleLimit)):s.referredByUserId||delete s.referredByUserId,(l==="agent"||l==="super_agent")&&s.agentId&&(s.parentAgentId=s.agentId),l==="agent"||l==="super_agent"?(s.agentPercent!==""?s.agentPercent=parseFloat(s.agentPercent):delete s.agentPercent,s.playerRate!==""?s.playerRate=parseFloat(s.playerRate):delete s.playerRate,he!==""&&(s.hiringAgentPercent=parseFloat(he)),ye!==""&&(s.subAgentPercent=parseFloat(ye)),W.length>0&&(s.extraSubAgents=W.filter(y=>y.name.trim()!==""||y.percent!=="").map(y=>({name:y.name.trim(),percent:parseFloat(y.percent)||0})))):(delete s.agentPercent,delete s.playerRate);let g=null;l==="player"?f==="agent"||f==="super_agent"||f==="master_agent"?g=await Ct(s,n):g=await It(s,n):l==="agent"?f==="admin"?g=await Ge({...s,role:"agent"},n):g=await Ve({...s,role:"agent"},n):l==="super_agent"&&(f==="admin"?g=await Ge({...s,role:"master_agent"},n):g=await Ve({...s,role:"master_agent"},n));const h=l;j(""),P(null),B(""),X([]),Xe({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),m({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",defaultMinBet:"",defaultMaxBet:"",defaultCreditLimit:"",defaultSettleLimit:"",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),Oe(h),ce(""),ke(""),Ce(""),te([]),z(!1),b(null),U(""),se(""),Ae([]),xe(!0);const v=h==="player"?"Player":h==="agent"?"Agent":"Master Agent",x=g?.assigned?`${v} assigned successfully.`:`${v} created successfully.`;if(B(x),c(x,"success",{position:"bottom"}),f==="agent"){const y=await Ee(n);S(y||[])}else{const[y,me]=await Promise.all([Re(n),Be(n)]);S(y||[]),A(me||[]),await Le(n,f)}}catch(n){console.error("Create user failed:",n);const a=Array.isArray(n?.duplicateMatches)?n.duplicateMatches:Array.isArray(n?.details?.matches)?n.details.matches:[],s=n?.isDuplicate===!0||n?.duplicate===!0||n?.code==="DUPLICATE_PLAYER"||n?.details?.duplicate===!0;P(s?{message:n?.message||"Likely duplicate player detected.",matches:a}:null),r(n.message||"Failed to create user")}finally{D(!1)}},dt=async()=>{try{ne(!0),j(""),B(""),X([]),Ae([]);const t=localStorage.getItem("token")||sessionStorage.getItem("token");if(!t){j("Please login to import users.");return}if(!oe){j("Please choose an Excel/CSV file first.");return}if(ee&&(f==="admin"||f==="master_agent"||f==="super_agent")&&!_){j("Select an agent to assign imported players to, or uncheck the assignment option.");return}const r=await u(Pt(oe,t,{defaultAgentId:_||"",timeoutMs:45e3,forceAgentAssignment:ee}),5e4,"Import request timed out. Please try again."),n=Array.isArray(r?.createdRows)?r.createdRows.length:0,a=Number(r?.created),s=Number(r?.failed),g=Number.isFinite(a)?a:n,h=Number.isFinite(s)?s:0,p=String(r?.message||"").trim();!Number.isFinite(a)&&!Number.isFinite(s)?B(p||`Import complete: ${g} created, ${h} failed.`):B(`Import complete: ${g} created, ${h} failed.${p?` ${p}`:""}`);const v=Array.isArray(r?.createdRows)?r.createdRows.map(x=>String(x?.username||"").toUpperCase()).filter(Boolean):[];X(v),Ae(Array.isArray(r?.errors)?r.errors:[]),b(null),U(""),se("");try{if(f==="agent"){const x=await u(Ee(t),15e3,"Players refresh timed out");S(x||[])}else{const[x,y]=await Promise.all([u(Re(t),15e3,"Users refresh timed out"),u(Be(t),15e3,"Agents refresh timed out")]);S(x||[]),A(y||[])}}catch(x){console.warn("Post-import refresh failed:",x),B(y=>`${y} Imported, but refresh failed: ${x.message||"please reload page."}`)}}catch(t){console.error("Import users failed:",t),j(t.message||"Failed to import users")}finally{ne(!1)}},pt=async t=>{const r=t.toUpperCase().replace(/[^A-Z0-9]/g,"");if(m(n=>({...n,agentPrefix:r})),Ie(""),r.length>=2){const n=l==="super_agent";if(C.some(p=>{const v=String(p.role||"").toLowerCase();return n!==(v==="master_agent"||v==="super_agent")?!1:String(p.username||"").toUpperCase().replace(/MA$/,"").replace(/\d+$/,"")===r})){Ie(`Prefix "${r}" is already taken`);return}const s=localStorage.getItem("token")||sessionStorage.getItem("token"),g=l==="super_agent"?"MA":"",h=l==="agent"?i.agentId||(f==="master_agent"||f==="super_agent"?pe:""):"";try{const p={suffix:g,type:"agent"};h&&(p.agentId=h);const{nextUsername:v}=await ue(r,s,p);m(x=>({...x,username:v}))}catch(p){console.error("Failed to get next username from prefix:",p)}}else m(n=>({...n,username:""}))},Me=async(t,r=null)=>{const n=localStorage.getItem("token")||sessionStorage.getItem("token");if(!n)return;m(h=>({...h,agentId:t,referredByUserId:""})),ce("");const a=l==="player"?"player":"agent",s=l==="super_agent"?"MA":"",g=l==="agent"||l==="super_agent";if(t){const h=r||C.find(p=>p.id===t);if(h)try{const p=g&&i.agentPrefix?i.agentPrefix:$e(h.username);if(!p){m(y=>({...y,username:""}));return}const v=a==="player"?{suffix:s,type:a,agentId:t}:{suffix:s,type:a,...l==="agent"?{agentId:t}:{}},{nextUsername:x}=await ue(p,n,v);m(y=>({...y,username:x,agentPrefix:g&&y.agentPrefix?y.agentPrefix:p}))}catch(p){console.error("Failed to get next username:",p)}}else{if(l==="player"&&(f==="admin"||xt)){m(p=>({...p,username:""}));return}const h=g&&i.agentPrefix?i.agentPrefix:de?$e(de):"";if(h)try{const p={suffix:s,type:a};a==="agent"&&l==="agent"&&(f==="master_agent"||f==="super_agent")&&pe&&(p.agentId=pe);const{nextUsername:v}=await ue(h,n,p);m(x=>({...x,username:v,agentPrefix:g&&x.agentPrefix?x.agentPrefix:h}))}catch(p){console.error("Failed to fetch username for admin:",p),m(v=>({...v,username:""}))}else m(p=>({...p,username:""}))}},qe=async t=>{Oe(t),Ie(""),ce(""),ke(""),Ce(""),te([]),m(n=>({...n,agentPercent:"",playerRate:""}));const r=localStorage.getItem("token")||sessionStorage.getItem("token");if(r)if(t==="super_agent"||t==="agent"){const n=String(i.agentId||"").trim(),a=n?ge(N,n):null,s=!!(a&&G(a)),g=s?n:"";s||m(x=>({...x,agentId:"",parentAgentId:""})),Y(""),z(!1),m(x=>({...x,referredByUserId:""}));const h=t==="super_agent"?"MA":"",p=i.agentPrefix,v="agent";if(p)try{const x={suffix:h,type:v};t==="agent"&&g?x.agentId=g:t==="agent"&&(f==="master_agent"||f==="super_agent")&&pe&&(x.agentId=pe);const{nextUsername:y}=await ue(p,r,x);m(me=>({...me,username:y,agentPrefix:p}))}catch(x){console.error("Failed to re-fetch username on type change",x)}else m(x=>({...x,username:""}))}else await Me(""),z(!1),m(n=>({...n,referredByUserId:""}))},Ue=(t,r,n)=>{const a=Tt(t,r,n,i.username);m(s=>({...s,password:a}))},mt=t=>{const r=Qe(t);m(n=>{const a={...n,firstName:r};return Ue(r,a.lastName,a.phoneNumber),a})},ut=t=>{const r=Qe(t);m(n=>{const a={...n,lastName:r};return Ue(a.firstName,r,a.phoneNumber),a})},gt=t=>{const r=Ut(t);m(n=>{const a={...n,phoneNumber:r};return Ue(a.firstName,a.lastName,r),a})},ft=!tt&&!K&&!!String(i.username||"").trim()&&!!String(i.firstName||"").trim()&&!!String(i.lastName||"").trim()&&!!String(i.phoneNumber||"").trim()&&!!String(i.password||"").trim()&&(l!=="player"||f==="agent"||!!String(i.agentId||"").trim())&&(l!=="player"||String(i.minBet??"").trim()!==""&&String(i.maxBet??"").trim()!==""&&String(i.creditLimit??"").trim()!==""&&String(i.balanceOwed??"").trim()!=="")&&!be,xt=f==="master_agent"||f==="super_agent",re=l==="agent"||l==="super_agent";d.useMemo(()=>N?l==="player"?_e(N,(t,r)=>r>0&&ve(t),!1):_e(N,(t,r)=>r>0&&G(t),!1):[],[N,l]);const ae=d.useMemo(()=>{if(!N)return null;const t=String(i.agentId||"").trim();return t?ge(N,t):re?N:null},[N,i.agentId,re]),ht=d.useMemo(()=>{if(l==="player")return ae?String(ae.username||"").toUpperCase():"Select an agent";if(!String(i.agentId||"").trim()){const t=String(N?.username||de||"").trim().toUpperCase();return t?`${t} (ME)`:"DIRECT (CREATED BY ME)"}return ae?String(ae.username||"").toUpperCase():"Select a master agent"},[l,ae,i.agentId,N,de]),yt=re?"Search master agents or agents...":"Search agents...",bt=re?"No matching master-agent branches":"No matching agents",wt=t=>{const r=O(t);r&&ie(n=>{const a=new Set(n);return a.has(r)?a.delete(r):a.add(r),a})},St=t=>{const r=O(t);!r||!N||ie(n=>{const a=new Set(n);return Fe(N,r).forEach(g=>a.add(g)),a})},Nt=async t=>{const r=O(t?.id);r&&(St(r),await Me(r,t))},jt=async t=>{await Me("",t)};d.useEffect(()=>{const t=String(i.agentId||"").trim();if(!t)return;const r=ge(N,t);(l==="player"?r&&ve(r):r&&G(r))||(m(a=>String(a.agentId||"").trim()?{...a,agentId:"",parentAgentId:""}:a),ce(""))},[N,l,i.agentId]);const We=(()=>{const t=Mt(w.filter($t));return l!=="player"&&l!=="agent"&&l!=="super_agent"?[]:f==="agent"?t:i.agentId?t.filter(r=>String(r.agentId?.id||r.agentId||"")===String(i.agentId)):t})(),H=d.useMemo(()=>We.map(t=>{const r=String(t.id||"").trim(),n=String(t.username||"").trim(),a=String(t.fullName||"").trim();if(!r||!n)return null;const s=`${n.toUpperCase()}${a?` - ${a}`:""}`;return{id:r,label:s,labelLower:s.toLowerCase(),usernameLower:n.toLowerCase(),isDuplicatePlayer:!!t.isDuplicatePlayer}}).filter(Boolean),[We]),Ye=d.useMemo(()=>{const t=String(we||"").trim().toLowerCase();return t?H.filter(r=>r.labelLower.includes(t)||r.usernameLower.includes(t)).slice(0,20):H.slice(0,20)},[H,we]),Te=d.useMemo(()=>{const t=String(i.referredByUserId||"").trim();return t&&H.find(r=>r.id===t)||null},[i.referredByUserId,H]);d.useEffect(()=>{if(Te){Y(Te.label);return}String(i.referredByUserId||"").trim()||Y("")},[Te,i.referredByUserId]);const vt=t=>{Y(t);const r=String(t||"").trim().toLowerCase();if(!r){m(a=>({...a,referredByUserId:""}));return}const n=H.find(a=>a.labelLower===r||a.usernameLower===r);m(a=>({...a,referredByUserId:n?n.id:""}))},At=()=>{const t=String(we||"").trim().toLowerCase();if(!t){m(a=>({...a,referredByUserId:""}));return}const r=H.find(a=>a.labelLower===t||a.usernameLower===t);if(r){Y(r.label),m(a=>({...a,referredByUserId:r.id}));return}const n=H.filter(a=>a.labelLower.includes(t)||a.usernameLower.includes(t));if(n.length===1){Y(n[0].label),m(a=>({...a,referredByUserId:n[0].id}));return}m(a=>({...a,referredByUserId:""}))},He=t=>{if(!t){Y(""),m(r=>({...r,referredByUserId:""})),z(!1);return}Y(t.label),m(r=>({...r,referredByUserId:t.id})),z(!1)};return e.jsxs(e.Fragment,{children:[Q&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading setup..."})]}),!Q&&e.jsxs(e.Fragment,{children:[Z&&e.jsxs("div",{className:"error-state",role:"alert",children:[e.jsx("i",{className:"fa-solid fa-circle-exclamation"}),e.jsx("span",{children:Z})]}),I&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:I.message}),I.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:I.matches.map((t,r)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(t.username||"UNKNOWN")}),e.jsx("span",{children:String(t.fullName||"No name")}),e.jsx("span",{children:String(t.phoneNumber||"No phone")})]},`${t.id||t.username||"duplicate"}-${r}`))}),e.jsxs("div",{className:"duplicate-warning-actions",children:[e.jsx("button",{type:"button",className:"duplicate-warning-cancel",onClick:()=>{P(null),j("")},disabled:K,children:"Cancel"}),e.jsx("button",{type:"button",className:"duplicate-warning-confirm",onClick:()=>De({overrideDuplicate:!0}),disabled:K,children:K?"Creating…":"Create Anyway"})]})]}),q&&e.jsxs("div",{className:"success-state",children:[e.jsx("i",{className:"fa-solid fa-circle-check"}),e.jsx("span",{children:q})]}),L.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",L.slice(0,20).join(", "),L.length>20?` (+${L.length-20} more)`:""]}),le.length>0&&e.jsxs("div",{style:{marginTop:"8px",background:"#fff5f5",border:"1px solid #feb2b2",borderRadius:"6px",padding:"10px 14px"},children:[e.jsxs("strong",{style:{color:"#c53030",fontSize:"13px"},children:["Failed rows (",le.length,") — re-importing will retry these safely:"]}),e.jsx("ul",{style:{margin:"6px 0 0 0",padding:"0 0 0 16px",fontSize:"12px",color:"#742a2a",maxHeight:"160px",overflowY:"auto"},children:le.map((t,r)=>e.jsxs("li",{children:["Row ",t.row,t.username?` (${String(t.username).toUpperCase()})`:"",": ",t.error||t.reason||"Unknown error"]},r))})]}),e.jsxs("div",{className:"customer-create-shell",children:[e.jsxs("div",{className:"customer-create-main",children:[e.jsxs("div",{className:"customer-create-top-row",children:[e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-type",children:[e.jsx("label",{children:"Type"}),e.jsx("div",{className:"s-wrapper",children:e.jsxs("select",{value:l,onChange:t=>qe(t.target.value),children:[e.jsx("option",{value:"player",children:"Player"}),(f==="admin"||f==="super_agent"||f==="master_agent")&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"super_agent",children:"Master Agent"})]})]})})]}),(l==="agent"||l==="super_agent")&&e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-prefix",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:i.agentPrefix,onChange:t=>pt(t.target.value),placeholder:"Enter prefix",maxLength:5,style:be?{borderColor:"#ef4444",boxShadow:"0 0 0 2px rgba(239,68,68,0.15)"}:void 0}),be&&e.jsx("span",{style:{color:"#ef4444",fontSize:12,fontWeight:600,marginTop:4},children:be})]}),(l==="player"||l==="agent"||l==="super_agent")&&(f==="admin"||f==="super_agent"||f==="master_agent")&&e.jsxs("div",{className:"filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment",children:[e.jsxs("label",{className:"assignment-field-label",children:[e.jsx("span",{children:l==="player"?"Assign to Agent":"Assign to Master Agent"}),e.jsx("span",{className:"assignment-selected-chip",children:ht})]}),e.jsx(Dt,{rootNode:N,loading:ot,error:lt,searchQuery:at,onSearchQueryChange:ce,expandedNodes:ct,onToggleNode:wt,onSelectNode:Nt,onSelectDirect:re?jt:null,selectedNodeId:String(i.agentId||""),directSelected:re&&!String(i.agentId||"").trim(),selectionMode:re?"master":"player",searchPlaceholder:yt,emptyLabel:bt})]}),e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-username",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:i.username,placeholder:"Auto-generated",readOnly:!0,className:"readonly-input"})]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:i.firstName,onChange:t=>mt(t.target.value),placeholder:"Enter first name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:i.lastName,onChange:t=>ut(t.target.value),placeholder:"Enter last name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:i.phoneNumber,onChange:t=>gt(t.target.value),placeholder:"User contact"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Password ",e.jsx("span",{className:"locked-chip",children:"Locked"})]}),e.jsx("input",{type:"text",value:i.password.toUpperCase(),readOnly:!0,className:"readonly-input",placeholder:"Auto-generated from name + phone"})]})]}),l==="player"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:i.minBet,onChange:t=>m(r=>({...r,minBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:i.maxBet,onChange:t=>m(r=>({...r,maxBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:i.creditLimit,onChange:t=>m(r=>({...r,creditLimit:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit:"}),e.jsx("input",{type:"number",value:i.balanceOwed,onChange:t=>m(r=>({...r,balanceOwed:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-12",children:[e.jsx("label",{children:"Referred By Player"}),e.jsxs("div",{className:"agent-search-picker referral-search-picker",onFocus:()=>z(!0),onBlur:()=>{setTimeout(()=>{At(),z(!1)},120)},tabIndex:0,children:[e.jsx("div",{className:"referral-search-head",children:e.jsx("input",{type:"text",value:we,onChange:t=>{vt(t.target.value),z(!0)},onFocus:()=>z(!0),placeholder:"Search player (leave blank for no referral)",autoComplete:"off"})}),nt&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${i.referredByUserId?"":"selected"}`,onMouseDown:t=>{t.preventDefault(),He(null)},children:e.jsx("span",{children:"No referral"})}),Ye.map(t=>e.jsxs("button",{type:"button",className:`agent-search-item ${String(i.referredByUserId||"")===String(t.id)?"selected":""} ${t.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:r=>{r.preventDefault(),He(t)},children:[e.jsx("span",{children:t.label}),t.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-badge",children:"Duplicate"})]},t.id)),Ye.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching players"})]})]}),e.jsx("div",{className:"player-referral-settings",children:e.jsx("div",{className:`player-freeplay-toggle ${i.grantStartingFreeplay?"is-selected":"is-unselected"}`,children:e.jsxs("label",{className:"player-freeplay-toggle-row",children:[e.jsx("input",{type:"checkbox",checked:!!i.grantStartingFreeplay,onChange:t=>m(r=>({...r,grantStartingFreeplay:t.target.checked}))}),e.jsx("span",{className:"player-freeplay-toggle-copy",children:e.jsx("span",{className:"player-freeplay-toggle-title",children:"$200 new player freeplay bonus"})})]})})})]})]}),l==="agent"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet: (Standard)"}),e.jsx("input",{type:"number",value:i.defaultMinBet,onChange:t=>m(r=>({...r,defaultMinBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet: (Standard)"}),e.jsx("input",{type:"number",value:i.defaultMaxBet,onChange:t=>m(r=>({...r,defaultMaxBet:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit: (Standard)"}),e.jsx("input",{type:"number",value:i.defaultCreditLimit,onChange:t=>m(r=>({...r,defaultCreditLimit:t.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit: (Standard)"}),e.jsx("input",{type:"number",value:i.defaultSettleLimit,onChange:t=>m(r=>({...r,defaultSettleLimit:t.target.value}))})]})]}),(l==="agent"||l==="super_agent")&&(()=>{const t=parseFloat(i.agentPercent)||0,r=parseFloat(he)||0,n=t+r,a=(()=>{const k=String(i.agentId||"").trim();if(!N||!k)return!1;const $=Fe(N,k);if($.length<2)return!1;const T=V(N?.role);if(T==="master_agent"||T==="super_agent")return!0;for(let E=1;E<$.length-1;E++){const F=ge(N,$[E]);if(F&&G(F))return!0}return!1})(),s=n!==100&&a,g=s&&parseFloat(ye)||0,h=W.reduce((k,$)=>k+(parseFloat($.percent)||0),0),p=t+r+g+h,v=100-p,x=p===100?"#16a34a":p>100?"#ef4444":"#f59e0b",y=String(i.agentId||"").trim()&&ae?String(ae.username||"").toUpperCase():String(de||"").toUpperCase()||"HIRING AGENT",me=N&&String(N.username||"").toUpperCase()||"ADMIN";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"commission-split-header",children:[e.jsx("span",{className:"commission-split-title",children:"Commission Split"}),e.jsxs("span",{className:"commission-split-total",style:{color:x},children:[p.toFixed(2),"%",p===100?" ✓":p>100?" over":" / 100%"]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Agent % ",e.jsx("span",{className:"commission-name-tag",children:String(i.username||"").toUpperCase()||"NEW AGENT"})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 90",value:i.agentPercent,onChange:k=>m($=>({...$,agentPercent:k.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Hiring Agent % ",e.jsx("span",{className:"commission-name-tag",children:y})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:he,onChange:k=>ke(k.target.value)})]}),s&&e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent % ",e.jsx("span",{className:"commission-name-tag",children:me})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:ye,onChange:k=>Ce(k.target.value)})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Player Rate ($)"}),e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"e.g. 25",value:i.playerRate,onChange:k=>m($=>({...$,playerRate:k.target.value}))})]})]}),s&&(p<100&&W.every(T=>T.percent!=="")?[...W,{id:`new-${Date.now()}`,name:"",percent:"",isNew:!0}]:W).map((T,E)=>e.jsxs("div",{className:"customer-create-row commission-extra-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-4",children:[e.jsxs("label",{children:["Sub Agent ",E+1," Name"]}),e.jsx("input",{type:"text",placeholder:"Username",value:T.name,onChange:F=>{if(T.isNew)te(M=>[...M,{id:Date.now(),name:F.target.value,percent:""}]);else{const M=[...W];M[E]={...M[E],name:F.target.value},te(M)}}})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent ",E+1," %"]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"%",value:T.percent,onChange:F=>{if(T.isNew)te(M=>[...M,{id:Date.now(),name:"",percent:F.target.value}]);else{const M=[...W];M[E]={...M[E],percent:F.target.value},te(M)}}})]}),e.jsx("div",{className:"filter-group customer-field-span-2 commission-remove-cell",children:!T.isNew&&e.jsx("button",{type:"button",className:"commission-remove-btn",onClick:()=>te(F=>F.filter((M,kt)=>kt!==E)),children:"Remove"})})]},T.id)),s&&p<100&&e.jsx("div",{className:"commission-add-row",children:e.jsxs("span",{className:"commission-remaining",style:{color:x},children:[v.toFixed(2),"% remaining"]})})]})})()]}),e.jsxs("aside",{className:"customer-create-sidebar",children:[e.jsxs("div",{className:"customer-create-side-card customer-create-actions",children:[e.jsx("button",{className:"btn-primary",onClick:De,disabled:!ft,children:K?"Deploying...":`Create ${l==="player"?"Player":l==="agent"?"Agent":"Master Agent"}`}),e.jsx("button",{type:"button",className:"btn-secondary customer-copy-button",onClick:()=>{navigator.clipboard.writeText(qt(l,i)).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]}),(f==="admin"||f==="master_agent"||f==="super_agent"||f==="agent")&&e.jsxs("div",{className:"customer-create-side-card customer-create-import-panel",children:[e.jsx("label",{children:"Import Players (.xlsx / .csv)"}),e.jsx("input",{type:"file",accept:".xlsx,.csv",onChange:t=>{const r=t.target.files?.[0]||null;b(r),U(r?.name||"")}}),J&&e.jsxs("small",{className:"customer-import-file-name",children:["Selected file: ",J]}),e.jsxs("label",{className:"customer-import-toggle",children:[e.jsx("input",{type:"checkbox",checked:ee,onChange:t=>xe(t.target.checked)}),e.jsx("span",{children:f==="agent"?"Assign all imported players to me":"Assign all imported players to selected agent"})]}),ee&&f!=="agent"&&e.jsxs("select",{value:_,onChange:t=>se(t.target.value),style:{width:"100%",padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:"4px",fontSize:"13px",marginTop:"4px"},children:[e.jsx("option",{value:"",children:"— Select agent —"}),C.filter(t=>{const r=String(t.role||"").toLowerCase();return r==="agent"||r==="master_agent"||r==="super_agent"}).sort((t,r)=>String(t.username||"").localeCompare(String(r.username||""))).map(t=>{const r=String(t.id||""),n=String(t.role||"").toLowerCase()==="agent"?"Agent":"Master Agent";return e.jsxs("option",{value:r,children:[String(t.username||r).toUpperCase()," (",n,")"]},r)})]}),e.jsx("button",{type:"button",className:"btn-primary",onClick:dt,disabled:!oe||fe,children:fe?"Importing...":"Import File"})]})]})]}),e.jsx("style",{children:`
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
            .error-state,
            .success-state {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              border-radius: 10px;
              padding: 12px 14px;
              margin-bottom: 10px;
              font-size: 13px;
              font-weight: 600;
              line-height: 1.45;
            }
            .error-state {
              border: 1px solid #fca5a5;
              border-left: 4px solid #dc2626;
              background: #fef2f2;
              color: #991b1b;
            }
            .error-state i {
              color: #dc2626;
              font-size: 15px;
              line-height: 1.3;
              flex-shrink: 0;
            }
            .success-state {
              border: 1px solid #86efac;
              border-left: 4px solid #16a34a;
              background: #f0fdf4;
              color: #166534;
            }
            .success-state i {
              color: #16a34a;
              font-size: 15px;
              line-height: 1.3;
              flex-shrink: 0;
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
          `})]})]})}function Jt({onBack:o}){const[c,u]=d.useState(!0),[w,S]=d.useState("player"),[C,A]=d.useState(()=>String(localStorage.getItem("userRole")||"admin").toLowerCase());d.useEffect(()=>{(async()=>{const I=localStorage.getItem("token")||sessionStorage.getItem("token");if(I)try{const P=await Ze(I);P?.role&&A(String(P.role).toLowerCase())}catch(P){console.error("Failed to load add-customer role context:",P)}})()},[]);const Q=["admin","super_agent","master_agent"].includes(C),R=j=>{S(j),u(!1)},Z=()=>e.jsx("div",{className:"picker-overlay",onClick:()=>u(!1),children:e.jsxs("div",{className:"picker-modal",onClick:j=>j.stopPropagation(),children:[e.jsxs("div",{className:"picker-header",children:[e.jsx("span",{children:"Add Customer"}),e.jsx("button",{type:"button",onClick:()=>u(!1),children:"×"})]}),e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>R("player"),children:[e.jsx("i",{className:"fa-solid fa-user-plus"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Player"}),e.jsx("p",{children:"Create or import player accounts."})]})]}),Q&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>R("agent"),children:[e.jsx("i",{className:"fa-solid fa-user-gear"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Agent"}),e.jsx("p",{children:"Create a new agent account."})]})]}),Q&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>R("super_agent"),children:[e.jsx("i",{className:"fa-solid fa-user-tie"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Master"}),e.jsx("p",{children:"Create a master agent account."})]})]})]})});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Add Customer"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:o&&e.jsx("button",{type:"button",className:"btn-secondary",onClick:o,children:"Back"})})]}),e.jsx("div",{className:"view-content",children:e.jsx(Wt,{initialType:w})}),c&&Z(),e.jsx("style",{children:`
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
      `})]})}export{Jt as default};
