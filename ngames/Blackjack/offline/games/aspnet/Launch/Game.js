/* 20140901 Customer History Use Old or New Log */

var IosBarTimeout = null;

function Url(url) {
    this.IsSecure = false;
    this.Domain = null;
    this.Host = null;
    this.FullHost = null;
    this.Path = null;
    this.PathAndQuery = null;
    this.Query = null;
    this.Url = url;

    if (url == null || url.length < 5) return;

    if (url.substring(0, 5).toLowerCase() == "https") this.IsSecure = true;
    if (url.indexOf('://') > -1) url = url.substring(url.indexOf('://') + 3);
    else if (url.indexOf('//') > -1) url = url.substring(url.indexOf('//') + 2);
    if (url.indexOf('/') > -1) {
        this.FullHost = url.substring(0, url.indexOf('/')).toLowerCase();
        this.PathAndQuery = url.substring(url.indexOf('/'));
    }
    else if (url.indexOf('?') > -1) {
        this.FullHost = url.substring(0, url.indexOf('?')).toLowerCase();
        this.PathAndQuery = url.substring(url.indexOf('?'));
    }
    else if (url.indexOf('#') > -1) {
        this.FullHost = url.substring(0, url.indexOf('#')).toLowerCase();
        this.PathAndQuery = url.substring(url.indexOf('#'));
    }
    else {
        this.FullHost = url.toLowerCase();
        this.PathAndQuery = '/';
    }
    if (this.FullHost.indexOf(':') > -1) this.FullHost = this.FullHost.split(':')[0];
    var parts = this.FullHost.split('.');
    if (parts[parts.length - 1].length == 2 && (parts.length > 3 || parts.length > 2 && parts[0] != "www") && (parts[parts.length - 2].length == 2 || parts[parts.length - 2].length == 3)) {
        if (parts.length > 3) { this.Host = parts[0]; parts.splice(0, 1); }
        else this.Host = null;
        if (parts.length > 3) parts.splice(0, parts.length - 3);

    }
    else if (parts.length > 2) { this.Host = parts[0]; parts.splice(0, 1); if (parts.length > 2) parts.splice(0, parts.length - 2); }
    else this.Host = null;
    this.Domain = parts.join('.');

    if (this.PathAndQuery.indexOf('?') > -1 && (this.PathAndQuery.indexOf('#') == -1 || (this.PathAndQuery.indexOf('#') > this.PathAndQuery.indexOf('?')))) {
        this.Query = this.PathAndQuery.substring(this.PathAndQuery.indexOf('?'));
        this.Path = this.PathAndQuery.substring(0, this.PathAndQuery.indexOf('?'));
    }
    else if (this.PathAndQuery.indexOf('#') > -1) {
        this.Query = this.PathAndQuery.substring(this.PathAndQuery.indexOf('#'));
        this.Path = this.PathAndQuery.substring(0, this.PathAndQuery.indexOf('#'));
    }
    else this.Path = this.PathAndQuery;
};

// this will allow scripts to work across ports and subdomains
try {
    document.domain = new Url(document.location.href).Domain;
} catch (e) { }

// OpenHelpWindow no longer takes any parameters
function OpenHelpWindow() {
    document.forms[0].action = '../aspnet/Launch/Help.aspx';
    document.forms[0].target = 'CasinoSolutionsHelpWindow';
    var helpfile = document.forms[0].HelpFile.value;
    if (helpfile != null && helpfile.length > 0) {
        var targeturl = (helpfile.indexOf(".swf") > 0) ? "" : helpfile;
        if (targeturl.length > 0) {
            if (targeturl.substring(0, 4) != "http" && targeturl.substring(0, 1) != "/" && targeturl.substring(0, 1) != "\\")
                targeturl = document.forms[0].BaseUrl.value + "aspNET/Help/" + targeturl;
        }
        var helpwin = window.open(targeturl, "CasinoSolutionsHelpWindow", "menubar=0,status=0,toolbar=0,titlebar=0,scrollbars=1")
        if (helpwin != null) {
            try {
                if (targeturl.length == 0) {
                    helpwin.moveTo(0, 0);
                    helpwin.resizeTo(screen.width, screen.height);
                }
                else {
                    helpwin.moveTo((screen.width - 850) / 2, (screen.height - 650) / 2);
                    helpwin.resizeTo(850, 650);
                }
            }
            catch (e) { }
            if (targeturl.length == 0) document.forms[0].submit();
            helpwin.focus();
        }
        else alert('You need to disable any popup blocking software.');
    }
    else alert('No help file is available for this game');
}

