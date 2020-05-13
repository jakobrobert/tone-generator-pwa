const UPDATE_TIMEOUT = 50;

let ctx;
let source;
let recorder;
let recorderDestination;
let recordData = [];

let frequency;
let amplitude;

// initially true, so first event will trigger an update
let mustUpdate = true;

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
    update();
}

function onAmplitudeChanged() {
    const slider = document.getElementById("amplitudeSlider");
    amplitude = slider.value / 100.0;
    const label = document.getElementById("amplitudeLabel");
    label.innerText = "" + amplitude;
    update();
}

function start() {
    // stop before re-starting to avoid multiple playbacks at once
    stop();

    if (!createSource()) {
        return;
    }

    createRecorder();

    source.connect(recorderDestination);
    recorder.start();
    source.start();
}

function stop() {
    // important to check for inactive state, gives error otherwise
    if (recorder && recorder.state !== "inactive") {
        recorder.stop();
    }
    if (source) {
        source.stop();
    }
}

function update() {
    if (mustUpdate) {
        // update is already triggered, so new events will not trigger new updates
        mustUpdate = false;
        setTimeout(() => {
            // timeout over, so handle update, new events will again trigger new updates
            mustUpdate = true;
            handleUpdate();
        }, UPDATE_TIMEOUT);
    }
}

function handleUpdate() {
    // re-start, but only if it is currently running
    if (ctx && ctx.state === "running") {
        // re-start the source but not the recorder
        source.stop();
        createSource();
        source.connect(recorderDestination);
        source.start();
    }
}

function createSource() {
    // simply re-generate for each start
    // could optimize later
    const buffer = generateTone();
    if (!buffer) {
        return false;
    }
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = document.getElementById("loop").checked;
    source.connect(ctx.destination); // connect for playback
    return true;
}

function createRecorder() {
    recorderDestination = ctx.createMediaStreamDestination();
    recorder = new MediaRecorder(recorderDestination.stream);

    recordData = [];

    recorder.ondataavailable = (evt) => {
        recordData.push(evt.data);
    };

    recorder.onstop = (evt) => {
        const blob = new Blob(recordData, { "type": "audio/ogg; codecs=opus" });
        document.getElementById("record").src = URL.createObjectURL(blob);
    };
}

function generateTone() {
    const func = createFunction();
    if (!func) {
        // invalid function, cannot generate tone
        return;
    }

    const duration = getDuration();
    if (!duration) {
        // invalid duration, cannot generate tone
        return;
    }

    // only create audio context once
    if (!ctx) {
        ctx = new AudioContext();
    }

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
        console.error("Error in \"function\": ", err);
        alert("Error in \"function\": " + err.message);
    }
}

function getDuration() {
    let expr = document.getElementById("duration").value;
    expr = "return " + expr + ";";
    try {
        const func = new Function("f", expr);
        return func(frequency);
    } catch (err) {
        console.error("Error in \"duration\": ", err);
        alert("Error in \"duration\": " + err.message);
    }
}
