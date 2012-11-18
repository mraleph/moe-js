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
    // var start = Date.now();
    trace.f(S, trace.pool);
    // var end = Date.now();
    // console.log("trace #%d took %d ms.", A(op), (end - start));
  };
}