<script setup lang="ts">
import {useRoute, useRouter} from "vue-router";
import {computed, getCurrentInstance, nextTick, onMounted, reactive, ref, toRaw} from "vue";
import {useStore} from "vuex";

const route = useRoute()

const {proxy}: any = getCurrentInstance();
const store = useStore()
const form = ref({
    key: '',
    type: '',
    ttl: '',
    value: ''
})
onMounted(() => {
    window.addEventListener('pywebviewready', function () {
        selectByKey()
    })
    if (window["pywebview"]) {
        selectByKey()
    }
})
const onSubmit = () => {
    console.log('submit!')
}
const selectByKey = () => {
    proxy.$request("select_by_key", route.query).then(data => {
        form.value = data
        try {
            form.value.value = JSON.parse(form.value.value)
            
            form.value.value = JSON.stringify(form.value.value, null, 2)
        } catch (e) {
        
        }
        
        console.log(data)
    })
}

console.log(111)

</script>

<template>
    <div style="height: 100%;max-width: 90%;margin-top: 10px" class="flexColumn">
        <el-form :model="form" class="flexColumn flex1" label-width="80" >
            <div class="flexRow">
                <el-form-item label="键">
                    <el-input v-model="form.key" readonly spellcheck="false"/>
                </el-form-item>
                <el-form-item label="类型">
                    <el-input v-model="form.type" spellcheck="false"/>
                </el-form-item>
                <el-form-item label="过期时间">
                    <el-input v-model="form.ttl" type="number" spellcheck="false"/>
                </el-form-item>
            </div>
            
            <el-form-item label="值" class="flex1">
<!--                TODO 能看json缩略图，收起json-->
                <el-input type="textarea" v-model="form.value" style="height: 100%" class="textCss" spellcheck="false"/>
            </el-form-item>
        </el-form>
        <div  style="margin-bottom: 12px;text-align: right">
            <el-button type="primary">提交</el-button>
            <el-button type="danger">删除</el-button>
            <el-button>关闭</el-button>
        </div>
    </div>
</template>

<style scoped>
:deep(textarea) {
    height: 100% !important;
    min-height: unset !important;
}
</style>