// This file was produced by browserify and then edited a little to
// provide some functionality (like displaying traces in the browser).

var BENCHMARK_POINTS = null;
var TraceID = 0;

(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';

        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';

        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }

        var n = loadNodeModulesSync(x, y);
        if (n) return n;

        throw new Error("Cannot find module '" + x + "'");

        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }

            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }

        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }

            return loadAsFileSync(x + '/index');
        }

        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }

            var m = loadAsFileSync(x);
            if (m) return m;
        }

        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');

            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }

            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);

    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;

    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }

        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;

        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };

        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return window.setImmediate;
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/engine/index.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var FLAGS = exports.FLAGS = { print_ir: true, print_trace: true, notracing: false, nollvm: false };

process.argv.slice(2).forEach(function (flag) {
  var flag = flag.replace(/^\-\-/, "").replace(/\-/g, "_");
  if (flag in FLAGS) FLAGS[flag] = true;
});

exports.FunctionBuilder = require('./bytecode-builder.js').FunctionBuilder;
exports.Interpreter     = require('./interpreter.js');
exports.runtime         = require('./runtime.js');
});

require.define("/engine/bytecode-builder.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var BC = require('./bytecode.js');

exports.FunctionBuilder = FunctionBuilder;

//
// Bytecode builder.
//
//   A simple DSL to programmaticaly emit bytecodes.
//

function FunctionBody(functions, pool, code) {
  this.functions = functions;
  this.code = code;
  this.pool = pool;
}

FunctionBody.prototype.toString = function() { return "function"; };

function FunctionState() {
  this.functions = [];
  this.pool = [];
  this.code = [];

  this.labels = new Map;
  this.jumps = [];
  this.constants = new Map;
}

FunctionState.prototype.finish = function () {
  this.jumps.forEach(function (jmp) {
    var from_pc = jmp.from;
    var to_pc   = this.labels.get(jmp.to);
    var dist    = (to_pc - (from_pc + 1));
    this.code[from_pc] = BC.JMP | (dist << 8);  // dist is signed!
  }, this);

  var code = new Int32Array(this.code.length);
  for (var i = 0; i < this.code.length; i++) code[i] = this.code[i];

  return new FunctionBody(this.functions, this.pool, code);
};

function FunctionBuilder() {
  this.fs = [];
}

FunctionBuilder.prototype = {
  state: function () { return this.fs.length > 0 ? this.fs[this.fs.length - 1] : null; },
  pc: function () { return this.state().code.length; },
  emit: function (/* args */) { this.state().code.push(BC.encodeOp.apply(null, arguments)); },

  const2index: function (val) {
    if (this.state().constants.has(val)) return this.state().constants.get(val);

    var idx = this.state().pool.length;
    this.state().pool.push(val);
    this.state().constants.set(val, idx);
    return idx;
  },

  rk: function (rk) {
    if (typeof rk === 'number') return rk;  // register index
    return BC.CONSTANT_BIAS + this.const2index(rk.value);
  }
};

function chain(obj, v) {
  var keys = Object.keys(v);

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];

    obj[k] = (function (v) {
      return function () {
        var result = v.apply(this, arguments);
        return (typeof result === 'undefined') ? this : result;
      };
    })(v[k]);
  };

  return obj;
}

chain(FunctionBuilder.prototype, {
  function_begin: function () {
    this.fs.push(new FunctionState);
  },

  end: function () {
    var f = this.fs.pop().finish();
    if (this.state() === null) {
      return f;
    }
    this.state().functions.push(f);
  },

  label: function (name) {
    this.state().labels.set(name, this.pc());
  },

  jmp: function (label) {
    this.state().jumps.push({ from: this.pc(), to: label });
    this.emit(BC.JMP);  // placeholder
  },

  move: function (ra, rb) { this.emit(BC.MOVE, ra, rb); },
  loadconst: function (ra, k) { this.emit(BC.LOADCONST, ra, this.const2index(k.value)); },

  load: function (ra, rb, rkc) { this.emit(BC.LOAD, ra, rb, this.rk(rkc)); },
  store: function (ra, rkb, rkc) { this.emit(BC.STORE, ra, this.rk(rkb), this.rk(rkc)); },

  loadglobal: function (ra, rkb) { this.emit(BC.LOADGLOBAL, ra, this.rk(rkb)); },
  storeglobal: function (rka, rkb) { this.emit(BC.STOREGLOBAL, this.rk(rka), this.rk(rkb)); },

  lessthan: function (rka, rkb) { this.emit(BC.LESSTHAN, this.rk(rka), this.rk(rkb)); },

  add: function (ra, rkb, rkc) { this.emit(BC.ADD, ra, this.rk(rkb), this.rk(rkc)); },
  mul: function (ra, rkb, rkc) { this.emit(BC.MUL, ra, this.rk(rkb), this.rk(rkc)); },
  unm: function (ra, rb)       { this.emit(BC.UNM, ra, rb);       },

  newclosure: function (ra, fid) { this.emit(BC.NEWCLOSURE, ra, fid); },
  newtable: function (ra) { this.emit(BC.NEWTABLE, ra); },

  call: function (ra, argc) { this.emit(BC.CALL, ra, argc); },
  ret: function (ra) { this.emit(BC.RET, ra); },

  loop: function (nvars) { this.emit(BC.LOOP, nvars); this.emit(0) }
});

FunctionBuilder.r = function r(idx) { return idx; };
FunctionBuilder.k = function k(val) { return { value: val }; };

});

require.define("/engine/bytecode.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var utils = require('./utils.js');

//
// Bytecode
//

function encodeOp(op, a, b, c) {
  a = a & 0xFF;
  b = b & 0xFF;
  c = c & 0xFF;
  return (b << 24) | (c << 16) | (a << 8) | op;
}

function OPCODE(op) { return op & 0xFF; }
function A(op) { return (op >> 8) & 0xFF; }
function B(op) { return (op >> 24) & 0xFF; }
function C(op) { return (op >> 16) & 0xFF; }

var BC = module.exports = utils.bytecode([
  "MOVE RA, RB",
  "LOADCONST RA, KB",
  "LOAD RA, RB, RKC",
  "STORE RA, RKB, RKC",
  "LOADGLOBAL RA, RKB",
  "STOREGLOBAL RKA, RKB",
  "LESSTHAN RKA, RKB",
  "JMP SD",
  "ADD RA, RKB, RKC",
  "MUL RA, RKB, RKC",
  "UNM RA, RB",
  "NEWCLOSURE",
  "NEWTABLE",
  "CALL RA, B",
  "RET RA",
  "LOOP A",
  "JLOOP A"
]);

BC.Disassembler.prototype.prefix = function () { return this.pc + ": "; };

BC.Disassembler.prototype.epilogue = BC.Disassembler.prototype.suffix = function () { };

BC.Disassembler.prototype.formatR = function (r) { return "r" + r; };

BC.Disassembler.prototype.formatK = function (k) { return "#" + this.data.closure.pool[k]; };

BC.Disassembler.prototype.formatRK = function fmtRK(rk) {
  return (rk >= BC.CONSTANT_BIAS) ? this.formatK(rk - BC.CONSTANT_BIAS) : this.formatR(rk);
};

BC.Disassembler.prototype.opcode = function (op) { return OPCODE(op); };

BC.Disassembler.prototype.operand = function (op, operand) {
  switch (operand) {
    case "A": return A(op).toString();
    case "B": return B(op).toString();
    case "C": return C(op).toString();
    case "RA": return this.formatR(A(op));
    case "RB": return this.formatR(B(op));
    case "RC": return this.formatR(C(op));
    case "KB": return this.formatK(B(op));
    case "RKA": return this.formatRK(A(op));
    case "RKB": return this.formatRK(B(op));
    case "RKC": return this.formatRK(C(op));
    case "SD": return (op >> 8).toString();
    default: return operand;
  }
};

BC.Disassembler.prototype.LOOP = function () { this.pc++; };
BC.Disassembler.prototype.JLOOP = function () { this.pc++; };

BC.CONSTANT_BIAS = 0x80;

BC.IS_CONSTANT = function (ref) {
  return ref >= BC.CONSTANT_BIAS;
};

BC.encodeOp = encodeOp;
BC.OPCODE = OPCODE;
BC.A = A;
BC.B = B;
BC.C = C;

});

require.define("/engine/utils.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Helper function to define bytecodes.
exports.bytecode = function bytecode(ops) {
  var OPCODES = {};
  OPCODES.names = [];

  OPCODES.Disassembler = function (data) {
    this.data = data;
    this.DISPATCH = OPCODES.Disassembler.DISPATCH;
  };

  OPCODES.Disassembler.DISPATCH = [];

  OPCODES.Disassembler.prototype.disassemble = function (code) {
    var result = [];
    this.pc = 0;
    this.code = code;
    while (this.pc < this.code.length) {
      var prefix = this.prefix();
      var suffix = this.suffix();
      if (typeof suffix === "string") suffix = " ; " + suffix; else suffix = "";
      var op = this.code[this.pc++];
      result.push(prefix + this.DISPATCH[this.opcode(op)].call(this, op) + suffix);
    }
    var epilogue = this.epilogue();
    if (typeof epilogue === "string") result.push("    ; " + epilogue);
    return result;
  };

  OPCODES.disassemble = function (seq, data) {
    var d = new OPCODES.Disassembler(data);
    return d.disassemble(seq);
  };

  OPCODES.print = function (seq, data) {
    console.log('-----------------------');
    console.log(this.disassemble(seq, data).join('\n'));
  };

  OPCODES.convertToString = function (seq, data) {
    return this.disassemble(seq, data).join('\n');
  };

  function mkOpcode(id, fmt) {
    var m = fmt.match(/^(\w+)(.*)$/);
    var name = m[1];
    var operands = m[2];

    OPCODES[name] = id;
    OPCODES.names.push(name);

    OPCODES.Disassembler.DISPATCH[id] = function (op) {
      var self = this;
      var result = name + operands.replace(/(\w+)/g, function (operand) { return self.operand(op, operand); });
      if (name in this) this[name](op);
      return result;
    };
  }

  for (var i = 0; i < ops.length; i++) {
    mkOpcode(i, ops[i]);
  }

  return OPCODES;
}

// Quick check for int32 values.
exports.IsInt32 = function (x) {
  return (x|0) === x;
};

});

