//Draw the close game
function drawCloseGame() {
    IsCallingServer = false;
    if (Global.PKPAI.result != 'B') {
        animateCardsDeal();

        setTimeout(function () {
            processResults();
        }, (fastPlay?100:2500));
    }
    else {
        GameStatus = PLAYING_GAME;
        showInfoMessage(LanguagesManager.getTranslationByKey('fld_HigherFrontNotAllowed'));

        $("#btn-house").show();
        $("#btn-play").hide();
        $("#btn-rebet").hide();
        $("#btn-deal").hide();
        $("#btn-clear").hide();
        $("#btn-play").hide();
        PlayCalled = false;
    }
}

//Remove Cards
function removeCards() {
    try {
        //Delete Cards
        $("#global .player-card").remove();
        $("#global .dealer-card").remove();

    }
    catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}


// houseWayButtonClick
function houseWayButtonClick() {
    if (!IsAnimatingHouseWay && !IsAnimatingDeal) {
        animateHouseWay();
    }
}

// playButtonClick
function playButtonClick() {
    if (!IsAnimatingHouseWay && !IsAnimatingDeal && !IsCallingServer) {
        PlayCalled = true;
        IsCallingServer = true;
        var handsCardsInfo = [];
        for (var cCard = 0; cCard < Global.PKPAI.PlayerBackCards.length; cCard++) {
            handsCardsInfo[cCard] = cardHandPosition("player-card-" + (cCard + 1)).IsBack ? 'B' : 'F';
        }

        CloseGameAction.HandInfo = handsCardsInfo;
        CloseGameAction.DoCloseGameAction(drawCloseGame);

        $("#btn-rebet").hide();
        $("#btn-deal").hide();
        $("#btn-clear").hide();
        $("#btn-house").hide();
        $("#btn-play").hide();
    }
}


// Enable or disable the Play Button
function enableDisablePlayButton() {
    if (Global.PKPAI.PlayerFrontCards[0][0] != '' && Global.PKPAI.PlayerFrontCards[1][0] != '' && !PlayCalled)  {
        $("#btn-play").show();
    }
    else {
        $("#btn-play").hide();
    }
}
 

/*******************************
*  CARDS ANIMATIONS
*******************************/

//Animate the game start deal
function animateCardsDeal() {
    IsAnimatingDeal = true;
    if (GameStatus == PLAYING_GAME) {
        //Player Cards
        var playerCard = 1;
        var animatePlayerCardInterval = setInterval(function () {
            if (playerCard <= Global.PKPAI.PlayerBackCards.length) {
                animatePlayerCard(playerCard);
            }
            else {
                clearInterval(animatePlayerCardInterval);
                IsAnimatingDeal = false;
                $("#btn-house").show();
            }
            ++playerCard;
        }, (fastPlay?10:300));

        //Dealer Cards
        setTimeout(function () {
            var dealerCard = 0;
            var animateDealerCardInterval = setInterval(function () {
                if (dealerCard < Global.PKPAI.DealerCards.length) {
                    animateDealerCard(dealerCard);
                }
                else {
                    clearInterval(animateDealerCardInterval);
                }
                ++dealerCard;
            }, (fastPlay?10:300));
        }, (fastPlay?10:200));
    }
    else if (GameStatus == WAITING_REBET) {
        //Dealer Cards
        var dealerCard = 0;
        var animateDealerCardInterval = setInterval(function () {
            if (dealerCard < Global.PKPAI.DealerCards.length) {
                animateDealerCard(dealerCard);
            }
            else {
                clearInterval(animateDealerCardInterval);
                IsAnimatingDeal = false;
                //enableDisableButtons(true);
            }
            ++dealerCard;
        }, (fastPlay?10:300));
    }
}

