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

//
// Inline Caches
//

// PatchIC currently relies on non-strict behavior.

function NAMED_LOAD_MISS(t, k, ic) {
  var v = Runtime_Load(t, k);
  if (t.klass.kind === "fast") {
    // Create a load stub that is specialized for a fixed class and key k and
    // loads property from a fixed offset.
    var stub = CompileNamedLoadFastProperty(t.klass, k);
    PatchIC("LOAD", ic, stub);
  }
  return v;
}

function NAMED_STORE_MISS(t, k, v, ic) {
  var klass_before = t.klass;
  Runtime_Store(t, k, v);
  var klass_after = t.klass;
  if (klass_before.kind === "fast" &&
      klass_after.kind === "fast") {
    // Create a store stub that is specialized for a fixed transition between classes
    // and a fixed key k that stores property into a fixed offset and replaces
    // object's hidden class if necessary.
    var stub = CompileNamedStoreFastProperty(klass_before, klass_after, k);
    PatchIC("STORE", ic, stub);
  }
}

function KEYED_LOAD_MISS(t, k, ic) {
  var v = Runtime_Load(t, k);
  if (t.klass.kind === "fast" && (typeof k === 'number' && (k | 0) === k)) {
    // Create a stub for the fast load from the elements array.
    // Does not actually depend on the class but could if we had more complicated
    // storage system.
    var stub = CompileKeyedLoadFastElement();
    PatchIC("KEYED_LOAD", ic, stub);
  }
  return v;
}

function KEYED_STORE_MISS(t, k, v, ic) {
  Runtime_Store(t, k, v);
  if (t.klass.kind === "fast" && (typeof k === 'number' && (k | 0) === k)) {
    // Create a stub for the fast store into the elements array.
    // Does not actually depend on the class but could if we had more complicated
    // storage system.
    var stub = CompileKeyedStoreFastElement();
    PatchIC("KEYED_STORE", ic, stub);
  }
}

function PatchIC(kind, id, stub) {
  this[kind + "$" + id] = stub;  // non-strict JS funkiness: this is global object.
}

function CompileNamedLoadFastProperty(klass, key) {
  // Key is known to be constant (named load). Specialize index.
  var index = klass.getIndex(key);

  function KeyedLoadFastProperty(t, k, ic) {
    if (t.klass !== klass) {
      // Expected klass does not match. Can't use cached index.
      // Fall through to the runtime system.
      return NAMED_LOAD_MISS(t, k, ic);
    }
    return t.properties[index];  // Veni. Vidi. Vici.
  }

  return KeyedLoadFastProperty;
}

function CompileNamedStoreFastProperty(klass_before, klass_after, key) {
  // Key is known to be constant (named load). Specialize index.
  var index = klass_after.getIndex(key);

  if (klass_before !== klass_after) {
    // Transition happens during the store.
    // Compile stub that updates hidden class.
    return function (t, k, v, ic) {
      if (t.klass !== klass_before) {
        // Expected klass does not match. Can't use cached index.
        // Fall through to the runtime system.
        return NAMED_STORE_MISS(t, k, v, ic);
      }
      t.properties[index] = v;  // Fast store.
      t.klass = klass_after;  // T-t-t-transition!
    }
  } else {
    // Write to an existing property. No transition.
    return function (t, k, v, ic) {
      if (t.klass !== klass_before) {
        // Expected klass does not match. Can't use cached index.
        // Fall through to the runtime system.
        return NAMED_STORE_MISS(t, k, v, ic);
      }
      t.properties[index] = v;  // Fast store.
    }
  }
}


function CompileKeyedLoadFastElement() {
  function KeyedLoadFastElement(t, k, ic) {
    if (t.klass.kind !== "fast" || !(typeof k === 'number' && (k | 0) === k)) {
      // If table is slow or key is not a number we can't use fast-path.
      // Fall through to the runtime system, it can handle everything.
      return KEYED_LOAD_MISS(t, k, ic);
    }
    return t.elements[k];
  }

  return KeyedLoadFastElement;
}

function CompileKeyedStoreFastElement() {
  function KeyedStoreFastElement(t, k, v, ic) {
    if (t.klass.kind !== "fast" || !(typeof k === 'number' && (k | 0) === k)) {
      // If table is slow or key is not a number we can't use fast-path.
      // Fall through to the runtime system, it can handle everything.
      return KEYED_STORE_MISS(t, k, v, ic);
    }
    t.elements[k] = v;
  }

  return KeyedStoreFastElement;
}
