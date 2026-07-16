/**********************************
********  ENTERGAME LOGIC  ********
**********************************/
var EnterGameAction = {

    //input parameters
    Login: null,
    Password: null,
    CasinoGameId: null,
    AccountId: '1',
    Lang: 'en',
    Token: null,
    NoRedirect: '1',
    Url: '../../Launch/Enter.aspx',

    //out parameters
    GameSession: null,

    DoEnterGameAction: function () {
        var parameters = "";
        if (this.Token != null) {
            parameters = "CasinoGameId=" + this.CasinoGameId + "&AccountId=" + this.AccountId + "&Lang=" + this.Lang + "&NoRedirect=" + this.NoRedirect + "&Token=" + this.Token;
        } else {
            if (this.Login != null && this.Password != null) {
                parameters = 'login=' + this.Login + "&password=" + this.Password + "&CasinoGameId=" + this.CasinoGameId + "&AccountId=" + this.AccountId + "&Lang=" + this.Lang + "&NoRedirect=" + this.NoRedirect;
            }
            else {
                parameters = "CasinoGameId=" + this.CasinoGameId + "&AccountId=" + this.AccountId + "&Lang=" + this.Lang + "&NoRedirect=" + this.NoRedirect;
            }
        }
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: this.Url,
            data: parameters,
            success: function (data) {
                DoEnterGameGetData(data);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert("ERROR in Enter Action"); 
            }
        });
    }
}

//get the EnterGame response data
function DoEnterGameGetData(data) {
    try {
        //response vars
        ErrorCode = null;
        var gamesession = null;
        var lang = 'en';
        var gamecode = null;
        var showcashier = 0;
        var showhistory = null;
        var showtype = null;
        var showchips = null;
        var shownavbar = null;

        var array = data.split('&');

        for (var i = 0; i < array.length; i++) {
            var arrayTemp2 = array[i].split('=');
            if (arrayTemp2[0].toUpperCase() == 'ERRCODE') {
                ErrorCode = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'ERRD') {
                ErrorCode = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'GAMESESSION') {
                gamesession = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'LANG') {
                lang = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'GAMECODE') {
                gamecode = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'SHOWCASHIER') {
                showcashier = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'SHOWHISTORY') {
                showhistory = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'SHOWTYPE') {
                showtype = arrayTemp2[1];
            } else if(arrayTemp2[0].toUpperCase() == 'SHOWCHIPS'){
                showchips = arrayTemp2[1];
            } else if(arrayTemp2[0].toUpperCase() == 'CURRENCY'){
                currency = arrayTemp2[1];
            }
        }

        if (gamesession != null && ErrorCode == null) {
            afterEnter(gamesession, gamecode, showchips, showcashier, showhistory, showtype);
            return true;
        }
        else {
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            return false;
        }
    } catch (err) {
        txt = "There was an error on this function DoEnterGameGetData.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

/**********************************
*********  Init Action  *********
**********************************/
var InitAction = {
    Url: null,
    GameSession: null,
    doInitAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession;
        this.Url = Global.Connector.rootLevel + 'Baccarat/Init.aspx';
        console.log("acac Global.Connector.rootLevel", Global.Connector.rootLevel , this.Url);

        var receivedServerResponse = false;
        var that = this;
        var checkResponseTimer = setTimeout(function(){
            if(!receivedServerResponse) {
                var errorTranslation = ("ERR_DB_NOCONN");
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage("Database connection could not be established");
                    } else {
                        showErrorMessage("Database connection could not be established");
                    }
                } else {
                    if(isMobile.any()){
                        showErrorMessage(errorTranslation);
                    } else {
                        showErrorMessage(errorTranslation);
                    }
                }
                if(typeof(hideReelsError) != "undefined")
                    hideReelsError();
                return false;
            }
        }, waitResponseTime);

        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1, 
            success: function (data) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                DoInit(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Init Action"); 
            }
        });
        /*var data = 'road=&blocknote=Su balance disponilbe es de 5&iserr=0&availablebalance=&comm=5.00&messageids=38837&sid=1&tcounter=&bal=120000&jackpot=&tcountertype=&maxb=200.00&minb=1.00&stats=0,0,0,0,0,0,0&lastgameid=4213&tiep=8.0000';
        DoInit(data, callback1);*/
    }
}

//Init response data 
function DoInit(data, callback) {
    /*try {*/
        if(typeof(HeartbeatManager) != "undefined"){
            HeartbeatManager.setLastServerCall();
        }
        ErrorCode = null;
        if (data != undefined && data.length > 0) {
            var array = data.split('&');
            for (var i = 0; i < array.length; i++) {
                var arrayTemp2 = array[i].split('=');
                
                if (arrayTemp2[0].toUpperCase() == 'BAL') {
                    Global.Connector.bal = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'MINB') {
                    Global.Connector.minb = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'MAXB') {
                    Global.Connector.maxb = parseFloat(arrayTemp2[1]);
                } else if (arrayTemp2[0].toUpperCase() == 'TIEP') {
                    Global.BAC.TiePercentage = arrayTemp2[1];
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
                } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                    Global.BAC.comm = arrayTemp2[1];
                }
            }

            if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
               // UpdateBalanceWrapper(Global.Connector.bal);
                callback();
                return true;
            } else {
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
   /* } catch (err) {
        txt = "There was an error on this function DoInit.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }*/
}


