<script setup lang="ts">
import {reactive, ref} from 'vue'
import {ElMessage, FormInstance, FormRules} from "element-plus";
import {getCurrentInstance} from "vue";

const {proxy}: any = getCurrentInstance();

let dialogVisible = ref(false)

const show = () => {
    dialogVisible.value = true
}
defineExpose({
    show
})

interface RuleForm {
    type: string
    name: string
    ip: string
    username: string
    port: number
    password: string
}

const ruleFormRef = ref<FormInstance>()
const ruleForm = reactive<RuleForm>({
    type: "mysql",
    name: '',
    ip: 'localhost',
    username: 'root',
    password: 'root',
    port: 3306,
})
const rules = reactive<FormRules>({
    name: [
        {required: true, message: '请输入连接名', trigger: 'blur'},
    ], ip: [
        {required: true, message: '请输入ip', trigger: 'blur'},
    ], port: [
        {required: true, message: '请输入端口', trigger: 'blur'},
        {type: 'number', message: '请输入正确的端口'},
    ],
})
const getData = () => {
    return {
        type: ruleForm.type,
        name: ruleForm.name,
        ip: ruleForm.ip,
        username: ruleForm.username,
        password: ruleForm.password,
        port: ruleForm.port,
        showName: ruleForm.name
    }
}
const confirmData = async (formEl: FormInstance | undefined) => {
    
    if (!formEl) return
    await formEl.validate((valid, fields) => {
        
        if (!valid) {
            return;
        }
        console.log(getData())
        emit("onReceiveMsg", getData());
        formEl.resetFields()
        dialogVisible.value = false
        ElMessage.success("操作成功")
    })
}

interface EmitType {
    (e: "onReceiveMsg", params: object): void
}

const emit = defineEmits<EmitType>();

const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.resetFields()
}

const testConnect = () => {
    proxy.$request("test_connect", getData()).then((res) => {
        ElMessage.success('连接成功')
    })
    
}
let typeOption = ["mysql", "redis"]

</script>

<template>
    <el-dialog
        
        v-model="dialogVisible"
        title="新建连接"
        width="600px"
    >
        <el-form ref="ruleFormRef"
                 :model="ruleForm"
                 :rules="rules"
                 label-width="80px"
                 status-icon>
            <el-form-item label="类型" prop="name">
                <el-select v-model="ruleForm.type">
                    <el-option v-for="item in typeOption" :key="item" :label="item" :value="item"/>
                </el-select>
            </el-form-item>
            <el-form-item label="连接名" prop="name">
                <el-input v-model="ruleForm.name"/>
            </el-form-item>
            <div class="flex">
                <el-form-item label="地址" prop="ip">
                    <el-input v-model="ruleForm.ip"/>
                </el-form-item>
                <el-form-item label="端口" prop="port">
                    <el-input type="text" v-model.number="ruleForm.port"/>
                </el-form-item>
            </div>
            
            <el-form-item label="用户名" prop="username">
                <el-input v-model="ruleForm.username"/>
            </el-form-item>
            <el-form-item label="密码" prop="password">
                <el-input type="password" v-model="ruleForm.password"/>
            </el-form-item>
        </el-form>
        <el-button type="primary" @click="testConnect">测试连接</el-button>
        <template #footer>
	      <span class="dialog-footer">
	        <el-button @click="dialogVisible = false">取消</el-button>
	        <el-button type="primary" @click="confirmData(ruleFormRef)">
	          确定
	        </el-button>
	      </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.flex {
    display: flex;
    
}

.port {
    min-width: 3em;
    padding: 0 0.5em;
}
</style>