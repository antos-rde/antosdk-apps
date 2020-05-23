Ant = this

class CVSectionListItemTag extends this.OS.GUI.tag["afx-list-item-proto"]
    constructor: (r, o) ->
        super r, o
    
    __data__: (v) ->
        return unless v
        nativel = ["content", "start", "end" ]
        @set "closable", v.closable
        for k, el of @refs
            if v[k] and v[k] isnt ""
                if nativel.includes k
                    $(el).text v[k]
                else
                    el.set "text", v[k]

    __selected: (v) ->
        @get("data").selected = v


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

this.OS.GUI.define "afx-blogger-cvsection-item", CVSectionListItemTag


class BlogPostListItemTag extends this.OS.GUI.tag["afx-list-item-proto"]
    constructor: (r, o) ->
        super r, o
    
    __data__: (v) ->
        return unless v
        v.closable = true
        @set "closable", v.closable
        @refs.title.set "text", v.title
        @refs.ctimestr.set "text", __("Created: {0}", v.ctimestr)
        @refs.utimestr.set "text", __("Updated: {0}", v.utimestr)

    __selected: (v) ->
        @get("data").selected = v


    itemlayout: () ->
        { el: "div", children: [
            { el: "afx-label", ref: "title", class: "afx-blogpost-title" },
            { el: "afx-label", ref: "ctimestr", class: "blog-dates" },
            { el: "afx-label", ref: "utimestr", class: "blog-dates" },
        ] }

this.OS.GUI.define "afx-blogger-post-item", BlogPostListItemTag