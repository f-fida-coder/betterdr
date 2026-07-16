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
var playerCardSoundInstance = null;
var bankerCardSoundInstance = null;

//Cards
var CurrentPlayerCardDrawed = 0;
var CurrentBankerCardDrawed = 0;
var PlayerCards = new Array('', '', '');
var BankerCards = new Array('', '', '');
var PlayerResults = new Array('', '');
var BankerResults = new Array('', '');

//Player Game Results
var Credits = 0;
var Result = '';
var BankerResult = '';

//Coins
var SelectedChipValue = null;
var ChipValues = new Array();

//Bets
var PlayerBet = 0;
var BankerBet = 0;
var TieBet = 0;
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


var insuranHandIndex = 0;
var insuranceActions = new Array();
var InsuranceResults = new Array();

var cardAnimationFlag = false;
