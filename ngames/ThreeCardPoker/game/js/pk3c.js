//../Slots/src/SL5RTest/index.html

Global.Connector.rootLevel = "../../../aspNet/";
var payoutURL = "../../pays/Stage1.aspx?stylesheet=Stage1-fmt2";
var fastPlay = false;

var autoShowCashierInterval = null;

function updateGameAfterCashierBuyIn(){
    Global.Connector.bal = Global.ChipTransfer.gameBalance;
    UpdateVisualBalance(Global.Connector.bal);
    processAutoPopupCashier();
}

function updateGameAfterHeartbeat(){
    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
        UpdateVisualBalance(Global.Connector.bal);          
    }else if(isTimeToShowInfoMsg() ){
        UpdateVisualBalance(Global.Connector.bal);   
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

    StartAction.GameSession = Global.Connector.gameSession;
    StartAction.LastGameId = 0;

    //InitAction.doInitAction(afterCallInit);
    StartAction.doStartAction(LoadLanguage); //descomentar cuando ya este pegado al server

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
    fillPayouts();
    loadChips();
    GameStatus = 'ShowingGame';

    /*CASHIER*/
    var configCash = {
        type : 0, // 0 hand, 1 dealer hand, 2 player hand, 3 rollerino, 4 spin
        automata : false,
        autoStart : false,
        extraStart : true
    }
    //descomentar cuando ya este pegado al server
    cashierManager.cashierCreator("#global", "../common/img/chipTransfer/", updateGameAfterCashierBuyIn, configCash);
    HeartbeatManager.initHeartbeat(Global.Connector.gameSession, updateGameAfterHeartbeat);
    

    if(Global.PK3C.PC1 != null && Global.PK3C.PC2 != null && Global.PK3C.PC3 != null && Global.PK3C.PH != null){ //recovery Game
        if(Global.PK3C.anteAmt != null){
            AnteBet = Global.PK3C.anteAmt;
            setVisualBetChips(AnteBet,'ante');
            GameStatus = 'Dealing';
        }
        if(Global.PK3C.pairplusAmt != null){
            PairPBet = Global.PK3C.pairplusAmt;
            setVisualBetChips(PairPBet,'pairplus');
            GameStatus = 'Dealing';
        }
        drawPlayerCards();
    }else{
        processAutoPopupCashier();
    }

    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
    }
}

function loadChips(){
    var chipsArray = Global.Connector.showChips.split(',');
    Global.PK3C.ChipValues = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.PK3C.ChipValues.push(chipsArray[i]);
        }
    }

    if (Global.PK3C.ChipValues.length > 0) {
        Global.PK3C.SelectedChipValue = 0;

        var strHtml = '';
        
        for(var i=0; i < Global.PK3C.ChipValues.length; i++){
            var chipTempValue = Global.PK3C.ChipValues[i];
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
        btnsListeners();
        UpdateSelectedChip();
        UpdateVisualBalance(Global.Connector.bal);
    }

}


$( document ).ready(function() {
    $( window ).on('resize', function(){
        //console.log('on resize function')
        resizeContainer();
    });

    resizeContainer();
    Global.GameUrls.casinoWrapperURL = "";
    StartLoad();
    
    if(isMobile.any()){
        $("#btn-deal").addClass("btn-deal-mobile");
        $("#btn-clear").addClass("btn-clear-mobile");
        $("#btn-rebet").addClass("btn-rebet-mobile");
        $("#btn-play").addClass("btn-play-mobile");
        $("#btn-fold").addClass("btn-fold-mobile");

        $("#error-message").addClass("message-box-mobile");
        $("#info-message").addClass("message-box-mobile");
        $("#nav-bar").addClass("nav-bar-mobile");
        $("#betContainer").addClass("betContainer-mobile");

        $("#chips-lbls-container").addClass("chips-lbls-container-mobile");
        $("#game-fields-container").addClass("game-fields-container-mobile");


        //
   
    
    }
});

