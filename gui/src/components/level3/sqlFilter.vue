<script setup>
import {computed, ref, toRefs} from "vue";
import ListSearch from "@/components/level3/listSearch.vue";


const props = defineProps({
	headerType: String,
	tableColumn: Array
})
const {headerType, tableColumn} = toRefs(props)
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
		let param = ""
		if (index === searchParam.value.length - 1) {
			param = `${e.field} ${e.cal} '${e.value}'`
		} else {
			param = `${e.field} ${e.cal} '${e.value}' ${e.seq}`
		}
		res.push(param)
	})
	console.log(res.join(" "))
}
const clearFilter = () => {
	searchParam.value = []
}

const showMode = ref(3)

const calItem = ['=', '>', '>=', '<', '<=']

const splitItem = ['and', 'or']

const searchList = computed(() => {
	if (showMode.value === 2) {
		return calItem.map(e => {
			return {name: e, value: e}
		})
	}
	return tableColumn.value.map(e => {
		return {name: headerType.value === 'en' ? e.prop : e.comment, value: e.prop}
	})
});


const showSearchPanel = (event, value, mode = 3, index, name) => {
	activeIndex.value = index
	let menu = document.querySelector("#searchList");
	let item = menu.parentElement.parentElement.parentElement.parentElement.parentElement

	listItemIndex = index
	listItemName = name
	showMode.value = mode

	listSearch.value.setDefaultValue(searchParam.value[listItemIndex][listItemName])
	menu["style"].left = event.clientX - item.offsetLeft + "px";
	menu["style"].top = event.clientY - item.offsetTop - 54 + "px";
	// 改变自定义菜单的隐藏与显示
	menu["style"].display = "block";
	menu["style"].zIndex = 1000;
	showSearch.value = 1
}
const getSearchData = (data) => {
	showSearch.value = 0
	searchParam.value[listItemIndex][listItemName] = data

}


const addParam = () => {
	console.log(222)
	let e = tableColumn.value[0]
	searchParam.value.push({
		"field": e.prop,
		"cal": "=",
		value: "",
		comment: headerType.value === 'en' ? e.prop : e.comment,
		"seq": "and"
	})
}
const switchFilter = () => {
	showFilter.value = 1 - showFilter.value
}
defineExpose({switchFilter})
</script>

<template>
	<div class="topSelect flexColumn" v-if="showFilter===1">
		<div class="flexItem searchLine" v-for="(item,index) in searchParam"
		     :class="index===activeIndex?'activeSearch':''">
			<div class="flexItem searchBtns">
				<el-button type="primary" link @click="($event)=>showSearchPanel($event,'',3,index,'comment')">
					{{ item.comment }}
				</el-button>
				<el-button type="primary" link @click="($event)=>showSearchPanel($event,'',2,index,'cal')">
					{{ item.cal }}
				</el-button>
				<el-button type="primary" v-if="item.value!==''" link
				           @click="($event)=>showSearchPanel($event,'',1,index,'value')">
					{{ item.value }}
				</el-button>
				<el-button type="primary" v-else link @click="($event)=>showSearchPanel($event,'',1,index,'value')">
<!--					&lt;&nbsp;?&nbsp;&gt;-->
					""
				</el-button>
				<div class="center" v-if="index!==searchParam.length-1" >
					<el-button type="primary" link v-if="item.seq==='or'" @click="item.seq='and'">
						or
					</el-button>
					<el-button type="primary" link v-else @click="item.seq='or'">
						and
					</el-button>

				</div>

				<div class="flexItem addIcon" v-if="index===searchParam.length-1">
					<el-icon @click="addParam">
						<CirclePlus/>
					</el-icon>
				</div>
			</div>
		</div>
		<div class="flexItem addIcon moreIco" v-if="searchParam.length===0">
			<el-icon @click="addParam">
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
.center{
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

	& .el-button {
		padding: 0 0.3em;
	}

	& .searchBtns {
		min-width: 100px;
		padding: 2px 0.5em;
	}
}

#searchList {
	position: absolute;
}

</style>