const UPDATE_TIMEOUT = 50;

const BASE_URL = "https://jack0042.uber.space/tone-generator-pwa/"

let ctx;
let source;
let recorder;
let recorderDestination;
let recordData = [];

let generator;

let frequency;
let amplitude;

let playing = false;

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

const logFrequencySlider = new LogSlider(100, 20, 20000);

parseURL();

// update for initial slider values
onFrequencyChanged();
onAmplitudeChanged();

function onFrequencyChanged() {
    const slider = document.getElementById("frequencySlider");
    frequency = logFrequencySlider.getValueFromPosition(slider.value).toFixed(0);
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
    playing = true;
}

function stop() {
    // important to check for inactive state, gives error otherwise
    if (recorder && recorder.state !== "inactive") {
        recorder.stop();
    }
    if (playing) {
        source.stop();
        playing = false;
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
    // restart, but only if it is currently playing
    if (playing) {
        // restart the source but not the recorder
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
        const record = document.getElementById("record");
        record.src = URL.createObjectURL(blob);
    };
}

function generateTone() {
    const duration = getDuration();
    if (!duration) {
        // invalid duration, cannot generate tone
        return;
    }

    // TODO: Enable again later -> extract into ToneGenerator class
    /*
    const func = createFunction();
    if (!func) {
        // invalid function, cannot generate tone
        return;
    }
    */

    // only create audio context once
    if (!ctx) {
        ctx = new AudioContext();
        generator = new ToneGenerator(ctx.sampleRate);
    }

    // TODO: extract into ToneGenerator
    let samples;
    const waveform = document.getElementById("waveform").value;
    if (waveform === "sine") {
        samples = generator.generateSine(frequency, amplitude, duration);
    } else if (waveform === "square") {
        samples = generator.generateSquare(frequency, amplitude, duration);
    } else {
        throw new Error("Invalid waveform!");
    }

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);

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

function createLink() {
    const url = buildURL();
    const link = document.getElementById("link");
    link.value = url;
}

function copyLink() {
    const link = document.getElementById("link");
    link.select();
    document.execCommand("copy");
    alert("Copied link: " + link.value);
}

function buildURL() {
    const params = {
        func: document.getElementById("function").value,
        duration: document.getElementById("duration").value,
        loop: document.getElementById("loop").checked,
        frequency: frequency,
        amplitude: amplitude
    };

    const queryParams = [];
    for (const key in params) {
        const queryParam = encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        queryParams.push(queryParam);
    }
    const queryString = "?" + queryParams.join("&");

    return BASE_URL + queryString;
}

function parseURL() {
    const url = new URL(document.location);
    const params = url.searchParams;

    const func = params.get("func");
    const duration = params.get("duration");
    const loop = params.get("loop");
    const frequencyValue = params.get("frequency");
    const amplitudeValue = params.get("amplitude");

    if (func) {
        document.getElementById("function").value = func;
    }
    if (duration) {
        document.getElementById("duration").value = duration;
    }
    if (loop) {
        document.getElementById("loop").checked = (loop === "true");
    }
    if (frequencyValue) {
        const position = logFrequencySlider.getPositionFromValue(frequencyValue).toFixed(0);
        document.getElementById("frequencySlider").value = position;
    }
    if (amplitudeValue) {
        const position = (amplitudeValue * 100).toFixed(0);
        document.getElementById("amplitudeSlider").value = position;
    }
}
