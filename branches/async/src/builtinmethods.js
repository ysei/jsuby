//// KernelMethods ///////////////////////////////////////////////////

// 'this' is the interpreter instance.

RubyEngine.Interpreter.KernelMethod = {
  "def": function(args, block) {
    var name = args[0].str;
    this.scope.globalsubstitute(name, block);
    if (!(name in this)) {
      this[name] = function(){return this.call(name, arguments);};
    }
  },
  "*eval": function(args) {
    var src = args[0].str;
    var nodes = this.parser.parse(src);
    this.compile(nodes);
  },
  "puts": function(args) {
    if (args && args.length > 0) {
      for(var jdx=0;jdx<args.length;jdx++) this.writeStdout(args[jdx] + "\n");
    } else {
      this.writeStdout("\n");
    }
  },
  "*let": function(args) {
    this.stack.push(this.scope.substitute(args[0].name, args[1]));
  },
  "*concat": function(args) {
    var st="";
    if (args && args.length > 0) {
      for(var i=0;i<args.length;i++) st+=args[i].toString();
    }
    this.stack.push(new RubyEngine.RubyObject.String(st));
  },
  "sleep": function(args) {
    this.sleep = args[0];
  },
  "p": function(args) {
    if (args && args.length > 0) {
      for (var i=0; i<args.length; i++) {
        this.writeStdout(args[i].toSource() + "\n");
      }
    }
  }
};



