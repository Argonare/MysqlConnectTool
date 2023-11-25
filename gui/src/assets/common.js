//获取url的参数
function getUrlParam(url) {
    let param = url.split("?")
    if (param.length === 0) {
        return {}
    }
    let params = param[1]
    if(params==null){
        return {}
    }
    let out={}
     params.split("&").forEach(e => {
        let name = e.split("=")[0]
        out[name] = e.split("=")[1]
    })
    return out
}

export function getTargetUrlParam(url, key) {
    let param = getUrlParam(url);
    console.log(key)
    if(key==null||param[key]==null){
        return null
    }

    return param[key]
}

