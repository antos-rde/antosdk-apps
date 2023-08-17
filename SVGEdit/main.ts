namespace OS {

    export namespace application {
        /**
         *
         * @class SVGEdit
         * @extends {BaseApplication}
         */
        export class SVGEdit extends BaseApplication {
            constructor(args: AppArgumentsType[]) {
                super("SVGEdit", args);
            }
            main(): void {
                // set iframe data
                const index_page = 'pkg://SVGEdit/svgedit/index.html'.asFileHandle().getlink();
                this.find<HTMLIFrameElement>("container").src = index_page;
            }
        }
    }
}