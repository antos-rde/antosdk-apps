class HyperLinkDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "HyperLinkDialog", {
            tags: [
                { tag: "afx-label", att: 'text="__(Text)" data-height="23" class="header"' },
                { tag: "input", att: 'data-height="30"' },
                { tag: "afx-label", att: 'text="__(Link)" data-height="23" class="header"' },
                { tag: "input", att: 'data-height="30"' },
                { tag: "div", att: ' data-height="5"' }
            ],
            width: 350,
            height: 150,
            resizable: false,
            buttons: [
                {
                    label: "Ok", onclick: (d) ->
                        data =
                            text: (d.find "content1").value,
                            link: (d.find "content3").value,
                            readonly: d.data.readonly,
                            action: d.data.action
                        d.handler data if d.handler
                        d.quit()
                },
                { label: "__(Cancel)", onclick: (d) -> d.quit() }
            ],
            filldata: (d) ->
                return unless d.data
                (d.find "content1").value = d.data.text
                (d.find "content3").value = d.data.link
                $(d.find "content1").prop('disabled', d.data.readonly)
        }