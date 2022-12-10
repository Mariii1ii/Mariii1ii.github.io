/*		v 1.1 - revised 8/4 2022 ILTP		*/
console.log(window.innerWidth);



function All(){
	document.getElementById('all').classList.remove("choixbouton")
	document.getElementById('all').classList.add("choixbouton")

	document.getElementById('summer').classList.remove("choixbouton")
	document.getElementById('winter').classList.remove("choixbouton")
	document.getElementById('automn').classList.remove("choixbouton")
	document.getElementById('spring').classList.remove("choixbouton")

	let element= document.getElementsByClassName('all');
	console.log(element);
	for(i=0; i<=(element.length)-1; i++){
		element[i].style.display="inline-block";
	}
}

function Spring(){
	All()

	document.getElementById('spring').classList.remove("choixbouton");
	document.getElementById('summer').classList.remove("choixbouton");
	document.getElementById('winter').classList.remove("choixbouton");
	document.getElementById('automn').classList.remove("choixbouton");
	document.getElementById('all').classList.remove("choixbouton");
	document.getElementById('spring').classList.add("choixbouton");
}

function Summer(){
	All()

	document.getElementById('summer').classList.remove("choixbouton");
	document.getElementById('spring').classList.remove("choixbouton");
	document.getElementById('winter').classList.remove("choixbouton");
	document.getElementById('automn').classList.remove("choixbouton");
	document.getElementById('all').classList.remove("choixbouton");
	document.getElementById('summer').classList.add("choixbouton");

	var s= document.getElementsByName('spring');
	for(i=0; i<=(s.length)-1; i++){
		s[i].style.display="none";
	}

}

function Winter(){
	All()
	/* Changement de style du bouton */

	document.getElementById('winter').classList.remove("choixbouton");
	document.getElementById('summer').classList.remove("choixbouton");
	document.getElementById('spring').classList.remove("choixbouton");
	document.getElementById('automn').classList.remove("choixbouton");
	document.getElementById('all').classList.remove("choixbouton");
	document.getElementById('winter').classList.add("choixbouton");


	/* Affichage des éléments sélectionnés */

	var s= document.getElementsByName('spring');
	for(i=0; i<=(s.length)-1; i++){
		s[i].style.display="none";
	}

	var ss= document.getElementsByName('spring summer');
	for(i=0; i<=(ss.length)-1; i++){
		ss[i].style.display="none";
	}

	var ssa= document.getElementsByName('spring summer automn');
	for(i=0; i<=(ssa.length)-1; i++){
		ssa[i].style.display="none";
	}
}

function Automn(){
	All()

	document.getElementById('automn').classList.remove("choixbouton");
	document.getElementById('summer').classList.remove("choixbouton");
	document.getElementById('winter').classList.remove("choixbouton");
	document.getElementById('spring').classList.remove("choixbouton");
	document.getElementById('all').classList.remove("choixbouton");
	document.getElementById('automn').classList.add("choixbouton");

	var s= document.getElementsByName('spring');
	for(i=0; i<=(s.length)-1; i++){
		s[i].style.display="none";
	}

	var ss= document.getElementsByName('spring summer');
	for(i=0; i<=(ss.length)-1; i++){
		ss[i].style.display="none";
	}

}


