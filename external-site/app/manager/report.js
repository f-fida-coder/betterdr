define(["core/class", "ui/ui", "system/security", "util/util", "util/message", "util/http", "language/language", "system/log"], (function(e, t, a, n, o, i, s, r) {
    "use strict";
    return t = new t,
    n = new n,
    i = new i,
    o = new o,
    s = new s,
    r = new r,
    a = new a,
    e.extend({
        path: "/qubic/api/Manager/",
        customerPath: "/qubic/api/Customer/",
        reportPath: n.apiPath + "api/Report/",
        ID: 0,
        MASTER_ID: 0,
        emailCount: [],
        type: "",
        lib: "qubic/api/lib/",
        accountInfo: {},
        site: {},
        reportConfig: {},
        reportConfigPending: {},
        componentPath: "manager/",
        componentPathCustomer: "customer/",
        heriarchy: [],
        completeHeriarchy: {},
        completeHeriarchyTree: {},
        completeHeriarchyLength: {},
        completeHeriarchyAjax: {},
        loadedHierarchy: !1,
        agentPackage: {},
        searchItemsDisplay: 50,
        propListHide: [],
        players: [],
        agents: [],
        selectedPlayer: 0,
        selectedAgent: 0,
        ips: {},
        sports: [],
        AgentHeriarchy: [],
        viewAgent: !1,
        otherCalls: !1,
        module: "dashboard",
        SERVER_DATE: new Date,
        message: {
            INBOX: 0,
            SENT: 1,
            COUNT: 2,
            type: {
                POPUP: "uglypopup",
                STAMP: "fancyMessage"
            }
        },
        LANGUAGETYPE: {
            US: "flag-icon flag-icon-us",
            ES: "flag-icon flag-icon-es",
            CHI: "flag-icon flag-icon-cn",
            FR: "flag-icon flag-icon-fr",
            GRE: "flag-icon flag-icon-gr",
            JP: "flag-icon flag-icon-jp",
            KO: "flag-icon flag-icon-kr",
            VIET: "flag-icon flag-icon-vn"
        },
        authorizations: {},
        distribution: 0,
        server: !1,
        isLoading: !1,
        init: function() {
            0 === this.ID && void 0 !== sessionStorage.customerID && (this.__proto__.ID = sessionStorage.customerID.toString().trim(),
            this.__proto__.type = sessionStorage.agentType,
            this.callChangeViewPort({
                scale: t.scaleType.NORMAL
            }))
        },
        // ...existing code...
        setCashierText: function() {
            var e = this;
            e.accountInfo.CryptoCashierType == n.cashier.EasyCash && ($(".cashier-text").attr("data-language", "L-1432").text("Pay My Bill"),
            $(".cashier-text-short").attr("data-language", "L-1432").text("Pay Bill"));
            var t = n.cashierAvailable.includes(e.accountInfo.CryptoCashierType)
              , a = n.appsCashierAvailable.includes(e.accountInfo.AppsCryptoCashierType);
            (t && a || a) && ($(".cashier-text").attr("data-language", "L-1432").text("Pay My Bill"),
            $(".cashier-text-short").attr("data-language", "L-1432").text("Pay Bill"))
        }
    })
}
));
