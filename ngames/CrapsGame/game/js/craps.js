
var PlayCalled = false;
var SoundsLoaded = false;

Global.Connector.rootLevel = "../../../aspNet/";
var payoutURL = "../../../aspNET/Help/index.html?page=_Craps.html";
var fastPlay = false;

var CurrentScale =1;
var SpinJustFinish = false;
var LastCupo = null;

var d = null;
var RemoverBets = false;

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

    FULL_WIDTH          = 2530;
    FULL_HEIGHT         = 1280;
    CONTENT_WIDTH       = 2000;

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

    scalechips = scale;

    if(isMobile.any() ){
        if(DevicePosition == 'P'){
            $("#nav-bar").removeClass('nav-bar-mobile');
            $("#nav-bar").addClass('nav-bar-mobile-port');
        }else{
            $("#nav-bar").addClass('nav-bar-mobile');
            $("#nav-bar").removeClass('nav-bar-mobile-port');
        }
    }

}


function MoveBets(){
    var betsTempArray = BetPosition.length;
    for(var i = 0; i < betsTempArray; i++){
        var tempArr = BetPosition[i];
         if(tempArr != null){
            var posX = (parseInt(tempArr["posX"]));
            var posy = (parseInt(tempArr["posY"])); 
            var zoomF = tempArr["zoom"];
            var divId = tempArr["id"];
            var areaId = tempArr["areaId"];
            var amount = tempArr["amount"];
            $("#bet_table_big").children("#" + divId).eq(0).remove();
            BetPosition[i] = null;
            putChipInBetClick(areaId,amount, true);                
        }
    }
}





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





        setMobileDisplay();

    }

});

function setMobileDisplay(){

    $("#helpButton").addClass("menuButton-mobile");
    $("#historyButton").addClass("menuButton-mobile");
    $("#cashierButton").addClass("menuButton-mobile");
    $("#soundOffButton").addClass("menuButton-mobile");
    $("#fastPlayButton").addClass("menuButton-mobile");

    $("#error-message").addClass("message-box-mobile");
    $("#info-message").addClass("message-box-mobile");
    $("#nav-bar").addClass("nav-bar-mobile");
    $("#betContainer").addClass("betContainer-mobile");

    $("#chips-lbls-container").addClass("chips-lbls-container-mobile");
    $("#game-fields-container").addClass("game-fields-container-mobile");

    $("#btn-add-remove").show();
    
    $("#tip-msg").addClass("tip-msg-mobile");
    $("#tip-msg").html('TIP: Click over "Adding Bets" to active the  "Removig Bets" and click again to return to "Adding Bets".');
}

function afterPreload(){
    $("#PageContainerInner").show();
    resizeContainer();
    
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
   
    loadChips();
    GameStatus = 'ShowingGame';

    UpdateVisualBalance(Global.Connector.bal);
    
    //precessBetAreaLimits();

    //CASHIER
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
    betAreaListeners();   
   

    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
    }

    var ele = document.getElementById('dice-roll-table');
    Dice.dice_initializ(ele,1600,800);

    //set current point
    animatePoint(Global.CP.cupo);

    if(parseInt(Global.CP.cupo) > -1){
        $('.bet-off-chip').remove();
    }
    //set oth_dontbar
    setDontBarValue();
    fillPayOuts();

    if(Global.CP.isrec != null && Global.CP.isrec != "" && parseInt(Global.CP.isrec) == 1 ) //is a recovery game
    {
        refresBetsBasedOnResponseBetsArray();
        
        TotalBet = calculateTotalBet(BetArray);

        if(TotalBet != Global.CP.totb){
            showErrorMessage('Invalid total bet on recovery');
        }else
        {
            UpdateVisualTotalBet();
        }
    }
    var timerHideTipTimer = setTimeout(function(){
        clearTimeout(timerHideTipTimer);
        timerHideTipTimer = null;
        $("#tip-msg").hide();
    }, 3000);

    
}

function setDontBarValue(){
    if(Global.CP.oth_dontbar == 2){
        $(".din-d-y").addClass("dices-1-y");
        $(".din-d-w").addClass("dices-1-w");
    }else{
        $(".din-d-y").addClass("dices-6-y");
        $(".din-d-w").addClass("dices-6-w");
    }
}

function fillPayOuts(){
    
    var arrayKey = Object.keys(payDisConf);
    var keyLeng = arrayKey.length;

    for(var i = 0; i < keyLeng; i++){
       var valueTemp = formatWithNoDecimalZerosNumber(payDisConf[arrayKey[i]]);
       $("." + arrayKey[i] + '-pay').html(valueTemp + " to 1");
    }

    if(!paysDouble2){
        $("#pay-d1").removeClass('pay-d');
    }
    else{
        $("#pay-d1").addClass('pay-d');
    }

    if(!paysDouble12){
        $("#pay-d2").removeClass('pay-d');
    }else{
        $("#pay-d2").addClass('pay-d');
    }
}



function cleanBets(){
    var betsTempArray = BetPosition.length;
    for(var i = 0; i < betsTempArray; i++){
        var tempArr = BetPosition[i];
         if(tempArr != null){
            var posX = (parseInt(tempArr["posX"]));
            var posy = (parseInt(tempArr["posY"])); 
            var zoomF = tempArr["zoom"];
            var divId = tempArr["id"];
            var areaId = tempArr["areaId"];
            var amount = tempArr["amount"];
            //this.BetArray[areaId] = 0;
            $("#bet_table_big").children("#" + divId).eq(0).remove();
        }
    }
    BetPosition = new Array();
    BetArray = new Array();
}

function prepareBetArea(){
    cleanBets();
    hidemarkWinnerNum();     
    removemarkPayArea();

    $("#total-win-val").html("--");
    $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
}

