define(["core/class", "ui/ui", "system/security", "util/util", "util/message", "util/http", "language/language", "manager/manager", "manager/report/report", "manager/report/help-report", "system/log", "manager/module/pending-thin"], (function(a, t, e, s, o, i, l, n, r, d, c, p) {
    "use strict";
    return t = new t,
    s = new s,
    i = new i,
    o = new o,
    l = new l,
    n = new n,
    r = new r,
    d = new d,
    c = new c,
    p = new p,
    a.extend({
        path: "/qubic/api/Manager/",
        customerPath: "/qubic/api/Customer/",
        ID: 0,
        lib: "/qubic/api/lib/",
        componentPath: "manager/module/weekly-figure/",
        componentPathSkin: {
            CLASSIC: "manager/module/weekly-figure/skin/classic/",
            GOTHAM: "manager/module/weekly-figure/skin/gotham/"
        },
        heriarchy: [],
        module: "weekly-figure",
        type: {
            DAY: "D",
            WAGER: "W",
            CATEGORY: "C"
        },
        display: {
            SUMMARY: "S",
            WITH_BALANCE: "W",
            ACTIVE: "A",
            ACTIVE_SUMMARY: "Z"
        },
        importExcel: {
            tableData: []
        },
        total: {
            players: 0,
            carry: 0,
            day1: 0,
            day2: 0,
            day3: 0,
            day4: 0,
            day5: 0,
            day6: 0,
            day7: 0,
            week: 0,
            depWd: 0,
            balance: 0,
            pending: 0,
            sports: 0,
            dynamic_live: 0,
            casino: 0,
            live_casino: 0,
            horses: 0,
            propbuilder: 0,
            soccer365: 0,
            flash_bet: 0,
            extended_props: 0,
            crash: 0,
            fantasy: 0,
            dragon: 0,
            adj: 0,
            other: 0,
            week_tl: 0,
            straight: 0,
            parlay: 0,
            ifBet: 0,
            teaser: 0,
            actionReverse: 0,
            contest: 0
        },
        suffix: ".",
        rows: {
            count: 0,
            data: [],
            limit: 5e4,
            date: {}
        },
        week: 0,
        startWeekDate: 0,
        init: function() {},
        listeners: function() {
            var a = $('[data-panel="weekly-figure-main"]')
              , t = a.find(".controls")
              , e = this;
            function o(a) {
                var t = $.extend({
                    week: 0,
                    desc: "This Week"
                }, a);
                c.write({
                    customerID: n.ID,
                    description: "View Weekly Figure - " + t.desc
                }),
                e.get({
                    week: t.week
                })
            }
            a.find('[data-list="type"]').val(n.accountInfo.DisplayWeek),
            t.find('input[type="radio"]').on("click", (function() {
                e.data({
                    type: $(this).val()
                })
            }
            )),
            $('[data-field="date-start"]').val(moment(new Date).format("MM/DD/YYYY")).pickadate({
                format: "mm/dd/yyyy"
            }),
            a.find('[data-action="get-weekly-figure"]').off("click").on("click", (function() {
                o({
                    week: $(this).data("week"),
                    desc: $(this).text()
                })
            }
            )),
            a.find('[data-action="get-weekly-figure-off"]').off("click").on("click", (function() {
                o({
                    week: $(this).data("week"),
                    desc: $(this).text()
                })
            }
            )),
            a.find('[data-action="get-weekly-by-calendar"]').off("click").on("click", (function() {
                var a = moment($('[data-field="date-start"]').val())
                  , t = s.defaultCountWeeks
                  , o = n.accountInfo.ShowHowManyWeeks;
                o > 0 && (t = o);
                var i = moment(new Date).subtract(t, "week");
                if (a.isBefore(i))
                    alert("Please select date from " + i.format("MM/DD/YYYY"));
                else {
                    var l = moment().day()
                      , r = [6, 0, 1, 2, 3, 4, 5];
                    0 == n.authorizations.StartOfWeek || 1 == n.authorizations.StartOfWeek && (r = [5, 6, 0, 1, 2, 3, 4]);
                    for (var d = r[l], c = 0, p = 0; p <= t; p++) {
                        var f = moment().subtract(d, "day").startOf().subtract(parseInt(c), "week").format("MM/DD/YYYY");
                        if (moment(f).isSameOrBefore(a))
                            break;
                        c++
                    }
                    e.get({
                        week: c
                    })
                }
            }
            )),
            "on" == n.reportConfig.showName ? $('[data-list="opt-cols"] option[value="Name"]').prop("selected", !0) : $('[data-list="opt-cols"] option[value="Password"]').prop("selected", !0),
            a.find('[data-list="opt-cols"]').on("change", (function() {
                var a = JSON.parse(JSON.stringify(n.reportConfig))
                  , t = $(this).val();
                "Name" == t && (a.showName = "on",
                a.showPassword = "off"),
                "Password" == t && (a.showName = "off",
                a.showPassword = "on"),
                e.updateReportConfig(a, "off")
            }
            )),
            a.find('[data-tabs="weeks"] a').on("click", (function() {
                a.find('[data-tabs="weeks"] a').removeClass("active"),
                $(this).addClass("active")
            }
            )),
            a.find('[data-list="type"]').on("change", (function() {
                $('[data-panel="weekly-figure-main"] .card').removeClass("inline-block"),
                c.write({
                    customerID: n.ID,
                    description: "Change view weekly figure - " + $(this).find("option:selected").text()
                }),
                e.get({
                    week: $.week,
                    type: $(this).val()
                }),
                n.__proto__.accountInfo.DisplayWeek = $(this).val(),
                e.updateDisplayWeek()
            }
            )),
            a.find("#big-amount").on("input", (function() {
                localStorage.setItem("BIG-AMOUNT", $(this).val())
            }
            )),
            a.find('[data-type="display"]').on("change", (function() {
                $('[data-panel="weekly-figure-main"] .card').removeClass("inline-block"),
                localStorage.setItem("DISPLAY-MODE", $(this).val());
                var a = $(".modal#customize");
                e.data({
                    week: $.week,
                    layout: $(this).val()
                }),
                a.modal("hide")
            }
            )),
            a.find('[data-type="excel-setting"]').on("change", (function() {
                localStorage.setItem("EXCEL-MODE", $(this).val())
            }
            )),
            a.find('[data-action="print"]').off().on("click", (function() {
                $('[data-content="table-weekly-figure"]').print({
                    globalStyles: !1,
                    mediaPrint: !1,
                    stylesheet: "../css/weeklyfigures.css",
                    noPrintSelector: ".no-print",
                    iframe: !0,
                    append: null,
                    prepend: null,
                    manuallyCopyFormValues: !0,
                    deferred: $.Deferred(),
                    timeout: 750,
                    title: null,
                    doctype: "<!doctype html>"
                }),
                c.write({
                    customerID: n.ID,
                    description: "Print Weekly Figures"
                })
            }
            )),
            a.find('i[data-export="excel"]').on("click", (function() {
                s.exportXLS({
                    title: n.ID + "-weekly-figure-report",
                    el: $('[data-content="table-weekly-figure"]')
                }),
                c.write({
                    customerID: n.ID,
                    description: "Expor Excel Weekly Figures"
                })
            }
            )),
            a.find('[data-type="display-add-on"]').val(localStorage.getItem("ACC-DISPLAY")),
            a.find('[data-type="display-add-on"]').on("change", (function() {
                s.isOnlyMobile() && localStorage.setItem("ACC-DISPLAY", $(this).val())
            }
            )),
            a.find('[data-list="sub-agent"]').on("change", (function() {
                var a = $(this).val();
                e.data({
                    agent: a
                })
            }
            )),
            t.find('button[data-export="excel"]').on("click", (function() {
                s.exportXLS({
                    title: n.ID + "-weekly-figure-report",
                    el: $('[data-content="table-weekly-figure"]')
                })
            }
            )),
            t.find("button[data-print]").on("click", (function() {
                window.print()
            }
            )),
            a.find('[data-action="update-report-config"]').on("click", (function() {
                var a = $(".modal#customize")
                  , t = {
                    adds: {}
                };
                t.showActiveOnly = n.reportConfig.showActiveOnly,
                t.showBalance = a.find("#balance-forward").prop("checked") ? "on" : "off",
                t.showCasinoDistribution = n.reportConfig.showCasinoDistribution,
                t.showDailyFigures = a.find("#daily-figures").prop("checked") ? "on" : "off",
                t.showDepositWithdraw = a.find("#deposit-withdrawals").prop("checked") ? "on" : "off",
                t.showEndBalance = a.find("#end-balance").prop("checked") ? "on" : "off",
                t.showLastWagerDate = a.find("#last-wager-placed").prop("checked") ? "on" : "off",
                t.showName = a.find("#name").prop("checked") ? "on" : "off",
                t.showPassword = a.find("#password").prop("checked") ? "on" : "off",
                t.showPending = a.find("#pending-balance").prop("checked") ? "on" : "off",
                t.showPhone = a.find("#phone-number").prop("checked") ? "on" : "off",
                t.showSettleFigure = a.find("#settle-figure").prop("checked") ? "on" : "off",
                t.showWagersSameScreen = n.reportConfig.showWagersSameScreen,
                t.eowBalanceDefault = a.find('[data-type="eow-balance-default"]').val(),
                t.adds.weeklyScroll = a.find('[data-type="display-interface"]').val();
                var s = a.find("#apply-all-agents").prop("checked") ? "on" : "off";
                a.find("#last-login").prop("checked") ? localStorage.setItem("last-login", "on") : localStorage.setItem("last-login", "off"),
                e.updateReportConfig(t, s)
            }
            )),
            a.find('[data-action="show-customize"]').on("click", (function() {
                c.write({
                    customerID: n.ID,
                    description: "Show Customize Report Weekly Figures"
                }),
                $('[data-panel="weekly-figure-main"] .card table tbody:not(.tb-0,.tb-1,.tb-2)').hide(),
                $(".modal#customize").modal("show")
            }
            )),
            a.find('[data-action="get-summary"]').on("click", (function() {
                $('[data-list="type"]').val(e.display.SUMMARY),
                $('[data-list="type"]').trigger("change")
            }
            )),
            $(".modal#customize").on("hidden.bs.modal", (function() {
                $('[data-panel="weekly-figure-main"] .card table tbody:not(.tb-0,.tb-1,.tb-2)').show()
            }
            )),
            e.setReportConfig(),
            s.isOnlyMobile() && ($('[data-list="type"] #w-a-b').text("w/ Balance"),
            $('[data-list="type"] #a-f-week').text("Active")),
            a.find("#toggleFilter").off().on("click", (function() {
                $(".filter-row").slideToggle("")
            }
            )),
            a.find('[data-action="get-active-player"]').on("click", (function() {
                e.callGetActivePlayer({
                    el: $(this)
                })
            }
            ))
        },
        // ...existing code...
    })
}
));
