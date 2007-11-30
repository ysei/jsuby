//// Util ////////////////////////////////////////////////////////////

RubyEngine.Util = {
  getRubyScriptList: function(){
    var ret = []
    var ary = document.getElementsByTagName("script");
    for(var i=0; i < ary.length; i++) {
    	if(ary[i].type == "text/ruby") ret.push(ary[i]);
    }
    return ret;
  }
}

