
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
        this.Editor.style.width = '95%'
        this.Editor.style.resize = 'none'
        this.Editor.style.height = '150px'
        this.Editor.style.display = 'none'
        this.DataKey = dataKey
        this.BoxElement.className = 'MoneyBox'
        this.BoxElement.appendChild(this.Editor)
        this.BoxElement.appendChild(this.EditButton)
        const me: MoneyBoxElement = this
        this.EditButton.addEventListener('click', async function () {
            if (me.Editor.style.display == 'none') {
                me.StartEdit()
            } else {
                const lines = me.Editor.value.split(/[\n\r]+/gim)
                const regEventLine = /([-\.0-9]+)(w?)\s+(.+)/i
                me.Records.splice(0, me.Records.length)
                for (const rawline of lines) {
                    const line = rawline.normalize().trim()
                    if (line.length < 1) {
                        continue
                    }
                    const r = regEventLine.exec(line)
                    if (r == null) {
                        alert(`不符合格式的一行：\n${line}`)
                        return
                    }
                    const num = parseFloat(parseFloat(r[1]).toFixed(2))
                    const waste = num < 0 && r[2] != null && r[2].length > 0
                    const tt = r[3]
                    if (tt.length < 1 || tt.length > 20) {
                        alert(`记录过长或为空：\n${num} ${tt}`)
                        return
                    }
                    const e: MoneyRecord = {
                        Waste: waste,
                        Number: num,
                        Text: tt
                    }
                    me.Records.push(e)
                }
                me.RefreshEventsUI()
                if (me.DataKey.length > 0) {
                    const obj = me.Records.length > 0 ? me.Records : null
                    await SetLocalValue(me.DataKey, obj)
                    if (me.OnDataUpdated != null) {
                        me.OnDataUpdated(me.DataKey, me.Records)
                    }
                }
            }
        });
        (async function () {
            if (me.DataKey.length > 0) {
                const obj: Array<MoneyRecord> = await GetLocalValue(me.DataKey, [])
                if (obj.length > 0) {
                    for (const e of obj) {
                        me.Records.push(e)
                    }
                    me.RefreshEventsUI()
                } else if (startEditIfEmpty) {
                    me.StartEdit()
                }
            }
        })()
    }
    readonly BoxElement: HTMLDivElement = document.createElement('div')
    readonly Records: Array<MoneyRecord> = []
    readonly Editor: HTMLTextAreaElement = document.createElement('textarea')
    readonly EditButton: HTMLButtonElement = document.createElement('button')
    readonly DataKey: string
    OnDataUpdated: ((key: string, value: Array<MoneyRecord>) => void) | null = null
    ClearUI() {
        const lines: Element[] = []
        for (const e of this.BoxElement.getElementsByClassName('MoneyBoxLine')) {
            lines.push(e)
        }
        for (const e of lines) {
            e.remove()
        }
    }
    RefreshEventsUI() {
        this.ClearUI()
        if (this.Records.length > 0) {
            this.Records.sort(function (a: MoneyRecord, b: MoneyRecord): number {
                if (a.Number > b.Number) { return 1 }
                if (a.Number < b.Number) { return -1 }
                return 0
            })
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
        this.Editor.style.display = 'none'
        this.EditButton.innerText = '编辑'
    }
    StartEdit() {
        this.ClearUI()
        this.Editor.style.display = 'block'
        this.EditButton.innerText = '保存'
        let out = ''
        for (const e of this.Records) {
            out += `${e.Number.toFixed(2)}${e.Waste ? "w" : ""} ${e.Text}\n`
        }
        this.Editor.value = out
    }
}