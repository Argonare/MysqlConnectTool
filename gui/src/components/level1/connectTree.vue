<script setup lang="ts">

import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";
import {getCurrentInstance, onMounted, reactive, ref, toRaw, watch} from "vue";
import useClipboard from 'vue-clipboard3'
import {loadTree} from "@/js/connectTree";

onMounted(() => {
    window.addEventListener('pywebviewready', function () {
        getSavedData()
    })
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keyup', handleEnterKey);
    if (window.pywebview) {
        getSavedData()
    }
})
import {useRouter} from "vue-router";
import {useStore} from "vuex";
import {Action, ElMessage, ElMessageBox} from "element-plus";

const router = useRouter()
const {proxy}: any = getCurrentInstance();
const store = useStore()
const tree = ref()

let tmpData = []

const getSavedData = async () => {
    proxy.$request("get_config", {}).then(data => {
        console.log(data)
        data.forEach(e => {
            e = <Tree>e
            e.showName = e.name
            e.level = 1
        })
        let saved: Tree[] = data
        if (saved == null) {
            return [];
        }
        saved.forEach((e) => {
            if (tree.value.getNode(e.id) == null) {
                tree.value!.append(e)
            }
        })
        tmpData = saved
        store.state.connectList = saved
        return saved
    })
    
}


const refreshData = async () => {
    
    return <Tree []>getSavedData()
}

let data = reactive<Tree[]>([])

const addData = (treeData: object) => {
    tree.value!.append(treeData)
    tmpData.push(treeData)
    store.state.connectList = tmpData
    proxy.$request("save_config", tmpData)
}


interface Tree {
    id: number
    showName: string
    level: number
    database: string
    type: string,
    children?: Tree[]
}


let clickNum = 0
const handleNodeClick = (data) => {
    console.log(111)
    clickNum++;
    setTimeout(function () {
        if (clickNum === 2) {
            console.log(data)
            if (data.type === "mysql" && data.level == 3) {
                console.log("点击了mysql左侧菜单")
                let connect_data = toRaw(tree.value.getNode(data.id).parent.parent.data)
                store.state.lastConnect = connect_data
                connect_data.database = data.databases
                connect_data.table = data.name
                connect_data.nickName = data.name
                // connect_data.comment=data.comment
                delete connect_data.sql
                router.push({path: "/DataTable", query: connect_data})
            } else if (data.type === "redis" && data.level == 2) {
                console.log("点击了redis左侧菜单")
                let connect_data = toRaw(tree.value.getNode(data.id).parent.data)
                store.state.lastConnect = connect_data
                connect_data.database = data.databases
                connect_data.table = data.name
                connect_data.nickName = "DB" + data.name
                console.log(connect_data)
                // connect_data.comment=data.comment
                delete connect_data.sql
                router.push({path: "/DataTable", query: connect_data})
            }
        }
        clickNum = 0
    }, 300)
}


let defaultProps: TreeOptionProps = {
    children: 'children',
    label: 'showName',
    isLeaf: 'leaf',
}

const loadNode = (node, resolve: (data: Tree[]) => void, reject) => {
    let connectType = node.data.type
    if (!connectType && node.parent) {
        connectType = node.parent.data.type
    }
    return loadTree(node, resolve, reject, connectType, data, proxy)
}
//############################### 右键菜单 ####################
let currentData = null;
const showMenuPosition = (event, data, node: Node) => {
    currentData = node
    showMenu.value = data.level
    
    let menu = document.querySelector("#menu");
    let item = menu.parentElement
    
    menu["style"].left = event.clientX - item.offsetLeft + "px";
    menu["style"].top = event.clientY - item.offsetTop + "px";
    // 改变自定义菜单的隐藏与显示
    menu["style"].display = "block";
    menu["style"].zIndex = 1000;
}
document.addEventListener('click', e => {
    showMenu.value = 0
})
const showMenu = ref(0)
//########################################################

const addTable = () => {
    let data = toRaw(currentData.parent.data)
    let connect_data = toRaw(currentData.parent.parent.data)
    store.state.lastConnect = connect_data
    connect_data.database = data.Database
    connect_data.table = null
    router.push({path: "/tableEdit", query: connect_data})
}

const deleteTable = () => {
    let data = toRaw(currentData.parent.data)
    let connect_data = toRaw(currentData.parent.parent.data)
    ElMessageBox.confirm(`确定要删除表${currentData.data.name}吗`, '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        store.state.lastConnect = connect_data
        connect_data.database = data.Database
        connect_data.table = currentData.data.name
        connect_data.nickName = data.name
        delete connect_data.sql
        
        proxy.$request("drop_table", connect_data).then(data => {
            currentData.parent.loaded = false
            currentData.parent.expand()
        })
    })
}
const editTable = () => {
    let data = toRaw(currentData.parent.data)
    let connect_data = toRaw(currentData.parent.parent.data)
    store.state.lastConnect = connect_data
    connect_data.database = data.Database
    connect_data.table = currentData.data.name
    connect_data.nickName = currentData.data.name + "@" + data.Database
    delete connect_data.sql
    console.log(connect_data)
    router.push({path: "/tableEdit", query: connect_data})
}
const filterNode = (value: string, data: Tree) => {
    if (!value) return true
    return data.name && data.name.includes(value) || data.Database && data.Database.includes(value) || data.comment && data.comment.includes(value)
}
const filterText = ref("")
const filterMode = ref(false)
watch(filterText, (val) => {
    tree.value!.filter(val)
})
const handleClick = (event) => {
    filterMode.value = false
    if (event.target.className.length > 0 && event.target.className.indexOf("tree") >= 0) {
        filterMode.value = true
    }
    if (event.target.className.length > 0 && event.target.className.indexOf("scrollbar") >= 0 &&
        (event.target.parentElement.className.indexOf("tree") >= 0 || event.target.parentElement.id == "tree")) {
        filterMode.value = true
    }
}


