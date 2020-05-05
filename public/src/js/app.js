let ctx;
let buffer;
let source;

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

function start() {
    if (!buffer) {
        generate();
    }
    // need to re-create the source for each start
    // in Web Audio, there is no way to restart a source after it is stopped
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start();
}

function stop() {
    if (!source) {
        return;
    }
    source.stop();
}

function generate() {
    ctx = new window.AudioContext();

    const frequency = 440.0;
    const amplitude = 1.0;
    const duration = 1.0;
    const numSamples = ctx.sampleRate * duration;
    buffer = ctx.createBuffer(1, numSamples, ctx.sampleRate);

    // sine tone
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
        const time = i / ctx.sampleRate;
        data[i] = amplitude * Math.sin(2.0 * Math.PI * frequency * time);
    }
}

function onFrequencyChanged() {
    const slider = document.getElementById("frequencySlider");
    const frequency = slider.value;
    const label = document.getElementById("frequencyLabel");
    label.innerText = frequency + " Hz";
}

function onAmplitudeChanged() {
    const slider = document.getElementById("amplitudeSlider");
    const amplitude = slider.value / 100.0;
    const label = document.getElementById("amplitudeLabel");
    label.innerText = "" + amplitude;
}

// TODO: init function for initial slider values
