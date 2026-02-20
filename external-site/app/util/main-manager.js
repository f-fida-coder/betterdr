define(["ui/ui", "ui/load", "system/security", "manager/manager", "util/http", "util/util", "language/language"], (function(e, n, t, u, a, o, i) {
    "use strict";
    function c() {}
    e = new e,
    t = new t,
    u = new u,
    t.handlerActive(),
    u.verifySession() && (a = new a,
    o = new o,
    i = new i,
    u.getAccountInfo({
        trigger: !0,
        setLenguage: !0,
        func: function() {
            o.__proto__.muteSiteSounds = u.accountInfo.MuteSiteSounds,
            i.change({
                language: u.accountInfo.Language.split(" ")[0].toString().toUpperCase().trim(),
                trigger: !0,
                getFile: !0,
                call: u.setAccountInfo,
                func: c,
                info: u.accountInfo,
                self: u
            })
        }
    })),
    n.start({
        document: !1
    })
}
)),
$(document).ajaxComplete((function(e, n, t) {
    Pace.restart()
}
));
