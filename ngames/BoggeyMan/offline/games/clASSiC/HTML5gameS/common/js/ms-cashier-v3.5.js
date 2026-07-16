"use strict";

/**
 * cashierManager Module.
 * This module has the functions related to manage interface and connect with server,
 * depends of ms-slot-connector and ms-server-connector howbeit requires the variables located in global object to work and IsChiptranfer, AccountID as global
 * so this automatically updates the hearthbeat assuming you are using ms-hearthbeat-manager if not then just be sure that u use some global sesion and not a local
 *
 *
 *
 * Changelog
 * v - 3.5  -------> added support for tournaments, rebuild on es6
 *
 *  @module  ServerManager
 */

//please dont edit the complied file, always do the changes on pre src
var chipsManager = function chipsManager() {

    var _ = this;
    var masterWacher = void 0;
    var normalCash = true;
    var callbackAfterBuyIn = null;
    var buyinLabel = "";
    var bankrollLabel = "";
    var depositLabel = "";
    var withdrawLabel = "";
    var amountLabel = "";
    var invalidAmountLabel = "";
    var playForFunLabel = "";
    var realMoneyLabel = "";
    var tournamentLabel = "";
    var entryPlayer = "";
    var buyTournLabel = "";
    var reBuyTournLabel = "";
    var btnBuyTournLabel = "";
    var counterLabel = [];
    var invalidMaxLabel = "";
    var btnCloseCancel = "";
    var keysCountest = ['CounterTypeId2', 'CounterTypeId3', 'CounterTypeId4', 'CounterTypeId5', 'CounterTypeId6'];

    var arrayKeys = ['BuyIn_fld_Title', 'MainMenu_fld_FreePlay', 'MainMenu_fld_RealMoney', 'BuyIn_fld_Deposit', 'BuyIn_fld_Withdrawal', 'BuyIn_fld_Amount', 'ERR_CASHIER_INVALID', 'BuyIn_fld_YourBal', 'MainMenu_fld_Tournament', 'BuyIn_fld_EntryPos', 'BuyIn_fld_BuyIn', 'BuyIn_fld_Rebuy', 'BuyIn_fld_Buy', 'ERR_CASHIER_MAX', 'BuyIn_fld_Cancel'];

    var arrayIds = ['.dkCashier-title', '.dkCashier-title', '.dkCashier-title', '.cashier-dep-txt', '.cashier-wit-txt', '.amount-txt', '.invalid-cashier', '.casino-balance', '.dkCashier-title', '.entry-text', '.tourn-label-buyin', '.tourn-label-rebuy', '#buy-action-tourn', '#close-cancel-btn'];

    var configuration = {
        type: 4, // 0 hand, 1 dealer hand, 2 player hand, 3 rollerino, 4 spin
        automata: true, //Checks vars and data on libs to know when show popup again, works on slots
        autoStart: true, //If starts with 0 credits auto show cashier on start game
        extraStart: false //If starts with 0 credits auto show cashier on start game but use this on games that dont use standart engine


        // POLIFILL TO WATCH OH BOI
    };if (!Object.prototype.cashWatch) {
        Object.defineProperty(Object.prototype, "cashWatch", {
            enumerable: false, configurable: true, writable: false, value: function value(prop, handler) {
                var oldval = this[prop],
                    newval = oldval,
                    getter = function getter() {
                    return newval;
                },
                    setter = function setter(val) {
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

    // object.unwatchCash
    if (!Object.prototype.unwatchCash) {
        Object.defineProperty(Object.prototype, "unwatchCash", {
            enumerable: false, configurable: true, writable: false, value: function value(prop) {
                var val = this[prop];
                delete this[prop]; // remove accessors
                this[prop] = val;
            }
        });
    }

    /**
     * Creator of interface and initalizer of library
     * @function cashierCreator
     * @param  {string} container  Container where the content will be added
     * @param  {string} path       Location of the imgs, ex ../../Commom/img/chipTransfer
     * @param  {function} callback to be called after buy in is complete
     * @param  {obj} config        config optional
     *
     */
    _.cashierCreator = function (container, path, callback, config) {
        if (callback != null) {
            callbackAfterBuyIn = callback;
        }

        $.extend(configuration, config);

        buyinLabel = LanguagesManager.getTranslationByKey(arrayKeys[0]);
        playForFunLabel = LanguagesManager.getTranslationByKey(arrayKeys[1]);
        realMoneyLabel = LanguagesManager.getTranslationByKey(arrayKeys[2]);
        depositLabel = LanguagesManager.getTranslationByKey(arrayKeys[3]);
        withdrawLabel = LanguagesManager.getTranslationByKey(arrayKeys[4]);
        amountLabel = LanguagesManager.getTranslationByKey(arrayKeys[5]);
        invalidAmountLabel = LanguagesManager.getTranslationByKey(arrayKeys[6]);
        bankrollLabel = LanguagesManager.getTranslationByKey(arrayKeys[7]);
        tournamentLabel = LanguagesManager.getTranslationByKey(arrayKeys[8]);
        entryPlayer = LanguagesManager.getTranslationByKey(arrayKeys[9]);
        buyTournLabel = LanguagesManager.getTranslationByKey(arrayKeys[10]);
        reBuyTournLabel = LanguagesManager.getTranslationByKey(arrayKeys[11]);
        btnBuyTournLabel = LanguagesManager.getTranslationByKey(arrayKeys[12]);
        invalidMaxLabel = LanguagesManager.getTranslationByKey(arrayKeys[13]);
        btnCloseCancel = LanguagesManager.getTranslationByKey(arrayKeys[14]);
        counterLabel = keysCountest.map(function (x) {
            return LanguagesManager.getTranslationByKey(x);
        });

        if (Global.Connector.accountId >= 1 && Global.Connector.accountId < 100) {
            buyinLabel = buyinLabel.replace("~1", realMoneyLabel);
        } else if (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000 || Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) {
            buyinLabel = buyinLabel.replace("~1", tournamentLabel);
            normalCash = false;
        }{
            buyinLabel = buyinLabel.replace("~1", playForFunLabel);
        }

        //interfaz generator
        $('.dkCashier-box').remove();
        $('.tourn-left').remove();

        $("<div class='dkCashier-box'></div>").appendTo(container); // container

        var baseUi = document.createDocumentFragment();
        //Base box

        var CounterLeft = $("<div class='tourn-left "+(isMobile.any()?'counter-mobile':'')+"'>" + counterLabel[configuration.type] + ": <span></span></div>");

        var baseEl = $("<div class='dkCashier-header'>\n                            <span class='dkCashier-title'>" + buyinLabel + "</span>\n                            <div class='close-dkCashier'><span id='close-cancel-btn'>"+ btnCloseCancel +"</span></div>\n                        </div>\n                        <div class='dkCashier-balance-box'>\n                            <span class='casino-balance'> " + bankrollLabel + " <span></span> </span>\n                        </div>");

        var normalCashier = $("<div class=\"cashier-normal-box\">\n                                <div class='dkCashier-transfer-box' id='dkCashier-transfer-box'>\n                                    <span class='cashier-deposit cashier-dep-txt'><img src='" + path + "BuyIn_Tab.png'><p>" + depositLabel + "</p></span>\n                                    <span class='cashier-withdr cashier-wit-txt' ><img src='" + path + "BuyIn_Tab.png'><p>" + withdrawLabel + "</p></span>\n                                </div>\n                                <div class='cashier-deposit-wind'>\n                                    <label for='dep-amount' class='amount-txt'>" + amountLabel + "</label>\n                                    <input type='text' id='dep-amount' maxlength='10'>\n                                    <input id='dkCashier-deposit-button' type='button' value='" + depositLabel + "' class='dkCashier-transfer-button cashier-dep-txt'>\n                                </div>\n                                <div class='cashier-withdr-wind'>\n                                    <label for='wit-amount'>" + amountLabel + "</label>\n                                    <input type='text' id='wit-amount' maxlength='10'>\n                                    <input id='dkCashier-whitdr-button' type='button' value='" + withdrawLabel + "' class='dkCashier-transfer-button cashier-wit-txt'>\n                                </div>\n                                <span class='invalid-cashier'>" + invalidAmountLabel + "</span>\n                            </div>");

        var tournamen = $("<div class='tournament-box'>\n                            <span class='entry-text'>" + entryPlayer + "</span>\n                            <div class='tourn-box'>\n                                <div class='first-set-tourn'>\n                                    <input type='radio' name='tourn' id=\"buyin-trn\">\n                                    <label for='buyin-trn' class='tourn-label-buyin'>" + buyTournLabel + "</label>\n                                </div>\n                                <div class='second-set-tourn'>\n                                    <input type='radio' name='tourn' id=\"rebuy-trn\">\n                                    <label for='rebuy-trn' class='tourn-label-rebuy'>" + reBuyTournLabel + "</label>\n                                </div>\n                                <input type='button' value='" + btnBuyTournLabel + "' id='buy-action-tourn' disabled='true'>\n                            </div>\n                            <span class='tourn-errors'></span>\n                            <span class='tourn-messags'></span>\n                        </div>");

        baseEl.appendTo(baseUi);
        normalCashier.appendTo(baseUi);
        tournamen.appendTo(baseUi);
        CounterLeft.appendTo(container); // container

        if (!normalCash) {
            Global.ChipTransfer.unwatchCash("tcounter");
            if (parseFloat(Global.ChipTransfer.tcounter) > 0) {
                tournCounter();

                Global.ChipTransfer.cashWatch("tcounter", function (id, oldval, newval) {
                    tournCounter();
                    return newval;
                });
            }
        }

        //Add everything
        $('.dkCashier-box')[0].appendChild(baseUi);
        listenersCashier();

        //Add backgrounds and imgs based on path
        $('.dkCashier-box').css({
            "background": "url(" + path + "BuyIn_Dialog_Window.png)", "background-repeat": "no-repeat", "background-size": "contain", "background-position": "center"
        });

        $('.close-dkCashier').css({
            "background": "url(" + path + "BuyIn_CloseX.png)", "background-repeat": "no-repeat", "background-size": "contain", "background-position": "center"
        });

        $('.dkCashier-transfer-button').css({
            "background": "url(" + path + "BuyIn_Button.png)", "background-repeat": "no-repeat", "background-size": "contain", "background-position": "center"
        });

        $('#buy-action-tourn').css({
            "background": "url(" + path + "BuyBtn.png)", "background-repeat": "no-repeat", "background-size": "contain", "background-position": "center"
        });

        //overlay
        $('.cash-over').remove();
        $('<div class="cash-over"></div>').prependTo(container);

        $('.cashier-withdr').css('opacity', '0.5');

        $('.cashier-deposit').on(isMobile.any() ? 'touchend' : 'click', function () {
            $('.cashier-deposit').css('opacity', '1');
            $('.cashier-withdr').css('opacity', '0.5');
            $('#dep-amount').val(Global.ChipTransfer.maxBuyIn);
            $('#wit-amount').val("");
            $('.invalid-cashier').hide();
            $('.cashier-deposit-wind').show();
            $('.cashier-withdr-wind').hide();
        });

        $('.cashier-withdr').on(isMobile.any() ? 'touchend' : 'click', function () {
            $('.cashier-withdr').css('opacity', '1');
            $('.cashier-deposit').css('opacity', '0.5');
            $('#dep-amount').val("");
            $('#wit-amount').val("");
            $('.invalid-cashier').hide();
            $('.cashier-deposit-wind').hide();
            $('.cashier-withdr-wind').show();
        });
        stylesKey();

        //---------
        if (configuration.autoStart) {
            clearInterval(masterWacher);
            masterWacher = setInterval(function () {
                watcherOpener();
            }, 3000);
        } else if (configuration.extraStart) {
            /*if (Number(Global.Connector.bal) < 1) {
                setTimeout(function () {
                    console.log("llama el cashier333");
                    _.openCashier();
                }, 4000);
            }*/
        }
    };

    var watcherOpener = function watcherOpener() {
        if (Number(Global.Connector.bal) == 0) {
            if ($('#preloader-assets').length == 0 && mod_slotsUI.getMachineState() == 'normal' && (frees == 0 || frees == null) && (Global.Connector.frees == 0 || Global.Connector.frees == null)) {
                if (!normalCash || IsChiptranfer) {
                    //auto open
                    _.openCashier();
                }
                clearInterval(masterWacher);
            }
        }
    };

    var listenersCashier = function listenersCashier() {

        $('.close-dkCashier').on(isMobile.any() ? 'touchend' : 'click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            _.closeCashierBox();            
        });

        $('#dkCashier-deposit-button').on(isMobile.any() ? 'touchend' : 'click', function (e) {
            cashierTransferButtonClick(1);
        });

        $('#dkCashier-whitdr-button').on(isMobile.any() ? 'touchend' : 'click', function (e) {
            cashierTransferButtonClick(0);
        });

        $('#buy-action-tourn').on(isMobile.any() ? 'touchend' : 'click', function (e) {
            tournamentAction();
        });
    };

    var checkCashierTransferAmount = function checkCashierTransferAmount(n) {
        var condition = true;
        if (n) {
            if ($('#dep-amount').val() == "" || parseFloat($("#dep-amount").val()) == 0) {
                $('.invalid-cashier').text(invalidAmountLabel);
                condition = false;
            } else {
                var transferAmount = Number($("#dep-amount").val());
                if (transferAmount < Global.ChipTransfer.minBuyIn || isNaN(transferAmount)) {
                    condition = false;
                    $('.invalid-cashier').text(invalidAmountLabel);
                } else if (transferAmount > Global.ChipTransfer.maxBuyIn) {
                    var res = invalidMaxLabel.replace("~1", Global.ChipTransfer.maxBuyIn);
                    $('.invalid-cashier').text(res);
                    condition = false;
                } else {
                    condition = true;
                    $('.invalid-cashier').hide();
                }
            }
        } else {
            if ($('#wit-amount').val() == "" || parseFloat($("#wit-amount").val()) == 0) {
                $('.invalid-cashier').text(invalidAmountLabel);
                condition = false;
            } else {
                var _transferAmount = Number($("#wit-amount").val());
                if (_transferAmount < Global.ChipTransfer.minCashOut || isNaN(_transferAmount)) {
                    $('.invalid-cashier').text(invalidAmountLabel);
                    condition = false;
                } else if (_transferAmount > Global.ChipTransfer.maxCashOut) {
                    $('.invalid-cashier').text(invalidAmountLabel);
                    condition = false;
                } else {
                    condition = true;
                    $('.invalid-cashier').hide();
                }
            }
        }
        if (!condition) {
            $('.invalid-cashier').css("display", "block");
        };
        return condition;
    };

    var cashierTransferButtonClick = function cashierTransferButtonClick(n) {
        if (checkCashierTransferAmount(n)) {
            if (n) {
                doChiptransferBuyInCall(parseFloat($("#dep-amount").val()), _.closeCashierBox);
            } else {
                doChiptransferCashoutCall(parseFloat($("#wit-amount").val()), _.closeCashierBox);
            }
        } else {
            return false;
        }
    };

    var tournamentAction = function tournamentAction() {
        //torneo llamada
        var temporalValue = Global.ChipTransfer.rebuy;
        if ($('.first-set-tourn input')[0].checked == true) {
            temporalValue = Global.ChipTransfer.buyIn;
        }

        if (Number(Global.ChipTransfer.sbalance) >= Number(temporalValue)) {
            doChiptransferBuyInCall(parseFloat(temporalValue), _.closeCashierBox);
        } else {
            //no alcanza
            $('.tourn-errors').text(invalidAmountLabel);
            $('.tourn-errors').css('visibility', 'visible');
        }
    };

    var tournCounter = function tournCounter() {
        setTimeout(function () {
            if (Global.ChipTransfer.tcounter > 0) {
                $('.tourn-left span').text(Global.ChipTransfer.tcounter);
                $('.tourn-left').css('display', 'block');
            } else {
                if (configuration.automata) {
                    //quedo viendo cuando el juego termino y esta listo para el mensajilli
                    //stops autoplays to prevent errors
                    if (typeof mod_auto != 'undefined') {
                        if (typeof mod_auto.resetAuto != 'undefined') {
                            mod_auto.resetAuto();
                        }
                    }

                    //hago el watch para saber cuando termino
                    var triesBefore = 0;
                    var watcheador = setInterval(function () {
                        if (mod_slotsUI.getMachineState() == 'normal' && frees == 0) {
                            triesBefore++;
                        } else {
                            triesBefore = 0;
                        }

                        if (triesBefore == 4) {
                            _.openCashier();
                            clearInterval(watcheador);
                        }
                    }, 1000);
                }

                $('.tourn-left span').text(Global.ChipTransfer.tcounter);
                $('.tourn-left').css('display', 'block');
                Global.ChipTransfer.unwatchCash("tcounter");
            }
        }, 100);
    };

    var currenciesCashier = function currenciesCashier(data) {
        if (data != null) {
            var currency = decodeURIComponent(data);
            var currencyArray = currency.split(",");
            var returner = {};
            returner.letterCode = currencyArray[0];
            returner.prefix = currencyArray[1];
            returner.suffix = currencyArray[2];
            returner.decimalSeparator = currencyArray[3] == "c" ? "c" : "p"; // 'c' use comma, 'p' use point
            returner.thousandSeparator = parseInt(currencyArray[4]);
            returner.precision = parseInt(currencyArray[5]);

            return returner;
        }
    };

    var formatCurrencies = function formatCurrencies(obj, amount) {
        var formattedString = 0;
        amount = parseFloat(amount);
        if (obj.precision >= 0) {
            // amount = amount.toFixed(currencyObj.precision);
        } else {
            switch (obj.precision) {
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
        var separators = obj.decimalSeparator == "c" ? [".", ","] : [",", "."];
        if ((parseInt(amount) + "").length >= obj.thousandSeparator) {
            formattedString = accounting.formatNumber(formattedString, obj.precision, separators[0], separators[1]);
        } else {
            formattedString = parseFloat(formattedString.toString().replace(separators[0], separators[1])).toFixed(obj.precision);
        }

        return formattedString;
    };

    /*langs styles*/
    var stylesKey = function stylesKey() {
        for (var i = 0; i < arrayKeys.length; i++) {
            if (typeof LanguagesManager.getStylesByKey(arrayKeys[i]) != 'undefined') {
                $(arrayIds[i]).css(LanguagesManager.getStylesByKey(arrayKeys[i]));
            }
        }

        //style key for counter box
        $('.tourn-left').css(LanguagesManager.getStylesByKey(keysCountest[configuration.type]));
    };

    /**
     * Do a request, if success, init and show the window
     * @function openCashier
     */
    _.openCashier = function () {
        if(isMobile.any()){
            $(".dkCashier-box").addClass("dkCashier-box-mobile");
        }
        
        doChiptransferInitCall(function () {
            _.initCashier();
        });
    };

    _.initCashier = function () {
        var messageTourn = void 0;
        var errorTourn = void 0;
        var currencyLocal = currenciesCashier(Global.ChipTransfer.currency);
        clearInterval(masterWacher);

        $('.casino-balance span').text(currencyLocal.prefix + formatCurrencies(currencyLocal, Global.ChipTransfer.sbalance));
        $(".dkCashier-box").show();
        $(".cash-over").show();

        if (normalCash) {
            $('.cashier-normal-box').css('display', 'block');
            $('#dep-amount').val(Global.ChipTransfer.maxBuyIn);
        } else {
            $('.tournament-box').css('display', 'block');

            //set stuff for tournament
            var tempEntry = $(".entry-text").text();
            tempEntry = tempEntry.replace("~1", Global.ChipTransfer.positionRank);
            $(".entry-text").html(tempEntry);

            if (Global.ChipTransfer.positionRank != '' || Global.ChipTransfer.positionRank != 0) {
                $(".entry-text").css('visibility', 'visible');
            }

            if (isNaN(Global.ChipTransfer.buyIn) && isNaN(Global.ChipTransfer.rebuy)) {
                messageTourn = LanguagesManager.getTranslationByKey("ERR_TRNY_INVITE") + "\n\n" + LanguagesManager.getTranslationByKey("ERR_TRNY_REBUY_NONE");
            } else if (isNaN(Global.ChipTransfer.buyIn)) {
                messageTourn = LanguagesManager.getTranslationByKey("ERR_TRNY_INVITE");
            } else if (isNaN(Global.ChipTransfer.rebuy)) {
                messageTourn = LanguagesManager.getTranslationByKey("ERR_TRNY_REBUY_NONE");
            }

            if (Global.ChipTransfer.buyInMessage == '') {
                var tempBuyin = $(".tourn-label-buyin").text();
                tempBuyin = tempBuyin.replace("~1", currencyLocal.prefix + formatCurrencies(currencyLocal, Global.ChipTransfer.buyIn));
                $(".tourn-label-buyin").html(tempBuyin);
                $('.first-set-tourn').css('visibility', 'visible');

                if (Global.ChipTransfer.buyInEnabled == '0') {
                    $('.first-set-tourn input').attr("disabled", true);
                } else {
                    $('.first-set-tourn input').attr("disabled", false);
                    $('#buy-action-tourn').attr("disabled", false);
                    $('.first-set-tourn input')[0].checked = true;
                    $(".tourn-label-buyin").css('color','#000');
                }
            } else {
                messageTourn = LanguagesManager.getTranslationByKey(Global.ChipTransfer.buyInMessage);
            }

            if (Global.ChipTransfer.rebuyMessage == '') {
                var tempRebuy = $(".tourn-label-rebuy").text();
                tempRebuy = tempRebuy.replace("~1", currencyLocal.prefix + formatCurrencies(currencyLocal, Global.ChipTransfer.rebuy));
                $(".tourn-label-rebuy").html(tempRebuy);
                $('.second-set-tourn').css('visibility', 'visible');

                if (Global.ChipTransfer.rebuyEnabled == '0') {
                    $('.second-set-tourn input').attr("disabled", true);
                } else {
                    $('.second-set-tourn input').attr("disabled", false);
                    $('#buy-action-tourn').attr("disabled", false);
                    $('.second-set-tourn input')[0].checked = true;
                    $(".tourn-label-rebuy").css('color','#000');
                }
            } else {
                messageTourn = LanguagesManager.getTranslationByKey(Global.ChipTransfer.rebuyMessage);
            }

            if (messageTourn) {
                $(".tourn-messags").html(messageTourn);
                $('.tourn-messags').css('visibility', 'visible');
            }
        }
    };

    /**
     * Close window
     * @function closeCashierBox
     */
    _.closeCashierBox = function () {
        $('#dep-amount').val("");
        $('#wit-amount').val("");

        $('.dkCashier-box, .invalid-cashier, .cash-over, .cashier-normal-box, .tournament-box').css('display', 'none');
        $('.first-set-tourn, .second-set-tourn, .tourn-messags, .tourn-errors, .entry-text').css('visibility', 'hidden');

        $('.entry-text').text(entryPlayer);
        $('.tourn-label-buyin').text(buyTournLabel);
        $('.tourn-label-rebuy').text(reBuyTournLabel);

        $('.cashier-deposit').trigger(isMobile.any() ? 'touchend' : 'click');

        if (!normalCash) {
            Global.ChipTransfer.unwatchCash("tcounter");
            if (parseFloat(Global.ChipTransfer.tcounter) > 0) {
                tournCounter();
                Global.ChipTransfer.cashWatch("tcounter", function (id, oldval, newval) {
                    tournCounter();
                    return newval;
                });
            }

            if (Global.ChipTransfer.gameSession) {
                Global.Connector.gameSession = decodeURIComponent(Global.ChipTransfer.gameSession);
                Global.Connector.globalGameSession = decodeURIComponent(Global.ChipTransfer.gameSession);
                var GlobalGameSession = decodeURIComponent(Global.ChipTransfer.gameSession);
                if (typeof HeartbeatManager != 'undefined') {
                    HeartbeatManager.killHeartbeat();
                    HeartbeatManager.initHeartbeat(Global.Connector.gameSession, HeartbeatManager.updateGameFunct);
                }

                //rewrite history call with new session
                /*openGameHistory = function openGameHistory(url) {
                    if (typeof msGameAnalytics != 'undefined' && msGameAnalytics != null) {
                        msGameAnalytics.historyOpen();
                    }
                    var par = url + '?GameSession=' + Global.Connector.gameSession;
                    var open = window.open(par);
                };*/

                Global.ChipTransfer.gameSession = null;
            }
        }

        if (!isNaN(Global.ChipTransfer.gameBalance) && Global.ChipTransfer.gameBalance != null && Global.ChipTransfer.gameBalance != undefined) {
            callbackAfterBuyIn(Global.ChipTransfer.gameBalance);
        }
        Global.ChipTransfer.gameBalance = null;

        if (configuration.autoStart) {
            masterWacher = setInterval(function () {
                watcherOpener();
            }, 3000);
        }
    };

    /*for tournaments*/
    _.showCounterBox = function () {
        return $('.tourn-left').css('display', 'block');
    };

    _.hideCounterBox = function () {
        return $('.tourn-left').css('display', 'none');
    };
};

var cashierManager = new chipsManager();