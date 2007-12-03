//// Interpreter /////////////////////////////////////////////////////

RubyEngine.Interpreter = function(){
	this.scope = [{}];
	this.stdout = "";
	this.parser = new RubyEngine.Parser();
}
RubyEngine.Interpreter.prototype.writeStdout = function(st){
	this.stdout += st;
}

RubyEngine.Interpreter.prototype.exec = function(node){
  if (typeof(node)=="string") node = this.parser.parse(node);
  var ret = this.run(node);
  if (typeof(ret)=="object" && "toValue" in ret) return ret.toValue();
  return ret;
}

RubyEngine.Interpreter.prototype.run = function(node){
//console.log(args[idx].toSource());console.trace();if(!confirm("continue?")) exit();
	var ret = null;
	if (Array.prototype.isPrototypeOf(node)) {
  	for (var idx=0;idx<node.length;idx++) {
			ret = this.run(node[idx]);
		}

	} else if (RubyEngine.Node.Variable.prototype.isPrototypeOf(node)) {
		ret = this.scope[0][node.name];

	} else if (RubyEngine.Node.Ref.prototype.isPrototypeOf(node)) {
    if (this.scope[0].hasOwnProperty(node.name)) {
		  ret = this.scope[0][node.name];
		} else {
      ret = this.kernelMethod(node);
		}

	} else if (RubyEngine.Node.Expression.prototype.isPrototypeOf(node)) {
		ret = this.calcExpr(node);

	} else if (RubyEngine.Node.Method.prototype.isPrototypeOf(node)) {
		if (node.target && node.target!=null) {
			ret = this.objectMethod(node);
		} else {
			ret = this.kernelMethod(node);
		}

	} else {
		ret = node;
	}
	return ret;
}
RubyEngine.Interpreter.prototype.calcExpr = function(node){
	var calclist = node.list;
	var stk = [];
	for (var idx=0;idx<calclist.length;idx++) {
		var x = calclist[idx];
		if (Array.prototype.isPrototypeOf(x)) {
			stk.push( this.run(x) );
		} else if (RubyEngine.Node.Expression.prototype.isPrototypeOf(x)) {
			stk.push( this.calcExpr(x) );
		} else if (RubyEngine.Node.Variable.prototype.isPrototypeOf(x)) {
			stk.push( this.scope[0][x.name] );
		} else if (RubyEngine.Node.Ref.prototype.isPrototypeOf(x)) {
			stk.push( this.scope[0][x.name] );
		} else if (RubyEngine.Node.Operator.prototype.isPrototypeOf(x)) {
			switch (x.name) {
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
			}
		} else {
			stk.push(x);
		}
	}
	return stk.pop();
}

RubyEngine.Interpreter.prototype.kernelMethod = function(node){
  var method = RubyEngine.Interpreter.KernelMethod[node.name];
  if (typeof(method)=="function") {
    return method.apply(this, [node.args]);
  } else {
		alert("undefined method: " + node.name);
	}
}
RubyEngine.Interpreter.prototype.objectMethod = function(node){
//console.log(node.toSource());console.trace();if(!confirm("continue?")) exit();
  var obj = this.run(node.target);
  var method = obj.clz.methods[node.name];
  if (method) {
    return method.apply(this, [obj, node.args, node.block]);
  } else {
    alert("undefined method :" + obj.toSource() + "." + node[idx].toSource());
  }
}


