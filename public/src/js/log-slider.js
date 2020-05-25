class LogSlider {
    constructor(maxPos, minVal, maxVal) {
        this.maxPos = maxPos;
        this.minVal = minVal;
        this.maxVal = maxVal;
        this.scale = Math.log(this.maxVal / this.minVal) / this.maxPos;
    }

    getValueFromPosition(position) {
        return Math.exp(position * this.scale) * this.minVal;
    }

    getPositionFromValue(value) {
        return Math.log(value / this.minVal) / this.scale;
    }
}
