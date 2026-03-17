const ReelRun = () => {
	app.reel1.run = app.tweens.createTimeline();
	app.reel2.run = app.tweens.createTimeline();
	app.reel3.run = app.tweens.createTimeline();
	app.reel4.run = app.tweens.createTimeline();
	app.reel5.run = app.tweens.createTimeline();
	app.reel1.loop = 2;
	app.reel2.loop = 2;
	app.reel3.loop = 2;
	app.reel4.loop = 2;
	app.reel5.loop = 2;

	// Reel 1
    app.reel1.run.add({
        targets: app.reel1,
        y: app.gamecfg.symbol_height * 4,
        ease: 'Linear',
        duration: 350,
        onStart: () => {
        	PlayAudio('reel_start');
    	}        
    });    

    app.reel1.run.add({
        targets: app.reel1,
        y: app.gamecfg.symbol_height * 6,
        ease: 'Linear',
        duration: 250,
        onComplete: () => { 
        	changeSymbol(app.reel1, 19, app.gamedata.symbols[0][0]);
        	changeSymbol(app.reel1, 18, app.gamedata.symbols[0][1]);
			changeSymbol(app.reel1, 17, app.gamedata.symbols[0][2]);
        }
    });

    app.reel1.run.add({
        targets: app.reel1,
        y: app.gamecfg.symbol_height * 17,
        ease: 'Linear',
        duration: 800,
        loop: app.reel1.loop
    });

    app.reel1.run.add({
        targets: app.reel1,
        y: app.gamecfg.symbol_height * 19,
        ease: 'Back.easeOut',
        duration: 400,
        onComplete: () => {  	
        	changeSymbol(app.reel1, 2, app.gamedata.symbols[0][0]);
        	changeSymbol(app.reel1, 1, app.gamedata.symbols[0][1]);
			changeSymbol(app.reel1, 0, app.gamedata.symbols[0][2]);
        	app.reel1.y = app.reel1.origy;
            PlayAudio('reel_stop');
        },   
    }); 

	// Reel 2
    app.reel2.run.add({
        targets: app.reel2,
        y: app.gamecfg.symbol_height * 4,
        ease: 'Linear',
        duration: 350,
        delay: 250
    });    

    app.reel2.run.add({
        targets: app.reel2,
        y: app.gamecfg.symbol_height * 6,
        ease: 'Linear',
        duration: 250,
        onComplete: () => { 
        	changeSymbol(app.reel2, 19, app.gamedata.symbols[1][0]);
        	changeSymbol(app.reel2, 18, app.gamedata.symbols[1][1]);
			changeSymbol(app.reel2, 17, app.gamedata.symbols[1][2]);
        }        
    });

    app.reel2.run.add({
        targets: app.reel2,
        y: app.gamecfg.symbol_height * 17,
        ease: 'Linear',
        duration: 800,
        loop: app.reel2.loop
    });

    app.reel2.run.add({
        targets: app.reel2,
        y: app.gamecfg.symbol_height * 19,
        ease: 'Back.easeOut',
        duration: 400,
        onComplete: () => { 
        	changeSymbol(app.reel2, 2, app.gamedata.symbols[1][0]);
        	changeSymbol(app.reel2, 1, app.gamedata.symbols[1][1]);
			changeSymbol(app.reel2, 0, app.gamedata.symbols[1][2]);
        	app.reel2.y = app.reel2.origy;
            PlayAudio('reel_stop');
        }, 
    });    

	// Reel 3
    app.reel3.run.add({
        targets: app.reel3,
        y: app.gamecfg.symbol_height * 4,
        ease: 'Linear',
        duration: 350,
        delay: 500
    });    

    app.reel3.run.add({
        targets: app.reel3,
        y: app.gamecfg.symbol_height * 6,
        ease: 'Linear',
        duration: 250,
        onComplete: () => { 
        	changeSymbol(app.reel3, 19, app.gamedata.symbols[2][0]);
        	changeSymbol(app.reel3, 18, app.gamedata.symbols[2][1]);
			changeSymbol(app.reel3, 17, app.gamedata.symbols[2][2]);
        }        
    });

    app.reel3.run.add({
        targets: app.reel3,
        y: app.gamecfg.symbol_height * 17,
        ease: 'Linear',
        duration: 800,
        loop: app.reel3.loop
    });

    app.reel3.run.add({
        targets: app.reel3,
        y: app.gamecfg.symbol_height * 19,
        ease: 'Back.easeOut',
        duration: 400,
		onComplete: () => {
        	changeSymbol(app.reel3, 2, app.gamedata.symbols[2][0]);
        	changeSymbol(app.reel3, 1, app.gamedata.symbols[2][1]);
			changeSymbol(app.reel3, 0, app.gamedata.symbols[2][2]);
        	app.reel3.y = app.reel3.origy;
            PlayAudio('reel_stop');
        },           
    });    

	// Reel 4
    app.reel4.run.add({
        targets: app.reel4,
        y: app.gamecfg.symbol_height * 4,
        ease: 'Linear',
        duration: 350,
        delay: 750
    });    

    app.reel4.run.add({
        targets: app.reel4,
        y: app.gamecfg.symbol_height * 6,
        ease: 'Linear',
        duration: 250,
        onComplete: () => { 
        	changeSymbol(app.reel4, 19, app.gamedata.symbols[3][0]);
        	changeSymbol(app.reel4, 18, app.gamedata.symbols[3][1]);
			changeSymbol(app.reel4, 17, app.gamedata.symbols[3][2]);
        }        
    });

    app.reel4.run.add({
        targets: app.reel4,
        y: app.gamecfg.symbol_height * 17,
        ease: 'Linear',
        duration: 800,
        loop: app.reel4.loop
    });

    app.reel4.run.add({
        targets: app.reel4,
        y: app.gamecfg.symbol_height * 19,
        ease: 'Back.easeOut',
        duration: 400,
        onComplete: () => {
        	changeSymbol(app.reel4, 2, app.gamedata.symbols[3][0]);
        	changeSymbol(app.reel4, 1, app.gamedata.symbols[3][1]);
			changeSymbol(app.reel4, 0, app.gamedata.symbols[3][2]);
        	app.reel4.y = app.reel4.origy;
            PlayAudio('reel_stop');
        },          
    });    

	// Reel 5
    app.reel5.run.add({
        targets: app.reel5,
        y: app.gamecfg.symbol_height * 4,
        ease: 'Linear',
        duration: 350,
        delay: 1000
    });    

    app.reel5.run.add({
        targets: app.reel5,
        y: app.gamecfg.symbol_height * 6,
        ease: 'Linear',
        duration: 250,
        onComplete: () => { 
        	changeSymbol(app.reel5, 19, app.gamedata.symbols[4][0]);
        	changeSymbol(app.reel5, 18, app.gamedata.symbols[4][1]);
			changeSymbol(app.reel5, 17, app.gamedata.symbols[4][2]);
        }        
    });

    app.reel5.run.add({
        targets: app.reel5,
        y: app.gamecfg.symbol_height * 17,
        ease: 'Linear',
        duration: 800,
        loop: app.reel5.loop
    });

    app.reel5.run.add({
        targets: app.reel5,
        y: app.gamecfg.symbol_height * 19,
        ease: 'Back.easeOut',
        duration: 400,
        onComplete: () => {
        	changeSymbol(app.reel5, 2, app.gamedata.symbols[4][0]);
        	changeSymbol(app.reel5, 1, app.gamedata.symbols[4][1]);
			changeSymbol(app.reel5, 0, app.gamedata.symbols[4][2]);
        	app.reel5.y = app.reel5.origy;
            PlayAudio('reel_stop');
    		app.fields.message.text = '';
        	checkWinlines(false);     	
        }, 
    });    

    app.reel1.run.play();
    app.reel2.run.play();
    app.reel3.run.play();
    app.reel4.run.play();
    app.reel5.run.play();
}