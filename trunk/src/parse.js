
//// Parser //////////////////////////////////////////////////////////

RubyEngine.Parser = function(){}
RubyEngine.Parser.prototype.isfull = function(){ return this.body.match(/^\s*$/) }
RubyEngine.Parser.prototype.parse = function(body) {
	this.body = body;
	return this.compstmt();
}

//  CompStmt: Stmt (Term+ Stmt)*
RubyEngine.Parser.prototype.compstmt = function() {
	var x;
	if ((x=this.stmt())==undefined) return undefined;
	var ret = [x];
	var prebody = this.body;
	while (this.term()) {
		while(this.term());
		if (!(x=this.stmt())) break;
		prebody = this.body;
		ret.push(x);
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
	if ((x=this.expr2())==undefined) return undefined;
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
	var x;
	if ((x=this.command())!=undefined) return x;
	if ((x=this.arg())!=undefined) return x;
	return undefined;
}

//  Command: Operation Args
RubyEngine.Parser.prototype.command = function() {
	var x, y, z;
	var prebody = this.body;
	if (x=this.operation()) {
		if (this.body.match(/^[ \t]+/) && (y=this.args())) return new RubyEngine.Node.Method(x, null, y);
		this.body=prebody;
	}
	return undefined;
}

//  Lhs : VarName | Primary '[' Args ']' | Primary . IDENTIFIER
RubyEngine.Parser.prototype.lhs = function() {
  var x;
  var prebody = this.body;
  if ((x=this.primary())!=undefined) {
    if (RubyEngine.Node.Method.prototype.isPrototypeOf(x) && x.block==undefined && (x.name=="[]" || x.args==undefined || x.args.length==0)) return x;
    this.body = prebody;
  }
  if ((x=this.varname())!=undefined) return x;
  return undefined;
}

//  Args: Arg ([,] Arg)*
RubyEngine.Parser.prototype.args = function() {
	var x, y;
	if ((x=this.arg())==undefined) return undefined;
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
			if ((y=this.arg())!=undefined) {
        if (RubyEngine.Node.Method.prototype.isPrototypeOf(x)) {
          x.name += "=";
          if (x.args) { x.args.push(y); } else { x.args = [y]; }
          return x;
        } else {
          return new RubyEngine.Node.Method("*let", null, [x, y]);
        }
      }
		}
		this.body=prebody;
	}

	if ((x=this.primary())!=undefined) {
		var ret = [x];
		prebody = this.body;
		while ((x=this.operator()) && ((y=this.primary())!=undefined)) {
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

// Primary : Primary2 ( '[' Args ']' | '.'Operation ('(' Args ')')? ('{' ('|'Varname'|')? CompStmt '}')? )* Args?
// # for removing left recursions of Primary in BNF of Ruby
RubyEngine.Parser.prototype.primary = function() {
//console.log(this.body);console.trace();if(!confirm("continue?")) exit();
	var prim = this.primary2();
  while(prim != undefined) {
    var y, z;
    var prebody = this.body;

		if (!this.body.match(/^[ \t]*(\.|\[)/)) break;
		this.body = RegExp.rightContext;

    // '[' Args ']'
    if (RegExp.$1=='[') {
      y = this.args();
      if (y==undefined || !this.body.match(/^[ \t]*\]/)) {
        this.body = prebody;
        break;
      }
  		this.body = RegExp.rightContext;
  		prim = new RubyEngine.Node.Method('[]', prim, y);
      continue;
    }

    // '.'Operation
		if ((y=this.operation()) == undefined) {
		  this.body = prebody;
		  break;
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

  // Args ( but only Method without arguments and block )
  var y;
  if (RubyEngine.Node.Method.prototype.isPrototypeOf(prim) && prim.args==null && prim.block==undefined && (y=this.args())!=undefined) prim.args = y;

  return prim;
}

//  Primary2: '(' Expr ')' | Literal | Reference | '[' Args ']'
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

  // '[' Args ']'
	if (this.body.match(/^[ \t]*\[/)) {
		this.body = RegExp.rightContext;
    x = this.args();
    if (this.body.match(/^[ \t]*\]/)) {
  		this.body = RegExp.rightContext;
      return new RubyEngine.Node.Method("new", RubyEngine.RubyObject.Array, x);
    }
    this.body = prebody;
  }

  // if Arg Then CompStmt (elsif Arg Then CompStmt)* (else CompStmt)? end
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
	if (this.body.match(/^[ \t]*([A-Za-z_\$][A-Za-z0-9_]*[\!\?]?)/) && !RubyEngine.RESERVED[RegExp.$1]) {
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



