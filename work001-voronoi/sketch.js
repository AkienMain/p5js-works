// Reference
// A simple algorithm for 2D Voronoi diagrams by Edgar Programmator
// https://www.youtube.com/watch?v=I6Fen2Ac-1U

let sk1; // sketch1
let sk2; // sketch2

let boxW = 600;
let boxH = 400;
let box = [
  [0, 0],
  [boxW, 0],
  [boxW, boxH],
  [0, boxH]
];
let nPoints1 = 8;
let points1 = [];
let vel1 = [];
let cells1 = [];

let nPoints2 = 200;
let points2 = [];
let cells2 = [];




/////////////////////////////////

new p5( function ( sketch ) {

  sk1 = sketch;

  sketch.setup = function() {
    this.canvas = this.createCanvas(boxW, boxH);
    this.canvas.style('border-radius', '16px');
    this.canvas.parent('canvas1');

    // generate position and velocity
    for (let i=0; i<nPoints1; i++) {
      points1.push([math.random(), math.random()]);
      vel1.push([math.random(-0.005, 0.005), math.random(-0.005, 0.005)]);
    }
  }

  sketch.draw = function() {

    if (this.windowHeight > this.windowWidth) {
      boxW = this.windowWidth-40;
      boxH = (this.windowHeight-150)/2;
    } else {
      boxW = (this.windowWidth-40)/2;
      boxH = this.windowHeight-150;
    }
    this.resizeCanvas(boxW, boxH);

    // update points
    for (let i=1; i<points1.length; i++) {
      points1[i][0] += vel1[i][0];
      points1[i][1] += vel1[i][1];
      if (points1[i][0]<0) points1[i][0] = 1;
      if (points1[i][0]>1) points1[i][0] = 0;
      if (points1[i][1]<0) points1[i][1] = 1;
      if (points1[i][1]>1) points1[i][1] = 0;
    }
    points1[0] = [this.mouseX/boxW, this.mouseY/boxH];
    if (points1[0][0]<0) points1[0][0] = 0;
    if (points1[0][0]>1) points1[0][0] = 1;
    if (points1[0][1]<0) points1[0][1] = 0;
    if (points1[0][1]>1) points1[0][1] = 1;

    // calculate cells
    cells1 = calcCells(points1, box);

    drawVoronoi(points1, cells1, boxW, boxH, this);

    // points
    this.strokeWeight(0);
    this.fill("#FF7F7F");
    this.ellipse(points1[0][0]*boxW, points1[0][1]*boxH, 16, 16);
  }
});

new p5( function ( sketch ) {

  sk2 = sketch;

  sketch.setup = function() {
    this.canvas = this.createCanvas(boxW, boxH);
    this.canvas.style('border-radius', '16px');
    this.canvas.parent('canvas2');
    // generate position
    for (let i=0; i<nPoints2; i++) {
      points2.push([math.random(), math.random()]);
    }
    // calculate cells
    cells2 = calcCells(points2, box);
  }

  sketch.draw = function() {
    this.resizeCanvas(boxW, boxH);
    // draw
    drawVoronoi(points2, cells2, boxW, boxH, this);
  }
});


//////////////////////////////////////////

function ortho(p) {
  return [p[1], -p[0]];
}

function normalize(v) {
  return  math.divide(v, math.norm(v));
}

function cross2d(v0, v1) {
  return  v0[0]*v1[1]-v0[1]*v1[0];
}

function getDir(points) {
  let dir = [];
  let l = points.length;
  for (let i=0; i<l; i++) {
    let d = normalize(math.subtract(points[math.mod(i+1,l)], points[i]));
    dir.push(d);
  }
  return dir;
}

function getScale(points) {
  let sca = [];
  let l = points.length;
  for (let i=0; i<l; i++) {
    let s = math.norm(math.subtract(points[math.mod(i+1,l)], points[i]));
    sca.push(s);
  }
  return sca;
}

function getIntersectionCoef(p0, p1, v0, v1) {
  return cross2d(math.subtract(p1, p0), v1)/cross2d(v0, v1);
}

