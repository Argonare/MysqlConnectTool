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
const CONNECT_NAME_MAX_LENGTH = 64
const CONNECT_ADDRESS_MAX_LENGTH = 253
const CONNECT_USERNAME_MAX_LENGTH = 64
const CONNECT_PASSWORD_MAX_LENGTH = 1024

const isIPv4 = (value: string) => {
    const parts = value.split('.')
    return parts.length === 4 &&
        parts.every(part => /^\d{1,3}$/.test(part) && Number(part) <= 255)
}

const isHostnameLabel = (label: string) => {
    if (!label || label.length > 63) {
        return false
    }
    const word = /^[\p{L}\p{N}_]$/u
    if (!word.test(label[0]) || !word.test(label[label.length - 1])) {
        return false
    }
    return /^[\p{L}\p{N}_-]+$/u.test(label)
}

const isValidAddress = (value: string) => {
    if (!value || value.length > CONNECT_ADDRESS_MAX_LENGTH || /\s/.test(value)) {
        return false
    }
    if (value.includes(':')) {
        const [ipv6, zone, ...rest] = value.split('%')
        return value.length <= 45 && rest.length === 0 && ipv6.split(':').length >= 2 &&
            /^[0-9a-fA-F:.]+$/.test(ipv6) &&
            (zone === undefined || /^[A-Za-z0-9_.-]+$/.test(zone))
    }
    const host = value.endsWith('.') ? value.slice(0, -1) : value
    const parts = host.split('.')
    if (parts.length === 4 && parts.every(part => /^\d+$/.test(part))) {
        return isIPv4(host)
    }
    return parts.length > 0 && parts.every(isHostnameLabel)
}

const validateAddress = (_rule: any, value: string, callback: (error?: Error) => void) => {
    if (value === undefined || value === null || value === '') {
        callback()
        return
    }
    if (value.length > CONNECT_ADDRESS_MAX_LENGTH) {
        callback(new Error(`地址不能超过${CONNECT_ADDRESS_MAX_LENGTH}个字符`))
        return
    }
    if (!isValidAddress(value)) {
        callback(new Error('请输入正确的地址（IP 或域名）'))
        return
    }
    callback()
}

const validatePort = (_rule: any, value: number | string, callback: (error?: Error) => void) => {
    if (value === undefined || value === null || value === '') {
        callback()
        return
    }
    const port = Number(value)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        callback(new Error('端口范围为 1-65535'))
        return
    }
    callback()
}

const rules = reactive<FormRules>({
    name: [
        {required: true, whitespace: true, message: '请输入连接名', trigger: 'blur'},
        {
            max: CONNECT_NAME_MAX_LENGTH,
            message: `连接名不能超过${CONNECT_NAME_MAX_LENGTH}个字符`,
            trigger: ['blur', 'change']
        },
    ], ip: [
        {required: true, message: '请输入地址', trigger: 'blur'},
        {validator: validateAddress, trigger: ['blur', 'change']},
    ], username: [
        {
            max: CONNECT_USERNAME_MAX_LENGTH,
            message: `用户名不能超过${CONNECT_USERNAME_MAX_LENGTH}个字符`,
            trigger: ['blur', 'change']
        },
    ], password: [
        {
            max: CONNECT_PASSWORD_MAX_LENGTH,
            message: `密码不能超过${CONNECT_PASSWORD_MAX_LENGTH}个字符`,
            trigger: ['blur', 'change']
        },
    ], port: [
        {required: true, message: '请输入端口', trigger: 'blur'},
        {type: 'number', message: '请输入正确的端口'},
        {validator: validatePort, trigger: ['blur', 'change']},
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
const validateForm = async (formEl: FormInstance | undefined) => {
    if (!formEl) return false
    try {
        return await formEl.validate()
    } catch {
        return false
    }
}

const confirmData = async (formEl: FormInstance | undefined) => {
    if (!formEl || !await validateForm(formEl)) {
        return
    }
    emit("onReceiveMsg", getData());
    formEl.resetFields()
    dialogVisible.value = false
    ElMessage.success("操作成功")
}

interface EmitType {
    (e: "onReceiveMsg", params: object): void
}

const emit = defineEmits<EmitType>();

const resetForm = (formEl: FormInstance | undefined) => {
    if (!formEl) return
    formEl.resetFields()
}

const testConnect = async () => {
    if (!await validateForm(ruleFormRef.value)) {
        return
    }
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
                <el-input v-model.trim="ruleForm.name"
                          :maxlength="CONNECT_NAME_MAX_LENGTH"
                          show-word-limit/>
            </el-form-item>
            <div class="flex">
                <el-form-item label="地址" prop="ip">
                    <el-input v-model.trim="ruleForm.ip"
                              :maxlength="CONNECT_ADDRESS_MAX_LENGTH"/>
                </el-form-item>
                <el-form-item label="端口" prop="port">
                    <el-input type="text" v-model.number="ruleForm.port"/>
                </el-form-item>
            </div>
            
            <el-form-item label="用户名" prop="username">
                <el-input v-model.trim="ruleForm.username"
                          :maxlength="CONNECT_USERNAME_MAX_LENGTH"/>
            </el-form-item>
            <el-form-item label="密码" prop="password">
                <el-input type="password"
                          v-model="ruleForm.password"
                          :maxlength="CONNECT_PASSWORD_MAX_LENGTH"/>
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