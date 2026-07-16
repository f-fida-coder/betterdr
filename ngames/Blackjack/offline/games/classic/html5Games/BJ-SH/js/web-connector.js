//
var BJKRequest = {

	parameters: null,
	result: null, 
	url: null,
	message: null,
	error: false,

	// send the request
	SendRequest: function(){
		$.ajax({
			type: 'POST',
			headers:{'cache-control': 'no-cache'},
			url: this.url,
			data:this.parameters,
			success: function(data){
				alert("todo ok = " + data);
				return data;
			},
			error: function(xhr, ajaxOptions, thrownError){
				showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
				return null;
			}
		});
		
	}	
}

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
   NoRedirect: '1',
   Token: null,
   Url: Global.Connector.rootLevel + 'Launch/Enter.aspx',

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
            showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
         }
      });
   }
}

//get the EnterGame response data
function DoEnterGameGetData(data) {
    ErrorCode = null;
    //response vars
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
        } else if (arrayTemp2[0].toUpperCase() == 'SHOWCHIPS') {
            showchips = arrayTemp2[1];
        } else if (arrayTemp2[0].toUpperCase() == 'CURRENCY') {
            currency = arrayTemp2[1];
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
        } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
            Global.BJK.comm = arrayTemp2[1];
        }
    }
    if (gamesession != null && ErrorCode == null) {
        afterEnter(gamesession, gamecode, showchips, showcashier, showhistory, showtype);
        return true;
    }
    else {
        showErrorMessage(LanguagesManager.getTranslationByKey(ErrorCode));
        return false;
    }

}

/**********************************
*********  RECOVER LOGIC  *********
**********************************/
var RecoverAction ={	
	Url: 'Blackjack/Recover.aspx',
	GameSession: null,	
	DoRecoverAction: function(){
        console.log("Global.Connector.rootLevel", Global.Connector.rootLevel, this.Url)
		var parameters = 'GameSession='+this.GameSession;
		$.ajax({
			type: 'POST',
			headers:{'cache-control': 'no-cache'},
			cache: false,
			async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
			url:  Global.Connector.rootLevel + this.Url,
			data: parameters,
			success: function(data){
				DoRecoverGetData(data);
				return true;
			},
			error: function(xhr, ajaxOptions, thrownError){
				showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));			
			}
		});
	}
}