function Main(){
	_menu = new MainMenu();
	_main = document.getElementsByTagName("main")[0];
	var _pageTransition = new PageTransition();
	//Scrolling method
	
	var _scroller;
	if(GLB._hasTouch) _scroller = new TouchscrollHelper(); //no Smoothscroll (but touch screen)
	else _scroller = new Smoothscroll();//has external mouse / visible scrollbar
	
	//Page management
	var _pages = [];
	_pageDiv = _main.getElementsByClassName("page")[0]; //Always the first page (SSR)
	var _activePage, _path, _prevFetch, _firstLoad = true;
	function pageChanged(e){
		_path = _router.getFullUrl();
		//Detect forms overlays (these are triggered by url change, so they are catched here)
		if(_path == "" || _path == "/") _path = "home";
		//First page is server-side rendered (and we don't need the pagetransition)
		if(_firstLoad){
			_firstLoad = false;
			buildNewPage();
			return;
		}
		loadPage(_path);
	}

	function loadPage(_path){
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		//console.log("Load page:", _path, _pages[_path]);
		if(_prevFetch) _prevFetch.invalid();
		//Delete old (cache) content
		if(_pages[_path] != undefined){
			if(_prefetches[_path]) _prefetches[_path].dispose();
			_pages[_path] = null, _prefetches[_path] = null;
		}
		if(_prefetches[_path] == undefined) _prefetches[_path] = new Prefetch(_path, true); //Load or reload
		_prevFetch = _prefetches[_path];
		_prefetches[_path].getContent(appendNewPage);
	}
	//Callback when content is fetched

	function appendNewPage(){
		//console.log("appendNewPage", _prefetches[_path]._content);
		GLBEvents(window, "readyForNewPage", readyForNewPage, true);
		_router.newHead(_prefetches[_path]._head);//more precise Google tracking (no delay for pagetransition)
		_pageTransition.anim(_menu.isOpen());
	}
	//Callback from pagetransition
	function readyForNewPage(){
		GLBEvents(window, "readyForNewPage", readyForNewPage, false);
		if(_main.contains(_pageDiv)) _main.removeChild(_pageDiv);
		if(_activePage) _activePage.stop(), _activePage = null;
		_main.appendChild(_prefetches[_path]._content);
		//_main.insertBefore(_prefetches[_path]._content, _main.firstChild);
		buildNewPage();
	}

	function buildNewPage(){
		_pageDiv = _main.getElementsByClassName("page")[0];
		if(_pages[_path] == undefined) _pages[_path] = new PageBase(_pageDiv);
		_activePage = _pages[_path];
		_activePage.start();
		_scroller.newPage();
		_menu.select(_path.split("/")[0]);
	}
	GLBEvents(window, "pageChange", pageChanged, true);
	
	pageChanged(null);
	
	document.body.classList.remove("noanim");


	
	
}
//Loader for all external (static) html
function Prefetch(_path, _alive){
	//console.log("New prefetch for:", _path, _alive);
	var _this = this;
	_this._content = "";
	_this._head = "";
	var _loaded = false;
	var _req, _callback;

	//Make sure callback is not called, because another page is now used (maybe browsing quickly)
	_this.invalid = function(){
		_callback = null;
	}
	//Define callback for load complete
	_this.getContent = function (_cb){
		_callback = _cb;
		if(_loaded && _this._content != "") doCb(); //Get from cache in Prefetch
	}
	//Worker callback (async)
	_this.parsed = function (c){
		_this._content = c;
		doCb();
	}
	_this.dispose = function(){
		_callback = null;
		_this._content = null;
		_this._head = null;
		if(_req){
			_req.abort();
			_req = null;
		}
	}

	function XHR(){
		if(window.XMLHttpRequest) _req = new XMLHttpRequest();
		else if(window.ActiveXObject) _req = new ActiveXObject("Microsoft.XMLHTTP");
		try {
			_req.onreadystatechange = ready;
			if(_path == "404.htm") _req.open("GET", "404.html", true);
			else if(_path == "home") _req.open("GET", "/", true);
			else _req.open("GET", "/" + _path + "/", true);
			_req.send();
		}
		catch (e){ }
	}
	function ready(){
		if(_loaded) return;
		if(_req.readyState != 4) return;
		//Error (but not 404), try reloading after small delay
		if(_req.status != 200 && _req.status != 404){
			console.log("Error loading content for:", _path);
			_req.abort();
			_req = null;
			setTimeout(XHR, 1000);
			return;
		}
		var _parser = new DOMParser();
		var _dom = _parser.parseFromString(_req.responseText, "text/html");
		_this._content = _dom.getElementsByClassName("page")[0];
		_this._head = _dom.head;
		
		_req.abort();
		_req = null;
		_loaded = true;
		doCb();
	}
	function doCb(){
		if(_callback) _callback.call(), _callback = null; //Callback is defined when it's needed ("invalid" is called when changing to another page)
	}
	if(_alive) XHR();
}

function PageTransition(){
	var _this = this;
	var _me = document.getElementsByClassName("pageTransition")[0];
	var _on = false;
	var _timeout, _time = 500;//300 for own fade, another 200 for loading subpage
	
	function establish(){
		//GLBEvents(window, "experienceLoaded", establish, false);
		_me.classList.add("loaded");
	}
	setTimeout(establish, 100);

	function darken(e){
		_me.classList.add("dark");
	}
	GLBEvents(window, "darkpagetransition", darken, true);
	
	_this.anim = function(_menuOpen){
		clearTimeout(_timeout);
		//GLBEvents(window, "experienceLoaded", realAnimOut, false);
		if(_menuOpen){
			//console.log("Skipping page transition");
			animOut();
			return;
		}
		_on = true, _stopAtBreak = false, _pos = 30;
		document.body.appendChild(_me);
		_timeout = setTimeout(animIn, 50);
	}
	function animIn(){
		document.body.classList.add("pagechange");
		_me.classList.add("in");
		_timeout = setTimeout(animOut, _time); //Give it a little time for loading first image
	}
	function animOut(){
		window.dispatchEvent(new GLBEvent("readyForNewPage"));
		realAnimOut();
	}
	function realAnimOut(){
		_me.classList.remove("in");
		clearTimeout(_timeout);
		_timeout = setTimeout(animOutOver, 1000);
	}
	function animOutOver(){
		if(!_on) return;
		_on = false;
		_me.classList.remove("dark");
		document.body.removeChild(_me);
		document.body.classList.remove("pagechange");
	}
}


