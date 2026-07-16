//Version 1.43
//
//Changelog ---- >
//
//V. 1.43 added callback on end for play sound funcion on no loop mode
//
//
var SoundManager = (function () {
    var my = {};

    //Sounds Config
    var _soundsInfoArray = new Object();
    var _soundJSOptionalExt = null;
    var currentVolume = 0.9;
    var temporalVolume = 0.9;
    //_soundsInfoArray[0] = "sound-id, sound-source"

    //load the sounds config
    my.LoadSoundConfig = function(_soundsArray, _optionalExt){
        _soundsInfoArray = _soundsArray;
        _soundJSOptionalExt = _optionalExt;

        if(!UseSoundJS()){//create the audio tags
            //console.log('ms-audio-manage !UseSoundJS');
            //create the audio tag elements
            div = document.createElement("div");
            div.id = "audio-div"
            document.body.appendChild(div);

            var audioTagStr = " ";

            for(var i = 0; i < _soundsInfoArray.length; i++){
                var _soundConfi = _soundsInfoArray[i];
                var _splitValue = _soundConfi.split(',');
                var _audioId = _splitValue[0];
                var _audioSrc = _splitValue[1];

                audioTagStr += '<audio id="'+_audioId+'">';
                audioTagStr += '<source src="'+_audioSrc+'">';
                audioTagStr += '</audio>  ';
            }

            document.getElementById("audio-div").innerHTML=audioTagStr;
        }
        else{
            //console.log('ms-audio-manage UseSoundJS');
        }
    }

    /*
    Load the sounds init
    */
    my.LoadSoundsInit = function (_functionName, callback) {
        try {
            var fn    = _functionName;
            var useFn = true;
            if ( typeof callback == "function" ) {
                fn    = callback;
                useFn = false;
            }
            //IOS using  SoundJS
            if(UseSoundJS()){
                manifest = new Array();
                for(var i = 0; i < _soundsInfoArray.length; i++){
                    var _soundConfi = _soundsInfoArray[i];
                    var _splitValue = _soundConfi.split(',');

                    manifest[i] = {id:_splitValue[0], src:_splitValue[1]};
                }
                createjs.Sound.alternateExtensions = [_soundJSOptionalExt];
                var preload = new createjs.LoadQueue();
                var _soundLoaded = 0;
                preload.installPlugin(createjs.Sound);

                if(isApp || useWebService ){
                    preload.installPlugin(createjs.CordovaAudioPlugin);
                }
                if ( useFn ) {
                    preload.addEventListener("complete", function(){ eval(_functionName);});
                } else {
                    preload.addEventListener("complete", function(){ callback(); });
                }

                preload.addEventListener("fileload", function() {
                    _soundLoaded++;
                });
                preload.loadManifest(manifest);

            }else{ //Othres HTML5 audio Tag
                //load the sounds
                for(var i = 0; i < _soundsInfoArray.length; i++){
                    var _soundConfi = _soundsInfoArray[i];
                    var _splitValue = _soundConfi.split(',');
                    var _audioId = _splitValue[0];
                    document.getElementById(_audioId).load();
                }
                if ( useFn ) {
                    eval(_functionName);
                } else {
                    callback();
                }

            }
        }
        catch (err) {
            /*txt = "There was an error on this function LoadSoundsInit.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);*/
            return null;
        }
    }
    /*
    Play The audio base on the soundId
    returns the SoundInstance for SoundJS
    */
    my.PlayAudio = function (_soundId, _isLoop, callback) {
        try {
            var soundInstance = null;
            if ( typeof PlaySounds != "undefined" ) {
                if ( PlaySounds ) {
                    if(UseSoundJS()){
                        if(_isLoop){
                            soundInstance = createjs.Sound.play(_soundId, {interrupt:createjs.Sound.INTERRUPT_NONE, loop:-1, volume:0.9});
                        }else{
                            soundInstance = createjs.Sound.play(_soundId, createjs.Sound.INTERUPT_LATE);
                            if ( typeof callback != 'undefined' ) {
                                soundInstance.on("complete", callback , this);
                            }
                        }
                    }else{
                        if(this.IsAndroidDefualtBrowser()){
                            $('audio').each(function() {
                                this.pause();
                            });
                        }

                        if(_isLoop){
                            $("#"+_soundId).attr('loop','loop');
                        }

                        if(document.getElementById(_soundId) != undefined && document.getElementById(_soundId) != null){
                            if ( typeof callback != 'undefined' ) {
                                document.getElementById(_soundId).onended=function(){ callback() };
                            }
                            document.getElementById(_soundId).play();
                        }
                    }
                }
            } else {
                if(UseSoundJS()){
                    if(_isLoop){
                        soundInstance = createjs.Sound.play(_soundId, {interrupt:createjs.Sound.INTERRUPT_NONE, loop:-1, volume:0.9});
                    }else{
                        soundInstance = createjs.Sound.play(_soundId, createjs.Sound.INTERUPT_LATE);
                    }
                }else{
                    if(this.IsAndroidDefualtBrowser()){
                        $('audio').each(function() {
                            this.pause();
                        });
                    }

                    if(_isLoop){
                        $("#"+_soundId).attr('loop','loop');
                    }

                    if(document.getElementById(_soundId) != undefined && document.getElementById(_soundId) != null){
                        document.getElementById(_soundId).play();
                    }
                }
            }
            return soundInstance;
        }
        catch (err) {
            /*txt = "There was an error on this function PlayAudio.\n\n";
            txt += "Error description: " + err.message + "\n\n";
            txt += "Click OK to continue.\n\n";
            alert(txt);*/
            return null;
        }
    }
    /*
    Stop The audio base on the InstanceSound for SoundJS
    and the SoundId for HTML5 Audio tag
    */
    my.StopAudio = function (_soundId, _instanceName) {
        try {
            if(UseSoundJS()){
                if(_instanceName != null){
                    _instanceName.stop();
                    _instanceName = null;
                }
            }else{
                if(document.getElementById(_soundId) != undefined && document.getElementById(_soundId) != null){
                    document.getElementById(_soundId).pause();
                    document.getElementById(_soundId).currentTime = 0;
                }
            }
        }
        catch (err) {
            console.log("ms-audio-manage StopAudio error = "+ err.message);
            return null;
        }
    }

    my.PauseAllAudio = function(mute){
        if(UseSoundJS()){
            createjs.Sound.stop();
        } else {
            if(mute){
                $('audio').each(function() {
                    this.pause();
                });
            }
        }
    }
    /*
    * Stop all the sounds
    */
    my.StopAllAudio = function(){
        if(UseSoundJS()){
            createjs.Sound.stop();
        }else{
            try{
                $('audio').each(function() {
                    this.pause();
                    this.currentTime = 0;
                });
            }
            catch(err){}
        }
    }

    //--Set the sound volume--//
    my.SetAllVolume = function(vol){

        temporalVolume = currentVolume;
        currentVolume = vol;
        //console.log("set volume audioManage " + vol);
        if(UseSoundJS()){
            createjs.Sound.setVolume(vol);
        }else{
            try{
                $('audio').each(function() {
                    this.volume = vol;
                });
            }
            catch(err){}
        }
    }

    //--Recover the sound volume--//
    my.RecoverAllVolume = function(){
        var vol = temporalVolume;
        my.SetAllVolume(vol);
    }

    my.GetVolume = function(){
        return currentVolume;
    }

    /*
    Detect the navite Android browser
    */
    my.IsAndroidDefualtBrowser=function(){
        if(!isMobile.Android()){
            return false;
        }
        var nua = navigator.userAgent;
        var is_android = ((nua.indexOf('Mozilla/5.0') > -1 && nua.indexOf('Android ') > -1 && nua.indexOf('AppleWebKit') > -1) && !(nua.indexOf('Chrome') > -1));
        return is_android;
    }

    /*
    function to check if use SoundJS or Audio HTML5 Tag
    */
    function UseSoundJS(){
        if(isMobile.iOS()){
            return true;
        }else{

            if(($.browser.mozilla || (navigator.userAgent.indexOf('Chrome') > -1)) && isMobile.Android() && (!isApp || !useWebService) ) {
                return true;
            }
            if(navigator.userAgent.toLowerCase().indexOf('safari') > -1){
                return true;
            }
            return false;
        }
    }
    return my;
})();
