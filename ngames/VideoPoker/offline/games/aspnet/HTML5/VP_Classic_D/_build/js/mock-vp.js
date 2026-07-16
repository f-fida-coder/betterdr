/*
 * mock-vp.js — Offline server emulator for Video Poker: Aces & Eights (VP_Classic_D).
 * Intercepts jQuery $.ajax for GetGameData / Deal / Hit / Heartbeat so the game
 * runs offline. Poker hand evaluation + paytable are the real captured values.
 * Verified: evaluator reproduces the result code for all captured deals/hits.
 * Not emulated: Double-Up gamble feature (offered as unavailable).
 * Cards: code 1..52, rank=(code-1)%13 (0=A..12=K), suit=(code-1)/13. Image = code.png.
 */
(function () {
  'use strict';
  var BAL_KEY = 'vp_offline_balance', START = 2000.00;
  var GAMEDATA = "JB_1=1&_2P_1=2&_3K_1=3&ST_1=4&FL_1=5&FH_1=7&_4K_1=20&_47_1=50&SF_1=50&A8_1=80&NR_1=125&JB_2=2&_2P_2=4&_3K_2=6&ST_2=8&FL_2=10&FH_2=14&_4K_2=40&_47_2=100&SF_2=100&A8_2=160&NR_2=250&JB_3=3&_2P_3=6&_3K_3=9&ST_3=12&FL_3=15&FH_3=21&_4K_3=60&_47_3=150&SF_3=150&A8_3=240&NR_3=375&JB_4=4&_2P_4=8&_3K_4=12&ST_4=16&FL_4=20&FH_4=28&_4K_4=80&_47_4=200&SF_4=200&A8_4=320&NR_4=500&JB_5=5&_2P_5=10&_3K_5=15&ST_5=20&FL_5=25&FH_5=35&_4K_5=100&_47_5=250&SF_5=250&A8_5=400&NR_5=2000&blocknote=&iserr=0&maxbet=25.00&gameid=0&coinvalue=1.00&messageids=&minbet=0.25&newbalance=1952.70&tcounter=&allowedcoinvalues=0.25%2C0.50%2C1.00%2C2.00%2C5.00&jackpot=&sessionid=1&tcountertype=&allowedcoinvaluesd=25%C2%A2%2C50%C2%A2%2C%241%2C%242%2C%245&availablebalance=&opengamescount=0&lastgameid=43357427";                 // raw GetGameData paytable response
  var PAY = {"JB": [1, 2, 3, 4, 5], "_2P": [2, 4, 6, 8, 10], "_3K": [3, 6, 9, 12, 15], "ST": [4, 8, 12, 16, 20], "FL": [5, 10, 15, 20, 25], "FH": [7, 14, 21, 28, 35], "_4K": [20, 40, 60, 80, 100], "_47": [50, 100, 150, 200, 250], "SF": [50, 100, 150, 200, 250], "A8": [80, 160, 240, 320, 400], "NR": [125, 250, 375, 500, 2000]};                     // {result:[c1..c5]} coins per hand per coinsBet
  var GIDN = 43400000;

  function getBal(){var b=parseFloat(localStorage.getItem(BAL_KEY));if(isNaN(b)){b=START;setBal(b);}return b;}
  function setBal(b){localStorage.setItem(BAL_KEY,(Math.round(b*100)/100).toFixed(2));}
  function rank(c){return (c-1)%13;}   // 0=A,1=2..12=K
  function suit(c){return Math.floor((c-1)/13);}

  function freshDeck(exclude){
    var d=[]; for(var c=1;c<=52;c++){ if(!exclude || exclude.indexOf(c)<0) d.push(c); }
    return d;
  }
  function drawFrom(deck){ var i=Math.floor(Math.random()*deck.length); return deck.splice(i,1)[0]; }

  // Aces & Eights hand evaluation -> result code
  function evaluate(cards){
    var rc={}, sc={}, i, rs=[], ss=[];
    for(i=0;i<5;i++){ var r=rank(cards[i]), s=suit(cards[i]); rs.push(r); ss.push(s); rc[r]=(rc[r]||0)+1; sc[s]=(sc[s]||0)+1; }
    var counts=Object.keys(rc).map(function(k){return rc[k];}).sort(function(a,b){return b-a;});
    var flush=Object.keys(sc).length===1;
    var uniq=Object.keys(rc).map(Number).sort(function(a,b){return a-b;});
    var straight=false;
    if(uniq.length===5){
      if(uniq[4]-uniq[0]===4) straight=true;
      if(uniq.join(',')==='0,9,10,11,12') straight=true; // 10,J,Q,K,A
    }
    var royal=flush && [0,9,10,11,12].every(function(r){return rc[r];});
    if(counts[0]===4){
      var quad; for(var k in rc){ if(rc[k]===4) quad=Number(k); }
      if(quad===0||quad===7) return 'A8';
      if(quad===6) return '_47';
      return '_4K';
    }
    if(royal) return 'NR';
    if(straight && flush) return 'SF';
    if(counts[0]===3 && counts[1]===2) return 'FH';
    if(flush) return 'FL';
    if(straight) return 'ST';
    if(counts[0]===3) return '_3K';
    if(counts[0]===2 && counts[1]===2) return '_2P';
    if(counts[0]===2){ var pr; for(var k2 in rc){ if(rc[k2]===2) pr=Number(k2); } if(pr===0||pr===10||pr===11||pr===12) return 'JB'; }
    return '-';
  }

  var G = null; // {cards:[5], coinsBet, coinValue, gameid, over}

  function dealResp(p){
    var coinsBet=parseInt(p.coinsbet,10)||1;
    var coinValue=parseFloat(p.coinvalue)||1.0;
    setBal(getBal() - coinsBet*coinValue);
    var deck=freshDeck(null), cards=[];
    for(var i=0;i<5;i++) cards.push(drawFrom(deck));
    var gid=(++GIDN);
    G={cards:cards, coinsBet:coinsBet, coinValue:coinValue, gameid:gid, over:false};
    var res=evaluate(cards);
    return kv({
      jackpot:'', blocknote:'', availablebalance:'', tcounter:'', messageids:'',
      iserr:0, ingame:1, gameid:gid, lastgameid:gid, newbalance:getBal().toFixed(2),
      result:res,
      c1:cards[0], c2:cards[1], c3:cards[2], c4:cards[3], c5:cards[4], c6:'', c7:'',
      h1:'N',h2:'N',h3:'N',h4:'N',h5:'N',h6:'N',h7:'N'
    });
  }

  function hitResp(p){
    if(!G) return kv({iserr:1, ingame:0});
    // R1..R5 = 'Y' means replace, 'N' means hold
    var hold=[p.r1,p.r2,p.r3,p.r4,p.r5].map(function(r){return String(r).toUpperCase()!=='Y';});
    var kept=[]; for(var i=0;i<5;i++) if(hold[i]) kept.push(G.cards[i]);
    var deck=freshDeck(kept);
    var out=[];
    for(i=0;i<5;i++){ out.push(hold[i] ? G.cards[i] : drawFrom(deck)); }
    G.cards=out; G.over=true;
    var res=evaluate(out);
    var coins = (PAY[res] ? PAY[res][G.coinsBet-1] : 0) || 0;
    var amt = coins * G.coinValue;
    // dbup='N' => double-up not offered, so the win is banked immediately and
    // reflected in newbalance (the game shows newbalance as credits).
    if(amt>0) setBal(getBal()+amt);
    return kv({
      jackpot:'', blocknote:'', availablebalance:'', tcounter:'', messageids:'', dbup:'N',
      iserr:0, ingame:0, gameid:G.gameid, lastgameid:G.gameid, newbalance:getBal().toFixed(2),
      result:res, resultamt:amt.toFixed(2), creditswon:amt.toFixed(2),
      c1:out[0], c2:out[1], c3:out[2], c4:out[3], c5:out[4], c6:'', c7:'',
      h1:'N',h2:'N',h3:'N',h4:'N',h5:'N',h6:'N',h7:'N'
    });
  }

  function collectResp(){
    // win already banked in Hit (dbup=N); collect/double just returns to ready.
    return kv({ iserr:0, ingame:0, dbup:'N', creditswon:'0.00', resultamt:'0.00',
      newbalance:getBal().toFixed(2), availablebalance:'', jackpot:'', tcounter:'', messageids:'', blocknote:'' });
  }

  function heartbeatResp(){ return kv({errorcode:0,errordetails:'',GameBalance:getBal().toFixed(2),availablebalance:'',jackpot:'',mysts:'',tcounter:'',messageids:'',blocknote:''}); }
  function kv(o){var a=[];for(var k in o)if(o.hasOwnProperty(k))a.push(k+'='+o[k]);return a.join('&');}
  function parseBody(d){var o={};if(!d)return o;String(d).split('&').forEach(function(x){var i=x.indexOf('=');if(i<0){o[x]='';return;}o[decodeURIComponent(x.slice(0,i)).toLowerCase()]=decodeURIComponent(x.slice(i+1));});return o;}

  function handle(url, body){
    var u=String(url).toLowerCase(), p=parseBody(body);
    if(u.indexOf('getgamedata')>=0) return GAMEDATA.replace(/newbalance=[^&]*/, 'newbalance=' + getBal().toFixed(2));
    if(u.indexOf('deal.aspx')>=0)   return dealResp(p);
    if(u.indexOf('hit.aspx')>=0)    return hitResp(p);
    if(u.indexOf('heartbeat')>=0)   return heartbeatResp();
    if(u.indexOf('enter.aspx')>=0||u.indexOf('game.aspx')>=0) return 'GAMESESSION=offline&errcode=0';
    // collect banks the pending win; double-up gamble not implemented -> just collect
    if(u.indexOf('collect')>=0||u.indexOf('double')>=0) return collectResp();
    if(u.indexOf('messages/get')>=0) return kv({iserr:0, messageids:''});
    return null;
  }

  function install($){
    var real=$.ajax;
    $.ajax=function(a,b){
      var opts=(typeof a==='object')?a:(b||{}); if(typeof a==='string')opts.url=a;
      var resp=null; try{resp=handle(opts.url,opts.data);}catch(e){if(window.console)console.error('mock-vp',e);}
      if(resp===null) return real.apply(this,arguments);
      var dfd=$.Deferred();
      setTimeout(function(){ try{ if(opts.success)opts.success(resp,'success',{responseText:resp}); }catch(e){if(window.console)console.error(e);}
        if(opts.complete)opts.complete({responseText:resp},'success'); dfd.resolve(resp,'success',{responseText:resp}); },60);
      return dfd.promise();
    };
    if(window.console) console.log('%c[offline] Video Poker (Aces & Eights) mock active','color:#1e7ab8');
  }
  if(window.jQuery) install(window.jQuery);
  else { var t=0,iv=setInterval(function(){ if(window.jQuery){clearInterval(iv);install(window.jQuery);} else if(++t>200)clearInterval(iv); },10); }
})();
