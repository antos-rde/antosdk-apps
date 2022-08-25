namespace OS {
    //declare var monaco: any;
    export namespace application {
        /**
         * Wrapper model for the ACE text editor
         *
         * @export
         * @class MonacoEditorModel
         * @extends {BaseEditorModel}
         */
        export class MonacoEditorModel extends OS.application.BaseEditorModel {
            
            static modes: GenericObject<monaco.languages.ILanguageExtensionPoint>;

            /**
             * Creates an instance of MonacoEditorModel.
             * @param {MonacoEditorModel} app MonacoEditorModel instance
             * @param {GUI.tag.TabBarTag} tabbar tabbar element
             * @param {HTMLElement} editorarea main editor container element
             * @memberof MonacoEditorModel
             */
            constructor(app: BaseApplication, tabbar: GUI.tag.TabBarTag, editorarea: HTMLElement) {
                super(app, tabbar, editorarea);
            }

            /**
             * Reset the editor
             *
             * @protected
             * @memberof MonacoEditorModel
             */
            protected resetEditor(): void {
            }


            /**
             * Get a text model from the current editor session
             *
             * @protected
             * @return {*} 
             * @memberof MonacoEditorModel
             */
            protected getTexModel(): any {
                return {
                    model: this.editor.getModel(),
                    position: this.editor.getPosition()
                }
            }


            /**
             * Set text model to current editor session
             *
             * @protected
             * @param {*} model
             * @memberof MonacoEditorModel
             */
            protected setTextModel(model: any): void {
                this.editor.setModel(model.model);
                if(model.position)
                {
                    this.editor.setPosition(model.position);
                    this.editor.revealLineInCenter(model.position.lineNumber);
                }
                if(this.editor == this._code_editor)
                {
                    this.editor.updateOptions({readOnly: false, domReadOnly: false});
                }
            }


            /**
             * Create new editor model from file
             *
             * @protected
             * @param {EditorFileHandle} file
             * @return {*}  {*}
             * @memberof MonacoEditorModel
             */
            protected newTextModelFrom(file: EditorFileHandle): any {
                if(Array.isArray(file.cache))
                {
                    return {
                        model: {
                            original: this.newTextModelFrom(file.cache[0]).model,
                            modified: this.newTextModelFrom(file.cache[1]).model
                        }
                    }
                }
                else
                {
                    if(file.path.toString() === "Untitled") {
                        return {
                            model: monaco.editor.createModel(file.cache, "textplain")
                        }
                    }
                    const uri = monaco.Uri.parse(file.protocol + "://antedit/file/" + file.genealogy.join("/"));
                    const model = monaco.editor.getModel(uri);
                    if(model)
                    {
                        model.setValue(file.cache);
                        return { model: model };
                    }
                    return {
                        model: monaco.editor.createModel(file.cache, undefined, uri)
                    }
                }
            }

            /**
             * Get language modes
             *
             * @return {*}  {GenericObject<any>[]}
             * @memberof MonacoEditorModel
             */
            getModes(): GenericObject<any>[] {
                //const list = [];
                //return list;
                return monaco.languages.getLanguages().map(e=>{
                    const item = (e as GenericObject<any>);
                    if(e.aliases)
                        item.text = e.aliases[0];
                    else
                        item.text = e.id;
                    return e;
                });
            }


            /**
             * Set the editor theme
             *
             * @param {string} theme theme name
             * @memberof MonacoEditorModel
             */
            setTheme(theme: string): void {
            }


            /**
             * Set editor language mode
             *
             * The mode object should be in the following format:
             * ```ts
             * {
             *  text: string,
             *  mode: string
             * }
             * ```
             * 
             * @param {GenericObject<any>} m language mode object
             * @memberof MonacoEditorModel
             */
            setMode(m: GenericObject<any>): void {
                if(this.editor == this._code_editor)
                {
                    monaco.editor.setModelLanguage(this.editor.getModel(), m.id);
                }
                else
                {
                    for(const model of this.editor.getModel())
                    {
                        monaco.editor.setModelLanguage(model, m.id);
                    }
                }
                if(this.onstatuschange)
                    this.onstatuschange(this.getEditorStatus());
            }

            
            private code_container: JQuery<HTMLElement>;
            private diff_container: JQuery<HTMLElement>;

            /**
             * Reference to the editor instance
             *
             * @private
             * @type {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            private _code_editor: GenericObject<any>;
            /**
             * Reference to the diff editor instance
             *
             * @private
             * @type {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            private _diff_editor: GenericObject<any>;
            /**
             * Getter get current editor instance based on current file
             *
             * @private
             * @type {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            private get editor(): GenericObject<any>
            {
                if(Array.isArray(this.currfile.cache))
                {
                    return this._diff_editor;
                }
                return this._code_editor;
            }


            /**
             * Setup the editor
             *
             * @protected
             * @param {HTMLElement} el editor container DOM
             * @memberof MonacoEditorModel
             */
            protected editorSetup(el: HTMLElement): void {
                // create two editor instances for code mode and diff mode
                this.code_container = $("<div />")
                    .css("width", "100%")
                    .css("height", "100%");
                this.diff_container = $("<div />")
                    .css("width", "100%")
                    .css("height", "100%")
                    .css("display", "none");
                $(el).append(this.code_container);
                $(el).append(this.diff_container);
                this._code_editor = monaco.editor.create(this.code_container[0], {
                    value: "",
                    language: 'textplain',
                    readOnly: false,
                    domReadOnly: false
                });
                this._diff_editor = monaco.editor.createDiffEditor(this.diff_container[0],{
                    readOnly: true
                });
                
                if(!MonacoEditorModel.modes)
                {
                    MonacoEditorModel.modes = {};
                    monaco.languages.getLanguages().forEach((el) =>{
                        MonacoEditorModel.modes[el.id] = el;
                    })
                }
            }


            /**
             * Register to editor event
             *
             * @param {string} evt_str event name
             * @param {() => void} callback callback function
             * @memberof MonacoEditorModel
             */
            on(evt_str: string, callback: () => void): void {
                switch (evt_str) {
                    case "input":
                        this._code_editor.onDidChangeModelContent(callback);
                        break;
                    case "focus":
                        this._code_editor.onDidFocusEditorText(callback);
                        this._diff_editor.getOriginalEditor().onDidFocusEditorText(callback);
                        this._diff_editor.getModifiedEditor().onDidFocusEditorText(callback);
                        break;
                    case "changeCursor":
                        this._code_editor.onDidChangeCursorPosition(callback);
                        this._diff_editor.getOriginalEditor().onDidChangeCursorPosition(callback);
                        this._diff_editor.getModifiedEditor().onDidChangeCursorPosition(callback);
                        break;
                    default:
                        break;
                }
            }


            /**
             * Resize the editor
             *
             * @memberof MonacoEditorModel
             */
            resize(): void {
                if(this.editor)
                    this.editor.layout();
            }


            /**
             * Focus on the editor
             *
             * @memberof MonacoEditorModel
             */
            focus(): void {
                if(Array.isArray(this.currfile.cache))
                {
                    this.code_container.hide();
                    this.diff_container.show();
                }
                else
                {
                    this.code_container.show();
                    this.diff_container.hide();
                }
                if(this.editor)
                {
                    this.editor.layout();
                    this.editor.focus();
                }
            }


            /**
             * Get language mode from path
             *
             * @protected
             * @param {string} path
             * @return {*}  {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
             protected getModeForPath(path: string): GenericObject<any> {
                return {};
            }

            /**
             * Get the editor status
             *
             * @return {*}  {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            getEditorStatus(): GenericObject<any> {
                
                let ed = undefined;
                if(this.editor == this._code_editor)
                {
                    ed = this.editor;
                }
                else
                {
                    ed = this.editor.getOriginalEditor();
                    if(this.editor.getModifiedEditor().hasTextFocus())
                    {
                        ed = this.editor.getModifiedEditor();
                    }
                }
                
                const pos = ed.getPosition();
                let mode = undefined;
                const model = ed.getModel();
                if(model)
                {
                     mode = MonacoEditorModel.modes[model.getLanguageId()];
                }
                return {
                    row: pos.lineNumber,
                    column: pos.column,
                    line: model?model.getLineCount(): 0,
                    langmode: { 
                        text: mode?mode.aliases[0]: "",
                        mode: mode
                    },
                    file: this.currfile.path
                }
            }


            /**
             * Get editor value
             *
             * @return {*}  {string}
             * @memberof MonacoEditorModel
             */
            getValue(): string {
                if(this.editor == this._code_editor)
                    return this.editor.getValue();
                return this.currfile.cache;
            }


            /**
             * Set editor value
             *
             * @param {string} value
             * @memberof MonacoEditorModel
             */
            setValue(value: string): void {
                if(this.editor == this._code_editor)
                    this.editor.setValue(value);
            }
            
            getEditor(): any {
                return this._code_editor;
            }
        }
    }
}