// jsruby command line READ-EVAL-PRINT-LOOP.
// (this command uses spidermonkey :)

// this is not a browser :)
navigator = {
    userAgent : 'DUMMY'
}

// load jsruby libraries.
load("src/head.js");
load("src/node.js");
load("src/builtinobjects.js");
load("src/parse.js");
load("src/interpreter.js");
load("src/builtinmethods.js");
load("src/util.js");

// setup
var parser = new RubyEngine.Parser();
var ruby = new RubyEngine.Interpreter();
ruby.writeStdout = function(st) { print(st); }
function alert(st) {
  print(st);
}

// do loop
while (line = readline()) {
  var nodetree = parser.parse(line)
  print(nodetree.toSource());
  ruby.run(nodetree)
}

