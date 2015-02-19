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

import 'dart:html' as html;
import 'dart:math' as math;
import 'package:js/js.dart' as js;

final FONT = "20pt 'Gloria Hallelujah'";

// ShakyCanvas provides a way of drawing shaky lines on a normal
// HTML5 canvas element.
class ShakyCanvas {
  ShakyCanvas(html.CanvasElement canvas)
      : ctx = canvas.getContext("2d") {
    ctx.lineWidth = 3;
    ctx.font = FONT;
    ctx.textBaseline = "middle";
  }

  final random = new math.Random();
  final html.CanvasRenderingContext2D ctx;

  var x0, y0;

  moveTo(x0, y0) {
    this.x0 = x0;
    this.y0 = y0;
  }

  lineTo(x1, y1) {
    shakyLine(x0, y0, x1, y1);
    this.x0 = x1;
    this.y0 = y1;
  }

  // Draw a shaky line between (x0, y0) and (x1, y1).
  shakyLine(x0, y0, x1, y1) {
    // Let $v = (d_x, d_y)$ be a vector between points $P_0 = (x_0, y_0)$ and $P_1 = (x_1, y_1)$.
    var dx = x1 - x0;
    var dy = y1 - y0;

    // Let $l$ be the length of $v$.
    var l = math.sqrt(dx * dx + dy * dy);

    // Now we need to pick two random points that are placed
    // on different sides of the line that passes through
    // $P_1$ and $P_2$ and not very far from it if length of
    // $P_1 P_2$ is small.
    var K = math.sqrt(l) / 1.5;
    var k1 = random.nextDouble();
    var k2 = random.nextDouble();
    var l3 = random.nextDouble() * K;
    var l4 = random.nextDouble() * K;

    // Point $P_3$: pick a random point on the line between $P_0$ and $P_1$,
    // then shift it by vector $\frac{l_1}{l} (d_y, -d_x)$ which is a line's normal.
    var x3 = x0 + dx * k1 + dy/l * l3;
    var y3 = y0 + dy * k1 - dx/l * l3;

    // Point $P_3$: pick a random point on the line between $P_0$ and $P_1$,
    // then shift it by vector $\frac{l_2}{l} (-d_y, d_x)$ which also is a line's normal
    // but points into opposite direction from the one we used for $P_3$.
    var x4 = x0 + dx * k2 - dy/l * l4;
    var y4 = y0 + dy * k2 + dx/l * l4;

    // Draw a bezier curve through points $P_0$, $P_3$, $P_4$, $P_1$.
    // Selection of $P_3$ and $P_4$ makes line "jerk" a little
    // between them but otherwise it will be mostly straight thus
    // creating illusion of being hand drawn.
    ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x3, y3, x4, y4, x1, y1);
  }

  // Draw a shaky bulb (used for line endings).
  bulb(x0, y0) {
    fuzziness() =>
        random.nextDouble() * 2 - 1;

    for (var i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x0 + fuzziness(), y0 + fuzziness(), 5, 0, math.PI * 2, true);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Draw a shaky arrowhead at the (x1, y1) as an ending
  // for the line from (x0, y0) to (x1, y1).
  arrowhead (x0, y0, x1, y1) {
    var dx = x0 - x1;
    var dy = y0 - y1;

    var alpha = math.atan(dy / dx);

    if (dy == 0) {
      alpha = dx < 0 ? -math.PI : 0;
    }

    var alpha3 = alpha + 0.5;
    var alpha4 = alpha - 0.50;

    var l3 = 20;
    var x3 = x1 + l3 * math.cos(alpha3);
    var y3 = y1 + l3 * math.sin(alpha3);

    ctx.beginPath();
    moveTo(x3, y3);
    lineTo(x1, y1);
    ctx.stroke();

    var l4 = 20;
    var x4 = x1 + l4 * math.cos(alpha4);
    var y4 = y1 + l4 * math.sin(alpha4);

    ctx.beginPath();
    moveTo(x4, y4);
    lineTo(x1, y1);
    ctx.stroke();
  }

  // Forward some methods to rendering context.
  // Ideally we would just use
  //
  //   noSuchMethod(mirror) => mirror.invokeOn(mirror);
  //
  // But that does not work on VM and does not entirely
  // work on dart2js.
  // So for now we will just use manual forwarding.
  beginPath() => ctx.beginPath();
  stroke() => ctx.stroke();

  set strokeStyle(val) { ctx.strokeStyle = val; }
  set fillStyle(val) { ctx.fillStyle = val; }

  fillText(text, x0, y0) => ctx.fillText(text, x0, y0);
}

//
// Code below converts ASCII art into Line and Text elements.
//

