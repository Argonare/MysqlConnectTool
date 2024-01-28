<script setup>
import {computed, ref, toRefs, watch} from "vue";
import ListSearch from "@/components/level3/listSearch.vue";


const props = defineProps({
	headerType: String,
	tableColumn: Array
})
const {headerType, tableColumn} = toRefs(props)
watch(headerType, (newVal, oldValue) => {
	searchParam.value.forEach(e => {
		e.comment = newVal === 'en' ? e.enComment : e.cnComment
	})
})
const emit = defineEmits(['getRes', "cancel"])

const showFilter = ref(0)
const searchParam = ref([])
let listItemIndex = null
let listItemName = null
const showSearch = ref(0)
const activeIndex = ref(-1)
const listSearch = ref()
const applyFilter = () => {
	let res = []
	searchParam.value.forEach((e, index) => {
		let param = `${e.field} ${e.cal}`
		if (!e.noValue) {
			param += ` '${e.value}'`
		}
		if (index !== searchParam.value.length - 1) {
			param += ` ${e.seq}`
		}

		res.push(param)
	})
	emit('getRes', res.join(" "))
}
const clearFilter = () => {
	searchParam.value = []
}

const showMode = ref(3)

const calItem = [
	{
		key: '=',
		value: '=',
	}, {
		key: '>',
		value: '>',
	}, {
		key: '>=',
		value: '>=',
	}, {
		key: '<',
		value: '<',
	}, {
		key: '<=',
		value: '<=',
	},
	{
		key: '为空',
		value: "is null",
		noValue: true
	},
	{
		key: '不为空',
		value: "is not null",
		noValue: true
	},
]

const searchList = computed(() => {
	if (showMode.value === 2) {
		return calItem
	}
	return tableColumn.value.map(e => {
		return {key: headerType.value === 'en' ? e.prop : e.comment, value: e.prop}
	})
});


const showSearchPanel = (event, value, mode = 3, index, name) => {
	activeIndex.value = index
	let menu = document.querySelector("#searchList");
	let item = menu.parentElement.parentElement.parentElement.parentElement.parentElement

	listItemIndex = index
	listItemName = name
	showMode.value = mode
	listSearch.value.setDefaultValue(searchParam.value[listItemIndex][listItemName], listItemName)
	menu["style"].left = event.clientX - item.offsetLeft + "px";
	menu["style"].top = event.clientY - item.offsetTop - 54 + "px";
	// 改变自定义菜单的隐藏与显示
	menu["style"].display = "block";
	menu["style"].zIndex = 1000;
	showSearch.value = 1
}
const getSearchData = (data) => {

	showSearch.value = 0
	if (typeof data == "string") {
		searchParam.value[listItemIndex][listItemName] = data
		return
	}
	searchParam.value[listItemIndex][listItemName] = data.value
	if (data.noValue === true) {
		searchParam.value[listItemIndex].noValue = true
	} else {
		searchParam.value[listItemIndex].noValue = false
	}
	console.log(searchParam.value)
}


const addParam = (column = null) => {
	let e = column == null ? tableColumn.value[0] : column
	searchParam.value.push({
		field: e.prop,
		cal: "=",
		value: "",
		comment: headerType.value === 'en' ? e.prop : e.comment,
		seq: "and",
		cnComment: e.comment,
		enComment: e.prop,
	})
}
const switchFilter = (show = false) => {
	if (show) {
		showFilter.value = 1
	} else {
		showFilter.value = 1 - showFilter.value
		if (searchParam.value.length === 0) {
			addParam(null)
		}
	}

}
const removeItem = (index) => {
	searchParam.value.splice(index, 1)
}
defineExpose({switchFilter, addParam})
</script>

<template>
	<div class="topSelect flexColumn" v-if="showFilter===1">
		<div class="flexItem searchLine" v-for="(item,index) in searchParam" @click="activeIndex=index"
		     :class="index===activeIndex?'activeSearch':''">
			<div class="flexItem searchBtns">
				<el-button type="primary" link
				           @click="($event)=>{showSearchPanel($event,'',3,index,'comment');
									($event)=>showSearchPanel($event,'',3,index,'field')}">
					{{ item.comment }}
				</el-button>
				<el-button type="primary" link
				           @click="($event)=>showSearchPanel($event,'',2,index,'cal')">
					{{ item.cal }}
				</el-button>
				<div class="flexItem" v-if="!item.noValue">
					<el-button type="primary" v-if="item.value!==''" link
					           @click="($event)=>showSearchPanel($event,'',1,index,'value')">
						{{ item.value }}
					</el-button>
					<el-button type="primary" v-else link
					           @click="($event)=>showSearchPanel($event,'',1,index,'value')">
						""
					</el-button>
				</div>

				<div class="center" v-if="index!==searchParam.length-1">
					<el-button type="primary" link v-if="item.seq==='or'" @click="item.seq='and'">
						or
					</el-button>
					<el-button type="primary" link v-else @click="item.seq='or'">
						and
					</el-button>

				</div>

				<div class="flexItem addIcon" v-if="index===searchParam.length-1">
					<el-icon @click="addParam(null)">
						<CirclePlus/>
					</el-icon>

				</div>
				<div class="flexItem addIcon">
					<el-icon @click="removeItem(index)">
						<Remove/>
					</el-icon>

				</div>

			</div>
		</div>
		<div class="flexItem addIcon moreIco" v-if="searchParam.length===0">
			<el-icon @click="addParam(null)">
				<CirclePlus/>
			</el-icon>
		</div>
		<div class="flexItem applyBtn">
			<el-button type="primary" link @click="applyFilter">应用</el-button>
			<el-button type="primary" link @click="clearFilter">清空</el-button>
		</div>
	</div>
	<div id="searchList">
		<list-search ref="listSearch" :search-list="searchList"
		             @get-res="getSearchData" @cancel="showSearch=0"
		             :mode="showMode" v-show="showSearch===1"/>
	</div>
</template>

<style scoped>
.moreIco {
	padding: 0 0.5em;
	min-height: 22px;
}

.activeSearch {
	background: rgba(64, 158, 255, 0.3);

	& .el-button {
		color: black !important;
	}
}

.addIcon {
	color: #409EFF;
	cursor: pointer;
	width: 1.5em;
	padding-left: 1em;
	align-content: center;

	&:hover {
		opacity: 0.8;
	}
}

.center {
	padding-left: 0.5em;
	align-content: center;
}

.topSelect {
	background: white;
	width: 100%;
	border: 1px solid var(--el-border-color-light);

	.applyBtn {
		min-height: 23px;
		padding: 0.25em;
	}

	& .searchLine {
		align-content: center;
		min-height: 22px;

	}


	& .searchBtns {
		width: 100%;

		& > * {
			padding: 0 0.3em;
		}

		& > .flexItem:not(:last-child) {
			margin-left: 12px;
		}

		min-width: 100px;
		padding: 2px 0.5em;
	}
}

#searchList {
	position: absolute;
}

</style>