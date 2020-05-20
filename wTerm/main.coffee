# Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>

# AnTOS Web desktop is is licensed under the GNU General Public
# License v3.0, see the LICENCE file for more information

# This program is free software: you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation, either version 3 of 
# the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
# General Public License for more details.

# You should have received a copy of the GNU General Public License
#along with this program. If not, see https://www.gnu.org/licenses/.
class ClipboardDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ClipboardDialog", ClipboardDialog.scheme
    
    init: () ->
        @find("btnOk").set "onbtclick", (e) =>
            value = $(@find "txtInput").val()
            return unless value and value isnt ""
            @handle value if @handle
            @quit()
        
        @find("btnCancel").set "onbtclick", (e) =>
            @quit()

ClipboardDialog.scheme = """
<afx-app-window data-id = "ClipboardDialog" width='400' height='300' apptitle = "__(Clipboard)">
    <afx-vbox>
        <afx-hbox>
            <div data-width = "10" />
            <afx-vbox>
                <div data-height="10" />
                <textarea data-id= "txtInput" />
                <div data-height="10" />
                <afx-hbox data-height="30">
                    <div />
                    <afx-button data-id = "btnOk" text = "__(Ok)" data-width = "40" />
                    <afx-button data-id = "btnCancel" text = "__(Cancel)" data-width = "50" />
                </afx-hbox>
            </afx-vbox>
            <div data-width = "10" />
        </afx-hbox>
    </afx-vbox>
</afx-app-window>
"""

class wTerm extends this.OS.GUI.BaseApplication
    constructor: (args) ->
        super "wTerm", args
    
    main: () ->
        @mterm = @find "myterm"
        @term = new Terminal { cursorBlink: true }
        @fitAddon = new FitAddon.FitAddon()
        @term.loadAddon(@fitAddon)
        @term.setOption('fontSize', '12')
        @term.open @mterm
        @term.onKey (d) =>
            @socket.send "i#{d.key}" if @socket
        
        @socket = undefined

        @on "focus", () => @term.focus()
        
        @mterm.contextmenuHandle = (e, m) =>
            m.set "items", [
                { text: "__(Copy)", id: "copy" },
                { text: "__(Paste)", id: "paste"}
            ]
            m.set "onmenuselect", (e) =>
                return unless e
                @mctxHandle e.data.item.get "data"
            m.show e
    
        @openSession()
        
        # make desktop menu if not exist
        @systemsetting.desktop.menu[@name] = { text: "__(Open terminal)", app: "wTerm" } unless @systemsetting.desktop.menu[@name]
        
        @on "hboxchange", (e) =>
            @resizeContent()

    mctxHandle: (data) ->
        switch data.id
            when "paste"
                @openDialog(new ClipboardDialog()).then (d) =>
                    @socket.send "i#{v}" for v in d
            when "copy"
                text = @term.getSelection()
                return unless text and text isnt ""
                @_api.setClipboard text
                console.log @_api.getClipboard()
            else
    

    resizeContent: () ->
        @fitAddon.fit()
        ncol = @term.cols
        nrow = @term.rows
        @socket.send "s#{ncol}:#{nrow}"

    openSession: () ->
        @term.clear()
        @term.focus()
        console.log @setting.uri
        return @configure() unless @setting.uri

        @socket = new WebSocket @setting.uri
        @socket.onopen = () =>
            @resizeContent (($ @mterm).width()) ,  (($ @mterm).height())
            @term.focus()
        
        @socket.onerror = (e) =>
            @error __("Unable to connect to: {0}", @setting.uri), e
            @socket = undefined

        @socket.onmessage =  (e) => @term.write e.data if @term and e.data
        
        @socket.onclose = () =>
            @socket = undefined
            @notify __("Terminal connection closed")

    cleanup: (e) ->
        @socket.close() if @socket

    menu: () ->
        {
            text: "__(Edit)",
            child: [
                { text: "__(Terminal URI)", dataid: "#{@name}-termuri" }
            ],
            onchildselect: (e) => @configure()
        }
    
    configure: () ->
        @socket.close() if @socket
        @openDialog("PromptDialog", {
            title: "__(Please enter terminal URI)",
            label: "__(URI)",
            value: @setting.uri || "wss://lxsang.me/wterm"
        }).then (d) =>
                return unless (d and d isnt "")
                @setting.uri = d
                @openSession()
            
this.OS.register "wTerm", wTerm