require.define("/engine/interpreter.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

module.exports = Interpreter;

var engine = require('./');

var BC = require('./bytecode.js');
var A = BC.A, B = BC.B, C = BC.C, OPCODE = BC.OPCODE;

var runtime = require('./runtime.js');
var Runtime_NewClosure = runtime.NewClosure,
    Runtime_CheckTable = runtime.CheckTable,
    Runtime_NewTable   = runtime.NewTable,
    Runtime_Load       = runtime.Load,
    Runtime_Store      = runtime.Store,
    Runtime_CheckNumber = runtime.CheckNumber,
    Runtime_LessThan    = runtime.LessThan,
    Runtime_Add         = runtime.Add,
    Runtime_Mul         = runtime.Mul,
    Runtime_Unm         = runtime.Unm;

var Tracer = require('./tracer.js');

//
// Bytecode interpreter.
//

function Interpreter() {
  this.R  = null;
  this.pc = 0;

  this.G = Runtime_NewTable();

  this.DISPATCH = Interpreter.DISPATCH;

  this.callstack = [];
  this.closure = null;
  this.code = null;
  this.pool = null;
  this.functions = null;

  this.tracer = new Tracer(this);
}

Interpreter.prototype.enterFrame = function (closure, rr) {
  if (this.closure !== null) {
    this.callstack.push({ closure: this.closure, pc: this.pc, R: this.R, rr: rr });
  }

  this.pc = 0;
  this.R = new Array(10);
  this.closure = closure;
  this.code = closure.code;
  this.pool = closure.pool;
  this.functions = closure.functions;
};

Interpreter.prototype.evaluate = function (closure, args) {
  this.enterFrame(closure, 0);
  if (Array.isArray(args)) {
    for (var i = 0; i < args.length; i++) {
      this.R[i] = args[i];
    }
  }

  while (this.pc < this.code.length) {
    var bc = this.code[this.pc++];
    this.DISPATCH[OPCODE(bc)](this, bc);
  }

  return this.R[0];
};


function K(S, rk) { return S.pool[rk - BC.CONSTANT_BIAS]; }
function RK(S, rk) { return (rk >= BC.CONSTANT_BIAS) ? S.pool[rk - BC.CONSTANT_BIAS] : S.R[rk]; }
function RKA(S, op) { return RK(S, A(op)); }
function RKB(S, op) { return RK(S, B(op)); }
function RKC(S, op) { return RK(S, C(op)); }

Interpreter.prototype.K = function (rk) { return K(this, rk); };
Interpreter.prototype.RKA = function (op) { return RKA(this, op); };
Interpreter.prototype.RKB = function (op) { return RKB(this, op); };
Interpreter.prototype.RKC = function (op) { return RKC(this, op); };

Interpreter.DISPATCH = [];
Interpreter.DISPATCH[BC.MOVE]      = function (S, op) { S.R[A(op)] = S.R[B(op)];    };
Interpreter.DISPATCH[BC.LOADCONST] = function (S, op) { S.R[A(op)] = S.pool[B(op)]; };

Interpreter.DISPATCH[BC.LOAD]  = function (S, op) { S.R[A(op)] = Runtime_Load(S.R[B(op)], RKC(S, op)); };
Interpreter.DISPATCH[BC.STORE] = function (S, op) { Runtime_Store(S.R[A(op)], RKB(S, op), RKC(S, op));  };

Interpreter.DISPATCH[BC.LOADGLOBAL]  = function (S, op) { S.R[A(op)] = Runtime_Load(S.G, RKB(S, op)); };
Interpreter.DISPATCH[BC.STOREGLOBAL] = function (S, op) { Runtime_Store(S.G, RKA(S, op), RKB(S, op));  };

Interpreter.DISPATCH[BC.LESSTHAN] = function (S, op) { if (Runtime_LessThan(RKA(S, op), RKB(S, op))) S.pc++; };

Interpreter.DISPATCH[BC.JMP] = function (S, op) { S.pc += op >> 8; };

Interpreter.DISPATCH[BC.ADD] = function (S, op) { S.R[A(op)] = Runtime_Add(RKB(S, op), RKC(S, op)); };
Interpreter.DISPATCH[BC.MUL] = function (S, op) { S.R[A(op)] = Runtime_Mul(RKB(S, op), RKC(S, op)); };
Interpreter.DISPATCH[BC.UNM] = function (S, op) { S.R[A(op)] = Runtime_Unm(S.R[B(op)]);         };

Interpreter.DISPATCH[BC.NEWCLOSURE] = function (S, op) { S.R[A(op)] = Runtime_NewClosure(S.functions[B(op)]); };
Interpreter.DISPATCH[BC.NEWTABLE]   = function (S, op) { S.R[A(op)] = Runtime_NewTable(); };

Interpreter.DISPATCH[BC.CALL] = function (S, op) {
  var rr = A(op);
  var argc = B(op);

  var callee = S.R[rr];

  var callerR = S.R;
  S.enterFrame(callee, rr);

  for (var i = 0; i < argc; i++) {
    S.R[i] = callerR[rr + 1 + i];
  }
};

Interpreter.DISPATCH[BC.RET] = function (S, op) {
  var result = S.R[A(op)];

  if (S.callstack.length === 0) {
    S.R[0] = result;
    S.pc = S.code.length;
    return;
  }

  var caller_state = S.callstack.pop();

  S.R = caller_state.R;
  S.R[caller_state.rr] = result;

  S.pc = caller_state.pc;
  S.closure = caller_state.closure;
  S.code = S.closure.code;
  S.pool = S.closure.pool;
  S.functions = S.closure.functions;
};

if (engine.FLAGS.notracing) {
  Interpreter.DISPATCH[BC.LOOP] = function (S, op) {
    S.pc++;
  };

  Interpreter.DISPATCH[BC.JLOOP] = function (S, op) {
  };
} else {
  Interpreter.DISPATCH[BC.LOOP] = function (S, op) {
    var counter_pc = S.pc++;
    if (S.code[counter_pc]++ >= 50) {
      S.code[counter_pc] = 0;
      S.tracer.start();
    }
  };

  Interpreter.DISPATCH[BC.JLOOP] = function (S, op) {
    var trace = S.tracer.traces[A(op)];
    if (typeof trace === "undefined") {
      S.code[S.pc - 1] = BC.encodeOp(BC.LOOP, B(op));
      return;
    }
    trace.f(S, trace.pool);
  };
}
});

require.define("/engine/runtime.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var utils = require('./utils.js');

exports.NewClosure = NewClosure;
exports.CheckTable = CheckTable;
exports.NewTable = NewTable;
exports.Load = Load;
exports.Store = Store;
exports.CheckNumber = CheckNumber;
exports.LessThan = LessThan;
exports.Add = Add;
exports.Mul = Mul;
exports.Unm = Unm;

//
// Hidden classes infrastructure used by the interpreter and
// compiled code plus some utility methods.
//

var Transition = exports.Transition = function Transition(klass) {
  this.klass = klass;
};

var Property = exports.Property = function Property(index) {
  this.index = index;
};

function Klass(kind) {
  this.kind = kind;
  this.descriptors = new Map;
  this.keys = [];
}

Klass.prototype = {
  // Create hidden class with a new property that does not exist on
  // the current hidden class.
  addProperty: function (key) {
    var klass = this.clone();
    klass.append(key);
    // Connect hidden classes with transition to enable sharing.
    this.descriptors.set(key, new Transition(klass));
    return klass;
  },

  hasProperty: function (key) {
    return this.descriptors.has(key);
  },

  getDescriptor: function (key) {
    return this.descriptors.get(key);
  },

  getIndex: function (key) {
    return this.getDescriptor(key).index;
  },

  // Create clone of this hidden class that has same properties
  // at same offsets (but does not have any transitions).
  clone: function () {
    var klass = new Klass(this.kind);
    klass.keys = this.keys.slice(0);
    for (var i = 0; i < this.keys.length; i++) {
      var key = this.keys[i];
      klass.descriptors.set(key, this.descriptors.get(key));
    }
    return klass;
  },

  // Add real property to descriptors.
  append: function (key) {
    this.keys.push(key);
    this.descriptors.set(key, new Property(this.keys.length - 1));
  },

  toString: function () {
    if (this.kind === "slow") return "klass { slow }";
    return "klass { " + this.keys.map(function (name) {
      var desc = this.descriptors.get(name);
      if (desc instanceof Property) return name;
      if (desc instanceof Transition) return name + " (transition)";
    }, this).join(", ") + " }"
  }
};

var ROOT_KLASS = exports.ROOT_KLASS = new Klass("fast");

function Table() {
  // All tables start from the fast empty root hidden class.
  this.klass = ROOT_KLASS;
  this.properties = [];  // Array of named properties: 'x','y',...
  this.elements = [];  // Array of indexed properties: 0, 1,
}

Table.prototype = {
  load: function (key) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      return this.properties.get(key);
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && utils.IsInt32(key)) {  // Indexed property.
      return this.elements[key];
    } else if (typeof key === "string") {  // Named property.
      var idx = this.findPropertyForRead(key);
      return (idx >= 0) ? this.properties[idx] : void 0;
    }

    // There can be only string&number keys on fast table.
    return void 0;
  },

  store: function (key, value) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      this.properties.set(key, value);
      return;
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && utils.IsInt32(key)) {  // Indexed property.
      this.elements[key] = value;
      return;
    } else if (typeof key === "string") {  // Named property.
      var index = this.findPropertyForWrite(key);
      if (index >= 0) {
        this.properties[index] = value;
        return;
      }
    }

    this.convertToSlow();
    this.store(key, value);
  },

  // Find property or add one if possible, returns property index
  // or -1 if we have too many properties and should switch to slow.
  findPropertyForWrite: function (key) {
    if (!this.klass.hasProperty(key)) {  // Try adding property if it does not exist.
      // To many properties! Achtung! Fast case kaput.
      if (this.klass.keys.length > 20) return -1;

      // Switch class to the one that has this property.
      this.klass = this.klass.addProperty(key);
      return this.klass.getIndex(key);
    }

    var desc = this.klass.getDescriptor(key);
    if (desc instanceof Transition) {
      // Property does not exist yet but we have a transition to the class that has it.
      this.klass = desc.klass;
      return this.klass.getIndex(key);
    }

    // Get index of existing property.
    return desc.index;
  },

  // Find property index if property exists, return -1 otherwise.
  findPropertyForRead: function (key) {
    if (!this.klass.hasProperty(key)) return -1;
    var desc = this.klass.getDescriptor(key);
    if (!(desc instanceof Property)) return -1;  // Here we are not interested in transitions.
    return desc.index;
  },

  // Copy all properties into the Map and switch to slow class.
  convertToSlow: function () {
    var map = new Map;
    for (var i = 0; i < this.klass.keys.length; i++) {
      var key = this.klass.keys[i];
      var val = this.properties[i];
      map.set(key, val);
    }

    Object.keys(this.elements).forEach(function (key) {
      var val = this.elements[key];
      map.set(key | 0, val);  // Funky JS, force key back to int32.
    }, this);

    this.properties = map;
    this.elements = null;
    this.klass = new Klass("slow");
  }
};

function NewClosure(f) {
  return f;
}

function CheckTable(t) {
  if (!(t instanceof Table)) throw new Error("table expected");
}

function NewTable() {
  return new Table();
}

function Load(t, k) {
  CheckTable(t);
  return t.load(k);
}

function Store(t, k, v) {
  CheckTable(t);
  t.store(k, v);
}

function CheckNumber(x) {
  if (typeof x !== 'number') throw new Error("number expected");
}

function LessThan(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x < y;
}

function Add(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x + y;
}

function Mul(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x * y;
}

function Unm(x) {
  CheckNumber(x);
  return -x;
}

global.Runtime_CheckNumber = CheckNumber;
global.Runtime_Load = Load;
global.Runtime_Store = Store;
global.Runtime_NewTable = NewTable;

});

require.define("/engine/tracer.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

module.exports = Tracer;

var engine = require('./');

var BC = require('./bytecode.js');
var A = BC.A, B = BC.B, C = BC.C, OPCODE = BC.OPCODE;

var Interpreter = require('./interpreter');

var bc2ir = require('./bc2ir.js');
var makeloop = require('./makeloop.js');

//var ir2llvm = require('./ir2llvm.js');
var ir2js = require('./ir2js.js');

var assert = require('assert');

//
// Tracer.
//
// Records executed bytecodes and type information required to specialize
// generated code.
//

function Tracer(interpreter) {
  this.S = interpreter;

  this.bc2ir = bc2ir.CreateTranslator(this.S);
  this.start_pc = null;
  this.start_closure = null;

  this.traces = [];
}


Tracer.prototype = {
  // Start recording trace. Replace dispatch table on the interpreter with the
  // one that can record bytecodes.
  start: function () {
    if (this.start_pc !== null) return;
    this.start_pc = this.S.pc - 2;
    this.start_closure = this.S.closure;

    var nvars = A(this.start_closure.code[this.start_pc]);
    this.bc2ir.initialize(nvars);

    this.S.DISPATCH = this.bc2ir.DISPATCH;
  },

  // Stop tracing, compile collected trace and patch LOOP header
  // to point to the compiled code.
  stop: function () {
    var ir = this.bc2ir.finalize();

    PublishTrace(ir);
    makeloop.MakeLoop(ir);

  //  try {
  //    var jsfunc = ir2llvm.Compile(ir);
  //  } catch (e) {
  //    if (engine.FLAGS.print_ir || true) console.log("ir2llvm failed: " + e.stack);
      var jsfunc = ir2js.Compile(ir);
  //  }

    var compiled = { f: jsfunc, pool: ir.pool.arr };

    var trace_id = this.traces.length;
    this.traces.push(compiled);

    var loop = this.start_closure.code[this.start_pc];
    assert(BC.OPCODE(loop) === BC.LOOP);
    this.start_closure.code[this.start_pc] = BC.encodeOp(BC.JLOOP, trace_id, A(loop));

    this.reset();
  },

  // Abort tracing and discard collected bytecode.
  abort: function () {
    this.reset();
  },

  reset: function () {
    this.S.DISPATCH = Interpreter.DISPATCH;
    this.start_pc = this.start_closure = null;
    this.ir = null;
  }

};



});

