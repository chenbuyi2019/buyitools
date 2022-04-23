/// <reference path="global.ts" />
/// <reference path="zhcalendar.ts" />

interface CalendarEvent {
    DateStr: string
    Title: string
    UnixTime: number
    Mark: string
}

function parseReminderText(txt: string): Array<CalendarEvent> {
    const regDateEvent = /^([0-9]{1,2})-([0-9]{1,2})(n)? +(.+)$/i
    const regIntervalEvent = /^20([0-9]{2})([0-9]{2})([0-9]{2})-([0-9]{1,3}) +(.+)$/i
    const regNumberStart = /^[0-9]/
    const lines = txt.trim().normalize().replaceAll("\r", "\n").split("\n")
    const events: Array<CalendarEvent> = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayUnixTime = today.getTime()
    const thisYear = today.getFullYear()
    const thisMonth = today.getMonth() + 1
    const usedTitles: Array<string> = []
    const newCalendarEvent = function (title: string, year: number, month: number, day: number, useChineseCalendar: boolean): CalendarEvent {
        let dt = new Date(0)
        if (useChineseCalendar) {
            const zhc: ZhCalendarDateValue = {
                Year: year,
                Month: month,
                Day: day,
                IsLeapMonth: false,
                Date: null
            }
            let v = GetDateFromZhCalendarDate(zhc)
            if (v == null) {
                day += 1
                if (day > 30) {
                    day = 1
                    month += 1
                }
                if (month > 12) {
                    year += 1
                    month = 1
                }
                v = GetDateFromZhCalendarDate(zhc)
            }
            if (v == null) {
                throw `无法识别的农历日期 ${year}年 ${month}月 ${day}日`
            }
            dt = v
            title = `${title}(${GetZhMonthName(month)}${GetZhDayName(day)})`
        } else {
            dt.setFullYear(year, month - 1, day)
        }
        const e: CalendarEvent = {
            DateStr: `${ToDateZhString(dt)} ${ToWeekdayZhString(dt)}`,
            Title: title,
            UnixTime: dt.getTime(),
            Mark: `${dt.getTime().toFixed().padStart(14, '0')}${title.toLowerCase()}`
        }
        return e
    }
    for (let index = 0; index < lines.length; index++) {
        let line = lines[index].normalize().trim()
        if (line.length < 1 || !regNumberStart.test(line)) {
            continue
        }
        try {
            let results = regDateEvent.exec(line)
            if (results != null) {
                let month = parseInt(results[1])
                if (month > 12) {
                    throw "月份不能大于12"
                }
                let day = parseInt(results[2])
                if (day < 1 || day > 31) {
                    throw "日子不能为0或者大于31"
                }
                let useChineseCalendar = results[3] != null
                if (useChineseCalendar) {
                    if (day > 30) {
                        throw "农历日子不能大于30日"
                    }
                    if (month < 1) {
                        throw "我不打算支持农历每月提醒"
                    }
                }
                const title = results[4].trim()
                const ltitle = title.toLowerCase()
                if (title.length < 1 || title.length > 30) {
                    throw "事件标题不能为空白或者超过30个字符"
                }
                if (usedTitles.includes(ltitle)) {
                    throw "标题重复使用了"
                }
                if (month > 0) {
                    if (!IsGoodDate(month, day)) {
                        throw "公历日期的日子不对劲"
                    }
                    let e = newCalendarEvent(title, thisYear, month, day, useChineseCalendar)
                    events.push(e)
                    e = newCalendarEvent(title, thisYear + 1, month, day, useChineseCalendar)
                    events.push(e)
                } else {
                    let e = newCalendarEvent(title, thisYear, thisMonth, day, useChineseCalendar)
                    events.push(e)
                    let m = thisMonth + 1
                    let y = thisYear
                    if (m > 12) {
                        m = 1
                        y += 1
                    }
                    e = newCalendarEvent(title, y, m, day, useChineseCalendar)
                    events.push(e)
                }
                usedTitles.push(ltitle)
                continue
            }
            results = regIntervalEvent.exec(line)
            if (results != null) {
                let year = 2000 + parseInt(results[1])
                if (year < thisYear - 1 || year > thisYear + 1) {
                    throw "年份不能在去年和明年之外"
                }
                let month = parseInt(results[2])
                if (month > 12 || month < 1) {
                    throw "月份不能为0或者大于12"
                }
                let day = parseInt(results[3])
                if (day < 1 || day > 31) {
                    throw "日子不能为0或者大于31"
                }
                let interval = parseInt(results[4])
                if (interval < 1) {
                    throw "天数间隔不能为0"
                }
                const title = results[5].trim()
                const ltitle = title.toLowerCase()
                if (title.length < 1 || title.length > 30) {
                    throw "事件标题不能为空白或者超过30个字符"
                }
                if (usedTitles.includes(ltitle)) {
                    throw "标题重复使用了"
                }
                let dt = new Date(0)
                dt.setFullYear(year, month - 1, day)
                let added = 0
                while (true) {
                    dt.setDate(dt.getDate() + interval)
                    if (dt.getTime() > todayUnixTime) {
                        let e = newCalendarEvent(title, dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), false)
                        events.push(e)
                        added += 1
                        if (added >= 2) {
                            break
                        }
                    }
                    if (dt.getFullYear() > 2050) {
                        break
                    }
                }
                usedTitles.push(ltitle)
                continue
            }
            throw "用数字开头却不满足任意表达式"
        } catch (error) {
            throw `第 ${index + 1} 行出错：${error}\n${line}`
        }
    }
    events.sort(function (a, b) {
        if (a.UnixTime > b.UnixTime) {
            return 1
        }
        return -1
    })
    return events
}

