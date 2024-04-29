
interface Array<T> {
    /**
     * Check if the array includes an element
     *
     * @param {T} element to check
     * @returns {boolean}
     * @memberof Array
     */
    includes(el: T): boolean;
}

namespace OS {
    export namespace application {
        export namespace blogger {

            class CVSectionListItemTag extends OS.GUI.tag.ListViewItemTag {
                constructor() {
                    super();
                }

                ondatachange() {
                    if (!this.data) { return; }
                    const v = this.data;
                    const nativel = ["content", "start", "end"];
                    this.closable = v.closable;
                    return (() => {
                        const result = [];
                        for (let k in this.refs) {
                            const el = this.refs[k];
                            if (v[k] && (v[k] !== "")) {
                                if (nativel.includes(k)) {
                                    result.push($(el).text(v[k]));
                                } else {
                                    result.push((el as OS.GUI.tag.LabelTag).text = v[k]);
                                }
                            } else {
                                result.push(undefined);
                            }
                        }
                        return result;
                    })();
                }

                reload() { }

                init() { }


                itemlayout() {
                    return {
                        el: "div", children: [
                            { el: "afx-label", ref: "title", class: "afx-cv-sec-title" },
                            { el: "afx-label", ref: "subtitle", class: "afx-cv-sec-subtitle" },
                            { el: "p", ref: "content", class: "afx-cv-sec-content" },
                            {
                                el: "p", class: "afx-cv-sec-period", children: [
                                    { el: "i", ref: "start" },
                                    { el: "i", ref: "end", class: "period-end" }
                                ]
                            },
                            { el: "afx-label", ref: "location", class: "afx-cv-sec-loc" }
                        ]
                    };
                }
            }

            OS.GUI.tag.define("afx-blogger-cvsection-item", CVSectionListItemTag);


            class BlogPostListItemTag extends OS.GUI.tag.ListViewItemTag {
                constructor() {
                    super();
                }

                ondatachange() {
                    if (!this.data) { return; }
                    const v = this.data;
                    v.closable = true;
                    this.closable = v.closable;
                    (this.refs.title as OS.GUI.tag.LabelTag).text = v.title;
                    (this.refs.ctimestr as OS.GUI.tag.LabelTag).text = __("Created: {0}", v.ctimestr);
                    (this.refs.utimestr as OS.GUI.tag.LabelTag).text = __("Updated: {0}", v.utimestr);
                }

                reload() { }

                init() { }

                itemlayout() {
                    return {
                        el: "div", children: [
                            { el: "afx-label", ref: "title", class: "afx-blogpost-title" },
                            { el: "afx-label", ref: "ctimestr", class: "blog-dates" },
                            { el: "afx-label", ref: "utimestr", class: "blog-dates" },
                        ]
                    };
                }
            }

            OS.GUI.tag.define("afx-blogger-post-item", BlogPostListItemTag);
        }
    }
}