require.define("/engine/bc2ir.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var BC = require('./bytecode.js');
var A = BC.A, B = BC.B, C = BC.C, OPCODE = BC.OPCODE;

var Interpreter = require('./interpreter.js');
var runtime = require('./runtime.js');

var IR = require('./ir.js');

var utils = require('./utils.js');
var assert = require('assert');

//
// Bytecode to IR translator that is used by the tracing compiler.
//
// Hooks into dispatch loop of the interpreter itself (replaces
// DISPATCH table) and builds IR from the executed bytecodes.
//
// IR is specialized on the fly for the observed types of objects.
//

exports.CreateTranslator = function CreateTranslator(S) {
  var ir = null;
  var callstack = null;

  var nvars = 0;

  function initialize(_nvars) {
    nvars = _nvars;
    ir = new IR.Builder();
    callstack = [{R: [], maxr: 0, minr: (nvars - 1)}];
  }

  function finalize() {
    if (tos().maxr >= nvars) tos().maxr = nvars - 1;
    recordexit(ir.length);
    ir.R = tos().R;
    return ir;
  }

  function RK(rk) {
    if (BC.IS_CONSTANT(rk)) {
      return -ir.pool.add(S.K(rk)) - 1;
    } else {
      return rk;
    }
  }

  function RA(op) { return A(op); }
  function RB(op) { return B(op); }
  function RC(op) { return C(op); }

  function RKA(op) { return RK(A(op)); }
  function RKB(op) { return RK(B(op)); }
  function RKC(op) { return RK(C(op)); }

  function tos() { return callstack[callstack.length - 1]; }

  // Returns frame information stored in the interpreter.
  function getInterpreterFrame(idx) {
    var Sidx = S.callstack.length - (callstack.length - idx) + 1;
    if (Sidx === S.callstack.length) {
      return {pc: S.pc, closure: S.closure}
    } else {
      return S.callstack[Sidx];
    }
  }

  function emitguard (op, a, b) {
    var ref = ir.emit(op, a, b);
    if (ref === (ir.length - 1)) recordexit(ref);
    return ref;
  }

  function recordexit(ref) {
    var env = new IR.Environment;

    for (var lvl = 0; lvl < callstack.length; lvl++) {
      var frame = callstack[lvl];
      var Sframe = getInterpreterFrame(lvl);

      var env_frame = env.newFrame(Math.max(frame.maxr, frame.minr),
                                   (lvl === 0) ? null : ir.addconst(Sframe.closure),
                                   Sframe.pc,
                                   frame.rr);
      for (var reg = 0; reg <= frame.maxr; reg++) {
        var valref = frame.R[reg];
        if (typeof valref === "undefined" || IR.IS_CONSTANT(valref)) continue;

        var val = ir[valref];
        if (OPCODE(val) === IR.REG && IR.FROM_LITERAL(A(val)) === reg) continue;

        env_frame[reg] = valref;
      }
    }

    ir.setguardenv(ref, env);
  }

  function define(r, val) {
    tos().R[r] = val;
    if (tos().maxr < r) tos().maxr = r;
  }

  function use(r) {
    if (r < 0) {
      var kidx = -r - 1;
      return IR.CONSTANT_BIAS + kidx;
    } else {
      var val = tos().R[r];
      if (typeof val === "undefined") {
        if (tos().maxr < r) tos().maxr = r;
        tos().R[r] = val = ir.emit(IR.REG, IR.LITERAL(r));
      }
      return val;
    }
  }

  function docall(rr, argc) {
    var args = [];
    for (var i = 0; i < argc; i++) args[i] = use(rr + i + 1);
    callstack.push({rr: rr, R: [], maxr: 0, minr: 0});
    for (var i = 0; i < argc; i++) define(i, args[i]);
  }

  function doret() {
    var callee = callstack.pop();
    return callee.rr;
  }

  var bc2ir = [];

  bc2ir[BC.MOVE] = function (op) {
    define(RA(op), use(RB(op)));
  };

  bc2ir[BC.ADD] = function (op) {
    var left = ir.emit(IR.CHECKN, use(RKB(op)));
    var right = ir.emit(IR.CHECKN, use(RKC(op)));
    define(RA(op), ir.emit(IR.ADD, left, right));
  };

  bc2ir[BC.MUL] = function (op) {
    var left = ir.emit(IR.CHECKN, use(RKB(op)));
    var right = ir.emit(IR.CHECKN, use(RKC(op)));
    define(RA(op), ir.emit(IR.MUL, left, right));
  };

  bc2ir[BC.UNM] = function (op) {
    var value = ir.emit(IR.CHECKN, use(RB(op)));
    define(RA(op), ir.emit(IR.UNM, value));
  };

  bc2ir[BC.LOADGLOBAL] = function (op) {
    var klass = S.G.klass;
    assert(klass.kind === "fast");
    define(RA(op), ir.emit(IR.LOADGLOBAL, IR.LITERAL(klass.getIndex(S.RKB(op)))));
  };

  bc2ir[BC.LOAD] = function (op) {
    // Fetch object's klass and specialize the load.
    var klass = S.R[B(op)].klass;

    if (BC.IS_CONSTANT(C(op)) && klass.kind === "fast") {
      var key = S.K(C(op));
      assert(typeof key === "string");

      var desc = klass.getDescriptor(key);
      var object = use(RKB(op));

      emitguard(IR.CHECKK, object, ir.addconst(klass));
      var prop = ir.emit(IR.PROPF, object, IR.LITERAL(desc.index));
      define(RA(op), ir.emit(IR.LOAD, prop));
    } else if (klass.kind === "fast" && utils.IsInt32(S.R[C(op)])) {
      var object = use(RKB(op));
      var key = use(RKC(op));

      emitguard(IR.CHECKFAST, object);
      var int32key = emitguard(IR.CHECKI32, emitguard(IR.CHECKN, key));
      var prop = ir.emit(IR.PROPI, object, int32key);
      define(RA(op), ir.emit(IR.LOAD, prop));
    } else {
      var prop = ir.emit(IR.PROP, use(RKB(op)), use(RKC(op)));
      define(RA(op), ir.emit(IR.LOAD, prop));
    }
  };

  bc2ir[BC.STORE] = function (op) {
    // Fetch object's klass and specialize the store.
    var klass = S.R[A(op)].klass;

    if (klass.kind === "fast") {
      var object = use(RA(op));
      var value = use(RKC(op));

      if (BC.IS_CONSTANT(B(op))) {
        var key = S.K(B(op));
        assert(typeof key === "string");

        var desc = klass.getDescriptor(key);
        var newklass = (desc instanceof runtime.Transition) ? desc.klass : klass;

        emitguard(IR.CHECKK, object, ir.addconst(klass));
        ir.emit(IR.SETK, object, ir.addconst(newklass));
        var prop = ir.emit(IR.PROPF, object, IR.LITERAL(newklass.getIndex(key)));
        ir.emit(IR.STORE, prop, value);
      } else if (utils.IsInt32(S.R[B(op)])) {
        var key = use(RB(op));
        emitguard(IR.CHECKFAST, object);
        var int32key = emitguard(IR.CHECKI32, emitguard(IR.CHECKN, key));
        var prop = ir.emit(IR.PROPI, object, int32key);
        ir.emit(IR.STORE, prop, value);
      }
    } else {
      var prop = ir.emit(IR.PROP, use(RA(op)), use(RKB(op)));
      ir.emit(IR.STORE, prop, use(RKC(op)));
    }
  };

  bc2ir[BC.NEWTABLE] = function (op) {
    define(RA(op), ir.emit(IR.NEWTABLE));
  };

  bc2ir[BC.CALL] = function (op) {
    var target = S.R[A(op)];
    emitguard(IR.CHECKV, use(RA(op)), ir.addconst(target));
    docall(RA(op), B(op));
  };

  bc2ir[BC.RET] = function (op) {
    // TODO(mraleph): trap return to ensure that we are not exiting loop
    var result = use(RA(op));
    var rr = doret();
    define(rr, result);
  };

  bc2ir[BC.LESSTHAN] = function (op) {
    // TODO(mraleph): we need to flip recorded guard condition from lt (<) to ge (>=) but
    // we don't have ge in our toy IR; so we just let it slip :-)
    assert(S.RKA(op) < S.RKB(op));

    var left = ir.emit(IR.CHECKN, use(RKA(op)));
    var right = ir.emit(IR.CHECKN, use(RKB(op)));
    emitguard(IR.LESSTHAN, left, right);
  };

  bc2ir.initialize = initialize;
  bc2ir.finalize = finalize;

  function createOpcodeTrampoline(target, compile) {
    return function (S, op) {
      var tracer = S.tracer;

      if (typeof compile !== 'undefined') compile(op);

      target(S, op);

      if (tracer.start_pc !== null) {
        if (S.closure === tracer.start_closure && S.pc === tracer.start_pc) {
          tracer.stop();
        } else if (ir.length > 0x70) {
          tracer.abort();
        }
      }
    };
  }

  bc2ir.DISPATCH = [];
  for (var i = 0; i < Interpreter.DISPATCH.length; i++) {
    bc2ir.DISPATCH[i] = createOpcodeTrampoline(Interpreter.DISPATCH[i], bc2ir[i]);
  }

  return bc2ir;
};

});

require.define("/engine/ir.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var utils = require('./utils.js');

var assert = require('assert');

//
// IR used by the tracing compiler.
//

"use strict";

var IR = module.exports = utils.bytecode([
  // Guards
  "LESSTHAN VA, VB",
  "CHECKFAST VA",
  "CHECKV VA, VB",
  "CHECKK VA, VB",
  "CHECKN VA",
  "CHECKI32 VA",

  // Arithmetic
  "ADD VA, VB",
  "MUL VA, VB",
  "UNM VA",

  // Properties loads/stores.
  "PROPI VA, VB",
  "PROPF VA, B",
  "PROP VA, VB",
  "STORE VA, VB",
  "LOAD VA",

  // Global variables access.
  "LOADGLOBAL A",

  // Other.
  "SETK VA, VB",
  "NEWTABLE",
  "LOOP",
  "REG A",
  "PHI VA, VB",
]);

IR.ELIMINATE = -1;
IR.CONSTANT_BIAS = 0x80;

IR.IS_GUARD = function (ins) {
  var op = IR.OPCODE(ins);
  return IR.LESSTHAN <= op && op <= IR.CHECKI32;
};

IR.IS_CONSTANT = function (ref) {
  return ref >= IR.CONSTANT_BIAS;
};

IR.LITERAL = function (num) {
  assert(num >= 0);
  return num + IR.CONSTANT_BIAS;
};

IR.IS_LITERAL = IR.IS_CONSTANT;

IR.FROM_LITERAL = function (ref) {
  assert(IR.IS_LITERAL(ref));
  return ref - IR.CONSTANT_BIAS;
};

IR.OP = function (op, a, b) {
  if (typeof a === "undefined") a = IR.LITERAL(0);
  if (typeof b === "undefined") b = IR.LITERAL(0);
  return IR.encodeOp(op, a, b);
};

IR.encodeOp = function (op, a, b, c) {
  a = a & 0xFF;
  b = b & 0xFF;
  c = c & 0xFF;
  return (b << 24) | (c << 16) | (a << 8) | op;
};

IR.OPCODE = function OPCODE(op) { return op & 0xFF; };
IR.A = function A(op) { return (op >> 8) & 0xFF; };
IR.B = function B(op) { return (op >> 24) & 0xFF; };


//
// Environments describe target deoptimization state.
//

var Environment = IR.Environment = function Environment() {
  this.frames = [];
}

function Frame(maxr, closure, pc, rr) {
  this.maxr = maxr;
  this.closure = closure;
  this.pc = pc;
  this.rr = rr;
}

Frame.prototype.forEachRegister = function (cb) {
  for (var i = 0; i <= this.maxr; i++) {
    if (typeof this[i] === "number") cb(i, this[i]);
  }
};

Environment.prototype.newFrame = function (maxr, closure, pc, rr) {
  var frame = new Frame(maxr, closure, pc, rr);
  this.frames.push(frame);
  return frame;
};

//
// IRBuilder
//

var cse = require('./cse.js');  // Should be required after IR is populated.

var IRBuilder = IR.Builder = function IRBuilder() {
  this.length = 0;
  this.pool = new Pool;

  this.envs = [];
  this.lastguard = -1;

  this.ops = [];
}

IRBuilder.prototype = {
  getconst: function (ref) {
    assert(IR.IS_CONSTANT(ref));
    return this.pool.arr[ref - IR.CONSTANT_BIAS];
  },

  addconst: function (value) {
    return this.pool.add(value) + IR.CONSTANT_BIAS;
  },

  isNumber: function (ref) {
    if (IR.IS_CONSTANT(ref)) return typeof this.getconst(ref) === "number";

    switch (IR.OPCODE(this[ref])) {
      case IR.CHECKN:
      case IR.ADD:
      case IR.MUL:
      case IR.UNM:
        return true;
    }

    return false;
  },

  chain: function (ref) {
    var op = IR.OPCODE(this[ref]);
    if (typeof this.ops[op] === "undefined") this.ops[op] = [];
    this.ops[op].push(ref);
  },

  checkchain: function (opcode, boundary, cb) {
    var chain = this.ops[opcode];
    if (typeof chain === "undefined") return;

    for (var i = chain.length - 1; i >= 0; i--) {
      var ref = chain[i];
      if (ref <= boundary) return;

      var res = cb(ref, this[ref]);
      if (typeof res !== "undefined") return res;
    }
  },

  emit: function (op, a, b) {
    assert(typeof op === 'number');

    // Pass instruction through CSE in attempt to eliminate it.
    var ref = cse.do(this, op, a, b);
    if (typeof ref === "number") return ref;

    // CSE could not eliminate instruction, insert it into IR.
    var ref = this.length++;
    this[ref] = IR.OP(op, a, b);
    this.chain(ref);

    return ref;
  },

  setguardenv: function (ref, env) {
    assert(IR.IS_GUARD(this[ref]));
    assert(this.lastguard < ref);
    this.envs[ref] = env;
    this.lastguard = ref;
  },

  print: function () {
    IR.print(this, this);
  },

  toString: function () {
    return IR.convertToString(this, this);
  },

  slice: function (start, end) {
    var result = [];
    for (var i = start; i < end; i++) {
      result.push(this[i]);
    }
    return result;
  }
};

//
// Constant pool for IR.
//

function Pool() {
  this.map = new Map;
  this.arr = [];
}

Pool.prototype.add = function (v) {
  if (this.map.has(v)) return this.map.get(v);

  var id = this.arr.length;
  this.map.set(v, id);
  this.arr.push(v);
  return id;
};

//
// IR printing
//

function env2string(env) {
  assert(env instanceof Environment);

  var buf = [];
  env.frames.forEach(function (frame, depth) {
    if (depth !== 0) buf.push("{f" + frame.closure + "}");
    for (var i = 0; i <= frame.maxr; i++) {
      var ref = frame[i];
      if (typeof ref === "number") {
        buf.push("v" + ref);
      } else {
        buf.push("--");
      }
    }
    buf.push("|");
  });
  return buf.join(' ');
}

IR.Disassembler.prototype.prefix = function () { return this.pc + "\t"; };
IR.Disassembler.prototype.epilogue = IR.Disassembler.prototype.suffix = function () {
  var env = this.data.envs[this.pc];
  if (typeof env !== "undefined") return env2string(env);
};
IR.Disassembler.prototype.opcode = function (op) { return IR.OPCODE(op); };
IR.Disassembler.prototype.fmtref = function (ref) {
  if (IR.IS_CONSTANT(ref)) return "@" + this.data.pool.arr[ref - IR.CONSTANT_BIAS];
  return "v" + ref;
};
IR.Disassembler.prototype.operand = function (op, operand) {
  switch (operand) {
    case "A":  return IR.FROM_LITERAL(IR.A(op));
    case "B":  return IR.FROM_LITERAL(IR.B(op));
    case "VA": return this.fmtref(IR.A(op));
    case "VB": return this.fmtref(IR.B(op));
    default:   return operand;
  }
};

});

