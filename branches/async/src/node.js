//// Node ////////////////////////////////////////////////////////////

RubyEngine.Node = {}

RubyEngine.Node.Variable = function(name){
	this.type = "V";
	this.name = name;
}
RubyEngine.Node.Variable.prototype.toSource = function(){return this.type+"'"+this.name+"'"}

RubyEngine.Node.Ref = function(name){
	this.type = "R";
	this.name = name;
}
RubyEngine.Node.Ref.prototype.toSource = function(){return this.type+"'"+this.name+"'"}

RubyEngine.Node.Operator = function(name){
	this.type = "O";
	this.name = name;
}
RubyEngine.Node.Operator.prototype.toSource = function(){return this.type+"'"+this.name+"'"}

RubyEngine.Node.Method = function(name, target, args){
	this.type = "M";
	this.name = name;
	this.target = target;
	if(name=="eval" && target==null) this.name = "*eval"; // for Object#eval
	this.args = args;
	this.block = undefined;
}
RubyEngine.Node.Method.prototype.toSource = function(){
  var block = this.block?this.block.toSource():"";
  return this.type+"("+(this.target==null?"":this.target.toSource()+".")+this.name+","+(this.args?this.args.toSource():this.args)+")" + block;
}
RubyEngine.Node.Method.prototype.clone = function(){
  var args=[];
  if(this.args) for(var i=0;i<this.args.length;i++) args.push(this.args[i]);
  return new RubyEngine.Node.Method(this.name,this.target,args);
}

RubyEngine.Node.Block = function(vars, block){
	this.type = "B";
	this.vars = vars
	this.block = block;
}
RubyEngine.Node.Block.prototype.toSource = function(){
  return "{|"+(this.vars?this.vars.toSource():this.target)+"| "+(this.block?this.block.toSource():this.block)+"}"
}

RubyEngine.Node.Expression = function(list){
	this.type = "E";
	var polishlist = [];
	var ope = [];
	for(var idx=0;idx<list.length;idx++) {
		var x = list[idx];
		if (RubyEngine.Node.Operator.prototype.isPrototypeOf(x)) {
			while (ope.length>0) {
				if (RubyEngine.OPERATORS[ope[0].name] > RubyEngine.OPERATORS[x.name]) break;
				polishlist.push(ope.shift());
			}
			ope.unshift(x);
		} else {
			polishlist.push(x);
		}
	}
	while(ope.length>0) {
		polishlist.push(ope.shift());
	}
	this.list = polishlist;
}
RubyEngine.Node.Expression.prototype.toSource = function(){return this.type+"'"+this.list.toSource()+"'"}


RubyEngine.Node.BlockIterator = function(block, iterator) {
  this.block = block;
  this.iterator = iterator;
}
RubyEngine.Node.BlockIterator.prototype = {
  "next": function(self){
    var args;
    if(args=self.iterator.apply(this, [self])) {
      this.scope.pushLevel(args);
      this.command.push(self);
      this.command.push("popLevel");
      this.compile(self.block.block);
    }
  }
}

RubyEngine.Node.Iterator = function(list) {
    this.list = list;
    this.idx = 0;
  },
RubyEngine.Node.Iterator.prototype = {
  next: function() {
    if (this.idx<this.list.length) {
      return this.list[this.idx++];
    } else {
      return undefined;
    }
  }
}


