class ToneGenerator {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
    }

    generateSine(frequency, amplitude, duration) {
        const omega = 2.0 * Math.PI * frequency;
        const func = time => Math.sin(omega * time);
        return this.generateTone(frequency, amplitude, duration, func);
    }

    generateSquare(frequency, amplitude, duration) {
        const period = 1.0 / frequency;
        return this.generateTone(frequency, amplitude, duration, (time) => {
            const phase = time % period;
            if (phase / period < 0.5) {
                return 1.0;
            } else {
                return -1.0;
            }
        });
    }

    generateTone(frequency, amplitude, duration, getSample) {
        const numSamples = Math.floor(duration * this.sampleRate);
        const samples = new Float32Array(numSamples);
        const timeStep = 1.0 / this.sampleRate;
        let time = 0.0;

        for (let i = 0; i < samples.length; i++) {
            samples[i] = amplitude * getSample(time);
            time += timeStep; // TODO: maybe accumulates rounding errors?
        }

        return samples;
    }
}
