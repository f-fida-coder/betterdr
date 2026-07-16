//../Slots/src/SL5RTest/index.html

Global.Connector.rootLevel = "../../../aspNet/";
var payoutURL = "help.html";
var fastPlay = false;
var timeToAutoPopupCashier = 1000;

var BetArray = new Array();
var BetArrayLast = new Array();

var totalWON = 0;


var BackgroundHeight = 640,
    BackgroundWidth = 855,
    SoundsLoaded = !1,
    gameCardSoundInstance = null,
    ShowCashier = !1,
    ShowHistory = !1,
    ShowType = !1,
    //Global.Connector.gameSession = null,
    GameChips = new Array,
    SelectedChipValue = 0,
    MaxButtons = 5,
    GameStatus = 0,
    ActiveHandId = null,
    LastActiveHandId = 0,
    IsCallingServer = !1,
    IsAnimatingPlayerCards = !1,
    IsAnimatingDealerCards = !1,
    IsAnimatingInsurance = !1,
    CustomerMainBet = 0,
    CustomerSplitLBet = 0,
    CustomerSplitRBet = 0,
    CustomerLastBet = new Array(),
    Splits = 0,
    ErrorCode = null,
    iserr = null,
    MaxH = null,
    MaxS = null,
    MinB = null,
    MaxB = null,
    bal = null,
    isrec = null,
    dc1 = null,
    dc2 = null,
    dex = null,
    dtot = null,
    hnds = null,
    upds = null,
    HandPosition = new Array(3),
    HandsDataArray = new Array,
    UpdateDataArray = new Array,
    PartialHandDataArray = new Array,
    bjp = null,
    insp = null,
    hs17=null,
    charlie = null,
    resh = null,
    isovr = null,
    pins = null,
    nhid = null,
    isInsurance = !1,
    isDouble = !1,
    ACTION_CLEAR = "CLEAR",
    ACTION_DEAL = "DEAL",
    ACTION_LOBBY = "LOBBY",
    ACTION_REBET = "REBET",
    ACTION_REBET_X2 = "REBETX2",
    ACTION_HIT = "HIT",
    ACTION_STAND = "STAND",
    ACTION_DOUBLE = "DOUBLE",
    ACTION_SPLIT = "SPLIT",
    ACTION_SWITCH = "SWITCH",
    ACTION_LATE_SURRENDER = "LATE_SURRENDER",
    ACTION_EVENMONEY = "EVENMONEY",
    ACTION_INSURANCE = "INSURANCE",
    ACTION_STARTLATE = "STARTLATE",
    EARLY_INSURANCE = 1,
    EARLY_EVENMONEY = 2,
    EARLY_SURRENDER = 4,
    EARLY_STARTLATE = 8,
    LATE_HIT = 16,
    LATE_STAND = 32,
    LATE_SPLIT = 64,
    LATE_DOUBLE = 128,
    LATE_SURRENDER = 256,
    LATE_SWITCH = 512,
    NEW_GAME = 0,
    RECOVERY_GAME = 1,
    PLAYING_GAME = 2,
    END_GAME = 3,
    DEALER_GAME = 4,
    RootLevel = "../../",
    PortraitButtonsShow = {
        Left: !0
    },
    LastButtonsArray = null;

var autoShowCashierInterval = null;

function updateGameAfterCashierBuyIn(){
    Global.Connector.bal = Global.ChipTransfer.gameBalance;

    var tempBal = Global.Connector.bal;

    if(PlayerBet != null || PlayerBet > 0){
        tempBal -= PlayerBet;
    }

    UpdateVisualBalance(tempBal);
    processAutoPopupCashier();
}

function updateGameAfterHeartbeat(){
    var tempBal = Global.Connector.bal;

    if(PlayerBet != null || PlayerBet > 0){
        tempBal -= PlayerBet;
    }

    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  

        UpdateVisualBalance(tempBal);          
    }else if(isTimeToShowInfoMsg() ){
        UpdateVisualBalance(tempBal);   
    }
    processAutoPopupCashier();
}

function manageMenuIcons(){
    if(Global.Connector.showCashier == false){
        $("#cashierButton").hide();
    }

    if(Global.Connector.showHistory == false){
        $("#historyButton").hide();
    }
}

function LoadLanguage(){
    LanguagesManager.loadTranslations(afterCallInit);
}


String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};


function readVarfromEnterURL(){
    var varArr =  getUrlVars();
    Global.Connector.errorCode = varArr["ERRCODE"];
    Global.Connector.gameSession = varArr["GAMESESSION"];
    Global.Connector.lang = varArr["LANG"];
    Global.Connector.gameCode = varArr["GAMECODE"];
    var temp = varArr["SHOWCASHIER"];
    if(typeof(temp) == "undefined" || temp == null || temp == "" || (parseInt(temp) != 1)){
        Global.Connector.showCashier = false;  
    }else
        Global.Connector.showCashier = true;
    Global.Connector.showHistory = varArr["SHOWHISTORY"];
    Global.Connector.showType = varArr["SHOWTYPE"];
    Global.Connector.showChips = varArr["SHOWCHIPS"];
    Global.Connector.currency = varArr["CURRENCY"];
    Global.Game.helpPage = varArr["HELPFILE"];
    Global.Connector.accountId = varArr["ACCOUNTID"];


}

function loadGame(){
    readVarfromEnterURL();

    RecoverAction.GameSession = Global.Connector.gameSession;
    RecoverAction.LastGameId = 0;

    //InitAction.doInitAction(afterCallInit);
    RecoverAction.DoRecoverAction(); //descomentar cuando ya este pegado al server

}
function afterCallInit(){
    storeCurrencyData();
    if(typeof(Global.Connector.gameSession) =="undefined"){
        showErrorMessage("ERROR INCORRECT ENTER DATA");
        return;
    }
    LanguagesManager.afterLoadTranslations();
    manageMenuIcons();
    menuListeners();
    loadChips();

    if(!isMobile.any())
        addDesktopBtnListeners();
    
    GameStatus = 'ShowingGame';

    /*CASHIER*/
    var configCash = {
        type : 0, // 0 hand, 1 dealer hand, 2 player hand, 3 rollerino, 4 spin
        automata : false,
        autoStart : false,
        extraStart : true
    }
    //descomentar cuando ya este pegado al server
    cashierManager.cashierCreator("#global", "../../html5Games/common/img/chipTransfer/", updateGameAfterCashierBuyIn, configCash);
    HeartbeatManager.initHeartbeat(Global.Connector.gameSession, updateGameAfterHeartbeat);
    processAutoPopupCashier();

                //openNewGame(true);
     if (parseInt(isrec) == 1 && hnds != null && parseInt(hnds) > 0) {
        openRecoveryGame();
        
    }
    else {
        //start new game
        openNewGame(true);
    }

    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
    }

    $("#val-minbet").html(formatWithThousandsNoDecimalZeros(Global.Connector.minb));
    $("#val-maxbet").html(formatWithThousandsNoDecimalZeros(Global.Connector.maxb));

    var payIns = ((typeof(insp) == "undefined" || insp == null || insp == "")?0:parseFloat(insp));
    var payBJK = ((typeof(bjp) == "undefined" || bjp == null || bjp == "")?0:parseFloat(bjp));
    var mulIns = getMultiplier(payIns);
    var mulBJK = getMultiplier(payBJK);


    var valInsP = payIns * mulIns;
    var valBJKP = payBJK * mulBJK;

    

    if(payIns > 0){
        $("#ins-int-1").html(valInsP);
        $("#ins-int-2").html((1*mulIns));    
        $("#ins-int-1").show();
        $("#ins-int-2").show();
        $("#ins-pays").show();        
    }

    if(payBJK > 0){
        $("#bjk-int-1").html(valBJKP);
        $("#bjk-int-2").html((1*mulBJK));

        $("#bjk-int-1").show();  
        $("#bjk-int-2").show();  
        $("#bjk-pays").show();  
    }
    
    var hs17Val = ((typeof(hs17) == "undefined" || hs17 == null || hs17 == "")?0:parseFloat(hs17));
    if(hs17Val == 1){
        $("#dealer_stand_hard").show();  
        $("#dealer_stand").hide();  
    }else {
        $("#dealer_stand").show();  
        $("#dealer_stand_hard").hide();  
    }
}

function loadChips(){
    var chipsArray = Global.Connector.showChips.split(',');
    Global.BJK.ChipValues = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.BJK.ChipValues.push(chipsArray[i]);
        }
    }

    if (Global.BJK.ChipValues.length > 0) {
        Global.BJK.SelectedChipValue = 0;

        var strHtml = '';
        
        for(var i=0; i < Global.BJK.ChipValues.length; i++){
            var chipTempValue = Global.BJK.ChipValues[i];
            var chipTempImage = null;
            if(i >= ChipsColors.length){
                chipTempImage = ChipsColors[0];
            }else{
                chipTempImage = ChipsColors[i];
            }

            GameChips[i] = [chipTempValue, chipTempValue, chipTempImage +'-Table.png'];

            var idEle = (i+1);
            strHtml += '<li><img id="chip-bet-'+idEle+'" src="images/chips/'+chipTempImage+'.png"></image><span id="chip-bet-value-'+idEle+'" class="chip-bet-value-label">'+chipTempValue+'</span></li>'
        }

        $("#chips-btns-container").html(strHtml);

        betChipsListeners();
        //btnsListeners();
        UpdateSelectedChip();
        //UpdateTiePays();
        UpdateVisualBalance(Global.Connector.bal);
    }

}


$( document ).ready(function() {
    $( window ).on('resize', function(){

        resizeContainer();
    });

    resizeContainer();
    Global.GameUrls.casinoWrapperURL = "";
    StartLoad();
    
    if(isMobile.any()){
        $("#btn-deal").addClass("btn-deal-mobile");
        $("#btn-clear").addClass("btn-clear-mobile");
        $("#btn-rebet").addClass("btn-rebet-mobile");

        $("#error-message").addClass("message-box-mobile");
        $("#info-message").addClass("message-box-mobile");
        $("#nav-bar").addClass("nav-bar-mobile");
        $("#betContainer").addClass("betContainer-mobile");

        $("#chips-lbls-container").addClass("chips-lbls-container-mobile");
        $("#game-fields-container").addClass("game-fields-container-mobile");

        $(".dkCashier-box").addClass("dkCashier-box-mobile");
        $("#min-max").addClass("min-max-mobile");
    }else{
        $("#buttons-panel-left").hide();
        $("#buttons-panel-right").hide();
        
        /*$(".btn-left").addClass("panel-left-button-Desktop");
        $(".btn-right").addClass("panel-right-button-Desktop");
        $("#buttons-panel-left").addClass("btn-panel-cont-Desktop");
        $("#buttons-panel-right").addClass("btn-panel-cont-Desktop");
        
        $(".buttons-panel-right").addClass("buttons-panel-right-Desktop");
        $(".buttons-panel-left").addClass("buttons-panel-left-Desktop");*/
    }
});

function afterPreload(){
    $("#PageContainerInner").show();
    resizeContainer();
    betAreaListeners();

    loadGame();

    if (isMobile.any()==false){
        SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
        SoundManager.LoadSoundsInit("");
    }

} 


function resizeContainer() {

    if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
        var viewportmeta = document.querySelector('meta[name="viewport"]');
        if (viewportmeta) {
            viewportmeta.content = 'minimum-scale=0.5, maximum-scale=0.5, initial-scale=0.5';
            document.body.addEventListener('gesturestart', function () {
                viewportmeta.content = 'minimum-scale=0.5, maximum-scale=0.5';
            }, false);
        }
    }

    $('#PageContainer').css({ 'position': 'relative' });
    $('#global').hide();

    var FULL_WIDTH ;
    var FULL_HEIGHT;
    var CONTENT_WIDTH;
    var _h = $(window).height();
    var _w = $(window).width();


    var DevicePosition = "";

    if (_h <= _w) {
        DevicePosition = 'L';
    }else{
        DevicePosition = 'P';
    }

    FULL_WIDTH          = 2093;
    FULL_HEIGHT         = 1060;
    CONTENT_WIDTH       = 1900;

    $('.overlay').css({height: "100%" });
    $('#global').css({height: (FULL_HEIGHT + "px") });
    $('#global').css({width: ( FULL_WIDTH + "px") });
    $('#global').css({'overflow': 'visible' });
    $('#global').show();

    var scaleX  = window.innerWidth / CONTENT_WIDTH;
    var scaleY  = window.innerHeight / FULL_HEIGHT;
    var scale   = scaleX < scaleY ? scaleX : scaleY;

    $("#global")
    .css("transform-origin", "0px 0px")
    .css("-ms-transform-origin", "0px 0px")
    .css("-webkit-transform-origin", "0px 0px")
    .css("transform", "scale(" + scale + "," + scale + ")")
    .css("-webkit-transform", "scale(" + scale + "," + scale + ")")
    .css("-ms-transform", "scale(" + scale + "," + scale + ")")
    .css("left", Math.floor((window.innerWidth  - FULL_WIDTH  * scale) / 2 + window.pageXOffset)  + "px")
    .css("top",  Math.floor((window.innerHeight - FULL_HEIGHT * scale) / 2 + window.pageYOffset)  + "px");


    $('#buttonsContainer').css( 'width',  FULL_WIDTH +'px' )
    do {
        $('#buttonsContainer').css( 'width',  '-=20' )
    }
    while ( $('#buttonsContainer').offset().left < 0 )

   
}


function processPayoutTable(){

    //Could be the help page
}

function openHistoryClick(show){

    var HistoryDataAction = {
    
        Url: '../../DHist/DynamicHistory.aspx',
        //out parameters
        GameSession: null,
        DoHistoryDataAction: function () {
        var parameters = "GameSession=" + Global.Connector.gameSession + "&rand=" + Math.floor((Math.random() * 100000) + 1);
            
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4 && this.status == 200) {
                    document.getElementById("history-content").innerHTML = this.responseText;
                    if(isMobile.any()){
                        $(".DH_TableTd table").addClass("history-text-mobile");
                        $(".DH_Table").addClass("history-text-mobile");
                    }
                }
            };
            xhttp.open("GET", this.Url+"?"+parameters, true);
            xhttp.send();
        }
    }
    HistoryDataAction.DoHistoryDataAction();

    if(show){
        document.getElementById("history-content").innerHTML = '<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>';
        $("#historyContainer").show();
    }       
    else{
        $("#historyContainer").hide();
        document.getElementById("history-content").innerHTML = '';
    }
}


//////////Messages
function showErrorMessage(key){

    if(typeof(key) =="undefined" || key == null || key == ""){
        key = "ERR_UNKNOWN";
    }

    var errorTranslation = LanguagesManager.getTranslationByKey(key);
    if (errorTranslation == '') {
        errorTranslation = decodeURIComponent(key);        
    }

    $("#message-text-span").text(errorTranslation);
    $("#error-message").show();
}

function showInfoMessage(key){

    if(typeof(key) =="undefined" || key == null || key == ""){
        key = "ERR_UNKNOWN";
    }

    var messageText =  LanguagesManager.getTranslationByKey(key);
    if (messageText == '') {
        messageText = decodeURIComponent(key);
        
    }

    $("#info-message-text").text(messageText);
    $("#info-message").show();
}

function hideInfoMessage(){
    $("#info-message-text").text("");
    $("#info-message").hide();

}


function startGetInfoMessage(){
    if(typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != ""){
        ServerManager.doMessageAction(finishGetInfoMessage);
    }
}

function finishGetInfoMessage(){
    showInfoMessage(Global.Connector.msgContent);   
}

function isTimeToShowInfoMsg(){
    var isTime = false;

    if(PlayerBet == null || PlayerBet <= 0){
        isTime = true;
    }
    /*if(isLoading == false && (isInFreeSpins
     || Global.Connector.frees != "0")){
        isTime = false;
    }*/

    return isTime;
}

