import{r as m,j as e,aF as j}from"./index-DF-T-zGB.js";import{V as A}from"./AdminPanel-DBWLPsdW.js";const p={updateInfo:!0,suspendWagering:!0,enterDepositsWithdrawals:!0,deleteTransactions:!0,enterBettingAdjustments:!0,moveAccounts:!0,addAccounts:!0,changeCreditLimit:!0,setMinBet:!0,changeWagerLimit:!0,adjustParlayTeaser:!0,setGlobalTeamLimit:!0,maxWagerSetup:!0,allowDeny:!0,juiceSetup:!0,changeTempCredit:!0,changeSettleFigure:!0,views:Object.values(A).reduce((r,a)=>(r[a]=!0,r),{}),ipTracker:{manage:!0}},g={dashboard:"Dashboard",weeklyFigures:"Weekly Figures",pending:"Pending",messaging:"Messaging",gameAdmin:"Game Admin",customerAdmin:"Customer Admin",agentManager:"Agent Management",cashier:"Cashier",addCustomer:"Add Customer",thirdPartyLimits:"3rd Party Limits",props:"Props / Betting",agentPerformance:"Agent Performance",analysis:"Analysis",ipTracker:"IP Tracker",transactionsHistory:"Transaction History",deletedWagers:"Deleted Wagers",gamesEvents:"Games & Events",sportsbookLinks:"Sportsbook Links",betTicker:"Bet Ticker",ticketwriter:"TicketWriter",scores:"Scores",masterAgentAdmin:"Master Agent Admin",billing:"Billing",settings:"Settings",monitor:"System Monitor",rules:"Rules",feedback:"Feedback",faq:"FAQ",userManual:"User Manual",profile:"Profile"},x=(r,a)=>{if(!a||typeof a!="object")return r;const c={...r};return Object.keys(a).forEach(o=>{const i=a[o];i&&typeof i=="object"&&!Array.isArray(i)?c[o]=x(r[o]||{},i):c[o]=i}),c};function v({agent:r,onClose:a,onUpdate:c}){const[o,i]=m.useState(p),[d,u]=m.useState(!1);m.useEffect(()=>{r&&i(x(p,r.permissions||{}))},[r]);const b=t=>{i(n=>({...n,[t]:!n[t]}))},k=(t,n)=>{i(l=>({...l,[t]:{...l[t]||{},[n]:!l?.[t]?.[n]}}))},f=async()=>{u(!0);try{const t=localStorage.getItem("token");await j(r.id,o,t),alert("Permissions updated successfully"),c&&c(),a()}catch(t){console.error("Error updating permissions:",t),alert("Failed to update permissions: "+t.message)}finally{u(!1)}},s=(t,n)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:o[t],onChange:()=>b(t)}),e.jsx("span",{className:"checkmark"}),n]})},t),h=(t,n,l)=>e.jsx("div",{className:"permission-item",children:e.jsxs("label",{className:"checkbox-container",children:[e.jsx("input",{type:"checkbox",checked:!!o?.[t]?.[n],onChange:()=>k(t,n)}),e.jsx("span",{className:"checkmark"}),l]})},`${t}.${n}`);return e.jsxs("div",{className:"modal-overlay",children:[e.jsxs("div",{className:"modal-content permission-modal",children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("h3",{children:["Permissions: ",r.username]}),e.jsx("button",{className:"close-btn",onClick:a,children:"×"})]}),e.jsxs("div",{className:"scrollable-content",children:[e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"General Account Setup"}),s("updateInfo","Update Info"),s("suspendWagering","Suspend Wagering"),s("enterDepositsWithdrawals","Enter Deposits / Withdrawals"),s("deleteTransactions","Delete Transactions"),s("enterBettingAdjustments","Enter Betting Adjustments"),s("moveAccounts","Move Accounts"),s("addAccounts","Add Accounts")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Limit And Sport Setup"}),s("changeCreditLimit","Change Credit Limit"),s("setMinBet","Set Minimum Bet Amount"),s("changeWagerLimit","Change Wager Limit"),s("adjustParlayTeaser","Adjust Parlay/Teaser Setup"),s("setGlobalTeamLimit","Set Global Team Limit"),s("maxWagerSetup","Max Wager Setup"),s("allowDeny","Allow / Deny"),s("juiceSetup","Juice Setup"),s("changeTempCredit","Change Temp Credit"),s("changeSettleFigure","Change Settle Figure")]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"Dashboard Access"}),Object.keys(g).map(t=>h("views",t,g[t]))]}),e.jsxs("div",{className:"section",children:[e.jsx("h4",{children:"IP Tracker Actions"}),h("ipTracker","manage","Allow Block / Unblock / Whitelist")]})]}),e.jsxs("div",{className:"modal-footer",children:[e.jsx("button",{className:"btn-secondary",onClick:a,disabled:d,children:"Cancel"}),e.jsx("button",{className:"btn-primary",onClick:f,disabled:d,children:d?"Saving...":"Save"})]})]}),e.jsx("style",{children:`
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
      `})]})}export{v as A};
