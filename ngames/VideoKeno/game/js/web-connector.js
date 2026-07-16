/**********************************
*********  Recover Action  *********
**********************************/
var RecoverAction = {
    Url: Global.Connector.rootLevel + 'VideoKeno/Recover.aspx',
    DoRecoverAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + "&lastgameid="+ (Global.Connector.lastGameId == null?0: Global.Connector.lastGameId) + '&rand=' + Math.floor((Math.random() * 10000) + 1);
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1,
            success: function (data) {
                DoRecover(data, this.callback);
                IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                alert("ERROR in Recover Action"); 
            }
        });
    }
}

//Recover response data
function DoRecover(data, callback) {

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
                } else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
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
                }else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                    Global.ChipTransfer.tcounter = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                    Global.Connector.jackpot = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'TCOUNTERTYPE'){
                    Global.Connector.tCounterType = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'COINVALUE'){
                    Global.Connector.cv = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'COINVALUES'){
                    Global.Connector.cvals = decodeURIComponent(arrayTemp2[1]);
                }else if(arrayTemp2[0].toUpperCase() == 'COINVALUESD'){
                    Global.Connector.cvalsd = decodeURIComponent(arrayTemp2[1]);
                }else if(arrayTemp2[0].toUpperCase() == 'BALL20MULT'){
                    Global.VKENO.Ball20Mult = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'EXTRABALLS'){
                    Global.VKENO.ExtraBalls = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'FREEMULT'){
                    Global.VKENO.FreeMult = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'EXTRAPRICE'){
                    Global.VKENO.ExtraPrice = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'MAXSPOTS'){
                    Global.VKENO.MaxSpots = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'BALL20FREE'){
                    Global.VKENO.Ball20Free = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'PAYOUTS'){
                    Global.VKENO.Payouts = decodeURIComponent(arrayTemp2[1]);
                }else if(arrayTemp2[0].toUpperCase() == 'MINSPOTS'){
                    Global.VKENO.MinSpots = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'NUMCOINS'){
                    Global.VKENO.NumCoins = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'BALL01MULT'){
                    Global.VKENO.Ball01Mult = arrayTemp2[1];
                }
            }
            //Ball20Mult=1&ExtraBalls=0&CoinValue=0.50&iserr=0&GameId=0&BlockNote=&FreeMult=1&CoinValuesD=10%C2%A2%2C50%C2%A2%2C%241&AvailableBalance=&Jackpot=&ExtraPrice=1.00&MaxSpots=10&TCounterType=&Ball20Free=0&LastGameId=&CoinValues=0.10%2C0.50%2C1.00&MinBet=0.10&TCounter=&Payouts=10,10,9000.00;10,9,900.00;10,8,90.00;10,7,18.00;10,6,4.00;10,5,3.00;10,4,2.00;10,3,1.00;10,0,2.00;9,9,8000.00;9,8,800.00;9,7,80.00;9,6,16.00;9,5,4.00;9,4,2.00;9,3,1.00;9,0,2.00;8,8,7000.00;8,7,700.00;8,6,70.00;8,5,7.00;8,4,3.00;8,3,1.00;7,7,3000.00;7,6,300.00;7,5,30.00;7,4,3.00;7,3,1.00;6,6,800.00;6,5,25.00;6,4,5.00;6,3,2.00;6,2,1.00;5,5,400.00;5,4,10.00;5,3,3.00;5,2,1.00;4,4,100.00;4,3,4.00;4,2,2.00;3,3,45.00;3,2,2.00;2,2,15.00&Balance=48561.45&MaxBet=5.00&MinSpots=2&MessageIDs=&NumCoins=5&Ball01Mult=1
            if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {         
                callback();
                return true;
            } 
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
}


/**********************************
*********  Spin Action  *********
**********************************/
var SpinAction = {
    Url: Global.Connector.rootLevel +'VideoKeno/Spin.aspx',
    Ante: null,
    BoughtSlot: null,
    DoSpinAction: function (callback1) {
        var parameters = 'gamesession=' + Global.Connector.gameSession + "&CoinValue=" + Global.VKENO.SelectedChipValue + "&CoinsBet=" + Global.VKENO.CoinsBet + "&Ticket=" + Ticket + '&rand=' + Math.floor((Math.random() * 10000) + 1);
        
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1,
            success: function (data) {
                DoSpin(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert("ERROR in Spin Action"); 
            }
        });
    }
}

// Spin response data
function DoSpin(data, callback) {

    Global.VKENO.BallsDrawn = null;
    Global.VKENO.GameId = null;
    Global.VKENO.ResultAmt = null;

    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        for (var i = 0; i < array.length; i++) {
            var arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]).toFixed(2);
            } else if (arrayTemp2[0].toUpperCase() == 'RESULTAMT') {
                Global.VKENO.ResultAmt = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'BALLSDRAWN') {
                Global.VKENO.BallsDrawn = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'GAMEID') {
                Global.VKENO.GameId = arrayTemp2[1];
            } else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
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
            }else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                Global.Connector.jackpot = arrayTemp2[1];
            }
        }
        if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
            callback();
            return true;
        } 
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
}