function OpenHistoryWindow(targetsession) {
    var histwin = null;

    if (UseNewHistoryLog == "0") {
        histwin = window.open(document.forms[0].BaseUrl.value + "aspNET/History/index.aspx?SessionId=" + targetsession, "casinosolutionshistorywindow", "menubar=0,status=0,toolbar=0,titlebar=0,scrollbars=1,width=640,height=400");
    }
    else {
        histwin = window.open(document.forms[0].BaseUrl.value + "aspNET/History/CustomerHistoryLog.aspx?GameSession=" + targetsession, "casinosolutionshistorywindow", "menubar=0,status=0,toolbar=0,titlebar=0,scrollbars=1");
    }

    if (histwin != null) {
        histwin.focus();
    }
    else alert('You need to disable any popup blocking software.');
}

function OpenQuickDepositWindow() {
    //
}

function RefreshLobby() {
    try {
        if (window.opener != null && window.opener.RefreshLobby != null) {
            window.opener.RefreshLobby();
        }
    }
    catch (e) { }
}

function CallExitGame() {
    try {
        if (window.parent != null && window.parent.ExitCasinoGame != null) {
            window.parent.ExitCasinoGame();
            return true;
        }
    }
    catch (e) {

    }
    return false;
}

function CloseGameWindow() {
    if (window.parent != null && window.parent.postMessage != null) window.parent.postMessage('close', '*');
    try {
        window.setTimeout(function () {
            try {
                if (top.window) {
                    top.window.open('', '_self', '');
                    top.window.close();
                } else {
                    window.open('', '_self', '');
                    window.close();
                }
            } catch (e) { }

        }, 200);
    }
    catch (e) { }
}

var flashvars = null;
function GetFlashVars(expireOnly, sLang) {
    if (flashvars == null) flashvars = document.forms[0].FlashVars.value;
    if (sLang != null) {
        var i = flashvars.indexOf('lang=');
        if (i > 0) flashvars = flashvars.substring(0, i + 5) + sLang + flashvars.substring(i + 7);
        //console.log(flashvars);
        document.forms[0].FlashVars.value = flashvars;
    }
    if (expireOnly != null && expireOnly == true) {
        if (flashvars.indexOf('showcashier=') > 0) flashvars = flashvars.replace('showcashier=1', 'showcashier=0');
        else flashvars += '&showcashier=0';
        //console.log(flashvars);
    }
    return flashvars;
}

function SwitchLanguage(sLang) {
    // console.log('Switching language to: ' + sLang);
    GetFlashVars(null, sLang);
    DestroyGame();
    //LaunchGame();

    //document.forms[0]['Lang'].value = sLang;
    document.forms[1]['Lang'].value = sLang;
    LaunchGamePost();
}

function ShowLobby() {
    ExitGame('flashlobby');
    // SwitchGame(null, 'LOBBY');
}

function SwitchGame(nCasinoGameId, sGameCode, nAccountId, sLang) {
    if (nCasinoGameId == null) { if (sGameCode != null) nCasinoGameId = 0; else return; }

    DestroyGame();
    CallCashOutAjax('from=game&event=switch&' + GetFlashVars(true));  // expires session without cashout

    //document.forms[0]['GameCode'].value = sGameCode;
    //document.forms[0]['CasinoGameId'].value = nCasinoGameId;
    document.forms[1]['GameCode'].value = sGameCode;
    document.forms[1]['CasinoGameId'].value = nCasinoGameId;
    if (nAccountId != null) { /*document.forms[0]['AccountId'].value = nAccountId;*/document.forms[1]['AccountId'].value = nAccountId; }
    if (sLang != null) { /*document.forms[0]['Lang'].value = sLang;*/document.forms[1]['Lang'].value = sLang; }

    LaunchGamePost();

    // tdb: if we want to do this without a server-side redirect:
    // make an ajax call to Enter.aspx,
    // GetFlashVars(....) // tdb: replace gamesession data in flashvars
    // LaunchGame();
}

function DestroyGame() {
    try {
        $('embed').remove(); $('object').remove();
    } catch (e) { }
}

function ShowLobby() {
    ExitGame('lobbybtn');
    // SwitchGame(null, 'LOBBY');
}

