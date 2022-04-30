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
        if (days.includes(GetDateString(dt))) {
            alert("此日期已经存在记录，请直接去修改那一天的记录。")
            return
        }
        addDayDetailDiv(dt, false)
    })

    const accountdays: string = "accountdays"

    function SortMoneyEvents(a: MoneyEvent, b: MoneyEvent): number {
        if (a.Number > b.Number) { return 1 }
        if (a.Number < b.Number) { return -1 }
        return 0
    }

    function addDayDetailDiv(dt: Date, addtoEnd: boolean) {
        const div = document.createElement('div')
        const time = document.createElement('time')
        const dtstr = GetDateString(dt)
        time.dateTime = dtstr
        time.innerText = `${GetDateZhString(dt)}\n${GetWeekdayZhString(dt)}`
        div.className = 'DayDetail'
        div.appendChild(time)
        const e = new MoneyBoxElement(accountdays + GetDateString(dt))
        e.OnDataUpdated = async function (key, value) {
            const k = key.replaceAll(accountdays, '')
            const days: string[] = await GetLocalValue(accountdays, [])
            let changed = false
            if (value.length > 0) {
                if (days.includes(k) == false) {
                    days.push(k)
                    changed = true
                }
            } else {
                const index = days.indexOf(k)
                if (index >= 0) {
                    days.splice(index, 1)
                    changed = true
                }
            }
            if (changed) {
                await SetLocalValue(accountdays, days)
            }
        }
        div.appendChild(e.BoxElement)
        if (addtoEnd) {
            detaillist.appendChild(div)
        } else {
            detaillist.insertBefore(div, detaillist.firstChild)
        }
    }

    const statResult = document.getElementById('statResult') as HTMLDivElement
    const butDoStat = document.getElementById("butDoStat") as HTMLButtonElement
    const inputStartDate = document.getElementById('inputStartDate') as HTMLInputElement
    const inputEndDate = document.getElementById('inputEndDate') as HTMLInputElement

    async function displayDatesDetails(endDate: string) {
        detaillist.innerText = ''
        const days: string[] = await GetLocalValue(accountdays, [])
        days.sort(function (a, b) {
            return -a.localeCompare(b)
        })
        const maxshown = 20
        let shown = 0
        for (let index = 0; index < days.length; index++) {
            const dtstr = days[index]
            if (dtstr <= endDate) {
                addDayDetailDiv(new Date(dtstr), true)
                shown += 1
                if (shown >= maxshown) {
                    return
                }
            }
        }
    }

    (async function () {
        const today = new Date()
        displayDatesDetails(GetDateString(today))
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
            const events: MoneyEvent[] = await GetLocalValue(accountdays + GetDateString(dt), [])
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
            const endDtstr = GetDateString(new Date(maxdate))
            addLine("统计范围", `${GetDateString(new Date(mindate))}\n${maxdate != mindate ? endDtstr : ""}`)
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
            displayDatesDetails(endDtstr)
            inputStartDate.valueAsDate = new Date(mindate)
            inputEndDate.valueAsDate = new Date(maxdate)
        }
    })
}