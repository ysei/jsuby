//// RubyObject //////////////////////////////////////////////////////


RubyEngine.RubyObject = {
  inherit: function(s, c) {
    c.prototype = new s();
    c.clz = {};
    c.methods = {}
    c.superclz = s;
    return c;
  },
  call: function(self, name, args, block){
    var clz = self.clz;
    var method;
    while( !(method=clz.methods[name]) ) if ( !(clz=clz.superclz) ) break;
    if (method) {
      return method.apply(this, [self, args, block]);
    } else if (name!="method_missing") {
      var newarg = [new RubyEngine.RubyObject.String(name)];
      if (args && args.length > 0) newarg = newarg.concat(args);
      var ret = RubyEngine.RubyObject.call.apply(this, [self, "method_missing", newarg, block]);
      if (ret!=undefined) return ret;
      return new RubyEngine.RubyObject.NameError("undefined local variable or method `"+name+"' for "+self.clz.toString(), name);
    }
    return undefined;
  },
  js2r: function(obj){
    if (obj==undefined) return obj;
    if (obj==null) return obj; // TODO:
    var clzname = Object.prototype.toString.call(obj);
    if (clzname == "[object String]") {                 // string
      return new RubyEngine.RubyObject.String(obj);
    } else if (clzname == "[object Array]"){            // array
      var ary = []
      for (var i=0;i<obj.length;i++) ary.push(RubyEngine.RubyObject.js2r(obj[i]));
      var ret = new RubyEngine.RubyObject.Array();
      ret.array = ary;
      return ret;
      return new RubyEngine.RubyObject.Array(ary);
    } else if (clzname == "[object Number]") {          // number
      return new RubyEngine.RubyObject.Numeric(obj);
    } else if (clzname == "[object Boolean]") {         // TODO: boolean
      return obj;
    } else {                                            // others
      return new RubyEngine.RubyObject.JSObject(obj);
    }
  }
}

RubyEngine.RubyObject.Object = function(){ this.clz = RubyEngine.RubyObject.Object; }
RubyEngine.RubyObject.Object.prototype.toValue = function(){ return this; } // to Javascript value(instance)


RubyEngine.RubyObject.Object.clz = { "methods":{} }
RubyEngine.RubyObject.Object.methods = {
 inspect: function(self, args){ return self.toString(); },
 dup: function(self, args){ return self; } // TODO:
}


RubyEngine.RubyObject.Numeric = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object ,function(){
  this.toValue = function(){ return this.num; }
  this.clz = RubyEngine.RubyObject.Numeric;
  this.num = 0;
  if (arguments.length>0) this.num = arguments[0];
});
//RubyEngine.RubyObject.Numeric.prototype.toValue = function(){ return this.num; }
RubyEngine.RubyObject.Numeric.prototype = {
  toString: function(){ return this.num.toString(); },
  toSource: function(){ return this.num.toString(); },
  neg: function(){ return new RubyEngine.RubyObject.Numeric(-this.num); },
  add: function(x){ return new RubyEngine.RubyObject.Numeric(this.num + x.num); },
  sub: function(x){ return new RubyEngine.RubyObject.Numeric(this.num - x.num); },
  mul: function(x){ return new RubyEngine.RubyObject.Numeric(this.num * x.num); },
  div: function(x){ return new RubyEngine.RubyObject.Numeric(parseInt(this.num / x.num)); },
  mod: function(x){ return new RubyEngine.RubyObject.Numeric(this.num % x.num); },
  pow: function(x){ return new RubyEngine.RubyObject.Numeric(Math.pow(this.num, x.num)); },
  eql: function(x){ return this.num == x.num; },
  cmp: function(x){ return (this.num==x.num?0:(this.num<x.num?-1:1)); }
}
RubyEngine.RubyObject.Numeric.methods = {
  "chr": function(self, args, block) {
    return new RubyEngine.RubyObject.String( String.fromCharCode(self.num) );
  },
  "to_s": function(self, args, block) {
    return new RubyEngine.RubyObject.String( String(self.num) );
  },
  "upto": function(self, args, block) {
    if (!block) return null;  // TODO: error
    var b = new RubyEngine.Node.BlockIterator(block, function(b){
      if(b.now<=b.to)
        return b.getargs([new RubyEngine.RubyObject.Numeric(b.now++)]);
    });
    b.to=args[0].num;
    b.now=self.num;
    this.command.push(b);
    return self;
  }
};


