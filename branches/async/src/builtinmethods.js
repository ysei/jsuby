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
    return this.run(nodes);
  },
  "puts": function(args) {
    if (args && args.length > 0) {
      for(var jdx=0;jdx<args.length;jdx++) this.writeStdout(args[jdx] + "\n");
    } else {
      this.writeStdout("\n");
    }
  },
  "if": function(args) {
    for(var idx=0;idx<args.length;idx+=2) {
      var cond = args[idx];
      if (cond || cond===0 || cond==="") return this.run(args[idx+1]);
    }
  },
  "*let": function(args) {
    return this.scope.substitute(args[0].name, args[1]);
  },
  "*concat": function(args) {
    var st="";
    if (args && args.length > 0) {
      for(var i=0;i<args.length;i++) st+=args[i].toString();
    }
    return new RubyEngine.RubyObject.String(st);
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