//Animate the player cards deal
function animatePlayerCard(cardNumber) {
    playCardSound();
    var newCard = $('<div href="#" id="player-card-' + cardNumber + '" class="player-card"></div>');
    $("#global").append(newCard);

    manageCardDragAndDrop(cardNumber);

    var blockHeight = $('#global').height();
    var blockWidth = $('#global').width();

    var topMove = parseFloat($("#player-back-card"+(cardNumber))[0].style.top)+24;

    //newCard.scale(0.7);
    newCard.animate({
        top: topMove +'%',
        left: $("#player-back-card"+(cardNumber))[0].style.left,
        height: 'toggle',
        scale: '+=0.3'
    }, (fastPlay?10:300), 'linear', function () {
        // Animation complete.
        $('#player-card-' + cardNumber).css('background', 'url(images/Cards/' + Global.PKPAI.PlayerBackCards[cardNumber - 1][1] + '.png) no-repeat top left');
        $('#player-card-' + cardNumber).css('background-size', '100% 100%');
        $('#player-card-' + cardNumber).css('-moz-background-size', '100% 100%');

        $('#player-card-' + cardNumber).animate({
            top: '-=24%',
            height: 'toggle'
        }, (fastPlay?5:50), function () {
            // Animation complete.
        });
    });
}

//Animate the start dealer cards
function animateDealerCard(cardNumber) {
    if (GameStatus == PLAYING_GAME) {
        var newCard = $('<div id="dealer-card-' + cardNumber + '" class="dealer-card"></div>');
        $("#global").append(newCard);

        var blockHeight = $('#global').height();
        var blockWidth = $('#global').width();
        var leftMove = 0;
        if(isMobile.any()){
            leftMove = cardNumber <= 4 ? 6 + (cardNumber * 7.7) : 7.5 + (cardNumber * 7.7);
        }else{
            leftMove = cardNumber <= 4 ? 14 + (cardNumber * 8.7) : 16.5 + (cardNumber * 8.7);
        }

        //newCard.scale(0.3);
        newCard.animate({
            top: '1%',
            left: leftMove + '%',
            scale: '+=0.7'
        }, (fastPlay?10:300), 'linear', function () {
            // Animation complete.
        });
    }
    else if (GameStatus == WAITING_REBET) {
        playCardSound();
        $("#dealer-card-" + cardNumber).hide();
        $("#dealer-card-" + cardNumber).css('background', 'url(images/Cards/' + Global.PKPAI.DealerCards[cardNumber] + '.png) no-repeat top left');
        $("#dealer-card-" + cardNumber).css('background-size', '100% 100%');
        $("#dealer-card-" + cardNumber).css('-moz-background-size', '100% 100%');
        $("#dealer-card-" + cardNumber).animate({
            width: 'toggle'
        }, (fastPlay?10:100), function () {
        });
    }
}

/*******************************
*  DRAG & DROP & HOUSE WAY
*******************************/
//After drop if the card dropped was in the Back Hand, must be updated the Back Cards Array and the GUI elements
function updateBackCardsAfterMove(cardMovedIndex) {
    if (cardMovedIndex > 0 && cardMovedIndex < Global.PKPAI.PlayerBackCards.length - 1) {
        var moveRight = cardMovedIndex >= 3 ? true : false;
        var currentCard = cardMovedIndex;
        var cardToAnimateId = '';
        var cardsRelocated = 0;

        if ((cardMovedIndex == 1 || cardMovedIndex == 2) && Global.PKPAI.PlayerBackCards[0][0] == '') {
            moveRight = true;
        }
        else if ((cardMovedIndex == 3 || cardMovedIndex == 4 || cardMovedIndex == 5) && Global.PKPAI.PlayerBackCards[6][0] == '') {
            moveRight = false;
        }

        while (currentCard > 0 && currentCard < Global.PKPAI.PlayerBackCards.length - 1) {
            var topMove = $("#player-back-card"+(currentCard + 1))[0].style.top;
            var leftMove = $("#player-back-card"+(currentCard + 1))[0].style.left;

            if (moveRight) {
                cardToAnimateId = Global.PKPAI.PlayerBackCards[currentCard + 1][0];
                Global.PKPAI.PlayerBackCards[currentCard] = Global.PKPAI.PlayerBackCards[currentCard + 1];
                Global.PKPAI.PlayerBackCards[currentCard + 1] = ['', '', ''];
                ++currentCard;
            }
            else {
                cardToAnimateId = Global.PKPAI.PlayerBackCards[currentCard - 1][0];
                Global.PKPAI.PlayerBackCards[currentCard] = Global.PKPAI.PlayerBackCards[currentCard - 1];
                Global.PKPAI.PlayerBackCards[currentCard - 1] = ['', '', ''];
                --currentCard;
            }

            $("#" + cardToAnimateId).css({ top: topMove, left: leftMove});
            ++cardsRelocated;
        }
    }
}

