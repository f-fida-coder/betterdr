/*
 function parseHand(hand, dealer){
    var text = '';
    switch(hand){
        case '-': text = (dealer?'No Hand':'No Game'); break;
        case 'AK': text = 'Ace/King'; break;
        case '2K': text = 'Two of a Kind'; break;        
        case '2P': text = 'Two Pairs'; break;
        case '3K': text = 'Three of a Kind'; break;
        case 'ST': text = 'Straight'; break;
        case 'FL': text = 'Flush'; break;
        case 'FH': text = 'Full House'; break;
        case '4K': text = 'Four of a Kind'; break;
        case 'SF': text = 'Straight Flush'; break;
        case 'NR': text = 'Natural Royal'; break;
        default: text = hand;
    }

    return text;
}*/



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

    FULL_WIDTH          = 2048;
    FULL_HEIGHT         = 1152;
    CONTENT_WIDTH       = 2048;

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
}

/************************************************************/
/************************************************************/
/************************************************************/
/************************************************************/
/************************************************************/
/* MY CODE */
/************************************************************/
/************************************************************/
/************************************************************/
/************************************************************/

var PlayCalled = false;
var SoundsLoaded = false;

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
        $("#btn-raise").addClass("btn-raise-mobile");
        $("#btn-fold").addClass("btn-fold-mobile");

        $("#dealer-result").addClass("dealer-result-mobile");

        $("#error-message").addClass("message-box-mobile");
        $("#info-message").addClass("message-box-mobile");
        $("#nav-bar").addClass("nav-bar-mobile");
        $("#betContainer").addClass("betContainer-mobile");

        $("#betContainer").addClass("betContainer-mobile");
        $(".buttons-bar").addClass("buttons-bar-mobile");
    }
});

function afterPreload(){
    $("#PageContainerInner").show();
    resizeContainer();
    addListeners();
    loadGame();
} 

function LoadLanguage(){
    LanguagesManager.loadTranslations(afterCallInit);
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
    loadChipsCoins();
    UpdateVisualTotalBet();
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

    processAutoPopupCashier();


    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
    }
  
}

function loadChipsCoins(){
    var chipsArray = Global.Connector.cvals.split(',');
    var chipsDArray = Global.Connector.cvalsd.split(',');
    Global.VKENO.ChipValues = new Array();
    Global.VKENO.ChipValuesD = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.VKENO.ChipValues.push(chipsArray[i]);
            Global.VKENO.ChipValuesD.push(chipsDArray[i]);
        }
    }

    if ( typeof(Global.Connector.cv) != "undefined" && Global.Connector.cv != null && Global.Connector.cv !="" && Global.VKENO.ChipValues.indexOf(Global.Connector.cv)>= 0) {
        Global.VKENO.SelectedChipValue = Global.Connector.cv;
        UpdateSelectedChip();
        UpdateSelectedCoin();
        UpdateVisualBalance(Global.Connector.bal);
    }


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
    RecoverAction.DoRecoverAction(LoadLanguage); //descomentar cuando ya este pegado al server
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

    if((GameStatus == BETTING || GameStatus == 'ShowingGame')){
        isTime = true;
    }
console.log("isTimeToShowInfoMsg ", isTime)
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

/* Create Game Listeners*/
function addListeners(){
    
    //numbers listener
    $("#card li").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        }  


        processNumberClick(this);
    });

    $("#btnClear").click(function() {  
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        }       
        processClearClick();
    });

    $("#btnAutoPick").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 
        processAutoPickClik();
    });

    $("#btnPick5").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 
        processPick5Clik();
    });

    $("#btnPick10").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 

        processPick10Clik();
    });

    $("#btnCoinValue").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 
        processCoinValueClik();
    });

    $("#btnCoinBet").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 
        processCoinBetClik();
    });

    $("#btnGo").click(function() {
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        } 
        processGoClik(10);
    });
   
}



