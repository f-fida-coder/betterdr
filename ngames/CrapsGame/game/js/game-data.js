
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



var BetPosition = new Array();
var LastBetPosition = new Array();
var BetArray = new Array();
var LastBetArraySent = new Array();
var CompleteLastBetArray = new Array();
var LastBetArray = new Array();
var BetChipsArray = new Array();

var ResponseBetsArray = new Array();
var ResponseResultsArray = new Array();

var GameChips = new Array();
var ChipsSizeBet = 20;
var ChipsSizeSpin = 10;
var ChipsSpaceSpin = 1.5;
var ChipsSpaceBet = 3;
var TextSizeBet = 12;
var TextSizeSpin = 10;


var OddsMaxTimesBet = 2; //2 times the parent bet
var OddsMaxTimesBetArray = new Array();
var _clickMethod = "click";
var IsBetTime = true;

var payDisConf = new Array();
payDisConf['sv'] = 4;
payDisConf['hd6'] = 9;
payDisConf['hd10'] = 7;
payDisConf['hd8'] = 9;
payDisConf['hd4'] = 7;
payDisConf['hn3'] = 15;
payDisConf['hn2'] = 30;
payDisConf['hn12'] = 30;
payDisConf['hn11'] = 15;
payDisConf['ac'] = 7;

var paysDouble2 = true;
var paysDouble12 = true;


var areaMsgConf = new Array();
areaMsgConf['cm'] = "Cannot add Come at this time";
areaMsgConf['dc'] = "Cannot add Don't Come at this time";
areaMsgConf['dp'] = "Cannot add Don't Pass at this time";
areaMsgConf['pa'] = "Cannot add Passline at this time";
areaMsgConf['opa'] = "Cannot add Passline Odds without a straight bet";
areaMsgConf['oco4'] = "Cannot add Come 4 Odds without a straight bet";
areaMsgConf['oco5'] = "Cannot add Come 5 Odds without a straight bet";
areaMsgConf['oco6'] = "Cannot add Come 6 Odds without a straight bet";
areaMsgConf['oco8'] = "Cannot add Come 8 Odds without a straight bet";
areaMsgConf['oco9'] = "Cannot add Come 9 Odds without a straight bet";
areaMsgConf['oco10'] = "Cannot add Come 10 Odds without a straight bet";
areaMsgConf['co4'] = "Cannot add Come 4 at this time";
areaMsgConf['co5'] = "Cannot add Come 5 at this time";
areaMsgConf['co6'] = "Cannot add Come 6 at this time";
areaMsgConf['co8'] = "Cannot add Come 8 at this time";
areaMsgConf['co9'] = "Cannot add Come 9 at this time";
areaMsgConf['co10'] = "Cannot add Come 10 at this time";
areaMsgConf['odo4'] = "Cannot add Don't Come 4 Odds without a straight bet";
areaMsgConf['odo5'] = "Cannot add Don't Come 5 Odds without a straight bet";
areaMsgConf['odo6'] = "Cannot add Don't Come 6 Odds without a straight bet";
areaMsgConf['odo8'] = "Cannot add Don't Come 8 Odds without a straight bet";
areaMsgConf['odo9'] = "Cannot add Don't Come 9 Odds without a straight bet";
areaMsgConf['odo10'] = "Cannot add Don't Come 10 Odds without a straight bet";
areaMsgConf['do4'] = "Cannot add Don't Come 4 at this time";
areaMsgConf['do5'] = "Cannot add Don't Come 5 at this time";
areaMsgConf['do6'] = "Cannot add Don't Come 6 at this time";
areaMsgConf['do8'] = "Cannot add Don't Come 8 at this time";
areaMsgConf['do9'] = "Cannot add Don't Come 9 at this time";
areaMsgConf['do10'] = "Cannot add Don't Come 10 at this time";
areaMsgConf['odp'] = "Cannot add Don't Pass Odds without a straight bet";

var OddsBetNames = new Array();
OddsBetNames['opa'] = 'Passline Odds';
OddsBetNames['odo4'] = "Don't Come 4 Odds";
OddsBetNames['odo5'] = "Don't Come 5 Odds";
OddsBetNames['odo6'] = "Don't Come 6 Odds";
OddsBetNames['odo8'] = "Don't Come 8 Odds";
OddsBetNames['odo9'] = "Don't Come 9 Odds";
OddsBetNames['odo10'] = "Don't Come 10 Odds";
OddsBetNames['oco4'] = "Come 4 Odds";
OddsBetNames['oco5'] = "Come 5 Odds";
OddsBetNames['oco6'] = "Come 6 Odds";
OddsBetNames['oco8'] = "Come 8 Odds";
OddsBetNames['oco9'] = "Come 9 Odds";
OddsBetNames['oco10'] = "Come 10 Odds";
OddsBetNames['odp'] = "Don't Pass Odds";

var SoundsLoaded = false;

var AreaMessageArray = new Array();
AreaMessageArray['bet_pa'] = 'Passline';
AreaMessageArray['bet_dp'] = "Don't Pass";
AreaMessageArray['bet_cm'] = 'Come';
AreaMessageArray['bet_dc'] = "Don't Come";
AreaMessageArray['bet_sv'] = 'Seven';
AreaMessageArray['bet_ac'] = 'Any Craps';
AreaMessageArray['bet_by'] = 'Buy ~1';
AreaMessageArray['bet_fd'] = 'Field';
AreaMessageArray['bet_ly'] = 'Lay ~1';
AreaMessageArray['bet_pw'] = 'Place Win ~1';
AreaMessageArray['bet_pl'] = 'Place Lose ~1';
AreaMessageArray['bet_co'] = 'Come ~1';
AreaMessageArray['bet_do'] = "Don't Come ~1";
AreaMessageArray['bet_bg'] = 'Big ~1';
AreaMessageArray['bet_hd'] = 'Hard ~1';
AreaMessageArray['bet_hn'] = 'Horn ~1';
AreaMessageArray['OddsFor'] = '~1 Odds';


