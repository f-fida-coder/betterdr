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
*********  Start Action  *********
**********************************/
var StartAction = {
    Url: null,
    GameSession: null,
    doStartAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + '&rand=' + Math.floor((Math.random() * 10000) + 1);
        this.Url = Global.Connector.rootLevel + 'ThreeCardPoker/Start.aspx';
        //console.log("acac Global.Connector.rootLevel", Global.Connector.rootLevel , this.Url);

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
                DoStart(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Start Action"); 
            }
        });
        /*var data = 'road=&blocknote=Su balance disponilbe es de 5&iserr=0&availablebalance=&comm=5.00&messageids=38837&sid=1&tcounter=&bal=120000&jackpot=&tcountertype=&maxb=200.00&minb=1.00&stats=0,0,0,0,0,0,0&lastgameid=4213&tiep=8.0000';
        DoStart(data, callback1);*/
    }
}

//Start response data 
function DoStart(data, callback) {
    /*try {*/
        if(typeof(HeartbeatManager) != "undefined"){
            HeartbeatManager.setLastServerCall();
        }
        ErrorCode = null;

        Global.PK3C.PC1 = null;
        Global.PK3C.PC2 = null;
        Global.PK3C.PC3 = null;
        Global.PK3C.PH = null;
        Global.PK3C.PlayerCards = new Array();
        Global.PK3C.anteAmt = null;
        Global.PK3C.pairplusAmt = null;

        if (data != undefined && data.length > 0) {
            var array = data.split('&');

            /*
                BLOCKNOTE=&ISERR=0&MAXBET=50.00&GAMEID=0&PRIZES=ST%201.00%0A3K%204.00%0ASF%205.00%0A2K%2B1.00%0AFL%2B4.00%0AST%2B6.00%0A3K%2B25.00%0ASF%2B40.00&MESSAGEIDS=&AVAILABLEBALANCE=&TCOUNTER=&JACKPOT=&SESSIONID=1&TCOUNTERTYPE=&MINBET=1.00&LASTGAMEID=17&BALANCE=110160.45
            */
            for (var i = 0; i < array.length; i++) {
                var arrayTemp2 = array[i].split('=');
                
                if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
                    Global.Connector.bal = parseFloat(arrayTemp2[1]);
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
                } else if (arrayTemp2[0].toUpperCase() == 'GAMEID'){
                    Global.PK3C.gameId = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'PRIZES'){
                    Global.PK3C.prizes = decodeURIComponent(arrayTemp2[1]);
                }
                else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                    Global.Connector.jackpot = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'SESSIONID'){
                    Global.PK3C.sessionId = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'TCOUNTERTYPE'){
                    Global.Connector.tCounterType = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'PC1') {
                    Global.PK3C.PC1 = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PC2') {
                    Global.PK3C.PC2 = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'PC3') {
                    Global.PK3C.PC3 = arrayTemp2[1];
                }else if (arrayTemp2[0].toUpperCase() == 'PH') {
                    Global.PK3C.PH = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'ANTEAMT') {
                    Global.PK3C.anteAmt = parseFloat(arrayTemp2[1]);
                }
                else if (arrayTemp2[0].toUpperCase() == 'PAIRPLUSAMT') {
                    Global.PK3C.pairplusAmt = parseFloat(arrayTemp2[1]);
                }

                //
            }

            if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
               // UpdateBalanceWrapper(Global.Connector.bal);
                if(Global.PK3C.PC1 != null && Global.PK3C.PC2 != null && Global.PK3C.PC3 != null && Global.PK3C.PH != null){
                    Global.PK3C.PlayerCards[0] = Global.PK3C.PC1;
                    Global.PK3C.PlayerCards[1] = Global.PK3C.PC2;
                    Global.PK3C.PlayerCards[2] = Global.PK3C.PC3;
                }                

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
        txt = "There was an error on this function DoStart.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }*/
}