/* process the card number clik */
function processNumberClick(obj){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();
    if(numbersBought < Global.VKENO.MaxSpots){
        var numerClick = $(obj).find("span").text();

        if (!Card[numerClick - 1].PlayerBuy) {
            Card[numerClick - 1].PlayerBuy = true;
            numbersBought += 1;
            $(obj).find("div").addClass("bought");
            $(obj).find("span").addClass("bought");
            updateVisualSpots();
        }

    }
}
/* process the Clear click */
function processClearClick(){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();
    clearCardSelection();

}

function drawHits(total){
    if(total > 0)
        $("#hits-val").text(total);
    else
        $("#hits-val").text("--");

    $(".pay-info").removeClass("payout-hits");    
    $("#match-"+total).addClass("payout-hits");
    $("#pay-"+total).addClass("payout-hits");
}


/* process the AutoPick click */
function processAutoPickClik(){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();
    autoPickNumber(Global.VKENO.MaxSpots);
}

/* process the Pick5 click */
function processPick5Clik(){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();
    autoPickNumber(5);

}

/* process the Pick10 click */
function processPick10Clik(){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();
    autoPickNumber(10);

}

/* process the CoinValue click */
function processCoinValueClik(){
    if(GameStatus == PLAYING_GAME)
        return;
    btnClickSound();

    var currentIndex  = Global.VKENO.ChipValues.indexOf(Global.VKENO.SelectedChipValue);
    var maxIndex = Global.VKENO.ChipValues.length - 1;

    var newIndex = currentIndex + 1;

    if(newIndex > maxIndex){
        newIndex = 0;
    }

    Global.VKENO.SelectedChipValue = Global.VKENO.ChipValues[newIndex];
    UpdateSelectedChip();
    UpdateVisualTotalBet();
    clearAfterGo();
}

/* process the CoinBet click */
function processCoinBetClik(){
    if(GameStatus == PLAYING_GAME)
        return;

    btnClickSound();
    var currenCoins = parseInt(Global.VKENO.CoinsBet);
    var newCoins = currenCoins + 1;

    if(newCoins > Global.VKENO.NumCoins){
        newCoins = 1;
    }
    Global.VKENO.CoinsBet= newCoins;
    UpdateSelectedCoin();
    UpdateVisualTotalBet();
    clearAfterGo();

}

/* process the Go click */
function processGoClik(pending){
    if(GameStatus == PLAYING_GAME)
        return;
    clearAfterGo();
    btnClickSound();

    if(validateBet() && validateNumbersBought()){
        GameStatus = PLAYING_GAME;

        Ticket = '';
        var numbersInTicket = 0;
        var currentNumber = 0;

        //Create the ticket string
        while (currentNumber < Card.length) {
            if (Card[currentNumber].PlayerBuy) {
                if(Ticket == ''){
                    Ticket = Card[currentNumber].Number;
                }else{
                    Ticket += (',' + Card[currentNumber].Number);
                }
                
            }
            currentNumber += 1;
        }

        if(Ticket != ""){
            $("#helpContainer").show();
            $(".pay-info").removeClass("payout-hits");    
            $("#match-0").addClass("payout-hits");
            $("#pay-0").addClass("payout-hits");

            UpdateVisualBalance(Global.Connector.bal - TotalBet);
            SpinAction.DoSpinAction(afterSpin);
        } else
            console.log("invalid tikect",Ticket)  
    }
}

function afterSpin(){

    if( typeof(Global.VKENO.BallsDrawn) == "undefined" || Global.VKENO.BallsDrawn == null || Global.VKENO.BallsDrawn == ""){
        showErrorMessage("Internal Error - Incorrect server response");
        return;
    }

    var ballResultArray = Global.VKENO.BallsDrawn.split(',');
    playBG();

    processBall(ballResultArray, 0);

}
var timer1 = null;

