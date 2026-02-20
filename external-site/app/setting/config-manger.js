define(["/app/setting/version.js"], (function(e) {
    e.use_dinamic && (e.version = (new Date).getTime()),
    requirejs.config({
        baseUrl: "/app",
        urlArgs: "bust=" + e.version,
        waitSeconds: 0
    }),
    requirejs(["main-manager"])
}
));
