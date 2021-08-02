
/*  
    Ocean code taken (and modified) from here :

    https://codepen.io/DonKarlssonSan/pen/deVYoZ


    Understanding of 3D scene, game loop, mouse controls and airplane model taken from here :

    https://tympanus.net/codrops/2016/04/26/the-aviator-animating-basic-3d-scene-threejs/

*/


let incrementSpeed = true; // set to false if you don't want the game to go faster and faster
let worldSpeed = 1.5; // set your initial game speed here
let worldAcceleration = 0.00008; // acceleration of game speed per frame. 0.00003 - 0.0001 is reasonable
let originalWorldSpeed = worldSpeed;

// ocean plane variables
let simplex;
let plane;
let geometry;
let noiseStrength;
let waveSpeed = 0.6;

// obstace creation variables
let baseTime = Math.floor(Date.now() * 0.001);
let canCreateObstacle = true;
let sphereMovingRight = true;
let gridType = 0;

// array for cube obstacles
let obstacles = [];
// array for cube obstacle (health). Handled in parallel to the array of cube obstacles
let obstaclePoints = [];
// array for sphere
let sphereList = [];
/*
// array for bullet holes
let bulletholeList = [];
*/

let airplane;
// player hitbox
let playerBox;

// binary to prevent automatic repeated firing
let firing = false;

// bullet arrays
let bulletsLeft = [];
let bulletsRight = [];

// on-screen text displays
let playerHealth = 10;
let score = 0;
let highScore = 0;
let text1;
let text2;
let text3;
let text4;
let text5;
let textCounter = 0;

// colors
let Colors = {
  red: 0xf25346,
  white: 0xd8d0d1,
  brown: 0x59332e,
  pink: 0xF5986E,
  brownDark: 0x23190f,
  blue: 0x68c3c0,
};

// THREEJS RELATED VARIABLES
let scene,
  camera, fieldOfView, aspectRatio, nearPlane, farPlane,
  renderer, container;

// SCREEN VARIABLES
let HEIGHT, WIDTH;

// HANDLE MOUSE EVENTS
var mousePos = { x: 0, y: 0 };

// controls
function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH) * 2;
  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

function setupControls() {
  //  raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, - 1, 0), 0, 10);

  let onKeyDown = function (event) {
    if (event.keyCode == 32 && firing == false) {
      createBullets();
      firing = true;
    }
  };
  let onKeyUp = function (event) {
    if (event.keyCode == 32) {
      firing = false;
    }
  };
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

// get random int
function RandomIntInRange(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

// INIT THREE JS, SCREEN AND MOUSE EVENTS
function createScene() {

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 33;
  nearPlane = 1;
  farPlane = 5000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );
  scene.fog = new THREE.FogExp2(0xffffff, 0.0021);
  //scene.fog = new THREE.Fog(0xffffff, fogNear, fogFar);
  camera.position.x = -250;
  camera.position.y = 70;
  camera.position.z = 0;
  camera.lookAt(new THREE.Vector3(100, 30, 0));

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;
  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
}



// HANDLE SCREEN EVENTS
function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

// LIGHTS
let ambientLight, hemisphereLight, shadowLight;

function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0x555555, 0x000000, 1)
  shadowLight = new THREE.DirectionalLight(0xffffff, 1);
  shadowLight.position.set(-150, 150, 50);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -400;
  shadowLight.shadow.camera.right = 400;
  shadowLight.shadow.camera.top = 400;
  shadowLight.shadow.camera.bottom = -400;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;

  scene.add(hemisphereLight);
  scene.add(shadowLight);
}

// set up ocean plane
function setupPlane() {
  let side = 45;
  geometry = new THREE.PlaneGeometry(1000, 1200, side, side);
  let material = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    color: new THREE.Color(0x32a871)
  });

  plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2 * 3;
  // plane.rotation.y = Math.PI / 2 * 3;

  plane.position.x = 100;
  plane.position.y = -30;
  plane.position.z = 0;

  plane.castShadow = true;
  plane.receiveShadow = true;

  scene.add(plane);
}

// create noise map to distort ocean plane
function setupNoise() {
  // By zooming y more than x, we get the
  // appearence of flying along a valley
  xZoom = 146;
  yZoom = 188;
  xZoom2 = 28;
  yZoom2 = 58;
  noiseStrength = 25;
  noiseStrength2 = 9;
  simplex = new SimplexNoise();
}

