class HyperLinkDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "HyperLinkDialog", HyperLinkDialog.scheme
        
    
    main: () ->
        super.main()
        txtText = @find "txtText"
        txtLink = @find "txtLink"
        if @data and @data.data
            txtText.value = @data.data.text
            txtLink.value = @data.data.link
            $(txtText).prop('disabled', @data.data.readonly)
        
        @find("btnCancel").onbtclick = (e) =>
            @quit()
        
        @find("btnOk").onbtclick = (e) =>
            data =
                text: txtText.value,
                link: txtLink.value,
                readonly: @data.data.readonly,
                action: @data.data.action
            @handle data if @handle
            @quit()

HyperLinkDialog.scheme = """
<afx-app-window  width='350' height='150' apptitle = "Hyperlink">
    <afx-vbox>
        <afx-hbox>
            <div data-width = "10" />
            <afx-vbox>
                <div data-height="10" />
                <afx-label class="header" text = "__(Text)" data-height="23" />
                <input data-height = "30" data-id = "txtText" />
                <afx-label class="header" text = "__(Link)" data-height="23" />
                <input data-height = "30" data-id = "txtLink" />
                <div data-height="10" />
                <afx-hbox data-height="30">
                    <div />
                    <afx-button data-id = "btnOk" text = "__(Ok)" data-width = "40" />
                    <afx-button data-id = "btnCancel" text = "__(Cancel)" data-width = "40" />
                    <div data-width = "10" />
                </afx-hbox>
            </afx-vbox>
            <div data-width = "10" />
        </afx-hbox>
    </afx-vbox>
</afx-app-window>
"""

