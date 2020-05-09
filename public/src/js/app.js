let ctx;
let source;
let recorder;
let recordData = [];

let frequency;
let amplitude;

// register service worker if it is supported
if ('serviceWorker' in navigator) {
    // Notice: url is relative to root, not relative to this file (../sw.js did not work)
    navigator.serviceWorker.register('/tone-generator-pwa/sw.js')
        .then(reg => {
            console.log('service worker registered', reg);
        }).catch(err => {
            console.error('service worker not registered', err);
    });
}

// webkit prefix for Safari and older browser versions
const AudioContext = window.AudioContext || window.webkitAudioContext;
if (!AudioContext) {
    alert("Sorry, but your browser sucks! You should upgrade it or use Google Chrome or Mozilla Firefox.");
    throw new Error("Web Audio not supported!");
}

// update for initial slider values
onFrequencyChanged();
onAmplitudeChanged();

function onFrequencyChanged() {
    const slider = document.getElementById("frequencySlider");
    frequency = slider.value;
    const label = document.getElementById("frequencyLabel");
    label.innerText = frequency + " Hz";
}

function onAmplitudeChanged() {
    const slider = document.getElementById("amplitudeSlider");
    amplitude = slider.value / 100.0;
    const label = document.getElementById("amplitudeLabel");
    label.innerText = "" + amplitude;
}

function start() {
    // stop before re-starting to avoid multiple playbacks at once
    stop();

    // simply re-generate for each start
    // could optimize later
    const buffer = generateTone();
    if (!buffer) {
        return;
    }

    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination); // connect for playback

    // record
    const destination = ctx.createMediaStreamDestination();
    recorder = new MediaRecorder(destination.stream);
    source.connect(destination); // connect for recording
    recorder.start();

    recordData = [];

    recorder.ondataavailable = (evt) => {
        recordData.push(evt.data);
    };

    recorder.onstop = (evt) => {
        const blob = new Blob(recordData, { "type": "audio/ogg; codecs=opus" });
        document.getElementById("record").src = URL.createObjectURL(blob);
    };

    source.start();
}

function stop() {
    if (recorder && recorder.state !== "inactive") {
        recorder.stop();
    }
    if (source) {
        source.stop();
    }
}

function generateTone() {
    const func = createFunction();
    if (!func) {
        // invalid function, cannot generate tone
        return;
    }

    // only create audio context once
    if (!ctx) {
        ctx = new AudioContext();
    }

    const duration = 1.0;
    const numSamples = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < buffer.length; i++) {
        const time = i / ctx.sampleRate;
        data[i] = amplitude * func(frequency, time);
    }

    return buffer;
}

function createFunction() {
    let expr = document.getElementById("function").value;
    expr = expr.replace(/sin/gi, "Math.sin")
    expr = expr.replace(/pi/gi, "Math.PI");
    expr = "return " + expr + ";";
    try {
        return new Function("f", "t", expr);
    } catch (err) {
        console.error(err);
        alert("Syntax error in function: " + err.message);
    }
}
