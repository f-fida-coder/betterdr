/*
Engine description:
  					MAX 25 lines Machine
  					Animated Icons
  					FreeSpins (with animated icon or default animation)
  					Scatter Pay (Pay in coins)
*/


var isInFreeSpins = 0;
var acumulateTotalWin = 0;
var freeSpinCounter = 0;
var maxLines = 0;
var currentLinesBet = maxLines;
var processData  = "";
var baseTimeout = 0;

var timerR1 =  null;
var timerR2 =  null;
var timerR3 =  null;
var timerR4 =  null;
var timerR5 =  null;
var timerR6 =  null;

var isLoading = true;
var loadSoundFlag = true;
var animateWinInterval= null;
var linesInterVal = null;
var autoShowCashierInterval = null;
var showLinesAfertIncrease = null;
var borderAnimationsInterval = null;

var iconsAnimationsInterval = new Array();

var anticipationFlag = false;
var anticipationIcons = "W,X";
var anticipationTime = 2000;

var readyToPlayBGSound = false;


var animationLinesTimeOri = null;
var timeToSpecialHitsOri  = null;
var timeToPrcessFreeSpinsOri  = null;
var timeToAutoPopupCashierOri  = null;

var hitsIterationTime = 100;
var timeToSpecialHitsCopy = 100; 
var timeIncrement = 40; 
var tickDelay = 20;
var opacityReelTime = 300;

var flagHitsEval = false;

var fastPlay = false;
var stopFlag = false;

