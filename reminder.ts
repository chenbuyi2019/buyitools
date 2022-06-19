/// <reference path="global.ts" />
/// <reference path="zhcalendar.ts" />

(function () {

    const isReminderPage: boolean = location.pathname == "/reminder.html"
    if (!isReminderPage && !isBackground) { return }
    const reminderGroup: string = 'reminderg'
    const checkdMarks: string = 'checkdMarks'
    const reminderNextSendTime: string = 'ReminderNextSendTime'

    interface Events {
        YearlyEvents: Array<YearlyEvent>,
        IntervalEvents: Array<IntervalEvent>
    }

    interface YearlyEvent {
        Month: number
        Day: number
        UseChineseCalendar: boolean
        Title: string
    }

    interface IntervalEvent {
        StartTimeMs: number
        DayInterval: number
        Title: string
        MoveForward: boolean
    }

    interface OutputEvent {
        GroupName: string
        Title: string
        Date: Date
        DateStr: string
    }

    async function getGroupEvents(name: string): Promise<Events | null> {
        const v: Events | null = await GetLocalValue(reminderGroup + name, null)
        return v
    }

    function getOutputEventMarkStr(e: OutputEvent): string {
        return `${e.Date.getTime()}${e.Title}${e.DateStr}${e.GroupName}`
    }

    async function getAllGroups(): Promise<Array<string>> {
        const v: Array<string> = await GetLocalValue(reminderGroup, [])
        return v
    }

    async function getCheckedMarks(): Promise<Array<string>> {
        const v: Array<string> = await GetLocalValue(checkdMarks, [])
        return v
    }

    async function getNotices(): Promise<Array<OutputEvent>> {
        const groupNames = await getAllGroups()
        const out: Array<OutputEvent> = []
        const oneDay = 24 * 60 * 60 * 1000
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayMs = today.getTime()
        const thisYear = today.getFullYear()
        const noticeEnds = todayMs + 7 * oneDay
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

    async function sendDesktopNotices() {
        const next = await GetLocalValue(reminderNextSendTime, 0)
        const now = (new Date).getTime()
        if (next > now) { return }
        const notices = await getNotices()
        const checked = await getCheckedMarks()
        let sent = 0
        let timeLimit = 24 * 60 * 60 * 1000 * 1.1
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
    }

    if (isReminderPage) {
        const regYearlyEvent = /^([0-9]{1,2})-([0-9]{1,2})(n)? +(.+)$/i
        const regIntervalEvent = /^20([0-9]{2})([0-9]{2})([0-9]{2})([+-])([0-9]{1,3}) +(.+)$/i

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
        })()

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
            let lastDate = 1.5
            const checked = await getCheckedMarks()
            const today = new Date
            today.setHours(0, 0, 0, 0)
            const now = today.getTime()
            for (const e of notices) {
                const mark = getOutputEventMarkStr(e)
                const ms = e.Date.getTime()
                if (ms < now && checked.includes(mark)) {
                    continue
                }
                if (ms != lastDate) {
                    if (lastDate > 3) {
                        divNotices.appendChild(document.createElement('hr'))
                    }
                    const time = document.createElement('time')
                    time.innerText = GetDateZhString(e.Date) + ' ' + GetDaysZhString(e.Date)
                    time.dateTime = GetDateString(e.Date)
                    divNotices.appendChild(time)
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
                divNotices.appendChild(input)
                divNotices.appendChild(label)
                divNotices.appendChild(document.createElement('br'))
            }
            refreshClearButton(checked.length)
            sendDesktopNotices()
        }

        function addGroupUI(initGroupName: string = '') {
            const div = document.createElement('div')
            const h2 = document.createElement('h2')
            div.appendChild(h2)
            const p = document.createElement('p')
            div.appendChild(p)
            const editor = document.createElement('textarea')
            div.appendChild(editor)
            const butEdit = document.createElement('button')
            div.appendChild(butEdit)
            const displayEvents = async function () {
                const groupName = h2.innerText
                const evs = await getGroupEvents(groupName)
                if (evs == null) {
                    throw '不应该出现的情况，分组是 null'
                }
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
                p.style.display = 'block'
                editor.style.display = 'none'
                butEdit.innerText = '编辑'
            }
            const goEdit = async function () {
                p.style.display = 'none'
                editor.style.display = "block"
                butEdit.innerText = '保存'
                let out = ''
                const groupName = h2.innerText
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
                    out = `第一行是分组标题\n`
                }
                editor.value = out
            }
            butEdit.addEventListener('click', async function () {
                if (editor.style.display == 'none') {
                    goEdit()
                } else {
                    const str = editor.value.normalize().trim()
                    const groupNames = await getAllGroups()
                    const oldname = h2.innerText.toUpperCase()
                    let name = oldname
                    if (str.length < 1) {
                        const index = groupNames.indexOf(name)
                        if (index >= 0) {
                            groupNames.splice(index, 1)
                            await SetLocalValue(reminderGroup, groupNames)
                            await SetLocalValue(reminderGroup + name, null)
                        }
                        div.remove()
                        return
                    }
                    const lines = str.split(/[\n\r]+/g)
                    const YearlyEvents: Array<YearlyEvent> = []
                    const IntervalEvents: Array<IntervalEvent> = []
                    const usedtitles: Array<string> = []
                    const checkIfTitleRepeated = function (tt: string) {
                        tt = tt.normalize().toLowerCase()
                        if (usedtitles.includes(tt)) { throw `事件标题不能重复使用` }
                        usedtitles.push(tt)
                    }
                    for (let index = 0; index < lines.length; index++) {
                        let line = lines[index].trim()
                        if (index < 1) {
                            if (line.length < 1) {
                                alert('第一行是分组标题，不能为空')
                                return
                            }
                            line = line.toUpperCase()
                            if (line != name) {
                                if (groupNames.includes(line)) {
                                    alert(`已经有其他分组使用了这个标题：${line}`)
                                    return
                                }
                                name = line
                            }
                        } else {
                            if (line.length < 1) {
                                continue
                            }
                            try {
                                let dtev = parseYearlyEvent(line)
                                if (dtev == null) {
                                    let itev = parseIntervalEvent(line)
                                    if (itev == null) { throw '格式出错，不符合任何条件' }
                                    checkIfTitleRepeated(itev.Title)
                                    IntervalEvents.push(itev)
                                } else {
                                    checkIfTitleRepeated(dtev.Title)
                                    YearlyEvents.push(dtev)
                                }
                            } catch (error) {
                                alert(`第 ${index + 1} 行出错：${error}\n${line}`)
                                return
                            }
                        }
                    }
                    if (YearlyEvents.length + IntervalEvents.length < 1) {
                        alert('分组内不能没有任何事件')
                        return
                    }
                    if (name != oldname) {
                        if (oldname.length > 0) {
                            const index = groupNames.indexOf(oldname)
                            if (index >= 0) {
                                groupNames.splice(index, 1)
                            }
                        }
                        groupNames.push(name)
                        groupNames.sort(function (a, b) { return a.localeCompare(b) })
                        await SetLocalValue(reminderGroup, groupNames)
                        if (oldname.length > 0) {
                            await SetLocalValue(reminderGroup + oldname, null)
                        }
                    }
                    const evs: Events = {
                        YearlyEvents: YearlyEvents,
                        IntervalEvents: IntervalEvents
                    }
                    await SetLocalValue(reminderGroup + name, evs)
                    h2.innerText = name
                    displayEvents()
                    refreshNoticesUI()
                }
            })
            divGroups.insertBefore(div, divGroups.firstChild)
            if (initGroupName.length > 0) {
                h2.innerText = initGroupName
                displayEvents()
            } else {
                goEdit()
            }
        }
    } else {
        sendDesktopNotices()
    }
})()