/**********************************
*********  PrizeList Action  *********
**********************************/
var PrizeListAction = {
    Url: null,
    GameSession: null,
    doPrizeListAction: function (callback1) {
        var parameters = 'GameSession=' + Global.Connector.gameSession + '&rand=' + Math.floor((Math.random() * 10000) + 1);
        this.Url = Global.Connector.rootLevel + 'ThreeCardPoker/PrizeList.aspx';
        //console.log("acac Global.Connector.rootLevel", Global.Connector.rootLevel , this.Url);

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
            type: 'GET',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true,
            url: this.Url,
            data: parameters,
            callback: callback1, 
            success: function (data) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                DoPrizeList(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in PrizeList Action"); 
            }
        });
        /*var data = ''
        DoPrizeList(data, callback1);*/
    }
}

//Start response data 
function DoPrizeList(data, callback) {
    /*try {*/
        if(typeof(HeartbeatManager) != "undefined"){
            HeartbeatManager.setLastServerCall();
        }
        ErrorCode = null;
        if (data != undefined && data.length > 0) {
            var array = data.split('&');

            /*
                =ST%201.00%0A3K%204.00%0ASF%205.00%0A2K%2B1.00%0AFL%2B4.00%0AST%2B6.00%0A3K%2B25.00%0ASF%2B40.00&iserr=0
            */
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
                } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                    Global.ChipTransfer.tcounter = arrayTemp2[1];
                } 
                else if (arrayTemp2[0].toUpperCase() == 'PRIZES'){
                    Global.PK3C.prizes = decodeURIComponent(arrayTemp2[1]);
                }
                else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                    Global.Connector.jackpot = arrayTemp2[1];
                }
                else if (arrayTemp2[0].toUpperCase() == 'TCOUNTERTYPE'){
                    Global.Connector.tCounterType = arrayTemp2[1];
                }

                //
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
        txt = "There was an error on this function DoPrizeList.\n\n";
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
    anteAmt: null,
    pairplusAmt: null,
    Url: null,

    DoDealAction: function (callback1) {
        this.Url = Global.Connector.rootLevel + 'ThreeCardPoker/Deal.aspx'; 
        var parameters = "gamesession=" + Global.Connector.gameSession;       
        parameters += "&pairplusAmt=" + this.pairplusAmt;
        parameters += "&anteAmt=" + this.anteAmt;
        parameters += "&sessionId=" + Global.PK3C.sessionId;
        if(Global.Connector.lastGameId != null)
            parameters += "&lastGameId=" + Global.Connector.lastGameId;
        else
           parameters += "&lastGameId=";     
        
        parameters += '&rand=' + Math.floor((Math.random() * 10000) + 1); 

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

        /*var data = '';
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

/*
PC3=18&PC1=21&BLOCKNOTE=&ISERR=0&AVAILABLEBALANCE=&GAMEID=19&MESSAGEIDS=&BALANCE=110159.45&ERRD=&TCOUNTER=&JACKPOT=&PH=2K&LASTGAMEID=19&PC2=5
*/    
    Global.PK3C.PC1 = null;
    Global.PK3C.PC2 = null;
    Global.PK3C.PC3 = null;
    Global.PK3C.PH = null;
    Global.PK3C.PlayerCards = new Array();

    Global.PK3C.DC1 = null;
    Global.PK3C.DC2 = null;
    Global.PK3C.DC3 = null;
    Global.PK3C.DH = null;
    Global.PK3C.ANTERES = null;
    Global.PK3C.BONUSRES = null;
    Global.PK3C.PPRES = null;
    Global.PK3C.RESULTAMT = null;
    Global.PK3C.DealerCards = new Array();


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
            Global.PK3C.PC1 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PC2') {
            Global.PK3C.PC2 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'PC3') {
            Global.PK3C.PC3 = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'PH') {
            Global.PK3C.PH = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
            Global.Connector.bal = parseFloat(arrayTemp2[1]);
        }else if (arrayTemp2[0].toUpperCase() == 'GAMEID'){
            Global.PK3C.gameId = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
            Global.Connector.jackpot = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
            Global.PK3C.DC1 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'DC2') {
            Global.PK3C.DC2 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'DC3') {
            Global.PK3C.DC3 = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'DH') {
            Global.PK3C.DH = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'ANTERES'){
            Global.PK3C.ANTERES = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'BONUSRES'){
            Global.PK3C.BONUSRES = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'RESULTAMT'){
            Global.PK3C.RESULTAMT = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'PPRES'){
            Global.PK3C.PPRES = arrayTemp2[1];
        }
    }
    //ErrorCode = 'ERR_AUTH_FAILED'; 
    // alert('Error: '+ErrorCode);
    if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
        /*UpdateBalanceWrapper(Global.Connector.bal);
        CurrentPlayerCardDrawed = CurrentBankerCardDrawed = 0;
        drawGame();*/
        Global.PK3C.PlayerCards[0] = Global.PK3C.PC1;
        Global.PK3C.PlayerCards[1] = Global.PK3C.PC2;
        Global.PK3C.PlayerCards[2] = Global.PK3C.PC3;
        if(Global.PK3C.DC1 != null && Global.PK3C.DC2 != null && Global.PK3C.DC3 != null && Global.PK3C.DH != null){
            Global.PK3C.DealerCards[0] = Global.PK3C.DC1;
            Global.PK3C.DealerCards[1] = Global.PK3C.DC2;
            Global.PK3C.DealerCards[2] = Global.PK3C.DC3;
        }

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


