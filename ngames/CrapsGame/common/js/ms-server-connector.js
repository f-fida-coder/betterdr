/**
 * ServerManager Module.
 * This module has all functions related to send server request and store the response in its respective variables.
 * How to use:
 * Call any of these functions to make server calls. Parameters are explained on functions:
 * ServerManager.doEnterGameAction
 * ServerManager.readEnterValuesFromUrl
 * ServerManager.doInitAction
 * ServerManager.doGetLanguageAction
 * ServerManager.doSpinAction
 * ServerManager.doMessageAction
 * ServerManager.doGetBonus
 * ServerManager.sendBonusLog
 * ServerManager.doChiptransferInitAction
 * ServerManager.doChiptransferBuyInAction
 * ServerManager.doChiptransferCashOutAction
 * ServerManager.doGetRebatesAction
 * ServerManager.doRebateClaimAction
 *
 *
 *  @module  ServerManager
 */
 var seedJackpot = null;
 var callingSpin = false;
 var spinCallError = false;
var ServerManager = (function(){
    /**
     * @description Get the enter response data
     * @function doEnterGameGetData
     * @param {string} data enter.aspx server response
     * @param {function} callback1 function to be called after Enter
     * @param {function} callback2 function to be called after Init is complete
     * @returns {bool} for success or failure
     */
    var doEnterGameGetData = function(data, callback1, callback2){
        try{
            Global.Connector.lang = 'en';
            Global.Connector.errorCode = null;
            var array = data.split('&');
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            for (var i=0; i < array.length; i++){
                var arrayTemp2 = array[i].split('=');
                if(arrayTemp2[0].toUpperCase() == 'ERRCODE'){
                    Global.Connector.errorCode = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'GAMESESSION'){
                    Global.Connector.gameSession = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'LANG'){
                    Global.Connector.lang = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'GAMECODE'){
                    Global.Connector.gameCode = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'SHOWCASHIER'){
                    Global.Connector.showCashier = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'SHOWHISTORY'){
                    Global.Connector.showHistory = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'SHOWTYPE'){
                    Global.Connector.showType = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'SHOWCHIPS'){
                    Global.Connector.showChips = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'CURRENCY'){
                    Global.Connector.currency = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'HELPFILE'){
                    Global.Game.helpPage = arrayTemp2[1];
                }  else if(arrayTemp2[0].toUpperCase() == 'ACCOUNTID'){
                    Global.Connector.accountId = arrayTemp2[1];
                }
            }
            callback1(callback2);
        } catch (err){
            txt = "There was an error on doEnterGameGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Get the init values from the aspx
     * @function doInitGetData
     * @param {string} data init.aspx server response
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after Init is complete
     * @returns {bool} for success or failure
     */
    var doInitGetData = function(data, callback1, callback2){
        try{
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            if(data != undefined && data.length > 0){
                var array = data.split('&');
                for(var i=0; i < array.length; i++){
                    var arrayTemp2 = array[i].split('=');
                    if(arrayTemp2[0].toUpperCase() == 'BRCLID'){
                        Global.BonusRound.brclid = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'CV'){
                        Global.Connector.cv = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'CVALS'){
                        Global.Connector.cvals = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MINB'){
                        Global.Connector.minb = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MAXB'){
                        Global.Connector.maxb = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'CVALSD'){
                        Global.Connector.cvalsd = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'INCOINS'){
                        Global.Connector.incoins = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'LB'){
                        Global.Connector.lb = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MAXLB'){
                        Global.Connector.maxlb = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MINLB'){
                        Global.Connector.minlb = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'LC'){
                        Global.Connector.lc = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MAXLC'){
                        Global.Connector.maxlc = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'FREES'){
                        Global.Connector.frees = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BAL'){
                        Global.Connector.bal = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'PATHS'){
                        Global.Connector.paths = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'PAYT'){
                        Global.Connector.payt = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'REESA'){
                        Global.Connector.reesa = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'GID'){
                        Global.Connector.gid = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'ERRCODE'){
                        Global.Connector.errorCode = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'ISERR'){
                        Global.Connector.iserr = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'ERRD'){
                        Global.Connector.errd = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRPAYT'){
                        Global.BonusRound.brpayt = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRMULT'){
                        Global.BonusRound.brmult = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRCOW'){
                        Global.BonusRound.brcow = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRVARS'){
                        Global.BonusRound.brvars = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRPLOG'){
                        Global.BonusRound.brplog = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                        Global.Connector.jackpot = parseFloat(arrayTemp2[1]);
                    } else if(arrayTemp2[0].toUpperCase() == 'TWKS'){
                        Global.Connector.twks = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'REELS'){
                        Global.Connector.reels = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                        Global.Connector.messageId = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'LASTGAMEID'){
                        Global.Connector.lastGameId = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BLOCKNOTE'){
                        Global.Connector.blockNote =  arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'AVAILABLEBALANCE'){
                        Global.Connector.availableBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CUVARS'){
                        Global.Connector.cuvars = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == "MORLS") {
                        Global.BonusRound.morls = arrayTemp2[1]
                    } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                        Global.ChipTransfer.tcounter = arrayTemp2[1];
                    }
                }
            }



            if (Global.Connector.iserr == "0") {
                var GameChipsValueArr = decodeURIComponent(Global.Connector.cvals).split(',');
                if(typeof Global.Connector.jackpot != 'undefined' && typeof GameChipsValueArr != 'undefined' && typeof Global.Connector.maxlc != 'undefined'){
                    if( Global.Connector.jackpot != null && GameChipsValueArr != null && Global.Connector.maxlc != null ){
                        seedJackpot = parseFloat(Global.Connector.jackpot) / parseFloat(GameChipsValueArr[GameChipsValueArr.length - 1] * Global.Connector.maxlc)
                    }
                }

                callback1(callback2);
                return true;
            } else {
                var errorTranslation = (Global.Connector.errd);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.Connector.errorCode);
                    } else {
                        showErrorMessage(Global.Connector.errorCode);
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
        } catch (err){
            txt = "There was an error on doInitGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read server get language response
     * @function getTranslations
     * @param {string} data server response
     * @param {function} callback function to be called after read server response
     */
    var getTranslations = function(data, callback1, callback2){
        //try {
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }

            $(data).find('language-string-table').each(function () {
                $(this).find('var').each(function () {
                    Global.Language.translations[$(this).attr('id')] = $(this).text();
                });
                $(this).find('field').each(function () {
                    Global.Language.translations[$(this).attr('id')] = $(this).text();
                });
                var decimalRE = "[\\-\\+]?(?:(?:0|[1-9]\\d*)(?:\\.\\d*)?|\\.\\d+)(?:[eE][\\-\\+]?[1-9]\\d*)?"
                $(this).find('html-tweak[gamecode="' + Global.Connector.gameCode + '"]').each(function (index, element) {
                    if(element.attributes["customid"] === undefined){
                        if(element.attributes["gameformat"] === undefined || element.attributes["gameformat"].value === gameFormat){
                            var idValue = "";
                            var stylesL = {};
                            var stylesP = {};
                            var stylesSVG = {};
                            var name = "";
                            var value = "";
                            var element = null;
                            var positionedElement = false;
                            $.each(this.attributes, function(i, attrib){
                                name = attrib.name;
                                value = attrib.value;
                                if(name == "id"){
                                    idValue = value;
                                    element = $(".is-ml[ml-key='" + idValue + "']");
                                    if(element.css('position') == "absolute" || element.css('position') == "relative"){
                                        positionedElement = true;
                                    }
                                } else if(name != "gamecode"){
                                    switch(name){
                                        case "fontsize-landscape":
                                            stylesL[ 'font-size' ] = value + "px";
                                            break;
                                        case "left-landscape":
                                            if(positionedElement){
                                                stylesL[ 'left' ] = value + "px";
                                            } else {
                                                stylesL[ 'margin-left' ] = value + "px";
                                            }
                                            break;
                                        case "right-landscape":
                                            if(positionedElement){
                                                stylesL[ 'right' ] = value + "px";
                                            } else {
                                                stylesL[ 'margin-right' ] = value + "px";
                                            }
                                            break;
                                        case "top-landscape":
                                            if(positionedElement){
                                                stylesL[ 'top' ] = value + "px";
                                            } else {
                                                stylesL[ 'margin-top' ] = value + "px";
                                            }
                                            break;
                                        case "bottom-landscape":
                                            if(positionedElement){
                                                stylesL[ 'bottom' ] = value + "px";
                                            } else {
                                                stylesL[ 'margin-bottom' ] = value + "px";
                                            }
                                            break;
                                        case "fontsize-portrait":
                                            stylesP[ 'font-size' ] = value + "px";
                                            break;
                                        case "left-portrait":
                                            if(positionedElement){
                                                stylesP[ 'left' ] = value + "px";
                                            } else {
                                                stylesP[ 'margin-left' ] = value + "px";
                                            }
                                            break;
                                        case "right-portrait":
                                            if(positionedElement){
                                                stylesP[ 'right' ] = value + "px";
                                            } else {
                                                stylesP[ 'margin-right' ] = value + "px";
                                            }
                                            break;
                                        case "top-portrait":
                                            if(positionedElement){
                                                stylesP[ 'top' ] = value + "px";
                                            } else {
                                                stylesP[ 'margin-top' ] = value + "px";
                                            }
                                            break;
                                        case "bottom-portrait":
                                            if(positionedElement){
                                                stylesP[ 'bottom' ] = value + "px";
                                            } else {
                                                stylesP[ 'margin-bottom' ] = value + "px";
                                            }
                                            break;
                                        case "x":
                                            stylesSVG[ 'x' ] = value;
                                            break;
                                        case "y":
                                            stylesSVG[ 'y' ] = value;
                                            break;
                                        case "casing":
                                            stylesSVG[ 'casing' ] = value;
                                            break;
                                    }
                                }
                            });

                            if(Object.keys(stylesL).length > 0){
                                Global.Language.tweaksL[idValue] = stylesL;
                            }
                            if(Object.keys(stylesP).length > 0){
                                Global.Language.tweaksP[idValue] = stylesP;
                            }
                             if(Object.keys(stylesSVG).length > 0){
                                Global.Language.tweaksSVG[idValue] = stylesSVG;
                            }
                        }
                    }
                    else {
                        // This introduces tweaksCustom to process html-tweak tags with the customid attribute set.
                        "use strict";
                        var id          = this.attributes["id"].value;
                        var customid    = this.attributes["customid"].value;
                        var style       = {pixi: {}, process: {}};
                        var numParse;
                        $.each(this.attributes, function(i, attr) {
                            var loName = attr.name.toLowerCase();
                            switch(loName) {
                                case "align":
                                    if(/^(left|center|right)$/i.test(attr.value))
                                        style.pixi.align = attr.value.toLowerCase();
                                    break;
                                case "casing":
                                    if(/^(lower|upper|camel)$/i.test(attr.value))
                                        style.process.casing    = attr.value.toLowerCase();
                                    else if(/^small-?caps$/i.test(attr.value))
                                        style.pixi.fontVariant  = "small-caps";
                                    else if(/^small-?caps-?camel$/i.test(attr.value)) {
                                        style.pixi.fontVariant  = "small-caps";
                                        style.process.casing    = "camel";
                                    }
                                    break;
                                case "font-size":
                                case "fontsize":
                                case "size": {
                                    var match = new RegExp("^(" + decimalRE + ")(p[tx]|%|em)?$", "i").exec(attr.value);
                                    if(match) {
                                        if(!match[2])
                                            style.pixi.padding = style.pixi.fontSize = Number(attr.value);
                                        else
                                            style.pixi.padding = style.pixi.fontSize = attr.value.toLowerCase();
                                    }
                                    break;
                                }
                                case "font-weight":
                                case "fontweight":
                                case "weight":
                                    if(/^(lighter|normal|bold|bolder|[1-9]00)$/i.test(attr.value))
                                        style.pixi.fontWeight = attr.value.toLowerCase();
                                    break;
                                case "lines":
                                    numParse = Number(attr.value);
                    if(!isNaN(numParse)) {
                        style.pixi.wordWrap = false;
                                        style.process[loName] = numParse;
                    if(style.pixi.hasOwnProperty("wordWrapWidth"))
                        delete style.pixi.wordWrapWidth;
                    }
                                    break;
                                //case "scale":
                                case "xdelta":
                                case "ydelta":
                                    numParse = Number(attr.value);
                                    if(!isNaN(numParse))
                                        style.process[loName] = numParse;
                                    break;
                                case "leading":
                                case "line-spacing":
                                case "linespacing":
                                case "spacing":
                                    numParse = Number(attr.value);
                                    if(!isNaN(numParse))
                                        style.pixi.leading = numParse;
                                    break;
                                case "letter-spacing":
                                case "letterspacing":
                                    numParse = Number(attr.value);
                                    if(!isNaN(numParse))
                                        style.pixi.letterSpacing = numParse;
                                    break;
                                case "lineheight":
                                case "line-height":
                                    numParse = Number(attr.value);
                                    if(!isNaN(numParse))
                                        style.pixi.lineHeight = numParse;
                                    break;
                                //Disabling this for now, it would be incompatible with the "lines" feature.
                                //case "wrap":
                                //case "wordwrap":
                                //    if(/^(true|y(es)?|on|1)$/i.test(attr.value))
                                //        style.pixi.wordWrap = true;
                                //    else if(/^(false|no?|off|0)$/i.test(attr.value))
                                //        style.pixi.wordWrap = false;
                                //    break;
                                case "width":
                                case "wrapwidth":
                                case "wordwrapwidth":
                    numParse = Number(attr.value);
                    if(!isNaN(numParse)) {
                        style.pixi.wordWrap      = true;
                        style.pixi.wordWrapWidth = Number(attr.value);
                    if(style.process.hasOwnProperty("lines"))
                        delete style.process.lines;
                    }
                            }
                        });
                        ((Global.Language.tweaksCustom || (Global.Language.tweaksCustom = {}))[id] || (Global.Language.tweaksCustom[id] = {}))[customid] = style;
                    }
                });
            });
            if(typeof(callback1) != 'undefined' && callback1 != null){
                callback1(callback2);
            }

        /*} catch (err){
            txt = "There was an error on getTranslations.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }*/
    };

    /**
     * @description Get the spin values from the aspx response
     * @function doSpinGetData
     * @param {string} data enter.aspx server response
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after Spin is complete
     * @returns {bool} for success or failure
     */
    var doSpinGetData = function(data, callback1, callback2){
        try {
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            Global.SlotGame.callingSpin = false;
            if(data != undefined && data.length > 0){
                var array = data.split('&');
                for (var i=0; i < array.length; i++){
                    var arrayTemp2 = array[i].split('=');
                    if(arrayTemp2[0].toUpperCase() == 'BRCLID'){
                        Global.Connector.brclid = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'FREES'){
                        Global.Connector.frees = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'GID'){
                        Global.Connector.gid = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'COW'){
                        Global.Connector.cow = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'REELS'){
                        Global.Connector.reels = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BAL'){
                        Global.Connector.bal = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'HITS'){
                        Global.Connector.hits = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'ERRD'){
                        Global.Connector.errd = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'ISERR'){
                        Global.Connector.iserr = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'BRMULT'){
                        Global.Connector.brmult = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRPAYT'){
                        Global.Connector.brpayt = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BRVARS'){
                        Global.Connector.brvars = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                        Global.Connector.jackpot = parseFloat(arrayTemp2[1]);
                    } else if (arrayTemp2[0].toUpperCase() == 'JACKPOTNEW'){
                        Global.Connector.jackpotNew = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'JPWON'){
                        Global.Connector.jpWon = arrayTemp2[1];
                    }
                    else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                        Global.Connector.messageId = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'LASTGAMEID'){
                        Global.Connector.lastGameId = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'BLOCKNOTE'){
                        Global.Connector.blockNote = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'AVAILABLEBALANCE'){
                        Global.Connector.availableBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CUVARS'){
                        Global.Connector.cuvars = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == "MORLS") {
                        Global.BonusRound.morls = arrayTemp2[1];
                    }else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                        Global.ChipTransfer.tcounter = arrayTemp2[1];
                    }
                }
            }
            if (Global.Connector.iserr == "0"){
                if(!spinCallError){
                    var GameChipsValueArr = decodeURIComponent(Global.Connector.cvals).split(',');
                    if(typeof Global.Connector.jackpot != 'undefined' && typeof GameChipsValueArr != 'undefined' && typeof Global.Connector.maxlc != 'undefined'){
                        if(Global.Connector.jackpotNew != null ){
                            seedJackpot = parseFloat(Global.Connector.jackpotNew) / parseFloat(GameChipsValueArr[GameChipsValueArr.length - 1] * Global.Connector.maxlc)
                        }
                        else if( Global.Connector.jackpot != null && GameChipsValueArr != null && Global.Connector.maxlc != null ){
                            seedJackpot = parseFloat(Global.Connector.jackpot) / parseFloat(GameChipsValueArr[GameChipsValueArr.length - 1] * Global.Connector.maxlc)
                        }
                    }
                    
                    callback1(callback2);
                    callingSpin = false;
                    return true;
                }
                return false;
                
            } else {
                var errorTranslation = (Global.Connector.errd);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.Connector.errd);
                    } else {
                        showErrorMessage(Global.Connector.errd);
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
                callingSpin = false;
                return false;
            }
        } catch (err){
            txt = "There was an error on doSpinGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Get the message values from the aspx response
     * @function doMessageGetData
     * @param {string} data enter.aspx server response
     * @param {function} callback function to be called after read server response
     */
    var doMessageGetData = function(data, callback){
        try {
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            if(data != undefined && data.length > 0){
                var array = data.split('&');
                for (var i = 0; i < array.length; i++){
                    var arrayTemp2 = array[i].split('=');
                    if(arrayTemp2[0].toUpperCase() == 'MSGCONTENT'){
                        Global.Connector.msgContent = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MSGTYPE'){
                        Global.Connector.msgType = arrayTemp2[1];
                    } else if(arrayTemp2[0].toUpperCase() == 'MSGTITLE'){
                        Global.Connector.msgTitle = arrayTemp2[1];
                    }
                }
                callback(Global.Connector.msgType, Global.Connector.msgTitle, Global.Connector.msgContent);
            }
        } catch (err){
            txt = "There was an error on doMessageGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Get the bonus round values from the aspx
     * @function bonusRoundGetData
     * @param {string} data Global.BonusRound.aspx server response
     * @param {function} callback function to be called after read server response
     */
    var bonusRoundGetData = function(data, callback1, callback2){
        //try{
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            var arrayData = data.split('&');
            for (var i=0; i < arrayData.length; i++){
                var arrayTemp2 = arrayData[i].split('=');
                if(arrayTemp2[0].toUpperCase() == 'BRCLID'){
                    Global.BonusRound.brclid = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BRMULT'){
                    Global.BonusRound.brmult = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BRVARS' &&  arrayTemp2[1] != ""){
                    Global.BonusRound.brvars = arrayTemp2[1];
                    var brvarsArray = Global.BonusRound.brvars.split(".");
                    Global.BonusRound.brwon = brvarsArray[3];
                } else if(arrayTemp2[0].toUpperCase() == 'BRPAYT'){
                    Global.BonusRound.brpayt = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BRCOW' && arrayTemp2[1] != ""){
                    Global.BonusRound.brcow = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BAL'){
                    Global.Connector.bal = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'FREES'){
                    if(arrayTemp2[1]){
                        Global.Connector.frees = arrayTemp2[1];
                    }
                } else if(arrayTemp2[0].toUpperCase() == 'ISERR'){
                    Global.Connector.iserr = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'BLOCKNOTE'){
                    Global.Connector.blockNote =  arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'AVAILABLEBALANCE'){
                    Global.Connector.availableBalance = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                    Global.Connector.messageId = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ERRD'){
                    Global.Connector.errd = arrayTemp2[1];
                }
                 /*else if(arrayTemp2[0].toUpperCase() == 'BRTRY'){
                    Global.BonusRound.brtry = arrayTemp2[1];
                
                } else if(arrayTemp2[0].toUpperCase() == 'BRLAS'){
                    Global.BonusRound.brlas = arrayTemp2[1];
                }

                else if(arrayTemp2[0].toUpperCase() == 'BRLAP'){
                    Global.BonusRound.brlap = arrayTemp2[1];
                }*/
            }
            if (Global.Connector.iserr == "0"){
                callback1(callback2);
                return true;
            } else {
                var errorTranslation = (Global.Connector.errd);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.Connector.errd);
                    } else {
                        showErrorMessage(Global.Connector.errd);
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
        /*} catch (err){
            txt = "There was an error on bonusRoundGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }*/
    };

    /**
     * @description Read response from chiptransfer init
     * @function doChiptransferInitGetData
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after chiptransfer init is complete
     * @returns {bool} for success or failure
     */
    var doChiptransferInitGetData = function(data, callback1, callback2){
        try{
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            if (data != undefined && data.length > 0) {
                var array = data.split('&');
                for (var i = 0; i < array.length; i++) {
                    var arrayTemp2 = array[i].split('=');
                    if (arrayTemp2[0].toUpperCase() == 'GAMEBALANCE') {
                        Global.ChipTransfer.gameBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ACCOUNTBALANCE') {
                        Global.ChipTransfer.accountBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CBALANCE') {
                        Global.ChipTransfer.cbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'SBALANCE') {
                        Global.ChipTransfer.sbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORDETAILS') {
                        Global.ChipTransfer.errorDetails = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'MAXBUYIN') {
                        Global.ChipTransfer.maxBuyIn = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'MINBUYIN') {
                        Global.ChipTransfer.minBuyIn = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'DEFAULTBUYIN') {
                        Global.ChipTransfer.defaultBuyIn = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'MINCASHOUT') {
                        Global.ChipTransfer.minCashOut = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'MAXCASHOUT') {
                        Global.ChipTransfer.maxCashOut = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CURRENCY') {
                        Global.ChipTransfer.currency = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORCODE') {
                        Global.Connector.errorCode = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ALLOWCASHOUT') {
                        Global.ChipTransfer.allowCashout = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ALLOWDECIMALS') {
                        Global.ChipTransfer.allowDecimals = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'SHOWDEPOSIT') {
                        Global.ChipTransfer.showDeposit = arrayTemp2[1];
                    }else if (arrayTemp2[0].toUpperCase() == 'BUYIN') {
                        Global.ChipTransfer.buyIn = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'BUYINENABLED') {
                        Global.ChipTransfer.buyInEnabled = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'BUYINMESSAGE') {
                        Global.ChipTransfer.buyInMessage = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ENTRIES') {
                        Global.ChipTransfer.entries = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'POSITION') {
                        Global.ChipTransfer.positionRank = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'REBUY') {
                        Global.ChipTransfer.rebuy = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'REBUYENABLED') {
                        Global.ChipTransfer.rebuyEnabled = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'REBUYMESSAGE') {
                        Global.ChipTransfer.rebuyMessage = arrayTemp2[1];
                    }
                }
            }
            if (Global.Connector.errorCode == "0" && Global.ChipTransfer.errorDetails == ""){
                callback1(callback2);
                return true;
            } else {
                var errorTranslation = (Global.ChipTransfer.errorDetails);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.ChipTransfer.errorDetails);
                    } else {
                        showErrorMessage(Global.ChipTransfer.errorDetails);
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
        } catch (err){
            txt = "There was an error on doChiptransferInitGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read chiptransfer BuyIn response
     * @function doChiptransferBuyInGetData
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after buyin is complete
     * @returns {bool} for success or failure
     */
    var doChiptransferBuyInGetData = function(data, callback1, callback2) {
        try{
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            if(data != undefined && data.length > 0){
                var array = data.split('&');
                for (var i = 0; i < array.length; i++) {
                    var arrayTemp2 = array[i].split('=');
                    if (arrayTemp2[0].toUpperCase() == 'GAMEBALANCE') {
                        Global.ChipTransfer.gameBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ACCOUNTBALANCE') {
                        Global.ChipTransfer.accountBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CBALANCE') {
                        Global.ChipTransfer.cbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'SBALANCE') {
                        Global.ChipTransfer.sbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORDETAILS') {
                        Global.ChipTransfer.errorDetails = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORCODE') {
                        Global.Connector.errorCode = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER') {
                        Global.ChipTransfer.tcounter = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'GAMESESSION') {
                        Global.ChipTransfer.gameSession = arrayTemp2[1];
                    }
                }
            }
            if (Global.Connector.errorCode == "0" && Global.ChipTransfer.errorDetails == ""){
                callback1(callback2);
                return true;
            } else {
                var errorTranslation = (Global.ChipTransfer.errorDetails);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.ChipTransfer.errorDetails);
                    } else {
                        showErrorMessage(Global.ChipTransfer.errorDetails);
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
        } catch (err){
            txt = "There was an error on doChiptransferBuyInGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read chiptransfer Cashout response
     * @function doChiptransferCashOutGetData
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after cashout is complete
     */
    var doChiptransferCashOutGetData = function(data, callback1, callback2){
        try{
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            if(data != undefined && data.length > 0){
                var array = data.split('&');
                for (var i = 0; i < array.length; i++) {
                    var arrayTemp2 = array[i].split('=');
                    if (arrayTemp2[0].toUpperCase() == 'GAMEBALANCE') {
                        Global.ChipTransfer.gameBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ACCOUNTBALANCE') {
                        Global.ChipTransfer.accountBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CBALANCE') {
                        Global.ChipTransfer.cbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'SBALANCE') {
                        Global.ChipTransfer.sbalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORDETAILS') {
                        Global.Connector.errorDetails = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORCODE') {
                        Global.Connector.errorCode = arrayTemp2[1];
                    }
                }
                if (Global.Connector.errorCode == "0" && Global.ChipTransfer.errorDetails == ""){
                    callback1(callback2);
                return true;
                } else {
                    var errorTranslation = (Global.ChipTransfer.errorDetails);
                    if (errorTranslation == '') {
                        if(isMobile.any()){
                            showErrorMessage(Global.ChipTransfer.errorDetails);
                        } else {
                            showErrorMessage(Global.ChipTransfer.errorDetails);
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
            }
        } catch (err){
            txt = "There was an error on doChiptransferCashOutGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read get rebates response
     * @function doRebatesInitGetData
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after rebates is complete
     */
    var doRebatesInitGetData = function(data, callback1, callback2){
        try {
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            Global.Connector.errorCode = "";
            if(data != undefined && data.length > 0) {
                var array = data.split('&');
                for (var i = 0; i < array.length; i++) {
                    var arrayTemp2 = array[i].split('=');
                    if (arrayTemp2[0].toUpperCase() == 'CURRENTREBATEBALANCE') {
                        Global.Rebates.balance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'HISTORY') {
                        if(arrayTemp2[1] != ""){
                            var historyData = decodeURIComponent(arrayTemp2[1]).split('||');
                            for (var idHis = 0; idHis < historyData.length; idHis++) {
                                var historyDetails = historyData[idHis].split('|');
                                Global.Rebates.history.push({Game:historyDetails[0].replace("+"," "), Date:historyDetails[1], Amount:historyDetails[2], Rebate: formatWithPrecision(historyDetails[3])});
                            }
                        }
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORDETAILS') {
                        Global.Connector.errorDetails = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORCODE') {
                        Global.Connector.errorCode = arrayTemp2[1];
                    }
                }
                if (Global.Connector.errorCode == "" || Global.Connector.errorCode == "0") {
                    callback1(callback2);
                    // return true;
                } else {
                    var errorTranslation = (Global.Connector.errorDetails);
                    if (errorTranslation == '') {
                        if(isMobile.any()){
                            showErrorMessage(Global.Connector.errorDetails);
                        } else {
                            showErrorMessage(Global.Connector.errorDetails);
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
                }
            }
        } catch (err){
            txt = "There was an error on doRebatesInitGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read claim rebates response
     * @function doCustomerRebateClaimGetData
     * @param {function} callback1 function to be called after read server response
     * @param {function} callback2 function to be called after claim rebates is complete
     */
    var doCustomerRebateClaimGetData = function(data, callback1, callback2){
        try {
            if(typeof(HeartbeatManager) != "undefined"){
                HeartbeatManager.setLastServerCall();
            }
            Global.Connector.errorCode = "";
            if (data != undefined && data.length > 0) {
                var array = data.split('&');
                for (var i = 0; i < array.length; i++) {
                    var arrayTemp2 = array[i].split('=');
                    if (arrayTemp2[0].toUpperCase() == 'BALANCE') {
                        CustomerBalance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'CURRENTREBATEBALANCE') {
                        Global.Rebates.balance = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORDETAILS') {
                        Global.Connector.errorDetails = arrayTemp2[1];
                    } else if (arrayTemp2[0].toUpperCase() == 'ERRORCODE') {
                        Global.Connector.errorCode = arrayTemp2[1];
                    }
                }
            }
            if (Global.Connector.errorCode == "" || Global.Connector.errorCode == "0") {
                callback1(callback2);
                // return true;
            } else {
                var errorTranslation = (Global.Connector.errorDetails);
                if (errorTranslation == '') {
                    if(isMobile.any()){
                        showErrorMessage(Global.Connector.errorDetails);
                    } else {
                        showErrorMessage(Global.Connector.errorDetails);
                    }
                } else {
                    if(isMobile.any()){
                        showErrorMessage(errorTranslation);
                    } else {
                        showErrorMessage(errorTranslation);
                    }
                    if(typeof(hideReelsError) != "undefined")
                        hideReelsError();
                }
            }
        } catch (err){
            txt = "There was an error on doCustomerRebateClaimGetData.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            showErrorMessage(txt);
        }
    };

    /**
     * @description Read heartbeat response
     * @function doGetHeartBeatData
     * @param {string} data response from server
     */
    var doGetHeartBeatData =  function(data) {
        Global.Connector.errorCode = "";
        if(data != undefined && data.length > 0){
            var array = data.split('&');
            for (var i=0; i < array.length; i++){
                var arrayTemp2 = array[i].split('=');
                if(arrayTemp2[0].toUpperCase() == 'ERRORCODE'){
                    Global.Connector.errorCode = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'ERRORDETAILS'){
                    Global.Connector.errorDetails = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'GAMEBALANCE'){
                    Global.Connector.bal = arrayTemp2[1];
                } else if(arrayTemp2[0].toUpperCase() == 'MESSAGEIDS'){
                    Global.Connector.messageId = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'JACKPOT'){
                    Global.Connector.jackpot = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'MYSTS'){
                    mysts = arrayTemp2[1];
                } else if (arrayTemp2[0].toUpperCase() == 'TCOUNTER'){
                    Global.ChipTransfer.tcounter = arrayTemp2[1];
                }
            }
            var GameChipsValueArr = decodeURIComponent(Global.Connector.cvals).split(',');
            if(typeof Global.Connector.jackpot != 'undefined' && typeof GameChipsValueArr != 'undefined' && typeof Global.Connector.maxlc != 'undefined'){
                if( Global.Connector.jackpot != null && GameChipsValueArr != null && Global.Connector.maxlc != null ){
                    seedJackpot = parseFloat(Global.Connector.jackpot) / parseFloat(GameChipsValueArr[GameChipsValueArr.length - 1] * Global.Connector.maxlc)
                }
            }

            if(Global.Connector.errorCode != '' && Global.Connector.errorCode != '0'){
                var errorTranslation = (Global.Connector.errorDetails);
                if(isMobile.any()){
                    showErrorMessage(errorTranslation);
                } else {
                    showErrorMessage(errorTranslation);
                }
                if(typeof(hideReelsError) != "undefined")
                    hideReelsError();
                return false;
            } else {
                HeartbeatManager.updateGameFunct();
                if(Global.Connector.messageId  != ""){
                    //Message.doMessageCall(Global.Connector.messageId);
                }
            }
        }
    }

    return {
        /**
         * @description Call enter.aspx with ajax
         * @function doEnterGameAction
         * @param {function} callback1 function to be called after read Enter
         * @param {function} callback2 function to be called when Init is complete
         * @returns {bool} for success or failure
         */
        doEnterGameAction: function (callback1, callback2) {
            try{
                var Url        = Global.Connector.rootLevel + 'Launch/Enter.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Launch/Enter.aspx&method=POST&pageParameters=";
                var parameters = "";
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;

                if (Global.Connector.token != null) {
                    parameters = "CasinoGameId=" + Global.Connector.casinoGameId + "&AccountId=" + Global.Connector.accountId + "&Lang=" + Global.Connector.lang + "&NoRedirect=" + Global.Connector.noRedirect + "&Token=" + Global.Connector.token;
                } else {
                    if (Global.Connector.login != null && Global.Connector.password != null) {
                        parameters = 'login=' + Global.Connector.login + "&password=" + Global.Connector.password + "&CasinoGameId=" + Global.Connector.casinoGameId + "&AccountId=" + Global.Connector.accountId + "&Lang=" + Global.Connector.lang + "&NoRedirect=" + Global.Connector.noRedirect;
                    } else {
                        parameters = "CasinoGameId=" + Global.Connector.casinoGameId + "&AccountId=" + Global.Connector.accountId + "&Lang=" + Global.Connector.lang + "&NoRedirect=" + Global.Connector.noRedirect;
                    }
                }
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            doEnterGameGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            showErrorMessage("ERROR: " + xhr.responseText);
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        headers: { 'cache-control': 'no-cache' },
                        cache: false,
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            doEnterGameGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            showErrorMessage("ERROR: " + xhr.responseText);
                            return false;
                        }
                    });
                }
            }
            catch (err){
                txt = "There was an error on EnterGameAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Get the enter values from the url
         * @function readEnterValuesFromUrl
         * @param {array} EnterArray associative array with url parameters and values
         * @param {function} callback1 function to be called after Enter
         * @param {function} callback2 function to be called when Init is complete
         */
        readEnterValuesFromUrl: function(enterArray, callback1, callback2){
            try{
                Global.Connector.gameSession = enterArray["GAMESESSION"];
                Global.Connector.gameCode = enterArray["GAMECODE"];
                Global.Connector.showCashier = enterArray["SHOWCASHIER"];
                Global.Connector.showHistory = enterArray["SHOWHISTORY"];
                Global.Connector.showType = enterArray["SHOWTYPE"];
                Global.Connector.showChips = enterArray["SHOWCHIPS"];
                Global.Connector.currency = enterArray["CURRENCY"];
                callback1(callback2);
            } catch (err){
                txt = "There was an error on readEnterValuesFromUrl.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
        * @description Call the init.aspx with ajax
        * @function doInitAction
        * @param {function} callback1 function to be called after read Init
        * @param {function} callback2 function to be called after Init is complete
        * @returns {bool} for success or failure
        */
        doInitAction: function(callback1, callback2){
            try{
                var Url = Global.Connector.rootLevel + 'Slots9R9/Init.aspx';
                var AppUrl = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Slots9R9/Init.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId;
                // var isApp = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
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
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doInitGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        headers:{'cache-control': 'no-cache'},
                        cache: false,
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doInitGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on InitAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send get language action to the server
         * @function doGetLanguageAction
         * @param {function} callback function to be called after read server response
         * @returns {bool} for success or failure
         */
        doGetLanguageAction: function (callback1, callback2){
            try {
                var Url        = Global.Connector.rootLevel + 'Languages/GetLangXml.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Languages/GetLangXml.aspx&method=GET&pageParameters=";
                var parameters = 'Lang=' + Global.Connector.lang + '&Version=2&Game=' + Global.Language.gameType + '&GameCode=' + Global.Connector.gameCode + '&p=' + Global.Connector.rand;
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
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
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: "GET",
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        async: true,
                        crossDomain: true,
                        xhrFields: {withCredentials: false},
                        callbackFunction1: callback1,
                        callbackFunction2: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            var xml;
                            if (window.DOMParser) {
                                xml = ( new window.DOMParser() ).parseFromString(decodeURIComponent(data.responseEncoded).replace(/\+/g," "), "text/xml");
                            } else if (typeof window.ActiveXObject != "undefined" && new window.ActiveXObject("Microsoft.XMLDOM")) {
                                xml = new window.ActiveXObject("Microsoft.XMLDOM");
                                xml.async = "false";
                                xml.loadXML(decodeURIComponent(data.responseEncoded));
                            }
                            getTranslations(xml, this.callbackFunction1, this.callbackFunction2);
                            return true;
                        },
                        error: function () {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: "GET",
                        url: Url +"?"+ parameters,
                        dataType: "xml",
                        async: true,
                        crossDomain: true,
                        xhrFields: {withCredentials: false},
                        callbackFunction1: callback1,
                        callbackFunction2: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            getTranslations(data, this.callbackFunction1, this.callbackFunction2);
                            return true;
                        },
                        error: function () {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on GetLanguageAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Call the spin.aspx
         * @function doSpinAction
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called when spin.aspx is complete
         * @returns {bool} for success or failure
         */
        doSpinAction: function(callback1, callback2){
            try {
                if(callingSpin){
                    spinCallError = true;
                    if(isMobile.any()){
                        showErrorMessage(("Error trying to call Spin over other spin."));
                    } else {
                        showErrorMessage(("Error trying to call Spin over other spin."));
                    }
                    if(typeof(hideReelsError) != "undefined"){
                        hideReelsError();
                        $("#lastWin").hide();
                    }
                    return false;
                }

                callingSpin = true;

                var Url        = Global.Connector.rootLevel + 'Slots9R9/Spin.aspx';
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&lb=' + Global.Connector.lb + '&lc=' + Global.Connector.lc + '&lastgameid=' + Global.Connector.lastGameId + '&fs=' + Global.Connector.fs + '&cv=' + Global.Connector.cv;
                parameters += ((Global.Connector.analytics != null && Global.Connector.analytics != '') ? ('&analytics=' + Global.Connector.analytics) : '');
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Slots9R9/Spin.aspx&method=POST&pageParameters=";
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
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
                Global.SlotGame.callingSpin = true;

                if ( isApp || useWebService) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doSpinGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        headers:{'cache-control': 'no-cache'},
                        cache: false,
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doSpinGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on SpinAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Call the message.aspx by ajax
         * @function doMessageAction
         * @param {function} callback function to be called after read server response
         * @returns {bool} for success or failure
         */
        doMessageAction: function(callback){
            try {
                var Url        = Global.Connector.rootLevel + 'Messages/Get.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Messages/Get.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId + '&MessageId=' + Global.Connector.messageId;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        callbackFunction: callback,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doMessageGetData(decodeURIComponent(data.responseEncoded), this.callbackFunction);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: true,
                        url: Url,
                        data: parameters,
                        callbackFunction: callback,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doMessageGetData(data, this.callbackFunction);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            }
            catch (err){
                txt = "There was an error on MessageAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Call the bonus round.aspx by ajax
         * @function doGetBonus
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called after BonusRound call is complete
         * @returns {bool} for success or failure
         */
        doGetBonus: function(callback1, callback2){
            try {
                var Url        = Global.Connector.rootLevel + 'Slots9R9/BonusRound.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Slots9R9/BonusRound.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&gid=' + Global.Connector.gid + '&lastgameid=' + Global.Connector.lastGameId + '&act=' + Global.BonusRound.act+ '&actp=' + Global.BonusRound.actp;
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

                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            bonusRoundGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            bonusRoundGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on BonusRoundAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send bonus round log according to user actions
         * @function sendBonusLog
         * @returns {bool} for success or failure
         */
        sendBonusLog: function(callback1, callback2){
            try{
                var Url        = Global.Connector.rootLevel + 'Slots9R9/BonusPlayerLog.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Slots9R9/BonusPlayerLog.aspx&method=POST&pageParameters=";
                var result     = false;
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&brplog=' + Global.BonusRound.brplog;
                var _self      = this;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                Global.BonusRound.logReturn = null;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            Global.BonusRound.logReturn = true;
                            this.firstCallback(this.secondCallback);
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            Global.BonusRound.LogReturn = false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function(data){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            Global.BonusRound.logReturn = true;
                            this.firstCallback(this.secondCallback);
                        },
                        error: function(xhr, ajaxOptions, thrownError){
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            Global.BonusRound.LogReturn = false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on bonusPlayerLog.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send to the server chiptransfer init action request
         * @function doChiptransferInitAction
         * @returns {bool} for success or failure
         */
        doChiptransferInitAction: function (callback1, callback2){
            try{
                if(Global.Connector.showCashier == "0" || Global.Connector.showCashier == 0 || Global.Connector.showCashier == false)
                    return;

                var Url        = Global.Connector.rootLevel + 'Chiptransfer/init.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Chiptransfer/init.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId + '&rand=' + Global.Connector.rand;
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
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
                if(Global.Connector.gameSession != null && Global.Connector.gameSession != "null" && Global.Connector.gameSession.length > 5){
                    if ( isApp || useWebService ) {
                        $.ajax({
                            type: 'GET',
                            url: AppUrl+encodeURIComponent(parameters),
                            dataType: "jsonp",
                            cache: false,
                            firstCallback: callback1,
                            secondCallback: callback2,
                            success: function(data){
                                receivedServerResponse = true;
                                checkResponseTimer = clearTimeout(checkResponseTimer);
                                doChiptransferInitGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                                return true;
                            },
                            error: function (xhr, ajaxOptions, thrownError) {
                                receivedServerResponse = true;
                                checkResponseTimer = clearTimeout(checkResponseTimer);
                                if(isMobile.any()){
                                    showErrorMessage(("ERR_DB_NOCONN"));
                                } else {
                                    showErrorMessage(("ERR_DB_NOCONN"));
                                }
                                if(typeof(hideReelsError) != "undefined")
                                    hideReelsError();
                                return false;
                            }
                        });
                    } else {
                        $.ajax({
                            type: 'POST',
                            async: false,
                            url: Url,
                            data: parameters,
                            firstCallback: callback1,
                            secondCallback: callback2,
                            success: function(data){
                                receivedServerResponse = true;
                                checkResponseTimer = clearTimeout(checkResponseTimer);
                                doChiptransferInitGetData(data, this.firstCallback, this.secondCallback);
                                return true;
                            },
                            error: function (xhr, ajaxOptions, thrownError) {
                                receivedServerResponse = true;
                                checkResponseTimer = clearTimeout(checkResponseTimer);
                                if(isMobile.any()){
                                    showErrorMessage(("ERR_DB_NOCONN"));
                                } else {
                                    showErrorMessage(("ERR_DB_NOCONN"));
                                }
                                if(typeof(hideReelsError) != "undefined")
                                    hideReelsError();
                                return false;
                            }
                        });
                    }
                }
            }  catch (err){
                txt = "There was an error on ChiptransferInit.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send request to chiptransfer buyin action
         * @function doChiptransferBuyInAction
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called after chiptransfer buyin is complete
         * @returns {bool} for success or failure
         */
        doChiptransferBuyInAction: function (callback1, callback2){
            try{
                var Url        =  Global.Connector.rootLevel + 'Chiptransfer/BuyIn.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Chiptransfer/BuyIn.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession=' + Global.Connector.gameSession  + '&lastgameid=' + Global.Connector.lastGameId + '&toCasino=' + Global.ChipTransfer.toCasino + '&rand=' + Global.Connector.rand;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doChiptransferBuyInGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: false,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doChiptransferBuyInGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on ChiptransferBuyInAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send chiptransfer cashout action
         * @function doChiptransferCashOutAction
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called after cashout is complete
         * @returns {bool} for success or failure
         */
        doChiptransferCashOutAction: function (callback1, callback2){
            try{
                var Url        = Global.Connector.rootLevel + 'Chiptransfer/CashOut.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=Chiptransfer/CashOut.aspx&method=POST&pageParameters=";
                var parameters = 'GameSession='+ Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId + '&toAccount=' + Global.ChipTransfer.toAccount + '&rand=' + Global.Connector.rand;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doChiptransferCashOutGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: false,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doChiptransferCashOutGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on ChiptransferCashOutAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send get rebate action
         * @function doGetRebatesAction
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called after rebates is complete
         * @returns {bool} for success or failure
         */
        doGetRebatesAction: function (callback1, callback2){
            try{
                // alert('doGetRebatesAction '+Global.Connector.gameSession +' - '+Global.Connector.lastGameId);
                var Url        = Global.Connector.rootLevel + 'ChipTransfer/CustomerRebateGet.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=ChipTransfer/CustomerRebateGet.aspx&method=POST&pageParameters=";
                var parameters = 'gamesession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId + '&rand=' + Global.Connector.Rand;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doRebatesInitGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        async: true,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doRebatesInitGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on RebateGetAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },


        /**
         * @description Send claim rebate action
         * @function doRebateClaimAction
         * @param {function} callback1 function to be called after read server response
         * @param {function} callback2 function to be called after claim rebates is complete
         * @returns {bool} for success or failure
         */
        doRebateClaimAction: function (callback1, callback2){
            try{
                var Url        = Global.Connector.rootLevel + 'ChipTransfer/CustomerRebateClaim.aspx';
                var AppUrl     = Global.GameUrls.casinoWrapperURL+"?pageRelativePath=ChipTransfer/CustomerRebateClaim.aspx&method=POST&pageParameters=";
                var parameters = 'gamesession=' + Global.Connector.gameSession + '&lastgameid=' + Global.Connector.lastGameId + '&AmountClaimed=' + Global.Rebates.amountClaimed + '&rand=' + Global.Connector.rand;
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
                // var isApp      = ( Global.Game.isCordovaApp != undefined ) ? Global.Game.isCordovaApp : isCordovaApp;
                if ( isApp || useWebService ) {
                    $.ajax({
                        type: 'GET',
                        url: AppUrl+encodeURIComponent(parameters),
                        dataType: "jsonp",
                        cache: false,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doCustomerRebateClaimGetData(decodeURIComponent(data.responseEncoded), this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                } else {
                    $.ajax({
                        type: 'POST',
                        headers: { 'cache-control': 'no-cache' },
                        cache: false,
                        async: false,
                        url: Url,
                        data: parameters,
                        firstCallback: callback1,
                        secondCallback: callback2,
                        success: function (data) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            doCustomerRebateClaimGetData(data, this.firstCallback, this.secondCallback);
                            return true;
                        },
                        error: function (xhr, ajaxOptions, thrownError) {
                            receivedServerResponse = true;
                            checkResponseTimer = clearTimeout(checkResponseTimer);
                            if(isMobile.any()){
                                showErrorMessage(("ERR_DB_NOCONN"));
                            } else {
                                showErrorMessage(("ERR_DB_NOCONN"));
                            }
                            if(typeof(hideReelsError) != "undefined")
                                hideReelsError();
                            return false;
                        }
                    });
                }
            } catch (err){
                txt = "There was an error on CustomerRebateClaimAction.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                showErrorMessage(txt);
            }
        },

        /**
         * @description Send heartbeat action
         * @function doHeartBeatAction
         * @returns {bool} for success or failure
         */
        doHeartBeatAction: function(){
            var Url = Global.Connector.rootLevel + 'Chiptransfer/Heartbeat.aspx';
            var parameters = 'GameSession=' +  Global.Connector.gameSession;
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
            if ( isApp || useWebService ) {
                //var that = this;
                $.ajax({
                    type: 'GET',
                    headers:{'cache-control': 'no-cache'},
                    cache: false,
                    // async: true,
                    dataType: "jsonp",
                    url: that.AppUrl+encodeURIComponent(parameters),
                    success: function(data, textStatus, jqXHR ){
                        receivedServerResponse = true;
                        checkResponseTimer = clearTimeout(checkResponseTimer);
                        doGetHeartBeatData(decodeURIComponent(data.responseEncoded));
                        return true;
                    },
                    error: function(xhr, ajaxOptions, thrownError){
                        receivedServerResponse = true;
                        checkResponseTimer = clearTimeout(checkResponseTimer);
                        if(isMobile.any()){
                            showErrorMessage(("ERR_DB_NOCONN"));
                        } else {
                            showErrorMessage(("ERR_DB_NOCONN"));
                        }
                        if(typeof(hideReelsError) != "undefined")
                            hideReelsError();
                        return false;
                    }
                });
            } else {
                $.ajax({
                    type: 'POST',
                    headers:{'cache-control': 'no-cache'},
                    cache: false,
                    async: true,
                    url: Url,
                    data: parameters,
                    success: function(data){
                        receivedServerResponse = true;
                        checkResponseTimer = clearTimeout(checkResponseTimer);
                        doGetHeartBeatData(data);
                        return true;
                    },
                    error: function(xhr, ajaxOptions, thrownError){
                        receivedServerResponse = true;
                        checkResponseTimer = clearTimeout(checkResponseTimer);
                        if(isMobile.any()){
                            showErrorMessage(("ERR_DB_NOCONN"));
                        } else {
                            showErrorMessage(("ERR_DB_NOCONN"));
                        }
                        if(typeof(hideReelsError) != "undefined")
                            hideReelsError();
                        return false;
                    }
                });
            }
        }
    };
})();