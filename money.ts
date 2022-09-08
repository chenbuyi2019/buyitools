/// <reference path="global.ts" />
/// <reference path="moneyBoxElement.ts" />

// 资产页面
if (location.pathname == "/money.html") {
    const topSum = document.getElementById('topSum') as HTMLElement
    const topSumTtitle = topSum.innerText
    const divSections = document.getElementById('sections') as HTMLDivElement
    const allSections: Array<MoneyBoxElement> = []

    function addSection(title: string) {
        const div = document.createElement('div')
        const h2 = document.createElement('h2')
        h2.innerText = title
        div.appendChild(h2)
        const e = new MoneyBoxElement(title, `money${title}`, false)
        e.OnDataUpdated = function (key, array) {
            let sum = 0
            for (const e of array) {
                sum += e.Number
            }
            if (sum != 0) {
                h2.innerText = `${title} ${sum.toFixed(2)}`
            } else {
                h2.innerText = title
            }
            UpdateSum()
        }
        div.appendChild(e.BoxElement)
        div.className = 'moneysection'
        divSections.appendChild(div)
        allSections.push(e)
        setTimeout(function () {
            if (e.OnDataUpdated == null) { return }
            e.OnDataUpdated(e.DataKey, e.Records)
        }, 150)
    }

    addSection("活期余额")
    addSection("定期存款")
    addSection("理财投资")
    addSection("债务")
    addSection("债权")

    function UpdateSum() {
        let sum = 0
        for (const t of allSections) {
            for (const ev of t.Records) {
                sum += ev.Number
            }
        }
        topSum.innerText = `${topSumTtitle} ${sum.toFixed(2)}`
    }
    setTimeout(UpdateSum, 150)
}