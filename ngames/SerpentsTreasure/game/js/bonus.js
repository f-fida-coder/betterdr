var totalFailded = 0;
var clickecFieldsArr = new Array();
var totalWin = 0;
var BRCompleted = false;
var BROpen = false;
var coinsWonTotal = 0;
var clickArray = new Array();
var currentClick = 0;
var isInAnimation = false;
var multiplier = 1;
var brtries = null;
var brindex = null;
var brCoins = null;
var priceArray = new Array();
var firstLoad = true;

var prizes = new Array();

prizes[0] = 5;
prizes[1] = 500;
prizes[2] = 10;
prizes[3] = 40;
prizes[4] = 5;
prizes[5] = 75;
prizes[6] = 15;
prizes[7] = 30;
prizes[8] = 5;
prizes[9] = 100;
prizes[10] = 10;
prizes[11] = 40;
prizes[12] = 5;
prizes[13] = 50;
prizes[14] = 15;
prizes[15] = 30;
prizes[16] = 5;
prizes[17] = 250;
prizes[18] = 10
prizes[19] = 25;
prizes[20] = 5;
prizes[21] = 40;
prizes[22] = 15;
prizes[23] = 50;
prizes[24] = 5;
prizes[25] = 30;
prizes[26] = 10;
prizes[27] = 100;
prizes[28] = 5;
prizes[29] = 25;
prizes[30] = 15;
prizes[31] = 75;
prizes[32] = 5;
prizes[33] = 40;
prizes[34] = 10;
prizes[35] = 30;


function afterBonusClose(){
	
	var totalFinalWon = brCoins * multiplier;
	
	hideBonus(totalFinalWon);	
} 

function hideBonus(totalFinalWon){
	$(".reel-icon").css('opacity', '1');
	if(typeof(Global.Connector.cow) == "undefined" || Global.Connector.cow == null || Global.Connector.cow == "")
		Global.Connector.cow = 0;

	Global.Connector.cow = parseInt(Global.Connector.cow) + totalFinalWon;

	var bonusPaidUpdate = (Global.Connector.cow *  Global.Connector.cv);

	$('#lastWin').html(formatWithThousandsNoDecimalZeros(bonusPaidUpdate)); 

	var hideTimeout = setTimeout(function(){
		$('#bonus-container').hide(); 
		BRCompleted = true; 
		BROpen = false;

		if(callBackBonus){
			processFreeSpinsInit();
		}
		Global.BonusRound.brvars = null;
		Global.BonusRound.brlap = null;
		Global.BonusRound.brtry = null;
		Global.BonusRound.brlas = null;

		clearTimeout(hideTimeout);
		hideTimeout = null;
	},1500);
}

function ResetBonusRound(){
	totalFailded = 0;
	clickecFieldsArr = new Array();
	totalWin = 0;
	coinsWonBR = 0;
	clickArray = new Array();
	isInAnimation = false;
	currentClick = 0;
	stopPrice = null;
	priceArray =  new Array();
	pricesArray =  new Array();

	brindex =null;
	brtries = null;
	brCoins = null;
	Global.BonusRound.brlap = null;
	Global.BonusRound.brtry = null;
	Global.BonusRound.brlas = null;

	$("#won-test").text("");
	$("#won-test-2").text("");

	$("#tries-left-val").text("");
	$("#tries-left-val-2").text("");
	$("#won-mult").text("");

    $("#won-container").hide();
    $("#won-container-2").hide();

    for(var i = 0; i <=36; i++){
		$(".price").removeClass("price-rand-" + i);
		$(".price").removeClass("price-win-" + i);
	}

    titleIsOnFlag = true;
    stopAll = false;
    gameEnd = false;

    try{
    	stage.clear();
    }catch(err){}

} 

