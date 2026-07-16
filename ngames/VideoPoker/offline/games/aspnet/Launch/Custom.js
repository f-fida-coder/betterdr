/*
//for now is used only for UG and IL
var heartBeatURL = "../aspnet/Launch/test.aspx";
var callEveryMilliseconds = "2000";

$(document).ready(function () {
console.log("Domain Security")
heartbeat();
});

function heartbeat() {
if (typeof (heartBeatURL) != "undefined" && heartBeatURL != null) {
load_page();
setTimeout(heartbeat, callEveryMilliseconds);       
}
}

function load_page() {
document.getElementById("custom-heart-beat").innerHTML = '<object type="text/html" data="' + heartBeatURL + '" ></object>';
}*/