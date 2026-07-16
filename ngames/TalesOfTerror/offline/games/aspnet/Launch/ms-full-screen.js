var FullScreenManager = (function(){
  var elem = null;
  var _imgPath = "";
  this.configFullScreenModeAndroid = function(containerId){
    document.cancelFullScreen = document.webkitExitFullscreen || document.mozCancelFullScreen || document.exitFullscreen;
    elem = document.querySelector("#" + containerId);

    document.addEventListener('keydown', function(e) {
      switch (e.keyCode) {
        case 13: // ENTER. ESC should also take you out of fullscreen by default.
          e.preventDefault();
          console.log("exit FullS")
          document.cancelFullScreen(); // explicitly go out of fs.
          break;
        case 70: // f
          enterFullscreen();
          break;
      }
    }, false);

    document.getElementById('btn-full-screen').onclick = enterFullscreen;

  }


  this.createBtnFullScreen = function(imPath, containerId){
    console.log("createBtnFullScreen********");
    _imgPath = imPath;

    var topBtn = window.innerHeight - 50;

    var strBtnFull = "<div id='btn-full-screen' style='position:absolute; z-index:9999; bottom: 5px; left:5;background-color: transparent; background-image: url(\""+imPath+"goFullScreen.png\");background-size:auto 100%;    background-repeat: no-repeat;width: 50px; height: 50px;'></div>"
    $(containerId ).append( strBtnFull);
  }
      

  var toggleFS= function(el) {
    if (el.webkitEnterFullScreen) {
      el.webkitEnterFullScreen();
    } else {
      if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else {
        el.requestFullscreen();
      }
    }
    el.ondblclick = exitFullscreen;
  }

  var onFullScreenEnter = function() {
    elem.onwebkitfullscreenchange = onFullScreenExit;
    elem.onmozfullscreenchange = onFullScreenExit;
  };

  // Called whenever the browser exits fullscreen.
  var onFullScreenExit = function () {
    document.getElementById('btn-full-screen').onclick = enterFullscreen;
    $('#btn-full-screen').css("background-image", "url(\""+_imgPath+"goFullScreen.png\")"); 
  };

  // Note: FF nightly needs about:config full-screen-api.enabled set to true.
  var enterFullscreen = function () {
    elem.onwebkitfullscreenchange = onFullScreenEnter;
    elem.onmozfullscreenchange = onFullScreenEnter;
    elem.onfullscreenchange = onFullScreenEnter;
    if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    } else {
      if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else {
        elem.requestFullscreen();
      }
    }
    document.getElementById('btn-full-screen').onclick = exitFullscreen;
    $('#btn-full-screen').css("background-image", "url(\""+_imgPath+"goNormalScreen.png\")");  
    //$("#btn-full-screen").
  }

  var exitFullscreen = function() {
    document.cancelFullScreen();
    document.getElementById('btn-full-screen').onclick = enterFullscreen;
    $('#btn-full-screen').css("background-image", "url(\""+_imgPath+"goFullScreen.png\")"); 
  }


   return this;
})();