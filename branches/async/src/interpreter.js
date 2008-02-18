//// Interpreter /////////////////////////////////////////////////////

RubyEngine.Scope = function(){ this.clear(); }
RubyEngine.Scope.prototype = {
  pushScope: function(args){ this.stack.push(this.level); this.level=[args || {}]; },
  popScope: function(){ this.level = this.stack.pop(); },
  pushLevel: function(args){ this.level.push(args || {}); },
  popLevel: function(){ this.level.pop(); },
  clear: function(){
    this.level = [{}];
    this.stack = [];
    this.global = {};
    if (typeof(window)!='undefined') this.global={"$window": new RubyEngine.RubyObject.JSObject(window), "$document": new RubyEngine.RubyObject.JSObject(document) };
    for(var i in RubyEngine.Interpreter.KernelMethod) {
      if (i.match(/^[a-z_\*]/)) this.global[i] = RubyEngine.Interpreter.KernelMethod[i];
    }
    for(var i in RubyEngine.RubyObject) {
      if (i.match(/^[A-Z\$]/)) this.global[i] = RubyEngine.RubyObject[i];
    }
  },
  globalsubstitute: function(name, value){
    return this.global[name] = value;
  },
  substitute: function(name, value){
    if (name.match(/^\$/)) {
        return this.global[name] = value;
    } else if (name.match(/^[A-Z]/)) {
      if (name in this.global) { /* "warning: already initialized constant "+name */ }
      return this.global[name] = value;
    } else {
      for(var i=this.level.length-1;i>=0;i--) {
        if (name in this.level[i]) return this.level[i][name] = value;
      }
      return this.level[this.level.length-1][name] = value;
    }
  },
  reference: function(name){
    for(var i=this.level.length-1;i>=0;i--) {
      if (name in this.level[i]) return this.level[i][name];
    }
    if (name in this.global) return this.global[name];
    return new RubyEngine.RubyObject.NameError("undefined local variable or method `"+name+"'", name);
  },
  call: function(name, args, block, refflag) {
    var ref = this.scope.reference(name);
    if (typeof(ref) == "function") {
      ref.apply(this, [args, block]);
    } else if (RubyEngine.RubyObject.JSObject.prototype.isPrototypeOf(ref)) {
      var jsargs = [];
      if(args) for (var i=0;i<args.length;i++) jsargs.push( args[i].toValue() );
      this.stack.push(RubyEngine.RubyObject.js2r(ref.obj.apply(ref.obj, jsargs)));
    } else if (RubyEngine.Node.Block.prototype.isPrototypeOf(ref)) {
      this.command.push("popScope");
      this.compile(ref.block);
      var vars=ref.vars, _args={};
      for(var i=0;i<vars.length && i<args.length;i++) _args[vars[i].name]=args[i];
      this.scope.pushScope(_args);
    } else if (refflag) {
      this.stack.push(ref);
    } else {
      this.stack.push(new RubyEngine.RubyObject.NameError("undefined local variable or method `"+name+"'", name));
    }
  }
}

