<script setup>
import {empty} from "@/js/common";
import {onMounted, ref} from "vue";

onMounted(() => {
	getData()
})
const getDesc = async () => {
	proxy.$request("get_change_log").then(data => {
		tableData.value = data
	})
}

const tableData = ref([])
</script>

<template>

</template>

<style scoped>

</style>