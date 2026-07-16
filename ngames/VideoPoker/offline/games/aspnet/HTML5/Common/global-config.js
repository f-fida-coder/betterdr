// game
var AccountID = null;
var GlobalGameSession = null;
var isCordovaApp = false;
var useWebService = false;
var webServiceUrl = '';
var CasinoServerURL = '';
var TimeHeartBeatCall = 30000;
var waitResponseTime = 60000;
var DinamycHistoryURL = "../../../classic/DHist/DynamicHistory.aspx"

//is chiptranfer client
var IsChiptranfer = false;
var minCreditsCashier = 0;
var CashierType = 0; // 0 = no cashier; 1 = normal; 2 = silent cashier 

//Rebates Enable
var RebatesEnable = false;

//Custom Error Messages
var CustomErrorMessages = false;

//sounds
var PlaySounds = true;

//Block game on portrait
var BlockPortrait = true;

//If the Games are in the App
var isCordovaApp = false;

//make a redirect to LobbyRedirectUrl when click in lobby button
var UseLobbyRedirect = false;
var LobbyRedirectUrl = "";
var ShowBtnLobby = true;
var noexit = false;

//is opb client
var OC = false;
var O1 = ""; //WS
var O2 = ""; //WM
var O3 = ""; //WP
var P1 = ""; //CV

//
var sbalance = null;
var cbalance = null;
var errorcode = null;
var errordetails = null;
var MaxBuyIn = null;
var MinBuyIn = null;
var fMaxBuyIn = null;
var fMinBuyIn = null;
var MaxCashOut = null;
var DefaultBuyIn = null;
var MinCashOut = null;
var AllowCashout = null;
var AllowDecimals = null;
var ShowDeposit = null;
var CurrencyAcron = null;
var brplog = null;

//show hour at the bottom of the slot
var ShowHour = false;

//casino server 
var CasinoServerURL = null; // null = same location, the HTML5 is inside the casino server

//style theme
var Theme = null; //null for default theme

var basepath =  "_rootLEVEL_HTML5/Common/img/themes/" + Theme + "/";

var GameLoading = 1; // 1 = preload and then play with sounds question; 2 = Start button and then load assets.

//theme images array
var ThemeImages =  "";

var RootLevel = '';
var SpinTimeAnimation = 2000;
var SpinTimeComplete = false;

var currency = ''; //Ex. currency=USD,$,¢,p,5,2
var currencyObj = {}; //properties: letterCode, prefix, suffix, decimalSeparator, thousandSeparator, precision

var HelpBaseURL = '';

var LinesAnimation = 2; //1 = group lines; 2 = no grouping

var ShowCurrencySymbol = true; 

var twksArray = {};// Example {'shareboxes': 'false', autoplayvalues:10,20,30,100}

var BonusRoundTimeOut = 10; // in seconds

//show hour at the bottom of the slot
var ShowHour = false;

//--The options that should be hidden for the menu--//
//--The standart sintax is id-menu-namehere--//
//Some of the actual options are
//id-menu-payouts
//id-menu-history
//id-menu-sounds
//id-menu-help
//id-menu-rebates
//id-menu-cashier
var Menu_options_hide = [];

$(document).ready(function(){
    
    if(!ShowBtnLobby){
        $("#btn-lobby").hide();
        $("#btn-lobby").css('top','-10000px');
    }else{
        var varArr =  getUrlVars();

        var noexit = varArr["NOEXIT"];
        if(typeof(noexit) != "undefined" && noexit != null && noexit == "1"){
            $("#btn-lobby").hide();
            $("#btn-lobby").css('top','-10000px');
        }else{
            $("#btn-lobby").show();
        }
    }

});