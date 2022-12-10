/*		v 1.3 - revised 8/4 2022 ILTP		*/
//Observer util (detects in-viewport and fires load callback)
function Observer(_target, _margin, _threshold, _inCB, _outCB){
	var _this = this;
	var _observer;
	var _destroyOnIntersect = true;
	if(_outCB) _destroyOnIntersect = false;

	function intersected(entries){
		if(entries[0].isIntersecting || (entries.length > 1 && entries[1].isIntersecting)){
			if(_destroyOnIntersect){
				_observer.unobserve(_target);
				_observer = null;
			}
			_inCB.call();
		}
		else if(!_destroyOnIntersect){
			if(_outCB) _outCB.call();
		}
	}

	if(GLB._hasIntersectionObs){
		var _m = _margin * GLB._reliableSh + "px";
		_observer = new IntersectionObserver(intersected, {root:null,rootMargin:_m,threshold:_threshold});
		_observer.observe(_target);
	}
	else _inCB.call();

	_this.destroy = function(){
		if(_observer){
			_observer.unobserve(_target);
			_observer = null;
		}
	}
}
//Lazy loading image/video
function LazyMedia(_me){
	var _this = this;
		
	//Relation
	var _sizes = (_me.getAttribute("data-rel") || "").split(",");
	var _rel = document.createElement("div");
	_rel.className = "rel";
	function setRel(){
		if(GLB._isMobile) _rel.style.paddingTop = ((_sizes[3] / _sizes[2]) * 100) + "%";
		else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
	}
	if(_sizes.length > 2) GLBEvents(window, "betweenBreakpoint", setRel, true), setRel();
	else _rel.style.paddingTop = ((_sizes[1] / _sizes[0]) * 100) + "%";
	//_me.appendChild(_rel);
	_me.insertBefore(_rel, _me.firstChild);

	//This can be either image or video
	var _urls = _me.getAttribute("data-src") || "";
	var _isVideo = (_urls.indexOf("mp4") != -1);
	var _videoType = _me.getAttribute("data-type") || "";
	if(_videoType == "youtube" || _videoType == "vimeo") _isVideo = true;
	var _media;
	if(_isVideo) _media = new Videoplayer(_me, _rel, _videoType);
	else _media = new ResponsiveImg(_me, _rel);
	
	//Load observer and fadein observer
	function inLoadView(){
		_media.inLoadView();
	}
	function outLoadView(){
		_media.outLoadView();
	}
	function inFadeView(){
		_media.inFadeView();
	}
	function outFadeView(){
		_media.outFadeView();
	}
	var _delayed = _me.className.indexOf("delayed") != -1;
	var _loadObserver;
	if(_isVideo){
		if(_delayed) _loadObserver = new Observer(_me, 0, 0, inLoadView, outLoadView); //Loaded when entering view
		else _loadObserver = new Observer(_me, .25, 0, inLoadView, outLoadView); //Loaded when they are within 1/4 screenheight away
	}
	else if(_delayed) _loadObserver = new Observer(_me, 0, .5, inLoadView, outLoadView);
	else _loadObserver = new Observer(_me, 2, 0, inLoadView, outLoadView); //Loaded when they are within 2 screenheights away
	var _fadeInObserver = new Observer(_me, .05, 0, inFadeView, outFadeView);

	if(_me.className.indexOf("instant") != -1) inLoadView();

	//Used for IE object-fit
	_this.contain = function(){
		_media.contain();
	}

	_this.destroy = function(){
		GLBEvents(window, "betweenBreakpoint", setRel, false);
		_loadObserver.destroy();
		_loadObserver = null;
		_fadeInObserver.destroy();
		_fadeInObserver = null;
		_me.removeChild(_rel);
		_media.destroy();
		_media = null;
		_rel = null;
	}
}
//Shifts between mobile/desktop image
function ResponsiveImg(_el, _alternativeParent){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _alt = (_el.getAttribute("data-alt") || "");
	var _loadInit = false, _hasVersions = (_urls.length > 1), _animTimer;
	var _curImg, _baseImg, _mobileImg;
	var _parent = _el;
	var _loaded = false, _inView = false;
	if(_alternativeParent) _parent = _alternativeParent;
		
	function createBaseImg(){
		if(!_baseImg) _baseImg = new GLBImage(_urls[0], _parent, null, null, "img fade", loaded, true, _alt);//base/desktop
		_curImg = _baseImg;
	}
	function createMImg(){
		if(!_mobileImg) _mobileImg = new GLBImage(_urls[1], _parent, null, null, "img fade", loaded, true, _alt);//mobile
		_curImg = _mobileImg;
	}
	function loaded(){
		if(GLB._isIE && GLB._ieVersion <= 11) objectFitImages(_curImg.img);
		if(_justOpenedProject) animIn();
		if(_inView || _loaded) clearTimeout(_animTimer), _animTimer = setTimeout(animIn, 50); //in view or loaded (because betweenBreakpoint fired)
		_loaded = true;
	}

	function animIn(){
		if(_el.className.indexOf("instant") != -1 || _justOpenedProject) _curImg.img.classList.add("instant");
		_curImg.img.classList.add("in");
		if(_justOpenedProject) window.dispatchEvent(new GLBEvent("projectHeroLoaded")); //new project hero loaded
		_animTimer = setTimeout(animInOver, 850);
	}
	function animInOver(e){
		if(_curImg) _curImg.img.classList.add("complete");
		else console.log("No curimage", _urls);
	}

	//Load triggered from parent
	_this.inLoadView = function(){
		if(_loadInit) return;
		_loadInit = true;
		if(_hasVersions){
			if(GLB._isMobile) createMImg();
			else createBaseImg();
			//Now start listening
			GLBEvents(window, "betweenBreakpoint", switchImg, true);
		}
		else createBaseImg(); //Load the one defined
		_curImg.load();
	}
	_this.outLoadView = function(){}
	_this.inFadeView = function(){
		_inView = true;
		//console.log("inFadeView", _loaded)
		if(_loaded) clearTimeout(_animTimer), _animTimer = setTimeout(animIn, 50); //image alrady finished loading, so it hasn't faded in yet
	}
	_this.outFadeView = function(){
		_inView = false;
	}
	_this.contain = function(){
		if(!_curImg) return;
		if(GLB._isIE && GLB._ieVersion <= 11){
			//console.log("Fix object-fit", _curImg.img);
			objectFitImages(_curImg.img);
		}
	}

	function switchImg(e){
		//console.log("switchImg", _urls);
		_curImg.remove(); //Remove current
		if(GLB._isMobile) createMImg();
		else createBaseImg();
		_curImg.load();
	}
	
	_this.destroy = function(){
		clearTimeout(_animTimer);
		if(_baseImg){
			_baseImg.destroy();
			_baseImg = null;
		}
		if(_mobileImg){
			_mobileImg.destroy();
			_mobileImg = null;
		}
		_curImg = null;
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", switchImg, false);
	}
}

