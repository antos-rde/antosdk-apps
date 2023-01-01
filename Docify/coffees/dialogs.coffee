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
        @flist = @find("file-list")
        @dlist = @find("dlist")
        @mlist = @find("mlist")
        @ylist = @find("ylist")
        @olist = @find("olist")
        
        @setting = @parent.setting
        @exec = @parent.exec
        @preview = @parent.preview
        
        @exec("fetch", "owners")
            .then (d) =>
                return @error d.error if d.error
                v.text = v.name for v in d.result
                v.selected = (@data and @data.oid is v.id) for v in d.result
                @olist.data = d.result
                @olist.selected = 0 if not @olist.selectedItem
            .catch (e) =>
                @error __("Unable to fetch owner list: {0}", e.toString()), e
        
        @dlist.push {
            text:"None",
            value: 0
        }
        selected = 0
        for d in [1..31]
            @dlist.push {
                text:"#{d}",
                value: d
            }
            selected = d if @data and parseInt(@data.day) is d
        @dlist.selected = selected
        
        @mlist.push {
            text:"None",
            value: 0
        }
        selected = 0
        for d in [1..12]
            @mlist.push {
                text:"#{d}",
                value: d
            }
            selected = d if @data and parseInt(@data.month) is d
        @mlist.selected = selected
        
        @ylist.push {
            text:"None",
            value: 0
        }
        @ylist.selected = 0
        for y in [1960..new Date().getFullYear()]
            @ylist.push {
                text:"#{y}",
                value: y,
                selected: @data and parseInt(@data.year) is y
            }
        
        @flist.buttons = [
            {
                 text: "",
                 iconclass: "fa fa-plus-circle",
                 onbtclick: (e) =>
                    @openDialog(new FilePreviewDialog())
                        .then (d) =>
                            d.text = d.filename
                            @flist.push d
            },
            {
                 text: "",
                 iconclass: "fa fa-minus-circle",
                 onbtclick: (e) =>
                     item = @flist.selectedItem
                     return unless item
                     @flist.delete item
            }
        ]
        @flist.onlistselect = (e) =>
            @parent.preview(e.data.item.data.path, @find("preview-canvas"))
        
        @find("btsave").onbtclick = (e) =>
            data = {
                name: @find("title").value.trim(),
                day: @dlist.selectedItem.data.value,
                month: @mlist.selectedItem.data.value,
                year: @ylist.selectedItem.data.value,
                file: (v.path for v in @flist.data),
                note: @find("note").value.trim(),
                tags: @find("tag").value.trim(),
                oid: parseInt(@olist.selectedItem.data.id)
            }
            return @notify __("Please enter title") unless data.name and data.title != ""
            return @notify __("Please attach files to the entry") unless data.file.length > 0
            
            @handle data if @handle
            @quit()
        
        return unless @data
        @find("title").value = @data.name
        @find("note").value = @data.note
        @find("tag").value = @data.tags
        file = @data.file.asFileHandle()
        file.text = file.filename
        @flist.data = [ file ]
        # owner
        