// change vertex height in ocean plane
function adjustVertices(offset) {
  for (let i = 0; i < plane.geometry.vertices.length; i++) {
    let vertex = plane.geometry.vertices[i];
    let x = vertex.x / xZoom + worldSpeed * worldSpeed * 2.4;
    let y = vertex.y / yZoom;

    let noise = simplex.noise2D(x + offset * waveSpeed, y) * noiseStrength;
    vertex.z = noise;
    // x /= xZoom2;
    // y /= yZoom2;
    noise = simplex.noise2D(x, y + offset) * noiseStrength2;
    vertex.z += noise;
  }
  geometry.verticesNeedUpdate = true;
  geometry.computeVertexNormals();
}

// functions to create player airplane
var AirPlane = function () {
  this.mesh = new THREE.Object3D();
  this.mesh.name = "airPlane";

  // Create the cabin
  var geomCockpit = new THREE.BoxGeometry(60, 50, 50, 1, 1, 1);
  var matCockpit = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
  var cockpit = new THREE.Mesh(geomCockpit, matCockpit);
  cockpit.castShadow = true;
  cockpit.receiveShadow = true;
  this.mesh.add(cockpit);

  // Create Engine
  var geomEngine = new THREE.BoxGeometry(20, 50, 50, 1, 1, 1);
  var matEngine = new THREE.MeshPhongMaterial({ color: Colors.white, shading: THREE.FlatShading });
  var engine = new THREE.Mesh(geomEngine, matEngine);
  engine.position.x = 40;
  engine.castShadow = true;
  engine.receiveShadow = true;
  this.mesh.add(engine);

  // Create Tailplane

  var geomTailPlane = new THREE.BoxGeometry(15, 20, 5, 1, 1, 1);
  var matTailPlane = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
  var tailPlane = new THREE.Mesh(geomTailPlane, matTailPlane);
  tailPlane.position.set(-35, 25, 0);
  tailPlane.castShadow = true;
  tailPlane.receiveShadow = true;
  this.mesh.add(tailPlane);

  // Create Wing

  var geomSideWing = new THREE.BoxGeometry(40, 8, 150, 1, 1, 1);
  var matSideWing = new THREE.MeshPhongMaterial({ color: Colors.red, shading: THREE.FlatShading });
  var sideWing = new THREE.Mesh(geomSideWing, matSideWing);
  sideWing.position.set(0, 0, 0);
  sideWing.castShadow = true;
  sideWing.receiveShadow = true;
  this.mesh.add(sideWing);

  // Propeller

  var geomPropeller = new THREE.BoxGeometry(20, 10, 10, 1, 1, 1);
  var matPropeller = new THREE.MeshPhongMaterial({ color: Colors.brown, shading: THREE.FlatShading });
  this.propeller = new THREE.Mesh(geomPropeller, matPropeller);
  this.propeller.castShadow = true;
  this.propeller.receiveShadow = true;

  // Blades

  var geomBlade = new THREE.BoxGeometry(1, 100, 20, 1, 1, 1);
  var matBlade = new THREE.MeshPhongMaterial({ color: Colors.brownDark, shading: THREE.FlatShading });

  var blade = new THREE.Mesh(geomBlade, matBlade);
  blade.position.set(8, 0, 0);
  blade.castShadow = true;
  blade.receiveShadow = true;
  this.propeller.add(blade);
  this.propeller.position.set(50, 0, 0);
  this.mesh.add(this.propeller);
};

function createAirplane() {
  airplane = new AirPlane();
  airplane.mesh.scale.set(.3, .3, .3);
  airplane.mesh.position.x = -50;
  airplane.mesh.position.y = 550;
  scene.add(airplane.mesh);
}

function updateAirplane() {
  var targetY = normalize(mousePos.y, -.5, .5, 25, 100);
  var targetX = normalize(mousePos.x, -.5, .5, -65, 65);

  // airplane.mesh.position.y += (targetY-airplane.mesh.position.y)*0.5;
  airplane.mesh.rotation.z = (targetY - airplane.mesh.position.y) * 0.0528;
  airplane.mesh.rotation.x = -(airplane.mesh.position.z - targetX) * 0.02;

  airplane.mesh.position.y = targetY;
  airplane.mesh.position.z = targetX;

  airplane.propeller.rotation.x += 0.4;
}

