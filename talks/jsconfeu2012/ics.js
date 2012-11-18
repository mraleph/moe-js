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

// Live IC inspection code for loaded scripts.
(function () {
  var scripts = null;

  if (typeof $Scripts !== "function") {
    var JAVASCRIPTJS_INLINE_CACHES = null;
    var JAVASCRIPTJS_LINE_ENDS = [];
    var JAVASCRIPTJS_SOURCE = null;

    $.get('codemirror/mode/javascript/javascript.js', function (data) {
      JAVASCRIPTJS_SOURCE = data;

      for (var i = 0; i < JAVASCRIPTJS_SOURCE.length; i++) {
        if (JAVASCRIPTJS_SOURCE[i] === '\n') {
          JAVASCRIPTJS_LINE_ENDS.push(i);
        }
      }

      $.get('inline_caches.json', function (data) {
        JAVASCRIPTJS_INLINE_CACHES = data;
        setTimeout(initialize, 1000);
      }, 'json');
    }, 'script');

    $Scripts = function () {
      return [{
        name: 'codemirror/mode/javascript/javascript.js',
        inline_caches: JAVASCRIPTJS_INLINE_CACHES,
        source: JAVASCRIPTJS_SOURCE,
        line_ends: JAVASCRIPTJS_LINE_ENDS
      }];
    };

    $Disassemble = function (f) { return f; };
  } else {
    setTimeout(initialize, 1000);
  }

  function initialize() {
    scripts = $Scripts();
    createEditor();
  }

  function findJavaScriptJS() {
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].name.indexOf("javascript.js") > 0) return i;
    }
    throw new Error("javascript.js not found");
  }

  var codemirror = null;
  var widgets = null;
  var select = null;
  function createEditor() {
    codemirror = CodeMirror(document.getElementById("codemirror"));
    codemirror.setOption('readOnly', true);

    select = document.getElementById('urls');
    scripts.forEach(function (script) {
      var option = document.createElement('option');
      option.textContent = script.name.replace('http://localhost:8000', '');
      select.appendChild(option);
    });
    select.addEventListener('change', function () {
      showSource(select.selectedIndex);
    });

    showSource(findJavaScriptJS());
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

  var ICState = [
    "UNINITIALIZED",
    "PREMONOMORPHIC",
    "MONOMORPHIC",
    "MONOMORPHIC_PROTOTYPE_FAILURE",
    "MEGAMORPHIC",
    "DEBUG_BREAK",
    "DEBUG_PREPARE_STEP_IN"
  ];

  var StubKind = [
    'NORMAL',
    'FIELD',
    'CONSTANT_FUNCTION',
    'CALLBACKS',
    'INTERCEPTOR',
    'MAP_TRANSITION',
    'NONEXISTENT'
  ];

  var kIC = 0;
  var kPosition = 1;
  var kFunction = 2;

  var current_script = null;

  function showSource(idx) {
    select.selectedIndex = idx;
    if (widgets !== null) {
      widgets.forEach(function (w) { w.parentNode.removeChild(w); });
      widgets = null;
    }

    var script = scripts[idx];
    codemirror.setValue(script.source);

    current_script = script;
  }

  $("#show-ics").click(function () {
    if (widgets === null) {
      showInlineCaches(current_script);
    } else {
      widgets.forEach(function (widget) {
        $(widget).toggle();
      })
    }
  });

  document.getElementById("ics-slide").onslideenter = function () {
    if (codemirror) codemirror.refresh();
  };

  function showInlineCaches(script) {
    var line_ends = script.line_ends;

    line_ends.unshift(0);
    line_ends.push(script.source.length);

    var finger = 0;
    function splitpos(pos) {
      var d = (line_ends[finger] < pos) ? +1 : -1;

      while (!((line_ends[finger] <= pos) && (pos < line_ends[finger + 1]))) {
        finger += d;
      }

      return { line: finger, ch: pos - line_ends[finger] - 1 };
    }

    var ics = script.inline_caches;

    widgets = [];

    var functions = [];

    var function_literals = new Map();
    var function_literals_positions = [];

    function Format(stub) {
      var lines = $Disassemble(stub).split('\n').map(function (l) {
        var m = l.match(/^[^\s]+\s+[^\s]+\s+[^\s]+\s+([\w_]+)(.*)$/);
        if (m === null) {
          return l.replace(/\s*;;(.*)$/, ' <i>;; $1</i>');
        }
        return m[1].bold() + m[2].replace(/\s*;;(.*)$/, ' <i>;; $1</i>');
      });

      return '<pre>' + lines.join('\n') + '</pre>';
    }

    var current_function = null;
    function createICWidget(idx, loc, data) {
      var w = document.createElement("span");
      w.classList.add("ic");
      w.classList.add("ic-state-" + data.ic_state);
      var circ = document.createElement("span");
      w.appendChild(circ);
      codemirror.addWidget(loc, w);
      var popover = false;
      w.addEventListener("click", function () {
        // console.log(data);
        if (!popover) {
          var title = [data.kind.bold(), data.ic_state.bold()];
          if (data.stub_kind) title.push(data.stub_kind.bold());
          $(circ).popover({
            trigger: 'manual',
            title: title.join('&mdash;'),
            content: Format(data.stub)
          });
        }
        $(circ).popover('toggle');
      })
      widgets.push(w);
      current_function.ics.push(w);
    }
    function enterFunction(func) {
      current_function = func;
      func.ics = [];
      functions.push(func);

      var pos = func.function_token_pos;
      if (!function_literals.has(pos)) {
        var w = document.createElement("span");
        w.classList.add("function");
        codemirror.addWidget(splitpos(func.function_token_pos), w);
        w.addEventListener("click", function () {
          cycleDisplay(pos);
        })

        var literal_instances = [func];
        literal_instances.w = w;

        function_literals.set(pos, literal_instances);
        function_literals_positions.push(pos);
      } else {
        function_literals.get(pos).push(func);
      }
    }

    var i = 0;
    var current_loc = null;
    while (i < ics.length) {
      switch (ics[i++]) {
        case kIC:
          var code_kind = ics[i++];
          var ic_state = ics[i++];
          var stub_kind = ics[i++];
          var code_stub = ics[i++];
          createICWidget(widgets.length, splitpos(current_loc), {
            loc: current_loc,
            kind: CodeKind[code_kind],
            ic_state: ICState[ic_state],
            stub_kind: StubKind[stub_kind],
            stub: code_stub
          });
          current_loc = null;
          break;
        case kPosition:
          current_loc = ics[i++];
          break;
        case kFunction:
          var is_optimized = ics[i++];
          var function_token_pos = ics[i++];
          var start_pos = ics[i++];
          var end_pos = ics[i++];
          enterFunction({
            optimized: (is_optimized == 1),
            function_token_pos: function_token_pos,
            start_pos: start_pos,
            end_pos: end_pos
          });
      }
    }

    function Random(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function displayInstances(instances) {
      // First delete all existing square markers.
      while (instances.w.firstChild) {
        instances.w.removeChild(instances.w.firstChild);
      }

      instances.forEach(function (f) {
        f.ics.forEach(function (w) { w.style.display = "none"; });
      });

      var markers = instances.display === "all" ? instances : [instances[instances.display]];

      var alpha = Math.PI / markers.length + Math.PI/4;
      markers.forEach(function (f, idx) {
        var beta = alpha * idx;

        var x0 = -5 + Math.cos(beta) * 3;
        var y0 = -13 + Math.sin(beta) * 3;

        var span = document.createElement("span");
        span.style.left = x0.toFixed(2) + "pt";
        span.style.top = y0.toFixed(2) + "pt";

        if (f.optimized) span.classList.add("optimized");

        instances.w.appendChild(span);

        f.ics.forEach(function (w) { w.style.display = "block"; });
      });
    }

    function_literals_positions.forEach(function (pos) {
      var instances = function_literals.get(pos);
      instances.display = "all";
      displayInstances(instances);
    });

    function cycleDisplay(pos) {
      var instances = function_literals.get(pos);
      switch (instances.display) {
        case "all": instances.display = 0; break;
        case (instances.length - 1): instances.display = "all"; break;
        default: instances.display++;
      }
      displayInstances(instances);
    }
  }
})();