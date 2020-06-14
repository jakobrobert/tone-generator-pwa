const UPDATE_TIMEOUT = 50;

const BASE_URL = "https://jack0042.uber.space/tone-generator-pwa/"

let ctx;
let samples;
let source;
let recorder;
let recorderDestination;
let recordData = [];

let waveform;
let expression;
let durationExpr;
let loop;
let frequency;
let amplitude;
let dutyCycle;

let playing = false;

// initially true, so first event will trigger an update
let mustUpdate = true;

let generator;

let chart;
let chartTimeSpan;
let maxNumPoints;   // max number of points in a chart

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

createChart();

parseURL();

// update for initial values
onWaveformChanged();
onExpressionChanged();
onDurationChanged();
onLoopChanged();
onFrequencyChanged();
onAmplitudeChanged();
onDutyCycleChanged();

onChartTimeSpanChanged();

function onWaveformChanged() {
    waveform = document.getElementById("waveform").value;
    // only show expression input for custom waveform
    document.getElementById("expressionDiv").hidden = (waveform !== "custom");
    // only show duty cycle input for pulse waveform
    document.getElementById("dutyCycleDiv").hidden = (waveform !== "pulse");
    update();
}

function onExpressionChanged() {
    expression = document.getElementById("expression").value;
    update();
}

function onDurationChanged() {
    durationExpr = document.getElementById("duration").value;
    update();
}

function onLoopChanged() {
    loop = document.getElementById("loop").checked;
    update();
}

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

function onDutyCycleChanged() {
    const slider = document.getElementById("dutyCycleSlider");
    dutyCycle = slider.value / 100.0;
    const label = document.getElementById("dutyCycleLabel");
    label.innerText = "" + dutyCycle;
    update();
}

function onChartTimeSpanChanged() {
    chartTimeSpan = document.getElementById("chartTimeSpan").value;
    // different update logic here so tone is not re-generated
    updateURL();
    updateChart();
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
    updateURL();
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
    source.loop = loop;
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

    // only create audio context once
    if (!ctx) {
        ctx = new AudioContext();
        generator = new ToneGenerator(ctx.sampleRate);
    }

    const options = {};
    options.waveform = waveform;
    options.frequency = frequency;
    options.amplitude = amplitude;
    options.duration = duration;
    if (waveform === "pulse") {
        options.dutyCycle = dutyCycle;
    }
    if (waveform === "custom") {
        options.expression = expression;
    }

    const newSamples = generator.generateTone(options);
    if (!newSamples) {
        return;
    }
    samples = newSamples;

    updateChart();

    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    return buffer;
}

function getDuration() {
    const expr = "return " + durationExpr + ";";
    try {
        const func = new Function("f", expr);
        return func(frequency);
    } catch (err) {
        console.error("Error in \"duration\": ", err);
        alert("Error in \"duration\": " + err.message);
    }
}

function updateURL() {
    const url = buildURL();
    window.history.replaceState(null, "", url);
}

function buildURL() {
    const params = {};
    params.waveform = waveform;
    // expression only relevant for custom wave
    if (waveform === "custom") {
        params.expression = expression;
    }
    params.duration = durationExpr;
    params.loop = loop;
    params.frequency = frequency;
    params.amplitude = amplitude;
    if (waveform === "pulse") {
        params.dutyCycle = dutyCycle;
    }
    params.chartTimeSpan = chartTimeSpan;

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

    const waveform = params.get("waveform");
    const expression = params.get("expression");
    const duration = params.get("duration");
    const loop = params.get("loop");
    const frequency = params.get("frequency");
    const amplitude = params.get("amplitude");
    const dutyCycle = params.get("dutyCycle");
    const chartTimeSpan = params.get("chartTimeSpan");

    if (waveform) {
        document.getElementById("waveform").value = waveform;
    }
    if (expression) {
        document.getElementById("expression").value = expression;
    }
    if (duration) {
        document.getElementById("duration").value = duration;
    }
    if (loop) {
        document.getElementById("loop").checked = (loop === "true");
    }
    if (frequency) {
        const position = logFrequencySlider.getPositionFromValue(frequency).toFixed(0);
        document.getElementById("frequencySlider").value = position;
    }
    if (amplitude) {
        const position = (amplitude * 100).toFixed(0);
        document.getElementById("amplitudeSlider").value = position;
    }
    if (dutyCycle) {
        const position = (dutyCycle * 100).toFixed(0);
        document.getElementById("dutyCycleSlider").value = position;
    }
    if (chartTimeSpan) {
        document.getElementById("chartTimeSpan").value = chartTimeSpan;
    }
}

function createChart() {
    const canvas = document.getElementById("chartCanvas");
    const ctx = canvas.getContext("2d");
    maxNumPoints = canvas.clientWidth;
    const shouldResize = canvas.clientWidth + 50 > window.innerWidth;
    chart = new Chart(ctx, {
        type: 'line',
        options: {
            animation: {
                duration: 0 // disable animation
            },
            legend: {
                display: false // disable legend (database label)
            },
            responsive: shouldResize,
            // use scale axis instead of category axis with labels
            scales: {
                xAxes: [{
                    type: "linear",
                    position: "bottom",
                    scaleLabel: {
                        display: true,
                        labelString: "Time (s)"
                    }
                }],
                yAxes: [{
                    scaleLabel: {
                        display: true,
                        labelString: "Amplitude"
                    }
                }]
            }
        }
    });
}

function updateChart() {
    if (!samples || !chart) {
        return;
    }

    let numSamples;
    if (chartTimeSpan === "full") {
        numSamples = samples.length;
    } else if (chartTimeSpan === "period") {
        const period = 1.0 / frequency;
        numSamples = Math.round(period * ctx.sampleRate);
    } else {
        throw new Error("Invalid value for chartTimeSpan!");
    }
    const numSamplesPerPoint = Math.max(1, Math.round(numSamples / maxNumPoints));
    const data = [];

    for (let i = 0; i < numSamples; i += numSamplesPerPoint) {
        const point = {
            x: i / ctx.sampleRate,
            y: samples[i]
        };
        data.push(point);
    }

    chart.data.datasets = [{
        lineTension: 0, // disable interpolation
        pointRadius: 0, // disable circles for points
        data: data
    }];

    chart.update();
}
