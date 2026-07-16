/**********************************
*********  Init Action   *********
**********************************/
var InitAction = {
    Url: Global.Connector.rootLevel + 'roulette/Init.aspx',
    DoInitAction: function (callback1) {
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
                DoInit(data, this.callback);
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
function DoInit(data, callback) {

        if (data != undefined && data.length > 0) {
            var array = data.split('&');
            for (var i = 0; i < array.length; i++) {
                var arrayTemp2 = array[i].split('=');

                if (arrayTemp2[0].toUpperCase() == 'BAL') {
                    Global.Connector.bal = parseFloat(arrayTemp2[1]).toFixed(2);
                } else if (arrayTemp2[0].toUpperCase() == 'MINB') {
                    Global.Connector.minb = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'MAXB') {
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
                }else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                    Global.Connector.jackpot = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'TCOUNTERTYPE'){
                    Global.Connector.tCounterType = arrayTemp2[1];
                }else if(arrayTemp2[0].toUpperCase() == 'OTH_ISEURO'){
                    Global.RLSZ.oth_iseuro = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'MAX_CN'){
                    Global.RLSZ.max_cn = decodeURIComponent(arrayTemp2[1]);
                }else if (arrayTemp2[0].toUpperCase() == 'MAX_FF') {
                    Global.RLSZ.max_ff = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_HS') {
                    Global.RLSZ.max_hs = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_ST') {
                    Global.RLSZ.max_st = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_SU') {
                    Global.RLSZ.max_su = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_SX') {
                    Global.RLSZ.max_sx = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_VS') {
                    Global.RLSZ.max_vs = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_XS') {
                    Global.RLSZ.max_xs = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MAX_XT') {
                    Global.RLSZ.max_xt = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'SID') {
                    Global.RLSZ.sid = arrayTemp2[1];
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


/**********************************
*********  Spin Action  *********
**********************************/
var SpinAction = {
    Url: Global.Connector.rootLevel +'roulette/Spin.aspx',
    Bets: null,
    DoSpinAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + "&iseuro=" + Global.RLSZ.oth_iseuro  + this.Bets + "&lastgameid="+ (Global.Connector.lastGameId == null?0: Global.Connector.lastGameId) + '&rand=' + Math.floor((Math.random() * 10000) + 1);
        
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
                alert("ERROR in Deal Action"); 
            }
        });
    }
}

// Deal response data
function DoSpin(data, callback) {

    Global.RLSZ.rslt = null;
    Global.RLSZ.spin = null;

    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        for (var i = 0; i < array.length; i++) {
            var arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]).toFixed(2);
            } else if (arrayTemp2[0].toUpperCase() == 'RSLT') {
                Global.RLSZ.rslt = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'SPIN') {
                Global.RLSZ.spin = arrayTemp2[1];
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