function MainMenu(){
	var _this = this;
	var _header = document.getElementsByTagName("header")[0];
	var _logo = _header.getElementsByClassName("logo")[0];
	var _logolink = new overWriteLink(_logo);
	var _nav = _header.getElementsByClassName("mainmenu")[0];
	var _toggle = _header.getElementsByClassName("toggle")[0];
	var _menuTimer;
	var _open = false;


	//Menu items
	var _itemsHtml = _nav.getElementsByClassName("primary");
	var _l = _itemsHtml.length;
	var _items = [], _itemsFlat = [];
	for(var i=0;i<_l;++i){
		var _m = new MenuItem(i, _itemsHtml[i]);
		_items[_m._page] = _m;
		_itemsFlat.push(_m);
	}

	var _selectedItem;
	_this.select = function(_path){
		//Manage menu appearance
		if(_open) toggle(null);
		if(_selectedItem == _items[_path]) return;
		if(_selectedItem) _selectedItem.unselect();
		_selectedItem = _items[_path];
		if(_selectedItem) _selectedItem.select();
	}
	_this.isOpen = function(){
		return _open;
	}
	
	function toggle(e){
		_open = !_open;
		clearTimeout(_menuTimer);
		if(_open){
			_header.classList.add("open");
			_header.classList.remove("closing");
			_menuTimer = setTimeout(opened, 450);
			for(var i=0;i<_l;++i) _itemsFlat[i].animIn();
			GLBEvents(window, "subpageChange", toggle, true);
		}
		else{
			_header.classList.add("closing");
			_menuTimer = setTimeout(closed, 950);
			for(var i=0;i<_l;++i) _itemsFlat[i].animOut();
			GLBEvents(window, "subpageChange", toggle, false);
		}
	}
	function opened(){
		_header.classList.add("opened");
	}
	function closed(){
		_header.classList.remove("opened");
		_header.classList.remove("open");
		_header.classList.remove("closing");
	}
	function headerClick(e){
		if(!GLB._isMobile) return;
		if(e.clientX < GLB._vwOuter*.25){
			e.stopPropagation();
			if(_open) toggle(null);
		}
	}
	GLBEvents(_toggle, "click", toggle, true);
	GLBEvents(_header, "click", headerClick, true);
	
	var _sections, _modMenuListeners;
	var _numSections = -1, _currentModuleId = -1;
	_this.updateBackgrounds = function(_div){
		_sections = _div.getElementsByClassName("m");
		_numSections = _sections.length;
		//Menu color
		_modMenuListeners = [];
		_currentModuleId = -1;
		for(var i=0;i<_numSections;i++) _modMenuListeners.push(new ModuleMenuColor(_sections[i], "data-theme"));
		resized(null);
		scrolled(null);
		//Set instant color
		document.body.classList.add("instant");
		if(_modMenuListeners[0]._theme == "dark") document.body.classList.add("dark");
		else document.body.classList.remove("dark");
		//Background-color
		document.body.style.backgroundColor = _modMenuListeners[0]._bg;
		setTimeout(removeInstantBg, 100);
	}
	function removeInstantBg(){
		document.body.classList.remove("instant");
	}

	var _nearestId = -1, _nearestDist = 10000, _dist = 0;
	var _scrollDir = -1, _prevScrollY = 0, _appearCounter = 0, _disappearCounter = 0, _appearLimit = 10;
	if(GLB._hasTouch) _appearLimit = 20;
	var _menuOn = true;
	function scrolled(e){
		//Handle background color
		_nearestId = -1, _nearestDist = 10000, _dist = 0;
		for(var i=0;i<_numSections;i++){
			_dist = Math.min(Math.abs(_modMenuListeners[i]._offY - GLB._windowScrollY), Math.abs(_modMenuListeners[i]._offEndY - GLB._windowScrollY));
			if(_dist < _nearestDist) _nearestDist = _dist, _nearestId = i;
		}
		
		if(_currentModuleId != _nearestId){
			//console.log("_nearestId", _nearestId);
			_currentModuleId = _nearestId;
			if(_currentModuleId != -1){
				if(_modMenuListeners[_currentModuleId]._theme == "dark") document.body.classList.add("dark");
				else document.body.classList.remove("dark");
				//Background-color
				document.body.style.backgroundColor = _modMenuListeners[_currentModuleId]._bg;
				//console.log("new", _currentModuleId)
			}
		}

		//Handle hiding header
		if(_nearFooter || _open) return;
		if(_prevScrollY < GLB._windowScrollY) _scrollDir = -1;//scrolling down
		else _scrollDir = 1;//scrolling up
		_prevScrollY = GLB._windowScrollY;
		if(_scrollDir > 0 && !_menuOn){
			_appearCounter++;
			if(_appearCounter > _appearLimit || GLB._windowScrollY < 5){
				_disappearCounter = 0;
				_menuOn = true;
				_header.classList.remove("hidden");
			}
		}
		else if(GLB._windowScrollY > 5 && _scrollDir < 0 && _menuOn){
			_disappearCounter++;
			if(_disappearCounter > _appearLimit){
				_appearCounter = 0;
				_menuOn = false;
				_header.classList.add("hidden");
			}
		}
	}
	function showheader(e){
		if(!_menuOn){
			_disappearCounter = 0;
			_menuOn = true;
			_header.classList.remove("hidden");
		}
	}
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "showheader", showheader, true);

	function resized(e){
		for(var i=0;i<_numSections;i++) _modMenuListeners[i].resized();
	}
	GLBEvents(window, "LayoutUpdate", resized, true);
}