function ExitGame(sEvent) {
    //console.log('ExitGame: ' + sEvent);
    //SwitchGame(null, 'PKLIR', null, 'es'); return; // hard-coded test, relaunch game in spanish when flash Exit button is pressed

    // do this first [20141016 Launch GameJs IE9 Issue]
    if (window.ActiveXObject && sEvent == "beforeunload") return; // IE has bizzare onbeforeunload behavior

    DestroyGame();
    if (CashoutCalled) return;
    if (sEvent != "unload" && sEvent != "beforeunload") sEvent = "flashbtn";
    CallCashOutAjax('from=game&event=' + sEvent + '&' + GetFlashVars());
    if (document.forms[0].RefreshLobby.value == "True") RefreshLobby();
    if (CallExitGame() == false && sEvent == "flashbtn") CloseGameWindow();
}

function ExitGameX(sEvent) {
    //console.log('ExitGameX: ' + sEvent);
    DestroyGame();
    if (CashoutCalled) return;
    if (sEvent != "unload" && sEvent != "beforeunload") sEvent = "unknown";

    var bRefresh = (document.forms[0].RefreshLobby.value == "True");

    CallCashOutAjax('from=game&event=' + sEvent + '&' + GetFlashVars());
    try {

        if (CashoutCalled == false && window.opener != null && window.opener.CallCashOut != null) {
            window.opener.CallCashOut('from=opener&event=' + sEvent + '&' + GetFlashVars());
            CashoutCalled = true;
            bRefresh = false;
        }
    }
    catch (e) { }
    try {
        if (CashoutCalled == false && window.parent != null && window.parent.CallCashOut != null) {
            window.parent.CallCashOut('from=parent&event=' + sEvent + '&' + GetFlashVars());
            CashoutCalled = true;
        }
    }
    catch (e) { }
    if (bRefresh) RefreshLobby();
}

var CashoutCalled = false;
function CallCashOutAjax(queryString) {
    try {
        var request;
        if (!window.ActiveXObject)
            request = new XMLHttpRequest();
        else if (navigator.userAgent.toLowerCase().indexOf('msie 5') == -1)
            request = new ActiveXObject("Msxml2.XMLHTTP");
        else
            request = new ActiveXObject("Microsoft.XMLHTTP");

        var url = location.pathname.toString().toLowerCase();
        url = url.substring(0, url.indexOf("/aspnet/") + 8) + "chiptransfer/cashout.aspx?" + queryString;

        try {
            request.open("GET", url, false);
            request.send(null);

            if (request.status == 200) {
                CashoutCalled = true;
            }
            else {
                CashoutCalled = false;
            }
        }
        catch (err) {
            CashoutCalled = false;
        }

    }
    catch (e) { }
}

var ScaleChanged = false;

function resizeIframe() {
    if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
        var viewportmeta = document.querySelector('meta[name="viewport"]');
        if (viewportmeta) {
            viewportmeta.content = 'width=device-width, minimum-scale=0.9, maximum-scale=0.9, initial-scale=0.9, minimal-ui';
            document.body.addEventListener('gesturestart', function () {
                viewportmeta.content = 'width=device-width, minimum-scale=0.9, maximum-scale=0.9, initial-scale=0.9, minimal-ui, user-scalable=0 ';
            }, false);
        }
    }

    if (window.innerHeight > 350) {
        $(".ios-bars-hand").hide();
    }

    if (ShowHandMessage()) {
        // alert('Resize Landscape IOS '+window.innerHeight);
        var scaleH = 1;
        var scaleW = 1;

        if (window.innerHeight == 411) { //6+ Without tabs
            $("#HTML5IFrame").css('height', window.innerHeight + 'px')
	        .css('top', '0')
	        .css('position', 'relative');
        }
        else if (window.innerHeight == 460) { //6+ With tabs
            $("#HTML5IFrame").css('height', window.innerHeight - 80 + 'px')
	        .css('top', '80px')
	        .css('position', 'relative');
        } else {
            $("#HTML5IFrame")
			.css("transform-origin", "0px 0px")
			.css("-ms-transform-origin", "0px 0px")
			.css("-webkit-transform-origin", "0px 0px")
			.css("transform", "scale(" + scaleW + "," + scaleH + ")")
			.css("-webkit-transform", "scale(" + scaleW + "," + scaleH + ")")
			.css("-ms-transform", "scale(" + scaleW + "," + scaleH + ")")
			.css("left", "0")
			.css("top", "0")
			.css("height", "100%");
        }
    }


    $('#HTML5Frame').css('height', '100%');
    $('#HTML5Frame').css('width', '100%');


}

