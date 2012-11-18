// Copyright 2012 Google Inc. All Rights Reserved.
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
  if (engine.FLAGS.print_ir) console.log(jsfunc.toString());
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
    return 'var ' + varnames.join(', ') + ';\n';
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
  toString: function () { return this.code.join('\n'); }
};
