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
        const addMoveMonthButton = function (text: string, count: number) {
            const but = document.createElement('button')
            but.innerText = text
            but.addEventListener('click', function () {
                let dt = inputStartDate.valueAsDate
                if (dt == null) { return }
                let year = dt.getFullYear()
                let month = dt.getMonth()
                dt.setFullYear(year, month + count, 1)
                inputStartDate.valueAsDate = dt
                dt.setDate(GetDaysCountInMonth(dt.getMonth() + 1))
                inputEndDate.valueAsDate = dt
                butDoStat.click()
            })
            statbuttons.append(but)
        }
        addMoveMonthButton('上个月', -1)
        addMoveMonthButton('下个月', 1)
        statbuttons.append(document.createElement("br"))
        for (const daysDiff of [60, 92, 185, 366]) {
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
        let countDays = 0
        const earns = new Map<string, number>()
        const spends = new Map<string, number>()
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
                let mp = earns
                if (e.Number > 0) {
                    sumEarn += e.Number
                } else {
                    mp = spends
                    sumSpend += e.Number
                }
                let oldNumber = mp.get(e.Text)
                if (oldNumber == null) { oldNumber = 0 }
                mp.set(e.Text, oldNumber + e.Number)
            }
        }
        if (countDays < 1) {
            divStatResult.innerText = "统计结果为空白，无记录。"
        } else {
            const getArrayFromMap = function (mp: Map<string, number>): Array<MoneyRecord> {
                let out: Array<MoneyRecord> = []
                for (const kv of mp) {
                    out.push({ Text: kv[0], Number: kv[1] })
                }
                return out
            }
            const addLine = function (title: string, value: any) {
                const d1 = document.createElement('div')
                d1.innerText = title
                const d2 = document.createElement('div')
                d2.innerText = String(value)
                divStatResult.append(d1, d2)
            }
            const addMax = function (title: string, array: Array<MoneyRecord>, desc: boolean) {
                let out = '无'
                if (array.length > 0) {
                    const shownmax: number = 25
                    out = ''
                    let c = 0
                    array.sort(desc ? SortMoneyRecordsDesc : SortMoneyRecordsAec)
                    let sum = 0
                    for (const e of array) {
                        out += `${e.Text} ${e.Number.toFixed(2)}\n`
                        c += 1
                        sum += e.Number
                        if (c >= shownmax) { break }
                    }
                }
                addLine(title, out)
            }
            const endDtstr = GetDateString(new Date(maxdate))
            addLine("统计范围", `${GetDateString(new Date(mindate))}\n${maxdate != mindate ? endDtstr : ""}`)
            addLine("有记录的天数", countDays.toFixed(0))
            addLine("总收入", sumEarn.toFixed(2))
            addLine("总开支", sumSpend.toFixed(2))
            const lefts = sumEarn + sumSpend
            addLine("总结余", lefts.toFixed(2))
            addLine("平均每天开支", (sumSpend / countDays).toFixed(2))
            addMax('最贵的', getArrayFromMap(spends), false)
            addMax('最赚的', getArrayFromMap(earns), true)
            displayDatesDetails(endDtstr)
            inputStartDate.valueAsDate = new Date(mindate)
            inputEndDate.valueAsDate = new Date(maxdate)
        }
    })
}