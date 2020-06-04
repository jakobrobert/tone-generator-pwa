class ToneGenerator {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
    }

    generateSine(frequency, amplitude, duration) {
        const omega = 2.0 * Math.PI * frequency;
        return this.generateTone(frequency, amplitude, duration, (time) => {
            return Math.sin(omega * time);
        });
    }

    generateSquare(frequency, amplitude, duration) {
        const period = 1.0 / frequency;
        return this.generateTone(frequency, amplitude, duration, (time) => {
            const phase = time % period;
            if (phase < 0.5 * period) {
                return 1.0;
            }
            return -1.0;
        });
    }

    generateTriangle(frequency, amplitude, duration) {
        const period = 1.0 / frequency;
        const slope = 4.0 / period;
        return this.generateTone(frequency, amplitude, duration, (time) => {
            const phase = time % period;
            if (phase < 0.25 * period) {
                return slope * phase;
            }
            if (phase < 0.75 * period) {
                return 2.0 - slope * phase;
            }
            return slope * phase - 4.0;
        })
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
