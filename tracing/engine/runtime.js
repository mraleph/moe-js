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

var utils = require('./utils.js');

exports.NewClosure = NewClosure;
exports.CheckTable = CheckTable;
exports.NewTable = NewTable;
exports.Load = Load;
exports.Store = Store;
exports.CheckNumber = CheckNumber;
exports.LessThan = LessThan;
exports.Add = Add;
exports.Mul = Mul;
exports.Unm = Unm;

//
// Hidden classes infrastructure used by the interpreter and
// compiled code plus some utility methods.
//

var Transition = exports.Transition = function Transition(klass) {
  this.klass = klass;
};

var Property = exports.Property = function Property(index) {
  this.index = index;
};

function Klass(kind) {
  this.kind = kind;
  this.descriptors = new Map;
  this.keys = [];
}

Klass.prototype = {
  // Create hidden class with a new property that does not exist on
  // the current hidden class.
  addProperty: function (key) {
    var klass = this.clone();
    klass.append(key);
    // Connect hidden classes with transition to enable sharing.
    this.descriptors.set(key, new Transition(klass));
    return klass;
  },

  hasProperty: function (key) {
    return this.descriptors.has(key);
  },

  getDescriptor: function (key) {
    return this.descriptors.get(key);
  },

  getIndex: function (key) {
    return this.getDescriptor(key).index;
  },

  // Create clone of this hidden class that has same properties
  // at same offsets (but does not have any transitions).
  clone: function () {
    var klass = new Klass(this.kind);
    klass.keys = this.keys.slice(0);
    for (var i = 0; i < this.keys.length; i++) {
      var key = this.keys[i];
      klass.descriptors.set(key, this.descriptors.get(key));
    }
    return klass;
  },

  // Add real property to descriptors.
  append: function (key) {
    this.keys.push(key);
    this.descriptors.set(key, new Property(this.keys.length - 1));
  },

  toString: function () {
    if (this.kind === "slow") return "klass { slow }";
    return "klass { " + this.keys.map(function (name) {
      var desc = this.descriptors.get(name);
      if (desc instanceof Property) return name;
      if (desc instanceof Transition) return name + " (transition)";
    }, this).join(", ") + " }"
  }
};

var ROOT_KLASS = exports.ROOT_KLASS = new Klass("fast");

function Table() {
  // All tables start from the fast empty root hidden class.
  this.klass = ROOT_KLASS;
  this.properties = [];  // Array of named properties: 'x','y',...
  this.elements = [];  // Array of indexed properties: 0, 1,
}

Table.prototype = {
  load: function (key) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      return this.properties.get(key);
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && utils.IsInt32(key)) {  // Indexed property.
      return this.elements[key];
    } else if (typeof key === "string") {  // Named property.
      var idx = this.findPropertyForRead(key);
      return (idx >= 0) ? this.properties[idx] : void 0;
    }

    // There can be only string&number keys on fast table.
    return void 0;
  },

  store: function (key, value) {
    if (this.klass.kind === "slow") {
      // Slow class => properties are represented as Map.
      this.properties.set(key, value);
      return;
    }

    // This is fast table with indexed and named properties only.
    if (typeof key === "number" && utils.IsInt32(key)) {  // Indexed property.
      this.elements[key] = value;
      return;
    } else if (typeof key === "string") {  // Named property.
      var index = this.findPropertyForWrite(key);
      if (index >= 0) {
        this.properties[index] = value;
        return;
      }
    }

    this.convertToSlow();
    this.store(key, value);
  },

  // Find property or add one if possible, returns property index
  // or -1 if we have too many properties and should switch to slow.
  findPropertyForWrite: function (key) {
    if (!this.klass.hasProperty(key)) {  // Try adding property if it does not exist.
      // To many properties! Achtung! Fast case kaput.
      if (this.klass.keys.length > 20) return -1;

      // Switch class to the one that has this property.
      this.klass = this.klass.addProperty(key);
      return this.klass.getIndex(key);
    }

    var desc = this.klass.getDescriptor(key);
    if (desc instanceof Transition) {
      // Property does not exist yet but we have a transition to the class that has it.
      this.klass = desc.klass;
      return this.klass.getIndex(key);
    }

    // Get index of existing property.
    return desc.index;
  },

  // Find property index if property exists, return -1 otherwise.
  findPropertyForRead: function (key) {
    if (!this.klass.hasProperty(key)) return -1;
    var desc = this.klass.getDescriptor(key);
    if (!(desc instanceof Property)) return -1;  // Here we are not interested in transitions.
    return desc.index;
  },

  // Copy all properties into the Map and switch to slow class.
  convertToSlow: function () {
    var map = new Map;
    for (var i = 0; i < this.klass.keys.length; i++) {
      var key = this.klass.keys[i];
      var val = this.properties[i];
      map.set(key, val);
    }

    Object.keys(this.elements).forEach(function (key) {
      var val = this.elements[key];
      map.set(key | 0, val);  // Funky JS, force key back to int32.
    }, this);

    this.properties = map;
    this.elements = null;
    this.klass = new Klass("slow");
  }
};

function NewClosure(f) {
  return f;
}

function CheckTable(t) {
  if (!(t instanceof Table)) throw new Error("table expected");
}

function NewTable() {
  return new Table();
}

function Load(t, k) {
  CheckTable(t);
  return t.load(k);
}

function Store(t, k, v) {
  CheckTable(t);
  t.store(k, v);
}

function CheckNumber(x) {
  if (typeof x !== 'number') throw new Error("number expected");
}

function LessThan(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x < y;
}

function Add(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x + y;
}

function Mul(x, y) {
  CheckNumber(x);
  CheckNumber(y);
  return x * y;
}

function Unm(x) {
  CheckNumber(x);
  return -x;
}

global.Runtime_CheckNumber = CheckNumber;
global.Runtime_Load = Load;
global.Runtime_Store = Store;
global.Runtime_NewTable = NewTable;
