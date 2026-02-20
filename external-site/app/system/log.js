define(["core/class", "system/security", "util/util", "ui/ui"], (function(e, t, i, o) {
    return i = new i,
    o = new o,
    e.extend({
        path: i.apiPath + "api/Log/",
        me: [],
        init: function() {},
        write: function(e) {
            var t = "";
            switch (i.isMobile() && (t = " (M) "),
            o.modeSelected) {
            case o.mode.STANDARD:
                "STANDARD";
                break;
            case o.mode.BET_SLIP:
                "BET SLIP"
            }
            var a = $.extend({
                additional: "",
                trigger: !1
            }, e)
              , r = window.version;
            void 0 === window.version && (r = i.version);
            var n = {
                customerID: a.customerID,
                description: t + a.description + t + " [ v" + r + " | " + window.location.hostname + " ]",
                additional: a.additional,
                operation: "write"
            };
            $.ajax({
                url: this.path + n.operation,
                cache: !1,
                data: n,
                type: "POST",
                success: function(e) {
                    a.trigger && a.func()
                }
            })
        },
        writeDetail: function(e) {
            var t = ""
              , a = this;
            switch (i.isMobile() && (t = " (M) "),
            o.modeSelected) {
            case o.mode.STANDARD:
                "STANDARD";
                break;
            case o.mode.BET_SLIP:
                "BET SLIP"
            }
            var r = $.extend({
                additional: "",
                trigger: !1
            }, e)
              , n = window.version;
            void 0 === window.version && (n = i.version);
            var c = {
                customerID: r.customerID,
                data: r.data,
                ticket: r.ticket,
                info: t + " [SITE : " + window.location.hostname + " v" + n + "] ",
                operation: "writeDetail"
            };
            $.ajax({
                url: this.path + c.operation,
                cache: !1,
                data: c,
                type: "POST",
                success: function(e) {
                    r.trigger && a.write({
                        customerID: r.customerID,
                        description: i.BET.SELECTED + " Lawless Change Odds",
                        func: r.func,
                        trigger: !0
                    })
                }
            })
        },
        writeErr: function(e) {
            var t = $.extend({
                info: ""
            }, e)
              , i = {
                customerID: t.customerID,
                ticket: t.ticket,
                data: t.data,
                info: t.info,
                operation: "writeErr"
            };
            $.ajax({
                url: this.path + i.operation,
                cache: !1,
                data: i,
                type: "POST",
                success: function(e) {},
                error: function(e, t, i) {
                    console.log("fail to writeErr")
                }
            })
        }
    })
}
));
