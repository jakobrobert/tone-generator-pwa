class LogSlider {
    constructor(maxPos, minVal, maxVal) {
        this.maxPos = maxPos;
        this.minLogVal = Math.log(minVal);
        this.maxLogVal = Math.log(maxVal);
        this.scale = (this.maxLogVal - this.minLogVal) / this.maxPos;
    }

    getValueFromPosition(position) {
        // TODO: refactor -> multiply result by minVal?
        return Math.exp(position * this.scale + this.minLogVal);
    }

    getPositionFromValue(value) {
        // TODO: refactor -> divide value by minVal?
        return (Math.log(value) - this.minLogVal) / this.scale;
    }
}
