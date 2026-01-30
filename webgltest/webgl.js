// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Getting_started_with_WebGL#preparing_the_webgl_context
import { initBuffers  } from "./initbuffers.js";
import { drawScene } from "./scene.js";
main();

let squareRotation = 0.0;
let dt = 0;


function main(){
    const canvas = document.querySelector("#canvas");

    //init gl canvas

    const gl = canvas.getContext("webgl");

    if(gl == null) return;

    gl.clearColor(1.0,0.0,0.0,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    //not string '', but backtick ``
    const VertexSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec4 vColor;

    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
        }
        `;
    const FragmentSource = `
        varying lowp vec4 vColor;

        void main(){
           gl_FragColor = vColor; 
        }`;

    const shaderProgram = initShaderProgram(gl,VertexSource,FragmentSource);

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
            vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        },
    };

    const buffers = initBuffers(gl);

    let t = 0;
    function render(now){
        now *= 0.001; //frames to seconds
        dt = now - t;
        t = now;

        drawScene(gl, programInfo, buffers, squareRotation);
        squareRotation += dt;

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function initShaderProgram(gl, VertexSource, FragmentSource){
    const vertexShader = loadShader(gl,gl.VERTEX_SHADER, VertexSource); 
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, FragmentSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if(!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)){
        return null;
    }
    return shaderProgram;
}

function loadShader(gl, type, source){
    const shader = gl.createShader(type);

    gl.shaderSource(shader,source);

    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