//get the Recover response data
function DoRecoverGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }

    ErrorCode = null;
    HandsDataArray = new Array();
    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        for (var i = 0; i < array.length; i++) {
            var arrayTemp2 = array[i].split('=');
            if (arrayTemp2[0].toUpperCase() == 'MAXH') {
                MaxH = arrayTemp2[1];
            }
            else if (arrayTemp2[0].toUpperCase() == 'MAXS') {
                MaxS = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'MINB') {
                Global.Connector.minb = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'MAXB') {
                Global.Connector.maxb = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'BET0' || arrayTemp2[0].toUpperCase() == 'BET1') {
                if(parseFloat(arrayTemp2[1]) != 0){
                    CustomerMainBet = CustomerLastBet =parseFloat(arrayTemp2[1]);
                }
            } else if (arrayTemp2[0].toUpperCase() == 'ISREC') {
                isrec = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC2') {
                dc2 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hnds = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                upds = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'BJP') {
                bjp = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'INSP') {
                insp = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HS17') {
                hs17 = arrayTemp2[1];                
            } else if (arrayTemp2[0].toUpperCase() == 'CHARLIE') {
                charlie = arrayTemp2[1];
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
            } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                Global.BJK.comm = arrayTemp2[1];
            }
            
        }

        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {
            //process balance
            /*if (bal != null) {
                Global.Connector.bal = bal;
            }*/
            if (upds != null && parseInt(upds) > 0) {
                for (var j = 0; j < upds; j++) {
                    UpdateDataArray[j] = GetUpdateDataArray(data, j);
                }
            }
            prepareGameGraphics();

            //get handsData
            if (parseInt(isrec) == 1 && hnds != null && parseInt(hnds) > 0) {
                for (var j = 0; j < hnds; j++) {
                    HandsDataArray[j] = GetHandDataArray(data, j);
                }
                //set hand positions
                //Active Hand Id
                ActiveHandId = getActiveHand();
                if (parseInt(hnds) == 1) {
                    HandPosition[0] = ActiveHandId;
                } else {
                    HandPosition[0] = null;
                    HandPosition[1] = (HandsDataArray[0])[0];
                    HandPosition[2] = (HandsDataArray[1])[0];
                }
                //setTimeout(function(){openRecoveryGame();}, 2000);
                //openRecoveryGame();
                
            }
            else {
                //start new game
                //openNewGame(true);
            }
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
**********  DEAL LOGIC  ***********
**********************************/
var DealAction = {
    Url: 'Blackjack/Deal.aspx',
    GameSession: null,
    amt1: 0,
    amt2: 0,
    amt3: 0,
    side1: 0,
    side2: 0,
    side3: 0,
    DoDealAction: function () {
        var parameters = 'GameSession=' + this.GameSession + '&amt1=' + this.amt1 + '&amt2=' + this.amt2 + '&amt3=' + this.amt3 + '&side1=' + this.side1 + '&side2=' + this.side2 + '&side3=' + this.side3;
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: Global.Connector.rootLevel + this.Url,
            data: parameters,
            success: function (data) {
                DoDealGetData(data);
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
            }
        });
    }
}
function DoDealGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }
    ErrorCode = null;
    cleanData();
    //var handRes = null; //if is bjk the contains res
    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        var arrayTemp2;
        for (var i = 0; i < array.length; i++) {
            arrayTemp2 = array[i].split('=');
            if (arrayTemp2[0].toUpperCase() == 'RESH') {
                resh = arrayTemp2[1];
            }
            else if (arrayTemp2[0].toUpperCase() == 'ISOVR') {
                isovr = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DEX') {
                dex = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DTOT') {
                dtot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC2') {
                dc2 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hnds = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                upds = arrayTemp2[1];
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
                Global.BJK.comm = arrayTemp2[1];
            }
        }
        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {
            //process balance
            if (Global.Connector.bal != null) {
                //$("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                //UpdateVisualBalance(Global.Connector.bal); 
            }
            
            if (upds != null && parseInt(upds) > 0) {
                for (var j = 0; j < upds; j++) {
                    UpdateDataArray[j] = GetUpdateDataArray(data, j);
                }
            }

            //get handsData
            if (hnds != null && parseInt(hnds) > 0) {
                for (var j = 0; j < hnds; j++) {
                    HandsDataArray[j] = GetHandDataArray(data, j);
                }
                if (UpdateDataArray != null && UpdateDataArray.length > 0) {//overwrite hand info
                    overwriteHandInfoUpdateInf();
                }

                //console.log('Draw Cards Deal');
                drawAllCardsDeal(false);
                //Active Hand Id
                ActiveHandId = getActiveHand();
                HandPosition[0] = ActiveHandId;
                //drawHandOptions(ActiveHandId);
                if (isovr != null && isovr.length > 0 && parseInt(isovr) == 1) {
                    if (hnds != null && parseInt(hnds) > 0) {
                        for (var i = 0; i < hnds; i++) {
                            PartialHandDataArray[i] = GetHandDataArray(data, i);
                        }
                    }
                    if (PartialHandDataArray != null && PartialHandDataArray.length > 0) {
                        overwriteHandInfoPartialInf();
                    }
                    HandPosition[0] = (HandsDataArray[0])[0];
                    //openNewGame(false);
                }
            }
            else {
                return;
            }
            IsCallingServer = false;
            //enableDisableButtons(true);
        }
        else {
            //console.log("DEAL ERROR Global.Connector.errorCode, Global.Connector.errd ", Global.Connector.errorCode, Global.Connector.errd);
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            
            IsCallingServer = false;
            //enableDisableButtons(true);
            errorOnDeal();
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}

