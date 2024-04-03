<script setup lang="ts">
import {Codemirror} from "vue-codemirror";


import {javascript} from "@codemirror/lang-javascript";
import {oneDark} from "@codemirror/theme-one-dark";
import {getCurrentInstance, nextTick, reactive, ref, toRaw} from "vue";
import {useStore} from "vuex";
import {VideoPlay} from "@element-plus/icons-vue";

import {
    mybatisHandler,
    createMybatisEditor,
    initValueMybatisEditor,
    mybatisHintHandler
} from "@/js/mybatis"

import {sqlqueryHandler, sqlqueryHintHandler, keypressSqlEditor} from "@/js/mybatissql"

const {proxy}: any = getCurrentInstance();
const store = useStore()
const code = ref(``);
const extensions = [javascript()];
const connectList = ref(store.state.connectList)
const databaseList = ref([])
const connect = ref(null)
const database = ref(null)
const tableData = ref([])
let activeData = {}
const tableColumn = ref([])
const showSubTable = ref(false)
const ht = ref(300)

calHeight()
//######################################################

// https://gitee.com/172463468/codemirror5-mybatis-sqlquery
import {CodeMirror} from 'codemirror-editor-vue3';
// const editor = CodeMirror.fromTextArea(l.value, {
//     mode: "markdown",// 模式
//     theme: "solarized", // 主题
//     lineWrapping: true,// 自动换行
//     scrollPastEnd: true,// 允许用户将一个编辑器高度的空白区域滚动到编辑器底部的视图
//     lineNumbers: true,// 显示左边行号（默认false,即不显示）
//     styleActiveLine: true, // 当前行背景高亮
// });
const codemirror = ref()
mybatisHandler(CodeMirror)
mybatisHintHandler(CodeMirror)
sqlqueryHandler(CodeMirror)
sqlqueryHintHandler(CodeMirror)
const selfObj = {
    existTables: {}, //已查询的表
    existTableCols: {}, //已查询的表字段
    databaseId: null, //当前数据库id
    schemaTypes: null, //当前数据库的模式集合
    mainSchema: null, //当前数据库的主模式
    sqlEditor: null, //sql编辑器
    hintOptions: null, //提示框hint对象
};
createMybatisEditor(selfObj, "codemirror", codemirror);
keypressSqlEditor(selfObj, getColsOfSchema, getTablesOfSchema);

/**
 * [可以不实现]后台接口：查询生效schema的表
 * queryVal={databaseId: "111",schemaType: "public"]}
 */
function getTablesOfSchema(selfObj, queryVal, callbackHint) {
    //支持跨库 {"public.TBL_DICT":"表1"} 或 不跨库 {"TBL_DICT":"表1"}
    var testdata = {
        "1-test2": {"test2.TBL_TEST_ORDER": "表3X"},
    };
    var key = queryVal["databaseId"] + "-" + queryVal["schemaType"];
    var data = testdata[key];
    console.log("实时查询Schema>>", key, data);
    //接口返回处理完成执行回调
    callbackHint(data);

    // $('#exampleSelect2').change();
}


/**
 * [必须实现]后台接口：查询生效的表的字段
 * queryVal={databaseId: "111",tableNames: ["public.XXXX1","public.XXXX2"]}
 */
