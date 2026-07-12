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
    Global.Connector.showCashier = varArr["SHOWCASHIER"];
    Global.Connector.showHistory = varArr["SHOWHISTORY"];
    Global.Connector.showType = varArr["SHOWTYPE"];
    Global.Connector.showChips = varArr["SHOWCHIPS"];
    Global.Connector.currency = varArr["CURRENCY"];
    Global.Game.helpPage = varArr["HELPFILE"];
    Global.Connector.accountId = varArr["ACCOUNTID"];

}

function loadGame(){
    readVarfromEnterURL();

    InitAction.GameSession = Global.Connector.gameSession;
    InitAction.LastGameId = 0;

    //InitAction.doInitAction(afterCallInit);
    InitAction.doInitAction(LoadLanguage); //descomentar cuando ya este pegado al server

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
}

function loadChips(){
    var chipsArray = Global.Connector.showChips.split(',');
    Global.BAC.ChipValues = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.BAC.ChipValues.push(chipsArray[i]);
        }
    }

    if (Global.BAC.ChipValues.length > 0) {
        Global.BAC.SelectedChipValue = 0;

        var strHtml = '';
        
        for(var i=0; i < Global.BAC.ChipValues.length; i++){
            var chipTempValue = Global.BAC.ChipValues[i];
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
        UpdateTiePays();
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

/*function openHelpClick(show){
    if(show)
        $("#helpContainer").show();
    else
        $("#helpContainer").hide();
}*/

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
    var isTime = true;

    /*if(isLoading == false && (isInFreeSpins || Global.Connector.frees != "0")){
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
    console.log("processLowCredits");

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

    $( "#click-area-tie, #click-area-tie-2, #click-area-tie-3, #click-area-tie-4, #click-area-tie-5, #click-area-tie-6" ).mouseenter(function() {
        $("#highligt-area-tie").show();
        $("#highligt-area-banker").hide();
        $("#highligt-area-player").hide();
    });

    $( "#click-area-tie, #click-area-tie-2, #click-area-tie-3, #click-area-tie-4, #click-area-tie-5, #click-area-tie-6" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {

            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }

            $("#btn-rebet").hide();
            $("#btn-deal").show();
            $("#btn-clear").show();
            

            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("");

            var chipValue = parseFloat(Global.BAC.ChipValues[Global.BAC.SelectedChipValue]);

            var tempTotalBet = TieBet + BankerBet + PlayerBet + chipValue;

            if(tempTotalBet > Global.Connector.bal){
                processLowCredits();
                return false; 
            }

            if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
                if(tempTotalBet > Global.Connector.availableBalance){
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

            if(BankerBet > 0 && PlayerBet > 0){
                var maxBetMsg = 'You can not bet in all the tree places at once'; 
                showInfoMessage(maxBetMsg);
                return false;  
            }
            
            /*if(validateBet(chipValue) == false){
                return false;
            }*/

            TieBet += chipValue;
            //TotalBet = TieBet + BankerBet + PlayerBet;
            UpdateVisualTotalBet();

            setVisualBetChips(TieBet,'tie');
            GameStatus = 'Betting';
        }
    });

    $( "#click-area-banker, #click-area-banker-2, #click-area-banker-3, #click-area-banker-4, #click-area-banker-5" ).mouseenter(function() {
        $("#highligt-area-tie").hide();
        $("#highligt-area-banker").show();
        $("#highligt-area-player").hide();
    });

    $( "#click-area-banker, #click-area-banker-2, #click-area-banker-3, #click-area-banker-4, #click-area-banker-5" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {

            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }
            $("#btn-rebet").hide();
            $("#btn-deal").show();
            $("#btn-clear").show();

            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("");



            var chipValue = parseFloat(Global.BAC.ChipValues[Global.BAC.SelectedChipValue]);

            var tempTotalBet = TieBet + BankerBet + PlayerBet + chipValue;

            if(tempTotalBet > Global.Connector.bal){
                processLowCredits();
                return false; 
            }

            if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
                if(tempTotalBet > Global.Connector.availableBalance){
                    showInfoMessage(Global.Connector.blockNote);
                    return false; 
                }
            }

            if(tempTotalBet > Global.Connector.maxb){
                var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
                showInfoMessage(maxBetMsg);
                return false; 
            }

            if(TieBet > 0 && PlayerBet > 0){
                var maxBetMsg = 'You can not bet in all the tree places at once'; 
                showInfoMessage(maxBetMsg);
                return false;  
            }

            /*if(validateBet(chipValue) == false){
                return false;
            }*/

            BankerBet += chipValue;
            //TotalBet = TieBet + BankerBet + PlayerBet;
            UpdateVisualTotalBet();

            setVisualBetChips(BankerBet,'banker');

            GameStatus = 'Betting';
        }
    });

    $( "#click-area-player, #click-area-player-2, #click-area-player-3, #click-area-player-4, #click-area-player-5" ).mouseenter(function() {
        $("#highligt-area-tie").hide();
        $("#highligt-area-banker").hide();
        $("#highligt-area-player").show();
    });

    $( "#click-area-player , #click-area-player-2, #click-area-player-3, #click-area-player-4, #click-area-player-5" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {

            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }
            $("#btn-rebet").hide();
            $("#btn-deal").show();
            $("#btn-clear").show();

            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("");

            
            var chipValue = parseFloat(Global.BAC.ChipValues[Global.BAC.SelectedChipValue]);
            
            var tempTotalBet = TieBet + BankerBet + PlayerBet + chipValue;

            if(tempTotalBet > Global.Connector.bal){
                processLowCredits();
                return false; 
            }

            if(typeof(Global.Connector.availableBalance) !="undefined" && Global.Connector.availableBalance != null && Global.Connector.availableBalance.length >0){
                if(tempTotalBet > Global.Connector.availableBalance){
                    showInfoMessage(Global.Connector.blockNote);
                    return false; 
                }
            }
            
            if(tempTotalBet > Global.Connector.maxb){
                var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
                showInfoMessage(maxBetMsg);
                return false; 
            }
            /*
            console.log("validateBet()", validateBet())
            if(validateBet(chipValue) == false){
                return false;
            }*/

            if(BankerBet > 0 && TieBet > 0){
                var maxBetMsg = 'You can not bet in all the tree places at once'; 
                showInfoMessage(maxBetMsg);
                return false;  
            }

            PlayerBet += chipValue;
            //TotalBet = TieBet + BankerBet + PlayerBet;
            UpdateVisualTotalBet();
            setVisualBetChips(PlayerBet,'player');

            GameStatus = 'Betting';
        }

    });


    $( "#click-area-tie, #click-area-tie-2, #click-area-tie-3, #click-area-tie-4, #click-area-tie-5, #click-area-tie-6" ).mouseleave(function() {
        $("#highligt-area-tie").hide();
    });

    $( "#click-area-banker, #click-area-banker-2, #click-area-banker-3, #click-area-banker-4, #click-area-banker-5" ).mouseleave(function() {
        $("#highligt-area-banker").hide();
    });

    $( "#click-area-player , #click-area-player-2, #click-area-player-3, #click-area-player-4, #click-area-player-5" ).mouseleave(function() {
        $("#highligt-area-player").hide();
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
    TotalBet = TieBet + BankerBet + PlayerBet;
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - TotalBet;
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(tempBalance));
    }
}

