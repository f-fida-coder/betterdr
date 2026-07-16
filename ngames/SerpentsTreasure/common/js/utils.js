/**
 * Utils Module.
 *  Some Games Utils Functions
 *  @module  Utils
 */

var diff = 0;

/**
 * @description If the Game is an App
 */
var isApp = typeof isCordovaApp != "undefined" ? isCordovaApp : (typeof Global != "undefined" && Global.Game != undefined && Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : false;

/**
 * @description If the browser is a mobile device
 */
var isMobile = {
    Android: function () {
        return navigator.userAgent.match(/Android/i);
    },
    BlackBerry: function () {
        return navigator.userAgent.match(/BlackBerry/i);
    },
    iOS: function () {
        return navigator.userAgent.match(/iPhone|iPad|iPod/i);
    },
    Opera: function () {
        return navigator.userAgent.match(/Opera Mini/i);
    },
    Windows: function () {
        return navigator.userAgent.match(/IEMobile/i);
    },
    any: function () {
        return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
    }
};

var clickEvent = isMobile.any()? 'touchstart' : 'click';

//browsers
var ie = /msie/.test(navigator.userAgent.toLowerCase());
var IE6 = /msie 6/i.test(navigator.userAgent);
var IE7 = /msie 7/i.test(navigator.userAgent);
var IE8 = /msie 8/i.test(navigator.userAgent);
var IE9 = /msie 9/i.test(navigator.userAgent);
var IE10 = /msie 9/i.test(navigator.userAgent);
var SAFARI = /safari/i.test(navigator.userAgent);
var FIREFOX = /firefox/i.test(navigator.userAgent);
var CHROME = /chrome/i.test(navigator.userAgent);
var IPHONE = /iphone/i.test(navigator.userAgent);
var NEW_IE = window.navigator.userAgent.indexOf('Trident/');

//ios version
var iOS7 = isMobile.iOS() && parseInt(navigator.appVersion.match(/OS (\d)/)[1], 10) >= 7;


/**
* @description Get If the browser is Android Firefox
* @function isAndroidFirefox
* @returns {bool} boolean result
*/
function isAndroidFirefox(){
    var result = isMobile.Android() && FIREFOX;
    return result;
}

/**
* @description Get the android version
* @function getAndroidVersion
* @param {string} ua the navigator user agent, it's optional, is
* @returns {string} for android version number
*/
function getAndroidVersion(ua) {
    var ua = ua || navigator.userAgent;
    var match = ua.match(/Android\s([0-9\.]*)/);
    return match ? match[1] : false;
}

function IsPortrait(){
    return window.innerHeight > window.innerWidth? true : false;
}

function CloseWrapperGame(){
    try{
        if(window.parent != null){
            if(window.parent.CloseGame != null && window.parent.CloseGame != undefined){
                window.parent.CloseGame();
                return true;
            }
        }
    }
    catch(err){}
    return false;
}

function detectLoadingType(removeFile, addFile){
    var jsLink = "";
    if(GameLoading == 2){
        $("script[src='"+removeFile+"']").remove();
        jsLink = $("<script src='"+addFile+"'></script>");
        $("head").append(jsLink);
    }
}

function storeCurrencyData() {
    //console.log("currency " + currency + " typeof " + typeof(currency) + " currency object " + currencyObj);
    if(Global.Connector.currency != null) { //Ex. currency=USD,$,¢,p,5,2
        currency = decodeURIComponent(Global.Connector.currency);
        var currencyArray = currency.split(",");
        currencyObj.letterCode = currencyArray[0];
        currencyObj.prefix = currencyArray[1];
        currencyObj.suffix = currencyArray[2];
        currencyObj.decimalSeparator = (currencyArray[3] == "c") ? "c" : "p"; // 'c' use comma, 'p' use point
        currencyObj.thousandSeparator = parseInt(currencyArray[4]);
        currencyObj.precision = parseInt(currencyArray[5]);
    }
}

function storeCurrencyDataExternal(currencyData) {
    //console.log("currency " + currency + " typeof " + typeof(currency) + " currency object " + currencyObj);
    if(currencyData != null) { //Ex. currency=USD,$,¢,p,5,2
        currencyData = decodeURIComponent(currencyData);
        var currencyArray = currencyData.split(",");
        currencyObj.letterCode = currencyArray[0];
        currencyObj.prefix = currencyArray[1];
        currencyObj.suffix = currencyArray[2];
        currencyObj.decimalSeparator = (currencyArray[3] == "c") ? "c" : "p"; // 'c' use comma, 'p' use point
        currencyObj.thousandSeparator = parseInt(currencyArray[4]);
        currencyObj.precision = parseInt(currencyArray[5]);
    }
}

// @amount is a decimal or integer number
function formatWithPrecision(amount) {
    var formattedString = "";
    amount = parseFloat(amount);
    if(currencyObj.precision >= 0) {
        amount = amount.toFixed(currencyObj.precision);
    } else {
        switch (currencyObj.precision){
            case -1:
                amount = amount * 10;
                break;
            case -2:
                amount = amount * 100;
                break;
            case -3:
                amount = amount * 1000;
                break;
            case -4:
                amount = amount * 10000;
                break;
        }
    }
    formattedString = "" + amount;
    if(currencyObj.decimalSeparator == "c") {
        formattedString = formattedString.replace(".", ",");
    } else {
         formattedString = formattedString.replace(",", ".");
    }
    return formattedString;
}

function formatWithThousandsPrecision(amount) {
    var formattedString = 0;
    amount = parseFloat(amount);
    if(currencyObj.precision >= 0) {
        // amount = amount.toFixed(currencyObj.precision);
    } else {
        switch (currencyObj.precision){
            case -1:
                amount = amount * 10;
                break;
            case -2:
                amount = amount * 100;
                break;
            case -3:
                amount = amount * 1000;
                break;
            case -4:
                amount = amount * 10000;
                break;
        }
    }
    formattedString = amount;
    var separators = currencyObj.decimalSeparator == "c"? [".",","] : [",","."];
    if((parseInt(amount) + "").length >= currencyObj.thousandSeparator){
        formattedString = accounting.formatNumber(formattedString, currencyObj.precision, separators[0],separators[1]);
    } else{
        formattedString = parseFloat(formattedString.toString().replace(separators[0],separators[1])).toFixed(currencyObj.precision);
    }

    /*if(currencyObj.decimalSeparator == "c") { //Decimal Separator = c = use format 1.000,00
        if((parseInt(amount) + "").length >= currencyObj.thousandSeparator){
            formattedString = accounting.formatNumber(formattedString, currencyObj.precision, ".",",");
        } else{
            formattedString = parseFloat(formattedString.toString().replace(".", ",")).toFixed(currencyObj.precision);
        }
    } else {//Decimal Separator != c = use format 1,000.00
        if((parseInt(amount) + "").length >= currencyObj.thousandSeparator){
            formattedString = accounting.formatNumber(formattedString, currencyObj.precision, ",",".");
        } else {
            formattedString = parseFloat(formattedString.toString().replace(",", ".")).toFixed(currencyObj.precision);
        }
    }*/
    return formattedString;
}

// @amount is a decimal or integer number
function formatWithPrecisionAndSymbol(amount) {
    var formattedString = "";
    if(ShowCurrencySymbol){
        formattedString = currencyObj.prefix + formatWithPrecision(amount);
    }
    else{
        formattedString = formatWithPrecision(amount);
    }
    return formattedString;
}

function formatWithThousandsPrecisionAndSymbol(amount) {
    var formattedString = "";
    if(ShowCurrencySymbol){
        formattedString = currencyObj.prefix + formatWithThousandsPrecision(amount);
    }
    else{
        formattedString = formatWithThousandsPrecision(amount);
    }
    return formattedString;
}

function formatWithNoDecimalZeros(amount){
    //console.log("monto a remover zeros: " + amount);
    var formattedAmount = amount;
    var formattedString = "";
    if (amount % 1 == 0){
        formattedAmount = parseInt(amount);
    } else {
        formattedAmount = formatWithPrecision(amount);
    }
    if(ShowCurrencySymbol){
        formattedString = currencyObj.prefix + formattedAmount;
    }
    //console.log("retorna como string ", formattedString);
    return(formattedString);
}

function formatWithNoDecimalZerosNumber(amount){
    //console.log("monto a remover zeros: " + amount);
    var formattedAmount = amount;
    var formattedString = "";
    if (amount % 1 == 0){
        formattedAmount = parseInt(amount);
    } else {
        formattedAmount = formatWithPrecision(amount);
    }
   
    var str = formattedAmount + "";
    if(currencyObj.decimalSeparator == "c") {

        str = str.replace(',00', '');
    } else {
        str = str.replace('.00', '');
    }

    formattedString = str;
 
    //console.log("retorna como string ", formattedString);
    return(formattedString);
}

function formatWithThousandsNoDecimalZeros(amount){
    //console.log("monto a remover zeros: " + amount);
    var formattedAmount = amount;
    var formattedString = "";
    if (amount % 1 == 0){
        formattedAmount = parseInt(amount);
    } else {
        formattedAmount = formatWithThousandsPrecision(amount);
    }
    if(ShowCurrencySymbol){
        formattedString = currencyObj.prefix + formattedAmount;
    } else{
        formattedString = formattedAmount;
    }

    var str = formattedString + "";
    if(currencyObj.decimalSeparator == "c") {

        str = str.replace(',00', '');
    } else {
        str = str.replace('.00', '');
    }

    formattedString = str;

    return(formattedString);
}

//Format with thousands and correct currency, for example cents or dollar according to amount.
//Example $0.90 is represented as 90 cents, $2 is still showing $2
function formatWithThousandsNoDecimalZerosAndCurrency(amount){
    var formattedAmount = amount;
    var formattedString = "";
    if (amount % 1 == 0){
        formattedAmount = parseInt(amount);
    } else {
        formattedAmount = formatWithThousandsPrecision(amount);
    }
    if(ShowCurrencySymbol){
        if(amount == 0 || amount >= 1){
            formattedString = currencyObj.prefix + formattedAmount;
        } else if(typeof currencyObj.suffix != "undefined" && currencyObj.suffix != ""){
            formattedAmount = formattedAmount + "";
            formattedString = formattedAmount.substring(2) + currencyObj.suffix;
        } else {
            formattedString = currencyObj.prefix + formattedAmount;
        }
    } else{
        formattedString = formattedAmount;
    }
    return(formattedString);
}

/**
 * @description Executes the Game Close Actions
 */
function lobbyButtonClick(){
    IsClosing = true;
    if(typeof SlotSoundManager != 'undefined'){
        try{
            SlotSoundManager.gameStopAllSound();
        } catch(err){}
    }
    if (IsChiptranfer == true) {
        /*ChipTransferManager.ChiptransferInitAction.GameSession = GlobalGameSession;
        ChipTransferManager.ChiptransferInitAction.Lastgameid = 0;
        ChipTransferManager.ChiptransferInitAction.Rand = parseInt(Math.random() * 1000000);
        ChipTransferManager.ChiptransferInitAction.doChiptransferInitAction();*/
        SlotConnector.doChiptransferInitCall();
    }
    if (UseLobbyRedirect == true ) {
        var arrayIn = getUrlVars();
        var LobbyRedirectUrlTemp = arrayIn["LOBBYURL"];
        if(LobbyRedirectUrlTemp != null && LobbyRedirectUrlTemp != undefined && LobbyRedirectUrlTemp.length > 0){
            LobbyRedirectUrl = LobbyRedirectUrlTemp;
        }
        if (OC == true) {
            OPManager.CustomerSetting.WSPassword = O3;
            OPManager.CustomerSetting.MSToken = CToken;
            OPManager.CustomerSetting.doCustomerSettingAction();
            LobbyRedirectUrl = LobbyRedirectUrl.replace("{P1}", P1);
        }
        try{
            parent.document.location.href = (isApp || useWebService) ? Global.Connector.rootLevel +'index.html?Token='+CToken : LobbyRedirectUrl;
        }catch (err0){
            try {
                top.window.location.href = (isApp || useWebService) ? Global.Connector.rootLevel +'index.html?Token='+CToken : LobbyRedirectUrl;
            } catch (err1) { }
        }
        if(parent == null)
            try {
                window.location = (isApp || useWebService) ? Global.Connector.rootLevel +'index.html?Token='+CToken : LobbyRedirectUrl;
            } catch (err2) { }
    } else {
        try {
            if(CloseWrapperGame()){
                return;
            }
        }catch (err0) { }

        try {
            top.window.open('', '_self', '');
            top.window.close();
        } catch (err1) { }
        try { window.close(); } catch (err2) { }
        try { self.close(); } catch (err3) { }

        window.top.location.href = "../close.html";
    }
}

//---------------Clock on games------------------//

function getServerTimeDifference(){
    var arrayIn = getUrlVars();
    var serverTime = arrayIn["SERVERTIME"];
    if(serverTime == undefined){
        serverTime = arrayIn["servertime"];
    }
    if(serverTime != null && serverTime != ""){
        var todayG = new Date();
        var hG = todayG.getHours();
        var mG = todayG.getMinutes();
        var sG = todayG.getSeconds();
        var serverDate = serverTime.split(":");
        var serverHours = serverDate[0];
        var serverMinutes = serverDate[1];
        var serverSeconds = serverDate[2];
        var date1 = new Date(2000,0,1,hG,mG,sG);
        var date2 = new Date(2000, 0, 1, serverHours, serverMinutes, serverSeconds);
        diff = date2 - date1;
    }
}

function startTime() {
    var today = new Date();
    var newDate = new Date(today.getTime() + diff);
    var hD = newDate.getHours();
    var mD = newDate.getMinutes();
    mD = checkTime(mD);
    document.getElementById('hour').innerHTML = hD + ":" + mD;

    var t = setTimeout(function() {
        startTime()
    }, 500);
}

function checkTime(i) {
    if (i < 10) {
        i = "0" + i
    }; // add zero in front of numbers < 10
    return i;
}


/*
 * @description: get parameters from url querystring and store them in an array
 * @returns: {arr} vars: associative array with url parameters and values
 */
function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0].toUpperCase());
        vars[hash[0].toUpperCase()] = hash[1];
    }
    return vars;
}

