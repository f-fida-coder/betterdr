import{r as l,j as e}from"./vendor-react-Bd2HVIcR.js";import{bj as Ha,C as Ms,am as fn,au as Ga,E as As,I as la,J as oa,bk as Ts,S as qa,bl as Bs,bm as Ws,bn as ca,aD as Es,O as bn,bo as Fs,av as _s,y as $s,aK as Os}from"./app-api-DfDI8Deg.js";import{L as yn,t as h,I as Rs,v as B,N as zs,J as da,K as jn,M as Is}from"./utils-shared-DbtEWpev.js";import"./vendor-common-_eGvg4ul.js";const vn={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},Nn=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],wn=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Us=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],Z=s=>String(s||"").trim().toLowerCase(),Xa=s=>String(s||"").trim().toUpperCase(),Ln=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),Ys=new Set([...Ln,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Vs=new Set(["bet_void","bet_void_admin","deleted_wager"]),Hs=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),Gs=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),qs=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),Za=s=>{const k=Z(s?.type),w=Xa(s?.reason),v=String(s?.description||"").toLowerCase();return k==="fp_deposit"||qs.has(w)||(k==="adjustment"||k==="fp_deposit")&&(v.includes("freeplay")||v.includes("free play"))},Js=s=>{const k=Z(s?.type),w=Xa(s?.reason);return k==="credit_adj"||k==="debit_adj"||Hs.has(w)},Ks=s=>{const k=Xa(s?.reason);return Gs.has(k)},Zs=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,Ja=s=>!s||typeof s!="object"?s:{...s,minBet:h(s.minBet??s.defaultMinBet,0),maxBet:h(s.maxBet??s.wagerLimit??s.defaultMaxBet,0),wagerLimit:h(s.wagerLimit??s.maxBet??s.defaultMaxBet,0),creditLimit:h(s.creditLimit??s.defaultCreditLimit,0),balanceOwed:h(s.balanceOwed??s.defaultSettleLimit,0),balance:h(s.balance,0),pendingBalance:h(s.pendingBalance,0),freeplayBalance:h(s.freeplayBalance,0),lifetime:h(s.lifetime,0),lifetimePlusMinus:h(s.lifetimePlusMinus??s.lifetime,0)},Sn=(s,k=0)=>s===""||s===null||s===void 0?h(k,0):h(s,0),kn=s=>String(s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Qa=s=>Z(s?.type)==="deleted_wager"?String(s?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":Is(s),Pn=s=>{const k=String(s?.description||"").trim();if(!k)return"—";const w=kn(k),v=kn(Qa(s));return!w||v&&(w===v||w===`${v}s`||`${w}s`===v)?"—":k},Cn=s=>String(s?.actorUsername??s?.deletedByUsername??"").trim()||"—",Dn=s=>{if(!s)return 0;const k=s?.$date||s,v=new Date(k).getTime();return Number.isNaN(v)?0:v},Qs=s=>{const k=Math.abs(Number(s?.amount||0)),w=String(s?.sport||"").trim(),v=String(s?.reason||"").trim(),O=String(s?.status||"deleted").trim().toLowerCase()||"deleted",F=[O==="restored"?"Changed Wager":"Deleted Wager"];return w&&F.push(`(${w})`),v&&F.push(`- ${v}`),{id:`deleted-wager-${String(s?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:s?.id||null,user:s?.user||"Unknown",userId:s?.userId||null,amount:k,date:s?.deletedAt||s?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:O,reason:v?v.toUpperCase().replace(/\s+/g,"_"):null,description:F.join(" ")}},Xs=s=>{const k=Z(s);return k==="betting_adjustments"||k==="credit_debit_adjustments"||k==="promotional_adjustments"?"adjustment":"all"},ei=(s,k)=>{const w=Z(k);if(w===""||w==="all"||w==="all_transactions")return!0;const v=Z(s?.type);return w==="non_wager"?!Ys.has(v):w==="deposit_withdrawal"?v==="deposit"||v==="withdrawal":w==="betting_adjustments"||w==="credit_debit_adjustments"?Js(s):w==="promotional_adjustments"?Ks(s):w==="freeplay_transactions"?Za(s):w==="wagers_only"?Ln.has(v):w==="deleted_changed"||w==="deleted_transactions"?Vs.has(v):!0},ai=s=>!s||typeof s!="object"?"":String(s.userId??s.playerId??s.user?.id??s.user?.id??"").trim(),ti=s=>!s||typeof s!="object"?"":String(s.user??s.username??s.playerUsername??s.playerName??"").trim().toLowerCase(),Ka=(s,k,w,v)=>{const O=ai(s);if(O!=="")return!!(O===String(k)||v?.id&&O===String(v.id));const Q=ti(s),F=String(w||"").trim().toLowerCase();return Q!==""&&F!==""?!!(Q===F||v?.username&&Q===String(v.username).trim().toLowerCase()):!0};function mi({userId:s,onBack:k,onNavigateToUser:w,role:v="admin",viewContext:O=null}){const[Q,F]=l.useState(!0),[et,at]=l.useState(!1),[tt,A]=l.useState(""),[nt,X]=l.useState(""),[d,E]=l.useState(null),[pa,st]=l.useState({}),[G,it]=l.useState(null),[_,Mn]=l.useState([]),[n,ee]=l.useState(vn),[An,Pe]=l.useState(!1),[f,$]=l.useState("basics"),[Ce,rt]=l.useState([]),[Tn,De]=l.useState(!1),[ae,L]=l.useState(""),[lt,pe]=l.useState(""),[Le,ot]=l.useState("7d"),[me,ct]=l.useState("deposit_withdrawal"),[dt,Bn]=l.useState("all"),[ue,ma]=l.useState([]),[Wn,Me]=l.useState(!1),[ua,xa]=l.useState("deposit"),[ga,xe]=l.useState(""),[pt,ha]=l.useState(""),[Ae,te]=l.useState(!0),[En,Te]=l.useState(!1),[fa,mt]=l.useState(!1),[R,Fn]=l.useState("daily"),[_n,ut]=l.useState(!1),[xt,Be]=l.useState(""),[We,gt]=l.useState([]),[ba,ya]=l.useState(""),[ne,Ee]=l.useState([]),[Fe,ht]=l.useState([]),[$n,_e]=l.useState(!1),[se,C]=l.useState(""),[ft,ie]=l.useState(""),[$e,On]=l.useState("7d"),[ge,ja]=l.useState([]),[Rn,he]=l.useState(!1),[re,bt]=l.useState("deposit"),[va,Na]=l.useState(""),[Oe,yt]=l.useState(""),[zn,Re]=l.useState(!1),[jt,vt]=l.useState(!1),[Nt,ze]=l.useState(""),[wt,St]=l.useState(""),[kt,Pt]=l.useState(!1),[Ct,Ie]=l.useState(""),[Dt,Lt]=l.useState(""),[Mt,Ue]=l.useState(""),[z,I]=l.useState(null),[At,Tt]=l.useState(!1),[Bt,Wt]=l.useState(""),[Ye,wa]=l.useState(null),[fe,In]=l.useState([]),[Sa,Et]=l.useState(!1),[Ft,le]=l.useState(""),[_t,ka]=l.useState(""),[$t,Ot]=l.useState(""),[D,Pa]=l.useState(null),[Ve,Rt]=l.useState(!1),[zt,It]=l.useState(""),[Ca,He]=l.useState(!1),[Ut,oe]=l.useState(""),[Yt,Ge]=l.useState(""),[qe,Vt]=l.useState(null),[Da,La]=l.useState(""),[ni,Un]=l.useState(""),[si,Yn]=l.useState(""),[ii,Vn]=l.useState(""),[Je,Ht]=l.useState(""),[ri,Hn]=l.useState(""),[li,Gn]=l.useState([]),[Gt,qn]=l.useState(""),[be,Ma]=l.useState(null),[qt,Jt]=l.useState(!1),[Kt,Ke]=l.useState(""),[Ze,Zt]=l.useState(null),Jn=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],Qt=async(a,t)=>{const i=String(t||"").trim();if(!i)return null;try{const o=await $s(a,{agentId:i}),r=Number(o?.balanceOwed);return Number.isFinite(r)?r:null}catch(o){return console.warn("Failed to load live agent settlement balance:",o),null}};l.useEffect(()=>{s&&(async()=>{try{F(!0),A(""),X(""),pe(""),L(""),I(null),E(null),wa(null),Pa(null),ee(vn),$("basics");const t=localStorage.getItem("token");if(!t){A("Please login to view details.");return}const[i,o]=await Promise.all([Ha(s,t),["admin","super_agent","master_agent","agent"].includes(v)?Ms(t):Promise.resolve([])]),r=i?.user,c=r?.settings||{},m=c.dynamicLiveLimits||{},p=c.dynamicLiveFlags||{},u=c.liveCasinoLimits||{},x=u.default||{},y=u.agent||{},j=u.player||{};if(!r){A("User not found.");return}const S=String(r?.role||"").toLowerCase(),T=S==="agent"||S==="master_agent"||S==="super_agent",P=Ja(r),ce=T?await Qt(t,r.id||s):null;E(P),wa(ce),st(i?.stats||{}),it(i?.referredBy||null),Mn(Array.isArray(o)?o:[]),T&&(Un(r?.agentPercent!=null?String(r.agentPercent):""),Yn(r?.playerRate!=null?String(r.playerRate):""),Vn(r?.hiringAgentPercent!=null?String(r.hiringAgentPercent):""),Ht(P.parentAgentId||P.masterAgentId||P.createdBy?.id||P.createdBy||""),Hn(r?.subAgentPercent!=null?String(r.subAgentPercent):""),Gn(Array.isArray(r?.extraSubAgents)?r.extraSubAgents.map((V,H)=>({id:H,name:V.name||"",percent:V.percent!=null?String(V.percent):""})):[])),ee({password:"",firstName:P.firstName||"",lastName:P.lastName||"",phoneNumber:P.phoneNumber||"",minBet:P.minBet,agentId:T?P.parentAgentId||P.masterAgentId||"":v==="admin"?P.masterAgentId||P.agentId?.id||P.agentId||"":P.agentId?.id||P.agentId||"",status:(P.status||"active").toLowerCase(),creditLimit:P.creditLimit,wagerLimit:P.wagerLimit,settleLimit:P.balanceOwed,accountType:c.accountType||"credit",zeroBalanceWeekly:c.zeroBalanceWeekly||"standard",tempCredit:Number(c.tempCredit||0),expiresOn:c.expiresOn||"",enableCaptcha:!!c.enableCaptcha,cryptoPromoPct:Number(c.cryptoPromoPct||0),promoType:c.promoType||"promo_credit",playerNotes:c.playerNotes||"",sportsbook:c.sports??!0,casino:c.casino??!0,horses:c.racebook??!0,messaging:c.messaging??!1,dynamicLive:c.live??!0,propPlus:c.props??!0,liveCasino:c.liveCasino??!1,freePlayPercent:Number(c.freePlayPercent??20),maxFpCredit:Number(c.maxFpCredit??0),dlMinStraightBet:Number(m.minStraightBet??25),dlMaxStraightBet:Number(m.maxStraightBet??250),dlMaxPerOffering:Number(m.maxPerOffering??500),dlMaxBetPerEvent:Number(m.maxBetPerEvent??500),dlMaxWinSingleBet:Number(m.maxWinSingleBet??1e3),dlMaxWinEvent:Number(m.maxWinEvent??3e3),dlDelaySec:Number(m.delaySec??7),dlMaxFavoriteLine:Number(m.maxFavoriteLine??-1e4),dlMaxDogLine:Number(m.maxDogLine??1e4),dlMinParlayBet:Number(m.minParlayBet??10),dlMaxParlayBet:Number(m.maxParlayBet??100),dlMaxWinEventParlay:Number(m.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(m.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(m.wagerCoolOffSec??30),dlLiveParlays:!!p.liveParlays,dlBlockPriorStart:p.blockPriorStart??!0,dlBlockHalftime:p.blockHalftime??!0,dlIncludeGradedInLimits:!!p.includeGradedInLimits,dlUseRiskLimits:!!p.useRiskLimits,casinoDefaultMaxWinDay:Number(x.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(x.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(x.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(x.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(y.maxWinDay??1e3),casinoAgentMaxLossDay:Number(y.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(y.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(y.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(j.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(j.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(j.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(j.maxLossWeek??5e3),appsVenmo:r.apps?.venmo||"",appsCashapp:r.apps?.cashapp||"",appsApplePay:r.apps?.applePay||"",appsZelle:r.apps?.zelle||"",appsPaypal:r.apps?.paypal||"",appsBtc:r.apps?.btc||"",appsOther:r.apps?.other||""})}catch(t){console.error("Failed to load player details:",t),A(t.message||"Failed to load details")}finally{F(!1)}})()},[v,s]);const Aa=async(a=!0)=>{if(!d?.username)return;const t=localStorage.getItem("token");if(!t){le("Please login to view pending bets.");return}try{a&&Et(!0),le("");const i=await fn({customer:d.username,status:"pending",limit:500},t),o=Array.isArray(i?.bets)?i.bets:[];In(o)}catch(i){le(i?.message||"Failed to load pending bets")}finally{a&&Et(!1)}},Kn=async a=>{if(!a||!window.confirm("Delete this pending bet? Risk will be refunded to the player."))return;const t=localStorage.getItem("token");if(t)try{Ot(a),le(""),ka("");const o=(await Es(a,t))?.user;o&&E(r=>r&&{...r,balance:h(o.balance,r.balance),pendingBalance:h(o.pendingBalance,r.pendingBalance),freeplayBalance:h(o.freeplayBalance,r.freeplayBalance)}),ka("Bet deleted."),await Aa(!1)}catch(i){le(i?.message||"Failed to delete bet")}finally{Ot("")}},Ta=async()=>{if(!s)return;const a=localStorage.getItem("token");if(a)try{Rt(!0),It("");const t=await Ts(s,a);Pa(t)}catch(t){It(t.message||"Failed to load commission chain")}finally{Rt(!1)}},Zn=async a=>{if(Ht(a),!a)return;const t=localStorage.getItem("token");if(t)try{He(!0),oe(""),Ge(""),await qa(s,{parentAgentId:a},t),Ge("Master agent updated"),await Ta()}catch(i){oe(i.message||"Failed to update master agent")}finally{He(!1)}},Qn=async()=>{const a=localStorage.getItem("token"),t=parseFloat(Gt);if(!a||isNaN(t)||t<=0){Ke("Enter a valid positive amount");return}try{Jt(!0),Ke(""),Ma(null);const i=await Ws(s,t,a);Ma(i)}catch(i){Ke(i.message||"Calculation failed")}finally{Jt(!1)}},Xn=async()=>{if(!D?.upline)return;const a=localStorage.getItem("token");if(a)try{const t=D.upline.map(o=>({id:o.id,username:o.username,agentPercent:o.agentPercent})),i=await Bs(t,a);Zt(i)}catch(t){Zt({isValid:!1,errors:[t.message]})}},Xt=async a=>{if(!d?.username)return[];const t=a||localStorage.getItem("token");if(!t)throw new Error("Please login to view transactions.");const i={user:d.username||"",type:Xs(me),status:dt,time:Le,limit:300};s&&(i.userId=s);const o=await Ga(i,t);let m=[...(Array.isArray(o?.transactions)?o.transactions:[]).filter(p=>Ka(p,s,d.username,Wa))];if(["deleted_changed","deleted_transactions"].includes(Z(me)))try{const p=await Os({user:d.username||"",status:"all",sport:"all",time:Le,limit:300},t),u=(Array.isArray(p?.wagers)?p.wagers:[]).filter(x=>String(x?.userId||"")===String(s)).map(Qs);m=[...m,...u]}catch(p){console.warn("Deleted/Changed wagers could not be loaded:",p)}return m.filter(p=>ei(p,me)).sort((p,u)=>Dn(u?.date)-Dn(p?.date))};l.useEffect(()=>{(async()=>{if(!(f!=="transactions"||!d))try{De(!0),L("");const t=await Xt();rt(t)}catch(t){L(t.message||"Failed to load transactions")}finally{De(!1)}})()},[f,d,me,dt,Le,s]),l.useEffect(()=>{(async()=>{if(!(f!=="performance"||!d?.username))try{ut(!0),Be("");const t=localStorage.getItem("token");if(!t){Be("Please login to view performance.");return}const i=await fn({customer:d.username,time:R==="weekly"?"90d":R==="yearly"?"all":"30d",type:"all-types",limit:500},t),o=Array.isArray(i?.bets)?i.bets:[],r=new Map,c=u=>{const x=new Date(Date.UTC(u.getFullYear(),u.getMonth(),u.getDate())),y=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-y);const j=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil(((x-j)/864e5+1)/7)};for(const u of o){const x=u?.createdAt,y=new Date(x);if(Number.isNaN(y.getTime()))continue;let j="",S="";if(R==="daily"){const W=y.getFullYear(),ke=String(y.getMonth()+1).padStart(2,"0"),de=String(y.getDate()).padStart(2,"0");j=`${W}-${ke}-${de}`,S=y.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(R==="weekly"){const W=y.getFullYear(),ke=String(c(y)).padStart(2,"0");j=`${W}-W${ke}`;const de=new Date(y),hn=de.getDay(),Ls=de.getDate()-hn+(hn===0?-6:1);de.setDate(Ls),S=`Week of ${de.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(R==="monthly"){const W=y.getFullYear(),ke=String(y.getMonth()+1).padStart(2,"0");j=`${W}-${ke}`,S=y.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const W=y.getFullYear();j=`${W}`,S=`${W}`}const T=Number(u?.amount||0),P=Number(u?.potentialPayout||0),ce=String(u?.status||"").toLowerCase(),V=ce==="won"?Math.max(0,P-T):ce==="lost"?-T:0;r.has(j)||r.set(j,{date:y,net:0,wagers:[],periodLabel:S});const H=r.get(j);H.net+=V,H.wagers.push({id:u.id||`${j}-${H.wagers.length+1}`,label:`${u?.match?.awayTeam||""} vs ${u?.match?.homeTeam||""}`.trim()||u.selection||"Wager",amount:V})}const m=Array.from(r.entries()).map(([u,x])=>({key:u,date:x.date,periodLabel:x.periodLabel,net:x.net,wagers:x.wagers})).sort((u,x)=>x.key.localeCompare(u.key));if(R==="yearly"){const u=h(d?.lifetimePlusMinus??d?.lifetime,0);if(Number.isFinite(u)){const x=m.reduce((j,S)=>j+Number(S.net||0),0),y=u-x;if(Math.abs(y)>=.01){const j=String(new Date().getFullYear());let S=m.findIndex(T=>T.key===j);S<0&&(m.unshift({key:j,date:new Date,periodLabel:j,net:0,wagers:[]}),S=0),m[S]={...m[S],net:Number(m[S].net||0)+y,wagers:[...Array.isArray(m[S].wagers)?m[S].wagers:[],{id:`lifetime-carry-${m[S].key}`,label:"Lifetime +/- Carry",amount:y,synthetic:!0}]}}}}gt(m);const p=m[0]?.key||"";ya(p),Ee(m[0]?.wagers||[])}catch(t){Be(t.message||"Failed to load performance"),gt([]),ya(""),Ee([])}finally{ut(!1)}})()},[f,d?.username,d?.lifetimePlusMinus,d?.lifetime,R]),l.useEffect(()=>{(async()=>{if(!(f!=="freeplays"||!d?.username))try{_e(!0),C("");const t=localStorage.getItem("token");if(!t){C("Please login to view free play.");return}const i=await Ga({user:d.username,type:"all",status:"all",time:$e,limit:300},t),r=(Array.isArray(i?.transactions)?i.transactions:[]).filter(c=>Ka(c,s,d.username,Wa)&&Za(c));ht(r)}catch(t){C(t.message||"Failed to load free play")}finally{_e(!1)}})()},[f,d?.username,$e,s]);const g=(a,t)=>{ee(i=>({...i,[a]:t}))},es=a=>{I(null),ee(t=>({...t,firstName:da(a)}))},as=a=>{I(null),ee(t=>({...t,lastName:da(a)}))},ts=a=>{I(null),ee(t=>({...t,phoneNumber:jn(a)}))},en=l.useMemo(()=>{const a=`${n.firstName||""} ${n.lastName||""}`.trim();return a||(d?.fullName?d.fullName:"")},[n.firstName,n.lastName,d?.fullName]);l.useMemo(()=>en||d?.username||"Player",[en,d?.username]);const an=l.useMemo(()=>yn(n.firstName,n.lastName,n.phoneNumber,d?.username||""),[n.firstName,n.lastName,n.phoneNumber,d?.username]),Ba=l.useMemo(()=>d?an||d.displayPassword||"Not set":"",[d,an]),tn=l.useMemo(()=>{const a=new Set;return(Array.isArray(z?.matches)?z.matches:[]).forEach(i=>{(Array.isArray(i?.matchReasons)?i.matchReasons:[]).forEach(r=>{const c=String(r||"").trim().toLowerCase();c&&a.add(c)})}),a},[z]),ns=tn.has("phone"),ss=tn.has("password"),is=l.useMemo(()=>{const a=String(d?.role||"player").toLowerCase();return a==="user"||a==="player"?"PLAYER":a.replace(/_/g," ").toUpperCase()},[d?.role]),b=l.useMemo(()=>{const a=String(d?.role||"player").toLowerCase();return a==="agent"||a==="master_agent"||a==="master agent"||a==="super_agent"||a==="super agent"},[d?.role]),Wa=l.useMemo(()=>{if(!b||!d?.username||!_?.length)return null;const a=String(d.username).toUpperCase();if(a.endsWith("MA")){const t=a.slice(0,-2),i=_.find(o=>String(o.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}else{const t=a+"MA",i=_.find(o=>String(o.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}},[b,d?.username,_]);l.useMemo(()=>{if(!Je)return"";const a=_.find(t=>t.id===Je);return a?String(a.username||"").toUpperCase():String(d?.createdByUsername||d?.createdBy?.username||"").toUpperCase()},[Je,_,d]);const U=h(d?.balance,0),ye=h(d?.pendingBalance,0),nn=h(d?.freeplayBalance,0),sn=h(d?.lifetimePlusMinus??d?.lifetime,0),je=Sn(n.creditLimit,d?.creditLimit??d?.defaultCreditLimit),Ea=Sn(n.settleLimit,d?.balanceOwed??d?.defaultSettleLimit),Fa=h(d?.minBet??d?.defaultMinBet??n.minBet,0),_a=h(d?.maxBet??d?.defaultMaxBet??d?.wagerLimit??n.wagerLimit,0),q=b&&Ye!==null?h(Ye,0):U,$a="Balance Owed / House Money",Oa=l.useMemo(()=>je+U-ye,[je,U,ye]),Y=l.useMemo(()=>{let a=0;for(const t of Ce)t?.status==="pending"&&String(t?.type||"").toLowerCase().includes("casino")&&(a+=Number(t.amount||0));return{pending:ye,available:b?U:Number(Oa||0),carry:b&&Ye!==null?q:U,nonPostedCasino:a}},[Ce,ye,U,Oa,b,Ye,q]),rn=a=>Math.floor(h(a,0)),Ra=a=>String(Math.abs(rn(a))),N=a=>"$"+rn(a).toLocaleString("en-US"),M=a=>{const t=h(a,0);return`$${Math.floor(t).toLocaleString("en-US")}`},rs=async()=>{Wt(""),Tt(!0);try{const a=localStorage.getItem("token");if(!a)throw new Error("No admin token found. Please log in again.");const t=await As(s,a);if(!t?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",a);const r=localStorage.getItem("userRole")||"";r&&sessionStorage.setItem("impersonationBaseRole",r)}localStorage.setItem("token",t.token),localStorage.setItem("userRole",String(t?.role||"user")),localStorage.removeItem("user");const i=String(t?.role||"").toLowerCase();let o="/";i==="admin"?o="/admin/dashboard":i==="agent"?o="/agent/dashboard":(i==="master_agent"||i==="super_agent")&&(o="/super_agent/dashboard"),window.location.href=o}catch(a){Wt(a.message||"Failed to login as user. Please try again."),Tt(!1)}},za=String(G?.id||"").trim(),ls=l.useMemo(()=>{if(!G)return"—";const a=G.firstName||"",t=G.lastName||"";return[a,t].filter(Boolean).join(" ").trim()||G.username||G.id||"—"},[G]),Qe=za!==""&&za!==String(s||"").trim()&&typeof w=="function",os=()=>{Qe&&w(za)},cs=async()=>{const a=Fa,t=_a,i=je,o=Ea,r=String(Ba??""),c=String(d?.role||"").toLowerCase(),m=c==="user"||c==="player"||c==="",p="https://bettorplays247.com",u=m?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${d?.username||""}`,`Password: ${r}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(o)}`,"",`Site: ${p}`,"",Zs]:[`Login: ${d?.username||""}`,`Password: ${r}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(o)}`,"",`Site: ${p}`],x=u.join(`
`),j=`<div style="font-family:sans-serif;white-space:pre-wrap;">${u.map(S=>S===""?"<br>":S).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([x],{type:"text/plain"}),"text/html":new Blob([j],{type:"text/html"})})]):await navigator.clipboard.writeText(x),Ue("All details copied"),window.setTimeout(()=>Ue(""),1400)}catch{Ue("Copy failed"),window.setTimeout(()=>Ue(""),1400)}},ds=async()=>{try{at(!0),A(""),X(""),I(null);const a=localStorage.getItem("token");if(!a){A("Please login again.");return}const t=da(n.firstName).trim(),i=da(n.lastName).trim(),o=jn(n.phoneNumber).trim(),r=b?"":yn(t,i,o,d?.username||"");if(!b&&(!t||!i||!o||!r)){A("First name, last name, and phone number are required to generate password.");return}const c={firstName:t,lastName:i,phoneNumber:o,fullName:`${t} ${i}`.trim(),password:r,allowDuplicateSave:!0,status:n.status,minBet:Number(n.minBet||0),creditLimit:Number(n.creditLimit||0),maxBet:Number(n.wagerLimit||0),wagerLimit:Number(n.wagerLimit||0),balanceOwed:Number(n.settleLimit||0),settings:{accountType:n.accountType,zeroBalanceWeekly:n.zeroBalanceWeekly,tempCredit:Number(n.tempCredit||0),expiresOn:n.expiresOn||"",enableCaptcha:!!n.enableCaptcha,cryptoPromoPct:Number(n.cryptoPromoPct||0),promoType:n.promoType,playerNotes:n.playerNotes,sports:!!n.sportsbook,casino:!!n.casino,racebook:!!n.horses,messaging:!!n.messaging,live:!!n.dynamicLive,props:!!n.propPlus,liveCasino:!!n.liveCasino}};c.apps={venmo:n.appsVenmo||"",cashapp:n.appsCashapp||"",applePay:n.appsApplePay||"",zelle:n.appsZelle||"",paypal:n.appsPaypal||"",btc:n.appsBtc||"",other:n.appsOther||""},["admin","super_agent","master_agent"].includes(v)&&n.agentId&&(c.agentId=n.agentId);let m=null;if(b){const x={firstName:t,lastName:i,fullName:`${t} ${i}`.trim(),phoneNumber:o,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0)};n.agentId&&(x.parentAgentId=n.agentId),await qa(s,x,a),m={}}else v==="agent"?m=await la(s,c,a):m=await oa(s,c,a);const p={...c};delete p.allowDuplicateSave,E(b?x=>({...x,firstName:p.firstName,lastName:p.lastName,fullName:p.fullName,phoneNumber:p.phoneNumber,status:p.status,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0),minBet:Number(n.minBet||0),maxBet:Number(n.wagerLimit||0),creditLimit:Number(n.creditLimit||0),balanceOwed:Number(n.settleLimit||0),displayPassword:x?.displayPassword||""}):x=>({...x,...p,displayPassword:r||x?.displayPassword||"",settings:{...x?.settings||{},...p.settings}}));const u=m?.duplicateWarning;u&&typeof u=="object"?(I({message:u.message||"Likely duplicate player detected.",matches:Array.isArray(u.matches)?u.matches:[]}),X("Changes saved with duplicate warning.")):X("Changes saved successfully.")}catch(a){console.error("Failed to save player details:",a);const t=Array.isArray(a?.duplicateMatches)?a.duplicateMatches:Array.isArray(a?.details?.matches)?a.details.matches:[];if(a?.isDuplicate===!0||a?.duplicate===!0||a?.code==="DUPLICATE_PLAYER"||a?.details?.duplicate===!0){I({message:a?.message||"Likely duplicate player detected.",matches:t}),A("");return}A(a.message||"Failed to save details")}finally{at(!1)}},ps=async()=>{try{const a=localStorage.getItem("token");if(!a||!d)return;await bn(s,{balance:h(d.balance,0)},a),X("Balance updated."),A("")}catch(a){A(a.message||"Failed to update balance")}},ln=a=>{if(!a)return"—";const t=a?.$date||a,i=new Date(t);return Number.isNaN(i.getTime())?"—":i.toLocaleString()},J=a=>{a==="transactions"?($("transactions"),ot("7d"),ct("deposit_withdrawal"),Bn("all")):a==="pending"?($("pending-bets"),le(""),ka(""),Aa()):a==="performance"?$("performance"):a==="freeplays"?$("freeplays"):a==="dynamic-live"?$("dynamic-live"):a==="live-casino"?$("live-casino"):a==="commission"?($("commission"),D||Ta()):$("basics"),Pe(!1),X(""),pe(""),A(""),I(null),L(""),Be(""),C(""),ie(""),ze(""),St(""),Ie(""),Lt("")},Xe=()=>{J("transactions");const a=b?q:h(d?.balance,0),t=b?a>0?"deposit":"withdrawal":a>0?"withdrawal":"deposit";xa(t),xe(""),ha(""),te(!0),L(""),Me(!0)},Ia=!!O?.autoOpenDeposit,[on,cn]=l.useState(!1);l.useEffect(()=>{cn(!1)},[s,Ia]),l.useEffect(()=>{!Ia||on||d?.id&&b&&(Xe(),cn(!0))},[Ia,on,d?.id,b]);const ea=l.useMemo(()=>We.find(a=>a.key===ba)||null,[We,ba]);l.useEffect(()=>{if(!ea){Ee([]);return}Ee(ea.wagers||[])},[ea]);const ms=l.useMemo(()=>ne.reduce((a,t)=>a+Number(t.amount||0),0),[ne]),us=l.useMemo(()=>ne.filter(a=>!a?.synthetic).length,[ne]),ve=l.useMemo(()=>b?q:h(d?.balance,0),[b,q,d?.balance]),aa=l.useMemo(()=>b?h(d?.balance,0):h(Y?.carry,0),[b,d?.balance,Y?.carry]),xs=l.useMemo(()=>Fe.filter(a=>String(a.status||"").toLowerCase()==="pending").reduce((a,t)=>a+h(t.amount,0),0),[Fe]),K=nn,ta=a=>{const t=h(a,0);return Number.isFinite(t)?Math.floor(t):0},dn=a=>{const t=B(a);return t==="neg"?"#dc2626":t==="pos"?"#16a34a":"#000000"},na=a=>{const t=B(a);return t==="pos"?"neg":t==="neg"?"pos":"neutral"},gs=a=>b?na(a):B(a),Ua=(a,t=b)=>{const i=t?na(a):B(a);return i==="neg"?"#dc2626":i==="pos"?"#16a34a":"#000000"},Ya=b?wn:Nn,pn=Ya.find(a=>a.value===ua)||Ya[0],Ne=Number(ga||0),mn=Number.isFinite(Ne)&&Ne>0,un=mn,sa=l.useMemo(()=>Rs(d,Ne),[d,Ne]),hs=re==="withdraw",Va=Number(va||0),xn=Number.isFinite(Va)&&Va>0,gn=xn,we=async()=>{if(d?.username)try{_e(!0);const a=localStorage.getItem("token");if(!a)return;const t=await Ga({user:d.username,type:"all",status:"all",time:$e,limit:300},a),i=Array.isArray(t?.transactions)?t.transactions:[];ht(i.filter(o=>Ka(o,s,d.username,Wa)&&Za(o)))}catch(a){C(a.message||"Failed to refresh free play")}finally{_e(!1)}},fs=(a,t="transaction")=>{const i=Number(a?.deleted||0),o=Number(a?.skipped||0),r=Number(a?.cascadeDeleted||0),m=(Array.isArray(a?.warnings)?a.warnings:[]).find(u=>typeof u?.message=="string"&&u.message.trim()!=="");let p=i>0?`Deleted ${i} ${t}(s).`:`No ${t}(s) were deleted.`;return r>0&&(p+=` Linked free play deleted: ${r}.`),o>0&&(p+=` Skipped ${o}.`),m&&(p+=` ${m.message}`),i>0||r>0?p+=" Balances and totals were updated.":p+=" Balances and totals were not changed.",p},ia=(a,t,i,o)=>{const r=Number(a?.deleted||0),c=Number(a?.cascadeDeleted||0),m=fs(a,t);if(r>0||c>0){i(m),o("");return}i(""),o(m)},bs=async()=>{try{const a=Number(va||0);if(a<=0||Number.isNaN(a)){C("Enter a valid free play amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!d){C("Please login again.");return}const i=h(d.freeplayBalance,0),o=re==="withdraw",r=await _s(s,{operationMode:"transaction",amount:a,direction:o?"debit":"credit",description:Oe.trim()},t),c=h(r?.user?.freeplayBalance,NaN),m=r?.user?.freeplayExpiresAt??null;E(u=>u&&{...u,freeplayBalance:Number.isFinite(c)?c:ta(i+(o?-a:a)),freeplayExpiresAt:m});const p=o?"withdrawn":"added";Oe.trim()?ie(`Free play ${p}. Note: "${Oe.trim()}"`):ie(`Free play ${p} successfully.`),C(""),he(!1),Re(!1),Na(""),yt(""),await we()}catch(a){C(a.message||"Failed to update free play")}},ys=a=>{ja(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},js=async()=>{try{if(ge.length===0||!window.confirm(`Delete ${ge.length} selected free play transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t=await ca(ge,a);ja([]),ia(t,"free play transaction",ie,C),await we(),await Se(),await ra()}catch(a){C(a.message||"Failed to delete free play transactions")}},vs=async a=>{try{if(!a||!window.confirm("Delete this free play transaction?"))return;const t=localStorage.getItem("token");if(!t){C("Please login again.");return}const i=await ca([a],t);ja(o=>o.filter(r=>r!==a)),ia(i,"free play transaction",ie,C),await we(),await Se(),await ra()}catch(t){C(t.message||"Failed to delete free play transaction")}},Ns=async()=>{try{const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t={settings:{freePlayPercent:Number(n.freePlayPercent||0),maxFpCredit:Number(n.maxFpCredit||0)}};v==="agent"?await la(s,t,a):await oa(s,t,a),ie("Free play settings saved."),C("")}catch(a){C(a.message||"Failed to save free play settings")}},ws=async()=>{try{vt(!0);const a=localStorage.getItem("token");if(!a){ze("Please login again.");return}const t={settings:{dynamicLiveLimits:{minStraightBet:Number(n.dlMinStraightBet||0),maxStraightBet:Number(n.dlMaxStraightBet||0),maxPerOffering:Number(n.dlMaxPerOffering||0),maxBetPerEvent:Number(n.dlMaxBetPerEvent||0),maxWinSingleBet:Number(n.dlMaxWinSingleBet||0),maxWinEvent:Number(n.dlMaxWinEvent||0),delaySec:Number(n.dlDelaySec||0),maxFavoriteLine:Number(n.dlMaxFavoriteLine||0),maxDogLine:Number(n.dlMaxDogLine||0),minParlayBet:Number(n.dlMinParlayBet||0),maxParlayBet:Number(n.dlMaxParlayBet||0),maxWinEventParlay:Number(n.dlMaxWinEventParlay||0),maxDogLineParlays:Number(n.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(n.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!n.dlLiveParlays,blockPriorStart:!!n.dlBlockPriorStart,blockHalftime:!!n.dlBlockHalftime,includeGradedInLimits:!!n.dlIncludeGradedInLimits,useRiskLimits:!!n.dlUseRiskLimits}}};v==="agent"?await la(s,t,a):await oa(s,t,a),St("Dynamic Live settings saved."),ze("")}catch(a){ze(a.message||"Failed to save Dynamic Live settings")}finally{vt(!1)}},Ss=async()=>{try{Pt(!0);const a=localStorage.getItem("token");if(!a){Ie("Please login again.");return}const t={settings:{liveCasinoLimits:{default:{maxWinDay:Number(n.casinoDefaultMaxWinDay||0),maxLossDay:Number(n.casinoDefaultMaxLossDay||0),maxWinWeek:Number(n.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(n.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(n.casinoAgentMaxWinDay||0),maxLossDay:Number(n.casinoAgentMaxLossDay||0),maxWinWeek:Number(n.casinoAgentMaxWinWeek||0),maxLossWeek:Number(n.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(n.casinoPlayerMaxWinDay||0),maxLossDay:Number(n.casinoPlayerMaxLossDay||0),maxWinWeek:Number(n.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(n.casinoPlayerMaxLossWeek||0)}}}};v==="agent"?await la(s,t,a):await oa(s,t,a),Lt("Live Casino limits saved."),Ie("")}catch(a){Ie(a.message||"Failed to save Live Casino limits")}finally{Pt(!1)}},Se=async()=>{if(d){De(!0);try{const a=localStorage.getItem("token");if(!a){L("Please login to view transactions.");return}const t=await Xt(a);rt(t)}catch(a){L(a.message||"Failed to refresh transactions")}finally{De(!1)}}},ra=async()=>{try{const a=localStorage.getItem("token");if(!a)return;const t=await Ha(s,a),i=t?.user;if(!i||typeof i!="object")return;const o=Ja(i),r=String(i?.role||"").toLowerCase(),m=r==="agent"||r==="master_agent"||r==="super_agent"?await Qt(a,i.id||s):null;E(p=>p&&{...p,balance:o.balance,pendingBalance:o.pendingBalance,freeplayBalance:o.freeplayBalance,lifetime:o.lifetime,lifetimePlusMinus:o.lifetimePlusMinus,balanceOwed:o.balanceOwed,creditLimit:o.creditLimit,updatedAt:o.updatedAt}),wa(m),t?.stats&&typeof t.stats=="object"&&st(t.stats),t?.referredBy!==void 0&&it(t.referredBy||null)}catch(a){console.warn("Failed to refresh customer financials after transaction update:",a)}},ks=async()=>{if(!fa){mt(!0);try{const a=Number(ga||0);if(a<=0||Number.isNaN(a)){L("Enter a valid amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!d){L("Please login again.");return}const i=b?wn:Nn,o=i.find(j=>j.value===ua)||i[0],r=h(d.balance,0),c=ta(r+(o.balanceDirection==="credit"?a:-a)),m=pt.trim();let p;b?p=await Fs(s,{amount:a,direction:o.balanceDirection,type:o.apiType,description:m||o.defaultDescription},t):p=await bn(s,{operationMode:"transaction",amount:a,direction:o.balanceDirection,type:o.apiType,reason:o.reason,description:m||o.defaultDescription,applyDepositFreeplayBonus:Ae},t);const u=b?0:h(p?.freeplayBonus?.amount,0),x=b?0:h(p?.referralBonus?.amount,0);E(j=>{if(!j)return j;const S=b?h(p?.agent?.balance,NaN):h(p?.user?.balance,NaN),T=Number.isFinite(S)?S:c,P=h(p?.user?.freeplayBalance,NaN),ce=Number.isFinite(P)?P:h(j.freeplayBalance,0),V=p?.user?.lifetimePlusMinus??p?.user?.lifetime??j.lifetimePlusMinus??j.lifetime??0,H=h(V,NaN),W=Number.isFinite(H)?H:h(j.lifetimePlusMinus??j.lifetime,0);return{...j,balance:T,freeplayBalance:ce,lifetime:W,lifetimePlusMinus:W}});const y=["Transaction saved and balance updated."];u>0&&y.push(`Auto free play bonus added: ${N(u)}.`),x>0&&y.push(`Referral bonus granted: ${N(x)}.`),pe(y.join(" ")),L(""),Me(!1),Te(!1),xa("deposit"),xe(""),ha(""),te(!0),await Se()}catch(a){L(a.message||"Failed to save transaction")}finally{mt(!1)}}},Ps=a=>{ma(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},Cs=async()=>{try{if(ue.length===0||!window.confirm(`Delete ${ue.length} selected transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){L("Please login again.");return}const t=await ca(ue,a);ma([]),await Se(),await we(),await ra(),ia(t,"transaction",pe,L)}catch(a){L(a.message||"Failed to delete selected transactions")}},Ds=async a=>{try{if(!a||!window.confirm("Delete this transaction?"))return;const t=localStorage.getItem("token");if(!t){L("Please login again.");return}const i=await ca([a],t);ma(o=>o.filter(r=>r!==a)),await Se(),await we(),await ra(),ia(i,"transaction",pe,L)}catch(t){L(t.message||"Failed to delete transaction")}};return Q?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):d?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:b?(()=>{const a=String(d.username||"").toUpperCase(),t=a+"MA";return _?.find(o=>String(o.username||"").toUpperCase()===t)?`${a} (${t})`:a})():d.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:is})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:d.username||""})]}),b?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>J("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(d?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:d?.agentPercent!=null?`${d.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:Xe,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${B(U)}`,children:N(U)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:Ba})]}),b?(()=>{const a=d?.agentPercent!=null?parseFloat(d.agentPercent):null,t=d?.hiringAgentPercent!=null?parseFloat(d.hiringAgentPercent):null,i=5,o=t!=null&&a!=null?t-a:null,r=t==null||o===0,c=!r&&t!=null?100-i-t:null,m=c!=null&&c>0,p=!r&&o>0,u=[];return p&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[o,"%"]})]},"hiring")),m&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[c,"%"]})]},"upline")),u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),u.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>J("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:d?.playerRate!=null?`$${d.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[u[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(Fa)})]}),u[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:M(_a)})]}),u[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:M(je)})]}),u[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Ea)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="pending-bets"?" detail-metric-active":""}`,onClick:()=>J("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:N(ye)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(Fa)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:N(Oa)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:M(_a)})]}),!b&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="freeplays"?" detail-metric-active":""}`,onClick:()=>J("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:N(nn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:M(je)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="performance"?" detail-metric-active":""}`,onClick:()=>J("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${B(sn)}`,children:N(sn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Ea)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${Qe?"detail-link-item":""}`,onClick:os,disabled:!Qe,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${Qe?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:ls})]})]}),b?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:Xe,children:[e.jsx("span",{className:"detail-label",children:$a}),e.jsx("strong",{className:`detail-value ${gs(q)}`,children:N(q)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:cs,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:rs,disabled:At,children:At?"Logging in...":"Login User"})]})]})]}),Bt&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:Bt}),Mt&&e.jsx("div",{className:"copy-notice",children:Mt})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>Pe(a=>!a),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:f==="transactions"?"Transactions":f==="pending-bets"?"Pending Bets":f==="performance"?"Performance":f==="freeplays"?"Free Play":f==="dynamic-live"?"Dynamic Live":f==="live-casino"?"Live Casino":f==="commission"?"Commission Tree":"The Basics"})]}),f==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:Xe,children:"New transaction"}):f==="pending-bets"?e.jsx("button",{className:"btn btn-back",onClick:()=>Aa(),disabled:Sa,children:Sa?"Loading...":"Refresh"}):f==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{bt("withdraw"),C(""),he(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{bt("deposit"),C(""),he(!0)},children:"Add Free Play"})]}):f==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:ws,disabled:jt,children:jt?"Saving...":"Save"}):f==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:Ss,disabled:kt,children:kt?"Saving...":"Save"}):f==="commission"?e.jsx("button",{className:"btn btn-back",onClick:Ta,disabled:Ve,children:Ve?"Loading...":"Refresh"}):f==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:ds,disabled:et,children:et?"Saving...":"Save"})]}),An&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>Pe(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>Pe(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:Jn.map(a=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>J(a.id),children:[e.jsx("span",{className:"menu-icon",children:a.icon}),e.jsx("span",{className:"menu-label",children:a.label})]},a.id))})]})]}),f==="transactions"?ae&&e.jsx("div",{className:"alert error",children:ae}):f==="pending-bets"?Ft&&e.jsx("div",{className:"alert error",children:Ft}):f==="performance"?xt&&e.jsx("div",{className:"alert error",children:xt}):f==="freeplays"?se&&e.jsx("div",{className:"alert error",children:se}):f==="dynamic-live"?Nt&&e.jsx("div",{className:"alert error",children:Nt}):f==="live-casino"?Ct&&e.jsx("div",{className:"alert error",children:Ct}):tt&&e.jsx("div",{className:"alert error",children:tt}),f==="transactions"?lt&&e.jsx("div",{className:"alert success",children:lt}):f==="freeplays"?ft&&e.jsx("div",{className:"alert success",children:ft}):f==="dynamic-live"?wt&&e.jsx("div",{className:"alert success",children:wt}):f==="live-casino"?Dt&&e.jsx("div",{className:"alert success",children:Dt}):nt&&e.jsx("div",{className:"alert success",children:nt}),f==="basics"&&z&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:z.message}),Array.isArray(z.matches)&&z.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:z.matches.map((a,t)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(a.username||"UNKNOWN")}),e.jsx("span",{children:String(a.fullName||"No name")}),e.jsx("span",{children:String(a.phoneNumber||"No phone")})]},`${a.id||a.username||"duplicate"}-${t}`))})]}),f==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const a=(r,c)=>{Vt(r),La(c!=null?String(c):"")},t=()=>{Vt(null),La("")},i=async()=>{const r=localStorage.getItem("token");if(!(!r||!qe))try{He(!0);const c={};if(qe==="agentPercent"){const p=parseFloat(Da);if(isNaN(p)||p<0||p>100){oe("Must be 0-100");return}c.agentPercent=p}else if(qe==="playerRate"){const p=parseFloat(Da);if(isNaN(p)||p<0){oe("Must be a positive number");return}c.playerRate=p}await qa(s,c,r),oe(""),Ge("Saved"),t();const m=await Ha(s,r);m?.user&&E(Ja(m.user)),Pa(null),setTimeout(()=>Ge(""),2e3)}catch(c){oe(c.message||"Save failed")}finally{He(!1)}},o=[{key:"agentPercent",label:"Agent %",value:d?.agentPercent,display:d?.agentPercent!=null?`${d.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:d?.playerRate,display:d?.playerRate!=null?`$${d.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[o.map(r=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:r.label}),qe===r.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:r.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:Da,onChange:c=>La(c.target.value),autoFocus:!0,onKeyDown:c=>{c.key==="Enter"&&i(),c.key==="Escape"&&t()}}),e.jsx("button",{className:"commission-inline-save",onClick:i,disabled:Ca,children:Ca?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:t,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>r.editable&&a(r.key,r.value),children:[r.display,r.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},r.key)),Ut&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:Ut}),Yt&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:Yt})]})})()]}),Ve&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),zt&&e.jsx("div",{className:"alert error",children:zt}),D&&!Ve&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${D.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:D.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[D.chainTotal,"%"]}),D.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:Xn,style:{marginLeft:12},children:"Re-validate"})]}),Ze&&e.jsx("div",{className:`commission-validity-banner ${Ze.isValid?"valid":"invalid"}`,style:{marginTop:4},children:Ze.isValid?"Validation passed":Ze.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[D.upline.find(a=>a.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline.find(a=>a.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...D.upline].filter((a,t)=>t>0&&a.role!=="admin").reverse().map((a,t,i)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:t===i.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.effectivePercent==null&&a.agentPercent==null?"unset":""}`,children:a.effectivePercent!=null?`(${a.effectivePercent}%)`:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),t===i.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:Je,onChange:o=>Zn(o.target.value),disabled:Ca,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),_.filter(o=>{const r=String(o.role||"").toLowerCase();return r==="master_agent"||r==="super_agent"}).map(o=>{const r=o.id;return e.jsx("option",{value:r,children:String(o.username||"").toUpperCase()},r)})]})]},a.id||t)),D.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline[0].isSharedNode&&D.upline[0].linkedUsername?`${D.upline[0].username}/${D.upline[0].linkedUsername}`:D.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${D.upline[0].agentPercent==null?"unset":""}`,children:D.upline[0].agentPercent!=null?`(${D.upline[0].agentPercent}%)`:"(not set)"})]}),D.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),D.downlines.map((a,t)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",t+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.agentPercent==null?"unset":""}`,children:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${a.status==="active"?"active":"inactive"}`,children:a.status||""})]},a.id||t)),D.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"1",inputMode:"numeric",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:Gt,onChange:a=>{qn(String(a.target.value).replace(/\D/g,"")),Ma(null),Ke("")}}),e.jsx("button",{className:"btn btn-back",onClick:Qn,disabled:qt,children:qt?"Calculating...":"Calculate"})]}),Kt&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:Kt}),be&&e.jsxs("div",{className:"calc-result",children:[!be.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",be.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[be.distributions.map((a,t)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—"}),e.jsx("td",{children:a.role?a.role.replace(/_/g," "):"—"}),e.jsx("td",{children:a.effectivePercent!=null?`${a.effectivePercent}%`:a.agentPercent!=null?`${a.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Math.floor(Number(a.amount||0))]})]},a.id||t)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",Math.floor(be.distributions.reduce((a,t)=>a+Number(t.amount||0),0))]})})]})]})]})]})]})]})]}),f==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Le,onChange:a=>ot(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:me,onChange:a=>ct(a.target.value),children:Us.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:N(Y.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:b?"Funding Wallet":"Available"}),e.jsx("b",{children:N(Y.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:b?"House Money":"Carry"}),e.jsx("b",{className:b?na(Y.carry):Y.carry<0?"neg":"",children:N(Y.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:N(Y.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Tn?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):Ce.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):Ce.map(a=>{const t=zs(a),i=h(a.amount,0),o=t?0:i,r=t?i:0,c=a.balanceAfter,m=Qa(a),p=Pn(a),u=Cn(a),x=ue.includes(a.id);return e.jsxs("tr",{className:x?"selected":"",onClick:()=>Ps(a.id),children:[e.jsx("td",{children:ln(a.date)}),e.jsx("td",{children:m}),e.jsx("td",{children:p}),e.jsx("td",{children:o>0?N(o):"—"}),e.jsx("td",{children:r>0?N(r):"—"}),e.jsx("td",{className:B(c),children:c!=null?N(c):"—"}),e.jsx("td",{children:u}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:y=>{y.stopPropagation(),Ds(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:Cs,disabled:ue.length===0,children:"Delete Selected"})]}):f==="pending-bets"?e.jsxs("div",{className:"transactions-wrap",children:[_t&&e.jsx("div",{className:"alert success",children:_t}),(()=>{const a=c=>{const m=Number(c);if(!Number.isFinite(m)||m<=1)return"";const p=m>=2?Math.round((m-1)*100):Math.round(-100/(m-1));return p>0?`+${p}`:`${p}`},t=c=>{const m=String(c?.marketType||"").toLowerCase(),p=String(c?.selection||"").trim(),u=Number(c?.point),x=a(c?.odds);if(m==="spreads"&&Number.isFinite(u)){const y=u>0?`+${u}`:`${u}`;return`${p} ${y}${x?` ${x}`:""}`.trim()}return m==="totals"&&Number.isFinite(u)?`${p.toLowerCase().startsWith("u")?"Under":"Over"} ${Math.abs(u)}${x?` ${x}`:""}`.trim():`${p||"ML"}${x?` ${x}`:""}`.trim()},i=c=>{const m=Number(c?.amount||0),p=Number(c?.potentialPayout||0);return Math.max(0,p-m)},o=fe.reduce((c,m)=>c+Number(m?.amount||0),0),r=fe.reduce((c,m)=>c+i(m),0);return e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Sa?e.jsx("tr",{children:e.jsx("td",{colSpan:4,className:"tx-empty",children:"Loading pending bets..."})}):fe.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:4,className:"tx-empty",children:"No pending bets"})}):fe.map(c=>{const m=String(c?.type||"straight").toLowerCase(),p=Array.isArray(c?.selections)?c.selections:[],u=p.length>1,x=u?m==="parlay"?`Parlay - ${p.length} Teams`:m==="teaser"?`Teaser - ${p.length} Teams`:m==="if_bet"?`If Bet - ${p.length} Legs`:m==="reverse"?`Reverse - ${p.length} Legs`:`${m.toUpperCase()} - ${p.length} Legs`:p[0]?t(p[0]):"Straight",y=Number(c?.amount||0),j=i(c);return e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("div",{style:{fontWeight:600},children:x}),u&&e.jsx("div",{style:{marginTop:4,paddingLeft:12,fontSize:12,color:"#475569"},children:p.map((S,T)=>e.jsx("div",{children:t(S)},`${c.id}-leg-${T}`))})]}),e.jsx("td",{className:"neg",style:{fontWeight:700},children:N(y)}),e.jsx("td",{style:{fontWeight:700},children:N(j)}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:()=>Kn(c.id),disabled:$t===c.id,children:$t===c.id?"Deleting...":"Delete"})})]},c.id)})}),fe.length>0&&e.jsx("tfoot",{children:e.jsxs("tr",{children:[e.jsxs("td",{style:{textAlign:"right",fontWeight:700},children:["Total Risk: ",e.jsx("span",{className:"neg",children:N(o)}),"   Total Win: ",e.jsx("strong",{children:N(r)})]}),e.jsx("td",{}),e.jsx("td",{}),e.jsx("td",{})]})})]})})})()]}):f==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:R,onChange:a=>Fn(a.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:_n?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):We.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):We.map(a=>e.jsxs("tr",{className:ba===a.key?"selected":"",onClick:()=>ya(a.key),children:[e.jsx("td",{children:a.periodLabel}),e.jsx("td",{children:Math.floor(Number(a.net||0))})]},a.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:us})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:N(ms)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:ea?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:ne.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):ne.map(a=>e.jsxs("tr",{className:a?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:a.label||"Wager"}),e.jsx("td",{children:Math.floor(Number(a.amount||0))})]},a.id))})]})]})]})]}):f==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:$e,onChange:a=>On(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.floor(Number(K))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.floor(Number(xs))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:$n?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):Fe.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):Fe.map(a=>{const t=h(a.amount,0),i=h(a.balanceBefore,0),r=h(a.balanceAfter??K,0)>=i,c=r?t:0,m=r?0:t,p=h(a?.balanceAfter??K,0),u=Qa(a),x=Pn(a),y=Cn(a),j=ge.includes(a.id);return e.jsxs("tr",{className:j?"selected":"",onClick:()=>ys(a.id),children:[e.jsx("td",{children:d.username}),e.jsx("td",{children:ln(a.date)}),e.jsx("td",{children:u}),e.jsx("td",{children:x}),e.jsx("td",{children:c>0?Math.floor(c):"—"}),e.jsx("td",{children:m>0?Math.floor(m):"—"}),e.jsx("td",{children:Math.floor(p)}),e.jsx("td",{children:y}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:S=>{S.stopPropagation(),vs(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:js,disabled:ge.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:Ns,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:n.freePlayPercent,onChange:a=>g("freePlayPercent",a.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:n.maxFpCredit,onChange:a=>g("maxFpCredit",a.target.value)})]})]})]})]}):f==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMinStraightBet,onChange:a=>g("dlMinStraightBet",a.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxStraightBet,onChange:a=>g("dlMaxStraightBet",a.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:n.dlMaxPerOffering,onChange:a=>g("dlMaxPerOffering",a.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:n.dlMaxBetPerEvent,onChange:a=>g("dlMaxBetPerEvent",a.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxWinSingleBet,onChange:a=>g("dlMaxWinSingleBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEvent,onChange:a=>g("dlMaxWinEvent",a.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:n.dlDelaySec,onChange:a=>g("dlDelaySec",a.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:n.dlMaxFavoriteLine,onChange:a=>g("dlMaxFavoriteLine",a.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLine,onChange:a=>g("dlMaxDogLine",a.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMinParlayBet,onChange:a=>g("dlMinParlayBet",a.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxParlayBet,onChange:a=>g("dlMaxParlayBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEventParlay,onChange:a=>g("dlMaxWinEventParlay",a.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLineParlays,onChange:a=>g("dlMaxDogLineParlays",a.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:n.dlWagerCoolOffSec,onChange:a=>g("dlWagerCoolOffSec",a.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[a," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>g(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]})]}):f==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinDay,onChange:a=>g("casinoDefaultMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinDay,onChange:a=>g("casinoAgentMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinDay,onChange:a=>g("casinoPlayerMaxWinDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossDay,onChange:a=>g("casinoDefaultMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossDay,onChange:a=>g("casinoAgentMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossDay,onChange:a=>g("casinoPlayerMaxLossDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinWeek,onChange:a=>g("casinoDefaultMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinWeek,onChange:a=>g("casinoAgentMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinWeek,onChange:a=>g("casinoPlayerMaxWinWeek",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossWeek,onChange:a=>g("casinoDefaultMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossWeek,onChange:a=>g("casinoAgentMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossWeek,onChange:a=>g("casinoPlayerMaxLossWeek",a.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:n.firstName,placeholder:"Enter first name",onChange:a=>es(a.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:n.lastName,placeholder:"Enter last name",onChange:a=>as(a.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:n.phoneNumber,placeholder:"Enter phone number",onChange:a=>ts(a.target.value),className:ns?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:Ba,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${ss?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(v)?e.jsxs("select",{value:n.agentId,onChange:a=>g("agentId",a.target.value),children:[e.jsx("option",{value:"",children:"None"}),_.filter(a=>{const t=String(a.role||"").toLowerCase();return t==="master_agent"||t==="super_agent"}).map(a=>{const t=a.id;return e.jsx("option",{value:t,children:a.username},t)})]}):e.jsx("input",{value:d.masterAgentUsername||d.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:n.status,onChange:a=>g("status",a.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:a}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>g(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:n.accountType,onChange:a=>g("accountType",a.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:n.minBet,onChange:a=>g("minBet",a.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:n.wagerLimit,onChange:a=>g("wagerLimit",a.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:n.creditLimit,onChange:a=>g("creditLimit",a.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:n.settleLimit,onChange:a=>g("settleLimit",a.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:n.zeroBalanceWeekly,onChange:a=>g("zeroBalanceWeekly",a.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:n.tempCredit,onChange:a=>g("tempCredit",a.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:n.enableCaptcha,onChange:a=>g("enableCaptcha",a.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:n.cryptoPromoPct,onChange:a=>g("cryptoPromoPct",a.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:n.promoType,onChange:a=>g("promoType",a.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:n.expiresOn,onChange:a=>g("expiresOn",a.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:n.playerNotes,onChange:a=>g("playerNotes",a.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:d.balance??0,onChange:a=>E(t=>({...t,balance:Number(a.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:ps,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:n.appsVenmo,onChange:a=>g("appsVenmo",a.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:n.appsCashapp,onChange:a=>g("appsCashapp",a.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:n.appsApplePay,onChange:a=>g("appsApplePay",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:n.appsZelle,onChange:a=>g("appsZelle",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:n.appsPaypal,onChange:a=>g("appsPaypal",a.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:n.appsBtc,onChange:a=>g("appsBtc",a.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:n.appsOther,onChange:a=>g("appsOther",a.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",N(pa.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:B(pa.netProfit||0),children:N(pa.netProfit||0)})]})]})]}),Wn&&e.jsx("div",{className:"modal-overlay",onClick:()=>{Me(!1),Te(!1),te(!0)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:En?(()=>{const a=Ne,t=pn,i=ve,o=ta(i+(t.balanceDirection==="credit"?a:-a)),r=t.balanceDirection==="debit",c=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),m=b?$a:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:c})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",m]}),e.jsx("span",{style:{color:Ua(i)},children:N(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t.label," :"]}),e.jsxs("span",{style:{color:Ua(o)},children:[r?"-":"",N(a)]})]}),t.value==="deposit"&&!b&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:Ae?"#166534":"#6b7280"},children:Ae?`${sa.percent}% (${N(sa.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",m]}),e.jsx("span",{style:{color:Ua(o)},children:N(o)})]})]}),ae&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ae}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Te(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!un||fa,onClick:ks,children:fa?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:ua,onChange:a=>{xa(a.target.value),a.target.value==="deposit"&&te(!0),L("")},children:Ya.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:ga,onChange:a=>{xe(a.target.value===""?"":String(Math.floor(Number(a.target.value)))),L("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:b?$a:"Current Balance"}),e.jsx("b",{className:b?na(ve):B(ve),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>xe(Ra(ve)),children:N(ve)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:b?"Funding Wallet":"Carry"}),e.jsx("b",{className:b?B(aa):B(aa),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>xe(Ra(aa)),children:N(aa)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:pt,onChange:a=>ha(a.target.value),placeholder:"Optional note"}),pn.value==="deposit"&&!b&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:Ae,onChange:a=>te(a.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${sa.percent}% Freeplay (${N(sa.bonusAmount)})`})]}),ae&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ae}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{Me(!1),te(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!un,onClick:()=>{if(!mn){L("Enter a valid amount greater than 0.");return}L(""),Te(!0)},children:"Next"})]})]})})}),Rn&&e.jsx("div",{className:"modal-overlay",onClick:()=>{he(!1),Re(!1)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:zn?(()=>{const a=Va,t=hs,i=K,o=ta(i+(t?-a:a)),r=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:r})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:dn(i)},children:N(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:t?"#dc2626":"#1f2937"},children:[t?"-":"",N(a)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:dn(o)},children:N(o)})]})]}),se&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:se}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Re(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!gn,onClick:bs,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:re==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:re==="withdraw"?"#fee2e2":void 0,color:re==="withdraw"?"#dc2626":void 0},children:re==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:va,onChange:a=>{Na(a.target.value===""?"":String(Math.floor(Number(a.target.value)))),C("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:B(K),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>Na(Ra(K)),children:N(K)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:Oe,onChange:a=>yt(a.target.value),placeholder:"Optional note"}),se&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:se}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>he(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!gn,onClick:()=>{if(!xn){C("Enter a valid free play amount greater than 0.");return}C(""),Re(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
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
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}export{mi as default};
