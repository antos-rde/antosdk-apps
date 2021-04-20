{
    "name": "{0}",
    "targets":{
        "clean": {
            "jobs": [
                {
                    "name": "vfs-rm",
                    "data": ["build/debug","build/release"]
                }
            ]
        },
        "build": {
            "require": ["ts"],
            "jobs":[
                {
                    "name": "vfs-mkdir",
                    "data": ["build","build/debug","build/release"]
                },
                {
                    "name": "ts-import",
                    "data": ["sdk://core/ts/core.d.ts", "sdk://core/ts/jquery.d.ts","sdk://core/ts/antos.d.ts"]
                },
                {
                    "name": "ts-compile",
                    "data": {
                        "src": ["main.ts"],
                        "dest": "build/debug/main.js"
                    }
                }
            ]
        },
        "uglify": {
            "require": ["terser"],
            "jobs": [
                {
                    "name":"terser-uglify",
                    "data": ["build/debug/main.js"]
                }
            ]
        },
        "copy": {
            "jobs": [
                {
                    "name": "vfs-cp",
                    "data": {
                        "src": [
                            "scheme.html",
                            "package.json",
                            "README.md"
                        ],
                        "dest":"build/debug"
                    }
                }
            ]
        },
        "release": {
            "depend": ["clean","build","uglify", "copy"],
            "require": ["zip"],
            "jobs": [
                {
                    "name": "zip-mk",
                    "data": {
                        "src":"build/debug",
                        "dest":"build/release/{0}.zip"
                    }
                }
            ]
        }
    }
}