// Size in pixels for a sigle character cell of ASCII art.
final CELL_SIZE = 15;

X(x) => x * CELL_SIZE + (CELL_SIZE / 2);
Y(y) => y * CELL_SIZE + (CELL_SIZE / 2);

// Auxiliary Point class used during parsing.
// Unfortunately Dart does not support structural classes or
// local classes so I had to polute library namespace with it.
class Point {
  final x;
  final y;
  const Point(this.x, this.y);
  
  toString() => "(${x}, ${y})";
}


// Line from (x0, y0) to (x1, y1) with the given color and decolartions
// at the start and end.
class Line {
  Line(this.x0, this.y0, this.start, this.x1, this.y1, this.end, this.color);

  var x0, y0, start, x1, y1, end, color;
  
  toString() => "(${x0}, ${y0}) - (${x1}, ${y1})";

  draw(ctx) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(X(x0), Y(y0));
    ctx.lineTo(X(x1), Y(y1));
    ctx.stroke();
    _ending(ctx, start, X(x1), Y(y1), X(x0), Y(y0));
    _ending(ctx, end, X(x0), Y(y0), X(x1), Y(y1));
  }

  // Draw given type of ending on the (x1, y1).
  _ending(canvas, type, x0, y0, x1, y1) {
    switch (type) {
      case "circle":
        canvas.bulb(x1, y1);
        break;

      case "arrow":
        canvas.arrowhead(x0, y0, x1, y1);
        break;
    }
  }
}

class Bracket {
  var line1, p, line2;
  Bracket(this.line1, this.p, this.line2);
  
  draw(ctx) {
    line1.draw(ctx);
    ctx.beginPath();
    ctx.moveTo(X(line1.x1), Y(line1.y1));
    ctx.lineTo(X(line2.x0 + 1), (Y(line1.y1) + Y(line2.y0)) / 2);     
    ctx.lineTo(X(line2.x0), Y(line2.y0));
    ctx.stroke();
    line2.draw(ctx);
  }
}

class Split {
  final Point start, end;
  
  Split(this.start, this.end);
  
  draw(ctx) {
    final dy = (Y(start.y + 1) - Y(start.y)) / 3;

    ctx.beginPath();
    ctx.moveTo(X(start.x), Y(start.y - 1)); 
    ctx.lineTo(X(start.x), Y(start.y) - dy);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ctx.moveTo(X(start.x), Y(start.y) - dy);
    var sign = -1;
    for (var x = start.x + 1; x <= end.x; x++) {
      var x3, y3, x4, y4;
      x3 = x4 = (X(x - 1) + X(x)) / 2 + (ctx.random.nextDouble() * 6 - 3);
      y3 = y4 = Y(start.y) + (-dy + sign * dy) + (ctx.random.nextDouble() * 2 - 1);
      sign = -sign;
      ctx.ctx.bezierCurveTo(x3, y3, x4, y4, X(x), Y(start.y) - dy);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(end.x), Y(start.y - 1)); 
    ctx.lineTo(X(end.x), Y(start.y) - dy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(start.x), Y(start.y + 1)); 
    ctx.lineTo(X(start.x), Y(start.y) + dy);
    ctx.stroke();
    
    ctx.beginPath();
    sign = -1;
    ctx.ctx.moveTo(X(start.x), Y(start.y) + dy);
    for (var x = start.x + 1; x <= end.x; x++) {
      var x3, y3, x4, y4;
      x3 = x4 = (X(x - 1) + X(x)) / 2 + (ctx.random.nextDouble() * 6 - 3);
      y3 = y4 = Y(start.y) + (dy + sign * dy) + (ctx.random.nextDouble() * 2 - 1);
      sign = -sign;
      ctx.ctx.bezierCurveTo(x3, y3, x4, y4, X(x), Y(start.y) + dy);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(X(end.x), Y(start.y + 1)); 
    ctx.lineTo(X(end.x), Y(start.y) + dy);
    ctx.stroke();
  }
}

// Text annotation at (x0, y0) with the given color.
class Text {
  Text(this.x0, this.y0, this.text, this.color);

  var x0, y0, text, color;

