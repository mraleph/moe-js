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

// Live heap inspection code through typed array views.
(function () {
  // Currently all pages in V8 are 1mb in size. See spaces.h for more details.
  var kPageSize = 1 << 20;
  var kPageMask = ~(kPageSize - 1);

  function $PageAddress(addr) { return (addr & kPageMask) >>> 0; }
  function $PageOffset(addr) { return (addr & ~kPageMask); }

  var IS_SHIM = false;
  if (typeof $Page !== 'function') {
    IS_SHIM = true;
    $.get('pages.json', function (data) {
      function decompress(input) {
        var result = new Uint8Array(kPageSize);

        function write(i, v) {
          result[(i << 2) + 0] = (v >>  0) & 0xFF;
          result[(i << 2) + 1] = (v >>  8) & 0xFF;
          result[(i << 2) + 2] = (v >> 16) & 0xFF;
          result[(i << 2) + 3] = (v >> 24) & 0xFF;
        }

        var i = 0;
        while (i < input.length) {
          var offs = input[i++];
          var len  = input[i++];
          while (len-- > 0) write(offs++, input[i++]);
        }
        return result;
      }

      Object.keys(data).forEach(function (key) {
        data[key] = decompress(data[key]);
      });

      $Page = function (addr) {
        return data[$PageAddress(addr)];
      };

      $Heap = function () {
        return {code_space: [data['1310720000']]};
      };

      setTimeout(initialize, 1000);
    }, 'json');
  } else {
    setTimeout(initialize, 1000);
  }

  var i32 = {
    size: 4,
    read: function (data, offset) {
      return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24));
    }
  };

  var smi = {
    size: 4,
    read: function (data, offset) {
      return i32.read(data, offset) >> 1;
    }
  }

  var u8 = {
    size: 1,
    read: function (data, offset) {
      return data[offset];
    }
  }

  var addr = {
    size: 4,
    read: function (data, offset) {
      return i32.read(data, offset) >>> 0;
    }
  };
  var u32 = addr;

  function Binary(parent, desc) {
    if (typeof desc === "undefined") {
      desc = parent;
      parent = null;
    }

    function ctor(data, offset) {
      if (!(this instanceof ctor)) return new ctor(data, offset);

      offset = offset | 0;
      if (typeof data === "number") {
        offset += $PageOffset(data);
        data = $Page(data);
      } else if ("data" in data) {
        offset += data.offset;
        data = data.data;
      }
      this.data = data;
      this.offset = (offset | 0);
    }

    if (parent !== null) {
      ctor.prototype = Object.create(parent.prototype);
    }

    var offset = (parent !== null) ? parent.size : 0;
    Object.keys(desc).forEach(function (key) {
      var type = desc[key];

      Object.defineProperty(ctor.prototype, key, {
        get: (function (offset) {
          return function () {
            return type.read(this.data, this.offset + offset);
          };
        })(offset)
      })

      offset += type.size;
    });
    ctor.size = offset;

    return ctor;
  }

  var global = (function () { return this; })();

  function tptr(t) {
    return {
      size: 4,
      read: function (data, offset) {
        var ptr = addr.read(data, offset) - 1;
        return (typeof t === "function") ? t(ptr) : global[t](ptr);
      }
    }
  }

  var Page = Binary({
    next_chunk: addr,
    prev_chunk: addr,
    size: u32,
    flags: i32,
    area_start: addr,
    area_end: addr
  });

  var HeapObject = Binary({
    map: tptr(function(ptr) { return Map(ptr); })
  });

  HeapObject.prototype.Size = function () {
    var type = this.map.instance_type;
    switch (type) {
      case INSTANCE_TYPES.CODE_TYPE:
        return 64 /* Code::kHeaderSize */ + ((Code(this).instruction_size + 31) & ~31);
      case INSTANCE_TYPES.FREE_SPACE_TYPE:
        return FreeSpace(this).size;

      default:
        throw new Error("unknown instance type: " + type + " (" + INSTANCE_TYPES[type] + ")");
    }
  };

  var Code = Binary(HeapObject, {
    instruction_size: i32,
    reloc_info: tptr(HeapObject),
    handlers: tptr(HeapObject),
    deopt_data: tptr(HeapObject),
    type_feedback_info: tptr(HeapObject),
    gc_metadata: tptr(HeapObject),
    ic_age: i32,
    flags: i32,
    kind_flags1: u32,
    kind_flags2: u32
  });

  function BitField(bit, width) {
    var mask = (1 << width) - 1;
    return {
      decode: function (i) {
        return (i >> bit) & mask;
      }
    }
  }

  var CodeKind = [
    "FUNCTION",
    "OPTIMIZED_FUNCTION",
    "STUB",
    "BUILTIN",
    "LOAD_IC",
    "KEYED_LOAD_IC",
    "CALL_IC",
    "KEYED_CALL_IC",
    "STORE_IC",
    "KEYED_STORE_IC",
    "UNARY_OP_IC",
    "BINARY_OP_IC",
    "COMPARE_IC",
    "TO_BOOLEAN_IC"
  ];

  var CodeStubs = [
    "CallFunction",
    "CallConstruct",
    "UnaryOp",
    "BinaryOp",
    "StringAdd",
    "SubString",
    "StringCompare",
    "Compare",
    "CompareIC",
    "MathPow",
    "RecordWrite",
    "StoreBufferOverflow",
    "RegExpExec",
    "TranscendentalCache",
    "Instanceof",
    "ConvertToDouble",
    "WriteInt32ToHeapNumber",
    "StackCheck",
    "Interrupt",
    "FastNewClosure",
    "FastNewContext",
    "FastNewBlockContext",
    "FastCloneShallowArray",
    "FastCloneShallowObject",
    "ToBoolean",
    "ToNumber",
    "ArgumentsAccess",
    "RegExpConstructResult",
    "NumberToString",
    "CEntry",
    "JSEntry",
    "KeyedLoadElement",
    "KeyedStoreElement",
    "DebuggerStatement",
    "StringDictionaryLookup",
    "ElementsTransitionAndStore",
    "StoreArrayLiteralElement",
    "ProfileEntryHook"
  ];

  Object.keys(CodeKind).forEach(function (key) { CodeKind[CodeKind[key]] = +key; })

  var KindField = BitField(7, 4);
  var MajorKeyField = BitField(0, 6);

  Code.prototype.kind = function () {
    return KindField.decode(this.flags);
  };

  Code.prototype.major_key = function () {
    return MajorKeyField.decode(this.kind_flags2);
  };

  Code.prototype.ShortName = function () {
    if (this.kind() === CodeKind.STUB) {
      return CodeStubs[this.major_key()] || "STUB";

    }
    return CodeKind[this.kind()]
  };

  Code.prototype.instructions = function () {
    var offs = this.offset + 64;
    var sz = this.instruction_size;
    var ins = new Uint8Array(sz);
    for (var i = 0; i < sz; i++) ins[i] = this.data[offs + i];
    return ins;
  };

  var FreeSpace = Binary(HeapObject, {
    size: smi
  })

  var INSTANCE_TYPES = {
    "64": "SYMBOL_TYPE",
    "68": "ASCII_SYMBOL_TYPE",
    "65": "CONS_SYMBOL_TYPE",
    "69": "CONS_ASCII_SYMBOL_TYPE",
    "66": "EXTERNAL_SYMBOL_TYPE",
    "74": "EXTERNAL_SYMBOL_WITH_ASCII_DATA_TYPE",
    "70": "EXTERNAL_ASCII_SYMBOL_TYPE",
    "82": "SHORT_EXTERNAL_SYMBOL_TYPE",
    "90": "SHORT_EXTERNAL_SYMBOL_WITH_ASCII_DATA_TYPE",
    "86": "SHORT_EXTERNAL_ASCII_SYMBOL_TYPE",
    "0": "STRING_TYPE",
    "4": "ASCII_STRING_TYPE",
    "1": "CONS_STRING_TYPE",
    "5": "CONS_ASCII_STRING_TYPE",
    "3": "SLICED_STRING_TYPE",
    "2": "EXTERNAL_STRING_TYPE",
    "10": "EXTERNAL_STRING_WITH_ASCII_DATA_TYPE",
    "6": "EXTERNAL_ASCII_STRING_TYPE",
    "18": "SHORT_EXTERNAL_STRING_TYPE",
    "26": "SHORT_EXTERNAL_STRING_WITH_ASCII_DATA_TYPE",
    "22": "SHORT_EXTERNAL_ASCII_STRING_TYPE",
    "6": "PRIVATE_EXTERNAL_ASCII_STRING_TYPE",
    "128": "MAP_TYPE",
    "129": "CODE_TYPE",
    "130": "ODDBALL_TYPE",
    "131": "JS_GLOBAL_PROPERTY_CELL_TYPE",
    "132": "HEAP_NUMBER_TYPE",
    "133": "FOREIGN_TYPE",
    "134": "BYTE_ARRAY_TYPE",
    "135": "FREE_SPACE_TYPE",
    "136": "EXTERNAL_BYTE_ARRAY_TYPE",
    "137": "EXTERNAL_UNSIGNED_BYTE_ARRAY_TYPE",
    "138": "EXTERNAL_SHORT_ARRAY_TYPE",
    "139": "EXTERNAL_UNSIGNED_SHORT_ARRAY_TYPE",
    "140": "EXTERNAL_INT_ARRAY_TYPE",
    "141": "EXTERNAL_UNSIGNED_INT_ARRAY_TYPE",
    "142": "EXTERNAL_FLOAT_ARRAY_TYPE",
    "144": "EXTERNAL_PIXEL_ARRAY_TYPE",
    "146": "FILLER_TYPE",
    "147": "ACCESSOR_INFO_TYPE",
    "148": "ACCESSOR_PAIR_TYPE",
    "149": "ACCESS_CHECK_INFO_TYPE",
    "150": "INTERCEPTOR_INFO_TYPE",
    "151": "CALL_HANDLER_INFO_TYPE",
    "152": "FUNCTION_TEMPLATE_INFO_TYPE",
    "153": "OBJECT_TEMPLATE_INFO_TYPE",
    "154": "SIGNATURE_INFO_TYPE",
    "155": "TYPE_SWITCH_INFO_TYPE",
    "156": "SCRIPT_TYPE",
    "157": "CODE_CACHE_TYPE",
    "158": "POLYMORPHIC_CODE_CACHE_TYPE",
    "159": "TYPE_FEEDBACK_INFO_TYPE",
    "160": "ALIASED_ARGUMENTS_ENTRY_TYPE",
    "163": "FIXED_ARRAY_TYPE",
    "145": "FIXED_DOUBLE_ARRAY_TYPE",
    "164": "SHARED_FUNCTION_INFO_TYPE",
    "165": "JS_MESSAGE_OBJECT_TYPE",
    "168": "JS_VALUE_TYPE",
    "169": "JS_DATE_TYPE",
    "170": "JS_OBJECT_TYPE",
    "171": "JS_CONTEXT_EXTENSION_OBJECT_TYPE",
    "172": "JS_MODULE_TYPE",
    "173": "JS_GLOBAL_OBJECT_TYPE",
    "174": "JS_BUILTINS_OBJECT_TYPE",
    "175": "JS_GLOBAL_PROXY_TYPE",
    "176": "JS_ARRAY_TYPE",
    "167": "JS_PROXY_TYPE",
    "179": "JS_WEAK_MAP_TYPE",
    "180": "JS_REGEXP_TYPE",
    "181": "JS_FUNCTION_TYPE",
    "166": "JS_FUNCTION_PROXY_TYPE",
    "161": "DEBUG_INFO_TYPE",
    "162": "BREAK_POINT_INFO_TYPE",
  };

  Object.keys(INSTANCE_TYPES).forEach(function (key) { INSTANCE_TYPES[INSTANCE_TYPES[key]] = +key; });

  var Map = Binary(HeapObject, {
    instance_size: u32,
    instance_type: u8
  });

  function HeapObjectIterator(start, end) {
    this.object = HeapObject(start);
    this.offset = 0;
    this.end_offset = end - start;
  }

  HeapObjectIterator.prototype.done = function () {
    return this.offset >= this.end_offset;
  };

  HeapObjectIterator.prototype.next = function () {
    if (!this.done()) {
      var sz = this.object.Size();
      this.offset += sz;
      if (!this.done()) {
        this.object = HeapObject(this.object, sz);
      }
    }
  };

  var MS = 500;
  var PAPER_W = 800;
  var paper = Raphael(document.getElementById("first-page"), PAPER_W, 250);

  var x0 = 0;

  function ColorForObject(object) {
    var type = object.map.instance_type;
    switch (type) {
      case INSTANCE_TYPES.CODE_TYPE:
        return "orange";
      case INSTANCE_TYPES.FREE_SPACE_TYPE:
        return "whitesmoke";
      default:
        return "white";
    }
  }

  function CreateRect(it) {
    var width = it.object.Size() * PAPER_W / it.end_offset;
    var rect = paper.rect(x0, 70, width, 100).attr({cursor: 'pointer'});

    var text = [];
    text.push(paper.text(x0 + 20, 120, it.object.Size() + " bytes").attr({
      opacity: 0,
      'font-family': "Just Another Hand",
      'font-size': "40",
      fill: 'black'
    }));

    var is_code = it.object.map.instance_type === INSTANCE_TYPES.CODE_TYPE;
    if (is_code) {
      var code = Code(it.object);
      text.push(paper.text(x0 + 20, 15, code.ShortName()).attr({
        opacity: 0,
        'font-family': "Just Another Hand",
        'font-size': "40"
      }));

      rect.click(function () {
        var instructions = code.instructions();

        var lines = [];

        try {
          var offs = 0;
          while (offs < instructions.length) {
            var result = disassemble_and_format_x86_instruction(instructions, offs);
            lines.push(result[1]);
            offs += result[2];
          }
        } catch (e) {

        }

        $("#sloppy-disasm").text(lines.join('\n'));
        $("#sloppy-disasm-disclaimer").show();
      });
    }

    rect.attr("fill", ColorForObject(it.object));
    rect.mouseover(function () {
      rect.stop().animate({transform: "s1.5,1.5"}, MS, "elastic");
      rect.toFront();
      text.forEach(function (t) { t.stop().animate({opacity: 1}, MS, "elastic") });
    }).mouseout(function () {
      rect.toBack();
      rect.stop().animate({transform: ""}, MS, "elastic");
      text.forEach(function (t) { t.stop().animate({opacity: 0}, MS); });
    });

    x0 += width;
  }

  function initialize() {
    var p = $Heap().code_space[0];
    var p = Page(p);
    var last = 0;
    for (var it = new HeapObjectIterator(p.area_start, p.area_start + 64 * 1024); !it.done(); it.next()) {
      CreateRect(it);
      last = it.area_start + it.object.Size();
    }
  }

  $("#sloppy-disasm-disclaimer").hide();

  if (!IS_SHIM) $("#rampage-heap-shim").hide();

  $("#rampage-heap").click(function () {
    var p = Page($Heap().code_space[0]);
    var start = $PageOffset(p.area_start);
    var end = $PageOffset(p.area_end);
    var m = "\xCCHello JSConfEU";
    for (var i = start; i < end; i++) {
      p.data[i] = m.charCodeAt(i % m.length);
    }
  });
})();
