<script setup>
import {getCurrentInstance, onMounted, reactive, ref} from "vue";
import {emptyDefault, sqlFieldType} from "@/js/common";
import {useRoute} from "vue-router";
import {ElMessage, ElMessageBox} from "element-plus";

onMounted(() => {
    
    getData()
})


const {proxy} = getCurrentInstance();
const ruleForm = ref({
    tableData: []
})
const editX = ref(null)
const editY = ref(null)
const route = useRoute();
let oldValue = null;
let tableMap = {}
const typeMap = reactive({})
const changeList = {}

const getData = () => {
    if (route.query.table == null) {
        return
    }
    proxy.$request("desc_table", route.query).then(data => {
        ruleForm.value.tableData = []
        data.forEach((e, index) => {
            var reg = /[1-9][0-9]*/g
            let matchRes = e.Type.match(reg)
            let item = {
                index: index,
                field: e.Field,
                type: e.Type.split("(")[0],
                len: matchRes && matchRes.length > 0 ? matchRes[0] : null,
                pointLen: matchRes && matchRes.length > 1 ? matchRes[1] : null,
                isNull: e.Null === 'YES',
                comment: emptyDefault(e.Comment),
                hideFlag: false,
                primary: e.Key === "PRI",
                default: e.Default == null ? 'NULL' : e.Default
            }
            ruleForm.value.tableData.push(item)
            tableMap[item["field"]] = JSON.parse(JSON.stringify(item))
        })
    })
}
const iptBlur = async (scope, e, field) => {
    let prop = `tableData.${scope.$index}.${field}`
    
    let newValue = scope.row[scope.column.property]
    //判断是否修改
    if (oldValue[field] !== newValue) {
        if (scope.row.field === null || scope.row.field === '') {
            return;
        }
        changeList[scope.row.index] = scope.row
        changeList[scope.row.index]["oldField"] = oldValue["field"]
    }
    editX.value = null
    editY.value = null
}
const cellClick = (scope) => {
    oldValue = JSON.parse(JSON.stringify(ruleForm.value.tableData[scope.$index]))
    editX.value = scope.$index
    editY.value = scope.column.no
}
const changeFlag = (row, flag) => {
    row[flag] = !row[flag]
}
const typeOption = ref(sqlFieldType)

typeOption.value.forEach(e => {
    typeMap[e.label] = e
})
const add = () => {
    let index = ruleForm.value.tableData.length > 0 ? (ruleForm.value.tableData[ruleForm.value.tableData.length - 1]["index"] + 1) : 0
    let item = {primary: false, isNull: false, index: index, add: true}
    ruleForm.value.tableData.push(item)
    changeList[item.index] = item
}
const pAdd = () => {
    let index = ruleForm.value.tableData.length > 0 ? (ruleForm.value.tableData[ruleForm.value.tableData.length - 1]["index"] + 1) : 0
    let item = {primary: false, isNull: false, index: index, add: true}
    
    ruleForm.value.tableData.splice(activeRow.value, 0, item)
    changeList[item.index] = item
}


