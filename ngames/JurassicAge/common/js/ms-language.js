/**
 * Languages Manager Module.
 * Have the funtions required to load and manage the games translations.
 * How to use:
 *  - Load the Languages: call the funcion loadTranslations(callback). 
 *  - Get a translation: call the function getTranslationByKey(key).
 *  - Get a styles: call the function getStylesByKey(key).
 *  - Get a Svg styles: call the function getSVGStylesByKey(key).
 *  @example <caption>Load Languages.</caption>
 *  .ready(function () {
 *      //Before call the loadLanguages the game must define these Global vars.
 *      Global.Connector.rootLevel = '../../';          //Url to the Html root folder.
 *      Global.Connector.lang = 'de';                   //Language
 *      Global.Connector.gameCode = 'BAC';              //Game Code
 *      Global.Game.currentOrientation = 'landscape';   //current game orientation
 *      //Then call the loadLanguages, with the callback
 *      LanguagesManager.loadTranslations(LanguagesManager.afterLoadTranslations);
 *      //When the loadLanguages is complete the data is in the language Global vars
 *      Global.Language.translations[key] //tranlation key-value array.
 *      Global.Language.tweaksL[key] //array with the landscape tweaks (Styles update required)
 *      Global.Language.tweaksP[key] //array with the portrait tweaks (Styles update required)
 *      Global.Language.tweaksSVG[key] //svg tweaks (Styles update required) 
 *  });
 *  @example <caption>Get translation by key.</caption>
 *  .ready(){
 *      var spinText = LanguagesManager.getTranslationByKey('lnl_Spin');
 *      //It returns the 'Spin' language translation
 *  }
 *  @example <caption>Get styles by key.</caption>
 *  .ready(){
 *      var spinStyle = LanguagesManager.getStylesByKey('lnl_Spin');
 *      //It returns the required styles update for the 'Spin' control 
 *  }
 *  @example <caption>Get SVG styles by key.</caption>
 *  .ready(){
 *      var spinStyle = LanguagesManager.getSVGStylesByKey('lnl_Spin');
 *      //It returns the svg required styles update for the 'Spin' control 
 *  }
 *  @module  LanguagesManager
 */
