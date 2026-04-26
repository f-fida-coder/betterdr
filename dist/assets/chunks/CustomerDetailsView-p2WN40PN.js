import{b as r,j as e}from"./vendor-common-DIOJvOBD.js";import{bf as Ya,u as fs,ai as bs,aq as Va,w as ys,B as ia,C as ra,bg as js,L as Ha,bh as vs,bi as Ns,bj as la,H as on,bk as ws,ar as Ss,q as ks,aG as Ps}from"./app-api-oLKgNwi-.js";import{I as cn,t as g,F as Cs,q as T,K as Ds,G as oa,H as dn,J as Ls}from"./utils-shared-CC164WKi.js";const pn={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},mn=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],un=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Ms=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],Z=s=>String(s||"").trim().toLowerCase(),Za=s=>String(s||"").trim().toUpperCase(),yn=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),As=new Set([...yn,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Ts=new Set(["bet_void","bet_void_admin","deleted_wager"]),Bs=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),Ws=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),Es=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),Ja=s=>{const S=Z(s?.type),N=Za(s?.reason),y=String(s?.description||"").toLowerCase();return S==="fp_deposit"||Es.has(N)||(S==="adjustment"||S==="fp_deposit")&&(y.includes("freeplay")||y.includes("free play"))},Fs=s=>{const S=Z(s?.type),N=Za(s?.reason);return S==="credit_adj"||S==="debit_adj"||Bs.has(N)},_s=s=>{const S=Za(s?.reason);return Ws.has(S)},Os=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,Ga=s=>!s||typeof s!="object"?s:{...s,minBet:g(s.minBet??s.defaultMinBet,0),maxBet:g(s.maxBet??s.wagerLimit??s.defaultMaxBet,0),wagerLimit:g(s.wagerLimit??s.maxBet??s.defaultMaxBet,0),creditLimit:g(s.creditLimit??s.defaultCreditLimit,0),balanceOwed:g(s.balanceOwed??s.defaultSettleLimit,0),balance:g(s.balance,0),pendingBalance:g(s.pendingBalance,0),freeplayBalance:g(s.freeplayBalance,0),lifetime:g(s.lifetime,0),lifetimePlusMinus:g(s.lifetimePlusMinus??s.lifetime,0)},xn=(s,S=0)=>s===""||s===null||s===void 0?g(S,0):g(s,0),gn=s=>String(s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Ka=s=>Z(s?.type)==="deleted_wager"?String(s?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":Ls(s),hn=s=>{const S=String(s?.description||"").trim();if(!S)return"—";const N=gn(S),y=gn(Ka(s));return!N||y&&(N===y||N===`${y}s`||`${N}s`===y)?"—":S},fn=s=>String(s?.actorUsername??s?.deletedByUsername??"").trim()||"—",bn=s=>{if(!s)return 0;const S=s?.$date||s,y=new Date(S).getTime();return Number.isNaN(y)?0:y},zs=s=>{const S=Math.abs(Number(s?.amount||0)),N=String(s?.sport||"").trim(),y=String(s?.reason||"").trim(),z=String(s?.status||"deleted").trim().toLowerCase()||"deleted",E=[z==="restored"?"Changed Wager":"Deleted Wager"];return N&&E.push(`(${N})`),y&&E.push(`- ${y}`),{id:`deleted-wager-${String(s?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:s?.id||null,user:s?.user||"Unknown",userId:s?.userId||null,amount:S,date:s?.deletedAt||s?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:z,reason:y?y.toUpperCase().replace(/\s+/g,"_"):null,description:E.join(" ")}},Rs=s=>{const S=Z(s);return S==="betting_adjustments"||S==="credit_debit_adjustments"||S==="promotional_adjustments"?"adjustment":"all"},Is=(s,S)=>{const N=Z(S);if(N===""||N==="all"||N==="all_transactions")return!0;const y=Z(s?.type);return N==="non_wager"?!As.has(y):N==="deposit_withdrawal"?y==="deposit"||y==="withdrawal":N==="betting_adjustments"||N==="credit_debit_adjustments"?Fs(s):N==="promotional_adjustments"?_s(s):N==="freeplay_transactions"?Ja(s):N==="wagers_only"?yn.has(y):N==="deleted_changed"||N==="deleted_transactions"?Ts.has(y):!0},$s=s=>!s||typeof s!="object"?"":String(s.userId??s.playerId??s.user?.id??s.user?.id??"").trim(),Us=s=>!s||typeof s!="object"?"":String(s.user??s.username??s.playerUsername??s.playerName??"").trim().toLowerCase(),qa=(s,S,N,y)=>{const z=$s(s);if(z!=="")return!!(z===String(S)||y?.id&&z===String(y.id));const Q=Us(s),E=String(N||"").trim().toLowerCase();return Q!==""&&E!==""?!!(Q===E||y?.username&&Q===String(y.username).trim().toLowerCase()):!0};function Qs({userId:s,onBack:S,onNavigateToUser:N,role:y="admin",viewContext:z=null}){const[Q,E]=r.useState(!0),[Qa,Xa]=r.useState(!1),[et,A]=r.useState(""),[at,X]=r.useState(""),[o,F]=r.useState(null),[ca,tt]=r.useState({}),[G,nt]=r.useState(null),[_,jn]=r.useState([]),[n,ee]=r.useState(pn),[vn,Se]=r.useState(!1),[f,O]=r.useState("basics"),[ke,st]=r.useState([]),[Nn,Pe]=r.useState(!1),[ae,L]=r.useState(""),[it,de]=r.useState(""),[Ce,da]=r.useState("7d"),[pe,pa]=r.useState("deposit_withdrawal"),[ma,rt]=r.useState("all"),[me,ua]=r.useState([]),[wn,De]=r.useState(!1),[xa,ga]=r.useState("deposit"),[ha,ue]=r.useState(""),[lt,fa]=r.useState(""),[Le,te]=r.useState(!0),[Sn,Me]=r.useState(!1),[ba,ot]=r.useState(!1),[R,kn]=r.useState("daily"),[Pn,ct]=r.useState(!1),[dt,Ae]=r.useState(""),[Te,pt]=r.useState([]),[ya,ja]=r.useState(""),[ne,Be]=r.useState([]),[We,mt]=r.useState([]),[Cn,Ee]=r.useState(!1),[se,C]=r.useState(""),[ut,ie]=r.useState(""),[Fe,Dn]=r.useState("7d"),[xe,va]=r.useState([]),[Ln,ge]=r.useState(!1),[re,xt]=r.useState("deposit"),[Na,wa]=r.useState(""),[_e,gt]=r.useState(""),[Mn,Oe]=r.useState(!1),[ht,ft]=r.useState(!1),[bt,ze]=r.useState(""),[yt,jt]=r.useState(""),[vt,Nt]=r.useState(!1),[wt,Re]=r.useState(""),[St,kt]=r.useState(""),[Pt,Ie]=r.useState(""),[I,$]=r.useState(null),[Ct,Dt]=r.useState(!1),[Lt,Mt]=r.useState(""),[$e,Sa]=r.useState(null),[D,ka]=r.useState(null),[Ue,At]=r.useState(!1),[Tt,Bt]=r.useState(""),[Pa,Ye]=r.useState(!1),[Wt,le]=r.useState(""),[Et,Ve]=r.useState(""),[He,Ft]=r.useState(null),[Ca,Da]=r.useState(""),[Ys,An]=r.useState(""),[Vs,Tn]=r.useState(""),[Hs,Bn]=r.useState(""),[Ge,_t]=r.useState(""),[Gs,Wn]=r.useState(""),[qs,En]=r.useState([]),[Ot,Fn]=r.useState(""),[he,La]=r.useState(null),[zt,Rt]=r.useState(!1),[It,qe]=r.useState(""),[Je,$t]=r.useState(null),_n=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],Ut=async(a,t)=>{const i=String(t||"").trim();if(!i)return null;try{const c=await ks(a,{agentId:i}),l=Number(c?.balanceOwed);return Number.isFinite(l)?l:null}catch(c){return console.warn("Failed to load live agent settlement balance:",c),null}};r.useEffect(()=>{s&&(async()=>{try{E(!0),A(""),X(""),de(""),L(""),$(null),F(null),Sa(null),ka(null),ee(pn),O("basics");const t=localStorage.getItem("token");if(!t){A("Please login to view details.");return}const[i,c]=await Promise.all([Ya(s,t),["admin","super_agent","master_agent","agent"].includes(y)?fs(t):Promise.resolve([])]),l=i?.user,d=l?.settings||{},m=d.dynamicLiveLimits||{},p=d.dynamicLiveFlags||{},u=d.liveCasinoLimits||{},h=u.default||{},v=u.agent||{},j=u.player||{};if(!l){A("User not found.");return}const k=String(l?.role||"").toLowerCase(),W=k==="agent"||k==="master_agent"||k==="super_agent",P=Ga(l),oe=W?await Ut(t,l.id||s):null;F(P),Sa(oe),tt(i?.stats||{}),nt(i?.referredBy||null),jn(Array.isArray(c)?c:[]),W&&(An(l?.agentPercent!=null?String(l.agentPercent):""),Tn(l?.playerRate!=null?String(l.playerRate):""),Bn(l?.hiringAgentPercent!=null?String(l.hiringAgentPercent):""),_t(P.parentAgentId||P.masterAgentId||P.createdBy?.id||P.createdBy||""),Wn(l?.subAgentPercent!=null?String(l.subAgentPercent):""),En(Array.isArray(l?.extraSubAgents)?l.extraSubAgents.map((V,H)=>({id:H,name:V.name||"",percent:V.percent!=null?String(V.percent):""})):[])),ee({password:"",firstName:P.firstName||"",lastName:P.lastName||"",phoneNumber:P.phoneNumber||"",minBet:P.minBet,agentId:W?P.parentAgentId||P.masterAgentId||"":y==="admin"?P.masterAgentId||P.agentId?.id||P.agentId||"":P.agentId?.id||P.agentId||"",status:(P.status||"active").toLowerCase(),creditLimit:P.creditLimit,wagerLimit:P.wagerLimit,settleLimit:P.balanceOwed,accountType:d.accountType||"credit",zeroBalanceWeekly:d.zeroBalanceWeekly||"standard",tempCredit:Number(d.tempCredit||0),expiresOn:d.expiresOn||"",enableCaptcha:!!d.enableCaptcha,cryptoPromoPct:Number(d.cryptoPromoPct||0),promoType:d.promoType||"promo_credit",playerNotes:d.playerNotes||"",sportsbook:d.sports??!0,casino:d.casino??!0,horses:d.racebook??!0,messaging:d.messaging??!1,dynamicLive:d.live??!0,propPlus:d.props??!0,liveCasino:d.liveCasino??!1,freePlayPercent:Number(d.freePlayPercent??20),maxFpCredit:Number(d.maxFpCredit??0),dlMinStraightBet:Number(m.minStraightBet??25),dlMaxStraightBet:Number(m.maxStraightBet??250),dlMaxPerOffering:Number(m.maxPerOffering??500),dlMaxBetPerEvent:Number(m.maxBetPerEvent??500),dlMaxWinSingleBet:Number(m.maxWinSingleBet??1e3),dlMaxWinEvent:Number(m.maxWinEvent??3e3),dlDelaySec:Number(m.delaySec??7),dlMaxFavoriteLine:Number(m.maxFavoriteLine??-1e4),dlMaxDogLine:Number(m.maxDogLine??1e4),dlMinParlayBet:Number(m.minParlayBet??10),dlMaxParlayBet:Number(m.maxParlayBet??100),dlMaxWinEventParlay:Number(m.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(m.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(m.wagerCoolOffSec??30),dlLiveParlays:!!p.liveParlays,dlBlockPriorStart:p.blockPriorStart??!0,dlBlockHalftime:p.blockHalftime??!0,dlIncludeGradedInLimits:!!p.includeGradedInLimits,dlUseRiskLimits:!!p.useRiskLimits,casinoDefaultMaxWinDay:Number(h.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(h.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(h.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(h.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(v.maxWinDay??1e3),casinoAgentMaxLossDay:Number(v.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(v.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(v.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(j.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(j.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(j.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(j.maxLossWeek??5e3),appsVenmo:l.apps?.venmo||"",appsCashapp:l.apps?.cashapp||"",appsApplePay:l.apps?.applePay||"",appsZelle:l.apps?.zelle||"",appsPaypal:l.apps?.paypal||"",appsBtc:l.apps?.btc||"",appsOther:l.apps?.other||""})}catch(t){console.error("Failed to load player details:",t),A(t.message||"Failed to load details")}finally{E(!1)}})()},[y,s]);const Ma=async()=>{if(!s)return;const a=localStorage.getItem("token");if(a)try{At(!0),Bt("");const t=await js(s,a);ka(t)}catch(t){Bt(t.message||"Failed to load commission chain")}finally{At(!1)}},On=async a=>{if(_t(a),!a)return;const t=localStorage.getItem("token");if(t)try{Ye(!0),le(""),Ve(""),await Ha(s,{parentAgentId:a},t),Ve("Master agent updated"),await Ma()}catch(i){le(i.message||"Failed to update master agent")}finally{Ye(!1)}},zn=async()=>{const a=localStorage.getItem("token"),t=parseFloat(Ot);if(!a||isNaN(t)||t<=0){qe("Enter a valid positive amount");return}try{Rt(!0),qe(""),La(null);const i=await Ns(s,t,a);La(i)}catch(i){qe(i.message||"Calculation failed")}finally{Rt(!1)}},Rn=async()=>{if(!D?.upline)return;const a=localStorage.getItem("token");if(a)try{const t=D.upline.map(c=>({id:c.id,username:c.username,agentPercent:c.agentPercent})),i=await vs(t,a);$t(i)}catch(t){$t({isValid:!1,errors:[t.message]})}},Yt=async a=>{if(!o?.username)return[];const t=a||localStorage.getItem("token");if(!t)throw new Error("Please login to view transactions.");const i={user:o.username||"",type:Rs(pe),status:ma,time:Ce,limit:300};s&&(i.userId=s);const c=await Va(i,t);let m=[...(Array.isArray(c?.transactions)?c.transactions:[]).filter(p=>qa(p,s,o.username,Ta))];if(["deleted_changed","deleted_transactions"].includes(Z(pe)))try{const p=await Ps({user:o.username||"",status:"all",sport:"all",time:Ce,limit:300},t),u=(Array.isArray(p?.wagers)?p.wagers:[]).filter(h=>String(h?.userId||"")===String(s)).map(zs);m=[...m,...u]}catch(p){console.warn("Deleted/Changed wagers could not be loaded:",p)}return m.filter(p=>Is(p,pe)).sort((p,u)=>bn(u?.date)-bn(p?.date))};r.useEffect(()=>{(async()=>{if(!(f!=="transactions"||!o))try{Pe(!0),L("");const t=await Yt();st(t)}catch(t){L(t.message||"Failed to load transactions")}finally{Pe(!1)}})()},[f,o,pe,ma,Ce,s]),r.useEffect(()=>{(async()=>{if(!(f!=="performance"||!o?.username))try{ct(!0),Ae("");const t=localStorage.getItem("token");if(!t){Ae("Please login to view performance.");return}const i=await bs({customer:o.username,time:R==="weekly"?"90d":R==="yearly"?"all":"30d",type:"all-types",limit:500},t),c=Array.isArray(i?.bets)?i.bets:[],l=new Map,d=u=>{const h=new Date(Date.UTC(u.getFullYear(),u.getMonth(),u.getDate())),v=h.getUTCDay()||7;h.setUTCDate(h.getUTCDate()+4-v);const j=new Date(Date.UTC(h.getUTCFullYear(),0,1));return Math.ceil(((h-j)/864e5+1)/7)};for(const u of c){const h=u?.createdAt,v=new Date(h);if(Number.isNaN(v.getTime()))continue;let j="",k="";if(R==="daily"){const B=v.getFullYear(),we=String(v.getMonth()+1).padStart(2,"0"),ce=String(v.getDate()).padStart(2,"0");j=`${B}-${we}-${ce}`,k=v.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(R==="weekly"){const B=v.getFullYear(),we=String(d(v)).padStart(2,"0");j=`${B}-W${we}`;const ce=new Date(v),ln=ce.getDay(),hs=ce.getDate()-ln+(ln===0?-6:1);ce.setDate(hs),k=`Week of ${ce.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(R==="monthly"){const B=v.getFullYear(),we=String(v.getMonth()+1).padStart(2,"0");j=`${B}-${we}`,k=v.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const B=v.getFullYear();j=`${B}`,k=`${B}`}const W=Number(u?.amount||0),P=Number(u?.potentialPayout||0),oe=String(u?.status||"").toLowerCase(),V=oe==="won"?Math.max(0,P-W):oe==="lost"?-W:0;l.has(j)||l.set(j,{date:v,net:0,wagers:[],periodLabel:k});const H=l.get(j);H.net+=V,H.wagers.push({id:u.id||`${j}-${H.wagers.length+1}`,label:`${u?.match?.awayTeam||""} vs ${u?.match?.homeTeam||""}`.trim()||u.selection||"Wager",amount:V})}const m=Array.from(l.entries()).map(([u,h])=>({key:u,date:h.date,periodLabel:h.periodLabel,net:h.net,wagers:h.wagers})).sort((u,h)=>h.key.localeCompare(u.key));if(R==="yearly"){const u=g(o?.lifetimePlusMinus??o?.lifetime,0);if(Number.isFinite(u)){const h=m.reduce((j,k)=>j+Number(k.net||0),0),v=u-h;if(Math.abs(v)>=.01){const j=String(new Date().getFullYear());let k=m.findIndex(W=>W.key===j);k<0&&(m.unshift({key:j,date:new Date,periodLabel:j,net:0,wagers:[]}),k=0),m[k]={...m[k],net:Number(m[k].net||0)+v,wagers:[...Array.isArray(m[k].wagers)?m[k].wagers:[],{id:`lifetime-carry-${m[k].key}`,label:"Lifetime +/- Carry",amount:v,synthetic:!0}]}}}}pt(m);const p=m[0]?.key||"";ja(p),Be(m[0]?.wagers||[])}catch(t){Ae(t.message||"Failed to load performance"),pt([]),ja(""),Be([])}finally{ct(!1)}})()},[f,o?.username,o?.lifetimePlusMinus,o?.lifetime,R]),r.useEffect(()=>{(async()=>{if(!(f!=="freeplays"||!o?.username))try{Ee(!0),C("");const t=localStorage.getItem("token");if(!t){C("Please login to view free play.");return}const i=await Va({user:o.username,type:"all",status:"all",time:Fe,limit:300},t),l=(Array.isArray(i?.transactions)?i.transactions:[]).filter(d=>qa(d,s,o.username,Ta)&&Ja(d));mt(l)}catch(t){C(t.message||"Failed to load free play")}finally{Ee(!1)}})()},[f,o?.username,Fe,s]);const x=(a,t)=>{ee(i=>({...i,[a]:t}))},In=a=>{$(null),ee(t=>({...t,firstName:oa(a)}))},$n=a=>{$(null),ee(t=>({...t,lastName:oa(a)}))},Un=a=>{$(null),ee(t=>({...t,phoneNumber:dn(a)}))},Vt=r.useMemo(()=>{const a=`${n.firstName||""} ${n.lastName||""}`.trim();return a||(o?.fullName?o.fullName:"")},[n.firstName,n.lastName,o?.fullName]);r.useMemo(()=>Vt||o?.username||"Player",[Vt,o?.username]);const Ht=r.useMemo(()=>cn(n.firstName,n.lastName,n.phoneNumber,o?.username||""),[n.firstName,n.lastName,n.phoneNumber,o?.username]),Aa=r.useMemo(()=>o?Ht||o.displayPassword||"Not set":"",[o,Ht]),Gt=r.useMemo(()=>{const a=new Set;return(Array.isArray(I?.matches)?I.matches:[]).forEach(i=>{(Array.isArray(i?.matchReasons)?i.matchReasons:[]).forEach(l=>{const d=String(l||"").trim().toLowerCase();d&&a.add(d)})}),a},[I]),Yn=Gt.has("phone"),Vn=Gt.has("password"),Hn=r.useMemo(()=>{const a=String(o?.role||"player").toLowerCase();return a==="user"||a==="player"?"PLAYER":a.replace(/_/g," ").toUpperCase()},[o?.role]),b=r.useMemo(()=>{const a=String(o?.role||"player").toLowerCase();return a==="agent"||a==="master_agent"||a==="master agent"||a==="super_agent"||a==="super agent"},[o?.role]),Ta=r.useMemo(()=>{if(!b||!o?.username||!_?.length)return null;const a=String(o.username).toUpperCase();if(a.endsWith("MA")){const t=a.slice(0,-2),i=_.find(c=>String(c.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}else{const t=a+"MA",i=_.find(c=>String(c.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}},[b,o?.username,_]);r.useMemo(()=>{if(!Ge)return"";const a=_.find(t=>t.id===Ge);return a?String(a.username||"").toUpperCase():String(o?.createdByUsername||o?.createdBy?.username||"").toUpperCase()},[Ge,_,o]);const U=g(o?.balance,0),fe=g(o?.pendingBalance,0),qt=g(o?.freeplayBalance,0),Jt=g(o?.lifetimePlusMinus??o?.lifetime,0),be=xn(n.creditLimit,o?.creditLimit??o?.defaultCreditLimit),Ba=xn(n.settleLimit,o?.balanceOwed??o?.defaultSettleLimit),Wa=g(o?.minBet??o?.defaultMinBet??n.minBet,0),Ea=g(o?.maxBet??o?.defaultMaxBet??o?.wagerLimit??n.wagerLimit,0),q=b&&$e!==null?g($e,0):U,Fa="Balance Owed / House Money",_a=r.useMemo(()=>be+U-fe,[be,U,fe]),Y=r.useMemo(()=>{let a=0;for(const t of ke)t?.status==="pending"&&String(t?.type||"").toLowerCase().includes("casino")&&(a+=Number(t.amount||0));return{pending:fe,available:b?U:Number(_a||0),carry:b&&$e!==null?q:U,nonPostedCasino:a}},[ke,fe,U,_a,b,$e,q]),Kt=a=>Math.round(g(a,0)),Oa=a=>String(Math.abs(Kt(a))),w=a=>"$"+Kt(a).toLocaleString("en-US"),M=a=>{const t=g(a,0);return`$${Math.round(t).toLocaleString("en-US")}`},Gn=async()=>{Mt(""),Dt(!0);try{const a=localStorage.getItem("token");if(!a)throw new Error("No admin token found. Please log in again.");const t=await ys(s,a);if(!t?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",a);const l=localStorage.getItem("userRole")||"";l&&sessionStorage.setItem("impersonationBaseRole",l)}localStorage.setItem("token",t.token),localStorage.setItem("userRole",String(t?.role||"user")),localStorage.removeItem("user");const i=String(t?.role||"").toLowerCase();let c="/";i==="admin"?c="/admin/dashboard":i==="agent"?c="/agent/dashboard":(i==="master_agent"||i==="super_agent")&&(c="/super_agent/dashboard"),window.location.href=c}catch(a){Mt(a.message||"Failed to login as user. Please try again."),Dt(!1)}},za=String(G?.id||"").trim(),qn=r.useMemo(()=>{if(!G)return"—";const a=G.firstName||"",t=G.lastName||"";return[a,t].filter(Boolean).join(" ").trim()||G.username||G.id||"—"},[G]),Ke=za!==""&&za!==String(s||"").trim()&&typeof N=="function",Jn=()=>{Ke&&N(za)},Kn=async()=>{const a=Wa,t=Ea,i=be,c=Ba,l=String(Aa??""),d=String(o?.role||"").toLowerCase(),m=d==="user"||d==="player"||d==="",p="https://bettorplays247.com",u=m?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${o?.username||""}`,`Password: ${l}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(c)}`,"",`Site: ${p}`,"",Os]:[`Login: ${o?.username||""}`,`Password: ${l}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(c)}`,"",`Site: ${p}`],h=u.join(`
`),j=`<div style="font-family:sans-serif;white-space:pre-wrap;">${u.map(k=>k===""?"<br>":k).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([h],{type:"text/plain"}),"text/html":new Blob([j],{type:"text/html"})})]):await navigator.clipboard.writeText(h),Ie("All details copied"),window.setTimeout(()=>Ie(""),1400)}catch{Ie("Copy failed"),window.setTimeout(()=>Ie(""),1400)}},Zn=async()=>{try{Xa(!0),A(""),X(""),$(null);const a=localStorage.getItem("token");if(!a){A("Please login again.");return}const t=oa(n.firstName).trim(),i=oa(n.lastName).trim(),c=dn(n.phoneNumber).trim(),l=b?"":cn(t,i,c,o?.username||"");if(!b&&(!t||!i||!c||!l)){A("First name, last name, and phone number are required to generate password.");return}const d={firstName:t,lastName:i,phoneNumber:c,fullName:`${t} ${i}`.trim(),password:l,allowDuplicateSave:!0,status:n.status,minBet:Number(n.minBet||0),creditLimit:Number(n.creditLimit||0),maxBet:Number(n.wagerLimit||0),wagerLimit:Number(n.wagerLimit||0),balanceOwed:Number(n.settleLimit||0),settings:{accountType:n.accountType,zeroBalanceWeekly:n.zeroBalanceWeekly,tempCredit:Number(n.tempCredit||0),expiresOn:n.expiresOn||"",enableCaptcha:!!n.enableCaptcha,cryptoPromoPct:Number(n.cryptoPromoPct||0),promoType:n.promoType,playerNotes:n.playerNotes,sports:!!n.sportsbook,casino:!!n.casino,racebook:!!n.horses,messaging:!!n.messaging,live:!!n.dynamicLive,props:!!n.propPlus,liveCasino:!!n.liveCasino}};d.apps={venmo:n.appsVenmo||"",cashapp:n.appsCashapp||"",applePay:n.appsApplePay||"",zelle:n.appsZelle||"",paypal:n.appsPaypal||"",btc:n.appsBtc||"",other:n.appsOther||""},["admin","super_agent","master_agent"].includes(y)&&n.agentId&&(d.agentId=n.agentId);let m=null;if(b){const h={firstName:t,lastName:i,fullName:`${t} ${i}`.trim(),phoneNumber:c,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0)};n.agentId&&(h.parentAgentId=n.agentId),await Ha(s,h,a),m={}}else y==="agent"?m=await ia(s,d,a):m=await ra(s,d,a);const p={...d};delete p.allowDuplicateSave,F(b?h=>({...h,firstName:p.firstName,lastName:p.lastName,fullName:p.fullName,phoneNumber:p.phoneNumber,status:p.status,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0),minBet:Number(n.minBet||0),maxBet:Number(n.wagerLimit||0),creditLimit:Number(n.creditLimit||0),balanceOwed:Number(n.settleLimit||0),displayPassword:h?.displayPassword||""}):h=>({...h,...p,displayPassword:l||h?.displayPassword||"",settings:{...h?.settings||{},...p.settings}}));const u=m?.duplicateWarning;u&&typeof u=="object"?($({message:u.message||"Likely duplicate player detected.",matches:Array.isArray(u.matches)?u.matches:[]}),X("Changes saved with duplicate warning.")):X("Changes saved successfully.")}catch(a){console.error("Failed to save player details:",a);const t=Array.isArray(a?.duplicateMatches)?a.duplicateMatches:Array.isArray(a?.details?.matches)?a.details.matches:[];if(a?.isDuplicate===!0||a?.duplicate===!0||a?.code==="DUPLICATE_PLAYER"||a?.details?.duplicate===!0){$({message:a?.message||"Likely duplicate player detected.",matches:t}),A("");return}A(a.message||"Failed to save details")}finally{Xa(!1)}},Qn=async()=>{try{const a=localStorage.getItem("token");if(!a||!o)return;await on(s,{balance:g(o.balance,0)},a),X("Balance updated."),A("")}catch(a){A(a.message||"Failed to update balance")}},Zt=a=>{if(!a)return"—";const t=a?.$date||a,i=new Date(t);return Number.isNaN(i.getTime())?"—":i.toLocaleString()},J=a=>{a==="transactions"?(O("transactions"),da("7d"),pa("deposit_withdrawal"),rt("all")):a==="pending"?(O("transactions"),da("7d"),pa("deposit_withdrawal"),rt("pending")):a==="performance"?O("performance"):a==="freeplays"?O("freeplays"):a==="dynamic-live"?O("dynamic-live"):a==="live-casino"?O("live-casino"):a==="commission"?(O("commission"),D||Ma()):O("basics"),Se(!1),X(""),de(""),A(""),$(null),L(""),Ae(""),C(""),ie(""),ze(""),jt(""),Re(""),kt("")},Ze=()=>{J("transactions");const a=b?q:g(o?.balance,0),t=b?a>0?"deposit":"withdrawal":a>0?"withdrawal":"deposit";ga(t),ue(""),fa(""),te(!0),L(""),De(!0)},Ra=!!z?.autoOpenDeposit,[Qt,Xt]=r.useState(!1);r.useEffect(()=>{Xt(!1)},[s,Ra]),r.useEffect(()=>{!Ra||Qt||o?.id&&b&&(Ze(),Xt(!0))},[Ra,Qt,o?.id,b]);const Qe=r.useMemo(()=>Te.find(a=>a.key===ya)||null,[Te,ya]);r.useEffect(()=>{if(!Qe){Be([]);return}Be(Qe.wagers||[])},[Qe]);const Xn=r.useMemo(()=>ne.reduce((a,t)=>a+Number(t.amount||0),0),[ne]),es=r.useMemo(()=>ne.filter(a=>!a?.synthetic).length,[ne]),ye=r.useMemo(()=>b?q:g(o?.balance,0),[b,q,o?.balance]),Xe=r.useMemo(()=>b?g(o?.balance,0):g(Y?.carry,0),[b,o?.balance,Y?.carry]),as=r.useMemo(()=>We.filter(a=>String(a.status||"").toLowerCase()==="pending").reduce((a,t)=>a+g(t.amount,0),0),[We]),K=qt,ea=a=>{const t=g(a,0);return Number.isFinite(t)?Math.round(t*100)/100:0},en=a=>{const t=T(a);return t==="neg"?"#dc2626":t==="pos"?"#16a34a":"#000000"},aa=a=>{const t=T(a);return t==="pos"?"neg":t==="neg"?"pos":"neutral"},ts=a=>b?aa(a):T(a),Ia=(a,t=b)=>{const i=t?aa(a):T(a);return i==="neg"?"#dc2626":i==="pos"?"#16a34a":"#000000"},$a=b?un:mn,an=$a.find(a=>a.value===xa)||$a[0],je=Number(ha||0),tn=Number.isFinite(je)&&je>0,nn=tn,ta=r.useMemo(()=>Cs(o,je),[o,je]),ns=re==="withdraw",Ua=Number(Na||0),sn=Number.isFinite(Ua)&&Ua>0,rn=sn,ve=async()=>{if(o?.username)try{Ee(!0);const a=localStorage.getItem("token");if(!a)return;const t=await Va({user:o.username,type:"all",status:"all",time:Fe,limit:300},a),i=Array.isArray(t?.transactions)?t.transactions:[];mt(i.filter(c=>qa(c,s,o.username,Ta)&&Ja(c)))}catch(a){C(a.message||"Failed to refresh free play")}finally{Ee(!1)}},ss=(a,t="transaction")=>{const i=Number(a?.deleted||0),c=Number(a?.skipped||0),l=Number(a?.cascadeDeleted||0),m=(Array.isArray(a?.warnings)?a.warnings:[]).find(u=>typeof u?.message=="string"&&u.message.trim()!=="");let p=i>0?`Deleted ${i} ${t}(s).`:`No ${t}(s) were deleted.`;return l>0&&(p+=` Linked free play deleted: ${l}.`),c>0&&(p+=` Skipped ${c}.`),m&&(p+=` ${m.message}`),i>0||l>0?p+=" Balances and totals were updated.":p+=" Balances and totals were not changed.",p},na=(a,t,i,c)=>{const l=Number(a?.deleted||0),d=Number(a?.cascadeDeleted||0),m=ss(a,t);if(l>0||d>0){i(m),c("");return}i(""),c(m)},is=async()=>{try{const a=Number(Na||0);if(a<=0||Number.isNaN(a)){C("Enter a valid free play amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!o){C("Please login again.");return}const i=g(o.freeplayBalance,0),c=re==="withdraw",l=await Ss(s,{operationMode:"transaction",amount:a,direction:c?"debit":"credit",description:_e.trim()},t),d=g(l?.user?.freeplayBalance,NaN),m=l?.user?.freeplayExpiresAt??null;F(u=>u&&{...u,freeplayBalance:Number.isFinite(d)?d:ea(i+(c?-a:a)),freeplayExpiresAt:m});const p=c?"withdrawn":"added";_e.trim()?ie(`Free play ${p}. Note: "${_e.trim()}"`):ie(`Free play ${p} successfully.`),C(""),ge(!1),Oe(!1),wa(""),gt(""),await ve()}catch(a){C(a.message||"Failed to update free play")}},rs=a=>{va(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},ls=async()=>{try{if(xe.length===0||!window.confirm(`Delete ${xe.length} selected free play transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t=await la(xe,a);va([]),na(t,"free play transaction",ie,C),await ve(),await Ne(),await sa()}catch(a){C(a.message||"Failed to delete free play transactions")}},os=async a=>{try{if(!a||!window.confirm("Delete this free play transaction?"))return;const t=localStorage.getItem("token");if(!t){C("Please login again.");return}const i=await la([a],t);va(c=>c.filter(l=>l!==a)),na(i,"free play transaction",ie,C),await ve(),await Ne(),await sa()}catch(t){C(t.message||"Failed to delete free play transaction")}},cs=async()=>{try{const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t={settings:{freePlayPercent:Number(n.freePlayPercent||0),maxFpCredit:Number(n.maxFpCredit||0)}};y==="agent"?await ia(s,t,a):await ra(s,t,a),ie("Free play settings saved."),C("")}catch(a){C(a.message||"Failed to save free play settings")}},ds=async()=>{try{ft(!0);const a=localStorage.getItem("token");if(!a){ze("Please login again.");return}const t={settings:{dynamicLiveLimits:{minStraightBet:Number(n.dlMinStraightBet||0),maxStraightBet:Number(n.dlMaxStraightBet||0),maxPerOffering:Number(n.dlMaxPerOffering||0),maxBetPerEvent:Number(n.dlMaxBetPerEvent||0),maxWinSingleBet:Number(n.dlMaxWinSingleBet||0),maxWinEvent:Number(n.dlMaxWinEvent||0),delaySec:Number(n.dlDelaySec||0),maxFavoriteLine:Number(n.dlMaxFavoriteLine||0),maxDogLine:Number(n.dlMaxDogLine||0),minParlayBet:Number(n.dlMinParlayBet||0),maxParlayBet:Number(n.dlMaxParlayBet||0),maxWinEventParlay:Number(n.dlMaxWinEventParlay||0),maxDogLineParlays:Number(n.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(n.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!n.dlLiveParlays,blockPriorStart:!!n.dlBlockPriorStart,blockHalftime:!!n.dlBlockHalftime,includeGradedInLimits:!!n.dlIncludeGradedInLimits,useRiskLimits:!!n.dlUseRiskLimits}}};y==="agent"?await ia(s,t,a):await ra(s,t,a),jt("Dynamic Live settings saved."),ze("")}catch(a){ze(a.message||"Failed to save Dynamic Live settings")}finally{ft(!1)}},ps=async()=>{try{Nt(!0);const a=localStorage.getItem("token");if(!a){Re("Please login again.");return}const t={settings:{liveCasinoLimits:{default:{maxWinDay:Number(n.casinoDefaultMaxWinDay||0),maxLossDay:Number(n.casinoDefaultMaxLossDay||0),maxWinWeek:Number(n.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(n.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(n.casinoAgentMaxWinDay||0),maxLossDay:Number(n.casinoAgentMaxLossDay||0),maxWinWeek:Number(n.casinoAgentMaxWinWeek||0),maxLossWeek:Number(n.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(n.casinoPlayerMaxWinDay||0),maxLossDay:Number(n.casinoPlayerMaxLossDay||0),maxWinWeek:Number(n.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(n.casinoPlayerMaxLossWeek||0)}}}};y==="agent"?await ia(s,t,a):await ra(s,t,a),kt("Live Casino limits saved."),Re("")}catch(a){Re(a.message||"Failed to save Live Casino limits")}finally{Nt(!1)}},Ne=async()=>{if(o){Pe(!0);try{const a=localStorage.getItem("token");if(!a){L("Please login to view transactions.");return}const t=await Yt(a);st(t)}catch(a){L(a.message||"Failed to refresh transactions")}finally{Pe(!1)}}},sa=async()=>{try{const a=localStorage.getItem("token");if(!a)return;const t=await Ya(s,a),i=t?.user;if(!i||typeof i!="object")return;const c=Ga(i),l=String(i?.role||"").toLowerCase(),m=l==="agent"||l==="master_agent"||l==="super_agent"?await Ut(a,i.id||s):null;F(p=>p&&{...p,balance:c.balance,pendingBalance:c.pendingBalance,freeplayBalance:c.freeplayBalance,lifetime:c.lifetime,lifetimePlusMinus:c.lifetimePlusMinus,balanceOwed:c.balanceOwed,creditLimit:c.creditLimit,updatedAt:c.updatedAt}),Sa(m),t?.stats&&typeof t.stats=="object"&&tt(t.stats),t?.referredBy!==void 0&&nt(t.referredBy||null)}catch(a){console.warn("Failed to refresh customer financials after transaction update:",a)}},ms=async()=>{if(!ba){ot(!0);try{const a=Number(ha||0);if(a<=0||Number.isNaN(a)){L("Enter a valid amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!o){L("Please login again.");return}const i=b?un:mn,c=i.find(j=>j.value===xa)||i[0],l=g(o.balance,0),d=ea(l+(c.balanceDirection==="credit"?a:-a)),m=lt.trim();let p;b?p=await ws(s,{amount:a,direction:c.balanceDirection,type:c.apiType,description:m||c.defaultDescription},t):p=await on(s,{operationMode:"transaction",amount:a,direction:c.balanceDirection,type:c.apiType,reason:c.reason,description:m||c.defaultDescription,applyDepositFreeplayBonus:Le},t);const u=b?0:g(p?.freeplayBonus?.amount,0),h=b?0:g(p?.referralBonus?.amount,0);F(j=>{if(!j)return j;const k=b?g(p?.agent?.balance,NaN):g(p?.user?.balance,NaN),W=Number.isFinite(k)?k:d,P=g(p?.user?.freeplayBalance,NaN),oe=Number.isFinite(P)?P:g(j.freeplayBalance,0),V=p?.user?.lifetimePlusMinus??p?.user?.lifetime??j.lifetimePlusMinus??j.lifetime??0,H=g(V,NaN),B=Number.isFinite(H)?H:g(j.lifetimePlusMinus??j.lifetime,0);return{...j,balance:W,freeplayBalance:oe,lifetime:B,lifetimePlusMinus:B}});const v=["Transaction saved and balance updated."];u>0&&v.push(`Auto free play bonus added: ${w(u)}.`),h>0&&v.push(`Referral bonus granted: ${w(h)}.`),de(v.join(" ")),L(""),De(!1),Me(!1),ga("deposit"),ue(""),fa(""),te(!0),await Ne()}catch(a){L(a.message||"Failed to save transaction")}finally{ot(!1)}}},us=a=>{ua(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},xs=async()=>{try{if(me.length===0||!window.confirm(`Delete ${me.length} selected transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){L("Please login again.");return}const t=await la(me,a);ua([]),await Ne(),await ve(),await sa(),na(t,"transaction",de,L)}catch(a){L(a.message||"Failed to delete selected transactions")}},gs=async a=>{try{if(!a||!window.confirm("Delete this transaction?"))return;const t=localStorage.getItem("token");if(!t){L("Please login again.");return}const i=await la([a],t);ua(c=>c.filter(l=>l!==a)),await Ne(),await ve(),await sa(),na(i,"transaction",de,L)}catch(t){L(t.message||"Failed to delete transaction")}};return Q?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):o?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:b?(()=>{const a=String(o.username||"").toUpperCase(),t=a+"MA";return _?.find(c=>String(c.username||"").toUpperCase()===t)?`${a} (${t})`:a})():o.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:Hn})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:o.username||""})]}),b?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>J("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(o?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:o?.agentPercent!=null?`${o.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:Ze,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${T(U)}`,children:w(U)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:Aa})]}),b?(()=>{const a=o?.agentPercent!=null?parseFloat(o.agentPercent):null,t=o?.hiringAgentPercent!=null?parseFloat(o.hiringAgentPercent):null,i=5,c=t!=null&&a!=null?t-a:null,l=t==null||c===0,d=!l&&t!=null?100-i-t:null,m=d!=null&&d>0,p=!l&&c>0,u=[];return p&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[c,"%"]})]},"hiring")),m&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[d,"%"]})]},"upline")),u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),u.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>J("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:o?.playerRate!=null?`$${o.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[u[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(Wa)})]}),u[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:M(Ea)})]}),u[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:M(be)})]}),u[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Ba)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"&&ma==="pending"?" detail-metric-active":""}`,onClick:()=>J("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:w(fe)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(Wa)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:w(_a)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:M(Ea)})]}),!b&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="freeplays"?" detail-metric-active":""}`,onClick:()=>J("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:w(qt)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:M(be)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="performance"?" detail-metric-active":""}`,onClick:()=>J("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${T(Jt)}`,children:w(Jt)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Ba)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${Ke?"detail-link-item":""}`,onClick:Jn,disabled:!Ke,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${Ke?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:qn})]})]}),b?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:Ze,children:[e.jsx("span",{className:"detail-label",children:Fa}),e.jsx("strong",{className:`detail-value ${ts(q)}`,children:w(q)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:Kn,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:Gn,disabled:Ct,children:Ct?"Logging in...":"Login User"})]})]})]}),Lt&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:Lt}),Pt&&e.jsx("div",{className:"copy-notice",children:Pt})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>Se(a=>!a),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:f==="transactions"?"Transactions":f==="performance"?"Performance":f==="freeplays"?"Free Play":f==="dynamic-live"?"Dynamic Live":f==="live-casino"?"Live Casino":f==="commission"?"Commission Tree":"The Basics"})]}),f==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:Ze,children:"New transaction"}):f==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{xt("withdraw"),C(""),ge(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{xt("deposit"),C(""),ge(!0)},children:"Add Free Play"})]}):f==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:ds,disabled:ht,children:ht?"Saving...":"Save"}):f==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:ps,disabled:vt,children:vt?"Saving...":"Save"}):f==="commission"?e.jsx("button",{className:"btn btn-back",onClick:Ma,disabled:Ue,children:Ue?"Loading...":"Refresh"}):f==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:Zn,disabled:Qa,children:Qa?"Saving...":"Save"})]}),vn&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>Se(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>Se(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:_n.map(a=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>J(a.id),children:[e.jsx("span",{className:"menu-icon",children:a.icon}),e.jsx("span",{className:"menu-label",children:a.label})]},a.id))})]})]}),f==="transactions"?ae&&e.jsx("div",{className:"alert error",children:ae}):f==="performance"?dt&&e.jsx("div",{className:"alert error",children:dt}):f==="freeplays"?se&&e.jsx("div",{className:"alert error",children:se}):f==="dynamic-live"?bt&&e.jsx("div",{className:"alert error",children:bt}):f==="live-casino"?wt&&e.jsx("div",{className:"alert error",children:wt}):et&&e.jsx("div",{className:"alert error",children:et}),f==="transactions"?it&&e.jsx("div",{className:"alert success",children:it}):f==="freeplays"?ut&&e.jsx("div",{className:"alert success",children:ut}):f==="dynamic-live"?yt&&e.jsx("div",{className:"alert success",children:yt}):f==="live-casino"?St&&e.jsx("div",{className:"alert success",children:St}):at&&e.jsx("div",{className:"alert success",children:at}),f==="basics"&&I&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:I.message}),Array.isArray(I.matches)&&I.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:I.matches.map((a,t)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(a.username||"UNKNOWN")}),e.jsx("span",{children:String(a.fullName||"No name")}),e.jsx("span",{children:String(a.phoneNumber||"No phone")})]},`${a.id||a.username||"duplicate"}-${t}`))})]}),f==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const a=(l,d)=>{Ft(l),Da(d!=null?String(d):"")},t=()=>{Ft(null),Da("")},i=async()=>{const l=localStorage.getItem("token");if(!(!l||!He))try{Ye(!0);const d={};if(He==="agentPercent"){const p=parseFloat(Ca);if(isNaN(p)||p<0||p>100){le("Must be 0-100");return}d.agentPercent=p}else if(He==="playerRate"){const p=parseFloat(Ca);if(isNaN(p)||p<0){le("Must be a positive number");return}d.playerRate=p}await Ha(s,d,l),le(""),Ve("Saved"),t();const m=await Ya(s,l);m?.user&&F(Ga(m.user)),ka(null),setTimeout(()=>Ve(""),2e3)}catch(d){le(d.message||"Save failed")}finally{Ye(!1)}},c=[{key:"agentPercent",label:"Agent %",value:o?.agentPercent,display:o?.agentPercent!=null?`${o.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:o?.playerRate,display:o?.playerRate!=null?`$${o.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[c.map(l=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:l.label}),He===l.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:l.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:Ca,onChange:d=>Da(d.target.value),autoFocus:!0,onKeyDown:d=>{d.key==="Enter"&&i(),d.key==="Escape"&&t()}}),e.jsx("button",{className:"commission-inline-save",onClick:i,disabled:Pa,children:Pa?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:t,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>l.editable&&a(l.key,l.value),children:[l.display,l.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},l.key)),Wt&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:Wt}),Et&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:Et})]})})()]}),Ue&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),Tt&&e.jsx("div",{className:"alert error",children:Tt}),D&&!Ue&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${D.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:D.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[D.chainTotal,"%"]}),D.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:Rn,style:{marginLeft:12},children:"Re-validate"})]}),Je&&e.jsx("div",{className:`commission-validity-banner ${Je.isValid?"valid":"invalid"}`,style:{marginTop:4},children:Je.isValid?"Validation passed":Je.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[D.upline.find(a=>a.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline.find(a=>a.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...D.upline].filter((a,t)=>t>0&&a.role!=="admin").reverse().map((a,t,i)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:t===i.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.effectivePercent==null&&a.agentPercent==null?"unset":""}`,children:a.effectivePercent!=null?`(${a.effectivePercent}%)`:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),t===i.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:Ge,onChange:c=>On(c.target.value),disabled:Pa,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),_.filter(c=>{const l=String(c.role||"").toLowerCase();return l==="master_agent"||l==="super_agent"}).map(c=>{const l=c.id;return e.jsx("option",{value:l,children:String(c.username||"").toUpperCase()},l)})]})]},a.id||t)),D.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline[0].isSharedNode&&D.upline[0].linkedUsername?`${D.upline[0].username}/${D.upline[0].linkedUsername}`:D.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${D.upline[0].agentPercent==null?"unset":""}`,children:D.upline[0].agentPercent!=null?`(${D.upline[0].agentPercent}%)`:"(not set)"})]}),D.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),D.downlines.map((a,t)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",t+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.agentPercent==null?"unset":""}`,children:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${a.status==="active"?"active":"inactive"}`,children:a.status||""})]},a.id||t)),D.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:Ot,onChange:a=>{Fn(a.target.value),La(null),qe("")}}),e.jsx("button",{className:"btn btn-back",onClick:zn,disabled:zt,children:zt?"Calculating...":"Calculate"})]}),It&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:It}),he&&e.jsxs("div",{className:"calc-result",children:[!he.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",he.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[he.distributions.map((a,t)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—"}),e.jsx("td",{children:a.role?a.role.replace(/_/g," "):"—"}),e.jsx("td",{children:a.effectivePercent!=null?`${a.effectivePercent}%`:a.agentPercent!=null?`${a.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Number(a.amount||0).toFixed(2)]})]},a.id||t)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",he.distributions.reduce((a,t)=>a+Number(t.amount||0),0).toFixed(2)]})})]})]})]})]})]})]})]}),f==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Ce,onChange:a=>da(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:pe,onChange:a=>pa(a.target.value),children:Ms.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:w(Y.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:b?"Funding Wallet":"Available"}),e.jsx("b",{children:w(Y.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:b?"House Money":"Carry"}),e.jsx("b",{className:b?aa(Y.carry):Y.carry<0?"neg":"",children:w(Y.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:w(Y.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Nn?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):ke.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):ke.map(a=>{const t=Ds(a),i=g(a.amount,0),c=t?0:i,l=t?i:0,d=a.balanceAfter,m=Ka(a),p=hn(a),u=fn(a),h=me.includes(a.id);return e.jsxs("tr",{className:h?"selected":"",onClick:()=>us(a.id),children:[e.jsx("td",{children:Zt(a.date)}),e.jsx("td",{children:m}),e.jsx("td",{children:p}),e.jsx("td",{children:c>0?w(c):"—"}),e.jsx("td",{children:l>0?w(l):"—"}),e.jsx("td",{className:T(d),children:d!=null?w(d):"—"}),e.jsx("td",{children:u}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:v=>{v.stopPropagation(),gs(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:xs,disabled:me.length===0,children:"Delete Selected"})]}):f==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:R,onChange:a=>kn(a.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:Pn?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):Te.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):Te.map(a=>e.jsxs("tr",{className:ya===a.key?"selected":"",onClick:()=>ja(a.key),children:[e.jsx("td",{children:a.periodLabel}),e.jsx("td",{children:Math.round(Number(a.net||0))})]},a.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:es})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:w(Xn)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:Qe?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:ne.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):ne.map(a=>e.jsxs("tr",{className:a?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:a.label||"Wager"}),e.jsx("td",{children:Math.round(Number(a.amount||0))})]},a.id))})]})]})]})]}):f==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Fe,onChange:a=>Dn(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.round(Number(K))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.round(Number(as))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Cn?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):We.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):We.map(a=>{const t=g(a.amount,0),i=g(a.balanceBefore,0),l=g(a.balanceAfter??K,0)>=i,d=l?t:0,m=l?0:t,p=g(a?.balanceAfter??K,0),u=Ka(a),h=hn(a),v=fn(a),j=xe.includes(a.id);return e.jsxs("tr",{className:j?"selected":"",onClick:()=>rs(a.id),children:[e.jsx("td",{children:o.username}),e.jsx("td",{children:Zt(a.date)}),e.jsx("td",{children:u}),e.jsx("td",{children:h}),e.jsx("td",{children:d>0?Math.round(d):"—"}),e.jsx("td",{children:m>0?Math.round(m):"—"}),e.jsx("td",{children:Math.round(p)}),e.jsx("td",{children:v}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:k=>{k.stopPropagation(),os(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:ls,disabled:xe.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:cs,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:n.freePlayPercent,onChange:a=>x("freePlayPercent",a.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:n.maxFpCredit,onChange:a=>x("maxFpCredit",a.target.value)})]})]})]})]}):f==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMinStraightBet,onChange:a=>x("dlMinStraightBet",a.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxStraightBet,onChange:a=>x("dlMaxStraightBet",a.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:n.dlMaxPerOffering,onChange:a=>x("dlMaxPerOffering",a.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:n.dlMaxBetPerEvent,onChange:a=>x("dlMaxBetPerEvent",a.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxWinSingleBet,onChange:a=>x("dlMaxWinSingleBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEvent,onChange:a=>x("dlMaxWinEvent",a.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:n.dlDelaySec,onChange:a=>x("dlDelaySec",a.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:n.dlMaxFavoriteLine,onChange:a=>x("dlMaxFavoriteLine",a.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLine,onChange:a=>x("dlMaxDogLine",a.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMinParlayBet,onChange:a=>x("dlMinParlayBet",a.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxParlayBet,onChange:a=>x("dlMaxParlayBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEventParlay,onChange:a=>x("dlMaxWinEventParlay",a.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLineParlays,onChange:a=>x("dlMaxDogLineParlays",a.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:n.dlWagerCoolOffSec,onChange:a=>x("dlWagerCoolOffSec",a.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[a," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>x(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]})]}):f==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinDay,onChange:a=>x("casinoDefaultMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinDay,onChange:a=>x("casinoAgentMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinDay,onChange:a=>x("casinoPlayerMaxWinDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossDay,onChange:a=>x("casinoDefaultMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossDay,onChange:a=>x("casinoAgentMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossDay,onChange:a=>x("casinoPlayerMaxLossDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinWeek,onChange:a=>x("casinoDefaultMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinWeek,onChange:a=>x("casinoAgentMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinWeek,onChange:a=>x("casinoPlayerMaxWinWeek",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossWeek,onChange:a=>x("casinoDefaultMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossWeek,onChange:a=>x("casinoAgentMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossWeek,onChange:a=>x("casinoPlayerMaxLossWeek",a.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:n.firstName,placeholder:"Enter first name",onChange:a=>In(a.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:n.lastName,placeholder:"Enter last name",onChange:a=>$n(a.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:n.phoneNumber,placeholder:"Enter phone number",onChange:a=>Un(a.target.value),className:Yn?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:Aa,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${Vn?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(y)?e.jsxs("select",{value:n.agentId,onChange:a=>x("agentId",a.target.value),children:[e.jsx("option",{value:"",children:"None"}),_.filter(a=>{const t=String(a.role||"").toLowerCase();return t==="master_agent"||t==="super_agent"}).map(a=>{const t=a.id;return e.jsx("option",{value:t,children:a.username},t)})]}):e.jsx("input",{value:o.masterAgentUsername||o.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:n.status,onChange:a=>x("status",a.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:a}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>x(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:n.accountType,onChange:a=>x("accountType",a.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:n.minBet,onChange:a=>x("minBet",a.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:n.wagerLimit,onChange:a=>x("wagerLimit",a.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:n.creditLimit,onChange:a=>x("creditLimit",a.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:n.settleLimit,onChange:a=>x("settleLimit",a.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:n.zeroBalanceWeekly,onChange:a=>x("zeroBalanceWeekly",a.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:n.tempCredit,onChange:a=>x("tempCredit",a.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:n.enableCaptcha,onChange:a=>x("enableCaptcha",a.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:n.cryptoPromoPct,onChange:a=>x("cryptoPromoPct",a.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:n.promoType,onChange:a=>x("promoType",a.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:n.expiresOn,onChange:a=>x("expiresOn",a.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:n.playerNotes,onChange:a=>x("playerNotes",a.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:o.balance??0,onChange:a=>F(t=>({...t,balance:Number(a.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:Qn,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:n.appsVenmo,onChange:a=>x("appsVenmo",a.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:n.appsCashapp,onChange:a=>x("appsCashapp",a.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:n.appsApplePay,onChange:a=>x("appsApplePay",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:n.appsZelle,onChange:a=>x("appsZelle",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:n.appsPaypal,onChange:a=>x("appsPaypal",a.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:n.appsBtc,onChange:a=>x("appsBtc",a.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:n.appsOther,onChange:a=>x("appsOther",a.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",w(ca.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:T(ca.netProfit||0),children:w(ca.netProfit||0)})]})]})]}),wn&&e.jsx("div",{className:"modal-overlay",onClick:()=>{De(!1),Me(!1),te(!0)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:Sn?(()=>{const a=je,t=an,i=ye,c=ea(i+(t.balanceDirection==="credit"?a:-a)),l=t.balanceDirection==="debit",d=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),m=b?Fa:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:d})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",m]}),e.jsx("span",{style:{color:Ia(i)},children:w(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t.label," :"]}),e.jsxs("span",{style:{color:Ia(c)},children:[l?"-":"",w(a)]})]}),t.value==="deposit"&&!b&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:Le?"#166534":"#6b7280"},children:Le?`${ta.percent}% (${w(ta.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",m]}),e.jsx("span",{style:{color:Ia(c)},children:w(c)})]})]}),ae&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ae}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Me(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!nn||ba,onClick:ms,children:ba?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:xa,onChange:a=>{ga(a.target.value),a.target.value==="deposit"&&te(!0),L("")},children:$a.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:ha,onChange:a=>{ue(a.target.value===""?"":String(Math.round(Number(a.target.value)))),L("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:b?Fa:"Current Balance"}),e.jsx("b",{className:b?aa(ye):T(ye),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>ue(Oa(ye)),children:w(ye)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:b?"Funding Wallet":"Carry"}),e.jsx("b",{className:b?T(Xe):T(Xe),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>ue(Oa(Xe)),children:w(Xe)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:lt,onChange:a=>fa(a.target.value),placeholder:"Optional note"}),an.value==="deposit"&&!b&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:Le,onChange:a=>te(a.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${ta.percent}% Freeplay (${w(ta.bonusAmount)})`})]}),ae&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ae}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{De(!1),te(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!nn,onClick:()=>{if(!tn){L("Enter a valid amount greater than 0.");return}L(""),Me(!0)},children:"Next"})]})]})})}),Ln&&e.jsx("div",{className:"modal-overlay",onClick:()=>{ge(!1),Oe(!1)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:Mn?(()=>{const a=Ua,t=ns,i=K,c=ea(i+(t?-a:a)),l=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:l})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:en(i)},children:w(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:t?"#dc2626":"#1f2937"},children:[t?"-":"",w(a)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:en(c)},children:w(c)})]})]}),se&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:se}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Oe(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!rn,onClick:is,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:re==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:re==="withdraw"?"#fee2e2":void 0,color:re==="withdraw"?"#dc2626":void 0},children:re==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:Na,onChange:a=>{wa(a.target.value===""?"":String(Math.round(Number(a.target.value)))),C("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:T(K),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>wa(Oa(K)),children:w(K)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:_e,onChange:a=>gt(a.target.value),placeholder:"Optional note"}),se&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:se}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>ge(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!rn,onClick:()=>{if(!sn){C("Enter a valid free play amount greater than 0.");return}C(""),Oe(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
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
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}export{Qs as default};
