var callingRoll = false;
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
*********  Recover Action  *********
**********************************/
var RecoverAction = {
    Url: null,
    
    doRecoverAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastgameid ;
        this.Url = Global.Connector.rootLevel + 'Craps/Recover.aspx';

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
                DoRecover(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Recover Action"); 
            }
        });
        /*var data = 'road=&blocknote=Su balance disponilbe es de 5&iserr=0&availablebalance=&comm=5.00&messageids=38837&sid=1&tcounter=&bal=120000&jackpot=&tcountertype=&maxb=200.00&minb=1.00&stats=0,0,0,0,0,0,0&lastgameid=4213&tiep=8.0000';
        DoInit(data, callback1);*/
    }
}

//Recover response data 
function DoRecover(data, callback) {
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
                } else if (arrayTemp2[0].toUpperCase() == 'OTH_BETSOFF') {
                    Global.CP.oth_betsoff = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'OTH_DONTBAR') {
                    Global.CP.oth_dontbar = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'CUPO') {
                    Global.CP.cupo = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'SID') {
                    Global.CP.sid = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'TOTB') {
                    Global.CP.totb = arrayTemp2[1];
                }
                else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
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
                } else if (arrayTemp2[0].toUpperCase() == 'ISREC'){
                    Global.CP.isrec = arrayTemp2[1];
                } 
                else if (arrayTemp2[0].toUpperCase() == 'TOTB') {
                   Global.CP.totb = arrayTemp2[1];
                }
                
            }
            if(Global.CP.isrec != null && Global.CP.isrec != "" && parseInt(Global.CP.isrec) == 1 ) //is a recovery game
            {
                parseResponseBets(data);
            }
            
            processOddsMaxTimeBet(data);
            
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
var RollAction = {

    //input parameters
    Url: null,

    DoRollAction: function (callback1) {
        if(callingRoll){
            console.log("Call roll over other roll");
            return;
        }
        callingRoll = true;
        
        this.Url = Global.Connector.rootLevel + 'craps/roll.aspx'; 
        var parameters = "gamesession=" + Global.Connector.gameSession;
        parameters += getStringBets();
        parameters += '&rand='+Math.floor((Math.random() * 100000) + 1);
        parameters += '&lastgameid='+ Global.Connector.lastGameId;

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
                DoRollGetData(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Deal Action"); 
            }
        });
    }
}

//get the Deal response data 
function DoRollGetData(data, callback) {

    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }

    ErrorCode = null;
    var array = data.split('&');

    Global.CP.cupo = -1;
    Global.CP.totb = null;
    Global.CP.d1 = null;
    Global.CP.d2 = null;
  
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
        } else if (arrayTemp2[0].toUpperCase() == 'CUPO') {
            Global.CP.cupo = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'TOTB') {
            Global.CP.totb = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'D1') {
            Global.CP.d1 = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'D2') {
            Global.CP.d2 = arrayTemp2[1];
        }

        parseResponseBets(data);
        parseResponseResults(data);


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

function parseResponseBets(data){
    var array = data.split('&');
    ResponseBetsArray = new Array();

    for (var i = 0; i < array.length; i++) {
        var arrayTemp2 = array[i].split('=');

        if(arrayTemp2[0].toLowerCase().indexOf('bet') == 0){
            ResponseBetsArray[arrayTemp2[0].replaceAll('bet','')] = arrayTemp2[1];
        }
        
    }
}
function parseResponseResults(data){
    var array = data.split('&');
    ResponseResultsArray = new Array();

    for (var i = 0; i < array.length; i++) {
        var arrayTemp2 = array[i].split('=');

        if(arrayTemp2[0].toLowerCase().indexOf('res') == 0){
            ResponseResultsArray[arrayTemp2[0].replaceAll('res','')] = arrayTemp2[1];
        }
        
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

function processOddsMaxTimeBet(data){
    OddsMaxTimesBetArray = new Array();

    var array = data.split('&');
    for (var i = 0; i < array.length; i++) {
        var arrayTemp2 = array[i].split('=');

        if (arrayTemp2[0].toUpperCase().indexOf('TOD_') == 0) {
            var tempArr = arrayTemp2[0].split('_');
            OddsMaxTimesBetArray[tempArr[1]] = arrayTemp2[1];
        }
    }
}