class FormatDialog extends this.OS.GUI.BasicDialog
    constructor: () ->
        super "FormatDialog", FormatDialog.scheme
    
    main: () ->
        super.main()
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
                lineheight: @find("spnlheight")
            padding:
                left: @find("pspnleft"),
                right: @find("pspnright"),
                top: @find("pspntop"),
                bottom: @find("pspnbottom"),
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
        @initStyleObject()
        @preview = ($(@find "preview").find "p")[0]
        $(@preview)
            .css "padding", "0"
            .css "margin", "0"
        @initUIEvent()
        #@previewStyle()
    
    initStyleObject: ()->
        # init the format object
        @currentStyle =
            aligment: @_api.switcher("left", "right", "center", "justify"),
            spacing:
                left:0
                top:0,
                right:0,
                bottom:0,
                lineheight: 0
            padding:
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
    
    initUIEvent: () ->
        
        set = (e, o, k ,f) =>
            @ui[o][k][e] = (r) =>
                v = r
                v = f r if f
                @currentStyle[o][k] = v
                @previewStyle()
                
        for k,v of @ui.aligment
            set "onswchange", "aligment", k, ((e) => e.data)
        for k,v of @ui.spacing
            set "onvaluechange", "spacing", k, ((e) => e.data)
        for k,v of @ui.padding
            set "onvaluechange", "padding", k, ((e) => e.data)
        for k,v of @ui.style
            set "onswchange", "style", k, ((e) => e.data) if k isnt "color" and k isnt "bgcolor"
        set "onvaluechange", "font", "size"
        $(@ui.style.color).click (e) =>
            @openDialog "ColorPickerDialog"
            .then (d) =>
                @currentStyle.style.color = d
                @previewStyle()
        $(@ui.style.bgcolor).click (e) =>
            @openDialog "ColorPickerDialog"
            .then (d) =>
                @currentStyle.style.bgcolor = d
                @previewStyle()
        #font
        @ui.font.family.data = @data.data.fonts if @data.data and @data.data.fonts
        set "onlistselect", "font", "family", ( (e) => e.data.item.data)
        #format list
        @ui.formats.selected = -1
        @ui.formats.data = @data.data.formats if @data.data and @data.data.formats
        @ui.formats.onlistselect = (e) =>
            @fromODFStyleFormat e.data.item.data
         @ui.formats.selected = 0
        (@find "btok").onbtclick = (e) =>
            @saveCurrentStyle()
            
        (@find "btx").onbtclick = (e) =>
            @quit()
        
        (@find "bt-clone").onbtclick = (e) =>
            @clone()
           
    clone: ()->
        
        selected = @ui.formats.selectedItem
        return unless selected
        selected = selected.data
        @openDialog "PromptDialog", { title: __("Clone style: {0}", selected.text), label: __("New style name:") }
        .then (d) =>
            return @notify __("Abort: no style name is specified") unless d and d.trim() isnt ""
            newstyle = @parent.editorSession.cloneParagraphStyle selected.name, d
            @ui.formats.push { text:d, name: newstyle }
            @ui.formats.selected = (@ui.formats.data.length - 1)
            @notify __("New style: {0} added", newstyle)
        
    saveCurrentStyle: () ->
        selected = @ui.formats.selectedItem
        return unless selected
        selected = selected.data
        odfs =
            "style:paragraph-properties":
                "fo:margin-top": @currentStyle.spacing.top + "mm"
                "fo:margin-left": @currentStyle.spacing.left + "mm"
                "fo:margin-bottom": @currentStyle.spacing.bottom + "mm"
                "fo:margin-right": @currentStyle.spacing.right + "mm"
                "fo:padding-top": @currentStyle.padding.top + "mm"
                "fo:padding-left": @currentStyle.padding.left + "mm"
                "fo:padding-bottom": @currentStyle.padding.bottom + "mm"
                "fo:padding-right": @currentStyle.padding.right + "mm"
                "fo:line-height": if @currentStyle.spacing.lineheight > 0 then @currentStyle.spacing.lineheight + "mm"  else "normal"
                "fo:text-align": @currentStyle.aligment.selected || "left"
            "style:text-properties":
                "fo:font-weight": if @currentStyle.style.bold then "bold" else "normal"
                "fo:font-style": if @currentStyle.style.italic then "italic" else "normal"
                "style:text-underline-style": if @currentStyle.style.underline then "solid" else "none"
                "fo:font-size": @currentStyle.font.size + "pt"
                "fo:font-name": @currentStyle.font.family.text
                "fo:color": if @currentStyle.style.color then @currentStyle.style.color.hex else "#000000"
                "fo:background-color": if @currentStyle.style.bgcolor then @currentStyle.style.bgcolor.hex else "transparent"
        @parent.editorSession.updateParagraphStyle selected.name, odfs
        @notify __("Paragraph format [{0}] is saved", selected.text)
    
    fromODFStyleFormat: (odfs) ->
        
        @initStyleObject()
        cssUnits = new core.CSSUnits()
        findFont = (name) =>
            items = @ui.font.family.data
            item = v for v in items when v.text is name
            return undefined unless item 
            return item
        # spacing
        style = @parent.editorSession.getParagraphStyleAttributes(odfs.name)['style:paragraph-properties']
        if style
            @currentStyle.spacing.top = cssUnits.convertMeasure(style['fo:margin-top'], 'mm') || 0
            @currentStyle.spacing.left = cssUnits.convertMeasure(style['fo:margin-left'], 'mm') || 0
            @currentStyle.spacing.right = cssUnits.convertMeasure(style['fo:margin-right'], 'mm') || 0
            @currentStyle.spacing.bottom = cssUnits.convertMeasure(style['fo:margin-bottom'], 'mm') || 0
            @currentStyle.padding.top = cssUnits.convertMeasure(style['fo:padding-top'], 'mm') || 0
            @currentStyle.padding.left = cssUnits.convertMeasure(style['fo:padding-left'], 'mm') || 0
            @currentStyle.padding.right = cssUnits.convertMeasure(style['fo:padding-right'], 'mm') || 0
            @currentStyle.padding.bottom = cssUnits.convertMeasure(style['fo:padding-bottom'], 'mm') || 0
            @currentStyle.spacing.lineheight = cssUnits.convertMeasure(style['fo:line-height'], 'mm')  || 4.2 # 1em = 4,2175176mm
            @currentStyle.aligment[style['fo:text-align']] = true if style['fo:text-align']
        style = @parent.editorSession.getParagraphStyleAttributes(odfs.name)['style:text-properties']
        if style
            @currentStyle.style.bold = style['fo:font-weight'] is 'bold'
            @currentStyle.style.italic = style['fo:font-style'] is 'italic'
            @currentStyle.style.underline = true if style['style:text-underline-style'] and style['style:text-underline-style'] isnt 'none'
            @currentStyle.font.size = parseFloat style['fo:font-size']
            @currentStyle.font.family = findFont style['style:font-name']
            @currentStyle.style.color = { hex: style['fo:color'] } if style['fo:color']
            @currentStyle.style.bgcolor = { hex: style['fo:background-color'] } if style['fo:background-color']
        @previewStyle() 
    
    previewStyle: () ->
        #console.log "previewing"
        # reset ui
        @ui.aligment.left.swon = @currentStyle.aligment.left
        @ui.aligment.right.swon =  @currentStyle.aligment.right
        @ui.aligment.center.swon = @currentStyle.aligment.center
        @ui.aligment.justify.swon = @currentStyle.aligment.justify
        @ui.spacing.left.value = @currentStyle.spacing.left
        @ui.spacing.right.value = @currentStyle.spacing.right
        @ui.spacing.top.value = @currentStyle.spacing.top
        @ui.spacing.bottom.value = @currentStyle.spacing.bottom
        @ui.spacing.lineheight.value = @currentStyle.spacing.lineheight
        
        @ui.padding.left.value = @currentStyle.padding.left
        @ui.padding.right.value = @currentStyle.padding.right
        @ui.padding.top.value = @currentStyle.padding.top
        @ui.padding.bottom.value = @currentStyle.padding.bottom
        
        @ui.style.bold.swon = @currentStyle.style.bold
        @ui.style.italic.swon = @currentStyle.style.italic
        @ui.style.underline.swon = @currentStyle.style.underline
        @ui.font.size.value = @currentStyle.font.size
        
        #console.log @currentStyle
        if @currentStyle.font.family
            items = @ui.font.family.data
            item = i for v, i in items when v.text is @currentStyle.font.family.text
            @ui.font.family.selected = item if item >= 0
        
        $(@ui.style.color).css "background-color", if @currentStyle.style.color then @currentStyle.style.color.hex else "#000000"
        $(@ui.style.bgcolor).css "background-color", if @currentStyle.style.bgcolor then @currentStyle.style.bgcolor.hex else "transparent"
        # set the preview css
        el = $ @preview
        el.css "text-align", if @currentStyle.aligment.selected then @currentStyle.aligment.selected else "left"
        el.css "margin-left", @currentStyle.spacing.left + "mm"
        el.css "margin-right", @currentStyle.spacing.right + "mm"
        el.css "margin-top", @currentStyle.spacing.top + "mm"
        el.css "margin-bottom", @currentStyle.spacing.bottom + "mm"
        
        el.css "padding-left", @currentStyle.padding.left + "mm"
        el.css "padding-right", @currentStyle.padding.right + "mm"
        el.css "padding-top", @currentStyle.padding.top + "mm"
        el.css "padding-bottom", @currentStyle.padding.bottom + "mm"
        
        el
            .css "font-weight", "normal"
            .css "font-style", "normal"
            .css "text-decoration", "none"
            .css "line-height", "normal"
        el.css "font-weight", "bold" if @currentStyle.style.bold
        el.css "font-style", "italic" if @currentStyle.style.italic
        el.css "text-decoration", "underline" if @currentStyle.style.underline
        el.css "color", if @currentStyle.style.color then @currentStyle.style.color.hex else "#000000"
        el.css "background-color", if @currentStyle.style.bgcolor then @currentStyle.style.bgcolor.hex  else "transparent"
        el.css "font-size", @currentStyle.font.size + "pt"
        el.css "font-family", @currentStyle.font.family.name if @currentStyle.font.family
        el.css "line-height", @currentStyle.spacing.lineheight + "mm" if @currentStyle.spacing.lineheight > 0