function processBall(array, index) {
        clearTimeout(timer1);
        timer1 = null;

        timer1 = setTimeout(function () {
        
        if(index >= array.length){
            clearTimeout(timer1);
            timer1 = null;

            
            stopBG();
            processWin(); 


        }else{
            
            animateBall(array[index], processBall, array, index);
        }
        
    }, (fastPlay?10:100));
}

function processWin(){
    
    updatePaid(Global.VKENO.ResultAmt);
    UpdateVisualBalance(Global.Connector.bal);

    var clearGoTimer = setTimeout(function(){
        //clearAfterGo();
        GameStatus = BETTING;
        $("#helpContainer").hide();

        if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
            startGetInfoMessage();  
        }
    }, (fastPlay?1000:2000));
}

function updatePaid(val){
    if(typeof(val) != "undefined" && val != null && val!= ""){
        if(val > 0){
            playWinner();
            $("#total-win-val").text(val);
        }else{
            $("#total-win-val").text("--");
        }
    }
}

function clearCardSelection(){
    numbersBought = 0;

    hits = 0;
    drawHits(hits);
    updatePaid("0");

    $("#ball-container").hide();//temp line
    $(".ball").css("top", "0px");
    $("#ball-number").text("--");

    for(var i = 0; i < 80; i++){
        Card[i].PlayerBuy = false;
    }

    $('#card li').each(function(i)
    {
        $(this).find("div").removeClass("bought");
        $(this).find("span").removeClass("bought");
    });
    updateVisualSpots();
    //$(".mark").hide();
    $(".mark").removeClass("nonwinner");
    $(".mark").removeClass("winner");
}

function clearAfterGo(){
    $("#ball-container").hide();//temp line
    $(".ball").css("top", "0px");
    $("#ball-number").text("--");

    hits = 0;
    drawHits(hits);
    updatePaid("0");

    $(".mark").removeClass("nonwinner");
    $(".mark").removeClass("winner");
}

function autoPickNumber(total){
    clearCardSelection();
    var generatedNumbers = 0, number = 0;

    while (generatedNumbers < total) {
        number = Math.floor((Math.random() * 80) + 1);
        if (!Card[number - 1].PlayerBuy) {
            Card[number - 1].PlayerBuy = true;
            numbersBought += 1;
            generatedNumbers += 1;

            $("#t-" + number).find("div").addClass("bought");
            $("#t-" + number).find("span").addClass("bought");
        }
    }
    updateVisualSpots();
}

function animateBall(number, callback, array, index){
    $("#ball-container").show();//temp line

    $(".ball").css("top", "0px");
    $(".ball").show();
    $("#ball-number").text(number);

    playBallSound();
    $(".ball").animate({ top: 860}, (!fastPlay?300:10),'easeOutBounce', function() {
        markNumber(number);
        if(typeof(callback) != "undefined" && callback != null)
        {
            var next = setTimeout(
                function(){
                    clearTimeout(next);
                    next=null;
                    index++;
                    callback(array, index);

                }, (!fastPlay?300:10));            
        }     
        //$(".ball").hide();       
    });
} 

function markNumber(number){
    if(Card[number-1].PlayerBuy == true){
        hits++;
        $("#t-" + number +" .mark").addClass("winner");
        drawHits(hits);
        playHit(hits);
    }
    else{
        $("#t-" + number +" .mark").addClass("nonwinner");
    }

}

function updateVisualSpots(){
    $('#spots-list li').each(function(i)
    {
        $(this).find("a").removeClass("selected");
    });

    $("#s-" + numbersBought).addClass("selected");
    updatePayout();
}

