class Face {
  constructor(side, depth, colors, keys, cube) {
    this.side = side;
    this.depth = depth;
    this.colors = colors;
    this.cube = cube;
    this.axis = ["z", "x", "y"][this.side];
    this.keys = keys;
  }

  getTransform(layer, n) {
    const translate = this.cube.settings.cubeSize / 2 * (n - 1) - (layer - 1) * this.cube.settings.cubeSize;
    return `translate${this.axis}(${translate}px)`;
  }

  getRotate(dir) {
    const rotateAxis = [false, "y", "x"][this.side];
    let translate = `translate(-50%,-50%)translate${this.axis}(${this.cube.settings.cubeSize/2 * dir}px)`;
    if (rotateAxis) translate += `rotate${rotateAxis}(90deg)`;
    return translate + ';'
  }

  isEdge(layer) {
    return layer == 0 || layer == this.depth - 1;
  }

  getColor(layer) {
    if (layer == 0) {
      return this.colors[0];
    } else {
      return this.colors[1];
    }
  }

  async randomTurn() {
    return this.turn([~~(Math.random() * this.depth)], Math.random() > .5 ? 1 : -1)
  }

  async turn(layers, dir) {
    let angle = dir == 1 ? 90 : -90;
    // dont know why this is necessary!!
    if (this.side == 1) angle *= -1;

    this.cube.emptyFaces();

    // get all the pieces on all the faces that are sent in the request
    this.cube.inFace = this.cube.p
      .filter(p => layers.includes(p.pos[this.side]))

    const face = document.getElementById("theFace")

    for (const p of this.cube.inFace) {
      face.appendChild(document.getElementById("cubie" + p.id));
      p.rotate(this.side, dir);
    }

    this.cube.onTurn(this, layers, dir);
    return new Promise((resolve) => {
      setTimeout(() => {
        if (this.cube.settings.animate) {
          face.style.transition = `transform ${this.cube.settings.turnSpeed}s`
          face.style.transform = `rotate${this.axis}(${angle}deg)`;
          face.addEventListener("transitionend", () => {
            this.cube.emptyFaces();
            resolve();
          })
        } else {
          this.cube.emptyFaces();
        }
      }, 1)
    })
  }

  keyPress(key, num) {
    if (!num || num == 0) num = 1; // move at least one layer
    const index = this.keys.indexOf(key);
    if (index == -1) return false;
    let layer = ~~(index / 2);
    const layers =
      layer == 0 ? Array.from(Array(num)).map((_, i) => i) :
      layer == 1 ? Array.from(Array(this.depth - 2)).map((_, i) => i + 1) :
      layer == 2 ? Array.from(Array(num)).map((_, i) => (this.depth - 1) - i) :
      layer == 3 ? Array.from(Array(this.depth)).map((_, i) => i) : [];
    const dir = index % 2 == 0 ? 1 : -1;
    this.turn(layers, dir);
    return true;
  }
}