  draw(ctx) {
    ctx.fillStyle = color;
    ctx.fillText(text, X(x0), Y(y0));
  }
}


// Parses given ASCII art string into a list of figures.
parseASCIIArt(string) {
  var lines = string.split('\n');

  var height = lines.length;
  var width  = lines.fold(0, (w, line) => math.max(w, line.length));

  var data = new List(height);  // Matrix containing ASCII art.

  // Get a character from the array or null if we are out of bounds.
  // Useful in places where we inspect character's neighbors and peek
  // out of bounds for boundary characters.
  at(y, x) =>
    (0 <= y && y < height && 0 <= x && x < width) ? data[y][x] : null;

  // Convert strings into a mutable matrix of characters.
  for (var y = 0; y < height; y++) {
    var line = lines[y];
    data[y] = new List(width);
    for (var x = 0; x < line.length; x++) {
      data[y][x] = line[x];
    }
    for (var x = line.length; x < width; x++) {
      data[y][x] = " ";
    }
  }

  // Returns true iff the character can be part of the line.
  isPartOfLine(x, y) {
    var c = at(y, x);
    return c == "|" || c == "-" || c == "+" || c == "!";
  }

  // If character represents a color modifier returns CSS color.
  toColor(x, y) {
    switch (at(y, x)) {
      case "~": case "!": return "#666";
    }
  }

  // Returns true iff characters is line ending decoration.
  isLineEnding(x, y) {
    var c = at(y, x);
    return c == "*" || c == "<" || c == ">" || c == "^" || c == "v";
  }

  // Finds a character that belongs to unextracted line.
  findLineChar() {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (data[y][x] == '|' || data[y][x] == '-') {
          return new Point(x, y);
        }
      }
    }
  }

  findChar(ch) {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (data[y][x] == '~') {
          return new Point(x, y);
        }
      }
    }
  }
  
  findPoints(ch) {
    final points = [];
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (data[y][x] == ch) {
          points.add(new Point(x, y));
        }
      }
    }
    return points;
  }

  
  // Converts line's character to the direction of line's growth.
  var dir = { "-": const Point(1, 0), "|": const Point(0, 1)};

  // Erases character that belongs to the extracted line.
  eraseChar(x, y, dx, dy) {
    switch (at(y, x)) {
      case "|":
      case "-":
      case "*":
      case ">":
      case "<":
      case "^":
      case "v":
      case "~":
      case "!":
        data[y][x] = " ";
        return;
      case "+":
        dx = 1 - dx;
        dy = 1 - dy;

        data[y][x] = " ";
        switch (at(y - dy, x - dx)) {
          case "|":
          case "!":
          case "+":
            data[y][x] = "|";
            return;
          case "-":
          case "+":
            data[y][x] = "-";
            return;
        }

        switch (at(y + dy, x + dx)) {
          case "|":
          case "!":
          case "+":
            data[y][x] = "|";
            return;
          case "-":
          case "+":
            data[y][x] = "-";
            return;
        }
        return;
    }
  }

  // Erase the given extracted line.
  erase(line) {
    var dx = line.x0 != line.x1 ? 1 : 0;
    var dy = line.y0 != line.y1 ? 1 : 0;

    if (dx != 0 || dy != 0) {
      var x = line.x0 + dx, y = line.y0 + dy;
      var x_ = line.x1 - dx, y_ = line.y1 - dy;
      while (x <= x_ && y <= y_) {
        eraseChar(x, y, dx, dy);
        x += dx;
        y += dy;
      }
      eraseChar(line.x0, line.y0, dx, dy);
      eraseChar(line.x1, line.y1, dx, dy);
    } else {
      eraseChar(line.x0, line.y0, dx, dy);
    }
  }

  var figures = [];  // List of extracted figures.

  // Extract a single line and erase it from the ascii art matrix.
  extractLine() {
    var ch = findLineChar();
    if (ch == null) return false;

    var d = dir[data[ch.y][ch.x]];

    // Find line's start by advancing in the oposite direction.
    var x0 = ch.x;
    var y0 = ch.y;
    var color;
    while (isPartOfLine(x0 - d.x, y0 - d.y)) {
      x0 -= d.x;
      y0 -= d.y;
      if (color == null) color = toColor(x0, y0);
    }

    var start = null;
    if (isLineEnding(x0 - d.x, y0 - d.y)) {
      // Line has a decorated start. Extract is as well.
      x0 -= d.x;
      y0 -= d.y;
      start = (data[y0][x0] == "*") ? "circle" : "arrow";
    }

    // Find line's end by advancing forward in the given direction.
    var x1 = ch.x;
    var y1 = ch.y;
    while (isPartOfLine(x1 + d.x, y1 + d.y)) {
      x1 += d.x;
      y1 += d.y;
      if (color == null) {
        color = toColor(x1, y1);
      }
    }

    var end = null;
    if (isLineEnding(x1 + d.x, y1 + d.y)) {
      // Line has a decorated end. Extract it.
      x1 += d.x;
      y1 += d.y;
      end = (data[y1][x1] == "*") ? "circle" : "arrow";
    }

    // Create line object and erase line from the ascii art matrix.
    var line = new Line(x0, y0, start, x1, y1, end, color == null ? "black" : color);
    figures.add(line);
    erase(line);

    // Adjust line start and end to accomodate for arrow endings.
    // Those should not intersect with their targets but should touch them
    // instead. Should be done after erasure to ensure that erase deletes
    // arrowheads.
    if (start == "arrow") {
      line.x0 -= d.x;
      line.y0 -= d.y;
    }

    if (end == "arrow") {
      line.x1 += d.x;
      line.y1 += d.y;
    }

    return true;
  }

  extractSplit() {
    var ch = findChar("~");
    if (ch == null) return false;
    
    data[ch.y][ch.x] = ' ';

    var d = const Point(1, 0);

    // Find line's start by advancing in the oposite direction.
    var x0 = ch.x;
    var y0 = ch.y;
    while (at(y0 - d.y, x0 - d.x) == '~') {
      data[y0 - d.y][x0 - d.x] = ' ';
      x0 -= d.x;
      y0 -= d.y;
    }

    // Find line's end by advancing forward in the given direction.
    var x1 = ch.x;
    var y1 = ch.y;
    while (at(y1 + d.y, x1 + d.x) == '~') {
      data[y1 + d.y][x1 + d.x] = ' ';
      x1 += d.x;
      y1 += d.y;
    }
    
    figures.add(new Split(new Point(x0, y0), new Point(x1, y1)));
    if (figures.length > 1000) throw "";
    return true;
  }

  
  // Extract all non space characters that were left after line extraction
  // as text objects.
  extractText() {
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        if (data[y][x] != ' ') {
          // Find the end of the text annotation by searching for a space.
          var start = x, end = x;
          while ((end < width) && (data[y][end] != " ")) end++;

          var text = data[y].getRange(start, end).join('');

          // Check if it can be concatenated with a previously found text annotation.
          var prev = figures[figures.length - 1];
          if ((prev is Text) && (prev.x0 + prev.text.length + 1) == start) {
            // If they touch concatentate them.
            prev.text = "${prev.text} $text";
          } else {
            // Look for a grey color modifiers.
            var color = "black";
            if (text.length > 2 &&
                text[0] == "\\" && 
                text[text.length - 1] == "\\") {
              text = text.substring(1, text.length - 1);
              color = "#666";
            }
            figures.add(new Text(x, y, text, color));
          }
          x = end;
        }
      }
    }
  }
  
  while (extractSplit());

  while (extractLine());  // Extract all lines.

  for (var p in findPoints(">")) {
    final line1 = figures.firstWhere((l) => l is Line && l.x0 == l.x1 && (l.x0 + 1) == p.x && (l.y1 + 1  == p.y), orElse: () => null);
    final line2 = figures.firstWhere((l) => l is Line && l.x0 == l.x1 && (l.x0 + 1) == p.x && (l.y0 - 1  == p.y), orElse: () => null);

    if (line1 != null && line2 != null) {
      figures.add(new Bracket(line1, p, line2));
      figures.remove(line1);
      figures.remove(line2);
      eraseChar(p.x, p.y, 0, 0);   
    }
  }
  
  extractText();  // Extract all text.

  return figures;
}