function rebetClick(){

    var arrayKey = Object.keys(CompleteLastBetArray);
    var keyLeng = arrayKey.length;
    var _totalLastBet = calculateTotalBet(CompleteLastBetArray);

    if(_totalLastBet > Global.Connector.bal)
    {
        LastBetArray = new Array();
        /*var minMSjText = LanguagesManager.getTranslationByKey("NoFunds");
        Message.showBlockNoteDesktop(minMSjText);*/
        processLowCredits();
        return;
    }

     
    if(validateTotalBetClickAction(_totalLastBet)){

        for(var i = 0; i < keyLeng; i++){
           var valueTemp = CompleteLastBetArray[arrayKey[i]];
           
           try{
                if(typeof(valueTemp) != "undefined" && valueTemp != null && parseFloat(valueTemp) > 0){
                   BetArray[arrayKey[i]] = valueTemp; 
                }
              
           }catch(err){}
        }
        //console.log("Validacion COmpleta BetArray", BetArray)
        putBetsFromArray(BetArray);
        UpdateVisualTotalBet();
        
        $("#btn-clear").show();
        $("#btn-spin").show();
    }else{
        console.log("Falla validacion de _totalLastBet", _totalLastBet)
    }
    
}

function putBetsFromArray(betsArray){
    var arrayKey = Object.keys(betsArray);
    var keyLeng = arrayKey.length;
    var _totalBet = 0;

    for(var i = 0; i < keyLeng; i++){
       var valueTemp = parseFloat(betsArray[arrayKey[i]]).toFixed(2);
       try{
            putChipInBetClick(arrayKey[i],valueTemp, true);
       }catch(err){}
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
    RecoverAction.doRecoverAction(LoadLanguage); //descomentar cuando ya este pegado al server
    
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
    var win = window.open(payoutURL, '_blank');
    win.focus();
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

    if(IsBetTime && calculateTotalBet(BetArray) == 0){
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

/* NEW FUNCTIONS */

function afterSoundsLoaded(){
    SoundsLoaded = true;
}


function betAreaListeners(){

    var method = 'click';

    if(isMobile.any()){
        method = 'touchstart'
    }

    $(".click-area").bind( method, function(event) {  
        event.stopPropagation();
        $("#tip-msg").hide();

        if(Rolling)
            return;

        if(!fastPlay)
            $("#canvas").hide();


        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit("afterSoundsLoaded()");
        }
        
        stopResAnim();

        var id = $(event.target).attr('id'); 
        var betCode = getBetAreaCode(id);
        var betType = $(event.target).attr('btype'); 
        var addChip = 1;
        if(event.shiftKey || RemoverBets == true){
            addChip = -1;
        }


        if(betCode== 'dp'){
            if(Global.CP.cupo >= 4 && BetArray['dp'] != null && BetArray['dp'] > 0)
            {
                betCode = 'odp';
                betType = 'odp';
            }
        }
        
        if(!canChangeBet(betCode, betType, addChip)){
            if(useBetNotAllowMsg){
                var msgArea = areaMsgConf[betCode];
                if(msgArea == null || msgArea == ''){
                    msgArea = 'Cannot add ' + betCode + ' at this time';
                }

                showInfoMessage(msgArea);
            }
            else 
                return;
        }
        else{
            $("#total-win-val").html('--');
            if(!event.shiftKey && RemoverBets == false){

                betAreaAddChipClick(betCode, betType);
            }
            else{


                if(betCode == 'odp' && betType == 'odp' && (BetArray['odp'] == null || BetArray['odp'] == 0)){
 
                    betCode= 'dp';
                    betType= 'dp';
                }
 
                betAreaRemoveChipClick(betCode, betType);
            }
        }

    });

    $( ".click-area" ).mouseenter(function(event) {
        event.stopPropagation();
        $("#tip-msg").hide();

        var id = $(event.target).attr('id'); 
        var betCode = getBetAreaCode(id);
        var betType = $(event.target).attr('btype'); 
        var addChip = 1;

         

        if(betCode== 'dp'){
            if(Global.CP.cupo >= 4 && BetArray['dp'] != null && BetArray['dp'] > 0)
            {
                betCode = 'odp';
                betType = 'odp';
            }
        }

        $('#area-msg').html(areaMessage(betCode, betType));

        if(!canChangeBet(betCode, betType, addChip)){
            if(!useBetNotAllowMsg)
                return;
        }
        highLigthBetArea(id, true);
                
    });

    $( ".click-area" ).mouseleave(function(event) {
        event.stopPropagation();
        $("#tip-msg").hide();
        $('#area-msg').html("");

        var id = $(event.target).attr('id'); 
        var betCode = getBetAreaCode(id);
        var betType = $(event.target).attr('btype'); 
        var addChip = 1;

        if(betCode== 'dp'){
            if(Global.CP.cupo >= 4 && BetArray['dp'] != null && BetArray['dp'] > 0)
            {
                betCode = 'odp';
                betType = 'odp';
            }
        }

        if(!canChangeBet(betCode, betType, addChip)){
            if(!useBetNotAllowMsg)
                return;
        
        }
        highLigthBetArea(id, false);
        
    });

    $( "#r-btn" ).bind( method, function(event) {
        if(Rolling)
            return;

        $("#r-text-back").text("Contacting Server...");
        $("#r-btn").hide();
        callRoll();


    });
}

function areaMessage(BetCode, betType){
    var msg = "";
    var betNumber = null;
    if (BetCode[0] == 'o')
    {
        var betName = "";

        if(BetCode== 'opa')
            betName = 'Passline';
        else if(BetCode== 'odp')
            betName = "Don't Pass";
        else{
            betName = BetCode.substring(3);
            betNumber = betName;
            if(betType == "odo"){
                betName = "Don't Come " + betName;
            }else if(betType == "oco"){
                betName = "Come " + betName;
            }
        }

        msg = AreaMessageArray["OddsFor"].replace('~1', betName);
    } else if (("pa|dp|cm|dc|sv|ac|fd").indexOf(BetCode) >= 0) {

        msg = AreaMessageArray["bet_"+ BetCode];
    } else{
        betNumber = BetCode.substring(2);
        msg = AreaMessageArray["bet_" + betType].replace('~1', betNumber); 
    }   
    var paytOut = DefaultPayout(BetCode, betType, betNumber);
    var payText = "";
    if(paytOut != 0){
        var extra = ((betType == "by" || betType == "ly") ? " -5%vig.)" : ")"); 
        console.log("betType", betType, extra);
        payText = " ("+ paytOut + extra;
    }
    
    return msg + payText;
}

var Rolling = false;

function callRoll(){
    Rolling = true;

    stopResAnim();
    
    $("#total-win-val").html('--');

    if(calculateTotalBet(BetArray )>0 || calculateTotalBet(LastBetArray ) > 0 || Global.CP.cupo >= 4){
        if(fastPlay){
            $("#canvas").hide();
        }
        LastCupo = Global.CP.cupo;

        rollTopDices();
        RollAction.DoRollAction(processRollResult);
    }
    else{
        showInfoMessage("Please add some bets to the table");
        $("#r-btn").show();
        Rolling = false;
    }

}

function rollTopDices(){
    if(!fastPlay){
       $("#platform").show();
       $("#dices-top").css('opacity', 0); 
    }    
}

function stopResAnim(){
    $(".chips-number-res").stop();
    $(".chipres-area").html('');
}

function processRollResult(){

    $("#r-text-back").text("Processing...");

    var dado1 = Global.CP.d1;
    var dado2 = Global.CP.d2;
    
    $("#main").css("top", '30px');
    if(!fastPlay){
        $("#canvas").show();        
    }

    if(!fastPlay){
        diceRollingSound();
        Dice.rollDice(dado1, dado2);    
    }else{
        afterTableDiceAnim();
    } 
       
}


function afterTableDiceAnim(){
    
    var dado1 = Global.CP.d1;   
    var dado2 = Global.CP.d2;
    rollDiceTop(dado1, dado2);

    PlaySoundsNumberSounds(Global.CP.d1 , Global.CP.d2, Global.CP.cupo, LastCupo);

    animatePoint(Global.CP.cupo);
    refresBetsBasedOnResults();
    refresBetsBasedOnResponseBetsArray();

    if(parseInt(Global.CP.cupo) > -1){
        $('.bet-off-chip').remove();
    }


    UpdateVisualTotalBet();  
    UpdateVisualBalance(Global.Connector.bal);
    
    callingRoll = false;
    Rolling = false;
    $("#r-btn").show();
}


function highLigthBetArea(id,show){
    var betArea = getBetAreaCode(id);
    if(show){
        $('.'+betArea).show();
    }else{
        $('.'+betArea).hide();
    }
}


function refresBetsBasedOnResults(){
    var arrayKey = Object.keys(ResponseResultsArray);
    var keyLeng = arrayKey.length;

    if(keyLeng > 0){
        var totalPaid = 0;
        for(var i = 0; i < keyLeng; i++){
            var resultTemp = parseFloat(ResponseResultsArray[arrayKey[i]]);
            var currentBet = parseFloat(BetArray[arrayKey[i]]);
            
            BetArray[arrayKey[i]] = null;
            if((currentBet + resultTemp) > 0){
                totalPaid += (currentBet + resultTemp);                
            }
            var betType = getBetAreaType(arrayKey[i]);
            setVisualBetChips(0,arrayKey[i], betType);        
            setAndAnimteAreaResult(arrayKey[i], resultTemp);
        }
        if(totalPaid > 0)
            $("#total-win-val").html(formatWithThousandsPrecisionAndSymbol(totalPaid));
        else    
            $("#total-win-val").html('--');
    }
}

function reDrawBetArray(){
    var arrayKey = Object.keys(BetArray);
    var keyLeng = arrayKey.length;

    if(keyLeng > 0){


        for(var i = 0; i < keyLeng; i++){

            var betType = getBetAreaType(arrayKey[i]);

            setVisualBetChips(BetArray[arrayKey[i]],arrayKey[i], betType); 
                   
        }
    }

}

function refresBetsBasedOnResponseBetsArray(){
    var arrayKey = Object.keys(ResponseBetsArray);
    var keyLeng = arrayKey.length;
 //   console.log("refresBetsBasedOnResponseBetsArray>> ANTES BetArray", BetArray)
    LastBetArray = clone(BetArray);
    if(keyLeng > 0){


        for(var i = 0; i < keyLeng; i++){
            var resultTemp = parseFloat(ResponseBetsArray[arrayKey[i]]);
            var currentBet = parseFloat(BetArray[arrayKey[i]]);
            
            if(resultTemp != currentBet)
            {
                BetArray[arrayKey[i]] = resultTemp;
                //var betType = getBetAreaType(arrayKey[i]);
                //setVisualBetChips(BetArray[arrayKey[i]],arrayKey[i], betType); 
            }
                   
        }
    }

    //validate come bets
    var chipsMoving = false;
    if(LastBetArray['cm'] != null && LastBetArray['cm'] != "" && parseFloat(LastBetArray['cm']) > 0){
        var resultDice = parseInt(Global.CP.d1) + parseInt(Global.CP.d2); 
        var coBetCode = 'co'+ resultDice;
        var newBetAmount = BetArray[coBetCode];
        if(LastBetArray[coBetCode] != null || LastBetArray[coBetCode] != "" || parseFloat(LastBetArray[coBetCode]) <= 0){
            chipsMoving = true;
            var betType = getBetAreaType(coBetCode);

            setVisualBetChips(0,'cm',betType);
            setVisualBetChipsAnimation(newBetAmount, "chipbet-come-anim");
            animateComeBets(coBetCode, newBetAmount, betType);
            BetArray['cm'] = null;
        }
    }

    //validate come bets
    if(LastBetArray['dc'] != null && LastBetArray['dc'] != "" && parseFloat(LastBetArray['dc']) > 0){
        var resultDice = parseInt(Global.CP.d1) + parseInt(Global.CP.d2); 
        var coBetCode = 'do'+ resultDice;
        var newBetAmount = BetArray[coBetCode];
        if(LastBetArray[coBetCode] != null || LastBetArray[coBetCode] != "" || parseFloat(LastBetArray[coBetCode]) <= 0){
            chipsMoving = true;
            var betType = getBetAreaType(coBetCode);

            setVisualBetChips(0,'dc',betType);
            setVisualBetChipsAnimation(newBetAmount, "chipbet-dontcome-anim");
            animateDontComeBets(coBetCode, newBetAmount, betType);
            BetArray['dc'] = null;
        }
    }

    if(chipsMoving == true){
        var waitReDraw = setTimeout(function(){
            clearTimeout(waitReDraw);
            waitReDraw = null;
            reDrawBetArray();        
        },500);
    }else{
        reDrawBetArray(); 
    }
    
}



function animateComeBets(coBetCode, amount, betType){
    var posLeft = 887;
    var posTop = 381;
 
    switch (coBetCode) {
        case 'co4':
            posLeft = 701;
            posTop = 186;
            break;
        case 'co5':
            posLeft = 788;
            posTop = 186;
            break;
        case 'co6':
            posLeft = 880;
            posTop = 186;
            break;
        case 'co8':
            posLeft = 972;
            posTop = 186;
            break;
        case 'co9':
            posLeft = 1065;
            posTop = 186;
            break;
        case 'co10':
            posLeft = 1158;
            posTop = 186;
            break;
        default:
            posLeft = 887;
            posTop = 381;
            break;
    }
    
    $( "#chipbet-come-anim" ).animate({
        left: posLeft,
        top: posTop,
    }, 500, function(){
        clearComeAniElements();        
        setVisualBetChips(amount,coBetCode, betType); 
    } );
}

function clearComeAniElements(){
    $("#chipbet-come-anim").hide();
    document.getElementById("chipbet-come-anim").innerHTML = '';
    $("#chipbet-come-anim").css('top','381px');
    $("#chipbet-come-anim").css('left','887px');
}


function animateDontComeBets(doBetCode, amount, betType){
    var posLeft = 630;
    var posTop = 222;
 
    switch (doBetCode) {
        case 'do4':
            posLeft = 701;
            posTop = 101;
            break;
        case 'do5':
            posLeft = 788;
            posTop = 101;
            break;
        case 'do6':
            posLeft = 880;
            posTop = 101;
            break;
        case 'do8':
            posLeft = 972;
            posTop = 101;
            break;
        case 'do9':
            posLeft = 1065;
            posTop = 101;
            break;
        case 'do10':
            posLeft = 1158;
            posTop = 101;
            break;
        default:
            posLeft = 630;
            posTop = 222;
            break;
    }
    
    $( "#chipbet-dontcome-anim" ).animate({
        left: posLeft,
        top: posTop,
    }, 500, function(){
        clearDontComeAniElements();
        setVisualBetChips(amount,doBetCode, betType); 
    } );
}

function clearDontComeAniElements(){
    $("#chipbet-dontcome-anim").hide();
    document.getElementById("chipbet-dontcome-anim").innerHTML = '';
    $("#chipbet-dontcome-anim").css('top','222px');
    $("#chipbet-dontcome-anim").css('left','630px');
}


function showBetsOff(betType){
    if(Global.CP.cupo != -1)
        return;

    var oth_betsoff  = parseInt(Global.CP.oth_betsoff);

    if (oth_betsoff > 0) {
        if(["pw", "by", "oco"].indexOf(betType) >= 0)
            return true;
            //ponerle "off" a las apuestas con bettype ["pw", "by", "oco"]
        if (oth_betsoff > 1 && (["pl", "ly", "odo"].indexOf(betType) >= 0)) {
            return true;
           //ponerle "off" a las apuestas con bettype ["pl", "ly", "odo"]
        }
    }
    return false;
}

function animatePoint(number){
    var pos = 424;
    switch (parseInt(number)) {
        case 4:
            pos = 734;
            break;
        case 5:
            pos = 860;
            break;
        case 6:
            pos = 986;
            break;
        case 8:
            pos = 1106;
            break;
        case 9:
            pos = 1228;
            break;
        case 10:
            pos = 1343;
            break;
        default:
            pos = 424;
            break;
    }
    
    $( "#puck" ).animate({
        left: pos,
    }, 500 );
    if(number != -1){
        $( "#puck" ).addClass('puck-on');
    }else{
        $( "#puck" ).removeClass('puck-on');
    }
}

function setAndAnimteAreaResult(betArea, result){
 ///console.log("setAndAnimteAreaResult betArea, result", betArea, result)
    var displayResult = "";
    var numberClass = "";
    if(result > 0){
        displayResult = '+' + result;
        numberClass = "chips-number-win";
    }else if(result < 0){
        displayResult = '' + result;
        numberClass = "chips-number-lose";
    }else{
        displayResult = '';
        numberClass = "";
    }

    document.getElementById("chipres-res-" + betArea).innerHTML = '<span class="chips-number-res '+numberClass+'" id="chips-number-res-'+betArea+'">'+displayResult+'</span>';

    $("#chips-number-res-"+betArea).animate({
        top: "-=50",
        opacity: 0.7,
    }, (fastPlay?1000:2000), function(){
        document.getElementById("chipres-res-" + betArea).innerHTML = '';

    } );
}

function canChangeBet(BetCode, BetType, pChangeSign)// pChangeSign should be +1 or -1
{
	if (BetType == 'co') return false;
	if (BetType == 'do' && pChangeSign > 0) return false;
	if (Global.CP.cupo >= 4)
	{
		if (BetType == 'pa') return false;
		if (BetType == 'dp' && pChangeSign > 0) return false;
	}
	else if (['opa', 'odp', 'cm', 'dc'].indexOf(BetType) >= 0) return false;
	if (BetType[0] == 'o')
	{

		var parentbet = BetArray[BetCode.substring(1)];
		if (parentbet == null || parentbet.Amount == 0) return false;
	}
	return true;
}

function betAreaRemoveChipClick(betCode, betType){
    areaId = betCode;
    
    removeBetSound();
    var areCurrentChips = BetChipsArray[areaId];
   
    if( typeof(areCurrentChips) == "undefined" || areCurrentChips == null || areCurrentChips.length == 0)
        return;

    var topChipArr = areCurrentChips[areCurrentChips.length - 1];
    var chipValue =parseFloat(topChipArr[1]);
    //console.log(" betAreaRemoveChipClik areaId, areCurrentChips", areaId, areCurrentChips)

    if(chipValue != null && chipValue > 0){

        var currentBet = BetArray[areaId];

        if(currentBet == null || currentBet == undefined){
            return;
        }else{
            currentBet = parseFloat(currentBet) - chipValue;
        }
        currentBet = currentBet.toFixed(2);

        BetArray[areaId] = currentBet;
        LastBetArea = areaId;
        setVisualBetChips(currentBet,areaId, betType);

        UpdateVisualTotalBet();           
        LastBetArray.push([areaId,chipValue]);
        CompleteLastBetArray = new Array();
    }
    
}

function betAreaAddChipClick(betCode, betType){
    areaId = betCode;

    var chipValue = parseFloat(Global.CP.ChipValues[Global.CP.SelectedChipValue]); 
    if(betType == 'opa' || betType ==  'odp' ||  betType == 'odo' ||  betType == 'oco'){
        if(!validateOddsBetLimits(betCode, chipValue)){
            var maxTimes = (OddsMaxTimesBetArray[betCode] == null ? OddsMaxTimesBet : OddsMaxTimesBetArray[betCode]);

            showInfoMessage('Cannot add more than '  + maxTimes + 'x times ' + OddsBetNames[betCode]);
            return;
        }
    }


    if(validateTotalBetClickAction(chipValue) && chipValue > 0){

        var currentBet = BetArray[areaId];

        if(currentBet == null || currentBet == undefined){
            currentBet = chipValue;
        }else{
            currentBet = parseFloat(currentBet) + parseFloat(chipValue);
        }
        currentBet = currentBet.toFixed(2);
        betSound();
        BetArray[areaId] = currentBet;
        LastBetArea = areaId;
        setVisualBetChips(currentBet,areaId, betType);

        UpdateVisualTotalBet();           
        LastBetArray.push([areaId,chipValue]);
        CompleteLastBetArray = new Array();
    }    
}

function validateOddsBetLimits(betCode, addAmount)
{
    if(betCode[0] != 'o')
        return true;

    var currentOddBetAmount = BetArray[betCode];
    var parentBet = BetArray[betCode.substring(1)];

    var potentialBetAmount =  (currentOddBetAmount == null?0:currentOddBetAmount) + addAmount;

    var maxTimes = (OddsMaxTimesBetArray[betCode] == null ? OddsMaxTimesBet : OddsMaxTimesBetArray[betCode]);

    if((parentBet * maxTimes) >= potentialBetAmount)
        return true;
    else
        return false;
    //OddsMaxTimesBet

}

function getStringBets(){
    var betsTrings = '';
    
    var arrayKey = Object.keys(BetArray);
    var keyLeng = arrayKey.length;

    for(var i = 0; i < keyLeng; i++){
       var valueTemp = BetArray[arrayKey[i]];
       betsTrings += '&'+arrayKey[i]+ "="+valueTemp;
    }
    return betsTrings;
}



function getBetAreaCode(betAreaId){
    var betArea = betAreaId.replace('click-ba-','');
    betArea = betArea.replace('-P1','');
    betArea = betArea.replace('-P2','');
    betArea = betArea.replace('-P3','');
    betArea = betArea.replace('-V','');
    betArea = betArea.replace('-H','');
    return betArea;
}

function getBetAreaType(betAreaId){

    return $('.click-ba-'+betAreaId).attr('btype');   
}

function setVisualBetChips(amount, BetAreaId, betType) {
    var betArea = getBetAreaCode(BetAreaId);
    var tempAmount = amount;
    if (amount < 0) {
        amount = amount * -1;
    }

    if(amount == 0){//clear bet area
        document.getElementById("chipbet-ba-" + betArea).innerHTML = '';
        BetChipsArray[betArea] = null;
        return;
    }

    var chipsDistri = calculateChips(amount);

    if (chipsDistri == null || chipsDistri.length <= 0) {
        if (amount > 0) {
            return false;
        }
    }

    tempAmount = formatDisplayChips(tempAmount);//formatAmountDisplay(tempAmount);
    BetChipsArray[betArea] = chipsDistri;

    var hmtlCodeGen = "";
    var chipSet = "";
    var existDiv = false;

    var chipsSize = (ChipsSizeBet );
    var chipSpace = (ChipsSpaceBet);

    document.getElementById("chipbet-ba-" + betArea).innerHTML = '<ol reversed="reversed" class="chips-bet" id="chips-bet-'+betArea+'"></ol>';
    var topPercent = 1;
    for (var i = 0; i < chipsDistri.length; i++) {
        var tempArray = chipsDistri[i];
        var numChips = tempArray[0];
        for (var j = 1; j <= numChips; j++) {
            var newChip = $('<li><span></span></li>');
            newChip.css('top', topPercent + 'px');
            newChip.css('background', 'url(images/chips/' + tempArray[3]+') no-repeat top left');
            newChip.css('background-size', '35px 35px');
            newChip.css('-moz-background-size', '35px 35px');


            $("#chips-bet-"+betArea).append(newChip);
            $("#chips-bet-"+betArea+" li:last-child span").html(tempAmount);
            $("#chips-bet-"+betArea+" li:last-child span").css('font-size', (14) + "px")

            topPercent -= chipSpace;
        }
    }

    if(showBetsOff(betType) && amount > 0){
        var newChipOff = $('<li class="bet-off-chip"><span></span></li>');
        newChipOff.css('top', topPercent + 'px');
        newChipOff.css('background', 'url(images/chips/Off_gray.png) no-repeat top left');
        newChipOff.css('background-size', '35px 35px');
        newChipOff.css('-moz-background-size', '35px 35px');
        $("#chips-bet-"+betArea).append(newChipOff);
    }
}

//set chips for animations on COME and Dont COME bets
function setVisualBetChipsAnimation(amount, elementId) {

    var tempAmount = amount;
    if (amount < 0) {
        amount = amount * -1;
    }
    var chipsDistri = calculateChips(amount);

    if (chipsDistri == null || chipsDistri.length <= 0) {
        if (amount > 0) {
            return false;
        }
    }

    tempAmount = formatDisplayChips(tempAmount);//formatAmountDisplay(tempAmount);

    var hmtlCodeGen = "";
    var chipSet = "";
    var existDiv = false;

    var chipsSize = (ChipsSizeBet );
    var chipSpace = (ChipsSpaceBet);

    document.getElementById(elementId).innerHTML = '<ol reversed="reversed" class="chips-bet" id="chips-bet-'+elementId+'"></ol>';
    var topPercent = 1;
    for (var i = 0; i < chipsDistri.length; i++) {
        var tempArray = chipsDistri[i];
        var numChips = tempArray[0];
        for (var j = 1; j <= numChips; j++) {
            var newChip = $('<li><span></span></li>');
            newChip.css('top', topPercent + 'px');
            newChip.css('background', 'url(images/chips/' + tempArray[3]+') no-repeat top left');
            newChip.css('background-size', '35px 35px');
            newChip.css('-moz-background-size', '35px 35px');


            $("#chips-bet-"+elementId).append(newChip);
            $("#chips-bet-"+elementId+" li:last-child span").html(tempAmount);
            $("#chips-bet-"+elementId+" li:last-child span").css('font-size', (14) + "px")

            topPercent -= chipSpace;
        }
    }
    $("#"+elementId).show();
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



function loadChips(){
    var chipsArray = Global.Connector.showChips.split(',');
    Global.CP.ChipValues = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.CP.ChipValues.push(chipsArray[i]);
        }
    }

    if (Global.CP.ChipValues.length > 0) {
        Global.CP.SelectedChipValue = 0;

        var strHtml = '';
        
        var defaultCoin= (Global.Connector.cv !=null &&  Global.Connector.cv != "") ? Global.Connector.cv: 0;
        try{
            defaultCoin = parseFloat(defaultCoin);
        }catch(err){
            defaultCoin = 0;
        }
        for(var i=0; i < Global.CP.ChipValues.length; i++){
            var chipTempValue = Global.CP.ChipValues[i];

            var chipTempImage = null;
            if(i >= ChipsColors.length){
                chipTempImage = ChipsColors[0];
            }else{
                chipTempImage = ChipsColors[i];
            }
            if(parseFloat(chipTempValue) == defaultCoin)
            {
                Global.CP.SelectedChipValue = i;
            }

            GameChips[i] = [chipTempValue, chipTempValue, chipTempImage +'-Table.png'];

            var idEle = (i+1);
            strHtml += '<li><img id="chip-bet-'+idEle+'" src="images/chips/'+chipTempImage+'.png"></image><span id="chip-bet-value-'+idEle+'" class="chip-bet-value-label">'+chipTempValue+'</span></li>'
        }

        $("#chips-btns-container").html(strHtml);

        betChipsListeners();

        //btnsListeners();
        UpdateSelectedChip();
        
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
    TotalBet = calculateTotalBet(BetArray);
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - TotalBet;
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(tempBalance));
    }
}


