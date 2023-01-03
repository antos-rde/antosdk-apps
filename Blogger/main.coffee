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
class Blogger extends this.OS.application.BaseApplication
    constructor: (args) ->
        super "Blogger", args
    
    
    main: () ->
        @user = {}
        @cvlist = @find "cv-list"
        @cvlist.ontreeselect = (d) =>
            return unless d
            data = d.data.item.data
            @CVSectionByCID Number(data.id)
            
        @inputtags = @.find "input-tags"
        @bloglist = @find "blog-list"
        @seclist = @find "cv-sec-list"
        
        el = @find("photo")
        $(el)
            .click (e) =>
                @openDialog("FileDialog", {
                    title: __("Select image file"),
                    mimes: ["image/.*"]
                })
                .then (d) =>
                    el.value = d.file.path
                .catch (e) => @error __("Unable to get file"), e 
        
        @userdb = new @_api.DB("user")
        @cvcatdb = new @_api.DB("cv_cat")
        @cvsecdb = new @_api.DB("cv_sections")
        @blogdb = new @_api.DB("blogs")
        
        
        @tabcontainer = @find "tabcontainer"
        @tabcontainer.ontabselect = (e) =>
            @fetchData e.data.container.aid
        
        (@find "bt-user-save").onbtclick = (e) =>
            @saveUser()

        (@find "cv-cat-add").onbtclick = (e) =>
            fn = (tree) =>
                @openDialog(new BloggerCategoryDialog(), {
                    title: __("Add category"),
                    tree: tree
                }).then (d) =>
                    c =
                        name: d.value,
                        pid: d.p.id,
                        publish: 1
                    @cvcatdb.save c
                        .then (r) =>
                            @refreshCVCat()
                        .catch (e) => @error __("Cannot add new category"), e
                .catch (e) => @error e.toString(), e
            @fetchCVCat()
                .then (tree) => fn(tree)
                .catch (e) =>
                    data =
                        text: "Porfolio",
                        id:"0",
                        nodes: []
                    fn(data)
                    @error __("Unable to fetch categories"), e
            
        (@find "cv-cat-edit").onbtclick = (e) =>
            sel = @cvlist.selectedItem
            return unless sel
            cat = sel.data
            return unless cat
            @fetchCVCat().then (tree) =>
                @openDialog(new BloggerCategoryDialog(), {
                    title: __("Edit category"),
                    tree: tree, cat: cat
                }).then (d) =>
                    c =
                        id: cat.id,
                        publish: cat.publish,
                        pid: d.p.id,
                        name: d.value
                    
                    @cvcatdb.save c
                        .then (r) =>
                            @refreshCVCat()
                        .catch (e) =>
                            @error __("Cannot Edit category"), e
            .catch (e) => @error __("Unable to fetch categories"), e

        (@find "cv-cat-del").onbtclick = (e) =>
            sel = @cvlist.selectedItem
            return unless sel
            cat = sel.data
            return unless cat
            @openDialog("YesNoDialog", {
                title: __("Delete category") ,
                iconclass: "fa fa-question-circle",
                text: __("Do you really want to delete: {0}?", cat.name)
            }).then (d) =>
                return unless d
                @deleteCVCat cat
            .catch (e) => @error e.toString(), e
    
        (@find "cv-sec-add").onbtclick = (e) =>
            sel = @cvlist.selectedItem
            return unless sel
            cat = sel.data
            return @notify __("Please select a category") unless cat and cat.id isnt "0"
            @openDialog(new BloggerCVSectionDiaglog(@), {
                title: __("New section entry for {0}", cat.name)
            }).then (d) =>
                d.cid = Number cat.id
                d.start = Number d.start
                d.end = Number d.end
                # d.publish = 1
                @cvsecdb.save d
                    .then (r) =>
                        @CVSectionByCID Number(cat.id)
                    .catch (e) => @error __("Cannot save section: {0}", e.toString()), e

        (@find "cv-sec-move").onbtclick = (e) =>
            sel = (@find "cv-sec-list").selectedItem
            return @notify __("Please select a section to move") unless sel
            sec = sel.data
            
            @fetchCVCat().then (tree) =>
                @openDialog(new BloggerCategoryDialog(),{
                    title: __("Move to"),
                    tree: tree,
                    selonly: true
                }).then (d) =>
                    c =
                        id: sec.id,
                        cid: d.p.id
                    
                    @cvsecdb.save c
                        .then (r) =>
                            @CVSectionByCID(sec.cid)
                            (@find "cv-sec-list").unselect()
                        .catch (e) => @error __("Cannot move section"), e

        (@find "cv-sec-edit").onbtclick = (e) =>
            sel = (@find "cv-sec-list").selectedItem
            return @notify __("Please select a section to edit") unless sel
            sec = sel.data
            @openDialog(new BloggerCVSectionDiaglog(@), {
                title: __("Modify section entry"),
                section: sec
            }).then (d) =>
                d.cid = Number sec.cid
                d.start = Number d.start
                d.end = Number d.end
                #d.publish = Number sec.publish
                @cvsecdb.save d
                    .then (r) =>
                        @CVSectionByCID Number(sec.cid)
                    .catch (e) => return @error __("Cannot save section: {0}", e.toString()), e

        @seclist.onitemclose = (e) =>
            return unless e
            data = e.data.item.data
            @openDialog("YesNoDialog", {
                iconclass: "fa fa-question-circle",
                text: __("Do you really want to delete: {0}?", data.title)
            }).then (b) =>
                return unless b
                @cvsecdb.delete data.id
                    .then (r) =>
                        @seclist.delete e.data.item
                    .catch (e) => @error __("Cannot delete the section: {0}", e.toString()), e
            return false
            
        @editor = new EasyMDE
            element: @find "markarea"
            autoDownloadFontAwesome: false
            autofocus: true
            tabSize: 4
            indentWithTabs: true
            toolbar: [
                {
                    name: __("New"),
                    className: "fa fa-file",
                    action: (e) =>
                        @bloglist.unselect()
                        @clearEditor()
                },
                {
                    name: __("Save"),
                    className: "fa fa-save",
                    action: (e) =>
                        @saveBlog()
                }
                , "|", "bold", "italic", "heading", "|", "quote", "code",
                "unordered-list", "ordered-list", "|", "link",
                "image", "table", "horizontal-rule",
                {
                    name: "image",
                    className: "fa fa-file-image-o",
                    action: (e) =>
                        @openDialog("FileDialog", {
                            title: __("Select image file"),
                            mimes: ["image/.*"]
                        }).then (d) =>
                            d.file.path.asFileHandle().publish()
                            .then (r) =>
                                doc = @editor.codemirror.getDoc()
                                doc.replaceSelection "![](#{@_api.handle.shared}/#{r.result})"
                            .catch (e) => @error __("Cannot export file for embedding to text"), e
                },
                {
                    name:"Youtube",
                    className: "fa fa-youtube",
                    action: (e) =>
                        doc = @editor.codemirror.getDoc()
                        doc.replaceSelection "[[youtube:]]"
                }
                "|",
                {
                    name: __("Preview"),
                    className: "fa fa-eye no-disable",
                    action: (e) =>
                        @previewOn = !@previewOn
                        EasyMDE.togglePreview e
                        #/console.log @select ".editor-preview editor-preview-active"
                        renderMathInElement @find "editor-container"
                },
                "|",
                {
                    name: __("Send mail"),
                    className: "fa fa-paper-plane",
                    action: (e) =>
                        sel = @bloglist.selectedItem
                        return @error __("No post selected") unless sel
                        data = sel.data
                        @openDialog(new BloggerSendmailDiaglog(@), {
                            title: __("Send mail"),
                            content: @editor.value(),
                            id: data.id
                        })
                        .then (d) ->
                            console.log "Email sent"
                }
            ],
            
        @bloglist.onlistselect = (e) =>
            el = @bloglist.selectedItem
            return unless el
            sel = el.data
            return unless sel
            @blogdb.get Number(sel.id)
                .then (r) =>
                    @editor.value r.content
                    @inputtags.value = r.tags
                    (@find "blog-publish").swon = if Number(r.publish) then true else false
                .catch (e) =>
                    @error __("Cannot fetch the entry content"), e

        @bloglist.onitemclose = (e) =>
            return unless e
            el = e.data.item
            data = el.data
            @openDialog("YesNoDialog", {
                title: __("Delete a post"),
                iconclass: "fa fa-question-circle",
                text: __("Do you really want to delete this post ?") 
            }).then (b) =>
                return unless b
                @blogdb.delete data.id
                    .then (r) =>
                        @bloglist.delete el
                        @bloglist.unselect()
                        @clearEditor()
            return false
            

        @bindKey "CTRL-S", () =>
            sel = @tabcontainer.selectedTab
            return unless sel and sel.container.aid is "blog-container"
            @saveBlog()
        @on "resize", () =>
            @resizeContent()
        
        @resizeContent()
        @loadBlogs()
        # @fetchData 0
    # USER TAB
    fetchData: (idx) ->
        switch idx
            when "user-container" #user info
                
                @userdb.get null
                    .then (d) =>
                        @user = d[0]
                        inputs = @select "[input-class='user-input']"
                        ($ v).val @user[v.name] for v in inputs
                    .catch (e) => @error __("Cannot fetch user data"), e
            when "cv-container" # category
                @refreshCVCat()
            else 
                @loadBlogs()
    
    saveUser:() ->
        inputs = @select "[input-class='user-input']"
        @user[v.name] = ($ v).val() for v in inputs
        return @notify __("Full name must be entered") if not @user.fullname or @user.fullname is ""
        #console.log @user
        @userdb.save @user
            .then (r) =>
                return @notify __("User data updated")
            .catch (e) => return @error __("Cannot save user data"), e


    # PORFOLIO TAB
    refreshCVCat: () ->
        @fetchCVCat().then (data) =>
            @cvlist.data = data
            @cvlist.expandAll()
        .catch (e) => @error __("Unable to load categories"), e
    
    fetchCVCat: () ->
        new Promise (resolve, reject) =>
            data =
                text: "Porfolio",
                id:"0",
                nodes: []
            cnd =
                order:
                    name: "ASC"
            @cvcatdb.find cnd
                .then (d) =>
                    @catListToTree d, data, "0"
                    resolve data
                .catch (e) -> reject __e e
            #it = (@cvlist.find "pid", "2")[0]
            #@cvlist.set "selectedItem", it

    catListToTree: (table, data, id) ->
        result = (v for v in table when v.pid is id)
        return data.nodes = null if result.length is 0
        for v in result
            v.nodes = []
            v.text = v.name
            @catListToTree table, v, v.id
            #v.nodes = null if v.nodes.length is 0
            data.nodes.push v

    deleteCVCat: (cat) ->
        me = @
        ids = []
        func = (c) ->
            ids.push c.id
            func(v) for v in c.nodes if c.nodes
        func(cat)
        
        cond = ({ "=": { cid: v } } for v in ids)
        # delete all content
        @cvsecdb.delete({ "or": cond }).then (r) =>
            cond = ({ "=": { id: v } } for v in ids)
            @cvcatdb.delete({ "or": cond }).then (re) =>
                @refreshCVCat()
                @seclist.data=[]
            .catch (e) =>
                @error __("Cannot delete the category: {0} [{1}]", cat.name, e.toString()), e
        .catch (e) =>
            @error __("Cannot delete all content of: {0} [{1}]", cat.name, e.toString()), e

    CVSectionByCID: (cid) ->
        cond =
            exp:
                "=":
                    cid: cid
            order:
                start: "DESC"
        @cvsecdb.find(cond).then (d) =>
            items = []
            (@find "cv-sec-status").text = __("Found {0} sections", d.length)
            for  v in d
                v.closable = true
                v.tag = "afx-blogger-cvsection-item"
                v.start = Number(v.start)
                v.end = Number(v.end)
                v.start = undefined if v.start < 1000
                v.end = undefined if v.end < 1000
                items.push v
            @seclist.data = items
        .catch (e) => @error e.toString(), e

    # blog
    saveBlog: () ->
        sel = undefined
        selel = @bloglist.selectedItem
        sel = selel.data if selel
        tags = @inputtags.value
        content = @editor.value()
        title = (new RegExp "^#+(.*)\n", "g").exec content
        return @notify __("Please insert a title in the text: beginning with heading") unless title and title.length is 2
        return @notify __("Please enter tags") if tags is ""
        d = new Date()
        data =
            content: content
            title: title[1].trim()
            tags: tags
            ctime: if sel then sel.ctime else d.timestamp()
            ctimestr: if sel then sel.ctimestr else d.toString()
            utime: d.timestamp()
            utimestr: d.toString()
            rendered: @process(@editor.options.previewRender(content))
            publish: if (@find "blog-publish").swon then 1 else 0
        data.id = sel.id if sel
        #save the data
        @blogdb.save data
            .then (r) =>
                @loadBlogs()
            .catch (e) => @error __("Cannot save blog: {0}", e.toString()), e
    
    process: (text) ->
        # find video tag and rendered it
        embed = (id) ->
            return """
                <iframe
                    class = "embeded-video"
                    width="560" height="315" 
                    src="https://www.youtube.com/embed/#{id}"
                    frameborder="0" allow="encrypted-media" allowfullscreen
                ></iframe>
            """
        re  = /\[\[youtube:([^\]]*)\]\]/g
        replace = []
        while (found = re.exec text) isnt null
            replace.push found
        return text unless replace.length > 0
        ret = ""
        begin = 0
        for it in replace
            ret += text.substring begin, it.index
            ret += embed(it[1])
            begin = it.index + it[0].length
        ret += text.substring begin, text.length
        #console.log ret
        return ret
        
    clearEditor:() ->
        @.editor.value ""
        @.inputtags.value = ""
        (@.find "blog-publish").swon = false
    # load blog
    loadBlogs: () ->
        selidx = -1
        el = @bloglist.selectedItem
        selidx = $(el).index()
        cond =
            order:
                ctime: "DESC"
            fields: [
                "id",
                "title",
                "ctimestr",
                "ctime",
                "utime",
                "utimestr"
            ]
        @blogdb.find cond
            .then (r) =>
                v.tag = "afx-blogger-post-item" for v in r
                @bloglist.data = r
                if selidx isnt -1
                    @bloglist.selected = selidx
                else
                    @clearEditor()
                    @bloglist.selected = -1
            .catch (e) => @error __("No post found: {0}", e.toString()), e
            
    resizeContent: () ->
        container = @find "editor-container"
        children = ($ ".EasyMDEContainer", container).children()
        titlebar = (($ @scheme).find ".afx-window-top")[0]
        toolbar = children[0]
        statusbar = children[3]
        cheight = ($ @scheme).height() - ($ titlebar).height() - ($ toolbar).height() - ($ statusbar).height() - 90
        ($ children[1]).css("height", cheight + "px")
        
Blogger.singleton = true
Blogger.dependencies = [
    "pkg://SimpleMDE/main.js",
    "pkg://SimpleMDE/main.css"
    "pkg://Katex/main.js",
    "pkg://Katex/main.css",
]
this.OS.register "Blogger", Blogger