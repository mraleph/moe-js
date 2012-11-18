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

// Helper function to define bytecodes.
exports.bytecode = function bytecode(ops) {
  var OPCODES = {};
  OPCODES.names = [];

  OPCODES.Disassembler = function (data) {
    this.data = data;
    this.DISPATCH = OPCODES.Disassembler.DISPATCH;
  };

  OPCODES.Disassembler.DISPATCH = [];

  OPCODES.Disassembler.prototype.disassemble = function (code) {
    var result = [];
    this.pc = 0;
    this.code = code;
    while (this.pc < this.code.length) {
      var prefix = this.prefix();
      var suffix = this.suffix();
      if (typeof suffix === "string") suffix = " ; " + suffix; else suffix = "";
      var op = this.code[this.pc++];
      result.push(prefix + this.DISPATCH[this.opcode(op)].call(this, op) + suffix);
    }
    var epilogue = this.epilogue();
    if (typeof epilogue === "string") result.push("    ; " + epilogue);
    return result;
  };

  OPCODES.disassemble = function (seq, data) {
    var d = new OPCODES.Disassembler(data);
    return d.disassemble(seq);
  };

  OPCODES.print = function (seq, data) {
    console.log('-----------------------');
    console.log(this.disassemble(seq, data).join('\n'));
  };

  function mkOpcode(id, fmt) {
    var m = fmt.match(/^(\w+)(.*)$/);
    var name = m[1];
    var operands = m[2];

    OPCODES[name] = id;
    OPCODES.names.push(name);

    OPCODES.Disassembler.DISPATCH[id] = function (op) {
      var self = this;
      var result = name + operands.replace(/(\w+)/g, function (operand) { return self.operand(op, operand); });
      if (name in this) this[name](op);
      return result;
    };
  }

  for (var i = 0; i < ops.length; i++) {
    mkOpcode(i, ops[i]);
  }

  return OPCODES;
}

// Quick check for int32 values.
exports.IsInt32 = function (x) {
  return (x|0) === x;
};
