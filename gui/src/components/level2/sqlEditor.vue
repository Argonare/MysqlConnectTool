<script setup lang="ts">

import {getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw} from "vue";
import {useStore} from "vuex";
import {VideoPlay} from "@element-plus/icons-vue";
import MyEditor from "@/components/level3/myEditor.vue";
import 'codemirror/theme/solarized.css'
import 'codemirror/theme/monokai.css'
import 'codemirror/addon/search/match-highlighter'
import {TreeOptionProps} from "element-plus/es/components/tree/src/tree.type";

const {proxy}: any = getCurrentInstance();
const store = useStore()
const code = ref(``);

const connectList = ref(store.state.connectList)
const databaseList = ref([])
const connect = ref(null)
const database = ref(null)
const tableData = ref([])
let activeData = {}
const tableColumn = ref([])
const showSubTable = ref(false)
const ht = ref(300)

// calHeight()
let pageSize = 100
let currentPage = 1
let count = 0
let connectParam={}
function calHeight() {
    nextTick(() => {
        ht.value = document.querySelector('.codemirror').parentElement.clientHeight * 0.5
        console.log(document.querySelector('.codemirror').parentElement.clientHeight)
    })
}

const refreshDatabase = (item) => {
    connectParam=item
    proxy.$request("get_database", item).then(data => {
        databaseList.value = data
    })
}

if (store.state.lastConnect != null && JSON.stringify(store.state.lastConnect) != '{}') {
    let item = store.state.lastConnect
    connect.value = item.name
    activeData = item
    connectParam=item
    refreshDatabase(item)
    database.value = item.database
    code.value = "select * from " + item.table
}

const runSql = () => {
    activeData["sql"] = code.value
    activeData["pageSize"] = pageSize
    activeData["currentPage"] = currentPage
    proxy.$request("exec_sql", activeData).then(data => {
        showSubTable.value = true
        tableData.value = data.data
        tableColumn.value = data.column
        count = data.count
        showSubTable.value = true
        console.log(data)
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
    titleWidth = context.measureText("title").width
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
//##################################左侧数据表的树###########################
const changeActive = (data) => {
    connectParam["database"]=data
    console.log(connectParam)
    proxy.$request("get_table", connectParam).then(data => {
        treeData.value = data
        console.log(data)
    })
}
let treeData = ref()
let defaultProps: TreeOptionProps = {
    children: 'children',
    label: 'name',
    isLeaf: 'leaf',
}
const handleNodeClick = (data) => {
}
const filterNode = (value: string, data) => {
    if (!value) return true
    return data.name && data.name.includes(value) || data.Database && data.Database.includes(value)
}
//##################################左侧数据表的树###########################
</script>

<template>
    <div class="flexRow flex1">
        <div class="flexColumn leftOperate">
            <el-select v-model="connect" class="m2" placeholder="选择连接"
                       :collapse-tags-tooltip="true" value-key="id" @change="refreshDatabase">
                <el-option v-for="item in connectList"
                           :key="item.id" :label="item.name" :value="item"/>
            </el-select>
            <el-select v-model="database" class="m2" placeholder="选择数据库" :collapse-tags-tooltip="true"
                       @change="changeActive">
                <el-option
                    v-for="item in databaseList"
                    :key="item.name"
                    :label="item.name"
                    :value="item.name"
                />
            </el-select>
            <el-tree :data="treeData"
                     lazy
                     node-key="id"
                     :props="defaultProps"
                     @node-click="handleNodeClick"
                     :expand-on-click-node="false"
                     ref="tree"
                     :highlight-current="true"
                     :filter-node-method="filterNode"
                     empty-text=""/>
        </div>
        <div class="flexColumn flex1">
            <div class="operateRow">
                <el-link :icon="VideoPlay" @click="runSql" size="small" :underline="false">运行</el-link>
            </div>

            <my-editor></my-editor>
            <div class="subTable" v-show="showSubTable">
                <div style="padding: 0.5em">
                    <el-table :data="tableData" border class="table" ref="table" :fit="true"
                              :highlight-current-row="true" :height="ht"
                              :scrollbar-always-on="true">
                        <el-table-column v-for="item in tableColumn" :key="item.Field" :prop="item.Field"
                                         :label="item.Field"
                                         :width="flexWidth(item.Field)" :show-overflow-tooltip="true">
                            <template #header>
                                {{ item.Field }}
                            </template>
                            <template #default="scope">
                                <div class="iptDiv">{{ scope.row[item.Field] }}</div>
                            </template>
                        </el-table-column>
                    </el-table>
                    <el-pagination
                        background
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

</template>

<style scoped>
:deep(.cm-content) {
    cursor: text;
}

.operateRow {
    background: white;
    padding: 5px;
}

.subTable {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    background: white;

    min-height: 200px;
}

.subTable > div {
    padding: 0.5em;
}

.leftOperate {
    min-width: 200px;
    border-right: 1px solid #ccc;
    background: white;
    padding: 5px;
}

</style>
<style src="@/css/sqlquery.css"></style>