function initBonusRound(){

	if(!BROpen){
		BROpen = true;

		if(firstLoad){
			firstLoad =false;
			addBtnActions();

		}
	
		ResetBonusRound();
		if(typeof(Global.BonusRound.brvars)== "undefined" || Global.BonusRound.brvars == null || Global.BonusRound.brvars == ""){
			Global.BonusRound.act = 'spin';
			ServerManager.doGetBonus(afterBonusInit, function(){});
		}
		else{
			afterBonusInit();
		}
		/*Global.BonusRound.act = 'spin';
		ServerManager.doGetBonus(afterBonusInit, function(){});*/

		if(typeof(Global.Connector.brmult) != "undefined" && Global.Connector.brmult != null && Global.Connector.brmult != ""){
			multiplier = Global.Connector.brmult;
		} else if(typeof(Global.BonusRound.brmult) != "undefined" && Global.BonusRound.brmult != null && Global.BonusRound.brmult != ""){
		 	multiplier = Global.BonusRound.brmult;
		
		}else{
			alert("Error Multiplier")
		}

		if(typeof(multiplier) != "undefined" && multiplier != null && multiplier != "" && parseInt(multiplier)>1){
			$("#won-mult").text( multiplier + "X" );
		}else{
			$("#won-mult").text("");
		}
		
	}

}

function getIndexByAmount(amt){
	var indexes = new Array();
	for(var i= 0; i< prizes.length; i++){
		if(prizes[i] == amt){
			indexes.push(i+1);
		}
		
	}
	if(indexes == null || indexes.length == 0){
		alert("INCORRECT PRIZE!");
		return;
	}

	if(indexes.length > 1){
		var tempI = Math.floor(Math.random() * indexes.length); 
		return indexes[tempI]; 

	}else{
		return indexes[0];
	}
}

function addBtnActions(){
	$('#btn-yes').click(function() {proccessYesClcik();});
	$('#btn-no').click(function() {proccessNoClcik();});
	$('#btn-ok').click(function() {proccessNoClcik();});
}

function proccessYesClcik(){
	//
	slotMachine.sounds['bonus-btn'] = SoundManager.PlayAudio('bonus-btn', false);
	Global.BonusRound.act = 'spin';
	ServerManager.doGetBonus(afterClickYes, function(){});
	$("#won-container").hide();
    $("#won-container-2").hide();
}

function afterClickYes(){
	if(typeof(Global.BonusRound.brvars) != "undefined" && Global.BonusRound.brvars != null && Global.BonusRound.brvars != ""){
		var brvarsArray = Global.BonusRound.brvars.split('.');
		var coinsWonBR = parseInt(brvarsArray[3]);
		brCoins = coinsWonBR;
		brtries = parseInt(brvarsArray[0]);
		brindex = parseInt(brvarsArray[2]);


		spinNumbers(10, getIndexByAmount(brCoins));
		
	}else if( (typeof(Global.BonusRound.brtry) != "undefined" && Global.BonusRound.brtry != null && Global.BonusRound.brtry != "")
				&& (typeof(Global.BonusRound.brlas) != "undefined" && Global.BonusRound.brlas != null && Global.BonusRound.brlas != "")
				&& (typeof(Global.BonusRound.brlap) != "undefined" && Global.BonusRound.brlap != null && Global.BonusRound.brlap != "")
		)
	{
		brCoins = parseInt(Global.BonusRound.brlap);
		brtries = parseInt(Global.BonusRound.brtry);
		brindex = parseInt(Global.BonusRound.brlas);

		spinNumbers(10, getIndexByAmount(brCoins));


	}else{
		alert("INVALID BONUROUND ACTION afterClickYes")
	}

}

function proccessNoClcik(){
	slotMachine.sounds['bonus-btn'] = SoundManager.PlayAudio('bonus-btn', false);
	Global.BonusRound.act = 'keep';
	ServerManager.doGetBonus(afterClickNo, function(){});

	$("#won-container").hide();
    $("#won-container-2").hide();
}

function afterClickNo(){
	if(typeof(Global.BonusRound.brvars) != "undefined" && Global.BonusRound.brvars != null && Global.BonusRound.brvars != ""){
		var brvarsArray = Global.BonusRound.brvars.split('.');
		var coinsWonBR = parseInt(brvarsArray[3]);
		brCoins = coinsWonBR;
		brtries = parseInt(brvarsArray[0]);
		brindex = parseInt(brvarsArray[2]);
		afterBonusClose();
		
	}else if( (typeof(Global.BonusRound.brtry) != "undefined" && Global.BonusRound.brtry != null && Global.BonusRound.brtry != "")
				&& (typeof(Global.BonusRound.brlas) != "undefined" && Global.BonusRound.brlas != null && Global.BonusRound.brlas != "")
				&& (typeof(Global.BonusRound.brlap) != "undefined" && Global.BonusRound.brlap != null && Global.BonusRound.brlap != "")
		)
	{
		brCoins = parseInt(Global.BonusRound.brlap);
		brtries = parseInt(Global.BonusRound.brtry);
		brindex = parseInt(Global.BonusRound.brlas);

		afterBonusClose();


	}else{
		alert("INVALID BONUROUND ACTION afterClickNo")
	}

}

