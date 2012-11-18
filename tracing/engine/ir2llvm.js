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

var engine = require('./');

var IR = require('./ir.js');
var OPCODE = IR.OPCODE, A = IR.A, B = IR.B;

var assert = require('assert');

try {
  var Meldo = require('meldo');
} catch (e) {
  exports.Compile = function (ir) { throw new Error("Meldo is not available"); };
  return;
}

//
// LLVM IR emitter.
//

exports.Compile = function (ir) {
  if (engine.FLAGS.nollvm) throw new Error("llvm backend disabled");

  var meldo = new Meldo;

  with (meldo) {
    var S = arg(0);

    var R = elements(property(S, 0));

    var G = property(S, 2);

    var pool = elements(arg(1));

    var $ = ir.translator({
      literal: meldo.literal.bind(meldo),
      constant: meldo.element.bind(meldo, pool),
      loop: function () {
        this.preheader = currentBlock();
        this.loopentry = meldo.block();
        branch(this.loopentry);
        setCurrentBlock(this.loopentry);
      },

      phi: function (a, b) {
        var type = ir.isNumber(a) ? meldo.double_ty : meldo.ptr_ty;
        var phi = meldo.phi(type, 2);
        phi.addIncoming($(a), this.preheader);
        return phi;
      },

      translate: function (ref, opcode, a, b) {
        return translate(ref, opcode, a, b);
      },

      backedge: function (phis) {
        phis.forEach(function (phi) {
          $(A(phi)).addIncoming($(B(phi)), currentBlock());
        });
        branch(this.loopentry);
      }
    });

    var FieldPtr = function (obj, idx) {
      return elementptr(elements(property(obj, 1)), idx);
    };

    var ElementPtr = function (obj, idx) {
      return elementptr(elements(property(obj, 2)), idx);
    };

    var exitIfNot = function (val, ref) {
      if_(not(val), function () {
        ir.envs[ref].frames[0].forEachRegister(function (reg, ref) {
          var value = $(ref);
          if (ir.isNumber(ref)) value = boxNumber(value);
          setelement(R, reg, value);
        });
        ret();  // Return undefined.
      });
    }

    var translate = function (ref, opcode, a, b) {
      switch (opcode) {
        case IR.REG:
          return element(R, IR.FROM_LITERAL(a));

        case IR.CHECKK:
          return exitIfNot(icmpeq(property($(a), 0), $(b)), ref);

        case IR.CHECKV:
          return exitIfNot(icmpeq($(a), $(b)), ref);

        case IR.CHECKN:
          return unboxNumber($(a));

        case IR.CHECKI32:
          return unboxInteger32($(a), function (success) { exitIfNot(success, ref); });

        case IR.PROPF:
          return FieldPtr($(a), IR.FROM_LITERAL(b));

        case IR.PROPI:
          return ElementPtr($(a), $(b));

        case IR.LOAD:
          return load($(a));

        case IR.LOADGLOBAL:
          return load(FieldPtr(G, IR.FROM_LITERAL(a)));

        case IR.MUL:
          return fmul($(a), $(b));

        case IR.ADD:
          return fadd($(a), $(b));

        case IR.LESSTHAN:
          return exitIfNot(fcmpolt($(a), $(b)), ref);

        case IR.CHECKFAST:
          return null;

        default:
          throw new Error("unsupported instruction");
      }
    }
  }

  $.translate();

  var jsfunc = meldo.meld();

  if (engine.FLAGS.print_ir) meldo.dump();

  return jsfunc;
};