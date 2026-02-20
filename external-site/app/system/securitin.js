requirejs.config({
    paths: {
        swal2: "../assets/js/scripts/swal2/sweetalert2.min"
    },
    shim: {
        swal2: {
            exports: "Swal"
        }
    }
}),
define(["core/class", "util/http", "util/message", "util/util", "language/language", "swal2"], (function(e, t, a, i, o, n) {
    return t = new t,
    a = new a,
    i = new i,
    o = new o,
    e.extend({
        path: i.apiPath + "api/System/",
        timeInactive: 12e5,
        lib: i.apiPath + "api/lib/",
        captchaAllow: !1,
        captchaAccess: !1,
        captchaListernerAdded: !1,
        init: function() {},
        load: function() {
            this.listeners()
        },
        listeners: function() {
            var e = this;
            $('[data-action="login"]').on("click", (function() {
                $(this).attr("disabled", !0),
                e.credentials({
                    func: e.authenticate
                })
            }
            )),
            $('[data-security="form"] [data-field]').keypress((function(t) {
                13 == t.which && ($(this).attr("disabled", !0),
                e.credentials({
                    func: e.authenticate
                }))
            }
            )),
            $("head").append('<link rel="stylesheet" href="css/font-awesome.min.css?v=2" type="text/css" />'),
            $("head").append('<link rel="stylesheet" href="assets/js/scripts/swal2/sweetalert2.min.css" type="text/css" />'),
            $("head").append("<style> .swal-modal {text-align:left !important; } </style>"),
            $("head").append("<style>.swal2-html-container{font-size:1.5em; text-align:left;margin:1em;} .swal2-styled.swal2-confirm{font-size:1.5em;}.swal2-styled.swal2-cancel,.swal2-validation-message{font-size:1.5em;}</style>")
        },
        // ...existing code...
        presetParam: function() {
            var e = this;
            $.ajaxPrefilter((function(t, a, o) {
                if (void 0 === t.headers && (t.headers = {}),
                t.headers.Authorization || o.setRequestHeader("Authorization", "Bearer " + e.token),
                t.url = t.url.toString().replace("qubic", i.apiPath.replace(/\//g, "")),
                "" == sessionStorage.MASTER_ID || "M" !== sessionStorage.agentType && "A" !== sessionStorage.agentType)
                    t.data = $.param($.extend({}, a.data, {
                        agentSite: 0
                    }));
                else {
                    var n = sessionStorage.MASTER_ID
                      , s = n;
                    a.data && a.data.agentID && (n = a.data.agentID,
                    a.data.agentOwner && n !== a.data.agentOwner && (n = a.data.agentOwner)),
                    0 === s && (s = n),
                    t.data = $.param($.extend({}, a.data, {
                        agentID: s,
                        agentOwner: n,
                        agentSite: 1
                    }))
                }
            }
            ))
        }
    })
}
));