require.define("assert",function(require,module,exports,__dirname,__filename,process,global){// UTILITY
var util = require('util');
var Buffer = require("buffer").Buffer;
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.message = options.message;
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
};
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (value === undefined) {
    return '' + value;
  }
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (typeof value === 'function' || value instanceof RegExp) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (typeof s == 'string') {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

assert.AssertionError.prototype.toString = function() {
  if (this.message) {
    return [this.name + ':', this.message].join(' ');
  } else {
    return [
      this.name + ':',
      truncate(JSON.stringify(this.actual, replacer), 128),
      this.operator,
      truncate(JSON.stringify(this.expected, replacer), 128)
    ].join(' ');
  }
};

// assert.AssertionError instanceof Error

assert.AssertionError.__proto__ = Error.prototype;

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!!!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (Buffer.isBuffer(actual) && Buffer.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (actual instanceof Date && expected instanceof Date) {
    return actual.getTime() === expected.getTime();

  // 7.3. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (typeof actual != 'object' && typeof expected != 'object') {
    return actual == expected;

  // 7.4. For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isUndefinedOrNull(value) {
  return value === null || value === undefined;
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (isUndefinedOrNull(a) || isUndefinedOrNull(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = Object.keys(a),
        kb = Object.keys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (expected instanceof RegExp) {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected === 'string') {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail('Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail('Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

});

require.define("util",function(require,module,exports,__dirname,__filename,process,global){var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (typeof f !== 'string') {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(exports.inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j': return JSON.stringify(args[i++]);
      default:
        return x;
    }
  });
  for(var x = args[i]; i < len; x = args[++i]){
    if (x === null || typeof x !== 'object') {
      str += ' ' + x;
    } else {
      str += ' ' + exports.inspect(x);
    }
  }
  return str;
};

});

require.define("events",function(require,module,exports,__dirname,__filename,process,global){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("buffer",function(require,module,exports,__dirname,__filename,process,global){module.exports = require("buffer-browserify")
});

require.define("/node_modules/buffer-browserify/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js","browserify":"index.js"}
});

require.define("/node_modules/buffer-browserify/index.js",function(require,module,exports,__dirname,__filename,process,global){function SlowBuffer (size) {
    this.length = size;
};

var assert = require('assert');

exports.INSPECT_MAX_BYTES = 50;


function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; i++)
    if (str.charCodeAt(i) <= 0x7F)
      byteArray.push(str.charCodeAt(i));
    else {
      var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16));
    }

  return byteArray;
}

function asciiToBytes(str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++ )
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push( str.charCodeAt(i) & 0xFF );

  return byteArray;
}

function base64ToBytes(str) {
  return require("base64-js").toByteArray(str);
}

SlowBuffer.byteLength = function (str, encoding) {
  switch (encoding || "utf8") {
    case 'hex':
      return str.length / 2;

    case 'utf8':
    case 'utf-8':
      return utf8ToBytes(str).length;

    case 'ascii':
      return str.length;

    case 'base64':
      return base64ToBytes(str).length;

    default:
      throw new Error('Unknown encoding');
  }
};

function blitBuffer(src, dst, offset, length) {
  var pos, i = 0;
  while (i < length) {
    if ((i+offset >= dst.length) || (i >= src.length))
      break;

    dst[i + offset] = src[i];
    i++;
  }
  return i;
}

SlowBuffer.prototype.utf8Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(utf8ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.asciiWrite = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten =  blitBuffer(asciiToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Write = function (string, offset, length) {
  var bytes, pos;
  return SlowBuffer._charsWritten = blitBuffer(base64ToBytes(string), this, offset, length);
};

SlowBuffer.prototype.base64Slice = function (start, end) {
  var bytes = Array.prototype.slice.apply(this, arguments)
  return require("base64-js").fromByteArray(bytes);
}

function decodeUtf8Char(str) {
  try {
    return decodeURIComponent(str);
  } catch (err) {
    return String.fromCharCode(0xFFFD); // UTF 8 invalid char
  }
}

SlowBuffer.prototype.utf8Slice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var res = "";
  var tmp = "";
  var i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(bytes[i]);
      tmp = "";
    } else
      tmp += "%" + bytes[i].toString(16);

    i++;
  }

  return res + decodeUtf8Char(tmp);
}

SlowBuffer.prototype.asciiSlice = function () {
  var bytes = Array.prototype.slice.apply(this, arguments);
  var ret = "";
  for (var i = 0; i < bytes.length; i++)
    ret += String.fromCharCode(bytes[i]);
  return ret;
}

SlowBuffer.prototype.inspect = function() {
  var out = [],
      len = this.length;
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }
  return '<SlowBuffer ' + out.join(' ') + '>';
};


SlowBuffer.prototype.hexSlice = function(start, end) {
  var len = this.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; i++) {
    out += toHex(this[i]);
  }
  return out;
};


SlowBuffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }

  switch (encoding) {
    case 'hex':
      return this.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.utf8Slice(start, end);

    case 'ascii':
      return this.asciiSlice(start, end);

    case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


SlowBuffer.prototype.hexWrite = function(string, offset, length) {
  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2) {
    throw new Error('Invalid hex string');
  }
  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16);
    if (isNaN(byte)) throw new Error('Invalid hex string');
    this[offset + i] = byte;
  }
  SlowBuffer._charsWritten = i * 2;
  return i;
};


SlowBuffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  switch (encoding) {
    case 'hex':
      return this.hexWrite(string, offset, length);

    case 'utf8':
    case 'utf-8':
      return this.utf8Write(string, offset, length);

    case 'ascii':
      return this.asciiWrite(string, offset, length);

    case 'binary':
      return this.binaryWrite(string, offset, length);

    case 'base64':
      return this.base64Write(string, offset, length);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Write(string, offset, length);

    default:
      throw new Error('Unknown encoding');
  }
};


// slice(start, end)
SlowBuffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }

  return new Buffer(this, end - start, +start);
};


function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}


// Buffer

function Buffer(subject, encoding, offset) {
  if (!(this instanceof Buffer)) {
    return new Buffer(subject, encoding, offset);
  }

  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    this.length = coerce(encoding);
    this.parent = subject;
    this.offset = offset;
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        this.length = coerce(subject);
        break;

      case 'string':
        this.length = Buffer.byteLength(subject, encoding);
        break;

      case 'object': // Assume object is an array
        this.length = coerce(subject.length);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }

    if (this.length > Buffer.poolSize) {
      // Big buffer, just alloc one.
      this.parent = new SlowBuffer(this.length);
      this.offset = 0;

    } else {
      // Small buffer.
      if (!pool || pool.length - pool.used < this.length) allocPool();
      this.parent = pool;
      this.offset = pool.used;
      pool.used += this.length;
    }

    // Treat array-ish objects as a byte array.
    if (isArrayIsh(subject)) {
      for (var i = 0; i < this.length; i++) {
        this.parent[i + this.offset] = subject[i];
      }
    } else if (type == 'string') {
      // We are a string
      this.length = this.write(subject, 0, encoding);
    }
  }

}

function isArrayIsh(subject) {
  return Array.isArray(subject) || Buffer.isBuffer(subject) ||
         subject && typeof subject === 'object' &&
         typeof subject.length === 'number';
}

exports.SlowBuffer = SlowBuffer;
exports.Buffer = Buffer;

Buffer.poolSize = 8 * 1024;
var pool;

function allocPool() {
  pool = new SlowBuffer(Buffer.poolSize);
  pool.used = 0;
}


// Static methods
Buffer.isBuffer = function isBuffer(b) {
  return b instanceof Buffer || b instanceof SlowBuffer;
};


// Inspect
Buffer.prototype.inspect = function inspect() {
  var out = [],
      len = this.length;

  for (var i = 0; i < len; i++) {
    out[i] = toHex(this.parent[i + this.offset]);
    if (i == exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...';
      break;
    }
  }

  return '<Buffer ' + out.join(' ') + '>';
};


Buffer.prototype.get = function get(i) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i];
};


Buffer.prototype.set = function set(i, v) {
  if (i < 0 || i >= this.length) throw new Error('oob');
  return this.parent[this.offset + i] = v;
};


// write(string, offset = 0, length = buffer.length-offset, encoding = 'utf8')
Buffer.prototype.write = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase();

  var ret;
  switch (encoding) {
    case 'hex':
      ret = this.parent.hexWrite(string, this.offset + offset, length);
      break;

    case 'utf8':
    case 'utf-8':
      ret = this.parent.utf8Write(string, this.offset + offset, length);
      break;

    case 'ascii':
      ret = this.parent.asciiWrite(string, this.offset + offset, length);
      break;

    case 'binary':
      ret = this.parent.binaryWrite(string, this.offset + offset, length);
      break;

    case 'base64':
      // Warning: maxLength not taken into account in base64Write
      ret = this.parent.base64Write(string, this.offset + offset, length);
      break;

    case 'ucs2':
    case 'ucs-2':
      ret = this.parent.ucs2Write(string, this.offset + offset, length);
      break;

    default:
      throw new Error('Unknown encoding');
  }

  Buffer._charsWritten = SlowBuffer._charsWritten;

  return ret;
};


// toString(encoding, start=0, end=buffer.length)
Buffer.prototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf8').toLowerCase();

  if (typeof start == 'undefined' || start < 0) {
    start = 0;
  } else if (start > this.length) {
    start = this.length;
  }

  if (typeof end == 'undefined' || end > this.length) {
    end = this.length;
  } else if (end < 0) {
    end = 0;
  }

  start = start + this.offset;
  end = end + this.offset;

  switch (encoding) {
    case 'hex':
      return this.parent.hexSlice(start, end);

    case 'utf8':
    case 'utf-8':
      return this.parent.utf8Slice(start, end);

    case 'ascii':
      return this.parent.asciiSlice(start, end);

    case 'binary':
      return this.parent.binarySlice(start, end);

    case 'base64':
      return this.parent.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.parent.ucs2Slice(start, end);

    default:
      throw new Error('Unknown encoding');
  }
};