DocDialog.scheme = """
<afx-app-window width='600' height='400'>
    <afx-hbox>
        <afx-vbox data-width="350">
            <afx-hbox data-height="30">
                <afx-label text = "__(title)" data-width="50"></afx-label>
                <input type="text" data-id="title"></input>
            </afx-hbox>
            <afx-hbox data-height="30">
                <afx-label text = "__(Day)" data-width="50"></afx-label>
                <afx-list-view dropdown="true" data-id="dlist"></afx-list-view>
                <afx-label text = "__(Month)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true" data-id="mlist"></afx-list-view>
                <afx-label text = "__(Year)"data-width="50" ></afx-label>
                <afx-list-view dropdown="true" data-id="ylist"></afx-list-view>
            </afx-hbox>
            <afx-label text = "__(Files)" data-height="22"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
            <afx-label text = "__(Note)" data-height="22"></afx-label>
            <textarea data-id="note"></textarea>
            <afx-hbox data-height = "30">
                <afx-label text = "__(Owner)" data-width="50"></afx-label>
                <afx-list-view dropdown="true" data-id="olist"></afx-list-view>
                <afx-label text = "__(Tags)" data-width="50"></afx-label>
                <input type="text" data-id="tag"></input>
            </afx-hbox>
        </afx-vbox>
        <afx-vbox>
            <div data-id = "preview-container">
                <canvas data-id="preview-canvas"></canvas>
            </div>
            <div style="text-align: right;" data-height="35" >
                <afx-button text="__(Save)" data-id="btsave" ></afx-button>
            </div>
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
        @flist.buttons = [
            {
                 text: "",
                 iconclass: "fa  fa-refresh",
                 onbtclick: (e) => @refresh()
            }
        ]
        
        @flist.onlistselect = (e) =>
            # console.log e.data.item.data
            @parent.preview(e.data.item.data.path, @find("preview-canvas"))
        @find("btok").onbtclick = (e) =>
            item = @flist.selectedItem
            return @quit() unless item
            @handle(item.data) if @handle
            @quit()
        
        @refresh()
    
    refresh: () ->
        "#{@parent.setting.docpath}/unclassified".asFileHandle().read()
            .then (d) =>
                return @error d.error if d.error
                v.text = v.filename for v in d.result
                @flist.data = (v for v in d.result when v.filename[0] isnt '.')
            .catch (e) =>
                @error __("Unable to fetch unclassified file list: {0}", e.toString()), e

FilePreviewDialog.scheme = """
<afx-app-window width='400' height='400' apptitle = "__(Document preview)">
    <afx-hbox>
        <afx-vbox data-width="150">
            <afx-label text = "__(Files)" data-height="25"></afx-label>
            <afx-list-view data-id="file-list"></afx-list-view>
        </afx-vbox>
        <afx-vbox>
            <div data-id = "preview-container">
                <canvas data-id="preview-canvas"></canvas>
            </div>
            <div style="text-align: right;" data-height="35" >
                <afx-button text="__(Ok)" data-id="btok" ></afx-button>
            </div>
            
        </afx-vbox>
    </afx-hbox>
</afx-app-window>
"""

class PrintDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "PrintDialog", PrintDialog.scheme
        
    main: () ->
        super.main()
        @find("printerName").value = @parent.setting.printer
        @find("btnprint").onbtclick = (e) =>
            data = {}
            data.range = parseInt($('input[name=range]:checked', @scheme).val())
            data.pages = @find("txtPageRange").value
            data.printer = @find("printerName").value
            data.orientation = parseInt($('input[name=orientation]:checked', @scheme).val())
            data.side = parseInt($('input[name=side]:checked', @scheme).val())
            @handle data if @handle
            @quit()

PrintDialog.scheme = """
<afx-app-window width='300' height='300' data-id="DocifyPrintDialog" apptitle = "__(Print)">
    <afx-vbox>
        <afx-label text = "__(Printer name)" data-height="25"></afx-label>
        <input  type="text" data-id="printerName" data-height="25"></input>
        <afx-label text = "__(Range)" data-height="22"></afx-label>
        <div>
            <input type="radio"  name="range" value="0" checked  ></input>
            <label for="0">All</label><br>
            <input type="radio"  name="range" value="1"  ></input>
            <label for="1">Pages: </label>
            <input  type="text" data-id="txtPageRange" ></input>
        </div>
        <afx-label text = "__(Orientation)" data-height="25"></afx-label>
        <div>
            <input type="radio"  name="orientation" value="0" checked  ></input>
            <label for="0">Portrait</label><br>
            <input type="radio"  name="orientation" value="1"  ></input>
            <label for="1">Landscape</label>
        </div>
        <afx-label text = "__(Side)" data-height="22"></afx-label>
        <div>
            <input type="radio"  name="side" value="0"  ></input>
            <label for="0">One side</label><br>
             <input type="radio"  name="side" value="1" checked  ></input>
            <label for="1">Double side long edge</label><br>
            <input type="radio"  name="side" value="2"   ></input>
            <label for="2">Double side short edge</label>
        </div>
        <div data-height="35" style="text-align:right;">
            <afx-button text="__(Print)" style="margin-right:5px;" data-id="btnprint"></afx-button>
        </div>
    </afx-vbox>
</afx-app-window>
"""