Ant = this

class CVSectionListItemTag extends this.OS.GUI.tag.ListViewItemTag
    constructor: () ->
        super()
    
    ondatachange: () ->
        return unless @data
        v = @data
        nativel = ["content", "start", "end" ]
        @closable = v.closable
        for k, el of @refs
            if v[k] and v[k] isnt ""
                if nativel.includes k
                    $(el).text v[k]
                else
                    el.text = v[k]
    
    reload: () ->
        
    init:() -> 


    itemlayout: () ->
        { el: "div", children: [
            { el: "afx-label", ref: "title", class: "afx-cv-sec-title" },
            { el: "afx-label", ref: "subtitle", class: "afx-cv-sec-subtitle" },
            { el: "p", ref: "content", class: "afx-cv-sec-content" },
            { el: "p", class: "afx-cv-sec-period", children: [
                { el: "i", ref: "start" },
                { el: "i", ref: "end", class: "period-end" }
            ] },
            { el: "afx-label", ref: "location", class: "afx-cv-sec-loc" }
        ] }

this.OS.GUI.tag.define "afx-blogger-cvsection-item", CVSectionListItemTag


class BlogPostListItemTag extends this.OS.GUI.tag.ListViewItemTag
    constructor: () ->
        super()
    
    ondatachange: (v) ->
        return unless @data
        v = @data
        v.closable = true
        @closable = v.closable
        @refs.title.text = v.title
        @refs.ctimestr.text = __("Created: {0}", v.ctimestr)
        @refs.utimestr.text = __("Updated: {0}", v.utimestr)

    reload: () ->
        
    init:() ->
        
    itemlayout: () ->
        { el: "div", children: [
            { el: "afx-label", ref: "title", class: "afx-blogpost-title" },
            { el: "afx-label", ref: "ctimestr", class: "blog-dates" },
            { el: "afx-label", ref: "utimestr", class: "blog-dates" },
        ] }

this.OS.GUI.tag.define "afx-blogger-post-item", BlogPostListItemTag