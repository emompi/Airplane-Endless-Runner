
let simplex;
let simplex2;
let plane;
let geometry;
let noiseStrength;
let waveSpeed = 0.6;
let airplaneVelocity = 1;

//COLORS
var Colors = {
  red: 0xf25346,
  white: 0xd8d0d1,
  brown: 0x59332e,
  pink: 0xF5986E,
  brownDark: 0x23190f,
  blue: 0x68c3c0,
};

// THREEJS RELATED VARIABLES

var scene,
  camera, fieldOfView, aspectRatio, nearPlane, farPlane,
  renderer, container;

var firing = false;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH,
  mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS


var fogNear = 50;
var fogFar = 550;

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
  camera.position.y = 150;
  camera.position.z = 0;
  camera.lookAt(new THREE.Vector3(100, 00, 0));

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);
  renderer.shadowMap.enabled = true;
  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
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




// HANDLE SCREEN EVENTS

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}


// LIGHTS

var ambientLight, hemisphereLight, shadowLight;

function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9)
  shadowLight = new THREE.DirectionalLight(0xffffff, .9);
  shadowLight.position.set(50, 150, 50);
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


function setupPlane() {
  let side = 50;
  geometry = new THREE.PlaneGeometry(1300, 1500, side, side);
  let material = new THREE.MeshStandardMaterial({
    roughness: 0.8,
    color: new THREE.Color(0x32a871)
  });

  plane = new THREE.Mesh(geometry, material);
  plane.rotation.x = Math.PI / 2 * 3;
  // plane.rotation.y = Math.PI / 2 * 3;

  plane.position.x = 500;
  plane.position.y = 0;
  plane.position.z = 0;

  plane.castShadow = true;
  plane.receiveShadow = true;

  scene.add(plane);
}


function adjustVertices(offset) {
  for (let i = 0; i < plane.geometry.vertices.length; i++) {
    let vertex = plane.geometry.vertices[i];
    let x = vertex.x / xZoom;
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
  /*
  for (let i = 0; i < plane.geometry.vertices.length; i++) {
    let vertex = plane.geometry.vertices[i];
    let x = vertex.x / xZoom;
    let y = vertex.y / yZoom;
   // x /= xZoom2;
   // y /= yZoom2;
    let noise = simplex.noise2D(x, y + offset) * noiseStrength;
    vertex.z += noise;
  }
*/


  geometry.verticesNeedUpdate = true;
  geometry.computeVertexNormals();
}



// HANDLE MOUSE EVENTS

var mousePos = { x: 0, y: 0 };

function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH) * 2;
  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

window.addEventListener('load', init, false);