import{r,R as Ka,j as e,a as ii}from"./vendor-react-C9ePv8QP.js";const li="/api/index.php?path=",An=t=>{if(!t)return"";const s=String(t).replace(/\/+$/,"");return s.includes("?path=")||/\/api\/index\.php$/i.test(s)||/\/index\.php$/i.test(s)||/\/api$/i.test(s)?s:s+"/api"},oi=()=>{const t=An("https://bettorplays247.com/api/index.php?path=");return t||An(li)},ds=oi(),ci=ds.includes("?path="),Q=(t="",s=null)=>{const a=t?t.startsWith("/")?t:`/${t}`:"",n=s&&Object.keys(s).length>0?new URLSearchParams(s).toString():"";if(ci){const d=`${ds}${a}`;return n?`${d}&${n}`:d}const l=`${ds}${a}`;return n?`${l}?${n}`:l};ds.replace(/\/api\/?$/,"");const Pn=t=>String(t||"straight").toLowerCase().replace(/-/g,"_").trim(),Kn=()=>{const t=typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID().replace(/-/g,"").slice(0,20):Math.random().toString(36).slice(2,14);return`bet_${Date.now().toString(36)}_${t}`},K=(t=null)=>{const s={"Content-Type":"application/json","Bypass-Tunnel-Remainder":"true"};return t&&(s.Authorization=`Bearer ${t}`),s},di=15e3,$s=(t="")=>String(t||"").toLowerCase().trim(),ui=()=>{try{return String(localStorage.getItem("token")||sessionStorage.getItem("token")||"").trim()}catch{return""}},mi=()=>{try{return $s(localStorage.getItem("userRole")||sessionStorage.getItem("userRole")||"")}catch{return""}},Ln=({token:t="",role:s="",mirrorToSession:a=!1}={})=>{const n=String(t||"").trim(),l=$s(s);try{n&&(localStorage.setItem("token",n),a&&sessionStorage.setItem("token",n)),l&&(localStorage.setItem("userRole",l),a&&sessionStorage.setItem("userRole",l))}catch{}},Zn=t=>{if(!t||typeof t!="object")return null;const{token:s,message:a,...n}=t;return Object.keys(n).length>0?n:null},Xn=(t,s=di)=>!!t&&Date.now()-t.createdAt<s,hi=()=>{try{const t=document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);return t?decodeURIComponent(t[1]):""}catch{return""}},da=(t,s,a=409)=>{const n=new Error(t?.message||s);return n.status=a,n.code=t?.code||"DUPLICATE_PLAYER",n.isDuplicate=!0,n.duplicate=!0,n.normalized=t?.normalized||null,n.duplicateMatches=Array.isArray(t?.matches)?t.matches:[],n.details=t||null,n},vs=async(t,s)=>{const n=(t.headers.get("content-type")||"").toLowerCase().includes("application/json"),l=await t.text();let d=null;if(n&&l)try{d=JSON.parse(l)}catch{d=null}if(!t.ok){const g=d?.message||(l&&!n?`${s}: received HTML/non-JSON response from ${t.url}`:s),y=new Error(g);throw y.status=t.status,y.payload=d,y}if(n){if(!l)return{};try{return JSON.parse(l)}catch{throw new Error(`${s}: server returned invalid JSON`)}}throw new Error(`${s}: expected JSON but received non-JSON response from ${t.url}`)};let xs=null,ra="",Qt=null;const mc=()=>{xs=null,ra="",Qt=null},er=({token:t="",role:s="",user:a=null,source:n="manual"}={})=>{const l=String(t||"").trim();l&&(Qt={key:`token:${l}`,createdAt:Date.now(),value:{token:l,role:$s(s||a?.role),user:a,source:n}})},pi=async(t={})=>{const s=Number.isFinite(t?.timeoutMs)?Number(t.timeoutMs):8e3,a=typeof AbortController<"u"?new AbortController:null,n=a?setTimeout(()=>a.abort(),Math.max(1e3,s)):null;try{const l=await fetch(Q("/auth/session"),{method:"GET",credentials:"include",headers:{"Content-Type":"application/json","Bypass-Tunnel-Remainder":"true"},signal:a?.signal});return vs(l,"Session restore failed")}catch(l){if(l?.name==="AbortError"){const d=new Error("Session restore timed out");throw d.status=408,d}throw l}finally{n&&clearTimeout(n)}},hc=async()=>{try{await fetch(Q("/auth/logout"),{method:"POST",credentials:"include",headers:{"Content-Type":"application/json","Bypass-Tunnel-Remainder":"true","X-CSRF-Token":hi()}})}catch{}},pc=async(t,s)=>{const a=await fetch(Q("/auth/login"),{method:"POST",headers:K(),body:JSON.stringify({username:t,password:s})}),n=await vs(a,"Login failed");if(n?.token){const l=Zn(n);Za(n.token,l),er({token:n.token,role:n.role,user:l,source:"login"})}return n},gc=async t=>{const s=await fetch(Q("/wallet/balance"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch balance");return s.json()},bs=new Map,Rs=new Map,Za=(t,s)=>{const a=String(t||"").trim();!a||!s||typeof s!="object"||Rs.set(a,{createdAt:Date.now(),value:s})},xc=(t="")=>{const s=String(t||"").trim();if(s){bs.delete(s),Rs.delete(s);return}bs.clear(),Rs.clear()},fc=async(t={})=>{const s=Number.isFinite(t?.timeoutMs)?Number(t.timeoutMs):8e3,a=ui(),n=a?`token:${a}`:"no-token";return Xn(Qt)&&Qt?.key===n?Qt.value:(xs&&ra===n||(ra=n,xs=(async()=>{try{if(a){const g=await es(a,{timeoutMs:s}),y={token:a,role:$s(g?.role||mi()),user:g,source:"token"};return Ln({token:a,role:y.role}),Qt={key:n,createdAt:Date.now(),value:y},y}const l=await pi({timeoutMs:s});if(!l?.token)return Qt={key:n,createdAt:Date.now(),value:null},null;const d={token:String(l.token).trim(),role:$s(l.role),user:Zn(l),source:"cookie"};return Ln({token:d.token,role:d.role}),Qt={key:`token:${d.token}`,createdAt:Date.now(),value:d},d}finally{xs=null,ra=""}})()),xs)},es=async(t,s={})=>{const a=Number.isFinite(s?.timeoutMs)?Number(s.timeoutMs):3e4,n=t||"",l=s?.useCache!==!1;if(n&&l){const g=Rs.get(n);if(Xn(g))return g.value;Rs.delete(n)}if(n&&bs.has(n))return bs.get(n);const d=(async()=>{const g=typeof AbortController<"u"?new AbortController:null,y=g?setTimeout(()=>g.abort(),Math.max(1e3,a)):null;try{const f=await fetch(Q("/auth/me"),{headers:K(t),signal:g?.signal});if(!f.ok){const x=await f.json().catch(()=>({})),w=new Error(x.message||"Failed to fetch user profile");throw w.status=f.status,w}const L=await f.json();return n&&Za(n,L),L}catch(f){if(f?.name==="AbortError"){const L=new Error("Session validation timed out. Please try again.");throw L.status=408,L}throw f}finally{y&&clearTimeout(y),n&&bs.delete(n)}})();return n&&bs.set(n,d),d},gi=async(t,s)=>{const a=await fetch(Q("/auth/profile"),{method:"PUT",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const l=await a.json();throw new Error(l.message||"Failed to update profile")}const n=await a.json();return s&&n?.user&&(Za(s,n.user),er({token:s,role:n.user.role,user:n.user,source:"profile-update"})),n},xi=(t="",s={})=>{const a={};return t&&(a.status=t),s?.trigger&&(a.trigger=String(s.trigger)),s?.refresh&&(a.refresh="1"),a},tr=async(t="",s={})=>{const a=await fetch(Q("/matches",xi(t,s)),{headers:K()});if(!a.ok)throw new Error("Failed to fetch matches");return a.json()},bc=async(t={})=>tr("live",t),jc=async(t={})=>tr("upcoming",t),yc=async()=>{try{const t=await fetch(Q("/matches/sports"),{headers:K()});return t.ok?t.json():[]}catch{return[]}},vc=async(t,s,{requestId:a=""}={})=>{const n=Pn(t?.type||"straight"),l=Array.isArray(t?.selections)?t.selections.map(L=>({...L,type:Pn(L?.type||L?.marketType||"straight")})):void 0,d=String(a||t?.requestId||Kn()).trim(),g={...t,type:n,selections:l,requestId:d},y=await fetch(Q("/bets/place"),{method:"POST",headers:{...K(s),"X-Request-Id":d},body:JSON.stringify(g)});if(!y.ok){const L=await y.json().catch(()=>({})),x=new Error(L.message||"Failed to place bet");throw Object.assign(x,L,{requestId:d}),x}const f=await y.json();return{...f,requestId:f?.requestId||d}},wc=async t=>{const s=await fetch(Q("/betting/rules"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch bet mode rules");return s.json()},Nc=async t=>{const s=await fetch(Q("/bets/my-bets"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch my bets");return s.json()},Sc=async t=>{const s=await fetch(Q("/casino/categories"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch casino categories");return s.json()},kc=async({token:t,category:s="lobby",search:a="",featured:n=!1,page:l=1,limit:d=48}={})=>{const g=new URLSearchParams;s&&g.set("category",s),a&&g.set("search",a),n&&g.set("featured","true"),g.set("page",String(l)),g.set("limit",String(d));const y=await fetch(Q("/casino/games",Object.fromEntries(g)),{headers:K(t)});if(!y.ok)throw new Error("Failed to fetch casino games");return y.json()},Cc=async(t,s)=>{const a=String(t||"").trim().toLowerCase(),n=await fetch(Q(`/casino/games/${encodeURIComponent(a)}/state`),{headers:K(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to fetch casino game state")}return n.json()},Ac=async(t,s)=>{const a=await fetch(Q(`/casino/games/${t}/launch`),{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to launch casino game")}return a.json()},Pc=async(t,s,a,{requestId:n="",payload:l={}}={})=>{const d=String(n||Kn()).trim(),g=await fetch(Q("/casino/bet"),{method:"POST",headers:K(a),body:JSON.stringify({game:t,bets:s,requestId:d,payload:l})});if(!g.ok){const f=await g.json().catch(()=>({}));throw new Error(f.message||"Failed to place casino bet")}const y=await g.json();return{...y,requestId:y?.requestId||d}},Lc=async(t,{page:s=1,limit:a=20,game:n="",from:l="",to:d="",result:g="",minWager:y="",maxWager:f=""}={})=>{const L={};L.page=String(s),L.limit=String(a),n&&(L.game=n),l&&(L.from=l),d&&(L.to=d),g&&(L.result=g),y!==""&&y!==null&&y!==void 0&&(L.minWager=String(y)),f!==""&&f!==null&&f!==void 0&&(L.maxWager=String(f));const x=await fetch(Q("/casino/bet/history",L),{headers:K(t)});if(!x.ok)throw new Error("Failed to fetch casino bet history");return x.json()},fi=async(t={},s)=>{const a={},n=["page","limit","game","from","to","result","username","userId","minWager","maxWager","format","csvLimit"];for(const d of n){const g=t?.[d];g!=null&&String(g).trim()!==""&&(a[d]=String(g))}const l=await fetch(Q("/admin/casino/bets",a),{headers:K(s)});if(!l.ok){const d=await l.json().catch(()=>({}));throw new Error(d.message||"Failed to fetch admin casino bets")}return l.json()},bi=async(t={},s)=>{const a={...t,format:"csv"},n=await fetch(Q("/admin/casino/bets",a),{headers:K(s)});if(!n.ok){const x=await n.json().catch(()=>({}));throw new Error(x.message||"Failed to download casino bets CSV")}const l=await n.blob(),y=(n.headers.get("content-disposition")||"").match(/filename="([^"]+)"/i)?.[1]||`casino-bets-${Date.now()}.csv`,f=URL.createObjectURL(l),L=document.createElement("a");L.href=f,L.download=y,L.click(),URL.revokeObjectURL(f)},ji=async(t,s)=>{const a=await fetch(Q(`/admin/casino/bets/${t}`),{headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to fetch admin casino bet detail")}return a.json()},yi=async(t={},s)=>{const a={},n=["game","from","to","limit","result","userId","username"];for(const d of n){const g=t?.[d];g!=null&&String(g).trim()!==""&&(a[d]=String(g))}const l=await fetch(Q("/admin/casino/summary",a),{headers:K(s)});if(!l.ok){const d=await l.json().catch(()=>({}));throw new Error(d.message||"Failed to fetch admin casino summary")}return l.json()},Tc=async(t,s,a)=>{const n=await fetch(Q("/wallet/request-deposit"),{method:"POST",headers:K(a),body:JSON.stringify({amount:t,method:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to request deposit")}return n.json()},Dc=async(t,s,a)=>{const n=await fetch(Q("/wallet/request-withdrawal"),{method:"POST",headers:K(a),body:JSON.stringify({amount:t,method:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to request withdrawal")}return n.json()},Ec=async(t,{type:s="",status:a="",limit:n=50}={})=>{const l=new URLSearchParams;s&&l.set("type",s),a&&l.set("status",a),l.set("limit",String(n));const d=await fetch(Q("/wallet/transactions",Object.fromEntries(l)),{headers:K(t)});if(!d.ok)throw new Error("Failed to fetch wallet transactions");return d.json()},Zt=async t=>{const s=await fetch(Q("/admin/agents"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch agents");return s.json()},sr=async(t,s=null)=>{const a={};s&&s.weekStart&&(a.weekStart=s.weekStart),s&&s.agentId&&(a.agentId=s.agentId);const n=await fetch(Q("/admin/header-summary",a),{headers:K(t)});if(!n.ok)throw new Error("Failed to fetch admin header summary");return n.json()},vi=async t=>{const s=await fetch(Q("/admin/system-stats"),{headers:K(t)});if(!s.ok){const a=await s.json().catch(()=>({}));throw new Error(a.message||"Failed to fetch system stats")}return s.json()},wi=async t=>{const s=await fetch(Q("/admin/entity-catalog"),{headers:K(t)});if(!s.ok){const a=await s.json().catch(()=>({}));throw new Error(a.message||"Failed to fetch admin entity catalog")}return s.json()},Ni=async(t,s)=>{const a=encodeURIComponent(String(t||"week")),n=await fetch(Q("/admin/weekly-figures",{period:a}),{headers:K(s)});return vs(n,"Failed to fetch weekly figures")},Si=async t=>{const s=await fetch(Q("/admin/pending"),{headers:K(t)});return vs(s,"Failed to fetch pending items")},ki=async(t,s)=>{const a=await fetch(Q("/admin/pending/approve"),{method:"POST",headers:K(s),body:JSON.stringify({transactionId:t})});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to approve pending item")}return a.json()},Ci=async(t,s)=>{const a=await fetch(Q("/admin/pending/decline"),{method:"POST",headers:K(s),body:JSON.stringify({transactionId:t})});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to decline pending item")}return a.json()},Ai=async t=>{const s=await fetch(Q("/admin/messages"),{headers:K(t)});return vs(s,"Failed to fetch messages")},Pi=async(t,s)=>{const a=await fetch(Q(`/admin/messages/${t}/read`),{method:"POST",headers:K(s)});if(!a.ok)throw new Error("Failed to mark message read");return a.json()},Li=async(t,s,a)=>{const n=await fetch(Q(`/admin/messages/${t}/reply`),{method:"POST",headers:K(a),body:JSON.stringify({reply:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to send reply")}return n.json()},Ti=async(t,s)=>{const a=await fetch(Q(`/admin/messages/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok)throw new Error("Failed to delete message");return a.json()},Mc=async t=>{const s=await fetch(Q("/messages/me"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch messages");return s.json()},Bc=async(t,s,a)=>{const n=await fetch(Q("/messages"),{method:"POST",headers:K(a),body:JSON.stringify({subject:t,body:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to send message")}return n.json()},Fc=async t=>{const s=await fetch(Q("/content/tutorials"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch tutorials");return s.json()},Ic=async t=>{const s=await fetch(Q("/content/faqs"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch FAQs");return s.json()},ua=async t=>{const s=await fetch(Q("/admin/matches"),{headers:K(t)});return vs(s,"Failed to fetch matches")},ar=async(t,s)=>{const a=await fetch(Q("/admin/matches"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create match")}return a.json()},nr=async(t,s,a)=>{const n=await fetch(Q(`/admin/matches/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update match")}return n.json()},Di=async t=>{const s=await fetch(Q("/admin/cashier/summary"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch cashier summary");return s.json()},Ei=async t=>{const s=await fetch(Q("/admin/third-party-limits"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch third party limits");return s.json()},Mi=async(t,s,a)=>{const n=await fetch(Q(`/admin/third-party-limits/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update third party limit")}return n.json()},Bi=async(t,s)=>{const a=await fetch(Q("/admin/third-party-limits"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create third party limit")}return a.json()},ma=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/bets",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch admin bets");return n.json()},Fi=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/ip-tracker",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch IP tracker");return n.json()},Ii=async(t,s)=>{const a=await fetch(`${ds}/admin/ip-tracker/${t}/block`,{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to block IP")}return a.json()},$i=async(t,s)=>{const a=await fetch(`${ds}/admin/ip-tracker/${t}/unblock`,{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to unblock IP")}return a.json()},Fs=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/transaction-history",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch transactions history");return n.json()},ta=async(t,s)=>{const a=await fetch(`${ds}/admin/transaction-history`,{method:"DELETE",headers:K(s),body:JSON.stringify({ids:t})});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete transactions")}return a.json()},rr=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/deleted-wagers",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch deleted wagers");return n.json()},Ri=async(t,s)=>{const a=await fetch(Q(`/admin/deleted-wagers/${t}/restore`),{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to restore wager")}return a.json()},Oi=async t=>{const s=await fetch(Q("/admin/sportsbook-links"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch sportsbook links");return s.json()},_i=async(t,s)=>{const a=await fetch(Q("/admin/sportsbook-links"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create sportsbook link")}return a.json()},Ui=async(t,s,a)=>{const n=await fetch(Q(`/admin/sportsbook-links/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update sportsbook link")}return n.json()},Wi=async(t,s)=>{const a=await fetch(Q(`/admin/sportsbook-links/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete sportsbook link")}return a.json()},zi=async(t,s)=>{const a=await fetch(Q(`/admin/ip-tracker/${t}/whitelist`),{method:"POST",headers:{Authorization:`Bearer ${s}`}});if(!a.ok){const n=await a.json();throw new Error(n.message||"Failed to whitelist IP")}return a.json()},Vi=async(t,s)=>{const a=await fetch(Q(`/admin/sportsbook-links/${t}/test`),{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to test sportsbook link")}return a.json()},ir=async t=>{const s=await fetch(Q("/admin/refresh-odds"),{method:"POST",headers:K(t)});if(!s.ok){const a=await s.json().catch(()=>({}));throw new Error(a.message||"Failed to refresh odds")}return s.json()},Hi=async t=>{const s=await fetch(Q("/admin/clear-cache"),{method:"POST",headers:K(t)});if(!s.ok){const a=await s.json().catch(()=>({}));throw new Error(a.message||"Failed to clear cache")}return s.json()},qi=async(t,s)=>{const a=await fetch(Q(`/admin/bets/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete bet")}return a.json()},Tn=async(t,s)=>{const a=await fetch(Q("/bets/settle"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to settle bets")}return a.json()},Gi=async(t,s)=>{const a=await fetch(Q("/bets/settle-eligibility",{matchId:t}),{headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to check settle eligibility")}return a.json()},Yi=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/agent-performance",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch agent performance");return n.json()},Ji=async(t,s,a)=>{const n=new URLSearchParams(s||{}).toString(),l=await fetch(Q(`/admin/agent-performance/${t}/details`,n?Object.fromEntries(new URLSearchParams(n)):{}),{headers:K(a)});if(!l.ok){const d=await l.json().catch(()=>({}));throw new Error(d.message||"Failed to fetch agent performance details")}return l.json()},Qi=async(t,s,a)=>{const n=await fetch(Q(`/agent/permissions/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify({permissions:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update permissions")}return n.json()},_a=async(t,s)=>{try{if(!s)throw new Error("No token provided. Please login first.");const a={"Content-Type":"application/json",Authorization:`Bearer ${s}`},n=await fetch(Q("/admin/create-agent"),{method:"POST",headers:a,body:JSON.stringify(t)});if(!n.ok){let l="Failed to create agent";try{const d=await n.json();console.error("❌ Server error:",d),l=d.message||l}catch{l=`Server error (${n.status}): ${n.statusText}`}throw new Error(l)}return n.json()}catch(a){throw console.error("❌ Create Agent Error:",a),a instanceof TypeError?new Error("Network error - Unable to reach server. Is the backend running on port 5000?"):a}},Ki=async t=>{const s=await fetch(Q("/admin/cleanup-workflow-seed"),{method:"POST",headers:K(t)}),a=await s.json().catch(()=>({}));if(!s.ok)throw new Error(a.message||"Failed to clean workflow demo data");return a},Zi=async(t,s)=>{try{if(!s)throw new Error("No token provided. Please login first.");const a={"Content-Type":"application/json",Authorization:`Bearer ${s}`},n=await fetch(Q("/admin/create-user"),{method:"POST",headers:a,body:JSON.stringify(t)});if(!n.ok){const l=await n.json().catch(()=>null);if(console.error("❌ Server error:",l||{status:n.status,statusText:n.statusText}),n.status===409&&(l?.duplicate===!0||l?.code==="DUPLICATE_PLAYER"))throw da(l,"Likely duplicate player detected",n.status);const d=l?.message||`Server error (${n.status}): ${n.statusText}`;throw new Error(d)}return n.json()}catch(a){throw console.error("❌ Create User Error:",a),a instanceof TypeError?new Error("Network error - Unable to reach server. Is the backend running on port 5000?"):a}},Ut=async(t,s,a)=>{try{const n=await fetch(Q(`/admin/users/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)}),l=await n.json().catch(()=>null);if(!n.ok)throw n.status===409&&(l?.duplicate===!0||l?.code==="DUPLICATE_PLAYER")?da(l,"Likely duplicate player detected",n.status):new Error(l?.message||"Failed to update user");return l}catch(n){throw console.error("updateUserByAdmin error:",n),n}},lr=async(t,s,a,n="")=>{try{const l=typeof s=="object"&&s!==null&&!Array.isArray(s)?s:{freeplayBalance:s,description:n},d=await fetch(Q(`/admin/users/${t}/freeplay`),{method:"PUT",headers:K(a),body:JSON.stringify(l)}),g=await d.json();if(!d.ok)throw new Error(g.message||"Failed to update freeplay");return g}catch(l){throw console.error("updateUserFreeplay error:",l),l}},Xi=async(t,s)=>{try{if(!s)throw new Error("No token provided. Please login first.");const a=await fetch(Q("/agent/create-user"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>null);if(a.status===409&&(n?.duplicate===!0||n?.code==="DUPLICATE_PLAYER"))throw da(n,"Likely duplicate player detected",a.status);const l=n?.message||`Server error (${a.status}): ${a.statusText}`;throw new Error(l)}return a.json()}catch(a){throw console.error("Create Player Error:",a),a instanceof TypeError?new Error("Network error - Unable to reach server. Is the backend running on port 5000?"):a}},Is=async t=>{const s=await fetch(Q("/agent/my-users"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch players");return s.json()},cs=async(t,s={})=>{const a=new URLSearchParams;s.q&&a.set("q",s.q);const n=a.toString()?Object.fromEntries(a):{},l=await fetch(Q("/admin/users",n),{headers:K(t)});if(!l.ok){const d=await l.json().catch(()=>({}));throw new Error(d.message||"Failed to fetch users")}return l.json()},js=async(t,s,a)=>{const n=await fetch(Q(`/admin/users/${t}/credit`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update user balance")}return n.json()},el=async(t,s,a)=>{const n=await fetch(Q(`/admin/agent/${t}/credit`),{method:"POST",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update agent balance")}return n.json()},Aa=async(t,s,a)=>{const n=await fetch(Q("/agent/update-balance-owed"),{method:"POST",headers:K(a),body:JSON.stringify({userId:t,balance:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update balance")}return n.json()},ys=async(t,s,a)=>{try{const n=await fetch(Q(`/admin/agent/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json();throw new Error(l.message||"Failed to update agent")}return n.json()}catch(n){throw console.error("Update Agent Error:",n),n}},Ft=async(t,s,a)=>{try{const n=await fetch(Q(`/agent/users/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)}),l=await n.json().catch(()=>null);if(!n.ok)throw n.status===409&&(l?.duplicate===!0||l?.code==="DUPLICATE_PLAYER")?da(l,"Likely duplicate player detected",n.status):new Error(l?.message||"Failed to update customer");return l}catch(n){throw console.error("updateUserByAgent error:",n),n}},Ua=async(t,s)=>{try{const a=await fetch(Q("/agent/create-sub-agent"),{method:"POST",headers:K(s),body:JSON.stringify(t)}),n=await a.json();if(!a.ok)throw new Error(n.message||"Failed to create sub-agent");return n}catch(a){throw console.error("createSubAgent error:",a),a}},tl=async t=>{try{const s=await fetch(Q("/agent/my-sub-agents"),{method:"GET",headers:K(t)}),a=await s.json();if(!s.ok)throw new Error(a.message||"Failed to fetch sub-agents");return a}catch(s){throw console.error("getMySubAgents error:",s),s}},$c=async t=>{try{const s=await fetch(Q("/agent/downline-summary"),{method:"GET",headers:K(t)}),a=await s.json();if(!s.ok)throw new Error(a.message||"Failed to fetch downline summary");return a}catch(s){throw console.error("getDownlineSummary error:",s),s}},Rc=async(t,s={})=>{try{const a={};s.periodType&&(a.periodType=s.periodType),s.weekStart&&(a.weekStart=s.weekStart),s.quarter&&(a.quarter=String(s.quarter)),s.year&&(a.year=String(s.year));const n=Q("/admin/agent-cuts",a),l=await fetch(n,{method:"GET",headers:K(t)}),d=await l.json();if(!l.ok)throw new Error(d.message||"Failed to fetch agent cuts");return d}catch(a){throw console.error("getAgentCuts error:",a),a}},Pa=async(t,s)=>{try{const a=await fetch(Q(`/admin/users/${t}/stats`),{method:"GET",headers:K(s)}),n=await a.json();if(!a.ok)throw new Error(n.message||"Failed to fetch user statistics");return n}catch(a){throw console.error("getUserStatistics error:",a),a}},sl=async(t,s)=>{const a=await fetch(Q("/admin/bets"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create ticket")}return a.json()},al=async t=>{const s=await fetch(Q("/admin/billing/summary"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch billing summary");return s.json()},nl=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/billing/invoices",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch invoices");return n.json()},rl=async(t,s)=>{const a=await fetch(Q("/admin/billing/invoices"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create invoice")}return a.json()},il=async(t,s,a)=>{const n=await fetch(Q(`/admin/billing/invoices/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update invoice")}return n.json()},ll=async t=>{const s=await fetch(Q("/admin/settings"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch settings");return s.json()},ol=async(t,s)=>{const a=await fetch(Q("/admin/settings"),{method:"PUT",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to update settings")}return a.json()},cl=async t=>{const s=await fetch(Q("/admin/rules"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch rules");return s.json()},dl=async(t,s)=>{const a=await fetch(Q("/admin/rules"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create rule")}return a.json()},ul=async(t,s,a)=>{const n=await fetch(Q(`/admin/rules/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update rule")}return n.json()},ml=async(t,s)=>{const a=await fetch(Q(`/admin/rules/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete rule")}return a.json()},hl=async(t,s)=>{const a=new URLSearchParams(t).toString(),n=await fetch(Q("/admin/feedback",a?Object.fromEntries(new URLSearchParams(a)):{}),{headers:K(s)});if(!n.ok)throw new Error("Failed to fetch feedback");return n.json()},pl=async(t,s,a)=>{const n=await fetch(Q(`/admin/feedback/${t}/reply`),{method:"POST",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to reply feedback")}return n.json()},gl=async(t,s)=>{const a=await fetch(Q(`/admin/feedback/${t}/reviewed`),{method:"POST",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to mark reviewed")}return a.json()},xl=async(t,s)=>{const a=await fetch(Q(`/admin/feedback/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete feedback")}return a.json()},fl=async t=>{const s=await fetch(Q("/admin/faqs"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch FAQs");return s.json()},bl=async(t,s)=>{const a=await fetch(Q("/admin/faqs"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create FAQ")}return a.json()},jl=async(t,s,a)=>{const n=await fetch(Q(`/admin/faqs/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update FAQ")}return n.json()},yl=async(t,s)=>{const a=await fetch(Q(`/admin/faqs/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete FAQ")}return a.json()},vl=async t=>{const s=await fetch(Q("/admin/manual"),{headers:K(t)});if(!s.ok)throw new Error("Failed to fetch manual");return s.json()},wl=async(t,s)=>{const a=await fetch(Q("/admin/manual"),{method:"POST",headers:K(s),body:JSON.stringify(t)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to create manual section")}return a.json()},Nl=async(t,s,a)=>{const n=await fetch(Q(`/admin/manual/${t}`),{method:"PUT",headers:K(a),body:JSON.stringify(s)});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to update manual section")}return n.json()},Sl=async(t,s)=>{const a=await fetch(Q(`/admin/manual/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to delete manual section")}return a.json()},or=async(t,s)=>{const a=await fetch(Q("/admin/suspend"),{method:"POST",headers:K(s),body:JSON.stringify({userId:t})});if(!a.ok)throw new Error("Failed to suspend user");return a.json()},cr=async(t,s)=>{const a=await fetch(Q("/admin/unsuspend"),{method:"POST",headers:K(s),body:JSON.stringify({userId:t})});if(!a.ok)throw new Error("Failed to unsuspend user");return a.json()},La=async(t,s,a)=>{const n=await fetch(Q(`/admin/users/${t}/reset-password`),{method:"POST",headers:K(a),body:JSON.stringify({newPassword:s})});if(!n.ok){const l=await n.json();throw new Error(l.message||"Failed to reset user password")}return n.json()},dr=async(t,s,a)=>{const n=await fetch(Q(`/admin/agents/${t}/reset-password`),{method:"POST",headers:K(a),body:JSON.stringify({newPassword:s})});if(!n.ok){const l=await n.json();throw new Error(l.message||"Failed to reset agent password")}return n.json()},Ot=async(t,s,a={})=>{const n=String(t||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,"");if(!n)throw new Error("Prefix is required and must contain only letters/numbers");const l={...a};typeof l.suffix=="string"&&(l.suffix=l.suffix.toUpperCase().replace(/[^A-Z0-9]/g,"")),typeof l.type=="string"&&(l.type=l.type.toLowerCase()),typeof l.agentId=="string"&&(l.agentId=l.agentId.trim(),/^[a-f0-9]{24}$/i.test(l.agentId)||delete l.agentId);const d=`/admin/next-username/${encodeURIComponent(n)}`,g=await fetch(Q(d,l),{headers:K(s)});if(!g.ok){const y=await g.json().catch(()=>({}));throw new Error(y.message||"Failed to fetch next username")}return g.json()},kl=async(t,s)=>{const a=await fetch(Q(`/admin/impersonate-user/${t}`),{method:"POST",credentials:"include",headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to impersonate user")}return a.json()},oa=async t=>{const s=await fetch(Q("/admin/agent-tree"),{headers:K(t)});if(!s.ok){const a=await s.json().catch(()=>({}));throw new Error(a.message||"Failed to fetch agent tree")}return s.json()},Cl=async(t,s)=>{const a=await fetch(Q(`/admin/users/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json();throw new Error(n.message||"Failed to delete user")}return a.json()},Al=async(t,s)=>{const a=await fetch(Q(`/admin/agents/${t}`),{method:"DELETE",headers:K(s)});if(!a.ok){const n=await a.json();throw new Error(n.message||"Failed to delete agent")}return a.json()},Pl=async(t,s,a={})=>{if(!t)throw new Error("Please select a spreadsheet file first");const n=Number.isFinite(a?.timeoutMs)?Number(a.timeoutMs):45e3,l=typeof AbortController<"u"?new AbortController:null,d=l?setTimeout(()=>l.abort(),Math.max(5e3,n)):null,g=new FormData;g.append("file",t),a.defaultAgentId&&g.append("defaultAgentId",String(a.defaultAgentId)),typeof a.forceAgentAssignment<"u"&&g.append("forceAgentAssignment",a.forceAgentAssignment?"true":"false");try{const y=await fetch(Q("/admin/import-users-spreadsheet"),{method:"POST",headers:s?{Authorization:`Bearer ${s}`}:{},body:g,signal:l?.signal}),f=(y.headers.get("content-type")||"").toLowerCase(),L=await y.text(),x=f.includes("application/json"),w=x&&L?JSON.parse(L):x?{}:null;if(!y.ok){const p=w&&typeof w=="object"?w.message:"";throw new Error(p||"Failed to import spreadsheet")}if(!w||typeof w!="object"){const p=(L||"").replace(/\s+/g," ").trim().slice(0,140),C=/<html|<!doctype/i.test(L||"")?"Received HTML instead of JSON":"Received non-JSON response";throw new Error(`${C} (status ${y.status}) from ${y.url}.`+(p?` Response starts with: "${p}"`:""))}return w}catch(y){throw y instanceof SyntaxError?new Error("Import returned invalid JSON. Check backend logs for PHP warnings/fatal errors."):y?.name==="AbortError"?new Error("Import timed out. Please check backend/API logs and try again."):y}finally{d&&clearTimeout(d)}},Ll=async(t,s)=>{const a=await fetch(Q(`/admin/agent/${t}/commission-chain`),{headers:K(s)});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to fetch commission chain")}return a.json()},Tl=async(t,s,a)=>{const n=await fetch(Q("/admin/commission/calculate"),{method:"POST",headers:K(a),body:JSON.stringify({agentId:t,amount:s})});if(!n.ok){const l=await n.json().catch(()=>({}));throw new Error(l.message||"Failed to calculate commission")}return n.json()},Dl=async(t,s)=>{const a=await fetch(Q("/admin/commission/validate"),{method:"POST",headers:K(s),body:JSON.stringify({nodes:t})});if(!a.ok){const n=await a.json().catch(()=>({}));throw new Error(n.message||"Failed to validate commission chain")}return a.json()},ur={dashboard:"dashboard","weekly-figures":"weeklyFigures",pending:"pending",messaging:"messaging","game-admin":"gameAdmin","casino-bets":"gameAdmin","customer-admin":"customerAdmin","agent-manager":"agentManager",cashier:"cashier","add-customer":"addCustomer","third-party-limits":"thirdPartyLimits",props:"props","agent-performance":"agentPerformance",analysis:"analysis","ip-tracker":"ipTracker","transaction-history":"transactionsHistory","transactions-history":"transactionsHistory","deleted-wagers":"deletedWagers","games-events":"gamesEvents","sportsbook-links":"sportsbookLinks","bet-ticker":"betTicker",ticketwriter:"ticketwriter",scores:"scores","master-agent-admin":"masterAgentAdmin",billing:"billing",settings:"settings",monitor:"monitor",rules:"rules",feedback:"feedback",faq:"faq","user-manual":"userManual",profile:"profile"},mr=t=>t==="admin"||t==="master_agent"||t==="super_agent",Oc=(t,s,a)=>{if(mr(t))return!0;const n=ur[a];if(!n)return!0;const l=s?.views?.[n];return l===!1?!1:l===!0?!0:!(n==="transactionsHistory"&&s?.views?.collections===!1)},_c=(t,s)=>mr(t)?!0:s?.ipTracker?.manage!==!1;function Uc({onClose:t,onGo:s,initialQuery:a="",onRestoreBaseContext:n,canRestoreBaseContext:l=!1,baseContextLabel:d="Admin"}){const g=new Set(["admin","agent","master_agent","super_agent"]),y=M=>String(M||"").trim().toLowerCase(),f=M=>{const ee=y(M?.role);return ee==="master_agent"?"M":ee==="super_agent"?"S":ee==="agent"?"A":ee==="admin"?"ADMIN":String(M?.role||"").replace(/_/g," ").toUpperCase()||"ACCOUNT"},L=M=>y(M?.role).replace(/_/g,"-")||"account",x=M=>{const ee=y(M?.role);return ee==="admin"||ee==="master_agent"||ee==="super_agent"},w=M=>{const ee=String(M?.username||"").toLowerCase(),ne=y(M?.role).replace(/_/g," "),le=ne.replace(/\s+/g,""),Ue=String(M?.nodeType||"").toLowerCase();return`${ee} ${ne} ${le} ${Ue}`.trim()},p=(M,ee)=>{const xe=String(ee||"").trim().toLowerCase();return xe?w(M).includes(xe):!0},h=M=>{const ee=String(M?.nodeType||"").toLowerCase();return ee==="agent"?!0:ee==="player"?!1:g.has(String(M?.role||"").toLowerCase())},C=M=>String(M||"").trim(),J=(M,ee)=>{const xe=C(ee);if(!xe||!M)return[];const ne=C(M.id);if(ne===xe)return[ne];const le=Array.isArray(M.children)?M.children:[];for(const Ue of le){const A=J(Ue,xe);if(A.length>0)return[ne,...A]}return[]},[B,R]=r.useState(!0),[S,v]=r.useState(null),[_,o]=r.useState(""),[F,D]=r.useState(new Set),[u,q]=r.useState(null),[ge,G]=r.useState(null);r.useEffect(()=>{(async()=>{try{R(!0);const ee=localStorage.getItem("token");if(!ee){q("Please login to load tree"),v(null),G(null);return}const xe=sessionStorage.getItem("impersonationBaseToken"),ne=!!(l&&xe&&xe!==ee),le=await es(ee);G(le||null);let Ue;try{Ue=await oa(ne?xe:ee)}catch(A){if(!ne)throw A;Ue=await oa(ee)}if(v(Ue),Ue?.root){const A=new Set([Ue.root.id]),ie={...Ue.root,children:Ue.tree||[]};J(ie,le?.id).forEach(W=>A.add(W)),D(A)}else D(new Set);q(null)}catch(ee){console.error("Failed to fetch agent tree:",ee),q("Failed to load tree")}finally{R(!1)}})()},[]),r.useEffect(()=>{o(a||"")},[a]),r.useEffect(()=>{const M=ee=>{ee.key==="Escape"&&t?.()};return window.addEventListener("keydown",M),()=>window.removeEventListener("keydown",M)},[t]);const k=M=>{const ee=new Set(F);ee.has(M)?ee.delete(M):ee.add(M),D(ee)},se=(M,ee)=>{const xe=String(ee||"").trim().toLowerCase();return!xe||h(M)&&p(M,xe)?!0:(M.children||[]).some(le=>se(le,xe))},j=C(ge?.id),U=C(S?.root?.id),H=!!(l&&j&&U&&j!==U),I=(S?.tree||[]).filter(M=>h(M)).length>0;Ka.useMemo(()=>{const M=[],ee=xe=>{(xe||[]).forEach(ne=>{M.push(ne),ee(ne.children)})};return ee(S?.tree||[]),M},[S]);const oe=!!S?.root&&x(S.root),Te=F.has(S?.root?.id),z=(M,ee=0)=>{if(!h(M))return null;const ne=C(M.id),le=F.has(ne),Ue=(M.children||[]).filter(Ae=>h(Ae)),ie=Ue.length>0&&x(M),c=M.isDead||M.username?.toUpperCase()==="DEAD",W=_.trim().toLowerCase(),de=f(M),be=L(M);return W&&!se(M,W)?null:e.jsxs("div",{className:`tree-node-wrapper depth-${ee}`,children:[e.jsxs("div",{className:`tree-node ${c?"dead-node":""}`,children:[e.jsxs("div",{className:"node-content",onClick:()=>ie&&k(ne),children:[ie?e.jsx("span",{className:"node-toggle",children:le?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:(M.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${be}`,children:de}),M.agentPercent!=null&&e.jsxs("span",{className:"node-pct-badge",children:[M.agentPercent,"%"]}),c&&e.jsx("span",{className:"dead-tag",children:"DEAD"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>s(ne,M.role),children:"Go"})]}),ie&&(le||_)&&e.jsx("div",{className:"node-children",children:Ue.map(Ae=>z(Ae,ee+1))})]},ne)};return e.jsx("div",{className:"agent-tree-sidebar-wrap",children:e.jsxs("aside",{className:"agent-tree-container agent-tree-sidebar glass-effect",children:[e.jsxs("div",{className:"tree-header",children:[e.jsx("h3",{children:"Account Tree"}),e.jsx("button",{className:"close-x",onClick:t,children:"✕"})]}),e.jsx("div",{className:"tree-search",children:e.jsxs("div",{className:"search-pill",children:[e.jsx("span",{className:"pill-label",children:"Accounts"}),e.jsx("input",{type:"text",placeholder:"Search admin, master, or agent...",value:_,style:{textTransform:"uppercase"},onChange:M=>o(M.target.value.toUpperCase())})]})}),e.jsx("div",{className:"tree-scroll-area",children:B?e.jsx("div",{className:"tree-loading",children:"Loading Tree..."}):u?e.jsx("div",{className:"tree-error",children:u}):S?e.jsxs("div",{className:"tree-root",children:[(S.readonlyAdmins||[]).map(M=>e.jsxs("div",{className:"tree-node depth-0 root-node",style:{opacity:.7,marginBottom:2},children:[e.jsxs("div",{className:"node-content",children:[e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:(M.username||"").toUpperCase()}),e.jsx("span",{className:"node-role-badge role-admin",children:"ADMIN"})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>s(M.id,"admin"),children:"Go"})]},M.id)),e.jsxs("div",{className:"tree-node depth-0 root-node",children:[e.jsxs("div",{className:"node-content",onClick:()=>oe&&k(S.root.id),children:[oe?e.jsx("span",{className:"node-toggle",children:Te?"−":"+"}):e.jsx("span",{className:"node-toggle node-toggle-spacer","aria-hidden":"true"}),e.jsx("span",{className:"node-name",children:S.root.username.toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${L(S.root)}`,children:f(S.root)})]}),e.jsx("button",{className:"node-go-btn",onClick:()=>{if(H&&n){n();return}s(S.root.id,S.root.role)},children:"Go"})]}),I&&(Te||_)&&e.jsx("div",{className:"node-children",children:S.tree.map(M=>z(M,1))})]}):null})]})})}const El=t=>String(t||"").replace(/\s+/g," ").trim(),Wa=t=>El(t).toLowerCase(),Ml=t=>{const s=String(t||"").replace(/\D+/g,"");return s?s.length>10?s.slice(-10):s:""},Bl=t=>Wa(t),Fl=t=>{const s=Wa(t?.fullName||t?.name||"");return s||Wa(`${t?.firstName||""} ${t?.lastName||""}`)},Es=(t,s,a)=>{s&&(t.has(s)||t.set(s,new Set),t.get(s).add(a))},Xa=t=>{if(!Array.isArray(t)||t.length===0)return[];const s=t.map((d,g)=>{const y=String(d?.id||d?.username||`row-${g}`),f=Fl(d),L=Ml(d?.phoneNumber),x=Bl(d?.email);return{player:d,id:y,name:f,phone:L,email:x}}),a=new Map;s.forEach(({id:d,name:g,phone:y,email:f})=>{y&&Es(a,`phone:${y}`,d),f&&Es(a,`email:${f}`,d),g&&y&&Es(a,`name_phone:${g}|${y}`,d),g&&f&&Es(a,`name_email:${g}|${f}`,d),g&&!y&&!f&&g.length>=8&&g.includes(" ")&&Es(a,`name_only:${g}`,d)});const n=new Map,l=d=>(n.has(d)||n.set(d,{reasons:new Set,groups:new Set,matchCount:0}),n.get(d));return a.forEach((d,g)=>{if(d.size<2)return;const y=g.startsWith("email:")?"email":g.startsWith("phone:")?"phone":"name";d.forEach(f=>{const L=l(f);L.reasons.add(y),L.groups.add(g),L.matchCount+=d.size-1})}),s.map(({player:d,id:g})=>{const y=n.get(g);return y?{...d,isDuplicatePlayer:!0,duplicateMatchCount:y.matchCount,duplicateReasons:Array.from(y.reasons),duplicateGroupKeys:Array.from(y.groups)}:{...d,isDuplicatePlayer:!1,duplicateMatchCount:0,duplicateReasons:[],duplicateGroupKeys:[]}})},Il={casino_baccarat:"Baccarat",casino_blackjack:"Blackjack",casino_craps:"Craps",casino_arabian:"Arabian Game",casino_jurassic_run:"Jurassic Run",casino_3card_poker:"3-Card Poker",casino_roulette:"Roulette",casino_stud_poker:"Stud Poker"},$l=new Set(["withdrawal","bet_placed","bet_lost","fee","debit","casino_bet_debit"]),Rl=new Set(["deposit","bet_won","bet_refund","credit","credit_adj","casino_bet_credit","fp_deposit"]),Os=t=>String(t||"").trim().toLowerCase(),hr=t=>String(t||"").trim().toUpperCase(),Ol=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),_l=t=>{const s=Os(t?.sourceType);return Il[s]||""},Ul=t=>{const s=Os(t?.type),a=hr(t?.reason);return s==="fp_deposit"||Ol.has(a)},Wl=t=>{const s=String(t?.entrySide||"").trim().toUpperCase();if(s==="DEBIT")return!0;if(s==="CREDIT")return!1;const a=Number(t?.balanceBefore),n=Number(t?.balanceAfter);return Number.isFinite(a)&&Number.isFinite(n)?n<a:Number(t?.amount||0)<0},pr=t=>{const s=Os(t?.type),a=_l(t),n=hr(t?.reason);if(Ul(t))return n==="NEW_PLAYER_FREEPLAY_BONUS"?"$200 new player freeplay bonus":n==="DEPOSIT_FREEPLAY_BONUS"?"Deposit Freeplay Bonus":n==="REFERRAL_FREEPLAY_BONUS"?"Referral Freeplay Bonus":Wl(t)?"Freeplay Withdrawal":"Freeplay Deposit";switch(s){case"deposit":return"Deposit";case"withdrawal":return"Withdrawal";case"bet_placed":return"Sportsbook Wager";case"bet_won":return"Sportsbook Payout";case"bet_refund":return"Sportsbook Refund";case"casino_bet_debit":return a?`${a} Wager`:"Casino Wager";case"casino_bet_credit":return a?`${a} Payout`:"Casino Payout";case"credit_adj":return"Credit Adjustment";case"adjustment":return n==="ADMIN_CREDIT_ADJUSTMENT"?"Credit Adj":n==="ADMIN_DEBIT_ADJUSTMENT"?"Debit Adj":n==="ADMIN_PROMOTIONAL_CREDIT"?"Promotional Credit":n==="ADMIN_PROMOTIONAL_DEBIT"?"Promotional Debit":"Adjustment";default:return String(t?.type||"Transaction")}},gr=t=>{const s=String(t?.entrySide||"").trim().toUpperCase();if(s==="DEBIT")return!0;if(s==="CREDIT")return!1;const a=Os(t?.type);if(a==="adjustment"){const n=String(t?.reason||"").trim().toUpperCase();if(n==="ADMIN_DEBIT_ADJUSTMENT"||n==="ADMIN_PROMOTIONAL_DEBIT")return!0;if(n==="ADMIN_CREDIT_ADJUSTMENT"||n==="ADMIN_PROMOTIONAL_CREDIT")return!1;const l=Number(t?.balanceBefore),d=Number(t?.balanceAfter);if(Number.isFinite(l)&&Number.isFinite(d))return d<l}return $l.has(a)?!0:Rl.has(a)?!1:Number(t?.amount||0)<0},Wc=t=>{const s=Os(t?.type);return s==="bet_placed"||s==="casino_bet_debit"},sa=[{value:"this-week",label:"This Week"},{value:"last-week",label:"Last Week"},...Array.from({length:16},(t,s)=>{const a=s+2;return{value:`weeks-ago-${a}`,label:`${a} Week's ago`}})],Dn="this-week",En="active-week",zl=null,aa=[{value:"all-players",label:"All Players",description:"Shows all players in the selected week scope."},{value:"active-week",label:"Active For The Week",description:"Shows only active players for the selected week."},{value:"with-balance",label:"With A Balance",description:"Shows only players with a balance."},{value:"big-figures",label:"Big Figures",description:"Shows players with absolute balance greater than $1,000 (winners and losers)."},{value:"over-settle-winners",label:"Over Settle Winners",description:"Shows over-settle winners."},{value:"over-settle-losers",label:"Over Settle Losers",description:"Shows over-settle losers."},{value:"inactive-losers-14d",label:"Inactive Losers 14 Days",description:"Shows only inactive losers from the last 14 days."}],fs=t=>{const s=Number(t);if(Number.isFinite(s))return s;if(typeof t=="string"){const a=t.replace(/[^0-9.-]/g,""),n=Number(a);if(Number.isFinite(n))return n}return 0},Ta=t=>{const s=t?.lifetimePerformance??t?.lifetimePlusMinus??t?.lifetime??0;return fs(s)},Mn=(t,s,a)=>{if(!Array.isArray(t)||t.length===0)return s;const n=t.findIndex(g=>g.value===s),d=((n>=0?n:0)+a+t.length)%t.length;return t[d]?.value??s},Bn=t=>{const s=String(t||"").trim().toLowerCase();return s==="period"||s==="filter"?s:zl};function Vl({onViewChange:t=null,viewContext:s=null}){const[a,n]=r.useState(()=>String(s?.timePeriod||Dn)),[l,d]=r.useState(()=>String(s?.playerFilter||En)),[g,y]=r.useState(()=>Bn(s?.openDropdown)),[f,L]=r.useState(null),[x,w]=r.useState(null),[p,h]=r.useState(null),[C,J]=r.useState([]),[B,R]=r.useState(0),[S,v]=r.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[_,o]=r.useState(!0),[F,D]=r.useState(""),u=r.useRef(null),q=r.useMemo(()=>new Intl.Collator(void 0,{numeric:!0,sensitivity:"base"}),[]),ge=String(s?.summaryFocus||"").trim().toLowerCase(),G=String(s?.actorLabel||"").trim().toUpperCase(),k=ge==="agent-collections",se=ge==="house-collections",j=k||se,U=m=>{if(m==null)return null;const $=Number(m);if(Number.isNaN($))return null;const Z=Math.round($);return Object.is(Z,-0)?0:Z},H=m=>{const $=U(m);return $===null?"—":$.toLocaleString("en-US")},O=m=>{const $=U(m);return $===null?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:0,maximumFractionDigits:0}).format($)},I=m=>{const $=U(m);return $===null||$===0?"is-neutral":$>0?"is-positive":"is-negative"},oe=m=>{const $=U(m);return $===null||$===0?"neutral":$>0?"positive":"negative"},Te=m=>{if(typeof m?.inactive14Days=="boolean")return m.inactive14Days;const $=m?.lastActive||m?.lastBetAt||m?.updatedAt||"",Z=Date.parse(String($||""));if(Number.isNaN(Z))return!1;const me=336*60*60*1e3;return Date.now()-Z>=me},z=m=>{if(typeof m?.activeForWeek=="boolean")return m.activeForWeek;const $=Number(m?.week||0);return Array.isArray(m?.daily)?m.daily.some(Z=>Math.abs(Number(Z||0))>.01):Math.abs($)>.01},M=m=>k?fs(m?.agentCollections??0):se?fs(m?.houseCollections??0):0;r.useEffect(()=>{(async()=>{const $=localStorage.getItem("token");if(!$){D("Please login to view weekly figures."),o(!1);return}try{o(!0);const Z=await Ni(a,$);L(Z.summary),w(Z.settlement||null),h(Z.startDate&&Z.endDate?{start:Z.startDate,end:Z.endDate}:null),J(Z.customers||[]),D("")}catch(Z){console.error("Failed to fetch weekly figures:",Z),D(Z.message||"Failed to load weekly figures")}finally{o(!1)}})()},[a]),r.useEffect(()=>{!s||typeof s!="object"||(n(String(s?.timePeriod||Dn)),d(String(s?.playerFilter||En)),R(0),y(Bn(s?.openDropdown)))},[s]),r.useEffect(()=>{const m=()=>{v(window.innerWidth<=768)};return window.addEventListener("resize",m),()=>window.removeEventListener("resize",m)},[]),r.useEffect(()=>{const m=$=>{u.current&&(u.current.contains($.target)||y(null))};return document.addEventListener("mousedown",m),document.addEventListener("touchstart",m),()=>{document.removeEventListener("mousedown",m),document.removeEventListener("touchstart",m)}},[]);const ee=r.useMemo(()=>Xa(C),[C]),xe=l==="all-players",ne=m=>{const $=Number(m.balance||0),Z=Math.abs(Number(m.settleLimit??m.balanceOwed??0)),me=z(m);return l==="all-players"?!0:l==="with-balance"?Math.abs($)>.01:l==="active-week"?me:l==="big-figures"?Math.abs($)>1e3:l==="over-settle-winners"?Z<=.01?!1:$>=Z:l==="over-settle-losers"?Z<=.01?!1:$<=-Z:l==="inactive-losers-14d"?Te(m)&&$<-.01:!0},le=r.useMemo(()=>ee.map(m=>({...m,matchesSelectedFilter:ne(m)})),[ee,l]),Ue=r.useMemo(()=>{const m=xe?le:le.filter($=>$.matchesSelectedFilter);return j?m.filter($=>Math.abs(M($))>.01):m},[le,M,xe,j]),A=r.useMemo(()=>(m,$)=>{const Z=String(m?.username||""),me=String($?.username||""),Se=q.compare(Z,me);if(j){const fe=Math.abs(M($))-Math.abs(M(m));return fe!==0?fe:Se}if(xe)return Se;if(l==="over-settle-winners"){const fe=Number($?.balance||0)-Number(m?.balance||0);return fe!==0?fe:Se}if(l==="over-settle-losers"||l==="inactive-losers-14d"){const fe=Math.abs(Number($?.balance||0))-Math.abs(Number(m?.balance||0));return fe!==0?fe:Se}if(l==="big-figures"){const fe=Math.abs(Number($?.balance||0))-Math.abs(Number(m?.balance||0));return fe!==0?fe:Se}return Se},[q,M,xe,j,l]),ie=r.useMemo(()=>[...Ue].sort(A),[A,Ue]),c=m=>{!m||typeof t!="function"||t("user-details",m)},W=aa.find(m=>m.value===l)||aa[0],de=sa.find(m=>m.value===a)||sa[0],be=Array.isArray(f?.days)?f.days:[];r.useEffect(()=>{if(!Array.isArray(be)||be.length===0){R(0);return}R(m=>m<0?0:m>be.length-1?be.length-1:m)},[be]);const Ae=r.useMemo(()=>ie.map(m=>{const $=Array.isArray(m?.agentHierarchy)?m.agentHierarchy.map(Se=>String(Se||"").trim().toUpperCase()).filter(Boolean):[],Z=String(m?.agentUsername||"").trim().toUpperCase()||($.length>0?$[$.length-1]:""),me=String(m?.agentHierarchyPath||"").trim().toUpperCase()||($.length>0?$.join(" / "):Z||"UNASSIGNED");return{...m,hierarchy:{path:me,directAgent:Z}}}),[ie]),we=r.useMemo(()=>{const m=new Map;Ae.forEach(Z=>{const me=Z.hierarchy||{},Se=String(me.path||"UNASSIGNED"),fe=Se;m.has(fe)||m.set(fe,{key:fe,hierarchyLabel:Se,customers:[]}),m.get(fe).customers.push(Z)});let $=Array.from(m.values());return $.forEach(Z=>{Z.customers=[...Z.customers].sort(A)}),$=$.sort((Z,me)=>q.compare(Z.hierarchyLabel,me.hierarchyLabel)),$=$.map(Z=>{const me=Z.customers.reduce((Ne,De)=>{const Ge=Number(De?.daily?.[B]??0);return Ne+(Number.isNaN(Ge)?0:Ge)},0),Se=Z.customers.reduce((Ne,De)=>{const Ge=fs(De?.balance??0);return Ne+(Number.isNaN(Ge)?0:Ge)},0),fe=Z.customers.reduce((Ne,De)=>{const Ge=Ta(De);return Ne+(Number.isNaN(Ge)?0:Ge)},0);return{...Z,totals:{players:Z.customers.length,day:me,balance:Se,lifetime:fe}}}),$},[q,A,Ae,B]),Je=be[B]?.day||"Day",We=be.length>0?Je:"Selected Metric",qe=m=>{!Array.isArray(be)||be.length===0||R($=>{const Z=$+m;return Z<0?be.length-1:Z>=be.length?0:Z})},ot=m=>{n($=>Mn(sa,$,m)),y(null)},Qe=m=>{d($=>Mn(aa,$,m)),y(null)},Ke=m=>{y($=>$===m?null:m)},Re=m=>{n(m),y(null)},mt=m=>{d(m),y(null)},xt=m=>{if(!Array.isArray(m?.daily)||m.daily.length===0)return 0;const $=Number(m.daily[B]??0);return Number.isNaN($)?0:$},it=m=>H(m),ze=r.useMemo(()=>ie,[ie]),Ze=r.useMemo(()=>{const m=G||"THIS AGENT";return ge==="agent-collections"?`Opened from Agent Collections for ${m}. Showing This Week collections automatically.`:ge==="house-collections"?`Opened from House Collection for ${m}. Showing This Week collections automatically.`:""},[G,ge]),ct=r.useMemo(()=>{if(!j)return null;const m=ze.reduce(($,Z)=>$+M(Z),0);return{label:k?"Agent Collections":"House Collection",count:ze.length,total:m}},[M,k,j,ze]),Xe=r.useMemo(()=>{const m=ze.length,$=ze.reduce((Se,fe)=>Se+xt(fe),0),Z=ze.reduce((Se,fe)=>Se+fs(fe?.balance??0),0),me=ze.reduce((Se,fe)=>Se+Ta(fe),0);return{playerCount:m,selectedMetricTotal:$,balanceTotal:Z,lifetimeTotal:me}},[ze,B]),Ct=()=>e.jsxs("div",{className:"weekly-mobile-inline-day",children:[e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>qe(-1),"aria-label":"Previous day",children:e.jsx("i",{className:"fa-solid fa-caret-left","aria-hidden":"true"})}),e.jsx("span",{children:Je}),e.jsx("button",{type:"button",className:"weekly-mobile-inline-day-nav",onClick:()=>qe(1),"aria-label":"Next day",children:e.jsx("i",{className:"fa-solid fa-caret-right","aria-hidden":"true"})})]});return e.jsxs("div",{className:"admin-view weekly-figures-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Weekly Figures - Customer Tracking"}),e.jsxs("div",{className:"period-filter",ref:u,children:[e.jsxs("div",{className:`period-filter-control weekly-period-select${g==="period"?" is-open":""}`,role:"group","aria-label":"Week period control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Ke("period"),"aria-label":"Open week period options","aria-haspopup":"listbox","aria-expanded":g==="period",children:e.jsx("span",{className:"period-filter-value",children:de.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>ot(-1),"aria-label":"Previous week period",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>ot(1),"aria-label":"Next week period",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),g==="period"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Week period options",children:sa.map(m=>e.jsx("button",{type:"button",className:`period-filter-menu-item${m.value===a?" is-selected":""}`,onClick:()=>Re(m.value),children:m.label},m.value))})]}),e.jsxs("div",{className:`period-filter-control weekly-filter-select${g==="filter"?" is-open":""}`,role:"group","aria-label":"Player filter control",children:[e.jsx("button",{type:"button",className:"period-filter-value-button",onClick:()=>Ke("filter"),"aria-label":"Open player filter options","aria-haspopup":"listbox","aria-expanded":g==="filter",children:e.jsx("span",{className:"period-filter-value",children:W.label})}),e.jsxs("div",{className:"period-filter-stepper",children:[e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>Qe(-1),"aria-label":"Previous player filter",children:e.jsx("i",{className:"fa-solid fa-angle-up","aria-hidden":"true"})}),e.jsx("button",{type:"button",className:"period-filter-step-btn",onClick:()=>Qe(1),"aria-label":"Next player filter",children:e.jsx("i",{className:"fa-solid fa-angle-down","aria-hidden":"true"})})]}),g==="filter"&&e.jsx("div",{className:"period-filter-menu",role:"listbox","aria-label":"Player filter options",children:aa.map(m=>e.jsx("button",{type:"button",className:`period-filter-menu-item${m.value===l?" is-selected":""}`,onClick:()=>mt(m.value),children:m.label},m.value))})]})]})]}),e.jsxs("div",{className:"view-content",children:[Ze&&e.jsx("div",{className:"weekly-focus-banner",children:Ze}),ct&&e.jsxs("div",{className:"weekly-focus-banner",children:[ct.label,": ",ct.count," player",ct.count===1?"":"s"," matched, total ",H(ct.total)]}),_&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading weekly figures..."}),F&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:F}),!_&&!F&&f&&e.jsxs(e.Fragment,{children:[x&&p&&e.jsxs("div",{className:"summary-section weekly-settlement-section",children:[e.jsx("div",{className:"summary-header",children:e.jsxs("h3",{children:[new Date(p.start).toLocaleDateString("en-US",{month:"numeric",day:"numeric"})," – ",(()=>{const m=new Date(p.end);return m.setDate(m.getDate()-1),m.toLocaleDateString("en-US",{month:"numeric",day:"numeric"})})()," Report"]})}),e.jsxs("div",{className:"weekly-settlement-grid",children:[e.jsxs("div",{className:"stat-group stat-group-green",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Agent Collections"}),e.jsx("span",{className:`stat-value ${oe(x.agentCollections)}`,children:O(x.agentCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${oe(x.houseCollections)}`,children:O(x.houseCollections)})]}),Number(x.previousMakeup||0)>0&&Number(x.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Makeup"}),e.jsx("span",{className:"stat-value negative",children:O(-x.previousMakeup)})]})]}),e.jsxs("div",{className:"stat-group stat-group-yellow",children:[Number(x.makeupReduction||0)>0?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Gross Collections"}),e.jsx("span",{className:`stat-value ${oe(x.netCollections)}`,children:O(x.netCollections)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Makeup Cleared"}),e.jsx("span",{className:"stat-value negative",children:O(-x.makeupReduction)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${oe(x.commissionableProfit)}`,children:O(x.commissionableProfit)})]})]}):e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Net Collections"}),e.jsx("span",{className:`stat-value ${oe(x.netCollections)}`,children:O(x.netCollections)})]}),Number(x.agentSplit||0)>0&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Agent Split",x.agentPercent!=null?` ${x.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${oe(x.agentSplit)}`,children:O(x.agentSplit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsxs("span",{className:"stat-label",children:["Kick to House",x.agentPercent!=null?` ${100-x.agentPercent}%`:""]}),e.jsx("span",{className:`stat-value ${oe(x.kickToHouse)}`,children:O(x.kickToHouse)})]})]})]}),e.jsxs("div",{className:"stat-group stat-group-red",children:[e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Active Players"}),e.jsx("span",{className:"stat-value highlight",children:x.activePlayers})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Player Fees"}),e.jsx("span",{className:"stat-value",children:O(x.totalPlayerFees)})]})]}),e.jsxs("div",{className:"stat-group stat-group-salmon",children:[Number(x.cumulativeMakeup||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Remaining Makeup"}),e.jsx("span",{className:"stat-value negative",children:O(-x.cumulativeMakeup)})]}),Number(x.previousBalanceOwed||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Previous Balance"}),e.jsx("span",{className:`stat-value ${oe(x.previousBalanceOwed)}`,children:O(x.previousBalanceOwed)})]}),Number(x.houseProfit||0)>0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Profit"}),e.jsx("span",{className:`stat-value ${oe(x.houseProfit)}`,children:O(x.houseProfit)})]}),e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"House Collections"}),e.jsx("span",{className:`stat-value ${oe(-x.houseCollections)}`,children:O(-x.houseCollections)})]}),Number(x.fundingAdjustment||0)!==0&&e.jsxs("div",{className:"stat-row",children:[e.jsx("span",{className:"stat-label",children:"Payments"}),e.jsx("span",{className:`stat-value ${oe(-x.fundingAdjustment)}`,children:O(-x.fundingAdjustment)})]}),e.jsxs("div",{className:"stat-row stat-row-total",children:[e.jsx("span",{className:"stat-label",children:"Balance Owed / House Money"}),e.jsx("span",{className:`stat-value ${oe(x.balanceOwed)}`,children:O(x.balanceOwed)})]})]})]})]}),e.jsxs("div",{className:"summary-section",children:[e.jsx("div",{className:"summary-header",children:e.jsx("h3",{children:"Summary"})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table customer-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Summary"}),e.jsx("th",{children:We}),e.jsx("th",{children:"Balance"})]})}),e.jsx("tbody",{children:e.jsxs("tr",{children:[e.jsxs("td",{children:[Xe.playerCount," ",l==="active-week"?"Active Players":"Players"]}),e.jsx("td",{className:`weekly-amount ${I(Xe.selectedMetricTotal)}`,children:H(Xe.selectedMetricTotal)}),e.jsx("td",{className:`weekly-amount ${I(Xe.balanceTotal)}`,children:H(Xe.balanceTotal)})]})})]})})]}),e.jsxs("div",{className:"customer-section",children:[e.jsx("div",{className:"section-header",children:e.jsx("h3",{children:W.label})}),e.jsx("div",{className:"weekly-mobile-customer-shell",children:e.jsx("div",{className:"weekly-mobile-groups",children:we.length>0?we.map(m=>{const $=l==="over-settle-winners"||l==="over-settle-losers";return e.jsxs("section",{className:`weekly-mobile-group weekly-mobile-table-block${$?" weekly-mobile-has-lifetime":""}`,children:[e.jsx("div",{className:"weekly-mobile-hierarchy",children:m.hierarchyLabel}),e.jsxs("div",{className:"weekly-mobile-table-head",children:[e.jsx("span",{children:"Customer"}),e.jsx("div",{className:"weekly-mobile-table-day-head",children:Ct()}),e.jsx("span",{children:"Balance"}),$&&e.jsx("span",{className:"weekly-mobile-lifetime-head",children:"Lifetime"})]}),e.jsxs("div",{className:"weekly-mobile-rows",children:[m.customers.map((Z,me)=>{const Se=xt(Z),fe=fs(Z?.balance??0),Ne=Se,De=fe,Ge=Ta(Z);return e.jsxs("div",{className:`weekly-mobile-table-row ${Z.isDuplicatePlayer?"weekly-duplicate-row":""}`,children:[e.jsxs("div",{className:"weekly-mobile-customer-cell weekly-mobile-user",children:[Z.id&&typeof t=="function"?e.jsx("button",{type:"button",className:"customer-username customer-username-button",onClick:()=>c(Z.id),children:Z.username}):e.jsx("strong",{className:"customer-username",children:Z.username}),e.jsx("span",{className:"weekly-mobile-fullname",children:Z.name||"—"}),Z.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"})]}),e.jsx("div",{className:`weekly-mobile-day-cell ${I(Ne)}`,children:it(Ne)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${I(De)}`,children:e.jsx("span",{className:"weekly-mobile-balance-value",children:it(De)})}),$&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${I(Ge)}`,children:it(Ge)})]},`${m.key}-${String(Z.id||Z.username||me)}`)}),e.jsxs("div",{className:"weekly-mobile-table-row weekly-mobile-group-total-row",children:[e.jsx("div",{className:"weekly-mobile-customer-cell",children:e.jsxs("strong",{children:[m.totals.players," Players"]})}),e.jsx("div",{className:`weekly-mobile-day-cell ${I(m.totals.day)}`,children:it(m.totals.day)}),e.jsx("div",{className:`weekly-mobile-balance-cell ${I(m.totals.balance)}`,children:it(m.totals.balance)}),$&&e.jsx("div",{className:`weekly-mobile-lifetime-cell ${I(m.totals.lifetime)}`,children:it(m.totals.lifetime)})]})]})]},m.key)}):e.jsx("div",{className:"weekly-empty-state",children:"No players matched this filter."})})})]})]})]})]})}const zc=Object.freeze(Object.defineProperty({__proto__:null,default:Vl},Symbol.toStringTag,{value:"Module"}));function Hl(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(null),[f,L]=r.useState("all");r.useEffect(()=>{(async()=>{const R=localStorage.getItem("token");if(!R){d("Please login to view pending items."),n(!1);return}try{n(!0);const[S,v]=await Promise.all([Si(R),ma({status:"pending",limit:300},R)]),_=Array.isArray(S)?S.map(D=>({id:`transaction-${D.id}`,entityId:D.id,source:"transaction",type:D.type||"transaction",details:"Pending wallet/payment transaction",amount:Number(D.amount||0),user:D.user||"Unknown",date:D.date||null,status:D.status||"pending"})):[],F=[...Array.isArray(v?.bets)?v.bets.map(D=>({id:`bet-${D.id}`,entityId:D.id,source:"sportsbook",type:D.type||"bet",details:D.match?.homeTeam&&D.match?.awayTeam?`${D.match.homeTeam} vs ${D.match.awayTeam}`:D.description||"Pending sportsbook bet",amount:Number(D.risk||D.amount||0),user:D.customer||D.username||"Unknown",date:D.createdAt||null,status:D.status||"pending"})):[],..._].sort((D,u)=>{const q=D.date?new Date(D.date).getTime():0;return(u.date?new Date(u.date).getTime():0)-q});s(F),d("")}catch(S){console.error("Failed to load pending items:",S),d(S.message||"Failed to load pending items")}finally{n(!1)}})()},[]);const x=async B=>{const R=localStorage.getItem("token");if(!R){d("Please login to approve items.");return}try{y(B),await ki(B,R),s(S=>S.filter(v=>v.entityId!==B))}catch(S){d(S.message||"Failed to approve item")}finally{y(null)}},w=async B=>{const R=localStorage.getItem("token");if(!R){d("Please login to decline items.");return}try{y(B),await Ci(B,R),s(S=>S.filter(v=>v.entityId!==B))}catch(S){d(S.message||"Failed to decline item")}finally{y(null)}},p=B=>{if(B==null)return"—";const R=Number(B);return Number.isNaN(R)?"—":`$${Math.round(R)}`},h=B=>{if(!B)return"—";const R=new Date(B);return Number.isNaN(R.getTime())?"—":R.toLocaleString()},C=f==="all"?t:t.filter(B=>B.source===f),J=t.reduce((B,R)=>(B[R.source]=(B[R.source]||0)+1,R.source==="sportsbook"&&(B.betExposure+=Number(R.amount||0)),B),{sportsbook:0,transaction:0,betExposure:0});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Pending Items"}),e.jsxs("p",{className:"count",children:[t.length," pending items"]})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading pending items..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Pending"}),e.jsx("div",{className:"amount",children:t.length}),e.jsx("p",{className:"change",children:"Transactions + sportsbook bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Bets"}),e.jsx("div",{className:"amount",children:J.sportsbook}),e.jsx("p",{className:"change",children:"Sportsbook tickets awaiting settlement"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("div",{className:"amount",children:J.transaction}),e.jsx("p",{className:"change",children:"Wallet/payment approvals"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bet Exposure"}),e.jsx("div",{className:"amount",children:p(J.betExposure)}),e.jsx("p",{className:"change",children:"Risk currently locked in pending bets"})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Source"}),e.jsxs("select",{value:f,onChange:B=>L(B.target.value),children:[e.jsx("option",{value:"all",children:"All Pending Items"}),e.jsx("option",{value:"sportsbook",children:"Sportsbook Bets"}),e.jsx("option",{value:"transaction",children:"Transactions"})]})]})}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Details"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:C.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No pending items found."})}):C.map(B=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`badge ${B.source}`,children:B.source})}),e.jsx("td",{children:B.type}),e.jsx("td",{children:B.details}),e.jsx("td",{children:p(B.amount)}),e.jsx("td",{children:B.user}),e.jsx("td",{children:h(B.date)}),e.jsx("td",{children:e.jsx("span",{className:"badge pending",children:B.status})}),e.jsx("td",{children:B.source==="transaction"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-approve",onClick:()=>x(B.entityId),disabled:g===B.entityId,children:g===B.entityId?"Working...":"Approve"}),e.jsx("button",{className:"btn-small btn-decline",onClick:()=>w(B.entityId),disabled:g===B.entityId,children:g===B.entityId?"Working...":"Decline"})]}):e.jsx("span",{style:{color:"#6b7280",fontSize:"12px"},children:"Settles from sportsbook results"})})]},B.id))})]})})]})]})]})}const Vc=Object.freeze(Object.defineProperty({__proto__:null,default:Hl},Symbol.toStringTag,{value:"Module"}));function ql(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(null);r.useEffect(()=>{(async()=>{const p=localStorage.getItem("token")||sessionStorage.getItem("token");if(!p){d("Please login to view messages."),n(!1);return}try{n(!0);const h=await Ai(p);s(h||[]),d("")}catch(h){console.error("Failed to fetch messages:",h),d(h.message||"Failed to load messages")}finally{n(!1)}})()},[]);const f=async w=>{const p=localStorage.getItem("token")||sessionStorage.getItem("token");if(!p){d("Please login to reply.");return}const h=window.prompt("Enter your reply:");if(h)try{y(w),await Li(w,h,p),s(C=>C.map(J=>J.id===w?{...J,read:!0,replies:[...J.replies||[],{message:h,createdAt:new Date}]}:J))}catch(C){d(C.message||"Failed to send reply")}finally{y(null)}},L=async w=>{const p=localStorage.getItem("token")||sessionStorage.getItem("token");if(!p){d("Please login to delete messages.");return}try{y(w),await Ti(w,p),s(h=>h.filter(C=>C.id!==w))}catch(h){d(h.message||"Failed to delete message")}finally{y(null)}},x=async w=>{const p=localStorage.getItem("token")||sessionStorage.getItem("token");if(p)try{await Pi(w,p),s(h=>h.map(C=>C.id===w?{...C,read:!0}:C))}catch(h){console.error("Failed to mark read:",h)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Messaging Center"}),e.jsxs("p",{className:"count",children:["Unread: ",t.filter(w=>!w.read).length]})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading messages..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"messaging-container",children:e.jsx("div",{className:"message-list",children:t.map(w=>e.jsxs("div",{className:`message-item ${w.read?"":"unread"}`,onClick:()=>x(w.id),children:[e.jsxs("div",{className:"message-header",children:[e.jsx("h4",{children:w.fromName}),e.jsx("span",{className:"date",children:new Date(w.createdAt).toLocaleString()})]}),e.jsx("p",{className:"subject",children:w.subject}),e.jsx("p",{className:"subject",style:{opacity:.8},children:w.body}),e.jsxs("div",{className:"message-actions",children:[e.jsx("button",{className:"btn-small",onClick:p=>{p.stopPropagation(),f(w.id)},disabled:g===w.id,children:g===w.id?"Working...":"Reply"}),e.jsx("button",{className:"btn-small",onClick:p=>{p.stopPropagation(),L(w.id)},disabled:g===w.id,children:g===w.id?"Working...":"Delete"})]})]},w.id))})})]})]})}const Hc=Object.freeze(Object.defineProperty({__proto__:null,default:ql},Symbol.toStringTag,{value:"Module"}));function Gl(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1),[f,L]=r.useState(!1),[x,w]=r.useState(!1),[p,h]=r.useState(null),[C,J]=r.useState({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),B=u=>{if(u==null)return"—";const q=Number(u);return Number.isNaN(q)?"—":`$${Math.round(q)}`},R=async()=>{const u=localStorage.getItem("token")||sessionStorage.getItem("token");if(!u){d("Please login to manage games."),n(!1);return}try{n(!0);const q=await ua(u);s(q||[]),d("")}catch(q){console.error("Failed to load games:",q),d(q.message||"Failed to load games")}finally{n(!1)}};r.useEffect(()=>{R()},[]);const S=()=>{J({homeTeam:"",awayTeam:"",sport:"",startTime:"",status:"scheduled"}),y(!0)},v=u=>{h(u),J({homeTeam:u.homeTeam,awayTeam:u.awayTeam,sport:u.sport,startTime:new Date(u.startTime).toISOString().slice(0,16),status:u.status}),L(!0)},_=u=>{h(u),w(!0)},o=u=>{const{name:q,value:ge}=u.target;J(G=>({...G,[q]:ge}))},F=async u=>{u.preventDefault();const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!q){d("Please login to add games.");return}try{const ge={...C,startTime:new Date(C.startTime).toISOString()},G=await ar(ge,q);s(k=>[...k,{id:G.id,homeTeam:G.homeTeam,awayTeam:G.awayTeam,sport:G.sport,startTime:G.startTime,status:G.status,activeBets:0,revenue:0}]),y(!1)}catch(ge){d(ge.message||"Failed to create match")}},D=async u=>{u.preventDefault();const q=localStorage.getItem("token")||sessionStorage.getItem("token");if(!q){d("Please login to update games.");return}try{const ge={...C,startTime:new Date(C.startTime).toISOString()},G=await nr(p.id,ge,q);s(k=>k.map(se=>se.id===p.id?{...se,homeTeam:G.homeTeam,awayTeam:G.awayTeam,sport:G.sport,startTime:G.startTime,status:G.status}:se)),L(!1)}catch(ge){d(ge.message||"Failed to update match")}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Game Administration"}),e.jsx("button",{className:"btn-primary",onClick:S,children:"Add New Game"})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Start Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Active Bets"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(u=>e.jsxs("tr",{children:[e.jsxs("td",{children:[u.homeTeam," vs ",u.awayTeam]}),e.jsx("td",{children:u.sport}),e.jsx("td",{children:new Date(u.startTime).toLocaleString()}),e.jsx("td",{children:e.jsx("span",{className:`badge ${u.status}`,children:u.status})}),e.jsx("td",{children:u.activeBets}),e.jsx("td",{children:B(u.revenue)}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>v(u),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>_(u),children:"View"})]})]},u.id))})]})})]}),g&&e.jsx("div",{className:"modal-overlay",onClick:()=>y(!1),children:e.jsxs("div",{className:"modal-content",onClick:u=>u.stopPropagation(),children:[e.jsx("h3",{children:"Add New Game"}),e.jsxs("form",{onSubmit:F,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:C.homeTeam,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:C.awayTeam,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:C.sport,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:C.startTime,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:C.status,onChange:o,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"})]})]})]})}),f&&p&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:u=>u.stopPropagation(),children:[e.jsx("h3",{children:"Edit Game"}),e.jsxs("form",{onSubmit:D,className:"admin-form",children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{name:"homeTeam",value:C.homeTeam,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{name:"awayTeam",value:C.awayTeam,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Sport"}),e.jsx("input",{name:"sport",value:C.sport,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",name:"startTime",value:C.startTime,onChange:o,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{name:"status",value:C.status,onChange:o,children:[e.jsx("option",{value:"scheduled",children:"scheduled"}),e.jsx("option",{value:"live",children:"live"}),e.jsx("option",{value:"finished",children:"finished"}),e.jsx("option",{value:"cancelled",children:"cancelled"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"})]})]})]})}),x&&p&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:u=>u.stopPropagation(),children:[e.jsx("h3",{children:"Game Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Match:"})," ",p.homeTeam," vs ",p.awayTeam]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",p.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Start Time:"})," ",new Date(p.startTime).toLocaleString()]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",p.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Active Bets:"})," ",p.activeBets]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Revenue:"})," ",B(p.revenue)]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Close"})})]})})]})}const qc=Object.freeze(Object.defineProperty({__proto__:null,default:Gl},Symbol.toStringTag,{value:"Module"})),Fn={game:"",username:"",userId:"",result:"",from:"",to:"",minWager:"",maxWager:""};function Yl(){const[t,s]=r.useState(Fn),[a,n]=r.useState([]),[l,d]=r.useState(null),[g,y]=r.useState([]),[f,L]=r.useState([]),[x,w]=r.useState({count:0,sample:[]}),[p,h]=r.useState(!0),[C,J]=r.useState(""),[B,R]=r.useState(1),[S,v]=r.useState({page:1,pages:1,total:0,limit:50}),[_,o]=r.useState(!1),[F,D]=r.useState(""),[u,q]=r.useState(null),ge=localStorage.getItem("token"),G=r.useCallback(async()=>{if(!ge){J("Please login to view casino bets."),h(!1);return}try{h(!0),J("");const[c,W]=await Promise.all([fi({...t,page:B,limit:50},ge),yi({game:t.game,from:t.from,to:t.to,result:t.result,username:t.username,userId:t.userId},ge)]);n(Array.isArray(c?.bets)?c.bets:[]),v(c?.pagination||{page:B,pages:1,total:0,limit:50}),d(W?.summary||null),y(Array.isArray(W?.byGame)?W.byGame:[]),L(Array.isArray(W?.byUser)?W.byUser:[]),w(W?.anomalies||{count:0,sample:[]})}catch(c){console.error("Failed to load admin casino data:",c),J(c.message||"Failed to load casino bets")}finally{h(!1)}},[ge,t,B]);r.useEffect(()=>{G()},[G]);const k=(c,W)=>{R(1),s(de=>({...de,[c]:W}))},se=async c=>{if(!(!c||!ge))try{o(!0),D("");const W=await ji(c,ge);q(W?.bet||null)}catch(W){D(W.message||"Failed to load round detail")}finally{o(!1)}},j=()=>{q(null),D("")},U=()=>{R(1),s(Fn)},H=c=>{const W=Number(c||0);return Number.isNaN(W)?"$0":`$${Math.round(W)}`},O=c=>c?new Date(c).toLocaleString():"—",I=c=>{switch(String(c||"").toLowerCase()){case"stud-poker":return"Stud Poker";case"roulette":return"Roulette";case"blackjack":return"Blackjack";case"baccarat":return"Baccarat";case"craps":return"Craps";case"arabian":return"Arabian Game";case"jurassic-run":return"Jurassic Run";case"arabian-treasure":return"Arabian Game";case"3card-poker":return"3-Card Poker";default:return c||"—"}},oe=c=>{const W=String(c?.playerOutcome||"").trim();if(W)return W;const de=String(c?.roundStatus||"").toLowerCase();if(de&&de!=="settled")return"Pending";const be=Number(c?.netResult||0);return be>0?"Win":be<0?"Lose":"Push"},Te=c=>String(c||"unknown").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")||"unknown",z=c=>{if(!c)return"—";if(String(c.game||"").toLowerCase()==="roulette"&&c.rouletteOutcome){const W=c.rouletteOutcome.number??c.result,de=String(c.rouletteOutcome.color||"").trim();return de?`${W} ${de}`:`${W}`}if(String(c.game||"").toLowerCase()==="craps"){const W=c?.roundData?.dice,de=Number(W?.die1),be=Number(W?.die2),Ae=Number(W?.sum);if(Number.isFinite(de)&&Number.isFinite(be)&&Number.isFinite(Ae))return`${de}+${be}=${Ae}`}if(String(c.game||"").toLowerCase()==="arabian"){const W=Number(c?.roundData?.totalWin??c?.totalReturn??0),de=Number(c?.roundData?.bonusWin??0),be=Number(c?.roundData?.freeSpinsAwarded??0),Ae=[];if(W>0&&Ae.push(`Win ${H(W)}`),de>0&&Ae.push(`Bonus ${H(de)}`),be>0&&Ae.push(`+${be} FS`),Ae.length>0)return Ae.join(" | ")}if(String(c.game||"").toLowerCase()==="jurassic-run"){const W=Number(c?.roundData?.totalWin??c?.totalReturn??0),de=Number(c?.roundData?.jackpotPayout??0),be=Number(c?.roundData?.freeSpinsAwarded??0),Ae=!!c?.roundData?.isFreeSpinRound,we=[];if(de>0?we.push(`Jackpot ${H(de)}`):W>0&&we.push(`Win ${H(W)}`),be>0&&we.push(`+${be} FS`),we.length>0)return we.join(" | ");if(Ae)return"Free Spin"}if(String(c.game||"").toLowerCase()==="3card-poker"){const W=String(c?.roundData?.mainResultLabel||c?.result||"").trim(),de=String(c?.playerHand||c?.roundData?.playerHand||"").trim(),be=String(c?.dealerHand||c?.roundData?.dealerHand||"").trim(),Ae=[];return W&&Ae.push(W),de&&Ae.push(`P ${de}`),be&&Ae.push(`D ${be}`),Ae.length>0?Ae.join(" | "):"—"}return c.result||"—"},M=c=>{switch(String(c||"").toLowerCase()){case"server_rng":return"Server RNG";case"server_simulated_actions":return"Server Simulation";case"native_client_round":return"Client Native";case"client_actions_server_rules":return"Server Rules";case"":return"—";default:return c||"—"}},ee=c=>{const W=String(c?.label||"").trim();if(W)return W;const de=String(c?.type||"").trim(),be=String(c?.value||"").trim();return de&&be?`${de}:${be}`:de||"Bet"},xe=c=>Array.isArray(c?.bets)?c.bets.filter(W=>W&&typeof W=="object"):[],ne=c=>{const W=new Set(Array.isArray(c?.winningBetKeys)?c.winningBetKeys.map(de=>String(de)):[]);return xe(c).filter(de=>W.has(String(de?.key||"")))},le=c=>{const W=c?.bets&&typeof c.bets=="object"?c.bets:{};return Object.keys(W).filter(de=>Number(W[de])>0).sort().map(de=>({key:de,amount:Number(W[de])}))},Ue=c=>{const W=Number(c||0);return W>0?"casino-net-pill is-positive":W<0?"casino-net-pill is-negative":"casino-net-pill is-neutral"},A=c=>{const W=String(c||"");return W?`${W.slice(0,10)}…`:"—"},ie=r.useMemo(()=>[{label:"Rounds",value:Number(l?.rounds||0).toLocaleString(),tone:"navy"},{label:"Total Wager",value:H(l?.totalWager),tone:"blue"},{label:"Total Return",value:H(l?.totalReturn),tone:"teal"},{label:"GGR",value:H(l?.grossGamingRevenue),tone:"slate"},{label:"Average Bet",value:H(l?.averageBet),tone:"navy"},{label:"RTP Estimate",value:`${Number(l?.rtpEstimate||0).toFixed(2)}%`,tone:"indigo"},{label:"Payout Ratio",value:`${Number(l?.payoutRatio||0).toFixed(2)}%`,tone:"indigo"},{label:"Anomalies",value:Number(l?.anomalyCount||0).toLocaleString(),tone:"rose"},{label:"Error Rate",value:`${Number(l?.errorRate||0).toFixed(4)}%`,tone:"rose"}],[l]);return e.jsxs("div",{className:"admin-view casino-bets-view",children:[e.jsxs("div",{className:"view-header casino-bets-header",children:[e.jsxs("div",{children:[e.jsx("h2",{children:"Casino Bets"}),e.jsx("p",{className:"subtitle",children:"Server-settled casino reporting, settlement ledger, and round-level audit details."})]}),e.jsxs("div",{className:"casino-bets-header-actions",children:[e.jsx("button",{type:"button",className:"btn-small",onClick:G,disabled:p,children:p?"Refreshing…":"Refresh"}),e.jsx("button",{type:"button",className:"btn-small btn-accent",onClick:()=>bi(t,ge),children:"Export CSV"})]})]}),e.jsxs("div",{className:"view-content casino-bets-content",children:[p&&e.jsx("div",{className:"casino-bets-loading",children:"Loading casino bets…"}),C&&e.jsx("div",{className:"casino-bets-error",children:C}),!p&&!C&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"casino-bets-kpi-grid",children:ie.map(c=>e.jsxs("div",{className:`casino-kpi-card tone-${c.tone}`,children:[e.jsx("span",{className:"casino-kpi-label",children:c.label}),e.jsx("strong",{className:"casino-kpi-value",children:c.value})]},c.label))}),e.jsxs("div",{className:"casino-bets-filters casino-bets-highlights",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Win"}),e.jsx("div",{children:l?.biggestWin?`${l.biggestWin.username||"—"} ${H(l.biggestWin.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Biggest Loss"}),e.jsx("div",{children:l?.biggestLoss?`${l.biggestLoss.username||"—"} ${H(l.biggestLoss.netResult)}`:"—"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Anomaly Sample"}),e.jsxs("div",{children:[Number(x?.count||0)," flagged rounds"]})]})]}),g.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"GGR"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"RTP"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:g.map(c=>e.jsxs("tr",{children:[e.jsx("td",{children:I(c.game)}),e.jsx("td",{children:Number(c.rounds||0).toLocaleString()}),e.jsx("td",{children:H(c.totalWager)}),e.jsx("td",{children:H(c.totalReturn)}),e.jsx("td",{children:H(c.grossGamingRevenue)}),e.jsx("td",{children:H(c.averageBet)}),e.jsxs("td",{children:[Number(c.payoutRatio||0).toFixed(2),"%"]}),e.jsx("td",{children:c.biggestWin!==null&&c.biggestWin!==void 0?H(c.biggestWin):"—"}),e.jsx("td",{children:c.biggestLoss!==null&&c.biggestLoss!==void 0?H(c.biggestLoss):"—"})]},c.game))})]})}),f.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"User ID"}),e.jsx("th",{children:"Rounds"}),e.jsx("th",{children:"Total Wager"}),e.jsx("th",{children:"Total Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Avg Bet"}),e.jsx("th",{children:"Biggest Win"}),e.jsx("th",{children:"Biggest Loss"})]})}),e.jsx("tbody",{children:f.map(c=>e.jsxs("tr",{children:[e.jsx("td",{children:c.username||"—"}),e.jsx("td",{className:"round-id",title:c.userId||"",children:A(c.userId||"")}),e.jsx("td",{children:Number(c.rounds||0).toLocaleString()}),e.jsx("td",{children:H(c.totalWager)}),e.jsx("td",{children:H(c.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Ue(c.netResult),children:H(c.netResult)})}),e.jsx("td",{children:H(c.averageBet)}),e.jsx("td",{children:c.biggestWin!==null&&c.biggestWin!==void 0?H(c.biggestWin):"—"}),e.jsx("td",{children:c.biggestLoss!==null&&c.biggestLoss!==void 0?H(c.biggestLoss):"—"})]},`${c.userId||""}:${c.username||""}`))})]})}),Array.isArray(x?.sample)&&x.sample.length>0&&e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap casino-bets-table-section",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Reasons"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsx("tbody",{children:x.sample.map((c,W)=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:c.roundId||"",children:A(c.roundId||"")}),e.jsx("td",{children:c.username||"—"}),e.jsx("td",{children:I(c.game)}),e.jsx("td",{children:Array.isArray(c.reasons)?c.reasons.join(", "):"—"}),e.jsx("td",{children:H(c.totalWager)}),e.jsx("td",{children:H(c.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Ue(c.netResult),children:H(c.netResult)})}),e.jsx("td",{children:H(c.balanceBefore)}),e.jsx("td",{children:H(c.balanceAfter)}),e.jsx("td",{children:O(c.createdAt)})]},`${c.roundId||"anomaly"}:${W}`))})]})}),e.jsxs("div",{className:"casino-bets-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Game"}),e.jsxs("select",{value:t.game,onChange:c=>k("game",c.target.value),children:[e.jsx("option",{value:"",children:"All"}),e.jsx("option",{value:"baccarat",children:"Baccarat"}),e.jsx("option",{value:"blackjack",children:"Blackjack"}),e.jsx("option",{value:"craps",children:"Craps"}),e.jsx("option",{value:"arabian",children:"Arabian Game"}),e.jsx("option",{value:"jurassic-run",children:"Jurassic Run"}),e.jsx("option",{value:"3card-poker",children:"3-Card Poker"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Player"}),e.jsx("input",{type:"text",value:t.username,onChange:c=>k("username",c.target.value),placeholder:"username"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User ID"}),e.jsx("input",{type:"text",value:t.userId,onChange:c=>k("userId",c.target.value),placeholder:"user id"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Outcome / Result"}),e.jsx("input",{type:"text",value:t.result,onChange:c=>k("result",c.target.value),placeholder:"Win / Lose / Push / Pending / Player / Banker / 17"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"From"}),e.jsx("input",{type:"date",value:t.from,onChange:c=>k("from",c.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"To"}),e.jsx("input",{type:"date",value:t.to,onChange:c=>k("to",c.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Min Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:t.minWager,onChange:c=>k("minWager",c.target.value),placeholder:"0.00"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Max Wager"}),e.jsx("input",{type:"number",min:"0",step:"0.01",value:t.maxWager,onChange:c=>k("maxWager",c.target.value),placeholder:"500.00"})]}),e.jsx("div",{className:"casino-filter-actions",children:e.jsx("button",{type:"button",className:"btn-small",onClick:U,children:"Clear"})})]}),e.jsx("div",{className:"table-container scrollable casino-bets-table-wrap",children:e.jsxs("table",{className:"data-table casino-bets-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Round"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Game"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Source"}),e.jsx("th",{children:"Outcome"}),e.jsx("th",{children:"Result"}),e.jsx("th",{children:"Wager"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsxs("tbody",{children:[a.map(c=>e.jsxs("tr",{children:[e.jsx("td",{className:"round-id",title:c.roundId||c.id||"",children:A(c.roundId||c.id)}),e.jsx("td",{children:c.username||"—"}),e.jsx("td",{children:I(c.game)}),e.jsx("td",{children:c.roundStatus||"—"}),e.jsx("td",{children:M(c.outcomeSource)}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${Te(oe(c))}`,children:oe(c)})}),e.jsx("td",{children:e.jsx("span",{className:`casino-result-badge result-${Te(z(c))}`,children:z(c)})}),e.jsx("td",{children:H(c.totalWager)}),e.jsx("td",{children:H(c.totalReturn)}),e.jsx("td",{children:e.jsx("span",{className:Ue(c.netResult),children:H(c.netResult)})}),e.jsx("td",{children:H(c.balanceAfter)}),e.jsx("td",{children:O(c.createdAt)}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>se(c.roundId||c.id),type:"button",children:"View"})})]},c.roundId||c.id)),a.length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:13,className:"casino-bets-empty-row",children:"No casino bet rows found."})})]})]})}),e.jsxs("div",{className:"casino-bets-pagination",children:[e.jsxs("span",{className:"casino-page-meta",children:[Number(S?.total||0).toLocaleString()," rows"]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>R(c=>Math.max(1,c-1)),disabled:B<=1,children:"Previous"}),e.jsxs("span",{className:"casino-page-index",children:["Page ",S?.page||B," of ",S?.pages||1]}),e.jsx("button",{type:"button",className:"btn-small",onClick:()=>R(c=>Math.min(Number(S?.pages||1),c+1)),disabled:(S?.page||B)>=(S?.pages||1),children:"Next"})]})]})]}),(u||_||F)&&e.jsx("div",{className:"modal-overlay",onClick:j,children:e.jsxs("div",{className:"modal-content casino-bets-modal",onClick:c=>c.stopPropagation(),children:[e.jsxs("div",{className:"casino-bets-modal-head",children:[e.jsx("h3",{children:"Casino Round Detail"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:j,children:"Close"})]}),_&&e.jsx("div",{className:"casino-bets-loading",children:"Loading round detail…"}),F&&e.jsx("div",{className:"casino-bets-error",children:F}),!_&&u&&e.jsxs("div",{className:"casino-bets-detail",children:[e.jsxs("div",{className:"casino-bets-detail-grid",children:[e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Round"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Round ID"}),e.jsx("code",{children:u.roundId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Request ID"}),e.jsx("code",{children:u.requestId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Game"}),e.jsx("span",{children:I(u.game)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:u.roundStatus||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:M(u.outcomeSource||u?.audit?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Outcome"}),e.jsx("span",{className:`casino-result-badge result-${Te(oe(u))}`,children:oe(u)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Result"}),e.jsx("span",{className:`casino-result-badge result-${Te(z(u))}`,children:z(u)})]}),u.playerAction&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Action"}),e.jsx("span",{children:u.playerAction})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Decision"}),e.jsx("span",{children:O(u.serverDecisionAt)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Player"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Username"}),e.jsx("strong",{children:u.username||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"User ID"}),e.jsx("code",{children:u.userId||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance Before"}),e.jsx("strong",{children:H(u.balanceBefore)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Balance After"}),e.jsx("strong",{children:H(u.balanceAfter)})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:u.game==="roulette"?"Outcome":u.game==="craps"?"Dice":u.game==="arabian"||u.game==="jurassic-run"?"Spin":u.game==="3card-poker"?"Bet Breakdown":"Cards"}),u.game==="roulette"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Number"}),e.jsx("strong",{children:u.rouletteOutcome?.number??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Color"}),e.jsx("span",{children:u.rouletteOutcome?.color||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Parity"}),e.jsx("span",{children:u.rouletteOutcome?.parity||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Range"}),e.jsx("span",{children:u.rouletteOutcome?.range||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dozen"}),e.jsx("span",{children:u.rouletteOutcome?.dozen||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Column"}),e.jsx("span",{children:u.rouletteOutcome?.column||"—"})]})]}):u.game==="craps"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 1"}),e.jsx("strong",{children:u?.roundData?.dice?.die1??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Die 2"}),e.jsx("strong",{children:u?.roundData?.dice?.die2??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total"}),e.jsx("strong",{children:u?.roundData?.dice?.sum??u?.result??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State Before"}),e.jsx("span",{children:u?.roundData?.stateBefore||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"State After"}),e.jsx("span",{children:u?.roundData?.stateAfter||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point Before"}),e.jsx("span",{children:u?.roundData?.pointNumberBefore??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Point After"}),e.jsx("span",{children:u?.roundData?.pointNumberAfter??"—"})]})]}):u.game==="arabian"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Lines"}),e.jsx("strong",{children:u?.roundData?.lineCount??u?.bets?.lines??"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Coin Bet"}),e.jsx("strong",{children:H(u?.roundData?.coinBet??u?.bets?.coinBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Spin Bet"}),e.jsx("strong",{children:H(u?.roundData?.totalBet??u?.bets?.totalBet??u?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:H(u?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Win"}),e.jsx("strong",{children:H(u?.roundData?.bonusWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:u?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:u?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:u?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bonus Triggered"}),e.jsx("span",{children:u?.roundData?.bonusTriggered?"Yes":"No"})]})]}):u.game==="jurassic-run"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Bet Level"}),e.jsx("strong",{children:Number(u?.roundData?.betId??u?.bets?.betId??0)+1})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Spin Bet"}),e.jsx("strong",{children:H(u?.roundData?.bet??u?.bets?.bet??u?.totalWager??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Paylines"}),e.jsx("strong",{children:u?.roundData?.activePaylines??u?.bets?.paylines??"10"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Bet"}),e.jsx("strong",{children:H(u?.roundData?.lineBet??u?.bets?.lineBet??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Line Win"}),e.jsx("strong",{children:H(u?.roundData?.lineWin??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Payout"}),e.jsx("strong",{children:H(u?.roundData?.jackpotPayout??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot Before"}),e.jsx("strong",{children:H(u?.roundData?.jackpotBefore??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Jackpot After"}),e.jsx("strong",{children:H(u?.roundData?.jackpotAfter??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Before"}),e.jsx("span",{children:u?.roundData?.freeSpinsBefore??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins Awarded"}),e.jsx("span",{children:u?.roundData?.freeSpinsAwarded??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spins After"}),e.jsx("span",{children:u?.roundData?.freeSpinsAfter??"0"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Free Spin Round"}),e.jsx("span",{children:u?.roundData?.isFreeSpinRound?"Yes":"No"})]})]}):u.game==="3card-poker"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Ante Bet"}),e.jsx("strong",{children:H(u?.bets?.Ante??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Play Bet"}),e.jsx("strong",{children:H(u?.bets?.Play??(Number(u?.bets?.folded)===1?0:u?.bets?.Ante??0))})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Pair Plus Bet"}),e.jsx("strong",{children:H(u?.bets?.PairPlus??0)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Action"}),e.jsx("span",{children:Number(u?.bets?.folded)===1?"Folded":"Played"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Main Result"}),e.jsx("span",{children:u?.roundData?.mainResultLabel||u?.result||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:u?.playerHand||u?.roundData?.playerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:u?.dealerHand||u?.roundData?.dealerHand||"—"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:u?.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Outcome Source"}),e.jsx("span",{children:M(u?.outcomeSource)})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Player Cards"}),e.jsx("div",{className:"casino-card-list",children:(u.playerCards||[]).length>0?(u.playerCards||[]).map(c=>e.jsx("span",{className:"casino-card-chip",children:c},`3cp-p-${c}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer Cards"}),e.jsx("div",{className:"casino-card-list",children:(u.dealerCards||[]).length>0?(u.dealerCards||[]).map(c=>e.jsx("span",{className:"casino-card-chip",children:c},`3cp-d-${c}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Payout Breakdown"}),e.jsxs("div",{className:"casino-card-list",children:[e.jsxs("span",{className:"casino-card-chip",children:["Ante ",H(u?.roundData?.payoutBreakdown?.ante?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Play ",H(u?.roundData?.payoutBreakdown?.play?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Pair+ ",H(u?.roundData?.payoutBreakdown?.pairPlus?.returnAmount??0)]}),e.jsxs("span",{className:"casino-card-chip",children:["Ante Bonus ",H(u?.roundData?.payoutBreakdown?.anteBonus?.returnAmount??0)]})]})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:u.game==="baccarat"?`Player (${u.playerTotal})`:"Player"}),e.jsx("div",{className:"casino-card-list",children:(u.playerCards||[]).length>0?(u.playerCards||[]).map(c=>e.jsx("span",{className:"casino-card-chip",children:c},`p-${c}`)):e.jsx("span",{children:"—"})})]}),u.game==="baccarat"?e.jsxs("div",{className:"casino-detail-stack",children:[e.jsxs("span",{children:["Banker (",u.bankerTotal,")"]}),e.jsx("div",{className:"casino-card-list",children:(u.bankerCards||[]).length>0?(u.bankerCards||[]).map(c=>e.jsx("span",{className:"casino-card-chip",children:c},`b-${c}`)):e.jsx("span",{children:"—"})})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Up Card"}),e.jsx("strong",{children:u.dealerUpCard||"—"})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Dealer"}),e.jsx("div",{className:"casino-card-list",children:(u.dealerCards||[]).length>0?(u.dealerCards||[]).map(c=>e.jsx("span",{className:"casino-card-chip",children:c},`d-${c}`)):e.jsx("span",{children:"—"})})]})]})]})]}),u.game==="roulette"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Roulette Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Placed Bets"}),e.jsx("div",{className:"casino-card-list",children:xe(u).length>0?xe(u).map(c=>e.jsxs("span",{className:"casino-card-chip",children:[ee(c)," ",H(c.amount)]},String(c.key||`${c.type}-${c.value}`))):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Bets"}),e.jsx("div",{className:"casino-card-list",children:ne(u).length>0?ne(u).map(c=>e.jsxs("span",{className:"casino-card-chip",children:[ee(c)," ",H(c.amount)]},`win-${String(c.key||`${c.type}-${c.value}`)}`)):e.jsx("span",{children:"No winning bets"})})]})]}),u.game==="craps"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Craps Bets"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Active Bets Before Roll"}),e.jsx("div",{className:"casino-card-list",children:le(u).length>0?le(u).map(c=>e.jsxs("span",{className:"casino-card-chip",children:[c.key," ",H(c.amount)]},`craps-bet-${c.key}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Resolved Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.betDetails)&&u.betDetails.length>0?u.betDetails.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(c?.bet||"bet")," ",String(c?.outcome||"—")," ",H(c?.return)]},`craps-res-${W}`)):e.jsx("span",{children:"No resolved bets"})})]})]}),u.game==="arabian"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Arabian Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.roundData?.winningLines)&&u.roundData.winningLines.length>0?u.roundData.winningLines.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:["L",c?.line??"?"," x",c?.num_win??"?"," ",H(c?.amount??0)]},`arabian-line-${W}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Pattern"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.roundData?.pattern)&&u.roundData.pattern.length>0?u.roundData.pattern.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:["R",W+1,": ",Array.isArray(c)?c.join("-"):"—"]},`arabian-pattern-${W}`)):e.jsx("span",{children:"—"})})]})]}),u.game==="jurassic-run"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Jurassic Run Spin Data"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Winning Lines"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.roundData?.winningLines)&&u.roundData.winningLines.length>0?u.roundData.winningLines.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:["L",Number(c?.line??0)+1," x",c?.count??"?"," ",c?.symbol||"—"," ",c?.win?H(c.win):""]},`jurassic-line-${W}`)):e.jsx("span",{children:"No winning lines"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Reel Symbols"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.roundData?.symbols)&&u.roundData.symbols.length>0?u.roundData.symbols.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:["C",W+1,": ",Array.isArray(c)?c.join("-"):"—"]},`jurassic-col-${W}`)):e.jsx("span",{children:"—"})})]})]}),u.game==="blackjack"&&e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Blackjack Replay"}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Hands"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.betDetails?.hands)&&u.betDetails.hands.length>0?u.betDetails.hands.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(c?.zone||"hand")," ",String(c?.resultType||"—")," ",H(c?.bet)," → ",H(c?.return)]},`bj-hand-${W}`)):e.jsx("span",{children:"—"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Actions"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.betDetails?.actions)&&u.betDetails.actions.length>0?u.betDetails.actions.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(c?.action||"action")," ",c?.zone?`(${String(c.zone)})`:""]},`bj-action-${W}`)):e.jsx("span",{children:"No action log"})})]}),e.jsxs("div",{className:"casino-detail-stack",children:[e.jsx("span",{children:"Side Bets"}),e.jsx("div",{className:"casino-card-list",children:Array.isArray(u?.betDetails?.sideBets)&&u.betDetails.sideBets.length>0?u.betDetails.sideBets.map((c,W)=>e.jsxs("span",{className:"casino-card-chip",children:[String(c?.zone||"zone")," ",String(c?.type||"side")," ",H(c?.stake)," → ",H(c?.return)]},`bj-side-${W}`)):e.jsx("span",{children:"No side bets"})})]})]}),e.jsxs("section",{className:"casino-detail-card",children:[e.jsx("h4",{children:"Settlement"}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Wager"}),e.jsx("strong",{children:H(u.totalWager)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Total Return"}),e.jsx("strong",{children:H(u.totalReturn)})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Net"}),e.jsx("strong",{children:H(u.netResult)})]}),u.playerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Player Hand"}),e.jsx("span",{children:u.playerHand})]}),u.dealerHand&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Hand"}),e.jsx("span",{children:u.dealerHand})]}),u.dealerQualifies!==null&&u.dealerQualifies!==void 0&&e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Dealer Qualifies"}),e.jsx("span",{children:u.dealerQualifies?"Yes":"No"})]}),e.jsxs("div",{className:"casino-detail-row",children:[e.jsx("span",{children:"Integrity Hash"}),e.jsx("code",{children:u.integrityHash||"—"})]})]})]}),e.jsx("h4",{className:"casino-ledger-title",children:"Ledger Entries"}),e.jsx("div",{className:"casino-ledger-wrap",children:e.jsxs("table",{className:"casino-ledger-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Side"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Balance Before"}),e.jsx("th",{children:"Balance After"}),e.jsx("th",{children:"Time"})]})}),e.jsxs("tbody",{children:[(u.ledgerEntries||[]).map(c=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("span",{className:`casino-ledger-side ${String(c.entrySide||"").toUpperCase()==="DEBIT"?"side-debit":"side-credit"}`,children:c.entrySide||"—"})}),e.jsx("td",{children:c.type||"—"}),e.jsx("td",{children:H(c.amount)}),e.jsx("td",{children:H(c.balanceBefore)}),e.jsx("td",{children:H(c.balanceAfter)}),e.jsx("td",{children:O(c.createdAt)})]},c.id)),(u.ledgerEntries||[]).length===0&&e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"casino-ledger-empty",children:"No ledger entries found."})})]})]})})]})]})})]})}const Gc=Object.freeze(Object.defineProperty({__proto__:null,default:Yl},Symbol.toStringTag,{value:"Module"})),gs=t=>{const s=Number(t);return Number.isFinite(s)?s:0},ke=(t,s=0)=>{if(typeof t=="number")return Number.isFinite(t)?t:gs(s);if(typeof t=="string"){const n=t.trim();if(!n)return gs(s);const l=/^\(.*\)$/.test(n),d=n.replace(/^\((.*)\)$/,"$1").replace(/[^\d.+-]/g,"");if(!d||["+","-",".","+.","-."].includes(d))return gs(s);const g=Number(d);return Number.isFinite(g)?l&&g>0?-g:g:gs(s)}if(t==null||typeof t=="boolean")return gs(s);const a=Number(t);return Number.isFinite(a)?a:gs(s)},kt=t=>{const s=ke(t,0),a=Math.round(s);return Math.abs(a)<.5?"neutral":a<0?"neg":"pos"},Da=(t,s)=>String(t||"").localeCompare(String(s||""),void 0,{sensitivity:"base",numeric:!0}),Jl=new Set(["admin","agent","master_agent","super_agent"]),Ea=t=>{const s=String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!s)return"";const a=s.match(/^[A-Z]+/);return a&&a[0]?a[0]:s.replace(/\d+$/,"")||s},In=t=>!Jl.has(String(t?.role||"").trim().toLowerCase());function Ql({onViewChange:t}){const[s,a]=r.useState([]),[n,l]=r.useState([]),[d,g]=r.useState(!0),[y,f]=r.useState(""),[L,x]=r.useState(null),[w,p]=r.useState(null),[h,C]=r.useState(!1),[J,B]=r.useState(!1),[R,S]=r.useState(null),[v,_]=r.useState(""),[o,F]=r.useState(""),[D,u]=r.useState([]),[q,ge]=r.useState(!1),[G,k]=r.useState(!0),[se,j]=r.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:""}),[U,H]=r.useState("player"),[O,I]=r.useState("admin"),[oe,Te]=r.useState(!1),[z,M]=r.useState(!1),[ee,xe]=r.useState(null),[ne,le]=r.useState({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"0",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),[Ue,A]=r.useState(!1),[ie,c]=r.useState({customerId:null,username:"",currentBalance:0,nextBalance:""}),[W,de]=r.useState(""),[be,Ae]=r.useState(""),[we,Je]=r.useState(!1),[We,qe]=r.useState({}),[ot,Qe]=r.useState(null),[Ke,Re]=r.useState(null),[mt,xt]=r.useState({}),[it,ze]=r.useState(""),[Ze,ct]=r.useState(!1),[Xe,Ct]=r.useState(""),[m,$]=r.useState(""),[Z,me]=r.useState(!1),[Se,fe]=r.useState(""),[Ne,De]=r.useState({open:!1,type:"",customerId:null,username:"",value:""}),[Ge,wt]=r.useState(""),[Et,At]=r.useState("");r.useEffect(()=>{(async()=>{try{g(!0);const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!Y){a([]),f("Please login to load users.");return}const P=String(localStorage.getItem("userRole")||"").toLowerCase();let ae=null;try{ae=await es(Y,{timeoutMs:3e4})}catch(ue){console.warn("CustomerAdminView: getMe failed, falling back to stored role.",ue)}const te=String(ae?.role||P||"admin").toLowerCase();if(I(te),wt(ae?.username||""),At(ae?.id||""),Te(!!ae?.viewOnly),te==="agent"){const[ue,he]=await Promise.all([Is(Y),Zt(Y).catch(()=>[])]);a(ue||[]),l(he||[])}else{const[ue,he]=await Promise.all([cs(Y),Zt(Y)]);a(ue||[]),l(he||[])}if(f(""),ae?.username)try{const ue=Ea(ae.username);if(!ue)return;const{nextUsername:he}=await Ot(ue,Y,{type:"player"});j($e=>({...$e,username:he}))}catch(ue){console.error("Failed to prefetch next username:",ue)}}catch(Y){console.error("Error fetching users:",Y),f("Failed to load users: "+Y.message)}finally{g(!1)}})()},[]);const tt=async N=>{const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!Y)return;j(te=>({...te,agentId:N,referredByUserId:""}));const P=U==="player"?"player":"agent",ae=U==="super_agent"?"MA":"";if(N){const te=n.find(ue=>ue.id===N);if(te){$(te.username||"");try{const ue=Ea(te.username);if(!ue){j(at=>({...at,username:""}));return}const he=P==="player"?{suffix:ae,type:P,agentId:N}:{suffix:ae,type:P,...U==="agent"?{agentId:N}:{}},{nextUsername:$e}=await Ot(ue,Y,he);j(at=>({...at,username:$e,agentPrefix:ue}))}catch(ue){console.error("Failed to get next username:",ue)}}}else if($(""),Ge)try{const te=Ea(Ge);if(!te){j($e=>({...$e,username:""}));return}const ue={suffix:ae,type:P};P==="agent"&&U==="agent"&&(O==="master_agent"||O==="super_agent")&&Et&&(ue.agentId=Et);const{nextUsername:he}=await Ot(te,Y,ue);j($e=>({...$e,username:he,agentPrefix:te}))}catch(te){console.error("Failed to fetch username for admin:",te),j(ue=>({...ue,username:""}))}else j(te=>({...te,username:""}))},Nt=N=>{if(N==null||N==="")return"—";const Y=ke(N,NaN);return Number.isNaN(Y)?"—":`$${Math.round(Y).toLocaleString("en-US")}`};!oe&&!h&&String(se.username||"").trim()&&String(se.firstName||"").trim()&&String(se.lastName||"").trim()&&String(se.phoneNumber||"").trim()&&String(se.password||"").trim()&&(U!=="player"||String(se.minBet??"").trim()!==""&&String(se.maxBet??"").trim()!==""&&String(se.creditLimit??"").trim()!==""&&String(se.balanceOwed??"").trim());const _t=N=>{const Y=ke(N.balance,0);c({customerId:N.id,username:N.username,currentBalance:Y,nextBalance:`${Y}`}),A(!0),f("")},Tt=async N=>{N.preventDefault();const{customerId:Y,nextBalance:P}=ie,ae=Number(P);if(Number.isNaN(ae)||ae<0){f("Balance must be a non-negative number.");return}try{const te=localStorage.getItem("token")||sessionStorage.getItem("token");if(!te){f("Please login to update balance.");return}p(Y),O==="agent"?await Aa(Y,ae,te):await js(Y,{balance:ae},te),a(ue=>ue.map(he=>he.id===Y?{...he,balance:ae,availableBalance:Math.max(0,ae-ke(he.pendingBalance,0))}:he)),A(!1),f("")}catch(te){console.error("Balance update failed:",te),f(te.message||"Failed to update balance")}finally{p(null)}},St=N=>{const Y=N.id,P={sports:N.settings?.sports??!0,casino:N.settings?.casino??!0,racebook:N.settings?.racebook??!0};return We[Y]||P},Mt=(N,Y)=>{const P=N.id,ae=St(N);qe(te=>({...te,[P]:{...ae,[Y]:!ae[Y]}}))},ts=async N=>{const Y=N.id,P=We[Y];if(P)try{const ae=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ae)return;p(Y);const te={settings:{...N.settings||{},sports:!!P.sports,casino:!!P.casino,racebook:!!P.racebook}};O==="agent"?await Ft(Y,te,ae):await Ut(Y,te,ae),a(ue=>ue.map(he=>he.id===Y?{...he,settings:te.settings}:he)),qe(ue=>{const he={...ue};return delete he[Y],he}),f("")}catch(ae){console.error("Addon save failed:",ae),f(ae.message||"Failed to save add-ons")}finally{p(null)}},ss=async N=>{const Y=N.id,P=window.prompt(`Enter new password for ${N.username}:`,"");if(P===null)return;const ae=P.toUpperCase();if(ae.length<6){alert("Password must be at least 6 characters long");return}try{const te=localStorage.getItem("token")||sessionStorage.getItem("token");if(!te){f("Please login to reset password.");return}p(Y),await La(Y,ae,te),a(ue=>ue.map(he=>he.id===Y?{...he,displayPassword:ae}:he)),alert(`Password for ${N.username} has been reset successfully.`),f("")}catch(te){console.error("Password reset failed:",te),f(te.message||"Failed to reset password")}finally{p(null)}},It=N=>{xe(N),le({phoneNumber:"",firstName:"",lastName:"",fullName:"",password:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",apps:{venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}}),M(!0)},Lt=async N=>{N.preventDefault();const Y=ee.id;try{const P=localStorage.getItem("token")||sessionStorage.getItem("token"),ae={};ne.phoneNumber.trim()&&(ae.phoneNumber=ne.phoneNumber.trim()),ne.firstName.trim()&&(ae.firstName=ne.firstName.trim()),ne.lastName.trim()&&(ae.lastName=ne.lastName.trim()),ne.fullName.trim()&&(ae.fullName=ne.fullName.trim()),ne.password.trim()&&(ae.password=ne.password.trim()),ne.minBet!==""&&(ae.minBet=Number(ne.minBet)),ne.maxBet!==""&&(ae.maxBet=Number(ne.maxBet)),ne.creditLimit!==""&&(ae.creditLimit=Number(ne.creditLimit)),ne.balanceOwed!==""&&(ae.balanceOwed=Number(ne.balanceOwed));const te=Object.entries(ne.apps||{}).filter(([,ue])=>(ue||"").trim()!=="");if(te.length>0&&(ae.apps=Object.fromEntries(te.map(([ue,he])=>[ue,he.trim()]))),Object.keys(ae).length===0){f("Enter at least one value before saving.");return}O==="agent"?await Ft(Y,ae,P):await Ut(Y,ae,P),a(ue=>ue.map(he=>he.id===Y?{...he,...ae}:he)),M(!1),f("")}catch(P){console.error("Update customer failed:",P),f(P.message||"Failed to update customer")}},ft=r.useMemo(()=>n.filter(N=>O==="admin"||O==="super_agent"||O==="master_agent"),[n,O]);r.useEffect(()=>{if(U!=="player")return;const N=String(m||"").trim().toLowerCase();if(!N)return;const Y=ft.find(ae=>String(ae.username||"").trim().toLowerCase()===N);if(!Y)return;const P=String(Y.id||"");P&&String(se.agentId||"")!==P&&tt(P)},[m,ft,U,se.agentId]);const ht=N=>{if(!N)return"";if(typeof N=="string")return N;if(typeof N=="object"){if(typeof N.id=="string")return N.id;if(typeof N.$oid=="string")return N.$oid}return""};r.useMemo(()=>ft.filter(N=>m.trim()?(N.username||"").toLowerCase().includes(m.trim().toLowerCase()):!0),[ft,m]);const as=r.useMemo(()=>ft.filter(N=>it.trim()?(N.username||"").toLowerCase().includes(it.trim().toLowerCase()):!0),[ft,it]),ns=r.useMemo(()=>s.filter(In),[s]),$t=r.useMemo(()=>Xa(ns),[ns]),T=ft.find(N=>ht(N.id)===ht(Xe)),E=!!T&&(T.role==="master_agent"||T.role==="super_agent"),ye=ht(Xe),V=r.useMemo(()=>!E||!ye?[]:ft.filter(N=>{if((N.role||"").toLowerCase()!=="agent")return!1;const Y=ht(N.createdBy),P=ht(N.parentAgentId),ae=ye;return Y===ae||P===ae}),[E,ft,ye]),Ee=r.useMemo(()=>{let N=$t;if(Xe)if(!E)N=$t.filter(ae=>ht(ae.agentId)===ye);else{const ae=new Set(V.map(te=>ht(te.id)).filter(Boolean));N=$t.filter(te=>ae.has(ht(te.agentId)))}const Y=new Set(D.map(ae=>String(ae).toUpperCase()));return[...!q||D.length===0?N:N.filter(ae=>Y.has(String(ae.username||"").toUpperCase()))].sort((ae,te)=>Da(String(ae?.username||""),String(te?.username||"")))},[Xe,E,$t,V,ye,q,D]),Be=r.useMemo(()=>{const N=String(Ge||"").trim().toUpperCase();return O==="admin"?"ADMIN":O==="master_agent"||O==="super_agent"?N||"MASTER":O==="agent"?N||"AGENT":""},[Ge,O]),Ve=r.useMemo(()=>{const N=new Map;ft.forEach(ue=>{const he=ht(ue.id);he&&N.set(he,ue)});const Y=ue=>{const he=ht(ue?.agentId);if(!he)return"UNASSIGNED";const $e=[];let at=he;const yt=new Set;for(;at&&!yt.has(at);){yt.add(at);const Ns=N.get(at);if(!Ns)break;const Us=String(Ns.username||"").trim().toUpperCase();Us&&$e.push(Us);const tn=String(Ns.createdByModel||""),Ws=ht(Ns.createdBy);if(tn!=="Agent"||!Ws)break;at=Ws}const Ht=$e.reverse().filter(Boolean);return Ht.length===0?Be?`${Be} / UNASSIGNED`:"UNASSIGNED":Be&&Ht[0]!==Be?`${Be} / ${Ht.join(" / ")}`:Ht.join(" / ")},P=new Map;Ee.forEach(ue=>{const he=Y(ue);P.has(he)||P.set(he,[]),P.get(he).push(ue)});const ae=Array.from(P.entries()).sort(([ue],[he])=>Da(ue,he)),te=[];return ae.forEach(([ue,he])=>{te.push({type:"group",label:ue}),[...he].sort(($e,at)=>Da(String($e?.username||""),String(at?.username||""))).forEach($e=>te.push({type:"player",player:$e,hierarchyPath:ue}))}),te},[ft,Ee,Be]),Pe=Ee,Oe=N=>{de(N),Ae(""),Je(!0)},Ie=()=>{switch(W){case"minBet":return"Min Bet";case"maxBet":return"Max Bet";case"creditLimit":return"Credit Limit";case"settleLimit":return"Settle Limit";case"balanceAdjust":return"Balance Adjustment";case"status":return"Status";default:return""}},dt=N=>{const Y=(N||"").toString().toLowerCase();return Y==="active"?"Active":Y==="read_only"||Y==="readonly"?"Read Only":"Disabled"},Pt=async N=>{N.preventDefault();const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!Y){f("Please login to update players.");return}if(Pe.length===0){f("No players available for bulk update.");return}let P=null;const ae=new Set(Pe.map(te=>te.id));if(W==="status")P={status:be||"active"};else if(W==="balanceAdjust"){const te=Number(be);if(Number.isNaN(te)){f("Please enter a valid number for balance adjustment.");return}p("bulk-update"),await Promise.all(Pe.map(ue=>{const he=ue.id,$e=ke(ue.balance,0)+te;return O==="agent"?Aa(he,$e,Y):js(he,{balance:$e},Y)})),a(ue=>ue.map(he=>{const $e=he.id;return ae.has($e)?{...he,balance:ke(he.balance,0)+te}:he})),Je(!1),f(""),p(null);return}else{const te=Number(be);if(Number.isNaN(te)||te<0){f("Please enter a valid non-negative number.");return}W==="minBet"&&(P={minBet:te}),W==="maxBet"&&(P={maxBet:te,wagerLimit:te}),W==="creditLimit"&&(P={creditLimit:te}),W==="settleLimit"&&(P={balanceOwed:te})}try{p("bulk-update"),await Promise.all(Pe.map(te=>{const ue=te.id;return O==="agent"?Ft(ue,P,Y):Ut(ue,P,Y)})),a(te=>te.map(ue=>{const he=ue.id;return ae.has(he)?{...ue,...P}:ue})),Je(!1),f("")}catch(te){console.error("Bulk update failed:",te),f(te.message||"Failed to update players")}finally{p(null)}},st=(()=>{const N=s.filter(In);return U!=="player"&&U!=="agent"&&U!=="super_agent"?[]:O==="agent"?N:se.agentId?N.filter(Y=>String(Y.agentId?.id||Y.agentId||"")===String(se.agentId)):N})(),bt=r.useMemo(()=>st.map(N=>{const Y=String(N.id||"").trim(),P=String(N.username||"").trim(),ae=String(N.fullName||"").trim();if(!Y||!P)return null;const te=`${P.toUpperCase()}${ae?` - ${ae}`:""}`;return{id:Y,label:te,labelLower:te.toLowerCase(),usernameLower:P.toLowerCase()}}).filter(Boolean),[st]),pt=r.useMemo(()=>{const N=String(se.referredByUserId||"").trim();return N&&bt.find(Y=>Y.id===N)||null},[se.referredByUserId,bt]);r.useEffect(()=>{if(pt){fe(pt.label);return}String(se.referredByUserId||"").trim()||fe("")},[pt,se.referredByUserId]);const gt=N=>{t&&t("user-details",N.id)},jt=async N=>{const Y=N.role==="agent"||N.role==="master_agent",P=Y?"Agent":"Player",ae=window.prompt(`🚨 DELETE ${P.toUpperCase()} WARNING 🚨

You are about to delete ${P} "${N.username}".

This will remove them from all active lists.

To confirm, type the username exactly: ${N.username}`);if(ae!==null){if(ae.trim().toUpperCase()!==String(N.username).trim().toUpperCase()){alert("Username did not match. Deletion cancelled.");return}try{const te=localStorage.getItem("token")||sessionStorage.getItem("token");if(!te){f("Please login to delete.");return}p(N.id),Y?await Al(N.id,te):await Cl(N.id,te),a(ue=>ue.filter(he=>he.id!==N.id)),Y&&l(ue=>ue.filter(he=>he.id!==N.id)),alert(`${P} "${N.username}" deleted successfully.`),f("")}catch(te){console.error("Delete failed:",te),alert(`Failed to delete: ${te.message}`)}finally{p(null)}}},ut=N=>{const Y=N.id;return mt[Y]||{firstName:N.firstName||"",lastName:N.lastName||"",password:"",minBet:String(N.minBet??0),maxBet:String(N.maxBet??N.wagerLimit??0),creditLimit:String(N.creditLimit??0),settleLimit:String(N.balanceOwed??0),status:(N.status||"active").toLowerCase(),sports:N.settings?.sports??!0,casino:N.settings?.casino??!0,racebook:N.settings?.racebook??!0}},rs=N=>{const Y=N.id;Qe(P=>P===Y?null:Y),Re(P=>P===Y?null:P)},nt=N=>{const Y=N.id;Qe(Y),Re(Y),xt(P=>({...P,[Y]:ut(N)}))},Dt=(N,Y,P)=>{const ae=N.id,te=ut(N);xt(ue=>({...ue,[ae]:{...te,...ue[ae]||{},[Y]:P}}))},ms=async N=>{const Y=N.id,P=ut(N),ae=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ae)return;const te={firstName:P.firstName.trim(),lastName:P.lastName.trim(),fullName:`${P.firstName.trim()} ${P.lastName.trim()}`.trim(),minBet:Number(P.minBet||0),maxBet:Number(P.maxBet||0),wagerLimit:Number(P.maxBet||0),creditLimit:Number(P.creditLimit||0),balanceOwed:Number(P.settleLimit||0),status:P.status,settings:{...N.settings||{},sports:!!P.sports,casino:!!P.casino,racebook:!!P.racebook}};try{if(p(Y),O==="agent"?await Ft(Y,te,ae):await Ut(Y,te,ae),(P.password||"").trim()!==""){const ue=P.password.trim().toUpperCase();O==="admin"?await La(Y,ue,ae):await Ft(Y,{password:ue},ae)}a(ue=>ue.map(he=>he.id===Y?{...he,...te,...P.password.trim()!==""?{displayPassword:P.password.trim().toUpperCase()}:{}}:he)),Re(null),xt(ue=>{const he={...ue};return delete he[Y],he}),f("")}catch(ue){console.error("Inline save failed:",ue),f(ue.message||"Failed to save user details")}finally{p(null)}},ws=(N,Y)=>{const P=N.id;let ae="";Y==="name"&&(ae=`${N.firstName||""} ${N.lastName||""}`.trim()),Y==="password"&&(ae=N.displayPassword||""),Y==="balance"&&(ae=String(N.balance??0)),De({open:!0,type:Y,customerId:P,username:N.username,value:ae})},_s=async N=>{N.preventDefault();const Y=localStorage.getItem("token")||sessionStorage.getItem("token");if(!(!Y||!Ne.customerId))try{if(p(Ne.customerId),Ne.type==="name"){const P=Ne.value.trim().split(/\s+/).filter(Boolean),ae=P[0]||"",te=P.slice(1).join(" "),ue={firstName:ae,lastName:te,fullName:Ne.value.trim()};O==="agent"?await Ft(Ne.customerId,ue,Y):await Ut(Ne.customerId,ue,Y),a(he=>he.map($e=>$e.id===Ne.customerId?{...$e,...ue}:$e))}if(Ne.type==="password"){const P=Ne.value.trim().toUpperCase();if(P.length<6){f("Password must be at least 6 characters.");return}O==="admin"?await La(Ne.customerId,P,Y):await Ft(Ne.customerId,{password:P},Y),a(ae=>ae.map(te=>te.id===Ne.customerId?{...te,displayPassword:P}:te))}if(Ne.type==="balance"){const P=Number(Ne.value);if(Number.isNaN(P)){f("Balance must be numeric.");return}O==="agent"?await Aa(Ne.customerId,P,Y):await js(Ne.customerId,{balance:P},Y),a(ae=>ae.map(te=>te.id===Ne.customerId?{...te,balance:P}:te))}De({open:!1,type:"",customerId:null,username:"",value:""}),f("")}catch(P){console.error("Quick edit failed:",P),f(P.message||"Failed to update value")}finally{p(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Administration Console"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"},children:e.jsxs("div",{className:"agent-search-picker header-agent-picker",onFocus:()=>ct(!0),onBlur:()=>setTimeout(()=>ct(!1),120),tabIndex:0,children:[e.jsxs("div",{className:"agent-search-head",children:[e.jsx("span",{className:"agent-search-label",children:"Agents"}),e.jsx("input",{type:"text",value:it,onChange:N=>{ze(N.target.value),ct(!0)},placeholder:"Search agent..."})]}),Ze&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${Xe?"":"selected"}`,onClick:()=>{Ct(""),ze(""),ct(!1)},children:e.jsx("span",{children:"All Agents"})}),as.map(N=>{const Y=N.id,P=N.role==="master_agent"||N.role==="super_agent";return e.jsxs("button",{type:"button",className:`agent-search-item ${String(Xe||"")===String(Y)?"selected":""}`,onClick:()=>{Ct(Y),ze(N.username||""),ct(!1)},children:[e.jsx("span",{children:N.username}),e.jsx("span",{className:`agent-type-badge ${P?"master":"agent"}`,children:P?"M":"A"})]},Y)}),as.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching agents"})]})]})})]}),e.jsxs("div",{className:"view-content",children:[d&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading Entries..."})]}),y&&e.jsx("div",{className:"error-state",children:y}),L&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:L.message}),L.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:L.matches.map((N,Y)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(N.username||"UNKNOWN")}),e.jsx("span",{children:String(N.fullName||"No name")}),e.jsx("span",{children:String(N.phoneNumber||"No phone")})]},`${N.id||N.username||"duplicate"}-${Y}`))})]}),o&&e.jsx("div",{className:"success-state",children:o}),D.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",D.slice(0,20).join(", "),D.length>20?` (+${D.length-20} more)`:"",e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"12px",padding:"6px 10px"},onClick:()=>ge(N=>!N),children:q?"Show All Players":"Show Imported Only"})]}),!d&&e.jsxs(e.Fragment,{children:[!1,e.jsx("div",{className:"table-container",children:e.jsx("div",{className:"scroll-wrapper",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Password"}),e.jsx("th",{children:"Name"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("minBet"),children:"Min Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("maxBet"),children:"Max Bet"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("creditLimit"),children:"Credit Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("settleLimit"),children:"Settle Limit"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("balanceAdjust"),children:"Balance"}),e.jsx("th",{children:"Lifetime"}),e.jsx("th",{className:"clickable-col-head",onClick:()=>Oe("status"),children:"Status"}),e.jsx("th",{children:"Sportsbook"}),e.jsx("th",{children:"Casino"}),e.jsx("th",{children:"Horses"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:Ve.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:14,className:"empty-msg",children:"No records found."})}):Ve.map((N,Y)=>{if(N.type==="group")return e.jsx("tr",{className:"agent-group-row",children:e.jsx("td",{colSpan:14,children:N.label})},`group-${N.label}-${Y}`);const P=N.player,ae=P.id,te=St(P),ue=!!We[ae],he=ot===ae,$e=Ke===ae,at=ut(P);return e.jsxs(Ka.Fragment,{children:[e.jsxs("tr",{className:`customer-row role-${P.role} ${P.isDuplicatePlayer?"is-duplicate-player":""}`,children:[e.jsxs("td",{className:"user-cell",children:[e.jsxs("div",{className:"user-cell-main",children:[e.jsx("button",{className:"user-link-btn",onClick:()=>gt(P),children:e.jsx("span",{className:"customer-username",children:P.username.toUpperCase()})}),P.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-player-badge",children:"Duplicate Player"}),e.jsx("span",{className:"customer-tree-path",children:String(N.hierarchyPath||"UNASSIGNED").toUpperCase()})]}),P.role==="user"&&e.jsx("button",{className:"row-expand-btn",type:"button",onClick:()=>rs(P),children:he?"⌄":"›"})]}),e.jsx("td",{className:"pass-cell",children:e.jsx("span",{children:P.displayPassword||"—"})}),e.jsx("td",{children:`${P.firstName||""} ${P.lastName||""}`.trim()||"—"}),e.jsx("td",{children:ke(P.minBet,0).toLocaleString("en-US")}),e.jsx("td",{children:ke(P.maxBet??P.wagerLimit,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:ke(P.creditLimit??1e3,0).toLocaleString("en-US")}),e.jsx("td",{className:"highlight-cell",children:ke(P.balanceOwed,0).toLocaleString("en-US")}),e.jsx("td",{className:`balance-cell ${kt(P.balance)}`,children:Nt(P.balance)}),e.jsx("td",{children:ke(P.lifetime,0).toLocaleString("en-US")}),e.jsx("td",{children:dt(P.status)}),e.jsx("td",{children:P.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!te.sports,onChange:()=>Mt(P,"sports")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:P.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!te.casino,onChange:()=>Mt(P,"casino")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:P.role==="user"?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!te.racebook,onChange:()=>Mt(P,"racebook")}),e.jsx("span",{className:"slider-mini"})]}):"—"}),e.jsx("td",{children:e.jsxs("div",{className:"action-buttons-cell",style:{display:"flex",gap:"8px"},children:[P.role==="user"?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:`btn-secondary ${ue?"btn-save-dirty":"btn-save-clean"}`,type:"button",onClick:()=>ts(P),disabled:!ue||w===ae,children:"Save"}),e.jsx("button",{className:"btn-secondary",type:"button",onClick:()=>$e?ms(P):nt(P),disabled:w===ae,children:$e?"SAVE":"EDIT"})]}):e.jsx("button",{className:"btn-icon",title:"Edit Customer",onClick:()=>It(P),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),O==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>jt(P),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]})})]}),P.role==="user"&&he&&e.jsx("tr",{className:"expanded-detail-row",children:e.jsx("td",{colSpan:14,children:e.jsxs("div",{className:`expanded-detail-grid ${$e?"is-editing":""}`,children:[e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Password"}),e.jsx("span",{children:P.displayPassword||"—"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Name"}),e.jsxs("span",{children:[`${P.firstName||""} ${P.lastName||""}`.trim()||"—"," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>ws(P,"name"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Min Bet"}),e.jsx("span",{children:$e?e.jsx("input",{type:"number",value:at.minBet,onChange:yt=>Dt(P,"minBet",yt.target.value)}):`$${ke(P.minBet,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Bet"}),e.jsx("span",{children:$e?e.jsx("input",{type:"number",value:at.maxBet,onChange:yt=>Dt(P,"maxBet",yt.target.value)}):`$${ke(P.maxBet??P.wagerLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Credit Limit"}),e.jsx("span",{children:$e?e.jsx("input",{type:"number",value:at.creditLimit,onChange:yt=>Dt(P,"creditLimit",yt.target.value)}):`$${ke(P.creditLimit,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Settle Limit"}),e.jsx("span",{children:$e?e.jsx("input",{type:"number",value:at.settleLimit,onChange:yt=>Dt(P,"settleLimit",yt.target.value)}):`$${ke(P.balanceOwed,0).toLocaleString("en-US")}`})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Balance"}),e.jsxs("span",{className:kt(P.balance),children:[Nt(P.balance)," ",e.jsx("button",{type:"button",className:"link-edit-btn",onClick:()=>ws(P,"balance"),children:"change"})]})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Lifetime"}),e.jsx("span",{children:ke(P.lifetime,0).toLocaleString("en-US")})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Pending"}),e.jsx("span",{children:Nt(P.pendingBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Available"}),e.jsx("span",{children:Nt(P.availableBalance??P.balance??0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"FP Balance"}),e.jsx("span",{children:Nt(P.freeplayBalance||0)})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Parlay Max Payout"}),e.jsx("span",{children:"$6,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Status"}),e.jsx("span",{children:$e?e.jsxs("select",{value:at.status,onChange:yt=>Dt(P,"status",yt.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):dt(P.status)})]})]}),e.jsxs("div",{className:"detail-card",children:[e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Contest Payout"}),e.jsx("span",{children:"$5,000"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Max Soccer Wager"}),e.jsx("span",{children:"$0"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Sportsbook"}),e.jsx("span",{children:$e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!at.sports,onChange:()=>Dt(P,"sports",!at.sports)}),e.jsx("span",{className:"slider-mini"})]}):P.settings?.sports??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Casino"}),e.jsx("span",{children:$e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!at.casino,onChange:()=>Dt(P,"casino",!at.casino)}),e.jsx("span",{className:"slider-mini"})]}):P.settings?.casino??!0?"On":"Off"})]}),e.jsxs("div",{className:"detail-line",children:[e.jsx("span",{children:"Horses"}),e.jsx("span",{children:$e?e.jsxs("label",{className:"switch-mini",children:[e.jsx("input",{type:"checkbox",checked:!!at.racebook,onChange:()=>Dt(P,"racebook",!at.racebook)}),e.jsx("span",{className:"slider-mini"})]}):P.settings?.racebook??!0?"On":"Off"})]})]})]})})})]},ae)})})]})})}),z&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit ",ee?.role==="user"?"Player":ee?.role==="agent"?"Agent":"Master Agent",": ",ee?.username]}),e.jsxs("form",{onSubmit:Lt,children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:ne.firstName,onChange:N=>le({...ne,firstName:N.target.value}),placeholder:ee?.firstName||"First name"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:ne.lastName,onChange:N=>le({...ne,lastName:N.target.value}),placeholder:ee?.lastName||"Last name"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:ne.phoneNumber,onChange:N=>le({...ne,phoneNumber:N.target.value}),placeholder:ee?.phoneNumber||"Phone number"})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:ne.minBet,onChange:N=>le({...ne,minBet:N.target.value}),placeholder:`${ee?.minBet??25}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:ne.maxBet,onChange:N=>le({...ne,maxBet:N.target.value}),placeholder:`${ee?.maxBet??200}`})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:ne.creditLimit,onChange:N=>le({...ne,creditLimit:N.target.value}),placeholder:`${ee?.creditLimit??1e3}`})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Settle Limit:"}),e.jsx("input",{type:"number",value:ne.balanceOwed,onChange:N=>le({...ne,balanceOwed:N.target.value}),placeholder:`${ee?.balanceOwed??0}`})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:ne.password,onChange:N=>le({...ne,password:N.target.value.toUpperCase()})})]}),e.jsxs("div",{className:"action-buttons",children:[e.jsx("button",{className:"btn-icon",title:"View Details",onClick:()=>gt(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"}),e.jsx("circle",{cx:"12",cy:"12",r:"3"})]})}),e.jsx("button",{className:"btn-icon",title:"Detailed View (Edit)",onClick:()=>It(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("path",{d:"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"}),e.jsx("path",{d:"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"})]})}),e.jsx("button",{className:"btn-icon",title:"Adjust Balance / Settle",onClick:()=>_t(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("line",{x1:"12",y1:"1",x2:"12",y2:"23"}),e.jsx("path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"})]})}),e.jsx("button",{className:"btn-icon",title:"Reset Password",onClick:()=>ss(ee),children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("rect",{x:"3",y:"11",width:"18",height:"11",rx:"2",ry:"2"}),e.jsx("path",{d:"M7 11V7a5 5 0 0 1 10 0v4"})]})}),O==="admin"&&e.jsx("button",{className:"btn-icon delete-btn",title:"Delete Customer",onClick:()=>jt(ee),style:{color:"#ff4d4d"},children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round",children:[e.jsx("polyline",{points:"3 6 5 6 21 6"}),e.jsx("path",{d:"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"})]})})]}),e.jsxs("div",{className:"payment-apps-section",children:[e.jsx("h4",{className:"section-title",style:{color:"#0d3b5c",marginBottom:"15px"},children:"Payment Apps"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Venmo"}),e.jsx("input",{type:"text",value:ne.apps.venmo,onChange:N=>le({...ne,apps:{...ne.apps,venmo:N.target.value}}),placeholder:"@username"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Cashapp"}),e.jsx("input",{type:"text",value:ne.apps.cashapp,onChange:N=>le({...ne,apps:{...ne.apps,cashapp:N.target.value}}),placeholder:"$cashtag"})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"20px"},children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Apple Pay"}),e.jsx("input",{type:"text",value:ne.apps.applePay,onChange:N=>le({...ne,apps:{...ne.apps,applePay:N.target.value}}),placeholder:"Phone/Email"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Zelle"}),e.jsx("input",{type:"text",value:ne.apps.zelle,onChange:N=>le({...ne,apps:{...ne.apps,zelle:N.target.value}}),placeholder:"Phone/Email"})]})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>M(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-secondary",style:{marginLeft:"auto",backgroundColor:"#17a2b8",color:"white"},onClick:()=>{const N=ne.password||"N/A",Y=`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${ne.username||ee.username}
Password: ${N}
Min bet: $${ne.minBet}
Max bet: $${ne.maxBet}
Credit: $${ne.creditLimit}


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
`;navigator.clipboard.writeText(Y).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]})]})]})}),we&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Ie()]}),e.jsxs("form",{onSubmit:Pt,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Ie()}),W==="status"?e.jsxs("select",{value:be,onChange:N=>Ae(N.target.value),required:!0,children:[e.jsx("option",{value:"",children:"Select status"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}):e.jsx("input",{type:"number",step:"1",min:W==="balanceAdjust"?void 0:"0",value:be,onChange:N=>Ae(N.target.value),placeholder:W==="balanceAdjust"?"Enter + / - amount":"Enter amount",required:!0})]}),e.jsx("p",{className:"bulk-edit-hint",children:W==="balanceAdjust"?"This adds or subtracts from balance for all players shown in the current list.":"This updates all players shown in the current list."}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:w==="bulk-update",children:w==="bulk-update"?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>Je(!1),children:"Cancel"})]})]})]})}),Ne.open&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content bulk-edit-modal",children:[e.jsxs("h3",{children:["Edit ",Ne.type==="name"?"Name":Ne.type==="password"?"Password":"Balance",": ",Ne.username]}),e.jsxs("form",{onSubmit:_s,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:Ne.type==="name"?"Name":Ne.type==="password"?"Password":"Balance"}),e.jsx("input",{type:Ne.type==="balance"?"number":"text",value:Ne.value,onChange:N=>De(Y=>({...Y,value:Ne.type==="password"?N.target.value.toUpperCase():N.target.value})),autoFocus:!0,required:!0})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:w===Ne.customerId,children:w===Ne.customerId?"Saving...":"Save"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>De({open:!1,type:"",customerId:null,username:"",value:""}),children:"Cancel"})]})]})]})}),Ue&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-glass-content",children:[e.jsxs("h3",{children:["Adjust Balance: ",ie.username]}),e.jsxs("form",{onSubmit:Tt,children:[e.jsxs("div",{className:"premium-field-info",children:[e.jsx("label",{children:"Current Net Balance"}),e.jsx("div",{className:`large-val ${kt(ie.currentBalance)}`,children:Nt(ie.currentBalance)})]}),e.jsxs("div",{className:"p-field",children:[e.jsx("label",{children:"New Net Balance"}),e.jsxs("div",{className:"input-with-symbol",children:[e.jsx("span",{className:"sym",children:"$"}),e.jsx("input",{type:"number",step:"0.01",value:ie.nextBalance,onChange:N=>c({...ie,nextBalance:N.target.value}),autoFocus:!0,required:!0})]}),e.jsx("small",{className:"field-hint",children:"Setting a new net balance will adjust the credit/owed amount accordingly."})]}),e.jsxs("div",{className:"modal-premium-actions",children:[e.jsx("button",{type:"submit",className:"btn-save-premium",disabled:w!==null,children:w!==null?"Updating...":"Confirm Adjustment"}),e.jsx("button",{type:"button",className:"btn-cancel-premium",onClick:()=>A(!1),children:"Cancel"})]})]})]})}),e.jsx("style",{children:`
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

      `})]})]})]})}const Yc=Object.freeze(Object.defineProperty({__proto__:null,default:Ql},Symbol.toStringTag,{value:"Module"})),na=t=>{const s=Number(t);return Number.isFinite(s)?Math.round(s*100)/100:0},Kl=t=>{const s=Number(t);return Number.isFinite(s)?Math.round(s*1e4)/1e4:0},Ma=(t,s)=>{const a=Number(t);return Number.isFinite(a)?a:s},xr=(t,s)=>{const a=t&&typeof t=="object"&&t.settings&&typeof t.settings=="object"?t.settings:{},n=a.freePlayPercent??t?.freePlayPercent??20,l=Kl(Math.max(0,Ma(n,20))),d=na(Math.max(0,Ma(s,0))),g=a.maxFpCredit??t?.maxFpCredit??null,y=g===null?0:Ma(g,0),f=g===null||y<=0,L=na(Math.max(0,y)),x=na(d*(l/100));let w=0;return l>0&&x>0&&(f?w=x:L>0&&(w=Math.min(x,L))),{bonusAmount:na(Math.max(0,w)),percent:l,cap:L,depositAmount:d,unlimited:f}},Zl=[{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdraw"},{value:"credit_adj",label:"Credit Adj"},{value:"debit_adj",label:"Debit Adj"},{value:"fp_deposit",label:"FP Deposit"}],Xl=10,eo=(t=new Date)=>{const s=new Date(t);if(Number.isNaN(s.getTime()))return"";const a=s.getFullYear(),n=String(s.getMonth()+1).padStart(2,"0"),l=String(s.getDate()).padStart(2,"0");return`${a}-${n}-${l}`},ia={deposit:"Customer Deposit",withdrawal:"Customer Withdrawal",credit_adj:"Customer Credit Adjustment",debit_adj:"Customer Debit Adjustment",fp_deposit:"Customer Freeplay Deposit"},Ba=(t,s="")=>({id:t,agentId:s,searchQuery:"",selectedUserId:"",type:"deposit",applyDepositFreeplayBonus:!0,amount:"",figureDate:eo(),description:ia.deposit,searchOpen:!1,busy:!1,error:""});function to(){const[t,s]=r.useState("admin"),[a,n]=r.useState([]),[l,d]=r.useState([]),[g,y]=r.useState("manual"),[f,L]=r.useState(""),[x,w]=r.useState({}),[p,h]=r.useState(()=>Array.from({length:Xl},(A,ie)=>Ba(`manual-${ie+1}`))),[C,J]=r.useState({}),[B,R]=r.useState({totalDeposits:0,totalWithdrawals:0,pendingCount:0}),[S,v]=r.useState([]),[_,o]=r.useState([]),[F,D]=r.useState(!0),[u,q]=r.useState(!1),[ge,G]=r.useState(""),[k,se]=r.useState(""),j=r.useMemo(()=>{const A=new Map;for(const ie of a){const c=String(ie.id||"");c&&A.set(c,ie)}return A},[a]),U=r.useMemo(()=>{const A=f.trim().toLowerCase();return A?l.filter(ie=>{const c=String(ie.username||"").toLowerCase(),W=String(ie.phoneNumber||"").toLowerCase();return c.includes(A)||W.includes(A)}):l},[l,f]),H=async(A,ie)=>{if(ie==="admin")try{const c=await Di(A);R({totalDeposits:Number(c?.totalDeposits||0),totalWithdrawals:Number(c?.totalWithdrawals||0),pendingCount:Number(c?.pendingCount||0)})}catch{}},O=async(A,ie)=>{if(ie!=="admin"){v(_);return}try{const c=await Fs({user:"",type:"all",status:"all",time:"30d",limit:30},A);v(Array.isArray(c?.transactions)?c.transactions:[])}catch{v(_)}},I=async()=>{const A=localStorage.getItem("token");if(!A){G("Please login to view cashier data."),D(!1);return}try{D(!0),G("");const ie=await es(A),c=String(ie?.role||"admin");s(c);let W=[];if(c==="admin"?W=await cs(A):W=await Is(A),n(Array.isArray(W)?W:[]),c==="admin"||c==="master_agent"||c==="super_agent")try{const de=await Zt(A),be=Array.isArray(de)?de:[];d(be),w(Ae=>{const we={...Ae};for(const Je of be){const We=String(Je.id||"");We&&typeof we[We]!="boolean"&&(we[We]=!1)}return we}),J(Ae=>{const we={...Ae};for(const Je of be){const We=String(Je.id||"");We&&!we[We]&&(we[We]=Ba(We,We))}return we})}catch{d([])}else d([]);await Promise.all([H(A,c),O(A,c)])}catch(ie){G(ie.message||"Failed to load cashier data")}finally{D(!1)}};r.useEffect(()=>{I()},[]),r.useEffect(()=>{t!=="admin"&&v(_)},[_,t]);const oe=A=>{if(A==null)return"—";const ie=Number(A);return Number.isNaN(ie)?"—":`$${ie.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`},Te=A=>{const ie=String(A.searchQuery||"").trim().toLowerCase();return a.filter(de=>A.agentId?String(de?.agentId?.id||de?.agentId||"")===String(A.agentId):!0).filter(de=>{if(!ie)return!0;const be=String(de.username||"").toLowerCase(),Ae=String(de.fullName||`${de.firstName||""} ${de.lastName||""}`).toLowerCase(),we=String(de.phoneNumber||"").toLowerCase();return be.includes(ie)||Ae.includes(ie)||we.includes(ie)}).slice(0,12)},z=A=>{const ie=String(A?.reason||"").toUpperCase(),c=String(A?.type||"").toLowerCase();return ie==="FREEPLAY_ADJUSTMENT"||ie==="DEPOSIT_FREEPLAY_BONUS"||ie==="REFERRAL_FREEPLAY_BONUS"||ie==="NEW_PLAYER_FREEPLAY_BONUS"?"FP Deposit":ie==="CASHIER_DEPOSIT"||c==="deposit"?"Deposit":ie==="CASHIER_WITHDRAWAL"||c==="withdrawal"?"Withdraw":ie==="CASHIER_CREDIT_ADJUSTMENT"?"Credit Adj":ie==="CASHIER_DEBIT_ADJUSTMENT"?"Debit Adj":"Adjustment"},M=A=>A==="deposit"||A==="credit_adj",ee=A=>{const ie=Number(A);return Number.isFinite(ie)?Math.round(ie*100)/100:0},xe=(A,ie,c=!1)=>{if(c){J(W=>{const de=W[A];return de?{...W,[A]:ie(de)}:W});return}h(W=>W.map(de=>de.id===A?ie(de):de))},ne=async(A,ie=!1)=>{const c=localStorage.getItem("token");if(!c){G("Please login to continue.");return}const W=Number(A.amount||0),de=String(A.selectedUserId||""),be=j.get(de);if(!be){xe(A.id,qe=>({...qe,error:"Select a customer first."}),ie);return}if(!Number.isFinite(W)||W<=0){xe(A.id,qe=>({...qe,error:"Enter a valid amount."}),ie);return}const Ae=Number(be.balance||0),we=Number(be.freeplayBalance||0),Je=(A.description||"").trim()||ia[A.type],We=A.figureDate?`${Je} (Figure Date: ${A.figureDate})`:Je;xe(A.id,qe=>({...qe,busy:!0,error:""}),ie),q(!0),G(""),se("");try{let qe=Ae,ot=we,Qe="CASHIER_CREDIT_ADJUSTMENT",Ke="adjustment",Re=0,mt=0;if(A.type==="fp_deposit"){const ze=await lr(de,{operationMode:"transaction",amount:W,direction:"credit",description:We},c),Ze=Number(ze?.user?.freeplayBalance);Number.isFinite(Ze)?ot=Ze:ot=ee(we+W)}else{const ze=M(A.type);qe=ee(Ae+(ze?W:-W)),A.type==="deposit"?(Qe="CASHIER_DEPOSIT",Ke="deposit"):A.type==="withdrawal"?(Qe="CASHIER_WITHDRAWAL",Ke="withdrawal"):A.type==="credit_adj"?(Qe="CASHIER_CREDIT_ADJUSTMENT",Ke="adjustment"):(Qe="CASHIER_DEBIT_ADJUSTMENT",Ke="adjustment");const Ze=await js(de,{operationMode:"transaction",amount:W,direction:ze?"credit":"debit",type:Ke,reason:Qe,description:We,applyDepositFreeplayBonus:A.type==="deposit"&&!ie?A.applyDepositFreeplayBonus!==!1:!1},c),ct=Number(Ze?.user?.balance);Number.isFinite(ct)&&(qe=ct);const Xe=Number(Ze?.user?.freeplayBalance);Number.isFinite(Xe)&&(ot=Xe),Re=Number(Ze?.freeplayBonus?.amount||0),mt=Number(Ze?.referralBonus?.amount||0)}n(ze=>ze.map(Ze=>String(Ze.id||"")!==de?Ze:{...Ze,balance:qe,freeplayBalance:ot}));const xt=[{id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:A.type==="deposit"?"deposit":A.type==="withdrawal"?"withdrawal":"adjustment",user:be.username,userId:de,amount:W,date:new Date().toISOString(),status:"completed",reason:A.type==="fp_deposit"?"FREEPLAY_ADJUSTMENT":Qe,description:We}];Re>0&&xt.unshift({id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}-fp`,type:"adjustment",user:be.username,userId:de,amount:Re,date:new Date().toISOString(),status:"completed",reason:"DEPOSIT_FREEPLAY_BONUS",description:"Auto free play bonus from deposit"}),o(ze=>[...xt,...ze].slice(0,30)),await Promise.all([H(c,t),O(c,t)]),xe(A.id,ze=>({...ze,amount:"",applyDepositFreeplayBonus:!0,description:ia[ze.type],busy:!1,error:""}),ie);const it=[`Transaction applied for ${be.username}.`];Re>0&&it.push(`Auto free play bonus added: ${oe(Re)}.`),mt>0&&it.push(`Referral bonus granted: ${oe(mt)}.`),se(it.join(" "))}catch(qe){xe(A.id,ot=>({...ot,busy:!1,error:qe.message||"Failed to apply transaction."}),ie)}finally{q(!1)}},le=(A,ie,c)=>{const W=Te(A);return e.jsxs("div",{className:"cashier-customer-cell",children:[e.jsx("button",{type:"button",className:"cashier-find-btn",children:"Find"}),e.jsxs("div",{className:"cashier-customer-search",children:[e.jsx("input",{type:"text",placeholder:"Search ...",value:A.searchQuery,onFocus:()=>ie({...A,searchOpen:!0}),onBlur:()=>setTimeout(()=>ie({...A,searchOpen:!1}),120),onChange:de=>ie({...A,searchQuery:de.target.value,searchOpen:!0,selectedUserId:""})}),A.searchOpen&&e.jsx("div",{className:"cashier-search-dropdown",children:W.length===0?e.jsx("div",{className:"cashier-search-empty",children:"No matching users"}):W.map(de=>{const be=String(de.id||"");return e.jsxs("button",{type:"button",className:"cashier-search-item",onMouseDown:()=>c(de),children:[e.jsx("span",{children:String(de.username||"").toUpperCase()}),e.jsx("small",{children:de.fullName||`${de.firstName||""} ${de.lastName||""}`})]},be)})})]})]})},Ue=(A,ie=!1)=>{const c=j.get(String(A.selectedUserId||"")),W=Number(c?.balanceOwed||0),de=Number(c?.balance||0),be=ie?null:xr(c,Number(A.amount||0)),Ae=we=>{xe(A.id,()=>we,ie)};return e.jsxs("tr",{children:[e.jsx("td",{children:le(A,Ae,we=>{const Je=String(we.id||"");Ae({...A,selectedUserId:Je,searchQuery:we.username||"",searchOpen:!1,error:""})})}),e.jsx("td",{className:"cashier-num",children:c?oe(W):"--"}),e.jsx("td",{className:"cashier-num",children:c?oe(de):"--"}),e.jsx("td",{children:e.jsx("select",{value:A.type,onChange:we=>Ae({...A,type:we.target.value,description:ia[we.target.value]||A.description}),children:Zl.filter(we=>!ie||we.value!=="fp_deposit").map(we=>e.jsx("option",{value:we.value,children:we.label},we.value))})}),e.jsx("td",{children:e.jsxs("div",{className:"cashier-amount-wrap",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"Amount",value:A.amount,onChange:we=>Ae({...A,amount:we.target.value})}),e.jsx("button",{type:"button",className:"cashier-zero-btn",onClick:()=>Ae({...A,amount:"0"}),children:"Zero"})]})}),e.jsx("td",{children:e.jsx("input",{type:"date",value:A.figureDate,onChange:we=>Ae({...A,figureDate:we.target.value})})}),e.jsxs("td",{children:[e.jsx("input",{type:"text",placeholder:"Description",value:A.description,onChange:we=>Ae({...A,description:we.target.value})}),A.type==="deposit"&&!ie&&be&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",marginTop:"8px",fontSize:"12px",color:"#111827",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:A.applyDepositFreeplayBonus!==!1,onChange:we=>Ae({...A,applyDepositFreeplayBonus:we.target.checked})}),e.jsx("span",{children:`${be.percent}% Freeplay (${oe(be.bonusAmount)})`})]})]}),e.jsxs("td",{children:[e.jsx("button",{type:"button",className:"cashier-continue-btn",disabled:A.busy||u,onClick:()=>ne(A,ie),children:A.busy?"Saving...":"Continue"}),A.error&&e.jsx("div",{className:"cashier-row-error",children:A.error})]})]},A.id)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Cashier"})}),e.jsxs("div",{className:"view-content cashier-v2",children:[F&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading cashier data..."}),!F&&e.jsxs(e.Fragment,{children:[ge&&e.jsx("div",{className:"alert error",children:ge}),k&&e.jsx("div",{className:"alert success",children:k}),e.jsxs("div",{className:"cashier-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Deposits (Today)"}),e.jsx("p",{className:"amount",children:oe(B.totalDeposits)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Withdrawals (Today)"}),e.jsx("p",{className:"amount",children:oe(B.totalWithdrawals)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Pending Transactions"}),e.jsx("p",{className:"amount",children:Number(B.pendingCount||0)})]})]}),e.jsxs("div",{className:"cashier-top-filters",children:[e.jsxs("div",{className:"cashier-agent-filter",children:[e.jsx("span",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search ...",value:f,onChange:A=>L(A.target.value)})]}),e.jsxs("select",{value:g,onChange:A=>y(A.target.value),children:[e.jsx("option",{value:"manual",children:"Manual Mode"}),e.jsx("option",{value:"agent",children:"Agent Mode"})]})]}),g==="manual"?e.jsx("div",{className:"cashier-grid-wrap",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:p.map(A=>Ue(A,!1))})]})}):e.jsx("div",{className:"cashier-agent-mode",children:U.length===0?e.jsx("div",{className:"cashier-empty",children:"No agents found."}):U.map(A=>{const ie=String(A.id||""),c=C[ie]||Ba(ie,ie),W=!!x[ie];return e.jsxs("div",{className:"cashier-agent-card",children:[e.jsxs("button",{type:"button",className:"cashier-agent-head",onClick:()=>w(de=>({...de,[ie]:!de[ie]})),children:[e.jsx("span",{children:W?"−":"+"}),e.jsx("span",{children:String(A.username||"").toUpperCase()})]}),W&&e.jsx("div",{className:"cashier-agent-body",children:e.jsxs("table",{className:"data-table cashier-entry-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Settle"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Figure Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:Ue(c,!0)})]})})]},ie)})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Transactions"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Type"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Description"})]})}),e.jsx("tbody",{children:S.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:6,className:"empty-msg",children:"No recent transactions."})}):S.map(A=>{const ie=z(A),c=ie==="Deposit"||ie==="Credit Adj"||ie==="FP Deposit";return e.jsxs("tr",{children:[e.jsx("td",{children:ie}),e.jsx("td",{children:A.user||"Unknown"}),e.jsx("td",{className:c?"positive":"negative",children:oe(A.amount)}),e.jsx("td",{children:A.date?new Date(A.date).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${A.status||"completed"}`,children:A.status||"completed"})}),e.jsx("td",{children:A.description||"—"})]},A.id)})})]})]})]})]})]})}const Jc=Object.freeze(Object.defineProperty({__proto__:null,default:to},Symbol.toStringTag,{value:"Module"})),Wt=t=>String(t||"").toUpperCase(),za=t=>{const s=String(t||"").replace(/\D/g,"");return s.length===0?"":s.length<=3?s:s.length<=6?`${s.slice(0,3)}-${s.slice(3)}`:`${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6,10)}`},Fa=t=>String(t||"").replace(/[^A-Z0-9]/g,""),so=t=>{const s=String(t||"").replace(/\D/g,"");return s?s.slice(-4):""},Va=(t,s,a,n="")=>{const l=Fa(Wt(t)),d=Fa(Wt(s)),g=so(a);if(g==="")return"";if(l!==""&&d!=="")return`${l.slice(0,3)}${d.slice(0,3)}${g}`.toUpperCase();const y=Fa(Wt(n));return y!==""?`${y.slice(0,6)}${g}`.toUpperCase():""},Ia=t=>{const s=String(t||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!s)return"";const a=s.match(/^[A-Z]+/);return a&&a[0]?a[0]:s.replace(/\d+$/,"")||s},ao=t=>t?`FREEPLAY
This account starts with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. When you place a bet you have to click "Use your freeplay balance $". Freeplay is limited to straight bets only and no parlays.`:`FREEPLAY
This account starts with $0 in freeplay. If freeplay is added later, you must click "Use your freeplay balance $" when placing a bet. Freeplay is limited to straight bets only and no parlays.`,no=new Set(["admin","agent","master_agent","super_agent"]),ro=t=>!no.has(String(t?.role||"").trim().toLowerCase()),Xt=t=>String(t||"").trim().toLowerCase(),Vt=t=>String(t||"").trim(),io=new Set(["admin","agent","master_agent","super_agent"]),la=t=>String(t?.nodeType||"").trim().toLowerCase()==="player"?!1:io.has(Xt(t?.role)),Kt=t=>{const s=Xt(t?.role);return s==="master_agent"||s==="super_agent"},ca=t=>Xt(t?.role)==="agent",fr=t=>{if(!la(t))return null;const s=Array.isArray(t.children)?t.children.map(a=>fr(a)).filter(Boolean):[];return{...t,id:Vt(t.id),children:s}},Bs=(t,s)=>{const a=Vt(s);if(!a||!t)return null;if(Vt(t.id)===a)return t;const n=Array.isArray(t.children)?t.children:[];for(const l of n){const d=Bs(l,a);if(d)return d}return null},Ha=(t,s)=>{const a=Vt(s);if(!a||!t)return[];const n=Vt(t.id);if(n===a)return[n];const l=Array.isArray(t.children)?t.children:[];for(const d of l){const g=Ha(d,a);if(g.length>0)return[n,...g]}return[]},qa=(t,s,a=!0,n=0,l=[])=>(t&&((a||n>0)&&s(t,n)&&l.push(t),(Array.isArray(t.children)?t.children:[]).forEach(g=>qa(g,s,!0,n+1,l))),l),lo=t=>{const s=Xt(t?.role);return s==="master_agent"?"MASTER":s==="super_agent"?"SUPER":s==="agent"?"AGENT":s==="admin"?"ADMIN":s?s.replace(/_/g," ").toUpperCase():"ACCOUNT"},oo=t=>Xt(t?.role).replace(/_/g,"-")||"account",co=t=>{const s=String(t?.username||"").toLowerCase(),n=Xt(t?.role).replace(/_/g," ");return`${s} ${n}`.trim()},Ga=(t,s)=>{const a=String(s||"").trim().toLowerCase();return!a||co(t).includes(a)?!0:(Array.isArray(t?.children)?t.children:[]).some(n=>Ga(n,a))};function uo({rootNode:t,loading:s=!1,error:a="",searchQuery:n="",onSearchQueryChange:l,expandedNodes:d,onToggleNode:g,onSelectNode:y,onSelectDirect:f,selectedNodeId:L="",directSelected:x=!1,selectionMode:w="player",searchPlaceholder:p="Search accounts...",emptyLabel:h="No matching accounts"}){const C=String(n||"").trim().toLowerCase(),J=C!==""||s||a,B=(S,v=0,_=!1)=>{if(!S||!la(S)||w==="master"&&!_&&!Kt(S)||C&&!Ga(S,C))return null;if(w==="player"&&!ca(S)){const k=(Array.isArray(S.children)?S.children:[]).filter(la).map(se=>B(se,v,!1));return k.some(Boolean)?e.jsx(e.Fragment,{children:k}):null}const o=Vt(S.id),F=(Array.isArray(S.children)?S.children:[]).filter(G=>la(G)&&(w!=="master"||Kt(G))),D=F.length>0&&(_||Kt(S)),u=C?!0:d.has(o),q=w==="player"?ca(S):_?typeof f=="function":Kt(S),ge=_?x:L!==""&&L===o;return e.jsxs("div",{className:"assignment-tree-branch",children:[e.jsxs("div",{className:`tree-node ${_?"root-node":""} assignment-tree-row ${ge?"selected":""} ${q?"selectable":""}`,style:_?void 0:{paddingLeft:`${16+v*20}px`},children:[e.jsx("button",{type:"button",className:`assignment-tree-toggle-btn ${D?"":"is-spacer"}`,onClick:()=>{D&&g?.(o)},"aria-label":D?u?"Collapse branch":"Expand branch":"No child accounts",disabled:!D,children:D?u?"−":"+":""}),e.jsxs("button",{type:"button",className:"assignment-tree-node-btn",onClick:()=>{if(q){if(_&&typeof f=="function"){f(S);return}y?.(S);return}D&&g?.(o)},children:[e.jsx("span",{className:"node-name",children:String(S.username||"").toUpperCase()}),e.jsx("span",{className:`node-role-badge role-${oo(S)}`,children:lo(S)})]})]}),D&&u&&F.length>0&&e.jsx("div",{className:"node-children assignment-tree-children",children:F.map(G=>B(G,v+1,!1))})]},`${o||"root"}-${v}`)},R=!!t&&Ga(t,C);return e.jsxs("div",{className:"assignment-tree-picker",children:[e.jsxs("div",{className:"search-pill assignment-tree-search-pill",children:[e.jsx("span",{className:"pill-label",children:"Tree"}),e.jsx("input",{type:"text",placeholder:p,value:n,onChange:S=>l?.(S.target.value)})]}),J&&e.jsx("div",{className:"assignment-tree-results-dropdown",children:e.jsx("div",{className:"tree-scroll-area assignment-tree-scroll-area",children:s?e.jsx("div",{className:"tree-loading",children:"Loading hierarchy..."}):a?e.jsx("div",{className:"tree-error",children:a}):R?B(t,0,!0):e.jsx("div",{className:"tree-loading",children:h})})}),e.jsx("style",{children:`
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
      `})]})}const mo=(t,s)=>{const a=s.password||"N/A";if(t==="player")return`Here’s your account info. PLEASE READ ALL RULES THOROUGHLY.

Login: ${s.username}
Password: ${a}
Min bet: $${s.minBet||25}
Max bet: $${s.maxBet||200}
Credit: $${s.creditLimit||1e3}


PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. Settle up’s are +/-$200 so anything under $200 will push to the following week. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you’ll be required to settle your balance even if it’s under $200. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so we can get everyone paid quickly and as smoothly as possible. If you can’t pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send. 

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don’t respond or don’t pay on time or in full then you will be shown the same reciprocation when it comes to payouts. 

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We’ve heard them all so don’t waste your time. 

${ao(!!s.grantStartingFreeplay)}

I need active players so if you could do me a solid and place a bet today even if it’s with freeplay. Good luck! Lmk that you’ve read all the rules and or if you have any questions and need me to adjust anything!
`;const n=t==="agent"?"Agent":"Master Agent",l=t==="agent"?`
Standard Min bet: $${s.defaultMinBet||25}
Standard Max bet: $${s.defaultMaxBet||200}
Standard Credit: $${s.defaultCreditLimit||1e3}
`:"";return`Welcome to the team! Here’s your ${n} administrative account info.

Login: ${s.username}
Password: ${a}
${l}
Please ensure you manage your sectors responsibly and maintain clear communication with your assigned accounts. Good luck!
`};function ho({initialType:t="player"}){const s=(T,E,ye)=>{let V;const Ee=new Promise((Be,Ve)=>{V=setTimeout(()=>Ve(new Error(ye)),Math.max(1e3,E))});return Promise.race([T,Ee]).finally(()=>clearTimeout(V))},[a,n]=r.useState([]),[l,d]=r.useState([]),[g,y]=r.useState(!0),[f,L]=r.useState(""),[x,w]=r.useState(null),[p,h]=r.useState(!1),[C,J]=r.useState(!1),[B,R]=r.useState(null),[S,v]=r.useState(""),[_,o]=r.useState(""),[F,D]=r.useState([]),[u,q]=r.useState(!0),[ge,G]=r.useState(""),[k,se]=r.useState([]),[j,U]=r.useState({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"25",maxBet:"200",creditLimit:"1000",balanceOwed:"200",defaultMinBet:"25",defaultMaxBet:"200",defaultCreditLimit:"1000",defaultSettleLimit:"200",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),[H,O]=r.useState({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),[I,oe]=r.useState(""),[Te,z]=r.useState(""),[M,ee]=r.useState([]),[xe,ne]=r.useState(""),[le,Ue]=r.useState(t||"player"),[A,ie]=r.useState("admin"),[c,W]=r.useState(!1),[de,be]=r.useState(""),[Ae,we]=r.useState(""),[Je,We]=r.useState(!1),[qe,ot]=r.useState(""),[Qe,Ke]=r.useState(""),[Re,mt]=r.useState(null),[xt,it]=r.useState(!1),[ze,Ze]=r.useState(""),[ct,Xe]=r.useState(()=>new Set),Ct=async(T,E)=>{if(Xt(E)==="agent")return mt(null),Ze(""),Xe(new Set),it(!1),null;try{it(!0);const V=await oa(T),Ee=V?.root?fr({...V.root,children:Array.isArray(V.tree)?V.tree:[]}):null;return mt(Ee),Ze(""),Xe(new Set),Ee}catch(V){return console.error("Failed to load assignment hierarchy:",V),mt(null),Ze(V?.message||"Failed to load hierarchy"),Xe(new Set),null}finally{it(!1)}};r.useEffect(()=>{(async()=>{try{y(!0);const E=localStorage.getItem("token")||sessionStorage.getItem("token");if(!E){n([]),d([]),mt(null),Ze(""),Xe(new Set),L("Please login to load users.");return}const ye=String(localStorage.getItem("userRole")||"").toLowerCase();let V=null;try{V=await es(E,{timeoutMs:3e4})}catch(Be){console.warn("CustomerCreationWorkspace: getMe failed, falling back to stored role.",Be)}const Ee=String(V?.role||ye||"admin").toLowerCase();if(ie(Ee),ot(V?.username||""),Ke(V?.id||""),W(!!V?.viewOnly),Ee==="agent"){const Be=await Is(E);n(Be||[]),d([]),await Ct(E,Ee)}else{const[Be,Ve]=await Promise.all([cs(E),Zt(E)]);n(Be||[]),d(Ve||[]),await Ct(E,Ee)}if(L(""),V?.username)try{const Be=Ia(V.username);if(!Be)return;const{nextUsername:Ve}=await Ot(Be,E,{type:"player"});U(Pe=>({...Pe,username:Ve}))}catch(Be){console.error("Failed to prefetch next username:",Be)}}catch(E){console.error("Error fetching add-customer context:",E),L("Failed to load users: "+E.message)}finally{y(!1)}})()},[]),r.useEffect(()=>{if(!t||t===le)return;(async()=>await Se(t))()},[t]);const m=async({overrideDuplicate:T=!1}={})=>{try{h(!0),T||w(null),L("");const E=localStorage.getItem("token")||sessionStorage.getItem("token");if(!E){L("Please login to create users.");return}if(!String(j.username||"").trim()||!String(j.firstName||"").trim()||!String(j.lastName||"").trim()||!String(j.phoneNumber||"").trim()||!String(j.password||"").trim()){L("Username, first name, last name, phone number, and password are required.");return}if(le==="player"){if(String(j.minBet??"").trim()===""||String(j.maxBet??"").trim()===""||String(j.creditLimit??"").trim()===""||String(j.balanceOwed??"").trim()===""){L("Min bet, max bet, credit limit, and settle limit are required for players.");return}if(A!=="agent"&&!String(j.agentId||"").trim()){L("Please assign this player to a regular Agent.");return}}const V={...j,apps:H};T&&(V.allowDuplicateSave=!0),V.balance===""&&delete V.balance,le!=="player"?(delete V.referredByUserId,delete V.grantStartingFreeplay,delete V.minBet,delete V.maxBet,delete V.creditLimit,delete V.balanceOwed,le==="super_agent"&&(delete V.defaultMinBet,delete V.defaultMaxBet,delete V.defaultCreditLimit,delete V.defaultSettleLimit)):V.referredByUserId||delete V.referredByUserId,(le==="agent"||le==="super_agent")&&V.agentId&&(V.parentAgentId=V.agentId),le==="agent"||le==="super_agent"?(V.agentPercent!==""?V.agentPercent=parseFloat(V.agentPercent):delete V.agentPercent,V.playerRate!==""?V.playerRate=parseFloat(V.playerRate):delete V.playerRate,I!==""&&(V.hiringAgentPercent=parseFloat(I)),Te!==""&&(V.subAgentPercent=parseFloat(Te)),M.length>0&&(V.extraSubAgents=M.filter(Oe=>Oe.name.trim()!==""||Oe.percent!=="").map(Oe=>({name:Oe.name.trim(),percent:parseFloat(Oe.percent)||0})))):(delete V.agentPercent,delete V.playerRate);let Ee=null;le==="player"?A==="agent"||A==="super_agent"||A==="master_agent"?Ee=await Xi(V,E):Ee=await Zi(V,E):le==="agent"?A==="admin"?Ee=await _a({...V,role:"agent"},E):Ee=await Ua({...V,role:"agent"},E):le==="super_agent"&&(A==="admin"?Ee=await _a({...V,role:"master_agent"},E):Ee=await Ua({...V,role:"master_agent"},E));const Be=le;L(""),w(null),o(""),D([]),O({venmo:"",cashapp:"",applePay:"",zelle:"",paypal:"",btc:"",other:""}),U({username:"",phoneNumber:"",password:"",firstName:"",lastName:"",fullName:"",agentId:"",referredByUserId:"",grantStartingFreeplay:!0,balance:"",minBet:"",maxBet:"",creditLimit:"",balanceOwed:"",defaultMinBet:"",defaultMaxBet:"",defaultCreditLimit:"",defaultSettleLimit:"",agentPrefix:"",parentAgentId:"",agentPercent:"",playerRate:""}),Ue(Be),be(""),oe(""),z(""),ee([]),We(!1),R(null),v(""),G(""),se([]),q(!0);const Pe=Be==="player"?"Player":Be==="agent"?"Agent":"Master Agent";if(o(Ee?.assigned?`${Pe} assigned successfully.`:`${Pe} created successfully.`),A==="agent"){const Oe=await Is(E);n(Oe||[])}else{const[Oe,Ie]=await Promise.all([cs(E),Zt(E)]);n(Oe||[]),d(Ie||[]),await Ct(E,A)}}catch(E){console.error("Create user failed:",E);const ye=Array.isArray(E?.duplicateMatches)?E.duplicateMatches:Array.isArray(E?.details?.matches)?E.details.matches:[],V=E?.isDuplicate===!0||E?.duplicate===!0||E?.code==="DUPLICATE_PLAYER"||E?.details?.duplicate===!0;w(V?{message:E?.message||"Likely duplicate player detected.",matches:ye}:null),L(E.message||"Failed to create user")}finally{h(!1)}},$=async()=>{try{J(!0),L(""),o(""),D([]),se([]);const T=localStorage.getItem("token")||sessionStorage.getItem("token");if(!T){L("Please login to import users.");return}if(!B){L("Please choose an Excel/CSV file first.");return}if(u&&(A==="admin"||A==="master_agent"||A==="super_agent")&&!ge){L("Select an agent to assign imported players to, or uncheck the assignment option.");return}const E=await s(Pl(B,T,{defaultAgentId:ge||"",timeoutMs:45e3,forceAgentAssignment:u}),5e4,"Import request timed out. Please try again."),ye=Array.isArray(E?.createdRows)?E.createdRows.length:0,V=Number(E?.created),Ee=Number(E?.failed),Be=Number.isFinite(V)?V:ye,Ve=Number.isFinite(Ee)?Ee:0,Pe=String(E?.message||"").trim();!Number.isFinite(V)&&!Number.isFinite(Ee)?o(Pe||`Import complete: ${Be} created, ${Ve} failed.`):o(`Import complete: ${Be} created, ${Ve} failed.${Pe?` ${Pe}`:""}`);const Oe=Array.isArray(E?.createdRows)?E.createdRows.map(Ie=>String(Ie?.username||"").toUpperCase()).filter(Boolean):[];D(Oe),se(Array.isArray(E?.errors)?E.errors:[]),R(null),v(""),G("");try{if(A==="agent"){const Ie=await s(Is(T),15e3,"Players refresh timed out");n(Ie||[])}else{const[Ie,dt]=await Promise.all([s(cs(T),15e3,"Users refresh timed out"),s(Zt(T),15e3,"Agents refresh timed out")]);n(Ie||[]),d(dt||[])}}catch(Ie){console.warn("Post-import refresh failed:",Ie),o(dt=>`${dt} Imported, but refresh failed: ${Ie.message||"please reload page."}`)}}catch(T){console.error("Import users failed:",T),L(T.message||"Failed to import users")}finally{J(!1)}},Z=async T=>{const E=T.toUpperCase().replace(/[^A-Z0-9]/g,"");if(U(ye=>({...ye,agentPrefix:E})),ne(""),E.length>=2){const ye=le==="super_agent";if(l.some(Pe=>{const Oe=String(Pe.role||"").toLowerCase();return ye!==(Oe==="master_agent"||Oe==="super_agent")?!1:String(Pe.username||"").toUpperCase().replace(/MA$/,"").replace(/\d+$/,"")===E})){ne(`Prefix "${E}" is already taken`);return}const Ee=localStorage.getItem("token")||sessionStorage.getItem("token"),Be=le==="super_agent"?"MA":"",Ve=le==="agent"?j.agentId||(A==="master_agent"||A==="super_agent"?Qe:""):"";try{const Pe={suffix:Be,type:"agent"};Ve&&(Pe.agentId=Ve);const{nextUsername:Oe}=await Ot(E,Ee,Pe);U(Ie=>({...Ie,username:Oe}))}catch(Pe){console.error("Failed to get next username from prefix:",Pe)}}else U(ye=>({...ye,username:""}))},me=async(T,E=null)=>{const ye=localStorage.getItem("token")||sessionStorage.getItem("token");if(!ye)return;U(Ve=>({...Ve,agentId:T,referredByUserId:""})),be("");const V=le==="player"?"player":"agent",Ee=le==="super_agent"?"MA":"",Be=le==="agent"||le==="super_agent";if(T){const Ve=E||l.find(Pe=>Pe.id===T);if(Ve)try{const Pe=Be&&j.agentPrefix?j.agentPrefix:Ia(Ve.username);if(!Pe){U(dt=>({...dt,username:""}));return}const Oe=V==="player"?{suffix:Ee,type:V,agentId:T}:{suffix:Ee,type:V,...le==="agent"?{agentId:T}:{}},{nextUsername:Ie}=await Ot(Pe,ye,Oe);U(dt=>({...dt,username:Ie,agentPrefix:Be&&dt.agentPrefix?dt.agentPrefix:Pe}))}catch(Pe){console.error("Failed to get next username:",Pe)}}else{if(le==="player"&&(A==="admin"||Et)){U(Pe=>({...Pe,username:""}));return}const Ve=Be&&j.agentPrefix?j.agentPrefix:qe?Ia(qe):"";if(Ve)try{const Pe={suffix:Ee,type:V};V==="agent"&&le==="agent"&&(A==="master_agent"||A==="super_agent")&&Qe&&(Pe.agentId=Qe);const{nextUsername:Oe}=await Ot(Ve,ye,Pe);U(Ie=>({...Ie,username:Oe,agentPrefix:Be&&Ie.agentPrefix?Ie.agentPrefix:Ve}))}catch(Pe){console.error("Failed to fetch username for admin:",Pe),U(Oe=>({...Oe,username:""}))}else U(Pe=>({...Pe,username:""}))}},Se=async T=>{Ue(T),ne(""),be(""),oe(""),z(""),ee([]),U(ye=>({...ye,agentPercent:"",playerRate:""}));const E=localStorage.getItem("token")||sessionStorage.getItem("token");if(E)if(T==="super_agent"||T==="agent"){const ye=String(j.agentId||"").trim(),V=ye?Bs(Re,ye):null,Ee=!!(V&&Kt(V)),Be=Ee?ye:"";Ee||U(Ie=>({...Ie,agentId:"",parentAgentId:""})),we(""),We(!1),U(Ie=>({...Ie,referredByUserId:""}));const Ve=T==="super_agent"?"MA":"",Pe=j.agentPrefix,Oe="agent";if(Pe)try{const Ie={suffix:Ve,type:Oe};T==="agent"&&Be?Ie.agentId=Be:T==="agent"&&(A==="master_agent"||A==="super_agent")&&Qe&&(Ie.agentId=Qe);const{nextUsername:dt}=await Ot(Pe,E,Ie);U(Pt=>({...Pt,username:dt,agentPrefix:Pe}))}catch(Ie){console.error("Failed to re-fetch username on type change",Ie)}else U(Ie=>({...Ie,username:""}))}else await me(""),We(!1),U(ye=>({...ye,referredByUserId:""}))},fe=(T,E,ye)=>{const V=Va(T,E,ye,j.username);U(Ee=>({...Ee,password:V}))},Ne=T=>{const E=Wt(T);U(ye=>{const V={...ye,firstName:E};return fe(E,V.lastName,V.phoneNumber),V})},De=T=>{const E=Wt(T);U(ye=>{const V={...ye,lastName:E};return fe(V.firstName,E,V.phoneNumber),V})},Ge=T=>{const E=za(T);U(ye=>{const V={...ye,phoneNumber:E};return fe(V.firstName,V.lastName,E),V})},wt=!c&&!p&&!!String(j.username||"").trim()&&!!String(j.firstName||"").trim()&&!!String(j.lastName||"").trim()&&!!String(j.phoneNumber||"").trim()&&!!String(j.password||"").trim()&&(le!=="player"||A==="agent"||!!String(j.agentId||"").trim())&&(le!=="player"||String(j.minBet??"").trim()!==""&&String(j.maxBet??"").trim()!==""&&String(j.creditLimit??"").trim()!==""&&String(j.balanceOwed??"").trim()!=="")&&!xe,Et=A==="master_agent"||A==="super_agent",At=le==="agent"||le==="super_agent";r.useMemo(()=>Re?le==="player"?qa(Re,(T,E)=>E>0&&ca(T),!1):qa(Re,(T,E)=>E>0&&Kt(T),!1):[],[Re,le]);const tt=r.useMemo(()=>{if(!Re)return null;const T=String(j.agentId||"").trim();return T?Bs(Re,T):At?Re:null},[Re,j.agentId,At]),Nt=r.useMemo(()=>{if(le==="player")return tt?String(tt.username||"").toUpperCase():"Select an agent";if(!String(j.agentId||"").trim()){const T=String(Re?.username||qe||"").trim().toUpperCase();return T?`${T} (ME)`:"DIRECT (CREATED BY ME)"}return tt?String(tt.username||"").toUpperCase():"Select a master agent"},[le,tt,j.agentId,Re,qe]),_t=At?"Search master agents or agents...":"Search agents...",Tt=At?"No matching master-agent branches":"No matching agents",St=T=>{const E=Vt(T);E&&Xe(ye=>{const V=new Set(ye);return V.has(E)?V.delete(E):V.add(E),V})},Mt=T=>{const E=Vt(T);!E||!Re||Xe(ye=>{const V=new Set(ye);return Ha(Re,E).forEach(Be=>V.add(Be)),V})},ts=async T=>{const E=Vt(T?.id);E&&(Mt(E),await me(E,T))},ss=async T=>{await me("",T)};r.useEffect(()=>{const T=String(j.agentId||"").trim();if(!T)return;const E=Bs(Re,T);(le==="player"?E&&ca(E):E&&Kt(E))||(U(V=>String(V.agentId||"").trim()?{...V,agentId:"",parentAgentId:""}:V),be(""))},[Re,le,j.agentId]);const It=(()=>{const T=Xa(a.filter(ro));return le!=="player"&&le!=="agent"&&le!=="super_agent"?[]:A==="agent"?T:j.agentId?T.filter(E=>String(E.agentId?.id||E.agentId||"")===String(j.agentId)):T})(),Lt=r.useMemo(()=>It.map(T=>{const E=String(T.id||"").trim(),ye=String(T.username||"").trim(),V=String(T.fullName||"").trim();if(!E||!ye)return null;const Ee=`${ye.toUpperCase()}${V?` - ${V}`:""}`;return{id:E,label:Ee,labelLower:Ee.toLowerCase(),usernameLower:ye.toLowerCase(),isDuplicatePlayer:!!T.isDuplicatePlayer}}).filter(Boolean),[It]),ft=r.useMemo(()=>{const T=String(Ae||"").trim().toLowerCase();return T?Lt.filter(E=>E.labelLower.includes(T)||E.usernameLower.includes(T)).slice(0,20):Lt.slice(0,20)},[Lt,Ae]),ht=r.useMemo(()=>{const T=String(j.referredByUserId||"").trim();return T&&Lt.find(E=>E.id===T)||null},[j.referredByUserId,Lt]);r.useEffect(()=>{if(ht){we(ht.label);return}String(j.referredByUserId||"").trim()||we("")},[ht,j.referredByUserId]);const as=T=>{we(T);const E=String(T||"").trim().toLowerCase();if(!E){U(V=>({...V,referredByUserId:""}));return}const ye=Lt.find(V=>V.labelLower===E||V.usernameLower===E);U(V=>({...V,referredByUserId:ye?ye.id:""}))},ns=()=>{const T=String(Ae||"").trim().toLowerCase();if(!T){U(V=>({...V,referredByUserId:""}));return}const E=Lt.find(V=>V.labelLower===T||V.usernameLower===T);if(E){we(E.label),U(V=>({...V,referredByUserId:E.id}));return}const ye=Lt.filter(V=>V.labelLower.includes(T)||V.usernameLower.includes(T));if(ye.length===1){we(ye[0].label),U(V=>({...V,referredByUserId:ye[0].id}));return}U(V=>({...V,referredByUserId:""}))},$t=T=>{if(!T){we(""),U(E=>({...E,referredByUserId:""})),We(!1);return}we(T.label),U(E=>({...E,referredByUserId:T.id})),We(!1)};return e.jsxs(e.Fragment,{children:[g&&e.jsxs("div",{className:"loading-state",children:[e.jsx("div",{className:"spinner"}),e.jsx("span",{children:"Loading setup..."})]}),!g&&e.jsxs(e.Fragment,{children:[f&&e.jsx("div",{className:"error-state",children:f}),x&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:x.message}),x.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:x.matches.map((T,E)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(T.username||"UNKNOWN")}),e.jsx("span",{children:String(T.fullName||"No name")}),e.jsx("span",{children:String(T.phoneNumber||"No phone")})]},`${T.id||T.username||"duplicate"}-${E}`))}),e.jsxs("div",{className:"duplicate-warning-actions",children:[e.jsx("button",{type:"button",className:"duplicate-warning-cancel",onClick:()=>{w(null),L("")},disabled:p,children:"Cancel"}),e.jsx("button",{type:"button",className:"duplicate-warning-confirm",onClick:()=>m({overrideDuplicate:!0}),disabled:p,children:p?"Creating…":"Create Anyway"})]})]}),_&&e.jsx("div",{className:"success-state",children:_}),F.length>0&&e.jsxs("div",{className:"success-state",style:{marginTop:"8px"},children:["Imported usernames: ",F.slice(0,20).join(", "),F.length>20?` (+${F.length-20} more)`:""]}),k.length>0&&e.jsxs("div",{style:{marginTop:"8px",background:"#fff5f5",border:"1px solid #feb2b2",borderRadius:"6px",padding:"10px 14px"},children:[e.jsxs("strong",{style:{color:"#c53030",fontSize:"13px"},children:["Failed rows (",k.length,") — re-importing will retry these safely:"]}),e.jsx("ul",{style:{margin:"6px 0 0 0",padding:"0 0 0 16px",fontSize:"12px",color:"#742a2a",maxHeight:"160px",overflowY:"auto"},children:k.map((T,E)=>e.jsxs("li",{children:["Row ",T.row,T.username?` (${String(T.username).toUpperCase()})`:"",": ",T.error||T.reason||"Unknown error"]},E))})]}),e.jsxs("div",{className:"customer-create-shell",children:[e.jsxs("div",{className:"customer-create-main",children:[e.jsxs("div",{className:"customer-create-top-row",children:[e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-type",children:[e.jsx("label",{children:"Type"}),e.jsx("div",{className:"s-wrapper",children:e.jsxs("select",{value:le,onChange:T=>Se(T.target.value),children:[e.jsx("option",{value:"player",children:"Player"}),(A==="admin"||A==="super_agent"||A==="master_agent")&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"super_agent",children:"Master Agent"})]})]})})]}),(le==="agent"||le==="super_agent")&&e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-prefix",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:j.agentPrefix,onChange:T=>Z(T.target.value),placeholder:"Enter prefix",maxLength:5,style:xe?{borderColor:"#ef4444",boxShadow:"0 0 0 2px rgba(239,68,68,0.15)"}:void 0}),xe&&e.jsx("span",{style:{color:"#ef4444",fontSize:12,fontWeight:600,marginTop:4},children:xe})]}),(le==="player"||le==="agent"||le==="super_agent")&&(A==="admin"||A==="super_agent"||A==="master_agent")&&e.jsxs("div",{className:"filter-group assignment-tree-filter-group customer-top-field customer-top-field-assignment",children:[e.jsxs("label",{className:"assignment-field-label",children:[e.jsx("span",{children:le==="player"?"Assign to Agent":"Assign to Master Agent"}),e.jsx("span",{className:"assignment-selected-chip",children:Nt})]}),e.jsx(uo,{rootNode:Re,loading:xt,error:ze,searchQuery:de,onSearchQueryChange:be,expandedNodes:ct,onToggleNode:St,onSelectNode:ts,onSelectDirect:At?ss:null,selectedNodeId:String(j.agentId||""),directSelected:At&&!String(j.agentId||"").trim(),selectionMode:At?"master":"player",searchPlaceholder:_t,emptyLabel:Tt})]}),e.jsxs("div",{className:"filter-group customer-top-field customer-top-field-username",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:j.username,placeholder:"Auto-generated",readOnly:!0,className:"readonly-input"})]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{type:"text",value:j.firstName,onChange:T=>Ne(T.target.value),placeholder:"Enter first name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Last Name"}),e.jsx("input",{type:"text",value:j.lastName,onChange:T=>De(T.target.value),placeholder:"Enter last name"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:j.phoneNumber,onChange:T=>Ge(T.target.value),placeholder:"User contact"})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Password ",e.jsx("span",{className:"locked-chip",children:"Locked"})]}),e.jsx("input",{type:"text",value:j.password.toUpperCase(),readOnly:!0,className:"readonly-input",placeholder:"Auto-generated from name + phone"})]})]}),le==="player"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet:"}),e.jsx("input",{type:"number",value:j.minBet,onChange:T=>U(E=>({...E,minBet:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet:"}),e.jsx("input",{type:"number",value:j.maxBet,onChange:T=>U(E=>({...E,maxBet:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit:"}),e.jsx("input",{type:"number",value:j.creditLimit,onChange:T=>U(E=>({...E,creditLimit:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit:"}),e.jsx("input",{type:"number",value:j.balanceOwed,onChange:T=>U(E=>({...E,balanceOwed:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-12",children:[e.jsx("label",{children:"Referred By Player"}),e.jsxs("div",{className:"agent-search-picker referral-search-picker",onFocus:()=>We(!0),onBlur:()=>{setTimeout(()=>{ns(),We(!1)},120)},tabIndex:0,children:[e.jsx("div",{className:"referral-search-head",children:e.jsx("input",{type:"text",value:Ae,onChange:T=>{as(T.target.value),We(!0)},onFocus:()=>We(!0),placeholder:"Search player (leave blank for no referral)",autoComplete:"off"})}),Je&&e.jsxs("div",{className:"agent-search-list",children:[e.jsx("button",{type:"button",className:`agent-search-item ${j.referredByUserId?"":"selected"}`,onMouseDown:T=>{T.preventDefault(),$t(null)},children:e.jsx("span",{children:"No referral"})}),ft.map(T=>e.jsxs("button",{type:"button",className:`agent-search-item ${String(j.referredByUserId||"")===String(T.id)?"selected":""} ${T.isDuplicatePlayer?"is-duplicate-player":""}`,onMouseDown:E=>{E.preventDefault(),$t(T)},children:[e.jsx("span",{children:T.label}),T.isDuplicatePlayer&&e.jsx("span",{className:"duplicate-badge",children:"Duplicate"})]},T.id)),ft.length===0&&e.jsx("div",{className:"agent-search-empty",children:"No matching players"})]})]}),e.jsx("div",{className:"player-referral-settings",children:e.jsx("div",{className:`player-freeplay-toggle ${j.grantStartingFreeplay?"is-selected":"is-unselected"}`,children:e.jsxs("label",{className:"player-freeplay-toggle-row",children:[e.jsx("input",{type:"checkbox",checked:!!j.grantStartingFreeplay,onChange:T=>U(E=>({...E,grantStartingFreeplay:T.target.checked}))}),e.jsx("span",{className:"player-freeplay-toggle-copy",children:e.jsx("span",{className:"player-freeplay-toggle-title",children:"$200 new player freeplay bonus"})})]})})})]})]}),le==="agent"&&e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Min bet: (Standard)"}),e.jsx("input",{type:"number",value:j.defaultMinBet,onChange:T=>U(E=>({...E,defaultMinBet:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Max bet: (Standard)"}),e.jsx("input",{type:"number",value:j.defaultMaxBet,onChange:T=>U(E=>({...E,defaultMaxBet:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Credit limit: (Standard)"}),e.jsx("input",{type:"number",value:j.defaultCreditLimit,onChange:T=>U(E=>({...E,defaultCreditLimit:T.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Settle limit: (Standard)"}),e.jsx("input",{type:"number",value:j.defaultSettleLimit,onChange:T=>U(E=>({...E,defaultSettleLimit:T.target.value}))})]})]}),(le==="agent"||le==="super_agent")&&(()=>{const T=parseFloat(j.agentPercent)||0,E=parseFloat(I)||0,ye=T+E,V=(()=>{const st=String(j.agentId||"").trim();if(!Re||!st)return!1;const bt=Ha(Re,st);if(bt.length<2)return!1;const pt=Xt(Re?.role);if(pt==="master_agent"||pt==="super_agent")return!0;for(let gt=1;gt<bt.length-1;gt++){const jt=Bs(Re,bt[gt]);if(jt&&Kt(jt))return!0}return!1})(),Ee=ye!==100&&V,Be=Ee&&parseFloat(Te)||0,Ve=M.reduce((st,bt)=>st+(parseFloat(bt.percent)||0),0),Pe=T+E+Be+Ve,Oe=100-Pe,Ie=Pe===100?"#16a34a":Pe>100?"#ef4444":"#f59e0b",dt=String(j.agentId||"").trim()&&tt?String(tt.username||"").toUpperCase():String(qe||"").toUpperCase()||"HIRING AGENT",Pt=Re&&String(Re.username||"").toUpperCase()||"ADMIN";return e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"commission-split-header",children:[e.jsx("span",{className:"commission-split-title",children:"Commission Split"}),e.jsxs("span",{className:"commission-split-total",style:{color:Ie},children:[Pe.toFixed(2),"%",Pe===100?" ✓":Pe>100?" over":" / 100%"]})]}),e.jsxs("div",{className:"customer-create-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Agent % ",e.jsx("span",{className:"commission-name-tag",children:String(j.username||"").toUpperCase()||"NEW AGENT"})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 90",value:j.agentPercent,onChange:st=>U(bt=>({...bt,agentPercent:st.target.value}))})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Hiring Agent % ",e.jsx("span",{className:"commission-name-tag",children:dt})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:I,onChange:st=>oe(st.target.value)})]}),Ee&&e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent % ",e.jsx("span",{className:"commission-name-tag",children:Pt})]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"e.g. 5",value:Te,onChange:st=>z(st.target.value)})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsx("label",{children:"Player Rate ($)"}),e.jsx("input",{type:"number",min:"0",step:"0.01",placeholder:"e.g. 25",value:j.playerRate,onChange:st=>U(bt=>({...bt,playerRate:st.target.value}))})]})]}),Ee&&(Pe<100&&M.every(pt=>pt.percent!=="")?[...M,{id:`new-${Date.now()}`,name:"",percent:"",isNew:!0}]:M).map((pt,gt)=>e.jsxs("div",{className:"customer-create-row commission-extra-row",children:[e.jsxs("div",{className:"filter-group customer-field-span-4",children:[e.jsxs("label",{children:["Sub Agent ",gt+1," Name"]}),e.jsx("input",{type:"text",placeholder:"Username",value:pt.name,onChange:jt=>{if(pt.isNew)ee(ut=>[...ut,{id:Date.now(),name:jt.target.value,percent:""}]);else{const ut=[...M];ut[gt]={...ut[gt],name:jt.target.value},ee(ut)}}})]}),e.jsxs("div",{className:"filter-group customer-field-span-3",children:[e.jsxs("label",{children:["Sub Agent ",gt+1," %"]}),e.jsx("input",{type:"number",min:"0",max:"100",step:"0.01",placeholder:"%",value:pt.percent,onChange:jt=>{if(pt.isNew)ee(ut=>[...ut,{id:Date.now(),name:"",percent:jt.target.value}]);else{const ut=[...M];ut[gt]={...ut[gt],percent:jt.target.value},ee(ut)}}})]}),e.jsx("div",{className:"filter-group customer-field-span-2 commission-remove-cell",children:!pt.isNew&&e.jsx("button",{type:"button",className:"commission-remove-btn",onClick:()=>ee(jt=>jt.filter((ut,rs)=>rs!==gt)),children:"Remove"})})]},pt.id)),Ee&&Pe<100&&e.jsx("div",{className:"commission-add-row",children:e.jsxs("span",{className:"commission-remaining",style:{color:Ie},children:[Oe.toFixed(2),"% remaining"]})})]})})()]}),e.jsxs("aside",{className:"customer-create-sidebar",children:[e.jsxs("div",{className:"customer-create-side-card customer-create-actions",children:[e.jsx("button",{className:"btn-primary",onClick:m,disabled:!wt,children:p?"Deploying...":`Create ${le==="player"?"Player":le==="agent"?"Agent":"Master Agent"}`}),e.jsx("button",{type:"button",className:"btn-secondary customer-copy-button",onClick:()=>{navigator.clipboard.writeText(mo(le,j)).then(()=>alert("Copied to clipboard!"))},children:"Copy Info"})]}),(A==="admin"||A==="master_agent"||A==="super_agent"||A==="agent")&&e.jsxs("div",{className:"customer-create-side-card customer-create-import-panel",children:[e.jsx("label",{children:"Import Players (.xlsx / .csv)"}),e.jsx("input",{type:"file",accept:".xlsx,.csv",onChange:T=>{const E=T.target.files?.[0]||null;R(E),v(E?.name||"")}}),S&&e.jsxs("small",{className:"customer-import-file-name",children:["Selected file: ",S]}),e.jsxs("label",{className:"customer-import-toggle",children:[e.jsx("input",{type:"checkbox",checked:u,onChange:T=>q(T.target.checked)}),e.jsx("span",{children:A==="agent"?"Assign all imported players to me":"Assign all imported players to selected agent"})]}),u&&A!=="agent"&&e.jsxs("select",{value:ge,onChange:T=>G(T.target.value),style:{width:"100%",padding:"6px 8px",border:"1px solid #d1d5db",borderRadius:"4px",fontSize:"13px",marginTop:"4px"},children:[e.jsx("option",{value:"",children:"— Select agent —"}),l.filter(T=>{const E=String(T.role||"").toLowerCase();return E==="agent"||E==="master_agent"||E==="super_agent"}).sort((T,E)=>String(T.username||"").localeCompare(String(E.username||""))).map(T=>{const E=String(T.id||""),ye=String(T.role||"").toLowerCase()==="agent"?"Agent":"Master Agent";return e.jsxs("option",{value:E,children:[String(T.username||E).toUpperCase()," (",ye,")"]},E)})]}),e.jsx("button",{type:"button",className:"btn-primary",onClick:$,disabled:!B||C,children:C?"Importing...":"Import File"})]})]})]}),e.jsx("style",{children:`
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
          `})]})]})}function po({onBack:t}){const[s,a]=r.useState(!0),[n,l]=r.useState("player"),[d,g]=r.useState(()=>String(localStorage.getItem("userRole")||"admin").toLowerCase());r.useEffect(()=>{(async()=>{const w=localStorage.getItem("token")||sessionStorage.getItem("token");if(w)try{const p=await es(w);p?.role&&g(String(p.role).toLowerCase())}catch(p){console.error("Failed to load add-customer role context:",p)}})()},[]);const y=["admin","super_agent","master_agent"].includes(d),f=x=>{l(x),a(!1)},L=()=>e.jsx("div",{className:"picker-overlay",onClick:()=>a(!1),children:e.jsxs("div",{className:"picker-modal",onClick:x=>x.stopPropagation(),children:[e.jsxs("div",{className:"picker-header",children:[e.jsx("span",{children:"Add Customer"}),e.jsx("button",{type:"button",onClick:()=>a(!1),children:"×"})]}),e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("player"),children:[e.jsx("i",{className:"fa-solid fa-user-plus"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Player"}),e.jsx("p",{children:"Create or import player accounts."})]})]}),y&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("agent"),children:[e.jsx("i",{className:"fa-solid fa-user-gear"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Agent"}),e.jsx("p",{children:"Create a new agent account."})]})]}),y&&e.jsxs("button",{type:"button",className:"picker-option",onClick:()=>f("super_agent"),children:[e.jsx("i",{className:"fa-solid fa-user-tie"}),e.jsxs("div",{children:[e.jsx("strong",{children:"Master"}),e.jsx("p",{children:"Create a master agent account."})]})]})]})});return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsxs("div",{className:"header-icon-title",children:[e.jsx("div",{className:"glow-accent"}),e.jsx("h2",{children:"Add Customer"})]}),e.jsx("div",{style:{display:"flex",gap:"12px",alignItems:"center"},children:t&&e.jsx("button",{type:"button",className:"btn-secondary",onClick:t,children:"Back"})})]}),e.jsx("div",{className:"view-content",children:e.jsx(ho,{initialType:n})}),s&&L(),e.jsx("style",{children:`
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
      `})]})}const Qc=Object.freeze(Object.defineProperty({__proto__:null,default:po},Symbol.toStringTag,{value:"Module"}));function go(){const[t,s]=r.useState(""),[a,n]=r.useState("all"),[l,d]=r.useState("all"),[g,y]=r.useState([]),[f,L]=r.useState(!0),[x,w]=r.useState(""),[p,h]=r.useState(null),[C,J]=r.useState({dailyLimit:"",monthlyLimit:"",used:"",status:"active"}),[B,R]=r.useState({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),[S,v]=r.useState(!1),_=j=>`$${Number(j||0).toLocaleString()}`,o=j=>{const U=j.monthlyLimit||1;return Math.min(j.used/U*100,100)},F=j=>j>=85?"critical":j>=65?"warning":"normal",D=r.useMemo(()=>g.reduce((j,U)=>(j.daily+=U.dailyLimit,j.monthly+=U.monthlyLimit,j.used+=U.used,j),{daily:0,monthly:0,used:0}),[g]),u=async()=>{try{L(!0);const j=localStorage.getItem("token");if(!j){y([]),w("Please login to load limits.");return}const U=await Ei(j);y(U),w("")}catch(j){console.error("Error loading third party limits:",j),w(j.message||"Failed to load limits")}finally{L(!1)}};r.useEffect(()=>{u();const j=setInterval(()=>{document.hidden||u()},12e4),U=()=>{document.hidden||u()};return document.addEventListener("visibilitychange",U),()=>{clearInterval(j),document.removeEventListener("visibilitychange",U)}},[]);const q=g.filter(j=>{const U=j.provider.toLowerCase().includes(t.toLowerCase()),H=a==="all"||j.status===a,O=o(j),I=l==="all"||l==="over-80"&&O>=80||l==="60-80"&&O>=60&&O<80||l==="under-60"&&O<60;return U&&H&&I}),ge=j=>{h(j.id),J({dailyLimit:j.dailyLimit,monthlyLimit:j.monthlyLimit,used:j.used,status:j.status})},G=()=>{h(null),J({dailyLimit:"",monthlyLimit:"",used:"",status:"active"})},k=async j=>{try{const U=localStorage.getItem("token");if(!U){w("Please login to update limits.");return}const H={dailyLimit:Number(C.dailyLimit)||0,monthlyLimit:Number(C.monthlyLimit)||0,used:Number(C.used)||0,status:C.status},O=await Mi(j,H,U);y(I=>I.map(oe=>oe.id===j?{...oe,...O.limit}:oe)),G(),w("")}catch(U){console.error("Error updating limit:",U),w(U.message||"Failed to update limit")}},se=async()=>{try{v(!0);const j=localStorage.getItem("token");if(!j){w("Please login to create limits.");return}const U={provider:B.provider.trim(),dailyLimit:Number(B.dailyLimit)||0,monthlyLimit:Number(B.monthlyLimit)||0,used:Number(B.used)||0,status:B.status},H=await Bi(U,j);y(O=>[...O,H.limit]),R({provider:"",dailyLimit:0,monthlyLimit:0,used:0,status:"active"}),w("")}catch(j){console.error("Error creating limit:",j),w(j.message||"Failed to create limit")}finally{v(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"3rd Party Limits"}),e.jsxs("span",{className:"count",children:[q.length," providers"]})]}),e.jsxs("div",{className:"view-content",children:[f&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading limits..."}),x&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:x}),!f&&!x&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Provider name",value:B.provider,onChange:j=>R(U=>({...U,provider:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Daily Limit"}),e.jsx("input",{type:"number",value:B.dailyLimit,onChange:j=>R(U=>({...U,dailyLimit:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Monthly Limit"}),e.jsx("input",{type:"number",value:B.monthlyLimit,onChange:j=>R(U=>({...U,monthlyLimit:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Used"}),e.jsx("input",{type:"number",value:B.used,onChange:j=>R(U=>({...U,used:j.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:B.status,onChange:j=>R(U=>({...U,status:j.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsx("button",{className:"btn-primary",onClick:se,disabled:S||!B.provider.trim(),children:S?"Saving...":"Add Provider"})]}),e.jsxs("div",{className:"stats-container limits-summary",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Providers"}),e.jsx("div",{className:"amount",children:g.length}),e.jsxs("p",{className:"change",children:["Active: ",g.filter(j=>j.status==="active").length]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Daily Limit Total"}),e.jsx("div",{className:"amount",children:_(D.daily)}),e.jsx("p",{className:"change",children:"Across all providers"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Monthly Limit Total"}),e.jsx("div",{className:"amount",children:_(D.monthly)}),e.jsx("p",{className:"change",children:"Capacity for the month"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Used This Month"}),e.jsx("div",{className:"amount",children:_(D.used)}),e.jsxs("p",{className:"change",children:["Utilization: ",(D.used/(D.monthly||1)*100).toFixed(1),"%"]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Provider"}),e.jsx("input",{type:"text",placeholder:"Search provider",value:t,onChange:j=>s(j.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:a,onChange:j=>n(j.target.value),children:[e.jsx("option",{value:"all",children:"All Statuses"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Utilization"}),e.jsxs("select",{value:l,onChange:j=>d(j.target.value),children:[e.jsx("option",{value:"all",children:"All Levels"}),e.jsx("option",{value:"over-80",children:"Over 80%"}),e.jsx("option",{value:"60-80",children:"60% - 80%"}),e.jsx("option",{value:"under-60",children:"Under 60%"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider"}),e.jsx("th",{children:"Daily Limit"}),e.jsx("th",{children:"Monthly Limit"}),e.jsx("th",{children:"Used"}),e.jsx("th",{children:"Utilization"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:q.map(j=>{const U=o(j);return e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:j.provider})}),e.jsx("td",{children:p===j.id?e.jsx("input",{type:"number",value:C.dailyLimit,onChange:H=>J(O=>({...O,dailyLimit:H.target.value})),className:"inline-input"}):_(j.dailyLimit)}),e.jsx("td",{children:p===j.id?e.jsx("input",{type:"number",value:C.monthlyLimit,onChange:H=>J(O=>({...O,monthlyLimit:H.target.value})),className:"inline-input"}):_(j.monthlyLimit)}),e.jsx("td",{children:p===j.id?e.jsx("input",{type:"number",value:C.used,onChange:H=>J(O=>({...O,used:H.target.value})),className:"inline-input"}):_(j.used)}),e.jsx("td",{children:e.jsxs("div",{className:"usage-meter",children:[e.jsx("div",{className:"usage-bar",children:e.jsx("div",{className:`usage-fill ${F(U)}`,style:{width:`${U}%`}})}),e.jsxs("span",{className:"usage-text",children:[U.toFixed(1),"%"]})]})}),e.jsx("td",{children:p===j.id?e.jsxs("select",{value:C.status,onChange:H=>J(O=>({...O,status:H.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"warning",children:"Warning"}),e.jsx("option",{value:"paused",children:"Paused"})]}):e.jsx("span",{className:`badge ${j.status}`,children:j.status})}),e.jsx("td",{children:j.lastSync?new Date(j.lastSync).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:p===j.id?e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>k(j.id),children:"Save"}),e.jsx("button",{className:"btn-small",onClick:G,children:"Cancel"})]}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small",onClick:()=>ge(j),children:"Edit"}),e.jsx("button",{className:"btn-small",children:"View"})]})})})]},j.id)})})]})})]})]})]})}const Kc=Object.freeze(Object.defineProperty({__proto__:null,default:go},Symbol.toStringTag,{value:"Module"}));function xo(){const[t,s]=r.useState("agents"),[a,n]=r.useState(""),[l,d]=r.useState(""),[g,y]=r.useState("any"),[f,L]=r.useState("today"),[x,w]=r.useState("all-types"),[p,h]=r.useState("all-statuses"),[C,J]=r.useState([]),[B,R]=r.useState(!0),[S,v]=r.useState(""),[_,o]=r.useState(""),[F,D]=r.useState(null),u=I=>Number(String(I).replace(/[^0-9.-]+/g,""))||0,q=I=>`$${Number(I||0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})}`,ge=(I,oe)=>oe==="any"?!0:oe==="under-100"?I<100:oe==="100-500"?I>=100&&I<=500:oe==="500-1000"?I>500&&I<=1e3:oe==="over-1000"?I>1e3:!0,G=I=>{if(I?.type)return I.type;const oe=(I?.description||"").toLowerCase();return oe.includes("parlay")?"parlay":oe.includes("teaser")?"teaser":"straight"},k=r.useMemo(()=>C.filter(I=>{const oe=String(I.agent||"").toLowerCase().includes(a.toLowerCase()),Te=String(I.customer||"").toLowerCase().includes(l.toLowerCase()),z=u(I.risk),M=x==="all-types"||G(I)===x,ee=p==="all-statuses"||String(I.status||"").toLowerCase()===p;return oe&&Te&&M&&ee&&ge(z,g)}).sort((I,oe)=>t==="agents"?String(I.agent||"").localeCompare(String(oe.agent||"")):String(I.customer||"").localeCompare(String(oe.customer||""))),[C,a,l,g,x,p,t]),se=k.reduce((I,oe)=>{I.risk+=u(oe.risk),I.toWin+=u(oe.toWin);const Te=String(oe.status||"pending").toLowerCase();return I.byStatus[Te]=(I.byStatus[Te]||0)+1,I},{risk:0,toWin:0,byStatus:{}}),j=()=>{n(""),d(""),y("any"),L("today"),w("all-types"),h("all-statuses")},U=async I=>{try{R(!0);const oe=localStorage.getItem("token");if(!oe){J([]),v("Please login to load bets.");return}const z=((await ma(I,oe))?.bets||[]).map(M=>({...M,agent:String(M.agent||"direct"),customer:String(M.customer||M.username||""),description:String(M.description||M.selection||""),risk:Number(M.risk||0),toWin:Number(M.toWin||0),event:M?.match?.homeTeam&&M?.match?.awayTeam?`${M.match.homeTeam} vs ${M.match.awayTeam}`:"—",markets:Array.isArray(M.markets)?M.markets:[],accepted:M.accepted?new Date(M.accepted).toLocaleString():"—"}));J(z),v("")}catch(oe){console.error("Error loading bets:",oe),v(oe.message||"Failed to load bets")}finally{R(!1)}};r.useEffect(()=>{U({time:f,type:x,status:p});const I=setInterval(()=>{document.hidden||U({agent:a,customer:l,amount:g,time:f,type:x,status:p})},9e4),oe=()=>{document.hidden||U({agent:a,customer:l,amount:g,time:f,type:x,status:p})};return document.addEventListener("visibilitychange",oe),()=>{clearInterval(I),document.removeEventListener("visibilitychange",oe)}},[a,l,g,f,x,p]);const H=async I=>{const oe=localStorage.getItem("token");if(!oe){v("Please login to delete bets.");return}if(window.confirm("Delete this bet? This cannot be undone."))try{o(""),D(I),await qi(I,oe),v(""),o("Bet deleted successfully."),await U({agent:a,customer:l,amount:g,time:f,type:x,status:p})}catch(Te){v(Te.message||"Failed to delete bet")}finally{D(null)}},O=()=>{o(""),U({agent:a,customer:l,amount:g,time:f,type:x,status:p})};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Props / Betting Management"})}),e.jsxs("div",{className:"view-content",children:[B&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading bets..."}),S&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:S}),_&&e.jsx("div",{style:{padding:"12px 20px",color:"#15803d",textAlign:"center",fontWeight:600},children:_}),!B&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{padding:"16px 20px",border:"1px solid #dbe4f0",borderRadius:"10px",marginBottom:"18px",background:"#f8fbff"},children:[e.jsx("strong",{style:{display:"block",marginBottom:"6px"},children:"Live Sportsbook Tickets"}),e.jsx("span",{style:{color:"#556274",fontSize:"14px"},children:"This screen now shows real sportsbook tickets from the `bets` collection only. Manual dummy bet entry has been removed."})]}),e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Tickets"}),e.jsx("div",{className:"amount",children:k.length}),e.jsx("p",{className:"change",children:"Filtered by current criteria"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Risk"}),e.jsx("div",{className:"amount",children:q(se.risk)}),e.jsx("p",{className:"change",children:"Across all tickets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Potential Payout"}),e.jsx("div",{className:"amount",children:q(se.toWin)}),e.jsx("p",{className:"change",children:"Current ticket payout value"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Pending / Won / Lost"}),e.jsxs("div",{className:"amount",children:[se.byStatus.pending||0," / ",se.byStatus.won||0," / ",se.byStatus.lost||0]}),e.jsxs("p",{className:"change",children:["Void: ",se.byStatus.void||0]})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agents"}),e.jsx("input",{type:"text",placeholder:"Search",value:a,onChange:I=>n(I.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Players"}),e.jsx("input",{type:"text",placeholder:"Search",value:l,onChange:I=>d(I.target.value),className:"search-input"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsxs("select",{value:g,onChange:I=>y(I.target.value),children:[e.jsx("option",{value:"any",children:"Any Amount"}),e.jsx("option",{value:"under-100",children:"Under $100"}),e.jsx("option",{value:"100-500",children:"$100 - $500"}),e.jsx("option",{value:"500-1000",children:"$500 - $1000"}),e.jsx("option",{value:"over-1000",children:"Over $1000"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:p,onChange:I=>h(I.target.value),children:[e.jsx("option",{value:"all-statuses",children:"All Statuses"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"won",children:"Won"}),e.jsx("option",{value:"lost",children:"Lost"}),e.jsx("option",{value:"void",children:"Void"})]})]}),e.jsx("button",{className:"btn-primary",onClick:O,children:"Search"}),e.jsx("button",{className:"btn-secondary",onClick:j,children:"Reset Filters"})]}),e.jsxs("div",{className:"tabs-container",children:[e.jsx("button",{className:`tab ${t==="agents"?"active":""}`,onClick:()=>s("agents"),children:"Agents"}),e.jsx("button",{className:`tab ${t==="players"?"active":""}`,onClick:()=>s("players"),children:"Players"})]}),e.jsxs("div",{className:"additional-filters",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:f,onChange:I=>L(I.target.value),children:[e.jsx("option",{value:"today",children:"Today"}),e.jsx("option",{value:"this-week",children:"This Week"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Type"}),e.jsxs("select",{value:x,onChange:I=>w(I.target.value),children:[e.jsx("option",{value:"all-types",children:"All Types"}),e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]})]}),e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table betting-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Accepted (EST)"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:k.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No sportsbook bets found for the current filters."})}):k.map(I=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:I.agent})}),e.jsx("td",{children:e.jsx("strong",{children:I.customer})}),e.jsxs("td",{children:[e.jsx("div",{children:I.accepted}),e.jsx("div",{style:{color:"#6b7280",fontSize:"12px"},children:I.event})]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${G(I)}`,children:G(I)})}),e.jsxs("td",{className:"description-cell",children:[String(I.description||"").split(`
`).filter(Boolean).map((oe,Te)=>e.jsx("div",{children:oe},Te)),I.markets.length>0?e.jsxs("div",{style:{color:"#6b7280",fontSize:"12px",marginTop:"6px"},children:["Markets: ",I.markets.join(", ")]}):null]}),e.jsx("td",{children:e.jsx("span",{className:"amount-risk",children:q(I.risk)})}),e.jsx("td",{children:e.jsx("span",{className:"amount-towin",children:q(I.toWin)})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${I.status}`,children:I.status})}),e.jsx("td",{children:e.jsx("button",{className:"btn-delete",onClick:()=>H(I.id),disabled:F===I.id||I.status!=="pending",title:I.status==="pending"?"Delete bet":"Only pending bets can be deleted",children:F===I.id?"...":"×"})})]},I.id))})]})}),e.jsxs("div",{className:"summary-footer",children:[e.jsxs("span",{children:["Total Records: ",k.length]}),e.jsxs("span",{className:"risk-summary",children:["Risking: ",e.jsx("span",{className:"amount-risk",children:q(se.risk)}),"Potential Payout: ",e.jsx("span",{className:"amount-towin",children:q(se.toWin)})]})]})]})]})]})}const Zc=Object.freeze(Object.defineProperty({__proto__:null,default:xo},Symbol.toStringTag,{value:"Module"}));function fo(){const[t,s]=r.useState(""),[a,n]=r.useState("all"),[l,d]=r.useState("revenue"),[g,y]=r.useState("30d"),[f,L]=r.useState([]),[x,w]=r.useState({revenue:0,customers:0,avgWinRate:0,upAgents:0}),[p,h]=r.useState(!0),[C,J]=r.useState(""),[B,R]=r.useState(!1),[S,v]=r.useState(!1),[_,o]=r.useState(""),[F,D]=r.useState(null),u=k=>`$${Number(k||0).toLocaleString(void 0,{maximumFractionDigits:0})}`,q=f.filter(k=>{const se=k.name.toLowerCase().includes(t.toLowerCase()),j=a==="all"||k.trend===a;return se&&j}).sort((k,se)=>l==="customers"?se.customers-k.customers:l==="winRate"?se.winRate-k.winRate:se.revenue-k.revenue),ge=async()=>{try{h(!0);const k=localStorage.getItem("token");if(!k){L([]),J("Please login to load performance.");return}const se=await Yi({period:g},k),j=(se.agents||[]).map(U=>({...U,lastActive:U.lastActive?new Date(U.lastActive).toLocaleString():"—"}));L(j),w(se.summary||{revenue:0,customers:0,avgWinRate:0,upAgents:0}),J("")}catch(k){console.error("Error loading agent performance:",k),J(k.message||"Failed to load agent performance")}finally{h(!1)}};r.useEffect(()=>{ge();const k=setInterval(()=>{document.hidden||ge()},12e4),se=()=>{document.hidden||ge()};return document.addEventListener("visibilitychange",se),()=>{clearInterval(k),document.removeEventListener("visibilitychange",se)}},[g]);const G=async k=>{try{R(!0),v(!0),o(""),D(null);const se=localStorage.getItem("token");if(!se)throw new Error("Please login to view details.");const j=await Ji(k.id,{period:g},se);D(j)}catch(se){o(se.message||"Failed to load details")}finally{v(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Performance"}),e.jsxs("span",{className:"count",children:[q.length," agents"]})]}),e.jsxs("div",{className:"view-content",children:[p&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading performance..."}),C&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:C}),!p&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"stats-container",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Total Revenue"}),e.jsx("div",{className:"amount",children:u(x.revenue)}),e.jsx("p",{className:"change",children:"Across filtered agents"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsx("div",{className:"amount",children:x.customers}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Avg. Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(x.avgWinRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Active-customer settled bets"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Trending Up"}),e.jsx("div",{className:"amount",children:x.upAgents}),e.jsx("p",{className:"change",children:"Agents improving"})]})]}),e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Agent"}),e.jsx("input",{type:"text",placeholder:"Search agent",value:t,onChange:k=>s(k.target.value)})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Trend"}),e.jsxs("select",{value:a,onChange:k=>n(k.target.value),children:[e.jsx("option",{value:"all",children:"All Trends"}),e.jsx("option",{value:"up",children:"Trending Up"}),e.jsx("option",{value:"stable",children:"Stable"}),e.jsx("option",{value:"down",children:"Trending Down"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sort By"}),e.jsxs("select",{value:l,onChange:k=>d(k.target.value),children:[e.jsx("option",{value:"revenue",children:"Revenue"}),e.jsx("option",{value:"customers",children:"Active Customers"}),e.jsx("option",{value:"winRate",children:"Win Rate"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Period"}),e.jsxs("select",{value:g,onChange:k=>y(k.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tier"}),e.jsx("th",{children:"Revenue"}),e.jsx("th",{children:"Active / Total Customers"}),e.jsx("th",{children:"Win Rate"}),e.jsx("th",{children:"Trend"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:q.map(k=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("strong",{children:k.name})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${k.tier}`,children:k.tier})}),e.jsx("td",{children:u(k.revenue)}),e.jsxs("td",{children:[k.customers," / ",k.totalCustomers||0]}),e.jsx("td",{children:e.jsxs("div",{className:"win-rate",children:[e.jsx("div",{className:"win-rate-bar",children:e.jsx("div",{className:"win-rate-fill",style:{width:`${Math.min(k.winRate,100)}%`}})}),e.jsxs("span",{className:"win-rate-value",children:[Number(k.winRate||0).toFixed(1),"%"]})]})}),e.jsx("td",{children:e.jsx("span",{className:`trend ${k.trend}`,children:k.trend==="up"?"📈":k.trend==="down"?"📉":"➡️"})}),e.jsx("td",{children:k.lastActive}),e.jsx("td",{children:e.jsx("div",{className:"table-actions",children:e.jsx("button",{className:"btn-small",onClick:()=>G(k),children:"View Details"})})})]},k.id))})]})})]})]}),B&&e.jsx("div",{className:"modal-overlay",onClick:()=>R(!1),children:e.jsxs("div",{className:"modal-content",style:{width:"min(980px, 95vw)",maxHeight:"86vh",overflowY:"auto"},onClick:k=>k.stopPropagation(),children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"},children:[e.jsx("h3",{style:{margin:0},children:"Agent Details"}),e.jsx("button",{className:"btn-secondary",onClick:()=>R(!1),children:"Close"})]}),S&&e.jsx("div",{style:{padding:"12px"},children:"Loading details..."}),_&&e.jsx("div",{style:{padding:"12px",color:"red"},children:_}),F&&!S&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{marginBottom:"14px",fontWeight:700},children:[F.agent?.name," | Period: ",F.summary?.period?.toUpperCase()]}),e.jsxs("div",{className:"stats-container",style:{marginBottom:"16px"},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Active Customers"}),e.jsxs("div",{className:"amount",children:[F.summary.activeCustomers," / ",F.summary.totalCustomers]}),e.jsx("p",{className:"change",children:"1+ bets in last 7 days"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Win Rate"}),e.jsxs("div",{className:"amount",children:[Number(F.summary.winRate||0).toFixed(1),"%"]}),e.jsx("p",{className:"change",children:"Settled bets only"})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Handle / GGR"}),e.jsxs("div",{className:"amount",children:[u(F.summary.totalRisk)," / ",u(F.summary.ggr)]}),e.jsxs("p",{className:"change",children:["Hold: ",Number(F.summary.holdPct||0).toFixed(1),"%"]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("h3",{children:"Bets"}),e.jsx("div",{className:"amount",children:F.summary.betsPlaced}),e.jsxs("p",{className:"change",children:["Settled: ",F.summary.settledBets," | Pending: ",F.summary.pendingBets]})]})]}),e.jsxs("div",{className:"table-container",style:{marginBottom:"14px"},children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Top Customers"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Bets"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"Win Rate"})]})}),e.jsxs("tbody",{children:[(F.topCustomers||[]).map(k=>e.jsxs("tr",{children:[e.jsx("td",{children:k.username}),e.jsx("td",{children:k.bets}),e.jsx("td",{children:u(k.risk)}),e.jsxs("td",{children:[Number(k.winRate||0).toFixed(1),"%"]})]},k.userId)),(!F.topCustomers||F.topCustomers.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"4",children:"No customer performance data for this period."})})]})]})]}),e.jsxs("div",{className:"table-container",children:[e.jsx("h4",{style:{margin:"0 0 8px 0"},children:"Recent Bets"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Accepted"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Type"}),e.jsx("th",{children:"Selection"}),e.jsx("th",{children:"Risk"}),e.jsx("th",{children:"To Win"}),e.jsx("th",{children:"Status"})]})}),e.jsxs("tbody",{children:[(F.recentBets||[]).map(k=>e.jsxs("tr",{children:[e.jsx("td",{children:new Date(k.accepted).toLocaleString()}),e.jsx("td",{children:k.customer}),e.jsx("td",{children:k.type}),e.jsx("td",{children:k.selection}),e.jsx("td",{children:u(k.risk)}),e.jsx("td",{children:u(k.toWin)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${k.status}`,children:k.status})})]},k.id)),(!F.recentBets||F.recentBets.length===0)&&e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No bets in this period."})})]})]})]})]})]})})]})}const Xc=Object.freeze(Object.defineProperty({__proto__:null,default:fo},Symbol.toStringTag,{value:"Module"}));function bo(){return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Analysis"})}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"analysis-container",children:[e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Betting Trends"}),e.jsx("p",{children:"Track and analyze betting patterns across all sports and markets."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Customer Analytics"}),e.jsx("p",{children:"Analyze customer behavior, retention rates, and spending patterns."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Revenue Analysis"}),e.jsx("p",{children:"Comprehensive revenue breakdown by sport, market, and time period."}),e.jsx("button",{className:"btn-small",children:"View Details"})]}),e.jsxs("div",{className:"analysis-card",children:[e.jsx("h3",{children:"Risk Analysis"}),e.jsx("p",{children:"Identify and assess potential risk factors in betting operations."}),e.jsx("button",{className:"btn-small",children:"View Details"})]})]})})]})}const ed=Object.freeze(Object.defineProperty({__proto__:null,default:bo},Symbol.toStringTag,{value:"Module"}));function jo({canManage:t=!0}){const[s,a]=r.useState([]),[n,l]=r.useState(!0),[d,g]=r.useState(""),[y,f]=r.useState(""),[L,x]=r.useState("all"),[w,p]=r.useState(null),[h,C]=r.useState(null),[J,B]=r.useState(!1),R=async()=>{const F=localStorage.getItem("token");if(!F){g("Please login to view IP tracker."),l(!1);return}try{l(!0);const D=await Fi({search:y,status:L},F);a(D.logs||[]),g("")}catch(D){console.error("Failed to load IP tracker:",D),g(D.message||"Failed to load IP tracker")}finally{l(!1)}};r.useEffect(()=>{R()},[y,L]);const S=async F=>{const D=localStorage.getItem("token");if(!D){g("Please login to block IPs.");return}if(!t){g("You do not have permission to manage IP actions.");return}try{p(F),await Ii(F,D),a(u=>u.map(q=>q.id===F?{...q,status:"blocked"}:q))}catch(u){g(u.message||"Failed to block IP")}finally{p(null)}},v=async F=>{const D=localStorage.getItem("token");if(!D){g("Please login to unblock IPs.");return}if(!t){g("You do not have permission to manage IP actions.");return}try{p(F),await $i(F,D),a(u=>u.map(q=>q.id===F?{...q,status:"active"}:q))}catch(u){g(u.message||"Failed to unblock IP")}finally{p(null)}},_=async F=>{const D=localStorage.getItem("token");if(!D){g("Please login to whitelist IPs.");return}if(!t){g("You do not have permission to manage IP actions.");return}try{p(F),await zi(F,D),a(u=>u.map(q=>q.id===F?{...q,status:"whitelisted"}:q))}catch(u){g(u.message||"Failed to whitelist IP")}finally{p(null)}},o=F=>{C(F),B(!0)};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"IP Tracker"})}),e.jsxs("div",{className:"view-content",children:[n&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading IP logs..."}),d&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:d}),!n&&!d&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Search"}),e.jsx("input",{type:"text",value:y,onChange:F=>f(F.target.value),placeholder:"User or IP"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:L,onChange:F=>x(F.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"blocked",children:"Blocked"})]})]})]}),!t&&e.jsx("div",{style:{marginBottom:"12px",color:"#f59e0b",fontWeight:600},children:"View-only mode: IP actions are disabled by your permissions."}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"IP Address"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Country"}),e.jsx("th",{children:"City"}),e.jsx("th",{children:"Last Active"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:s.map(F=>e.jsxs("tr",{children:[e.jsx("td",{className:"monospace",children:F.ip}),e.jsx("td",{children:F.user}),e.jsx("td",{children:F.country||"Unknown"}),e.jsx("td",{children:F.city||"Unknown"}),e.jsx("td",{children:F.lastActive?new Date(F.lastActive).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${F.status}`,children:F.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>o(F),children:"View"}),F.status==="blocked"?e.jsx("button",{className:"btn-small",onClick:()=>v(F.id),disabled:w===F.id||!t,children:w===F.id?"Working...":"Unblock"}):F.status==="whitelisted"?e.jsx("button",{className:"btn-small",onClick:()=>v(F.id),disabled:w===F.id||!t,children:w===F.id?"Working...":"Un-whitelist"}):e.jsxs(e.Fragment,{children:[e.jsx("button",{className:"btn-small btn-danger",onClick:()=>S(F.id),disabled:w===F.id||!t,children:w===F.id?"Working...":"Block"}),e.jsx("button",{className:"btn-small btn-primary",onClick:()=>_(F.id),disabled:w===F.id||!t,style:{marginLeft:"4px",backgroundColor:"#3b82f6"},children:w===F.id?"...":"Whitelist"})]})]})]},F.id))})]})})]})]}),J&&h&&e.jsx("div",{className:"modal-overlay",onClick:()=>B(!1),children:e.jsxs("div",{className:"modal-content",onClick:F=>F.stopPropagation(),children:[e.jsx("h3",{children:"IP Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"IP:"})," ",h.ip]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",h.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Country:"})," ",h.country||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"City:"})," ",h.city||"Unknown"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",h.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Active:"})," ",h.lastActive?new Date(h.lastActive).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"User Agent:"})," ",h.userAgent||"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>B(!1),children:"Close"})})]})})]})}const td=Object.freeze(Object.defineProperty({__proto__:null,default:jo},Symbol.toStringTag,{value:"Module"})),$n=[{value:"player-transactions",label:"Player Transactions"},{value:"agent-transactions",label:"Agent Transactions"},{value:"deleted-transactions",label:"Deleted Transactions"},{value:"free-play-transactions",label:"Free Play Transactions"},{value:"free-play-analysis",label:"Free Play Analysis"},{value:"player-summary",label:"Player Summary"}],Rn=[{value:"all-types",label:"Transactions Type"},{value:"deposit",label:"Deposit"},{value:"withdrawal",label:"Withdrawal"},{value:"adjustment",label:"Adjustment"},{value:"wager",label:"Wager"},{value:"payout",label:"Payout"},{value:"casino",label:"Casino"},{value:"fp_deposit",label:"Free Play"}],zt=t=>String(t||"").trim().toLowerCase(),yo=new Set(["bet_placed","bet_placed_admin","bet_lost","casino_bet_debit"]),vo=new Set(["bet_won","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),wo=new Set(["adjustment","credit_adj","debit_adj"]),No=new Set(["withdrawal","bet_placed","bet_placed_admin","bet_lost","fee","debit","casino_bet_debit"]),So=new Set(["freeplay_adjustment","deposit_freeplay_bonus","referral_freeplay_bonus","new_player_freeplay_bonus"]),ko=(t,s)=>{const a=zt(s);if(!a||a==="all-types")return!0;const n=zt(t?.type),l=zt(t?.reason);return n===a?!0:a==="adjustment"?wo.has(n):a==="wager"?yo.has(n):a==="payout"?vo.has(n):a==="casino"?n.startsWith("casino_"):a==="fp_deposit"?n==="fp_deposit"||So.has(l):!1},Co=(t,s)=>{if(!Array.isArray(t))return[];const a=Array.isArray(s)?s.map(n=>zt(n)).filter(Boolean):[];return a.length===0||a.includes("all-types")?t:t.filter(n=>a.some(l=>ko(n,l)))},Ya=t=>{const s=Number(t?.signedAmount);if(Number.isFinite(s)&&s!==0)return s;const a=Number(t?.amount||0);if(!Number.isFinite(a))return 0;if(a<0)return a;const n=String(t?.entrySide||"").trim().toUpperCase();if(n==="DEBIT")return-Math.abs(a);if(n==="CREDIT")return Math.abs(a);const l=Number(t?.balanceBefore),d=Number(t?.balanceAfter);if(Number.isFinite(l)&&Number.isFinite(d)&&l!==d)return d<l?-Math.abs(a):Math.abs(a);const g=zt(t?.type);return No.has(g)||gr(t)?-Math.abs(a):Math.abs(a)},On=t=>t.reduce((s,a)=>{const n=Ya(a),l=Math.abs(n);return s.count+=1,s.grossAmount+=l,s.netAmount+=n,n>=0?s.creditAmount+=n:s.debitAmount+=l,s},{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),_n=t=>{const s=new Date(t),a=s.getFullYear(),n=String(s.getMonth()+1).padStart(2,"0"),l=String(s.getDate()).padStart(2,"0");return`${a}-${n}-${l}`},lt=t=>{const s=Number(t||0);return Number.isNaN(s)?"0":Math.round(s).toLocaleString("en-US")},$a=t=>{if(!t)return"—";const s=new Date(t);return Number.isNaN(s.getTime())?"—":s.toLocaleString()},Ao=new Set(["admin","agent","master_agent","super_agent"]),Po=t=>{const s=new Set,a=[],n=l=>{if(!l||typeof l!="object")return;const d=String(l.id||"").trim(),g=String(l.username||"").trim(),y=String(l.role||"").trim().toLowerCase();d&&g&&Ao.has(y)&&!s.has(d)&&(s.add(d),a.push({id:d,username:g,role:y})),(Array.isArray(l.children)?l.children:[]).forEach(n)};return t?.root?n({...t.root,children:Array.isArray(t?.tree)?t.tree:[]}):Array.isArray(t?.tree)&&t.tree.forEach(n),a},Lo=t=>{if(!Array.isArray(t))return[];const s=new Set,a=[];return t.forEach(n=>{const l=String(n?.id||"").trim(),d=String(n?.username||"").trim();if(!l||!d||s.has(l))return;s.add(l);const g=String(n?.fullName||`${String(n?.firstName||"").trim()} ${String(n?.lastName||"").trim()}`).trim();a.push({id:l,username:d,fullName:g})}),a};function To({viewContext:t}){const s=r.useMemo(()=>_n(new Date),[]),a=r.useMemo(()=>{const m=new Date;return m.setDate(m.getDate()-7),_n(m)},[]),[n,l]=r.useState(()=>typeof window<"u"?window.innerWidth<=768:!1),[d,g]=r.useState(""),[y,f]=r.useState(""),[L,x]=r.useState(t?.enteredBy||""),[w,p]=r.useState(["deposit","withdrawal"]),[h,C]=r.useState(!1),[J,B]=r.useState("player-transactions"),[R,S]=r.useState(a),[v,_]=r.useState(s),[o,F]=r.useState([]),[D,u]=r.useState({count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0}),[q,ge]=r.useState("transactions"),[G,k]=r.useState(Rn),[se,j]=r.useState(!0),[U,H]=r.useState(""),[O,I]=r.useState(!1),[oe,Te]=r.useState(!1),[z,M]=r.useState(!1),[ee,xe]=r.useState(!1),[ne,le]=r.useState([]),[Ue,A]=r.useState([]),[ie,c]=r.useState([]),[W,de]=r.useState(!1),be=r.useRef(new Map);r.useEffect(()=>{const m=()=>l(window.innerWidth<=768);return window.addEventListener("resize",m),()=>window.removeEventListener("resize",m)},[]),r.useEffect(()=>{let m=!0;const $=localStorage.getItem("token");return $?((async()=>{try{const me=await oa($);if(!m)return;le(Po(me))}catch(me){console.error("Failed to fetch agent suggestions:",me),m&&le([])}})(),()=>{m=!1}):void 0},[]);const Ae=r.useMemo(()=>{const m=d.trim().toLowerCase();return(m===""?ne:ne.filter(Z=>String(Z.username||"").toLowerCase().includes(m)||String(Z.role||"").replace(/_/g," ").includes(m))).slice(0,12)},[ne,d]),we=r.useMemo(()=>{const m=L.trim().toLowerCase(),$=new Set,Z=[],me=(fe,Ne=null)=>{const De=String(fe||"").trim();if(!De)return;const Ge=De.toLowerCase();$.has(Ge)||($.add(Ge),Z.push({id:Ge,username:De,role:Ne}))};return Ue.forEach(fe=>{me(fe?.value||fe?.username,fe?.role||null)}),o.forEach(fe=>{me(fe?.actorUsername||fe?.enteredBy,fe?.actorRole||null)}),ne.forEach(fe=>{me(fe?.username,fe?.role||null)}),me("HOUSE","admin"),(m===""?Z:Z.filter(fe=>fe.username.toLowerCase().includes(m))).slice(0,12)},[Ue,L,o,ne]),Je=r.useMemo(()=>{const m=new Set,$=[];return o.forEach(Z=>{const me=String(Z?.playerUsername||"").trim();if(!me)return;const Se=me.toLowerCase();m.has(Se)||(m.add(Se),$.push({id:Se,username:me,fullName:String(Z?.playerName||"").trim()}))}),$.slice(0,12)},[o]);r.useEffect(()=>{if(!z)return;const m=localStorage.getItem("token");if(!m){c([]),de(!1);return}const $=y.trim();if($===""){c([]),de(!1);return}const Z=$.toLowerCase(),me=be.current.get(Z);if(me){c(me),de(!1);return}let Se=!1;de(!0);const fe=window.setTimeout(async()=>{try{const Ne=await cs(m,{q:$});if(Se)return;const De=Lo(Ne).slice(0,12);be.current.set(Z,De),c(De)}catch(Ne){console.error("Failed to fetch player suggestions:",Ne),Se||c([])}finally{Se||de(!1)}},220);return()=>{Se=!0,window.clearTimeout(fe)}},[y,z]);const We=r.useMemo(()=>y.trim()===""?Je:ie,[y,Je,ie]),qe=r.useMemo(()=>G.map(m=>({value:zt(m?.value),label:String(m?.label||m?.value||"").trim()})).filter(m=>m.value&&m.label),[G]),ot=r.useMemo(()=>qe.filter(m=>m.value!=="all-types"),[qe]),Qe=r.useMemo(()=>ot.map(m=>m.value),[ot]),Ke=r.useMemo(()=>{if(w.includes("all-types"))return["all-types"];const m=new Set(Qe),$=w.map(Z=>zt(Z)).filter(Z=>m.has(Z));return $.length>0?$:["all-types"]},[w,Qe]),Re=m=>{const $=String(m||"").toLowerCase();return $==="master_agent"?"MASTER":$==="super_agent"?"SUPER":$==="admin"?"ADMIN":"AGENT"},mt=async(m={})=>{const $=localStorage.getItem("token");if(!$){H("Please login to view transaction history."),j(!1);return}const Z=m.mode!==void 0?m.mode:J,me=m.startDate!==void 0?m.startDate:R,Se=m.endDate!==void 0?m.endDate:v,fe=m.selectedTypeValues!==void 0?m.selectedTypeValues:Ke,Ne=m.agentsSearch!==void 0?m.agentsSearch:d,De=m.playersSearch!==void 0?m.playersSearch:y,Ge=m.enteredBySearch!==void 0?m.enteredBySearch:L;if(me&&Se&&me>Se){H("Start date cannot be after end date.");return}try{j(!0),H("");const wt=fe.length===1?fe[0]:"all-types",Et=Ne.trim()!==""||De.trim()!==""||Ge.trim()!=="",At={mode:Z,agents:Ne,players:De,transactionType:wt,startDate:me,endDate:Se,limit:Et?1e3:700};Ge.trim()!==""&&(At.enteredBy=Ge.trim());const tt=await Fs(At,$),Nt=Array.isArray(tt?.rows)?tt.rows:Array.isArray(tt?.transactions)?tt.transactions:[],_t=String(tt?.resultType||"transactions"),Tt=_t==="transactions"&&fe.length>1&&!fe.includes("all-types"),St=Tt?Co(Nt,fe):Nt;F(St),ge(_t),u(_t==="transactions"?Tt?On(St):tt?.summary||On(St):tt?.summary||{count:0,grossAmount:0,netAmount:0,creditAmount:0,debitAmount:0});const Mt=Array.isArray(tt?.meta?.transactionTypes)?tt.meta.transactionTypes:[];k(Mt.length>0?Mt:Rn),A(Array.isArray(tt?.meta?.enteredByOptions)?tt.meta.enteredByOptions:[]),I(!0)}catch(wt){console.error("Failed to load transaction history:",wt),H(wt.message||"Failed to load transaction history")}finally{j(!1)}};r.useEffect(()=>{t?.enteredBy?(x(t.enteredBy),mt({enteredBySearch:t.enteredBy})):mt()},[]);const xt=m=>{m.preventDefault(),C(!1),mt()},it=m=>{const $=zt(m);if($){if($==="all-types"||Qe.length===0){p(["all-types"]),mt({selectedTypeValues:["all-types"]});return}p(Z=>{const me=Z.includes("all-types")?[...Qe]:Z.map(Ne=>zt(Ne)).filter(Ne=>Qe.includes(Ne)),Se=me.includes($)?me.filter(Ne=>Ne!==$):[...me,$],fe=Se.length===0||Se.length===Qe.length?["all-types"]:Se;return mt({selectedTypeValues:fe}),fe})}},ze=$n.find(m=>m.value===J)?.label||"Transaction History",Ze=(m,$)=>{const Z=m!==0?m:Number($||0),me=lt(Math.abs(Z));return Z>=0?`+$${me}`:`-$${me}`},ct=()=>{const m=o.reduce(($,Z)=>$+Ya(Z),0);return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Total: ",e.jsxs("span",{className:m<0?"negative":"txh-total-green",children:["$",lt(Math.abs(m))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-transactions",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Transaction"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Entered By"})]})}),e.jsxs("tbody",{children:[o.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:7,className:"txh-empty-cell",children:"No transactions matched these filters."})}):o.map(($,Z)=>{const me=Ya($),Se=me>=0;return e.jsxs("tr",{className:Z%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-date",children:$a($.date)}),e.jsx("td",{className:"txh-col-user",children:String($.agentUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String($.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-type",children:pr($)}),e.jsx("td",{className:"txh-col-desc",children:$.description||$.reason||"—"}),e.jsx("td",{className:`txh-col-amount ${Se?"txh-credit":"txh-debit"}`,children:Ze(me,$.amount)}),e.jsx("td",{className:"txh-col-user",children:String($.actorUsername||$.enteredBy||"HOUSE").toUpperCase()})]},`${String($.id||$.transactionId||"tx")}-${Z}`)}),o.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:5,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:`txh-col-amount ${m>=0?"txh-credit":"txh-debit"}`,children:e.jsxs("strong",{children:[m>=0?"+":"-","$",lt(Math.abs(m))]})}),e.jsx("td",{})]})]})]})})]})},Xe=()=>{const m=o.reduce((me,Se)=>me+Number(Se.creditAmount||0),0),$=o.reduce((me,Se)=>me+Number(Se.debitAmount||0),0),Z=m-$;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net Free Play: ",e.jsxs("span",{className:Z<0?"negative":"txh-total-green",children:["$",lt(Math.abs(Z))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-analysis",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Free Play Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[o.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"txh-empty-cell",children:"No free play analysis data found."})}):o.map((me,Se)=>{const fe=Number(me.netAmount||0);return e.jsxs("tr",{className:Se%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(me.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(me.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(me.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",lt(me.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",lt(me.debitAmount)]}),e.jsxs("td",{className:fe<0?"txh-debit":"txh-credit",children:[fe>=0?"+":"-","$",lt(Math.abs(fe))]}),e.jsxs("td",{children:["$",lt(me.currentFreeplayBalance)]}),e.jsx("td",{className:"txh-col-date",children:$a(me.lastTransactionAt)})]},`${String(me.playerId||me.playerUsername||"fp")}-${Se}`)}),o.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",lt(m)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",lt($)]})}),e.jsx("td",{className:Z<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[Z>=0?"+":"-","$",lt(Math.abs(Z))]})}),e.jsx("td",{colSpan:2})]})]})]})})]})},Ct=()=>{const m=o.reduce((me,Se)=>me+Number(Se.creditAmount||0),0),$=o.reduce((me,Se)=>me+Number(Se.debitAmount||0),0),Z=m-$;return e.jsxs("div",{className:"txh-table-wrap",children:[e.jsxs("div",{className:"txh-total-bar",children:["Net: ",e.jsxs("span",{className:Z<0?"negative":"txh-total-green",children:["$",lt(Math.abs(Z))]})]}),e.jsx("div",{className:"txh-scroll",children:e.jsxs("table",{className:"txh-pro-table txh-pro-table-summary",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Player"}),e.jsx("th",{children:"Agent"}),e.jsx("th",{children:"Tx Count"}),e.jsx("th",{children:"Credits"}),e.jsx("th",{children:"Debits"}),e.jsx("th",{children:"Net"}),e.jsx("th",{children:"Wagered"}),e.jsx("th",{children:"Payout"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Last Transaction"})]})}),e.jsxs("tbody",{children:[o.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:10,className:"txh-empty-cell",children:"No player summary data found."})}):o.map((me,Se)=>{const fe=Number(me.netAmount||0);return e.jsxs("tr",{className:Se%2===0?"txh-row-even":"txh-row-odd",children:[e.jsx("td",{className:"txh-col-user",children:String(me.playerUsername||"—").toUpperCase()}),e.jsx("td",{className:"txh-col-user",children:String(me.agentUsername||"—").toUpperCase()}),e.jsx("td",{children:Number(me.transactionCount||0)}),e.jsxs("td",{className:"txh-credit",children:["+$",lt(me.creditAmount)]}),e.jsxs("td",{className:"txh-debit",children:["-$",lt(me.debitAmount)]}),e.jsxs("td",{className:fe<0?"txh-debit":"txh-credit",children:[fe>=0?"+":"-","$",lt(Math.abs(fe))]}),e.jsxs("td",{children:["$",lt(me.wagerAmount)]}),e.jsxs("td",{children:["$",lt(me.payoutAmount)]}),e.jsxs("td",{children:["$",lt(me.currentBalance)]}),e.jsx("td",{className:"txh-col-date",children:$a(me.lastTransactionAt)})]},`${String(me.playerId||me.playerUsername||"summary")}-${Se}`)}),o.length>0&&e.jsxs("tr",{className:"txh-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"txh-credit",children:e.jsxs("strong",{children:["+$",lt(m)]})}),e.jsx("td",{className:"txh-debit",children:e.jsxs("strong",{children:["-$",lt($)]})}),e.jsx("td",{className:Z<0?"txh-debit":"txh-credit",children:e.jsxs("strong",{children:[Z>=0?"+":"-","$",lt(Math.abs(Z))]})}),e.jsx("td",{colSpan:4})]})]})]})})]})};return e.jsxs("div",{className:"admin-view txh-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Transaction History"})}),e.jsxs("div",{className:"view-content txh-content",children:[e.jsxs("form",{className:"txh-filter-panel",onSubmit:xt,children:[e.jsxs("div",{className:`txh-search-row${oe?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Agents"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:d,onChange:m=>{g(m.target.value),Te(!0)},onFocus:()=>{Te(!0),M(!1),xe(!1)},onBlur:()=>setTimeout(()=>Te(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),oe&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Agent suggestions",children:Ae.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching agents"}):Ae.map(m=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:$=>{$.preventDefault(),g(String(m.username||"")),Te(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(m.username||"").toUpperCase()}),e.jsx("span",{className:`txh-agent-badge role-${String(m.role||"agent").replace(/_/g,"-")}`,children:Re(m.role)})]},m.id))})]})]}),e.jsxs("div",{className:`txh-search-row${z?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Players"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:y,onChange:m=>{f(m.target.value),M(!0)},onFocus:()=>{M(!0),Te(!1),xe(!1)},onBlur:()=>setTimeout(()=>M(!1),120),placeholder:"Search accounts...",className:"txh-search-input",autoComplete:"off"}),z&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Player suggestions",children:W?e.jsx("div",{className:"txh-suggest-empty",children:"Loading players..."}):We.length===0?e.jsx("div",{className:"txh-suggest-empty",children:y.trim()===""?"Type to search players":"No matching players"}):We.map(m=>e.jsxs("button",{type:"button",className:"txh-suggest-item txh-suggest-item-player",onMouseDown:$=>{$.preventDefault(),f(String(m.username||"")),M(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(m.username||"").toUpperCase()}),e.jsx("span",{className:"txh-suggest-meta",children:m.fullName||"Player account"})]},m.id))})]})]}),e.jsxs("div",{className:`txh-search-row${ee?" txh-search-row-open":""}`,children:[e.jsx("div",{className:"txh-search-label",children:"Entered By"}),e.jsxs("div",{className:"txh-search-input-wrap",children:[e.jsx("input",{type:"text",value:L,onChange:m=>{x(m.target.value),xe(!0)},onFocus:()=>{xe(!0),Te(!1),M(!1)},onBlur:()=>setTimeout(()=>xe(!1),120),placeholder:"Search who entered the transaction...",className:"txh-search-input",autoComplete:"off"}),ee&&e.jsx("div",{className:"txh-suggest-list",role:"listbox","aria-label":"Entered by suggestions",children:we.length===0?e.jsx("div",{className:"txh-suggest-empty",children:"No matching users"}):we.map(m=>e.jsxs("button",{type:"button",className:"txh-suggest-item",onMouseDown:$=>{$.preventDefault(),x(String(m.username||"")),xe(!1)},children:[e.jsx("span",{className:"txh-suggest-main",children:String(m.username||"").toUpperCase()}),m.role&&e.jsx("span",{className:`txh-agent-badge role-${String(m.role||"agent").replace(/_/g,"-")}`,children:m.role==="master_agent"?"MASTER":m.role==="super_agent"?"SUPER":m.role==="admin"?"ADMIN":"AGENT"})]},m.id))})]})]}),e.jsx("div",{className:"txh-filter-help",children:'Use "Entered By" to filter the person or house account that posted the transaction.'}),e.jsxs("div",{className:"txh-select-row",children:[e.jsxs("div",{className:"txh-type-filter-wrap",children:[e.jsxs("button",{type:"button",className:`txh-type-select txh-type-trigger${h?" open":""}`,onClick:()=>C(m=>!m),"aria-expanded":h,"aria-haspopup":"menu","aria-label":"Transactions type",children:[e.jsx("span",{children:Ke.includes("all-types")?"All Types":`${Ke.length} Type${Ke.length!==1?"s":""}`}),e.jsx("i",{className:`fa-solid fa-chevron-${h?"up":"down"}`,"aria-hidden":"true"})]}),h&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"txh-type-backdrop",onClick:()=>C(!1),"aria-label":"Close transaction type filters"}),e.jsx("div",{className:"txh-type-menu",role:"menu","aria-label":"Transaction type filters",children:ot.length===0?e.jsx("div",{className:"txh-type-empty",children:"No transaction types available."}):ot.map(m=>{const $=Ke.includes("all-types")||Ke.includes(m.value);return e.jsxs("label",{className:"txh-type-toggle-row",children:[e.jsx("span",{children:m.label}),e.jsxs("span",{className:"txh-switch",children:[e.jsx("input",{type:"checkbox",checked:$,onChange:()=>it(m.value)}),e.jsx("span",{className:"txh-switch-slider"})]})]},m.value)})})]})]}),e.jsx("select",{value:J,onChange:m=>{const $=m.target.value;B($),C(!1),mt({mode:$})},className:"txh-mode-select","aria-label":"Report mode",children:$n.map(m=>e.jsx("option",{value:m.value,children:m.label},m.value))})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:R,onChange:m=>S(m.target.value),className:"txh-date-input","aria-label":"Start date"})]}),e.jsxs("div",{className:"txh-date-row",children:[e.jsx("div",{className:"txh-date-icon",children:e.jsx("i",{className:"fa-regular fa-calendar"})}),e.jsx("input",{type:"date",value:v,onChange:m=>_(m.target.value),className:"txh-date-input","aria-label":"End date"})]}),e.jsx("button",{type:"submit",className:"txh-search-btn","aria-label":"Search",children:e.jsx("i",{className:"fa-solid fa-magnifying-glass"})})]}),e.jsxs("div",{className:"txh-result-head",children:[e.jsx("h3",{children:ze}),e.jsxs("div",{className:"txh-summary-inline",children:[e.jsxs("span",{children:[Number(D.count||0)," Rows"]}),e.jsxs("span",{className:Number(D.netAmount||0)<0?"negative":"positive",children:["Net: ",lt(D.netAmount)]}),e.jsxs("span",{children:["Gross: ",lt(D.grossAmount)]})]})]}),se&&e.jsx("div",{className:"txh-empty",children:"Loading transaction history..."}),!se&&U&&e.jsx("div",{className:"txh-empty txh-error",children:U}),!se&&!U&&O&&(q==="analysis"?Xe():q==="summary"?Ct():ct())]}),e.jsx("style",{children:`
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
      `})]})}const sd=Object.freeze(Object.defineProperty({__proto__:null,default:To},Symbol.toStringTag,{value:"Module"}));function Do(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState({user:"",sport:"all",status:"all",time:"30d"}),[f,L]=r.useState(null),[x,w]=r.useState(null),[p,h]=r.useState(!1),C=async()=>{const S=localStorage.getItem("token");if(!S){d("Please login to view deleted wagers."),n(!1);return}try{n(!0);const v=await rr(g,S);s(v.wagers||[]),d("")}catch(v){console.error("Failed to load deleted wagers:",v),d(v.message||"Failed to load deleted wagers")}finally{n(!1)}};r.useEffect(()=>{C()},[g]);const J=async S=>{const v=localStorage.getItem("token");if(!v){d("Please login to restore wagers.");return}try{L(S),await Ri(S,v),s(_=>_.map(o=>o.id===S?{...o,status:"restored",restoredAt:new Date().toISOString()}:o))}catch(_){d(_.message||"Failed to restore wager")}finally{L(null)}},B=S=>{w(S),h(!0)},R=S=>{if(S==null)return"—";const v=Number(S);return Number.isNaN(v)?"—":`$${Math.round(v)}`};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Deleted Wagers"})}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading deleted wagers..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"filter-section",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"User"}),e.jsx("input",{type:"text",value:g.user,onChange:S=>y(v=>({...v,user:S.target.value})),placeholder:"Search user"})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:g.sport,onChange:S=>y(v=>({...v,sport:S.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"NBA",children:"NBA"}),e.jsx("option",{value:"NFL",children:"NFL"}),e.jsx("option",{value:"MLB",children:"MLB"}),e.jsx("option",{value:"NHL",children:"NHL"}),e.jsx("option",{value:"Soccer",children:"Soccer"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:g.status,onChange:S=>y(v=>({...v,status:S.target.value})),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"deleted",children:"Deleted"}),e.jsx("option",{value:"restored",children:"Restored"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:g.time,onChange:S=>y(v=>({...v,time:S.target.value})),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]})]}),e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"User"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Reason"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(S=>e.jsxs("tr",{children:[e.jsx("td",{children:S.user}),e.jsx("td",{children:R(S.amount)}),e.jsx("td",{children:S.sport}),e.jsx("td",{children:S.deletedAt?new Date(S.deletedAt).toLocaleDateString():"—"}),e.jsx("td",{children:S.reason}),e.jsx("td",{children:e.jsx("span",{className:`badge ${S.status}`,children:S.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>B(S),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>J(S.id),disabled:S.status==="restored"||f===S.id,children:f===S.id?"Working...":"Restore"})]})]},S.id))})]})})]})]}),p&&x&&e.jsx("div",{className:"modal-overlay",onClick:()=>h(!1),children:e.jsxs("div",{className:"modal-content",onClick:S=>S.stopPropagation(),children:[e.jsx("h3",{children:"Deleted Wager Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",x.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",R(x.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Sport:"})," ",x.sport]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Reason:"})," ",x.reason]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",x.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Deleted At:"})," ",x.deletedAt?new Date(x.deletedAt).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Restored At:"})," ",x.restoredAt?new Date(x.restoredAt).toLocaleString():"—"]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>h(!1),children:"Close"})})]})})]})}const ad=Object.freeze(Object.defineProperty({__proto__:null,default:Do},Symbol.toStringTag,{value:"Module"}));function Eo(){const[t,s]=r.useState("game"),[a,n]=r.useState("all"),[l,d]=r.useState([]),[g,y]=r.useState(!1),[f,L]=r.useState([]),[x,w]=r.useState(!0),[p,h]=r.useState(""),[C,J]=r.useState(""),[B,R]=r.useState(!1),[S,v]=r.useState({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),_=600,o=[{id:"nfl",label:"NFL",icon:"🏈"},{id:"nba",label:"NBA",icon:"🏀"},{id:"mlb",label:"MLB",icon:"⚾"},{id:"nhl",label:"NHL",icon:"🏒"},{id:"soccer",label:"Soccer",icon:"⚽"},{id:"tennis",label:"Tennis",icon:"🎾"},{id:"golf",label:"Golf",icon:"⛳"},{id:"boxing",label:"Boxing",icon:"🥊"},{id:"esports",label:"Esports",icon:"🎮"},{id:"props",label:"Props",icon:"📊"},{id:"futures",label:"Futures",icon:"📈"},{id:"contests",label:"Contests",icon:"🏆"}],F=O=>{d(I=>I.includes(O)?I.filter(oe=>oe!==O):[...I,O])},D=[{header:"Period",key:"period"},{header:"Game",key:"game"},{header:"Time",key:"time"},{header:"Event",key:"event"},{header:"Spread",key:"spread"},{header:"Moneyline",key:"moneyline"},{header:"Total",key:"total"},{header:"Team Total",key:"teamTotal"},{header:"OS",key:"os"},{header:"US",key:"us"}],u=async()=>{const O=localStorage.getItem("token");if(!O){h("Please login to load games."),w(!1);return}try{w(!0);const I=await ua(O);L(I||[]),h("")}catch(I){console.error("Failed to load matches:",I),h(I.message||"Failed to load matches")}finally{w(!1)}};r.useEffect(()=>{u()},[]);const q=O=>{if(!O?.startTime)return a==="all";if(a==="all")return!0;const I=new Date(O.startTime),oe=new Date,Te=new Date(oe.getFullYear(),oe.getMonth(),oe.getDate()),z=new Date(Te.getTime()+1440*60*1e3),M=new Date(z.getTime()+1440*60*1e3),ee=new Date(Te.getTime()+10080*60*1e3);return a==="today"?I>=Te&&I<z:a==="tomorrow"?I>=z&&I<M:a==="this-week"?I>=Te&&I<ee:!0},ge=O=>t==="game"?!0:O?.status===t,G=O=>{if(!l.length)return!0;const I=String(O?.sport||"").toLowerCase();return l.includes(I)},k=f.filter(q).filter(ge).filter(G);r.useEffect(()=>{!x&&k.length===0&&y(!0)},[x,k.length]);const se=async()=>{const O=localStorage.getItem("token");if(!O){h("Please login to add games.");return}try{J("add"),await ar({homeTeam:S.homeTeam.trim(),awayTeam:S.awayTeam.trim(),startTime:S.startTime,sport:S.sport,status:S.status},O),v({homeTeam:"",awayTeam:"",startTime:"",sport:"basketball",status:"scheduled"}),R(!1),u()}catch(I){h(I.message||"Failed to add game")}finally{J("")}},j=async()=>{const O=localStorage.getItem("token");if(!O){h("Please login to update odds.");return}try{const I=Date.now();J("odds"),await ir(O),u()}catch(I){h(I.message||"Failed to update odds")}finally{const I=Date.now()-startedAt;I<_&&await new Promise(oe=>setTimeout(oe,_-I)),J("")}},U=async()=>{const O=localStorage.getItem("token");if(!O){h("Please login to clear cache.");return}try{J("cache"),await Hi(O)}catch(I){h(I.message||"Failed to clear cache")}finally{J("")}},H=async O=>{const I=localStorage.getItem("token");if(!I){h("Please login to settle matches.");return}try{J(`settle-${O.id}`);const oe=O.id,Te=window.prompt(`Settlement mode for ${O.homeTeam} vs ${O.awayTeam}:
- Type "auto" to grade from score (recommended)
- Type "home" or "away" for manual H2H winner`,"auto");if(!Te){J("");return}const z=Te.trim().toLowerCase();if(!["auto","home","away"].includes(z)){h("Invalid option. Use auto, home, or away.");return}if(z==="auto")await Tn({matchId:oe},I);else{const M=await Gi(oe,I);if(M?.manualWinnerAllowed!==!0){h(M?.reason||"Manual winner mode is blocked for this match.");return}const ee=z==="home"?O.homeTeam:O.awayTeam;await Tn({matchId:oe,winner:ee},I)}await u(),h(""),alert("Match settled successfully.")}catch(oe){h(oe.message||"Failed to settle match")}finally{J("")}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Games & Events Management"})}),C==="odds"&&ii.createPortal(e.jsx("div",{className:"admin-loading-overlay",children:e.jsxs("div",{className:"admin-loading-card",children:[e.jsx("div",{className:"admin-spinner"}),e.jsx("div",{children:"Refreshing odds & scores..."})]})}),document.body),e.jsxs("div",{className:"view-content",children:[x&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading games..."}),p&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:p}),!x&&!p&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"games-controls",children:[e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Period:"}),e.jsxs("select",{value:t,onChange:O=>s(O.target.value),children:[e.jsx("option",{value:"game",children:"Game"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"scheduled",children:"Scheduled"})]})]}),e.jsxs("div",{className:"control-group",children:[e.jsx("label",{children:"Games to show:"}),e.jsxs("select",{value:a,onChange:O=>n(O.target.value),children:[e.jsx("option",{value:"all",children:"All Games"}),e.jsx("option",{value:"today",children:"Today Only"}),e.jsx("option",{value:"tomorrow",children:"Tomorrow"}),e.jsx("option",{value:"this-week",children:"This Week"})]})]})]}),e.jsx("div",{className:"sports-icons-container",children:o.map(O=>e.jsxs("button",{className:`sport-icon-btn ${l.includes(O.id)?"active":""}`,onClick:()=>F(O.id),title:O.label,children:[e.jsx("span",{className:"icon",children:O.icon}),e.jsx("span",{className:"dropdown-arrow",children:"▼"})]},O.id))}),!g&&e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table events-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[D.map(O=>e.jsx("th",{children:O.header},O.key)),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:k.map(O=>e.jsxs("tr",{children:[e.jsx("td",{children:O.status||"scheduled"}),e.jsxs("td",{children:[O.homeTeam," vs ",O.awayTeam]}),e.jsx("td",{children:O.startTime?new Date(O.startTime).toLocaleString():"—"}),e.jsx("td",{children:O.sport||"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>H(O),disabled:C===`settle-${O.id}`,children:C===`settle-${O.id}`?"Settling...":"Settle"})})]},O.id))})]})}),g&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content no-events-modal",children:[e.jsx("button",{className:"modal-close",onClick:()=>y(!1),children:"×"}),e.jsx("h3",{children:"Today there aren't any event's"}),e.jsx("p",{children:"There are no games for today, would you like to view the Full Board?"}),e.jsxs("div",{className:"modal-buttons",children:[e.jsx("button",{className:"btn-success",onClick:()=>{y(!1),n("all")},children:"Yes"}),e.jsx("button",{className:"btn-danger",onClick:()=>y(!1),children:"No"})]})]})}),e.jsxs("div",{className:"game-status-legend",children:[e.jsx("h4",{children:"Status Legend:"}),e.jsxs("div",{className:"legend-items",children:[e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge live",children:"Live"}),e.jsx("span",{children:"Game is currently in progress"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge scheduled",children:"Scheduled"}),e.jsx("span",{children:"Game is scheduled for future date"})]}),e.jsxs("div",{className:"legend-item",children:[e.jsx("span",{className:"status-badge finished",children:"Finished"}),e.jsx("span",{children:"Game has ended"})]})]})]}),e.jsxs("div",{className:"quick-actions",children:[e.jsx("h4",{children:"Quick Actions:"}),e.jsx("button",{className:"btn-primary",onClick:()=>R(!0),children:"Add Game"}),e.jsx("button",{className:"btn-secondary",onClick:j,disabled:C==="odds",children:C==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Import Games"}),e.jsx("button",{className:"btn-secondary",onClick:j,disabled:C==="odds",children:C==="odds"?e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:"8px"},children:[e.jsx("span",{className:"admin-inline-spinner"})," Working..."]}):"Update Odds"}),e.jsx("button",{className:"btn-danger",onClick:U,disabled:C==="cache",children:C==="cache"?"Working...":"Clear Cache"})]})]})]}),B&&e.jsx("div",{className:"modal-overlay",onClick:()=>R(!1),children:e.jsxs("div",{className:"modal-content",onClick:O=>O.stopPropagation(),children:[e.jsx("h3",{children:"Add Game"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Team"}),e.jsx("input",{type:"text",value:S.homeTeam,onChange:O=>v(I=>({...I,homeTeam:O.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Team"}),e.jsx("input",{type:"text",value:S.awayTeam,onChange:O=>v(I=>({...I,awayTeam:O.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Start Time"}),e.jsx("input",{type:"datetime-local",value:S.startTime,onChange:O=>v(I=>({...I,startTime:O.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Sport"}),e.jsxs("select",{value:S.sport,onChange:O=>v(I=>({...I,sport:O.target.value})),children:[e.jsx("option",{value:"basketball",children:"Basketball"}),e.jsx("option",{value:"football",children:"Football"}),e.jsx("option",{value:"baseball",children:"Baseball"}),e.jsx("option",{value:"hockey",children:"Hockey"}),e.jsx("option",{value:"soccer",children:"Soccer"}),e.jsx("option",{value:"tennis",children:"Tennis"}),e.jsx("option",{value:"golf",children:"Golf"}),e.jsx("option",{value:"boxing",children:"Boxing"}),e.jsx("option",{value:"esports",children:"Esports"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:S.status,onChange:O=>v(I=>({...I,status:O.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>R(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:se,disabled:C==="add"||!S.homeTeam.trim()||!S.awayTeam.trim()||!S.startTime,children:C==="add"?"Saving...":"Add Game"})]})]})})]})}const nd=Object.freeze(Object.defineProperty({__proto__:null,default:Eo},Symbol.toStringTag,{value:"Module"}));function Mo(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1),[f,L]=r.useState(null),[x,w]=r.useState(null),[p,h]=r.useState({name:"",url:"",status:"active",notes:""}),[C,J]=r.useState(!1),B=async()=>{const D=localStorage.getItem("token");if(!D){d("Please login to view sportsbook links."),n(!1);return}try{n(!0);const u=await Oi(D);s(u.links||[]),d("")}catch(u){console.error("Failed to load sportsbook links:",u),d(u.message||"Failed to load sportsbook links")}finally{n(!1)}};r.useEffect(()=>{B()},[]);const R=()=>{L(null),h({name:"",url:"",status:"active",notes:""}),y(!0)},S=D=>{L(D),h({name:D.name,url:D.url,status:D.status,notes:D.notes||""}),y(!0)},v=D=>{L(D),J(!0)},_=async()=>{const D=localStorage.getItem("token");if(!D){d("Please login to save links.");return}try{w(f?.id||"new"),f?await Ui(f.id,p,D):await _i(p,D),y(!1),B()}catch(u){d(u.message||"Failed to save link")}finally{w(null)}},o=async D=>{const u=localStorage.getItem("token");if(!u){d("Please login to test links.");return}try{w(D);const q=await Vi(D,u);s(ge=>ge.map(G=>G.id===D?{...G,lastSync:q.lastSync}:G))}catch(q){d(q.message||"Failed to test link")}finally{w(null)}},F=async D=>{const u=localStorage.getItem("token");if(!u){d("Please login to delete links.");return}if(window.confirm(`Delete sportsbook link "${D.name}"?`))try{w(D.id),await Wi(D.id,u),s(ge=>ge.filter(G=>G.id!==D.id))}catch(ge){d(ge.message||"Failed to delete link")}finally{w(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Sportsbook Links"}),e.jsx("button",{className:"btn-primary",onClick:R,children:"Add New Link"})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading links..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Provider Name"}),e.jsx("th",{children:"API URL"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Sync"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",style:{textAlign:"center",padding:"20px"},children:"No sportsbook links found."})}):t.map(D=>e.jsxs("tr",{children:[e.jsx("td",{children:D.name}),e.jsx("td",{className:"monospace",children:D.url}),e.jsx("td",{children:e.jsx("span",{className:`badge ${D.status}`,children:D.status})}),e.jsx("td",{children:D.lastSync?new Date(D.lastSync).toLocaleString():"—"}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>S(D),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>o(D.id),disabled:x===D.id,children:x===D.id?"Working...":"Test"}),e.jsx("button",{className:"btn-small",onClick:()=>v(D),children:"View"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>F(D),disabled:x===D.id,children:x===D.id?"Working...":"Delete"})]})]},D.id))})]})})]}),g&&e.jsx("div",{className:"modal-overlay",onClick:()=>y(!1),children:e.jsxs("div",{className:"modal-content",onClick:D=>D.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Link":"Add Link"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Name"}),e.jsx("input",{type:"text",value:p.name,onChange:D=>h(u=>({...u,name:D.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"URL"}),e.jsx("input",{type:"text",value:p.url,onChange:D=>h(u=>({...u,url:D.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:p.status,onChange:D=>h(u=>({...u,status:D.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:p.notes,onChange:D=>h(u=>({...u,notes:D.target.value})),placeholder:"Optional"})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:_,disabled:x||!p.name.trim()||!p.url.trim(),children:x?"Saving...":"Save"})]})]})}),C&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>J(!1),children:e.jsxs("div",{className:"modal-content",onClick:D=>D.stopPropagation(),children:[e.jsx("h3",{children:"Link Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Name:"})," ",f.name]}),e.jsxs("p",{children:[e.jsx("strong",{children:"URL:"})," ",f.url]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",f.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Last Sync:"})," ",f.lastSync?new Date(f.lastSync).toLocaleString():"—"]}),f.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",f.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>J(!1),children:"Close"})})]})})]})}const rd=Object.freeze(Object.defineProperty({__proto__:null,default:Mo},Symbol.toStringTag,{value:"Module"}));function Bo(){const[t,s]=r.useState([]),[a,n]=r.useState("all"),[l,d]=r.useState(!0),g=async()=>{try{const f=localStorage.getItem("token");if(!f)return;const L=await ma({},f);if(L&&Array.isArray(L.bets)){const x=L.bets.map(w=>({id:w.id,user:w.userId?.username||"Unknown",type:w.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",match:w.description||(w.matchSnapshot?`${w.matchSnapshot.homeTeam} vs ${w.matchSnapshot.awayTeam}`:"Unknown Match"),bet:`${w.selection} @ ${parseFloat(w.odds).toFixed(2)}`,amount:`$${Math.round(parseFloat(w.amount))}`,odds:parseFloat(w.odds).toFixed(2),time:new Date(w.createdAt).toLocaleTimeString(),status:w.matchSnapshot?.status==="live"?"LIVE":"UPCOMING",originalStatus:w.status}));s(x)}}catch(f){console.error("Failed to fetch admin bets:",f)}finally{d(!1)}};r.useEffect(()=>{g();const f=setInterval(()=>{document.hidden||g()},45e3),L=()=>{document.hidden||g()};return document.addEventListener("visibilitychange",L),()=>{clearInterval(f),document.removeEventListener("visibilitychange",L)}},[]);const y=a==="all"?t:t.filter(f=>f.type.toLowerCase()===a.toLowerCase());return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Live Bet Ticker"}),e.jsxs("div",{className:"ticker-filter",children:[e.jsx("button",{className:a==="all"?"active":"",onClick:()=>n("all"),children:"All Bets"}),e.jsx("button",{className:a==="live"?"active":"",onClick:()=>n("live"),children:"🔴 Live"}),e.jsx("button",{className:a==="upcoming"?"active":"",onClick:()=>n("upcoming"),children:"⏰ Upcoming"})]})]}),e.jsxs("div",{className:"view-content",children:[e.jsx("div",{className:"ticker-container",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"ticker-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Status"}),e.jsx("th",{children:"User"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Bet Details"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:l?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"Loading bets..."})}):y.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"8",style:{textAlign:"center",padding:"20px"},children:"No bets found"})}):y.map(f=>e.jsxs("tr",{className:`ticker-row ${f.status.toLowerCase()}`,children:[e.jsx("td",{children:e.jsx("span",{className:`status-badge ${f.status.toLowerCase()}`,children:f.status==="LIVE"?"🔴 LIVE":"⏰ UPCOMING"})}),e.jsx("td",{children:e.jsx("strong",{children:f.user})}),e.jsx("td",{className:"match-cell",children:f.match}),e.jsx("td",{className:"bet-cell",children:f.bet}),e.jsx("td",{className:"odds-cell",children:e.jsx("span",{className:"odds-highlight",children:f.odds})}),e.jsx("td",{className:"amount-cell",children:e.jsx("strong",{children:f.amount})}),e.jsx("td",{children:f.time}),e.jsx("td",{children:e.jsx("button",{className:"btn-tiny",children:"Details"})})]},f.id))})]})})}),e.jsxs("div",{className:"ticker-summary",children:[e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Live Bets"}),e.jsx("span",{className:"value",children:t.filter(f=>f.status==="LIVE").length})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Total Wagered"}),e.jsxs("span",{className:"value",children:["$",t.reduce((f,L)=>f+parseFloat(L.amount.replace("$","")),0).toLocaleString(void 0,{minimumFractionDigits:2,maximumFractionDigits:2})]})]}),e.jsxs("div",{className:"summary-stat",children:[e.jsx("span",{className:"label",children:"Avg Odds"}),e.jsx("span",{className:"value",children:t.length>0?(t.reduce((f,L)=>f+parseFloat(L.odds),0)/t.length).toFixed(2):"0.00"})]})]})]})]})}const id=Object.freeze(Object.defineProperty({__proto__:null,default:Bo},Symbol.toStringTag,{value:"Module"}));function Fo(){const[t,s]=r.useState({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),[a,n]=r.useState([]),[l,d]=r.useState([]),[g,y]=r.useState(!0),[f,L]=r.useState(""),[x,w]=r.useState(!1),p=C=>{const{name:J,value:B}=C.target;s(R=>({...R,[J]:B}))},h=async C=>{C.preventDefault();const J=localStorage.getItem("token");if(!J){L("Please login to create tickets.");return}try{w(!0),await sl({userId:t.userId,matchId:t.matchId,amount:Number(t.amount)||0,odds:Number(t.odds)||0,type:t.betType,selection:t.selection.trim(),status:"pending"},J),s({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),L("")}catch(B){console.error("Ticket creation failed:",B),L(B.message||"Failed to create ticket")}finally{w(!1)}};return r.useEffect(()=>{(async()=>{const J=localStorage.getItem("token");if(!J){L("Please login to load ticket data."),y(!1);return}try{y(!0);const[B,R]=await Promise.all([ua(J),cs(J)]);n(Array.isArray(B)?B:[]),d(Array.isArray(R)?R:[]),L("")}catch(B){console.error("Failed to load ticket data:",B),L(B.message||"Failed to load ticket data")}finally{y(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Ticket Writer"}),e.jsx("p",{className:"subtitle",children:"Create custom betting tickets"})]}),e.jsxs("div",{className:"view-content",children:[g&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading ticket data..."}),f&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:f}),!g&&!f&&e.jsx("div",{className:"form-container",children:e.jsxs("form",{onSubmit:h,className:"admin-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Ticket Details"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Customer:"}),e.jsxs("select",{name:"userId",value:t.userId,onChange:p,required:!0,children:[e.jsx("option",{value:"",children:"Select customer"}),l.map(C=>e.jsx("option",{value:C.id,children:C.username},C.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Type:"}),e.jsxs("select",{name:"betType",value:t.betType,onChange:p,children:[e.jsx("option",{value:"straight",children:"Straight"}),e.jsx("option",{value:"parlay",children:"Parlay"}),e.jsx("option",{value:"teaser",children:"Teaser"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Match:"}),e.jsxs("select",{name:"matchId",value:t.matchId,onChange:p,required:!0,children:[e.jsx("option",{value:"",children:"Select match"}),a.map(C=>e.jsxs("option",{value:C.id,children:[C.homeTeam," vs ",C.awayTeam]},C.id))]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Selection:"}),e.jsx("input",{type:"text",name:"selection",value:t.selection,onChange:p,placeholder:"e.g., Lakers to win",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Odds:"}),e.jsx("input",{type:"number",name:"odds",value:t.odds,onChange:p,placeholder:"e.g., 1.95",step:"0.01",required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Bet Amount:"}),e.jsx("input",{type:"number",name:"amount",value:t.amount,onChange:p,placeholder:"e.g., 100",step:"0.01",required:!0})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",disabled:x,children:x?"Saving...":"Create Ticket"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>s({betType:"straight",matchId:"",selection:"",odds:"1.90",amount:"50",userId:""}),children:"Clear"})]})]})})]})]})}const ld=Object.freeze(Object.defineProperty({__proto__:null,default:Fo},Symbol.toStringTag,{value:"Module"}));function Io(){const[t,s]=r.useState("all"),[a,n]=r.useState([]),[l,d]=r.useState(!0),[g,y]=r.useState(""),[f,L]=r.useState(null),[x,w]=r.useState(!1),[p,h]=r.useState({scoreHome:"",scoreAway:"",status:"scheduled"}),[C,J]=r.useState(!1),B=async()=>{const o=localStorage.getItem("token");if(!o){y("Please login to view scores."),d(!1);return}try{d(!0);const F=await ua(o);n(F||[]),y("")}catch(F){console.error("Failed to load matches:",F),y(F.message||"Failed to load matches")}finally{d(!1)}};r.useEffect(()=>{B()},[]);const R=t==="all"?a:a.filter(o=>String(o.sport||"").toLowerCase()===t.toLowerCase()),S=o=>{const F=o.score?.score_home??o.score?.scoreHome??"",D=o.score?.score_away??o.score?.scoreAway??"";L(o),h({scoreHome:F===0?0:F,scoreAway:D===0?0:D,status:o.status||"scheduled"}),w(!0)},v=async()=>{const o=localStorage.getItem("token");if(!o){y("Please login to update scores.");return}try{J(!0),await nr(f.id,{status:p.status,score:{scoreHome:Number(p.scoreHome)||0,scoreAway:Number(p.scoreAway)||0},lastUpdated:new Date},o),w(!1),B()}catch(F){y(F.message||"Failed to update score")}finally{J(!1)}},_=o=>o.status||"scheduled";return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Featured Matches & Scores"}),e.jsxs("div",{className:"sport-filter",children:[e.jsx("button",{className:t==="all"?"active":"",onClick:()=>s("all"),children:"All Sports"}),e.jsx("button",{className:t==="soccer"?"active":"",onClick:()=>s("soccer"),children:"⚽ Soccer"}),e.jsx("button",{className:t==="basketball"?"active":"",onClick:()=>s("basketball"),children:"🏀 NBA"}),e.jsx("button",{className:t==="tennis"?"active":"",onClick:()=>s("tennis"),children:"🎾 Tennis"}),e.jsx("button",{className:t==="football"?"active":"",onClick:()=>s("football"),children:"🏈 Football"})]})]}),e.jsxs("div",{className:"view-content",children:[l&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading scores..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!l&&!g&&e.jsx("div",{className:"filtered-matches-section",children:e.jsx("div",{className:"table-container scrollable",children:e.jsxs("table",{className:"data-table live-matches-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Score"}),e.jsx("th",{children:"Odds"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:R.map(o=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsxs("strong",{children:[o.homeTeam," vs ",o.awayTeam]})}),e.jsx("td",{children:o.startTime?new Date(o.startTime).toLocaleString():"—"}),e.jsx("td",{children:e.jsx("span",{className:`badge ${_(o)}`,children:_(o)})}),e.jsxs("td",{children:[o.score?.score_home??o.score?.scoreHome??0," - ",o.score?.score_away??o.score?.scoreAway??0]}),e.jsx("td",{children:o.odds?JSON.stringify(o.odds):"—"}),e.jsx("td",{children:e.jsx("button",{className:"btn-small",onClick:()=>S(o),children:"Update"})})]},o.id))})]})})})]}),x&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{children:"Update Score"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Home Score"}),e.jsx("input",{type:"number",value:p.scoreHome,onChange:o=>h(F=>({...F,scoreHome:o.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Away Score"}),e.jsx("input",{type:"number",value:p.scoreAway,onChange:o=>h(F=>({...F,scoreAway:o.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:p.status,onChange:o=>h(F=>({...F,status:o.target.value})),children:[e.jsx("option",{value:"scheduled",children:"Scheduled"}),e.jsx("option",{value:"live",children:"Live"}),e.jsx("option",{value:"finished",children:"Finished"}),e.jsx("option",{value:"cancelled",children:"Cancelled"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:v,disabled:C,children:C?"Saving...":"Save"})]})]})})]})}const od=Object.freeze(Object.defineProperty({__proto__:null,default:Io},Symbol.toStringTag,{value:"Module"})),Un={updateInfo:!0,suspendWagering:!0,enterDepositsWithdrawals:!0,deleteTransactions:!0,enterBettingAdjustments:!0,moveAccounts:!0,addAccounts:!0,changeCreditLimit:!0,setMinBet:!0,changeWagerLimit:!0,adjustParlayTeaser:!0,setGlobalTeamLimit:!0,maxWagerSetup:!0,allowDeny:!0,juiceSetup:!0,changeTempCredit:!0,changeSettleFigure:!0,views:Object.values(ur).reduce((t,s)=>(t[s]=!0,t),{}),ipTracker:{manage:!0}},Wn={dashboard:"Dashboard",weeklyFigures:"Weekly Figures",pending:"Pending",messaging:"Messaging",gameAdmin:"Game Admin",customerAdmin:"Customer Admin",agentManager:"Agent Management",cashier:"Cashier",addCustomer:"Add Customer",thirdPartyLimits:"3rd Party Limits",props:"Props / Betting",agentPerformance:"Agent Performance",analysis:"Analysis",ipTracker:"IP Tracker",transactionsHistory:"Transaction History",deletedWagers:"Deleted Wagers",gamesEvents:"Games & Events",sportsbookLinks:"Sportsbook Links",betTicker:"Bet Ticker",ticketwriter:"TicketWriter",scores:"Scores",masterAgentAdmin:"Master Agent Admin",billing:"Billing",settings:"Settings",monitor:"System Monitor",rules:"Rules",feedback:"Feedback",faq:"FAQ",userManual:"User Manual",profile:"Profile"},br=(t,s)=>{if(!s||typeof s!="object")return t;const a={...t};return Object.keys(s).forEach(n=>{const l=s[n];l&&typeof l=="object"&&!Array.isArray(l)?a[n]=br(t[n]||{},l):a[n]=l}),a};function jr({agent:t,onClose:s,onUpdate:a}){const[n,l]=r.useState(Un),[d,g]=r.useState(!1);r.useEffect(()=>{t&&l(br(Un,t.permissions||{}))},[t]);const y=p=>{l(h=>({...h,[p]:!h[p]}))},f=(p,h)=>{l(C=>({...C,[p]:{...C[p]||{},[h]:!C?.[p]?.[h]}}))},L=async()=>{g(!0);try{const p=localStorage.getItem("token");await Qi(t.id,n,p),alert("Permissions updated successfully"),a&&a(),s()}catch(p){console.error("Error updating permissions:",p),alert("Failed to update permissions: "+p.message)}finally{g(!1)}},x=(p,h)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:n[p],onChange:()=>y(p)}),e.jsx("span",{className:"checkmark"}),h]})},p),w=(p,h,C)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:!!n?.[p]?.[h],onChange:()=>f(p,h)}),e.jsx("span",{className:"checkmark"}),C]})},`${p}.${h}`);return e.jsxs("div",{className:"modal-overlay",children:[e.jsxs("div",{className:"modal-content permission-modal",children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h3",{children:["Permissions: ",t.username]}),e.jsx("button",{className:"close-btn",onClick:s,children:"×"})]}),e.jsxs("div",{className:"scrollable-content",children:[e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"General Account Setup"}),x("updateInfo","Update Info"),x("suspendWagering","Suspend Wagering"),x("enterDepositsWithdrawals","Enter Deposits / Withdrawals"),x("deleteTransactions","Delete Transactions"),x("enterBettingAdjustments","Enter Betting Adjustments"),x("moveAccounts","Move Accounts"),x("addAccounts","Add Accounts")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Limit And Sport Setup"}),x("changeCreditLimit","Change Credit Limit"),x("setMinBet","Set Minimum Bet Amount"),x("changeWagerLimit","Change Wager Limit"),x("adjustParlayTeaser","Adjust Parlay/Teaser Setup"),x("setGlobalTeamLimit","Set Global Team Limit"),x("maxWagerSetup","Max Wager Setup"),x("allowDeny","Allow / Deny"),x("juiceSetup","Juice Setup"),x("changeTempCredit","Change Temp Credit"),x("changeSettleFigure","Change Settle Figure")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Dashboard Access"}),Object.keys(Wn).map(p=>w("views",p,Wn[p]))]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"IP Tracker Actions"}),w("ipTracker","manage","Allow Block / Unblock / Whitelist")]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn-secondary",onClick:s,disabled:d,children:"Cancel"}),e.jsx("button",{className:"btn-primary",onClick:L,disabled:d,children:d?"Saving...":"Save"})]})]}),e.jsx("style",{children:`
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
      `})]})}function $o(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(!1),[g,y]=r.useState(!1),[f,L]=r.useState(!1),[x,w]=r.useState(!1),[p,h]=r.useState(null),[C,J]=r.useState({username:"",phoneNumber:"",password:"",agentPrefix:""}),[B,R]=r.useState({id:"",phoneNumber:"",password:"",agentBillingRate:"",agentBillingStatus:"paid"}),[S,v]=r.useState(null),[_,o]=r.useState("all"),[F,D]=r.useState(!1),u=String(localStorage.getItem("userRole")||"").toLowerCase(),q=t.filter(z=>_==="all"?!0:_==="admin"?z.createdByModel==="Admin":_==="master_agent"?z.createdByModel==="Agent":!0),ge=z=>{if(z==null||z==="")return"—";const M=Number(z);return Number.isNaN(M)?"—":`$${Math.round(M)}`};Ka.useEffect(()=>{G()},[]);const G=async()=>{try{const z=localStorage.getItem("token");if(!z)return;const M=await Zt(z);s(M||[]),v(null)}catch(z){console.error("Failed to fetch agents:",z),v(z.message||"Failed to fetch agents")}finally{n(!1)}},k=async z=>{const M=z.toUpperCase();if(J(ee=>({...ee,agentPrefix:M})),M.length>=2){const ee=localStorage.getItem("token");try{const{nextUsername:xe}=await Ot(M,ee,{suffix:"MA",type:"agent"});J(ne=>({...ne,username:xe}))}catch(xe){console.error("Failed to get next username from prefix:",xe)}}else J(ee=>({...ee,username:""}))},se=async z=>{z.preventDefault();try{const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const ee=await _a(C,M);alert(ee?.assigned?"Master Agent assigned successfully":"Master Agent created successfully"),d(!1),J({username:"",phoneNumber:"",password:"",agentPrefix:""}),G()}catch(M){console.error("Agent creation error:",M),alert("Failed to create agent: "+M.message)}},j=async z=>{const M=z.status==="suspended",ee=M?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${ee} ${z.username}?`))try{const xe=localStorage.getItem("token");M?await cr(z.id,xe):await or(z.id,xe),G()}catch(xe){alert(`Failed to ${ee} agent: `+xe.message)}},U=z=>{R({id:z.id,phoneNumber:z.phoneNumber||"",password:"",agentBillingRate:z.agentBillingRate??"",agentBillingStatus:z.agentBillingStatus||"paid",unlimitedBalance:z.unlimitedBalance||!1}),h(z),y(!0)},H=async z=>{z.preventDefault();try{const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const ee={phoneNumber:B.phoneNumber,agentBillingRate:B.agentBillingRate,agentBillingStatus:B.agentBillingStatus,unlimitedBalance:B.unlimitedBalance};B.password&&(ee.password=B.password),await ys(B.id,ee,M),alert("Agent updated successfully"),y(!1),G()}catch(M){console.error("Update Error:",M),alert("Failed to update agent: "+M.message)}},O=z=>{h(z),L(!0)},I=async z=>{const M=z.id,ee=z.balance??0,xe=window.prompt("Enter new agent balance:",`${ee}`);if(xe===null)return;const ne=Number(xe);if(Number.isNaN(ne)){alert("Balance must be a valid number.");return}try{const le=localStorage.getItem("token");if(!le)throw new Error("No token found");await ys(M,{balance:ne},le),G()}catch(le){alert("Failed to update agent balance: "+(le.message||"Unknown error"))}},oe=async z=>{const M=z.id,ee=window.prompt(`Enter new password for agent ${z.username}:`,"");if(ee!==null){if(ee.length<6){alert("Password must be at least 6 characters long");return}try{const xe=localStorage.getItem("token");if(!xe)throw new Error("No token found");await dr(M,ee,xe),alert(`Password for agent ${z.username} has been reset successfully.`)}catch(xe){console.error("Agent password reset failed:",xe),alert(xe.message||"Failed to reset agent password")}}},Te=async()=>{if(window.confirm(`Delete all seeded workflow demo users and agents now?

This removes demo hierarchy records created for workflow testing.`))try{D(!0);const M=localStorage.getItem("token");if(!M)throw new Error("No token found");const xe=(await Ki(M))?.summary||{};alert(`Seeded demo data deleted.
Users: ${xe.usersDeleted||0}
Agents: ${xe.agentsDeleted||0}
Master links: ${xe.masterAgentLinksDeleted||0}`),await G()}catch(M){alert("Failed to delete demo workflow data: "+(M.message||"Unknown error"))}finally{D(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Master Agent Administration"}),e.jsxs("div",{style:{display:"flex",gap:"1rem",alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"},children:[e.jsxs("select",{value:_,onChange:z=>o(z.target.value),style:{padding:"0.5rem",borderRadius:"4px",border:"1px solid #444",backgroundColor:"#333",color:"white"},children:[e.jsx("option",{value:"all",children:"Show All Creators"}),e.jsx("option",{value:"admin",children:"Created by Admin"}),e.jsx("option",{value:"master_agent",children:"Created by Master Agent"})]}),u==="admin"&&e.jsx("button",{className:"btn-secondary",onClick:Te,disabled:F,title:"Delete workflow demo accounts",children:F?"Deleting Demo Data...":"Delete Demo Data"}),e.jsx("button",{className:"btn-primary",onClick:()=>d(!0),children:"Add Master Agent"})]})]}),l&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Master Agent"}),e.jsxs("form",{onSubmit:se,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:C.agentPrefix,onChange:z=>k(z.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:C.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:C.phoneNumber,onChange:z=>J({...C,phoneNumber:z.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:C.password,onChange:z=>J({...C,password:z.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>d(!1),children:"Cancel"})]})]})]})}),g&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Agent: ",p?.username]}),e.jsxs("form",{onSubmit:H,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:B.phoneNumber,onChange:z=>R({...B,phoneNumber:z.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:B.password,onChange:z=>R({...B,password:z.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Rate per Customer (Weekly)"}),e.jsx("input",{type:"number",min:"0",value:B.agentBillingRate,onChange:z=>R({...B,agentBillingRate:z.target.value})})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Billing Status"}),e.jsxs("select",{value:B.agentBillingStatus,onChange:z=>R({...B,agentBillingStatus:z.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",border:"1px solid #444",color:"#fff",borderRadius:"4px"},children:[e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"unpaid",children:"Unpaid"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:B.unlimitedBalance,onChange:z=>R({...B,unlimitedBalance:z.target.checked}),style:{width:"auto"}}),"Unlimited Balance"]}),e.jsx("small",{style:{color:"#aaa",fontSize:"11px"},children:"When enabled, this agent can credit players without balance restrictions"})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"})]})]})]})}),f&&p&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"Agent Details"}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Username:"})," ",e.jsx("span",{children:p.username})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Phone Number:"})," ",e.jsx("span",{children:p.phoneNumber})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Status:"})," ",e.jsx("span",{className:`badge ${p.status}`,children:p.status})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created By:"})," ",e.jsx("span",{children:p.createdBy?.username||"System"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Created At:"})," ",e.jsx("span",{children:new Date(p.createdAt).toLocaleString()})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Customers:"})," ",e.jsx("span",{children:p.userCount})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Active Customers:"})," ",e.jsx("span",{children:p.activeCustomerCount||0})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Balance:"})," ",e.jsx("span",{children:ge(p.balance)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Outstanding Balance:"})," ",e.jsx("span",{children:ge(p.balanceOwed)})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Rate per Customer:"})," ",e.jsxs("span",{children:["$",Math.round(Number(p.agentBillingRate||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Weekly Charge:"})," ",e.jsxs("span",{children:["$",Math.round(Number(p.weeklyCharge||0))]})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"Billing Status:"})," ",e.jsx("span",{children:p.agentBillingStatus||"paid"})]}),e.jsxs("div",{className:"detail-row",children:[e.jsx("label",{children:"View Only:"})," ",e.jsx("span",{children:p.viewOnly?"Yes":"No"})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Close"})})]})}),x&&p&&e.jsx(jr,{agent:p,onClose:()=>w(!1),onUpdate:G}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Agent Name"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Created By"}),e.jsx("th",{children:"Sub-Agents"}),e.jsx("th",{children:"Total Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Outstanding"}),e.jsx("th",{children:"Rate/Customer"}),e.jsx("th",{children:"Weekly Charge"}),e.jsx("th",{children:"Billing"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:a?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"Loading agents..."})}):S?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:S})}):q.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"14",children:"No agents found matching filter."})}):q.map(z=>e.jsxs("tr",{children:[e.jsx("td",{children:z.username}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.role==="master_agent"?"btn-primary":"btn-secondary"}`,style:{fontSize:"0.75rem",textTransform:"capitalize"},children:z.role?.replace("_"," ")||"agent"})}),e.jsx("td",{children:z.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.status||""}`,children:z.status||"unknown"})}),e.jsx("td",{style:{fontWeight:"bold",color:z.createdBy?"#e67e22":"#999"},children:z.createdBy?e.jsxs(e.Fragment,{children:[e.jsxs("span",{style:{fontSize:"0.8em",color:"#888",marginRight:"4px"},children:["[",z.createdByModel==="Admin"?"Admin":"MA","]"]}),z.createdBy.username]}):"System"}),e.jsx("td",{children:z.role==="master_agent"?z.subAgentCount||0:"—"}),e.jsx("td",{children:z.role==="master_agent"?z.totalUsersInHierarchy||0:z.userCount||0}),e.jsx("td",{children:ge(z.balance)}),e.jsx("td",{children:ge(z.balanceOwed)}),e.jsxs("td",{children:["$",Math.round(Number(z.agentBillingRate||0))]}),e.jsxs("td",{children:["$",Math.round(Number(z.weeklyCharge||0))]}),e.jsx("td",{children:e.jsx("span",{className:`badge ${z.agentBillingStatus==="unpaid"?"warning":"active"}`,children:z.agentBillingStatus||"paid"})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>U(z),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>O(z),children:"View"}),e.jsx("button",{className:"btn-small",onClick:()=>{h(z),w(!0)},children:"Permissions"}),e.jsx("button",{className:"btn-small",onClick:()=>I(z),children:"Adjust Balance"}),e.jsx("button",{className:`btn-small ${z.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>j(z),children:z.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>oe(z),children:"Reset Pass"})]})]},z.id))})]})})}),e.jsx("style",{children:`
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
      `})]})}const cd=Object.freeze(Object.defineProperty({__proto__:null,default:$o},Symbol.toStringTag,{value:"Module"}));function Ro(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(!1),[g,y]=r.useState(!1),[f,L]=r.useState(!1),[x,w]=r.useState(null),[p,h]=r.useState({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),[C,J]=r.useState({id:"",phoneNumber:"",password:""}),[B,R]=r.useState(null),[S,v]=r.useState("");r.useEffect(()=>{o(),_()},[]);const _=async()=>{try{const k=localStorage.getItem("token");if(k){const se=await es(k);v(se?.username||"")}}catch(k){console.error("Failed to fetch profile:",k)}},o=async()=>{try{const k=localStorage.getItem("token");if(!k)return;const se=await tl(k);s(se||[]),R(null)}catch(k){console.error("Failed to fetch agents:",k),R(k.message||"Failed to fetch agents")}finally{n(!1)}},F=async k=>{const se=k.toUpperCase();if(h(j=>({...j,agentPrefix:se})),se.length>=2){const j=localStorage.getItem("token");try{const{nextUsername:U}=await Ot(se,j,{type:"agent"});h(H=>({...H,username:U}))}catch(U){console.error("Failed to get next username from prefix:",U)}}else h(j=>({...j,username:""}))},D=async k=>{k.preventDefault();try{const se=localStorage.getItem("token");if(!se)throw new Error("No token found");const j=await Ua(p,se);alert(j?.assigned?"Agent assigned successfully":"Agent created successfully"),d(!1),h({username:"",phoneNumber:"",password:"",fullName:"",agentPrefix:"",role:"agent"}),o()}catch(se){alert("Failed to create agent: "+se.message)}},u=k=>{J({id:k.id,phoneNumber:k.phoneNumber||"",password:""}),w(k),y(!0)},q=async k=>{k.preventDefault();try{const se=localStorage.getItem("token"),j={phoneNumber:C.phoneNumber};C.password&&(j.password=C.password),await ys(C.id,j,se),alert("Agent updated successfully"),y(!1),o()}catch(se){alert("Failed to update agent: "+se.message)}},ge=async k=>{const se=k.status==="suspended",j=se?"unsuspend":"suspend";if(window.confirm(`Are you sure you want to ${j} ${k.username}?`))try{const U=localStorage.getItem("token");se?await cr(k.id,U):await or(k.id,U),o()}catch(U){alert(`Failed to ${j} agent: `+U.message)}},G=async k=>{const se=window.prompt(`Enter new password for agent ${k.username}:`);if(se)try{const j=localStorage.getItem("token");await dr(k.id,se,j),alert("Password reset successful")}catch(j){alert("Reset failed: "+j.message)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Agent Management"}),localStorage.getItem("userRole")!=="admin"&&e.jsx("button",{className:"btn-primary",onClick:()=>{d(!0),S&&F(S)},children:"Add Agent"})]}),l&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsx("h3",{children:"New Agent"}),e.jsxs("form",{onSubmit:D,children:[!S&&e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Prefix"}),e.jsx("input",{type:"text",value:p.agentPrefix,onChange:k=>F(k.target.value),placeholder:"Enter prefix",maxLength:5,required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role"}),e.jsxs("select",{value:p.role,onChange:k=>h({...p,role:k.target.value}),style:{width:"100%",padding:"0.5rem",background:"#333",color:"white",marginBottom:"1rem",border:"1px solid #444"},children:[e.jsx("option",{value:"agent",children:"Agent"}),e.jsx("option",{value:"master_agent",children:"Master Agent"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username"}),e.jsx("input",{type:"text",value:p.username,readOnly:!0,style:{background:"#222",color:"#888"}})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:p.phoneNumber,onChange:k=>h({...p,phoneNumber:k.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Password"}),e.jsx("input",{type:"password",value:p.password,onChange:k=>h({...p,password:k.target.value}),required:!0})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Create"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>d(!1),children:"Cancel"})]})]})]})}),g&&e.jsx("div",{className:"modal-overlay",children:e.jsxs("div",{className:"modal-content",children:[e.jsxs("h3",{children:["Edit Sub-Agent: ",x?.username]}),e.jsxs("form",{onSubmit:q,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:C.phoneNumber,onChange:k=>J({...C,phoneNumber:k.target.value}),required:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"New Password (leave blank to keep)"}),e.jsx("input",{type:"password",value:C.password,onChange:k=>J({...C,password:k.target.value})})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"submit",className:"btn-primary",children:"Save Changes"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"})]})]})]})}),f&&x&&e.jsx(jr,{agent:x,onClose:()=>L(!1),onUpdate:o}),e.jsx("div",{className:"view-content",children:e.jsx("div",{className:"table-container",children:e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Username"}),e.jsx("th",{children:"Phone Number"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Users"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Actions"})]})}),e.jsx("tbody",{children:a?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"Loading agents..."})}):B?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",className:"error",children:B})}):t.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"7",children:"No agents found."})}):t.map(k=>e.jsxs("tr",{children:[e.jsx("td",{children:k.username}),e.jsx("td",{children:k.phoneNumber}),e.jsx("td",{children:e.jsx("span",{className:"badge",children:k.role==="master_agent"?"Master Agent":"Agent"})}),e.jsx("td",{children:e.jsx("span",{className:`badge ${k.status}`,children:k.status})}),e.jsx("td",{children:k.userCount||0}),e.jsxs("td",{children:["$",Math.round(Number(k.balance||0))]}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>u(k),children:"Edit"}),e.jsx("button",{className:"btn-small",onClick:()=>{w(k),L(!0)},children:"Perms"}),e.jsx("button",{className:`btn-small ${k.status==="suspended"?"btn-success":"btn-danger"}`,onClick:()=>ge(k),children:k.status==="suspended"?"Activate":"Deactivate"}),e.jsx("button",{className:"btn-small btn-secondary",onClick:()=>G(k),children:"Reset Pass"})]})]},k.id))})]})})}),e.jsx("style",{children:`
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
      `})]})}const dd=Object.freeze(Object.defineProperty({__proto__:null,default:Ro},Symbol.toStringTag,{value:"Module"}));function Oo(){const[t,s]=r.useState([]),[a,n]=r.useState({paid:0,outstanding:0,total:0}),[l,d]=r.useState(!0),[g,y]=r.useState(""),[f,L]=r.useState(!1),[x,w]=r.useState(!1),[p,h]=r.useState(null),[C,J]=r.useState(null),[B,R]=r.useState("all"),[S,v]=r.useState({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),_=async()=>{const G=localStorage.getItem("token");if(!G){y("Please login to view billing."),d(!1);return}try{d(!0);const[k,se]=await Promise.all([al(G),nl({status:B,limit:200},G)]);n(k||{paid:0,outstanding:0,total:0}),s(se.invoices||[]),y("")}catch(k){console.error("Failed to load billing:",k),y(k.message||"Failed to load billing")}finally{d(!1)}};r.useEffect(()=>{_()},[B]);const o=G=>{if(G==null)return"—";const k=Number(G);return Number.isNaN(k)?"—":`$${Math.round(k)}`},F=()=>{v({invoiceNumber:"",amount:"",status:"pending",dueDate:"",notes:""}),L(!0)},D=G=>{h(G),w(!0)},u=async()=>{const G=localStorage.getItem("token");if(!G){y("Please login to save invoices.");return}try{J("new"),await rl({invoiceNumber:S.invoiceNumber.trim(),amount:Number(S.amount)||0,status:S.status,dueDate:S.dueDate||null,notes:S.notes.trim()||null},G),L(!1),_()}catch(k){y(k.message||"Failed to create invoice")}finally{J(null)}},q=async G=>{const k=localStorage.getItem("token");if(!k){y("Please login to update invoices.");return}try{J(G.id),await il(G.id,{status:"paid"},k),_()}catch(se){y(se.message||"Failed to update invoice")}finally{J(null)}},ge=G=>{const k=JSON.stringify(G,null,2),se=new Blob([k],{type:"application/json"}),j=URL.createObjectURL(se),U=document.createElement("a");U.href=j,U.download=`${G.invoice||"invoice"}.json`,U.click(),URL.revokeObjectURL(j)};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Billing Management"}),e.jsx("button",{className:"btn-primary",onClick:F,children:"Create Invoice"})]}),e.jsxs("div",{className:"view-content",children:[l&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading billing..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!l&&!g&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"billing-summary",children:[e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Paid"}),e.jsx("p",{className:"amount",children:o(a.paid)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total Outstanding"}),e.jsx("p",{className:"amount",children:o(a.outstanding)})]}),e.jsxs("div",{className:"summary-card",children:[e.jsx("h3",{children:"Total All Time"}),e.jsx("p",{className:"amount",children:o(a.total)})]})]}),e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:B,onChange:G=>R(G.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]})}),e.jsxs("div",{className:"table-container",children:[e.jsx("h3",{children:"Recent Invoices"}),e.jsxs("table",{className:"data-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Invoice #"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Amount"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Action"})]})}),e.jsx("tbody",{children:t.map(G=>e.jsxs("tr",{children:[e.jsx("td",{children:G.invoice}),e.jsx("td",{children:G.date?new Date(G.date).toLocaleDateString():"—"}),e.jsx("td",{children:o(G.amount)}),e.jsx("td",{children:e.jsx("span",{className:`badge ${G.status}`,children:G.status})}),e.jsxs("td",{children:[e.jsx("button",{className:"btn-small",onClick:()=>ge(G),children:"Download"}),e.jsx("button",{className:"btn-small",onClick:()=>D(G),children:"View"}),G.status!=="paid"&&e.jsx("button",{className:"btn-small",onClick:()=>q(G),disabled:C===G.id,children:C===G.id?"Working...":"Mark Paid"})]})]},G.id))})]})]})]})]}),f&&e.jsx("div",{className:"modal-overlay",onClick:()=>L(!1),children:e.jsxs("div",{className:"modal-content",onClick:G=>G.stopPropagation(),children:[e.jsx("h3",{children:"Create Invoice"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Invoice #"}),e.jsx("input",{type:"text",value:S.invoiceNumber,onChange:G=>v(k=>({...k,invoiceNumber:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",value:S.amount,onChange:G=>v(k=>({...k,amount:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:S.status,onChange:G=>v(k=>({...k,status:G.target.value})),children:[e.jsx("option",{value:"pending",children:"Pending"}),e.jsx("option",{value:"paid",children:"Paid"}),e.jsx("option",{value:"overdue",children:"Overdue"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Due Date"}),e.jsx("input",{type:"date",value:S.dueDate,onChange:G=>v(k=>({...k,dueDate:G.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Notes"}),e.jsx("input",{type:"text",value:S.notes,onChange:G=>v(k=>({...k,notes:G.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>L(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:u,disabled:C||!S.invoiceNumber.trim()||!S.amount,children:C?"Saving...":"Save"})]})]})}),x&&p&&e.jsx("div",{className:"modal-overlay",onClick:()=>w(!1),children:e.jsxs("div",{className:"modal-content",onClick:G=>G.stopPropagation(),children:[e.jsx("h3",{children:"Invoice Details"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"Invoice:"})," ",p.invoice]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Amount:"})," ",o(p.amount)]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Status:"})," ",p.status]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Date:"})," ",p.date?new Date(p.date).toLocaleString():"—"]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Due Date:"})," ",p.dueDate?new Date(p.dueDate).toLocaleDateString():"—"]}),p.notes&&e.jsxs("p",{children:[e.jsx("strong",{children:"Notes:"})," ",p.notes]})]}),e.jsx("div",{className:"modal-actions",children:e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>w(!1),children:"Close"})})]})})]})}const ud=Object.freeze(Object.defineProperty({__proto__:null,default:Oo},Symbol.toStringTag,{value:"Module"}));function _o(){const[t,s]=r.useState({platformName:"Sports Betting Platform",dailyBetLimit:"10000",weeklyBetLimit:"50000",maxOdds:"100",minBet:"1",maxBet:"5000",maintenanceMode:!1,smsNotifications:!0,twoFactor:!0}),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1);r.useEffect(()=>{(async()=>{const w=localStorage.getItem("token");if(!w){d("Please login to load settings."),n(!1);return}try{n(!0);const p=await ll(w);s({platformName:p.platformName,dailyBetLimit:p.dailyBetLimit,weeklyBetLimit:p.weeklyBetLimit,maxOdds:p.maxOdds,minBet:p.minBet,maxBet:p.maxBet,maintenanceMode:p.maintenanceMode,smsNotifications:p.smsNotifications,twoFactor:p.twoFactor}),d("")}catch(p){console.error("Failed to load settings:",p),d(p.message||"Failed to load settings")}finally{n(!1)}})()},[]);const f=x=>{const{name:w,value:p,type:h,checked:C}=x.target;s(J=>({...J,[w]:h==="checkbox"?C:p}))},L=async()=>{const x=localStorage.getItem("token");if(!x){d("Please login to save settings.");return}try{y(!0),await ol(t,x),d("")}catch(w){d(w.message||"Failed to save settings")}finally{y(!1)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Platform Settings"})}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading settings..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"settings-container",children:e.jsxs("form",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"General Settings"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Platform Name:"}),e.jsx("input",{type:"text",name:"platformName",value:t.platformName,onChange:f})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Bet Limits"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Daily Bet Limit ($):"}),e.jsx("input",{type:"number",name:"dailyBetLimit",value:t.dailyBetLimit,onChange:f})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Weekly Bet Limit ($):"}),e.jsx("input",{type:"number",name:"weeklyBetLimit",value:t.weeklyBetLimit,onChange:f})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Max Odds:"}),e.jsx("input",{type:"number",name:"maxOdds",value:t.maxOdds,onChange:f,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Minimum Bet ($):"}),e.jsx("input",{type:"number",name:"minBet",value:t.minBet,onChange:f,step:"0.01"})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Maximum Bet ($):"}),e.jsx("input",{type:"number",name:"maxBet",value:t.maxBet,onChange:f})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Security Settings"}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"twoFactor",checked:t.twoFactor,onChange:f,id:"twoFactor"}),e.jsx("label",{htmlFor:"twoFactor",children:"Require Two-Factor Authentication"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"maintenanceMode",checked:t.maintenanceMode,onChange:f,id:"maintenanceMode"}),e.jsx("label",{htmlFor:"maintenanceMode",children:"Maintenance Mode"})]}),e.jsxs("div",{className:"form-group checkbox",children:[e.jsx("input",{type:"checkbox",name:"smsNotifications",checked:t.smsNotifications,onChange:f,id:"smsNotifications"}),e.jsx("label",{htmlFor:"smsNotifications",children:"Enable SMS Notifications"})]})]}),e.jsxs("div",{className:"form-actions",children:[e.jsx("button",{type:"button",onClick:L,className:"btn-primary",disabled:g,children:g?"Saving...":"Save Settings"}),e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>window.location.reload(),children:"Reset"})]})]})})]})]})}const md=Object.freeze(Object.defineProperty({__proto__:null,default:_o},Symbol.toStringTag,{value:"Module"}));function Uo(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1),[f,L]=r.useState(null),[x,w]=r.useState({title:"",items:"",status:"active"}),[p,h]=r.useState(null),C=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to view rules."),n(!1);return}try{n(!0);const _=await cl(v);s(_.rules||[]),d("")}catch(_){console.error("Failed to load rules:",_),d(_.message||"Failed to load rules")}finally{n(!1)}};r.useEffect(()=>{C()},[]);const J=()=>{L(null),w({title:"",items:"",status:"active"}),y(!0)},B=v=>{L(v),w({title:v.title,items:(v.items||[]).join(`
`),status:v.status||"active"}),y(!0)},R=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to save rules.");return}try{h(f?.id||"new");const _={title:x.title.trim(),items:x.items.split(`
`).map(o=>o.trim()).filter(Boolean),status:x.status};f?await ul(f.id,_,v):await dl(_,v),y(!1),C()}catch(_){d(_.message||"Failed to save rule")}finally{h(null)}},S=async v=>{const _=localStorage.getItem("token");if(!_){d("Please login to delete rules.");return}try{h(v),await ml(v,_),s(o=>o.filter(F=>F.id!==v))}catch(o){d(o.message||"Failed to delete rule")}finally{h(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"Rules & Regulations"}),e.jsx("button",{className:"btn-primary",onClick:J,children:"Add New Rule"})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading rules..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"rules-container",children:t.map(v=>e.jsxs("div",{className:"rule-card",children:[e.jsx("h3",{children:v.title}),e.jsx("ul",{children:(v.items||[]).map((_,o)=>e.jsx("li",{children:_},o))}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>B(v),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>S(v.id),disabled:p===v.id,children:p===v.id?"Working...":"Delete"})]})]},v.id))})]}),g&&e.jsx("div",{className:"modal-overlay",onClick:()=>y(!1),children:e.jsxs("div",{className:"modal-content",onClick:v=>v.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Rule":"Add Rule"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:x.title,onChange:v=>w(_=>({..._,title:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Items (one per line)"}),e.jsx("textarea",{rows:"6",value:x.items,onChange:v=>w(_=>({..._,items:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:x.status,onChange:v=>w(_=>({..._,status:v.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:R,disabled:p||!x.title.trim(),children:p?"Saving...":"Save"})]})]})})]})}const hd=Object.freeze(Object.defineProperty({__proto__:null,default:Uo},Symbol.toStringTag,{value:"Module"}));function Wo(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState("all"),[f,L]=r.useState(null),[x,w]=r.useState(""),[p,h]=r.useState(!1),[C,J]=r.useState(null),B=async()=>{const o=localStorage.getItem("token");if(!o){d("Please login to view feedback."),n(!1);return}try{n(!0);const F=await hl({status:g},o);s(F.feedbacks||[]),d("")}catch(F){console.error("Failed to load feedback:",F),d(F.message||"Failed to load feedback")}finally{n(!1)}};r.useEffect(()=>{B()},[g]);const R=o=>{L(o),w(o.adminReply||""),h(!0)},S=async()=>{const o=localStorage.getItem("token");if(!o){d("Please login to reply.");return}try{J(f.id),await pl(f.id,{reply:x},o),h(!1),B()}catch(F){d(F.message||"Failed to reply")}finally{J(null)}},v=async o=>{const F=localStorage.getItem("token");if(!F){d("Please login to mark reviewed.");return}try{J(o),await gl(o,F),B()}catch(D){d(D.message||"Failed to mark reviewed")}finally{J(null)}},_=async o=>{const F=localStorage.getItem("token");if(!F){d("Please login to delete feedback.");return}try{J(o),await xl(o,F),s(D=>D.filter(u=>u.id!==o))}catch(D){d(D.message||"Failed to delete feedback")}finally{J(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"Customer Feedback"})}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading feedback..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"filter-section",children:e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:g,onChange:o=>y(o.target.value),children:[e.jsx("option",{value:"all",children:"All"}),e.jsx("option",{value:"new",children:"New"}),e.jsx("option",{value:"reviewed",children:"Reviewed"})]})]})}),e.jsx("div",{className:"feedback-container",children:t.map(o=>e.jsxs("div",{className:"feedback-card",children:[e.jsxs("div",{className:"feedback-header",children:[e.jsx("h4",{children:o.user}),e.jsx("div",{className:"rating",children:"⭐".repeat(o.rating||0)}),e.jsx("span",{className:"date",children:o.date?new Date(o.date).toLocaleDateString():"—"})]}),e.jsx("p",{className:"feedback-message",children:o.message}),o.adminReply&&e.jsxs("p",{className:"feedback-message",children:[e.jsx("strong",{children:"Reply:"})," ",o.adminReply]}),e.jsxs("div",{className:"feedback-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>R(o),children:"Reply"}),e.jsx("button",{className:"btn-small",onClick:()=>v(o.id),disabled:C===o.id,children:C===o.id?"Working...":"Mark as Reviewed"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>_(o.id),disabled:C===o.id,children:C===o.id?"Working...":"Delete"})]})]},o.id))})]})]}),p&&f&&e.jsx("div",{className:"modal-overlay",onClick:()=>h(!1),children:e.jsxs("div",{className:"modal-content",onClick:o=>o.stopPropagation(),children:[e.jsx("h3",{children:"Reply to Feedback"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("p",{children:[e.jsx("strong",{children:"User:"})," ",f.user]}),e.jsxs("p",{children:[e.jsx("strong",{children:"Message:"})," ",f.message]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Reply"}),e.jsx("textarea",{rows:"4",value:x,onChange:o=>w(o.target.value)})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>h(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:S,disabled:C===f.id||!x.trim(),children:C===f.id?"Saving...":"Save Reply"})]})]})})]})}const pd=Object.freeze(Object.defineProperty({__proto__:null,default:Wo},Symbol.toStringTag,{value:"Module"}));function zo(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1),[f,L]=r.useState(null),[x,w]=r.useState({question:"",answer:"",status:"active",order:0}),[p,h]=r.useState(null),C=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to view FAQs."),n(!1);return}try{n(!0);const _=await fl(v);s(_.faqs||[]),d("")}catch(_){console.error("Failed to load FAQs:",_),d(_.message||"Failed to load FAQs")}finally{n(!1)}};r.useEffect(()=>{C()},[]);const J=()=>{L(null),w({question:"",answer:"",status:"active",order:0}),y(!0)},B=v=>{L(v),w({question:v.question,answer:v.answer,status:v.status||"active",order:v.order||0}),y(!0)},R=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to save FAQs.");return}try{h(f?.id||"new");const _={question:x.question.trim(),answer:x.answer.trim(),status:x.status,order:Number(x.order)||0};f?await jl(f.id,_,v):await bl(_,v),y(!1),C()}catch(_){d(_.message||"Failed to save FAQ")}finally{h(null)}},S=async v=>{const _=localStorage.getItem("token");if(!_){d("Please login to delete FAQs.");return}try{h(v),await yl(v,_),s(o=>o.filter(F=>F.id!==v))}catch(o){d(o.message||"Failed to delete FAQ")}finally{h(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"FAQ Management"}),e.jsx("button",{className:"btn-primary",onClick:J,children:"Add New FAQ"})]}),e.jsxs("div",{className:"view-content",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading FAQs..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&e.jsx("div",{className:"faq-container",children:t.map(v=>e.jsxs("div",{className:"faq-item",children:[e.jsxs("div",{className:"faq-question",children:[e.jsxs("h4",{children:["Q: ",v.question]}),e.jsx("button",{className:"btn-small",onClick:()=>B(v),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>S(v.id),disabled:p===v.id,children:p===v.id?"Working...":"Delete"})]}),e.jsx("div",{className:"faq-answer",children:e.jsxs("p",{children:["A: ",v.answer]})})]},v.id))})]}),g&&e.jsx("div",{className:"modal-overlay",onClick:()=>y(!1),children:e.jsxs("div",{className:"modal-content",onClick:v=>v.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit FAQ":"Add FAQ"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Question"}),e.jsx("input",{type:"text",value:x.question,onChange:v=>w(_=>({..._,question:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Answer"}),e.jsx("textarea",{rows:"4",value:x.answer,onChange:v=>w(_=>({..._,answer:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:x.status,onChange:v=>w(_=>({..._,status:v.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:x.order,onChange:v=>w(_=>({..._,order:v.target.value}))})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:R,disabled:p||!x.question.trim()||!x.answer.trim(),children:p?"Saving...":"Save"})]})]})})]})}const gd=Object.freeze(Object.defineProperty({__proto__:null,default:zo},Symbol.toStringTag,{value:"Module"}));function Vo(){const[t,s]=r.useState([]),[a,n]=r.useState(!0),[l,d]=r.useState(""),[g,y]=r.useState(!1),[f,L]=r.useState(null),[x,w]=r.useState({title:"",content:"",order:0,status:"active"}),[p,h]=r.useState(null),C=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to view manual."),n(!1);return}try{n(!0);const _=await vl(v);s(_.sections||[]),d("")}catch(_){console.error("Failed to load manual:",_),d(_.message||"Failed to load manual")}finally{n(!1)}};r.useEffect(()=>{C()},[]);const J=()=>{L(null),w({title:"",content:"",order:0,status:"active"}),y(!0)},B=v=>{L(v),w({title:v.title,content:v.content,order:v.order||0,status:v.status||"active"}),y(!0)},R=async()=>{const v=localStorage.getItem("token");if(!v){d("Please login to save manual sections.");return}try{h(f?.id||"new");const _={title:x.title.trim(),content:x.content.trim(),order:Number(x.order)||0,status:x.status};f?await Nl(f.id,_,v):await wl(_,v),y(!1),C()}catch(_){d(_.message||"Failed to save section")}finally{h(null)}},S=async v=>{const _=localStorage.getItem("token");if(!_){d("Please login to delete sections.");return}try{h(v),await Sl(v,_),s(o=>o.filter(F=>F.id!==v))}catch(o){d(o.message||"Failed to delete section")}finally{h(null)}};return e.jsxs("div",{className:"admin-view",children:[e.jsxs("div",{className:"view-header",children:[e.jsx("h2",{children:"User Manual"}),e.jsx("button",{className:"btn-primary",onClick:J,children:"Add Section"})]}),e.jsx("div",{className:"view-content",children:e.jsxs("div",{className:"manual-container",children:[a&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading manual..."}),l&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:l}),!a&&!l&&t.map(v=>e.jsxs("section",{className:"manual-section",children:[e.jsx("h3",{children:v.title}),e.jsx("p",{children:v.content}),e.jsxs("div",{className:"table-actions",children:[e.jsx("button",{className:"btn-small",onClick:()=>B(v),children:"Edit"}),e.jsx("button",{className:"btn-small btn-danger",onClick:()=>S(v.id),disabled:p===v.id,children:p===v.id?"Working...":"Delete"})]})]},v.id))]})}),g&&e.jsx("div",{className:"modal-overlay",onClick:()=>y(!1),children:e.jsxs("div",{className:"modal-content",onClick:v=>v.stopPropagation(),children:[e.jsx("h3",{children:f?"Edit Section":"Add Section"}),e.jsxs("div",{className:"view-details",children:[e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Title"}),e.jsx("input",{type:"text",value:x.title,onChange:v=>w(_=>({..._,title:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Content"}),e.jsx("textarea",{rows:"6",value:x.content,onChange:v=>w(_=>({..._,content:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Order"}),e.jsx("input",{type:"number",value:x.order,onChange:v=>w(_=>({..._,order:v.target.value}))})]}),e.jsxs("div",{className:"filter-group",children:[e.jsx("label",{children:"Status"}),e.jsxs("select",{value:x.status,onChange:v=>w(_=>({..._,status:v.target.value})),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"inactive",children:"Inactive"})]})]})]}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{type:"button",className:"btn-secondary",onClick:()=>y(!1),children:"Cancel"}),e.jsx("button",{type:"button",className:"btn-primary",onClick:R,disabled:p||!x.title.trim()||!x.content.trim(),children:p?"Saving...":"Save"})]})]})})]})}const xd=Object.freeze(Object.defineProperty({__proto__:null,default:Vo},Symbol.toStringTag,{value:"Module"})),Ho=()=>{const[t,s]=r.useState(null),[a,n]=r.useState(null),[l,d]=r.useState(!0),[g,y]=r.useState(null),f=async()=>{try{const R=localStorage.getItem("token");if(!R)throw new Error("Please login to view system monitor");const[S,v]=await Promise.all([vi(R),wi(R)]);s(S),n(v),y(new Date),d(!1)}catch(R){console.error("Monitor Error:",R),d(!1)}};if(r.useEffect(()=>{f();const R=setInterval(()=>{document.hidden||f()},6e4),S=()=>{document.hidden||f()};return document.addEventListener("visibilitychange",S),()=>{clearInterval(R),document.removeEventListener("visibilitychange",S)}},[]),l&&!t)return e.jsx("div",{className:"admin-content-card",children:"Loading System Monitor..."});const L=t?.counts||{users:0,bets:0,matches:0},x=t?.liveMatches||[],w=a?.items||[],p=a?.summary||{links:0,collections:0,rows:0},h=t?.sportsbookHealth||{},C=h?.oddsSync||{},J=h?.settlement||{},B=async()=>{try{const R=localStorage.getItem("token");if(!R)throw new Error("Please login first");const S=await ir(R);alert(`Odds Refreshed! Created: ${S.results?.created||0}, Updated: ${S.results?.updated||0}, Score-only updates: ${S.results?.scoreOnlyUpdates||0}, Settled: ${S.results?.settled||0}`),f()}catch(R){console.error("Refresh error:",R),alert(R.message||"Error refreshing odds")}};return e.jsxs("div",{className:"admin-view-container",children:[e.jsxs("div",{className:"monitor-header",style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[e.jsx("h2",{style:{color:"#fff",margin:0},children:"System Monitor"}),e.jsxs("div",{style:{color:"#aaa",fontSize:"0.9rem"},children:["Last updated: ",g?g.toLocaleTimeString():"Never"]}),e.jsx("button",{onClick:B,style:{background:"#e67e22",color:"white",border:"none",padding:"8px 16px",borderRadius:"4px",cursor:"pointer",fontWeight:"bold"},children:"🔄 Refresh Live Odds"})]}),e.jsxs("div",{className:"stats-grid",children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-users"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Users"}),e.jsx("p",{children:L.users})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-ticket"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Total Bets"}),e.jsx("p",{children:L.bets})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-futbol"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Tracked Matches"}),e.jsx("p",{children:L.matches})]})]})]}),e.jsxs("div",{className:"admin-content-card",style:{marginBottom:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-heart-pulse"})," Sportsbook Feed Health"]})}),e.jsxs("div",{className:"stats-grid",style:{marginBottom:0},children:[e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon matches",children:e.jsx("i",{className:"fa-solid fa-signal"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Odds Feed"}),e.jsx("p",{children:C?.bettingSuspended?"STALE / CLOSED":"OK"}),e.jsxs("small",{children:["Last odds sync: ",C?.lastOddsSuccessAt?new Date(C.lastOddsSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Age: ",C?.syncAgeSeconds??"—","s"]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon bets",children:e.jsx("i",{className:"fa-solid fa-flag-checkered"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Results Feed"}),e.jsx("p",{children:C?.lastScoresSuccessAt?"SYNCING":"UNKNOWN"}),e.jsxs("small",{children:["Last score sync: ",C?.lastScoresSuccessAt?new Date(C.lastScoresSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Failures: ",C?.consecutiveFailures??0]})]})]}),e.jsxs("div",{className:"stat-card",children:[e.jsx("div",{className:"stat-icon users",children:e.jsx("i",{className:"fa-solid fa-scale-balanced"})}),e.jsxs("div",{className:"stat-info",children:[e.jsx("h3",{children:"Settlement"}),e.jsx("p",{children:J?.lastRunStatus||"unknown"}),e.jsxs("small",{children:["Last success: ",J?.lastSuccessAt?new Date(J.lastSuccessAt).toLocaleString():"Never"]}),e.jsxs("small",{style:{display:"block"},children:["Last match: ",J?.lastMatchId||"—"]})]})]})]}),(C?.lastError||J?.lastError)&&e.jsxs("div",{style:{marginTop:"16px",padding:"12px",borderRadius:"8px",background:"rgba(255, 80, 80, 0.12)",color:"#ffb3b3"},children:[e.jsxs("div",{children:[e.jsx("strong",{children:"Last sync error:"})," ",C?.lastError||"—"]}),e.jsxs("div",{children:[e.jsx("strong",{children:"Last settlement error:"})," ",J?.lastError||"—"]})]})]}),e.jsxs("div",{className:"admin-content-card",children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-satellite-dish"})," Live & Scored Matches (DB View)"]})}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Sport"}),e.jsx("th",{children:"Match"}),e.jsx("th",{children:"Scores"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last Updated"})]})}),e.jsx("tbody",{children:x.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"5",className:"text-center",children:"No live or scored matches found."})}):x.map(R=>e.jsxs("tr",{children:[e.jsx("td",{children:R.sport?.replace("_"," ").toUpperCase()}),e.jsxs("td",{children:[R.homeTeam," ",e.jsx("span",{className:"vs",children:"vs"})," ",R.awayTeam]}),e.jsxs("td",{className:"score-cell",children:[e.jsx("span",{className:"score-badge home",children:R.score?.score_home??R.score?.scoreHome??0}),"-",e.jsx("span",{className:"score-badge away",children:R.score?.score_away??R.score?.scoreAway??0})]}),e.jsx("td",{children:e.jsx("span",{className:`status-badge ${R.status}`,children:R.status})}),e.jsx("td",{children:new Date(R.lastUpdated).toLocaleTimeString()})]},R.id))})]})})]}),e.jsxs("div",{className:"admin-content-card",style:{marginTop:"20px"},children:[e.jsx("div",{className:"card-header",children:e.jsxs("h3",{children:[e.jsx("i",{className:"fa-solid fa-diagram-project"})," Dashboard Link to Entity/Table Map"]})}),e.jsxs("div",{style:{color:"#666",marginBottom:"10px",fontSize:"0.9rem"},children:["Links: ",p.links," | Collections: ",p.collections," | Total Rows: ",p.rows]}),e.jsx("div",{className:"table-responsive",children:e.jsxs("table",{className:"admin-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Dashboard Link"}),e.jsx("th",{children:"Collections"}),e.jsx("th",{children:"Tables / Views"}),e.jsx("th",{children:"API Routes"})]})}),e.jsx("tbody",{children:w.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:"4",className:"text-center",children:"No entity catalog data found."})}):w.map(R=>e.jsxs("tr",{children:[e.jsxs("td",{children:[e.jsx("strong",{children:R.label}),e.jsx("div",{style:{fontSize:"0.8rem",color:"#666"},children:R.id})]}),e.jsx("td",{children:(R.collections||[]).map(S=>e.jsxs("div",{style:{marginBottom:"4px"},children:[e.jsx("code",{children:S.collection})," (",S.rows,")"]},`${R.id}-${S.collection}`))}),e.jsx("td",{children:(R.collections||[]).map(S=>e.jsxs("div",{style:{marginBottom:"4px",fontSize:"0.85rem"},children:[e.jsxs("div",{children:[e.jsx("code",{children:S.table})," ",S.exists?"":"(missing)"]}),e.jsxs("div",{children:[e.jsx("code",{children:S.entityView})," | ",e.jsx("code",{children:S.flatTable})]})]},`${R.id}-${S.collection}-table`))}),e.jsx("td",{children:(R.routes||[]).map(S=>e.jsx("div",{style:{marginBottom:"2px",fontSize:"0.85rem"},children:e.jsx("code",{children:S})},`${R.id}-${S}`))})]},R.id))})]})})]}),e.jsx("style",{children:`
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
            `})]})},fd=Object.freeze(Object.defineProperty({__proto__:null,default:Ho},Symbol.toStringTag,{value:"Module"})),Ms=t=>{const s=Number(t);return Number.isNaN(s)?"—":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(s)};function qo(){const[t,s]=r.useState(null),[a,n]=r.useState(null),[l,d]=r.useState(!0),[g,y]=r.useState(""),[f,L]=r.useState(!1),x=async w=>{const p=w.target.value;L(!0);try{const h=localStorage.getItem("token");await gi({dashboardLayout:p},h),s(C=>({...C,dashboardLayout:p})),alert("Layout updated. The page will reload to apply changes."),window.location.reload()}catch(h){alert("Failed to update layout: "+h.message)}finally{L(!1)}};return r.useEffect(()=>{(async()=>{const p=localStorage.getItem("token");if(!p){y("Please login to view profile."),d(!1);return}try{d(!0);const h=await es(p);if(s(h),String(h?.role||"").toLowerCase()==="agent")try{const J=await sr(p);n(Number(J?.balanceOwed??0))}catch(J){console.error("Failed to load settlement balance:",J),n(null)}else n(null);y("")}catch(h){y(h.message||"Failed to load profile")}finally{d(!1)}})()},[]),e.jsxs("div",{className:"admin-view",children:[e.jsx("div",{className:"view-header",children:e.jsx("h2",{children:"My Profile"})}),e.jsxs("div",{className:"view-content",children:[l&&e.jsx("div",{style:{padding:"20px",textAlign:"center"},children:"Loading profile..."}),g&&e.jsx("div",{style:{padding:"20px",color:"red",textAlign:"center"},children:g}),!l&&!g&&t&&e.jsx("div",{className:"settings-container",children:e.jsxs("div",{className:"settings-form",children:[e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Account"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Username:"}),e.jsx("input",{type:"text",value:t.username||"",readOnly:!0})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Preferences"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Dashboard Layout:"}),e.jsxs("select",{value:t.dashboardLayout||"tiles",onChange:x,disabled:f,style:{padding:"8px",borderRadius:"4px",border:"1px solid #ccc"},children:[e.jsx("option",{value:"tiles",children:"Tiles (Default)"}),e.jsx("option",{value:"sidebar",children:"Sidebar Navigation"})]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Phone Number:"}),e.jsx("input",{type:"text",value:t.phoneNumber||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Role:"}),e.jsx("input",{type:"text",value:t.role||"",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Super Admin:"}),e.jsx("input",{type:"text",value:t.isSuperAdmin?"Yes":"No",readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Unlimited Balance:"}),e.jsx("input",{type:"text",value:t.unlimitedBalance?"Enabled":"Disabled",readOnly:!0})]})]}),e.jsxs("div",{className:"form-section",children:[e.jsx("h3",{children:"Balances"}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Balance:"}),e.jsx("input",{type:"text",value:Ms(t.balance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Pending Balance:"}),e.jsx("input",{type:"text",value:Ms(t.pendingBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Available Balance:"}),e.jsx("input",{type:"text",value:Ms(t.availableBalance),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:String(t.role||"").toLowerCase()==="agent"?"Settlement Balance:":"Outstanding (Settle Limit):"}),e.jsx("input",{type:"text",value:Ms(String(t.role||"").toLowerCase()==="agent"&&a!==null?a:t.balanceOwed),readOnly:!0})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{children:"Credit Limit:"}),e.jsx("input",{type:"text",value:Ms(t.creditLimit),readOnly:!0})]})]})]})})]})]})}const bd=Object.freeze(Object.defineProperty({__proto__:null,default:qo},Symbol.toStringTag,{value:"Module"})),zn={password:"",firstName:"",lastName:"",phoneNumber:"",minBet:0,agentId:"",status:"active",creditLimit:0,wagerLimit:0,settleLimit:0,accountType:"credit",zeroBalanceWeekly:"standard",tempCredit:0,expiresOn:"",enableCaptcha:!1,cryptoPromoPct:0,promoType:"promo_credit",playerNotes:"",sportsbook:!0,casino:!0,horses:!0,messaging:!1,dynamicLive:!0,propPlus:!0,liveCasino:!1,appsVenmo:"",appsCashapp:"",appsApplePay:"",appsZelle:"",appsPaypal:"",appsBtc:"",appsOther:"",freePlayPercent:20,maxFpCredit:0,dlMinStraightBet:25,dlMaxStraightBet:250,dlMaxPerOffering:500,dlMaxBetPerEvent:500,dlMaxWinSingleBet:1e3,dlMaxWinEvent:3e3,dlDelaySec:7,dlMaxFavoriteLine:-1e4,dlMaxDogLine:1e4,dlMinParlayBet:10,dlMaxParlayBet:100,dlMaxWinEventParlay:3e3,dlMaxDogLineParlays:1e3,dlWagerCoolOffSec:30,dlLiveParlays:!1,dlBlockPriorStart:!0,dlBlockHalftime:!0,dlIncludeGradedInLimits:!1,dlUseRiskLimits:!1,casinoDefaultMaxWinDay:1e4,casinoDefaultMaxLossDay:1e4,casinoDefaultMaxWinWeek:1e4,casinoDefaultMaxLossWeek:1e4,casinoAgentMaxWinDay:1e3,casinoAgentMaxLossDay:1e3,casinoAgentMaxWinWeek:5e3,casinoAgentMaxLossWeek:5e3,casinoPlayerMaxWinDay:1e3,casinoPlayerMaxLossDay:1e3,casinoPlayerMaxWinWeek:5e3,casinoPlayerMaxLossWeek:5e3},Vn=[{value:"deposit",label:"Deposits",balanceDirection:"credit",apiType:"deposit",reason:"ADMIN_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"debit",apiType:"withdrawal",reason:"ADMIN_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"ADMIN_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Hn=[{value:"deposit",label:"Deposits",balanceDirection:"debit",apiType:"deposit",reason:"AGENT_DEPOSIT",defaultDescription:"Deposits"},{value:"withdrawal",label:"Withdrawals",balanceDirection:"credit",apiType:"withdrawal",reason:"AGENT_WITHDRAWAL",defaultDescription:"Withdrawals"},{value:"credit_adj",label:"Credit Adj",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_CREDIT_ADJUSTMENT",defaultDescription:"Credit Adj"},{value:"debit_adj",label:"Debit Adj",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_DEBIT_ADJUSTMENT",defaultDescription:"Debit Adj"},{value:"promotional_credit",label:"Promotional Credit",balanceDirection:"credit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_CREDIT",defaultDescription:"Promotional Credit"},{value:"promotional_debit",label:"Promotional Debit",balanceDirection:"debit",apiType:"adjustment",reason:"AGENT_PROMOTIONAL_DEBIT",defaultDescription:"Promotional Debit"}],Go=[{value:"deposit_withdrawal",label:"Deposits/Withdrawals"},{value:"credit_debit_adjustments",label:"Credit/Debit Adjustments"},{value:"promotional_adjustments",label:"Promotional Credits/Debits"},{value:"freeplay_transactions",label:"Freeplay Transactions"},{value:"all_transactions",label:"All Transactions"},{value:"deleted_transactions",label:"Deleted Transactions"},{value:"non_wager",label:"Non-Wagers"},{value:"wagers_only",label:"Wagers"}],us=t=>String(t||"").trim().toLowerCase(),en=t=>String(t||"").trim().toUpperCase(),yr=new Set(["bet_placed","bet_placed_admin","casino_bet_debit"]),Yo=new Set([...yr,"bet_won","bet_lost","bet_refund","bet_void","bet_void_admin","casino_bet_credit"]),Jo=new Set(["bet_void","bet_void_admin","deleted_wager"]),Qo=new Set(["ADMIN_CREDIT_ADJUSTMENT","ADMIN_DEBIT_ADJUSTMENT"]),Ko=new Set(["ADMIN_PROMOTIONAL_CREDIT","ADMIN_PROMOTIONAL_DEBIT"]),Zo=new Set(["FREEPLAY_ADJUSTMENT","DEPOSIT_FREEPLAY_BONUS","REFERRAL_FREEPLAY_BONUS","NEW_PLAYER_FREEPLAY_BONUS"]),Ja=t=>{const s=us(t?.type),a=en(t?.reason),n=String(t?.description||"").toLowerCase();return s==="fp_deposit"||Zo.has(a)||(s==="adjustment"||s==="fp_deposit")&&(n.includes("freeplay")||n.includes("free play"))},Xo=t=>{const s=us(t?.type),a=en(t?.reason);return s==="credit_adj"||s==="debit_adj"||Qo.has(a)},ec=t=>{const s=en(t?.reason);return Ko.has(s)},tc=`PAYOUTS
PAY-INS are Tuesday and PAY-OUTS are Tuesday/Wednesday by end of day. Week starts Tuesday and ends Monday night. You must bet $500 of your own money to collect your FIRST payout. If your account is inactive for 2 weeks you'll be required to settle your balance even if it's under your settle limit. Max weekly payouts are 2-3x your credit limit depending on size. Balance will still be paid out but will roll to the following week.

All we ask for is communication when it comes to payouts so  we can get everyone paid quickly and as smoothly as possible. If you can't pay right away let us know and we can set up a payment schedule. We accept Venmo, Cashapp and Apple Pay. You are REQUIRED to have multiple apps to send or receive payment on. PLEASE DO NOT SEND MONEY without asking where to send first and DO NOT LABEL anything to do with sports or gambling. We will let you know Tuesday where to send.

We kick back 20% freeplay of all losses if you pay ON TIME and in FULL and 30% if you pay in CASH. If you are a hassle to collect from and don't respond or don't pay on time or in full then you will be shown the same reciprocation when it comes to payouts.

REFFERALS
$200 freeplay bonuses for any ACTIVE and TRUSTWORTHY referrals. YOU are responsible for your referrals debt if they DO NOT PAY and vice versa. Once your referral makes their first deposit, your $200 freeplay bonus is added automatically.

RULES
NO BOTS OR SHARP PLAY. We have IT monitoring to make sure there is no cheating. If we find out you are using a VPN and there are multiple people using your IP address or someone is logging into the same account, or you are using a system to place bets for you, you will be automatically kicked off and we reserve the right to not pay. No excuses. We've heard them all so don't waste your time.

FREEPLAY
I start all NEW players off with $200 in freeplay. In order to collect your winnings you have to place $500 of bets with your own money. (This is to prevent everyone who abuses the free play to win free money and leave). When you place a bet you have to click "Use your freeplay balance $" (If you don't you're using your own money). Since we are very generous with freeplay unfortunately it is limited to straight bets only and no parlays. I offer 20% free play to anyone above settle to roll your balance to limit transactions. If you chose to roll for free play you must be actively betting with your own money or your free play will not count.

I need active players so if you could do me a solid and place a bet today even if it's with freeplay. Good luck! Lmk that you've read all the rules and or if you have any questions and need me to adjust anything!`,Ra=t=>!t||typeof t!="object"?t:{...t,minBet:ke(t.minBet??t.defaultMinBet,0),maxBet:ke(t.maxBet??t.wagerLimit??t.defaultMaxBet,0),wagerLimit:ke(t.wagerLimit??t.maxBet??t.defaultMaxBet,0),creditLimit:ke(t.creditLimit??t.defaultCreditLimit,0),balanceOwed:ke(t.balanceOwed??t.defaultSettleLimit,0),balance:ke(t.balance,0),pendingBalance:ke(t.pendingBalance,0),freeplayBalance:ke(t.freeplayBalance,0),lifetime:ke(t.lifetime,0),lifetimePlusMinus:ke(t.lifetimePlusMinus??t.lifetime,0)},qn=(t,s=0)=>ke(t===""||t===null||t===void 0?s:t,0),Gn=t=>String(t||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,""),Qa=t=>us(t?.type)==="deleted_wager"?String(t?.status||"").trim().toLowerCase()==="restored"?"Changed Wager":"Deleted Transaction":pr(t),Yn=t=>{const s=String(t?.description||"").trim();if(!s)return"—";const a=Gn(s),n=Gn(Qa(t));return!a||n&&(a===n||a===`${n}s`||`${a}s`===n)?"—":s},Jn=t=>String(t?.actorUsername??t?.deletedByUsername??"").trim()||"—",Qn=t=>{if(!t)return 0;const s=t?.$date||t,n=new Date(s).getTime();return Number.isNaN(n)?0:n},sc=t=>{const s=Math.abs(Number(t?.amount||0)),a=String(t?.sport||"").trim(),n=String(t?.reason||"").trim(),l=String(t?.status||"deleted").trim().toLowerCase()||"deleted",g=[l==="restored"?"Changed Wager":"Deleted Wager"];return a&&g.push(`(${a})`),n&&g.push(`- ${n}`),{id:`deleted-wager-${String(t?.id||"")}`,type:"deleted_wager",entrySide:"CREDIT",sourceType:null,referenceType:"DeletedWager",referenceId:t?.id||null,user:t?.user||"Unknown",userId:t?.userId||null,amount:s,date:t?.deletedAt||t?.restoredAt||null,balanceBefore:null,balanceAfter:null,status:l,reason:n?n.toUpperCase().replace(/\s+/g,"_"):null,description:g.join(" ")}},ac=t=>{const s=us(t);return s==="betting_adjustments"||s==="credit_debit_adjustments"||s==="promotional_adjustments"?"adjustment":"all"},nc=(t,s)=>{const a=us(s);if(a===""||a==="all"||a==="all_transactions")return!0;const n=us(t?.type);return a==="non_wager"?!Yo.has(n):a==="deposit_withdrawal"?n==="deposit"||n==="withdrawal":a==="betting_adjustments"||a==="credit_debit_adjustments"?Xo(t):a==="promotional_adjustments"?ec(t):a==="freeplay_transactions"?Ja(t):a==="wagers_only"?yr.has(n):a==="deleted_changed"||a==="deleted_transactions"?Jo.has(n):!0},rc=t=>!t||typeof t!="object"?"":String(t.userId??t.playerId??t.user?.id??t.user?.id??"").trim(),ic=t=>!t||typeof t!="object"?"":String(t.user??t.username??t.playerUsername??t.playerName??"").trim().toLowerCase(),Oa=(t,s,a,n)=>{const l=rc(t);if(l!=="")return!!(l===String(s)||n?.id&&l===String(n.id));const d=ic(t),g=String(a||"").trim().toLowerCase();return d!==""&&g!==""?!!(d===g||n?.username&&d===String(n.username).trim().toLowerCase()):!0};function lc({userId:t,onBack:s,onNavigateToUser:a,role:n="admin",viewContext:l=null}){const[d,g]=r.useState(!0),[y,f]=r.useState(!1),[L,x]=r.useState(""),[w,p]=r.useState(""),[h,C]=r.useState(null),[J,B]=r.useState({}),[R,S]=r.useState(null),[v,_]=r.useState([]),[o,F]=r.useState(zn),[D,u]=r.useState(!1),[q,ge]=r.useState("basics"),[G,k]=r.useState([]),[se,j]=r.useState(!1),[U,H]=r.useState(""),[O,I]=r.useState(""),[oe,Te]=r.useState("7d"),[z,M]=r.useState("deposit_withdrawal"),[ee,xe]=r.useState("all"),[ne,le]=r.useState([]),[Ue,A]=r.useState(!1),[ie,c]=r.useState("deposit"),[W,de]=r.useState(""),[be,Ae]=r.useState(""),[we,Je]=r.useState(!0),[We,qe]=r.useState(!1),[ot,Qe]=r.useState(!1),[Ke,Re]=r.useState("daily"),[mt,xt]=r.useState(!1),[it,ze]=r.useState(""),[Ze,ct]=r.useState([]),[Xe,Ct]=r.useState(""),[m,$]=r.useState([]),[Z,me]=r.useState([]),[Se,fe]=r.useState(!1),[Ne,De]=r.useState(""),[Ge,wt]=r.useState(""),[Et,At]=r.useState("7d"),[tt,Nt]=r.useState([]),[_t,Tt]=r.useState(!1),[St,Mt]=r.useState("deposit"),[ts,ss]=r.useState(""),[It,Lt]=r.useState(""),[ft,ht]=r.useState(!1),[as,ns]=r.useState(!1),[$t,T]=r.useState(""),[E,ye]=r.useState(""),[V,Ee]=r.useState(!1),[Be,Ve]=r.useState(""),[Pe,Oe]=r.useState(""),[Ie,dt]=r.useState(""),[Pt,st]=r.useState(null),[bt,pt]=r.useState(!1),[gt,jt]=r.useState(""),[ut,rs]=r.useState(null),[nt,Dt]=r.useState(null),[ms,ws]=r.useState(!1),[_s,N]=r.useState(""),[Y,P]=r.useState(!1),[ae,te]=r.useState(""),[ue,he]=r.useState(""),[$e,at]=r.useState(null),[yt,Ht]=r.useState(""),[Ns,Us]=r.useState(""),[tn,Ws]=r.useState(""),[oc,vr]=r.useState(""),[zs,sn]=r.useState(""),[cc,wr]=r.useState(""),[dc,Nr]=r.useState([]),[an,Sr]=r.useState(""),[Ss,ha]=r.useState(null),[nn,rn]=r.useState(!1),[ln,Vs]=r.useState(""),[Hs,on]=r.useState(null),kr=[{id:"basics",label:"The Basics",icon:"🪪"},{id:"transactions",label:"Transactions",icon:"💳"},{id:"pending",label:"Pending",icon:"🕒"},{id:"performance",label:"Performance",icon:"📄"},{id:"analysis",label:"Analysis",icon:"📈"},{id:"freeplays",label:"Free Plays",icon:"🤲"},{id:"commission",label:"Commission",icon:"🌿"},{id:"dynamic-live",label:"Dynamic Live",icon:"🖥️"},{id:"live-casino",label:"Live Casino",icon:"🎴"},{id:"crash",label:"Crash",icon:"🚀"},{id:"player-info",label:"Player Info",icon:"ℹ️"},{id:"offerings",label:"Offerings",icon:"🔁"},{id:"limits",label:"Limits",icon:"✋"},{id:"vig-setup",label:"Vig Setup",icon:"🛡️"},{id:"parlays",label:"Parlays",icon:"🔢"},{id:"teasers",label:"Teasers",icon:"8️⃣"},{id:"buying-pts",label:"Buying Pts",icon:"🛒"},{id:"risk-mngmt",label:"Risk Mngmt",icon:"💲"},{id:"communication",label:"Communication",icon:"📞"}],cn=async(i,b)=>{const X=String(b||"").trim();if(!X)return null;try{const ce=await sr(i,{agentId:X}),re=Number(ce?.balanceOwed);return Number.isFinite(re)?re:null}catch(ce){return console.warn("Failed to load live agent settlement balance:",ce),null}};r.useEffect(()=>{t&&(async()=>{try{g(!0),x(""),p(""),I(""),H(""),st(null),C(null),rs(null),Dt(null),F(zn),ge("basics");const b=localStorage.getItem("token");if(!b){x("Please login to view details.");return}const[X,ce]=await Promise.all([Pa(t,b),["admin","super_agent","master_agent","agent"].includes(n)?Zt(b):Promise.resolve([])]),re=X?.user,pe=re?.settings||{},ve=pe.dynamicLiveLimits||{},je=pe.dynamicLiveFlags||{},Ce=pe.liveCasinoLimits||{},Me=Ce.default||{},He=Ce.agent||{},_e=Ce.player||{};if(!re){x("User not found.");return}const et=String(re?.role||"").toLowerCase(),Rt=et==="agent"||et==="master_agent"||et==="super_agent",rt=Ra(re),hs=Rt?await cn(b,re.id||t):null;C(rt),rs(hs),B(X?.stats||{}),S(X?.referredBy||null),_(Array.isArray(ce)?ce:[]),Rt&&(Us(re?.agentPercent!=null?String(re.agentPercent):""),Ws(re?.playerRate!=null?String(re.playerRate):""),vr(re?.hiringAgentPercent!=null?String(re.hiringAgentPercent):""),sn(rt.parentAgentId||rt.masterAgentId||rt.createdBy?.id||rt.createdBy||""),wr(re?.subAgentPercent!=null?String(re.subAgentPercent):""),Nr(Array.isArray(re?.extraSubAgents)?re.extraSubAgents.map((Yt,Jt)=>({id:Jt,name:Yt.name||"",percent:Yt.percent!=null?String(Yt.percent):""})):[])),F({password:"",firstName:rt.firstName||"",lastName:rt.lastName||"",phoneNumber:rt.phoneNumber||"",minBet:rt.minBet,agentId:Rt?rt.parentAgentId||rt.masterAgentId||"":n==="admin"?rt.masterAgentId||rt.agentId?.id||rt.agentId||"":rt.agentId?.id||rt.agentId||"",status:(rt.status||"active").toLowerCase(),creditLimit:rt.creditLimit,wagerLimit:rt.wagerLimit,settleLimit:rt.balanceOwed,accountType:pe.accountType||"credit",zeroBalanceWeekly:pe.zeroBalanceWeekly||"standard",tempCredit:Number(pe.tempCredit||0),expiresOn:pe.expiresOn||"",enableCaptcha:!!pe.enableCaptcha,cryptoPromoPct:Number(pe.cryptoPromoPct||0),promoType:pe.promoType||"promo_credit",playerNotes:pe.playerNotes||"",sportsbook:pe.sports??!0,casino:pe.casino??!0,horses:pe.racebook??!0,messaging:pe.messaging??!1,dynamicLive:pe.live??!0,propPlus:pe.props??!0,liveCasino:pe.liveCasino??!1,freePlayPercent:Number(pe.freePlayPercent??20),maxFpCredit:Number(pe.maxFpCredit??0),dlMinStraightBet:Number(ve.minStraightBet??25),dlMaxStraightBet:Number(ve.maxStraightBet??250),dlMaxPerOffering:Number(ve.maxPerOffering??500),dlMaxBetPerEvent:Number(ve.maxBetPerEvent??500),dlMaxWinSingleBet:Number(ve.maxWinSingleBet??1e3),dlMaxWinEvent:Number(ve.maxWinEvent??3e3),dlDelaySec:Number(ve.delaySec??7),dlMaxFavoriteLine:Number(ve.maxFavoriteLine??-1e4),dlMaxDogLine:Number(ve.maxDogLine??1e4),dlMinParlayBet:Number(ve.minParlayBet??10),dlMaxParlayBet:Number(ve.maxParlayBet??100),dlMaxWinEventParlay:Number(ve.maxWinEventParlay??3e3),dlMaxDogLineParlays:Number(ve.maxDogLineParlays??1e3),dlWagerCoolOffSec:Number(ve.wagerCoolOffSec??30),dlLiveParlays:!!je.liveParlays,dlBlockPriorStart:je.blockPriorStart??!0,dlBlockHalftime:je.blockHalftime??!0,dlIncludeGradedInLimits:!!je.includeGradedInLimits,dlUseRiskLimits:!!je.useRiskLimits,casinoDefaultMaxWinDay:Number(Me.maxWinDay??1e4),casinoDefaultMaxLossDay:Number(Me.maxLossDay??1e4),casinoDefaultMaxWinWeek:Number(Me.maxWinWeek??1e4),casinoDefaultMaxLossWeek:Number(Me.maxLossWeek??1e4),casinoAgentMaxWinDay:Number(He.maxWinDay??1e3),casinoAgentMaxLossDay:Number(He.maxLossDay??1e3),casinoAgentMaxWinWeek:Number(He.maxWinWeek??5e3),casinoAgentMaxLossWeek:Number(He.maxLossWeek??5e3),casinoPlayerMaxWinDay:Number(_e.maxWinDay??1e3),casinoPlayerMaxLossDay:Number(_e.maxLossDay??1e3),casinoPlayerMaxWinWeek:Number(_e.maxWinWeek??5e3),casinoPlayerMaxLossWeek:Number(_e.maxLossWeek??5e3),appsVenmo:re.apps?.venmo||"",appsCashapp:re.apps?.cashapp||"",appsApplePay:re.apps?.applePay||"",appsZelle:re.apps?.zelle||"",appsPaypal:re.apps?.paypal||"",appsBtc:re.apps?.btc||"",appsOther:re.apps?.other||""})}catch(b){console.error("Failed to load player details:",b),x(b.message||"Failed to load details")}finally{g(!1)}})()},[n,t]);const pa=async()=>{if(!t)return;const i=localStorage.getItem("token");if(i)try{ws(!0),N("");const b=await Ll(t,i);Dt(b)}catch(b){N(b.message||"Failed to load commission chain")}finally{ws(!1)}},Cr=async i=>{if(sn(i),!i)return;const b=localStorage.getItem("token");if(b)try{P(!0),te(""),he(""),await ys(t,{parentAgentId:i},b),he("Master agent updated"),await pa()}catch(X){te(X.message||"Failed to update master agent")}finally{P(!1)}},Ar=async()=>{const i=localStorage.getItem("token"),b=parseFloat(an);if(!i||isNaN(b)||b<=0){Vs("Enter a valid positive amount");return}try{rn(!0),Vs(""),ha(null);const X=await Tl(t,b,i);ha(X)}catch(X){Vs(X.message||"Calculation failed")}finally{rn(!1)}},Pr=async()=>{if(!nt?.upline)return;const i=localStorage.getItem("token");if(i)try{const b=nt.upline.map(ce=>({id:ce.id,username:ce.username,agentPercent:ce.agentPercent})),X=await Dl(b,i);on(X)}catch(b){on({isValid:!1,errors:[b.message]})}},dn=async i=>{if(!h?.username)return[];const b=i||localStorage.getItem("token");if(!b)throw new Error("Please login to view transactions.");const X={user:h.username||"",type:ac(z),status:ee,time:oe,limit:300};t&&(X.userId=t);const ce=await Fs(X,b);let ve=[...(Array.isArray(ce?.transactions)?ce.transactions:[]).filter(je=>Oa(je,t,h.username,xa))];if(["deleted_changed","deleted_transactions"].includes(us(z)))try{const je=await rr({user:h.username||"",status:"all",sport:"all",time:oe,limit:300},b),Ce=(Array.isArray(je?.wagers)?je.wagers:[]).filter(Me=>String(Me?.userId||"")===String(t)).map(sc);ve=[...ve,...Ce]}catch(je){console.warn("Deleted/Changed wagers could not be loaded:",je)}return ve.filter(je=>nc(je,z)).sort((je,Ce)=>Qn(Ce?.date)-Qn(je?.date))};r.useEffect(()=>{(async()=>{if(!(q!=="transactions"||!h))try{j(!0),H("");const b=await dn();k(b)}catch(b){H(b.message||"Failed to load transactions")}finally{j(!1)}})()},[q,h,z,ee,oe,t]),r.useEffect(()=>{(async()=>{if(!(q!=="performance"||!h?.username))try{xt(!0),ze("");const b=localStorage.getItem("token");if(!b){ze("Please login to view performance.");return}const X=await ma({customer:h.username,time:Ke==="weekly"?"90d":Ke==="yearly"?"all":"30d",type:"all-types",limit:500},b),ce=Array.isArray(X?.bets)?X.bets:[],re=new Map,pe=Ce=>{const Me=new Date(Date.UTC(Ce.getFullYear(),Ce.getMonth(),Ce.getDate())),He=Me.getUTCDay()||7;Me.setUTCDate(Me.getUTCDate()+4-He);const _e=new Date(Date.UTC(Me.getUTCFullYear(),0,1));return Math.ceil(((Me-_e)/864e5+1)/7)};for(const Ce of ce){const Me=Ce?.createdAt,He=new Date(Me);if(Number.isNaN(He.getTime()))continue;let _e="",et="";if(Ke==="daily"){const Bt=He.getFullYear(),Ds=String(He.getMonth()+1).padStart(2,"0"),ps=String(He.getDate()).padStart(2,"0");_e=`${Bt}-${Ds}-${ps}`,et=He.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric",weekday:"long"})}else if(Ke==="weekly"){const Bt=He.getFullYear(),Ds=String(pe(He)).padStart(2,"0");_e=`${Bt}-W${Ds}`;const ps=new Date(He),Cn=ps.getDay(),ri=ps.getDate()-Cn+(Cn===0?-6:1);ps.setDate(ri),et=`Week of ${ps.toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"})}`}else if(Ke==="monthly"){const Bt=He.getFullYear(),Ds=String(He.getMonth()+1).padStart(2,"0");_e=`${Bt}-${Ds}`,et=He.toLocaleDateString("en-US",{month:"long",year:"numeric"})}else{const Bt=He.getFullYear();_e=`${Bt}`,et=`${Bt}`}const Rt=Number(Ce?.amount||0),rt=Number(Ce?.potentialPayout||0),hs=String(Ce?.status||"").toLowerCase(),Yt=hs==="won"?Math.max(0,rt-Rt):hs==="lost"?-Rt:0;re.has(_e)||re.set(_e,{date:He,net:0,wagers:[],periodLabel:et});const Jt=re.get(_e);Jt.net+=Yt,Jt.wagers.push({id:Ce.id||`${_e}-${Jt.wagers.length+1}`,label:`${Ce?.match?.awayTeam||""} vs ${Ce?.match?.homeTeam||""}`.trim()||Ce.selection||"Wager",amount:Yt})}const ve=Array.from(re.entries()).map(([Ce,Me])=>({key:Ce,date:Me.date,periodLabel:Me.periodLabel,net:Me.net,wagers:Me.wagers})).sort((Ce,Me)=>Me.key.localeCompare(Ce.key));if(Ke==="yearly"){const Ce=ke(h?.lifetimePlusMinus??h?.lifetime,0);if(Number.isFinite(Ce)){const Me=ve.reduce((_e,et)=>_e+Number(et.net||0),0),He=Ce-Me;if(Math.abs(He)>=.01){const _e=String(new Date().getFullYear());let et=ve.findIndex(Rt=>Rt.key===_e);et<0&&(ve.unshift({key:_e,date:new Date,periodLabel:_e,net:0,wagers:[]}),et=0),ve[et]={...ve[et],net:Number(ve[et].net||0)+He,wagers:[...Array.isArray(ve[et].wagers)?ve[et].wagers:[],{id:`lifetime-carry-${ve[et].key}`,label:"Lifetime +/- Carry",amount:He,synthetic:!0}]}}}}ct(ve);const je=ve[0]?.key||"";Ct(je),$(ve[0]?.wagers||[])}catch(b){ze(b.message||"Failed to load performance"),ct([]),Ct(""),$([])}finally{xt(!1)}})()},[q,h?.username,h?.lifetimePlusMinus,h?.lifetime,Ke]),r.useEffect(()=>{(async()=>{if(!(q!=="freeplays"||!h?.username))try{fe(!0),De("");const b=localStorage.getItem("token");if(!b){De("Please login to view free play.");return}const X=await Fs({user:h.username,type:"all",status:"all",time:Et,limit:300},b),re=(Array.isArray(X?.transactions)?X.transactions:[]).filter(pe=>Oa(pe,t,h.username,xa)&&Ja(pe));me(re)}catch(b){De(b.message||"Failed to load free play")}finally{fe(!1)}})()},[q,h?.username,Et,t]);const Le=(i,b)=>{F(X=>({...X,[i]:b}))},Lr=i=>{st(null),F(b=>({...b,firstName:Wt(i)}))},Tr=i=>{st(null),F(b=>({...b,lastName:Wt(i)}))},Dr=i=>{st(null),F(b=>({...b,phoneNumber:za(i)}))},un=r.useMemo(()=>{const i=`${o.firstName||""} ${o.lastName||""}`.trim();return i||(h?.fullName?h.fullName:"")},[o.firstName,o.lastName,h?.fullName]);r.useMemo(()=>un||h?.username||"Player",[un,h?.username]);const mn=r.useMemo(()=>Va(o.firstName,o.lastName,o.phoneNumber,h?.username||""),[o.firstName,o.lastName,o.phoneNumber,h?.username]),ga=r.useMemo(()=>h?mn||h.displayPassword||"Not set":"",[h,mn]),hn=r.useMemo(()=>{const i=new Set;return(Array.isArray(Pt?.matches)?Pt.matches:[]).forEach(X=>{(Array.isArray(X?.matchReasons)?X.matchReasons:[]).forEach(re=>{const pe=String(re||"").trim().toLowerCase();pe&&i.add(pe)})}),i},[Pt]),Er=hn.has("phone"),Mr=hn.has("password"),Br=r.useMemo(()=>{const i=String(h?.role||"player").toLowerCase();return i==="user"||i==="player"?"PLAYER":i.replace(/_/g," ").toUpperCase()},[h?.role]),Fe=r.useMemo(()=>{const i=String(h?.role||"player").toLowerCase();return i==="agent"||i==="master_agent"||i==="master agent"||i==="super_agent"||i==="super agent"},[h?.role]),xa=r.useMemo(()=>{if(!Fe||!h?.username||!v?.length)return null;const i=String(h.username).toUpperCase();if(i.endsWith("MA")){const b=i.slice(0,-2),X=v.find(ce=>String(ce.username||"").toUpperCase()===b);return X?{id:X.id,username:b}:null}else{const b=i+"MA",X=v.find(ce=>String(ce.username||"").toUpperCase()===b);return X?{id:X.id,username:b}:null}},[Fe,h?.username,v]);r.useMemo(()=>{if(!zs)return"";const i=v.find(b=>b.id===zs);return i?String(i.username||"").toUpperCase():String(h?.createdByUsername||h?.createdBy?.username||"").toUpperCase()},[zs,v,h]);const qt=ke(h?.balance,0),ks=ke(h?.pendingBalance,0),pn=ke(h?.freeplayBalance,0),gn=ke(h?.lifetimePlusMinus??h?.lifetime,0),Cs=qn(o.creditLimit,h?.creditLimit??h?.defaultCreditLimit),fa=qn(o.settleLimit,h?.balanceOwed??h?.defaultSettleLimit),ba=ke(h?.minBet??h?.defaultMinBet??o.minBet,0),ja=ke(h?.maxBet??h?.defaultMaxBet??h?.wagerLimit??o.wagerLimit,0),is=Fe&&ut!==null?ke(ut,0):qt,ya="Balance Owed / House Money",va=r.useMemo(()=>Cs+qt-ks,[Cs,qt,ks]),Gt=r.useMemo(()=>{let i=0;for(const b of G)b?.status==="pending"&&String(b?.type||"").toLowerCase().includes("casino")&&(i+=Number(b.amount||0));return{pending:ks,available:Fe?qt:Number(va||0),carry:Fe&&ut!==null?is:qt,nonPostedCasino:i}},[G,ks,qt,va,Fe,ut,is]),xn=i=>Math.round(ke(i,0)),wa=i=>String(Math.abs(xn(i))),Ye=i=>"$"+xn(i).toLocaleString("en-US"),vt=i=>{const b=ke(i,0);return`$${Math.round(b).toLocaleString("en-US")}`},Fr=async()=>{jt(""),pt(!0);try{const i=localStorage.getItem("token");if(!i)throw new Error("No admin token found. Please log in again.");const b=await kl(t,i);if(!b?.token)throw new Error("Login failed: no token returned from server.");if(!sessionStorage.getItem("impersonationBaseToken")){sessionStorage.setItem("impersonationBaseToken",i);const re=localStorage.getItem("userRole")||"";re&&sessionStorage.setItem("impersonationBaseRole",re)}localStorage.setItem("token",b.token),localStorage.setItem("userRole",String(b?.role||"user")),localStorage.removeItem("user");const X=String(b?.role||"").toLowerCase();let ce="/";X==="admin"?ce="/admin/dashboard":X==="agent"?ce="/agent/dashboard":(X==="master_agent"||X==="super_agent")&&(ce="/super_agent/dashboard"),window.location.href=ce}catch(i){jt(i.message||"Failed to login as user. Please try again."),pt(!1)}},Na=String(R?.id||"").trim(),Ir=r.useMemo(()=>{if(!R)return"—";const i=R.firstName||"",b=R.lastName||"";return[i,b].filter(Boolean).join(" ").trim()||R.username||R.id||"—"},[R]),qs=Na!==""&&Na!==String(t||"").trim()&&typeof a=="function",$r=()=>{qs&&a(Na)},Rr=async()=>{const i=ba,b=ja,X=Cs,ce=fa,re=String(ga??""),pe=String(h?.role||"").toLowerCase(),ve=pe==="user"||pe==="player"||pe==="",je="https://bettorplays247.com",Ce=ve?["Here's your account info. PLEASE READ ALL RULES THOROUGHLY.","",`Login: ${h?.username||""}`,`Password: ${re}`,`Min bet: ${vt(i)}`,`Max bet: ${vt(b)}`,`Credit: ${vt(X)}`,`Settle: +/- ${vt(ce)}`,"",`Site: ${je}`,"",tc]:[`Login: ${h?.username||""}`,`Password: ${re}`,`Min bet: ${vt(i)}`,`Max bet: ${vt(b)}`,`Credit: ${vt(X)}`,`Settle: +/- ${vt(ce)}`,"",`Site: ${je}`],Me=Ce.join(`
`),_e=`<div style="font-family:sans-serif;white-space:pre-wrap;">${Ce.map(et=>et===""?"<br>":et).join("<br>")}</div>`;try{typeof ClipboardItem<"u"&&navigator.clipboard.write?await navigator.clipboard.write([new ClipboardItem({"text/plain":new Blob([Me],{type:"text/plain"}),"text/html":new Blob([_e],{type:"text/html"})})]):await navigator.clipboard.writeText(Me),dt("All details copied"),window.setTimeout(()=>dt(""),1400)}catch{dt("Copy failed"),window.setTimeout(()=>dt(""),1400)}},Or=async()=>{try{f(!0),x(""),p(""),st(null);const i=localStorage.getItem("token");if(!i){x("Please login again.");return}const b=Wt(o.firstName).trim(),X=Wt(o.lastName).trim(),ce=za(o.phoneNumber).trim(),re=Fe?"":Va(b,X,ce,h?.username||"");if(!Fe&&(!b||!X||!ce||!re)){x("First name, last name, and phone number are required to generate password.");return}const pe={firstName:b,lastName:X,phoneNumber:ce,fullName:`${b} ${X}`.trim(),password:re,allowDuplicateSave:!0,status:o.status,minBet:Number(o.minBet||0),creditLimit:Number(o.creditLimit||0),maxBet:Number(o.wagerLimit||0),wagerLimit:Number(o.wagerLimit||0),balanceOwed:Number(o.settleLimit||0),settings:{accountType:o.accountType,zeroBalanceWeekly:o.zeroBalanceWeekly,tempCredit:Number(o.tempCredit||0),expiresOn:o.expiresOn||"",enableCaptcha:!!o.enableCaptcha,cryptoPromoPct:Number(o.cryptoPromoPct||0),promoType:o.promoType,playerNotes:o.playerNotes,sports:!!o.sportsbook,casino:!!o.casino,racebook:!!o.horses,messaging:!!o.messaging,live:!!o.dynamicLive,props:!!o.propPlus,liveCasino:!!o.liveCasino}};pe.apps={venmo:o.appsVenmo||"",cashapp:o.appsCashapp||"",applePay:o.appsApplePay||"",zelle:o.appsZelle||"",paypal:o.appsPaypal||"",btc:o.appsBtc||"",other:o.appsOther||""},["admin","super_agent","master_agent"].includes(n)&&o.agentId&&(pe.agentId=o.agentId);let ve=null;if(Fe){const Me={firstName:b,lastName:X,fullName:`${b} ${X}`.trim(),phoneNumber:ce,defaultMinBet:Number(o.minBet||0),defaultMaxBet:Number(o.wagerLimit||0),defaultCreditLimit:Number(o.creditLimit||0),defaultSettleLimit:Number(o.settleLimit||0)};o.agentId&&(Me.parentAgentId=o.agentId),await ys(t,Me,i),ve={}}else n==="agent"?ve=await Ft(t,pe,i):ve=await Ut(t,pe,i);const je={...pe};delete je.allowDuplicateSave,C(Fe?Me=>({...Me,firstName:je.firstName,lastName:je.lastName,fullName:je.fullName,phoneNumber:je.phoneNumber,status:je.status,defaultMinBet:Number(o.minBet||0),defaultMaxBet:Number(o.wagerLimit||0),defaultCreditLimit:Number(o.creditLimit||0),defaultSettleLimit:Number(o.settleLimit||0),minBet:Number(o.minBet||0),maxBet:Number(o.wagerLimit||0),creditLimit:Number(o.creditLimit||0),balanceOwed:Number(o.settleLimit||0),displayPassword:Me?.displayPassword||""}):Me=>({...Me,...je,displayPassword:re||Me?.displayPassword||"",settings:{...Me?.settings||{},...je.settings}}));const Ce=ve?.duplicateWarning;Ce&&typeof Ce=="object"?(st({message:Ce.message||"Likely duplicate player detected.",matches:Array.isArray(Ce.matches)?Ce.matches:[]}),p("Changes saved with duplicate warning.")):p("Changes saved successfully.")}catch(i){console.error("Failed to save player details:",i);const b=Array.isArray(i?.duplicateMatches)?i.duplicateMatches:Array.isArray(i?.details?.matches)?i.details.matches:[];if(i?.isDuplicate===!0||i?.duplicate===!0||i?.code==="DUPLICATE_PLAYER"||i?.details?.duplicate===!0){st({message:i?.message||"Likely duplicate player detected.",matches:b}),x("");return}x(i.message||"Failed to save details")}finally{f(!1)}},_r=async()=>{try{const i=localStorage.getItem("token");if(!i||!h)return;await js(t,{balance:ke(h.balance,0)},i),p("Balance updated."),x("")}catch(i){x(i.message||"Failed to update balance")}},fn=i=>{if(!i)return"—";const b=i?.$date||i,X=new Date(b);return Number.isNaN(X.getTime())?"—":X.toLocaleString()},ls=i=>{i==="transactions"?(ge("transactions"),Te("7d"),M("deposit_withdrawal"),xe("all")):i==="pending"?(ge("transactions"),Te("7d"),M("deposit_withdrawal"),xe("pending")):i==="performance"?ge("performance"):i==="freeplays"?ge("freeplays"):i==="dynamic-live"?ge("dynamic-live"):i==="live-casino"?ge("live-casino"):i==="commission"?(ge("commission"),nt||pa()):ge("basics"),u(!1),p(""),I(""),x(""),st(null),H(""),ze(""),De(""),wt(""),T(""),ye(""),Ve(""),Oe("")},Gs=()=>{ls("transactions");const i=Fe?is:ke(h?.balance,0),b=Fe?i>0?"deposit":"withdrawal":i>0?"withdrawal":"deposit";c(b),de(""),Ae(""),Je(!0),H(""),A(!0)},bn=!!l?.autoOpenDeposit,[jn,Ur]=r.useState(!1);r.useEffect(()=>{!bn||jn||h?.id&&Fe&&(Gs(),Ur(!0))},[bn,jn,h?.id,Fe]);const Ys=r.useMemo(()=>Ze.find(i=>i.key===Xe)||null,[Ze,Xe]);r.useEffect(()=>{if(!Ys){$([]);return}$(Ys.wagers||[])},[Ys]);const Wr=r.useMemo(()=>m.reduce((i,b)=>i+Number(b.amount||0),0),[m]),zr=r.useMemo(()=>m.filter(i=>!i?.synthetic).length,[m]),As=r.useMemo(()=>Fe?is:ke(h?.balance,0),[Fe,is,h?.balance]),Js=r.useMemo(()=>ke(Fe?h?.balance:Gt?.carry,0),[Fe,h?.balance,Gt?.carry]),Vr=r.useMemo(()=>Z.filter(i=>String(i.status||"").toLowerCase()==="pending").reduce((i,b)=>i+ke(b.amount,0),0),[Z]),os=pn,Qs=i=>{const b=ke(i,0);return Number.isFinite(b)?Math.round(b*100)/100:0},yn=i=>{const b=kt(i);return b==="neg"?"#dc2626":b==="pos"?"#16a34a":"#000000"},Ks=i=>{const b=kt(i);return b==="pos"?"neg":b==="neg"?"pos":"neutral"},Hr=i=>Fe?Ks(i):kt(i),Sa=(i,b=Fe)=>{const X=b?Ks(i):kt(i);return X==="neg"?"#dc2626":X==="pos"?"#16a34a":"#000000"},ka=Fe?Hn:Vn,vn=ka.find(i=>i.value===ie)||ka[0],Ps=Number(W||0),wn=Number.isFinite(Ps)&&Ps>0,Nn=wn,Zs=r.useMemo(()=>xr(h,Ps),[h,Ps]),qr=St==="withdraw",Ca=Number(ts||0),Sn=Number.isFinite(Ca)&&Ca>0,kn=Sn,Ls=async()=>{if(h?.username)try{fe(!0);const i=localStorage.getItem("token");if(!i)return;const b=await Fs({user:h.username,type:"all",status:"all",time:Et,limit:300},i),X=Array.isArray(b?.transactions)?b.transactions:[];me(X.filter(ce=>Oa(ce,t,h.username,xa)&&Ja(ce)))}catch(i){De(i.message||"Failed to refresh free play")}finally{fe(!1)}},Gr=(i,b="transaction")=>{const X=Number(i?.deleted||0),ce=Number(i?.skipped||0),re=Number(i?.cascadeDeleted||0),ve=(Array.isArray(i?.warnings)?i.warnings:[]).find(Ce=>typeof Ce?.message=="string"&&Ce.message.trim()!=="");let je=X>0?`Deleted ${X} ${b}(s).`:`No ${b}(s) were deleted.`;return re>0&&(je+=` Linked free play deleted: ${re}.`),ce>0&&(je+=` Skipped ${ce}.`),ve&&(je+=` ${ve.message}`),X>0||re>0?je+=" Balances and totals were updated.":je+=" Balances and totals were not changed.",je},Xs=(i,b,X,ce)=>{const re=Number(i?.deleted||0),pe=Number(i?.cascadeDeleted||0),ve=Gr(i,b);if(re>0||pe>0){X(ve),ce("");return}X(""),ce(ve)},Yr=async()=>{try{const i=Number(ts||0);if(i<=0||Number.isNaN(i)){De("Enter a valid free play amount greater than 0.");return}const b=localStorage.getItem("token");if(!b||!h){De("Please login again.");return}const X=ke(h.freeplayBalance,0),ce=St==="withdraw",re=await lr(t,{operationMode:"transaction",amount:i,direction:ce?"debit":"credit",description:It.trim()},b),pe=ke(re?.user?.freeplayBalance,NaN),ve=re?.user?.freeplayExpiresAt??null;C(Ce=>Ce&&{...Ce,freeplayBalance:Number.isFinite(pe)?pe:Qs(X+(ce?-i:i)),freeplayExpiresAt:ve});const je=ce?"withdrawn":"added";It.trim()?wt(`Free play ${je}. Note: "${It.trim()}"`):wt(`Free play ${je} successfully.`),De(""),Tt(!1),ht(!1),ss(""),Lt(""),await Ls()}catch(i){De(i.message||"Failed to update free play")}},Jr=i=>{Nt(b=>b.includes(i)?b.filter(X=>X!==i):[...b,i])},Qr=async()=>{try{if(tt.length===0||!window.confirm(`Delete ${tt.length} selected free play transaction(s)?`))return;const i=localStorage.getItem("token");if(!i){De("Please login again.");return}const b=await ta(tt,i);Nt([]),Xs(b,"free play transaction",wt,De),await Ls(),await Ts(),await ea()}catch(i){De(i.message||"Failed to delete free play transactions")}},Kr=async i=>{try{if(!i||!window.confirm("Delete this free play transaction?"))return;const b=localStorage.getItem("token");if(!b){De("Please login again.");return}const X=await ta([i],b);Nt(ce=>ce.filter(re=>re!==i)),Xs(X,"free play transaction",wt,De),await Ls(),await Ts(),await ea()}catch(b){De(b.message||"Failed to delete free play transaction")}},Zr=async()=>{try{const i=localStorage.getItem("token");if(!i){De("Please login again.");return}const b={settings:{freePlayPercent:Number(o.freePlayPercent||0),maxFpCredit:Number(o.maxFpCredit||0)}};n==="agent"?await Ft(t,b,i):await Ut(t,b,i),wt("Free play settings saved."),De("")}catch(i){De(i.message||"Failed to save free play settings")}},Xr=async()=>{try{ns(!0);const i=localStorage.getItem("token");if(!i){T("Please login again.");return}const b={settings:{dynamicLiveLimits:{minStraightBet:Number(o.dlMinStraightBet||0),maxStraightBet:Number(o.dlMaxStraightBet||0),maxPerOffering:Number(o.dlMaxPerOffering||0),maxBetPerEvent:Number(o.dlMaxBetPerEvent||0),maxWinSingleBet:Number(o.dlMaxWinSingleBet||0),maxWinEvent:Number(o.dlMaxWinEvent||0),delaySec:Number(o.dlDelaySec||0),maxFavoriteLine:Number(o.dlMaxFavoriteLine||0),maxDogLine:Number(o.dlMaxDogLine||0),minParlayBet:Number(o.dlMinParlayBet||0),maxParlayBet:Number(o.dlMaxParlayBet||0),maxWinEventParlay:Number(o.dlMaxWinEventParlay||0),maxDogLineParlays:Number(o.dlMaxDogLineParlays||0),wagerCoolOffSec:Number(o.dlWagerCoolOffSec||0)},dynamicLiveFlags:{liveParlays:!!o.dlLiveParlays,blockPriorStart:!!o.dlBlockPriorStart,blockHalftime:!!o.dlBlockHalftime,includeGradedInLimits:!!o.dlIncludeGradedInLimits,useRiskLimits:!!o.dlUseRiskLimits}}};n==="agent"?await Ft(t,b,i):await Ut(t,b,i),ye("Dynamic Live settings saved."),T("")}catch(i){T(i.message||"Failed to save Dynamic Live settings")}finally{ns(!1)}},ei=async()=>{try{Ee(!0);const i=localStorage.getItem("token");if(!i){Ve("Please login again.");return}const b={settings:{liveCasinoLimits:{default:{maxWinDay:Number(o.casinoDefaultMaxWinDay||0),maxLossDay:Number(o.casinoDefaultMaxLossDay||0),maxWinWeek:Number(o.casinoDefaultMaxWinWeek||0),maxLossWeek:Number(o.casinoDefaultMaxLossWeek||0)},agent:{maxWinDay:Number(o.casinoAgentMaxWinDay||0),maxLossDay:Number(o.casinoAgentMaxLossDay||0),maxWinWeek:Number(o.casinoAgentMaxWinWeek||0),maxLossWeek:Number(o.casinoAgentMaxLossWeek||0)},player:{maxWinDay:Number(o.casinoPlayerMaxWinDay||0),maxLossDay:Number(o.casinoPlayerMaxLossDay||0),maxWinWeek:Number(o.casinoPlayerMaxWinWeek||0),maxLossWeek:Number(o.casinoPlayerMaxLossWeek||0)}}}};n==="agent"?await Ft(t,b,i):await Ut(t,b,i),Oe("Live Casino limits saved."),Ve("")}catch(i){Ve(i.message||"Failed to save Live Casino limits")}finally{Ee(!1)}},Ts=async()=>{if(h){j(!0);try{const i=localStorage.getItem("token");if(!i){H("Please login to view transactions.");return}const b=await dn(i);k(b)}catch(i){H(i.message||"Failed to refresh transactions")}finally{j(!1)}}},ea=async()=>{try{const i=localStorage.getItem("token");if(!i)return;const b=await Pa(t,i),X=b?.user;if(!X||typeof X!="object")return;const ce=Ra(X),re=String(X?.role||"").toLowerCase(),ve=re==="agent"||re==="master_agent"||re==="super_agent"?await cn(i,X.id||t):null;C(je=>je&&{...je,balance:ce.balance,pendingBalance:ce.pendingBalance,freeplayBalance:ce.freeplayBalance,lifetime:ce.lifetime,lifetimePlusMinus:ce.lifetimePlusMinus,balanceOwed:ce.balanceOwed,creditLimit:ce.creditLimit,updatedAt:ce.updatedAt}),rs(ve),b?.stats&&typeof b.stats=="object"&&B(b.stats),b?.referredBy!==void 0&&S(b.referredBy||null)}catch(i){console.warn("Failed to refresh customer financials after transaction update:",i)}},ti=async()=>{if(!ot){Qe(!0);try{const i=Number(W||0);if(i<=0||Number.isNaN(i)){H("Enter a valid amount greater than 0.");return}const b=localStorage.getItem("token");if(!b||!h){H("Please login again.");return}const X=Fe?Hn:Vn,ce=X.find(_e=>_e.value===ie)||X[0],re=ke(h.balance,0),pe=Qs(re+(ce.balanceDirection==="credit"?i:-i)),ve=be.trim();let je;Fe?je=await el(t,{amount:i,direction:ce.balanceDirection,type:ce.apiType,description:ve||ce.defaultDescription},b):je=await js(t,{operationMode:"transaction",amount:i,direction:ce.balanceDirection,type:ce.apiType,reason:ce.reason,description:ve||ce.defaultDescription,applyDepositFreeplayBonus:we},b);const Ce=Fe?0:ke(je?.freeplayBonus?.amount,0),Me=Fe?0:ke(je?.referralBonus?.amount,0);C(_e=>{if(!_e)return _e;const et=Fe?ke(je?.agent?.balance,NaN):ke(je?.user?.balance,NaN),Rt=Number.isFinite(et)?et:pe,rt=ke(je?.user?.freeplayBalance,NaN),hs=Number.isFinite(rt)?rt:ke(_e.freeplayBalance,0),Yt=je?.user?.lifetimePlusMinus??je?.user?.lifetime??_e.lifetimePlusMinus??_e.lifetime??0,Jt=ke(Yt,NaN),Bt=Number.isFinite(Jt)?Jt:ke(_e.lifetimePlusMinus??_e.lifetime,0);return{..._e,balance:Rt,freeplayBalance:hs,lifetime:Bt,lifetimePlusMinus:Bt}});const He=["Transaction saved and balance updated."];Ce>0&&He.push(`Auto free play bonus added: ${Ye(Ce)}.`),Me>0&&He.push(`Referral bonus granted: ${Ye(Me)}.`),I(He.join(" ")),H(""),A(!1),qe(!1),c("deposit"),de(""),Ae(""),Je(!0),await Ts()}catch(i){H(i.message||"Failed to save transaction")}finally{Qe(!1)}}},si=i=>{le(b=>b.includes(i)?b.filter(X=>X!==i):[...b,i])},ai=async()=>{try{if(ne.length===0||!window.confirm(`Delete ${ne.length} selected transaction(s)?`))return;const i=localStorage.getItem("token");if(!i){H("Please login again.");return}const b=await ta(ne,i);le([]),await Ts(),await Ls(),await ea(),Xs(b,"transaction",I,H)}catch(i){H(i.message||"Failed to delete selected transactions")}},ni=async i=>{try{if(!i||!window.confirm("Delete this transaction?"))return;const b=localStorage.getItem("token");if(!b){H("Please login again.");return}const X=await ta([i],b);le(ce=>ce.filter(re=>re!==i)),await Ts(),await Ls(),await ea(),Xs(X,"transaction",I,H)}catch(b){H(b.message||"Failed to delete transaction")}};return d?e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"Loading player details..."})}):h?e.jsxs("div",{className:"customer-details-v2",children:[e.jsxs("div",{className:"top-panel",children:[e.jsxs("div",{className:"player-card",children:[e.jsx("div",{className:"player-card-head",children:e.jsxs("div",{className:"player-title-wrap",children:[e.jsxs("div",{className:"player-title-main",children:[e.jsx("span",{className:"player-kicker",children:"Player ID"}),e.jsx("h2",{children:Fe?(()=>{const i=String(h.username||"").toUpperCase(),b=i+"MA";return v?.find(ce=>String(ce.username||"").toUpperCase()===b)?`${i} (${b})`:i})():h.username||"USER"})]}),e.jsx("span",{className:"player-badge",children:Br})]})}),e.jsxs("div",{className:"paired-grid",children:[e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Login"}),e.jsx("strong",{className:"detail-value",children:h.username||""})]}),Fe?e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="commission"?" detail-metric-active":""}`,onClick:()=>ls("commission"),children:[e.jsxs("span",{className:"detail-label",children:[String(h?.username||"Agent").toUpperCase()," %"]}),e.jsx("strong",{className:"detail-value",children:h?.agentPercent!=null?`${h.agentPercent}%`:"—"})]}):e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="transactions"?" detail-metric-active":""}`,onClick:Gs,children:[e.jsx("span",{className:"detail-label",children:"Balance"}),e.jsx("strong",{className:`detail-value ${kt(qt)}`,children:Ye(qt)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Password"}),e.jsx("strong",{className:"detail-value detail-secret",children:ga})]}),Fe?(()=>{const i=h?.agentPercent!=null?parseFloat(h.agentPercent):null,b=h?.hiringAgentPercent!=null?parseFloat(h.hiringAgentPercent):null,X=5,ce=b!=null&&i!=null?b-i:null,re=b==null||ce===0,pe=!re&&b!=null?100-X-b:null,ve=pe!=null&&pe>0,je=!re&&ce>0,Ce=[];return je&&Ce.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Hiring Agent %"}),e.jsxs("strong",{className:"detail-value",children:[ce,"%"]})]},"hiring")),ve&&Ce.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Upline Agent %"}),e.jsxs("strong",{className:"detail-value",children:[pe,"%"]})]},"upline")),Ce.push(e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"House %"}),e.jsx("strong",{className:"detail-value",children:"5%"})]},"house")),Ce.push(e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="commission"?" detail-metric-active":""}`,onClick:()=>ls("commission"),children:[e.jsx("span",{className:"detail-label",children:"Player Rate"}),e.jsx("strong",{className:"detail-value",children:h?.playerRate!=null?`$${h.playerRate}`:"—"})]},"prate")),e.jsxs(e.Fragment,{children:[Ce[0]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Min Bet"}),e.jsx("strong",{className:"detail-value",children:vt(ba)})]}),Ce[1]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Max Bet"}),e.jsx("strong",{className:"detail-value",children:vt(ja)})]}),Ce[2]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Credit"}),e.jsx("strong",{className:"detail-value",children:vt(Cs)})]}),Ce[3]||e.jsx("div",{className:"detail-item detail-empty","aria-hidden":"true"}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Standard Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",vt(fa)]})]})]})})():e.jsxs(e.Fragment,{children:[e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="transactions"&&ee==="pending"?" detail-metric-active":""}`,onClick:()=>ls("pending"),children:[e.jsx("span",{className:"detail-label",children:"Pending"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(ks)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Min Bet"}),e.jsx("strong",{className:"detail-value",children:vt(ba)})]}),e.jsxs("div",{className:"detail-item detail-metric",children:[e.jsx("span",{className:"detail-label",children:"Available"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(va)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Max Bet"}),e.jsx("strong",{className:"detail-value",children:vt(ja)})]}),!Fe&&e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="freeplays"?" detail-metric-active":""}`,onClick:()=>ls("freeplays"),children:[e.jsx("span",{className:"detail-label",children:"Freeplay"}),e.jsx("strong",{className:"detail-value neutral",children:Ye(pn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Credit"}),e.jsx("strong",{className:"detail-value",children:vt(Cs)})]}),e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="performance"?" detail-metric-active":""}`,onClick:()=>ls("performance"),children:[e.jsx("span",{className:"detail-label",children:"Lifetime +/-"}),e.jsx("strong",{className:`detail-value ${kt(gn)}`,children:Ye(gn)})]}),e.jsxs("div",{className:"detail-item",children:[e.jsx("span",{className:"detail-label",children:"Settle"}),e.jsxs("strong",{className:"detail-value",children:["+/- ",vt(fa)]})]}),e.jsxs("button",{type:"button",className:`detail-item ${qs?"detail-link-item":""}`,onClick:$r,disabled:!qs,children:[e.jsx("span",{className:"detail-label",children:"Referred By"}),e.jsx("strong",{className:`detail-value ${qs?"detail-link-value":""}`,style:{fontSize:"0.8em",wordBreak:"break-all"},children:Ir})]})]}),Fe?e.jsxs("button",{type:"button",className:`detail-item detail-metric${q==="transactions"?" detail-metric-active":""}`,onClick:Gs,children:[e.jsx("span",{className:"detail-label",children:ya}),e.jsx("strong",{className:`detail-value ${Hr(is)}`,children:Ye(is)})]}):null]}),e.jsxs("div",{className:"player-card-foot",children:[e.jsxs("div",{className:"details-domain",children:[e.jsx("span",{className:"domain-label",children:"Site"}),e.jsx("span",{style:{fontWeight:700},children:"bettorplays247.com"})]}),e.jsxs("div",{className:"top-actions",children:[e.jsx("button",{className:"btn btn-copy-all",onClick:Rr,children:"Copy Details"}),e.jsx("button",{className:"btn btn-user",onClick:Fr,disabled:bt,children:bt?"Logging in...":"Login User"})]})]})]}),gt&&e.jsx("div",{className:"copy-notice",style:{color:"#c0392b",background:"#ffeaea"},children:gt}),Ie&&e.jsx("div",{className:"copy-notice",children:Ie})]}),e.jsxs("div",{className:"basics-header",children:[e.jsxs("div",{className:"basics-left",children:[e.jsx("button",{type:"button",className:"dot-grid-btn",onClick:()=>u(i=>!i),"aria-label":"Open quick sections menu",children:e.jsxs("div",{className:"dot-grid","aria-hidden":"true",children:[e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{}),e.jsx("span",{})]})}),e.jsx("h3",{children:q==="transactions"?"Transactions":q==="performance"?"Performance":q==="freeplays"?"Free Play":q==="dynamic-live"?"Dynamic Live":q==="live-casino"?"Live Casino":q==="commission"?"Commission Tree":"The Basics"})]}),q==="transactions"?e.jsx("button",{className:"btn btn-back",onClick:Gs,children:"New transaction"}):q==="freeplays"?e.jsxs("div",{style:{display:"flex",gap:"8px"},children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{Mt("withdraw"),De(""),Tt(!0)},children:"Withdraw"}),e.jsx("button",{className:"btn btn-save",onClick:()=>{Mt("deposit"),De(""),Tt(!0)},children:"Add Free Play"})]}):q==="dynamic-live"?e.jsx("button",{className:"btn btn-save",onClick:Xr,disabled:as,children:as?"Saving...":"Save"}):q==="live-casino"?e.jsx("button",{className:"btn btn-save",onClick:ei,disabled:V,children:V?"Saving...":"Save"}):q==="commission"?e.jsx("button",{className:"btn btn-back",onClick:pa,disabled:ms,children:ms?"Loading...":"Refresh"}):q==="performance"?e.jsx("span",{}):e.jsx("button",{className:"btn btn-save",onClick:Or,disabled:y,children:y?"Saving...":"Save"})]}),D&&e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",className:"menu-backdrop",onClick:()=>u(!1),"aria-label":"Close quick sections menu"}),e.jsxs("div",{className:"basics-quick-menu",children:[e.jsx("button",{type:"button",className:"menu-close",onClick:()=>u(!1),"aria-label":"Close menu",children:"x"}),e.jsx("div",{className:"menu-grid",children:kr.map(i=>e.jsxs("button",{type:"button",className:"menu-item",onClick:()=>ls(i.id),children:[e.jsx("span",{className:"menu-icon",children:i.icon}),e.jsx("span",{className:"menu-label",children:i.label})]},i.id))})]})]}),q==="transactions"?U&&e.jsx("div",{className:"alert error",children:U}):q==="performance"?it&&e.jsx("div",{className:"alert error",children:it}):q==="freeplays"?Ne&&e.jsx("div",{className:"alert error",children:Ne}):q==="dynamic-live"?$t&&e.jsx("div",{className:"alert error",children:$t}):q==="live-casino"?Be&&e.jsx("div",{className:"alert error",children:Be}):L&&e.jsx("div",{className:"alert error",children:L}),q==="transactions"?O&&e.jsx("div",{className:"alert success",children:O}):q==="freeplays"?Ge&&e.jsx("div",{className:"alert success",children:Ge}):q==="dynamic-live"?E&&e.jsx("div",{className:"alert success",children:E}):q==="live-casino"?Pe&&e.jsx("div",{className:"alert success",children:Pe}):w&&e.jsx("div",{className:"alert success",children:w}),q==="basics"&&Pt&&e.jsxs("div",{className:"duplicate-warning-state",children:[e.jsx("div",{className:"duplicate-warning-title",children:"Duplicate Player"}),e.jsx("div",{className:"duplicate-warning-message",children:Pt.message}),Array.isArray(Pt.matches)&&Pt.matches.length>0&&e.jsx("div",{className:"duplicate-warning-list",children:Pt.matches.map((i,b)=>e.jsxs("div",{className:"duplicate-warning-item",children:[e.jsx("strong",{children:String(i.username||"UNKNOWN")}),e.jsx("span",{children:String(i.fullName||"No name")}),e.jsx("span",{children:String(i.phoneNumber||"No phone")})]},`${i.id||i.username||"duplicate"}-${b}`))})]}),q==="commission"&&e.jsxs("div",{className:"commission-section",children:[e.jsxs("div",{className:"commission-edit-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Settings"}),(()=>{const i=(re,pe)=>{at(re),Ht(pe!=null?String(pe):"")},b=()=>{at(null),Ht("")},X=async()=>{const re=localStorage.getItem("token");if(!(!re||!$e))try{P(!0);const pe={};if($e==="agentPercent"){const je=parseFloat(yt);if(isNaN(je)||je<0||je>100){te("Must be 0-100");return}pe.agentPercent=je}else if($e==="playerRate"){const je=parseFloat(yt);if(isNaN(je)||je<0){te("Must be a positive number");return}pe.playerRate=je}await ys(t,pe,re),te(""),he("Saved"),b();const ve=await Pa(t,re);ve?.user&&C(Ra(ve.user)),Dt(null),setTimeout(()=>he(""),2e3)}catch(pe){te(pe.message||"Save failed")}finally{P(!1)}},ce=[{key:"agentPercent",label:"Agent %",value:h?.agentPercent,display:h?.agentPercent!=null?`${h.agentPercent}%`:"—",editable:!0},{key:"playerRate",label:"Player Rate",value:h?.playerRate,display:h?.playerRate!=null?`$${h.playerRate}`:"—",editable:!0}];return e.jsxs("div",{className:"commission-inline-fields",children:[ce.map(re=>e.jsxs("div",{className:"commission-inline-row",children:[e.jsx("span",{className:"commission-inline-label",children:re.label}),$e===re.key?e.jsxs("div",{className:"commission-inline-edit",children:[e.jsx("input",{type:"number",min:"0",max:re.key==="agentPercent"?"100":void 0,step:"0.01",className:"commission-inline-input",value:yt,onChange:pe=>Ht(pe.target.value),autoFocus:!0,onKeyDown:pe=>{pe.key==="Enter"&&X(),pe.key==="Escape"&&b()}}),e.jsx("button",{className:"commission-inline-save",onClick:X,disabled:Y,children:Y?"...":"Save"}),e.jsx("button",{className:"commission-inline-cancel",onClick:b,children:"Cancel"})]}):e.jsxs("button",{className:"commission-inline-value",onClick:()=>re.editable&&i(re.key,re.value),children:[re.display,re.editable&&e.jsx("span",{className:"commission-inline-edit-icon",children:"✎"})]})]},re.key)),ae&&e.jsx("div",{className:"alert error",style:{marginTop:8,fontSize:"0.85rem"},children:ae}),ue&&e.jsx("div",{className:"alert success",style:{marginTop:8,fontSize:"0.85rem"},children:ue})]})})()]}),ms&&e.jsx("div",{className:"commission-loading",children:"Loading chain..."}),_s&&e.jsx("div",{className:"alert error",children:_s}),nt&&!ms&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:`commission-validity-banner ${nt.isValid?"valid":"invalid"}`,children:[e.jsx("span",{className:"commission-validity-icon",children:nt.isValid?"✓":"!"}),e.jsxs("span",{children:["Chain total: ",e.jsxs("strong",{children:[nt.chainTotal,"%"]}),nt.isValid?" — Valid":" — Must equal 100%"]}),e.jsx("button",{className:"btn-text-sm",onClick:Pr,style:{marginLeft:12},children:"Re-validate"})]}),Hs&&e.jsx("div",{className:`commission-validity-banner ${Hs.isValid?"valid":"invalid"}`,style:{marginTop:4},children:Hs.isValid?"Validation passed":Hs.errors?.join("; ")}),e.jsxs("div",{className:"commission-hierarchy-box",children:[nt.upline.find(i=>i.role==="admin")&&e.jsxs("div",{className:"ch-row ch-row-upline",children:[e.jsx("span",{className:"ch-row-label",children:"House"}),e.jsxs("span",{className:"ch-row-username",children:["(",nt.upline.find(i=>i.role==="admin").username||"—",")"]}),e.jsx("span",{className:"ch-row-pct",children:"(5%)"})]}),[...nt.upline].filter((i,b)=>b>0&&i.role!=="admin").reverse().map((i,b,X)=>e.jsxs("div",{className:"ch-row ch-row-hiring",children:[e.jsx("span",{className:"ch-row-label",children:b===X.length-1?"Hiring Agent":"Upline Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",i.isSharedNode&&i.linkedUsername?`${i.username}/${i.linkedUsername}`:i.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${i.effectivePercent==null&&i.agentPercent==null?"unset":""}`,children:i.effectivePercent!=null?`(${i.effectivePercent}%)`:i.agentPercent!=null?`(${i.agentPercent}%)`:"(not set)"}),b===X.length-1&&e.jsxs("select",{className:"ch-row-ma-select",value:zs,onChange:ce=>Cr(ce.target.value),disabled:Y,children:[e.jsx("option",{value:"",children:"Change Master Agent"}),v.filter(ce=>{const re=String(ce.role||"").toLowerCase();return re==="master_agent"||re==="super_agent"}).map(ce=>{const re=ce.id;return e.jsx("option",{value:re,children:String(ce.username||"").toUpperCase()},re)})]})]},i.id||b)),nt.upline[0]&&e.jsxs("div",{className:"ch-row ch-row-agent",children:[e.jsx("span",{className:"ch-row-label",children:"Agent"}),e.jsxs("span",{className:"ch-row-username",children:["(",nt.upline[0].isSharedNode&&nt.upline[0].linkedUsername?`${nt.upline[0].username}/${nt.upline[0].linkedUsername}`:nt.upline[0].username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${nt.upline[0].agentPercent==null?"unset":""}`,children:nt.upline[0].agentPercent!=null?`(${nt.upline[0].agentPercent}%)`:"(not set)"})]}),nt.downlines.length>0&&e.jsx("div",{className:"ch-divider"}),nt.downlines.map((i,b)=>e.jsxs("div",{className:"ch-row ch-row-sub",children:[e.jsxs("span",{className:"ch-row-label",children:["Sub Agent ",b+1]}),e.jsxs("span",{className:"ch-row-username",children:["(",i.username||"—",")"]}),e.jsx("span",{className:`ch-row-pct ${i.agentPercent==null?"unset":""}`,children:i.agentPercent!=null?`(${i.agentPercent}%)`:"(not set)"}),e.jsx("span",{className:`ch-row-status ${i.status==="active"?"active":"inactive"}`,children:i.status||""})]},i.id||b)),nt.downlines.length===0&&e.jsx("div",{className:"ch-row ch-row-empty",children:e.jsx("span",{className:"ch-row-label",style:{color:"#94a3b8",fontStyle:"italic"},children:"No sub-agents yet"})})]}),e.jsxs("div",{className:"commission-tree-card",children:[e.jsx("h4",{className:"commission-card-title",children:"Commission Calculator"}),e.jsx("p",{className:"commission-calc-hint",children:"Enter an amount to see how it distributes across the chain."}),e.jsxs("div",{className:"commission-calc-row",children:[e.jsx("input",{type:"number",min:"0",step:"0.01",className:"commission-input",placeholder:"Amount (e.g. 1000)",value:an,onChange:i=>{Sr(i.target.value),ha(null),Vs("")}}),e.jsx("button",{className:"btn btn-back",onClick:Ar,disabled:nn,children:nn?"Calculating...":"Calculate"})]}),ln&&e.jsx("div",{className:"alert error",style:{marginTop:8},children:ln}),Ss&&e.jsxs("div",{className:"calc-result",children:[!Ss.isValid&&e.jsxs("div",{className:"alert error",style:{marginBottom:8},children:["Chain total is ",Ss.chainTotal,"% — percentages must sum to 100% for accurate results."]}),e.jsxs("table",{className:"commission-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Account"}),e.jsx("th",{children:"Role"}),e.jsx("th",{children:"%"}),e.jsx("th",{children:"Amount"})]})}),e.jsxs("tbody",{children:[Ss.distributions.map((i,b)=>e.jsxs("tr",{children:[e.jsx("td",{className:"commission-username",children:i.isSharedNode&&i.linkedUsername?`${i.username}/${i.linkedUsername}`:i.username||"—"}),e.jsx("td",{children:i.role?i.role.replace(/_/g," "):"—"}),e.jsx("td",{children:i.effectivePercent!=null?`${i.effectivePercent}%`:i.agentPercent!=null?`${i.agentPercent}%`:"—"}),e.jsxs("td",{className:"commission-amount",children:["$",Number(i.amount||0).toFixed(2)]})]},i.id||b)),e.jsxs("tr",{className:"commission-total-row",children:[e.jsx("td",{colSpan:3,children:e.jsx("strong",{children:"Total"})}),e.jsx("td",{className:"commission-amount",children:e.jsxs("strong",{children:["$",Ss.distributions.reduce((i,b)=>i+Number(b.amount||0),0).toFixed(2)]})})]})]})]})]})]})]})]}),q==="transactions"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:oe,onChange:i=>Te(i.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Filter Transactions"}),e.jsx("select",{value:z,onChange:i=>M(i.target.value),children:Go.map(i=>e.jsx("option",{value:i.value,children:i.label},i.value))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Ye(Gt.pending)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Fe?"Funding Wallet":"Available"}),e.jsx("b",{children:Ye(Gt.available)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:Fe?"House Money":"Carry"}),e.jsx("b",{className:Fe?Ks(Gt.carry):Gt.carry<0?"neg":"",children:Ye(Gt.carry)})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Non-Posted Casino"}),e.jsx("b",{children:Ye(Gt.nonPostedCasino)})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:se?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"Loading transactions..."})}):G.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:8,className:"tx-empty",children:"No transactions found"})}):G.map(i=>{const b=gr(i),X=ke(i.amount,0),ce=b?0:X,re=b?X:0,pe=i.balanceAfter,ve=Qa(i),je=Yn(i),Ce=Jn(i),Me=ne.includes(i.id);return e.jsxs("tr",{className:Me?"selected":"",onClick:()=>si(i.id),children:[e.jsx("td",{children:fn(i.date)}),e.jsx("td",{children:ve}),e.jsx("td",{children:je}),e.jsx("td",{children:ce>0?Ye(ce):"—"}),e.jsx("td",{children:re>0?Ye(re):"—"}),e.jsx("td",{className:kt(pe),children:pe!=null?Ye(pe):"—"}),e.jsx("td",{children:Ce}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:He=>{He.stopPropagation(),ni(i.id)},children:"Delete"})})]},i.id)})})]})}),e.jsx("button",{className:"btn btn-danger",onClick:ai,disabled:ne.length===0,children:"Delete Selected"})]}):q==="performance"?e.jsxs("div",{className:"performance-wrap",children:[e.jsx("div",{className:"perf-controls",children:e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Time"}),e.jsxs("select",{value:Ke,onChange:i=>Re(i.target.value),children:[e.jsx("option",{value:"daily",children:"Daily"}),e.jsx("option",{value:"weekly",children:"Weekly"}),e.jsx("option",{value:"monthly",children:"Monthly"}),e.jsx("option",{value:"yearly",children:"Yearly"})]})]})}),e.jsxs("div",{className:"performance-grid",children:[e.jsx("div",{className:"perf-left",children:e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Period"}),e.jsx("th",{children:"Net"})]})}),e.jsx("tbody",{children:mt?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"Loading performance..."})}):Ze.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No performance data"})}):Ze.map(i=>e.jsxs("tr",{className:Xe===i.key?"selected":"",onClick:()=>Ct(i.key),children:[e.jsx("td",{children:i.periodLabel}),e.jsx("td",{children:Math.round(Number(i.net||0))})]},i.key))})]})}),e.jsxs("div",{className:"perf-right",children:[e.jsxs("div",{className:"perf-title-row",children:[e.jsxs("div",{children:["Wagers: ",e.jsx("b",{children:zr})]}),e.jsxs("div",{children:["Result: ",e.jsx("b",{children:Ye(Wr)})]})]}),e.jsxs("table",{className:"perf-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:Ys?.periodLabel||"Selected Period"}),e.jsx("th",{children:"Amount"})]})}),e.jsx("tbody",{children:m.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:2,className:"tx-empty",children:"No data available in table"})}):m.map(i=>e.jsxs("tr",{className:i?.synthetic?"perf-synthetic":"",children:[e.jsx("td",{children:i.label||"Wager"}),e.jsx("td",{children:Math.round(Number(i.amount||0))})]},i.id))})]})]})]})]}):q==="freeplays"?e.jsxs("div",{className:"transactions-wrap",children:[e.jsxs("div",{className:"tx-controls freeplay-controls",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Display"}),e.jsxs("select",{value:Et,onChange:i=>At(i.target.value),children:[e.jsx("option",{value:"7d",children:"Last 7 Days"}),e.jsx("option",{value:"30d",children:"Last 30 Days"}),e.jsx("option",{value:"this-month",children:"This Month"}),e.jsx("option",{value:"all",children:"All Time"})]})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Balance"}),e.jsx("b",{children:Math.round(Number(os))})]}),e.jsxs("div",{className:"tx-stat",children:[e.jsx("label",{children:"Pending"}),e.jsx("b",{children:Math.round(Number(Vr))})]})]}),e.jsx("div",{className:"tx-table-wrap",children:e.jsxs("table",{className:"tx-table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Customer"}),e.jsx("th",{children:"Date"}),e.jsx("th",{children:"Description"}),e.jsx("th",{children:"Notes"}),e.jsx("th",{children:"Credit"}),e.jsx("th",{children:"Debit"}),e.jsx("th",{children:"Balance"}),e.jsx("th",{children:"Entered By"}),e.jsx("th",{className:"tx-actions-col",children:"Action"})]})}),e.jsx("tbody",{children:Se?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"Loading free play..."})}):Z.length===0?e.jsx("tr",{children:e.jsx("td",{colSpan:9,className:"tx-empty",children:"No free play transactions found"})}):Z.map(i=>{const b=ke(i.amount,0),X=ke(i.balanceBefore,0),re=ke(i.balanceAfter??os,0)>=X,pe=re?b:0,ve=re?0:b,je=ke(i?.balanceAfter??os,0),Ce=Qa(i),Me=Yn(i),He=Jn(i),_e=tt.includes(i.id);return e.jsxs("tr",{className:_e?"selected":"",onClick:()=>Jr(i.id),children:[e.jsx("td",{children:h.username}),e.jsx("td",{children:fn(i.date)}),e.jsx("td",{children:Ce}),e.jsx("td",{children:Me}),e.jsx("td",{children:pe>0?Math.round(pe):"—"}),e.jsx("td",{children:ve>0?Math.round(ve):"—"}),e.jsx("td",{children:Math.round(je)}),e.jsx("td",{children:He}),e.jsx("td",{className:"tx-actions-col",children:e.jsx("button",{type:"button",className:"tx-row-delete",onClick:et=>{et.stopPropagation(),Kr(i.id)},children:"Delete"})})]},i.id)})})]})}),e.jsxs("div",{className:"freeplay-bottom-row",children:[e.jsx("button",{className:"btn btn-danger",onClick:Qr,disabled:tt.length===0,children:"Delete Selected"}),e.jsx("button",{className:"btn btn-back freeplay-settings-btn",onClick:Zr,children:"Detailed Free Play Settings"}),e.jsxs("div",{className:"freeplay-inputs",children:[e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Free Play %"}),e.jsx("input",{type:"number",value:o.freePlayPercent,onChange:i=>Le("freePlayPercent",i.target.value)})]}),e.jsxs("div",{className:"tx-field",children:[e.jsx("label",{children:"Max FP Credit"}),e.jsx("input",{type:"number",value:o.maxFpCredit,onChange:i=>Le("maxFpCredit",i.target.value)})]})]})]})]}):q==="dynamic-live"?e.jsxs("div",{className:"dynamic-live-wrap",children:[e.jsxs("div",{className:"tx-field dl-top-select",children:[e.jsx("label",{children:"View Settings"}),e.jsx("select",{value:"wagering_limits",readOnly:!0,children:e.jsx("option",{value:"wagering_limits",children:"Wagering Limits"})})]}),e.jsxs("div",{className:"dynamic-live-grid",children:[e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Min Straight Bet :"}),e.jsx("input",{type:"number",value:o.dlMinStraightBet,onChange:i=>Le("dlMinStraightBet",i.target.value)}),e.jsx("label",{children:"Max Straight Bet :"}),e.jsx("input",{type:"number",value:o.dlMaxStraightBet,onChange:i=>Le("dlMaxStraightBet",i.target.value)}),e.jsx("label",{children:"Max Per Offering :"}),e.jsx("input",{type:"number",value:o.dlMaxPerOffering,onChange:i=>Le("dlMaxPerOffering",i.target.value)}),e.jsx("label",{children:"Max Bet Per Event :"}),e.jsx("input",{type:"number",value:o.dlMaxBetPerEvent,onChange:i=>Le("dlMaxBetPerEvent",i.target.value)}),e.jsx("label",{children:"Max Win for Single Bet :"}),e.jsx("input",{type:"number",value:o.dlMaxWinSingleBet,onChange:i=>Le("dlMaxWinSingleBet",i.target.value)}),e.jsx("label",{children:"Max Win for Event :"}),e.jsx("input",{type:"number",value:o.dlMaxWinEvent,onChange:i=>Le("dlMaxWinEvent",i.target.value)}),e.jsx("label",{children:"Delay (sec) - minimum 5 :"}),e.jsx("input",{type:"number",value:o.dlDelaySec,onChange:i=>Le("dlDelaySec",i.target.value)})]}),e.jsxs("div",{className:"dl-col",children:[e.jsx("label",{children:"Max Favorite Line :"}),e.jsx("input",{type:"number",value:o.dlMaxFavoriteLine,onChange:i=>Le("dlMaxFavoriteLine",i.target.value)}),e.jsx("label",{children:"Max Dog Line :"}),e.jsx("input",{type:"number",value:o.dlMaxDogLine,onChange:i=>Le("dlMaxDogLine",i.target.value)}),e.jsx("label",{children:"Min Parlay Bet :"}),e.jsx("input",{type:"number",value:o.dlMinParlayBet,onChange:i=>Le("dlMinParlayBet",i.target.value)}),e.jsx("label",{children:"Max Parlay Bet :"}),e.jsx("input",{type:"number",value:o.dlMaxParlayBet,onChange:i=>Le("dlMaxParlayBet",i.target.value)}),e.jsx("label",{children:"Max Win for Event(parlay only) :"}),e.jsx("input",{type:"number",value:o.dlMaxWinEventParlay,onChange:i=>Le("dlMaxWinEventParlay",i.target.value)}),e.jsx("label",{children:"Max Dog Line (Parlays) :"}),e.jsx("input",{type:"number",value:o.dlMaxDogLineParlays,onChange:i=>Le("dlMaxDogLineParlays",i.target.value)}),e.jsx("label",{children:"Wager Cool-Off (sec) :"}),e.jsx("input",{type:"number",value:o.dlWagerCoolOffSec,onChange:i=>Le("dlWagerCoolOffSec",i.target.value)})]}),e.jsx("div",{className:"dl-col-toggles",children:[["Live Parlays","dlLiveParlays"],["Block Wagering Prior To Start","dlBlockPriorStart"],["Block Wagering at Halftime","dlBlockHalftime"],["Include Graded Wagers in Limits","dlIncludeGradedInLimits"],["Use Risk (not Volume) for Limits","dlUseRiskLimits"]].map(([i,b])=>e.jsxs("div",{className:"switch-row",children:[e.jsxs("span",{children:[i," :"]}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!o[b],onChange:X=>Le(b,X.target.checked)}),e.jsx("span",{className:"slider"})]})]},b))})]})]}):q==="live-casino"?e.jsxs("div",{className:"live-casino-wrap",children:[e.jsxs("div",{className:"live-casino-grid",children:[e.jsx("div",{}),e.jsx("div",{className:"lc-col-head",children:"Default"}),e.jsx("div",{className:"lc-col-head",children:"Agent"}),e.jsx("div",{className:"lc-col-head",children:"Player"}),e.jsx("div",{className:"lc-label",children:"Max Win Per Day"}),e.jsx("input",{type:"number",value:o.casinoDefaultMaxWinDay,onChange:i=>Le("casinoDefaultMaxWinDay",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoAgentMaxWinDay,onChange:i=>Le("casinoAgentMaxWinDay",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoPlayerMaxWinDay,onChange:i=>Le("casinoPlayerMaxWinDay",i.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Day"}),e.jsx("input",{type:"number",value:o.casinoDefaultMaxLossDay,onChange:i=>Le("casinoDefaultMaxLossDay",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoAgentMaxLossDay,onChange:i=>Le("casinoAgentMaxLossDay",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoPlayerMaxLossDay,onChange:i=>Le("casinoPlayerMaxLossDay",i.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Win Per Week"}),e.jsx("input",{type:"number",value:o.casinoDefaultMaxWinWeek,onChange:i=>Le("casinoDefaultMaxWinWeek",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoAgentMaxWinWeek,onChange:i=>Le("casinoAgentMaxWinWeek",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoPlayerMaxWinWeek,onChange:i=>Le("casinoPlayerMaxWinWeek",i.target.value)}),e.jsx("div",{className:"lc-label",children:"Max Loss Per Week"}),e.jsx("input",{type:"number",value:o.casinoDefaultMaxLossWeek,onChange:i=>Le("casinoDefaultMaxLossWeek",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoAgentMaxLossWeek,onChange:i=>Le("casinoAgentMaxLossWeek",i.target.value)}),e.jsx("input",{type:"number",value:o.casinoPlayerMaxLossWeek,onChange:i=>Le("casinoPlayerMaxLossWeek",i.target.value)})]}),e.jsx("p",{className:"lc-note",children:"*Players that do not have a limit will be assigned the default limit or agent limit if one exists. Once player limits are assigned they will have to be manually overridden either by changing them individually or by changing an agent and sending through the new default limits they want to apply."})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"basics-grid",children:[e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"First Name"}),e.jsx("input",{value:o.firstName,placeholder:"Enter first name",onChange:i=>Lr(i.target.value)}),e.jsx("label",{children:"Last Name"}),e.jsx("input",{value:o.lastName,placeholder:"Enter last name",onChange:i=>Tr(i.target.value)}),e.jsx("label",{children:"Phone Number"}),e.jsx("input",{type:"tel",value:o.phoneNumber,placeholder:"Enter phone number",onChange:i=>Dr(i.target.value),className:Er?"duplicate-input":""}),e.jsxs("label",{children:["Password ",e.jsx("span",{className:"lock-badge",children:"Locked"})]}),e.jsx("input",{value:ga,readOnly:!0,placeholder:"Auto-generated from identity",className:`password-input-dark ${Mr?"duplicate-input":""}`}),e.jsx("label",{children:"Master Agent"}),["admin","super_agent","master_agent"].includes(n)?e.jsxs("select",{value:o.agentId,onChange:i=>Le("agentId",i.target.value),children:[e.jsx("option",{value:"",children:"None"}),v.filter(i=>{const b=String(i.role||"").toLowerCase();return b==="master_agent"||b==="super_agent"}).map(i=>{const b=i.id;return e.jsx("option",{value:b,children:i.username},b)})]}):e.jsx("input",{value:h.masterAgentUsername||h.agentUsername||"—",readOnly:!0}),e.jsx("label",{children:"Account Status"}),e.jsxs("select",{value:o.status,onChange:i=>Le("status",i.target.value),children:[e.jsx("option",{value:"active",children:"Active"}),e.jsx("option",{value:"disabled",children:"Disabled"}),e.jsx("option",{value:"read_only",children:"Read Only"})]}),e.jsx("div",{className:"switch-list",children:[["Sportsbook","sportsbook"],["Digital Casino","casino"],["Racebook","horses"],["Messaging","messaging"],["Dynamic Live","dynamicLive"],["Prop Plus","propPlus"],["Live Casino","liveCasino"]].map(([i,b])=>e.jsxs("div",{className:"switch-row",children:[e.jsx("span",{children:i}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:!!o[b],onChange:X=>Le(b,X.target.checked)}),e.jsx("span",{className:"slider"})]})]},b))})]}),e.jsxs("div",{className:"col-card",children:[e.jsx("label",{children:"Website"}),e.jsx("input",{value:window.location.hostname,readOnly:!0}),e.jsx("label",{children:"Account Type"}),e.jsxs("select",{value:o.accountType,onChange:i=>Le("accountType",i.target.value),children:[e.jsx("option",{value:"credit",children:"Credit"}),e.jsx("option",{value:"post_up",children:"Post Up"})]}),e.jsx("label",{children:"Min bet"}),e.jsx("input",{type:"number",value:o.minBet,onChange:i=>Le("minBet",i.target.value)}),e.jsx("label",{children:"Max bet"}),e.jsx("input",{type:"number",value:o.wagerLimit,onChange:i=>Le("wagerLimit",i.target.value)}),e.jsx("label",{children:"Credit Limit"}),e.jsx("input",{type:"number",value:o.creditLimit,onChange:i=>Le("creditLimit",i.target.value)}),e.jsx("label",{children:"Settle Limit"}),e.jsx("input",{type:"number",value:o.settleLimit,onChange:i=>Le("settleLimit",i.target.value)}),e.jsx("label",{children:"Zero Balance / Weekly"}),e.jsxs("select",{value:o.zeroBalanceWeekly,onChange:i=>Le("zeroBalanceWeekly",i.target.value),children:[e.jsx("option",{value:"standard",children:"Standard"}),e.jsx("option",{value:"zero_balance",children:"Zero Balance"}),e.jsx("option",{value:"weekly",children:"Weekly"})]}),e.jsx("label",{children:"Temporary Credit"}),e.jsx("input",{type:"number",value:o.tempCredit,onChange:i=>Le("tempCredit",i.target.value)})]}),e.jsxs("div",{className:"col-card",children:[e.jsxs("div",{className:"switch-row inline-top",children:[e.jsx("span",{children:"Enable Captcha"}),e.jsxs("label",{className:"switch",children:[e.jsx("input",{type:"checkbox",checked:o.enableCaptcha,onChange:i=>Le("enableCaptcha",i.target.checked)}),e.jsx("span",{className:"slider"})]})]}),e.jsx("label",{children:"Crypto Promo (%)"}),e.jsx("input",{type:"number",value:o.cryptoPromoPct,onChange:i=>Le("cryptoPromoPct",i.target.value)}),e.jsx("label",{children:"Promo Type"}),e.jsxs("select",{value:o.promoType,onChange:i=>Le("promoType",i.target.value),children:[e.jsx("option",{value:"promo_credit",children:"Promo Credit"}),e.jsx("option",{value:"bonus_credit",children:"Bonus Credit"}),e.jsx("option",{value:"none",children:"None"})]}),e.jsx("label",{children:"Expires On"}),e.jsx("input",{type:"date",value:o.expiresOn,onChange:i=>Le("expiresOn",i.target.value)}),e.jsx("label",{children:"Player Notes"}),e.jsx("textarea",{rows:9,placeholder:"For agent reference only",value:o.playerNotes,onChange:i=>Le("playerNotes",i.target.value)}),e.jsx("label",{children:"Balance"}),e.jsx("input",{type:"number",value:h.balance??0,onChange:i=>C(b=>({...b,balance:Number(i.target.value||0)}))}),e.jsx("button",{className:"btn btn-user",onClick:_r,children:"Update Balance"})]})]}),e.jsxs("div",{className:"apps-card",children:[e.jsx("h3",{className:"apps-title",children:"Apps"}),e.jsxs("div",{className:"apps-grid",children:[e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Venmo:"}),e.jsx("input",{value:o.appsVenmo,onChange:i=>Le("appsVenmo",i.target.value),placeholder:"@username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Cashapp:"}),e.jsx("input",{value:o.appsCashapp,onChange:i=>Le("appsCashapp",i.target.value),placeholder:"$cashtag"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Apple Pay:"}),e.jsx("input",{value:o.appsApplePay,onChange:i=>Le("appsApplePay",i.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"Zelle:"}),e.jsx("input",{value:o.appsZelle,onChange:i=>Le("appsZelle",i.target.value),placeholder:"Phone or email"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"PayPal:"}),e.jsx("input",{value:o.appsPaypal,onChange:i=>Le("appsPaypal",i.target.value),placeholder:"Email or @username"})]}),e.jsxs("div",{className:"apps-field",children:[e.jsx("label",{children:"BTC:"}),e.jsx("input",{value:o.appsBtc,onChange:i=>Le("appsBtc",i.target.value),placeholder:"Wallet address"})]}),e.jsxs("div",{className:"apps-field apps-field-full",children:[e.jsx("label",{children:"Other:"}),e.jsx("input",{value:o.appsOther,onChange:i=>Le("appsOther",i.target.value),placeholder:"Other handle"})]})]})]}),e.jsxs("div",{className:"bottom-line",children:[e.jsxs("span",{children:["Total Wagered: ",Ye(J.totalWagered||0)]}),e.jsxs("span",{children:["Net: ",e.jsx("b",{className:kt(J.netProfit||0),children:Ye(J.netProfit||0)})]})]})]}),Ue&&e.jsx("div",{className:"modal-overlay",onClick:()=>{A(!1),qe(!1),Je(!0)},children:e.jsx("div",{className:"modal-card",onClick:i=>i.stopPropagation(),children:We?(()=>{const i=Ps,b=vn,X=As,ce=Qs(X+(b.balanceDirection==="credit"?i:-i)),re=b.balanceDirection==="debit",pe=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-"),ve=Fe?ya:"Balance";return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Transaction"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:pe})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:["Previous ",ve]}),e.jsx("span",{style:{color:Sa(X)},children:Ye(X)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[b.label," :"]}),e.jsxs("span",{style:{color:Sa(ce)},children:[re?"-":"",Ye(i)]})]}),b.value==="deposit"&&!Fe&&e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Freeplay Bonus"}),e.jsx("span",{style:{color:we?"#166534":"#6b7280"},children:we?`${Zs.percent}% (${Ye(Zs.bonusAmount)})`:"Off"})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsxs("span",{children:["New ",ve]}),e.jsx("span",{style:{color:Sa(ce)},children:Ye(ce)})]})]}),U&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:U}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>qe(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!Nn||ot,onClick:ti,children:ot?"Saving…":"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:"New transaction"}),e.jsx("label",{children:"Transaction"}),e.jsx("select",{value:ie,onChange:i=>{c(i.target.value),i.target.value==="deposit"&&Je(!0),H("")},children:ka.map(i=>e.jsx("option",{value:i.value,children:i.label},i.value))}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:W,onChange:i=>{de(i.target.value===""?"":String(Math.round(Number(i.target.value)))),H("")},placeholder:"0"}),e.jsxs("div",{className:"tx-modal-balance-strip",role:"status","aria-live":"polite",children:[e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Fe?ya:"Current Balance"}),e.jsx("b",{className:Fe?Ks(As):kt(As),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>de(wa(As)),children:Ye(As)})]}),e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:Fe?"Funding Wallet":"Carry"}),e.jsx("b",{className:kt(Js),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>de(wa(Js)),children:Ye(Js)})]})]}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:be,onChange:i=>Ae(i.target.value),placeholder:"Optional note"}),vn.value==="deposit"&&!Fe&&e.jsxs("label",{style:{display:"flex",alignItems:"center",gap:"10px",marginTop:"14px",padding:"10px 12px",borderRadius:"10px",border:"1px solid #d1d5db",background:"#f9fafb",cursor:"pointer"},children:[e.jsx("input",{type:"checkbox",checked:we,onChange:i=>Je(i.target.checked)}),e.jsx("span",{style:{fontWeight:600,color:"#111827"},children:`${Zs.percent}% Freeplay (${Ye(Zs.bonusAmount)})`})]}),U&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:U}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>{A(!1),Je(!0)},children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!Nn,onClick:()=>{if(!wn){H("Enter a valid amount greater than 0.");return}H(""),qe(!0)},children:"Next"})]})]})})}),_t&&e.jsx("div",{className:"modal-overlay",onClick:()=>{Tt(!1),ht(!1)},children:e.jsx("div",{className:"modal-card",onClick:i=>i.stopPropagation(),children:ft?(()=>{const i=Ca,b=qr,X=os,ce=Qs(X+(b?-i:i)),re=new Date().toLocaleDateString("en-US",{month:"2-digit",day:"2-digit",year:"numeric"}).replace(/\//g,"-");return e.jsxs(e.Fragment,{children:[e.jsx("h4",{style:{marginBottom:"16px"},children:"Confirm Free Play"}),e.jsxs("div",{className:"tx-confirm-table",children:[e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Date"}),e.jsx("span",{children:re})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsx("span",{children:"Previous Balance"}),e.jsx("span",{style:{color:yn(X)},children:Ye(X)})]}),e.jsxs("div",{className:"tx-confirm-row",children:[e.jsxs("span",{children:[b?"Withdrawals":"Deposits"," :"]}),e.jsxs("span",{style:{color:b?"#dc2626":"#1f2937"},children:[b?"-":"",Ye(i)]})]}),e.jsxs("div",{className:"tx-confirm-row tx-confirm-total",children:[e.jsx("span",{children:"New Balance"}),e.jsx("span",{style:{color:yn(ce)},children:Ye(ce)})]})]}),Ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:Ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>ht(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!kn,onClick:Yr,children:"Confirm"})]})]})})():e.jsxs(e.Fragment,{children:[e.jsx("h4",{children:St==="withdraw"?"Withdraw Free Play":"New Free Play"}),e.jsx("label",{children:"Transaction"}),e.jsx("div",{className:"fp-modal-type-badge",style:{background:St==="withdraw"?"#fee2e2":void 0,color:St==="withdraw"?"#dc2626":void 0},children:St==="withdraw"?"Withdraw":"Deposit"}),e.jsx("label",{children:"Amount"}),e.jsx("input",{type:"number",step:"1",min:"0",value:ts,onChange:i=>{ss(i.target.value===""?"":String(Math.round(Number(i.target.value)))),De("")},placeholder:"0"}),e.jsx("div",{className:"tx-modal-balance-strip fp-modal-balance-strip",role:"status","aria-live":"polite",children:e.jsxs("div",{className:"tx-modal-balance-item",children:[e.jsx("span",{children:"Free Play Balance"}),e.jsx("b",{className:kt(os),style:{cursor:"pointer"},title:"Click to use this amount",onClick:()=>ss(wa(os)),children:Ye(os)})]})}),e.jsx("label",{children:"Description"}),e.jsx("input",{value:It,onChange:i=>Lt(i.target.value),placeholder:"Optional note"}),Ne&&e.jsx("div",{style:{marginTop:"12px",marginBottom:"12px",background:"#fee2e2",color:"#991b1b",border:"1px solid #fecaca",borderRadius:"8px",padding:"10px 12px",fontWeight:600},children:Ne}),e.jsxs("div",{className:"modal-actions",children:[e.jsx("button",{className:"btn btn-back",onClick:()=>Tt(!1),children:"Cancel"}),e.jsx("button",{className:"btn btn-save",disabled:!kn,onClick:()=>{if(!Sn){De("Enter a valid free play amount greater than 0.");return}De(""),ht(!0)},children:"Next"})]})]})})}),e.jsx("style",{children:`
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
      `})]}):e.jsx("div",{className:"admin-view",children:e.jsx("div",{className:"view-content",children:"User not found."})})}const jd=Object.freeze(Object.defineProperty({__proto__:null,default:lc},Symbol.toStringTag,{value:"Module"}));export{Yc as $,Uc as A,Is as B,Zt as C,$c as D,kl as E,_c as F,yc as G,bc as H,jc as I,tr as J,Mc as K,Bc as L,vc as M,Kn as N,ua as O,Nc as P,Wc as Q,Ec as R,Tc as S,Dc as T,Fc as U,Ic as V,zc as W,Vc as X,Hc as Y,qc as Z,Gc as _,gc as a,Jc as a0,Qc as a1,Kc as a2,Zc as a3,Xc as a4,ed as a5,td as a6,sd as a7,ad as a8,nd as a9,rd as aa,id as ab,ld as ac,od as ad,cd as ae,dd as af,ud as ag,md as ah,hd as ai,pd as aj,gd as ak,xd as al,fd as am,bd as an,jd as ao,Cc as b,Sc as c,kc as d,hc as e,fc as f,Lc as g,pc as h,xc as i,Za as j,er as k,Ac as l,mc as m,Pn as n,wc as o,Pc as p,es as q,ui as r,Ln as s,mi as t,gi as u,Oc as v,Rc as w,Xa as x,cs as y,sr as z};
