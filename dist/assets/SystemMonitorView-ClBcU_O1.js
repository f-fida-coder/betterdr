import{r as l,j as s,b0 as N,b1 as S,ar as w}from"./index-vZr0KL47.js";const L=()=>{const[c,g]=l.useState(null),[o,f]=l.useState(null),[u,h]=l.useState(!0),[x,b]=l.useState(null),i=async()=>{try{const e=localStorage.getItem("token");if(!e)throw new Error("Please login to view system monitor");const[t,y]=await Promise.all([N(e),S(e)]);g(t),f(y),b(new Date),h(!1)}catch(e){console.error("Monitor Error:",e),h(!1)}};if(l.useEffect(()=>{i();const e=setInterval(()=>{document.hidden||i()},6e4);return()=>clearInterval(e)},[]),u&&!c)return s.jsx("div",{className:"admin-content-card",children:"Loading System Monitor..."});const d=c?.counts||{users:0,bets:0,matches:0},m=c?.liveMatches||[],j=o?.items||[],n=o?.summary||{links:0,collections:0,rows:0},p=c?.sportsbookHealth||{},a=p?.oddsSync||{},r=p?.settlement||{},v=async()=>{try{const e=localStorage.getItem("token");if(!e)throw new Error("Please login first");const t=await w(e);alert(`Odds Refreshed! Created: ${t.results?.created||0}, Updated: ${t.results?.updated||0}, Score-only updates: ${t.results?.scoreOnlyUpdates||0}, Settled: ${t.results?.settled||0}`),i()}catch(e){console.error("Refresh error:",e),alert(e.message||"Error refreshing odds")}};return s.jsxs("div",{className:"admin-view-container",children:[s.jsxs("div",{className:"monitor-header",style:{display:"flex",justifyContent:"space-between",alignItems:"center"},children:[s.jsx("h2",{style:{color:"#fff",margin:0},children:"System Monitor"}),s.jsxs("div",{style:{color:"#aaa",fontSize:"0.9rem"},children:["Last updated: ",x?x.toLocaleTimeString():"Never"]}),s.jsx("button",{onClick:v,style:{background:"#e67e22",color:"white",border:"none",padding:"8px 16px",borderRadius:"4px",cursor:"pointer",fontWeight:"bold"},children:"🔄 Refresh Live Odds"})]}),s.jsxs("div",{className:"stats-grid",children:[s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon users",children:s.jsx("i",{className:"fa-solid fa-users"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Total Users"}),s.jsx("p",{children:d.users})]})]}),s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon bets",children:s.jsx("i",{className:"fa-solid fa-ticket"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Total Bets"}),s.jsx("p",{children:d.bets})]})]}),s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon matches",children:s.jsx("i",{className:"fa-solid fa-futbol"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Tracked Matches"}),s.jsx("p",{children:d.matches})]})]})]}),s.jsxs("div",{className:"admin-content-card",style:{marginBottom:"20px"},children:[s.jsx("div",{className:"card-header",children:s.jsxs("h3",{children:[s.jsx("i",{className:"fa-solid fa-heart-pulse"})," Sportsbook Feed Health"]})}),s.jsxs("div",{className:"stats-grid",style:{marginBottom:0},children:[s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon matches",children:s.jsx("i",{className:"fa-solid fa-signal"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Odds Feed"}),s.jsx("p",{children:a?.bettingSuspended?"STALE / CLOSED":"OK"}),s.jsxs("small",{children:["Last odds sync: ",a?.lastOddsSuccessAt?new Date(a.lastOddsSuccessAt).toLocaleString():"Never"]}),s.jsxs("small",{style:{display:"block"},children:["Age: ",a?.syncAgeSeconds??"—","s"]})]})]}),s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon bets",children:s.jsx("i",{className:"fa-solid fa-flag-checkered"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Results Feed"}),s.jsx("p",{children:a?.lastScoresSuccessAt?"SYNCING":"UNKNOWN"}),s.jsxs("small",{children:["Last score sync: ",a?.lastScoresSuccessAt?new Date(a.lastScoresSuccessAt).toLocaleString():"Never"]}),s.jsxs("small",{style:{display:"block"},children:["Failures: ",a?.consecutiveFailures??0]})]})]}),s.jsxs("div",{className:"stat-card",children:[s.jsx("div",{className:"stat-icon users",children:s.jsx("i",{className:"fa-solid fa-scale-balanced"})}),s.jsxs("div",{className:"stat-info",children:[s.jsx("h3",{children:"Settlement"}),s.jsx("p",{children:r?.lastRunStatus||"unknown"}),s.jsxs("small",{children:["Last success: ",r?.lastSuccessAt?new Date(r.lastSuccessAt).toLocaleString():"Never"]}),s.jsxs("small",{style:{display:"block"},children:["Last match: ",r?.lastMatchId||"—"]})]})]})]}),(a?.lastError||r?.lastError)&&s.jsxs("div",{style:{marginTop:"16px",padding:"12px",borderRadius:"8px",background:"rgba(255, 80, 80, 0.12)",color:"#ffb3b3"},children:[s.jsxs("div",{children:[s.jsx("strong",{children:"Last sync error:"})," ",a?.lastError||"—"]}),s.jsxs("div",{children:[s.jsx("strong",{children:"Last settlement error:"})," ",r?.lastError||"—"]})]})]}),s.jsxs("div",{className:"admin-content-card",children:[s.jsx("div",{className:"card-header",children:s.jsxs("h3",{children:[s.jsx("i",{className:"fa-solid fa-satellite-dish"})," Live & Scored Matches (DB View)"]})}),s.jsx("div",{className:"table-responsive",children:s.jsxs("table",{className:"admin-table",children:[s.jsx("thead",{children:s.jsxs("tr",{children:[s.jsx("th",{children:"Sport"}),s.jsx("th",{children:"Match"}),s.jsx("th",{children:"Scores"}),s.jsx("th",{children:"Status"}),s.jsx("th",{children:"Last Updated"})]})}),s.jsx("tbody",{children:m.length===0?s.jsx("tr",{children:s.jsx("td",{colSpan:"5",className:"text-center",children:"No live or scored matches found."})}):m.map(e=>s.jsxs("tr",{children:[s.jsx("td",{children:e.sport?.replace("_"," ").toUpperCase()}),s.jsxs("td",{children:[e.homeTeam," ",s.jsx("span",{className:"vs",children:"vs"})," ",e.awayTeam]}),s.jsxs("td",{className:"score-cell",children:[s.jsx("span",{className:"score-badge home",children:e.score?.score_home??e.score?.scoreHome??0}),"-",s.jsx("span",{className:"score-badge away",children:e.score?.score_away??e.score?.scoreAway??0})]}),s.jsx("td",{children:s.jsx("span",{className:`status-badge ${e.status}`,children:e.status})}),s.jsx("td",{children:new Date(e.lastUpdated).toLocaleTimeString()})]},e.id))})]})})]}),s.jsxs("div",{className:"admin-content-card",style:{marginTop:"20px"},children:[s.jsx("div",{className:"card-header",children:s.jsxs("h3",{children:[s.jsx("i",{className:"fa-solid fa-diagram-project"})," Dashboard Link to Entity/Table Map"]})}),s.jsxs("div",{style:{color:"#666",marginBottom:"10px",fontSize:"0.9rem"},children:["Links: ",n.links," | Collections: ",n.collections," | Total Rows: ",n.rows]}),s.jsx("div",{className:"table-responsive",children:s.jsxs("table",{className:"admin-table",children:[s.jsx("thead",{children:s.jsxs("tr",{children:[s.jsx("th",{children:"Dashboard Link"}),s.jsx("th",{children:"Collections"}),s.jsx("th",{children:"Tables / Views"}),s.jsx("th",{children:"API Routes"})]})}),s.jsx("tbody",{children:j.length===0?s.jsx("tr",{children:s.jsx("td",{colSpan:"4",className:"text-center",children:"No entity catalog data found."})}):j.map(e=>s.jsxs("tr",{children:[s.jsxs("td",{children:[s.jsx("strong",{children:e.label}),s.jsx("div",{style:{fontSize:"0.8rem",color:"#666"},children:e.id})]}),s.jsx("td",{children:(e.collections||[]).map(t=>s.jsxs("div",{style:{marginBottom:"4px"},children:[s.jsx("code",{children:t.collection})," (",t.rows,")"]},`${e.id}-${t.collection}`))}),s.jsx("td",{children:(e.collections||[]).map(t=>s.jsxs("div",{style:{marginBottom:"4px",fontSize:"0.85rem"},children:[s.jsxs("div",{children:[s.jsx("code",{children:t.table})," ",t.exists?"":"(missing)"]}),s.jsxs("div",{children:[s.jsx("code",{children:t.entityView})," | ",s.jsx("code",{children:t.flatTable})]})]},`${e.id}-${t.collection}-table`))}),s.jsx("td",{children:(e.routes||[]).map(t=>s.jsx("div",{style:{marginBottom:"2px",fontSize:"0.85rem"},children:s.jsx("code",{children:t})},`${e.id}-${t}`))})]},e.id))})]})})]}),s.jsx("style",{children:`
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
            `})]})};export{L as default};