function afterPreload(){
    $("#PageContainerInner").show();
    resizeContainer();
    betAreaListeners();

    loadGame();
    var el = document.getElementById("btn-deal");
    el.addEventListener("click", function(){
    
        SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
        SoundManager.LoadSoundsInit("");

    }, false);

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

    FULL_WIDTH          = 1700;
    FULL_HEIGHT         = 936;
    CONTENT_WIDTH       = 1700;

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
/*
    if(isMobile.any()){
        if($("#helpContainer").hasClass("helpContainer-landscape")){
            $("#helpContainer").removeClass("helpContainer-landscape");
        }

        if(DevicePosition == 'L'){
            $("#helpContainer").addClass("helpContainer-landscape");
        }

    }/*else{
        $("#payout-iframe")
        .css("transform", "scale(" + 1 + "," + 1 + ")")
        .css("-webkit-transform", "scale(" + 1 + "," + 1 + ")")
        .css("-ms-transform", "scale(" + 1 + "," + 1 + ")");
    }*/
    
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

function openHelpClick(show){
    if(show)
        $("#helpContainer").show();
    else
        $("#helpContainer").hide();
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

    if(GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet'){
        isTime = true;
    }

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

    if((Global.Connector.bal == null || Global.Connector.bal <= 0 || Global.Connector.bal < Global.Connector.minb) && Global.Connector.showCashier)
    {
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

    if(Global.Connector.bal <= 0 || (isTournament && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0") && Global.Connector.showCashier && isInFreeSpins == 0 && !hassFreeSpins && !visibleError && !visibleCashier){
        
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

    $( "#click-area-pairplus" ).mouseenter(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {
            $("#highligt-area-pairplus").show();
            $("#highligt-area-ante").hide();
        }else{
            $("#highligt-area-pairplus").hide();
            $("#highligt-area-ante").hide();
        }
    });

    $( "#click-area-pairplus" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {

            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }

            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("");

            var chipValue = parseFloat(Global.PK3C.ChipValues[Global.PK3C.SelectedChipValue]);

            var tempTotalBet = PairPBet + AnteBet  + chipValue;

            if((PairPBet + (AnteBet * 2) + chipValue) > Global.Connector.bal){
                processLowCredits();
                return false; 
            }

            if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
                if((PairPBet + (AnteBet * 2) + chipValue) > Global.Connector.availableBalance){
                    showInfoMessage(Global.Connector.blockNote);
                    return false; 
                }
            }

            //MinBet and MaxBet Validations

            if(tempTotalBet > Global.Connector.maxb){
                var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
                showInfoMessage(maxBetMsg);
                return false; 
            }

            $("#btn-rebet").hide();
            $("#btn-deal").show();
            $("#btn-clear").show();


            PairPBet += chipValue;
            //TotalBet = PairPBet + AnteBet + PlayBet;
            UpdateVisualTotalBet();

            setVisualBetChips(PairPBet,'pairplus');
            GameStatus = 'Betting';
        }
    });

    $( "#click-area-ante" ).mouseenter(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {
            $("#highligt-area-pairplus").hide();
            $("#highligt-area-ante").show();
        }else{
            $("#highligt-area-pairplus").hide();
            $("#highligt-area-ante").hide();
        }
    });

    $( "#click-area-ante" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {

            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }


            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("");



            var chipValue = parseFloat(Global.PK3C.ChipValues[Global.PK3C.SelectedChipValue]);

            var tempTotalBet = PairPBet + AnteBet  + chipValue;

            if((PairPBet + (AnteBet + chipValue) * 2) > Global.Connector.bal){
                processLowCredits();
                return false; 
            }

            if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
                if((PairPBet + (AnteBet + chipValue) * 2) > Global.Connector.availableBalance){
                    showInfoMessage(Global.Connector.blockNote);
                    return false; 
                }
            }

            if(tempTotalBet > Global.Connector.maxb){
                var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
                showInfoMessage(maxBetMsg);
                return false; 
            }

            $("#btn-rebet").hide();
            $("#btn-deal").show();
            $("#btn-clear").show();

            AnteBet += chipValue;
            //TotalBet = PairPBet + AnteBet + PlayBet;
            UpdateVisualTotalBet();

            setVisualBetChips(AnteBet,'ante');

            GameStatus = 'Betting';
        }
    });

  
    $( "#click-area-pairplus" ).mouseleave(function() {
        $("#highligt-area-pairplus").hide();
    });

    $( "#click-area-ante" ).mouseleave(function() {
        $("#highligt-area-ante").hide();
    });
    
}