function UpdateSelectedChip(){
    if(Global.CP.SelectedChipValue ==0){
        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.CP.SelectedChipValue == 1){
        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.CP.SelectedChipValue == 2){
        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.CP.SelectedChipValue == 3){
        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.CP.SelectedChipValue == 4){
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
        Global.CP.SelectedChipValue = 0;
        btnClickSound();
    });

    $( "#chip-bet-2,#chip-bet-value-2" ).click(function() {

        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.CP.SelectedChipValue = 1;
        btnClickSound();
    });


    $( "#chip-bet-3,#chip-bet-value-3" ).click(function() {

        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.CP.SelectedChipValue = 2;
        btnClickSound();
    });

    $( "#chip-bet-4,#chip-bet-value-4" ).click(function() {

        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.CP.SelectedChipValue = 3;
        btnClickSound();

    });

    $( "#chip-bet-5,#chip-bet-value-5" ).click(function() {
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        Global.CP.SelectedChipValue = 4;
        btnClickSound();
    });
}

function menuListeners(){

    $('#soundOffButton').click(function() { toggle_sound(); });
    $('#fastPlayButton').click(function() { toggle_fastPlay(); });

    $('#btn-add-remove').click(function() { toggle_AddRemovePlay(); });
        

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
        $(".even-roll").addClass('normal');
        $(".even-roll").removeClass('fast');
        $(".odd-roll").addClass('normal');
        $(".odd-roll").removeClass('fast');

    } else {
        fastPlay =true;
        $(".even-roll").addClass('fast');
        $(".odd-roll").addClass('fast');
        $(".odd-roll").removeClass('normal');
        $(".even-roll").removeClass('normal');
        
    }
    $('#fastPlayButton').toggleClass("on");
}

