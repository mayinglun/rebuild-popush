var app = app || {};
var loadDone = false;
var failed = false;
var consoleopen = false;
var loadings = {};
var loginView = null;
var registerView = null;
var currentUser;
var currentDir;
var currentDirString;
var dirMode = 'owned';
var docshowfilter = function(o){ return true; };
// var socket = io.connect(SOCKET_IO);


function loading(id) {
	if(loadings[id])
		return;
	var o = $('#' + id);
	o.after('<p id="' + id + '-loading" align="center" style="margin:1px 0 2px 0"><img src="images/loading.gif"/></p>');
	o.hide();
	loadings[id] = {self: o, loading: $('#' + id + '-loading')};
}

function removeloading(id) {
	if(!loadings[id])
		return;
	loadings[id].self.show();
	loadings[id].loading.remove();
	delete loadings[id];
}

function cleanloading() {
	for(var k in loadings) {
		removeloading(k);
	}
}

function showmessage(id, stringid, type) {
	var o = $('#' + id);
	o.removeClass('alert-error');
	o.removeClass('alert-success');
	o.removeClass('alert-info');
	if(type && type != '' && type != 'warning')
		o.addClass('alert-' + type);
	if(strings[stringid])
		$('#' + id + ' span').html(strings[stringid]);
	else
		$('#' + id + ' span').html(stringid);
	o.slideDown();
}

function loadfailed() {
	if(loadDone)
		return;
	failed = true;
	$('#loading-init').remove();
	showmessage('login-message', 'loadfailed');
}

function isFullScreen(cm) {
	return /\bCodeMirror-fullscreen\b/.test(cm.getWrapperElement().className);
}

function pressenter(e, func) {
	e = e || event;
	if(e.keyCode == 13 && loadDone)
		func();
}

function resize() {
	var w;
	var h = $(window).height();
	if(h < 100)
		h = 100;
	var cbh = h-$('#member-list-doc').height()-138;
	var cbhexp = cbh > 100 ? 0 : 100 - cbh;
	if(cbh < 100)
		cbh = 100;
	$('#chat-show').css('height', cbh + 'px');
	$('#chatbox').css('height', (h-83+cbhexp) + 'px');
	w = $('#editormain').parent().width();
	$('#editormain').css('width', w);
	var underh = h > 636 ? 212 : h/3;
	if(!consoleopen)
		underh = 0;
	$('#under-editor').css('height', underh + 'px');
	$('#console').css('width', (w-w/3-2) + 'px');
	$('#varlist').css('width', (w/3-1) + 'px');
	$('#console').css('height', (underh-12) + 'px');
	$('#varlist').css('height', (underh-12) + 'px');
	$('#varlistreal').css('height', (underh-42) + 'px');
	$('#console-inner').css('height', (underh-81) + 'px');
	$('#console-input').css('width', (w-w/3-14) + 'px');
	// if(!isFullScreen(editor))
	// 	$('.CodeMirror').css('height', (h-underh-$('#over-editor').height()-90) + 'px');

	w = $('#chat-show').width();
	if(w != 0)
		$('#chat-input').css('width', (w-70) + 'px');
	
	$('#file-list .span10').css('min-height', (h-235) + 'px');
	
	w = $('#login-box').parent('*').width();
	$('#login-box').css('left', ((w-420)/2-30) + 'px');
	w = $('#register-box').parent('*').width();
	$('#register-box').css('left', ((w-420)/2-30) + 'px');
	$('#fullscreentip').css('left', (($(window).width()-$('#fullscreentip').width())/2) + 'px');

	$('#editormain-inner').css('left', (-$(window).scrollLeft()) + 'px');

	// editor.refresh();
}

function getdirstring() {
	if(dirMode == 'owned')
		return '/' + currentDir.join('/');
	else {
		var name = currentDir.shift();
		var r = '/' + currentDir.join('/');
		if(currentDir.length == 0) {
			r = '/' + name;
		}
		currentDir.unshift(name);
		return r;
	}
}

