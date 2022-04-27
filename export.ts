/// <reference path="global.ts" />

if (location.pathname == "/export.html") {
    const lastExportTime: string = 'lastExportTime'

    const divInfo = document.getElementById('divInfo') as HTMLDivElement

    async function refreshDivInfo() {
        const last = await GetLocalValue(lastExportTime, 0)
        if (last > 100) {
            const dt = new Date(last)
            divInfo.innerText = `上次导出日期： ${GetDateZhString(dt)}`
        } else {
            divInfo.innerText = "从来都没有导出过。"
        }
    }

    const butExportData = document.getElementById('butExportData') as HTMLButtonElement
    butExportData.addEventListener('click', async function () {
        const now = new Date
        await SetLocalValue(lastExportTime, now.getTime())
        const data = await browser.storage.local.get()
        const j = JSON.stringify(data)
        const a = document.createElement('a')
        a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(j)}`
        a.download = `${bigTitle}_${GetDateString(now)}.json`
        a.click()
        a.remove()
        refreshDivInfo()
    })
    refreshDivInfo()

    const inputFile = document.getElementById('inputFile') as HTMLInputElement
    inputFile.addEventListener('input', async function () {
        const files = inputFile.files
        if (files == null || files.length < 1) {
            return
        }
        const file = files[0]
        try {
            const j = await file.text()
            const obj = JSON.parse(j)
            if (obj == null) {
                throw '得到的是 null'
            }
            if (!Object.prototype.hasOwnProperty.call(obj, lastExportTime)) {
                throw `数据里没有 ${lastExportTime}`
            }
            if (!confirm("确定要替换掉全部现有数据吗？")) {
                return
            }
            const olds = await browser.storage.local.get()
            for (const key in olds) {
                await SetLocalValue(key, null)
            }
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    const value = obj[key]
                    await SetLocalValue(key, value)
                }
            }
        } catch (error) {
            alert(`解析出错：\n${error}`)
        }
    })
}