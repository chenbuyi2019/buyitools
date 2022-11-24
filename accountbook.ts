/// <reference path="global.ts" />

// 记账页面
if (location.pathname == "/accountbook.html") {

    const accountdays: string = "accountdays"

    const divDetailList = document.getElementById('detaillist') as HTMLDivElement
    const inputNewDay = document.getElementById('inputNewDay') as HTMLInputElement
    const butAddNewDay = document.getElementById('butAddNewDay') as HTMLButtonElement
    const addedDays: string[] = []
    // 新增一天
    butAddNewDay.addEventListener('click', async function () {
        const dt = inputNewDay.valueAsDate
        if (dt == null) { return }
        const oldDays: string[] = await GetLocalValue(accountdays, [])
        const daystr = GetDateString(dt)
        if (oldDays.includes(daystr) || addedDays.includes(daystr)) {
            alert("此日期已经存在记录，请直接去修改那一天的记录。")
            return
        }
        addedDays.push(daystr)
        addDayDetailDiv(dt, false)
    })

    /**
     * 新增一天的信息 div 到 UI ，如果是没有数据的一天就自动进入编辑模式， addtoEnd 会把新的信息 div 加入到 UI 的最下面
     */
    function addDayDetailDiv(dt: Date, addtoEnd: boolean) {
        const div = document.createElement('div')
        const time = document.createElement('time')
        const dtstr = GetDateString(dt)
        time.dateTime = dtstr
        time.innerText = `${GetDateZhString(dt, true)}\n${GetDaysZhString(dt)}`
        div.className = 'DayDetail'
        div.appendChild(time)
        const e = new MoneyBoxElement(`${GetDateZhString(dt)} ${GetDaysZhString(dt)}`, accountdays + GetDateString(dt))
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
            if (changed) { await SetLocalValue(accountdays, days) }
        }
        div.appendChild(e.BoxElement)
        if (addtoEnd) {
            divDetailList.appendChild(div)
        } else {
            divDetailList.insertBefore(div, divDetailList.firstChild)
        }
    }

    const divStatResult = document.getElementById('statResult') as HTMLDivElement
    const butDoStat = document.getElementById("butDoStat") as HTMLButtonElement
    const inputStartDate = document.getElementById('inputStartDate') as HTMLInputElement
    const inputEndDate = document.getElementById('inputEndDate') as HTMLInputElement

    /**
     * 把从 endDate 开始的40天内的记账记录，显示在 UI 里
     */
    async function displayDatesDetails(endDate: string) {
        addedDays.splice(0, addedDays.length)
        divDetailList.innerText = ''
        const days: string[] = await GetLocalValue(accountdays, [])
        days.sort(function (a, b) {
            return -a.localeCompare(b)
        })
        const maxshown: number = 40
        let shown = 0
        for (let index = 0; index < days.length; index++) {
            const dtstr = days[index]
            if (dtstr <= endDate) {
                addDayDetailDiv(new Date(dtstr), true)
                shown += 1
                if (shown >= maxshown) { return }
            }
        }
    }

    // 初始化
    (async function () {
        const today = new Date()
        displayDatesDetails(GetDateString(today))
        inputNewDay.valueAsDate = today
        inputEndDate.valueAsDate = today
        const daysAgo = new Date()
        daysAgo.setDate(today.getDate() - 3)
        inputStartDate.valueAsDate = daysAgo
        const statbuttons = document.getElementById('statbuttons') as HTMLDivElement
        const thisYear = today.getFullYear()
        const thisMonth = today.getMonth()
        for (let monthDiff = 0; monthDiff < 15; monthDiff++) {
            const button = document.createElement("button")
            let statYear = thisYear
            let statMonth = thisMonth - monthDiff
            while (statMonth < 0) {
                statMonth += 12
                statYear -= 1
            }
            button.innerText = `${(statMonth + 1).toFixed().padStart(2, "0")}月`
            button.addEventListener('click', function () {
                let startDay = new Date()
                startDay.setHours(23, 0, 0, 0)
                startDay.setFullYear(statYear, statMonth, 1)
                inputStartDate.valueAsDate = startDay
                startDay.setDate(GetDaysCountInMonth(statMonth + 1))
                inputEndDate.valueAsDate = startDay
                butDoStat.click()
            })
            statbuttons.appendChild(button)
        }
        statbuttons.appendChild(document.createElement("br"))
        for (const daysDiff of [60, 90, 180, 365]) {
            const button = document.createElement("button")
            button.innerText = `近${daysDiff}天`
            button.addEventListener('click', function () {
                let startDay = new Date()
                startDay.setHours(23, 0, 0, 0)
                inputStartDate.valueAsDate = startDay
                startDay.setDate(startDay.getDate() - daysDiff)
                inputEndDate.valueAsDate = startDay
                butDoStat.click()
            })
            statbuttons.appendChild(button)
        }
    })();

    // 统计按钮
    butDoStat.addEventListener('click', async function () {
        divStatResult.innerText = ""
        const t1 = inputStartDate.valueAsDate
        const t2 = inputEndDate.valueAsDate
        if (t1 === null || t2 === null) {
            divStatResult.innerText = "开始和结束时间不能为空白"
            return
        }
        const n1 = t1.getTime()
        const n2 = t2.getTime()
        const dstart = Math.min(n1, n2)
        const dend = Math.max(n1, n2)
        const days: string[] = await GetLocalValue(accountdays, [])
        let sumSpend = 0
        let sumEarn = 0
        let sumWaste = 0
        let sumFulltime = 0
        let countDays = 0
        const fulltimesEarns: MoneyRecord[] = []
        const otherEarns: MoneyRecord[] = []
        const wastes: MoneyRecord[] = []
        const spendButNoWastes: MoneyRecord[] = []
        let maxdate = 0
        let mindate = 0
        for (const day of days) {
            const dt = new Date(day)
            const ms = dt.getTime()
            if (dstart > ms || ms > dend) {
                continue
            }
            const events: MoneyRecord[] = await GetLocalValue(accountdays + GetDateString(dt), [])
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
            countDays += 1
            for (const e of events) {
                if (e.Number > 0) {
                    sumEarn += e.Number
                    if (e.Fulltime) {
                        sumFulltime += e.Number
                        fulltimesEarns.push(e)
                    } else {
                        otherEarns.push(e)
                    }
                } else {
                    sumSpend += e.Number
                    if (e.Waste) {
                        sumWaste += e.Number
                        wastes.push(e)
                    } else {
                        spendButNoWastes.push(e)
                    }
                }
            }
        }
        if (countDays < 1) {
            divStatResult.innerText = "统计结果为空白，无记录。"
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
            const addMax = function (title: string, array: Array<MoneyRecord>, reversal: boolean) {
                let out = '无'
                if (array.length > 0) {
                    const shownmax: number = 25
                    out = ''
                    let c = 0
                    array.sort(reversal ? SortMoneyRecordsRev : SortMoneyRecords)
                    for (const e of array) {
                        out += `${e.Text} ${e.Number.toFixed(2)}\n`
                        c += 1
                        if (c >= shownmax) { break }
                    }
                }
                addLine(title, out)
            }
            const endDtstr = GetDateString(new Date(maxdate))
            addLine("统计范围", `${GetDateString(new Date(mindate))}\n${maxdate != mindate ? endDtstr : ""}`)
            addLine("有记录的天数", countDays.toFixed(0))
            addLine("总收入", sumEarn.toFixed(2))
            addLine("全职收入", sumFulltime.toFixed(2))
            addLine("非全职收入", (sumEarn - sumFulltime).toFixed(2))
            addLine("总开支+浪费", sumSpend.toFixed(2))
            addLine("总浪费", sumWaste.toFixed(2))
            const lefts = sumEarn + sumSpend
            addLine("总结余", lefts.toFixed(2))
            addLine("平均每天开支", (sumSpend / countDays).toFixed(2))
            addMax('非浪费最贵的', spendButNoWastes, false)
            addMax('最浪费的', wastes, false)
            addMax('全职最赚的', fulltimesEarns, true)
            addMax('非全职最赚的', otherEarns, true)
            divStatResult.appendChild(table)
            displayDatesDetails(endDtstr)
            inputStartDate.valueAsDate = new Date(mindate)
            inputEndDate.valueAsDate = new Date(maxdate)
        }
    })
}