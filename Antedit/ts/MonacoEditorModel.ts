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
                this.setValue("");
                // TODO create new textmodel
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
                if(file.path.toString() === "Untitled") {
                    return {
                        model: monaco.editor.createModel(file.cache, "textplain")
                    }
                }
                const uri = monaco.Uri.parse(file.path);
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
                    (e as GenericObject<any>).text = e.aliases[0];
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
                monaco.editor.setModelLanguage(this.editor.getModel(), m.id);
                if(this.onstatuschange)
                    this.onstatuschange(this.getEditorStatus());
            }



            /**
             * Reference to the editor instance
             *
             * @private
             * @type {GenericObject<any>}
             * @memberof MonacoEditorModel
             */
            private editor: GenericObject<any>;


            /**
             * Setup the editor
             *
             * @protected
             * @param {HTMLElement} el editor container DOM
             * @memberof MonacoEditorModel
             */
            protected editorSetup(el: HTMLElement): void {
                this.editor = monaco.editor.create(el, {
                    value: "",
                    language: 'textplain'
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
                        this.editor.onDidChangeModelContent(callback);
                        break;
                    case "focus":
                        this.editor.onDidFocusEditorText(callback);
                        break;
                    case "changeCursor":
                        this.editor.onDidChangeCursorPosition(callback);
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
                if(this.editor)
                    this.editor.focus();
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
                const pos = this.editor.getPosition();
                const mode = MonacoEditorModel.modes[this.editor.getModel().getModeId()];
                return {
                    row: pos.lineNumber,
                    column: pos.column,
                    line: this.editor.getModel().getLineCount(),
                    langmode: { 
                        text: mode.aliases[0],
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
                return this.editor.getValue();
            }


            /**
             * Set editor value
             *
             * @param {string} value
             * @memberof MonacoEditorModel
             */
            setValue(value: string): void {
                this.editor.setValue(value);
            }
            
            getEditor(): any {
                return this.editor;
            }
        }
    }
}