function doChiptransferBuyInCall(transferAmount, callback){
    try {
        Global.Connector.rand = (Math.random() * 1000000);
        Global.ChipTransfer.toCasino = transferAmount;
        ServerManager.doChiptransferBuyInAction(checkBuyInResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferBuyInCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/**
 * @description Set the parameters and start CashOut server call
 * @function doChiptransferCashoutCall
 * @param {number} transferAmount is the amount game return to user account
 * @param {function} callback function to be called when chiptransfer cashout is complete
 */
function doChiptransferCashoutCall(transferAmount, callback){
    try {
        Global.Connector.rand = (Math.random() * 1000000);
        Global.ChipTransfer.toAccount = transferAmount;
        ServerManager.doChiptransferCashOutAction(checkCashoutResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferCashoutCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

function doChiptransferInitCall(callback){
    try{
        Global.Connector.rand = (Math.random() * 1000000);
        ServerManager.doChiptransferInitAction(checkChiptransferInitResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferInitCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


function checkChiptransferInitResponse(callback){
    try {
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            if (typeof (Global.ChipTransfer.cbalance) != 'undefined' && Global.ChipTransfer.cbalance != null) {
                Global.ChipTransfer.cbalance = parseFloat(Global.ChipTransfer.cbalance);
            }
            if (typeof (Global.ChipTransfer.sbalance) != 'undefined' && Global.ChipTransfer.sbalance != null) {
                Global.ChipTransfer.sbalance = parseFloat(Global.ChipTransfer.sbalance);
            }
            if (typeof (Global.ChipTransfer.maxBuyIn) != 'undefined' && Global.ChipTransfer.maxBuyIn != null) {
                Global.ChipTransfer.MaxBuyIn = parseFloat(Global.ChipTransfer.MaxBuyIn);
            }
            if (typeof (Global.ChipTransfer.defaultBuyIn) != 'undefined' && Global.ChipTransfer.defaultBuyIn != null) {
                Global.ChipTransfer.defaultBuyIn = parseFloat(Global.ChipTransfer.defaultBuyIn);
            }
            if(callback != null){
                callback();  
            }
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
        txt = "There was an error on checkChiptransferInitResponse.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


function  checkCashoutResponse(callback){
    try{
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            callback();
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
                txt = "There was an error on checkCashoutResponse.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                alert(txt);
        }    
}


function checkBuyInResponse(callback){
    try{
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            callback();//update balance, enable spin buttpn, etc;
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
                txt = "There was an error on checkBuyInResponse.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                alert(txt);
        }
}

function processLowCredits(){

    SoundManager.StopAudio("low-credits", GameSounds["low-credits"]);
    GameSounds["low-credits"] = SoundManager.PlayAudio("low-credits", false);  


    $("#credits-val").addClass("blink-text");
    setTimeout(function(){
        $("#credits-val").removeClass("blink-text");
        try{
            SoundManager.StopAudio("low-credits", GameSounds["low-credits"]);
        }catch(er){}
    },1000);


    var visibleCashier = false;
    var visibleError = false;
    var isTournament = false;


    if($("#error-message").is(":visible")){
        visibleError = true;
    }

    if($(".dkCashier-box").is(":visible")){
        visibleCashier = true;
    }
    if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
        isTournament = true;
    }
    

    if((Global.Connector.bal <= 0 || (isTournament && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0")) && Global.Connector.showCashier ==1 && !visibleError && !visibleCashier && PlayerBet <= 0){
    //if((Global.Connector.bal == null || Global.Connector.bal <= 0 || Global.Connector.bal < Global.Connector.minb) && Global.Connector.showCashier ==1)
    //{
        /*if(isMobile.any()){
            $(".dkCashier-box").addClass("dkCashier-box-mobile");
        }*/


        var displayCashierTimer = setTimeout(function(){
            clearTimeout(displayCashierTimer);
            displayCashierTimer = null;
            cashierManager.openCashier();
        },1000);
        
    }
}

function processAutoPopupCashier(){
    var hassFreeSpins = false;
    var visibleCashier = false;
    var visibleError = false;
    var isTournament = false;


    if($("#error-message").is(":visible")){
        visibleError = true;
    }

    if($(".dkCashier-box").is(":visible")){
        visibleCashier = true;
    }
    if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
        isTournament = true;
    }
    
    if((Global.Connector.bal <= 0 || (isTournament && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0")) && Global.Connector.showCashier ==1 && !visibleError && !visibleCashier && PlayerBet <= 0){    
        autoShowCashierInterval = setTimeout(function(){
            clearTimeout(autoShowCashierInterval);
            autoShowCashierInterval = null;
            cashierManager.openCashier();
        },timeToAutoPopupCashier);
    }else{
        clearTimeout(autoShowCashierInterval);
        autoShowCashierInterval = null;
    }
}

function betAreaListeners(){

    if(!isMobile.any()){
        $( "#click-area-player" ).mouseenter(function() {
            if(BetArray["bet"]== null || BetArray["bet"] <= 0)
                $("#highligt-area-player").show();
            else 
                $("#highligt-area-player").hide();
        });

        $( "#click-area-player-left" ).mouseenter(function() {
            if(BetArray["bet-atm3"]== null || BetArray["bet-atm3"]<= 0)
                $("#highligt-area-player-left").show();
            else 
                $("#highligt-area-player-left").hide();
        });

        $( "#click-area-player-right" ).mouseenter(function() {
            if(BetArray["bet-atm1"]== null || BetArray["bet-atm1"]<= 0)
                $("#highligt-area-player-right").show();
            else 
                $("#highligt-area-player-right").hide();
        });

        $( "#click-area-player").mouseleave(function() {
            $("#highligt-area-player").hide();
        });    

        $( "#click-area-player-left").mouseleave(function() {
            $("#highligt-area-player-left").hide();
        });

        $( "#click-area-player-right").mouseleave(function() {
            $("#highligt-area-player-right").hide();
        });

    }
    $( "#click-area-player" ).click(function() {

        putChipInBetClick("");
    });

    $( "#click-area-player-right" ).click(function() {

        putChipInBetClick("-atm1");
    });

    $( "#click-area-player-left" ).click(function() {

        putChipInBetClick("-atm3");
    });

}

function UpdateVisualBalance(Balance){

    if(typeof(Balance) == "undefined" || Balance == null || Balance.length == 0){
        $("#credits-val").text("--");
    }else{
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Balance));
    }


    var visibleCashier = false;
    var visibleError = false;
    var isTournament = false;


    if($("#error-message").is(":visible")){
        visibleError = true;
    }

    if($(".dkCashier-box").is(":visible")){
        visibleCashier = true;
    }
    if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
        isTournament = true;
    }
    

    //Validate if Must Open the Cashier
    if((Global.Connector.bal <= 0 || (isTournament && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0")) && Global.Connector.showCashier ==1 && !visibleError && !visibleCashier && PlayerBet <= 0){
    //if((Global.Connector.bal == null || Global.Connector.bal <= 0 || Global.Connector.bal < Global.Connector.minb) && Global.Connector.showCashier ==1 && (PlayerBet == null || PlayerBet <= 0) )
    //{
       /* if(isMobile.any()){
            $(".dkCashier-box").addClass("dkCashier-box-mobile");
        }*/
        var displayCashierTimer = setTimeout(function(){
            clearTimeout(displayCashierTimer);
            displayCashierTimer = null;
            cashierManager.openCashier();
        },1000);
        
    }
}

function UpdateVisualTotalBet(){

    TotalBet =  PlayerBet;
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");

    }else{

        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - TotalBet;

    }
}

function UpdateSelectedChip(){
    if(Global.BJK.SelectedChipValue ==0){
        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BJK.SelectedChipValue == 1){
        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BJK.SelectedChipValue == 2){
        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BJK.SelectedChipValue == 3){
        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BJK.SelectedChipValue == 4){
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
    }
}

function betChipsListeners(){

    $( "#chip-bet-1,#chip-bet-value-1" ).click(function() {

        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BJK.SelectedChipValue = 0;
        btnClickSound();
    });

    $( "#chip-bet-2,#chip-bet-value-2" ).click(function() {

        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BJK.SelectedChipValue = 1;
        btnClickSound();
    });


    $( "#chip-bet-3,#chip-bet-value-3" ).click(function() {

        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BJK.SelectedChipValue = 2;
        btnClickSound();
    });

    $( "#chip-bet-4,#chip-bet-value-4" ).click(function() {

        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BJK.SelectedChipValue = 3;
        btnClickSound();

    });

    $( "#chip-bet-5,#chip-bet-value-5" ).click(function() {
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        Global.BJK.SelectedChipValue = 4;
        btnClickSound();
    });
}

function menuListeners(){

    $('#soundOffButton').click(function() { toggle_sound(); });
    $('#fastPlayButton').click(function() { toggle_fastPlay(); });

    $('#historyButton').click(function() { openHistoryClick(true); });
    $('#helpButton').click(function() { openHelpClick(true); });


    //$('#close-history').click(function() { openHistoryClick(false); });

    $('#history-content').click(function() { openHistoryClick(false); });
    $('#history-overlay').click(function() { openHistoryClick(false); });
    $('#back-to-game-history-label').click(function() { openHistoryClick(false); });


    /*$('#close-click-payout').click(function() { openHelpClick(false); });
    $('#help-overlay').click(function() { openHelpClick(false); });*/
    
    $('#cashierButton').click(function() { 
        /*if(isMobile.any()){
            $(".dkCashier-box").addClass("dkCashier-box-mobile");
        }*/
        cashierManager.openCashier();
    });
    $('#closeButton').click(function() { lobbyButtonClick(); });        
    $('#message-ok-btn').click(function() { hideInfoMessage(); });
}

function openHelpClick(show){
    var win = window.open(payoutURL, '_blank');
    win.focus();
}

function toggle_sound() {
    if(!soundsLoadedFlag)
        return;
    if ($('#soundOffButton').hasClass("off")) {
        SoundManager.SetAllVolume(0.9);
    } else {
        SoundManager.SetAllVolume(0);
    }
    $('#soundOffButton').toggleClass("off");
}

function toggle_fastPlay(){
    if ($('#fastPlayButton').hasClass("on")) {
        fastPlay =false;
    } else {
        fastPlay =true;
    }
    $('#fastPlayButton').toggleClass("on");
}

function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.display === 'none')
}


function btnClickSound() {
    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false); 
}


function calculateChips(amount) {
    var returnArray = new Array();
    var tempAmount = amount;

    for (var i = GameChips.length - 1; i >= 0; i--) {

        if (tempAmount == 0) {
            break;
        }

        var tempChipInfo = GameChips[i];

        var tempNum = tempAmount / tempChipInfo[0];
        var NumChips = Math.floor(tempNum);

        if (NumChips > 0) {
            returnArray[returnArray.length] = [NumChips, tempChipInfo[0], tempChipInfo[1], tempChipInfo[2]];
            tempAmount = (tempAmount - (NumChips * tempChipInfo[0]));
        }

    }
    if (tempAmount > 0) {
        returnArray[returnArray.length] = [1, GameChips[0][0], GameChips[0][1], GameChips[0][2]];
    }

    return returnArray;

}

function setVisualBetChips(amount,pos, atm) {
    var tempAmount = amount;
    if (amount < 0) {
     
        amount = amount * -1;
    }

    var areaNAme = "";
    if (pos == 0) { //center
        //$("#chips-bet").append(newChip);
        areaNAme = "#chips-bet" + atm;
    } else if (pos == 1) { //split right
        //$("#chips-bet-right").append(newChip);
        areaNAme = "#chips-bet-right"+ atm;
    } else if (pos == 2) { // split left
        areaNAme = "#chips-bet-left"+ atm;
        //$("#chips-bet-left").append(newChip);
    } else if (pos == 3) {
        areaNAme = "#chips-insurance"+ atm;
        //$("#chips-insurance").append(newChip);
    } 

    if(amount ==0){
        $(areaNAme).remove();
        return;
    }

    tempAmount = formatWithNoDecimalZerosNumber(amount);

    var chipsDistri = calculateChips(tempAmount);
    if (chipsDistri == null || chipsDistri.length <= 0) {
        if (tempAmount > 0) {
            return false;
        }
    }

    var hmtlCodeGen = "";
    var chipSet = "";
    var existDiv = false;

    var chipSpace = 9;            

    $(areaNAme).html("");

    //hmtlCodeGen += '<ol reversed="reversed" class="bet-chip-'+pos+' chips-in-table" id="bet-chip-'+pos+'"></ol>';
    
    //$("#game-container").append(hmtlCodeGen);

    var topPercent = 0;
    //cleanBetChips(pos);

    for (var i = 0; i < chipsDistri.length; i++) {
        var tempArray = chipsDistri[i];
        var numChips = tempArray[0];
        for (var j = 1; j <= numChips; j++) {
            var newChip = $('<li><span></span></li>');
            newChip.css('top', topPercent + 'px');
            newChip.css('left', (Math.floor((Math.random() * 10))) + 'px');
            newChip.css('background', 'url(images/chips/' + tempArray[3]+') no-repeat top left');
            newChip.css('background-size', '100% 100%');
            newChip.css('-moz-background-size', '100% 100%');

            //Draw the bet amount
            $(areaNAme).append(newChip);
            $(areaNAme + " li:last-child span").html(tempAmount);
            /*if (pos == 0) { //center
                $("#chips-bet"+ atm).append(newChip);
                $("#chips-bet"+ atm + " li:last-child span").html(tempAmount);
            } else if (pos == 1) { //split right
                $("#chips-bet-right"+ atm).append(newChip);
                $("#chips-bet-right"+ atm + " li:last-child span").html(tempAmount);
            } else if (pos == 2) { // split left
                $("#chips-bet-left"+ atm).append(newChip);
                $("#chips-bet-left"+ atm + " li:last-child span").html(tempAmount);
            } else if (pos == 3) {
                $("#chips-insurance"+ atm).append(newChip);
                $("#chips-insurance"+ atm + " li:last-child span").html(tempAmount);
            }*/

            topPercent -= chipSpace;
        }
    }
    return true;
    
}


function prepareGameGraphics() {
    try {
        //translateControls();

        //loadChips();

        LoadLanguage();

        UpdateVisualBalance(Global.Connector.bal); 
    }
    catch (err) {
        txt = "There was an error on this function PrepareGameGraphics.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function openNewGame(loadingGame) {
    //try {
        Splits = 0;
        GameStatus = NEW_GAME;

        var buttonsArray = new Array(5);
        if (ActiveHandId == null && PlayerBet == 0 && HandsDataArray.length == 0) {

            showHidePlaceBetText(true);

            if(isMobile.any()){
                drawButtons(buttonsArray);
            }
            else{
                drawButtonsDesktop(buttonsArray);
            }

        } else {

            buttonsArray[1] = ["CLEAR", ACTION_CLEAR];

            var custoLastTotalBet = getGetLastTotalBet();
            
            if (custoLastTotalBet != null && custoLastTotalBet > 0) {
                buttonsArray[2] = ["REBET", ACTION_REBET];
                buttonsArray[3] = ["REBET X2", ACTION_REBET_X2];
            }
            setTimeout(function(){
                if(isMobile.any()){
                    drawButtons(buttonsArray);
                }
                else{
                    drawButtonsDesktop(buttonsArray);
                }   
            },(fastPlay?10:1500));
            

        }
        isovr = null;
}


/*
* Name:PutChipInBetClick
* Is call when the player puts a chip in the bet side
*/
function putChipInBetClick(atm) {

 if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting' || GameStatus == NEW_GAME) {

        if(GameStatus == NEW_GAME ){
            //clearAction();
            clearButtonClick(null);
            ResetChipsResult();
            
        }

        SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
        SoundManager.LoadSoundsInit("");

        
        var chipValue = parseFloat(Global.BJK.ChipValues[Global.BJK.SelectedChipValue]);

        if(validateTotalBet(chipValue))
        {
            if (CustomerMainBet == 0) {
                var buttonsArray = new Array(5);
                //buttonsArray[0] = ["LOBBY", ACTION_LOBBY];
                buttonsArray[1] = ["CLEAR", ACTION_CLEAR];
                buttonsArray[2] = ["DEAL", ACTION_DEAL];
                if(isMobile.any()){
                    drawButtons(buttonsArray);
                }
                else{
                    drawButtonsDesktop(buttonsArray);
                }
            }
            if (isTimeForBet && (PlayerBet != null && PlayerBet > 0) && ((HandsDataArray[0] != null && HandsDataArray[0] != undefined) || (HandsDataArray[1] != null && HandsDataArray[1] != undefined) || (HandsDataArray[2] != null && HandsDataArray[2] != undefined))) {
                return;
            }

            if(BetArray["bet"+atm] ==null){
                BetArray["bet"+atm] = chipValue;
            }
            else{
                BetArray["bet"+atm] = BetArray["bet"+atm] + chipValue;
            }

            PlayerBet += chipValue;
            //CustomerMainBet += chipValue;
            Global.Connector.bal -= chipValue;

            //$("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
            UpdateVisualBalance(Global.Connector.bal)
            UpdateVisualTotalBet();

            setVisualBetChips(BetArray["bet"+atm],0, atm);
            var textT = "";
            if(atm == "-atm1"){
               textT = "-right"; 
            }else if(atm == "-atm3"){
                textT = "-left";
            }
            $("#place-bet-text"+textT).hide();

            GameStatus = 'Betting';
        }
    }   
}

/*
* Name:isTimeForBet
* return: true= the game is in time for bet, false= the game state is out of bet
*/
function isTimeForBet() {
    try {
        var retValue = false;

        if (GameStatus == NEW_GAME) {
            retValue = true;
        }
        return retValue;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }

}

/*
* Name:isTimeForClear
* return: true= the game is in time for clear the bet amount, false= the game state is out of bet
*/
function isTimeForClear() {
    try {
        var retValue = false;

        if (GameStatus == NEW_GAME || GameStatus == "Betting") {
            retValue = true;
        }
        return retValue;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }

}


/*
* Name:isTimeForDeal
* return: true= the game is in time deal
*/
function isTimeForDeal() {
    try {
        var retValue = false;

        if (GameStatus == "Betting" && PlayerBet > 0) {
            retValue = true;
        }

        return retValue;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }

}

/*
*   Name: DrawButtonsByOptions
*   Param: options = int 
*/
function drawButtonsByOptions(options, pod) {


        var buttonArray = new Array(6);


        if ((options & EARLY_INSURANCE) > 0) {
            buttonArray[1] = ["INSURANCE", ACTION_INSURANCE];
        }
        if ((options & EARLY_STARTLATE) > 0) {
            buttonArray[3] = ["PLAY", ACTION_STARTLATE];
        }
        if ((options & LATE_HIT) > 0) {
            buttonArray[2] = ["HIT", ACTION_HIT];
        }
        if ((options & LATE_STAND) > 0) {
            buttonArray[1] = ["STAND", ACTION_STAND];
        }
        if ((options & LATE_SPLIT) > 0 && (typeof(pod)=="undefined" || pod == null || pod != 2)) {
            buttonArray[4] = ["SPLIT", ACTION_SPLIT];
        }
        if ((options & LATE_DOUBLE) > 0) {
            buttonArray[3] = ["DOUBLE", ACTION_DOUBLE];
        }
        if ((options & LATE_SURRENDER) > 0) {
            buttonArray[5] = ["SURRENDER", ACTION_LATE_SURRENDER];
        }

        if(isMobile.any()){
            drawButtons(buttonArray);
        }
        else{
            drawButtonsDesktop(buttonArray);
        }

}

function drawButtonsDesktop(buttonsArray) {
    LastButtonsArray = buttonsArray;

    $(".btn-li").hide();
    if(buttonsArray.length == 0){
        enableDisableButtons(false);
        return;
    }
    var totalBtns = 0;
    enableDisableButtons(true);
    for (var i = 0; i <= MaxButtons; i++) {
        var tempBtnInfo = buttonsArray[i];
        
        if (tempBtnInfo != undefined && tempBtnInfo != null && tempBtnInfo[1] != "") {

            if (tempBtnInfo[1] == ACTION_INSURANCE) {
                $("#li-btn-insurannce").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_STAND) {
                $("#li-btn-stand").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_CLEAR) {
                $("#li-btn-clear").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_DEAL) {
                $("#li-btn-deal").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_REBET) {
                $("#li-btn-Rebet").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_HIT) {
                $("#li-btn-hit").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_REBET_X2) {
                $("#li-btn-rebetx2").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_DOUBLE) {
                $("#li-btn-double").show();
                totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_STARTLATE) {
                $("#li-btn-play").show();
                totalBtns++;
                //earlyInsuranceButtonClick(e, false);
            }
            else if (tempBtnInfo[1] == ACTION_SPLIT) {
               $("#li-btn-split").show();
               totalBtns++;
            }
            else if (tempBtnInfo[1] == ACTION_LATE_SURRENDER) {
                $("#li-btn-surrender").show();
                totalBtns++;
            }
        }
        else {
            //$(".btn-li").hide();
        }

        /*switch(totalBtns){
            case 2: $(".btn-li").css({'margin-right':'775px'});break;
            case 3: $(".btn-li").css({'margin-right':'285px'});break;
            case 4: $(".btn-li").css({'margin-right':'125px'});break;
            case 5: $(".btn-li").css({'margin-right':'45px'});break;
        }*/
        
        
    }
}

function addDesktopBtnListeners(){
    $("#btn-insurannce").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        earlyInsuranceButtonClick(e, true);
    });

    $("#btn-stand").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        standButtonClick(e);
    });

    $("#btn-clear").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        clearButtonClick(e);
    });

    $("#btn-deal").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        dealButtonClick(e);
    });

    $("#btn-rebet").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        rebetButtonClick(e, 1);
    });

    $("#btn-hit").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        hitButtonClick(e);
    });

    $("#btn-rebetx2").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        rebetButtonClick(e, 2);
    });

    $("#btn-double").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        doubleButtonClick(e);
    });

    $("#btn-play").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        earlyInsuranceButtonClick(e, false);
    });

    $("#btn-split").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        splitButtonClick(e, false);
    });

    $("#btn-surrender").on(isMobile.any()? 'touchstart' : 'click', function (e) {
        lateSurrenderButtonClick(e);
    });
}

