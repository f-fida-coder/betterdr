var queue = null;

function handleProgress(){
    try{
      var count = Math.round(queue.progress * 100);
     $('#progressBar div').css('width', count + '%');
        //console.log("Progress:", count);  
    }catch(err){ console.log("Falla aca")}    
} 

function handleComplete() {
    //console.log("DONE");
    $("#preLoadHandler").hide();
    afterPreload();
 }

 function StartLoad(){
    try{
        queue = new createjs.LoadQueue(false);

        queue.installPlugin(createjs.Sound);
        //setTimeout(function(){ 
        queue.on("progress", handleProgress, this);
        queue.on("complete", handleComplete, this);

        $.getJSON('LoaderConfig.json', function(data) {
            if(typeof(data) != "undefined" && data  != null){
                var images = data.images;
                var manifest="";
                for (var property1 in images) {
                  //string1 = string1 + object1[property1];
                  //console.log("queue", queue)
                  queue.loadFile({id:property1, src:images[property1]});
                  //console.log(property1, images[property1]);
                  /*if(manifest == "")
                    manifest = '{id:"'+property1+'", scr:"'+images[property1]+'"}';
                  else
                    manifest += ',{id:"'+property1+'", scr:"'+images[property1]+'"}';*/
                }

                //queue.loadManifest("LoaderConfig.json");

                var sounds = data.sounds;
                for (var property1 in sounds) {
                  queue.loadFile({id:property1, src:sounds[property1]});
                 // console.log(property1, sounds[property1]);
                }
            }
            
        });
    //}, 1000);
    }
    catch(err)
    {
        //console.log("Preloader Fallo");                
        $("#preLoadHandler").hide();
        afterPreload();
    }
}
