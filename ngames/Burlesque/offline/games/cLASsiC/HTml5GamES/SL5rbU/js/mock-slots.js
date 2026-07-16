/*
 * mock-slots.js  —  Offline server emulator for "Burlesque" (SL5rbU).
 * Slots9R9 framework. Reel strips / paylines / paytable are the exact values
 * captured from the real Init.aspx, so base-game payouts match 1:1.
 * Verified: reproduces cow+hits for all captured spins exactly (lb-aware).
 * Not emulated: free-spins bonus (scatter X) and expanding wild.
 */
(function () {
    'use strict';
    var BAL_KEY = 'bu_offline_balance';
    var START_BALANCE = 2000.00;
    var REESA = "HGDCFEHGBDACFXHGEBFDCHGAEFBDHGCWEAFHGDBXCFEHGADBFEHGCFDABHGEWCFHGDEBAXFCHGDEBFAHGCDEFHGBWCAFEDHGXBFCHGEDAFBHGCEDFAWHGBECDFHGABEF,HGCBFXHGDECAFBHGDFCEHGABXDFHCGEABFHDGCXHFEWGDBACHFGEDHBFCAGXHEDFGCBAHFDGECXHWBFAGDHECFBGHDAFXCGEHBFDGCAHEFBDGXHWCFAEGHDBCFGHAEDF,HGDFHGCEAFHGDEFXBHGCEFHGDFAEHGXBFDHGCEFHGWEDFXBHGACFEHGDFHGEXBFHGDCEAFHGEFWDHGXBFCEHGADFHGEXBFHGCEDFHGEFAHGXBDWFCEHGFDHGEXBFHGEF,HGDFXCHGEFDHGBEAFXHGCDEFHGBFEHGDAXFCHGEDFBHGXAEFHGDCFEBHGWXFDAHGEFCHGBDEFXHGAFEDHGCBFXHGEDFAHGEBCFHGDXWEFHGADFBEHGCXFHGEDFABHGEF,HGDXFEHCGDFEHGBAXFHEDGCFHWEGBDAXFHEGDHFCGEBHXFADGEWHFGBEDCHXFGAEHDFGBEHWXFDCGAEHFGBDEHXFGHEACDFWGBHEXFDGHEAFCGBHDEXFGHWDEFAGBHEF";
    var PATHS = "22222,11111,33333,12321,32123,11211,33233,21112,23332,11233,33211,21232,23212,12121,32323,12221,32223,21212,23232,22122,22322,13331,31113,13131,31313";
    var PAYT  = "3A:50,4A:500,5A:2500,3B:40,4B:200,5B:1500,3C:30,4C:150,5C:1000,3D:25,4D:100,5D:500,3E:20,4E:80,5E:200,3F:10,4F:50,5F:100,3G:10,4G:50,5G:100,3H:10,4H:50,5H:100,3W:250,4W:2500,5W:8000,3X:FS5,4X:FS15,5X:FS30";
    var INIT_TEMPLATE = "incoins=0&availablebalance=&minb=0.01&tcounter=&bal=%BAL%&cvals=0.01%2C0.05%2C0.10%2C0.25%2C0.50%2C1.00%2C2.00&gid=&blocknote=&mysts=&cvalsd=1%C2%A2%2C5%C2%A2%2C10%C2%A2%2C25%C2%A2%2C50%C2%A2%2C%241%2C%242&brvars=&reels=&afeat=0&messageids=&cuvars=&brpayt=&maxb=50.00&lb=25&lc=1&reesa=HGDCFEHGBDACFXHGEBFDCHGAEFBDHGCWEAFHGDBXCFEHGADBFEHGCFDABHGEWCFHGDEBAXFCHGDEBFAHGCDEFHGBWCAFEDHGXBFCHGEDAFBHGCEDFAWHGBECDFHGABEF,HGCBFXHGDECAFBHGDFCEHGABXDFHCGEABFHDGCXHFEWGDBACHFGEDHBFCAGXHEDFGCBAHFDGECXHWBFAGDHECFBGHDAFXCGEHBFDGCAHEFBDGXHWCFAEGHDBCFGHAEDF,HGDFHGCEAFHGDEFXBHGCEFHGDFAEHGXBFDHGCEFHGWEDFXBHGACFEHGDFHGEXBFHGDCEAFHGEFWDHGXBFCEHGADFHGEXBFHGCEDFHGEFAHGXBDWFCEHGFDHGEXBFHGEF,HGDFXCHGEFDHGBEAFXHGCDEFHGBFEHGDAXFCHGEDFBHGXAEFHGDCFEBHGWXFDAHGEFCHGBDEFXHGAFEDHGCBFXHGEDFAHGEBCFHGDXWEFHGADFBEHGCXFHGEDFABHGEF,HGDXFEHCGDFEHGBAXFHEDGCFHWEGBDAXFHEGDHFCGEBHXFADGEWHFGBEDCHXFGAEHDFGBEHWXFDCGAEHFGBDEHXFGHEACDFWGBHEXFDGHEAFCGBHDEXFGHWDEFAGBHEF&tcountertype=&frees=0&brclid=&jackpot=&fsmult=&iserr=0&maxlc=1&maxlb=25&payt=3A:50,4A:500,5A:2500,3B:40,4B:200,5B:1500,3C:30,4C:150,5C:1000,3D:25,4D:100,5D:500,3E:20,4E:80,5E:200,3F:10,4F:50,5F:100,3G:10,4G:50,5G:100,3H:10,4H:50,5H:100,3W:250,4W:2500,5W:8000,3X:FS5,4X:FS15,5X:FS30&paths=22222,11111,33333,12321,32123,11211,33233,21112,23332,11233,33211,21232,23212,12121,32323,12221,32223,21212,23232,22122,22322,13331,31113,13131,31313&brplog=&lastgameid=%GID%&brlevs=&minlb=1&brmult=&twks=&cv=0.05&allsym=FEHBGADWXC";
    var strips = REESA.split(','), paths = PATHS.split(','), payt = {};
    PAYT.split(',').forEach(function (e) { var p = e.split(':'); payt[p[0]] = p[1]; });
    var GID = 611400000;
    function getBal(){var b=parseFloat(localStorage.getItem(BAL_KEY));if(isNaN(b)){b=START_BALANCE;setBal(b);}return b;}
    function setBal(b){localStorage.setItem(BAL_KEY,(Math.round(b*100)/100).toFixed(2));}
    function rnd(n){return Math.floor(Math.random()*n);}
    function spinReel(s){var L=s.length,i=rnd(L);return s[i]+s[(i+1)%L]+s[(i+2)%L];}
    function evaluate(reels, lb){
        var active=paths.slice(0,lb),total=0,hits=[];
        for(var li=0;li<active.length;li++){
            var path=active[li],syms=[];
            for(var r=0;r<5;r++)syms.push(reels[r].charAt(parseInt(path.charAt(r),10)-1));
            var base=null;
            for(var k=0;k<5;k++){if(syms[k]!=='W'){base=syms[k];break;}}
            if(base===null)base='W'; if(base==='X')continue;
            var cnt=0;
            for(var m=0;m<5;m++){if(syms[m]===base||syms[m]==='W')cnt++;else break;}
            for(var c=cnt;c>=2;c--){var key=c+base;
                if(payt[key]&&payt[key].indexOf('FS')!==0){var coins=parseInt(payt[key],10);total+=coins;
                    hits.push(path.substring(0,Math.min(c+1,5))+'.'+c+base+'.'+coins);break;}}
        }
        return {cow:total,hits:hits};
    }
    function initResponse(){return INIT_TEMPLATE.replace('%BAL%',getBal().toFixed(2)).replace('%GID%',(++GID));}
    function heartbeatResponse(){return 'errorcode=0&errordetails=&GameBalance='+getBal().toFixed(2)+'&availablebalance=&jackpot=&mysts=&tcounter=&messageids=&blocknote=';}
    function spinResponse(p){
        var lb=parseInt(p.lb,10)||25,lc=parseInt(p.lc,10)||1,cv=parseFloat(p.cv)||0.05;
        setBal(getBal()-lb*lc*cv);
        var reels=[];for(var r=0;r<5;r++)reels.push(spinReel(strips[r]));
        var res=evaluate(reels,lb);
        if(res.cow>0)setBal(getBal()+res.cow*cv);
        var gid=(++GID);
        return 'mult=&blocknote=&messageids=&iserr=0&brvars=&reels=|'+reels.join('|')+'|&brclid=&cow='+res.cow+'&tcounter=&gid='+gid+'&frees=0&morls=&availablebalance=&afeat=0&fsmult=&cuvars=&bal='+getBal().toFixed(2)+'&reesa=&jackpot=&lastgameid='+gid+'&mysts=&hits='+res.hits.join(',')+'&brpayt=&brmult=';
    }
    function parseBody(data){var o={};if(!data)return o;String(data).split('&').forEach(function(kv){var i=kv.indexOf('=');if(i<0){o[kv]='';return;}o[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1));});return o;}
    function handle(url,body){var u=String(url).toLowerCase(),p=parseBody(body);
        if(u.indexOf('init.aspx')>=0)return initResponse();
        if(u.indexOf('spin.aspx')>=0)return spinResponse(p);
        if(u.indexOf('heartbeat.aspx')>=0)return heartbeatResponse();
        if(u.indexOf('enter.aspx')>=0||u.indexOf('game.aspx')>=0)return 'GAMESESSION=offline&errcode=0';
        return null;}
    function install($){var realAjax=$.ajax;
        $.ajax=function(a,b){var opts=(typeof a==='object')?a:(b||{});if(typeof a==='string')opts.url=a;
            var resp=null;try{resp=handle(opts.url,opts.data);}catch(e){if(window.console)console.error('mock error',e);}
            if(resp===null)return realAjax.apply(this,arguments);
            var dfd=$.Deferred();
            setTimeout(function(){try{if(opts.success)opts.success(resp,'success',{responseText:resp});}catch(e){if(window.console)console.error(e);}
                if(opts.complete)opts.complete({responseText:resp},'success');dfd.resolve(resp,'success',{responseText:resp});},60);
            return dfd.promise();};
        if(window.console)console.log('%c[offline] Burlesque mock server active','color:#b8860b');}
    if(window.jQuery)install(window.jQuery);
    else{var t=0,iv=setInterval(function(){if(window.jQuery){clearInterval(iv);install(window.jQuery);}else if(++t>200)clearInterval(iv);},10);}
})();