function getdirlink(before) {
	var s = '';
	if(!before) {
		before = '';
	}
	for(var i=0, j=currentDir.length-1; i<currentDir.length; i++, j--) {
		var t = currentDir[i];
		var p = t.split('/');
		if(p.length > 1)
			t = p[1] + '@' + p[0];
		if(i == 0 && dirMode == 'shared')
			s += ' / <a href="javascript:;" onclick="' + before + 'backto(' + j + ');">shared@' + htmlescape(t) + '</a>';
		else
			s += ' / <a href="javascript:;" onclick="' + before + 'backto(' + j + ');">' + htmlescape(t) + '</a>';
	}
	return s;
}


app.regView = app.mainView.extend({

	el: '#register',
	// template: _.template($('#register').html()),
	events: {
		'click #reg-btn': 'onClickRegister',
		'click #toLogin':'toLog',
	},
	socket_events:{
		'register': 'onSocketRegister',
	},
	initialize:function(){
		this.__initialize();
		this.render();
	},
	

	render:function(){
		
		$('#login .blink').fadeOut('fast');
		$('#login-message').slideUp();
		$('#login-padding').slideDown('fast', function(){
			$('#register').show();
			$('#register .blink').fadeIn('fast');
			$('#login').hide();
			$('#register-inputName').val('');
			$('#register-inputPassword').val('');
			$('#register-confirmPassword').val('');
			$('#register-message').hide();
			$('#register-padding').fadeIn('fast', function(){
				$('#register-inputName').focus();
			});
			resize();
		});
		return this;
	},

	toLog:function(){
		if (loginView == null)
			loginView = new app.logView;
		else
			// loginView = new app.logView;
			loginView.render();
	},

	onClickRegister: function(){

		var name = $('#register-inputName').val();
		var pass = $('#register-inputPassword').val();
		var confirm = $('#register-confirmPassword').val();
		if(!/^[A-Za-z0-9]*$/.test(name)) {
			showmessage('register-message', 'name invalid');
			return;
		}
		if(name.length < 6 || name.length > 20) {
			showmessage('register-message', 'namelength');
			return;
		}
		if(pass.length > 32){
			showmessage('register-message', 'passlength');
			return;
		}
		if(pass != confirm) {
			showmessage('register-message', 'doesntmatch');
			return;
		}
		
		loading('register-control');
		window.app.socket.emit('register', {
			name:name,
			password:pass,
			avatar:'images/character.png'
		});

	},
	onSocketRegister:function(data){

		if(data.err){
		showmessage('register-message', data.err, 'error');
		}
		else{
		showmessage('register-message', 'registerok');
		$('#register-inputName').val('');
		$('#register-inputPassword').val('');
		$('#register-confirmPassword').val('');
		}
		removeloading('register-control');

	},

});

app.logView = app.mainView.extend({
	
	el: '#login',
	// template: _.template($('#login').html()),

	events: {
		'click #log-btn': 'onClickLogin',
		'click #toRegister':'toReg',
	},

	socket_events:{
		'login': 'onSocketLogin',
	},
	initialize:function(){
		this.__initialize();
		// this.$el.html(this.template());
		$('#loading-init').remove();
		cleanloading();
		if($.cookie('sid')){
			window.app.socket.emit('relogin', {sid:$.cookie('sid')});
			loading('login-control');
			
		} else {
			$('#login-control').fadeIn('fast');
		}
		this.render();
	},
	

	render:function(){
		// $(this.parent_el).hide();
		// this.$el.html(this.template());
		// $(this.parent_el).fadeIn();

		$('#register .blink').fadeOut('fast');
		$('#register-message').slideUp();
		$('#register-padding').fadeOut('fast', function(){
			$('#login').show();
			$('#login .blink').fadeIn('fast');
			$('#register').hide();
			$('#login-inputName').val('');
			$('#login-inputPassword').val('');
			$('#login-message').hide();
			$('#login-padding').slideUp('fast', function(){
				$('#login-inputName').focus();

			});
			resize();
		});
		
		return this;
	},

	toReg:function(){
		if (registerView==null)
			registerView = new app.regView;
		else
			registerView.render();
	},
	onClickLogin: function(){
		
		var name = $('#login-inputName').val();
		var pass = $('#login-inputPassword').val();
		if(name == '') {
			showmessage('login-message', 'pleaseinput', 'error');
			return;
		}
		loading('login-control');
		window.app.socket.emit('login', {
			name:$('#login-inputName').val(),
			password:$('#login-inputPassword').val()
		});

	},
	onSocketLogin:function(data){
		if(data.err){
			if(data.err == 'expired') {
				$.removeCookie('sid');
			} 
			else {
				// $("#logreg-message span").attr('localization',data.err);

				showmessage('logreg-message', data.err, 'error');
			}
		}
		else{
				
			$('#login-inputName').val('');
			$('#login-inputPassword').val('');
			$('#login-message').hide();
			$('#ownedfile').show();
			$('#ownedfileex').hide();
			$('#sharedfile').removeClass('active');
			$('#share-manage-link').hide();
			$('#big-one').animate({height:'40px', padding:'0', 'margin-bottom':'20px'}, 'fast');
			$('#nav-head').fadeIn('fast');
			$('#login').hide();
			$('#editor').hide();
			$('#filecontrol').fadeIn('fast');
			$('#nav-user-name').text(data.user.name);
			$('#nav-avatar').attr('src', data.user.avatar);
			currentUser = data.user;
	
			$.cookie('sid', data.sid, {expires:7});
			
			dirMode = 'owned';
			docshowfilter = allselffilter;
	
			currentDir = [data.user.name];
			currentDirString = getdirstring();
			$('#current-dir').html(getdirlink());

			
		}

		cleanloading();
	},

});

