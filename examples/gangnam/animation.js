 (function() {
 
	var iBen = function() {
		this.startTime = Date.now();
		this.animations = [];
        this.animations.push({ step: 0, maxStep: 12.3, duration: 12300, element: "Ben-lib_animation_key" });
		this.player = null;
		this.run = false;
	}, m = iBen.prototype;

     var requestAnimationFrame =
         window.requestAnimationFrame      ||
             window.webkitRequestAnimationFrame ||
             window.mozRequestAnimationFrame    ||
             window.oRequestAnimationFrame      ||
             window.msRequestAnimationFrame;


     m.init = function() {
		var that = this;
		console.log("Starting iBen application");
		for(var i=0; i < this.animations.length; i++) {
			this.animations[i].param = document.getElementById(this.animations[i].element);
		}
		requestAnimationFrame(bensLoop.bind(this));
		// The video to load.
		var videoID = "CH1XGdu-hzQ"
		// Lets Flash from another domain call JavaScript
		var params = { allowScriptAccess: "always" };
		// The element id of the Flash embed
		var atts = { id: "ytPlayer" };
		// All of the magic handled by SWFObject (http://code.google.com/p/swfobject/)
		swfobject.embedSWF("http://www.youtube.com/v/" + videoID + "?version=3&enablejsapi=1", 
                   "videoDiv", "560", "315", "9", null, null, params, atts);
        //$("#curtain").delay(500).fadeOut(1000);
	};


     function bensLoop(){
         this.update();
         requestAnimationFrame(bensLoop.bind(this));
     }

	m.update = function() {
		if(this.run === false) {
			if (!this.inLastPos)
					this.toLastPos();
			return;
		}
		this.inLastPos = false;
		var elapsed = Date.now() - this.startTime;
        var delta = Date.now() - this.lastTime;
        this.lastTime = Date.now();
		
		var animationCount = this.animations.length;
		for(var i=0; i < animationCount; i++) {
            var anim = this.animations[i];
            if(anim.param){
                var fac = ((elapsed + (anim.offset || 0)) % anim.duration) / anim.duration;
                anim.step = fac * anim.maxStep;
                anim.param.textContent = anim.step;
            }

		}
	};
	
	
	m.toLastPos = function() {
		var animationCount = this.animations.length;
		var elapsed = Date.now() - this.startTime;
		var offset = 11500;
		for(var i=0; i < animationCount; i++) {
            var anim = this.animations[i];
            if(anim.param){
				if (elapsed + offset > anim.duration) {
					this.inLastPos = true;
					anim.param.textContent = anim.maxStep;
					continue;
				}
				var fac = (elapsed + offset) / anim.duration;
				anim.step = fac * anim.maxStep;
                anim.param.textContent = anim.step;
            }
		}
		
	}
	
	m.playerStateChanged = function(state) {
		var that = this;
		switch (state) {
			case 1: // start
				window.setTimeout(function() {
					that.lastTime = Date.now();
					that.run = true;
				}, 300);
				break;
			case 0: // ended
			case 2: // paused
			case 3: // buffering
				this.run = false;
				that.startTime = Date.now();
				break;
		}
	}
	
	$(window).load(function(){
		window.ben = new iBen();
		ben.init();
	});
 })();
 
 function onYouTubePlayerReady(playerId) {
	var player = document.getElementById("ytPlayer");
	player.addEventListener("onStateChange", "playerStateChanged");
	player.play();
}

function playerStateChanged(state) {
	window.ben.playerStateChanged(state);
}
 
 function replaceImage(evt) {
    var shaderName = evt.currentTarget.shader.substring(1);
    var newsrc = evt.data.url;
     
    var shader = document.getElementById(shaderName);
    
    for (var i=0; i < shader.childNodes.length; i++) {
        var node = shader.childNodes[i];
        if (node.name == "diffuseTexture") {
            node.childNodes[1].setAttribute("src", newsrc);
            break;
        }
    }
};
