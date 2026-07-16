//background size
var BackgroundHeight = 640;
var BackgroundWidth = 855;
var Lang = '';

var MainBet = 0;
var GameChips = new Array();
var GameSounds = new Array();

//Game Status
var IsAnimatingHouseWay = false;
var IsAnimatingDeal = false;
var IsAnimatingCard = false;
var IsCallingServer = false;


var GameStatus = 0; //0:BETTING, 1: PLAYING_GAME, 2: WAITING_REBET
var BETTING = 0;
var PLAYING_GAME = 1;
var WAITING_REBET = 2;

