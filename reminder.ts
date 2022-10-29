/// <reference path="global.ts" />
/// <reference path="zhcalendar.ts" />

// 日程页面
(function () {
    const isReminderPage: boolean = location.pathname == "/reminder.html"
    if (!isReminderPage && !isBackground) { return }
    const reminderGroup: string = 'reminderg'
    const checkdMarks: string = 'checkdMarks'
    const reminderNextSendTime: string = 'ReminderNextSendTime'

    const oneDay: number = 24 * 60 * 60 * 1000

    /**
     * 一个组的日程存储
     */
    interface Events {
        YearlyEvents: Array<YearlyEvent>,
        IntervalEvents: Array<IntervalEvent>
    }

    /**
     * 年度事件，按月和日的数字来定
     */
    interface YearlyEvent {
        Month: number
        Day: number
        UseChineseCalendar: boolean
        Title: string
    }

    /**
     * 按天数间隔来发生的事件
     */
    interface IntervalEvent {
        StartTimeMs: number
        DayInterval: number
        Title: string
        MoveForward: boolean
    }

    /**
     * 计算出发生时间的提醒事件
     */
    interface OutputEvent {
        GroupName: string
        Title: string
        Date: Date
        DateStr: string
    }

    /**
     * 获取一个组的日程存储
     */
    async function getGroupEvents(name: string): Promise<Events | null> {
        const v: Events | null = await GetLocalValue(reminderGroup + name, null)
        return v
    }

    /**
     * 获取一个提醒事件的唯一标记字符串
     */
    function getOutputEventMarkStr(e: OutputEvent): string {
        return `${e.Date.getTime()}${e.Title}${e.DateStr}${e.GroupName}`
    }

    /**
     * 获取全部的组名
     */
    async function getAllGroups(): Promise<Array<string>> {
        const v: Array<string> = await GetLocalValue(reminderGroup, [])
        return v
    }

    /**
     * 获取全部标记过的提醒事件字符串
     */
    async function getCheckedMarks(): Promise<Array<string>> {
        const v: Array<string> = await GetLocalValue(checkdMarks, [])
        return v
    }

    /**
     * 获取最近的提醒事件
     */
    async function getNotices(): Promise<Array<OutputEvent>> {
        const groupNames = await getAllGroups()
        const out: Array<OutputEvent> = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayMs = today.getTime()
        const thisYear = today.getFullYear()
        const noticeEnds = todayMs + 7 * oneDay   //前后7天的事件都显示在 UI 里
        const noticeStarts = todayMs - 7 * oneDay
        for (const groupname of groupNames) {
            const evs = await getGroupEvents(groupname)
            if (evs == null) { continue }
            for (const e of evs.IntervalEvents) {
                if (e.DayInterval < 1 || (e.MoveForward && e.StartTimeMs > noticeEnds) || (!e.MoveForward && e.StartTimeMs < noticeStarts)) { continue }
                let added = 0
                let times = e.MoveForward ? 4999 : 2
                for (let t = 0; t < times; t++) {
                    const dt = new Date(e.StartTimeMs + t * e.DayInterval * oneDay * (e.MoveForward ? 1 : -1))
                    const ms = dt.getTime()
                    if (e.MoveForward) {
                        if (ms < noticeStarts) { continue }
                        if (ms > noticeEnds) { break }
                    } else {
                        if (ms < noticeStarts) { break }
                        if (ms > noticeEnds) { continue }
                    }
                    const oe: OutputEvent = {
                        GroupName: groupname,
                        Title: e.Title,
                        Date: dt,
                        DateStr: GetDateZhString(dt)
                    }
                    out.push(oe)
                    added += 1
                    if (added >= 2) {
                        break
                    }
                }
            }
            for (const e of evs.YearlyEvents) {
                if (e.UseChineseCalendar) {
                    const nl: ZhCalendarDateValue = {
                        Year: thisYear,
                        Month: e.Month,
                        Day: e.Day,
                        IsLeapMonth: false,
                        Date: null
                    }
                    let dt = GetDateFromZhCalendarDate(nl)
                    if (dt == null) {
                        if (nl.Day >= 30) {
                            nl.IsLeapMonth = true
                            dt = GetDateFromZhCalendarDate(nl)
                            if (dt == null) {
                                nl.IsLeapMonth = false
                                nl.Day = 1
                                nl.Month += 1
                                if (nl.Month > 12) {
                                    nl.Month = 1
                                    nl.Year += 1
                                }
                                dt = GetDateFromZhCalendarDate(nl)
                            }
                        }
                    }
                    if (dt == null) {
                        console.error(`无法定位的农历日期： ${groupname} `, e)
                    } else {
                        const ms = dt.getTime()
                        if (ms >= noticeStarts && ms <= noticeEnds) {
                            const oe: OutputEvent = {
                                GroupName: groupname,
                                Title: e.Title,
                                Date: dt,
                                DateStr: `${GetZhMonthName(nl.Month)}${GetZhDayName(nl.Day)}`
                            }
                            out.push(oe)
                        }
                    }
                } else {
                    for (let i = 0; i < 2; i++) {
                        const dt = new Date()
                        dt.setHours(0, 0, 0, 0)
                        dt.setFullYear(thisYear + i, e.Month - 1, e.Day)
                        const ms = dt.getTime()
                        if (ms >= noticeStarts && ms <= noticeEnds) {
                            const oe: OutputEvent = {
                                GroupName: groupname,
                                Title: e.Title,
                                Date: dt,
                                DateStr: GetDateZhString(dt)
                            }
                            out.push(oe)
                        }
                    }
                }
            }
        }
        out.sort(function (a, b): number {
            const at = a.Date.getTime()
            const bt = b.Date.getTime()
            if (at == bt) {
                let n = a.GroupName.localeCompare(b.GroupName)
                if (n == 0) { n = a.Title.localeCompare(b.Title) }
                return n
            }
            if (at < bt) { return -1 }
            return 1
        })
        return out
    }

    if (isReminderPage) {
        const regYearlyEvent = /^([0-9]{1,2})-([0-9]{1,2})(n)? +(.+)$/i
        const regIntervalEvent = /^20([0-9]{2})([0-9]{2})([0-9]{2})([+-])([0-9]{1,3}) +(.+)$/i

        /**
         * 解析年度事件
         */
        function parseYearlyEvent(str: string): YearlyEvent | null {
            let results = regYearlyEvent.exec(str)
            if (results == null) { return null }
            let month = parseInt(results[1])
            if (month < 1 || month > 12) { throw "月份不能大于12或者小于1" }
            let day = parseInt(results[2])
            if (day < 1 || day > 31) { throw "日子不能为0或者大于31" }
            let useChineseCalendar = results[3] != null
            if (useChineseCalendar) {
                if (day > 30) { throw "农历日子不能大于30日" }
            } else {
                if (month > 0 && !IsGoodDate(month, day)) { throw "公历日期不对劲" }
            }
            const title = results[4].trim()
            if (title.length < 1 || title.length > 30) { throw "事件标题不能为空白或者超过30个字符" }
            const n: YearlyEvent = {
                Month: month,
                Day: day,
                UseChineseCalendar: useChineseCalendar,
                Title: title
            }
            return n
        }

        /**
         * 解析天数间隔事件
         */
        function parseIntervalEvent(str: string): IntervalEvent | null {
            const results = regIntervalEvent.exec(str)
            if (results == null) { return null }
            const year = 2000 + parseInt(results[1])
            if (year < 2020 || year > 2025) { throw "年份太遥远" }
            const month = parseInt(results[2])
            const day = parseInt(results[3])
            const moveForward = results[4] == '+'
            const dt = new Date(`${year}-${month}-${day} 00:00:00.000`)
            if (isNaN(dt.getFullYear())) { throw `开始的公历日期不存在` }
            const interval = parseInt(results[5])
            if (interval < 1) { throw "天数间隔不能为0" }
            const title = results[6].trim()
            if (title.length < 1 || title.length > 30) { throw "事件标题不能为空白或者超过30个字符" }
            const n: IntervalEvent = {
                StartTimeMs: dt.getTime(),
                DayInterval: interval,
                Title: title,
                MoveForward: moveForward
            }
            return n
        }

        const divNotices = document.getElementById('notices') as HTMLDivElement
        const divGroups = document.getElementById('groups') as HTMLDivElement
        const butNewGroup = document.getElementById('butNewGroup') as HTMLButtonElement
        const butClearCheckedMarks = document.getElementById('butClearCheckedMarks') as HTMLButtonElement

        // 初始化 UI 
        (async function () {
            const groupNames = await getAllGroups()
            for (const name of groupNames) {
                addGroupUI(name)
            }
            butNewGroup.addEventListener('click', function () {
                addGroupUI('')
            })
            butClearCheckedMarks.title = butClearCheckedMarks.innerText
            butClearCheckedMarks.addEventListener('click', async function () {
                await SetLocalValue(checkdMarks, null)
                await SetLocalValue(reminderNextSendTime, 0)
                location.reload()
            })
            await refreshNoticesUI()
            const butEditGroups = document.getElementById("butEditGroups") as HTMLButtonElement
            butEditGroups.addEventListener("click", function () {
                if (divGroups.style.display == 'block') {
                    butEditGroups.innerText = '编辑日程'
                    divGroups.style.display = 'none'
                } else {
                    butEditGroups.innerText = '隐藏细节'
                    divGroups.style.display = 'block'
                }
            })
        })()

        /**
         * 刷新提醒事件的展示界面，可以打勾来表示已读
         */
        async function refreshNoticesUI() {
            divNotices.innerText = ''
            const notices = await getNotices()
            const refreshClearButton = function (len: number) {
                if (len > 0) {
                    butClearCheckedMarks.innerText = `${butClearCheckedMarks.title} (${len})`
                } else {
                    butClearCheckedMarks.innerText = butClearCheckedMarks.title
                }
            }
            const onChange = async function (mark: string, add: boolean) {
                if (mark.length < 1) { return }
                const checked = await getCheckedMarks()
                let edited = false
                if (add) {
                    if (!checked.includes(mark)) {
                        checked.push(mark)
                        edited = true
                    }
                } else {
                    const index = checked.indexOf(mark)
                    if (index >= 0) {
                        checked.splice(index, 1)
                        edited = true
                    }
                }
                if (edited) {
                    await SetLocalValue(checkdMarks, checked)
                    refreshClearButton(checked.length)
                }
            }
            let lastDate = 0
            const checked = await getCheckedMarks()
            const today = new Date
            today.setHours(0, 0, 0, 0)
            const now = today.getTime()
            let lastDivDay: HTMLDivElement | null = null
            for (const e of notices) {
                const mark = getOutputEventMarkStr(e)
                const ms = e.Date.getTime()
                if (ms < now && checked.includes(mark)) {
                    continue
                }
                if (ms != lastDate) {
                    lastDivDay = document.createElement("div")
                    divNotices.appendChild(lastDivDay)
                    const time = document.createElement('time')
                    time.innerText = GetDateZhString(e.Date) + ' ' + GetDaysZhString(e.Date)
                    time.dateTime = GetDateString(e.Date)
                    lastDivDay.appendChild(time)
                    lastDate = ms
                }
                const input = document.createElement('input')
                input.type = 'checkbox'
                input.title = mark
                input.checked = checked.includes(input.title)
                input.addEventListener('change', function () {
                    onChange(this.title, this.checked)
                })
                const label = document.createElement('label')
                label.innerText = `${e.Title}（${e.GroupName}）`
                label.addEventListener('click', function () {
                    input.checked = !input.checked
                    onChange(input.title, input.checked)
                })
                if (lastDivDay != null) {
                    lastDivDay.appendChild(input)
                    lastDivDay.appendChild(label)
                    lastDivDay.appendChild(document.createElement('br'))
                }
            }
            refreshClearButton(checked.length)
        }

        /**
         * 获取一个组别现有事件的修改用文本
         */
        async function getEventsText(groupName: string): Promise<string> {
            let out = ''
            out = groupName + '\n\n'
            if (groupName.length > 0) {
                const evs = await getGroupEvents(groupName)
                if (evs == null) {
                    throw '不应该出现的情况，分组是 null'
                }
                out = groupName + '\n\n'
                for (const e of evs.YearlyEvents) {
                    out += `${e.Month.toFixed().padStart(2, `0`)}-${e.Day.toFixed().padStart(2, `0`)}${e.UseChineseCalendar ? 'n' : ' '} ${e.Title}\n`
                }
                for (const e of evs.IntervalEvents) {
                    const dt = new Date(e.StartTimeMs)
                    out += `${GetDateString(dt, '')}${e.MoveForward ? '+' : '-'}${e.DayInterval.toFixed().padEnd(4, ' ')} ${e.Title}\n`
                }
            } else {
                out = `第一行是分组标题\n\n07-01  我是年度事件\n07-01n  我是年度事件（农历）\n20220801+15  往后每15天一次的事件\n20220801-15  当天以及15天之前提醒一次的事件`
            }
            return out
        }

        /**
         * 新增组别 UI ，可以修改和保存事件， 类似 moneyBoxElement
         */
        function addGroupUI(initGroupName: string = '') {
            const div = document.createElement('div')
            const h2 = document.createElement('h2')
            div.appendChild(h2)
            const p = document.createElement('p')
            div.appendChild(p)
            const butEdit = document.createElement('button')
            butEdit.innerText = '编辑'
            div.appendChild(butEdit)
            const displayEvents = async function () {
                const groupName = h2.innerText
                const evs = await getGroupEvents(groupName)
                if (evs == null) { throw '不应该出现的情况，分组是 null' }
                let out = ''
                for (const e of evs.YearlyEvents) {
                    if (e.UseChineseCalendar) {
                        out += `每年 ${GetZhMonthName(e.Month)} ${GetZhDayName(e.Day)}：${e.Title}\n`
                    } else {
                        out += `每年 ${e.Month.toFixed().padStart(2, `0`)} 月 ${e.Day.toFixed().padStart(2, `0`)} 日：${e.Title}\n`
                    }
                }
                for (const e of evs.IntervalEvents) {
                    const dt = new Date(e.StartTimeMs)
                    out += `${GetDateZhString(dt)}${e.MoveForward ? '起每' : '之前'} ${e.DayInterval} 天：${e.Title}\n`
                }
                p.innerText = out
            }
            butEdit.addEventListener('click', async function () {
                const oldGroupName = h2.innerText
                const oldtxt = await getEventsText(oldGroupName)
                let lastTxt = oldtxt
                while (true) {
                    const newtxt = await InputBox(`编辑日程：${oldGroupName}`, lastTxt)
                    if (newtxt == null) {
                        if (oldGroupName.length < 1) { div.remove() }
                        return
                    }
                    const YearlyEvents: Array<YearlyEvent> = []
                    const IntervalEvents: Array<IntervalEvent> = []
                    const usedtitles: Array<string> = []
                    const groupNames = await getAllGroups()
                    let newGroupName = oldGroupName
                    try {
                        if (oldGroupName.length > 0 && newtxt.length < 1) {
                            if (confirm(`空白意味着你要删除整个分组，你确定要删除 ${oldGroupName} 吗？`)) {
                                const index = groupNames.indexOf(oldGroupName)
                                if (index >= 0) {
                                    groupNames.splice(index, 1)
                                    await SetLocalValue(reminderGroup, groupNames)
                                    await SetLocalValue(reminderGroup + oldGroupName, null)
                                }
                                div.remove()
                                refreshNoticesUI()
                                return
                            }
                        }
                        const throwIfTitleRepeated = function (tt: string) {
                            tt = tt.normalize().toLowerCase()
                            if (usedtitles.includes(tt)) { throw `事件标题重复使用` }
                            usedtitles.push(tt)
                        }
                        const lines = newtxt.split(/[\n\r]+/g)
                        for (let index = 0; index < lines.length; index++) {
                            let line = lines[index].trim()
                            if (index < 1) {
                                if (line.length < 1) {
                                    throw '第一行是分组标题，不能为空'
                                }
                                line = line.toUpperCase()
                                if (line != oldGroupName) {
                                    if (groupNames.includes(line)) {
                                        throw `已经有其他分组使用了这个标题：${line}`
                                    }
                                    newGroupName = line
                                }
                            } else {
                                if (line.length < 1) { continue }
                                try {
                                    let dtev = parseYearlyEvent(line)
                                    if (dtev == null) {
                                        let itev = parseIntervalEvent(line)
                                        if (itev == null) { throw '格式出错，不符合任何条件' }
                                        throwIfTitleRepeated(itev.Title)
                                        IntervalEvents.push(itev)
                                    } else {
                                        throwIfTitleRepeated(dtev.Title)
                                        YearlyEvents.push(dtev)
                                    }
                                } catch (error) {
                                    throw `第 ${index + 1} 行出错：${error}\n${line}`
                                }
                            }
                        }
                        if (YearlyEvents.length + IntervalEvents.length < 1) { throw '分组内不能没有任何事件，如需删除分组，就清空整个文本框。' }
                    } catch (error) {
                        lastTxt = newtxt
                        alert(error)
                        continue
                    }
                    const evs: Events = {
                        YearlyEvents: YearlyEvents,
                        IntervalEvents: IntervalEvents
                    }
                    await SetLocalValue(reminderGroup + newGroupName, evs)
                    if (newGroupName != oldGroupName) {
                        if (oldGroupName.length > 0) {
                            const index = groupNames.indexOf(oldGroupName)
                            if (index >= 0) { groupNames.splice(index, 1) }
                            await SetLocalValue(reminderGroup + oldGroupName, null)
                        }
                        groupNames.push(newGroupName)
                        groupNames.sort(function (a, b) { return a.localeCompare(b) })
                        await SetLocalValue(reminderGroup, groupNames)
                    }
                    h2.innerText = newGroupName
                    displayEvents()
                    refreshNoticesUI()
                    break
                }
            })
            divGroups.insertBefore(div, divGroups.firstChild)
            if (initGroupName.length > 0) {
                h2.innerText = initGroupName
                displayEvents()
            } else {
                butEdit.click()
            }
        }
    } else {
        // 如果是后台页面，发送桌面提醒
        (async function () {
            const next = await GetLocalValue(reminderNextSendTime, 0)
            const now = (new Date).getTime()
            if (next > now) { return }
            const notices = await getNotices()
            const checked = await getCheckedMarks()
            let sent = 0
            let timeLimit = oneDay * 1.1 // 时间在 1.1 天之内的事件
            for (const e of notices) {
                const ms = e.Date.getTime()
                if (ms - now > timeLimit) { continue }
                const mark = getOutputEventMarkStr(e)
                if (checked.includes(mark)) { continue }
                await SendNotice('日程提醒', `${e.Title}\n${e.GroupName}\n${GetDaysZhString(e.Date)}`, "reminder")
                sent += 1
            }
            if (sent > 0) {
                await SetLocalValue(reminderNextSendTime, now + 1000 * 15)
            }
        })()
    }
})()