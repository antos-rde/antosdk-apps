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
class BloggerCategoryDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "BloggerCategoryDialog"
        
    main: () ->
        super.main()
        @tree = @find "tree"
        @txtinput = @find "txtinput"
        
        (@find "bt-ok").set "onbtclick", (e) =>
            sel = @tree.get "selectedItem"
            return @notify __("Please select a parent category") unless sel
            seldata = sel.get "data"
            val = @txtinput.value
            return @notify __("Please enter category name") if val is "" and not @data.selonly
            return @notify __("Parent can not be the category itself") if @data.cat and @data.cat.id is seldata.id
            @handle { p: seldata, value: val } if @handle
            @quit()
            
        (@find "bt-cancel").set "onbtclick", (e) =>
            @quit()
        if @data and @data.tree
            if @data and @data.cat
                @txtinput.value = @data.cat.name
                if @data.cat.pid is "0"
                    seldata = @data.tree
                else
                    seldata = @findDataByID @data.cat.pid, @data.tree.nodes
                seldata.selected = true if seldata
            @tree.set "data", @data.tree
            @tree.expandAll()
            # TODO set selected category name

    findDataByID: (id, list) ->
        for data in list
            return data if data.id is id
            if data.nodes
                @findDataByID id, data.nodes
        return undefined
            
BloggerCategoryDialog.scheme = """
<afx-app-window width='300' height='400'>
    <afx-vbox>
        <afx-label text="__(Pick a parent)" data-height="25" class="lbl-header" ></afx-label>
        <afx-tree-view data-id="tree" ></afx-tree-view>
        <afx-label text="__(Category name)" data-height="25" class="lbl-header" ></afx-label>
        <input type="text" data-height="25" data-id = "txtinput"/ >
        <div data-height = '30' style=' text-align:right;padding:3px;'>
            <afx-button data-id = "bt-ok" text = "__(Ok)"></afx-button>
            <afx-button data-id = "bt-cancel" text = "__(Cancel)"></afx-button>
        </div>
    </afx-vbox>
</afx-app-window>
"""

# This dialog is use for cv section editing

class BloggerCVSectionDiaglog extends this.OS.GUI.BasicDialog
    constructor: (parent) ->
        file = "#{parent.meta().path}/cvsection.html".asFileHandle()
        super "BloggerCVSectionDiaglog", file

    main: () ->
        super.main()
        @editor = new SimpleMDE
            element: @find "contentarea"
            status: false
            toolbar: false
        ($ (@select '[class = "CodeMirror-scroll"]')[0]).css "min-height", "50px"
        ($ (@select '[class="CodeMirror cm-s-paper CodeMirror-wrap"]')[0]).css "min-height", "50px"
        inputs = @select "[input-class='user-input']"
        (($ v).val @data.section[v.name] for v in inputs ) if @data and @data.section
        @editor.value @data.section.content if @data and @data.section
        (@find "section-publish").set "swon", (if @data and @data.section and Number(@data.section.publish) then true else false)
        (@find "bt-cv-sec-save").set "onbtclick", (e) =>
            data = {}
            data[v.name] = ($ v).val() for v in inputs
            data.content = @editor.value()
            return @notify __("Title or content must not be blank") if data.title is "" and data.content is ""
            #return @notify "Content must not be blank" if data.content is ""
            data.id = @data.section.id if @data and @data.section
            val = (@find "section-publish").get "swon"
            if val is true
                data.publish = 1
            else
                data.publish = 0
            @handle data if @handle
            @quit()
            
        @on "vboxchange", () => @resizeContent()
        @resizeContent()
    
    resizeContent: () ->
        container = @find "editor-container"
        children = ($ container).children()
        cheight = ($ container).height() - 30
        ($ children[1]).css("height", cheight + "px")
    

# this dialog is for send mail
class BloggerSendmailDiaglog extends this.OS.GUI.BasicDialog
    constructor: (parent) ->
        file = "#{parent.meta().path}/sendmail.html".asFileHandle()
        super "BloggerSendmailDiaglog", file

    main: () ->
        super.main()
        @subdb = new @.parent._api.DB("subscribers")
        @maillinglist = @find "email-list"
        title = (new RegExp "^#+(.*)\n", "g").exec @data.content
        (@find "mail-title").value = title[1]
        content = (@data.content.substring 0, 500) + "..."
        (@find "contentarea").value = BloggerSendmailDiaglog.template.format @data.id, content

        @subdb.find {}
            .then (d) =>
                for v in d
                    v.text = v.name
                    v.switch = true
                    v.checked = true
                @maillinglist.set "items", d
            .catch (e) =>
                @error __("Cannot fetch subscribers data: {0}", e.toString()), e

        (@find "bt-sendmail").set "onbtclick", (e) =>
            items = @maillinglist.get "items"
            emails = []
            for v in items
                if v.checked is true
                    console.log v.email
                    emails.push v.email
            
            return @notify __("No email selected") if emails.length is 0
            # send the email
            data =
                path: "#{@parent.path()}/sendmail.lua",
                parameters:
                    to: emails,
                    title: (@find "mail-title").value,
                    content: (@find "contentarea").value
            @_api.apigateway data, false
                .then (d) =>
                    return @notify __("Unable to send mail to: {0}", d.result.join(", ")) if d.error
                    @quit()
                .catch (e) =>
                    console.log e
                    @error __("Error sending mail: {0}", e.toString()), e

            

BloggerSendmailDiaglog.template = """
Hello,

Xuan Sang LE has just published a new post on his blog: https://blog.lxsang.me/post/id/{0}

==========
{1}
==========


Read the full article via:
https://blog.lxsang.me/post/id/{0}

You receive this email because you have been subscribed to his blog.

Have a nice day,

Sent from Blogger, an AntOS application
"""