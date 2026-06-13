class Controller {
  constructor(c) {
    this.settings = {
      // -1 means that there is no inspection time
      // otherwise it is just time in seconds
      inspectionTime: 15,
      turnsPerScramble: 50,
      scrambleSpeed: 0.01,
      showScrambleAnimation: false
    }
    this.cube = c;
    this.cubeState = 0;
    document.body.addEventListener("keydown", (e) => this.keyDown(e));
    document.body.addEventListener("keyup", (e) => this.keyup(e));
  }

  async scramble() {
    const oldSpeed = this.cube.settings.turnSpeed;
    const oldShouldAnimate = this.cube.settings.animate;
    this.cube.settings.turnSpeed = this.settings.scrambleSpeed;
    this.cube.settings.animate = false;
    for (let i = 0; i < this.settings.turnsPerScramble; i++) {
      if (this.settings.showScrambleAnimation) {
        await this.cube.randomTurn();
      } else {
        this.cube.randomTurn();
      }
    }
    setTimeout(() => {
      this.cube.settings.animate = oldShouldAnimate;
      this.cube.settings.turnSpeed = oldSpeed;
    }, 1);

    this.cubeState = 1;
    if (this.settings.inspectionTime != -1) {
      this.startInspection();
    }
    this.cube.onTurn = (face, layers, _dir) => {
      // if not a rotation
      if (face.depth != layers.length && this.cubeState == 1) {
        this.startTimer();
        this.cubeState = 2;
      }

      if (this.cubeState == 2 && this.cube.isSolved()) {
        clearInterval(this.timer);
        this.cubeState = 0;
      }
    }
  }

  startInspection() {
    const startTime = new Date();
    this.inspectionTimer = setInterval(() => {
      const currentTime = new Date();
      const pass = (currentTime - startTime) / 1000;
      const left = (this.settings.inspectionTime - pass).toFixed(2);
      if (left < 0) {
        this.cubeState = 2;
        this.startTimer();
      }
      const timeStr = `Time Left:\n${left}`;
      document.getElementById("time").innerHTML = timeStr;
    })
  }

  startTimer() {
    clearInterval(this.inspectionTimer);
    const startTime = new Date();
    this.timer = setInterval(() => {
      const currentTime = new Date();
      const pass = currentTime - startTime;
      const passFormatted = (pass/ 1000).toFixed(2);
      const timeStr = `Time:\n${passFormatted}`;
      document.getElementById("time").innerHTML = timeStr;
    },100)
  }

  keyDown(event) {
    const key = event.key;
    if (+key) this.numPress = +key;
    if (key === "Shift" && this.cubeState === 0) this.scramble();

    this.cube.deg[0] += key === "ArrowUp" ? 5 : key === "ArrowDown" ? -5 : 0;
		this.cube.deg[1] += key === "ArrowLeft" ? 5 : key === "ArrowRight" ? -5 : 0;
    this.cube.deg[2] += key === "PageUp" ? 5 : key === "PageDown" ? -5 : 0;
    this.cube.draw();

    if (key != " ") {
      for (const f of this.cube.faces) {
        f.keyPress(key, this.numPress);
      }
    }
  }

  keyup(event) {
    if (+event.key) this.numPress = null;
  }
}