function ModuleMenuColor(_module, _attr){
	var _this = this;
	_this._offY = GLB._reliableSh;
	_this._offEndY = GLB._reliableSh*2;
	_this._theme = _module.getAttribute("data-theme") || "";
	_this._bg = _module.getAttribute("data-bg") || "#F6F2E7";

	_this.resized = function(){
		_this._offY = GLB.offsetY(_module) - GLB._reliableSh * .5;
		_this._offEndY = _this._offY + _module.offsetHeight * .9;
	}
}

function MenuItem(_id, _me){
	var _this = this;
	var _link = new overWriteLink(_me);
	
	//Prefetch:
	if(!GLB._hasTouch) GLBEvents(_me, "mouseenter", prefetchPage, true);
	var _href = _me.getAttribute("href");
	var _page = _href;
	//Remove first slash
	if(_page.substr(0,1) == "/") _page = _page.substr(1);
	if(_page == "") _page = "home";
	//Remove end slash
	var _l = _page.length;
	if(_page.substr(_l-1) == "/") _page = _page.substr(0, _l-1);
	_this._page = _page;

	function prefetchPage(e){
		//console.log("over", _page);
		if(_prefetches[_page] == undefined) _prefetches[_page] = new Prefetch(_page, true);
		GLBEvents(_me, "mouseenter", prefetchPage, false);
	}

	_this.select = function(){
		_me.classList.add("selected");
	}
	_this.unselect = function(){
		_me.classList.remove("selected");
	}
	//Mobile toggle
	_this.animIn = function(){
		gsap.killTweensOf(_me);
		gsap.set(_me, {x:100, opacity:0, force3D:true});
		gsap.to(_me, .9+_id*.1, {x:0, opacity:1, force3D:true, ease:"expo", delay:_id*.05+.2});
	}
	_this.animOut = function(){
		gsap.killTweensOf(_me);
		gsap.to(_me, .35-_id*.075, {opacity:0, force3D:true, ease:"quad"});
	}
}