// byteLength
Buffer.byteLength = SlowBuffer.byteLength;


// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function fill(value, start, end) {
  value || (value = 0);
  start || (start = 0);
  end || (end = this.length);

  if (typeof value === 'string') {
    value = value.charCodeAt(0);
  }
  if (!(typeof value === 'number') || isNaN(value)) {
    throw new Error('value is not a number');
  }

  if (end < start) throw new Error('end < start');

  // Fill 0 bytes; we're done
  if (end === start) return 0;
  if (this.length == 0) return 0;

  if (start < 0 || start >= this.length) {
    throw new Error('start out of bounds');
  }

  if (end < 0 || end > this.length) {
    throw new Error('end out of bounds');
  }

  return this.parent.fill(value,
                          start + this.offset,
                          end + this.offset);
};


// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length == 0 || source.length == 0) return 0;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  return this.parent.copy(target.parent,
                          target_start + target.offset,
                          start + this.offset,
                          end + this.offset);
};


// slice(start, end)
Buffer.prototype.slice = function(start, end) {
  if (end === undefined) end = this.length;
  if (end > this.length) throw new Error('oob');
  if (start > end) throw new Error('oob');

  return new Buffer(this.parent, end - start, +start + this.offset);
};


// Legacy methods for backwards compatibility.

Buffer.prototype.utf8Slice = function(start, end) {
  return this.toString('utf8', start, end);
};

Buffer.prototype.binarySlice = function(start, end) {
  return this.toString('binary', start, end);
};

Buffer.prototype.asciiSlice = function(start, end) {
  return this.toString('ascii', start, end);
};

Buffer.prototype.utf8Write = function(string, offset) {
  return this.write(string, offset, 'utf8');
};

Buffer.prototype.binaryWrite = function(string, offset) {
  return this.write(string, offset, 'binary');
};

Buffer.prototype.asciiWrite = function(string, offset) {
  return this.write(string, offset, 'ascii');
};

Buffer.prototype.readUInt8 = function(offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  return buffer[offset];
};

function readUInt16(buffer, offset, isBigEndian, noAssert) {
  var val = 0;


  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer[offset] << 8;
    val |= buffer[offset + 1];
  } else {
    val = buffer[offset];
    val |= buffer[offset + 1] << 8;
  }

  return val;
}

Buffer.prototype.readUInt16LE = function(offset, noAssert) {
  return readUInt16(this, offset, false, noAssert);
};

Buffer.prototype.readUInt16BE = function(offset, noAssert) {
  return readUInt16(this, offset, true, noAssert);
};

function readUInt32(buffer, offset, isBigEndian, noAssert) {
  var val = 0;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  if (isBigEndian) {
    val = buffer[offset + 1] << 16;
    val |= buffer[offset + 2] << 8;
    val |= buffer[offset + 3];
    val = val + (buffer[offset] << 24 >>> 0);
  } else {
    val = buffer[offset + 2] << 16;
    val |= buffer[offset + 1] << 8;
    val |= buffer[offset];
    val = val + (buffer[offset + 3] << 24 >>> 0);
  }

  return val;
}

Buffer.prototype.readUInt32LE = function(offset, noAssert) {
  return readUInt32(this, offset, false, noAssert);
};

Buffer.prototype.readUInt32BE = function(offset, noAssert) {
  return readUInt32(this, offset, true, noAssert);
};


/*
 * Signed integer types, yay team! A reminder on how two's complement actually
 * works. The first bit is the signed bit, i.e. tells us whether or not the
 * number should be positive or negative. If the two's complement value is
 * positive, then we're done, as it's equivalent to the unsigned representation.
 *
 * Now if the number is positive, you're pretty much done, you can just leverage
 * the unsigned translations and return those. Unfortunately, negative numbers
 * aren't quite that straightforward.
 *
 * At first glance, one might be inclined to use the traditional formula to
 * translate binary numbers between the positive and negative values in two's
 * complement. (Though it doesn't quite work for the most negative value)
 * Mainly:
 *  - invert all the bits
 *  - add one to the result
 *
 * Of course, this doesn't quite work in Javascript. Take for example the value
 * of -128. This could be represented in 16 bits (big-endian) as 0xff80. But of
 * course, Javascript will do the following:
 *
 * > ~0xff80
 * -65409
 *
 * Whoh there, Javascript, that's not quite right. But wait, according to
 * Javascript that's perfectly correct. When Javascript ends up seeing the
 * constant 0xff80, it has no notion that it is actually a signed number. It
 * assumes that we've input the unsigned value 0xff80. Thus, when it does the
 * binary negation, it casts it into a signed value, (positive 0xff80). Then
 * when you perform binary negation on that, it turns it into a negative number.
 *
 * Instead, we're going to have to use the following general formula, that works
 * in a rather Javascript friendly way. I'm glad we don't support this kind of
 * weird numbering scheme in the kernel.
 *
 * (BIT-MAX - (unsigned)val + 1) * -1
 *
 * The astute observer, may think that this doesn't make sense for 8-bit numbers
 * (really it isn't necessary for them). However, when you get 16-bit numbers,
 * you do. Let's go back to our prior example and see how this will look:
 *
 * (0xffff - 0xff80 + 1) * -1
 * (0x007f + 1) * -1
 * (0x0080) * -1
 */
Buffer.prototype.readInt8 = function(offset, noAssert) {
  var buffer = this;
  var neg;

  if (!noAssert) {
    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to read beyond buffer length');
  }

  neg = buffer[offset] & 0x80;
  if (!neg) {
    return (buffer[offset]);
  }

  return ((0xff - buffer[offset] + 1) * -1);
};

function readInt16(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt16(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x8000;
  if (!neg) {
    return val;
  }

  return (0xffff - val + 1) * -1;
}

Buffer.prototype.readInt16LE = function(offset, noAssert) {
  return readInt16(this, offset, false, noAssert);
};

Buffer.prototype.readInt16BE = function(offset, noAssert) {
  return readInt16(this, offset, true, noAssert);
};

function readInt32(buffer, offset, isBigEndian, noAssert) {
  var neg, val;

  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  val = readUInt32(buffer, offset, isBigEndian, noAssert);
  neg = val & 0x80000000;
  if (!neg) {
    return (val);
  }

  return (0xffffffff - val + 1) * -1;
}

Buffer.prototype.readInt32LE = function(offset, noAssert) {
  return readInt32(this, offset, false, noAssert);
};

Buffer.prototype.readInt32BE = function(offset, noAssert) {
  return readInt32(this, offset, true, noAssert);
};

function readFloat(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 3 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.readFloatLE = function(offset, noAssert) {
  return readFloat(this, offset, false, noAssert);
};

Buffer.prototype.readFloatBE = function(offset, noAssert) {
  return readFloat(this, offset, true, noAssert);
};

function readDouble(buffer, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset + 7 < buffer.length,
        'Trying to read beyond buffer length');
  }

  return require('./buffer_ieee754').readIEEE754(buffer, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.readDoubleLE = function(offset, noAssert) {
  return readDouble(this, offset, false, noAssert);
};

Buffer.prototype.readDoubleBE = function(offset, noAssert) {
  return readDouble(this, offset, true, noAssert);
};


/*
 * We have to make sure that the value is a valid integer. This means that it is
 * non-negative. It has no fractional component and that it does not exceed the
 * maximum allowed value.
 *
 *      value           The number to check for validity
 *
 *      max             The maximum value
 */
function verifuint(value, max) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value >= 0,
      'specified a negative value for writing an unsigned value');

  assert.ok(value <= max, 'value is larger than maximum value for type');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

Buffer.prototype.writeUInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xff);
  }

  buffer.parent[buffer.offset + offset] = value;
};

function writeUInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset + 1] = value & 0x00ff;
  } else {
    buffer.parent[buffer.offset + offset + 1] = (value & 0xff00) >>> 8;
    buffer.parent[buffer.offset + offset] = value & 0x00ff;
  }
}

Buffer.prototype.writeUInt16LE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt16BE = function(value, offset, noAssert) {
  writeUInt16(this, value, offset, true, noAssert);
};

function writeUInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'trying to write beyond buffer length');

    verifuint(value, 0xffffffff);
  }

  if (isBigEndian) {
    buffer.parent[buffer.offset + offset] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset + 3] = value & 0xff;
  } else {
    buffer.parent[buffer.offset + offset + 3] = (value >>> 24) & 0xff;
    buffer.parent[buffer.offset + offset + 2] = (value >>> 16) & 0xff;
    buffer.parent[buffer.offset + offset + 1] = (value >>> 8) & 0xff;
    buffer.parent[buffer.offset + offset] = value & 0xff;
  }
}

Buffer.prototype.writeUInt32LE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeUInt32BE = function(value, offset, noAssert) {
  writeUInt32(this, value, offset, true, noAssert);
};


/*
 * We now move onto our friends in the signed number category. Unlike unsigned
 * numbers, we're going to have to worry a bit more about how we put values into
 * arrays. Since we are only worrying about signed 32-bit values, we're in
 * slightly better shape. Unfortunately, we really can't do our favorite binary
 * & in this system. It really seems to do the wrong thing. For example:
 *
 * > -32 & 0xff
 * 224
 *
 * What's happening above is really: 0xe0 & 0xff = 0xe0. However, the results of
 * this aren't treated as a signed number. Ultimately a bad thing.
 *
 * What we're going to want to do is basically create the unsigned equivalent of
 * our representation and pass that off to the wuint* functions. To do that
 * we're going to do the following:
 *
 *  - if the value is positive
 *      we can pass it directly off to the equivalent wuint
 *  - if the value is negative
 *      we do the following computation:
 *         mb + val + 1, where
 *         mb   is the maximum unsigned value in that byte size
 *         val  is the Javascript negative integer
 *
 *
 * As a concrete value, take -128. In signed 16 bits this would be 0xff80. If
 * you do out the computations:
 *
 * 0xffff - 128 + 1
 * 0xffff - 127
 * 0xff80
 *
 * You can then encode this value as the signed version. This is really rather
 * hacky, but it should work and get the job done which is our goal here.
 */

/*
 * A series of checks to make sure we actually have a signed 32-bit number
 */
function verifsint(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');

  assert.ok(Math.floor(value) === value, 'value has a fractional component');
}

function verifIEEE754(value, max, min) {
  assert.ok(typeof (value) == 'number',
      'cannot write a non-number as a number');

  assert.ok(value <= max, 'value larger than maximum allowed value');

  assert.ok(value >= min, 'value smaller than minimum allowed value');
}

Buffer.prototype.writeInt8 = function(value, offset, noAssert) {
  var buffer = this;

  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7f, -0x80);
  }

  if (value >= 0) {
    buffer.writeUInt8(value, offset, noAssert);
  } else {
    buffer.writeUInt8(0xff + value + 1, offset, noAssert);
  }
};

function writeInt16(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 1 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fff, -0x8000);
  }

  if (value >= 0) {
    writeUInt16(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt16(buffer, 0xffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt16LE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt16BE = function(value, offset, noAssert) {
  writeInt16(this, value, offset, true, noAssert);
};

function writeInt32(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifsint(value, 0x7fffffff, -0x80000000);
  }

  if (value >= 0) {
    writeUInt32(buffer, value, offset, isBigEndian, noAssert);
  } else {
    writeUInt32(buffer, 0xffffffff + value + 1, offset, isBigEndian, noAssert);
  }
}

Buffer.prototype.writeInt32LE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, false, noAssert);
};

Buffer.prototype.writeInt32BE = function(value, offset, noAssert) {
  writeInt32(this, value, offset, true, noAssert);
};

function writeFloat(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 3 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      23, 4);
}

Buffer.prototype.writeFloatLE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, false, noAssert);
};

Buffer.prototype.writeFloatBE = function(value, offset, noAssert) {
  writeFloat(this, value, offset, true, noAssert);
};

function writeDouble(buffer, value, offset, isBigEndian, noAssert) {
  if (!noAssert) {
    assert.ok(value !== undefined && value !== null,
        'missing value');

    assert.ok(typeof (isBigEndian) === 'boolean',
        'missing or invalid endian');

    assert.ok(offset !== undefined && offset !== null,
        'missing offset');

    assert.ok(offset + 7 < buffer.length,
        'Trying to write beyond buffer length');

    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }

  require('./buffer_ieee754').writeIEEE754(buffer, value, offset, isBigEndian,
      52, 8);
}

