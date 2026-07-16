var payoutURL = "../../pays/Stage1.aspx?stylesheet=Stage1-fmt2";
var animatedIcons = "A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,W,X"; //use upper case and comma separator
var opacityIconHightLight = "0.5";

Global.Connector.rootLevel = "../../../aspNet/";

var iconsBorderType = 1; // 0 = no border, 1 = border Line, 2 = animated border

var animationLinesTime = 1000;
var timeToSpecialHits = 1000;
var timeToPrcessFreeSpins = 1000;
var timeToAutoPopupCashier = 1000;

var animationsFrames = 10;

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
soundConfigArray[10] = "win-icon-F,sounds/F.mp3";
soundConfigArray[11] = "win-icon-G,sounds/G.mp3";
soundConfigArray[12] = "win-icon-H,sounds/H.mp3";
soundConfigArray[13] = "win-icon-I,sounds/A.mp3";
soundConfigArray[14] = "win-icon-J,sounds/A.mp3";
soundConfigArray[15] = "win-icon-K,sounds/A.mp3";
soundConfigArray[16] = "win-icon-L,sounds/A.mp3";
soundConfigArray[17]= "win-icon-M,sounds/A.mp3";
soundConfigArray[18] = "win-icon-N,sounds/A.mp3";
soundConfigArray[19] = "win-icon-O,sounds/A.mp3";
soundConfigArray[20] = "win-icon-P,sounds/A.mp3";
soundConfigArray[21] = "win-icon-Q,sounds/A.mp3";
soundConfigArray[22] = "win-icon-I,sounds/A.mp3";
soundConfigArray[23] = "win-icon-X,sounds/X.mp3";
soundConfigArray[24] = "win-icon-W,sounds/W.mp3";