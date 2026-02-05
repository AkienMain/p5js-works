document.addEventListener('DOMContentLoaded',
  function() {
    VoronoiButton.isDOMContentLoaded = true;
  }
);

class VoronoiButton extends HTMLElement{

  // static parameters
  static box = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1]
  ];
  static isDOMContentLoaded = false;

  constructor(){

    super();

    // member parameters
    ////////////////////////////////////////

    // parameters set in HTML
    this.nCells = 1;
    this.colors = [];
    this.colorSelected = '#FFFFFFCF';
    this.srcs = [];
    this.links = [];
    this.width = 100;
    this.height = 40;
    this.borderRadius = 2;
    this.thresholdSim = 0.001;

    // HTML elements
    this.div = document.createElement('div');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.polygonList = [];
    this.imageList = [];

    // voronoi data
    this.cells;
    this.points = [];
    this.vel = [];

    // state parameters
    this.mouX = 0;
    this.mouY = 0;
    this.isOnButton = false;
    this.isChangingAttribute = false;
    this.isSetAttributeInitially = false;
    this.index = 0;

    //////////////////////////////////////////////////////

    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(this.div);
    this.div.appendChild(this.svg);

    this.div.style.width = this.width + 'px';
    this.div.style.height = this.height + 'px';
    this.div.style.overflow = 'hidden';
    this.div.style.borderRadius = this.borderRadius + 'px';

    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    this.svg.addEventListener('mouseover', () => {
      this.isOnButton = true;
    });

    this.svg.addEventListener('mouseleave', () => {
      for (let i=0; i<this.nCells; i++) {
        this.polygonList[i].setAttribute('fill', this.colors[i%this.colors.length]);
      }
      this.isOnButton = false;
    });

    this.svg.addEventListener('mousemove', (e) => {
      const rect = e.target.getBoundingClientRect();
      this.mouX = e.clientX - rect.left;
      this.mouY = e.clientY - rect.top;

      if (this.isOnButton) {
        for (let i=0; i<this.nCells; i++) {
          if (isInside([this.mouX/this.width, this.mouY/this.height], this.cells[i])) {
            this.polygonList[i].setAttribute('fill', this.colorSelected);
            this.index = i;
          } else {
            this.polygonList[i].setAttribute('fill', this.colors[i%this.colors.length]);
          }
        }
      }
    });

    while (this.polygonList.length<this.nCells) {
      this.createElements();
    }

    requestAnimationFrame(this.animate);
  }

  attributeChangedCallback(name, oldValue, newValue){

    this.isChangingAttribute = true;

    if (name === 'n-cells'){
      this.nCells = newValue;

      this.resetVoronoiData();

      while (this.polygonList.length>this.nCells) {
        this.removeElements();
      }

      while (this.polygonList.length<this.nCells) {
        this.createElements();
        this.setAttributes(this.polygonList.length-1);
      }

    } else if (name === 'colors') {
      this.colors = newValue.replace(' ', '').split(',');
      for (let i=0; i<this.nCells; i++) {
        this.polygonList[i].setAttributeNS('http://www.w3.org/1999/xlink','href', this.colors[i%this.colors.length]);
      }
    } else if (name === 'color-selected') {
      this.colorSelected = newValue;
    } else if (name === 'srcs') {
      this.srcs = newValue.replace(' ', '').split(',');
      for (let i=0; i<this.nCells; i++) {
        this.imageList[i].setAttributeNS('http://www.w3.org/1999/xlink','href', this.srcs[i%this.srcs.length]);
      }
    } else if (name === 'width') {
      this.width = newValue;
      this.div.style.width = this.width + 'px';
    } else if (name === 'height') {
      this.height = newValue;
      this.div.style.height = this.height + 'px';
    } else if (name === 'border-radius') {
      this.borderRadius = newValue;
      this.div.style.borderRadius = this.borderRadius + 'px';
    } else if (name === 'threshold-sim') {
      this.thresholdSim = newValue;
    }

    this.isChangingAttribute = false;

  }

  animate = () => {

    if (VoronoiButton.isDOMContentLoaded && !this.isSetAttributeInitially && !this.isChangingAttribute) {

      this.resetVoronoiData();

      for (let i=0; i<this.nCells; i++) {
        this.setAttributes(i);
        this.setClipPath(i);
      }
      this.isSetAttributeInitially = true;

    }

    if (VoronoiButton.isDOMContentLoaded && !this.isChangingAttribute) {

      let totalSpeed = 0;
      for (let i=0; i<this.nCells; i++) {
        totalSpeed += (this.vel[i][0]**2 + this.vel[i][1]**2)**(1/2);
      }
      if (totalSpeed > this.thresholdSim) {
        physicalSimulation(this.points, this.vel);
        handlePointsOutOfRange(this.points);
        this.cells = calcCells(this.points, VoronoiButton.box);
        for (let i=0; i<this.nCells; i++) {
          this.setClipPath(i);
        }
      }
    }

    requestAnimationFrame(this.animate);
  }

  setClipPath(i) {
    let clipPathText = '';
    for (let j=0; j<this.cells[i].length; j++) {
      clipPathText += `${this.cells[i][j][0]*this.width}px ${this.cells[i][j][1]*this.height}px`;
      if (j!=this.cells[i].length-1) {
        clipPathText += ', ';
      }
      this.imageList[i].setAttribute('style', `clip-path: polygon(${clipPathText});`);
      this.polygonList[i].setAttribute('style', `clip-path: polygon(${clipPathText});`);
    }
  }

  setAttributes(i) {
    this.imageList[i].setAttributeNS('http://www.w3.org/1999/xlink','href', this.srcs[i%this.srcs.length]);
    this.imageList[i].style.pointerEvents = 'none';
    this.polygonList[i].setAttribute('points', `0,0 0,${this.height} ${this.width},${this.height} ${this.width},0`);
    this.polygonList[i].setAttribute('fill', this.colors[i%this.colors.length]);
  }

  createElements() {
    const image = document.createElementNS('http://www.w3.org/2000/svg','image');
    this.imageList.push(image);
    this.svg.appendChild(image);
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    this.polygonList.push(polygon);
    this.svg.appendChild(polygon);
  }

  removeElements() {
    const polygon = this.polygonList.pop();
    const image = this.imageList.pop();
    this.svg.removeChild(polygon);
    this.svg.removeChild(image);
  }

  resetVoronoiData() {
    let points = [];
    let vel = [];
    for (let i=0; i<this.nCells; i++) {
      points.push([math.random(), math.random()]);
      vel.push([math.random(), math.random()]);
    }
    this.points = points;
    this.vel = vel;
    this.cells= calcCells(this.points, VoronoiButton.box);
  }

}
VoronoiButton.observedAttributes = ['n-cells', 'colors', 'color-selected', 'srcs', 'width', 'height', 'border-radius', 'threshold-sim'];
customElements.define('voronoi-button', VoronoiButton);











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