function toggle_AddRemovePlay(){
    $('#btn-add-remove').toggleClass("on");

    if ($('#btn-add-remove').hasClass("on")) {
        RemoverBets = true;
        $('#btn-add-remove').removeClass('btn-add-class');
        $('#btn-add-remove').addClass('btn-remove-class');
        $('#btn-add-remove').html('Removing Bets');

    } else {
        RemoverBets  = false;
        $('#btn-add-remove').addClass('btn-add-class');
        $('#btn-add-remove').removeClass('btn-remove-class');
        $('#btn-add-remove').html('Adding Bets');
        
    }
    
}



/*Sounds Logic CP*/

function PlaySoundsNumberSounds(d1 , d2, CurrentPoint, LastCupo){
    if (!fastPlay)
    {
        var dtot = parseInt(d1) + parseInt(d2);

        if (dtot < 4  || dtot > 11) TableSoundsCraps(dtot);
        else if (dtot == 11) TableSoundsYoEleven();
        else if (dtot == 7 && CurrentPoint >= 4) TableSoundsOutSeven(); // we use 'PointMaker.Instance.CurrentPoint' that still has the old value, not 'cupo'
        else if (dtot % 2 == 0)
        {
            if (d1 == d2) 
                TableSoundsHard(dtot);
            else {
                if(LastCupo == -1 && CurrentPoint != -1)
                    ThePointIs(dtot)
                else
                    TableSoundsEasy(dtot);   
            }
        }
        else{

            if(LastCupo == -1 && CurrentPoint != -1 )
                ThePointIs(dtot)
            else
                TableSoundsSayNumber(dtot);   
        } 
            
    }
}