/*		Router for controlling url, tracking etc. within the SPA		*/
function Router(){
	var _this = this;
	var _previousUrl = "";
	var _apiPrefix = "/", _path = "";
	var _prefix = _apiPrefix, _prefixL = _prefix.length;
	
	_this._useAPI = !!(window.history && history.pushState); //Check for History API
	if(GLB._hasTouch && (!GLB._iOS && GLB._androidVersion < 4.3 && GLB._androidVersion > 0)) _this._useAPI = false; //Detect old Android phones
	//_this._useAPI = false;//test

	//Check that deeplink (ifany) has same format
	var _firstPath = window.location.pathname;
	if(_firstPath.length > _apiPrefix.length) cleanUrl(window.location.pathname || "");

	//Respond to back/forward browser navigation
	function popstate(e){
		//Go back from case study
		if((_previousUrl == "/cases" && _path.indexOf("cases") != -1) || (_previousUrl == "/team" && _path.indexOf("team") != -1)){
			console.log("cached scroll position")
			_cachedScrollY = _cachedPageScrollY;
			console.log("_cachedScrollY", _cachedScrollY)
			_cachedPageScrollY = 0;//Reset
		}
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		cleanUrl(window.location.pathname || "");
		if(isSubpage("/"+_path+window.location.search, false)) return; //subpage is used in projects filters
		respondToState();
	}
	//Address was changed, get the url and dispatch global pageChange event
	function respondToState(){
		cleanUrl(window.location.pathname || "");
		window.dispatchEvent(GLBEvent("pageChange"));
	}
	//Get url withouth any prefix (e.g. www.keepit.com)
	function cleanUrl(_in){
		_in = _in.toLowerCase();
		_path = removePrefix(_in).slice(0, -1);
	}
	function removePrefix(_in){
		if(_prefixL > 0) return _in.substr(_prefixL);
		else return _in;
	}
	//Compare to previous url to see if this is "just" a subpage - because we don't want a pagetransition then
	function isSubpage(_newUrl, _setUrl){
		var _newClean = _newUrl.split("?")[0];
		if(_newClean.substr(-1) == "/") _newClean = _newClean.substr(0, _newClean.length-1);
		//console.log("NEW:", _newClean, "old", _previousUrl);
		if(_newClean != "" && _newClean == _previousUrl){
			//console.log("Same page:", _newUrl);
			//Remove end slash if there are parameters
			if(_newUrl.substr(-1) == "/" && _newUrl.indexOf("?") != -1) _newClean = _newUrl.substr(0,_newUrl.length-1);
			else _newClean = _newUrl;
			//Update history
			if(_setUrl) window.history.pushState({}, "", _newClean);
			window.dispatchEvent(GLBEvent("subpageChange"));
			return true;
		}
		return false;
	}
	
	_this.setUrl = function(_newUrl){
		if(_newUrl.indexOf("?") == -1 && _newUrl.substr(-1) != "/" && _newUrl.indexOf("#") == -1) _newUrl += "/";//Make sure we have a trailing slash
		_previousUrl = _path;//Store previous page
		if(_previousUrl.substr(0, 1) != "/") _previousUrl = "/" + _previousUrl;
		if(_newUrl == "" || _newUrl == "/") _newUrl = _prefix;
		_cachedPageScrollY = Math.max(document.documentElement.scrollLeft, GLB._windowScrollY);
		//console.log("store scroll", _cachedPageScrollY);
		if(isSubpage(_newUrl, true)) return;
		window.history.pushState({}, "", _newUrl);
		respondToState();
	}
	_this.getFullUrl = function(){
		return _path;
	}
	_this.getPreviousUrl = function(){
		return _previousUrl;
	}
	_this.getHash = function(){
		return window.location.hash;
	}
	
	//Modify header elements (initial page always look correct from server)
	var _canonical = document.querySelector("link[rel='canonical']"), _fbUrl = document.querySelector("meta[property='og:url']"), _fbTitle = document.querySelector("meta[property='og:title']"), _twTitle = document.querySelector("meta[name='twitter:title']");
	var _metaDesc = document.querySelector("meta[name='description']"), _twDesc = document.querySelector("meta[name='twitter:description']"), _fbDesc = document.querySelector("meta[property='og:description']");

	_this.newHead = function(_head){
		//Header and canonical alone (to be sure they are updated)
		var _newTitle = _head.getElementsByTagName("title")[0].textContent;
		var _newcanonical = _head.querySelector("link[rel='canonical']").getAttribute("href");
		try{
			_canonical.setAttribute("href", _newcanonical);
			document.title = _newTitle;
		}
		catch(e){}
		try{
			_fbUrl.setAttribute("content", _newcanonical);
			var _newDesc = _head.querySelector("meta[name='description']").content;
			_metaDesc.content = _newDesc;
			_twDesc.setAttribute("content", _newDesc);
			_fbDesc.setAttribute("content", _newDesc);
			_fbTitle.setAttribute("content", _newTitle);
			_twTitle.setAttribute("content", _newTitle);
		}
		catch(e){
			console.log("Error updating head");
		}
	}
	
	//Init
	respondToState(), GLBEvents(window, "popstate", popstate, true);
}

