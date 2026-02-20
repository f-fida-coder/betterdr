define(["core/class", "ui/ui", "system/security", "util/util", "util/message", "util/http", "language/language", "manager/manager", "manager/report/report", "manager/report/help-report", "system/log"], (function(e, t, a, n, o, r, i, l, s, c, d) {
    "use strict";
    return t = new t,
    n = new n,
    r = new r,
    o = new o,
    i = new i,
    l = new l,
    s = new s,
    c = new c,
    d = new d,
    e.extend({
        path: "/qubic/api/Manager/",
        customerPath: "/qubic/api/Customer/",
        ID: 0,
        lib: "/qubic/api/lib/",
        componentPath: "manager/module/pending/",
        componentPathSkin: {
            CLASSIC: "manager/module/pending/skin/classic/",
            GOTHAM: "manager/module/pending/skin/gotham/"
        },
        module: "pending",
        agentSelected: "0",
        customerSelected: "0",
        rows: {
            count: 0,
            data: [],
            limit: 30
        },
        sort: {
            GROUP: {
                BASE_AMOUNT: 1
            },
            TYPE: {
                DESC: 1,
                ASC: 2
            }
        },
        player: "",
        init: function() {},
        // ...existing code...
    })
}
));