var slotMachine = {
	// Set the proper height for the reels in the CSS file, rule: #slotMachineContainer #ReelContainer .reel
	// Also set the top property to the initial position you want to show
	alignmentOffset: 0, // Play around with this until reels are properly aligned post-spin

	firstReelStopTime: 367,
	secondReelStopTime: 275, // since first reel's stop time, not since animation beginning
	thirdReelStopTime: 268, // since second reel's stop time, not since animation beginning
	payoutStopTime: 100, // since last reel's stop time, not since animation beginning
	iconSize:180,

	reelSpeedDifference: 0, // speed difference between the 3 reels
	reelSpeed1Delta: 100, // "Fast speed" 
	reelSpeed1Time: 0, // How long does fast speed lasts.
	reelSpeed2Delta: 100, // Slow speed

	positioningTime: 200,	bounceHeight: 200,
	bounceTime: 1000,

	curBet: 0,
	soundEnabled: true,
	sounds: {},
	coinValues: {},
	coinValuesD: {},
	spinning: false,
	credits: 0,
	payoutsArr: {},
 
	init: function() {

		animationLinesTimeOri = animationLinesTime;
		timeToSpecialHitsOri  = timeToSpecialHits;
		timeToPrcessFreeSpinsOri  = timeToPrcessFreeSpins;
		timeToAutoPopupCashierOri  = timeToAutoPopupCashier;

		maxLines = Global.Connector.maxlb;

		if(typeof(Global.Connector.lb) == "undefined" || Global.Connector.lb == null || Global.Connector.lb == ""){			
			Global.Connector.lb = maxLines;
		}

		if(typeof(Global.Connector.lc) == "undefined" || Global.Connector.lc == null || Global.Connector.lc == ""){			
			Global.Connector.lc = Global.Connector.maxlc;
		}

		currentLinesBet = Global.Connector.lb;

		$('#val-lines').html(currentLinesBet);

		if(typeof(Global.Connector.cv) == "undefined" || Global.Connector.cv == null || Global.Connector.cv == ""){			
			Global.Connector.cv = slotMachine.coinValues[0];
		}

		slotMachine.curBet = Global.Connector.cv;
		
		var coinPos = slotMachine.coinValues.indexOf(Global.Connector.cv);
		$("#bet").text(slotMachine.coinValuesD[coinPos]);

		//slotMachine.change_coinValue(+1);
		$('#coin-value-btn').click(function() { slotMachine.change_coinValue(+1); });
		$('#lines-bet-btn').click(function() { slotMachine.change_lines(+1); });
		
		var el = document.getElementById("spinButton");
		el.addEventListener("click", function(){
			if (slotMachine.soundEnabled && loadSoundFlag /*&& isMobile.any()*/)  {
				SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
				SoundManager.LoadSoundsInit("readyToPayBG()");
				loadSoundFlag = false;
			}
			playBGSound();

			//Cashier Tournaments
			var isTournamentFlag = false;
			if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
				isTournamentFlag = true;
			}	
			if( Global.Connector.showCashier && isTournamentFlag && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0" ){
				cashierManager.openCashier();
				return;
			}


			slotMachine.spin();
		}, false);

		var elST = document.getElementById("stopButton");
		elST.addEventListener("click", function(){
			stopFlag = true;
			processStop();
		}, false);


		$('#soundOffButton').click(function() { slotMachine.toggle_sound(); });

		$('#fastPlayButton').click(function() { toggle_fastPlay(); });

		$('#historyButton').click(function() { openHistoryClick(true); });
		$('#helpButton').click(function() { openHelpClick(true); });

		//$('#close-history').click(function() { openHistoryClick(false); });

		$('#history-content').click(function() { openHistoryClick(false); });
		$('#history-overlay').click(function() { openHistoryClick(false); });
		$('#back-to-game-history-label').click(function() { openHistoryClick(false); });


		$('#close-click-payout').click(function() { openHelpClick(false); });
		$('#help-overlay').click(function() { openHelpClick(false); });
		
		$('#cashierButton').click(function() { cashierManager.openCashier();});
		$('#closeButton').click(function() { lobbyButtonClick(); });
		
		$('#message-ok-btn').click(function() { hideInfoMessage(); });



		$('#credits').html(formatWithThousandsPrecisionAndSymbol(slotMachine.credits));


/*
		if(!isMobile.any())  {
			SoundManager.LoadSoundConfig(soundConfigArray,"ogg");
			SoundManager.LoadSoundsInit("");
		}*/

		if (slotMachine.get_balance() < slotMachine.coinValues[0]) {
			slotMachine.disable_spin_button();
		}
	},

	//----------------------------------------------------

	get_balance: function() {

		return parseFloat(slotMachine.credits, 10);
		//return parseFloat($('#credits').html(), 10);
	},

	change_lines : function(delta) {

		if ($('#lines-bet-btn').hasClass("disabled")) { return false; }
		if (slotMachine.spinning || isInFreeSpins == 1) { return; } // don't do anything while spinning.

		//slotMachine.sounds['btn-click'].play();
		slotMachine.sounds['btn-click'] = SoundManager.PlayAudio('btn-click', false);

		currentLinesBet =  parseInt(currentLinesBet) +  parseInt(delta);
		if(currentLinesBet > maxLines){
			currentLinesBet = 1;
		}

		Global.Connector.lb = currentLinesBet;
	
		slotMachine.show_won_state(false); // Remove won state, so that they can't easily fake a screenshot to say "I bet 2 and got paid off only as 1"

		$('#val-lines').html(currentLinesBet);
		//change total bet
		var totalBet = currentLinesBet * Global.Connector.cv;
		$('#val-total-bet').html(formatWithThousandsNoDecimalZerosAndCurrency(totalBet));

		if (slotMachine.get_balance() >= totalBet) {
			slotMachine.enable_spin_button();
		}
	},

	change_coinValue: function(delta) {
		if ($('#coin-value-btn').hasClass("disabled")) { return false; }
		if (slotMachine.spinning || isInFreeSpins == 1) { return; } // don't do anything while spinning.

		slotMachine.sounds['btn-click'] = SoundManager.PlayAudio("btn-click", false);

		var currentBet = $("#bet").text();
		var currentPos = jQuery.inArray( currentBet, slotMachine.coinValuesD );///slotMachine.coinValuesD.indexOf(currentBet);

		var lengthArr = slotMachine.coinValuesD.length;

		var newPoss = currentPos + delta;

		if(newPoss < 0){
			newPoss = 0;
		}
		if(newPoss >= lengthArr){
			newPoss = 0;
		}

		var coinDisplay = slotMachine.coinValuesD[newPoss];
		var coinValueReal = slotMachine.coinValues[newPoss];

		slotMachine.curBet = coinValueReal;
		Global.Connector.cv = coinValueReal;
	
		slotMachine.show_won_state(false); // Remove won state, so that they can't easily fake a screenshot to say "I bet 2 and got paid off only as 1"

		$('#bet').html(coinDisplay);

		var totalBet = currentLinesBet * Global.Connector.cv;
		$('#val-total-bet').html(formatWithThousandsNoDecimalZerosAndCurrency(totalBet));
		
		if (slotMachine.get_balance() >= totalBet) {
			slotMachine.enable_spin_button();
		}
	},

	toggle_sound: function() {
		if ($('#soundOffButton').hasClass("off")) {
			//soundManager.unmute();
			SoundManager.SetAllVolume(0.9);
		} else {
			SoundManager.SetAllVolume(0);
			//soundManager.mute();
		}
		$('#soundOffButton').toggleClass("off");
	},

	enable_spin_button: function() {
		$('#spinButton').removeClass("disabled");
		$('#spinButton').removeClass('no-hover');
	},

	disable_spin_button: function() {
		$('#spinButton').addClass("disabled");
		$('#spinButton').addClass('no-hover');
	},

	enable_lines_button: function() {
		$('#lines-bet-btn').removeClass("disabled");
		$('#val-lines').removeClass("text-disable");

	},

	disable_lines_button: function() {
		$('#lines-bet-btn').addClass("disabled");
		$('#val-lines').addClass("text-disable");
	},

	enable_coinvalue_button: function() {
		$('#coin-value-btn').removeClass("disabled");
		$('#bet').removeClass("text-disable");
	},

	disable_coinvalue_button: function() {
		$('#coin-value-btn').addClass("disabled");
		$('#bet').addClass("text-disable");
	},

	//----------------------------------------------------
 	fnStopReelsAndEndSpin : function(spinData2) {
 			if(isInFreeSpins == 0 /*&& (typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees != ""  && Global.Connector.frees == "0")*/){
	 			if(!fastPlay){
	 				$("#stopButton").show();
	 				$("#spinpButton").hide();
	 			}else{
	 				var fastPlayTimer = setTimeout(function(){clearTimeout(fastPlayTimer); fastPlayTimer = null; processStop();}, 10);
	 				
	 			}
	 			
 			}

			// Make the reels stop spinning one by one
			spinData = $.parseJSON( spinData2 );

			baseTimeout = 200;
			timerR1 = window.setTimeout(function(){ slotMachine._stop_reel_spin(1, spinData.reels[0]); }, baseTimeout);
			baseTimeout += slotMachine.secondReelStopTime;
			timerR2 = window.setTimeout(function(){ slotMachine._stop_reel_spin(2, spinData.reels[1]); }, baseTimeout);
			baseTimeout += slotMachine.thirdReelStopTime;
			timerR3 = window.setTimeout(function(){ slotMachine._stop_reel_spin(3, spinData.reels[2]); 
				if(anticipationFlag)
				{
					slotMachine.reelSpeed2Delta = 3000;
				}

			}, baseTimeout);
			
			baseTimeout += slotMachine.thirdReelStopTime;

			if(anticipationFlag)
			{
				baseTimeout += anticipationTime;
			}

			timerR4 = window.setTimeout(function(){ slotMachine._stop_reel_spin(4, spinData.reels[3]); }, baseTimeout);
			baseTimeout += slotMachine.thirdReelStopTime;

			/*if(anticipationFlag)
			{
				baseTimeout += anticipationTime;
			}*/
			timerR5 = window.setTimeout(function(){ slotMachine._stop_reel_spin(5, spinData.reels[4]); 
				evaluteHits();
			}, baseTimeout);

			baseTimeout += slotMachine.payoutStopTime; // This must be related to the timing of the final animation. Make it a bit less, so the last reel is still bouncing when it lights up
			//timerR6 = window.setTimeout(function(){ evaluteHits(); }, (baseTimeout + 500) );
	},

	spin: function() {
		isLoading = false;
		// Validate that we can spin
		if ($('#spinButton').hasClass("disabled") && isInFreeSpins == 0) { console.log("esta innactiivo  isInFreeSpins", isInFreeSpins); return false; }
		if (slotMachine.spinning && isInFreeSpins == 0) {  console.log("esta spining   isInFreeSpins", isInFreeSpins); return false; }
		var totalBet = currentLinesBet * Global.Connector.cv;
		if(isInFreeSpins != 0){
			totalBet = 0;
			$('#spinButton').hide();
		}
		if(totalBet > Global.Connector.bal){
			processLowCredits();
			return false; 
		}

		//return values after stop btn
		flagHitsEval = false;
		stopFlag = false;
		if(!fastPlay){
			animationLinesTime = animationLinesTimeOri;
			timeToSpecialHits = timeToSpecialHitsOri;
			timeToPrcessFreeSpins  = timeToPrcessFreeSpinsOri;
			timeToAutoPopupCashier  = timeToAutoPopupCashierOri;
			noHitsTimer = 1000;
			hitsIterationTime = 100;
			timeToSpecialHitsCopy = 100; 
			timeIncrement = 40;
			tickDelay = 20;
			slotMachine.secondReelStopTime = 275; // since first reel's stop time, not since animation beginning
			slotMachine.thirdReelStopTime=  268;
			
			animationsFrames = 20;
			opacityReelTime= 300;
			slotMachine.bounceTime = 400;
		}else{
			setFastValues();
		}
 

		$("#credits").removeClass("blink-text");
		try{
			/*slotMachine.sounds['low-credits'].stop();*/		

			SoundManager.StopAudio("low-credits", slotMachine.sounds['low-credits']);

		}catch(er){}

		/*slotMachine.sounds['btn-click'].play();*/

		slotMachine.sounds['btn-click'] = SoundManager.PlayAudio("btn-click", false);

		// Clean up the UI
		slotMachine.spinning = true;
		if(isInFreeSpins == 0)
			slotMachine.show_won_state(false);
		
		slotMachine.disable_spin_button();
		slotMachine.disable_lines_button();
		slotMachine.disable_coinvalue_button();

		

		processData  = "";

		// Deduct the bet from the number of credits
		if(isInFreeSpins == 0){			
		
			$('#credits').html(formatWithThousandsPrecisionAndSymbol(slotMachine.credits - totalBet));
		}
			
		showFace();

		// Make the reels spin
		slotMachine._start_reel_spin(1, 0);
		slotMachine._start_reel_spin(2, slotMachine.secondReelStopTime);
		slotMachine._start_reel_spin(3, slotMachine.secondReelStopTime + slotMachine.thirdReelStopTime);
		slotMachine._start_reel_spin(4, slotMachine.secondReelStopTime + slotMachine.thirdReelStopTime);
		slotMachine._start_reel_spin(5, slotMachine.secondReelStopTime + slotMachine.thirdReelStopTime);

		try {
			/*slotMachine.sounds['spinning'].play();*/
			try{
				SoundManager.StopAudio("spinning", slotMachine.sounds["spinning"]);
			}catch(er){}
			slotMachine.sounds['spinning'] = SoundManager.PlayAudio("spinning", true);
		} catch(err) {}

		// We need to make the reels end spinning at a certain time, synched with the audio, independently of how long the AJAX request takes.
		// Also, we can't stop until the AJAX request comes back. So we must have a timeout for the first reel stop, and a function that makes
		//   the magic happen, and whatever happens last (this timeout, or the AJAX response) calls this function.
		// The sound timings are at: 917ms, 1492ms and 2060ms, which needs to be adjusted by the animation timings
		//   (which is why i'm setting the first one at 250ms before 917ms)

		//var

		var FirstReelTimeoutHit = false;
		var spinData = null;
		window.setTimeout(function(){ FirstReelTimeoutHit = true; if (spinData != null) { fnStopReelsAndEndSpin(spinData); } }, slotMachine.firstReelStopTime);


		processSpin();
	},
	processSpinResponse: function(jsonData){
		spinData = jsonData;
		//console.log("processSpinResponse spinData", spinData)
		this.fnStopReelsAndEndSpin(spinData);
		//if (FirstReelTimeoutHit == true) { fnStopReelsAndEndSpin(); }
	},


	show_won_state: function(bWon, prize_id, win_type) {
		if (bWon) {
			if (win_type) {
				$('#PageContainer, #SlotsOuterContainer').addClass(win_type);
			} else {
				$('#PageContainer, #SlotsOuterContainer').addClass("won");
			}
			$('#trPrize_' + prize_id).addClass("won");
		} else {
			/*$('.trPrize').removeClass("won");
			$('#PageContainer, #SlotsOuterContainer').removeClass(); // remove all classes
			$('#lastWin').html("");
			clearInterval(linesInterVal);
			linesInterVal = null;
			hideAllWinnerLines();
			$(".reel-icon").css('opacity', '1');
			clearInterval(animateWinInterval);
			animateWinInterval = null;
			try{
				//slotMachine.sounds['fastpayout'].stop();

				SoundManager.StopAudio("fastpayout", slotMachine.sounds['fastpayout']);

			}catch(er){}*/
			//console.log("show_won_state false");
			$('.trPrize').removeClass("won");
			$('#PageContainer, #SlotsOuterContainer').removeClass(); // remove all classes
			$('#lastWin').html("");
			clearInterval(linesInterVal);
			linesInterVal = null;
			hideAllWinnerLines();
			$(".reel-icon").css('opacity', '1');
			clearInterval(animateWinInterval);
			animateWinInterval = null;
			$(".high-light-icon").hide();
			$(".high-light-icon").removeClass("icon-line-border");

			clearInterval(showLinesAfertIncrease);
			clearAllIconsIntervals();
			showLinesAfertIncrease = null;

			try{
				//slotMachine.sounds['fastpayout'].stop();

				SoundManager.StopAudio("fastpayout", slotMachine.sounds['fastpayout']);

			}catch(er){}

		}
	},

	end_spin: function(data) {
		//console.log("************data", data)
		if (data.prize != null) {
			slotMachine.show_won_state(true, data.prize.id, data.prize.winType);
			//if(isInFreeSpins == 0){
				//slotMachine._end_spin_after_payout(data);
				slotMachine._increment_payout_counter(data); // _increment_payout_counter will call end_spin_after_payout, which is where this list of things to do at the end really ends
			//}
				
		} else {
			slotMachine._end_spin_after_payout(data);
		}
	},

	_format_winnings_number: function(winnings) {
		if (winnings == Math.floor(winnings)) {
			return winnings;
		} else {
			return winnings.toFixed(2);
		}
	},
	
	// These are the things that need to be done after the payout counter stops increasing, if there is a payout
	_end_spin_after_payout: function(data) {
		// This is technically redundant, since the payout incrementer updated them, and we decreased it when spinning,
		//   but just in case something got off sync

		if (typeof data.credits != "undefined") { 
			
			if(isInFreeSpins == 0){
				$('#credits').html(formatWithThousandsPrecisionAndSymbol(data.credits)); 
			}
		}
		if (typeof data.lastWin != "undefined") { 
			//console.log("data.lastWin", data.lastWin, "acumulateTotalWin", acumulateTotalWin, "isInFreeSpins", isInFreeSpins)
			if(isInFreeSpins == 0){
				acumulateTotalWin = data.lastWin; 
			}else{
				acumulateTotalWin += data.lastWin;
				
			}
			//console.log("total a escribir ", acumulateTotalWin, isInFreeSpins)
			if(acumulateTotalWin > 0){
				$('#lastWin').html(formatWithThousandsNoDecimalZeros(acumulateTotalWin)); 
				//console.log("isInFreeSpins", isInFreeSpins , " --Global.Connector.frees  -- ", Global.Connector.frees)
				if(typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees != ""  && Global.Connector.frees == "0"){
					//slotMachine.sounds['fastpayout'].play();
					slotMachine.sounds['fastpayout'] = SoundManager.PlayAudio("fastpayout", false);

					var baseBalance =  Global.Connector.bal - acumulateTotalWin;
					var increment =  acumulateTotalWin / 20.00;


					animateWinInterval = setInterval(function(){ 
						if (baseBalance >= Global.Connector.bal){
							clearInterval(animateWinInterval);
							animateWinInterval = null;
							$('#credits').html(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
							try{
								//slotMachine.sounds['fastpayout'].stop();
								SoundManager.StopAudio("fastpayout", slotMachine.sounds['fastpayout']);
							}catch(er){}
						}
						else{
							baseBalance += increment;
							$('#credits').html(formatWithThousandsPrecisionAndSymbol(baseBalance));
						}
					}, timeIncrement);
				}
			}else
				$('#lastWin').html(""); 

			processAutoPopupCashier();

		}
		
		slotMachine.spinning = false;
		
		if (slotMachine.get_balance() >= slotMachine.curBet) {
			slotMachine.enable_spin_button();
		}
		if(isInFreeSpins == 0){
			slotMachine.enable_lines_button();
			slotMachine.enable_coinvalue_button();
		}
	},

	_increment_payout_counter: function(data) {
		var currentValues = {
			credits: data.credits - data.prize.payoutCredits,
		}

		var maxDelta = Math.max(data.credits - currentValues.credits, data.dayWinnings - currentValues.dayWinnings);
		var soundName = 'fastpayout';
		//var tickDelay = 20;

		try {
			//slotMachine.sounds[soundName].play({ onfinish: function(){ this.play(); }});
		} catch(err) {}

		var timerID = window.setInterval(function() {
			var valueChanged = false;
			$.each(['credits'], function(i, component){
				if (currentValues[component] < data[component]) {
					currentValues[component] += 1;
					currentValues[component] = Math.min(currentValues[component], data[component]); // make sure we don't go over, useful for decimals.
					
					$('#' + component).html(formatWithPrecisionAndSymbol(currentValues[component]));					

					valueChanged = true;
				}
			});

			if (!valueChanged) {
				window.clearInterval(timerID);

				try {
					//slotMachine.sounds[soundName].stop();
					SoundManager.StopAudio(soundName, slotMachine.sounds[soundName]);
				} catch(err) {}

				slotMachine._end_spin_after_payout(data);
			}
		}, tickDelay);
	},

	abort_spin_abruptly: function() {
		slotMachine._stop_reel_spin(1, null);
		slotMachine._stop_reel_spin(2, null);
		slotMachine._stop_reel_spin(3, null);
		slotMachine._stop_reel_spin(4, null);
		slotMachine._stop_reel_spin(5, null);
		try {
			//slotMachine.sounds['spinning'].stop();
			SoundManager.StopAudio("spinning", slotMachine.sounds["spinning"]);
		} catch(err) {}
	},

	// -----------------------------------
	
	// timeOffset is how much time later than the previous reel we expect this reel to stop spinning.
	_start_reel_spin: function(i, timeOffset) {
		//console.log("_start_reel_spin  i", i)
		var startTime = Date.now();
		var elReel = $('#reel' + i); // cache for performance
		if(!fastPlay && !stopFlag)
			elReel.css("opacity", reelOpacity);
		else
			elReel.css("opacity", 1);
		//elReel.css({top: -(Math.random() * ((ReelsArr[i-1].length - 3) * slotMachine.iconSize) ) }); // Change the initial position so that, if a screenshot is taken mid-spin, reels are mis-aligned
		var curPos = parseInt(elReel.css("top"), 10);

		var fnAnimation = function(){
			elReel.css({top: curPos});
			
			if (Date.now() < startTime + slotMachine.reelSpeed1Time + timeOffset) {
				curPos += slotMachine.reelSpeed1Delta;
			} else {
				curPos += slotMachine.reelSpeed2Delta;
			}
			curPos += i * slotMachine.reelSpeedDifference;
			if (curPos > 0) {curPos = -(ReelsArr[i-1].length * slotMachine.iconSize) ;}
		};
		var timerID = window.setInterval(fnAnimation, 20);
		elReel.data("spinTimer", timerID);
	},
	_stop_reel_spin: function(i, outcome) {
		var elReel = $('#reel' + i); // cache for performance
		if(reelOpacityOPtion == 1)elReel.css("opacity", "1");
		var timerID = elReel.data("spinTimer");
		window.clearInterval(timerID);
		elReel.data("spinTimer", null);


		if (outcome != null) {
			// the whole strip repeats thrice, so we don't have to care about looping
			// alignmentOffset is kind of empirical...

			var distanceBetweenIcons = (ReelsArr[i-1].length * slotMachine.iconSize) / ReelsArr[i-1].length;
			var finalPosition = 0 -(((outcome - 1) * distanceBetweenIcons) + slotMachine.alignmentOffset);
			// Animation two: Elastic Easing
			elReel.css({ top: finalPosition - (ReelsArr[i-1].length * slotMachine.iconSize) })
				.animate({ top: finalPosition + slotMachine.bounceHeight}, slotMachine.positioningTime, 'linear', function() {
					if(i==5){
						try {
							setTimeout(function(){
								//slotMachine.sounds['spinning'].stop();
								try{
									SoundManager.StopAudio("spinning", slotMachine.sounds["spinning"]);

								}catch(er){}
							},350); 
						} catch(err) {}
					}

					//slotMachine.sounds['reel-stop'].play();
					try{
						SoundManager.StopAudio("reel-stop", slotMachine.sounds["reel-stop"]);
					}catch(er){}

					slotMachine.sounds['reel-stop'] =  SoundManager.PlayAudio("reel-stop", false);

					elReel.animate({top: finalPosition}, slotMachine.bounceTime, 'easeOutElastic', function(){if(reelOpacityOPtion == 2)elReel.animate({opacity: "1"}, 300);});
				});
		}
	},
	_stop_reel_spinBTN: function(i, outcome) {
		var elReel = $('#reel' + i); // cache for performance
		//if(reelOpacityOPtion == 1).
		elReel.css("opacity", "1");
		var timerID = elReel.data("spinTimer");
		window.clearInterval(timerID);
		elReel.data("spinTimer", null);

		try{
			SoundManager.StopAudio("reel-stop", slotMachine.sounds["reel-stop"]);
		}catch(er){}
		try{
			SoundManager.StopAudio("spinning", slotMachine.sounds["spinning"]);

		}catch(er){}
			

		if (outcome != null) {
			// the whole strip repeats thrice, so we don't have to care about looping
			// alignmentOffset is kind of empirical...

			var distanceBetweenIcons = (ReelsArr[i-1].length * slotMachine.iconSize) / ReelsArr[i-1].length;
			var finalPosition = 0 -(((outcome - 1) * distanceBetweenIcons) + slotMachine.alignmentOffset);
			// Animation two: Elastic Easing
			elReel.css({ top: finalPosition - (ReelsArr[i-1].length * slotMachine.iconSize) });


		}
	}
};