RubyEngine.RubyObject.String = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object ,function(){
  this.toValue = function(){ return this.str; }
  this.clz = RubyEngine.RubyObject.String;
  this.str = "";
  if (arguments.length>0) this.str = arguments[0];
});
//RubyEngine.RubyObject.String.prototype.toValue = function(){ return this.str; }
RubyEngine.RubyObject.String.prototype.toString = function(){ return this.str; }
RubyEngine.RubyObject.String.prototype.toSource = function(){ return '"'+this.str+'"'; }
RubyEngine.RubyObject.String.prototype.add = function(x){ return new RubyEngine.RubyObject.String(this.str + x.str); }
RubyEngine.RubyObject.String.prototype.mul = function(x){
  var st="";
  for(var i=0;i<x.num;i++) st+=this.str;
  return new RubyEngine.RubyObject.String(st);
}
RubyEngine.RubyObject.String.prototype.eql = function(x){ return this.str == x.str; }
RubyEngine.RubyObject.String.methods = {
  "length": function(self, args, block) {
    return new RubyEngine.RubyObject.Numeric(self.str.length);
  },
  "reverse": function(self, args, block) {
    var st = "";
    for(var i=self.str.length-1;i>=0;i--) st += self.str.charAt(i);
    return new RubyEngine.RubyObject.String(st);
  },
  "center": function(self, args, block) {
    var len=args[0].num;
    var st = "";
    for(var i=(len-self.str.length-1)/2;i>0;i--) st += " ";
    st += self.str;
    while(st.length<len) st += " ";
    return new RubyEngine.RubyObject.String(st);
  },
  "to_i": function(self, args, block) {
    var v = parseInt(self.str);
    if (isNaN(v)) v=0;
    return new RubyEngine.RubyObject.Numeric(v);
  },
  "[]": function(self, args, block) {
    return new RubyEngine.RubyObject.Numeric(self.str.charCodeAt(args[0].num));
  },
  "[]=": function(self, args, block) {
    var x = args[0].num;
    if (RubyEngine.RubyObject.Numeric.prototype.isPrototypeOf(args[1])) {
      self.str = self.str.substr(0,x) + String.fromCharCode(args[1].num) + self.str.substr(x+1);
      return args[1];
    } else {
      self.str = self.str.substr(0,x) + args[1].toString() + self.str.substr(x+1);
      return args[1];
    }
  }
};


RubyEngine.RubyObject.Array = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object ,function(){
  this.toValue = function(){
    var ret = [];
    for(var i=0;i<this.array.length;i++) ret.push( this.array[i].toValue() );
    return ret;
  }
  this.clz = RubyEngine.RubyObject.Array;
  this.array = [];
});
RubyEngine.RubyObject.Array.toSource = function(){ return "Array"; }
RubyEngine.RubyObject.Array.prototype.toSource = function(){
  var ret = "[";
  for(var i=0;i<this.array.length;i++) {
    if (i>0) ret+=",";
    ret += this.array[i].toSource();
  }
  return ret + "]";
}
RubyEngine.RubyObject.Array.prototype.toString = function(){
  var ret = "[";
  for(var i=0;i<this.array.length;i++) {
    if (i>0) ret+=",";
    ret += this.array[i].toString();
  }
  return ret + "]";
}
RubyEngine.RubyObject.Array.prototype.sft = function(x){
  this.array.push(x);
  return this;
}
RubyEngine.RubyObject.Array.clz.methods = {
  "new": function(self, args, block) {
    var obj = new RubyEngine.RubyObject.Array();
    var ary = [];
    if (args) for(var i=0;i<args.length;i++) ary.push(args[i]);
    obj.array = ary;
    return obj;
  }
}
RubyEngine.RubyObject.Array.methods = {
  "[]": function(self, args, block) {
    return self.array[args[0].num];
  },
  "push": function(self, args, block) {
    if(args){
      for(var i=0;i<args.length;i++) self.array.push(args[i]);
    }
    return self;
  },
  "[]=": function(self, args, block) {
    return self.array[args[0]] = args[1];
  },
  "length": function(self, args, block) {
    return new RubyEngine.RubyObject.Numeric(self.array.length);
  },
  "member?": function(self, args, block) {
    var x=args[0];
    for(var i=0;i<self.array.length;i++) {
      if (x.eql(self.array[i])) return true;
    }
    return false;
  },
  "reverse": function(self, args, block) {
    var ret = new RubyEngine.RubyObject.Array();
    ret.array = self.array.reverse;
    return ret;
  },
  "each": function(self, args, block) {
    if (!block) return null;  // TODO: error
    var b = new RubyEngine.Node.BlockIterator(block, function(b){
      if(b.i<=b.array.length) return b.getargs([b.array[b.i++]]);
    });
    b.array=self.array;
    b.i=0
    this.command.push(b);
    return self;
  },
  "inject": function(self, args, block) {
    if (!block) return null;  // TODO: error
    var b = new RubyEngine.Node.BlockIterator(block, function(b){
      if(b.i<b.array.length) return b.getargs([this.stack.pop(), b.array[b.i++]]);
    });
    b.array=self.array;
    if(args && args.length>0){
      this.stack.push(args[0]);
      b.i=0
    } else {
      this.stack.push(self.array[0]);
      b.i=1;
    }
    this.command.push(b);
  },
  "join": function(self, args, block) {
    var st = "", sep = (args&&args.length>0?args[0].str:""); // TODO: $,
    for(var i=0;i<self.array.length;i++) {
      if(i>0) st+=sep;
      st+=self.array[i].toString();
    }
    return new RubyEngine.RubyObject.String(st);
  }
};