function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + (pc * dt);
  return tv;
}



// click to fire
window.addEventListener("mousedown", onMouseDown);

function onMouseDown() {
  createBullets();
}

function createBullets() {
  let bullet1 = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), new THREE.MeshBasicMaterial({
    color: "black"
  }));
  let bullet2 = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 4), new THREE.MeshBasicMaterial({
    color: "black"
  }));
  bullet1.position.z = airplane.mesh.position.z + 20;
  bullet1.position.y = airplane.mesh.position.y;
  bullet1.position.x = airplane.mesh.position.x + 4;
  bullet2.position.z = airplane.mesh.position.z - 20;
  bullet2.position.y = airplane.mesh.position.y;
  bullet2.position.x = airplane.mesh.position.x + 4;
  scene.add(bullet1);
  bulletsLeft.push(bullet1);
  scene.add(bullet2);
  bulletsRight.push(bullet2);
}

function updateBullets() {
  for (let i = bulletsLeft.length - 1; i > -1; i--) {
    b = bulletsLeft[i];
    b.position.x += 12;  // move for example in Z direction
    b.position.z -= 0.3;
    if (b.position.x > 600) {
      scene.remove(b);
      bulletsLeft.splice(i, 1);
    }
  }
  for (let i = bulletsRight.length - 1; i > -1; i--) {
    b = bulletsRight[i];
    b.position.x += 12;  // move for example in Z direction
    b.position.z += 0.3;
    if (b.position.x > 600) {
      scene.remove(b);
      bulletsRight.splice(i, 1);
    }
  }
}

// create 2x3 array that represents appearance of cube obstacles
function createObstacleGrid() {
  if (gridType > 0) {
    gridType--;
  } else {
    gridType = 3;
  }
  let obstacleGrid = [];

  if (gridType == 3) {

    for (let i = 0; i < 6; i++) {
      obstacleGrid[i] = RandomIntInRange(0, 7);
    }
  } else {
    for (let i = 0; i < 6; i++) {
      obstacleGrid[i] = 0;
    }
    obstacleGrid[RandomIntInRange(0, 5)] = RandomIntInRange(0, 6);
    obstacleGrid[RandomIntInRange(0, 5)] = RandomIntInRange(0, 6);
    obstacleGrid[RandomIntInRange(0, 5)] = RandomIntInRange(0, 6);
  }
  let result = obstacleGrid.every(function (o) {
    return o > 0;
  });

  if (result == true) {
    obstacleGrid[RandomIntInRange(0, 5)] = 4;
  }
  return obstacleGrid;
}

// create sphere "wrecking ball" obstacles
function createSphere() {

  let sphere = new THREE.Mesh(new THREE.SphereGeometry(30, 40, 20), new THREE.MeshBasicMaterial({
    color: "black"
  }));
  // sphere.scale.set(30, 30, 30);
  sphere.position.y = RandomIntInRange(50, 70);
  sphere.position.x = 700;
  sphere.position.z = RandomIntInRange(-90, 90);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  scene.add(sphere);
  sphereList.push(sphere);
}

// update spheres
function updateSphere() {
  sphereList.forEach(function (sphere) {

    if (sphere.position.z > 100) {
      sphereMovingRight = false;
    } else if (sphere.position.z < -100) {
      sphereMovingRight = true;
    }
    if (sphereMovingRight == true) {
      sphere.position.z += 2;
    } else {
      sphere.position.z -= 2;

    }
    sphere.position.x -= 2.4 * worldSpeed;
  })

  for (var i = sphereList.length - 1; i > -1; i--) {
    if (sphereList[i].position.x < -190) {
      scene.remove(sphereList[i]);
      sphereList.splice(i, 1);
    }
  }

};

