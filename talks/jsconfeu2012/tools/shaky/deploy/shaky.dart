import "dart:html" as v;import "dart:isolate" as AB;import "dart:math" as mB;import "dart:async" as lC;import "dart:mirrors" as mC;final xB="20pt 'Gloria Hallelujah'";class nC{nC( g):o=g.getContext("2d"){o.lineWidth=3;o.font=xB;o.textBaseline="middle";}final VB=new mB.Random();final  o;var t,u;moveTo(h,g){this.t=h;this.u=g;}lineTo(h,g){bC(t,u,h,g);this.t=h;this.u=g;}bC(k,j,CB,l){var g=CB-k;var h=l-j;var i=mB.sqrt(g*g+h*h);var q=mB.sqrt(i)/1.5;var m=VB.nextDouble();var EB=VB.nextDouble();var FB=VB.nextDouble()*q;var DB=VB.nextDouble()*q;var GB=k+g*m+h/i*FB;var HB=j+h*m-g/i*FB;var KB=k+g*EB-h/i*DB;var IB=j+h*EB+g/i*DB;o.moveTo(k,j);o.bezierCurveTo(GB,HB,KB,IB,CB,l);}WC(j,i){g()=>VB.nextDouble()*2-1;for(var h=0;h<3;h++ ){o.beginPath();o.arc(j+g(),i+g(),5,0,mB.PI*2,true);o.closePath();o.fill();}}UC(EB,DB,h,g){var j=EB-h;var k=DB-g;var i=mB.atan(k/j);if(k==0){i=j<0?-mB.PI:0;}var m=i+0.5;var q=i-0.50;var CB=20;var HB=h+CB*mB.cos(m);var IB=g+CB*mB.sin(m);o.beginPath();moveTo(HB,IB);lineTo(h,g);o.stroke();var l=20;var GB=h+l*mB.cos(q);var FB=g+l*mB.sin(q);o.beginPath();moveTo(GB,FB);lineTo(h,g);o.stroke();}beginPath()=>o.beginPath();stroke()=>o.stroke();set strokeStyle(g){o.strokeStyle=g;}set fillStyle(g){o.fillStyle=g;}fillText(g,i,h)=>o.fillText(g,i,h);}final ZB=15;LB(g)=>g*ZB+(ZB/2);MB(g)=>g*ZB+(ZB/2);class oC{final x;final y;const oC(this.x,this.y);}class yB{yB(this.t,this.u,this.start,this.x1,this.y1,this.end,this.color);var t,u,start,x1,y1,end,color;tB(g){g.strokeStyle=color;g.fillStyle=color;g.beginPath();g.moveTo(LB(t),MB(u));g.lineTo(LB(x1),MB(y1));g.stroke();ED(g,start,LB(x1),MB(y1),LB(t),MB(u));ED(g,end,LB(t),MB(u),LB(x1),MB(y1));}ED(h,j,l,k,i,g){switch (j){case "circle":h.WC(i,g);break;case "arrow":h.UC(l,k,i,g);break;}}}class zB{zB(this.t,this.u,this.text,this.color);var t,u,text,color;tB(g){g.fillStyle=color;g.fillText(text,LB(t),MB(u));}}AC(cC){var lB=cC.split('\n');var WB=lB.length;var PB=lB.fold(0,(dC,i)=>mB.max(dC,i.length));var k=new List(WB);QB(h,g)=>(0<=h&&h<WB&&0<=g&&g<PB)?k[h][g]:null;for(var h=0;h<WB;h++ ){var i=lB[h];k[h]=new List(PB);for(var g=0;g<i.length;g++ ){k[h][g]=i[g];}for(var g=i.length;g<PB;g++ ){k[h][g]=" ";}}uB(g,h){var q=QB(h,g);return q=="|"||q=="-"||q=="+"||q=="~"||q=="!";}vB(g,h){switch (QB(h,g)){case "~":case "!":return "#666";}}wB(g,h){var q=QB(h,g);return q=="*"||q=="<"||q==">"||q=="^"||q=="v";}eC(){for(var h=0;h<WB;h++ ){for(var g=0;g<PB;g++ ){if(k[h][g]=='|'||k[h][g]=='-'){return new oC(g,h);}}}}var fC={"-":const oC(1,0),"|":const oC(0,1)};gB(g,h,m,l){switch (QB(h,g)){case "|":case "-":case "*":case ">":case "<":case "^":case "v":case "~":case "!":k[h][g]=" ";return;case "+":m=1-m;l=1-l;k[h][g]=" ";switch (QB(h-l,g-m)){case "|":case "!":case "+":k[h][g]="|";return;case "-":case "~":case "+":k[h][g]="-";return;}switch (QB(h+l,g+m)){case "|":case "!":case "+":k[h][g]="|";return;case "-":case "~":case "+":k[h][g]="-";return;}return;}}gC(i){var m=i.t!=i.x1?1:0;var l=i.u!=i.y1?1:0;if(m!=0||l!=0){var g=i.t+m,h=i.u+l;var hC=i.x1-m,iC=i.y1-l;while (g<=hC&&h<=iC){gB(g,h,m,l);g+= m;h+= l;}gB(i.t,i.u,m,l);gB(i.x1,i.y1,m,l);}else{gB(i.t,i.u,m,l);}}var XB=[] ;jC(){var IB=eC();if(IB==null)return false;var j=fC[k[IB.y][IB.x]];var KB=IB.x;var FB=IB.y;var CB;while (uB(KB-j.x,FB-j.y)){KB-= j.x;FB-= j.y;if(CB==null)CB=vB(KB,FB);}var RB=null;if(wB(KB-j.x,FB-j.y)){KB-= j.x;FB-= j.y;RB=(k[FB][KB]=="*")?"circle":"arrow";}var HB=IB.x;var GB=IB.y;while (uB(HB+j.x,GB+j.y)){HB+= j.x;GB+= j.y;if(CB==null){CB=vB(HB,GB);}}var DB=null;if(wB(HB+j.x,GB+j.y)){HB+= j.x;GB+= j.y;DB=(k[GB][HB]=="*")?"circle":"arrow";}var i=new yB(KB,FB,RB,HB,GB,DB,CB==null?"black":CB);XB.add(i);gC(i);if(RB=="arrow"){i.t-= j.x;i.u-= j.y;}if(DB=="arrow"){i.x1+= j.x;i.y1+= j.y;}return true;}kC(){for(var h=0;h<WB;h++ ){for(var g=0;g<PB;g++ ){if(k[h][g]!=' '){var RB=g,DB=g;while ((DB<PB)&&(k[h][DB]!=" "))DB++ ;var EB=k[h].getRange(RB,DB).join('');var YB=XB[XB.length-1];if((YB is zB)&&(YB.t+YB.text.length+1)==RB){YB.text="${YB.text} ${EB}";}else{var CB="black";if(EB[0]=="\\"&&EB[EB.length-1]=="\\"){EB=EB.substring(1,EB.length-1);CB="#666";}XB.add(new zB(g,h,EB,CB));}g=DB;}}}}while (jC());kC();return XB;}aB(){var k=AC(v.query("#textarea").value);var h=0;var j=0;for(var g in k){if(g is yB){h=mB.max(h,LB(g.x1+1));j=mB.max(j,MB(g.y1+1));}}var i=v.query("#canvas");i.width=h.toInt();i.height=j.toInt();var l=new nC(i);for(var g in k)g.tB(l);} main(){v.query("#textarea").onChange.listen((g)=>aB());v.query("#textarea").onKeyUp.listen((g)=>aB());v.query("#save").onClick.listen((g){var h=new v.AnchorElement()..href=v.query("#canvas").BD("image/png")..attributes['download']=v.query("#name").value;v.document.body.nodes.add(h);v.window.setTimeout(()=>h.remove(),1000);try {h.click();}catch (g){h.xC(new v.Event("click"));}});NC((){try {if(sB.window.yC)return;}catch (g){}sB.zC=new vC.CD(aB);});aB();}class pC{static const  qC="Chrome";final  VC;final  minimumVersion;const pC(this.VC,[this.minimumVersion]);}class rC{const rC();}class sC{final  name;const sC(this.name);}class tC{const tC();}class uC{const uC();}final BC=r"""
(function() {
  // Proxy support for js.dart.

  var globalContext = window;

  // Support for binding the receiver (this) in proxied functions.
  function bindIfFunction(f, _this) {
    if (typeof(f) != "function") {
      return f;
    } else {
      return new BoundFunction(_this, f);
    }
  }

  function unbind(obj) {
    if (obj instanceof BoundFunction) {
      return obj.object;
    } else {
      return obj;
    }
  }

  function getBoundThis(obj) {
    if (obj instanceof BoundFunction) {
      return obj._this;
    } else {
      return globalContext;
    }
  }

  function BoundFunction(_this, object) {
    this._this = _this;
    this.object = object;
  }

  // Table for local objects and functions that are proxied.
  function ProxiedObjectTable() {
    // Name for debugging.
    this.name = 'js-ref';

    // Table from IDs to JS objects.
    this.map = {};

    // Generator for new IDs.
    this._nextId = 0;

    // Counter for deleted proxies.
    this._deletedCount = 0;

    // Flag for one-time initialization.
    this._initialized = false;

    // Ports for managing communication to proxies.
    this.port = new ReceivePortSync();
    this.sendPort = this.port.toSendPort();

    // Set of IDs that are global.
    // These will not be freed on an exitScope().
    this.globalIds = {};

    // Stack of scoped handles.
    this.handleStack = [];

    // Stack of active scopes where each value is represented by the size of
    // the handleStack at the beginning of the scope.  When an active scope
    // is popped, the handleStack is restored to where it was when the
    // scope was entered.
    this.scopeIndices = [];
  }

  // Number of valid IDs.  This is the number of objects (global and local)
  // kept alive by this table.
  ProxiedObjectTable.prototype.count = function () {
    return Object.keys(this.map).length;
  }

  // Number of total IDs ever allocated.
  ProxiedObjectTable.prototype.total = function () {
    return this.count() + this._deletedCount;
  }

  // Adds an object to the table and return an ID for serialization.
  ProxiedObjectTable.prototype.add = function (obj) {
    if (this.scopeIndices.length == 0) {
      throw "Cannot allocate a proxy outside of a scope.";
    }
    // TODO(vsm): Cache refs for each obj?
    var ref = this.name + '-' + this._nextId++;
    this.handleStack.push(ref);
    this.map[ref] = obj;
    return ref;
  }

  ProxiedObjectTable.prototype._initializeOnce = function () {
    if (!this._initialized) {
      this._initialize();
      this._initialized = true;
    }
  }

  // Enters a new scope for this table.
  ProxiedObjectTable.prototype.enterScope = function() {
    this._initializeOnce();
    this.scopeIndices.push(this.handleStack.length);
  }

  // Invalidates all non-global IDs in the current scope and
  // exit the current scope.
  ProxiedObjectTable.prototype.exitScope = function() {
    var start = this.scopeIndices.pop();
    for (var i = start; i < this.handleStack.length; ++i) {
      var key = this.handleStack[i];
      if (!this.globalIds.hasOwnProperty(key)) {
        delete this.map[this.handleStack[i]];
        this._deletedCount++;
      }
    }
    this.handleStack = this.handleStack.splice(0, start);
  }

  // Makes this ID globally scope.  It must be explicitly invalidated.
  ProxiedObjectTable.prototype.globalize = function(id) {
    this.globalIds[id] = true;
  }

  // Invalidates this ID, potentially freeing its corresponding object.
  ProxiedObjectTable.prototype.invalidate = function(id) {
    var old = this.get(id);
    delete this.globalIds[id];
    delete this.map[id];
    this._deletedCount++;
  }

  // Gets the object or function corresponding to this ID.
  ProxiedObjectTable.prototype.get = function (id) {
    if (!this.map.hasOwnProperty(id)) {
      throw 'Proxy ' + id + ' has been invalidated.'
    }
    return this.map[id];
  }

  ProxiedObjectTable.prototype._initialize = function () {
    // Configure this table's port to forward methods, getters, and setters
    // from the remote proxy to the local object.
    var table = this;

    this.port.receive(function (message) {
      // TODO(vsm): Support a mechanism to register a handler here.
      try {
        var object = table.get(message[0]);
        var receiver = unbind(object);
        var member = message[1];
        var kind = message[2];
        var args = message[3].map(deserialize);
        if (kind == 'get') {
          // Getter.
          var field = member;
          if (field in receiver && args.length == 0) {
            var result = bindIfFunction(receiver[field], receiver);
            return [ 'return', serialize(result) ];
          }
        } else if (kind == 'set') {
          // Setter.
          var field = member;
          if (args.length == 1) {
            return [ 'return', serialize(receiver[field] = args[0]) ];
          }
        } else if (kind == 'apply') {
          // Direct function invocation.
          var _this = getBoundThis(object);
          return [ 'return', serialize(receiver.apply(_this, args)) ];
        } else if (member == '[]' && args.length == 1) {
          // Index getter.
          var result = bindIfFunction(receiver[args[0]], receiver);
          return [ 'return', serialize(result) ];
        } else if (member == '[]=' && args.length == 2) {
          // Index setter.
          return [ 'return', serialize(receiver[args[0]] = args[1]) ];
        } else {
          // Member function invocation.
          var f = receiver[member];
          if (f) {
            var result = f.apply(receiver, args);
            return [ 'return', serialize(result) ];
          }
        }
        return [ 'none' ];
      } catch (e) {
        return [ 'throws', e.toString() ];
      }
    });
  }

  // Singleton for local proxied objects.
  var proxiedObjectTable = new ProxiedObjectTable();

  // DOM element serialization code.
  var _localNextElementId = 0;
  var _DART_ID = 'data-dart_id';
  var _DART_TEMPORARY_ATTACHED = 'data-dart_temporary_attached';

  function serializeElement(e) {
    // TODO(vsm): Use an isolate-specific id.
    var id;
    if (e.hasAttribute(_DART_ID)) {
      id = e.getAttribute(_DART_ID);
    } else {
      id = (_localNextElementId++).toString();
      e.setAttribute(_DART_ID, id);
    }
    if (e !== document.documentElement) {
      // Element must be attached to DOM to be retrieve in js part.
      // Attach top unattached parent to avoid detaching parent of "e" when
      // appending "e" directly to document. We keep count of elements
      // temporarily attached to prevent detaching top unattached parent to
      // early. This count is equals to the length of _DART_TEMPORARY_ATTACHED
      // attribute. There could be other elements to serialize having the same
      // top unattached parent.
      var top = e;
      while (true) {
        if (top.hasAttribute(_DART_TEMPORARY_ATTACHED)) {
          var oldValue = top.getAttribute(_DART_TEMPORARY_ATTACHED);
          var newValue = oldValue + "a";
          top.setAttribute(_DART_TEMPORARY_ATTACHED, newValue);
          break;
        }
        if (top.parentNode == null) {
          top.setAttribute(_DART_TEMPORARY_ATTACHED, "a");
          document.documentElement.appendChild(top);
          break;
        }
        if (top.parentNode === document.documentElement) {
          // e was already attached to dom
          break;
        }
        top = top.parentNode;
      }
    }
    return id;
  }

  function deserializeElement(id) {
    // TODO(vsm): Clear the attribute.
    var list = document.querySelectorAll('[' + _DART_ID + '="' + id + '"]');

    if (list.length > 1) throw 'Non unique ID: ' + id;
    if (list.length == 0) {
      throw 'Element must be attached to the document: ' + id;
    }
    var e = list[0];
    if (e !== document.documentElement) {
      // detach temporary attached element
      var top = e;
      while (true) {
        if (top.hasAttribute(_DART_TEMPORARY_ATTACHED)) {
          var oldValue = top.getAttribute(_DART_TEMPORARY_ATTACHED);
          var newValue = oldValue.substring(1);
          top.setAttribute(_DART_TEMPORARY_ATTACHED, newValue);
          // detach top only if no more elements have to be unserialized
          if (top.getAttribute(_DART_TEMPORARY_ATTACHED).length === 0) {
            top.removeAttribute(_DART_TEMPORARY_ATTACHED);
            document.documentElement.removeChild(top);
          }
          break;
        }
        if (top.parentNode === document.documentElement) {
          // e was already attached to dom
          break;
        }
        top = top.parentNode;
      }
    }
    return e;
  }


  // Type for remote proxies to Dart objects.
  function DartProxy(id, sendPort) {
    this.id = id;
    this.port = sendPort;
  }

  // Serializes JS types to SendPortSync format:
  // - primitives -> primitives
  // - sendport -> sendport
  // - DOM element -> [ 'domref', element-id ]
  // - Function -> [ 'funcref', function-id, sendport ]
  // - Object -> [ 'objref', object-id, sendport ]
  function serialize(message) {
    if (message == null) {
      return null;  // Convert undefined to null.
    } else if (typeof(message) == 'string' ||
               typeof(message) == 'number' ||
               typeof(message) == 'boolean') {
      // Primitives are passed directly through.
      return message;
    } else if (message instanceof SendPortSync) {
      // Non-proxied objects are serialized.
      return message;
    } else if (message instanceof Element &&
        (message.ownerDocument == null || message.ownerDocument == document)) {
      return [ 'domref', serializeElement(message) ];
    } else if (message instanceof BoundFunction &&
               typeof(message.object) == 'function') {
      // Local function proxy.
      return [ 'funcref',
               proxiedObjectTable.add(message),
               proxiedObjectTable.sendPort ];
    } else if (typeof(message) == 'function') {
      if ('_dart_id' in message) {
        // Remote function proxy.
        var remoteId = message._dart_id;
        var remoteSendPort = message._dart_port;
        return [ 'funcref', remoteId, remoteSendPort ];
      } else {
        // Local function proxy.
        return [ 'funcref',
                 proxiedObjectTable.add(message),
                 proxiedObjectTable.sendPort ];
      }
    } else if (message instanceof DartProxy) {
      // Remote object proxy.
      return [ 'objref', message.id, message.port ];
    } else {
      // Local object proxy.
      return [ 'objref',
               proxiedObjectTable.add(message),
               proxiedObjectTable.sendPort ];
    }
  }

  function deserialize(message) {
    if (message == null) {
      return null;  // Convert undefined to null.
    } else if (typeof(message) == 'string' ||
               typeof(message) == 'number' ||
               typeof(message) == 'boolean') {
      // Primitives are passed directly through.
      return message;
    } else if (message instanceof SendPortSync) {
      // Serialized type.
      return message;
    }
    var tag = message[0];
    switch (tag) {
      case 'funcref': return deserializeFunction(message);
      case 'objref': return deserializeObject(message);
      case 'domref': return deserializeElement(message[1]);
    }
    throw 'Unsupported serialized data: ' + message;
  }

  // Create a local function that forwards to the remote function.
  function deserializeFunction(message) {
    var id = message[1];
    var port = message[2];
    // TODO(vsm): Add a more robust check for a local SendPortSync.
    if ("receivePort" in port) {
      // Local function.
      return unbind(proxiedObjectTable.get(id));
    } else {
      // Remote function.  Forward to its port.
      var f = function () {
        var depth = enterScope();
        try {
          var args = Array.prototype.slice.apply(arguments);
          args.splice(0, 0, this);
          args = args.map(serialize);
          var result = port.callSync([id, '#call', args]);
          if (result[0] == 'throws') throw deserialize(result[1]);
          return deserialize(result[1]);
        } finally {
          exitScope(depth);
        }
      };
      // Cache the remote id and port.
      f._dart_id = id;
      f._dart_port = port;
      return f;
    }
  }

  // Creates a DartProxy to forwards to the remote object.
  function deserializeObject(message) {
    var id = message[1];
    var port = message[2];
    // TODO(vsm): Add a more robust check for a local SendPortSync.
    if ("receivePort" in port) {
      // Local object.
      return proxiedObjectTable.get(id);
    } else {
      // Remote object.
      return new DartProxy(id, port);
    }
  }

  // Remote handler to construct a new JavaScript object given its
  // serialized constructor and arguments.
  function construct(args) {
    args = args.map(deserialize);
    var constructor = unbind(args[0]);
    args = Array.prototype.slice.call(args, 1);

    // Until 10 args, the 'new' operator is used. With more arguments we use a
    // generic way that may not work, particulary when the constructor does not
    // have an "apply" method.
    var ret = null;
    if (args.length === 0) {
      ret = new constructor();
    } else if (args.length === 1) {
      ret = new constructor(args[0]);
    } else if (args.length === 2) {
      ret = new constructor(args[0], args[1]);
    } else if (args.length === 3) {
      ret = new constructor(args[0], args[1], args[2]);
    } else if (args.length === 4) {
      ret = new constructor(args[0], args[1], args[2], args[3]);
    } else if (args.length === 5) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4]);
    } else if (args.length === 6) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4],
                            args[5]);
    } else if (args.length === 7) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4],
                            args[5], args[6]);
    } else if (args.length === 8) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4],
                            args[5], args[6], args[7]);
    } else if (args.length === 9) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4],
                            args[5], args[6], args[7], args[8]);
    } else if (args.length === 10) {
      ret = new constructor(args[0], args[1], args[2], args[3], args[4],
                            args[5], args[6], args[7], args[8], args[9]);
    } else {
      // Dummy Type with correct constructor.
      var Type = function(){};
      Type.prototype = constructor.prototype;
  
      // Create a new instance
      var instance = new Type();
  
      // Call the original constructor.
      ret = constructor.apply(instance, args);
      ret = Object(ret) === ret ? ret : instance;
    }
    return serialize(ret);
  }

  // Remote handler to return the top-level JavaScript context.
  function context(data) {
    return serialize(globalContext);
  }

  // Remote handler to track number of live / allocated proxies.
  function proxyCount() {
    var live = proxiedObjectTable.count();
    var total = proxiedObjectTable.total();
    return [live, total];
  }

  // Return true if two JavaScript proxies are equal (==).
  function proxyEquals(args) {
    return deserialize(args[0]) == deserialize(args[1]);
  }

  // Return true if a JavaScript proxy is instance of a given type (instanceof).
  function proxyInstanceof(args) {
    var obj = unbind(deserialize(args[0]));
    var type = unbind(deserialize(args[1]));
    return obj instanceof type;
  }

  // Return true if a JavaScript proxy has a given property.
  function proxyHasProperty(args) {
    var obj = unbind(deserialize(args[0]));
    var member = unbind(deserialize(args[1]));
    return member in obj;
  }

  // Delete a given property of object.
  function proxyDeleteProperty(args) {
    var obj = unbind(deserialize(args[0]));
    var member = unbind(deserialize(args[1]));
    delete obj[member];
  }

  function proxyConvert(args) {
    return serialize(deserializeDataTree(args));
  }

  function deserializeDataTree(data) {
    var type = data[0];
    var value = data[1];
    if (type === 'map') {
      var obj = {};
      for (var i = 0; i < value.length; i++) {
        obj[value[i][0]] = deserializeDataTree(value[i][1]);
      }
      return obj;
    } else if (type === 'list') {
      var list = [];
      for (var i = 0; i < value.length; i++) {
        list.push(deserializeDataTree(value[i]));
      }
      return list;
    } else /* 'simple' */ {
      return deserialize(value);
    }
  }

  function makeGlobalPort(name, f) {
    var port = new ReceivePortSync();
    port.receive(f);
    window.registerPort(name, port.toSendPort());
  }

  // Enters a new scope in the JavaScript context.
  function enterJavaScriptScope() {
    proxiedObjectTable.enterScope();
  }

  // Enters a new scope in both the JavaScript and Dart context.
  var _dartEnterScopePort = null;
  function enterScope() {
    enterJavaScriptScope();
    if (!_dartEnterScopePort) {
      _dartEnterScopePort = window.lookupPort('js-dart-interop-enter-scope');
    }
    return _dartEnterScopePort.callSync([]);
  }

  // Exits the current scope (and invalidate local IDs) in the JavaScript
  // context.
  function exitJavaScriptScope() {
    proxiedObjectTable.exitScope();
  }

  // Exits the current scope in both the JavaScript and Dart context.
  var _dartExitScopePort = null;
  function exitScope(depth) {
    exitJavaScriptScope();
    if (!_dartExitScopePort) {
      _dartExitScopePort = window.lookupPort('js-dart-interop-exit-scope');
    }
    return _dartExitScopePort.callSync([ depth ]);
  }

  makeGlobalPort('dart-js-interop-context', context);
  makeGlobalPort('dart-js-interop-create', construct);
  makeGlobalPort('dart-js-interop-proxy-count', proxyCount);
  makeGlobalPort('dart-js-interop-equals', proxyEquals);
  makeGlobalPort('dart-js-interop-instanceof', proxyInstanceof);
  makeGlobalPort('dart-js-interop-has-property', proxyHasProperty);
  makeGlobalPort('dart-js-interop-delete-property', proxyDeleteProperty);
  makeGlobalPort('dart-js-interop-convert', proxyConvert);
  makeGlobalPort('dart-js-interop-enter-scope', enterJavaScriptScope);
  makeGlobalPort('dart-js-interop-exit-scope', exitJavaScriptScope);
  makeGlobalPort('dart-js-interop-globalize', function(data) {
    if (data[0] == "objref" || data[0] == "funcref") return proxiedObjectTable.globalize(data[1]);
    throw 'Illegal type: ' + data[0];
  });
  makeGlobalPort('dart-js-interop-invalidate', function(data) {
    if (data[0] == "objref" || data[0] == "funcref") return proxiedObjectTable.invalidate(data[1]);
    throw 'Illegal type: ' + data[0];
  });
})();
"""; CC(h){final g=new v.ScriptElement();g.type='text/javascript';g.innerHtml=h;v.document.body.nodes.add(g);}var SB=null;var DC=null;var EC=null;var nB=null;var FC=null;var GC=null;var HC=null;var IC=null;var oB=null;var pB=null;var JC=null;var KC=null;var qB=null;var rB=null; LC(){if(SB!=null)return;try {SB=v.window.lookupPort('dart-js-interop-context');}catch (h){}if(SB==null){CC(BC);SB=v.window.lookupPort('dart-js-interop-context');}DC=v.window.lookupPort('dart-js-interop-create');EC=v.window.lookupPort('dart-js-interop-proxy-count');nB=v.window.lookupPort('dart-js-interop-equals');FC=v.window.lookupPort('dart-js-interop-instanceof');GC=v.window.lookupPort('dart-js-interop-has-property');HC=v.window.lookupPort('dart-js-interop-delete-property');IC=v.window.lookupPort('dart-js-interop-convert');oB=v.window.lookupPort('dart-js-interop-enter-scope');pB=v.window.lookupPort('dart-js-interop-exit-scope');JC=v.window.lookupPort('dart-js-interop-globalize');KC=v.window.lookupPort('dart-js-interop-invalidate');qB=new v.ReceivePortSync()..receive((FD)=>iB());rB=new v.ReceivePortSync()..receive((g)=>jB(g[0]));v.window.registerPort('js-dart-interop-enter-scope',qB.toSendPort());v.window.registerPort('js-dart-interop-exit-scope',rB.toSendPort());} get sB{hB();return dB(SB.callSync([] ));}get MC=>BB.GD.length; hB(){if(MC==0){var g=iB();lC.runAsync(()=>jB(g));}}NC(h){var g=iB();try {return h();}finally {jB(g);}} iB(){LC();BB.XC();oB.callSync([] );return BB.GD.length;} jB( g){assert(BB.GD.length==g);pB.callSync([] );BB.YC();}class vC implements cB<bB>{var HD;var ID;var JD;LC(g){HD=g;ID=BB.add(JD);BB.ZC(ID);}KD(){var g=BB.aC(ID);} kB()=>new bB.DD(BB.fB,ID);vC.CD( h,{ withThis: false}){JD=( g){try {return Function.apply(h,withThis?g:g.skip(1).toList());}finally {KD();}};LC(false);}}class wC{const wC();}const OB=const wC(); OC(i,l,k,j,q,m){final g=[i,l,k,j,q,m];final h=g.indexOf(OB);if(h<0)return g;return g.sublist(0,h);}class NB implements cB<NB>{var LD;final ID;NB.DD(this.LD,this.ID); kB()=>this;operator[](g)=>TB(this,'[]','method',[g]);operator[]=(h,g)=>TB(this,'[]=','method',[h,g]);operator==(g)=>identical(this,g)?true:(g is NB&&nB.callSync([UB(this),UB(g)])); toString(){try {return TB(this,'toString','method',[] );}catch (g){return super.toString();}}noSuchMethod( i){var g=mC.MirrorSystem.getName(i.memberName);if(g.indexOf('@')!=-1){g=g.substring(0,g.indexOf('@'));}var h;var j=i.positionalArguments;if(j==null)j=[] ;if(i.isGetter){h='get';}else if(i.isSetter){h='set';if(g.endsWith('=')){g=g.substring(0,g.length-1);}}else if(g=='call'){h='apply';}else{h='method';}return TB(this,g,h,j);}static TB( g, i, k, j){hB();var h=g.LD.callSync([g.ID,i,k,j.map(UB).toList()]);switch (h[0]){case 'return':return dB(h[1]);case 'throws':throw dB(h[1]);case 'none':throw new NoSuchMethodError(g,i,j,{});default:throw 'Invalid return value';}}}class bB extends NB implements cB<bB>{bB.DD( h,g):super.DD(h,g);call([g=OB,j=OB,i=OB,h=OB,m=OB,k=OB]){var l=OC(g,j,i,h,m,k);return NB.TB(this,'','apply',l);}}abstract class cB<PC>{ kB();}class QC{final  MD;var ND;var OD;final  PD;final  LD;final  QD;final  RD;final  GD;XC(){GD.add(RD.length);}YC(){var h=GD.removeLast();for(int g=h;g<RD.length; ++g){var i=RD[g];if(!QD.contains(i)){PD.remove(RD[g]);OD++ ;}}if(h!=RD.length){RD.removeRange(h,RD.length-h);}}ZC(g)=>QD.add(g);aC(g){var h=PD[g];QD.remove(g);PD.remove(g);OD++ ;return h;}QC():MD='dart-ref',ND=0,OD=0,PD={},LD=new v.ReceivePortSync(),RD=new List<String>(),GD=new List<int>(),QD=new Set<String>(){LD.receive((g){try {final h=PD[g[0]];final k=g[1];final j=g[2].map(dB).toList();if(k=='#call'){final l=h as Function;var m=UB(l(j));return ['return',m];}else{throw 'Invocation unsupported on non-function Dart proxies';}}catch (i){return ['throws','${i}'];}});} add(h){hB();final g='${MD}-${ND++ }';PD[g]=h;RD.add(g);return g;}Object get( g){return PD[g];}get fB=>LD.toSendPort();}var BB=new QC();UB(var g){if(g==null){return null;}else if(g is String||g is num||g is bool){return g;}else if(g is AB.SendPortSync){return g;}else if(g is v.Element&&(g.document==null||g.document==v.document)){return ['domref',SC(g)];}else if(g is bB){return ['funcref',g.ID,g.LD];}else if(g is NB){return ['objref',g.ID,g.LD];}else if(g is cB){return UB(g.kB());}else{return ['objref',BB.add(g),BB.fB];}}dB(var g){j(g){var h=g[1];var i=g[2];if(i==BB.fB){return BB.get(h);}else{return new bB.DD(i,h);}}l(g){var h=g[1];var i=g[2];if(i==BB.fB){return BB.get(h);}else{return new NB.DD(i,h);}}if(g==null){return null;}else if(g is String||g is num||g is bool){return g;}else if(g is AB.SendPortSync){return g;}var k=g[0];switch (k){case 'funcref':return j(g);case 'objref':return l(g);case 'domref':return TC(g[1]);}throw 'Unsupported serialized data: ${g}';}var RC=0;const eB='data-dart_id';const JB='data-dart_temporary_attached';SC( h){var i;if(h.attributes.containsKey(eB)){i=h.attributes[eB];}else{i='dart-${RC++ }';h.attributes[eB]=i;}if(!identical(h,v.document.documentElement)){var g=h;while (true){if(g.attributes.containsKey(JB)){final k=g.attributes[JB];final j=k+'a';g.attributes[JB]=j;break;}if(g.parent==null){g.attributes[JB]='a';v.document.documentElement.children.add(g);break;}if(identical(g.parent,v.document.documentElement)){break;}g=g.parent;}}return i;} TC(var i){var j=v.queryAll('[${eB}="${i}"]');if(j.length>1)throw 'Non unique ID: ${i}';if(j.length==0){throw 'Only elements attached to document can be serialized: ${i}';}final h=j[0];if(!identical(h,v.document.documentElement)){var g=h;while (true){if(g.attributes.containsKey(JB)){final l=g.attributes[JB];final k=l.substring(1);g.attributes[JB]=k;if(g.attributes[JB].length==0){g.attributes.remove(JB);g.remove();}break;}if(identical(g.parent,v.document.documentElement)){break;}g=g.parent;}}return h;}