function Videoplayer(_el, _rel, _videoType){
	var _this = this;
	var _autoplay = (_el.getAttribute("data-autoplay") || "") == "true";
	var _player, _playBtn;
	var _inLoadView = false, _inFadeView = false, _loadPoster = false;

	var _poster = _el.getAttribute("data-poster") || "";
	var _hasPoster = (_poster != "");
	var _posterIsVideo = false;
	var _posterImg, _posterLoop, _posterTimer;
	if(_autoplay) _hasPoster = false;
	else if(_hasPoster){
		//check if poster is video loop (used on frontpage)
		if(_poster.indexOf(".mp4") != -1){
			_posterIsVideo = true;
		}
	}
	
	function createPlayer(){
		if(_videoType == "youtube") _player = new YTPlayer(_el, _rel, _autoplay); 
		else if(_videoType == "vimeo") _player = new VimeoPlayer(_el, _rel, _autoplay); 
		else _player = new ResponsiveVideo(_el, _rel, _autoplay, _hasPoster);
		if(_inLoadView) _this.inLoadView();
		if(_inFadeView) _this.inFadeView();
	}

	_this.inLoadView = function(){
		_inLoadView = true;
		if(_player) _player.inLoadView();
		if(_loadPoster){
			_loadPoster = false;
			if(_posterIsVideo) _posterTimer = setTimeout(posterLoaded, 100);
			else _posterImg.load();
		}
	}
	_this.outLoadView = function(){
		_inLoadView = false;
		if(_player) _player.outLoadView();
	}
	_this.inFadeView = function(){
		_inFadeView = true;
		if(_player) _player.inFadeView();
	}
	_this.outFadeView = function(){
		_inFadeView = false;
		if(_player) _player.outFadeView();
	}

	function posterLoaded(){
		if(_posterIsVideo) _posterLoop.classList.add("in");
		else _posterImg.img.classList.add("in");
	}
	function posterClick(e){
		e.stopPropagation();
		if(_posterIsVideo){
			//_posterLoop.classList.remove("in");
			_posterLoop.classList.add("done");
			//GLBEvents(_posterLoop, "click", posterClick, false);
			_posterTimer = setTimeout(posterFadeOut, 100);
			//GLBEvents(_el.parentNode, "playClick", posterClick, true);
		}
		else{
			_posterImg.img.classList.remove("in");
			_posterImg.img.classList.add("done");
			//GLBEvents(_posterImg.img, "click", posterClick, false);
			//GLBEvents(_el, "playClick", posterClick, false);
		}
		if(_playBtn) _playBtn.hide();
		_autoplay = true;//no need to have more clicks
		if(_player) _player.resumeAfterPause();
		else createPlayer();
		_el.dispatchEvent(new GLBEvent("posterRemoved"));
		GLBEvents(window, "resumeLoop", resumeLoop, true);
	}
	function resumeLoop(){
		_player.forcePause();
		_posterLoop.classList.add("in");
		_posterLoop.classList.remove("done");
		_posterLoop.play();
		if(_playBtn) _playBtn.show();
	}
	function posterFadeOut(){
		_posterLoop.classList.remove("in");
		_posterTimer = setTimeout(posterLoopRemove, 2000);
	}
	function posterLoopRemove(){
		_posterLoop.pause();
	}

	//Init
	if(_hasPoster){
		if(_posterIsVideo){
			//Create one player (and change src when needed)
			_posterLoop = document.createElement("video");
			_posterLoop.className = "img fade poster";
			_posterLoop.preload = "metadata";

			//If controls (custom):
			_posterLoop.muted = true;
			_posterLoop.autoplay = true;
			_posterLoop.controls = false;
			_posterLoop.loop = true;
			_posterLoop.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
			_posterLoop.playsinline = true;
			var _srcMp4 = document.createElement("source"); 
			_srcMp4.type = "video/mp4";
			_srcMp4.src = _poster;
			_posterLoop.appendChild(_srcMp4);
			_el.appendChild(_posterLoop);
			//GLBEvents(_posterLoop, "click", posterClick, true);
		}
		else{
			_posterImg = new GLBImage(_poster, _el, null, null, "img fade poster", posterLoaded, true, "Video poster");
			//GLBEvents(_posterImg.img, "click", posterClick, true);
		}
		_loadPoster = true;
		//Check for adding playbutton in parent (mask for frontpage)
		if(_el.parentNode.className == "mask"){
			_playBtn = new PlayBtn(_el.parentNode);
			GLBEvents(_el.parentNode, "playClick", posterClick, true);
		}
		else{
			_playBtn = new PlayBtn(_el);
			GLBEvents(_el, "playClick", posterClick, true);
		}
	}
	else createPlayer();
	
	_this.destroy = function(){
		GLBEvents(window, "resumeLoop", resumeLoop, false);
		if(_player){
			_player.destroy();
			_player = null;
		}
		clearTimeout(_posterTimer);
		if(_posterImg){
			//GLBEvents(_posterImg.img, "click", posterClick, false);
			GLBEvents(_el, "playClick", posterClick, false);
			_posterImg.destroy();
			_posterImg = null;
		}
		else if(_posterLoop){
			_posterLoop.pause();
			//GLBEvents(_posterLoop, "click", posterClick, false);
			GLBEvents(_el.parentNode, "playClick", posterClick, true);
			_el.removeChild(_posterLoop);
			_posterLoop = null;
		}
		if(_playBtn){
			_playBtn.destroy();
			_playBtn = null;
		}
	}
}