//Locate the card in the arrays and determine if is in the back or front hand
function cardHandPosition(cardId) {
    for (var cCard = 0; cCard < Global.PKPAI.PlayerBackCards.length; cCard++) {
        if (Global.PKPAI.PlayerBackCards[cCard][0] == cardId) {
            return { IsBack: true, Position: cCard };
        }
    }
    for (var cCard = 0; cCard < Global.PKPAI.PlayerFrontCards.length; cCard++) {
        if (Global.PKPAI.PlayerFrontCards[cCard][0] == cardId) {
            return { IsBack: false, Position: cCard };
        }
    }
    return null;
}

//When a drop were completed, must be updated the cards arrays and the GUI elements
function moveCards(wasBack, goFront, cardPrevArrayPosition, cardNewArrayPosition, cardStartTop, cardStartLeft) {
    playCardSound();
    var wasArray = wasBack ? Global.PKPAI.PlayerBackCards : Global.PKPAI.PlayerFrontCards;
    var goArray = goFront ? Global.PKPAI.PlayerFrontCards : Global.PKPAI.PlayerBackCards;

    var mustRelocateCard = false;
    var cardToRelocateId = "";

    if (goArray[cardNewArrayPosition][0] != '') {
        mustRelocateCard = true;
        cardToRelocateId = goArray[cardNewArrayPosition][0]
        var tempCardInfo = goArray[cardNewArrayPosition];
        goArray[cardNewArrayPosition] = wasArray[cardPrevArrayPosition];
        wasArray[cardPrevArrayPosition] = tempCardInfo;
    }
    else {
        goArray[cardNewArrayPosition] = wasArray[cardPrevArrayPosition];
        wasArray[cardPrevArrayPosition] = ['', '', ''];

        if (wasBack) {
            updateBackCardsAfterMove(cardPrevArrayPosition);
        }
    }

    if (mustRelocateCard) {
        //playCardSound();
        $("#" + cardToRelocateId).css({ top: cardStartTop, left: cardStartLeft });
    }

    if ((!wasBack || goFront) && !PlayCalled) {
        setTimeout(function(){
            enableDisablePlayButton();
        }, (fastPlay? 100: 2000));
        
    }
}

//Player Cards Drag & Drop
function manageCardDragAndDrop(cardNumber) {
    var startCardLeft = 0, startCardTop = 0;

    $("#player-card-" + cardNumber).on('click', function (e) {
        e.preventDefault();
        if(GameStatus == "WaitingRebet")
            return;

        if(!IsAnimatingCard){
            IsAnimatingCard = true;
            var cardLocation = cardHandPosition($(this).attr("id"));
            startCardLeft = $(this)[0].style.left; 
            startCardTop = $(this)[0].style.top; 
            //alert('Start Move: '+startCardLeft+' '+startCardTop +' - '+$("#player-front-card1")[0].style.top);

            if(cardLocation.IsBack){
                var cardNewArrayPosition = Global.PKPAI.PlayerFrontCards[0][0] == ''? 0:1;

                moveCards(cardLocation.IsBack, cardLocation.IsBack, cardLocation.Position, cardNewArrayPosition, startCardTop, startCardLeft);

                $("#player-card-" + cardNumber).animate({
                    top: $("#player-front-card"+(cardNewArrayPosition + 1))[0].style.top,
                    left: $("#player-front-card"+(cardNewArrayPosition + 1))[0].style.left
                    }, (fastPlay?10:200), 'linear', function () {
                        IsAnimatingCard = false;
                });
            } else{                    
                var cardNewArrayPosition = Global.PKPAI.PlayerBackCards[0][0] == ''? 0:6;

                moveCards(cardLocation.IsBack, cardLocation.IsBack, cardLocation.Position, cardNewArrayPosition, startCardTop, startCardLeft);

                $("#player-card-" + cardNumber).animate({
                    top: $("#player-back-card"+(cardNewArrayPosition + 1))[0].style.top,
                    left: $("#player-back-card"+(cardNewArrayPosition + 1))[0].style.left
                    }, (fastPlay?10:200), 'linear', function () {
                        IsAnimatingCard = false;
                });
            }
        }
    });
}

