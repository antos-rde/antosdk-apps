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

class FormatDialog extends this.OS.GUI.BaseDialog
    constructor: () ->
        super "FormatDialog"
    init: () ->
        @_gui.htmlToScheme FormatDialog.scheme, @, @host
    
    main: () ->
        @ui =
            aligment:
                left:@find("swleft"),
                right:@find("swright"),
                center:@find("swcenter"),
                justify:@find("swjustify")
            spacing:
                left: @find("spnleft"),
                right: @find("spnright"),
                top: @find("spntop"),
                bottom: @find("spnbottom"),
            style:
                bold: @find("swbold"),
                italic: @find("switalic"),
                underline: @find("swunderline"),
                color: @find("txtcolor"),
                bgcolor: @find("bgcolor")
            font:
                family: @find("lstfont"),
                size: @find("spnfsize")
            formats: @find("lstformats")
        # init the format object
        @currentStyle =
            aligment: @_api.switcher("left", "right", "center", "justify"),
            spacing:
                left:0
                top:0,
                right:0,
                bottom:0
            style:
                bold:false,
                italic: false,
                underline: false,
                color: undefined,
                bgcolor: undefined
            font:
                family: undefined,
                size: 12
        @preview = ($(@find "preview").find "p")[0]
        $(@preview)
            .css "padding", "0"
            .css "margin", "0"
        @initUIEvent()
        @previewStyle()
    
    initUIEvent: () ->
        me = @
        set = (e, o, k ,f) ->
            me.ui[o][k].set e, (r) ->
                v = r
                v = f r if f
                me.currentStyle[o][k] = v
                me.previewStyle()
                
        for k,v of @ui.aligment
            set "onchange", "aligment", k, ((e) -> e.data)
        for k,v of @ui.spacing
            set "onchange", "spacing", k
        for k,v of @ui.style
            set "onchange", "style", k, ((e) -> e.data) if k isnt "color" and k isnt "bgcolor"
        set "onchange", "font", "size"
        $(@ui.style.color).click (e) ->
            me.openDialog "ColorPickerDialog", (d) ->
                me.currentStyle.style.color = d
                me.previewStyle()
        $(@ui.style.bgcolor).click (e) ->
            me.openDialog "ColorPickerDialog", (d) ->
                me.currentStyle.style.bgcolor = d
                me.previewStyle()
        #font
        @ui.font.family.set "items", @data.fonts if @data and @data.fonts
        set "onlistselect", "font", "family", ( (e) -> e.data)
        #format list
        @ui.formats.set "selected", -1
        @ui.formats.set "items", @data.formats if @data and @data.formats
        @ui.formats.set "onlistselect", (e) ->
            me.fromODFStyleFormat e.data
         @ui.formats.set "selected", 0
        #@currentStyle =
    
    fromODFStyleFormat: (odfs) ->
        console.log "change style"
        console.log odfs
    
    previewStyle: () ->
        console.log "previewing"
        # reset ui
        @ui.aligment.left.set "swon", @currentStyle.aligment.left
        @ui.aligment.right.set "swon", @currentStyle.aligment.right
        @ui.aligment.center.set "swon", @currentStyle.aligment.center
        @ui.aligment.justify.set "swon", @currentStyle.aligment.justify
        @ui.spacing.left.set "value", @currentStyle.spacing.left
        @ui.spacing.right.set "value", @currentStyle.spacing.right
        @ui.spacing.top.set "value", @currentStyle.spacing.top
        @ui.spacing.bottom.set "value", @currentStyle.spacing.bottom
        @ui.style.bold.set "swon", @currentStyle.style.bold
        @ui.style.italic.set "swon", @currentStyle.style.italic
        @ui.style.underline.set "swon", @currentStyle.style.underline
        @ui.font.size.set "value", @currentStyle.font.size
        
        items = @ui.font.family.get "items"
        item = i for v, i in items when v.name is name
        @ui.font.family.set "selected", item if item >= 0
        
        $(@ui.style.color).css "background-color", @currentStyle.style.color.hex if @currentStyle.style.color
        $(@ui.style.bgcolor).css "background-color", @currentStyle.style.bgcolor.hex if @currentStyle.style.bgcolor
        # set the preview css
        el = $ @preview
        el.css "text-align", @currentStyle.aligment.selected
        el.css "padding-left", @currentStyle.spacing.left + "mm"
        el.css "padding-right", @currentStyle.spacing.right + "mm"
        el.css "padding-top", @currentStyle.spacing.top + "mm"
        el.css "padding-bottom", @currentStyle.spacing.bottom + "mm"
        el
            .css "font-weight", "normal"
            .css "font-style", "normal"
            .css "text-decoration", "none"
        el.css "font-weight", "bold" if @currentStyle.style.bold
        el.css "font-style", "italic" if @currentStyle.style.italic
        el.css "text-decoration", "underline" if @currentStyle.style.underline
        el.css "color", @currentStyle.style.color.hex if @currentStyle.style.color
        el.css "background-color", @currentStyle.style.bgcolor.hex if @currentStyle.style.bgcolor
        el.css "font-size", @currentStyle.font.size + "pt"
        el.css "font-family", @currentStyle.font.family.name if @currentStyle.font.family

