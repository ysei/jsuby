//// RubyObject //////////////////////////////////////////////////////


RubyEngine.RubyObject = {}
RubyEngine.RubyObject.inherit = function(s, c) {
  c.prototype = new s();
  c.clz = {};
  c.methods = {}
  c.superclz = s;
  return c;
}


RubyEngine.RubyObject.Object = function(){ this.clz = RubyEngine.RubyObject.Object; }
RubyEngine.RubyObject.Object.prototype.toValue = function(){ return this; } // to Javascript value(instance)
RubyEngine.RubyObject.Object.prototype.call = function(ruby, name, args, block){
  var clz = this.clz;
  var method;
  while( !(method=clz.methods[name]) ) if ( !(clz=clz.superclz) ) break;
  if (method) {
    return method.apply(ruby, [this, args, block]);
  } else {
  }
};


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
RubyEngine.RubyObject.Numeric.prototype.toString = function(){ return this.num.toString(); }
RubyEngine.RubyObject.Numeric.prototype.toSource = function(){ return this.num.toString(); }
RubyEngine.RubyObject.Numeric.prototype.add = function(x){ return new RubyEngine.RubyObject.Numeric(this.num + x.num); }
RubyEngine.RubyObject.Numeric.prototype.sub = function(x){ return new RubyEngine.RubyObject.Numeric(this.num - x.num); }
RubyEngine.RubyObject.Numeric.prototype.mul = function(x){ return new RubyEngine.RubyObject.Numeric(this.num * x.num); }
RubyEngine.RubyObject.Numeric.prototype.div = function(x){ return new RubyEngine.RubyObject.Numeric(parseInt(this.num / x.num)); }
RubyEngine.RubyObject.Numeric.prototype.mod = function(x){ return new RubyEngine.RubyObject.Numeric(this.num % x.num); }
RubyEngine.RubyObject.Numeric.prototype.pow = function(x){ return new RubyEngine.RubyObject.Numeric(Math.pow(this.num, x.num)); }
RubyEngine.RubyObject.Numeric.prototype.eql = function(x){ return this.num == x.num; }
RubyEngine.RubyObject.Numeric.methods = {
  "chr": function(self, args, block) {
    return new RubyEngine.RubyObject.String( String.fromCharCode(self.num) );
  },
  "upto": function(self, args, block) {
    if (!block) return null;
    var varname;
    if (block.vars) varname = block.vars[0].name;
    for(var i=self.num; i<=args[0].num; i++) {
    	if (varname) this.scope[0][varname] = new RubyEngine.RubyObject.Numeric(i);
    	this.run(block.block);
    }
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
RubyEngine.RubyObject.String.prototype.eql = function(x){ return this.str == x.str; }
RubyEngine.RubyObject.String.methods = {
  "reverse": function(self, args, block) {
    var st = "";
    for(var i=self.str.length-1;i>=0;i--) st += self.str.charAt(i);
    return new RubyEngine.RubyObject.String(st);
  },
  "[]": function(self, args, block) {
    return new RubyEngine.RubyObject.Numeric(self.str.charCodeAt(args[0]));
  },
  "[]=": function(self, args, block) {
    var x = args[0].num;
    if (RubyEngine.RubyObject.String.prototype.isPrototypeOf(args[1])) {
      self.str = self.str.substr(0,x) + args[1].str + self.str.substr(x+1);
      return args[1];
    } else if (RubyEngine.RubyObject.Numeric.prototype.isPrototypeOf(args[1])) {
      self.str = self.str.substr(0,x) + String.fromCharCode(args[1].num) + self.str.substr(x+1);
      return args[1];
    } else {
      // TODO: error
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
RubyEngine.RubyObject.Array.clz.methods = {
  "new": function(self, args, block) {
    var obj = new RubyEngine.RubyObject.Array();
    var ary = [];
    if (args) for(var i=0;i<args.length;i++) ary.push(this.run(args[i]));
    obj.array = ary;
    return obj;
  }
}
RubyEngine.RubyObject.Array.methods = {
  "reverse": function(self, args, block) {
    var ret = new RubyEngine.RubyObject.Array();
    ret.array = self.array.reverse;
    return ret;
  },
  "[]": function(self, args, block) {
    return self.array[args[0].num];
  },
  "[]=": function(self, args, block) {
    return self.array[args[0].num] = args[1];
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
 each: function(self, args, block) {
  if (!block) return null;
  var varname;
  if (block.vars) varname = block.vars[0].name; // TODO: multiple variables
  for(var i=self.from;i<=self.to;i++) {
  	if (varname) this.scope[0][varname] = new RubyEngine.RubyObject.Numeric(i);
  	this.run(block.block);
  }
  return self;
 }
}