FormatDialog.scheme = """
<afx-app-window apptitle="__(Format Dialog)" width="500" height="500" data-id="FormatDialog">
    <afx-vbox>
        <div data-height="5"></div>
        <afx-hbox data-height="30">
            <div data-width="5"></div>
            <afx-list-view data-id="lstformats" dropdown = "true"></afx-list-view>
            <div data-width="5" ></div>
            <afx-button text="clone" data-id="bt-clone" iconclass = "fa fa-copy" data-width="65"></afx-button>
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
        <afx-label text="__(Margin)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox data-height="23" data-id="spacingbox">
            <div ></div>
            <afx-label data-width="50" text="__(Left:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnleft" value = "0" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Right:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnright" value = "0" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Top:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spntop" value = "0" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Bottom:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnbottom" value = "0" step="0.5"></afx-nspinner>
            <div  ></div>
        </afx-hbox>
        <div data-height="5"></div>
        <afx-label text="__(Padding)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox data-height="23" data-id="spacingbox">
            <div ></div>
            <afx-label data-width="50" text="__(Left:)"></afx-label>
            <afx-nspinner data-width="50" data-id="pspnleft" value = "0" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Right:)"></afx-label>
            <afx-nspinner data-width="50" value = "0" data-id="pspnright" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Top:)"></afx-label>
            <afx-nspinner data-width="50" value = "0" data-id="pspntop" step="0.5"></afx-nspinner>
            <div></div>
            <afx-label data-width="50" text="__(Bottom:)"></afx-label>
            <afx-nspinner data-width="50" value = "0" data-id="pspnbottom" step="0.5"></afx-nspinner>
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
        <afx-hbox data-height="30" data-id="font-box">
            <div data-width="5"></div>
            <afx-list-view data-id="lstfont" dropdown = "true"></afx-list-view>
            <div data-width="5" ></div>
            <afx-label data-width="35" text="__(Size:)"></afx-label>
            <afx-nspinner data-width="50" value = "12" data-id="spnfsize"></afx-nspinner>
            <div data-width="5" ></div>
            <afx-label data-width="80" text="__(Line Height:)"></afx-label>
            <afx-nspinner data-width="50" data-id="spnlheight" value="4.2" step="0.2"></afx-nspinner>
            <div data-width="5"></div>
        </afx-hbox>
        <div data-height="5"></div>
        <afx-label text="__(Preview)" class="header" data-height="20"></afx-label>
        <div data-height="5"></div>
        <afx-hbox>
             <div data-width="5"></div>
            <div data-id="preview" style="background-color: white;">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce laoreet diam vestibulum massa malesuada quis dignissim libero blandit. Duis sit amet volutpat nisl.</p>
            </div>
             <div data-width="5"></div>
        </afx-hbox>
        
        <div data-height="5"></div>
        <afx-hbox data-height="30">
            <div></div>
            <afx-button text="__(Save)" data-width="35" data-id="btok"></afx-button>
            <div data-width="5"></div>
            <afx-button text="__(Cancel)" data-width="55" data-id="btx"></afx-button>
        </afx-hbox>
         <div data-height="5"></div>
    </afx-vbox>
</afx-app-window>
"""