const canEdit = (scope, field = null) => {
    if (editX.value === scope.$index && editY.value === scope.column.no) {
        console.log(field)
        if (typeMap[scope.row.type] && typeMap[scope.row.type][field]) {
            return true;
        }
        if (field == null) {
            return true;
        }
        
    }
    return false;
}
const activeRow = ref(null)
const selectedRow = ({row, rowIndex}) => {
    if (rowIndex === activeRow.value) {
        return 'selectedRow'
    }
    return ''
}
const icoClick = (row) => {
    activeRow.value = row.index
}
const formRef = ref()
const save = async () => {
    let valid = await formRef.value.validate(async (valid) => await valid)
    if (!valid) {
        ElMessage.error('表格数据存在异常')
        return
    }
    if (JSON.stringify(changeList) === "{}") {
        return
    }
    let obj = []
    
    for (let item in changeList) {
        obj.push(changeList[item])
    }
    
    let param = {...route.query, ...{changeList: obj}}
    if (route.query.table == null) {
        ElMessageBox.prompt('提示', '请输入表名', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
        }).then(({value}) => {
            param.table = value
            proxy.$request("add_table", param).then(data => {
                changeList.value = []
            })
        })
    } else {
        
        proxy.$request("alert_table", param).then(data => {
            changeList.value = []
        })
    }
    
    
}
const btnClick = (scope, flag) => {
    cellClick(scope);
    changeFlag(scope.row, flag);
    iptBlur(scope, null, flag)
}
const changeType = (data, row) => {
    row.len = typeMap[data].len
    row.pointLen = typeMap[data].pointLen
}
const rules = {
    field: [
        {required: true, message: '请输入字段名称', trigger: 'change'},
    ],
    type: [
        {required: true, message: '请选择字段类型', trigger: 'change'},
    ],
    len: [
        {
            required: true,
            min: 1,
            type: 'number',
            message: '请输入正确的长度',
            trigger: 'change',
            transform: (value) => Number(value)
        },
    ],
    pointLen: [
        {
            required: true,
            min: 1,
            type: 'number',
            message: '请输入小数点长度',
            trigger: 'change',
            transform: (value) => Number(value)
        },
    ],
    comment: [
        {required: true, message: '请输入备注', trigger: 'change'},
    ]
}
const handleClick = (command) => {
    let field = {}
    if (command === 'userInt') {
        field = {
            field: "createBy",
            type: "int",
            len: 11,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建人"
        }
    } else if (command === 'userChar') {
        field = {
            field: "createBy",
            type: "varchar",
            len: 100,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建人"
        }
    } else if (command === 'createTimeChar') {
        field = {
            field: "createTime",
            type: "varchar",
            len: 32,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建时间"
        }
    } else if (command === 'createTime') {
        field = {
            field: "createTime",
            type: "datetime",
            len: null,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建时间"
        }
    } else if (command === 'userCreateTime') {
        field = {
            field: "createBy",
            type: "int",
            len: 11,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建人"
        }
        ruleForm.value.tableData.push(field)
        field = {
            field: "createTime",
            type: "varchar",
            len: 32,
            default: "NULL",
            isNull: true,
            primary: false,
            comment: "创建时间"
        }
    }
    ruleForm.value.tableData.push(field)
}
const pDelete = () => {
    let data=ruleForm.value.tableData[activeRow.value]
    ElMessageBox.confirm('是否删除字段 ' + data.field, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        }
    ).then(() => {
        let param = {...route.query, ...{changeList: [Object.assign({}, {drop: true}, data)]}}
        proxy.$request("alert_table", param).then(data => {
            getData()
        })
    })
    
}
</script>