Buffer.prototype.writeDoubleLE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, false, noAssert);
};

Buffer.prototype.writeDoubleBE = function(value, offset, noAssert) {
  writeDouble(this, value, offset, true, noAssert);
};

SlowBuffer.prototype.readUInt8 = Buffer.prototype.readUInt8;
SlowBuffer.prototype.readUInt16LE = Buffer.prototype.readUInt16LE;
SlowBuffer.prototype.readUInt16BE = Buffer.prototype.readUInt16BE;
SlowBuffer.prototype.readUInt32LE = Buffer.prototype.readUInt32LE;
SlowBuffer.prototype.readUInt32BE = Buffer.prototype.readUInt32BE;
SlowBuffer.prototype.readInt8 = Buffer.prototype.readInt8;
SlowBuffer.prototype.readInt16LE = Buffer.prototype.readInt16LE;
SlowBuffer.prototype.readInt16BE = Buffer.prototype.readInt16BE;
SlowBuffer.prototype.readInt32LE = Buffer.prototype.readInt32LE;
SlowBuffer.prototype.readInt32BE = Buffer.prototype.readInt32BE;
SlowBuffer.prototype.readFloatLE = Buffer.prototype.readFloatLE;
SlowBuffer.prototype.readFloatBE = Buffer.prototype.readFloatBE;
SlowBuffer.prototype.readDoubleLE = Buffer.prototype.readDoubleLE;
SlowBuffer.prototype.readDoubleBE = Buffer.prototype.readDoubleBE;
SlowBuffer.prototype.writeUInt8 = Buffer.prototype.writeUInt8;
SlowBuffer.prototype.writeUInt16LE = Buffer.prototype.writeUInt16LE;
SlowBuffer.prototype.writeUInt16BE = Buffer.prototype.writeUInt16BE;
SlowBuffer.prototype.writeUInt32LE = Buffer.prototype.writeUInt32LE;
SlowBuffer.prototype.writeUInt32BE = Buffer.prototype.writeUInt32BE;
SlowBuffer.prototype.writeInt8 = Buffer.prototype.writeInt8;
SlowBuffer.prototype.writeInt16LE = Buffer.prototype.writeInt16LE;
SlowBuffer.prototype.writeInt16BE = Buffer.prototype.writeInt16BE;
SlowBuffer.prototype.writeInt32LE = Buffer.prototype.writeInt32LE;
SlowBuffer.prototype.writeInt32BE = Buffer.prototype.writeInt32BE;
SlowBuffer.prototype.writeFloatLE = Buffer.prototype.writeFloatLE;
SlowBuffer.prototype.writeFloatBE = Buffer.prototype.writeFloatBE;
SlowBuffer.prototype.writeDoubleLE = Buffer.prototype.writeDoubleLE;
SlowBuffer.prototype.writeDoubleBE = Buffer.prototype.writeDoubleBE;

});

require.define("/node_modules/buffer-browserify/node_modules/base64-js/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"lib/b64.js"}
});

require.define("/node_modules/buffer-browserify/node_modules/base64-js/lib/b64.js",function(require,module,exports,__dirname,__filename,process,global){(function (exports) {
	'use strict';

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	function b64ToByteArray(b64) {
		var i, j, l, tmp, placeHolders, arr;

		if (b64.length % 4 > 0) {
			throw 'Invalid string. Length must be a multiple of 4';
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		placeHolders = b64.indexOf('=');
		placeHolders = placeHolders > 0 ? b64.length - placeHolders : 0;

		// base64 is 4/3 + up to two characters of the original data
		arr = [];//new Uint8Array(b64.length * 3 / 4 - placeHolders);

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length;

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (lookup.indexOf(b64[i]) << 18) | (lookup.indexOf(b64[i + 1]) << 12) | (lookup.indexOf(b64[i + 2]) << 6) | lookup.indexOf(b64[i + 3]);
			arr.push((tmp & 0xFF0000) >> 16);
			arr.push((tmp & 0xFF00) >> 8);
			arr.push(tmp & 0xFF);
		}

		if (placeHolders === 2) {
			tmp = (lookup.indexOf(b64[i]) << 2) | (lookup.indexOf(b64[i + 1]) >> 4);
			arr.push(tmp & 0xFF);
		} else if (placeHolders === 1) {
			tmp = (lookup.indexOf(b64[i]) << 10) | (lookup.indexOf(b64[i + 1]) << 4) | (lookup.indexOf(b64[i + 2]) >> 2);
			arr.push((tmp >> 8) & 0xFF);
			arr.push(tmp & 0xFF);
		}

		return arr;
	}

	function uint8ToBase64(uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length;

		function tripletToBase64 (num) {
			return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
		};

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
			output += tripletToBase64(temp);
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1];
				output += lookup[temp >> 2];
				output += lookup[(temp << 4) & 0x3F];
				output += '==';
				break;
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1]);
				output += lookup[temp >> 10];
				output += lookup[(temp >> 4) & 0x3F];
				output += lookup[(temp << 2) & 0x3F];
				output += '=';
				break;
		}

		return output;
	}

	module.exports.toByteArray = b64ToByteArray;
	module.exports.fromByteArray = uint8ToBase64;
}());

});

require.define("/node_modules/buffer-browserify/buffer_ieee754.js",function(require,module,exports,__dirname,__filename,process,global){exports.readIEEE754 = function(buffer, offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.writeIEEE754 = function(buffer, value, offset, isBE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isBE ? (nBytes - 1) : 0,
      d = isBE ? -1 : 1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

});

require.define("/engine/cse.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var IR = require('./ir.js');
var A = IR.A, B = IR.B, OPCODE = IR.OPCODE;

var runtime = require('./runtime.js');

//
// This file contains straight forward CSE (Common Subexpressions Elimination)
// implementation.  Before any instruction is added to the IR it is passed
// through CSE that tries to find equivalent instruction in the already
// emitted part of the IR.
//
// Can perform the following:
//   - elimination of redundant CHECKN, CHECKK, CHECKFAST guards;
//   - elimination of redundant SETK;
//   - LOAD-to-LOAD forwarding
//

// Search for an instance of [op a, b] in the IR. Returns either
// an index of an equivalent instruction or IR.ELIMINATE if
// instruction can be eliminated entirely.
exports.do = function (ir, op, a, b) {
  var rule = CSE_RULES[op];
  if (typeof rule === 'function') {
    return rule(ir, a, b);
  }
};

function simplecse(ir, op) {
  return ir.checkchain(OPCODE(op), 0, function (ref, op1) {
    if (op === op1) return ref;
  });
}

function simpleelim(ir, op) {
  if (typeof simplecse(ir, op) === "number") return IR.ELIMINATE;
}

var CSE_RULES = [];

//
// CHECKN and CHECKI32 elimination
//

CSE_RULES[IR.CHECKN] = function (ir, val) {
  if (ir.isNumber(val)) return val;
  return simplecse(ir, IR.OP(IR.CHECKN, val));
};

CSE_RULES[IR.CHECKI32] = function (ir, val) {
  return simplecse(ir, IR.OP(IR.CHECKI32, val));
};

//
// CHECKK elimination
//

function nostores(ir, boundary) {
  function is_generic(ref, store) {
    if (OPCODE(ir[A(store)]) === IR.PROP) return true;
  }
  return !ir.checkchain(IR.STORE, boundary, is_generic);
}


CSE_RULES[IR.CHECKK] = function (ir, obj, klass) {
  // If obj is a result of a NEWTABLE invocation and there are no intervening
  // stores then check against ROOT_KLASS can be eliminated.
  if (ir.getconst(klass) === runtime.ROOT_KLASS &&
      OPCODE(ir[obj]) === IR.NEWTABLE &&
      nostores(ir, obj)) {
    return IR.ELIMINATE;
  }

  // Search all SETK upwards and see if there is a matching one that
  // sets hidden class of obj to klass.
  // We assume that any SETK can alias any SETK so if we encounter
  // non matching one we terminate the search.
  function match_setk(ref, setk) {
    return A(setk) === obj && B(setk) === klass && nostores(ir, ref);
  }

  if (ir.checkchain(IR.SETK, obj, match_setk)) return IR.ELIMINATE;

  // Search all CHECKK upwards and see if there is a matching one
  // that ensures that hidden class of obj is klass.
  function match_checkk(ref, checkk) {
    if (A(checkk) === obj) {
      if (B(checkk) === klass && nostores(ir, ref)) {
        return true;
      } else {
        return false;  // There is an intervening store or check. No need to search further.
      }
    }

  }

  if (ir.checkchain(IR.CHECKK, obj, match_checkk)) return IR.ELIMINATE;
};

//
// CHECKFAST elimination
//

CSE_RULES[IR.CHECKFAST] = function (ir, obj) {
  function match_checkfast(ref, checkfast) {
    if (A(checkfast) === obj) {
      return nostores(ir, ref);
    }
  }

  if (ir.checkchain(IR.CHECKFAST, obj, match_checkfast)) return IR.ELIMINATE;
};

//
// SETK elimination
//

CSE_RULES[IR.SETK] = function (ir, obj, klass) {
  // Check the last SETK. If it modifies the same object and
  // does not have any intervening stores or guards then update it
  // to set new hidden class directly.
  // Previous hidden class could not be observed (there was no guards).
  function match_setk(ref, setk) {
    if (A(setk) === obj && nostores(ir, ref) && (ir.lastguard <= ref)) {
      ir[ref] = IR.OP(IR.SETK, obj, klass);
      return true;
    } else {
      // For simplicity we assume that any SETK can alias any setk.
      return false;
    }
  }

  if (ir.checkchain(IR.SETK, obj, match_setk)) return IR.ELIMINATE;
};


//
// LOAD-to-LOAD forwarding.
//

function canalias(p1, p2) {
  var op1 = OPCODE(p1);
  var op2 = OPCODE(p2);

  assert(op1 === IR.PROP || op1 === IR.PROPI || op1 === IR.PROPF);
  assert(op2 === IR.PROP || op2 === IR.PROPI || op2 === IR.PROPF);

  // Assume PROP aliases everything.
  if (op1 === IR.PROP || op2 === IR.PROP) return true;

  // PROPF can't alias PROPI.
  if (op1 !== op2) return false;

  return !IR.IS_CONSTANT(B(p1)) || !IR.IS_CONSTANT(B(p2)) || (B(p1) === B(p2));
}

function nostoresto(ir, boundary, prop) {
  function is_store_to(ref, store) {
    if (canalias(ir[A(store)], ir[prop])) return true;
  }

  return !ir.checkchain(IR.STORE, boundary, is_store_to);
}

CSE_RULES[IR.LOAD] = function (ir, prop) {
  // Can't forward generic loads.
  if (OPCODE(ir[prop]) === IR.PROP) return;

  function match_load(ref, load) {
    if (A(load) === prop) {
      if (nostoresto(ir, ref, ir[prop])) {
        return ref;
      } else {
        return null;
      }
    }
  }

  return ir.checkchain(IR.LOAD, A(prop), match_load);
};

//
// LOADGLOBAL-to-LOADGLOBAL forwarding.
//

CSE_RULES[IR.LOADGLOBAL] = function (ir, name) {
  // We assume that global loads can only be aliased by global stores.
  // But there is no STOREGLOBAL in our IR so there is nothing to check :-)
  return simplecse(ir, IR.OP(IR.LOADGLOBAL, name));
};

//
// Other.
//

CSE_RULES[IR.PROPF] = function (ir, obj, fieldidx) {
  return simplecse(ir, IR.OP(IR.PROPF, obj, fieldidx));
};

CSE_RULES[IR.PROPI] = function (ir, obj, key) {
  return simplecse(ir, IR.OP(IR.PROPI, obj, key));
};

CSE_RULES[IR.MUL] = function (ir, a, b) {
  return simplecse(ir, IR.OP(IR.MUL, a, b));
};

CSE_RULES[IR.ADD] = function (ir, a, b) {
  return simplecse(ir, IR.OP(IR.ADD, a, b));
};

});

require.define("/engine/makeloop.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var engine = require('./');

var IR = require('./ir.js');

// Emit recorded IR once more eliminating any redundancies on the go and
// record substitution table. The second copy will become a loop body.
// The recorded IR itself becomes peeled iteration of the loop. It will
// contain all invariants that CSE managed to eliminate from the loop.
// Loop phis are computed and emitted after the loop body.
exports.MakeLoop = function MakeLoop(ir) {
  var loopentry = ir.loopentry = ir.length;
  var loopentry_frame = ir.envs[loopentry].frames[0];

  // Substitution table for SSA values: maps values to their copies inside
  // the loop body. If value is a loop invariant then subst[ref] === ref.
  var subst = new Array(ir.length * 2);

  // List of values that (potentially) need phis.
  // Any value that flows into loop's body from the peeled first iteration might
  // have a different value on the back edge which can be determined only after
  // the copying is complete. This is why PHIs are emitted at the very end.
  var phis  = [];
  phis.contains = [];  // contains[ref] is true iff value is in the phis list.

  function emitphi(ref) {
    if (!phis.contains[ref]) {
      phis.contains[ref] = true;
      phis.push(ref);
    }
  }

  // Start replicating IR. Mark loop entry with LOOP.
  ir.emit(IR.LOOP);
  for (var ref = 0; ref < loopentry; ref++) {
    var op = ir[ref];

    var opcode = IR.OPCODE(op);

    // IR.REG is rewritten to the computed value of the register
    // kept in ir.R.
    if (opcode === IR.REG) {
      var newref = ir.R[IR.FROM_LITERAL(IR.A(op))];
      emitphi(newref);  // Potential loop carried dependency might require a PHI.
      subst[ref] = newref;
      continue;
    }

    // Substitute operands.
    var va = IR.A(op);
    var new_va = IR.IS_CONSTANT(va) ? va : subst[va];
    var vb = IR.B(op);
    var new_vb = IR.IS_CONSTANT(vb) ? vb : subst[vb];

    if (INVARIANT[opcode] && (new_va == va) && (new_vb == vb)) {
      subst[ref] = ref;  // Invariant instruction.
    } else {
      var newref = ir.emit(opcode, new_va, new_vb);

      if ((newref < loopentry) && (newref !== ref) && (newref !== IR.ELIMINATE)) {
        // Potential loop carried dependency might require a PHI.
        emitphi(newref);
      } else if (typeof ir.envs[ref] !== "undefined") {
        // If instruction had a deoptimization environment substitute values in it
        // and attach it to the resulting instruction.
        ir.envs[newref] = SubstituteEnvironment(ir.envs[ref], subst, loopentry_frame);
      }

      subst[ref] = newref;
    }
  }

  EmitPhis(ir, phis, subst);

  ir.envs[ir.length] = SubstituteEnvironment(ir.envs[loopentry], subst, loopentry_frame);

  PublishIR(ir);
}

//
// PHIs computation
//
//   While IR was being copied all values that are potentially carried on the backedge
//   were collected in the phis array. This pass computes an actual set of phis that
//   need to be emitted. Phis that are redundant (not used or have the same left and
//   right operands) are eliminated.
//

function EmitPhis(ir, phis, subst) {
  var isredundant = [];

  // Initially assume that all phis are redundant.
  for (var i = 0; i < phis.length; i++) isredundant[phis[i]] = true;

  // Tentatively mark used phis as non-redundant.
  for (var ref = ir.length - 1; ref > ir.loopentry; ref--) {
    // Process operands.
    var op = ir[ref]
    if (!IR.IS_CONSTANT(IR.A(op))) isredundant[IR.A(op)] = false;
    if (!IR.IS_CONSTANT(IR.B(op))) isredundant[IR.B(op)] = false;

    // Process attached environment.
    if (typeof ir.envs[ref] !== 'undefined') {
      ir.envs[ref].frames.forEach(function (frame) {
        for (var i = 0; i <= frame.maxr; i++) {
          var valref = frame[i];
          if (typeof valref !== "undefined" && !IR.IS_CONSTANT(valref)) {
            isredundant[valref] = false;
          }
        }
      });
    }
  }

  // Process non-redundant phis until fix point is reached.
  do {
    var foundmore = false;
    for (var i = 0; i < phis.length; i++) {
      var lref = phis[i];
      if (!isredundant[lref]) {
        var rref = subst[lref];
        if (rref === lref) {
          // Values are the same on the entry to the loop
          // and on the back edge. PHI is not needed.
          isredundant[lref] = true;
        } else if (phis.contains[rref] && isredundant[rref]) {
          // If rref itself requires a phi mark it non-redundant.
          isredundant[rref] = false;
          foundmore = true;  // Might need another pass.
        }
      }
    }
  } while (foundmore);

  // Emit non-redundant phis.
  ir.phies = ir.length;
  for (var i = 0; i < phis.length; i++) {
    var lref = phis[i];
    if (!isredundant[lref]) {
      var rref = subst[lref];
      ir.emit(IR.PHI, lref, rref);
    }
  }
}


// Helper function that substitutes values in the given deoptimization
// environment with their copies.
function SubstituteEnvironment(env, subst, loopentry_frame) {
  var newenv = new IR.Environment;

  env.frames.forEach(function (frame, depth) {
    var newframe = newenv.newFrame(frame.maxr, frame.closure, frame.pc, frame.rr);
    for (var i = 0; i <= frame.maxr; i++) {
      var ref = frame[i];
      if (typeof ref !== "undefined") {
        newframe[i] = subst[ref];
      } else if (depth === 0) {
        newframe[i] = loopentry_frame[i];
      }
    }
  });

  return newenv;
}


//
// Invariant instructions.
//

var INVARIANT = new Array(IR.names.length);
for (var i = 0; i < INVARIANT.length; i++) INVARIANT[i] = false;
INVARIANT[IR.MUL] = true;
INVARIANT[IR.ADD] = true;
INVARIANT[IR.UNM] = true;
INVARIANT[IR.CHECKV] = true;
INVARIANT[IR.CHECKN] = true;
INVARIANT[IR.PROPF] = true;

});

