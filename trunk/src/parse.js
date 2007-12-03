
//// Parser //////////////////////////////////////////////////////////

RubyEngine.Parser = function(){}
RubyEngine.Parser.prototype.isfull = function(){ return this.body.match(/^\s*$/) }
RubyEngine.Parser.prototype.parse = function(body) {
	this.body = body;
	return this.compstmt();
}

//  CompStmt: Stmt (Term+ Stmt)*
RubyEngine.Parser.prototype.compstmt = function() {
	var x, y;
	x=this.stmt();
	if (x==null || typeof(x)=="undefined") return undefined;
	var ret = [x];
	var prebody = this.body;
	while (x=this.term()) {
		while(this.term());
		if (!(y=this.stmt())) break;
		prebody = this.body;
		ret.push(y);
	}
	this.body = prebody;
	return ret;
}

//  Stmt : Expr
RubyEngine.Parser.prototype.stmt = function() {
	return this.expr();
}

//  Expr: Expr2 (if Expr2|unless Expr2|while Expr2)*
RubyEngine.Parser.prototype.expr = function() {
	var x, y;
	x=this.expr2();
	if (x==null || typeof(x)=="undefined") return undefined;
	var ret = [x]
	while (this.body.match(/^[ \t]*(if|unless|while|until)/)) {
		var prebody = this.body;
		this.body = RegExp.rightContext;
		x = RegExp.$1;
		if (!(y=this.expr2())) {
			this.body = prebody;
			break;
		}
		ret.push(x, y);
	}
	return ret;
}

//  Expr2: Command | Arg 
RubyEngine.Parser.prototype.expr2 = function() {
	var x, y, z;
	var prebody = this.body;
	if (x=this.command()) return x;
  x=this.arg()
	if (x!=null && typeof(x)!="undefined") return x;
	this.body = prebody;
	return undefined;
}

//  Command: Operation Args | Primary '.' Operation Args
RubyEngine.Parser.prototype.command = function() {
	var x, y, z;
	var prebody = this.body;
	if (x=this.operation()) {
		if (y=this.args()) return new RubyEngine.Node.Method(x, null, y);
		this.body=prebody;
	}
  x=this.primary()
	if (x!=null && typeof(x)!="undefined") {
		if (this.body.match(/^[ \t]*\./)) {
			this.body = RegExp.rightContext;
			if ((y=this.operation()) && (z=this.args())) return new RubyEngine.Node.Method(y, x, z);
		}
		this.body=prebody;
	}
	return undefined;
}


RubyEngine.Parser.prototype.lhs = function() {
	return this.varname();
}

//  Args: Arg ([,] Arg)*
RubyEngine.Parser.prototype.args = function() {
	var x, y;
	if (!(x=this.arg())) return undefined;
	var ret = [x];
	var prebody = this.body;
	while ((x=this.comma()) && (y=this.arg())) {
		prebody = this.body;
		ret.push(y);
	}
	this.body = prebody;
	return ret;
}

// Arg: Lhs '=' Arg | Primary (Operator Primary)*
RubyEngine.Parser.prototype.arg = function() {
	var x, y;
	var prebody = this.body;
	if (x=this.lhs()) {
		if (this.body.match(/^[ \t]*\=/)) {
			this.body = RegExp.rightContext;
			if ((y=this.arg())!=undefined) return new RubyEngine.Node.Method("*let", null, [x, y]);
		}
		this.body=prebody;
	}
	x=this.primary();
	if (x!=null && typeof(x)!="undefined") {
		var ret = [x];
		prebody = this.body;
		while ((x=this.operator()) && ((y=this.primary())!=null)) {
			prebody = this.body;
			ret.push(x, y);
		}
		this.body = prebody;
		if (ret.length==1) return ret[0];
		return new RubyEngine.Node.Expression(ret);
	}
	return undefined;
}

RubyEngine.Parser.prototype.blockvars = function() {
	var x;
	var prebody = this.body;
	if (this.body.match(/^[ \t]*(\|)/)) {
		this.body = RegExp.rightContext;
		if ((x = this.varname()) && this.body.match(/^[ \t]*(\|)/)) {
			this.body = RegExp.rightContext;
			return [x];
		}
		this.body = prebody;
	}
	return null
}

//  Primary : Primary2 ('.'Operation ('(' Args ')')? ('{' ('|'Varname'|')? CompStmt '}')? )* 
RubyEngine.Parser.prototype.primary = function() {
//console.log(this.body);console.trace();if(!confirm("continue?")) exit();
	var prim = this.primary2();
  while(prim != undefined) {
		if (!this.body.match(/^[ \t]*\./)) return prim;

    var y, z;
    var prebody = this.body;
		this.body = RegExp.rightContext;

    // '.'Operation
		if ((y=this.operation()) == undefined) {
		  this.body = prebody;
		  return prim;
		}

    // ('(' Args ')')?
		if (this.body.match(/^[ \t]*(\()/)) {
			prebody = this.body;
			this.body = RegExp.rightContext;
			if (((z = this.args())!=undefined) && this.body.match(/^[ \t]*(\))/)) {
				this.body = RegExp.rightContext;
      } else {
				this.body = prebody;
				z = null;
			}
    }
		prim = new RubyEngine.Node.Method(y, prim, z);

    // ('{' ('|'Varname'|')? CompStmt '}')?
		if (this.body.match(/^[ \t]*(\{)/)) {
			prebody = this.body;
			this.body = RegExp.rightContext;
			y = this.blockvars();
			while(this.term());
      z=this.compstmt();
      if (z==undefined) z=null;
			if (this.body.match(/^\s*\}/)) {
				this.body = RegExp.rightContext;
				prim.block = new RubyEngine.Node.Block(y, z);
			} else {
    		this.body = prebody;
    	}
    }
	}
  return prim;
}