function getColsOfSchema(selfObj, queryVal, callbackHint) {
    //表字段合集，根据条件动态查询接口返回，因为所有表字段的数量可能达到数万+++，不可能一次性存在前端
    var sqlTables = {};

    var testdata = {
        "1": {
            "public.TBL_DICT": [["AA1", "AA2", "AA3"], ["AA1标题AA1标题AA1标题AA1标题AA1标题", "AA2标题", "AA3标题"], ["VARCHAR(50)", "VARCHAR(60)", "TIMESTAMP"], ["主键：是    非空：是<br>分区：是<br>详情详情详情详情1详情详情详情详情1详情详情详情详情1详情详情详情详情1详情详情详情详情1", "", "详情详情详情详情3"]]
            ,
            "public.TBL_DICT_DTL": [["BBXXXX1", "BB2", "BB3"], ["BB1XXXX标题", "BB2标题", "BB3标题"], ["VARCHAR(50)", "VARCHAR(100)", "TIMESTAMP"]]
            ,
            "test.TBL_TEST": [["XX1", "XX2", "XX3"], ["XX1标题", "XX2标题", "XX3标题"]]
            ,
            "test2.TBL_TEST_ORDER": [["CC1", "CC2", "CC3"], ["CC1标题", "CC2标题", "CC3标题"]]
        },
        "2": {
            "book.TBL_DICT": [["AA1", "AA2", "AA3"], ["AA1标题", "AA2标题", "AA3标题"], ["CHAR(50)", "CHAR(60)", "TIMESTAMP"], ["11", "22", "33"]]
            , "book.TBL_DICT_DTL": [["BB1", "BB2", "BB3"], ["BB1标题", "BB2标题", "BB3标题"]]
            , "test.TBL_TEST": [["XX1", "XX2", "XX3"], ["XX1标题", "XX2标题", "XX3标题"]]
        },
    };

    var t = testdata[queryVal["databaseId"]];
    queryVal["tableNames"].forEach(item => {
        t.forEach((k, v) => {
            if (item.toLowerCase() === k.toLowerCase()) {
                sqlTables[k] = v;
                return;
            }
        })
    })
    console.log("实时查询字段>>", queryVal["tableNames"], t);
    //接口返回处理完成执行回调
    callbackHint(sqlTables);
}


//######################################################
let pageSize = 100
let currentPage = 1
let count = 0

function calHeight() {
    nextTick(() => {
        ht.value = document.querySelector('.codemirror').parentElement.clientHeight * 0.5
        console.log(document.querySelector('.codemirror').parentElement.clientHeight)
    })
}

const refreshDatabase = (item) => {
    proxy.$request("get_database", item).then(data => {
        databaseList.value = data
    })
}
const changeActive = (data) => {
    activeData = connect.value
    activeData["database"] = database.value
}

if (store.state.lastConnect != null && JSON.stringify(store.state.lastConnect) != '{}') {
    let item = store.state.lastConnect
    connect.value = item.name
    activeData = item
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
</script>

<template>
    <div style="padding-bottom: 10px">
        <el-select v-model="connect" class="m2" placeholder="请选择数据库"
                   :collapse-tags-tooltip="true" value-key="id" @change="refreshDatabase">
            <el-option
                v-for="item in connectList"
                :key="item.id"
                :label="item.name"
                :value="item"
            />
        </el-select>
        <el-select v-model="database" class="m2" placeholder="Select" :collapse-tags-tooltip="true"
                   @change="changeActive">
            <el-option
                v-for="item in databaseList"
                :key="item.name"
                :label="item.name"
                :value="item.name"
            />
        </el-select>
        <el-button :icon="VideoPlay" @click="runSql">运行</el-button>
    </div>
    <textarea ref="codemirror" class="codemirror" id="sqlcontent"></textarea>
    <!--    <codemirror-->
    <!--        id="sqlcontent"-->
    <!--        ref="Codemirror"-->
    <!--        v-model="code"-->
    <!--        placeholder=""-->
    <!--        :style="{ height: '100%' }"-->
    <!--        :autofocus="true"-->
    <!--        :indent-with-tab="true"-->
    <!--        :tabSize="2"-->
    <!--        :extensions="extensions"-->
    <!--    />-->
    <div class="subTable" v-show="showSubTable">
        <div style="padding: 0.5em">
            <el-table :data="tableData" border class="table" ref="table" :fit="true"
                      :highlight-current-row="true" :height="ht"
                      :scrollbar-always-on="true">
                <el-table-column v-for="item in tableColumn" :key="item.Field" :prop="item.Field" :label="item.Field"
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
</template>

<style scoped>
/deep/ .cm-content {
    cursor: text;
}

.m2 {
    max-width: 150px;
    padding-right: 1em;
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
</style>
<style src="@/css/sqlquery.css"></style>