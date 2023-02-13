class Random {
  constructor(seed) {
    this.mt = [];
    this.mt[0] = seed;
    for (let i = 1; i < 624; i++) {
      this.mt[i] = ((1812433253 * (this.mt[i - 1] ^ (this.mt[i - 1] >>> 30))) + i) & 0xffffffff;
    }

    this.index = 624;
  }

  extractNumber() {
    if (this.index >= 624) {
      this.twist();
    }

    let y = this.mt[this.index];
    y = y ^ (y >>> 11);
    y = y ^ ((y << 7) & 2636928640);
    y = y ^ ((y << 15) & 4022730752);
    y = y ^ (y >>> 18);

    this.index++;
    return y;
  }

  twist() {
    for (let i = 0; i < 624; i++) {
      let y = (this.mt[i] & 0x80000000) + (this.mt[(i + 1) % 624] & 0x7fffffff);
      this.mt[i] = this.mt[(i + 397) % 624] ^ (y >>> 1);
      if (y % 2 !== 0) {
        this.mt[i] = this.mt[i] ^ 2567483615;
      }
    }
    this.index = 0;
  }

  random() {
    return (this.extractNumber() / 0xffffffff);
  }
}

let perm = new Uint8Array(512);
let p = new Uint8Array(256);
let grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];

function init(seed) {
  const random = new Random(seed)
  for (let i = 0; i < 256; i++) {
    p[i] = Math.abs(~~(random.random() * 256));
  }

  // To remove the need for index wrapping, double the permutation table length
  for (let i=0; i < 512; i++) {
    perm[i] = p[i & 255];
  }
}

function dot3(g, x, y, z) {
  return g[0]*x + g[1]*y + g[2]*z;
}

function perlinNoise3D(x, y, z) {
  // Find unit grid cell containing point
  let X = Math.floor(x) & 255;
  let Y = Math.floor(y) & 255;
  let Z = Math.floor(z) & 255;

  // Get relative xyz coordinates of point within that cell
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  let fade = function(t) {
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  };

  let lerp = function(a, b, t) {
    return (1.0-t)*a + t*b;
  }

  let u = fade(x),
    v = fade(y),
    w = fade(z);

  // Calculate a set of eight hashed gradient indices
  let n000 = perm[X + perm[Y + perm[Z  ]]] % 12;
  let n001 = perm[X + perm[Y + perm[Z+1]]] % 12;
  let n010 = perm[X + perm[Y+1+perm[Z  ]]] % 12;
  let n011 = perm[X + perm[Y+1+perm[Z+1]]] % 12;
  let n100 = perm[X+1+perm[Y + perm[Z  ]]] % 12;
  let n101 = perm[X+1+perm[Y + perm[Z+1]]] % 12;
  let n110 = perm[X+1+perm[Y+1+perm[Z  ]]] % 12;
  let n111 = perm[X+1+perm[Y+1+perm[Z+1]]] % 12;

  // Calculate noise contributions from each of the eight corners
  let gi000 = dot3(grad3[n000], x,   y,   z  );
  let gi001 = dot3(grad3[n001], x,   y,   z-1);
  let gi010 = dot3(grad3[n010], x,   y-1, z  );
  let gi011 = dot3(grad3[n011], x,   y-1, z-1);
  let gi100 = dot3(grad3[n100], x-1, y,   z  );
  let gi101 = dot3(grad3[n101], x-1, y,   z-1);
  let gi110 = dot3(grad3[n110], x-1, y-1, z  );
  let gi111 = dot3(grad3[n111], x-1, y-1, z-1);

  // Interpolate the results along axises
  return lerp(
    lerp(
      lerp(gi000, gi100, u),
      lerp(gi001, gi101, u), w),
    lerp(
      lerp(gi010, gi110, u),
      lerp(gi011, gi111, u), w),
    v);
}

const seed = 31;
const size = 512;

(
  function () {
    init(seed)
    let step = 0;
    setInterval(
      function updateMatrix() {
        let canvas = document.getElementById("canvas");
        let ctx = canvas.getContext("2d");

        let width_size = canvas.width / size;

        for (let row = 0; row < size; ++row) {
          for (let col = 0; col < size; ++col) {
            let value = perlinNoise3D(row / 64, col / 64, seed + 0.05 * step);
            value = (value + 1.0) / 2.0;
            if (value < 0.25) {
              ctx.fillStyle = `rgb(0, 105, 148)`
            } else if (value < 0.5) {
              ctx.fillStyle = 'rgb(0,154,23)';
            } else if (value < 0.75) {
              ctx.fillStyle = 'rgb(1,68,33)';
            } else {
              ctx.fillStyle = 'rgb(243, 246, 251)';
            }
            ctx.fillRect(row * width_size, col * width_size, width_size, width_size);
          }
        }
        step += 1
      }, 100)
  }
)()