/**********************************
**********  EARLY LOGIC  **********
**********************************/
var EarlyAction = {
    Url: 'Blackjack/Early.aspx',
    GameSession: null,
    hid1: 0,
    hid2: 0,
    hid3: 0,
    act1: 0,
    act2: 0,
    act3: 0,

    DoEarlyAction: function () {
        var parameters = 'GameSession=' + this.GameSession + '&hid1=' + this.hid1 + '&hid2=' + this.hid2 + '&hid3=' + this.hid3 + '&act1=' + this.act1 + '&act2=' + this.act2 + '&act3=' + this.act3;

        var actSend = this.act1;
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: Global.Connector.rootLevel + this.Url,
            data: parameters,
            success: function (data) {
                DoEarlyGetData(data);
                // IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                //enableDisableButtons(true);
                showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
            }
        });
    }
}

function DoEarlyGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }

    ErrorCode = null;
    pins = null;
    UpdateDataArray = new Array();
    PartialHandDataArray = new Array();
    isovr = null;
    upds = null;
    var hands = null; //hands result
    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        var arrayTemp2;
        for (var i = 0; i < array.length; i++) {
            arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            }
            else if (arrayTemp2[0].toUpperCase() == 'PINS') {
                pins = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'ISOVR') {
                isovr = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DEX') {
                dex = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DTOT') {
                dtot = arrayTemp2[1];
            }else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hands = arrayTemp2[1];
            }else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                upds = arrayTemp2[1];
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
            } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                Global.BJK.comm = arrayTemp2[1];
            }
        }
        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {
            //process balance
            if (Global.Connector.bal != null) {
                //$("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                //UpdateVisualBalance(Global.Connector.bal); 
            }
            //get updateData
            if (upds != null && parseInt(upds) > 0) {
                for (var j = 0; j < upds; j++) {
                    UpdateDataArray[j] = GetUpdateDataArray(data, j);
                }
            }

            if (UpdateDataArray != null && UpdateDataArray.length > 0) {//overwrite hand info
                overwriteHandInfoUpdateInf();
            }
            //console.log('Draw Cards Early');
            
            if (isInsurance) {
                InsuranceResults = new Array();

                for(var j = 0; j < hnds; j++){
                    InsuranceResults[j] = GetInsuranceResultDataArray(data, j); 
                }

                drawInsurance(pins);

            } else{
                drawAllCards(false);
            }
            if (isGameFinished()) {
                if (hands != null && parseInt(hands) > 0) {
                    for (var i = 0; i < hands; i++) {
                        PartialHandDataArray[i] = GetHandDataArray(data, i);
                    }
                }
                if (PartialHandDataArray != null && PartialHandDataArray.length > 0) {
                    overwriteHandInfoPartialInf();
                }
                //openNewGame(false);
            } else {
                //Get Next HAND Active Hand Id
                ActiveHandId = getActiveHand();
                //drawHandOptions(ActiveHandId);
            }

            IsCallingServer = false;
            if(!isInsurance){
                //enableDisableButtons(true);
            }
        } else {
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            IsCallingServer = false;
           // enableDisableButtons(true);
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}
/************************************
********** HitDoubleAction **********
*************************************/
var HitDoubleAction = {
    Url: 'Blackjack/HitDouble.aspx',
    GameSession: null,
    hid: null,
    act: null,
    ncc: null,

    DoHitDoubleAction: function () {
        var parameters = 'GameSession=' + this.GameSession + '&hid=' + this.hid + '&act=' + this.act + '&ncc=' + this.ncc;
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: Global.Connector.rootLevel + this.Url,
            data: parameters,
            success: function (data) {
                DoHitDoubleGetData(data);
                // IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                //enableDisableButtons(true);
                showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
            }
        });
    }
}

function DoHitDoubleGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }
    
    ErrorCode = null;
    UpdateDataArray = new Array();
    PartialHandDataArray = new Array();
    var cn = null; //extra card
    var handTot = null; //hand total
    var handOPS = null; //hand operations
    var hands = null; //hands result
    upds = null;
    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        var arrayTemp2;
        for (var i = 0; i < array.length; i++) {
            arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'ISOVR') {
                isovr = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DEX') {
                dex = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DTOT') {
                dtot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'CN') {
                cn = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'TOT') {
                handTot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'OPS') {
                handOPS = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hands = arrayTemp2[1];
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
            } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                Global.BJK.comm = arrayTemp2[1];
            }else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                upds = arrayTemp2[1];
            }
        }

        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {
            
            if (upds != null && parseInt(upds) > 0) {
                for (var j = 0; j < upds; j++) {
                    UpdateDataArray[j] = GetUpdateDataArray(data, j);
                }
            }

            if (UpdateDataArray != null && UpdateDataArray.length > 0) {//overwrite hand info
                overwriteHandInfoUpdateInf();
            }
            if (cn != null && cn.length > 0) {
                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        if (tempArray[10] == null || tempArray[10].length == 0) {
                            tempArray[10] = cn;
                        } else {
                            var tempContent = tempArray[10] + "," + cn;
                            tempArray[10] = tempContent;
                        }
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            if (handTot != null && handTot.length > 0) {
                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        tempArray[3] = handTot;
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            if (handOPS != null && handOPS.length > 0) {
                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        tempArray[4] = handOPS;
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            if (isDouble) {
                if (Global.Connector.bal != null) {
                   // $("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                    //UpdateVisualBalance(Global.Connector.bal); 
                }

                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        tempArray[5] = (tempArray[5] * 2);
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            //console.log('Draw Cards Hit Double');
            drawAllCards(false);

            if (isGameFinished()) {
                if (hands != null && parseInt(hands) > 0) {
                    for (var i = 0; i < hands; i++) {
                        PartialHandDataArray[i] = GetHandDataArray(data, i);
                    }
                }
                if (PartialHandDataArray != null && PartialHandDataArray.length > 0) {
                    overwriteHandInfoPartialInf();
                }
                //openNewGame(false);
            } 
            else {
                ActiveHandId = getActiveHand();
                //drawHandOptions(ActiveHandId);
            }
            IsCallingServer = false;
            //enableDisableButtons(true);
        } 
        else {
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            IsCallingServer = false;
            //enableDisableButtons(true);
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}

/************************************
********** SurrStandAction **********
*************************************/
var SurrStandAction = {
    Url: 'Blackjack/SurrStand.aspx',
    GameSession: null,
    hid: null,
    act: null,
    ncc: null,

    DoSurrStandAction: function () {
        var parameters = 'GameSession=' + this.GameSession + '&hid=' + this.hid + '&act=' + this.act + '&ncc=' + this.ncc;
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: Global.Connector.rootLevel + this.Url,
            data: parameters,
            success: function (data) {
                DoSurrStandActionGetData(data);
                // IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                //enableDisableButtons(true);
                showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
            }
        });
    }
}

function DoSurrStandActionGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }
    ErrorCode = null;
    UpdateDataArray = new Array();
    PartialHandDataArray = new Array();
    var cn = null; //extra card
    var handTot = null; //hand total
    var handOPS = null; //hand operations
    var hands = null;
    upds = null;
    if (data != undefined && data.length > 0) {
        var array = data.split('&');
        var arrayTemp2;
        for (var i = 0; i < array.length; i++) {
            arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'ISOVR') {
                isovr = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DEX') {
                dex = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DTOT') {
                dtot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'CN') {
                cn = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'TOT') {
                handTot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'OPS') {
                handOPS = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hands = arrayTemp2[1];
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
            } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                Global.BJK.comm = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                upds = arrayTemp2[1];
            }
        }

        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {
            //process balance
            var handUpdated = false;
            if (Global.Connector.bal != null) {
                //$("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                //UpdateVisualBalance(Global.Connector.bal); 
            }
            
            if (upds != null && parseInt(upds) > 0) {
                for (var j = 0; j < upds; j++) {
                    UpdateDataArray[j] = GetUpdateDataArray(data, j);
                }
            }

            if (UpdateDataArray != null && UpdateDataArray.length > 0) {//overwrite hand info
                overwriteHandInfoUpdateInf();
                handUpdated = true;
            }
            if (cn != null && cn.length > 0) {
                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        if (tempArray[10] == null || tempArray[10].length == 0) {
                            tempArray[10] = cn;
                        } else {
                            var tempContent = tempArray[10] + "," + cn;
                            tempArray[10] = tempContent;
                        }
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            if (handTot != null && handTot.length > 0) {
                for (var i = 0; i < HandsDataArray.length; i++) {
                    var tempArray = HandsDataArray[i];
                    if (tempArray != null && tempArray[0] == ActiveHandId) {
                        tempArray[3] = handTot;
                        HandsDataArray[i] = tempArray;
                        break;
                    }
                }
            }
            //put options in 0
            for (var i = 0; i < HandsDataArray.length; i++) {
                var tempArray = HandsDataArray[i];
                if (tempArray != null && tempArray[0] == ActiveHandId) {
                    tempArray[4] = 0;
                    HandsDataArray[i] = tempArray;
                    break;
                }
            }
            ActiveHandId = getActiveHand();

            if(!handUpdated)
                drawAllCardsStand(false, handUpdated);
            else
                drawAllCards(false);
            if (isGameFinished()) {
                if (hands != null && parseInt(hands) > 0) {
                    for (var i = 0; i < hands; i++) {
                        PartialHandDataArray[i] = GetHandDataArray(data, i);
                    }
                }
                if (PartialHandDataArray != null && PartialHandDataArray.length > 0) {
                    overwriteHandInfoPartialInf();
                }
                //openNewGame(false);
            } else {
                //ActiveHandId = getActiveHand();
                //drawHandOptions(ActiveHandId);
            }
            IsCallingServer = false;
            //enableDisableButtons(true);
        } 
        else {
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            IsCallingServer = false;
            //enableDisableButtons(true);
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}

/************************************
********** SplitAction **********
*************************************/
var SplitAction = {
    Url: 'Blackjack/Split.aspx',
    GameSession: null,
    hid: null,

    DoSplitAction: function () {
        var parameters = 'GameSession=' + this.GameSession + '&hid=' + this.hid;
        $.ajax({
            type: 'POST',
            headers: { 'cache-control': 'no-cache' },
            cache: false,
            async: true, //creo que es mejor quitarlo si hay animaciones es mejor usar async
            url: Global.Connector.rootLevel + this.Url,
            data: parameters,
            success: function (data) {
                DoSplitGetData(data);
                // IsCallingServer = false;
                return true;
            },
            error: function (xhr, ajaxOptions, thrownError) {
                IsCallingServer = false;
                //enableDisableButtons(true);
                showErrorMessage(LanguagesManager.getTranslationByKey('ERR_POORCONN'));
            }
        });
    }
}

function DoSplitGetData(data) {
    if(typeof(HeartbeatManager) != "undefined"){
        HeartbeatManager.setLastServerCall();
    }
    ErrorCode = null;
    UpdateDataArray = new Array();
    PartialHandDataArray = new Array();
    var hands = null;
    var updsHand = null;
    nhid = null;
    if (data != undefined && data.length > 0) {
        ////console.log('Split: '+data);
        var array = data.split('&');
        var arrayTemp2;
        for (var i = 0; i < array.length; i++) {
            arrayTemp2 = array[i].split('=');

            if (arrayTemp2[0].toUpperCase() == 'BAL') {
                Global.Connector.bal = parseFloat(arrayTemp2[1]);
            } else if (arrayTemp2[0].toUpperCase() == 'NHID') {
                nhid = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'ISOVR') {
                isovr = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DC1') {
                dc1 = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DEX') {
                dex = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'DTOT') {
                dtot = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'HNDS') {
                hands = arrayTemp2[1];
            } else if (arrayTemp2[0].toUpperCase() == 'UPDS') {
                updsHand = arrayTemp2[1];
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
            } else if (arrayTemp2[0].toUpperCase() == 'COMM'){
                Global.BJK.comm = arrayTemp2[1];
            }
        }
        if ((Global.Connector.iserr == "0" || Global.Connector.iserr == 0) && (Global.Connector.errorCode == null || Global.Connector.errorCode == 0) && Global.Connector.errd == null) {

            //process balance
            if (Global.Connector.bal != null) {
               // $("#credits-amount span").html(formatWithPrecision(Global.Connector.bal));
                //UpdateVisualBalance(Global.Connector.bal); 
            }
            var splitHandId = splitOriginalHandId;
            var originalTotal =  null;
            

            if(nhid != null && nhid != ""){
                var newIndex = HandsDataArray.length;
                HandsDataArray[newIndex] = new Array(13);
                (HandsDataArray[newIndex])[0] = nhid;
                (HandsDataArray[newIndex])[1] = splitOriginalC2;
                (HandsDataArray[newIndex])[2] = "-1";
                (HandsDataArray[newIndex])[3] = (splitOriginalTotal / 2);

                var pon = parseInt(getPONHand(splitHandId));
                var pod = getPODHand(splitHandId);

                var pon2 = (pon * 2);
                var pod2 = 2;

                var bet  = getBetHand(splitHandId);
                setPODHand(splitHandId,pod2);
                setPONHand(splitHandId,pon2);
                
                (HandsDataArray[newIndex])[5] = bet;
                (HandsDataArray[newIndex])[9] = pod2;
                (HandsDataArray[newIndex])[7] = pon2 + 1;

                var oldAtm = getAtmPonPod(pon, pod);
                cleanCenterCardsInfo(oldAtm, 'center');

                var firstAtm = getAtmPonPod(pon2, pod2);
                var secondAtm = getAtmPonPod((pon2 + 1), pod2);

                var cleanChipsPos = null;
                if(oldAtm == ""){
                    cleanChipsPos = 2;
                }else if(oldAtm == "-atm1"){
                    cleanChipsPos = 1;
                }else if(oldAtm == "-atm3"){
                    cleanChipsPos = 3;
                }

                cleanBetChips(cleanChipsPos);

                setTimeout(function(){
                    setVisualBetChips(bet,0, firstAtm);
                    setVisualBetChips(bet,0, secondAtm);
                }, (fastPlay?10:500));
                
            }

            if (updsHand != null && parseInt(updsHand) > 0) {
                for (var i = 0; i < updsHand; i++) {
                    UpdateDataArray[i] = GetUpdateDataArray(data, i);
                    //splitHandId = (UpdateDataArray[i])[0];
                }
                if (UpdateDataArray != null && UpdateDataArray.length > 0) {//overwrite hand info
                    //originalTotal = getBetTotal(splitHandId);
                    overwriteHandInfoUpdateInf();

                }
            }

            ActiveHandId = getActiveHand();
          
            drawAllCardsSplit(false, parseInt(splitHandId), parseInt(nhid));
            if (isGameFinished()) {
                if (hands != null && parseInt(hands) > 0) {
                    for (var i = 0; i < hands; i++) {
                        PartialHandDataArray[i] = GetHandDataArray(data, i);
                    }
                }
                if (PartialHandDataArray != null && PartialHandDataArray.length > 0) {
                    overwriteHandInfoPartialInf();
                }
                //openNewGame(false);
            } 
            IsCallingServer = false;
            //enableDisableButtons(true);
        } 
        else {
            if(Global.Connector.errorCode != null)
                showErrorMessage(LanguagesManager.getTranslationByKey(Global.Connector.errorCode));
            else
                showErrorMessage(decodeURIComponent(Global.Connector.errd));
            IsCallingServer = false;
            //enableDisableButtons(true);
            return false;
        }
        return true;
    }
    else {
        return false;
    }
}

/******************************/
/******* COMMON FUNCTIONS *****/
/******************************/

/*
* name:     GetInsuranceResultDataArray
* input:    data= querystring
*           index= hand id
* return:   handInsurArray(17)
*/  
function GetInsuranceResultDataArray(data, index)
{
    /*
    Hand Array format
    &hid0=3020
    &res0=-1.00
    &hid1=3021
    &res1=-1.00
    &hid2=3022
    &res2=-1.00

    */  
    
    var handInsurArray = new Array(2);
    for(var i=0; i < handInsurArray.length; i++){
        handInsurArray[i] = null;
    }
        
    var array = data.split('&');
        
    for (var i=0; i < array.length; i++){
        var arrayTemp2 = array[i].split('=');
        
        if(arrayTemp2[0].toUpperCase() == ('HID') + index)
        {
            handInsurArray[0] = arrayTemp2[1];   
        }
        else if(arrayTemp2[0].toUpperCase() == ('RES') + index)
        {
            handInsurArray[1] = arrayTemp2[1];
        }
        
    }       
    return handInsurArray;
}



/*
* name: 	GetHandDataArray
* input: 	data= querystring
*			hid= hand id
* return:	handInfoArray(17)
*/	
function GetHandDataArray(data, hid)
{
	/*
	Hand Array format
	0 hid#
	1 c1#
	2 c2# 
	3 tot# 
	4 ops# 
	5 bet# 
	6 res# 
	7 pon# 
	8 sres# 
	9 pod# 
	10 ex#
	11 ins#
	12 his#
	*/	
	
	var handArray = new Array(13);
	for(var i=0; i < handArray.length; i++){
		handArray[i] = null;
	}
		
	var array = data.split('&');
		
	for (var i=0; i < array.length; i++){
		var arrayTemp2 = array[i].split('=');
		
		if(arrayTemp2[0].toUpperCase() == ('HID') + hid)
		{
			handArray[0] = arrayTemp2[1];	
		}
		else if(arrayTemp2[0].toUpperCase() == ('C1') + hid)
		{
			handArray[1] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('C2') + hid)
		{
			handArray[2] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('TOT') + hid)
		{
			handArray[3] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('OPS') + hid)
		{
			handArray[4] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('BET') + hid)
		{
			handArray[5] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('RES') + hid)
		{
			handArray[6] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('PON') + hid)
		{
			handArray[7] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('SRES') + hid)
		{
			handArray[8] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('POD') + hid)
		{
			handArray[9] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('EX') + hid)
		{
			handArray[10] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('INS') + hid)
		{
			handArray[11] = arrayTemp2[1];
		}
		else if(arrayTemp2[0].toUpperCase() == ('HIS') + hid)
		{
			handArray[12] = arrayTemp2[1];
		}
	}		
	return handArray;
}


/*
* name: 	GetUpdateDataArray
* input: 	data= querystring
*			index= number of hand 
* return:	handInfoArray(4)
*/	
function GetUpdateDataArray(data, index)
{
	/*
	Hand Array format
	0 uhid#
	1 uc2#
	2 utot# 
	3 uops#
	*/	
	try{
		var handArray = new Array(4);
		for(var i=0; i < handArray.length; i++){
			handArray[i] = null;
		}
			
		var array = data.split('&');
			
		for (var i=0; i < array.length; i++){
			var arrayTemp2 = array[i].split('=');
			
			if(arrayTemp2[0].toUpperCase() == ('UHID') + index)
			{
				handArray[0] = arrayTemp2[1];
			}
			else if(arrayTemp2[0].toUpperCase() == ('UC2') + index)
			{
				handArray[1] = arrayTemp2[1];
			}
			else if(arrayTemp2[0].toUpperCase() == ('UTOT') + index)
			{
				handArray[2] = arrayTemp2[1];
			}
			else if(arrayTemp2[0].toUpperCase() == ('UOPS') + index)
			{
				handArray[3] = arrayTemp2[1];
			}
		}		
		return handArray;
	}
    catch ( err ) {
        txt = "There was an error on this function GetUpdateDataArray.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert( txt );
    }
}