/*
*   Name: DrawButtons
*   Param: buttonsArray= sorted array that contains the buttos info
*                        example: buttonsArray[n] = [NameDisplay,ClickAction]
*/
function drawButtons(buttonsArray) {
        LastButtonsArray = buttonsArray;
        $("#btn1-left, #btn2-left, #btn3-left, #btn1-right, #btn2-right, #btn3-right").addClass('collapsed');
        $("#btn4-port-left,#btn3-port-left,#btn2-port-left,#btn1-port-left").addClass('collapsed');
        $("#btn4-port-right,#btn3-port-right,#btn2-port-right,#btn1-port-right").addClass('collapsed');

        $("#btn1-left, #btn2-left, #btn3-left, #btn1-right, #btn2-right, #btn3-right").off('click touchstart');
        $("#btn4-port-left,#btn3-port-left,#btn2-port-left,#btn1-port-left").off('click touchstart');
        $("#btn4-port-right,#btn3-port-right,#btn2-port-right,#btn1-port-right").off('click touchstart');

        $("#btn1-left, #btn1-port-left, #btn1-port-right").removeClass('insurance-button');

        if(IsPortrait() && PortraitButtonsShow.Left){
            $("#buttons-port-left").show();
            $("#buttons-left,#buttons-right,#buttons-port-right").hide();
        } else if(IsPortrait() && !PortraitButtonsShow.Left){
            $("#buttons-port-right").show();
            $("#buttons-left,#buttons-right,#buttons-port-left").hide();
        } else{
            // $("#btn-move-left,#btn-move-right").addClass('collapsed');
            $("#buttons-port-left,#buttons-port-right").hide();
            $("#buttons-left,#buttons-right").show();
        }

        for (var i = 0; i <= MaxButtons; i++) {
            var tempBtnInfo = buttonsArray[i];
             
            if (tempBtnInfo != undefined && tempBtnInfo != null && tempBtnInfo[1] != "") {
                if (tempBtnInfo[1] == ACTION_INSURANCE) {
                    $("#btn1-left div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Insurance'));
                    $("#btn1-left").addClass('insurance-button');
                    $("#btn1-left").removeClass('collapsed');
                    $("#btn1-left").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        earlyInsuranceButtonClick(e, true);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_STAND) {
                    $("#btn1-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Stand'));
                    $("#btn1-right").removeClass('collapsed');
                    $("#btn1-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        standButtonClick(e);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_CLEAR) {

                    $("#btn1-left div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Clear'));
                    $("#btn1-left").removeClass('insurance-button');
                    $("#btn1-left").removeClass('collapsed');
                    $("#btn1-left").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        clearButtonClick(e);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_DEAL) {
                    $("#btn1-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Deal'));
                    $("#btn1-right").removeClass('collapsed');
                    $("#btn1-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        dealButtonClick(e);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_REBET) {
                    $("#btn1-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Rebet'));
                    $("#btn1-right").removeClass('collapsed');
                    $("#btn1-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        rebetButtonClick(e, 1);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_HIT) {
                    $("#btn2-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Hit'));
                    $("#btn2-right").removeClass('collapsed');
                    $("#btn2-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        hitButtonClick(e);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_REBET_X2) {
                    $("#btn2-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Rebet2x'));
                    $("#btn2-right").removeClass('collapsed');
                    $("#btn2-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        rebetButtonClick(e, 2);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_DOUBLE) {
                    $("#btn1-left div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Double'));
                    $("#btn1-left").removeClass('collapsed');
                    $("#btn1-left").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        doubleButtonClick(e);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_STARTLATE) {
                    $("#btn1-right div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Play'));
                    $("#btn1-right").removeClass('collapsed');
                    $("#btn1-right").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        earlyInsuranceButtonClick(e, false);
                    });
                }
                else if (tempBtnInfo[1] == ACTION_SPLIT) {

                    $("#btn2-left div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Split'));
                    $("#btn2-left").removeClass('collapsed');
                    $("#btn2-left").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        splitButtonClick(e, false);
                    });

                }
                else if (tempBtnInfo[1] == ACTION_LATE_SURRENDER) {

                    var buttonToUse = !IsPortrait()? 2: 3;
                    if (!$("#btn2-left").hasClass('collapsed')) {
                        buttonToUse += 1;
                    }
                    $("#btn" + buttonToUse + "-left div span").html(LanguagesManager.getTranslationByKey('lbl_btn_Surrender'));
                    $("#btn" + buttonToUse + "-left").addClass('insurance-button');
                    $("#btn" + buttonToUse + "-left").removeClass('collapsed');
                    $("#btn" + buttonToUse + "-left").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                        lateSurrenderButtonClick(e);
                    });
                }

                enableDisableButtons(true);
            }
            else {
            }
        }

}


function showHidePlaceBetText(show) {
    try {
        if (show) {
            //$("#place-bet-text").css('display', 'table-cell');
            $("#place-bet-text").show();
        }
        else {
            $("#place-bet-text").hide();
        }
        return true;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }
}

function IsPortrait() {
    //return window.innerHeight > window.innerWidth ? !0 : !1
    return false;
}



function enableDisableButtons(enable) {
    if(isMobile.any()){
        enable ? IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || $(".button").removeClass("button-disable") : $(".button").addClass("button-disable")

    }

        
    else{
        if(enable)
            $("#btns-ul").show();
        else
            $("#btns-ul").hide();
    }
}

var soundsLoadedFlag = false;
function loadSounds(){
    if(!soundsLoadedFlag){
        soundsLoadedFlag =true;
        SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
        SoundManager.LoadSoundsInit("");
    }

}

function dealButtonClick(e) {
    try {
        //Cashier Tournaments
        var isTournamentFlag = false;
        if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
            isTournamentFlag = true;
        }   
        if( Global.Connector.showCashier && isTournamentFlag && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0" ){
            cashierManager.openCashier();
            return;
        }

        loadSounds();
        btnClickSound();

        if (e.preventDefault(), IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag){
            return;
        } 

        if (isInsurance = !1, isDouble = !1, isDouble = !1, isTimeForDeal()) {

            //bet-atm3: 1, bet: 1, bet-atm1: 1

            if (IsCallingServer = !0, PlayerBet > Global.Connector.maxb) {
                var msg = LanguagesManager.getTranslationByKey("MaxBet").replace("~1", Global.Connector.maxb);
                showInfoMessage(msg); 
                void(IsCallingServer = !1);
                return;
       
            }
            if (Global.Connector.minb > PlayerBet) {
                var msg = LanguagesManager.getTranslationByKey("MinBet").replace("~1", Global.Connector.minb);
                showInfoMessage(msg);
                void(IsCallingServer = !1);
                return;
            }

            enableDisableButtons(!1);
            DealAction.GameSession = Global.Connector.gameSession;
            if(BetArray["bet-atm1"] != null && BetArray["bet-atm1"] != "" && !isNaN(BetArray["bet-atm1"])){
                DealAction.amt1 = BetArray["bet-atm1"];
            }else{
                DealAction.amt1 = 0;
            }

            if(BetArray["bet"] != null && BetArray["bet"] != "" && !isNaN(BetArray["bet"])){
                DealAction.amt2 = BetArray["bet"];
            }else{
                DealAction.amt2 = 0;
            }

            if(BetArray["bet-atm3"] != null && BetArray["bet-atm3"] != "" && !isNaN(BetArray["bet-atm3"])){
                DealAction.amt3 = BetArray["bet-atm3"];
            }else{
                DealAction.amt3 = 0;
            }
        
            var iteratorBets = Object.keys(BetArray);
            BetArrayLast = new Array();
            for (let key of iteratorBets) {
                BetArrayLast[key] = BetArray[key];
            }


            DealAction.DoDealAction();

            GameStatus = PLAYING_GAME;
            CustomerLastBet["bet-atm1"] = BetArray["bet-atm1"]; 
            CustomerLastBet["bet"] = BetArray["bet"]; 
            CustomerLastBet["bet-atm3"] = BetArray["bet-atm3"]; 

        }
    } catch (err) {
        txt = "There was an error on this fucntion DealButtonClick.\n\n", txt += "Error description: " + err.message + "\n\n", txt += "Click OK to continue.\n\n", alert(txt)
    }
}

/*
*   Name:   RebetButtonClick
*/
function rebetButtonClick(e, mult) {

    try {

        //Cashier Tournaments
        var isTournamentFlag = false;
        if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
            isTournamentFlag = true;
        }   
        if( Global.Connector.showCashier && isTournamentFlag && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0" ){
            cashierManager.openCashier();
            return;
        }

        loadSounds();
        btnClickSound();
        enableDisableButtons(false);
        
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        isInsurance = false;
        isDouble = false;

        var custoLastTotalBet = getGetLastTotalBet() * mult;
        
        if(validateTotalBet(custoLastTotalBet)){
            if (GameStatus == NEW_GAME) {
                IsCallingServer = true;
                cleanAllScreen();
                ResetChipsResult();

                
                if(isMobile.any()){
                    drawButtons([]);
                }
                else{
                    enableDisableButtons(false);
                    drawButtonsDesktop([]);
                }

                
                DealAction.GameSession = Global.Connector.gameSession;
                BetArray = new Array();
                if(BetArrayLast["bet-atm1"] != null && BetArrayLast["bet-atm1"] != "" && !isNaN(BetArrayLast["bet-atm1"])){
                    DealAction.amt1 = BetArrayLast["bet-atm1"] * mult;
                    setVisualBetChips(BetArrayLast["bet-atm1"] * mult,0,'-atm1');

                    BetArray["bet-atm1"] = BetArrayLast["bet-atm1"] * mult;
                    BetArrayLast["bet-atm1"]  = BetArrayLast["bet-atm1"] * mult;
                    $("#place-bet-text-right").hide();
                }else{
                    DealAction.amt1 = 0;
                    $("#place-bet-text-right").show();
                    BetArray["bet-atm1"] = 0;
                }

                if(BetArrayLast["bet"] != null && BetArrayLast["bet"] != "" && !isNaN(BetArrayLast["bet"])){
                    DealAction.amt2 = BetArrayLast["bet"] * mult;
                    setVisualBetChips(BetArrayLast["bet"]*mult,0,'');
                    $("#place-bet-text").hide();
                    
                    BetArray["bet"] = BetArrayLast["bet"] * mult;
                    BetArrayLast["bet"] = BetArrayLast["bet"] * mult;

                }else{
                    DealAction.amt2 = 0;
                    $("#place-bet-text").show();
                    BetArray["bet"] = 0;
                }

                if(BetArrayLast["bet-atm3"] != null && BetArrayLast["bet-atm3"] != "" && !isNaN(BetArrayLast["bet-atm3"])){
                    DealAction.amt3 = BetArrayLast["bet-atm3"]*mult;
                    setVisualBetChips(BetArrayLast["bet-atm3"]*mult,0,'-atm3');
                    $("#place-bet-text-left").hide();
                    BetArray["bet-atm3"] = BetArrayLast["bet-atm3"] * mult;
                    BetArrayLast["bet-atm3"] = BetArrayLast["bet-atm3"]*mult;
                }else{
                    DealAction.amt3 = 0;
                    $("#place-bet-text-left").show();
                    BetArray["bet-atm3"] = 0;
                }
                DealAction.DoDealAction();
                GameStatus = PLAYING_GAME;

                PlayerBet = custoLastTotalBet;
                TotalBet = custoLastTotalBet;
                CustomerMainBet = custoLastTotalBet;

                UpdateVisualTotalBet();
                Global.Connector.bal -= TotalBet;
                UpdateVisualBalance(Global.Connector.bal)

                //GameStatus = 'Betting';
            
            }
        }else{
            enableDisableButtons(true);
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion RebetButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
*   Name:   LateSurrenderButtonClick
*/
function lateSurrenderButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        isInsurance = false;
        isDouble = false;
        if (GameStatus == PLAYING_GAME) {
            IsCallingServer = true;
            GameStatus = PLAYING_GAME;
            enableDisableButtons(false);
            
            LastActiveHandId = 0;
            LastActiveHandId = ActiveHandId;

            SurrStandAction.GameSession = Global.Connector.gameSession;
            SurrStandAction.hid = ActiveHandId;
            SurrStandAction.act = LATE_SURRENDER;
            SurrStandAction.ncc = getNumCardsHand(ActiveHandId);
            SurrStandAction.DoSurrStandAction();
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion LateSurrenderButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


function getGetLastTotalBet(){
    var lastTotalBet = 0;
    if(BetArrayLast["bet-atm1"] != null && BetArrayLast["bet-atm1"] != "" && !isNaN(BetArrayLast["bet-atm1"])){
        lastTotalBet += BetArrayLast["bet-atm1"];
    }

    if(BetArrayLast["bet"] != null && BetArrayLast["bet"] != "" && !isNaN(BetArrayLast["bet"])){
        lastTotalBet +=  BetArrayLast["bet"];
    }

    if(BetArrayLast["bet-atm3"] != null && BetArrayLast["bet-atm3"] != "" && !isNaN(BetArrayLast["bet-atm3"])){
        lastTotalBet += BetArrayLast["bet-atm3"];
    }
    return lastTotalBet;
}
/*
* Name: ClearButtonClick
*       Clear the bet Amount if is available in the current game state
*/
function clearButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        ResetChipsResult();
        if(e != null)
            e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        if (isTimeForClear()) {
            $("#btn-chips-bet,#chips-bet,#bet-box-center").removeClass('disable');
            isInsurance = false;
            isDouble = false;

            var buttonsArray = new Array(5);

            var custoLastTotalBet = getGetLastTotalBet();
            
            if(custoLastTotalBet > 0){
                buttonsArray[2] = ["REBET", ACTION_REBET];
                buttonsArray[3] = ["REBET X2", ACTION_REBET_X2];
            }    

            GameStatus = NEW_GAME;
            cleanAllScreen();
            

            if(isMobile.any()){
                drawButtons(buttonsArray);
            }
            else{

                drawButtonsDesktop(buttonsArray);
            }

            $("#place-bet-text").show();
            $("#place-bet-text-left").show();
            $("#place-bet-text-right").show();
        }
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
*   Name:   EarlyInsuranceButtonClick
*/

function earlyInsuranceButtonClick(e, insurance) {
    //try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }

        
        var handData = HandsDataArray[insuranHandIndex];
        var handId = handData[0];
        var hansPos = handData[7];
        var newBet = (insurance?(parseFloat(handData[5]) / 2):0);
        if(validateTotalBet(newBet) || !insurance){
            if (GameStatus == PLAYING_GAME) {
                isInsurance = true;
                isDouble = false;
                GameStatus = PLAYING_GAME;

                if(insurance){
                    PlayerBet += newBet;
                    CustomerMainBet += newBet;
                    Global.Connector.bal -= newBet;
                    UpdateVisualBalance(Global.Connector.bal)
                    UpdateVisualTotalBet();

                    var amt = getAtm(handId);
                    setVisualBetChips(newBet,3,amt);
                    $(".chips-insurance").show();
                }

                var action  =  (insurance?EARLY_INSURANCE:EARLY_STARTLATE);
                insuranceActions[insuranHandIndex] = [handId,action,newBet,hansPos];

                if(insuranHandIndex < hnds){

                    insuranHandIndex++;

                    if(insuranHandIndex >= hnds){
                        enableDisableButtons(false); 
                        IsCallingServer = true;

                        $(".player-user-turn").hide();

                        EarlyAction.GameSession = Global.Connector.gameSession;

                        EarlyAction.hid1 = 0;
                        EarlyAction.act1 = 0;

                        EarlyAction.hid2 = 0;
                        EarlyAction.act2 = 0;

                        EarlyAction.hid3 = 0;
                        EarlyAction.act3 = 0;

                        for(var i = 0 ; i < insuranceActions.length; i++){

                            if(insuranceActions[i][3] == 1){
                                EarlyAction.hid1 = insuranceActions[i][0];
                                EarlyAction.act1 = insuranceActions[i][1];
                            }else if(insuranceActions[i][3] == 2){
                                EarlyAction.hid2 = insuranceActions[i][0];
                                EarlyAction.act2 = insuranceActions[i][1];
                            }else if(insuranceActions[i][3] == 3){
                                EarlyAction.hid3 = insuranceActions[i][0];
                                EarlyAction.act3 = insuranceActions[i][1];
                            }
                        }           
                        EarlyAction.DoEarlyAction();

                        insuranHandIndex = 0;
                        
                    }else{
                        var nextHandData = HandsDataArray[insuranHandIndex];
                        var nextHandId = nextHandData[0];
                        drawCursor(nextHandId);
                        drawHandOptions(nextHandId);
                       // enableDisableButtons(true); 
                    }
                }
            }
        }
    /*}
    catch (err) {
        txt = "There was an error on this fucntion EarlyInsuranceButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }*/
}
/*
*   Name:   StartLateButtonClick
*/
function startLateButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        if (GameStatus == PLAYING_GAME) {
            IsCallingServer = true;
            isInsurance = false;
            isDouble = false;
            GameStatus = PLAYING_GAME;
            enableDisableButtons(false);
            //drawButtons([]);
            EarlyAction.GameSession = Global.Connector.gameSession;
            EarlyAction.hid1 = ActiveHandId;
            EarlyAction.act1 = EARLY_STARTLATE;
            EarlyAction.DoEarlyAction();
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion StartLateButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
*   Name:   HitButtonClick
*/
function hitButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        if (GameStatus == PLAYING_GAME) {
            IsCallingServer = true;
            isInsurance = false;
            isDouble = false;
            GameStatus = PLAYING_GAME;
            enableDisableButtons(false);

            LastActiveHandId = 0;
            LastActiveHandId = ActiveHandId;

            HitDoubleAction.GameSession = Global.Connector.gameSession;
            HitDoubleAction.hid = ActiveHandId;
            HitDoubleAction.act = LATE_HIT;
            HitDoubleAction.ncc = getNumCardsHand(ActiveHandId);
            HitDoubleAction.DoHitDoubleAction();
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion HitButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

function doubleButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }

        var handData = getHandData(ActiveHandId);
        var handBet = parseFloat(handData[5]);


        if(validateTotalBet(handBet)){
            if (GameStatus == PLAYING_GAME) {


                IsCallingServer = true;
                isInsurance = false;
                isDouble = true;
                GameStatus = PLAYING_GAME;
                enableDisableButtons(false);
                PlayerBet += handBet;
                CustomerMainBet += handBet;
                Global.Connector.bal -= handBet;
                //$("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                UpdateVisualBalance(Global.Connector.bal)
                UpdateVisualTotalBet();
                
                var handaDataTemp = getHandData(ActiveHandId);
                var amt = getAtmHandPosition(handaDataTemp);

                setVisualBetChips((handBet * 2),0,amt);

                
                LastActiveHandId = 0;
                LastActiveHandId = ActiveHandId;

                HitDoubleAction.GameSession = Global.Connector.gameSession;
                HitDoubleAction.hid = ActiveHandId;
                HitDoubleAction.act = LATE_DOUBLE;
                HitDoubleAction.ncc = getNumCardsHand(ActiveHandId);
                HitDoubleAction.DoHitDoubleAction();
            }
        }
        
    }
    catch (err) {
        txt = "There was an error on this fucntion DoubleButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
*   Name:   StandButtonClick
*/
function standButtonClick(e) {
    try {
        loadSounds();
        btnClickSound();
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        if (GameStatus == PLAYING_GAME) {
            IsCallingServer = true;
            LastActiveHandId = 0;
            LastActiveHandId = ActiveHandId;
            isInsurance = false;
            isDouble = false;            
            GameStatus = PLAYING_GAME;
            enableDisableButtons(false);

            SurrStandAction.GameSession = Global.Connector.gameSession;
            SurrStandAction.hid = ActiveHandId;
            SurrStandAction.act = LATE_STAND;
            SurrStandAction.ncc = getNumCardsHand(ActiveHandId);
            SurrStandAction.DoSurrStandAction();
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion StandButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
*   Name:   SplitButtonClick
*/
var splitOriginalC2 = null;
var splitOriginalHandId = null;
var splitOriginalTotal = null;
function splitButtonClick(e) {
    try {
        splitOriginalC2 = null;
        splitOriginalHandId= null;
        splitOriginalTotal = null;
        loadSounds();
        btnClickSound();
        ++Splits;
        e.preventDefault();
        if (IsCallingServer || IsAnimatingPlayerCards || IsAnimatingDealerCards || IsAnimatingInsurance || cardAnimationFlag) {
            return;
        }
        if (GameStatus == PLAYING_GAME) {
            var handData = getHandData(ActiveHandId);
            splitOriginalC2 = handData[2];
            splitOriginalHandId = handData[0];
            splitOriginalTotal = handData[3];
            var handBet = parseFloat(handData[5]);

            if(validateTotalBet(handBet)){
                IsCallingServer = true;
                if(IsPortrait()){
                    $("#split-right").removeClass('portrait-disable');
                    $("#split-left").addClass('portrait-disable');
                }

                cleanBetChips(0);

                LastActiveHandId = 0;
                LastActiveHandId = ActiveHandId;
                isInsurance = false;
                isDouble = false;
                GameStatus = PLAYING_GAME;
                enableDisableButtons(false);

                PlayerBet += handBet;
                Global.Connector.bal -= handBet;

                UpdateVisualTotalBet();
                UpdateVisualBalance(Global.Connector.bal);
                //drawButtons([]);
                SplitAction.GameSession = Global.Connector.gameSession;
                SplitAction.hid = ActiveHandId;
                SplitAction.DoSplitAction();
            }
        }
    }
    catch (err) {
        txt = "There was an error on this fucntion SplitButtonClick.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

function isGameFinished() {
    var isFinished = !1;
    try {
        return null != isovr && parseInt(isovr) > 0 && (isFinished = !0), isFinished
    } catch (err) {
        return txt = "There was an error on this fucntion SplitButtonClick.\n\n", txt += "Error description: " + err.message + "\n\n", txt += "Click OK to continue.\n\n", alert(txt), isFinished
    }
}

/*
*   Name:   OverwriteHandInfoUpdateInf()
*/
function overwriteHandInfoUpdateInf() {

    for (var i = 0; i < UpdateDataArray.length; i++) {
        var tempUpData = UpdateDataArray[i];
        for (var j = 0; j < HandsDataArray.length; j++) {
            var tempHandDa = HandsDataArray[j];
            if (tempHandDa != null && tempUpData[0] == tempHandDa[0]) {
                tempHandDa[2] = tempUpData[1];
                tempHandDa[3] = tempUpData[2];
                tempHandDa[4] = tempUpData[3];
                HandsDataArray[j] = tempHandDa;
            }
        }
    }
}

/*
*   Name:   OverwriteHandInfoPartialInf()
*/
function overwriteHandInfoPartialInf() {
    try {
        for (var i = 0; i < PartialHandDataArray.length; i++) {
            var tempPartialData = PartialHandDataArray[i];
            for (var j = 0; j < HandsDataArray.length; j++) {
                var tempHandDa = HandsDataArray[j];
                if (tempHandDa != null && tempPartialData[0] == tempHandDa[0]) {
                    tempHandDa[6] = tempPartialData[6];
                    HandsDataArray[j] = tempHandDa;
                }
            }
        }
    } catch (err) {
        txt = "There was an error on this function OverwriteHandInfoPartialInf.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return 0;
    }
}

/*
* Name: showHidePlaceBetText
* Param:    show = to show true, to hide false 
* return:   true= all ok ; false= error
*/
function showHidePlaceBetText(show) {
    try {
        if (show) {
            //$("#place-bet-text").css('display', 'table-cell');
            $("#place-bet-text").removeClass('collapsed');
        }
        else {
            $("#place-bet-text").addClass('collapsed');
        }
        return true;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }
}

/*
* Name: cleanBetChips
* Param:    pos = bet position (0 = center, 2 = left, 1 = right, 3 = insurance(only applies in center))    
* return:   true= all ok ; false= error
*/
function cleanBetChips(pos) {
    try {
        if (pos == 2) {//center center
            $("#btn-chips-bet ol.chips-bet").empty();
            $("#bet-box-center span").html('');
            $("#bet-box-center").addClass('collapsed');
        } else if (pos == 1) { //center atm1
            $("#btn-chips-bet-atm1 ol.chips-bet").empty();
            $("#bet-box-center-atm1 span").html('');
            $("#bet-box-center-atm1").addClass('collapsed');
        } else if (pos == 3) { //center atm3
            $("#btn-chips-bet-atm3 ol.chips-bet").empty();
            $("#bet-box-center-atm3 span").html('');
            $("#bet-box-center-atm3").addClass('collapsed');
        } else if (pos == 12) { //insurance
            $("#chips-insurance").empty();
            $("#bet-box-insurance-center span").html('');
            $("#bet-box-insurance-center").addClass('collapsed');
        }
        else if (pos == 4) { //center split 1
            $("#btn-chips-bet-right ol.chips-bet").empty();
            $("#bet-box-right span").html('');
            $("#bet-box-right").addClass('collapsed');
        } else if (pos == 5) { //center split 2
            $("#btn-chips-bet-left ol.chips-bet").empty();
            $("#bet-box-left span").html('');
            $("#bet-box-left").addClass('collapsed');
        } else if (pos == 6) { //atm1 split 1
            $("#btn-chips-bet-right-atm1 ol.chips-bet").empty();
            $("#bet-box-right-atm1 span").html('');
            $("#bet-box-right-atm1").addClass('collapsed');
        } else if (pos == 7) { //atm1 split 2
            $("#btn-chips-bet-left-atm1 ol.chips-bet").empty();
            $("#bet-box-left-atm1 span").html('');
            $("#bet-box-left-atm1").addClass('collapsed');
        }
        else if (pos == 8) { // atm 3 split 1
            $("#btn-chips-bet-right-atm3 ol.chips-bet").empty();
            $("#bet-box-right-atm3 span").html('');
            $("#bet-box-right-atm3").addClass('collapsed');
        } else if (pos == 9) { // atm 3 split 2
            $("#btn-chips-bet-left-atm3 ol.chips-bet").empty();
            $("#bet-box-left-atm3 span").html('');
            $("#bet-box-left-atm3").addClass('collapsed');
        } else if (pos == 10) { //insurance atm1
            $("#chips-insurance-atm1").empty();
            $("#bet-box-insurance-center-atm1 span").html('');
            $("#bet-box-insurance-center-atm1").addClass('collapsed');
        } else if (pos == 11) {//insurance atm3
            $("#chips-insurance-atm3").empty();
            $("#bet-box-insurance-center-atm3 span").html('');
            $("#bet-box-insurance-center-atm3").addClass('collapsed');
        }
        return true;
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }
}

//Check if is an apple device
function isAppleDevice() {
    return (
        (navigator.userAgent.toLowerCase().indexOf("ipad") > -1) ||
        (navigator.userAgent.toLowerCase().indexOf("iphone") > -1) ||
        (navigator.userAgent.toLowerCase().indexOf("ipod") > -1)
    );
}

//Play the Card Sound
function playCardSound() {
    try {

        if(!fastPlay) {

            SoundManager.StopAudio("card-sound", GameSounds["card-sound"]);
            GameSounds["card-sound"] = SoundManager.PlayAudio("card-sound", false); 

        }
    }
    catch (err) {
        txt = "There was an error on this function PlayCardSound.\n\n";
        txt += "Error description: " + err.Message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

/************************************************************/
/************************************************************/
/* INIT: FUNCTIONS FOR CARDS, BUTTONS DISPLAY AND CLEAN     */
/************************************************************/
/************************************************************/

/*
*   Animate a Card
*   Param handName: 'dealer','split-center','split-left', 'split-right'
*/
function animateHandCard(handName, currentCard, duration) {

    //try {


        cardAnimationFlag = true;
        playCardSound();

        duration = (fastPlay? 1: duration);

        var portraitClass = IsPortrait()? 'portrait':'';
        var newCard = $('<span class="' + handName + '-card-animate"></span>');
        $("#main-block").append(newCard);

        var topMove = 0;
        var leftMove = 0;
        var leftAddSubstract = '-';

        if (handName == 'dealer') {
            topMove = IsPortrait() ? 53 :50;
            leftMove = currentCard <= 1 ? (IsPortrait()? 37.9 : 43) + (currentCard * (IsPortrait()? 6.8 : 4.5)) : (IsPortrait()? 37.9 : 43) + (currentCard * (IsPortrait()? 6.8 : 4.5)) - ((currentCard - 1) * (IsPortrait()? 2.2 : 2));
        }
        else if (handName == 'split-center') {
            topMove = IsPortrait() ? 118 : 105.5;
            leftMove = currentCard < 2 ? (IsPortrait()? 35.3 : 40.5) + (currentCard * (IsPortrait()? 6.8 : 4.5)) : (IsPortrait()? 35.3 : 40.5) + (currentCard * (IsPortrait()? 6.8 : 4.5)) - ((currentCard - 1) * (IsPortrait()? 1.7 : 2));
        }
        else if (handName == 'split-center-atm1') {
            topMove = IsPortrait() ? 118 : 95;
            leftMove = currentCard < 2 ? (IsPortrait()? 35.3 : 80) + (currentCard * (IsPortrait()? 6.8 : 4.5)) : (IsPortrait()? 35.3 : 80) + (currentCard * (IsPortrait()? 6.8 : 4.5)) - ((currentCard - 1) * (IsPortrait()? 1.7 : 2));
        }
        else if (handName == 'split-center-atm3') {
            topMove = IsPortrait() ? 118 : 95;
            leftMove = currentCard < 2 ? (IsPortrait()? 35.3 : 5) + (currentCard * (IsPortrait()? 6.8 : 4.5)) : (IsPortrait()? 35.3 : 5) + (currentCard * (IsPortrait()? 6.8 : 4.5)) - ((currentCard - 1) * (IsPortrait()? 1.7 : 2));
        }        
        else if (handName == 'split-right-split1') {
            
            topMove = 90.5;
            leftMove = 60; 
        }
        else if (handName == 'split-left-split2') {
            
            topMove = 90.5;
            leftMove = 25; 
        }
        else if (handName == 'split-right-atm1-split1') {
            topMove = 95;
            leftMove = 80; 
        }
        else if (handName == 'split-left-atm1-split2') {
            topMove = 80;
            leftMove = 80; 
        }

        else if (handName == 'split-right-atm3-split1') {
            topMove = 100;
            leftMove = 10; 
        }
        else if (handName == 'split-left-atm3-split2') {
            topMove = 80;
            leftMove = 0; 
        }

        //newCard.scale(0.7);
        newCard.animate({
            top: '+=' + topMove + '%',
            left: leftMove + '%',
            height: 'toggle',
            scale: '+=0.3'
        }, duration, 'linear', function () {
            // Animation complete.
            newCard.remove();
            cardAnimationFlag = false;
        });

    /*}
    catch (err) {
        txt = "There was an error on this function animateHandCard.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }*/
}

/*
* Name: drawDealerOneCardInfo
* Param:    dealerCard = dealer card
*           totalDC= total dealer cards
*/
function drawDealerOneCardInfo(dealerCard, totalDC, fromResize, carNumber) {
    var currentCard = 0;
    var startLeftMargin = IsPortrait()? 30: 34, finalLeftMargin = IsPortrait()? 30: 34;
    var startShadowLeftMargin = 40, finalShadowLeftMargin = 40;
    var cardName = "";
    var stopAnimation = false;
    var sleepTimer = 900;
    var sleepTimerAnimation = 600;
    var showAnimations = true;
    IsAnimatingDealerCards = true;


    if (isGameFinished() &&  (totalDC != 21 || carNumber >= 2)){
        $("#cards-total-dealer-cards").css("visibility","visible");
        $("#cards-total-dealer-cards").css('display', 'table');  
        $("#cards-total-dealer-cards span").html(totalDC);
        $("#cards-total-dealer-cards").removeClass('busted');
        if(totalDC > 21){
            $("#cards-total-dealer-cards").addClass('busted');
        }
    }



    if(fastPlay){
        sleepTimer = 0;
        sleepTimerAnimation = 0;
        showAnimations = false;
    }

    //Identify the current card to animate
    while ($("#dc" + currentCard).is(":visible")) {
        ++currentCard;
    }

    animateHandCard('dealer', currentCard, (fastPlay?10:200));

    if($("#cards-total-dealer-cards").length){
        //console.log("elementos ya existen DEALER")
    }else{
        var hanInfo1 = $('<li><div class="dealer-count-info" id="cards-total-dealer-cards"><span></span></div></li>');
        var hanInfo2 = $('<li><span class="dealer-user-turn" id="dealer-turn"></span></li>');
        $("#dealer-cards").append(hanInfo1);
        $("#dealer-cards").append(hanInfo2);
    }

    var animateCard = setTimeout(function () {
        if (!isNaN(dealerCard)) {
            //if (parseInt(dealerCard) == -1 || (carNumber == 2 && currentCard == 0)) {
            if ( currentCard == 0) {
                cardName = "60.png";
            } else {
                cardName = dealerCard + '.png';
            }
            if ($("#dc" + currentCard).length <= 0) {
                var newCard = $('<li><div id="dc' + currentCard + '" clas="crad-elemt"/></li>')
                $("#dealer-cards").append(newCard);
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                $("#dc" + currentCard).show();
            }
            else {
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
            }
        }

        if (isGameFinished() && carNumber == 2) {
            drawCursor(-1);
            $("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
            
            if (totalDC > 0) {
                $("#cards-total-dealer-cards span").html(totalDC);
                $("#cards-total-dealer-cards").removeClass('busted');
                if(totalDC > 21){
                    $("#cards-total-dealer-cards").addClass('busted');
                }
            }

            if(carNumber == 2 && !fromResize){
                // alert('I am');
                $('#dc0').hide()
                .css('background', 'url(images/Cards/' + dc1 + '.png) no-repeat top left')
                .css('background-size', '100% 100%')
                .css('-moz-background-size', '100% 100%')
                .animate({
                    width: 'toggle'
                }, (fastPlay?0:500), function () {
                    drawCursorHandTotal(3); 
                    drawHandResult();
                    IsAnimatingDealerCards = false;
                    //enableDisableButtons(true);
                });
            } else if(carNumber == 2 && totalDC != 21 ){
                drawCursorHandTotal(3); 
                drawHandResult();
                IsAnimatingDealerCards = false;
            }

            $("#btn-chips-bet").removeClass('disable');
            CustomerMainBet = 0;
            openNewGame(false);
        }
        else{
            if(carNumber == 2 ){
                IsAnimatingDealerCards = false;
                //enableDisableButtons(true);
            }
            
        }

    }, (fastPlay?0:295));
}

/*
* Name: drawDealerCardsInfo
* Param:    dealerCards = dealer cards array
*           totalDC= total dealer cards
*/
function drawDealerCardsInfoRecovery(dealerCards, totalDC, fromResize) {
    try {
        var currentCard = 0;
        var startLeftMargin = IsPortrait()? 30: 34, finalLeftMargin = IsPortrait()? 30: 34;
        var startShadowLeftMargin = 40, finalShadowLeftMargin = 40;
        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 900;
        var sleepTimerAnimation = 600;
        var showAnimations = true;
        IsAnimatingDealerCards = true;

        if (isGameFinished() &&  (totalDC != 21 || dealerCards.length > 2)){
            drawCursorHandTotal(3); 
            $(".player-user-turn").hide();
        }


        //If is the final deal, change the first card
        if (isGameFinished() && (dealerCards.length > 2 || totalDC != 21)) {
            cardName = dealerCards[currentCard] + '.png';
            if ($("#dc" + currentCard).length <= 0) {
                var newCard = $('<li><div id="dc' + currentCard + '" clas="crad-elemt"/></li>')
                $("#dealer-cards").append(newCard);
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                $("#dc" + currentCard).show();
            }
            else {
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
            }

            sleepTimer = 600;
            sleepTimerAnimation = 300;
        }
        else if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if(fastPlay){
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        //Identify the current card to animate
        while ($("#dc" + currentCard).is(":visible")) {
            ++currentCard;
        }


        if($("#cards-total-dealer-cards").length){
            //console.log("elementos ya existen DEALER")
        }else{
            var hanInfo1 = $('<li><div class="dealer-count-info" id="cards-total-dealer-cards"><span></span></div></li>');
            var hanInfo2 = $('<li><span class="dealer-user-turn" id="dealer-turn"></span></li>');
            $("#dealer-cards").append(hanInfo1);
            $("#dealer-cards").append(hanInfo2);
        }


        var animateCard = setInterval(function () {
            if (currentCard < dealerCards.length) {
                if (!isNaN(dealerCards[currentCard])) {
                    if (parseInt(dealerCards[currentCard]) == -1 || (dealerCards.length == 2 && currentCard == 0)) {
                        cardName = "60.png";
                    } else {
                        cardName = dealerCards[currentCard] + '.png';
                    }
                    finalLeftMargin = dealerCards.length > 2 ? (startLeftMargin - ((dealerCards.length - 2) * 2)) : startLeftMargin;
                    finalShadowLeftMargin = dealerCards.length > 2 ? (startShadowLeftMargin + ((dealerCards.length - 2) * 8.7)) : startShadowLeftMargin;
                    $('#dealer-elements').css('left', finalLeftMargin + '%');
                    $("#dealer-cards li.shadow").remove();

                    if ($("#dc" + currentCard).length <= 0) {
                        var newCard = $('<li><div id="dc' + currentCard + '" clas="crad-elemt"/></li>')
                        $("#dealer-cards").append(newCard);
                        $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#dc" + currentCard).css('background-size', '100% 100%');
                        $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                        $("#dc" + currentCard).show();
                    }
                    else {
                        $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#dc" + currentCard).css('background-size', '100% 100%');
                        $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                    }
                }
                ++currentCard;

                if (currentCard == dealerCards.length) {
                    stopAnimation = true;
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (isGameFinished()) {


                    $("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                    
                    if (totalDC > 0) {
                        $("#cards-total-dealer-cards").css("visibility","visible");
                        $("#cards-total-dealer-cards").css('display', 'table');  
                        $("#cards-total-dealer-cards span").html(totalDC);
                        $("#cards-total-dealer-cards").removeClass('busted');
                        if(totalDC > 21){
                            $("#cards-total-dealer-cards").addClass('busted');
                        }
                    }else{
                        $("#cards-total-dealer-cards").hide();
                        $("#cards-total-dealer-cards").css("visibility","hidden");
                    }

                    if(dealerCards.length == 2 && totalDC == 21 && !fromResize){
                        // alert('I am');
                        /*$('#dc0').hide()
                        .css('background', 'url(images/Cards/' + dealerCards[0] + '.png) no-repeat top left')
                        .css('background-size', '100% 100%')
                        .css('-moz-background-size', '100% 100%')
                        .animate({
                            width: 'toggle'
                        }, 10, function () {
                            drawCursorHandTotal(3); 
                            drawHandResult();
                            IsAnimatingDealerCards = false;
                            enableDisableButtons(true);
                        });*/
                    } else{
                        drawCursorHandTotal(3); 
                        drawHandResult();
                        IsAnimatingDealerCards = false;
                        //enableDisableButtons(true);
                    }

                    $("#btn-chips-bet").removeClass('disable');
                    CustomerMainBet = 0;
                }
                else{
                    IsAnimatingDealerCards = false;
                    //enableDisableButtons(true);
                }
                
            }
        }, 10);
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
* Name: drawDealerCardsInfo
* Param:    dealerCards = dealer cards array
*           totalDC= total dealer cards
*/
function drawDealerCardsInfo(dealerCards, totalDC, fromResize) {
    try {
        var currentCard = 0;
        var startLeftMargin = IsPortrait()? 30: 34, finalLeftMargin = IsPortrait()? 30: 34;
        var startShadowLeftMargin = 40, finalShadowLeftMargin = 40;
        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 300;
        var sleepTimerAnimation = 200;
        var showAnimations = true;
        IsAnimatingDealerCards = true;

        if (isGameFinished() &&  (totalDC != 21 || dealerCards.length > 2)){
            drawCursorHandTotal(3); 
            $(".player-user-turn").hide();
        }


        //If is the final deal, change the first card
        if (isGameFinished() && (dealerCards.length > 2 || totalDC != 21)) {
            cardName = dealerCards[currentCard] + '.png';
            if ($("#dc" + currentCard).length <= 0) {
                var newCard = $('<li><div id="dc' + currentCard + '" clas="crad-elemt"/></li>')
                $("#dealer-cards").append(newCard);
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                $("#dc" + currentCard).show();
            }
            else {
                $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#dc" + currentCard).css('background-size', '100% 100%');
                $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
            }

            sleepTimer = 300;
            sleepTimerAnimation = 280;
        }
        else if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if(fastPlay){
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        //Identify the current card to animate
        while ($("#dc" + currentCard).is(":visible")) {
            ++currentCard;
        }

        //Start Deal Animation
        if (currentCard < dealerCards.length && showAnimations) {
            setTimeout(function () {
                animateHandCard('dealer', currentCard, (fastPlay?10:200));
            }, sleepTimerAnimation);
        } else if(currentCard == dealerCards.length){
            finalLeftMargin = dealerCards.length > 2 ? (startLeftMargin - ((dealerCards.length - 2) * 2)) : startLeftMargin;
            $('#dealer-elements').css('left', finalLeftMargin + '%');
        }

        if($("#cards-total-dealer-cards").length){
            //console.log("elementos ya existen DEALER")
        }else{
            var hanInfo1 = $('<li><div class="dealer-count-info" id="cards-total-dealer-cards"><span></span></div></li>');
            var hanInfo2 = $('<li><span class="dealer-user-turn" id="dealer-turn"></span></li>');
            $("#dealer-cards").append(hanInfo1);
            $("#dealer-cards").append(hanInfo2);
        }


        var animateCard = setInterval(function () {
            if (currentCard < dealerCards.length) {
                if (!isNaN(dealerCards[currentCard])) {
                    if (parseInt(dealerCards[currentCard]) == -1 || (dealerCards.length == 2 && currentCard == 0)) {
                        cardName = "60.png";
                    } else {
                        cardName = dealerCards[currentCard] + '.png';
                    }
                    finalLeftMargin = dealerCards.length > 2 ? (startLeftMargin - ((dealerCards.length - 2) * 2)) : startLeftMargin;
                    finalShadowLeftMargin = dealerCards.length > 2 ? (startShadowLeftMargin + ((dealerCards.length - 2) * 8.7)) : startShadowLeftMargin;
                    $('#dealer-elements').css('left', finalLeftMargin + '%');
                    $("#dealer-cards li.shadow").remove();

                    if ($("#dc" + currentCard).length <= 0) {
                        var newCard = $('<li><div id="dc' + currentCard + '" clas="crad-elemt"/></li>')
                        $("#dealer-cards").append(newCard);
                        $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#dc" + currentCard).css('background-size', '100% 100%');
                        $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                        $("#dc" + currentCard).show();
                    }
                    else {
                        $("#dc" + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#dc" + currentCard).css('background-size', '100% 100%');
                        $("#dc" + currentCard).css('-moz-background-size', '100% 100%');
                    }
                }
                ++currentCard;

                if (currentCard == dealerCards.length) {
                    stopAnimation = true;
                }
                else if ($("#dc" + currentCard).length <= 0 || !$("#dc" + currentCard).is(":visible")) {
                    if (showAnimations) {
                        setTimeout(function () {
                            animateHandCard('dealer', currentCard, (fastPlay?10:300));
                        }, sleepTimerAnimation);
                    }
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (isGameFinished()) {
                    $("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                    
                    if (totalDC > 0) {
                        $("#cards-total-dealer-cards").css("visibility","visible");
                        $("#cards-total-dealer-cards").css('display', 'table');  
                        $("#cards-total-dealer-cards span").html(totalDC);
                        $("#cards-total-dealer-cards").removeClass('busted');
                        if(totalDC > 21){
                            $("#cards-total-dealer-cards").addClass('busted');
                        }
                    }else{
                        $("#cards-total-dealer-cards").hide();
                        $("#cards-total-dealer-cards").css("visibility","hidden");
                    }

                    if(dealerCards.length == 2 && totalDC == 21 && !fromResize){
                        // alert('I am');
                        $('#dc0').hide()
                        .css('background', 'url(images/Cards/' + dealerCards[0] + '.png) no-repeat top left')
                        .css('background-size', '100% 100%')
                        .css('-moz-background-size', '100% 100%')
                        .animate({
                            width: 'toggle'
                        }, (fastPlay?10:500), function () {
                            drawCursorHandTotal(3); 
                            drawHandResult();
                            IsAnimatingPlayerCards = IsAnimatingDealerCards = false;

                            openNewGame(false);
                            //enableDisableButtons(true);

                        });
                    } else{
                        
                        setTimeout(function(){
                            drawCursorHandTotal(3); 
                            drawHandResult();
                            IsAnimatingPlayerCards = IsAnimatingDealerCards = false;
                            openNewGame(false);

                        },(fastPlay?10:300))
                        
                        //enableDisableButtons(true);
                    }

                    $("#btn-chips-bet").removeClass('disable');
                    CustomerMainBet = 0;
                }
                else{
                    IsAnimatingDealerCards = false;
                    //enableDisableButtons(true);
                }
                
            }
        }, (fastPlay?10:400));
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
* Name: CleanDealerCardsInfo
*/
function cleanDealerCardsInfo() {
    try {
        $("#dealer-cards").empty();

        $("#cards-total-dealer-cards span").html('');
        $("#cards-total-dealer-cards").hide();
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
* Name: drawCenterOneCardInfoSplit
* Param:    centerCards = center cards array
*           totalCC= total Center cards
*/
function drawCenterOneCardInfoSplit(centerCard, totalCC, atm, cardNumber) {
    
    var currentCard = 0;
    var startLeftMargin = 26, finalLeftMargin =  26;
    var handPosInd  = 0;
    var baseName = 'split-center'

    handPosInd = getHandPositionByAtm(atm);

    if(atm == "-split1"){
        baseName = 'split-right';
    }
    else if(atm == "-atm1-split1"){
        baseName = 'split-right';
    }
    else if(atm == "-atm3-split1"){
        baseName = 'split-right';
    }
    else if(atm == "-split2"){
        baseName = 'split-left';
    }
    else if(atm == "-atm1-split2"){
        baseName = 'split-left';
    }
    else if( atm == "-atm3-split2"){
        baseName = 'split-left';
    }
   
    var cardName = "";

    while ($("#cen" + atm + currentCard).is(":visible")) {
        ++currentCard;
    }

    if (isGameFinished()) {
        /*if (totalCC <= 21) {
            drawCursorHandTotal(3); //Dealer Hand
        }*/
    }

    if(currentCard == 1 && centerCard !=-1){

        if((""+centerCard).indexOf(-1)<0){
            animateHandCard((baseName + atm), currentCard, (fastPlay?10:200));
        }else{
            if(atm.indexOf('split') < 0){
                animateHandCard((baseName + atm), currentCard, (fastPlay?10:200));
            }
                
        }
    }

   

    if($("#cards-total-"+baseName+atm).length){
        //console.log("elementos ya existen")
    }else{
        var hanInfo1 = $('<li><span class="player-user-turn" id="center-turn'+atm+'"></span></li>');
        var hanInfo2 = $('<li><div class="player-count-info" id="cards-total-'+baseName+atm+'"><span></span></div></li>');
        $("#"+baseName+"-cards" + atm).append(hanInfo1);
        $("#"+baseName+"-cards" + atm).append(hanInfo2);
    }


    var animateCard = setTimeout(function () {
        if (!isNaN(centerCard)) {

            if (parseInt(centerCard) != -1) {
                cardName = centerCard + '.png';

                if ($("#cen" + atm + currentCard).length <= 0) {
                    var newCard = $('<li><div id="cen' + atm  + currentCard + '" clas="crad-elemt" /></li>')
                    $("#"+baseName+"-cards" + atm).append(newCard);
                    $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                    $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                    $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                    $("#cen" + atm + currentCard).show();
                }
                else {
                    $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                    $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                    $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                }
            }

            
        }

        //if (!isGameFinished()) {
        drawCursorHandTotal(handPosInd);
        //}
        
        $("#cards-total-dealer-cards").css("visibility","hidden");
        if (totalCC > 0 && cardNumber >= 2) {
            $("#cards-total-"+baseName+ atm ).css('visibility', 'visible');
            $("#cards-total-"+baseName+ atm +" span").html(totalCC);
            $("#cards-total-"+baseName + atm).removeClass('busted');
            if(totalCC > 21){
                $("#cards-total-"+baseName + atm).addClass('busted');
            }
        }else{
            $("#cards-total-s"+baseName+ atm ).css('visibility', 'hidden');
        }

        IsAnimatingPlayerCards = false;
        //enableDisableButtons(true);
       
    }, (fastPlay?10:200));
}


/*
* Name: drawCenterOneCardInfo
* Param:    centerCards = center cards array
*           totalCC= total Center cards
*/
function drawCenterOneCardInfo(centerCard, totalCC, atm, cardNumber) {
    var currentCard = 0;
    var handPosInd  = 0;
    if(atm == "-atm1"){
        handPosInd  = 4;
    }else if(atm == "-atm3"){
        handPosInd  = 7;
    }
    
    var cardName = "";

    while ($("#cen" + atm + currentCard).is(":visible")) {
        ++currentCard;
    }


    if (isGameFinished()) {
        /*if (totalCC <= 21) {
            drawCursorHandTotal(3); //Dealer Hand
        }*/
    }

    if(centerCard.indexOf(-1)<0){
        animateHandCard(('split-center' + atm), currentCard, (fastPlay?10:300));
    }else{
        if(atm.indexOf('split') < 0){
            animateHandCard(('split-center' + atm), currentCard, (fastPlay?10:300));
        }
            
    }
   

    if($("#cards-total-split-center"+atm).length){
        //console.log("elementos ya existen")
    }else{
        var hanInfo1 = $('<li><span class="player-user-turn" id="center-turn'+atm+'"></span></li>');
        var hanInfo2 = $('<li><div class="player-count-info" id="cards-total-split-center'+atm+'"><span></span></div></li>');
        $("#split-center-cards" + atm).append(hanInfo1);
        $("#split-center-cards" + atm).append(hanInfo2);
    }


    var animateCard = setTimeout(function () {
        if (!isNaN(centerCard)) {

            if (parseInt(centerCard) == -1) {
                cardName = "60.png";
            } else {
                cardName = centerCard + '.png';
            }

            if ($("#cen" + atm + currentCard).length <= 0) {
                var newCard = $('<li><div id="cen' + atm  + currentCard + '" clas="crad-elemt" /></li>')
                $("#split-center-cards" + atm).append(newCard);
                $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                $("#cen" + atm + currentCard).show();
            }
            else {
                $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
            }
        }

        //if (!isGameFinished()) {
        drawCursorHandTotal(handPosInd);
        //}
        
        $("#cards-total-dealer-cards").css("visibility","hidden");
        if (totalCC > 0 && cardNumber >= 2) {
            $("#cards-total-split-center"+ atm ).css('visibility', 'visible');
            $("#cards-total-split-center"+ atm +" span").html(totalCC);
            $("#cards-total-split-center" + atm).removeClass('busted');
            if(totalCC > 21){
                $("#cards-total-split-center" + atm).addClass('busted');
            }
        }else{
            $("#cards-total-split-center"+ atm ).css('visibility', 'hidden');
        }

        IsAnimatingPlayerCards = false;
        //enableDisableButtons(true);
       
    }, (fastPlay?0:295));
}


/*
* Name: drawCenterCardsInfoRecovery
* Param:    centerCards = center cards array
*           totalCC= total Center cards
*/
function drawCenterCardsInfoRecovery(centerCards, totalCC, atm) {

    /*try {*/
        var currentCard = 0;
        var startLeftMargin = IsPortrait()? 27: 26, finalLeftMargin = IsPortrait()? 27: 26;
        var handPosInd  = 0;
        var baseName = 'split-center'

        if(atm == "-atm1"){
            handPosInd  = 4;
        }else if(atm == "-atm3"){
            handPosInd  = 7;
        }
        else if(atm == "-split1"){
            handPosInd  = 1;
            baseName = 'split-right';
        }
        else if(atm == "-atm1-split1"){
            handPosInd  = 5;
            baseName = 'split-right';
        }
        else if(atm == "-atm3-split1"){
            handPosInd  = 8;
            baseName = 'split-right';
        }
        else if(atm == "-split2"){
            handPosInd  = 2;
            baseName = 'split-left';
        }
        else if(atm == "-atm1-split2"){
            handPosInd  = 6;
            baseName = 'split-left';
        }
        else if( atm == "-atm3-split2"){
            handPosInd  = 9;
            baseName = 'split-left';
        }
        
        var startResultLeftMargin = IsPortrait()? 8:10, finalResultLeftMargin = IsPortrait()? 8:10;
        var startChipsLeftMargin = 12, finalChipsLeftMargin = 12;
        var startBetBoxLeftMargin = 27.5, finalBetBoxLeftMargin = 27.5;
        var startShadowLeftMargin = 54, finalShadowLeftMargin = 54;
        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 700;
        var sleepTimerAnimation = 200;
        var showAnimations = true;

        while ($("#cen" + atm + currentCard).is(":visible")) {
            ++currentCard;
        }


        if (isGameFinished()) {
            /*if (totalCC <= 21) {
                drawCursorHandTotal(3); //Dealer Hand
            }*/
        }
        else if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if(fastPlay){
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if($("#cards-total-"+baseName+atm).length){
            //console.log("elementos ya existen")
        }else{
            var hanInfo1 = $('<li><span class="player-user-turn" id="center-turn'+atm+'"></span></li>');
            var hanInfo2 = $('<li><div class="player-count-info" id="cards-total-'+baseName+atm+'"><span></span></div></li>');
            $("#"+baseName+"-cards" + atm).append(hanInfo1);
            $("#"+baseName+"-cards" + atm).append(hanInfo2);
        }

        var animateCard = setInterval(function () {

            if (currentCard < centerCards.length) {
                if (!isNaN(centerCards[currentCard])) {

                    if (parseInt(centerCards[currentCard]) == -1) {
                        cardName = "60.png";
                    } else {
                        cardName = centerCards[currentCard] + '.png';
                    }

                    if(atm.indexOf('split') > 0  && centerCards[currentCard] == -1){
                        //console.log("no anima la carta")
                    }else{
                        if ($("#cen" + atm + currentCard).length <= 0) {
                            var newCard = $('<li><div id="cen' + atm  + currentCard + '" clas="crad-elemt" /></li>')
                            $("#"+baseName+"-cards" + atm).append(newCard);
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                            $("#cen" + atm + currentCard).show();
                        }
                        else {
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                        }
                    }                
                }
                ++currentCard;

                if (currentCard == centerCards.length) {
                    stopAnimation = true;
                }
                else if ($("#cen" + atm + currentCard).length <= 0 || !$("#cen" + atm + currentCard).is(":visible")) {
                    /*if (showAnimations) {
                        setTimeout(function () {
                            animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
                        }, (10));
                    }*/
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (!isGameFinished()) {
                    drawCursorHandTotal(handPosInd);
                }
                else if (totalCC > 21) {
                    /*setTimeout(function () {
                        drawCursorHandTotal(3); //Dealer Hand
                    }, 300);*/
                }

                if (totalCC > 0) {
                    $("#cards-total-"+baseName+ atm +" span").html(totalCC);
                    $("#cards-total-"+baseName + atm).removeClass('busted');
                    if(totalCC > 21){
                        $("#cards-total-"+baseName + atm).addClass('busted');
                    }
                }

                IsAnimatingPlayerCards = false;
                //enableDisableButtons(true);
                //console.log("hasta ahora botones")
            }
        }, (10));

}

/*
* Name: drawCenterCardsInfoSplit
* Param:    centerCards = center cards array
*           totalCC= total Center cards
*/
function drawCenterCardsInfoSplit(centerCards, totalCC, atm) {


        var currentCard = 0;
        var startLeftMargin = 26, finalLeftMargin =  26;
        var handPosInd  = 0;
        var baseName = 'split-center'

        if(atm == "-atm1"){
            handPosInd  = 4;
        }else if(atm == "-atm3"){
            handPosInd  = 7;
        }
        else if(atm == "-split1"){
            handPosInd  = 1;
            baseName = 'split-right';
        }
        else if(atm == "-atm1-split1"){
            handPosInd  = 5;
            baseName = 'split-right';
        }
        else if(atm == "-atm3-split1"){
            handPosInd  = 8;
            baseName = 'split-right';
        }
        else if(atm == "-split2"){
            handPosInd  = 2;
            baseName = 'split-left';
        }
        else if(atm == "-atm1-split2"){
            handPosInd  = 6;
            baseName = 'split-left';
        }
        else if( atm == "-atm3-split2"){
            handPosInd  = 9;
            baseName = 'split-left';
        }
        
        var startResultLeftMargin = IsPortrait()? 8:10, finalResultLeftMargin = IsPortrait()? 8:10;
        var startChipsLeftMargin = 12, finalChipsLeftMargin = 12;
        var startBetBoxLeftMargin = 27.5, finalBetBoxLeftMargin = 27.5;
        var startShadowLeftMargin = 54, finalShadowLeftMargin = 54;
        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 700;
        var sleepTimerAnimation = 200;
        var showAnimations = true;

        while ($("#cen" + atm + currentCard).is(":visible")) {
            ++currentCard;
        }


        if (isGameFinished()) {
            /*if (totalCC <= 21) {
                drawCursorHandTotal(3); //Dealer Hand
            }*/
        }
        else if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if(fastPlay){
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if (currentCard > 0) {
            //animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
            if(centerCards.indexOf("-1")<0){
                //animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
            }else{
                if(atm.indexOf('split') < 0){
                    //animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
                }
                    
            }

        }

        if($("#cards-total-"+baseName+atm).length){
            //console.log("elementos ya existen")
        }else{
            var hanInfo1 = $('<li><span class="player-user-turn" id="center-turn'+atm+'"></span></li>');
            var hanInfo2 = $('<li><div class="player-count-info" id="cards-total-'+baseName+atm+'"><span></span></div></li>');
            $("#"+baseName+"-cards" + atm).append(hanInfo1);
            $("#"+baseName+"-cards" + atm).append(hanInfo2);
        }

        var animateCard = setInterval(function () {

            if (currentCard < centerCards.length) {
                if (!isNaN(centerCards[currentCard])) {

                    if (parseInt(centerCards[currentCard]) == -1) {
                        cardName = "60.png";
                    } else {
                        cardName = centerCards[currentCard] + '.png';
                    }
                    if(atm.indexOf('split') > 0  && centerCards[currentCard] == -1){
                        //console.log("no anima la carta")
                    }else{
                        if ($("#cen" + atm + currentCard).length <= 0) {
                            var newCard = $('<li><div id="cen' + atm  + currentCard + '" clas="crad-elemt" /></li>')
                            $("#"+baseName+"-cards" + atm).append(newCard);
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                            $("#cen" + atm + currentCard).show();
                        }
                        else {
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                        }
                    }                    
                }
                ++currentCard;

                if (currentCard == centerCards.length) {
                    stopAnimation = true;
                }
                else if ($("#cen" + atm + currentCard).length <= 0 || !$("#cen" + atm + currentCard).is(":visible")) {
                    if (currentCard > 1) {
                        setTimeout(function () {
                            animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
                        }, (fastPlay?10:100));
                    }
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (!isGameFinished()) {
                    drawCursorHandTotal(handPosInd);
                }
                else if (totalCC > 21) {
                    /*setTimeout(function () {
                        drawCursorHandTotal(3); //Dealer Hand
                    }, 300);*/
                }

                if (totalCC > 0) {
                    $("#cards-total-"+baseName+ atm +" span").html(totalCC);
                    $("#cards-total-"+baseName + atm).removeClass('busted');
                    if(totalCC > 21){
                        $("#cards-total-"+baseName + atm).addClass('busted');
                    }
                }

                IsAnimatingPlayerCards = false;

            }
        }, (fastPlay?10:300));
    /*}
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }*/
}


/*
* Name: DrawCenterCardsInfo
* Param:    centerCards = center cards array
*           totalCC= total Center cards
*/
function drawCenterCardsInfo(centerCards, totalCC, atm) {
        var currentCard = 0;
        var startLeftMargin = 26, finalLeftMargin =  26;
        var handPosInd  = 0;
        var baseName = 'split-center'

        if(atm == "-atm1"){
            handPosInd  = 4;
        }else if(atm == "-atm3"){
            handPosInd  = 7;
        }
        else if(atm == "-split1"){
            handPosInd  = 1;
            baseName = 'split-right';
        }
        else if(atm == "-atm1-split1"){
            handPosInd  = 5;
            baseName = 'split-right';
        }
        else if(atm == "-atm3-split1"){
            handPosInd  = 8;
            baseName = 'split-right';
        }
        else if(atm == "-split2"){
            handPosInd  = 2;
            baseName = 'split-left';
        }
        else if(atm == "-atm1-split2"){
            handPosInd  = 6;
            baseName = 'split-left';
        }
        else if( atm == "-atm3-split2"){
            handPosInd  = 9;
            baseName = 'split-left';
        }
        
        var startResultLeftMargin = IsPortrait()? 8:10, finalResultLeftMargin = IsPortrait()? 8:10;
        var startChipsLeftMargin = 12, finalChipsLeftMargin = 12;
        var startBetBoxLeftMargin = 27.5, finalBetBoxLeftMargin = 27.5;
        var startShadowLeftMargin = 54, finalShadowLeftMargin = 54;
        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 700;
        var sleepTimerAnimation = 200;
        var showAnimations = true;

        while ($("#cen" + atm + currentCard).is(":visible")) {
            ++currentCard;
        }


        if (isGameFinished()) {
            /*if (totalCC <= 21) {
                drawCursorHandTotal(3); //Dealer Hand
            }*/
        }
        else if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if(fastPlay){
            sleepTimer = 0;
            sleepTimerAnimation = 0;
            showAnimations = false;
        }

        if (currentCard < centerCards.length && showAnimations) {
            //animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
            if(centerCards.indexOf("-1")<0){
                animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
            }else{
                if(atm.indexOf('split') < 0){
                    animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
                }
                    
            }

        }

        if($("#cards-total-"+baseName+atm).length){
            //console.log("elementos ya existen")
        }else{
            var hanInfo1 = $('<li><span class="player-user-turn" id="center-turn'+atm+'"></span></li>');
            var hanInfo2 = $('<li><div class="player-count-info" id="cards-total-'+baseName+atm+'"><span></span></div></li>');
            $("#"+baseName+"-cards" + atm).append(hanInfo1);
            $("#"+baseName+"-cards" + atm).append(hanInfo2);
        }

        var animateCard = setInterval(function () {

            if (currentCard < centerCards.length) {
                if (!isNaN(centerCards[currentCard])) {

                    if (parseInt(centerCards[currentCard]) == -1) {
                        cardName = "60.png";
                    } else {
                        cardName = centerCards[currentCard] + '.png';
                    }
                    if(atm.indexOf('split') > 0  && centerCards[currentCard] == -1){
                        //console.log("no anima la carta")
                    }else{
                        if ($("#cen" + atm + currentCard).length <= 0) {
                            var newCard = $('<li><div id="cen' + atm  + currentCard + '" clas="crad-elemt" /></li>')
                            $("#"+baseName+"-cards" + atm).append(newCard);
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                            $("#cen" + atm + currentCard).show();
                        }
                        else {
                            $("#cen" + atm + currentCard).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                            $("#cen" + atm + currentCard).css('background-size', '100% 100%');
                            $("#cen" + atm + currentCard).css('-moz-background-size', '100% 100%');
                        }
                    }                    
                }
                ++currentCard;

                if (currentCard == centerCards.length) {
                    stopAnimation = true;
                }
                else if ($("#cen" + atm + currentCard).length <= 0 || !$("#cen" + atm + currentCard).is(":visible")) {
                    if (showAnimations) {
                        setTimeout(function () {
                            animateHandCard((baseName + atm), currentCard, (fastPlay?10:300));
                        }, (fastPlay?10:100));
                    }
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (!isGameFinished()) {
                    drawCursorHandTotal(handPosInd);
                }
                else if (totalCC > 21) {
                    /*setTimeout(function () {
                        drawCursorHandTotal(3); //Dealer Hand
                    }, 300);*/
                }

                if (totalCC > 0) {
                    $("#cards-total-"+baseName+ atm +" span").html(totalCC);
                    $("#cards-total-"+baseName + atm).removeClass('busted');
                    if(totalCC > 21){
                        $("#cards-total-"+baseName + atm).addClass('busted');
                    }
                }

                IsAnimatingPlayerCards = false;
                //enableDisableButtons(true);
                //console.log("hasta ahora botones")
            }
        }, (fastPlay?10:300));
    /*}
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }*/
}

/*
* Name: CleanCenterCardsInfo
*/
function cleanCenterCardsInfo(atm, pos) {
    try {
        // if ($("#cen0").is(':visible')) {
            $("#split-"+pos+"-cards" + atm).empty();
            //split-left-cards-atm1-split2

            $("#center-turn"+ atm).hide();

            $("#cards-total-split-center"+ atm +" span").html('');
            $("#cards-total-split-center"+ atm).hide();

            //$('#split-center'+ atm).css('left', IsPortrait()? '27%':'26%');
            //$('#bet-box-center'+ atm).css('left', !$('#bet-box-center').hasClass('disable') ? IsPortrait() ? '39.7%':'41.7%' : '27.5%');
            //$('#btn-chips-bet'+ atm).css('left', IsPortrait()? '10%':'12%');
        // }
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}



/*
* Name: CleanSplitLCardsInfo
*/
function cleanSplitLCardsInfo() {
    try {

        // if ($("#sl0").is(':visible')) {
            $("#split-left-cards").empty();

            $("#left-turn").hide();

            $("#cards-total-split-left span").html('');
            $("#cards-total-split-left").hide();

            //$('#bet-box-left').css('left', '27.5%');
            //$('#btn-chips-bet-left').css('left', '12%');
        // }
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
* Name: DrawSplitRCardsInfo
* Param:    splitRCards = split right cards array
*           totalSR= total split right cards
*/
function drawSplitRCardsInfo(splitRCards, totalSR, isActiveHand, atm) {
    try {
        var currentCard = 0;

        var startLeftMargin = IsPortrait()? 34 :54, finalLeftMargin = IsPortrait()? 34 :54;
        var startResultLeftMargin = IsPortrait()? 8:10, finalResultLeftMargin = IsPortrait()? 8:10;
        var startChipsLeftMargin = 12, finalChipsLeftMargin = 12;
        var startBetBoxLeftMargin = 27.5, finalBetBoxLeftMargin = 27.5;
        var startShadowLeftMargin = 54, finalShadowLeftMargin = 54;

        var handPosInd  = 2;
        if(atm == "-atm1"){
            startLeftMargin = IsPortrait()? 27: 68, finalLeftMargin = IsPortrait()? 27: 68;
            handPosInd  = 6;
        }else if(atm == "-atm3"){
            startLeftMargin = IsPortrait()? 27: -2, finalLeftMargin = IsPortrait()? 27: -2;
            handPosInd  = 9;
        }

        var cardName = "";
        var stopAnimation = false;
        var sleepTimer = 400;
        var sleepTimerAnimation = 0;
        var showAnimations = true;

        if (GameStatus == RECOVERY_GAME) {
            sleepTimer = 0;
            showAnimations = false;
        }

        while ($("#sr" + currentCard + atm).is(":visible")) {
            ++currentCard;
        }

        if (currentCard < splitRCards.length && showAnimations) {
            if (currentCard == 0) { //On Split add the first card
                cardName = splitRCards[currentCard] + '.png';
                var newCard = $('<li><div id="sr' + currentCard + atm + '" clas="crad-elemt"/></li>')
                $("#split-right-cards"+ atm).append(newCard);
                $("#sr" + currentCard+ atm).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                $("#sr" + currentCard+ atm).css('background-size', '100% 100%');
                $("#sr" + currentCard+ atm).css('-moz-background-size', '100% 100%');
                $("#sr" + currentCard+ atm).show();
            }
            else /*if(ActiveHandId != undefined)*/{
                animateHandCard('split-right'+ atm, currentCard, 400);
            }
        }

        /*if(currentCard == splitRCards.length && splitRCards.length > 0){
            finalLeftMargin = splitRCards.length > 3 ? (startLeftMargin - ((splitRCards.length - 3) * 2)) : startLeftMargin;
            $('#split-right'+ atm).css('left', finalLeftMargin + '%');
        }
*/
        var animateCard = setInterval(function () {
            if (currentCard < splitRCards.length) {
                if (!isNaN(splitRCards[currentCard])) {

                    if (parseInt(splitRCards[currentCard]) == -1) {
                        cardName = "60.png";
                    } else {
                        cardName = splitRCards[currentCard] + '.png';
                    }

                    finalLeftMargin = splitRCards.length > 3 ? (startLeftMargin - ((splitRCards.length - 3) * 2)) : startLeftMargin;
                    // finalResultLeftMargin = splitRCards.length > 2 ? (startResultLeftMargin + ((splitRCards.length - 2) * 4.5)) : startResultLeftMargin;
                    finalChipsLeftMargin = splitRCards.length > 3 ? (startChipsLeftMargin + ((splitRCards.length - 3) * 4.3)) : startChipsLeftMargin;
                    finalBetBoxLeftMargin = splitRCards.length > 3 ? (startBetBoxLeftMargin + ((splitRCards.length - 3) * 4.3)) : startBetBoxLeftMargin;
                    finalShadowLeftMargin = splitRCards.length > 2 ? (startShadowLeftMargin + ((splitRCards.length - 2) * 10)) : startShadowLeftMargin;

                    //$('#split-right'+ atm).css('left', finalLeftMargin + '%');
                    $('#hand-result-right-cards'+ atm).css('left', (finalResultLeftMargin + 2 )+ '%');
                    /*$('#btn-chips-bet-right'+ atm).css('left', finalChipsLeftMargin + '%');
                    $('#bet-box-right'+ atm).css('left', finalBetBoxLeftMargin + '%');
                    $("#split-right-cards" + atm +" li.shadow").remove();*/

                    if ($("#sr" + currentCard).length <= 0) {
                        var newCard = $('<li><div id="sr' + currentCard + atm + '" clas="crad-elemt"/></li>')
                        $("#split-right-cards" + atm).append(newCard);
                        $("#sr" + currentCard + atm).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#sr" + currentCard + atm).css('background-size', '100% 100%');
                        $("#sr" + currentCard + atm).css('-moz-background-size', '100% 100%');
                        $("#sr" + currentCard + atm).show();
                    }
                    else {
                        $("#sr" + currentCard+ atm).css('background', 'url(images/Cards/' + cardName + ') no-repeat top left');
                        $("#sr" + currentCard+ atm).css('background-size', '100% 100%');
                        $("#sr" + currentCard+ atm).css('-moz-background-size', '100% 100%');
                    }
                }
                ++currentCard;

                if (currentCard == splitRCards.length) {
                    stopAnimation = true;
                }
                else if ($("#sr" + currentCard+ atm).length <= 0 || !$("#sr" + currentCard+ atm).is(":visible")) {
                    if (showAnimations && isActiveHand) {
                        setTimeout(function () {
                            animateHandCard('split-right'+ atm, currentCard, 400);
                        }, sleepTimerAnimation);
                    }
                }
            }
            else {
                stopAnimation = true;
            }

            if (stopAnimation) {
                clearInterval(animateCard);

                if (isActiveHand) {
                    drawCursorHandTotal(handPosInd);
                }

                if (totalSR > 0) {
                    $("#cards-total-split-right"+ atm+" span").html(totalSR);
                    $("#cards-total-split-right"+ atm).removeClass('busted');
                    if(totalSR > 21){
                        $("#cards-total-split-right"+ atm).addClass('busted');
                    }
                }

                IsAnimatingPlayerCards = false;
                //enableDisableButtons(true);
            }
        }, sleepTimer);
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
* Name: CleanSplitRCardsInfo
*/
function cleanSplitRCardsInfo() {
    try {
        // if ($("#sr0").is(':visible')) {
            $("#split-right-cards").empty();

            $("#right-turn").hide();
            $("#cards-total-split-right span").html('');
            $("#cards-total-split-right").hide();

            /*$('#bet-box-right').css('left', '27.5%');
            $('#btn-chips-bet-right').css('left', '12%');*/
        // }
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
*   Name: DrawInsurance
*   Description: Draw the insurance amount
*/
function drawInsurance(paid_insurance) {
    //try{
        IsAnimatingInsurance = true;
        
        $("#dc0").hide();
        $("#insurance-card-anim").show();
        $("#insurance-card-anim").animate({
            'left': '-='+(IsPortrait()?5:2)+'%',
        }, (fastPlay?1:250), 'linear', function () {
            // Animation complete.

            $("#insurance-card-anim").animate({
                'left': '+='+(IsPortrait()?5:2)+'%',
            }, (fastPlay?1:250), 'linear', function () {
                // Animation complete.

                
                $("#insurance-card-anim").hide();
                $("#insurance-card-anim").removeAttr("style");

                if(isovr == 1){// game is over
                    $("#dc0").css('background', 'url(images/Cards/' + dc1 + '.png) no-repeat top left');
                    $("#dc0").css('background-size', '100% 100%');
                    $("#dc0").css('-moz-background-size', '100% 100%');

                    if (dtot > 0) {
                        $("#cards-total-dealer-cards span").html(dtot);
                        $("#cards-total-dealer-cards").removeClass('busted');
                        $("#cards-total-dealer-cards").css("visibility", "visible");    
                        $("#cards-total-dealer-cards").css('display', 'table');                  
                    }                   
                }

                $("#dc0").show();

                var insHand =0;
                var insChipAniArr = new Array();
                var animateIsuChip = setInterval(function(){

                    if(insHand >= insuranceActions.length){


                        clearInterval(animateIsuChip);
                        animateIsuChip = null
                        var paidIns = 0;    
                        for(var i = 0; i < insChipAniArr.length; i++){
                            var aniArray = insChipAniArr[i];
                            if(aniArray != null){
                                AnimateChipsResult(aniArray[0], null,aniArray[1]);
                                paidIns += aniArray[1];
                            }                            
                        }

                        insuranceActions = new Array();

                        IsAnimatingPlayerCards = IsAnimatingDealerCards =  IsAnimatingInsurance = false;
                        if(isovr == 1){
                            //enableDisableButtons(true);
                            drawHandResult();
                            var totalWon = calculateHandsPaid() + paidIns;
                            drawPaid(totalWon);
                        }else{
                            ActiveHandId = getActiveHand();    
                            drawCursor(ActiveHandId);
                            drawHandOptions(ActiveHandId);
                            //enableDisableButtons(true);
                        }
                        
                        if(isovr == 1){
                            openNewGame();
                            processAutoPopupCashier();
                        } 

                    }else{
                        var inshandArr = insuranceActions[insHand];

                        var handId =  inshandArr[0];
                        var action =  inshandArr[1];
                        var bet =  inshandArr[2];
                        var atm = getAtm(handId);
                        var posChipAni = null;

                        if(atm ==""){
                            posChipAni = 56;
                        }else if(atm == "-atm1"){
                            posChipAni = 57;
                        }else if(atm == "-atm3"){
                            posChipAni = 58;
                        }

                        if(isovr == 1){
                            if(action == EARLY_INSURANCE){                            
                                setVisualBetChips(((bet * paid_insurance) + bet),3,atm);
                                $(".chips-insurance").show();
                                insChipAniArr[insHand] = [posChipAni, ((bet * paid_insurance) + bet)];                        
                            }else{
                                insChipAniArr[insHand] = null;
                            } 
                            
                        }else{
                            if(action == EARLY_INSURANCE){
                                insChipAniArr[insHand] = [posChipAni, (bet * -1)]; 
                            }else{
                                insChipAniArr[insHand] = null;
                            } 
                        }


                        insHand++;  

                    }  

                }, (fastPlay?10:250));


                
            });

        });

        // setTimeout(function () {
            
        // }, 2000);
    /*}
    catch (err) {
        txt = "There was an error on this funtion: DrawInsurance.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }*/
}


/*
* Name: getHandData()
* Param: hanId = hand id
* return: hand Data Array
*/
function getHandData(handId) {
    if (handId == -1) {//hide all
        return null;
    }

    var tempArray2 = 0;

    for (var i = 0; i < HandsDataArray.length; i++) {
        tempArray2 = HandsDataArray[i];
        if (tempArray2 != null && parseInt(tempArray2[0]) == handId) {
            return tempArray2;
        }
    }

    return null;
}

function getAtm(handId) {

        
        if (handId == -1) {//hide all
            return null;
        }

        var tempArray2 = 0;

        for (var i = 0; i < HandsDataArray.length; i++) {
            tempArray2 = HandsDataArray[i];
            if (tempArray2 != null && parseInt(tempArray2[0]) == handId) {
                break;
            }
        }

        var pos = parseInt(tempArray2[7]);

        if (pos == 1) {
            return "-atm1";
        }
        else if (pos == 2) {
            return "";
        }else if (pos == 3) {
            return "-atm3";
        }

}

function drawCursor(handId) {
        
    if (handId == -1) {//hide all

        $(".player-user-turn").hide();
        return;
    }

    var tempArray2 = 0;

    for (var i = 0; i < HandsDataArray.length; i++) {
        tempArray2 = HandsDataArray[i];
        if (tempArray2 != null && tempArray2[0] == handId) {
            break;
        }
    }

    var pos = parseInt(tempArray2[7]);
    var pod = tempArray2[9];

    if (pos == 1 && (pod == null || pod == 1)) {
        
        $(".player-user-turn").hide();
        $("#dealer-turn").hide();
        $("#center-turn-atm1").show();
    }
    else if (pos == 2 && (pod == null || pod == 1)) {
        
        $(".player-user-turn").hide();
        $("#dealer-turn").hide();
        $("#center-turn").show();
    }else if (pos == 3 && (pod == null || pod == 1)) {
        
        $(".player-user-turn").hide();
        $("#dealer-turn").hide();
        $("#center-turn-atm3").show();
    }
    else if (pos == 2 && pod == 2) {  //atm1 split1
        $(".player-user-turn").hide();
        $("#center-turn-atm1-split1").show();
        $("#dealer-turn").hide();
    }else if (pos == 3 && pod == 2) { //atm1 split2
        $(".player-user-turn").hide();
        $("#center-turn-atm1-split2").show();
        $("#dealer-turn").hide();
    }else if (pos == 4  && pod == 2) { // -split1
        $(".player-user-turn").hide();
        $("#center-turn-split1").show();
        $("#dealer-turn").hide();
    }else if (pos == 5 && pod == 2) { // -split1
        $(".player-user-turn").hide();
        $("#center-turn-split2").show();
        $("#dealer-turn").hide();
    }else if (pos == 6 && pod == 2) {  //atm1 split1
        $(".player-user-turn").hide();
        $("#center-turn-atm3-split1").show();
        $("#dealer-turn").hide();
    }else if (pos == 7 && pod == 2) { //atm1 split2
        $(".player-user-turn").hide();
        $("#center-turn-atm3-split2").show();
        $("#dealer-turn").hide();
    }
}

/*
*   Name: drawCursorHandTotal
*   Description: Show turn cursor and the hand total, according to active hand 0 = center, 1 = left, 2 = right
*           
*/
function drawCursorHandTotal(posHand) {

    if (posHand == -1) {//hide all
        $("#cards-total-split-center").css('display', 'table');
        $("#cards-total-split-left").css('display', 'table');
        $("#cards-total-split-right").css('display', 'table');
        $("#cards-total-dealer-cards").css('display', 'table');
        return;
    }  
    else if (posHand == 0) {
        $("#cards-total-split-center").css('display', 'table');
        $("#cards-total-split-center").show();
        $("#cards-total-split-left").hide();
        $("#cards-total-split-right").hide();
        $("#cards-total-dealer-cards").hide();
    }
    else if (posHand == 2) { //center split left        
        $("#cards-total-split-left-split2").css('display', 'table');
        $("#cards-total-split-left-split2").css('visibility', 'visible');
        $("#cards-total-split-left-split2").show();
    }
    else if (posHand == 1) { //center split right
        $("#cards-total-split-right-split1").css('display', 'table');
        $("#cards-total-split-right-split1").css('visibility', 'visible');
        $("#cards-total-split-right-split1").show();    
    }
    else if (posHand == 3) { // dealer
       $("#dealer-turn").css('display', 'table');
       $("#dealer-turn").css('visibility', 'visible');        
    }
    
    else if (posHand == 4) { // atm1 center
       $("#cards-total-split-center-atm1").css('display', 'table');
       $("#cards-total-split-center-atm1").css('visibility', 'visible');        
    }
    else if (posHand == 5) { //atm1 split 1 right
        $("#cards-total-split-right-atm1-split1").css('display', 'table');
        $("#cards-total-split-right-atm1-split1").css('visibility', 'visible');      
    }
    else if (posHand == 6) { //atm1 split 2 left
        $("#cards-total-split-left-atm1-split2").css('display', 'table');
        $("#cards-total-split-left-atm1-split2").css('visibility', 'visible');      
    }
    else if (posHand == 7) { // atm3 center
        $("#cards-total-split-center-atm3").css('display', 'table');
    }
    else if (posHand == 8) { //atm3 split 1 right
        $("#cards-total-split-right-atm3-split1").css('display', 'table');
        $("#cards-total-split-right-atm3-split1").css('visibility', 'visible');
    }
    else if (posHand == 9) {  //atm3 split 2 left
        $("#cards-total-split-left-atm3-split2").css('display', 'table');
        $("#cards-total-split-left-atm3-split2").css('visibility', 'visible');
    }
}

function getAtmHandPosition(handArray){

    var atm = null;
    if(handArray != null && handArray[7] != null && !isNaN(handArray[7])){
        var pos = parseInt(handArray[7]);
        var pod = handArray[9];
        pod = typeof(pod) == "undefined"?null:pod;

        switch(pos){
            case 1: atm = "-atm1"; break;
            case 2: if(pod == null || pod == 1)
                        atm =  "";
                    else if(pod == 2)
                        atm =  "-atm1-split1";        
                    ; break;
            case 3: if(pod == null || pod == 1)
                        atm = "-atm3";
                    else if(pod == 2)
                        atm =  "-atm1-split2";        
                    ; break;
            case 4: atm =  "-split1";        
                    ; break;
            case 5: atm =  "-split2";        
                    ; break;
            case 6: atm =  "-atm3-split1";        
                    ; break;
            case 7: atm =  "-atm3-split2";        
                    ; break;
        }        
    }
    return atm;
}

function getAtmPonPod(pon, pod){
    var atm = null;
    switch(pon){
        case 1: atm = "-atm1"; break;
        case 2: 
                if(pod == null || pod == 1){
                    atm =  "";
                }                    
                else if(pod == 2)
                    atm =  "-atm1-split1";        
                ; break;
        case 3: if(pod == null || pod == 1)
                    atm = "-atm3";
                else if(pod == 2)
                    atm =  "-atm1-split2";        
                ; break;
        case 4: atm =  "-split1";        
                ; break;
        case 5: atm =  "-split2";        
                ; break;
        case 6: atm =  "-atm3-split1";        
                ; break;
        case 7: atm =  "-atm3-split2";        
                ; break;
    }
    return atm;
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}


function drawAllCardsDeal(fromResize) {

    IsAnimatingPlayerCards = IsAnimatingDealerCards = true;
    enableDisableButtons(false);

    var tempArray;
    var playerCards;
    var userTotalCount = 0;
    var handBet = 0;

    ActiveHandId = getActiveHand();

    var totalHands = HandsDataArray.length;
    var currentHand = 0;
    var currentCard = 1;

    //for (var i = 0; i < HandsDataArray.length; i++) {
    var mainLoopId = setInterval(function(){
        //tempArray = HandsDataArray[i];
        tempArray = HandsDataArray[currentHand];

        //console.log("tempArray, currentHand ", tempArray, currentHand)
        if (tempArray != null) {
            playerCards = "";
            handBet = tempArray[5];

            if (tempArray[currentCard] != null && tempArray[currentCard].length < 1) {
                playerCards = -1 ;
            }
            else {
                playerCards = tempArray[currentCard] ;
            }

            userTotalCount = tempArray[3];

            var atm = getAtmHandPosition(tempArray);

            if(atm.indexOf("split") < 0){

                drawCenterOneCardInfo(playerCards, userTotalCount, atm, currentCard);
                if (handBet == 0) {
                    handBet = CustomerMainBet;
                } else {
                    CustomerMainBet = handBet;
                }
                //setVisualBetChips(parseFloat(handBet), 0, atm); 
            }
            currentHand++;
        }//if
        else{
            //Dealer cards section
            var dealerCards = "";

            if(currentCard == 1){
                if (dc1 == "" || dc1 == null || dc1.length < 1)
                    dealerCards = -1; 
                else
                    dealerCards = dc1; 
                           
            }else{
                if (dc2 == "" || dc2 == null || dc2.length < 1)
                    dealerCards = -1; 
                else
                    dealerCards = dc2;                 
            }


            drawDealerOneCardInfo(dealerCards, dtot, fromResize, currentCard);

            currentHand =0;
            currentCard++;

            if(currentCard > 2){
                clearInterval(mainLoopId);
                mainLoopId = null;
                

                IsAnimatingPlayerCards = IsAnimatingDealerCards = false;
                if (isovr != null && isovr.length > 0 && parseInt(isovr) == 1) {
                    //openNewGame(false);
                } else{
                    ActiveHandId = getActiveHand();
                    drawCursor(ActiveHandId);
                    drawHandOptions(ActiveHandId);
                } 
            }//if
        }                
        
    }, (fastPlay?10:500));//}//for      


}


/*
*   Name: DrawAllCards
*   Description: Call all methods to drwa dealer and user cards
*           
*/
function drawAllCardsStand(fromResize, hanUpdated) {

    IsAnimatingPlayerCards = IsAnimatingDealerCards = true;
    enableDisableButtons(false);

    var tempArray;
    var playerCards;
    var userTotalCount = 0;
    var handBet = 0;

    ActiveHandId = getActiveHand();

    //Dealer cards section
    var dealerCards = "";
    if (dc1 == "" || dc1 == null || dc1.length < 1) {
        dc1 = -1;
    }
    dealerCards = dc1 + "," + dc2;
    if (dex != null && dex.length > 0) {
        dealerCards += "," + dex;
    }

    //console.log("dealerCards.split(",")[1]", dealerCards.split(",")[1], dealerCards.split(",")); 
    if(dealerCards.split(",")[0] != "-1"){
        setTimeout(function(){
            drawDealerCardsInfo(dealerCards.split(","), dtot, fromResize);
        }, (fastPlay?10:100));
    }


    drawCursor(ActiveHandId);

    IsAnimatingPlayerCards = IsAnimatingDealerCards = false;
    drawHandOptions(ActiveHandId);
    
    //enableDisableButtons(true);    

}


/*
*   Name: drawAllCardsRecovery
*   Description: Call all methods to drwa dealer and user cards
*           
*/
function drawAllCardsRecovery(fromResize) {

    IsAnimatingPlayerCards = IsAnimatingDealerCards = true;
    enableDisableButtons(false);

    var tempArray;
    var playerCards;
    var userTotalCount = 0;
    var handBet = 0;

    ActiveHandId = getActiveHand();

    var totalHands = HandsDataArray.length;
    var currentHand = 0;
    //for (var i = 0; i < HandsDataArray.length; i++) {
    var mainLoopId = setInterval(function(){
        //tempArray = HandsDataArray[i];
        tempArray = HandsDataArray[currentHand];
        if (tempArray != null) {
            playerCards = "";
            handBet = tempArray[5];

            if (tempArray[1] != null && tempArray[1].length < 1) {
                playerCards += -1 + ",";
            }
            else {
                playerCards += tempArray[1] + ",";
            }

            if (tempArray[2] != null && tempArray[2].length < 1) {
                playerCards += -1;
            }
            else {
                playerCards += tempArray[2];
            }

            if (tempArray[10] != "" && tempArray[10] != null && tempArray[10].length > 0) {
                playerCards += "," + tempArray[10];
            }
            userTotalCount = tempArray[3];

            var atm = getAtmHandPosition(tempArray);

            //if(atm.indexOf("split") < 0){
                //console.log("si es split atm", atm)
                drawCenterCardsInfoRecovery(playerCards.split(","), userTotalCount, atm);
                if (handBet == 0) {
                    handBet = CustomerMainBet;
                } else {
                    CustomerMainBet = handBet;
                }
            //}
            //sleep(1000);
            currentHand++;
        }//if
        else{
            clearInterval(mainLoopId);
            mainLoopId = null;

            //Dealer cards section
            var dealerCards = "";
            if (dc1 == "" || dc1 == null || dc1.length < 1) {
                dc1 = -1;
            }
            dealerCards = dc1 + "," + dc2;
            if (dex != null && dex.length > 0) {
                dealerCards += "," + dex;
            }

            if(dealerCards.split(",")[1] != 'null'){
                setTimeout(function(){
                    drawDealerCardsInfoRecovery(dealerCards.split(","), dtot, fromResize);
                }, (10));
            }
            ActiveHandId = getActiveHand();
            drawCursor(ActiveHandId);
            IsAnimatingDealerCards = false; 
            IsAnimatingPlayerCards = false; 
            drawHandOptions(ActiveHandId);
            

        }
    }, (10));//}//for
}


/*
*   Name: drawAllCardsSplit
*   Description: Call all methods to drwa dealer and user cards
*           
*/

function drawAllCardsSplit(fromResize, handId1, handId2) {

    IsAnimatingPlayerCards = IsAnimatingDealerCards = true;
    enableDisableButtons(false);

    var tempArray;
    var arrayH1 = null;
    var arrayH2 = null;
    var playerCards;
    var userTotalCount = 0;
    var handBet = 0;

    ActiveHandId = getActiveHand();

    var totalHands = HandsDataArray.length;
    var currentHand = 0;
    var currentCard = 1;

    for (var i = 0; i < HandsDataArray.length; i++) {
        tempArray = HandsDataArray[i];

        if(tempArray[0] == handId1){
            arrayH1 = tempArray;
        }else if(tempArray[0] == handId2){
            arrayH2 = tempArray;
        }

    }
    ActiveHandId = getActiveHand();
    var atm1 = getAtmHandPosition(arrayH1);
    var atm2 = getAtmHandPosition(arrayH2);


    drawCenterOneCardInfoSplit(arrayH1[1], parseInt(arrayH1[3]), atm1, 1);
    drawCenterOneCardInfoSplit(arrayH2[1], parseInt(arrayH2[3]), atm2, 1);    

    setTimeout(function(){
        drawCenterOneCardInfoSplit(arrayH1[2], parseInt(arrayH1[3]), atm1, 2); 
        drawCursorHandTotal(ActiveHandId);

        if(typeof(arrayH2[2]) != "undefined" && arrayH2[2] != null && arrayH2[2] != "" && arrayH2[2] != "-1" && arrayH2[2] != -1)
            drawCenterOneCardInfoSplit(arrayH2[2], parseInt(arrayH2[3]), atm2, 2);
        else
            drawCenterOneCardInfoSplit(-1, parseInt(arrayH2[3]), atm2, 2);

        drawCursor(ActiveHandId);
        IsAnimatingPlayerCards = IsAnimatingDealerCards = false;

        if (!isGameFinished()) {
            
            drawHandOptions(ActiveHandId);

        }else{

            var dealerCards = "";
            if (dc1 == "" || dc1 == null || dc1.length < 1) {
                dc1 = -1;
            }
            dealerCards = dc1 + "," + dc2;
            if (dex != null && dex.length > 0) {
                dealerCards += "," + dex;
            }

            if(dealerCards.split(",")[1] != 'null'){
                setTimeout(function(){
                    drawDealerCardsInfo(dealerCards.split(","), dtot, fromResize);

                    drawCursor(-1);
                    

                }, (fastPlay?10:100));
            }
        }

    },(fastPlay?10:500));
}

function drawAllCards(fromResize) {

    IsAnimatingPlayerCards = IsAnimatingDealerCards = true;
    enableDisableButtons(false);

    ActiveHandId = getActiveHand();

    var totalHands = HandsDataArray.length;
    var currentHand = 0;

    if(typeof(ActiveHandId) == "undefined" || ActiveHandId == null){
        var pendingCheck = HandsDataArray[HandsDataArray.length-1];
        if(LastActiveHandId != pendingCheck[0]){
            LastActiveHandId = pendingCheck[0];
        }
    }
    auxDrawAllCards(fromResize, 0);

}

function auxDrawAllCards(fromResize, _currentHand){
    var tempArray;
    var playerCards;
    var userTotalCount = 0;
    var handBet = 0;
    var currentHand = _currentHand;
    tempArray = HandsDataArray[currentHand];
    if (tempArray != null) {
        playerCards = "";
        handBet = tempArray[5];
        var tempHandId = tempArray[0];

        if(tempHandId == ActiveHandId || tempHandId == LastActiveHandId){
            if (tempArray[1] != null && tempArray[1].length < 1) {
                playerCards += -1 + ",";
            }
            else {
                playerCards += tempArray[1] + ",";
            }

            if (tempArray[2] != null && tempArray[2].length < 1) {
                playerCards += -1;
            }
            else {
                playerCards += tempArray[2];
            }

            if (tempArray[10] != "" && tempArray[10] != null && tempArray[10].length > 0) {
                playerCards += "," + tempArray[10];
            }
            userTotalCount = tempArray[3];

            var atm = getAtmHandPosition(tempArray);

            drawCenterCardsInfo(playerCards.split(","), userTotalCount, atm);
            if (handBet == 0) {
                handBet = CustomerMainBet;
            } else {
                CustomerMainBet = handBet;
            }
            var tempCallTM = setTimeout(function(){
                    clearTimeout(tempCallTM);
                    tempCallTM = null;
                    currentHand++;
                    auxDrawAllCards(fromResize, currentHand);
                },(fastPlay?10:300))

        }else{
            currentHand++;   
            auxDrawAllCards(fromResize, currentHand); 
        }
        
    }//if
    else{
        //Dealer cards section
        var dealerCards = "";
        if (dc1 == "" || dc1 == null || dc1.length < 1) {
            dc1 = -1;
        }
        dealerCards = dc1 + "," + dc2;
        if (dex != null && dex.length > 0) {
            dealerCards += "," + dex;
        }

        if(dealerCards.split(",")[1] != 'null'){
            setTimeout(function(){
                drawDealerCardsInfo(dealerCards.split(","), dtot, fromResize);

                if(!isGameFinished()){
                   ActiveHandId = getActiveHand();
                    drawCursor(ActiveHandId);
                    
                    IsAnimatingDealerCards = false; 
                    IsAnimatingPlayerCards = false; 
                    drawHandOptions(ActiveHandId); 
                }else{
                    IsAnimatingPlayerCards = false; 
                    drawCursor(-1);
                }
                

            }, (fastPlay?10:100));
        }

    }
}

/*
*   Name:   GetActiveHand
*   return: HandId
null for error
*/
function getActiveHand() {
    try {
        var returnId = null;
        for (var i = 0; i < HandsDataArray.length; i++) { //primero valida los splits
            var tempArray = HandsDataArray[i];
            var pod = tempArray[9];
            if (parseInt(tempArray[4]) > 0 && parseInt(tempArray[4]) != 8 && (typeof(pod)!="undefined" && pod != null && pod ==2)) { 
                returnId = tempArray[0];
                return returnId;
            }
        }

        for (var i = 0; i < HandsDataArray.length; i++) {
            var tempArray = HandsDataArray[i];
            var pod = tempArray[9];
            if (parseInt(tempArray[4]) > 0 && parseInt(tempArray[4]) != 8) { 
                returnId = tempArray[0];
                return returnId;
            }
        }
    }
    catch (err) {
        txt = "There was an error on this function GetActiveHand.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


/*
* Name: DrawHandOptions
* Param: handId = hand id
*/
function drawHandOptions(handId) {

    setTimeout(function(){
        if (handId != null) {
            //Options
            var tempArray2 = new Array();
            var options = 0;
            //user cards section
            for (var i = 0; i < HandsDataArray.length; i++) {
                tempArray2 = HandsDataArray[i];
                if (tempArray2 != null && tempArray2[0] == handId) {
                    options = tempArray2[4];
                    var pod = tempArray2[9];
                    drawButtonsByOptions(options, pod);

                    GameStatus = PLAYING_GAME;

                    var atm = getAtmHandPosition(tempArray2);
                    var pos = parseInt(tempArray2[7]);


                    break;
                }
            }
            //enableDisableButtons(true); 
        }
    }, (fastPlay?0:200));  
}


/*
* Name: highlightActiveHand
* Param: handId = hand id
*/
function highlightActiveHand(handId) {
    try {
        if (handId != null) {
            //Options
            var tempArray2 = 0;
 
            for (var i = 0; i < HandsDataArray.length; i++) {
                tempArray2 = HandsDataArray[i];
                if (tempArray2 != null && tempArray2[0] == handId) {
                    break;
                }
            }
            //console.log("highlightActiveHand tempArray2", tempArray2);
            var atm = getAtmHandPosition(tempArray2);
            var pos = parseInt(tempArray2[7]);

            //no splits
            if(pos < 4){
                var eleId = "split-center" + atm;
                $("#"+eleId).css('transform', 'scale(0.75)');
            }
        }
    } catch (err) {
        txt = "There was an error on this function highlightActiveHand.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


/*
*  Name: CleanData
*/
function cleanData() {
    HandsDataArray = new Array();
    UpdateDataArray = new Array();
    PartialHandDataArray = new Array();
    HandPosition = new Array(3);
    bal = null;
    isrec = null;
    dc1 = null;
    dc2 = null;
    dex = null;
    dtot = null;
    hnds = null;
    upds = null;
    errorCode = null;
    iserr = null;
}

function getWinBoxSize(handData){
    //handData = ["1333", "28", "41", "23", "0", "5.00", "-5.00", "1", "0.00", null, "3,42,3,24", null, null]
    //c1 = handData [1]
    //c2 = handData [2]
    //cextra= handData[10] //"3,42,3,24"

    var size = "";

    if(typeof(handData) != "undefined" && handData != null && handData.length > 0){

        var totalCards  = 0;

        if(handData[1] != null){
            totalCards++;
        }
        if(handData[2] != null){
            totalCards++;
        }

        if(handData[10] != null && handData[10] != ""){
            var array = handData[10].split(',');

            if(array != null){
                totalCards+=array.length;
            }
        }

        size =  (25 + ((totalCards - 2) * 7)) + "%";
    }

    return size;

}

/*
*  Name: DrawHandResult
*/
function drawHandResult() {
    try {
        var handPos = null;
        var handRes = null;
        var handBet = null;
        var handPod = null;
        var paidTotal = 0;
        
        for (var j = 0; j < HandsDataArray.length; j++) {
            var tempArray = HandsDataArray[j]

            if (tempArray != null && tempArray[0] != null && tempArray[0] != undefined) {
                handPos = tempArray[7];//getHandPosition(tempArray[0]);
                handRes = parseFloat(tempArray[6]);
                handBet = parseFloat(tempArray[5]);
                handPod = tempArray[9];

                if (handRes != null && handPos != null && handBet != null) {

                    var amt = getAtmHandPosition(tempArray);
                    var won = (handBet + handRes);
                    if(won > 0)
                        setVisualBetChips(won,0,amt);

                    AnimateChipsResult(parseInt(handPos),handPod, won);
                }
            }
        }

        var totalWon = calculateHandsPaid();        

    
        if(totalWon > 0){
            drawPaid(totalWon);
            UpdateVisualBalance(Global.Connector.bal);
            
            if(!fastPlay){
                SoundManager.StopAudio("fastpayout", GameSounds["fastpayout"]);
                GameSounds["fastpayout"] = SoundManager.PlayAudio("fastpayout", false);  

                $("#credits-val").addClass("blink-text");
                setTimeout(function(){
                    $("#credits-val").removeClass("blink-text");
                    try{
                        SoundManager.StopAudio("fastpayout", GameSounds["fastpayout"]);
                    }catch(er){}
                },1000);
            }
            

        }else{
            //console.log("reset 1")
            $("#total-win-val").html('--');

        }
        //animate chips
        PlayerBet = 0;
        totalWON = 0;

        processAutoPopupCashier();

        if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
            startGetInfoMessage();  
        }


    } catch (err) {
        txt = "There was an error on this function DrawHandResult.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return 0;
    }
}

/*
* Name: getHandPositionByAtm()
* Param: atm = atm

*/
function getHandPositionByAtm(atm) {
    var handIndexScreen = null 
    switch(atm){
            case "": handIndexScreen = 0; break;
            case "-split1": handIndexScreen = 1; break;
            case "-split2": handIndexScreen = 2; break;
            case "-atm1": handIndexScreen = 4; break;
            case "-atm1-split1": handIndexScreen = 5; break;
            case "-atm1-split2": handIndexScreen = 6; break;
            case "-atm3": handIndexScreen = 7; break;
            case "-atm3-split1": handIndexScreen = 8; break;
            case "-atm3-split2": handIndexScreen = 9; break;
        } 
    return handIndexScreen;
}




/************************************************************/
/************************************************************/
/* ERROR: FUNCTIONS FOR MANAGE ERRORS ON DB                 */
/************************************************************/
/************************************************************/
/*
*  Error ocurred on Deal Action
*/
function errorOnDeal() {
    try {
        IsCallingServer = false;
        enableDisableButtons(true);
        CustomerLastBet = new Array(),
        GameStatus = NEW_GAME;
        $("#btn-chips-bet,#chips-bet,#bet-box-center"/*,#chip1,#chip2,#chip3,#chip4"*/).removeClass('disable');
        $("#chips-block").removeClass('disable');
        $("#btn-lobby,#chips-selector").show();
        $("#bet-box-center").css('left', '41.7%');        
    }
    catch (err) {
        txt = "There was an error on this function errorOnDB.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
*   Name:   GetNumCardsHand
*   Param:  hid= hand id
*   return: int= represents the number of cards
*/
function getNumCardsHand(hid) {
    try {
        var valReturn = 0;
        for (var i = 0; i < HandsDataArray.length; i++) {
            var tempArray = HandsDataArray[i];
            if (tempArray[0] == hid) {
                if (tempArray[1] != null && tempArray[1].length > 0) {
                    valReturn++;
                }
                if (tempArray[2] != null && tempArray[2].length > 0) {
                    valReturn++;
                }
                if (tempArray[10] != null && tempArray[10].length > 0) {
                    var temExtra = tempArray[10].split(",");
                    valReturn += temExtra.length;
                }
                return valReturn;
            }
        }
    }
    catch (err) {
        txt = "There was an error on this function GetNumCardsHand.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return 0;
    }
}

function cleanAllScreen() {

    if(PlayerBet != null && PlayerBet != "" && PlayerBet > 0){
        Global.Connector.bal +=PlayerBet;
        UpdateVisualBalance(Global.Connector.bal);
    }
    

    CustomerMainBet = 0;
    PlayerBet = 0;

    var iteratorBets = Object.keys(BetArray);
    BetArray = new Array();
    for (let key of iteratorBets) {
        BetArray[key] = 0;
        //console.log("key0", key)         
    }

    cleanDealerCardsInfo();
    cleanCenterCardsInfo('', 'center');
    cleanCenterCardsInfo('-atm1', 'center');
    cleanCenterCardsInfo('-atm3', 'center');
    cleanCenterCardsInfo('-split1', 'right');
    cleanCenterCardsInfo('-split2', 'left');
    cleanCenterCardsInfo('-atm1-split1', 'right');
    cleanCenterCardsInfo('-atm1-split2', 'left');
    cleanCenterCardsInfo('-atm3-split1', 'right');
    cleanCenterCardsInfo('-atm3-split2', 'left');


    cleanBetChips(0);
    cleanBetChips(1);
    cleanBetChips(2);
    cleanBetChips(3);
    cleanBetChips(4);
    cleanBetChips(5);
    cleanBetChips(6);
    cleanBetChips(7);
    cleanBetChips(8);
    cleanBetChips(9);
    cleanBetChips(10);
    cleanBetChips(11);
    cleanBetChips(12);

    displayHideHandResult(0, '', false,0,'');
    displayHideHandResult(1, '', false,0,'');
    displayHideHandResult(2, '', false,0,'');
    displayHideHandResult(3, '', false,0,'');

    displayHideHandResult(0, '', false,0,'-atm1');
    displayHideHandResult(1, '', false,0,'-atm1');
    displayHideHandResult(2, '', false,0,'-atm1');
    displayHideHandResult(3, '', false,0,'-atm1');

    displayHideHandResult(0, '', false,0,'-atm3');
    displayHideHandResult(1, '', false,0,'-atm3');
    displayHideHandResult(2, '', false,0,'-atm3');
    displayHideHandResult(3, '', false,0,'-atm3');

    HandsDataArray = new Array();

    //HandsDataArray[0] = null;
    //HandsDataArray[1] = null;
    //HandsDataArray[2] = null;
    
    drawCursorHandTotal(-1);

    $("#total-win-val").html('--');
    UpdateVisualTotalBet();

}

function drawPaid(paidAmt){
    if(paidAmt <= 0)
        $("#total-win-val").html('--');
    else
        $("#total-win-val").html(formatWithThousandsNoDecimalZeros(paidAmt));
}

function calculateHandsPaid(){
    var handsPaid  =0;
    for(var i =0 ; i < HandsDataArray.length; i++){
        var tempHand = HandsDataArray[i];
        handsPaid+= (parseFloat(tempHand[5]) + parseFloat(tempHand[6]));
    }
    return handsPaid;
}

function cleanAllScreenNoData() {
    try {
        // CustomerMainBet = 0;
        cleanBetChips(0);
        cleanBetChips(1);
        cleanBetChips(2);
        cleanBetChips(3);

        cleanDealerCardsInfo();
        cleanCenterCardsInfo();
        cleanSplitLCardsInfo();
        cleanSplitRCardsInfo();
        
        drawCursorHandTotal(-1);
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
* Name: DisplayHideHandResult
* Param: pos: Hand result position (0 = center, 1= split Left, 2 = split Right)
*/
function displayHideHandResult(pos, message, show, size,atm) {
    try {
        var divName = "";

        switch (pos) {
            case 0: divName = "#hand-result-center-cards" +atm; break;
            case 2: divName = "#hand-result-left-cards"+atm; break;
            case 1: divName = "#hand-result-right-cards"+atm; break;
            case 3: divName = "#hand-result-insurance-center"+atm; break;
        }
        if (show) {
            $(divName).html(message);
            $(divName).fadeIn((fastPlay?100: 500));
            if(typeof(size) != "undefined")
                $(divName).css("width", size);
        }
        else {
            $(divName).hide();
        }
    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


/*
* Name: DisplayHideHandResult
* Param: pos: Hand result position (0 = center, 1= split Left, 2 = split Right)

            case "": handIndexScreen = 0; break;
            case "-split1": handIndexScreen = 1; break;
            case "-split2": handIndexScreen = 2; break;
            case "-atm1": handIndexScreen = 4; break;
            case "-atm1-split1": handIndexScreen = 5; break;
            case "-atm1-split2": handIndexScreen = 6; break;
            case "-atm3": handIndexScreen = 7; break;
            case "-atm3-split1": handIndexScreen = 8; break;
            case "-atm3-split2": handIndexScreen = 9; break;


*/
function AnimateChipsResult(pos, pod2, amount) {
    try {
        var divName = "";
        var leftTemp= "-=0";
        var topTemp= "-=0";
        var pod = typeof(pod2) == "undefined"? null: pod2;

        switch (pos) {
            case 1: divName = "#chips-bet-atm1"; 
                    if(amount <= 0){
                        leftTemp= "-=1000";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=2050";
                        topTemp= "+=575";
                    }
                    ;
                    break; //atm1
            case 2: 
                    if(pod == null || pod ==1){
                        divName = "#chips-bet";
                        if(amount <= 0){
                            leftTemp= "-=0";
                            topTemp= "-=1500";
                        }else{
                            leftTemp= "-=1020";
                            topTemp= "+=440";
                            if(isMobile.any()){
                                leftTemp= "-=1280";
                            }
                        }
                        
                    }else {
                        divName = "#chips-bet-atm1-split1"; 
                        if(amount <= 0){
                            leftTemp= "-=1000";
                            topTemp= "-=1500";
                        }else{
                            leftTemp= "-=1970";
                            topTemp= "+=480";
                        } 
                    }
                    break; //atm1 split 1
            case 3: 
                    if(pod == null || pod ==1){
                        divName = "#chips-bet-atm3";
                        if(amount <= 0){
                            leftTemp= "+=1000";
                            topTemp= "-=1500";
                        }else{
                            leftTemp= "-=50";
                            topTemp= "+=580";
                        }
                    }else {
                        divName = "#chips-bet-atm1-split2"; 
                        if(amount <= 0){
                            leftTemp= "-=1000";
                            topTemp= "-=1500";
                        }else{
                            leftTemp= "-=1790";
                            topTemp= "+=820";
                        }
                        ;
                        
                    }
                    break; //atm1 split 2                   

            case 4: divName = "#chips-bet-split1";
                    if(amount <= 0){
                        leftTemp= "-=0";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=1620";
                        topTemp= "+=460";
                        
                        if(isMobile.any()){
                            leftTemp= "-=1920";
                        }
                    }
                    break; //center split1

            case 5: divName = "#chips-bet-split2";
                    if(amount <= 0){
                        leftTemp= "-=0";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=700";
                        topTemp= "+=465";

                        if(isMobile.any()){
                            leftTemp= "-=1000";
                        }
                    }
                    break; //center split2

            case 6: divName = "#chips-bet-atm3-split1"; 
                    if(amount <= 0){
                        leftTemp= "+=500";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=480";
                        topTemp= "+=485";
                    } 
                    break; //center split1

            case 7: divName = "#chips-bet-atm3-split2"; 
                        if(amount <= 0){
                            leftTemp= "+=1500";
                            topTemp= "-=1500";
                        }else{
                            leftTemp= "-=150";
                            topTemp= "+=852";
                        }
                        ;
                    break;
            
            case 56: divName = "#chips-insurance" //chips-insurance-atm1
                    if(amount <= 0){
                        leftTemp= "-=0";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=1320";
                        topTemp= "+=450";
                        if(isMobile.any()){
                            leftTemp= "-=1550";
                        }
                    }
                    ; break;
            case 57: divName = "#chips-insurance-atm1" //chips-insurance-atm1
                    if(amount <= 0){
                        leftTemp= "-=1000";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=2350";
                        topTemp= "+=575";
                    }
                    ; break;
            case 58: divName = "#chips-insurance-atm3" //chips-insurance-atm1
                    if(amount <= 0){
                        leftTemp= "+=1000";
                        topTemp= "-=1500";
                    }else{
                        leftTemp= "-=350";
                        topTemp= "+=580";
                    }
                    ; break;
        }

       /* $("#buttons-panel-left").hide();
        $("#buttons-panel-right").hide();*/
        if (amount <= 0) {
            
            $( divName ).animate({
                top: topTemp,
                left: leftTemp,
              }, (fastPlay?10: 700), function() {
               /* $("#buttons-panel-left").show();
                $("#buttons-panel-right").show();*/
            });
        }
        else {
            $( divName ).animate({
                top: topTemp,
                left: leftTemp,
              }, (fastPlay?10: 700), function() {
               /* $("#buttons-panel-left").show();
                $("#buttons-panel-right").show();*/
            });
        }
            
    }
    catch (err) {
        txt = "There was an error on this page AnimateChipsResult.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/*
* Name: DisplayHideHandResult
* Param: pos: Hand result position (0 = center, 1= split Left, 2 = split Right)
*/
function ResetChipsResult() {
    try {
        $("#chips-bet").css("top", '72%');


        $("#chips-bet-atm1").css("top", '72%');
        $("#chips-bet-atm3").css("top", '72%');

        $("#chips-bet").css("left", '60px');
        $("#chips-bet-atm1").css("left", '60px');
        $("#chips-bet-atm3").css("left", '60px');

        $("#chips-bet-split1").css("top", '72%');
        $("#chips-bet-split2").css("top", '72%');
        $("#chips-bet-split1").css("left", '15%');
        $("#chips-bet-split2").css("left", '15%');

        $("#chips-bet-atm1-split1").css("top", '72%');
        $("#chips-bet-atm1-split2").css("top", '72%');
        $("#chips-bet-atm1-split1").css("left", '15%');
        $("#chips-bet-atm1-split2").css("left", '15%');

        $("#chips-bet-atm3-split1").css("top", '72%');
        $("#chips-bet-atm3-split2").css("top", '72%');
        $("#chips-bet-atm3-split1").css("left", '15%');
        $("#chips-bet-atm3-split2").css("left", '15%');

        $("#chips-insurance").css("top", '56%');
        $("#chips-insurance-atm1").css("top", '56%');
        $("#chips-insurance-atm3").css("top", '56%');

        $("#chips-insurance").css("left", '100%');
        $("#chips-insurance-atm1").css("left", '100%');
        $("#chips-insurance-atm3").css("left", '100%');

    }
    catch (err) {
        txt = "There was an error on this page ResetChipsResult.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

function validateTotalBet(newBet){

    var tempTotalBet = newBet;//PlayerBet + newBet;

    if(tempTotalBet > Global.Connector.bal){
        processLowCredits();
        return false; 
    }

    if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
        if(tempTotalBet > Global.Connector.availableBalance){
            showInfoMessage(decodeURIComponent(Global.Connector.blockNote));
            return false; 
        }
    }

    if(tempTotalBet > Global.Connector.maxb){
        var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
        //showInfoMessage("Your max bet is " + formatWithThousandsNoDecimalZeros(Global.Connector.maxb));
        showInfoMessage(maxBetMsg);
        return false; 
    }

    if(tempTotalBet > Global.Connector.maxb){
        var minBetMsg = LanguagesManager.getTranslationByKey('MinBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
        //showInfoMessage("Your min bet is " + formatWithThousandsNoDecimalZeros(Global.Connector.minb));
        showInfoMessage(minBetMsg);
        return false; 
    }

    if((tempTotalBet) <= 0)
        return false;

    return true;

}

/*
*   Name: OpenRecoveryGame
*/
function openRecoveryGame() {
    //try {
        $("#bet-box-center").addClass('disable');
        $("#chips-bet").addClass('disable');
        $("#chips-block").addClass('disable');

        Splits = 0;
        cleanAllScreenNoData();
        GameStatus = RECOVERY_GAME;

        //draw cards
        drawAllCardsRecovery(false);
       
        $("#place-bet-text").hide();
        $("#place-bet-text-right").hide();
        $("#place-bet-text-left").hide();

        if (ActiveHandId != null) {
            //Options
            var tempArray2 = new Array();
            var options = 0;
            var pod = null;
            //user cards section

            for (var i = 0; i < HandsDataArray.length; i++) {
                if (HandsDataArray != null && HandsDataArray[i] != null) {
                    tempArray2 = HandsDataArray[i];

                    var atm = getAtmHandPosition(tempArray2);
                    var handPosInd = getHandPositionByAtm(atm);

                    //drawCursorHandTotal(handPosInd);
                    

                    if (tempArray2[0] == ActiveHandId) {
                        options = tempArray2[4];
                        pod = tempArray2[9];
                    }

                    var handBet = tempArray2[5];
                    BetArray["bet" + atm] = handBet;

                    setVisualBetChips(handBet,0, atm);

                    if(typeof(handBet) != "undefined" && handBet != null && (isNaN(parseFloat(handBet)) == false)){
                        PlayerBet += parseFloat(handBet);
                        UpdateVisualTotalBet();
                    }

                    GameStatus = PLAYING_GAME;
                }
            }

            ActiveHandId = getActiveHand();
            drawCursor(ActiveHandId);
            IsAnimatingDealerCards = false; 
            IsAnimatingPlayerCards = false; 
            drawButtonsByOptions(options,pod);

        }
    /*}
    catch (err) {
        txt = "There was an error on this function OpenRecoveryGame.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }*/
}


function getC2Hand(handId){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            return tempArr[2]
        }
    };
    return null;
}

function getPONHand(handId){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            return tempArr[7]
        }
    };
    return null;
}

function getPODHand(handId){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            return tempArr[9]
        }
    };
    return null;
}

function getBetHand(handId){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            return tempArr[5]
        }
    };
    return null;
}

function getBetTotal(handId){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            return tempArr[3]
        }
    };
    return null;
}

function setPONHand(handId, newPon){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            HandsDataArray[i][7] =  newPon;
        }
    };
}

function setPODHand(handId,newPod){
    for (var i = 0; i < HandsDataArray.length; i++) {
        var tempArr = HandsDataArray[i];
        if(tempArr[0] == handId){
            HandsDataArray[i][9] =  newPod;
        }
    };
}

function getMultiplier(number){
    var mul = 1;

    while(((number * mul) - Math.floor((number * mul)) != 0) || mul > 50){
        mul++;
    }

    if(mul > 50)
        mul = 1;

    return mul;

}

