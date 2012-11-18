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

  slice: function (start, end) {
    var result = [];
    for (var i = start; i < end; i++) {
      result.push(this[i]);
    }
    return result;
  },

  translator: function (cb) {
    var ir = this;
    var values = [];

    function $(ref) {
      if (IR.IS_CONSTANT(ref)) {
        var val = ir.getconst(ref);
        if (typeof val === "number") {
          return cb.literal(val);
        } else {
          return cb.constant(ref - IR.CONSTANT_BIAS);
        }
      } else {
        assert(ref in values);
        return values[ref];
      }
    }

    $.translate = function () {
      for (var ref = 0; ref < ir.loopentry; ref++) {
        var op = ir[ref];
        values[ref] = cb.translate(ref, IR.OPCODE(op), IR.A(op), IR.B(op));
      }

      cb.loop();

      ir.slice(ir.phies, ir.length).map(function (phi) {
        values[IR.A(phi)] = cb.phi(IR.A(phi), IR.B(phi));
      });

      for (var ref = ir.loopentry + 1; ref < ir.phies; ref++) {
        var op = ir[ref];
        values[ref] = cb.translate(ref, IR.OPCODE(op), IR.A(op), IR.B(op));
      }

      cb.backedge(ir.slice(ir.phies, ir.length));
    };

    return $;
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
  if (IR.IS_CONSTANT(ref)) return "#" + this.data.pool.arr[ref - IR.CONSTANT_BIAS];
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
