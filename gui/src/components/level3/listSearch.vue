<template>
    <div class="market-details-container">
        <el-input v-model="keyword" clearable v-if="mode===1||mode===3" size="small"/>
        <div class="flexColumn" v-if="mode>1">
            <div v-for="(v, k) in filterList" :key="k" class="listItem" @click="activeItem(v)"
                 @dblclick="activeItem(v,true)"
                 :class="activeName.value===v.value?'listItemActive':''">
                {{ v.key }}
            </div>
        </div>
        <div class="flexItem bottomButton">
            <el-button type="primary" @click="confirmMsg" size="small">确定</el-button>
            <el-button @click="cancel" size="small">取消</el-button>
        </div>
    </div>
</template>

<script setup>
import {toRefs, computed, ref, toRaw} from 'vue';
import {empty} from "@/js/common";
//mode 1 仅input 2 仅list 3所有
const props = defineProps({
    searchList: Array,
    mode: Number,
    
})
const activeName = ref("")
const keyword = ref("")
const {searchList, mode} = toRefs(props)
const emit = defineEmits(['getRes', "cancel"])
const cancel = () => {
    emit('cancel')
}

const confirmMsg = () => {
    if (mode.value === 1) {
        emit('getRes', keyword.value)
        return
    }
    keyword.value = ""
    emit('getRes', activeName.value)
}


const activeItem = (item, dbl = false) => {
    activeName.value = item
    if (dbl) {
        confirmMsg()
    }
}
const filterList = computed(() => {
    return searchList.value.filter((v) => !empty(keyword) || v.name.indexOf(keyword.value) !== -1);
});

const setDefaultValue = (str, mode) => {
    if (mode === "value") {
        keyword.value = str
        return
    }
    activeName.value = str
}
defineExpose({setDefaultValue})
</script>

<style scoped lang="scss">
.bottomButton {
    margin-top: 0.6em;
}

.flexItem {
    justify-content: center;
}

.flexColumn {
    margin-top: 0.2em;
}

.market-details-container {
    padding: 0.8em;
    width: 15em;
    background: white;
    border: 1px solid #eee;
    box-shadow: var(--el-box-shadow-light);
}

.listItem {
    margin: 0.3em 0 0;
    padding: 0.2em 0.5em;
    border-radius: 3px;
    
    &:hover {
        background: #eee;
    }
}

.listItemActive {
    background: #409EFF !important;
    color: white;
}
</style>