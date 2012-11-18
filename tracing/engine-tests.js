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

//
// Test for correct PHI insertion and resolution for loop carried dependence.
//

var engine = require("./engine");
var assert = require("assert");

var r = engine.FunctionBuilder.r;
var k = engine.FunctionBuilder.k;

// LOAD (B) will be forwarded to (A)
var func_bc = new engine.FunctionBuilder().function_begin()
.loadconst(r(1), k(0))
.loadconst(r(2), k(0))
.label("loop")
.loop(4)
.lessthan(r(1), k(100))
.jmp("exit")
.mul(r(4), r(1), k(2))
.load(r(4), r(0), r(4)) /* (A) */
.add(r(2), r(2), r(4))
.add(r(1), r(1), k(1))
.mul(r(4), r(1), k(2))
.load(r(4), r(0), r(4)) /* (B) */
.add(r(2), r(2), r(4))
.jmp("loop")
.label("exit")
.ret(r(2))
.end();

var obj = Runtime_NewTable();

for (var i = 0; i <= 200; i++) Runtime_Store(obj, i, i);

function func_js(obj) {
  var x = 0;
  for (var i = 0; i < 100;) {
    x += Runtime_Load(obj, i * 2);
    i++;
    x += Runtime_Load(obj, i * 2);
  }
  return x;
}

var result = new engine.Interpreter().evaluate(func_bc, [obj]);
var expected = func_js(obj);

assert(result === expected);

//
// Test cycle dependency between phies
//

var func_bc = new engine.FunctionBuilder().function_begin()
.loadconst(r(0), k(0))
.loadconst(r(1), k(1))
.loadconst(r(2), k(2))
.label("loop")
.loop(3)
.lessthan(r(0), k(100))
.jmp("exit")
.move(r(3), r(1))
.move(r(1), r(2))
.move(r(2), r(3))
.add(r(0), r(0), k(1))
.jmp("loop")
.label("exit")
.mul(r(2), r(2), k(4))
.add(r(1), r(1), r(2))
.ret(r(1))
.end();

var result = new engine.Interpreter().evaluate(func_bc);
var expected = (function () {
  var a = 1;
  var b = 2;
  for (var i = 0; i < 100; i++) {
    var t = a;
    a = b;
    b = t;
  }
  return a + (b * 4);
})();

assert(result === expected);
