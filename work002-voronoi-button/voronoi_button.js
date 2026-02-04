
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
const BOX = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1]
];
const colorSelected = "#FFFFFFCF";

let nCells = 1;
let colors = [];
let srcs = [];
let links = [];
let width = 400;
let height = 400;

let polygonList = [];
let imageList = [];

let cells;
let points = [];
let vel = [];

let mouX = 0;
let mouY = 0;
let isOnButton = false;
let isDOMContentLoaded = false;
let isChangingAttribute = false;
let isSetAttributeInitially = false;
let currentIndex = 0;

document.addEventListener('DOMContentLoaded',
  function() {
    isDOMContentLoaded = true;
  }
);

class VoronoiButton extends HTMLElement{

  constructor(){
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(svg);

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    svg.addEventListener('mouseover', () => {
      isOnButton = true;
    });

    svg.addEventListener('mouseleave', () => {
      for (let i=0; i<nCells; i++) {
        polygonList[i].setAttribute('fill', colors[i%colors.length]);
      }
      isOnButton = false;
    });

    svg.addEventListener('click', (e) => {
      window.open(
        links[currentIndex%links.length],
        'popup'
      );
    });

    svg.addEventListener('mousemove', (e) => {
      const rect = e.target.getBoundingClientRect();
      mouX = e.clientX - rect.left;
      mouY = e.clientY - rect.top;

      if (isOnButton) {
        for (let i=0; i<nCells; i++) {
          if (isInside([mouX/width, mouY/width], cells[i])) {
            polygonList[i].setAttribute('fill', colorSelected);
            currentIndex = i;
          } else {
            polygonList[i].setAttribute('fill', colors[i%colors.length]);
          }
        }
      }
    });

    while (polygonList.length<nCells) {
      createElements();
    }



    
    requestAnimationFrame(animate);
  }

  attributeChangedCallback(name, oldValue, newValue){
    isChangingAttribute = true;
    if (name === 'n'){
      nCells = newValue;

      // generate position and velocity
      let r = resetParams(nCells);
      points = r.points;
      vel = r.vel;
      cells = r.cells;

      while (polygonList.length>nCells) {
        removeElements();
      }

      while (polygonList.length<nCells) {
        createElements();
        let i = polygonList.length-1;
        setAttributes(i);
      }
    } else if (name === 'colors') {
      colors = newValue.replace(' ', '').split(',');
      for (let i=0; i<nCells; i++) {
        polygonList[i].setAttributeNS('http://www.w3.org/1999/xlink','href',colors[i%colors.length]);
      }
    } else if (name === 'srcs') {
      srcs = newValue.replace(' ', '').split(',');
      for (let i=0; i<nCells; i++) {
        imageList[i].setAttributeNS('http://www.w3.org/1999/xlink','href',srcs[i%srcs.length]);
      }
    } else if (name === 'links') {
      links = newValue.replace(' ', '').split(',');
    } else if (name === 'width') {
      width = newValue;
    } else if (name === 'height') {
      height = newValue;
    }

    isChangingAttribute = false;
  }
}
VoronoiButton.observedAttributes = ['n', 'srcs', 'colors', 'links', 'width', 'height'];
customElements.define('voronoi-button', VoronoiButton);

function animate() {

  if (isDOMContentLoaded && !isSetAttributeInitially && !isChangingAttribute) {

    // generate position and velocity
    let r = resetParams(nCells);
    points = r.points;
    vel = r.vel;
    cells = r.cells;

    for (let i=0; i<nCells; i++) {
      setAttributes(i);
      setClipPath(i);
    }
    isSetAttributeInitially = true;
  }

  if (isDOMContentLoaded && !isChangingAttribute) {
    physicalSimulation(points, vel);
    handlePointsOutOfRange(points);
    cells = calcCells(points, BOX);
    for (let i=0; i<nCells; i++) {
      setClipPath(i);
    }
  }

  requestAnimationFrame(animate);
}

function setClipPath(i) {
  let clipPathText = '';
  for (let j=0; j<cells[i].length; j++) {
    clipPathText += `${cells[i][j][0]*width}px ${cells[i][j][1]*height}px`;
    if (j!=cells[i].length-1) {
      clipPathText += ', ';
    }
    imageList[i].setAttribute('style', `clip-path: polygon(${clipPathText});`);
    polygonList[i].setAttribute('style', `clip-path: polygon(${clipPathText});`);
  }
}

function resetParams(nCells) {
  let points = [];
  let vel = [];
  for (let i=0; i<nCells; i++) {
    points.push([math.random(), math.random()]);
    vel.push([0, 0]);
  }
  let cells = calcCells(points, BOX);
  return {
    'points': points,
    'vel': vel,
    'cells': cells,
  }
}

function setAttributes(i) {
  imageList[i].setAttributeNS('http://www.w3.org/1999/xlink','href',srcs[i%srcs.length]);
  imageList[i].style.pointerEvents = "none";
  polygonList[i].setAttribute('points', `0,0 0,${height} ${width},${height} ${width},0`);
  polygonList[i].setAttribute('fill', colors[i%colors.length]);
}

function createElements() {
  const image = document.createElementNS('http://www.w3.org/2000/svg','image');
  imageList.push(image);
  svg.appendChild(image);
  const polygon = document.createElementNS("http://www.w3.org/2000/svg", 'polygon');
  polygonList.push(polygon);
  svg.appendChild(polygon);
}

function removeElements() {
  const polygon = polygonList.pop();
  const image = imageList.pop();
  svg.removeChild(polygon);
  svg.removeChild(image);
}



















//////////////////////////////////////////////////////////////////////////////




















// Reference
// A simple algorithm for 2D Voronoi diagrams by Edgar Programmator
// https://www.youtube.com/watch?v=I6Fen2Ac-1U

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

function physicalSimulation(points, vel) {
  for (let i=0; i<points.length; i++) {
    let acc1_ = [0,0]; // repulsion between each points
    for (let j=0; j<points.length; j++) {
      if (i != j) {
        let acc1j_diff = math.subtract(points[i], points[j]);
        let acc1j_mag = 0.0001/math.norm(acc1j_diff)**2;
        let acc1j_dir = normalize(acc1j_diff);
        acc1_ = math.add(acc1_, math.multiply(acc1j_mag, acc1j_dir));
      }
    }
    let acc2_ = math.multiply(-1, vel[i]); // damping with respect to velocity
    let acc3_ = math.multiply(0.01, math.subtract([0.5,0.5], points[i])); // gravity to center
    let acc = [0,0];
    acc[0] += acc1_[0] + acc2_[0] + acc3_[0];
    acc[1] += acc1_[1] + acc2_[1] + acc3_[1];
    vel[i] = math.add(vel[i], acc);
    points[i] = math.add(points[i], vel[i]);
  }
}

function handlePointsOutOfRange(points) {
  // warp points to opposite edge
  for (let i=1; i<points.length; i++) {
    if (points[i][0]<0) points[i][0] = 1;
    if (points[i][0]>1) points[i][0] = 0;
    if (points[i][1]<0) points[i][1] = 1;
    if (points[i][1]>1) points[i][1] = 0;
  }
}