app.indexView = app.mainView.extend({

	
	

	firstconnect:true,


    el: '#all',
    

	socket_events:{
         'version': 'onVersion',
         'connect': 'onConnect',
	},

	initialize:function(){
		this.__initialize();
		// this.render();

		setTimeout('loadfailed()', 10000);
		this.logView = new app.logView;

		$('#newfile').on('shown', function() {
			$('#newfile-inputName').focus();
		});

		$('#changepassword').on('shown', function() {
			$('#changepassword-old').focus();
		});

		$('#rename').on('shown', function() {
			$('#rename-inputName').focus();
		});

		$('#share').on('shown', function() {
			$('#share-inputName').focus();
		});
		
		$('[localization]').html(function(index, old) {
			if(strings[old])
				return strings[old];
			return old;
		});
		
		$('[title]').attr('title', function(index, old) {
			if(strings[old])
				return strings[old];
			return old;
		});
		
		if(!ENABLE_RUN) {
			$('#editor-run').remove();
			if(!ENABLE_DEBUG) {
				$('#editor-console').remove();
			}
		}

		if(!ENABLE_DEBUG) {
			$('#editor-debug').remove();
		}

		$('body').show();
		$('#login-inputName').focus();
		
		var Browser = {};
		var ua = navigator.userAgent.toLowerCase();
		var s;
		(s = ua.match(/msie ([\d.]+)/)) ? Browser.ie = s[1] :
		(s = ua.match(/firefox\/([\d.]+)/)) ? Browser.firefox = s[1] :
		(s = ua.match(/chrome\/([\d.]+)/)) ? Browser.chrome = s[1] :
		(s = ua.match(/opera.([\d.]+)/)) ? Browser.opera = s[1] :
		(s = ua.match(/version\/([\d.]+).*safari/)) ? Browser.safari = s[1] : 0;

		var novoice = false;

		if((!Browser.chrome || parseInt(Browser.chrome) < 18) &&
			(!Browser.opera || parseInt(Browser.opera) < 12)) {
			novoice = true;
			$('#voice-on').addClass('disabled');
			$('#voice-on').removeAttr('title');
			$('#voice-on').popover({
				html: true,
				content: strings['novoice'],
				placement: 'left',
				trigger: 'hover',
				container: 'body'
			});
		}

		resize();
		$(window).resize(resize);
		$(window).scroll(function() {
			$('#editormain-inner').css('left', (-$(window).scrollLeft()) + 'px');
		});

	},

	render:function(){
		// this.$el.html(this.template());
		return this;
	},

	onVersion:function(data){

		if(data.version != VERSION) {
			location.reload('Refresh');
		}
		if(failed)
			return;
		if(!this.firstconnect) {
			app.router.navigate('login',{trigger:true});
		}
		firstconnect = false;
		
		console.log('receive socket:version');
		
		loadDone = true;
	},

	onConnect:function(){
		window.app.socket.emit('version', {})
	},

	

	

});