var LanguagesManager = (function () {
    var my = {};

    my.translationsLoaded = false;
    my.controlsTranslated = false;

    /**
     * @description Get the translation of specific element
     * @function getTranslationByKey
     * @param {string} textKey attribute ml-key from DOM of a element
     * @returns {string} value with the translation
     */
    my.getTranslationByKey = function(textKey) {
        try {
            var value = '';
            if (Global.Language.translations.hasOwnProperty(textKey)) {
                value = Global.Language.translations[textKey];
            }
            return value; 
        } catch (err){
            txt = "There was an error on GetTranslationByKey.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
        }
    }

    /**
     * @description Get the styles of specific element
     * @function getStylesByKey
     * @param {string} key attribute ml-key from DOM of a element
     * @returns {object} css styles for the specific element. Example = {top:5px, left:10px}
     */
    my.getStylesByKey = function(key){
        try {
            var Tweaks = {};
            var _h = window.innerHeight;
            var _w = window.innerWidth;
            var styles = {};
            if (_h <= _w) { 
                Tweaks = Global.Language.tweaksL;
            }else{
                Tweaks = Global.Language.tweaksP;       
            }
            if (Tweaks.hasOwnProperty(key)) {
                styles = Tweaks[key];
                return(styles);
            }
            return styles;
        } catch (err){
            txt = "There was an error on getStylesByKey.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
        }
    }

    /**
     * @description Get the styles of specific SVG element
     * @function getSVGStylesByKey
     * @param {string} key attribute ml-key from SVG
     * @returns {object} styles for the specific element. Example = {x:100, y:20}
     */
    my.getSVGStylesByKey = function(key){
        try {
            var styles = {};
            if (Global.Language.tweaksSVG.hasOwnProperty(key)) {
                var styles = Global.Language.tweaksSVG[key];  
            }
            return styles;
        } catch (err){
            txt = "There was an error on getStylesByKey.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
        }
    }

    /**
     * @description Load the current language translations
     * @function loadTranslations
     * @param {function} callback1 function to be called after get language is complete
     * @param {function} callback2 function to be called for updating the game after get translations
     */
    my.loadTranslations = function(callback1, callback2){
        //try {
            if(!my.translationsLoaded){
                my.translationsLoaded = true;
                Global.Connector.rand = (Math.random() * 1000000);
                if(Global.Connector.gameCode.indexOf("SL5R") != -1){
                    Global.Language.gameType = "SL5R";
                } else {
                    Global.Language.gameType = "Tables";
                }
                ServerManager.doGetLanguageAction(callback1, callback2);
            } else{
                callback1(callback2);
            }
       /* } catch (err){
            txt = "There was an error on loadTranslations.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
        }*/
    }

    my.translateSVG = function(svgid){
        var translation = "";
        $(svgid + " .is-ml").each(function() {
            translation = my.getTranslationByKey($(this).attr("ml-key"));
            if (translation != "") {
                $(this).html(translation)
            }
        });
        $(svgid +" .wrap-svg-text").each(function() {
            var elemId = $(this).attr("id");
            var elemW = $(this).attr("width");
            var elemH = $(this).attr("height");
            var elemX = $(this).attr("x");
            var elemY = $(this).attr("y");
            var lblElemId = elemId.replace("rect-", "");
            //console.log("aplicando d3plus lblElemId = ", lblElemId , " elemW ", elemW, " elemH ", elemH);
            d3plus.textwrap().container("#" + lblElemId).resize(true).width(parseFloat(elemW)).height(parseFloat(elemH)).x(parseFloat(elemX)).y(parseFloat(elemY)).draw()
        });
    }

    /**
     * @description Translate all the GUI controls that have the class is-ml
     * @param {function} callback function to be called for updating the game after get translations
     */
    my.afterLoadTranslations = function(callback) {
        try {
          //  console.log(my.controlsTranslated)
            if(!my.controlsTranslated){
                my.controlsTranslated = true;
                my.translateControls(function(){
                    my.updateStylesByLanguage(function(){
                        if ( typeof callback == "function" ) {
                            callback();
                        }
                    });         
                });         
                

                if(typeof window.reactTranslateControls != "undefined"){
                    window.reactTranslateControls();
                }
            } else if ( typeof callback == "function" ) {
                callback();
            }
            
        }
        catch (err) {
            txt = "There was an error on LanguageManager(afterLoadTranslations).\n\n";
            txt += "Error description: " + err.Message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
            return null;
        }
    }

    /**
     * @description Translate all the GUI controls that have the class is-ml
     */
    my.translateControls = function(callback) {
        try {
            //console.log("*********************************************************************")
            var translation = '';
            $(".is-ml").each(function () {
                translation = my.getTranslationByKey($(this).attr("ml-key"));
                if(translation != ''){
                    $(this).text(translation);
                }
            });
            var that = this;
            $(".wrap-svg-text").each(function () {
                var elemId = $(this).attr('id');
                var elemW = $(this).attr('width');
                var elemH = $(this).attr('height');
                var elemX = $(this).attr('x');
                var elemY = $(this).attr('y');                
                var lblElemId = elemId.replace('rect-','');
                var keyT = $("#" + lblElemId).attr("ml-key");
                if(keyT == undefined){
                    keyT = $("#" + lblElemId + " tspan").attr("ml-key");
                }
                var translat = that.getTranslationByKey(keyT);
                //console.log("key " ,keyT , " translation ", translat, " id ", lblElemId);
                $("#" + lblElemId).text(translat);
                //console.log('element to wrap '+elemId+' '+lblElemId+' '+elemW+' '+elemH+' '+elemX+' '+elemY);
                d3plus.textwrap().container("#"+lblElemId).resize(true).width(parseFloat(elemW)).height(parseFloat(elemH)).x(parseFloat(elemX)).y(parseFloat(elemY)).draw();
                //d3plus.textwrap().container("#"+lblElemId).valign("middle").padding(0).resize(true).draw();
            });

            if ( typeof callback == "function" ) {
                callback();
            }
            
        }
        catch (err) {
            txt = "There was an error on LanguageManager(translateControls).\n\n";
            txt += "Error description: " + err + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
            return null;
        }
    }

    /**
     * @description Update all the GUI styles using the language tweaks
     */
    my.updateStylesByLanguage = function(callback){
        try{
            var keys = [];
            var tweaks;
            if(Global.Game.currentOrientation == 'portrait'){
                tweaks = Global.Language.tweaksP;
            } else {
                tweaks = Global.Language.tweaksL;
            }
            for (var key in tweaks) {
                if (tweaks.hasOwnProperty(key)) {
                    var styles = tweaks[key];
                    $(".is-ml[ml-key='" + key + "']").css(styles);
                }
            }
            for (var key in Global.Language.tweaksSVG) {
                if (Global.Language.tweaksSVG.hasOwnProperty(key)) {
                    var styles = Global.Language.tweaksSVG[key];
                    if(styles.x != undefined){
                        $(".is-ml[ml-key='" + key + "']").attr("x", styles.x);
                    }
                    if(styles.y != undefined){
                        $(".is-ml[ml-key='" + key + "']").attr("y", styles.y);
                    }
                }
            }

            if ( typeof callback == "function" ) {
                callback();
            }
        }
        catch (err) {
            txt = "There was an error on LanguageManager(Load Styles).\n\n";
            txt += "Error description: " + err.Message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);
            return null;
        }
    }

    return my;
})();


