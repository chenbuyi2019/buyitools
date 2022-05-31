const bigTitle: string = browser.runtime.getManifest().name

const isBackground: boolean = location.pathname.includes("background")

// 把 date 转换为 2010-01-29 的格式
function GetDateString(d: Date, add: string = '-'): string {
    return `${d.getFullYear()}${add}${(d.getMonth() + 1).toFixed().padStart(2, '0')}${add}${d.getDate().toFixed().padStart(2, '0')}`
}

// 把 date 转换为 2010 年 01 月 29 日 的汉字格式
function GetDateZhString(d: Date): string {
    return `${d.getFullYear()} 年 ${(d.getMonth() + 1).toFixed().padStart(2, '0')} 月 ${d.getDate().toFixed().padStart(2, '0')} 日`
}

// 把 date 转换为 今天 昨天 明天 后天 周六 这样的汉字格式
function GetDaysZhString(d: Date): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(d.getTime())
    target.setHours(0, 0, 0, 0)
    const days = (target.getTime() - today.getTime()) / (1000 * 24 * 60 * 60)
    switch (days) {
        case 0:
            return '今天'
        case 1:
            return '明天'
        case 2:
            return '后天'
        case -1:
            return '昨天'
        case -2:
            return '前天'
    }
    return '周' + '日一二三四五六'.charAt(target.getDay())
}

const NoticeIdLinks = new Map<string, string>()

// 发送简单的推送消息
async function SendNotice(title: string, text: string, targetPage: string) {
    const id = await browser.notifications.create({
        type: "basic",
        message: text,
        title: `${title} - ${bigTitle}`,
        iconUrl: "/icon.jpg"
    })
    NoticeIdLinks.set(id, targetPage)
}

async function SetLocalValue(key: string, obj: any) {
    if (key.length < 1) {
        return
    }
    if (obj == null) {
        await browser.storage.local.remove(key)
        return
    }
    await browser.storage.local.set({ [key]: obj })
}

async function GetLocalValue(key: string, defaultValue: any = null): Promise<any> {
    if (key.length < 1) {
        return null
    }
    const r = await browser.storage.local.get(key)
    const v = r[key]
    if (v == null) {
        return defaultValue
    }
    return v
}

// 判断这个公历月日是否合理
function IsGoodDate(month: number, date: number): boolean {
    const day31 = [1, 3, 5, 7, 8, 10, 12]
    if (day31.includes(month)) {
        return date <= 31
    } else if (month == 2) {
        return date <= 29
    }
    return date <= 30
}

// 根据天数之差获取汉字表达形式
function GetDayDiffZhString(days: number): string {
    if (days < 0) {
        return "过去"
    } else if (days < 1) {
        return "今天"
    } else if (days < 2) {
        return "明天"
    } else if (days < 3) {
        return "后天"
    }
    return ''
}

if (isBackground) {
    const idurl = browser.runtime.getURL("")
    const switchToIndex = async function (targetPage: string) {
        const tabs = await browser.tabs.query({ currentWindow: true, title: bigTitle })
        const newURL = idurl + "index.html#" + targetPage
        for (const tab of tabs) {
            const u = tab.url
            const id = tab.id
            if (u == null || id == null) {
                continue
            }
            if (u.startsWith(idurl)) {
                browser.tabs.update(id, { active: true, url: newURL })
                return
            }
        }
        browser.tabs.create({ url: newURL, active: true })
    }
    browser.browserAction.onClicked.addListener(function () {
        switchToIndex("")
    })
    browser.notifications.onClicked.addListener(function (nid: string) {
        let target = NoticeIdLinks.get(nid)
        if (target == null) {
            target = ''
        }
        switchToIndex(target)
    })
}