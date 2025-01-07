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

const loadTree = (node, resolve: (data: Tree[]) => void, reject, type, defaultData, proxy) => {
    if (node.level === 0) {
        resolve(defaultData)
    } else if (node.level === 1) {
        proxy.$request("get_database", toRaw(node.data)).then(data => {
            data.forEach(e => {
                e = <Tree>e
                e.showName = e.name

            })
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
const loadRedisTree = (node: Node, resolve: (data: Tree[]) => void, reject, defaultData, proxy) => {

    resolve([])
}
const loadMysqlTree = (node, resolve: (data: Tree[]) => void, reject, defaultData, proxy) => {

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
export {loadTree}