// Draw a diagram from the ascii art contained in the #textarea.
drawDiagram(html.PreElement el) {
  var figures = parseASCIIArt(el.text);
  
  el.style.display = 'none';
  
  var canvas = el.nextNode;
  if (canvas is! html.CanvasElement) {
    canvas = new html.CanvasElement()
      ..style.display = 'block';
    el.parentNode.insertBefore(canvas, el.nextNode);
  }

  var ctx = new ShakyCanvas(canvas);

  // Compute required canvas size.
  var width = 0;
  var height = 0;
  for (var figure in figures) {
    if (figure is Line) {
      width = math.max(width, X(figure.x1 + 1));
      height = math.max(height, Y(figure.y1 + 1));
    } else if (figure is Text) {
      final metrics = ctx.ctx.measureText(figure.text);
      width = math.max(width, X(figure.x0) + metrics.width.toInt());
      height = math.max(height, Y(figure.y0 + 1));
    }
  }

  canvas.width = width.toInt();
  canvas.height = height.toInt();

  ctx = new ShakyCanvas(canvas);

  for (var figure in figures) figure.draw(ctx);
}

refresh() {
  html.document.querySelectorAll("pre.shaky").forEach(drawDiagram);
}

void main() {
  js.context.WebFontConfig = js.map({
    "google": { "families": [ 'Gloria Hallelujah' ] },
    "active": refresh
  });

  var wf =
    new html.ScriptElement()
      ..src = '//ajax.googleapis.com/ajax/libs/webfont/1/webfont.js'
      ..type = 'text/javascript'
      ..async = true;
  var s = html.document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(wf, s);
}