function TableSoundsCraps(number){
    
    GameSounds["CRAPS_"] = SoundManager.PlayAudio("CRAPS_", false, function(){
        TableSoundsSayNumber(number);
    });
}

function TableSoundsSayNumber(number){

    GameSounds["NUMBER_"+number] = SoundManager.PlayAudio("NUMBER_"+number, false);
}

function TableSoundsYoEleven()
{
    GameSounds["YO_"] = SoundManager.PlayAudio("YO_", false, function(){
        TableSoundsSayNumber(11);
    });
}

function TableSoundsOutSeven()
{
    GameSounds["OUT_"] = SoundManager.PlayAudio("OUT_", false, function(){
        TableSoundsSayNumber(7);
    });
}

function TableSoundsHard(number){
    
    GameSounds["HARD_"] = SoundManager.PlayAudio("HARD_", false, function(){
        TableSoundsSayNumber(number);
    });
}


function TableSoundsEasy(number){
    
    GameSounds["EASY_"] = SoundManager.PlayAudio("EASY_", false, function(){
        TableSoundsSayNumber(number);
    });
}


function ThePointIs(number)
{
    GameSounds["POINTIS_"] = SoundManager.PlayAudio("POINTIS_", false, function(){
        TableSoundsSayNumber(number);
    });
}



function winSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("win", GameSounds["win"]);
    GameSounds["win"] = SoundManager.PlayAudio("win", false);
}

//Play the Card Sound
//Play the Card Sound
function betSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("bet", GameSounds["bet"]);
    GameSounds["bet"] = SoundManager.PlayAudio("bet", false);
}

function removeBetSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false);
}


function diceRollingSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("DICE_ROLLING", GameSounds["DICE_ROLLING"]);
    GameSounds["DICE_ROLLING"] = SoundManager.PlayAudio("DICE_ROLLING", false);
    SoundManager.StopAudio("DICE-shake", GameSounds["DICE-shake"]);
    GameSounds["DICE-shake"] = SoundManager.PlayAudio("DICE-shake", false);
    
}

function btnClickSound() {

    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false); 
}

function counterSound() {
    //if(fastPlay == true){return;}
    SoundManager.StopAudio("counting", GameSounds["counting"]);
    GameSounds["counting"] = SoundManager.PlayAudio("counting", false); 
}


function calculateTotalBet(arrayBets){
    var arrayKey = Object.keys(arrayBets);
    var keyLeng = arrayKey.length;
    var _totalBet = 0;

    for(var i = 0; i < keyLeng; i++){
       var valueTemp = arrayBets[arrayKey[i]];
       if(valueTemp==null)
            valueTemp = 0;
       try{
            _totalBet += parseFloat(valueTemp);
       }catch(err){}
    }

    return _totalBet;
}

