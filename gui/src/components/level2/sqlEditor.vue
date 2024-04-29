<script setup lang="ts">

import {getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw, watch} from "vue";
import {useStore} from "vuex";
import {ArrowUp, Grid, Switch, VideoPlay} from "@element-plus/icons-vue";
import MyEditor from "@/components/level3/myEditor.vue";
import 'codemirror/theme/solarized.css'
import 'codemirror/theme/monokai.css'
import 'codemirror/addon/search/match-highlighter'
import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";
import {sqlFieldType, sqlFieldMap} from "@/js/common";

const {proxy}: any = getCurrentInstance();
const store = useStore()
const code = ref(``);

const connectList = ref(store.state.connectList)

onMounted(() => {
    if (connectList.value.length > 0) {
        connect.value = connectList.value[0]
        refreshDatabase(connectList.value[0])
    }
})

const databaseList = ref([])
const connect = ref(null)
const database = ref(null)
const tableData = ref([])
const tableColumn = ref([])
const showSubTable = ref(false)
const editor = ref()
const ht = ref(300)

// calHeight()
let pageSize = 100
let currentPage = 1
let count = 0
let connectParam = {}

function calHeight() {
    nextTick(() => {
        ht.value = document.querySelector('.codemirror').parentElement.clientHeight * 0.5
    })
}

const refreshDatabase = (item) => {
    let database = connectParam["database"]
    connectParam = item
    if (!connectParam["database"]) {
        connectParam["database"] = database
    }
    proxy.$request("get_database", item).then(data => {
        databaseList.value = data
    })
}


const flexWidth = (title, fontSize = 16) => {
    if (tableData.value.length === 0) { //表格没数据不做处理
        return;
    }
    let titleWidth = 0
    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d");
    context.font = fontSize + "px PingFangSC-Regular";
    let trueWidth = context.measureText("这里放了六字").width
    titleWidth = context.measureText(title).width
    
    if (trueWidth < titleWidth) {
        trueWidth = titleWidth
    }
    return trueWidth + 24;
}
const handleSizeChange = (val: number) => {
    pageSize = val;
    runSql()
}
const handleCurrentChange = (val: number) => {
    currentPage = val;
    runSql()
}
//################################# 左侧数据表的树 ##########################
const filterText = ref()
const tree = ref()
const changeActive = (data) => {
    connectParam["database"] = data
    proxy.$request("get_table", connectParam).then(data => {
        treeData.value = data.map(e => {
            if (e.comment) {
                e.showName = `${e.comment}(${e.name})`
            } else {
                e.showName = e.name
            }
            return e
        })
        
    })
}
let treeData = ref()
let defaultProps: TreeOptionProps = {
    children: 'children',
    label: 'showName',
    isLeaf: 'leaf',
}
const handleNodeClick = (data) => {
}
const filterNode = (value: string, data) => {
    if (!value) return true
    return data.name && data.name.includes(value) || data.Database && data.Database.includes(value)
}
watch(filterText, (val) => {
    tree.value!.filter(val)
})
//################################ 头部工具栏 ###############################
const runSql = () => {
    let param = JSON.parse(JSON.stringify(connectParam))
    param["sql"] = editor.value.getContent()
    if (!param["sql"]) {
        return;
    }
    param["pageSize"] = pageSize
    param["currentPage"] = currentPage
    proxy.$request("exec_sql", param).then(data => {
        showSubTable.value = true
        tableData.value = data.data
        tableColumn.value = data.column
        count = data.count
        showSubTable.value = true
    })
}
const explainSql = () => {
    let param = JSON.parse(JSON.stringify(connectParam))
    param["sql"] = editor.value.getContent()
    if (!param["sql"]) {
        return;
    }
    proxy.$request("explain_sql", param).then(data => {
        let column = []
        for (let item in data[0]) {
            column.push({"Field": item})
        }
        
        showSubTable.value = true
        tableData.value = data
        tableColumn.value = column
        showSubTable.value = true
    })
}
//################# 右键菜单 ######################
let currentData = null;
const showMenuPosition = (event, data, node: Node) => {
    currentData = node
    showMenu.value = data.level
    let menu = document.querySelector("#sqlMenu");
    let item = document.querySelector("#right-content");
    
    
    menu["style"].left = event.clientX - item.offsetLeft + "px";
    menu["style"].top = event.clientY - item.offsetTop - 40 + "px";
    // 改变自定义菜单的隐藏与显示
    menu["style"].display = "block";
    menu["style"].zIndex = 1000;
}
document.addEventListener('click', e => {
    showMenu.value = 0
})
const showMenu = ref(0)
const selectSql = () => {
    editor.value.setContent('select * from ' + currentData.data.name)
}
const insertSql = () => {
    let param = JSON.parse(JSON.stringify(connectParam))
    param["table"] = currentData.data.name
    proxy.$request("desc_table", param).then(data => {
        let values = data.map(e => {
            let type = e.Type.split("(")[0]
            if (sqlFieldMap[type]) {
                return sqlFieldMap[type].defaultValue
            } else {
                return 'null'
            }
        })
        let sql = `insert into ${currentData.data.name}(${data.map(e => e.Field).join(",")})
                   values (${values.join(",")})`
        editor.value.setContent(sql)
    })
}
const deleteSql = () => {
    editor.value.setContent('delete from ' + currentData.data.name + ' where 2 = 1')
}

//############################ 初始化的 ###############################

if (store.state.lastConnect != null && JSON.stringify(store.state.lastConnect) != '{}') {
    console.log(111)
    let item = store.state.lastConnect
    connect.value = item.name
    connectParam = item
    database.value = item.database
    refreshDatabase(item)
    
    changeActive(item.database)
    code.value = "select * from " + item.table
}

