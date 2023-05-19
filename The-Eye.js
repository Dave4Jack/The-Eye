const canvasSketch = require('canvas-sketch');
const math = require('canvas-sketch-util/math');
const random = require('canvas-sketch-util/random');
const colors = require('riso-colors');
const Tweakpane = require ('tweakpane');


const settings = {
  dimensions: [ 1080, 1080 ],
  animate: true
};

const params = {
  line: 5,
  figures: false,
  amp: 90,
  freq: 0.002,
  n: 5,
  grad: 30
}

let audio;
let audioContext, audioData, sourceNode, analyserNode;
const particles = [];
const cursor = {x:9999, y:9999};
let elCanvas;
const vectorx = [];
const vectory = [];
const shapeVect = [];

const sketch = ({ context, width, height, canvas}) => {

  const r = 350;
  const a = (Math.PI*2)/60;

  for (i = 0; i < 60; i++) { //creating external circle points
    const xcoord = Math.cos(a*i) * r;
    const ycoord = Math.sin(a*i) * r;
    vectorx.push(xcoord);
    vectory.push(ycoord);
  }

  for (i = 0; i < 4; i++){ //creating external shapes
    for (j = 0; j < 3; j++){
      shapeVect.push(new randomShapes(context, width, height, i));
    }
  } 

  const ncol = 16;
  const cellw = width / ncol;
  const cellh = height / ncol;

  let x, y, particle, radius;
  let pos = [];
  const numCircles = 6;
  const gapCircle = 8;
  const gapDot = 4;
  let dotRadius = 12;
  let cirRadius = 0;
  const fitRadius = dotRadius;

  elCanvas = canvas;
  canvas.addEventListener('mousemove', onMouseMove);

  for (i = 0; i < numCircles; i++) { //creating iris circles
    const circumference = Math.PI * 2 * cirRadius;
    const numFit = i ? Math.floor(circumference / (fitRadius*2 + gapDot)) : 0;
    const fitSlice = Math.PI * 2/ numFit;

    for (j = 0; j < numFit; j++) {
      const theta = fitSlice * j;
      x = Math.cos(theta) * cirRadius;
      y = Math.sin(theta) * cirRadius;
      x += width/2 - 20;
      y += height/2 + 60;
      radius = dotRadius;

      particle = new Particle(x, y, radius);
      particles.push(particle);
    }
    cirRadius += fitRadius * 2 + gapCircle;
    dotRadius = (i / numCircles) * fitRadius;
  }

  return ({ context, width, height, frame }) => {

    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);

    if (params.figures) {
      shapeVect.forEach(figure => {
        figure.update(context);
      })
    }
    
    if(!audioContext) return;

    analyserNode.getFloatFrequencyData(audioData);

    const map = math.mapRange(audioData[25], analyserNode.minDecibels, analyserNode.maxDecibels, 0, 1, true);

    if (map > 0.7) {
      for (i = 0; i < shapeVect.length; i++) {
        shapeVect[i].color = random.pick(colors).hex;
        shapeVect[i].update(context);
      }
    }

    for(i = 0; i < vectorx.length; i++) { //noise to extenal circle points
      let n = random.noise2D(vectorx[i] + frame*3, vectory[i], params.freq, params.amp);
      let nmap = math.mapRange(n, -90, 90, 1, params.n, true);
      let angle = math.degToRad(nmap);
      context.save();
      context.strokeStyle = 'white';
      context.lineWidth = params.line * random.range(0,1);
      context.translate(width/2 - 20, height/2 + 60);
      context.rotate(angle*params.grad);
      context.beginPath();
      context.moveTo(vectorx[i], vectory[i]);
      context.quadraticCurveTo((vectorx[i] - vectorx[i+1])/2 + n, (vectory[i] - vectory[i+1])/2 + n, vectorx[i+1], vectory[i+1],);
      context.stroke();
      context.restore();
    }

    context.save();
    context.translate(width/2 - 20, height/2 + 60);
    context.beginPath();
    context.arc(0, 0, 160, 0, Math.PI*2);
    context.fill();
    context.restore();

    particles.forEach(particle => {
      particle.update();
      particle.draw(context);
    })

    context.save();
    context.fillStyle = 'white';
    context.translate(width/2 - 20, height/2 + 60);
    context.beginPath();
    context.arc(0, 0, 5, 0, Math.PI*2);
    context.fill();
    context.restore();

    for (i = 0; i < 6; i++) {//creating pupil
      const mapForArc = math.mapRange(audioData[random.rangeFloor(0, 12)], analyserNode.minDecibels, analyserNode.maxDecibels, 0, 4, true);
      context.save();
      context.strokeStyle = 'white';
      context.translate(width/2 - 20, height/2 + 60);
      context.rotate(Math.PI/6 * random.range(0, 12));
      context.beginPath();
      if (i%2 == 0) {
        context.lineWidth = 2;
        context.arc(0, 0, 8 + i*10, 0, Math.PI/2 * mapForArc);
      }
      if (i%2 != 0) {
        context.lineWidth = 8;
        context.arc(0, 0, 8 + i*10, 0, Math.PI/2 * mapForArc);
      }
      context.stroke();
      context.restore();
    }

  };
};

