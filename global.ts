
/**
 * 扩展的标题
 */
const bigTitle: string = browser.runtime.getManifest().name

/**
 * 是否是后台页面
 */
const isBackground: boolean = location.pathname.includes("background")

/**
 * 把 date 转换为 2010-01-29 的格式
 */
function GetDateString(d: Date, add: string = '-'): string {
    return `${d.getFullYear()}${add}${(d.getMonth() + 1).toFixed().padStart(2, '0')}${add}${d.getDate().toFixed().padStart(2, '0')}`
}

/**
 * 把 date 转换为 2010 年 01 月 29 日 的汉字格式
 */
function GetDateZhString(d: Date, noYear: boolean = false): string {
    let s = ''
    if (!noYear) {
        s = `${d.getFullYear()} 年 `
    }
    s += `${(d.getMonth() + 1).toFixed().padStart(2, '0')} 月 ${d.getDate().toFixed().padStart(2, '0')} 日`
    return s
}

/**
 * 把 date 转换为 今天 昨天 明天 后天 周六 这样的汉字格式。
 * 除了今天明天后天昨天，其他都会显示为周几
 */
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

/** 推送消息绑定的跳转子页面信息 */
const NoticeIdLinks = new Map<string, string>()

/**
 * 发送推送消息
 */
async function SendNotice(title: string, text: string, targetPage: string) {
    const id = await browser.notifications.create({
        type: "basic",
        message: text,
        title: `${title} - ${bigTitle}`,
        iconUrl: "/icon.jpg"
    })
    NoticeIdLinks.set(id, targetPage)
}

/**
 * 保存值到扩展存储空间里，如果 obj 是 null ，就视为从存储空间里删除这个值
 */
async function SetLocalValue(key: string, obj: any) {
    if (key.length < 1) { return }
    if (obj == null) {
        await browser.storage.local.remove(key)
        return
    }
    await browser.storage.local.set({ [key]: obj })
}

/**
 * 从扩展存储空间里读取值
 */
async function GetLocalValue(key: string, defaultValue: any = null): Promise<any> {
    if (key.length < 1) { return null }
    const r = await browser.storage.local.get(key)
    const v = r[key]
    if (v == null) { return defaultValue }
    return v
}

/**
 * 获取一个公历月份里面的最大天数（2月会返回29）
 */
function GetDaysCountInMonth(month: number): number {
    const day31 = [1, 3, 5, 7, 8, 10, 12]
    if (day31.includes(month)) { return 31 }
    return month === 2 ? 29 : 30
}

/**
 * 判断这个公历月日是否合理
 */
function IsGoodDate(month: number, date: number): boolean {
    let days = GetDaysCountInMonth(month)
    return date <= days
}

/**
 * 获取 max 和 min 之间的一个随机整数， max 和 min 都是被包括的。已经过测试，分布均匀   
 */
function GetRandInt(min: number, max: number): number {
    return Math.floor(Math.random() * (1 + max - min)) + min
}

// 如果是后台页面
if (isBackground) {
    /** 扩展自身页面的链接 */
    const idurl = browser.runtime.getURL("")

    /** 
     * 跳转到扩展页面，
     * 如果浏览器有开着的扩展页面的标签页，就直接跳转，
     * 如果没有就新建
     **/
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
        if (target == null) { target = '' }
        switchToIndex(target)
    })
}