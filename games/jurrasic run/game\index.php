<?php
$lang = isset($_GET['lang']) ? $_GET['lang'] : 'en';
$resolution = isset($_GET['resolution']) ? $_GET['resolution'] : 'middle';
?>
<!DOCTYPE html>
<html lang="<?=$lang;?>">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Jurassic Giants</title>
        
        <style>
            * {
                margin: 0;
                padding: 0;
            }
            @font-face {
	            font-family: "Upcfb";
	            src: url("fonts/upcfb.ttf") ;
	        }
        </style>
    </head>
    <body>
        <div id="game-container" style="width: 800px;"></div>
        <script>
            const langcode = '<?=$lang;?>';
            const resolution = '<?=$resolution;?>';
        </script>        
        <script src="js/phaser.min.js"></script>
        <script src="js/game.js"></script>
        <script src="js/reel_animation.js"></script>
    </body>
</html>