RubyEngine.Interpreter = function(){
  this.context = {};
	this.scope = new RubyEngine.Scope();
	this.stdout = "";
	this.parser = new RubyEngine.Parser();
	this.command = [];
	this.stack = [];
}
RubyEngine.Interpreter.prototype = {
  writeStdout: function(st){this.stdout += st;},

  exec: function(node){
    this.command=[];this.stack=[];
    if (typeof(node)=="string") node = this.parser.parse(node);
    this.compile(node);
    while(this.command.length>0) this.loop(false);
    var ret = this.stack.pop();
    if (typeof(ret)=="object" && "toValue" in ret) return ret.toValue();
    return ret;
  },

  exec_async: function(node){
    if (typeof(node)=="string") node = this.parser.parse(node);
    this.compile(node);
    this.loop();
  },

  compile: function(x) {
		if (Array.prototype.isPrototypeOf(x)) {
      if (x.length==1) {
        this.compile(x[0]);
      } else {
  			this.command.push( new RubyEngine.Node.Iterator(x) );
			}
		} else if (RubyEngine.Node.Expression.prototype.isPrototypeOf(x)) {
    	var list = x.list;
    	for (var i=list.length-1;i>=0;i--) this.compile(list[i]);
		} else if (RubyEngine.Node.Method.prototype.isPrototypeOf(x)) {
    	this.command.push(x);
      if(x.target) this.compile(x.target);
    	var list = x.args;
    	if(list) for (var i=0;i<list.length;i++) this.compile(list[i]);
			this.command.push( "end of arguments" );
		} else if (RubyEngine.Node.IfIterator.prototype.isPrototypeOf(x)) {
      x.init.apply(this, [x]);
		} else {
			this.command.push( x );
		}
  },

  loop: function(){
    this.sleep=0;
    var stk=this.stack;
    var x=this.command.pop(), y;
		if(typeof(x)=="string") {
      switch(x) {
        case "popLevel":
          this.scope.popLevel();
          break;
        case "popScope":
          this.scope.popScope();
          break;
        default:
    			stk.push(x);
      }
		} else if (RubyEngine.Node.Iterator.prototype.isPrototypeOf(x)) {
      if ((y=x.next())!=undefined) {
        this.stack.pop();  // anxious...
        this.command.push( x );
        this.compile(y);
      }
		} else if (RubyEngine.Node.Method.prototype.isPrototypeOf(x)) {
      var obj;
      if (x.target) obj=stk.pop();
      var args=[], y;
      while((y=stk.pop())!="end of arguments") {
        if (y==undefined) {console.log("BUG!: no 'end of arguments'" + this.command.toSource());this.command=[];return;}  // DEBUG
        args.push(y);
      }
      if (obj) {
        var methods = obj.clz.methods, ret;
        if (x.name in methods) {
          ret=methods[x.name].apply(this, [obj, args, x.block]);
        } else {
          args.unshift(new RubyEngine.RubyObject.String(x.name));
          ret=methods["method_missing"].apply(this, [obj, args, x.block]);
        }
        if(ret!=undefined) stk.push(ret);
      } else {
        this.scope.call.apply(this, [x.name, args, x.block, false]);
      }
		} else if (RubyEngine.Node.BlockIterator.prototype.isPrototypeOf(x)) {
      x.next.apply(this, [x]);
		} else if (RubyEngine.Node.IfIterator.prototype.isPrototypeOf(x)) {
      x.next.apply(this, [x]);
		} else if (RubyEngine.Node.Ref.prototype.isPrototypeOf(x)) {
      var ref=this.scope.reference(x.name);
      if (typeof(ref) == "function" && !("methods" in ref)) {
        ref.apply(this, [[], null]);
      } else {
        stk.push(ref);
      }

		} else if (RubyEngine.Node.Operator.prototype.isPrototypeOf(x)) {
			switch (x.name) {
			case "-@":
				stk.push(stk.pop().neg());
				break;
			case "+":
				var a = stk.pop();
				stk.push(stk.pop().add(a));
				break;
			case "-":
				var a = stk.pop();
				stk.push(stk.pop().sub(a));
				break;
			case "*":
				var a = stk.pop();
				stk.push(stk.pop().mul(a));
				break;
			case "/":
				var a = stk.pop();
				stk.push(stk.pop().div(a));
				break;
			case "%":
				var a = stk.pop();
				stk.push(stk.pop().mod(a));
				break;
			case "**":
				var a = stk.pop();
				stk.push(stk.pop().pow(a));
				break;
			case "..":
				var to = stk.pop();
				var from = stk.pop();
        stk.push(new RubyEngine.RubyObject.Range(from.num, to.num));
				break;
			case "==":
				var a = stk.pop();
				stk.push(stk.pop().eql(a));
				break;
			case "<":
				var a = stk.pop();
				stk.push(stk.pop().cmp(a)<0);
				break;
			case ">":
				var a = stk.pop();
				stk.push(stk.pop().cmp(a)>0);
				break;
			case ">=":
				var a = stk.pop();
				stk.push(stk.pop().cmp(a)>=0);
				break;
			case "<<":
				var a = stk.pop();
				stk.push(stk.pop().sft(a));
				break;
			}
		} else {
			stk.push(x);
		}

    if(arguments.length==0 && this.command.length>0){
      var r=this;
      setTimeout(function(){r.loop.apply(r);}, r.sleep);
    }

  },

  call: function(name, args){
    var newargs=[];
    for(var i=0;i<args.length;i++) newargs.push(RubyEngine.RubyObject.js2r(args[i]));
    this.scope.call.apply(this, [name, newargs, null, true]);
    while(this.command.length>0) this.loop(false);
    var ret = this.stack.pop();
    if (typeof(ret)=="object" && "toValue" in ret) return ret.toValue();
    return ret;
  },
  put: function(name, value){
    this.scope.globalsubstitute(name, RubyEngine.RubyObject.js2r(value));
  }

}