FormatDialog.scheme = """
<afx-app-window apptitle="__(Format Dialog)" width="500" height="450" data-id="FormatDialog">
    <afx-vbox>
        <div data-height="5"></div>
        <afx-hbox data-height="30">
            <div data-width="5"></div>
            <afx-list-view data-id="lstformats" dropdown = "true"></afx-list-view>
            <div data-width="5" ></div>
            <afx-button text="clone" data-id="bt-clone" iconclass = "fa fa-copy" data-width="60"></afx-button>
            <div data-width="5"></div>
        </afx-hbox>
        <afx-label text="__(Aligment)" class="header" data-height="20"></afx-label>
        <afx-hbox data-height="23" data-id="aligmentbox">
            <div data-width="20" ></div>
            <afx-switch data-width="30" data-id="swleft"></afx-switch>
            <afx-label text="__(Left)"></afx-label>
            <afx-switch data-width="30" data-id="swright"></afx-switch>
            <afx-label text="__(Right)"></afx-label>
            <afx-switch data-width="30" data-id="swcenter"></afx-switch>
            <afx-label text="__(Center)"></afx-label>
            <afx-switch data-width="30" data-id="swjustify"></afx-switch>
            <afx-label text="__(Justify)"></afx-label>
            <div data-width="20" ></div>
        </afx-hbox>
         <div data-height="5"></div>
        <afx-label text="__(Spacing)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox data-height="23" data-id="spacingbox">
            <div ></div>
            <afx-label data-width="50" text="__(Left:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnleft" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Right:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnright" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Top:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spntop" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Bottom:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnbottom" step="0.5"></afx-nspinner>
            <div  ></div>
        </afx-hbox>
         <div data-height="5"></div>
         <afx-label text="__(Style)" class="header" data-height="20"></afx-label>
         <div data-height="5"></div>
        <afx-hbox data-height="23" data-id="stylebox">
            <div data-width="5"></div>
            <afx-switch data-width="30" data-id="swbold"></afx-switch>
            <afx-label text="__(Bold)"></afx-label>
            <afx-switch data-width="30" data-id="switalic"></afx-switch>
            <afx-label text="__(Italic)"></afx-label>
            <afx-switch data-width="30" data-id="swunderline"></afx-switch>
            <afx-label text="__(Underline)"></afx-label>
            <afx-label data-width="35" text="__(Text:)"></afx-label>
            <div data-width="30" data-id="txtcolor"></div>
            <div data-width="5"></div>
            <afx-label data-width="80" text="__(Background:)"></afx-label>
            <div data-width="30" data-id="bgcolor"></div>
            <div data-width="5"></div>
        </afx-hbox>
        <div data-height="5"></div>
        <afx-label text="__(Font)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox data-height="30">
            <div data-width="5"></div>
            <afx-list-view data-id="lstfont" dropdown = "true"></afx-list-view>
            <div data-width="5" ></div>
            <afx-label data-width="35" text="__(Size:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnfsize"></afx-nspinner>
            <div data-width="5"></div>
        </afx-hbox>
        <div data-height="5"></div>
        <afx-label text="__(Preview)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox>
             <div data-width="5"></div>
            <div data-id="preview">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce laoreet diam vestibulum massa malesuada quis dignissim libero blandit. Duis sit amet volutpat nisl.</p>
            </div>
             <div data-width="5"></div>
        </afx-hbox>
        
        <div data-height="5"></div>
        <afx-hbox data-height="30">
            <div></div>
            <afx-button text="__(Ok)" data-width="30" data-id="btok"></afx-button>
            <div data-width="5"></div>
            <afx-button text="__(Cancel)" data-width="55" data-id="btx"></afx-button>
        </afx-hbox>
         <div data-height="5"></div>
    </afx-vbox>
</afx-app-window>
"""