function initMachine(){

	if(isMobile.any()){
		$("#nav-bar").addClass("nav-bar-mobile");
	}


	LanguagesManager.afterLoadTranslations();
	processRessa();
	processCoinValues();
	manageMenuIcons();

	slotMachine.credits = Global.Connector.bal;
	processPayoutTable();

	slotMachine.init();
	setInitialReels();
	

	if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
		startGetInfoMessage();
	}else{
		processFreeSpinsInit();
	}

	var configCash = {
		type : 4, // 0 hand, 1 dealer hand, 2 player hand, 3 rollerino, 4 spin
		automata : false,
		autoStart : false,
		extraStart : true
	}

	cashierManager.cashierCreator("#global", "../../html5Games/common/img/chipTransfer/", updateGameAfterCashierBuyIn, configCash);
	HeartbeatManager.initHeartbeat(Global.Connector.gameSession, updateGameAfterHeartbeat);
	processAutoPopupCashier();

	if(!isMobile.any()){
		$("#slotMachineContainer").addClass("isDesktop")
	}else{
		$("body").addClass("is-mobile");

		$(".dkCashier-box").addClass("dkCashier-box-is-mobile");
		$(".line-credits").addClass("line-credits-mobile");

	}
	//testShowAllLines();
	//testShowArrayLines('13,6,24');
}