/**********************************
********  CALL LOGIC  ********
**********************************/
var CallAction = {

    //input parameters
    Call: null,  
    Url: null,

    DoCallAction: function (callback1) {
        this.Url = Global.Connector.rootLevel + 'ThreeCardPoker/Call.aspx'; 
        var parameters = "gamesession=" + Global.Connector.gameSession;       
        parameters += "&Call=" + this.Call;
        parameters += "&GameId=" + Global.PK3C.gameId;
        parameters += "&sessionId=" + Global.PK3C.sessionId;
        if(Global.Connector.lastGameId != null)
            parameters += "&lastGameId=" + Global.Connector.lastGameId;
        else
           parameters += "&lastGameId=";  
        parameters += '&rand=' + Math.floor((Math.random() * 10000) + 1); 
        

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
                DoCallGetData(data, this.callback);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                receivedServerResponse = true;
                checkResponseTimer = clearTimeout(checkResponseTimer);
                alert("ERROR in Call Action"); 
            }
        });

        /*var data = '';
        DoCallGetData(data,callback1);*/
    }
}

//get the Deal response data 
function DoCallGetData(data, callback) {

    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }

    ErrorCode = null;
    var array = data.split('&');

 
    Global.PK3C.DC1 = null;
    Global.PK3C.DC2 = null;
    Global.PK3C.DC3 = null;
    Global.PK3C.DH = null;
    Global.PK3C.ANTERES = null;
    Global.PK3C.BONUSRES = null;
    Global.PK3C.PPRES = null;
    Global.PK3C.RESULTAMT = null;
    Global.PK3C.DealerCards = new Array();

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
        } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
            Global.PK3C.DC1 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'DC2') {
            Global.PK3C.DC2 = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'DC3') {
            Global.PK3C.DC3 = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'DH') {
            Global.PK3C.DH = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
            Global.Connector.bal = parseFloat(arrayTemp2[1]);
        }else if (arrayTemp2[0].toUpperCase() == 'GAMEID'){
            Global.PK3C.gameId = arrayTemp2[1];
        }else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
            Global.Connector.jackpot = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'ANTERES'){
            Global.PK3C.ANTERES = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'BONUSRES'){
            Global.PK3C.BONUSRES = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'RESULTAMT'){
            Global.PK3C.RESULTAMT = arrayTemp2[1];
        }
        else if (arrayTemp2[0].toUpperCase() == 'PPRES'){
            Global.PK3C.PPRES = arrayTemp2[1];
        }
    }
    //ErrorCode = 'ERR_AUTH_FAILED'; 
    // alert('Error: '+ErrorCode);
    if (Global.Connector.iserr == null || Global.Connector.iserr == '' || Global.Connector.iserr == '0') {
        /*UpdateBalanceWrapper(Global.Connector.bal);
        CurrentPlayerCardDrawed = CurrentBankerCardDrawed = 0;
        drawGame();*/
        Global.PK3C.DealerCards[0] = Global.PK3C.DC1;
        Global.PK3C.DealerCards[1] = Global.PK3C.DC2;
        Global.PK3C.DealerCards[2] = Global.PK3C.DC3;
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