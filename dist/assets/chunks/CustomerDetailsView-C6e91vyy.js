import{r as c,j as e}from"./vendor-react-Bd2HVIcR.js";import{bD as Ga,F as Es,ax as jn,aF as qa,H as Fs,aO as vn,L as pa,M as ma,bE as _s,Y as Ja,bF as $s,bG as Rs,bH as ua,R as Nn,bI as Os,aG as zs,C as Is,aV as Us}from"./app-api-3suvwmjb.js";import{at as wn,ad as g,aq as Ys,ae as A,av as Vs,ar as xa,as as Sn,au as Hs,a0 as Gs,a1 as qs,a2 as Js}from"./utils-shared-DnQUJ_1S.js";import"./vendor-common-_eGvg4ul.js";import"./dashboard-views-BdnVONf3.js";import"./scoreboard-views-DnJ-AI6Z.js";import"./contexts-shared-CfVXvQGp.js";const kn={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},Pn=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Cn=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Ks=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],X=s=>String(s||"").trim().toLowerCase(),et=s=>String(s||"").trim().toUpperCase(),Bn=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),Zs=new Set([...Bn,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Qs=new Set(["bet_void","bet_void_admin","deleted_wager"]),Xs=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),ei=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),ai=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),Qa=s=>{const k=X(s?.type),w=et(s?.reason),v=String(s?.description||"").toLowerCase();return k==="fp_deposit"||ai.has(w)||(k==="adjustment"||k==="fp_deposit")&&(v.includes("freeplay")||v.includes("free play"))},ti=s=>{const k=X(s?.type),w=et(s?.reason);return k==="credit_adj"||k==="debit_adj"||Xs.has(w)},ni=s=>{const k=et(s?.reason);return ei.has(k)},si=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,Ka=s=>!s||typeof s!="object"?s:{...s,minBet:g(s.minBet??s.defaultMinBet,0),maxBet:g(s.maxBet??s.wagerLimit??s.defaultMaxBet,0),wagerLimit:g(s.wagerLimit??s.maxBet??s.defaultMaxBet,0),creditLimit:g(s.creditLimit??s.defaultCreditLimit,0),balanceOwed:g(s.balanceOwed??s.defaultSettleLimit,0),balance:g(s.balance,0),pendingBalance:g(s.pendingBalance,0),freeplayBalance:g(s.freeplayBalance,0),lifetime:g(s.lifetime,0),lifetimePlusMinus:g(s.lifetimePlusMinus??s.lifetime,0)},Dn=(s,k=0)=>s===""||s===null||s===void 0?g(k,0):g(s,0),Ln=s=>String(s||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Xa=s=>X(s?.type)==="deleted_wager"?String(s?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":Hs(s),Mn=s=>{const k=String(s?.description||"").trim();if(!k)return"—";const w=Ln(k),v=Ln(Xa(s));return!w||v&&(w===v||w===`${v}s`||`${w}s`===v)?"—":k},An=s=>String(s?.actorUsername??s?.deletedByUsername??"").trim()||"—",Tn=s=>{if(!s)return 0;const k=s?.$date||s,v=new Date(k).getTime();return Number.isNaN(v)?0:v},ii=s=>{const k=Math.abs(Number(s?.amount||0)),w=String(s?.sport||"").trim(),v=String(s?.reason||"").trim(),O=String(s?.status||"deleted").trim().toLowerCase()||"deleted",_=[O==="restored"?"Changed Wager":"Deleted Wager"];return w&&_.push(`(${w})`),v&&_.push(`- ${v}`),{id:`deleted-wager-${String(s?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:s?.id||null,user:s?.user||"Unknown",userId:s?.userId||null,amount:k,date:s?.deletedAt||s?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:O,reason:v?v.toUpperCase().replace(/\s+/g,"_"):null,description:_.join(" ")}},ri=s=>{const k=X(s);return k==="betting_adjustments"||k==="credit_debit_adjustments"||k==="promotional_adjustments"?"adjustment":"all"},li=(s,k)=>{const w=X(k);if(w===""||w==="all"||w==="all_transactions")return!0;const v=X(s?.type);return w==="non_wager"?!Zs.has(v):w==="deposit_withdrawal"?v==="deposit"||v==="withdrawal":w==="betting_adjustments"||w==="credit_debit_adjustments"?ti(s):w==="promotional_adjustments"?ni(s):w==="freeplay_transactions"?Qa(s):w==="wagers_only"?Bn.has(v):w==="deleted_changed"||w==="deleted_transactions"?Qs.has(v):!0},oi=s=>!s||typeof s!="object"?"":String(s.userId??s.playerId??s.user?.id??s.user?.id??"").trim(),ci=s=>!s||typeof s!="object"?"":String(s.user??s.username??s.playerUsername??s.playerName??"").trim().toLowerCase(),Za=(s,k,w,v)=>{const O=oi(s);if(O!=="")return!!(O===String(k)||v?.id&&O===String(v.id));const ee=ci(s),_=String(w||"").trim().toLowerCase();return ee!==""&&_!==""?!!(ee===_||v?.username&&ee===String(v.username).trim().toLowerCase()):!0};function Ni({userId:s,onBack:k,onNavigateToUser:w,role:v="admin",viewContext:O=null}){const[ee,_]=c.useState(!0),[at,tt]=c.useState(!1),[nt,T]=c.useState(""),[st,ae]=c.useState(""),[d,W]=c.useState(null),[ga,it]=c.useState({}),[J,rt]=c.useState(null),[$,Wn]=c.useState([]),[n,te]=c.useState(kn),[En,Le]=c.useState(!1),[f,R]=c.useState("basics"),[Me,lt]=c.useState([]),[Fn,Ae]=c.useState(!1),[ne,L]=c.useState(""),[ot,xe]=c.useState(""),[Te,ct]=c.useState("7d"),[ge,dt]=c.useState("deposit_withdrawal"),[pt,_n]=c.useState("all"),[he,ha]=c.useState([]),[$n,Be]=c.useState(!1),[fa,ba]=c.useState("deposit"),[ya,fe]=c.useState(""),[mt,ja]=c.useState(""),[We,se]=c.useState(!0),[Rn,Ee]=c.useState(!1),[va,ut]=c.useState(!1),[z,On]=c.useState("daily"),[zn,xt]=c.useState(!1),[gt,Fe]=c.useState(""),[_e,ht]=c.useState([]),[Na,wa]=c.useState(""),[ie,$e]=c.useState([]),[Re,ft]=c.useState([]),[In,Oe]=c.useState(!1),[re,C]=c.useState(""),[bt,le]=c.useState(""),[ze,Un]=c.useState("7d"),[be,Sa]=c.useState([]),[Yn,ye]=c.useState(!1),[oe,yt]=c.useState("deposit"),[ka,Pa]=c.useState(""),[Ie,jt]=c.useState(""),[Vn,Ue]=c.useState(!1),[vt,Nt]=c.useState(!1),[wt,Ye]=c.useState(""),[St,kt]=c.useState(""),[Pt,Ct]=c.useState(!1),[Dt,Ve]=c.useState(""),[Lt,Mt]=c.useState(""),[At,He]=c.useState(""),[I,U]=c.useState(null),[Tt,Bt]=c.useState(!1),[Wt,Et]=c.useState(""),[Ge,Ca]=c.useState(null),[F,Hn]=c.useState([]),[ce,Ft]=c.useState(!1),[_t,Y]=c.useState(""),[$t,je]=c.useState(""),[Rt,Ot]=c.useState(""),[de,zt]=c.useState(!1),[D,Da]=c.useState(null),[qe,It]=c.useState(!1),[Ut,Yt]=c.useState(""),[La,Je]=c.useState(!1),[Vt,pe]=c.useState(""),[Ht,Ke]=c.useState(""),[Ze,Gt]=c.useState(null),[Ma,Aa]=c.useState(""),[di,Gn]=c.useState(""),[pi,qn]=c.useState(""),[mi,Jn]=c.useState(""),[Qe,qt]=c.useState(""),[ui,Kn]=c.useState(""),[xi,Zn]=c.useState([]),[Jt,Qn]=c.useState(""),[ve,Ta]=c.useState(null),[Kt,Zt]=c.useState(!1),[Qt,Xe]=c.useState(""),[ea,Xt]=c.useState(null),Xn=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],en=async(a,t)=>{const i=String(t||"").trim();if(!i)return null;try{const o=await Is(a,{agentId:i}),r=Number(o?.balanceOwed);return Number.isFinite(r)?r:null}catch(o){return console.warn("Failed to load live agent settlement balance:",o),null}};c.useEffect(()=>{s&&(async()=>{try{_(!0),T(""),ae(""),xe(""),L(""),U(null),W(null),Ca(null),Da(null),te(kn),R("basics");const t=localStorage.getItem("token");if(!t){T("Please login to view details.");return}const[i,o]=await Promise.all([Ga(s,t),["admin","super_agent","master_agent","agent"].includes(v)?Es(t):Promise.resolve([])]),r=i?.user,l=r?.settings||{},m=l.dynamicLiveLimits||{},p=l.dynamicLiveFlags||{},u=l.liveCasinoLimits||{},x=u.default||{},b=u.agent||{},j=u.player||{};if(!r){T("User not found.");return}const S=String(r?.role||"").toLowerCase(),B=S==="agent"||S==="master_agent"||S==="super_agent",P=Ka(r),me=B?await en(t,r.id||s):null;W(P),Ca(me),it(i?.stats||{}),rt(i?.referredBy||null),Wn(Array.isArray(o)?o:[]),B&&(Gn(r?.agentPercent!=null?String(r.agentPercent):""),qn(r?.playerRate!=null?String(r.playerRate):""),Jn(r?.hiringAgentPercent!=null?String(r.hiringAgentPercent):""),qt(P.parentAgentId||P.masterAgentId||P.createdBy?.id||P.createdBy||""),Kn(r?.subAgentPercent!=null?String(r.subAgentPercent):""),Zn(Array.isArray(r?.extraSubAgents)?r.extraSubAgents.map((G,q)=>({id:q,name:G.name||"",percent:G.percent!=null?String(G.percent):""})):[])),te({password:"",firstName:P.firstName||"",lastName:P.lastName||"",phoneNumber:P.phoneNumber||"",minBet:P.minBet,agentId:B?P.parentAgentId||P.masterAgentId||"":v==="admin"?P.masterAgentId||P.agentId?.id||P.agentId||"":P.agentId?.id||P.agentId||"",status:(P.status||"active").toLowerCase(),creditLimit:P.creditLimit,wagerLimit:P.wagerLimit,settleLimit:P.balanceOwed,accountType:l.accountType||"credit",zeroBalanceWeekly:l.zeroBalanceWeekly||"standard",tempCredit:Number(l.tempCredit||0),expiresOn:l.expiresOn||"",enableCaptcha:!!l.enableCaptcha,cryptoPromoPct:Number(l.cryptoPromoPct||0),promoType:l.promoType||"promo_credit",playerNotes:l.playerNotes||"",sportsbook:l.sports??!0,casino:l.casino??!0,horses:l.racebook??!0,messaging:l.messaging??!1,dynamicLive:l.live??!0,propPlus:l.props??!0,liveCasino:l.liveCasino??!1,freePlayPercent:Number(l.freePlayPercent??20),maxFpCredit:Number(l.maxFpCredit??0),dlMinStraightBet:Number(m.minStraightBet??25),dlMaxStraightBet:Number(m.maxStraightBet??250),dlMaxPerOffering:Number(m.maxPerOffering??500),dlMaxBetPerEvent:Number(m.maxBetPerEvent??500),dlMaxWinSingleBet:Number(m.maxWinSingleBet??1e3),dlMaxWinEvent:Number(m.maxWinEvent??3e3),dlDelaySec:Number(m.delaySec??7),dlMaxFavoriteLine:Number(m.maxFavoriteLine??-1e4),dlMaxDogLine:Number(m.maxDogLine??1e4),dlMinParlayBet:Number(m.minParlayBet??10),dlMaxParlayBet:Number(m.maxParlayBet??100),dlMaxWinEventParlay:Number(m.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(m.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(m.wagerCoolOffSec??30),dlLiveParlays:!!p.liveParlays,dlBlockPriorStart:p.blockPriorStart??!0,dlBlockHalftime:p.blockHalftime??!0,dlIncludeGradedInLimits:!!p.includeGradedInLimits,dlUseRiskLimits:!!p.useRiskLimits,casinoDefaultMaxWinDay:Number(x.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(x.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(x.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(x.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(b.maxWinDay??1e3),casinoAgentMaxLossDay:Number(b.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(b.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(b.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(j.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(j.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(j.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(j.maxLossWeek??5e3),appsVenmo:r.apps?.venmo||"",appsCashapp:r.apps?.cashapp||"",appsApplePay:r.apps?.applePay||"",appsZelle:r.apps?.zelle||"",appsPaypal:r.apps?.paypal||"",appsBtc:r.apps?.btc||"",appsOther:r.apps?.other||""})}catch(t){console.error("Failed to load player details:",t),T(t.message||"Failed to load details")}finally{_(!1)}})()},[v,s]);const aa=async(a=!0)=>{if(!d?.username)return;const t=localStorage.getItem("token");if(!t){Y("Please login to view pending bets.");return}try{a&&Ft(!0),Y("");const i=await jn({customer:d.username,status:"pending",limit:500},t),o=Array.isArray(i?.bets)?i.bets:[];Hn(o)}catch(i){Y(i?.message||"Failed to load pending bets")}finally{a&&Ft(!1)}},es=async a=>{if(!a||!window.confirm("Delete this pending bet? Risk will be refunded to the player."))return;const t=localStorage.getItem("token");if(t)try{Ot(a),Y(""),je("");const o=(await vn(a,t))?.user;o&&W(r=>r&&{...r,balance:g(o.balance,r.balance),pendingBalance:g(o.pendingBalance,r.pendingBalance),freeplayBalance:g(o.freeplayBalance,r.freeplayBalance)}),je("Bet deleted."),await aa(!1)}catch(i){Y(i?.message||"Failed to delete bet")}finally{Ot("")}},as=async()=>{if(de||F.length===0)return;const a=localStorage.getItem("token");if(!a)return;const t=F.length,i=F.reduce((u,x)=>u+Number(x?.amount||0),0);if(!window.confirm(`Delete all ${t} pending bet${t===1?"":"s"} — ${N(i)} risk? Each stake is refunded to the player.`))return;zt(!0),Y(""),je("");let o=0,r=0;const l=[];let m=null;for(const u of F)if(u?.id)try{const x=await vn(u.id,a);o+=1,x?.user&&(m=x.user)}catch(x){const b=String(x?.message||"");/already processed/i.test(b)?r+=1:l.push(`${u.id.slice(0,8)}…: ${b||"failed"}`)}m&&W(u=>u&&{...u,balance:g(m.balance,u.balance),pendingBalance:g(m.pendingBalance,u.pendingBalance),freeplayBalance:g(m.freeplayBalance,u.freeplayBalance)});const p=[`${o} deleted`,r>0?`${r} already handled`:null,l.length>0?`${l.length} failed`:null].filter(Boolean).join(", ");l.length>0?Y(`${p}. ${l.join(" · ")}`):je(`${p}.`),zt(!1),await aa(!1)},Ba=async()=>{if(!s)return;const a=localStorage.getItem("token");if(a)try{It(!0),Yt("");const t=await _s(s,a);Da(t)}catch(t){Yt(t.message||"Failed to load commission chain")}finally{It(!1)}},ts=async a=>{if(qt(a),!a)return;const t=localStorage.getItem("token");if(t)try{Je(!0),pe(""),Ke(""),await Ja(s,{parentAgentId:a},t),Ke("Master agent updated"),await Ba()}catch(i){pe(i.message||"Failed to update master agent")}finally{Je(!1)}},ns=async()=>{const a=localStorage.getItem("token"),t=parseFloat(Jt);if(!a||isNaN(t)||t<=0){Xe("Enter a valid positive amount");return}try{Zt(!0),Xe(""),Ta(null);const i=await Rs(s,t,a);Ta(i)}catch(i){Xe(i.message||"Calculation failed")}finally{Zt(!1)}},ss=async()=>{if(!D?.upline)return;const a=localStorage.getItem("token");if(a)try{const t=D.upline.map(o=>({id:o.id,username:o.username,agentPercent:o.agentPercent})),i=await $s(t,a);Xt(i)}catch(t){Xt({isValid:!1,errors:[t.message]})}},an=async a=>{if(!d?.username)return[];const t=a||localStorage.getItem("token");if(!t)throw new Error("Please login to view transactions.");const i={user:d.username||"",type:ri(ge),status:pt,time:Te,limit:300};s&&(i.userId=s);const o=await qa(i,t);let m=[...(Array.isArray(o?.transactions)?o.transactions:[]).filter(p=>Za(p,s,d.username,Ea))];if(["deleted_changed","deleted_transactions"].includes(X(ge)))try{const p=await Us({user:d.username||"",status:"all",sport:"all",time:Te,limit:300},t),u=(Array.isArray(p?.wagers)?p.wagers:[]).filter(x=>String(x?.userId||"")===String(s)).map(ii);m=[...m,...u]}catch(p){console.warn("Deleted/Changed wagers could not be loaded:",p)}return m.filter(p=>li(p,ge)).sort((p,u)=>Tn(u?.date)-Tn(p?.date))};c.useEffect(()=>{(async()=>{if(!(f!=="transactions"||!d))try{Ae(!0),L("");const t=await an();lt(t)}catch(t){L(t.message||"Failed to load transactions")}finally{Ae(!1)}})()},[f,d,ge,pt,Te,s]),c.useEffect(()=>{(async()=>{if(!(f!=="performance"||!d?.username))try{xt(!0),Fe("");const t=localStorage.getItem("token");if(!t){Fe("Please login to view performance.");return}const i=await jn({customer:d.username,time:z==="weekly"?"90d":z==="yearly"?"all":"30d",type:"all-types",limit:500},t),o=Array.isArray(i?.bets)?i.bets:[],r=new Map,l=u=>{const x=new Date(Date.UTC(u.getFullYear(),u.getMonth(),u.getDate())),b=x.getUTCDay()||7;x.setUTCDate(x.getUTCDate()+4-b);const j=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil(((x-j)/864e5+1)/7)};for(const u of o){const x=u?.createdAt,b=new Date(x);if(Number.isNaN(b.getTime()))continue;let j="",S="";if(z==="daily"){const E=b.getFullYear(),De=String(b.getMonth()+1).padStart(2,"0"),ue=String(b.getDate()).padStart(2,"0");j=`${E}-${De}-${ue}`,S=b.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(z==="weekly"){const E=b.getFullYear(),De=String(l(b)).padStart(2,"0");j=`${E}-W${De}`;const ue=new Date(b),yn=ue.getDay(),Ws=ue.getDate()-yn+(yn===0?-6:1);ue.setDate(Ws),S=`Week of ${ue.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(z==="monthly"){const E=b.getFullYear(),De=String(b.getMonth()+1).padStart(2,"0");j=`${E}-${De}`,S=b.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const E=b.getFullYear();j=`${E}`,S=`${E}`}const B=Number(u?.amount||0),P=Number(u?.potentialPayout||0),me=String(u?.status||"").toLowerCase(),G=me==="won"?Math.max(0,P-B):me==="lost"?-B:0;r.has(j)||r.set(j,{date:b,net:0,wagers:[],periodLabel:S});const q=r.get(j);q.net+=G,q.wagers.push({id:u.id||`${j}-${q.wagers.length+1}`,label:`${u?.match?.awayTeam||""} vs ${u?.match?.homeTeam||""}`.trim()||u.selection||"Wager",amount:G})}const m=Array.from(r.entries()).map(([u,x])=>({key:u,date:x.date,periodLabel:x.periodLabel,net:x.net,wagers:x.wagers})).sort((u,x)=>x.key.localeCompare(u.key));if(z==="yearly"){const u=g(d?.lifetimePlusMinus??d?.lifetime,0);if(Number.isFinite(u)){const x=m.reduce((j,S)=>j+Number(S.net||0),0),b=u-x;if(Math.abs(b)>=.01){const j=String(new Date().getFullYear());let S=m.findIndex(B=>B.key===j);S<0&&(m.unshift({key:j,date:new Date,periodLabel:j,net:0,wagers:[]}),S=0),m[S]={...m[S],net:Number(m[S].net||0)+b,wagers:[...Array.isArray(m[S].wagers)?m[S].wagers:[],{id:`lifetime-carry-${m[S].key}`,label:"Lifetime +/- Carry",amount:b,synthetic:!0}]}}}}ht(m);const p=m[0]?.key||"";wa(p),$e(m[0]?.wagers||[])}catch(t){Fe(t.message||"Failed to load performance"),ht([]),wa(""),$e([])}finally{xt(!1)}})()},[f,d?.username,d?.lifetimePlusMinus,d?.lifetime,z]),c.useEffect(()=>{(async()=>{if(!(f!=="freeplays"||!d?.username))try{Oe(!0),C("");const t=localStorage.getItem("token");if(!t){C("Please login to view free play.");return}const i=await qa({user:d.username,type:"all",status:"all",time:ze,limit:300},t),r=(Array.isArray(i?.transactions)?i.transactions:[]).filter(l=>Za(l,s,d.username,Ea)&&Qa(l));ft(r)}catch(t){C(t.message||"Failed to load free play")}finally{Oe(!1)}})()},[f,d?.username,ze,s]);const h=(a,t)=>{te(i=>({...i,[a]:t}))},is=a=>{U(null),te(t=>({...t,firstName:xa(a)}))},rs=a=>{U(null),te(t=>({...t,lastName:xa(a)}))},ls=a=>{U(null),te(t=>({...t,phoneNumber:Sn(a)}))},tn=c.useMemo(()=>{const a=`${n.firstName||""} ${n.lastName||""}`.trim();return a||(d?.fullName?d.fullName:"")},[n.firstName,n.lastName,d?.fullName]);c.useMemo(()=>tn||d?.username||"Player",[tn,d?.username]);const nn=c.useMemo(()=>wn(n.firstName,n.lastName,n.phoneNumber,d?.username||""),[n.firstName,n.lastName,n.phoneNumber,d?.username]),Wa=c.useMemo(()=>d?nn||d.displayPassword||"Not set":"",[d,nn]),sn=c.useMemo(()=>{const a=new Set;return(Array.isArray(I?.matches)?I.matches:[]).forEach(i=>{(Array.isArray(i?.matchReasons)?i.matchReasons:[]).forEach(r=>{const l=String(r||"").trim().toLowerCase();l&&a.add(l)})}),a},[I]),os=sn.has("phone"),cs=sn.has("password"),ds=c.useMemo(()=>{const a=String(d?.role||"player").toLowerCase();return a==="user"||a==="player"?"PLAYER":a.replace(/_/g," ").toUpperCase()},[d?.role]),y=c.useMemo(()=>{const a=String(d?.role||"player").toLowerCase();return a==="agent"||a==="master_agent"||a==="master agent"||a==="super_agent"||a==="super agent"},[d?.role]),Ea=c.useMemo(()=>{if(!y||!d?.username||!$?.length)return null;const a=String(d.username).toUpperCase();if(a.endsWith("MA")){const t=a.slice(0,-2),i=$.find(o=>String(o.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}else{const t=a+"MA",i=$.find(o=>String(o.username||"").toUpperCase()===t);return i?{id:i.id,username:t}:null}},[y,d?.username,$]);c.useMemo(()=>{if(!Qe)return"";const a=$.find(t=>t.id===Qe);return a?String(a.username||"").toUpperCase():String(d?.createdByUsername||d?.createdBy?.username||"").toUpperCase()},[Qe,$,d]);const V=g(d?.balance,0),Ne=g(d?.pendingBalance,0),rn=g(d?.freeplayBalance,0),ln=g(d?.lifetimePlusMinus??d?.lifetime,0),we=Dn(n.creditLimit,d?.creditLimit??d?.defaultCreditLimit),Fa=Dn(n.settleLimit,d?.balanceOwed??d?.defaultSettleLimit),_a=g(d?.minBet??d?.defaultMinBet??n.minBet,0),$a=g(d?.maxBet??d?.defaultMaxBet??d?.wagerLimit??n.wagerLimit,0),K=y&&Ge!==null?g(Ge,0):V,Ra="Balance Owed / House Money",Oa=c.useMemo(()=>we+V-Ne,[we,V,Ne]),H=c.useMemo(()=>{let a=0;for(const t of Me)t?.status==="pending"&&String(t?.type||"").toLowerCase().includes("casino")&&(a+=Number(t.amount||0));return{pending:Ne,available:y?V:Number(Oa||0),carry:y&&Ge!==null?K:V,nonPostedCasino:a}},[Me,Ne,V,Oa,y,Ge,K]),on=a=>Math.round(g(a,0)),za=a=>String(Math.abs(on(a))),N=a=>"$"+on(a).toLocaleString("en-US"),cn=a=>"$"+Js(Math.max(0,g(a,0))),M=a=>{const t=g(a,0);return`$${Math.round(t).toLocaleString("en-US")}`},ps=async()=>{Et(""),Bt(!0);try{const a=localStorage.getItem("token");if(!a)throw new Error("No admin token found. Please log in again.");const t=await Fs(s,a);if(!t?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",a);const r=localStorage.getItem("userRole")||"";r&&sessionStorage.setItem("impersonationBaseRole",r)}localStorage.setItem("token",t.token),localStorage.setItem("userRole",String(t?.role||"user")),localStorage.removeItem("user");const i=String(t?.role||"").toLowerCase();let o="/";i==="admin"?o="/admin/dashboard":i==="agent"?o="/agent/dashboard":(i==="master_agent"||i==="super_agent")&&(o="/super_agent/dashboard"),window.location.href=o}catch(a){Et(a.message||"Failed to login as user. Please try again."),Bt(!1)}},Ia=String(J?.id||"").trim(),ms=c.useMemo(()=>{if(!J)return"—";const a=J.firstName||"",t=J.lastName||"";return[a,t].filter(Boolean).join(" ").trim()||J.username||J.id||"—"},[J]),ta=Ia!==""&&Ia!==String(s||"").trim()&&typeof w=="function",us=()=>{ta&&w(Ia)},xs=async()=>{const a=_a,t=$a,i=we,o=Fa,r=String(Wa??""),l=String(d?.role||"").toLowerCase(),m=l==="user"||l==="player"||l==="",p="https://bettorplays247.com",u=m?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${d?.username||""}`,`Password: ${r}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(o)}`,"",`Site: ${p}`,"",si]:[`Login: ${d?.username||""}`,`Password: ${r}`,`Min bet: ${M(a)}`,`Max bet: ${M(t)}`,`Credit: ${M(i)}`,`Settle: +/- ${M(o)}`,"",`Site: ${p}`],x=u.join(`
`),j=`<div style="font-family:sans-serif;white-space:pre-wrap;">${u.map(S=>S===""?"<br>":S).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([x],{type:"text/plain"}),"text/html":new Blob([j],{type:"text/html"})})]):await navigator.clipboard.writeText(x),He("All details copied"),window.setTimeout(()=>He(""),1400)}catch{He("Copy failed"),window.setTimeout(()=>He(""),1400)}},gs=async()=>{try{tt(!0),T(""),ae(""),U(null);const a=localStorage.getItem("token");if(!a){T("Please login again.");return}const t=xa(n.firstName).trim(),i=xa(n.lastName).trim(),o=Sn(n.phoneNumber).trim(),r=y?"":wn(t,i,o,d?.username||"");if(!y&&(!t||!i||!o||!r)){T("First name, last name, and phone number are required to generate password.");return}const l={firstName:t,lastName:i,phoneNumber:o,fullName:`${t} ${i}`.trim(),password:r,allowDuplicateSave:!0,status:n.status,minBet:Number(n.minBet||0),creditLimit:Number(n.creditLimit||0),maxBet:Number(n.wagerLimit||0),wagerLimit:Number(n.wagerLimit||0),balanceOwed:Number(n.settleLimit||0),settings:{accountType:n.accountType,zeroBalanceWeekly:n.zeroBalanceWeekly,tempCredit:Number(n.tempCredit||0),expiresOn:n.expiresOn||"",enableCaptcha:!!n.enableCaptcha,cryptoPromoPct:Number(n.cryptoPromoPct||0),promoType:n.promoType,playerNotes:n.playerNotes,sports:!!n.sportsbook,casino:!!n.casino,racebook:!!n.horses,messaging:!!n.messaging,live:!!n.dynamicLive,props:!!n.propPlus,liveCasino:!!n.liveCasino}};l.apps={venmo:n.appsVenmo||"",cashapp:n.appsCashapp||"",applePay:n.appsApplePay||"",zelle:n.appsZelle||"",paypal:n.appsPaypal||"",btc:n.appsBtc||"",other:n.appsOther||""},["admin","super_agent","master_agent"].includes(v)&&n.agentId&&(l.agentId=n.agentId);let m=null;if(y){const x={firstName:t,lastName:i,fullName:`${t} ${i}`.trim(),phoneNumber:o,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0)};n.agentId&&(x.parentAgentId=n.agentId),await Ja(s,x,a),m={}}else v==="agent"?m=await pa(s,l,a):m=await ma(s,l,a);const p={...l};delete p.allowDuplicateSave,W(y?x=>({...x,firstName:p.firstName,lastName:p.lastName,fullName:p.fullName,phoneNumber:p.phoneNumber,status:p.status,defaultMinBet:Number(n.minBet||0),defaultMaxBet:Number(n.wagerLimit||0),defaultCreditLimit:Number(n.creditLimit||0),defaultSettleLimit:Number(n.settleLimit||0),minBet:Number(n.minBet||0),maxBet:Number(n.wagerLimit||0),creditLimit:Number(n.creditLimit||0),balanceOwed:Number(n.settleLimit||0),displayPassword:x?.displayPassword||""}):x=>({...x,...p,displayPassword:r||x?.displayPassword||"",settings:{...x?.settings||{},...p.settings}}));const u=m?.duplicateWarning;u&&typeof u=="object"?(U({message:u.message||"Likely duplicate player detected.",matches:Array.isArray(u.matches)?u.matches:[]}),ae("Changes saved with duplicate warning.")):ae("Changes saved successfully.")}catch(a){console.error("Failed to save player details:",a);const t=Array.isArray(a?.duplicateMatches)?a.duplicateMatches:Array.isArray(a?.details?.matches)?a.details.matches:[];if(a?.isDuplicate===!0||a?.duplicate===!0||a?.code==="DUPLICATE_PLAYER"||a?.details?.duplicate===!0){U({message:a?.message||"Likely duplicate player detected.",matches:t}),T("");return}T(a.message||"Failed to save details")}finally{tt(!1)}},hs=async()=>{try{const a=localStorage.getItem("token");if(!a||!d)return;await Nn(s,{balance:g(d.balance,0)},a),ae("Balance updated."),T("")}catch(a){T(a.message||"Failed to update balance")}},dn=a=>{if(!a)return"—";const t=a?.$date||a,i=new Date(t);return Number.isNaN(i.getTime())?"—":i.toLocaleString()},Z=a=>{a==="transactions"?(R("transactions"),ct("7d"),dt("deposit_withdrawal"),_n("all")):a==="pending"?(R("pending-bets"),Y(""),je(""),aa()):a==="performance"?R("performance"):a==="freeplays"?R("freeplays"):a==="dynamic-live"?R("dynamic-live"):a==="live-casino"?R("live-casino"):a==="commission"?(R("commission"),D||Ba()):R("basics"),Le(!1),ae(""),xe(""),T(""),U(null),L(""),Fe(""),C(""),le(""),Ye(""),kt(""),Ve(""),Mt("")},na=()=>{Z("transactions");const a=y?K:g(d?.balance,0),t=y?a>0?"deposit":"withdrawal":a>0?"withdrawal":"deposit";ba(t),fe(""),ja(""),se(!0),L(""),Be(!0)},Ua=!!O?.autoOpenDeposit,[pn,mn]=c.useState(!1);c.useEffect(()=>{mn(!1)},[s,Ua]),c.useEffect(()=>{!Ua||pn||d?.id&&y&&(na(),mn(!0))},[Ua,pn,d?.id,y]);const sa=c.useMemo(()=>_e.find(a=>a.key===Na)||null,[_e,Na]);c.useEffect(()=>{if(!sa){$e([]);return}$e(sa.wagers||[])},[sa]);const fs=c.useMemo(()=>ie.reduce((a,t)=>a+Number(t.amount||0),0),[ie]),bs=c.useMemo(()=>ie.filter(a=>!a?.synthetic).length,[ie]),Se=c.useMemo(()=>y?K:g(d?.balance,0),[y,K,d?.balance]),ia=c.useMemo(()=>y?g(d?.balance,0):g(H?.carry,0),[y,d?.balance,H?.carry]),ys=c.useMemo(()=>Re.filter(a=>String(a.status||"").toLowerCase()==="pending").reduce((a,t)=>a+g(t.amount,0),0),[Re]),Q=rn,ra=a=>{const t=g(a,0);return Number.isFinite(t)?Math.round(t*100)/100:0},un=a=>{const t=A(a);return t==="neg"?"#dc2626":t==="pos"?"#16a34a":"#000000"},la=a=>{const t=A(a);return t==="pos"?"neg":t==="neg"?"pos":"neutral"},js=a=>y?la(a):A(a),Ya=(a,t=y)=>{const i=t?la(a):A(a);return i==="neg"?"#dc2626":i==="pos"?"#16a34a":"#000000"},Va=y?Cn:Pn,xn=Va.find(a=>a.value===fa)||Va[0],ke=Number(ya||0),gn=Number.isFinite(ke)&&ke>0,hn=gn,oa=c.useMemo(()=>Ys(d,ke),[d,ke]),vs=oe==="withdraw",Ha=Number(ka||0),fn=Number.isFinite(Ha)&&Ha>0,bn=fn,Pe=async()=>{if(d?.username)try{Oe(!0);const a=localStorage.getItem("token");if(!a)return;const t=await qa({user:d.username,type:"all",status:"all",time:ze,limit:300},a),i=Array.isArray(t?.transactions)?t.transactions:[];ft(i.filter(o=>Za(o,s,d.username,Ea)&&Qa(o)))}catch(a){C(a.message||"Failed to refresh free play")}finally{Oe(!1)}},Ns=(a,t="transaction")=>{const i=Number(a?.deleted||0),o=Number(a?.skipped||0),r=Number(a?.cascadeDeleted||0),m=(Array.isArray(a?.warnings)?a.warnings:[]).find(u=>typeof u?.message=="string"&&u.message.trim()!=="");let p=i>0?`Deleted ${i} ${t}(s).`:`No ${t}(s) were deleted.`;return r>0&&(p+=` Linked free play deleted: ${r}.`),o>0&&(p+=` Skipped ${o}.`),m&&(p+=` ${m.message}`),i>0||r>0?p+=" Balances and totals were updated.":p+=" Balances and totals were not changed.",p},ca=(a,t,i,o)=>{const r=Number(a?.deleted||0),l=Number(a?.cascadeDeleted||0),m=Ns(a,t);if(r>0||l>0){i(m),o("");return}i(""),o(m)},ws=async()=>{try{const a=Number(ka||0);if(a<=0||Number.isNaN(a)){C("Enter a valid free play amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!d){C("Please login again.");return}const i=g(d.freeplayBalance,0),o=oe==="withdraw",r=await zs(s,{operationMode:"transaction",amount:a,direction:o?"debit":"credit",description:Ie.trim()},t),l=g(r?.user?.freeplayBalance,NaN),m=r?.user?.freeplayExpiresAt??null;W(u=>u&&{...u,freeplayBalance:Number.isFinite(l)?l:ra(i+(o?-a:a)),freeplayExpiresAt:m});const p=o?"withdrawn":"added";Ie.trim()?le(`Free play ${p}. Note: "${Ie.trim()}"`):le(`Free play ${p} successfully.`),C(""),ye(!1),Ue(!1),Pa(""),jt(""),await Pe()}catch(a){C(a.message||"Failed to update free play")}},Ss=a=>{Sa(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},ks=async()=>{try{if(be.length===0||!window.confirm(`Delete ${be.length} selected free play transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t=await ua(be,a);Sa([]),ca(t,"free play transaction",le,C),await Pe(),await Ce(),await da()}catch(a){C(a.message||"Failed to delete free play transactions")}},Ps=async a=>{try{if(!a||!window.confirm("Delete this free play transaction?"))return;const t=localStorage.getItem("token");if(!t){C("Please login again.");return}const i=await ua([a],t);Sa(o=>o.filter(r=>r!==a)),ca(i,"free play transaction",le,C),await Pe(),await Ce(),await da()}catch(t){C(t.message||"Failed to delete free play transaction")}},Cs=async()=>{try{const a=localStorage.getItem("token");if(!a){C("Please login again.");return}const t={settings:{freePlayPercent:Number(n.freePlayPercent||0),maxFpCredit:Number(n.maxFpCredit||0)}};v==="agent"?await pa(s,t,a):await ma(s,t,a),le("Free play settings saved."),C("")}catch(a){C(a.message||"Failed to save free play settings")}},Ds=async()=>{try{Nt(!0);const a=localStorage.getItem("token");if(!a){Ye("Please login again.");return}const t={settings:{dynamicLiveLimits:{minStraightBet:Number(n.dlMinStraightBet||0),maxStraightBet:Number(n.dlMaxStraightBet||0),maxPerOffering:Number(n.dlMaxPerOffering||0),maxBetPerEvent:Number(n.dlMaxBetPerEvent||0),maxWinSingleBet:Number(n.dlMaxWinSingleBet||0),maxWinEvent:Number(n.dlMaxWinEvent||0),delaySec:Number(n.dlDelaySec||0),maxFavoriteLine:Number(n.dlMaxFavoriteLine||0),maxDogLine:Number(n.dlMaxDogLine||0),minParlayBet:Number(n.dlMinParlayBet||0),maxParlayBet:Number(n.dlMaxParlayBet||0),maxWinEventParlay:Number(n.dlMaxWinEventParlay||0),maxDogLineParlays:Number(n.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(n.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!n.dlLiveParlays,blockPriorStart:!!n.dlBlockPriorStart,blockHalftime:!!n.dlBlockHalftime,includeGradedInLimits:!!n.dlIncludeGradedInLimits,useRiskLimits:!!n.dlUseRiskLimits}}};v==="agent"?await pa(s,t,a):await ma(s,t,a),kt("Dynamic Live settings saved."),Ye("")}catch(a){Ye(a.message||"Failed to save Dynamic Live settings")}finally{Nt(!1)}},Ls=async()=>{try{Ct(!0);const a=localStorage.getItem("token");if(!a){Ve("Please login again.");return}const t={settings:{liveCasinoLimits:{default:{maxWinDay:Number(n.casinoDefaultMaxWinDay||0),maxLossDay:Number(n.casinoDefaultMaxLossDay||0),maxWinWeek:Number(n.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(n.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(n.casinoAgentMaxWinDay||0),maxLossDay:Number(n.casinoAgentMaxLossDay||0),maxWinWeek:Number(n.casinoAgentMaxWinWeek||0),maxLossWeek:Number(n.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(n.casinoPlayerMaxWinDay||0),maxLossDay:Number(n.casinoPlayerMaxLossDay||0),maxWinWeek:Number(n.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(n.casinoPlayerMaxLossWeek||0)}}}};v==="agent"?await pa(s,t,a):await ma(s,t,a),Mt("Live Casino limits saved."),Ve("")}catch(a){Ve(a.message||"Failed to save Live Casino limits")}finally{Ct(!1)}},Ce=async()=>{if(d){Ae(!0);try{const a=localStorage.getItem("token");if(!a){L("Please login to view transactions.");return}const t=await an(a);lt(t)}catch(a){L(a.message||"Failed to refresh transactions")}finally{Ae(!1)}}},da=async()=>{try{const a=localStorage.getItem("token");if(!a)return;const t=await Ga(s,a),i=t?.user;if(!i||typeof i!="object")return;const o=Ka(i),r=String(i?.role||"").toLowerCase(),m=r==="agent"||r==="master_agent"||r==="super_agent"?await en(a,i.id||s):null;W(p=>p&&{...p,balance:o.balance,pendingBalance:o.pendingBalance,freeplayBalance:o.freeplayBalance,lifetime:o.lifetime,lifetimePlusMinus:o.lifetimePlusMinus,balanceOwed:o.balanceOwed,creditLimit:o.creditLimit,updatedAt:o.updatedAt}),Ca(m),t?.stats&&typeof t.stats=="object"&&it(t.stats),t?.referredBy!==void 0&&rt(t.referredBy||null)}catch(a){console.warn("Failed to refresh customer financials after transaction update:",a)}},Ms=async()=>{if(!va){ut(!0);try{const a=Number(ya||0);if(a<=0||Number.isNaN(a)){L("Enter a valid amount greater than 0.");return}const t=localStorage.getItem("token");if(!t||!d){L("Please login again.");return}const i=y?Cn:Pn,o=i.find(j=>j.value===fa)||i[0],r=g(d.balance,0),l=ra(r+(o.balanceDirection==="credit"?a:-a)),m=mt.trim();let p;y?p=await Os(s,{amount:a,direction:o.balanceDirection,type:o.apiType,description:m||o.defaultDescription},t):p=await Nn(s,{operationMode:"transaction",amount:a,direction:o.balanceDirection,type:o.apiType,reason:o.reason,description:m||o.defaultDescription,applyDepositFreeplayBonus:We},t);const u=y?0:g(p?.freeplayBonus?.amount,0),x=y?0:g(p?.referralBonus?.amount,0);W(j=>{if(!j)return j;const S=y?g(p?.agent?.balance,NaN):g(p?.user?.balance,NaN),B=Number.isFinite(S)?S:l,P=g(p?.user?.freeplayBalance,NaN),me=Number.isFinite(P)?P:g(j.freeplayBalance,0),G=p?.user?.lifetimePlusMinus??p?.user?.lifetime??j.lifetimePlusMinus??j.lifetime??0,q=g(G,NaN),E=Number.isFinite(q)?q:g(j.lifetimePlusMinus??j.lifetime,0);return{...j,balance:B,freeplayBalance:me,lifetime:E,lifetimePlusMinus:E}});const b=["Transaction saved and balance updated."];u>0&&b.push(`Auto free play bonus added: ${N(u)}.`),x>0&&b.push(`Referral bonus granted: ${N(x)}.`),xe(b.join(" ")),L(""),Be(!1),Ee(!1),ba("deposit"),fe(""),ja(""),se(!0),await Ce()}catch(a){L(a.message||"Failed to save transaction")}finally{ut(!1)}}},As=a=>{ha(t=>t.includes(a)?t.filter(i=>i!==a):[...t,a])},Ts=async()=>{try{if(he.length===0||!window.confirm(`Delete ${he.length} selected transaction(s)?`))return;const a=localStorage.getItem("token");if(!a){L("Please login again.");return}const t=await ua(he,a);ha([]),await Ce(),await Pe(),await da(),ca(t,"transaction",xe,L)}catch(a){L(a.message||"Failed to delete selected transactions")}},Bs=async a=>{try{if(!a||!window.confirm("Delete this transaction?"))return;const t=localStorage.getItem("token");if(!t){L("Please login again.");return}const i=await ua([a],t);ha(o=>o.filter(r=>r!==a)),await Ce(),await Pe(),await da(),ca(i,"transaction",xe,L)}catch(t){L(t.message||"Failed to delete transaction")}};return ee?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):d?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:y?(()=>{const a=String(d.username||"").toUpperCase(),t=a+"MA";return $?.find(o=>String(o.username||"").toUpperCase()===t)?`${a} (${t})`:a})():d.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:ds})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:d.username||""})]}),y?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>Z("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(d?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:d?.agentPercent!=null?`${d.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:na,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${A(V)}`,children:N(V)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:Wa})]}),y?(()=>{const a=d?.agentPercent!=null?parseFloat(d.agentPercent):null,t=d?.hiringAgentPercent!=null?parseFloat(d.hiringAgentPercent):null,i=5,o=t!=null&&a!=null?t-a:null,r=t==null||o===0,l=!r&&t!=null?100-i-t:null,m=l!=null&&l>0,p=!r&&o>0,u=[];return p&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[o,"%"]})]},"hiring")),m&&u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[l,"%"]})]},"upline")),u.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),u.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="commission"?" detail-metric-active":""}`,onClick:()=>Z("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:d?.playerRate!=null?`$${d.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[u[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(_a)})]}),u[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:M($a)})]}),u[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:M(we)})]}),u[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Fa)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="pending-bets"?" detail-metric-active":""}`,onClick:()=>Z("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:N(Ne)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:M(_a)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:N(Oa)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:M($a)})]}),!y&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="freeplays"?" detail-metric-active":""}`,onClick:()=>Z("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:N(rn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:M(we)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="performance"?" detail-metric-active":""}`,onClick:()=>Z("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${A(ln)}`,children:N(ln)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",M(Fa)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${ta?"detail-link-item":""}`,onClick:us,disabled:!ta,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${ta?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:ms})]})]}),y?e.jsxs("button",{type:"button",className:`detail-item detail-metric${f==="transactions"?" detail-metric-active":""}`,onClick:na,children:[e.jsx("span",{className:"detail-label",children:Ra}),e.jsx("strong",{className:`detail-value ${js(K)}`,children:N(K)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:xs,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:ps,disabled:Tt,children:Tt?"Logging in...":"Login User"})]})]})]}),Wt&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:Wt}),At&&e.jsx("div",{className:"copy-notice",children:At})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>Le(a=>!a),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:f==="transactions"?"Transactions":f==="pending-bets"?"Pending Bets":f==="performance"?"Performance":f==="freeplays"?"Free Play":f==="dynamic-live"?"Dynamic Live":f==="live-casino"?"Live Casino":f==="commission"?"Commission Tree":"The Basics"})]}),f==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:na,children:"New transaction"}):f==="pending-bets"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[F.length>0&&e.jsx("button",{className:"btn btn-back",style:{background:"#fee2e2",color:"#dc2626",border:"1px solid #fecaca",opacity:de||ce?.45:1,cursor:de||ce?"not-allowed":"pointer"},onClick:as,disabled:de||ce,children:de?"Deleting…":"Delete All"}),e.jsx("button",{className:"btn btn-back",onClick:()=>aa(),disabled:ce||de,children:ce?"Loading...":"Refresh"})]}):f==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{yt("withdraw"),C(""),ye(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{yt("deposit"),C(""),ye(!0)},children:"Add Free Play"})]}):f==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:Ds,disabled:vt,children:vt?"Saving...":"Save"}):f==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:Ls,disabled:Pt,children:Pt?"Saving...":"Save"}):f==="commission"?e.jsx("button",{className:"btn btn-back",onClick:Ba,disabled:qe,children:qe?"Loading...":"Refresh"}):f==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:gs,disabled:at,children:at?"Saving...":"Save"})]}),En&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>Le(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>Le(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:Xn.map(a=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>Z(a.id),children:[e.jsx("span",{className:"menu-icon",children:a.icon}),e.jsx("span",{className:"menu-label",children:a.label})]},a.id))})]})]}),f==="transactions"?ne&&e.jsx("div",{className:"alert error",children:ne}):f==="pending-bets"?_t&&e.jsx("div",{className:"alert error",children:_t}):f==="performance"?gt&&e.jsx("div",{className:"alert error",children:gt}):f==="freeplays"?re&&e.jsx("div",{className:"alert error",children:re}):f==="dynamic-live"?wt&&e.jsx("div",{className:"alert error",children:wt}):f==="live-casino"?Dt&&e.jsx("div",{className:"alert error",children:Dt}):nt&&e.jsx("div",{className:"alert error",children:nt}),f==="transactions"?ot&&e.jsx("div",{className:"alert success",children:ot}):f==="freeplays"?bt&&e.jsx("div",{className:"alert success",children:bt}):f==="dynamic-live"?St&&e.jsx("div",{className:"alert success",children:St}):f==="live-casino"?Lt&&e.jsx("div",{className:"alert success",children:Lt}):st&&e.jsx("div",{className:"alert success",children:st}),f==="basics"&&I&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:I.message}),Array.isArray(I.matches)&&I.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:I.matches.map((a,t)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(a.username||"UNKNOWN")}),e.jsx("span",{children:String(a.fullName||"No name")}),e.jsx("span",{children:String(a.phoneNumber||"No phone")})]},`${a.id||a.username||"duplicate"}-${t}`))})]}),f==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const a=(r,l)=>{Gt(r),Aa(l!=null?String(l):"")},t=()=>{Gt(null),Aa("")},i=async()=>{const r=localStorage.getItem("token");if(!(!r||!Ze))try{Je(!0);const l={};if(Ze==="agentPercent"){const p=parseFloat(Ma);if(isNaN(p)||p<0||p>100){pe("Must be 0-100");return}l.agentPercent=p}else if(Ze==="playerRate"){const p=parseFloat(Ma);if(isNaN(p)||p<0){pe("Must be a positive number");return}l.playerRate=p}await Ja(s,l,r),pe(""),Ke("Saved"),t();const m=await Ga(s,r);m?.user&&W(Ka(m.user)),Da(null),setTimeout(()=>Ke(""),2e3)}catch(l){pe(l.message||"Save failed")}finally{Je(!1)}},o=[{key:"agentPercent",label:"Agent %",value:d?.agentPercent,display:d?.agentPercent!=null?`${d.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:d?.playerRate,display:d?.playerRate!=null?`$${d.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[o.map(r=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:r.label}),Ze===r.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:r.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:Ma,onChange:l=>Aa(l.target.value),autoFocus:!0,onKeyDown:l=>{l.key==="Enter"&&i(),l.key==="Escape"&&t()}}),e.jsx("button",{className:"commission-inline-save",onClick:i,disabled:La,children:La?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:t,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>r.editable&&a(r.key,r.value),children:[r.display,r.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},r.key)),Vt&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:Vt}),Ht&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:Ht})]})})()]}),qe&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),Ut&&e.jsx("div",{className:"alert error",children:Ut}),D&&!qe&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${D.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:D.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[D.chainTotal,"%"]}),D.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:ss,style:{marginLeft:12},children:"Re-validate"})]}),ea&&e.jsx("div",{className:`commission-validity-banner ${ea.isValid?"valid":"invalid"}`,style:{marginTop:4},children:ea.isValid?"Validation passed":ea.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[D.upline.find(a=>a.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline.find(a=>a.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...D.upline].filter((a,t)=>t>0&&a.role!=="admin").reverse().map((a,t,i)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:t===i.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.effectivePercent==null&&a.agentPercent==null?"unset":""}`,children:a.effectivePercent!=null?`(${a.effectivePercent}%)`:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),t===i.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:Qe,onChange:o=>ts(o.target.value),disabled:La,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),$.filter(o=>{const r=String(o.role||"").toLowerCase();return r==="master_agent"||r==="super_agent"}).map(o=>{const r=o.id;return e.jsx("option",{value:r,children:String(o.username||"").toUpperCase()},r)})]})]},a.id||t)),D.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",D.upline[0].isSharedNode&&D.upline[0].linkedUsername?`${D.upline[0].username}/${D.upline[0].linkedUsername}`:D.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${D.upline[0].agentPercent==null?"unset":""}`,children:D.upline[0].agentPercent!=null?`(${D.upline[0].agentPercent}%)`:"(not set)"})]}),D.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),D.downlines.map((a,t)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",t+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",a.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${a.agentPercent==null?"unset":""}`,children:a.agentPercent!=null?`(${a.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${a.status==="active"?"active":"inactive"}`,children:a.status||""})]},a.id||t)),D.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"1",inputMode:"numeric",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:Jt,onChange:a=>{Qn(String(a.target.value).replace(/\D/g,"")),Ta(null),Xe("")}}),e.jsx("button",{className:"btn btn-back",onClick:ns,disabled:Kt,children:Kt?"Calculating...":"Calculate"})]}),Qt&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:Qt}),ve&&e.jsxs("div",{className:"calc-result",children:[!ve.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",ve.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[ve.distributions.map((a,t)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:a.isSharedNode&&a.linkedUsername?`${a.username}/${a.linkedUsername}`:a.username||"—"}),e.jsx("td",{children:a.role?a.role.replace(/_/g," "):"—"}),e.jsx("td",{children:a.effectivePercent!=null?`${a.effectivePercent}%`:a.agentPercent!=null?`${a.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Math.round(Number(a.amount||0))]})]},a.id||t)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",Math.round(ve.distributions.reduce((a,t)=>a+Number(t.amount||0),0))]})})]})]})]})]})]})]})]}),f==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Te,onChange:a=>ct(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:ge,onChange:a=>dt(a.target.value),children:Ks.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:N(H.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:y?"Funding Wallet":"Available"}),e.jsx("b",{children:N(H.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:y?"House Money":"Carry"}),e.jsx("b",{className:y?la(H.carry):A(H.carry),children:N(H.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:N(H.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Fn?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):Me.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):Me.map(a=>{const t=Vs(a),i=g(a.amount,0),o=t?0:i,r=t?i:0,l=a.balanceAfter,m=Xa(a),p=Mn(a),u=An(a),x=he.includes(a.id);return e.jsxs("tr",{className:x?"selected":"",onClick:()=>As(a.id),children:[e.jsx("td",{children:dn(a.date)}),e.jsx("td",{children:m}),e.jsx("td",{children:p}),e.jsx("td",{children:o>0?N(o):"—"}),e.jsx("td",{children:r>0?N(r):"—"}),e.jsx("td",{className:A(l),children:l!=null?N(l):"—"}),e.jsx("td",{children:u}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:b=>{b.stopPropagation(),Bs(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:Ts,disabled:he.length===0,children:"Delete Selected"})]}):f==="pending-bets"?e.jsxs("div",{className:"transactions-wrap",children:[$t&&e.jsx("div",{className:"alert success",children:$t}),(()=>{const a=l=>{const m=Number(l);if(!Number.isFinite(m)||m<=1)return"";const p=m>=2?Math.round((m-1)*100):Math.round(-100/(m-1));return p>0?`+${p}`:`${p}`},t=l=>{const m=String(l?.marketType||"").toLowerCase(),p=String(l?.selection||"").trim(),u=Number(l?.point),x=a(l?.odds);if(m==="spreads"&&Number.isFinite(u)){const b=u>0?`+${u}`:`${u}`;return`${p} ${b}${x?` ${x}`:""}`.trim()}return m==="totals"&&Number.isFinite(u)?`${p.toLowerCase().startsWith("u")?"Under":"Over"} ${Math.abs(u)}${x?` ${x}`:""}`.trim():Gs(l)?`${qs(l)||p||"Pick"}${x?` ${x}`:""}`.trim():`${p||"ML"}${x?` ${x}`:""}`.trim()},i=l=>{const m=Number(l?.amount||0),p=Number(l?.potentialPayout||0);return Math.max(0,p-m)},o=F.reduce((l,m)=>l+Number(m?.amount||0),0),r=F.reduce((l,m)=>l+Math.trunc(i(m)),0);return e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:ce?e.jsx("tr",{children:e.jsx("td",{colSpan:4,className:"tx-empty",children:"Loading pending bets..."})}):F.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:4,className:"tx-empty",children:"No pending bets"})}):F.map(l=>{const m=String(l?.type||"straight").toLowerCase(),p=Array.isArray(l?.selections)?l.selections:[],u=p.length>1,x=u?m==="parlay"?`Parlay - ${p.length} Teams`:m==="teaser"?`Teaser - ${p.length} Teams`:m==="if_bet"?`If Bet - ${p.length} Legs`:m==="reverse"?`Reverse - ${p.length} Legs`:`${m.toUpperCase()} - ${p.length} Legs`:p[0]?t(p[0]):"Straight",b=Number(l?.amount||0),j=i(l);return e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("div",{style:{fontWeight:600},children:x}),u&&e.jsx("div",{style:{marginTop:4,paddingLeft:12,fontSize:12,color:"#475569"},children:p.map((S,B)=>e.jsx("div",{children:t(S)},`${l.id}-leg-${B}`))})]}),e.jsx("td",{className:"neg",style:{fontWeight:700},children:N(b)}),e.jsx("td",{style:{fontWeight:700},children:cn(j)}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:()=>es(l.id),disabled:Rt===l.id,children:Rt===l.id?"Deleting...":"Delete"})})]},l.id)})}),F.length>0&&e.jsx("tfoot",{children:e.jsxs("tr",{children:[e.jsxs("td",{style:{textAlign:"right",fontWeight:700},children:["Total Risk: ",e.jsx("span",{className:"neg",children:N(o)}),"   Total Win: ",e.jsx("strong",{children:cn(r)})]}),e.jsx("td",{}),e.jsx("td",{}),e.jsx("td",{})]})})]})})})()]}):f==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:z,onChange:a=>On(a.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:zn?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):_e.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):_e.map(a=>e.jsxs("tr",{className:Na===a.key?"selected":"",onClick:()=>wa(a.key),children:[e.jsx("td",{children:a.periodLabel}),e.jsx("td",{children:Math.round(Number(a.net||0))})]},a.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:bs})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:N(fs)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:sa?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:ie.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):ie.map(a=>e.jsxs("tr",{className:a?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:a.label||"Wager"}),e.jsx("td",{children:Math.round(Number(a.amount||0))})]},a.id))})]})]})]})]}):f==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:ze,onChange:a=>Un(a.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.round(Number(Q))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.round(Number(ys))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:In?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):Re.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):Re.map(a=>{const t=g(a.amount,0),i=g(a.balanceBefore,0),r=g(a.balanceAfter??Q,0)>=i,l=r?t:0,m=r?0:t,p=g(a?.balanceAfter??Q,0),u=Xa(a),x=Mn(a),b=An(a),j=be.includes(a.id);return e.jsxs("tr",{className:j?"selected":"",onClick:()=>Ss(a.id),children:[e.jsx("td",{children:d.username}),e.jsx("td",{children:dn(a.date)}),e.jsx("td",{children:u}),e.jsx("td",{children:x}),e.jsx("td",{children:l>0?Math.round(l):"—"}),e.jsx("td",{children:m>0?Math.round(m):"—"}),e.jsx("td",{children:Math.round(Number(p))}),e.jsx("td",{children:b}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:S=>{S.stopPropagation(),Ps(a.id)},children:"Delete"})})]},a.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:ks,disabled:be.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:Cs,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:n.freePlayPercent,onChange:a=>h("freePlayPercent",a.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:n.maxFpCredit,onChange:a=>h("maxFpCredit",a.target.value)})]})]})]})]}):f==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMinStraightBet,onChange:a=>h("dlMinStraightBet",a.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxStraightBet,onChange:a=>h("dlMaxStraightBet",a.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:n.dlMaxPerOffering,onChange:a=>h("dlMaxPerOffering",a.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:n.dlMaxBetPerEvent,onChange:a=>h("dlMaxBetPerEvent",a.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxWinSingleBet,onChange:a=>h("dlMaxWinSingleBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEvent,onChange:a=>h("dlMaxWinEvent",a.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:n.dlDelaySec,onChange:a=>h("dlDelaySec",a.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:n.dlMaxFavoriteLine,onChange:a=>h("dlMaxFavoriteLine",a.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLine,onChange:a=>h("dlMaxDogLine",a.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMinParlayBet,onChange:a=>h("dlMinParlayBet",a.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:n.dlMaxParlayBet,onChange:a=>h("dlMaxParlayBet",a.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:n.dlMaxWinEventParlay,onChange:a=>h("dlMaxWinEventParlay",a.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:n.dlMaxDogLineParlays,onChange:a=>h("dlMaxDogLineParlays",a.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:n.dlWagerCoolOffSec,onChange:a=>h("dlWagerCoolOffSec",a.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[a," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>h(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]})]}):f==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinDay,onChange:a=>h("casinoDefaultMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinDay,onChange:a=>h("casinoAgentMaxWinDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinDay,onChange:a=>h("casinoPlayerMaxWinDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossDay,onChange:a=>h("casinoDefaultMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossDay,onChange:a=>h("casinoAgentMaxLossDay",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossDay,onChange:a=>h("casinoPlayerMaxLossDay",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxWinWeek,onChange:a=>h("casinoDefaultMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxWinWeek,onChange:a=>h("casinoAgentMaxWinWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxWinWeek,onChange:a=>h("casinoPlayerMaxWinWeek",a.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:n.casinoDefaultMaxLossWeek,onChange:a=>h("casinoDefaultMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoAgentMaxLossWeek,onChange:a=>h("casinoAgentMaxLossWeek",a.target.value)}),e.jsx("input",{type:"number",value:n.casinoPlayerMaxLossWeek,onChange:a=>h("casinoPlayerMaxLossWeek",a.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:n.firstName,placeholder:"Enter first name",onChange:a=>is(a.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:n.lastName,placeholder:"Enter last name",onChange:a=>rs(a.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:n.phoneNumber,placeholder:"Enter phone number",onChange:a=>ls(a.target.value),className:os?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:Wa,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${cs?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(v)?e.jsxs("select",{value:n.agentId,onChange:a=>h("agentId",a.target.value),children:[e.jsx("option",{value:"",children:"None"}),$.filter(a=>{const t=String(a.role||"").toLowerCase();return t==="master_agent"||t==="super_agent"}).map(a=>{const t=a.id;return e.jsx("option",{value:t,children:a.username},t)})]}):e.jsx("input",{value:d.masterAgentUsername||d.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:n.status,onChange:a=>h("status",a.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([a,t])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:a}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!n[t],onChange:i=>h(t,i.target.checked)}),e.jsx("span",{className:"slider"})]})]},t))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:n.accountType,onChange:a=>h("accountType",a.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:n.minBet,onChange:a=>h("minBet",a.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:n.wagerLimit,onChange:a=>h("wagerLimit",a.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:n.creditLimit,onChange:a=>h("creditLimit",a.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:n.settleLimit,onChange:a=>h("settleLimit",a.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:n.zeroBalanceWeekly,onChange:a=>h("zeroBalanceWeekly",a.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:n.tempCredit,onChange:a=>h("tempCredit",a.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:n.enableCaptcha,onChange:a=>h("enableCaptcha",a.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:n.cryptoPromoPct,onChange:a=>h("cryptoPromoPct",a.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:n.promoType,onChange:a=>h("promoType",a.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:n.expiresOn,onChange:a=>h("expiresOn",a.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:n.playerNotes,onChange:a=>h("playerNotes",a.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:d.balance??0,onChange:a=>W(t=>({...t,balance:Number(a.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:hs,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:n.appsVenmo,onChange:a=>h("appsVenmo",a.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:n.appsCashapp,onChange:a=>h("appsCashapp",a.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:n.appsApplePay,onChange:a=>h("appsApplePay",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:n.appsZelle,onChange:a=>h("appsZelle",a.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:n.appsPaypal,onChange:a=>h("appsPaypal",a.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:n.appsBtc,onChange:a=>h("appsBtc",a.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:n.appsOther,onChange:a=>h("appsOther",a.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",N(ga.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:A(ga.netProfit||0),children:N(ga.netProfit||0)})]})]})]}),$n&&e.jsx("div",{className:"modal-overlay",onClick:()=>{Be(!1),Ee(!1),se(!0)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:Rn?(()=>{const a=ke,t=xn,i=Se,o=ra(i+(t.balanceDirection==="credit"?a:-a)),r=t.balanceDirection==="debit",l=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),m=y?Ra:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:l})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",m]}),e.jsx("span",{style:{color:Ya(i)},children:N(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t.label," :"]}),e.jsxs("span",{style:{color:Ya(o)},children:[r?"-":"",N(a)]})]}),t.value==="deposit"&&!y&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:We?"#166534":"#6b7280"},children:We?`${oa.percent}% (${N(oa.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",m]}),e.jsx("span",{style:{color:Ya(o)},children:N(o)})]})]}),ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Ee(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!hn||va,onClick:Ms,children:va?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:fa,onChange:a=>{ba(a.target.value),a.target.value==="deposit"&&se(!0),L("")},children:Va.map(a=>e.jsx("option",{value:a.value,children:a.label},a.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:ya,onChange:a=>{fe(a.target.value===""?"":String(Math.floor(Number(a.target.value)))),L("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:y?Ra:"Current Balance"}),e.jsx("b",{className:y?la(Se):A(Se),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>fe(za(Se)),children:N(Se)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:y?"Funding Wallet":"Carry"}),e.jsx("b",{className:y?A(ia):A(ia),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>fe(za(ia)),children:N(ia)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:mt,onChange:a=>ja(a.target.value),placeholder:"Optional note"}),xn.value==="deposit"&&!y&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:We,onChange:a=>se(a.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${oa.percent}% Freeplay (${N(oa.bonusAmount)})`})]}),ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{Be(!1),se(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!hn,onClick:()=>{if(!gn){L("Enter a valid amount greater than 0.");return}L(""),Ee(!0)},children:"Next"})]})]})})}),Yn&&e.jsx("div",{className:"modal-overlay",onClick:()=>{ye(!1),Ue(!1)},children:e.jsx("div",{className:"modal-card",onClick:a=>a.stopPropagation(),children:Vn?(()=>{const a=Ha,t=vs,i=Q,o=ra(i+(t?-a:a)),r=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:r})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:un(i)},children:N(i)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[t?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:t?"#dc2626":"#1f2937"},children:[t?"-":"",N(a)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:un(o)},children:N(o)})]})]}),re&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:re}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Ue(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!bn,onClick:ws,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:oe==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:oe==="withdraw"?"#fee2e2":void 0,color:oe==="withdraw"?"#dc2626":void 0},children:oe==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:ka,onChange:a=>{Pa(a.target.value===""?"":String(Math.floor(Number(a.target.value)))),C("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:A(Q),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>Pa(za(Q)),children:N(Q)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:Ie,onChange:a=>jt(a.target.value),placeholder:"Optional note"}),re&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:re}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>ye(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!bn,onClick:()=>{if(!fn){C("Enter a valid free play amount greater than 0.");return}C(""),Ue(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
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
        .tx-stat .pos { color: #15803d; }
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
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}export{Ni as default};
