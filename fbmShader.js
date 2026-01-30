let canvas; 
let gl;

function resize(){
    let displayWidth = canvas.clientWidth;
    let displayHeight = canvas.clientHeight;
    canvas.width = displayWidth;
    canvas.height = displayHeight

    if(gl != null){
        gl.viewport(0,0,canvas.width,canvas.height);
    }
}

function GetRandomFloat(min, max){
    let range = max - min;
    return Math.random() * range + min;
}

function init(){
    canvas = document.getElementById("canvas");
    if(canvas == null){
        console.error("canvas null!");
        return;
    }
    gl = canvas.getContext("webgl");
    if(gl == null){
        console.error("webgl null!!!");
        return;
    }
    resize();
    window.addEventListener('resize', resize);

    //lots of shader functions inspired/taken from inigo quilez

    const Vert = 
    `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vPosition;
        void main(){
            gl_Position = vec4(aPosition, 0.0, 1.0);
            vPosition = gl_Position.xy;
        }
    `;

    const Frag = 
    `
    precision highp float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 iRands;

    #define numOctaves 3
    
    int randomOctave(in float x)
    {
        return int(floor(x));
    }
    
    vec2 hash(in vec2 x)
    {
        vec2 k = vec2(abs(iRands.x) + 1.0,abs(iRands.y) + 1.0);
        // vec2 k = vec2(4.51985902198,4.4190285909);
        x = x*k + k.yx;
        return -1.0 + 2.0 * fract(0.125 * k * (x.x*x.y *(x.x + x.y)));
    }

    vec3 gradientNoise(in vec2 x)
    {
        vec2 i = floor(x);
        vec2 f = fract(x);
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        vec2 du = 6.0 * f * (1.0 - f);

        vec2 ga = hash(i + vec2(0.0,0.0));
        vec2 gb = hash(i + vec2(1.0,0.0));
        vec2 gc = hash(i + vec2(0.0, 1.0));
        vec2 gd = hash(i + vec2(1.0,1.0));

        float va = dot(ga, f - vec2(0.0,0.0));
        float vb = dot(gb, f - vec2(1.0,0.0));
        float vc = dot(gc, f - vec2(0.0,1.0));
        float vd = dot(gd, f - vec2(1.0,1.0));

        return vec3( va + u.x*(vb-va) + u.y*(vc-va) + u.x*u.y*(va-vb-vc+vd),
                 ga + u.x*(gb-ga) + u.y*(gc-ga) + u.x*u.y*(ga-gb-gc+gd) + 
                 du * (u.yx*(va-vb-vc+vd) + vec2(vb,vc) - va));

    }

    //input  and Hurst exponent
    //fractal dimension and power spectrum
    //integrate white noise fractionally, given values 0 to 1
    //H = 0 decays slower per octave and is equivalent to pink noise
    //H = 1/2 decays faster and has less high frequencies
    // H = 1 decays fastest, lowest frequency

    float fbm(in vec2 x, in float H)
    {
        // exponential decay of Hurst 
        float gain = exp2(-H);
        // wavelength 
        float freq = 1.0;
        float amplitude = 1.0;
        // output 
        float value = 0.0;
        for(int i = 0; i < numOctaves; i++)
        {
            value += gradientNoise(freq * x).x * amplitude;
            // each "octave" is twice the frequency
            freq *= 2.0;
            amplitude *= gain;
        }
        return value;
    }
    
    float warp(in vec2 p, in float H)
    {
        vec2 q = vec2(fbm(p + vec2(0.0,0.0), H), fbm(p + vec2(0.0,0.0),H));

        return fbm(p + q,H);
    }
    
    //nested fractal brownian motions
    float dualWarp(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
            
        //modulating input for fbm, vec2 additions are offsets
        q.x = 
            fbm(p 
                + vec2(iRands.w + iTime * 0.05 * iRands.x,
                0.0 + iTime *0.05 * iRands.y),H);
        q.y = 
            fbm(p 
                + vec2(iRands.y + iTime *0.05 * iRands.z, 
                0.0 + iTime * 0.05 * iRands.w),H);

        r.x = 
            fbm(p + ((4.0 * fbm(vec2(iRands.x * iTime * 0.01, iRands.y * iTime * 0.01),H)) * q) 
                + vec2(
                1.0,
                1.0), H);
        r.y = 
            fbm(p + ((4.0 * fbm(vec2(iRands.w * iTime * 0.01, iRands.z * iTime * 0.01),H)) * q) 
                + vec2(
                1.0,
                1.0), H);

        return fbm(p + 4.0 * r, H);
    }

    float dualWarp2(in vec2 p, in float H, out vec2 q, out vec2 r)
    {
        q.x = 
            fbm(p + vec2(0.0,0.0), H);
        q.y = 
            fbm(p + vec2(0.0,0.0),H);
        
        r.x = 
            fbm(p + 4.0 * q,H);

        r.y = 
            fbm(p + 4.0 * q,H);
        
        return fbm(p + 4.0 * r, H);
    }

    //what we see

    void frag(out vec4 fragColor, in vec2 fragCoord){
        vec2 uv = fragCoord / iResolution.xy;

        float speed = 0.1;
        vec2 dir = vec2(-1.0,1.0);
        vec2 scale = vec2(10.0,10.0);

        float basicFbm = fbm(uv, 0.5);

        vec2 animate = vec2(dir.x * iTime * speed, dir.y * iTime * speed);

        float scrollingFbm = fbm(vec2(uv.x + animate.x, uv.y + animate.y), 0.5);

        float zoomingFbm = fbm(vec2(uv.x * animate.x, uv.y * animate.y), 0.5);

        float scaledFbm = fbm(vec2(uv.x * scale.x, uv.y * scale.y),1.0);

        //output values from nested fbm
        vec2 q; vec2 r; vec2 p; vec2 g;

        float basicDualWarp = dualWarp(uv, 0.05, q, r);
        float scaledDualWarp = dualWarp(uv * scale, 0.9, q,r);

        float basicWarp = warp(uv,0.05);


        float gain = 2.0;
        float min = 0.0;
        vec3 col = vec3(1.0,0.2,0.3);
        vec3 col2 = vec3(fbm(r,1.0),fbm(q,1.0),fbm(r * q, 1.0));
        col = mix(col, vec3(0.05, 0.1, 0.3), 0.5 * smoothstep(0.5,1.5,abs(r.y) + abs(r.x)));
        col = mix(col, vec3(0.2, 0.125, 0.03), 0.5 * smoothstep(1.1,1.2,abs(p.y) + abs(p.x)));
        col *= basicDualWarp * gain;
        col += min;

        fragColor = vec4(col,1.0);
    }

    void main(){
        frag(gl_FragColor, gl_FragCoord.xy);
    }
    `;

    const program = CreateShader(gl, Vert, Frag);
    if(program == null) {
        console.error("shader is null!");
        return;
    }

    gl.useProgram(program);

    const position = gl.getAttribLocation(program, 'aPosition');
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0,0);

    const resolution = gl.getUniformLocation(program, 'iResolution');
    const time = gl.getUniformLocation(program, 'iTime');
    const randomFloats = gl.getUniformLocation(program, 'iRands');

    gl.uniform4f(randomFloats, GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0), GetRandomFloat(-1.0,1.0));

    function render(t){
        t *= 0.001;
        resize();
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolution, canvas.width, canvas.height);
        gl.uniform1f(time, t);
        gl.drawArrays(gl.TRIANGLES, 0,6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

function CreateShader(gl, vertSource, fragSource)
{
    const vertex = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertex,vertSource);
    gl.compileShader(vertex);

    const fragment = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragment,fragSource);
    gl.compileShader(fragment);

    const shader = gl.createProgram();
    gl.attachShader(shader, vertex);
    gl.attachShader(shader, fragment);
    gl.linkProgram(shader);

    return shader;

}

document.addEventListener('DOMContentLoaded', init);
