const generateWorker = new Worker("scripts/generateCube.js");

class Cube {
	constructor() {
		this.settings = {
			opaque: true, // toggles on and off the opacity
			turnSpeed: 0.3,
			animate: true,
			cubeSize: 100,
			dim: [3, 3, 3]
		};
		this.deg = [155, 115, 0];
		this.html = document.getElementById("cube");
		this.inFace = [];
		this.onTurn = () => {};

		// generate worker response handler
		generateWorker.onmessage = this.generateLogic.bind(this);
	}

	generate() {
		generateWorker.postMessage({
			dim: this.settings.dim,
		});
	}

	generateLogic({
		data
	}) {
		console.log(data);
		this.p = [];
		this.faces = [
			new Face(0, this.settings.dim[0], ["purple", "orange"], "ik8 edyb", this), // RL face
			new Face(1, this.settings.dim[1], ["blue", "green"], "ghn wop ", this),
			new Face(2, this.settings.dim[2], ["yellow", "white"], "jf- ls;a", this) // UB face
		];
		this.html.innerHTML = data.html;
		for (let i = 0; i < data.pieces.length; i++) {
			const pi = data.pieces[i];
			this.p.push(new p(
				pi.stickers,
				i,
				this,
				pi.indices,
				this.settings.dim.slice(0),
			))
		}
		this.draw();
	}

	draw() {
		this.html.style.transform = `rotateX(${this.deg[0]}deg)rotateY(${
      this.deg[1]
    }deg)rotateZ(${this.deg[2]}deg)`;
	}

	emptyFaces() {
		for (let p of this.inFace) {
			this.html.appendChild(document.getElementById("cubie" + p.id));
		}
		this.inFace.forEach(p => p.draw());
		this.inFace = [];
		const face = document.getElementById("theFace");
		face.style.transition = "transform 0s";
		face.style.transform = "";
	}

	async randomTurn(cb) {
		const face = this.faces[~~(Math.random() * this.faces.length)];
		return face.randomTurn(cb);
	}

	// to do, make async see if quicker
	isSolved() {
		const ledger = {};
		for (const p of this.p) {
			for (const s of p.stickers) {
				const faceColor = this.faces[s.face].getColor(p.pos[s.face]);
				if (!(faceColor in ledger)) {
					ledger[faceColor] = s.color;
				} else if (ledger[faceColor] != s.color) {
					return false;
				}
			}
		}
		return true;
	}
}