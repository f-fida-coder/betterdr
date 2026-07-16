/**********************************
*********  Open Game Action  *********
**********************************/
var OpenGameAction = {
    Url: Global.Connector.rootLevel + 'PaiGow/OpenGame.aspx',
    GameSession: null,
    BetAmt: null,
    DoOpenGameAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession;
        if (this.BetAmt != null) {
            parameters += '&betamt=' + this.BetAmt;
        }
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1,
            success: function (data) {
                DoOpenGame(data, this.callback);
                IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                alert("ERROR in Open Game Action"); 
            }
        });
    }
}

//OpenGame response data
function DoOpenGame(data, callback) {
    /*try {*/
        //Clean the arrays
        for (var playerCard = 0; playerCard <= 1; playerCard++) {
            Global.PKPAI.PlayerFrontCards[playerCard] = ['', '', ''];
        }
        for (var playerCard = 0; playerCard <= 6; playerCard++) {
            Global.PKPAI.PlayerBackCards[playerCard] = ['', '', ''];
        }
        for (var houseWayCard = 0; houseWayCard <= 1; houseWayCard++) {
            Global.PKPAI.HouseWayFrontCards[houseWayCard] = '';
        }
        for (var houseWayCard = 0; houseWayCard <= 4; houseWayCard++) {
            Global.PKPAI.HouseWayBackCards[houseWayCard] = '';
        }

        if (data != undefined && data.length > 0) {
            var array = data.split('&');
            for (var i = 0; i < array.length; i++) {
                var arrayTemp2 = array[i].split('=');

                if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
                    Global.Connector.bal = parseFloat(arrayTemp2[1]).toFixed(2);
                } else if (arrayTemp2[0].toUpperCase() == 'MINBET') {
                    Global.Connector.minb = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'MAXBET') {
                    Global.Connector.maxb = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'BETAMT') {
                    Global.PKPAI.betAmt = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'P1') {
                    Global.PKPAI.PlayerBackCards[0][0] = 'player-card-1';
                    Global.PKPAI.PlayerBackCards[0][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P2') {
                    Global.PKPAI.PlayerBackCards[1][0] = 'player-card-2';
                    Global.PKPAI.PlayerBackCards[1][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P3') {
                    Global.PKPAI.PlayerBackCards[2][0] = 'player-card-3';
                    Global.PKPAI.PlayerBackCards[2][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P4') {
                    Global.PKPAI.PlayerBackCards[3][0] = 'player-card-4';
                    Global.PKPAI.PlayerBackCards[3][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P5') {
                    Global.PKPAI.PlayerBackCards[4][0] = 'player-card-5';
                    Global.PKPAI.PlayerBackCards[4][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P6') {
                    Global.PKPAI.PlayerBackCards[5][0] = 'player-card-6';
                    Global.PKPAI.PlayerBackCards[5][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'P7') {
                    Global.PKPAI.PlayerBackCards[6][0] = 'player-card-7';
                    Global.PKPAI.PlayerBackCards[6][1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PF1') {
                    Global.PKPAI.HouseWayFrontCards[0] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PF2') {
                    Global.PKPAI.HouseWayFrontCards[1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PB1') {
                    Global.PKPAI.HouseWayBackCards[0] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PB2') {
                    Global.PKPAI.HouseWayBackCards[1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PB3') {
                    Global.PKPAI.HouseWayBackCards[2] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PB4') {
                    Global.PKPAI.HouseWayBackCards[3] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PB5') {
                    Global.PKPAI.HouseWayBackCards[4] = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                    Global.Connector.messageId = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'LASTGAMEID'){
                    Global.Connector.lastGameId = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BLOCKNOTE'){
                    Global.Connector.blockNote =  arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'AVAILABLEBALANCE'){
                    Global.Connector.availableBalance = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'ERRCODE'){
                    Global.Connector.errorCode = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ISERR'){
                    Global.Connector.iserr = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ERRD'){
                    Global.Connector.errd = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                    Global.ChipTransfer.tcounter = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'GAMEID'){
                    Global.PKPAI.gameId = arrayTemp2[1];
                }
            }
            if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
                if (Global.PKPAI.gameId == 0) {
                    GameStatus = BETTING;
                }
                else if (Global.PKPAI.gameId > 0) {
                    GameStatus = PLAYING_GAME;
                }
                callback();

                return true;
            } 
            /*else if(CustomErrorMessages && ErrorCode == 'ERR_AUTH_FAILED')
            {
                 if(Global.Connector.errorCode != null)
                    showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
                else
                    showErrorMessage(decodeURIComponent(Global.Connector.errd));
                return false;
            }*/
            else {
                 if(Global.Connector.errorCode != null)
                    showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
                else
                    showErrorMessage(decodeURIComponent(Global.Connector.errd));
                return false;
            }
        }
        else {
            return false;
        }
    /*} catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }*/
}


/**********************************
*********  Close Game Action  *********
**********************************/
var CloseGameAction = {
    Url: Global.Connector.rootLevel +'PaiGow/CloseGame.aspx',
    GameSession: null,
    GameId: null,
    HandInfo: null,
    DoCloseGameAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + "&GameId=" + Global.PKPAI.gameId;
        if (this.HandInfo != null && this.HandInfo.length == 7) {
            parameters += '&H1=' + this.HandInfo[0] +
                        '&H2=' + this.HandInfo[1] +
                        '&H3=' + this.HandInfo[2] +
                        '&H4=' + this.HandInfo[3] +
                        '&H5=' + this.HandInfo[4] +
                        '&H6=' + this.HandInfo[5] +
                        '&H7=' + this.HandInfo[6];
        }
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1,
            success: function (data) {
                DoCloseGame(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert("ERROR in Close Game Action"); 
            }
        });
    }
}

//OpenGame response data
function DoCloseGame(data, callback) {
    ErrorCode = null;
    /*try {*/
        if (data != undefined && data.length > 0) {
            var array = data.split('&');
            for (var i = 0; i < array.length; i++) {
                var arrayTemp2 = array[i].split('=');

                if (arrayTemp2[0].toUpperCase() == 'NEWBALANCE') {
                    Global.Connector.bal = parseFloat(arrayTemp2[1]).toFixed(2);
                } else if (arrayTemp2[0].toUpperCase() == 'MONEYDELTA') {
                    Global.PKPAI.resultAmt = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'RESULT') {
                    Global.PKPAI.result = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DF1') {
                    Global.PKPAI.DealerCards[5] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DF2') {
                    Global.PKPAI.DealerCards[6] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DB1') {
                    Global.PKPAI.DealerCards[0] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DB2') {
                    Global.PKPAI.DealerCards[1] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DB3') {
                    Global.PKPAI.DealerCards[2] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DB4') {
                    Global.PKPAI.DealerCards[3] = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'DB5') {
                    Global.PKPAI.DealerCards[4] = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                    Global.Connector.messageId = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'LASTGAMEID'){
                    Global.Connector.lastGameId = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BLOCKNOTE'){
                    Global.Connector.blockNote =  arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'AVAILABLEBALANCE'){
                    Global.Connector.availableBalance = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'ERRCODE'){
                    Global.Connector.errorCode = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ISERR'){
                    Global.Connector.iserr = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ERRD'){
                    Global.Connector.errd = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                    Global.ChipTransfer.tcounter = arrayTemp2[1];
                }
            }
            //ErrorCode = 'ERR_AUTH_FAILED';
            if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
                GameStatus = WAITING_REBET;
                callback();
                return true;
            } 
            /*else if(CustomErrorMessages && ErrorCode == 'ERR_AUTH_FAILED')
            {
                if(Global.Connector.errorCode != null)
                    showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
                else
                    showErrorMessage(decodeURIComponent(Global.Connector.errd));
                return false;
            }*/ else {
                if(Global.Connector.errorCode != null)
                    showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
                else
                    showErrorMessage(decodeURIComponent(Global.Connector.errd));
                
                return false;
            }
        }
        else {
            return false;
        }
    /*} catch (err) {
        txt = "There was an error on this page.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }*/
}





