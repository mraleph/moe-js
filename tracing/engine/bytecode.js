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

//
// Bytecode
//

function encodeOp(op, a, b, c) {
  a = a & 0xFF;
  b = b & 0xFF;
  c = c & 0xFF;
  return (b << 24) | (c << 16) | (a << 8) | op;
}

function OPCODE(op) { return op & 0xFF; }
function A(op) { return (op >> 8) & 0xFF; }
function B(op) { return (op >> 24) & 0xFF; }
function C(op) { return (op >> 16) & 0xFF; }

var BC = module.exports = utils.bytecode([
  "MOVE RA, RB",
  "LOADCONST RA, KB",
  "LOAD RA, RB, RKC",
  "STORE RA, RKB, RKC",
  "LOADGLOBAL RA, RKB",
  "STOREGLOBAL RKA, RKB",
  "LESSTHAN RKA, RKB",
  "JMP SD",
  "ADD RA, RKB, RKC",
  "MUL RA, RKB, RKC",
  "UNM RA, RB",
  "NEWCLOSURE",
  "NEWTABLE",
  "CALL RA, B",
  "RET RA",
  "LOOP A",
  "JLOOP A"
]);

BC.Disassembler.prototype.prefix = function () { return this.pc + ": "; };

BC.Disassembler.prototype.epilogue = BC.Disassembler.prototype.suffix = function () { };

BC.Disassembler.prototype.formatR = function (r) { return "r" + r; };

BC.Disassembler.prototype.formatK = function (k) { return "#" + this.data.closure.pool[k]; };

BC.Disassembler.prototype.formatRK = function fmtRK(rk) {
  return (rk >= BC.CONSTANT_BIAS) ? this.formatK(rk - BC.CONSTANT_BIAS) : this.formatR(rk);
};

BC.Disassembler.prototype.opcode = function (op) { return OPCODE(op); };

BC.Disassembler.prototype.operand = function (op, operand) {
  switch (operand) {
    case "A": return A(op).toString();
    case "B": return B(op).toString();
    case "C": return C(op).toString();
    case "RA": return this.formatR(A(op));
    case "RB": return this.formatR(B(op));
    case "RC": return this.formatR(C(op));
    case "KB": return this.formatK(B(op));
    case "RKA": return this.formatRK(A(op));
    case "RKB": return this.formatRK(B(op));
    case "RKC": return this.formatRK(C(op));
    case "SD": return (op >> 8).toString();
    default: return operand;
  }
};

BC.Disassembler.prototype.LOOP = function () { this.pc++; };
BC.Disassembler.prototype.JLOOP = function () { this.pc++; };

BC.CONSTANT_BIAS = 0x80;

BC.IS_CONSTANT = function (ref) {
  return ref >= BC.CONSTANT_BIAS;
};

BC.encodeOp = encodeOp;
BC.OPCODE = OPCODE;
BC.A = A;
BC.B = B;
BC.C = C;
