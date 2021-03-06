(function() {
  var ClientDialog, ClientListDialog, GPClient;

  ClientDialog = class ClientDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("ClientDialog", ClientDialog.scheme);
    }

    main() {
      var el, i, inputs, len;
      super.main();
      inputs = $(this.scheme).find("input[type=text]");
      if (this.data) {
        for (i = 0, len = inputs.length; i < len; i++) {
          el = inputs[i];
          if (this.data[el.name]) {
            el.value = this.data[el.name];
          }
        }
      }
      this.find("btncancel").onbtclick = () => {
        return this.quit();
      };
      return this.find("btnok").onbtclick = (e) => {
        var data, j, len1;
        data = {};
        for (j = 0, len1 = inputs.length; j < len1; j++) {
          el = inputs[j];
          if (el.value === "") {
            return this.notify(__("Please enter all the fields"));
          }
          data[el.name] = el.value;
        }
        if (this.handle) {
          this.handle(data);
        }
        return this.quit();
      };
    }

  };

  ClientDialog.scheme = `<afx-app-window width='300' height='160'>
    <afx-hbox>
        <div data-width="5"></div>
        <afx-vbox>
            <div data-height="5"></div>
            <afx-label data-height="25" text = "__(Client name)"></afx-label>
            <input type="text" name="text" data-height="25" />
            <div data-height="5"></div>
            <afx-label data-height="25" text = "__(URL)"></afx-label>
            <input type="text" name="url" data-height="25" />
            <div data-height="30" style="text-align: right;">
                <afx-button data-id="btnok" text="__(Ok)"></afx-button>
                <afx-button data-id="btncancel" text="__(Cancel)"></afx-button>
            </div>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
</afx-app-window>`;

  
  ClientListDialog = class ClientListDialog extends this.OS.GUI.BasicDialog {
    constructor() {
      super("ClientListDialog", ClientListDialog.scheme);
    }

    main() {
      super.main();
      this.clist = this.find("client-list");
      this.clist.buttons = [
        {
          text: "",
          iconclass: "fa fa-plus-circle",
          onbtclick: (e) => {
            return this.openDialog(new ClientDialog(),
        {
              title: __("Add new client")
            }).then((data) => {
              //console.log(data)
              this.parent.setting.clients.push(data);
              return this.clist.data = this.parent.setting.clients;
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-minus-circle",
          onbtclick: (e) => {
            var index,
        item;
            item = this.clist.selectedItem;
            index = this.clist.selected;
            if (!item) {
              return;
            }
            return this.ask({
              text: __("Do you realy want to delete: `{0}`",
        item.data.text)
            }).then((d) => {
              if (!d) {
                return;
              }
              this.parent.setting.clients.splice(index,
        1);
              return this.clist.data = this.parent.setting.clients;
            });
          }
        },
        {
          text: "",
          iconclass: "fa fa-pencil-square-o",
          onbtclick: (e) => {
            var item;
            item = this.clist.selectedItem;
            if (!item) {
              return;
            }
            return this.openDialog(new ClientDialog(),
        {
              title: __("Add new client"),
              text: item.data.text,
              url: item.data.url
            }).then((data) => {
              //console.log(data)
              if (!data) {
                return;
              }
              item.data.text = data.text;
              item.data.url = data.url;
              return this.clist.data = this.parent.setting.clients;
            });
          }
        }
      ];
      this.find("btnswitch").onbtclick = (e) => {
        var item;
        item = this.clist.selectedItem;
        if (!item) {
          return;
        }
        this.parent.setting.curl = item.data.url;
        this.parent.setting.cname = item.data.text;
        this.parent.switchClient();
        return this.quit();
      };
      return this.clist.data = this.parent.setting.clients;
    }

  };

  ClientListDialog.scheme = `<afx-app-window width='200' height='200'>
    <afx-vbox>
        <afx-list-view data-id="client-list"></afx-list-view>
        <div data-height="30" style="text-align: right;">
            <afx-button text="__(Switch client)" data-id="btnswitch"></afx-button>
        <div>
    </afx-vbox>
</afx-app-window>`;

  GPClient = class GPClient extends this.OS.application.BaseApplication {
    constructor(args) {
      super("GPClient", args);
    }

    main() {
      if (!this.setting.clients) {
        this.setting.clients = [];
      }
      this.container = this.find("container");
      this.bindKey("CTRL-M", () => {
        return this.openDialog(new ClientListDialog(), {
          title: __("Client Manager")
        });
      });
      return this.switchClient();
    }

    switchClient() {
      if (this.setting.curl) {
        this.container.src = this.setting.curl;
        return this.scheme.apptitle = this.setting.cname;
      } else {
        return this.notify(__("No client selected, manager client in menu Options > Client manager"));
      }
    }

    menu() {
      return [
        {
          text: "__(Options)",
          nodes: [
            {
              text: "__(Client manager)",
              shortcut: "C-M"
            }
          ],
          onchildselect: (e) => {
            return this.openDialog(new ClientListDialog(),
        {
              title: __("Client Manager")
            });
          }
        }
      ];
    }

  };

  GPClient.singleton = true;

  this.OS.register("GPClient", GPClient);

}).call(this);
