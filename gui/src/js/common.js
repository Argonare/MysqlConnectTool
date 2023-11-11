function empty(str) {
    return str == null || str === ""
}

function emptyDefault(str, defaultStr = '') {
    if (empty(str)) {
        return defaultStr
    }
    return str
}

export  {empty,emptyDefault}