/**********************************
********  DEAL LOGIC  ********
**********************************/
var DealAction = {

    //input parameters
    dealPlayerBet: null,
    dealBankerBet: null,
    dealTieBet: null,
    GameSession: null,
    Url: null,

    DoDealAction: function (callback1) {
        this.Url = Global.Connector.rootLevel + 'Baccarat/Deal.aspx'; 
        var parameters = "gamesession=" + Global.Connector.gameSession;
        if (this.dealPlayerBet != null) {
            parameters += "&ply=" + this.dealPlayerBet;
        }
        if (this.dealBankerBet != null) {
            parameters += "&bnk=" + this.dealBankerBet;
        }
        if (this.dealTieBet != null) {
            parameters += "&tie=" + this.dealTieBet;
        }

        var receivedServerResponse = false;
        var that = this;
        var checkResponseTimer = setTimeout(function(){
            if(!receivedServerResponse) {
                var errorTranslation = ("ERR_DB_NOCONN");
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage("Database connection could not be established");
                    } else {
                        showErrorMessage("Database connection could not be established");
                    }
                } else {
                    if(isMobile.any()){
                        showErrorMessage(errorTranslation);
                    } else {
                        showErrorMessage(errorTranslation);
                    }
                }
                if(typeof(hideReelsError) != "undefined")
                    hideReelsError();
                return false;
            }
        }, waitResponseTime);
        
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: this.Url,
            data: parameters,
            callback: callback1,
            success: function (data) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                DoDealGetData(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Deal Action"); 
            }
        });

        /*var data = 'pc3=&pc1=25&blocknote=&iserr=0&availablebalance=&ptot=7&btot=9&ppre=7&lastgameid=4214&jackpot=&tcounter=&rslt=-0.05&bpre=2&bc1=3&bc2=35&bc3=33&bal=97310.65&messageids=18&stats=0,1,0,0,0,0,0&rblock=B&bankerrslt=0.95&pc2=7';
        DoDealGetData(data,callback1);*/
    }
}

//get the Deal response data 
function DoDealGetData(data, callback) {

    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }

    ErrorCode = null;
    var array = data.split('&');

    Global.BAC.PlayerCards = new Array();
    Global.BAC.BankerCards = new Array();
    Global.BAC.PlayerResults = new Array(),
    Global.BAC.BankerResults = new Array()

    for (var i = 0; i < array.length; i++) {
        var arrayTemp2 = array[i].split('=');



        if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
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
        }else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
            Global.ChipTransfer.tcounter = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PC1') {
            Global.BAC.PlayerCards[0] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PC2') {
            Global.BAC.PlayerCards[1] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PC3') {
            Global.BAC.PlayerCards[2] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'BC1') {
            Global.BAC.BankerCards[0] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'BC2') {
            Global.BAC.BankerCards[1] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'BC3') {
            Global.BAC.BankerCards[2] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PPRE') {
            Global.BAC.PlayerResults[0] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PTOT') {
            Global.BAC.PlayerResults[1] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'BPRE') {
            Global.BAC.BankerResults[0] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'BTOT') {
            Global.BAC.BankerResults[1] = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'RSLT') {
            Global.BAC.Result = parseFloat(arrayTemp2[1]);
        } else if (arrayTemp2[0].toUpperCase() == 'BANKERRSLT') {
            Global.BAC.BankerResult = parseFloat(arrayTemp2[1]);
        } else if (arrayTemp2[0].toUpperCase() == 'BAL') {
            Global.Connector.bal = parseFloat(arrayTemp2[1]);
        }
    }
    //ErrorCode = 'ERR_AUTH_FAILED'; 
    // alert('Error: '+ErrorCode);
    if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
        /*UpdateBalanceWrapper(Global.Connector.bal);
        CurrentPlayerCardDrawed = CurrentBankerCardDrawed = 0;
        drawGame();*/
        callback();
        return true;
    }
    /*else if(CustomErrorMessages && Global.Connector.errd == 'ERR_AUTH_FAILED')
    {
        showErrorMessage("Your game session was closed. Please open the game again.");
        return false;
    }*/
    else {
        if(Global.Connector.errorCode != null)
            showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
        else
            showErrorMessage(decodeURIComponent(Global.Connector.errd));
        //errorOnDB();
        return false;
    }
}




/*API WRAPPER*/
function UpdateBalanceWrapper(_balance){
    try{
        if(window.parent != null){
            if(window.parent.$("#balance-value")){
                var txt = window.parent.$("#balance-value").text(_balance);
            }
            if(window.parent.$("#balance-number")){
                var txt = window.parent.$("#balance-number").text(_balance);
            }
        }
    }catch (err) {}
}

function UpdatePorcentage(_increase){
    try{
        if(window.parent != null){
            if(window.parent.setLevelPercentage != null && window.parent.setLevelPercentage != undefined){
                window.parent.setLevelPercentage(_increase);
            }
        }
    }catch (err) {}
}

function CloseWrapperGame(){
    try{
        if(window.parent != null){
            if(window.parent.CloseGame != null && window.parent.CloseGame != undefined){
                window.parent.CloseGame();
                return true;
            }
        }
    }catch (err) {}    
    return false;
}