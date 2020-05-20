(function() {
  void 0;
  var MarkOn;

  // Copyright 2017-2018 Xuan Sang LE <xsang.le AT gmail DOT com>

    // AnTOS Web desktop is is licensed under the GNU General Public
  // License v3.0, see the LICENCE file for more information

    // This program is free software: you can redistribute it and/or
  // modify it under the terms of the GNU General Public License as
  // published by the Free Software Foundation, either version 3 of 
  // the License, or (at your option) any later version.

    // This program is distributed in the hope that it will be useful,
  // but WITHOUT ANY WARRANTY; without even the implied warranty of
  // MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
  // General Public License for more details.

    // You should have received a copy of the GNU General Public License
  //along with this program. If not, see https://www.gnu.org/licenses/.
  MarkOn = class MarkOn extends this.OS.GUI.BaseApplication {
    constructor(args) {
      super("MarkOn", args);
    }

    main() {
      var markarea;
      markarea = this.find("markarea");
      this.container = this.find("mycontainer");
      this.previewOn = false;
      if (this.args && this.args.length > 0) {
        this.currfile = this.args[0].path.asFileHandle();
      } else {
        this.currfile = "Untitled".asFileHandle();
      }
      this.editormux = false;
      this.editor = new SimpleMDE({
        element: markarea,
        autofocus: true,
        tabSize: 4,
        indentWithTabs: true,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "quote",
          "code",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "image",
          "table",
          "horizontal-rule",
          "|",
          {
            name: "preview",
            className: "fa fa-eye no-disable",
            action: (e) => {
              this.previewOn = !this.previewOn;
              return SimpleMDE.togglePreview(e);
            }
          }
        ]
      });
      //if(self.previewOn) toggle the highlight
      //{
      //    var container = self._scheme.find(self,"Text")
      //                        .$element.getElementsByClassName("editor-preview");
      //    if(container.length == 0) return;
      //    var codes = container[0].getElementsByTagName('pre');
      //    codes.forEach(function(el){
      //        hljs.highlightBlock(el);
      //    });
      //    //console.log(code);
      //}
      this.editor.codemirror.on("change", () => {
        if (this.editormux) {
          return;
        }
        if (this.currfile.dirty === false) {
          this.currfile.dirty = true;
          return this.scheme.set("apptitle", `${this.currfile.basename}*`);
        }
      });
      this.on("hboxchange", (e) => {
        return this.resizeContent();
      });
      this.bindKey("ALT-N", () => {
        return this.actionFile(`${this.name}-New`);
      });
      this.bindKey("ALT-O", () => {
        return this.actionFile(`${this.name}-Open`);
      });
      this.bindKey("CTRL-S", () => {
        return this.actionFile(`${this.name}-Save`);
      });
      this.bindKey("ALT-W", () => {
        return this.actionFile(`${this.name}-Saveas`);
      });
      this.resizeContent();
      return this.open(this.currfile);
    }

    resizeContent() {
      var cheight, children, statusbar, titlebar, toolbar;
      children = ($(this.container)).children();
      titlebar = (($(this.scheme)).find(".afx-window-top"))[0];
      toolbar = children[1];
      statusbar = children[4];
      cheight = ($(this.scheme)).height() - ($(titlebar)).height() - ($(toolbar)).height() - ($(statusbar)).height() - 40;
      return ($(children[2])).css("height", cheight + "px");
    }

    open(file) {
      //find table
      if (file.path === "Untitled") {
        return;
      }
      file.dirty = false;
      return file.read().then((d) => {
        this.currfile = file;
        this.editormux = true;
        this.editor.value(d);
        this.scheme.set("apptitle", `${this.currfile.basename}`);
        return this.editormux = false;
      }).catch((e) => {
        return this.error(__("Unable to open: {0}", file.path), e);
      });
    }

    save(file) {
      return file.write("text/plain").then((d) => {
        if (d.error) {
          return this.error(__("Error saving file {0}: {1}", file.basename, d.error));
        }
        file.dirty = false;
        file.text = file.basename;
        return this.scheme.set("apptitle", `${this.currfile.basename}`);
      }).catch((e) => {
        return this.error(__("Unable to save file: {0}", file.path), e);
      });
    }

    menu() {
      var menu;
      menu = [
        {
          text: "__(File)",
          child: [
            {
              text: "__(New)",
              dataid: `${this.name}-New`,
              shortcut: "A-N"
            },
            {
              text: "__(Open)",
              dataid: `${this.name}-Open`,
              shortcut: "A-O"
            },
            {
              text: "__(Save)",
              dataid: `${this.name}-Save`,
              shortcut: "C-S"
            },
            {
              text: "__(Save as)",
              dataid: `${this.name}-Saveas`,
              shortcut: "A-W"
            }
          ],
          onchildselect: (e) => {
            return this.actionFile(e.data.item.get("data").dataid);
          }
        }
      ];
      return menu;
    }

    actionFile(e) {
      var saveas;
      saveas = () => {
        return this.openDialog("FileDialog", {
          title: __("Save as"),
          file: this.currfile
        }).then((f) => {
          var d;
          d = f.file.path.asFileHandle();
          if (f.file.type === "file") {
            d = d.parent();
          }
          this.currfile.setPath(`${d.path}/${f.name}`);
          return this.save(this.currfile);
        });
      };
      switch (e) {
        case `${this.name}-Open`:
          return this.openDialog("FileDialog", {
            title: __("Open file")
          }).then((f) => {
            return this.open(f.file.path.asFileHandle());
          });
        case `${this.name}-Save`:
          this.currfile.cache = this.editor.value();
          if (this.currfile.basename) {
            return this.save(this.currfile);
          }
          return saveas();
        case `${this.name}-Saveas`:
          this.currfile.cache = this.editor.value();
          return saveas();
        case `${this.name}-New`:
          this.currfile = "Untitled".asFileHandle();
          this.currfile.cache = "";
          return this.editor.value("");
      }
    }

    cleanup(evt) {
      if (!this.currfile.dirty) {
        return;
      }
      evt.preventDefault();
      return this.openDialog("YesNoDialog", (d) => {
        if (d) {
          this.currfile.dirty = false;
          return this.quit();
        }
      }, __("Quit"), {
        text: __("Quit without saving ?")
      });
    }

  };

  MarkOn.dependencies = ["os://scripts/mde/simplemde.min.js", "os://scripts/mde/simplemde.min.css"];

  this.OS.register("MarkOn", MarkOn);

}).call(this);
