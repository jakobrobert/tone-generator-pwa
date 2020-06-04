class ToneGenerator {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
    }

    getSampleRate() {
        return this.sampleRate;
    }

    generateSine(frequency, amplitude, duration) {
        const numSamples = Math.floor(duration * this.sampleRate);
        const samples = new Float32Array(numSamples);
        const timeStep = 1.0 / this.sampleRate;
        const omega = 2.0 * Math.PI * frequency;
        let time = 0.0;

        for (let i = 0; i < samples.length; i++) {
            samples[i] = amplitude * Math.sin(omega * time);
            time += timeStep;
        }

        return samples;
    }
}
