var LoadingPage = {
	progressBarTheme: 'jquery-ui-like',
	LoadingText: "",
	StartText :"",
	ImagesToLoad: null,
	SoundsArray: null,
	AudioFileExte: '.mp3',

	initMultilanguageTags: function() {		
		this.LoadingText = LanguagesManager.getTranslationByKey("loadingAssets");
		this.StartText = LanguagesManager.getTranslationByKey("lbl_start");
	},

	CreateLoadingSection: function(MainElement){
		//append the theme if exist
		if (Theme != undefined && Theme != null) {
   		   $('body').append('<link rel="stylesheet" type="text/css" href="'+RootLevel+'HTML5/Common/styles/themes/' + Theme + '/' + Theme + '-theme.css">');
   		   $('body').addClass(Theme);
   		}
		var htmlLoading = '<div id="bg-loading" class="bg-loading"></div>'
			+'<div id="touch-to-start" class="touch-to-start">'
			+'<span id="touch-text" class="touch-text is-ml" ml-key="loadingAssets">'+ this.LoadingText +'</span>'
            +'<div id="progressBar" class="'+ this.progressBarTheme +'">'
            +'<div></div>'
            +'</div>'
            +'<div id="start-selector" class="">'
            +'   <span id="" class="initial-start is-ml" ml-key="lbl_start">'+this.StartText+'</span>'
            +'</div>'
			+'</div>'
			;
		$(MainElement).append( htmlLoading );
		$("#touch-to-start").show();
		$("#progressBar").hide();
		$("#touch-text").hide();
		$("#start-selector").show();
		this.SoundsLoadHandler();

		//--Hide the preloader--//
		$('.preloading-container').remove();
	},

	CreateLoadingSectionPlus: function(MainElement, gameElement){
		//append the theme if exist
		if (Theme != undefined && Theme != null) {
   		   $('body').append('<link rel="stylesheet" type="text/css" href="'+RootLevel+'HTML5/Common/styles/themes/' + Theme + '/' + Theme + '-theme.css">');
   		}

		var htmlLoading = '<div id="bg-loading-main" class="bg-loading"></div>';
		var htmlLoading2 = '<div id="bg-loading-game" class="bg-loading"></div>'
			+'<div id="touch-to-start" class="touch-to-start">'
			+'<span id="touch-text" class="touch-text is-ml" ml-key="loadingAssets">'+ this.LoadingText +'</span>'
            +'<div id="progressBar" class="'+ this.progressBarTheme +'">'
            +'<div></div>'
            +'</div>'
            +'<div id="start-selector" class="">'
            +'   <span id="" class="initial-start is-ml" ml-key="lbl_start">'+this.StartText+'</span>'
            +'</div>'
			+'</div>'
			;
		$(MainElement).append( htmlLoading );
		$(gameElement).append( htmlLoading2 );

		$("#touch-to-start").show();
		$("#progressBar").hide();
		$("#touch-text").hide();
		$("#start-selector").show();
		this.SoundsLoadHandler();

		//--Hide the preloader--//
		$('.preloading-container').remove();
	},

	SoundsLoadHandler:function(){
		touchElement1 = document.getElementById("start-selector");
		touchElement1.addEventListener("click", this.HandleStartTouchEvent, false);
	},

	HandleStartTouchEvent: function(event) {
		try{
			$("#start-selector").hide();
			$("#touch-text").show();
			$("#progressBar").show();	
			PreloadImages();
        	if(soundConfigArray != undefined && soundConfigArray != null && soundConfigArray.length > 0){
        		//alert("si hay sonidos");
		  	    SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
		  	    SoundManager.LoadSoundsInit("");
		  	    setTimeout(function(){
		  	    	ShowGamePage(1);
		  	    }, 3000);  	    
		  	}else{
            	ShowGamePage(0);
            } 
        }catch(err){
        	ShowGamePage(0);
        }
	}
} //End LoadingPage object


function PreloadImages(){
	if(Theme != null && Theme != undefined){
		ThemeImages = ThemeImages.replace(/_rootLEVEL_/g, RootLevel); //ThemeImages.replace("{1}", RootLevel);
		LoadingPage.ImagesToLoad = ThemeImages + "," + LoadingPage.ImagesToLoad;
	}
	var ImagesCompleted = 0;
	var NumImages = 0;
	if(LoadingPage.ImagesToLoad != null){
		var preloads = LoadingPage.ImagesToLoad.split(",");
		NumImages = preloads.length; 
		var tempImg = [];
		for (var x = 0; x < preloads.length; x++) {
			tempImg[x] = new Image();
			tempImg[x].src = preloads[x];
			tempImg[x].onload = function () {
			    ImagesCompleted= ImagesCompleted + 1;
			}
		}
		var interval = setInterval(function () {
		   	percent = NumImages / 100;
		   	loaded = ImagesCompleted / percent;
		   	$('#progressBar').find('div').css({ width: loaded + "%" }).html((""));
		   	if (loaded >= 99.999) {
		    	clearInterval(interval);
		   	}
		}, 1);
	}
}