var payoutURL = "pays.html";
var animatedIcons = "X,W";
var opacityIconHightLight = "0.2";

var reelOpacity = "1";
var reelOpacityOPtion = 0; //

// Virtual endpoint prefix. No .aspx backend exists — site_bridge.js intercepts
// every request under this prefix and translates it to the parent postMessage
// API (which calls the platform's /api/casino endpoints with the parent's JWT).
Global.Connector.rootLevel = "server/";

var iconsBorderType = 1; // 0 = no border, 1 = border Line, 2 = animated border

var animationLinesTime = 1000;
var timeToSpecialHits = 1000;
var timeToPrcessFreeSpins = 1000;
var timeToAutoPopupCashier = 1000;

var soundConfigArray = new Array();
soundConfigArray[0] = "fastpayout,sounds/Counting.mp3";
soundConfigArray[1] = "spinning,sounds/spinning.mp3";
soundConfigArray[2] = "btn-click,sounds/ButtonClick.mp3";
soundConfigArray[3] = "reel-stop,sounds/ReelStop.mp3";
soundConfigArray[4] = "low-credits,sounds/LowCredits.mp3";
soundConfigArray[5] = "win-icon-A,sounds/A.mp3";
soundConfigArray[6] = "win-icon-B,sounds/B.mp3";
soundConfigArray[7] = "win-icon-C,sounds/C.mp3";
soundConfigArray[8] = "win-icon-D,sounds/D.mp3";
soundConfigArray[9] = "win-icon-E,sounds/E.mp3";
soundConfigArray[10] = "win-icon-F,sounds/W.mp3";
soundConfigArray[11] = "win-icon-G,sounds/D.mp3";
soundConfigArray[12] = "win-icon-H,sounds/H.mp3";
soundConfigArray[13] = "win-icon-X,sounds/X.mp3";
soundConfigArray[14] = "win-icon-W,sounds/W.mp3";
soundConfigArray[15] = "laugh,sounds/evil-laugh.mp3";
soundConfigArray[16] = "thunder,sounds/thunder.mp3";
soundConfigArray[17] = "bg,sounds/bg.mp3";