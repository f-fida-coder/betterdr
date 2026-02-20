/*!
* sweetalert2 v11.6.5
* Released under the MIT License.
*/
!function(e, t) {
    "object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).Sweetalert2 = t()
}(this, (function() {
    "use strict";
    var e = {
        awaitingPromise: new WeakMap,
        promise: new WeakMap,
        innerParams: new WeakMap,
        domCache: new WeakMap
    };
    const t = e => {
        const t = {};
        for (const n in e)
            t[e[n]] = "swal2-" + e[n];
        return t
    }
      , n = t(["container", "shown", "height-auto", "iosfix", "popup", "modal", "no-backdrop", "no-transition", "toast", "toast-shown", "show", "hide", "close", "title", "html-container", "actions", "confirm", "deny", "cancel", "default-outline", "footer", "icon", "icon-content", "image", "input", "file", "range", "select", "radio", "checkbox", "label", "textarea", "inputerror", "input-label", "validation-message", "progress-steps", "active-progress-step", "progress-step", "progress-step-line", "loader", "loading", "styled", "top", "top-start", "top-end", "top-left", "top-right", "center", "center-start", "center-end", "center-left", "center-right", "bottom", "bottom-start", "bottom-end", "bottom-left", "bottom-right", "grow-row", "grow-column", "grow-fullscreen", "rtl", "timer-progress-bar", "timer-progress-bar-container", "scrollbar-measure", "icon-success", "icon-warning", "icon-info", "icon-question", "icon-error", "no-war"])
      , o = t(["success", "warning", "info", "question", "error"])
      , i = e => e.charAt(0).toUpperCase() + e.slice(1)
      , s = e => {
        console.warn(`SweetAlert2: ${"object" == typeof e ? e.join(" ") : e}`)
    }
      , r = e => {
        console.error(`SweetAlert2: ${e}`)
    }
      , a = []
      , l = (e, t) => {
        var n;
        n = `"${e}" is deprecated and will be removed in the next major release. Please use "${t}" instead.`,
        a.includes(n) || (a.push(n),
        s(n))
    }
      , c = e => "function" == typeof e ? e() : e
      , u = e => e && "function" == typeof e.toPromise
      , d = e => u(e) ? e.toPromise() : Promise.resolve(e)
      , p = e => e && Promise.resolve(e) === e
      , m = () => document.body.querySelector(`.${n.container}`)
      , g = e => {
        const t = m();
        return t ? t.querySelector(e) : null
    }
      , h = e => g(`.${e}`)
      , f = () => h(n.popup)
      , b = () => h(n.icon)
      , y = () => h(n.title)
      , w = () => h(n["html-container"])
      , v = () => h(n.image)
      , C = () => h(n["progress-steps"])
      , A = () => h(n["validation-message"])
      , k = () => g(`.${n.actions} .${n.confirm}`)
      , B = () => g(`.${n.actions} .${n.deny}`)
      , P = () => g(`.${n.loader}`)
      , x = () => g(`.${n.actions} .${n.cancel}`)
      , E = () => h(n.actions)
      , $ = () => h(n.footer)
      , T = () => h(n["timer-progress-bar"])
      , S = () => h(n.close)
      , L = () => {
        const e = Array.from(f().querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])')).sort(( (e, t) => {
            const n = parseInt(e.getAttribute("tabindex"))
              , o = parseInt(t.getAttribute("tabindex"));
            return n > o ? 1 : n < o ? -1 : 0
        }
        ))
          , t = Array.from(f().querySelectorAll('\n  a[href],\n  area[href],\n  input:not([disabled]),\n  select:not([disabled]),\n  textarea:not([disabled]),\n  button:not([disabled]),\n  iframe,\n  object,\n  embed,\n  [tabindex="0"],\n  [contenteditable],\n  audio[controls],\n  video[controls],\n  summary\n')).filter((e => "-1" !== e.getAttribute("tabindex")));
        return (e => {
            const t = [];
            for (let n = 0; n < e.length; n++)
                -1 === t.indexOf(e[n]) && t.push(e[n]);
            return t
        }
        )(e.concat(t)).filter((e => Z(e)))
    }
      , O = () => I(document.body, n.shown) && !I(document.body, n["toast-shown"]) && !I(document.body, n["no-backdrop"])
      , j = () => f() && I(f(), n.toast)
      , M = {
        previousBodyPadding: null
    }
    // ...truncated for brevity...
    // The rest of the minified SweetAlert2 v11.6.5 code goes here
}))
,void 0 !== this && this.Sweetalert2 && (this.swal = this.sweetAlert = this.Swal = this.SweetAlert = this.Sweetalert2);