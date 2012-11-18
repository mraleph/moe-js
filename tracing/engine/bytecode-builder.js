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