require.define("/engine/ir2js.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var engine = require('./');

var IR = require('./ir.js');
var OPCODE = IR.OPCODE, A = IR.A, B = IR.B;

var assert = require('assert');

exports.Compile = function (ir) {
  var jsfunc = new Function('S,pool', new JSCodegen(ir).generate());

  PublishSource(jsfunc.toString());

  return jsfunc;
};

//
// JavaScript emitter.
//

function JSCodegen(ir) {
  this.ir = ir;

  // Mapping between SSA values and variables containing them.
  // Contains either name of a variable or a virtual register number
  // that can be translated to a variable name by prepending "v".
  this.ins2var = new Array(this.ir.length);

  // State of allocated virtual registers (true if vreg is free).
  this.freereg = [];
}

JSCodegen.prototype = {
  // Translate IR into JavaScript source code.
  generate: function () {
    var body = this.generateBody();
    var entry = this.generateEntry();
    return entry.toString() + body.toString();
  },

  // Generate variable declarations for all virtual registers and auxiliary variables.
  generateEntry: function () {
    var varnames = ['G = S.G'];
    for (var i = 0; i < this.freereg.length; i++) varnames.push('v' + i);
    return '  var ' + varnames.join(', ') + ';\n';
  },

  // Translate IR into body of the function. Translation is done in reverse order to
  // simplify "register allocation": a fresh virtual register is requested when a
  // last use is seen and virtual register is marked as free when definition is reached.
  // JavaScript source code patterns emitted for different instructions are specified in
  // the JSCodegen.COMPILE array.
  generateBody: function () {
    this.in_loop = true;  // We start emitting loop code first until we reach LOOP instruction.
    this.code = new Code;
    this.code.emit("}");
    this.emitBackEdgePhis();
    for (var pc = this.ir.length - 1; pc >= 0; pc--) {
      var op = this.ir[pc];
      var emitter = JSCodegen.COMPILE[OPCODE(op)];
      if (typeof emitter === 'function') emitter.call(this, pc, op);
    }
    return this.code.reverse();
  },

  // Return JS representation of the constant pointed by a ref.
  const2str: function (ref) {
    var val = this.ir.getconst(ref);
    switch (typeof val) {
      case "string": return '"' + val + '"';
      case "number": return val;
      default:
        return "pool[" + (ref - IR.CONSTANT_BIAS) + "]";
    }
  },

  // Return JS reference to the given SSA value: it can be either
  // constant expression or a variable reference. If SSA value
  // is not yet mapped to a virtual register then allocate one.
  use: function (ref) {
    if (IR.IS_CONSTANT(ref)) return this.const2str(ref);

    var op = this.ir[ref];
    while (IR.OPCODE(op) === IR.CHECKN || IR.OPCODE(op) === IR.CHECKI32) {
      ref = IR.A(this.ir[ref]);
      op = this.ir[ref];
    }

    var v = this.ins2var[ref];
    // Value already has a corresponding variable.
    if (typeof v === "string") return v;
    if (typeof v === "number") return "v" + v;

    // Need to allocate a new virtual register.
    // Try to reuse one first, but keep values defined outside
    // of the loop alive at the back-edge and don't mix them
    // with values defined inside the loop.
    var reg;
    if (!this.in_loop === (ref < this.ir.loopentry)) {
      for (var i = 0; i < this.freereg.length; i++) {
        if (this.freereg[i]) {
          reg = i;
          break;
        }
      }
    }

    // No free register found. Just pick the next not yet unused one.
    if (typeof reg !== "number") {
      reg = this.freereg.length;
    }

    this.freereg[reg] = false;
    this.ins2var[ref] = reg;

    return "v" + reg;
  },

  // SSA value definition has been reached.
  // If a virtual register was allocated for it then release it.
  define: function (ref) {
    var v = this.ins2var[ref];
    if (typeof v === "number") {
      this.freereg[v] = true;
      return "v" + v;
    }
    return v;
  },

  // Compile SSA value and return result. Used to compile PROPF and PROPI.
  ref2expr: function (ref) {
    var op = this.ir[ref];
    return JSCodegen.COMPILE[OPCODE(op)].call(this, ref, op);
  },

  // Format JavaScript source code for the given IR instruction based on a
  // template. Templates can use A, B to reference instruction operands as
  // literal values and VA, VB to reference then as references to other
  // SSA values.
  formatInstruction: function (template, op) {
    var codegen = this;
    return template.replace(/\$(\w+)/g, function (_, operand) {
      switch (operand) {
        case "A": return IR.FROM_LITERAL(A(op));
        case "B": return IR.FROM_LITERAL(B(op));
        case "VA": return codegen.use(A(op));
        case "VB": return codegen.use(B(op));
      }
    });
  },

  // Generate trace exit stub that materializes the given environment.
  generateExitStub: function (env) {
    var exitstub = new Code;

    env.frames.forEach(function (frame, depth) {
      if (depth !== 0) {
        exitstub.emit("S.enterFrame(", this.use(frame.closure), ", ", frame.rr, ");");
      }

      for (var r = 0; r <= frame.maxr; r++) {
        var valref = frame[r];
        if (typeof valref === "number") exitstub.emit("S.R[", r , "] = ", this.use(valref), ";");
      }

      exitstub.emit("S.pc = ", frame.pc, ";");
    }, this);

    exitstub.emit("return;");
    return exitstub;
  },

  // Generate phi-resolution moves on the back edge of the loop.
  // Take precautions to resolve any dependency cycles that exist
  // between phis.
  emitBackEdgePhis: function () {
    var ir = this.ir;

    var phis = new Code;

    for (var pc = ir.length - 1, phi = 0; OPCODE(ir[pc]) == IR.PHI; pc--, phi++) {
      this.ins2var[A(ir[pc])] = "phi" + phi;
    }

    // Collect a list of moves to perform.
    var moves = [];
    for (var pc = ir.length - 1, phi = 0; OPCODE(ir[pc]) == IR.PHI; pc--, phi++) {
      var src = B(ir[pc]);
      moves.push({ dst: "phi" + phi, src: this.use(src), isconst: IR.IS_CONSTANT(src)});
    }

    // Helper function that emits the given move.
    function EmitMove(i) {
      var move = moves[i];

      var dst = move.dst;
      move.dst = null;  // Mark move as pending by setting dst to null.

      // Iterate over non-pending not performed moves and find those
      // that block this move (have source equal to destination of the current move).
      for (var j = 0; j < moves.length; j++) {
        var other = moves[j];
        if (other !== null && other.dst !== null && other.src === dst) {
          EmitMove(j);  // Emit blocking move first.
        }
      }

      // There might be a most one pending blocking move left if we reached
      // the end of the cycle. Find it and preserve its source in the
      // temporary register.
      // Any move can participate in at most one cycle thus a single temporary
      // register is enough.
      for (var j = 0; j < moves.length; j++) {
        var other = moves[j];
        if (other !== null && other.src === dst) {
          assert(other.dst === null);
          phis.emit("var t = ", other.src, ";");
          other.src = "t";
          break;
        }
      }

      phis.emit(dst, " = ", move.src, ";");
      moves[i] = null;  // Remove move from the list.
    }

    // Emit all moves with non-constant sources.
    for (var i = 0; i < moves.length; i++) {
      if (moves[i] !== null && !moves[i].isconst) EmitMove(i);
    }

    // Emit all moves with constant sources.
    for (var i = 0; i < moves.length; i++) {
      if (moves[i] !== null) {
        assert(moves[i].isconst);
        phis.emit(moves[i].src, " = ", moves[i].dst);
      }
    }

    this.code.append(phis.reverse());
  },

  // Emit phi-resolution moves at the entry to the loop.
  // There can be no circular dependency here.
  emitLoopEntryPhis: function () {
    var ir = this.ir;

    var phis = new Code;
    for (var pc = ir.length - 1, phi = 0; OPCODE(ir[pc]) == IR.PHI; pc--, phi++) {
      var ref = A(ir[pc]);
      this.ins2var[ref] = null;
      phis.emit("var phi", phi, " = ", this.use(ref), ";");
    }

    this.code.append(phis.reverse());
  },
};

//
// JavaScript source code templates for IR instructions
//

JSCodegen.COMPILE = [];
JSCodegen.COMPILE[IR.REG] = define("S.R[$A]");  // Register load.

// Checks.
JSCodegen.COMPILE[IR.CHECKN]    = doEmit("Runtime_CheckNumber($VA);");
JSCodegen.COMPILE[IR.CHECKI32]  = exitIf("($VA|0) !== $VA");
JSCodegen.COMPILE[IR.LESSTHAN]  = exitIf("$VA >= $VB");
JSCodegen.COMPILE[IR.CHECKFAST] = exitIf("$VA.klass.kind !== 'fast'");
JSCodegen.COMPILE[IR.CHECKV]    = exitIf("$VA !== $VB");
JSCodegen.COMPILE[IR.CHECKK]    = exitIf("$VA.klass !== $VB");

// Arithmetic.
JSCodegen.COMPILE[IR.ADD] = define("$VA + $VB");
JSCodegen.COMPILE[IR.MUL] = define("$VA * $VB");
JSCodegen.COMPILE[IR.UNM] = define("-$VA");

// Property access.
JSCodegen.COMPILE[IR.STORE] = function (ref, store) {
  var prop = this.ir[A(store)];
  switch (OPCODE(prop)) {
    case IR.PROPI:
    case IR.PROPF:
      this.code.emit(this.ref2expr(A(store)), " = ", this.use(B(store)), ";");
      break;
    case IR.PROP:
      this.code.emit("Runtime_Store(", this.use(A(prop)), ", ",
                                       this.use(B(prop)), ", ",
                                       this.use(B(store)), ");");
      break;
  }
};

JSCodegen.COMPILE[IR.LOAD] = defineAs(function (ref, load) {
  var prop = this.ir[A(load)];
  switch (OPCODE(prop)) {
    case IR.PROPI:
    case IR.PROPF:
      return this.ref2expr(A(load));
    case IR.PROP:
      return ("Runtime_Load(" + this.use(A(prop)) + ", " + this.use(B(prop)) + ");");
  }
});

JSCodegen.COMPILE[IR.PROPI] = doFormat("$VA.elements[$VB]");
JSCodegen.COMPILE[IR.PROPF] = doFormat("$VA.properties[$B]");

// Hidden class manipulation.
JSCodegen.COMPILE[IR.SETK] = doEmit("$VA.klass = $VB;");

// Global variable access.
JSCodegen.COMPILE[IR.LOADGLOBAL] = define("G.properties[$A]");

// Creation of new tables.
JSCodegen.COMPILE[IR.NEWTABLE] = define("Runtime_NewTable()");

// Loop entry.
JSCodegen.COMPILE[IR.LOOP] = function (ref, op) {
  this.code.emit("while (true) {");
  this.in_loop = false;  // We are no longer in the loop.
  this.emitLoopEntryPhis();
};

// Phis are handled in a special way.
JSCodegen.COMPILE[IR.PHI] = null;

//
// Helper methods that are used to define source code templates.
//

// Apply template to the instruction and return result.
function doFormat(template) {
  return function (ref, op) { return this.formatInstruction(template, op); };
}

// Apply template to the instruction and emit result.
function doEmit(template) {
  return function (ref, op) {
    this.code.emit(this.formatInstruction(template, op));
  };
}

// Apply formatter to the instruction and emit value definition.
function defineAs(formatter) {
  return function (ref, op) {
    var tgt = this.define(ref);

    var val = formatter.call(this, ref, op);
    if (typeof tgt === "string") {
      this.code.emit(tgt, " = ", val, "; // " + ref);
    } else {
      this.code.emit(val, ";");
    }
  };
}

// Apply template to the instruction and emit value definition.
function define(template) {
  return defineAs(function (ref, op) { return this.formatInstruction(template, op); });
}

// Apply template to the instruction and emit trace exit using result as a condition.
function exitIf(template) {
  return function (ref, op) {
    var cond = this.formatInstruction(template, op);

    var ifcode = new Code;
    ifcode.emit("if (", cond, ") {");
    ifcode.append(this.generateExitStub(this.ir.envs[ref]));
    ifcode.emit("}");

    this.code.append(ifcode.reverse());
  };
}

//
// Helper object used to assemble source code.
//

function Code() {
  this.code = [];
}

Code.prototype = {
  emit: function () { this.code.push([].join.call(arguments, '')); },
  reverse: function () { this.code.reverse(); return this; },
  append: function (stub) {
    assert(stub instanceof Code);
    this.code = this.code.concat(stub.code);
  },
  toString: function () {
    var stack = ["  "];
    var indent = stack[0];
    for (var i = 0; i < this.code.length; i++) {
      var line = this.code[i];
      if (line[0] === "}") {
        stack.pop();
        indent = stack[stack.length - 1];
      }
      this.code[i] = indent + line;
      if (line[line.length - 1] === '{') {
        indent = indent + "  ";
        stack.push(indent);
      }
    }
    return this.code.join('\n');
  }
};

});