function ResponsiveVideo(_el, _alternativeParent, _autoplay, _hasPoster){
	var _this = this;
	var _urls = (_el.getAttribute("data-src") || "").split("|");
	var _loops = (_el.getAttribute("data-loop") || "true") == "true";
	var _hasSound = (_el.getAttribute("data-sound") || "true") == "true";
	var _loaded = false, _playing = false, _forcedPause = false, _hasVersions = (_urls.length > 1);
	var _soundBtn;
	var _parent = _el;
	if(_alternativeParent) _parent = _alternativeParent;

	//Create one player (and change src when needed)
	var _video = document.createElement("video");
	_video.className = "img fade";
	_video.preload = "metadata";

	//If controls (custom):
	_video.muted = !_hasPoster;
	if(_hasSound){
		_video.muted = false;
		_soundBtn = new SoundBtn(_parent);
		GLBEvents(_parent, "soundClick", toggleSound, true);
	}
	_video.autoplay = _autoplay;
	_video.controls = false;
	_video.loop = _loops;
	_video.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
	_video.playsinline = true;
	var _srcMp4 = document.createElement("source"); 
	_srcMp4.type = "video/mp4";
	
	function setSrc(e){
		if(GLB._isMobile) _srcMp4.src = _urls[1];
		else _srcMp4.src = _urls[0];
		_video.appendChild(_srcMp4);
	}
	_parent.appendChild(_video);

	function ended(e){
		window.dispatchEvent(new GLBEvent("introVideoEnded"));
	}
	if(!_loops){
		GLBEvents(_video, "ended", ended, true);
	}

	//Load triggered from parent
	_this.inLoadView = function(){
		if(_forcedPause) return;
		if(!_loaded){
			_loaded = true;
			if(_hasVersions){
				setSrc();
				//Now start listening
				GLBEvents(window, "betweenBreakpoint", setSrc, true);
			}
			else{
				_srcMp4.src = _urls[0]; //Load the one defined
				_video.appendChild(_srcMp4);
			}
			_video.classList.add("in");
		}
		_playing = true;
		if(_hasSound){
			//check promise to see if sound was allowed
			var _promise = _video.play();
			if(_promise !== undefined){
				_promise.then(_ => {
				//console.log("Playing with sound");
				if(_soundBtn) _soundBtn.unmuted();
			}).catch(error => {
				// Autoplay not allowed!
				// Mute video and try to play again
				//console.log("Not playing - try muting!");
				_video.muted = true;
				_video.play();
				//Show muted state for sound button
				if(_soundBtn) _soundBtn.muted();
			});
			}
		}
		else _video.play();//normal play
	}
	_this.outLoadView = function(){
		if(_playing) _playing = false, _video.pause();
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	_this.forcePause = function(){
		if(_playing) _playing = false, _video.pause();
		_forcedPause = true;
	}
	_this.resumeAfterPause = function(){
		_forcedPause = false;
		_this.inLoadView();
	}

	function toggleSound(e){
		//console.log("toggleSound", _video.muted);
		if(_video.muted){
			_video.muted = false;
			if(_soundBtn) _soundBtn.unmuted();
		}
		else{
			_video.muted = true;
			if(_soundBtn) _soundBtn.muted();
		}
	}

	_this.destroy = function(){
		GLBEvents(_video, "ended", ended, false);
		_parent.removeChild(_video);
		if(_video){
			_srcMp4.src = "";
			if(_video.contains(_srcMp4)) _video.removeChild(_srcMp4);
			_video.pause();
			_video = null;
			_srcMp4 = null;
		}
		if(_soundBtn){
			_soundBtn.destroy();
			_soundBtn = null;
			GLBEvents(_parent, "soundClick", toggleSound, false);
		}
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", setSrc, false);
	}
}
/*function ResponsiveVideo(_el, _alternativeParent){
	var _this = this;
	var _urls = (_el.getAttribute("data-src")Â || "").split("|");
	var _loops = (_el.getAttribute("data-loop")Â || "true") == "true";
	var _dataid = _el.getAttribute("data-id") || "";//used for preloading Hero videos
		
	var _loaded = false, _playing = false, _hasVersions = (_urls.length > 1);
	var _parent = _el;
	if(_alternativeParent) _parent = _alternativeParent;

	//Create one player (and change src when needed)
	var _video = document.createElement("video");
	_video.className = "img fade";
	_video.preload = "metadata";

	//If controls (custom):
	_video.muted = true;
	_video.autoplay = true;
	_video.controls = false;
	_video.loop = _loops;
	_video.setAttribute('playsinline', 'true'); // must be set before src is set or it will be ignored
	_video.playsinline = true;
	var _srcMp4 = document.createElement("source"); 
	_srcMp4.type = "video/mp4";
	
	function setSrc(e){
		if(GLB._isMobile) _srcMp4.src = _urls[1];
		else _srcMp4.src = _urls[0];
		_video.appendChild(_srcMp4);
	}
	_parent.appendChild(_video);

	function ended(e){
		window.dispatchEvent(new GLBEvent("introVideoEnded"));
	}
	if(!_loops){
		GLBEvents(_video, "ended", ended, true);
	}

	function preloadHeroVideo(e){
		if(_dataid == e.detail){
			e.stopPropagation();//only relevant for this one video
			_video.preload = "auto";
		}
	}
	if(_dataid != "") GLBEvents(window, "preloadHeroVideo", preloadHeroVideo, true);
	

	//Load triggered from parent
	_this.inLoadView = function(){
		if(!_loaded){
			_loaded = true;
			if(_hasVersions){
				setSrc();
				//Now start listening
				GLBEvents(window, "betweenBreakpoint", setSrc, true);
			}
			else{
				_srcMp4.src = _urls[0]; //Load the one defined
				_video.appendChild(_srcMp4);
			}
			_video.classList.add("in");
		}
		GLBEvents(window, "preloadHeroVideo", preloadHeroVideo, false);
		_playing = true, _video.play();
	}
	_this.outLoadView = function(){
		if(_playing) _playing = false, _video.pause();
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	_this.destroy = function(){
		GLBEvents(window, "preloadHeroVideo", preloadHeroVideo, false);
		GLBEvents(_video, "ended", ended, false);
		_parent.removeChild(_video);
		if(_video){
			_srcMp4.src = "";
			if(_video.contains(_srcMp4)) _video.removeChild(_srcMp4);
			_video.pause();
			_video = null;
			_srcMp4 = null;
		}
		_parent = null;
		GLBEvents(window, "betweenBreakpoint", setSrc, false);
	}
}*/

//Manage Youtube and Vimeo
function onYouTubeIframeAPIReady(){
	_YoutubeReady = true;
	window.dispatchEvent(GLBEvent("YoutubeAPIReady", 0));
}
function VimeoJsLoaded(){
	_vimeoReady = true;
	window.dispatchEvent(GLBEvent("VimeoAPIReady", 0));
}
var _ytCounter = 0;
var _vimeoJsAdded = false, _vimeoReady = false, _youtubeScriptAdded = false, _YoutubeReady = false;
function YTPlayer(_me, _rel, _autoplay){
	var _this = this;
	var _myId = "YoutubePlayer_"+_ytCounter;
	_ytCounter++;
	var _ytId = _me.getAttribute("data-src");
	
	_this.inLoadView = function(){}
	_this.outLoadView = function(){
		if(_ytPlayer)
		try{_ytPlayer.pauseVideo();}
		catch(e){}
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	if(!_youtubeScriptAdded){
		_youtubeScriptAdded = true;
		var _s = document.createElement('script');
		_s.src = "https://www.youtube.com/iframe_api";
		_s.defer = true, _s.async = true;		
		document.body.appendChild(_s);
	}
	
	var _ytPlayer, _playerCon;
	var _vars, _events = {'onReady': onPlayerReady,'onStateChange': onPlayerStateChange};
	
	if(_YoutubeReady) setTimeout(build, 50);
	else GLBEvents(window, "YoutubeAPIReady", build, true); //Wait until Youtube API is ready

	function build(e){
		GLBEvents(window, "YoutubeAPIReady", build, false);
		_playerCon = document.createElement("div");
		_playerCon.setAttribute("id", _myId);
		_playerCon.className = "externalvideoplayer";
		_rel.appendChild(_playerCon);
		if(_autoplay) _autoplay = 1;
		else _autoplay = 0;
		_vars = {'autoplay':_autoplay, 'fs':1, 'autohide':1, 'controls':1, 'playsinline':1, 'disablekb':1, 'html5':1, 'modestbranding':0, 'showinfo':0, 'rel':0, 'enablejsapi':1, 'iv_load_policy':3};/*, 'origin':'https://dna-design.dk/'*/
		_ytPlayer = new YT.Player(_myId, {videoId:_ytId, playerVars:_vars, events:_events});
	}

	function onPlayerReady(e){
		//console.log("onPlayerReady", e.data);
	}
	function onPlayerStateChange(e){
		//console.log("State", e.data);
	}
	
	_this.destroy = function(){
		GLBEvents(window, "YoutubeAPIReady", build, false);
		if(_ytPlayer){
			try{
				_ytPlayer.stopVideo();
				_ytPlayer.destroy();
				_ytPlayer = null;
			}
			catch(e){
				console.log("error Youtube", e);
			}
		}
		if(_playerCon){
			if(_rel.contains(_playerCon)) _rel.removeChild(_playerCon);
			_playerCon = null;
		}
	}
}
function VimeoPlayer(_me, _rel, _autoplay){
	var _this = this;
	var _vimeoId = _me.getAttribute("data-src");
	
	_this.inLoadView = function(){}
	_this.outLoadView = function(){
		if(_player) _player.pause();
	}
	_this.inFadeView = function(){}
	_this.outFadeView = function(){}

	//Load Vimeo API
	if(!_vimeoJsAdded){
		_vimeoJsAdded = true;
		var _vimeoJs = document.createElement('script');
		_vimeoJs.onload = VimeoJsLoaded;
		_vimeoJs.setAttribute("type","text/javascript");
		_vimeoJs.async = _vimeoJs.defer = true;
		_vimeoJs.setAttribute("src", "https://player.vimeo.com/api/player.js");
		document.body.appendChild(_vimeoJs);
	}
	
	var _playerCon, _player;
	var _myId = "vimeoplayer_" + _ytCounter;
	_ytCounter++;

	if(_vimeoReady) setTimeout(build, 50);
	else GLBEvents(window, "VimeoAPIReady", build, true);

	function build(e){
		//console.log("Vimeo ready - now build player");
		GLBEvents(window, "VimeoAPIReady", build, false);
		_playerCon = document.createElement("div");
		_playerCon.setAttribute("id", _myId);
		_playerCon.className = "externalvideoplayer";
		_rel.appendChild(_playerCon);
		//Create new player
		var _obj = {id:_vimeoId,playsinline:true,byline:false,responsive:true,loop:false,color:"008580",muted:false,autoplay:_autoplay,portrait:false};
		_player = new Vimeo.Player(_myId, _obj);
	}
	
	_this.destroy = function(){
		GLBEvents(window, "VimeoAPIReady", build, false);
		if(_player){
			try{
				_player.pause();
				_player.destroy();
				_player = null;
			}
			catch(e){
				console.log("Error disposing vimeo");
			}
		}
		if(_playerCon) _playerCon = null;
	}
}

function TxtFade(_me){
	var _this = this;
	var _multiple = (_me.className.indexOf("multiple") != -1);
	var _delayed = (_me.className.indexOf("delayed") != -1);
	var _delay;
	if(_delayed) _delay = parseFloat(_me.getAttribute("data-delay") || "1");
	else _delay = parseFloat(_me.getAttribute("data-delay") || "0");
	var _observer, _timer;
	function inView(){
		if(_delayed) _timer = setTimeout(animIn, _delay*1000);
		else animIn();
	}
	function animIn(){
		_me.classList.add("in");
	}
	function outView(){
		clearTimeout(_timer);
		_me.classList.remove("in");
	}
	if(_multiple) _observer = new Observer(_me, .2, 0, inView, outView);
	else _observer = new Observer(_me, 0, 0, inView);
	_this.destroy = function(){
		clearTimeout(_timer);
		_observer.destroy();
		_observer = null;
	}
}

//Parallax
function Parallax(_me){
	var _this = this;
	var _inView = false, _layoutTimer, _scrolledLocal, _offset, _offPos;
	var _axis = 0; //0=y, 1=x
	if((_me.getAttribute("data-direction") || "") == "x") _axis = 1;
	var _desktopOnly = (_me.getAttribute("data-desktoponly") || "") == "true";
	var _speeds = (_me.getAttribute("data-speed") || "-.2,0").split(",");
	var _speed;
	if(GLB._isMobile && _speeds.length > 1) _speed = parseFloat(_speeds[1]);
	else _speed = parseFloat(_speeds[0]);
	var _target = _me.getElementsByClassName("lazy")[0] || _me;
	var _forceTarget = (_me.getAttribute("data-target") || "") != "";
	if(_forceTarget) _target = _me;
		
	function inView(){
		_inView = true;
		gsap.ticker.add(scrolled);
		scrolled();
	}
	function outView(){
		_inView = false;
		gsap.ticker.remove(scrolled);
	}

	//Smoothscroll frame order
	/*function updateScrollListener(e){
		console.log("updateScrollListener")
		gsap.ticker.remove(scrolled);
		if(_inView) inView();
	}
	GLBEvents(window, "updateScrollListeners", updateScrollListener, true);*/

	function scrolled(){
		if(_desktopOnly && GLB._hasTouch) return;
		if(_axis == 0){
			_scrolledLocal = _offset - GLB._windowScrollY;
		}
		else{
			_scrolledLocal = _offset - document.documentElement.scrollLeft;
		}
		
		_offPos = _scrolledLocal * _speed;
		if(_speed > 0){
			//Measure from center instead
			if(_axis == 0) _offPos = (_offset - GLB._windowScrollY) * _speed;
			else _offPos = (_offset - document.documentElement.scrollLeft) * _speed;
		}
		if(_axis == 0) gsap.set(_target, {y:_offPos, force3D:true});
		else gsap.set(_target, {x:_offPos, force3D:true});
	}

	function layout(e){
		clearTimeout(_layoutTimer);
		if(_axis == 0) _offset = GLB.offsetY(_me);
		else _offset = _me.offsetLeft;
		if(GLB._isMobile && _speeds.length > 1) _speed = parseFloat(_speeds[1]);
		else _speed = parseFloat(_speeds[0]);
		if(_speed > 0) _offset += GLB._reliableSh/2;
	}
	function relayout(){
		layout();
		if(_inView) scrolled();
	}
    if(GLB._hasIntersectionObs){
        GLBEvents(window, "LayoutUpdate", layout, true);
		layout(null);
		_layoutTimer = setTimeout(relayout, 100);
	}
	var _observer = new Observer(_me, .25, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_layoutTimer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//Large bg image fades down while scrolling through module
function FadeWheenScroll(_me){
	var _this = this;
	var _inView = false, _scrolledLocalY, _offset = GLB._reliableSh, _height = GLB._reliableSh, _p = 0, _pEase = 0;
	var _lazy = _me.getElementsByClassName("lazy")[0];

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		_inView = false;
		gsap.ticker.remove(scrolled);
	}
	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		_pEase = Quad.easeOut(_p);
		_lazy.style.opacity = 1 - _pEase*.9;
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
	}

	GLBEvents(window, "LayoutUpdate", layout, true);
	setTimeout(layout, 100);

	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//Images cycle while scrolling through module
function ImgScroll(_me){
	var _this = this;
	var _imgs = _me.getElementsByClassName("images")[0];
	_imgs.classList.add("hidden");
	var _inView = false, _scrolledLocalY, _twScrollY = 0, _offset = GLB._reliableSh, _height = GLB._reliableSh;
	var _imgBlender = new ImgScrollBlender(_imgs);

	function inView(){
		_inView = true;
		_imgs.classList.remove("hidden");
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		_inView = false;
		gsap.ticker.remove(scrolled);
		_imgs.classList.add("hidden");
	}
	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		if(GLB._isMobile){
			_twScrollY += (_scrolledLocalY - _twScrollY)*.2;//small delay
			_imgBlender.update(-_twScrollY / _height);
		}
		else _imgBlender.update(-_scrolledLocalY / _height);
	}
	function resized(e){
		_offset = GLB.offsetY(_me);
		if(GLB._reliableSh > GLB._vw && GLB._vw > 700 && GLB._isMobile) _height = _me.offsetHeight - GLB._reliableSh*1;
		else if(GLB._isMobile) _height = _me.offsetHeight - GLB._reliableSh*.5;
		else _height = _me.offsetHeight - GLB._reliableSh*1.5;
	}

	GLBEvents(window, "LayoutUpdate", resized, true);
	resized(null);

	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", resized, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}
function ImgScrollBlender(_me){
	var _this = this;
	var _imgsHtml = _me.getElementsByClassName("lazy");
	var _num = _imgsHtml.length;
	var _imgs = [];
	for(var i=0;i<_num;i++) _imgs.push(new ISBlenderImg(i, _num, _imgsHtml[i]));
	
	_this.update = function(_p){
		//Normalize interval between -.2 to 1.4
		var _normalized = (_p + .2) / 1.4;
		if(_normalized < -.5) _normalized = -.5;
		else if(_normalized > 1.5) _normalized = 1.5;
		for(var i=0;i<_num;i++) _imgs[i].update(_normalized);
		gsap.set(_me, {y:(-_p * GLB._reliableSh) * 1, force3D:true});//.85
	}

	_this.destroy = function(){
		for(var i=0;i<_num;i++){
			_imgs[i].destroy();
			_imgs[i] = null;
		}
	}
}
function ISBlenderImg(_id, _total, _me){
	var _this = this;
	var _interval = 1/_total;
	var _startP = _interval * _id;
	var _endP = _startP + _interval;
	var _alpha = 0, _prevAlpha = 0, _scale = 0;
	var _rel = _me.getElementsByClassName("rel")[0];
	
	_this.update = function(_p){
		_scale = 1.5 - (1 - (_endP-_p)/_interval)*.25;
		if(_p > _startP){
			//This is turned on
			if(_p < _endP){
				//This is primary
				_alpha = 1 - (_endP-_p)/_interval * 2;//*2 for faster fade in
			}
			else{
				//Fully visible
				_alpha = 1;
			}
			gsap.set(_rel, {scale:_scale, force3D:true})
		}
		else{
			_alpha = 0;
		}
		if(_alpha < 0) _alpha = 0;
		else if(_alpha > 1) _alpha = 1;
		if(_alpha != _prevAlpha){
			_prevAlpha = _alpha;
			_me.style.opacity = _alpha;
		}
	}

	_this.destroy = function(){

	}
}

//Process (horizontal page)
function Process(_me){
	var _this = this;
	var _inView = false;
	var _scrolledLocalY = 0, _offset = 0, _height = GLB._reliableSh, _p = 0, _scrollerW = 0, _frame = 0, _prevFrame = -1, _normalized = 0;

	var _scroller = _me.getElementsByClassName("scroller")[0];
	var _inner = _scroller.getElementsByClassName("inner")[0];
	var _video = _inner.getElementsByClassName("videoarea")[0];

	//Scroll in flower bg video
	var _bgVideo = _me.getElementsByClassName("bgvideo")[0];
	var _sequence = [];

	//Load sequence
	var _numSequence = 131;
	for(var i=0;i<_numSequence;i++) _sequence.push(new ProcessFrame(i, _bgVideo));
	
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(!_inView) return;
		gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;

		_offX = -_p*_height;
		gsap.set(_inner, {x:_offX, force3D:true});

		//Seek to frame
		if(_p < .6) _normalized = 0;//.6
		else _normalized = (_p - .6) / .4;//-.6 / .4
		//console.log(_progress, _normalized)
		_frame = Math.round(_normalized*_numSequence);
		if(_frame == _numSequence) _frame--;
		if(_prevFrame != -1) _sequence[_prevFrame].off();
		_sequence[_frame].on();
		_prevFrame = _frame;
	}

	function resized(e){
		_scrollerW = _video.offsetLeft + GLB._vw;//_inner.scrollWidth;
		_me.style.height = _scrollerW - (GLB._vwOuter - GLB._reliableSh) + "px";//GLB._vwOuter*1.5 + _scrollerW - (GLB._vwOuter - GLB._reliableSh) + GLB._vwOuter + "px";//intro + cases width
		_inner.style.width = _scrollerW+"px";
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
	}
	GLBEvents(window, "resize", resized, true);
	GLBEvents(window, "LayoutUpdate", layout, true);
			
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "resize", resized, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		_observer.destroy();
		_observer = null;
		gsap.ticker.remove(scrolled);
	}
}
/*function oldProcess(_me){
	var _this = this;
	var _w = GLB._vw, _scrollX = 0, _progress = 0;
	var _iosV = false;//use different scroll listener
	var _elms = _me.getElementsByClassName("el");
	var _numEl = _elms.length;
	var _elements = [];
	for(var i=0;i<_numEl;i++) _elements.push(new ProcessEl(i, _elms[i]));
	
	//Scroll in flower bg video
	var _bgVideo = _me.getElementsByClassName("bgvideo")[0];
	var _sequence = [];

	//Load sequence
	var _numSequence = 131;
	for(var i=0;i<_numSequence;i++) _sequence.push(new ProcessFrame(i, _bgVideo));

	function scrolled(e){
		if(_iosV) _scrollX = document.body.scrollLeft;
		else _scrollX = document.documentElement.scrollLeft;
	}
	if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181) _iosV = true, GLBEvents(document.body, "scroll", scrolled, true);
	else GLBEvents(window, "scroll", scrolled, true);
	
	var _frame = 0, _prevFrame = -1;
	var _normalized = 0;
	function engine(){
		_progress = _scrollX / (_w-GLB._vw);
		if(_progress < 0) _progress = 0;
		else if(_progress > 1) _progress = 1;
		if(_progress < .5) _normalized = 0;//.6
		else _normalized = (_progress - .5) / .5;//-.6 / .4
		//console.log(_progress, _normalized)
		_frame = Math.round(_normalized*_numSequence);
		if(_frame == _numSequence) _frame--;
		if(_prevFrame != -1) _sequence[_prevFrame].off();
		_sequence[_frame].on();
		_prevFrame = _frame;
		//Parallax
		//gsap.set(_bgVideo, {x:(1-_progress)*GLB._vw*.2, transformOrigin:"100% 100%", force3D:true});
	}
	gsap.ticker.add(engine);

	function resized(e){
		_me.style.width = GLB._vw + "px";
		_w = _me.scrollWidth;
		_me.style.width = _w + "px";
		for(var i=0;i<_numEl;i++) _elements[i].resized();
		scrolled(null);
	}
	GLBEvents(window, "LayoutUpdate", resized, true);
	resized(null);

	_this.destroy = function(){
		if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181) _iosV = true, GLBEvents(document.body, "scroll", scrolled, false);
		else GLBEvents(window, "scroll", scrolled, false);
		GLBEvents(window, "LayoutUpdate", resized, false);
		gsap.ticker.remove(engine);
		for(var i=0;i<_numEl;i++){
			_elements[i].destroy();
			_elements[i] = null;
		}
		for(var i=0;i<_numSequence;i++){
			_sequence[i].destroy();
			_sequence[i] = null;
		}
	}
}

function ProcessEl(_id, _me){
	var _this = this;
	var _offsetX = GLB._vw*.3 * _id, _w = GLB._vw*.3, _dist;
	var _alpha = 0, _opacity = 0;

	_this.resized = function(){
		_offsetX = _me.offsetLeft;
		_w = _me.offsetWidth;
		//console.log(_id, _offsetX, _w);
	}
	_this.engine = function(_progress, _scrollX){
		_dist = (_offsetX - GLB._vw*.5 + _w/2) - _scrollX;
		if(_dist > GLB._vw*.3){
			_alpha = (_dist - GLB._vw*.3) / (GLB._vw*.3);
			
			if(_alpha < 0) _alpha = 0;
			else if(_alpha > 1) _alpha = 1;
			_alpha = Math.round(_alpha*50)/50;
			//if(_id == 2) console.log(_alpha)
			if(_opacity == _alpha) return;
			_opacity = _alpha;
			_me.style.opacity = 1 - (_opacity * .6);
			
		}
		//console.log(_id, _dist)
	}

	_this.destroy = function(){}
}*/

function ProcessFrame(_id, _parent){
	var _this = this;
	var _name = _id;
	if(_id < 10) _name = "00"+_id;
	else if(_id < 100) _name = "0"+_id;
	var _folder = "/Assets/60fps/";
	if(GLB._isMobile || GLB._iOS) _folder = "/Assets/60fps_m/";
	var _me = new GLBImage(_folder+_name+".png", _parent, null, null, "lazy", null, false);
	_me.load();

	_this.on = function(){
		_me.img.classList.add("on");
	}
	_this.off = function(){
		_me.img.classList.remove("on");
	}
	_this.destroy = function(){
		_me.destroy();
		_me = null;
	}
}
//Cases overview (horizontal page)
function Cases(_me){
	var _this = this;
	var _casesHtml = _me.getElementsByClassName("case");
	var _numCases = _casesHtml.length;
	var _cases = [];
	for(var i=0;i<_numCases;i++) _cases.push(new CaseLink(_casesHtml[i]));

	function resized(e){
		_me.style.width = "auto";
		_w = _me.scrollWidth;
		_me.style.width = _w + "px";
		window.dispatchEvent(new GLBEvent("scrollResized"));
	}
	GLBEvents(window, "LayoutUpdate", resized, true);
	resized(null);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", resized, false);
		for(var i=0;i<_numCases;i++){
			_cases[i].destroy();
			_cases[i] = null;
		}
	}
}