function UpdateTiePays(){
    //tie-payou
    $("#tie-payout").text(formatWithNoDecimalZerosNumber(Global.BAC.TiePercentage));
    $("#tie-payout-mult").text("1");
}

function UpdateSelectedChip(){
    if(Global.BAC.SelectedChipValue ==0){
        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BAC.SelectedChipValue == 1){
        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BAC.SelectedChipValue == 2){
        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BAC.SelectedChipValue == 3){
        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.BAC.SelectedChipValue == 4){
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
        Global.BAC.SelectedChipValue = 0;
        btnClickSound();
    });

    $( "#chip-bet-2,#chip-bet-value-2" ).click(function() {

        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BAC.SelectedChipValue = 1;
        btnClickSound();
    });


    $( "#chip-bet-3,#chip-bet-value-3" ).click(function() {

        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BAC.SelectedChipValue = 2;
        btnClickSound();
    });

    $( "#chip-bet-4,#chip-bet-value-4" ).click(function() {

        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.BAC.SelectedChipValue = 3;
        btnClickSound();

    });

    $( "#chip-bet-5,#chip-bet-value-5" ).click(function() {
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        Global.BAC.SelectedChipValue = 4;
        btnClickSound();
    });
}

function menuListeners(){

    $('#soundOffButton').click(function() { toggle_sound(); });
    $('#fastPlayButton').click(function() { toggle_fastPlay(); });

    $('#historyButton').click(function() { openHistoryClick(true); });
    /*$('#helpButton').click(function() { openHelpClick(true); });*/


    //$('#close-history').click(function() { openHistoryClick(false); });

    $('#history-content').click(function() { openHistoryClick(false); });
    $('#history-overlay').click(function() { openHistoryClick(false); });
    $('#back-to-game-history-label').click(function() { openHistoryClick(false); });


    /*$('#close-click-payout').click(function() { openHelpClick(false); });
    $('#help-overlay').click(function() { openHelpClick(false); });*/
    
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
    console.log("toggle_fastPlay ", fastPlay)
}


