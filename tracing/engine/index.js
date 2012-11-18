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

var FLAGS = exports.FLAGS = { print_ir: false, print_trace: false, notracing: false, nollvm: false };

process.argv.slice(2).forEach(function (flag) {
  var flag = flag.replace(/^\-\-/, "").replace(/\-/g, "_");
  if (flag in FLAGS) FLAGS[flag] = true;
});

exports.FunctionBuilder = require('./bytecode-builder.js').FunctionBuilder;
exports.Interpreter     = require('./interpreter.js');
exports.runtime         = require('./runtime.js');