function LaunchGamePost() {
    //console.log(document.forms[1].outerHTML);
    document.forms[1].submit();
}
function LaunchGame() {
    //console.log('Launching game...');

    // tdb: only supports flash games, add support for Silverlight and HTML5
    var outputElement = document.getElementById('FlashGame');
    if (outputElement == null) { console.log('FlashGame element not found'); return; }

    outputElement.innerHTML = AC_FL_GetContent(
	'codebase', '//download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=<%=VersionForCodeBase%>',
	'width', '100%',
	'height', '100%',
	'src', document.forms[0].FlashFileNoExt.value,
	'quality', 'high',
	'pluginspage', '//www.macromedia.com/go/getflashplayer',
	'align', 'middle',
	'play', 'true',
	'loop', 'false',
	'scale', 'showall',
	'wmode', 'window',
	'devicefont', 'false',
	'id', 'FlashMovie',
	'bgcolor', '#000000',
	'name', 'FlashMovie',
	'menu', 'false',
	'allowScriptAccess', 'always',
	'allowFullScreen', 'true',
	'movie', document.forms[0].FlashFileNoExt.value,
	'salign', '',
	'flashvars', document.forms[0].FlashVars.value
	);

    try { document.getElementById('FlashMovie').focus(); } catch (e) { }
}

var DevicePosition = "";
$(window).resize(function () {

    // alert('Resize Event');
    var _h = window.innerHeight; //$(window).height();
    var _w = window.innerWidth; //$(window).width();

    if (_h <= _w) { //landscape
        DevicePosition = "L";
    } else {
        DevicePosition = "P";
    }

    if (isMobile.any()) {

        resizeIframe();
        try {
            window.scrollTo(0, 0);
        } catch (e) { }
    }

    $('#FlashGame').css('height', '100%');
    $('#FlashGame').css('width', '100%');

    $('#HTML5Frame').css('height', '100%');
    $('#HTML5Frame').css('width', '100%');

});

$(document).ready(function () {

    if (isMobile.any()) {
        
        /*$('body').css('position', 'absolute');
        $('body').css('height', '100%');
        $('body').css('width', '100%');*/
        resizeIframe();

        var _h = window.innerHeight;
        var _w = window.innerWidth;
        if (_h <= _w) { //landscape
            if (ShowHandMessage()) {
                // alert('Ready Landscape IOS '+window.innerHeight);
                if (window.innerHeight != 460) { //any iphone except iphone 6+
                    $(".ios-bars-hand").show();
                    clearTimeout(IosBarTimeout);
                    IosBarTimeout = null;
                    IosBarTimeout = setTimeout(function () {
                        $(".ios-bars-hand").hide();
                    }, 5000)
                }
                else if (window.innerHeight == 460) { //only iphone 6+
                    $("#HTML5IFrame").css('height', window.innerHeight - 80 + 'px')
	        	.css('top', '1px')
	        	.css('position', 'relative');
                }
            }
        }

        var flashFileVar = document.getElementsByName('FlashFile');
        var extraFlag = false;

        if (typeof (flashFileVar) != "undefined"
	        && flashFileVar != null
	        && typeof (flashFileVar[0]) != "undefined"
	        && flashFileVar[0] != null
	        && typeof (flashFileVar[0].value) != "undefined"
	        && flashFileVar[0].value != null
	        && flashFileVar[0].value.toUpperCase().indexOf(".SWF") < 0
	        ) 
        {
            extraFlag = true;
        }

        if (isMobile.Android() && extraFlag) {
            FullScreenManager.createBtnFullScreen("../aspnet/Launch/", "#HTML5Frame");
            FullScreenManager.configFullScreenModeAndroid('HTML5Frame');
        }

    }
});


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


function hideAddressBar() {
    if (!window.location.hash) {

        setTimeout(function () { window.scrollTo(0, 0); }, 50);
    }
}