/*		Template for all pages		*/
function PageBase(_div){
	var _this = this;
	//Build custom template for the page
	//Standard modules are controlled from here (to avoid duplicate code in each page)
	var _started = false;
	
	var _modules = [["a", overWriteLink], ["lazy", LazyMedia], ["txtfade", TxtFade], ["scaledown", TxtFade], ["slideinx", TxtFade], ["parallax", Parallax], ["fadescroll", FadeWheenScroll], ["scrollimgs", ImgScroll], ["process", Process], ["cases", Cases], ["subhero", Subhero], ["looptoplayer", Looptoplayer], ["maskedBtn", MaskedBtn], ["verticaltext", VerticalText], ["largestatement", Largestatement], ["stickygallery", StickyGallery], ["scrollinglines", ScrollingLines], ["pink", PinkfadeWord], ["person", TeamMember], ["personbg", PersonBg], ["persongallery", PersonGallery], ["animation", AnimatedIcon], ["letteranim", LetterAnim]];
	var _numModules = _modules.length;
	
	_this.start = function(){
		if(_started) return;
		_started = true;
		//Create modules
		var _el;
		for (var i = 0; i < _numModules; i++){
			if(i == 0) _el = _div.getElementsByTagName(_modules[i][0]);
			else _el = _div.getElementsByClassName(_modules[i][0]);
			var _num = _el.length;
			_modules[i][2] = _num; //Save num
			var _instances = [];
			for (var j = 0; j < _num; j++) _instances.push(new _modules[i][1](_el[j]));
			_modules[i][3] = _instances;
		}
		//Horizontal pages (process, cases)
		if((_div.getAttribute("data-horizontal") || "false") == "true") GLB._scrollAxis = 1, document.body.classList.add("hori");
		else GLB._scrollAxis = 0;
		//Handle theme/background colors
		_menu.updateBackgrounds(_div);
		forceResize();
	}
	_this.stop = function(){
		if(!_started) return;
		_started = false;
		_pinkWCount = 0;
		if(_justOpenedProject) GLBEvents(window, "newprojectLoaded", destroy, true);
		else destroy();
	}
	//Stop is delayed in order for project-to-project scroll to work
	function destroy(e){
		document.body.classList.remove("hori");
		//Dispose modules
		try {
			for (var i = 0; i < _numModules; i++){
				var _num = _modules[i][2];
				for (var j = 0; j < _num; j++){
					_modules[i][3][j].destroy();
					_modules[i][3][j] = null;
				}
				_modules[i][3] = null;
			}
		}
		catch (e){
			console.log("Error disposing page!", e);
		}
	}
}

