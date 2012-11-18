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
console.log(end - start);
console.log(result);
