import {getCurrentInstance, reactive, toRaw} from "vue";


interface Tree {
    id: number
    name: string
    level: number
    database: string
    children?: database[]
}

interface database {
    name: string
    children?: table[]
}

interface table {
    name: string
}

const loadTree = (node, resolve: (data) => void, reject, type, defaultData, proxy) => {
    if (node.level === 0) {
        resolve(defaultData)
    } else if (node.level === 1) {
        proxy.$request("get_database", toRaw(node.data)).then(data => {
            return resolve(data)
        }).catch(() => {
            return reject()
        })
    } else {
        if (type == "mysql") {
            return loadMysqlTree(node, resolve, reject, defaultData, proxy)
        } else if (type == "redis") {
            return loadRedisTree(node, resolve, reject, defaultData, proxy)
        }
    }

}
const loadRedisTree = (node, resolve: (data) => void, reject, defaultData, proxy) => {
    let d = JSON.parse(JSON.stringify(toRaw(node.data)))
    d.database = node.data.name
    console.log(111)
    if (node.level == 2) {
        d.table=node.data.showName
        proxy.$request("get_table", d).then(data => {
            return resolve(data)
        }).catch(() => {
            return reject()
        })
    }else{
        console.log(d.children)
        return resolve(d.children)
    }

}
const loadMysqlTree = (node, resolve: (data) => void, reject, defaultData, proxy) => {

    if (node.level === 2) {
        let d = JSON.parse(JSON.stringify(toRaw(node.parent.data)))
        d.database = node.data.name
        proxy.$request("get_table", d).then(data => {
            data.forEach(e => {
                e = <Tree>e
                if (e.comment) {
                    e.showName = `${e.comment}(${e.name})`
                } else {
                    e.showName = e.name
                }
            })
            return resolve(data)
        }).catch(() => {
            return reject()
        })
    } else {
        resolve(defaultData)
    }
}

const getFilterValue = (searchParam, type) => {
    console.log(type)
    let res = []
    searchParam.forEach((e, index) => {
        if (type == "mysql") {
            let param = `${e.field} ${e.cal}`
            if (!e.noValue) {
                param += ` '${e.value}'`
            }
            if (index !== searchParam.length - 1) {
                param += ` ${e.seq}`
            }
            res.push(param)
        } else if (type == "redis") {
            res.push(e.value)
        }
    })
    return res
}

const getFilterField = (type) => {
    if (type === 'redis') {
        return [{key: '包含', value: '包含',}]
    } else {
        return [
            {key: '=', value: '=',},
            {key: '>', value: '>',},
            {key: '>=', value: '>=',},
            {key: '<', value: '<',},
            {key: '<=', value: '<=',},
            {key: '为空', value: "is null", noValue: true},
            {key: '不为空', value: "is not null", noValue: true},]
    }
}

const getDbChangeData = (type, tableData, oldData, primaryKey, field, changedData, oldDataMap) => {
    let d = {}
    let insertData = []
    if (type == 'redis') {
        tableData.forEach(e => {
            d[e['key']] = e
        })
        oldData.forEach(e => {

            let item = d[e['key']]
            let res = {primaryKey: primaryKey}
            let flag = 0
            if (item == null) {
                //添加的数据
                return;
            }
            if (item.value != e.value) {
                console.log(111)
                changedData[item.key] = item.value
            }

        })
        console.log("点击了redis应用")
    } else {
        console.log("点击了mysql应用")
        tableData.forEach(e => {
            d[e["@uuid"]] = e
            if (e['@add'] === 1) {
                insertData.push(e)
            }
        })
        oldData.forEach(e => {
            let item = d[e['@uuid']]
            let res = {primaryKey: primaryKey}
            let flag = 0
            if (item == null) {
                //添加的数据
                return;
            }
            for (let i in e) {
                if (i == "@uuid") continue;
                if (item[i] != e[i]) {
                    res[i] = {value: item[i], type: field[i].Type}
                    flag = 1
                }
            }
            if (flag == 1) {
                changedData[oldDataMap[e['@uuid']][primaryKey]] = res
            }
        })

    }
    return {updateData: changedData, insertData: insertData}
}


export {loadTree, getFilterValue, getFilterField, getDbChangeData}