require.define("/points-interpreted.js",function(require,module,exports,__dirname,__filename,process,global){// Copyright 2012 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

"use strict";

var engine = require("./engine");

var program = (function (r, k) {
  return new engine.FunctionBuilder().function_begin()
  .function_begin()
    .loadconst(r(3), k(0))
    .label("loop")
    .loop(4)
    .load(r(4), r(0), k("n"))
    .lessthan(r(3), r(4))
    .jmp("exit")
    .move(r(4), r(1))
    .move(r(5), r(2))
    .load(r(6), r(0), r(3))
    .call(r(4), 2)
    .move(r(2), r(4))
    .add(r(3), r(3), k(1))
    .jmp("loop")
    .label("exit")
    .ret(r(2))
  .end()

  .function_begin()
    .load(r(2), r(0), k("x"))
    .load(r(3), r(1), k("x"))
    .mul(r(2), r(2), r(3))
    .load(r(3), r(0), k("y"))
    .load(r(4), r(1), k("y"))
    .mul(r(3), r(3), r(4))
    .add(r(2), r(2), r(3))
    .ret(r(2))
  .end()

  .function_begin()
    .newtable(r(2))
    .store(r(2), k("x"), r(0))
    .store(r(2), k("y"), r(1))
    .ret(r(2))
  .end()

  .function_begin()
    .newtable(r(1))
    .loadconst(r(2), k(-1))
    .loadconst(r(3), k(0))
    .label("loop")
    .loop(4)
    .lessthan(r(3), r(0))
    .jmp("exit")
    .mul(r(2), r(2), k(-1))
    .loadglobal(r(4), k("MakePoint"))
    .mul(r(5), r(2), r(3))
    .unm(r(6), r(3))
    .mul(r(6), r(2), r(6))
    .call(r(4), 2)
    .store(r(1), r(3), r(4))
    .add(r(3), r(3), k(1))
    .jmp("loop")
    .label("exit")
    .store(r(1), k("n"), r(0))
    .ret(r(1))
  .end()

  .function_begin()
    .function_begin()
      .loadglobal(r(2), k("dot"))
      .move(r(3), r(1))
      .move(r(4), r(1))
      .call(r(2), 2)
      .add(r(2), r(0), r(2))
      .ret(r(2))
    .end()

    .loadglobal(r(0), k("reduce"))
    .loadglobal(r(1), k("points"))
    .newclosure(r(2), 0)
    .loadconst(r(3), k(0))
    .call(r(0), 3)
    .ret()
  .end()

  .newclosure(r(0), 0)
  .storeglobal(k("reduce"), r(0))
  .newclosure(r(0), 1)
  .storeglobal(k("dot"), r(0))
  .newclosure(r(0), 2)
  .storeglobal(k("MakePoint"), r(0))
  .newclosure(r(0), 3)
  .storeglobal(k("MakeArrayOfPoints"), r(0))
  .storeglobal(k("N"), k(1000))
  .loadglobal(r(0), k("MakeArrayOfPoints"))
  .loadglobal(r(1), k("N"))
  .call(r(0), 1)
  .storeglobal(k("points"), r(0))
  .newclosure(r(0), 4)
  .ret(r(0))
.end();
})(engine.FunctionBuilder.r, engine.FunctionBuilder.k);

BENCHMARK_POINTS = function () {
  var interpreter = new engine.Interpreter();

  function test(cl, K) {
    for (var i = 0; i < K; i++) {
      var result = interpreter.evaluate(cl);
      var expected = 665667000;
      if (result !== expected) throw new Error("computation " + i + " failed: " + result + " != " + expected);
    }
    return result;
  }

  var cl = interpreter.evaluate(engine.runtime.NewClosure(program));
  test(cl, 10);  // warm up

  var start = Date.now();
  var result = test(cl, 2000);
  var end = Date.now();
  return (end - start);
};

});
require("/points-interpreted.js");
})();

function PublishSource(src) {
  $('<button type="button" class="btn"/>')
    .text('Trace ' + TraceID + ' (js)')
    .click(function () {
      MOE_CODEMIRROR.setValue(src);
    })
    .appendTo($("#moe-traces"));
}

function PublishTrace(ir) {
  TraceID++;

  var trace = ir.toString();
  $('<button type="button" class="btn"/>')
    .text('Trace ' + TraceID + ' (trace)')
    .click(function () {
      MOE_CODEMIRROR.setValue(trace);
    })
    .appendTo($("#moe-traces"));
}

function PublishIR(ir) {
  var ir = ir.toString();
  $('<button type="button" class="btn"/>')
    .text('Trace ' + TraceID + ' (ir)')
    .click(function () {
      MOE_CODEMIRROR.setValue(ir);
    })
    .appendTo($("#moe-traces"));
}

var BYTECODE = null;

(function() {
  var ed = document.getElementById("moe-bytecode");
  BYTECODE = ed.textContent;
  ed.textContent = "";
  var codemirror = MOE_CODEMIRROR = CodeMirror(ed, { value: BYTECODE });

  document.getElementById("moe-slide").onslideenter = function () {
    if (codemirror) codemirror.refresh();
  };

  $('<button type="button" class="btn btn-success"/>')
    .text('Run')
    .click(function () {
      TraceID = 0;
      $('#moe-traces').html('');
      var score = BENCHMARK_POINTS();
      var scoreBaseline = BENCHMARK_POINTS_BASELINE();
      $('#moe-score').text(score + ' vs ' + scoreBaseline + ' ms.');
    })
    .appendTo($("#moe-btns"));

  $('<span id="moe-traces"></span>').appendTo($("#moe-btns"));
})();

var BENCHMARK_POINTS_BASELINE = (function () {
  function reduce (a, f, x) {
    for (var i = 0; i < a.n; i++) x = f(x, a[i]);
    return x;
  }

  function dot (a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function MakePoint(x, y) {
    var point = {};
    point.x = x;
    point.y = y;
    return point;
  }

  function MakeArrayOfPoints(N) {
    var array = {};
    var m = -1;
    for (var i = 0; i < N; i++) {
      m = m * -1;
      array[i] = MakePoint(m * i, m * -i);
    }
    array.n = N;
    return array;
  }

  function Summator(sum, p) {
    return sum + dot(p, p);
  }

  function Program() {
    var N = 1000;
    var points = MakeArrayOfPoints(N);
    return function () { return reduce(points, Summator, 0) };
  }

  function test(cl, K) {
    for (var i = 0; i < K; i++) {
      var result = cl();
      if (result !== 665667000) throw new Error("computation failed: " + result);
    }
  }

  var cl = Program();

  return function () {
    test(cl, 10);  // warm up
    var start = Date.now();
    test(cl, 2000);
    var end = Date.now();
    return (end - start);
  };
})();