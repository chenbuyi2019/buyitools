/// <reference path="global.ts" />
/// <reference path="reminder.ts" />

if (location.pathname.includes("background")) {
    const switchToIndex = async function () {
        const tabs = await browser.tabs.query({ currentWindow: true, title: bigTitle })
        for (const tab of tabs) {
            const u = tab.url
            const id = tab.id
            if (u == null || id == null) {
                continue
            }
            if (!u.startsWith('http') && u.endsWith("/index.html")) {
                browser.tabs.update(id, { active: true })
                return
            }
        }
        browser.tabs.create({ url: "/index.html", active: true })
    }

    browser.browserAction.onClicked.addListener(switchToIndex)

    browser.notifications.onClicked.addListener(switchToIndex)

    const checkReminder = async function () {
        const txt: string = await GetLocalValue(reminderText, '')
        const evs = parseReminderText(txt)
        await getNeedNoticeEvents(evs)
    }
    setInterval(checkReminder, 1000 * 60 * 60 * 6)
    checkReminder()
}