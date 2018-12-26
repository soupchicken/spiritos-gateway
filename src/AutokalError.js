'use strict';

class SpiritOSError extends Error {
    constructor(message, code) {
        super(message);
        this._code = code;
    }

    get code() {
        return this._code;
    }

    toJSON() {
        return {
          error: {
            message: this.message,
            code: this._code
          }
        }
    }
}

module.exports = SpiritOSError;
