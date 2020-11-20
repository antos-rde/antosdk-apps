class OwnerDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "OwnerDialog", OwnerDialog.scheme
        
    main: () ->
        super.main()
        @oview = @find("ownview")
        @oview.buttons = [
            {
                 text: "",
                 iconclass: "fa fa-plus-circle",
                 onbtclick: (e) =>
                     @openDialog("PromptDialog", { title: __("Owner"), label: __("Name")})
                        .then (d) =>
                            @parent.exec("insert", { table: "owners", data: { name: d } })
                                .then (r) =>
                                    return @error r.error if r.error
                                    @owner_refresh()
                                .catch (e) => @error __("Unable to insert owner: {0}", e.toString()),e
                        .catch (e) => @error e.toString(),e
            },
            {
                 text: "",
                 iconclass: "fa fa-minus-circle",
                 onbtclick: (e) =>
                    item = @oview.selectedItem
                    return unless item
                    @ask({ text:__("Do you realy want to delete: `{0}`", item.data.text)})
                        .then (d) =>
                            return unless d
                            @parent.exec("delete", {table:"owners", id: parseInt(item.data.id)})
                                .then (d) =>
                                    return @error d.error if d.error
                                    @owner_refresh()
                                .catch (e) => 
                                    @error __("Unable delete category: {0}", e.toString()), e
            },
            {
                 text: "",
                 iconclass: "fa fa-pencil-square-o",
                 onbtclick: (e) =>
                    item = @oview.selectedItem
                    return unless item
                    @openDialog("PromptDialog", { title: __("Owner"), label: __("Name"), value: item.data.name })
                        .then (d) =>
                            @parent.exec("update", { table: "owners", data: { id: parseInt(item.data.id), name: d } })
                                .then (r) =>
                                    return @error r.error if r.error
                                    @owner_refresh()
                                .catch (e) => @error __("Unable to update owner: {0}", e.toString()), e
                        .catch (e) => @error e.toString()
            }
        ]
        @owner_refresh()
    
    owner_refresh: () ->
        @parent.exec("fetch", "owners")
            .then (d) =>
                v.text = v.name for v in d.result
                @oview.data = d.result
            .catch (err) => @error __("Unable to fetch owners: {0}", err.toString()), e

OwnerDialog.scheme = """
<afx-app-window width='200' height='300'>
    <afx-vbox>
        <afx-list-view data-id="ownview"></afx-list-view>
    </afx-vbox>
</afx-app-window>
"""

class DocDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "DocDialog", DocDialog.scheme
        
    main: () ->
        super.main()
        @find("file-list").buttons = [
            {
                 text: "",
                 iconclass: "fa fa-plus-circle",
                 onbtclick: (e) =>
            },
            {
                 text: "",
                 iconclass: "fa fa-minus-circle",
                 onbtclick: (e) =>
            }
        ]

DocDialog.scheme = """
<afx-app-window width='500' height='300'>
    <afx-hbox>
        <afx-vbox data-width="300">
            <afx-hbox data-height="22">
                <afx-label text = "__(title)" data-width="50"></afx-label>
                <input type="text"></input>
            </afx-hbox>
            <afx-hbox data-height="22">
                <afx-label text = "__(Day)" data-width="50"></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
                <afx-label text = "__(Month)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
                <afx-label text = "__(Year)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true"></afx-list-view>
            </afx-hbox>
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
            <afx-label text = "__(Note)" data-height="22"></afx-label>
            <textarea></textarea>
            <afx-hbox data-height = "27">
                <afx-label text = "__(Tags)" data-width="50"></afx-label>
                <input type="text"></input>
            </afx-hbox>
        </afx-vbox>
        <afx-vbox>
            <div></div>
            <afx-button text="__(Save)" iconclass="" data-height="30" ></afx-button>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>
"""

class FilePreviewDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "FilePreviewDialog", FilePreviewDialog.scheme
        
    main: () ->
        super.main()
        @flist = @find("file-list")
        @flist.onlistselect = (e) =>
            # console.log e.data.item.data
            @parent.exec("preview", e.data.item.data.path)
                .then (d) =>
                    console.log d
                .catch (e) =>
                    @error e.toString(), e
        @refresh()
    
    refresh: () ->
        "#{@parent.setting.docpath}/unclassified".asFileHandle().read()
            .then (d) =>
                return @parent.error d.error if d.error
                v.text = v.filename for v in d.result
                @flist.data = d.result
            .catch (e) =>
                @error __("Unable to fetch unclassified file list: {0}", e.toString()), e

FilePreviewDialog.scheme = """
<afx-app-window width='500' height='300'>
    <afx-hbox>
        <afx-vbox data-width="200">
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
        </afx-vbox>
        <afx-vbox>
            <div></div>
            <afx-button text="__(Ok)" iconclass="" data-height="30" ></afx-button>
        </afx-vbox>
    </afx-hbox>
</afx-app-window>
"""