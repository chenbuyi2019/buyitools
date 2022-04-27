
interface MoneyEvent {
    Number: number,
    Text: string,
    Waste: boolean
}

const zhEdit = '编辑'
const zhSave = '保存'

class MoneyBoxElement {
    constructor(dataKey: string) {
        this.EditButton.style.display = 'block'
        this.EditButton.innerText = zhEdit
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
                me.Events.splice(0, me.Events.length)
                for (const line of lines) {
                    const r = regEventLine.exec(line.normalize().trim())
                    if (r == null) {
                        continue
                    }
                    const num = parseFloat(parseFloat(r[1]).toFixed(2))
                    const waste = num < 0 && r[2] != null && r[2].length > 0
                    const tt = r[3]
                    if (tt.length < 1 || tt.length > 20) {
                        alert(`记录过长或为空：\n${num} ${tt}`)
                        return
                    }
                    const e: MoneyEvent = {
                        Waste: waste,
                        Number: num,
                        Text: tt
                    }
                    me.Events.push(e)
                }
                me.RefreshEventsUI()
                if (me.DataKey.length > 0) {
                    const obj = me.Events.length > 0 ? me.Events : null
                    await SetLocalValue(me.DataKey, obj)
                    if (me.OnDataUpdated != null) {
                        me.OnDataUpdated(me.DataKey, me.Events)
                    }
                }
            }
        });
        (async function () {
            if (me.DataKey.length > 0) {
                const obj: Array<MoneyEvent> = await GetLocalValue(me.DataKey, [])
                if (obj.length > 0) {
                    for (const e of obj) {
                        me.Events.push(e)
                    }
                    me.RefreshEventsUI()
                }
            }
        })()
    }
    readonly BoxElement: HTMLDivElement = document.createElement('div')
    readonly Events: Array<MoneyEvent> = []
    readonly Editor: HTMLTextAreaElement = document.createElement('textarea')
    readonly EditButton: HTMLButtonElement = document.createElement('button')
    readonly DataKey: string
    OnDataUpdated: ((key: string, value: Array<MoneyEvent>) => void) | null = null
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
        if (this.Events.length > 0) {
            this.Events.sort(function (a: MoneyEvent, b: MoneyEvent): number {
                if (a.Number > b.Number) { return 1 }
                if (a.Number < b.Number) { return -1 }
                return 0
            })
            for (const e of this.Events) {
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
        this.EditButton.innerText = zhEdit
    }
    StartEdit() {
        this.ClearUI()
        this.Editor.style.display = 'block'
        this.EditButton.innerText = zhSave
        let out = ''
        for (const e of this.Events) {
            out += `${e.Number.toFixed(2)}${e.Waste ? "w" : ""} ${e.Text}\n`
        }
        this.Editor.value = out
    }
}