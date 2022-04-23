// 传入公历，获取农历的日期，公历不能小于2021年2月12日，也不能大于2050年
function GetZhCalendarDate(dt: Date): ZhCalendarDateValue | null {
    if (isNaN(dt.getFullYear())) {
        return null
    }
    const dtClone = new Date(dt.getTime())
    dtClone.setHours(0, 0, 0, 0)
    const dtMs = dtClone.getTime()
    const startMs = zhCalendarData.dateStart.getTime()
    if (dtMs < startMs) {
        return null
    }
    const daysDiff = (dtMs - startMs) / (1000 * 60 * 60 * 24)
    return zhCalendarData.moveDays(daysDiff)
}

// 传入农历，获取公历的日期，农历不能小于2021年正月初一，也不能大于2050年
function GetDateFromZhCalendarDate(zh: ZhCalendarDateValue): Date | null {
    const v = zhCalendarData.moveDays(0, zh)
    if (v == null) { return null }
    return v.Date
}

interface ZhCalendarDateValue {
    Year: number,
    Month: number,
    Day: number,
    IsLeapMonth: boolean,
    Date: Date | null
}

const zhCalendarData = {
    dateStart: new Date(1613059200000), // 目前是2021年2月12日，大年初一
    // 1表示普通小月，2表示普通大月，3表示闰小月，4表示闰大月
    years: [
        [1, 2, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1],
        [2, 1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2],
        [1, 2, 3, 1, 2, 2, 1, 2, 2, 1, 2, 1, 2],
        [1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 2, 1],
        [2, 1, 2, 1, 1, 2, 3, 2, 1, 2, 2, 2, 1],
        [2, 1, 2, 1, 1, 2, 1, 1, 2, 2, 2, 1],
        [2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 2, 1],
        [2, 2, 2, 1, 2, 3, 1, 2, 1, 1, 2, 2, 1],
        [2, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 2],
        [1, 2, 1, 2, 2, 1, 2, 1, 2, 1, 2, 1],
        [1, 2, 2, 3, 2, 1, 2, 2, 1, 2, 1, 2, 1],
        [2, 1, 1, 2, 1, 2, 2, 1, 2, 2, 1, 2],
        [1, 2, 1, 1, 2, 1, 2, 1, 2, 2, 2, 3, 2],
        [1, 2, 1, 1, 2, 1, 2, 1, 2, 2, 1, 2],
        [2, 1, 2, 1, 1, 2, 1, 1, 2, 2, 1, 2],
        [2, 2, 1, 2, 1, 1, 4, 1, 1, 2, 1, 2, 2],
        [2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2],
        [2, 2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1],
        [2, 2, 1, 2, 2, 3, 2, 1, 2, 1, 2, 1, 1],
        [2, 1, 2, 2, 1, 2, 1, 2, 2, 1, 2, 1],
        [1, 2, 1, 2, 1, 2, 2, 1, 2, 2, 1, 2],
        [1, 2, 3, 1, 2, 1, 2, 1, 2, 2, 1, 2, 2],
        [1, 2, 1, 1, 2, 1, 1, 2, 2, 1, 2, 2],
        [2, 1, 2, 1, 1, 2, 1, 3, 2, 1, 2, 2, 2],
        [2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 2, 2],
        [2, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1, 2],
        [2, 1, 2, 2, 1, 4, 1, 2, 1, 1, 2, 1, 2],
        [1, 2, 2, 1, 2, 2, 1, 2, 1, 1, 2, 1],
        [2, 1, 2, 1, 2, 2, 1, 2, 2, 1, 2, 1],
        [1, 2, 1, 4, 1, 2, 1, 2, 2, 1, 2, 2, 1]
    ],
    moveDays(daysDiff: number, moveuntil: ZhCalendarDateValue | null = null): ZhCalendarDateValue | null {
        let year = zhCalendarData.dateStart.getFullYear()
        if (moveuntil == null) {
            if (daysDiff < 0) { return null }
        } else {
            if (moveuntil.Year < year || moveuntil.Year >= year + zhCalendarData.years.length) { return null }
            if (moveuntil.Month < 1 || moveuntil.Month > 12) { return null }
            if (moveuntil.Day < 1 || moveuntil.Day > 30) { return null }
        }
        let dt = new Date(zhCalendarData.dateStart.getTime())
        let passDays = 0
        for (const years of zhCalendarData.years) {
            let month = 0
            for (const monthtype of years) {
                let isLeapMonth = false
                let monthdays = 0
                switch (monthtype) {
                    case 1:
                        month += 1
                        monthdays = 29
                        break
                    case 2:
                        month += 1
                        monthdays = 30
                        break
                    case 3:
                        isLeapMonth = true
                        monthdays = 29
                        break
                    case 4:
                        isLeapMonth = true
                        monthdays = 30
                        break
                }
                let needSlowCheck = false
                if (moveuntil == null) {
                    if (passDays + monthdays >= daysDiff) {
                        needSlowCheck = true
                    }
                } else {
                    if (moveuntil.Year == year && moveuntil.Month == month) {
                        needSlowCheck = true
                    } else if (moveuntil.Year < year) {
                        return null
                    }
                }
                if (needSlowCheck) {
                    for (let day = 1; day <= monthdays; day++) {
                        let ok = false
                        if (moveuntil == null) {
                            if (passDays >= daysDiff) {
                                ok = true
                            }
                        } else {
                            if (moveuntil.IsLeapMonth == isLeapMonth && moveuntil.Day == day) {
                                ok = true
                            }
                        }
                        if (ok) {
                            const r: ZhCalendarDateValue = {
                                Year: year,
                                Month: month,
                                IsLeapMonth: isLeapMonth,
                                Day: day,
                                Date: dt
                            }
                            return r
                        }
                        dt.setDate(dt.getDate() + 1)
                        passDays += 1
                    }
                } else {
                    passDays += monthdays
                    dt.setDate(dt.getDate() + monthdays)
                }
            }
            year += 1
        }
        return null
    }
}