const {toClipboard} = useClipboard()
const viewSql = () => {
    let data = toRaw(currentData.parent.data)
    let connect_data = toRaw(currentData.parent.parent.data)
    store.state.lastConnect = connect_data
    connect_data.database = data.Database
    connect_data.table = currentData.data.name
    connect_data.nickName = data.name
    
    proxy.$request("show_table_sql", connect_data).then(data => {
        ElMessageBox.alert(data, connect_data.table, {
            confirmButtonText: '复制sql',
            dangerouslyUseHTMLString: true,
            callback: async (action: Action) => {
                if (action !== 'cancel') {
                    await toClipboard(data)
                    ElMessage.success("操作成功")
                }
                
            },
        })
    })
}
const viewChangeLog = () => {
    let data = toRaw(currentData.parent.data)
    let connect_data = toRaw(currentData.parent.parent.data)
    store.state.lastConnect = connect_data
    connect_data.database = data.Database
    connect_data.table = currentData.data.name
    connect_data.nickName = currentData.data.name + "@" + data.Database
    delete connect_data.sql
    router.push({path: "/changeLog", query: connect_data})
}
//################## 搜索框 ################
const handleEnterKey = (event) => {
    if (filterMode.value == true && /^[0-9]*[A-Za-z]+[0-9A-Za-z]*$/.test(event.key) && event.key.length === 1) {
        filterMode.value = false
        filterText.value = filterText.value + event.key
        searchInput.value.focus()
    }
    
}
defineExpose({
    addData,
    refreshData
})
const searchInput = ref()
const getTypeImg = (data) => {
    if (data.type) {
        if (data.type == "redis") {
            if (data.level == 1) {
                return `/src/assets/img/${data.type}.svg`
            } else if (data.level == 2) {
                return `/src/assets/img/redisDb.svg`
            } else if (data.level == 3) {
                return `/src/assets/img/key.svg`
            }
            return;
        } else {
            return `/src/assets/img/${data.type}.svg`
        }
        
    }
    if (data.Database) {
        return `/src/assets/img/database.svg`
    }
    if (data.TABLE_NAME) {
        return `/src/assets/img/table.svg`
    }
    return ""
}

</script>
<template>
    <el-scrollbar id="tree" :class="filterText.length>0?'h1':'h2'">
        <el-tree :data="data"
                 :load="loadNode"
                 lazy
                 node-key="id"
                 :props="defaultProps"
                 @node-click="handleNodeClick"
                 :expand-on-click-node="false"
                 ref="tree"
                 :highlight-current="true"
                 :filter-node-method="filterNode"
                 @node-contextmenu="showMenuPosition"
                 empty-text="">
            <template #default="{ data }">
                <img :src="getTypeImg(data)" alt="" width="20" height="20" class="treeIcon"
                     v-if="getTypeImg(data)">
                <span>{{ data.showName }}</span>
            </template>
        
        </el-tree>
    </el-scrollbar>
    <el-input ref="searchInput" v-model="filterText" placeholder="" :clearable="true" v-show="filterText.length>0"/>
    
    <div v-show="showMenu!=0" id="menu" class="menuDiv">
        <div class="menuUl" v-if="showMenu==3">
            <p @click="addTable">新建表</p>
            <p @click="editTable">设计表</p>
            <p @click="deleteTable">删除表</p>
            <el-divider/>
            <p @click="viewSql">查看表sql</p>
            <p @click="viewChangeLog">查看变更记录</p>
        </div>
    </div>
</template>

<style scoped>

.treeIcon {
    padding: 0 3px;
}

.h1 {
    height: calc(100% - 30px);
}

.h2 {
    height: 100%;
}

.bottomSearch {
    border-top: 1px solid #ccceee;
}

:deep(.el-tabs__nav .el-tabs__item) {
    max-width: 120px;
    overflow: hidden;
    background: red;
}

.el-tabs__nav .el-tabs__item {
    max-width: 120px;
    overflow: hidden;
    background: red;
}

.bottomSearch :deep(.el-input__wrapper) {
    box-shadow: 0 0 0 0px var(--el-input-border-color, var(--el-border-color)) inset;
    cursor: default;
    
    .el-input__inner {
        cursor: default !important;
    }
}

:deep(.el-tree) {
    min-width: 100%;
    height: 100%;
    display: inline-block !important;
}

#menu {
    position: absolute;
    
    .menuUl > p {
        margin: 0;
        cursor: pointer;
        border-bottom: 1px solid rgba(255, 255, 255, 0.47);
        padding: 5px 1.5em;
        font-size: 12px;
        
        &:hover {
            background-color: #eee;
        }
    }
    
    .menuUl {
        min-width: 70px;
        height: auto;
        font-size: 14px;
        text-align: left;
        border-radius: 3px;
        background-color: #fff;
        color: black;
        list-style: none;
        border: 1px solid #ccc;
        padding: 0;
        
    }
}

:deep(.el-divider) {
    margin: 5px 0;
    width: auto;
}
</style>