/// <reference path="global.ts" />

/**
 * 唤起一个多行编辑器用以输入文本，可取消可保存。对网页的其他部分实行覆盖。
 * 如果用户点了取消，返回的是 null 。
 */
async function InputBox(title: string, defaultText: string): Promise<string | null> {
    return new Promise<string | null>(function (resolve: (value: string | null | PromiseLike<string | null>) => void, reject: (reason?: any) => void) {
        const divCover = document.createElement("div")
        divCover.style.backgroundColor = "#253528cc"
        divCover.style.position = "fixed"
        divCover.style.width = "155%"
        divCover.style.height = "150%"
        divCover.style.left = "0px"
        divCover.style.top = "0px"

        const divBody = document.createElement("div")
        divBody.style.backgroundColor = "#253528"
        divBody.style.width = "70%"
        divBody.style.position = "fixed"
        divBody.style.height = "400px"
        divBody.style.marginLeft = "10%"
        divBody.style.marginTop = "150px"
        divBody.style.padding = "20px"

        const divTitle = document.createElement("div")
        divTitle.innerText = title
        divTitle.style.fontSize = "x-large"
        divTitle.style.color = "white"

        const editor = document.createElement("textarea")
        editor.style.display = "block"
        editor.style.resize = "none"
        editor.style.width = "100%"
        editor.style.height = "300px"
        editor.style.margin = "10px auto"
        editor.value = defaultText

        const close = function (txt: string | null) {
            divCover.remove()
            resolve(txt)
        }

        const butOK = document.createElement("button")
        butOK.innerText = "确认"
        butOK.style.padding = "5px"
        butOK.style.marginRight = "10px"
        butOK.addEventListener("click", function () { close(editor.value.normalize()) })

        const butCancel = document.createElement("button")
        butCancel.innerText = "取消"
        butCancel.style.padding = butOK.style.padding
        butCancel.addEventListener("click", function () { close(null) })

        divBody.appendChild(divTitle)
        divBody.appendChild(editor)
        divBody.appendChild(butOK)
        divBody.appendChild(butCancel)
        divCover.appendChild(divBody)
        document.body.appendChild(divCover)
        editor.focus()
    })
}