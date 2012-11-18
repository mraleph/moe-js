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