//Locate the card in the house way arrays and determine if is in the back or front hand
function houseWayCardHandPosition(cardImgId) {
    for (var cCard = 0; cCard < Global.PKPAI.PlayerBackCards.length; cCard++) {
        if (Global.PKPAI.PlayerBackCards[cCard][1] == cardImgId) {
            return { IsBack: true, CardName: Global.PKPAI.PlayerBackCards[cCard][0], Position: cCard };
        }
    }
    for (var cCard = 0; cCard < Global.PKPAI.PlayerFrontCards.length; cCard++) {
        if (Global.PKPAI.PlayerFrontCards[cCard][1] == cardImgId) {
            return { IsBack: false, CardName: Global.PKPAI.PlayerFrontCards[cCard][0], Position: cCard };
        }
    }
    return null;
}

//Animate the house Way
function animateHouseWay() {
    IsAnimatingHouseWay = true;
    var currentLeftPos = '', currentTopPos = '', newLeftPos = '', newTopPos = '';

    var cCard = 0;
    var animateFrontCards = setInterval(function () {
        //Move Front Cards
        if (cCard < Global.PKPAI.HouseWayFrontCards.length) {
            var cardInfo = houseWayCardHandPosition(Global.PKPAI.HouseWayFrontCards[cCard]);
            if (cardInfo.IsBack || cardInfo.Position != cCard) {
                var originFrontBackCardName = cardInfo.IsBack ? "#player-back-card" + (cardInfo.Position + 1) : "#player-front-card" + (cardInfo.Position + 1);
                currentLeftPos = $(originFrontBackCardName)[0].style.left;
                currentTopPos = $(originFrontBackCardName)[0].style.top;
                newLeftPos = $("#player-front-card" + (cCard + 1))[0].style.left;
                newTopPos = $("#player-front-card" + (cCard + 1))[0].style.top;
                moveCards(cardInfo.IsBack, true, cardInfo.Position, cCard, currentTopPos, currentLeftPos);
                $("#" + cardInfo.CardName).animate({
                    top: newTopPos,
                    left: newLeftPos
                }, (fastPlay?10:100), 'linear', function () {
                });
            }

            ++cCard;
        }
        else {
            clearInterval(animateFrontCards);

            cCard = 0;
            //Move Back Cards
            var animateBackCards = setInterval(function () {
                if (cCard < Global.PKPAI.HouseWayBackCards.length) {
                    var cardInfo = houseWayCardHandPosition(Global.PKPAI.HouseWayBackCards[cCard]);

                    if (cardInfo.Position != cCard + 1) {
                        var originFrontBackCardName = cardInfo.IsBack ? "#player-back-card" + (cardInfo.Position + 1) : "#player-front-card" + (cardInfo.Position + 1);
                        currentLeftPos = $(originFrontBackCardName)[0].style.left;
                        currentTopPos = $(originFrontBackCardName)[0].style.top;

                        newLeftPos = $("#player-back-card" + (cCard + 2))[0].style.left;
                        newTopPos = $("#player-back-card" + (cCard + 2))[0].style.top;

                        moveCards(true, false, cardInfo.Position, cCard + 1, currentTopPos, currentLeftPos);

                        $("#" + cardInfo.CardName).animate({
                            top: newTopPos,
                            left: newLeftPos
                        }, (fastPlay?10:100), 'linear', function () {
                        });
                    }
                    ++cCard;
                }
                else {
                    clearInterval(animateBackCards);
                    IsAnimatingHouseWay = false;

                    enableDisablePlayButton() ;
                 
                }
            }, (fastPlay?10:200));
        }
    }, (fastPlay?10:400));
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
        $("#btn-house").addClass("btn-house-mobile");
        $("#btn-play").addClass("btn-play-mobile");

        $("#error-message").addClass("message-box-mobile");
        $("#info-message").addClass("message-box-mobile");
        $("#nav-bar").addClass("nav-bar-mobile");
        $("#betContainer").addClass("betContainer-mobile");

        $("#chips-lbls-container").addClass("chips-lbls-container-mobile");
        $("#game-fields-container").addClass("game-fields-container-mobile");
    }else{
        $("#btn-house").addClass("btn-house-desk");        
    }
});