//Smooth (native) scroll
function Smoothscroll(){
	var _this = this;
	var _deltaY = 0, _whSX = 0, _whSY = 0, _twSX = 0, _twSY = 0, _windowW = GLB._vw, _windowH = GLB._reliableSh, _speed = .1;
	var sX = 0, sY = 0, pX = 0, pY = 0;	
	var _whT, _userWheeling = false, _refreshWhenStarting = false;
	var PIXEL_STEP = 10, LINE_HEIGHT = 50;//relevant for Firefox primarily
	var _resizeTimer;

	function wheeled(e){
		nWh(e);
		e.preventDefault();
		e.stopPropagation();
		if(GLB._scrollAxis == 1){
			if(Math.abs(_deltaY) > Math.abs(_deltaX)) _whSX += _deltaY;
			else _whSX += _deltaX;
			if(_whSX < 0) _whSX = 0;
			else if(_whSX > _windowW) _whSX = _windowW;
		}
		else{
			_whSY += _deltaY;
			if(_whSY < 0) _whSY = 0;
			else if(_whSY > _windowH) _whSY = _windowH;
		}
		
		if(!_userWheeling){
			//Need to refresh (used scrollbar)
			if(_refreshWhenStarting){
				_refreshWhenStarting = false;
				if(GLB._scrollAxis == 1) _whSX = _twSX = document.documentElement.scrollLeft, _twSX += .5;//avoid instant stopping
				else _whSY = _twSY = GLB._windowScrollY, _twSY += .5;//avoid instant stopping				
			}
			gsap.ticker.add(scrollengine);
			window.dispatchEvent(new GLBEvent("updateScrollListeners"));
		}
		_userWheeling = true;
		clearTimeout(_whT);
		_whT = setTimeout(wheelOver, 1500);
	}
	function scrolled(e){
		//console.log("scrolled, _userWheeling:", _userWheeling);
		if(!_userWheeling) _refreshWhenStarting = true;
	}
	//Make sure keyboard shortcuts always work
	function keydown(e){
		var _k = e.key;
		if(_k == "End" || _k == "Home" || _k == "PageDown" || _k == "PageUp" || _k == " "){
			_userWheeling = false;
			gsap.ticker.remove(scrollengine);
		}
	}
	function wheelOver(){
		_userWheeling = false;
	}

	//Normalize wheel event		
	function nWh(e){
		if('deltaX' in e) pX = e.deltaX;
		if('deltaY' in e) pY = e.deltaY;
		else{
			// Legacy
			if ('detail'      in e) sY = e.detail;
			else if ('wheelDelta'  in e) sY = -e.wheelDelta / 120;
			else if ('wheelDeltaY' in e) sY = -e.wheelDeltaY / 120;
			else if ('wheelDeltaX' in e) sX = -e.wheelDeltaX / 120;
			// side scrolling on FF with DOMMouseScroll
			if('axis' in e && e.axis === e.HORIZONTAL_AXIS) sX = sY, sY = 0;
			pX = sX * PIXEL_STEP, pY = sY * PIXEL_STEP;
		}
				
		//Firefox (maybe others) that don't scroll in pixels
		if(!GLB._mac || GLB._firefox){
			if((pX || pY) && e.deltaMode){
				if(e.deltaMode == 1) pX *= LINE_HEIGHT, pY *= LINE_HEIGHT;
				else pX *= GLB._reliableSh, pY *= GLB._reliableSh;
			}
			else if(GLB._mac && GLB._firefox) pY *= 2;
		}
		// Fall-back if spin cannot be determined
		//if(pY && !sY){ sY = (pY < 1) ? -1 : 1;}
		_deltaX = pX, _deltaY = pY;
	}

	function scrollengine(){
		if(GLB._scrollAxis == 1){
			_twSX += (_whSX - _twSX) * _speed;
			window.scrollTo(_twSX,0);
		}
		else{
			_twSY += (_whSY - _twSY) * _speed;
			window.scrollTo(0,_twSY);
			if(_twSY > GLB._reliableSh*2 && (_twSY > _windowH - 150)){
				_nearFooter = true;
				window.dispatchEvent(new GLBEvent("showheader"));
			}
			else _nearFooter = false;
		}
		if(!_userWheeling && ((GLB._scrollAxis == 0 && Math.abs(_twSY-_whSY) < .2) || (GLB._scrollAxis == 1 && Math.abs(_twSX-_whSX) < .2))){
			//console.log("stop")
			gsap.ticker.remove(scrollengine);
		}
	}
	function scrollResized(e){
		clearTimeout(_resizeTimer);
		//if(!GLB._isMobile){
			_windowW = document.documentElement.scrollWidth - GLB._vw;
			_windowH = document.documentElement.scrollHeight - GLB._reliableSh;
		//}
	}

	//Even if this is a tablet, the "wheel" event isn't fired
	if(GLB._supportsPassive) window.addEventListener("wheel", wheeled, {passive:false});
	else GLBEvents(window, "wheel", wheeled, true);
	function redoWheelListeners(e){
		//console.log("redoWheelListeners")
		if(GLB._supportsPassive){
			window.removeEventListener("wheel", wheeled, {passive:false});
			window.addEventListener("wheel", wheeled, {passive:false});
		}
		else{
			GLBEvents(window, "wheel", wheeled, false);
			GLBEvents(window, "wheel", wheeled, true);
		}
	}
	GLBEvents(window, "redoWheelListeners", redoWheelListeners, true);
	GLBEvents(window, "scroll", scrolled, true);
	GLBEvents(window, "keydown", keydown, true);
	GLBEvents(window, "LayoutUpdate", scrollResized, true);
	GLBEvents(window, "scrollResized", scrollResized, true);
	setTimeout(scrollResized, 100);

	_this.newPage = function(){
		//console.log("newPage", GLB._hasTouch)
		_twSX = _whSX = _twSY = _whSY = GLB._windowScrollY = _cachedScrollY;
		if(GLB._scrollAxis == 1){
			window.scrollTo(_cachedScrollY,0), GLB._windowScrollY = 0;
			setTimeout(horiCached, 50);//have to do this again because resize events reset horizontal scroll position!
		}
		else{
			window.scrollTo(0,_cachedScrollY);
			_cachedScrollY = 0;//Reset for next page
		}
		scrollResized();
		clearTimeout(_resizeTimer);
		_resizeTimer = setTimeout(scrollResized, 150);//if certain elements need js to set their height etc.
	}
	function horiCached(){
		window.scrollTo(_cachedScrollY,0);
		_cachedScrollY = 0;//Reset for next page
	}
}
function TouchscrollHelper(){
	var _this = this;
	var _demoHoriTimer;
	_this.newPage = function(){
		if(GLB._scrollAxis == 1) window.scrollTo(_cachedScrollY,0);
		else window.scrollTo(0,_cachedScrollY);
		GLB._windowScrollY = _cachedScrollY = 0;
		clearTimeout(_demoHoriTimer);
		if(GLB._scrollAxis == 1){
			//Touch events to handle vertical scrolling attempts
			GLBEvents(window, "touchstart", tdown, true);
			window.addEventListener("touchmove", tmove, {passive:false});
			if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181) _iosV = true;
			else _iosV = false;
			_demoHoriTimer = setTimeout(demoHori, 1000);
		}
		else{
			GLBEvents(window, "touchstart", tdown, false);
			window.removeEventListener("touchmove", tmove, {passive:false});
		}
	}

	function demoHori(){
		if(_iosV) gsap.to(document.body, 2, {scrollTo:{x:150}, ease:"cubic.inOut", delay:.5});
		else gsap.to(window, 2, {scrollTo:{x:150}, ease:"cubic.inOut", delay:.5});
	}

	//Touch events (horizontal scrolling page)
	var _touched = false, _iosV = false, _txInit = 0, _tyInit = 0, _deltaX = 0, _deltaY = 0;
	var _threshold = 4, _direction = -1, _moveSpeed = 0;
	function tdown(e){
		_touched = true;
		_txInit = e.touches[0].clientX, _tyInit = e.touches[0].clientY;
		GLBEvents(window, "touchend", tup, true);
		gsap.killTweensOf(window);
		if(GLB._iOS && GLB._hasTouch && GLB._vwOuter < 1181) _iosV = true, gsap.killTweensOf(document.body);
		else _iosV = false;
		clearTimeout(_demoHoriTimer);

	}
	function tmove(e){
		if(!_touched) return;
		if(_direction == 0) return;//x scrolling normally
		_deltaX = e.touches[0].clientX - _txInit, _deltaY = e.touches[0].clientY - _tyInit;
		if(_direction == 1){
			e.stopPropagation(), e.preventDefault();
			//try scrolling content
			if(_iosV) document.body.scrollTo(document.body.scrollLeft-_deltaY, 0);
			else window.scrollTo(document.documentElement.scrollLeft-_deltaY, 0);
			//Store speed for throwing effect
			_moveSpeed = ((_tyInit - e.touches[0].clientY) + _moveSpeed*2) / 3;
			//Reset
			_tyInit = e.touches[0].clientY;
			return;		
		}
		_deltaX = Math.abs(_deltaX), _deltaY = Math.abs(_deltaY);
		//console.log("tmove", _deltaX, _deltaY);
		if(_direction == -1){
			if(_deltaX > _deltaY && _deltaX > _threshold){
				console.log("Lock x axis");
				_direction = 0;
			}
			else if(_deltaY > _deltaX && _deltaY > _threshold){
				console.log("Lock y axis");
				_direction = 1;
			}
		}
	}
	function tup(e){
		_touched = false;
		if(_direction == 1){
			//console.log("Throw a little", _moveSpeed);
			if(_moveSpeed < -10) _moveSpeed = -10;
			else if(_moveSpeed > 10) _moveSpeed = 10;
			if(_iosV) gsap.to(document.body, .5, {scrollTo:{x:document.body.scrollLeft + _moveSpeed*40}, ease:"cubic"});
			else gsap.to(window, .5, {scrollTo:{x:document.documentElement.scrollLeft + _moveSpeed*40}, ease:"cubic"});
		}
		_direction = -1;
		GLBEvents(window, "touchend", tup, false);
	}
}

/*		Globals		*/
var _menu, _main, _pageDiv, _prefetches = [];
var _scrollToModule = "";
var _justOpenedProject = false, _nearFooter = false;
var _cachedPageScrollY = 0, _cachedScrollY = 0, _pinkWCount = 0;
//Init
var _router = new Router();
new Main();


setInterval("size()",1000);

function size(){
	if (window.innerWidth<=1000){
		console.log("test");
		let images = document.getElementsByName("image");
		for (i=0; i<=(images.length)-1; i++){
			images[i].classList.remove("invisible");
			images[i].classList.add("visible");
		}
		let iframe = document.getElementsByName("iframe");
		for (i=0; i<=(iframe.length)-1; i++){
			iframe[i].classList.add("invisible");
			iframe[i].classList.remove("visible");
		}

	}else{
		let images = document.getElementsByName("image");
		for (i=0; i<=(images.length)-1; i++){
			images[i].classList.add("invisible");
			images[i].classList.remove("visible");
		}
		let iframe = document.getElementsByName("iframe");
		for (i=0; i<=(iframe.length)-1; i++){
			iframe[i].classList.remove("invisible");
			iframe[i].classList.add("visible");
		}
	}
}