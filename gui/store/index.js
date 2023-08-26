import {useStore as baseUseStore, createStore} from 'vuex'

export default createStore({
    state: {
        openTab: [],//所有打开的路由
        activeIndex: '/empty', //也可以是默认激活路径；激活状态
        tableData:{}
    },
    mutations: {
        // 添加tabs
        add_tabs(state, data) {
            // if (state.openTab.length > 10) {
            //     return
            // }
            console.log("add")
            let flag = 0
            state.openTab.forEach(e => {
                if (e['route'] === data.route) {
                    flag = 1
                }
            })
            if (flag === 0) {
                state.openTab.push(data);
            }


        },
        // 删除tabs
        delete_tabs(state, route) {
            let index = 0;
            for (let option of state.openTab) {
                if (option.route === route) {
                    break;
                }
                index++;
            }
            this.state.openTab.splice(index, 1);
        },
        // 设置当前激活的tab
        set_active_index(state, index) {
            console.log("active")
            if (state.openTab.length > 10) {
                return
            }
            state.activeIndex = index;
        },
    },

    actions: {},
    modules: {}

})

export function useStore() {
    return baseUseStore()
}