function clearAction(){
    CurrentPlayerCardDrawed = 0;
    CurrentBankerCardDrawed = 0;
    TieBet = 0;
    BankerBet = 0;
    PlayerBet = 0;
    TotalBet = 0;
    Global.BAC.Result = null;
    removeCards();
    removeChips(true);
    UpdateVisualTotalBet();
    $("#total-win-val").html("--");
    $("#banker-result").removeClass("win-class");
    $("#player-result").removeClass("win-class");
}

function rebetAction(){

    var lastBankerBet = BankerBet;
    var lastPlayerBet = PlayerBet;
    var lastTieBet = TieBet;

    clearAction();

    $("#btn-rebet").hide();
    $("#btn-deal").hide();
    $("#btn-clear").hide();

    BankerBet = lastBankerBet;
    PlayerBet = lastPlayerBet;
    TieBet = lastTieBet;

    TotalBet = BankerBet + PlayerBet + TieBet;
    if(TotalBet > Global.Connector.bal){
        processLowCredits();
        return;
    }


    setVisualBetChips(BankerBet, 'banker');
    setVisualBetChips(PlayerBet, 'player');
    setVisualBetChips(TieBet, 'tie');

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

        DealAction.dealPlayerBet = DealAction.dealBankerBet = DealAction.dealTieBet = null;
        if (PlayerBet > 0) {
            DealAction.dealPlayerBet = PlayerBet;
        }
        if (BankerBet > 0) {
            DealAction.dealBankerBet = BankerBet;
        }
        if (TieBet > 0) {
            DealAction.dealTieBet = TieBet;
        }
        DealAction.GameSession = GlobalGameSession;
        DealAction.DoDealAction(afterDeal);
    }
}

function afterDeal(){
    setResultsSizeBox();
    drawCards();
}

function validateBet(coinValue){

    var tempTotalBet = TieBet + BankerBet + PlayerBet + coinValue;

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

    if(BankerBet > 0 && TieBet > 0 && PlayerBet){
        var maxBetMsg = 'You can not bet in all the tree places at once'; 
        showInfoMessage(maxBetMsg);
        return false;  
    }

    if((tempTotalBet) <= 0)
        return false;

    return true;

}

function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.display === 'none')
}

function btnsListeners(){

    $( "#btn-deal" ).click(function() {
        dealAction();
    });

    $( "#btn-clear" ).click(function() {
        clearAction();
        $("#btn-rebet").hide();
        $("#btn-deal").hide();
        $("#btn-clear").hide();
    });

    $( "#btn-rebet" ).click(function() {
        rebetAction();
    }); 
}



function setResultsSizeBox(){

    if(typeof(PlayerCards[2]) != 'undefined' && PlayerCards[2] != null && PlayerCards[2] != ""){
        $("#player-result").css('width','31%');
        //$("#banker-result").css('left','9.5%');
    }

    if(typeof(BankerCards[2]) != 'undefined' && BankerCards[2] != null && BankerCards[2] != ""){
        $("#banker-result").css('width','31%');
    }
}

