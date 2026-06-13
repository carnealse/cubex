class p {
	constructor(stickers, id, cube, pos, dim) {
		this.pos = pos;
		this.stickers = stickers;
		this.id = id;
		this.cube = cube;
		this.html = "";
		this.dim = dim;
		this.draw();
	}

	draw() {
		this.html = document.getElementById("cubie" + this.id);

		this.html.style.transform = this.cube.faces.reduce((transform, face, index) => {
			return transform + face.getTransform(this.pos[index] + 1, this.dim[index])
		}, "")

		let html = "";
		for (let face = 0; face < 3; face++) {
			for (let dir = -1; dir <= 1; dir += 2) {
				const sticker = this.stickers.filter(s => s.face === face && s.dir === dir)[0];
				const backgroundColor = sticker ? sticker.color : 'black';

				// don't draw black faces
				if (!sticker && !this.cube.settings.opaque) continue;
				const rotate = this.cube.faces[face].getRotate(dir)
				const styleString = `transform:${rotate};background-color:${backgroundColor};width:${this.cube.settings.cubeSize}px;height:${this.cube.settings.cubeSize}px;opacity:${this.cube.settings.opaque ? 1 : 0.7}`
				html += `<div style=${styleString} class='sticker'></div>`
			}
		}
		this.html.innerHTML = html;
	}

	rotate (side, dir) {
		const sides = [0,1,2].filter(s => s != side);
		if (dir == -1) sides.reverse();
		for (const sticker of this.stickers) {
			if (sides.includes(sticker.face)) {
				// go to the next sides
				const index = sides.indexOf(sticker.face);
				sticker.face = sides[(index+1)%2];
				if (index+1 == 2) {
					sticker.dir *= -1;
				}
			}
		}

		const x1 = [0,1,2].filter(s => s != side);
		const x2 = dir == 1 ? [
			(this.dim[x1[1]]-this.pos[x1[1]])-1,
			this.pos[x1[0]]
		] : [
			this.pos[x1[1]],
			this.dim[x1[0]]-this.pos[x1[0]]-1
		]
		this.pos[x1[0]] = x2[0];
		this.pos[x1[1]] = x2[1];

		const temp = this.dim[x1[0]];
		this.dim[x1[0]] = this.dim[x1[1]];
		this.dim[x1[1]] = temp;
	}
}