function CaseLink(_me){
	var _this = this;
	var _a = _me.getElementsByTagName("a")[0];
	function tDown(e){
		GLBEvents(window, "touchend", tEnd, true);
		_a.classList.add("touched");
	}
	function tEnd(e){
		GLBEvents(window, "touchend", tEnd, false);
		_a.classList.remove("touched");
	}
	GLBEvents(_a, "touchstart", tDown, true);
	_this.destroy = function(){
		GLBEvents(_a, "touchstart", tDown, false);
	}
}

//Move masked image horizontally whilte scrolling
function Subhero(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _toMove = 100;
	var _scrolledLocalY = 0, _p = 0, _imgW = 0;
	var _maskedImg = _me.getElementsByClassName("maskedImg")[0];
	var _lazyMasked = _maskedImg.getElementsByClassName("lazy")[0];
	var _lazyImg = _lazyMasked.getElementsByTagName("img")[0];
	var _inView = false;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		//normalize
		_p = (_p + 3)/7;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		//console.log(_p);
		gsap.set(_lazyImg, {x:-_toMove*_p, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		_imgW = _lazyImg.offsetWidth || 0;
		_toMove = _lazyImg.offsetWidth - _lazyMasked.offsetWidth;//to-do calculate when image is loaded
		if(_imgW < 10) _timer = setTimeout(layout, 100);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	var _timer = setTimeout(layout, 100);
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_timer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//Scroll rotated text horizontally while scrolling
function VerticalText(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _toMove = 100;
	var _scrolledLocalY = 0, _p = 0, _h = 0;
	var _inner = _me.getElementsByClassName("inner")[0];
	var _h3 = _inner.getElementsByTagName("h3")[0];
	var _inView = false;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		gsap.set(_h3, {y:-_toMove*_p, force3D:true});
	}
	function layout(e){
		_h = _inner.offsetHeight;
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		_toMove = _h - GLB._vw;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	var _timer = setTimeout(layout, 100);
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_timer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

//Stickygallery (actually not sticky in v1 because we're running out of space)
function StickyGallery(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _toMove = 100;
	var _scrolledLocalY = 0, _p = 0;
	var _gallery = _me.getElementsByClassName("gallery")[0];
	var _scroller = _gallery.getElementsByClassName("scroller")[0];
	var _inView = false;

	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(GLB._isMobile){
			_p += .75;
			_p *= .5;
		}
		else{
			_p += 1;
			_p *= .5;
		}
		gsap.set(_scroller, {x:-_toMove*_p, force3D:true});
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight;
		_toMove = _scroller.scrollWidth - GLB._vw*1;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	var _timer = setTimeout(layout, 100);
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_timer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}

function Largestatement(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _normImgs = 0;
	var _inView = false;
	var _images = _me.getElementsByClassName("lazy");
	var _l = _images.length;
	var _staggersImgs = [];
	for(var i=0;i<_l;i++) _staggersImgs.push(new StaggerImg(i, _images[i]));
	
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		_normImgs = _p * _l;
		for(var i=0;i<_l;i++){
			if(i < _normImgs) _staggersImgs[i].show();
			else _staggersImgs[i].hide();
		}
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	var _timer = setTimeout(layout, 100);
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_timer);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
	}
}
//for largestatement
function StaggerImg(_id, _me){
	var _this = this;
	var _visible = false;
	_me.style.opacity = 0;

	_this.show = function(){
		if(_visible) return;
		_visible = true;
		_me.style.opacity = 1;
	}
	_this.hide = function(){
		if(!_visible) return;
		_visible = false;
		_me.style.opacity = 0;
	}
}

//Loop video frontpage - masks into fullscreen
function Looptoplayer(_me){
	var _this = this;
	var _loopX = 0, _loopY = 0;
	var _parent = _me.parentNode;
	var _lazy = _me.getElementsByClassName("lazy")[0];
	var _globalVideo = document.createElement("div");
	_globalVideo.className = "globalVideo";
	document.body.appendChild(_globalVideo);
	var _videoLocal = true;
	var _playBtn, _closeBtn;

	function playClick(e){
		//GLBEvents(_me, "posterRemoved", playClick, false);
		if(_playBtn) _playBtn.hide();
		var _rect = _me.getBoundingClientRect(); //Measure and move image into caseOpener
		gsap.set(_me, {x:_rect.left, y:_rect.top, width:_rect.width, height:_rect.height, force3D:true});
		_globalVideo.appendChild(_me);
		//Animate to fullscreen
		var _newW = GLB._vwOuter;
		var _newH = _newW * 9/16;
		gsap.to(_lazy, 1, {x:0,force3D:true, ease:"cubic"});
		gsap.to(_me, 1, {x:0, y:0, width:_newW, height:_newH, force3D:true, ease:"cubic", onComplete:videoIsGlobal});
	}
	function videoIsGlobal(){
		_videoLocal = false;
		gsap.set(_me, {clearProps:"all"});
		GLBEvents(_me, "click", closeFsVideo, true);
		//Create close button
		if(_closeBtn) _closeBtn.show();
		else _closeBtn = new CloseBtn(_me);
		_globalVideo.classList.add("open");
	}
	function closeFsVideo(e){
		_globalVideo.classList.remove("open");
		GLBEvents(_me, "click", closeFsVideo, false);
		//Animate back to container
		var _rect = _parent.getBoundingClientRect(); //Measure and move image into caseOpener
		gsap.to(_lazy, .8, {x:-_loopX,force3D:true, ease:"cubic"});
		gsap.to(_me, .8, {x:_loopX, y:_rect.top, width:_rect.width, height:_rect.height, force3D:true, ease:"cubic", onComplete:videoIsLocal});
		_closeBtn.hide();
	}
	function videoIsLocal(){
		_videoLocal = true;
		if(_playBtn) _playBtn.show();
		_parent.appendChild(_me);
		gsap.set(_me, {clearProps:"all"});
		//Create own play button now (because videoplayer module removed this with the poster loop)
		//_playBtn = new PlayBtn(_me);
		//GLBEvents(_me, "playClick", playClick, true);
		window.dispatchEvent(new GLBEvent("resumeLoop"));
	}
	
	//GLBEvents(_me, "playClick", playClick, true);
	GLBEvents(_me, "posterRemoved", playClick, true);
	

	function layout(e){
		_loopX = _parent.offsetLeft, _loopY = _parent.offsetTop;
		if(_videoLocal) gsap.set(_lazy, {x:-_loopX, force3D:true});
		//console.log("_loopX",_loopX, _loopY)
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	setTimeout(layout, 100);

	_this.destroy = function(){
		gsap.killTweensOf(_me);
		GLBEvents(_me, "click", closeFsVideo, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		GLBEvents(_me, "playClick", playClick, false);
		GLBEvents(_me, "posterRemoved", playClick, false);
		//_playBtn.destroy();
		//_playBtn = null;
		document.body.removeChild(_globalVideo);
		_globalVideo = null;
	}
}

function ScrollingLines(_me){
	var _this = this;

	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2;
	var _scrolledLocalY = 0, _p = 0, _pEase = 0;
	var _inView = false;
	
	//Create social wall
	var _label = _me.getAttribute("data-label") || "";
	var _label = _label.replace(/\s/g, '&nbsp;');

	var _numLines = 20;//this is sticky now
	var _lines = [];
	for(var i=0;i<_numLines;i++) _lines.push(new ScrollLine(i, _label, _me));
		
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(GLB._isMobile) _p *= 2;
		_pEase = Cubic.easeOut(_p);
		for(var i=0;i<_numLines;i++) _lines[i].scrolled(_p);
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight;
		for(var i=0;i<_numLines;i++) _lines[i].layout();
		//console.log(_offset, _height);
	}
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .25, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		_lines = null;
	}
}
function ScrollLine(_id, _label, _parent){
	var _this = this;
	var _me = document.createElement("div");
	_me.className = "line";
	var _str = _label;
	var _fullstr = "";
	var _numWords = 4;
	if(GLB._vw > 1600) _numWords = 6;
	if(GLB._isMobile && GLB._vw < 640) _numWords = 2;
	for(var i=0;i<_numWords;i++) _fullstr += _str + " ";
	_me.innerHTML = _fullstr;
	
	var _multi = .025 + (_id%6 * .025);
	var _offsetX = (_id%4)*.5, _x = 0, _limitR = -GLB._vw;
	if(_offsetX == 0) _offsetX = _id%6;
	if(_id%3 == 1) _multi *= -1.5;
	else if(_id%2 == 1) _multi *= -1;
	
	_parent.appendChild(_me);

	_this.scrolled = function(_p){
		_x = (-_p * 1) * GLB._vw * _multi - GLB._vw*_offsetX - GLB._vw*.5;
		if(_x > 0) _x = 0;
		gsap.set(_me, {x:_x, force3D:true});
	}
	_this.layout = function(){
		//_limitR = GLB._vw - _me.offsetWidth;
		_limitR = -GLB._vw;
	}
}

function PlayBtn(_parent){
	var _this = this;
	var _me = document.createElement("button");
	_me.className = "playBtn";
	_parent.appendChild(_me);

	function clicked(e){
		_parent.dispatchEvent(new GLBEvent("playClick"));
	}
	GLBEvents(_me, "click", clicked, true);

	_this.hide = function(){
		_parent.removeChild(_me);
	}
	_this.show = function(){
		_parent.appendChild(_me);
	}
	_this.destroy = function(){
		if(_parent.contains(_me)) _parent.removeChild(_me);
		GLBEvents(_me, "click", clicked, false);
	}
}

function SoundBtn(_parent){
	var _this = this;
	var _me = document.createElement("button");
	_me.className = "soundBtn";
	_parent.appendChild(_me);

	function clicked(e){
		_parent.dispatchEvent(new GLBEvent("soundClick"));
	}
	GLBEvents(_me, "click", clicked, true);

	_this.muted = function(){
		_me.classList.add("muted");
	}
	_this.unmuted = function(){
		_me.classList.remove("muted");
	}
	_this.destroy = function(){
		if(_parent.contains(_me)) _parent.removeChild(_me);
		GLBEvents(_me, "click", clicked, false);
	}
}

function CloseBtn(_parent){
	var _this = this;
	var _me = document.createElement("button");
	_me.className = "closeBtn";
	_parent.appendChild(_me);
	var _fadedIn = false, _timer;

	_this.hide = function(){
		_parent.removeChild(_me);
		clearTimeout(_timer);
		GLBEvents(window, "mousemove", moved, false);
	}
	_this.show = function(){
		_parent.appendChild(_me);
		GLBEvents(window, "mousemove", moved, true);
	}
	GLBEvents(window, "mousemove", moved, true);

	function moved(e){
		if(!_fadedIn) _fadedIn = true, _me.classList.add("on");
		clearTimeout(_timer);
		_timer = setTimeout(movingStopped, 500);
	}
	function movingStopped(){
		_fadedIn = false, _me.classList.remove("on");
	}

	_this.destroy = function(){
		if(_parent.contains(_me)) _parent.removeChild(_me);
		clearTimeout(_timer);
		GLBEvents(window, "mousemove", moved, false);
	}
}

function MaskedBtn(_me){
	var _this = this;
	var _timer;
	var _delayed = (_me.className.indexOf("delayed") != -1);
	var _delay;
	if(_delayed) _delay = parseFloat(_me.getAttribute("data-delay") || "1");
	else _delay = parseFloat(_me.getAttribute("data-delay") || "0");
	
	function inView(){
		if(_delayed) _timer = setTimeout(animIn, _delay*1000);
		else _timer = setTimeout(animIn, 300);
	}
	function animIn(){
		_me.classList.add("on");
	}
	function outView(){
		clearTimeout(_timer);
		_me.classList.remove("on");
	}
	var _observer = new Observer(_me, 0, 0, inView, outView);

	_this.destroy = function(){
		clearTimeout(_timer);
		_observer.destroy();
		_observer = null;
	}
}

function PinkfadeWord(_me){
	var _this = this;
	var _observer, _timer;
	var _myId = _pinkWCount;
	if(_me.className.indexOf("instant") != -1) _myId = 0;
	_pinkWCount++;
	function inView(){
		_timer = setTimeout(animIn, 1000 + _myId*300);
	}
	function animIn(){
		_me.classList.add("on");
	}
	function outView(){
		clearTimeout(_timer);
		_me.classList.remove("on");
	}
	if(_me.nodeName == "SPAN") _observer = new Observer(_me, 0, 0, inView, outView);
	_this.destroy = function(){
		clearTimeout(_timer);
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
	}
}

function TeamMember(_me){
	var _this = this;
	var _href = _me.getAttribute("href") || "";
	var _linkImg = _me.getElementsByClassName("lazy")[0];
	var _globalCaseImg;
	
	function clickedLink(e){
		e.stopPropagation();
		e.preventDefault();
		GLBEvents(_me, "click", clickedLink, false);
		//_linkImg.removeChild(_titleCopy);
		_globalCaseImg = new GlobalCaseImg(_me, _linkImg.getElementsByTagName("img")[0]);

		//Set color for pagechange
		_router.setUrl(_href);
	}
	GLBEvents(_me, "click", clickedLink, true);

	function tDown(e){
		GLBEvents(window, "touchend", tEnd, true);
		_me.classList.add("touched");
	}
	function tEnd(e){
		GLBEvents(window, "touchend", tEnd, false);
		_me.classList.remove("touched");
	}
	GLBEvents(_me, "touchstart", tDown, true);
	
	_this.destroy = function(){
		GLBEvents(_me, "click", clickedLink, false);
		GLBEvents(_me, "touchstart", tDown, false);
		if(_globalCaseImg){
			_globalCaseImg.destroy();
			_globalCaseImg = null;
		}
	}
}

//Open team subpage
function GlobalCaseImg(_link, _linkImg){
	var _this = this;
	var _rect = _linkImg.getBoundingClientRect(); //Measure and move image into caseOpener
	var _isMoving = true, _canBeRemoved = false;

	_linkImg.classList.add("globalCaseImg");
	gsap.set(_linkImg, {x:_rect.left, y:_rect.top, width:_rect.width, height:_rect.height, force3D:true});
	document.body.appendChild(_linkImg);
	
	var _imgW = GLB._vw;
	var _imgH = _imgW * 9/16;
	var _x = 0, _y = 0;
	if(/*!GLB._isMobile &&*/ _imgH < GLB._reliableSh){
		_imgH = GLB._reliableSh;
		_imgW = _imgH * 16/9;
		_x = (GLB._vw - _imgW)/2;
		_y = (GLB._reliableSh - _imgH)/2;
	}
	_justOpenedProject = true;//make sure old page isn't destroyed before this is added to case page
	gsap.to(_linkImg, .85, {scale:1, x:_x, y:_y, width:_imgW, height:_imgH, force3D:true, ease:"expo", onComplete:moveDone});
	window.dispatchEvent(new GLBEvent("darkpagetransition"));
	
	//Listen for project image (same as this) to load
	GLBEvents(window, "projectHeroLoaded", removeMe, true);
	
	function moveDone(){
		_isMoving = false;
		if(_canBeRemoved) fadeOut();
	}
	function removeMe(e){
		GLBEvents(window, "projectHeroLoaded", removeMe, false);
		if(!_isMoving) fadeOut();
		else _canBeRemoved = true;
	}
	function fadeOut(){
		if(!_linkImg) return;
		gsap.killTweensOf(_linkImg);
		gsap.to(_linkImg, 1.4, {opacity:0, ease:"cubic.inOut", delay:.1, onComplete:destroyOld});
	}
	function destroyOld(){
		_justOpenedProject = false;
		window.dispatchEvent(new GLBEvent("newprojectLoaded"));
	}
	_this.destroy = function(){
		gsap.killTweensOf(_linkImg);
		document.body.removeChild(_linkImg);
		_linkImg = null;
		GLBEvents(window, "projectHeroLoaded", removeMe, false);
	}
}
function PersonBg(_me){
	var _this = this;
	var _bg = document.createElement("div");
	_bg.className = "overlay";
	_me.appendChild(_bg);

	var _opacity = 0, _prevOpacity = -1;
	function fade(e){
		if(GLB._isMobile) return;
		else _opacity = Math.min(1, (GLB._windowScrollY / GLB._reliableSh)) * .3 + .7;
		if(_opacity > .95) _opacity = .95;
		_opacity = Math.round(_opacity * 100) / 100;
		if(_prevOpacity != _opacity){
			_prevOpacity = _opacity;
			_bg.style.opacity = _opacity;
		}
	}
	GLBEvents(window, "scroll", fade, true);
	fade();

	_this.destroy = function(){
		GLBEvents(window, "scroll", fade, false);
		_me.removeChild(_bg);
		
	}
}

function PersonGallery(_me){
	var _this = this;
	var _offset = GLB._reliableSh, _height = GLB._reliableSh * 2, _offX = 0;
	var _scrolledLocalY = 0, _p = 0;
	var _inView = false;
	var _container = _me.getElementsByClassName("container")[0];
	var _scroller = _container.getElementsByClassName("scroller")[0];
	var _h3 = _me.getElementsByTagName("h3")[0];
	
	function inView(){
		_inView = true;
		if(GLB._hasIntersectionObs){
			gsap.ticker.add(scrolled);
			scrolled();
		}
	}
	function outView(){
		if(_inView) gsap.ticker.remove(scrolled);
		_inView = false;
	}

	function scrolled(){
		_scrolledLocalY = _offset - GLB._windowScrollY;
		_p = -_scrolledLocalY / _height;
		if(_p < 0) _p = 0;
		else if(_p > 1) _p = 1;
		_offX = -_p*_height;
		//Move entire scroller (projects title and cases)
		gsap.set(_scroller, {x:_offX, force3D:true});
		gsap.set(_h3, {x:_offX * .1, force3D:true});
	}

	function resized(e){
		var _scrollerW = _scroller.scrollWidth;
		_scroller.style.width = _scrollerW + "px";
		_me.style.height = _scrollerW - (GLB._vwOuter - GLB._reliableSh) + "px";
	}
	function layout(e){
		_offset = GLB.offsetY(_me);
		_height = _me.offsetHeight - GLB._reliableSh;
		//console.log(_offset, _height);
	}
	GLBEvents(window, "resize", resized, true);
	GLBEvents(window, "LayoutUpdate", layout, true);
	
	var _observer = new Observer(_me, .05, 0, inView, outView);

	_this.destroy = function(){
		GLBEvents(window, "resize", resized, false);
		GLBEvents(window, "LayoutUpdate", layout, false);
		gsap.ticker.remove(scrolled);
		_observer.destroy();
		_observer = null;
		
	}
}


//Lottie icons
function AnimatedIcon(_me){
	var _this = this;
	var _autoplay = false, _playing = false;
	var _dautoplay = _me.getAttribute("data-autoplay") || "false";
	if(_dautoplay == "true") _autoplay = true;
	var _animation, _hovertarget, _loadTimer, _observer;
	var _rendermode = "svg";
	function createAnim(){
		if("lottie" in window){
			if(GLB._firefox) _rendermode = "canvas";
			_animation = lottie.loadAnimation({container:_me,renderer:_rendermode,loop:true,autoplay:false,path:_me.getAttribute("data-src") || "", rendererSettings:{preserveAspectRatio:'xMidYMid meet'}});
			if(_autoplay && _playing) _animation.play();
		}
		else _loadTimer = setTimeout(createAnim, 100);
	}
	createAnim();	

	function over(e){
		_animation.goToAndPlay(0);
		if(GLB._hasTouch) GLBEvents(window, "touchend", out, true);
	}
	function out(e){
		//_animation.stop();
	}
	if(_dautoplay == "hover"){
		_hovertarget = _me.parentNode || _me;
		if(GLB._hasTouch) GLBEvents(_hovertarget, "touchstart", over, true);
		GLBEvents(_hovertarget, "mouseenter", over, true);
		GLBEvents(_hovertarget, "mouseleave", out, true);
	}
	function inView(){
		if(!_autoplay) return;
		if(!_playing){
			_playing = true;
			if(_animation) _animation.play();
		}
	}
	function outView(){
		if(!_autoplay) return;
		if(_playing){
			_playing = false;
			if(_animation) _animation.stop();
		}
	}
	
	if(_autoplay) _observer = new Observer(_me, .1, 0, inView, outView); //Loaded when they are within 1/4 screenheight away

	_this.destroy = function(){
		clearTimeout(_loadTimer);
		if(_hovertarget){
			GLBEvents(_hovertarget, "touchstart", over, false);
			GLBEvents(window, "touchend", out, false);
			GLBEvents(_hovertarget, "mouseenter", over, false);
			GLBEvents(_hovertarget, "mouseleave", out, false);
			_hovertarget = null;
		}
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
		if(_animation){
			_animation.destroy();
			_animation = null;
		}
	}
}
function LetterAnim(_me){
	var _this = this;
	var _splittext, _chars, _numChars = 0, _observer;
	var _timers = [];
	var _type = "words,chars";
	if(GLB._safari) _me.classList.add("safari");
	//if(GLB._safari) _type = "words";
	if(GLB._hasIntersectionObs){
		if(!GLB._isBot) _splittext = new SplitText(_me, {type:_type});
		/*if(GLB._safari) _chars = _splittext.words, _numChars = _chars.length; //use words instead
		else*/_chars = _splittext.chars, _numChars = _chars.length;
		for(var i=0;i<_numChars;i++) _chars[i].classList.add("fade");
	}

	//Fallback (called from modules)
	function inView(){
		for(var i=0;i<_numChars;i++) _timers[i] = setTimeout(fadeIn, 50*i+200, i);
	}
	function fadeIn(_id){
		_chars[_id].classList.add("in");
	}
	if(GLB._hasIntersectionObs) _observer = new Observer(_me, 0, 0, inView);
	
	_this.destroy = function(){
		for(var i=0;i<_numChars;i++){
			_chars[i].classList.remove("in");
			clearTimeout(_timers[i]);
		}
		if(_splittext){
			_splittext.revert();
			_splittext = null;
		}
		if(_observer){
			_observer.destroy();
			_observer = null;
		}
	}
}