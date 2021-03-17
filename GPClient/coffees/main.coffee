class ClientDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ClientDialog", ClientDialog.scheme
        
    main: () ->
        super.main()
        
        inputs = $(@scheme).find("input[type=text]")
        
        if @data
            for el in inputs
                el.value = @data[el.name] if @data[el.name]
        
        @find("btncancel").onbtclick = () => @quit()
        
        @find("btnok").onbtclick = (e) =>
            data = {}
            for el in inputs
                return @notify __("Please enter all the fields") if el.value is ""
                data[el.name] = el.value
            
            @handle data if @handle
            @quit()

ClientDialog.scheme = """
<afx-app-window width='300' height='160'>
    <afx-hbox>
        <div data-width="5"></div>
        <afx-vbox>
            <div data-height="5"></div>
            <afx-label data-height="25" text = "__(Client name)"></afx-label>
            <input type="text" name="text" data-height="25" ></input>
            <div data-height="5"></div>
            <afx-label data-height="25" text = "__(URL)"></afx-label>
            <input type="text" name="url" data-height="25" ></input>
            <div data-height="30" style="text-align: right;">
                <afx-button data-id="btnok" text="__(Ok)"></afx-button>
                <afx-button data-id="btncancel" text="__(Cancel)"></afx-button>
            </div>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
</afx-app-window>
"""
# 

class ClientListDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "ClientListDialog", ClientListDialog.scheme
        
    main: () ->
        super.main()
        @clist = @find("client-list")
        @clist.buttons = [
            {
                 text: "",
                 iconclass: "fa fa-plus-circle",
                 onbtclick: (e) =>
                    @openDialog(new ClientDialog(), {
                        title: __("Add new client")
                    })
                        .then (data) =>
                            #console.log(data)
                            @parent.setting.clients.push(data)
                            @clist.data = @parent.setting.clients
                     
            },
            {
                 text: "",
                 iconclass: "fa fa-minus-circle",
                 onbtclick: (e) =>
                    item = @clist.selectedItem
                    index = @clist.selected
                    return unless item
                    @ask({ text:__("Do you realy want to delete: `{0}`", item.data.text)})
                        .then (d) =>
                            return unless d
                            @parent.setting.clients.splice(index,1)
                            @clist.data = @parent.setting.clients
            },
            {
                 text: "",
                 iconclass: "fa fa-pencil-square-o",
                 onbtclick: (e) =>
                    item = @clist.selectedItem
                    return unless item
                    @openDialog(new ClientDialog(), {
                        title: __("Add new client"),
                        text: item.data.text,
                        url: item.data.url
                    })
                        .then (data) =>
                            #console.log(data)
                            return unless data
                            item.data.text = data.text
                            item.data.url = data.url
                            @clist.data = @parent.setting.clients
            }
        ]
        @find("btnswitch").onbtclick = (e) =>
            item = @clist.selectedItem
            return unless item
            @parent.setting.curl = item.data.url
            @parent.setting.cname = item.data.text
            @parent.switchClient()
            @quit()
        @clist.data = @parent.setting.clients

ClientListDialog.scheme = """
<afx-app-window width='200' height='200'>
    <afx-vbox>
        <afx-list-view data-id="client-list"></afx-list-view>
        <div data-height="30" style="text-align: right;">
            <afx-button text="__(Switch client)" data-id="btnswitch"></afx-button>
        <div>
    </afx-vbox>
</afx-app-window>
"""
class GPClient extends this.OS.application.BaseApplication
    constructor: ( args ) ->
        super "GPClient", args
    
    main: () ->
        @setting.clients = [] unless @setting.clients
        @container = @find("container")
        @bindKey "CTRL-M", () =>
            @openDialog new ClientListDialog(), {
                title: __("Client Manager")
            }
        @switchClient()
    
    switchClient: () ->
        if @setting.curl
            @container.src = @setting.curl
            @scheme.apptitle = @setting.cname
        else
            @notify __("No client selected, manager client in menu Options > Client manager")
        
    menu: () ->
        [
            {
                text: "__(Options)",
                nodes: [
                    { text: "__(Client manager)", shortcut: "C-M"}
                ],
                onchildselect: (e) =>
                    @openDialog new ClientListDialog(), {
                        title: __("Client Manager")
                    }
            }
        ]

GPClient.singleton = true

this.OS.register "GPClient", GPClient