// create cube obstacles
function createObstacles() {

  grid = createObstacleGrid();

  for (let i = 0; i < 6; i++) {
    if (grid[i] < 1) {
      let cube = new THREE.Mesh(new THREE.CubeGeometry(45, 45, 45), new THREE.MeshBasicMaterial({
        color: "red"
      }));
      //cube.scale.set(3, 3, 3);
      cube.position.z = -60 + 60 * (i % 3);
      cube.position.y = -100 - Math.floor(i / 3) * 60;
      cube.position.x = 700;
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      obstacles.push(cube);
      obstaclePoints.push(-2);
    } else if (grid[i] == 4) {
      let cube = new THREE.Mesh(new THREE.CubeGeometry(45, 45, 45), new THREE.MeshBasicMaterial({
        color: "red"
      }));
      //cube.scale.set(3, 3, 3);
      cube.position.z = -60 + 60 * (i % 3);
      cube.position.y = 100 - Math.floor(i / 3) * 60;
      cube.position.x = 700;
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      obstacles.push(cube);
      obstaclePoints.push(4);
    } else {
      let cube = new THREE.Mesh(new THREE.CubeGeometry(45, 45, 45), new THREE.MeshBasicMaterial({
        color: "black"
      }));
      // cube.scale.set(3, 3, 3);
      cube.position.z = -60 + 60 * (i % 3);
      cube.position.y = 100 - Math.floor(i / 3) * 60;
      cube.position.x = 700;
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
      obstacles.push(cube);
      obstaclePoints.push(-1);
    }
  }
}

// update cube obstacles
function updateObstacles() {

  for (var i = obstacles.length - 1; i > -1; i--) {
    obstacles[i].position.x -= 2.4 * worldSpeed;
    /*
     if (obstaclePoints[i] > -1){
       obstacles[i].rotation.y -= 0.01;
     }
     */
    if (obstacles[i].position.x < -190) {
      scene.remove(obstacles[i]);
      obstacles.splice(i, 1);
      obstaclePoints.splice(i, 1);
    }
  }
}

// check for collisions between obstacles and player
function checkCollision(array, type) {

  for (var i = array.length - 1; i > -1; i--) {
    o = array[i];
    if (
      o.position.x + 22 > playerBox.min.x &&
      o.position.x - 22 < playerBox.max.x &&
      o.position.z + 22 > playerBox.min.z &&
      o.position.z - 22 < playerBox.max.z &&
      o.position.y + 22 > playerBox.min.y &&
      o.position.y - 22 < playerBox.max.y
    ) {
      playerHealth--;
      textCounter = 60;
      // displayCollision();
      scene.remove(o);
      array.splice(i, 1);
      if (type != 'sphere') {
        obstaclePoints.splice(i, 1);
      }
    }
  }
}

// check for collisions between bullets and obstacles
function checkBulletCollision(array1, array2) {

  for (var i = array1.length - 1; i > -1; i--) {
    o = array1[i];
    for (var j = array2.length - 1; j > -1; j--) {
      b = array2[j];
      if (
        o.position.x - 22 < b.position.x &&
        o.position.z + 22 > b.position.z &&
        o.position.z - 22 < b.position.z &&
        o.position.y + 22 > b.position.y &&
        o.position.y - 22 < b.position.y
      ) {
        scene.remove(b);
        //  bulletHoles(b.position.x, b.position.y, b.position.z);
        array2.splice(j, 1);
        obstaclePoints[i]--;
      }
    }
    if (obstaclePoints[i] == 0) {
      score += 100;

      /*  for (var k=0; k < bulletholeList.length; k++) {
          b = bulletholeList[k];
          if (b.position.y <= o.position.y + 22 &&
            b.position.y >= o.position.y - 22 &&
            b.position.z <= o.position.z + 22 &&
            b.position.z >= o.position.z - 22 
          ){
            scene.remove(b);
            bulletholeList.splice(k, 1);
          }
        }
        */
      scene.remove(o);
      array1.splice(i, 1);
      obstaclePoints.splice(i, 1);
    }
  }
}

// display in-game text on-screen
function displayText(text, words, top, left, color) {
  text.style.position = "absolute";
  text.style.color = color;
  text.style.width = 100;
  text.style.height = 100;
  text.innerHTML = words;
  text.style.top = top + 'px';
  text.style.left = left + 'px';
  document.body.appendChild(text);
}