onMouseMove = (e) => {
  const x = (e.offsetX / elCanvas.offsetWidth) * elCanvas.width;
  const y = (e.offsetY / elCanvas.offsetHeight) * elCanvas.height;

  cursor.x = x;
  cursor.y = y;
}

function isInside (dx, dy) {
    let x = dx;
    let y = dy;
    if (Math.sqrt(x*x + y*y) < 200) return true;
    else return false;
  }

const addListener = () => {
  window.addEventListener('mouseup', () => {
    if(!audioContext) createAudio();

    if (audio.paused) audio.play();
    else audio.pause();
  })
}

const createAudio = () => {
  audio = document.createElement('audio');
  audio.src = 'Your song - Same directory of the file js';

  audioContext = new AudioContext();
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(audioContext.destination); //speaker
  analyserNode = audioContext.createAnalyser();
  sourceNode.connect(analyserNode);
  audioData = new Float32Array(analyserNode.frequencyBinCount);
}

addListener(); 

const createPane = () => {
  const pane = new Tweakpane.Pane();
  let folder;

  folder = pane.addFolder({title: 'Settings'});
  folder.addInput(params, 'amp', {min: 1, max: 900, step:1});
  folder.addInput(params, 'freq', {min: 0.00001, max: 0.1, step:0.00001});
  folder.addInput(params, 'n', {min: 5, max: 100, step:1});
  folder.addInput(params, 'grad', {min: 1, max: 360, step:1});
  folder.addInput(params, 'line', {min: 1, max: 20, step:1});
  folder.addInput(params, 'figures');
}

createPane();

const start = async () => {
  canvasSketch(sketch, settings); 
}

start();

class randomShapes {

  constructor (context, width, height, i) {
    this.color = random.pick(colors).hex;
    let ix, fx, iy, fy;
    switch (i) {
    case 0: 
      ix = 0;
      iy = 0;
      fx = width/2;
      fy = height/2;
      break;
    case 1:
      ix = width/2;
      iy = 0;
      fx = width;
      fy = height/2;
      break;
    case 2:
      ix = 0;
      iy = height/2;
      fx = width/2;
      fy = height;
      break
    case 3:
      ix = width/2;
      iy = height/2;
      fx = width;
      fy = height;
      break
    }

    this.p1 = [random.rangeFloor(ix, fx), random.rangeFloor(iy, fy)];
    this.p2 = [random.rangeFloor(ix, fx), random.rangeFloor(iy, fy)];
    this.p3 = [random.rangeFloor(ix, fx), random.rangeFloor(iy, fy)]

    context.save();
    context.strokeStyle = 'black';
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.p1[0], this.p1[1]);
    context.lineTo(this.p2[0], this.p2[1]);
    context.lineTo(this.p3[0], this.p3[1]);
    context.closePath();
    context.clip();
    context.fill();
    context.restore(); 
  }

  update (context) {
    context.save();
    context.strokeStyle = 'black';
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.p1[0], this.p1[1]);
    context.lineTo(this.p2[0], this.p2[1]);
    context.lineTo(this.p3[0], this.p3[1]);
    context.closePath();
    context.clip();
    context.fill();
    context.restore();
  }

}

class Particle {

  constructor (x, y, r = 10) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.ax = 0;
    this.ay = 0;
    this.vx = 0;
    this.vy = 0;
    this.ix = x;
    this.iy = y;
    this.minDist = 100;
    this.dumpFactor = 0.95;
    this.pushF = 0.2;
    this.pullF = 0.04;
    
  }

  update () {
    let dx, dy, dd, distx, disty;

    dx = this.ix - this.x;
    dy = this.iy - this.y;
    this.ax = dx * this.pullF;
    this.ay = dy * this.pullF;

    dx = this.x - cursor.x;
    dy = this.y - cursor.y;
    dd = Math.sqrt(dx*dx + dy*dy);
    if (dd < this.minDist) {
      this.ax = dx * this.pushF;
      this.ay = dy * this.pushF;
    }
    this.vx += this.ax;
    this.vy += this.ay;
    this.vx *= this.dumpFactor;
    this.vy *= this.dumpFactor;
    this.x += this.vx;
    this.y += this.vy;

    distx = this.x - this.ix;
    disty = this.y - this.iy;

  }

  draw (context) {
    context.save();
    context.fillStyle = 'brown';
    context.translate(this.x, this.y);
    context.beginPath();
    context.arc(0, 0, this.r, 0, Math.PI*2);
    context.fill();
    context.restore();
  }
}