RubyEngine.RubyObject.Range = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object ,function(from, to){
  this.clz = RubyEngine.RubyObject.Range;
  this.from = from;
  this.to = to;
});
RubyEngine.RubyObject.Range.prototype.toString = function(){ return "("+this.from+".."+this.to+")" }
RubyEngine.RubyObject.Range.prototype.toValue = function(){
  var value=[];
  for(var i=this.from;i<=this.to;i++) value.push(i);
  return value;
}
RubyEngine.RubyObject.Range.methods = {
  "each": function(self, args, block) {
    if (!block || !block.block) return self;  // TODO: error
    var b = new RubyEngine.Node.BlockIterator(block, function(b){
      if(b.i<=b.to) return b.getargs([new RubyEngine.RubyObject.Numeric(b.i++)]);
    });
    b.i=self.from;
    b.to=self.to;
    this.command.push(b);
    return self;
  }
}


RubyEngine.RubyObject.JSObject = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object ,function(obj){
  this.obj = obj;
  this.clz = RubyEngine.RubyObject.JSObject;
});
RubyEngine.RubyObject.JSObject.prototype.toString = function(){ return this.obj.toString(); }
RubyEngine.RubyObject.JSObject.prototype.toValue = function(){ return this.obj; }
RubyEngine.RubyObject.JSObject.methods = {
  "new": function(_self, args, block) {
    var jsargs = [];
    if(args) for(var i=0;i<args.length;i++) jsargs.push("args["+i+"].toValue()");
    return RubyEngine.RubyObject.js2r(eval( "new _self.obj("+jsargs.join(',')+")" ));
  },
  "[]": function(self, args, block) {
    return RubyEngine.RubyObject.js2r(self.obj[args[0].num]);
  },
  "each": function(self, args, block) {
    if (!block || !block.block) return self;  // TODO: error
    var b = new RubyEngine.Node.BlockIterator(block, function(b){
      if(b.i<b.obj.length) return b.getargs([RubyEngine.RubyObject.js2r(b.obj[b.i++])]);
    });
    b.obj=self.obj;
    b.i=0
    this.command.push(b);
    return self;
  },
  "method_missing": function(self, args, block) {
    var name = args[0].str;
    if (args.length==1) {
      return RubyEngine.RubyObject.js2r(self.obj[name]);
    } else if (name.charAt(name.length-1) == "=") {
      self.obj[name.slice(0, name.length-1)] = args[1].toValue();
      return args[1];
    } else {
      if (name in self.obj) {
        if (RubyEngine.IE) {
          var jsargs = [];
          for (var i=1;i<args.length;i++) jsargs.push( "args["+i+"].toValue()" );
          return RubyEngine.RubyObject.js2r( eval( "self.obj[name]("+jsargs.join(',')+")" ));
        } else { // others
          var jsargs = [];
          for (var i=1;i<args.length;i++) jsargs.push( args[i].toValue() );
          return RubyEngine.RubyObject.js2r(self.obj[name].apply(self.obj, jsargs));
        }
      } else {
        return new RubyEngine.RubyObject.NameError("undefined local variable or method `"+name+"' for "+self.obj.toString(), name);
      }
    }
  }
}



//// Exception ///////////////////////////////////////////////////////

RubyEngine.RubyObject.Exception = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Object,function(){});
RubyEngine.RubyObject.Exception.prototype.toString = function(){ return this.message; }
RubyEngine.RubyObject.Exception.prototype.toSource = function(){ return this.message; }

RubyEngine.RubyObject.StandardError = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.Exception,function(){});
RubyEngine.RubyObject.NameError = RubyEngine.RubyObject.inherit(RubyEngine.RubyObject.StandardError,function(){
  this.toValue = function(){ return this; }
  if (arguments.length>0) this.message = arguments[0];
  if (arguments.length>1) this.name = arguments[1];
});

