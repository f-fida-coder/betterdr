function CGame(oData){
    var _bUpdate = false;
    var _bDistributeFiches;
    var _iState;
    var _iTimeElaps;
    var _iNumberPoint;
    var _iHandCont;

    var _aDiceResultHistory;
    var _aDiceResult;
    var _aFichesToMove;
    var _aBetHistory;
    var _aBetsToRemove;
        
    var _oMySeat;
    var _oDicesAnim;
    var _oPuck;
    var _oInterface;
    var _oTableController;
    var _oMsgBox;
    var _oGameOverPanel;
    var _oAreYouSurePanel;
    var _oSiteBridge;
    var _bRoundRequestInFlight;
    var _oPendingServerRound;
    
    
    this._init = function(){
        s_oTweenController = new CTweenController();
        s_oGameSettings = new CGameSettings();
        
        _oTableController = new CTableController();
        _oTableController.addEventListener(ON_SHOW_ENLIGHT,this._onShowEnlight);
        _oTableController.addEventListener(ON_HIDE_ENLIGHT,this._onHideEnlight);
        _oTableController.addEventListener(ON_SHOW_BET_ON_TABLE,this._onShowBetOnTable);
        
        _bDistributeFiches = false;
        _iHandCont = 0;
        _iState=-1;

        _iNumberPoint = -1;

        _aBetHistory = new Object();

        _oMySeat = new CSeat();
        _oPuck = new CPuck(325,108,s_oStage);
        
        _oInterface = new CInterface();
        
        _oDicesAnim = new CDicesAnim(240,159);
        
        _oAreYouSurePanel = new CAreYouSurePanel(s_oStage);
        _oGameOverPanel = new CGameOver();

        _oMsgBox = new CMsgBox();
        _oSiteBridge = window.BetterdrCrapsBridge || null;
        _bRoundRequestInFlight = false;
        _oPendingServerRound = null;

        _aDiceResultHistory=new Array();

        _iTimeElaps=0;
        this._onSitDown();
        this.requestBalanceSync();
        this._syncStateWithSite("snapshot");
	
        _bUpdate = true;
    };
    
    this.unload = function(){
        _oInterface.unload();
        _oTableController.unload();
        _oMsgBox.unload();
        _oGameOverPanel.unload();
        _oDicesAnim.unload();

        s_oStage.removeAllChildren();
    };

    this._setState = function(iState){
        _iState=iState;

        switch(iState){
            case STATE_GAME_WAITING_FOR_BET:{
                if (_oMySeat.getCredit() < s_oGameSettings.getFicheValues(0)) {
                    _iState = -1;
                    setTimeout(function(){_oInterface.hideBlock();
                                            _oGameOverPanel.show();
                                        },2000);
                    return;
                }
                _iNumberPoint = -1;
                _oInterface.enableClearButton();

                if(_oMySeat.getCurBet() === 0){
                    _oInterface.enableRoll(false);
                }
                
                _iHandCont++;
                if(_iHandCont > NUM_HAND_FOR_ADS){
                    _iHandCont = 0;
                    $(s_oMain).trigger("show_interlevel_ad");
                }
                
                _oInterface.hideBlock();
                break;
            }
        }
        
        _oTableController.setState(iState);
    };

    this._cloneBetHistory = function(){
        var cloned = {};
        for(var key in _aBetHistory){
            if(!_aBetHistory.hasOwnProperty(key)){
                continue;
            }
            var amount = Number(_aBetHistory[key]);
            if(!isFinite(amount) || amount <= 0){
                continue;
            }
            cloned[key] = roundDecimal(amount,2);
        }
        return cloned;
    };

    this._normalizeServerBets = function(rawBets){
        var normalized = {};
        if(!rawBets || typeof rawBets !== "object"){
            return normalized;
        }

        for(var key in rawBets){
            if(!Object.prototype.hasOwnProperty.call(rawBets, key)){
                continue;
            }
            var amount = Number(rawBets[key]);
            if(!isFinite(amount) || amount <= 0){
                continue;
            }
            normalized[key] = roundDecimal(amount,2);
        }

        return normalized;
    };

    this._applyServerActiveBets = function(rawBets){
        var nextBets = this._normalizeServerBets(rawBets);

        _oMySeat.clearAllBets();
        _aBetHistory = {};

        for(var betKey in nextBets){
            if(!nextBets.hasOwnProperty(betKey)){
                continue;
            }
            var amount = Number(nextBets[betKey]);
            if(!isFinite(amount) || amount <= 0){
                continue;
            }

            _aBetHistory[betKey] = roundDecimal(amount,2);
            var aFicheIndexes = s_oGameSettings.generateFichesPileByIndex(amount);
            for(var i = 0; i < aFicheIndexes.length; i++){
                var ficheIndex = Number(aFicheIndexes[i]);
                if(!isFinite(ficheIndex)){
                    continue;
                }
                var ficheValue = Number(s_oGameSettings.getFicheValues(ficheIndex));
                if(!isFinite(ficheValue) || ficheValue <= 0){
                    continue;
                }
                _oMySeat.addFicheOnTable(ficheValue, ficheIndex, betKey);
            }
        }

        _oInterface.setCurBet(_oMySeat.getCurBet());
        if(_oMySeat.getCurBet() > 0){
            _oInterface.enableRoll(true);
            _oInterface.enableClearButton();
        }else{
            _oInterface.enableRoll(false);
            _oInterface.disableClearButton();
        }
    };

    this._stateToPayload = function(){
        if(_iState === STATE_GAME_COME_POINT){
            return "come_point";
        }
        if(_iState === STATE_GAME_COME_OUT){
            return "come_out";
        }
        return "waiting";
    };

    this._payloadStateToGameState = function(rawState){
        var value = String(rawState || "").toLowerCase();
        if(value === "come_point"){
            return STATE_GAME_COME_POINT;
        }
        if(value === "come_out"){
            return STATE_GAME_COME_OUT;
        }
        return STATE_GAME_WAITING_FOR_BET;
    };

    this._applyAuthoritativeBalance = function(balanceValue){
        var parsed = Number(balanceValue);
        if(!isFinite(parsed)){
            return;
        }

        var nextBalance = Math.max(0, roundDecimal(parsed,2));
        TOTAL_MONEY = nextBalance;
        _oMySeat.recharge(nextBalance);
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());

        if(_iState === -1 && nextBalance >= s_oGameSettings.getFicheValues(0)){
            this._setState(STATE_GAME_WAITING_FOR_BET);
            _oGameOverPanel.hide();
        }
    };

    this._applyServerRoundState = function(oServerRound){
        if(!oServerRound || typeof oServerRound !== "object"){
            return;
        }
        var oRoundData = oServerRound.roundData || {};
        if(Object.prototype.hasOwnProperty.call(oRoundData, "activeBetsAfter")){
            this._applyServerActiveBets(oRoundData.activeBetsAfter);
        }
        var iTargetState = this._payloadStateToGameState(oRoundData.stateAfter);
        var iPointAfter = Number(oRoundData.pointNumberAfter);
        if(!isFinite(iPointAfter)){
            iPointAfter = -1;
        }

        if(iTargetState === STATE_GAME_COME_POINT){
            _iNumberPoint = iPointAfter > 0 ? iPointAfter : -1;
            _iState = STATE_GAME_COME_POINT;
            _oTableController.setState(STATE_GAME_COME_POINT);
            if(_iNumberPoint > 0){
                var iNewX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
                _oPuck.switchOn(iNewX);
            }else{
                _oPuck.switchOff();
            }
        }else{
            _oPuck.switchOff();
            this._setState(STATE_GAME_WAITING_FOR_BET);
        }

        _oInterface.setCurBet(_oMySeat.getCurBet());
        if(_oMySeat.getCurBet() > 0){
            _oInterface.enableRoll(true);
            _oInterface.enableClearButton();
        }else{
            _oInterface.enableRoll(false);
            _oInterface.disableClearButton();
        }
    };

    this.requestBalanceSync = function(){
        if(!_oSiteBridge || typeof _oSiteBridge.getBalance !== "function"){
            return;
        }

        _oSiteBridge.getBalance()
            .then(function(oPayload){
                var iBalance = Number(oPayload && (oPayload.balance !== undefined ? oPayload.balance : oPayload.newBalance));
                if(isFinite(iBalance)){
                    s_oGame._applyAuthoritativeBalance(iBalance);
                }
            })
            .catch(function(err){
                if(window && window.console){
                    console.warn("Craps balance sync failed", err);
                }
            });
    };

    this._syncStateWithSite = function(mode){
        if(!_oSiteBridge || typeof _oSiteBridge.syncState !== "function"){
            return;
        }

        var normalizedMode = "sync";
        if(mode === "snapshot"){
            normalizedMode = "snapshot";
        }

        var oPayload = {
            mode: normalizedMode,
            bets: normalizedMode === "snapshot" ? {} : this._cloneBetHistory(),
            state: normalizedMode === "snapshot" ? "" : this._stateToPayload(),
            pointNumber: normalizedMode === "snapshot" ? null : (_iNumberPoint > 0 ? _iNumberPoint : null)
        };
        var szRequestId = _oSiteBridge.createRequestId("craps_" + (mode || "sync"));
        _oSiteBridge.syncState(oPayload, szRequestId)
            .then(function(oResp){
                s_oGame._applyServerRoundState({
                    roundData: oResp && oResp.roundData ? oResp.roundData : {}
                });
                var iBalance = Number(oResp && (oResp.availableBalance !== undefined ? oResp.availableBalance : oResp.newBalance));
                if(isFinite(iBalance)){
                    s_oGame._applyAuthoritativeBalance(iBalance);
                }
            })
            .catch(function(err){
                if(window && window.console){
                    console.warn("Craps state sync failed", err);
                }
            });
    };

    
    
    this._prepareForRolling = function(aForcedDice){
        _oInterface.disableBetFiches();
        _oInterface.disableClearButton();

        _aDiceResult = new Array();
        if(!aForcedDice || aForcedDice.length !== 2){
            _bRoundRequestInFlight = false;
            _oPendingServerRound = null;
            _oInterface.hideBlock();
            _oInterface.enableBetFiches();
            var bCanContinueRoll = _oMySeat.getCurBet() > 0;
            _oInterface.enableRoll(bCanContinueRoll);
            if(bCanContinueRoll && _iState !== STATE_GAME_COME_POINT){
                _oInterface.enableClearButton();
            }else{
                _oInterface.disableClearButton();
            }
            _oMsgBox.show("Round start failed. Missing server dice.");
            this.requestBalanceSync();
            return false;
        }

        var iDie1 = Number(aForcedDice[0]);
        var iDie2 = Number(aForcedDice[1]);
        if(!isFinite(iDie1) || !isFinite(iDie2) || iDie1 < 1 || iDie1 > 6 || iDie2 < 1 || iDie2 > 6){
            _bRoundRequestInFlight = false;
            _oPendingServerRound = null;
            _oInterface.hideBlock();
            _oInterface.enableBetFiches();
            var bCanRetryRoll = _oMySeat.getCurBet() > 0;
            _oInterface.enableRoll(bCanRetryRoll);
            if(bCanRetryRoll && _iState !== STATE_GAME_COME_POINT){
                _oInterface.enableClearButton();
            }else{
                _oInterface.disableClearButton();
            }
            _oMsgBox.show("Round start failed. Invalid server dice.");
            this.requestBalanceSync();
            return false;
        }

        _aDiceResult[0] = iDie1;
        _aDiceResult[1] = iDie2;
        _aDiceResultHistory.push(_aDiceResult);

        _iTimeElaps = 0;
        return true;
    };
    
    this._startRollingAnim = function(){
        _oDicesAnim.startRolling(_aDiceResult);
    };
    
    this.dicesAnimEnded = function(){
        var iSumDices = _aDiceResult[0] + _aDiceResult[1];

        if(_iState === STATE_GAME_COME_OUT){

            //FIRST SHOOT
            if(iSumDices !== 2 && iSumDices !== 3 && iSumDices !== 12 && iSumDices !== 7 && iSumDices !== 11){
                //ASSIGN NUMBER
                this._assignNumber(iSumDices);
            }
            
            this._checkWinForBet();
            
            if(_aFichesToMove.length > 0){
                _bDistributeFiches = true;
                
                for(var j=0;j<_aBetsToRemove.length;j++){
                    _oMySeat.removeBet(_aBetsToRemove[j]);
                    delete _aBetHistory[_aBetsToRemove[j]];
                }
                
                
                _oInterface.setCurBet(_oMySeat.getCurBet());
                
            }
            
            if(_iNumberPoint !== -1){
                this._setState(STATE_GAME_COME_POINT);
            }
        }else{
            this._checkWinForBet();
            
            if(_aFichesToMove.length > 0){
                _bDistributeFiches = true;
                
                for(var j=0;j<_aBetsToRemove.length;j++){
                    _oMySeat.removeBet(_aBetsToRemove[j]);
                    delete _aBetHistory[_aBetsToRemove[j]];
                }
                
                _oInterface.setCurBet(_oMySeat.getCurBet());
            }
            
            if(_iNumberPoint === iSumDices){
                //PASS LINE WINS
                _oPuck.switchOff();
                this._setState(STATE_GAME_WAITING_FOR_BET);
                
            }else if(iSumDices === 7){
                //END TURN
                _oPuck.switchOff();
                this._setState(STATE_GAME_WAITING_FOR_BET);
            }
        }
        
        
        if(_oPendingServerRound){
            this._applyServerRoundState(_oPendingServerRound);
            var iServerBalance = Number(_oPendingServerRound.availableBalance);
            if(!isFinite(iServerBalance)){
                iServerBalance = Number(_oPendingServerRound.newBalance);
            }
            if(!isFinite(iServerBalance)){
                iServerBalance = Number(_oPendingServerRound.balanceAfter);
            }
            if(isFinite(iServerBalance)){
                this._applyAuthoritativeBalance(iServerBalance);
            }
        }
        _oPendingServerRound = null;
        _bRoundRequestInFlight = false;

        _oInterface.setMoney(_oMySeat.getCredit());
        if(Object.keys(_aBetHistory).length > 0){
            _oInterface.enableRoll(true);
            _oInterface.enableClearButton();
        }
        
        _oInterface.hideBlock();
        _oInterface.enableBetFiches();
        $(s_oMain).trigger("save_score",[_oMySeat.getCredit()]);
    };
    
    this._assignNumber = function(iNumber){
        _iNumberPoint = iNumber;
        
        //PLACE 'ON' PLACEHOLDER
        var iNewX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
        _oPuck.switchOn(iNewX);
        
        //ENABLE GUI
        _oInterface.hideBlock();
    };

    
    this._checkWinForBet = function(){
        var iSumDices = _aDiceResult[0] + _aDiceResult[1];
        
        var iTotWin = 0;
        _aFichesToMove = new Array();
        _aBetsToRemove = new Array();
        for(var szBet in _aBetHistory){
            var szOrigBetName = szBet;

            //BET STRING EXCEPTION
            if(szBet.indexOf("any11_") !== -1){
                szBet = "any11_7";
            }else if(szBet.indexOf("any_craps") !== -1){
                szBet = "any_craps_7";
            }
            
            var iAmountForBet = _oMySeat.getBetAmountInPos(szOrigBetName);
            var iWin = s_oGameSettings.checkBetWin(iSumDices,_iState,iAmountForBet,_iNumberPoint,szBet,_aDiceResult);

            //END SWITCH
            if(iWin !== -1){
                iTotWin += iWin;

                var aFicheMc = _oMySeat.getFicheMc(szBet);
                _aBetsToRemove.push(szOrigBetName);

                for(var k=0;k<aFicheMc.length;k++){
                    _aFichesToMove.push(aFicheMc[k]);
                    if(iWin > 0){
                        var oEndPos = s_oGameSettings.getAttachOffset("oReceiveWin");
                        playSound("win", 0.2, false);
                    }else{
                        var oEndPos = s_oGameSettings.getAttachOffset("oDealerWin");
                        playSound("lose", 0.2, false);
                    }
                    
                    aFicheMc[k].setEndPoint(oEndPos.x,oEndPos.y);
                    
                    //_oMySeat.decreaseBet(s_oGameSettings.getFicheValues(_aFichesToMove[k].getValue()));
                    
                }
                
                _oMySeat.decreaseBet(iAmountForBet);
                
                if(iWin > 0){
                    //INCREASE MONEY
                    _oMySeat.showWin(_oMySeat.getBetAmountInPos(szOrigBetName) +iWin);
                    
                    var pPosFiche = aFicheMc[0].getStartingPos();
                    new CScoreText(iWin+TEXT_CURRENCY,pPosFiche.x,pPosFiche.y);
                }
                
            }
        }
        
        if(iTotWin > 0){
            _oInterface.refreshMsgHelp(TEXT_YOU_WIN + ": "+iTotWin);
            setTimeout(function(){_oInterface.clearMsgHelp();},3000);
        }
    };
    
    this.assignBetFromCome = function(iNumberAssigned,szOrigBet){
        var aFicheMc = _oMySeat.getFicheMc(szOrigBet);
        
        //MOVE FICHES
        for(var k=0;k<aFicheMc.length;k++){
            _aFichesToMove.push(aFicheMc[k]);
            var oEndPos = s_oGameSettings.getAttachOffset("number"+iNumberAssigned);

            aFicheMc[k].setEndPoint(oEndPos.x,oEndPos.y);
        }
        
        
        _aBetHistory["number"+iNumberAssigned] = _aBetHistory[szOrigBet];
        delete _aBetHistory[szOrigBet];
        
        _oMySeat.swapBet(szOrigBet,"number"+iNumberAssigned);
    };
    
    this.assignBetFromDontCome = function(iNumberAssigned,szOrigBet){
        var aFicheMc = _oMySeat.getFicheMc(szOrigBet);
        
        //MOVE FICHES
        for(var k=0;k<aFicheMc.length;k++){
            _aFichesToMove.push(aFicheMc[k]);
            var oEndPos = s_oGameSettings.getAttachOffset("lay_bet"+iNumberAssigned);

            aFicheMc[k].setEndPoint(oEndPos.x,oEndPos.y);
        }
        
        
        _aBetHistory["lay_bet"+iNumberAssigned] = _aBetHistory[szOrigBet];
        delete _aBetHistory[szOrigBet];
        
        _oMySeat.swapBet(szOrigBet,"lay_bet"+iNumberAssigned);
    };
    
    this.onRecharge = function() {
        this.requestBalanceSync();
        _oGameOverPanel.hide();
    };
    
    this.onRoll = function(){
        if(_bRoundRequestInFlight){
            return;
        }

        if (_oMySeat.getCurBet() === 0) {
                return;
        }

        if(_oMySeat.getCurBet() < MIN_BET){
            _oMsgBox.show("Minimum total wager is $" + Number(MIN_BET).toFixed(2));
            _oInterface.enableBetFiches();
            _oInterface.enableRoll(true);
            return;
        }

        if(_oInterface.isBlockVisible()){
                return;
        }

        if(!_oSiteBridge || typeof _oSiteBridge.settleRound !== "function"){
            _oMsgBox.show("Game connection unavailable. Please reopen Craps.");
            _oInterface.enableBetFiches();
            _oInterface.enableRoll(true);
            return;
        }

        _oInterface.showBlock();
        
        if(_iState === STATE_GAME_WAITING_FOR_BET){
            this._setState(STATE_GAME_COME_OUT);
        }
        
        $(s_oMain).trigger("bet_placed",_oMySeat.getCurBet());
        _bRoundRequestInFlight = true;
        var oPayload = {
            bets: this._cloneBetHistory(),
            state: this._stateToPayload(),
            pointNumber: _iNumberPoint > 0 ? _iNumberPoint : null
        };
        var szRequestId = _oSiteBridge.createRequestId("craps_round");
        _oSiteBridge.settleRound(oPayload, szRequestId)
            .then(function(oResp){
                var oRoundData = oResp && oResp.roundData ? oResp.roundData : {};
                var oDice = oRoundData && oRoundData.dice ? oRoundData.dice : (oResp && oResp.dice ? oResp.dice : null);
                var iDie1 = Number(oDice && oDice.die1);
                var iDie2 = Number(oDice && oDice.die2);
                if(!isFinite(iDie1) || !isFinite(iDie2) || iDie1 < 1 || iDie1 > 6 || iDie2 < 1 || iDie2 > 6){
                    throw new Error("Invalid dice result from server");
                }

                var iStateBefore = s_oGame._payloadStateToGameState(oRoundData.stateBefore);
                _iState = iStateBefore;
                _oTableController.setState(_iState);
                var iPointBefore = Number(oRoundData.pointNumberBefore);
                if(!isFinite(iPointBefore)){
                    iPointBefore = -1;
                }
                _iNumberPoint = iPointBefore > 0 ? iPointBefore : -1;
                if(_iState === STATE_GAME_COME_POINT && _iNumberPoint > 0){
                    var iPuckX = s_oGameSettings.getPuckXByNumber(_iNumberPoint);
                    _oPuck.switchOn(iPuckX);
                }else{
                    _oPuck.switchOff();
                }

                _oPendingServerRound = oResp;
                if(s_oGame._prepareForRolling([iDie1, iDie2])){
                    s_oGame._startRollingAnim();
                }
            })
            .catch(function(err){
                _bRoundRequestInFlight = false;
                _oPendingServerRound = null;
                _oInterface.hideBlock();
                _oInterface.enableBetFiches();
                var bCanRoll = _oMySeat.getCurBet() > 0;
                _oInterface.enableRoll(bCanRoll);
                if(bCanRoll && _iState !== STATE_GAME_COME_POINT){
                    _oInterface.enableClearButton();
                }else{
                    _oInterface.disableClearButton();
                }
                _oMsgBox.show(String((err && err.message) || "Unable to place bet. Please try again."));
                s_oGame.requestBalanceSync();
            });
    };
    
    this._onSitDown = function(){
        this._setState(STATE_GAME_WAITING_FOR_BET);
        _oMySeat.setInfo(TOTAL_MONEY, _oTableController.getContainer());
        _oInterface.setMoney(TOTAL_MONEY);
        _oInterface.setCurBet(0);
    };
    
    this._onShowBetOnTable = function(oParams){
        if(_bDistributeFiches){
            return;
        }
        
        var szBut = oParams.button;

        var  iIndexFicheSelected = _oInterface.getCurFicheSelected();
        var iFicheValue=s_oGameSettings.getFicheValues(iIndexFicheSelected);
        
        var iCurBet=_oMySeat.getCurBet();
        if( (_oMySeat.getCredit() - iFicheValue) < 0){
            //SHOW MSG BOX
            _oMsgBox.show(TEXT_ERROR_NO_MONEY_MSG);
            return;
        }
        
        if( (iCurBet + iFicheValue) > MAX_BET ){
            _oMsgBox.show(TEXT_ERROR_MAX_BET_REACHED);
            return;
        }

        if(_aBetHistory[oParams.button] === undefined){
            _aBetHistory[oParams.button] = iFicheValue;
        }else{
            _aBetHistory[oParams.button] += iFicheValue;
        }
        
        _oMySeat.addFicheOnTable(iFicheValue,iIndexFicheSelected,szBut);
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        _oInterface.enableRoll(true);
        _oInterface.enableClearButton();
        _oInterface.refreshMsgHelp(TEXT_READY_TO_ROLL,true);
        
        playSound("chip", 1, false);
    };

    this._onShowEnlight = function(oParams){
        var szEnlight=oParams.enlight;
        if(szEnlight){
            _oTableController.enlight(szEnlight);
            
            _oInterface.refreshMsgHelp(TEXT_HELP_MSG[szEnlight],false);
        }
    };
    
    this._onHideEnlight = function(oParams){
        var szEnlight=oParams.enlight;
        if(szEnlight){
            _oTableController.enlightOff(szEnlight);
            _oInterface.clearMsgHelp();
        }
    };
    
    this.onClearAllBets = function(){
        $(s_oMain).trigger("clear_bet",_oMySeat.getCurBet());
        
        if(_iState === STATE_GAME_COME_POINT){
            _oMySeat.clearAllBetsInComePoint();
            for(var i in _aBetHistory){
                if( i !== "pass_line" && i!== "dont_pass1" && i!== "dont_pass2"){
                    delete _aBetHistory[i];
                }
            }
        }else{
            _oMySeat.clearAllBets();
            _aBetHistory = new Object();
            _oInterface.enableRoll(false);
        }
        
        _oInterface.setMoney(_oMySeat.getCredit());
        _oInterface.setCurBet(_oMySeat.getCurBet());
        var bHasRemainingBet = _oMySeat.getCurBet() > 0;
        _oInterface.enableRoll(bHasRemainingBet);
        if(bHasRemainingBet && _iState !== STATE_GAME_COME_POINT){
            _oInterface.enableClearButton();
        }else{
            _oInterface.disableClearButton();
        }

        this._syncStateWithSite("sync");
    };
   
    this.onExit = function(bForceExit){
        if(bForceExit){
            this.unload();
            s_oMain.gotoMenu();
        }else{
            _oAreYouSurePanel.show();  
        }
        
    };
    
    this.onConfirmExit = function(){
        this.unload();
        s_oMain.gotoMenu();
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("share_event",_oMySeat.getCredit());
    };
    
    this._updateDistributeFiches = function(){
        _iTimeElaps += s_iTimeElaps;
        if(_iTimeElaps > TIME_FICHES_MOV){
            _iTimeElaps = 0;
            _bDistributeFiches = false;
            playSound("fiche_collect", 1, false);
        }else{
            var fLerp = s_oTweenController.easeInOutCubic( _iTimeElaps, 0, 1, TIME_FICHES_MOV);
            for(var i=0;i<_aFichesToMove.length;i++){
                _aFichesToMove[i].updatePos(fLerp);
            }
        }
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }
        
        if(_bDistributeFiches){
            this._updateDistributeFiches();
        }
        
        if(_oDicesAnim.isVisible()){
            _oDicesAnim.update();
        }
        
    };
    
    s_oGame = this;
    
    TOTAL_MONEY = oData.money;
    MIN_BET = oData.min_bet;
    MAX_BET = oData.max_bet;
    TIME_SHOW_DICES_RESULT = oData.time_show_dice_result;
    NUM_HAND_FOR_ADS = oData.num_hand_before_ads;
    
    this._init();
}

var s_oGame;
var s_oTweenController;
var s_oGameSettings;