function afterBonusInit(){
	
	var showBonusTimeOut = setTimeout(function(){
		$('#bonus-container').show();
		
		clearTimeout(showBonusTimeOut);
		showBonusTimeOut= null;	
	
		if(typeof(Global.BonusRound.brvars) != "undefined" && Global.BonusRound.brvars != null && Global.BonusRound.brvars != ""){
			var brvarsArray = Global.BonusRound.brvars.split('.');
			var coinsWonBR = parseInt(brvarsArray[3]);
			brCoins = coinsWonBR;
			brtries = parseInt(brvarsArray[0]);
			brindex = parseInt(brvarsArray[2]);
			/*stopPrice = coinsWonTotal;
			createPriceArray(stopPrice);
			initWheelBonus();*/
			setTimeout(function(){initAni();}, 1000)
			
		}else if( (typeof(Global.BonusRound.brtry) != "undefined" && Global.BonusRound.brtry != null && Global.BonusRound.brtry != "")
					&& (typeof(Global.BonusRound.brlas) != "undefined" && Global.BonusRound.brlas != null && Global.BonusRound.brlas != "")
					&& (typeof(Global.BonusRound.brlap) != "undefined" && Global.BonusRound.brlap != null && Global.BonusRound.brlap != "")
			)
		{
			brCoins = parseInt(Global.BonusRound.brlap);
			brtries = parseInt(Global.BonusRound.brtry);
			brindex = parseInt(Global.BonusRound.brlas);
			setTimeout(function(){initAni();}, 1000)
		}else{
			alert("INVALID BONUROUND ACTION afterBonusInit")
		}
	}, 1000);

}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}


function createPriceArray(price){
	priceArray = new Array();

	priceArray.push(price);

	while(priceArray.length < 8){
		var tempPrice = (parseInt(Math.floor(((Math.random() + 1) * 10000)/100)) * 10)%1000;
		if(priceArray.indexOf(tempPrice)<0 && tempPrice > 0){
			priceArray.push(tempPrice);
		}
	}
	shuffle(priceArray);
}

		
function initAni(){
	/*brtries = 3;
	brindex = 18;
	brCoins = 100;*/
	spinNumbers(10, getIndexByAmount(brCoins));
}


function spinNumbers(jumps, index){
	/*if(brtries <= 0){
		return;
	}*/

	//brtries--;

	var totalIterations = jumps;
	var endIndex = index;

	var interval = setInterval(function(){
		if(totalIterations <= 0){
			clearInterval(interval);
			interval = null;
			for(var i = 0; i <=36; i++){
				$(".price").removeClass("price-rand-" + i);
				$(".price").removeClass("price-win-" + i);
			}

			$("#price-" + endIndex).addClass("price-win-"+endIndex);
			try{
				SoundManager.StopAudio("bonus-jump", slotMachine.sounds['bonus-jump']);
			}catch(er){}
			slotMachine.sounds['bonus-stop'] = SoundManager.PlayAudio('bonus-stop', false);

			var t1 = setTimeout(function() {
				clearTimeout(t1);
				t1 = null;
				showBox();
			}, 1000);

		}else{
			if(totalIterations==jumps)
				slotMachine.sounds['bonus-jump'] = SoundManager.PlayAudio('bonus-jump', false);
			for(var i = 0; i <=36; i++){
				$(".price").removeClass("price-rand-" + i);
				$(".price").removeClass("price-win-" + i);
			}
			var randID = Math.floor((Math.random() * 36) + 1);
			$("#price-" + randID).addClass("price-rand-"+randID);
			totalIterations--;

		}
	}, 300);
}

function showBox(){

	if(brtries > 0){
		$("#tries-left-val").text(brtries);
		$("#won-test").text((brCoins * multiplier));
		$("#won-container").fadeIn(500);
	}else{
		$("#tries-left-val-2").text(brtries);
		$("#won-test-2").text((brCoins * multiplier));
		$("#won-container-2").fadeIn(500);
	}
	
}

	