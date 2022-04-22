/// <reference path="global.ts" />

if (location.pathname == "/index.html") {
    document.title = bigTitle

    const tlist = document.getElementById('tlist') as HTMLDivElement
    let lastSelected: HTMLAnchorElement | null = null

    const tpage: string = 'tpage'
    const selected: string = 'selected'

    function addTool(title: string, filename: string) {
        const a = document.createElement("a")
        a.innerText = title
        a.href = `/${filename}.html`
        a.target = tpage
        tlist.appendChild(a)
        a.addEventListener('click', function () {
            if (lastSelected != null) {
                lastSelected.className = ''
            }
            a.className = selected
            lastSelected = a
        })
    }
    addTool("记账", "accountbook")
    addTool("日程", "reminder")
    addTool("数据导入导出", "export")
}