//  Primary2: '(' Expr ')' | Literal | Reference 
//         if Arg Then CompStmt (elsif Arg Then CompStmt)* (else CompStmt)? end
//  Literal: / $INT:push | $JS_STRING:push /,
RubyEngine.Parser.prototype.primary2 = function() {
	var x, y, z;
	var prebody = this.body;
	if (this.body.match(/^[ \t]*(\()/)) {
		this.body = RegExp.rightContext;
		if ((x = this.expr()) && this.body.match(/^[ \t]*(\))/)) {
			this.body = RegExp.rightContext;
			return x;
		}
		this.body = prebody;
	}
	if (this.body.match(/^[ \t]*(-?0x[0-9A-F]+|(-?)0b([01]+)|-?0o?[0-7]+|-?(?:0d)?[0-9]+)/i)) {
		this.body = RegExp.rightContext;
    var i;
    if (RegExp.$3) {
		  i = parseInt(RegExp.$3, 2);
      if (RegExp.$2) {
        i = -i;
      }
    } else {
		  i = parseInt(RegExp.$1.replace(/0d/i, '').replace(/0o/i, '0'));
    }
		return new RubyEngine.RubyObject.Numeric(i);
  } else if (this.body.match(/^[ \t]*\?(.)/)) { // ?a
		this.body = RegExp.rightContext;
		return new RubyEngine.RubyObject.Numeric(RegExp.$1.charCodeAt(0));
	} else if (this.body.match(/^[ \t]*"((?:[^\\"]|\\.)*)"|^[ \t]*'((?:[^\\']|\\.)*)'/)) { //"
		this.body = RegExp.rightContext;
		return new RubyEngine.RubyObject.String(RegExp.$1 || RegExp.$2);
	} else if (x=this.reference()) {
		return x;
	}
	if (this.body.match(/^[ \t]*(if)/)) {
		this.body = RegExp.rightContext;
		x = RegExp.$1;
		if ((y = this.arg())!=undefined && this.then()) {
			while (this.term());
			if (z=this.compstmt()) {
			  var args = [y, z];
				while (this.body.match(/^[ \s]*(elsif)/)) {
					var prebody2 = this.body;
					this.body = RegExp.rightContext;
					if ((y = this.arg()) && this.then()) {
						while (this.term());
						if (!(z=this.compstmt())) { this.body = prebody2; break; }
						args.push(y, z)
					}
				}
				if (this.body.match(/^[ \s]*(else)/)) {
					var prebody2 = this.body;
					this.body = RegExp.rightContext;
					while (this.term());
					if (z=this.compstmt()) { 
						args.push(true, z)
					} else {
						this.body = prebody2
					}
				}
				if (this.body.match(/^[ \s]*(end)/)) {
					this.body = RegExp.rightContext;
					return new RubyEngine.Node.Method(x, null, args);
				}
			}
		}
		this.body = prebody;
	}
	return undefined;
}

RubyEngine.Parser.prototype.then = function() {
	if (this.body.match(/^\s*(then)/)) {
	  this.body = RegExp.rightContext;
	  return "then"
  }
	return this.term();
}

RubyEngine.Parser.prototype.varname = function() {
	if (this.body.match(/^[ \t]*([A-Za-z_][A-Za-z0-9_]*)/) && !RubyEngine.RESERVED[RegExp.$1]) {
		this.body = RegExp.rightContext;
		return new RubyEngine.Node.Variable(RegExp.$1);
	}
}


//////////////////////////////////////////////////////////////////////

RubyEngine.Parser.prototype.term = function() {
	if (this.body.match(/^[ \t]*(\r?\n|;)/)) {
		this.body = RegExp.rightContext;
		return RegExp.$1
	}
	return undefined;
}
RubyEngine.Parser.prototype.comma = function() {
	if (this.body.match(/^[ \t]*,/)) {
		this.body = RegExp.rightContext;
		return ",";
	}
	return undefined;
}

RubyEngine.Parser.prototype.operator = function() {
	if (this.body.match(/^[ \t]*(\.\.|\+|\-|\*{1,2}|\/|%|==|[<>]=?|&&|\|\||<<|>>)/)) {
		this.body = RegExp.rightContext;
		return new RubyEngine.Node.Operator(RegExp.$1);
	}
	return undefined;
}

RubyEngine.Parser.prototype.reference = function() {
	if (this.body.match(/^[ \t]*([A-Za-z_][A-Za-z0-9_]*[\!\?]?)/) && !RubyEngine.RESERVED[RegExp.$1]) {
		this.body = RegExp.rightContext;
		return new RubyEngine.Node.Ref(RegExp.$1);
	}
	return undefined;
}

// Operation: $IDENTIFIER('!'|'?')?
RubyEngine.Parser.prototype.operation = function() {
	if (this.body.match(/^[ \t]*([A-Za-z_][A-Za-z0-9_]*[\!\?]?)/) && !RubyEngine.RESERVED[RegExp.$1]) {
		this.body = RegExp.rightContext;
		return RegExp.$1;
	}
	return undefined;
}



