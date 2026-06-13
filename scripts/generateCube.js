onmessage = ({
  data: {
    dim
  }
}) => {
  console.log(dim);

  const pieces = [];
  let html = "<div id='theFace'></div>";

  const colors = [
    ["purple", "orange"],
    ["blue", "green"],
    ["yellow", "white"],
  ]

  const indices = [0, 0, 0];
  let failsafe = 0;
  const max = dim.reduce((a, c) => a * c);
  mainLoop: while (indices[0] < 1000) {
    if (failsafe++ > max + 1) break;
    const stickers = [];
    for (let i = 0; i < dim.length; i++) {
      const face = dim[i];
      console.log("Operation");

      // increase the dimension by one
      if (indices[i] >= face) {
        // we are on the last index of the last thing
        if (i == dim.length - 1) break mainLoop;
        indices[i] = 0;
        indices[i + 1]++;
      }

      // add a sticker if it is a sticker worthy position
      let sticker;
      if (indices[i] === 0) { // if it is an "left" edge
        sticker = {
          color: colors[i][0],
          face: i,
          dir: 1
        };
      } else if (indices[i] === dim[i] - 1) { // if it is the "right" edge
        sticker = {
          color: colors[i][1],
          face: i,
          dir: -1
        };
      }

      if (sticker) stickers.push(sticker);

    }

    if (stickers.length === 0) { // this was a middle piece
      indices[0]++;
      continue;
    }

    html += `<cubie id='cubie${pieces.length}'></cubie>`;
    const piece = {
      stickers,
      indices: indices.slice(0),
    }

    pieces.push(piece);
    indices[0]++;
  }
  const res = {
    pieces,
    html
  };
  postMessage(res);
};