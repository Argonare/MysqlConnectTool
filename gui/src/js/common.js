function empty(str) {
    return str == null || str === ""
}

function emptyDefault(str, defaultStr = '') {
    if (empty(str)) {
        return defaultStr
    }
    return str
}


let sqlFieldType = [
    {label: "varchar", hasLen: true, hasPoint: false, len: 255,defaultValue:"''"},
    {label: "int", hasLen: false, hasPoint: false,defaultValue:0},
    {label: "decimal", hasLen: true, hasPoint: true, len: 5, pointLen: 2,defaultValue:0},
]


let sqlFieldMap = sqlFieldType.reduce((map, obj) => {
    map[obj.label] = obj
    return map;
}, {})

export {empty, emptyDefault, sqlFieldType,sqlFieldMap}