const reminderNextNoticeTime: string = "reminderNextNoticeTime"

async function getNeedNoticeEvents(events: Array<CalendarEvent>): Promise<Array<CalendarEvent>> {
    const today = new Date()
    const nowUnixTime = today.getTime()
    today.setHours(0, 0, 0, 0)
    const todayUnixTime = today.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    const noticeEnds = todayUnixTime + oneDay * 15
    const noticeStarts = todayUnixTime - oneDay * 6
    const olds = await GetLocalValue(reminderMarks, [])
    const out: Array<CalendarEvent> = []
    const nextNotice: number = await GetLocalValue(reminderNextNoticeTime, 0)
    const needNotice = nowUnixTime > nextNotice
    for (const e of events) {
        if (e.UnixTime > noticeEnds) { break }
        if (e.UnixTime < noticeStarts) { continue }
        const days = (e.UnixTime - todayUnixTime) / 24 / 60 / 60 / 1000
        if (days < 0 && olds.includes(e.Mark)) { continue }
        if (needNotice && !olds.includes(e.Mark) && days < 2) {
            SendNotice(`日程提醒`, `${e.Title}\n${ToDayDiffZhString(days)}\n${e.DateStr}`)
        }
        out.push(e)
    }
    if (needNotice) {
        SetLocalValue(reminderNextNoticeTime, nowUnixTime + 1000 * 90)
    }
    return out
}

if (location.pathname == "/reminder.html") {

    const txtEventList = document.getElementById('txtEventList') as HTMLTextAreaElement
    const butUpdateEvents = document.getElementById('butUpdateEvents') as HTMLButtonElement
    const divRecentEvents = document.getElementById("divRecentEvents") as HTMLDivElement
    const butForgetOldMarks = document.getElementById('butForgetOldMarks') as HTMLButtonElement

    async function updateOldMarkInCheckBox(this: HTMLInputElement, ev: Event) {
        let mark = this.title
        if (mark.length < 1) { return }
        let old = await GetLocalValue(reminderMarks, [])
        if (this.checked) {
            if (!old.includes(mark)) {
                old.push(mark)
                await SetLocalValue(reminderMarks, old)
            }
        } else {
            let index = old.indexOf(mark)
            if (index >= 0) {
                old.splice(index, 1)
                await SetLocalValue(reminderMarks, old)
            }
        }
    }

    async function updateEvents() {
        const txt = txtEventList.value.trim()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayUnixTime = today.getTime()
        let events = parseReminderText(txt)
        await SetLocalValue(reminderNextNoticeTime, null)
        events = await getNeedNoticeEvents(events)
        divRecentEvents.innerText = ''
        let lastdiv: HTMLDivElement = divRecentEvents
        let lastTime = -0.5
        let lastDateTitle = ""
        const olds = await GetLocalValue(reminderMarks, [])
        for (const e of events) {
            if (e.UnixTime != lastTime) {
                lastdiv = document.createElement('div')
                divRecentEvents.appendChild(lastdiv)
                const h2 = document.createElement("h2")
                const days = (e.UnixTime - todayUnixTime) / 24 / 60 / 60 / 1000
                lastDateTitle = ToDayDiffZhString(days)
                if (lastDateTitle.length > 0) {
                    h2.innerText = ToDayDiffZhString(days) + " " + e.DateStr
                } else {
                    h2.innerText = e.DateStr
                }
                lastdiv.appendChild(h2)
                lastTime = e.UnixTime
            }
            const p = document.createElement("p")
            const input = document.createElement("input")
            input.type = "checkbox"
            input.title = e.Mark
            input.addEventListener('input', updateOldMarkInCheckBox)
            input.checked = olds.includes(e.Mark)
            p.appendChild(input)
            const label = document.createElement("label")
            label.innerText = e.Title
            p.appendChild(label)
            lastdiv.appendChild(p)
        }
        await SetLocalValue(reminderText, txt)
    }

    (async function () {
        butUpdateEvents.addEventListener('click', updateEvents)
        txtEventList.value = await GetLocalValue(reminderText, "")
        updateEvents()
        const olds = await GetLocalValue(reminderMarks, [])
        butForgetOldMarks.innerText += `(${olds.length})`
        butForgetOldMarks.addEventListener('click', async function () {
            await SetLocalValue(reminderMarks, null)
            location.reload()
        })
    })()
}
