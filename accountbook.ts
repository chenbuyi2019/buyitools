/// <reference path="global.ts" />

if (location.pathname == "/accountbook.html") {

    interface MoneyEvent {
        Number: number,
        Text: string,
        Waste: boolean
    }

    const detaillist = document.getElementById('detaillist') as HTMLDivElement
    const inputNewDay = document.getElementById('inputNewDay') as HTMLInputElement
    inputNewDay.valueAsDate = new Date()
    const butAddNewDay = document.getElementById('butAddNewDay') as HTMLButtonElement
    butAddNewDay.addEventListener('click', async function () {
        const dt = inputNewDay.valueAsDate
        if (dt == null) {
            return
        }
        const days: string[] = await GetLocalValue(accountdays, [])
        if (days.includes(ToDateString(dt))) {
            alert("此日期已经存在记录，请直接去修改那一天的记录。")
            return
        }
        addDayDetailDiv(dt, [])
    })

    const accountdays: string = "accountdays"

    function SortMoneyEvents(a: MoneyEvent, b: MoneyEvent): number {
        if (a.Number > b.Number) { return 1 }
        if (a.Number < b.Number) { return -1 }
        return 0
    }

    function addDayDetailDiv(dt: Date, events: MoneyEvent[]) {
        const div = document.createElement('div')
        const time = document.createElement('time')
        const dtstr = ToDateString(dt)
        time.dateTime = dtstr
        time.innerText = ToDateZhString(dt) + "\n" + ToWeekdayZhString(dt)
        div.appendChild(time)
        const ul = document.createElement('ul')
        div.appendChild(ul)
        const editor = document.createElement('textarea')
        div.appendChild(editor)
        const butSave = document.createElement('button')
        butSave.style.display = 'block'
        time.appendChild(butSave)
        async function refreshEvents() {
            const storagett = accountdays + dtstr
            if (events.length < 1) {
                await SetLocalValue(storagett, null)
                let days: string[] = await GetLocalValue(accountdays, [])
                let index = days.indexOf(dtstr)
                if (index >= 0) {
                    days.splice(index, 1)
                }
                await SetLocalValue(accountdays, days)
                div.remove()
            } else {
                events.sort(SortMoneyEvents)
                await SetLocalValue(storagett, events)
                let days: string[] = await GetLocalValue(accountdays, [])
                if (!days.includes(dtstr)) {
                    days.push(dtstr)
                }
                await SetLocalValue(accountdays, days)
                for (const e of events) {
                    const li = document.createElement('li')
                    const num = document.createElement('span')
                    num.innerText = e.Number.toFixed(2)
                    if (e.Number > 0) {
                        num.className = 'moneyearn'
                    } else if (e.Waste) {
                        num.className = 'moneywaste'
                    } else {
                        num.className = 'moneyspend'
                    }
                    const label = document.createElement('label')
                    label.innerText = e.Text
                    li.appendChild(num)
                    li.appendChild(label)
                    ul.appendChild(li)
                }
                editor.value = ''
                ul.style.display = 'block'
                butSave.innerText = "编辑"
                editor.style.display = 'none'
            }
        }
        function refreshEditor() {
            editor.style.display = 'block'
            ul.style.display = 'none'
            butSave.innerText = "保存"
            let out = ''
            for (const e of events) {
                out += `${e.Number.toFixed(2)}${e.Waste ? 'w' : ''}  ${e.Text}\n`
            }
            editor.value = out
        }
        if (events.length > 0) {
            refreshEvents()
        } else {
            refreshEditor()
        }
        butSave.addEventListener('click', function () {
            if (editor.style.display != 'none') {
                const lines = editor.value.split(/[\n\r]+/gim)
                const regEventLine = /([-\.0-9]+)(w?)\s+(.+)/i
                ul.innerText = ''
                events.splice(0, events.length)
                for (const line of lines) {
                    const r = regEventLine.exec(line.normalize().trim())
                    if (r == null) {
                        continue
                    }
                    const num = parseFloat(parseFloat(r[1]).toFixed(2))
                    if (num > 99999 || num < -99999) {
                        alert(`你哪里来这么多钱，本软件不合适你\n${num}`)
                        return
                    }
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
                    events.push(e)
                }
                refreshEvents()
            } else {
                refreshEditor()
            }
        })
        detaillist.insertBefore(div, detaillist.firstChild)
    }

    const statResult = document.getElementById('statResult') as HTMLDivElement
    const butDoStat = document.getElementById("butDoStat") as HTMLButtonElement
    const inputStartDate = document.getElementById('inputStartDate') as HTMLInputElement
    const inputEndDate = document.getElementById('inputEndDate') as HTMLInputElement

    (async function () {
        const days: string[] = await GetLocalValue(accountdays, [])
        days.sort(function (a, b) {
            return a.localeCompare(b)
        })
        for (let index = 0; index < Math.min(20, days.length); index++) {
            const dtstr = days[index]
            const events = await GetLocalValue(accountdays + dtstr)
            addDayDetailDiv(new Date(dtstr), events)
        }
        const today = new Date()
        inputEndDate.valueAsDate = today
        today.setDate(today.getDate() - 3)
        inputStartDate.valueAsDate = today
        const statbuttons = document.getElementById('statbuttons') as HTMLDivElement
        const buttons = statbuttons.getElementsByTagName('button')
        for (const button of buttons) {
            button.addEventListener('click', function (this) {
                const today = new Date()
                const days = parseInt(this.title)
                inputEndDate.valueAsDate = today
                today.setDate(today.getDate() - days)
                inputStartDate.valueAsDate = today
                butDoStat.click()
            })
        }
    })();

    butDoStat.addEventListener('click', async function () {
        statResult.innerText = ""
        const t1 = inputStartDate.valueAsDate
        const t2 = inputEndDate.valueAsDate
        if (t1 == null || t2 == null) {
            statResult.innerText = "开始和结束时间不能为空白"
            return
        }
        const n1 = t1.getTime()
        const n2 = t2.getTime()
        const dstart = Math.min(n1, n2)
        const dend = Math.max(n1, n2)
        const days: string[] = await GetLocalValue(accountdays, [])
        let sumspend = 0
        let sumearn = 0
        let sumwaste = 0
        let countdays = 0
        let sumdailyspend = 0
        const wastes: MoneyEvent[] = []
        const spends: MoneyEvent[] = []
        let maxdate = 0
        let mindate = 0
        for (const day of days) {
            const dt = new Date(day)
            const ms = dt.getTime()
            if (dstart > ms || ms > dend) {
                continue
            }
            const events: MoneyEvent[] = await GetLocalValue(accountdays + ToDateString(dt), [])
            if (events.length < 1) {
                continue
            }
            if (maxdate == 0) {
                maxdate = ms
                mindate = ms
            } else {
                maxdate = Math.max(maxdate, ms)
                mindate = Math.min(mindate, ms)
            }
            countdays += 1
            for (const e of events) {
                if (e.Number > 0) {
                    sumearn += e.Number
                } else {
                    sumspend += e.Number
                    spends.push(e)
                    if (e.Waste) {
                        sumwaste += e.Number
                        wastes.push(e)
                    }
                    if (e.Number >= -70) {
                        sumdailyspend += e.Number
                    }
                }
            }
        }
        if (countdays < 1) {
            statResult.innerText = "统计结果为空白，1条记录都没有。"
        } else {
            const table = document.createElement('table')
            const addLine = function (title: string, value: any) {
                const tr = document.createElement('tr')
                const d1 = document.createElement('td')
                d1.innerText = title
                const d2 = document.createElement('td')
                d2.innerText = String(value)
                tr.appendChild(d1)
                tr.appendChild(d2)
                table.appendChild(tr)
            }
            addLine("统计范围", `${ToDateString(new Date(mindate))}\n${maxdate != mindate ? ToDateString(new Date(maxdate)) : ""}`)
            addLine("有记录的天数", countdays.toFixed(0))
            addLine("总收入", sumearn.toFixed(2))
            addLine("总开支", sumspend.toFixed(2))
            addLine("总浪费", sumwaste.toFixed(2))
            const lefts = sumearn + sumspend
            addLine("总结余", lefts.toFixed(2))
            addLine("平均每日开支", (sumdailyspend / countdays).toFixed(2))
            if (spends.length > 0) {
                let out = ''
                spends.sort(SortMoneyEvents)
                const shownmax: number = 13
                let c = 0
                for (const e of spends) {
                    out += `${e.Number.toFixed(2)} ${e.Text}\n`
                    c += 1
                    if (c >= shownmax) {
                        break
                    }
                }
                addLine('最花钱的项目', out)
                if (wastes.length > 0) {
                    wastes.sort(SortMoneyEvents)
                    out = ''
                    c = 0
                    for (const e of wastes) {
                        out += `${e.Number.toFixed(2)} ${e.Text}\n`
                        c += 1
                        if (c >= shownmax) {
                            break
                        }
                    }
                    addLine('最浪费钱的项目', out)
                }
            }
            statResult.appendChild(table)
        }
    })
}