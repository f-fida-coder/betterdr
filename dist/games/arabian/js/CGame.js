function CGame(oData){
    var _bUpdate = false;
    var _bReadyToStop = false;
    var _bAutoSpin;
    var _iCurState;
    var _iCurReelLoops;
    var _iNextColToStop;
    var _iNumReelsStopped;
    var _iLastLineActive;
    var _iTimeElaps;
    var _iCurWinShown;
    var _iCurBet;
    var _iTotBet;
    var _iMoney;
    var _iTotWin;
    var _iTotFreeSpin;
    var _iBonus;
    var _iCurBonusPrizeIndex;
    var _iBonusWin;
    var _iCurCoinIndex;
    var _iNumSpinCont;
    var _oStakeRules;
    var _aMovingColumns;
    var _aStaticSymbols;
    var _aWinningLine;
    var _aReelSequence;
    var _aFinalSymbolCombo;
    var _oBg;
    var _oLogo;
    var _oLogoFreeSpin;
    var _oFreeSpinPanel;
    var _oFrontSkin;
    var _oInterface;
    var _oPayTable = null;
    var _oBonusPanel;
    
    this._init = function(){
        _iCurState = GAME_STATE_IDLE;
        _iCurReelLoops = 0;
        _iNumReelsStopped = 0;
        _iCurCoinIndex = 0;
        _aReelSequence = new Array(0,1,2,3,4);
        _iNextColToStop = _aReelSequence[0];
        _iLastLineActive = NUM_PAYLINES;
        _iMoney = TOTAL_MONEY;
        _iCurBet = MIN_BET;
        _iTotBet = _iCurBet * _iLastLineActive;
        _bAutoSpin = false;
        _iTotFreeSpin = 0;
        _iBonus = 0;
        _iNumSpinCont = 0;
        
        s_oTweenController = new CTweenController();
        
        _oBg = createBitmap(s_oSpriteLibrary.getSprite('bg_game'));
        s_oAttachSection.addChild(_oBg);

        this._initReels();

        _oFrontSkin = new createjs.Bitmap(s_oSpriteLibrary.getSprite('mask_slot'));
        s_oAttachSection.addChild(_oFrontSkin);
        
        _oLogo = new createjs.Bitmap(s_oSpriteLibrary.getSprite('logo'));
        _oLogo.x = 590;
        _oLogo.y = 0;
        s_oAttachSection.addChild(_oLogo);
        
        _oLogoFreeSpin = new createjs.Bitmap(s_oSpriteLibrary.getSprite('logo_freespin'));
        _oLogoFreeSpin.x = 590;
        _oLogoFreeSpin.y = 0;
        _oLogoFreeSpin.visible = false;
        s_oAttachSection.addChild(_oLogoFreeSpin);

        _oFreeSpinPanel = new createjs.Bitmap(s_oSpriteLibrary.getSprite('freespin_panel'));
        _oFreeSpinPanel.x = 940;
        _oFreeSpinPanel.y = 3;
        _oFreeSpinPanel.visible = false;
        s_oAttachSection.addChild(_oFreeSpinPanel);

        _oInterface = new CInterface(_iCurBet,_iTotBet,_iMoney);
        this._initStaticSymbols();
        _oPayTable = new CPayTablePanel();
		
        if(_iMoney < _iTotBet){
                _oInterface.disableSpin(_bAutoSpin);
        }
        
        //FIND MIN WIN
        MIN_WIN = s_aSymbolWin[0][s_aSymbolWin[0].length-1];
        for(var i=0;i<s_aSymbolWin.length;i++){
            var aTmp = s_aSymbolWin[i];
            for(var j=0;j<aTmp.length;j++){
                if(aTmp[j] !== 0 && aTmp[j] < MIN_WIN){
                    MIN_WIN = aTmp[j];
                }
            }
        }
        
        _oBonusPanel = new CBonusPanel();

        this.onExternalStakeContext({
            balance: _iMoney,
            betLimits: (typeof window !== "undefined" ? window.__ARABIAN_BET_LIMITS : null)
        });

        _bUpdate = true;
    };

    this._roundMoney = function(iValue){
        var iNum = Number(iValue);
        if(!isFinite(iNum)){
            return 0;
        }
        return Math.round(iNum * 100) / 100;
    };

    this._positiveMoneyOrNull = function(iValue){
        var iNum = Number(iValue);
        if(!isFinite(iNum) || iNum <= 0){
            return null;
        }
        return this._roundMoney(iNum);
    };

    this._readStakeRules = function(){
        var oRaw = (typeof window !== "undefined" && window.__ARABIAN_BET_LIMITS && typeof window.__ARABIAN_BET_LIMITS === "object")
            ? window.__ARABIAN_BET_LIMITS
            : {};

        var iGameMin = this._positiveMoneyOrNull(oRaw.gameMinBet);
        var iGameMax = this._positiveMoneyOrNull(oRaw.gameMaxBet);
        if(iGameMin === null){
            iGameMin = 0.3;
        }
        if(iGameMax === null){
            iGameMax = 30;
        }

        var iAccountMin = this._positiveMoneyOrNull(oRaw.accountMinBet);
        var iAccountMax = this._positiveMoneyOrNull(oRaw.accountMaxBet);
        var iEffectiveMin = this._roundMoney(Math.max(iGameMin, iAccountMin !== null ? iAccountMin : 0));
        var iEffectiveMax = iGameMax;
        if(iAccountMax !== null){
            iEffectiveMax = Math.min(iEffectiveMax, iAccountMax);
        }
        iEffectiveMax = this._roundMoney(iEffectiveMax);
        if(iEffectiveMax < iEffectiveMin){
            iEffectiveMax = iEffectiveMin;
        }

        var iCoinStep = Number(oRaw.coinStep);
        if(!isFinite(iCoinStep) || iCoinStep <= 0){
            iCoinStep = 0.05;
        }
        iCoinStep = this._roundMoney(Math.max(0.01, iCoinStep));

        return {
            accountMinBet: iAccountMin,
            accountMaxBet: iAccountMax,
            gameMinBet: iGameMin,
            gameMaxBet: iGameMax,
            effectiveMinBet: iEffectiveMin,
            effectiveMaxBet: iEffectiveMax,
            lineMin: 1,
            lineMax: NUM_PAYLINES,
            coinStep: iCoinStep
        };
    };

    this._buildCoinOptionsForLine = function(iLine){
        var iResolvedLine = Math.max(1, Math.min(NUM_PAYLINES, parseInt(iLine, 10) || NUM_PAYLINES));
        var oRules = _oStakeRules || this._readStakeRules();
        var iMaxAllowedByBalance = Math.max(0, this._roundMoney(_iMoney));
        var iMinTotal = this._roundMoney(Math.max(0, oRules.effectiveMinBet));
        var iMaxTotal = this._roundMoney(Math.max(0, oRules.effectiveMaxBet));
        if(iMaxAllowedByBalance > 0){
            iMaxTotal = this._roundMoney(Math.min(iMaxTotal, iMaxAllowedByBalance));
        }

        if(iMaxTotal < iMinTotal){
            return [];
        }

        var iStep = this._roundMoney(Math.max(0.01, oRules.coinStep || 0.05));
        var iCoinMin = this._roundMoney(Math.ceil((iMinTotal / iResolvedLine) / iStep - 0.00001) * iStep);
        var iCoinMax = this._roundMoney(Math.floor((iMaxTotal / iResolvedLine) / iStep + 0.00001) * iStep);

        if(iCoinMin <= 0 || iCoinMax < iCoinMin){
            return [];
        }

        var aCoins = [];
        var iGuard = 0;
        for(var iCoin = iCoinMin; iCoin <= iCoinMax + 0.00001 && iGuard < 3000; iCoin = this._roundMoney(iCoin + iStep)){
            aCoins.push(this._roundMoney(iCoin));
            iGuard++;
        }
        if(aCoins.length === 0){
            aCoins.push(iCoinMin);
        }

        if(aCoins.length > 120){
            var aSampled = [];
            var iStride = Math.ceil(aCoins.length / 120);
            for(var i = 0; i < aCoins.length; i += iStride){
                aSampled.push(aCoins[i]);
            }
            if(aSampled[aSampled.length - 1] !== aCoins[aCoins.length - 1]){
                aSampled.push(aCoins[aCoins.length - 1]);
            }
            aCoins = aSampled;
        }

        return aCoins;
    };

    this._findNearestValidLine = function(iRequestedLine){
        var iRequested = Math.max(1, Math.min(NUM_PAYLINES, parseInt(iRequestedLine, 10) || NUM_PAYLINES));
        var iBestLine = null;
        var iBestDistance = 99999;

        for(var iLine = 1; iLine <= NUM_PAYLINES; iLine++){
            var aCoins = this._buildCoinOptionsForLine(iLine);
            if(aCoins.length === 0){
                continue;
            }
            var iDistance = Math.abs(iLine - iRequested);
            if(iBestLine === null || iDistance < iBestDistance || (iDistance === iBestDistance && iLine > iBestLine)){
                iBestLine = iLine;
                iBestDistance = iDistance;
            }
        }

        return iBestLine;
    };

    this._isStakeWithinRules = function(iStake){
        var oRules = _oStakeRules || this._readStakeRules();
        var iWager = this._roundMoney(iStake);
        if(iWager <= 0){
            return false;
        }
        if(oRules.effectiveMinBet > 0 && iWager < oRules.effectiveMinBet - 0.00001){
            return false;
        }
        if(oRules.effectiveMaxBet > 0 && iWager > oRules.effectiveMaxBet + 0.00001){
            return false;
        }
        if(iWager > this._roundMoney(_iMoney) + 0.00001){
            return false;
        }
        return true;
    };

    this._stakeValidationMessage = function(){
        var oRules = _oStakeRules || this._readStakeRules();
        var iBalance = this._roundMoney(_iMoney);
        if(iBalance <= 0){
            return TEXT_NOT_ENOUGH_MONEY;
        }
        if(oRules.effectiveMinBet > 0 && iBalance + 0.00001 < oRules.effectiveMinBet){
            return "Available balance $" + iBalance.toFixed(2) + " is below minimum allowed wager $" + oRules.effectiveMinBet.toFixed(2) + ".";
        }
        if(_iTotBet > 0 && oRules.effectiveMinBet > 0 && _iTotBet < oRules.effectiveMinBet){
            return "Minimum allowed wager is $" + oRules.effectiveMinBet.toFixed(2) + ".";
        }
        if(_iTotBet > 0 && oRules.effectiveMaxBet > 0 && _iTotBet > oRules.effectiveMaxBet){
            return "Maximum allowed wager is $" + oRules.effectiveMaxBet.toFixed(2) + ".";
        }
        return TEXT_NOT_ENOUGH_MONEY;
    };

    this._applyStakeSelection = function(iRequestedLine, iPreferredTotalBet){
        var iValidLine = this._findNearestValidLine(iRequestedLine);
        if(iValidLine === null){
            _iLastLineActive = Math.max(1, Math.min(NUM_PAYLINES, parseInt(iRequestedLine, 10) || NUM_PAYLINES));
            _iCurCoinIndex = 0;
            _iCurBet = 0;
            _iTotBet = 0;
            COIN_BET = [0];
            MIN_BET = 0;
            MAX_BET = 0;
            if(_oInterface){
                _oInterface.refreshNumLines(_iLastLineActive);
                _oInterface.refreshBet(0);
                _oInterface.refreshTotalBet(0);
                _oInterface.disableSpin(_bAutoSpin);
            }
            return false;
        }

        var aCoins = this._buildCoinOptionsForLine(iValidLine);
        if(aCoins.length === 0){
            return false;
        }

        _iLastLineActive = iValidLine;
        COIN_BET = aCoins;
        MIN_BET = aCoins[0];
        MAX_BET = aCoins[aCoins.length - 1];

        var iPreferredCoin = Number(iPreferredTotalBet) / _iLastLineActive;
        if(!isFinite(iPreferredCoin) || iPreferredCoin <= 0){
            iPreferredCoin = MIN_BET;
        }

        var iBestIndex = 0;
        var iBestDiff = 999999;
        for(var i = 0; i < COIN_BET.length; i++){
            var iDiff = Math.abs(COIN_BET[i] - iPreferredCoin);
            if(iDiff < iBestDiff){
                iBestDiff = iDiff;
                iBestIndex = i;
            }
        }

        _iCurCoinIndex = iBestIndex;
        _iCurBet = this._roundMoney(COIN_BET[_iCurCoinIndex]);
        _iTotBet = this._roundMoney(_iCurBet * _iLastLineActive);

        if(_oInterface){
            _oInterface.refreshNumLines(_iLastLineActive);
            _oInterface.refreshBet(_iCurBet);
            _oInterface.refreshTotalBet(_iTotBet);
            if(this._isStakeWithinRules(_iTotBet)){
                _oInterface.enableSpin();
            }else{
                _oInterface.disableSpin(_bAutoSpin);
            }
        }

        return this._isStakeWithinRules(_iTotBet);
    };

    this._applyMaximumStake = function(){
        var oBest = null;
        for(var iLine = 1; iLine <= NUM_PAYLINES; iLine++){
            var aCoins = this._buildCoinOptionsForLine(iLine);
            if(aCoins.length === 0){
                continue;
            }
            var iCoin = aCoins[aCoins.length - 1];
            var iTotal = this._roundMoney(iCoin * iLine);
            if(oBest === null || iTotal > oBest.total || (iTotal === oBest.total && iLine > oBest.line)){
                oBest = {line: iLine, coin: iCoin, total: iTotal};
            }
        }

        if(oBest === null){
            return false;
        }

        this._applyStakeSelection(oBest.line, oBest.total);
        return true;
    };

    this.onExternalStakeContext = function(oContext){
        if(oContext && isFinite(Number(oContext.balance))){
            _iMoney = Math.max(0, this._roundMoney(Number(oContext.balance)));
            if(_oInterface){
                _oInterface.refreshMoney(_iMoney);
            }
        }

        _oStakeRules = this._readStakeRules();

        if(_iTotFreeSpin > 0 || (_oLogoFreeSpin && _oLogoFreeSpin.visible)){
            return;
        }

        this._applyStakeSelection(_iLastLineActive, _iTotBet);
    };
    
    this.unload = function(){
        stopSound("reels");
        
        _oInterface.unload();
        _oPayTable.unload();
        
        for(var k=0;k<_aMovingColumns.length;k++){
            _aMovingColumns[k].unload();
        }
        
        for(var i=0;i<NUM_ROWS;i++){
            for(var j=0;j<NUM_REELS;j++){
                _aStaticSymbols[i][j].unload();
            }
        }
        
        s_oAttachSection.removeAllChildren();
    };
    
    this._initReels = function(){  
        var iXPos = REEL_OFFSET_X;
        var iYPos = REEL_OFFSET_Y;
        
        var iCurDelay = 0;
        _aMovingColumns = new Array();
        for(var i=0;i<NUM_REELS;i++){ 
            _aMovingColumns[i] = new CReelColumn(i,iXPos,iYPos,iCurDelay);
            _aMovingColumns[i+NUM_REELS] = new CReelColumn(i+NUM_REELS,iXPos,iYPos + (SYMBOL_SIZE*NUM_ROWS),iCurDelay );
            iXPos += SYMBOL_SIZE + SPACE_BETWEEN_SYMBOLS;
            iCurDelay += REEL_DELAY;
        }
        
    };
    
    this._initStaticSymbols = function(){
        var iXPos = REEL_OFFSET_X;
        var iYPos = REEL_OFFSET_Y;
        _aStaticSymbols = new Array();
        for(var i=0;i<NUM_ROWS;i++){
            _aStaticSymbols[i] = new Array();
            for(var j=0;j<NUM_REELS;j++){
                var oSymbol = new CStaticSymbolCell(i,j,iXPos,iYPos);
                _aStaticSymbols[i][j] = oSymbol;
                
                iXPos += SYMBOL_SIZE + SPACE_BETWEEN_SYMBOLS;
            }
            iXPos = REEL_OFFSET_X;
            iYPos += SYMBOL_SIZE;
        }
    };
    
    this.generateLosingPattern = function(){
         var aFirstCol = new Array();
         for(var i=0;i<NUM_ROWS;i++){
            var iRandIndex = Math.floor(Math.random()* (s_aRandSymbols.length-2));
            var iRandSymbol = s_aRandSymbols[iRandIndex];
            aFirstCol[i] = iRandSymbol;  
        }
        
        _aFinalSymbolCombo = new Array();
        for(var i=0;i<NUM_ROWS;i++){
            _aFinalSymbolCombo[i] = new Array();
            for(var j=0;j<NUM_REELS;j++){
                
                if(j === 0){
                    _aFinalSymbolCombo[i][j] = aFirstCol[i];
                }else{
                    do{
                        var iRandIndex = Math.floor(Math.random()* (s_aRandSymbols.length-2));
                        var iRandSymbol = s_aRandSymbols[iRandIndex];
                    }while(aFirstCol[0] === iRandSymbol || aFirstCol[1] === iRandSymbol || aFirstCol[2] === iRandSymbol);

                    _aFinalSymbolCombo[i][j] = iRandSymbol;
                }  
            }
        }
        
        _aWinningLine = new Array();
        _bReadyToStop = true;
    };
    
    this._generateRandSymbols = function() {
        var aRandSymbols = new Array();
        for (var i = 0; i < NUM_ROWS; i++) {
                var iRandIndex = Math.floor(Math.random()* s_aRandSymbols.length);
                aRandSymbols[i] = s_aRandSymbols[iRandIndex];
        }

        return aRandSymbols;
    };
    
    this.reelArrived = function(iReelIndex,iCol) {
        if(_iCurReelLoops>MIN_REEL_LOOPS ){
            if (_iNextColToStop === iCol) {
                if (_aMovingColumns[iReelIndex].isReadyToStop() === false) {
                    var iNewReelInd = iReelIndex;
                    if (iReelIndex < NUM_REELS) {
                            iNewReelInd += NUM_REELS;
                            
                            _aMovingColumns[iNewReelInd].setReadyToStop();
                            
                            _aMovingColumns[iReelIndex].restart(new Array(_aFinalSymbolCombo[0][iReelIndex],
                                                                        _aFinalSymbolCombo[1][iReelIndex],
                                                                        _aFinalSymbolCombo[2][iReelIndex]), true);
                            
                    }else {
                            iNewReelInd -= NUM_REELS;
                            _aMovingColumns[iNewReelInd].setReadyToStop();
                            
                            _aMovingColumns[iReelIndex].restart(new Array(_aFinalSymbolCombo[0][iNewReelInd],
                                                                          _aFinalSymbolCombo[1][iNewReelInd],
                                                                          _aFinalSymbolCombo[2][iNewReelInd]), true);
                            
                            
                    }
                    
                }
            }else {
                    _aMovingColumns[iReelIndex].restart(this._generateRandSymbols(),false);
            }
            
        }else {
            
            _aMovingColumns[iReelIndex].restart(this._generateRandSymbols(), false);
            if(_bReadyToStop && iReelIndex === 0){
                _iCurReelLoops++;
            }
            
        }
    };
    
    this.stopNextReel = function() {
        _iNumReelsStopped++;

        if(_iNumReelsStopped%2 === 0){
            
            playSound("reel_stop",1,false);
            
            _iNextColToStop = _aReelSequence[_iNumReelsStopped/2];
            if (_iNumReelsStopped === (NUM_REELS*2) ) {
                    this._endReelAnimation();
            }
        }    
    };
    
    this._endReelAnimation = function(){
        stopSound("reels");

        _bReadyToStop = false;
        
        _iCurReelLoops = 0;
        _iNumReelsStopped = 0;
        _iNextColToStop = _aReelSequence[0];

        if(_iBonus > 0){
            _oInterface.disableSpin(_bAutoSpin);
            _oInterface.disableGuiButtons(false);
        }
        
        if( !(_oFreeSpinPanel.visible === false && _iTotFreeSpin === 0)){
            _oInterface.refreshFreeSpinNum(_iTotFreeSpin);
        }
            
        //INCREASE MONEY IF THERE ARE COMBOS
        if(_aWinningLine.length > 0){
            //HIGHLIGHT WIN COMBOS IN PAYTABLE
            for(var i=0;i<_aWinningLine.length;i++){
                
                if(_aWinningLine[i].line > 0){
                    _oPayTable.highlightCombo(_aWinningLine[i].value-1,_aWinningLine[i].num_win);
                    _oInterface.showLine(_aWinningLine[i].line);
                }
                var aList = _aWinningLine[i].list;
                for(var k=0;k<aList.length;k++){
                    _aStaticSymbols[aList[k].row][aList[k].col].show(aList[k].value);
                    _aMovingColumns[aList[k].col].setVisible(aList[k].row,false);
                    _aMovingColumns[aList[k].col+NUM_REELS].setVisible(aList[k].row,false);
                }
            }
          

            if(_iTotFreeSpin > 0){
                _oLogo.visible = false;
                _oLogoFreeSpin.visible = true;
                _oFreeSpinPanel.visible = true;
            }else{
                _oLogo.visible = true;
                _oLogoFreeSpin.visible = false;
                _oFreeSpinPanel.visible = false;
                _oInterface.refreshFreeSpinNum("");
            }

            if(_iTotWin>0){
                _oInterface.refreshWinText(_iTotWin);
            }
			
            _iTimeElaps = 0;
            _iCurState = GAME_STATE_SHOW_ALL_WIN;
            
            playSound("win",0.3,false);
            
            
            if(_iBonus !== BONUS_WHEEL){
                _oInterface.refreshMoney(_iMoney);
            }
        }else{
            if(_iTotFreeSpin > 0){
                _oLogo.visible = false;
                _oLogoFreeSpin.visible = true;
                _oFreeSpinPanel.visible = true;
                
                _oInterface.disableSpin(_bAutoSpin);
                this.onSpin();
            }else{
                _oLogo.visible = true;
                _oLogoFreeSpin.visible = false;
                _oFreeSpinPanel.visible = false;
                _oInterface.refreshFreeSpinNum("");
                
                if(_bAutoSpin){
                    this._applyStakeSelection(_iLastLineActive, _iTotBet);
                    if(this._isStakeWithinRules(_iTotBet) || _iTotFreeSpin > 0){
                        _oInterface.enableAutoSpin();
                        this.onSpin();
                    }else{
                        this.resetCoinBet();
                        _bAutoSpin = false;
                        _oInterface.enableGuiButtons();
                    }
                }else{
                    _iCurState = GAME_STATE_IDLE;
                }
            }
            
        }

        this._applyStakeSelection(_iLastLineActive, _iTotBet);
        if(!this._isStakeWithinRules(_iTotBet) && _iTotFreeSpin === 0){
            this.resetCoinBet();
            _bAutoSpin = false;
            _oInterface.enableGuiButtons();
        }else{
            if(!_bAutoSpin && _iTotFreeSpin === 0 && _iBonus === 0){
                _oInterface.enableGuiButtons();
                _oInterface.disableBetBut(false);
            }
        }
        
        _iNumSpinCont++;
        if(_iNumSpinCont === NUM_SPIN_FOR_ADS){
            _iNumSpinCont = 0;
            
            $(s_oMain).trigger("show_interlevel_ad");
        }
        
        $(s_oMain).trigger("save_score",_iMoney);
    };

    this.hidePayTable = function(){
        _oPayTable.hide();
    };
    
    this._showWin = function(){
        var iLineIndex;
        if(_iCurWinShown>0){ 
            stopSound("win");
            
            iLineIndex = _aWinningLine[_iCurWinShown-1].line;
            if(iLineIndex > 0){
                _oInterface.hideLine(iLineIndex);
            }
            
            
            var aList = _aWinningLine[_iCurWinShown-1].list;
            for(var k=0;k<aList.length;k++){
                _aStaticSymbols[aList[k].row][aList[k].col].stopAnim();
                _aMovingColumns[aList[k].col].setVisible(aList[k].row,true);
                _aMovingColumns[aList[k].col+NUM_REELS].setVisible(aList[k].row,true);
            }
        }
        
        if(_iCurWinShown === _aWinningLine.length){
            _iCurWinShown = 0;
            if(_iTotFreeSpin > 0){
                _oInterface.disableSpin(_bAutoSpin);
                this.onSpin();
                return;
            }else if(_iBonus === BONUS_WHEEL){
                _oBonusPanel.show(_iCurBonusPrizeIndex,_iBonusWin);
                _iCurState = GAME_STATE_BONUS;
            }else if(_bAutoSpin){
                _oInterface.enableAutoSpin();
                this.onSpin();
                return;
            }
        }
        
        iLineIndex = _aWinningLine[_iCurWinShown].line;
        if(iLineIndex > 0){
            _oInterface.showLine(iLineIndex);
        }
        

        var aList = _aWinningLine[_iCurWinShown].list;
        for(var k=0;k<aList.length;k++){
            _aStaticSymbols[aList[k].row][aList[k].col].show(aList[k].value);
            _aMovingColumns[aList[k].col].setVisible(aList[k].row,false);
            _aMovingColumns[aList[k].col+NUM_REELS].setVisible(aList[k].row,false);
        }
            

        _iCurWinShown++;
        
    };
    
    this._hideAllWins = function(){
        for(var i=0;i<_aWinningLine.length;i++){
            var aList = _aWinningLine[i].list;
            for(var k=0;k<aList.length;k++){
                _aStaticSymbols[aList[k].row][aList[k].col].stopAnim();
                _aMovingColumns[aList[k].col].setVisible(aList[k].row,true);
                _aMovingColumns[aList[k].col+NUM_REELS].setVisible(aList[k].row,true);
            }
        }
        
        _oInterface.hideAllLines();

        _iTimeElaps = 0;
        _iCurWinShown = 0;
        _iTimeElaps = TIME_SHOW_WIN;
        _iCurState = GAME_STATE_SHOW_WIN;
    };
	
    this.activateLines = function(iLine){
        this.removeWinShowing();
        this._applyStakeSelection(iLine, _iTotBet);
    };
	
    this.addLine = function(){
        if(_iLastLineActive === NUM_PAYLINES){
            _iLastLineActive = 1;  
        }else{
            _iLastLineActive++;    
        }

        this._applyStakeSelection(_iLastLineActive, _iTotBet);
    };
    
    this.resetCoinBet = function(){
        this._applyStakeSelection(_iLastLineActive, 0);
    };
    
    this.changeCoinBet = function(){
        if(!Array.isArray(COIN_BET) || COIN_BET.length === 0){
            this._applyStakeSelection(_iLastLineActive, _iTotBet);
            return;
        }

        _iCurCoinIndex++;
        if(_iCurCoinIndex === COIN_BET.length){
            _iCurCoinIndex = 0;
        }
        var iNewBet = parseFloat(COIN_BET[_iCurCoinIndex]);
        
        var iNewTotalBet = iNewBet * _iLastLineActive;
        iNewTotalBet = parseFloat(iNewTotalBet.toFixed(2));
        
        _iCurBet = iNewBet;
        _iCurBet = Math.floor(_iCurBet * 100)/100;
        _iTotBet = iNewTotalBet;
        _oInterface.refreshBet(_iCurBet);
        _oInterface.refreshTotalBet(_iTotBet);       

        if(this._isStakeWithinRules(_iTotBet)){
            _oInterface.enableSpin();
        }else{
            _oInterface.disableSpin(_bAutoSpin);
        }

		
    };
	
    this.onMaxBet = function(){
        if(!this._applyMaximumStake()){
            s_oMsgBox.show(this._stakeValidationMessage());
            return;
        }

        if(this._isStakeWithinRules(_iTotBet)){
            _oInterface.enableSpin();
            this.onSpin();
        }else{
            _oInterface.disableSpin(_bAutoSpin);
        }
    };
    
    this.removeWinShowing = function(){
        _oPayTable.resetHighlightCombo();
        
        _oInterface.resetWin();
        
        for(var i=0;i<NUM_ROWS;i++){
            for(var j=0;j<NUM_REELS;j++){
                _aStaticSymbols[i][j].hide();
                _aMovingColumns[j].setVisible(i,true);
                _aMovingColumns[j+NUM_REELS].setVisible(i,true);
            }
        }
        
        for(var k=0;k<_aMovingColumns.length;k++){
            _aMovingColumns[k].activate();
        }
        
        _iCurState = GAME_STATE_IDLE;
    };
    
    this.onSpin = function(){
        var bIsFreeSpinRound = (_oLogoFreeSpin && _oLogoFreeSpin.visible === true);

        if(!bIsFreeSpinRound && _iTotFreeSpin === 0){
            this._applyStakeSelection(_iLastLineActive, _iTotBet);
        }

        if(!bIsFreeSpinRound && _iTotFreeSpin === 0 && !this._isStakeWithinRules(_iTotBet)){
            _oInterface.enableGuiButtons();
            _bAutoSpin = false;
            s_oMsgBox.show(this._stakeValidationMessage());
            return;
        }

        if(_iMoney < _iTotBet && _iTotFreeSpin === 0){
            _oInterface.enableGuiButtons();
            _bAutoSpin = false;
            s_oMsgBox.show(TEXT_NOT_ENOUGH_MONEY);
            return;
        }
        
        stopSound("win");
        playSound("reels",1,false);
        
        
        _oInterface.disableBetBut(true);
        this.removeWinShowing();

        if(s_bLogged !== true){
            stopSound("reels");
            _oInterface.enableGuiButtons();
            _oInterface.disableBetBut(false);
            _bAutoSpin = false;
            s_oMsgBox.show("Game session is not ready. Please reopen Arabian Game.");
            return;
        }

        if(bIsFreeSpinRound){
            _iTotBet = 0;
        }else{
            _iTotBet = this._roundMoney(_iCurBet * _iLastLineActive);
        }
        tryCallSpin(_iCurBet,_iTotBet,_iLastLineActive);

        _oInterface.hideAllLines();
        _oInterface.disableGuiButtons(_bAutoSpin);
    };
    
    //AUTOSPIN BUTTON CLICKED
    this.onAutoSpin = function(){
        _bAutoSpin = true;
        this.onSpin();
    };
    
    this.onStopAutoSpin = function(){
        _bAutoSpin = false;
        
        if(_iCurState !== GAME_STATE_SPINNING && _iCurState !== GAME_STATE_BONUS){
            _oInterface.enableGuiButtons();
        }
    };
    
    this.generateLosingPattern = function(){
         var aFirstCol = new Array();
         for(var i=0;i<NUM_ROWS;i++){
            var iRandIndex = Math.floor(Math.random()* (s_aRandSymbols.length-2));
            var iRandSymbol = s_aRandSymbols[iRandIndex];
            aFirstCol[i] = iRandSymbol;  
        }
        
        _aFinalSymbolCombo = new Array();
        for(var i=0;i<NUM_ROWS;i++){
            _aFinalSymbolCombo[i] = new Array();
            for(var j=0;j<NUM_REELS;j++){
                
                if(j === 0){
                    _aFinalSymbolCombo[i][j] = aFirstCol[i];
                }else{
                    do{
                        var iRandIndex = Math.floor(Math.random()* (s_aRandSymbols.length-2));
                        var iRandSymbol = s_aRandSymbols[iRandIndex];
                    }while(aFirstCol[0] === iRandSymbol || aFirstCol[1] === iRandSymbol || aFirstCol[2] === iRandSymbol);

                    _aFinalSymbolCombo[i][j] = iRandSymbol;
                }  
            }
        }
        
        _aWinningLine = new Array();
        _bReadyToStop = true;
    };
    
    this.onSpinReceived = function(oRetData){
        _iMoney -= _iTotBet;
        _oInterface.refreshMoney(_iMoney);
        
        _iCurState = GAME_STATE_SPINNING;
        
        if ( oRetData.res === "true" ){
                _iTotFreeSpin = parseInt(oRetData.freespin);
                
                if(oRetData.win === "true"){
                    _aFinalSymbolCombo = JSON.parse(oRetData.pattern);
                    _aWinningLine = JSON.parse(oRetData.win_lines);
                    
                    if(parseInt(oRetData.freespin) > 0 ){
                        _iBonus = BONUS_FREESPIN;   
                    }else if(parseInt(oRetData.bonus) > 0){
                        _iBonus = BONUS_WHEEL;
                        _iCurBonusPrizeIndex = oRetData.bonus_prize;
                        _iBonusWin = oRetData.bonus_win;
                    }else{
                        _iBonus = 0;
                    }
                    
                    //GET TOTAL WIN FOR THIS SPIN
                    _iTotWin = parseFloat(oRetData.tot_win);

                    _bReadyToStop = true;
                }else{
                    _iBonus = 0;
                    
                    _aFinalSymbolCombo = JSON.parse(oRetData.pattern);

                    _aWinningLine = new Array();
                    _bReadyToStop = true;
                }

                _iMoney = this._roundMoney(parseFloat(oRetData.money));
                
        }else{
                s_oGame.generateLosingPattern();
        }

        this.onExternalStakeContext({
            balance: _iMoney,
            betLimits: oRetData ? oRetData.betLimits : null
        });
    };
    
    this.onInfoClicked = function(){
        if(_iCurState === GAME_STATE_SPINNING){
            return;
        }
        
        if(_oPayTable.isVisible()){
            _oPayTable.hide();
        }else{
            _oPayTable.show();
        }
    };
    
    this.onConnectionLost = function(){
        s_oMsgBox.show(TEXT_CONNECTION_LOST);
        _oInterface.enableGuiButtons();
    };
    
    this.exitFromBonus = function(){
        $(s_oMain).trigger("bonus_end",_iMoney);
        _oInterface.refreshMoney(_iMoney);
        
        if(_bAutoSpin){
            _oInterface.enableAutoSpin();
            this.onSpin();
        }else{
            _oInterface.enableGuiButtons();
            _oInterface.disableBetBut(false);
            this._applyStakeSelection(_iLastLineActive, _iTotBet);
        }
        
        $(s_oMain).trigger("save_score",_iMoney);
    };

    this.onExit = function(){
        this.unload();
        s_oMain.gotoMenu();
        
        $(s_oMain).trigger("end_session");
        $(s_oMain).trigger("share_event", {
                img: "200x200.jpg",
                title: TEXT_CONGRATULATIONS,
                msg:  TEXT_MSG_SHARE1+ _iMoney + TEXT_MSG_SHARE2,
                msg_share: TEXT_MSG_SHARING1 + _iMoney + TEXT_MSG_SHARING2
            });
    };
    
    this.getState = function(){
        return _iCurState;
    };
    
    this.update = function(){
        if(_bUpdate === false){
            return;
        }
       
        switch(_iCurState){
            case GAME_STATE_SPINNING:{
                for(var i=0;i<_aMovingColumns.length;i++){
                    _aMovingColumns[i].update();
                }
                break;
            }
            case GAME_STATE_SHOW_ALL_WIN:{
                    
                    _iTimeElaps += s_iTimeElaps;
                    if(_iTimeElaps> TIME_SHOW_ALL_WINS){  
                        this._hideAllWins();
                    }
                    break;
            }
            case GAME_STATE_SHOW_WIN:{
                _iTimeElaps += s_iTimeElaps;
                if(_iTimeElaps > TIME_SHOW_WIN){
                    _iTimeElaps = 0;

                    this._showWin();
                }
                break;
            }
            case GAME_STATE_BONUS:{
                    _oBonusPanel.update();
                    break;
            }
        }
        
	
    };
    
    s_oGame = this;
    
    
    
    this._init();
}

var s_oGame;
var s_oTweenController;
