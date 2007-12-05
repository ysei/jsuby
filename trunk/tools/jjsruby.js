// jjsruby command line READ-EVAL-PRINT-LOOP.
// (this command uses Rhino :)

importPackage(java.io);
var stdin = new BufferedReader(new InputStreamReader(java.lang.System["in"]));
var stdout = new OutputStreamWriter(java.lang.System["out"]);

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
ruby.writeStdout = function(st) { print(st.replace(/\n$/, "")); }
function alert(st) {
  print(st);
}

// do loop
stdout.write("> ");stdout.flush();
while (line = stdin.readLine()) {
  var nodetree = parser.parse(line)
  //print(nodetree.toSource());
  print(ruby.exec(nodetree));
  stdout.write("> ");stdout.flush();
}