// reset game if player health falls to 0
function resetGame() {
  obstacles.forEach(function (b) {
    scene.remove(b);
  });
  obstacles = [];

  sphereList.forEach(function (b) {
    scene.remove(b);
  });
  sphereList = [];

  obstaclePoints.forEach(function (b) {
    scene.remove(b);
  });
  obstaclePoints = [];

  bulletsLeft.forEach(function (b) {
    scene.remove(b);
  });
  bulletsLeft = [];

  bulletsRight.forEach(function (b) {
    scene.remove(b);
  });
  bulletsRight = [];

  obstaclePoints = [];
  obstaclePoints = [];
  sphereList = [];
  bulletsLeft = [];
  bulletsRight = [];

  if (score > highScore) {
    highScore = Math.floor(score);
  }
  score = 0;
  playerHealth = 10;

  worldSpeed -= (worldSpeed - originalWorldSpeed);
}

/*
function bulletHoles(x, y, z) {

  let geometryCircle = new THREE.CircleGeometry( 5, 32 );
  let materialCircle = new THREE.MeshBasicMaterial( { color: 0x555555 } );
  let circle = new THREE.Mesh( geometryCircle, materialCircle );
  circle.rotation.y -= Math.PI / 2;
  circle.position.x = x - 22.01;
  circle.position.y = y;
  circle.position.z = z;
  scene.add( circle );
  bulletholeList.push(circle);
}

function updateBulletHoles() {

  for (var i = bulletholeList.length - 1; i > -1; i--) {
    bulletholeList[i].position.x -= 2.4 * worldSpeed;

    if (bulletholeList[i].position.x < -190) {
      scene.remove(bulletholeList[i]);
      bulletholeList.splice(i, 1);

    }
  }
}
*/

// initialize scene
function init(event) {
  document.addEventListener('mousemove', handleMouseMove, false);
  createScene();
  createLights();
  createAirplane();
  setupControls();
  setupNoise();
  setupPlane();

  playerBox = new THREE.Box3().setFromObject(airplane.mesh);

  text1 = document.createElement('div');
  text2 = document.createElement('div');
  text3 = document.createElement('div');
  text4 = document.createElement('div');
  text5 = document.createElement('div');

  loop();
}

// looping render function
function loop() {
  updateAirplane();
  updateBullets();
  updateObstacles();
  // updateBulletHoles();

  updateSphere();

  checkCollision(obstacles, 'obs');
  checkCollision(sphereList, 'sphere');

  checkBulletCollision(obstacles, bulletsLeft);
  checkBulletCollision(obstacles, bulletsRight);
  checkBulletCollision(sphereList, bulletsLeft);
  checkBulletCollision(sphereList, bulletsRight);

  playerBox = new THREE.Box3().setFromObject(airplane.mesh);
  // console.log(playerBox.min.x, playerBox.max.x);

  renderer.render(scene, camera);
  requestAnimationFrame(loop);

  let offset = Date.now() * 0.0004;
  offset += 0.01;
  adjustVertices(offset);

  // console.log(Math.floor(Date.now()* 0.001));
  if ((Math.floor(Date.now() * 0.001) - baseTime) % 2 == 0 && canCreateObstacle == true) {
    let obstacleType = RandomIntInRange(0, 4);
    if (obstacleType == 3 && sphereList.length == 0) {
      createSphere();
    } else {
      createObstacles();
    }
    canCreateObstacle = false;
  }

  if ((Math.floor(Date.now() * 0.001) - baseTime) % 2 == 1) {
    canCreateObstacle = true;
  }

  displayText(text1, 'Score : ' + Math.floor(score).toString(), 50, 50, 'black');
  displayText(text2, 'Health : ' + playerHealth.toString(), 70, 50, 'black');
  displayText(text3, 'High Score : ' + highScore.toString(), 50, WIDTH - 200, 'black');
  if (textCounter > 0) {
    displayText(text4, 'COLLISION!!!', 20, WIDTH / 2 - 30, 'red');
  } else {
    displayText(text4, null, 20, WIDTH / 2 - 30, 'red');
  }
  displayText(text5, 'Move with the mouse, and click or press Space to fire! Avoid obstacles! Shoot red obstacles for extra points!', HEIGHT - 30, WIDTH / 2 - 450, 'black');

  if (textCounter > 0) {
    textCounter--;
  }
  // console.log(textCounter);

  if (incrementSpeed == true) {
    worldSpeed += worldAcceleration;
  }

  score += 0.2;
  // console.log(obstaclePoints);

  if (playerHealth <= 0) {
    resetGame();
  }

}


window.addEventListener('load', init, false);