//############################## 注释 #####################
const showComment = ref(false)
const getTableLabel = (obj) => {
    if (!showComment.value) {
        console.log(obj["Field"])
        return obj["Field"];
    }
    console.log(obj["Comment"] ? obj["Comment"] : obj["Field"])
    return obj["Comment"] ? obj["Comment"] : obj["Field"];
}

</script>

<template>
    <div class="flexRow flex1 height100">
        <div class="flexColumn leftOperate">
            <el-select v-model="connect" placeholder="选择连接"
                       :collapse-tags-tooltip="true" value-key="id" @change="refreshDatabase">
                <el-option v-for="item in connectList" :key="item.id" :label="item.name" :value="item"/>
            </el-select>
            <el-select v-model="database" placeholder="选择数据库" :collapse-tags-tooltip="true"
                       @change="changeActive">
                <el-option
                    v-for="item in databaseList" :key="item.name"
                    :label="item.name" :value="item.name"/>
            </el-select>
            <el-input v-model="filterText" @change="filterNode"></el-input>
            <el-scrollbar id="tree">
                <el-tree :data="treeData"
                         lazy
                         node-key="id"
                         :props="defaultProps"
                         @node-click="handleNodeClick"
                         :expand-on-click-node="false"
                         ref="tree"
                         :highlight-current="true"
                         :filter-node-method="filterNode"
                         @node-contextmenu="showMenuPosition"
                         empty-text=""/>
            </el-scrollbar>
        </div>
        <div class="flexColumn flex1 widthMax">
            <div class="operateRow">
                <el-link :icon="VideoPlay" @click="runSql" size="small" :underline="false">运行</el-link>
                <el-link :icon="Grid" @click="explainSql" size="small" :underline="false">解释</el-link>
                <el-link :icon="Switch" @click="showSubTable=!showSubTable" size="small" :underline="false">
                    {{ showSubTable ? '隐藏' : '显示' }}结果
                </el-link>
                <el-link :icon="Switch" @click="showComment = !showComment" size="small" :underline="false">
                    {{ showComment ? '隐藏' : '显示' }}注释
                </el-link>
            </div>
            <div class="flexColumn flex1">
                <my-editor ref="editor"></my-editor>
                <div class="subTable" :style="{minHeight:showSubTable?'200px':'unset'}">
                    <div>
                        <div class="hideTable" @click="showSubTable=!showSubTable">
                            <el-icon>
                                <ArrowDown v-if="showSubTable"/>
                                <ArrowUp v-else/>
                            </el-icon>
                        </div>
                        
                        <el-table :data="tableData" border class="table" ref="table"
                                  :highlight-current-row="true" :height="ht" v-show="showSubTable"
                                  :scrollbar-always-on="true">
                            <el-table-column v-for="item in tableColumn" :key="item.Field" :prop="item.Field"
                                             :label="getTableLabel(item)"
                                             :width="flexWidth(item.Field)" :show-overflow-tooltip="true">
                                <template #header>
                                    {{ getTableLabel(item) }}
                                </template>
                                <template #default="scope">
                                    <div class="iptDiv">{{ scope.row[item.Field] }}</div>
                                </template>
                            </el-table-column>
                        </el-table>
                        <el-pagination
                            v-show="showSubTable"
                            background
                            small
                            class="pagination"
                            :total="parseInt(count)"
                            v-model:page-size="pageSize"
                            v-model:current-page="currentPage"
                            :page-sizes="[10, 30, 50, 100]"
                            @size-change="handleSizeChange"
                            @current-change="handleCurrentChange"
                            layout="total, sizes, prev, pager, next, jumper"
                        />
                    </div>
                </div>
            </div>
        </div>
        <div v-show="showMenu!=0" id="sqlMenu" class="menuDiv">
            <div class="menuUl" v-if="showMenu==3">
                <p @click="selectSql">生成select</p>
                <p @click="insertSql">生成insert</p>
                <p @click="deleteSql">生成delete</p>
            </div>
        </div>
    </div>

</template>

<style scoped>
:deep(.cm-content) {
    cursor: text;
}

.widthMax {
    width: calc(100% - 200px);
}

.operateRow {
    background: white;
    padding: 2px;
    gap: 5px;
    display: flex;
    border-bottom: 1px solid #ddd;
}

:deep(.el-link) {
    border: 1px solid transparent;
    border-radius: 5px;
    padding: 2px 3px;
}

:deep(.el-link):hover {
    border: 1px solid #a2cfff;
    background: #ebf6ff;
}

.subTable {
    border-left: 1px solid #E4E7ED;
    background: white;
}

#tree {
    height: 100%;
    width: 200px;
}


.leftOperate {
    width: 200px;
    border-right: 1px solid #ccc;
    border-left: 1px solid #E4E7ED;
    background: white;
    padding: 5px;
    height: calc(100% - 10px);
    gap: 2px
}

#sqlMenu {
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

.hideTable {
    text-align: center;
    cursor: pointer;
    border-top: 1px solid #ebeef5;
    border-left: 1px solid #ebeef5;
    border-right: 1px solid #ebeef5;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
    height: 21px;
    line-height: 21px;
}

.hideTable:hover {
    background: #EEEEEE;
}

:deep(.el-table .cell) {
    padding: 4px 8px;
}

:deep(.el-pagination) {
    padding: 3px 5px;
}

.iptDiv {
    overflow: hidden;
    white-space: nowrap;
}
</style>
<style src="@/css/sqlquery.css"></style>