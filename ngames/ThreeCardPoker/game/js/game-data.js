var GameChips = new Array();

//background size
var BackgroundHeight = 640;
var BackgroundWidth = 855;

//Errors
var ErrorCode = null;
var IsError = false;
var ErrorDesc = null;

//Game Info
var GlobalGameSession = null;
var GameCode = '';
var MinBet = 0;
var MaxBet = 0;
var TiePercentage = 0;

//Sounds Info
var SoundsLoaded = false;

//Cards
var CurrentPlayerCardDrawed = 0;
var CurrentDealerCardDrawed = 0;


//Player Game Results
var Credits = 0;
var Result = '';
var BankerResult = '';

//Coins
var SelectedChipValue = null;
var ChipValues = new Array();

//Bets
var PlayBet = 0;
var AnteBet = 0;
var  PairPBet= 0;
var TotalBet = 0;


//Game State
var GameStatus = 'Betting'; //ShowingGame, Betting, WaitingRebet
var Winner = ''; //Tie, Player, Banker

//root level
var RootLevel = '../../';

//chipTransfer
var UseDefaultBuyIn = false; // if false then use MaxBuyIn
var IsClosing = false;

var GameBalance = null;
var AccountBalance = null;
var cbalance = null;
var sbalance = null;
var errordetails = null;
var MinBuyIn = null;
var MaxBuyIn = null;
var DefaultBuyIn = null;
var MinCashOut = null;
var MaxCashOut = null;
var Currency = null;
var AllowCashout = null;
var AllowDecimals = null;
var ShowDeposit = null;
var BonusCode = null;
var BonusAmount = null;
var BonusBalance = null;
var BonusWinnings = null;
var BonusAmountType = null;
var RolloverMultiple = null;
var Wagered = null;
var RolloverOf = null;
var RolloverRequired = null;
var BonusAmountMax = null;
var BonusState = null;
var CToke = null;

var PlaySounds = true;
var GameSounds = new Array();