function getIntersection(p0, p1, v0, v1) {
  return math.add(p0, math.multiply(getIntersectionCoef(p0, p1, v0, v1), v0));
}

function getBisectorPoint(p0, p1) {
  return math.divide(math.add(p0,p1), 2);
}

function getBisectorDir(p0, p1) {
  return ortho(normalize(math.subtract(p1, p0)));
}

function isInside(p, cell) {
  let pointSide = true;
  let isChanged = false;
  let l = cell.length;
  for (let i=0; i<l; i++) {
    let vec_to_p = math.subtract(p, cell[i]);
    let vec_edge = getDir(cell)[i];
    let sideBool = (cross2d(vec_edge, vec_to_p)<0);
    if (i == 0) {
      pointSide = sideBool;
    }
    if (pointSide != sideBool) {
      isChanged = true;
      pointSide = sideBool;
    }
  }
  return !isChanged;
}

function calcIntersects(cell, p, q) {
  let cellDirs = getDir(cell);
  let cellScales = getScale(cell);
  let bi = getBisectorPoint(p, q);
  let biDir = getBisectorDir(p, q);
  let count = 0;
  let indices = [];
  let l = cell.length;
  for (let i=0; i<l; i++) {
    let coef = getIntersectionCoef(cell[i], bi, cellDirs[i], biDir);
    // inside of line segment
    if (coef >= 0 && coef < cellScales[i]) {
      count += 1;
      indices.push(i);
    }
  }
  return [count, indices];
}

function divideCell(cell, newPoints, indices) {
  let newCells = [[],[]];
  let currentCell = 0;
  let l = cell.length;
  for (let i=0; i<l; i++) {
    newCells[currentCell].push(cell[i]);
    if (i == indices[0]) {
      newCells[0].push(newPoints[0]);
      newCells[1].push(newPoints[0]);
      currentCell = 1;
    }
    if (i == indices[1]) {
      newCells[0].push(newPoints[1]);
      newCells[1].push(newPoints[1]);
      currentCell = 0;
    }
  }
  return newCells;
}

function updateCell(indices, cell, p, q) {
  let cellDirs = getDir(cell);
  let bi = getBisectorPoint(p, q);
  let biDir = getBisectorDir(p, q);
  let newPoints = [];
  for (let i of indices) {
    newPoints.push(getIntersection(cell[i], bi, cellDirs[i], biDir));
  }
  let newCells = divideCell(cell, newPoints, indices);
  return isInside(p, newCells[0]) ? newCells[0] : newCells[1];
}

function calcCells(points, cellInput) {
  let cells = [];
  let l = points.length;
  for (let iP=0; iP<l; iP++) {
    let p = points[iP];
    let cell = [...cellInput];
    for (let iQ=0; iQ<l; iQ++) {
      if (iP != iQ) {
        let q = points[iQ];
        let res = calcIntersects(cell, p, q);
        if (res[0] == 2) {
          cell = updateCell(res[1], cell, p, q);
        }
      }
    }
    cells.push(cell);
  }
  return cells;
}

function closeConvex(pointsInput) {
  let points = [...pointsInput];
  points.push(points[0]);
  return points;
}

function listRound(list, digit) {
  res = []
  for (let i=0; i<list.length; i++) {
    res.push(math.round(list[i], digit));
  }
  return  res;
}

function drawVoronoi(points, cells, boxW, boxH, sketch) {
  sketch.background("#1F1F1F");
  // points
  sketch.strokeWeight(0);
  sketch.fill("#00FF00");
  for (let i=0; i<points.length; i++) {
    sketch.ellipse(points[i][0]*boxW, points[i][1]*boxH, 10, 10);
  }
  // cells
  sketch.strokeWeight(1);
  sketch.stroke("#00FF00");
  for (let i=0; i<cells.length; i++) {
    let cellShow = closeConvex(cells[i]);
    for (let j=0; j<cellShow.length-1; j++) {
      sketch.line(cellShow[j][0]*boxW, cellShow[j][1]*boxH, cellShow[j+1][0]*boxW, cellShow[j+1][1]*boxH);
    }
  }
}