function UpdateVisualBalance(Balance){
    if(typeof(Balance) == "undefined" || Balance == null || Balance.length == 0){
        $("#credits-val").text("--");
    }else{
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Balance));
    }

    //Validate if Must Open the Cashier
    if((Global.Connector.bal == null || Global.Connector.bal <= 0 || Global.Connector.bal < Global.Connector.minb) && Global.Connector.showCashier)
    {
        var displayCashierTimer = setTimeout(function(){
            clearTimeout(displayCashierTimer);
            displayCashierTimer = null;
            cashierManager.openCashier();
        },1000);
        
    }
}

function UpdateVisualTotalBet(){
    TotalBet = PairPBet + AnteBet + PlayBet;
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal ));
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - TotalBet;
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(tempBalance));
    }
}

function UpdateVisualTotalBetPlay(realDeduction){
    TotalBet = PairPBet + AnteBet + PlayBet;    
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal ));
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - realDeduction;
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(tempBalance));
    }

}

function UpdateSelectedChip(){
    if(Global.PK3C.SelectedChipValue ==0){
        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PK3C.SelectedChipValue == 1){
        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PK3C.SelectedChipValue == 2){
        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PK3C.SelectedChipValue == 3){
        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PK3C.SelectedChipValue == 4){
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
        Global.PK3C.SelectedChipValue = 0;
        btnClickSound();
    });

    $( "#chip-bet-2,#chip-bet-value-2" ).click(function() {

        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PK3C.SelectedChipValue = 1;
        btnClickSound();
    });


    $( "#chip-bet-3,#chip-bet-value-3" ).click(function() {

        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PK3C.SelectedChipValue = 2;
        btnClickSound();
    });

    $( "#chip-bet-4,#chip-bet-value-4" ).click(function() {

        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PK3C.SelectedChipValue = 3;
        btnClickSound();

    });

    $( "#chip-bet-5,#chip-bet-value-5" ).click(function() {
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        Global.PK3C.SelectedChipValue = 4;
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


    $('#close-click-payout').click(function() { openHelpClick(false); });
    $('#help-overlay').click(function() { openHelpClick(false); });
    
    $('#cashierButton').click(function() { cashierManager.openCashier();});
    $('#closeButton').click(function() { lobbyButtonClick(); });        
    $('#message-ok-btn').click(function() { hideInfoMessage(); });
}

function toggle_sound() {
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


function clearAction(){
    CurrentPlayerCardDrawed = 0;
    CurrentDealerCardDrawed = 0;
    PairPBet = 0;
    AnteBet = 0;
    PlayBet = 0;
    TotalBet = 0;
   
    Global.PK3C.ANTERES = null;
    Global.PK3C.BONUSRES =  null;
    Global.PK3C.PPRES = null;
    Global.PK3C.RESULTAMT =  null;
    removeCards();
    removeChips(true);
    UpdateVisualTotalBet();
    $("#total-win-val").html("--");
    $("#dealer-result").removeClass("win-class");
    $("#player-result").removeClass("win-class");
}

function rebetAction(){

    var lastAnteBet = AnteBet;
    //var lastPlayBet = PlayBet;
    var lastPairPBet = PairPBet;

    clearAction();

    $("#btn-rebet").hide();
    $("#btn-deal").hide();
    $("#btn-clear").hide();

    
    if(((lastAnteBet * 2) +  lastPairPBet) > Global.Connector.bal){
        processLowCredits();
        return;
    }


    AnteBet = lastAnteBet;
    PlayBet = 0;
    PairPBet = lastPairPBet;

    TotalBet = AnteBet + PlayBet + PairPBet;
    

    setVisualBetChips(AnteBet, 'ante');
    setVisualBetChips(PairPBet, 'pairplus');

    UpdateVisualTotalBet();

    var dealTimeout = setTimeout(function(){
        clearTimeout(dealTimeout);
        dealTimeout = null;
        dealAction();
    },1000);
}

function dealAction(){
    //validate deal
    if(validateBet(0)){
        $("#btn-deal").hide();
        $("#btn-clear").hide();
        GameStatus = 'Dealing';

        DealAction.anteAmt = DealAction.pairplusAmt = null;

        if (AnteBet > 0) {
            DealAction.anteAmt = AnteBet;
        }else{
            DealAction.anteAmt = 0;
        }
        if (PairPBet > 0) {
            DealAction.pairplusAmt = PairPBet;
        }else{
            DealAction.pairplusAmt = 0;
        }

        DealAction.DoDealAction(afterDeal);
    }
}

function callAction(call){
    //validate deal
    if(call == 'Y'){
        if(validateBetPlay()){
            $("#btn-play").hide();
            $("#btn-fold").hide();
            GameStatus = 'Dealing';
            //TODO: set VisualChip = ante on play section
            CallAction.Call = call;
            CallAction.DoCallAction(afterCall);
        }
    }
    else
    {
        $("#btn-play").hide();
        $("#btn-fold").hide();
        GameStatus = 'Dealing';
            //TODO: set VisualChip = ante on play section
        CallAction.Call = call;
        CallAction.DoCallAction(afterCall);
    }
    
}

function afterDeal(){
    drawPlayerCards();
}

function afterCall(){
    drawDealerCards();
}

function validateBetPlay(){

    var tempTotalBet = AnteBet ;

    if(tempTotalBet > Global.Connector.bal){
        processLowCredits();
        return false; 
    }

    if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
        if(tempTotalBet> Global.Connector.availableBalance){
            showInfoMessage(decodeURIComponent(Global.Connector.blockNote));
            return false; 
        }
    }

    if((tempTotalBet) <= 0)
        return false;

    return true;

}

function validateBet(coinValue){

    var tempTotalBet = PairPBet + AnteBet + coinValue;

    if((PairPBet + (AnteBet * 2) + coinValue) > Global.Connector.bal){
        processLowCredits();
        return false; 
    }

    if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
        if((PairPBet + (AnteBet * 2) + coinValue) > Global.Connector.availableBalance){
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

    /*if(AnteBet > 0 && PairPBet > 0 && PlayBet){
        var maxBetMsg = 'You can not bet in all the tree places at once'; 
        showInfoMessage(maxBetMsg);
        return false;  
    }*/

    if((tempTotalBet) <= 0)
        return false;

    return true;

}

function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.display === 'none')
}