function updateGameAfterCashierBuyIn(){
	Global.Connector.bal = Global.ChipTransfer.gameBalance;
	slotMachine.credits = Global.Connector.bal;
	$('#credits').html(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
	//console.log("updateGameAfterCashierBuyIn")
	processAutoPopupCashier();
}

function updateGameAfterHeartbeat(){
	if(isTimeToShowInfoMsg() && (typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != "")){
		startGetInfoMessage();
		$('#credits').html(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
		slotMachine.credits = Global.Connector.bal;				
	}else if(isTimeToShowInfoMsg() ){
		$('#credits').html(formatWithThousandsPrecisionAndSymbol(Global.Connector.bal));
		slotMachine.credits = Global.Connector.bal;	
	}
	processAutoPopupCashier();
}

function manageMenuIcons(){
	if(Global.Connector.showCashier == false){
		$("#cashierButton").hide();
	}

	if(Global.Connector.showHistory == false){
		$("#historyButton").hide();
	}

}

function LoadLanguage(){
	LanguagesManager.loadTranslations(initMachine);

}

var ReelsArr = new Array();
function processRessa(){
	if(typeof(Global.Connector.reesa) != "undefined" && Global.Connector.reesa != null){
		ReelsArr = Global.Connector.reesa.split(',');
		createDynamicReel(ReelsArr);
	}else{
		alert("ERROR INCORRECT REESA DATA");
	}
}

function createDynamicReel(ReelsArr){
	//console.log("ReelsArr",ReelsArr)
	var ulData = "";
	var ilData = "";
	var reel = "";
	for(var i = 0; i < ReelsArr.length; i++){
		//console.log("in cicle" + i, ReelsArr.length)
		var reelIcon = ReelsArr[i];
        ReelsArr[i] = ReelsArr[i]  + reelIcon[0] + reelIcon[1];
		reel = ReelsArr[i] + ReelsArr[i];
		ulData = "<ul>";

		for(var j = 0; j < reel.length; j++){			
			ulData += "<li id='reel-"+(parseInt(i) + 1)+"-poss-"+ (parseInt(j) + 1) +"' class='reel-icon'><img src='images/icons/"+reel[j]+".png'/></li>";
		}
		ulData += "</ul>";
		$("#reel-sub-" + i).append( ulData );
		$("#reel" + (parseInt(i) + 1)).height((ReelsArr[i].length * slotMachine.iconSize));
	}
}

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function setInitialReels(){

	if(Global.Connector.reels == null || Global.Connector.reels == ""){	
		var connectorReels = "|";
		for(var i = 0; i < ReelsArr.length; i++){
			var reelArray = ReelsArr[i].match(/.{1,3}/g);

			if(i != 1){
				for(var j = 0; j < reelArray.length; j++){
					var tempString  = reelArray[j];
					
					if(tempString.indexOf("W") < 0 && tempString.indexOf("X") < 0 && tempString.indexOf("Z") < 0 && connectorReels.indexOf(tempString) < 0){
						
							connectorReels += (tempString + "|");
							break;
						
					}
				}
			}
			else{
				var iconsRepeted  = false;
				var reel2Complete = ReelsArr[i];
				for(var k = 0; k < reel2Complete.length - 3; k++){
					var icon1 = reel2Complete[k];
					var icon2 = reel2Complete[k+1];
					var icon3 = reel2Complete[k+2];
					var iconReel2  = tempString[k];
					if(connectorReels.indexOf(icon1) < 0 && connectorReels.indexOf(icon2) < 0 && connectorReels.indexOf(icon3) < 0 && icon1 != "W" && icon2 != "W" && icon3 != "W"){
						tempString = icon1+icon2+icon3;
						break;
					}							

				}
				connectorReels += (tempString + "|");

			}
				
		}
		
		Global.Connector.reels = connectorReels;
	}

	var result = processReelsPoss();
	//console.log("result ori", result)
	result = result.replaceAll('"','');
	//result = result.replace('"','');
	var arrayPos = result.split(',');

	for(var i=0; i < arrayPos.length; i++){

		var distanceBetweenIcons = (ReelsArr[i].length * slotMachine.iconSize) / ReelsArr[i].length;
		var valPos = arrayPos[i].replace('"','');
		//console.log("valPos", (valPos))
		var finalPosition = 0 -((( parseInt(valPos)-1) * distanceBetweenIcons) + slotMachine.alignmentOffset);

		$('#reel' + (i + 1)).css({ top: finalPosition});
	}

}

function processReelsPoss(){

	var result = '';//'"5","5","5"';

	var arrReels = Global.Connector.reels.split('|');
	var arrReelsClean = new Array();

	for(var i=0; i< arrReels.length; i++){
		//console.log('in for one');
		var tempReel = arrReels[i];
		if(typeof(tempReel) != "undefined" && tempReel != null & tempReel.length > 0){
			arrReelsClean.push(tempReel);
		}
	}

	for (var j =0 ; j < arrReelsClean.length; j++){
		//console.log('in for two');
		if(result ==''){
			result += '"' +searchReelStripPos(arrReelsClean[j], j) + '"';
		}else{
			result += ',"' +searchReelStripPos(arrReelsClean[j], j) + '"';
		}
		
	}

	return result;

}

function searchReelStripPos(reelIcons, reelId){
	var pos = ReelsArr[reelId].indexOf(reelIcons) +1;
	return pos;
}


function readVarfromEnterURL(){
	var varArr =  getUrlVars();
	//console.log(" getUrlVars ", varArr)
	Global.Connector.errorCode = varArr["ERRCODE"];
    Global.Connector.gameSession = varArr["GAMESESSION"];
    Global.Connector.lang = varArr["LANG"];
    Global.Connector.gameCode = varArr["GAMECODE"];
    Global.Connector.showCashier = varArr["SHOWCASHIER"];
    Global.Connector.showHistory = varArr["SHOWHISTORY"];
    Global.Connector.showType = varArr["SHOWTYPE"];
    Global.Connector.showChips = varArr["SHOWCHIPS"];
    Global.Connector.currency = varArr["CURRENCY"];
    Global.Game.helpPage = varArr["HELPFILE"];
    Global.Connector.accountId = varArr["ACCOUNTID"];

}

function loadSlotMachine(){
	readVarfromEnterURL();
	storeCurrencyData();
	if(typeof(Global.Connector.gameSession) =="undefined"){
    	showErrorMessage("ERROR INCORRECT ENTER DATA");
    	return;
    }
	
	ServerManager.doInitAction(LoadLanguage);

}

$( document ).ready(function() {
	$( window ).on('resize', function(){
		//console.log('on resize function')
		resizeContainer();
	});

	resizeContainer();
	Global.GameUrls.casinoWrapperURL = "";

	StartLoad();


});

function afterPreload(){
	$("#PageContainerInner").show();
	resizeContainer();
	loadSlotMachine();
} 

/*$( window ).resize(function() {
	console.log("Resize!!!!!!!")
	resizeContainer();
});*/


function resizeContainer() {

    if (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)) {
        var viewportmeta = document.querySelector('meta[name="viewport"]');
        if (viewportmeta) {
            viewportmeta.content = 'minimum-scale=0.5, maximum-scale=0.5, initial-scale=0.5';
            document.body.addEventListener('gesturestart', function () {
                viewportmeta.content = 'minimum-scale=0.5, maximum-scale=0.5';
            }, false);
        }
    }

    $('#PageContainer').css({ 'position': 'relative' });
    $('#global').hide();
    //$('.shinning').removeClass('shinning');

    var FULL_WIDTH ;
    var FULL_HEIGHT;
    var CONTENT_WIDTH;
    var _h = $(window).height();
    var _w = $(window).width();


    var DevicePosition = "";

    if (_h <= _w) {
        DevicePosition = 'L';
    }else{
        DevicePosition = 'P';
    }
    /*$('body').removeClass('portrait');
    $('body').addClass('landscape');*/
    FULL_WIDTH          = 2130;
    FULL_HEIGHT         = 796;
    CONTENT_WIDTH       = 1020;

    $('.overlay').css({height: "100%" });
    $('#global').css({height: (FULL_HEIGHT + "px") });
    $('#global').css({width: ( FULL_WIDTH + "px") });
    $('#global').css({'overflow': 'visible' });
    $('#global').show();

    var scaleX  = window.innerWidth / CONTENT_WIDTH;
    var scaleY  = window.innerHeight / FULL_HEIGHT;
    var scale   = scaleX < scaleY ? scaleX : scaleY;

    $("#global")
    .css("transform-origin", "0px 0px")
    .css("-ms-transform-origin", "0px 0px")
    .css("-webkit-transform-origin", "0px 0px")
    .css("transform", "scale(" + scale + "," + scale + ")")
    .css("-webkit-transform", "scale(" + scale + "," + scale + ")")
    .css("-ms-transform", "scale(" + scale + "," + scale + ")")
    .css("left", Math.floor((window.innerWidth  - FULL_WIDTH  * scale) / 2 + window.pageXOffset)  + "px")
    .css("top",  Math.floor((window.innerHeight - FULL_HEIGHT * scale) / 2 + window.pageYOffset)  + "px");

    if(isMobile.any()){
	    if($("#helpContainer").hasClass("helpContainer-landscape")){
	    	$("#helpContainer").removeClass("helpContainer-landscape");
	    }

	    if(DevicePosition == 'L'){
	    	$("#helpContainer").addClass("helpContainer-landscape");
	    }

    }else{
	    $("#payout-iframe")
	    .css("transform", "scale(" + 1 + "," + 1 + ")")
	    .css("-webkit-transform", "scale(" + 1 + "," + 1 + ")")
	    .css("-ms-transform", "scale(" + 1 + "," + 1 + ")");
    }

}


function processWin(){
	var result = '';
	/*if(typeof(Global.Connector.cow) != "undefined" && Global.Connector.cow != null && parseInt(Global.Connector.cow) > 0){
		if(typeof(Global.Connector.hits) != "undefined" && Global.Connector.hits != null && Global.Connector.hits.length > 0){
	
		var histArr = Global.Connector.hits.split('.');
		var infoSymbol  = histArr[1];
		var pay = histArr[2];

			if(slotMachine.payoutsArr[infoSymbol] == pay){
				
				result = '"prize":{"id":"'+infoSymbol[1]+'","payoutCredits":'+(Global.Connector.cow *  Global.Connector.cv) +',"payoutWinnings":'+Global.Connector.cow+'},';
			}
		}

		
	}*/
	return result;
}

function processSpin(){
	hideAllWinnerLines();
	ServerManager.doSpinAction(processAfterSpin);
}

function processAfterSpin(){
	processData  = processReelsPoss();
	if(typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees == "0"){
		slotMachine.credits = Global.Connector.bal;
	}
	
	var dataSpin = '{"reels":['+processData+'],'+processWin()+'"lastWin":'+(Global.Connector.cow *  Global.Connector.cv)+', "success":true,"credits":'+Global.Connector.bal+',"dayWinnings":0,"lifetimeWinnings":36}';
	slotMachine.processSpinResponse(dataSpin);
}



function processPayoutTable(){

	if(typeof(Global.Connector.payt) != "undefined" &&  Global.Connector.payt != null && Global.Connector.payt.length > 0){
		var arr1 = Global.Connector.payt.split(',');
		for(var i = 0; i < arr1.length; i++)
		{

			var payoutArr = arr1[i].split(':');
			var iconInfo = payoutArr[0];
			var iconName = iconInfo[1];
			var pay = payoutArr[1];
			slotMachine.payoutsArr[iconInfo] = pay;

			$("#payout-"+iconName).attr("data-basePayout",pay);
			$("#payout-"+iconName).html( formatWithThousandsPrecisionAndSymbol(pay));

		}
	}
}

function processCoinValues(){
	if((typeof(Global.Connector.cvals) != "undefined" &&  Global.Connector.cvals != null && Global.Connector.cvals.length > 0)
		&&
		(typeof(Global.Connector.cvalsd) != "undefined" &&  Global.Connector.cvalsd != null && Global.Connector.cvalsd.length > 0)
		)
	{
		slotMachine.coinValues = decodeURIComponent(Global.Connector.cvals).split(',');
		slotMachine.coinValuesD = decodeURIComponent(Global.Connector.cvalsd).split(',');
	}
}

var HitsArray = new Array();


function hideAllWinnerLines() {
	for (var i = 1; i <= Global.Connector.maxlb; i++) hideWinnerLine(i);
}

function hideWinnerLine(lineNumber) {
    $("#line" + lineNumber).hide(), $("#credits-box" + lineNumber).hide();
    $("#credits-box" + lineNumber).text("00");
}

function hideAllWinnerLinesForAnimation() {
 	$(".line-credits").hide(), $(".line-image").hide(), $(".reel-image").removeClass("reel-image-nobg");
}

var WinnerLines = new Array();
var noHitsTimer = 1000;
function evaluteHits(){
	flagHitsEval = true;

	HitsArray = new Array();

	if(typeof(Global.Connector.hits) == "undefined" || Global.Connector.hits == null || Global.Connector.hits.length <=0 ){
		var timer1 = setTimeout(function(){
			clearTimeout(timer1);
			timer1 = null;
			processFreeSpins();
	
		}, noHitsTimer);
		return;
	}
		
	HitsArray = Global.Connector.hits.split(",");
	WinnerLines = new Array();
	var totalLineAndPrize = "";
	var specialHitsArrray = "";
	for(var i = 0; i < HitsArray.length; i++){
		var hitArr = HitsArray[i].split('.');
		if($.isNumeric( hitArr[0])){

			var pathNormalLine = parseInt(hitArr[0]);
			var pathCoins = parseInt(hitArr[2]);
			var symbols = hitArr[1];
			//console.log("Processing HIT", hitArr, pathNormalLine);
			//22322.4G.25,232.2A.5.2,233.2A.5
			//WinnerLines = getWinnerLinesByPath(hitArr[0], pathCoins, WinnerLines);
			if(totalLineAndPrize == "")
				totalLineAndPrize = getWinnerLinesByPath(pathNormalLine, pathCoins, symbols);
			else
				totalLineAndPrize += ";" + getWinnerLinesByPath(pathNormalLine, pathCoins, symbols);	
		}
		else //FreeSpins or scatter
		{
			if(specialHitsArrray == ""){
				specialHitsArrray = HitsArray[i];
			}	
			else{
				specialHitsArrray += ';' + HitsArray[i];
			}
		}			
	}
	//$(".reel-icon").css('opacity', '0.1');
	//totalLineAndPrize = "21:$1.25:22322:4G;13:$0.25:232:2A;19:$0.25:232:2A;9:$0.25:2333:4A";

	$("#stopButton").hide();
 	$("#spinpButton").show();

	WinnerLines = new Array();
	if(totalLineAndPrize != null && totalLineAndPrize != "")
		WinnerLines = totalLineAndPrize.split(";");
    var maxHits = WinnerLines.length; 
    var counterHits = 0;

	hitsIterationTime = 100;
	timeToSpecialHitsCopy = 100; 
	if(maxHits > 0){
		hitsIterationTime = animationLinesTime;
		timeToSpecialHitsCopy = timeToSpecialHits;
	}

    linesInterVal = setInterval(function(){ 
    	if(WinnerLines != null && WinnerLines.length > 0 && counterHits < maxHits){
    		$(".reel-icon").css('opacity', opacityIconHightLight);

    		var hitArray = WinnerLines[counterHits].split(":");
    		var path = hitArray[2];
    		var symbols = hitArray[3];
    		processHightLightIcons(processData, path, symbols);
    		showWinningLines(hitArray[0], hitArray[1])
    		var icon = symbols[symbols.length -1];
    		//slotMachine.sounds['win-icon-'+icon].play();

    		//$('#lastWin').html(hitArray[1]); 
    		
    		try{
    			SoundManager.StopAudio('win-icon-'+icon, slotMachine.sounds['win-icon-'+icon]);
    		}catch(err){}

    		slotMachine.sounds['win-icon-'+icon] = SoundManager.PlayAudio('win-icon-'+icon, false);
    		counterHits++;
    	}else{
    		clearInterval(linesInterVal);
    		linesInterVal = null;
    		clearAllIconsIntervals();
    		for(var i = 0; i < WinnerLines.length; i++){
				var hitArray = WinnerLines[i].split(":");
    			showAllWinningLines(hitArray[0], hitArray[1]);
    			$(".reel-icon").css('opacity', '1');
    		}

    		
    		if(specialHitsArrray != ""){
    			var timer5 = setTimeout(function(){
    				clearTimeout(timer5);
					timer5 = null;
	    			hideAllWinnerLines();
	    			var specialsArrCopy = specialHitsArrray.split(";");
	    			var specialsArr = new Array(); 

	    			//console.log("specialHitsArrray", specialHitsArrray); 

	    			var sortedSpecialsArr = specialHitsArrray.split(";");
	    			if(specialsArrCopy.length > 1){
	    				for(var i =0 ; i < specialsArrCopy.length; i++){
		    				var hitArrTemp = specialsArrCopy[i].split('.');

		    				if(hitArrTemp[0] == 'S' && hitArrTemp[2].indexOf('FS') < 0 && $.isNumeric( hitArrTemp[2])){
		    					specialsArr[0] = specialsArrCopy[i];
		    				} else{
		    					specialsArr[1] = specialsArrCopy[i];
		    				}
	    				}
	    			}else{
	    				specialsArr = specialHitsArrray.split(";");
	    			}
//FITO	    			
//console.log("specialHitsArrray", specialHitsArrray);
	    			var currentHitSpecials = 0;
	    			var maxHitSpecials = specialsArr.length;
	    			specialHitsInterVal = setInterval(function(){ 
	    				if(currentHitSpecials < maxHitSpecials){

		    				var hitArr = specialsArr[currentHitSpecials].split('.');
		    				//SCATTER FREES SPIN
		   
							if(hitArr[0] == 'S') 
							{	
								
								var timeToStartFreeSpins = 0;
								//SCATTER PAY
								if(hitArr[2].indexOf('FS') < 0 && $.isNumeric( hitArr[2]))
								{
									$(".reel-icon").css('opacity', opacityIconHightLight);

						    		$(".high-light-icon").hide();
									$(".high-light-icon").removeClass("icon-line-border");

									var scatterPaid = hitArr[2] * Global.Connector.cv;
									//console.log("Scatter Paid ", scatterPaid)
									$('#lastWin').html(formatWithThousandsNoDecimalZeros(scatterPaid)); 

									processHightLightIconsFS(processData, hitArr[1]); 
									slotMachine.sounds['win-icon-Y'] = SoundManager.PlayAudio('win-icon-Y', false);
									//processFreeSpins();
								//free spins	
								}else if(hitArr[2].indexOf('FS') >=0){
									/*clearInterval(specialHitsInterVal);
									specialHitsInterVal = null;*/

			    					$(".reel-icon").css('opacity', opacityIconHightLight);
			    					processHightLightIconsFS(processData, hitArr[1]); 

			    					slotMachine.sounds['win-icon-X'] = SoundManager.PlayAudio('win-icon-X', false);			    					
			    				}	
			    			}

	    					currentHitSpecials++;
	    				}	    				
	    				else{
	    					clearInterval(specialHitsInterVal);
							specialHitsInterVal = null;

							//process FreeSpins
				    		var timer7 = setTimeout(function(){
				    			

								clearTimeout(timer7);
								timer7 = null;
								$(".reel-icon").css('opacity', 1);
								$(".reel-icon").removeClass('shinning');
								$(".high-light-icon").hide();
								$(".high-light-icon").removeClass("icon-line-border");

								processFreeSpins();

							},timeToPrcessFreeSpins);
	    				}
	    			},animationLinesTime );
	    		}, timeToSpecialHitsCopy);						
			}else{
    			var timer2 = setTimeout(function(){
					clearTimeout(timer2);
					timer2 = null;
					//$(".reel-icon").css('opacity', 1);
					processFreeSpins();

				}, timeToPrcessFreeSpins);
    		}
    	}
    }, hitsIterationTime);
}



function processHightLightIcons(reelPoss, path, icons){
	var reelspossClean = reelPoss.replaceAll('"','');
	var ArrReeslPoss = reelspossClean.split(",");
	var totalIcons = parseInt(icons[0]);
	path = path + "";
	clearAllIconsIntervals();
	var animatedIconsArrOr = animatedIcons.split(',');
	for(var i=0; i< totalIcons; i++){
		var reelIconPos = path[i];
		var reelStripPos = ArrReeslPoss[i];

		var elementPos = parseInt(reelStripPos) + (parseInt(reelIconPos) - 1);

		var iconImageArr = $("#reel-"+ (parseInt(i) + 1 )+"-poss-" + elementPos).children().attr('src').split('/');
		var inconName = iconImageArr[iconImageArr.length-1].replace(".png", '');
		
		if(animatedIconsArrOr.indexOf(inconName)>= 0){
			$("#reel-"+ (parseInt(i) + 1 )+"-poss-" + elementPos).css('opacity', '0');
		}else{
			$("#reel-"+ (parseInt(i) + 1 )+"-poss-" + elementPos).css('opacity', '1');
		}

		animateIcon( (i+1), reelIconPos, inconName);
	}
	if(iconsBorderType > 0){
		showBoderIcon(path, icons);
	}

}

function showBoderIcon(path, icons){
	var maxIdex = parseInt(icons[0]);

	for(var reel = 1; reel <= maxIdex; reel++){
		var row = path[reel-1];
		var elementId = "#high-light-icon-re"+reel+"-ro"+row;
		$(elementId).show();

	}
	if(iconsBorderType == 1){
		//$(".high-light-icon").addClass("icon-line-border");
	}
	else if(iconsBorderType == 2){
		clearInterval(borderAnimationsInterval);
		borderAnimationsInterval = null;
		$(".high-light-icon").addClass("icon-border-animated");
		animateBorders();
	}
	
}

function clearAllIconsIntervals(){
	var keyArr = Object.keys(iconsAnimationsInterval);
	for(var i = 0; i < keyArr.length; i++){
		clearInterval(iconsAnimationsInterval[keyArr[i]]);
	}
	iconsAnimationsInterval = new Array();
	$('.high-light-icon').css({'background-image': ""});
}

function animateIcon( reel, row, icon){
	var animatedIconsArr = animatedIcons.split(',');
	
	if(animatedIconsArr.indexOf(icon)>= 0){

		if(iconsAnimationsInterval["#high-light-icon-re"+reel+"-ro"+row] ==  null){
			$("#high-light-icon-re"+reel+"-ro"+row).css({'background-image': "url('images/icons/"+icon+"_anim.png')"})

			var imageCounter = 1;
			
			var tempInterval = setInterval(function(){
				if(imageCounter > 20){
					clearInterval(tempInterval);
					tempInterval = null;
					//imageCounter = 1;
				}
				var bgPos = imageCounter * slotMachine.iconSize;

				$("#high-light-icon-re"+reel+"-ro"+row).css('background-position', -(bgPos ) + 'px  0px');
				imageCounter++;

			},(1000/ animationsFrames));

			iconsAnimationsInterval["#high-light-icon-re"+reel+"-ro"+row] = tempInterval;
		
		}
	}
}

function animateBorders(){
	var imageCounter = 1;
	borderAnimationsInterval = setInterval(function(){
		if(imageCounter > 25){
			imageCounter = 1;
		}
		var bgPos = imageCounter * slotMachine.iconSize;

		$('.high-light-icon').css('background-position', bgPos + 'px 0px');
		imageCounter++;

	},40);
}

function processHightLightIconsFS(reelPoss, icons){
	var iconsId = icons[(icons.length - 1)];

	var arrReels = Global.Connector.reels.split('|');
	var arrReelsClean = new Array();
	var reelspossClean = reelPoss.replaceAll('"','');
	var ArrReeslPoss = reelspossClean.split(",");

	for(var i=0; i< arrReels.length; i++){
		//console.log('in for one');
		var tempReel = arrReels[i];
		if(typeof(tempReel) != "undefined" && tempReel != null & tempReel.length > 0){
			arrReelsClean.push(tempReel);
		}
	}

	var animatedIconsArrOr = animatedIcons.split(',');
	var tempPath = "";
	$(".high-light-icon").hide();
	for(var j =0 ; j< arrReelsClean.length; j++){
		var iconPos = arrReelsClean[j].indexOf(iconsId);

		if(iconPos >= 0){
			//console.log("Icon", iconsId, "Reel", j, "pos", iconPos)
			var reelStripPos = ArrReeslPoss[j];
			var elementPos = parseInt(reelStripPos) + (iconPos);

			var iconImageArr = $("#reel-"+ (parseInt(j) + 1 )+"-poss-" + elementPos).children().attr('src').split('/');
			var inconName = iconImageArr[iconImageArr.length-1].replace(".png", '');
		
			//console.log("iconPos elementPos ArrReeslPoss arrReels", iconPos ,  elementPos, ArrReeslPoss, arrReels);
			tempPath = tempPath + "" + (iconPos +1 );
			if(animatedIconsArrOr.indexOf(inconName)>= 0){
				$("#reel-"+ (parseInt(j) + 1 )+"-poss-" + elementPos).css('opacity', '0');
				animateIcon( (j+1), (iconPos +1 ), inconName);		
				var elementId = "#high-light-icon-re"+(j+1)+"-ro"+(iconPos +1 );
				$(elementId).show();
			}else{
				$("#reel-"+ (parseInt(j) + 1 )+"-poss-" + elementPos).css('opacity', '1');
				$("#reel-"+ (parseInt(j) + 1 )+"-poss-" + elementPos).addClass('shinning');
			}
		}
	}
	
}

function showFSCounter(show){
	if(show){
		$("#fs-container").show(); 
		$("#val-fs").text(Global.Connector.frees);
		
	}else{
		$("#fs-container").hide(); 
		$("#val-fs").text("--");
	}
}

function updateFSCounter(){
	$("#val-fs").text(Global.Connector.frees);
}

function showWinningLines(lineNumber, price){
	hideAllWinnerLines();
	$("#credits-box" + lineNumber).text(price);
	$("#line" + lineNumber).show(); 
	$("#credits-box" + lineNumber).show();
}

function showAllWinningLines(lineNumber, price){
	//hideAllWinnerLines();
	$("#credits-box" + lineNumber).text(price);
	$("#line" + lineNumber).show(); 
	$("#credits-box" + lineNumber).show();
}

function getWinnerLinesByPath(partPath, coins, symbols) {
	var Paths = Global.Connector.paths.split(',');
	var retorno = "";
    for (var line = 0; line < (Paths.length== Global.Connector.lb? Paths.length: Global.Connector.lb); line++) {
        var _path = Paths[line];
        var displaYPayValue = coins * Global.Connector.cv;
        if(0 == _path.indexOf(partPath))
        {
        	if(retorno == ""){
        		retorno = (line + 1) + ":" + formatWithThousandsNoDecimalZeros(displaYPayValue) + ":" + partPath + ":" + symbols; 
        	}else{
        		retorno += ";" + (line + 1) + ":" + formatWithThousandsNoDecimalZeros(displaYPayValue) + ":" +partPath + ":" + symbols; 
        	}
        }	
    }
    return retorno;
}

function showFreeSpinLabel(show){

	if(show){
		$('#val-total-bet').hide();
		$('#total-bet-label').hide();
		$('#free-spins-label').show();
	}else{
		$('#val-total-bet').show();
		$('#total-bet-label').show();
		$('#free-spins-label').hide();
	}
}

function processFreeSpinsInit(){

	if((typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees != "0")){

		if(isInFreeSpins == 0){
			//acumulateTotalWin = 0;
			$("#global").stop().animate({opacity: 0.8},200,function(){
				$(this).css({'background-image': "url('images/bg/complete-bg-fs.jpg')"})
               .animate({opacity: 1},{duration:200});
 			});

 			$("#spinButton").hide();
 			slotMachine.disable_lines_button();
 			slotMachine.disable_coinvalue_button();
 			showFSCounter(true);
 			//$('#val-total-bet').html("0");
 			showFreeSpinLabel(true);
		}
		isInFreeSpins = 1;
		Global.Connector.fs =1;
		updateFSCounter();
		var timer3 = setTimeout(function(){
			clearTimeout(timer3);
			timer3 = null;
			slotMachine.spin();
			//freeSpinCounter--;
		}, 1000);
	}
	else{

		Global.Connector.fs =0;
		isInFreeSpins = 0;		
		acumulateTotalWin = 0;
		slotMachine.enable_spin_button();
		slotMachine.enable_coinvalue_button();
 		slotMachine.enable_lines_button();
 			
		slotMachine.spinning = false;
		var totalBet = currentLinesBet * Global.Connector.cv;
		$('#val-total-bet').html(formatWithThousandsNoDecimalZerosAndCurrency(totalBet));
		showFreeSpinLabel(false);
	}
}

function processFreeSpins(){

	if((typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees != "0")){

		if(isInFreeSpins == 0){
			//acumulateTotalWin = 0;
			$("#global").stop().animate({opacity: 0.8},200,function(){
				$(this).css({'background-image': "url('images/bg/complete-bg-fs.jpg')"})
               .animate({opacity: 1},{duration:200});
 			});

 			$("#spinButton").hide();
 			//$('#val-total-bet').html("0");
 			showFreeSpinLabel(true);
 			showFSCounter(true);
 			slotMachine.disable_lines_button();
 			slotMachine.disable_coinvalue_button();
		}
		isInFreeSpins = 1;
		slotMachine.end_spin(spinData);
		Global.Connector.fs =1;
		updateFSCounter();
	
		//slotMachine.curBet = 0;
		var timer3 = setTimeout(function(){
			clearTimeout(timer3);
			timer3 = null;
			slotMachine.spin();
		}, 1000);
		

	}else{//normal
		$("#stopButton").hide();
 		$("#spinButton").show();

		if(isInFreeSpins == 1){
			$("#global").stop().animate({opacity: 0.8},200,function(){
				$(this).css({'background-image': "url('images/bg/complete-bg.jpg')"})
               .animate({opacity: 1},{duration:200});
 			});

 			$("#spinButton").show();
 			slotMachine.enable_coinvalue_button();
 			slotMachine.enable_lines_button();
 			
 			showFSCounter(false);
 			slotMachine.end_spin(spinData);

 			var timer4 = setTimeout(function(){
				clearTimeout(timer4);
				timer4 = null;

				$('#credits').html(formatWithThousandsPrecisionAndSymbol(slotMachine.credits));
				processAutoPopupCashier();
			}, 1000);

		}else{
			slotMachine.end_spin(spinData);
		}
		
		Global.Connector.fs = 0;
		isInFreeSpins = 0;		
		acumulateTotalWin = 0;
		slotMachine.spinning = false;
		slotMachine.enable_spin_button();
		var totalBet = currentLinesBet * Global.Connector.cv;
		$('#val-total-bet').html(formatWithThousandsNoDecimalZerosAndCurrency(totalBet));
		showFreeSpinLabel(false);
		if(isTimeToShowInfoMsg()){
			startGetInfoMessage();
		}
	}
}


function openHistoryClick(show){

	var HistoryDataAction = {
	
		Url: '../../DHist/DynamicHistory.aspx',
		GameSession: null,
		DoHistoryDataAction: function () {
		var parameters = "GameSession=" + Global.Connector.gameSession + "&rand=" + Math.floor((Math.random() * 100000) + 1);
	        
	        var xhttp = new XMLHttpRequest();
	        xhttp.onreadystatechange = function() {
	            if (this.readyState == 4 && this.status == 200) {
	                document.getElementById("history-content").innerHTML = this.responseText;
	                if(isMobile.any()){
						$(".DH_TableTd table").addClass("history-text-mobile");
						$(".DH_Table").addClass("history-text-mobile");
					}
	            }
	        };
	        xhttp.open("GET", this.Url+"?"+parameters, true);
	        xhttp.send();
	    }
	}
	HistoryDataAction.DoHistoryDataAction();

	if(show){
		document.getElementById("history-content").innerHTML = '<div class="spinner"><div class="bounce1"></div><div class="bounce2"></div><div class="bounce3"></div></div>';
		$("#historyContainer").show();
	}		
	else{
		$("#historyContainer").hide();
		document.getElementById("history-content").innerHTML = '';
	}
		
}

var lastCalledCoinValue = null;
var lastCalledLinesBet = null;
function openHelpClick(show){
	if(show){
		//set payout URL
		var callpayoutURL = '';
		if(Global.Connector.cv != lastCalledCoinValue || Global.Connector.lb != lastCalledLinesBet ){
			if(payoutURL.indexOf("?") >= 0){
				callpayoutURL = payoutURL+"&GameSession=" + Global.Connector.gameSession + "&coinValue=" + Global.Connector.cv + "&linesBet=" + Global.Connector.lb + "&rand="+(Math.random() * 1000000);
			}else{
				callpayoutURL = payoutURL+"?GameSession=" + Global.Connector.gameSession + "&coinValue=" + Global.Connector.cv + "&linesBet=" + Global.Connector.lb + "&rand="+(Math.random() * 1000000);
			}		

			$('#payout-iframe').attr('src', callpayoutURL);
			lastCalledCoinValue = Global.Connector.cv;
			lastCalledLinesBet = Global.Connector.lb;
		}
		$("#helpContainer").show();
	}		
	else
		$("#helpContainer").hide();
}


//////////Messages
function showErrorMessage(key){

	if(typeof(key) =="undefined" || key == null || key == ""){
		key = "ERR_UNKNOWN";
	}

	var errorTranslation = LanguagesManager.getTranslationByKey(key);
	if (errorTranslation == '') {
		errorTranslation = decodeURIComponent(key);        
    }

    $("#message-text-span").text(errorTranslation);
    $("#error-message").show();
}

function showInfoMessage(key){

	if(typeof(key) =="undefined" || key == null || key == ""){
		key = "ERR_UNKNOWN";
	}

	var messageText =  LanguagesManager.getTranslationByKey(key);
	if (messageText == '') {
		messageText = decodeURIComponent(key);
        
    }

    $("#info-message-text").text(messageText);
    $("#info-message").show();
}

function hideInfoMessage(){
    $("#info-message-text").text("");
    $("#info-message").hide();
    if(isLoading){
    	processFreeSpinsInit();
    }
}

function hideReelsError(){
	$("#ReelContainer").hide();
	try {
		//slotMachine.sounds['spinning'].stop();
		SoundManager.StopAudio("spinning", slotMachine.sounds["spinning"]);
	} catch(err) {}
}

function startGetInfoMessage(){
	if(typeof(Global.Connector.messageId) !="undefined" && Global.Connector.messageId != null && Global.Connector.messageId != ""){
		ServerManager.doMessageAction(finishGetInfoMessage);
	}
}

function finishGetInfoMessage(){
	showInfoMessage(Global.Connector.msgContent);	
}

function isTimeToShowInfoMsg(){
	var isTime = true;

	if(isLoading == false && (isInFreeSpins || Global.Connector.frees != "0")){
		isTime = false;
	}

	return isTime;
}

function doChiptransferBuyInCall(transferAmount, callback){
    try {
        Global.Connector.rand = (Math.random() * 1000000);
        Global.ChipTransfer.toCasino = transferAmount;
        ServerManager.doChiptransferBuyInAction(checkBuyInResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferBuyInCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

/**
 * @description Set the parameters and start CashOut server call
 * @function doChiptransferCashoutCall
 * @param {number} transferAmount is the amount game return to user account
 * @param {function} callback function to be called when chiptransfer cashout is complete
 */
function doChiptransferCashoutCall(transferAmount, callback){
    try {
        Global.Connector.rand = (Math.random() * 1000000);
        Global.ChipTransfer.toAccount = transferAmount;
        ServerManager.doChiptransferCashOutAction(checkCashoutResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferCashoutCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}

function doChiptransferInitCall(callback){
    try{
        Global.Connector.rand = (Math.random() * 1000000);
        ServerManager.doChiptransferInitAction(checkChiptransferInitResponse, callback);
    } catch (err){
        txt = "There was an error on doChiptransferInitCall.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


function checkChiptransferInitResponse(callback){
    try {
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            if (typeof (Global.ChipTransfer.cbalance) != 'undefined' && Global.ChipTransfer.cbalance != null) {
                Global.ChipTransfer.cbalance = parseFloat(Global.ChipTransfer.cbalance);
            }
            if (typeof (Global.ChipTransfer.sbalance) != 'undefined' && Global.ChipTransfer.sbalance != null) {
                Global.ChipTransfer.sbalance = parseFloat(Global.ChipTransfer.sbalance);
            }
            if (typeof (Global.ChipTransfer.maxBuyIn) != 'undefined' && Global.ChipTransfer.maxBuyIn != null) {
                Global.ChipTransfer.MaxBuyIn = parseFloat(Global.ChipTransfer.MaxBuyIn);
            }
            if (typeof (Global.ChipTransfer.defaultBuyIn) != 'undefined' && Global.ChipTransfer.defaultBuyIn != null) {
                Global.ChipTransfer.defaultBuyIn = parseFloat(Global.ChipTransfer.defaultBuyIn);
            }
            if(callback != null){
                callback();  
            }
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
        txt = "There was an error on checkChiptransferInitResponse.\n\n";
        txt += "Error description: " + err.message + "\n\n";
        txt += "Click OK to continue.\n\n";
        alert(txt);
    }
}


function  checkCashoutResponse(callback){
    try{
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            callback();
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
                txt = "There was an error on checkCashoutResponse.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                alert(txt);
        }    
}


function checkBuyInResponse(callback){
    try{
        if (Global.Connector.errorCode == null || Global.Connector.errorCode == '0') {
            callback();//update balance, enable spin buttpn, etc;
        } else {
            Message.showCriticalError(Global.Connector.errd);
        }
    } catch (err){
                txt = "There was an error on checkBuyInResponse.\n\n";
                txt += "Error description: " + err.message + "\n\n";
                txt += "Click OK to continue.\n\n";
                alert(txt);
        }
}

function processLowCredits(){

	//slotMachine.sounds['low-credits'].play();
	slotMachine.sounds['low-credits'] = SoundManager.PlayAudio('low-credits', false);

	$("#credits").addClass("blink-text");
	setTimeout(function(){
		$("#credits").removeClass("blink-text");
		try{
			//slotMachine.sounds['low-credits'].stop();
			SoundManager.StopAudio("low-credits", slotMachine.sounds["low-credits"]);
		}catch(er){}
	},1000);

	if(Global.Connector.bal <= 0 && Global.Connector.showCashier && isInFreeSpins == 0){

		cashierManager.openCashier();
	}
}

function processAutoPopupCashier(){
	var hassFreeSpins = false;
	var visibleCashier = false;
	var visibleError = false;
	var isTournament = false;

	if(typeof(Global.Connector.frees) != "undefined" && Global.Connector.frees != null && Global.Connector.frees != ""  && Global.Connector.frees != "0"){
		hassFreeSpins = true;
	}

	if($("#error-message").is(":visible")){
		visibleError = true;
	}

	if($(".dkCashier-box").is(":visible")){
		visibleCashier = true;
	}
	if ( (Global.Connector.accountId >= 100000000 && Global.Connector.accountId < 200000000) || (Global.Connector.accountId >= 1000000000 && Global.Connector.accountId < 2000000000) ){
		isTournament = true;
	}

	if((Global.Connector.bal <= 0 || (isTournament && typeof(Global.ChipTransfer.tcounter) != "undefined" && Global.ChipTransfer.tcounter != null && Global.ChipTransfer.tcounter != "" && Global.ChipTransfer.tcounter == "0")) && Global.Connector.showCashier && isInFreeSpins == 0 && !hassFreeSpins && !visibleError && !visibleCashier){
		
		autoShowCashierInterval = setTimeout(function(){
			clearTimeout(autoShowCashierInterval);
			autoShowCashierInterval = null;
			cashierManager.openCashier();
		},timeToAutoPopupCashier);
	}else{
		clearTimeout(autoShowCashierInterval);
		autoShowCashierInterval = null;
	}
}

function playBGSound(){
	if(readyToPlayBGSound){	
		try{
			SoundManager.StopAudio("bg", slotMachine.sounds['bg']);
		}catch(er){}
		slotMachine.sounds['bg'] = SoundManager.PlayAudio('bg', true);
		readyToPlayBGSound = false;
	}
}
function readyToPayBG(){
	//console.log("Ready TO play True")
	readyToPlayBGSound = true;
}

function testShowAllLines(){

	for (var i= 1 ; i <= 25; i++){
		$("#line" + i).show(); 
		$("#credits-box" + i).show();
	}

}


function testShowArrayLines(stringlInes){
	var arrayLines = stringlInes.split(',');

	for (var i= 0 ; i < arrayLines.length; i++){
		$("#line" + arrayLines[i]).show(); 
		$("#credits-box" + arrayLines[i]).show();
	}

}

function showFace(){
	if(isInFreeSpins || loadSoundFlag || fastPlay || stopFlag)
		return;


	var number  = getRandomArbitrary(1, 10);
	if(number < 5)
		return;

	var interVal = setInterval(changeBackgroundColor, 100);
	try{		
		if(!loadSoundFlag){			
			slotMachine.sounds['thunder'] = SoundManager.PlayAudio('thunder', false);
			slotMachine.sounds['laugh'] = SoundManager.PlayAudio('laugh', false);
		}

	}catch(er){}

	$("#face").show();
	$("#myCanvas").show();
	$("#face").animate({
	    opacity: 1
	}, 1000,
	    function(){
	    	$("#face").animate({
		        opacity: 0
		    }, 800, function(){
		    	clearInterval(interVal);
		    	interVal = null;
		    	$("#face").hide();
		    	$("#myCanvas").hide();
		    	$("#face").css("opacity", "1");
		    	
	    	});
	    }	
	);


}


function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}



var canvas = document.getElementById("myCanvas");
var context = canvas.getContext("2d");

var colors = [];
colors[0] = "#000000";
colors[1] = "#ffffff";
colors[2] = "#000000";
colors[3] = "#ffffff";
colors[4] = "#000000";

function changeBackgroundColor()
{
  var randomNumber = getRandomInt(0,colors.length);
  context.fillStyle = colors[randomNumber];
  context.fillRect(0,0,canvas.width,canvas.height);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function processStop(){
	if(fastPlay){
		$("#spinButton").hide();
	}

	if(!flagHitsEval){
		
		$("#reel1").stop();
		$("#reel2").stop();
		$("#reel3").stop();
		$("#reel4").stop();
		$("#reel5").stop();

		slotMachine._stop_reel_spinBTN(1, spinData.reels[0]); 
		slotMachine._stop_reel_spinBTN(2, spinData.reels[1]);
		slotMachine._stop_reel_spinBTN(3, spinData.reels[2]); 
		slotMachine._stop_reel_spinBTN(4, spinData.reels[3]); 
		slotMachine._stop_reel_spinBTN(5, spinData.reels[4]); 

		baseTimeout = 0;
		clearTimeout(timerR1);
		timerR1 = null;		
		
		clearTimeout(timerR2);
		timerR2 = null;		 

		clearTimeout(timerR3);
		timerR3 = null;		

		clearTimeout(timerR4);
		timerR4 = null;		

		clearTimeout(timerR5);
		timerR5 = null;

		$("#reel1").stop();
		$("#reel2").stop();
		$("#reel3").stop();
		$("#reel4").stop();
		$("#reel5").stop();		

		setFastValues();
		
		clearInterval(animateWinInterval);
		animateWinInterval = null;
		evaluteHits();
	}		

	$("#stopButton").hide();
	if(fastPlay){
		var showSPINTime = setTimeout(function(){clearTimeout(showSPINTime); showSPINTime = null;$("#spinButton").show();}, 200);	
	}else{
		$("#spinButton").show();
	}
	
}

function setFastValues(){
	animationLinesTime = 1;
	timeToSpecialHits = 1;
	timeToPrcessFreeSpins = 200;
	noHitsTimer = 1;

	hitsIterationTime = 1;
	timeToSpecialHitsCopy = 1; 
	baseTimeout = 0;
	timeIncrement = 1;
	tickDelay = 1;
	opacityReelTime = 1;
	slotMachine.bounceTime = 1;

	slotMachine.secondReelStopTime = 1;
	slotMachine.thirdReelStopTime = 1;
	animationsFrames = 1000;
}

function toggle_fastPlay(){
    if ($('#fastPlayButton').hasClass("on")) {
        fastPlay =false;
    } else {
        fastPlay =true;
    }
    $('#fastPlayButton').toggleClass("on");
}