/*Game Session User Id*/
function getUserId(){
    try{
        var realTemp = GlobalGameSession.split('|');
        var idToUser = 0;

        for (var i = 0; i < realTemp.length; i++) {
            if(realTemp[i].indexOf('_') != -1){
                var value = realTemp[i].split('_');
                idToUser = value[0];
            }
        }
        return idToUser;
    }catch (err) {
        txt = "There was an error on module (Utils).\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

/*Game Session User Id*/
function getUserIdExternal(GameSessionValue){
    try{
        var realTemp = GameSessionValue.split('|');
        var idToUser = 0;

        for (var i = 0; i < realTemp.length; i++) {
            if(realTemp[i].indexOf('_') != -1){
                var value = realTemp[i].split('_');
                idToUser = value[0];
            }
        }
        return idToUser;
    }catch (err) {
        txt = "There was an error on module (Utils).\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
        return null;
    }
}

function supportsCanvas() {
    return !!document.createElement('canvas').getContext;
}

var initHeartBeat = function(){
        if ( typeof HeartBeat != "undefined" ) {
            var intervalIds = new Array();
            var newInterval = setInterval(function(){
                if(!SpinExecuted){
                    var gameS = (GlobalGameSession != null) ? GlobalGameSession : Global.Connector.gameSession;
                    if ( gameS != null ) {
                        HeartBeat.GameSession = GlobalGameSession;
                        HeartBeat.doHeartBeat();
                    }
                }
                SpinExecuted = false;
            }, TimeHeartBeatCall);
            intervalIds.push(newInterval);
        }
    }

$(document).ready(function(){
    getServerTimeDifference();
    
    if(!ShowLobbyBtn){
        $("#closeButton").hide();
    }else{
        var varArr =  getUrlVars();

        var noexit = varArr["NOEXIT"];
        if(typeof(noexit) != "undefined" && noexit != null && noexit == "1"){
            $("#closeButton").hide();
        }else{
            $("#closeButton").show();
        }
    }

});


/*Refresh Balance after Rebates*/
function SlotsRefreshBalance () {
  try {

    if( typeof externalGamesUpdateBalance != "undefined"){
        externalGamesUpdateBalance( CustomerBalance );
    }

    if( typeof mod_slotsUI != "undefined"){
        mod_slotsUI.drawBalance( CustomerBalance );
    }

    if(typeof slotsUI != "undefined"){
        slotsUI.drawBalance( CustomerBalance );
    }

  } catch ( err ) {
    var txt = "There was an error on module (Utils).\n\n";
    txt += "Error description: " + err.message + "\n\n";
    txt += "Click OK to continue.\n\n";
    alert(txt);
    return null;
  }
};

var blockScrollEvent = (function(){
    if(document.body != null){
        document.body.addEventListener('touchstart', function (event) {
            if (event.touches.length> 1) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }
        }, false);
    }
})();

String.prototype.replaceAt=function(index, char) {
    var a = this.split("");
    a[index] = char;
    return a.join("");
}

if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      return this.substr(position || 0, searchString.length) === searchString;
  };
}

