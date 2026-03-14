function CGame(oData){
    var _bUpdate = false;
    var _bFold;
    var _bPairPlus;
    var _bDealerQualified;
    var _iTimeElaps;
    var _iMaxBet;
    var _iState;
    var _iCurIndexDeck;
    var _iCardIndexToDeal;
    var _iGameCash;
    var _iTotWin;
    var _iAnteBonusWin;
    var _iTotWinPairPlus;
    var _iCurDealerCardShown;
    var _iHandDealer;
    var _iHandPlayer;
    var _iAdsCounter;
    var _szHandResult;
    var _oActionAfterHandReset;
    
    var _aCardsDealing;
    var _aCardsInCurHandForDealer;
    var _aCardDeck;
    var _aCardsInCurHandForPlayer;
    var _aCurActiveCardOffset;
    var _aPlayerCardsInfo;
    var _aDealerCardsInfo;
    var _aPlayerCardsSnapshot;
    var _aDealerCardsSnapshot;
    var _pStartingPointCard;
    
    var _oPlayerHandEvaluation;
    var _oDealerHandEvaluation;
    var _oRoundSummary;

    var _oStartingCardOffset;
    var _oDealerCardOffset;
    var _oReceiveWinOffset;
    var _oFichesDealerOffset;
    var _oRemoveCardsOffset;
    var _oCardContainer;
    var _oHandEvaluator;
    var _oHelpCursorAnte;
    
    var _oBg;
    var _oInterface;
    var _oSeat;
    var _oMsgBox;
    var _oGameOverPanel;
    
    this._init = function(){
        _iMaxBet = MAX_BET;
        _iState = -1;
        _iTimeElaps = 0;
        _iAdsCounter = 0;
        _iCurIndexDeck = 0;
        

        s_oTweenController = new CTweenController();
        
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        s_oStage.addChild(_oBg);

        _oInterface = new CInterface(TOTAL_MONEY);
        
        _oCardContainer = new createjs.Container();
        s_oStage.addChild(_oCardContainer);
        
        _oHandEvaluator = new CHandEvaluator();
        
        _oSeat = new CSeat();
        _oSeat.setCredit(TOTAL_MONEY);
        
        _oHelpCursorAnte = new CHelpCursor(636,436,s_oSpriteLibrary.getSprite("help_cursor"),s_oStage);
        
        this.reset(false);

        _oStartingCardOffset = new CVector2();
        _oStartingCardOffset.set(1214,228);
        
        _oDealerCardOffset = new CVector2();
        _oDealerCardOffset.set(CANVAS_WIDTH/2 - 119,230);
        
        _oReceiveWinOffset = new CVector2();
        _oReceiveWinOffset.set(418,820);
        
        _oFichesDealerOffset = new CVector2();
        _oFichesDealerOffset.set(0,-CANVAS_HEIGHT);
        
        _oRemoveCardsOffset = new CVector2(454,230);
        
        _aCurActiveCardOffset=new Array(_oSeat.getCardOffset(),_oDealerCardOffset);

	_oGameOverPanel = new CGameOver();

        if(_oSeat.getCredit()<FICHES_VALUE[0]){
            this._gameOver();
            this.changeState(-1);
        }else{
            _bUpdate = true;
        }
        
        _pStartingPointCard = new CVector2(_oStartingCardOffset.getX(),_oStartingCardOffset.getY());
        
        _oMsgBox = new CMsgBox();

        this.changeState(STATE_GAME_WAITING_FOR_BET);
    };
    
    this.unload = function(){
	_bUpdate = false;

        for(var i=0;i<_aCardsDealing.length;i++){
            _aCardsDealing[i].unload();
        }
        
        _oInterface.unload();
        _oGameOverPanel.unload();
        _oMsgBox.unload();
        s_oStage.removeAllChildren();
    };
    
    this.reset = function(bRebet){
        _iTimeElaps=0;
        _iCurIndexDeck = 0;
        _iCardIndexToDeal=0;
        _bPairPlus = false;
        _bFold = false;
        _bDealerQualified = false;
        _szHandResult = "";
        _iTotWin = 0;
        _iAnteBonusWin = 0;
        _iTotWinPairPlus = 0;
        _oPlayerHandEvaluation = null;
        _oDealerHandEvaluation = null;
        _oRoundSummary = null;
        _oSeat.reset();

        _aCardsDealing=new Array();
        _aCardsDealing.splice(0);

        _aCardsInCurHandForDealer = new Array();
        _aCardsInCurHandForPlayer = new Array();
        _aPlayerCardsInfo = new Array();
        _aDealerCardsInfo = new Array();
        _aPlayerCardsSnapshot = new Array();
        _aDealerCardsSnapshot = new Array();
        
        _oInterface.reset();

        _oInterface.enableBetFiches(bRebet);

        this.shuffleCard();
    };
    
    this.setCredit = function(iMoney){
        _oSeat.setCredit(iMoney);
        _oInterface.refreshCredit(_oSeat.getCredit());
    };
    
    this.shuffleCard = function(){
        _aCardDeck=new Array();
        _aCardDeck=s_oGameSettings.getShuffledCardDeck();
    };
    
    this.changeState = function(iState){
        _iState=iState;
        
        switch(iState){
            case STATE_GAME_WAITING_FOR_BET:{
                    _oInterface.displayMsg(TEXT_DISPLAY_MSG_WAITING_BET,TEXT_MIN_BET+": "+MIN_BET + "\n" + TEXT_MAX_BET+": "+MAX_BET);
                    break;
            }
            case STATE_GAME_DEALING:{
                    _oInterface.disableButtons();
                    _oInterface.displayMsg(TEXT_DISPLAY_MSG_DEALING);
                    this._dealing();
                    break;
            }
        }
    };

    this.cardFromDealerArrived = function(oCard,bDealerCard,iCount){
        if(bDealerCard === false ){
            oCard.showCard();
        }
        
        if(iCount<CARD_TO_DEAL*2){
            s_oGame._dealing();
        }
    };
    
    this._cloneCardsInfo = function(aCards){
        var aClone = new Array();
        for(var i=0; i<aCards.length; i++){
            aClone.push({
                fotogram: aCards[i].fotogram,
                rank: aCards[i].rank,
                suit: aCards[i].suit
            });
        }

        return aClone;
    };

    this._drawNextCard = function(){
        var oCardInfo = {
            fotogram: _aCardDeck[_iCurIndexDeck].fotogram,
            rank: _aCardDeck[_iCurIndexDeck].rank,
            suit: _aCardDeck[_iCurIndexDeck].suit
        };

        _iCurIndexDeck++;
        this._checkDeckLength();

        return oCardInfo;
    };

    this._drawRoundCards = function(){
        var aPlayerCards = new Array();
        var aDealerCards = new Array();

        for(var i=0; i<CARD_TO_DEAL; i++){
            aPlayerCards.push(this._drawNextCard());
            aDealerCards.push(this._drawNextCard());
        }

        return {
            player: aPlayerCards,
            dealer: aDealerCards
        };
    };

    this._getPairPlusMultiplier = function(iHandValue){
        if(iHandValue >= 0 && iHandValue < PAYOUT_PLUS.length){
            return PAYOUT_PLUS[iHandValue];
        }

        return 0;
    };

    this._getAnteBonusMultiplier = function(iHandValue){
        if(iHandValue >= 0 && iHandValue < PAYOUT_ANTE.length){
            return PAYOUT_ANTE[iHandValue];
        }

        return 0;
    };

    this._getMainResultLabel = function(szResult){
        switch(szResult){
            case "player":
                return "Player";
            case "dealer":
                return "Dealer";
            case "standoff":
                return "Tie";
            case "dealer_no_hand":
                return "Dealer Not Qualified";
            case "fold":
                return "Fold";
            default:
                return "Unknown";
        }
    };

    this._getPlayerOutcomeLabel = function(iNetResult){
        if(iNetResult > 0){
            return "Win";
        }

        if(iNetResult < 0){
            return "Lose";
        }

        return "Push";
    };

    this._rankToText = function(iHandValue){
        return TEXT_EVALUATOR[iHandValue] || "";
    };

    this._rankToCardCode = function(iRank){
        switch(iRank){
            case CARD_ACE:
                return "A";
            case CARD_KING:
                return "K";
            case CARD_QUEEN:
                return "Q";
            case CARD_JACK:
                return "J";
            default:
                return String(iRank);
        }
    };

    this._suitToCardCode = function(iSuit){
        switch(iSuit){
            case 0:
                return "H";
            case 1:
                return "D";
            case 2:
                return "C";
            case 3:
                return "S";
            default:
                return "H";
        }
    };

    this._cardsToCodes = function(aCards){
        var aCodes = new Array();
        for(var i=0; i<aCards.length; i++){
            aCodes.push(this._rankToCardCode(aCards[i].rank) + this._suitToCardCode(aCards[i].suit));
        }
        return aCodes;
    };

    this._resolveRoundSummary = function(){
        var iAnteBet = _oSeat.getBetAnte();
        var iPairPlusBet = _oSeat.getBetPlus();
        var iPlayBet = _bFold ? 0 : _oSeat.getBetPlay();
        var iPairPlusMultiplier = this._getPairPlusMultiplier(_iHandPlayer);
        var iAnteBonusMultiplier = _bFold ? 0 : this._getAnteBonusMultiplier(_iHandPlayer);
        var iPairPlusReturn = 0;
        var iAnteReturn = 0;
        var iPlayReturn = 0;
        var iAnteBonusReturn = 0;
        var szMainResult = "fold";
        var szPlayerOutcome;

        if(iPairPlusBet > 0 && iPairPlusMultiplier > 0){
            iPairPlusReturn = (iPairPlusBet * iPairPlusMultiplier) + iPairPlusBet;
        }

        if(iAnteBonusMultiplier > 0){
            iAnteBonusReturn = iAnteBet * iAnteBonusMultiplier;
        }

        if(!_bFold){
            if(!_bDealerQualified){
                szMainResult = "dealer_no_hand";
                iAnteReturn = iAnteBet * 2;
                iPlayReturn = iPlayBet;
            }else{
                szMainResult = _oHandEvaluator.getWinnerComparingHands(
                    _oPlayerHandEvaluation.sort_hand,
                    _oDealerHandEvaluation.sort_hand,
                    _iHandPlayer,
                    _iHandDealer,
                    _oPlayerHandEvaluation.tiebreak,
                    _oDealerHandEvaluation.tiebreak
                );

                if(szMainResult === "player"){
                    iAnteReturn = iAnteBet * 2;
                    iPlayReturn = iPlayBet * 2;
                }else if(szMainResult === "standoff"){
                    iAnteReturn = iAnteBet;
                    iPlayReturn = iPlayBet;
                }
            }
        }else{
            iAnteBonusReturn = 0;
        }

        _szHandResult = szMainResult;
        _iTotWin = parseFloat((iAnteReturn + iPlayReturn).toFixed(2));
        _iAnteBonusWin = parseFloat(iAnteBonusReturn.toFixed(2));
        _iTotWinPairPlus = parseFloat(iPairPlusReturn.toFixed(2));

        var iTotalWager = parseFloat((iAnteBet + iPairPlusBet + iPlayBet).toFixed(2));
        var iTotalReturn = parseFloat((_iTotWin + _iAnteBonusWin + _iTotWinPairPlus).toFixed(2));
        var iNetResult = parseFloat((iTotalReturn - iTotalWager).toFixed(2));
        var iFinalBalance = parseFloat((_oSeat.getCredit() + iTotalReturn).toFixed(2));
        var aPlayerCards = this._cardsToCodes(_aPlayerCardsSnapshot);
        var aDealerCards = this._cardsToCodes(_aDealerCardsSnapshot);

        szPlayerOutcome = this._getPlayerOutcomeLabel(iNetResult);

        _oRoundSummary = {
            action: _bFold ? "fold" : "play",
            folded: _bFold,
            mainResult: szMainResult,
            mainResultLabel: this._getMainResultLabel(szMainResult),
            playerOutcome: szPlayerOutcome,
            dealerQualified: _bDealerQualified,
            playerHand: this._rankToText(_iHandPlayer),
            dealerHand: this._rankToText(_iHandDealer),
            playerCards: aPlayerCards,
            dealerCards: aDealerCards,
            bets: {
                ante: iAnteBet,
                play: iPlayBet,
                pairPlus: iPairPlusBet
            },
            payoutBreakdown: {
                ante: {
                    bet: iAnteBet,
                    action: _bFold ? "lose" : (!_bDealerQualified || szMainResult === "player" ? "win" : (szMainResult === "standoff" ? "push" : "lose")),
                    returnAmount: iAnteReturn,
                    payout: Math.max(0, iAnteReturn - iAnteBet)
                },
                play: {
                    bet: iPlayBet,
                    action: _bFold ? "not_placed" : (!_bDealerQualified ? "push" : (szMainResult === "player" ? "win" : (szMainResult === "standoff" ? "push" : "lose"))),
                    returnAmount: iPlayReturn,
                    payout: iPlayBet > 0 ? Math.max(0, iPlayReturn - iPlayBet) : 0
                },
                pairPlus: {
                    bet: iPairPlusBet,
                    hand: this._rankToText(_iHandPlayer),
                    multiplier: iPairPlusMultiplier,
                    action: iPairPlusReturn > 0 ? "win" : (iPairPlusBet > 0 ? "lose" : "not_placed"),
                    returnAmount: iPairPlusReturn,
                    payout: iPairPlusReturn > 0 ? iPairPlusReturn - iPairPlusBet : 0
                },
                anteBonus: {
                    multiplier: iAnteBonusMultiplier,
                    action: iAnteBonusReturn > 0 ? "win" : (_bFold ? "forfeit" : "lose"),
                    returnAmount: iAnteBonusReturn,
                    payout: iAnteBonusReturn
                }
            },
            totalWager: iTotalWager,
            totalReturn: iTotalReturn,
            netResult: iNetResult,
            finalBalance: iFinalBalance,
            resolvedAt: new Date().toISOString()
        };
    };
    
    this._showWin = function(){
        if(_oRoundSummary === null){
            this._resolveRoundSummary();
        }

	if(_bFold){
		this._playerLose(true);
        }else if(_szHandResult === "player" && _iHandPlayer <= STRAIGHT){
            this._playerWin(TEXT_HAND_WON_PLAYER);
        }else if(!_bDealerQualified){
                this._playerWin(TEXT_DISPLAY_MSG_NOT_QUALIFY);
        }else if(_szHandResult === "player"){
            this._playerWin(TEXT_HAND_WON_PLAYER);
        }else if(_szHandResult === "dealer"){
                this._playerLose();
        }else{
            this._standOff();
        }

        if(_oRoundSummary.netResult > 0){
            playSound("win", 1, false);
        }else{
            playSound("lose", 1, false);
        }

        // BetterDR: submit bet immediately after hand settles so the server
        // balance is confirmed before the next betting phase opens (~3 s later).
        if (typeof window.__3cp_onHandEnd === 'function') {
            window.__3cp_onHandEnd({
                newCredit: _oSeat.getCredit(),
                handResult: _szHandResult,
                folded: _bFold,
                round: _oRoundSummary
            });
        }
        $(s_oMain).trigger("save_score", [_oSeat.getCredit()]);

        this.changeState(STATE_GAME_DISTRIBUTE_FICHES);
        _oInterface.refreshCredit(_oSeat.getCredit());

        setTimeout(function(){
                            _oSeat.resetBet();
                            s_oGame.changeState(STATE_GAME_WAITING_FOR_BET);
                            _oInterface.enableBetFiches(true);
                        },TIME_CARD_REMOVE*3);
    };
    
    this._playerWin = function(szText){
        var iWinAmount = _iTotWin+_iAnteBonusWin;
        
        _oSeat.increaseCredit(iWinAmount);
        _iGameCash -= iWinAmount;
        _oInterface.displayMsg(TEXT_DISPLAY_MSG_SHOWDOWN,TEXT_DISPLAY_MSG_PLAYER_WIN + " " + iWinAmount + TEXT_CURRENCY);
        
       
        _oSeat.initMovement(BET_ANTE,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        _oSeat.initMovement(BET_PLAY,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        
        this._checkPlusWin();
        
        _oInterface.showResultText(szText);
    };

    this._playerLose = function(bFold){
        
        _oInterface.displayMsg(TEXT_DISPLAY_MSG_SHOWDOWN,TEXT_DISPLAY_MSG_PLAYER_LOSE);
        if(_iAnteBonusWin>0){
            _oSeat.increaseCredit(_iAnteBonusWin);
            _iGameCash -= _iAnteBonusWin;
            _oSeat.initMovement(BET_ANTE,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        }else{
            _oSeat.initMovement(BET_ANTE,_oFichesDealerOffset.getX(),_oFichesDealerOffset.getY());
        }
        
        
        if(!bFold){
            _oSeat.initMovement(BET_PLAY,_oFichesDealerOffset.getX(),_oFichesDealerOffset.getY());
        }
        
        this._checkPlusWin();
        
        _oInterface.showResultText(bFold ? TEXT_FOLD : TEXT_HAND_WON_DEALER);
    };
    
    this._standOff = function(){
        var iWinAmount = _iTotWin+_iAnteBonusWin;
        
        _oSeat.increaseCredit(iWinAmount);
        _iGameCash -= iWinAmount;
        
        _oInterface.displayMsg(TEXT_DISPLAY_MSG_SHOWDOWN,TEXT_DISPLAY_MSG_STANDOFF);
        _oSeat.initMovement(BET_ANTE,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        _oSeat.initMovement(BET_PLAY,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        
        this._checkPlusWin();
        
        _oInterface.showResultText(TEXT_DISPLAY_MSG_STANDOFF);
    };
    
    this._checkPlusWin = function(){
        if(_iTotWinPairPlus >0){
            _oSeat.increaseCredit(_iTotWinPairPlus);
            _iGameCash -= _iTotWinPairPlus;
            _oSeat.initMovement(BET_PLUS,_oReceiveWinOffset.getX(),_oReceiveWinOffset.getY());
        }else{
            _oSeat.initMovement(BET_PLUS,_oFichesDealerOffset.getX(),_oFichesDealerOffset.getY());
        }
    };
    
    this._dealing = function(){
        if(_iCardIndexToDeal<CARD_TO_DEAL*2){
                var oCard = new CCard(_oStartingCardOffset.getX(),_oStartingCardOffset.getY(),_oCardContainer);
                var pEndingPoint;

                //THIS CARD IS FOR THE DEALER
                if((_iCardIndexToDeal%_aCurActiveCardOffset.length) === 1){
                    pEndingPoint=new CVector2(_oDealerCardOffset.getX()+((CARD_WIDTH/2 + 7)*_iCardIndexToDeal),_oDealerCardOffset.getY());

                    var oInfo = _aDealerCardsInfo.splice(0,1);
                    var iFotogram = oInfo[0].fotogram;
                    var iValue = oInfo[0].rank;
                    oCard.setInfo(_pStartingPointCard,pEndingPoint,iFotogram,iValue,true,_iCardIndexToDeal);
                    oCard.addEventListener(ON_CARD_SHOWN,this._onCardShown);
                    
                    _aCardsInCurHandForDealer.push(oCard);
                }else{
                    var oInfo = _aPlayerCardsInfo.splice(0,1);
                    var iFotogram = oInfo[0].fotogram;
                    var iValue = oInfo[0].rank;
                    oCard.setInfo(_pStartingPointCard,_oSeat.getAttachCardOffset(),iFotogram,
                                                    iValue,false,_iCardIndexToDeal);
                    
                    _oSeat.newCardDealed();
                    _aCardsInCurHandForPlayer.push(oCard);
                }

                _aCardsDealing.push(oCard);
                _iCardIndexToDeal++;

                oCard.addEventListener(ON_CARD_ANIMATION_ENDING,this.cardFromDealerArrived);

                playSound("card", 1, false); 
        }else{
            setTimeout(function(){
                                    s_oGame.changeState(STATE_GAME_PLAYER_TURN);
                                    _oInterface.displayMsg(TEXT_DISPLAY_MSG_USER_TURN);
                                    _oInterface.enable(false,true,true);
                                },1000);
            
        }
    };
    
    this._onEndHand = function(){       
        var pRemoveOffset=new CVector2(_oRemoveCardsOffset.getX(),_oRemoveCardsOffset.getY());
        for(var i=0;i<_aCardsDealing.length;i++){
            _aCardsDealing[i].initRemoving(pRemoveOffset);
            _aCardsDealing[i].hideCard();
        }

        _oInterface.clearCardValueText();
        _iTimeElaps=0;
        s_oGame.changeState(STATE_GAME_SHOW_WINNER);

        playSound("fiche_collect", 1, false);
        
        _iAdsCounter++;
        if(_iAdsCounter === AD_SHOW_COUNTER){
            _iAdsCounter = 0;
            $(s_oMain).trigger("show_interlevel_ad");
        }
		
	// BetterDR: save_score and __3cp_onHandEnd are now fired from _showWin
        // immediately after the hand settles (not deferred to next hand start).
    };
    
    this._onCardShown = function(){
        if(_iState === STATE_GAME_PLAYER_TURN){
            if(_iCurDealerCardShown === CARD_TO_DEAL){
                _oInterface.showHandValue(_iHandDealer,_iHandPlayer);
                _iState = STATE_GAME_SHOWDOWN;
                s_oGame._showWin();
            }else{
                s_oGame._showNextDealerCard();
            }
            
        }
        
    };
    
    this.setBet = function(iFicheIndex,iTypeBet){
        //CHECK IF THERE IS A PREVIOUS HAND TO RESET
        if(_oInterface.isResultPanelvisible()){
            _oInterface.disableBetFiches();
            _oSeat.clearBet();
            _oActionAfterHandReset = this.setBet;
            this._onEndHand();
            return false;
        }


        var iFicheValue = FICHES_VALUE[iFicheIndex];
        
        var iTotBet;
        if(iTypeBet === BET_ANTE){
            _iTimeElaps = 0;
            _oHelpCursorAnte.hide();
            iTotBet =_oSeat.getBetAnte() + iFicheValue;
            
            if( iTotBet > _iMaxBet){
                _oMsgBox.show(TEXT_ERROR_MAX_BET);
                return false;
            }

            if( iTotBet > _oSeat.getCredit()){
                _oInterface.displayMsg(TEXT_NO_MONEY_FOR_PLAY);     
                return false;
            }
        }else{
            iTotBet=_oSeat.getBetAnte();
            if(iTotBet <= 0){
                return false;
            }

            if(iTotBet > _oSeat.getCredit()){
                _oInterface.displayMsg(TEXT_NO_MONEY_FOR_PLAY);
                return false;
            }
        }

        $(s_oMain).trigger("bet_placed",iTotBet);
        
        if(iTypeBet === BET_ANTE){
            _oSeat.decreaseCredit(iFicheValue);
            _iGameCash += iFicheValue;
            _oSeat.betAnte(iFicheValue);
            _oInterface.enable(true,false,false);
        }else{
            _oSeat.decreaseCredit(iTotBet);
            _iGameCash += iTotBet;
            _oSeat.betPlay();
        }

        _oInterface.refreshCredit(_oSeat.getCredit());
        return true;
    };
    
    this.setPairPlusBet = function(iFicheIndex){
        _bPairPlus = true;
        //CHECK IF THERE IS A PREVIOUS HAND TO RESET
        if(_oInterface.isResultPanelvisible()){
            _oInterface.disableBetFiches();
            _oSeat.clearBet();
            _oActionAfterHandReset = this.setPairPlusBet;
            this._onEndHand();
            return;
        }
        

        var iFicheValue = FICHES_VALUE[iFicheIndex];
        
        var iTotBet =_oSeat.getBetPlus() + iFicheValue;
        iTotBet = parseFloat(iTotBet.toFixed(2));

        //CHECK IF THERE ARE ENOUGH MONEY FOR A BET ANTE
        if(_oSeat.getBetAnte() === 0 && (_oSeat.getCredit()-iFicheValue) <= FICHES_VALUE[0]*3 ){
            _oInterface.displayMsg(TEXT_NO_MONEY_FOR_ANTE);     
            return;
        }
        
        if( _oSeat.getCredit() <= 0){
            _oInterface.displayMsg(TEXT_NO_MONEY);     
            return;
        }
        
        
        
        _oSeat.decreaseCredit(iFicheValue);
        _iGameCash += iFicheValue;
        _oSeat.betPairPlus(iFicheValue);

        _oInterface.refreshCredit(_oSeat.getCredit());
    };
    
    this._gameOver = function(){
        _oGameOverPanel.show();
    };
    
    this._calculateTotalWin = function(){
        this._resolveRoundSummary();
    };
    
    this.onRebet = function(){
        if(_oInterface.isResultPanelvisible()){
            _oActionAfterHandReset = this.rebet;
            this._onEndHand();
        }
    };

    this.onDeal = function(){
        _oHelpCursorAnte.hide();

        if(_oSeat.getBetAnte() < MIN_BET){
            _oMsgBox.show(TEXT_ERROR_MIN_BET);
            _oInterface.enableBetFiches(_oSeat.checkIfRebetIsPossible());
            _oInterface.enable(_oSeat.getBetAnte() > 0,false,false);

            return;
        }

        if(_oSeat.getCredit() < _oSeat.getBetAnte()){
            _oInterface.displayMsg(TEXT_NO_MONEY_FOR_PLAY);
            _oInterface.enableBetFiches(_oSeat.checkIfRebetIsPossible());
            _oInterface.enable(true,false,false);
            return;
        }

        // BetterDR integration: expose bet info before dealing
        if (typeof window.__3cp_onDeal === 'function') {
            window.__3cp_onDeal({
                ante: _oSeat.getBetAnte(),
                pairPlus: _oSeat.getBetPlus(),
                balanceAfterInitialBets: _oSeat.getCredit()
            });
        }

       _oCardContainer.removeAllChildren();

        var oRoundCards = this._drawRoundCards();
        _aPlayerCardsSnapshot = this._cloneCardsInfo(oRoundCards.player);
        _aDealerCardsSnapshot = this._cloneCardsInfo(oRoundCards.dealer);
        _aPlayerCardsInfo = this._cloneCardsInfo(oRoundCards.player);
        _aDealerCardsInfo = this._cloneCardsInfo(oRoundCards.dealer);

        _oDealerHandEvaluation = _oHandEvaluator.evaluate(_aDealerCardsSnapshot);
        _oPlayerHandEvaluation = _oHandEvaluator.evaluate(_aPlayerCardsSnapshot);
        _iHandDealer = _oDealerHandEvaluation.ret;
        _iHandPlayer = _oPlayerHandEvaluation.ret;
        _bDealerQualified = _oHandEvaluator.dealerQualifies(_oDealerHandEvaluation.sort_hand, _iHandDealer);
        _oRoundSummary = null;

        _oSeat.setPrevBet();
        
        playSound("card",1,false);
        
        
	_bFold = false;
        this.changeState(STATE_GAME_DEALING);
    };
    
    this.onFold = function(){
        if(_iState !== STATE_GAME_PLAYER_TURN){
            return;
        }

	_bFold = true;
        this._calculateTotalWin();
        _oInterface.showHandValue(null,_iHandPlayer);
        _iState = STATE_GAME_SHOWDOWN;
        this._showWin();
    };
    
    this.onPlay = function(){
        if(_iState !== STATE_GAME_PLAYER_TURN){
            return;
        }
        
        if(this.setBet(_oInterface.getFicheSelected(),BET_PLAY) !== true){
            _oInterface.enable(false,true,true);
            return;
        }
        _bFold = false;
        this._calculateTotalWin();
        _iCurDealerCardShown = 0;
        this._showNextDealerCard();
    };
    
    this._showNextDealerCard = function(){
        _aCardsInCurHandForDealer[_iCurDealerCardShown].showCard();
        _iCurDealerCardShown++;
    };
    
    this._generateRandDealerCards = function(){
        return this._cloneCardsInfo(_aDealerCardsSnapshot);
    };
    
    this._generateRandPlayerCards = function(){
        return this._cloneCardsInfo(_aPlayerCardsSnapshot);
    };

    
    this._checkDeckLength = function(){
        if(_iCurIndexDeck >= _aCardDeck.length){
            _aCardDeck = s_oGameSettings.getShuffledCardDeck();
            _iCurIndexDeck = 0;
        }
    };
    
    this.clearBets = function(){
        if(_iState !== STATE_GAME_WAITING_FOR_BET){
            return;
        }
        _oInterface.enable(false,false,false);
        
        var iCurBet = _oSeat.getStartingBet();
        if(iCurBet>0){
            _bPairPlus = false;
            _oSeat.clearBet();
            _oSeat.increaseCredit(iCurBet);
            _iGameCash -= iCurBet;
            _oInterface.refreshCredit(_oSeat.getCredit());
            var bRebet = _oSeat.checkIfRebetIsPossible();
            _oInterface.enableBetFiches(bRebet);
        }
    };
    
    this.rebet = function(){
        this.clearBets();
        var iCurBet = _oSeat.rebet();
        _iGameCash -= iCurBet;
        
        if(_oSeat.getBetPlus()>0){
            _bPairPlus = true;
        }
        
        _oInterface.enable(true,false,false);
        _oInterface.refreshCredit(_oSeat.getCredit());
        _iTimeElaps = BET_TIME;
    };
           
    this.onExit = function(){
        s_oGame.unload();
        $(s_oMain).trigger("save_score",[_oSeat.getCredit()]);
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("share_event",_oSeat.getCredit());
		
        s_oMain.gotoMenu();
        
    };
    
    this.getState = function(){
        return _iState;
    };
    
    this._updateDealing = function(){
        for(var i=0;i<_aCardsDealing.length;i++){
            _aCardsDealing[i].update();
        }
    };
    
    this._updateFiches = function(){
        _oSeat.updateFichesController();
    };
    
    this._updateShowWinner = function(){
        for(var k=0;k<_aCardsDealing.length;k++){
            _aCardsDealing[k].update();
        }

        _iTimeElaps+=s_iTimeElaps;
        if(_iTimeElaps>TIME_END_HAND){
            _iTimeElaps=0;
            var bRebet = _oSeat.checkIfRebetIsPossible();

            this.reset(bRebet);
            _oInterface.reset();

            if(_oSeat.getCredit()<FICHES_VALUE[0]){
                    this._gameOver();
                    this.changeState(-1);
            }else{
                if(_oSeat.getCredit()<FICHES_VALUE[0]){
                    this._gameOver();
                    this.changeState(-1);
                }else{
                    //EXECUTE USER ACTION BEFORE END HAND
                    this.changeState(STATE_GAME_WAITING_FOR_BET);
                    _oActionAfterHandReset.call(this,_oInterface.getFicheSelected(),0);
                }
                    
            }
        }
        
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }

        switch(_iState){
            case STATE_GAME_WAITING_FOR_BET:{
                    _iTimeElaps+=s_iTimeElaps;
                    if( _iTimeElaps > 6000){
                        _iTimeElaps = 0;
                        if(!_oHelpCursorAnte.isVisible() && _oSeat.getBetAnte() === 0){
                            //SHOW IT NEAR ANTE BET
                            _oHelpCursorAnte.show(1);
                        }
                        
                    }
                    break;
            }
            case STATE_GAME_DEALING:{
                    this._updateDealing();
                    break;
            }
            case STATE_GAME_DISTRIBUTE_FICHES:{
                    this._updateFiches();
                    break;
            }
            case STATE_GAME_SHOW_WINNER:{
                    this._updateShowWinner();
                    break;
            }
        }
        
	
    };
    
    s_oGame = this;

    TOTAL_MONEY      = oData.money;
    MIN_BET          = oData.min_bet;
    MAX_BET          = oData.max_bet;
    MULTIPLIERS      = oData.multiplier;
    BET_TIME         = oData.bet_time;
    BLACKJACK_PAYOUT = oData.blackjack_payout;
    WIN_OCCURRENCE   = oData.win_occurrence;
    BET_OCCURRENCE   = oData.bet_occurrence;
    _iGameCash       = oData.game_cash;
    PAYOUT_ANTE      = oData.ante_payout;
    PAYOUT_PLUS      = oData.plus_payouts;
    TIME_END_HAND    = oData.time_show_hand;
    AD_SHOW_COUNTER  = oData.ad_show_counter; 
    
    this._init();
}

var s_oGame;
var s_oTweenController;
