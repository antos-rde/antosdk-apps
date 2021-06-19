namespace OS {
    
    export namespace GUI {
        export namespace tag {
            class TextureListItem extends ListViewItemTag
            {
                protected itemlayout(): TagLayoutType {
                    return {
                        el: "div",
                        children: [
                            {
                                el: "img",
                                ref: "img"
                            },
                            {
                                el: "p",
                                ref: "name"
                            }
                        ]
                    };
                }
                protected ondatachange(): void {
                    const v = this.data;
                    const img = this.refs.img as HTMLImageElement;
                    const uri = (v.path as string).asFileHandle().getlink();
                    img.src = uri;
                    $(this.refs.name).text(v.name); 
                }
                protected init(): void {
                    this.closable = true;
                }
                protected reload(d?: any): void {
                }
            }
            define("afx-shader-texture-item", TextureListItem);
        }
    }

    export namespace application {
        declare var ace: any;
        declare var THREE: any;
        declare var GLSLX:any;

        class AddTextureDialog extends GUI.BasicDialog
        {
            constructor()
            {
                super("AddTextureDialog", AddTextureDialog.scheme);
            }
                
            main(): void
            {
                super.main();
                const inputs = $("input", this.scheme);
                (this.find("btnOk") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    let cdata: GenericObject<string> = {};
                    for (const el of inputs) {
                        let input = el as HTMLInputElement;
                        if (input.value.trim() == "") {
                            return this.notify(__("All fields should be filled"));
                        }
                        cdata[input.name] = input.value.trim();
                    }
                    if (this.handle)
                        this.handle(cdata);
                    this.quit();
                };

                (this.find("btnFile") as GUI.tag.ButtonTag).onbtclick = (e) => {
                    this.openDialog("FileDialog", {
                        title: __("Select image file"),
                        type: "file",
                        mimes: ["image/.*"]
                    })
                    .then((d) => {
                        (this.find("txtPath") as HTMLInputElement).value = d.file.path;
                    })
                };
            }
        }

        AddTextureDialog.scheme = `\
<afx-app-window width='250' height='170'>
    <afx-hbox>
        <div data-width="5"></div>
        <afx-vbox>
            <div data-height="5"></div>
            <afx-label text="__(Name)" data-height="25"></afx-label>
            <input type="text" data-height="25" name="name"> </input>
            <div data-height="5"></div>
            <afx-label text="__(Path/URL)" data-height="25"></afx-label>
            <afx-hbox data-height="26">
                <input type="text" name="path" data-id="txtPath"> </input>
                <afx-button data-id="btnFile" iconclass = "bi bi-folder2-open" data-width="25"></afx-button>
            </afx-hbox>
            <div data-height="5"></div>
            <div style="text-align:right;">
                <afx-button text="__(Ok)" data-id="btnOk"></afx-button>
            </div>
            <div data-height="5"></div>
        </afx-vbox>
        <div data-width="5"></div>
    </afx-hbox>
</afx-app-window>\
`;

        class ShaderEditor
        {
            private  ums: any[];
            private glsl_values: string[];
            private cursors: any[];
            private editor: any;
            private current_idx: number;
            renderer: ShaderRenderer;
            constructor(domel: HTMLElement, renderer: ShaderRenderer)
            {
                const empty_main = "void main(){}";
                this.renderer = renderer;
                this.ums = [new ace.UndoManager(), new ace.UndoManager()];
                this.current_idx = -1;
                this.glsl_values = [empty_main, ""];
                ace.require("ace/ext/language_tools");
                this.editor = ace.edit(domel);
                this.editor.setOptions({
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    highlightActiveLine: true,
                    //fontSize: "9pt"
                });

                this.editor.getSession().setUseWrapMode(true);
                this.editor.session.setMode("ace/mode/glsl");
                this.editor.setTheme("ace/theme/monokai");
                this.cursors = [
                    this.editor.getCursorPosition(),
                    this.editor.getCursorPosition()
                ];
                this.editor.on("input", (e) => {
                    const value = this.editor.getValue();

                    const result = GLSLX.compile(value, {
                        format: "json"
                    });
                    if (result.output) {
                        this.editor.getSession().setAnnotations([]);
                        this.glsl_values[this.current_idx] = value;
                        this.renderer.apply_mat(this.glsl_values[0],this.glsl_values[1]);
                    } else {
                        const reg_str = "<stdin>:([0-9]+):([0-9]+):\\s*error:\\s*(.*)\\n";
                        const matches = (result.log as string).match(new RegExp(reg_str, "g"));
                        if(matches)
                        {
                            this.editor.getSession().setAnnotations(
                                matches.map((match) => {
                                    const err_data = match.match(new RegExp(reg_str));
                                    let ret = {};
                                    if(err_data)
                                    {
                                        ret = {
                                            row: parseInt(err_data[1]) - 1,
                                            column: parseInt(err_data[2]),
                                            text: err_data[3],
                                            type: "error"
                                        };
                                    }
                                    return ret;
                                })
                            );
                        }
                    }
                });
            }

            edit(index:number): void
            {
                if(index < 0)
                {
                    return;
                }
                if(index != 2 && this.current_idx != 2)
                {
                    if(index === 0)
                    {
                        this.glsl_values[1] = this.editor.getValue();
                        this.cursors[1] = this.editor.getCursorPosition();
                    }
                    else
                    {
                        this.glsl_values[0] = this.editor.getValue();
                        this.cursors[0] = this.editor.getCursorPosition();
                    }
                }
                else if(index == 2)
                {
                    this.glsl_values[this.current_idx] = this.editor.getValue();
                    this.cursors[this.current_idx] = this.editor.getCursorPosition();
                    this.current_idx = index;
                    return;
                }
                this.current_idx = index;
                this.editor.getSession().setUndoManager(new ace.UndoManager());
                this.editor.setValue(this.glsl_values[index]);
                this.editor.getSession().setUndoManager(this.ums[index]);
                const c = this.cursors[index];
                this.editor.renderer.scrollCursorIntoView(
                {
                        row: c.row,
                        column: c.column,
                    },
                    0.5
                );
                this.editor.selection.moveTo(
                    c.row,
                    c.column
                );
                this.editor.focus();
            }

            cleanup(): void 
            {
                this.renderer.cleanup();
            }
            resize(): void 
            {
                this.editor.resize();
                this.renderer.viewport_resize();
            }
        };

        class ShaderRenderer {
            /**
             * Private variables for viewport
             */
            private renderer: any;
            private scene: any;
            private camera: any;
            private ani_request_id: number;
            private uniforms: GenericObject<any>;
            private mesh: any;
            private clock: any;
            needupdateTexture: boolean;
            textures: any[];
            constructor(canvas: HTMLCanvasElement)
            {
                this.textures = [];
                this.renderer = new THREE.WebGLRenderer({canvas});
                this.renderer.autoClearColor = false;
                this.clock = new THREE.Clock();
                this.camera = new THREE.OrthographicCamera(
                    -1, // left
                    1, // right
                    1, // top
                    -1, // bottom
                    -1, // near,
                    1, // far
                );
                this.scene = new THREE.Scene();
                const plane = new THREE.PlaneGeometry(2, 2);
                const material = new THREE.MeshBasicMaterial({
                    color: 'white',
                });
                this.needupdateTexture = false;
                this.mesh = new THREE.Mesh(plane, material);
                this.scene.add(this.mesh);
                this.uniforms = {
                    u_resolution: { value: { x: 0, y: 0 } },
                    u_time: { value: 0.0 },
                    u_mouse: { value: { x: 0, y: 0 } },
                };
                this.viewport_resize();

                this.ani_request_id = requestAnimationFrame(() => this.viewport_render());
            }
            private viewport_render(): void
            {
                if(this.needupdateTexture)
                {
                    this.update_textures();
                    this.needupdateTexture = false;
                }
                
                this.uniforms.u_time.value = this.clock.getElapsedTime();
                try{
                    this.renderer.render(this.scene, this.camera);
                }
                catch(e)
                {
                    console.error(e);
                    const material = new THREE.MeshBasicMaterial({
                        color: 'white',
                    });
                    this.mesh.material = material;
                }
                this.ani_request_id = requestAnimationFrame(() => this.viewport_render());
            }

            viewport_resize(): void
            {
                const canvas = this.renderer.domElement;
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;
                this.uniforms.u_resolution.value.x = width;
                this.uniforms.u_resolution.value.y = height;
                const needResize = canvas.width !== width || canvas.height !== height;
                if (needResize) {
                    this.renderer.setSize(width, height, false);
                }
            }

            cleanup(): void 
            {
                console.log("Stop the animation before quitting...");
                window.cancelAnimationFrame(this.ani_request_id);
            }
            private update_textures(): void
            {
                for(const key in this.uniforms)
                {
                    if(["u_resolution", "u_time", "u_mouse"].indexOf(key) === -1)
                    {
                        delete this.uniforms[key];
                    }
                }
                for(const v of this.textures)
                {
                    this.uniforms[v.name] = {value: v.texture};
                }
            }
            apply_mat(fragment_shader:string, vertex_shader: string): void
            {
                const empty_main = "void main(){}";
                const opts = {
                    fragmentShader: fragment_shader.trim() === ""?empty_main: fragment_shader,
                    uniforms: this.uniforms,
                    vertexShader: undefined
                };

                if(vertex_shader.trim() != "")
                    opts.vertexShader = vertex_shader;

                const mat = new THREE.ShaderMaterial(opts);

                this.mesh.material = mat;
            }
        }
        /**
         *
         * @class ShaderPlayground
         * @extends {BaseApplication}
         */
        export class ShaderPlayground extends BaseApplication {
            /**
             * Private variable for tab and editor
             */
            private tabbar: GUI.tag.TabBarTag;
            private editor: ShaderEditor;

            constructor(args: AppArgumentsType[]) {
                super("ShaderPlayground", args);
            }
            main(): void {
                this.init_editor();
                this.init_textures_list();
            }

            /**
             * Init the editor for fragment and
             * vertex shader
             */
            private init_editor(): void
            {
                this.tabbar = this.find("tabbar") as GUI.tag.TabBarTag;
                this.tabbar.items = [
                    {
                        text: __("Fragment"),
                        iconclass: "bi bi-palette"
                    },
                    {
                        text: __("Vertex"),
                        iconclass: "bi bi-intersect"
                    },
                    {
                        text: __("Textures"),
                        iconclass: "bi bi-image-alt"
                    }
                ];

                this.tabbar.ontabselect = (_e) => {
                    this.selectTab();
                };
                this.editor = new ShaderEditor(
                    this.find("editor-container"), new ShaderRenderer(this.find("viewport") as HTMLCanvasElement));
                this.on("resize", (e) =>{
                    this.editor.resize();
                });
                this.tabbar.selected = 0;
            }

            private init_textures_list(): void 
            {
                const listview = this.find("texture-list") as GUI.tag.ListViewTag;
                listview.buttons = [
                    {
                        text: "__(Add texture)",
                        iconclass: "bi bi-plus",
                        onbtclick: (e) => {
                            this
                                .openDialog(new AddTextureDialog())
                                .then((data) => {
                                    if(!data)
                                    {
                                        return;
                                    }
                                    const loader = new THREE.TextureLoader();
                                    const texture = loader.load(data.path.asFileHandle().getlink());
                                    texture.minFilter = THREE.NearestFilter;
                                    texture.magFilter = THREE.NearestFilter;
                                    texture.wrapS = THREE.RepeatWrapping;
                                    texture.wrapT = THREE.RepeatWrapping;
                                    data.texture = texture;
                                    listview.push(data);
                                    this.editor.renderer.needupdateTexture = true;
                                });
                        }
                    }
                ];
                listview.itemtag = "afx-shader-texture-item";
                listview.onitemclose = (e) => {
                    this.editor.renderer.needupdateTexture = true;
                    return true;
                };
                listview.data = this.editor.renderer.textures;
            }

            private selectTab(): void
            {
                const index = this.tabbar.selected as number;
                if(index === 2)
                {
                    $(this.find("editor-container")).hide();
                    $(this.find("texture-list")).show();
                }
                else
                {
                    $(this.find("editor-container")).show();
                    $(this.find("texture-list")).hide();
                }
                this.editor.edit(index);
            }

            protected cleanup(_e: any): void
            {
                this.editor.cleanup();
            }
        }

        /**
         * Application dependenicies preload
        */
        ShaderPlayground.dependencies =  [
            "pkg://libthreejs/main.js",
            "pkg://ACECore/core/ace.js",
            "pkg://ACECore/path.js",
            "pkg://ACECore/core/ext-language_tools.js",
            "pkg://ShaderPlayground/glslx.js"
        ];
    }
}