//when object value changes trigger callback
/**
*   How to use
*   var myObject = {
*        cuñao : 0
*    }
*
*     myObject.watch("cuñao", function (id, oldval, newval) {
*         console.log('nuevo valor', newval);
*         doSomething();
*         return newval;
*     });
*
**/
if (!Object.prototype.watch) {
    Object.defineProperty(Object.prototype, "watch", {
          enumerable: false, configurable: true, writable: false, value: function (prop, handler) {
            var oldval = this[prop], newval = oldval, getter = function () {
                return newval;
            }, setter = function (val) {
                oldval = newval;
                return newval = handler.call(this, prop, oldval, val);
            };

            if (delete this[prop]) {
                Object.defineProperty(this, prop, {
                      get: getter, set: setter, enumerable: true, configurable: true
                });
            }
        }
    });
}

// object.unwatch
if (!Object.prototype.unwatch) {
    Object.defineProperty(Object.prototype, "unwatch", {
          enumerable: false, configurable: true, writable: false, value: function (prop) {
            var val = this[prop];
            delete this[prop]; // remove accessors
            this[prop] = val;
        }
    });
}

function fontChecker(font, callback) {
    var thing = document.createElement('span');
    thing.innerHTML = 'AzuraSTRiKE!@-/#';
    thing.style.position      = 'absolute';
    thing.style.left          = '-10000px';
    thing.style.top           = '-10000px';
    thing.style.fontSize      = '300px';
    thing.style.fontFamily    = 'sans-serif';
    thing.style.fontVariant   = 'normal';
    thing.style.fontStyle     = 'normal';
    thing.style.fontWeight    = 'normal';
    thing.style.letterSpacing = '0';
    document.body.appendChild(thing);
    var width = thing.offsetWidth;
    thing.style.fontFamily = font;
    var interval;
    interval = setInterval(function(){
        if(thing && thing.offsetWidth != width) {
            thing.parentNode.removeChild(thing);
            thing = null;
            callback();
            clearInterval(interval);
        }
    }, 50);
}