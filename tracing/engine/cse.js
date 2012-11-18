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

var IR = require('./ir.js');
var A = IR.A, B = IR.B, OPCODE = IR.OPCODE;

var runtime = require('./runtime.js');

//
// This file contains straight forward CSE (Common Subexpressions Elimination)
// implementation.  Before any instruction is added to the IR it is passed
// through CSE that tries to find equivalent instruction in the already
// emitted part of the IR.
//
// Can perform the following:
//   - elimination of redundant CHECKN, CHECKK, CHECKFAST guards;
//   - elimination of redundant SETK;
//   - LOAD-to-LOAD forwarding
//

// Search for an instance of [op a, b] in the IR. Returns either
// an index of an equivalent instruction or IR.ELIMINATE if
// instruction can be eliminated entirely.
exports.do = function (ir, op, a, b) {
  var rule = CSE_RULES[op];
  if (typeof rule === 'function') {
    return rule(ir, a, b);
  }
};

function simplecse(ir, op) {
  return ir.checkchain(OPCODE(op), 0, function (ref, op1) {
    if (op === op1) return ref;
  });
}

function simpleelim(ir, op) {
  if (typeof simplecse(ir, op) === "number") return IR.ELIMINATE;
}

var CSE_RULES = [];

//
// CHECKN and CHECKI32 elimination
//

CSE_RULES[IR.CHECKN] = function (ir, val) {
  if (ir.isNumber(val)) return val;
  return simplecse(ir, IR.OP(IR.CHECKN, val));
};

CSE_RULES[IR.CHECKI32] = function (ir, val) {
  return simplecse(ir, IR.OP(IR.CHECKI32, val));
};

//
// CHECKK elimination
//

function nostores(ir, boundary) {
  function is_generic(ref, store) {
    if (OPCODE(ir[A(store)]) === IR.PROP) return true;
  }
  return !ir.checkchain(IR.STORE, boundary, is_generic);
}


CSE_RULES[IR.CHECKK] = function (ir, obj, klass) {
  // If obj is a result of a NEWTABLE invocation and there are no intervening
  // stores then check against ROOT_KLASS can be eliminated.
  if (ir.getconst(klass) === runtime.ROOT_KLASS &&
      OPCODE(ir[obj]) === IR.NEWTABLE &&
      nostores(ir, obj)) {
    return IR.ELIMINATE;
  }

  // Search all SETK upwards and see if there is a matching one that
  // sets hidden class of obj to klass.
  // We assume that any SETK can alias any SETK so if we encounter
  // non matching one we terminate the search.
  function match_setk(ref, setk) {
    return A(setk) === obj && B(setk) === klass && nostores(ir, ref);
  }

  if (ir.checkchain(IR.SETK, obj, match_setk)) return IR.ELIMINATE;

  // Search all CHECKK upwards and see if there is a matching one
  // that ensures that hidden class of obj is klass.
  function match_checkk(ref, checkk) {
    if (A(checkk) === obj) {
      if (B(checkk) === klass && nostores(ir, ref)) {
        return true;
      } else {
        return false;  // There is an intervening store or check. No need to search further.
      }
    }

  }

  if (ir.checkchain(IR.CHECKK, obj, match_checkk)) return IR.ELIMINATE;
};

//
// CHECKFAST elimination
//

CSE_RULES[IR.CHECKFAST] = function (ir, obj) {
  function match_checkfast(ref, checkfast) {
    if (A(checkfast) === obj) {
      return nostores(ir, ref);
    }
  }

  if (ir.checkchain(IR.CHECKFAST, obj, match_checkfast)) return IR.ELIMINATE;
};

//
// SETK elimination
//

CSE_RULES[IR.SETK] = function (ir, obj, klass) {
  // Check the last SETK. If it modifies the same object and
  // does not have any intervening stores or guards then update it
  // to set new hidden class directly.
  // Previous hidden class could not be observed (there was no guards).
  function match_setk(ref, setk) {
    if (A(setk) === obj && nostores(ir, ref) && (ir.lastguard <= ref)) {
      ir[ref] = IR.OP(IR.SETK, obj, klass);
      return true;
    } else {
      // For simplicity we assume that any SETK can alias any setk.
      return false;
    }
  }

  if (ir.checkchain(IR.SETK, obj, match_setk)) return IR.ELIMINATE;
};


//
// LOAD-to-LOAD forwarding.
//

function canalias(p1, p2) {
  var op1 = OPCODE(p1);
  var op2 = OPCODE(p2);

  assert(op1 === IR.PROP || op1 === IR.PROPI || op1 === IR.PROPF);
  assert(op2 === IR.PROP || op2 === IR.PROPI || op2 === IR.PROPF);

  // Assume PROP aliases everything.
  if (op1 === IR.PROP || op2 === IR.PROP) return true;

  // PROPF can't alias PROPI.
  if (op1 !== op2) return false;

  return !IR.IS_CONSTANT(B(p1)) || !IR.IS_CONSTANT(B(p2)) || (B(p1) === B(p2));
}

function nostoresto(ir, boundary, prop) {
  function is_store_to(ref, store) {
    if (canalias(ir[A(store)], ir[prop])) return true;
  }

  return !ir.checkchain(IR.STORE, boundary, is_store_to);
}

CSE_RULES[IR.LOAD] = function (ir, prop) {
  // Can't forward generic loads.
  if (OPCODE(ir[prop]) === IR.PROP) return;

  function match_load(ref, load) {
    if (A(load) === prop) {
      if (nostoresto(ir, ref, ir[prop])) {
        return ref;
      } else {
        return null;
      }
    }
  }

  return ir.checkchain(IR.LOAD, A(prop), match_load);
};

//
// LOADGLOBAL-to-LOADGLOBAL forwarding.
//

CSE_RULES[IR.LOADGLOBAL] = function (ir, name) {
  // We assume that global loads can only be aliased by global stores.
  // But there is no STOREGLOBAL in our IR so there is nothing to check :-)
  return simplecse(ir, IR.OP(IR.LOADGLOBAL, name));
};

//
// Other.
//

CSE_RULES[IR.PROPF] = function (ir, obj, fieldidx) {
  return simplecse(ir, IR.OP(IR.PROPF, obj, fieldidx));
};

CSE_RULES[IR.PROPI] = function (ir, obj, key) {
  return simplecse(ir, IR.OP(IR.PROPI, obj, key));
};

CSE_RULES[IR.MUL] = function (ir, a, b) {
  return simplecse(ir, IR.OP(IR.MUL, a, b));
};

CSE_RULES[IR.ADD] = function (ir, a, b) {
  return simplecse(ir, IR.OP(IR.ADD, a, b));
};
