namespace OS {
    export namespace API {
        export namespace VFS {
            declare var gapi: any;

            interface GAPITYPE {
                CLIENT_ID: string;
                API_KEY: string;
                apilink: string;
                DISCOVERY_DOCS: string[];
                SCOPES: string;
                uploadlink: string; // 
                logout: string;
            };
            let G_CACHE = {"gdv://":{ id: "root", mime: 'dir' } };

            export class GoogleDriveHandle extends BaseFileHandle {
                private gid: string;
                static API_META: GAPITYPE;
                private local_copy: BaseFileHandle;
                constructor(path: string) {
                    super(path);
                    if (!GoogleDriveHandle.API_META) {
                        OS.announcer.oserror( __("Unknown API setting for GAPI"),
                            OS.API.throwe("OS.VFS"));
                        return undefined;
                    }
                    if (this.isRoot()) {
                        this.gid = 'root';
                    }
                    this.cache = "";
                    this.local_copy = undefined;
                }
                private fields(): string {
                    return "webContentLink, id, name,mimeType,description, kind, parents, properties, iconLink, createdTime, modifiedTime, owners, permissions, fullFileExtension, fileExtension, size, version";
                }
                private isFolder(): boolean {
                    return this.info.mimeType === "application/vnd.google-apps.folder";
                }
                private load(promise: Promise<any>): Promise<any> {
                    const q = API.mid();
                    return new Promise(async (resolve, reject) => {
                        API.loading(q, "GAPI");
                        try {
                            let ret = await promise;
                            API.loaded(q, "GAPI", "OK");
                            return resolve(ret);
                        } catch (e) {
                            API.loaded(q, "GAPI", "FAIL");
                            return reject(__e(e));
                        }
                    });
                }
                private sync(meta_data?: GenericObject<any>): Promise<any>
                {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if((!this.info || this.info.version != meta_data.version) && meta_data.mimeType !== "application/vnd.google-apps.folder")
                            {
                                await VFS.mkdirAll([
                                    "home://.gdv_cache",
                                    `home://.gdv_cache/${meta_data.id}`
                                ], true);
                                let copy = `home://.gdv_cache/${meta_data.id}/${meta_data.version}.${meta_data.fullFileExtension}`.asFileHandle();
                                try
                                {
                                    let r = await copy.onready();
                                }
                                catch(e1)
                                {
                                    await `home://.gdv_cache/${meta_data.id}`.asFileHandle().remove();
                                    await VFS.mkdirAll([`home://.gdv_cache/${meta_data.id}`]);
                                    let r = await this.load(gapi.client.drive.files.get({
                                        fileId: meta_data.id,
                                        alt: 'media'
                                    }));
                                    if (!r.body) {
                                        throw new Error(__("VFS cannot download file : {0}", this.path).__());
                                    }
                                    
                                    copy.cache = new Blob([r.body.asUint8Array()], { type: "octet/stream" });
                                    await copy.write(meta_data.mimeType);
                                }
                                this.local_copy = copy;
                                resolve(true);
                            }
                            else
                            {
                                resolve(true);
                            }
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }
                meta(): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            await this.oninit();
                            if (G_CACHE[this.path]) { this.gid = G_CACHE[this.path].id; };
                            if(this.gid)
                            {
                                let ret = await this.load(gapi.client.drive.files.get({
                                    fileId: this.gid,
                                    fields: this.fields()
                                }));
                                if (ret.result) {
                                    ret.result.mime = ret.result.mimeType;
                                    await this.load(this.sync(ret.result));
                                    resolve(ret);
                                }
                                else
                                {
                                    throw new Error(__("VFS cannot get meta data for {0}", this.gid).__());
                                }
                            }
                            else
                            {
                                const fp = this.parent().asFileHandle();
                                let d = await fp.meta();
                                const file: any = d.result;
                                G_CACHE[fp.path] = { id: file.id, mime: file.mimeType };
                                let r = await this.load(gapi.client.drive.files.list({
                                        q: `name = '${this.basename}' and '${file.id}' in parents and trashed = false`,
                                        fields: `files(${this.fields()})`
                                    }));
                                if (!r.result.files || !(r.result.files.length > 0)) {
                                    throw new Error(__("VFS cannot get meta data for {0}", this.path).__());
                                }
                                else
                                {
                                    G_CACHE[this.path] = { id: r.result.files[0].id, mime: r.result.files[0].mimeType };
                                    r.result.files[0].mime = r.result.files[0].mimeType;
                                    this.gid = G_CACHE[this.path].id;
                                    await this.load(this.sync(r.result.files[0]));
                                    resolve({ result: r.result.files[0], error: false});
                                }
                                
                            }
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                private oninit(): Promise<any> {
                    return new Promise(async (resolve, reject) => {
                        const fn = async function(r: boolean) {
                            if (r) { return resolve(true); }
                            // perform the login
                            G_CACHE = {"gdv://":{ id: "root", mime: 'dir' } };
                            try {
                                let ret =  await gapi.auth2.getAuthInstance().signIn();
                                resolve(ret);
                            }
                            catch(e)
                            {
                                reject(__e(e));
                            }
                        };
                        try {
                            if(!GoogleDriveHandle.API_META)
                            {
                                throw new Error(__("No GAPI meta found").__());
                            }
                            if(!API.libready(GoogleDriveHandle.API_META.apilink))
                            {
                                await this.load(API.requires(GoogleDriveHandle.API_META.apilink, false));
                                // load the api
                                await this.load(new Promise((res,rej) => {
                                    gapi.load('client:auth2', res);
                                }));
                                await this.load(gapi.client.init({
                                    apiKey: GoogleDriveHandle.API_META.API_KEY,
                                    clientId: GoogleDriveHandle.API_META.CLIENT_ID,
                                    discoveryDocs: GoogleDriveHandle.API_META.DISCOVERY_DOCS,
                                    scope: GoogleDriveHandle.API_META.SCOPES
                                }));
                                gapi.auth2.getAuthInstance().isSignedIn.listen(r => fn(r));
                                let ret = await GUI.openDialog("YesNoDialog", {
                                    title: __("Authentication"),
                                    text: __("Would you like to login to GoogleDrive?")
                                });
                                if(!ret)
                                {
                                    throw new Error(__("User abort the authentication").__());
                                }
                                else
                                {
                                    fn(gapi.auth2.getAuthInstance().isSignedIn.get());
                                }
                            }
                            else
                            {
                                gapi.auth2.getAuthInstance().isSignedIn.listen(r => fn(r));
                                fn(gapi.auth2.getAuthInstance().isSignedIn.get());
                            }
                        }
                        catch (e)  {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    })
                }

                getlink() {
                    if (this.local_copy) { return this.local_copy.getlink(); }
                    return undefined;
                }

                private child(name: string): string
                {
                    if(this.isFolder())
                        return `${this.path}/${name}`
                    return undefined
                }

                /**
                 * Low level protocol-specific read operation
                 *
                 * @protected
                 * @param {string} t data type, see [[read]]
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _rd(t: string): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if(!this.info.id)
                            {
                                throw new Error(__("File ID is not valid").__());
                            }
                            if(this.isFolder())
                            {
                                let r = await this.load(gapi.client.drive.files.list({
                                    q: `'${this.info.id}' in parents and trashed = false`,
                                    fields: `files(${this.fields()})`
                                }));
                                if(!r.result.files)
                                {
                                    throw new Error(__("File {0} not found", this.info.id).__());
                                }
                                for (let file of r.result.files) {
                                    file.path = this.child(file.name);
                                    file.mime = file.mimeType;
                                    file.filename = file.name;
                                    file.type = "file";
                                    file.gid = file.id;
                                    if (file.mimeType ===  "application/vnd.google-apps.folder") {
                                        file.mime = "dir";
                                        file.type = "dir";
                                        file.size = 0;
                                    }
                                    G_CACHE[file.path] = { id: file.gid, mime: file.mime };
                                }
                                resolve({ result: r.result.files, error: false});
                            }
                            else
                            {
                                if(!this.local_copy)
                                {
                                    throw new Error(__("Cannot find local copy of file; {0}", this.path).__());
                                }
                                /*
                                let r = await this.load(gapi.client.drive.files.get({
                                    fileId: this.info.id,
                                    alt: 'media'
                                }));
                                if (t !== "binary") {
                                    resolve(r.body);
                                }
                                else
                                {
                                    resolve(r.body.asUint8Array());
                                }*/
                                let r = await this.local_copy.read(t);
                                resolve(r);
                            }
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                private save(gid: string, t: string): Promise<any>
                {
                    return new Promise(async (resolve, reject) => {
                        try
                        {
                            const user = gapi.auth2.getAuthInstance().currentUser.get();
                            const oauthToken = user.getAuthResponse().access_token;
                            const xhr = new XMLHttpRequest();
                            const url = __(GoogleDriveHandle.API_META.uploadlink,gid).__();
                            xhr.open('PATCH', url);
                            xhr.setRequestHeader('Authorization', 'Bearer ' + oauthToken);
                            xhr.setRequestHeader('Content-Type', t);
                            xhr.setRequestHeader('Content-Encoding', 'base64');
                            xhr.setRequestHeader('Content-Transfer-Encoding', 'base64');
                            let error = (e:Error) => {
                                OS.announcer.oserror(__("VFS cannot save : {0}", this.path), e);
                                return reject(e);
                            };
                            xhr.onreadystatechange = () => {
                                if ( xhr.readyState === 4 ) {
                                    if ( xhr.status === 200 ) {
                                        return resolve({ result: JSON.parse(xhr.responseText), error: false});
                                    } else {
                                        error(OS.API.throwe("OS.VFS"));
                                    }
                                }
                            };
                            xhr.onerror = () => error(OS.API.throwe("OS.VFS"));
                            let data = this.cache;
                            if (t !== "base64") {
                                data = await this.b64(t);
                            }
                            xhr.send(data.replace(/^data:[^;]+;base64,/g, ""));
                            resolve(true);
                        }
                        catch(e)
                        {
                            reject(__e(e));
                        }
                    });
                }
                /**
                 * Low level protocol-specific write operation
                 *
                 * @protected
                 * @param {string} t data type, see [[write]]
                 * @param {*} [d]
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _wr(t: string, d?: any): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            var gid = undefined;
                            if (G_CACHE[this.path]) {
                                gid = G_CACHE[this.path].id;
                            }
                            if (gid) {
                               resolve(await this.load(this.save(gid, t)));
                            }
                            else
                            {
                                const dir = this.parent().asFileHandle();
                                await dir.onready();
                                const meta = {
                                    name: this.basename,
                                    mimeType: t,
                                    parents: [dir.info.id]
                                };

                                let r = await this.load(gapi.client.drive.files.create({
                                    resource: meta,
                                    fields: 'id'
                                }));
                                if (!r || !r.result) {
                                    throw new Error(__("VFS cannot write : {0}", this.path).__());
                                }
                                G_CACHE[this.path] = { id: r.result.id, mime: t };
                                resolve(this.load(this.save(r.result.id, t)));
                            }
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                /**
                 * Low level protocol-specific sub-directory creation
                 *
                 * @protected
                 * @param {string} d sub directory name
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _mk(d: string): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try
                        {
                            if (!this.isFolder()) { 
                                throw new Error(__("{0} is not a directory", this.path).__());
                            }
                            var meta = {
                                name: d,
                                parents: [this.info.id],
                                mimeType: 'application/vnd.google-apps.folder'
                            };
                            let r = await this.load(gapi.client.drive.files.create({
                                resource: meta,
                                fields: 'id'
                            }));
                            if (!r || !r.result) {
                                throw new Error(__("VFS cannot create : {0}", d).__());
                            }
                            G_CACHE[this.child(d)] = { id: r.result.id, mime: "dir" };
                            resolve(r);
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }
                /**
                 * Low level protocol-specific delete operation
                 *
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _rm(): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if (!this.info.id) {
                                throw new Error(__("Cannot identify file id of {0}", this.path).__());
                            }
                            let r = await this.load(gapi.client.drive.files.delete({
                                fileId: this.info.id
                            }));
                             if (!r) {
                                throw new Error(__("VFS cannot delete : {0}", this.path).__());
                            }
                            G_CACHE[this.path] = null;
                            delete G_CACHE[this.path];
                            resolve({ result: true, error: false});
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                /**
                 * Low level protocol-specific move operation
                 *
                 * @protected
                 * @param {string} d
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _mv(d: string): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try {
                            var dest = d.asFileHandle().parent().asFileHandle();
                            await dest.onready();
                            const previousParents = this.info.parents.join(',');
                            let r = await this.load(gapi.client.drive.files.update({
                                fileId: this.info.id,
                                addParents: dest.info.id,
                                removeParents: previousParents,
                                fields: "id"
                            }));
                            if (!r) {
                                throw new Error(__("VFS cannot move : {0}", this.path).__());
                            }
                            resolve(r);
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                /**
                 * Low level protocol-specific upload operation
                 *
                 * @returns {Promise<RequestResult>}
                 * @memberof BaseFileHandle
                 */
                protected _up(): Promise<RequestResult> {
                    return new Promise(async (resolve, reject) => {
                        try{
                            if (!this.isFolder()) {
                                throw new Error(__("Target file should be a folder").__());
                            }
                            var o = ($('<input>')).attr('type', 'file').css("display", "none");
                            o.on("change", async () => {
                                //Ant.OS.API.loading q, p
                                const fo = (o[0] as HTMLInputElement).files[0];
                                const file = (this.child(fo.name)).asFileHandle();
                                file.cache = fo;
                                let ret = await this.load(file.write(fo.type));
                                return o.remove();
                                resolve(ret);
                            });
                            o.trigger("click");
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }

                /**
                 * Low level protocol-specific download operation
                 *
                 * @returns {Promise<any>}
                 * @memberof BaseFileHandle
                 */
                protected _down(): Promise<any> {
                    return new Promise(async (resolve,reject) => {
                        try {
                            let r = await this.load(gapi.client.drive.files.get({
                                fileId: this.info.id,
                                alt: 'media'
                            }));
                            if (!r.body) {
                                throw new Error(__("VFS cannot download file : {0}", this.path).__());
                            }
                            let bs = [];
                            for (let i = 0, end = r.body.length - 1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
                                bs.push(r.body.charCodeAt(i));
                            }
                            let bytes = new Uint8Array(bs);
                            const blob = new Blob([bytes], { type: "octet/stream" });
                            OS.API.saveblob(this.basename, blob);
                            resolve(true);
                        }
                        catch(e)
                        {
                            OS.announcer.oserror(e.toString(), e);
                            reject(__e(e));
                        }
                    });
                }
            }

            GoogleDriveHandle.API_META = {
                CLIENT_ID: "1006507170703-l322pfkrhf9cgta4l4jh2p8ughtc14id.apps.googleusercontent.com",
                API_KEY: "AIzaSyBZhM5KbARvT10acWC8JQKlRn2WbSsmfLc",
                apilink: "https://apis.google.com/js/api.js",
                DISCOVERY_DOCS: [
                    "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
                ],
                SCOPES: "https://www.googleapis.com/auth/drive",
                uploadlink: "https://www.googleapis.com/upload/drive/v3/files/{0}?uploadType=media",
                logout: "https://www.google.com/accounts/Logout"
            };

            register("^gdv$", GoogleDriveHandle);

            API.onsearch("Google Drive", function(t) {
                const arr = [];
                const term = new RegExp(t, "i");
                for (let k in G_CACHE) {
                    const v = G_CACHE[k];
                    if ((k.match(term)) || (v && v.mime.match(term))) {
                        const file = k.asFileHandle() as any;
                        file.text = file.basename;
                        file.mime = v.mime;
                        file.iconclass = "fa fa-file";
                        if (file.mime === "dir") { file.iconclass = "fa fa-folder"; }
                        file.complex = true;
                        file.detail = [{ text: file.path }];
                        arr.push(file);
                    }
                }
                return arr;
            });

            /**
             * FIXME: proper way to logout
             */
            OS.onexit("cleanUpGoogleDrive", function() {
                return new Promise(async (resolve, reject) =>{
                    try{
                        await "home://.gdv_cache".asFileHandle().remove();
                        G_CACHE = { "gdv://": { id: "root", mime: 'dir' } };
                        if (!Ant.OS.API.libready(Ant.OS.setting.VFS.gdrive.apilink))
                        { 
                            return resolve(true);
                        }
                        const auth2 = gapi.auth2.getAuthInstance();
                        if (!auth2) {
                            throw new Error(__("Unable to get OATH instance").__());
                        }
                        if (auth2.isSignedIn.get()) {
                            $('<iframe/>', {
                                src: GoogleDriveHandle.API_META.logout,
                                frameborder: 0,
                                onload() {
                                    //console.log("disconnect")
                                    return auth2.disconnect();
                                }
                                    //$(this).remove()
                            });
                        }
                        resolve(true);
                    }
                    catch(e){
                        console.log(e);
                        resolve(true);
                    } 
                });
            });
        }
    }
}