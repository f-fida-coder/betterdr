//Trim function
if (typeof String.prototype.trim !== 'function') {
    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    }
}

//IndexOf in Array
if (!('indexOf' in Array.prototype)) {
    Array.prototype.indexOf = function (find, i /*opt*/) {
        if (i === undefined) i = 0;
        if (i < 0) i += this.length;
        if (i < 0) i = 0;
        for (var n = this.length; i < n; i++)
            if (i in this && this[i] === find)
                return i;
        return -1;
    };
}