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
test(cl, 10);  // warm up
var start = Date.now();
test(cl, 2000);
var end = Date.now();
console.log(end - start);
