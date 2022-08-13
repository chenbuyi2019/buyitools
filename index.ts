/// <reference path="global.ts" />

// 导航页
if (location.pathname == "/index.html") {
    document.title = bigTitle

    const tlist = document.getElementById('tlist') as HTMLDivElement
    let lastSelected: HTMLAnchorElement | null = null

    const tpage: string = 'tpage'
    const selected: string = 'selected'
    const tools = new Map<string, HTMLAnchorElement>()

    function onLinkClicked(ak: HTMLAnchorElement) {
        if (lastSelected != null) { lastSelected.className = '' }
        ak.className = selected
        lastSelected = ak
        location.hash = ak.title
    }

    function addTool(title: string, filename: string) {
        const a = document.createElement("a")
        a.innerText = title
        a.href = `/${filename}.html`
        a.title = filename
        a.target = tpage
        tlist.appendChild(a)
        a.addEventListener('click', function (this) { onLinkClicked(this) })
        tools.set(filename, a)
    }

    function onHashChanged() {
        let hash = location.hash.replaceAll('#', '')
        if (hash.length > 0) {
            const a = tools.get(hash)
            if (a != null) { onLinkClicked(a) }
        }
    }
    window.addEventListener('hashchange', function (e) {
        if (e.isTrusted) { onHashChanged() }
    })

    addTool("资产", "money")
    addTool("记账", "accountbook")
    addTool("日程", "reminder")
    addTool("数据导入导出", "export")

    onHashChanged()
}
