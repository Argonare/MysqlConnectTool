<template>
	<div class="market-details-container">
		<el-input v-model="keyword" clearable/>
		<div class="flexColumn">
			<div v-for="(v, k) in filterList" :key="k" class="listItem" @click="activeItem(v)"
			     :class="activeName===v.value?'listItemActive':''">{{ v.name }}
			</div>
		</div>
		<div class="flexItem">
			<el-button type="primary" @click="confirmMsg">确定</el-button>
			<el-button @click="cancel">取消</el-button>
		</div>
	</div>
</template>

<script setup>
import {toRefs, onMounted, computed, ref, toRaw} from 'vue';
import {empty} from "@/js/common";

const props = defineProps({
	searchList: Array,
	defaultValue: String
})

const emit = defineEmits(['getRes', "cancel"])
const cancel = () => {
	emit('cancel')
}
const confirmMsg = () => {
	emit('getRes', activeName.value)
}
const activeName = ref("")
const keyword = ref("")
const {searchList, defaultValue} = toRefs(props)

const activeItem = (item) => {
	activeName.value = item.value
}
const filterList = computed(() => {
	return searchList.value.filter((v) => !empty(keyword) || v.name.indexOf(keyword.value) !== -1);
});


</script>

<style scoped lang="scss">
.flexItem {
	justify-content: center;
}

.flexColumn {
	margin-top: 0.2em;
}

.market-details-container {
	padding: 1em;
	width: 15em;
	background: white;
	border: 1px solid #eee;
	box-shadow: var(--el-box-shadow-light);
}

.listItem {
	margin: 0.1em 0;
	padding: 0.2em;

}

.listItemActive {
	background: #409EFF;
	color: white;
}
</style>