function validateTotalBetClickAction(amount){
    if(IsBetTime){
        var totalBetCurrent =  calculateTotalBet(BetArray);             
        var totalBetPosible =  totalBetCurrent + amount;
        var currentBalance =   Global.Connector.bal - totalBetCurrent;
        var totalAvailable = Global.Connector.bal        
        if(totalBetPosible >  totalAvailable) {
            //showerror
            //blinkCreditsField();
            processLowCredits();
            return false;
        } else if(Global.Connector.availableBalance != null && Global.Connector.availableBalance != "" && _totalPendingSend > Global.Connector.availableBalance){
            showInfoMessage(decodeURIComponent(Global.Connector.blockNote));
            return false;
        } else if (totalBetPosible > Global.Connector.maxb){
            var maxBetMsg = LanguagesManager.getTranslationByKey('MaxBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.maxb)); 
            showInfoMessage(maxBetMsg);

            return false;
        } else if(totalBetPosible < Global.Connector.minb){
            var minBetMsg = LanguagesManager.getTranslationByKey('MinBet').replace('~1', formatWithThousandsNoDecimalZeros(Global.Connector.minb)); 
            showInfoMessage(minBetMsg);

            return false;
        }else{
            return true;
        }
    }else{
        return false;
    }
}

function formatDisplayChips(amount){   
    var num = 0;
    if(amount < 1 ){
        if( typeof(currencyObj.suffix) != "undefined"  && currencyObj.suffix != null && currencyObj.suffix != "")
            num = parseInt((amount * 100.00).toFixed(12)) + "" + currencyObj.suffix;
        else
            num = parseFloat(amount).toFixed(2)
        return num;
    }
    else if(amount >= 1000){
        if(amount % 1000 == 0){
            if( typeof(currencyObj.prefix) != "undefined"  && currencyObj.prefix != null && currencyObj.prefix != "")
                num = parseInt(amount/1000.00) + "K";
            else
                num = amount;
            return  num ;
        }else{
            if((amount % 1) == 0){
                num = parseInt(amount);
            }else{
                num = parseFloat(amount).toFixed(2); 
            }
            return num;
        }
    }
    else{
        if(Number.isInteger(amount))
            num = parseInt(amount);
        else
            num = parseFloat(amount).toFixed(2); 

        if((num % 1) == 0){
            num = parseInt(amount);
        }
        return num;
    }
}

function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
}

