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

    generateSawtooth(frequency, amplitude, duration) {
        const period = 1.0 / frequency;
        const slope = 2.0 / period;
        return this.generateTone(frequency, amplitude, duration, (time) => {
            const phase = time % period;
            if (phase < 0.5 * period) {
                return slope * phase;
            }
            return slope * phase - 2.0;
        });
    }

    generateCustom(frequency, amplitude, duration, expression) {
        let expr = expression.replace(/sin/gi, "Math.sin");
        expr = expr.replace(/pi/gi, "Math.PI")
        expr = "return " + expr + ";";
        try {
            const func = new Function("f", "t", expr);
            return this.generateTone(frequency, amplitude, duration, (time) => {
                return func(frequency, time);
            });
        } catch (err) {
            console.error("Error in \"function\": ", err);
            alert("Error in \"function\": " + err.message);
        }
    }

    generateTone(frequency, amplitude, duration, getSample) {
        const numSamples = Math.floor(duration * this.sampleRate);
        const samples = new Float32Array(numSamples);

        for (let i = 0; i < samples.length; i++) {
            const time = i / this.sampleRate;
            samples[i] = amplitude * getSample(time);
        }

        return samples;
    }
}
