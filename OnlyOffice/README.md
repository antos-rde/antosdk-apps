# OnlyOffice

This application is the front-end connector of the OnlyOffice suite.
It needs to connect to a working OnlyOffice document server.

The application allows to open/edit commons document, presentation, and spreedsheet.
Integrate OnlyOffice to an virtual window environment like AntOs allows a convenient
way to work with multiple documents at the same time.

![https://github.com/lxsang/antosdk-apps/blob/master/OnlyOffice/screenshot.png?raw=true](https://github.com/lxsang/antosdk-apps/blob/master/OnlyOffice/screenshot.png?raw=true)

## Change log
- v 0.1.8a: Use new backend API + luasec + luasocket to manipulate remote file
- v 0.1.7a: Allow setting blur overlay on window
- v 0.1.6a: Update backend api
- v 0.1.5a: Add document versionning support
- v 0.1.4a: If the iframe has the same origin with the parent, enable the focus event
- v 0.1.3a: Let backend generates document key, compatible with doc.iohub.dev/office
- v 0.1.2a: generate document key based on username, file path and modified time
- v 0.1.1a: generate document key based on username and file path