function updatePayout(){
    $(".pay-info").text("");
    if(typeof(numbersBought) == "undefined" || numbersBought == null || numbersBought == 0){
        return;
    }else{
        //
        for(var i = 0; i <= numbersBought; i++){
            var key = numbersBought+ "-" + i;
            var val = MasterPayOutArr[key];

            if(typeof(val) != "undefined" && val != null && val != ""){
                $("#match-" + i).text(i);
                $("#pay-" + i).text(val + ' to 1');
            }else{
               $("#match-" + i).text(i);
                $("#pay-" + i).text("0"); 
            }
        }        
    }


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
    TotalBet = parseFloat(Global.VKENO.SelectedChipValue)  * parseInt(Global.VKENO.CoinsBet);
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
    }

    if(TotalBet > Global.Connector.bal){
        processLowCredits();
    }
}

function UpdateSelectedChip(){
    if ( typeof(Global.VKENO.SelectedChipValue) != "undefined" && Global.VKENO.SelectedChipValue != null && Global.VKENO.SelectedChipValue !="" && Global.VKENO.ChipValues.indexOf(Global.VKENO.SelectedChipValue)>= 0) {
        var  index = Global.VKENO.ChipValues.indexOf(Global.VKENO.SelectedChipValue);
        $("#coin-value-display").text(Global.VKENO.ChipValuesD[index]);

    }
}

function UpdateSelectedCoin(){
    if ( typeof(Global.VKENO.CoinsBet) != "undefined" && Global.VKENO.CoinsBet != null && Global.VKENO.CoinsBet !="" ) {
        $("#coins-bet-display").text(Global.VKENO.CoinsBet);

    }
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


function validateBet(){
    var tempTotalBet = TotalBet;

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

function validateNumbersBought()
{
    if(numbersBought > Global.VKENO.MaxSpots){
        var maxNumbersBoughtMsg = LanguagesManager.getTranslationByKey('PleaseMaxSpots').replace('~1', Global.VKENO.MaxSpots); 
        //showInfoMessage("Your max bet is " + formatWithThousandsNoDecimalZeros(Global.Connector.maxb));
        showInfoMessage(maxNumbersBoughtMsg);
        return false; 
    }

    if(numbersBought < Global.VKENO.MinSpots){
        var minNumbersBoughtMsg = "Please select at least " + Global.VKENO.MinSpots + " numbers for each card."; 
        //showInfoMessage("Your max bet is " + formatWithThousandsNoDecimalZeros(Global.Connector.maxb));
        showInfoMessage(minNumbersBoughtMsg);
        return false; 
    }

    return true;
}

function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.display === 'none')
}


function fillPayouts(){
    if(typeof(Global.VKENO.Payouts) != "undefined" && Global.VKENO.Payouts != null && Global.VKENO.Payouts.length > 0){

        var paysArr = Global.VKENO.Payouts.split(';');

        MasterPayOutArr = new Array();
        for(var i = 0; i < paysArr.length; i++){
            var tempArr = paysArr[i].split(',');

            var id = tempArr[0];
            var matches = tempArr[1];
            var pay = parseFloat(tempArr[2]);

            MasterPayOutArr[id+"-"+matches] = pay;
        }
    }
}

//Play the Card Sound
//Play the Card Sound
function playBG() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("bg", GameSounds["bg"]);
    GameSounds["bg"] = SoundManager.PlayAudio("bg", false);
}

function playHit(hits) {

    if(fastPlay == true){return;}

    if(typeof(hits) == "undefined" || hits == null || hits == 0){
        return;
    }
        

    if(hits > 5)
        hits = 5;

    var hitsName = 'hit' + hits;
    SoundManager.StopAudio(hitsName, GameSounds[hitsName]);
    GameSounds[hitsName] = SoundManager.PlayAudio(hitsName, false);
}

function stopBG() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("bg", GameSounds["bg"]);
}

function playBallSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("ball", GameSounds["ball"]);
    GameSounds["ball"] = SoundManager.PlayAudio("ball", false);
}

function btnClickSound() {

    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false); 
}

function playWinner() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("winner", GameSounds["winner"]);
    GameSounds["winner"] = SoundManager.PlayAudio("winner", false); 
}