if (isMobile.any()) {

    if (isMobile.Android()) {
        $('head').append('<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />');

        window.addEventListener("load", function () { if (!window.pageYOffset) { hideAddressBar(); } });
        window.addEventListener("orientationchange", hideAddressBar);

    }
    if (isMobile.iOS()) {
        $('head').append('<meta name="viewport" content="width=device-width, minimum-scale=0.9, maximum-scale=0.9, initial-scale=0.9, minimal-ui" />');

        window.addEventListener('scroll', function (ev) {
            if (ShowHandMessage()) {
                // alert('Scroll Landscape IOS '+window.innerHeight);
                if (DevicePosition == "L" && !$(".ios-bars-hand").is(":visible") && window.innerHeight < 350) {
                    var scaleH = 0.72;
                    var scaleW = 0.72;

                    var wInnerWidth = window.innerWidth
                    var left = (window.innerWidth - (wInnerWidth * 0.72)) / 2;
                    $("#HTML5IFrame")
				.css("transform-origin", "0px 0px")
				.css("-ms-transform-origin", "0px 0px")
				.css("-webkit-transform-origin", "0px 0px")
				.css("transform", "scale(" + scaleW + "," + scaleH + ")")
				.css("-webkit-transform", "scale(" + scaleW + "," + scaleH + ")")
				.css("-ms-transform", "scale(" + scaleW + "," + scaleH + ")")
				.css("left", left)
				.css("top", "0")
				.css("position", "relative")

                    setTimeout(function () {
                        if (window.innerHeight < 350) {
                            $(".ios-bars-hand").show();
                            clearTimeout(IosBarTimeout);
                            IosBarTimeout = null;
                            IosBarTimeout = setTimeout(function () {
                                $(".ios-bars-hand").hide();
                            }, 5000)
                        }
                    }, 500)


                }

                if ($(".ios-bars-hand").is(":visible") && window.innerHeight == 460) { //iphone 6+ hide bars
                    $(".ios-bars-hand").hide();
                } else if (window.innerHeight == 411) { //iphone 6+
                    $("#HTML5IFrame").css('height', 460 - 47 + 'px')
	        		.css('top', '0')
	        		.css('position', 'relative');
                    // alert('Scroll IOS '+window.innerHeight);
                } else if (window.innerHeight == 375 || window.innerHeight == 460) { //iphone 6+
                    $("#HTML5IFrame").css('height', 460 - 80 + 'px')
	        		.css('top', '80px')
	        		.css('position', 'relative');
                }
            }
        });
    }
}

function FullScreen() {
    try { window.focus(); } catch (e) { }
    try { window.resizeTo(screen.availWidth, screen.availHeight); } catch (e) {
        try { window.resizeTo(screen.width, screen.height); } catch (e) { }
    }
    try { window.moveTo(1, 1); } catch (e) { }
}

function getPlatform() {
    if (bowser.mobile && bowser.ios) return 'iPhone';
    else if (bowser.tablet && bowser.ios) return 'iPad';
    else if (bowser.android) return 'Android';
    else if (bowser.windowsphone) return 'WinPhone';
    else if (bowser.mobile) return 'mobile';
    else if (bowser.tablet) return 'tablet';
    else if (bowser.windows) return 'Windows';
    else if (bowser.mac) return 'Mac';
    else if (bowser.linux) return 'Linux';
    else return 'desktop';
}

function getHTML5Version() {
    try {
        if (document.createElement('canvas').getContext != undefined) return 1;
    } catch (e) { console.log(e.message) }
    return 0;
}

var _flashVer = null;
function getFlashVer() {
    if (_flashVer != null) return _flashVer;
    try {
        _flashVer = GetSwfVer();
    } catch (e) { console.log(e.message) }
    return _flashVer;
}

function getEnterVars() {
    var width = screen.width;
    var height = screen.height;
    // use portriat orientation dimensions
    if (screen.width < screen.height) {
        width = screen.height;
        height = screen.width;
    }
    var enterVars = "height=" + height;
    enterVars += "&width=" + width;
    enterVars += "&color=" + screen.colorDepth;
    enterVars += "&browser=" + bowser.name;
    enterVars += "&version=" + bowser.version;
    enterVars += "&platform=" + getPlatform();
    enterVars += "&ismobile=" + (bowser.mobile === true ? 1 : 0);
    enterVars += "&istablet=" + (bowser.tablet === true ? 1 : 0);
    enterVars += "&HTML5Ver=" + getHTML5Version();
    enterVars += "&FlashVer=" + getFlashVer();
    return enterVars;
}

function preLaunch() {
    document.forms[0].SwfVerStr.value = getFlashVer();
    document.forms[0].EnterVars.value = getEnterVars();
    document.forms[0].BaseUrl.value = document.location.href.substring(0, document.location.href.toLowerCase().indexOf('/aspnet') + 1);
    document.forms[0].submit();
}


function GetIOSFullVersion() {
    if (/iP(hone|od|ad)/.test(navigator.platform)) {
        var v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
        return [parseInt(v[1], 10), parseInt(v[2], 10), parseInt(v[3] || 0, 10)];
    }
}

function GetIOSMajorVersion() {

    var versionFull = GetIOSFullVersion();
    return versionFull[0];
}

function ShowHandMessage() {
    try {
        var iphone4 = (window.screen.height == (960 / 2));
        var iphone5 = (window.screen.height == (1136 / 2));

        if ((iphone4 || iphone5) && GetIOSMajorVersion() >= 6)
            return true;
        else
            return false;
    } catch (err) {

        return false;
    }

}
