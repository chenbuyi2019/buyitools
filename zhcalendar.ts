
/**
 * 农历日期信息，年月日，是否是润月，对应的公历日期
 * @interface ZhCalendarDateValue
 */
interface ZhCalendarDateValue {
    Year: number,
    Month: number,
    Day: number,
    IsLeapMonth: boolean,
    Date: Date | null
}

/**
 * 传入公历，获取农历的日期，公历不能小于2021年2月12日，也不能大于2050年
 */
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

/**
 * 传入农历，获取公历的日期，农历不能小于2021年正月初一，也不能大于2050年
 */
function GetDateFromZhCalendarDate(zh: ZhCalendarDateValue): Date | null {
    const v = zhCalendarData.moveDays(0, zh)
    if (v == null) { return null }
    return v.Date
}

/**
 * 获取农历月份的汉语名字
 */
function GetZhMonthName(m: number): string {
    m = Math.round(m)
    if (isNaN(m) || m < 1 || m > 12) { return '' }
    let f = ""
    if (m < 11) {
        f = '正二三四五六七八九十'.charAt(m - 1)
    } else if (m == 11) {
        f = '十一'
    } else if (m == 12) {
        f = '十二'
    }
    return f + '月'
}

/**
 * 获取农历日子的汉语名字
 */
function GetZhDayName(d: number): string {
    d = Math.round(d)
    if (isNaN(d) || d < 1 || d > 30) { return '' }
    switch (d) {
        case 30:
            return '三十'
        case 20:
            return '二十'
    }
    let f = '初'
    if (d > 20) {
        f = '廿'
        d -= 20
    } else if (d > 10) {
        f = '十'
        d -= 10
    }
    return f + '一二三四五六七八九十'.charAt(d - 1)
}


/** 农历计算的核心，目前范围是2021年正月初一到2050年 */
const zhCalendarData = {
    dateStart: new Date(1613059200000), // 目前 dateStart 是2021年2月12日，大年初一
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
    /**
     * 移动指定的天数来计算公历和农历。
     * 如果 moveUntil 是 null ，就看 daysCount ，移动了多少天，返回对应的农历。
     * 如果 moveUntil 不是 null ，就一直向后移动，移动到某一天发现一致的时候，返回对应的农历。
     * 如果刚好遇到农历这个月份没有30日，会返回下个月的1日。 
     */
    moveDays(daysCount: number, moveUntil: ZhCalendarDateValue | null = null): ZhCalendarDateValue | null {
        let year = zhCalendarData.dateStart.getFullYear()
        if (moveUntil == null) {
            if (daysCount < 0) { return null }
        } else {
            if (moveUntil.Year < year || moveUntil.Year >= year + zhCalendarData.years.length) { return null }
            if (moveUntil.Month < 1 || moveUntil.Month > 12) { return null }
            if (moveUntil.Day < 1 || moveUntil.Day > 30) { return null }
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
                if (moveUntil == null) {
                    if (passDays + monthdays >= daysCount) { needSlowCheck = true }
                } else {
                    if (moveUntil.Year == year && moveUntil.Month == month && moveUntil.IsLeapMonth == isLeapMonth) {
                        needSlowCheck = true
                    } else if (moveUntil.Year < year) {
                        return null
                    }
                }
                if (needSlowCheck) {
                    for (let day = 1; day <= monthdays; day++) {
                        let ok = false
                        if (moveUntil == null) {
                            ok = passDays >= daysCount
                        } else {
                            ok = moveUntil.Day == day
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