var waitBettting = false;
function btnsListeners(){

    $( "#btn-deal" ).click(function() {
        btnClickSound();
        dealAction();
    });

    $( "#btn-play" ).click(function() {
        if(waitBettting)
            return;
        waitBettting = true;
        btnClickSound();
        PlayBet = AnteBet;        
        TotalBet = PairPBet + AnteBet + PlayBet;   
        var realDeduction = PlayBet;
        UpdateVisualTotalBetPlay(realDeduction);
        setVisualBetChips(PlayBet,'play');
        setTimeout(function(){
            waitBettting = false;
            callAction('Y');
        },500);
        
    });

    $( "#btn-fold" ).click(function() {
        btnClickSound();
        callAction('N');

    });

    $( "#btn-clear" ).click(function() {
        btnClickSound();
        clearAction();
        $("#btn-rebet").hide();
        $("#btn-deal").hide();
        $("#btn-clear").hide();
    });

    $( "#btn-rebet" ).click(function() {
        btnClickSound();
        rebetAction();
    }); 
}

function animateDealerCardDown(cardNumber) {
    try {
        playCardDealerSound();
        var newCard = $('<span id="dealer-card-' + cardNumber + '" class="dealer-card"></span>');
        $("#game-container").append(newCard);

        if(fastPlay){
            $('#dealer-card-' + cardNumber).css('background', 'url(none) no-repeat top left');
        }

        var blockHeight = $('#game-container').height();
        var blockWidth = $('#game-container').width();
        var leftMove = 20 - (cardNumber * 14);

        //newCard.scale(0.7); 
        newCard.animate({
            top: '+=50%',
            left: '-=' + leftMove+'%',
            height: 'toggle',
            scale: '+=0.3'
        }, (fastPlay? 1: 400), 'linear', function () {
            // Animation complete.
            animateDealerCardUp(cardNumber);
        });

    }
    catch (err) {
        txt = "There was an error on this function animateBankerCard.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function animateDealerCardUp(cardNumber) {
    try {
        $('#dealer-card-' + cardNumber).css('background', 'url(images/Cards/' + Global.PK3C.DealerCards[cardNumber] + '.png) no-repeat top left');
        $('#dealer-card-' + cardNumber).css('background-size', '70% 70%');
        $('#dealer-card-' + cardNumber).css('-moz-background-size', '70% 70%');

        var blockHeight = $('#game-container').height();

        $('#dealer-card-' + cardNumber).animate({
            top: '-=10%',
            height: 'toggle'
        }, (fastPlay? 1: 100), function () {
            // Animation complete.
            drawDealerCards();
        });

    }
    catch (err) {
        txt = "There was an error on this function animateBankerCard.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


function animatePlayerCardDown(cardNumber) {
    try {
        playCardPlayerSound();
        var newCard = $('<span id="player-card-' + cardNumber + '" class="player-card"></span>');

        $("#game-container").append(newCard);

        if(fastPlay){
            $('#player-card-' + cardNumber).css('background', 'url(none) no-repeat top left');
        }
        
        //var leftMove = 20 - (cardNumber * 6.5);

        var leftMove = 38 - (cardNumber * 16);

        //newCard.scale(0.7);
        newCard.animate({
            top: '+=80%',
            left: '-=' + leftMove + '%',
            height: 'toggle',
            scale: '+=0.3'
        }, (fastPlay? 1: 400), 'linear', function () {
            // Animation complete.
            animatePlayerCardUp(cardNumber);
        });

    }
    catch (err) {
        txt = "There was an error on this function animatePlayerCard.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function animatePlayerCardUp(cardNumber) {
    try {
        $('#player-card-' + cardNumber).css('background', 'url(images/Cards/' + Global.PK3C.PlayerCards[cardNumber] + '.png) no-repeat top left');
        $('#player-card-' + cardNumber).css('background-size', '80% 80%');
        $('#player-card-' + cardNumber).css('-moz-background-size', '80% 80%');

        $('#player-card-' + cardNumber).animate({
            top: '-=10%',
            height: 'toggle'
        }, (fastPlay? 1: 100), function () {
            // Animation complete.
            drawPlayerCards();
        });

    }
    catch (err) {
        txt = "There was an error on this function animatePlayerCard.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


function drawPlayerCards(){
    var finishState = false;
    if (CurrentPlayerCardDrawed < 2 ) {
        animatePlayerCardDown(CurrentPlayerCardDrawed);
        ++CurrentPlayerCardDrawed;
    }else if (CurrentPlayerCardDrawed == 2) {
        
        

        animatePlayerCardDown(CurrentPlayerCardDrawed);
        ++CurrentPlayerCardDrawed;
        
        var showPlayerHand = setTimeout(function(){
            $("#player-result span").html(parseHand(Global.PK3C.PH));
            $("#player-result").show();

            if(Global.PK3C.DC1 != null && Global.PK3C.DC2 != null && Global.PK3C.DC3 != null && Global.PK3C.DH != null && Global.PK3C.RESULTAMT != null){
                drawDealerCards();
            }else{
                $("#btn-play").show();
                $("#btn-fold").show();
            }

            

        }, (fastPlay? 1: 1000));
    }
}

function drawDealerCards(){
    var finishState = false;
    if (CurrentDealerCardDrawed < 2 ) {
        animateDealerCardDown(CurrentDealerCardDrawed);
        ++CurrentDealerCardDrawed;
    }else if (CurrentDealerCardDrawed == 2) {      
        

        animateDealerCardDown(CurrentDealerCardDrawed);
        ++CurrentDealerCardDrawed;
        
        var showPlayerHand = setTimeout(function(){
            $("#dealer-result span").html(parseHand(Global.PK3C.DH));
            $("#dealer-result").show();  

            /*

*/
        processResults();
        }, (fastPlay? 1: 1000));
    }
}

function parseHand(hand){
    var text = '';
    switch(hand){
        case '-': text = 'High Card'; break;
        case '3K': text = '3 of a Kind'; break;
        case '2K': text = '2 of a Kind'; break;
        case 'ST': text = 'Straight'; break;
        case 'FL': text = 'Flush'; break;
        case 'SF': text = 'Straight Flush'; break;
        case 'X': text = 'Cannot open'; break;
        default: text = hand;
    }

    return text;

}

function processResults(){

    if(Global.PK3C.RESULTAMT > 0){
        $("#total-win-val").html(formatWithThousandsNoDecimalZeros(Global.PK3C.RESULTAMT));
    }else{
        $("#total-win-val").html('--');
    }

    UpdateVisualBalance(Global.Connector.bal);

    animateChipsWinPK();

    setTimeout(function(){
        $("#btn-rebet").show();
        $("#btn-clear").show();
        GameStatus = 'WaitingRebet';

        if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
            startGetInfoMessage();  
        }

    },(fastPlay?1:500));
}

function animateChip(areaName, top, left, scale) {
    try {
        $('.bet-chip-' + areaName).each(function (index) {
            $(this).animate({
                top: top,
                left: left,
                scale: scale
            }, 500, function () {
                // Animation complete.
                //$(this).remove();
            });
        });
    }
    catch (err) {
        txt = "There was an error on this function AnimateChip.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function animateChipsWinPK() {
    try {
        
        var currentText = $("#player-result span").html();
        currentText += " ("+Global.PK3C.RESULTAMT+")" 
        $("#player-result span").html(currentText);

        //pair plus
        if (Global.PK3C.PPRES != 0) {
            if (Global.PK3C.PPRES > 0) {
                var totalChipsPP = parseFloat(Global.PK3C.PPRES);
                setVisualBetChips(totalChipsPP, 'pairplus');

                setTimeout(function () {
                    animateChip('pairplus', '+=67%', '-=36%', '+=0.2');
                }, 300);
            }
            else {
                if (Global.PK3C.PPRES == 0)
                    setVisualBetChips(0, 'pairplus');
                else{
                    setVisualBetChips((Global.PK3C.PPRES * -1), 'pairplus');
                    animateChip('pairplus', '-=100%', '+=10%', '-=0.3');
                }
                    
            }
        }
        //Animate ante
        if (Global.PK3C.ANTERES != 0) {
            if (Global.PK3C.ANTERES > 0) {
               
                var totalChipsAnte = parseFloat(Global.PK3C.ANTERES) ;
                setVisualBetChips(totalChipsAnte, 'ante');

                setTimeout(function () {
                    animateChip('ante', '+=47%', '-=42%', '+=0.4');
                }, 300);
            }
            else {
                if(Global.PK3C.ANTERES == 0)
                    setVisualBetChips(0, 'ante');
                    
                else{
                    setVisualBetChips((Global.PK3C.ANTERES * -1), 'ante');
                    animateChip('ante', '-=100%', '+=10%', '-=0.3');
                }
                    
            }
        }

        //Animate play
        if (Global.PK3C.BONUSRES != null ) {
            if (Global.PK3C.BONUSRES > 0) {
                setVisualBetChips(Global.PK3C.BONUSRES, 'play');
                setTimeout(function () {
                    animateChip('play', '+=27%', '-=35%', '+=0.8');
                }, 300);
            }
            else {
                if (Global.PK3C.BONUSRES == 0)
                    setVisualBetChips(0, 'play');
                else{
                    setVisualBetChips((Global.PK3C.BONUSRES * -1), 'play');
                    animateChip('play', '-=100%', '+=10%', '-=0.3');
                }                    
            }
        }        
    }
    catch (err) {
        txt = "There was an error on this function AnimateChipsPK.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}



//Remove Cards
function removeCards() {
    try {
        //Delete Cards
        $("#game-container .dealer-card").remove();
        $("#game-container .player-card").remove();

        //Hide Results
        if ($("#player-result").is(":visible")) {
            $("#player-result").fadeToggle(200);
            $("#dealer-result").fadeToggle(200);
        }
    }
    catch (err) {
        txt = "There was an error on this function RemoveCards.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


//Play the Card Sound
function playCardPlayerSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("card-sound-player", GameSounds["card-sound-player"]);
    GameSounds["card-sound-player"] = SoundManager.PlayAudio("card-sound-player", false);
}

function playCardDealerSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("card-sound-dealer", GameSounds["card-sound-dealer"]);
    GameSounds["card-sound-dealer"] = SoundManager.PlayAudio("card-sound-dealer", false);    
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


function removeChips(cleanBet) {
    try {
        if (cleanBet) {
            if (GameStatus == 'Betting') {
                //var visualCredits +=  ;
                UpdateVisualBalance(Global.Connector.bal);
            }

            PairPBet = AnteBet = PlayBet = 0;
        }
        setVisualBetChips(0,'play');
        setVisualBetChips(0,'ante');
        setVisualBetChips(0,'pairplus');
    }
    catch (err) {
        txt = "There was an error on this function UpdateGUI.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function setVisualBetChips(amount,area) {

    var tempAmount = amount;
    if (amount < 0) {
        amount = amount * -1;
    }

    if(amount ==0){
        $("#bet-chip-"+area).remove();
        return;
    }


    tempAmount = formatWithNoDecimalZerosNumber(tempAmount);

    var chipsDistri = calculateChips(tempAmount);
    if (chipsDistri == null || chipsDistri.length <= 0) {
        if (tempAmount > 0) {
            return false;
        }
    }

    var hmtlCodeGen = "";
    var chipSet = "";
    var existDiv = false;

    var chipSpace = 5;            

    $("#bet-chip-"+area).remove();

    hmtlCodeGen += '<ol reversed="reversed" class="bet-chip-'+area+' chips-in-table" id="bet-chip-'+area+'"></ol>';
    
    $("#game-container").append(hmtlCodeGen);

    var topPercent = 0;
    //cleanBetChips(pos);

    for (var i = 0; i < chipsDistri.length; i++) {
        var tempArray = chipsDistri[i];
        var numChips = tempArray[0];
        for (var j = 1; j <= numChips; j++) {
            var newChip = $('<li><span></span></li>');
            newChip.css('top', topPercent + 'px');
            newChip.css('left', (Math.floor((Math.random() * 5))) + 'px');
            newChip.css('background', 'url(images/chips/' + tempArray[3]+') no-repeat top left');
            newChip.css('background-size', '100% 100%');
            newChip.css('-moz-background-size', '100% 100%');


            $("#bet-chip-"+area).append(newChip);
            $("#bet-chip-"+area + " li:last-child span").html(tempAmount);

            topPercent -= chipSpace;
        }
    }
    return true;
    
}

function fillPayouts(){
    if(typeof(Global.PK3C.prizes) != "undefined" && Global.PK3C.prizes != null &&Global.PK3C.prizes.length > 0){

        var paysArr = Global.PK3C.prizes.split('\n');

        for(var i = 0; i < paysArr.length; i++){
            var temp = paysArr[i];

            if(temp.indexOf('+') > 0){
                var ppArr = temp.split('+');
                $('#pay-pp-' + ppArr[0]).text(ppArr[1].replace('.00',''));
            }else{
               var abArr = temp.split(' ');
               $('#pay-ap-' + abArr[0]).text(abArr[1].replace('.00','')); 
            }
        }

    }

}
