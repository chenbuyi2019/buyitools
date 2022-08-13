/// <reference path="global.ts" />

// 好朋友通讯录页
if (location.pathname == "/friends.html") {
    const friends: string = "friends"

    const divList = document.getElementById("divList") as HTMLDivElement
    const divFriendName = document.getElementById("divFriendName") as HTMLDivElement
    const divFriendDetail = document.getElementById("divFriendDetail") as HTMLDivElement
    const butEditFriendInfo = document.getElementById("butEditFriendInfo") as HTMLButtonElement
    const butAddFriend = document.getElementById("butAddFriend") as HTMLButtonElement
    const butRandomFriend = document.getElementById("butRandomFriend") as HTMLButtonElement

    let selectedFriendName = ""

    /**
     * 获取全部的好友的名字
     */
    async function GetAllFriendsName(): Promise<string[]> {
        return await GetLocalValue(friends, []) as string[]
    }

    /**
     * 获取好友的信息
     */
    async function GetFriendDetail(name: string): Promise<string> {
        return await GetLocalValue(`${friends}${name}`, "") as string
    }

    /**
     * 新增或修改好友的信息
     */
    async function SetFriendInfo(name: string, detail: string, oldName: string = ""): Promise<void> {
        await SetLocalValue(friends + name, detail)
        let changed = false
        const oldNames = await GetAllFriendsName()
        if (name != oldName) {
            if (oldName.length > 0) {
                let oldIndex = oldNames.indexOf(oldName)
                if (oldIndex >= 0) {
                    oldNames.splice(oldIndex, 1)
                    await SetLocalValue(friends + oldName, null)
                    changed = true
                }
            }
        }
        if (!oldNames.includes(name)) {
            oldNames.push(name)
            changed = true
        }
        if (changed = true) {
            oldNames.sort()
            await SetLocalValue(friends, oldNames)
        }
    }

    /**
     * 删除好友的信息
     */
    async function DeleteFriendInfo(name: string): Promise<void> {
        const oldNames = await GetAllFriendsName()
        const index = oldNames.indexOf(name)
        if (index >= 0) {
            oldNames.splice(index, 1)
            await SetLocalValue(friends, oldNames)
            await SetLocalValue(friends + name, null)
        }
    }

    /**
     * 使用 InputBox 来编辑老的或者建立新的好友信息
     */
    async function InputFriendInfo(oldName: string): Promise<void> {
        let title = "新朋友："
        let lastText = "第一行是昵称\nqq是什么\nsteam是什么"
        oldName = oldName.trim()
        const oldDetail = oldName.length > 0 ? await GetFriendDetail(oldName) : ""
        if (oldDetail.length < 1) { oldName = "" }
        if (oldName.length > 0) {
            title = `编辑老朋友：${oldName}`
            lastText = `${oldName}\n${oldDetail}`
        }
        let newName: string = ""
        let newDetail: string = ""
        let oldNames: string[] = []
        while (true) {
            newName = ""
            newDetail = ""
            const newTxt = await InputBox(title, lastText)
            oldNames = await GetAllFriendsName()
            if (newTxt == null) { return }
            if (newTxt.length < 1 && oldName.length > 0) {
                if (confirm(`空白意味着你要删除这个好友，你确定要删除 ${oldName} 吗？`)) {
                    await DeleteFriendInfo(oldName)
                    await RefreshFriendList("")
                    divFriendName.innerText += " ——已删除"
                    return
                }
            }
            try {
                const LFindex = newTxt.indexOf("\n")
                if (LFindex < 2) { throw "应该有至少两行，第一行是昵称，之后是细节" }
                newName = newTxt.substring(0, LFindex).trim()
                if (newName.length < 1) { throw "昵称不能为空白" }
                if (newName != oldName && oldNames.includes(newName)) { throw "这个昵称已经被使用过了" }
                newDetail = newTxt.substring(LFindex).trim()
                if (newDetail.length < 1) { throw "细节信息不能为空白" }
                break
            } catch (error) {
                alert(error)
                lastText = newTxt
            }
        }
        await SetFriendInfo(newName, newDetail, oldName)
        await RefreshFriendList(newName)
    }

    // 新增好友记录
    butAddFriend.addEventListener("click", async function () {
        await InputFriendInfo("")
    })

    // 修改好友记录
    butEditFriendInfo.addEventListener("click", async function () {
        if (selectedFriendName.length < 1) { return }
        const oldName = selectedFriendName
        await InputFriendInfo(oldName)
    })

    async function onFriendButtonClicked(this: HTMLButtonElement, ev: MouseEvent) {
        selectedFriendName = ""
        butEditFriendInfo.disabled = true
        divFriendName.innerText = ""
        divFriendDetail.innerText = ""
        const name = this.innerText
        if (name.length < 1) { return }
        const detail = await GetFriendDetail(name)
        if (detail.length < 1) { return }
        divFriendName.innerText = name
        divFriendDetail.innerText = detail
        selectedFriendName = name
        butEditFriendInfo.disabled = false
    }

    /**
     * 刷新好友列表的 UI 展示
     */
    async function RefreshFriendList(gotoName: string = ""): Promise<void> {
        divList.innerText = ""
        const fs = await GetAllFriendsName()
        let target: HTMLButtonElement | null = null
        for (const n of fs) {
            const button = document.createElement("button")
            button.innerText = n
            if (gotoName == n) { target = button }
            divList.appendChild(button)
            button.addEventListener("click", onFriendButtonClicked)
        }
        if (target != null) { target.click() }
    }

    RefreshFriendList()

    // 随机好友
    butRandomFriend.addEventListener("click", function () {
        const buttons = divList.getElementsByTagName("button")
        if (buttons.length < 1) { return }
        butRandomFriend.disabled = true
        setTimeout(function () { butRandomFriend.disabled = false }, 1500)
        let target = buttons.item(GetRandInt(1, buttons.length - 1))
        if (target != null) { target.click() }
    })
}