function setVisualBetChipsWin(amount) {

        var tempAmount = amount;
        if (amount < 0) {
            amount = amount * -1;
        }
        var chipsDistri = calculateChips(amount);
        if (chipsDistri == null || chipsDistri.length <= 0) {
            if (amount > 0) {
                return false;
            }
        }
        tempAmount = formatDisplayChips(tempAmount);//formatWithNoDecimalZeros(tempAmount);

        var hmtlCodeGen = "";
        var chipSet = "";
        var existDiv = false;

        var chipSpace = (ChipsSpaceBet) + 3;            

        //border: 1px red solid;
        hmtlCodeGen = '<div id="win-chip" class="win-coins '+ (isMobile.any()? "win-coins-mobile":"") +'" >';
        hmtlCodeGen += '<ol reversed="reversed" class="chips-win" id="chips-win"></ol>';
        hmtlCodeGen += '</div>';

        $("#global").append(hmtlCodeGen);



        var topPercent = 0;

        for (var i = 0; i < chipsDistri.length; i++) {
            var tempArray = chipsDistri[i];
            var numChips = tempArray[0];
            for (var j = 1; j <= numChips; j++) {
                var newChip = $('<li><span></span></li>');
                newChip.css('top', topPercent + 'px');
                newChip.css('left', (Math.floor((Math.random() * 3))) + 'px');
                newChip.css('background', 'url(images/chips/' + tempArray[3]+') no-repeat top left');
                newChip.css('background-size', '100% 100%');
                newChip.css('-moz-background-size', '100% 100%');


                $("#chips-win").append(newChip);
                $("#chips-win li:last-child span").html(tempAmount);

                topPercent -= chipSpace;
            }
        }
        return true;
    /*}
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);

        return false;
    }*/
}


function setChipsSizeValues() {
    var tableW = $("#mainPage").width();
    var tableH = $("#mainPage").height();

    var tempSize = (tableW > tableH)?tableH:tableW;

    tempSize = 500; //* scalechips;
    
    ChipsSizeBet = (tempSize * 0.08);
    ChipsSizeSpin = (tempSize * 0.10);
    ChipsSpaceSpin = 1.5;
    ChipsSpaceBet = 3;

}



function refreshWinFields(){
    /*refreshTotalBet();
    refreshCredits();
    showButtons();
    refreshTotalWin();*/
}





/* DICE ANIMATION */

function rollDiceTop(r1,r2) {
    if(!fastPlay){
       $("#platform").hide();
       $("#dices-top").css('opacity', 1); 
    }
    
    var dice = [...document.querySelectorAll(".die-list")];
    dice.forEach(die => {
      toggleClasses(die);
      if(die.id == 'die-1'){
        die.dataset.roll = r1;
      }        
      else{
        die.dataset.roll = r2;
      }
        
    });
  }
  
  function toggleClasses(die) {
    die.classList.toggle("odd-roll");
    die.classList.toggle("even-roll");
  }
  
  function getRandomNumber(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function blockMove(){
    
  }


function DefaultPayout(BetCode, BetType, BetNumber)
{
    if (BetCode == "pa") return     "1:1";//1.0;
    else if (BetCode == "dp") return "1:1";//1.0;
    else if (BetCode == "cm") return "1:1";//1.0;
    else if (BetCode == "dc") return "1:1";//1.0;
    else if (BetCode == "sv") return "4:1";//4.0;
    else if (BetCode == "ac") return "7:1";//7.0;
    else if (BetCode == "fd") return "2:1";//2.0;

    if (BetType == "co") return "1:1";//1.0;
    else if (BetType == "do") return "1:1";//1.0;
    else if (BetType == "bg") return "1:1";//1.0;
    
    var distto7 = Math.abs(7 - BetNumber);
    
    if (BetType == "hd")
    {
        if (distto7 == 3) return "7:1"; //7.0;
        else if (distto7 == 1) return "9:1";//9.0;
    }
    else if (BetType == "hn")
    {
        if (distto7 == 5) return "30:1";//30.0;
        else if (distto7 == 4) return "15:1";//15.0;
    }
    else if (BetType == "by" || BetType == "oco")
    {
        if (distto7 == 3) return "2:1"; //2.0;
        else if (distto7 == 2) return "3:2";//3.0/2.0;
        else if (distto7 == 1) return "6:5" ;//6.0/5.0;
    }
    else if (BetType == "ly" || BetType == "odo")
    {
        if (distto7 == 3) return "1:2";// 1.0/2.0;
        else if (distto7 == 2) return "2:3";// 2.0/3.0;
        else if (distto7 == 1) return "5:6" ;//5.0/6.0;
    }
    else if (BetType == "pw")
    {
        if (distto7 == 3) return "9:5" ;//9.0/5.0;
        else if (distto7 == 2) return "7:5";// 7.0/5.0;
        else if (distto7 == 1) return "7:6";// 7.0/6.0;
    }    
    else if (BetType == "pl")
    {
        if (distto7 == 3) return "5:11" ;//5.0/11.0;
        else if (distto7 == 2) return "5:8";// 5.0/8.0;
        else if (distto7 == 1) return "4:5" ;//4.0/5.0;
    }    
    return 0;
}