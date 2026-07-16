
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.0 Transitional//EN" >
<html>
<head>
	<title>BoogeyMan</title>
	<base href="https://apps.2bettvs.com/games/SWF/">
    <link href="../aspnet/Launch/Launch.css?rand=20180403" type="text/css" rel="stylesheet">
    <script src="../aspnet/scripts/jquery-1.8.2.min.js"></script>
    <script src="../aspnet/Launch/ms-full-screen.js"></script> 
    <script language="javascript" src="../aspnet/Launch/Game.js?refresh=20180403"></script>
	<script language="javascript" src="../aspnet/Launch/AC_RunActiveContent.js?refresh=20180403"></script>	
    <script language="javascript" src="../aspnet/Launch/Custom.js?refresh=20180403"></script>	
    <meta name="apple-mobile-web-app-capable" content="yes" />
</head>
<body onunload="ExitGameX('unload')" onbeforeunload="ExitGame('beforeunload')">
   
	 
   <div id="HTML5Frame" webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="">
        <div id="ios-bars-hand" class="ios-bars-hand">
	        <img src="../aspNET/Launch/hand-animation.gif" class="hand-animation"/>
	    </div>  
	    <iframe id="HTML5IFrame" width="100%" frameBorder="0" height="100%" webkitallowfullscreen="" mozallowfullscreen="" allowfullscreen="" src="../aspNET/../clASSiC/HTML5gameS/SL5R-bm/IndEX.htML?Token=&CasinoGameId=299&AccountId=1&Lang=en&gamepath=../aspNET/&gamesession=981262592|299|42664716|1|438407_97832584_207709682_2219441A716BF821BACCF850BBD04036|en&lang=en&gamecode=SL5R-BM&showcashier=0&showhistory=1&showtype=1&showchips=0.01,0.05,0.10,0.25,0.50,1.00,2.00,5.00,¢,K,$&shownavbar=1&showrebates=0&gamelibs=(AutoMan)Default-b3,(BuyIn)Default-b7,(Dummy)Animation,(JackpotBar)Center-b10,(NavBar)Classic-b9&currency=USD,$,¢,p,5,2&noexit=1&servertime=04:09:00"></iframe>
   </div>
	<form method="post" action="../aspnet/Launch/Help.aspx" target="CasinoSolutionsHelpWindow">
		<input type="hidden" name="AccountID" value="1">
<input type="hidden" name="login" value="RGV105_0">
<input type="hidden" name="FlashVars" value="gamepath=../aspNET/&gamesession=981262592|299|42664716|1|438407_97832584_207709682_2219441A716BF821BACCF850BBD04036|en&lang=en&gamecode=SL5R-BM&showcashier=0&showhistory=1&showtype=1&showchips=0.01,0.05,0.10,0.25,0.50,1.00,2.00,5.00,¢,K,$&shownavbar=1&showrebates=0&gamelibs=(AutoMan)Default-b3,(BuyIn)Default-b7,(Dummy)Animation,(JackpotBar)Center-b10,(NavBar)Classic-b9&currency=USD,$,¢,p,5,2&noexit=1&servertime=04:09:00">
<input type="hidden" name="Description" value="BoogeyMan">
<input type="hidden" name="SwfVerStr" value="-1">
<input type="hidden" name="password" value="Dummy">
<input type="hidden" name="HelpFile" value="">
<input type="hidden" name="FlashFile" value="../clASSiC/HTML5gameS/SL5R-bm/IndEX.htML">
<input type="hidden" name="RefreshLobby" value="False">
<input type="hidden" name="BaseUrl" value="https://apps.2bettvs.com/games/">
<input type="hidden" name="casinogameid" value="299">
<input type="hidden" name="noexit" value="1">
<input type="hidden" name="FlashVersion" value="11.0.0.0">
<input type="hidden" name="Lang" value="en">

        <input type="hidden" name="FlashFileNoExt" value="" />
	</form>

 <script language="javascript">

	try{
		var GameHelpPage = document.forms[0].HelpFile.value;

		if (GameHelpPage != null && GameHelpPage != undefined) {
			GameHelpPage = GameHelpPage.replace("LanguageFiles", "LanguageFilesMobile");
		}

		var source = $('#HTML5IFrame').attr("src");
		source = source + "&helpfile=" + encodeURIComponent(GameHelpPage);

		$('#HTML5IFrame').attr("src", source);

	} catch (e) { }



 </script>  

    <form id="LaunchForm" name="LaunchForm" method="post" target="_self" action="../aspNET/Launch/Enter.aspx">
       <input type="hidden" name="Token" value="">
       <input type="hidden" name="CasinoGameId" value="299">
       <input type="hidden" name="GameCode" value="">
       <input type="hidden" name="AccountId" value="1">
       <input type="hidden" name="Lang" value="en">
       
          <input type="hidden" name="noexit" value="1">
        
    </form>

    <div class="custom-heart-beat" style="visibility:hidden; top:-999999"></div>   
</body>
</html>
