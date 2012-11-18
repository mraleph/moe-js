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

module.exports = Tracer;

var engine = require('./');

var BC = require('./bytecode.js');
var A = BC.A, B = BC.B, C = BC.C, OPCODE = BC.OPCODE;

var Interpreter = require('./interpreter');

var bc2ir = require('./bc2ir.js');
var makeloop = require('./makeloop.js');

var ir2llvm = require('./ir2llvm.js');
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

    if (engine.FLAGS.print_ir) ir.print();
    makeloop.MakeLoop(ir);

    try {
      var jsfunc = ir2llvm.Compile(ir);
    } catch (e) {
      if (engine.FLAGS.print_ir) console.log("ir2llvm failed: " + e.stack);
      var jsfunc = ir2js.Compile(ir);
    }

    var compiled = { f: jsfunc, pool: ir.pool.arr };

    var trace_id = this.traces.length;
    this.traces.push(compiled);
    assert(BC.OPCODE(this.start_closure.code[this.start_pc]) === BC.LOOP);
    this.start_closure.code[this.start_pc] = BC.encodeOp(BC.JLOOP, trace_id);

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