function afterPreload(){
    $("#PageContainerInner").show();
    resizeContainer();
    betAreaListeners();
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
    
    if(Global.PKPAI.PlayerBackCards != null  && Global.PKPAI.PlayerBackCards.length > 0 && Global.PKPAI.betAmt != null && Global.PKPAI.betAmt > 0){ //recovery Game
        MainBet = Global.PKPAI.betAmt;
        lastMainBet = MainBet;
        setVisualBetChips(MainBet,'bet1');
        GameStatus = PLAYING_GAME;
        UpdateVisualTotalBetNoBalanceEffect(MainBet);
        afterDeal();

    }else{
        processAutoPopupCashier();
    }

    if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
        startGetInfoMessage();  
    }
}

function loadChips(){
    var chipsArray = Global.Connector.showChips.split(',');
    Global.PKPAI.ChipValues = new Array();

    for (var i = 0; i < chipsArray.length; i++) {

        if (isNaN(parseFloat(chipsArray[i])) == false && chipsArray[i].trim().length > 0) {
            Global.PKPAI.ChipValues.push(chipsArray[i]);
        }
    }

    if (Global.PKPAI.ChipValues.length > 0) {
        Global.PKPAI.SelectedChipValue = 0;

        var strHtml = '';
        
        for(var i=0; i < Global.PKPAI.ChipValues.length; i++){
            var chipTempValue = Global.PKPAI.ChipValues[i];
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

    OpenGameAction.GameSession = Global.Connector.gameSession;
    OpenGameAction.LastGameId = 0;

    OpenGameAction.DoOpenGameAction(LoadLanguage); //descomentar cuando ya este pegado al server

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
    

    $( "#click-area-bets" ).click(function() {
        if (GameStatus == 'ShowingGame' || GameStatus == 'WaitingRebet' || GameStatus == 'Betting') {
            if(GameStatus == 'WaitingRebet' ){
                clearAction();
                
            }
            $("#btn-rebet").hide();
            var currentTotalBet = MainBet ;
            if(currentTotalBet != null && currentTotalBet > 0){
                $("#btn-deal").show();
                $("#btn-clear").show();
            }else{
                $("#btn-deal").hide();
                $("#btn-clear").hide();  
            }
      
            if(!SoundsLoaded){
                SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
                SoundManager.LoadSoundsInit(""); 
                SoundsLoaded = true;
            }            

            var chipValue = parseFloat(Global.PKPAI.ChipValues[Global.PKPAI.SelectedChipValue]);

            var tempTotalBet = MainBet + chipValue;

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
            MainBet += chipValue;            
            currentTotalBet = MainBet ;
            if(currentTotalBet != null && currentTotalBet > 0){
                $("#btn-deal").show();
                $("#btn-clear").show();
            }else{
                $("#btn-deal").hide();
                $("#btn-clear").hide();  
            }
            UpdateVisualTotalBet();
            setVisualBetChips(MainBet,'bet1');
            GameStatus = 'Betting';
        }
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
    TotalBet = MainBet ;
    if(typeof(TotalBet) == "undefined" || TotalBet == null || TotalBet.length == 0 || TotalBet == 0){
        $("#total-bet-val").text("--");
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(TotalBet));
        var tempBalance = Global.Connector.bal - TotalBet;
        $("#credits-val").text(formatWithThousandsPrecisionAndSymbol(tempBalance));
    }
}

function UpdateVisualTotalBetNoBalanceEffect(_MainBet){
    var tempTotalBet = _MainBet;
    if(typeof(tempTotalBet) == "undefined" || tempTotalBet == null || tempTotalBet.length == 0 || tempTotalBet == 0){
        $("#total-bet-val").text("--");
    }else{
        $("#total-bet-val").text(formatWithThousandsNoDecimalZeros(tempTotalBet));
    }
}

function UpdateSelectedChip(){
    if(Global.PKPAI.SelectedChipValue ==0){
        $("#chip-bet-1").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PKPAI.SelectedChipValue == 1){
        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PKPAI.SelectedChipValue == 2){
        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PKPAI.SelectedChipValue == 3){
        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
    }else if(Global.PKPAI.SelectedChipValue == 4){
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
        Global.PKPAI.SelectedChipValue = 0;
        btnClickSound();
    });

    $( "#chip-bet-2,#chip-bet-value-2" ).click(function() {

        $("#chip-bet-2").addClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PKPAI.SelectedChipValue = 1;
        btnClickSound();
    });


    $( "#chip-bet-3,#chip-bet-value-3" ).click(function() {

        $("#chip-bet-3").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PKPAI.SelectedChipValue = 2;
        btnClickSound();
    });

    $( "#chip-bet-4,#chip-bet-value-4" ).click(function() {

        $("#chip-bet-4").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        $("#chip-bet-5").removeClass('chips-btns-selected');
        Global.PKPAI.SelectedChipValue = 3;
        btnClickSound();

    });

    $( "#chip-bet-5,#chip-bet-value-5" ).click(function() {
        $("#chip-bet-5").addClass('chips-btns-selected');
        $("#chip-bet-2").removeClass('chips-btns-selected');
        $("#chip-bet-3").removeClass('chips-btns-selected');
        $("#chip-bet-4").removeClass('chips-btns-selected');
        $("#chip-bet-1").removeClass('chips-btns-selected');
        Global.PKPAI.SelectedChipValue = 4;
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
    MainBet = 0;
    TotalBet = 0;
    Global.PKPAI.resultAmt = null;
    Global.PKPAI.result = null;
    removeCards();
    removeChips(true);
    UpdateVisualTotalBet();
    $("#total-win-val").html("--");
}

var lastMainBet = null;

function rebetAction(){
    clearAction();
    $("#btn-rebet").hide();
    $("#btn-deal").hide();
    $("#btn-clear").hide();
    $("#btn-house").hide();
    $("#btn-play").hide();

    MainBet = lastMainBet;

    TotalBet = MainBet;
    if(TotalBet > Global.Connector.bal){
        processLowCredits();
        return;
    }

    setVisualBetChips(MainBet, 'bet1');

    UpdateVisualTotalBet();

    var dealTimeout = setTimeout(function(){
        clearTimeout(dealTimeout);
        dealTimeout = null;
        dealAction();
    },1000);
}

function dealAction(){
    //validate deal
    PlayCalled = false;
    if(validateBet(0)){
        $("#btn-deal").hide();
        $("#btn-clear").hide();
        GameStatus = 'Dealing';

        OpenGameAction.BetAmt = null;
    
        if (MainBet > 0) {
            OpenGameAction.BetAmt = MainBet;
        }else{
            OpenGameAction.BetAmt = 0;
        }        

        lastMainBet = MainBet;

        OpenGameAction.DoOpenGameAction(afterDeal);
    }
}

function afterDeal(){
    animateCardsDeal();
}

function afterCall(){
    drawDealerCards();
}

function validateBet(coinValue){

    var tempTotalBet = MainBet + coinValue;

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

function isHidden(el) {
    var style = window.getComputedStyle(el);
    return (style.display === 'none')
}

function btnsListeners(){

    $( "#btn-deal" ).click(function() {
        btnClickSound();
        dealAction();
        try{
            SoundManager.StopAudio("counting", GameSounds["counting"]);
        }catch(exp){}
    });

    $( "#btn-clear" ).click(function() {
        btnClickSound();
        clearAction();
        $("#btn-rebet").hide();
        $("#btn-deal").hide();
        $("#btn-clear").hide();
        $("#btn-house").hide();
        $("#btn-play").hide();
        try{
            SoundManager.StopAudio("counting", GameSounds["counting"]);
        }catch(exp){}
    });

    $( "#btn-house" ).click(function() {    
        btnClickSound();    
        $("#btn-play").hide();
        houseWayButtonClick();
    });

    $( "#btn-play" ).click(function() {  
        btnClickSound();      
        $("#btn-takeDown").hide();
        $("#btn-allIn").hide();
        $("#btn-letItRide").hide();
        playButtonClick();
        if(!SoundsLoaded){
            SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
            SoundManager.LoadSoundsInit(""); 
            SoundsLoaded = true;
        }
    });

    $( "#btn-rebet" ).click(function() {
        btnClickSound();
        rebetAction();
        try{
            SoundManager.StopAudio("counting", GameSounds["counting"]);
        }catch(exp){}
    }); 
}
function fillPayouts(){
}


function animateChipsWinPK() {
    if (Global.PKPAI.resultAmt > 0) {

        var totalChipsPP = parseFloat(Global.PKPAI.resultAmt);
        setVisualBetChips(totalChipsPP, 'bet1');

        setTimeout(function () {
            animateChip('bet1', '+=37%', '-=35%', '+=0.2');
        }, 300);
    }
    else {
        setVisualBetChips((MainBet), 'bet1');
        animateChip('bet1', '-=60%', '+=0%', '-=0.3');                   
    }
}

//Remove Cards
function removeCards() {
    try {
        //Delete Cards
        $(".dealer-card").remove();
        $(".player-card").remove();

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
function playCardSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("card-sound-player", GameSounds["card-sound-player"]);
    GameSounds["card-sound-player"] = SoundManager.PlayAudio("card-sound-player", false);
}


function btnClickSound() {
    SoundManager.StopAudio("btn-click", GameSounds["btn-click"]);
    GameSounds["btn-click"] = SoundManager.PlayAudio("btn-click", false); 
}

function counterSound() {
    if(fastPlay == true){return;}
    SoundManager.StopAudio("counting", GameSounds["counting"]);
    GameSounds["counting"] = SoundManager.PlayAudio("counting", false); 
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

            ThirdBet = MainBet = SecondBet = 0;
        }
        setVisualBetChips(0,'bet1');
        setVisualBetChips(0,'bet2');
        setVisualBetChips(0,'bet3');
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

function processResults(){

    if(Global.PKPAI.resultAmt > 0){
        counterSound();
        $("#total-win-val").html(formatWithThousandsNoDecimalZeros(Global.PKPAI.resultAmt));
    }else{
        $("#total-win-val").html('--');
    }

    UpdateVisualBalance(Global.Connector.bal);

    animateChipsWinPK();

    setTimeout(function(){
        if(lastMainBet != null)
            $("#btn-rebet").show();
        $("#btn-clear").show();
        GameStatus = 'WaitingRebet';
        try{
            SoundManager.StopAudio("counting", GameSounds["counting"]);
        }catch(exp){}

        if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
            startGetInfoMessage();  
        }

    },(fastPlay?1:500));
}

function animateChip(betArea, top, left, scale) {
    try {
        $('.bet-chip-' + betArea).each(function (index) {
            $(this).animate({
                top: top,
                left: left,
                scale: scale
            }, (fastPlay?1:500), function () {
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