function animateBankerCardDown(cardNumber) {
    try {
        playCardBankerSound();
        var newCard = $('<span id="banker-card-' + cardNumber + '" class="banker-card"></span>');
        $("#game-container").append(newCard);

        if(fastPlay){
            $('#banker-card-' + cardNumber).css('background', 'url(none) no-repeat top left');
        }

        var blockHeight = $('#game-container').height();
        var blockWidth = $('#game-container').width();
        var leftMove = 25 - (cardNumber * 6.5);

        //newCard.scale(0.7); 
        newCard.animate({
            top: '+=71%',
            left: '-=' + leftMove+'%',
            height: 'toggle',
            scale: '+=0.3'
        }, (fastPlay? 1: 400), 'linear', function () {
            // Animation complete.
            animateBankerCardUp(cardNumber);
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

function animateBankerCardUp(cardNumber) {
    try {
        $('#banker-card-' + cardNumber).css('background', 'url(images/Cards/' + Global.BAC.BankerCards[cardNumber] + '.png) no-repeat top left');
        $('#banker-card-' + cardNumber).css('background-size', '100% 100%');
        $('#banker-card-' + cardNumber).css('-moz-background-size', '100% 100%');

        var blockHeight = $('#game-container').height();

        $('#banker-card-' + cardNumber).animate({
            top: '-=26%',
            height: 'toggle'
        }, (fastPlay? 1: 100), function () {
            // Animation complete.
            drawCards();
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
        
        var leftMove = 20 - (cardNumber * 6.5);

        //newCard.scale(0.7);
        newCard.animate({
            top: '+=71%',
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
        $('#player-card-' + cardNumber).css('background', 'url(images/Cards/' + Global.BAC.PlayerCards[cardNumber] + '.png) no-repeat top left');
        $('#player-card-' + cardNumber).css('background-size', '100% 100%');
        $('#player-card-' + cardNumber).css('-moz-background-size', '100% 100%');

        $('#player-card-' + cardNumber).animate({
            top: '-=26%',
            height: 'toggle'
        }, (fastPlay? 1: 100), function () {
            // Animation complete.
            drawCards();
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


function drawCards() {
    try {
        var finishState = false;
        if (CurrentPlayerCardDrawed < 2 || CurrentBankerCardDrawed < 2) {

            if (CurrentPlayerCardDrawed <= CurrentBankerCardDrawed) {
                animatePlayerCardDown(CurrentPlayerCardDrawed);
                ++CurrentPlayerCardDrawed;
            }
            else {
                animateBankerCardDown(CurrentBankerCardDrawed);
                ++CurrentBankerCardDrawed;
            }
        }
        else if (CurrentPlayerCardDrawed == 2 & CurrentBankerCardDrawed == 2) {
            
            $("#player-result").show();
            $("#banker-result").show();

            $("#player-result span").html(LanguagesManager.getTranslationByKey('fld_PlayerHas').replace('~1', Global.BAC.PlayerResults[0])); //MinBet
            $("#banker-result span").html(LanguagesManager.getTranslationByKey('fld_BankerHas').replace('~1', Global.BAC.BankerResults[0]));

            playerHasSound(Global.BAC.PlayerResults[0]);
            setTimeout(function() {
                bankerHasSound(Global.BAC.BankerResults[0]);
            },(fastPlay? 0: 1500));

            //$("#player-result span").html('Player has: ~1'.replace('~1', Global.BAC.PlayerResults[0]));
            //$("#banker-result span").html('Banker has: ~1'.replace('~1', Global.BAC.BankerResults[0]));
            var timeReduce  = 0;
            if (Global.BAC.PlayerCards[2] || Global.BAC.BankerCards[2]) {
                if (Global.BAC.PlayerCards[2]) {
                    timeReduce  = 1200;
                }else if (Global.BAC.BankerCards[2]) {
                    timeReduce  = 1200;
                }

                setTimeout(function () {
                    console.log("TIMER 1")
                    if (Global.BAC.PlayerCards[2]) {
                        cardToPlayerSound();
                        var cardPlayer =  setTimeout(function(){
                            console.log("TIMER 1.1")
                            clearTimeout(cardPlayer);
                            cardPlayer = null;
                            animatePlayerCardDown(CurrentPlayerCardDrawed);
                            ++CurrentPlayerCardDrawed;
                            
                        },(fastPlay? 0: 1200));
                        
                    }
                    else if (Global.BAC.BankerCards[2]) {
                        console.log("Global.BAC.BankerCards[2]",Global.BAC.BankerCards[2]);
                        cardToBankerSound();
                        var cardBanker =  setTimeout(function(){
                            console.log("TIMER 1.2")
                            clearTimeout(cardBanker);
                            cardBanker = null;
                            animateBankerCardDown(CurrentBankerCardDrawed);
                            ++CurrentBankerCardDrawed;
                            
                        },(fastPlay? 0: 1200));
                    }
                }, (fastPlay? 0: (1500 + timeReduce)) );
            }
            else {
                finishState = true;
            }
        }
        else if (CurrentPlayerCardDrawed > CurrentBankerCardDrawed &&
            Global.BAC.BankerCards[2]) {
            
            cardToBankerSound();
            $("#player-result span").html(LanguagesManager.getTranslationByKey('fld_PlayerHas').replace('~1', Global.BAC.PlayerResults[1]));
            //$("#player-result span").html('Player has: ~1'.replace('~1', Global.BAC.PlayerResults[1]));
            $("#player-result").show();
            $("#banker-result").show();

            animateBankerCardDown(CurrentBankerCardDrawed);
            ++CurrentBankerCardDrawed;
        }
        else {
            /*setTimeout(function() {
                //playerHasSound(Global.BAC.PlayerResults[1]);
                //setTimeout(function() {
                //    bankerHasSound(Global.BAC.BankerResults[1]);
                //},1700);

                
                
            }, 800);*/

            $("#player-result span").html(LanguagesManager.getTranslationByKey('fld_PlayerHas').replace('~1', Global.BAC.PlayerResults[1]));
            $("#banker-result span").html(LanguagesManager.getTranslationByKey('fld_BankerHas').replace('~1', Global.BAC.BankerResults[1]));

            $("#player-result").show();
            $("#banker-result").show();
            

            /*$("#player-result").css('left','68.5%');
            $("#banker-result").css('left','9.5%');*/

            /*$("#player-result span").html('Player has: ~1'.replace('~1', Global.BAC.PlayerResults[1]));
            $("#banker-result span").html('Banker has: ~1'.replace('~1', Global.BAC.BankerResults[1]));*/
            finishState = true;
            
        }

        if (finishState) {
            var timeWinnerSound= 0;
            if(fastPlay == false){
                if (Global.BAC.PlayerCards[2] || Global.BAC.BankerCards[2]) {
                    timeWinnerSound= 1000;
                }
                else {
                    timeWinnerSound= 2700;
                }
            }else{
                timeWinnerSound= 200;
            }

           var timerAni4 = setTimeout(function(){
                clearTimeout(timerAni4);
                timerAni4 = null;

                if (Global.BAC.PlayerResults[1] == Global.BAC.BankerResults[1]) {
                    Winner = 'Tie';
                    tieWinsSound();

                }
                else if (Global.BAC.PlayerResults[1] > Global.BAC.BankerResults[1]) {
                    Winner = 'Player';
                    playerWinsSound();
                    $("#player-result").addClass("win-class");
                }
                else {
                    Winner = 'Banker';
                    bankerWinsSound();
                    $("#banker-result").addClass("win-class");

                }

                var totalWin =parseFloat(Global.BAC.Result + TieBet + BankerBet + PlayerBet);
                if(totalWin > 0){
                    $("#total-win-val").html(formatWithThousandsNoDecimalZeros(totalWin));
                }else{
                    $("#total-win-val").html('--');
                }
                

                UpdateVisualBalance(Global.Connector.bal);

                animateChipsWin();
                $("#btn-rebet").show();
                $("#btn-deal").hide();
                $("#btn-clear").show();

                GameStatus = 'WaitingRebet';

                // Betterdr: the deal + winner reveal is now on screen. Signal the
                // parent so the site's result banner appears AFTER the cards land,
                // not the instant Deal is clicked.
                if (typeof window.BetterdrOnRoundRevealed === 'function') {
                    window.BetterdrOnRoundRevealed();
                }

            },timeWinnerSound);
                     
            
        }
    }
    catch (err) {
        txt = "There was an error on this function drawCards.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function animateChip(tieBankerPlayer, top, left, scale) {
    try {
        $('.bet-chip-' + tieBankerPlayer).each(function (index) {
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

function animateChipsWin() {
    try {
        //Animate Tie
        if (TieBet > 0) {
            if (Winner == 'Tie') {
                //drawChipsBet('tie', parseFloat(TieBet * Global.BAC.TiePercentage));
                setVisualBetChips(TieBet + parseFloat(TieBet * Global.BAC.TiePercentage), 'tie');

                setTimeout(function () {
                    animateChip('tie', '+=67%', '+=36%', '+=0.2');
                }, 300);
            }
            else {
                animateChip('tie', '-=42%', '+=0%', '-=0.3');
            }
        }
        //Animate Banker
        if (BankerBet > 0) {
            if (Winner == 'Banker') {
                //drawChipsBet('banker', BankerBet + Global.BAC.BankerResult);
                setVisualBetChips((BankerBet + Global.BAC.BankerResult), 'banker');

                setTimeout(function () {
                    animateChip('banker', '+=47%', '+=42%', '+=0.4');
                }, 300);
            }
            else if (Winner == 'Tie') {
                //drawChipsBet('banker', BankerBet);
                setVisualBetChips(BankerBet, 'banker');
                     setTimeout(function () {
                    animateChip('banker', '+=47%', '+=42%', '+=0.4');
                }, 300);
            }
            else {

                animateChip('banker', '-=65%', '+=0%', '-=0.3');
            }
        }

        //Animate Player
        if (PlayerBet > 0) {
            if (Winner == 'Player') {
                setVisualBetChips(PlayerBet * 2, 'player');
                //drawChipsBet('player', PlayerBet * 2);
                setTimeout(function () {
                    animateChip('player', '+=27%', '+=35%', '+=0.8');
                }, 300);
            }
            else if (Winner == 'Tie') {
                //drawChipsBet('player', PlayerBet);
                setVisualBetChips(PlayerBet, 'player');

                setTimeout(function () {
                    animateChip('player', '+=27%', '+=35%', '+=0.3');
                }, 300);
            }
            else {
                animateChip('player', '-=75%', '+=0%', '-=0.3');
            }
        }        
    }
    catch (err) {
        txt = "There was an error on this function AnimateChips.\n\n";
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
        $("#game-container .banker-card").remove();
        $("#game-container .player-card").remove();

        //Hide Results
        if ($("#player-result").is(":visible")) {
            $("#player-result").fadeToggle(200);
            $("#banker-result").fadeToggle(200);
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

function playCardBankerSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("card-sound-banker", GameSounds["card-sound-banker"]);
    GameSounds["card-sound-banker"] = SoundManager.PlayAudio("card-sound-banker", false);    
}

function btnClickSound() {

    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false); 
}

function playerHasSound(number) {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("player-has", GameSounds["player-has"]);
    GameSounds["player-has"] = SoundManager.PlayAudio("player-has", false);    

    setTimeout(function(){
            var numberStr = "" + number;
            SoundManager.StopAudio(number, GameSounds[numberStr]);
            GameSounds[numberStr] = SoundManager.PlayAudio(numberStr, false);   
    }, 850);    
}

function cardToPlayerSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("card-to-the-player", GameSounds["card-to-the-player"]);
    GameSounds["card-to-the-player"] = SoundManager.PlayAudio("card-to-the-player", false);    
}

function cardToBankerSound() {
    if(fastPlay == true){return;}
    console.log("cardToBankerSound");
    SoundManager.StopAudio("card-to-the-banker", GameSounds["card-to-the-banker"]);
    GameSounds["card-to-the-banker"] = SoundManager.PlayAudio("card-to-the-banker", false);    
}

function bankerHasSound(number) {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("banker-has", GameSounds["banker-has"]);
    GameSounds["banker-has"] = SoundManager.PlayAudio("banker-has", false);  

    setTimeout(function(){
            var numberStr = "" + number;
            SoundManager.StopAudio(number, GameSounds[numberStr]);
            GameSounds[numberStr] = SoundManager.PlayAudio(numberStr, false);   
    }, 850);  
}

function bankerWinsSound() {
    //if(fastPlay == true){return;}
    SoundManager.StopAudio("banker-wins", GameSounds["banker-wins"]);
    GameSounds["banker-wins"] = SoundManager.PlayAudio("banker-wins", false);    
}

function playerWinsSound() {
    //if(fastPlay == true){return;}
    SoundManager.StopAudio("player-wins", GameSounds["player-wins"]);
    GameSounds["player-wins"] = SoundManager.PlayAudio("player-wins", false);    
}

function tieWinsSound() {
    //if(fastPlay == true){return;}
    SoundManager.StopAudio("tie-wins", GameSounds["tie-wins"]);
    GameSounds["tie-wins"] = SoundManager.PlayAudio("tie-wins", false);    
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

            TieBet = BankerBet = PlayerBet = 0;
        }
        setVisualBetChips(0,'player');
        setVisualBetChips(0,'banker');
        setVisualBetChips(0,'tie');
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
/*
function drawChipsBet(playerBankTie, playerBankerTieBet) {
    try {
        if (playerBankerTieBet > 0 && $("#btn-clear").hasClass('collapsed') && GameStatus == 'Betting') {
            $("#btn-clear, #btn-options").removeClass('collapsed');
            $("#btn-deal").removeClass('collapsed');
        }

        var bet = playerBankerTieBet;
        var chipsShowed = 0;

        $('#click-area-' + playerBankTie).html("");
        var newChip = "";
        for (chip = Global.BAC.ChipValues.length - 1; chip >= 0; --chip) {
            while (bet >= Global.BAC.ChipValues[chip]) {
                bet = bet - Global.BAC.ChipValues[chip];

                var newChip = $('<a class="' + playerBankTie + '-chip"><span class="bet-value" ></span></a>');
                newChip.css('background', 'url(_build/img/Chip-' + ChipsColors[chip] + '.png) no-repeat top left');
                newChip.css('background-size', '100% 100%');
                newChip.css('-moz-background-size', '100% 100%');
                $("#main-block").append(newChip);
                if (playerBankTie == 'tie') {
                    newChip.css('top', (19 - (1.4 * chipsShowed)) + "%");
                }
                else if (playerBankTie == 'banker') {
                    newChip.css('top', (41 - (1.4 * chipsShowed)) + "%");
                }
                else if (playerBankTie == 'player') {
                    newChip.css('top', (59 - (1.4 * chipsShowed)) + "%");
                }

                ++chipsShowed;
            }

            if (bet == 0) {
                break;
            }
        }

        if (playerBankTie == 'tie') {
            $("#main-block .tie-chip").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                e.preventDefault();
                if (!$(this).hasClass('chip-disable')) {
                    tieAddChip();
                }
            });
            if (isMobile.Android()) {
                $("#main-block .tie-chip").off('click');
            }
        }
        else if (playerBankTie == 'banker') {
            $("#main-block .banker-chip").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                e.preventDefault();
                if (!$(this).hasClass('chip-disable')) {
                    bankerAddChip();
                }
            });
            if (isMobile.Android()) {
                $("#main-block .banker-chip").off('click');
            }
        }
        else if (playerBankTie == 'player') {
            $("#main-block .player-chip").on(isMobile.any()? 'touchstart' : 'click', function (e) {
                e.preventDefault();
                if (!$(this).hasClass('chip-disable')) {
                    playerAddChip();
                }
            });
            if (isMobile.Android()) {
                $("#main-block .player-chip").off('click');
            }
        }

        $('#main-block .' + playerBankTie + '-chip:last-child span').html(playerBankerTieBet);
    }
    catch (err) {
        txt = "There was an error on this function drawChips.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}*/