<template>
    <div class="tabPanel flexColumn">
        <div class="flexRow topBar">
            <div class="flexRow primaryBtn" @click="save">
                <el-icon>
                    <Document></Document>
                </el-icon>
                <div class="barFont">保存</div>
            </div>
            <el-divider direction="vertical"/>
            <div class="flexRow primaryBtn" @click="add">
                <el-icon>
                    <CirclePlus/>
                </el-icon>
                <div class="barFont">添加字段</div>
            </div>
            <div class="flexRow primaryBtn" @click="pAdd">
                <el-icon>
                    <ArrowLeft/>
                </el-icon>
                <div class="barFont">插入字段</div>
            </div>
            <div class="flexRow dangerBtn" @click="pDelete">
                <el-icon>
                    <CircleClose/>
                </el-icon>
                <div class="barFont">删除字段</div>
            </div>
            <div class="flexRow primaryBtn rightItem">
                <el-dropdown @command="handleClick">
                    <div class="flexRow">
                        <el-icon>
                            <ArrowDown/>
                        </el-icon>
                        <div class="barFont">预设字段</div>
                    </div>
                    <template #dropdown>
                        <el-dropdown-menu>
                            <el-dropdown-item command="userInt">创建人（int）</el-dropdown-item>
                            <el-dropdown-item command="userChar">创建人（varchar）</el-dropdown-item>
                            <el-dropdown-item command="createTimeChar">创建时间（varchar）</el-dropdown-item>
                            <el-dropdown-item command="createTime">创建时间（datetime）</el-dropdown-item>
                            <el-dropdown-item command="userCreateTime">创建时间（varchar）+创建人（int）</el-dropdown-item>
                        </el-dropdown-menu>
                    </template>
                </el-dropdown>
            
            </div>
        </div>
        <el-form :model="ruleForm" ref="formRef">
            <el-table :data="ruleForm.tableData" style="width: 100%" border class="subTable"
                      :row-class-name="selectedRow"
                      @cell-click="(row, column, cell, event)=>icoClick(row)">
                <el-table-column width="40" align="center" prop="ico">
                    <template #default="scope">
                        <el-icon>
                            <ArrowRight/>
                        </el-icon>
                    </template>
                </el-table-column>
                <el-table-column prop="field" label="字段名" width="150">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.field'" :rules="rules.name">
                            <el-input size="small" v-model="scope.row.field" v-focus v-if="canEdit(scope)"
                                      @blur="iptBlur(scope, $event,'field')"/>
                            <div @click="cellClick(scope)" class="height20" v-else>{{ scope.row.field }}</div>
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="type" label="类型" width="100">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.type'" :rules="rules.type">
                            <el-select v-model="scope.row.type" size="small" placeholder="选择类型"
                                       v-if="canEdit(scope)" @change="(data)=>changeType(data,scope.row)">
                                <el-option
                                    v-for="item in typeOption"
                                    :key="item.label"
                                    :label="item.label"
                                    :value="item.label"
                                />
                            </el-select>
                            <div v-else @click="cellClick(scope)" class="height20">{{ scope.row.type }}</div>
                        </el-form-item>
                    
                    </template>
                </el-table-column>
                <el-table-column prop="len" label="长度" width="70">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.len'"
                                      :rules="typeMap[scope.row.type]&&typeMap[scope.row.type].hasLen?rules.len:null">
                            <el-input v-if="canEdit(scope,'hasLen')"
                                      size="small" v-model.number="scope.row.len" v-focus
                                      @blur="iptBlur(scope, $event,'len')"/>
                            <div v-else @click="cellClick(scope)" class="height20">{{ scope.row.len }}</div>
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="pointLen" label="小数点" width="70">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.pointLen'"
                                      :rules="typeMap[scope.row.type]&&typeMap[scope.row.type].hasPoint?rules.pointLen:null">
                            <el-input size="small" v-model.number="scope.row.pointLen" v-focus
                                      @blur="iptBlur(scope, $event,'pointLen')"
                                      v-if="canEdit(scope,'hasPoint')"/>
                            <div v-else @click="cellClick(scope)" class="height20">{{ scope.row.pointLen }}</div>
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="default" label="默认值" width="90">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.default'">
                            <el-input size="small" v-model="scope.row.default" v-focus v-if="canEdit(scope)"
                                      @blur="iptBlur(scope, $event,'default')"/>
                            <div @click="cellClick(scope)" class="height20" v-else>{{ scope.row.default }}</div>
                        </el-form-item>
                    </template>
                </el-table-column>
                <el-table-column prop="isNull" label="可为null" width="90" align="center">
                    <template #default="scope">
                        <el-tag class="cursor yesTag" v-if="scope.row.isNull" :disable-transitions="true"
                                @click="btnClick(scope,'isNull')">
                            是
                        </el-tag>
                        <el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
                                @click="btnClick(scope,'isNull')">
                            否
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="primary" label="主键" width="90">
                    <template #default="scope">
                        <el-tag class="cursor yesTag" v-if="scope.row.primary" :disable-transitions="true"
                                @click="btnClick(scope,'primary')">
                            是
                        </el-tag>
                        <el-tag class="cursor noTag" type="danger" v-else :disable-transitions="true"
                                @click="btnClick(scope,'primary')">
                            否
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="comment" label="注释">
                    <template #default="scope">
                        <el-form-item :prop="'tableData.' + scope.$index + '.comment'" :rules="rules.comment">
                            <el-input size="small" v-if="editX===scope.$index&& editY===scope.column.no"
                                      v-model="scope.row.comment" v-focus @blur="iptBlur(scope, $event,'comment')"/>
                            <div v-else @click="cellClick(scope)" class="height20">{{ scope.row.comment }}</div>
                        </el-form-item>
                    </template>
                </el-table-column>
            </el-table>
        </el-form>
    </div>
</template>

<style scoped>

:deep(.selectedRow) {
    background: #e7f2ff;
}

.noTag:hover {
    background: #f56c6c;
    color: white;
}

.yesTag:hover {
    background: #409eff;
    color: white;
}

.height20 {
    min-height: 20px;
    width: 100%;
}

:deep(.el-input) {
    font-size: 14px;
}

.tabPanel {
    height: 100vh;
}

.subTable {
    flex: 1;
}

:deep(.cell):has(.el-form-item__error) .height20 {
    padding: 0px 6px;
    border-radius: 5px;
    border: 1px solid red;
}

:deep(.cell):has(.el-select), :deep(.cell):has(.el-input) {
    padding: 0 5px;
}

.topBar {
    padding: 0.5em;
    
    & .barFont {
        height: 20px;
        line-height: 20px;
        align-self: center;
    }
    
    & > *:not(.el-divider) {
        padding: 2px 7px;
        border-radius: 3px;
        cursor: pointer;
    }
    
    & .primaryBtn:hover {
        background: #409EFF;
        color: white;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
    }
    
    & .primaryBtn:hover .barFont, & .primaryBtn:hover .el-icon {
        color: white;
    }
    
    & .dangerBtn:hover {
        background: #F56C6C;
        color: white;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, .1);
    }
    
    
    :deep(.el-icon) {
        align-self: center;
        padding-right: 3px;
    }
    
    .el-divider--vertical {
        height: 100%;
    }
    
}

:deep(.el-form-item) {
    margin-bottom: 0 !important;
}
</style>