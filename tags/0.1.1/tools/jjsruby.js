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
function load_jsruby() {
    load("src/head.js");
    load("src/node.js");
    load("src/builtinobjects.js");
    load("src/parse.js");
    load("src/interpreter.js");
    load("src/builtinmethods.js");
    load("src/util.js");
}

// setup
load_jsruby();
var parser = new RubyEngine.Parser();
var ruby = new RubyEngine.Interpreter();
ruby.writeStdout = function(st) { print(st.replace(/\n$/, "")); }
function alert(st) {
  print(st);
}

// do loop
stdout.write("> ");stdout.flush();
while (line = stdin.readLine()) {
  try {
    if (line == '!reload') {
      load_jsruby();
      print("reload ok");
    } else {
      var nodetree = parser.parse(line)
      print(nodetree.toSource());
      print(ruby.exec(nodetree));
    }
  } catch (e) {
    print(e);
  }
  stdout.write("> ");stdout.flush();
}

