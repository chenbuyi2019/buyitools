
/**
 * 记账记录
 * @interface MoneyRecord
 */
interface MoneyRecord {
    Number: number,
    Text: string,
    Waste: boolean
}

/**
 * 记账记录的排序函数，从小到大
 */
function SortMoneyRecords(a: MoneyRecord, b: MoneyRecord): number {
    if (a.Number > b.Number) { return 1 }
    return 0
}

/**
 * 记账记录的排序函数，从大到小
 */
function SortMoneyRecordsRev(a: MoneyRecord, b: MoneyRecord): number {
    if (a.Number > b.Number) { return -1 }
    return 0
}

/**
 * 为记账记录 MoneyRecord 准备的专用 UI 。
 * 创建好之后需把 BoxElement 放置到对应的位置。
 * dataKey 是自动同步记账记录数据到扩展存储中用的。
 * @class MoneyBoxElement
 */
class MoneyBoxElement {
    constructor(dataKey: string, startEditIfEmpty: boolean = true) {
        this.EditButton.style.display = 'block'
        this.EditButton.innerText = '编辑'
        this.EditButton.style.marginTop = '6px'
        this.DataKey = dataKey
        this.BoxElement.className = 'MoneyBox'
        this.BoxElement.appendChild(this.EditButton)
        const me: MoneyBoxElement = this;
        this.EditButton.addEventListener('click', async function () {
            const regEventLine = /([-\.0-9]+)(w?)\s+(.+)/i
            let lastTxt = ""
            for (const e of me.Records) {
                lastTxt += `${e.Number.toFixed(2)}${e.Waste ? "w" : ""} ${e.Text}\n`
            }
            let output: Array<MoneyRecord> = []
            while (true) {
                output = []
                const newTxt = await InputBox("编辑账目：", lastTxt)
                if (newTxt == null) { break }
                try {
                    const lines = newTxt.split(/[\n\r]+/gim)
                    for (const rawline of lines) {
                        const line = rawline.trim()
                        if (line.length < 1) { continue }
                        const r = regEventLine.exec(line)
                        if (r == null) { throw `不符合格式：\n${line}` }
                        const num = parseFloat(parseFloat(r[1]).toFixed(2))
                        const waste = num < 0 && r[2] != null && r[2].length > 0
                        const tt = r[3]
                        if (tt.length < 1 || tt.length > 20) { throw `说明文字过长或为空：\n${num} ${tt}` }
                        const e: MoneyRecord = {
                            Waste: waste,
                            Number: num,
                            Text: tt
                        }
                        output.push(e)
                    }
                } catch (error) {
                    lastTxt = newTxt
                    alert(error)
                    continue
                }
                me.Records.splice(0, me.Records.length)
                me.Records.push(...output)
                me.RefreshRecordsUI()
                if (me.DataKey.length > 0) {
                    const obj = me.Records.length > 0 ? me.Records : null
                    await SetLocalValue(me.DataKey, obj)
                }
                break
            }
            if (me.OnDataUpdated != null) { me.OnDataUpdated(me.DataKey, me.Records) }
        });
        (async function () {
            if (me.DataKey.length > 0) {
                const obj: Array<MoneyRecord> = await GetLocalValue(me.DataKey, [])
                if (obj.length > 0) {
                    for (const e of obj) {
                        me.Records.push(e)
                    }
                    me.RefreshRecordsUI()
                } else if (startEditIfEmpty) {
                    me.EditButton.click()
                }
            }
        })();
    }
    readonly BoxElement: HTMLDivElement = document.createElement('div')
    readonly Records: Array<MoneyRecord> = []
    readonly EditButton: HTMLButtonElement = document.createElement('button')
    readonly DataKey: string

    /**
     * 当数据提交保存的时候，引发的函数
     */
    OnDataUpdated: ((key: string, value: Array<MoneyRecord>) => void) | null = null

    /**
     * 刷新每条金钱记录的 UI
     */
    RefreshRecordsUI() {
        const lines: Array<Element> = []
        for (const e of this.BoxElement.getElementsByClassName('MoneyBoxLine')) {
            lines.push(e)
        }
        for (const e of lines) {
            e.remove()
        }
        if (this.Records.length > 0) {
            this.Records.sort(SortMoneyRecords)
            for (const e of this.Records) {
                const line = document.createElement('div')
                line.className = "MoneyBoxLine"
                const num = document.createElement('span')
                num.innerText = e.Number.toFixed(2)
                if (e.Number > 0) {
                    num.style.backgroundColor = '#98e898'
                } else if (e.Waste) {
                    num.style.backgroundColor = '#ff6f6f'
                } else {
                    num.style.backgroundColor = '#ffb1b1'
                }
                num.style.display = 'inline-block'
                num.style.minWidth = '30%'
                num.style.textAlign = 'right'
                const label = document.createElement('label')
                label.innerText = e.Text
                label.style.display = num.style.display
                label.style.marginLeft = '5px'
                label.style.fontSize = 'small'
                line.appendChild(num)
                line.appendChild(label)
                this.BoxElement.insertBefore(line, this.EditButton)
            }
        }
    }

}