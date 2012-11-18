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

var engine = require('./');

var IR = require('./ir.js');

// Emit recorded IR once more eliminating any redundancies on the go and
// record substitution table. The second copy will become a loop body.
// The recorded IR itself becomes peeled iteration of the loop. It will
// contain all invariants that CSE managed to eliminate from the loop.
// Loop phis are computed and emitted after the loop body.
exports.MakeLoop = function MakeLoop(ir) {
  var loopentry = ir.loopentry = ir.length;
  var loopentry_frame = ir.envs[loopentry].frames[0];

  // Substitution table for SSA values: maps values to their copies inside
  // the loop body. If value is a loop invariant then subst[ref] === ref.
  var subst = new Array(ir.length * 2);

  // List of values that (potentially) need phis.
  // Any value that flows into loop's body from the peeled first iteration might
  // have a different value on the back edge which can be determined only after
  // the copying is complete. This is why PHIs are emitted at the very end.
  var phis  = [];
  phis.contains = [];  // contains[ref] is true iff value is in the phis list.

  function emitphi(ref) {
    if (!phis.contains[ref]) {
      phis.contains[ref] = true;
      phis.push(ref);
    }
  }

  // Start replicating IR. Mark loop entry with LOOP.
  ir.emit(IR.LOOP);
  for (var ref = 0; ref < loopentry; ref++) {
    var op = ir[ref];

    var opcode = IR.OPCODE(op);

    // IR.REG is rewritten to the computed value of the register
    // kept in ir.R.
    if (opcode === IR.REG) {
      var newref = ir.R[IR.FROM_LITERAL(IR.A(op))];
      emitphi(newref);  // Potential loop carried dependency might require a PHI.
      subst[ref] = newref;
      continue;
    }

    // Substitute operands.
    var va = IR.A(op);
    var new_va = IR.IS_CONSTANT(va) ? va : subst[va];
    var vb = IR.B(op);
    var new_vb = IR.IS_CONSTANT(vb) ? vb : subst[vb];

    if (INVARIANT[opcode] && (new_va == va) && (new_vb == vb)) {
      subst[ref] = ref;  // Invariant instruction.
    } else {
      var newref = ir.emit(opcode, new_va, new_vb);

      if ((newref < loopentry) && (newref !== ref) && (newref !== IR.ELIMINATE)) {
        // Potential loop carried dependency might require a PHI.
        emitphi(newref);
      } else if (typeof ir.envs[ref] !== "undefined") {
        // If instruction had a deoptimization environment substitute values in it
        // and attach it to the resulting instruction.
        ir.envs[newref] = SubstituteEnvironment(ir.envs[ref], subst, loopentry_frame);
      }

      subst[ref] = newref;
    }
  }

  EmitPhis(ir, phis, subst);

  ir.envs[ir.length] = SubstituteEnvironment(ir.envs[loopentry], subst, loopentry_frame);

  if (engine.FLAGS.print_ir) IR.print(ir, ir);
}

//
// PHIs computation
//
//   While IR was being copied all values that are potentially carried on the backedge
//   were collected in the phis array. This pass computes an actual set of phis that
//   need to be emitted. Phis that are redundant (not used or have the same left and
//   right operands) are eliminated.
//

function EmitPhis(ir, phis, subst) {
  var isredundant = [];

  // Initially assume that all phis are redundant.
  for (var i = 0; i < phis.length; i++) isredundant[phis[i]] = true;

  // Tentatively mark used phis as non-redundant.
  for (var ref = ir.length - 1; ref > ir.loopentry; ref--) {
    // Process operands.
    var op = ir[ref]
    if (!IR.IS_CONSTANT(IR.A(op))) isredundant[IR.A(op)] = false;
    if (!IR.IS_CONSTANT(IR.B(op))) isredundant[IR.B(op)] = false;

    // Process attached environment.
    if (typeof ir.envs[ref] !== 'undefined') {
      ir.envs[ref].frames.forEach(function (frame) {
        for (var i = 0; i <= frame.maxr; i++) {
          var valref = frame[i];
          if (typeof valref !== "undefined" && !IR.IS_CONSTANT(valref)) {
            isredundant[valref] = false;
          }
        }
      });
    }
  }

  // Process non-redundant phis until fix point is reached.
  do {
    var foundmore = false;
    for (var i = 0; i < phis.length; i++) {
      var lref = phis[i];
      if (!isredundant[lref]) {
        var rref = subst[lref];
        if (rref === lref) {
          // Values are the same on the entry to the loop
          // and on the back edge. PHI is not needed.
          isredundant[lref] = true;
        } else if (phis.contains[rref] && isredundant[rref]) {
          // If rref itself requires a phi mark it non-redundant.
          isredundant[rref] = false;
          foundmore = true;  // Might need another pass.
        }
      }
    }
  } while (foundmore);

  // Emit non-redundant phis.
  ir.phies = ir.length;
  for (var i = 0; i < phis.length; i++) {
    var lref = phis[i];
    if (!isredundant[lref]) {
      var rref = subst[lref];
      ir.emit(IR.PHI, lref, rref);
    }
  }
}


// Helper function that substitutes values in the given deoptimization
// environment with their copies.
function SubstituteEnvironment(env, subst, loopentry_frame) {
  var newenv = new IR.Environment;

  env.frames.forEach(function (frame, depth) {
    var newframe = newenv.newFrame(frame.maxr, frame.closure, frame.pc, frame.rr);
    for (var i = 0; i <= frame.maxr; i++) {
      var ref = frame[i];
      if (typeof ref !== "undefined") {
        newframe[i] = subst[ref];
      } else if (depth === 0) {
        newframe[i] = loopentry_frame[i];
      }
    }
  });

  return newenv;
}


//
// Invariant instructions.
//

var INVARIANT = new Array(IR.names.length);
for (var i = 0; i < INVARIANT.length; i++) INVARIANT[i] = false;
INVARIANT[IR.MUL] = true;
INVARIANT[IR.ADD] = true;
INVARIANT[IR.UNM] = true;
INVARIANT[IR.CHECKV] = true;
INVARIANT[IR.CHECKN] = true;
INVARIANT[IR.PROPF] = true;
