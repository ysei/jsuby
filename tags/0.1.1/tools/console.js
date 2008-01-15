
var jsruby_parser = new RubyEngine.Parser();
var jsruby_interpreter = new RubyEngine.Interpreter();

(function(){

function $(id) { return document.getElementById(id) }
String.prototype.toh = function(){ return this.replace(/</g, "&lt;").replace(/\n/g, "<br />"); }

function cmdentry(evt) {
	if (navigator.userAgent.indexOf("Gecko/")<0) evt = event;
	if (evt.keyCode==13) {
    jsruby_exec($('jsruby_input').value)
		$('jsruby_input').value = '';
	}
}

function jsruby_exec(cmd) {
	var jsirb = $('jsruby_console');
	var code = jsruby_parser.parse(cmd);
	if (code && jsruby_parser.isfull()) {
		jsruby_interpreter.stdout = "";
		var ret = jsruby_interpreter.run(code);
		if (typeof(ret)=="string") ret = ret.toh();
		jsirb.innerHTML += cmd.toh() + "<br />" + jsruby_interpreter.stdout.toh() + "=> " + ret + "<br />";
	} else {
		jsirb.innerHTML += cmd.toh() + "<br />" + "Syntax error.<br />";
	}
	var h = jsirb.scrollHeight - jsirb.clientHeight;
	if (h>0) jsirb.scrollTop = h;
}

function getpos(node){
  var x=0,y=0,e=node;
  while(e){
    x+=e.offsetLeft;
    y+=e.offsetTop;
    e=e.offsetParent;
  }
  return [x+node.offsetWidth/2, y+node.offsetHeight];
}

var w=document.createElement('div');
w.id='jsruby_window';
w.style.textAlign='left';
w.style.width='330px';
w.style.height='246px';
w.style.position='absolute';
w.style.top=100;
w.style.left=100;
w.style.fontSize='12px';
w.style.lineHeight='13px';
w.style.backgroundColor='#999';
w.style.border='1px solid #333';
w.style.zIndex=9999;
w.innerHTML = "<div style='margin:0;float:right;font-size:10px;height:10px;'><a href='javascript:void(0);' onClick='javascript:$('jsruby_window').style.display='none';'>[x]</a></div><div id='jsruby_titlebar' style='margin:0 5px;border:0;border-left:12px solid #b71234;padding:0 3px;font-size:12px;'>JSRuby Console</div><pre id='jsruby_console' style='width:320px;height:200px;margin:1px 5px;border:1px solid #333;background-color:#fff;font-size:12px;text-align:left;overflow:auto;clear:both;'></pre><input id='jsruby_input' style='width:320px;margin:1px 4px;background-color:#fff;font-size:12px;' />";
//document.body.appendChild(w);
document.body.insertBefore(w, document.body.firstChild);

var code="", x=0, y=0;
var s=document.selection;
if(s){
  s = s.createRange();
  code=s.text;
  x=s.boundingLeft+s.boundingWidth/2;
  y=s.boundingTop+s.boundingHeight;
} else if (s=window.getSelection()) {
  s=s.getRangeAt(0);
  code=s.toString();
  var pos=getpos(s.endContainer.parentNode);
  x=pos[0];
  y=pos[1];
}
if(code && code!="") {
  code=code.replace(/\r?\n|\r/g,"\n");
  jsruby_exec(code);
  w.style.left=x+'px';
  w.style.top=y+'px';
}

$('jsruby_input').onkeypress = cmdentry;

})();
